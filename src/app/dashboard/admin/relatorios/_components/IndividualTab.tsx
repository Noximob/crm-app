'use client';

/** Aba INDIVIDUAL × COLETIVO — um corretor lado a lado com a média da equipe. */

import React, { useMemo } from 'react';
import type { CorretorRow, MetricasCorretor, ReportComputed } from './computeReport';
import { fmtInt, fmtMoney, fmtPct } from './reportShared';
import { EmptyMsg, SectionCard, chipBase } from './ui';

const VIOLETA = '#9F6BFF';
const CEU = '#7DD3FC';

interface MetricaComp {
  label: string;
  ele: number;
  media: number;
  fmt: (n: number) => string;
  /** usado só na leitura em texto */
  leitura?: string;
}

function LinhaComparativa({ m }: { m: MetricaComp }) {
  const max = Math.max(m.ele, m.media, 1);
  const barra = (v: number, cor: string) => (
    <div className="h-2.5 rounded-md bg-white/[0.06] overflow-hidden flex-1">
      <div
        className="h-full rounded-md transition-all duration-500"
        style={{ width: `${Math.max(v > 0 ? 3 : 0, (v / max) * 100)}%`, background: cor, boxShadow: `0 0 10px ${cor}55` }}
      />
    </div>
  );
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">{m.label}</span>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-[9px] font-extrabold uppercase tracking-wider text-[#C4A6FF]">Ele</span>
          {barra(m.ele, VIOLETA)}
          <span className="w-16 shrink-0 text-right al-display text-[13px] font-bold text-white tabular-nums">{m.fmt(m.ele)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-[9px] font-extrabold uppercase tracking-wider text-[#7DD3FC]">Equipe</span>
          {barra(m.media, CEU)}
          <span className="w-16 shrink-0 text-right text-[12px] font-semibold text-text-secondary tabular-nums">{m.fmt(m.media)}</span>
        </div>
      </div>
    </div>
  );
}

function geraLeitura(r: CorretorRow, eq: MetricasCorretor, metricas: MetricaComp[]): string[] {
  const acima: string[] = [];
  const naMedia: string[] = [];
  const abaixo: string[] = [];
  metricas.forEach((m) => {
    const nome = m.leitura || m.label.toLowerCase();
    if (m.media <= 0 && m.ele <= 0) return;
    if (m.media <= 0) { acima.push(nome); return; }
    const razao = m.ele / m.media;
    if (razao >= 1.15) acima.push(nome);
    else if (razao <= 0.85) abaixo.push(nome);
    else naMedia.push(nome);
  });

  const frases: string[] = [];
  if (acima.length > 0) frases.push(`Acima da média da equipe em: ${acima.join(', ')}.`);
  if (naMedia.length > 0) frases.push(`Na média em: ${naMedia.join(', ')}.`);
  if (abaixo.length > 0) frases.push(`Abaixo da média em: ${abaixo.join(', ')} — foco aí.`);

  if (r.pctQuente !== null && eq.pctQuente !== null) {
    const diff = r.pctQuente - eq.pctQuente;
    if (diff >= 10) frases.push(`Funil saudável: ${fmtPct(r.pctQuente)} dos leads ativos dele estão em etapas quentes (equipe: ${fmtPct(eq.pctQuente)}).`);
    else if (diff <= -10) frases.push(`O funil dele esfria cedo: só ${fmtPct(r.pctQuente)} dos leads ativos em etapas quentes, contra ${fmtPct(eq.pctQuente)} da equipe — vale revisar a passagem de etapa.`);
  }

  if (r.pendentesAtrasadas > 0) {
    frases.push(`${fmtInt(r.pendentesAtrasadas)} tarefa${r.pendentesAtrasadas === 1 ? '' : 's'} atrasada${r.pendentesAtrasadas === 1 ? '' : 's'} na carteira agora — limpar a fila é o primeiro passo.`);
  } else if (r.pendentesTotal > 0) {
    frases.push('Nenhuma tarefa atrasada na carteira — agenda em dia.');
  }

  if (frases.length === 0) frases.push('Sem movimento registrado no período pra comparar — escolha um período maior.');
  return frases;
}

export default function IndividualTab({
  report, corretorId, onSelecionar,
}: {
  report: ReportComputed;
  corretorId: string;
  onSelecionar: (id: string) => void;
}) {
  const { corretorRows, equipeMedia } = report;
  const sel = corretorRows.find((r) => r.id === corretorId) || corretorRows[0] || null;

  const metricas: MetricaComp[] = useMemo(() => {
    if (!sel) return [];
    return [
      { label: 'Leads novos', ele: sel.leadsNovos, media: equipeMedia.leadsNovos, fmt: (n) => fmtInt(Math.round(n)), leitura: 'leads novos' },
      { label: 'Atividade (interações)', ele: sel.interacoes, media: equipeMedia.interacoes, fmt: (n) => fmtInt(Math.round(n)), leitura: 'atividade' },
      { label: 'Visitas', ele: sel.visitas, media: equipeMedia.visitas, fmt: (n) => fmtInt(Math.round(n)), leitura: 'visitas' },
      { label: 'Tarefas concluídas', ele: sel.tarefasConcluidas, media: equipeMedia.tarefasConcluidas, fmt: (n) => fmtInt(Math.round(n)), leitura: 'tarefas concluídas' },
      { label: 'Meets', ele: sel.meets, media: equipeMedia.meets, fmt: (n) => fmtInt(Math.round(n)), leitura: 'meets' },
      { label: 'Vendas lançadas', ele: sel.vendasValor, media: equipeMedia.vendasValor, fmt: fmtMoney, leitura: 'vendas' },
    ];
  }, [sel, equipeMedia]);

  const frases = useMemo(() => (sel ? geraLeitura(sel, equipeMedia, metricas) : []), [sel, equipeMedia, metricas]);

  if (corretorRows.length === 0) {
    return (
      <SectionCard title="Individual × Coletivo">
        <EmptyMsg>Nenhum corretor aprovado na imobiliária.</EmptyMsg>
      </SectionCard>
    );
  }

  const pctEmDia = sel && sel.pendentesTotal > 0
    ? ((sel.pendentesTotal - sel.pendentesAtrasadas) / sel.pendentesTotal) * 100
    : null;
  const pctEmDiaEq = equipeMedia.pendentesTotal > 0
    ? ((equipeMedia.pendentesTotal - equipeMedia.pendentesAtrasadas) / equipeMedia.pendentesTotal) * 100
    : null;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Individual × Coletivo"
        right={
          <>
            <span className={`${chipBase} bg-[#9F6BFF]/10 border-[#9F6BFF]/35 text-[#C4A6FF]`}>Ele</span>
            <span className={`${chipBase} bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]`}>Média da equipe</span>
          </>
        }
      >
        <div className="mb-3">
          <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Corretor</label>
          <select
            value={sel?.id || ''}
            onChange={(e) => onSelecionar(e.target.value)}
            className="w-full sm:w-72 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
          >
            {corretorRows.map((r) => (
              <option key={r.id} value={r.id} className="bg-[#12101a]">{r.nome}</option>
            ))}
          </select>
        </div>

        {sel && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {metricas.map((m) => <LinhaComparativa key={m.label} m={m} />)}
            </div>

            {/* Percentuais: funil quente + tarefas em dia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
                <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Leads em etapas quentes</span>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="al-display text-[22px] font-bold text-[#C4A6FF] tabular-nums">{sel.pctQuente !== null ? fmtPct(sel.pctQuente) : '—'}</span>
                  <span className="text-[11px] text-text-secondary tabular-nums">equipe: {equipeMedia.pctQuente !== null ? fmtPct(equipeMedia.pctQuente) : '—'}</span>
                </div>
                <p className="text-[10px] text-text-secondary mt-1">% dos leads ativos dele em Negociação — conversão de funil aproximada.</p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
                <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Tarefas em dia</span>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className={`al-display text-[22px] font-bold tabular-nums ${sel.pendentesAtrasadas > 0 ? 'text-[#FF7A97]' : 'text-emerald-300'}`}>
                    {pctEmDia !== null ? fmtPct(pctEmDia) : '—'}
                  </span>
                  <span className="text-[11px] text-text-secondary tabular-nums">
                    {sel.pendentesTotal > 0
                      ? `${fmtInt(sel.pendentesAtrasadas)} atrasada${sel.pendentesAtrasadas === 1 ? '' : 's'} de ${fmtInt(sel.pendentesTotal)}`
                      : 'sem tarefas pendentes'}
                    {pctEmDiaEq !== null ? ` · equipe: ${fmtPct(pctEmDiaEq)}` : ''}
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary mt-1">Das tarefas pendentes na carteira dele agora, quantas ainda não estouraram o prazo.</p>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* Leitura rápida gerada por regras */}
      {sel && (
        <SectionCard title="Leitura rápida" gold>
          <ul className="space-y-1.5">
            {frases.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-white/85 leading-snug">
                <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-[#E8C547] shrink-0 shadow-[0_0_6px_rgba(232,197,71,0.7)]" />
                {f}
              </li>
            ))}
          </ul>
          <p className="text-[9.5px] text-white/30 mt-2.5">Gerado por regras simples sobre os números do período (±15% da média conta como acima/abaixo).</p>
        </SectionCard>
      )}
    </div>
  );
}
