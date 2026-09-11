/**
 * O FUNIL DE VENDAS — as 6 fases que a casa enxerga, por cima do circuito.
 *
 * O CIRCUITO (src/lib/circuito.ts) é o motor: 8 casas fixas, catraca, pop-ups.
 * Ele separa "Meet Agendado" de "Visita Agendada" e "Meet Feito" de "Visita
 * Feita" porque os relatórios e a auditoria precisam dessa granularidade
 * (quantos meets feitos × quantas visitas feitas). Isso não muda.
 *
 * O FUNIL é o que o gestor lê. Ele tem 6 fases, e cada fase agrupa uma ou
 * mais casas do circuito:
 *
 *   Entrada ─── leads acionados ───────── 87%   ← Entrada
 *   Em Contato ─ atendimentos reais ───── 8%    ← Em Contato
 *   Meets/visitas agendados ──────────── 90%    ← Meet Agendado · Meet Feito · Visita Agendada
 *   Visitas feitas ───────────────────── 50%    ← Visita Feita
 *   Negociações/propostas ────────────── 35%    ← Negociação
 *   Fechamentos ──────────────────────── 30%    ← Fechamento
 *
 * O percentual é a CONVERSÃO ESPERADA pra chegar naquela fase, vinda da
 * anterior (na Entrada, "acionado" = teve ao menos uma tentativa de contato).
 * É a régua da casa; o admin muda quando quiser.
 *
 * "Meet Feito" cai em "agendados", não em "visitas feitas": no funil da casa
 * o marco que vale é a VISITA acontecer. Um meet que virou visita agendada
 * continua na mesma fase até a visita acontecer — a catraca do circuito não
 * é ferida, e o meet feito continua contado separado nos relatórios.
 *
 * Este módulo é PURO (sem Firebase) de propósito: é conta que decide o que a
 * casa cobra de cada corretor, e conta se testa. As etapas do circuito estão
 * como literais aqui pelo mesmo motivo — o teste confere que batem com
 * src/lib/constants.ts, então não descolam.
 */

// ═══════════════════════════════════════════════════════════════════════════
// As 6 fases
// ═══════════════════════════════════════════════════════════════════════════

export type FaseChave = 'entrada' | 'contato' | 'agendado' | 'visita_feita' | 'negociacao' | 'fechamento';

export interface FaseFunil {
  chave: FaseChave;
  /** o nome que aparece em toda tela */
  rotulo: string;
  /** versão curta pra coluna estreita / TV */
  curto: string;
  /** o que significa estar aqui */
  descricao: string;
  /** as casas do circuito que caem nesta fase */
  etapas: readonly string[];
  /** a cor da fase, na paleta do funil */
  cor: string;
}

export const FASES: readonly FaseFunil[] = [
  { chave: 'entrada', rotulo: 'Entrada', curto: 'Entrada', descricao: 'lead novo — leads acionados', etapas: ['Entrada'], cor: '#FFE9A6' },
  { chave: 'contato', rotulo: 'Em Contato', curto: 'Em Contato', descricao: 'atendimentos reais — o cliente respondeu', etapas: ['Em Contato'], cor: '#E8C547' },
  { chave: 'agendado', rotulo: 'Meets/visitas agendados', curto: 'Agendados', descricao: 'meet ou visita marcados', etapas: ['Meet Agendado', 'Meet Feito', 'Visita Agendada'], cor: '#F59E0B' },
  { chave: 'visita_feita', rotulo: 'Visitas feitas', curto: 'Visitas feitas', descricao: 'o cliente viu o imóvel', etapas: ['Visita Feita'], cor: '#FB923C' },
  { chave: 'negociacao', rotulo: 'Negociações/propostas', curto: 'Negociações', descricao: 'proposta na mesa', etapas: ['Negociação'], cor: '#FB5E7E' },
  { chave: 'fechamento', rotulo: 'Fechamentos', curto: 'Fechamentos', descricao: 'venda concluída 🏆', etapas: ['Fechamento'], cor: '#34D399' },
] as const;

/** Os rótulos, na ordem do funil — é isto que vira coluna, chip e filtro. */
export const FASES_ROTULOS: readonly string[] = FASES.map((f) => f.rotulo);

const faseDeEtapa = new Map<string, FaseFunil>();
for (const f of FASES) for (const e of f.etapas) faseDeEtapa.set(e, f);

/** A fase de uma etapa JÁ NORMALIZADA do circuito. Descartado (fora do funil) devolve null. */
export function faseDaEtapa(etapaNormalizada: string | undefined | null): FaseFunil | null {
  if (!etapaNormalizada) return null;
  return faseDeEtapa.get(etapaNormalizada) ?? null;
}

/** O rótulo da fase, ou a própria etapa quando não está no funil (Descartado). */
export const rotuloDaFase = (etapaNormalizada: string | undefined | null): string =>
  faseDaEtapa(etapaNormalizada)?.rotulo ?? (etapaNormalizada || '');

/** Posição da fase no funil (-1 fora dele). */
export const faseIndex = (chaveOuRotulo: string): number =>
  FASES.findIndex((f) => f.chave === chaveOuRotulo || f.rotulo === chaveOuRotulo);

/** Fase por rótulo (o que vem de um chip de filtro). */
export const faseDoRotulo = (rotulo: string): FaseFunil | null =>
  FASES.find((f) => f.rotulo === rotulo) ?? null;

// ═══════════════════════════════════════════════════════════════════════════
// A conversão esperada — a régua da casa, configurável
// ═══════════════════════════════════════════════════════════════════════════

export type ConversaoEsperada = Record<FaseChave, number>;

/** Os números que o gestor trouxe. % de quem chega na fase, vindo da anterior. */
export const CONVERSAO_PADRAO: ConversaoEsperada = {
  entrada: 87,
  contato: 8,
  agendado: 90,
  visita_feita: 50,
  negociacao: 35,
  fechamento: 30,
};

const pct = (v: unknown, fallback: number): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
};

/** Sanitiza o que vier do Firestore pro shape completo — campo faltando cai no padrão. */
export function normalizarConversao(raw: unknown): ConversaoEsperada {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    entrada: pct(r.entrada, CONVERSAO_PADRAO.entrada),
    contato: pct(r.contato, CONVERSAO_PADRAO.contato),
    agendado: pct(r.agendado, CONVERSAO_PADRAO.agendado),
    visita_feita: pct(r.visita_feita, CONVERSAO_PADRAO.visita_feita),
    negociacao: pct(r.negociacao, CONVERSAO_PADRAO.negociacao),
    fechamento: pct(r.fechamento, CONVERSAO_PADRAO.fechamento),
  };
}

/**
 * Quanto de 100 leads a régua espera ver em cada fase — o produto das
 * conversões até ali. É o número que faz a régua caber na cabeça:
 * 100 → 87 acionados → 7 em contato → 6 agendados → 3 visitas → 1 proposta → 0,3 venda.
 */
export function esperadoAcumulado(conv: ConversaoEsperada, base = 100): Record<FaseChave, number> {
  let acc = base;
  const out = {} as Record<FaseChave, number>;
  for (const f of FASES) {
    acc = acc * (conv[f.chave] / 100);
    out[f.chave] = Math.round(acc * 10) / 10;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// O funil realizado — o que de fato aconteceu com os leads
// ═══════════════════════════════════════════════════════════════════════════

export interface LeadFunil {
  etapa?: string;
  etapasHist?: { para?: string }[];
  circuito?: { tentativas?: number; contatosFeitos?: number; primeiroContatoEm?: unknown };
}

export interface FaseRealizada {
  chave: FaseChave;
  rotulo: string;
  /** leads que CHEGARAM até aqui (fase máxima alcançada ≥ esta) */
  chegaram: number;
  /** leads que estão aqui AGORA */
  estao: number;
  /** % de chegaram sobre os que chegaram na fase anterior (Entrada: acionados sobre o total) */
  conversao: number | null;
  esperado: number;
}

/**
 * Conta o funil de um conjunto de leads, com a MESMA régua da conversão
 * esperada: "chegaram" usa a fase máxima que o lead já alcançou (histórico
 * ∪ etapa atual), senão um descarte na negociação apagaria a visita que ele
 * fez. Na Entrada, "chegou" = foi acionado (teve tentativa ou contato).
 *
 * @param normalizar  converte etapa (legada ou atual) pra casa do circuito —
 *   vem de fora pra este módulo continuar puro.
 */
export function funilRealizado(
  leads: LeadFunil[],
  normalizar: (etapa: string | undefined) => string,
  esperada: ConversaoEsperada = CONVERSAO_PADRAO,
): { total: number; fases: FaseRealizada[] } {
  const total = leads.length;
  const chegaram = FASES.map(() => 0);
  const estao = FASES.map(() => 0);

  for (const l of leads) {
    const atual = normalizar(l.etapa);
    const idxAtual = faseIndex(faseDaEtapa(atual)?.chave || '');
    if (idxAtual >= 0) estao[idxAtual]++;

    let max = idxAtual;
    for (const h of l.etapasHist || []) {
      const i = faseIndex(faseDaEtapa(normalizar(h.para))?.chave || '');
      if (i > max) max = i;
    }
    // acionado: alguém tentou falar com ele (ou já falou) — é o "chegou" da Entrada
    const acionado = (l.circuito?.tentativas || 0) > 0
      || (l.circuito?.contatosFeitos || 0) > 0
      || !!l.circuito?.primeiroContatoEm
      || max >= 1;
    if (acionado) chegaram[0]++;
    for (let i = 1; i <= max; i++) chegaram[i]++;
  }

  const fases: FaseRealizada[] = FASES.map((f, i) => {
    const base = i === 0 ? total : chegaram[i - 1];
    return {
      chave: f.chave,
      rotulo: f.rotulo,
      chegaram: chegaram[i],
      estao: estao[i],
      conversao: base > 0 ? Math.round((chegaram[i] / base) * 100) : null,
      esperado: esperada[f.chave],
    };
  });
  return { total, fases };
}

// ═══════════════════════════════════════════════════════════════════════════
// AS DUAS CARTEIRAS — o que é da casa e o que é do corretor
// ═══════════════════════════════════════════════════════════════════════════
//
// A imobiliária compra lead (propaganda), monta lista fria (ligação ativa) e
// distribui. Isso é carteira da CASA, cobrada pelo circuito: pop-up na hora,
// tarefa atrasada pesa na métrica.
//
// O corretor também traz gente própria: networking, indicação, ação de rua,
// o cliente que apareceu no plantão. Isso é carteira DELE (a "rede"): o CRM
// é o mesmo, exatamente igual — mas agendar tarefa é opcional e atraso ali
// não entra na métrica da casa.
//
// A carteira mora num campo do lead. Lead antigo sem o campo é classificado
// pela origem que ele já tinha — ninguém precisa migrar nada pra funcionar.

export const CARTEIRA_IMOBILIARIA = 'imobiliaria';
export const CARTEIRA_REDE = 'rede';
export type Carteira = typeof CARTEIRA_IMOBILIARIA | typeof CARTEIRA_REDE;

/** Origens que o CORRETOR cadastra na carteira dele. */
export const ORIGENS_REDE = ['Networking', 'Indicação', 'Ação de rua', 'Plantão', 'Cliente antigo', 'Outros'] as const;
/**
 * Origens da CASA. 'Ligação' é o valor que a Ligação Ativa grava desde sempre
 * — o rótulo muda pra "Ligação ativa", o valor não (senão o filtro perde o
 * histórico).
 */
export const ORIGENS_IMOBILIARIA = ['Propaganda', 'Ligação', 'Disparo de msg', 'Site', 'Portal', 'Outros'] as const;

/** Como cada origem aparece na tela. */
export const ROTULO_ORIGEM: Record<string, string> = {
  'Ligação': 'Ligação ativa',
  'Portal': 'Portal (OLX / Zap)',
};
export const rotuloOrigem = (o: string): string => ROTULO_ORIGEM[o] ?? o;

/** Todas as origens conhecidas, pra filtro — sem repetir "Outros". */
export const ORIGENS_TODAS: readonly string[] = Array.from(new Set([...ORIGENS_REDE, ...ORIGENS_IMOBILIARIA]));

const setRede = new Set<string>(ORIGENS_REDE.filter((o) => o !== 'Outros'));

/** A origem é coisa do corretor (networking, indicação, rua, plantão)? */
export const origemEhDaRede = (origemTipo: string | undefined | null): boolean =>
  !!origemTipo && setRede.has(origemTipo.trim());

export interface LeadCarteira {
  carteira?: unknown;
  origemTipo?: unknown;
  guardado?: unknown;
}

/**
 * De qual carteira o lead é. Campo gravado manda; sem campo, decide a
 * origem: Networking/Indicação/Ação de rua/Plantão/Cliente antigo → rede;
 * o resto (propaganda, ligação ativa, disparo, legado sem origem) → casa.
 */
export function carteiraDoLead(l: LeadCarteira): Carteira {
  if (l.carteira === CARTEIRA_REDE) return CARTEIRA_REDE;
  if (l.carteira === CARTEIRA_IMOBILIARIA) return CARTEIRA_IMOBILIARIA;
  const tipo = typeof l.origemTipo === 'string' ? l.origemTipo : '';
  return origemEhDaRede(tipo) ? CARTEIRA_REDE : CARTEIRA_IMOBILIARIA;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERESSE FUTURO — a gaveta do corretor (até 50)
// ═══════════════════════════════════════════════════════════════════════════
//
// O corretor escolhe até 50 leads pra GUARDAR: saem do CRM da casa e ficam
// numa coluna própria no CRM da rede. É decisão explícita, com teto visível
// — não é derivado de data de tarefa (isso confundia: o lead "sumia" e
// "voltava" sozinho conforme a agenda).

export const CAP_INTERESSE_FUTURO = 50;

/** O lead está guardado na gaveta de Interesse futuro? */
export const leadGuardado = (l: { guardado?: unknown }): boolean => l.guardado === true;

/**
 * As tarefas deste lead contam na disciplina da casa (tarefa atrasada,
 * "ação agora", fila do vigia)? Carteira da rede e lead guardado NÃO contam:
 * ali agendar é opcional e atraso não é dívida com a casa.
 */
export function contaNaDisciplina(l: LeadCarteira & { guardado?: unknown }): boolean {
  return carteiraDoLead(l) === CARTEIRA_IMOBILIARIA && !leadGuardado(l);
}

/** Quantas vagas ainda cabem na gaveta. */
export const vagasNaGaveta = (guardados: number): number => Math.max(0, CAP_INTERESSE_FUTURO - guardados);
