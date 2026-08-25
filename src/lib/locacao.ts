/**
 * LOCAÇÃO — a fundação do setor, em DOIS FUNIS.
 *
 * A virada de chave que o gestor pediu: em vez de uma esteira só misturando
 * imóvel e inquilino, são dois caminhos que se encontram uma vez.
 *
 *   FUNIL 1 · O IMÓVEL (com o proprietário)
 *     captado → documentos do dono → contrato de administração assinado
 *     → portal do dono criado → material do anúncio (fotos, vídeo, texto)
 *     → publicado nos portais → recebendo leads
 *
 *   FUNIL 2 · A LOCAÇÃO (com o inquilino)
 *     lead interessado → documentos dele → na Loft → Loft aprovou
 *     → fiança assinada com a Loft → nosso contrato + vistoria assinados
 *     → portal do inquilino + chave entregue → cobrando (Asaas)
 *
 * O encontro: um imóvel PUBLICADO recebe leads; o lead que fecha vira uma
 * LOCAÇÃO daquele imóvel. Quando a locação ativa, o imóvel sai do ar; quando
 * encerra, ele volta pro funil 1 na etapa de publicação.
 *
 * As decisões de dinheiro que o código cristaliza:
 *   · taxa de administração SÓ sobre o aluguel;
 *   · CONDOMÍNIO o inquilino paga direto à administradora (fora da cobrança);
 *   · IPTU a Nox cobra e repassa inteiro ao dono, discriminado;
 *   · repasse num PIX só (aluguel − taxa + IPTU).
 *
 * Tudo que depende de conta externa (ClickSign, Loft, Asaas, portais) roda
 * em SIMULAÇÃO rotulada até as integrações ligarem.
 */

// ═══════════════════════════════════════════════════════════════════════════
// FUNIL 1 · O IMÓVEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * As etapas do imóvel. A ordem é a da vida real e cada uma só abre quando a
 * anterior fecha — é isso que impede anunciar sem autorização do dono.
 */
export const ETAPAS_IMOVEL = {
  captado: {
    n: 1, rotulo: 'Captado', icone: '🏠',
    oQueFalta: 'juntar os documentos do proprietário',
    ajuda: 'imóvel registrado; falta a papelada do dono',
  },
  docs_dono: {
    n: 2, rotulo: 'Documentos do dono', icone: '📎',
    oQueFalta: 'gerar e enviar o contrato de administração',
    ajuda: 'RG/CPF, matrícula e IPTU do proprietário',
  },
  adm_enviada: {
    n: 3, rotulo: 'Administração enviada', icone: '✍',
    oQueFalta: 'aguardando o dono assinar pela ClickSign',
    ajuda: 'contrato de administração no WhatsApp do proprietário',
  },
  adm_assinada: {
    n: 4, rotulo: 'Administração assinada', icone: '🤝',
    oQueFalta: 'montar o material do anúncio (fotos, vídeo, descrição)',
    ajuda: 'autorizado a administrar; portal do dono já criado',
  },
  material: {
    n: 5, rotulo: 'Material pronto', icone: '📸',
    oQueFalta: 'publicar nos portais',
    ajuda: 'fotos, vídeo e descrição prontos para os portais',
  },
  publicado: {
    n: 6, rotulo: 'Publicado', icone: '📣',
    oQueFalta: 'recebendo interessados dos portais',
    ajuda: 'no ar em OLX, ZAP, VivaReal e ImovelWeb',
  },
  alugado: {
    n: 7, rotulo: 'Alugado', icone: '🔑',
    oQueFalta: '',
    ajuda: 'fora do ar — locação ativa',
  },
  pausado: {
    n: 0, rotulo: 'Pausado', icone: '⏸',
    oQueFalta: 'voltar ao ar quando quiser',
    ajuda: 'retirado dos portais por decisão da casa ou do dono',
  },
} as const;
export type EtapaImovel = keyof typeof ETAPAS_IMOVEL;

export const TIPOS_IMOVEL = [
  'Apartamento', 'Casa', 'Sobrado', 'Kitnet', 'Cobertura',
  'Sala comercial', 'Loja', 'Galpão', 'Terreno',
] as const;

const TIPO_VRSYNC: Record<string, string> = {
  'Apartamento': 'Residential / Apartment', 'Casa': 'Residential / Home',
  'Sobrado': 'Residential / Home', 'Kitnet': 'Residential / Kitnet',
  'Cobertura': 'Residential / Penthouse', 'Sala comercial': 'Commercial / Office',
  'Loja': 'Commercial / Building', 'Galpão': 'Commercial / Industrial',
  'Terreno': 'Residential / Land Lot',
};

export const MOBILIADO = ['Não mobiliado', 'Semimobiliado', 'Mobiliado'] as const;

export const COMODIDADES = [
  'Sacada', 'Churrasqueira', 'Piscina', 'Elevador', 'Portaria 24h',
  'Academia', 'Salão de festas', 'Vista mar', 'Ar-condicionado',
  'Lavanderia', 'Playground', 'Aceita pet',
] as const;

const FEATURE_VRSYNC: Record<string, string> = {
  'Piscina': 'Pool', 'Elevador': 'Elevator', 'Academia': 'Gym',
  'Churrasqueira': 'BBQ', 'Playground': 'Playground', 'Sacada': 'Balcony',
  'Salão de festas': 'Party Room', 'Lavanderia': 'Laundry',
  'Ar-condicionado': 'Air Conditioning',
};

export const GARANTIAS = [
  'Seguro-fiança (Loft)', 'Caução (depósito)', 'Fiador', 'Título de capitalização',
] as const;

/** Onde o anúncio vai parar. Os três primeiros por feed; o resto pelo Cowork. */
export const PORTAIS = [
  { chave: 'grupo_olx', nome: 'OLX + ZAP + VivaReal', via: 'feed' },
  { chave: 'imovelweb', nome: 'ImovelWeb', via: 'feed' },
  { chave: 'chaves_na_mao', nome: 'Chaves na Mão', via: 'feed' },
  { chave: 'instagram', nome: 'Instagram', via: 'cowork' },
  { chave: 'facebook', nome: 'Facebook Marketplace', via: 'cowork' },
] as const;

/** As gavetas de documento do PROPRIETÁRIO. */
export const DOCS_DONO = [
  'RG/CPF do proprietário', 'Matrícula do imóvel', 'Carnê do IPTU',
  'Comprovante de endereço', 'Procuração', 'Outros',
] as const;

export interface Arquivo { nome: string; url: string; storagePath?: string; categoria?: string }

export interface ImovelLocacao {
  id: string;
  imobiliariaId: string;
  codigo: string;
  etapa: EtapaImovel;

  // ——— o proprietário ———
  donoNome: string; donoDoc: string; donoRg: string;
  donoEmail: string; donoTelefone: string; donoPix: string;
  donoEstadoCivil: string; donoProfissao: string; donoEndereco: string;
  docsDono: Arquivo[];

  // ——— o contrato de administração ———
  admEnviadaEm: string;
  admAssinadaEm: string;
  admSimulada: boolean;
  /** % que a casa retém de cada aluguel — combinado na captação */
  taxaAdmPct: number | null;

  // ——— o imóvel ———
  titulo: string; tipo: string;
  rua: string; numero: string; complemento: string;
  bairro: string; cidade: string; cep: string;
  latitude: string; longitude: string;
  quartos: number | null; suites: number | null; banheiros: number | null;
  vagas: number | null; areaPrivativa: number | null; areaTotal: number | null;
  andar: string; mobiliado: string;
  comodidades: string[];

  // ——— valores ———
  aluguel: number | null;
  /** informativo: o inquilino paga direto à administradora do condomínio */
  condominio: number | null;
  iptuMensal: number | null;
  seguroIncendio: number | null;
  garantiasAceitas: string[];
  prazoMinimoMeses: number | null;
  disponivelAPartir: string;

  // ——— o material do anúncio ———
  descricao: string;
  fotos: string[];
  videoUrl: string;
  tourVirtualUrl: string;
  portais: string[];
  publicadoEm: string;

  criadoEm?: unknown; atualizadoEm?: unknown;
}

export const IMOVEL_VAZIO: Omit<ImovelLocacao, 'id' | 'imobiliariaId'> = {
  codigo: '', etapa: 'captado',
  donoNome: '', donoDoc: '', donoRg: '', donoEmail: '', donoTelefone: '', donoPix: '',
  donoEstadoCivil: '', donoProfissao: '', donoEndereco: '', docsDono: [],
  admEnviadaEm: '', admAssinadaEm: '', admSimulada: false, taxaAdmPct: 10,
  titulo: '', tipo: 'Apartamento',
  rua: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '',
  latitude: '', longitude: '',
  quartos: null, suites: null, banheiros: null, vagas: null,
  areaPrivativa: null, areaTotal: null, andar: '', mobiliado: 'Não mobiliado',
  comodidades: [],
  aluguel: null, condominio: null, iptuMensal: null, seguroIncendio: null,
  garantiasAceitas: ['Seguro-fiança (Loft)'], prazoMinimoMeses: 12, disponivelAPartir: '',
  descricao: '', fotos: [], videoUrl: '', tourVirtualUrl: '', portais: [], publicadoEm: '',
};

/** O que falta para o imóvel andar de etapa — a lista que a tela mostra. */
export function pendenciasImovel(i: Omit<ImovelLocacao, 'id' | 'imobiliariaId'>): Record<string, string[]> {
  const p: Record<string, string[]> = { docs: [], adm: [], material: [] };

  if (!i.donoNome.trim()) p.docs.push('Nome do proprietário');
  if (!i.donoTelefone.trim()) p.docs.push('WhatsApp do proprietário');
  if (!i.donoDoc.trim()) p.docs.push('CPF/CNPJ do proprietário');
  if (!i.donoPix.trim()) p.docs.push('Chave PIX para o repasse');
  if (!i.docsDono.length) p.docs.push('Ao menos um documento anexado (RG/CPF, matrícula…)');

  if (!i.aluguel) p.adm.push('Valor do aluguel');
  if (!i.rua.trim() || !i.bairro.trim() || !i.cidade.trim()) p.adm.push('Endereço do imóvel');

  if (!i.titulo.trim() || i.titulo.trim().length < 10) p.material.push('Título com 10+ caracteres');
  if (i.descricao.trim().length < 50) p.material.push(`Descrição com 50+ caracteres (tem ${i.descricao.trim().length})`);
  if (i.fotos.length < 5) p.material.push(`Mínimo de 5 fotos (tem ${i.fotos.length}) — regra do Grupo OLX`);
  if (!i.cep.trim()) p.material.push('CEP');
  if (!i.portais.length) p.material.push('Escolher ao menos um portal');

  return p;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNIL 2 · A LOCAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * As etapas da locação, do interessado às chaves. Cada uma tem o que falta e
 * quem está devendo — o gestor lê a linha e sabe se a bola é dele ou de fora.
 */
export const ETAPAS_LOCACAO = {
  interessado: {
    n: 1, rotulo: 'Interessado', icone: '📨', comQuem: 'nós',
    oQueFalta: 'confirmar o interesse e pedir os documentos',
    ajuda: 'chegou de um portal ou foi cadastrado à mão',
  },
  docs_inquilino: {
    n: 2, rotulo: 'Documentos', icone: '📎', comQuem: 'inquilino',
    oQueFalta: 'juntar CNH/RG, CPF e comprovante de renda',
    ajuda: 'a papelada que a Loft vai analisar',
  },
  na_loft: {
    n: 3, rotulo: 'Na Loft', icone: '🛡', comQuem: 'loft',
    oQueFalta: 'aguardando a análise da garantia',
    ajuda: 'resposta em menos de 1 minuto quando integrado',
  },
  loft_aprovou: {
    n: 4, rotulo: 'Loft aprovou', icone: '✅', comQuem: 'loft',
    oQueFalta: 'a Loft envia a fiança para o inquilino assinar',
    ajuda: 'contrato de fiança é entre o inquilino e a Loft',
  },
  fianca_assinada: {
    n: 5, rotulo: 'Fiança assinada', icone: '📜', comQuem: 'nós',
    oQueFalta: 'fazer a vistoria e gerar o nosso contrato',
    ajuda: 'garantia válida — pode fechar a locação',
  },
  contrato_enviado: {
    n: 6, rotulo: 'Contrato enviado', icone: '✍', comQuem: 'ambos',
    oQueFalta: 'aguardando dono e inquilino assinarem',
    ajuda: 'contrato + laudo de vistoria num envelope só',
  },
  contrato_assinado: {
    n: 7, rotulo: 'Tudo assinado', icone: '🤝', comQuem: 'nós',
    oQueFalta: 'marcar e fazer a entrega das chaves',
    ajuda: 'portal do inquilino criado na entrega',
  },
  ativa: {
    n: 8, rotulo: 'Cobrando', icone: '💰', comQuem: 'asaas',
    oQueFalta: '',
    ajuda: 'cobrança e repasse rodando',
  },
  encerrando: {
    n: 9, rotulo: 'Em saída', icone: '↪', comQuem: 'nós',
    oQueFalta: 'vistoria de saída e distrato',
    ajuda: 'o inquilino avisou que sai',
  },
  encerrada: { n: 10, rotulo: 'Encerrada', icone: '📁', comQuem: '', oQueFalta: '', ajuda: 'histórico' },
  perdida: { n: 0, rotulo: 'Não fechou', icone: '✕', comQuem: '', oQueFalta: '', ajuda: 'desistiu ou a Loft recusou' },
} as const;
export type EtapaLocacao = keyof typeof ETAPAS_LOCACAO;

export const DOCS_INQUILINO = [
  'CNH ou RG', 'CPF', 'Comprovante de renda', 'Comprovante de endereço',
  'Contrato assinado', 'Laudo de vistoria', 'Fiança da Loft', 'Outros',
] as const;

export const INDICES_REAJUSTE = ['IGP-M', 'IPCA', 'IVAR'] as const;

/**
 * A VISTORIA como a casa faz: o registro visual são as FOTOS DO ANÚNCIO (o
 * imóvel foi fotografado na captação e está vazio). Marca-se o que fica no
 * imóvel e as ressalvas do que não está perfeito. Na saída, só o que mudou.
 */
export interface RessalvaVistoria { onde: string; oque: string }

export interface Vistoria {
  feitaEm: string;
  feitaPor: string;
  fotos: string[];
  itens: string[];
  ressalvas: RessalvaVistoria[];
  assinada: boolean;
  assinadaSimulada: boolean;
}

export const ITENS_VISTORIA = [
  'Chaves (jogo completo)', 'Controle do portão', 'Fogão', 'Geladeira',
  'Armários da cozinha', 'Armário do quarto', 'Ar-condicionado', 'Chuveiro',
  'Luminárias', 'Cortinas', 'Box do banheiro', 'Tanque', 'Varal',
] as const;

export const LOCAIS_VISTORIA = [
  'Sala', 'Cozinha', 'Quarto', 'Banheiro', 'Área de serviço', 'Sacada', 'Garagem', 'Fachada',
] as const;

export interface ReajusteAplicado { em: string; de: number; para: number; indice: string; percentual: number }

export interface Locacao {
  id: string;
  imobiliariaId: string;
  imovelId: string;
  etapa: EtapaLocacao;

  // ——— o inquilino ———
  nome: string; telefone: string; email: string;
  doc: string; rg: string; estadoCivil: string; profissao: string; enderecoAtual: string;
  docsInquilino: Arquivo[];
  /** de onde veio: manual | grupo_olx | imovelweb | instagram… */
  origem: string;
  /** o Grupo OLX manda a temperatura avaliada por eles */
  temperatura: '' | 'baixa' | 'media' | 'alta';
  mensagem: string;
  corretorNome: string;

  // ——— a garantia (com a Loft) ———
  garantiaTipo: string;
  garantiaNumero: string;
  garantiaTaxaMensalPct: number | null;
  garantiaVigenciaFim: string;
  garantiaEnviadaEm: string;
  garantiaAssinadaEm: string;
  garantiaSimulada: boolean;

  // ——— o nosso contrato ———
  inicio: string;
  prazoMeses: number | null;
  valorAluguel: number | null;
  valorCondominio: number | null;
  valorIptuMensal: number | null;
  valorSeguroIncendio: number | null;
  diaVencimento: number | null;
  indiceReajuste: string;
  taxaAdmPct: number | null;
  contratoEnviadoEm: string;
  contratoAssinadoEm: string;
  contratoSimulado: boolean;
  reajustes: ReajusteAplicado[];

  vistoriaEntrada: Vistoria | null;
  vistoriaSaida: Vistoria | null;

  chavesEntreguesEm: string;
  observacoes: string;
  encerradaEm: string;
  motivoPerda: string;

  criadoEm?: unknown; atualizadoEm?: unknown;
}

export const LOCACAO_VAZIA: Omit<Locacao, 'id' | 'imobiliariaId'> = {
  imovelId: '', etapa: 'interessado',
  nome: '', telefone: '', email: '', doc: '', rg: '', estadoCivil: '', profissao: '',
  enderecoAtual: '', docsInquilino: [], origem: 'manual', temperatura: '', mensagem: '', corretorNome: '',
  garantiaTipo: 'Seguro-fiança (Loft)', garantiaNumero: '', garantiaTaxaMensalPct: null,
  garantiaVigenciaFim: '', garantiaEnviadaEm: '', garantiaAssinadaEm: '', garantiaSimulada: false,
  inicio: '', prazoMeses: 30, valorAluguel: null, valorCondominio: null,
  valorIptuMensal: null, valorSeguroIncendio: null, diaVencimento: 5,
  indiceReajuste: 'IGP-M', taxaAdmPct: 10,
  contratoEnviadoEm: '', contratoAssinadoEm: '', contratoSimulado: false, reajustes: [],
  vistoriaEntrada: null, vistoriaSaida: null,
  chavesEntreguesEm: '', observacoes: '', encerradaEm: '', motivoPerda: '',
};

/** O que falta para a locação andar. */
export function pendenciasLocacao(l: Locacao): string[] {
  const p: string[] = [];
  if (l.etapa === 'docs_inquilino') {
    if (!l.doc.trim()) p.push('CPF do inquilino');
    if (!l.docsInquilino.length) p.push('Ao menos um documento (CNH/RG, renda)');
  }
  if (l.etapa === 'fianca_assinada') {
    if (!l.vistoriaEntrada) p.push('Vistoria de entrada');
    if (!l.valorAluguel) p.push('Valor do aluguel');
    if (!l.inicio) p.push('Data de início prevista');
    if (!l.rg.trim() || !l.estadoCivil.trim()) p.push('Qualificação completa do inquilino (RG, estado civil, profissão)');
  }
  return p;
}

// ═══════════════════════════════════════════════════════════════════════════
// O DINHEIRO
// ═══════════════════════════════════════════════════════════════════════════

export const STATUS_COBRANCA = {
  prevista: { rotulo: 'Prevista', cor: 'text-text-secondary' },
  emitida: { rotulo: 'Emitida', cor: 'text-sky-300' },
  paga: { rotulo: 'Paga', cor: 'text-emerald-300' },
  atrasada: { rotulo: 'Atrasada', cor: 'text-rose-300' },
} as const;
export type StatusCobranca = keyof typeof STATUS_COBRANCA;

export const STATUS_REPASSE = {
  aguardando: { rotulo: 'Aguarda pagamento', cor: 'text-text-secondary' },
  liberado: { rotulo: 'Liberado', cor: 'text-amber-300' },
  repassado: { rotulo: 'Repassado', cor: 'text-emerald-300' },
} as const;
export type StatusRepasse = keyof typeof STATUS_REPASSE;

export interface Movimento {
  id: string;
  imobiliariaId: string;
  locacaoId: string;
  competencia: string;
  vencimento: string;
  valorAluguel: number;
  valorIptu: number;
  valorSeguro: number;
  valorTotal: number;
  taxaAdm: number;
  repasseDono: number;
  statusCobranca: StatusCobranca;
  pagoEm: string;
  statusRepasse: StatusRepasse;
  repassadoEm: string;
  simulado: boolean;
  criadoEm?: unknown;
}

export function gerarMovimentos(l: Locacao): Omit<Movimento, 'id' | 'imobiliariaId' | 'criadoEm'>[] {
  if (!l.inicio || !l.valorAluguel || !l.diaVencimento || !l.prazoMeses) return [];
  const out: Omit<Movimento, 'id' | 'imobiliariaId' | 'criadoEm'>[] = [];
  const ini = new Date(l.inicio + 'T12:00:00');
  const aluguel = l.valorAluguel;
  const iptu = l.valorIptuMensal || 0;   // cobrado e repassado inteiro ao dono
  const seguro = l.valorSeguroIncendio || 0;
  const taxa = Math.round(aluguel * (l.taxaAdmPct || 0)) / 100;

  for (let m = 0; m < l.prazoMeses; m++) {
    const comp = new Date(ini.getFullYear(), ini.getMonth() + m, 1);
    const venc = new Date(comp.getFullYear(), comp.getMonth(), l.diaVencimento);
    out.push({
      locacaoId: l.id,
      competencia: `${comp.getFullYear()}-${String(comp.getMonth() + 1).padStart(2, '0')}`,
      vencimento: venc.toISOString().slice(0, 10),
      valorAluguel: aluguel, valorIptu: iptu, valorSeguro: seguro,
      valorTotal: aluguel + iptu + seguro,   // condomínio fica fora
      taxaAdm: taxa,
      repasseDono: Math.round((aluguel - taxa + iptu) * 100) / 100,
      statusCobranca: 'prevista', pagoEm: '',
      statusRepasse: 'aguardando', repassadoEm: '',
      simulado: false,
    });
  }
  return out;
}

export const calcularReajuste = (valor: number, pct: number): number =>
  Math.round(valor * (1 + pct / 100) * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════════
// MANUTENÇÃO
// ═══════════════════════════════════════════════════════════════════════════

export const STATUS_CHAMADO = {
  aberto: { rotulo: 'Aberto', cor: 'text-rose-300' },
  orcando: { rotulo: 'Orçando', cor: 'text-amber-300' },
  aguardando_dono: { rotulo: 'Aguardando o dono', cor: 'text-amber-300' },
  executando: { rotulo: 'Em execução', cor: 'text-sky-300' },
  resolvido: { rotulo: 'Resolvido', cor: 'text-emerald-300' },
} as const;
export type StatusChamado = keyof typeof STATUS_CHAMADO;

export interface Chamado {
  id: string;
  imobiliariaId: string;
  locacaoId: string;
  imovelId: string;
  origem: string;
  descricao: string;
  status: StatusChamado;
  orcamento: number | null;
  quemPaga: '' | 'dono' | 'inquilino';
  resposta: string;
  criadoEm?: unknown; atualizadoEm?: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// FERRAMENTAS
// ═══════════════════════════════════════════════════════════════════════════

export const fmtValor = (v: number | null | undefined): string =>
  v === null || v === undefined
    ? '—'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v % 1 ? 2 : 0 });

export const fmtData = (ymd?: string): string => (ymd ? ymd.split('-').reverse().join('/') : '—');
export const hojeYmd = (): string => new Date().toISOString().slice(0, 10);

export const totalInquilino = (x: { aluguel?: number | null; iptuMensal?: number | null; seguroIncendio?: number | null }): number =>
  (x.aluguel || 0) + (x.iptuMensal || 0) + (x.seguroIncendio || 0);

/** Custo total do imóvel pro inquilino, incluindo o condomínio (que ele paga direto). */
export const custoTotalMensal = (i: Pick<ImovelLocacao, 'aluguel' | 'condominio' | 'iptuMensal' | 'seguroIncendio'>): number =>
  (i.aluguel || 0) + (i.condominio || 0) + (i.iptuMensal || 0) + (i.seguroIncendio || 0);

export function linkWhats(telefone: string, texto = ''): string {
  const n = (telefone || '').replace(/\D/g, '');
  if (n.length < 10) return '';
  return `https://wa.me/${n.startsWith('55') ? n : '55' + n}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}

export async function buscarCep(cep: string): Promise<{ rua: string; bairro: string; cidade: string } | null> {
  const limpo = (cep || '').replace(/\D/g, '');
  if (limpo.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const d = await r.json();
    if (d.erro) return null;
    return {
      rua: String(d.logradouro || ''), bairro: String(d.bairro || ''),
      cidade: [d.localidade, d.uf].filter(Boolean).join('/'),
    };
  } catch { return null; }
}

export function fimContrato(l: Pick<Locacao, 'inicio' | 'prazoMeses'>): string {
  if (!l.inicio || !l.prazoMeses) return '';
  const d = new Date(l.inicio + 'T12:00:00');
  d.setMonth(d.getMonth() + l.prazoMeses);
  return d.toISOString().slice(0, 10);
}

export function proximoReajuste(l: Pick<Locacao, 'inicio'>): string {
  if (!l.inicio) return '';
  const d = new Date(l.inicio + 'T12:00:00');
  const hoje = new Date();
  while (d <= hoje) d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function diasAte(ymd: string): number | null {
  if (!ymd) return null;
  return Math.ceil((new Date(ymd + 'T12:00:00').getTime() - Date.now()) / 864e5);
}

export interface Alerta { tipo: 'garantia' | 'reajuste' | 'vigencia' | 'chamado'; texto: string; grave: boolean }

export function alertasDaLocacao(l: Locacao): Alerta[] {
  if (l.etapa !== 'ativa') return [];
  const out: Alerta[] = [];

  const dg = diasAte(l.garantiaVigenciaFim);
  if (l.garantiaVigenciaFim && dg !== null) {
    if (dg < 0) out.push({ tipo: 'garantia', grave: true, texto: `Garantia VENCIDA há ${-dg} dias — o dono está descoberto. Renovar com a Loft agora.` });
    else if (dg <= 45) out.push({ tipo: 'garantia', grave: dg <= 15, texto: `Garantia vence em ${dg} dias (${fmtData(l.garantiaVigenciaFim)}) — renovar com a Loft.` });
  }

  const rj = proximoReajuste(l);
  const dr = diasAte(rj);
  if (dr !== null && dr <= 60) {
    out.push({
      tipo: 'reajuste', grave: dr < 0,
      texto: dr < 0
        ? `Reajuste VENCIDO há ${-dr} dias — o aluguel está defasado desde ${fmtData(rj)}.`
        : `Reajuste anual (${l.indiceReajuste}) em ${dr} dias (${fmtData(rj)}) — aplicar e comunicar.`,
    });
  }

  const df = diasAte(fimContrato(l));
  if (df !== null && df <= 90) {
    out.push({ tipo: 'vigencia', grave: df <= 30, texto: `Contrato termina em ${df} dias (${fmtData(fimContrato(l))}) — renovar ou iniciar a saída.` });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// OS FEEDS E O PACOTE DO COWORK
// ═══════════════════════════════════════════════════════════════════════════

const xmlEsc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** O feed VRSync (OLX + ZAP + VivaReal), gerado dos imóveis publicados. */
export function gerarFeedVrsync(
  imoveis: ImovelLocacao[],
  contato: { nome: string; email: string; telefone: string },
): string {
  const L: string[] = [];
  const p = (s: string) => L.push(s);

  p('<?xml version="1.0" encoding="UTF-8"?>');
  p('<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync"');
  p('  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  p('  xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync http://xml.vivareal.com/vrsync.xsd">');
  p('  <Header>');
  p('    <Provider>Nox Imóveis — sistema próprio</Provider>');
  p(`    <Email>${xmlEsc(contato.email)}</Email>`);
  p(`    <ContactName>${xmlEsc(contato.nome)}</ContactName>`);
  p(`    <PublishDate>${new Date().toISOString()}</PublishDate>`);
  p(`    <Telephone>${xmlEsc(contato.telefone)}</Telephone>`);
  p('  </Header>');
  p('  <Listings>');

  for (const i of imoveis.filter((x) => x.etapa === 'publicado' && x.portais.includes('grupo_olx'))) {
    p('    <Listing>');
    p(`      <ListingID>${xmlEsc(i.codigo || i.id)}</ListingID>`);
    p(`      <Title><![CDATA[${i.titulo}]]></Title>`);
    p('      <TransactionType>For Rent</TransactionType>');
    p('      <Details>');
    p(`        <PropertyType>${TIPO_VRSYNC[i.tipo] || 'Residential / Apartment'}</PropertyType>`);
    p(`        <Description><![CDATA[${i.descricao}]]></Description>`);
    if (i.aluguel) p(`        <RentalPrice currency="BRL" period="Monthly">${i.aluguel}</RentalPrice>`);
    if (i.condominio) p(`        <PropertyAdministrationFee currency="BRL">${i.condominio}</PropertyAdministrationFee>`);
    if (i.iptuMensal) p(`        <Iptu currency="BRL" period="Monthly">${i.iptuMensal}</Iptu>`);
    if (i.areaPrivativa) p(`        <LivingArea unit="square metres">${i.areaPrivativa}</LivingArea>`);
    if (i.areaTotal) p(`        <LotArea unit="square metres">${i.areaTotal}</LotArea>`);
    if (i.quartos !== null) p(`        <Bedrooms>${i.quartos}</Bedrooms>`);
    if (i.banheiros !== null) p(`        <Bathrooms>${i.banheiros}</Bathrooms>`);
    if (i.suites !== null) p(`        <Suites>${i.suites}</Suites>`);
    if (i.vagas !== null) p(`        <Garage type="Parking Space">${i.vagas}</Garage>`);
    const feats = i.comodidades.map((c) => FEATURE_VRSYNC[c]).filter(Boolean);
    if (feats.length) {
      p('        <Features>');
      feats.forEach((f) => p(`          <Feature>${f}</Feature>`));
      p('        </Features>');
    }
    p('      </Details>');
    p('      <Location displayAddress="Neighborhood">');
    p('        <Country abbreviation="BR">Brasil</Country>');
    p('        <State abbreviation="SC">Santa Catarina</State>');
    p(`        <City>${xmlEsc(i.cidade.replace(/\/.*$/, '').trim() || 'Penha')}</City>`);
    p(`        <Neighborhood>${xmlEsc(i.bairro)}</Neighborhood>`);
    if (i.rua) p(`        <Address>${xmlEsc(i.rua)}</Address>`);
    if (i.numero) p(`        <StreetNumber>${xmlEsc(i.numero)}</StreetNumber>`);
    if (i.cep) p(`        <PostalCode>${xmlEsc(i.cep.replace(/\D/g, ''))}</PostalCode>`);
    if (i.latitude && i.longitude) {
      p(`        <Latitude>${xmlEsc(i.latitude)}</Latitude>`);
      p(`        <Longitude>${xmlEsc(i.longitude)}</Longitude>`);
    }
    p('      </Location>');
    p('      <ContactInfo>');
    p(`        <Name>${xmlEsc(contato.nome)}</Name>`);
    p(`        <Email>${xmlEsc(contato.email)}</Email>`);
    p(`        <Telephone>${xmlEsc(contato.telefone)}</Telephone>`);
    p('      </ContactInfo>');
    p('      <Media>');
    i.fotos.forEach((url, n) => p(`        <Item medium="image"${n === 0 ? ' primary="true"' : ''}>${xmlEsc(url)}</Item>`));
    if (i.videoUrl) p(`        <Item medium="video">${xmlEsc(i.videoUrl)}</Item>`);
    p('      </Media>');
    if (i.tourVirtualUrl) p(`      <VirtualTourLink>${xmlEsc(i.tourVirtualUrl)}</VirtualTourLink>`);
    p('    </Listing>');
  }
  p('  </Listings>');
  p('</ListingDataFeed>');
  return L.join('\n');
}

/** O pacote pro Claude publicar onde não tem feed (Instagram/Facebook). */
export function pacoteCowork(i: ImovelLocacao): string {
  const L: string[] = [];
  const p = (s = '') => L.push(s);
  p('PUBLICAÇÃO DE ANÚNCIO DE LOCAÇÃO — NOX IMÓVEIS');
  p('='.repeat(48));
  p();
  p('O QUE FAZER');
  p('Publicar o imóvel abaixo nos canais listados, com as contas da');
  p('imobiliária abertas. Subir as fotos na ordem, usar o texto indicado,');
  p('conferir o preview e publicar. Devolver os links.');
  p();
  p('REGRAS: não inventar dado; valores EXATOS; nada de destaque pago sem perguntar.');
  p();
  p('CANAIS');
  const cowork = i.portais.filter((c) => PORTAIS.find((x) => x.chave === c)?.via === 'cowork');
  (cowork.length ? cowork.map((c) => PORTAIS.find((x) => x.chave === c)?.nome || c) : ['(nenhum marcado)'])
    .forEach((x) => p(`- ${x}`));
  p();
  p(`IMÓVEL ${i.codigo} — ${i.titulo}`);
  p(`${i.tipo} · ${[i.rua, i.numero].filter(Boolean).join(', ')}${i.complemento ? ` — ${i.complemento}` : ''}`);
  p(`${i.bairro} · ${i.cidade} · CEP ${i.cep || '—'}`);
  p(`Quartos ${i.quartos ?? '—'} (${i.suites ?? 0} suíte) · Banheiros ${i.banheiros ?? '—'} · Vagas ${i.vagas ?? '—'}`);
  p(`Área ${i.areaPrivativa ? i.areaPrivativa + ' m²' : '—'} · ${i.mobiliado} · Andar ${i.andar || '—'}`);
  p(`Comodidades: ${i.comodidades.join(', ') || '—'}`);
  p();
  p(`Aluguel ${fmtValor(i.aluguel)} · Condomínio ${fmtValor(i.condominio)} · IPTU ${fmtValor(i.iptuMensal)} · Seguro ${fmtValor(i.seguroIncendio)}`);
  p(`CUSTO MENSAL TOTAL: ${fmtValor(custoTotalMensal(i))}`);
  p(`Garantias: ${i.garantiasAceitas.join(', ') || '—'} · Prazo mínimo ${i.prazoMinimoMeses || '—'} meses`);
  p();
  p('DESCRIÇÃO');
  p(i.descricao || '(escrever a partir das características e me mostrar antes)');
  p();
  p('FOTOS (nesta ordem)');
  i.fotos.forEach((f, n) => p(`${n + 1}. ${f}`));
  if (i.videoUrl) { p(); p(`VÍDEO: ${i.videoUrl}`); }
  if (i.tourVirtualUrl) p(`TOUR VIRTUAL: ${i.tourVirtualUrl}`);
  p();
  p('CONTATO: sempre o telefone e e-mail da imobiliária, nunca o do proprietário.');
  return L.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// O PORTAL DO CLIENTE
// ═══════════════════════════════════════════════════════════════════════════

export interface DadosPortal {
  demo: boolean;
  aguardandoLocacao?: boolean;
  imovel: { titulo: string; endereco: string; codigo: string };
  dono: { nome: string };
  inquilino: { nome: string };
  contrato: {
    inicio: string; fim: string; prazoMeses: number | null;
    indiceReajuste: string; proximoReajuste: string;
    diaVencimento: number | null; garantia: string;
  };
  valores: {
    aluguel: number; condominio: number; iptuMensal: number; seguroIncendio: number;
    taxaAdmPct: number; totalInquilino: number; taxaAdm: number; repasseDono: number;
  };
  historico: { competencia: string; vencimento: string; pagoEm: string; status: 'pago' | 'pago_atraso' | 'aberta' | 'prevista' }[];
  proxima: { competencia: string; vencimento: string } | null;
  avisos: { data: string; texto: string }[];
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const compLegivel = (c: string) => {
  const [ano, mes] = c.split('-');
  return `${MESES[Number(mes) - 1]}/${ano}`;
};

const enderecoDe = (i?: ImovelLocacao) => i
  ? `${[i.rua, i.numero].filter(Boolean).join(', ')}${i.complemento ? ` — ${i.complemento}` : ''}, ${i.bairro}, ${i.cidade}`
  : '';

/** O portal do DONO desde a assinatura da administração — antes de alugar. */
export function portalDoImovel(i: ImovelLocacao): DadosPortal {
  const et = ETAPAS_IMOVEL[i.etapa] || ETAPAS_IMOVEL.captado;
  const taxa = Math.round((i.aluguel || 0) * (i.taxaAdmPct || 0)) / 100;
  return {
    demo: false, aguardandoLocacao: true,
    imovel: { titulo: i.titulo, endereco: enderecoDe(i), codigo: i.codigo },
    dono: { nome: i.donoNome }, inquilino: { nome: '' },
    contrato: { inicio: '—', fim: '—', prazoMeses: null, indiceReajuste: '—', proximoReajuste: '—', diaVencimento: null, garantia: i.garantiasAceitas.join(', ') || '—' },
    valores: {
      aluguel: i.aluguel || 0, condominio: i.condominio || 0, iptuMensal: i.iptuMensal || 0,
      seguroIncendio: i.seguroIncendio || 0, taxaAdmPct: i.taxaAdmPct || 0,
      totalInquilino: totalInquilino({ aluguel: i.aluguel, iptuMensal: i.iptuMensal, seguroIncendio: i.seguroIncendio }),
      taxaAdm: taxa, repasseDono: (i.aluguel || 0) - taxa + (i.iptuMensal || 0),
    },
    historico: [], proxima: null,
    avisos: [{ data: '', texto: `Seu imóvel está em "${et.rotulo}". Assim que for alugado, os pagamentos e repasses aparecem aqui.` }],
  };
}

export function portalDaLocacao(l: Locacao, i: ImovelLocacao | undefined, movs: Movimento[]): DadosPortal {
  const aluguel = l.valorAluguel || 0;
  const taxa = Math.round(aluguel * (l.taxaAdmPct || 0)) / 100;
  const iptu = l.valorIptuMensal || 0;
  const hoje = hojeYmd();
  const ordenados = [...movs].sort((a, b) => b.competencia.localeCompare(a.competencia));
  const proxima = [...movs].filter((m) => m.statusCobranca !== 'paga').sort((a, b) => a.competencia.localeCompare(b.competencia))[0] || null;

  return {
    demo: false,
    imovel: { titulo: i?.titulo || 'Imóvel', endereco: enderecoDe(i), codigo: i?.codigo || '' },
    dono: { nome: i?.donoNome || '' }, inquilino: { nome: l.nome },
    contrato: {
      inicio: fmtData(l.inicio), fim: fmtData(fimContrato(l)), prazoMeses: l.prazoMeses,
      indiceReajuste: l.indiceReajuste, proximoReajuste: fmtData(proximoReajuste(l)),
      diaVencimento: l.diaVencimento, garantia: l.garantiaTipo,
    },
    valores: {
      aluguel, condominio: l.valorCondominio || 0, iptuMensal: iptu,
      seguroIncendio: l.valorSeguroIncendio || 0, taxaAdmPct: l.taxaAdmPct || 0,
      totalInquilino: aluguel + iptu + (l.valorSeguroIncendio || 0),
      taxaAdm: taxa, repasseDono: Math.round((aluguel - taxa + iptu) * 100) / 100,
    },
    historico: ordenados.filter((m) => m.statusCobranca === 'paga' || m.vencimento < hoje).slice(0, 8).map((m) => ({
      competencia: compLegivel(m.competencia), vencimento: fmtData(m.vencimento), pagoEm: fmtData(m.pagoEm),
      status: m.statusCobranca === 'paga' ? (m.pagoEm && m.pagoEm > m.vencimento ? 'pago_atraso' : 'pago') : 'aberta',
    })),
    proxima: proxima ? { competencia: compLegivel(proxima.competencia), vencimento: fmtData(proxima.vencimento) } : null,
    avisos: [],
  };
}

export const DEMO_PORTAL: DadosPortal = {
  demo: true,
  imovel: { titulo: 'Apartamento 2 quartos com sacada — Centro, Penha', endereco: 'Rua Nereu Ramos, 245 — apto 302, Centro, Penha/SC', codigo: 'LOC-001' },
  dono: { nome: 'Roberto Krüger' }, inquilino: { nome: 'Fernanda Lima' },
  contrato: { inicio: '15/03/2026', fim: '15/09/2028', prazoMeses: 30, indiceReajuste: 'IGP-M', proximoReajuste: '15/03/2027', diaVencimento: 5, garantia: 'Seguro-fiança (Loft)' },
  valores: { aluguel: 1850, condominio: 380, iptuMensal: 92, seguroIncendio: 28, taxaAdmPct: 10, totalInquilino: 1970, taxaAdm: 185, repasseDono: 1757 },
  historico: [
    { competencia: 'julho/2026', vencimento: '05/07/2026', pagoEm: '03/07/2026', status: 'pago' },
    { competencia: 'junho/2026', vencimento: '05/06/2026', pagoEm: '05/06/2026', status: 'pago' },
    { competencia: 'maio/2026', vencimento: '05/05/2026', pagoEm: '08/05/2026', status: 'pago_atraso' },
    { competencia: 'abril/2026', vencimento: '05/04/2026', pagoEm: '04/04/2026', status: 'pago' },
  ],
  proxima: { competencia: 'agosto/2026', vencimento: '05/09/2026' },
  avisos: [
    { data: '20/08/2026', texto: 'A manutenção do portão da garagem está agendada para 28/08, das 8h às 12h.' },
    { data: '05/08/2026', texto: 'O boleto de agosto já está disponível. Vencimento dia 5.' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// AS INTEGRAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

export interface DefIntegracao {
  chave: string; nome: string; papel: string; funil: string;
  pronto: string[]; falta: string[];
}

export const INTEGRACOES: DefIntegracao[] = [
  {
    chave: 'clicksign', nome: 'ClickSign', funil: 'os dois',
    papel: 'Assina pelo WhatsApp: administração (dono), contrato + laudo (inquilino) e distrato',
    pronto: ['Os contratos nascem preenchidos do cadastro', 'Estados de envio e assinatura em cada funil'],
    falta: ['Criar a conta', 'Modelos do jurídico como template .docx com {{variáveis}}', 'Chave de API no servidor', 'Webhook de assinatura concluída'],
  },
  {
    chave: 'loft', nome: 'Loft Fiança', funil: 'locação',
    papel: 'Analisa o inquilino, envia a fiança pra ele assinar e garante o aluguel',
    pronto: ['Ficha do candidato pronta pra enviar', 'Etapas separadas: análise → aprovou → fiança assinada', 'Alerta de renovação anual'],
    falta: ['Fechar o plano', 'Perguntar se há API pra sistema parceiro', 'Sem API, o painel deles + 1 clique aqui já funciona'],
  },
  {
    chave: 'asaas', nome: 'Asaas', funil: 'locação',
    papel: 'Cobra o inquilino, avisa o pagamento, repassa o dono por PIX, emite NF e negativa',
    pronto: ['Movimentos por competência', 'Trava: repasse só depois do pagamento', 'Repasse em massa'],
    falta: ['Criar a conta (CNPJ)', 'Chave de API no servidor', 'Habilitar negativação com o gerente', 'Webhook de pagamento'],
  },
  {
    chave: 'feed', nome: 'Feeds dos portais', funil: 'imóvel',
    papel: 'OLX + ZAP + VivaReal, ImovelWeb e Chaves na Mão leem nosso arquivo e publicam',
    pronto: ['Gerador VRSync completo (com vídeo e tour)', 'URL viva em /api/locacao/feed', 'Regras do anúncio na etapa de material'],
    falta: ['Assinar os portais', 'Chave de serviço do Firebase no Netlify', 'Homologação com o validador oficial'],
  },
  {
    chave: 'leads', nome: 'Leads dos portais', funil: 'locação',
    papel: 'Cada interessado vira uma locação nova, já com a temperatura avaliada',
    pronto: ['Endpoint em /api/locacao/leads-olx', 'Entrada manual pra leads de fora (indicação, Instagram, balcão)'],
    falta: ['Chave de serviço do Firebase', 'Formulário de homologação do Grupo OLX'],
  },
];
