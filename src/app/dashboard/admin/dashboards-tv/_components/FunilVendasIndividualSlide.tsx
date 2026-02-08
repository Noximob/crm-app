'use client';

import React, { useMemo } from 'react';
import type { FunilCorretor } from './useFunilVendasData';

const TOP_N = 9;

// Só 4 etapas — labels curtos para não truncar na TV
const ETAPAS_EXIBIR: { key: string; label: string; quente?: boolean; getVal: (p: Record<string, number>) => number }[] = [
  { key: 'qualif', label: 'Qualif.', getVal: (p) => p['Qualificação'] ?? 0 },
  { key: 'visita-lig', label: 'Lig. e visita', getVal: (p) => (p['Ligação agendada'] ?? 0) + (p['Visita agendada'] ?? 0) },
  { key: 'negoc', label: 'Negoc. e prop.', quente: true, getVal: (p) => p['Negociação e Proposta'] ?? 0 },
  { key: 'int-futuro', label: 'Int. futuro', getVal: (p) => p['Interesse Futuro'] ?? 0 },
];

function getNivel(total: number): { label: string; emoji: string; bg: string; text: string } {
  if (total >= 50) return { label: 'Líder', emoji: '🏆', bg: 'bg-amber-500/25 border-amber-400/40', text: 'text-amber-300' };
  if (total >= 25) return { label: 'Elite', emoji: '⭐', bg: 'bg-amber-500/15 border-amber-400/30', text: 'text-amber-200' };
  if (total >= 10) return { label: 'Em alta', emoji: '🔥', bg: 'bg-orange-500/15 border-orange-400/30', text: 'text-orange-300' };
  if (total >= 5) return { label: 'Subindo', emoji: '📈', bg: 'bg-emerald-500/15 border-emerald-400/30', text: 'text-emerald-300' };
  return { label: 'Em jogo', emoji: '🎯', bg: 'bg-[#3478F6]/15 border-[#3478F6]/30', text: 'text-[#93c5fd]' };
}

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2a1 1 0 0 1 1 1v1h2a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4h-1v2a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-2H4a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h2V3a1 1 0 0 1 1-1h2zm-2 6H6v2a2 2 0 0 0 2 2h2V8h-2zm8 0h-2v4h2a2 2 0 0 0 2-2V8zm-6 6v4h2v-4H12zm2 2h2v2h-2v-2z" />
  </svg>
);
const MedalIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7L12 17.3l-4.3 3.7 2.3-7-6-4.6h7.6L12 2z" />
  </svg>
);

interface FunilVendasIndividualSlideProps {
  funilPorCorretor: FunilCorretor[];
  compact?: boolean;
}

export function FunilVendasIndividualSlide({
  funilPorCorretor,
  compact = false,
}: FunilVendasIndividualSlideProps) {
  const top9 = useMemo(() => funilPorCorretor.slice(0, TOP_N), [funilPorCorretor]);
  const maxTotal = useMemo(() => Math.max(...top9.map((c) => c.total), 1), [top9]);

  return (
    <div className="h-screen w-full flex flex-col bg-[#080b12] text-white overflow-hidden">
      {/* Header elegante */}
      <header className="shrink-0 py-4 px-6 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#3478F6]/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative inline-flex items-center justify-center gap-3">
          <span className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-400/30">
            <TrophyIcon className="w-5 h-5 text-amber-400" />
          </span>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-[#e2e8f0] to-white bg-clip-text text-transparent drop-shadow-lg">
            Ranking do Funil
          </h1>
          <span className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-400/30">
            <TrophyIcon className="w-5 h-5 text-amber-400" />
          </span>
        </div>
        <p className="relative text-[#64748b] text-sm mt-1.5 font-medium">Top {TOP_N} · ao vivo</p>
      </header>

      <div className="flex-1 min-h-0 p-4 md:p-6">
        <div className="h-full grid grid-cols-3 grid-rows-3 gap-4 md:gap-5">
          {top9.map((corretor, idx) => {
            const porEtapa = corretor.porEtapa;
            const valores = ETAPAS_EXIBIR.map((e) => e.getVal(porEtapa));
            const maxLocal = Math.max(...valores, 1);
            const nivel = getNivel(corretor.total);
            const pctDoMax = Math.round((corretor.total / maxTotal) * 100);
            const isFirst = idx === 0;
            const isTop3 = idx < 3;

            return (
              <div
                key={corretor.id}
                className={`relative flex flex-col rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                  isFirst
                    ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/10 to-transparent shadow-[0_0_40px_-8px_rgba(251,191,36,0.25)] scale-[1.02]'
                    : isTop3
                      ? 'border-white/15 bg-white/[0.07] hover:border-white/25 hover:shadow-lg'
                      : 'border-white/10 bg-white/[0.04] hover:border-[#3478F6]/30 hover:bg-white/[0.06]'
                }`}
              >
                {isFirst && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
                  </>
                )}

                <div className="relative flex flex-col flex-1 min-h-0 p-3 md:p-4 overflow-visible">
                  {/* Topo: 2 linhas bem separadas para não sobrepor as etapas */}
                  <div className="shrink-0 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0">
                        {idx === 0 ? (
                          <span className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg ring-2 ring-amber-300/50">
                            <TrophyIcon className="w-5 h-5" />
                          </span>
                        ) : idx === 1 ? (
                          <span className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white shadow-md ring-2 ring-slate-400/40">
                            <MedalIcon className="w-4 h-4" />
                          </span>
                        ) : idx === 2 ? (
                          <span className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-amber-100 shadow-md ring-2 ring-amber-600/40">
                            <MedalIcon className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#3478F6]/25 flex items-center justify-center text-[#93c5fd] font-bold text-sm border-2 border-[#3478F6]/40">
                            {idx + 1}
                          </span>
                        )}
                      </span>
                      <span className="flex-1 min-w-0 font-bold text-white text-sm md:text-base truncate" title={corretor.nome}>
                        {corretor.nome}
                      </span>
                      <span className="flex-shrink-0 text-right">
                        <span className="block text-xl md:text-2xl font-black tabular-nums bg-gradient-to-br from-[#60a5fa] to-[#3478F6] bg-clip-text text-transparent leading-none">
                          {corretor.total}
                        </span>
                        <span className="text-[10px] text-[#64748b]">leads</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold border ${nivel.bg} ${nivel.text}`}>
                        {nivel.emoji} {nivel.label}
                      </span>
                    </div>
                  </div>

                  {/* Barra vs 1º */}
                  {top9.length > 0 && idx > 0 && (
                    <div className="mb-2 shrink-0">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#3478F6] to-[#60a5fa] flex-shrink-0 transition-all duration-700"
                          style={{ width: `${Math.max(pctDoMax, 6)}%`, minWidth: 6 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 4 etapas — altura mínima para as 4 sempre visíveis, sem overlap */}
                  <div className="flex-1 min-h-[7.5rem] flex flex-col justify-start gap-2">
                    {ETAPAS_EXIBIR.map((etapa) => {
                      const qtd = etapa.getVal(porEtapa);
                      const pct = maxLocal > 0 ? Math.round((qtd / maxLocal) * 100) : 0;
                      const widthPct = qtd > 0 ? Math.max(pct, 20) : 0;
                      return (
                        <div key={etapa.key} className="flex items-center gap-2 flex-nowrap min-h-[1.5rem]">
                          <span className="text-xs text-[#94a3b8] font-medium shrink-0 min-w-[4.5rem]">
                            {etapa.label}
                          </span>
                          <div className="flex-1 min-w-0 h-2.5 bg-white/10 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full rounded-full flex-shrink-0 transition-all duration-700 ${
                                etapa.quente
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                  : 'bg-gradient-to-r from-[#3478F6] to-[#60a5fa]'
                              }`}
                              style={{ width: `${widthPct}%`, minWidth: qtd > 0 ? 8 : 0 }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white tabular-nums shrink-0 w-6 text-right">
                            {qtd}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {top9.length === 0 && (
          <div className="h-full flex items-center justify-center text-[#64748b]">
            <p className="text-base font-medium">Nenhum corretor com leads no funil.</p>
          </div>
        )}
      </div>
    </div>
  );
}
