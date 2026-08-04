'use client';

/**
 * ANÁLISE DO CORRETOR — tela (dark) + PDF 1:1 (A4 claro, máx. 2 páginas).
 *
 * A tela tem o placar do time (navegação do gestor — de propósito FORA do
 * PDF: na 1:1 compara-se com a média, nunca com ranking público) e o dossiê
 * do corretor selecionado. Os COMBINADOS persistem no Firestore e reabrem na
 * próxima reunião com status — é a continuidade que relatório solto não tem.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, addDoc, doc, updateDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { showToast } from '@/components/ui/toast';
import { computeAnalise, type DossieCorretor, type Farol, type CasoNominal, type NumeroPlacar } from './corretor';
import { periodoDe, PRESETS_PERIODO, type TipoPeriodo, type PeriodoAnalise } from './periodo';
import type { RelLead, RelCorretor, AtividadeLead, RelVenda, LeadDistRow } from './logic';

const fmtMoeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtData = (ms: number) => new Date(ms).toLocaleDateString('pt-BR');
const fmtH = (h: number | null): string => h === null ? '—' : h < 1 ? `${Math.round(h * 60)}min` : h < 48 ? `${Math.round(h * 10) / 10}h` : `${Math.round(h / 24)}d`;

// farol: cor na tela, símbolo no papel (a impressora da imobiliária é P&B)
const FAROL_COR: Record<Farol, string> = { bom: 'text-emerald-300', atencao: 'text-amber-300', ruim: 'text-rose-300', neutro: 'text-white' };
const FAROL_SIMB: Record<Farol, string> = { bom: '●', atencao: '▲', ruim: '✖', neutro: '○' };

// ---------------------------------------------------------------------------
// Combinados — persistidos, com repescagem na próxima 1:1
// ---------------------------------------------------------------------------

export interface Combinado {
  id: string;
  texto: string;
  periodoLabel: string;
  status: 'aberto' | 'cumprido' | 'nao_cumprido';
  criadoEmMs: number;
}

function useCombinados(imobiliariaId: string | undefined, corretorUid: string, ativo: boolean) {
  const [itens, setItens] = useState<Combinado[]>([]);
  useEffect(() => {
    // limpa SEMPRE ao trocar de corretor: até o snapshot novo chegar, os
    // combinados do anterior não podem aparecer sob o cabeçalho do novo
    setItens([]);
    if (!ativo || !imobiliariaId || !corretorUid) return;
    const q = query(collection(db, 'combinados1a1'),
      where('imobiliariaId', '==', imobiliariaId), where('corretorUid', '==', corretorUid));
    return onSnapshot(q, (s) => {
      const arr: Combinado[] = s.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id, texto: String(x.texto || ''), periodoLabel: String(x.periodoLabel || ''),
          status: (x.status as Combinado['status']) || 'aberto',
          criadoEmMs: (x.criadoEm?.toMillis?.() as number) || 0,
        };
      }).sort((a, b) => b.criadoEmMs - a.criadoEmMs);
      setItens(arr);
    }, () => {});
  }, [imobiliariaId, corretorUid, ativo]);
  return itens;
}

// ---------------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------------

function CartaoPlacar({ p }: { p: NumeroPlacar }) {
  return (
    <div className={`rounded-xl border p-3 ${p.farol === 'ruim' ? 'border-rose-500/40 bg-rose-500/[0.06]' : p.farol === 'atencao' ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-white/[0.08] bg-white/[0.02]'}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary">{FAROL_SIMB[p.farol]} {p.rotulo}</p>
      <p className={`al-display text-[20px] font-bold tabular-nums leading-tight ${FAROL_COR[p.farol]}`}>{p.valor}</p>
      {p.delta && <p className={`text-[10px] mt-0.5 font-semibold ${p.deltaBom === null ? 'text-text-secondary' : p.deltaBom ? 'text-emerald-300' : 'text-rose-300'}`}>{p.deltaBom !== null && (p.deltaBom ? '▲ ' : '▼ ')}{p.delta}</p>}
      {p.hint && <p className="text-[9.5px] text-text-secondary mt-0.5">{p.hint}</p>}
    </div>
  );
}

function ListaNominal({ titulo, casos, vazio }: { titulo: string; casos: CasoNominal[]; vazio?: string }) {
  if (!casos.length) return vazio ? <p className="text-[11px] text-text-secondary">{vazio}</p> : null;
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">{titulo}</p>
      {casos.map((c, i) => (
        <p key={i} className="text-[11.5px] py-0.5">
          <span className={c.critico ? 'text-rose-300 font-bold' : 'text-white/90'}>{c.nome}</span>
          <span className="text-text-secondary"> — {c.detalhe}</span>
        </p>
      ))}
    </div>
  );
}

function SecaoD({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="al-card relative overflow-hidden p-4 sm:p-5">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em] mb-3">{titulo}</h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// CSS impressão
// ---------------------------------------------------------------------------

const CSS_PRINT = `
#dossie-print { display: none; }
@media print {
  body * { visibility: hidden; }
  #dossie-print, #dossie-print * { visibility: visible; }
  #dossie-print { display: block; position: absolute; left: 0; top: 0; width: 100%;
    background: #fff; color: #111827; font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 11mm 12mm; }
}
#dossie-print .pg { break-after: page; }
#dossie-print .pg:last-child { break-after: auto; }
#dossie-print .cab { display: flex; justify-content: space-between; align-items: flex-end;
  border-bottom: 2.5px solid #111827; padding-bottom: 6px; margin-bottom: 10px; }
#dossie-print .cab-marca { font-size: 9px; font-weight: 800; letter-spacing: 2px; color: #b91c1c; margin: 0; }
#dossie-print h1 { font-size: 20px; margin: 2px 0 0; }
#dossie-print .cab-dir { text-align: right; font-size: 10px; color: #4b5563; }
#dossie-print h2 { font-size: 10.5px; text-transform: uppercase; letter-spacing: 1.4px;
  border-bottom: 1px solid #d1d5db; padding-bottom: 3px; margin: 12px 0 6px; }
#dossie-print .placar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
#dossie-print .np { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 8px; }
#dossie-print .np.ruim { border-color: #111827; border-width: 2px; }
#dossie-print .np-r { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: .8px; color: #6b7280; }
#dossie-print .np-v { display: block; font-size: 16px; font-weight: 800; }
#dossie-print .np-d { display: block; font-size: 8.5px; color: #4b5563; }
#dossie-print .gargalo { border: 2px solid #111827; border-radius: 6px; padding: 7px 10px; margin-top: 8px;
  font-size: 11.5px; font-weight: 700; }
#dossie-print .duascol { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
#dossie-print ul { margin: 3px 0; padding-left: 15px; font-size: 10.5px; line-height: 1.45; }
#dossie-print .nominal { font-size: 10px; margin: 2px 0; }
#dossie-print .nominal b { font-weight: 800; }
#dossie-print .nominal.critico::before { content: "✖ "; font-weight: 800; }
#dossie-print .nominal::before { content: "☐ "; }
#dossie-print .mini { font-size: 9px; color: #6b7280; margin: 3px 0; }
#dossie-print table { width: 100%; border-collapse: collapse; font-size: 10px; }
#dossie-print th { text-align: left; font-size: 8px; text-transform: uppercase; color: #6b7280;
  border-bottom: 1.5px solid #111827; padding: 3px 4px; }
#dossie-print td { border-bottom: 1px solid #e5e7eb; padding: 3.5px 4px; }
#dossie-print td.num { text-align: right; font-variant-numeric: tabular-nums; }
#dossie-print .linha-escrever { border-bottom: 1px solid #9ca3af; height: 21px; }
#dossie-print .assin { display: flex; justify-content: space-between; font-size: 9.5px; color: #4b5563; margin-top: 12px; }
`;

// ---------------------------------------------------------------------------
// PDF (2 páginas)
// ---------------------------------------------------------------------------

function DossiePrint({ d, periodo, combinados }: { d: DossieCorretor; periodo: PeriodoAnalise; combinados: Combinado[] }) {
  const abertos = combinados.filter((c) => c.status === 'aberto');
  const pct = (n: number, de: number) => de > 0 ? `${Math.round((n / de) * 100)}%` : '—';
  return (
    <div id="dossie-print">
      {/* PÁGINA 1 — a reunião inteira: se só imprimir uma folha, é essa */}
      <section className="pg">
        <header className="cab">
          <div>
            <p className="cab-marca">NOX IMÓVEIS · ANÁLISE 1:1</p>
            <h1>{d.nome}</h1>
          </div>
          <div className="cab-dir">
            <p><b>{periodo.label}</b> · {d.ativos} leads ativos</p>
            <p>gerado em {fmtData(Date.now())}</p>
          </div>
        </header>

        <div className="placar">
          {d.placar.map((p) => (
            <div key={p.chave} className={`np ${p.farol}`}>
              <span className="np-r">{FAROL_SIMB[p.farol]} {p.rotulo}</span>
              <span className="np-v">{p.valor}</span>
              {(p.delta || p.hint) && <span className="np-d">{p.delta || p.hint}</span>}
            </div>
          ))}
        </div>
        {d.gargalo && <div className="gargalo">GARGALO DO PERÍODO — {d.gargalo}</div>}

        <div className="duascol">
          <div>
            <h2>Melhorou</h2>
            {d.melhoras.length ? <ul>{d.melhoras.map((m, i) => <li key={i}>{m}</li>)}</ul> : <p className="mini">Nada melhorou vs o período anterior.</p>}
          </div>
          <div>
            <h2>Piorou</h2>
            {d.pioras.length ? <ul>{d.pioras.map((m, i) => <li key={i}>{m}</li>)}</ul> : <p className="mini">Nada piorou vs o período anterior.</p>}
          </div>
        </div>

        <h2>Combinados da reunião anterior</h2>
        {abertos.length
          ? abertos.map((c) => <p key={c.id} className="nominal"><b>{c.texto}</b> — combinado em {c.periodoLabel} · cumpriu? SIM ☐ NÃO ☐</p>)
          : <p className="mini">Sem combinados em aberto.</p>}

        <h2>Combinados desta reunião</h2>
        <div className="linha-escrever" /><div className="linha-escrever" /><div className="linha-escrever" />
        <div className="assin">
          <span>Data ____/____/______</span>
          <span>Gestor ____________________</span>
          <span>Corretor ____________________</span>
        </div>
      </section>

      {/* PÁGINA 2 — as provas, nominais */}
      <section className="pg">
        <header className="cab">
          <div><p className="cab-marca">NOX IMÓVEIS · ANÁLISE 1:1 — PROVAS</p><h1>{d.nome}</h1></div>
          <div className="cab-dir"><p><b>{periodo.label}</b></p></div>
        </header>

        <div className="duascol">
          <div>
            <h2>Velocidade de atendimento (leads novos)</h2>
            <table><tbody>
              {d.faixasT1.map((f) => <tr key={f.rotulo}><td>{f.rotulo}</td><td className="num"><b>{f.n}</b></td></tr>)}
            </tbody></table>
            {d.piorT1 && <p className="nominal critico"><b>{d.piorT1.nome}</b> — {d.piorT1.detalhe}</p>}
            {d.novosSemContato.map((c, i) => <p key={i} className={`nominal ${c.critico ? 'critico' : ''}`}><b>{c.nome}</b> — {c.detalhe}</p>)}
            {d.rodizio && (
              <>
                <h2>Rodízio de leads de anúncio</h2>
                <p className="mini">{d.rodizio.recebidos} recebidos · aceite mediano {d.rodizio.aceiteMedianoSeg !== null ? `${Math.round(d.rodizio.aceiteMedianoSeg / 60)}min` : '—'}{d.rodizio.negou > 0 ? ` · negou ${d.rodizio.negou}` : ''}</p>
                {d.rodizio.expirou.map((c, i) => <p key={i} className="nominal critico"><b>{c.nome}</b> — {c.detalhe}</p>)}
              </>
            )}
            <h2>Agenda: marcado sem acontecer</h2>
            {d.noShowsMeet.length + d.noShowsVisita.length === 0 && <p className="mini">Nenhum meet/visita pendurado.</p>}
            {d.noShowsMeet.map((c, i) => <p key={i} className={`nominal ${c.critico ? 'critico' : ''}`}><b>{c.nome}</b> — {c.detalhe}</p>)}
            {d.noShowsVisita.map((c, i) => <p key={i} className={`nominal ${c.critico ? 'critico' : ''}`}><b>{c.nome}</b> — {c.detalhe}</p>)}
          </div>
          <div>
            <h2>Carteira parada — dinheiro esquecido</h2>
            <p className="mini">+7d: <b>{d.parados.d7}</b> · +14d: <b>{d.parados.d14}</b> · +30d: <b>{d.parados.d30}</b> ({Math.round(d.parados.pctCarteira * 100)}% da carteira ativa)</p>
            {d.paradosNominais.map((c, i) => <p key={i} className={`nominal ${c.critico ? 'critico' : ''}`}><b>{c.nome}</b> — {c.detalhe}</p>)}

            <h2>Funil do período · ele vs time</h2>
            <table>
              <thead><tr><th>Passagem</th><th>Ele</th><th>Time</th></tr></thead>
              <tbody>
                {d.razoes.map((r) => (
                  <tr key={r.rotulo}>
                    <td>{r.rotulo}{r.amostraCurta ? ' *' : ''}</td>
                    <td className="num">{r.dele ? `${r.dele.n}/${r.dele.de} (${pct(r.dele.n, r.dele.de)})` : '—'}</td>
                    <td className="num">{r.time ? pct(r.time.n, r.time.de) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mini">* amostra pequena — número informativo, não julgue por ele.</p>
            <p className="mini">Descartes: {d.descartes.total}{d.descartes.precoces > 0 && <> · <b>{d.descartes.precoces} no 1º toque</b></>}{d.descartes.motivos.length > 0 && <> · {d.descartes.motivos.map(([m, n]) => `${m} (${n})`).join(' · ')}</>}</p>

            <h2>Disciplina</h2>
            <p className="mini">
              Tarefas no prazo: <b>{d.disciplina.tarefasNoPrazo}</b> · feitas atrasadas: <b>{d.disciplina.tarefasAtrasadas}</b> · vencidas em aberto: <b>{d.disciplina.vencidasAgora}</b><br />
              Dias com atividade: <b>{d.disciplina.diasAtivos}/{d.disciplina.diasPeriodo}</b>{d.disciplina.diasSemAcessar !== null && d.disciplina.diasSemAcessar > 1 && <> · sem abrir o sistema há <b>{d.disciplina.diasSemAcessar}d</b></>}
            </p>

            <h2>Resultado</h2>
            <p className="mini">
              Vendas: <b>{d.resultado.vendas}</b> · VGV: <b>{fmtMoeda(d.resultado.vgv)}</b> · comissão dele: <b>{fmtMoeda(d.resultado.comissao)}</b>
              {d.resultado.cicloMedianoDias !== null && <> · ciclo mediano lead→venda: <b>{d.resultado.cicloMedianoDias}d</b></>}
              {d.resultado.distratos > 0 && <> · <b>{d.resultado.distratos} distrato(s)</b></>}
            </p>

            <h2>Últimas 8 semanas (toques · meets · visitas · vendas)</h2>
            <table>
              <thead><tr><th>Semana</th><th>Toq</th><th>Meet</th><th>Vis</th><th>Vnd</th></tr></thead>
              <tbody>
                {d.serie.map((s) => (
                  <tr key={s.label}><td>{s.label}</td><td className="num">{s.toques}</td><td className="num">{s.meetsFeitos}</td><td className="num">{s.visitasFeitas}</td><td className="num">{s.vendas}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

export function AnaliseCorretorView({ leads, corretores, vendas, atividade, distLinhas, selecionados, comAtividade, imobiliariaId, isDemo }: {
  leads: RelLead[]; corretores: RelCorretor[]; vendas: RelVenda[];
  atividade: Map<string, AtividadeLead>; distLinhas: LeadDistRow[];
  selecionados: Set<string>; comAtividade: boolean;
  imobiliariaId: string | undefined; isDemo: boolean;
}) {
  const [tipo, setTipo] = useState<TipoPeriodo>('semana');
  const [offset, setOffset] = useState(() => (new Date().getDay() === 1 ? -1 : 0));
  const periodo = useMemo(() => periodoDe(tipo, offset), [tipo, offset]);

  const analise = useMemo(
    () => computeAnalise(leads, corretores, vendas, atividade, distLinhas, selecionados, periodo),
    [leads, corretores, vendas, atividade, distLinhas, selecionados, periodo]
  );

  const [sel, setSel] = useState<string>('');
  // FIXA a seleção no primeiro dado disponível: sem isso, a ordenação do
  // placar muda quando a atividade termina de carregar e o dossiê (e o alvo
  // do combinado, e o PDF) trocariam de corretor sozinhos, sem clique.
  useEffect(() => {
    if (!sel && analise.time.length > 0) setSel(analise.time[0].uid);
  }, [sel, analise.time]);
  const uidSel = sel && analise.time.some((t) => t.uid === sel) ? sel : (analise.time[0]?.uid || '');
  const d = uidSel ? analise.dossieDe(uidSel) : null;

  const combinados = useCombinados(imobiliariaId, uidSel, !isDemo && !!uidSel);
  const [novoCombinado, setNovoCombinado] = useState('');
  const addCombinado = async () => {
    const texto = novoCombinado.trim();
    if (!texto || !imobiliariaId || !uidSel) return;
    if (isDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    try {
      await addDoc(collection(db, 'combinados1a1'), {
        imobiliariaId, corretorUid: uidSel, texto, periodoLabel: periodo.label, status: 'aberto', criadoEm: serverTimestamp(),
      });
      setNovoCombinado('');
    } catch { showToast('Não foi possível salvar o combinado.', 'error'); }
  };
  const marcarCombinado = async (id: string, status: Combinado['status']) => {
    if (isDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    try { await updateDoc(doc(db, 'combinados1a1', id), { status, resolvidoEm: serverTimestamp() }); }
    catch { showToast('Não foi possível atualizar.', 'error'); }
  };
  const abertos = combinados.filter((c) => c.status === 'aberto');

  const pct = (n: number, de: number) => de > 0 ? `${Math.round((n / de) * 100)}%` : '—';

  return (
    <div className="space-y-4">
      {/* controles */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/10 p-1">
            {PRESETS_PERIODO.map((p) => (
              <button key={p.tipo} onClick={() => { setTipo(p.tipo); setOffset(0); }}
                className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-colors ${tipo === p.tipo ? 'bg-white/[0.12] text-white' : 'text-text-secondary hover:text-white'}`}>{p.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/10 p-1">
            <button onClick={() => setOffset((o) => o - 1)} className="px-2.5 py-1.5 rounded-lg text-[13px] font-bold text-text-secondary hover:text-white hover:bg-white/[0.08]">‹</button>
            <span className="px-1.5 text-[12px] font-bold text-white tabular-nums whitespace-nowrap">{periodo.ehCorrente ? `${periodo.label} (atual)` : periodo.label}</span>
            <button onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={offset === 0}
              className="px-2.5 py-1.5 rounded-lg text-[13px] font-bold text-text-secondary hover:text-white hover:bg-white/[0.08] disabled:opacity-30">›</button>
          </div>
        </div>
        <button onClick={() => window.print()} disabled={!d}
          className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40">
          🖨️ PDF da 1:1 {d ? `— ${d.nome.split(' ')[0]}` : ''} (2 páginas)
        </button>
      </div>

      {!comAtividade && (
        <div className="al-card p-3 text-[12px] text-amber-300/90">Lendo a atividade dos leads — toques, tarefas e "parados" completam em instantes.</div>
      )}

      {/* placar do time — navegação (não entra no PDF) */}
      <SecaoD titulo="O time no período · clique pra abrir a análise">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-text-secondary">
                {['Corretor', 'Novos', '1º contato', 'Parados +7d', 'Meets', 'Visitas', 'Vendas', 'VGV', 'Alertas'].map((h, i) => (
                  <th key={h} className={`px-2 py-1.5 font-bold whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analise.time.map((t) => (
                <tr key={t.uid} onClick={() => setSel(t.uid)}
                  className={`border-t border-white/[0.06] cursor-pointer transition-colors ${t.uid === uidSel ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'}`}>
                  <td className="px-2 py-2 font-bold text-white whitespace-nowrap">{t.uid === uidSel ? '▸ ' : ''}{t.nome}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{t.novos}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{fmtH(t.t1MedianaHoras)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${t.parados7 > 0 ? 'text-amber-300 font-bold' : 'text-white/60'}`}>{t.parados7}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{t.meetsFeitos}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{t.visitasFeitas}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${t.vendas > 0 ? 'text-emerald-300 font-bold' : 'text-white/60'}`}>{t.vendas}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/90">{t.vgv > 0 ? fmtMoeda(t.vgv) : '—'}</td>
                  <td className="px-2 py-2 text-right">{t.farolRuins > 0 ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 border border-rose-500/40 text-rose-300">{t.farolRuins} ✖</span> : <span className="text-white/40">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SecaoD>

      {d && (
        <>
          {/* placar do corretor */}
          <SecaoD titulo={`${d.nome} — placar de ${periodo.label}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {d.placar.map((p) => <CartaoPlacar key={p.chave} p={p} />)}
            </div>
            {d.gargalo && (
              <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/[0.07] px-3 py-2 text-[12.5px] font-bold text-rose-200">
                🎯 GARGALO DO PERÍODO — {d.gargalo}
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-300 mb-1">▲ Melhorou</p>
                {d.melhoras.length ? d.melhoras.map((m, i) => <p key={i} className="text-[11.5px] text-white/85 py-0.5">• {m}</p>) : <p className="text-[11px] text-text-secondary">Nada melhorou vs o período anterior.</p>}
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-rose-300 mb-1">▼ Piorou</p>
                {d.pioras.length ? d.pioras.map((m, i) => <p key={i} className="text-[11.5px] text-white/85 py-0.5">• {m}</p>) : <p className="text-[11px] text-text-secondary">Nada piorou vs o período anterior.</p>}
              </div>
            </div>
          </SecaoD>

          <div className="grid lg:grid-cols-2 gap-4 items-start">
            <SecaoD titulo="Velocidade de atendimento — leads novos do período">
              <div className="space-y-1 mb-3">
                {d.faixasT1.map((f) => (
                  <div key={f.rotulo} className="flex items-center gap-2 text-[12px]">
                    <span className="w-32 text-text-secondary">{f.rotulo}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.07] overflow-hidden">
                      <div className={`h-full rounded-full ${f.tom === 'ruim' ? 'bg-rose-400' : f.tom === 'atencao' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(100, f.n * 14)}%`, minWidth: f.n ? 6 : 0 }} />
                    </div>
                    <span className="w-6 text-right font-bold tabular-nums text-white">{f.n}</span>
                  </div>
                ))}
              </div>
              {d.piorT1 && <p className="text-[11.5px] py-0.5"><span className="text-rose-300 font-bold">{d.piorT1.nome}</span><span className="text-text-secondary"> — {d.piorT1.detalhe}</span></p>}
              <ListaNominal titulo="Ainda sem 1º contato" casos={d.novosSemContato} />
              {d.rodizio && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <p className="text-[11px] text-text-secondary mb-1">
                    Rodízio de anúncio: <b className="text-white">{d.rodizio.recebidos}</b> recebidos
                    · aceite mediano <b className="text-white">{d.rodizio.aceiteMedianoSeg !== null ? `${Math.round(d.rodizio.aceiteMedianoSeg / 60)}min` : '—'}</b>
                    {d.rodizio.negou > 0 && <> · negou <b className="text-amber-300">{d.rodizio.negou}</b></>}
                  </p>
                  <ListaNominal titulo="Deixou lead pago vencer" casos={d.rodizio.expirou} />
                </div>
              )}
            </SecaoD>

            <SecaoD titulo="Agenda — marcado que não aconteceu">
              <p className="text-[11px] text-text-secondary mb-2">
                Meets: <b className="text-white">{d.atual.meetsFeitos}/{d.atual.meetsAgendados}</b> ({pct(d.atual.meetsFeitos, d.atual.meetsAgendados)})
                · Visitas: <b className="text-white">{d.atual.visitasFeitas}/{d.atual.visitasAgendadas}</b> ({pct(d.atual.visitasFeitas, d.atual.visitasAgendadas)})
              </p>
              <div className="space-y-2">
                <ListaNominal titulo="Meets pendurados" casos={d.noShowsMeet} vazio="Nenhum meet marcado ficou pendurado." />
                <ListaNominal titulo="Visitas penduradas" casos={d.noShowsVisita} vazio="Nenhuma visita marcada ficou pendurada." />
              </div>
              <p className="mt-2 text-[10px] text-text-secondary">No-show alto quase sempre é falta de confirmação na véspera — cobrança barata, resultado imediato.</p>
            </SecaoD>

            <SecaoD titulo="Carteira parada — dinheiro esquecido">
              <p className="text-[11px] text-text-secondary mb-2">
                +7d sem toque: <b className={d.parados.d7 ? 'text-amber-300' : 'text-white'}>{d.parados.d7}</b>
                · +14d: <b className="text-white">{d.parados.d14}</b>
                · +30d: <b className={d.parados.d30 ? 'text-rose-300' : 'text-white'}>{d.parados.d30}</b>
                {d.ativos > 0 && <> · {Math.round(d.parados.pctCarteira * 100)}% da carteira</>}
              </p>
              <ListaNominal titulo="Os piores — apontar na reunião" casos={d.paradosNominais} vazio="Nenhum lead ativo abandonado. 👏" />
            </SecaoD>

            <SecaoD titulo="Funil do período · ele vs time">
              <div className="space-y-1.5">
                {d.razoes.map((r) => {
                  const pDele = r.dele && r.dele.de > 0 ? r.dele.n / r.dele.de : null;
                  const pTime = r.time && r.time.de > 0 ? r.time.n / r.time.de : null;
                  const ruim = pDele !== null && pTime !== null && !r.amostraCurta && pDele < pTime - 0.15;
                  return (
                    <div key={r.rotulo} className="flex items-center gap-2 text-[11.5px]">
                      <span className="flex-1 text-text-secondary">{r.rotulo}{r.amostraCurta && <span className="text-white/30" title="amostra pequena — não julgue"> *</span>}</span>
                      <span className={`w-24 text-right tabular-nums font-bold ${ruim ? 'text-rose-300' : 'text-white'}`}>
                        {r.dele ? `${r.dele.n}/${r.dele.de} (${pct(r.dele.n, r.dele.de)})` : '—'}
                      </span>
                      <span className="w-16 text-right tabular-nums text-text-secondary">{r.time ? `time ${pct(r.time.n, r.time.de)}` : ''}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-text-secondary">
                Descartes no período: <b className="text-white">{d.descartes.total}</b>
                {d.descartes.precoces > 0 && <> · <b className="text-rose-300">{d.descartes.precoces} no 1º toque</b> (lead pago indo embora sem briga)</>}
                {d.descartes.motivos.length > 0 && <> · {d.descartes.motivos.map(([m, n]) => `${m} (${n})`).join(' · ')}</>}
              </p>
              <p className="mt-1 text-[10px] text-text-secondary">* amostra pequena — informativo, não conclusivo. Comparação sempre com o time agregado, nunca ranking.</p>
            </SecaoD>

            <SecaoD titulo="Disciplina e presença">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary">Tarefas no prazo</p><p className="al-display text-[18px] font-bold text-white tabular-nums">{d.disciplina.tarefasNoPrazo}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary">Feitas atrasadas</p><p className={`al-display text-[18px] font-bold tabular-nums ${d.disciplina.tarefasAtrasadas ? 'text-amber-300' : 'text-white'}`}>{d.disciplina.tarefasAtrasadas}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary">Vencidas em aberto</p><p className={`al-display text-[18px] font-bold tabular-nums ${d.disciplina.vencidasAgora ? 'text-rose-300' : 'text-white'}`}>{d.disciplina.vencidasAgora}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary">Dias com atividade</p><p className="al-display text-[18px] font-bold text-white tabular-nums">{d.disciplina.diasAtivos}/{d.disciplina.diasPeriodo}</p></div>
              </div>
              {d.disciplina.diasSemAcessar !== null && d.disciplina.diasSemAcessar > 2 && (
                <p className="mt-2 text-[11.5px] text-rose-300 font-bold">Sem abrir o sistema há {d.disciplina.diasSemAcessar} dias.</p>
              )}
              <p className="mt-2 text-[10px] text-text-secondary">Toques no período: {d.atual.toques} (contexto, não mérito — atividade sem avanço de etapa é ruído).</p>
            </SecaoD>

            <SecaoD titulo="Resultado e tendência">
              <p className="text-[12px] text-white/90 mb-2">
                <b className="text-emerald-300">{d.resultado.vendas}</b> venda{d.resultado.vendas === 1 ? '' : 's'} · VGV <b className="text-white">{fmtMoeda(d.resultado.vgv)}</b> · comissão dele <b className="text-white">{fmtMoeda(d.resultado.comissao)}</b>
                {d.resultado.cicloMedianoDias !== null && <> · ciclo lead→venda <b className="text-white">{d.resultado.cicloMedianoDias}d</b></>}
                {d.resultado.distratos > 0 && <> · <b className="text-rose-300">{d.resultado.distratos} distrato(s)</b></>}
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Últimas 8 semanas — toques · meets · visitas · vendas</p>
              <div className="overflow-x-auto">
                <table className="text-[11px] border-collapse tabular-nums">
                  <tbody>
                    <tr>{d.serie.map((s) => <td key={s.label} className="px-2 py-0.5 text-text-secondary text-center whitespace-nowrap">{s.label}</td>)}</tr>
                    <tr>{d.serie.map((s) => <td key={s.label} className="px-2 py-0.5 text-center text-white/90">{s.toques}·{s.meetsFeitos}·{s.visitasFeitas}·<b className={s.vendas ? 'text-emerald-300' : ''}>{s.vendas}</b></td>)}</tr>
                  </tbody>
                </table>
              </div>
            </SecaoD>
          </div>

          {/* combinados */}
          <SecaoD titulo="Combinados da 1:1 — o que dá continuidade">
            {abertos.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {abertos.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
                    <span className="flex-1 text-[12px] text-white/90">{c.texto} <span className="text-text-secondary">· {c.periodoLabel}</span></span>
                    <button onClick={() => marcarCombinado(c.id, 'cumprido')} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20">✓ cumpriu</button>
                    <button onClick={() => marcarCombinado(c.id, 'nao_cumprido')} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-500/10 border border-rose-500/40 text-rose-300 hover:bg-rose-500/20">✗ não</button>
                  </div>
                ))}
              </div>
            )}
            {combinados.filter((c) => c.status !== 'aberto').slice(0, 4).map((c) => (
              <p key={c.id} className="text-[11px] text-text-secondary py-0.5">
                {c.status === 'cumprido' ? '✅' : '❌'} {c.texto} <span className="opacity-60">· {c.periodoLabel}</span>
              </p>
            ))}
            <div className="flex gap-2 mt-2">
              <input value={novoCombinado} onChange={(e) => setNovoCombinado(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCombinado()}
                placeholder={`Novo combinado com ${d.nome.split(' ')[0]} — ex: "1º contato < 2h na próxima semana"`}
                className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[12.5px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40" />
              <button onClick={addCombinado} className="px-3.5 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]">+ combinar</button>
            </div>
            <p className="mt-2 text-[10px] text-text-secondary">Os combinados em aberto reaparecem na próxima 1:1 (e no PDF) até você marcar cumpriu/não cumpriu — é isso que separa pauta de ritual.</p>
          </SecaoD>

          {analise.historicoDesdeMs && (
            <p className="text-[10px] text-text-secondary">Movimento de etapa é carimbado desde {fmtData(analise.historicoDesdeMs)} — períodos anteriores subnotificam meets/visitas/avanços.</p>
          )}

          <style dangerouslySetInnerHTML={{ __html: CSS_PRINT }} />
          <DossiePrint d={d} periodo={periodo} combinados={combinados} />
        </>
      )}

      {!d && <div className="al-card p-8 text-center text-text-secondary">Nenhum corretor na régua.</div>}
    </div>
  );
}
