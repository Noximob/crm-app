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
 * As etapas do imóvel — no MESMO desenho do funil da locação, que é o que o
 * gestor aprovou: cada coluna diz o que está acontecendo AGORA e com quem a
 * bola está. A régua lê como uma frase:
 *
 *   Captado › Papelada OK › Assinando › Montando anúncio › Anúncio pronto
 *   › No ar › Alugado
 *
 * E o funil ANDA SOZINHO quando o trabalho é dado interno: completou a
 * papelada, avança; completou o anúncio, avança. O gestor só clica no que é
 * ação de verdade no mundo — enviar contrato, publicar, entregar chave.
 */
export const ETAPAS_IMOVEL = {
  captado: {
    n: 1, rotulo: 'Captado', icone: '🏠', comQuem: 'nós',
    oQueFalta: 'juntar a papelada e os dados do proprietário',
    ajuda: 'imóvel recém-chegado; quando a papelada completar, ele avança sozinho',
  },
  docs_dono: {
    n: 2, rotulo: 'Papelada OK', icone: '📎', comQuem: 'nós',
    oQueFalta: 'enviar o contrato de administração pro dono assinar',
    ajuda: 'RG/CPF, PIX e documentos do dono completos — pronto pro contrato',
  },
  adm_enviada: {
    n: 3, rotulo: 'Assinando', icone: '✍', comQuem: 'dono',
    oQueFalta: 'o dono assina a administração pela ClickSign',
    ajuda: 'contrato de administração no WhatsApp do proprietário',
  },
  adm_assinada: {
    n: 4, rotulo: 'Montando anúncio', icone: '📸', comQuem: 'nós',
    oQueFalta: 'fotos, descrição e portais — completou, avança sozinho',
    ajuda: 'dono autorizou; o portal do proprietário já está no ar',
  },
  material: {
    n: 5, rotulo: 'Anúncio pronto', icone: '✅', comQuem: 'nós',
    oQueFalta: 'só apertar publicar',
    ajuda: 'anúncio dentro das regras dos portais, esperando o clique',
  },
  publicado: {
    n: 6, rotulo: 'No ar', icone: '📣', comQuem: 'portais',
    oQueFalta: '',
    ajuda: 'anunciado em OLX, ZAP, VivaReal e ImovelWeb; os interessados caem no funil de locações',
  },
  alugado: {
    n: 7, rotulo: 'Alugado', icone: '🔑', comQuem: 'locacao',
    oQueFalta: '',
    ajuda: 'fora do ar — a locação dele está rodando no outro funil',
  },
  pausado: {
    n: 0, rotulo: 'Fora do ar', icone: '⏸', comQuem: 'nós',
    oQueFalta: 'voltar ao ar quando quiser',
    ajuda: 'retirado dos portais por decisão da casa ou do dono',
  },
} as const;
export type EtapaImovel = keyof typeof ETAPAS_IMOVEL;

/**
 * AS RÉGUAS DOS PORTAIS — os números que o Grupo OLX (OLX + ZAP + VivaReal)
 * exige de cada anúncio do feed VRSync. Fora delas o anúncio é recusado; e
 * como eles validam o ARQUIVO, um anúncio ruim derruba o feed da casa toda.
 *
 * Fonte: documentação de homologação do Canal Pro / VRSync.
 *   · fotos: PELO MENOS 5 (não "até 5") — JPG, quanto mais melhor; o portal
 *     corta o excedente acima de ~30;
 *   · título: 10 a 100 caracteres;
 *   · descrição: 50 a 3.000 caracteres, sem HTML, sem telefone no texto;
 *   · CEP obrigatório (é dele que sai a localização no mapa).
 */
export const REGRAS_PORTAIS = {
  fotosMin: 5,
  fotosMax: 30,
  tituloMin: 10,
  tituloMax: 100,
  descricaoMin: 50,
  descricaoMax: 3000,
} as const;

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
  const R = REGRAS_PORTAIS;

  if (!i.donoNome.trim()) p.docs.push('Nome do proprietário');
  if (!i.donoTelefone.trim()) p.docs.push('WhatsApp do proprietário');
  if (!i.donoDoc.trim()) p.docs.push('CPF/CNPJ do proprietário');
  if (!i.donoPix.trim()) p.docs.push('Chave PIX para o repasse');
  if (!i.docsDono.length) p.docs.push('Ao menos um documento anexado (RG/CPF, matrícula…)');

  if (!i.aluguel) p.adm.push('Valor do aluguel');
  if (!i.rua.trim() || !i.bairro.trim() || !i.cidade.trim()) p.adm.push('Endereço do imóvel');

  const nT = i.titulo.trim().length;
  const nD = i.descricao.trim().length;
  if (nT < R.tituloMin) p.material.push(`Título com pelo menos ${R.tituloMin} caracteres (tem ${nT})`);
  if (nT > R.tituloMax) p.material.push(`Título passou de ${R.tituloMax} caracteres (tem ${nT}) — os portais cortam`);
  if (nD < R.descricaoMin) p.material.push(`Descrição com pelo menos ${R.descricaoMin} caracteres (tem ${nD})`);
  if (nD > R.descricaoMax) p.material.push(`Descrição passou de ${R.descricaoMax} caracteres (tem ${nD})`);
  if (i.fotos.length < R.fotosMin) p.material.push(`Pelo menos ${R.fotosMin} fotos (tem ${i.fotos.length}) — quanto mais, melhor o anúncio`);
  if (!i.cep.trim()) p.material.push('CEP');
  if (!i.portais.length) p.material.push('Escolher ao menos um portal');

  return p;
}

// ═══════════════════════════════════════════════════════════════════════════
// O CRM DA LOCAÇÃO · o relacionamento com o lead
//
// O MESMO registro da locação, visto por outra lente. O funil burocrático
// (ETAPAS_LOCACAO) é processo — anda por regra. Este aqui é conversa — o
// corretor move o lead livremente entre as colunas, anota o que quiser e
// qualifica pro aluguel. Quando fecha negócio, a burocracia assume; quando
// a chave é entregue, o CRM vira "Alugado" sozinho.
// ═══════════════════════════════════════════════════════════════════════════

export const CRM_ETAPAS = {
  entrada: {
    n: 1, rotulo: 'Entrada', icone: '📥',
    ajuda: 'chegou e ninguém falou com ele ainda',
  },
  contato: {
    n: 2, rotulo: 'Em contato', icone: '💬',
    ajuda: 'conversando — WhatsApp, ligação',
  },
  agendamento: {
    n: 3, rotulo: 'Agendamento', icone: '📅',
    ajuda: 'visita marcada no imóvel',
  },
  negociacao: {
    n: 4, rotulo: 'Negociação', icone: '🤝',
    ajuda: 'fechou com a gente — a papelada corre em Locações, o relacionamento fica aqui',
  },
} as const;
export type CrmEtapa = keyof typeof CRM_ETAPAS;
export const CRM_ORDEM: CrmEtapa[] = ['entrada', 'contato', 'agendamento', 'negociacao'];

/**
 * Dado antigo (ou torto) não pode derrubar a tela: qualquer coisa fora das
 * quatro colunas cai em Negociação — inclusive o 'alugado' que existia antes
 * de o cliente ativo passar a morar na aba Locações.
 */
export const crmEtapaDe = (l: { crmEtapa?: string }): CrmEtapa =>
  (l.crmEtapa && l.crmEtapa in CRM_ETAPAS ? l.crmEtapa : 'negociacao') as CrmEtapa;

/** Uma anotação livre do corretor no lead. */
export interface NotaCrm { em: string; por: string; texto: string }

/**
 * A LINHA DO TEMPO DO LEAD — o mesmo recurso que faz o CRM de vendas
 * funcionar: uma coluna com tudo que aconteceu, em ordem, agrupado por dia.
 *
 * Aqui ela é DERIVADA, não gravada: as datas já existem espalhadas pelo
 * registro (visita marcada, fiança enviada, contrato assinado, chave
 * entregue, reajustes) e as anotações trazem o resto. Assim o histórico
 * nasce completo mesmo pros contratos que já existiam, sem migração.
 */
export interface EventoLead {
  em: string;
  tipo: 'nota' | 'visita' | 'papelada' | 'contrato' | 'chave' | 'dinheiro' | 'perda';
  texto: string;
  por: string;
}

const TIPO_EVENTO: Record<EventoLead['tipo'], { chip: string; borda: string; rotulo: string }> = {
  nota: { chip: 'bg-white/[0.06] border-white/15 text-white/70', borda: 'border-l-white/25', rotulo: 'Anotação' },
  visita: { chip: 'bg-[#C4A6FF]/10 border-[#C4A6FF]/35 text-[#C4A6FF]', borda: 'border-l-[#C4A6FF]', rotulo: 'Visita' },
  papelada: { chip: 'bg-[#E8C547]/10 border-[#E8C547]/35 text-[#FFE9A6]', borda: 'border-l-[#E8C547]', rotulo: 'Papelada' },
  contrato: { chip: 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]', borda: 'border-l-[#7DD3FC]', rotulo: 'Contrato' },
  chave: { chip: 'bg-[#34D399]/10 border-[#34D399]/35 text-[#34D399]', borda: 'border-l-[#34D399]', rotulo: 'Chave' },
  dinheiro: { chip: 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300', borda: 'border-l-emerald-500', rotulo: 'Dinheiro' },
  perda: { chip: 'bg-rose-500/10 border-rose-500/35 text-rose-300', borda: 'border-l-rose-500', rotulo: 'Perdido' },
};
export const corEvento = (t: EventoLead['tipo']) => TIPO_EVENTO[t] || TIPO_EVENTO.nota;

export function linhaDoTempo(l: Locacao, imovel?: ImovelLocacao): EventoLead[] {
  const ev: EventoLead[] = [];
  const add = (em: string, tipo: EventoLead['tipo'], texto: string, por = '') => {
    if (em) ev.push({ em, tipo, texto, por });
  };

  for (const n of l.crmNotas || []) add(n.em, 'nota', n.texto, n.por);

  if (l.crmVisitaEm) {
    const futura = (diasAte(l.crmVisitaEm) ?? 0) >= 0;
    add(l.crmVisitaEm, 'visita',
      futura ? `Visita marcada${imovel ? ` no ${imovel.codigo}` : ''}.` : `Visita${imovel ? ` no ${imovel.codigo}` : ''}.`);
  }

  add(l.garantiaEnviadaEm, 'papelada', 'A Loft aprovou e mandou a fiança pro inquilino assinar.');
  add(l.garantiaAssinadaEm, 'papelada', `Fiança assinada${l.garantiaNumero ? ` — apólice ${l.garantiaNumero}` : ''}.`);
  add(l.contratoEnviadoEm, 'contrato', 'Nosso contrato + laudo de vistoria enviados pra assinatura.');
  add(l.contratoAssinadoEm, 'contrato', 'Contrato assinado por todas as partes.');
  if (l.vistoriaEntrada?.feitaEm) {
    add(l.vistoriaEntrada.feitaEm, 'papelada',
      `Vistoria de entrada${l.vistoriaEntrada.ressalvas.length ? ` — ${l.vistoriaEntrada.ressalvas.length} ressalva(s)` : ' — sem ressalvas'}.`,
      l.vistoriaEntrada.feitaPor);
  }
  add(l.chavesEntreguesEm, 'chave', `Chaves entregues${l.chavesHora ? ` às ${l.chavesHora}` : ''} — contrato em vigor.`);

  for (const r of l.reajustes || []) {
    add(r.em, 'dinheiro', `Reajuste de ${r.percentual}% pelo ${r.indice}: ${fmtValor(r.de)} → ${fmtValor(r.para)}.`);
  }

  if (l.vistoriaSaida?.feitaEm) add(l.vistoriaSaida.feitaEm, 'papelada', 'Vistoria de saída realizada.');
  add(l.encerradaEm, 'perda', 'Locação encerrada.');
  if (l.etapa === 'perdida' && l.motivoPerda) add(hojeYmd(), 'perda', `Não fechou — ${l.motivoPerda}.`);

  return ev.sort((a, b) => b.em.localeCompare(a.em));
}

/** Os eventos agrupados por dia, com o buraco entre eles — igual no CRM de vendas. */
export function agruparPorDia(ev: EventoLead[]): { dia: string; rotulo: string; gapDias: number; itens: EventoLead[] }[] {
  const dias = new Map<string, EventoLead[]>();
  for (const e of ev) {
    const arr = dias.get(e.em) || [];
    arr.push(e);
    dias.set(e.em, arr);
  }
  const hoje = hojeYmd();
  const ontem = ymd(new Date(Date.now() - 864e5));
  const chaves = Array.from(dias.keys()).sort().reverse();
  return chaves.map((dia, i) => {
    const anterior = chaves[i - 1];
    const gap = anterior ? Math.abs(Math.round((new Date(anterior + 'T12:00:00').getTime() - new Date(dia + 'T12:00:00').getTime()) / 864e5)) : 0;
    return {
      dia, itens: dias.get(dia) || [], gapDias: gap,
      rotulo: dia === hoje ? 'hoje' : dia === ontem ? 'ontem' : fmtData(dia),
    };
  });
}

/**
 * O BATIMENTO DO CRM: quando falar com essa pessoa de novo.
 *
 * É o que separa um CRM de uma lista de nomes. Sem data marcada o lead
 * esfria em silêncio — então "sem retorno marcado" é um estado visível, não
 * um vazio.
 */
export const STATUS_CONTATO = {
  atrasado: { rotulo: 'Atrasado', chip: 'bg-rose-500/10 border-rose-500/35 text-rose-300' },
  hoje: { rotulo: 'Falar hoje', chip: 'bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6]' },
  futuro: { rotulo: 'Agendado', chip: 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]' },
  sem: { rotulo: 'Sem retorno marcado', chip: 'bg-white/[0.04] border-white/15 text-text-secondary' },
} as const;
export type StatusContato = keyof typeof STATUS_CONTATO;

export function statusContato(l: { crmProximoContato?: string }): { tipo: StatusContato; dias: number } {
  const d = l.crmProximoContato ? diasAte(l.crmProximoContato) : null;
  if (d === null) return { tipo: 'sem', dias: 0 };
  if (d < 0) return { tipo: 'atrasado', dias: -d };
  if (d === 0) return { tipo: 'hoje', dias: 0 };
  return { tipo: 'futuro', dias: d };
}

/** Por que o lead não fechou — alimenta a decisão de preço e de anúncio. */
export const MOTIVOS_PERDA = [
  'Achou caro',
  'Alugou outro imóvel',
  'Não gostou do imóvel',
  'Sumiu / não responde',
  'Não passou na Loft',
  'Desistiu de alugar agora',
  'Outro',
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// FUNIL 2 · A LOCAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * As etapas da locação, do interessado às chaves. Cada uma tem o que falta e
 * quem está devendo — o gestor lê a linha e sabe se a bola é dele ou de fora.
 *
 * A ordem que o gestor definiu: quando a Loft APROVA, os dois contratos saem
 * NO MESMO MOMENTO — a Loft dispara a fiança pro inquilino, e a casa dispara
 * o contrato de locação + laudo de vistoria. Aí é uma espera só ("Assinando"),
 * com dois vistos independentes: a fiança e o nosso contrato. Assinaram os
 * dois → chaves.
 */
export const ETAPAS_LOCACAO = {
  /** vive no CRM até o corretor fechar — não aparece na régua burocrática */
  interessado: {
    n: 1, rotulo: 'No CRM', icone: '📥', comQuem: 'corretor',
    oQueFalta: 'o corretor está trabalhando o lead no CRM',
    ajuda: 'entrada → contato → agendamento → negociação; fechou, começa a papelada aqui',
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
    n: 4, rotulo: 'Aprovado', icone: '✅', comQuem: 'nós',
    oQueFalta: 'fazer a vistoria e disparar o nosso contrato — a fiança da Loft já foi pro inquilino',
    ajuda: 'os dois contratos saem no mesmo momento: a fiança (Loft) e o nosso (com o laudo)',
  },
  contrato_enviado: {
    n: 5, rotulo: 'Assinando', icone: '✍', comQuem: 'ambos',
    oQueFalta: 'aguardando as duas assinaturas: a fiança e o nosso contrato',
    ajuda: 'assinou os dois → avança sozinho pra entrega das chaves',
  },
  /** legado: etapa antiga do fluxo em fila — hoje equivale a "Assinando" */
  fianca_assinada: {
    n: 5, rotulo: 'Assinando', icone: '✍', comQuem: 'ambos',
    oQueFalta: 'aguardando as duas assinaturas: a fiança e o nosso contrato',
    ajuda: 'assinou os dois → avança sozinho pra entrega das chaves',
  },
  contrato_assinado: {
    n: 6, rotulo: 'Tudo assinado', icone: '🤝', comQuem: 'nós',
    oQueFalta: 'marcar e fazer a entrega das chaves',
    ajuda: 'portal do inquilino criado na entrega',
  },
  ativa: {
    n: 7, rotulo: 'Cliente ativo', icone: '🏡', comQuem: 'asaas',
    oQueFalta: '',
    ajuda: 'morando e em dia com o contrato — boletos e repasses ficam na aba Cobrança',
  },
  encerrando: {
    n: 8, rotulo: 'Em saída', icone: '↪', comQuem: 'nós',
    oQueFalta: 'vistoria de saída e distrato',
    ajuda: 'o inquilino avisou que sai',
  },
  encerrada: { n: 9, rotulo: 'Encerrada', icone: '📁', comQuem: '', oQueFalta: '', ajuda: 'histórico' },
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

  // ——— o CRM (relacionamento — o corretor move livre) ———
  crmEtapa: CrmEtapa;
  crmNotas: NotaCrm[];
  /** quando falar com ele de novo — o batimento do CRM */
  crmProximoContato: string;
  /** a visita marcada no imóvel (coluna Agendamento) */
  crmVisitaEm: string;
  /** qualificação pro ALUGUEL — simples, sem script */
  qParaQuando: string;
  qPessoas: string;
  qPet: string;
  qRenda: string;
  qProcura: string;

  // ——— a garantia (com a Loft) ———
  garantiaTipo: string;
  /** nº da apólice que a Loft devolve na aprovação — sai no contrato */
  garantiaNumero: string;
  /** legado — a taxa é assunto entre a Loft e o inquilino, não se digita aqui */
  garantiaTaxaMensalPct: number | null;
  /** legado — a fiança renova junto com o contrato, não tem data própria */
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
  /** a HORA combinada da entrega — chave se entrega com hora marcada, não só data */
  chavesHora: string;
  observacoes: string;
  encerradaEm: string;
  motivoPerda: string;

  criadoEm?: unknown; atualizadoEm?: unknown;
}

export const LOCACAO_VAZIA: Omit<Locacao, 'id' | 'imobiliariaId'> = {
  imovelId: '', etapa: 'interessado',
  nome: '', telefone: '', email: '', doc: '', rg: '', estadoCivil: '', profissao: '',
  enderecoAtual: '', docsInquilino: [], origem: 'manual', temperatura: '', mensagem: '', corretorNome: '',
  crmEtapa: 'entrada', crmNotas: [], crmProximoContato: '', crmVisitaEm: '',
  qParaQuando: '', qPessoas: '', qPet: '', qRenda: '', qProcura: '',
  garantiaTipo: 'Seguro-fiança (Loft)', garantiaNumero: '', garantiaTaxaMensalPct: null,
  garantiaVigenciaFim: '', garantiaEnviadaEm: '', garantiaAssinadaEm: '', garantiaSimulada: false,
  inicio: '', prazoMeses: 12, valorAluguel: null, valorCondominio: null,
  valorIptuMensal: null, valorSeguroIncendio: null, diaVencimento: 5,
  indiceReajuste: 'IGP-M', taxaAdmPct: 10,
  contratoEnviadoEm: '', contratoAssinadoEm: '', contratoSimulado: false, reajustes: [],
  vistoriaEntrada: null, vistoriaSaida: null,
  chavesEntreguesEm: '', chavesHora: '', observacoes: '', encerradaEm: '', motivoPerda: '',
};

// ═══════════════════════════════════════════════════════════════════════════
// O ACESSO AO PORTAL DO CLIENTE
//
// Enquanto não existe cadastro de senha, a casa usa uma REGRA fixa que o
// cliente consegue lembrar sozinho e que a imobiliária consegue ditar por
// telefone: nome completo + os 4 primeiros dígitos do CPF.
//
// Isso mora aqui (e não espalhado nas telas) porque no dia em que virar
// senha de verdade, muda-se num lugar só — e as duas telas, a mensagem de
// WhatsApp e o aviso do portal acompanham.
// ═══════════════════════════════════════════════════════════════════════════

export interface AcessoPortal {
  usuario: string;
  senha: string;
  /** false quando falta o CPF — não dá pra enviar acesso sem ele */
  pronto: boolean;
  falta: string;
}

export function acessoPortal(nome: string, doc: string): AcessoPortal {
  const limpo = (doc || '').replace(/\D/g, '');
  const usuario = (nome || '').trim();
  const senha = limpo.slice(0, 4);
  return {
    usuario, senha,
    pronto: usuario.length > 2 && senha.length === 4,
    falta: usuario.length <= 2 ? 'o nome completo' : senha.length < 4 ? 'o CPF' : '',
  };
}

/** A mensagem pronta pra colar no WhatsApp do cliente. */
export function textoAcessoPortal(a: AcessoPortal, quem: 'dono' | 'inquilino', endereco: string): string {
  const o = quem === 'dono'
    ? 'acompanhar o seu imóvel, ver quando o aluguel foi pago e quanto cai no seu repasse'
    : 'ver o boleto, o histórico de pagamentos, o contrato e pedir manutenção';
  return [
    `Olá, ${a.usuario.split(' ')[0]}! Aqui é da ${DADOS_IMOBILIARIA.razao.replace(' Ltda.', '')}.`,
    '',
    `Seu portal do cliente já está no ar — é lá que você pode ${o}.`,
    '',
    '🔗 Acesse: alumma.com.br/portal',
    `👤 Usuário: ${a.usuario}`,
    `🔑 Senha: ${a.senha} (os 4 primeiros dígitos do seu CPF)`,
    '',
    endereco ? `Imóvel: ${endereco}` : '',
    'Qualquer dúvida é só chamar por aqui.',
  ].filter((l) => l !== undefined).join('\n');
}

/** O que falta para a locação andar. */
export function pendenciasLocacao(l: Locacao): string[] {
  const p: string[] = [];
  if (l.etapa === 'docs_inquilino') {
    if (!l.doc.trim()) p.push('CPF do inquilino');
    if (!l.docsInquilino.length) p.push('Ao menos um documento (CNH/RG, renda)');
  }
  // o portão de ENVIAR O NOSSO CONTRATO: sai no mesmo momento da fiança,
  // então tudo que o contrato preenche precisa estar dentro antes
  if (l.etapa === 'loft_aprovou' || l.etapa === 'fianca_assinada') {
    if (!l.vistoriaEntrada) p.push('Vistoria de entrada');
    if (!l.valorAluguel) p.push('Valor do aluguel');
    if (!l.inicio) p.push('Data de início prevista');
    if (!l.rg.trim() || !l.estadoCivil.trim()) p.push('Qualificação completa do inquilino (RG, estado civil, profissão)');
    // sem taxa a casa administra de graça e ninguém percebe até o repasse
    if (!l.taxaAdmPct) p.push('Taxa de administração (%) — sem ela o repasse sai sem a comissão da casa');
    if (!l.diaVencimento) p.push('Dia do vencimento');
    if (!l.prazoMeses) p.push('Prazo em meses');
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

/**
 * OS DADOS DA IMOBILIÁRIA NOS PAPÉIS — de mentira, e com cara de mentira.
 *
 * O gestor ainda não passou CNPJ, CRECI e endereço da Nox; os contratos
 * precisam deles pra ele VER o documento 100% preenchido. Quando vierem os
 * reais, troca-se AQUI e todos os papéis (administração, locação, laudo)
 * atualizam juntos.
 */
export const DADOS_IMOBILIARIA = {
  razao: 'Nox Imóveis Ltda.',
  cnpj: '00.000.000/0001-00 (preencher)',
  creci: 'CRECI/SC 00000-J (preencher)',
  endereco: 'Av. Eugênio Krause, 100, Centro, Penha/SC (preencher)',
  telefone: '(47) 90000-0000',
  email: 'contato@noximobiliaria.com.br',
} as const;

/** Dinheiro nunca fica com fração de centavo. */
export const cents = (v: number): number => Math.round(v * 100) / 100;

/** Teto de segurança: contrato longo demais estoura o lote do Firestore (500). */
export const MAX_PARCELAS = 120;

/**
 * As cobranças do contrato, uma por competência.
 *
 * Três armadilhas que a versão ingênua tinha e que custariam dinheiro:
 *
 *   1. VENCIMENTO DIA 29–31. `new Date(2027, 1, 31)` vira 3 de março. O
 *      inquilino receberia boleto vencendo fora do mês da competência. Aqui
 *      o dia é limitado ao último dia de cada mês.
 *   2. PRIMEIRA COBRANÇA NO PASSADO. Chave entregue dia 20 com vencimento
 *      dia 5 gerava uma cobrança vencida dia 5 do mesmo mês — nascia
 *      atrasada e disparava alerta de inadimplência no primeiro dia. Agora
 *      a primeira competência é a primeira cujo vencimento cai depois da
 *      entrega da chave.
 *   3. CENTAVOS. Soma de float virava 1970.0000000000002 no extrato.
 */
export function gerarMovimentos(l: Locacao): Omit<Movimento, 'id' | 'imobiliariaId' | 'criadoEm'>[] {
  if (!l.inicio || !l.valorAluguel || !l.diaVencimento || !l.prazoMeses) return [];
  const out: Omit<Movimento, 'id' | 'imobiliariaId' | 'criadoEm'>[] = [];
  const ini = new Date(l.inicio + 'T12:00:00');
  if (Number.isNaN(ini.getTime())) return [];

  const aluguel = l.valorAluguel;
  const iptu = l.valorIptuMensal || 0;   // cobrado e repassado inteiro ao dono
  const seguro = l.valorSeguroIncendio || 0;
  const taxa = cents(aluguel * (l.taxaAdmPct || 0) / 100);
  const dia = Math.min(Math.max(Math.trunc(l.diaVencimento), 1), 31);
  const parcelas = Math.min(Math.max(Math.trunc(l.prazoMeses), 1), MAX_PARCELAS);

  /** Vencimento do mês, sem transbordar pro mês seguinte. */
  const vencimentoDe = (ano: number, mes: number): Date => {
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    return new Date(ano, mes, Math.min(dia, ultimoDia), 12);
  };

  // a primeira competência é a primeira que vence DEPOIS da entrega da chave
  let desloc = 0;
  if (vencimentoDe(ini.getFullYear(), ini.getMonth()) < ini) desloc = 1;

  for (let m = 0; m < parcelas; m++) {
    const comp = new Date(ini.getFullYear(), ini.getMonth() + m + desloc, 1);
    const venc = vencimentoDe(comp.getFullYear(), comp.getMonth());
    out.push({
      locacaoId: l.id,
      competencia: `${comp.getFullYear()}-${String(comp.getMonth() + 1).padStart(2, '0')}`,
      vencimento: ymd(venc),
      valorAluguel: aluguel, valorIptu: iptu, valorSeguro: seguro,
      valorTotal: cents(aluguel + iptu + seguro),   // condomínio fica fora
      taxaAdm: taxa,
      repasseDono: cents(aluguel - taxa + iptu),
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

/** A ordem natural de um conserto — o botão da caixa de entrada segue ela. */
export const PROXIMO_STATUS_CHAMADO: Partial<Record<StatusChamado, { para: StatusChamado; rotulo: string }>> = {
  aberto: { para: 'orcando', rotulo: '📐 Pedir orçamento' },
  orcando: { para: 'aguardando_dono', rotulo: '📤 Mandar pro dono aprovar' },
  aguardando_dono: { para: 'executando', rotulo: '🔨 Dono aprovou — executar' },
  executando: { para: 'resolvido', rotulo: '✓ Concluído' },
};

// ═══════════════════════════════════════════════════════════════════════════
// AS MENSAGENS DOS CLIENTES
//
// O recado que o dono ou o inquilino manda pelo portal (ou pelo WhatsApp, e
// a casa registra aqui). Diferente do chamado de manutenção — que tem obra,
// orçamento e status — a mensagem só precisa de duas coisas: ser LIDA e ser
// RESPONDIDA. A caixa de entrada mostra as duas fontes juntas.
// ═══════════════════════════════════════════════════════════════════════════

export interface MensagemCliente {
  id: string;
  imobiliariaId: string;
  /** de quem veio */
  de: 'inquilino' | 'dono';
  nome: string;
  telefone: string;
  /** a que se refere: locação (inquilino) ou imóvel (dono) */
  locacaoId: string;
  imovelId: string;
  texto: string;
  /** '' = ainda não tratada */
  tratadaEm: string;
  /** anotação interna de como foi resolvido */
  resposta: string;
  simulada: boolean;
  criadoEm?: unknown; atualizadoEm?: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// FERRAMENTAS
// ═══════════════════════════════════════════════════════════════════════════

export const fmtValor = (v: number | null | undefined): string =>
  v === null || v === undefined
    ? '—'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v % 1 ? 2 : 0 });

export const fmtData = (data?: string): string => (data ? data.split('-').reverse().join('/') : '—');

/**
 * Data no fuso de quem está usando — nunca em UTC.
 *
 * FURO CORRIGIDO: `toISOString().slice(0,10)` a partir das 21h no Brasil já
 * devolve o dia SEGUINTE. Contrato assinado às 22h nascia datado de amanhã,
 * pagamento registrado à noite entrava no dia errado e o cálculo de atraso
 * pulava um dia. Em documento com valor jurídico isso não pode acontecer.
 */
export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const hojeYmd = (): string => ymd(new Date());

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

/** Soma meses sem transbordar: 31/01 + 1 mês = 28/02, não 03/03. */
function somaMeses(d: Date, meses: number): Date {
  const dia = d.getDate();
  const alvo = new Date(d.getFullYear(), d.getMonth() + meses, 1, 12);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(dia, ultimo));
  return alvo;
}

export function fimContrato(l: Pick<Locacao, 'inicio' | 'prazoMeses'>): string {
  if (!l.inicio || !l.prazoMeses) return '';
  return ymd(somaMeses(new Date(l.inicio + 'T12:00:00'), l.prazoMeses));
}

/**
 * Quando cai o próximo reajuste anual.
 *
 * FURO CORRIGIDO: antes contava sempre do INÍCIO do contrato. Depois de
 * aplicar o reajuste o alerta continuava aceso até passar o aniversário —
 * e o botão "aplicar" continuava lá. Dois cliques no mesmo ciclo dobravam
 * o aluguel do inquilino. Agora o relógio parte do ÚLTIMO reajuste
 * aplicado, então o alerta apaga no instante em que o trabalho é feito.
 */
export function proximoReajuste(l: Pick<Locacao, 'inicio' | 'reajustes'>): string {
  if (!l.inicio) return '';
  const feitos = l.reajustes || [];
  const ultimo = feitos.length ? feitos[feitos.length - 1].em : '';
  let d = somaMeses(new Date((ultimo || l.inicio) + 'T12:00:00'), 12);
  const hoje = new Date();
  while (d <= hoje) d = somaMeses(d, 12);
  return ymd(d);
}

export function diasAte(ymd: string): number | null {
  if (!ymd) return null;
  return Math.ceil((new Date(ymd + 'T12:00:00').getTime() - Date.now()) / 864e5);
}

export interface AlertaImovel { tipo: 'feed' | 'assinatura' | 'parado' | 'semDono'; texto: string; grave: boolean }

/**
 * O que falta no anúncio, dito em UMA frase curta e com verbo.
 *
 * As pendências normais são feitas pra lista de conferência ("Mínimo de 5
 * fotos (tem 3) — regra do Grupo OLX"). Enfiadas no meio de um alerta viram
 * travalíngua. Aqui a mesma falta vira "faltam 2 fotos".
 */
export function faltaCurta(i: ImovelLocacao): string {
  const R = REGRAS_PORTAIS;
  if (i.fotos.length < R.fotosMin) {
    const n = R.fotosMin - i.fotos.length;
    return n === 1 ? `falta 1 foto (mínimo ${R.fotosMin})` : `faltam ${n} fotos (mínimo ${R.fotosMin})`;
  }
  if (i.descricao.trim().length < R.descricaoMin) return 'a descrição está curta demais';
  if (!i.cep.trim()) return 'falta o CEP';
  if (!i.titulo.trim() || i.titulo.trim().length < R.tituloMin) return 'o título está curto demais';
  if (!i.portais.length) return 'nenhum portal foi marcado';
  return 'o anúncio está incompleto';
}

/**
 * O que está pegando no IMÓVEL — o espelho dos alertas da locação.
 *
 * O funil do proprietário não tinha nada disso: só a etapa e o que falta.
 * Mas o lado do dono tem os seus próprios incêndios, e todos custam:
 * anúncio no ar fora da regra derruba o feed inteiro, administração parada
 * no WhatsApp trava a captação, e anúncio publicado há semanas sem um
 * interessado é preço ou capa errada — dinheiro parado.
 */
export function alertasDoImovel(i: ImovelLocacao, interessados: number): AlertaImovel[] {
  const out: AlertaImovel[] = [];
  const diasDesde = (d: string): number | null => {
    const n = diasAte(d);
    return n === null ? null : -n;
  };

  if (i.etapa === 'publicado') {
    const falta = pendenciasImovel(i).material;
    if (falta.length) {
      out.push({
        tipo: 'feed', grave: true,
        texto: `Saiu do ar nos portais: ${faltaCurta(i)}. Enquanto não corrigir, os outros imóveis da casa também ficam fora.`,
      });
    } else {
      const dias = diasDesde(i.publicadoEm);
      if (interessados === 0 && dias !== null && dias >= 21) {
        out.push({
          tipo: 'parado', grave: dias >= 45,
          texto: `No ar há ${dias} dias e nenhum interessado — revise preço, foto de capa e título.`,
        });
      }
    }
  }

  if (i.etapa === 'adm_enviada') {
    const dias = diasDesde(i.admEnviadaEm);
    if (dias !== null && dias >= 3) {
      out.push({
        tipo: 'assinatura', grave: dias >= 10,
        texto: `Administração no WhatsApp de ${i.donoNome || 'do dono'} há ${dias} dias sem assinatura — cobrar.`,
      });
    }
  }

  if (i.etapa !== 'captado' && !i.donoPix.trim()) {
    out.push({ tipo: 'semDono', grave: false, texto: 'Sem chave PIX do proprietário — o repasse não teria pra onde ir.' });
  }

  return out;
}

export interface Alerta { tipo: 'reajuste' | 'vigencia' | 'chamado'; texto: string; grave: boolean }

export function alertasDaLocacao(l: Locacao): Alerta[] {
  if (l.etapa !== 'ativa') return [];
  const out: Alerta[] = [];

  // a fiança da Loft não tem relógio próprio: ela renova junto com o
  // contrato, então o alerta de fim de vigência (abaixo) já cobre as duas

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

/**
 * Quem realmente entra no XML.
 *
 * FURO CORRIGIDO: bastava editar um anúncio já publicado e apagar duas
 * fotos pra ele continuar "publicado" com 3 fotos. O feed sairia fora da
 * regra do Grupo OLX e eles reprovam o ARQUIVO INTEIRO — todos os imóveis
 * da casa saem do ar por causa de um. Agora o anúncio incompleto é deixado
 * de fora do arquivo, e a tela avisa quem ficou de fora.
 */
export function imoveisNoFeed(imoveis: ImovelLocacao[]): ImovelLocacao[] {
  return imoveis.filter((i) =>
    i.etapa === 'publicado'
    && i.portais.includes('grupo_olx')
    && pendenciasImovel(i).material.length === 0);
}

/** Publicados que estão fora do feed por anúncio incompleto. */
export function imoveisForaDoFeed(imoveis: ImovelLocacao[]): { imovel: ImovelLocacao; falta: string[] }[] {
  return imoveis
    .filter((i) => i.etapa === 'publicado' && i.portais.includes('grupo_olx'))
    .map((i) => ({ imovel: i, falta: pendenciasImovel(i).material }))
    .filter((x) => x.falta.length > 0);
}

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

  for (const i of imoveisNoFeed(imoveis)) {
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

/**
 * ⚠ A JANELA DA GARANTIA — o furo mais caro da locação.
 *
 * Quando a garantia é seguro-fiança, a seguradora só paga se for AVISADA
 * dentro do prazo da apólice (na prática, até 30 dias depois do vencimento,
 * por escrito). Passou disso, a cobertura cai: o proprietário não recebe e
 * a conta sobra pra casa, que garantiu o aluguel a ele.
 *
 * Um atraso de 60 dias que ninguém avisou é prejuízo direto. Por isso o
 * aviso aparece na tela do dinheiro, com o relógio correndo à vista.
 */
export const PRAZO_AVISO_GARANTIA = 30;

export interface AvisoGarantia {
  /** true quando a garantia é seguradora (fiança/Loft) e há atraso */
  vale: boolean;
  diasAtraso: number;
  /** quantos dias faltam pra perder a cobertura (negativo = já perdeu) */
  diasRestantes: number;
  tom: 'ok' | 'atencao' | 'alerta';
  texto: string;
}

/** A garantia é de seguradora? (fiança/Loft — capitalização e caução não avisam ninguém.) */
export const garantiaDeSeguradora = (tipo: string) =>
  /fian|loft|seguro/i.test(tipo || '') && !/inc[eêé]nd/i.test(tipo || '');

export function avisoGarantia(l: Locacao, vencimentoMaisAntigo: string): AvisoGarantia {
  const vazio: AvisoGarantia = { vale: false, diasAtraso: 0, diasRestantes: 0, tom: 'ok', texto: '' };
  if (!vencimentoMaisAntigo || !garantiaDeSeguradora(l.garantiaTipo)) return vazio;
  const d = diasAte(vencimentoMaisAntigo);
  if (d === null || d >= 0) return vazio;
  const atraso = -d;
  const restam = PRAZO_AVISO_GARANTIA - atraso;
  if (restam < 0) {
    return {
      vale: true, diasAtraso: atraso, diasRestantes: restam, tom: 'alerta',
      texto: `Passaram ${atraso} dias do vencimento — o prazo de ${PRAZO_AVISO_GARANTIA} dias pra avisar a seguradora VENCEU há ${-restam}. Se a garantia não foi acionada, fale com a seguradora hoje: o proprietário conta com esse dinheiro.`,
    };
  }
  if (restam <= 10) {
    return {
      vale: true, diasAtraso: atraso, diasRestantes: restam, tom: 'alerta',
      texto: `${atraso} dias de atraso — restam ${restam} dias pra acionar a garantia (${l.garantiaTipo}). Depois disso a seguradora não cobre.`,
    };
  }
  return {
    vale: true, diasAtraso: atraso, diasRestantes: restam, tom: 'atencao',
    texto: `${atraso} dias de atraso. A garantia (${l.garantiaTipo}) precisa ser acionada em até ${restam} dias.`,
  };
}

export interface DadosPortal {
  demo: boolean;
  aguardandoLocacao?: boolean;
  imovel: { titulo: string; endereco: string; codigo: string };
  /** o dono vê a chave PIX que recebe o dinheiro — se estiver errada, o repasse não chega */
  dono: { nome: string; pix?: string };
  inquilino: { nome: string };
  /** quem cuida deste contrato na Nox — o cliente quer um nome, não um protocolo */
  atendimento?: { corretor: string };
  /**
   * O DOSSIÊ — o que está assinado e guardado.
   * Sem isso o cliente liga pedindo "me manda meu contrato" e alguém tem que
   * procurar no e-mail. Aqui ele vê que existe e desde quando.
   */
  documentos?: { rotulo: string; quando: string; ok: boolean }[];
  contrato: {
    inicio: string; fim: string; prazoMeses: number | null;
    indiceReajuste: string; proximoReajuste: string;
    diaVencimento: number | null; garantia: string;
    /** quanto falta pro fim — o cliente pergunta isso o tempo todo */
    mesesRestantes: number | null;
    diasAteReajuste: number | null;
  };
  valores: {
    aluguel: number; condominio: number; iptuMensal: number; seguroIncendio: number;
    taxaAdmPct: number; totalInquilino: number; taxaAdm: number; repasseDono: number;
  };
  historico: { competencia: string; vencimento: string; pagoEm: string; valor: number; repasse: number; status: 'pago' | 'pago_atraso' | 'aberta' | 'prevista' }[];
  /** a cobrança da vez, com a urgência já calculada */
  proxima: { competencia: string; vencimento: string; diasAte: number; atrasadaDias: number } | null;
  /** o fechamento do ano — o dono usa no imposto de renda */
  ano: { rotulo: string; pagas: number; totalPago: number; totalRepassado: number };
  /** os pedidos de manutenção do inquilino, pra ele acompanhar */
  chamados: { descricao: string; status: string; em: string }[];
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
    dono: { nome: i.donoNome, pix: i.donoPix }, inquilino: { nome: '' },
    documentos: [
      { rotulo: 'Contrato de administração', quando: fmtData(i.admAssinadaEm), ok: !!i.admAssinadaEm },
      { rotulo: 'Seus documentos (RG, CPF, matrícula)', quando: '', ok: (i.docsDono || []).length > 0 },
    ],
    contrato: {
      inicio: '—', fim: '—', prazoMeses: null, indiceReajuste: '—', proximoReajuste: '—',
      diaVencimento: null, garantia: i.garantiasAceitas.join(', ') || '—',
      mesesRestantes: null, diasAteReajuste: null,
    },
    valores: {
      aluguel: i.aluguel || 0, condominio: i.condominio || 0, iptuMensal: i.iptuMensal || 0,
      seguroIncendio: i.seguroIncendio || 0, taxaAdmPct: i.taxaAdmPct || 0,
      totalInquilino: totalInquilino({ aluguel: i.aluguel, iptuMensal: i.iptuMensal, seguroIncendio: i.seguroIncendio }),
      taxaAdm: taxa, repasseDono: (i.aluguel || 0) - taxa + (i.iptuMensal || 0),
    },
    historico: [], proxima: null,
    ano: { rotulo: String(new Date().getFullYear()), pagas: 0, totalPago: 0, totalRepassado: 0 },
    chamados: [],
    avisos: [{ data: '', texto: `Seu imóvel está em "${et.rotulo}". Assim que for alugado, os pagamentos e repasses aparecem aqui.` }],
  };
}

export function portalDaLocacao(
  l: Locacao,
  i: ImovelLocacao | undefined,
  movs: Movimento[],
  chamados: Chamado[] = [],
): DadosPortal {
  const aluguel = l.valorAluguel || 0;
  const taxa = cents(aluguel * (l.taxaAdmPct || 0) / 100);
  const iptu = l.valorIptuMensal || 0;
  const hoje = hojeYmd();
  const anoAtual = hoje.slice(0, 4);
  const ordenados = [...movs].sort((a, b) => b.competencia.localeCompare(a.competencia));
  const proxima = [...movs].filter((m) => m.statusCobranca !== 'paga')
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0] || null;

  // o fechamento do ano — o dono precisa disto no imposto de renda
  const pagasNoAno = movs.filter((m) => m.statusCobranca === 'paga' && m.competencia.startsWith(anoAtual));
  const fim = fimContrato(l);
  const dFim = diasAte(fim);
  const dReaj = diasAte(proximoReajuste(l));

  return {
    demo: false,
    imovel: { titulo: i?.titulo || 'Imóvel', endereco: enderecoDe(i), codigo: i?.codigo || '' },
    dono: { nome: i?.donoNome || '', pix: i?.donoPix }, inquilino: { nome: l.nome },
    atendimento: { corretor: l.corretorNome || '' },
    documentos: [
      { rotulo: 'Contrato de locação assinado', quando: fmtData(l.contratoAssinadoEm), ok: !!l.contratoAssinadoEm },
      {
        rotulo: l.garantiaTipo ? `Garantia · ${l.garantiaTipo}${l.garantiaNumero ? ` (apólice ${l.garantiaNumero})` : ''}` : 'Garantia',
        quando: fmtData(l.garantiaAssinadaEm), ok: !!l.garantiaAssinadaEm,
      },
      { rotulo: 'Vistoria de entrada', quando: fmtData(l.vistoriaEntrada?.feitaEm || ''), ok: !!l.vistoriaEntrada?.feitaEm },
      { rotulo: 'Entrega das chaves', quando: fmtData(l.chavesEntreguesEm), ok: !!l.chavesEntreguesEm },
    ],
    contrato: {
      inicio: fmtData(l.inicio), fim: fmtData(fim), prazoMeses: l.prazoMeses,
      indiceReajuste: l.indiceReajuste, proximoReajuste: fmtData(proximoReajuste(l)),
      diaVencimento: l.diaVencimento, garantia: l.garantiaTipo,
      mesesRestantes: dFim === null ? null : Math.max(0, Math.round(dFim / 30)),
      diasAteReajuste: dReaj,
    },
    valores: {
      aluguel, condominio: l.valorCondominio || 0, iptuMensal: iptu,
      seguroIncendio: l.valorSeguroIncendio || 0, taxaAdmPct: l.taxaAdmPct || 0,
      totalInquilino: cents(aluguel + iptu + (l.valorSeguroIncendio || 0)),
      taxaAdm: taxa, repasseDono: cents(aluguel - taxa + iptu),
    },
    historico: ordenados.filter((m) => m.statusCobranca === 'paga' || m.vencimento < hoje).slice(0, 12).map((m) => ({
      competencia: compLegivel(m.competencia), vencimento: fmtData(m.vencimento), pagoEm: fmtData(m.pagoEm),
      valor: m.valorTotal, repasse: m.repasseDono,
      status: m.statusCobranca === 'paga' ? (m.pagoEm && m.pagoEm > m.vencimento ? 'pago_atraso' : 'pago') : 'aberta',
    })),
    proxima: proxima ? {
      competencia: compLegivel(proxima.competencia),
      vencimento: fmtData(proxima.vencimento),
      diasAte: Math.max(0, diasAte(proxima.vencimento) ?? 0),
      atrasadaDias: proxima.vencimento < hoje ? -(diasAte(proxima.vencimento) ?? 0) : 0,
    } : null,
    ano: {
      rotulo: anoAtual,
      pagas: pagasNoAno.length,
      totalPago: cents(pagasNoAno.reduce((s, m) => s + m.valorTotal, 0)),
      totalRepassado: cents(pagasNoAno.reduce((s, m) => s + m.repasseDono, 0)),
    },
    chamados: chamados
      .filter((c) => c.locacaoId === l.id)
      .slice(0, 5)
      .map((c) => ({
        descricao: c.descricao,
        status: (STATUS_CHAMADO[c.status] || STATUS_CHAMADO.aberto).rotulo,
        em: '',
      })),
    avisos: [],
  };
}

export const DEMO_PORTAL: DadosPortal = {
  demo: true,
  imovel: { titulo: 'Apartamento 2 quartos com sacada — Centro, Penha', endereco: 'Rua Nereu Ramos, 245 — apto 302, Centro, Penha/SC', codigo: 'LOC-001' },
  dono: { nome: 'Roberto Krüger', pix: 'roberto.kruger@email.com' },
  inquilino: { nome: 'Fernanda Lima' },
  atendimento: { corretor: 'Jorge Nox' },
  documentos: [
    { rotulo: 'Contrato de locação assinado', quando: '12/03/2026', ok: true },
    { rotulo: 'Garantia · Seguro-fiança (Loft) (apólice 8842-LF)', quando: '10/03/2026', ok: true },
    { rotulo: 'Vistoria de entrada', quando: '14/03/2026', ok: true },
    { rotulo: 'Entrega das chaves', quando: '15/03/2026', ok: true },
  ],
  contrato: {
    inicio: '15/03/2026', fim: '15/03/2027', prazoMeses: 12, indiceReajuste: 'IGP-M',
    proximoReajuste: '15/03/2027', diaVencimento: 5, garantia: 'Seguro-fiança (Loft)',
    mesesRestantes: 7, diasAteReajuste: 205,
  },
  valores: { aluguel: 1850, condominio: 380, iptuMensal: 92, seguroIncendio: 28, taxaAdmPct: 10, totalInquilino: 1970, taxaAdm: 185, repasseDono: 1757 },
  historico: [
    { competencia: 'julho/2026', vencimento: '05/07/2026', pagoEm: '03/07/2026', valor: 1970, repasse: 1757, status: 'pago' },
    { competencia: 'junho/2026', vencimento: '05/06/2026', pagoEm: '05/06/2026', valor: 1970, repasse: 1757, status: 'pago' },
    { competencia: 'maio/2026', vencimento: '05/05/2026', pagoEm: '08/05/2026', valor: 1970, repasse: 1757, status: 'pago_atraso' },
    { competencia: 'abril/2026', vencimento: '05/04/2026', pagoEm: '04/04/2026', valor: 1970, repasse: 1757, status: 'pago' },
  ],
  proxima: { competencia: 'agosto/2026', vencimento: '05/08/2026', diasAte: 3, atrasadaDias: 0 },
  ano: { rotulo: '2026', pagas: 4, totalPago: 7880, totalRepassado: 7028 },
  chamados: [
    { descricao: 'A torneira da cozinha está pingando desde ontem.', status: 'Orçando', em: '' },
  ],
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

// ═══════════════════════════════════════════════════════════════════════════
// OS DADOS DE TESTE
//
// Pra andar a operação inteira sem ter cliente real: fotos que aparecem,
// documentos que abrem e fichas que preenchem sozinhas. Nada disso encosta
// no Storage nem em conta de terceiro — é tudo desenhado na hora, na tela.
// ═══════════════════════════════════════════════════════════════════════════

/** Uma foto desenhada em SVG — aparece de verdade no anúncio e no laudo. */
export const fotoExemplo = (n: number): string =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">`
    + `<rect width="640" height="420" fill="#17171b"/>`
    + `<rect x="14" y="14" width="612" height="392" fill="none" stroke="#E8C547" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="9 7"/>`
    + `<text x="320" y="196" font-family="system-ui,sans-serif" font-size="27" font-weight="700" fill="#E8C547" text-anchor="middle">FOTO DE TESTE ${n}</text>`
    + `<text x="320" y="232" font-family="system-ui,sans-serif" font-size="15" fill="#8c8c95" text-anchor="middle">troque pelas fotos reais antes de publicar</text>`
    + `</svg>`,
  );

export const FOTOS_TESTE = [1, 2, 3, 4, 5].map(fotoExemplo);

/**
 * Um documento que não existe no Storage. Guarda url vazia de propósito: a
 * tela reconhece isso e, em vez de um link morto, abre um visor com o
 * conteúdo de teste desenhado na hora.
 */
export const arquivoTeste = (categoria: string): Arquivo => ({
  categoria,
  nome: categoria.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-teste.pdf',
  url: '',
});

export const ehArquivoTeste = (a: Arquivo): boolean => !a.url;

/** O que o visor mostra pra cada gaveta de documento. */
export function textoDocTeste(categoria = ''): { titulo: string; linhas: string[] } {
  const m: Record<string, { titulo: string; linhas: string[] }> = {
    'Contrato assinado': {
      titulo: 'Contrato de Locação — TESTE',
      linhas: [
        'contrato teste',
        'No lugar deste papel entra o PDF assinado que a ClickSign devolve, com o log de assinatura das duas partes e o carimbo de tempo.',
      ],
    },
    'Laudo de vistoria': {
      titulo: 'Laudo de Vistoria — TESTE',
      linhas: [
        'laudo teste',
        'O laudo real sai do próprio sistema (botão 📋 laudo) com as fotos do anúncio, os itens que ficam e as ressalvas.',
      ],
    },
    'Fiança da Loft': {
      titulo: 'Apólice de Fiança Locatícia — TESTE',
      linhas: [
        'apólice teste',
        'A Loft devolve a apólice em PDF com número, vigência e valor garantido. É este arquivo que fica aqui.',
      ],
    },
    'Matrícula do imóvel': {
      titulo: 'Matrícula do Imóvel — TESTE',
      linhas: ['matrícula teste', 'Certidão atualizada do Registro de Imóveis, que prova quem é o dono.'],
    },
    'Carnê do IPTU': {
      titulo: 'Carnê do IPTU — TESTE',
      linhas: ['carnê teste', 'Serve pra conferir a inscrição imobiliária e o valor anual que vira a fração mensal.'],
    },
    'Comprovante de renda': {
      titulo: 'Comprovante de Renda — TESTE',
      linhas: ['comprovante teste', 'Holerites, extrato ou declaração — é o que a Loft analisa pra aprovar a garantia.'],
    },
  };
  return m[categoria] || {
    titulo: `${categoria || 'Documento'} — TESTE`,
    linhas: ['documento teste', 'Quando o arquivo real for anexado, este visor some e o clique abre o PDF de verdade.'],
  };
}

/** A ficha do imóvel preenchida — o que o corretor teria depois da visita. */
export const IMOVEL_TESTE: Partial<Omit<ImovelLocacao, 'id' | 'imobiliariaId'>> = {
  titulo: 'Apartamento 2 quartos com sacada — Centro, Penha',
  tipo: 'Apartamento',
  rua: 'Rua Nereu Ramos', numero: '245', complemento: 'apto 302',
  bairro: 'Centro', cidade: 'Penha/SC', cep: '88385-000',
  latitude: '-26.7754', longitude: '-48.6461',
  quartos: 2, suites: 1, banheiros: 2, vagas: 1,
  areaPrivativa: 68, areaTotal: 85, andar: '3º', mobiliado: 'Semimobiliado',
  comodidades: ['Sacada', 'Churrasqueira', 'Elevador', 'Aceita pet'],
  aluguel: 1850, condominio: 380, iptuMensal: 92, seguroIncendio: 28,
  prazoMinimoMeses: 12, taxaAdmPct: 10,
};

/** O proprietário preenchido, com a papelada dele. */
export const DONO_TESTE: Partial<Omit<ImovelLocacao, 'id' | 'imobiliariaId'>> = {
  donoNome: 'Roberto Krüger (teste)', donoDoc: '111.222.333-44', donoRg: '2.114.887',
  donoTelefone: '(47) 98888-1111', donoEmail: 'roberto.teste@example.com',
  donoPix: 'roberto.teste@example.com',
  donoEstadoCivil: 'casado', donoProfissao: 'comerciante',
  donoEndereco: 'Rua Santa Catarina, 78, Centro, Penha/SC',
  docsDono: [
    arquivoTeste('RG/CPF do proprietário'),
    arquivoTeste('Matrícula do imóvel'),
    arquivoTeste('Carnê do IPTU'),
  ],
};

/** O material do anúncio pronto — passa nas regras do Grupo OLX. */
export const ANUNCIO_TESTE: Partial<Omit<ImovelLocacao, 'id' | 'imobiliariaId'>> = {
  descricao: 'Apartamento arejado no coração de Penha, a duas quadras da praia. Sacada com churrasqueira, sol da manhã, cozinha com armários planejados, condomínio com elevador e salão de festas. Uma vaga coberta. Aceita pet de pequeno porte.',
  fotos: FOTOS_TESTE,
  videoUrl: 'https://www.youtube.com/watch?v=teste',
  tourVirtualUrl: '',
  portais: ['grupo_olx', 'imovelweb', 'instagram'],
};

/** O inquilino preenchido: qualificação, papelada e termos do contrato. */
export const INQUILINO_TESTE: Partial<Locacao> = {
  qParaQuando: 'em até 30 dias', qPessoas: '2 adultos', qPet: '1 gato',
  qRenda: 'uns R$ 7.000 (casal)', qProcura: '2 quartos perto do Centro, com vaga',
  nome: 'Fernanda Lima (teste)', telefone: '(47) 95555-1122', email: 'fernanda.teste@example.com',
  doc: '999.888.777-66', rg: '4.001.998',
  estadoCivil: 'casada', profissao: 'fisioterapeuta',
  enderecoAtual: 'Rua Blumenau, 120, Centro, Itajaí/SC',
  corretorNome: 'Breno',
  docsInquilino: [
    arquivoTeste('CNH ou RG'),
    arquivoTeste('CPF'),
    arquivoTeste('Comprovante de renda'),
    arquivoTeste('Comprovante de endereço'),
  ],
  prazoMeses: 12, diaVencimento: 5, indiceReajuste: 'IGP-M', taxaAdmPct: 10,
  garantiaTipo: 'Seguro-fiança (Loft)',
};

/**
 * Copia do modelo SÓ o que está vazio no formulário — o que o operador já
 * digitou nunca é sobrescrito por dado de teste.
 */
export function preencherVazios<T extends object>(atual: T, modelo: Partial<T>): T {
  const out = { ...atual };
  for (const chave of Object.keys(modelo) as (keyof T)[]) {
    const v = out[chave];
    const vazio = v === null || v === undefined || v === ''
      || (Array.isArray(v) && v.length === 0);
    const doModelo = modelo[chave];
    if (vazio && doModelo !== undefined) out[chave] = doModelo as T[keyof T];
  }
  return out;
}
