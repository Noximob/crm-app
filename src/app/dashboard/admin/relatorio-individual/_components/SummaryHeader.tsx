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
  const pctNum = progressoPct != null ? progressoPct * 100 : 0;
  const barPct = Math.min(100, Math.max(0, pctNum));
  const barColor = acimaAbaixo === 'acima' ? '#22c55e' : acimaAbaixo === 'abaixo' ? '#ef4444' : '#eab308';
  const statusText = acimaAbaixo === 'acima' ? 'Acima da meta' : acimaAbaixo === 'abaixo' ? 'Abaixo da meta' : 'No alvo';
  const statusSubtext =
    acimaAbaixo === 'acima'
      ? 'Você já passou do valor esperado para o período.'
      : acimaAbaixo === 'abaixo'
        ? 'Foque em aumentar vendas ou prospecção para fechar no alvo.'
        : 'Você está no ritmo esperado.';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 backdrop-blur-sm p-5 shadow-soft card-glow">
      <h2 className="text-lg font-bold text-white mb-1">Seu resultado no período</h2>
      <p className="text-sm text-gray-400 mb-4">
        {periodLabel} · {periodStart} a {periodEnd}
        {usePace && ` · ${Math.round(progressPct * 100)}% do tempo já passou`}
      </p>

      {progressoPct != null && (
        <div className="mb-4">
          <p className="text-sm text-gray-300 mb-2">
            <strong className="text-white">Em uma frase:</strong> você realizou{' '}
            <span className={`font-bold ${acimaAbaixo === 'acima' ? 'text-emerald-400' : acimaAbaixo === 'abaixo' ? 'text-red-400' : 'text-amber-400'}`}>
              {(progressoPct * 100).toFixed(0)}%
            </span>{' '}
            do valor esperado para o período. {statusSubtext}
          </p>
          <div className="flex justify-between items-baseline gap-2 mb-1">
            <span className="text-xs text-gray-500">0%</span>
            <span className="text-xs text-gray-500">100% = meta do período</span>
            {pctNum > 100 && <span className="text-xs text-emerald-400 font-semibold">{pctNum.toFixed(0)}%</span>}
          </div>
          <div className="h-5 rounded-full bg-white/10 overflow-hidden relative flex">
            <div
              className="h-full rounded-l-full transition-all duration-500 min-w-[4px]"
              style={{ width: `${barPct}%`, backgroundColor: barColor }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/70 rounded z-10"
              style={{ left: '100%', transform: 'translateX(-2px)' }}
              title="100% = esperado"
            />
          </div>
          <p className={`text-sm font-semibold mt-2 ${acimaAbaixo === 'acima' ? 'text-emerald-400' : acimaAbaixo === 'abaixo' ? 'text-red-400' : 'text-amber-400'}`}>
            {statusText}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Meta anual</p>
          <p className="text-xl font-bold text-[#D4A017] tabular-nums">{formatCurrency(metaAno)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Recorte</p>
          <p className="text-sm font-semibold text-white">{periodLabel}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
            {usePace ? 'Tempo do período já passou' : 'Período'}
          </p>
          <p className="text-sm font-semibold text-white tabular-nums">{Math.round(progressPct * 100)}%</p>
        </div>
      </div>
    </div>
  );
}
