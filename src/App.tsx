import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Search, ExternalLink } from 'lucide-react';
import { analyzeProject } from './services/ai';
import type { ScanHistory, ScanResult } from './types';
import { DetailedResults } from './components/DetailedResults';
import { ScanHistory as ScanHistoryComponent } from './components/ScanHistory';

const HISTORY_KEY = 'cryptoguard_history';

function App() {
  const [contractAddress, setContractAddress] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanHistory[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanning(true);
    setError(null);
    setResult(null);
    
    try {
      const scanResult = await analyzeProject(contractAddress);
      const newScan: ScanHistory = {
        id: Date.now().toString(),
        input: contractAddress,
        result: {
          ...scanResult,
          timestamp: Date.now()
        }
      };
      
      setResult(newScan.result);
      setHistory(prev => [newScan, ...prev.slice(0, 9)]); // Keep last 10 scans
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setScanning(false);
    }
  };

  const handleHistorySelect = (scan: ScanHistory) => {
    setContractAddress(scan.input);
    setResult(scan.result);
    setError(null);
  };

  const examples = [
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // Uniswap
    '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', // Polygon
    'https://uniswap.org',
    'https://aave.com'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-center mb-12">
          <Shield className="w-10 h-10 mr-3 text-emerald-400" />
          <h1 className="text-4xl font-bold">CryptoGuard AI</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-xl mb-8">
              <h2 className="text-2xl font-semibold mb-6">Scan Project for Risks</h2>
              
              <div className="mb-6 p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-start mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium mb-2">What to input:</h3>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      <li>Ethereum contract address (starts with 0x)</li>
                      <li>Project website URL (e.g., https://project.com)</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm text-slate-400 mb-2">Examples you can try:</p>
                  <div className="flex flex-wrap gap-2">
                    {examples.map((example) => (
                      <button
                        key={example}
                        onClick={() => setContractAddress(example)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors"
                      >
                        {example.length > 30 ? example.slice(0, 30) + '...' : example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleScan} className="space-y-4">
                <div>
                  <label htmlFor="contract" className="block text-sm font-medium mb-2">
                    Contract Address or Project URL
                  </label>
                  <div className="relative">
                    <input
                      id="contract"
                      type="text"
                      value={contractAddress}
                      onChange={(e) => setContractAddress(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                      placeholder="0x... or https://..."
                    />
                    <Search className="absolute right-3 top-3 text-slate-400" />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={scanning || !contractAddress}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6 rounded-lg font-medium transition duration-200"
                >
                  {scanning ? 'Analyzing...' : 'Scan for Risks'}
                </button>
              </form>

              {error && (
                <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <p>{error}</p>
                  </div>
                </div>
              )}
            </div>

            {result && <DetailedResults result={result} />}
          </div>

          <div className="lg:col-span-1">
            <ScanHistoryComponent history={history} onSelect={handleHistorySelect} />
            
            <div className="mt-8 bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Security Tips</h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400">1</span>
                  </div>
                  <p className="text-slate-300">Always verify contract source code on Etherscan</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400">2</span>
                  </div>
                  <p className="text-slate-300">Check for security audits from reputable firms</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400">3</span>
                  </div>
                  <p className="text-slate-300">Research the team's background and track record</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400">4</span>
                  </div>
                  <p className="text-slate-300">Monitor social media activity and community engagement</p>
                </li>
              </ul>
            </div>

            <div className="mt-8 text-center text-sm text-slate-400">
              <p>This tool uses AI to analyze crypto projects but should not be your only source of due diligence.</p>
              <div className="flex items-center justify-center mt-2">
                <a href="#" className="flex items-center hover:text-emerald-400 transition-colors">
                  Learn more about our analysis methodology
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;