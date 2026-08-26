/**
 * LOCAÇÃO · DADOS DE EXEMPLO — os dois funis povoados com um clique.
 *
 * A regra aqui é uma só: NENHUMA ETAPA NASCE ZERADA. O gestor reclamou (com
 * razão) de ver caixinhas em zero sem entender o que eram — então o exemplo
 * coloca pelo menos um caso em cada etapa dos dois funis, do imóvel recém
 * captado à locação com onze meses de história e alertas acesos.
 *
 *   FUNIL 1 · 7 imóveis, um por etapa: captado, documentos, administração
 *             enviada, assinada, material pronto, publicado e alugado.
 *   FUNIL 2 · uma locação por etapa: interessado, documentos, na Loft,
 *             aprovado (fiança já disparada), assinando (fiança ✓ / nosso ○),
 *             tudo assinado e cobrando — esta com 11 competências, uma
 *             atrasada, mais manutenção e recados na caixa de entrada.
 *
 * Tudo nasce com demo: true — o botão "apagar exemplos" remove só o que tem
 * essa marca, sem encostar em nada real.
 */
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import {
  IMOVEL_VAZIO, LOCACAO_VAZIA, gerarMovimentos, hojeYmd,
  FOTOS_TESTE, fotoExemplo, arquivoTeste, ymd, type Locacao,
} from '@/lib/locacao';

const FOTO = fotoExemplo(1);
const FOTOS5 = FOTOS_TESTE;

/** Data ymd deslocada N meses/dias de hoje. */
const desloca = (meses: number, dias = 0): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  d.setDate(d.getDate() + dias);
  return ymd(d);   // nunca UTC: às 21h no Brasil o ISO já virou o dia
};

export async function criarDadosExemplo(imobiliariaId: string): Promise<string> {
  const batch = writeBatch(db);
  const marca = { demo: true, imobiliariaId, criadoEm: serverTimestamp() };

  // ═══════════════ FUNIL 1 · um imóvel em cada etapa ═══════════════

  // 1 · CAPTADO — só o básico da rua, sem papelada do dono
  const imCaptado = doc(collection(db, 'locacaoImoveis'));
  batch.set(imCaptado, {
    ...IMOVEL_VAZIO, ...marca, codigo: 'EX-001', etapa: 'captado',
    titulo: 'Kitnet mobiliada — Gravatá, Penha',
    tipo: 'Kitnet', rua: 'Rua das Palmeiras', numero: '77', bairro: 'Gravatá', cidade: 'Penha/SC',
    quartos: 1, banheiros: 1, areaPrivativa: 32, mobiliado: 'Mobiliado',
    aluguel: 980, condominio: 150, iptuMensal: 38, seguroIncendio: 18,
    donoNome: 'Paulo Andrade', donoTelefone: '(47) 96666-3322',
  });

  // 2 · DOCUMENTOS DO DONO — papelada dentro, falta enviar a administração
  const imDocs = doc(collection(db, 'locacaoImoveis'));
  batch.set(imDocs, {
    ...IMOVEL_VAZIO, ...marca, codigo: 'EX-002', etapa: 'docs_dono',
    titulo: 'Sala comercial 40 m² — Centro, Balneário Piçarras',
    tipo: 'Sala comercial', rua: 'Av. Emanoel Pinto', numero: '410', bairro: 'Centro',
    cidade: 'Balneário Piçarras/SC', cep: '88380-000',
    banheiros: 1, vagas: 1, areaPrivativa: 40,
    aluguel: 1400, condominio: 260, iptuMensal: 70, seguroIncendio: 24,
    donoNome: 'Ivete Marchi', donoDoc: '888.999.000-11', donoRg: '4.556.778',
    donoTelefone: '(47) 99123-4567', donoEmail: 'ivete@example.com', donoPix: 'ivete@example.com',
    donoEstadoCivil: 'divorciada', donoProfissao: 'contadora',
    donoEndereco: 'Rua Getúlio Vargas, 90, Centro, Penha/SC',
    docsDono: [arquivoTeste('RG/CPF do proprietário'), arquivoTeste('Matrícula do imóvel')],
  });

  // 3 · ADMINISTRAÇÃO ENVIADA — no WhatsApp do dono, aguardando assinatura
  const imAdmEnviada = doc(collection(db, 'locacaoImoveis'));
  batch.set(imAdmEnviada, {
    ...IMOVEL_VAZIO, ...marca, codigo: 'EX-003', etapa: 'adm_enviada',
    admEnviadaEm: desloca(0, -2), admSimulada: true,
    titulo: 'Apartamento 3 quartos frente mar — Armação, Penha',
    tipo: 'Apartamento', rua: 'Av. Beira Mar', numero: '1200', complemento: 'apto 801',
    bairro: 'Armação', cidade: 'Penha/SC', cep: '88385-000',
    quartos: 3, suites: 1, banheiros: 2, vagas: 2, areaPrivativa: 95, andar: '8º',
    mobiliado: 'Semimobiliado', comodidades: ['Sacada', 'Piscina', 'Elevador', 'Vista mar'],
    aluguel: 3200, condominio: 620, iptuMensal: 180, seguroIncendio: 42,
    donoNome: 'Heloísa Grimm', donoDoc: '222.333.444-55', donoRg: '3.221.009',
    donoTelefone: '(47) 98111-4455', donoEmail: 'heloisa@example.com', donoPix: '47981114455',
    donoEstadoCivil: 'casada', donoProfissao: 'médica',
    donoEndereco: 'Rua Alvorada, 55, Itajaí/SC',
    docsDono: [arquivoTeste('RG/CPF do proprietário'), arquivoTeste('Carnê do IPTU')],
  });

  // 4 · ADMINISTRAÇÃO ASSINADA — autorizado; falta o material do anúncio
  const imAdmOk = doc(collection(db, 'locacaoImoveis'));
  batch.set(imAdmOk, {
    ...IMOVEL_VAZIO, ...marca, codigo: 'EX-004', etapa: 'adm_assinada',
    admEnviadaEm: desloca(0, -9), admAssinadaEm: desloca(0, -6), admSimulada: true,
    titulo: 'Sobrado 2 quartos — Nossa Senhora de Fátima',
    tipo: 'Sobrado', rua: 'Rua Bento Gonçalves', numero: '302', bairro: 'N. S. de Fátima',
    cidade: 'Penha/SC', cep: '88385-000',
    quartos: 2, banheiros: 2, vagas: 1, areaPrivativa: 78, areaTotal: 150,
    mobiliado: 'Não mobiliado', comodidades: ['Churrasqueira', 'Lavanderia'],
    aluguel: 1600, condominio: null, iptuMensal: 80, seguroIncendio: 26,
    donoNome: 'Jonas Beltrame', donoDoc: '777.111.222-33', donoRg: '2.998.114',
    donoTelefone: '(47) 99444-1122', donoEmail: 'jonas@example.com', donoPix: '47994441122',
    donoEstadoCivil: 'solteiro', donoProfissao: 'engenheiro',
    donoEndereco: 'Rua XV de Novembro, 12, Navegantes/SC',
    docsDono: [arquivoTeste('RG/CPF do proprietário'), arquivoTeste('Matrícula do imóvel')],
    fotos: [FOTO, FOTO], descricao: 'Sobrado em rua tranquila.',
  });

  // 5 · MATERIAL PRONTO — fotos, texto e portais escolhidos; falta publicar
  const imMaterial = doc(collection(db, 'locacaoImoveis'));
  batch.set(imMaterial, {
    ...IMOVEL_VAZIO, ...marca, codigo: 'EX-005', etapa: 'material',
    admEnviadaEm: desloca(-1, -4), admAssinadaEm: desloca(-1), admSimulada: true,
    titulo: 'Casa 3 quartos com quintal — Armação, Penha',
    tipo: 'Casa', rua: 'Rua das Gaivotas', numero: '88', bairro: 'Armação',
    cidade: 'Penha/SC', cep: '88385-000', latitude: '-26.7754', longitude: '-48.6461',
    quartos: 3, suites: 1, banheiros: 2, vagas: 2, areaPrivativa: 120, areaTotal: 300,
    mobiliado: 'Não mobiliado', comodidades: ['Churrasqueira', 'Lavanderia', 'Aceita pet'],
    aluguel: 2600, condominio: null, iptuMensal: 130, seguroIncendio: 35,
    donoNome: 'Marlene Souza', donoDoc: '555.666.777-88', donoRg: '1.884.552',
    donoTelefone: '(47) 97777-5544', donoEmail: 'marlene@example.com', donoPix: '47977775544',
    donoEstadoCivil: 'viúva', donoProfissao: 'aposentada',
    donoEndereco: 'Rua Rio Branco, 400, Penha/SC',
    docsDono: [arquivoTeste('RG/CPF do proprietário')],
    descricao: 'Casa ampla com quintal gramado no bairro Armação, ideal pra família com crianças e pets. Três quartos sendo uma suíte, churrasqueira coberta e duas vagas na frente.',
    fotos: FOTOS5, videoUrl: 'https://www.youtube.com/watch?v=exemplo',
    portais: ['grupo_olx', 'imovelweb', 'instagram'],
  });

  // 6 · PUBLICADO — no ar, recebendo os interessados do funil 2
  const imPublicado = doc(collection(db, 'locacaoImoveis'));
  batch.set(imPublicado, {
    ...IMOVEL_VAZIO, ...marca, codigo: 'EX-006', etapa: 'publicado',
    admEnviadaEm: desloca(-2, -3), admAssinadaEm: desloca(-2), admSimulada: true,
    publicadoEm: desloca(0, -18),
    titulo: 'Apartamento 2 quartos com sacada — Centro, Penha',
    tipo: 'Apartamento', rua: 'Rua Nereu Ramos', numero: '245', complemento: 'apto 302',
    bairro: 'Centro', cidade: 'Penha/SC', cep: '88385-000', latitude: '-26.7754', longitude: '-48.6461',
    quartos: 2, suites: 1, banheiros: 2, vagas: 1, areaPrivativa: 68, areaTotal: 85, andar: '3º',
    mobiliado: 'Semimobiliado', comodidades: ['Sacada', 'Churrasqueira', 'Elevador', 'Aceita pet'],
    aluguel: 1850, condominio: 380, iptuMensal: 92, seguroIncendio: 28, prazoMinimoMeses: 12,
    donoNome: 'Roberto Krüger', donoDoc: '111.222.333-44', donoRg: '2.114.887',
    donoTelefone: '(47) 98888-1111', donoEmail: 'roberto@example.com', donoPix: 'roberto@example.com',
    donoEstadoCivil: 'casado', donoProfissao: 'comerciante',
    donoEndereco: 'Rua Santa Catarina, 78, Penha/SC',
    docsDono: [arquivoTeste('RG/CPF do proprietário'), arquivoTeste('Matrícula do imóvel'), arquivoTeste('Carnê do IPTU')],
    descricao: 'Apartamento arejado no coração de Penha, a duas quadras da praia. Sacada com churrasqueira, sol da manhã, condomínio com elevador e salão de festas. Aceita pet de pequeno porte.',
    fotos: FOTOS5, portais: ['grupo_olx', 'imovelweb', 'instagram'],
  });

  // 7 · ALUGADO — fora do ar, com a locação ativa rodando no funil 2
  const imAlugado = doc(collection(db, 'locacaoImoveis'));
  batch.set(imAlugado, {
    ...IMOVEL_VAZIO, ...marca, codigo: 'EX-007', etapa: 'alugado',
    admEnviadaEm: desloca(-12, -5), admAssinadaEm: desloca(-12), admSimulada: true,
    publicadoEm: desloca(-12),
    titulo: 'Casa 3 quartos com churrasqueira — Praia Alegre, Penha',
    tipo: 'Casa', rua: 'Rua São Cristóvão', numero: '150', bairro: 'Praia Alegre',
    cidade: 'Penha/SC', cep: '88385-000',
    quartos: 3, suites: 1, banheiros: 2, vagas: 2, areaPrivativa: 110, areaTotal: 250,
    mobiliado: 'Não mobiliado', comodidades: ['Churrasqueira', 'Lavanderia'],
    aluguel: 2600, condominio: null, iptuMensal: 130, seguroIncendio: 35,
    donoNome: 'Tereza Bianchi', donoDoc: '444.555.666-77', donoRg: '3.008.221',
    donoTelefone: '(47) 99777-8899', donoEmail: 'tereza@example.com', donoPix: '47997778899',
    donoEstadoCivil: 'casada', donoProfissao: 'professora',
    donoEndereco: 'Rua Pedro Álvares, 33, Barra Velha/SC',
    docsDono: [arquivoTeste('RG/CPF do proprietário')],
    descricao: 'Casa térrea com churrasqueira e quintal fechado, a 400 metros da praia, três quartos sendo uma suíte.',
    fotos: FOTOS5, portais: ['grupo_olx'],
  });

  // ═══════════════ FUNIL 2 · uma locação em cada etapa ═══════════════

  const base = {
    imovelId: imPublicado.id,
    valorAluguel: 1850, valorCondominio: 380, valorIptuMensal: 92, valorSeguroIncendio: 28,
    taxaAdmPct: 10, diaVencimento: 5, prazoMeses: 12,
  };

  // 1 · CRM · ENTRADA — acabou de chegar do portal, ninguém falou com ele
  batch.set(doc(collection(db, 'locacaoLocacoes')), {
    ...LOCACAO_VAZIA, ...marca, ...base,
    etapa: 'interessado', crmEtapa: 'entrada',
    nome: 'Marcos Vieira', telefone: '(47) 99911-2233',
    origem: 'grupo_olx', temperatura: 'alta',
    mensagem: 'Vi o anúncio no ZAP e tenho interesse. Ainda está disponível pra visitar no sábado?',
    crmProximoContato: desloca(0, -2),   // atrasado: ninguém retornou
  });

  // 1b · CRM · EM CONTATO — conversando, com anotação e começo de qualificação
  batch.set(doc(collection(db, 'locacaoLocacoes')), {
    ...LOCACAO_VAZIA, ...marca, ...base,
    etapa: 'interessado', crmEtapa: 'contato',
    nome: 'Camila Duarte', telefone: '(47) 98123-9876',
    origem: 'grupo_olx', temperatura: 'media', corretorNome: 'Breno',
    qParaQuando: 'em até 60 dias', qPessoas: 'ela e o marido', qPet: 'não',
    crmProximoContato: hojeYmd(),        // falar hoje
    crmNotas: [
      { em: desloca(0, -2), por: 'Breno', texto: 'Respondeu rápido no WhatsApp. Quer visitar no fim de semana, prefere de manhã.' },
    ],
  });

  // 1c · CRM · AGENDAMENTO — visita marcada, qualificação adiantada
  batch.set(doc(collection(db, 'locacaoLocacoes')), {
    ...LOCACAO_VAZIA, ...marca, ...base,
    etapa: 'interessado', crmEtapa: 'agendamento',
    nome: 'Otávio Luz', telefone: '(47) 97456-1122',
    origem: 'instagram', corretorNome: 'Murilo',
    qParaQuando: 'urgente — saiu do apto atual', qPessoas: '2 adultos + 1 criança',
    qPet: '1 cachorro pequeno', qRenda: 'uns R$ 9.000', qProcura: '2 quartos com sacada, aceita pet',
    crmVisitaEm: desloca(0, 2), crmProximoContato: desloca(0, 1),
    crmNotas: [
      { em: desloca(0, -4), por: 'Murilo', texto: 'Veio pelo Instagram. Muito decidido, já conhece o prédio.' },
      { em: desloca(0, -1), por: 'Murilo', texto: 'Visita marcada pra sábado 10h. Confirmar sexta.' },
    ],
  });

  // 2 · DOCUMENTOS — fechou, está juntando a papelada
  batch.set(doc(collection(db, 'locacaoLocacoes')), {
    ...LOCACAO_VAZIA, ...marca, ...base,
    etapa: 'docs_inquilino', crmEtapa: 'negociacao', nome: 'Carlos Mendes', telefone: '(47) 99911-7788',
    email: 'carlos@example.com', doc: '123.456.789-00', origem: 'instagram',
    corretorNome: 'Breno',
    docsInquilino: [arquivoTeste('CNH ou RG')],
    observacoes: 'Falta o comprovante de renda dos últimos 3 meses.',
  });

  // 3 · NA LOFT — ficha enviada, aguardando a análise
  batch.set(doc(collection(db, 'locacaoLocacoes')), {
    ...LOCACAO_VAZIA, ...marca, ...base,
    etapa: 'na_loft', crmEtapa: 'negociacao', nome: 'Eduardo Ramos', telefone: '(47) 97733-6677',
    email: 'edu@example.com', doc: '321.654.987-11', rg: '5.112.334',
    estadoCivil: 'solteiro', profissao: 'analista de sistemas',
    enderecoAtual: 'Rua Getúlio Vargas, 200, Itajaí/SC',
    origem: 'grupo_olx', temperatura: 'media', corretorNome: 'Breno',
    docsInquilino: [arquivoTeste('CNH ou RG'), arquivoTeste('Comprovante de renda')],
  });

  // 4 · LOFT APROVOU — a fiança foi pro inquilino assinar
  batch.set(doc(collection(db, 'locacaoLocacoes')), {
    ...LOCACAO_VAZIA, ...marca, ...base,
    etapa: 'loft_aprovou', crmEtapa: 'negociacao', nome: 'Patrícia Nunes', telefone: '(47) 96644-8899',
    email: 'pati@example.com', doc: '444.333.222-11', rg: '4.887.221',
    estadoCivil: 'casada', profissao: 'enfermeira',
    enderecoAtual: 'Rua Dom Pedro, 45, Penha/SC',
    origem: 'grupo_olx', temperatura: 'alta', corretorNome: 'Murilo',
    docsInquilino: [arquivoTeste('CNH ou RG'), arquivoTeste('Comprovante de renda')],
    garantiaNumero: 'LOFT-73421',
    garantiaEnviadaEm: desloca(0, -1), garantiaSimulada: true,
  });

  // 5 · APROVADO — a Loft já disparou a fiança; nossa vez: vistoria + contrato
  batch.set(doc(collection(db, 'locacaoLocacoes')), {
    ...LOCACAO_VAZIA, ...marca, ...base,
    imovelId: imMaterial.id, valorAluguel: 2600, valorCondominio: null,
    valorIptuMensal: 130, valorSeguroIncendio: 35,
    etapa: 'loft_aprovou', crmEtapa: 'negociacao', nome: 'Sandra Correia', telefone: '(47) 95522-7788',
    email: 'sandra@example.com', doc: '666.777.888-99', rg: '5.223.118',
    estadoCivil: 'divorciada', profissao: 'representante comercial',
    enderecoAtual: 'Rua Blumenau, 88, Barra Velha/SC',
    origem: 'manual', corretorNome: 'Murilo',
    inicio: desloca(0, 12),
    docsInquilino: [arquivoTeste('CNH ou RG'), arquivoTeste('Comprovante de renda')],
    garantiaNumero: 'LOFT-80915',
    garantiaEnviadaEm: desloca(0, -1), garantiaSimulada: true,
  });

  // 6 · ASSINANDO — os dois contratos na rua; a fiança já voltou assinada,
  //     o nosso ainda não: é o estado de espera dupla que o gestor definiu
  batch.set(doc(collection(db, 'locacaoLocacoes')), {
    ...LOCACAO_VAZIA, ...marca, ...base,
    imovelId: imAdmOk.id, valorAluguel: 1600, valorCondominio: null,
    valorIptuMensal: 80, valorSeguroIncendio: 26,
    etapa: 'contrato_enviado', crmEtapa: 'negociacao', nome: 'Juliana Prado', telefone: '(47) 98822-3311',
    // fiança ✓ (garantiaAssinadaEm abaixo) · nosso contrato ○ (sem contratoAssinadoEm)
    email: 'juliana@example.com', doc: '222.111.333-44', rg: '4.110.556',
    estadoCivil: 'solteira', profissao: 'designer',
    enderecoAtual: 'Rua Marechal Deodoro, 12, Penha/SC',
    origem: 'grupo_olx', corretorNome: 'Breno',
    inicio: desloca(0, 8),
    docsInquilino: [arquivoTeste('CNH ou RG'), arquivoTeste('Comprovante de renda')],
    garantiaNumero: 'LOFT-88420',
    garantiaEnviadaEm: desloca(0, -12), garantiaAssinadaEm: desloca(0, -8),
    garantiaSimulada: true,
    contratoEnviadoEm: desloca(0, -2), contratoSimulado: true,
    vistoriaEntrada: {
      feitaEm: desloca(0, -3), feitaPor: 'Breno', assinada: false, assinadaSimulada: false,
      fotos: [FOTO, FOTO],
      itens: ['Chaves (jogo completo)', 'Fogão', 'Armários da cozinha', 'Chuveiro'],
      ressalvas: [{ onde: 'Cozinha', oque: 'Porta do armário com dobradiça folgada' }],
    },
  });

  // 7 · TUDO ASSINADO — só falta marcar a entrega das chaves
  batch.set(doc(collection(db, 'locacaoLocacoes')), {
    ...LOCACAO_VAZIA, ...marca, ...base,
    imovelId: imCaptado.id, valorAluguel: 980, valorCondominio: 150,
    valorIptuMensal: 38, valorSeguroIncendio: 18,
    etapa: 'contrato_assinado', crmEtapa: 'negociacao', nome: 'Rafael Nogueira', telefone: '(47) 94477-2211',
    email: 'rafael@example.com', doc: '333.222.111-00', rg: '3.556.001',
    estadoCivil: 'solteiro', profissao: 'cozinheiro',
    enderecoAtual: 'Rua Joinville, 300, Piçarras/SC',
    origem: 'balcao', corretorNome: 'Murilo',
    docsInquilino: [arquivoTeste('CNH ou RG'), arquivoTeste('Contrato assinado')],
    garantiaNumero: 'LOFT-91007',
    garantiaEnviadaEm: desloca(0, -14), garantiaAssinadaEm: desloca(0, -10),
    garantiaSimulada: true,
    contratoEnviadoEm: desloca(0, -4), contratoAssinadoEm: desloca(0, -1), contratoSimulado: true,
    vistoriaEntrada: {
      feitaEm: desloca(0, -5), feitaPor: 'Murilo', assinada: true, assinadaSimulada: true,
      fotos: [FOTO, FOTO],
      itens: ['Chaves (jogo completo)', 'Fogão', 'Geladeira', 'Armário do quarto'],
      ressalvas: [],
    },
  });

  // 8 · COBRANDO — 11 meses de história, alertas de garantia e reajuste acesos
  const locAtivaRef = doc(collection(db, 'locacaoLocacoes'));
  const locAtiva: Locacao = {
    ...LOCACAO_VAZIA,
    id: locAtivaRef.id, imobiliariaId, imovelId: imAlugado.id,
    etapa: 'ativa',
    nome: 'Fernanda Lima', telefone: '(47) 95555-1122', email: 'fe@example.com',
    doc: '999.888.777-66', rg: '4.001.998', estadoCivil: 'casada', profissao: 'fisioterapeuta',
    enderecoAtual: 'Rua São Cristóvão, 150, Penha/SC',
    origem: 'grupo_olx', temperatura: 'alta', corretorNome: 'Breno',
    docsInquilino: [
      arquivoTeste('CNH ou RG'),
      arquivoTeste('Comprovante de renda'),
      arquivoTeste('Contrato assinado'),
      arquivoTeste('Fiança da Loft'),
    ],
    garantiaTipo: 'Seguro-fiança (Loft)', garantiaNumero: 'LOFT-58112',
    garantiaEnviadaEm: desloca(-11, -8), garantiaAssinadaEm: desloca(-11, -6), garantiaSimulada: true,
    inicio: desloca(-11), prazoMeses: 12,
    valorAluguel: 2600, valorCondominio: null, valorIptuMensal: 130, valorSeguroIncendio: 35,
    diaVencimento: 5, indiceReajuste: 'IGP-M', taxaAdmPct: 10,
    contratoEnviadoEm: desloca(-11, -5), contratoAssinadoEm: desloca(-11, -3), contratoSimulado: true,
    chavesEntreguesEm: desloca(-11),
    vistoriaEntrada: {
      feitaEm: desloca(-11, -1), feitaPor: 'Breno', assinada: true, assinadaSimulada: true,
      fotos: FOTOS5,
      itens: ['Chaves (jogo completo)', 'Fogão', 'Armários da cozinha', 'Chuveiro', 'Varal'],
      ressalvas: [
        { onde: 'Sala', oque: 'Pequeno risco na parede atrás da porta' },
        { onde: 'Banheiro', oque: 'Rejunte do box desgastado' },
      ],
    },
    vistoriaSaida: null,
  };
  const { id: _lid, ...locAtivaDoc } = locAtiva;
  batch.set(locAtivaRef, { ...locAtivaDoc, demo: true, criadoEm: serverTimestamp() });

  // as competências: pagas até o mês passado, a do mês corrente ATRASADA
  const hoje = hojeYmd();
  const movs = gerarMovimentos(locAtiva);
  for (const m of movs) {
    const passado = m.vencimento < hoje;
    const mesAtual = m.competencia === hoje.slice(0, 7);
    const pago = passado && !mesAtual;
    batch.set(doc(collection(db, 'locacaoMovimentos')), {
      ...m, demo: true, imobiliariaId,
      ...(pago
        ? { statusCobranca: 'paga', pagoEm: m.vencimento, statusRepasse: 'repassado', repassadoEm: m.vencimento, simulado: true }
        : {}),
      criadoEm: serverTimestamp(),
    });
  }

  // a caixa de entrada: um chamado em cada ponto da esteira + dois recados
  batch.set(doc(collection(db, 'locacaoChamados')), {
    demo: true, imobiliariaId,
    locacaoId: locAtivaRef.id, imovelId: imAlugado.id,
    origem: 'inquilino', status: 'aberto', orcamento: null, quemPaga: '', resposta: '',
    descricao: 'A torneira da cozinha está pingando desde ontem e o registro não fecha direito.',
    simulada: true, criadoEm: serverTimestamp(),
  });
  batch.set(doc(collection(db, 'locacaoChamados')), {
    demo: true, imobiliariaId,
    locacaoId: locAtivaRef.id, imovelId: imAlugado.id,
    origem: 'inquilino', status: 'aguardando_dono', orcamento: 380, quemPaga: 'dono', resposta: '',
    descricao: 'O chuveiro parou de esquentar — o eletricista orçou a resistência e a chave.',
    simulada: true, criadoEm: serverTimestamp(),
  });
  batch.set(doc(collection(db, 'locacaoMensagens')), {
    demo: true, imobiliariaId, de: 'inquilino',
    nome: 'Fernanda Lima', telefone: '(47) 95555-1122',
    locacaoId: locAtivaRef.id, imovelId: imAlugado.id,
    texto: 'Esse mês o pagamento vai atrasar uns 3 dias, tem problema? Consigo pagar dia 8.',
    tratadaEm: '', resposta: '', simulada: true, criadoEm: serverTimestamp(),
  });
  batch.set(doc(collection(db, 'locacaoMensagens')), {
    demo: true, imobiliariaId, de: 'dono',
    nome: 'Tereza Bianchi', telefone: '(47) 99777-8899',
    locacaoId: '', imovelId: imAlugado.id,
    texto: 'Podem me mandar o informe de rendimentos pro meu contador?',
    tratadaEm: '', resposta: '', simulada: true, criadoEm: serverTimestamp(),
  });

  await batch.commit();
  return `Exemplos criados: 7 imóveis (um por etapa), 8 locações (uma por etapa) e ${movs.length} competências no financeiro.`;
}

/** Remove TUDO que foi criado pelo botão de exemplo — e só isso. */
export async function apagarDadosExemplo(imobiliariaId: string): Promise<number> {
  let total = 0;
  for (const col of ['locacaoImoveis', 'locacaoLocacoes', 'locacaoMovimentos', 'locacaoChamados', 'locacaoMensagens']) {
    const snap = await getDocs(query(collection(db, col),
      where('imobiliariaId', '==', imobiliariaId), where('demo', '==', true)));
    const docs = snap.docs;
    // lotes de até 400 pra respeitar o limite do batch
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    total += docs.length;
  }
  return total;
}
