'use client';

import React from 'react';
import type { NecessaryByStage, RealizedByStage } from '../_lib/configTypes';

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

function getStatus(pct: number | null): 'ok' | 'atencao' | 'critico' {
  if (pct == null) return 'ok';
  if (pct >= 1) return 'ok';
  if (pct >= 0.5) return 'atencao';
  return 'critico';
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
  const rows: { label: string; necessario: number; valorR?: number; stageId?: string }[] = [];
  rows.push({ label: 'Valor que quero fazer no ano', necessario: 0, valorR: metaAno });
  rows.push({ label: 'VGV necessário', necessario: 0, valorR: metaAno });
  const rev = [...necessary].reverse();
  rev.forEach((n) => {
    rows.push({
      label: STAGE_LABELS[n.stageId] ?? n.stageNome,
      necessario: n.valor,
      valorR: n.valorR,
      stageId: n.stageId,
    });
  });

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => {
        const real = row.stageId ? (realizedById.get(row.stageId)?.valor ?? 0) : undefined;
        const nec = row.necessario;
        const isMetaOrVgv = idx <= 1;
        const pct = !isMetaOrVgv && nec > 0 && real != null ? real / nec : null;
        const status = getStatus(pct);
        const gap = !isMetaOrVgv && real != null ? real - nec : null;
        const faltam = gap != null && gap < 0 ? Math.abs(gap) : 0;
        const alvoSemana = weeksInPeriod > 0 && faltam > 0 ? Math.ceil(faltam / weeksInPeriod) : null;

        return (
          <div
            key={row.label + idx}
            className="rounded-xl border border-white/10 bg-white/5 dark:bg-[#181C23]/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-500 w-6">{idx + 1}.</span>
                <span className="font-semibold text-white">{row.label}</span>
                {!isMetaOrVgv && status !== 'ok' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    status === 'critico' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {status === 'critico' ? 'Crítico' : 'Atenção'}
                  </span>
                )}
                {!isMetaOrVgv && status === 'ok' && real != null && nec > 0 && real >= nec && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-500/20 text-emerald-400">OK</span>
                )}
              </div>
              {!isMetaOrVgv && alvoSemana != null && faltam > 0 && (
                <p className="text-xs text-gray-400 mt-1 ml-8">
                  Faltam {Math.round(faltam)} — meta: {alvoSemana}/semana
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase">Necessário</p>
                <p className="text-sm font-bold text-[#D4A017] tabular-nums">
                  {row.valorR != null ? formatCurrency(row.valorR) : row.necessario.toFixed(0)}
                </p>
              </div>
              {real != null && (
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase">Realizado</p>
                  <p className="text-sm font-bold text-white tabular-nums">{real}</p>
                </div>
              )}
              {!isMetaOrVgv && pct != null && (
                <div className="w-20 flex flex-col items-end">
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all min-w-[4px]"
                      style={{
                        width: `${Math.min(100, pct * 100)}%`,
                        backgroundColor: status === 'ok' ? '#22c55e' : status === 'atencao' ? '#eab308' : '#ef4444',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">{(pct * 100).toFixed(0)}%</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
