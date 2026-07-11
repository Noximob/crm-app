'use client';

import React from 'react';

export default function TreinamentosPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-24">
      <div className="al-card relative overflow-hidden px-12 py-10 flex flex-col items-center">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="al-display text-2xl font-bold text-white uppercase tracking-[0.14em] mb-2">Academia</h1>
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#FFE9A6]">Em Construção</p>
        <p className="text-sm text-text-secondary mt-2">Novos treinamentos chegando em breve.</p>
      </div>
    </div>
  );
}
