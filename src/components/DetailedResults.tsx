import React from 'react';
import { Link2, GitBranch, Users, Wallet, Activity, Shield, Globe, AlertTriangle, ArrowRight, Clock, AlertCircle, Gauge, TrendingUp, Bell } from 'lucide-react';
import type { ScanResult } from '../types';
import { RiskIndicator } from './RiskIndicator';

type DetailedResultsProps = {
  result: ScanResult;
};

export function DetailedResults({ result }: DetailedResultsProps) {
  const { details, issues } = result;

  // For wallet addresses, show balance, transactions, and new features
  if (details?.wallet) {
    return (
      <div className="space-y-6">
        {details.wallet.phishingStatus?.isPhishing && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-red-200">Security Warning</h3>
            </div>
            <p className="text-red-200">This address has been flagged as potentially malicious.</p>
            {details.wallet.phishingStatus.warnings?.map((warning, index) => (
              <p key={index} className="text-red-300 mt-1">• {warning}</p>
            ))}
          </div>
        )}

        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Wallet Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium">ETH Balance</span>
              </div>
              <p className="text-lg">{(parseFloat(details.wallet.balance) / 1e18).toFixed(4)} ETH</p>
            </div>

            {details.wallet.tokenBalances.map((token) => (
              <div key={token.contractAddress} className="p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium">{token.tokenSymbol} Balance</span>
                </div>
                <p className="text-lg">
                  {(parseFloat(token.balance) / Math.pow(10, parseInt(token.tokenDecimal))).toFixed(2)} {token.tokenSymbol}
                </p>
              </div>
            ))}

            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">Total Transactions</span>
              </div>
              <p className="text-lg">{details.wallet.totalTxCount.toLocaleString()}</p>
            </div>

            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium">Last Active</span>
              </div>
              <p className="text-lg">{new Date(details.wallet.lastActive * 1000).toLocaleDateString()}</p>
            </div>
            
            {details.wallet.gasTracker && (
              <div className="col-span-full bg-slate-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Gauge className="w-5 h-5 text-purple-400" />
                  <h4 className="font-semibold">Current Gas Prices (Gwei)</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Low</p>
                    <p className="text-lg font-medium text-green-400">
                      {details.wallet.gasTracker.low}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Medium</p>
                    <p className="text-lg font-medium text-yellow-400">
                      {details.wallet.gasTracker.medium}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">High</p>
                    <p className="text-lg font-medium text-red-400">
                      {details.wallet.gasTracker.high}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Last updated: {new Date(details.wallet.gasTracker.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            {details.wallet.profitLoss && (
              <div className="col-span-full bg-slate-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-semibold">Portfolio Performance</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Total Profit</p>
                    <p className="text-lg font-medium text-emerald-400">
                      {details.wallet.profitLoss.totalProfit} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Total Loss</p>
                    <p className="text-lg font-medium text-red-400">
                      {details.wallet.profitLoss.totalLoss} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Net Position</p>
                    <p className={`text-lg font-medium ${
                      parseFloat(details.wallet.profitLoss.netPosition) >= 0 
                        ? 'text-emerald-400' 
                        : 'text-red-400'
                    }`}>
                      {details.wallet.profitLoss.netPosition} ETH
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {details.wallet.transactions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3">Recent Transactions</h4>
              <div className="space-y-2">
                {details.wallet.transactions.map((tx) => (
                  <div key={tx.hash} className="p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-400">
                          {new Date(tx.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                      <span className={`text-sm ${tx.isError === "0" ? "text-emerald-400" : "text-red-400"}`}>
                        {tx.isError === "0" ? "Success" : "Failed"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400 truncate">{tx.from}</span>
                      <ArrowRight className="w-4 h-4 text-slate-600" />
                      <span className="text-slate-400 truncate">{tx.to}</span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="text-slate-300">{(parseFloat(tx.value) / 1e18).toFixed(6)} ETH</span>
                      {tx.methodName && (
                        <span className="ml-2 text-slate-400">({tx.methodName})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {details.wallet.tokenTransfers.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-3">Recent Token Transfers</h4>
              <div className="space-y-2">
                {details.wallet.tokenTransfers.map((tx) => (
                  <div key={tx.hash} className="p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-400">
                          {new Date(tx.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-sm text-emerald-400">
                        {tx.tokenName} ({tx.tokenSymbol})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400 truncate">{tx.from}</span>
                      <ArrowRight className="w-4 h-4 text-slate-600" />
                      <span className="text-slate-400 truncate">{tx.to}</span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="text-slate-300">
                        {(parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || "18"))).toFixed(2)} {tx.tokenSymbol}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold">Wallet Alerts</h3>
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
              Set Up Alerts
            </button>
          </div>
          <p className="text-slate-400">
            Get notified about suspicious activities, large transfers, and significant price movements.
          </p>
        </div>
      </div>
    );
  }

  // Only show risk indicator for contracts and websites, not wallets
  const showRiskIndicator = !details?.wallet && (details?.contract || details?.website);

  return (
    <div className="space-y-6">
      {showRiskIndicator && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RiskIndicator risk={result.risk} score={result.score} />
          
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold mb-2">Scan Summary</h3>
            <p className="text-slate-300">
              Scanned on {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {details?.contract && !details?.wallet && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Contract Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium">Verification</span>
              </div>
              <p className={`text-lg ${details.contract.isVerified ? 'text-emerald-400' : 'text-red-400'}`}>
                {details.contract.isVerified ? 'Verified' : 'Not Verified'}
              </p>
            </div>

            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">Balance</span>
              </div>
              <p className="text-lg">{(parseFloat(details.contract.balance || "0") / 1e18).toFixed(4)} ETH</p>
            </div>

            <div className="p-3 bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">Transactions</span>
              </div>
              <p className="text-lg">{details.contract.txCount?.toLocaleString()}</p>
            </div>

            {details.contract.tokenInfo && (
              <>
                <div className="p-3 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium">Token Info</span>
                  </div>
                  <p className="text-lg">{details.contract.tokenInfo.name} ({details.contract.tokenInfo.symbol})</p>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium">Holders</span>
                  </div>
                  <p className="text-lg">{details.contract.tokenInfo.holders?.toLocaleString() || 'N/A'}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {details?.website && !details?.wallet && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Website Analysis</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Whitepaper', value: details.website.hasWhitepaper },
              { label: 'Team Info', value: details.website.hasTeamInfo },
              { label: 'Audit', value: details.website.hasAudit },
              { label: 'Roadmap', value: details.website.hasRoadmap },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-slate-900/50 rounded-lg">
                <span className="text-sm font-medium block mb-1">{label}</span>
                <span className={value ? 'text-emerald-400' : 'text-red-400'}>
                  {value ? '✓ Present' : '✗ Missing'}
                </span>
              </div>
            ))}
          </div>

          {details.website.findings.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Findings</h4>
              <ul className="space-y-2">
                {details.website.findings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-300">
                    <span className="text-yellow-400">•</span>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {issues.length > 0 && !details?.wallet && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
          <ul className="space-y-3">
            {issues.map((issue, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}