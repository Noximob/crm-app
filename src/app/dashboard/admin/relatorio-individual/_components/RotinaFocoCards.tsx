'use client';

import React from 'react';
import type { FocusPriority } from '../_lib/configTypes';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

const SUGESTAO_ACAO: Record<string, string> = {
  topo_funil: 'Alimentar volume: mais ligações/dia e disparos na base.',
  qualificado: 'Ajustar abordagem e critérios: revisar qualificação e follow-up.',
  apresentacao: 'Converter reuniões em visitas: confirmar agenda e reduzir no-show.',
  reuniao_agendada: 'Agendar mais reuniões: priorizar leads quentes e recall.',
  negociacao: 'Fechar oportunidades: proposta e negociação ativa.',
  follow_up: 'Retomar contato com leads parados e pós-venda.',
  troca_leads: 'Reativar e requalificar leads da carteira.',
};

export interface RotinaFocoCardsProps {
  tarefasConcluidas: number;
  horasEventos: number;
  interacoes: number;
  valorRealizadoR: number;
  tarefasAtrasadas?: number;
  focus: FocusPriority[];
}

function LightbulbIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3.75 0M14.25 18v3.375c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 7.5 21.375V18m-5.25-3.375c0-.621.504-1.125 1.125-1.125h13.5c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-.908l-1.125 2.25a1.875 1.875 0 0 1-1.676.75H9.984a1.875 1.875 0 0 1-1.676-.75l-1.125-2.25H5.233c-.621 0-1.125-.504-1.125-1.125V14.25m-2.25-3.375c0-.621.504-1.125 1.125-1.125h15.75c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H5.233c-.621 0-1.125-.504-1.125-1.125v-1.5Z" />
    </svg>
  );
}

function ArrowUpIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
  );
}

export interface RotinaCardProps {
  tarefasConcluidas: number;
  horasEventos: number;
  interacoes: number;
  valorRealizadoR: number;
  tarefasAtrasadas?: number;
}

export function RotinaCard({
  tarefasConcluidas,
  horasEventos,
  interacoes,
  valorRealizadoR,
  tarefasAtrasadas = 0,
}: RotinaCardProps) {
  return (
    <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-5">
      <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-0.5 h-5 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-r-full opacity-60" />
        Rotina & Foco
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Missões concluídas</p>
          <p className="text-xl font-bold text-white tabular-nums">{tarefasConcluidas}</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Horas em eventos</p>
          <p className="text-xl font-bold text-white tabular-nums">{horasEventos.toFixed(1)}h</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Interações</p>
          <p className="text-xl font-bold text-white tabular-nums">{interacoes}</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">VGV realizado</p>
          <p className="text-xl font-bold text-[#D4A017] tabular-nums">{formatCurrency(valorRealizadoR)}</p>
        </div>
      </div>
      {tarefasAtrasadas > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-amber-400">Tarefas atrasadas</span>
          <span className="text-lg font-bold text-white tabular-nums">{tarefasAtrasadas}</span>
        </div>
      )}
    </div>
  );
}

export interface FocoCardProps {
  focus: FocusPriority[];
}

export function FocoCard({ focus }: FocoCardProps) {
  return (
    <div className="card-glow rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5 p-5">
      <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-0.5 h-5 bg-amber-500 rounded-r-full opacity-60" />
        Foco do período
      </h2>
      {focus.length === 0 ? (
        <p className="text-sm text-gray-400">Nada crítico. Mantenha o ritmo!</p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">Seus próximos passos (faça nesta ordem):</p>
          <ul className="space-y-4">
            {focus.map((f, i) => {
              const acao = SUGESTAO_ACAO[f.stageId] ?? 'Revisar esta etapa do funil.';
              const pct = f.gapPct != null ? Math.round(f.gapPct * 100) : null;
              return (
                <li key={f.stageId} className="rounded-xl border border-amber-500/20 bg-white/5 p-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#D4A017]/30 text-[#D4A017] flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      {f.mensagem}
                      {pct != null && <span className="text-amber-400 font-normal"> ({pct}%)</span>}
                    </p>
                    <p className="text-xs text-amber-200/90 mt-1.5 flex items-center gap-1.5">
                      {i === 0 ? (
                        <LightbulbIcon className="w-4 h-4 flex-shrink-0 text-amber-400" />
                      ) : (
                        <ArrowUpIcon className="w-4 h-4 flex-shrink-0 text-amber-400" />
                      )}
                      {acao}
                    </p>
                  </div>
                </div>
              </li>
            );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default function RotinaFocoCards(props: RotinaFocoCardsProps) {
  return (
    <>
      <RotinaCard
        tarefasConcluidas={props.tarefasConcluidas}
        horasEventos={props.horasEventos}
        interacoes={props.interacoes}
        valorRealizadoR={props.valorRealizadoR}
        tarefasAtrasadas={props.tarefasAtrasadas}
      />
      <FocoCard focus={props.focus} />
    </>
  );
}
