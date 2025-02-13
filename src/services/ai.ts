import { ScanResult } from '../types';
import { getContractInfo, getWalletTransactions } from './etherscan';
import { analyzeWebsite } from './webscraper';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

function parseAIResponse(content: string): { score: number; issues: string[] } {
  try {
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    const scoreMatch = content.match(/(?:score|rating|safety):\s*(\d+)/i);
    const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 50;
    
    const issues = lines
      .filter(line => 
        line.startsWith('-') || 
        line.startsWith('•') || 
        line.includes('risk:') || 
        line.includes('issue:') || 
        line.includes('warning:') || 
        line.includes('concern:')
      )
      .map(line => line.replace(/^[-*•]|\b(?:risk|issue|warning|concern):/gi, '').trim())
      .filter(Boolean);

    return {
      score,
      issues: issues.length > 0 ? issues : ['AI analysis completed, potential risks identified']
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {
      score: 50,
      issues: ['Error parsing AI response']
    };
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

async function makeAIRequest(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://stackblitz.com',
        'X-Title': 'CryptoGuard AI',
        'Content-Type': 'application/json',
        'Origin': 'https://stackblitz.com'
      },
      body: JSON.stringify({
        model: "nvidia/llama-3.1-nemotron-70b-instruct:free",
        messages: [
          {
            role: 'system',
            content: 'You are a crypto security expert. Analyze the given input for potential risks and scams. Keep responses factual and specific. Always use the same criteria for scoring and be consistent.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`AI service error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from AI service');
    }

    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return `Safety Score: 50\n\nIdentified Issues:\n- Unable to perform AI analysis at the moment\n- Using fallback risk assessment based on available data\n- Please try again later for full AI analysis`;
    }
    throw error;
  }
}

async function checkPhishingAndScams(input: string): Promise<{
  isPhishing: boolean;
  confidence: number;
  warnings: string[];
}> {
  const prompt = `Analyze this crypto address or URL for potential phishing or scam indicators: ${input}
Please check for:
1. Known scam patterns
2. Phishing indicators
3. Similarity to legitimate services
4. Suspicious patterns

Format response as:
Confidence: [0-100]
Is Phishing: [true/false]
Warnings:
- [warning 1]
- [warning 2]`;

  try {
    const aiResponse = await makeAIRequest(prompt);
    const lines = aiResponse.split('\n');
    const confidence = parseInt(lines.find(l => l.toLowerCase().includes('confidence'))?.split(':')[1] || '50', 10);
    const isPhishing = lines.find(l => l.toLowerCase().includes('is phishing'))?.toLowerCase().includes('true') || false;
    const warnings = lines
      .filter(l => l.startsWith('-'))
      .map(l => l.substring(1).trim());

    return {
      isPhishing,
      confidence,
      warnings: warnings.length > 0 ? warnings : []
    };
  } catch (error) {
    console.error('Phishing check error:', error);
    return {
      isPhishing: false,
      confidence: 0,
      warnings: ['Unable to perform phishing analysis']
    };
  }
}

async function getGasPrice(): Promise<{
  low: number;
  medium: number;
  high: number;
  timestamp: number;
}> {
  try {
    const response = await fetch(`${ETHERSCAN_API_URL}?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`);
    const data = await handleEtherscanResponse(response, 'gas tracker');
    
    if (data.status === "1" && data.result) {
      return {
        low: parseInt(data.result.SafeLow || '0'),
        medium: parseInt(data.result.ProposeGasPrice || '0'),
        high: parseInt(data.result.FastGasPrice || '0'),
        timestamp: Date.now()
      };
    }
    
    throw new Error('Invalid gas price data received');
  } catch (error) {
    console.error('Gas tracker error:', error);
    return {
      low: 0,
      medium: 0,
      high: 0,
      timestamp: Date.now()
    };
  }
}

export async function analyzeProject(input: string): Promise<ScanResult> {
  if (!input) {
    throw new Error('Please provide a contract address, wallet address, or project URL');
  }

  try {
    let contractInfo;
    let websiteAnalysis;
    let walletInfo;
    let phishingCheck;
    let gasPrice;
    let issues: string[] = [];
    let totalScore = 0;
    let scoreCount = 0;

    const isAddress = input.startsWith('0x') && input.length === 42;
    const isUrl = input.toLowerCase().startsWith('http');

    if (!isAddress && !isUrl) {
      throw new Error('Invalid input. Please provide a valid Ethereum address (0x...) or website URL (http...)');
    }

    const phishingPromise = checkPhishingAndScams(input);
    const gasPricePromise = getGasPrice();

    if (isAddress) {
      try {
        walletInfo = await getWalletTransactions(input);
        if (walletInfo) {
          [phishingCheck, gasPrice] = await Promise.all([phishingPromise, gasPricePromise]);

          return {
            risk: 'low',
            score: 100,
            issues: phishingCheck.warnings,
            details: {
              wallet: {
                ...walletInfo,
                gasTracker: gasPrice,
                phishingStatus: {
                  isPhishing: phishingCheck.isPhishing,
                  confidence: phishingCheck.confidence
                }
              }
            },
            timestamp: Date.now()
          };
        }

        contractInfo = await getContractInfo(input);
        if (contractInfo) {
          if (!contractInfo.isVerified) {
            issues.push('⚠️ Contract is not verified on Etherscan');
          }
          if (parseInt(contractInfo.balance || '0') === 0) {
            issues.push('⚠️ Contract has zero balance');
          }
          if ((contractInfo.txCount || 0) < 100) {
            issues.push('⚠️ Low transaction count - might be a new or inactive contract');
          }
          
          totalScore += contractInfo.isVerified ? 100 : 30;
          scoreCount++;
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Address analysis error:', errorMessage);
        throw new Error(`Address analysis failed: ${errorMessage}`);
      }
    }

    if (isUrl) {
      try {
        websiteAnalysis = await analyzeWebsite(input);
        issues.push(...websiteAnalysis.findings);
        totalScore += websiteAnalysis.score;
        scoreCount++;
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Website analysis error:', errorMessage);
        throw new Error(`Website analysis failed: ${errorMessage}`);
      }
    }

    if (!walletInfo && (contractInfo || websiteAnalysis)) {
      try {
        const prompt = `Please analyze this crypto project: ${input}
${contractInfo ? `
Contract Info:
- Verified: ${contractInfo.isVerified}
- Balance: ${contractInfo.balance}
- Tx Count: ${contractInfo.txCount}` : ''}
${websiteAnalysis ? `
Website Analysis:
- Score: ${websiteAnalysis.score}
- Findings: ${websiteAnalysis.findings.join(', ')}` : ''}

Format your response exactly like this:
Safety Score: [0-100]

Identified Issues:
- [First issue]
- [Second issue]
- [Additional issues...]`;

        const aiResponse = await makeAIRequest(prompt);
        const { score: aiScore, issues: aiIssues } = parseAIResponse(aiResponse);
        
        totalScore += aiScore;
        scoreCount++;
        issues.push(...aiIssues);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('AI analysis error:', errorMessage);
        throw new Error(`AI analysis failed: ${errorMessage}`);
      }
    }

    [phishingCheck, gasPrice] = await Promise.all([phishingPromise, gasPricePromise]);

    if (phishingCheck?.isPhishing) {
      issues.push(...phishingCheck.warnings);
      totalScore -= 30;
    }

    const finalScore = Math.round(totalScore / (scoreCount || 1));

    return {
      risk: finalScore > 70 ? 'low' : finalScore > 40 ? 'medium' : 'high',
      score: finalScore,
      issues: Array.from(new Set(issues)),
      details: {
        contract: contractInfo,
        website: websiteAnalysis,
        wallet: walletInfo,
        gasTracker: gasPrice,
        phishingStatus: phishingCheck
      },
      timestamp: Date.now()
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error('Analysis error:', errorMessage);
    throw new Error(errorMessage);
  }
}