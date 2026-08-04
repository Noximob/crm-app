'use client';

/**
 * ANÁLISE DE PROPAGANDA — uma aba só, por PERÍODO e/ou por CAMPANHA.
 *
 * Responde duas perguntas com o mesmo dado:
 *   "onde ponho o próximo real?"  → tabela de campanhas com custo por VISITA
 *     FEITA e por VENDA (CPL sozinho compara campanha boa com campanha de
 *     curioso e escolhe errado), separando SLA de atendimento da qualidade da
 *     mídia — campanha "ruim" com 1º contato de 18h é problema de operação;
 *   "o que mostro pra construtora?" → PDF de 1 página da campanha, com o
 *     investimento atrás de um toggle.
 *
 * O seletor de campanha filtra os ADS antes da conta — todas as seções
 * (velocidade, tratamento, funil, por corretor, custo) escopam juntas.
 */
import React, { useMemo, useState } from 'react';
import { ETAPAS_CIRCUITO, ETAPA_FECHADO, ETAPA_MEET_AGENDADO, ETAPA_VISITA_FEITA, etapaIndex } from '@/lib/circuito';
import {
  computeRelatorioDist,
  type Periodo, type LeadDistRow, type GastoCampanha, type RelAdsLead, type RelLead, type RelCorretor, type AtividadeLead, type RelVenda,
  fmtPct, fmtPct1, fmtDias, fmtDiasInt, fmtNum, fmtSeg, fmtMoeda,
} from './logic';

const fmtMoeda2 = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (ms: number) => new Date(ms).toLocaleDateString('pt-BR');

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

// ---------------------------------------------------------------------------
// Profundidade por campanha (a régua de decisão de verba)
// ---------------------------------------------------------------------------

interface CampanhaProfunda {
  nome: string; total: number; aceitos: number;
  meets: number; visitas: number; fechados: number; vgv: number;
  gasto: number;
}

function profundidadePorCampanha(linhas: LeadDistRow[], vendas: RelVenda[], gastos: GastoCampanha[]): CampanhaProfunda[] {
  const idxMeet = etapaIndex(ETAPA_MEET_AGENDADO);
  const idxVisita = etapaIndex(ETAPA_VISITA_FEITA);
  const vgvPorLead = new Map<string, number>();
  for (const v of vendas) {
    if (v.status === 'assinada' && v.leadId) vgvPorLead.set(v.leadId, (vgvPorLead.get(v.leadId) || 0) + (v.vgvLiquido ?? v.valorBruto ?? 0));
  }
  const m = new Map<string, CampanhaProfunda>();
  for (const l of linhas) {
    let c = m.get(l.campanha);
    if (!c) { c = { nome: l.campanha, total: 0, aceitos: 0, meets: 0, visitas: 0, fechados: 0, vgv: 0, gasto: 0 }; m.set(l.campanha, c); }
    c.total++;
    if (l.status === 'aceito') c.aceitos++;
    if (l.maxEtapaIdx >= idxMeet) c.meets++;
    if (l.maxEtapaIdx >= idxVisita) c.visitas++;
    if (l.fechado) c.fechados++;
    if (l.leadId) c.vgv += vgvPorLead.get(l.leadId) || 0;
  }
  for (const c of Array.from(m.values())) c.gasto = gastos.find((g) => g.nome === c.nome)?.gasto ?? 0;
  return Array.from(m.values()).sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// PDF pra construtora (1 página) — o recorte apresentável
// ---------------------------------------------------------------------------

const CSS_PRINT = `
#campanha-print { display: none; }
@media print {
  body * { visibility: hidden; }
  #campanha-print, #campanha-print * { visibility: visible; }
  #campanha-print { display: block; position: absolute; left: 0; top: 0; width: 100%;
    background: #fff; color: #0f172a; font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 13mm 14mm; }
}
#campanha-print .cab { display: flex; justify-content: space-between; align-items: flex-end;
  border-bottom: 2.5px solid #0f172a; padding-bottom: 7px; margin-bottom: 12px; }
#campanha-print .cab-marca { font-size: 9px; font-weight: 800; letter-spacing: 2px; color: #b91c1c; margin: 0; }
#campanha-print h1 { font-size: 19px; margin: 2px 0 0; }
#campanha-print .cab-dir { text-align: right; font-size: 10px; color: #475569; }
#campanha-print h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
  border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 14px 0 8px; }
#campanha-print .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
#campanha-print .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 9px; }
#campanha-print .kpi-r { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
#campanha-print .kpi-v { display: block; font-size: 17px; font-weight: 800; margin-top: 1px; }
#campanha-print .kpi-s { display: block; font-size: 8.5px; color: #64748b; margin-top: 1px; }
#campanha-print .fx-linha { display: flex; align-items: center; gap: 8px; font-size: 10.5px; padding: 2.5px 0; }
#campanha-print .fx-etapa { width: 110px; color: #334155; }
#campanha-print .fx-barra { flex: 1; height: 13px; background: #f1f5f9; border-radius: 7px; overflow: hidden; }
#campanha-print .fx-barra span { display: block; height: 100%; background: linear-gradient(90deg, #b91c1c, #ef4444); border-radius: 7px; min-width: 2px; }
#campanha-print .fx-n { width: 34px; text-align: right; font-weight: 800; }
#campanha-print .fx-pct { width: 40px; text-align: right; color: #64748b; }
#campanha-print .mini { font-size: 9.5px; color: #475569; margin: 4px 0; }
#campanha-print .destaques { display: flex; gap: 8px; margin-top: 4px; }
#campanha-print .destaque { flex: 1; border: 1px solid #e2e8f0; border-left: 3px solid #b91c1c; border-radius: 6px; padding: 7px 10px; }
#campanha-print .destaque b { font-size: 15px; display: block; }
#campanha-print .destaque span { font-size: 8.5px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
#campanha-print .rodape { margin-top: 18px; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
`;

function CampanhaPrint({ linhas, titulo, mostrarCusto, gasto, motivos, tempoMedio1oContatoHoras }: {
  linhas: LeadDistRow[]; titulo: string; mostrarCusto: boolean; gasto: number | null;
  motivos: [string, number][]; tempoMedio1oContatoHoras: number | null;
}) {
  const comLead = linhas.filter((l) => !!l.leadId);
  // ETAPAS_CIRCUITO não contém Descartado; só tiramos o Fechamento (vira "compraram")
  const funil = ETAPAS_CIRCUITO.filter((e) => e !== ETAPA_FECHADO)
    .map((etapa) => ({ etapa, chegaram: comLead.filter((l) => l.maxEtapaIdx >= etapaIndex(etapa)).length }));
  const max = Math.max(1, ...funil.map((f) => f.chegaram));
  const atendidos = comLead.filter((l) => l.tempo1oContatoDias !== null).length;
  const fechados = comLead.filter((l) => l.fechado).length;
  const criados = linhas.map((l) => l.criadoMs).filter(Boolean).sort((a, b) => a - b);
  const meets = comLead.filter((l) => l.maxEtapaIdx >= etapaIndex(ETAPA_MEET_AGENDADO)).length;
  const visitas = comLead.filter((l) => l.maxEtapaIdx >= etapaIndex(ETAPA_VISITA_FEITA)).length;

  return (
    <div id="campanha-print">
      <header className="cab">
        <div><p className="cab-marca">NOX IMÓVEIS · RESULTADO DE CAMPANHA</p><h1>{titulo}</h1></div>
        <div className="cab-dir">
          {criados.length > 0 && <p>leads recebidos de {fmtData(criados[0])} a {fmtData(criados[criados.length - 1])}</p>}
          <p>relatório gerado em {fmtData(Date.now())}</p>
        </div>
      </header>
      <div className="kpis">
        <div className="kpi"><span className="kpi-r">Leads recebidos</span><span className="kpi-v">{linhas.length}</span></div>
        <div className="kpi"><span className="kpi-r">Atendidos</span><span className="kpi-v">{comLead.length ? fmtPct(atendidos / comLead.length) : '—'}</span>
          {tempoMedio1oContatoHoras !== null && <span className="kpi-s">1º contato em {tempoMedio1oContatoHoras}h em média</span>}</div>
        <div className="kpi"><span className="kpi-r">Em atendimento hoje</span><span className="kpi-v">{comLead.filter((l) => !l.fechado && !l.descartado).length}</span>
          <span className="kpi-s">{comLead.filter((l) => l.descartado).length} sem perfil/desistiram</span></div>
        <div className="kpi"><span className="kpi-r">Vendas geradas</span><span className="kpi-v">{fechados || '—'}</span></div>
      </div>

      <h2>Do anúncio à venda — onde cada lead chegou</h2>
      {funil.map((f) => (
        <div key={f.etapa} className="fx-linha">
          <span className="fx-etapa">{f.etapa}</span>
          <div className="fx-barra"><span style={{ width: `${Math.max(2, (f.chegaram / max) * 100)}%` }} /></div>
          <span className="fx-n">{f.chegaram}</span>
          <span className="fx-pct">{comLead.length ? fmtPct(f.chegaram / comLead.length) : '—'}</span>
        </div>
      ))}
      <p className="mini">Cada linha: quantos leads chegaram ao menos àquela etapa. Percentual sobre os {comLead.length} leads em atendimento no CRM.</p>
      {motivos.length > 0 && <p className="mini">Motivos de descarte: {motivos.map(([m, n]) => `${m} (${n})`).join(' · ')} — o raio-X do público que o anúncio atraiu.</p>}

      <h2>Resumo</h2>
      <div className="destaques">
        <div className="destaque"><b>{linhas.length}</b><span>leads gerados</span></div>
        <div className="destaque"><b>{meets}</b><span>chegaram a reunião</span></div>
        <div className="destaque"><b>{visitas}</b><span>visitaram</span></div>
        <div className="destaque"><b>{fechados}</b><span>compraram</span></div>
      </div>

      {mostrarCusto && gasto !== null && gasto > 0 && (
        <>
          <h2>Investimento</h2>
          <div className="destaques">
            <div className="destaque"><b>{fmtMoeda2(gasto)}</b><span>investido</span></div>
            <div className="destaque"><b>{linhas.length ? fmtMoeda2(gasto / linhas.length) : '—'}</b><span>por lead</span></div>
            <div className="destaque"><b>{visitas ? fmtMoeda2(gasto / visitas) : '—'}</b><span>por visita feita</span></div>
            <div className="destaque"><b>{fechados ? fmtMoeda2(gasto / fechados) : '—'}</b><span>por venda</span></div>
          </div>
        </>
      )}
      <p className="rodape">Nox Imóveis — CRM · leads em atendimento seguem evoluindo; este retrato é do dia da geração do relatório.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A aba inteira
// ---------------------------------------------------------------------------

export function AnalisePropagandaView({ ads, leads, corretores, mapa, vendas, periodo, minutosExclusivo, comAtividade, gastos, totalGasto, erroGasto, carregandoGasto }: {
  ads: RelAdsLead[]; leads: RelLead[]; corretores: RelCorretor[]; mapa: Map<string, AtividadeLead>;
  vendas: RelVenda[]; periodo: Periodo; minutosExclusivo: number; comAtividade: boolean;
  gastos: GastoCampanha[]; totalGasto: number; erroGasto: string | null; carregandoGasto: boolean;
}) {
  const campanhas = useMemo(() => {
    const s = new Set<string>();
    for (const a of ads) s.add(String((a as { campanhaNome?: string }).campanhaNome || '(sem campanha)'));
    return Array.from(s).sort();
  }, [ads]);
  const [campSel, setCampSel] = useState('');
  const [mostrarCusto, setMostrarCusto] = useState(false);

  // o seletor de campanha filtra ANTES da conta — tudo escopa junto
  const adsF = useMemo(
    () => (campSel ? ads.filter((a) => String((a as { campanhaNome?: string }).campanhaNome || '(sem campanha)') === campSel) : ads),
    [ads, campSel]
  );
  const dist = useMemo(
    () => computeRelatorioDist(adsF, leads, corretores, mapa, periodo, minutosExclusivo),
    [adsF, leads, corretores, mapa, periodo, minutosExclusivo]
  );
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

  const profundas = useMemo(() => profundidadePorCampanha(linhas, vendas, gastos), [linhas, vendas, gastos]);
  const motivosDescarte = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of linhas) if (l.descartado && l.leadId) m.set(l.descartadoMotivo || 'sem motivo', (m.get(l.descartadoMotivo || 'sem motivo') || 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [linhas]);
  const gastoEscopo = campSel ? (gastos.find((g) => g.nome === campSel)?.gasto ?? null) : (totalGasto || null);
  const t1MedHoras = r.tempoMedio1oContato !== null ? Math.round(r.tempoMedio1oContato * 24 * 10) / 10 : null;

  if (ads.length === 0) {
    return <div className="al-card p-8 text-center text-text-secondary">Nenhum lead de propaganda ainda. Quando as campanhas entregarem, tudo aparece aqui.</div>;
  }

  const maxEt = Math.max(1, ...Object.values(r.porEtapa));
  const chip = (id: typeof filtro, txt: string, n: number) => (
    <button onClick={() => setFiltro(id)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${filtro === id ? 'bg-white/[0.12] text-white' : 'bg-white/[0.04] text-text-secondary hover:text-white'}`}>
      {txt} <span className="tabular-nums opacity-70">{n}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* seletor de campanha + PDF construtora */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select value={campSel} onChange={(e) => setCampSel(e.target.value)}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40 max-w-[320px]">
            <option value="">Todas as campanhas ({ads.length} leads)</option>
            {campanhas.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-[11.5px] text-text-secondary cursor-pointer select-none">
            <input type="checkbox" checked={mostrarCusto} onChange={(e) => setMostrarCusto(e.target.checked)} className="accent-[#E8C547]" />
            incluir investimento no PDF
          </label>
        </div>
        <button onClick={() => window.print()} disabled={linhas.length === 0}
          className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40">
          🖨️ PDF pra construtora (1 página)
        </button>
      </div>

      {linhas.length === 0 && <div className="al-card p-8 text-center text-text-secondary">Nenhum lead dessa campanha no período.</div>}

      {linhas.length > 0 && <>
      {/* 1. O que chegou */}
      <Secao titulo="1 · O que chegou" sub={campSel ? `Campanha: ${campSel}` : 'Todas as campanhas no período'}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Metric label="Leads recebidos" valor={String(r.total)} />
          <Metric label="Aceitos" valor={String(r.aceitos)} tom="text-emerald-300" />
          <Metric label="Taxa de aceite" valor={fmtPct(r.taxaAceite)} />
          <Metric label="Perdidos (ninguém pegou)" valor={String(r.naoAtendidos)} tom={r.naoAtendidos ? 'text-rose-300' : 'text-white'} />
          <Metric label="Ainda na fila" valor={String(r.naFila)} />
          <Metric label="Fechados" valor={`${r.fechados} · ${fmtPct1(r.conversao)}`} tom="text-emerald-300" />
        </div>
      </Secao>

      {/* 2. Velocidade */}
      <Secao titulo={`2 · Velocidade de resposta (janela de ${r.janelaMin} min)`} sub="Antes de julgar a mídia, veja o atendimento: campanha 'ruim' com resposta lenta é problema de operação">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Metric label="Tempo médio p/ aceitar" valor={fmtSeg(r.tempoMedioAceiteSeg)} />
          <Metric label="Mediana" valor={fmtSeg(r.medianaAceiteSeg)} />
          <Metric label={`Atendidos em até ${r.janelaMin} min`} valor={String(r.dentroDaJanela)} tom="text-emerald-300" />
          <Metric label={`Passaram dos ${r.janelaMin} min`} valor={String(r.estouraramJanela)} tom={r.estouraramJanela ? 'text-amber-300' : 'text-white'} />
          <Metric label="Perderam a vez (bolsão)" valor={String(r.perderamAVez)} tom={r.perderamAVez ? 'text-rose-300' : 'text-white'} />
        </div>
        <p className="mt-2 text-[10px] text-text-secondary">
          <b>Passou dos {r.janelaMin} min</b> = demorou mais que a janela exclusiva. <b>Perdeu a vez</b> = a janela venceu e o lead abriu pro bolsão.
        </p>
      </Secao>

      {/* Quem não atendeu na janela */}
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
        </Secao>
      )}

      {/* Tratamento + descarte */}
      <Secao titulo="3 · Tratamento do lead" sub="Depois que caiu no CRM: anotou? qualificou? em quanto tempo falou? por que descartou?">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Metric label="Com anotação" valor={`${r.comAnotacao}`} />
          <Metric label="% anotação" valor={fmtPct(r.pctAnotacao)} tom={r.pctAnotacao < 0.5 ? 'text-amber-300' : 'text-emerald-300'} />
          <Metric label="Com qualificação" valor={`${r.comQualificacao}`} />
          <Metric label="% qualificação" valor={fmtPct(r.pctQualificacao)} tom={r.pctQualificacao < 0.5 ? 'text-amber-300' : 'text-emerald-300'} />
          <Metric label="1º contato (méd)" valor={fmtDias(r.tempoMedio1oContato)} />
          <Metric label="Sem nenhum toque" valor={comAtividade ? String(r.semNenhumToque) : '—'} tom="text-rose-300" />
        </div>
        {motivosDescarte.length > 0 && (
          <p className="mt-3 text-[11px] text-text-secondary">
            <b className="text-white/80">Motivos de descarte:</b> {motivosDescarte.map(([m, n]) => `${m} (${n})`).join(' · ')}
            <span className="block mt-0.5 text-[10px]">motivo repetido tipo &quot;sem perfil&quot;/&quot;só curioso&quot; = o anúncio está atraindo o público errado — conversa com o gestor de tráfego, não com o corretor.</span>
          </p>
        )}
      </Secao>

      {/* Funil */}
      <Secao titulo="4 · Onde estão no funil" sub="Etapa atual dos leads dessa seleção">
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

      {/* Onde pôr dinheiro */}
      <Secao titulo="5 · Onde pôr o próximo real" sub="Custo por VISITA e por VENDA decidem — CPL sozinho compara campanha boa com campanha de curioso">
        {carregandoGasto && <p className="text-[11px] text-text-secondary mb-2">lendo o gasto no Meta…</p>}
        {erroGasto && <p className="text-[11px] text-amber-300 mb-2">⚠ Gasto indisponível ({erroGasto}) — os volumes seguem valendo.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-text-secondary">
                {['Campanha', 'Gasto', 'Leads', 'CPL', 'Meets', 'Visitas', 'Vendas', 'VGV', 'R$/visita', 'R$/venda'].map((h, i) => (
                  <th key={h} className={`px-2 py-2 font-bold whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profundas.map((c) => (
                <tr key={c.nome} className="border-t border-white/[0.06]">
                  <td className="px-2 py-2 text-white/90 max-w-[240px] truncate" title={c.nome}>{c.nome}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.gasto > 0 ? fmtMoeda(c.gasto) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.total}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/60">{c.gasto > 0 && c.total ? fmtMoeda(c.gasto / c.total) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.meets}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.visitas}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-emerald-300 font-bold">{c.fechados}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.vgv > 0 ? fmtMoeda(c.vgv) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-bold text-white">{c.gasto > 0 && c.visitas ? fmtMoeda(c.gasto / c.visitas) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-bold text-white">{c.gasto > 0 && c.fechados ? fmtMoeda(c.gasto / c.fechados) : '—'}</td>
                </tr>
              ))}
              {gastos.filter((g) => g.gasto > 0 && !profundas.some((c) => c.nome === g.nome) && (!campSel || g.nome === campSel)).map((g) => (
                <tr key={g.campanhaId} className="border-t border-white/[0.06] opacity-70">
                  <td className="px-2 py-2 text-white/70 max-w-[240px] truncate" title={g.nome}>{g.nome}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtMoeda(g.gasto)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-rose-300" title="gastou e nenhum lead chegou no CRM">0</td>
                  <td colSpan={7} className="px-2 py-2 text-right text-[10px] text-rose-300/80">gastou e nenhum lead chegou — investigar</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-text-secondary">Meets/Visitas pela catraca: quem está na frente passou por trás. Sem gasto informado, use visitas e VGV por campanha como régua.</p>
      </Secao>

      {/* Por corretor */}
      <Secao titulo="6 · Por corretor" sub="Quem recebeu, quem respondeu e quem trabalha o lead de propaganda">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-text-secondary">
                {['Corretor', 'Receb.', 'Aceitos', 'Tempo aceite', `Passou ${r.janelaMin}min`, 'Perdeu a vez', 'Negou', 'Anot%', 'Qualif%', '1º contato', 'FU feitos', 'FU atras.', 'Fech.', 'Conv.'].map((h, i) => (
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
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{c.fuConcluidos}/{c.fuCriados}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${c.fuAtrasados > 0 ? 'text-rose-300 font-bold' : 'text-white/50'}`}>{c.fuAtrasados}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-emerald-300">{c.fechados}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtPct1(c.conversao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      {/* Lead a lead */}
      <Secao titulo="7 · Lead a lead" sub={`${visiveis.length} de ${linhas.length} — clique nos filtros pra caçar problema`}>
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

      <style dangerouslySetInnerHTML={{ __html: CSS_PRINT }} />
      <CampanhaPrint linhas={linhas} titulo={campSel || 'Todas as campanhas'} mostrarCusto={mostrarCusto}
        gasto={gastoEscopo} motivos={motivosDescarte} tempoMedio1oContatoHoras={t1MedHoras} />
      </>}
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
