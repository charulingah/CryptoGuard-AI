import React from 'react';
import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import type { RiskLevel } from '../types';

type RiskIndicatorProps = {
  risk: RiskLevel;
  score: number;
  size?: 'sm' | 'lg';
};

export function RiskIndicator({ risk, score, size = 'lg' }: RiskIndicatorProps) {
  const config = {
    high: {
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      text: 'High Risk',
    },
    medium: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      text: 'Medium Risk',
    },
    low: {
      icon: ShieldCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      text: 'Low Risk',
    },
  };

  const { icon: Icon, color, bgColor, borderColor, text } = config[risk];
  const sizeClasses = size === 'lg' ? 'p-4 text-lg' : 'p-2 text-sm';

  return (
    <div className={`flex items-center gap-3 rounded-lg border ${sizeClasses} ${bgColor} ${borderColor}`}>
      <Icon className={`${color} ${size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}`} />
      <div>
        <div className={`font-semibold ${color}`}>{text}</div>
        <div className="text-slate-400 text-sm">Score: {score}/100</div>
      </div>
    </div>
  );
}