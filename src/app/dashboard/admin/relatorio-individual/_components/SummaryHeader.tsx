'use client';

import React from 'react';

export interface SummaryHeaderProps {
  metaAno: number;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  progressPct: number;
  usePace: boolean;
  necessarioTotalLabel?: string;
  realizadoTotalLabel?: string;
  progressoPct: number | null;
  acimaAbaixo: 'acima' | 'abaixo' | 'no_alvo';
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export default function SummaryHeader({
  metaAno,
  periodLabel,
  periodStart,
  periodEnd,
  progressPct,
  usePace,
  progressoPct,
  acimaAbaixo,
}: SummaryHeaderProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 backdrop-blur-sm p-5 shadow-soft card-glow">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Meta anual</p>
          <p className="text-xl font-bold text-[#D4A017] dark:text-[#E8C547] tabular-nums">{formatCurrency(metaAno)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Recorte</p>
          <p className="text-sm font-semibold text-white">{periodLabel}</p>
          <p className="text-xs text-gray-400 mt-0.5">{periodStart} – {periodEnd}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
            {usePace ? 'Pace (esperado até hoje)' : 'Período'}
          </p>
          <p className="text-sm font-semibold text-white tabular-nums">{Math.round(progressPct * 100)}%</p>
        </div>
      </div>
      {progressoPct != null && (
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-400">Avanço no recorte:</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, progressoPct * 100))}%`,
                  backgroundColor: acimaAbaixo === 'acima' ? '#22c55e' : acimaAbaixo === 'abaixo' ? '#ef4444' : '#eab308',
                }}
              />
            </div>
            <span className={`text-sm font-bold tabular-nums ${
              acimaAbaixo === 'acima' ? 'text-emerald-400' : acimaAbaixo === 'abaixo' ? 'text-red-400' : 'text-amber-400'
            }`}>
              {(progressoPct * 100).toFixed(0)}%
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            acimaAbaixo === 'acima'
              ? 'bg-emerald-500/20 text-emerald-400'
              : acimaAbaixo === 'abaixo'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-amber-500/20 text-amber-400'
          }`}>
            {acimaAbaixo === 'acima' ? 'Acima' : acimaAbaixo === 'abaixo' ? 'Abaixo' : 'No alvo'}
          </span>
        </div>
      )}
    </div>
  );
}
