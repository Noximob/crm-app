'use client';

/**
 * Relatórios do admin — duas visões:
 *
 * 👥 GESTÃO DE CORRETORES — o dossiê de cada um: resultado, esforço (está
 *    trabalhando ou empurrando?), o gargalo do funil DELE e a qualidade do
 *    registro. Serve pra cobrança individual e pra achar onde o funil vaza.
 *
 * 🔥 LEADS DE PROPAGANDA — o que veio da distribuição: chegada, velocidade de
 *    resposta, tratamento, follow-ups, funil e custo/retorno por campanha.
 */
import React, { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ETAPAS_CIRCUITO } from '@/lib/circuito';
import {
  useRelatorioData, useAtividade, useCustoCampanhas, computeRelatorioDist,
  type Periodo, type LeadDistRow, type GastoCampanha,
  fmtPct, fmtPct1, fmtDias, fmtDiasInt, fmtNum, fmtSeg, fmtMoeda,
} from './logic';
import { computeGestao, gestaoDemo, dadosDemo, corEsforco, type CorretorGestao, type EtapaFunil } from './gestao';
import { RelatorioSemanal } from './semana-view';
import { RelatorioCampanha } from './campanha';

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'tudo', label: 'Tudo' }, { id: 'mes', label: 'Mês' }, { id: '30d', label: '30d' }, { id: '90d', label: '90d' },
];

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
function Metric({ label, valor, tom, hint }: { label: string; valor: string; tom?: string; hint?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-text-secondary">{label}</p>
      <p className={`text-[15px] font-bold tabular-nums leading-tight ${tom || 'text-white'}`}>{valor}</p>
      {hint && <p className="text-[9.5px] text-text-secondary mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Relatório dos leads que vieram pela distribuição (propaganda) ───────────
function RelatorioPropaganda({ dist, comAtividade, gastos, totalGasto, erroGasto, carregandoGasto }: {
  dist: ReturnType<typeof computeRelatorioDist>; comAtividade: boolean;
  gastos: GastoCampanha[]; totalGasto: number; erroGasto: string | null; carregandoGasto: boolean;
}) {
  const { linhas, resumo: r } = dist;
  const [filtro, setFiltro] = useState<'todos' | 'perdeu' | 'semQualif' | 'semToque' | 'fuAtrasado'>('todos');
  const [busca, setBusca] = useState('');

  const visiveis = useMemo(() => {
    let arr = linhas;
    if (filtro === 'perdeu') arr = arr.filter((l) => l.estourouJanela);
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
      {/* 1. O que chegou */}
      <Secao titulo="1 · O que chegou" sub="Leads entregues pela distribuição no período">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Metric label="Leads recebidos" valor={String(r.total)} />
          <Metric label="Aceitos" valor={String(r.aceitos)} tom="text-emerald-300" />
          <Metric label="Taxa de aceite" valor={fmtPct(r.taxaAceite)} />
          <Metric label="Perdidos (ninguém pegou)" valor={String(r.naoAtendidos)} tom={r.naoAtendidos ? 'text-rose-300' : 'text-white'} />
          <Metric label="Ainda na fila" valor={String(r.naFila)} />
          <Metric label="Fechados" valor={`${r.fechados} · ${fmtPct1(r.conversao)}`} tom="text-emerald-300" />
        </div>
      </Secao>

      {/* 2. Velocidade — o coração do lead de anúncio */}
      <Secao titulo={`2 · Velocidade de resposta (janela de ${r.janelaMin} min)`} sub="Lead de anúncio esfria em minutos — aqui é onde se ganha ou perde">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Metric label="Tempo médio p/ aceitar" valor={fmtSeg(r.tempoMedioAceiteSeg)} />
          <Metric label="Mediana" valor={fmtSeg(r.medianaAceiteSeg)} />
          <Metric label={`Atendidos em até ${r.janelaMin} min`} valor={String(r.dentroDaJanela)} tom="text-emerald-300" />
          <Metric label={`Passaram dos ${r.janelaMin} min`} valor={String(r.estouraramJanela)} tom={r.estouraramJanela ? 'text-amber-300' : 'text-white'} />
          <Metric label="Perderam a vez (foi p/ bolsão)" valor={String(r.perderamAVez)} tom={r.perderamAVez ? 'text-rose-300' : 'text-white'} />
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl bg-white/[0.03] border border-white/10 p-3">
          <Metric label="Pegos no bolsão" valor={String(r.viaGeral)} />
          <Metric label="Entraram abertos p/ todos" valor={String(r.nasceramNoBolsao)} />
          <Metric label="Interações por lead" valor={comAtividade ? fmtNum(r.interacoesMedia) : '—'} />
        </div>
        <p className="mt-2 text-[10px] text-text-secondary">
          <b>Passou dos {r.janelaMin} min</b> = demorou mais que a janela exclusiva (mesmo que tenha aceitado depois).{' '}
          <b>Perdeu a vez</b> = a janela venceu e o lead abriu pro bolsão.{' '}
          <b>Entraram abertos p/ todos</b> = rodízio desligado, ninguém tinha exclusividade — não conta como falha de ninguém.
        </p>
      </Secao>

      {/* Quem demorou / perdeu a vez */}
      {r.estouraramJanela > 0 && (
        <Secao titulo={`⏱ Quem não atendeu na janela de ${r.janelaMin} min`} sub="Ordenado por quem mais demorou — é aqui que o lead esfria">
          <div className="space-y-1.5">
            {r.porCorretor.filter((c) => c.estourouJanela > 0 || c.perdeuAVez > 0).sort((a, b) => (b.estourouJanela - a.estourouJanela) || (b.perdeuAVez - a.perdeuAVez)).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/25 px-3 py-2">
                <span className="flex-1 min-w-0 text-[13px] font-bold text-white truncate">{c.nome}</span>
                <span className="text-[11px] text-text-secondary tabular-nums shrink-0 text-right">
                  {c.recebidos > 0 && <>{c.estourouJanela} de {c.recebidos} recebidos ({fmtPct(c.estourouJanela / c.recebidos)}) · </>}
                  tempo médio dele: <b className="text-white/80">{fmtSeg(c.tempoAceiteMed)}</b>
                  {c.perdeuAVez > 0 && <span className="text-rose-300"> · {c.perdeuAVez} foram pro bolsão</span>}
                </span>
                <span className="al-display text-[18px] font-bold text-amber-300 tabular-nums shrink-0">{c.estourouJanela}×</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Os casos, um a um</p>
            {linhas.filter((l) => l.estourouJanela).sort((a, b) => (b.tempoAceiteSeg ?? 0) - (a.tempoAceiteSeg ?? 0)).map((l) => (
              <div key={l.adsId} className="flex flex-wrap items-center gap-x-2 text-[11.5px]">
                <span className="text-amber-300 shrink-0">⏱</span>
                <span className="text-white/90">{l.nome}</span>
                <span className="text-text-secondary">— era do <b className="text-white/80">{l.expirouDeNome || l.escaladoParaNome}</b></span>
                {l.tempoAceiteSeg !== null && <span className="text-amber-300 font-bold">levou {fmtSeg(l.tempoAceiteSeg)}</span>}
                {l.perdeuAVez && <span className="text-rose-300">· venceu{l.expirouAposSeg ? ` em ${fmtSeg(l.expirouAposSeg)}` : ''} e foi pro bolsão</span>}
                {l.status === 'escalado' && <span className="text-rose-300">· ainda não pegou!</span>}
                {l.aceitoPorNome !== '—' && l.aceitoPorNome !== l.escaladoParaNome && <span className="text-text-secondary">→ pegou <b className="text-white/80">{l.aceitoPorNome}</b></span>}
                {l.aceitoPorNome !== '—' && l.aceitoPorNome === l.escaladoParaNome && l.perdeuAVez && <span className="text-white/40">(ele mesmo repegou no bolsão)</span>}
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
                {['Corretor', 'Receb.', 'Aceitos', 'Tempo aceite', `Passou ${r.janelaMin}min`, 'Perdeu a vez', 'Negou', 'Anot%', 'Qualif%', '1º contato', 'FU criados', 'FU feitos', 'FU atras.', 'Tempo FU', 'Fech.', 'Conv.'].map((h, i) => (
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
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtSeg(c.tempoAceiteMed)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${c.estourouJanela > 0 ? 'text-amber-300 font-bold' : 'text-white/50'}`}>{c.estourouJanela}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${c.perdeuAVez > 0 ? 'text-rose-300 font-bold' : 'text-white/50'}`}>{c.perdeuAVez}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${c.negou > 0 ? 'text-white/90' : 'text-white/50'}`}>{c.negou}</td>
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

      {/* Por campanha — agora com custo real do Meta */}
      <Secao titulo="Por campanha · custo e retorno" sub="Cruza o gasto do Meta com os leads que realmente entraram e fecharam">
        {carregandoGasto && <p className="text-[11px] text-text-secondary mb-2">lendo o gasto no Meta…</p>}
        {erroGasto && <p className="text-[11px] text-amber-300 mb-2">⚠ Gasto indisponível ({erroGasto}) — os volumes abaixo seguem valendo.</p>}
        {totalGasto > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 rounded-xl bg-white/[0.03] border border-white/10 p-3">
            <Metric label="Investido no período" valor={fmtMoeda(totalGasto)} />
            <Metric label="Custo por lead (nosso)" valor={r.total > 0 ? fmtMoeda(totalGasto / r.total) : '—'} />
            <Metric label="Custo por venda" valor={r.fechados > 0 ? fmtMoeda(totalGasto / r.fechados) : '—'} tom={r.fechados > 0 ? 'text-white' : 'text-text-secondary'} />
            <Metric label="Leads por real" valor={totalGasto > 0 ? (r.total / totalGasto).toFixed(2) : '—'} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-text-secondary">
                {['Campanha', 'Gasto', 'Leads', 'CPL', 'Aceitos', 'Fechados', 'Custo/venda'].map((h, i) => (
                  <th key={h} className={`px-2 py-2 font-bold whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.porCampanha.map((c) => {
                // casa pelo nome da campanha (é o que o adsLead guarda)
                const g = gastos.find((x) => x.nome === c.nome);
                const gasto = g?.gasto ?? 0;
                return (
                  <tr key={c.nome} className="border-t border-white/[0.06]">
                    <td className="px-2 py-2 text-white/90 max-w-[260px] truncate" title={c.nome}>{c.nome}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-white/90">{gasto > 0 ? fmtMoeda(gasto) : '—'}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.total}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-white/90">{gasto > 0 && c.total > 0 ? fmtMoeda(gasto / c.total) : '—'}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.aceitos}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-emerald-300">{c.fechados}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-white/90">{gasto > 0 && c.fechados > 0 ? fmtMoeda(gasto / c.fechados) : '—'}</td>
                  </tr>
                );
              })}
              {/* campanhas que gastaram mas ainda não geraram lead no CRM */}
              {gastos.filter((g) => g.gasto > 0 && !r.porCampanha.some((c) => c.nome === g.nome)).map((g) => (
                <tr key={g.campanhaId} className="border-t border-white/[0.06] opacity-70">
                  <td className="px-2 py-2 text-white/70 max-w-[260px] truncate" title={g.nome}>{g.nome}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtMoeda(g.gasto)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-rose-300" title="gastou e nenhum lead chegou no CRM">0</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/50">—</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/50">—</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/50">—</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/50">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-text-secondary">
          <b>CPL</b> = gasto ÷ leads que entraram no CRM (o número do Meta pode diferir: ele conta o envio do formulário).
          Linhas esmaecidas são campanhas que gastaram e <b>nenhum lead chegou aqui</b> — vale investigar.
        </p>
      </Secao>

      {/* Lead a lead */}
      <Secao titulo="Lead a lead" sub={`${visiveis.length} de ${linhas.length} — clique nos filtros pra caçar problema`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {chip('todos', 'Todos', linhas.length)}
          {chip('perdeu', `⏱ Passaram de ${r.janelaMin}min`, linhas.filter((l) => l.estourouJanela).length)}
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
      <td className={`px-2 py-2 text-right font-bold whitespace-nowrap ${statusCor}`}>
        {statusTxt}
        {l.estourouJanela && <span className="ml-1 text-amber-300" title="Passou da janela exclusiva">⏱</span>}
        {l.perdeuAVez && <span className="ml-1 text-rose-300" title="A janela venceu e o lead foi pro bolsão">↯</span>}
        {l.pegouNoBolsao && <span className="ml-1 text-white/40" title="Pego quando já estava no bolsão">↺</span>}
        {l.nasceuNoBolsao && <span className="ml-1 text-white/30" title="Entrou aberto pra todos (rodízio desligado)">∗</span>}
      </td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        {l.perdeuAVez && (l.expirouDeNome || l.escaladoParaNome) !== '—' ? (
          <span title={`Era do ${l.expirouDeNome || l.escaladoParaNome} — a janela venceu e o lead foi pro bolsão`}>
            <span className="text-rose-300 line-through decoration-rose-300/50">{l.expirouDeNome || l.escaladoParaNome}</span>
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

// ═══════════════════════════════════════════════════════════════════════════
// GESTÃO DE CORRETORES
// ═══════════════════════════════════════════════════════════════════════════

/** Funil com taxa de passagem e tempo — a leitura de gargalo. */
function FunilGargalo({ funil, comparar }: { funil: EtapaFunil[]; comparar?: EtapaFunil[] }) {
  const maxPassaram = Math.max(1, ...funil.map((f) => f.passaram));
  return (
    <div className="space-y-1.5">
      {funil.map((f, i) => {
        const ref = comparar?.[i];
        const ultima = i === funil.length - 1;
        const ruim = !ultima && f.passaram >= 3 && f.passagem < 0.35;
        const piorQueTime = ref && !ultima && f.passaram >= 3 && ref.passagem > 0 && f.passagem < ref.passagem * 0.7;
        // etapa que ninguém ocupa nem morre: o time marca ela "de passagem", então
        // os 100% são artefato da catraca — não é saúde, é ausência de registro.
        const dePassagem = !ultima && f.agora === 0 && f.morreram === 0;
        return (
          <div key={f.etapa} className="flex items-center gap-2 text-[11.5px]">
            <span className="w-28 sm:w-32 shrink-0 text-text-secondary truncate">{f.etapa}</span>
            <div className="flex-1 min-w-[60px]">
              <Barra pct={f.passaram / maxPassaram} cor={ruim ? 'linear-gradient(90deg,#F45B69,#FB7185)' : 'linear-gradient(90deg,#7C5CFF,#B48CFF)'} alt="h-2" />
            </div>
            <span className="w-10 text-right tabular-nums text-white font-bold">{f.passaram}</span>
            <span className="w-14 text-right tabular-nums text-text-secondary" title="quantos estão nesta etapa agora">
              {f.agora > 0 ? `${f.agora} aqui` : '—'}
            </span>
            {!ultima ? (
              <span className={`w-16 text-right tabular-nums font-bold ${dePassagem ? 'text-white/25 font-normal' : ruim ? 'text-rose-300' : f.passagem >= 0.6 ? 'text-emerald-300' : 'text-white/80'}`}
                title={dePassagem
                  ? 'Ninguém fica nesta etapa — o time marca ela de passagem, então os 100% não medem nada'
                  : `${f.avancaram} de ${f.passaram} avançaram${ref ? ` · time: ${Math.round(ref.passagem * 100)}%` : ''}`}>
                {f.passaram > 0 ? `${Math.round(f.passagem * 100)}%↓` : '—'}
              </span>
            ) : <span className="w-16" />}
            <span className="w-14 text-right tabular-nums text-text-secondary" title="tempo médio parado nesta etapa">
              {f.diasMedios !== null ? `${f.diasMedios}d` : '—'}
            </span>
            {piorQueTime && <span className="text-rose-300 text-[10px] shrink-0" title="bem abaixo da média do time">▼</span>}
          </div>
        );
      })}
      <p className="text-[9.5px] text-text-secondary pt-1">
        <b>nº</b> passaram pela etapa · <b>aqui</b> estão nela agora · <b>%↓</b> avançaram pra próxima · <b>d</b> dias parados em média.
        Etapa com <span className="text-white/25">%↓ apagado</span> é etapa de passagem — ninguém para nela, então a taxa não mede nada.
      </p>
    </div>
  );
}

function CardCorretor({ c, funilTime, medias, aberto, onToggle }: {
  c: CorretorGestao; funilTime: EtapaFunil[];
  medias: { conversao: number; qualifPct: number; interacoesPorLeadAtivo: number | null; tempoAteContato: number | null };
  aberto: boolean; onToggle: () => void;
}) {
  const cor = corEsforco(c.indiceEsforco);
  const alertasAltos = c.alertas.filter((a) => a.nivel === 'alto');
  const vsTime = (v: number, ref: number) => (ref > 0 ? v / ref : 1);

  return (
    <div className={`rounded-2xl border transition-colors ${aberto ? 'border-[#7C5CFF]/40 bg-white/[0.045]' : 'border-white/10 bg-white/[0.025]'}`}>
      <button onClick={onToggle} className="w-full p-3.5 text-left hover:bg-white/[0.02] rounded-2xl">
        <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
          <span className="grid place-items-center w-11 h-11 rounded-full border shrink-0"
            style={{ borderColor: `${cor}66`, background: `${cor}1a` }} title="Índice de esforço (trabalho, não venda)">
            <span className="al-display text-[15px] font-bold" style={{ color: cor }}>{c.indiceEsforco ?? '—'}</span>
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-white truncate">
              {c.nome}
              {c.tipoConta === 'imobiliaria' && <span className="ml-1 text-[9px] text-amber-300">prop.</span>}
            </span>
            <span className="block text-[10.5px] text-text-secondary">
              {c.leads} leads · {c.ativos} ativos
              {c.vendas > 0 && <> · <b className="text-emerald-300">{c.vendas} venda{c.vendas > 1 ? 's' : ''}</b></>}
              {c.diasSemAtividade !== null && c.diasSemAtividade <= 1 && <> · <span className="text-emerald-300">ativo hoje</span></>}
            </span>
          </div>
          {alertasAltos.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/10 border border-rose-500/40 text-rose-300 shrink-0">
              {alertasAltos.length} alerta{alertasAltos.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-text-secondary text-[12px] shrink-0">{aberto ? '▲' : '▼'}</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          <Metric label="VGV vendido" valor={c.vgv > 0 ? fmtMoeda(c.vgv) : '—'} tom={c.vgv > 0 ? 'al-grad-text' : 'text-white/50'} />
          <Metric label="Conversão" valor={fmtPct1(c.conversao)} tom={vsTime(c.conversao, medias.conversao) < 0.6 ? 'text-rose-300' : c.conversao > medias.conversao ? 'text-emerald-300' : 'text-white'} />
          <Metric label="Comissão dele" valor={c.comissaoGerada > 0 ? fmtMoeda(c.comissaoGerada) : '—'} />
          <Metric label="Qualificação" valor={fmtPct(c.qualifPct)} tom={c.qualifPct < 0.3 ? 'text-rose-300' : c.qualifPct >= 0.6 ? 'text-emerald-300' : 'text-amber-300'} />
          <Metric label="Tarefas atrasadas" valor={String(c.tarefasAtrasadas)} tom={c.tarefasAtrasadas > 0 ? 'text-amber-300' : 'text-white'} />
          <Metric label="Últ. atividade" valor={fmtDiasInt(c.diasSemAtividade)} tom={(c.diasSemAtividade ?? 0) > 7 ? 'text-rose-300' : 'text-white'} />
        </div>
      </button>

      {aberto && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-3.5 border-t border-white/[0.07]">
          {/* alertas — o que cobrar */}
          {c.alertas.length > 0 && (
            <div className="pt-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-secondary mb-1.5">O que cobrar dele</p>
              <div className="space-y-1">
                {c.alertas.map((a) => (
                  <div key={a.chave} className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 border text-[11.5px] ${a.nivel === 'alto' ? 'bg-rose-500/[0.07] border-rose-500/25' : 'bg-amber-500/[0.06] border-amber-500/20'}`}>
                    <span className={a.nivel === 'alto' ? 'text-rose-300' : 'text-amber-300'}>{a.nivel === 'alto' ? '🔴' : '🟡'}</span>
                    <span className="min-w-0">
                      <b className="text-white">{a.titulo}</b>
                      <span className="text-text-secondary"> — {a.detalhe}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* gargalo do funil dele */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-secondary">Funil dele · onde trava</p>
              {c.gargalo && (
                <p className="text-[11px]">
                  <span className="text-text-secondary">gargalo em </span>
                  <b className="text-rose-300">{c.gargalo.etapa}</b>
                  <span className="text-text-secondary"> — só {Math.round(c.gargalo.passagem * 100)}% avançam{c.gargalo.presos > 0 ? `, ${c.gargalo.presos} parado(s) lá` : ''}</span>
                </p>
              )}
            </div>
            <FunilGargalo funil={c.funil} comparar={funilTime} />
          </div>

          {/* números crus */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-secondary mb-1.5">Esforço e ritmo</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 rounded-xl bg-white/[0.03] border border-white/10 p-3">
              <Metric label="Interações" valor={String(c.interacoes)} />
              <Metric label="Por lead ativo" valor={fmtNum(c.interacoesPorLeadAtivo)} tom={(c.interacoesPorLeadAtivo ?? 9) < 1 ? 'text-rose-300' : 'text-white'} hint={medias.interacoesPorLeadAtivo !== null ? `time ${fmtNum(medias.interacoesPorLeadAtivo)}` : undefined} />
              <Metric label="Cadência" valor={fmtDias(c.cadenciaDias)} hint="entre toques" />
              <Metric label="1º contato" valor={fmtDias(c.tempoAteContato)} hint={medias.tempoAteContato !== null ? `time ${fmtDias(medias.tempoAteContato)}` : undefined} />
              <Metric label="Tentativas" valor={fmtNum(c.tentativasMedias)} hint="até falar" />
              <Metric label="Tarefas feitas" valor={String(c.tarefasConcluidas)} />
              <Metric label="Pendentes" valor={String(c.tarefasPendentes)} />
              <Metric label="Sem toque +7d" valor={String(c.leadsSemToque)} tom={c.leadsSemToque > 0 ? 'text-rose-300' : 'text-white'} />
              <Metric label="Parados +14d" valor={String(c.leadsParados)} tom={c.leadsParados > 0 ? 'text-amber-300' : 'text-white'} />
              <Metric label="Interesse futuro" valor={String(c.interesseFuturo)} tom="text-[#7DD3FC]" hint="agenda +15d" />
            </div>
          </div>

          {/* qualidade e descarte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-secondary mb-2">O que ele registra</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1"><span className="text-text-secondary">Qualificação</span><span className="text-white tabular-nums">{fmtPct(c.qualifPct)} <span className="text-text-secondary">· time {fmtPct(medias.qualifPct)}</span></span></div>
                  <Barra pct={c.qualifPct} cor={c.qualifPct < 0.3 ? 'linear-gradient(90deg,#F45B69,#FB7185)' : 'linear-gradient(90deg,#3AC17C,#34D399)'} />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1"><span className="text-text-secondary">Anotação</span><span className="text-white tabular-nums">{fmtPct(c.anotPct)}</span></div>
                  <Barra pct={c.anotPct} cor={c.anotPct < 0.3 ? 'linear-gradient(90deg,#F45B69,#FB7185)' : 'linear-gradient(90deg,#3AC17C,#34D399)'} />
                </div>
                {c.avancouSemQualificar > 0 && (
                  <p className="text-[11px] text-amber-300">🚩 {c.avancouSemQualificar} lead(s) passaram de Meet <b>sem qualificação</b> — trabalhou no escuro.</p>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-secondary mb-2">Descarte · {fmtPct(c.taxaDescarte)} da carteira</p>
              {c.descartes === 0 ? (
                <p className="text-[11.5px] text-text-secondary">Nenhum descarte no período.</p>
              ) : (
                <>
                  {c.descartesRapidos > 0 && (
                    <p className="text-[11px] text-rose-300 mb-1.5">⚡ {c.descartesRapidos} descartado(s) com <b>1 tentativa ou menos</b>.</p>
                  )}
                  <div className="space-y-1">
                    {c.motivosDescarte.slice(0, 5).map((m) => (
                      <div key={m.motivo} className="flex items-center justify-between text-[11.5px]">
                        <span className="text-white/85 truncate">{m.motivo}</span>
                        <span className="tabular-nums text-text-secondary shrink-0">{m.n}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RelatorioGestao({ gestao, comAtividade }: { gestao: ReturnType<typeof computeGestao>; comAtividade: boolean }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<'vgv' | 'esforco' | 'alertas' | 'conversao' | 'leads'>('vgv');

  const lista = useMemo(() => {
    const arr = [...gestao.corretores];
    if (ordem === 'esforco') arr.sort((a, b) => (a.indiceEsforco ?? 999) - (b.indiceEsforco ?? 999));
    if (ordem === 'alertas') arr.sort((a, b) => b.alertas.filter((x) => x.nivel === 'alto').length - a.alertas.filter((x) => x.nivel === 'alto').length);
    if (ordem === 'conversao') arr.sort((a, b) => b.conversao - a.conversao);
    if (ordem === 'leads') arr.sort((a, b) => b.leads - a.leads);
    return arr;
  }, [gestao.corretores, ordem]);

  if (!gestao.corretores.length) {
    return <div className="al-card p-8 text-center text-text-secondary">Nenhum corretor com lead na carteira.</div>;
  }

  return (
    <div className="space-y-4">
      {/* time */}
      <Secao titulo="O time em números" sub="A régua pra comparar cada corretor">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Metric label="Leads" valor={String(gestao.totais.leads)} />
          <Metric label="Ativos" valor={String(gestao.totais.ativos)} />
          <Metric label="Vendas" valor={String(gestao.totais.vendas)} tom="text-emerald-300" />
          <Metric label="VGV" valor={gestao.totais.vgv > 0 ? fmtMoeda(gestao.totais.vgv) : '—'} tom="al-grad-text" />
          <Metric label="Conversão média" valor={fmtPct1(gestao.medias.conversao)} />
          <Metric label="1º contato (méd)" valor={fmtDias(gestao.medias.tempoAteContato)} />
        </div>
      </Secao>

      {/* gargalo do time */}
      <Secao titulo="Onde o funil do time vaza"
        sub={gestao.gargaloTime ? `Maior gargalo: ${gestao.gargaloTime.etapa} — só ${Math.round(gestao.gargaloTime.passagem * 100)}% avançam de lá` : 'Sem volume suficiente pra apontar gargalo'}>
        <FunilGargalo funil={gestao.funilTime} />
      </Secao>

      {/* corretores */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.1em]">Corretor por corretor</h2>
        <span className="text-[11px] text-text-secondary">clique pra abrir o dossiê</span>
        <div className="ml-auto flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/10 p-1">
          {([['vgv', 'VGV'], ['esforco', 'Menor esforço'], ['alertas', 'Mais alertas'], ['conversao', 'Conversão'], ['leads', 'Carteira']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setOrdem(id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${ordem === id ? 'bg-white/[0.10] text-white' : 'text-text-secondary hover:text-white'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {lista.map((c) => (
          <CardCorretor key={c.uid} c={c} funilTime={gestao.funilTime} medias={gestao.medias}
            aberto={aberto === c.uid} onToggle={() => setAberto(aberto === c.uid ? null : c.uid)} />
        ))}
      </div>

      <p className="text-center text-[10px] text-text-secondary px-4">
        O <b>índice de esforço</b> (0-100) mede TRABALHO — presença no CRM, tarefas em dia, toques por lead, qualificação e leads não abandonados.
        É de propósito separado do resultado: dá pra ter esforço alto e conversão baixa (falta técnica) ou o contrário (carteira boa).
        {!comAtividade && ' As métricas de atividade entram quando a leitura da timeline terminar.'}
      </p>
    </div>
  );
}

export default function RelatoriosPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;
  const ativo = !!imobiliariaId && !isEspelhoDemo;
  const { leads, corretores, ads, vendas, minutosExclusivo, loading, error } = useRelatorioData(imobiliariaId, ativo);
  const { mapa, loadingAtiv, progresso } = useAtividade(leads, ativo);

  const [aba, setAba] = useState<'semana' | 'gestao' | 'campanhas' | 'propaganda'>('semana');
  const [periodo, setPeriodo] = useState<Periodo>('tudo');
  const { gastos, totalGasto, erroGasto, carregandoGasto } = useCustoCampanhas(ativo && (aba === 'propaganda' || aba === 'campanhas'), periodo);
  const dist = useMemo(() => computeRelatorioDist(ads, leads, corretores, mapa, periodo, minutosExclusivo), [ads, leads, corretores, mapa, periodo, minutosExclusivo]);
  const comAtividade = mapa.size > 0;

  // no Espelho os relatórios rodam com dados sintéticos (a estrutura é a mesma)
  const demo = useMemo(() => (isEspelhoDemo ? dadosDemo() : null), [isEspelhoDemo]);
  const dLeads = demo ? demo.leads : leads;
  const dCorretores = demo ? demo.corretores : corretores;
  const dVendas = demo ? demo.vendas : vendas;
  const dMapa = demo ? demo.atividade : mapa;

  // quem entra na gestão: corretores aprovados (fora o CRM do proprietário)
  const selecionados = useMemo(
    () => (demo ? demo.selecionados : new Set(corretores.filter((c) => c.aprovado !== false && (c.tipoConta || '').startsWith('corretor')).map((c) => c.id))),
    [demo, corretores]
  );
  const gestao = useMemo(
    () => (isEspelhoDemo ? gestaoDemo() : computeGestao(leads, corretores, vendas, mapa, selecionados)),
    [isEspelhoDemo, leads, corretores, vendas, mapa, selecionados]
  );

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Relatórios</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {loading && !isEspelhoDemo ? 'Carregando…'
                : aba === 'semana' ? 'o dossiê da reunião com cada corretor — gere o PDF e leve pra conversa'
                : aba === 'gestao' ? `${gestao.corretores.length} corretores · ${gestao.totais.leads} leads na régua`
                : aba === 'campanhas' ? 'o resultado dos leads de cada campanha, pronto pra apresentar'
                : `${dist.linhas.length} leads vindos da distribuição`}
              {loadingAtiv && ` · lendo atividade ${Math.round(progresso * 100)}%`}
            </p>
          </div>
          {(aba === 'propaganda' || aba === 'campanhas') && (
            <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/10 p-1">
              {PERIODOS.map((p) => (
                <button key={p.id} onClick={() => setPeriodo(p.id)} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${periodo === p.id ? 'bg-white/[0.10] text-white' : 'text-text-secondary hover:text-white'}`}>{p.label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap rounded-xl border border-white/10 bg-white/[0.04] p-1 gap-1 self-start">
          {([['semana', '🗓️ Semana a semana'], ['gestao', '👥 Gestão de corretores'], ['campanhas', '🎯 Campanhas'], ['propaganda', '🔥 Leads de propaganda']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`px-3.5 py-2 rounded-lg text-[12px] font-bold transition-all ${aba === id ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_0_16px_rgba(255,30,86,0.35)]' : 'text-text-secondary hover:text-white'}`}>{label}</button>
          ))}
        </div>
      </div>

      {isEspelhoDemo && (
        <div className="al-card p-3 text-[12px] text-text-secondary border-l-2 border-l-[#E8C547]">
          <b className="text-white">Modo demonstração.</b> Os números abaixo são de exemplo, só pra mostrar a leitura da tela — o relatório real usa os dados da sua imobiliária.
        </div>
      )}

      {error && !isEspelhoDemo && <div className="al-card p-4 text-rose-300 text-sm">Erro: {error}</div>}
      {loading && !isEspelhoDemo && <div className="al-card p-8 text-center text-text-secondary">Carregando dados…</div>}

      {(!loading || isEspelhoDemo) && aba === 'semana' && (
        <RelatorioSemanal leads={dLeads} corretores={dCorretores} vendas={dVendas}
          atividade={dMapa} selecionados={selecionados} comAtividade={comAtividade || isEspelhoDemo} />
      )}

      {(!loading || isEspelhoDemo) && aba === 'gestao' && <RelatorioGestao gestao={gestao} comAtividade={comAtividade || isEspelhoDemo} />}

      {isEspelhoDemo && (aba === 'propaganda' || aba === 'campanhas') && (
        <div className="al-card p-10 text-center"><p className="text-[40px] mb-2">📊</p><p className="text-sm text-text-secondary">Este relatório lê os anúncios reais da imobiliária — indisponível no modo demonstração.</p></div>
      )}

      {!loading && !isEspelhoDemo && aba === 'campanhas' && (
        <RelatorioCampanha linhas={dist.linhas} vendas={vendas} gastos={gastos} erroGasto={erroGasto}
          periodoLabel={PERIODOS.find((p) => p.id === periodo)?.label || ''} />
      )}

      {!loading && !isEspelhoDemo && aba === 'propaganda' && (
        <RelatorioPropaganda dist={dist} comAtividade={comAtividade}
          gastos={gastos} totalGasto={totalGasto} erroGasto={erroGasto} carregandoGasto={carregandoGasto} />
      )}
    </div>
  );
}
