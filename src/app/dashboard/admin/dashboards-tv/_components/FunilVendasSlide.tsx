'use client';

import React, { useMemo } from 'react';
import { PIPELINE_STAGES } from '@/lib/constants';
import type { FunilPorEtapa, FunilCorretor } from './useFunilVendasData';

// Labels curtos para caber na TV
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

interface FunilVendasSlideProps {
  funilCorporativo: FunilPorEtapa;
  funilPorCorretor: FunilCorretor[];
  totalCorporativo: number;
  compact?: boolean;
  /** Se true, mostra só o funil corporativo (sem seção "Por corretor") */
  somenteCorporativo?: boolean;
}

export function FunilVendasSlide({
  funilCorporativo,
  funilPorCorretor,
  totalCorporativo,
  compact = false,
  somenteCorporativo = true,
}: FunilVendasSlideProps) {
  const maxCorporativo = useMemo(
    () => Math.max(...Object.values(funilCorporativo), 1),
    [funilCorporativo]
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-[#0f1220] via-[#151b2d] to-[#0f1220] text-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 pt-6 pb-4 px-6 text-center border-b border-white/10">
        <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-[#D4A017] via-[#60a5fa] to-[#D4A017] bg-clip-text text-transparent drop-shadow-lg">
          Funil de Vendas
        </h1>
        <p className="text-[#94a3b8] text-sm md:text-base mt-1">Dados em tempo real do CRM</p>
      </div>

      {/* Total corporativo em destaque */}
      <div className="shrink-0 px-6 py-4 flex justify-center">
        <div className="inline-flex items-baseline gap-3 px-6 py-3 rounded-2xl bg-[#D4A017]/20 border border-[#D4A017]/40 shadow-[0_0_30px_-5px_rgba(52,120,246,0.3)]">
          <span className="text-[#94a3b8] text-lg md:text-xl font-medium">Total no funil</span>
          <span className="text-4xl md:text-6xl font-black tabular-nums text-white drop-shadow-md">
            {totalCorporativo}
          </span>
          <span className="text-[#94a3b8] text-lg">leads</span>
        </div>
      </div>

      {/* Funil corporativo por etapa */}
      <div className="shrink-0 px-4 md:px-8 pb-4">
        <h2 className="text-sm md:text-lg font-semibold text-[#94a3b8] mb-3 px-2">Corporativo</h2>
        <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-1'} md:grid-cols-2 lg:grid-cols-3`}>
          {PIPELINE_STAGES.map((etapa) => {
            const qtd = funilCorporativo[etapa] ?? 0;
            const pct = maxCorporativo ? Math.round((qtd / maxCorporativo) * 100) : 0;
            const label = STAGE_LABELS[etapa] ?? etapa;
            const isQuente = ['Negociação e Proposta', 'Contrato e fechamento', 'Pós Venda e Fidelização'].includes(etapa);
            return (
              <div
                key={etapa}
                className="group flex flex-col rounded-xl bg-white/5 border border-white/10 p-3 hover:border-[#D4A017]/40 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs md:text-sm font-medium text-[#cbd5e1] truncate pr-2" title={etapa}>
                    {label}
                  </span>
                  <span
                    className={`text-lg md:text-xl font-bold tabular-nums shrink-0 ${
                      isQuente ? 'text-amber-400' : 'text-[#D4A017]'
                    }`}
                  >
                    {qtd}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#D4A017] to-[#60a5fa] transition-all duration-500"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!somenteCorporativo && funilPorCorretor.length > 0 && (
        <div className="flex-1 min-h-0 overflow-auto px-4 md:px-8 pb-8">
          <h2 className="text-sm md:text-lg font-semibold text-[#94a3b8] mb-3 px-2 sticky top-0 bg-gradient-to-b from-[#151b2d] to-transparent pt-2 pb-2">
            Por corretor
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {funilPorCorretor.map((corretor, idx) => {
              const maxLocal = Math.max(...Object.values(corretor.porEtapa), 1);
              return (
                <div
                  key={corretor.id}
                  className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-[#D4A017]/30 hover:shadow-lg hover:shadow-[#D4A017]/10 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#D4A017]/30 flex items-center justify-center text-sm font-bold text-[#60a5fa]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white truncate" title={corretor.nome}>
                        {corretor.nome}
                      </span>
                    </span>
                    <span className="text-xl font-bold text-[#D4A017] tabular-nums">{corretor.total}</span>
                  </div>
                  <div className="space-y-1.5">
                    {PIPELINE_STAGES.slice(0, 6).map((etapa) => {
                      const qtd = corretor.porEtapa[etapa] ?? 0;
                      if (qtd === 0) return null;
                      const pct = Math.round((qtd / maxLocal) * 100);
                      return (
                        <div key={etapa} className="flex items-center gap-2">
                          <span className="text-xs text-[#94a3b8] w-20 truncate" title={etapa}>
                            {STAGE_LABELS[etapa] ?? etapa.slice(0, 10)}
                          </span>
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#D4A017]/80"
                              style={{ width: `${Math.max(pct, 8)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-white w-6 text-right tabular-nums">{qtd}</span>
                        </div>
                      );
                    })}
                    {PIPELINE_STAGES.slice(6).some((e) => (corretor.porEtapa[e] ?? 0) > 0) && (
                      <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                        <span className="text-xs text-[#64748b]">+ outras etapas</span>
                        <span className="text-xs font-semibold text-[#94a3b8] tabular-nums">
                          {PIPELINE_STAGES.slice(6).reduce((a, e) => a + (corretor.porEtapa[e] ?? 0), 0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalCorporativo === 0 && (somenteCorporativo || funilPorCorretor.length === 0) && (
        <div className="flex-1 flex items-center justify-center text-[#64748b] px-4">
          <p className="text-center">Nenhum lead no funil no momento.</p>
        </div>
      )}
    </div>
  );
}
