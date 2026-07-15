/**
 * Dados sintéticos do modo Espelho para os relatórios do administrador.
 * Determinístico: PRNG com semente fixa (nada de Math.random) — os números
 * são sempre os mesmos dentro do dia, e o dataset cobre os últimos ~200 dias
 * para todos os presets de período (e o período anterior de comparação) terem conteúdo.
 * Nenhuma leitura/escrita de Firestore acontece aqui.
 */

import { DEMO_REPORT_CORRETORES } from '@/lib/espelho/demoData';
import { PIPELINE_STAGES } from '@/lib/constants';
import {
  AdsLeadLite, ContribLite, CorretorLite, DIA_MS, InteracaoLite, LeadLite,
  MeetsPeriodoLite, ReportSource, TarefaLite, fimDoDia, inicioDoDia, ymdLocal,
} from './reportShared';

// PRNG determinístico (mulberry32)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMES_LEADS = [
  'Ana Paula Silva', 'Bruno Mendes', 'Carla Oliveira', 'Diego Ferreira', 'Elena Costa',
  'Fernando Lima', 'Gabriela Santos', 'Henrique Alves', 'Isabela Rocha', 'João Pedro Souza',
  'Karina Martins', 'Leonardo Dias', 'Mariana Pinto', 'Nicolas Barbosa', 'Patricia Gomes',
  'Rafael Teixeira', 'Sandra Ribeiro', 'Thiago Nascimento', 'Vanessa Carvalho', 'William Araújo',
  'Yasmin Correia', 'Amanda Castro', 'Bernardo Lopes', 'Camila Moreira', 'Daniel Pereira',
  'Érica Nogueira', 'Fábio Cavalcanti', 'Giovana Freitas', 'Hugo Macedo', 'Ingrid Soares',
];

const CAMPANHAS = ['Lançamento Vista Mar', 'Retargeting Julho', 'Frente Mar Piçarras'];
const ORIGENS: { tipo: string; peso: number }[] = [
  { tipo: 'Propaganda', peso: 34 },
  { tipo: 'Indicação', peso: 22 },
  { tipo: 'Networking', peso: 16 },
  { tipo: 'Porta de loja', peso: 12 },
  { tipo: 'Redes sociais', peso: 10 },
  { tipo: 'Outros', peso: 6 },
];

function escolhePeso<T extends { peso: number }>(rnd: () => number, lista: T[]): T {
  const total = lista.reduce((s, x) => s + x.peso, 0);
  let r = rnd() * total;
  for (const item of lista) { r -= item.peso; if (r <= 0) return item; }
  return lista[lista.length - 1];
}

export function buildDemoReportSource(): ReportSource {
  const rnd = mulberry32(20260715);
  const agoraMs = fimDoDia(new Date()).getTime();
  const hoje0 = inicioDoDia(new Date()).getTime();

  // 8 corretores dão um ranking legível (o 1º é o próprio "Espelho", admin)
  const corretores: CorretorLite[] = DEMO_REPORT_CORRETORES.slice(0, 8).map((c) => ({ id: c.uid, nome: c.nome }));
  // "Perfil" de cada corretor: multiplicadores de volume p/ ranking ter história
  const perfil = [1.0, 1.6, 1.25, 0.8, 1.05, 0.45, 0.9, 0.65];

  const leads: LeadLite[] = [];
  const interacoes: InteracaoLite[] = [];
  const tarefas: TarefaLite[] = [];

  const N_LEADS = 190;
  for (let i = 0; i < N_LEADS; i++) {
    // Corretor dono, enviesado pelo perfil
    let ci = Math.floor(rnd() * corretores.length);
    if (rnd() < 0.55) ci = escolhePeso(rnd, corretores.map((_, k) => ({ k, peso: perfil[k] * 10 }))).k;
    const dono = corretores[ci];

    // Criado nos últimos 200 dias, com leve concentração recente
    const idadeDias = Math.floor(Math.pow(rnd(), 1.35) * 200);
    const createdAtMs = hoje0 - idadeDias * DIA_MS + Math.floor(rnd() * 12 * 60 * 60 * 1000) + 8 * 60 * 60 * 1000;

    // Etapa: quanto mais velho o lead, mais fundo no funil (ou estacionado)
    const profundidade = Math.min(PIPELINE_STAGES.length - 1, Math.floor(rnd() * (2 + idadeDias / 18)));
    const etapa = PIPELINE_STAGES[profundidade];

    const origemDef = escolhePeso(rnd, ORIGENS);
    const campanha = origemDef.tipo === 'Propaganda' ? CAMPANHAS[Math.floor(rnd() * CAMPANHAS.length)] : undefined;

    const id = `demo-rel-lead-${i}`;
    // ~30% dos leads têm tarefa pendente (metade em atraso)
    const pendentesMs: number[] = [];
    if (rnd() < 0.3) pendentesMs.push(hoje0 + (rnd() < 0.5 ? -Math.floor(rnd() * 6 + 1) : Math.floor(rnd() * 5 + 1)) * DIA_MS);

    leads.push({
      id,
      userId: dono.id,
      nome: NOMES_LEADS[i % NOMES_LEADS.length],
      etapa,
      origem: origemDef.tipo === 'Propaganda' && campanha ? `Propaganda · ${campanha}` : origemDef.tipo,
      origemTipo: origemDef.tipo,
      origemPropaganda: campanha,
      createdAtMs,
      pendentesMs,
    });

    // Interações: volume segue o perfil do corretor; leads "esquecidos" ficam sem atividade recente
    const esquecido = rnd() < 0.22 && pendentesMs.length === 0;
    const nInt = Math.round((1 + rnd() * 9) * perfil[ci]);
    const tetoAtividade = esquecido ? Math.max(createdAtMs, agoraMs - (8 + rnd() * 40) * DIA_MS) : agoraMs;
    for (let j = 0; j < nInt; j++) {
      const tsMs = createdAtMs + rnd() * Math.max(1, tetoAtividade - createdAtMs);
      if (tsMs > agoraMs) continue;
      const r = rnd();
      const type = r < 0.34 ? 'Ligação' : r < 0.62 ? 'WhatsApp' : r < 0.74 ? 'Visita' : r < 0.9 ? 'Tarefa Concluída' : 'Tarefa Cancelada';
      interacoes.push({ leadId: id, type, tsMs });
    }

    // Tarefas com vencimento espalhado (agenda do período)
    const nTar = Math.floor(rnd() * 3);
    for (let j = 0; j < nTar; j++) {
      const dueMs = createdAtMs + rnd() * (agoraMs + 5 * DIA_MS - createdAtMs);
      const r = rnd();
      tarefas.push({
        leadId: id,
        type: r < 0.4 ? 'Ligação' : r < 0.7 ? 'WhatsApp' : 'Visita',
        status: dueMs > agoraMs ? 'pendente' : rnd() < 0.68 ? 'concluída' : rnd() < 0.5 ? 'cancelada' : 'pendente',
        dueMs,
      });
    }
  }

  // Vendas (contribuições da meta) — ~24 vendas nos últimos 200 dias
  const contribuicoes: ContribLite[] = [];
  for (let i = 0; i < 24; i++) {
    const ci = escolhePeso(rnd, corretores.map((_, k) => ({ k, peso: perfil[k] * 10 }))).k;
    const dias = Math.floor(rnd() * 198);
    contribuicoes.push({
      corretorId: corretores[ci].id,
      corretorNome: corretores[ci].nome,
      valor: Math.round((280_000 + rnd() * 620_000) / 5_000) * 5_000,
      dataVenda: ymdLocal(hoje0 - dias * DIA_MS),
    });
  }

  // Meets & Visitas — períodos semanais cobrindo os últimos ~200 dias
  const meets: MeetsPeriodoLite[] = [];
  for (let w = 0; w < 29; w++) {
    const fimSem = hoje0 - w * 7 * DIA_MS;
    const iniSem = fimSem - 6 * DIA_MS;
    const contadores: Record<string, number> = {};
    corretores.forEach((c, k) => {
      const n = Math.round(rnd() * 5 * perfil[k]);
      if (n > 0) contadores[c.id] = n;
    });
    meets.push({ inicio: ymdLocal(iniSem), fim: ymdLocal(fimSem), contadores });
  }

  // Leads de anúncio — ~70 nos últimos 200 dias
  const adsLeads: AdsLeadLite[] = [];
  for (let i = 0; i < 70; i++) {
    const criadoEmMs = agoraMs - Math.floor(rnd() * 200) * DIA_MS - Math.floor(rnd() * 10 * 60 * 60 * 1000);
    const campanha = CAMPANHAS[Math.floor(rnd() * CAMPANHAS.length)];
    const aceito = rnd() < 0.82;
    const ci = escolhePeso(rnd, corretores.map((_, k) => ({ k, peso: perfil[k] * 10 }))).k;
    const tempo = Math.round(20 + rnd() * rnd() * 900);
    adsLeads.push({
      id: `demo-rel-ads-${i}`,
      nome: NOMES_LEADS[(i * 3) % NOMES_LEADS.length],
      campanhaNome: campanha,
      status: aceito ? 'aceito' : rnd() < 0.5 ? 'nao-atendido' : 'descartado',
      aceitoPor: aceito ? corretores[ci].id : undefined,
      aceitoPorNome: aceito ? corretores[ci].nome : undefined,
      tempoAceiteSeg: aceito ? tempo : undefined,
      viaGeral: aceito ? rnd() < 0.3 : false,
      criadoEmMs,
      aceitoEmMs: aceito ? criadoEmMs + tempo * 1000 : null,
    });
  }

  return {
    leads,
    corretores,
    contribuicoes,
    meets,
    adsLeads,
    interacoes,
    tarefas,
    janelaInicioMs: hoje0 - 201 * DIA_MS,
  };
}
