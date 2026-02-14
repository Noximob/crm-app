'use client';

import React from 'react';
import type { PeriodKey } from '../_lib/configTypes';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export interface ReportHeroProps {
  nomeCorretor: string;
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  metaAno: number;
  periodStart: string;
  periodEnd: string;
  progressPct: number;
  usePace: boolean;
}

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: 'dia', label: 'Diário' },
  { value: 'semana', label: 'Semanal' },
  { value: 'mes', label: 'Mensal' },
  { value: 'trimestre', label: 'Trimestral' },
  { value: 'semestre', label: 'Semestral' },
  { value: 'ano', label: 'Anual' },
];

export default function ReportHero({
  nomeCorretor,
  period,
  onPeriodChange,
  metaAno,
  periodStart,
  periodEnd,
  progressPct,
  usePace,
}: ReportHeroProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6">
      <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
        Olá, {nomeCorretor || 'Corretor'}!
        <span className="text-2xl" aria-hidden>👋</span>
      </h1>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Período</label>
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as PeriodKey)}
            className="rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A017]/50 min-w-[120px]"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#23283A]">
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#D4A017]/30 bg-[#D4A017]/10 px-4 py-2">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Meta do ano</span>
          <span className="text-lg font-bold text-[#D4A017] tabular-nums">{formatCurrency(metaAno)}</span>
        </div>
        <span className="text-xs text-gray-500">
          {periodStart} – {periodEnd}
          {usePace && ` · ${Math.round(progressPct * 100)}% do período`}
        </span>
      </div>
    </div>
  );
}
