'use client';

/**
 * Relatórios do admin — busca dos dados reais + cálculo de TODAS as métricas.
 * Tudo é derivado a partir de `leads` (+ campos do circuito/qualificação),
 * `usuarios` (a escala, pra o seletor de quem entra na conta) e `adsLeads`.
 * As métricas que dependem da timeline (`interactions`) ficam pra uma 2ª fase
 * (exigem ler subcoleção de cada lead — pesado); aqui é tudo nível-lead + ads.
 */
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  mapEtapaCircuito,
  etapaIndex,
  ETAPAS_CIRCUITO,
  ETAPA_FECHADO,
  ETAPA_DESCARTADO,
  ETAPA_MEET_AGENDADO,
  ETAPA_MEET_FEITO,
  ETAPA_VISITA_AGENDADA,
} from '@/lib/circuito';
import { QUALIFICATION_QUESTIONS } from '@/lib/qualificacao';

// ---------------------------------------------------------------------------
// Tipos crus
// ---------------------------------------------------------------------------
export interface RelLead {
  id: string;
  userId?: string;
  etapa?: string;
  origem?: string;
  origemTipo?: string;
  anotacoes?: string;
  qualificacao?: Record<string, string[]>;
  createdAt?: unknown;
  vendaEm?: unknown;
  vendaValor?: string;
  descartadoEm?: unknown;
  descartadoMotivo?: string;
  circuito?: {
    tentativas?: number;
    contatosFeitos?: number;
    primeiroContatoEm?: unknown;
    tentativasAtePrimeiroContato?: number;
    desde?: unknown;
  };
  [k: string]: unknown;
}
export interface RelCorretor {
  id: string;
  nome: string;
  tipoConta?: string;
  aprovado?: boolean;
  email?: string;
}
export interface RelAdsLead {
  id: string;
  status?: string;
  corretorEscalado?: string;
  aceitoPor?: string;
  tempoAceiteSeg?: number;
  viaGeral?: boolean;
  abriuGeralEm?: unknown;
  campanhaNome?: string;
  negadoPor?: string[];
}

// ---------------------------------------------------------------------------
// Hook: busca leads + corretores + adsLeads da imobiliária (tempo real)
// ---------------------------------------------------------------------------
export interface DadosRelatorio {
  leads: RelLead[];
  corretores: RelCorretor[];
  ads: RelAdsLead[];
  loading: boolean;
  error: string | null;
}

export function useRelatorioData(imobiliariaId: string | undefined, ativo: boolean): DadosRelatorio {
  const [leads, setLeads] = useState<RelLead[]>([]);
  const [corretores, setCorretores] = useState<RelCorretor[]>([]);
  const [ads, setAds] = useState<RelAdsLead[]>([]);
  const [loading, setLoading] = useState(!!imobiliariaId && ativo);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imobiliariaId || !ativo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubLeads = onSnapshot(
      query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId)),
      (snap) => {
        setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RelLead)));
        setError(null);
        setLoading(false);
      },
      (err) => { setError(err.message || 'Erro ao carregar leads'); setLoading(false); }
    );
    const unsubUsers = onSnapshot(
      query(collection(db, 'usuarios'), where('imobiliariaId', '==', imobiliariaId)),
      (snap) => {
        setCorretores(snap.docs.map((d) => {
          const x = d.data();
          return { id: d.id, nome: x.nome || 'Sem nome', tipoConta: x.tipoConta, aprovado: x.aprovado, email: x.email } as RelCorretor;
        }));
      },
      () => {}
    );
    const unsubAds = onSnapshot(
      query(collection(db, 'adsLeads'), where('imobiliariaId', '==', imobiliariaId)),
      (snap) => setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RelAdsLead))),
      () => {}
    );
    return () => { unsubLeads(); unsubUsers(); unsubAds(); };
  }, [imobiliariaId, ativo]);

  return { leads, corretores, ads, loading, error };
}

// ---------------------------------------------------------------------------
// Helpers de tempo / dinheiro
// ---------------------------------------------------------------------------
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
  // "R$ 1.250.000,00" → 1250000
  const limpo = v.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isNaN(n) ? 0 : n;
}

const DIA = 24 * 60 * 60 * 1000;
const LIMITE_ESTAGNADO_DIAS = 14;

export type Periodo = 'tudo' | 'mes' | '30d' | '90d';
export function inicioPeriodo(p: Periodo): number {
  if (p === 'tudo') return 0;
  if (p === 'mes') { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
  return Date.now() - (p === '30d' ? 30 : 90) * DIA;
}

// ---------------------------------------------------------------------------
// Tipos de saída
// ---------------------------------------------------------------------------
export interface Kpis {
  total: number; ativos: number; fechados: number; descartados: number;
  conversao: number; taxaDescarte: number;
  faturamento: number; ticket: number; fechadosComValor: number;
  tempoMedio1oContato: number | null;
  indiceQualif: number; indiceAnot: number;
  estagnados: number; leadsPerdidos: number;
}
export interface FunilRow { etapa: string; agora: number; alcancaram: number; pct: number; }
export interface RankingRow {
  id: string; nome: string; tipoConta?: string;
  total: number; ativos: number; fechados: number; conversao: number;
  descartes: number; taxaDescarte: number;
  tempo1oContato: number | null; tentativasMed: number | null;
  qualifPct: number; anotPct: number; estagnados: number;
  meetsGerados: number; visitasGeradas: number; noShowMeet: number;
  semQualifAvancado: number; descartesRapidos: number;
  respostaAdsMed: number | null; aceitosAds: number; negou: number;
}
export interface AdsResumo {
  total: number; aceitos: number; geral: number; naoAtendido: number; escalado: number;
  taxaAceite: number; tempoMedioAceite: number | null; viaGeralPct: number;
  porCampanha: { nome: string; total: number; aceitos: number }[];
}
export interface MercadoRow { key: string; title: string; respondidos: number; opcoes: { label: string; count: number }[]; }
export interface OrigemRow { origem: string; count: number; fechados: number; }
export interface Relatorio {
  kpis: Kpis; funil: FunilRow[]; ranking: RankingRow[];
  ads: AdsResumo; mercado: MercadoRow[]; origem: OrigemRow[];
}

const IDX_MEET_AG = etapaIndex(ETAPA_MEET_AGENDADO);
const IDX_MEET_FEITO = etapaIndex(ETAPA_MEET_FEITO);
const IDX_VISITA_AG = etapaIndex(ETAPA_VISITA_AGENDADA);

function temQualificacao(q?: Record<string, string[]>): boolean {
  if (!q) return false;
  return Object.values(q).some((arr) => Array.isArray(arr) && arr.length > 0);
}

// ---------------------------------------------------------------------------
// Núcleo: calcula tudo pro conjunto selecionado + período
// ---------------------------------------------------------------------------
export function computeRelatorio(
  leads: RelLead[],
  corretores: RelCorretor[],
  ads: RelAdsLead[],
  selecionados: Set<string>,
  periodo: Periodo,
): Relatorio {
  const inicio = inicioPeriodo(periodo);
  const leadsF = leads.filter((l) =>
    !!l.userId && selecionados.has(l.userId) &&
    (periodo === 'tudo' || msOf(l.createdAt) >= inicio)
  );

  // acumuladores globais
  let ativos = 0, fechados = 0, descartados = 0, comQualif = 0, comAnot = 0, estagnados = 0;
  let faturamento = 0, fechadosComValor = 0;
  let soma1oContato = 0, n1oContato = 0;
  const agoraPorEtapa: Record<string, number> = {};
  const alcancaramPorEtapa: Record<string, number> = {};
  ETAPAS_CIRCUITO.forEach((e) => { agoraPorEtapa[e] = 0; alcancaramPorEtapa[e] = 0; });

  // por corretor
  const nomeDe = new Map(corretores.map((c) => [c.id, c.nome] as const));
  const tipoDe = new Map(corretores.map((c) => [c.id, c.tipoConta] as const));
  interface Acc {
    total: number; ativos: number; fechados: number; descartes: number;
    soma1o: number; n1o: number; somaTent: number; nTent: number;
    qualif: number; anot: number; estagnados: number;
    meets: number; visitas: number; noShowMeet: number;
    semQualifAv: number; descRapido: number;
  }
  const acc = new Map<string, Acc>();
  const novoAcc = (): Acc => ({ total: 0, ativos: 0, fechados: 0, descartes: 0, soma1o: 0, n1o: 0, somaTent: 0, nTent: 0, qualif: 0, anot: 0, estagnados: 0, meets: 0, visitas: 0, noShowMeet: 0, semQualifAv: 0, descRapido: 0 });

  const agora = Date.now();
  const origemMap = new Map<string, { count: number; fechados: number }>();
  const mercadoContagem: Record<string, Record<string, number>> = {};
  const mercadoRespondidos: Record<string, number> = {};
  QUALIFICATION_QUESTIONS.forEach((q) => { mercadoContagem[q.key] = {}; mercadoRespondidos[q.key] = 0; });

  for (const l of leadsF) {
    const et = mapEtapaCircuito(l.etapa);
    const idx = etapaIndex(et);
    const isFechado = et === ETAPA_FECHADO;
    const isDescartado = et === ETAPA_DESCARTADO;
    const isAtivo = !isFechado && !isDescartado;
    const qualif = temQualificacao(l.qualificacao);
    const anot = !!(l.anotacoes && String(l.anotacoes).trim());
    // "parado": tempo desde a última mudança de etapa; se o lead nunca passou por
    // ação do circuito (importado/manual), cai no createdAt — senão o KPI mentiria 0.
    const desde = msOf(l.circuito?.desde) || msOf(l.createdAt);
    const diasEtapa = desde ? (agora - desde) / DIA : 0;
    const estag = isAtivo && diasEtapa > LIMITE_ESTAGNADO_DIAS;
    const avancado = idx >= IDX_MEET_AG;

    if (idx >= 0) agoraPorEtapa[et] = (agoraPorEtapa[et] || 0) + 1;
    // alcançaram (catraca): conta pra todas as etapas até o índice atual
    if (idx >= 0) for (let i = 0; i <= idx; i++) alcancaramPorEtapa[ETAPAS_CIRCUITO[i]]++;

    if (isAtivo) ativos++;
    if (isFechado) fechados++;
    if (isDescartado) descartados++;
    if (qualif) comQualif++;
    if (anot) comAnot++;
    if (estag) estagnados++;

    if (isFechado) {
      const val = parseVenda(l.vendaValor);
      if (val > 0) { faturamento += val; fechadosComValor++; }
    }

    const cMs = msOf(l.createdAt);
    const pMs = msOf(l.circuito?.primeiroContatoEm);
    const tem1o = cMs > 0 && pMs > 0 && pMs >= cMs;
    if (tem1o) { soma1oContato += (pMs - cMs) / DIA; n1oContato++; }

    // origem
    const og = (l.origemTipo || l.origem || '—') as string;
    const om = origemMap.get(og) || { count: 0, fechados: 0 };
    om.count++; if (isFechado) om.fechados++; origemMap.set(og, om);

    // mercado (qualificação)
    if (l.qualificacao) {
      for (const q of QUALIFICATION_QUESTIONS) {
        const vals = l.qualificacao[q.key];
        if (Array.isArray(vals) && vals.length) {
          mercadoRespondidos[q.key]++;
          for (const v of vals) mercadoContagem[q.key][v] = (mercadoContagem[q.key][v] || 0) + 1;
        }
      }
    }

    // por corretor
    const uid = l.userId as string;
    let a = acc.get(uid); if (!a) { a = novoAcc(); acc.set(uid, a); }
    a.total++;
    if (isAtivo) a.ativos++;
    if (isFechado) a.fechados++;
    if (isDescartado) { a.descartes++; if ((l.circuito?.tentativas || 0) <= 1) a.descRapido++; }
    if (qualif) a.qualif++;
    if (anot) a.anot++;
    if (estag) a.estagnados++;
    if (tem1o) { a.soma1o += (pMs - cMs) / DIA; a.n1o++; }
    if (typeof l.circuito?.tentativas === 'number') { a.somaTent += l.circuito.tentativas; a.nTent++; }
    if (idx >= IDX_MEET_AG) a.meets++;
    if (idx >= IDX_VISITA_AG) a.visitas++;
    if (et === ETAPA_MEET_AGENDADO) a.noShowMeet++;
    if (avancado && !qualif) a.semQualifAv++;
  }

  const total = leadsF.length;

  // ads (nível organização — respeita a seleção pelo aceitoPor/escalado quando dá)
  const adsSel = ads.filter((x) =>
    !x.aceitoPor || selecionados.has(x.aceitoPor) || (x.corretorEscalado ? selecionados.has(x.corretorEscalado) : true)
  );
  const adsAceitos = adsSel.filter((x) => x.status === 'aceito');
  const adsGeral = adsSel.filter((x) => x.status === 'geral').length;
  const adsNaoAt = adsSel.filter((x) => x.status === 'nao-atendido').length;
  const adsEscalado = adsSel.filter((x) => x.status === 'escalado').length;
  const tempos = adsAceitos.map((x) => x.tempoAceiteSeg).filter((n): n is number => typeof n === 'number');
  const viaGeral = adsAceitos.filter((x) => x.viaGeral).length;
  const campMap = new Map<string, { total: number; aceitos: number }>();
  for (const x of adsSel) {
    const nome = x.campanhaNome || '(sem campanha)';
    const c = campMap.get(nome) || { total: 0, aceitos: 0 };
    c.total++; if (x.status === 'aceito') c.aceitos++; campMap.set(nome, c);
  }
  // resposta média de ads por corretor
  const respAdsPorCorretor = new Map<string, number[]>();
  const aceitosPorCorretor = new Map<string, number>();
  const negouPorCorretor = new Map<string, number>();
  for (const x of ads) {
    if (x.status === 'aceito' && x.aceitoPor && typeof x.tempoAceiteSeg === 'number') {
      const arr = respAdsPorCorretor.get(x.aceitoPor) || []; arr.push(x.tempoAceiteSeg); respAdsPorCorretor.set(x.aceitoPor, arr);
    }
    if (x.status === 'aceito' && x.aceitoPor) aceitosPorCorretor.set(x.aceitoPor, (aceitosPorCorretor.get(x.aceitoPor) || 0) + 1);
    if (Array.isArray(x.negadoPor)) for (const u of x.negadoPor) negouPorCorretor.set(u, (negouPorCorretor.get(u) || 0) + 1);
  }

  const media = (arr: number[]): number | null => arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null;

  const ranking: RankingRow[] = Array.from(acc.entries())
    .map(([id, a]) => ({
      id, nome: nomeDe.get(id) || id, tipoConta: tipoDe.get(id),
      total: a.total, ativos: a.ativos, fechados: a.fechados,
      conversao: a.total ? a.fechados / a.total : 0,
      descartes: a.descartes, taxaDescarte: a.total ? a.descartes / a.total : 0,
      tempo1oContato: a.n1o ? a.soma1o / a.n1o : null,
      tentativasMed: a.nTent ? a.somaTent / a.nTent : null,
      qualifPct: a.total ? a.qualif / a.total : 0,
      anotPct: a.total ? a.anot / a.total : 0,
      estagnados: a.estagnados,
      meetsGerados: a.meets, visitasGeradas: a.visitas, noShowMeet: a.noShowMeet,
      semQualifAvancado: a.semQualifAv, descartesRapidos: a.descRapido,
      respostaAdsMed: media(respAdsPorCorretor.get(id) || []),
      aceitosAds: aceitosPorCorretor.get(id) || 0,
      negou: negouPorCorretor.get(id) || 0,
    }))
    .sort((x, y) => y.total - x.total);

  const funil: FunilRow[] = ETAPAS_CIRCUITO.map((e) => ({
    etapa: e,
    agora: agoraPorEtapa[e] || 0,
    alcancaram: alcancaramPorEtapa[e] || 0,
    pct: total ? (alcancaramPorEtapa[e] || 0) / total : 0,
  }));

  const mercado: MercadoRow[] = QUALIFICATION_QUESTIONS.map((q) => ({
    key: q.key, title: q.title, respondidos: mercadoRespondidos[q.key],
    opcoes: Object.entries(mercadoContagem[q.key])
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  }));

  const origem: OrigemRow[] = Array.from(origemMap.entries())
    .map(([o, v]) => ({ origem: o, count: v.count, fechados: v.fechados }))
    .sort((a, b) => b.count - a.count);

  const kpis: Kpis = {
    total, ativos, fechados, descartados,
    conversao: total ? fechados / total : 0,
    taxaDescarte: total ? descartados / total : 0,
    faturamento, ticket: fechadosComValor ? faturamento / fechadosComValor : 0, fechadosComValor,
    tempoMedio1oContato: n1oContato ? soma1oContato / n1oContato : null,
    indiceQualif: total ? comQualif / total : 0,
    indiceAnot: total ? comAnot / total : 0,
    estagnados,
    leadsPerdidos: adsNaoAt,
  };

  const ads_: AdsResumo = {
    total: adsSel.length, aceitos: adsAceitos.length, geral: adsGeral, naoAtendido: adsNaoAt, escalado: adsEscalado,
    taxaAceite: adsSel.length ? adsAceitos.length / adsSel.length : 0,
    tempoMedioAceite: media(tempos),
    viaGeralPct: adsAceitos.length ? viaGeral / adsAceitos.length : 0,
    porCampanha: Array.from(campMap.entries()).map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.total - a.total),
  };

  return { kpis, funil, ranking, ads: ads_, mercado, origem };
}

// ---------------------------------------------------------------------------
// Formatadores pra UI
// ---------------------------------------------------------------------------
export const fmtPct = (r: number): string => `${Math.round(r * 100)}%`;
export const fmtPct1 = (r: number): string => `${(r * 100).toFixed(1)}%`;
export const fmtDias = (d: number | null): string => d === null ? '—' : d < 1 ? `${Math.round(d * 24)}h` : `${d.toFixed(1)}d`;
export const fmtNum = (n: number | null, dec = 1): string => n === null ? '—' : n.toFixed(dec);
export const fmtSeg = (s: number | null): string => s === null ? '—' : s < 60 ? `${Math.round(s)}s` : `${(s / 60).toFixed(1)}min`;
export const fmtMoeda = (n: number): string => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
