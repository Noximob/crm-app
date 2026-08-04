'use client';

/**
 * ANÁLISE DO CORRETOR — o motor do dossiê 1:1.
 *
 * Desenhado a partir do consenso de três leituras gerenciais (cobrador /
 * diretor comercial / consultor de CRM):
 *   - MEDIANA, nunca média (um lead atendido em 5 dias destrói a média e o
 *     corretor desqualifica o relatório inteiro);
 *   - listas NOMINAIS: a cobrança aponta lead com nome, não estatística;
 *   - semáforo honesto: verde só quando está BOM — melhorou mas continua ruim
 *     fica amarelo, pro gestor não comemorar mediocridade em recuperação;
 *   - comparação com o TIME agregado (nunca ranking público na 1:1);
 *   - o que foi cortado de propósito: score composto, volume bruto de
 *     atividade como mérito, funil all-time, VGV "em negociação".
 *
 * Puro — sem Firebase. Quem chama entrega leads/vendas/atividade/dist.
 */
import {
  mapEtapaCircuito, etapaIndex,
  ETAPA_FECHADO, ETAPA_DESCARTADO, ETAPA_MEET_AGENDADO, ETAPA_MEET_FEITO,
  ETAPA_VISITA_AGENDADA, ETAPA_VISITA_FEITA, ETAPA_NEGOCIACAO,
} from '@/lib/circuito';
import { msOf, type RelLead, type RelCorretor, type AtividadeLead, type RelVenda, type LeadDistRow } from './logic';
import { periodoAnterior, serieSemanas, type PeriodoAnalise } from './periodo';

const DIA = 24 * 60 * 60 * 1000;
const HORA = 3_600_000;

// ---------------------------------------------------------------------------
// Métricas de UMA janela [iniMs, fimMs) — a mesma conta pra atual, anterior,
// time agregado e série semanal. Fontes: createdAt, primeiroContatoEm,
// descartadoEm, etapasHist, interactions, tarefas (concluidaMs) e /vendas.
// ---------------------------------------------------------------------------

export interface MetricasJanela {
  leadsNovos: number;
  novosAtendidos: number;
  toques: number;
  diasAtivos: number;
  tarefasConcluidas: number;
  primeirosContatos: number;
  tempoMedio1oContatoHoras: number | null;
  avancos: number;
  chegaramEm: Record<string, number>;
  meetsAgendados: number; meetsFeitos: number;
  visitasAgendadas: number; visitasFeitas: number; negociacoes: number;
  descartes: number; descartesRapidos: number;
  motivosDescarte: [string, number][];
  vendas: number; vgv: number; comissao: number;
}

const JANELA_VAZIA: MetricasJanela = {
  leadsNovos: 0, novosAtendidos: 0, toques: 0, diasAtivos: 0, tarefasConcluidas: 0,
  primeirosContatos: 0, tempoMedio1oContatoHoras: null, avancos: 0, chegaramEm: {},
  meetsAgendados: 0, meetsFeitos: 0, visitasAgendadas: 0, visitasFeitas: 0, negociacoes: 0,
  descartes: 0, descartesRapidos: 0, motivosDescarte: [], vendas: 0, vgv: 0, comissao: 0,
};

const ymdLocal = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function metricasJanela(
  meus: RelLead[], minhasVendas: RelVenda[], atividade: Map<string, AtividadeLead> | null,
  iniMs: number, fimMs: number,
): MetricasJanela {
  const m: MetricasJanela = { ...JANELA_VAZIA, chegaramEm: {}, motivosDescarte: [] };
  const dentroJ = (ms: number) => ms >= iniMs && ms < fimMs;
  const dias = new Set<string>();
  const somaT1: number[] = [];
  const motivos = new Map<string, number>();

  for (const l of meus) {
    const cMs = msOf(l.createdAt);
    const pMs = msOf(l.circuito?.primeiroContatoEm);
    if (dentroJ(cMs)) {
      m.leadsNovos++;
      if (pMs >= cMs && pMs > 0) m.novosAtendidos++;
    }
    if (pMs > 0 && dentroJ(pMs)) {
      m.primeirosContatos++;
      if (cMs > 0 && pMs >= cMs && pMs - cMs <= 30 * DIA) somaT1.push((pMs - cMs) / HORA);
    }
    const dMs = msOf(l.descartadoEm);
    if (dMs > 0 && dentroJ(dMs)) {
      m.descartes++;
      if ((l.circuito?.tentativas || 0) <= 1) m.descartesRapidos++;
      const mo = (l.descartadoMotivo as string) || 'sem motivo';
      motivos.set(mo, (motivos.get(mo) || 0) + 1);
    }
    for (const t of histDe(l)) {
      const em = msOf(t.em);
      if (!em || !dentroJ(em) || !t.para) continue;
      const para = mapEtapaCircuito(t.para);
      const de = t.de ? mapEtapaCircuito(t.de) : '';
      m.chegaramEm[para] = (m.chegaramEm[para] || 0) + 1;
      if (de && etapaIndex(para) > etapaIndex(de)) m.avancos++;
      if (para === ETAPA_MEET_AGENDADO) m.meetsAgendados++;
      if (para === ETAPA_MEET_FEITO) m.meetsFeitos++;
      if (para === ETAPA_VISITA_AGENDADA) m.visitasAgendadas++;
      if (para === ETAPA_VISITA_FEITA) m.visitasFeitas++;
      if (para === ETAPA_NEGOCIACAO) m.negociacoes++;
    }
    const at = atividade?.get(l.id);
    if (at) {
      for (const e of at.eventos) {
        if (!dentroJ(e.ms)) continue;
        m.toques++;
        dias.add(ymdLocal(e.ms));
      }
      for (const t of at.tarefas) if (t.concluidaMs > 0 && dentroJ(t.concluidaMs)) m.tarefasConcluidas++;
    }
  }

  const iniY = ymdLocal(iniMs), fimY = ymdLocal(fimMs - 1);
  for (const v of minhasVendas) {
    if (v.status !== 'assinada' || !v.dataVenda) continue;
    if (v.dataVenda < iniY || v.dataVenda > fimY) continue;
    m.vendas++;
    m.vgv += v.vgvLiquido ?? v.valorBruto ?? 0;
    m.comissao += (v.rateio || []).find((b) => b.papel === 'corretor')?.valor || 0;
  }

  m.diasAtivos = dias.size;
  m.tempoMedio1oContatoHoras = somaT1.length ? round1(somaT1.reduce((s, n) => s + n, 0) / somaT1.length) : null;
  m.motivosDescarte = Array.from(motivos.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return m;
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Farol = 'bom' | 'atencao' | 'ruim' | 'neutro';

export interface NumeroPlacar {
  chave: string;
  rotulo: string;
  valor: string;            // já formatado
  farol: Farol;
  /** delta em unidade real ("4h mais rápido", "3 visitas a mais") — nunca só % */
  delta: string | null;
  deltaBom: boolean | null; // pra cor da seta (pelo SIGNIFICADO, não direção)
  hint?: string;
}

export interface CasoNominal {
  nome: string;
  detalhe: string;
  critico?: boolean;
}

export interface RazaoFunil {
  rotulo: string;           // "Meet marcado → feito"
  dele: { n: number; de: number } | null;
  time: { n: number; de: number } | null;
  amostraCurta: boolean;    // base < 3: mostrar, mas sem julgar
}

export interface DossieCorretor {
  uid: string;
  nome: string;
  ativos: number;
  atual: MetricasJanela;
  anterior: MetricasJanela;

  placar: NumeroPlacar[];
  gargalo: string | null;
  melhoras: string[];
  pioras: string[];

  // velocidade
  faixasT1: { rotulo: string; n: number; tom: Farol }[];
  t1MedianaHoras: number | null;
  piorT1: CasoNominal | null;
  novosSemContato: CasoNominal[];

  // rodízio (leads de propaganda do período)
  rodizio: { recebidos: number; aceiteMedianoSeg: number | null; expirou: CasoNominal[]; negou: number } | null;

  // agenda
  noShowsMeet: CasoNominal[];
  noShowsVisita: CasoNominal[];

  // carteira parada
  parados: { d7: number; d14: number; d30: number; pctCarteira: number };
  paradosNominais: CasoNominal[];

  // funil vs time
  razoes: RazaoFunil[];
  descartes: { total: number; precoces: number; motivos: [string, number][] };

  // disciplina
  disciplina: {
    tarefasNoPrazo: number; tarefasAtrasadas: number; vencidasAgora: number;
    diasAtivos: number; diasPeriodo: number; diasSemAcessar: number | null;
  };

  // resultado
  resultado: { vendas: number; vgv: number; comissao: number; cicloMedianoDias: number | null; distratos: number };

  // tendência (últimas 8 semanas fechadas+corrente): números crus, imprimíveis
  serie: { label: string; toques: number; meetsFeitos: number; visitasFeitas: number; vendas: number }[];
}

/** Linha do placar do time — navegação do gestor (NÃO entra no PDF individual). */
export interface LinhaTime {
  uid: string; nome: string;
  novos: number; t1MedianaHoras: number | null; parados7: number;
  meetsFeitos: number; visitasFeitas: number; vendas: number; vgv: number;
  farolRuins: number;
}

export interface AnaliseCorretores {
  periodo: PeriodoAnalise;
  time: LinhaTime[];
  timeAgregado: MetricasJanela;
  historicoDesdeMs: number | null;
  dossieDe: (uid: string) => DossieCorretor | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mediana = (arr: number[]): number | null => {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const round1 = (n: number) => Math.round(n * 10) / 10;
const nomeLead = (l: RelLead): string => String((l as { nome?: unknown }).nome || 'Sem nome');
const fmtH = (h: number | null): string => h === null ? '—' : h < 1 ? `${Math.round(h * 60)}min` : h < 48 ? `${round1(h)}h` : `${Math.round(h / 24)}d`;
const fmtMoedaK = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

interface TransicaoEtapa { de?: string; para?: string; em?: unknown }
const histDe = (l: RelLead): TransicaoEtapa[] => ((l as { etapasHist?: TransicaoEtapa[] }).etapasHist || []);

const ehAtiva = (et: string) => et !== ETAPA_FECHADO && et !== ETAPA_DESCARTADO;
const ETAPAS_QUENTES = [ETAPA_MEET_FEITO, ETAPA_VISITA_AGENDADA, ETAPA_VISITA_FEITA, ETAPA_NEGOCIACAO];

// ---------------------------------------------------------------------------
// computeAnalise
// ---------------------------------------------------------------------------

export function computeAnalise(
  leads: RelLead[], corretores: RelCorretor[], vendas: RelVenda[],
  atividade: Map<string, AtividadeLead> | null,
  distLinhas: LeadDistRow[],
  selecionados: Set<string>,
  periodo: PeriodoAnalise,
  agora = Date.now(),
): AnaliseCorretores {
  const ant = periodoAnterior(periodo);
  const nomeDe = new Map(corretores.map((c) => [c.id, c.nome] as const));
  const acessoDe = new Map(corretores.map((c) => [c.id, msOf(c.lastActiveAt ?? c.ultimoAcesso)] as const));
  const leadById = new Map(leads.map((l) => [l.id, l] as const));

  const porCorretor = new Map<string, RelLead[]>();
  for (const l of leads) {
    if (!l.userId || !selecionados.has(l.userId)) continue;
    const arr = porCorretor.get(l.userId) || [];
    arr.push(l);
    porCorretor.set(l.userId, arr);
  }
  const vendasPor = new Map<string, RelVenda[]>();
  for (const v of vendas) {
    if (!selecionados.has(v.corretorUid)) continue;
    const arr = vendasPor.get(v.corretorUid) || [];
    arr.push(v);
    vendasPor.set(v.corretorUid, arr);
  }

  let historicoDesdeMs: number | null = null;
  for (const arr of Array.from(porCorretor.values())) for (const l of arr) for (const t of histDe(l)) {
    const em = msOf(t.em);
    if (em > 0 && (historicoDesdeMs === null || em < historicoDesdeMs)) historicoDesdeMs = em;
  }

  const dentro = (ms: number) => ms >= periodo.iniMs && ms < periodo.fimMs;

  // ── métricas por corretor (atual + anterior) — base de tudo ──
  const base = new Map<string, { meus: RelLead[]; atual: MetricasJanela; anterior: MetricasJanela }>();
  for (const uid of Array.from(selecionados)) {
    const meus = porCorretor.get(uid) || [];
    const vs = vendasPor.get(uid) || [];
    base.set(uid, {
      meus,
      atual: metricasJanela(meus, vs, atividade, periodo.iniMs, periodo.fimMs),
      anterior: metricasJanela(meus, vs, atividade, ant.iniMs, ant.fimMs),
    });
  }

  // time agregado do período (a régua anônima)
  const timeAgregado = metricasJanela(
    Array.from(porCorretor.values()).flat(),
    Array.from(vendasPor.values()).flat(),
    atividade, periodo.iniMs, periodo.fimMs,
  );

  // ── placar do time (navegação) — LÊ do dossiê, nunca recalcula: dois números
  // com o mesmo rótulo na mesma tela têm que sair da MESMA conta ──
  const linhaTime = (uid: string): LinhaTime => {
    const d = montarDossie(uid);
    if (!d) {
      return { uid, nome: nomeDe.get(uid) || uid.slice(0, 6), novos: 0, t1MedianaHoras: null, parados7: 0, meetsFeitos: 0, visitasFeitas: 0, vendas: 0, vgv: 0, farolRuins: 0 };
    }
    return {
      uid, nome: d.nome,
      novos: d.atual.leadsNovos, t1MedianaHoras: d.t1MedianaHoras, parados7: d.parados.d7,
      meetsFeitos: d.atual.meetsFeitos, visitasFeitas: d.atual.visitasFeitas,
      vendas: d.atual.vendas, vgv: d.atual.vgv,
      farolRuins: d.placar.filter((p) => p.farol === 'ruim').length,
    };
  };

  // ── dossiê completo de UM corretor ──
  const cacheDossie = new Map<string, DossieCorretor | null>();
  function montarDossie(uid: string): DossieCorretor | null {
    if (cacheDossie.has(uid)) return cacheDossie.get(uid)!;
    const b = base.get(uid);
    if (!b) { cacheDossie.set(uid, null); return null; }
    const { meus, atual, anterior } = b;
    const minhasVendas = vendasPor.get(uid) || [];

    // ---- velocidade: leads NOVOS do período ----
    // O SLA de 24h só é cobrado de quem JÁ TEVE 24h: lead que entrou de
    // madrugada e ainda está no prazo não entra no denominador — cobrar SLA
    // não vencido é injusto e o corretor desqualifica o relatório inteiro.
    const novos = meus.filter((l) => dentro(msOf(l.createdAt)));
    const t1Horas: number[] = [];
    let f2 = 0, f12 = 0, f24 = 0, fMais = 0, fNunca = 0, noPrazo = 0;
    let piorT1: CasoNominal | null = null;
    const novosSemContato: CasoNominal[] = [];
    for (const l of novos) {
      const cMs = msOf(l.createdAt);
      const pMs = msOf(l.circuito?.primeiroContatoEm);
      if (pMs >= cMs && pMs > 0) {
        const h = (pMs - cMs) / HORA;
        t1Horas.push(h);
        if (h <= 2) f2++; else if (h <= 12) f12++; else if (h <= 24) f24++; else fMais++;
        if (h > 24 && (!piorT1 || h > parseFloat(piorT1.detalhe))) piorT1 = { nome: nomeLead(l), detalhe: `${Math.round(h)}`, critico: true };
      } else {
        const horasVida = (agora - cMs) / HORA;
        if (mapEtapaCircuito(l.etapa) !== ETAPA_DESCARTADO) {
          if (horasVida < 24) {
            noPrazo++;
            novosSemContato.push({ nome: nomeLead(l), detalhe: `entrou há ${Math.round(horasVida)}h — ainda no prazo, mas quanto antes melhor`, critico: false });
          } else {
            fNunca++;
            novosSemContato.push({ nome: nomeLead(l), detalhe: `entrou há ${Math.floor(horasVida / 24)}d e ninguém falou com ele`, critico: horasVida >= 48 });
          }
        } else {
          fNunca++;
        }
      }
    }
    if (piorT1) piorT1 = { ...piorT1, detalhe: `esperou ${piorT1.detalhe}h pelo 1º contato` };
    const t1Mediana = mediana(t1Horas);
    const denomSLA = novos.length - noPrazo;
    const pct24 = denomSLA > 0 ? (f2 + f12 + f24) / denomSLA : null;

    // ---- rodízio (propaganda) — negar também é evento do corretor: quem só
    // negou no período não pode sumir da seção justamente na reunião ----
    const minhasDist = distLinhas.filter((l) => dentro(l.criadoMs) && (l.escaladoPara === uid || l.aceitoPor === uid || l.expirouDe === uid));
    const negouN = distLinhas.filter((l) => dentro(l.criadoMs) && l.negadoPorUids?.includes(uid)).length;
    const rodizio = (minhasDist.length || negouN) ? {
      recebidos: minhasDist.filter((l) => l.escaladoPara === uid || l.aceitoPor === uid).length,
      aceiteMedianoSeg: mediana(minhasDist.filter((l) => l.aceitoPor === uid && l.tempoAceiteSeg !== null).map((l) => l.tempoAceiteSeg as number)),
      expirou: minhasDist.filter((l) => l.expirouDe === uid).map((l) => ({
        nome: l.nome, detalhe: `deixou a janela vencer${l.expirouAposSeg ? ` (${Math.round(l.expirouAposSeg / 60)}min)` : ''} — lead pago foi pro bolsão`, critico: true,
      })),
      negou: negouN,
    } : null;

    // ---- agenda: marcado vs feito + pendurados nominais ----
    // Pendurado é FOTO, não janela: meet marcado há 20 dias que nunca virou
    // "feito" é o pior caso — não pode sumir da lista só porque o agendamento
    // caiu fora do período analisado. Usa a ÚLTIMA transição pra etapa.
    const noShowsMeet: CasoNominal[] = [];
    const noShowsVisita: CasoNominal[] = [];
    for (const l of meus) {
      const et = mapEtapaCircuito(l.etapa);
      if (et !== ETAPA_MEET_AGENDADO && et !== ETAPA_VISITA_AGENDADA) continue;
      let ultimaMarcacao = 0;
      for (const t of histDe(l)) {
        if (t.para && mapEtapaCircuito(t.para) === et) ultimaMarcacao = Math.max(ultimaMarcacao, msOf(t.em));
      }
      if (!ultimaMarcacao) ultimaMarcacao = msOf(l.circuito?.desde);
      if (!ultimaMarcacao) continue;
      const diasDesde = Math.floor((agora - ultimaMarcacao) / DIA);
      if (diasDesde < 3) continue;
      const caso: CasoNominal = {
        nome: nomeLead(l),
        detalhe: `${et === ETAPA_MEET_AGENDADO ? 'meet marcado' : 'visita marcada'} há ${diasDesde}d e não aconteceu`,
        critico: diasDesde >= 7,
      };
      (et === ETAPA_MEET_AGENDADO ? noShowsMeet : noShowsVisita).push(caso);
    }
    noShowsMeet.sort((a, b) => Number(b.critico || false) - Number(a.critico || false));
    noShowsVisita.sort((a, b) => Number(b.critico || false) - Number(a.critico || false));

    // ---- carteira parada (foto de agora) ----
    let ativos = 0, d7 = 0, d14 = 0, d30 = 0;
    const paradosNominais: CasoNominal[] = [];
    for (const l of meus) {
      const et = mapEtapaCircuito(l.etapa);
      if (!ehAtiva(et)) continue;
      ativos++;
      const at = atividade?.get(l.id);
      const ult = at?.eventos.length ? at.eventos[at.eventos.length - 1].ms : msOf(l.createdAt);
      if (!ult) continue;
      const dias = (agora - ult) / DIA;
      if (dias > 7) d7++;
      if (dias > 14) d14++;
      if (dias > 30) d30++;
      if (dias > 7) {
        const temTarefaFutura = !!at?.tarefas.some((t) => !/conclu|cancel/i.test(t.status) && t.dueMs > agora);
        const quente = ETAPAS_QUENTES.includes(et);
        paradosNominais.push({
          nome: nomeLead(l),
          detalhe: `${et} · ${Math.floor(dias)}d sem toque${temTarefaFutura ? '' : ' · SEM follow-up marcado'}`,
          critico: quente || dias > 30,
        });
      } else if (ETAPAS_QUENTES.includes(et) && dias > 5) {
        // topo de funil parado dói antes dos 7 dias
        paradosNominais.push({ nome: nomeLead(l), detalhe: `${et} · ${Math.floor(dias)}d sem toque — negócio quente esfriando`, critico: true });
        d7++; // conta na régua de cobrança
      }
    }
    paradosNominais.sort((a, b) => Number(b.critico || false) - Number(a.critico || false));

    // ---- funil: razões dele vs time ----
    const razao = (rotulo: string, n: number, de: number, tN: number, tDe: number): RazaoFunil => ({
      rotulo,
      dele: de > 0 ? { n, de } : null,
      time: tDe > 0 ? { n: tN, de: tDe } : null,
      amostraCurta: de < 3,
    });
    const razoes: RazaoFunil[] = [
      razao('Novos → atendidos em 24h', f2 + f12 + f24, novos.length, 0, 0),
      razao('1º contato → meet marcado', atual.meetsAgendados, Math.max(atual.primeirosContatos, atual.meetsAgendados), timeAgregado.meetsAgendados, Math.max(timeAgregado.primeirosContatos, timeAgregado.meetsAgendados)),
      razao('Meet marcado → feito', atual.meetsFeitos, Math.max(atual.meetsAgendados, atual.meetsFeitos), timeAgregado.meetsFeitos, Math.max(timeAgregado.meetsAgendados, timeAgregado.meetsFeitos)),
      razao('Visita marcada → feita', atual.visitasFeitas, Math.max(atual.visitasAgendadas, atual.visitasFeitas), timeAgregado.visitasFeitas, Math.max(timeAgregado.visitasAgendadas, timeAgregado.visitasFeitas)),
      razao('Visita feita → negociação', atual.negociacoes, Math.max(atual.visitasFeitas, atual.negociacoes), timeAgregado.negociacoes, Math.max(timeAgregado.visitasFeitas, timeAgregado.negociacoes)),
    ];
    // % ≤24h do time pra primeira razão — MESMA regra de SLA (não pune lead <24h)
    {
      const todosNovos = Array.from(porCorretor.values()).flat().filter((l) => dentro(msOf(l.createdAt)));
      let t24 = 0, tDenom = 0;
      for (const l of todosNovos) {
        const cMs = msOf(l.createdAt), pMs = msOf(l.circuito?.primeiroContatoEm);
        const contatado = pMs >= cMs && pMs > 0;
        if (!contatado && (agora - cMs) / HORA < 24) continue; // SLA ainda não venceu
        tDenom++;
        if (contatado && (pMs - cMs) / HORA <= 24) t24++;
      }
      razoes[0] = razao('Novos → atendidos em 24h', f2 + f12 + f24, denomSLA, t24, tDenom);
    }

    // gargalo: pior défice vs time com base ≥ 3
    let gargalo: string | null = null;
    let piorDefice = 0;
    for (const r of razoes) {
      if (!r.dele || r.amostraCurta || !r.time || r.time.de < 3) continue;
      const dele = r.dele.n / r.dele.de;
      const time = r.time.n / r.time.de;
      if (time > 0 && dele < time) {
        const defice = time - dele;
        if (defice > piorDefice && defice >= 0.15) {
          piorDefice = defice;
          gargalo = `${r.rotulo}: ${Math.round(dele * 100)}% dele vs ${Math.round(time * 100)}% do time`;
        }
      }
    }

    // ---- disciplina ----
    let tarefasNoPrazo = 0, tarefasAtrasadas = 0, vencidasAgora = 0;
    for (const l of meus) {
      const at = atividade?.get(l.id);
      if (!at) continue;
      for (const t of at.tarefas) {
        const concluida = /conclu/i.test(t.status);
        if (concluida && t.concluidaMs > 0 && dentro(t.concluidaMs)) {
          if (t.dueMs > 0 && t.concluidaMs <= t.dueMs + 12 * HORA) tarefasNoPrazo++;
          else tarefasAtrasadas++;
        }
        if (!concluida && !/cancel/i.test(t.status) && t.dueMs > 0 && t.dueMs < agora) vencidasAgora++;
      }
    }
    const acesso = acessoDe.get(uid) || 0;
    // dias-CALENDÁRIO tocados pela janela até agora (o denominador tem que
    // contar como o numerador conta, senão sexta de manhã imprime "5/4")
    const fimEfetivo = Math.min(periodo.fimMs, agora + 1);
    const diasPeriodo = Math.max(1, Math.floor((fimEfetivo - 1 - periodo.iniMs) / DIA) + 1);

    // ---- resultado ----
    const vendasPeriodo = minhasVendas.filter((v) => {
      if (!v.dataVenda) return false;
      const ms = Date.parse(`${v.dataVenda}T12:00:00`);
      return v.status === 'assinada' && dentro(ms);
    });
    const ciclos: number[] = [];
    for (const v of vendasPeriodo) {
      const l = v.leadId ? leadById.get(v.leadId) : undefined;
      const cMs = l ? msOf(l.createdAt) : 0;
      const vMs = Date.parse(`${v.dataVenda}T12:00:00`);
      if (cMs > 0 && vMs > cMs) ciclos.push((vMs - cMs) / DIA);
    }
    const distratos = minhasVendas.filter((v) => v.status === 'distratada' && v.dataVenda && dentro(Date.parse(`${v.dataVenda}T12:00:00`))).length;

    // ---- placar (6 números, farol honesto) ----
    const farolT1: Farol = t1Mediana === null ? 'neutro' : t1Mediana <= 2 ? 'bom' : t1Mediana <= 12 ? 'atencao' : 'ruim';
    const farol24: Farol = pct24 === null ? 'neutro' : pct24 >= 0.9 ? 'bom' : pct24 >= 0.7 ? 'atencao' : 'ruim';
    const farolParados: Farol = ativos === 0 ? 'neutro' : d7 === 0 ? 'bom' : d7 / ativos <= 0.15 ? 'atencao' : 'ruim';
    const compMeet = atual.meetsAgendados >= 2 ? atual.meetsFeitos / atual.meetsAgendados : null;
    const farolMeet: Farol = compMeet === null ? 'neutro' : compMeet >= 0.75 ? 'bom' : compMeet >= 0.5 ? 'atencao' : 'ruim';
    const farolVisitas: Farol = atual.visitasFeitas > 0 ? 'bom' : ativos >= 10 ? 'ruim' : 'neutro';
    const farolVendas: Farol = atual.vendas > 0 ? 'bom' : 'neutro';

    const anteriorT1 = (() => {
      const t1sAnt: number[] = [];
      for (const l of meus) {
        const cMs = msOf(l.createdAt), pMs = msOf(l.circuito?.primeiroContatoEm);
        if (cMs >= ant.iniMs && cMs < ant.fimMs && pMs >= cMs && pMs > 0) t1sAnt.push((pMs - cMs) / HORA);
      }
      return mediana(t1sAnt);
    })();

    const deltaNum = (v: number, a: number, unidade: string, maiorMelhor: boolean): { delta: string | null; deltaBom: boolean | null } => {
      const d = v - a;
      if (d === 0) return { delta: null, deltaBom: null };
      return { delta: `${d > 0 ? '+' : ''}${d} ${unidade}`, deltaBom: maiorMelhor ? d > 0 : d < 0 };
    };

    const placar: NumeroPlacar[] = [
      {
        chave: 't1', rotulo: '1º contato (mediana)', valor: fmtH(t1Mediana), farol: farolT1,
        ...(t1Mediana !== null && anteriorT1 !== null && Math.round(t1Mediana) !== Math.round(anteriorT1)
          ? { delta: `${fmtH(Math.abs(t1Mediana - anteriorT1))} ${t1Mediana < anteriorT1 ? 'mais rápido' : 'mais lento'}`, deltaBom: t1Mediana < anteriorT1 }
          : { delta: null, deltaBom: null }),
        hint: novos.length ? `${novos.length} leads novos no período` : 'sem lead novo no período',
      },
      {
        chave: 'pct24', rotulo: 'Novos atendidos em 24h', valor: pct24 === null ? '—' : `${Math.round(pct24 * 100)}%`, farol: farol24,
        delta: fNunca > 0 ? `${fNunca} com SLA vencido sem contato` : noPrazo > 0 ? `${noPrazo} ainda no prazo` : null,
        deltaBom: fNunca > 0 ? false : null,
      },
      {
        chave: 'parados', rotulo: 'Parados +7d (agora)', valor: String(d7), farol: farolParados,
        delta: ativos ? `${Math.round((d7 / Math.max(1, ativos)) * 100)}% da carteira ativa` : null, deltaBom: d7 === 0 ? null : false,
      },
      {
        chave: 'meets', rotulo: 'Meets: feito / marcado',
        // feito > marcado acontece quando o agendamento foi no período anterior — o
        // "/marcado" só confunde nesse caso; mostra só o feito
        valor: atual.meetsFeitos > atual.meetsAgendados ? String(atual.meetsFeitos) : `${atual.meetsFeitos}/${atual.meetsAgendados}`,
        farol: farolMeet,
        ...deltaNum(atual.meetsFeitos, anterior.meetsFeitos, 'feitos', true),
      },
      {
        chave: 'visitas', rotulo: 'Visitas: feita / marcada',
        valor: atual.visitasFeitas > atual.visitasAgendadas ? String(atual.visitasFeitas) : `${atual.visitasFeitas}/${atual.visitasAgendadas}`,
        farol: farolVisitas,
        ...deltaNum(atual.visitasFeitas, anterior.visitasFeitas, 'feitas', true),
      },
      {
        chave: 'vendas', rotulo: 'Vendas · VGV', valor: atual.vendas > 0 ? `${atual.vendas} · ${fmtMoedaK(atual.vgv)}` : '0', farol: farolVendas,
        ...deltaNum(atual.vendas, anterior.vendas, 'vendas', true),
      },
    ];

    // ---- melhoras / pioras (delta com significado) ----
    const melhoras: string[] = [];
    const pioras: string[] = [];
    const cmp = (rotulo: string, v: number, a: number, maiorMelhor: boolean, fmt: (n: number) => string = String) => {
      if (v === a) return;
      const melhorou = maiorMelhor ? v > a : v < a;
      const frase = `${rotulo}: ${fmt(a)} → ${fmt(v)}`;
      (melhorou ? melhoras : pioras).push(frase);
    };
    cmp('Vendas', atual.vendas, anterior.vendas, true);
    cmp('Visitas feitas', atual.visitasFeitas, anterior.visitasFeitas, true);
    cmp('Meets feitos', atual.meetsFeitos, anterior.meetsFeitos, true);
    if (t1Mediana !== null && anteriorT1 !== null) cmp('1º contato mediano', Math.round(t1Mediana * 10), Math.round(anteriorT1 * 10), false, (n) => fmtH(n / 10));
    cmp('Avanços de etapa', atual.avancos, anterior.avancos, true);
    cmp('Descartes no 1º toque', atual.descartesRapidos, anterior.descartesRapidos, false);
    cmp('Toques nos leads', atual.toques, anterior.toques, true);

    // ---- descartes ----
    const descartes = { total: atual.descartes, precoces: atual.descartesRapidos, motivos: atual.motivosDescarte };

    // ---- série 8 semanas ----
    const serie = serieSemanas(8, agora).map((w) => {
      const m = metricasJanela(meus, minhasVendas, atividade, w.iniMs, w.fimMs);
      return { label: w.label, toques: m.toques, meetsFeitos: m.meetsFeitos, visitasFeitas: m.visitasFeitas, vendas: m.vendas };
    });

    const dossie: DossieCorretor = {
      uid, nome: nomeDe.get(uid) || uid.slice(0, 6), ativos,
      atual, anterior,
      placar,
      gargalo,
      melhoras: melhoras.slice(0, 3),
      pioras: pioras.slice(0, 3),
      faixasT1: [
        { rotulo: 'em até 2h', n: f2, tom: 'bom' },
        { rotulo: '2 a 12h', n: f12, tom: 'bom' },
        { rotulo: '12 a 24h', n: f24, tom: 'atencao' },
        { rotulo: 'mais de 24h', n: fMais, tom: 'ruim' },
        { rotulo: 'sem contato (SLA vencido)', n: fNunca, tom: 'ruim' },
      ],
      t1MedianaHoras: t1Mediana,
      piorT1,
      novosSemContato: novosSemContato.slice(0, 8),
      rodizio,
      noShowsMeet: noShowsMeet.slice(0, 6),
      noShowsVisita: noShowsVisita.slice(0, 6),
      parados: { d7, d14, d30, pctCarteira: ativos ? d7 / ativos : 0 },
      paradosNominais: paradosNominais.slice(0, 10),
      razoes,
      descartes,
      disciplina: {
        tarefasNoPrazo, tarefasAtrasadas, vencidasAgora,
        diasAtivos: atual.diasAtivos, diasPeriodo: Math.max(1, diasPeriodo),
        diasSemAcessar: acesso ? Math.floor((agora - acesso) / DIA) : null,
      },
      resultado: {
        vendas: vendasPeriodo.length,
        vgv: atual.vgv, comissao: atual.comissao,
        cicloMedianoDias: mediana(ciclos) !== null ? Math.round(mediana(ciclos) as number) : null,
        distratos,
      },
      serie,
    };
    cacheDossie.set(uid, dossie);
    return dossie;
  }

  const time = Array.from(selecionados).map(linhaTime)
    .sort((a, b) => b.farolRuins - a.farolRuins || (b.vendas - a.vendas));

  return { periodo, time, timeAgregado, historicoDesdeMs, dossieDe: montarDossie };
}
