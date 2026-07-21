'use client';

/**
 * Aba ATIVIDADE — o que cada corretor está fazendo, narrado pelo próprio circuito.
 * Placar de NOTAS (ritmo + resultado + capricho + em dia) + ranking sortável do
 * período + retrato AGORA (fora do período) + drill-down por corretor (vs média
 * da equipe, conversão, capricho da carteira, velocidade, trabalho de bastidor,
 * descartes, disciplina) + "Por que perdemos".
 */

import React, { useMemo, useState } from 'react';
import type { AtividadeMedia, AtividadeRow, ReportComputed } from './computeReport';
import { fmtInt, fmtMoney, fmtPct, fmtSeg, funilCor } from './reportShared';
import { BarraH, EmptyMsg, Medalha, SectionCard, chipBase } from './ui';

const VIOLETA = '#9F6BFF';
const CEU = '#7DD3FC';

type SortKey =
  | 'contatos' | 'semResposta' | 'primeirosContatos' | 'meetsMarcados' | 'meetsFeitos' | 'visitasMarcadas'
  | 'visitasFeitas' | 'negociacoes' | 'vendas' | 'descartes' | 'ligAtiva' | 'manuais';

const COLS: { key: SortKey; label: string; title: string }[] = [
  { key: 'contatos', label: '📞 Contatos', title: 'Tentativas de contato (ligação + WhatsApp)' },
  { key: 'semResposta', label: '📵 Sem resp.', title: 'Tentativas em que o cliente não atendeu' },
  { key: 'primeirosContatos', label: '🎯 1º contatos', title: 'Clientes que atenderam/responderam pela 1ª vez no período — com a média de tentativas que precisou' },
  { key: 'meetsMarcados', label: '📅 Meets marc.', title: 'Meets marcados ou remarcados' },
  { key: 'meetsFeitos', label: '✅ Meets feitos', title: 'Meets realizados' },
  { key: 'visitasMarcadas', label: '🏠 Visitas marc.', title: 'Visitas marcadas ou remarcadas' },
  { key: 'visitasFeitas', label: '✅ Visitas feitas', title: 'Visitas realizadas' },
  { key: 'negociacoes', label: '🤝 Negoc.', title: 'Leads que entraram em negociação / proposta apresentada' },
  { key: 'vendas', label: '🏆 Vendas', title: 'Vendas lançadas no circuito (quantidade e valor)' },
  { key: 'descartes', label: '🗑 Descartes', title: 'Leads descartados no período' },
  { key: 'ligAtiva', label: '☎️ Lig. ativa', title: 'Contatos frios trabalhados → que viraram lead no CRM' },
  { key: 'manuais', label: '↷ Manuais', title: 'Movimentos manuais de etapa — trabalho fora do circuito' },
];

function valorDe(a: AtividadeRow, k: SortKey): number {
  switch (k) {
    case 'contatos': return a.contatos;
    case 'semResposta': return a.semResposta;
    case 'primeirosContatos': return a.primeirosContatos;
    case 'meetsMarcados': return a.meetsMarcados;
    case 'meetsFeitos': return a.meetsFeitos;
    case 'visitasMarcadas': return a.visitasMarcadas;
    case 'visitasFeitas': return a.visitasFeitas;
    case 'negociacoes': return a.negociacoes;
    case 'vendas': return a.vendasValor > 0 ? a.vendasValor : a.vendasQtd;
    case 'descartes': return a.descartes;
    case 'ligAtiva': return a.ligAtivaTrabalhados;
    case 'manuais': return a.manuais;
  }
}

// ---------------------------------------------------------------------------
// Nota geral — cor por faixa + barrinha de componente + "ativo há X"
// ---------------------------------------------------------------------------
const notaCor = (n: number) => (n >= 80 ? '#34D399' : n >= 60 ? '#E8C547' : n >= 40 ? '#FF7A45' : '#FF1E56');

function fmtRelativo(ms: number | null): { texto: string; alerta: boolean } {
  if (ms === null) return { texto: 'sem atividade recente', alerta: true };
  const h = Math.floor((Date.now() - ms) / 3_600_000);
  if (h < 1) return { texto: 'ativo agora', alerta: false };
  if (h < 24) return { texto: `ativo há ${h} h`, alerta: false };
  const d = Math.floor(h / 24);
  return { texto: `parado há ${d} dia${d > 1 ? 's' : ''}`, alerta: d >= 2 };
}

const fmtHoras = (h: number | null): string => {
  if (h === null || !isFinite(h)) return '—';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${(h / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
};

function NotaBar({ label, valor }: { label: string; valor: number | null }) {
  const pct = valor === null ? 0 : (valor / 25) * 100;
  const cor = valor === null ? 'rgba(255,255,255,0.2)' : pct >= 70 ? '#34D399' : pct >= 40 ? '#E8C547' : '#FF1E56';
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-[62px] shrink-0 text-[8.5px] font-extrabold uppercase tracking-wider text-text-secondary">{label}</span>
      <div className="flex-1 h-1.5 rounded bg-white/[0.06] overflow-hidden">
        {valor !== null && <div className="h-full rounded transition-all duration-500" style={{ width: `${Math.max(4, pct)}%`, background: cor, boxShadow: `0 0 6px ${cor}55` }} />}
      </div>
      <span className="w-6 shrink-0 text-right text-[9.5px] font-bold tabular-nums" style={{ color: cor }}>{valor === null ? '—' : Math.round(valor)}</span>
    </div>
  );
}

/** Barras Ele × Equipe (padrão do Individual × Coletivo). */
function LinhaComp({ label, ele, media, fmt }: { label: string; ele: number; media: number; fmt: (n: number) => string }) {
  const max = Math.max(ele, media, 1);
  const barra = (v: number, cor: string) => (
    <div className="h-2 rounded-md bg-white/[0.06] overflow-hidden flex-1">
      <div
        className="h-full rounded-md transition-all duration-500"
        style={{ width: `${Math.max(v > 0 ? 3 : 0, (v / max) * 100)}%`, background: cor, boxShadow: `0 0 8px ${cor}55` }}
      />
    </div>
  );
  return (
    <div>
      <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-text-secondary">{label}</span>
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[8.5px] font-extrabold uppercase tracking-wider text-[#C4A6FF]">Ele</span>
          {barra(ele, VIOLETA)}
          <span className="w-14 shrink-0 text-right al-display text-[12px] font-bold text-white tabular-nums">{fmt(ele)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[8.5px] font-extrabold uppercase tracking-wider text-[#7DD3FC]">Equipe</span>
          {barra(media, CEU)}
          <span className="w-14 shrink-0 text-right text-[11px] font-semibold text-text-secondary tabular-nums">{fmt(media)}</span>
        </div>
      </div>
    </div>
  );
}

/** Funil de conversão pessoal: contatos → meets feitos → visitas feitas → vendas. */
function ConversaoPessoal({ a }: { a: AtividadeRow }) {
  const passos = [
    { label: 'Contatos', n: a.contatos },
    { label: 'Meets feitos', n: a.meetsFeitos },
    { label: 'Visitas feitas', n: a.visitasFeitas },
    { label: 'Vendas', n: a.vendasQtd },
  ];
  const max = Math.max(1, ...passos.map((p) => p.n));
  return (
    <div className="space-y-1.5">
      {passos.map((p, i) => {
        const prev = i > 0 ? passos[i - 1].n : null;
        const pct = prev !== null && prev > 0 ? (p.n / prev) * 100 : null;
        return (
          <div key={p.label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[10px] font-bold text-white/80">{p.label}</span>
            <div className="flex-1"><BarraH pct={(p.n / max) * 100} cor={funilCor(i)} /></div>
            <span className="w-9 shrink-0 text-right al-display text-[12px] font-bold text-white tabular-nums">{fmtInt(p.n)}</span>
            <span className="w-11 shrink-0 text-right text-[9.5px] text-text-secondary tabular-nums">
              {pct !== null ? `${fmtPct(pct)} ↑` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DrillDown({ a, media }: { a: AtividadeRow; media: AtividadeMedia }) {
  const pctCircuito = a.interacoesTotal > 0 ? (a.circuitoQtd / a.interacoesTotal) * 100 : null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 py-1">
      {/* Ele × média da equipe */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Ele × média da equipe</span>
          <span className={`${chipBase} bg-[#9F6BFF]/10 border-[#9F6BFF]/35 text-[#C4A6FF]`}>Ele</span>
          <span className={`${chipBase} bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]`}>Equipe</span>
        </div>
        <div className="space-y-2.5">
          <LinhaComp label="Contatos" ele={a.contatos} media={media.contatos} fmt={(n) => fmtInt(Math.round(n))} />
          <LinhaComp label="1ºs contatos" ele={a.primeirosContatos} media={media.primeirosContatos} fmt={(n) => fmtInt(Math.round(n))} />
          <LinhaComp label="Meets feitos" ele={a.meetsFeitos} media={media.meetsFeitos} fmt={(n) => fmtInt(Math.round(n))} />
          <LinhaComp label="Visitas feitas" ele={a.visitasFeitas} media={media.visitasFeitas} fmt={(n) => fmtInt(Math.round(n))} />
          <LinhaComp label="Negociações" ele={a.negociacoes} media={media.negociacoes} fmt={(n) => fmtInt(Math.round(n))} />
          <LinhaComp label="Vendas (R$)" ele={a.vendasValor} media={media.vendasValor} fmt={fmtMoney} />
        </div>

        {/* Capricho da carteira — o cara tá qualificando e anotando? */}
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">
            📋 Capricho da carteira <span className="normal-case tracking-normal">({fmtInt(a.carteiraAtiva)} leads ativos)</span>
          </span>
          {a.carteiraAtiva === 0 ? (
            <p className="text-[10.5px] text-text-secondary mt-1.5">Sem carteira ativa no momento.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-[10px] font-bold text-white/80">Qualificados</span>
                <div className="flex-1"><BarraH pct={a.qualificadosPct ?? 0} cor="#9F6BFF" /></div>
                <span className="w-24 shrink-0 text-right text-[10.5px] font-bold text-[#C4A6FF] tabular-nums">
                  {fmtPct(a.qualificadosPct ?? 0)} · {(a.qualMediaGrupos ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/7
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-[10px] font-bold text-white/80">Com anotações</span>
                <div className="flex-1"><BarraH pct={a.anotadosPct ?? 0} cor="#7DD3FC" /></div>
                <span className="w-24 shrink-0 text-right text-[10.5px] font-bold text-[#7DD3FC] tabular-nums">{fmtPct(a.anotadosPct ?? 0)}</span>
              </div>
              {a.semRegistro > 0 && (
                <p className="text-[10px] font-bold text-[#FFE9A6]">
                  ⚠️ {fmtInt(a.semRegistro)} lead{a.semRegistro > 1 ? 's' : ''} sem NENHUM registro — nem qualificação, nem anotação.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Conversão pessoal */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
          <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Conversão pessoal</span>
          <div className="mt-2"><ConversaoPessoal a={a} /></div>
        </div>

        {/* Aceite de anúncio + disciplina */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
            <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Aceite de anúncio</span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="al-display text-[18px] font-bold text-white tabular-nums">
                {a.aceites > 0 ? fmtSeg(a.tempoAceiteMedioSeg) : '—'}
              </span>
              <span className="text-[10px] text-text-secondary tabular-nums">
                {a.aceites > 0 ? `${fmtInt(a.aceites)} aceite${a.aceites === 1 ? '' : 's'}` : 'sem aceites no período'}
              </span>
            </div>
            <p className="text-[9.5px] text-text-secondary mt-1">Tempo médio pra aceitar um lead de anúncio.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
            <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Disciplina no circuito</span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className={`al-display text-[18px] font-bold tabular-nums ${pctCircuito !== null && pctCircuito < 60 ? 'text-[#FFE9A6]' : 'text-emerald-300'}`}>
                {pctCircuito !== null ? fmtPct(pctCircuito) : '—'}
              </span>
              <span className={`text-[10px] tabular-nums ${a.manuais > 0 ? 'text-[#FF9EB5]' : 'text-text-secondary'}`}>
                {fmtInt(a.manuais)} mov. manua{a.manuais === 1 ? 'l' : 'is'}
              </span>
            </div>
            <p className="text-[9.5px] text-text-secondary mt-1">% das interações dele nascidas dos pop-ups do circuito.</p>
          </div>
        </div>

        {/* Velocidade & constância + trabalho de bastidor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
            <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">⚡ Velocidade & constância</span>
            <div className="mt-2 space-y-1 text-[10.5px] text-white/80">
              <p>Criou o lead → cliente atendeu: <b className="text-white tabular-nums">{fmtHoras(a.tempo1oContatoMedioHoras)}</b> em média</p>
              <p>Dias com atividade: <b className="text-white tabular-nums">{fmtInt(a.diasAtivos)} de {fmtInt(a.periodoDias)}</b> do período</p>
              <p>Leads gerados por conta própria: <b className="text-white tabular-nums">{fmtInt(a.geracaoPropria)}</b> no período</p>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
            <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">🔧 Trabalho de bastidor</span>
            <div className="mt-2 space-y-1 text-[10.5px] text-white/80">
              <p>Requalificações registradas: <b className="text-white tabular-nums">{fmtInt(a.requalificacoes)}</b></p>
              <p>Buscas de imóvel pra oferecer: <b className="text-white tabular-nums">{fmtInt(a.buscasProduto)}</b></p>
              <p>Agendamentos com observação 📝: <b className="text-white tabular-nums">{fmtInt(a.comObservacao)}</b></p>
            </div>
          </div>
        </div>

        {/* Descartes por motivo */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
          <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Descartes dele por motivo</span>
          {a.descartesMotivos.length === 0 ? (
            <p className="text-[10.5px] text-text-secondary mt-1.5">Nenhum descarte no período.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {a.descartesMotivos.map((m, i) => (
                <div key={m.motivo} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-[10px] text-white/80 truncate" title={m.motivo}>{m.motivo}</span>
                  <div className="flex-1"><BarraH pct={(m.count / a.descartesMotivos[0].count) * 100} cor={funilCor(i)} /></div>
                  <span className="w-6 shrink-0 text-right al-display text-[12px] font-bold text-white tabular-nums">{fmtInt(m.count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgoraChip({ n, label, tone }: { n: number; label: string; tone: 'red' | 'amber' }) {
  const cls = n === 0
    ? 'bg-white/[0.03] border-white/[0.08] text-white/30'
    : tone === 'red'
      ? 'bg-red-500/10 border-red-500/40 text-red-300'
      : 'bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6]';
  return <span className={`${chipBase} ${cls} tabular-nums whitespace-nowrap`}>{fmtInt(n)} {label}</span>;
}

export default function AtividadeTab({ report }: { report: ReportComputed }) {
  const { rows, media, motivosGlobal, descartesTotal } = report.atividade;
  const [sortKey, setSortKey] = useState<SortKey>('contatos');
  const [aberto, setAberto] = useState<string | null>(null);

  const ordenadas = useMemo(
    () => [...rows].sort((a, b) => {
      const va = valorDe(a, sortKey);
      const vb = valorDe(b, sortKey);
      if (va !== vb) return vb - va;
      return b.contatos - a.contatos; // desempate: quem tentou mais contato
    }),
    [rows, sortKey]
  );

  const porNota = useMemo(() => [...rows].sort((a, b) => b.nota - a.nota || b.contatos - a.contatos), [rows]);

  const agoraOrdenado = useMemo(
    () => [...rows].sort((a, b) =>
      (b.agora.atrasadas * 2 + b.agora.semAcao + b.agora.negociacaoParada + b.agora.semPrimeiroContato)
      - (a.agora.atrasadas * 2 + a.agora.semAcao + a.agora.negociacaoParada + a.agora.semPrimeiroContato)),
    [rows]
  );
  const temPendencia = rows.some((r) => r.agora.atrasadas > 0 || r.agora.semAcao > 0 || r.agora.negociacaoParada > 0 || r.agora.semPrimeiroContato > 0);

  const thBase = 'px-2 py-2 text-[9.5px] font-extrabold uppercase tracking-[0.1em] whitespace-nowrap cursor-pointer select-none transition-colors';

  return (
    <div className="space-y-4">
      {/* 0. Placar de notas — a visão de bater o olho */}
      <SectionCard
        title="Nota do período — quem tá jogando o jogo"
        gold
        right={<span className="text-[10px] text-text-secondary">clique no corretor pra abrir o raio-x completo lá embaixo</span>}
      >
        {porNota.length === 0 ? (
          <EmptyMsg>Nenhum corretor aprovado na imobiliária.</EmptyMsg>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {porNota.map((a, i) => {
                const rel = fmtRelativo(a.ultimaAtividadeMs);
                const expandido = aberto === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAberto(expandido ? null : a.id)}
                    className={`text-left rounded-xl border p-3 transition-colors ${
                      expandido ? 'border-[#FF1E56]/50 bg-[#FF1E56]/[0.05]' : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Medalha pos={i + 1} />
                      <span className="flex-1 min-w-0 truncate text-[12.5px] font-bold text-white" title={a.nome}>{a.nome}</span>
                      <span className="al-display text-[24px] font-bold tabular-nums leading-none" style={{ color: notaCor(a.nota) }}>{a.nota}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[9.5px] text-text-secondary">
                      <span className="tabular-nums">{fmtInt(a.carteiraAtiva)} na carteira</span>
                      <span className="text-white/20">·</span>
                      <span className={rel.alerta ? 'font-bold text-[#FF9EB5]' : 'text-emerald-300/80'}>{rel.texto}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <NotaBar label="Ritmo" valor={a.notaPartes.ritmo} />
                      <NotaBar label="Resultado" valor={a.notaPartes.resultado} />
                      <NotaBar label="Capricho" valor={a.notaPartes.capricho} />
                      <NotaBar label="Em dia" valor={a.notaPartes.emDia} />
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[9.5px] text-white/30 mt-2.5">
              Nota 0–100 com 4 pesos iguais: <b className="text-white/50">Ritmo</b> = volume de ações vs o melhor da equipe ·
              <b className="text-white/50"> Resultado</b> = meets/visitas feitos, negociações, vendas e 1ºs contatos vs o melhor ·
              <b className="text-white/50"> Capricho</b> = carteira qualificada (60%) + anotada (40%) ·
              <b className="text-white/50"> Em dia</b> = desconta tarefa atrasada e lead sem próxima ação.
              Componente sem amostra (ex.: carteira vazia) sai da conta — corretor novo não é punido.
            </p>
          </>
        )}
      </SectionCard>

      {/* 1. Ranking de atividade do período */}
      <SectionCard
        title="Ritmo por corretor"
        right={<span className="text-[10px] text-text-secondary">clique numa coluna pra ordenar · clique no corretor pra abrir o raio-x</span>}
      >
        {ordenadas.length === 0 ? (
          <EmptyMsg>Nenhum corretor aprovado na imobiliária.</EmptyMsg>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-2 py-2 text-left text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-text-secondary">Corretor</th>
                  {COLS.map((c) => (
                    <th
                      key={c.key}
                      title={c.title}
                      onClick={() => setSortKey(c.key)}
                      className={`${thBase} text-right ${sortKey === c.key ? 'text-[#FF9EB5]' : 'text-text-secondary hover:text-white'}`}
                    >
                      {c.label} {sortKey === c.key ? '▼' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((a, i) => {
                  const expandido = aberto === a.id;
                  return (
                    <React.Fragment key={a.id}>
                      <tr
                        onClick={() => setAberto(expandido ? null : a.id)}
                        className={`border-b border-white/[0.05] cursor-pointer transition-colors ${expandido ? 'bg-white/[0.05]' : 'hover:bg-white/[0.04]'}`}
                      >
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Medalha pos={i + 1} />
                            <span className="text-[12px] font-bold text-white truncate max-w-[140px]">{a.nome}</span>
                            <span className={`text-[9px] shrink-0 transition-transform ${expandido ? 'rotate-90 text-[#FF9EB5]' : 'text-white/30'}`}>▶</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right al-display text-[12.5px] font-bold text-white tabular-nums">{fmtInt(a.contatos)}</td>
                        <td className={`px-2 py-2.5 text-right text-[12px] tabular-nums ${a.semResposta > 0 ? 'text-[#FFE9A6]' : 'text-text-secondary'}`}>{fmtInt(a.semResposta)}</td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap">
                          {a.primeirosContatos > 0 ? (
                            <>
                              <span className="al-display text-[12.5px] font-bold text-[#7DD3FC] tabular-nums">{fmtInt(a.primeirosContatos)}</span>
                              {a.tentativasMediaPrimeiroContato !== null && (
                                <span className="text-[10px] text-[#7DD3FC]/70 tabular-nums"> · {a.tentativasMediaPrimeiroContato.toFixed(1).replace('.', ',')} tent.</span>
                              )}
                            </>
                          ) : (
                            <span className="text-[12px] text-text-secondary">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right al-display text-[12.5px] font-bold text-white tabular-nums">{fmtInt(a.meetsMarcados)}</td>
                        <td className="px-2 py-2.5 text-right al-display text-[12.5px] font-bold text-emerald-300 tabular-nums">{fmtInt(a.meetsFeitos)}</td>
                        <td className="px-2 py-2.5 text-right al-display text-[12.5px] font-bold text-white tabular-nums">{fmtInt(a.visitasMarcadas)}</td>
                        <td className="px-2 py-2.5 text-right al-display text-[12.5px] font-bold text-emerald-300 tabular-nums">{fmtInt(a.visitasFeitas)}</td>
                        <td className="px-2 py-2.5 text-right al-display text-[12.5px] font-bold text-white tabular-nums">{fmtInt(a.negociacoes)}</td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap">
                          {a.vendasQtd > 0 ? (
                            <>
                              <span className="al-display text-[12.5px] font-bold text-[#FFE9A6] tabular-nums">{fmtInt(a.vendasQtd)}</span>
                              <span className="text-[10px] text-[#FFE9A6]/70 tabular-nums"> · {fmtMoney(a.vendasValor)}</span>
                            </>
                          ) : (
                            <span className="text-[12px] text-text-secondary">—</span>
                          )}
                        </td>
                        <td className={`px-2 py-2.5 text-right text-[12px] tabular-nums ${a.descartes > 0 ? 'text-[#FF9EB5]' : 'text-text-secondary'}`}>{fmtInt(a.descartes)}</td>
                        <td className="px-2 py-2.5 text-right text-[11.5px] tabular-nums whitespace-nowrap">
                          {a.ligAtivaTrabalhados > 0 ? (
                            <>
                              <span className="font-bold text-white">{fmtInt(a.ligAtivaTrabalhados)}</span>
                              <span className="text-text-secondary"> → </span>
                              <span className="font-bold text-emerald-300">{fmtInt(a.ligAtivaCrm)}</span>
                            </>
                          ) : (
                            <span className="text-text-secondary">—</span>
                          )}
                        </td>
                        <td className={`px-2 py-2.5 text-right text-[12px] tabular-nums ${a.manuais > 0 ? 'font-bold text-[#FF9EB5]' : 'text-text-secondary'}`}>{fmtInt(a.manuais)}</td>
                      </tr>
                      {expandido && (
                        <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                          <td colSpan={COLS.length + 1} className="px-2 py-3">
                            <DrillDown a={a} media={media} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[9.5px] text-white/30 mt-2">
              Números narrados pelo circuito no período selecionado. ☎️ Lig. ativa = contatos frios trabalhados → que viraram lead no CRM. ↷ Manuais = movimentos de etapa fora do circuito.
            </p>
          </div>
        )}
      </SectionCard>

      {/* 2. Retrato AGORA — fora do período */}
      <SectionCard
        title="Agora — quem precisa agir"
        gold
        right={<span className="text-[10px] text-text-secondary">retrato de agora · não obedece ao período</span>}
      >
        {rows.length === 0 ? (
          <EmptyMsg>Nenhum corretor aprovado na imobiliária.</EmptyMsg>
        ) : !temPendencia ? (
          <EmptyMsg>Ninguém com pendência agora — todo lead ativo tem próxima ação agendada e nenhuma tarefa estourou o prazo.</EmptyMsg>
        ) : (
          <div className="space-y-1.5">
            {agoraOrdenado.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2">
                <span className="text-[12px] font-bold text-white min-w-[120px] truncate">{a.nome}</span>
                <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                  <AgoraChip n={a.agora.atrasadas} label={`tarefa${a.agora.atrasadas === 1 ? '' : 's'} atrasada${a.agora.atrasadas === 1 ? '' : 's'}`} tone="red" />
                  <AgoraChip n={a.agora.semAcao} label="sem próxima ação" tone="amber" />
                  <AgoraChip n={a.agora.negociacaoParada} label={`parado${a.agora.negociacaoParada === 1 ? '' : 's'} em negociação`} tone="red" />
                  <AgoraChip n={a.agora.semPrimeiroContato} label="esperando 1º contato" tone="amber" />
                </div>
              </div>
            ))}
            <p className="text-[9.5px] text-white/30 pt-1">
              Tarefas atrasadas = prazo estourado (hora real). Sem próxima ação = lead em etapa ativa do circuito (Entrada → Negociação) sem nenhuma tarefa pendente.
              Esperando 1º contato = leads em Entrada/Follow-up cujo cliente ainda não atendeu nem respondeu (o rodízio de insistência tá rolando — ou parado).
            </p>
          </div>
        )}
      </SectionCard>

      {/* 4. Por que perdemos — descartes do período por motivo */}
      <SectionCard
        title="Por que perdemos"
        right={<span className="text-[10px] text-text-secondary tabular-nums">{fmtInt(descartesTotal)} descarte{descartesTotal === 1 ? '' : 's'} no período · toda a equipe</span>}
      >
        {motivosGlobal.length === 0 ? (
          <EmptyMsg>Nenhum descarte registrado no período — nada perdido, nada a lamentar.</EmptyMsg>
        ) : (
          <div className="space-y-2">
            {motivosGlobal.map((m, i) => (
              <div key={m.motivo} className="flex items-center gap-2.5">
                <span className="w-36 sm:w-44 shrink-0 text-[11px] text-white/85 truncate" title={m.motivo}>{m.motivo}</span>
                <div className="flex-1"><BarraH pct={(m.count / motivosGlobal[0].count) * 100} cor={funilCor(i)} /></div>
                <span className="w-8 shrink-0 text-right al-display text-[13px] font-bold text-white tabular-nums">{fmtInt(m.count)}</span>
                <span className="w-10 shrink-0 text-right text-[10px] text-text-secondary tabular-nums">
                  {descartesTotal > 0 ? fmtPct((m.count / descartesTotal) * 100) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
