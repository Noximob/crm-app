'use client';

import React from 'react';
import type { MetaTrimestral, MetaMensal, CorretorContribuicao } from './useMetasResultadosData';

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function fmtDate(s: string | undefined) {
  if (!s) return '–';
  try {
    return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

interface MetasResultadosSlideProps {
  metaTrimestral: MetaTrimestral;
  metaMensal: MetaMensal | null;
  contribuicoesPorCorretor: CorretorContribuicao[];
}

export function MetasResultadosSlide({
  metaTrimestral,
  metaMensal,
  contribuicoesPorCorretor,
}: MetasResultadosSlideProps) {
  const faltaTrim = Math.max(0, metaTrimestral.valor - metaTrimestral.alcancado);
  const faltaMensal = metaMensal ? Math.max(0, metaMensal.valor - metaMensal.alcancado) : 0;
  const temMeta = metaTrimestral.valor > 0 || (metaMensal?.valor ?? 0) > 0;

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-b from-[#0a0e1a] via-[#0f1525] to-[#0a0e1a] text-white overflow-hidden">
      <header className="shrink-0 py-4 px-6 text-center border-b border-white/10">
        <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-amber-400 via-white to-amber-400 bg-clip-text text-transparent">
          Metas & Resultados
        </h1>
        <p className="text-[#94a3b8] text-sm mt-1">Trimestral e mensal · ao vivo</p>
      </header>

      <div className="flex-1 min-h-0 p-4 md:p-6 overflow-hidden">
        {!temMeta ? (
          <div className="h-full flex items-center justify-center text-[#64748b]">
            <p className="text-center">Configure as metas em Admin → Metas.</p>
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Meta trimestral */}
            <div className="lg:col-span-4 flex flex-col rounded-2xl border-2 border-[#3478F6]/40 bg-white/[0.06] p-5 overflow-hidden">
              <h2 className="text-lg font-bold text-[#94a3b8] mb-1">Meta trimestral</h2>
              {(metaTrimestral.inicio || metaTrimestral.fim) && (
                <p className="text-xs text-[#64748b] mb-3">{fmtDate(metaTrimestral.inicio)} a {fmtDate(metaTrimestral.fim)}</p>
              )}
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-[#94a3b8]">Meta</span>
                <span className="text-xl font-black text-white">{fmt(metaTrimestral.valor)}</span>
              </div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-[#94a3b8]">Realizado</span>
                <span className={`text-xl font-bold ${metaTrimestral.percentual >= 100 ? 'text-[#3AC17C]' : 'text-[#60a5fa]'}`}>
                  {fmt(metaTrimestral.alcancado)}
                </span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col justify-end">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#94a3b8]">Progresso</span>
                  <span className={`font-bold tabular-nums ${metaTrimestral.percentual >= 100 ? 'text-[#3AC17C]' : 'text-[#3478F6]'}`}>
                    {Math.min(metaTrimestral.percentual, 100)}%
                  </span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${metaTrimestral.percentual >= 100 ? 'bg-[#3AC17C]' : 'bg-gradient-to-r from-[#3478F6] to-[#60a5fa]'}`}
                    style={{ width: `${Math.min(metaTrimestral.percentual, 100)}%` }}
                  />
                </div>
                {metaTrimestral.valor > 0 && faltaTrim > 0 && (
                  <div className="rounded-xl bg-amber-500/15 border border-amber-400/30 px-3 py-2">
                    <p className="text-xs text-amber-200/90">Faltam</p>
                    <p className="text-lg font-bold text-amber-300">{fmt(faltaTrim)}</p>
                  </div>
                )}
                {metaTrimestral.percentual >= 100 && (
                  <div className="rounded-xl bg-[#3AC17C]/20 border border-[#3AC17C]/40 px-3 py-2">
                    <p className="text-sm font-bold text-[#3AC17C]">Meta batida!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Meta mensal */}
            {metaMensal && (
              <div className="lg:col-span-4 flex flex-col rounded-2xl border-2 border-amber-400/40 bg-white/[0.06] p-5 overflow-hidden">
                <h2 className="text-lg font-bold text-[#94a3b8] mb-1">Meta mensal</h2>
                <p className="text-xs text-[#64748b] mb-3">{fmtDate(metaMensal.inicio)} a {fmtDate(metaMensal.fim)}</p>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm text-[#94a3b8]">Meta</span>
                  <span className="text-xl font-black text-white">{fmt(metaMensal.valor)}</span>
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm text-[#94a3b8]">Realizado</span>
                  <span className={`text-xl font-bold ${metaMensal.percentual >= 100 ? 'text-[#3AC17C]' : 'text-amber-400'}`}>
                    {fmt(metaMensal.alcancado)}
                  </span>
                </div>
                <div className="flex-1 min-h-0 flex flex-col justify-end">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#94a3b8]">Progresso</span>
                    <span className={`font-bold tabular-nums ${metaMensal.percentual >= 100 ? 'text-[#3AC17C]' : 'text-amber-400'}`}>
                      {Math.min(metaMensal.percentual, 100)}%
                    </span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${metaMensal.percentual >= 100 ? 'bg-[#3AC17C]' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`}
                      style={{ width: `${Math.min(metaMensal.percentual, 100)}%` }}
                    />
                  </div>
                  {faltaMensal > 0 && (
                    <div className="rounded-xl bg-amber-500/15 border border-amber-400/30 px-3 py-2">
                      <p className="text-xs text-amber-200/90">Faltam</p>
                      <p className="text-lg font-bold text-amber-300">{fmt(faltaMensal)}</p>
                    </div>
                  )}
                  {metaMensal.percentual >= 100 && (
                    <div className="rounded-xl bg-[#3AC17C]/20 border border-[#3AC17C]/40 px-3 py-2">
                      <p className="text-sm font-bold text-[#3AC17C]">Meta batida!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quanto falta (card único se tiver só trimestral) ou quem vendeu */}
            <div className={`flex flex-col rounded-2xl border-2 border-white/10 bg-white/[0.06] p-5 overflow-hidden ${metaMensal ? 'lg:col-span-4' : 'lg:col-span-8'}`}>
              <h2 className="text-lg font-bold text-[#94a3b8] mb-3">Quem vendeu</h2>
              <div className="flex-1 min-h-0 overflow-auto space-y-2">
                {contribuicoesPorCorretor.length === 0 ? (
                  <p className="text-sm text-[#64748b]">Nenhuma contribuição lançada ainda.</p>
                ) : (
                  contribuicoesPorCorretor.slice(0, 12).map((c, i) => (
                    <div
                      key={c.corretorId || i}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <span className="font-medium text-white truncate pr-2">{c.corretorNome}</span>
                      <span className="text-[#3AC17C] font-bold tabular-nums shrink-0">{fmt(c.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
