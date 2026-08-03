'use client';

/**
 * RELATÓRIO SEMANAL — o dossiê da reunião 1:1 com cada corretor.
 *
 * Diferença pro gestao.ts (visão geral): aqui TUDO é janelado numa semana
 * (segunda 00:00 → domingo 23:59) e comparado com a semana anterior. É o
 * material que o gestor imprime e leva pra conversa: o que a pessoa FEZ nos
 * últimos 7 dias, o que travou, e o que cobrar — com nome de lead, não só
 * número.
 *
 * Fontes por janela:
 *   movimento de funil  → etapasHist (carimbo de cada transição)
 *   toques/presença     → interactions (ms) de cada lead
 *   tarefas concluídas  → concluidaMs (interação "Tarefa Concluída")
 *   descartes           → descartadoEm + motivo
 *   vendas/VGV          → coleção /vendas (dataVenda, rateio)
 *   novos               → createdAt
 * Puro — sem Firebase; quem chama já carregou tudo.
 */
import {
  mapEtapaCircuito, etapaIndex, ETAPAS_CIRCUITO,
  ETAPA_FECHADO, ETAPA_DESCARTADO, ETAPA_MEET_AGENDADO, ETAPA_MEET_FEITO,
  ETAPA_VISITA_AGENDADA, ETAPA_VISITA_FEITA, ETAPA_NEGOCIACAO,
} from '@/lib/circuito';
import { msOf, type RelLead, type RelCorretor, type AtividadeLead, type RelVenda } from './logic';

const DIA = 24 * 60 * 60 * 1000;
const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Janela: semana de segunda a domingo, com navegação por offset
// ---------------------------------------------------------------------------

export interface JanelaSemana { iniMs: number; fimMs: number; label: string; ehAtual: boolean }

/** offset 0 = semana corrente; -1 = passada; -2 = retrasada… */
export function semanaDe(offset: number, agora = Date.now()): JanelaSemana {
  const d = new Date(agora);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;              // 0 = segunda
  const seg = d.getTime() - dow * DIA + offset * 7 * DIA;
  const fim = seg + 7 * DIA;                     // exclusivo
  const f = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return { iniMs: seg, fimMs: fim, label: `${f(seg)} a ${f(fim - 1)}`, ehAtual: offset === 0 };
}

// ---------------------------------------------------------------------------
// Tipos de saída
// ---------------------------------------------------------------------------

/** Tudo que aconteceu DENTRO de uma janela (usado pra atual e pra anterior). */
export interface MetricasJanela {
  leadsNovos: number;
  /** dos novos DA janela, quantos já receberam 1º contato (a qualquer momento) */
  novosAtendidos: number;
  toques: number;
  diasAtivos: number;             // dias distintos com alguma atividade registrada
  tarefasConcluidas: number;
  primeirosContatos: number;      // 1º contato feito na janela (lead de qualquer idade)
  tempoMedio1oContatoHoras: number | null;
  avancos: number;                // transições de etapa pra FRENTE na janela
  /** quantos leads CHEGARAM em cada etapa na janela (transições "para") */
  chegaramEm: Record<string, number>;
  meetsAgendados: number; meetsFeitos: number; visitasFeitas: number; negociacoes: number;
  descartes: number; descartesRapidos: number;
  motivosDescarte: [string, number][];
  vendas: number; vgv: number; comissao: number;
}

export interface CorretorSemana {
  uid: string;
  nome: string;
  atual: MetricasJanela;
  anterior: MetricasJanela;
  // ── foto da carteira AGORA (não janelada — é o que se cobra na segunda) ──
  ativos: number;
  semToque7d: number;
  parados14d: number;
  tarefasAtrasadas: number;
  qualifPct: number;
  funilAgora: { etapa: string; n: number }[];
  /** listas com NOME — pra conversa apontar gente, não estatística */
  novosSemContato: { nome: string; dias: number }[];
  topSemToque: { nome: string; dias: number }[];
  // ── roteiro da conversa ──
  fortes: string[];
  cobrar: string[];
}

export interface TimeSemana {
  atual: MetricasJanela;
  anterior: MetricasJanela;
  destaque: string | null;   // nome do corretor da semana
  atencao: string | null;    // quem mais precisa de conversa
}

export interface SemanaResumo {
  janela: JanelaSemana;
  corretores: CorretorSemana[];
  time: TimeSemana;
  /** desde quando existe carimbo de transição (semanas antes disso subnotificam movimento) */
  historicoDesdeMs: number | null;
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

interface TransicaoEtapa { de?: string; para?: string; em?: unknown }
const histDe = (l: RelLead): TransicaoEtapa[] => ((l as { etapasHist?: TransicaoEtapa[] }).etapasHist || []);
const nomeLead = (l: RelLead): string => String((l as { nome?: unknown }).nome || 'Sem nome');

const JANELA_VAZIA: MetricasJanela = {
  leadsNovos: 0, novosAtendidos: 0, toques: 0, diasAtivos: 0, tarefasConcluidas: 0,
  primeirosContatos: 0, tempoMedio1oContatoHoras: null, avancos: 0, chegaramEm: {},
  meetsAgendados: 0, meetsFeitos: 0, visitasFeitas: 0, negociacoes: 0,
  descartes: 0, descartesRapidos: 0, motivosDescarte: [], vendas: 0, vgv: 0, comissao: 0,
};

const ymdLocal = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function metricasJanela(
  meus: RelLead[], minhasVendas: RelVenda[], atividade: Map<string, AtividadeLead> | null,
  iniMs: number, fimMs: number,
): MetricasJanela {
  const m: MetricasJanela = { ...JANELA_VAZIA, chegaramEm: {}, motivosDescarte: [] };
  const dentro = (ms: number) => ms >= iniMs && ms < fimMs;
  const dias = new Set<string>();
  const somaT1: number[] = [];
  const motivos = new Map<string, number>();

  for (const l of meus) {
    const cMs = msOf(l.createdAt);
    const pMs = msOf(l.circuito?.primeiroContatoEm);
    if (dentro(cMs)) {
      m.leadsNovos++;
      if (pMs >= cMs && pMs > 0) m.novosAtendidos++;
    }
    if (pMs > 0 && dentro(pMs)) {
      m.primeirosContatos++;
      if (cMs > 0 && pMs >= cMs && pMs - cMs <= 30 * DIA) somaT1.push((pMs - cMs) / 3_600_000);
    }
    const dMs = msOf(l.descartadoEm);
    if (dMs > 0 && dentro(dMs)) {
      m.descartes++;
      if ((l.circuito?.tentativas || 0) <= 1) m.descartesRapidos++;
      const mo = (l.descartadoMotivo as string) || 'sem motivo';
      motivos.set(mo, (motivos.get(mo) || 0) + 1);
    }
    for (const t of histDe(l)) {
      const em = msOf(t.em);
      if (!em || !dentro(em) || !t.para) continue;
      const para = mapEtapaCircuito(t.para);
      const de = t.de ? mapEtapaCircuito(t.de) : '';
      m.chegaramEm[para] = (m.chegaramEm[para] || 0) + 1;
      if (de && etapaIndex(para) > etapaIndex(de)) m.avancos++;
      if (para === ETAPA_MEET_AGENDADO) m.meetsAgendados++;
      if (para === ETAPA_MEET_FEITO) m.meetsFeitos++;
      if (para === ETAPA_VISITA_FEITA) m.visitasFeitas++;
      if (para === ETAPA_NEGOCIACAO) m.negociacoes++;
    }
    const at = atividade?.get(l.id);
    if (at) {
      for (const e of at.eventos) {
        if (!dentro(e.ms)) continue;
        m.toques++;
        dias.add(ymdLocal(e.ms));
      }
      for (const t of at.tarefas) if (t.concluidaMs > 0 && dentro(t.concluidaMs)) m.tarefasConcluidas++;
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
// Roteiro da conversa — regras que transformam número em pauta
// ---------------------------------------------------------------------------

const fmtK = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function roteiro(c: CorretorSemana, mediaToques: number): { fortes: string[]; cobrar: string[] } {
  const a = c.atual, p = c.anterior;
  const fortes: string[] = [];
  const cobrar: string[] = [];

  // ── fortes ──
  if (a.vendas > 0) fortes.push(`Fechou ${a.vendas} venda${a.vendas > 1 ? 's' : ''} na semana — ${fmtK(a.vgv)} de VGV 🏆`);
  if (a.avancos >= 3) fortes.push(`Movimentou o funil: ${a.avancos} avanços de etapa na semana`);
  if (a.meetsFeitos + a.visitasFeitas >= 2) fortes.push(`${a.meetsFeitos} meet${a.meetsFeitos === 1 ? '' : 's'} e ${a.visitasFeitas} visita${a.visitasFeitas === 1 ? '' : 's'} realizados`);
  if (p.toques > 0 && a.toques >= p.toques * 1.3 && a.toques >= 10) fortes.push(`Subiu o ritmo: ${a.toques} toques (semana passada foram ${p.toques})`);
  if (a.leadsNovos >= 3 && a.novosAtendidos === a.leadsNovos) fortes.push(`Atendeu 100% dos ${a.leadsNovos} leads novos da semana`);
  if (a.tempoMedio1oContatoHoras !== null && a.tempoMedio1oContatoHoras <= 4 && a.primeirosContatos >= 2) fortes.push(`1º contato rápido: média de ${a.tempoMedio1oContatoHoras}h`);
  if (a.tarefasConcluidas >= 5 && c.tarefasAtrasadas === 0) fortes.push(`Agenda em dia: ${a.tarefasConcluidas} tarefas concluídas e nenhuma vencida`);

  // ── cobrar ──
  if (a.toques === 0 && c.ativos > 0) cobrar.push(`Semana SEM nenhum toque registrado — e ele tem ${c.ativos} leads ativos`);
  else if (a.diasAtivos <= 2 && c.ativos >= 3) cobrar.push(`Só ${a.diasAtivos === 0 ? 'nenhum' : a.diasAtivos} dia${a.diasAtivos === 1 ? '' : 's'} de atividade no CRM na semana`);
  if (a.leadsNovos > 0 && a.novosAtendidos < a.leadsNovos) cobrar.push(`${a.leadsNovos - a.novosAtendidos} dos ${a.leadsNovos} leads novos da semana ainda SEM 1º contato`);
  if (c.tarefasAtrasadas > 0) cobrar.push(`${c.tarefasAtrasadas} tarefa${c.tarefasAtrasadas === 1 ? '' : 's'} vencida${c.tarefasAtrasadas === 1 ? '' : 's'} em aberto`);
  if (c.semToque7d >= 3) cobrar.push(`${c.semToque7d} leads ativos há +7 dias sem contato${c.topSemToque.length ? ` (${c.topSemToque.slice(0, 3).map((x) => x.nome).join(', ')}…)` : ''}`);
  if (a.toques >= 15 && a.meetsAgendados === 0) cobrar.push(`Muito contato (${a.toques} toques) e NENHUM meet agendado — revisar abordagem/roteiro`);
  if (a.avancos === 0 && c.ativos >= 5 && a.toques > 0) cobrar.push(`Ninguém avançou de etapa na semana, com ${c.ativos} leads na mão`);
  if (a.descartesRapidos >= 2) cobrar.push(`Descartou ${a.descartesRapidos} leads no 1º toque (${a.motivosDescarte.map(([mo, n]) => `${mo}: ${n}`).join(' · ')})`);
  if (a.meetsAgendados >= 2 && a.meetsFeitos === 0 && p.meetsAgendados >= 0) cobrar.push(`Agendou ${a.meetsAgendados} meets e nenhum aconteceu — confirmar presença na véspera`);
  if (mediaToques > 0 && a.toques > 0 && a.toques < mediaToques * 0.4 && c.ativos >= 3) cobrar.push(`Ritmo bem abaixo do time: ${a.toques} toques vs média de ${Math.round(mediaToques)}`);

  return { fortes: fortes.slice(0, 4), cobrar: cobrar.slice(0, 5) };
}

// ---------------------------------------------------------------------------
// computeSemana
// ---------------------------------------------------------------------------

export function computeSemana(
  leads: RelLead[], corretores: RelCorretor[], vendas: RelVenda[],
  atividade: Map<string, AtividadeLead> | null,
  selecionados: Set<string>,
  janela: JanelaSemana,
  agora = Date.now(),
): SemanaResumo {
  const leadsF = leads.filter((l) => !!l.userId && selecionados.has(l.userId));
  const nomeDe = new Map(corretores.map((c) => [c.id, c.nome] as const));

  const porCorretor = new Map<string, RelLead[]>();
  for (const l of leadsF) {
    const arr = porCorretor.get(l.userId as string) || [];
    arr.push(l);
    porCorretor.set(l.userId as string, arr);
  }
  const vendasPor = new Map<string, RelVenda[]>();
  for (const v of vendas) {
    if (!selecionados.has(v.corretorUid)) continue;
    const arr = vendasPor.get(v.corretorUid) || [];
    arr.push(v);
    vendasPor.set(v.corretorUid, arr);
  }

  // desde quando existe carimbo de transição (pra rodapé de honestidade)
  let historicoDesdeMs: number | null = null;
  for (const l of leadsF) for (const t of histDe(l)) {
    const em = msOf(t.em);
    if (em > 0 && (historicoDesdeMs === null || em < historicoDesdeMs)) historicoDesdeMs = em;
  }

  const anterior: JanelaSemana = { iniMs: janela.iniMs - 7 * DIA, fimMs: janela.iniMs, label: '', ehAtual: false };

  const lista: CorretorSemana[] = [];
  for (const uid of Array.from(selecionados)) {
    const meus = porCorretor.get(uid) || [];
    const minhasVendas = vendasPor.get(uid) || [];
    const atual = metricasJanela(meus, minhasVendas, atividade, janela.iniMs, janela.fimMs);
    const ant = metricasJanela(meus, minhasVendas, atividade, anterior.iniMs, anterior.fimMs);

    // foto da carteira agora
    let ativos = 0, semToque7d = 0, parados14d = 0, tarefasAtrasadas = 0, comQualif = 0;
    const funilAgora = ETAPAS_CIRCUITO.map((e) => ({ etapa: e, n: 0 }));
    const novosSemContato: { nome: string; dias: number }[] = [];
    const topSemToque: { nome: string; dias: number }[] = [];
    for (const l of meus) {
      const et = mapEtapaCircuito(l.etapa);
      const idx = etapaIndex(et);
      const ehAtivo = et !== ETAPA_FECHADO && et !== ETAPA_DESCARTADO;
      if (idx >= 0 && funilAgora[idx]) funilAgora[idx].n++;
      if (!!l.qualificacao && Object.values(l.qualificacao).some((a) => Array.isArray(a) && a.length > 0)) comQualif++;
      if (!ehAtivo) continue;
      ativos++;
      const cMs = msOf(l.createdAt);
      const pMs = msOf(l.circuito?.primeiroContatoEm);
      if (cMs >= janela.iniMs && cMs < janela.fimMs && !pMs) {
        novosSemContato.push({ nome: nomeLead(l), dias: Math.floor((agora - cMs) / DIA) });
      }
      const desde = msOf(l.circuito?.desde) || cMs;
      if (desde > 0 && (agora - desde) / DIA > 14) parados14d++;
      const at = atividade?.get(l.id);
      if (at) {
        const ult = at.eventos.length ? at.eventos[at.eventos.length - 1].ms : 0;
        const diasSem = ult ? (agora - ult) / DIA : (cMs ? (agora - cMs) / DIA : 0);
        if (diasSem > 7) { semToque7d++; topSemToque.push({ nome: nomeLead(l), dias: Math.floor(diasSem) }); }
        for (const t of at.tarefas) {
          if (!/conclu/i.test(t.status) && !/cancel/i.test(t.status) && t.dueMs > 0 && t.dueMs < agora) tarefasAtrasadas++;
        }
      }
    }
    topSemToque.sort((a, b) => b.dias - a.dias);

    lista.push({
      uid, nome: nomeDe.get(uid) || uid.slice(0, 6),
      atual, anterior: ant,
      ativos, semToque7d, parados14d, tarefasAtrasadas,
      qualifPct: meus.length ? comQualif / meus.length : 0,
      funilAgora,
      novosSemContato: novosSemContato.slice(0, 6),
      topSemToque: topSemToque.slice(0, 6),
      fortes: [], cobrar: [],
    });
  }

  // roteiro precisa da média do time
  const comCarteira = lista.filter((c) => c.ativos > 0 || c.atual.leadsNovos > 0);
  const mediaToques = comCarteira.length ? comCarteira.reduce((s, c) => s + c.atual.toques, 0) / comCarteira.length : 0;
  for (const c of lista) {
    const r = roteiro(c, mediaToques);
    c.fortes = r.fortes;
    c.cobrar = r.cobrar;
  }

  // ordena: quem vendeu > quem avançou > quem tocou
  lista.sort((a, b) => (b.atual.vendas - a.atual.vendas) || (b.atual.vgv - a.atual.vgv) || (b.atual.avancos - a.atual.avancos) || (b.atual.toques - a.atual.toques));

  // ── time ──
  const soma = (f: (m: MetricasJanela) => number, qual: 'atual' | 'anterior') => lista.reduce((s, c) => s + f(c[qual]), 0);
  const agregada = (qual: 'atual' | 'anterior'): MetricasJanela => {
    const chegaramEm: Record<string, number> = {};
    const motivos = new Map<string, number>();
    for (const c of lista) {
      for (const [k, v] of Object.entries(c[qual].chegaramEm)) chegaramEm[k] = (chegaramEm[k] || 0) + v;
      for (const [mo, n] of c[qual].motivosDescarte) motivos.set(mo, (motivos.get(mo) || 0) + n);
    }
    const t1s = lista.map((c) => c[qual].tempoMedio1oContatoHoras).filter((n): n is number => n !== null);
    return {
      leadsNovos: soma((m) => m.leadsNovos, qual), novosAtendidos: soma((m) => m.novosAtendidos, qual),
      toques: soma((m) => m.toques, qual), diasAtivos: 0,
      tarefasConcluidas: soma((m) => m.tarefasConcluidas, qual),
      primeirosContatos: soma((m) => m.primeirosContatos, qual),
      tempoMedio1oContatoHoras: t1s.length ? round1(t1s.reduce((s, n) => s + n, 0) / t1s.length) : null,
      avancos: soma((m) => m.avancos, qual), chegaramEm,
      meetsAgendados: soma((m) => m.meetsAgendados, qual), meetsFeitos: soma((m) => m.meetsFeitos, qual),
      visitasFeitas: soma((m) => m.visitasFeitas, qual), negociacoes: soma((m) => m.negociacoes, qual),
      descartes: soma((m) => m.descartes, qual), descartesRapidos: soma((m) => m.descartesRapidos, qual),
      motivosDescarte: Array.from(motivos.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
      vendas: soma((m) => m.vendas, qual), vgv: soma((m) => m.vgv, qual), comissao: soma((m) => m.comissao, qual),
    };
  };

  const destaque = lista.length && (lista[0].atual.vendas > 0 || lista[0].atual.avancos > 0 || lista[0].atual.toques > 0) ? lista[0].nome : null;
  const preocupantes = [...lista].sort((a, b) => b.cobrar.length - a.cobrar.length || a.atual.toques - b.atual.toques);
  const atencao = preocupantes.length && preocupantes[0].cobrar.length >= 2 ? preocupantes[0].nome : null;

  return {
    janela,
    corretores: lista,
    time: { atual: agregada('atual'), anterior: agregada('anterior'), destaque, atencao },
    historicoDesdeMs,
  };
}
