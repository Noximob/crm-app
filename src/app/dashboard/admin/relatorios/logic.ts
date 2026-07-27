'use client';

/**
 * Relatórios do admin — motor de dados + métricas pra GESTÃO DE CORRETORES.
 * Fontes: `leads` (+ circuito/qualificação), `usuarios` (a escala / seletor),
 * `adsLeads` (distribuição) e a subcoleção `interactions` de cada lead (atividade
 * real: última ação, cadência, canal). Cada corretor recebe um SCORE DE SAÚDE
 * composto (0-100) com semáforo e ponto fraco, pra cobrança personalizada.
 */
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import {
  mapEtapaCircuito, etapaIndex, ETAPAS_CIRCUITO,
  ETAPA_FECHADO, ETAPA_DESCARTADO, ETAPA_MEET_AGENDADO, ETAPA_VISITA_AGENDADA,
} from '@/lib/circuito';
import { QUALIFICATION_QUESTIONS } from '@/lib/qualificacao';

// ── Tipos crus ──────────────────────────────────────────────────────────────
export interface RelLead {
  id: string; userId?: string; etapa?: string; origem?: string; origemTipo?: string;
  anotacoes?: string; qualificacao?: Record<string, string[]>;
  createdAt?: unknown; vendaEm?: unknown; vendaValor?: string;
  descartadoEm?: unknown; descartadoMotivo?: string;
  circuito?: { tentativas?: number; contatosFeitos?: number; primeiroContatoEm?: unknown; tentativasAtePrimeiroContato?: number; desde?: unknown };
  [k: string]: unknown;
}
export interface RelCorretor { id: string; nome: string; tipoConta?: string; aprovado?: boolean; email?: string; }
export interface RelAdsLead {
  id: string; status?: string; corretorEscalado?: string; aceitoPor?: string; tempoAceiteSeg?: number;
  viaGeral?: boolean; campanhaNome?: string; negadoPor?: string[];
  // rastro explícito gravado pelo robô quando a janela exclusiva vence
  expirouEm?: unknown; expirouDe?: string; expirouDeNome?: string; expirouAposSeg?: number;
}
export interface TarefaLead { id: string; tipo: string; status: string; dueMs: number; concluidaMs: number }
export interface AtividadeLead { eventos: { ms: number; tipo: string; taskId?: string }[]; tarefas: TarefaLead[] }

/** Tarefas de acompanhamento: é isso que o time chama de "follow-up" no dia a dia. */
export const TIPOS_FOLLOWUP = ['Follow-up', 'Ligação', 'Ligacao', 'WhatsApp'];
export const ehFollowup = (tipo: string) => TIPOS_FOLLOWUP.includes(tipo);
const ehConcluida = (s: string) => /conclu/i.test(s);
const ehCancelada = (s: string) => /cancel/i.test(s);

// ── Helpers ───────────────────────────────────────────────────────────────
export function msOf(ts: unknown): number {
  if (!ts) return 0;
  const t = ts as { toMillis?: () => number; seconds?: number };
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'string') { const p = Date.parse(ts); return Number.isNaN(p) ? 0 : p; }
  if (typeof ts === 'number') return ts;
  return 0;
}
export function parseVenda(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || !v) return 0;
  const limpo = v.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isNaN(n) ? 0 : n;
}
const DIA = 24 * 60 * 60 * 1000;
const ESTAGNADO_DIAS = 14;
const SEM_TOQUE_DIAS = 7;
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

export type Periodo = 'tudo' | 'mes' | '30d' | '90d';
export function inicioPeriodo(p: Periodo): number {
  if (p === 'tudo') return 0;
  if (p === 'mes') { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
  return Date.now() - (p === '30d' ? 30 : 90) * DIA;
}

// ── Hook 1: leads + corretores + ads (tempo real) ───────────────────────────
export interface DadosRelatorio { leads: RelLead[]; corretores: RelCorretor[]; ads: RelAdsLead[]; minutosExclusivo: number; loading: boolean; error: string | null; }
export function useRelatorioData(imobiliariaId: string | undefined, ativo: boolean): DadosRelatorio {
  const [leads, setLeads] = useState<RelLead[]>([]);
  const [corretores, setCorretores] = useState<RelCorretor[]>([]);
  const [ads, setAds] = useState<RelAdsLead[]>([]);
  const [minutosExclusivo, setMinutosExclusivo] = useState(5);
  const [loading, setLoading] = useState(!!imobiliariaId && ativo);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!imobiliariaId || !ativo) { setLoading(false); return; }
    setLoading(true);
    const u1 = onSnapshot(query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId)),
      (s) => { setLeads(s.docs.map((d) => ({ id: d.id, ...d.data() } as RelLead))); setError(null); setLoading(false); },
      (e) => { setError(e.message || 'Erro ao carregar leads'); setLoading(false); });
    const u2 = onSnapshot(query(collection(db, 'usuarios'), where('imobiliariaId', '==', imobiliariaId)),
      (s) => setCorretores(s.docs.map((d) => { const x = d.data(); return { id: d.id, nome: x.nome || 'Sem nome', tipoConta: x.tipoConta, aprovado: x.aprovado, email: x.email } as RelCorretor; })), () => {});
    const u3 = onSnapshot(query(collection(db, 'adsLeads'), where('imobiliariaId', '==', imobiliariaId)),
      (s) => setAds(s.docs.map((d) => ({ id: d.id, ...d.data() } as RelAdsLead))), () => {});
    // janela exclusiva configurada (pra saber o que é "não atendeu a tempo")
    const u4 = onSnapshot(doc(db, 'distribuicaoAds', 'config'),
      (s) => { const n = Number(s.data()?.minutosExclusivo); setMinutosExclusivo(n > 0 ? n : 5); }, () => {});
    return () => { u1(); u2(); u3(); u4(); };
  }, [imobiliariaId, ativo]);
  return { leads, corretores, ads, minutosExclusivo, loading, error };
}

// ── Hook 2: atividade (lê interactions de cada lead, em lotes, no fundo) ─────
export function useAtividade(leads: RelLead[], ativo: boolean): { mapa: Map<string, AtividadeLead>; loadingAtiv: boolean; progresso: number } {
  const idsKey = useMemo(() => leads.map((l) => l.id).sort().join('|'), [leads]);
  const [mapa, setMapa] = useState<Map<string, AtividadeLead>>(new Map());
  const [loadingAtiv, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  useEffect(() => {
    if (!ativo || !idsKey) { return; }
    const ids = idsKey.split('|').filter(Boolean);
    if (ids.length === 0) return;
    let cancel = false;
    setLoading(true); setProgresso(0);
    const m = new Map<string, AtividadeLead>();
    (async () => {
      const CHUNK = 24;
      for (let i = 0; i < ids.length && !cancel; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        await Promise.all(slice.map(async (id) => {
          try {
            const [snap, tsnap] = await Promise.all([
              getDocs(collection(db, 'leads', id, 'interactions')),
              getDocs(collection(db, 'leads', id, 'tarefas')),
            ]);
            const eventos: { ms: number; tipo: string; taskId?: string }[] = [];
            snap.forEach((d) => {
              const x = d.data(); const ms = msOf(x.timestamp);
              if (ms) eventos.push({ ms, tipo: String(x.type || ''), taskId: x.taskId ? String(x.taskId) : undefined });
            });
            eventos.sort((a, b) => a.ms - b.ms);
            // quando cada tarefa foi concluída: a interação "Tarefa Concluída" carrega o taskId
            const conclusaoDe = new Map<string, number>();
            for (const e of eventos) if (e.taskId && /conclu/i.test(e.tipo)) conclusaoDe.set(e.taskId, e.ms);
            const tarefas: TarefaLead[] = [];
            tsnap.forEach((d) => {
              const x = d.data();
              tarefas.push({ id: d.id, tipo: String(x.type || ''), status: String(x.status || ''), dueMs: msOf(x.dueDate), concluidaMs: conclusaoDe.get(d.id) || 0 });
            });
            m.set(id, { eventos, tarefas });
          } catch { /* pula lead com erro */ }
        }));
        if (!cancel) setProgresso(Math.min(1, (i + CHUNK) / ids.length));
      }
      if (!cancel) { setMapa(new Map(m)); setLoading(false); setProgresso(1); }
    })();
    return () => { cancel = true; };
  }, [idsKey, ativo]);
  return { mapa, loadingAtiv, progresso };
}

// ── Saída ───────────────────────────────────────────────────────────────────
export interface Kpis {
  total: number; ativos: number; fechados: number; descartados: number; conversao: number; taxaDescarte: number;
  faturamento: number; ticket: number; fechadosComValor: number; tempoMedio1oContato: number | null;
  indiceQualif: number; indiceAnot: number; estagnados: number; leadsPerdidos: number;
  ativosHoje: number; sumidos: number; interacoesTotal: number;
}
export interface FunilRow { etapa: string; agora: number; alcancaram: number; pct: number; }
export interface SubScores { atividade: number | null; velocidade: number | null; conversao: number; qualidade: number; higiene: number; }
export interface RankingRow {
  id: string; nome: string; tipoConta?: string;
  total: number; ativos: number; fechados: number; conversao: number; descartes: number; taxaDescarte: number;
  tempo1oContato: number | null; tentativasMed: number | null; qualifPct: number; anotPct: number; estagnados: number;
  meetsGerados: number; visitasGeradas: number; noShowMeet: number; semQualifAvancado: number; descartesRapidos: number;
  respostaAdsMed: number | null; aceitosAds: number; negou: number;
  // atividade
  ultimaAtividadeMs: number | null; diasSemAtividade: number | null; interacoes: number; interacoesPorLeadAtivo: number | null;
  ligacoes: number; whats: number; cadenciaMediaDias: number | null; leadsSemToque: number;
  porEtapa: Record<string, number>;
  // score
  score: number; sub: SubScores; cor: 'verde' | 'amarelo' | 'vermelho'; pontoFraco: string; dica: string;
}
export interface AdsResumo { total: number; aceitos: number; geral: number; naoAtendido: number; escalado: number; taxaAceite: number; tempoMedioAceite: number | null; viaGeralPct: number; porCampanha: { nome: string; total: number; aceitos: number }[]; }
export interface MercadoRow { key: string; title: string; respondidos: number; opcoes: { label: string; count: number }[]; }
export interface OrigemRow { origem: string; count: number; fechados: number; }
export interface Relatorio { kpis: Kpis; funil: FunilRow[]; ranking: RankingRow[]; ads: AdsResumo; mercado: MercadoRow[]; origem: OrigemRow[]; comAtividade: boolean; }

const IDX_MEET_AG = etapaIndex(ETAPA_MEET_AGENDADO);
const IDX_VISITA_AG = etapaIndex(ETAPA_VISITA_AGENDADA);
const temQualificacao = (q?: Record<string, string[]>) => !!q && Object.values(q).some((a) => Array.isArray(a) && a.length > 0);

// ── Score de saúde ──────────────────────────────────────────────────────────
const DIMS: { key: keyof SubScores; nome: string; peso: number; dica: string }[] = [
  { key: 'atividade', nome: 'Atividade', peso: 0.24, dica: 'Está pouco ativo — pode ter largado a carteira. Cobre presença diária no CRM.' },
  { key: 'velocidade', nome: 'Velocidade', peso: 0.16, dica: 'Demora a fazer o 1º contato/aceitar lead. Cobre resposta rápida — lead esfria em minutos.' },
  { key: 'conversao', nome: 'Conversão', peso: 0.24, dica: 'Converte pouco pra o volume que tem. Acompanhe o funil dele de perto (onde trava?).' },
  { key: 'qualidade', nome: 'Qualidade', peso: 0.20, dica: 'Não qualifica/anota os leads — trabalha no escuro. Cobre preenchimento a cada atendimento.' },
  { key: 'higiene', nome: 'Higiene', peso: 0.16, dica: 'Muita coisa parada/descartada rápido. Faça revisão da carteira dele com ele.' },
];

function calcScore(r: RankingRow): { score: number; sub: SubScores; cor: RankingRow['cor']; pontoFraco: string; dica: string } {
  const sub: SubScores = {
    atividade: r.diasSemAtividade === null ? null : (r.diasSemAtividade <= 1 ? 100 : r.diasSemAtividade <= 2 ? 85 : r.diasSemAtividade <= 4 ? 65 : r.diasSemAtividade <= 7 ? 45 : r.diasSemAtividade <= 14 ? 25 : 5),
    velocidade: r.tempo1oContato === null ? null : (r.tempo1oContato < 1 / 24 ? 100 : r.tempo1oContato < 0.5 ? 85 : r.tempo1oContato < 1 ? 70 : r.tempo1oContato < 3 ? 45 : r.tempo1oContato < 7 ? 20 : 5),
    conversao: r.conversao >= 0.07 ? 100 : r.conversao >= 0.05 ? 85 : r.conversao >= 0.03 ? 65 : r.conversao >= 0.015 ? 45 : r.conversao > 0 ? 25 : 5,
    qualidade: clamp(Math.round((r.qualifPct * 0.6 + r.anotPct * 0.4) * 100)),
    higiene: clamp(Math.round(100 - r.taxaDescarte * 70 - (r.total ? r.estagnados / r.total : 0) * 50 - (r.total ? r.semQualifAvancado / r.total : 0) * 80)),
  };
  let somaPeso = 0, soma = 0;
  for (const d of DIMS) { const v = sub[d.key]; if (v !== null) { soma += v * d.peso; somaPeso += d.peso; } }
  const score = somaPeso ? Math.round(soma / somaPeso) : 0;
  // ponto fraco = menor dimensão com dado
  let fraco = DIMS[0], menor = 101;
  for (const d of DIMS) { const v = sub[d.key]; if (v !== null && v < menor) { menor = v; fraco = d; } }
  const cor: RankingRow['cor'] = score >= 70 ? 'verde' : score >= 45 ? 'amarelo' : 'vermelho';
  return { score, sub, cor, pontoFraco: fraco.nome, dica: menor <= 60 ? fraco.dica : 'Está bem nas principais frentes — mantenha o ritmo.' };
}

// ── Núcleo ──────────────────────────────────────────────────────────────────
export function computeRelatorio(
  leads: RelLead[], corretores: RelCorretor[], ads: RelAdsLead[],
  atividade: Map<string, AtividadeLead> | null, selecionados: Set<string>, periodo: Periodo,
  atividadeDesdeMs = 0,
): Relatorio {
  const inicio = inicioPeriodo(periodo);
  const comAtividade = !!atividade && atividade.size > 0;
  const leadsF = leads.filter((l) => !!l.userId && selecionados.has(l.userId) && (periodo === 'tudo' || msOf(l.createdAt) >= inicio));
  const agora = Date.now();

  let ativos = 0, fechados = 0, descartados = 0, comQualif = 0, comAnot = 0, estagnados = 0, faturamento = 0, fechadosComValor = 0;
  let soma1o = 0, n1o = 0, interacoesTotal = 0;
  const agoraPorEtapa: Record<string, number> = {}, alcancaram: Record<string, number> = {};
  ETAPAS_CIRCUITO.forEach((e) => { agoraPorEtapa[e] = 0; alcancaram[e] = 0; });
  const nomeDe = new Map(corretores.map((c) => [c.id, c.nome] as const));
  const tipoDe = new Map(corretores.map((c) => [c.id, c.tipoConta] as const));

  interface Acc {
    total: number; ativos: number; fechados: number; descartes: number; soma1o: number; n1o: number; somaTent: number; nTent: number;
    qualif: number; anot: number; estag: number; meets: number; visitas: number; noShow: number; semQualAv: number; descRapido: number;
    ultimaMs: number; interacoes: number; ligacoes: number; whats: number; somaCad: number; nCad: number; semToque: number;
    porEtapa: Record<string, number>;
  }
  const acc = new Map<string, Acc>();
  const novo = (): Acc => ({ total: 0, ativos: 0, fechados: 0, descartes: 0, soma1o: 0, n1o: 0, somaTent: 0, nTent: 0, qualif: 0, anot: 0, estag: 0, meets: 0, visitas: 0, noShow: 0, semQualAv: 0, descRapido: 0, ultimaMs: 0, interacoes: 0, ligacoes: 0, whats: 0, somaCad: 0, nCad: 0, semToque: 0, porEtapa: {} });

  const origemMap = new Map<string, { count: number; fechados: number }>();
  const mercCont: Record<string, Record<string, number>> = {}, mercResp: Record<string, number> = {};
  QUALIFICATION_QUESTIONS.forEach((q) => { mercCont[q.key] = {}; mercResp[q.key] = 0; });

  for (const l of leadsF) {
    const et = mapEtapaCircuito(l.etapa); const idx = etapaIndex(et);
    const isFech = et === ETAPA_FECHADO, isDesc = et === ETAPA_DESCARTADO, isAtivo = !isFech && !isDesc;
    const qualif = temQualificacao(l.qualificacao);
    const anot = !!(l.anotacoes && String(l.anotacoes).trim());
    const desde = msOf(l.circuito?.desde) || msOf(l.createdAt);
    const estag = isAtivo && desde > 0 && (agora - desde) / DIA > ESTAGNADO_DIAS;
    const avancado = idx >= IDX_MEET_AG;
    const at = atividade?.get(l.id);
    // atividade só conta a partir do marco (ignora a faxina de organização do CRM)
    const evs = at ? (atividadeDesdeMs > 0 ? at.eventos.filter((e) => e.ms >= atividadeDesdeMs) : at.eventos) : [];
    const ultimaMs = evs.length ? evs[evs.length - 1].ms : 0;

    if (idx >= 0) { agoraPorEtapa[et]++; for (let i = 0; i <= idx; i++) alcancaram[ETAPAS_CIRCUITO[i]]++; }
    if (isAtivo) ativos++; if (isFech) fechados++; if (isDesc) descartados++;
    if (qualif) comQualif++; if (anot) comAnot++; if (estag) estagnados++;
    if (isFech) { const v = parseVenda(l.vendaValor); if (v > 0) { faturamento += v; fechadosComValor++; } }
    const cMs = msOf(l.createdAt), pMs = msOf(l.circuito?.primeiroContatoEm);
    // velocidade = resposta a lead FRESCO; gap > 30d é backfill/importação (createdAt
    // não é a entrada real), então não entra na média de velocidade.
    const tem1o = cMs > 0 && pMs > 0 && pMs >= cMs && (pMs - cMs) <= 30 * DIA;
    if (tem1o) { soma1o += (pMs - cMs) / DIA; n1o++; }
    interacoesTotal += evs.length;

    const og = String(l.origemTipo || l.origem || '—');
    const om = origemMap.get(og) || { count: 0, fechados: 0 }; om.count++; if (isFech) om.fechados++; origemMap.set(og, om);
    if (l.qualificacao) for (const q of QUALIFICATION_QUESTIONS) { const vals = l.qualificacao[q.key]; if (Array.isArray(vals) && vals.length) { mercResp[q.key]++; for (const v of vals) mercCont[q.key][v] = (mercCont[q.key][v] || 0) + 1; } }

    const uid = l.userId as string; let a = acc.get(uid); if (!a) { a = novo(); acc.set(uid, a); }
    a.total++; if (isAtivo) a.ativos++; if (isFech) a.fechados++;
    if (isDesc) { a.descartes++; if ((l.circuito?.tentativas || 0) <= 1) a.descRapido++; }
    if (qualif) a.qualif++; if (anot) a.anot++; if (estag) a.estag++;
    if (tem1o) { a.soma1o += (pMs - cMs) / DIA; a.n1o++; }
    if (typeof l.circuito?.tentativas === 'number') { a.somaTent += l.circuito.tentativas; a.nTent++; }
    if (idx >= IDX_MEET_AG) a.meets++; if (idx >= IDX_VISITA_AG) a.visitas++;
    if (et === ETAPA_MEET_AGENDADO) a.noShow++;
    if (avancado && !qualif) a.semQualAv++;
    if (idx >= 0) a.porEtapa[et] = (a.porEtapa[et] || 0) + 1;
    if (at) {
      a.interacoes += evs.length;
      for (const e of evs) { if (e.tipo === 'Ligação' || e.tipo === 'Ligacao') a.ligacoes++; else if (e.tipo === 'WhatsApp') a.whats++; }
      if (evs.length >= 2) { let s = 0; for (let k = 1; k < evs.length; k++) s += evs[k].ms - evs[k - 1].ms; a.somaCad += s / (evs.length - 1) / DIA; a.nCad++; }
      if (ultimaMs > a.ultimaMs) a.ultimaMs = ultimaMs;
      if (isAtivo && (ultimaMs === 0 || (agora - ultimaMs) / DIA > SEM_TOQUE_DIAS)) a.semToque++;
    }
  }

  const total = leadsF.length;
  const media = (arr: number[]): number | null => arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null;

  // ads por corretor
  const respAds = new Map<string, number[]>(), aceitosC = new Map<string, number>(), negouC = new Map<string, number>();
  for (const x of ads) {
    if (x.status === 'aceito' && x.aceitoPor && typeof x.tempoAceiteSeg === 'number') { const a = respAds.get(x.aceitoPor) || []; a.push(x.tempoAceiteSeg); respAds.set(x.aceitoPor, a); }
    if (x.status === 'aceito' && x.aceitoPor) aceitosC.set(x.aceitoPor, (aceitosC.get(x.aceitoPor) || 0) + 1);
    if (Array.isArray(x.negadoPor)) for (const u of x.negadoPor) negouC.set(u, (negouC.get(u) || 0) + 1);
  }

  const ranking: RankingRow[] = Array.from(acc.entries()).map(([id, a]) => {
    const base: RankingRow = {
      id, nome: nomeDe.get(id) || id, tipoConta: tipoDe.get(id),
      total: a.total, ativos: a.ativos, fechados: a.fechados, conversao: a.total ? a.fechados / a.total : 0,
      descartes: a.descartes, taxaDescarte: a.total ? a.descartes / a.total : 0,
      tempo1oContato: a.n1o ? a.soma1o / a.n1o : null, tentativasMed: a.nTent ? a.somaTent / a.nTent : null,
      qualifPct: a.total ? a.qualif / a.total : 0, anotPct: a.total ? a.anot / a.total : 0, estagnados: a.estag,
      meetsGerados: a.meets, visitasGeradas: a.visitas, noShowMeet: a.noShow, semQualifAvancado: a.semQualAv, descartesRapidos: a.descRapido,
      respostaAdsMed: media(respAds.get(id) || []), aceitosAds: aceitosC.get(id) || 0, negou: negouC.get(id) || 0,
      ultimaAtividadeMs: comAtividade ? (a.ultimaMs || 0) : null,
      diasSemAtividade: comAtividade ? (a.ultimaMs ? (agora - a.ultimaMs) / DIA : 999) : null,
      interacoes: a.interacoes, interacoesPorLeadAtivo: a.ativos ? a.interacoes / a.ativos : null,
      ligacoes: a.ligacoes, whats: a.whats, cadenciaMediaDias: a.nCad ? a.somaCad / a.nCad : null, leadsSemToque: a.semToque,
      porEtapa: a.porEtapa,
      score: 0, sub: { atividade: null, velocidade: null, conversao: 0, qualidade: 0, higiene: 0 }, cor: 'amarelo', pontoFraco: '', dica: '',
    };
    const s = calcScore(base);
    return { ...base, ...s };
  }).sort((x, y) => y.score - x.score);

  const funil: FunilRow[] = ETAPAS_CIRCUITO.map((e) => ({ etapa: e, agora: agoraPorEtapa[e] || 0, alcancaram: alcancaram[e] || 0, pct: total ? (alcancaram[e] || 0) / total : 0 }));

  // ads resumo (respeita seleção por aceitoPor/escalado)
  const adsSel = ads.filter((x) => !x.aceitoPor || selecionados.has(x.aceitoPor) || (x.corretorEscalado ? selecionados.has(x.corretorEscalado) : true));
  const adsAceitos = adsSel.filter((x) => x.status === 'aceito');
  const tempos = adsAceitos.map((x) => x.tempoAceiteSeg).filter((n): n is number => typeof n === 'number');
  const campMap = new Map<string, { total: number; aceitos: number }>();
  for (const x of adsSel) { const nome = x.campanhaNome || '(sem campanha)'; const c = campMap.get(nome) || { total: 0, aceitos: 0 }; c.total++; if (x.status === 'aceito') c.aceitos++; campMap.set(nome, c); }
  const adsResumo: AdsResumo = {
    total: adsSel.length, aceitos: adsAceitos.length, geral: adsSel.filter((x) => x.status === 'geral').length,
    naoAtendido: adsSel.filter((x) => x.status === 'nao-atendido').length, escalado: adsSel.filter((x) => x.status === 'escalado').length,
    taxaAceite: adsSel.length ? adsAceitos.length / adsSel.length : 0, tempoMedioAceite: media(tempos),
    viaGeralPct: adsAceitos.length ? adsAceitos.filter((x) => x.viaGeral).length / adsAceitos.length : 0,
    porCampanha: Array.from(campMap.entries()).map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.total - a.total),
  };

  const mercado: MercadoRow[] = QUALIFICATION_QUESTIONS.map((q) => ({ key: q.key, title: q.title, respondidos: mercResp[q.key], opcoes: Object.entries(mercCont[q.key]).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count) }));
  const origem: OrigemRow[] = Array.from(origemMap.entries()).map(([o, v]) => ({ origem: o, count: v.count, fechados: v.fechados })).sort((a, b) => b.count - a.count);

  const ativosHoje = comAtividade ? ranking.filter((r) => r.diasSemAtividade !== null && r.diasSemAtividade <= 1).length : 0;
  const sumidos = comAtividade ? ranking.filter((r) => r.diasSemAtividade !== null && r.diasSemAtividade > 7).length : 0;

  const kpis: Kpis = {
    total, ativos, fechados, descartados, conversao: total ? fechados / total : 0, taxaDescarte: total ? descartados / total : 0,
    faturamento, ticket: fechadosComValor ? faturamento / fechadosComValor : 0, fechadosComValor, tempoMedio1oContato: n1o ? soma1o / n1o : null,
    indiceQualif: total ? comQualif / total : 0, indiceAnot: total ? comAnot / total : 0, estagnados, leadsPerdidos: adsResumo.naoAtendido,
    ativosHoje, sumidos, interacoesTotal,
  };

  return { kpis, funil, ranking, ads: adsResumo, mercado, origem, comAtividade };
}

// ---------------------------------------------------------------------------
// RELATÓRIO DOS LEADS DE DISTRIBUIÇÃO (só o que veio de anúncio/propaganda)
// Cruza adsLeads → lead do CRM (pelo leadId gravado no aceite) e mede o que
// aconteceu DEPOIS: etapa no funil, anotação, qualificação, tempo de atendimento,
// follow-ups e o tempo pra fazer cada um. Inclui quem deixou vencer a exclusiva.
// ---------------------------------------------------------------------------
export interface LeadDistRow {
  adsId: string; leadId: string | null; nome: string; telefone: string;
  campanha: string; anuncio: string; criadoMs: number;
  status: string;                    // escalado | geral | aceito | nao-atendido
  escaladoPara: string; escaladoParaNome: string;
  aceitoPor: string; aceitoPorNome: string; tempoAceiteSeg: number | null;
  viaGeral: boolean;
  nasceuNoBolsao: boolean;   // rodízio desligado: entrou aberto pra todos, ninguém "perdeu"
  perdeuAVez: boolean;       // passou da janela e POR ISSO foi pro bolsão
  expirouDe: string; expirouDeNome: string; expirouAposSeg: number | null;  // quem deixou vencer
  estourouJanela: boolean;   // aceitou (ou está pendente) além dos minutos exclusivos
  pegouNoBolsao: boolean;    // aceitou quando o lead já estava aberto pra todos
  negouQtd: number;
  // o que aconteceu com o lead no CRM
  etapa: string; etapaIdx: number; fechado: boolean; descartado: boolean;
  temAnotacao: boolean; temQualificacao: boolean; qualifCampos: number;
  tempo1oContatoDias: number | null; tentativas: number;
  interacoes: number; ultimoToqueMs: number; diasSemToque: number | null; diasParado: number | null;
  fuCriados: number; fuConcluidos: number; fuPendentes: number; fuAtrasados: number;
  fuTempoMedioDias: number | null;   // do vencimento até concluir (+ = atrasou)
}
export interface ResumoDist {
  total: number; aceitos: number; naoAtendidos: number; naFila: number;
  taxaAceite: number; tempoMedioAceiteSeg: number | null; medianaAceiteSeg: number | null;
  perderamAVez: number; viaGeral: number; estouraramJanela: number; nasceramNoBolsao: number;
  dentroDaJanela: number; janelaMin: number;
  comAnotacao: number; comQualificacao: number; pctAnotacao: number; pctQualificacao: number;
  tempoMedio1oContato: number | null; semNenhumToque: number;
  fuCriados: number; fuConcluidos: number; fuAtrasados: number; fuTempoMedioDias: number | null;
  fechados: number; conversao: number; interacoesMedia: number | null;
  porEtapa: Record<string, number>;
  porCampanha: { nome: string; total: number; aceitos: number; fechados: number }[];
  porCorretor: {
    id: string; nome: string; recebidos: number; aceitos: number; perdeuAVez: number; estourouJanela: number; negou: number;
    tempoAceiteMed: number | null; pctAnotacao: number; pctQualificacao: number;
    tempo1oContato: number | null; fuCriados: number; fuConcluidos: number; fuAtrasados: number;
    fuTempoMedioDias: number | null; fechados: number; conversao: number; interacoes: number;
  }[];
}

const mediana = (arr: number[]): number | null => {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y); const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const med = (arr: number[]): number | null => arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null;

export function computeRelatorioDist(
  ads: RelAdsLead[], leads: RelLead[], corretores: RelCorretor[],
  atividade: Map<string, AtividadeLead> | null, periodo: Periodo,
  minutosExclusivo = 5,
): { linhas: LeadDistRow[]; resumo: ResumoDist } {
  const janelaSeg = Math.max(1, minutosExclusivo) * 60;
  const inicio = inicioPeriodo(periodo);
  const leadById = new Map(leads.map((l) => [l.id, l] as const));
  const nomeDe = new Map(corretores.map((c) => [c.id, c.nome] as const));
  const agora = Date.now();

  const adsF = ads.filter((a) => periodo === 'tudo' || msOf((a as { criadoEm?: unknown }).criadoEm) >= inicio);

  const linhas: LeadDistRow[] = adsF.map((a) => {
    const x = a as RelAdsLead & { nome?: string; telefone?: string; campanhaNome?: string; anuncioNome?: string; criadoEm?: unknown; abriuGeralEm?: unknown; leadId?: string; aceitoPorNome?: string };
    const leadId = x.leadId || null;
    const lead = leadId ? leadById.get(leadId) : undefined;
    const at = leadId && atividade ? atividade.get(leadId) : undefined;

    const etapa = lead ? mapEtapaCircuito(lead.etapa) : '—';
    const idx = lead ? etapaIndex(etapa) : -1;
    const qualifCampos = lead?.qualificacao ? Object.values(lead.qualificacao).filter((v) => Array.isArray(v) && v.length > 0).length : 0;
    const cMs = lead ? msOf(lead.createdAt) : 0;
    const pMs = lead ? msOf(lead.circuito?.primeiroContatoEm) : 0;
    const t1 = cMs > 0 && pMs >= cMs ? (pMs - cMs) / DIA : null;
    const evs = at?.eventos || [];
    const ultimo = evs.length ? evs[evs.length - 1].ms : 0;
    const desde = lead ? (msOf(lead.circuito?.desde) || cMs) : 0;

    // ── Quem passou da janela e por isso foi pro bolsão ──────────────────────
    // Fonte da verdade: `expirouDe`, gravado pelo robô no momento em que a
    // janela vence. Pros leads antigos (antes desse rastro existir) cai numa
    // heurística por timestamp — `abriuGeralEm` sozinho NÃO serve, porque ele
    // também é gravado quando o lead já nasce no bolsão (rodízio desligado).
    const escMs = msOf((x as { escaladoEm?: unknown }).escaladoEm);
    const geralMs = msOf(x.abriuGeralEm);
    const nasceuNoBolsao = !x.corretorEscalado;
    const perdeuAVez = !!x.expirouDe || (!!x.corretorEscalado && geralMs > 0 && escMs > 0 && geralMs > escMs);
    const expirouDeNome = x.expirouDeNome || (x.expirouDe ? nomeDe.get(x.expirouDe) || '—' : '');
    const tAceite = typeof x.tempoAceiteSeg === 'number' ? x.tempoAceiteSeg : null;
    // "não atendeu na janela": aceitou depois do tempo exclusivo, ou ainda está
    // escalado com a janela já vencida. Pega até quem o robô ainda não expirou.
    const aindaEscaladoVencido = x.status === 'escalado' && escMs > 0 && (agora - escMs) / 1000 > janelaSeg;
    const estourouJanela = !nasceuNoBolsao && ((tAceite !== null && tAceite > janelaSeg) || perdeuAVez || aindaEscaladoVencido);

    const fus = (at?.tarefas || []).filter((t) => ehFollowup(t.tipo));
    const fuConcl = fus.filter((t) => ehConcluida(t.status));
    const fuPend = fus.filter((t) => !ehConcluida(t.status) && !ehCancelada(t.status));
    const atrasos = fuConcl.filter((t) => t.concluidaMs > 0 && t.dueMs > 0).map((t) => (t.concluidaMs - t.dueMs) / DIA);

    return {
      adsId: a.id, leadId, nome: x.nome || 'Sem nome', telefone: String(x.telefone || ''),
      campanha: x.campanhaNome || '(sem campanha)', anuncio: x.anuncioNome || '',
      criadoMs: msOf(x.criadoEm), status: x.status || '—',
      escaladoPara: x.corretorEscalado || '', escaladoParaNome: x.corretorEscalado ? (nomeDe.get(x.corretorEscalado) || '—') : '—',
      aceitoPor: x.aceitoPor || '', aceitoPorNome: x.aceitoPorNome || (x.aceitoPor ? nomeDe.get(x.aceitoPor) || '—' : '—'),
      tempoAceiteSeg: tAceite,
      viaGeral: !!x.viaGeral,
      nasceuNoBolsao, perdeuAVez, estourouJanela, pegouNoBolsao: !!x.viaGeral,
      expirouDe: x.expirouDe || (perdeuAVez ? x.corretorEscalado || '' : ''),
      expirouDeNome: expirouDeNome || (perdeuAVez && x.corretorEscalado ? nomeDe.get(x.corretorEscalado) || '—' : ''),
      expirouAposSeg: typeof x.expirouAposSeg === 'number' ? x.expirouAposSeg : null,
      negouQtd: Array.isArray(x.negadoPor) ? x.negadoPor.length : 0,
      etapa, etapaIdx: idx, fechado: etapa === ETAPA_FECHADO, descartado: etapa === ETAPA_DESCARTADO,
      temAnotacao: !!(lead?.anotacoes && String(lead.anotacoes).trim()), temQualificacao: qualifCampos > 0, qualifCampos,
      tempo1oContatoDias: t1, tentativas: lead?.circuito?.tentativas || 0,
      interacoes: evs.length, ultimoToqueMs: ultimo,
      diasSemToque: ultimo ? (agora - ultimo) / DIA : null,
      diasParado: desde ? (agora - desde) / DIA : null,
      fuCriados: fus.length, fuConcluidos: fuConcl.length, fuPendentes: fuPend.length,
      fuAtrasados: fuPend.filter((t) => t.dueMs > 0 && t.dueMs < agora).length,
      fuTempoMedioDias: med(atrasos),
    };
  }).sort((a, b) => b.criadoMs - a.criadoMs);

  // ── resumo ──
  const aceitos = linhas.filter((l) => l.status === 'aceito');
  const comLead = linhas.filter((l) => !!l.leadId);
  const tempos = aceitos.map((l) => l.tempoAceiteSeg).filter((n): n is number => n !== null);
  const t1s = comLead.map((l) => l.tempo1oContatoDias).filter((n): n is number => n !== null);
  const fuMedios = comLead.map((l) => l.fuTempoMedioDias).filter((n): n is number => n !== null);
  const porEtapa: Record<string, number> = {};
  ETAPAS_CIRCUITO.forEach((e) => { porEtapa[e] = 0; });
  comLead.forEach((l) => { if (l.etapaIdx >= 0) porEtapa[l.etapa] = (porEtapa[l.etapa] || 0) + 1; });

  const campMap = new Map<string, { total: number; aceitos: number; fechados: number }>();
  linhas.forEach((l) => {
    const c = campMap.get(l.campanha) || { total: 0, aceitos: 0, fechados: 0 };
    c.total++; if (l.status === 'aceito') c.aceitos++; if (l.fechado) c.fechados++;
    campMap.set(l.campanha, c);
  });

  const corrMap = new Map<string, { recebidos: number; aceitos: number; perdeu: number; estourou: number; negou: number; tAceite: number[]; anot: number; qual: number; t1: number[]; fuC: number; fuOk: number; fuAtr: number; fuT: number[]; fech: number; inter: number }>();
  const acc = (id: string) => { let v = corrMap.get(id); if (!v) { v = { recebidos: 0, aceitos: 0, perdeu: 0, estourou: 0, negou: 0, tAceite: [], anot: 0, qual: 0, t1: [], fuC: 0, fuOk: 0, fuAtr: 0, fuT: [], fech: 0, inter: 0 }; corrMap.set(id, v); } return v; };
  // quem recusou explicitamente (botão Negar) — vem do array negadoPor do adsLead
  adsF.forEach((a) => { if (Array.isArray(a.negadoPor)) a.negadoPor.forEach((u) => { acc(u).negou++; }); });
  linhas.forEach((l) => {
    if (l.escaladoPara) { const v = acc(l.escaladoPara); v.recebidos++; if (l.estourouJanela) v.estourou++; }
    // a perda é creditada a QUEM deixou vencer (pode não ser o dono atual, se
    // o lead foi redistribuído depois)
    const culpado = l.expirouDe || (l.perdeuAVez ? l.escaladoPara : '');
    if (l.perdeuAVez && culpado) acc(culpado).perdeu++;
    if (l.aceitoPor) {
      const v = acc(l.aceitoPor);
      v.aceitos++; if (l.tempoAceiteSeg !== null) v.tAceite.push(l.tempoAceiteSeg);
      if (l.temAnotacao) v.anot++; if (l.temQualificacao) v.qual++;
      if (l.tempo1oContatoDias !== null) v.t1.push(l.tempo1oContatoDias);
      v.fuC += l.fuCriados; v.fuOk += l.fuConcluidos; v.fuAtr += l.fuAtrasados;
      if (l.fuTempoMedioDias !== null) v.fuT.push(l.fuTempoMedioDias);
      if (l.fechado) v.fech++; v.inter += l.interacoes;
    }
  });

  const resumo: ResumoDist = {
    total: linhas.length, aceitos: aceitos.length,
    naoAtendidos: linhas.filter((l) => l.status === 'nao-atendido').length,
    naFila: linhas.filter((l) => l.status === 'escalado' || l.status === 'geral').length,
    taxaAceite: linhas.length ? aceitos.length / linhas.length : 0,
    tempoMedioAceiteSeg: med(tempos), medianaAceiteSeg: mediana(tempos),
    perderamAVez: linhas.filter((l) => l.perdeuAVez).length,
    viaGeral: aceitos.filter((l) => l.pegouNoBolsao).length,
    estouraramJanela: linhas.filter((l) => l.estourouJanela).length,
    nasceramNoBolsao: linhas.filter((l) => l.nasceuNoBolsao).length,
    dentroDaJanela: linhas.filter((l) => !l.nasceuNoBolsao && !l.estourouJanela && l.status === 'aceito').length,
    janelaMin: minutosExclusivo,
    comAnotacao: comLead.filter((l) => l.temAnotacao).length,
    comQualificacao: comLead.filter((l) => l.temQualificacao).length,
    pctAnotacao: comLead.length ? comLead.filter((l) => l.temAnotacao).length / comLead.length : 0,
    pctQualificacao: comLead.length ? comLead.filter((l) => l.temQualificacao).length / comLead.length : 0,
    tempoMedio1oContato: med(t1s),
    semNenhumToque: comLead.filter((l) => l.interacoes === 0).length,
    fuCriados: comLead.reduce((s, l) => s + l.fuCriados, 0),
    fuConcluidos: comLead.reduce((s, l) => s + l.fuConcluidos, 0),
    fuAtrasados: comLead.reduce((s, l) => s + l.fuAtrasados, 0),
    fuTempoMedioDias: med(fuMedios),
    fechados: comLead.filter((l) => l.fechado).length,
    conversao: comLead.length ? comLead.filter((l) => l.fechado).length / comLead.length : 0,
    interacoesMedia: comLead.length ? comLead.reduce((s, l) => s + l.interacoes, 0) / comLead.length : null,
    porEtapa,
    porCampanha: Array.from(campMap.entries()).map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.total - a.total),
    porCorretor: Array.from(corrMap.entries()).map(([id, v]) => ({
      id, nome: nomeDe.get(id) || id.slice(0, 6), recebidos: v.recebidos, aceitos: v.aceitos, perdeuAVez: v.perdeu, estourouJanela: v.estourou, negou: v.negou,
      tempoAceiteMed: med(v.tAceite),
      pctAnotacao: v.aceitos ? v.anot / v.aceitos : 0, pctQualificacao: v.aceitos ? v.qual / v.aceitos : 0,
      tempo1oContato: med(v.t1), fuCriados: v.fuC, fuConcluidos: v.fuOk, fuAtrasados: v.fuAtr, fuTempoMedioDias: med(v.fuT),
      fechados: v.fech, conversao: v.aceitos ? v.fech / v.aceitos : 0, interacoes: v.inter,
    })).sort((a, b) => b.aceitos - a.aceitos),
  };

  return { linhas, resumo };
}

// ── Formatadores ─────────────────────────────────────────────────────────────
export const fmtPct = (r: number) => `${Math.round(r * 100)}%`;
export const fmtPct1 = (r: number) => `${(r * 100).toFixed(1)}%`;
export const fmtDias = (d: number | null) => d === null ? '—' : d >= 900 ? 'nunca' : d < 1 ? `${Math.round(d * 24)}h` : `${d.toFixed(1)}d`;
export const fmtDiasInt = (d: number | null) => d === null ? '—' : d >= 900 ? 'nunca' : d < 1 ? 'hoje' : `${Math.round(d)}d`;
export const fmtNum = (n: number | null, dec = 1) => n === null ? '—' : n.toFixed(dec);
export const fmtSeg = (s: number | null) => s === null ? '—' : s < 60 ? `${Math.round(s)}s` : `${(s / 60).toFixed(1)}min`;
export const fmtMoeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
