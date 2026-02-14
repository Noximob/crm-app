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
    <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-5">
      <SectionTitle className="mb-4">De onde veio o resultado</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Atividade por tipo */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Atividade (horas / eventos)</p>
          {eventosPorTipo.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum evento no período.</p>
          ) : (
            <div className="space-y-1.5 text-sm">
              {eventosPorTipo.map(({ tipo, horas, quantidade }) => (
                <div key={tipo} className="flex justify-between gap-2">
                  <span className="text-gray-300 truncate">{tipo}</span>
                  <span className="tabular-nums shrink-0 text-[#D4A017]">{horas}h · {quantidade}</span>
                </div>
              ))}
              {report.totalHorasEventos?.valor != null && report.totalHorasEventos.valor > 0 && (
                <p className="text-xs text-gray-500 pt-1 border-t border-white/10">
                  Total {report.totalHorasEventos.valor}h
                  {report.totalHorasEventos.variacao != null && (
                    <span className={report.totalHorasEventos.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {' '}{report.totalHorasEventos.variacao > 0 ? '+' : ''}{report.totalHorasEventos.variacao}% vs ant.
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
        {/* Leads */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Leads</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-lg font-bold text-white tabular-nums">{report.leadsTotal?.valor ?? totalLeads}</span>
            <span className="text-gray-500">total</span>
            <span className="text-lg font-bold text-[#D4A017] tabular-nums">{report.novosLeads?.valor ?? 0}</span>
            <span className="text-gray-500">novos</span>
            {report.novosLeads?.variacao != null && (
              <span className={`text-xs ${report.novosLeads.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {report.novosLeads.variacao > 0 ? '+' : ''}{report.novosLeads.variacao}%
              </span>
            )}
          </div>
          {leadsPorEtapaEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {leadsPorEtapaEntries.map(([etapa, n]) => (
                <span key={etapa} className="rounded bg-white/5 px-2 py-0.5 text-xs text-gray-300">
                  {etapa}: <strong className="text-white">{n}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Vendas */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Vendas no período</p>
          <p className="text-xl font-bold text-[#D4A017] tabular-nums">{formatCurrency(valorVendas)}</p>
          <p className="text-sm text-white tabular-nums">{countVendas} fechamentos</p>
          {(report.contribuicoesPeriodo?.variacao != null || report.contribuicoesPeriodoCount?.variacao != null) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {report.contribuicoesPeriodo?.variacao != null && (
                <span className={report.contribuicoesPeriodo.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  VGV {report.contribuicoesPeriodo.variacao > 0 ? '+' : ''}{report.contribuicoesPeriodo.variacao}%
                </span>
              )}
              {report.contribuicoesPeriodo?.variacao != null && report.contribuicoesPeriodoCount?.variacao != null && ' · '}
              {report.contribuicoesPeriodoCount?.variacao != null && (
                <span className={report.contribuicoesPeriodoCount.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  Fech. {report.contribuicoesPeriodoCount.variacao > 0 ? '+' : ''}{report.contribuicoesPeriodoCount.variacao}%
                </span>
              )} vs ant.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
