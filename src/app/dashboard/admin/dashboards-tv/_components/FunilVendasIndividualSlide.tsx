'use client';

import React, { useMemo } from 'react';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import type { FunilCorretor } from './useFunilVendasData';

const TOP_N = 9;

function getNivel(total: number): { label: string; emoji: string; bg: string; text: string } {
  if (total >= 50) return { label: 'Líder', emoji: '🏆', bg: 'bg-amber-500/25 border-amber-400/40', text: 'text-amber-300' };
  if (total >= 25) return { label: 'Elite', emoji: '⭐', bg: 'bg-amber-500/15 border-amber-400/30', text: 'text-amber-200' };
  if (total >= 10) return { label: 'Em alta', emoji: '🔥', bg: 'bg-orange-500/15 border-orange-400/30', text: 'text-orange-300' };
  if (total >= 5) return { label: 'Subindo', emoji: '📈', bg: 'bg-emerald-500/15 border-emerald-400/30', text: 'text-emerald-300' };
  return { label: 'Em jogo', emoji: '🎯', bg: 'bg-[#D4A017]/15 border-[#D4A017]/30', text: 'text-[#93c5fd]' };
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
  const { stages } = usePipelineStages();
  const top9 = useMemo(() => funilPorCorretor.slice(0, TOP_N), [funilPorCorretor]);
  const maxTotal = useMemo(() => Math.max(...top9.map((c) => c.total), 1), [top9]);

  return (
    <div className="h-screen w-full flex flex-col bg-particles text-white overflow-hidden">
      {/* Header compacto — TV: tudo em 1 página */}
      <header className="shrink-0 py-2 px-4 text-center">
        <div className="inline-flex items-center gap-2">
          <TrophyIcon className="w-5 h-5 text-amber-400" />
          <h1 className="text-lg md:text-xl font-bold text-white">Ranking do Funil</h1>
          <TrophyIcon className="w-5 h-5 text-amber-400" />
        </div>
        <p className="text-[#64748b] text-xs mt-0.5">Top {TOP_N} · ao vivo</p>
      </header>

      <div className="flex-1 min-h-0 p-2 overflow-hidden">
        <div className="h-full grid grid-cols-3 grid-rows-3 gap-2">
          {top9.map((corretor, idx) => {
            const porEtapa = corretor.porEtapa;
            const etapasVisiveis = stages.slice(0, 6);
            const maxLocal = Math.max(...etapasVisiveis.map((e) => porEtapa[e] ?? 0), 1);
            const nivel = getNivel(corretor.total);
            const pctDoMax = Math.round((corretor.total / maxTotal) * 100);
            const isFirst = idx === 0;
            const isTop3 = idx < 3;

            return (
              <div
                key={corretor.id}
                className={`relative flex flex-col rounded-xl border transition-all duration-300 overflow-hidden ${
                  isFirst
                    ? 'border-amber-400/50 bg-amber-500/5'
                    : isTop3
                      ? 'border-white/15 bg-white/[0.06]'
                      : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                {isFirst && (
                  <div className="absolute inset-0 rounded-xl bg-amber-400/5 pointer-events-none" />
                )}

                <div className="relative flex flex-col p-2 flex-1 min-h-0 min-w-0">
                  {/* Topo compacto */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 mb-1">
                    <span className="flex-shrink-0">
                      {idx === 0 ? (
                        <span className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-white">
                          <TrophyIcon className="w-3 h-3" />
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-6 h-6 rounded-lg bg-slate-500 flex items-center justify-center text-white">
                          <MedalIcon className="w-3 h-3" />
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-6 h-6 rounded-lg bg-amber-700 flex items-center justify-center text-amber-100">
                          <MedalIcon className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-lg bg-[#D4A017]/30 flex items-center justify-center text-[#93c5fd] font-bold text-[10px] border border-[#D4A017]/50">
                          {idx + 1}
                        </span>
                      )}
                    </span>
                    <span className="flex-1 min-w-0 font-semibold text-white text-xs truncate" title={corretor.nome}>
                      {corretor.nome}
                    </span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${nivel.bg} ${nivel.text}`}>
                      {nivel.emoji} {nivel.label}
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums text-[#60a5fa]">{corretor.total}</span>
                  </div>

                  {idx > 0 && (
                    <div className="flex-shrink-0 mb-1.5">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-full bg-[#D4A017] flex-shrink-0"
                          style={{ width: `${Math.max(pctDoMax, 6)}%`, minWidth: 4 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Etapas: largura fixa do label (cabe "Atendimento Agendado"), barras alinhadas */}
                  <div className="flex-1 min-h-0 flex flex-col justify-center space-y-2">
                    {etapasVisiveis.map((etapa) => {
                      const qtd = porEtapa[etapa] ?? 0;
                      const pct = maxLocal > 0 ? Math.round((qtd / maxLocal) * 100) : 0;
                      const widthPct = qtd > 0 ? Math.max(pct, 20) : 0;
                      return (
                        <div key={etapa} className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-[#94a3b8] font-medium shrink-0 w-[10.5rem] truncate" title={etapa}>{etapa}</span>
                          <div className="flex-1 min-w-0 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#D4A017]"
                              style={{ width: `${widthPct}%`, minWidth: qtd > 0 ? 6 : 0 }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white tabular-nums w-5 text-right shrink-0">{qtd}</span>
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
