/**
 * LOCAÇÃO · DADOS DE EXEMPLO — a esteira inteira povoada com um clique.
 *
 * Pra sentir o sistema de verdade antes de existir imóvel real: três
 * imóveis, quatro interessados em etapas diferentes, um contrato ATIVO com
 * seis meses de história (pagamentos feitos, um atrasado, alertas de
 * garantia e reajuste acesos) e um contrato em assinatura.
 *
 * Tudo nasce com demo: true — o botão "apagar dados de exemplo" remove só
 * o que tem essa marca, sem encostar em nada real. Editar e excluir pelas
 * telas normais também funciona: são documentos comuns do banco.
 */
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { IMOVEL_VAZIO, CONTRATO_VAZIO, LEAD_VAZIO, gerarMovimentos, hojeYmd, type ContratoLocacao } from '@/lib/locacao';

const FOTO = 'https://firebasestorage.googleapis.com/v0/b/demo/foto-exemplo.jpg';
const FOTOS5 = [FOTO, FOTO, FOTO, FOTO, FOTO];

/** Data ymd deslocada N meses/dias de hoje. */
const desloca = (meses: number, dias = 0): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

export async function criarDadosExemplo(imobiliariaId: string): Promise<string> {
  const batch = writeBatch(db);
  const marca = { demo: true, imobiliariaId, criadoEm: serverTimestamp() };

  // ——— imóveis: um em cada momento da vida ———
  const imAnunciado = doc(collection(db, 'locacaoImoveis'));
  batch.set(imAnunciado, {
    ...IMOVEL_VAZIO, ...marca, codigo: 'EX-001', status: 'anunciado',
    admStatus: 'assinada', admAssinadaEm: desloca(0, -20), admSimulada: true,
    titulo: 'Apartamento 2 quartos com sacada — Centro, Penha',
    tipo: 'Apartamento', rua: 'Rua Nereu Ramos', numero: '245', complemento: 'apto 302',
    bairro: 'Centro', cidade: 'Penha/SC', cep: '88385-000', latitude: '-26.7754', longitude: '-48.6461',
    quartos: 2, suites: 1, banheiros: 2, vagas: 1, areaPrivativa: 68, areaTotal: 85, andar: '3º',
    mobiliado: 'Semimobiliado', comodidades: ['Sacada', 'Churrasqueira', 'Elevador', 'Aceita pet'],
    aluguel: 1850, condominio: 380, iptuMensal: 92, seguroIncendio: 28,
    prazoMinimoMeses: 12,
    locadorNome: 'Roberto Krüger', locadorTelefone: '(47) 98888-1111',
    locadorEmail: 'roberto@example.com', locadorDoc: '111.222.333-44', locadorPix: 'roberto@example.com',
    descricao: 'Apartamento arejado no coração de Penha, a duas quadras da praia. Sacada com churrasqueira, sol da manhã, condomínio com elevador e salão de festas. Aceita pet de pequeno porte.',
    fotos: FOTOS5, portaisCowork: ['Instagram da imobiliária'],
  });

  const imAlugado = doc(collection(db, 'locacaoImoveis'));
  batch.set(imAlugado, {
    ...IMOVEL_VAZIO, ...marca, codigo: 'EX-002', status: 'alugado',
    admStatus: 'assinada', admAssinadaEm: desloca(-12), admSimulada: true,
    titulo: 'Casa 3 quartos com quintal — Armação, Penha',
    tipo: 'Casa', rua: 'Rua das Gaivotas', numero: '88', bairro: 'Armação', cidade: 'Penha/SC', cep: '88385-000',
    quartos: 3, suites: 1, banheiros: 2, vagas: 2, areaPrivativa: 120, areaTotal: 300,
    mobiliado: 'Não mobiliado', comodidades: ['Churrasqueira', 'Lavanderia'],
    aluguel: 2600, condominio: null, iptuMensal: 130, seguroIncendio: 35,
    locadorNome: 'Marlene Souza', locadorTelefone: '(47) 97777-5544',
    locadorEmail: 'marlene@example.com', locadorDoc: '555.666.777-88', locadorPix: '47977775544',
    descricao: 'Casa ampla com quintal gramado no bairro Armação, ideal pra família com crianças e pets. Três quartos sendo uma suíte, churrasqueira coberta e duas vagas.',
    fotos: FOTOS5,
  });

  const imRascunho = doc(collection(db, 'locacaoImoveis'));
  batch.set(imRascunho, {
    ...IMOVEL_VAZIO, ...marca, codigo: 'EX-003', status: 'rascunho',
    titulo: 'Kitnet mobiliada — Gravatá',
    tipo: 'Kitnet', bairro: 'Gravatá', cidade: 'Penha/SC',
    aluguel: 980, condominio: 150, mobiliado: 'Mobiliado',
    locadorNome: 'Paulo Andrade', locadorTelefone: '(47) 96666-3322', locadorPix: 'paulo@example.com',
    descricao: 'Kitnet mobiliada.', fotos: [FOTO, FOTO],
  });

  // ——— candidatos: um em cada estado da burocracia ———
  const leads = [
    { nome: 'Carlos Mendes', telefone: '(47) 99911-2233', email: 'carlos@example.com', origem: 'manual', etapa: 'docs', corretorNome: 'Breno', mensagem: 'Fechou a kitnet, juntando CNH e comprovante de renda.' },
    { nome: 'Eduardo Ramos', telefone: '(47) 97733-6677', email: 'edu@example.com', origem: 'manual', etapa: 'analise_enviada', corretorNome: 'Breno', mensagem: 'Documentos completos, ficha na Loft.' },
    { nome: 'Patrícia Nunes', telefone: '(47) 96644-8899', email: 'pati@example.com', origem: 'manual', etapa: 'analise_aprovada', corretorNome: 'Murilo',
      garantia: { numero: 'LOFT-73421', taxaMensalPct: 9.5, vigenciaFim: desloca(12), simulada: true } },
  ];
  for (const l of leads) {
    batch.set(doc(collection(db, 'locacaoLeads')), { ...LEAD_VAZIO, ...marca, imovelId: imAnunciado.id, ...l });
  }

  // ——— contrato ATIVO com história: 11 meses rodando ———
  // início há ~11 meses: reajuste anual bate em ~1 mês (alerta aceso) e a
  // garantia vence em ~40 dias (alerta aceso) — os dois avisos que importam
  const contratoAtivoRef = doc(collection(db, 'locacaoContratos'));
  const contratoAtivo: ContratoLocacao = {
    ...CONTRATO_VAZIO,
    id: contratoAtivoRef.id, imobiliariaId,
    imovelId: imAlugado.id, leadId: '', status: 'ativo',
    locadorNome: 'Marlene Souza', locadorDoc: '555.666.777-88', locadorEmail: 'marlene@example.com',
    locadorTelefone: '(47) 97777-5544', locadorPix: '47977775544',
    locatarioNome: 'Fernanda Lima', locatarioDoc: '999.888.777-66', locatarioEmail: 'fe@example.com',
    locatarioTelefone: '(47) 95555-1122',
    inicio: desloca(-11), prazoMeses: 30, valorAluguel: 2600, valorCondominio: null,
    valorIptuMensal: 130, valorSeguroIncendio: 35, diaVencimento: 5,
    indiceReajuste: 'IGP-M', taxaAdmPct: 10,
    garantiaTipo: 'Seguro-fiança (Loft)', garantiaNumero: 'LOFT-58112',
    garantiaTaxaMensalPct: 10, garantiaVigenciaFim: desloca(0, 40), garantiaSimulada: true,
    assinaturaEnviadaEm: desloca(-11, -5), assinadoEm: desloca(-11, -3), assinaturaSimulada: true,
    vistoriaEntrada: {
      feitaEm: desloca(-11, -1), feitaPor: 'Breno', assinada: true, assinadaSimulada: true,
      ambientes: [
        { nome: 'Sala', estado: 'bom', observacao: 'Pequeno risco na parede atrás da porta', fotos: [] },
        { nome: 'Cozinha', estado: 'otimo', observacao: '', fotos: [] },
        { nome: 'Quarto 1 (suíte)', estado: 'bom', observacao: '', fotos: [] },
        { nome: 'Banheiro', estado: 'regular', observacao: 'Rejunte do box desgastado', fotos: [] },
        { nome: 'Quintal', estado: 'otimo', observacao: '', fotos: [] },
      ],
    },
    vistoriaSaida: null,
  };
  const { id: _cid, ...contratoAtivoDoc } = contratoAtivo;
  batch.set(contratoAtivoRef, { ...contratoAtivoDoc, demo: true, criadoEm: serverTimestamp() });

  // os movimentos do ativo: pagos até o mês passado, o do mês ATRASADO
  const hoje = hojeYmd();
  const movs = gerarMovimentos(contratoAtivo);
  for (const m of movs) {
    const passado = m.vencimento < hoje;
    const mesAtual = m.competencia === hoje.slice(0, 7);
    const pago = passado && !mesAtual; // o do mês atual venceu e NÃO foi pago → atrasado na tela
    batch.set(doc(collection(db, 'locacaoMovimentos')), {
      ...m, demo: true, imobiliariaId,
      ...(pago
        ? { statusCobranca: 'paga', pagoEm: m.vencimento, statusRepasse: 'repassado', repassadoEm: m.vencimento, simulado: true }
        : {}),
      criadoEm: serverTimestamp(),
    });
  }

  // ——— contrato em ASSINATURA (o da Patrícia, aprovado na análise) ———
  batch.set(doc(collection(db, 'locacaoContratos')), {
    ...CONTRATO_VAZIO, demo: true, imobiliariaId,
    imovelId: imAnunciado.id, leadId: '', status: 'assinatura_enviada',
    locadorNome: 'Roberto Krüger', locadorDoc: '111.222.333-44', locadorEmail: 'roberto@example.com',
    locadorTelefone: '(47) 98888-1111', locadorPix: 'roberto@example.com',
    locatarioNome: 'Patrícia Nunes', locatarioDoc: '444.333.222-11', locatarioEmail: 'pati@example.com',
    locatarioTelefone: '(47) 96644-8899',
    inicio: desloca(0, 10), prazoMeses: 30, valorAluguel: 1850, valorCondominio: 380,
    valorIptuMensal: 92, valorSeguroIncendio: 28, diaVencimento: 5,
    garantiaTipo: 'Seguro-fiança (Loft)', garantiaNumero: 'LOFT-73421',
    garantiaTaxaMensalPct: 9.5, garantiaVigenciaFim: desloca(12), garantiaSimulada: true,
    assinaturaEnviadaEm: hoje, assinaturaSimulada: true,
    criadoEm: serverTimestamp(),
  });

  await batch.commit();
  return `Dados de exemplo criados: 3 imóveis, 4 interessados, 2 contratos e ${movs.length} competências no financeiro.`;
}

/** Remove TUDO que foi criado pelo botão de exemplo — e só isso. */
export async function apagarDadosExemplo(imobiliariaId: string): Promise<number> {
  let total = 0;
  for (const col of ['locacaoImoveis', 'locacaoLeads', 'locacaoContratos', 'locacaoMovimentos']) {
    const snap = await getDocs(query(collection(db, col),
      where('imobiliariaId', '==', imobiliariaId), where('demo', '==', true)));
    // lotes de até 400 pra respeitar o limite do batch
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    total += docs.length;
  }
  return total;
}
