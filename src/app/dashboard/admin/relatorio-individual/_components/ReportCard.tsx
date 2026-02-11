'use client';

import React from 'react';
import type { RelatorioIndividualData, ReportMetric } from '../_lib/reportData';
import { REPORT_FUNIL_ETAPAS } from '../_lib/reportData';
import { AlummaLogoImg } from '@/components/AlummaLogo';

function VariacaoBadge({ m }: { m: ReportMetric<number> }) {
  if (m.variacao == null) return null;
  const isPositivo = m.variacao >= 0;
  const cor = isPositivo ? 'text-emerald-600' : 'text-red-600';
  const bg = isPositivo ? 'bg-emerald-50' : 'bg-red-50';
  return (
    <span className={`inline-flex items-center text-xs font-semibold rounded-full px-2 py-0.5 ${bg} ${cor}`}>
      {isPositivo ? '↑' : '↓'} {Math.abs(m.variacao)}%
    </span>
  );
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

const periodLabel: Record<string, string> = {
  dia: 'Dia',
  semana: 'Semana',
  mes: 'Mês',
};

export default function ReportCard({ data }: { data: RelatorioIndividualData }) {
  const periodoLabel = periodLabel[data.periodo] || data.periodo;
  return (
    <div
      className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
      style={{ width: 720 }}
      id="relatorio-individual-card"
    >
      {/* Header com marca */}
      <div className="bg-gradient-to-br from-[#D4A017] to-[#B8860B] px-8 py-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlummaLogoImg variant="full" theme="light" width={140} height={44} className="shrink-0" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Relatório Individual</h1>
              <p className="text-white/90 text-sm">Alumma · Para o corretor e para análise</p>
            </div>
          </div>
          <div className="text-right text-sm text-white/90">
            <p>Gerado em {data.dataGeracao}</p>
            <p className="font-medium text-white mt-0.5">
              Período: {data.dataInicio} a {data.dataFim} ({periodoLabel})
            </p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-white/20">
          <p className="text-white/80 text-sm">Corretor</p>
          <p className="text-2xl font-bold">{data.corretorNome}</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* 1. Funil e leads */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded bg-primary-500" />
            Funil e leads
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Total de leads</p>
              <p className="text-2xl font-bold text-gray-900">{data.leadsTotal.valor}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Novos no período</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{data.novosLeads.valor}</span>
                <VariacaoBadge m={data.novosLeads} />
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Fechamentos no período</p>
              <p className="text-2xl font-bold text-gray-900">{data.leadsFechadosPeriodo}</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <p className="text-xs font-semibold text-gray-500 bg-gray-50 px-4 py-2 border-b">Leads por etapa (Topo de Funil → Troca de Leads)</p>
            <div className="divide-y divide-gray-100">
              {REPORT_FUNIL_ETAPAS.filter((e) => (data.leadsPorEtapa[e] ?? 0) > 0).map((etapa) => (
                <div key={etapa} className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-gray-700 truncate max-w-[320px]">{etapa}</span>
                  <span className="text-sm font-bold text-primary-600">{data.leadsPorEtapa[etapa] ?? 0}</span>
                </div>
              ))}
              {REPORT_FUNIL_ETAPAS.every((e) => (data.leadsPorEtapa[e] ?? 0) === 0) && (
                <p className="px-4 py-3 text-sm text-gray-400">Nenhum lead nas etapas do funil.</p>
              )}
            </div>
          </div>
        </section>

        {/* 2. Tarefas: do dia, atrasado, futuro, sem tarefa */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded bg-primary-500" />
            Tarefas do dia · Atrasado · Futuro · Sem tarefa
          </h2>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs text-amber-700 font-medium">Do dia</p>
              <p className="text-2xl font-bold text-amber-900">{data.tarefasDoDia}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs text-amber-700 font-medium">Atrasado</p>
              <p className="text-2xl font-bold text-amber-800">{data.tarefasAtrasadas}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Futuro</p>
              <p className="text-2xl font-bold text-gray-900">{data.tarefasFuturas}</p>
            </div>
            <div className="bg-slate-100 rounded-xl p-4">
              <p className="text-xs text-slate-600 font-medium">Sem tarefa</p>
              <p className="text-2xl font-bold text-slate-800">{data.semTarefa}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">leads sem tarefa pendente</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Concluídas no período</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-gray-900">{data.tarefasConcluidasPeriodo.valor}</span>
                <VariacaoBadge m={data.tarefasConcluidasPeriodo} />
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Interações no período</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-gray-900">{data.interacoesPeriodo.valor}</span>
                <VariacaoBadge m={data.interacoesPeriodo} />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Uso do tempo: Reunião, Evento, Treinamento, Revisar CRM, Ligação Ativa, Ação de Rua, Disparo de mensagem, Plantão */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded bg-primary-500" />
            Uso do tempo · Reunião · Evento · Treinamento · Revisar CRM · Ligação Ativa · Ação de Rua · Disparo de mensagem · Plantão
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-indigo-50 rounded-xl px-5 py-3">
              <p className="text-xs text-indigo-700 font-medium">Total de horas em eventos no período</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-indigo-900">{data.totalHorasEventos.valor}h</span>
                <VariacaoBadge m={data.totalHorasEventos} />
              </div>
            </div>
          </div>
          {data.eventosParticipados.length > 0 ? (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <p className="text-xs font-semibold text-gray-500 bg-gray-50 px-4 py-2 border-b">Eventos em que participou</p>
              <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {data.eventosParticipados.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                    <span className="text-gray-700 truncate flex-1">{ev.titulo}</span>
                    <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">{ev.tipo}</span>
                    <span className="text-gray-500 shrink-0">{ev.data}</span>
                    <span className="font-semibold text-indigo-600 shrink-0">{ev.horas}h</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-2">Nenhum evento ou plantão no período.</p>
          )}
        </section>

        {/* 4. Desempenho semana a semana (só no período mês) */}
        {data.periodo === 'mes' && data.desempenhoPorSemana?.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-primary-500" />
              Ações no mês · Desempenho semana a semana
            </h2>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">Semana</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-600">Período</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-600">Novos leads</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-600">Tarefas concl.</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-600">Interações</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-600">Contrib. (R$)</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">Horas eventos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.desempenhoPorSemana.map((s) => (
                    <tr key={s.semana} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2 font-medium text-gray-900">Semana {s.semana}</td>
                      <td className="text-right px-2 py-2 text-gray-600">{s.dataInicio} a {s.dataFim}</td>
                      <td className="text-right px-2 py-2">{s.novosLeads}</td>
                      <td className="text-right px-2 py-2">{s.tarefasConcluidas}</td>
                      <td className="text-right px-2 py-2">{s.interacoes}</td>
                      <td className="text-right px-2 py-2">{formatCurrency(s.valorContribuicoes)}</td>
                      <td className="text-right px-4 py-2">{s.horasEventos}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Metas e resultado */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded bg-primary-500" />
            Metas e resultado
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Meta mensal (valor)</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(data.metaMensalValor)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Realizado (acumulado)</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(data.metaMensalAlcancado)}</p>
              <p className="text-sm font-semibold text-primary-600 mt-1">{data.metaMensalPercentual}% da meta</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-xs text-emerald-700 font-medium">Contribuições no período (valor)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-emerald-900">{formatCurrency(data.contribuicoesPeriodo.valor)}</span>
                <VariacaoBadge m={data.contribuicoesPeriodo} />
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Quantidade de fechamentos no período</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-gray-900">{data.contribuicoesPeriodoCount.valor}</span>
                <VariacaoBadge m={data.contribuicoesPeriodoCount} />
              </div>
            </div>
          </div>
        </section>

        {/* Footer marca */}
        <div className="pt-6 border-t border-gray-200 flex items-center justify-center gap-2 text-gray-400 text-sm">
          <AlummaLogoImg variant="a" theme="light" width={20} height={20} className="shrink-0 opacity-80" />
          <span>Relatório gerado pela Alumma · Use para acompanhamento e envio ao seu gerente ou agente de análise.</span>
        </div>
      </div>
    </div>
  );
}
