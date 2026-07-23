'use client';

/**
 * Gestão de Corretores — cada corretor vira um card com Score de Saúde (semáforo)
 * que expande num scorecard completo: dimensões, alertas, dica de cobrança e
 * funil pessoal. Seletor de quem entra na conta + período. Mercado/origem embaixo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ETAPAS_CIRCUITO } from '@/lib/circuito';
import {
  useRelatorioData, useAtividade, computeRelatorio, type Periodo, type RankingRow,
  fmtPct, fmtPct1, fmtDias, fmtDiasInt, fmtNum, fmtSeg, fmtMoeda,
} from './logic';

const LS_SEL = 'relatorio_corretores_sel';
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'tudo', label: 'Tudo' }, { id: 'mes', label: 'Mês' }, { id: '30d', label: '30d' }, { id: '90d', label: '90d' },
];
const CORES = {
  verde: { txt: 'text-emerald-300', bg: 'bg-emerald-500/15', bd: 'border-emerald-500/40', bar: '#34D399' },
  amarelo: { txt: 'text-amber-300', bg: 'bg-amber-500/15', bd: 'border-amber-500/40', bar: '#FBBF24' },
  vermelho: { txt: 'text-rose-300', bg: 'bg-rose-500/15', bd: 'border-rose-500/40', bar: '#FB7185' },
};
const corDe = (v: number) => (v >= 70 ? '#34D399' : v >= 45 ? '#FBBF24' : '#FB7185');

function Barra({ pct, cor, alt = 'h-1.5' }: { pct: number; cor: string; alt?: string }) {
  return (
    <div className={`${alt} rounded-full bg-white/[0.07] overflow-hidden`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(100, Math.round(pct * 100)))}%`, background: cor }} />
    </div>
  );
}
function Metric({ label, valor, tom }: { label: string; valor: string; tom?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-text-secondary">{label}</p>
      <p className={`text-[15px] font-bold tabular-nums leading-tight ${tom || 'text-white'}`}>{valor}</p>
    </div>
  );
}

// ── Card de corretor (colapsado + scorecard expandido) ────────────────────────
function CorretorCard({ r, rank, aberto, onToggle, comAtividade }: { r: RankingRow; rank: number; aberto: boolean; onToggle: () => void; comAtividade: boolean }) {
  const c = CORES[r.cor];
  const dims: { nome: string; v: number | null; hint: string }[] = [
    { nome: 'Atividade', v: r.sub.atividade, hint: fmtDiasInt(r.diasSemAtividade) },
    { nome: 'Velocidade', v: r.sub.velocidade, hint: `1º contato ${fmtDias(r.tempo1oContato)}` },
    { nome: 'Conversão', v: r.sub.conversao, hint: `${fmtPct1(r.conversao)} · ${r.fechados} fech.` },
    { nome: 'Qualidade', v: r.sub.qualidade, hint: `qualif ${fmtPct(r.qualifPct)} · anot ${fmtPct(r.anotPct)}` },
    { nome: 'Higiene', v: r.sub.higiene, hint: `desc ${fmtPct(r.taxaDescarte)}` },
  ];
  const alertas: string[] = [];
  if (comAtividade && r.diasSemAtividade !== null && r.diasSemAtividade > 7) alertas.push(`😴 Sumido há ${fmtDiasInt(r.diasSemAtividade)}`);
  if (r.semQualifAvancado > 0) alertas.push(`🚩 ${r.semQualifAvancado} lead(s) avançado(s) sem qualificar`);
  if (r.descartesRapidos > 0) alertas.push(`⚡ ${r.descartesRapidos} descarte(s) com ≤1 tentativa`);
  if (comAtividade && r.leadsSemToque > 0) alertas.push(`📵 ${r.leadsSemToque} lead(s) ativo(s) sem toque +7d`);
  if (r.estagnados > 0) alertas.push(`🧊 ${r.estagnados} lead(s) parado(s) +14d`);
  if (r.noShowMeet > 0) alertas.push(`📅 ${r.noShowMeet} meet(s) marcado(s) que não aconteceram`);

  const statusChip = !comAtividade || r.diasSemAtividade === null ? null
    : r.diasSemAtividade <= 1 ? <span className="text-[10px] font-bold text-emerald-300">● ativo hoje</span>
    : r.diasSemAtividade <= 7 ? <span className="text-[10px] font-bold text-amber-300">● há {fmtDiasInt(r.diasSemAtividade)}</span>
    : <span className="text-[10px] font-bold text-rose-300">● sumido</span>;

  const maxEt = Math.max(1, ...ETAPAS_CIRCUITO.map((e) => r.porEtapa[e] || 0));

  return (
    <div className={`rounded-2xl border ${aberto ? c.bd : 'border-white/10'} bg-white/[0.02] overflow-hidden transition-colors`}>
      {/* linha colapsada */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02]">
        <span className="shrink-0 w-6 text-center text-[12px] font-bold text-text-secondary">{rank}</span>
        <span className={`shrink-0 grid place-items-center w-11 h-11 rounded-full border ${c.bd} ${c.bg}`}>
          <span className={`text-[16px] font-bold ${c.txt}`}>{r.score}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-[14px] truncate">{r.nome}</span>
            {r.tipoConta === 'imobiliaria' && <span className="text-[9px] text-amber-300">prop.</span>}
            {statusChip}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {dims.map((d) => (
              <div key={d.nome} className="flex-1" title={`${d.nome}: ${d.v ?? '—'}`}>
                <Barra pct={(d.v ?? 0) / 100} cor={d.v === null ? '#3f3f46' : corDe(d.v)} alt="h-1" />
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right hidden sm:block">
          <p className="text-[13px] font-bold text-white tabular-nums">{r.total} <span className="text-text-secondary font-normal text-[11px]">leads</span></p>
          <p className="text-[11px] text-text-secondary tabular-nums">{fmtPct1(r.conversao)} conv{alertas.length ? ` · ${alertas.length}⚠` : ''}</p>
        </div>
        <span className="shrink-0 text-text-secondary">{aberto ? '▲' : '▼'}</span>
      </button>

      {/* scorecard expandido */}
      {aberto && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/[0.06]">
          {/* dimensões */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-2">
            {dims.map((d) => (
              <div key={d.nome} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[11px] text-text-secondary">{d.nome}</span>
                <div className="flex-1"><Barra pct={(d.v ?? 0) / 100} cor={d.v === null ? '#3f3f46' : corDe(d.v)} /></div>
                <span className="w-8 text-right text-[11px] font-bold tabular-nums" style={{ color: d.v === null ? '#9ca3af' : corDe(d.v) }}>{d.v ?? '—'}</span>
                <span className="w-32 shrink-0 text-[10px] text-text-secondary truncate hidden sm:block">{d.hint}</span>
              </div>
            ))}
          </div>

          {/* dica de cobrança */}
          <div className={`rounded-xl border ${c.bd} ${c.bg} p-2.5`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Ponto a cobrar · {r.pontoFraco}</p>
            <p className={`text-[12px] font-medium mt-0.5 ${c.txt}`}>{r.dica}</p>
          </div>

          {/* números crus agrupados */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-2.5 rounded-xl bg-white/[0.03] border border-white/10 p-3">
            <Metric label="Leads" valor={String(r.total)} />
            <Metric label="Ativos" valor={String(r.ativos)} />
            <Metric label="Fechados" valor={String(r.fechados)} tom="text-emerald-300" />
            <Metric label="Conversão" valor={fmtPct1(r.conversao)} />
            <Metric label="Descartes" valor={`${r.descartes}`} tom="text-rose-300" />
            <Metric label="1º contato" valor={fmtDias(r.tempo1oContato)} />
            <Metric label="Tentativas méd" valor={fmtNum(r.tentativasMed)} />
            <Metric label="Qualif" valor={fmtPct(r.qualifPct)} />
            <Metric label="Anotação" valor={fmtPct(r.anotPct)} />
            <Metric label="Meets ger." valor={String(r.meetsGerados)} />
            <Metric label="Visitas ger." valor={String(r.visitasGeradas)} />
            <Metric label="Estagnados" valor={String(r.estagnados)} tom="text-amber-300" />
            {comAtividade && <Metric label="Últ. atividade" valor={fmtDiasInt(r.diasSemAtividade)} />}
            {comAtividade && <Metric label="Interações" valor={String(r.interacoes)} />}
            {comAtividade && <Metric label="Int/lead ativo" valor={fmtNum(r.interacoesPorLeadAtivo)} />}
            {comAtividade && <Metric label="Cadência" valor={fmtDias(r.cadenciaMediaDias)} />}
            {comAtividade && <Metric label="Ligação/Whats" valor={`${r.ligacoes}/${r.whats}`} />}
            {comAtividade && <Metric label="Sem toque +7d" valor={String(r.leadsSemToque)} tom="text-rose-300" />}
            <Metric label="Resp. ads" valor={fmtSeg(r.respostaAdsMed)} />
            <Metric label="Aceitos ads" valor={String(r.aceitosAds)} />
            <Metric label="Negou" valor={String(r.negou)} />
            <Metric label="No-show" valor={String(r.noShowMeet)} />
          </div>

          {/* mini funil */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">Funil dele (leads por etapa agora)</p>
            <div className="space-y-1">
              {ETAPAS_CIRCUITO.map((e) => (
                <div key={e} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-[10px] text-text-secondary truncate">{e}</span>
                  <div className="flex-1"><Barra pct={(r.porEtapa[e] || 0) / maxEt} cor="linear-gradient(90deg,#7C5CFF,#B48CFF)" alt="h-2" /></div>
                  <span className="w-6 text-right text-[10px] font-bold text-white tabular-nums">{r.porEtapa[e] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* alertas */}
          {alertas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {alertas.map((a, i) => (
                <span key={i} className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.04] border border-white/10 text-white/90">{a}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RelatoriosPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;
  const ativo = !!imobiliariaId && !isEspelhoDemo;
  const { leads, corretores, ads, loading, error } = useRelatorioData(imobiliariaId, ativo);
  const { mapa, loadingAtiv, progresso } = useAtividade(leads, ativo);

  const [periodo, setPeriodo] = useState<Periodo>('tudo');
  const [sel, setSel] = useState<Set<string> | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [carteiraAberta, setCarteiraAberta] = useState(false);

  const leadsPorUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of leads) if (l.userId) m.set(l.userId, (m.get(l.userId) || 0) + 1);
    return m;
  }, [leads]);

  const defaultSel = useMemo(() => corretores.filter((c) => c.aprovado && (c.tipoConta || '').startsWith('corretor')).map((c) => c.id), [corretores]);

  useEffect(() => {
    if (sel !== null || corretores.length === 0) return;
    try {
      const raw = localStorage.getItem(LS_SEL);
      if (raw) { const ids = (JSON.parse(raw) as string[]).filter((id) => corretores.some((c) => c.id === id)); setSel(new Set(ids.length ? ids : defaultSel)); return; }
    } catch { /* ignore */ }
    setSel(new Set(defaultSel));
  }, [corretores, defaultSel, sel]);

  const salvarSel = (novo: Set<string>) => { setSel(novo); try { localStorage.setItem(LS_SEL, JSON.stringify(Array.from(novo))); } catch { /* ignore */ } };
  const toggleSel = (id: string) => { const n = new Set(sel || []); if (n.has(id)) n.delete(id); else n.add(id); salvarSel(n); };

  const rel = useMemo(() => computeRelatorio(leads, corretores, ads, mapa, sel || new Set(), periodo), [leads, corretores, ads, mapa, sel, periodo]);

  if (isEspelhoDemo) {
    return (
      <div className="max-w-3xl mx-auto mt-10 px-4">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="al-card p-10 mt-3 text-center"><p className="text-[40px] mb-2">📊</p><p className="text-sm text-text-secondary">Os relatórios usam os dados reais da imobiliária — indisponíveis no modo demonstração.</p></div>
      </div>
    );
  }

  const selCount = sel?.size || 0;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Gestão de corretores</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {loading ? 'Carregando…' : `${rel.kpis.total} leads · ${selCount} corretor(es)`}
              {loadingAtiv && ` · atividade ${Math.round(progresso * 100)}%`}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/10 p-1">
            {PERIODOS.map((p) => (
              <button key={p.id} onClick={() => setPeriodo(p.id)} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${periodo === p.id ? 'bg-white/[0.10] text-white' : 'text-text-secondary hover:text-white'}`}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Faixa da equipe */}
      {!loading && (
        <div className="al-card relative overflow-hidden p-3.5">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Metric label="Leads" valor={String(rel.kpis.total)} />
            <Metric label="Ativos" valor={String(rel.kpis.ativos)} />
            <Metric label="Fechados" valor={String(rel.kpis.fechados)} tom="text-emerald-300" />
            <Metric label="Conversão" valor={fmtPct1(rel.kpis.conversao)} />
            <Metric label="Ativos hoje" valor={rel.comAtividade ? String(rel.kpis.ativosHoje) : '—'} tom="text-emerald-300" />
            <Metric label="Sumidos +7d" valor={rel.comAtividade ? String(rel.kpis.sumidos) : '—'} tom="text-rose-300" />
            <Metric label="Faturamento" valor={rel.kpis.faturamento > 0 ? fmtMoeda(rel.kpis.faturamento) : '—'} />
          </div>
        </div>
      )}

      {/* Seletor */}
      <div className="al-card relative overflow-hidden p-4">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <button onClick={() => setSeletorAberto((v) => !v)} className="w-full flex items-center justify-between gap-2">
          <div className="text-left">
            <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em]">Quem entra na conta</h2>
            <p className="text-[11px] text-text-secondary mt-0.5">{selCount} selecionado(s) · desmarque o CRM do proprietário ou de quem não usa</p>
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
                return (
                  <button key={c.id} onClick={() => toggleSel(c.id)} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${marcado ? 'bg-emerald-500/[0.08] border-emerald-500/40' : 'bg-white/[0.02] border-white/10 hover:border-white/25'}`}>
                    <span className={`shrink-0 grid place-items-center w-4 h-4 rounded border ${marcado ? 'bg-emerald-400 border-emerald-400 text-[#0d2a38]' : 'border-white/30 text-transparent'}`}>✓</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-white truncate">{c.nome}</span>
                      <span className="block text-[10px] text-text-secondary">{leadsPorUser.get(c.id) || 0} leads{c.tipoConta === 'imobiliaria' && <span className="ml-1 text-amber-300">· proprietário</span>}{c.aprovado === false && <span className="ml-1 text-rose-300">· não aprovado</span>}</span>
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

      {/* Ranking / cards */}
      {!loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.1em]">Ranking por saúde</h2>
            <span className="text-[11px] text-text-secondary">Clique num corretor pra abrir o scorecard</span>
          </div>
          {rel.ranking.map((r, i) => (
            <CorretorCard key={r.id} r={r} rank={i + 1} aberto={abertoId === r.id} onToggle={() => setAbertoId(abertoId === r.id ? null : r.id)} comAtividade={rel.comAtividade} />
          ))}
          {rel.ranking.length === 0 && <div className="al-card p-8 text-center text-text-secondary">Nenhum corretor selecionado.</div>}
        </div>
      )}

      {/* Carteira: mercado + origem (colapsável) */}
      {!loading && rel.ranking.length > 0 && (
        <div className="al-card relative overflow-hidden p-4">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <button onClick={() => setCarteiraAberta((v) => !v)} className="w-full flex items-center justify-between gap-2">
            <div className="text-left">
              <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em]">Visão da carteira</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">Inteligência de mercado (o que pedem) + origem dos leads</p>
            </div>
            <span className="text-text-secondary text-lg">{carteiraAberta ? '▲' : '▼'}</span>
          </button>
          {carteiraAberta && (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">O que os leads mais procuram</p>
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
                  {rel.mercado.every((m) => m.respondidos === 0) && <p className="text-[12px] text-text-secondary">Sem qualificações preenchidas no período.</p>}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">Origem dos leads</p>
                <div className="space-y-1.5">
                  {rel.origem.slice(0, 12).map((o) => {
                    const max = rel.origem[0]?.count || 1;
                    return (
                      <div key={o.origem} className="flex items-center gap-3">
                        <span className="w-40 sm:w-52 shrink-0 text-[12px] text-text-secondary truncate">{o.origem}</span>
                        <div className="flex-1"><Barra pct={o.count / max} cor="linear-gradient(90deg,#F59E0B,#FBBF24)" /></div>
                        <span className="w-12 text-right text-[12px] font-bold text-white tabular-nums">{o.count}</span>
                        <span className="w-14 text-right text-[10px] text-emerald-300/80 tabular-nums">{o.fechados} fe.</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {rel.ads.total > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">Anúncios (Meta)</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    <Metric label="Total" valor={String(rel.ads.total)} />
                    <Metric label="Aceitos" valor={String(rel.ads.aceitos)} tom="text-emerald-300" />
                    <Metric label="Taxa aceite" valor={fmtPct(rel.ads.taxaAceite)} />
                    <Metric label="Tempo aceite" valor={fmtSeg(rel.ads.tempoMedioAceite)} />
                    <Metric label="Via geral" valor={fmtPct(rel.ads.viaGeralPct)} />
                    <Metric label="Perdidos" valor={String(rel.ads.naoAtendido)} tom="text-rose-300" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-[10px] text-text-secondary px-4">
        O <b>Score de Saúde</b> pondera Atividade, Velocidade, Conversão, Qualidade e Higiene. Verde ≥70 · Amarelo 45-69 · Vermelho &lt;45.
        {!rel.comAtividade && ' (Atividade entra no score assim que a leitura da timeline terminar.)'}
      </p>
    </div>
  );
}
