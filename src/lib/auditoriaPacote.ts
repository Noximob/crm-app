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
/**
 * Diz se o telefone tem cara de contato real. Sem isso, a amostra sorteia
 * lead com número de teste (99 99999-9953) ou malformado, o analista gasta
 * a tentativa e volta "não localizado" — foi 30% de uma rodada real.
 */
export function telefoneUtilizavel(bruto: string | undefined): { ok: boolean; motivo: string } {
  const d = String(bruto || '').replace(/\D/g, '');
  if (!d) return { ok: false, motivo: 'sem telefone' };
  const n = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
  if (n.length < 10) return { ok: false, motivo: `curto demais (${n.length} dígitos)` };
  if (n.length > 11) return { ok: false, motivo: `malformado (${d.length} dígitos)` };
  const ddd = Number(n.slice(0, 2));
  if (ddd < 11 || ddd > 99) return { ok: false, motivo: `DDD inválido (${n.slice(0, 2)})` };
  const corpo = n.slice(2);
  if (/^(\d)\1+$/.test(corpo)) return { ok: false, motivo: 'número de teste (dígito repetido)' };
  if (/^9{4,}/.test(corpo)) return { ok: false, motivo: 'número de teste (9999…)' };
  // celular de 9 dígitos SEMPRE começa com 9; fixo (8) começa em 2-5.
  // Sem isso, "5547656559595" passa como se fosse número bom e a análise
  // gasta a tentativa pra descobrir que não existe.
  if (corpo.length === 9 && !corpo.startsWith('9')) return { ok: false, motivo: 'malformado (9 dígitos sem começar com 9)' };
  if (corpo.length === 8 && !/^[2-9]/.test(corpo)) return { ok: false, motivo: 'malformado (prefixo inválido)' };
  return { ok: true, motivo: '' };
}

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

/**
 * O PAPEL DE CADA LEAD NA AMOSTRA
 *
 * Ler as 75 conversas de um corretor toda semana é caro demais. Mas sortear
 * 20 diferentes a cada rodada tem um custo escondido pior: nada fica
 * comparável. O percentual sobe ou desce porque os leads são outros, não
 * porque o corretor mudou — e um número que se move sozinho não gere
 * ninguém.
 *
 * A amostra por isso não é um sorteio só. São quatro papéis:
 *
 *   obrigatorio — o dinheiro na mesa. Negociação, Fechamento e quem teve
 *     visita ou reunião nos últimos 14 dias. Não se sorteia o que a casa
 *     precisa ver: esses entram sempre, todos.
 *   painel — os mesmos clientes toda rodada, enquanto vivos. É o único
 *     jeito honesto de dizer "melhorou": mesma pessoa, mesma conversa,
 *     semana seguinte.
 *   rotativo — quem nunca foi lido, com prioridade para o mais antigo sem
 *     auditoria. É o que dá cobertura da carteira ao longo do mês sem
 *     pagar por ela toda semana.
 *   controle — parados e frios, para a amostra não olhar só para o bonito.
 */
export type FaixaSorteio = 'baseline' | 'novo' | 'movimento' | 'rodizio'
  // faixas de desenhos anteriores — rodadas já geradas ainda as exibem
  | 'obrigatorio' | 'painel' | 'rotativo' | 'controle'
  | 'avancado' | 'parado_15d' | 'entrada_recente' | 'livre';

export const ROTULO_FAIXA: Record<FaixaSorteio, string> = {
  baseline: 'Carteira completa',
  novo: 'Entrou no período',
  movimento: 'Teve movimento',
  rodizio: 'Rodízio de antigos',
  // faixas de desenhos anteriores
  obrigatorio: 'Dinheiro na mesa',
  painel: 'Painel fixo',
  rotativo: 'Nunca auditado',
  controle: 'Parado / frio',
  avancado: 'Etapa avançada',
  parado_15d: 'Parado +15 dias',
  entrada_recente: 'Entrada recente',
  livre: 'Aleatório livre',
};

/**
 * Quanto da amostra cabe a cada papel.
 *
 * Os tetos existem por causa de uma simulação: sem eles, a carteira do
 * Breno enchia a amostra só de obrigatórios (11 de 20), sobrava UM lugar
 * para gente nova e a cobertura da carteira travava em 40% depois de cinco
 * semanas. Amostra que quase não roda vira o mesmo relatório toda semana.
 */
export const COMPOSICAO = { obrigatorio: 0.35, painel: 0.15, controle: 0.10 } as const;

/**
 * Teto de parados em etapa avançada por rodada. Poucos de propósito: são
 * a exceção que existe para pegar o "atendeu e não registrou", não uma
 * varredura de carteira parada — essa o painel já dá em número.
 */
export const TETO_PARADOS_AVANCADOS = 8;

/** Dias desde a visita/reunião em que o lead ainda é dinheiro quente. */
const JANELA_POS_EVENTO_DIAS = 14;

/**
 * O lead está com dinheiro na mesa? Candidato a entrar sem sorteio.
 *
 * Só ser valioso não basta: se ele já foi lido e NADA aconteceu desde
 * então, reler é gastar a vaga com uma conversa que não mudou. Por isso
 * "obrigatório" exige valor E movimento.
 */
export function ehObrigatorio(
  l: LeadAud, ativ: Map<string, AtividadeAud> | undefined, agora: number,
  ultimaLeituraMs = 0,
): boolean {
  const et = mapEtapaCircuito(l.etapa);
  const at = ativ?.get(l.id);
  const ultimaInteracao = at?.interacoes.length ? at.interacoes[at.interacoes.length - 1].ms : 0;

  // já lido e sem nada novo desde então: não há o que reler
  if (ultimaLeituraMs > 0 && ultimaInteracao > 0 && ultimaInteracao <= ultimaLeituraMs) return false;

  if (et === 'Negociação' || et === ETAPA_FECHADO) return true;

  if (et === ETAPA_MEET_FEITO || et === ETAPA_VISITA_FEITA) {
    // só enquanto o pós-evento está quente; depois disso ele já é histórico
    let quando = 0;
    for (const h of (l.etapasHist || [])) {
      const alvo = mapEtapaCircuito(String(h.para || ''));
      if (alvo === ETAPA_MEET_FEITO || alvo === ETAPA_VISITA_FEITA) {
        const ms = msOf(h.em);
        if (ms > quando) quando = ms;
      }
    }
    if (!quando) quando = ultimaInteracao;
    return !!quando && (agora - quando) / DIA <= JANELA_POS_EVENTO_DIAS;
  }
  return false;
}

/** Ordena os obrigatórios por urgência, para o teto cortar os menos urgentes. */
function urgenciaObrigatorio(l: LeadAud, ativ: Map<string, AtividadeAud> | undefined, agora: number): number {
  const et = mapEtapaCircuito(l.etapa);
  const at = ativ?.get(l.id);
  const ultimo = at?.interacoes.length ? at.interacoes[at.interacoes.length - 1].ms : 0;
  const diasParado = ultimo ? (agora - ultimo) / DIA : 999;
  // pós-visita primeiro (janela curta), depois quem está parado há mais tempo
  const pesoEtapa = et === ETAPA_VISITA_FEITA ? 300 : et === ETAPA_MEET_FEITO ? 250
    : et === 'Negociação' ? 200 : 150;
  return pesoEtapa + Math.min(diasParado, 120);
}

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

/**
 * Quem pode ser sorteado: o lead precisava estar NA MÃO do corretor durante o
 * período auditado. Nasceu depois do fim? não era dele ainda. Foi descartado
 * antes do início? já tinha saído. Note que lead PARADO continua elegível —
 * ele é o achado mais importante da auditoria, não uma exclusão.
 */
export function elegivelNoPeriodo(l: LeadAud, iniMs: number, fimMs: number): boolean {
  const nascimento = msOf(l.createdAt);
  if (nascimento > 0 && nascimento >= fimMs) return false;
  const descarte = msOf(l.descartadoEm);
  if (descarte > 0 && descarte < iniMs) return false;
  return true;
}

export interface HistoricoAmostra {
  /** ids já lidos em qualquer rodada anterior — o rotativo os evita */
  jaAuditados: Set<string>;
  /** ids do painel fixo, na ordem em que foram escolhidos */
  painel: string[];
  /** quando cada lead foi lido pela última vez — decide se vale reler */
  ultimaLeitura?: Map<string, number>;
}

export interface CoberturaAcumulada {
  carteira_ativa: number;
  ja_auditados: number;
  nunca_auditados: number;
  pct: number;
  novos_nesta_rodada: number;
  /** quantas rodadas, no ritmo atual, para cobrir a carteira inteira */
  rodadas_para_cobrir_tudo: number | null;
}

/**
 * Quanto da carteira já passou pela auditoria somando todas as rodadas.
 *
 * É o número que responde à objeção certa do corretor: "vocês olharam só 20
 * dos meus 75". Em quatro semanas de rodízio a resposta passa a ser "olhamos
 * 61 dos 75", e aí o retrato deixa de ser recorte e vira cobertura.
 */
export function computarCoberturaAcumulada(
  leads: LeadAud[], hist: HistoricoAmostra, amostraAtual: string[],
): CoberturaAcumulada {
  const ativos = leads.filter((l) => {
    const et = mapEtapaCircuito(l.etapa);
    return et !== ETAPA_DESCARTADO && et !== ETAPA_FECHADO;
  });
  const ids = new Set(ativos.map((l) => l.id));
  const lidos = new Set<string>();
  hist.jaAuditados.forEach((id) => { if (ids.has(id)) lidos.add(id); });
  const novos = amostraAtual.filter((id) => ids.has(id) && !lidos.has(id));
  novos.forEach((id) => lidos.add(id));

  const total = ativos.length;
  const falta = Math.max(0, total - lidos.size);
  return {
    carteira_ativa: total,
    ja_auditados: lidos.size,
    nunca_auditados: falta,
    pct: total ? Math.round((lidos.size / total) * 100) : 0,
    novos_nesta_rodada: novos.length,
    rodadas_para_cobrir_tudo: novos.length > 0 ? Math.ceil(falta / novos.length) : null,
  };
}

/**
 * MODO DA AMOSTRA
 *
 *   baseline — lê a carteira INTEIRA, uma vez. Caro e demorado, mas é o
 *     único jeito de ter denominador de verdade: depois dele, "o CRM bate
 *     com a realidade em 29%" passa a ser sobre a carteira toda, e não
 *     sobre os 25 que a sorte escolheu.
 *   semanal — o delta. Todo lead NOVO (é onde nasce o 1º contato), todo
 *     lead que teve movimento desde a última leitura, e um rodízio de
 *     antigos parados para pegar o que apodrece em silêncio.
 *
 * Reler conversa que não teve mensagem nova desde a última auditoria é
 * gastar a vaga com uma história que não mudou. É isso que torna a rodada
 * semanal barata sem perder cobertura.
 */
export type ModoAmostra = 'baseline' | 'semanal';

export function sortearAmostra(
  leads: LeadAud[], ultimoToqueDe: (id: string) => number, agora = Date.now(),
  periodo?: { iniMs: number; fimMs: number },
  hist: HistoricoAmostra = { jaAuditados: new Set(), painel: [] },
  ativ?: Map<string, AtividadeAud>,
  modo: ModoAmostra = 'semanal',
  /** dias sem toque a partir dos quais o lead conta como parado */
  d_leadParadoDias = 7,
  /** quantos parados em etapa avançada entram, no máximo */
  tetoParados = TETO_PARADOS_AVANCADOS,
): ResultadoSorteio {
  const universo = (periodo ? leads.filter((l) => elegivelNoPeriodo(l, periodo.iniMs, periodo.fimMs)) : leads)
    .filter((l) => mapEtapaCircuito(l.etapa) !== ETAPA_DESCARTADO);

  const escolhidos: { lead: LeadAud; faixa: FaixaSorteio }[] = [];
  const incompletas: ResultadoSorteio['incompletas'] = [];
  const usados = new Set<string>();
  const pegar = (l: LeadAud, faixa: FaixaSorteio) => { usados.add(l.id); escolhidos.push({ lead: l, faixa }); };
  const livres = () => universo.filter((l) => !usados.has(l.id));

  // ---- BASELINE: a carteira inteira, sem sorteio nenhum
  if (modo === 'baseline') {
    universo.forEach((l) => pegar(l, 'baseline'));
    return { escolhidos, incompletas };
  }

  const lidoEm = (id: string) => hist.ultimaLeitura?.get(id) ?? 0;
  const nuncaLido = (id: string) => !hist.jaAuditados.has(id);

  // ---- 1) NOVOS DO PERÍODO — todos, sem exceção e sem teto.
  // É neles que o 1º contato acontece, e é a métrica mais importante da
  // velocidade. Deixar um de fora por causa de cota significa medir
  // atendimento de lead novo sem olhar o lead novo.
  const novos = universo.filter((l) => {
    const n = msOf(l.createdAt);
    return periodo ? (n >= periodo.iniMs && n < periodo.fimMs) : nuncaLido(l.id);
  });
  novos.forEach((l) => pegar(l, 'novo'));

  // ---- 2) TEVE MOVIMENTO desde a última leitura
  // Conversa nova ou mudança de etapa depois da última vez que foi lido.
  // Quem não mudou nada não entra: não há o que reler.
  const comMovimento = livres().filter((l) => {
    const desde = lidoEm(l.id);
    if (!desde) return false; // nunca lido cai no rodízio, não aqui
    const at = ativ?.get(l.id);
    const ultimaInteracao = at?.interacoes.length ? at.interacoes[at.interacoes.length - 1].ms : 0;
    if (ultimaInteracao > desde) return true;
    return (l.etapasHist || []).some((h) => msOf(h.em) > desde);
  }).sort((a, b) => urgenciaObrigatorio(b, ativ, agora) - urgenciaObrigatorio(a, ativ, agora));
  comMovimento.forEach((l) => pegar(l, 'movimento'));

  // ---- 3) PARADOS EM ETAPA AVANÇADA — o único parado que ainda vale ler
  //
  // Parado comum não entra: o CRM já sabe que está parado, e confirmar isso
  // no WhatsApp não acrescenta nada ao relatório.
  //
  // A exceção é quem parou LÁ NA FRENTE. Numa rodada real, Valdir e Leila
  // apareciam com 180 dias sem toque no CRM e tinham conversa de 16 e 17
  // dias — os dois em Fechamento, um com proposta de R$ 550 mil na mesa. O
  // corretor tinha atendido e não registrado, e como o movimento é
  // detectado pelo CRM, eles não entrariam por nenhum outro caminho.
  // Nesses casos "parado" é ou mentira do sistema ou dinheiro morrendo, e
  // as duas coisas precisam ser vistas.
  // agendado entra junto com feito: reunião ou visita marcada e parada é
  // encontro que ninguém confirmou, e falta de confirmação de véspera é a
  // causa nº 1 de no-show — some a unidade segurada e a manhã perdida.
  const avancado = new Set<string>([
    ETAPA_MEET_AGENDADO, ETAPA_MEET_FEITO,
    ETAPA_VISITA_AGENDADA, ETAPA_VISITA_FEITA,
    'Negociação', ETAPA_FECHADO,
  ]);
  const paradosNaFrente = livres()
    .filter((l) => avancado.has(mapEtapaCircuito(l.etapa)))
    .filter((l) => {
      const ref = ultimoToqueDe(l.id) || msOf(l.createdAt);
      return ref > 0 && (agora - ref) / DIA > d_leadParadoDias;
    })
    .sort((a, b) => (lidoEm(a.id) || 0) - (lidoEm(b.id) || 0));

  paradosNaFrente.slice(0, tetoParados).forEach((l) => pegar(l, 'rodizio'));

  return { escolhidos, incompletas };
}

// ---------------------------------------------------------------------------
// Disponibilidade de métrica — cada uma nasceu numa data
//
// O CRM foi ganhando instrumentação aos poucos: o carimbo de etapa começou
// num dia, o registro de 1º contato noutro, o rodízio noutro. Se o período
// pedido começa antes de a métrica existir, mostrar ZERO é mentira — parece
// que o corretor não fez, quando o sistema é que não media. Aqui a data de
// nascimento de cada família é DETECTADA no próprio dado, e o que não existe
// vira null com o motivo escrito no pacote.
// ---------------------------------------------------------------------------

export interface DisponibilidadeMetrica {
  metrica: string;
  rotulo: string;
  primeiro_registro: string | null;
  /** o período pedido começa antes de a métrica passar a ser coletada */
  parcial: boolean;
  /** nunca houve registro nenhum dessa família */
  vazia: boolean;
  motivo: string;
}

/** Famílias de métrica e o que as alimenta. */
const FAMILIAS: { chave: string; rotulo: string; campos: string[] }[] = [
  { chave: 'agenda', rotulo: 'Meets e visitas (marcados/feitos)', campos: ['meets_marcados', 'meets_feitos', 'visitas_marcadas', 'visitas_feitas'] },
  { chave: 'primeiro_contato', rotulo: 'Tempo até o 1º contato', campos: ['mediana_primeiro_contato_min_util', 'mediana_primeiro_contato_min_corrido', 'dentro_do_prazo_1o_contato', 'fora_do_prazo_1o_contato'] },
  { chave: 'timeline', rotulo: 'Toques e leads parados', campos: ['sem_toque_7d', 'sem_toque_7d_por_etapa', 'parados_com_retorno_agendado'] },
  { chave: 'tarefas', rotulo: 'Tarefas e atrasos', campos: ['tarefas_atrasadas_24h', 'tarefas_concluidas_atrasadas_24h', 'leads_sem_tarefa_futura'] },
  { chave: 'rodizio', rotulo: 'Rodízio de leads de anúncio', campos: ['rodizio'] },
];

const ymdOuNull = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : null);

export function detectarDisponibilidade(
  leads: LeadAud[], ativ: Map<string, AtividadeAud>, ads: AdsAud[], iniMs: number,
): DisponibilidadeMetrica[] {
  const min = (a: number | null, b: number) => (b > 0 && (a === null || b < a) ? b : a);
  let agenda: number | null = null, primeiro: number | null = null, timeline: number | null = null, tarefas: number | null = null;
  let rodizio: number | null = null;

  for (const l of leads) {
    for (const h of (l.etapasHist || [])) agenda = min(agenda, msOf(h.em));
    primeiro = min(primeiro, msOf(l.circuito?.primeiroContatoEm));
    const a = ativ.get(l.id);
    for (const i of (a?.interacoes || [])) timeline = min(timeline, i.ms);
    for (const t of (a?.tarefas || [])) tarefas = min(tarefas, t.dueMs);
  }
  if (ads.some((a) => typeof a.tempoAceiteSeg === 'number' || a.expirouDe)) rodizio = iniMs; // existe; sem data própria

  const achado: Record<string, number | null> = { agenda, primeiro_contato: primeiro, timeline, tarefas, rodizio };

  return FAMILIAS.map((f) => {
    const ms = achado[f.chave] ?? null;
    const vazia = ms === null;
    const parcial = !vazia && (ms as number) > iniMs;
    return {
      metrica: f.chave,
      rotulo: f.rotulo,
      primeiro_registro: ymdOuNull(ms),
      parcial, vazia,
      motivo: vazia
        ? `NÃO UTILIZADO POR FALTA DE MÉTRICA: não há nenhum registro dessa informação na base. O número não é zero — é inexistente, e não deve ser lido como falha do corretor.`
        : parcial
          ? `PARCIAL: essa informação só passou a ser registrada em ${ymdOuNull(ms)}, depois do início do período pedido. O que aconteceu antes não foi medido — número baixo aqui significa ausência de histórico, não ausência de trabalho.`
          : 'Disponível em todo o período.',
    };
  });
}

/** Zera (null) no panorama o que a base nunca mediu — mostrar 0 seria mentir. */
export function aplicarDisponibilidade(p: Panorama, disp: DisponibilidadeMetrica[]): Panorama {
  const out = { ...p } as Panorama & Record<string, unknown>;
  for (const d of disp) {
    if (!d.vazia) continue;
    const fam = FAMILIAS.find((f) => f.chave === d.metrica);
    for (const campo of (fam?.campos || [])) out[campo] = null;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Panorama
// ---------------------------------------------------------------------------

export interface Panorama {
  leads_recebidos: number;
  leads_novos_30d: number;
  leads_sem_primeiro_contato: number;
  /** entraram agora e ainda estão dentro do prazo — não são atraso */
  leads_novos_ainda_no_prazo: number;
  /** leads antigos cujo 1º contato foi carimbado dentro do período — mede
   *  adoção do CRM, não velocidade de atendimento (ficam FORA da mediana) */
  carimbos_retroativos: number;
  mediana_primeiro_contato_min_util: number | null;
  mediana_primeiro_contato_min_corrido: number | null;
  dentro_do_prazo_1o_contato: number;
  fora_do_prazo_1o_contato: number;
  distribuicao_funil: Record<string, number>;
  /** sem toque E sem retorno agendado — é este que se cobra */
  sem_toque_7d: number;
  sem_toque_7d_por_etapa: Record<string, number>;
  /** sem toque MAS com tarefa futura marcada: está esperando, não largado */
  parados_com_retorno_agendado: number;
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

// ---------------------------------------------------------------------------
// O QUE DÁ PARA COBRAR
//
// Medir é fácil; cobrar exige ter combinado antes. Tudo aqui nasce de uma
// régua que o gestor definiu na tela de Diretrizes — meta, prazo de etapa,
// critério de descarte, ficha obrigatória. Sem régua, o campo sai null e o
// relatório diz "não é meta", em vez de marcar vermelho contra nada.
// ---------------------------------------------------------------------------

export interface LinhaMeta {
  indicador: string;
  /**
   * null quando o CRM não registra aquilo — proposta enviada não é evento
   * no sistema. Zero diria "ele não fez nenhuma", que é diferente de "não
   * sabemos", e quem conta nesse caso é a leitura das conversas.
   */
  realizado: number | null;
  /** já ajustada ao tamanho do período — meta mensal em 7 dias vale 7/30 */
  meta: number | null;
  /** o que a casa combinou para o mês inteiro, sem ajuste */
  meta_mensal: number | null;
  pct: number | null;
  bateu: boolean | null;
  /**
   * false quando o período é curto demais para aquela meta fazer sentido.
   * Uma venda por mês vira "0,2 venda" numa semana, e cobrar 0,2 venda é o
   * tipo de número que faz o corretor rir do relatório inteiro. Nesses
   * casos o veredito fica em aberto e o texto explica o porquê.
   */
  avaliavel: boolean;
}

export interface LeadEstagnado {
  id: string; nome: string; etapa: string;
  dias_na_etapa: number; prazo_da_etapa: number; dias_sem_toque: number;
  /**
   * true quando não há carimbo de entrada nesta etapa e o tempo foi contado
   * do nascimento do lead. O CRM só carimba etapa desde julho: sem esta
   * marca, um lead de outubro apareceria como "359 dias em Em Contato"
   * quando o que se sabe é que ele existe há 359 dias.
   */
  estimado: boolean;
}

/**
 * A cadência da régua (6 contatos até o dia 10) estava definida e ninguém
 * media. O prompt pedia "cadência x/6" na tabela de leads e a análise tinha
 * de contar isso a olho, conversa por conversa — que é exatamente o tipo de
 * conta que a máquina faz melhor e sem cansar.
 */
export interface CadenciaLead {
  lead: string;
  dias_de_vida: number;
  toques_previstos: number;
  toques_registrados: number;
  cumpriu: boolean;
}

export function computarCadencia(
  leads: LeadAud[], ativ: Map<string, AtividadeAud>, d: DiretrizesAuditoria,
  iniMs: number, fimMs: number, agora = Date.now(),
): { leads: CadenciaLead[]; media_cumprimento_pct: number | null } {
  const passos = [...d.cadencia].sort((a, b) => a.dia - b.dia);
  if (!passos.length) return { leads: [], media_cumprimento_pct: null };

  const out: CadenciaLead[] = [];
  for (const l of leads) {
    const nascimento = msOf(l.createdAt);
    // só leads que nasceram no período: em lead antigo a cadência já passou
    // e o que se veria era o histórico, não o trabalho desta rodada
    if (!(nascimento >= iniMs && nascimento < fimMs)) continue;
    if (mapEtapaCircuito(l.etapa) === ETAPA_DESCARTADO) continue;

    const dias = Math.floor((Math.min(agora, fimMs) - nascimento) / DIA);
    // só cobra os passos cujo dia já chegou
    const previstos = passos.filter((p) => p.dia <= dias).length;
    if (!previstos) continue;

    const at = ativ.get(l.id);
    const registrados = (at?.interacoes || []).filter((i) => i.ms >= nascimento && i.ms <= fimMs).length;
    out.push({
      lead: String(l.nome || l.id.slice(0, 6)),
      dias_de_vida: dias,
      toques_previstos: previstos,
      toques_registrados: registrados,
      cumpriu: registrados >= previstos,
    });
  }
  out.sort((a, b) => (a.toques_registrados - a.toques_previstos) - (b.toques_registrados - b.toques_previstos));
  const cumpriram = out.filter((x) => x.cumpriu).length;
  return {
    leads: out.slice(0, 25),
    media_cumprimento_pct: out.length ? Math.round((cumpriram / out.length) * 100) : null,
  };
}

export interface Cobranca {
  dias_do_periodo: number;
  metas: LinhaMeta[];
  metas_definidas: boolean;
  leads_estagnados: LeadEstagnado[];
  estagnados_por_etapa: Record<string, number>;
  /**
   * Todos os motivos usados, com a régua ao lado. O sistema NÃO julga
   * semântica de texto livre — tentar isso marcava "Comprou com outro" como
   * suspeito e "já está no crm do toni" como válido, e um alarme que erra
   * assim é pior que alarme nenhum. Quem classifica contra os critérios é a
   * IA, que lê linguagem; o sistema só aponta o que é indefensável por
   * forma: motivo de uma palavra ou curto demais para explicar coisa alguma.
   */
  motivos_descarte_usados: { motivo: string; quantidade: number; curto_demais: boolean }[];
  /** vai junto para a IA poder classificar cada motivo contra a régua */
  criterios_da_regua: string[];
  qualificacao_faltando: Record<string, number>;
  leads_com_ficha_completa: number;
  leads_ativos: number;
  custo_medio_lead: number | null;
  /** carteira parada convertida em dinheiro — null quando a casa não acompanha custo */
  dinheiro_parado: number | null;
}

/** Quando o lead entrou na etapa em que está hoje. */
function entrouNaEtapaEm(l: LeadAud, etapaAtual: string): number {
  let quando = 0;
  for (const h of (l.etapasHist || [])) {
    if (mapEtapaCircuito(String(h.para || '')) === etapaAtual) {
      const ms = msOf(h.em);
      if (ms > quando) quando = ms;
    }
  }
  return quando || msOf(l.createdAt);
}

/**
 * Um motivo que não chega a ser uma frase não explica um descarte. Este é o
 * único juízo que o sistema faz sobre o texto — forma, não sentido.
 */
const motivoCurtoDemais = (motivo: string): boolean => {
  const m = motivo.trim();
  return m.length < 10 || !/\s/.test(m);
};

export function computarCobranca(
  leads: LeadAud[], ativ: Map<string, AtividadeAud>, p: Panorama,
  d: DiretrizesAuditoria, iniMs: number, fimMs: number,
  /** desde quando existe carimbo de etapa na base — antes disso, tempo na etapa é estimativa */
  historicoEtapasDesdeMs: number | null = null,
  agora = Date.now(),
): Cobranca {
  const dias = Math.max(1, Math.round((fimMs - iniMs) / DIA));
  const fator = dias / 30; // as metas são mensais

  /** `inteiro` marca o que só acontece em unidades — venda não é 0,2. */
  const linha = (indicador: string, realizado: number | null, metaMes: number | null, inteiro = true): LinhaMeta => {
    if (metaMes === null) {
      return { indicador, realizado, meta: null, meta_mensal: null, pct: null, bateu: null, avaliavel: false };
    }
    const bruta = metaMes * fator;
    // para baixo de propósito: meia venda arredondada para cima vira cobrança
    // de mês inteiro em meio mês, e a régua tem que ser defensável na reunião
    const meta = inteiro ? Math.floor(bruta) : Math.round(bruta * 10) / 10;
    // meta que arredonda para zero não é meta: o período é curto demais
    const avaliavel = meta >= 1 && realizado !== null;
    return {
      indicador, realizado, meta, meta_mensal: metaMes,
      pct: avaliavel && meta > 0 ? Math.round((realizado! / meta) * 100) : null,
      bateu: avaliavel ? realizado! >= meta : null,
      avaliavel,
    };
  };

  const m = d.metasMensais;
  const metas = [
    linha('visitas_feitas', p.visitas_feitas, m.visitasFeitas),
    linha('meets_feitos', p.meets_feitos, m.meetsFeitos),
    // o CRM nao registra proposta como evento: quem conta e a leitura
    linha('propostas_enviadas', null, m.propostasEnviadas),
    linha('vendas', p.vendas, m.vendas),
    // VGV é dinheiro, não contagem: proporção fracionada faz sentido
    linha('vgv', p.vgv, m.vgv, false),
  ];

  const estagnados: LeadEstagnado[] = [];
  const porEtapa: Record<string, number> = {};
  const faltando: Record<string, number> = {};
  let ativos = 0, fichaCompleta = 0;

  for (const l of leads) {
    const et = mapEtapaCircuito(l.etapa);
    if (et === ETAPA_FECHADO || et === ETAPA_DESCARTADO) continue;
    ativos++;

    // ---- ficha obrigatória
    const q = l.qualificacao || {};
    const vazios = d.qualificacaoObrigatoria.filter((campo) => {
      const v = q[campo];
      return !(Array.isArray(v) ? v.length : !!v);
    });
    if (!vazios.length) fichaCompleta++;
    for (const c of vazios) faltando[c] = (faltando[c] || 0) + 1;

    // ---- tempo parado na etapa
    // lead com retorno já marcado não está parado: está esperando a data que
    // o próprio cliente pediu. Cobrar silêncio dele é cobrar o certo.
    const at0 = ativ.get(l.id);
    const temRetornoAgendado = (at0?.tarefas || []).some((t) => !/conclu|cancel/i.test(t.status) && t.dueMs > agora);
    if (temRetornoAgendado) continue;

    const prazo = d.prazoMaximoEtapaDias[et];
    if (!prazo) continue;
    const carimbo = entrouNaEtapaEm(l, et);
    if (!carimbo) continue;

    // sem carimbo próprio, o piso é o início do histórico de etapas: o que se
    // sabe é "está nesta etapa desde pelo menos então", não desde que nasceu
    const temCarimbo = (l.etapasHist || []).some((h) => mapEtapaCircuito(String(h.para || '')) === et && msOf(h.em) > 0);
    const desde = temCarimbo ? carimbo : Math.max(carimbo, historicoEtapasDesdeMs || 0);
    const diasNaEtapa = Math.floor((agora - desde) / DIA);
    if (diasNaEtapa <= prazo) continue;

    const at = ativ.get(l.id);
    const ultimo = at?.interacoes.length ? at.interacoes[at.interacoes.length - 1].ms : 0;
    estagnados.push({
      id: l.id, nome: String(l.nome || ''), etapa: et,
      dias_na_etapa: diasNaEtapa, prazo_da_etapa: prazo,
      dias_sem_toque: ultimo ? Math.floor((agora - ultimo) / DIA) : diasNaEtapa,
      estimado: !temCarimbo,
    });
    porEtapa[et] = (porEtapa[et] || 0) + 1;
  }

  estagnados.sort((a, b) => b.dias_na_etapa - a.dias_na_etapa);

  const motivos = Object.entries(p.motivos_descarte)
    .map(([motivo, quantidade]) => ({ motivo, quantidade, curto_demais: motivoCurtoDemais(motivo) }))
    .sort((a, b) => Number(b.curto_demais) - Number(a.curto_demais) || b.quantidade - a.quantidade);

  const custo = d.custoMedioLead;
  return {
    dias_do_periodo: dias,
    metas,
    metas_definidas: metas.some((x) => x.meta !== null),
    leads_estagnados: estagnados.slice(0, 40),
    estagnados_por_etapa: porEtapa,
    motivos_descarte_usados: motivos,
    criterios_da_regua: d.criteriosDescarteValido,
    qualificacao_faltando: faltando,
    leads_com_ficha_completa: fichaCompleta,
    leads_ativos: ativos,
    custo_medio_lead: custo,
    dinheiro_parado: custo !== null ? Math.round(custo * p.sem_toque_7d) : null,
  };
}

// ---------------------------------------------------------------------------
// O QUE ELE FEZ BEM — provado pelo sistema, não achado na leitura
//
// Todo o resto que este arquivo calcula é problema: parado, atrasado, sem
// ficha, sem próximo passo. Entregar só isso faz o pacote ser uma máquina de
// achar defeito, e um relatório que só acusa é lido uma vez.
// O acerto também tem prova no CRM — ela só nunca tinha sido procurada.
// ---------------------------------------------------------------------------

export interface Destaques {
  /** leads que subiram de etapa no período, do maior salto para o menor */
  avancos: { lead: string; de: string; para: string; etapas: number; em: string }[];
  /** estava parado além do prazo e voltou a receber contato */
  recuperados: { lead: string; dias_parado: number; retomado_em: string }[];
  /** atendidos dentro do prazo do 1º contato, com o tempo */
  atendidos_no_prazo: { lead: string; minutos_uteis: number }[];
  tarefas_concluidas_no_prazo: number;
  tarefas_concluidas_total: number;
  /** o lead atendido mais rápido do período */
  atendimento_mais_rapido: { lead: string; minutos_uteis: number } | null;
  trabalhou_fim_de_semana: number;
  trabalhou_fora_do_horario: number;
}

export function computarDestaques(
  leads: LeadAud[], ativ: Map<string, AtividadeAud>, d: DiretrizesAuditoria,
  iniMs: number, fimMs: number, agora = Date.now(),
): Destaques {
  const dentroJ = (ms: number) => ms >= iniMs && ms < fimMs;
  const r: Destaques = {
    avancos: [], recuperados: [], atendidos_no_prazo: [],
    tarefas_concluidas_no_prazo: 0, tarefas_concluidas_total: 0,
    atendimento_mais_rapido: null, trabalhou_fim_de_semana: 0, trabalhou_fora_do_horario: 0,
  };
  const diasFds = new Set<string>(), diasFora = new Set<string>();

  for (const l of leads) {
    const nome = String(l.nome || l.id.slice(0, 6));
    const at = ativ.get(l.id);

    // ---- avanços de etapa no período
    for (const h of (l.etapasHist || [])) {
      const em = msOf(h.em);
      if (!em || !dentroJ(em) || !h.de || !h.para) continue;
      const de = mapEtapaCircuito(String(h.de)), para = mapEtapaCircuito(String(h.para));
      if (para === ETAPA_DESCARTADO) continue;
      const salto = etapaIndex(para) - etapaIndex(de);
      if (salto > 0) r.avancos.push({ lead: nome, de, para, etapas: salto, em: new Date(em).toISOString().slice(0, 10) });
    }

    // ---- 1º contato dentro do prazo
    const nascimento = msOf(l.createdAt), pMs = msOf(l.circuito?.primeiroContatoEm);
    if (dentroJ(nascimento) && pMs >= nascimento && pMs > 0) {
      const min = minutosUteisEntre(nascimento, pMs, d.horarioUtil);
      if (min <= d.prazos.primeiroContatoMaximoMin) {
        r.atendidos_no_prazo.push({ lead: nome, minutos_uteis: min });
        if (!r.atendimento_mais_rapido || min < r.atendimento_mais_rapido.minutos_uteis) {
          r.atendimento_mais_rapido = { lead: nome, minutos_uteis: min };
        }
      }
    }

    // ---- recuperação: ficou parado além do prazo e voltou
    const toques = (at?.interacoes || []).map((i) => i.ms).sort((a, b) => a - b);
    for (let i = 1; i < toques.length; i++) {
      const gap = (toques[i] - toques[i - 1]) / DIA;
      if (gap > d.prazos.leadParadoDias && dentroJ(toques[i])) {
        r.recuperados.push({
          lead: nome, dias_parado: Math.round(gap),
          retomado_em: new Date(toques[i]).toISOString().slice(0, 10),
        });
        break;
      }
    }

    // ---- tarefas cumpridas, e quando ele trabalhou
    for (const t of (at?.tarefas || [])) {
      if (!/conclu/i.test(t.status) || !t.concluidaMs || !dentroJ(t.concluidaMs)) continue;
      r.tarefas_concluidas_total++;
      if (t.dueMs > 0 && horasUteisEntre(t.dueMs, t.concluidaMs, d.horarioUtil) <= d.prazos.tarefaAtrasadaHoras) {
        r.tarefas_concluidas_no_prazo++;
      }
    }
    for (const i of (at?.interacoes || [])) {
      if (!dentroJ(i.ms)) continue;
      const dt = new Date(i.ms), dia = dt.toISOString().slice(0, 10), h = dt.getHours(), dow = dt.getDay();
      if (dow === 0 || dow === 6) diasFds.add(dia);
      if (h < d.horarioUtil.inicioHora || h >= d.horarioUtil.fimHora) diasFora.add(dia);
    }
  }

  r.avancos.sort((a, b) => b.etapas - a.etapas || b.em.localeCompare(a.em));
  r.atendidos_no_prazo.sort((a, b) => a.minutos_uteis - b.minutos_uteis);
  r.recuperados.sort((a, b) => b.dias_parado - a.dias_parado);
  r.avancos = r.avancos.slice(0, 15);
  r.atendidos_no_prazo = r.atendidos_no_prazo.slice(0, 10);
  r.recuperados = r.recuperados.slice(0, 10);
  r.trabalhou_fim_de_semana = diasFds.size;
  r.trabalhou_fora_do_horario = diasFora.size;
  return r;
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
    leads_recebidos: 0, leads_novos_30d: 0, leads_sem_primeiro_contato: 0, leads_novos_ainda_no_prazo: 0, carimbos_retroativos: 0,
    mediana_primeiro_contato_min_util: null, mediana_primeiro_contato_min_corrido: null,
    dentro_do_prazo_1o_contato: 0, fora_do_prazo_1o_contato: 0,
    distribuicao_funil: {}, sem_toque_7d: 0, sem_toque_7d_por_etapa: {}, parados_com_retorno_agendado: 0,
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
    // relativo ao FIM DO PERÍODO, não a "agora": um relatório de julho lido
    // em setembro dizia "0 leads novos" porque contava a partir de hoje
    if (nascimento > 0 && nascimento <= fimMs && (fimMs - nascimento) / DIA <= 30) p.leads_novos_30d++;

    // funil (interesse futuro é DERIVADO — não é etapa gravada)
    const rotulo = ehInteresseFuturo(et, l.tarefasPendentes, agora) ? ETAPA_INTERESSE_FUTURO : et;
    if (p.distribuicao_funil[rotulo] !== undefined) p.distribuicao_funil[rotulo]++;

    const ativo = et !== ETAPA_FECHADO && et !== ETAPA_DESCARTADO;

    // 1º CONTATO — só de quem NASCEU no período.
    // Sem esse filtro, lead de outubro carimbado agora entra como "109 dias
    // até o 1º contato" e a mediana explode (deu 71.750 min numa rodada
    // real). Isso mede a adoção do CRM, não a velocidade do corretor — e
    // acusa de lento quem responde em minutos.
    const pMs = msOf(l.circuito?.primeiroContatoEm);
    const nasceuNoPeriodo = dentroJ(nascimento);
    if (nasceuNoPeriodo && pMs >= nascimento && pMs > 0) {
      const util = minutosUteisEntre(nascimento, pMs, d.horarioUtil);
      t1Uteis.push(util);
      t1Corridos.push(Math.round((pMs - nascimento) / 60000));
      if (util <= d.prazos.primeiroContatoMaximoMin) p.dentro_do_prazo_1o_contato++;
      else p.fora_do_prazo_1o_contato++;
    } else if (nasceuNoPeriodo && ativo) {
      // lead que entrou agora ainda TEM prazo. Contá-lo como "sem 1º
      // contato" é cobrar antes de o relógio acabar de correr.
      const jaVenceu = minutosUteisEntre(nascimento, agora, d.horarioUtil) > d.prazos.primeiroContatoMaximoMin;
      if (jaVenceu) p.leads_sem_primeiro_contato++;
      else p.leads_novos_ainda_no_prazo++;
    } else if (!nasceuNoPeriodo && pMs > 0 && dentroJ(pMs) && nascimento > 0) {
      // carimbado no período mas nascido antes: é adoção do CRM, não
      // atendimento. Fica registrado à parte pra não sumir da leitura.
      p.carimbos_retroativos++;
    }

    if (ativo) {
      const ref = ultimo || nascimento;
      const temFutura = (at?.tarefas || []).some((t) => !/conclu|cancel/i.test(t.status) && t.dueMs > agora);

      if (ref > 0 && (agora - ref) / DIA > d.prazos.leadParadoDias) {
        // ABANDONADO é diferente de AGENDADO. Cliente que pediu para ser
        // chamado em dois meses e tem a tarefa marcada não está largado —
        // está esperando, e cobrar silêncio dele é cobrar o certo. Numa
        // rodada real isso inflava "34 leads parados" quando 28 tinham
        // retorno agendado.
        if (temFutura) {
          p.parados_com_retorno_agendado++;
        } else {
          p.sem_toque_7d++;
          p.sem_toque_7d_por_etapa[rotulo] = (p.sem_toque_7d_por_etapa[rotulo] || 0) + 1;
        }
      }
      if (!temFutura) p.leads_sem_tarefa_futura++;
      if (!String(l.anotacoes || '').trim()) p.leads_sem_anotacao++;
      const temQualif = !!l.qualificacao && Object.values(l.qualificacao).some((v) => Array.isArray(v) && v.length > 0);
      if (!temQualif) p.leads_sem_qualificacao++;
    }

    // tarefas: em aberto agora, e as que ele fez com atraso dentro da janela.
    // SÓ de lead vivo: tarefa pendente em lead descartado ou fechado não é
    // trabalho em aberto, é resíduo — e contava como atraso do corretor.
    for (const t of (ativo ? (at?.tarefas || []) : [])) {
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
  /** o que a régua do gestor permite cobrar nesta rodada */
  cobranca: Cobranca;
  /** o que ele fez bem, com prova no CRM */
  destaques: Destaques;
  /** cumprimento da cadência nos leads que nasceram no período */
  cadencia: { leads: CadenciaLead[]; media_cumprimento_pct: number | null };
  /** quanto da carteira já passou pela auditoria somando todas as rodadas */
  coberturaAcumulada: CoberturaAcumulada;
  /** quantos leads de cada papel entraram nesta amostra */
  composicaoAmostra: Record<string, number>;
  /** baseline (carteira inteira) ou semanal (o delta) */
  modoAmostra: ModoAmostra;
  amostra: { lead: LeadAud; faixa: FaixaSorteio }[];
  atividade: Map<string, AtividadeAud>;
  ads: AdsAud[];
  historico: unknown;
  /** data do carimbo de etapa mais antigo da base — antes disso não há agenda */
  historicoEtapasDesdeMs: number | null;
  /** o que cada métrica conseguiu medir no período pedido */
  disponibilidade: DisponibilidadeMetrica[];
  /** descartados no período — fora da amostra, mas rastreáveis (motivo é texto livre) */
  descartes: LeadAud[];
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
    // Descartes do período com NOME, DATA e MOTIVO. Ficam fora da amostra
    // (o lead já foi pra outro corretor), mas o motivo é campo de texto livre
    // e numa rodada real apareceu "gay" — sem esta lista, o achado de risco
    // não tem como ser rastreado até o lead nem até a data.
    descartes_do_periodo: o.descartes.map((l) => ({
      id: l.id,
      nome: l.nome || null,
      descartado_em: iso(msOf(l.descartadoEm)),
      motivo: l.descartadoMotivo || null,
      tentativas_antes: l.circuito?.tentativas ?? null,
      dias_de_vida: msOf(l.createdAt) > 0 ? Math.floor((msOf(l.descartadoEm) - msOf(l.createdAt)) / DIA) : null,
    })),
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
        ...(o.disponibilidade.some((d) => d.vazia || d.parcial) ? [
          'REGRA DE LEITURA: as métricas listadas em metricas_indisponiveis_no_periodo vêm null (não zero) porque a base não as mediu no período. No relatório, escreva "não utilizado por falta de métrica" — não conte como falha do corretor. As de metricas_parciais_no_periodo existem só a partir da data indicada.',
        ] : []),
      ],
      historico_etapas_desde: o.historicoEtapasDesdeMs ? ymdStr(o.historicoEtapasDesdeMs) : null,
      agenda_parcial_no_periodo: parcialAgenda,
      // Regra de leitura: métrica que a base não mediu no período NÃO vira zero.
      // Vem null aqui com o motivo — o relatório deve dizer "não utilizado por
      // falta de métrica" em vez de cobrar o corretor por algo que ninguém mediu.
      disponibilidade_das_metricas: o.disponibilidade,
      metricas_indisponiveis_no_periodo: o.disponibilidade.filter((d) => d.vazia).map((d) => d.rotulo),
      metricas_parciais_no_periodo: o.disponibilidade.filter((d) => d.parcial).map((d) => d.rotulo),
    },
    diretrizes: {
      cadencia: o.diretrizes.cadencia,
      prazos: o.diretrizes.prazos,
      horario_util: { ...o.diretrizes.horarioUtil, descricao: descreverHorarioUtil(o.diretrizes.horarioUtil) },
      criterios_descarte_valido: o.diretrizes.criteriosDescarteValido,
      pesos_avaliacao: o.diretrizes.pesosAvaliacao,
      metas_mensais: o.diretrizes.metasMensais,
      prazo_maximo_por_etapa_dias: o.diretrizes.prazoMaximoEtapaDias,
      qualificacao_obrigatoria: o.diretrizes.qualificacaoObrigatoria,
      custo_medio_lead: o.diretrizes.custoMedioLead,
      tom_do_relatorio: o.diretrizes.tomDoRelatorio,
    },
    prompts: o.diretrizes.prompts,
    panorama: o.panorama,
    cobranca: o.cobranca,
    destaques: o.destaques,
    cadencia_cumprida: o.cadencia,
    cobertura_acumulada: o.coberturaAcumulada,
    composicao_da_amostra: o.composicaoAmostra,
    modo_da_amostra: o.modoAmostra,
    historico: o.historico,
    amostra,
  };
}
