'use client';

import React from 'react';
import type { NecessaryByStage, RealizedByStage } from '../_lib/configTypes';
import CircularProgress from './CircularProgress';
import RealizadoVsMetaBar from './RealizadoVsMetaBar';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export interface ComoChegarMetaCardProps {
  metaAno: number;
  necessary: NecessaryByStage[];
  realized: RealizedByStage[];
  valorRealizadoR: number;
  necessarioNoPeriodo: number;
  necessarioMes?: number;
  periodLabel: string;
}

const STAGE_LABELS: Record<string, string> = {
  negociacao: 'Vender unidades (clientes)',
  reuniao_agendada: 'Visitas, reuniões ou ligações',
  apresentacao: 'Conversar com oportunidades finais',
  qualificado: 'Gerar leads qualificados',
  topo_funil: 'Atrair pessoas no topo do funil',
};

export default function ComoChegarMetaCard({
  metaAno,
  necessary,
  realized,
  valorRealizadoR,
  necessarioNoPeriodo,
  necessarioMes,
  periodLabel,
}: ComoChegarMetaCardProps) {
  const realizedById = new Map(realized.map((r) => [r.stageId, r]));
  const progressoPct = necessarioNoPeriodo > 0 ? valorRealizadoR / necessarioNoPeriodo : 0;
  const variant = progressoPct >= 1 ? 'emerald' : progressoPct >= 0.5 ? 'amber' : 'red';

  return (
    <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-5">
      <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-0.5 h-5 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-r-full opacity-60" />
        Como chegar na meta do ano
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">✓</span>
            Fazer {formatCurrency(metaAno)} (VGV)
          </div>
          {[...necessary].reverse().map((n) => {
            const real = realizedById.get(n.stageId)?.valor ?? 0;
            const label = STAGE_LABELS[n.stageId] ?? n.stageNome;
            return (
              <div key={n.stageId} className="flex items-center gap-2 text-sm text-gray-400">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-gray-500 text-xs">{real >= n.valor ? '✓' : '—'}</span>
                {label} · <span className="text-white tabular-nums">{real}</span> / {n.valor}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-start">
          <div className="flex flex-wrap gap-6 w-full justify-around lg:justify-between mb-4">
            {necessarioMes != null && (
              <CircularProgress
                label="Necessário mês"
                value={formatCurrency(necessarioMes)}
                progress={valorRealizadoR / (necessarioMes || 1)}
                variant={variant}
                size="sm"
              />
            )}
            <CircularProgress
              label={`Necessário ${periodLabel.toLowerCase()}`}
              value={formatCurrency(necessarioNoPeriodo)}
              progress={progressoPct}
              variant={variant}
              size="sm"
            />
            <CircularProgress
              label="Realizado período"
              value={formatCurrency(valorRealizadoR)}
              progress={progressoPct}
              variant={variant}
              size="sm"
            />
          </div>
          <div className="w-full">
            <RealizadoVsMetaBar
              label="VGV no recorte"
              realizado={valorRealizadoR}
              necessario={necessarioNoPeriodo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
