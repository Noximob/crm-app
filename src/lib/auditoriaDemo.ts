/**
 * Dados sintéticos da auditoria (modo Espelho) — pra conseguir ver a tela
 * funcionando de ponta a ponta sem tocar em dado real: sorteio, revisão da
 * amostra e o JSON saindo. Cobre as quatro faixas do sorteio.
 */
import type { LeadAud, AtividadeAud, VendaAud, AdsAud } from './auditoriaPacote';
import { dadosConfiaveisDesdeMs } from './auditoria';

const DIA = 24 * 60 * 60 * 1000;

const NOMES = [
  'Marina Souza', 'Pedro Alves', 'Júlia Castro', 'Rafael Nunes', 'Carla Dias',
  'Tiago Rocha', 'Beatriz Lima', 'Otávio Prado', 'Sandra Küster', 'Diego Matos',
  'Helena Braga', 'Igor Fontes', 'Larissa Melo', 'Bruno Xavier', 'Camila Reis',
  'Vitor Hugo', 'Patrícia Naves', 'Gustavo Enz', 'Aline Kroth', 'Márcio Belo',
  'Fernanda Rau', 'Leandro Vaz', 'Tatiane Cruz', 'Rodrigo Sell', 'Nicole Amaral',
];
const CAMPANHAS = ['Lançamento Orla — Agosto', 'Pronto Centro — Remarketing', 'Frente Mar Penha'];
const MOTIVOS = ['Sem perfil', 'Comprou com outro', 'Não responde', 'Adiou a compra'];

export interface DemoAuditoria {
  corretores: { id: string; nome: string }[];
  leads: LeadAud[];
  atividade: Map<string, AtividadeAud>;
  vendas: VendaAud[];
  ads: AdsAud[];
  etapasDesdeMs: number;
}

export function auditoriaDemo(agora = Date.now()): DemoAuditoria {
  const ts = (ms: number) => ({ toMillis: () => ms });
  const inicioDados = dadosConfiaveisDesdeMs();
  const uid = 'demo-aud-1';

  const leads: LeadAud[] = [];
  const atividade = new Map<string, AtividadeAud>();

  // perfis variados pra encher as quatro faixas do sorteio + descartados
  const receita: { etapa: string; entradaDias: number; toqueDias: number | null; qtd: number; descarte?: boolean }[] = [
    { etapa: 'Negociação', entradaDias: 34, toqueDias: 3, qtd: 4 },
    { etapa: 'Visita Feita', entradaDias: 28, toqueDias: 6, qtd: 3 },
    { etapa: 'Meet Feito', entradaDias: 25, toqueDias: 20, qtd: 2 },
    { etapa: 'Em Contato', entradaDias: 30, toqueDias: 22, qtd: 5 },   // parados
    { etapa: 'Em Contato', entradaDias: 27, toqueDias: 18, qtd: 3 },   // parados
    { etapa: 'Entrada', entradaDias: 3, toqueDias: null, qtd: 3 },     // recentes sem contato
    { etapa: 'Em Contato', entradaDias: 8, toqueDias: 2, qtd: 3 },     // recentes atendidos
    { etapa: 'Em Contato', entradaDias: 20, toqueDias: 4, qtd: 4 },    // livres
    { etapa: 'Descartado', entradaDias: 26, toqueDias: 12, qtd: 4, descarte: true },
    { etapa: 'Fechamento', entradaDias: 31, toqueDias: 5, qtd: 1 },
  ];

  let i = 0;
  for (const r of receita) {
    for (let k = 0; k < r.qtd; k++, i++) {
      const id = `dl${String(i).padStart(2, '0')}`;
      const entrada = Math.max(inicioDados + 6 * 3_600_000, agora - r.entradaDias * DIA);
      const temContato = r.toqueDias !== null;
      // metade dos leads é atendida rápido; a outra demora (dá material pra análise)
      const atrasoMin = i % 3 === 0 ? 8 : i % 3 === 1 ? 95 : 1400;
      const primeiroContato = temContato ? entrada + atrasoMin * 60_000 : 0;
      const ultimoToque = temContato ? agora - (r.toqueDias as number) * DIA : 0;

      const hist: LeadAud['etapasHist'] = [];
      if (temContato) hist.push({ de: 'Entrada', para: 'Em Contato', em: ts(primeiroContato), porNome: 'Corretor Demo' });
      if (['Meet Feito', 'Visita Feita', 'Negociação', 'Fechamento'].includes(r.etapa)) {
        hist.push({ de: 'Em Contato', para: 'Meet Agendado', em: ts(entrada + 3 * DIA), porNome: 'Corretor Demo' });
        hist.push({ de: 'Meet Agendado', para: 'Meet Feito', em: ts(entrada + 5 * DIA), porNome: 'Corretor Demo' });
      }
      if (['Visita Feita', 'Negociação', 'Fechamento'].includes(r.etapa)) {
        hist.push({ de: 'Meet Feito', para: 'Visita Agendada', em: ts(entrada + 8 * DIA), porNome: 'Corretor Demo' });
        hist.push({ de: 'Visita Agendada', para: 'Visita Feita', em: ts(entrada + 10 * DIA), porNome: 'Corretor Demo' });
      }
      if (['Negociação', 'Fechamento'].includes(r.etapa)) hist.push({ de: 'Visita Feita', para: 'Negociação', em: ts(entrada + 13 * DIA), porNome: 'Corretor Demo' });
      if (r.etapa === 'Fechamento') hist.push({ de: 'Negociação', para: 'Fechamento', em: ts(entrada + 20 * DIA), porNome: 'Corretor Demo' });

      const usouAds = i % 3 !== 2;
      leads.push({
        id, userId: uid, imobiliariaId: 'espelho-demo',
        nome: NOMES[i % NOMES.length],
        // 3 telefones ruins de propósito (foi 30% de uma rodada real): número
        // de teste, malformado e em branco — pra a tela mostrar o aviso
        telefone: i === 2 ? '99999999953' : i === 9 ? '5547656559595' : i === 16 ? '' : `4799${String(100000 + i * 137).slice(0, 6)}`,
        etapa: r.etapa,
        origem: usouAds ? `Propaganda · ${CAMPANHAS[i % CAMPANHAS.length]}` : 'Networking',
        origemTipo: usouAds ? 'Propaganda' : 'Networking',
        origemPropaganda: usouAds ? CAMPANHAS[i % CAMPANHAS.length] : undefined,
        anotacoes: i % 4 === 0 ? '' : 'cliente pediu retorno na semana que vem',
        qualificacao: i % 5 === 0 ? {} : { finalidade: ['Moradia'], valor: ['800k-1.2M'], quartos: ['3 quartos'] },
        createdAt: ts(entrada),
        circuito: {
          desde: ts(ultimoToque || entrada),
          tentativas: temContato ? 1 + (i % 4) : 0,
          contatosFeitos: temContato ? 1 + (i % 2) : 0,
          ...(temContato ? { primeiroContatoEm: ts(primeiroContato) } : {}),
        },
        etapasHist: hist,
        ...(r.descarte ? { descartadoEm: ts(agora - 8 * DIA), descartadoMotivo: MOTIVOS[i % MOTIVOS.length] } : {}),
        tarefasPendentes: i % 3 === 0 ? [{ id: `t${id}`, description: 'Retornar ligação', type: 'Ligação', dueDate: ts(agora - 4 * DIA) }] : [],
      });

      const interacoes = temContato
        ? [
            { ms: primeiroContato, tipo: 'Ligação', notas: atrasoMin > 600 ? 'liguei, não atendeu' : 'falei com o cliente, tem interesse', por: 'Corretor Demo' },
            ...(r.toqueDias !== null && (r.toqueDias as number) < 25
              ? [{ ms: ultimoToque, tipo: 'WhatsApp', notas: 'mandei as fotos do decorado', por: 'Corretor Demo' }] : []),
          ]
        : [];
      atividade.set(id, {
        interacoes,
        tarefas: i % 3 === 0
          ? [{ id: `t${id}`, descricao: 'Retornar ligação', tipo: 'Ligação', status: 'pendente', dueMs: agora - 4 * DIA, concluidaMs: 0 }]
          : [{ id: `t${id}`, descricao: 'Follow-up', tipo: 'Follow-up', status: 'concluída', dueMs: agora - 12 * DIA, concluidaMs: agora - 9 * DIA }],
      });
    }
  }

  const ads: AdsAud[] = leads
    .filter((l) => l.origemTipo === 'Propaganda')
    .slice(0, 10)
    .map((l, k) => ({
      leadId: l.id, campanhaNome: String(l.origemPropaganda || ''),
      tempoAceiteSeg: k % 4 === 3 ? null : 60 + k * 90,
      viaGeral: k % 4 === 1,
      aceitoPor: k % 4 === 3 ? undefined : uid,
      expirouDe: k % 4 === 3 ? uid : undefined,
    }));

  const vendas: VendaAud[] = [{
    leadId: leads.find((l) => l.etapa === 'Fechamento')?.id,
    corretorUid: uid, status: 'assinada',
    dataVenda: new Date(agora - 6 * DIA).toISOString().slice(0, 10),
    vgvLiquido: 780_000,
  }];

  return {
    corretores: [{ id: uid, nome: 'Corretor Demonstração' }],
    leads, atividade, vendas, ads,
    etapasDesdeMs: inicioDados + 6 * 3_600_000,
  };
}
