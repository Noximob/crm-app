'use client';

import React, { useMemo } from 'react';
import { PIPELINE_STAGES } from '@/lib/constants';
import type { FunilCorretor } from './useFunilVendasData';

// Labels bem curtos para caber em TV 70"
const STAGE_LABELS: Record<string, string> = {
  'Pré Qualificação': 'Pré Q.',
  'Qualificação': 'Qualif.',
  'Apresentação do imóvel': 'Apres.',
  'Ligação agendada': 'Lig.',
  'Visita agendada': 'Visita',
  'Negociação e Proposta': 'Negoc.',
  'Contrato e fechamento': 'Contrato',
  'Pós Venda e Fidelização': 'Pós Venda',
  'Interesse Futuro': 'Int. Futuro',
  'Carteira': 'Carteira',
  'Geladeira': 'Geladeira',
};

const TOP_N = 9;
const ETAPAS_POR_CARD = 5;

// Nível gamificado pelo total de leads
function getNivel(total: number): { label: string; emoji: string; className: string } {
  if (total >= 50) return { label: 'Líder', emoji: '🏆', className: 'text-amber-400' };
  if (total >= 25) return { label: 'Elite', emoji: '⭐', className: 'text-amber-300' };
  if (total >= 10) return { label: 'Em alta', emoji: '🔥', className: 'text-orange-400' };
  if (total >= 5) return { label: 'Subindo', emoji: '📈', className: 'text-emerald-400' };
  return { label: 'Em jogo', emoji: '🎯', className: 'text-[#60a5fa]' };
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
  const top9 = useMemo(
    () => funilPorCorretor.slice(0, TOP_N),
    [funilPorCorretor]
  );
  const maxTotal = useMemo(() => Math.max(...top9.map((c) => c.total), 1), [top9]);

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-b from-[#0a0e1a] via-[#0f1525] to-[#0a0e1a] text-white overflow-hidden">
      {/* Header com vibe de leaderboard */}
      <header className="shrink-0 py-3 px-6 text-center border-b border-white/10 bg-gradient-to-r from-transparent via-[#3478F6]/15 to-transparent">
        <div className="inline-flex items-center gap-2 mb-1">
          <TrophyIcon className="w-6 h-6 md:w-7 md:h-7 text-amber-400 drop-shadow-md" />
          <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-[#60a5fa] via-white to-[#60a5fa] bg-clip-text text-transparent drop-shadow-md">
            Ranking do Funil
          </h1>
          <TrophyIcon className="w-6 h-6 md:w-7 md:h-7 text-amber-400 drop-shadow-md" />
        </div>
        <p className="text-[#64748b] text-xs md:text-sm">Top {TOP_N} · ao vivo</p>
      </header>

      <div className="flex-1 min-h-0 p-3 md:p-4">
        <div className="h-full grid grid-cols-3 grid-rows-3 gap-2 md:gap-3">
          {top9.map((corretor, idx) => {
            const maxLocal = Math.max(...Object.values(corretor.porEtapa), 1);
            const etapasComValor = PIPELINE_STAGES.filter((e) => (corretor.porEtapa[e] ?? 0) > 0);
            const etapasExibir = etapasComValor.slice(0, ETAPAS_POR_CARD);
            const nivel = getNivel(corretor.total);
            const pctDoMax = Math.round((corretor.total / maxTotal) * 100);
            const isFirst = idx === 0;

            return (
              <div
                key={corretor.id}
                className={`group relative flex flex-col rounded-xl overflow-hidden border backdrop-blur-sm transition-all duration-300 ${
                  isFirst
                    ? 'border-amber-400/40 bg-amber-500/5 shadow-[0_0_20px_-4px_rgba(251,191,36,0.2)]'
                    : 'border-white/10 bg-white/[0.06] hover:border-[#3478F6]/50 hover:bg-white/[0.08] hover:shadow-[0_0_24px_-4px_rgba(52,120,246,0.25)]'
                }`}
              >
                {isFirst && (
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
                    <div className="absolute -top-2 -right-2 w-20 h-20 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
                  </div>
                )}

                <div className="relative flex flex-col flex-1 min-h-0 p-2.5 md:p-3">
                  {/* Linha 1: posição (medalha/ícone) + nome + score */}
                  <div className="flex items-center gap-2 mb-1.5 shrink-0">
                    <span className="flex-shrink-0 flex items-center justify-center">
                      {idx === 0 ? (
                        <span className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg ring-2 ring-amber-300/50">
                          <TrophyIcon className="w-4 h-4 md:w-5 md:h-5" />
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white shadow-md ring-2 ring-slate-400/40">
                          <MedalIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-amber-100 shadow-md ring-2 ring-amber-500/40">
                          <MedalIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </span>
                      ) : (
                        <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#3478F6]/30 flex items-center justify-center text-[#93c5fd] font-bold text-xs md:text-sm border border-[#3478F6]/40">
                          {idx + 1}
                        </span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="block font-semibold text-white text-sm md:text-base truncate" title={corretor.nome}>
                        {corretor.nome}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] md:text-xs font-medium ${nivel.className}`}>
                        <span>{nivel.emoji}</span>
                        <span>{nivel.label}</span>
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="block text-lg md:text-xl font-black tabular-nums text-[#60a5fa] drop-shadow-sm">
                        {corretor.total}
                      </span>
                      <span className="text-[10px] text-[#64748b]">leads</span>
                    </div>
                  </div>

                  {/* Barra de “progresso” em relação ao 1º (gamificação) */}
                  {top9.length > 0 && idx > 0 && (
                    <div className="mb-1.5 shrink-0">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#3478F6] to-[#60a5fa] transition-all duration-500"
                          style={{ width: `${Math.max(pctDoMax, 5)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Etapas do funil */}
                  <div className="flex-1 min-h-0 flex flex-col justify-center gap-1 md:gap-1.5">
                    {etapasExibir.length === 0 ? (
                      <p className="text-[#64748b] text-xs">—</p>
                    ) : (
                      etapasExibir.map((etapa) => {
                        const qtd = corretor.porEtapa[etapa] ?? 0;
                        const pct = Math.round((qtd / maxLocal) * 100);
                        const isQuente = ['Negociação e Proposta', 'Contrato e fechamento', 'Pós Venda e Fidelização'].includes(etapa);
                        return (
                          <div key={etapa} className="flex items-center gap-1.5">
                            <span className="text-[10px] md:text-xs text-[#94a3b8] w-14 md:w-16 shrink-0 truncate" title={etapa}>
                              {STAGE_LABELS[etapa] ?? etapa.slice(0, 8)}
                            </span>
                            <div className="flex-1 min-w-0 h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isQuente ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-[#3478F6] to-[#60a5fa]'
                                }`}
                                style={{ width: `${Math.max(pct, 12)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-white w-5 md:w-6 text-right tabular-nums shrink-0">
                              {qtd}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {top9.length === 0 && (
          <div className="h-full flex items-center justify-center text-[#64748b]">
            <p className="text-sm">Nenhum corretor com leads no funil.</p>
          </div>
        )}
      </div>
    </div>
  );
}
