'use client';

/**
 * Relatórios do admin — números reais da imobiliária, comparativos por corretor
 * e SELETOR de quem entra na conta (pra tirar CRM de proprietário/parado).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  useRelatorioData, computeRelatorio, type Periodo, type RankingRow,
  fmtPct, fmtPct1, fmtDias, fmtNum, fmtSeg, fmtMoeda,
} from './logic';

const LS_SEL = 'relatorio_corretores_sel';
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'mes', label: 'Este mês' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
];

// ── blocos de UI ────────────────────────────────────────────────────────────
function Kpi({ label, valor, hint, tom }: { label: string; valor: string; hint?: string; tom?: 'bom' | 'ruim' | 'neutro' }) {
  const cor = tom === 'bom' ? 'text-emerald-300' : tom === 'ruim' ? 'text-rose-300' : 'text-white';
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
      <p className={`al-display text-[24px] font-bold leading-tight mt-1 ${cor}`}>{valor}</p>
      {hint && <p className="text-[11px] text-text-secondary mt-0.5">{hint}</p>}
    </div>
  );
}

function Secao({ titulo, children, sub }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="al-card relative overflow-hidden p-4 sm:p-5">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <div className="mb-3">
        <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.1em]">{titulo}</h2>
        {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Barra({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(pct * 100))}%`, background: cor }} />
    </div>
  );
}

// colunas do ranking (chave → como extrair o número pra ordenar)
type ColDef = { key: string; label: string; get: (r: RankingRow) => number | null; fmt: (r: RankingRow) => string; tomInverso?: boolean };

export default function RelatoriosPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;
  const ativo = !!imobiliariaId && !isEspelhoDemo;
  const { leads, corretores, ads, loading, error } = useRelatorioData(imobiliariaId, ativo);

  const [periodo, setPeriodo] = useState<Periodo>('tudo');
  const [sel, setSel] = useState<Set<string> | null>(null);
  const [sortKey, setSortKey] = useState<string>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [seletorAberto, setSeletorAberto] = useState(false);

  // leads por corretor (pro seletor)
  const leadsPorUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of leads) if (l.userId) m.set(l.userId, (m.get(l.userId) || 0) + 1);
    return m;
  }, [leads]);

  // default: corretores aprovados (exclui proprietário/imobiliaria e não-aprovados)
  const defaultSel = useMemo(
    () => corretores.filter((c) => c.aprovado && (c.tipoConta || '').startsWith('corretor')).map((c) => c.id),
    [corretores]
  );

  // inicializa seleção (localStorage ou default) quando os corretores chegam
  useEffect(() => {
    if (sel !== null || corretores.length === 0) return;
    try {
      const raw = localStorage.getItem(LS_SEL);
      if (raw) {
        const ids = (JSON.parse(raw) as string[]).filter((id) => corretores.some((c) => c.id === id));
        setSel(new Set(ids.length ? ids : defaultSel));
        return;
      }
    } catch { /* ignore */ }
    setSel(new Set(defaultSel));
  }, [corretores, defaultSel, sel]);

  const salvarSel = (novo: Set<string>) => {
    setSel(novo);
    try { localStorage.setItem(LS_SEL, JSON.stringify(Array.from(novo))); } catch { /* ignore */ }
  };
  const toggle = (id: string) => {
    const novo = new Set(sel || []);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    salvarSel(novo);
  };

  const rel = useMemo(
    () => computeRelatorio(leads, corretores, ads, sel || new Set(), periodo),
    [leads, corretores, ads, sel, periodo]
  );

  const colunas: ColDef[] = [
    { key: 'total', label: 'Leads', get: (r) => r.total, fmt: (r) => String(r.total) },
    { key: 'conversao', label: 'Conv.', get: (r) => r.conversao, fmt: (r) => fmtPct1(r.conversao) },
    { key: 'fechados', label: 'Fech.', get: (r) => r.fechados, fmt: (r) => String(r.fechados) },
    { key: 'taxaDescarte', label: 'Desc.%', get: (r) => r.taxaDescarte, fmt: (r) => fmtPct(r.taxaDescarte), tomInverso: true },
    { key: 'tempo1oContato', label: '1º contato', get: (r) => r.tempo1oContato, fmt: (r) => fmtDias(r.tempo1oContato), tomInverso: true },
    { key: 'tentativasMed', label: 'Tent.', get: (r) => r.tentativasMed, fmt: (r) => fmtNum(r.tentativasMed) },
    { key: 'qualifPct', label: 'Qualif%', get: (r) => r.qualifPct, fmt: (r) => fmtPct(r.qualifPct) },
    { key: 'anotPct', label: 'Anot%', get: (r) => r.anotPct, fmt: (r) => fmtPct(r.anotPct) },
    { key: 'estagnados', label: 'Estag.', get: (r) => r.estagnados, fmt: (r) => String(r.estagnados), tomInverso: true },
    { key: 'meetsGerados', label: 'Meets', get: (r) => r.meetsGerados, fmt: (r) => String(r.meetsGerados) },
    { key: 'visitasGeradas', label: 'Visitas', get: (r) => r.visitasGeradas, fmt: (r) => String(r.visitasGeradas) },
    { key: 'noShowMeet', label: 'No-show', get: (r) => r.noShowMeet, fmt: (r) => String(r.noShowMeet), tomInverso: true },
    { key: 'respostaAdsMed', label: 'Resp. ads', get: (r) => r.respostaAdsMed, fmt: (r) => fmtSeg(r.respostaAdsMed), tomInverso: true },
    { key: 'negou', label: 'Negou', get: (r) => r.negou, fmt: (r) => String(r.negou) },
  ];

  const rankingOrdenado = useMemo(() => {
    const col = colunas.find((c) => c.key === sortKey) || colunas[0];
    const arr = [...rel.ranking];
    arr.sort((a, b) => {
      const va = col.get(a), vb = col.get(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rel.ranking, sortKey, sortDir]);

  const clicarColuna = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  // ── estados de borda ──
  if (isEspelhoDemo) {
    return (
      <div className="max-w-3xl mx-auto mt-10 px-4">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="al-card p-10 mt-3 text-center">
          <p className="text-[40px] mb-2">📊</p>
          <p className="text-sm text-text-secondary">Os relatórios usam os dados reais da imobiliária — indisponíveis no modo demonstração.</p>
        </div>
      </div>
    );
  }

  const selCount = sel?.size || 0;
  const totalConsiderado = rel.kpis.total;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      {/* Cabeçalho + filtros */}
      <div className="flex flex-col gap-3">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Relatórios</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {loading ? 'Carregando…' : `${totalConsiderado} leads · ${selCount} corretor(es) na conta`}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/10 p-1">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${periodo === p.id ? 'bg-white/[0.10] text-white' : 'text-text-secondary hover:text-white'}`}
              >{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Seletor de corretores */}
      <div className="al-card relative overflow-hidden p-4">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <button onClick={() => setSeletorAberto((v) => !v)} className="w-full flex items-center justify-between gap-2">
          <div className="text-left">
            <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em]">Quem entra na conta</h2>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {selCount} selecionado(s) · desmarque o CRM do proprietário ou de quem não usa
            </p>
          </div>
          <span className="text-text-secondary text-lg">{seletorAberto ? '▲' : '▼'}</span>
        </button>

        {seletorAberto && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => salvarSel(new Set(defaultSel))} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.05] hover:bg-white/[0.1] text-text-secondary hover:text-white transition-colors">Só corretores ativos</button>
              <button onClick={() => salvarSel(new Set(corretores.map((c) => c.id)))} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.05] hover:bg-white/[0.1] text-text-secondary hover:text-white transition-colors">Todos</button>
              <button onClick={() => salvarSel(new Set())} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.05] hover:bg-white/[0.1] text-text-secondary hover:text-white transition-colors">Limpar</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {[...corretores].sort((a, b) => (leadsPorUser.get(b.id) || 0) - (leadsPorUser.get(a.id) || 0)).map((c) => {
                const marcado = sel?.has(c.id) || false;
                const ehDono = c.tipoConta === 'imobiliaria';
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${marcado ? 'bg-emerald-500/[0.08] border-emerald-500/40' : 'bg-white/[0.02] border-white/10 hover:border-white/25'}`}
                  >
                    <span className={`shrink-0 grid place-items-center w-4 h-4 rounded border ${marcado ? 'bg-emerald-400 border-emerald-400 text-[#0d2a38]' : 'border-white/30 text-transparent'}`}>✓</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-white truncate">{c.nome}</span>
                      <span className="block text-[10px] text-text-secondary">
                        {leadsPorUser.get(c.id) || 0} leads
                        {ehDono && <span className="ml-1 text-amber-300">· proprietário</span>}
                        {c.aprovado === false && <span className="ml-1 text-rose-300">· não aprovado</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && <div className="al-card p-4 text-rose-300 text-sm">Erro: {error}</div>}
      {loading && <div className="al-card p-8 text-center text-text-secondary">Carregando dados…</div>}

      {!loading && (
        <>
          {/* 1. Visão geral */}
          <Secao titulo="Visão geral" sub="Do conjunto selecionado, no período escolhido">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              <Kpi label="Leads" valor={String(rel.kpis.total)} />
              <Kpi label="Ativos" valor={String(rel.kpis.ativos)} hint="fora de fechados/descartados" />
              <Kpi label="Fechados" valor={String(rel.kpis.fechados)} tom="bom" />
              <Kpi label="Conversão" valor={fmtPct1(rel.kpis.conversao)} tom="bom" />
              <Kpi label="Descartados" valor={`${rel.kpis.descartados}`} hint={fmtPct(rel.kpis.taxaDescarte)} tom="ruim" />
              <Kpi label="1º contato (méd)" valor={fmtDias(rel.kpis.tempoMedio1oContato)} hint="entrada → 1ª conversa" />
              <Kpi label="Qualificação" valor={fmtPct(rel.kpis.indiceQualif)} hint="leads com qualificação" />
              <Kpi label="Anotação" valor={fmtPct(rel.kpis.indiceAnot)} hint="leads com anotação" />
              <Kpi label="Estagnados" valor={String(rel.kpis.estagnados)} hint="ativos parados +14d" tom="ruim" />
              <Kpi label="Faturamento" valor={rel.kpis.faturamento > 0 ? fmtMoeda(rel.kpis.faturamento) : '—'} hint={rel.kpis.fechadosComValor ? `${rel.kpis.fechadosComValor} c/ valor` : 'registre o valor na venda'} />
              <Kpi label="Ticket médio" valor={rel.kpis.ticket > 0 ? fmtMoeda(rel.kpis.ticket) : '—'} />
              <Kpi label="Leads perdidos (ads)" valor={String(rel.kpis.leadsPerdidos)} hint="ninguém aceitou" tom="ruim" />
            </div>
          </Secao>

          {/* 2. Funil */}
          <Secao titulo="Funil" sub="Quantos já ALCANÇARAM cada etapa (catraca) e quantos estão nela agora">
            <div className="space-y-2">
              {rel.funil.map((f) => (
                <div key={f.etapa} className="flex items-center gap-3">
                  <span className="w-28 sm:w-32 shrink-0 text-[12px] text-text-secondary truncate">{f.etapa}</span>
                  <div className="flex-1"><Barra pct={f.pct} cor="linear-gradient(90deg,#7C5CFF,#B48CFF)" /></div>
                  <span className="w-14 text-right text-[12px] font-bold text-white tabular-nums">{f.alcancaram}</span>
                  <span className="w-10 text-right text-[11px] text-text-secondary tabular-nums">{fmtPct(f.pct)}</span>
                  <span className="w-16 text-right text-[11px] text-text-secondary tabular-nums hidden sm:block">{f.agora} agora</span>
                </div>
              ))}
            </div>
          </Secao>

          {/* 3. Ranking de corretores */}
          <Secao titulo="Comparativo por corretor" sub="Clique num cabeçalho pra ordenar. Só entram os selecionados acima.">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="text-text-secondary">
                    <th className="text-left font-bold px-2 py-2 sticky left-0 bg-[#12101a]">Corretor</th>
                    {colunas.map((c) => (
                      <th key={c.key} onClick={() => clicarColuna(c.key)} className={`px-2 py-2 text-right font-bold cursor-pointer whitespace-nowrap hover:text-white ${sortKey === c.key ? 'text-white' : ''}`}>
                        {c.label}{sortKey === c.key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankingOrdenado.map((r) => (
                    <tr key={r.id} className="border-t border-white/[0.06]">
                      <td className="px-2 py-2 sticky left-0 bg-[#12101a]">
                        <span className="font-semibold text-white whitespace-nowrap">{r.nome}</span>
                        {r.tipoConta === 'imobiliaria' && <span className="ml-1 text-[9px] text-amber-300">prop.</span>}
                      </td>
                      {colunas.map((c) => (
                        <td key={c.key} className="px-2 py-2 text-right tabular-nums text-white/90 whitespace-nowrap">{c.fmt(r)}</td>
                      ))}
                    </tr>
                  ))}
                  {rankingOrdenado.length === 0 && (
                    <tr><td colSpan={colunas.length + 1} className="px-2 py-6 text-center text-text-secondary">Nenhum corretor selecionado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] text-text-secondary">
              Legenda: <b>Conv.</b> fechados÷leads · <b>1º contato</b> tempo entrada→conversa · <b>Qualif/Anot%</b> preenchimento · <b>Estag.</b> parados +14d · <b>Meets/Visitas</b> gerados (catraca) · <b>No-show</b> marcou meet e travou · <b>Resp. ads</b> tempo até aceitar · <b>Negou</b> leads recusados.
            </p>
          </Secao>

          {/* 4. Comportamento / bandeiras */}
          <Secao titulo="Comportamento & qualidade" sub="Sinais de quem trabalha o lead vs quem empurra pra frente">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-2">🚩 Avançou sem qualificar</p>
                <p className="text-[11px] text-text-secondary mb-2">Leads que passaram de Meet mas estão SEM qualificação — sinal de empurrar o trabalho.</p>
                {[...rel.ranking].filter((r) => r.semQualifAvancado > 0).sort((a, b) => b.semQualifAvancado - a.semQualifAvancado).slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-1 border-t border-white/[0.06] text-[12px]">
                    <span className="text-white/90 truncate">{r.nome}</span>
                    <span className="font-bold text-amber-300 tabular-nums">{r.semQualifAvancado}</span>
                  </div>
                ))}
                {rel.ranking.every((r) => r.semQualifAvancado === 0) && <p className="text-[12px] text-text-secondary">Ninguém — todos qualificam. ✓</p>}
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-300 mb-2">⚡ Descartes rápidos</p>
                <p className="text-[11px] text-text-secondary mb-2">Descartou com ≤1 tentativa — pode estar se livrando do lead.</p>
                {[...rel.ranking].filter((r) => r.descartesRapidos > 0).sort((a, b) => b.descartesRapidos - a.descartesRapidos).slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-1 border-t border-white/[0.06] text-[12px]">
                    <span className="text-white/90 truncate">{r.nome}</span>
                    <span className="font-bold text-rose-300 tabular-nums">{r.descartesRapidos}</span>
                  </div>
                ))}
                {rel.ranking.every((r) => r.descartesRapidos === 0) && <p className="text-[12px] text-text-secondary">Nenhum descarte precipitado. ✓</p>}
              </div>
            </div>
          </Secao>

          {/* 5. Anúncios */}
          <Secao titulo="Anúncios & distribuição" sub="Leads que vieram de campanha (Meta)">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
              <Kpi label="Total ads" valor={String(rel.ads.total)} />
              <Kpi label="Aceitos" valor={String(rel.ads.aceitos)} tom="bom" />
              <Kpi label="Taxa aceite" valor={fmtPct(rel.ads.taxaAceite)} />
              <Kpi label="Tempo aceite" valor={fmtSeg(rel.ads.tempoMedioAceite)} />
              <Kpi label="Via geral" valor={fmtPct(rel.ads.viaGeralPct)} hint="não pego no exclusivo" />
              <Kpi label="Perdidos" valor={String(rel.ads.naoAtendido)} tom="ruim" />
            </div>
            {rel.ads.porCampanha.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Por campanha</p>
                {rel.ads.porCampanha.map((c) => (
                  <div key={c.nome} className="flex items-center justify-between text-[12px] py-1 border-t border-white/[0.06]">
                    <span className="text-white/90 truncate pr-2">{c.nome}</span>
                    <span className="text-text-secondary tabular-nums shrink-0">{c.aceitos}/{c.total} aceitos</span>
                  </div>
                ))}
              </div>
            )}
          </Secao>

          {/* 6. Inteligência de mercado */}
          <Secao titulo="Inteligência de mercado" sub="O que os leads mais procuram (da qualificação)">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rel.mercado.filter((m) => m.respondidos > 0).map((m) => {
                const maxc = m.opcoes[0]?.count || 1;
                return (
                  <div key={m.key} className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white mb-2">{m.title} <span className="text-text-secondary font-normal">· {m.respondidos}</span></p>
                    <div className="space-y-1.5">
                      {m.opcoes.slice(0, 5).map((o) => (
                        <div key={o.label} className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-[11px] text-text-secondary truncate">{o.label}</span>
                          <div className="flex-1"><Barra pct={o.count / maxc} cor="linear-gradient(90deg,#2DD4BF,#5EEAD4)" /></div>
                          <span className="w-7 text-right text-[11px] font-bold text-white tabular-nums">{o.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {rel.mercado.every((m) => m.respondidos === 0) && <p className="text-[12px] text-text-secondary">Ainda sem qualificações preenchidas no período.</p>}
            </div>
          </Secao>

          {/* 7. Origem */}
          <Secao titulo="Origem dos leads" sub="De onde vêm — e quais origens fecham">
            <div className="space-y-1.5">
              {rel.origem.slice(0, 15).map((o) => {
                const max = rel.origem[0]?.count || 1;
                return (
                  <div key={o.origem} className="flex items-center gap-3">
                    <span className="w-40 sm:w-52 shrink-0 text-[12px] text-text-secondary truncate">{o.origem}</span>
                    <div className="flex-1"><Barra pct={o.count / max} cor="linear-gradient(90deg,#F59E0B,#FBBF24)" /></div>
                    <span className="w-12 text-right text-[12px] font-bold text-white tabular-nums">{o.count}</span>
                    <span className="w-16 text-right text-[10px] text-emerald-300/80 tabular-nums">{o.fechados} fech.</span>
                  </div>
                );
              })}
            </div>
          </Secao>
        </>
      )}
    </div>
  );
}
