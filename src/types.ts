// Previous type definitions remain...

export type GasTracker = {
  low: number;
  medium: number;
  high: number;
  timestamp: number;
};

export type PhishingStatus = {
  isPhishing: boolean;
  confidence: number;
  warnings?: string[];
};

export type WalletInfo = {
  address: string;
  balance: string;
  tokenBalances: TokenBalance[];
  transactions: Transaction[];
  tokenTransfers: Transaction[];
  lastActive: number;
  totalTxCount: number;
  gasTracker?: GasTracker;
  phishingStatus?: PhishingStatus;
  profitLoss?: {
    totalProfit: string;
    totalLoss: string;
    netPosition: string;
  };
};

// Update ScanResult to include new fields
export type ScanResult = {
  risk: RiskLevel;
  score: number;
  issues: string[];
  details?: {
    contract?: ContractDetails;
    website?: WebsiteDetails;
    wallet?: WalletInfo;
    gasTracker?: GasTracker;
    phishingStatus?: PhishingStatus;
  };
  timestamp: number;
};