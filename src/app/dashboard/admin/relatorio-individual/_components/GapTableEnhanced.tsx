'use client';

import React, { useState } from 'react';
import type { GapByStage } from '../_lib/configTypes';

type SortMode = 'pior' | 'funil';

function getStatus(gapPct: number | null): 'ok' | 'atencao' | 'critico' {
  if (gapPct == null) return 'ok';
  if (gapPct >= 1) return 'ok';
  if (gapPct >= 0.5) return 'atencao';
  return 'critico';
}

export interface GapTableEnhancedProps {
  gaps: GapByStage[];
  defaultSort?: SortMode;
}

export default function GapTableEnhanced({ gaps, defaultSort = 'pior' }: GapTableEnhancedProps) {
  const [sort, setSort] = useState<SortMode>(defaultSort);

  const sorted = [...gaps];
  if (sort === 'pior') {
    sorted.sort((a, b) => {
      const pa = a.gapPct ?? 2;
      const pb = b.gapPct ?? 2;
      return pa - pb; // menor % primeiro (pior)
    });
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs text-gray-400">Ordenar:</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setSort('pior')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
              sort === 'pior' ? 'bg-[#D4A017] text-white' : 'bg-white/10 text-gray-400 hover:bg-white/15'
            }`}
          >
            Pior %
          </button>
          <button
            type="button"
            onClick={() => setSort('funil')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
              sort === 'funil' ? 'bg-[#D4A017] text-white' : 'bg-white/10 text-gray-400 hover:bg-white/15'
            }`}
          >
            Ordem funil
          </button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-white/10">
            <th className="pb-2 pr-2 font-semibold">Etapa</th>
            <th className="pb-2 pr-2 text-right font-semibold">Necessário</th>
            <th className="pb-2 pr-2 text-right font-semibold">Realizado</th>
            <th className="pb-2 pr-2 text-right font-semibold">GAP</th>
            <th className="pb-2 w-28 font-semibold text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((g) => {
            const status = getStatus(g.gapPct);
            const barPct = g.gapPct != null ? Math.min(100, g.gapPct * 100) : 0;
            return (
              <tr key={g.stageId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-2.5 pr-2 font-medium text-white">{g.stageNome}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums text-gray-300">{g.necessario.toFixed(0)}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums text-gray-300">{g.realizado}</td>
                <td className={`py-2.5 pr-2 text-right tabular-nums font-semibold ${
                  g.gapAbs >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {g.gapAbs >= 0 ? '+' : ''}{g.gapAbs.toFixed(0)}
                </td>
                <td className="py-2.5 w-28">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-14 h-2 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                      <div
                        className="h-full rounded-full transition-all min-w-[4px]"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor: status === 'ok' ? '#22c55e' : status === 'atencao' ? '#eab308' : '#ef4444',
                        }}
                      />
                    </div>
                    <span className={`text-xs font-semibold tabular-nums w-10 text-right ${
                      status === 'ok' ? 'text-emerald-400' : status === 'atencao' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {g.gapPct != null ? `${(g.gapPct * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
