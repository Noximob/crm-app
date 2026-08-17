/**
 * AUDITORIA · ANÁLISE — o formato do rodada.json depois de importado.
 *
 * O JSON é escrito por uma IA fora do sistema, então NADA aqui pode ser
 * assumido como presente ou como do tipo certo. Todo acesso passa por um
 * leitor tolerante: campo faltando vira vazio, número que veio string vira
 * número, e a tela decide o que esconder. Uma rodada com metade dos campos
 * ainda vale — o que não pode é a tela quebrar e o gestor ficar sem nada.
 */

// ---------------------------------------------------------------------------
// leitura tolerante
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>;

export const asObj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? v as Obj : {});
export const asArr = (v: unknown): Obj[] => Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') as Obj[] : [];
export const asStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : [];
export const asStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

/**
 * null quando não há número — nunca 0, que significaria "medido e deu zero".
 *
 * A conversão é DELIBERADAMENTE restritiva. Um leitor guloso transforma
 * "11/08 audio 0:20" em 1.108.020 e apresenta a data como se fosse valor;
 * por isso a string só vira número quando ela é um número (com R$, % ou
 * separadores em volta). Qualquer letra ou barra derruba para null e o
 * texto é exibido como texto.
 */
export function asNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean' || typeof v !== 'string') return null;
  const s = v.trim();
  if (!/^R?\$?\s*-?[\d.,]+\s*%?$/.test(s)) return null;
  let n = s.replace(/[R$\s%]/g, '');
  if (n.includes(',')) n = n.replace(/\./g, '').replace(',', '.');      // 1.234,5 → 1234.5
  else if ((n.match(/\./g) || []).length > 1) n = n.replace(/\./g, ''); // 1.500.000 → 1500000
  const r = Number(n);
  return Number.isFinite(r) ? r : null;
}

// ---------------------------------------------------------------------------
// formatação
// ---------------------------------------------------------------------------

export const fmtYmd = (s?: string) => {
  const t = asStr(s);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t.split('-').reverse().join('/') : (t || '—');
};

/**
 * R$ curto: 1.500.000 → "R$ 1,5 mi"; 623.264 → "R$ 623 mil"; 2.720 → "R$ 2.720".
 *
 * Abaixo de 100 mil o valor sai inteiro. Abreviar ali custa precisão demais
 * — R$ 2.720 de dinheiro parado virava "R$ 3 mil", e número de cobrança que
 * o corretor consegue contestar na conta não se usa numa reunião.
 */
export function fmtDinheiro(v: number | null): string {
  if (v === null) return '—';
  if (v === 0) return 'R$ 0';
  if (Math.abs(v) >= 1_000_000) {
    const mi = v / 1_000_000;
    return `R$ ${mi.toFixed(mi >= 10 ? 0 : 1).replace('.', ',')} mi`;
  }
  if (Math.abs(v) >= 100_000) return `R$ ${Math.round(v / 1_000)} mil`;
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
}

export function fmtNum(v: number | null): string {
  if (v === null) return 'n/d';
  return Number.isInteger(v) ? v.toLocaleString('pt-BR') : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

// ---------------------------------------------------------------------------
// os 24 indicadores — rótulo, unidade e sentido
// ---------------------------------------------------------------------------

/**
 * `bom` diz para que lado o número é bom: 'baixo' (tempo, atraso) ou 'alto'
 * (percentual de acerto). Sem isso a tela não sabe se 240 é bom ou péssimo.
 */
export interface DefIndicador {
  rotulo: string; unidade: string; grupo: string; bom: 'alto' | 'baixo' | 'neutro';
  /**
   * De onde o número sai.
   *   carteira — todos os leads do corretor, direto do CRM. NÃO foi
   *     verificado no WhatsApp: mede o que foi digitado.
   *   amostra  — só os leads sorteados, com a conversa lida. É a única
   *     parte com prova, e a amostra é ESTRATIFICADA: não representa a
   *     carteira e não pode ser extrapolada para ela.
   */
  base: 'carteira' | 'amostra';
  /**
   * O indicador em português de gente. Quem lê o relatório vende imóvel e não
   * conhece o vocabulário do sistema — "fidelidade do CRM" não quer dizer
   * nada até alguém explicar que é o quanto o registro bate com a conversa.
   */
  oQueMede: string;
}

export const GRUPOS = ['Velocidade', 'Disciplina e cobertura', 'Funil', 'Conversa', 'Resultado'] as const;

/** O que cada grupo responde, em uma pergunta. */
export const PERGUNTA_DO_GRUPO: Record<string, string> = {
  'Velocidade': 'Quanto tempo o cliente espera por você?',
  'Disciplina e cobertura': 'A carteira está sendo cuidada, e o sistema conta a verdade?',
  'Funil': 'O cliente anda para frente?',
  'Conversa': 'A conversa é uma conversa, ou é um envio?',
  'Resultado': 'O que virou dinheiro no fim.',
};

export const DEF_INDICADOR: Record<string, DefIndicador> = {
  '1o_contato_mediana_min_util': { rotulo: 'tempo até o 1º contato', unidade: 'min', grupo: 'Velocidade', base: 'carteira', bom: 'baixo', oQueMede: 'Quanto tempo o lead novo espera até você falar com ele pela primeira vez. Só conta horário de trabalho — das 20h às 9h e no domingo o relógio para.' },
  'pct_1o_contato_no_prazo': { rotulo: 'leads novos atendidos no prazo', unidade: '%', grupo: 'Velocidade', base: 'carteira', bom: 'alto', oQueMede: 'De cada 100 leads novos, quantos você atendeu dentro do tempo combinado.' },
  'aceite_rodizio_mediana_min': { rotulo: 'tempo para aceitar o lead', unidade: 'min', grupo: 'Velocidade', base: 'carteira', bom: 'baixo', oQueMede: 'Quanto tempo o lead fica no rodízio esperando você clicar em aceitar.' },
  'resposta_na_conversa_mediana_min': { rotulo: 'tempo para responder', unidade: 'min', grupo: 'Velocidade', base: 'amostra', bom: 'baixo', oQueMede: 'Com a conversa já aberta, quanto o cliente espera pela sua resposta.' },

  'fidelidade_crm_pct': { rotulo: 'o sistema bate com a realidade', unidade: '%', grupo: 'Disciplina e cobertura', base: 'amostra', bom: 'alto', oQueMede: 'De cada 100 leads, em quantos o que está escrito no CRM é o que de fato aconteceu no WhatsApp.' },
  'pct_ativos_com_proximo_passo': { rotulo: 'clientes com próximo passo marcado', unidade: '%', grupo: 'Disciplina e cobertura', base: 'carteira', bom: 'alto', oQueMede: 'Quantos dos seus clientes ativos têm uma próxima ação agendada. Sem isso, o lead depende de você lembrar.' },
  'tarefas_vencidas_24h': { rotulo: 'tarefas atrasadas mais de um dia', unidade: '', grupo: 'Disciplina e cobertura', base: 'carteira', bom: 'baixo', oQueMede: 'Quantas tarefas você marcou e deixou passar mais de 24 horas.' },
  'pct_carteira_parada': { rotulo: 'clientes sem receber nada há mais de 7 dias', unidade: '%', grupo: 'Disciplina e cobertura', base: 'carteira', bom: 'baixo', oQueMede: 'A fatia da sua carteira que está há mais de uma semana sem nenhum contato seu.' },
  'pct_com_qualificacao': { rotulo: 'clientes com a ficha preenchida', unidade: '%', grupo: 'Disciplina e cobertura', base: 'carteira', bom: 'alto', oQueMede: 'Em quantos você já levantou o que a pessoa procura, quanto pode pagar e para quando.' },

  'pct_1o_contato_para_meet': { rotulo: 'do 1º contato até marcar reunião', unidade: '%', grupo: 'Funil', base: 'carteira', bom: 'alto', oQueMede: 'De cada 100 pessoas com quem você falou, quantas aceitaram marcar uma reunião.' },
  'pct_meet_marcado_para_feito': { rotulo: 'reunião marcada que aconteceu', unidade: '%', grupo: 'Funil', base: 'carteira', bom: 'alto', oQueMede: 'Das reuniões marcadas, quantas o cliente compareceu. O resto é bolo.' },
  'pct_visita_marcada_para_feita': { rotulo: 'visita marcada que aconteceu', unidade: '%', grupo: 'Funil', base: 'carteira', bom: 'alto', oQueMede: 'Das visitas agendadas, quantas o cliente foi de fato.' },
  'pct_visita_para_negociacao': { rotulo: 'visita que virou negociação', unidade: '%', grupo: 'Funil', base: 'carteira', bom: 'alto', oQueMede: 'De cada 100 visitas feitas, quantas avançaram para proposta.' },
  'retorno_pos_visita_mediana_h': { rotulo: 'tempo para retornar depois da visita', unidade: 'h', grupo: 'Funil', base: 'amostra', bom: 'baixo', oQueMede: 'Quantas horas o cliente espera por notícias suas depois de visitar o imóvel. É aqui que mais se perde negócio pronto.' },

  'pct_com_proximo_passo_proposto': { rotulo: 'conversas que terminaram com data marcada', unidade: '%', grupo: 'Conversa', base: 'amostra', bom: 'alto', oQueMede: 'De cada 100 conversas, quantas acabaram com dia e hora combinados. Conversa sem data não continua sozinha.' },
  'pct_com_pergunta_aberta': { rotulo: 'conversas em que você perguntou algo', unidade: '%', grupo: 'Conversa', base: 'amostra', bom: 'alto', oQueMede: 'Em quantas conversas você fez uma pergunta de verdade, em vez de só mandar informação.' },
  'sinais_de_compra_ignorados': { rotulo: 'sinais de compra que passaram batido', unidade: '', grupo: 'Conversa', base: 'amostra', bom: 'baixo', oQueMede: 'Quantas vezes o cliente demonstrou interesse claro e a conversa não avançou por causa disso.' },
  'pct_audio_do_corretor': { rotulo: 'quanto do que você mandou foi áudio', unidade: '%', grupo: 'Conversa', base: 'amostra', bom: 'neutro', oQueMede: 'A fatia das suas mensagens que foi áudio. Nem alto nem baixo é errado — o que pesa é áudio ser o único contato.' },
  'pct_personalizacao': { rotulo: 'mensagens escritas para aquela pessoa', unidade: '%', grupo: 'Conversa', base: 'amostra', bom: 'alto', oQueMede: 'Quantas conversas tiveram mensagem feita para aquele cliente, e não texto que foi para vários.' },

  'meets_feitos': { rotulo: 'reuniões realizadas', unidade: '', grupo: 'Resultado', base: 'carteira', bom: 'alto', oQueMede: 'Quantas reuniões aconteceram no período.' },
  'visitas_feitas': { rotulo: 'visitas realizadas', unidade: '', grupo: 'Resultado', base: 'carteira', bom: 'alto', oQueMede: 'Quantas visitas ao imóvel aconteceram no período.' },
  'vendas': { rotulo: 'vendas fechadas', unidade: '', grupo: 'Resultado', base: 'carteira', bom: 'alto', oQueMede: 'Quantos negócios fecharam no período.' },
  'vgv': { rotulo: 'valor vendido', unidade: 'R$', grupo: 'Resultado', base: 'carteira', bom: 'alto', oQueMede: 'A soma do valor dos imóveis vendidos no período.' },
  'cobertura_lidos_de_20': { rotulo: 'conversas que a auditoria conseguiu ler', unidade: 'conversas', grupo: 'Resultado', base: 'amostra', bom: 'alto', oQueMede: 'Quantas conversas da amostra foram lidas de fato. Quanto menor, menos confiança nos percentuais acima.' },
};

export interface Indicador {
  n: number; chave: string; rotulo: string; unidade: string; grupo: string;
  oQueMede: string;
  base: DefIndicador['base'];
  bom: 'alto' | 'baixo' | 'neutro';
  valor: number | null; referencia: number | null;
  /**
   * De onde veio a régua. É isto que autoriza o vermelho: fora de um padrão
   * de mercado que ninguém combinou com este corretor é atenção, não
   * reprovação. Sem esta distinção, o relatório cobra um acordo que nunca
   * houve — e o corretor tem razão em ignorá-lo.
   */
  origemReferencia: 'casa' | 'mercado' | 'nenhuma';
  status: 'verde' | 'amarelo' | 'vermelho' | 'nd';
  anterior: number | null;
  /** 'melhorou' | 'piorou' | 'igual' | null — já resolvido pelo sentido do indicador. */
  rumo: 'melhorou' | 'piorou' | 'igual' | null;
}

export const COR_STATUS: Record<string, string> = {
  verde: 'text-emerald-300', amarelo: 'text-amber-300', vermelho: 'text-rose-300', nd: 'text-white/30',
};
export const BOLA_STATUS: Record<string, string> = { verde: '🟢', amarelo: '🟡', vermelho: '🔴', nd: '⚪' };

/** Casa o quadro desta rodada com o da anterior e resolve o rumo de cada linha. */
export function lerIndicadores(bruto: unknown, anterior?: unknown): Indicador[] {
  const antes = new Map<string, number | null>();
  for (const l of asArr(anterior)) antes.set(asStr(l.indicador), asNum(l.valor));

  return asArr(bruto).map((l, i) => {
    const chave = asStr(l.indicador);
    const def = DEF_INDICADOR[chave];
    const valor = asNum(l.valor);
    const ant = antes.has(chave) ? antes.get(chave)! : null;
    let st = asStr(l.status).toLowerCase();

    const og = asStr(l.origem_referencia).toLowerCase();
    const origemReferencia: Indicador['origemReferencia'] =
      og === 'casa' ? 'casa' : og === 'mercado' ? 'mercado' : 'nenhuma';

    // rede de segurança: vermelho só se sustenta contra régua da casa. Se a
    // análise pintou de vermelho um indicador cuja referência é só padrão de
    // mercado, rebaixa para amarelo — reprovar por acordo que não houve é o
    // erro que faz o corretor descartar o relatório inteiro.
    if (st === 'vermelho' && origemReferencia !== 'casa') st = 'amarelo';

    let rumo: Indicador['rumo'] = null;
    if (valor !== null && ant !== null && def && def.bom !== 'neutro') {
      if (valor === ant) rumo = 'igual';
      else rumo = (valor > ant) === (def.bom === 'alto') ? 'melhorou' : 'piorou';
    }

    return {
      n: asNum(l.n) ?? i + 1,
      chave,
      rotulo: def?.rotulo || chave.replace(/_/g, ' '),
      unidade: def?.unidade ?? '',
      grupo: def?.grupo || 'Outros',
      oQueMede: def?.oQueMede || '',
      base: def?.base || 'carteira',
      bom: def?.bom || 'neutro',
      valor,
      referencia: asNum(l.referencia),
      origemReferencia,
      status: (['verde', 'amarelo', 'vermelho', 'nd'].includes(st) ? st : 'nd') as Indicador['status'],
      anterior: ant,
      rumo,
    };
  });
}

/** "68%" · "240 h" · "R$ 0" · "n/d" */
export function valorIndicador(ind: Pick<Indicador, 'valor' | 'unidade'>): string {
  if (ind.valor === null) return 'n/d';
  if (ind.unidade === 'R$') return fmtDinheiro(ind.valor);
  if (ind.unidade === '%') return `${fmtNum(ind.valor)}%`;
  return ind.unidade ? `${fmtNum(ind.valor)} ${ind.unidade}` : fmtNum(ind.valor);
}

export function referenciaIndicador(ind: Pick<Indicador, 'referencia' | 'unidade' | 'bom'>): string {
  if (ind.referencia === null) return '—';
  const v = valorIndicador({ valor: ind.referencia, unidade: ind.unidade });
  // meta zero não se escreve "≤ 0": a régua é zero, e ponto.
  if (ind.referencia === 0) return v;
  const sinal = ind.bom === 'alto' ? '≥' : ind.bom === 'baixo' ? '≤' : '';
  return `${sinal} ${v}`.trim();
}

// ---------------------------------------------------------------------------
// vereditos e temperatura
// ---------------------------------------------------------------------------

export const VEREDITO = {
  fez_e_registrou: { simb: '✓', txt: 'fez e registrou', cor: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' },
  fez_e_nao_registrou: { simb: '⚠', txt: 'fez e não registrou', cor: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/40 text-amber-300' },
  nao_fez: { simb: '✗', txt: 'não fez', cor: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-500/40 text-rose-300' },
  nao_verificavel: { simb: '?', txt: 'não verificável', cor: 'text-white/40', bg: 'bg-white/[0.05] border-white/20 text-text-secondary' },
} as const;

export type ChaveVeredito = keyof typeof VEREDITO;

export const TEMPERATURA: Record<string, { simb: string; cor: string; ordem: number }> = {
  quente: { simb: '🔥', cor: 'text-rose-300', ordem: 0 },
  morno: { simb: '🌤', cor: 'text-amber-300', ordem: 1 },
  frio: { simb: '❄', cor: 'text-sky-300', ordem: 2 },
  perdido: { simb: '⚰', cor: 'text-white/30', ordem: 3 },
};

/** "misto" quando os dois lados pesam — é o que decide o tom da conversa. */
export function naturezaLegivel(n: string): { txt: string; cor: string } {
  const k = asStr(n).toLowerCase();
  if (k.startsWith('process')) return { txt: 'PROCESSO', cor: 'text-amber-300' };
  if (k.startsWith('atend')) return { txt: 'ATENDIMENTO', cor: 'text-rose-300' };
  if (k.startsWith('mist')) return { txt: 'MISTA', cor: 'text-orange-300' };
  return { txt: k.toUpperCase() || '—', cor: 'text-text-secondary' };
}

// ---------------------------------------------------------------------------
// rótulos dos blocos de métricas soltas
// ---------------------------------------------------------------------------

export const ROTULO_QUALIDADE: Record<string, string> = {
  tempo_resposta_mediano_min: 'resposta mediana (min)',
  conversas_com_vacuo_do_corretor: 'conversas em que ele sumiu',
  audio_pct_do_corretor: 'áudio no que enviou (%)',
  audios_acima_2min: 'áudios acima de 2 min',
  desalinho_de_canal: 'desalinho de canal',
  erros_escrita_relevantes: 'erros de escrita relevantes',
  mensagens_copiadas_entre_leads: 'mensagens copiadas entre leads',
  chamou_pelo_nome_pct: 'chamou pelo nome (%)',
  retomou_algo_pessoal_pct: 'retomou algo pessoal (%)',
  cliente_devolveu_sinal_pct: 'cliente devolveu sinal (%)',
  pergunta_aberta_pct: 'pergunta aberta (%)',
  objecao_tratada_pct: 'objeção tratada (%)',
};

export const ROTULO_OPORTUNIDADE: Record<string, string> = {
  sinais_de_compra_identificados: 'sinais de compra identificados',
  sinais_de_compra_ignorados: 'sinais de compra ignorados',
  atende_fora_do_horario_comercial: 'atende fora do horário',
  atende_fim_de_semana: 'atende fim de semana',
  chamadas_voz_sem_registro: 'chamadas de voz sem registro',
  falhas_de_conhecimento_produto: 'falhas de conhecimento de produto',
  priorizou_lead_mais_quente: 'priorizou o lead mais quente',
  recuperacao_com_angulo_novo: 'recuperação com ângulo novo',
  recuperacao_generica: 'recuperação genérica',
};

export const ROTULO_FUNIL: Record<string, string> = {
  qualificacao_financeira_pct: 'qualificação financeira (%)',
  decisor_identificado_pct: 'decisor identificado (%)',
  prazo_do_cliente_levantado_pct: 'prazo do cliente levantado (%)',
  retorno_pos_visita_mediano_h: 'retorno pós-visita (h)',
  visitas_sem_retorno_24h: 'visitas sem retorno em 24h',
  confirmou_vespera_pct: 'confirmou véspera (%)',
  concorrencia_mencionada: 'concorrência mencionada',
  intencao_ate_proposta_mediano_h: 'intenção até proposta (h)',
};

/** true/false viram Sim/Não; null vira "n/d"; número passa formatado. */
export function valorSolto(v: unknown): { txt: string; nulo: boolean } {
  if (v === null || v === undefined) return { txt: 'n/d', nulo: true };
  if (typeof v === 'boolean') return { txt: v ? 'Sim' : 'Não', nulo: false };
  const n = asNum(v);
  if (n !== null) return { txt: fmtNum(n), nulo: false };
  const s = asStr(v);
  return { txt: s || 'n/d', nulo: !s };
}

export const TIPO_DESTRAVE: Record<string, string> = {
  comercial: 'Comercial', dado: 'Dado', processo: 'Processo', treino: 'Treino',
};

export const PRAZO_LEGIVEL: Record<string, string> = {
  '7_dias': '7 dias', '30_dias': '30 dias', '7 dias': '7 dias', '30 dias': '30 dias',
};
