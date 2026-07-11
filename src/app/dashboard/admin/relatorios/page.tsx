'use client';

import React, { useState } from 'react';
import ConsolidadoTab from './_tabs/Consolidado';
import IndividualTab from './_tabs/Individual';
import DiarioTab from './_tabs/Diario';
import ValorizacaoClientesTab from './_tabs/ValorizacaoClientes';

type TabKey = 'consolidado' | 'individual' | 'diario' | 'valorizacao';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'consolidado', label: 'Consolidado' },
  { key: 'individual', label: 'Individual' },
  { key: 'diario', label: 'Diário' },
  { key: 'valorizacao', label: 'Valorização p/ cliente' },
];

export default function RelatoriosAdminPage() {
  const [tab, setTab] = useState<TabKey>('consolidado');

  return (
    <div className="min-h-full">
      {/* Cabeçalho do hub: título GX + pílulas de abas */}
      <div className="no-print pt-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="al-display text-2xl md:text-3xl font-extrabold text-white uppercase tracking-[0.08em] mb-4">
            Relatórios
          </h1>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
            {TABS.map((t) => {
              const ativo = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-3.5 py-2 text-sm rounded-lg font-bold whitespace-nowrap transition-colors shrink-0 ${
                    ativo
                      ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_0_14px_rgba(255,30,86,0.35)]'
                      : 'bg-white/[0.05] text-text-secondary hover:text-white hover:bg-white/[0.09]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo da aba ativa */}
      {tab === 'consolidado' && <ConsolidadoTab />}
      {tab === 'individual' && <IndividualTab />}
      {tab === 'diario' && <DiarioTab />}
      {tab === 'valorizacao' && <ValorizacaoClientesTab />}
    </div>
  );
}
