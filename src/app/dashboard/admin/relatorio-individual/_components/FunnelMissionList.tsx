'use client';

import React from 'react';
import type { NecessaryByStage, RealizedByStage } from '../_lib/configTypes';
import RealizadoVsMetaBar from './RealizadoVsMetaBar';

const STAGE_LABELS: Record<string, string> = {
  negociacao: 'Unidades a vender',
  reuniao_agendada: 'Reuniões e visitas',
  apresentacao: 'Apresentações do imóvel',
  qualificado: 'Leads qualificados',
  topo_funil: 'Topo do funil',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export interface FunnelMissionListProps {
  metaAno: number;
  necessary: NecessaryByStage[];
  realized: RealizedByStage[];
  weeksInPeriod: number;
}

export default function FunnelMissionList({
  metaAno,
  necessary,
  realized,
  weeksInPeriod,
}: FunnelMissionListProps) {
  const realizedById = new Map(realized.map((r) => [r.stageId, r]));
  const rev = [...necessary].reverse();

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Para bater a meta do ano, você precisa de <strong className="text-[#D4A017]">{formatCurrency(metaAno)}</strong> em VGV. Abaixo: quanto é <strong className="text-white">necessário</strong> em cada etapa do funil (período) vs o que você <strong className="text-white">realizou</strong>. Barras verdes = no alvo.
      </p>
      <div className="rounded-xl border border-[#D4A017]/20 bg-[#D4A017]/5 p-4 mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Meta do ano</p>
        <p className="text-2xl font-bold text-[#D4A017] tabular-nums">{formatCurrency(metaAno)}</p>
      </div>
      <div className="space-y-4">
        {rev.map((n, idx) => {
          const real = realizedById.get(n.stageId)?.valor ?? 0;
          const nec = n.valor;
          const faltam = nec > 0 && real < nec ? Math.ceil(nec - real) : 0;
          const alvoSemana = weeksInPeriod > 0 && faltam > 0 ? Math.ceil(faltam / weeksInPeriod) : null;
          const label = STAGE_LABELS[n.stageId] ?? n.stageNome;
          return (
            <div key={n.stageId} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <RealizadoVsMetaBar
                label={label}
                realizado={real}
                necessario={nec}
              />
              {alvoSemana != null && faltam > 0 && (
                <p className="text-xs text-amber-400 mt-2">
                  Para fechar o período: faltam <strong>{faltam}</strong> — tente <strong>{alvoSemana}</strong> por semana.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
