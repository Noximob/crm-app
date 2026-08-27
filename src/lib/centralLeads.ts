/**
 * A CENTRAL DE LEADS · a conta de tudo que existe em lista fria.
 *
 * A Central sabia importar, redistribuir e transferir, mas não sabia
 * RESPONDER duas perguntas do gestor:
 *
 *   "quanta coisa eu tenho?"      — escala: quantos contatos entraram, quantos
 *                                   estão parados, quantos viraram lead;
 *   "como isso se divide?"        — por corretor: quem tem quanto, quem está
 *                                   trabalhando, quem está sentado em cima de
 *                                   uma lista intocada, e quanto do que ele
 *                                   descartou está esperando redistribuição.
 *
 * As telas mostravam lista por lista. Com uma ou duas isso passa; com seis
 * cada uma vira um cartão e a soma existe só na cabeça de quem olha.
 *
 * Aqui mora a aritmética, separada da tela e sem Firebase, porque é conta que
 * decide para onde vai o dinheiro que a casa já gastou comprando lista. Conta
 * errada aqui manda o gestor cobrar o corretor errado.
 */

// ═══════════════════════════════════════════════════════════════════════════
// O VOCABULÁRIO COMUM DA SOBRA
//
// A sobra nasce em dois lugares que nunca combinaram as palavras:
//
//   lista fria  Não atende · Não quer · Número errado · Sem perfil ·
//               Interesse futuro · Outro
//   CRM         Não responde · Não quer mais · Comprou com outro ·
//               Fora do perfil · Adiou a compra · Outro
//
// São quase os mesmos motivos com nomes diferentes. O efeito prático é que
// procurar "quem vale ligar de novo" não funciona: o mesmo caso aparece como
// "Interesse futuro" se veio da lista e "Adiou a compra" se veio do CRM, e o
// gestor tem que saber de cabeça qual é qual — ou olhar os dois e somar.
//
// Aqui os dois viram um TÓPICO só. É o que faz o filtro por motivo achar
// tudo de uma vez, e é a única coisa que precisava existir pra "achar por
// tópico" deixar de ser impossível.
//
// Os textos originais NÃO são tocados: quem descartou escreveu aquilo, e a
// linha do tempo de cada cliente continua mostrando a palavra que foi usada.
// ═══════════════════════════════════════════════════════════════════════════

/** O tópico é o que o gestor procura; a ordem é a de quem vale mais a pena. */
export const TOPICOS_SOBRA = [
  'Interesse futuro',
  'Não atende',
  'Não quer',
  'Fora do perfil',
  'Comprou com outro',
  'Número errado',
  'Outros',
  'Sem motivo',
] as const;
export type TopicoSobra = (typeof TOPICOS_SOBRA)[number];

const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** As duas listas de palavras, apontando pro mesmo tópico. */
const DE_PARA: Record<string, TopicoSobra> = {
  // esperar e ligar depois — o mais valioso da sobra
  'interesse futuro': 'Interesse futuro',
  'adiou a compra': 'Interesse futuro',
  // não deu pra falar
  'nao atende': 'Não atende',
  'nao responde': 'Não atende',
  // falou e disse não
  'nao quer': 'Não quer',
  'nao quer mais': 'Não quer',
  // não é cliente pro que a casa vende
  'sem perfil': 'Fora do perfil',
  'fora do perfil': 'Fora do perfil',
  // perdido pra concorrência
  'comprou com outro': 'Comprou com outro',
  // dado ruim — não é lead, é lixo de cadastro
  'numero errado': 'Número errado',
  'telefone errado': 'Número errado',
};

/**
 * Em que tópico este motivo cai.
 * Texto livre (o que a pessoa digitou no "Outro") vira "Outros": vale contar
 * junto, mas não vale um tópico por frase — seria a bagunça de novo.
 */
export function topicoDoMotivo(motivo?: string): TopicoSobra {
  const m = semAcento(motivo || '');
  if (!m) return 'Sem motivo';
  return DE_PARA[m] || 'Outros';
}

/** Ordena tópicos pela régua acima; o que não está nela vai pro fim. */
export const ordemDoTopico = (t: string): number => {
  const i = (TOPICOS_SOBRA as readonly string[]).indexOf(t);
  return i === -1 ? TOPICOS_SOBRA.length : i;
};

/** O status de um contato dentro da lista fria. */
export type StatusContato = 'pendente' | 'descartado' | 'crm' | 'realocado';

export interface ContatoFrio {
  id: string;
  nome: string;
  telefone: string;
  status: StatusContato | string;
  tentativas: number;
  ultimaTentativaEm?: { seconds?: number };
  descartadoMotivo?: string;
  anotacoes?: string;
  leadId?: string;
  eventos: { tipo: string; detalhe?: string; em?: { seconds?: number }; por?: string }[];
}

export interface ListaFria {
  id: string;
  nome: string;
  corretorId: string;
  criadaEm?: { seconds?: number };
  contatos: ContatoFrio[];
  /** a lista existe mas os contatos não puderam ser lidos (permissão) */
  semAcesso?: boolean;
}

export interface Pessoa { id: string; nome: string }

/** Quantos dias desde um timestamp do Firestore; null se nunca aconteceu. */
export const diasDesde = (ts?: { seconds?: number }, agora = Date.now()): number | null =>
  ts?.seconds ? Math.floor((agora - ts.seconds * 1000) / 864e5) : null;

// ═══════════════════════════════════════════════════════════════════════════
// O RESUMO DE UMA LISTA
// ═══════════════════════════════════════════════════════════════════════════

export interface ResumoLista {
  total: number;
  pendentes: number;
  noCrm: number;
  descartados: number;
  realocados: number;
  /** na fila e ninguém ligou NENHUMA vez — o número que dói */
  intocados: number;
  /** na fila, já chamado pelo menos uma vez */
  emAndamento: number;
  chamadas: number;
  /** segundos da última tentativa em qualquer contato; 0 = nunca trabalhada */
  ultimaAtividade: number;
  /** % dos contatos que viraram lead — a única medida de retorno da lista */
  aproveitamento: number;
}

export function resumirLista(l: ListaFria): ResumoLista {
  const c = l.contatos;
  const pendentes = c.filter((x) => x.status === 'pendente');
  const intocados = pendentes.filter((x) => (x.tentativas || 0) === 0).length;
  const noCrm = c.filter((x) => x.status === 'crm').length;
  return {
    total: c.length,
    pendentes: pendentes.length,
    noCrm,
    descartados: c.filter((x) => x.status === 'descartado').length,
    realocados: c.filter((x) => x.status === 'realocado').length,
    intocados,
    emAndamento: pendentes.length - intocados,
    chamadas: c.reduce((s, x) => s + (x.tentativas || 0), 0),
    ultimaAtividade: c.reduce((mx, x) => Math.max(mx, x.ultimaTentativaEm?.seconds || 0), 0),
    // sem contato nenhum não há aproveitamento — 0/0 é 0, não NaN
    aproveitamento: c.length ? Math.round((noCrm / c.length) * 100) : 0,
  };
}

/** Somar resumos — a leitura de cima é a mesma conta, só que de tudo junto. */
export function somarResumos(rs: ResumoLista[]): ResumoLista {
  const z = rs.reduce((a, r) => ({
    total: a.total + r.total,
    pendentes: a.pendentes + r.pendentes,
    noCrm: a.noCrm + r.noCrm,
    descartados: a.descartados + r.descartados,
    realocados: a.realocados + r.realocados,
    intocados: a.intocados + r.intocados,
    emAndamento: a.emAndamento + r.emAndamento,
    chamadas: a.chamadas + r.chamadas,
    ultimaAtividade: Math.max(a.ultimaAtividade, r.ultimaAtividade),
    aproveitamento: 0,
  }), {
    total: 0, pendentes: 0, noCrm: 0, descartados: 0, realocados: 0,
    intocados: 0, emAndamento: 0, chamadas: 0, ultimaAtividade: 0, aproveitamento: 0,
  } as ResumoLista);
  // o aproveitamento do conjunto se recalcula do total — média de médias mente
  z.aproveitamento = z.total ? Math.round((z.noCrm / z.total) * 100) : 0;
  return z;
}

// ═══════════════════════════════════════════════════════════════════════════
// A DIVISÃO POR CORRETOR — "como se dividem"
// ═══════════════════════════════════════════════════════════════════════════

export interface FatiaCorretor {
  corretorId: string;
  nome: string;
  /** o corretor saiu da equipe mas ainda tem lista no nome dele */
  fantasma: boolean;
  listas: number;
  resumo: ResumoLista;
  /** dias desde a última chamada dele em qualquer lista; null = nunca ligou */
  paradoHa: number | null;
  /** quantos DELE estão no bolsão frio esperando alguém redistribuir */
  noBolsao: number;
}

/**
 * Uma fatia por corretor que TEM lista — mais os corretores sem lista
 * nenhuma, que é uma informação e não um vazio: significa que alguém da
 * equipe está sem munição.
 */
export function dividirPorCorretor(
  listas: ListaFria[],
  corretores: Pessoa[],
  agora = Date.now(),
): FatiaCorretor[] {
  const porId = new Map<string, ListaFria[]>();
  for (const l of listas) {
    const k = l.corretorId || '';
    porId.set(k, [...(porId.get(k) || []), l]);
  }
  // quem está na equipe entra mesmo sem lista
  for (const c of corretores) if (!porId.has(c.id)) porId.set(c.id, []);

  const nomeDe = (id: string) =>
    corretores.find((c) => c.id === id)?.nome || (id ? 'corretor que saiu da equipe' : 'sem dono');

  return Array.from(porId.entries()).map(([corretorId, minhas]) => {
    const resumo = somarResumos(minhas.map(resumirLista));
    return {
      corretorId,
      nome: nomeDe(corretorId),
      fantasma: !!corretorId && !corretores.some((c) => c.id === corretorId),
      listas: minhas.length,
      resumo,
      paradoHa: resumo.ultimaAtividade
        ? Math.floor((agora - resumo.ultimaAtividade * 1000) / 864e5)
        : null,
      noBolsao: resumo.descartados,
    };
  }).sort((a, b) =>
    // quem tem mais parado aparece primeiro: é onde o gestor precisa agir
    b.resumo.intocados - a.resumo.intocados
    || b.resumo.total - a.resumo.total
    || a.nome.localeCompare(b.nome));
}

// ═══════════════════════════════════════════════════════════════════════════
// O QUE SOBRA PRA REDISTRIBUIR
// ═══════════════════════════════════════════════════════════════════════════

export interface OQueSobra {
  /** contatos frios descartados nas listas de ligação */
  frios: number;
  /** leads do CRM descartados pelos corretores */
  doCrm: number;
  total: number;
  /** o motivo mais frequente entre os frios — o padrão que se repete */
  motivoTop: { motivo: string; n: number } | null;
}

export function oQueSobra(listas: ListaFria[], leadsDescartados: number): OQueSobra {
  const descartados = listas.flatMap((l) => l.contatos.filter((c) => c.status === 'descartado'));
  const porMotivo = new Map<string, number>();
  for (const c of descartados) {
    const m = (c.descartadoMotivo || '').trim() || 'Sem motivo';
    porMotivo.set(m, (porMotivo.get(m) || 0) + 1);
  }
  const top = Array.from(porMotivo.entries()).sort((a, b) => b[1] - a[1])[0];
  return {
    frios: descartados.length,
    doCrm: leadsDescartados,
    total: descartados.length + leadsDescartados,
    motivoTop: top ? { motivo: top[0], n: top[1] } : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// OS ALERTAS DA CENTRAL — o que o gestor tem que ver sem procurar
// ═══════════════════════════════════════════════════════════════════════════

export interface AlertaCentral {
  tipo: 'intocada' | 'parada' | 'fantasma' | 'sobrando' | 'semLista';
  texto: string;
  grave: boolean;
  /** pra tela saber pra onde levar o clique */
  corretorId?: string;
  listaId?: string;
}

/** Uma lista sem NENHUMA chamada há mais de tantos dias é dinheiro parado. */
export const DIAS_LISTA_PARADA = 7;

export function alertasDaCentral(
  listas: ListaFria[],
  corretores: Pessoa[],
  sobra: OQueSobra,
  agora = Date.now(),
): AlertaCentral[] {
  const a: AlertaCentral[] = [];

  for (const l of listas) {
    const r = resumirLista(l);
    if (r.total === 0) continue;
    const parada = r.ultimaAtividade
      ? Math.floor((agora - r.ultimaAtividade * 1000) / 864e5)
      : diasDesde(l.criadaEm, agora);

    if (r.chamadas === 0 && (parada ?? 0) >= DIAS_LISTA_PARADA) {
      a.push({
        tipo: 'intocada', grave: true, listaId: l.id, corretorId: l.corretorId,
        texto: `"${l.nome}" tem ${r.total} contatos e NENHUMA ligação em ${parada} dias.`,
      });
    } else if (r.intocados > 0 && (parada ?? 0) >= DIAS_LISTA_PARADA) {
      a.push({
        tipo: 'parada', grave: false, listaId: l.id, corretorId: l.corretorId,
        texto: `"${l.nome}" está parada há ${parada} dias com ${r.intocados} contatos sem nenhuma ligação.`,
      });
    }
  }

  // lista no nome de quem não está mais na equipe: ninguém vai ligar
  const fantasmas = listas.filter((l) => l.corretorId && !corretores.some((c) => c.id === l.corretorId));
  if (fantasmas.length) {
    const contatos = somarResumos(fantasmas.map(resumirLista));
    a.push({
      tipo: 'fantasma', grave: true,
      texto: `${fantasmas.length} lista${fantasmas.length > 1 ? 's' : ''} com ${contatos.pendentes} contatos na fila estão no nome de alguém que saiu da equipe.`,
    });
  }

  const semLista = corretores.filter((c) => !listas.some((l) => l.corretorId === c.id));
  if (semLista.length) {
    a.push({
      tipo: 'semLista', grave: false,
      texto: `${semLista.length === 1 ? `${semLista[0].nome} está` : `${semLista.length} corretores estão`} sem nenhuma lista de ligação.`,
    });
  }

  if (sobra.total > 0) {
    a.push({
      tipo: 'sobrando', grave: false,
      texto: `${sobra.total} esperando redistribuição${sobra.motivoTop ? ` — o motivo que mais aparece é "${sobra.motivoTop.motivo}" (${sobra.motivoTop.n})` : ''}.`,
    });
  }

  return a.sort((x, y) => Number(y.grave) - Number(x.grave));
}
