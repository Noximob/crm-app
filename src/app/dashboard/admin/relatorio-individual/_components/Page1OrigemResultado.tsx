'use client';

import React from 'react';
import type { RelatorioIndividualData } from '../_lib/reportData';
import HorizontalBar from './HorizontalBar';

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
      <SectionTitle className="mb-2">De onde veio o resultado</SectionTitle>
      <p className="text-sm text-gray-400 mb-4">
        Onde você gastou tempo (horas), como estão os leads por etapa do funil e quanto vendeu no período. As barras mostram a proporção de cada item.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Atividade por tipo — gráfico de barras */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Onde você gastou tempo (horas)</p>
          {eventosPorTipo.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum evento no período.</p>
          ) : (
            <div className="space-y-3">
              {eventosPorTipo.map(({ tipo, horas, quantidade }) => (
                <HorizontalBar
                  key={tipo}
                  label={`${tipo} (${quantidade} evento${quantidade !== 1 ? 's' : ''})`}
                  value={horas}
                  max={Math.max(1, (report.totalHorasEventos?.valor ?? 0) || 1)}
                  valueLabel={`${horas}h`}
                  barColor="#D4A017"
                />
              ))}
              {report.totalHorasEventos?.valor != null && report.totalHorasEventos.valor > 0 && (
                <p className="text-xs text-gray-500 pt-2 border-t border-white/10">
                  Total: <strong className="text-white">{report.totalHorasEventos.valor}h</strong>
                  {report.totalHorasEventos.variacao != null && (
                    <span className={report.totalHorasEventos.variacao >= 0 ? ' text-emerald-400' : ' text-red-400'}>
                      {' '}({report.totalHorasEventos.variacao > 0 ? '+' : ''}{report.totalHorasEventos.variacao}% vs período anterior)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
        {/* Leads — gráfico de barras por etapa */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Leads por etapa do funil</p>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-2xl font-bold text-white tabular-nums">{report.leadsTotal?.valor ?? totalLeads}</span>
            <span className="text-gray-500 text-sm">total na carteira</span>
            <span className="text-xl font-bold text-[#D4A017] tabular-nums">{report.novosLeads?.valor ?? 0}</span>
            <span className="text-gray-500 text-sm">novos no período</span>
            {report.novosLeads?.variacao != null && (
              <span className={`text-xs font-semibold ${report.novosLeads.variacao >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {report.novosLeads.variacao > 0 ? '+' : ''}{report.novosLeads.variacao}% vs ant.
              </span>
            )}
          </div>
          {leadsPorEtapaEntries.length > 0 ? (
            <div className="space-y-3">
              {leadsPorEtapaEntries.map(([etapa, n]) => (
                <HorizontalBar
                  key={etapa}
                  label={etapa}
                  value={n}
                  max={Math.max(1, totalLeads || 1)}
                  valueLabel={`${n} lead${n !== 1 ? 's' : ''}`}
                  barColor="#6366f1"
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nenhum lead por etapa.</p>
          )}
        </div>
        {/* Vendas — destaque visual */}
        <div className="rounded-xl border border-[#D4A017]/30 bg-[#D4A017]/10 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">VGV no período</p>
          <p className="text-2xl font-bold text-[#D4A017] tabular-nums">{formatCurrency(valorVendas)}</p>
          <p className="text-sm text-white mt-1">{countVendas} fechamento{countVendas !== 1 ? 's' : ''}</p>
          {(report.contribuicoesPeriodo?.variacao != null || report.contribuicoesPeriodoCount?.variacao != null) && (
            <p className="text-xs mt-2 text-gray-400">
              vs período anterior:
              {report.contribuicoesPeriodo?.variacao != null && (
                <span className={report.contribuicoesPeriodo.variacao >= 0 ? ' text-emerald-400' : ' text-red-400'}>
                  {' '}VGV {report.contribuicoesPeriodo.variacao > 0 ? '+' : ''}{report.contribuicoesPeriodo.variacao}%
                </span>
              )}
              {report.contribuicoesPeriodoCount?.variacao != null && (
                <span className={report.contribuicoesPeriodoCount.variacao >= 0 ? ' text-emerald-400' : ' text-red-400'}>
                  {' '}· Fech. {report.contribuicoesPeriodoCount.variacao > 0 ? '+' : ''}{report.contribuicoesPeriodoCount.variacao}%
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
