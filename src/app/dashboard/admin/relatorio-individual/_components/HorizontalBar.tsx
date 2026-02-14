'use client';

import React from 'react';

export interface HorizontalBarProps {
  label: string;
  value: number;
  max: number;
  valueLabel?: string;
  barColor?: string;
  showValue?: boolean;
  className?: string;
}

/** Barra horizontal: preenche (value/max)*100% com cor. Clareza visual. */
export default function HorizontalBar({
  label,
  value,
  max,
  valueLabel,
  barColor = '#D4A017',
  showValue = true,
  className = '',
}: HorizontalBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const displayLabel = valueLabel ?? (Number.isInteger(value) ? String(value) : value.toFixed(1));

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-sm text-gray-300 truncate">{label}</span>
        {showValue && (
          <span className="text-sm font-semibold text-white tabular-nums shrink-0">{displayLabel}</span>
        )}
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 min-w-[2px]"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
