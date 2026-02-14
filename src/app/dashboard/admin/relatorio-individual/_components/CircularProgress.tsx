'use client';

import React from 'react';

export interface CircularProgressProps {
  label: string;
  value: string | number;
  /** 0..1 ou 0..100 - se > 1 trata como 0..100 */
  progress: number;
  /** cor do arco: emerald, amber, red, gold */
  variant?: 'emerald' | 'amber' | 'red' | 'gold';
  size?: 'sm' | 'md';
  className?: string;
}

const strokeColor = {
  emerald: '#22c55e',
  amber: '#eab308',
  red: '#ef4444',
  gold: '#D4A017',
};

export default function CircularProgress({
  label,
  value,
  progress,
  variant = 'gold',
  size = 'md',
  className = '',
}: CircularProgressProps) {
  const pct = progress > 1 ? Math.min(100, progress) : Math.min(100, progress * 100);
  const r = size === 'sm' ? 28 : 36;
  const stroke = size === 'sm' ? 4 : 5;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const color = strokeColor[variant];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative inline-flex" style={{ width: r * 2 + stroke * 2, height: r * 2 + stroke * 2 }}>
        <svg
          width={r * 2 + stroke * 2}
          height={r * 2 + stroke * 2}
          className="rotate-[-90deg]"
        >
          <circle
            cx={r + stroke}
            cy={r + stroke}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={stroke}
          />
          <circle
            cx={r + stroke}
            cy={r + stroke}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold text-white tabular-nums ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 text-center leading-tight">{label}</p>
    </div>
  );
}
