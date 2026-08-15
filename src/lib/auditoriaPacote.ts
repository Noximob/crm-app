/**
 * AUDITORIA — o pacote de dados de um corretor.
 *
 * Puro: sem Firebase. Quem chama já carregou leads, interações, tarefas,
 * vendas e os leads de anúncio. Aqui se faz o sorteio da amostra, o panorama
 * e a montagem do JSON que sai da máquina.
 *
 * Duas regras da casa mandam neste arquivo:
 *   - DESCARTADO não entra na amostra. Ele já foi pra outro corretor, então
 *     analisar o atendimento dele não cobra ninguém — descarte vale como
 *     NÚMERO no panorama, não como caso.
 *   - Tempo se mede em HORÁRIO ÚTIL (ver lib/auditoria). O relógio não corre
 *     de madrugada.
 */
import {
  mapEtapaCircuito, etapaIndex, ETAPAS_CIRCUITO, ehInteresseFuturo,
  ETAPA_FECHADO, ETAPA_DESCARTADO, ETAPA_MEET_AGENDADO, ETAPA_MEET_FEITO,
  ETAPA_VISITA_AGENDADA, ETAPA_VISITA_FEITA, ETAPA_INTERESSE_FUTURO,
} from './circuito';
import { minutosUteisEntre, horasUteisEntre, descreverHorarioUtil, type DiretrizesAuditoria } from './auditoria';

const DIA = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Entrada (o que o chamador precisa carregar)
// ---------------------------------------------------------------------------

export interface LeadAud {
  id: string;
  nome?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  etapa?: string;
  origem?: string;
  origemTipo?: string;
  origemPropaganda?: string;
  anotacoes?: string;
  qualificacao?: Record<string, string[]>;
  createdAt?: unknown;
  descartadoEm?: unknown;
  descartadoMotivo?: string;
  circuito?: { desde?: unknown; tentativas?: number; contatosFeitos?: number; primeiroContatoEm?: unknown; tentativasAtePrimeiroContato?: number };
  etapasHist?: { de?: string; para?: string; em?: unknown; porNome?: string }[];
  tarefasPendentes?: { id?: string; description?: string; type?: string; dueDate?: unknown }[];
  [k: string]: unknown;
}

export interface InteracaoAud { ms: number; tipo: string; notas: string; por?: string; taskId?: string }
export interface TarefaAud { id: string; descricao: string; tipo: string; status: string; dueMs: number; concluidaMs: number }
export interface AtividadeAud { interacoes: InteracaoAud[]; tarefas: TarefaAud[] }

export interface VendaAud { leadId?: string; corretorUid: string; status?: string; dataVenda: string; vgvLiquido?: number; valorBruto?: number }
export interface AdsAud { leadId?: string; campanhaNome?: string; tempoAceiteSeg?: number | null; viaGeral?: boolean; aceitoPor?: string; expirouDe?: string }

export const msOf = (ts: unknown): number => {
  if (!ts) return 0;
  const t = ts as { toMillis?: () => number; seconds?: number };
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'string') { const p = Date.parse(ts); return Number.isNaN(p) ? 0 : p; }
  if (typeof ts === 'number') return ts;
  return 0;
};

// ---------------------------------------------------------------------------
// Telefone — sem isso o cruzamento com WhatsApp falha
// ---------------------------------------------------------------------------

/**
 * Devolve as DUAS formas do número: com e sem o 9 do celular, sempre
 * 55 + DDD + número, só dígitos. O WhatsApp de números antigos aparece sem o
 * 9 mesmo quando o CRM guardou com — procurar só uma variação perde a conversa.
 */
export function normalizarTelefone(bruto: string | undefined): { telefone: string | null; telefone_alt: string | null } {
  const d = String(bruto || '').replace(/\D/g, '');
  if (d.length < 10) return { telefone: null, telefone_alt: null };
  // tira o 55 do país, se veio
  let n = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
  if (n.length < 10) return { telefone: null, telefone_alt: null };
  // pega os últimos 10/11 dígitos (limpa 0 de operadora e sobras)
  n = n.slice(-11);
  const ddd = n.length === 11 ? n.slice(0, 2) : n.slice(0, 2);
  const resto = n.slice(2);
  const semNove = resto.length === 9 && resto.startsWith('9') ? resto.slice(1) : resto.length === 8 ? resto : resto.slice(-8);
  const comNove = resto.length === 9 ? resto : `9${semNove}`;
  return { telefone: `55${ddd}${comNove}`, telefone_alt: `55${ddd}${semNove}` };
}

// ---------------------------------------------------------------------------
// Sorteio estratificado
// ---------------------------------------------------------------------------

export type FaixaSorteio = 'avancado' | 'parado_15d' | 'entrada_recente' | 'livre';

export const ROTULO_FAIXA: Record<FaixaSorteio, string> = {
  avancado: 'Etapa avançada',
  parado_15d: 'Parado +15 dias',
  entrada_recente: 'Entrada recente',
  livre: 'Aleatório livre',
};

/** Proporção alvo pra 20. Descartado NÃO tem faixa: os 3 lugares dele foram pro livre. */
export const PROPORCAO: { faixa: FaixaSorteio; parte: number }[] = [
  { faixa: 'avancado', parte: 5 },
  { faixa: 'parado_15d', parte: 5 },
  { faixa: 'entrada_recente', parte: 4 },
  { faixa: 'livre', parte: 6 },
];

const IDX_MEET_FEITO = etapaIndex(ETAPA_MEET_FEITO);

export function faixaDoLead(l: LeadAud, ultimoToqueMs: number, agora: number): FaixaSorteio | null {
  const et = mapEtapaCircuito(l.etapa);
  if (et === ETAPA_DESCARTADO) return null; // fora da amostra por decisão da casa
  const idx = etapaIndex(et);
  if (idx >= IDX_MEET_FEITO && et !== ETAPA_FECHADO) return 'avancado';
  const nascimento = msOf(l.createdAt);
  if (nascimento > 0 && (agora - nascimento) / DIA <= 15) return 'entrada_recente';
  const ref = ultimoToqueMs || nascimento;
  if (ref > 0 && (agora - ref) / DIA > 15) return 'parado_15d';
  return 'livre';
}

export interface ResultadoSorteio {
  escolhidos: { lead: LeadAud; faixa: FaixaSorteio }[];
  /** faixas que não tinham gente suficiente — a tela avisa qual ficou incompleta */
  incompletas: { faixa: FaixaSorteio; pedidos: number; obtidos: number }[];
}

const embaralhar = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function sortearAmostra(
  leads: LeadAud[], ultimoToqueDe: (id: string) => number, tamanho: number, agora = Date.now(),
): ResultadoSorteio {
  const porFaixa = new Map<FaixaSorteio, LeadAud[]>();
  for (const l of leads) {
    const f = faixaDoLead(l, ultimoToqueDe(l.id), agora);
    if (!f) continue;
    const arr = porFaixa.get(f) || [];
    arr.push(l);
    porFaixa.set(f, arr);
  }
  const total = PROPORCAO.reduce((s, p) => s + p.parte, 0);
  const escolhidos: { lead: LeadAud; faixa: FaixaSorteio }[] = [];
  const incompletas: ResultadoSorteio['incompletas'] = [];
  const usados = new Set<string>();
  let sobra = 0;

  for (const { faixa, parte } of PROPORCAO) {
    const querem = Math.max(0, Math.round((parte / total) * tamanho));
    const disponiveis = embaralhar((porFaixa.get(faixa) || []).filter((l) => !usados.has(l.id)));
    const pega = disponiveis.slice(0, querem);
    pega.forEach((l) => { usados.add(l.id); escolhidos.push({ lead: l, faixa }); });
    if (pega.length < querem) {
      sobra += querem - pega.length;
      if (faixa !== 'livre') incompletas.push({ faixa, pedidos: querem, obtidos: pega.length });
    }
  }
  // o que faltou vira aleatório livre entre TODOS os elegíveis restantes
  if (sobra > 0) {
    const resto = embaralhar(leads.filter((l) => !usados.has(l.id) && faixaDoLead(l, ultimoToqueDe(l.id), agora) !== null));
    resto.slice(0, sobra).forEach((l) => { usados.add(l.id); escolhidos.push({ lead: l, faixa: 'livre' }); });
  }
  return { escolhidos, incompletas };
}

// ---------------------------------------------------------------------------
// Panorama
// ---------------------------------------------------------------------------

export interface Panorama {
  leads_recebidos: number;
  leads_novos_30d: number;
  leads_sem_primeiro_contato: number;
  mediana_primeiro_contato_min_util: number | null;
  mediana_primeiro_contato_min_corrido: number | null;
  dentro_do_prazo_1o_contato: number;
  fora_do_prazo_1o_contato: number;
  distribuicao_funil: Record<string, number>;
  sem_toque_7d: number;
  sem_toque_7d_por_etapa: Record<string, number>;
  tarefas_atrasadas_24h: number;
  tarefas_concluidas_atrasadas_24h: number;
  leads_sem_tarefa_futura: number;
  leads_sem_anotacao: number;
  leads_sem_qualificacao: number;
  meets_marcados: number; meets_feitos: number;
  visitas_marcadas: number; visitas_feitas: number;
  descartes: number; descartes_primeiro_toque: number;
  motivos_descarte: Record<string, number>;
  vendas: number; vgv: number;
  rodizio: { recebidos: number; aceite_mediano_seg: number | null; pegos_no_bolsao: number; deixou_vencer: number };
  benchmark_time: { mediana_primeiro_contato_min_util: number | null; sem_toque_7d_percentual: number | null };
}

const mediana = (a: number[]): number | null => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export function computarPanorama(
  leads: LeadAud[], ativ: Map<string, AtividadeAud>, vendas: VendaAud[], ads: AdsAud[],
  d: DiretrizesAuditoria, uid: string, iniMs: number, fimMs: number, agora = Date.now(),
): Panorama {
  const dentroJ = (ms: number) => ms >= iniMs && ms < fimMs;
  const p: Panorama = {
    leads_recebidos: 0, leads_novos_30d: 0, leads_sem_primeiro_contato: 0,
    mediana_primeiro_contato_min_util: null, mediana_primeiro_contato_min_corrido: null,
    dentro_do_prazo_1o_contato: 0, fora_do_prazo_1o_contato: 0,
    distribuicao_funil: {}, sem_toque_7d: 0, sem_toque_7d_por_etapa: {},
    tarefas_atrasadas_24h: 0, tarefas_concluidas_atrasadas_24h: 0,
    leads_sem_tarefa_futura: 0, leads_sem_anotacao: 0, leads_sem_qualificacao: 0,
    meets_marcados: 0, meets_feitos: 0, visitas_marcadas: 0, visitas_feitas: 0,
    descartes: 0, descartes_primeiro_toque: 0, motivos_descarte: {},
    vendas: 0, vgv: 0,
    rodizio: { recebidos: 0, aceite_mediano_seg: null, pegos_no_bolsao: 0, deixou_vencer: 0 },
    benchmark_time: { mediana_primeiro_contato_min_util: null, sem_toque_7d_percentual: null },
  };
  ETAPAS_CIRCUITO.forEach((e) => { p.distribuicao_funil[e] = 0; });
  p.distribuicao_funil[ETAPA_INTERESSE_FUTURO] = 0;

  const t1Uteis: number[] = [], t1Corridos: number[] = [];
  const atrasoH = d.prazos.tarefaAtrasadaHoras;

  for (const l of leads) {
    const et = mapEtapaCircuito(l.etapa);
    const nascimento = msOf(l.createdAt);
    const at = ativ.get(l.id);
    const ultimo = at?.interacoes.length ? at.interacoes[at.interacoes.length - 1].ms : 0;

    if (dentroJ(nascimento)) p.leads_recebidos++;
    if (nascimento > 0 && (agora - nascimento) / DIA <= 30) p.leads_novos_30d++;

    // funil (interesse futuro é DERIVADO — não é etapa gravada)
    const rotulo = ehInteresseFuturo(et, l.tarefasPendentes, agora) ? ETAPA_INTERESSE_FUTURO : et;
    if (p.distribuicao_funil[rotulo] !== undefined) p.distribuicao_funil[rotulo]++;

    const ativo = et !== ETAPA_FECHADO && et !== ETAPA_DESCARTADO;

    // 1º contato
    const pMs = msOf(l.circuito?.primeiroContatoEm);
    if (nascimento > 0 && pMs >= nascimento && pMs > 0) {
      const util = minutosUteisEntre(nascimento, pMs, d.horarioUtil);
      t1Uteis.push(util);
      t1Corridos.push(Math.round((pMs - nascimento) / 60000));
      if (util <= d.prazos.primeiroContatoMaximoMin) p.dentro_do_prazo_1o_contato++;
      else p.fora_do_prazo_1o_contato++;
    } else if (ativo) {
      p.leads_sem_primeiro_contato++;
    }

    if (ativo) {
      const ref = ultimo || nascimento;
      if (ref > 0 && (agora - ref) / DIA > d.prazos.leadParadoDias) {
        p.sem_toque_7d++;
        p.sem_toque_7d_por_etapa[rotulo] = (p.sem_toque_7d_por_etapa[rotulo] || 0) + 1;
      }
      const temFutura = (at?.tarefas || []).some((t) => !/conclu|cancel/i.test(t.status) && t.dueMs > agora);
      if (!temFutura) p.leads_sem_tarefa_futura++;
      if (!String(l.anotacoes || '').trim()) p.leads_sem_anotacao++;
      const temQualif = !!l.qualificacao && Object.values(l.qualificacao).some((v) => Array.isArray(v) && v.length > 0);
      if (!temQualif) p.leads_sem_qualificacao++;
    }

    // tarefas: em aberto agora, e as que ele fez com atraso dentro da janela
    for (const t of (at?.tarefas || [])) {
      if (t.dueMs <= 0) continue;
      const concl = /conclu/i.test(t.status), canc = /cancel/i.test(t.status);
      if (!concl && !canc && horasUteisEntre(t.dueMs, agora, d.horarioUtil) > atrasoH) p.tarefas_atrasadas_24h++;
      else if (concl && t.concluidaMs > 0 && dentroJ(t.concluidaMs) && horasUteisEntre(t.dueMs, t.concluidaMs, d.horarioUtil) > atrasoH) p.tarefas_concluidas_atrasadas_24h++;
    }

    // agenda (via carimbo de etapa) e descartes, na janela
    for (const h of (l.etapasHist || [])) {
      const em = msOf(h.em);
      if (!em || !dentroJ(em) || !h.para) continue;
      const para = mapEtapaCircuito(h.para);
      if (para === ETAPA_MEET_AGENDADO) p.meets_marcados++;
      if (para === ETAPA_MEET_FEITO) p.meets_feitos++;
      if (para === ETAPA_VISITA_AGENDADA) p.visitas_marcadas++;
      if (para === ETAPA_VISITA_FEITA) p.visitas_feitas++;
    }
    const dMs = msOf(l.descartadoEm);
    if (dMs > 0 && dentroJ(dMs)) {
      p.descartes++;
      if ((l.circuito?.tentativas || 0) <= 1) p.descartes_primeiro_toque++;
      const mo = String(l.descartadoMotivo || 'sem motivo');
      p.motivos_descarte[mo] = (p.motivos_descarte[mo] || 0) + 1;
    }
  }

  p.mediana_primeiro_contato_min_util = mediana(t1Uteis);
  p.mediana_primeiro_contato_min_corrido = mediana(t1Corridos);

  // vendas na janela
  const ymd = (ms: number) => { const x = new Date(ms); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const iniY = ymd(iniMs), fimY = ymd(fimMs - 1);
  for (const v of vendas) {
    if (v.corretorUid !== uid || v.status !== 'assinada' || !v.dataVenda) continue;
    if (v.dataVenda < iniY || v.dataVenda > fimY) continue;
    p.vendas++;
    p.vgv += v.vgvLiquido ?? v.valorBruto ?? 0;
  }

  // rodízio de propaganda
  const meusAds = ads.filter((a) => a.aceitoPor === uid || a.expirouDe === uid);
  p.rodizio.recebidos = meusAds.filter((a) => a.aceitoPor === uid).length;
  p.rodizio.pegos_no_bolsao = meusAds.filter((a) => a.aceitoPor === uid && a.viaGeral).length;
  p.rodizio.deixou_vencer = meusAds.filter((a) => a.expirouDe === uid).length;
  p.rodizio.aceite_mediano_seg = mediana(meusAds.filter((a) => a.aceitoPor === uid && typeof a.tempoAceiteSeg === 'number').map((a) => a.tempoAceiteSeg as number));

  return p;
}

// ---------------------------------------------------------------------------
// Pacote
// ---------------------------------------------------------------------------

export interface OpcoesPacote {
  corretor: { id: string; nome: string };
  periodo: { iniMs: number; fimMs: number };
  diretrizes: DiretrizesAuditoria;
  panorama: Panorama;
  amostra: { lead: LeadAud; faixa: FaixaSorteio }[];
  atividade: Map<string, AtividadeAud>;
  ads: AdsAud[];
  historico: unknown;
  /** data do carimbo de etapa mais antigo da base — antes disso não há agenda */
  historicoEtapasDesdeMs: number | null;
}

const iso = (ms: number): string | null => (ms > 0 ? new Date(ms).toISOString() : null);
const ymdStr = (ms: number) => { const x = new Date(ms); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

export function montarPacote(o: OpcoesPacote, agora = Date.now()): Record<string, unknown> {
  const faltantes = new Set<string>();
  const { iniMs, fimMs } = o.periodo;
  const parcialAgenda = o.historicoEtapasDesdeMs !== null && o.historicoEtapasDesdeMs > iniMs;

  const amostra = o.amostra.map(({ lead: l, faixa }) => {
    const at = o.atividade.get(l.id);
    const tel = normalizarTelefone(l.telefone || l.whatsapp);
    if (!tel.telefone) faltantes.add('amostra[].telefone');
    const nascimento = msOf(l.createdAt);
    const ultimo = at?.interacoes.length ? at.interacoes[at.interacoes.length - 1].ms : 0;
    const pMs = msOf(l.circuito?.primeiroContatoEm);
    const meuAds = o.ads.find((a) => a.leadId === l.id);

    // timeline: interações + transições de etapa + tarefas, em ordem
    type Ev = { data: string | null; tipo: string; [k: string]: unknown };
    const eventos: (Ev & { _ms: number })[] = [];
    for (const h of (l.etapasHist || [])) {
      const ms = msOf(h.em);
      if (ms) eventos.push({ _ms: ms, data: iso(ms), tipo: 'etapa', de: h.de ? mapEtapaCircuito(h.de) : null, para: h.para ? mapEtapaCircuito(h.para) : null, por: h.porNome || null });
    }
    for (const i of (at?.interacoes || [])) {
      eventos.push({ _ms: i.ms, data: iso(i.ms), tipo: 'interacao', subtipo: i.tipo, texto: i.notas || null, por: i.por || null });
    }
    for (const t of (at?.tarefas || [])) {
      if (t.dueMs > 0) {
        const atrasoHoras = t.concluidaMs > 0 ? horasUteisEntre(t.dueMs, t.concluidaMs, o.diretrizes.horarioUtil)
          : horasUteisEntre(t.dueMs, agora, o.diretrizes.horarioUtil);
        eventos.push({
          _ms: t.dueMs, data: iso(t.dueMs), tipo: 'tarefa', titulo: t.descricao || t.tipo || null,
          status: t.status, concluida_em: iso(t.concluidaMs),
          atrasada_horas_uteis: t.dueMs < (t.concluidaMs || agora) ? Math.round(atrasoHoras * 10) / 10 : 0,
        });
      }
    }
    eventos.sort((a, b) => a._ms - b._ms);

    const qualif = l.qualificacao || {};
    const temAlgumaQualif = Object.values(qualif).some((v) => Array.isArray(v) && v.length > 0);
    if (!temAlgumaQualif) faltantes.add('amostra[].qualificacao');
    faltantes.add('amostra[].produto_interesse');

    return {
      id: l.id,
      nome: l.nome || null,
      telefone: tel.telefone,
      telefone_alt: tel.telefone_alt,
      faixa_sorteio: faixa,
      origem: l.origem || null,
      origem_tipo: l.origemTipo || null,
      campanha: l.origemPropaganda || meuAds?.campanhaNome || null,
      produto_interesse: null,
      qualificacao: {
        finalidade: qualif.finalidade || null,
        estagio: qualif.estagio || null,
        quartos: qualif.quartos || null,
        localizacao: qualif.localizacao || null,
        tipo: qualif.tipo || null,
        vagas: qualif.vagas || null,
        valor: qualif.valor || null,
      },
      etapa_atual: mapEtapaCircuito(l.etapa),
      interesse_futuro: ehInteresseFuturo(mapEtapaCircuito(l.etapa), l.tarefasPendentes, agora),
      data_entrada: iso(nascimento),
      primeiro_contato_em: iso(pMs),
      minutos_uteis_ate_1o_contato: pMs > nascimento && nascimento > 0 ? minutosUteisEntre(nascimento, pMs, o.diretrizes.horarioUtil) : null,
      minutos_corridos_ate_1o_contato: pMs > nascimento && nascimento > 0 ? Math.round((pMs - nascimento) / 60000) : null,
      // 0 minuto ÚTIL com minutos corridos > 0 = atendeu fora do expediente.
      // Sem esta bandeira, o zero é lido como "respondeu na hora" e o corretor
      // que trabalhou à noite some do mérito.
      atendeu_fora_do_expediente: pMs > nascimento && nascimento > 0
        && minutosUteisEntre(nascimento, pMs, o.diretrizes.horarioUtil) === 0
        && (pMs - nascimento) > 60000,
      tentativas: l.circuito?.tentativas ?? null,
      contatos_feitos: l.circuito?.contatosFeitos ?? null,
      // descreve o que JÁ FOI FEITO (não o próximo passo) — menos ambíguo na leitura
      contato_tentativa: l.circuito
        ? `${l.circuito.contatosFeitos ? `${l.circuito.contatosFeitos}º contato` : 'sem contato ainda'} · ${l.circuito.tentativas || 0} tentativa${(l.circuito.tentativas || 0) === 1 ? '' : 's'}`
        : null,
      dias_sem_toque: ultimo ? Math.floor((agora - ultimo) / DIA) : null,
      ultimo_toque_em: iso(ultimo),
      anotacoes_livres: l.anotacoes ? String(l.anotacoes) : null,
      descartado_em: iso(msOf(l.descartadoEm)),
      descarte_motivo: l.descartadoMotivo || null,
      rodizio: meuAds ? {
        campanha: meuAds.campanhaNome || null,
        tempo_aceite_seg: meuAds.tempoAceiteSeg ?? null,
        pegou_no_bolsao: !!meuAds.viaGeral,
      } : null,
      timeline: eventos.map(({ _ms, ...e }) => e),
    };
  });

  return {
    meta: {
      gerado_em: new Date(agora).toISOString(),
      corretor: o.corretor,
      periodo: { inicio: ymdStr(iniMs), fim: ymdStr(fimMs - 1) },
      tamanho_amostra: amostra.length,
      versao_diretrizes: o.diretrizes.versao,
      fuso: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      campos_indisponiveis: Array.from(faltantes).sort(),
      avisos: [
        'Os tempos de "1º contato" medem QUANDO O CORRETOR REGISTROU no CRM, não quando ele falou com o cliente. Confirme no WhatsApp antes de cobrar demora: quem ficou 2h em ligação e anotou depois aparece lento aqui e rápido lá.',
        `Tempo útil considera ${descreverHorarioUtil(o.diretrizes.horarioUtil)}; fora dessa janela o relógio não corre.`,
        'Leads DESCARTADOS não entram na amostra de propósito (o lead já foi para outro corretor). Eles contam apenas como número no panorama.',
        ...(parcialAgenda ? [
          `ATENÇÃO: o carimbo de mudança de etapa só existe desde ${ymdStr(o.historicoEtapasDesdeMs as number)}. Meets e visitas marcados/feitos ANTES dessa data não foram registrados — o número baixo no começo do período significa ausência de histórico, NÃO ausência de trabalho.`,
        ] : []),
      ],
      historico_etapas_desde: o.historicoEtapasDesdeMs ? ymdStr(o.historicoEtapasDesdeMs) : null,
      agenda_parcial_no_periodo: parcialAgenda,
    },
    diretrizes: {
      cadencia: o.diretrizes.cadencia,
      prazos: o.diretrizes.prazos,
      horario_util: { ...o.diretrizes.horarioUtil, descricao: descreverHorarioUtil(o.diretrizes.horarioUtil) },
      criterios_descarte_valido: o.diretrizes.criteriosDescarteValido,
      pesos_avaliacao: o.diretrizes.pesosAvaliacao,
      tom_do_relatorio: o.diretrizes.tomDoRelatorio,
    },
    prompts: o.diretrizes.prompts,
    panorama: o.panorama,
    historico: o.historico,
    amostra,
  };
}
