const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;
const ETHERSCAN_API_URL = import.meta.env.VITE_ETHERSCAN_API_URL;

// Common ERC20 token addresses
const TOKEN_ADDRESSES = {
  USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  DAI: '0x6b175474e89094c44da98b954eedeac495271d0f'
};

export type TokenBalance = {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  balance: string;
  contractAddress: string;
};

export type ContractInfo = {
  isVerified: boolean;
  contractName?: string;
  compiler?: string;
  balance?: string;
  txCount?: number;
  tokenInfo?: {
    name?: string;
    symbol?: string;
    totalSupply?: string;
    holders?: number;
  };
};

export type Transaction = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  isError: string;
  methodName?: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
};

export type WalletInfo = {
  address: string;
  balance: string;
  tokenBalances: TokenBalance[];
  transactions: Transaction[];
  tokenTransfers: Transaction[];
  lastActive: number;
  totalTxCount: number;
};

export type GasPrice = {
  low: number;
  medium: number;
  high: number;
  timestamp: number;
};

async function handleEtherscanResponse(response: Response, errorContext: string) {
  if (!response.ok) {
    throw new Error(`Etherscan ${errorContext} request failed: ${response.status}`);
  }
  const data = await response.json();
  
  // Handle rate limiting
  if (data.message === 'NOTOK' && data.result.includes('Max rate limit reached')) {
    throw new Error('Etherscan API rate limit reached. Please try again in a moment.');
  }

  return data;
}

export async function getGasPrice(): Promise<GasPrice> {
  try {
    if (!ETHERSCAN_API_URL || !ETHERSCAN_API_KEY) {
      throw new Error('Missing Etherscan API configuration');
    }

    const response = await fetch(
      `${ETHERSCAN_API_URL}?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`
    );
    
    const data = await handleEtherscanResponse(response, 'gas tracker');
    
    if (data.status === "1" && data.result) {
      return {
        low: parseInt(data.result.SafeGasPrice || data.result.SafeLow || '0'),
        medium: parseInt(data.result.ProposeGasPrice || '0'),
        high: parseInt(data.result.FastGasPrice || '0'),
        timestamp: Date.now()
      };
    }
    
    throw new Error('Invalid gas price data received');
  } catch (error) {
    console.error('Gas tracker error:', error);
    // Return default values instead of throwing
    return {
      low: 0,
      medium: 0,
      high: 0,
      timestamp: Date.now()
    };
  }
}

async function getTokenBalance(address: string, tokenAddress: string): Promise<string> {
  try {
    const response = await fetch(
      `${ETHERSCAN_API_URL}?module=account&action=tokenbalance&address=${address}&contractaddress=${tokenAddress}&tag=latest&apikey=${ETHERSCAN_API_KEY}`
    );
    const data = await handleEtherscanResponse(response, 'token balance');
    return data.status === "1" ? data.result : "0";
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return "0";
  }
}

export async function getContractInfo(address: string): Promise<ContractInfo> {
  try {
    const [verificationResponse, balanceResponse, txCountResponse] = await Promise.all([
      fetch(`${ETHERSCAN_API_URL}?module=contract&action=getabi&address=${address}&apikey=${ETHERSCAN_API_KEY}`),
      fetch(`${ETHERSCAN_API_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`),
      fetch(`${ETHERSCAN_API_URL}?module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`)
    ]);

    const [verificationData, balanceData, txCountData] = await Promise.all([
      handleEtherscanResponse(verificationResponse, 'verification'),
      handleEtherscanResponse(balanceResponse, 'balance'),
      handleEtherscanResponse(txCountResponse, 'transaction count')
    ]);

    // Special handling for contract verification
    const isVerified = verificationData.status === "1" && verificationData.result !== "Contract source code not verified";
    
    // If balance or tx count requests fail, use defaults
    const balance = balanceData.status === "1" ? balanceData.result : "0";
    const txCount = txCountData.status === "1" ? parseInt(txCountData.result, 16) : 0;

    // For unverified contracts, still return basic info
    if (!isVerified) {
      return {
        isVerified: false,
        balance,
        txCount
      };
    }

    return {
      isVerified: true,
      contractName: verificationData.result?.ContractName,
      compiler: verificationData.result?.CompilerVersion,
      balance,
      txCount
    };
  } catch (error) {
    // Check if it's a wallet instead of throwing an error
    try {
      const balanceResponse = await fetch(`${ETHERSCAN_API_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`);
      const balanceData = await handleEtherscanResponse(balanceResponse, 'balance');
      
      if (balanceData.status === "1") {
        // This might be a wallet address - let the caller know by returning null
        return null;
      }
    } catch (walletError) {
      // Ignore wallet check errors
    }

    console.error('Etherscan API error:', error);
    throw error;
  }
}

export async function getWalletTransactions(address: string): Promise<WalletInfo> {
  try {
    // Fetch all data in parallel
    const [
      normalTxResponse,
      tokenTxResponse,
      balanceResponse,
      ...tokenBalanceResponses
    ] = await Promise.all([
      fetch(`${ETHERSCAN_API_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`),
      fetch(`${ETHERSCAN_API_URL}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`),
      fetch(`${ETHERSCAN_API_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`),
      ...Object.values(TOKEN_ADDRESSES).map(tokenAddress =>
        getTokenBalance(address, tokenAddress)
      )
    ]);

    const [normalTxData, tokenTxData, balanceData] = await Promise.all([
      handleEtherscanResponse(normalTxResponse, 'transactions'),
      handleEtherscanResponse(tokenTxResponse, 'token transactions'),
      handleEtherscanResponse(balanceResponse, 'balance'),
    ]);

    // Process transactions
    const transactions = (normalTxData.status === "1" ? normalTxData.result : [])
      .slice(0, 50)
      .map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: parseInt(tx.timeStamp),
        isError: tx.isError,
        methodName: tx.functionName
      }));

    // Process token transfers
    const tokenTransfers = (tokenTxData.status === "1" ? tokenTxData.result : [])
      .slice(0, 50)
      .map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: parseInt(tx.timeStamp),
        isError: "0",
        tokenName: tx.tokenName,
        tokenSymbol: tx.tokenSymbol,
        tokenDecimal: tx.tokenDecimal
      }));

    // Get timestamps for last active calculation
    const allTimestamps = [
      ...transactions.map(tx => tx.timestamp),
      ...tokenTransfers.map(tx => tx.timestamp)
    ];

    const lastActive = allTimestamps.length > 0 
      ? Math.max(...allTimestamps)
      : Math.floor(Date.now() / 1000);

    // Process token balances
    const tokenBalances: TokenBalance[] = [];
    const tokenSymbols = ['USDT', 'USDC', 'DAI'];
    
    for (let i = 0; i < tokenSymbols.length; i++) {
      const balance = await tokenBalanceResponses[i];
      if (balance && balance !== "0") {
        tokenBalances.push({
          tokenName: tokenSymbols[i],
          tokenSymbol: tokenSymbols[i],
          tokenDecimal: tokenSymbols[i] === 'DAI' ? '18' : '6',
          balance: balance,
          contractAddress: TOKEN_ADDRESSES[tokenSymbols[i] as keyof typeof TOKEN_ADDRESSES]
        });
      }
    }

    return {
      address,
      balance: balanceData.status === "1" ? balanceData.result : "0",
      tokenBalances,
      transactions,
      tokenTransfers,
      lastActive,
      totalTxCount: transactions.length + tokenTransfers.length
    };
  } catch (error) {
    console.error('Etherscan API error:', error);
    throw error;
  }
}

export { ETHERSCAN_API_URL, ETHERSCAN_API_KEY }