'use client';

import React, { useMemo } from 'react';
import type { FunilCorretor } from './useFunilVendasData';

const TOP_N = 9;

// Só 4 etapas: Qualificação, Ligação+Visita juntos, Negociação e Proposta, Interesse Futuro
const ETAPAS_EXIBIR: { key: string; label: string; quente?: boolean; getVal: (p: Record<string, number>) => number }[] = [
  { key: 'qualif', label: 'Qualificação', getVal: (p) => p['Qualificação'] ?? 0 },
  { key: 'visita-lig', label: 'Lig. e visita agend.', getVal: (p) => (p['Ligação agendada'] ?? 0) + (p['Visita agendada'] ?? 0) },
  { key: 'negoc', label: 'Negociação e proposta', quente: true, getVal: (p) => p['Negociação e Proposta'] ?? 0 },
  { key: 'int-futuro', label: 'Interesse futuro', getVal: (p) => p['Interesse Futuro'] ?? 0 },
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

                <div className="relative flex flex-col flex-1 min-h-0 p-4 md:p-5">
                  {/* Topo: posição + nome + nível + score */}
                  <div className="flex items-start gap-3 mb-4 shrink-0">
                    <span className="flex-shrink-0 flex items-center justify-center mt-0.5">
                      {idx === 0 ? (
                        <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-300/50">
                          <TrophyIcon className="w-6 h-6" />
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white shadow-md ring-2 ring-slate-400/40">
                          <MedalIcon className="w-5 h-5" />
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-amber-100 shadow-md ring-2 ring-amber-600/40">
                          <MedalIcon className="w-5 h-5" />
                        </span>
                      ) : (
                        <span className="w-10 h-10 rounded-xl bg-[#3478F6]/25 flex items-center justify-center text-[#93c5fd] font-bold text-lg border-2 border-[#3478F6]/40">
                          {idx + 1}
                        </span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <span className="block font-bold text-white text-base md:text-lg truncate leading-tight" title={corretor.nome}>
                        {corretor.nome}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${nivel.bg} ${nivel.text}`}>
                        <span>{nivel.emoji}</span>
                        <span>{nivel.label}</span>
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="block text-2xl md:text-3xl font-black tabular-nums bg-gradient-to-br from-[#60a5fa] to-[#3478F6] bg-clip-text text-transparent drop-shadow-sm leading-none">
                        {corretor.total}
                      </span>
                      <span className="text-xs text-[#64748b] font-medium">leads</span>
                    </div>
                  </div>

                  {/* Barra vs 1º */}
                  {top9.length > 0 && idx > 0 && (
                    <div className="mb-4 shrink-0">
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#3478F6] to-[#60a5fa] flex-shrink-0 transition-all duration-700"
                          style={{ width: `${Math.max(pctDoMax, 6)}%`, minWidth: 6 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 4 etapas — mais espaço, barras mais grossas */}
                  <div className="flex-1 min-h-0 flex flex-col justify-center gap-3 md:gap-4">
                    {ETAPAS_EXIBIR.map((etapa) => {
                      const qtd = etapa.getVal(porEtapa);
                      const pct = maxLocal > 0 ? Math.round((qtd / maxLocal) * 100) : 0;
                      const widthPct = qtd > 0 ? Math.max(pct, 20) : 0;
                      return (
                        <div key={etapa.key} className="flex items-center gap-3 flex-nowrap">
                          <span className="text-xs md:text-sm text-[#94a3b8] font-medium w-28 md:w-32 shrink-0 truncate">
                            {etapa.label}
                          </span>
                          <div className="flex-1 min-w-0 h-3 md:h-3.5 bg-white/10 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full rounded-full flex-shrink-0 transition-all duration-700 ${
                                etapa.quente
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-sm shadow-amber-400/20'
                                  : 'bg-gradient-to-r from-[#3478F6] to-[#60a5fa]'
                              }`}
                              style={{ width: `${widthPct}%`, minWidth: qtd > 0 ? 8 : 0 }}
                            />
                          </div>
                          <span className="text-sm md:text-base font-bold text-white tabular-nums shrink-0 w-9 md:w-10 text-right">
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
