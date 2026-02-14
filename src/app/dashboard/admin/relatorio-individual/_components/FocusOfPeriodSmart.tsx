'use client';

import React from 'react';
import type { FocusPriority } from '../_lib/configTypes';

const SUGESTAO_ACAO: Record<string, string> = {
  topo_funil: 'Aumentar volume: mais ligações/dia e disparos na base.',
  qualificado: 'Ajustar abordagem e critérios: revisar qualificação e follow-up.',
  apresentacao: 'Converter reuniões em visitas: confirmar agenda e reduzir no-show.',
  reuniao_agendada: 'Agendar mais reuniões: priorizar leads quentes e recall.',
  negociacao: 'Fechar oportunidades: proposta e negociação ativa.',
  follow_up: 'Retomar contato com leads parados e pós-venda.',
  troca_leads: 'Reativar e requalificar leads da carteira.',
};

export interface FocusOfPeriodSmartProps {
  focus: FocusPriority[];
}

export default function FocusOfPeriodSmart({ focus }: FocusOfPeriodSmartProps) {
  return (
    <ul className="space-y-4">
      {focus.map((f, i) => {
        const acao = SUGESTAO_ACAO[f.stageId] ?? 'Revisar esta etapa do funil.';
        return (
          <li key={f.stageId} className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/30 text-amber-400 font-bold text-sm flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{f.mensagem}</p>
              <p className="text-sm text-amber-200/90 mt-1">{acao}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
