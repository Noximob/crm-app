'use client';

/** Aba PULSO — o batimento do negócio no período, sempre vs período anterior. */

import React from 'react';
import type { ReportComputed } from './computeReport';
import { Periodo, fmtInt, fmtMoney, fmtSeg } from './reportShared';
import { DeltaChip, EmptyMsg, KpiBox, SectionCard, chipBase } from './ui';

export default function PulsoTab({ report, periodo }: { report: ReportComputed; periodo: Periodo }) {
  const { kpis, agendaPeriodo, timeline, timelineGranularidade } = report;

  const maxLeads = Math.max(1, ...timeline.map((t) => t.leads));
  const maxAtv = Math.max(1, ...timeline.map((t) => t.atividade));
  const temMovimento = timeline.some((t) => t.leads > 0 || t.atividade > 0);
  // Mostra ~8 rótulos no eixo pra não virar sopa de datas
  const labelStep = Math.max(1, Math.ceil(timeline.length / 8));

  const pctAgenda = agendaPeriodo.total > 0 ? Math.round((agendaPeriodo.concluidas / agendaPeriodo.total) * 100) : null;

  return (
    <div className="space-y-4">
      {/* KPIs grandes com comparação vs período anterior */}
      <SectionCard
        title="Batimento do período"
        right={<span className="text-[10px] text-text-secondary">vs período anterior de mesmo tamanho</span>}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <KpiBox label="Leads novos" valor={fmtInt(kpis.leadsNovos.atual)} atual={kpis.leadsNovos.atual} anterior={kpis.leadsNovos.anterior} />
          <KpiBox label="Atividade (interações)" valor={fmtInt(kpis.atividade.atual)} atual={kpis.atividade.atual} anterior={kpis.atividade.anterior} />
          <KpiBox label="Tarefas concluídas" valor={fmtInt(kpis.tarefasConcluidas.atual)} atual={kpis.tarefasConcluidas.atual} anterior={kpis.tarefasConcluidas.anterior} />
          <KpiBox label="Visitas feitas" valor={fmtInt(kpis.visitas.atual)} atual={kpis.visitas.atual} anterior={kpis.visitas.anterior} />
          <KpiBox
            label="Vendas lançadas"
            valor={fmtMoney(kpis.vendasValor.atual)}
            sub={`${fmtInt(kpis.vendasQtd.atual)} venda${kpis.vendasQtd.atual === 1 ? '' : 's'}`}
            atual={kpis.vendasValor.atual}
            anterior={kpis.vendasValor.anterior}
          />
          <KpiBox
            label="Leads de anúncio"
            valor={fmtInt(kpis.adsLeads.atual)}
            sub={kpis.adsTempoMedioSeg.atual !== null ? `aceite médio ${fmtSeg(kpis.adsTempoMedioSeg.atual)}` : 'sem aceites no período'}
            atual={kpis.adsLeads.atual}
            anterior={kpis.adsLeads.anterior}
          />
        </div>

        {/* Agenda do período (tarefas com vencimento dentro do range) */}
        <div className="mt-3 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Agenda do período</span>
          {agendaPeriodo.total === 0 ? (
            <span className="text-[11px] text-text-secondary">nenhuma tarefa com vencimento no período</span>
          ) : (
            <>
              <span className="text-[11.5px] text-white tabular-nums"><b className="al-display">{fmtInt(agendaPeriodo.total)}</b> tarefas venceram</span>
              <span className={`${chipBase} bg-[#34D399]/10 border-[#34D399]/35 text-emerald-300 tabular-nums`}>{fmtInt(agendaPeriodo.concluidas)} concluídas{pctAgenda !== null ? ` · ${pctAgenda}%` : ''}</span>
              <span className={`${chipBase} bg-red-500/10 border-red-500/35 text-red-300 tabular-nums`}>{fmtInt(agendaPeriodo.canceladas)} canceladas</span>
              <span className={`${chipBase} bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6] tabular-nums`}>{fmtInt(agendaPeriodo.pendentes)} em aberto</span>
            </>
          )}
        </div>
      </SectionCard>

      {/* Linha do tempo: leads novos × atividade */}
      <SectionCard
        title="Linha do tempo"
        right={
          <>
            <span className={`${chipBase} bg-[#34D399]/10 border-[#34D399]/35 text-emerald-300`}>Leads novos</span>
            <span className={`${chipBase} bg-[#9F6BFF]/10 border-[#9F6BFF]/35 text-[#C4A6FF]`}>Atividade</span>
            <span className="text-[10px] text-text-secondary">por {timelineGranularidade} · {periodo.label}</span>
          </>
        }
      >
        {!temMovimento ? (
          <EmptyMsg>Sem leads novos nem atividade registrada no período.</EmptyMsg>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="flex items-end gap-[3px] h-32 min-w-full" style={{ minWidth: `${timeline.length * 14}px` }}>
              {timeline.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-[10px] h-full flex flex-col justify-end group relative"
                  title={`${b.label} — ${fmtInt(b.leads)} lead${b.leads === 1 ? '' : 's'} novo${b.leads === 1 ? '' : 's'} · ${fmtInt(b.atividade)} interações`}
                >
                  <div className="flex items-end gap-[2px] h-[104px]">
                    <div
                      className="flex-1 rounded-t-[3px] bg-gradient-to-t from-[#0e5c3f] to-[#34D399] group-hover:brightness-125 transition-all"
                      style={{ height: `${b.leads > 0 ? Math.max(4, (b.leads / maxLeads) * 100) : 0}%` }}
                    />
                    <div
                      className="flex-1 rounded-t-[3px] bg-gradient-to-t from-[#4a2a86] to-[#9F6BFF] group-hover:brightness-125 transition-all"
                      style={{ height: `${b.atividade > 0 ? Math.max(4, (b.atividade / maxAtv) * 100) : 0}%` }}
                    />
                  </div>
                  <span className={`mt-1 text-center text-[8.5px] tabular-nums leading-none ${i % labelStep === 0 || i === timeline.length - 1 ? 'text-text-secondary' : 'text-transparent'}`}>
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[9.5px] text-white/30 mt-1.5">Cada série usa a própria escala (pico de leads: {fmtInt(maxLeads)} · pico de atividade: {fmtInt(maxAtv)}). Passe o mouse pra ver os números exatos.</p>
          </div>
        )}
      </SectionCard>

      {/* Comparativo rápido em texto */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Período anterior:</span>
        <span className="text-[11px] text-text-secondary tabular-nums">
          {fmtInt(kpis.leadsNovos.anterior)} leads · {fmtInt(kpis.atividade.anterior)} interações · {fmtInt(kpis.visitas.anterior)} visitas · {fmtMoney(kpis.vendasValor.anterior)} em vendas
        </span>
        <DeltaChip atual={kpis.atividade.atual} anterior={kpis.atividade.anterior} />
      </div>
    </div>
  );
}
