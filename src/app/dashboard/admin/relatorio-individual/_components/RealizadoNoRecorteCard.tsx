'use client';

import React from 'react';
import type { NecessaryByStage, RealizedByStage } from '../_lib/configTypes';
import RealizadoVsMetaBar from './RealizadoVsMetaBar';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export interface RealizadoNoRecorteCardProps {
  valorRealizadoR: number;
  necessary: NecessaryByStage[];
  realized: RealizedByStage[];
  weeksInPeriod: number;
  periodLabel: string;
}

const STAGE_LABELS: Record<string, string> = {
  negociacao: 'Vender unidades (clientes)',
  reuniao_agendada: 'Visitas, reuniões ou ligações',
  apresentacao: 'Conversar com oportunidades finais',
  qualificado: 'Gerar leads qualificados',
  topo_funil: 'Atrair pessoas no topo do funil',
};

export default function RealizadoNoRecorteCard({
  valorRealizadoR,
  necessary,
  realized,
  weeksInPeriod,
  periodLabel,
}: RealizadoNoRecorteCardProps) {
  const realizedById = new Map(realized.map((r) => [r.stageId, r]));
  const rev = [...necessary].reverse();

  return (
    <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-5">
      <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-0.5 h-5 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-r-full opacity-60" />
        Realizado no recorte
      </h2>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{periodLabel}</p>

      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">✓</span>
          <span className="text-white font-semibold tabular-nums">{formatCurrency(valorRealizadoR)}</span>
          <span className="text-gray-400">(VGV)</span>
        </div>
      </div>

      <div className="space-y-4">
        {rev.map((n) => {
          const real = realizedById.get(n.stageId)?.valor ?? 0;
          const nec = n.valor;
          const faltam = nec > 0 && real < nec ? Math.ceil(nec - real) : 0;
          const alvoSemana = weeksInPeriod > 0 && faltam > 0 ? Math.ceil(faltam / weeksInPeriod) : null;
          const pct = nec > 0 ? (real / nec) * 100 : 0;
          const isCritico = pct < 50;
          const label = STAGE_LABELS[n.stageId] ?? n.stageNome;

          return (
            <div
              key={n.stageId}
              className={`rounded-xl border p-3 transition-colors ${
                isCritico ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-medium text-white truncate">{label}</span>
                {isCritico && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-400 text-xs font-bold uppercase">
                    Crítico
                  </span>
                )}
              </div>
              <RealizadoVsMetaBar label="" realizado={real} necessario={nec} />
              {faltam > 0 && (
                <p className="text-xs text-amber-400 mt-2">
                  Faltam <strong className="text-white">{faltam}</strong>
                  {alvoSemana != null && (
                    <> — alvo: <strong>{alvoSemana}</strong>/sem</>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
