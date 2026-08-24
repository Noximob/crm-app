/**
 * LOCAÇÃO — a base do setor de aluguel da imobiliária.
 *
 * Três frentes usam este arquivo:
 *   1. O cadastro de imóveis/anúncios do admin (e o pacote que vai pro
 *      Claude publicar nos portais);
 *   2. Os contratos e o espelho das cobranças (que a integração Asaas vai
 *      alimentar de verdade — por enquanto o cronograma é derivado do
 *      contrato, marcado como "aguardando integração");
 *   3. O portal do cliente (locador e locatário), que hoje mostra dados de
 *      demonstração porque ainda não tem login.
 *
 * A regra de ouro do dinheiro: NENHUM valor de cobrança é inventado. Ou vem
 * do contrato (previsão, sempre rotulada de previsão), ou virá do Asaas
 * (fato). As duas coisas nunca se misturam sem rótulo.
 */

// ---------------------------------------------------------------------------
// o imóvel anunciado
// ---------------------------------------------------------------------------

export const TIPOS_IMOVEL = [
  'Apartamento', 'Casa', 'Sobrado', 'Kitnet', 'Cobertura',
  'Sala comercial', 'Loja', 'Galpão', 'Terreno',
] as const;

export const MOBILIADO = ['Não mobiliado', 'Semimobiliado', 'Mobiliado'] as const;

export const COMODIDADES = [
  'Sacada', 'Churrasqueira', 'Piscina', 'Elevador', 'Portaria 24h',
  'Academia', 'Salão de festas', 'Vista mar', 'Ar-condicionado',
  'Lavanderia', 'Playground', 'Aceita pet',
] as const;

/** Onde o anúncio deve aparecer — vira a lista de tarefas do pacote. */
export const PORTAIS = [
  'OLX', 'ZAP Imóveis', 'VivaReal', 'ImovelWeb', 'Chaves na Mão',
  'Facebook Marketplace', 'Instagram da imobiliária',
] as const;

export const GARANTIAS = [
  'Caução (depósito)', 'Fiador', 'Seguro-fiança', 'Título de capitalização',
] as const;

export const STATUS_ANUNCIO = {
  rascunho: { rotulo: 'Rascunho', cor: 'text-text-secondary' },
  anunciado: { rotulo: 'Anunciado', cor: 'text-emerald-300' },
  alugado: { rotulo: 'Alugado', cor: 'text-sky-300' },
  pausado: { rotulo: 'Pausado', cor: 'text-amber-300' },
} as const;

export type StatusAnuncio = keyof typeof STATUS_ANUNCIO;

export interface ImovelLocacao {
  id: string;
  imobiliariaId: string;
  codigo: string;             // código interno curto (ex.: LOC-004)
  titulo: string;             // título do anúncio
  tipo: string;
  status: StatusAnuncio;

  // endereço
  rua: string; numero: string; complemento: string;
  bairro: string; cidade: string; cep: string;

  // características
  quartos: number | null; suites: number | null; banheiros: number | null;
  vagas: number | null; areaPrivativa: number | null; areaTotal: number | null;
  andar: string; mobiliado: string;
  comodidades: string[];

  // valores mensais (em reais)
  aluguel: number | null; condominio: number | null;
  iptuMensal: number | null; seguroIncendio: number | null;

  // condições
  garantiasAceitas: string[];
  prazoMinimoMeses: number | null;
  disponivelAPartir: string;   // yyyy-mm-dd

  // o dono do imóvel
  locadorNome: string; locadorTelefone: string; locadorEmail: string; locadorDoc: string;

  descricao: string;
  fotos: string[];            // URLs (Storage ou externas)
  portais: string[];          // onde anunciar

  criadoEm?: unknown; atualizadoEm?: unknown;
}

export const IMOVEL_VAZIO: Omit<ImovelLocacao, 'id' | 'imobiliariaId'> = {
  codigo: '', titulo: '', tipo: 'Apartamento', status: 'rascunho',
  rua: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '',
  quartos: null, suites: null, banheiros: null, vagas: null,
  areaPrivativa: null, areaTotal: null, andar: '', mobiliado: 'Não mobiliado',
  comodidades: [],
  aluguel: null, condominio: null, iptuMensal: null, seguroIncendio: null,
  garantiasAceitas: [], prazoMinimoMeses: 12, disponivelAPartir: '',
  locadorNome: '', locadorTelefone: '', locadorEmail: '', locadorDoc: '',
  descricao: '', fotos: [], portais: [],
};

/** Total que o locatário paga por mês — sempre a soma dos quatro. */
export const totalMensal = (i: Pick<ImovelLocacao, 'aluguel' | 'condominio' | 'iptuMensal' | 'seguroIncendio'>): number =>
  (i.aluguel || 0) + (i.condominio || 0) + (i.iptuMensal || 0) + (i.seguroIncendio || 0);

export const fmtValor = (v: number | null | undefined): string =>
  v === null || v === undefined
    ? '—'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v % 1 ? 2 : 0 });

// ---------------------------------------------------------------------------
// o pacote pros portais — o que o Claude recebe pra publicar
// ---------------------------------------------------------------------------

/**
 * Gera o pacote de publicação. O mesmo desenho da Auditoria: o sistema
 * monta um documento completo e auto-suficiente, o gestor cola no Claude
 * (Cowork), e o Claude executa com as contas da imobiliária abertas no
 * navegador. Nenhum portal tem API pública de publicação — o caminho é
 * esse ou um integrador pago.
 */
export function pacotePortais(i: ImovelLocacao): string {
  const linhas: string[] = [];
  const p = (s = '') => linhas.push(s);

  p('PUBLICAÇÃO DE ANÚNCIO DE LOCAÇÃO — NOX IMÓVEIS');
  p('='.repeat(48));
  p();
  p('O QUE FAZER');
  p('Publicar o imóvel abaixo nos portais listados, usando as contas da');
  p('imobiliária já abertas no navegador. Em cada portal: preencher a ficha');
  p('completa com os dados abaixo, subir as fotos na ordem em que aparecem,');
  p('usar o título e a descrição indicados (adaptando ao limite de caracteres');
  p('do portal quando houver), conferir o preview e publicar. Ao final, me');
  p('devolva a lista de links dos anúncios publicados e qualquer campo que o');
  p('portal pediu e não está neste pacote.');
  p();
  p('REGRAS');
  p('- Não inventar dado nenhum: o que não estiver aqui, perguntar antes.');
  p('- O valor do aluguel e dos encargos é EXATAMENTE o informado.');
  p('- Não aceitar upsell/destaque pago sem me perguntar.');
  p();
  p('PORTAIS');
  (i.portais.length ? i.portais : ['(nenhum portal marcado — perguntar quais)']).forEach((x) => p(`- ${x}`));
  p();
  p('O IMÓVEL');
  p(`Código interno: ${i.codigo || '—'}`);
  p(`Título do anúncio: ${i.titulo}`);
  p(`Tipo: ${i.tipo}`);
  p(`Endereço: ${[i.rua, i.numero].filter(Boolean).join(', ')}${i.complemento ? ` — ${i.complemento}` : ''}`);
  p(`Bairro: ${i.bairro} · Cidade: ${i.cidade} · CEP: ${i.cep || '—'}`);
  p();
  p('CARACTERÍSTICAS');
  p(`Quartos: ${i.quartos ?? '—'} (sendo ${i.suites ?? 0} suíte(s)) · Banheiros: ${i.banheiros ?? '—'} · Vagas: ${i.vagas ?? '—'}`);
  p(`Área privativa: ${i.areaPrivativa ? `${i.areaPrivativa} m²` : '—'} · Área total: ${i.areaTotal ? `${i.areaTotal} m²` : '—'}`);
  p(`Andar: ${i.andar || '—'} · Mobília: ${i.mobiliado}`);
  p(`Comodidades: ${i.comodidades.length ? i.comodidades.join(', ') : '—'}`);
  p();
  p('VALORES MENSAIS');
  p(`Aluguel: ${fmtValor(i.aluguel)}`);
  p(`Condomínio: ${fmtValor(i.condominio)}`);
  p(`IPTU (mensal): ${fmtValor(i.iptuMensal)}`);
  p(`Seguro incêndio: ${fmtValor(i.seguroIncendio)}`);
  p(`TOTAL MENSAL: ${fmtValor(totalMensal(i))}`);
  p();
  p('CONDIÇÕES');
  p(`Garantias aceitas: ${i.garantiasAceitas.length ? i.garantiasAceitas.join(', ') : '—'}`);
  p(`Prazo mínimo: ${i.prazoMinimoMeses ? `${i.prazoMinimoMeses} meses` : '—'}`);
  p(`Disponível a partir de: ${i.disponivelAPartir || 'imediato'}`);
  p();
  p('DESCRIÇÃO DO ANÚNCIO');
  p(i.descricao || '(sem descrição — escrever uma a partir das características acima e me mostrar antes de publicar)');
  p();
  p('FOTOS (nesta ordem)');
  if (i.fotos.length) i.fotos.forEach((f, n) => p(`${n + 1}. ${f}`));
  else p('(sem fotos no pacote — pedir as fotos antes de publicar)');
  p();
  p('CONTATO DO ANÚNCIO');
  p('Usar SEMPRE o telefone e o e-mail da imobiliária, nunca o do proprietário.');

  return linhas.join('\n');
}

// ---------------------------------------------------------------------------
// o contrato
// ---------------------------------------------------------------------------

export const INDICES_REAJUSTE = ['IGP-M', 'IPCA', 'IVAR'] as const;

export const STATUS_CONTRATO = {
  ativo: { rotulo: 'Ativo', cor: 'text-emerald-300' },
  encerrado: { rotulo: 'Encerrado', cor: 'text-text-secondary' },
  renovacao: { rotulo: 'Em renovação', cor: 'text-amber-300' },
} as const;

export type StatusContrato = keyof typeof STATUS_CONTRATO;

export interface DocContrato { nome: string; url: string; storagePath?: string }

export interface ContratoLocacao {
  id: string;
  imobiliariaId: string;
  imovelId: string;          // referência ao cadastro do imóvel
  status: StatusContrato;

  locadorNome: string; locadorDoc: string; locadorEmail: string; locadorTelefone: string;
  /** para onde vai o repasse */
  locadorPix: string;

  locatarioNome: string; locatarioDoc: string; locatarioEmail: string; locatarioTelefone: string;

  inicio: string;            // yyyy-mm-dd
  prazoMeses: number | null;
  valorAluguel: number | null;
  diaVencimento: number | null;
  indiceReajuste: string;
  garantiaTipo: string;
  garantiaValor: number | null;
  /** % que a imobiliária retém de cada aluguel */
  taxaAdmPct: number | null;
  observacoes: string;

  documentos: DocContrato[];

  criadoEm?: unknown; atualizadoEm?: unknown;
}

export const CONTRATO_VAZIO: Omit<ContratoLocacao, 'id' | 'imobiliariaId'> = {
  imovelId: '', status: 'ativo',
  locadorNome: '', locadorDoc: '', locadorEmail: '', locadorTelefone: '', locadorPix: '',
  locatarioNome: '', locatarioDoc: '', locatarioEmail: '', locatarioTelefone: '',
  inicio: '', prazoMeses: 30, valorAluguel: null, diaVencimento: 10,
  indiceReajuste: 'IGP-M', garantiaTipo: '', garantiaValor: null,
  taxaAdmPct: 10, observacoes: '', documentos: [],
};

/** Fim da vigência derivado — nunca digitado, para não divergir do prazo. */
export function fimContrato(c: Pick<ContratoLocacao, 'inicio' | 'prazoMeses'>): string {
  if (!c.inicio || !c.prazoMeses) return '';
  const d = new Date(c.inicio + 'T12:00:00');
  d.setMonth(d.getMonth() + c.prazoMeses);
  return d.toISOString().slice(0, 10);
}

/**
 * O cronograma PREVISTO de cobranças de um contrato — competência a
 * competência, do início até o fim (limitado ao horizonte pedido). É
 * previsão derivada do contrato: quando a integração Asaas entrar, cada
 * linha destas casa com uma cobrança real e o status passa a ser fato.
 */
export interface CobrancaPrevista {
  competencia: string;       // "2026-09"
  vencimento: string;        // yyyy-mm-dd
  valor: number;
  repasseLocador: number;    // valor - taxa adm
  taxaAdm: number;
}

export function cronogramaPrevisto(c: ContratoLocacao, ateMeses = 12): CobrancaPrevista[] {
  if (!c.inicio || !c.valorAluguel || !c.diaVencimento) return [];
  const out: CobrancaPrevista[] = [];
  const ini = new Date(c.inicio + 'T12:00:00');
  const n = Math.min(c.prazoMeses || ateMeses, ateMeses);
  for (let m = 0; m < n; m++) {
    const comp = new Date(ini.getFullYear(), ini.getMonth() + m, 1);
    const venc = new Date(comp.getFullYear(), comp.getMonth(), c.diaVencimento);
    const taxaReais = Math.round(c.valorAluguel * (c.taxaAdmPct || 0)) / 100;
    out.push({
      competencia: `${comp.getFullYear()}-${String(comp.getMonth() + 1).padStart(2, '0')}`,
      vencimento: venc.toISOString().slice(0, 10),
      valor: c.valorAluguel,
      taxaAdm: taxaReais,
      repasseLocador: Math.round((c.valorAluguel - taxaReais) * 100) / 100,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// o portal do cliente — dados de demonstração
// ---------------------------------------------------------------------------

/**
 * Enquanto o portal não tem login, as duas telas rodam com este cenário.
 * É UM cenário coerente dos dois lados: o imóvel que o locador vê alugado é
 * o mesmo que o locatário vê como "seu aluguel", os mesmos valores, o mesmo
 * contrato — porque na vida real são o mesmo registro.
 */
export const DEMO_PORTAL = {
  imovel: {
    titulo: 'Apartamento 2 quartos com sacada — Centro, Penha',
    endereco: 'Rua Nereu Ramos, 245 — apto 302, Centro, Penha/SC',
    codigo: 'LOC-001',
  },
  contrato: {
    inicio: '15/03/2026',
    fim: '15/09/2028',
    prazoMeses: 30,
    indiceReajuste: 'IGP-M',
    proximoReajuste: 'março/2027',
    diaVencimento: 10,
    garantia: 'Caução (3 aluguéis)',
  },
  valores: {
    aluguel: 1850,
    condominio: 380,
    iptuMensal: 92,
    seguroIncendio: 28,
    taxaAdmPct: 10,
  },
  locador: { nome: 'Roberto Krüger' },
  locatario: { nome: 'Fernanda Lima' },
  /** meses já passados do contrato — vistos pelos dois lados */
  historico: [
    { competencia: 'julho/2026', vencimento: '10/07/2026', pagoEm: '08/07/2026', status: 'pago' as const },
    { competencia: 'junho/2026', vencimento: '10/06/2026', pagoEm: '10/06/2026', status: 'pago' as const },
    { competencia: 'maio/2026', vencimento: '10/05/2026', pagoEm: '12/05/2026', status: 'pago_atraso' as const },
    { competencia: 'abril/2026', vencimento: '10/04/2026', pagoEm: '09/04/2026', status: 'pago' as const },
    { competencia: 'março/2026', vencimento: '15/03/2026', pagoEm: '15/03/2026', status: 'pago' as const },
  ],
  proxima: { competencia: 'agosto/2026', vencimento: '10/09/2026', status: 'aberta' as const },
  avisos: [
    { data: '20/08/2026', texto: 'A manutenção do portão da garagem está agendada para 28/08, das 8h às 12h.' },
    { data: '05/08/2026', texto: 'O boleto de agosto já está disponível. Vencimento dia 10.' },
  ],
};
