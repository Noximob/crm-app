/**
 * LOCAÇÃO — a fundação do setor de aluguel, reescrita sobre a esteira acertada.
 *
 * A esteira tem 11 etapas (documento "Esteira da Locação"), e este arquivo
 * carrega o que TODAS elas usam: os tipos, as máquinas de estado, as contas
 * do dinheiro e os geradores (XML dos portais, pacote do Cowork).
 *
 * As decisões que este código cristaliza — mudou a decisão, muda AQUI:
 *
 *   · A taxa de administração incide SÓ sobre o aluguel.
 *   · CONDOMÍNIO: o inquilino paga DIRETO à administradora do condomínio —
 *     não passa pela cobrança da Nox. O valor fica no cadastro só pra
 *     informação e anúncio.
 *   · IPTU: a Nox cobra do inquilino e repassa INTEIRO ao dono, marcado no
 *     extrato — o dono paga a prefeitura como sempre pagou (regra fiscal:
 *     ônus do locatário não é rendimento do dono; a taxa é dedutível).
 *   · O repasse vai NUM PIX só (aluguel − taxa + IPTU), com extrato
 *     discriminado.
 *   · Cobrança e repasse são PREVISÃO até o Asaas ser conectado; contrato e
 *     garantia são SIMULAÇÃO até ClickSign e Loft serem conectadas. Tudo que
 *     é simulado fica rotulado como simulado na tela — botão de dinheiro que
 *     finge funcionar queima confiança.
 *   · Regras dos portais no cadastro: 5 fotos mínimo e descrição de 50+
 *     caracteres para ANUNCIAR (rascunho aceita incompleto).
 */

// ---------------------------------------------------------------------------
// constantes do imóvel e do anúncio
// ---------------------------------------------------------------------------

export const TIPOS_IMOVEL = [
  'Apartamento', 'Casa', 'Sobrado', 'Kitnet', 'Cobertura',
  'Sala comercial', 'Loja', 'Galpão', 'Terreno',
] as const;

/** Mapeia nosso tipo para a taxonomia do VRSync (ajuste fino na homologação). */
const TIPO_VRSYNC: Record<string, string> = {
  'Apartamento': 'Residential / Apartment',
  'Casa': 'Residential / Home',
  'Sobrado': 'Residential / Home',
  'Kitnet': 'Residential / Kitnet',
  'Cobertura': 'Residential / Penthouse',
  'Sala comercial': 'Commercial / Office',
  'Loja': 'Commercial / Building',
  'Galpão': 'Commercial / Industrial',
  'Terreno': 'Residential / Land Lot',
};

export const MOBILIADO = ['Não mobiliado', 'Semimobiliado', 'Mobiliado'] as const;

export const COMODIDADES = [
  'Sacada', 'Churrasqueira', 'Piscina', 'Elevador', 'Portaria 24h',
  'Academia', 'Salão de festas', 'Vista mar', 'Ar-condicionado',
  'Lavanderia', 'Playground', 'Aceita pet',
] as const;

/** Comodidade → enum de Feature do VRSync (só as de mapeamento seguro). */
const FEATURE_VRSYNC: Record<string, string> = {
  'Piscina': 'Pool', 'Elevador': 'Elevator', 'Academia': 'Gym',
  'Churrasqueira': 'BBQ', 'Playground': 'Playground', 'Sacada': 'Balcony',
  'Salão de festas': 'Party Room', 'Lavanderia': 'Laundry',
  'Ar-condicionado': 'Air Conditioning',
};

export const GARANTIAS = [
  'Seguro-fiança (Loft)', 'Caução (depósito)', 'Fiador', 'Título de capitalização',
] as const;

export const STATUS_IMOVEL = {
  rascunho: { rotulo: 'Rascunho', cor: 'text-text-secondary' },
  anunciado: { rotulo: 'Anunciado', cor: 'text-emerald-300' },
  alugado: { rotulo: 'Alugado', cor: 'text-sky-300' },
  pausado: { rotulo: 'Pausado', cor: 'text-amber-300' },
} as const;
export type StatusImovel = keyof typeof STATUS_IMOVEL;

export interface ImovelLocacao {
  id: string;
  imobiliariaId: string;
  codigo: string;
  titulo: string;
  tipo: string;
  status: StatusImovel;

  /**
   * ETAPA 1 DA ESTEIRA: o contrato de ADMINISTRAÇÃO com o dono — o
   * documento que autoriza a Nox a administrar e reter os 10%. Sem ele
   * assinado, não se anuncia. Vai pela ClickSign (simulado até integrar).
   */
  admStatus: 'pendente' | 'enviada' | 'assinada';
  admAssinadaEm: string;
  admSimulada: boolean;

  rua: string; numero: string; complemento: string;
  bairro: string; cidade: string; cep: string;
  /** parte dos portais exige localização no mapa */
  latitude: string; longitude: string;

  quartos: number | null; suites: number | null; banheiros: number | null;
  vagas: number | null; areaPrivativa: number | null; areaTotal: number | null;
  andar: string; mobiliado: string;
  comodidades: string[];

  aluguel: number | null; condominio: number | null;
  iptuMensal: number | null; seguroIncendio: number | null;

  garantiasAceitas: string[];
  prazoMinimoMeses: number | null;
  disponivelAPartir: string;

  locadorNome: string; locadorTelefone: string; locadorEmail: string;
  locadorDoc: string; locadorPix: string;

  descricao: string;
  fotos: string[];
  /** onde anunciar via Cowork (os feeds cobrem OLX/ZAP/VivaReal + ImovelWeb + CNM) */
  portaisCowork: string[];

  criadoEm?: unknown; atualizadoEm?: unknown;
}

export const IMOVEL_VAZIO: Omit<ImovelLocacao, 'id' | 'imobiliariaId'> = {
  codigo: '', titulo: '', tipo: 'Apartamento', status: 'rascunho',
  admStatus: 'pendente', admAssinadaEm: '', admSimulada: false,
  rua: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '',
  latitude: '', longitude: '',
  quartos: null, suites: null, banheiros: null, vagas: null,
  areaPrivativa: null, areaTotal: null, andar: '', mobiliado: 'Não mobiliado',
  comodidades: [],
  aluguel: null, condominio: null, iptuMensal: null, seguroIncendio: null,
  garantiasAceitas: ['Seguro-fiança (Loft)'], prazoMinimoMeses: 12, disponivelAPartir: '',
  locadorNome: '', locadorTelefone: '', locadorEmail: '', locadorDoc: '', locadorPix: '',
  descricao: '', fotos: [], portaisCowork: [],
};

export const PORTAIS_COWORK = ['Facebook Marketplace', 'Instagram da imobiliária'] as const;

/** Total que o inquilino paga por mês. */
export const totalMensal = (i: Pick<ImovelLocacao, 'aluguel' | 'condominio' | 'iptuMensal' | 'seguroIncendio'>): number =>
  (i.aluguel || 0) + (i.condominio || 0) + (i.iptuMensal || 0) + (i.seguroIncendio || 0);

export const fmtValor = (v: number | null | undefined): string =>
  v === null || v === undefined
    ? '—'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v % 1 ? 2 : 0 });

export const fmtData = (ymd?: string): string =>
  ymd ? ymd.split('-').reverse().join('/') : '—';

export const hojeYmd = (): string => new Date().toISOString().slice(0, 10);

/**
 * O link que abre a conversa no WhatsApp. O trabalho do setor é falar com
 * dono e inquilino — sem isto, o gestor copia número na mão o dia inteiro.
 */
export function linkWhats(telefone: string, texto = ''): string {
  const n = (telefone || '').replace(/\D/g, '');
  if (n.length < 10) return '';
  const comPais = n.startsWith('55') ? n : '55' + n;
  return `https://wa.me/${comPais}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}

/**
 * Busca o endereço pelo CEP (ViaCEP, sem chave). Digitar rua/bairro/cidade
 * à mão é trabalho que a internet faz de graça — e erro de digitação em
 * endereço reprova o anúncio na homologação do portal.
 */
export async function buscarCep(cep: string): Promise<{ rua: string; bairro: string; cidade: string } | null> {
  const limpo = (cep || '').replace(/\D/g, '');
  if (limpo.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const d = await r.json();
    if (d.erro) return null;
    return {
      rua: String(d.logradouro || ''),
      bairro: String(d.bairro || ''),
      cidade: [d.localidade, d.uf].filter(Boolean).join('/'),
    };
  } catch { return null; }
}

/**
 * As regras dos portais para um anúncio ir ao ar (lidas das especificações).
 * Rascunho aceita qualquer coisa; ANUNCIAR exige a lista limpa.
 */
export function pendenciasParaAnunciar(i: Omit<ImovelLocacao, 'id' | 'imobiliariaId'>): string[] {
  const p: string[] = [];
  if (!i.titulo.trim() || i.titulo.trim().length < 10) p.push('Título com pelo menos 10 caracteres');
  if (!i.aluguel) p.push('Valor do aluguel');
  if (i.fotos.length < 5) p.push(`Mínimo de 5 fotos (tem ${i.fotos.length}) — regra do Grupo OLX`);
  if (i.descricao.trim().length < 50) p.push(`Descrição com pelo menos 50 caracteres (tem ${i.descricao.trim().length})`);
  if (!i.bairro.trim() || !i.cidade.trim() || !i.cep.trim()) p.push('Endereço completo com bairro, cidade e CEP');
  if (i.admStatus !== 'assinada') p.push('Contrato de administração assinado pelo dono (etapa 1 da esteira)');
  return p;
}

// ---------------------------------------------------------------------------
// o interessado — etapas 3 a 5 da esteira
// ---------------------------------------------------------------------------

/**
 * O CANDIDATO é burocracia, não funil: quem chega aqui já escolheu o imóvel
 * (visitas e atendimento são dos corretores, numa fase própria). A vida
 * dele é curta e reta: junta documentos → análise da Loft → aprovado vira
 * contrato (ou recusado/desistiu, e sai da fila).
 */
export const ETAPAS_LEAD = {
  docs: { rotulo: 'Juntando documentos' },
  analise_enviada: { rotulo: 'Em análise na Loft' },
  /** a Loft disse "dá pra fazer" e está mandando o contrato de fiança DELA */
  analise_aprovada: { rotulo: 'Aprovado · Loft enviando a fiança' },
  /** o inquilino assinou a fiança com a Loft — agora vem o NOSSO contrato */
  garantia_ok: { rotulo: 'Fiança assinada · pronto pro nosso contrato' },
  analise_recusada: { rotulo: 'Análise recusada' },
  convertido: { rotulo: 'Virou contrato' },
  perdido: { rotulo: 'Desistiu' },
} as const;
export type EtapaLead = keyof typeof ETAPAS_LEAD;

/** As gavetas de documento do INTERESSADO — o que a análise da Loft pede. */
export const CATEGORIAS_DOC_LEAD = ['CNH/RG', 'CPF', 'Comprovante de renda', 'Outros'] as const;

export interface LeadLocacao {
  id: string;
  imobiliariaId: string;
  imovelId: string;
  nome: string;
  telefone: string;
  email: string;
  /** de onde veio: manual | grupo_olx | imovelweb — os portais preenchem via webhook */
  origem: string;
  /** o Grupo OLX manda a temperatura avaliada por eles (chegará via funil) */
  temperatura: '' | 'baixa' | 'media' | 'alta';
  mensagem: string;
  etapa: EtapaLead;
  /** quem fechou a locação (os 40% do 1º aluguel) */
  corretorNome: string;
  garantia: {
    numero: string;
    taxaMensalPct: number | null;   // ~8 a 12,5% — vem da análise
    vigenciaFim: string;
    /** true = resultado veio de simulação, não da Loft real */
    simulada: boolean;
  } | null;
  contratoId: string;         // preenchido quando vira contrato
  perdidoMotivo: string;
  /** CNH/RG, comprovante de renda… — seguem junto quando vira contrato */
  documentos: DocContrato[];
  criadoEm?: unknown; atualizadoEm?: unknown;
}

export const LEAD_VAZIO: Omit<LeadLocacao, 'id' | 'imobiliariaId'> = {
  imovelId: '', nome: '', telefone: '', email: '', origem: 'manual',
  temperatura: '', mensagem: '', etapa: 'docs', corretorNome: '',
  garantia: null, contratoId: '', perdidoMotivo: '', documentos: [],
};

// ---------------------------------------------------------------------------
// o contrato — etapas 6 a 11 da esteira
// ---------------------------------------------------------------------------

export const INDICES_REAJUSTE = ['IGP-M', 'IPCA', 'IVAR'] as const;

/**
 * A vida do contrato. A ORDEM importa e foi corrigida: a vistoria acontece
 * ANTES da assinatura, no imóvel vazio — e o laudo vai junto do contrato
 * num ENVELOPE SÓ na ClickSign (que aceita vários documentos por envelope).
 *
 * Por quê: assinar contrato primeiro e vistoriar depois abre uma janela em
 * que o inquilino já está preso ao contrato mas ainda pode discutir o laudo
 * ("esse risco não estava aí"). Assinando os dois no mesmo ato, ele aceita o
 * estado do imóvel junto com as regras — e é um envio a menos.
 */
export const STATUS_CONTRATO = {
  rascunho: { rotulo: 'Rascunho · falta a vistoria', cor: 'text-text-secondary' },
  vistoria_feita: { rotulo: 'Vistoria feita · pronto pra enviar', cor: 'text-sky-300' },
  assinatura_enviada: { rotulo: 'Contrato + laudo no WhatsApp, aguardando', cor: 'text-amber-300' },
  assinado: { rotulo: 'Tudo assinado · pode entregar as chaves', cor: 'text-sky-300' },
  ativo: { rotulo: 'Ativo', cor: 'text-emerald-300' },
  encerrando: { rotulo: 'Em saída', cor: 'text-amber-300' },
  encerrado: { rotulo: 'Encerrado', cor: 'text-text-secondary' },
} as const;
export type StatusContrato = keyof typeof STATUS_CONTRATO;

/**
 * As gavetas de documento do contrato. "Contrato assinado" é a mais
 * importante: é onde o PDF final da ClickSign entra (hoje na mão, depois
 * automático pelo webhook dela).
 */
export const CATEGORIAS_DOC = [
  'Contrato assinado', 'RG/CPF do inquilino', 'RG/CPF do dono',
  'Comprovante de renda', 'Laudo de vistoria', 'Apólice/garantia', 'Outros',
] as const;

export interface DocContrato { nome: string; url: string; storagePath?: string; categoria?: string }

/**
 * A VISTORIA, como a casa faz de verdade: o registro visual são as FOTOS DO
 * ANÚNCIO (o imóvel foi fotografado na captação e está vazio, então elas
 * valem como laudo), mais a lista do que fica no imóvel e as ressalvas do
 * que não está perfeito.
 *
 * Não se refotografa nada: as fotos ficam congeladas no laudo no momento da
 * vistoria, e é contra elas que a saída é comparada.
 */
export interface RessalvaVistoria {
  onde: string;
  oque: string;
}

export interface Vistoria {
  feitaEm: string;            // yyyy-mm-dd
  feitaPor: string;
  /** as fotos do anúncio no momento da vistoria — o registro visual do laudo */
  fotos: string[];
  /** o que fica no imóvel (chaves, fogão, armários…) */
  itens: string[];
  /** o que não está em perfeito estado */
  ressalvas: RessalvaVistoria[];
  /** laudo assinado pelo inquilino (junto do contrato, no mesmo envelope) */
  assinada: boolean;
  assinadaSimulada: boolean;
}

/** O que costuma ficar no imóvel — a lista que o vistoriador marca. */
export const ITENS_VISTORIA = [
  'Chaves (jogo completo)', 'Controle do portão', 'Fogão', 'Geladeira',
  'Armários da cozinha', 'Armário do quarto', 'Ar-condicionado', 'Chuveiro',
  'Luminárias', 'Cortinas', 'Box do banheiro', 'Tanque', 'Varal',
] as const;

/** Onde as ressalvas costumam estar — atalho pro campo "onde". */
export const LOCAIS_VISTORIA = [
  'Sala', 'Cozinha', 'Quarto', 'Banheiro', 'Área de serviço', 'Sacada', 'Garagem', 'Fachada',
] as const;

/**
 * AS ETAPAS DO SETOR — a barra de atalhos do topo da tela.
 *
 * É o caminho inteiro numa linha: quantos estão em cada ponto e um clique
 * pra ver quem são. A ordem é a da vida real, com os dois contratos
 * distintos que a operação tem: a FIANÇA (o inquilino assina com a Loft) e
 * o de LOCAÇÃO (assina conosco, junto do laudo de vistoria).
 */
export const ETAPAS_FUNIL = [
  { chave: 'captado', rot: 'Captados', icone: '🏠', ajuda: 'imóvel registrado, falta a administração do dono' },
  { chave: 'administracao', rot: 'Administração', icone: '✍', ajuda: 'contrato de administração no WhatsApp do dono' },
  { chave: 'divulgado', rot: 'Divulgados', icone: '📣', ajuda: 'no ar nos portais, esperando quem feche' },
  { chave: 'leads', rot: 'Leads', icone: '📨', ajuda: 'interessados que chegaram dos portais — atendimento é dos corretores; aqui só entra quem FECHAR' },
  { chave: 'documentos', rot: 'Documentos', icone: '📎', ajuda: 'candidato juntando CNH, CPF e renda' },
  { chave: 'loft', rot: 'Na Loft', icone: '🛡', ajuda: 'ficha em análise (resposta em menos de 1 min)' },
  { chave: 'fianca', rot: 'Fiança Loft', icone: '📜', ajuda: 'aprovado — a Loft manda o contrato de fiança pro inquilino assinar' },
  { chave: 'vistoria', rot: 'Vistoria', icone: '📋', ajuda: 'laudo do imóvel vazio, com fotos' },
  { chave: 'assinatura', rot: 'Nosso contrato', icone: '🖊', ajuda: 'contrato + laudo num envelope só' },
  { chave: 'chaves', rot: 'Chaves', icone: '🔑', ajuda: 'tudo assinado, pode entregar' },
  { chave: 'alugado', rot: 'Alugados', icone: '💰', ajuda: 'rodando: cobrança e repasse' },
] as const;
export type EtapaFunil = typeof ETAPAS_FUNIL[number]['chave'];

export interface ContratoLocacao {
  id: string;
  imobiliariaId: string;
  imovelId: string;
  leadId: string;
  status: StatusContrato;

  /** os dados completos que o modelo de contrato do Lucas vai preencher */
  locadorNome: string; locadorDoc: string; locadorRg: string; locadorEmail: string;
  locadorTelefone: string; locadorPix: string;
  locadorEstadoCivil: string; locadorProfissao: string; locadorEnderecoAtual: string;

  locatarioNome: string; locatarioDoc: string; locatarioRg: string;
  locatarioEmail: string; locatarioTelefone: string;
  locatarioEstadoCivil: string; locatarioProfissao: string; locatarioEnderecoAtual: string;

  inicio: string;
  prazoMeses: number | null;
  valorAluguel: number | null;
  /** informativo: o inquilino paga o condomínio DIRETO à administradora */
  valorCondominio: number | null;
  /** cobrado do inquilino e repassado INTEIRO ao dono, que paga a prefeitura */
  valorIptuMensal: number | null;
  valorSeguroIncendio: number | null;
  diaVencimento: number | null;
  indiceReajuste: string;
  /** % SÓ sobre o aluguel — decisão fiscal e comercial */
  taxaAdmPct: number | null;

  garantiaTipo: string;
  garantiaNumero: string;
  garantiaTaxaMensalPct: number | null;
  garantiaVigenciaFim: string;      // renovação ANUAL — o alerta mais sério da esteira
  garantiaSimulada: boolean;

  /**
   * Assinatura via ClickSign: UM envelope com contrato + laudo de vistoria.
   * Simulada até integrar.
   */
  assinaturaEnviadaEm: string;
  assinadoEm: string;
  assinaturaSimulada: boolean;

  vistoriaEntrada: Vistoria | null;
  vistoriaSaida: Vistoria | null;

  documentos: DocContrato[];
  observacoes: string;

  encerradoEm: string;
  encerradoMotivo: string;

  criadoEm?: unknown; atualizadoEm?: unknown;
}

export const CONTRATO_VAZIO: Omit<ContratoLocacao, 'id' | 'imobiliariaId'> = {
  imovelId: '', leadId: '', status: 'rascunho',
  locadorNome: '', locadorDoc: '', locadorRg: '', locadorEmail: '', locadorTelefone: '', locadorPix: '',
  locadorEstadoCivil: '', locadorProfissao: '', locadorEnderecoAtual: '',
  locatarioNome: '', locatarioDoc: '', locatarioRg: '', locatarioEmail: '', locatarioTelefone: '',
  locatarioEstadoCivil: '', locatarioProfissao: '', locatarioEnderecoAtual: '',
  inicio: '', prazoMeses: 30, valorAluguel: null, valorCondominio: null,
  valorIptuMensal: null, valorSeguroIncendio: null, diaVencimento: 5,
  indiceReajuste: 'IGP-M', taxaAdmPct: 10,
  garantiaTipo: 'Seguro-fiança (Loft)', garantiaNumero: '', garantiaTaxaMensalPct: null,
  garantiaVigenciaFim: '', garantiaSimulada: false,
  assinaturaEnviadaEm: '', assinadoEm: '', assinaturaSimulada: false,
  vistoriaEntrada: null, vistoriaSaida: null,
  documentos: [], observacoes: '', encerradoEm: '', encerradoMotivo: '',
};

/** Fim da vigência derivado do prazo — nunca digitado, para não divergir. */
export function fimContrato(c: Pick<ContratoLocacao, 'inicio' | 'prazoMeses'>): string {
  if (!c.inicio || !c.prazoMeses) return '';
  const d = new Date(c.inicio + 'T12:00:00');
  d.setMonth(d.getMonth() + c.prazoMeses);
  return d.toISOString().slice(0, 10);
}

/** Próximo aniversário anual do contrato (data do reajuste). */
export function proximoReajuste(c: Pick<ContratoLocacao, 'inicio'>): string {
  if (!c.inicio) return '';
  const ini = new Date(c.inicio + 'T12:00:00');
  const hoje = new Date();
  const d = new Date(ini);
  while (d <= hoje) d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Dias até uma data ymd (negativo = já passou). */
export function diasAte(ymd: string): number | null {
  if (!ymd) return null;
  return Math.ceil((new Date(ymd + 'T12:00:00').getTime() - Date.now()) / 864e5);
}

/**
 * Os alertas que protegem a operação — cada um nasceu de um risco real:
 * garantia vencida = dono descoberto (culpa da administradora); reajuste
 * esquecido = dinheiro deixado na mesa; contrato vencendo = decisão de
 * renovação em cima da hora.
 */
export interface AlertaContrato { tipo: 'garantia' | 'reajuste' | 'vigencia'; texto: string; grave: boolean }

export function alertasDoContrato(c: ContratoLocacao): AlertaContrato[] {
  if (c.status !== 'ativo') return [];
  const out: AlertaContrato[] = [];

  const dg = diasAte(c.garantiaVigenciaFim);
  if (c.garantiaVigenciaFim && dg !== null) {
    if (dg < 0) out.push({ tipo: 'garantia', grave: true, texto: `GARANTIA VENCIDA há ${-dg} dias — o dono está descoberto. Renovar com a Loft AGORA.` });
    else if (dg <= 45) out.push({ tipo: 'garantia', grave: dg <= 15, texto: `Garantia vence em ${dg} dias (${fmtData(c.garantiaVigenciaFim)}) — renovar com a Loft.` });
  }

  const rj = proximoReajuste(c);
  const dr = diasAte(rj);
  if (dr !== null && dr <= 60) {
    out.push({ tipo: 'reajuste', grave: false, texto: `Reajuste anual (${c.indiceReajuste}) em ${dr} dias (${fmtData(rj)}) — calcular e comunicar o inquilino.` });
  }

  const df = diasAte(fimContrato(c));
  if (df !== null && df <= 90) {
    out.push({ tipo: 'vigencia', grave: df <= 30, texto: `Contrato termina em ${df} dias (${fmtData(fimContrato(c))}) — renovar ou iniciar a saída.` });
  }
  return out;
}

// ---------------------------------------------------------------------------
// o dinheiro — etapas 8 e 9 da esteira
// ---------------------------------------------------------------------------

/**
 * Um movimento = uma competência de um contrato: a cobrança do inquilino e o
 * repasse do dono, juntos, porque um não existe sem o outro.
 *
 * Enquanto o Asaas não está conectado, statusCobranca anda por SIMULAÇÃO
 * (botões rotulados). Quando conectar, quem move é o webhook de pagamento —
 * a estrutura é a mesma, só troca a mão que aperta.
 */
export const STATUS_COBRANCA = {
  prevista: { rotulo: 'Prevista', cor: 'text-text-secondary' },
  emitida: { rotulo: 'Boleto/PIX emitido', cor: 'text-sky-300' },
  paga: { rotulo: 'Paga', cor: 'text-emerald-300' },
  atrasada: { rotulo: 'Atrasada', cor: 'text-rose-300' },
} as const;
export type StatusCobranca = keyof typeof STATUS_COBRANCA;

export const STATUS_REPASSE = {
  aguardando: { rotulo: 'Aguarda pagamento', cor: 'text-text-secondary' },
  liberado: { rotulo: 'Liberado (D+2)', cor: 'text-amber-300' },
  repassado: { rotulo: 'Repassado', cor: 'text-emerald-300' },
} as const;
export type StatusRepasse = keyof typeof STATUS_REPASSE;

export interface MovimentoLocacao {
  id: string;
  imobiliariaId: string;
  contratoId: string;
  competencia: string;        // 'YYYY-MM'
  vencimento: string;         // yyyy-mm-dd

  valorAluguel: number;
  valorIptu: number;          // cobrado e repassado inteiro ao dono
  valorSeguro: number;
  valorTotal: number;         // o que o inquilino paga à Nox (condomínio ele paga direto)
  taxaAdm: number;            // 10% SÓ do aluguel
  repasseDono: number;        // aluguel − taxa + IPTU

  statusCobranca: StatusCobranca;
  pagoEm: string;
  statusRepasse: StatusRepasse;
  repassadoEm: string;
  /** true enquanto o status foi movido por botão de simulação, não pelo Asaas */
  simulado: boolean;

  criadoEm?: unknown;
}

/**
 * Gera todos os movimentos do contrato, do início ao fim. Roda UMA vez, na
 * ativação (entrega de chaves). O reajuste anual futuro atualiza os
 * movimentos ainda não cobrados — nunca os passados.
 */
export function gerarMovimentos(c: ContratoLocacao): Omit<MovimentoLocacao, 'id' | 'imobiliariaId' | 'criadoEm'>[] {
  if (!c.inicio || !c.valorAluguel || !c.diaVencimento || !c.prazoMeses) return [];
  const out: Omit<MovimentoLocacao, 'id' | 'imobiliariaId' | 'criadoEm'>[] = [];
  const ini = new Date(c.inicio + 'T12:00:00');
  const aluguel = c.valorAluguel;
  // condomínio NÃO entra: o inquilino paga direto à administradora
  const iptu = c.valorIptuMensal || 0;
  const seguro = c.valorSeguroIncendio || 0;
  const taxa = Math.round(aluguel * (c.taxaAdmPct || 0)) / 100;

  for (let m = 0; m < c.prazoMeses; m++) {
    const comp = new Date(ini.getFullYear(), ini.getMonth() + m, 1);
    const venc = new Date(comp.getFullYear(), comp.getMonth(), c.diaVencimento);
    out.push({
      contratoId: c.id,
      competencia: `${comp.getFullYear()}-${String(comp.getMonth() + 1).padStart(2, '0')}`,
      vencimento: venc.toISOString().slice(0, 10),
      valorAluguel: aluguel, valorIptu: iptu, valorSeguro: seguro,
      valorTotal: aluguel + iptu + seguro,
      taxaAdm: taxa,
      repasseDono: Math.round((aluguel - taxa + iptu) * 100) / 100,
      statusCobranca: 'prevista', pagoEm: '',
      statusRepasse: 'aguardando', repassadoEm: '',
      simulado: false,
    });
  }
  return out;
}

/** A descrição que vai no PIX do repasse — resumo; o documento é o extrato. */
export function descricaoRepasse(m: MovimentoLocacao): string {
  const partes = [`aluguel ${fmtValor(m.valorAluguel - m.taxaAdm)}`];
  if (m.valorIptu) partes.push(`IPTU ${fmtValor(m.valorIptu)}`);
  return `Repasse Nox ${m.competencia.split('-').reverse().join('/')} · ${partes.join(' + ')}`;
}

// ---------------------------------------------------------------------------
// integrações — o quadro de tomadas
// ---------------------------------------------------------------------------

/**
 * Cada integração externa da esteira, com o que ela liga e o que falta pra
 * ligar. O status vivo fica em locacaoConfig/{imobiliariaId}; este é o
 * catálogo do que existe. NENHUMA chave de API entra por tela — tudo que é
 * segredo vai em variável de ambiente do servidor (Netlify), nunca no banco.
 */
export interface DefIntegracao {
  chave: string;
  nome: string;
  papel: string;
  etapas: string;
  prontoDoNossoLado: string[];
  faltaParaLigar: string[];
}

export const INTEGRACOES: DefIntegracao[] = [
  {
    chave: 'asaas', nome: 'Asaas', papel: 'Cobra o inquilino, avisa o pagamento, repassa o dono via PIX, emite a NF da taxa, negativa no Serasa',
    etapas: '8 · 9 · 10',
    prontoDoNossoLado: ['Movimentos por competência com a conta do repasse', 'Trava: repasse só depois do pagamento', 'Descrição do PIX com o resumo discriminado'],
    faltaParaLigar: ['Criar a conta Asaas (CNPJ)', 'Chave de API em variável do servidor', 'Habilitar negativação com o gerente', 'Função de servidor pro webhook de pagamento'],
  },
  {
    chave: 'clicksign', nome: 'ClickSign', papel: 'Todos os documentos assinados pelo WhatsApp: administração, locação, laudo de vistoria, distrato',
    etapas: '1 · 6 · 7 · 11',
    prontoDoNossoLado: ['Estados de assinatura no contrato e na vistoria', 'Fluxo: enviar → acompanhar → arquivar'],
    faltaParaLigar: ['Criar a conta ClickSign', 'Modelos do Lucas em .docx com as variáveis {{campo}}', 'Chave de API em variável do servidor', 'Webhook de assinatura concluída'],
  },
  {
    chave: 'loft', nome: 'Loft Fiança', papel: 'Analisa o inquilino (<1 min), garante o aluguel, paga cashback por contrato',
    etapas: '5 · 9 · 10',
    prontoDoNossoLado: ['Etapa de análise na esteira com nº, taxa e vigência da garantia', 'Alerta de renovação anual (o risco nº 1 da modalidade)'],
    faltaParaLigar: ['Fechar o plano com a Loft', 'Perguntar se a API da fiança vale pra sistema parceiro', 'Sem API: o painel deles + 1 clique aqui continua funcionando'],
  },
  {
    chave: 'feed_olx', nome: 'Grupo OLX (feed VRSync)', papel: 'Publica em OLX + ZAP + VivaReal — eles leem nosso arquivo 2×/dia',
    etapas: '2',
    prontoDoNossoLado: ['Gerador do XML VRSync (baixe o teste na aba Imóveis)', 'URL viva JÁ NO AR: /api/locacao/feed — é ela que se informa na homologação', 'Regras do anúncio no cadastro (5 fotos, descrição 50+)'],
    faltaParaLigar: ['Assinar o Canal Pro', 'Chave de serviço do Firebase no Netlify (passo a passo comigo — 10 min)', 'Homologação: validador oficial + formulário deles'],
  },
  {
    chave: 'leads_olx', nome: 'Grupo OLX (leads)', papel: 'Cada interessado vira um aviso automático que cai na esteira, já com a temperatura avaliada',
    etapas: '3',
    prontoDoNossoLado: ['Endpoint JÁ NO AR: /api/locacao/leads-olx — deduplica, casa o lead com o anúncio e guarda com a temperatura avaliada'],
    faltaParaLigar: ['O funil de ATENDIMENTO dos corretores (fase 2) — é lá que estes leads vão desaguar', 'Chave de serviço do Firebase no Netlify (a mesma do feed)', 'Formulário de homologação do Grupo OLX com a URL + token'],
  },
  {
    chave: 'imovelweb', nome: 'ImovelWeb (Open)', papel: 'Publica anúncios e devolve leads por callback',
    etapas: '2 · 3',
    prontoDoNossoLado: ['Cadastro cobre os campos obrigatórios deles'],
    faltaParaLigar: ['Assinar o plano', 'Escolher XML ou API na homologação', 'Configurar callbacks (endpoint + autenticação)'],
  },
  {
    chave: 'cnm', nome: 'Chaves na Mão', papel: 'Publica anúncios via feed XML próprio',
    etapas: '2',
    prontoDoNossoLado: ['Cadastro cobre os campos'],
    faltaParaLigar: ['Assinar o plano', 'Gerar o feed no formato deles (documentação já mapeada)'],
  },
];

// ---------------------------------------------------------------------------
// geradores — o feed VRSync e o pacote do Cowork
// ---------------------------------------------------------------------------

const xmlEsc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * O feed VRSync (Grupo OLX: OLX + ZAP + VivaReal), gerado do cadastro.
 *
 * Hoje serve pro botão "baixar XML de teste" — pra validar no validador
 * oficial durante a homologação. Quando a função de servidor existir, esta
 * MESMA função gera a URL viva que os portais leem 2×/dia.
 */
export function gerarFeedVrsync(
  imoveis: ImovelLocacao[],
  contato: { nome: string; email: string; telefone: string },
): string {
  const anunciados = imoveis.filter((i) => i.status === 'anunciado');
  const L: string[] = [];
  const p = (s: string) => L.push(s);

  p('<?xml version="1.0" encoding="UTF-8"?>');
  p('<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync"');
  p('  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  p('  xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync http://xml.vivareal.com/vrsync.xsd">');
  p('  <Header>');
  p(`    <Provider>Nox Imóveis — sistema próprio</Provider>`);
  p(`    <Email>${xmlEsc(contato.email)}</Email>`);
  p(`    <ContactName>${xmlEsc(contato.nome)}</ContactName>`);
  p(`    <PublishDate>${new Date().toISOString()}</PublishDate>`);
  p(`    <Telephone>${xmlEsc(contato.telefone)}</Telephone>`);
  p('  </Header>');
  p('  <Listings>');

  for (const i of anunciados) {
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
    p('      </Media>');
    p('    </Listing>');
  }
  p('  </Listings>');
  p('</ListingDataFeed>');
  return L.join('\n');
}

/** O pacote pro Claude publicar onde não tem feed (Facebook/Instagram). */
export function pacoteCowork(i: ImovelLocacao): string {
  const L: string[] = [];
  const p = (s = '') => L.push(s);
  p('PUBLICAÇÃO DE ANÚNCIO DE LOCAÇÃO — NOX IMÓVEIS');
  p('='.repeat(48));
  p();
  p('O QUE FAZER');
  p('Publicar o imóvel abaixo nos canais listados, usando as contas da');
  p('imobiliária abertas no navegador. Preencher a ficha completa, subir as');
  p('fotos na ordem, conferir o preview e publicar. Devolver os links.');
  p();
  p('REGRAS: não inventar dado nenhum; valores EXATOS; sem destaque pago sem perguntar.');
  p();
  p('CANAIS');
  (i.portaisCowork.length ? i.portaisCowork : ['(nenhum marcado — perguntar)']).forEach((x) => p(`- ${x}`));
  p();
  p(`IMÓVEL ${i.codigo} — ${i.titulo}`);
  p(`${i.tipo} · ${[i.rua, i.numero].filter(Boolean).join(', ')}${i.complemento ? ` — ${i.complemento}` : ''}`);
  p(`${i.bairro} · ${i.cidade} · CEP ${i.cep || '—'}`);
  p(`Quartos ${i.quartos ?? '—'} (${i.suites ?? 0} suíte) · Banheiros ${i.banheiros ?? '—'} · Vagas ${i.vagas ?? '—'}`);
  p(`Área ${i.areaPrivativa ? i.areaPrivativa + ' m²' : '—'} · ${i.mobiliado} · Andar ${i.andar || '—'}`);
  p(`Comodidades: ${i.comodidades.join(', ') || '—'}`);
  p();
  p(`Aluguel ${fmtValor(i.aluguel)} · Condomínio ${fmtValor(i.condominio)} · IPTU ${fmtValor(i.iptuMensal)} · Seguro ${fmtValor(i.seguroIncendio)}`);
  p(`TOTAL MENSAL: ${fmtValor(totalMensal(i))}`);
  p(`Garantias: ${i.garantiasAceitas.join(', ') || '—'} · Prazo mínimo ${i.prazoMinimoMeses || '—'} meses`);
  p(`Disponível a partir de: ${i.disponivelAPartir ? fmtData(i.disponivelAPartir) : 'imediato'}`);
  p();
  p('DESCRIÇÃO');
  p(i.descricao || '(escrever a partir das características e me mostrar antes)');
  p();
  p('FOTOS (nesta ordem)');
  i.fotos.forEach((f, n) => p(`${n + 1}. ${f}`));
  p();
  p('CONTATO: sempre o telefone e e-mail da imobiliária, nunca o do proprietário.');
  return L.join('\n');
}

// ---------------------------------------------------------------------------
// o portal do cliente — dados compartilhados
// ---------------------------------------------------------------------------

/**
 * A forma que as duas telas do portal (dono e inquilino) consomem. O portal
 * público monta isto do cenário demo; a pré-visualização do admin monta do
 * contrato real. MESMOS componentes, fontes diferentes — quando o login
 * chegar, só troca a fonte.
 */
export interface DadosPortal {
  demo: boolean;
  /** true = imóvel administrado mas ainda não alugado (portal do dono desde a captação) */
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

export function dadosPortalDoContrato(
  c: ContratoLocacao, imovel: ImovelLocacao | undefined, movimentos: MovimentoLocacao[],
): DadosPortal {
  const aluguel = c.valorAluguel || 0;
  const taxa = Math.round(aluguel * (c.taxaAdmPct || 0)) / 100;
  const cond = c.valorCondominio || 0;   // informativo — pago direto pelo inquilino
  const iptu = c.valorIptuMensal || 0;
  const seg = c.valorSeguroIncendio || 0;
  const ms = [...movimentos].sort((a, b) => b.competencia.localeCompare(a.competencia));
  const hoje = hojeYmd();
  const proxima = [...movimentos]
    .filter((m) => m.statusCobranca !== 'paga')
    .sort((a, b) => a.competencia.localeCompare(b.competencia))[0] || null;

  const compLegivel = (comp: string) => {
    const [ano, mes] = comp.split('-');
    const nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${nomes[Number(mes) - 1]}/${ano}`;
  };

  return {
    demo: false,
    imovel: {
      titulo: imovel?.titulo || 'Imóvel',
      endereco: imovel ? `${[imovel.rua, imovel.numero].filter(Boolean).join(', ')}${imovel.complemento ? ` — ${imovel.complemento}` : ''}, ${imovel.bairro}, ${imovel.cidade}` : '',
      codigo: imovel?.codigo || '',
    },
    dono: { nome: c.locadorNome },
    inquilino: { nome: c.locatarioNome },
    contrato: {
      inicio: fmtData(c.inicio), fim: fmtData(fimContrato(c)), prazoMeses: c.prazoMeses,
      indiceReajuste: c.indiceReajuste, proximoReajuste: fmtData(proximoReajuste(c)),
      diaVencimento: c.diaVencimento, garantia: c.garantiaTipo,
    },
    valores: {
      aluguel, condominio: cond, iptuMensal: iptu, seguroIncendio: seg,
      taxaAdmPct: c.taxaAdmPct || 0, totalInquilino: aluguel + iptu + seg,
      taxaAdm: taxa, repasseDono: Math.round((aluguel - taxa + iptu) * 100) / 100,
    },
    historico: ms.filter((m) => m.statusCobranca === 'paga' || m.vencimento < hoje).slice(0, 8).map((m) => ({
      competencia: compLegivel(m.competencia),
      vencimento: fmtData(m.vencimento),
      pagoEm: fmtData(m.pagoEm),
      status: m.statusCobranca === 'paga'
        ? (m.pagoEm && m.pagoEm > m.vencimento ? 'pago_atraso' : 'pago')
        : 'aberta',
    })),
    proxima: proxima ? { competencia: compLegivel(proxima.competencia), vencimento: fmtData(proxima.vencimento) } : null,
    avisos: [],
  };
}

/**
 * O portal do DONO desde a assinatura da administração — antes de existir
 * inquilino. É o argumento de captação: "o senhor acompanha o anúncio desde
 * o primeiro dia". Mostra o imóvel e o estado da divulgação; quando alugar,
 * o mesmo portal passa a mostrar os repasses.
 */
export function dadosPortalDoImovel(i: ImovelLocacao): DadosPortal {
  const st = STATUS_IMOVEL[i.status] || STATUS_IMOVEL.rascunho;
  return {
    demo: false,
    aguardandoLocacao: true,
    imovel: {
      titulo: i.titulo,
      endereco: `${[i.rua, i.numero].filter(Boolean).join(', ')}${i.complemento ? ` — ${i.complemento}` : ''}, ${i.bairro}, ${i.cidade}`,
      codigo: i.codigo,
    },
    dono: { nome: i.locadorNome },
    inquilino: { nome: '' },
    contrato: {
      inicio: '—', fim: '—', prazoMeses: null, indiceReajuste: '—',
      proximoReajuste: '—', diaVencimento: null, garantia: i.garantiasAceitas.join(', ') || '—',
    },
    valores: {
      aluguel: i.aluguel || 0, condominio: i.condominio || 0, iptuMensal: i.iptuMensal || 0,
      seguroIncendio: i.seguroIncendio || 0, taxaAdmPct: 10,
      totalInquilino: (i.aluguel || 0) + (i.iptuMensal || 0) + (i.seguroIncendio || 0),
      taxaAdm: Math.round((i.aluguel || 0) * 10) / 100,
      repasseDono: (i.aluguel || 0) - Math.round((i.aluguel || 0) * 10) / 100 + (i.iptuMensal || 0),
    },
    historico: [], proxima: null,
    avisos: [{ data: '', texto: `Seu imóvel está ${st.rotulo.toLowerCase()}. Assim que alugar, os pagamentos e repasses aparecem aqui.` }],
  };
}

/** O cenário de demonstração do portal público — coerente dos dois lados. */
export const DEMO_PORTAL: DadosPortal = {
  demo: true,
  imovel: {
    titulo: 'Apartamento 2 quartos com sacada — Centro, Penha',
    endereco: 'Rua Nereu Ramos, 245 — apto 302, Centro, Penha/SC',
    codigo: 'LOC-001',
  },
  dono: { nome: 'Roberto Krüger' },
  inquilino: { nome: 'Fernanda Lima' },
  contrato: {
    inicio: '15/03/2026', fim: '15/09/2028', prazoMeses: 30,
    indiceReajuste: 'IGP-M', proximoReajuste: '15/03/2027',
    diaVencimento: 5, garantia: 'Seguro-fiança (Loft)',
  },
  valores: {
    aluguel: 1850, condominio: 380, iptuMensal: 92, seguroIncendio: 28,
    taxaAdmPct: 10, totalInquilino: 1970, taxaAdm: 185, repasseDono: 1757,
  },
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
