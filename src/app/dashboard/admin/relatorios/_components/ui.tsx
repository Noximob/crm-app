'use client';

/** Átomos visuais compartilhados pelas abas dos relatórios (padrão GX). */

import React from 'react';
import { delta as calcDelta } from './reportShared';

export const chipBase = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider border';

/** Card de seção GX: al-card + linha neon no topo. */
export function SectionCard({
  title, right, gold, children, className = '',
}: {
  title: string;
  right?: React.ReactNode;
  gold?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`al-card relative overflow-hidden p-4 ${className}`}>
      <div className={`absolute inset-x-0 top-0 ${gold ? 'gx-line-gold' : 'gx-line'}`} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">{title}</h2>
        {right && <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>}
      </div>
      {children}
    </div>
  );
}

/** Variação vs período anterior: ↑/↓ % (esmeralda/vermelho). */
export function DeltaChip({ atual, anterior, invertido }: { atual: number; anterior: number; invertido?: boolean }) {
  const d = calcDelta(atual, anterior);
  if (d === null) {
    return <span className={`${chipBase} bg-white/[0.05] border-white/15 text-text-secondary`}>novo</span>;
  }
  if (Math.round(d) === 0) {
    return <span className={`${chipBase} bg-white/[0.05] border-white/15 text-text-secondary`}>=</span>;
  }
  const subiu = d > 0;
  const bom = invertido ? !subiu : subiu;
  const cls = bom
    ? 'bg-[#34D399]/10 border-[#34D399]/35 text-emerald-300'
    : 'bg-red-500/10 border-red-500/35 text-red-300';
  return (
    <span className={`${chipBase} ${cls} tabular-nums`}>
      {subiu ? '▲' : '▼'} {Math.abs(d) >= 1000 ? '999+' : Math.abs(Math.round(d))}%
    </span>
  );
}

/** KPI grande do Pulso. */
export function KpiBox({
  label, valor, sub, atual, anterior, invertido,
}: {
  label: string;
  valor: string;
  sub?: string;
  atual: number;
  anterior: number;
  invertido?: boolean;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 flex flex-col gap-1 min-w-0">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary leading-tight">{label}</span>
      <span className="al-display text-[26px] font-bold text-white leading-none tabular-nums truncate">{valor}</span>
      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
        <DeltaChip atual={atual} anterior={anterior} invertido={invertido} />
        {sub && <span className="text-[10px] text-text-secondary truncate">{sub}</span>}
      </div>
    </div>
  );
}

/** Barra horizontal com cor por etapa/série. */
export function BarraH({ pct, cor }: { pct: number; cor: string }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2.5 rounded-md bg-white/[0.06] overflow-hidden">
      <div
        className="h-full rounded-md transition-all duration-500"
        style={{ width: `${w}%`, background: cor, boxShadow: `0 0 10px ${cor}55` }}
      />
    </div>
  );
}

/** Estado vazio honesto. */
export function EmptyMsg({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-text-secondary text-center py-4">{children}</p>;
}

/** Medalha 1º/2º/3º do ranking. */
export function Medalha({ pos }: { pos: number }) {
  if (pos > 3) {
    return <span className="w-[22px] text-center al-display text-[11px] font-bold text-text-secondary tabular-nums shrink-0">{pos}º</span>;
  }
  const grad = pos === 1
    ? 'from-[#FFE9A6] to-[#C89210]'
    : pos === 2
      ? 'from-[#E7E9F2] to-[#8E93A6]'
      : 'from-[#F5B98A] to-[#A5602B]';
  return (
    <span className={`w-[22px] h-[22px] rounded-full grid place-items-center al-display text-[10.5px] font-extrabold shrink-0 bg-gradient-to-br ${grad} text-[#141414]`}>
      {pos}
    </span>
  );
}
