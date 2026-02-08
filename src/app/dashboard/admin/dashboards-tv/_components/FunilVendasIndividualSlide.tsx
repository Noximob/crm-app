'use client';

import React, { useMemo } from 'react';
import { PIPELINE_STAGES } from '@/lib/constants';
import type { FunilCorretor } from './useFunilVendasData';

const STAGE_LABELS: Record<string, string> = {
  'Pré Qualificação': 'Pré Qualif.',
  'Qualificação': 'Qualificação',
  'Apresentação do imóvel': 'Apres. imóvel',
  'Ligação agendada': 'Lig. agendada',
  'Visita agendada': 'Visita agend.',
  'Negociação e Proposta': 'Negoc. e Proposta',
  'Contrato e fechamento': 'Contrato',
  'Pós Venda e Fidelização': 'Pós Venda',
  'Interesse Futuro': 'Int. Futuro',
  'Carteira': 'Carteira',
  'Geladeira': 'Geladeira',
};

const TOP_N = 9;

interface FunilVendasIndividualSlideProps {
  funilPorCorretor: FunilCorretor[];
  compact?: boolean;
}

export function FunilVendasIndividualSlide({
  funilPorCorretor,
  compact = false,
}: FunilVendasIndividualSlideProps) {
  const top9 = useMemo(
    () => funilPorCorretor.slice(0, TOP_N),
    [funilPorCorretor]
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-[#0f1220] via-[#151b2d] to-[#0f1220] text-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 pt-6 pb-4 px-6 text-center border-b border-white/10">
        <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-[#3478F6] via-[#60a5fa] to-[#3478F6] bg-clip-text text-transparent drop-shadow-lg">
          Funil de Vendas Individual
        </h1>
        <p className="text-[#94a3b8] text-sm md:text-base mt-1">Top {TOP_N} corretores — dados em tempo real do CRM</p>
      </div>

      {/* Grid de cards: top 9 corretores */}
      <div className="flex-1 min-h-0 overflow-auto px-4 md:px-6 py-6">
        <div
          className={`grid gap-4 mx-auto max-w-7xl ${
            compact
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {top9.map((corretor, idx) => {
            const maxLocal = Math.max(...Object.values(corretor.porEtapa), 1);
            const etapasComValor = PIPELINE_STAGES.filter((e) => (corretor.porEtapa[e] ?? 0) > 0);
            const primeirasEtapas = etapasComValor.slice(0, 6);
            const outrasEtapas = etapasComValor.slice(6);
            const totalOutras = outrasEtapas.reduce((a, e) => a + (corretor.porEtapa[e] ?? 0), 0);

            return (
              <div
                key={corretor.id}
                className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-[#3478F6]/40 hover:bg-white/10 transition-all duration-300 flex flex-col"
              >
                {/* Cabeçalho do card: ranking + nome + total */}
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#3478F6]/30 flex items-center justify-center text-sm font-bold text-[#60a5fa] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-white truncate" title={corretor.nome}>
                      {corretor.nome}
                    </span>
                  </span>
                  <span className="text-xl md:text-2xl font-bold text-[#3478F6] tabular-nums shrink-0 ml-2">
                    {corretor.total}
                  </span>
                </div>

                {/* Etapas com barra + número */}
                <div className="space-y-2 flex-1">
                  {primeirasEtapas.map((etapa) => {
                    const qtd = corretor.porEtapa[etapa] ?? 0;
                    const pct = Math.round((qtd / maxLocal) * 100);
                    return (
                      <div key={etapa} className="flex items-center gap-2">
                        <span className="text-xs text-[#cbd5e1] w-24 shrink-0 truncate" title={etapa}>
                          {STAGE_LABELS[etapa] ?? etapa.slice(0, 12)}
                        </span>
                        <div className="flex-1 min-w-0 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#3478F6] to-[#60a5fa] transition-all duration-500"
                            style={{ width: `${Math.max(pct, 10)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-white w-7 text-right tabular-nums shrink-0">
                          {qtd}
                        </span>
                      </div>
                    );
                  })}
                  {totalOutras > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <span className="text-xs text-[#64748b]">+ outras etapas</span>
                      <div className="flex-1 min-w-0 h-1.5 bg-white/5 rounded-full overflow-hidden" />
                      <span className="text-xs font-semibold text-[#94a3b8] tabular-nums shrink-0">
                        {totalOutras}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {top9.length === 0 && (
          <div className="flex items-center justify-center min-h-[200px] text-[#64748b]">
            <p className="text-center">Nenhum corretor com leads no funil no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
