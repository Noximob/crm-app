'use client';

import React from 'react';
import ComissoesEmbed from '@/components/ComissoesEmbed';

export default function ComissoesPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2">
        <h1 className="al-display text-2xl font-bold text-white uppercase tracking-[0.1em]">Comissões</h1>
        <p className="text-sm text-text-secondary">Suas comissões do trimestre à esquerda e a calculadora de meta à direita.</p>
      </div>
      <div className="flex-1 min-h-0 px-2 pb-2">
        <ComissoesEmbed mode="view" />
      </div>
    </div>
  );
}
