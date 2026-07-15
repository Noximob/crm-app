'use client';

/** Aba FUNIL — retrato por etapa + entradas novas + leads esquecidos (clicáveis). */

import React, { useState } from 'react';
import Link from 'next/link';
import type { EsquecidoItem, ReportComputed } from './computeReport';
import { fmtInt, fmtPct, funilCor } from './reportShared';
import { BarraH, EmptyMsg, SectionCard, chipBase } from './ui';

function GrupoEsquecidos({
  titulo, corTxt, corBorda, itens,
}: {
  titulo: string;
  corTxt: string;
  corBorda: string;
  itens: EsquecidoItem[];
}) {
  const [aberto, setAberto] = useState(false);
  const LIMITE = 40;
  const visiveis = aberto ? itens.slice(0, LIMITE) : itens.slice(0, 6);

  return (
    <div className={`rounded-xl border ${corBorda} bg-white/[0.02] p-3`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center gap-2 text-left"
      >
        <span className={`al-display text-[13px] font-bold uppercase tracking-[0.1em] ${corTxt}`}>{titulo}</span>
        <span className="text-[11px] font-semibold text-text-secondary tabular-nums px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]">{fmtInt(itens.length)}</span>
        <span className={`ml-auto text-[10px] ${corTxt} opacity-70`}>{aberto ? '▲ recolher' : '▼ ver todos'}</span>
      </button>
      {itens.length === 0 ? (
        <p className="text-[11px] text-text-secondary mt-2">Ninguém nessa faixa — carteira em dia.</p>
      ) : (
        <>
          <div className="mt-2 space-y-1">
            {visiveis.map((it) => (
              <Link
                key={it.leadId}
                href={`/dashboard/crm/${it.leadId}?viewAs=1`}
                className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-lg px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.06] hover:border-[#FF1E56]/40 hover:bg-white/[0.05] transition-colors"
              >
                <span className="text-[12px] font-bold text-white min-w-0 truncate max-w-[45%]">{it.nome}</span>
                <span
                  className={`${chipBase} normal-case tracking-normal`}
                  style={{
                    background: `${funilCor(it.etapaIdx)}14`,
                    borderColor: `${funilCor(it.etapaIdx)}55`,
                    color: funilCor(it.etapaIdx),
                  }}
                >
                  {it.etapa}
                </span>
                <span className="text-[10.5px] text-text-secondary truncate max-w-[120px]">{it.corretorNome}</span>
                <span className={`ml-auto text-[10.5px] font-bold tabular-nums ${corTxt}`}>há {it.diasSem}d</span>
              </Link>
            ))}
          </div>
          {aberto && itens.length > LIMITE && (
            <p className="text-[10px] text-text-secondary mt-1.5">… e mais {fmtInt(itens.length - LIMITE)} leads nessa faixa.</p>
          )}
          {!aberto && itens.length > 6 && (
            <p className="text-[10px] text-text-secondary mt-1.5">mostrando 6 de {fmtInt(itens.length)} — clique no título pra abrir.</p>
          )}
        </>
      )}
    </div>
  );
}

export default function FunilTab({ report }: { report: ReportComputed }) {
  const { funil, totalLeadsBase, esquecidos } = report;
  const maxEtapa = Math.max(1, ...funil.map((f) => f.total));
  const totalEsquecidos = esquecidos.b30.length + esquecidos.b14.length + esquecidos.b7.length;

  return (
    <div className="space-y-4">
      {/* Retrato por etapa */}
      <SectionCard
        title="Funil de vendas"
        right={<span className="text-[10px] text-text-secondary tabular-nums">{fmtInt(totalLeadsBase)} leads na base</span>}
      >
        {totalLeadsBase === 0 ? (
          <EmptyMsg>Nenhum lead na base ainda.</EmptyMsg>
        ) : (
          <div className="space-y-2">
            {funil.map((f) => (
              <div key={f.etapa} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[170px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.cor, boxShadow: `0 0 6px ${f.cor}88` }} />
                  <span className="text-[12px] font-semibold text-white truncate">{f.etapa}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <BarraH pct={(f.total / maxEtapa) * 100} cor={f.cor} />
                </div>
                <div className="flex items-center gap-2 justify-end row-start-1 col-start-2 sm:row-auto sm:col-auto">
                  <span className="al-display text-[14px] font-bold text-white tabular-nums">{fmtInt(f.total)}</span>
                  <span className="text-[10px] text-text-secondary tabular-nums w-9 text-right">{fmtPct(f.pctTotal)}</span>
                  {f.novosPeriodo > 0 && (
                    <span className={`${chipBase} bg-[#34D399]/10 border-[#34D399]/35 text-emerald-300 tabular-nums`}>+{fmtInt(f.novosPeriodo)}</span>
                  )}
                </div>
              </div>
            ))}
            <p className="text-[9.5px] text-white/30 pt-1">O chip verde <b>+N</b> é quantos leads criados no período estão hoje naquela etapa.</p>
          </div>
        )}
      </SectionCard>

      {/* Leads esquecidos */}
      <SectionCard
        title="Leads fora do radar"
        right={
          totalEsquecidos > 0
            ? <span className={`${chipBase} bg-red-500/10 border-red-500/35 text-red-300 tabular-nums`}>{fmtInt(totalEsquecidos)} leads parados</span>
            : <span className={`${chipBase} bg-[#34D399]/10 border-[#34D399]/35 text-emerald-300`}>carteira em dia</span>
        }
      >
        <p className="text-[11px] text-text-secondary mb-3">
          Leads sem nenhuma interação registrada e sem tarefa pendente marcada — ninguém tem próximo passo com eles.
          Etapas de estacionamento (Interesse Futuro, Carteira, Geladeira) ficam de fora. Clique pra abrir o lead.
        </p>
        {totalEsquecidos === 0 ? (
          <EmptyMsg>Nenhum lead abandonado — todos têm atividade recente ou tarefa marcada.</EmptyMsg>
        ) : (
          <div className="space-y-2.5">
            <GrupoEsquecidos titulo="30+ dias no vácuo" corTxt="text-[#FF7A97]" corBorda="border-[#FF1E56]/30" itens={esquecidos.b30} />
            <GrupoEsquecidos titulo="14 a 29 dias" corTxt="text-[#FF7A45]" corBorda="border-[#FF7A45]/30" itens={esquecidos.b14} />
            <GrupoEsquecidos titulo="7 a 13 dias" corTxt="text-[#FFE9A6]" corBorda="border-[#E8C547]/30" itens={esquecidos.b7} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
