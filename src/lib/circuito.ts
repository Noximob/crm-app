/**
 * Circuito do lead — o funil guiado da Nox.
 *
 * Etapas do quadro: Entrada → Em Contato → Meet → Visita → Negociação → Fechamento.
 * A etapa é o ESTÁGIO MÁXIMO que o cliente alcançou — ela só anda pra frente
 * (catraca). A próxima ação (ligar, whats, follow-up…) é TAREFA, não etapa:
 * um cliente em Negociação com follow-up marcado continua em Negociação.
 * "Follow-up" deixou de ser etapa — é tipo de tarefa, em qualquer estágio.
 *
 * Entrada = ainda não conseguiu falar (tentativas moram aqui).
 * Em Contato = o cliente atendeu/respondeu — conversa de verdade aconteceu.
 * Fechamento = venda concluída (fim de linha feliz, visível no funil).
 * Descartado = área do ADMIN (bolsa de redistribuição), fora da visão do corretor.
 *
 * Este módulo é a fonte única de: nomes de etapa, a catraca (etapaAposAcao),
 * mapeamento de etapas legadas, motivos de descarte e as cadências do admin.
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------
export const ETAPA_ENTRADA = 'Entrada';
export const ETAPA_EM_CONTATO = 'Em Contato';
export const ETAPA_MEET_AGENDADO = 'Meet Agendado';
export const ETAPA_MEET_FEITO = 'Meet Feito';
export const ETAPA_VISITA_AGENDADA = 'Visita Agendada';
export const ETAPA_VISITA_FEITA = 'Visita Feita';
export const ETAPA_NEGOCIACAO = 'Negociação';
export const ETAPA_BOLSAO = 'Bolsão';
export const ETAPA_FECHADO = 'Fechamento';
export const ETAPA_DESCARTADO = 'Descartado';

/**
 * Etapas do quadro (kanban / funil pessoal) — na ordem do circuito.
 * Meet e Visita são divididos em AGENDADO (marcou) → FEITO (aconteceu): o
 * sistema move sozinho quando o corretor responde "aconteceu ✓" no pop-up.
 * Cada casa é o estágio MÁXIMO alcançado; a catraca (etapaAposAcao) garante
 * que criar um follow-up nunca rebaixa o cliente de volta.
 * Fechamento é a última casa: venda concluída fica visível no fim do funil.
 * Bolsão NÃO é etapa de funil: estacionados e descartados moram na
 * bolsa do ADMIN (redistribuição), fora da visão do corretor.
 */
export const ETAPAS_CIRCUITO = [
  ETAPA_ENTRADA,
  ETAPA_EM_CONTATO,
  ETAPA_MEET_AGENDADO,
  ETAPA_MEET_FEITO,
  ETAPA_VISITA_AGENDADA,
  ETAPA_VISITA_FEITA,
  ETAPA_NEGOCIACAO,
  ETAPA_FECHADO,
] as const;

/** Posição da etapa no circuito (-1 se não for etapa do quadro). */
export const etapaIndex = (etapa: string): number =>
  (ETAPAS_CIRCUITO as readonly string[]).indexOf(etapa);

/**
 * A CATRACA do circuito: dado o estágio atual (já normalizado) e o alvo que a
 * ação pediu, devolve a etapa final. Regras:
 *  - Descartar é sempre explícito (alvo Descartado passa direto);
 *  - Reativar um descartado aplica o alvo direto (recomeço);
 *  - No quadro, a etapa NUNCA anda pra trás: agendar um follow-up com um
 *    cliente que já chegou em Negociação o mantém em Negociação.
 */
export function etapaAposAcao(atualNormalizada: string, alvo: string): string {
  if (alvo === ETAPA_DESCARTADO) return alvo;
  if (atualNormalizada === ETAPA_DESCARTADO) return alvo;
  const ia = etapaIndex(atualNormalizada);
  const ib = etapaIndex(alvo);
  if (ib < 0) return atualNormalizada;
  return ib > ia ? alvo : atualNormalizada;
}

/** Estados fora da cobrança do circuito (sem pergunta pendente / fora da carteira ativa). */
export const ETAPAS_TERMINAIS = [ETAPA_FECHADO, ETAPA_DESCARTADO] as const;

/**
 * Etapas que ficam SÓ com o admin (bolsa de redistribuição) = DESCARTADO.
 * "Bolsão" deixou de ser estado de lead: estacionados/interesse futuro voltam
 * pro funil como Follow-up (a cobrança sai das tarefas de cada cliente).
 */
export const ETAPAS_DO_ADMIN = [ETAPA_DESCARTADO] as const;

/** Todas as etapas válidas (quadro + descartado). */
export const ETAPAS_TODAS = [...ETAPAS_CIRCUITO, ETAPA_DESCARTADO] as string[];

const setTodas = new Set<string>(ETAPAS_TODAS);

/** Remove acentos e baixa a caixa para comparação tolerante. */
const norm = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Converte qualquer etapa (legada ou atual) para uma etapa do circuito.
 * Cobre as 11 etapas padrão antigas, o extinto "Follow-up" (etapa até jul/2026)
 * e nomes customizados prováveis.
 * Etapa já válida passa direto; desconhecida cai em Entrada.
 */
export function mapEtapaCircuito(etapa: string | undefined | null): string {
  if (!etapa) return ETAPA_ENTRADA;
  if (setTodas.has(etapa)) return etapa;
  const e = norm(etapa);

  // Ordem importa: "Pré Qualificação" contém "qualifica" → checar antes.
  if (e.includes('descart')) return ETAPA_DESCARTADO;
  // 'fechad' cobre o legado 'Fechado' (etapa antiga gravada nos leads) e variações
  if (e.includes('fechad') || e.includes('pos venda') || e.includes('fideliza') || e.includes('vendido') || e.includes('ganho')) return ETAPA_FECHADO;
  if (e.includes('negocia') || e.includes('proposta') || e.includes('contrato')) return ETAPA_NEGOCIACAO;
  // Visita/Meet: "feita/realizada/aconteceu" → FEITO; senão AGENDADO (legado 'Visita'/'Meet' cai em agendado)
  if (e.includes('visita')) return (e.includes('feit') || e.includes('realizad') || e.includes('aconteceu')) ? ETAPA_VISITA_FEITA : ETAPA_VISITA_AGENDADA;
  if (e.includes('meet') || e.includes('reuni') || e.includes('ligacao agendada') || e.includes('atendimento agendado')) return (e.includes('feit') || e.includes('realizad') || e.includes('aconteceu')) ? ETAPA_MEET_FEITO : ETAPA_MEET_AGENDADO;
  // Estacionados de antigamente (Interesse Futuro, Carteira, Geladeira, Bolsão…)
  // e o extinto Follow-up viram EM CONTATO: são clientes com quem já se falou —
  // a régua de tarefas de cada um (atrasada / sem tarefa) decide a cobrança.
  if (e.includes('carteira') || e.includes('geladeira') || e.includes('interesse futuro') || e.includes('troca') || e.includes('bolsao')) return ETAPA_EM_CONTATO;
  if (e.includes('pre qualifica') || e.includes('topo') || e.includes('entrada')) return ETAPA_ENTRADA;
  if (e.includes('qualifica') || e.includes('apresenta') || e.includes('follow') || e.includes('oferta') || e.includes('contato')) return ETAPA_EM_CONTATO;
  return ETAPA_ENTRADA;
}

// ---------------------------------------------------------------------------
// Descarte
// ---------------------------------------------------------------------------
export const MOTIVOS_DESCARTE = [
  'Não responde',
  'Não quer mais',
  'Comprou com outro',
  'Fora do perfil',
  'Adiou a compra',
  'Outro',
] as const;

/** Opções do pop-up de requalificação ("o que não encaixou?"). */
export const REQUALIFICA_OPCOES = [
  'Preço alto',
  'Região errada',
  'Tipo errado',
  'Prazo de entrega',
  'Outro',
] as const;

// ---------------------------------------------------------------------------
// Tipos de tarefa que o circuito cria
// ---------------------------------------------------------------------------
export const TIPO_TAREFA_MEET = 'Meet';
export const TIPO_TAREFA_VISITA = 'Visita';
export const TIPO_TAREFA_FOLLOWUP = 'Follow-up';
export const TIPO_TAREFA_PRODUTO = 'Produto';

/** Todos os tipos de tarefa aceitos hoje (antigos + circuito). */
export const TIPOS_TAREFA = ['Ligação', 'WhatsApp', 'Visita', 'Meet', 'Follow-up', 'Produto', 'Outros'] as const;

/** Tipos de tarefa que representam "contato com o cliente" (para o fluxo do follow-up). */
export const TIPOS_CONTATO = ['Follow-up', 'Ligação', 'WhatsApp'] as const;

/** Paleta do funil por posição (mesma dos kanban/home/relatórios). */
export const CORES_CIRCUITO = ['#FFE9A6', '#E8C547', '#D4A017', '#F59E0B', '#FB923C', '#FF7A45', '#FB5E7E', '#34D399'] as const;

// ---------------------------------------------------------------------------
// Cadências (temporizadores configuráveis pelo admin)
// ---------------------------------------------------------------------------
export interface CadenciasFunil {
  /** Horas até o próximo follow-up sugerido quando o cliente NÃO atende. */
  naoAtendeuHoras: number;
  /** Horas após o horário do meet para perguntar "aconteceu?". */
  perguntarMeetHoras: number;
  /** Horas após o horário da visita para perguntar "aconteceu?". */
  perguntarVisitaHoras: number;
  /** Dias parado em Negociação até o alerta "dá um gás". */
  negociacaoAlertaDias: number;
  /** Tentativas de contato sem resposta até sugerir descarte/bolsão. */
  tentativasAteDescarte: number;
}

export const CADENCIAS_PADRAO: CadenciasFunil = {
  naoAtendeuHoras: 24,
  perguntarMeetHoras: 1,
  perguntarVisitaHoras: 1,
  negociacaoAlertaDias: 5,
  tentativasAteDescarte: 5,
};

const clampNum = (v: any, min: number, max: number, fallback: number) => {
  const n = Number(v);
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

/** Sanitiza um objeto vindo do Firestore para o shape completo de cadências. */
export function normalizarCadencias(raw: any): CadenciasFunil {
  const r = raw || {};
  return {
    naoAtendeuHoras: clampNum(r.naoAtendeuHoras, 1, 240, CADENCIAS_PADRAO.naoAtendeuHoras),
    perguntarMeetHoras: clampNum(r.perguntarMeetHoras, 0, 72, CADENCIAS_PADRAO.perguntarMeetHoras),
    perguntarVisitaHoras: clampNum(r.perguntarVisitaHoras, 0, 72, CADENCIAS_PADRAO.perguntarVisitaHoras),
    negociacaoAlertaDias: clampNum(r.negociacaoAlertaDias, 1, 90, CADENCIAS_PADRAO.negociacaoAlertaDias),
    tentativasAteDescarte: clampNum(r.tentativasAteDescarte, 2, 30, CADENCIAS_PADRAO.tentativasAteDescarte),
  };
}

/**
 * Carrega as cadências da imobiliária (doc configFunilVendas/{id}, campo `cadencias`).
 * Sempre resolve — sem doc ou com erro, devolve o padrão.
 */
export async function carregarCadencias(imobiliariaId: string | undefined): Promise<CadenciasFunil> {
  if (!imobiliariaId || imobiliariaId === 'espelho-demo') return CADENCIAS_PADRAO;
  try {
    const snap = await getDoc(doc(db, 'configFunilVendas', imobiliariaId));
    return normalizarCadencias(snap.exists() ? (snap.data() as any).cadencias : null);
  } catch {
    return CADENCIAS_PADRAO;
  }
}

/** Salva as cadências (merge — não mexe em outros campos do doc). */
export async function salvarCadencias(imobiliariaId: string, cadencias: CadenciasFunil): Promise<void> {
  await setDoc(
    doc(db, 'configFunilVendas', imobiliariaId),
    { cadencias: normalizarCadencias(cadencias), cadenciasAtualizadaEm: serverTimestamp() },
    { merge: true }
  );
}

