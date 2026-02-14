'use client';

import React from 'react';

export interface RealizadoVsMetaBarProps {
  label: string;
  realizado: number;
  necessario: number;
  valueSuffix?: string;
  className?: string;
}

/**
 * Barra que mostra realizado (preenchido) vs necessário (total).
 * Verde se >= 100%, amarelo 50-99%, vermelho < 50%.
 */
export default function RealizadoVsMetaBar({
  label,
  realizado,
  necessario,
  valueSuffix = '',
  className = '',
}: RealizadoVsMetaBarProps) {
  const pct = necessario > 0 ? (realizado / necessario) * 100 : 0;
  const status = pct >= 100 ? 'ok' : pct >= 50 ? 'atencao' : 'critico';
  const fillColor = status === 'ok' ? '#22c55e' : status === 'atencao' ? '#eab308' : '#ef4444';
  const barWidth = Math.min(100, pct);

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-sm text-gray-300 truncate">{label}</span>
        <span className="text-xs font-semibold tabular-nums shrink-0 text-white">
          {realizado}{valueSuffix} / {necessario}{valueSuffix}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden flex">
          <div
            className="h-full rounded-l-full transition-all duration-500"
            style={{ width: `${barWidth}%`, backgroundColor: fillColor, minWidth: realizado > 0 ? 4 : 0 }}
          />
          {barWidth < 100 && <div className="h-full flex-1 bg-white/5" />}
        </div>
        <span
          className={`text-xs font-bold tabular-nums w-10 text-right ${
            status === 'ok' ? 'text-emerald-400' : status === 'atencao' ? 'text-amber-400' : 'text-red-400'
          }`}
        >
          {necessario > 0 ? `${Math.round(pct)}%` : '—'}
        </span>
      </div>
    </div>
  );
}
