'use client';

/**
 * Relatórios do admin — LEADS DE PROPAGANDA.
 *
 * Tudo sobre o lead que veio da distribuição: chegada, velocidade de resposta,
 * tratamento (anotação/qualificação), follow-ups, funil e custo/retorno por
 * campanha.
 *
 * A antiga aba "Gestão de corretores" foi removida por inteiro — a lógica dela
 * será definida do zero e entra depois, com estrutura própria.
 */
import React, { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ETAPAS_CIRCUITO } from '@/lib/circuito';
import {
  useRelatorioData, useAtividade, useCustoCampanhas, computeRelatorioDist,
  type Periodo, type LeadDistRow, type GastoCampanha,
  fmtPct, fmtPct1, fmtDias, fmtDiasInt, fmtNum, fmtSeg, fmtMoeda,
} from './logic';

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
function Metric({ label, valor, tom }: { label: string; valor: string; tom?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-text-secondary">{label}</p>
      <p className={`text-[15px] font-bold tabular-nums leading-tight ${tom || 'text-white'}`}>{valor}</p>
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

export default function RelatoriosPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;
  const ativo = !!imobiliariaId && !isEspelhoDemo;
  const { leads, corretores, ads, minutosExclusivo, loading, error } = useRelatorioData(imobiliariaId, ativo);
  const { mapa, loadingAtiv, progresso } = useAtividade(leads, ativo);

  const [periodo, setPeriodo] = useState<Periodo>('tudo');
  const { gastos, totalGasto, erroGasto, carregandoGasto } = useCustoCampanhas(ativo, periodo);
  const dist = useMemo(() => computeRelatorioDist(ads, leads, corretores, mapa, periodo, minutosExclusivo), [ads, leads, corretores, mapa, periodo, minutosExclusivo]);
  const comAtividade = mapa.size > 0;

  if (isEspelhoDemo) {
    return (
      <div className="max-w-3xl mx-auto mt-10 px-4">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="al-card p-10 mt-3 text-center"><p className="text-[40px] mb-2">📊</p><p className="text-sm text-text-secondary">Os relatórios usam os dados reais da imobiliária — indisponíveis no modo demonstração.</p></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Leads de propaganda</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {loading ? 'Carregando…' : `${dist.linhas.length} leads vindos da distribuição`}
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

      {error && <div className="al-card p-4 text-rose-300 text-sm">Erro: {error}</div>}
      {loading && <div className="al-card p-8 text-center text-text-secondary">Carregando dados…</div>}

      {!loading && (
        <RelatorioPropaganda dist={dist} comAtividade={comAtividade}
          gastos={gastos} totalGasto={totalGasto} erroGasto={erroGasto} carregandoGasto={carregandoGasto} />
      )}
    </div>
  );
}
