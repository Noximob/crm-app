'use client';

import React from 'react';

export default function ComissoesPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-white">Comissões</h1>
        <p className="text-sm text-text-secondary">Veja seus ganhos (corretor ou gerente) e use a calculadora de meta do trimestre.</p>
      </div>
      <div className="flex-1 min-h-0 px-2 pb-2">
        <iframe
          src="/comissoes/index.html?mode=view"
          title="Comissões"
          className="w-full h-full rounded-xl border border-white/10 bg-[#f7f5f0]"
          style={{ minHeight: 'calc(100vh - 140px)' }}
        />
      </div>
    </div>
  );
}
