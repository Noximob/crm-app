'use client';

import React, { useState } from 'react';
import type { GapByStage, FocusPriority } from '../_lib/configTypes';
import type { RelatorioIndividualData } from '../_lib/reportData';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export interface GamifiedPanelsProps {
  report: RelatorioIndividualData;
  gaps: GapByStage[];
  focus: FocusPriority[];
  progressoPct: number | null;
  acimaAbaixo: 'acima' | 'abaixo' | 'no_alvo';
  valorRealizadoR: number;
  tarefasConcluidas: number;
}

interface PanelItem {
  id: string;
  title: string;
  detail?: string;
  value?: string | number;
}

function CheckIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function XCircleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  );
}

function TrophyIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0V13.5m0 5.25v3.75m-9-3v3.75m9-3h-9m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a6.532 6.532 0 0 1 2.748 1.35m-7.5 0v-.653" />
    </svg>
  );
}

function TargetIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v10.024c0 1.18 1.16 2.01 2.42 1.94 2.07-.12 4.13-.5 5.58-1.23 1.45-.73 2.58-1.63 2.58-2.71V8.25ZM12 8.25c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v10.024c0 1.18-1.16 2.01-2.42 1.94-2.07-.12-4.13-.5-5.58-1.23-1.45-.73-2.58-1.63-2.58-2.71V8.25ZM12 8.25V6.5" />
    </svg>
  );
}

function buildPositiveItems(props: GamifiedPanelsProps): PanelItem[] {
  const { report, gaps, progressoPct, acimaAbaixo, valorRealizadoR, tarefasConcluidas } = props;
  const items: PanelItem[] = [];

  if (acimaAbaixo === 'acima' || acimaAbaixo === 'no_alvo') {
    items.push({
      id: 'ritmo',
      title: acimaAbaixo === 'acima' ? 'Acima da projeção da meta' : 'No ritmo da meta',
      detail: progressoPct != null ? `${(progressoPct * 100).toFixed(0)}% do esperado no período` : undefined,
      value: progressoPct != null ? `${(progressoPct * 100).toFixed(0)}%` : undefined,
    });
  }

  if ((report.novosLeads?.variacao ?? 0) > 0) {
    items.push({
      id: 'leads',
      title: 'Novos leads em alta',
      detail: `${report.novosLeads?.valor ?? 0} novos no período`,
      value: `+${report.novosLeads!.variacao!}%`,
    });
  }

  if ((report.contribuicoesPeriodo?.variacao ?? 0) > 0) {
    items.push({
      id: 'vgv',
      title: 'VGV em crescimento',
      detail: formatCurrency(report.contribuicoesPeriodo?.valor ?? 0),
      value: `+${report.contribuicoesPeriodo!.variacao!}%`,
    });
  }

  if ((report.tarefasConcluidasPeriodo?.variacao ?? 0) > 0) {
    items.push({
      id: 'tarefas',
      title: 'Tarefas concluídas em alta',
      detail: `${tarefasConcluidas} no período`,
      value: `+${report.tarefasConcluidasPeriodo!.variacao!}%`,
    });
  }

  if ((report.totalHorasEventos?.variacao ?? 0) > 0) {
    items.push({
      id: 'horas',
      title: 'Mais horas em atividades',
      detail: `${report.totalHorasEventos?.valor ?? 0}h no período`,
      value: `+${report.totalHorasEventos!.variacao!}%`,
    });
  }

  if ((report.interacoesPeriodo?.variacao ?? 0) > 0) {
    items.push({
      id: 'interacoes',
      title: 'Interações em alta',
      value: `+${report.interacoesPeriodo!.variacao!}%`,
    });
  }

  gaps.filter((g) => g.necessario > 0 && g.gapPct != null && g.gapPct >= 1).forEach((g) => {
    items.push({
      id: `ok-${g.stageId}`,
      title: `${g.stageNome} no azul`,
      detail: `Realizado: ${g.realizado} (meta: ${g.necessario})`,
      value: '✓',
    });
  });

  if (report.eventosParticipados?.length > 0) {
    const totalH = report.eventosParticipados.reduce((s, e) => s + e.horas, 0);
    items.push({
      id: 'atividade',
      title: 'Atividade registrada',
      detail: `${report.eventosParticipados.length} eventos · ${Math.round(totalH * 10) / 10}h`,
    });
  }

  if (report.contribuicoesPeriodoCount?.valor ?? report.leadsFechadosPeriodo > 0) {
    items.push({
      id: 'fechamentos',
      title: 'Fechamentos no período',
      detail: `${report.contribuicoesPeriodoCount?.valor ?? report.leadsFechadosPeriodo} vendas`,
      value: formatCurrency(report.contribuicoesPeriodo?.valor ?? 0),
    });
  }

  return items;
}

function buildNegativeItems(props: GamifiedPanelsProps): PanelItem[] {
  const { report, gaps, focus, acimaAbaixo, valorRealizadoR } = props;
  const items: PanelItem[] = [];

  if (acimaAbaixo === 'abaixo') {
    items.push({
      id: 'ritmo',
      title: 'Abaixo da projeção da meta',
      detail: 'Foco em aumentar o ritmo de fechamentos ou prospecção.',
      value: 'Atenção',
    });
  }

  if ((report.novosLeads?.variacao ?? 0) < 0) {
    items.push({
      id: 'leads-queda',
      title: 'Novos leads em queda',
      detail: `vs período anterior: ${report.novosLeads!.variacao!}%`,
      value: `${report.novosLeads!.variacao!}%`,
    });
  }

  if ((report.contribuicoesPeriodo?.variacao ?? 0) < 0) {
    items.push({
      id: 'vgv-queda',
      title: 'VGV abaixo do período anterior',
      detail: formatCurrency(report.contribuicoesPeriodo?.valor ?? 0),
      value: `${report.contribuicoesPeriodo!.variacao!}%`,
    });
  }

  gaps.filter((g) => g.gapAbs > 0 && (g.gapPct == null || g.gapPct < 1)).forEach((g) => {
    items.push({
      id: `gap-${g.stageId}`,
      title: `GAP em ${g.stageNome}`,
      detail: `Faltam ${Math.round(g.gapAbs)} (realizado ${g.realizado} / necessário ${g.necessario})`,
      value: g.gapPct != null ? `${(g.gapPct * 100).toFixed(0)}%` : '—',
    });
  });

  focus.forEach((f, i) => {
    items.push({
      id: `focus-${f.stageId}`,
      title: f.mensagem,
      detail: `Prioridade ${i + 1}`,
    });
  });

  if (report.tarefasAtrasadas > 0) {
    items.push({
      id: 'tarefas-atrasadas',
      title: 'Tarefas atrasadas',
      detail: `${report.tarefasAtrasadas} pendentes em atraso`,
      value: report.tarefasAtrasadas,
    });
  }

  if (report.semTarefa > 0 && report.semTarefa >= (report.leadsTotal?.valor ?? 0) * 0.2) {
    items.push({
      id: 'sem-tarefa',
      title: 'Leads sem tarefa agendada',
      detail: `${report.semTarefa} leads sem próxima ação`,
      value: report.semTarefa,
    });
  }

  if (valorRealizadoR === 0 && (report.contribuicoesPeriodo?.valor ?? 0) === 0) {
    items.push({
      id: 'zero-vgv',
      title: 'Nenhum VGV no período',
      detail: 'Foco em conversão e fechamentos.',
    });
  }

  return items;
}

function PositiveCard({ item, isExpanded, onToggle }: { item: PanelItem; isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all p-3 group"
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/30 text-emerald-400 flex items-center justify-center">
          <CheckIcon className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">{item.title}</p>
          {item.detail && (
            <p className={`text-xs text-gray-400 mt-0.5 ${isExpanded ? '' : 'line-clamp-1'}`}>{item.detail}</p>
          )}
        </div>
        {item.value != null && (
          <span className="flex-shrink-0 text-xs font-bold text-emerald-400 tabular-nums">{item.value}</span>
        )}
      </div>
    </button>
  );
}

function NegativeCard({ item, isExpanded, onToggle }: { item: PanelItem; isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 transition-all p-3 group"
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/30 text-amber-400 flex items-center justify-center">
          <TargetIcon className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">{item.title}</p>
          {item.detail && (
            <p className={`text-xs text-gray-400 mt-0.5 ${isExpanded ? '' : 'line-clamp-1'}`}>{item.detail}</p>
          )}
        </div>
        {item.value != null && (
          <span className="flex-shrink-0 text-xs font-bold text-amber-400 tabular-nums">{item.value}</span>
        )}
      </div>
    </button>
  );
}

export default function GamifiedPanels(props: GamifiedPanelsProps) {
  const positive = buildPositiveItems(props);
  const negative = buildNegativeItems(props);
  const [expandedPos, setExpandedPos] = useState<Set<string>>(new Set());
  const [expandedNeg, setExpandedNeg] = useState<Set<string>>(new Set());

  const togglePos = (id: string) => {
    setExpandedPos((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleNeg = (id: string) => {
    setExpandedNeg((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Dando certo */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5 p-4 card-glow">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <TrophyIcon className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white">Dando certo</h3>
            <p className="text-xs text-gray-400">{positive.length} ponto{positive.length !== 1 ? 's' : ''} forte{positive.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="space-y-2">
          {positive.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Nenhum indicador positivo no período. Gere atividade e acompanhe as métricas.</p>
          ) : (
            positive.map((item) => (
              <PositiveCard
                key={item.id}
                item={item}
                isExpanded={expandedPos.has(item.id)}
                onToggle={() => togglePos(item.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Precisa melhorar */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5 p-4 card-glow">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-500/30 text-amber-400 flex items-center justify-center">
            <XCircleIcon className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white">Precisa melhorar</h3>
            <p className="text-xs text-gray-400">{negative.length} ponto{negative.length !== 1 ? 's' : ''} de atenção</p>
          </div>
        </div>
        <div className="space-y-2">
          {negative.length === 0 ? (
            <p className="text-sm text-emerald-400/80 py-4">Nada crítico. Mantenha o ritmo!</p>
          ) : (
            negative.map((item) => (
              <NegativeCard
                key={item.id}
                item={item}
                isExpanded={expandedNeg.has(item.id)}
                onToggle={() => toggleNeg(item.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
