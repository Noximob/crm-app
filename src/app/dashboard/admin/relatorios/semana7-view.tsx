'use client';

/**
 * SEMANA DOS CORRETORES — os ÚLTIMOS 7 DIAS de todo o time, lado a lado.
 *
 * Diferença pra Análise do corretor: lá é o dossiê profundo de UM corretor
 * num período navegável (a pauta da 1:1); aqui é o pente rápido da semana —
 * o gestor passa o olho em TODOS de uma vez e vê, por corretor:
 *   - o funil da carteira dele agora (quantos leads em cada etapa);
 *   - as propagandas que ele atendeu: campanha, tempo de aceite e se pegou
 *     o PRÓPRIO (escalado pra ele) ou no BOLSÃO — e quem deixou vencer;
 *   - tarefas vencidas há mais de 24h;
 *   - meets e visitas marcadas × feitas nos 7 dias;
 *   - e o resto que conta a semana: novos + 1º contato, toques/dias ativos,
 *     avanços, descartes, vendas/VGV.
 *
 * Janela ROLANTE (agora − 7 dias), não semana-calendário — "últimos 7 dias"
 * é literal: aberto na quinta, cobre quinta a quinta.
 */
import React, { useMemo, useState } from 'react';
import { ETAPAS_CIRCUITO, ETAPA_FECHADO, ETAPA_DESCARTADO, mapEtapaCircuito, etapaIndex } from '@/lib/circuito';
import { metricasJanela, mediana, type MetricasJanela } from './corretor';
import { msOf, fmtSeg, type RelLead, type RelCorretor, type AtividadeLead, type RelVenda, type LeadDistRow } from './logic';

const DIA = 24 * 60 * 60 * 1000;
const HORA = 3_600_000;
const fmtMoeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtH = (h: number | null): string => h === null ? '—' : h < 1 ? `${Math.round(h * 60)}min` : h < 48 ? `${Math.round(h * 10) / 10}h` : `${Math.round(h / 24)}d`;

// ---------------------------------------------------------------------------
// Conta dos 7 dias de um corretor
// ---------------------------------------------------------------------------

interface AdsAtendido {
  nome: string;
  campanha: string;
  aceiteSeg: number | null;
  origem: 'proprio' | 'bolsao' | 'perdeu';
}

interface Semana7Corretor {
  uid: string;
  nome: string;
  m: MetricasJanela;
  // funil da carteira AGORA + o que saiu dela nos 7d
  funil: { etapa: string; n: number }[];
  ativos: number;
  fechadosCarteira: number;
  descartadosCarteira: number;
  // velocidade dos novos
  t1MedianaHoras: number | null;
  novosSemContato: number;
  // propagandas
  ads: AdsAtendido[];
  aceiteMedianoSeg: number | null;
  adsProprios: number;
  adsBolsao: number;
  adsPerdeu: number;
  // disciplina — "deixou atrasar +24h" é o TOTAL: as que ainda estão vencidas
  // e as que ele acabou fazendo com mais de um dia de atraso. Contar só as
  // abertas deixaria zerar o número fazendo tudo atrasado na véspera da 1:1.
  atrasadas24h: number;
  atrasadasAbertas: number;
  atrasadasFeitasTarde: number;
  semToque7d: number;
  atencao: number; // pra ordenar: quem precisa de olho primeiro
}

function computeSemana7(
  leads: RelLead[], corretores: RelCorretor[], vendas: RelVenda[],
  atividade: Map<string, AtividadeLead> | null, distLinhas: LeadDistRow[],
  selecionados: Set<string>, agora = Date.now(),
): Semana7Corretor[] {
  const ini = agora - 7 * DIA;
  const fim = agora + 1;
  const nomeDe = new Map(corretores.map((c) => [c.id, c.nome] as const));

  const porCorretor = new Map<string, RelLead[]>();
  for (const l of leads) {
    if (!l.userId || !selecionados.has(l.userId)) continue;
    const arr = porCorretor.get(l.userId) || [];
    arr.push(l);
    porCorretor.set(l.userId, arr);
  }

  const out: Semana7Corretor[] = [];
  for (const uid of Array.from(selecionados)) {
    const meus = porCorretor.get(uid) || [];
    const minhasVendas = vendas.filter((v) => v.corretorUid === uid);
    const m = metricasJanela(meus, minhasVendas, atividade, ini, fim);

    // funil da carteira agora
    const funil = ETAPAS_CIRCUITO.map((e) => ({ etapa: e, n: 0 }));
    let ativos = 0, fechadosCarteira = 0, descartadosCarteira = 0, semToque7d = 0;
    let atrasadasAbertas = 0, atrasadasFeitasTarde = 0;
    const t1s: number[] = [];
    let novosSemContato = 0;
    for (const l of meus) {
      const et = mapEtapaCircuito(l.etapa);
      const idx = etapaIndex(et);
      if (et === ETAPA_FECHADO) fechadosCarteira++;
      else if (et === ETAPA_DESCARTADO) descartadosCarteira++;
      else {
        ativos++;
        if (idx >= 0 && funil[idx]) funil[idx].n++;
        const at = atividade?.get(l.id);
        const ult = at?.eventos.length ? at.eventos[at.eventos.length - 1].ms : msOf(l.createdAt);
        if (ult > 0 && (agora - ult) / DIA > 7) semToque7d++;
      }
      const cMs = msOf(l.createdAt);
      if (cMs >= ini) {
        const pMs = msOf(l.circuito?.primeiroContatoEm);
        if (pMs >= cMs && pMs > 0) t1s.push((pMs - cMs) / HORA);
        else if (et !== ETAPA_DESCARTADO && (agora - cMs) / HORA >= 24) novosSemContato++;
      }
      const atT = atividade?.get(l.id);
      if (atT) for (const t of atT.tarefas) {
        if (t.dueMs <= 0) continue;
        const concluida = /conclu/i.test(t.status);
        const cancelada = /cancel/i.test(t.status);
        // ainda vencida agora, há mais de um dia
        if (!concluida && !cancelada && t.dueMs < agora - DIA) atrasadasAbertas++;
        // fez, mas só depois de deixar passar +24h (conclusão dentro da janela)
        else if (concluida && t.concluidaMs > 0 && t.concluidaMs >= ini && t.concluidaMs - t.dueMs > DIA) atrasadasFeitasTarde++;
      }
    }

    // propagandas dos 7 dias que tocaram esse corretor
    const ads: AdsAtendido[] = [];
    for (const l of distLinhas) {
      if (l.criadoMs < ini) continue;
      if (l.expirouDe === uid) {
        ads.push({ nome: l.nome, campanha: l.campanha, aceiteSeg: null, origem: 'perdeu' });
      } else if (l.aceitoPor === uid) {
        ads.push({ nome: l.nome, campanha: l.campanha, aceiteSeg: l.tempoAceiteSeg, origem: l.pegouNoBolsao ? 'bolsao' : 'proprio' });
      }
    }
    ads.sort((a, b) => (a.origem === 'perdeu' ? -1 : 0) - (b.origem === 'perdeu' ? -1 : 0) || (b.aceiteSeg || 0) - (a.aceiteSeg || 0));
    const aceites = ads.filter((a) => a.origem !== 'perdeu' && a.aceiteSeg !== null).map((a) => a.aceiteSeg as number);
    const adsPerdeu = ads.filter((a) => a.origem === 'perdeu').length;

    out.push({
      uid, nome: nomeDe.get(uid) || uid.slice(0, 6), m,
      funil, ativos, fechadosCarteira, descartadosCarteira,
      t1MedianaHoras: mediana(t1s), novosSemContato,
      ads, aceiteMedianoSeg: mediana(aceites),
      adsProprios: ads.filter((a) => a.origem === 'proprio').length,
      adsBolsao: ads.filter((a) => a.origem === 'bolsao').length,
      adsPerdeu,
      atrasadas24h: atrasadasAbertas + atrasadasFeitasTarde, atrasadasAbertas, atrasadasFeitasTarde,
      semToque7d,
      // pendente em aberto pesa mais que a que ele acabou fazendo
      atencao: atrasadasAbertas * 2 + atrasadasFeitasTarde + semToque7d + novosSemContato + adsPerdeu * 2,
    });
  }
  // quem mais precisa de olho primeiro
  return out.sort((a, b) => b.atencao - a.atencao || b.m.toques - a.m.toques);
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const ORIGEM_BADGE: Record<AdsAtendido['origem'], { txt: string; cls: string }> = {
  proprio: { txt: 'próprio', cls: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' },
  bolsao: { txt: 'bolsão', cls: 'bg-sky-500/10 border-sky-500/40 text-sky-300' },
  perdeu: { txt: 'perdeu a vez', cls: 'bg-rose-500/10 border-rose-500/40 text-rose-300' },
};

function Num({ rotulo, v, tom, hint }: { rotulo: string; v: React.ReactNode; tom?: string; hint?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary">{rotulo}</p>
      <p className={`al-display text-[17px] font-bold tabular-nums leading-tight ${tom || 'text-white'}`}>{v}</p>
      {hint && <p className="text-[9.5px] text-text-secondary mt-0.5">{hint}</p>}
    </div>
  );
}

export function Semana7View({ leads, corretores, vendas, atividade, distLinhas, selecionados, comAtividade }: {
  leads: RelLead[]; corretores: RelCorretor[]; vendas: RelVenda[];
  atividade: Map<string, AtividadeLead>; distLinhas: LeadDistRow[];
  selecionados: Set<string>; comAtividade: boolean;
}) {
  const lista = useMemo(
    () => computeSemana7(leads, corretores, vendas, atividade, distLinhas, selecionados),
    [leads, corretores, vendas, atividade, distLinhas, selecionados]
  );
  const [aberto, setAberto] = useState<string | null>(lista[0]?.uid || null);

  const maxFunil = (c: Semana7Corretor) => Math.max(1, ...c.funil.map((f) => f.n));
  const pct = (n: number, de: number) => de > 0 ? `${Math.round((n / de) * 100)}%` : '—';

  if (lista.length === 0) return <div className="al-card p-8 text-center text-text-secondary">Nenhum corretor na régua.</div>;

  return (
    <div className="space-y-3">
      {!comAtividade && (
        <div className="al-card p-3 text-[12px] text-amber-300/90">Lendo a atividade dos leads — toques e tarefas completam em instantes.</div>
      )}
      <p className="text-[11px] text-text-secondary">Janela corrida: de {new Date(Date.now() - 7 * DIA).toLocaleDateString('pt-BR')} até agora · ordenado por quem mais precisa de atenção.</p>

      {lista.map((c) => {
        const estaAberto = aberto === c.uid;
        return (
          <section key={c.uid} className="al-card relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 gx-line" />
            {/* cabeçalho-resumo (sempre visível) */}
            <button onClick={() => setAberto(estaAberto ? null : c.uid)} className="w-full text-left px-4 sm:px-5 py-3 hover:bg-white/[0.03] transition-colors">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="al-display text-[14px] font-bold text-white uppercase tracking-[0.08em] min-w-[150px]">{c.nome}</span>
                <span className="text-[11.5px] text-text-secondary tabular-nums flex-1">
                  {c.m.leadsNovos} novos · {c.m.toques} toques em {c.m.diasAtivos}d
                  · meets {c.m.meetsFeitos}/{c.m.meetsAgendados} · visitas {c.m.visitasFeitas}/{c.m.visitasAgendadas}
                  {c.adsProprios + c.adsBolsao > 0 && <> · {c.adsProprios + c.adsBolsao} propaganda{c.adsProprios + c.adsBolsao !== 1 ? 's' : ''}</>}
                  {c.m.vendas > 0 && <b className="text-emerald-300"> · {c.m.vendas} venda{c.m.vendas > 1 ? 's' : ''} ({fmtMoeda(c.m.vgv)})</b>}
                </span>
                {c.adsPerdeu > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 border border-rose-500/40 text-rose-300">{c.adsPerdeu} lead{c.adsPerdeu > 1 ? 's' : ''} pago{c.adsPerdeu > 1 ? 's' : ''} perdido{c.adsPerdeu > 1 ? 's' : ''}</span>}
                {c.atrasadas24h > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${c.atrasadasAbertas > 0 ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' : 'bg-amber-500/10 border-amber-500/40 text-amber-300'}`}
                    title={`${c.atrasadasAbertas} ainda em aberto · ${c.atrasadasFeitasTarde} concluídas com mais de 24h de atraso`}>
                    {c.atrasadas24h} tarefa{c.atrasadas24h > 1 ? 's' : ''} atrasada{c.atrasadas24h > 1 ? 's' : ''} +24h
                    {c.atrasadasAbertas > 0 && ` (${c.atrasadasAbertas} aberta${c.atrasadasAbertas > 1 ? 's' : ''})`}
                  </span>
                )}
                <span className="text-text-secondary text-[11px]">{estaAberto ? '▲' : '▼'}</span>
              </div>
            </button>

            {estaAberto && (
              <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-white/[0.06] grid lg:grid-cols-2 gap-x-6 gap-y-4">
                {/* funil da carteira */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">Funil de vendas — a carteira dele agora</p>
                  <div className="space-y-1">
                    {c.funil.filter((f) => f.etapa !== ETAPA_FECHADO).map((f) => (
                      <div key={f.etapa} className="flex items-center gap-2 text-[11.5px]">
                        <span className="w-28 shrink-0 text-text-secondary truncate">{f.etapa}</span>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.07] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(f.n ? 4 : 0, (f.n / maxFunil(c)) * 100)}%`, background: 'linear-gradient(90deg,#7C5CFF,#B48CFF)' }} />
                        </div>
                        <span className="w-7 text-right font-bold tabular-nums text-white">{f.n || '—'}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10.5px] text-text-secondary mt-1.5">
                    <b className="text-white">{c.ativos}</b> ativos · {c.fechadosCarteira} fechados · {c.descartadosCarteira} descartados (histórico)
                    {c.semToque7d > 0 && <> · <b className="text-amber-300">{c.semToque7d} sem toque há +7d</b></>}
                  </p>

                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mt-3 mb-1.5">A semana em números</p>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                    <Num rotulo="Novos → atendidos" v={`${c.m.novosAtendidos}/${c.m.leadsNovos}`} tom={c.novosSemContato > 0 ? 'text-amber-300' : 'text-white'} hint={c.novosSemContato > 0 ? `${c.novosSemContato} sem contato +24h` : undefined} />
                    <Num rotulo="1º contato (mediana)" v={fmtH(c.t1MedianaHoras)} tom={c.t1MedianaHoras !== null && c.t1MedianaHoras > 12 ? 'text-rose-300' : 'text-white'} />
                    <Num rotulo="Avanços de etapa" v={c.m.avancos} />
                    <Num rotulo="Meets marc. × feitos" v={`${c.m.meetsAgendados} × ${c.m.meetsFeitos}`} tom={c.m.meetsAgendados >= 2 && c.m.meetsFeitos === 0 ? 'text-rose-300' : 'text-white'} hint={c.m.meetsAgendados > 0 ? `${pct(c.m.meetsFeitos, c.m.meetsAgendados)} aconteceram` : undefined} />
                    <Num rotulo="Visitas marc. × feitas" v={`${c.m.visitasAgendadas} × ${c.m.visitasFeitas}`} hint={c.m.visitasAgendadas > 0 ? `${pct(c.m.visitasFeitas, c.m.visitasAgendadas)} aconteceram` : undefined} />
                    <Num rotulo="Deixou atrasar +24h" v={c.atrasadas24h} tom={c.atrasadas24h > 0 ? 'text-rose-300' : 'text-emerald-300'}
                      hint={c.atrasadas24h > 0
                        ? [c.atrasadasAbertas > 0 ? `${c.atrasadasAbertas} ainda em aberto` : '', c.atrasadasFeitasTarde > 0 ? `${c.atrasadasFeitasTarde} fez atrasado` : ''].filter(Boolean).join(' · ')
                        : 'nenhuma passou de um dia'} />
                    <Num rotulo="Descartes" v={c.m.descartes} hint={c.m.descartesRapidos > 0 ? `${c.m.descartesRapidos} no 1º toque` : undefined} tom={c.m.descartesRapidos > 0 ? 'text-amber-300' : 'text-white'} />
                    <Num rotulo="Tarefas concluídas" v={c.m.tarefasConcluidas} />
                    <Num rotulo="Vendas · VGV" v={c.m.vendas > 0 ? `${c.m.vendas} · ${fmtMoeda(c.m.vgv)}` : '—'} tom={c.m.vendas > 0 ? 'text-emerald-300' : 'text-white'} />
                  </div>
                </div>

                {/* propagandas atendidas */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">
                    Propagandas nos 7 dias
                    {c.ads.length > 0 && (
                      <span className="normal-case font-normal tracking-normal">
                        {' — '}{c.adsProprios} própria{c.adsProprios !== 1 ? 's' : ''} · {c.adsBolsao} de bolsão
                        {c.adsPerdeu > 0 && <span className="text-rose-300"> · {c.adsPerdeu} perdido{c.adsPerdeu > 1 ? 's' : ''}</span>}
                        {c.aceiteMedianoSeg !== null && <> · aceite mediano <b className="text-white">{fmtSeg(c.aceiteMedianoSeg)}</b></>}
                      </span>
                    )}
                  </p>
                  {c.ads.length === 0 && <p className="text-[11px] text-text-secondary">Nenhum lead de propaganda passou por ele nos últimos 7 dias.</p>}
                  <div className="space-y-1">
                    {c.ads.slice(0, 10).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11.5px]">
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold border shrink-0 ${ORIGEM_BADGE[a.origem].cls}`}>{ORIGEM_BADGE[a.origem].txt}</span>
                        <span className="text-white/90 font-semibold truncate">{a.nome}</span>
                        <span className="text-text-secondary truncate flex-1" title={a.campanha}>· {a.campanha}</span>
                        <span className={`tabular-nums shrink-0 ${a.origem === 'perdeu' ? 'text-rose-300' : (a.aceiteSeg || 0) > 300 ? 'text-amber-300 font-bold' : 'text-white/80'}`}>
                          {a.origem === 'perdeu' ? 'janela venceu' : fmtSeg(a.aceiteSeg)}
                        </span>
                      </div>
                    ))}
                    {c.ads.length > 10 && <p className="text-[10px] text-text-secondary">… e mais {c.ads.length - 10} (a lista completa está na Análise de propaganda)</p>}
                  </div>
                  <p className="text-[10px] text-text-secondary mt-2">
                    <b>próprio</b> = escalado pra ele e aceitou · <b>bolsão</b> = pegou aberto pra todos · <b>perdeu a vez</b> = era dele, deixou a janela vencer.
                    Aceite acima de 5min aparece em âmbar.
                  </p>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
