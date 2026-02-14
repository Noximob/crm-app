'use client';

import React, { useState } from 'react';
import type { GapByStage } from '../_lib/configTypes';
import RealizadoVsMetaBar from './RealizadoVsMetaBar';

type SortMode = 'pior' | 'funil';

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
      return pa - pb;
    });
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-3">
        Cada etapa mostra <strong className="text-white">quanto você fez</strong> (barra colorida) vs <strong className="text-white">quanto era preciso</strong> (100%). Verde = no alvo, amarelo = atenção, vermelho = crítico.
      </p>
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-xs text-gray-400">Ordenar:</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setSort('pior')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
              sort === 'pior' ? 'bg-[#D4A017] text-white' : 'bg-white/10 text-gray-400 hover:bg-white/15'
            }`}
          >
            Maior GAP primeiro
          </button>
          <button
            type="button"
            onClick={() => setSort('funil')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
              sort === 'funil' ? 'bg-[#D4A017] text-white' : 'bg-white/10 text-gray-400 hover:bg-white/15'
            }`}
          >
            Ordem do funil
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {sorted.map((g) => (
          <RealizadoVsMetaBar
            key={g.stageId}
            label={g.stageNome}
            realizado={g.realizado}
            necessario={g.necessario}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <span><span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-1" /> 100% ou mais = no alvo</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-1" /> 50–99% = atenção</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1" /> abaixo de 50% = crítico</span>
      </div>
    </div>
  );
}
