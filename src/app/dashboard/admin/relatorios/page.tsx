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
  useRelatorioData, useAtividade, computeRelatorio, computeRelatorioDist,
  type Periodo, type RankingRow, type LeadDistRow,
  fmtPct, fmtPct1, fmtDias, fmtDiasInt, fmtNum, fmtSeg, fmtMoeda,
} from './logic';

const LS_SEL = 'relatorio_corretores_sel';
const LS_MARCO = 'relatorio_ativ_desde';
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'tudo', label: 'Tudo' }, { id: 'mes', label: 'Mês' }, { id: '30d', label: '30d' }, { id: '90d', label: '90d' },
];
function ymdDiasAtras(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const fmtYmd = (s: string) => (s && s.length >= 10 ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '');
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
function Secao({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="al-card relative overflow-hidden p-4 sm:p-5">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <div className="mb-3">
        <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.1em]">{titulo}</h2>
        {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
      </div>
      {children}
    </section>
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

// ── Aba: leads que vieram pela DISTRIBUIÇÃO (propaganda) ─────────────────────
function AbaDistribuicao({ dist, comAtividade }: { dist: ReturnType<typeof computeRelatorioDist>; comAtividade: boolean }) {
  const { linhas, resumo: r } = dist;
  const [filtro, setFiltro] = useState<'todos' | 'perdeu' | 'semQualif' | 'semToque' | 'fuAtrasado'>('todos');
  const [busca, setBusca] = useState('');

  const visiveis = useMemo(() => {
    let arr = linhas;
    if (filtro === 'perdeu') arr = arr.filter((l) => l.perdeuAVez);
    if (filtro === 'semQualif') arr = arr.filter((l) => l.leadId && !l.temQualificacao);
    if (filtro === 'semToque') arr = arr.filter((l) => l.leadId && l.interacoes === 0);
    if (filtro === 'fuAtrasado') arr = arr.filter((l) => l.fuAtrasados > 0);
    const q = busca.trim().toLowerCase();
    if (q) arr = arr.filter((l) => `${l.nome} ${l.campanha} ${l.aceitoPorNome} ${l.escaladoParaNome}`.toLowerCase().includes(q));
    return arr;
  }, [linhas, filtro, busca]);

  if (linhas.length === 0) {
    return <div className="al-card p-8 text-center text-text-secondary">Nenhum lead de distribuição no período. Quando as campanhas começarem a entregar, tudo aparece aqui.</div>;
  }

  const maxEt = Math.max(1, ...Object.values(r.porEtapa));
  const chip = (id: typeof filtro, txt: string, n: number) => (
    <button onClick={() => setFiltro(id)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${filtro === id ? 'bg-white/[0.12] text-white' : 'bg-white/[0.04] text-text-secondary hover:text-white'}`}>
      {txt} <span className="tabular-nums opacity-70">{n}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Entrega e resposta */}
      <Secao titulo="Chegada e resposta" sub="O que a distribuição entregou e como o time respondeu">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Metric label="Leads recebidos" valor={String(r.total)} />
          <Metric label="Aceitos" valor={String(r.aceitos)} tom="text-emerald-300" />
          <Metric label="Taxa de aceite" valor={fmtPct(r.taxaAceite)} />
          <Metric label="Não atendidos" valor={String(r.naoAtendidos)} tom="text-rose-300" />
          <Metric label="Ainda na fila" valor={String(r.naFila)} />
          <Metric label="Tempo p/ aceitar" valor={fmtSeg(r.tempoMedioAceiteSeg)} />
          <Metric label="Mediana" valor={fmtSeg(r.medianaAceiteSeg)} />
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-white/[0.03] border border-white/10 p-3">
          <Metric label="Perderam a vez (5 min)" valor={String(r.perderamAVez)} tom="text-amber-300" />
          <Metric label="Pegos no bolsão" valor={String(r.viaGeral)} />
          <Metric label="Fechados" valor={String(r.fechados)} tom="text-emerald-300" />
          <Metric label="Conversão" valor={fmtPct1(r.conversao)} />
        </div>
      </Secao>

      {/* Quem perdeu a vez */}
      {r.perderamAVez > 0 && (
        <Secao titulo="⏱ Quem perdeu a vez" sub="Foi escalado, não pegou dentro do tempo exclusivo e o lead caiu no bolsão">
          <div className="space-y-1.5">
            {r.porCorretor.filter((c) => c.perdeuAVez > 0).sort((a, b) => b.perdeuAVez - a.perdeuAVez).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/25 px-3 py-2">
                <span className="flex-1 min-w-0 text-[13px] font-bold text-white truncate">{c.nome}</span>
                <span className="text-[11px] text-text-secondary tabular-nums shrink-0">
                  {c.recebidos > 0 && <>{fmtPct(c.perdeuAVez / c.recebidos)} dos {c.recebidos} que recebeu · </>}tempo médio {fmtSeg(c.tempoAceiteMed)}
                </span>
                <span className="al-display text-[18px] font-bold text-amber-300 tabular-nums shrink-0">{c.perdeuAVez}×</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Os leads que vencerem</p>
            {linhas.filter((l) => l.perdeuAVez).map((l) => (
              <div key={l.adsId} className="flex items-center gap-2 text-[11.5px]">
                <span className="text-amber-300 shrink-0">⏱</span>
                <span className="text-white/90 truncate">{l.nome}</span>
                <span className="text-text-secondary shrink-0">— era do <b className="text-white/80">{l.escaladoParaNome}</b></span>
                <span className="text-text-secondary truncate">{l.aceitoPorNome !== '—' ? <>→ pegou <b className="text-white/80">{l.aceitoPorNome}</b> {l.aceitoPorNome === l.escaladoParaNome && <span className="text-white/40">(ele mesmo, no bolsão)</span>}</> : '→ ninguém pegou'}</span>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {/* Tratamento */}
      <Secao titulo="Tratamento do lead" sub="Depois que caiu no CRM: anotou? qualificou? em quanto tempo falou?">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Metric label="Com anotação" valor={`${r.comAnotacao}`} tom="text-white" />
          <Metric label="% anotação" valor={fmtPct(r.pctAnotacao)} tom={r.pctAnotacao < 0.5 ? 'text-amber-300' : 'text-emerald-300'} />
          <Metric label="Com qualificação" valor={`${r.comQualificacao}`} />
          <Metric label="% qualificação" valor={fmtPct(r.pctQualificacao)} tom={r.pctQualificacao < 0.5 ? 'text-amber-300' : 'text-emerald-300'} />
          <Metric label="1º contato (méd)" valor={fmtDias(r.tempoMedio1oContato)} />
          <Metric label="Sem nenhum toque" valor={comAtividade ? String(r.semNenhumToque) : '—'} tom="text-rose-300" />
        </div>
      </Secao>

      {/* Follow-ups */}
      <Secao titulo="Follow-ups" sub="Tarefas de acompanhamento (Follow-up, Ligação e WhatsApp) desses leads">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Metric label="Criados" valor={comAtividade ? String(r.fuCriados) : '—'} />
          <Metric label="Concluídos" valor={comAtividade ? String(r.fuConcluidos) : '—'} tom="text-emerald-300" />
          <Metric label="% concluídos" valor={comAtividade && r.fuCriados ? fmtPct(r.fuConcluidos / r.fuCriados) : '—'} />
          <Metric label="Atrasados agora" valor={comAtividade ? String(r.fuAtrasados) : '—'} tom="text-rose-300" />
          <Metric label="Tempo pra fazer" valor={comAtividade ? fmtDias(r.fuTempoMedioDias) : '—'} tom={(r.fuTempoMedioDias ?? 0) > 1 ? 'text-amber-300' : 'text-white'} />
        </div>
        <p className="mt-2 text-[10px] text-text-secondary">&quot;Tempo pra fazer&quot; = do vencimento até concluir. Positivo = fez atrasado; negativo = adiantou.</p>
      </Secao>

      {/* Funil */}
      <Secao titulo="Onde estão no funil" sub="Etapa atual dos leads de propaganda que viraram lead no CRM">
        <div className="space-y-1.5">
          {ETAPAS_CIRCUITO.map((e) => (
            <div key={e} className="flex items-center gap-3">
              <span className="w-28 sm:w-32 shrink-0 text-[12px] text-text-secondary truncate">{e}</span>
              <div className="flex-1"><Barra pct={(r.porEtapa[e] || 0) / maxEt} cor="linear-gradient(90deg,#7C5CFF,#B48CFF)" alt="h-2" /></div>
              <span className="w-8 text-right text-[12px] font-bold text-white tabular-nums">{r.porEtapa[e] || 0}</span>
            </div>
          ))}
        </div>
      </Secao>

      {/* Por corretor */}
      <Secao titulo="Por corretor" sub="Quem recebeu, quem respondeu e quem trabalha o lead de propaganda">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-text-secondary">
                {['Corretor', 'Receb.', 'Aceitos', 'Perdeu a vez', 'Negou', 'Tempo aceite', 'Anot%', 'Qualif%', '1º contato', 'FU criados', 'FU feitos', 'FU atras.', 'Tempo FU', 'Fech.', 'Conv.'].map((h, i) => (
                  <th key={h} className={`px-2 py-2 font-bold whitespace-nowrap ${i === 0 ? 'text-left sticky left-0 bg-[#12101a]' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.porCorretor.map((c) => (
                <tr key={c.id} className="border-t border-white/[0.06]">
                  <td className="px-2 py-2 sticky left-0 bg-[#12101a] font-semibold text-white whitespace-nowrap">{c.nome}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.recebidos}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-emerald-300">{c.aceitos}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${c.perdeuAVez > 0 ? 'text-amber-300 font-bold' : 'text-white/50'}`}>{c.perdeuAVez}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${c.negou > 0 ? 'text-white/90' : 'text-white/50'}`}>{c.negou}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtSeg(c.tempoAceiteMed)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${c.pctAnotacao < 0.5 ? 'text-amber-300' : 'text-white/90'}`}>{fmtPct(c.pctAnotacao)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${c.pctQualificacao < 0.5 ? 'text-amber-300' : 'text-white/90'}`}>{fmtPct(c.pctQualificacao)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtDias(c.tempo1oContato)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.fuCriados}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.fuConcluidos}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${c.fuAtrasados > 0 ? 'text-rose-300 font-bold' : 'text-white/50'}`}>{c.fuAtrasados}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtDias(c.fuTempoMedioDias)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-emerald-300">{c.fechados}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtPct1(c.conversao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      {/* Por campanha */}
      <Secao titulo="Por campanha" sub="Qual propaganda traz lead que o time aceita — e que fecha">
        <div className="space-y-1.5">
          {r.porCampanha.map((c) => (
            <div key={c.nome} className="flex items-center gap-3">
              <span className="flex-1 min-w-0 text-[12px] text-white/90 truncate">{c.nome}</span>
              <span className="text-[11px] text-text-secondary tabular-nums shrink-0">{c.total} leads · {c.aceitos} aceitos · <span className="text-emerald-300">{c.fechados} fech.</span></span>
            </div>
          ))}
        </div>
      </Secao>

      {/* Lead a lead */}
      <Secao titulo="Lead a lead" sub={`${visiveis.length} de ${linhas.length} — clique nos filtros pra caçar problema`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {chip('todos', 'Todos', linhas.length)}
          {chip('perdeu', '⏱ Perderam a vez', linhas.filter((l) => l.perdeuAVez).length)}
          {chip('semQualif', '🚩 Sem qualificação', linhas.filter((l) => l.leadId && !l.temQualificacao).length)}
          {chip('semToque', '📵 Sem nenhum toque', linhas.filter((l) => l.leadId && l.interacoes === 0).length)}
          {chip('fuAtrasado', '🔥 Follow-up atrasado', linhas.filter((l) => l.fuAtrasados > 0).length)}
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar nome, campanha, corretor…" className="ml-auto px-2.5 py-1 rounded-lg text-[11px] bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/25" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-text-secondary">
                {['Lead', 'Campanha', 'Status', 'Corretor', 'Aceite', 'Etapa', 'Anot', 'Qualif', '1º contato', 'Inter.', 'FU', 'Últ. toque', 'Parado'].map((h, i) => (
                  <th key={h} className={`px-2 py-2 font-bold whitespace-nowrap ${i === 0 ? 'text-left sticky left-0 bg-[#12101a]' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => <LinhaLead key={l.adsId} l={l} comAtividade={comAtividade} />)}
              {visiveis.length === 0 && <tr><td colSpan={13} className="px-2 py-6 text-center text-text-secondary">Nenhum lead nesse filtro. ✓</td></tr>}
            </tbody>
          </table>
        </div>
      </Secao>
    </div>
  );
}

function LinhaLead({ l, comAtividade }: { l: LeadDistRow; comAtividade: boolean }) {
  const statusCor = l.status === 'aceito' ? 'text-emerald-300' : l.status === 'nao-atendido' ? 'text-rose-300' : 'text-amber-300';
  const statusTxt = l.status === 'aceito' ? 'aceito' : l.status === 'nao-atendido' ? 'perdido' : l.status;
  return (
    <tr className="border-t border-white/[0.06]">
      <td className="px-2 py-2 sticky left-0 bg-[#12101a] whitespace-nowrap">
        {l.leadId ? <a href={`/dashboard/crm/${l.leadId}`} className="font-semibold text-white hover:text-[#FF7A97] transition-colors">{l.nome}</a> : <span className="font-semibold text-white/70">{l.nome}</span>}
      </td>
      <td className="px-2 py-2 text-right text-white/70 max-w-[180px] truncate" title={l.campanha}>{l.campanha}</td>
      <td className={`px-2 py-2 text-right font-bold whitespace-nowrap ${statusCor}`}>{statusTxt}{l.perdeuAVez && <span className="ml-1 text-amber-300" title="Deixou vencer a janela exclusiva">⏱</span>}{l.viaGeral && <span className="ml-1 text-white/40" title="Pego no bolsão">↺</span>}</td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        {l.perdeuAVez && l.escaladoParaNome !== '—' ? (
          <span title={`Era do ${l.escaladoParaNome}, que deixou vencer`}>
            <span className="text-amber-300 line-through decoration-amber-300/50">{l.escaladoParaNome}</span>
            {l.aceitoPorNome !== '—' && <span className="text-white/90"> → {l.aceitoPorNome}</span>}
          </span>
        ) : (
          <span className="text-white/90">{l.aceitoPorNome !== '—' ? l.aceitoPorNome : l.escaladoParaNome}</span>
        )}
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtSeg(l.tempoAceiteSeg)}</td>
      <td className="px-2 py-2 text-right text-white/90 whitespace-nowrap">{l.etapa}</td>
      <td className="px-2 py-2 text-right">{l.leadId ? (l.temAnotacao ? <span className="text-emerald-300">✓</span> : <span className="text-rose-300">✗</span>) : '—'}</td>
      <td className="px-2 py-2 text-right">{l.leadId ? (l.temQualificacao ? <span className="text-emerald-300">✓ {l.qualifCampos}</span> : <span className="text-rose-300">✗</span>) : '—'}</td>
      <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtDias(l.tempo1oContatoDias)}</td>
      <td className="px-2 py-2 text-right tabular-nums text-white/90">{comAtividade ? l.interacoes : '—'}</td>
      <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">{comAtividade ? <>{l.fuConcluidos}/{l.fuCriados}{l.fuAtrasados > 0 && <span className="text-rose-300 font-bold" title="follow-ups atrasados"> +{l.fuAtrasados}!</span>}</> : '—'}</td>
      <td className="px-2 py-2 text-right tabular-nums text-white/90">{comAtividade ? fmtDiasInt(l.diasSemToque) : '—'}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${(l.diasParado ?? 0) > 14 ? 'text-amber-300' : 'text-white/90'}`}>{fmtDiasInt(l.diasParado)}</td>
    </tr>
  );
}

export default function RelatoriosPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;
  const ativo = !!imobiliariaId && !isEspelhoDemo;
  const { leads, corretores, ads, loading, error } = useRelatorioData(imobiliariaId, ativo);
  const { mapa, loadingAtiv, progresso } = useAtividade(leads, ativo);

  const [aba, setAba] = useState<'corretores' | 'distribuicao'>('corretores');
  const [periodo, setPeriodo] = useState<Periodo>('tudo');
  const [ativDesde, setAtivDesde] = useState<string>('tudo');
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

  useEffect(() => { try { const v = localStorage.getItem(LS_MARCO); if (v) setAtivDesde(v); } catch { /* ignore */ } }, []);
  const setMarco = (v: string) => { setAtivDesde(v); try { localStorage.setItem(LS_MARCO, v); } catch { /* ignore */ } };
  const atividadeDesdeMs = useMemo(() => { if (ativDesde === 'tudo') return 0; const p = Date.parse(`${ativDesde}T00:00:00`); return Number.isNaN(p) ? 0 : p; }, [ativDesde]);

  const salvarSel = (novo: Set<string>) => { setSel(novo); try { localStorage.setItem(LS_SEL, JSON.stringify(Array.from(novo))); } catch { /* ignore */ } };
  const toggleSel = (id: string) => { const n = new Set(sel || []); if (n.has(id)) n.delete(id); else n.add(id); salvarSel(n); };

  const rel = useMemo(() => computeRelatorio(leads, corretores, ads, mapa, sel || new Set(), periodo, atividadeDesdeMs), [leads, corretores, ads, mapa, sel, periodo, atividadeDesdeMs]);
  const dist = useMemo(() => computeRelatorioDist(ads, leads, corretores, mapa, periodo), [ads, leads, corretores, mapa, periodo]);

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
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Relatórios</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {loading ? 'Carregando…' : aba === 'corretores' ? `${rel.kpis.total} leads · ${selCount} corretor(es)` : `${dist.linhas.length} leads de propaganda`}
              {loadingAtiv && ` · atividade ${Math.round(progresso * 100)}%`}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/10 p-1">
            {PERIODOS.map((p) => (
              <button key={p.id} onClick={() => setPeriodo(p.id)} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${periodo === p.id ? 'bg-white/[0.10] text-white' : 'text-text-secondary hover:text-white'}`}>{p.label}</button>
            ))}
          </div>
        </div>
        {/* Abas */}
        <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1 gap-1 self-start">
          {([['corretores', '👥 Gestão de corretores'], ['distribuicao', '🔥 Leads de propaganda']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)} className={`px-3.5 py-2 rounded-lg text-[12px] font-bold transition-all ${aba === id ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_0_16px_rgba(255,30,86,0.35)]' : 'text-text-secondary hover:text-white'}`}>{label}</button>
          ))}
        </div>
        {/* Marco de atividade: conta só o trabalho real depois que o sistema entrou pra valer */}
        <div className={`flex flex-wrap items-center gap-1.5 ${aba === 'corretores' ? '' : 'hidden'}`}>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary mr-1">Atividade desde</span>
          <button onClick={() => setMarco('tudo')} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${ativDesde === 'tudo' ? 'bg-white/[0.10] text-white' : 'bg-white/[0.04] text-text-secondary hover:text-white'}`}>Tudo</button>
          <button onClick={() => setMarco(ymdDiasAtras(7))} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.04] text-text-secondary hover:text-white transition-colors">7d</button>
          <button onClick={() => setMarco(ymdDiasAtras(14))} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.04] text-text-secondary hover:text-white transition-colors">14d</button>
          <button onClick={() => setMarco(ymdDiasAtras(30))} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.04] text-text-secondary hover:text-white transition-colors">30d</button>
          <input type="date" value={ativDesde === 'tudo' ? '' : ativDesde} onChange={(e) => setMarco(e.target.value || 'tudo')} className="px-2 py-1 rounded-lg text-[11px] bg-white/[0.04] border border-white/10 text-white [color-scheme:dark]" />
          {atividadeDesdeMs > 0 && <span className="text-[11px] text-emerald-300 font-semibold">✓ medindo desde {fmtYmd(ativDesde)} — antes disso é considerado organização/faxina</span>}
        </div>
      </div>

      {error && <div className="al-card p-4 text-rose-300 text-sm">Erro: {error}</div>}
      {loading && <div className="al-card p-8 text-center text-text-secondary">Carregando dados…</div>}

      {/* ══════════ ABA: LEADS DE PROPAGANDA ══════════ */}
      {!loading && aba === 'distribuicao' && <AbaDistribuicao dist={dist} comAtividade={rel.comAtividade} />}

      {/* ══════════ ABA: GESTÃO DE CORRETORES ══════════ */}
      {/* Faixa da equipe */}
      {!loading && aba === 'corretores' && (
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
      <div className={`al-card relative overflow-hidden p-4 ${aba === 'corretores' ? '' : 'hidden'}`}>
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

      {/* Ranking / cards */}
      {!loading && aba === 'corretores' && (
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
      {!loading && aba === 'corretores' && rel.ranking.length > 0 && (
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

      <div className={`text-center text-[10px] text-text-secondary px-4 space-y-1 ${aba === 'corretores' ? '' : 'hidden'}`}>
        <p>O <b>Score de Saúde</b> pondera Atividade, Velocidade, Conversão, Qualidade e Higiene. Verde ≥70 · Amarelo 45-69 · Vermelho &lt;45.{!rel.comAtividade && ' (Atividade entra no score quando a leitura da timeline terminar.)'}</p>
        <p><b>Atividade desde</b> corta a faxina de organização: atividade, cadência, canal, última atividade e "sem toque" contam só depois da data. Já <b>qualificação/conversão</b> refletem o estado ATUAL da carteira (não têm data de quando foram preenchidos) — pra deixá-las justas, use o <b>período</b> de leads (ex.: 30d) e olhe só os leads novos.</p>
      </div>
    </div>
  );
}
