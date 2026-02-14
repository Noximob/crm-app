'use client';

import React from 'react';
import type { RelatorioIndividualData } from '../_lib/reportData';

const SectionTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-base font-bold text-white relative z-10">{children}</h2>
    <div className="absolute -left-1.5 top-1/2 transform -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-r-full opacity-60" />
  </div>
);

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export interface Page1OrigemResultadoProps {
  report: RelatorioIndividualData;
}

/** Agrega eventos por tipo (horas e quantidade) */
function aggregateEventosPorTipo(
  eventos: RelatorioIndividualData['eventosParticipados']
): { tipo: string; horas: number; quantidade: number }[] {
  const map = new Map<string, { horas: number; quantidade: number }>();
  for (const e of eventos) {
    const t = e.tipo || 'Outro';
    const cur = map.get(t) ?? { horas: 0, quantidade: 0 };
    cur.horas += e.horas;
    cur.quantidade += 1;
    map.set(t, cur);
  }
  const order = ['Ação de Rua', 'Ligação Ativa', 'Reunião', 'Evento', 'Plantão', 'Revisar CRM', 'Disparo de mensagem', 'Treinamento', 'Outro'];
  const entries = Array.from(map.entries()).map(([tipo, v]) => ({ tipo, horas: Math.round(v.horas * 10) / 10, quantidade: v.quantidade }));
  entries.sort((a, b) => {
    const ia = order.indexOf(a.tipo);
    const ib = order.indexOf(b.tipo);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.tipo.localeCompare(b.tipo);
  });
  return entries;
}

export default function Page1OrigemResultado({ report }: Page1OrigemResultadoProps) {
  const eventosPorTipo = aggregateEventosPorTipo(report.eventosParticipados);
  const leadsPorEtapaEntries = Object.entries(report.leadsPorEtapa ?? {}).filter(([, n]) => n > 0);
  const totalLeads = Object.values(report.leadsPorEtapa ?? {}).reduce((a, b) => a + b, 0);
  const valorVendas = report.contribuicoesPeriodo?.valor ?? 0;
  const countVendas = report.contribuicoesPeriodoCount?.valor ?? report.leadsFechadosPeriodo ?? 0;

  return (
    <div className="space-y-6">
      <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-5">
        <SectionTitle className="mb-4">De onde veio a atividade</SectionTitle>
        <p className="text-sm text-gray-400 mb-4">
          Horas e eventos em que o corretor participou no período (ação de rua, ligação ativa, reuniões, etc.).
        </p>
        {eventosPorTipo.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum evento registrado no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium text-right">Horas</th>
                  <th className="pb-2 font-medium text-right">Eventos</th>
                </tr>
              </thead>
              <tbody>
                {eventosPorTipo.map(({ tipo, horas, quantidade }) => (
                  <tr key={tipo} className="border-b border-white/5">
                    <td className="py-2 text-white">{tipo}</td>
                    <td className="py-2 text-right tabular-nums text-[#D4A017]">{horas}h</td>
                    <td className="py-2 text-right tabular-nums text-gray-300">{quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {report.totalHorasEventos?.valor != null && report.totalHorasEventos.valor > 0 && (
          <p className="text-xs text-gray-500 mt-3">
            Total: <strong className="text-white">{report.totalHorasEventos.valor}h</strong> no período
            {report.totalHorasEventos.variacao != null && (
              <span className={report.totalHorasEventos.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {' '}({report.totalHorasEventos.variacao > 0 ? '+' : ''}{report.totalHorasEventos.variacao}% vs período anterior)
              </span>
            )}
          </p>
        )}
      </div>

      <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-5">
        <SectionTitle className="mb-4">De onde vieram os leads</SectionTitle>
        <p className="text-sm text-gray-400 mb-4">
          Distribuição dos leads do corretor por etapa do funil e novos leads no período.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total de leads</p>
            <p className="text-xl font-bold text-white tabular-nums">{report.leadsTotal?.valor ?? totalLeads}</p>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Novos no período</p>
            <p className="text-xl font-bold text-[#D4A017] tabular-nums">{report.novosLeads?.valor ?? 0}</p>
            {report.novosLeads?.variacao != null && (
              <p className={`text-xs mt-0.5 ${report.novosLeads.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {report.novosLeads.variacao > 0 ? '+' : ''}{report.novosLeads.variacao}% vs anterior
              </p>
            )}
          </div>
        </div>
        {leadsPorEtapaEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Por etapa do funil</p>
            <div className="flex flex-wrap gap-2">
              {leadsPorEtapaEntries.map(([etapa, n]) => (
                <div
                  key={etapa}
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between gap-4 min-w-[140px]"
                >
                  <span className="text-sm text-gray-300 truncate">{etapa}</span>
                  <span className="text-sm font-bold text-white tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-5">
        <SectionTitle className="mb-4">Vendas no período</SectionTitle>
        <p className="text-sm text-gray-400 mb-4">
          Contribuições (VGV) e quantidade de fechamentos no período.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">VGV realizado</p>
            <p className="text-2xl font-bold text-[#D4A017] tabular-nums">{formatCurrency(valorVendas)}</p>
            {report.contribuicoesPeriodo?.variacao != null && (
              <p className={`text-xs mt-0.5 ${report.contribuicoesPeriodo.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {report.contribuicoesPeriodo.variacao > 0 ? '+' : ''}{report.contribuicoesPeriodo.variacao}% vs anterior
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fechamentos</p>
            <p className="text-2xl font-bold text-white tabular-nums">{countVendas}</p>
            {report.contribuicoesPeriodoCount?.variacao != null && (
              <p className={`text-xs mt-0.5 ${report.contribuicoesPeriodoCount.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {report.contribuicoesPeriodoCount.variacao > 0 ? '+' : ''}{report.contribuicoesPeriodoCount.variacao}% vs anterior
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
