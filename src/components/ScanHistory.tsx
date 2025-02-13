import React from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import type { ScanHistory } from '../types';
import { RiskIndicator } from './RiskIndicator';

type ScanHistoryProps = {
  history: ScanHistory[];
  onSelect: (scan: ScanHistory) => void;
};

export function ScanHistory({ history, onSelect }: ScanHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-slate-400" />
        <h2 className="text-xl font-semibold">Recent Scans</h2>
      </div>

      <div className="space-y-3">
        {history.map((scan) => (
          <button
            key={scan.id}
            onClick={() => onSelect(scan)}
            className="w-full p-4 bg-slate-900/50 rounded-lg hover:bg-slate-900/75 transition-colors border border-slate-700/50 hover:border-slate-600"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 font-medium truncate">
                  {scan.input}
                </span>
              </div>
              <span className="text-sm text-slate-500">
                {new Date(scan.result.timestamp).toLocaleDateString()}
              </span>
            </div>
            <RiskIndicator
              risk={scan.result.risk}
              score={scan.result.score}
              size="sm"
            />
          </button>
        ))}
      </div>
    </div>
  );
}