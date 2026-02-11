'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';

export type PeriodKey = 'dia' | 'semana' | 'mes';

/** Etapas do funil como exibidas no relatório (nova nomenclatura) */
export const REPORT_FUNIL_ETAPAS = [
  'Topo de Funil',
  'Qualificado',
  'Apresentação do imóvel',
  'Reunião agendada',
  'Negociação e contrato',
  'Follow up',
  'Troca de Leads',
] as const;

/** Mapeia etapa salva no banco → label do relatório (agrupa algumas etapas) */
export const ETAPA_BANCO_TO_REPORT: Record<string, string> = {
  'Pré Qualificação': 'Topo de Funil',
  'Qualificação': 'Qualificado',
  'Apresentação do imóvel': 'Apresentação do imóvel',
  'Ligação agendada': 'Reunião agendada',
  'Visita agendada': 'Reunião agendada',
  'Negociação e Proposta': 'Negociação e contrato',
  'Contrato e fechamento': 'Negociação e contrato',
  'Pós Venda e Fidelização': 'Follow up',
  'Interesse Futuro': 'Troca de Leads',
  'Carteira': 'Troca de Leads',
  'Geladeira': 'Troca de Leads',
};

/** Tipos de evento da agenda → label no relatório */
export const TIPO_EVENTO_LABEL: Record<string, string> = {
  reuniao: 'Reunião',
  evento: 'Evento',
  treinamento: 'Treinamento',
  'revisar-crm': 'Revisar CRM',
  'ligacao-ativa': 'Ligação Ativa',
  'acao-de-rua': 'Ação de Rua',
  'disparo-de-msg': 'Disparo de mensagem',
  outro: 'Outro',
};

export interface ReportMetric<T = number> {
  valor: T;
  anterior?: T;
  variacao?: number; // % em relação ao período anterior (positivo = crescimento)
}

/** Métricas de uma semana (para desempenho mês) */
export interface DesempenhoSemana {
  semana: number;
  dataInicio: string;
  dataFim: string;
  novosLeads: number;
  tarefasConcluidas: number;
  interacoes: number;
  valorContribuicoes: number;
  horasEventos: number;
}

export interface RelatorioIndividualData {
  corretorId: string;
  corretorNome: string;
  periodo: PeriodKey;
  dataInicio: string;
  dataFim: string;
  dataGeracao: string;

  // Funil (labels do relatório: Topo de Funil, Qualificado, etc.)
  leadsTotal: ReportMetric<number>;
  leadsPorEtapa: Record<string, number>;
  novosLeads: ReportMetric<number>;
  leadsFechadosPeriodo: number;

  // Tarefas: do dia, atrasado, futuro, sem tarefa
  tarefasDoDia: number;
  tarefasAtrasadas: number;
  tarefasFuturas: number;
  semTarefa: number; // leads sem nenhuma tarefa pendente
  tarefasConcluidasPeriodo: ReportMetric<number>;

  // Eventos / uso do tempo (tipo = label: Reunião, Evento, Treinamento, Revisar CRM, etc., Plantão)
  eventosParticipados: { titulo: string; data: string; horas: number; tipo: string }[];
  totalHorasEventos: ReportMetric<number>;

  // Metas / resultado
  metaMensalValor: number;
  metaMensalAlcancado: number;
  metaMensalPercentual: number;
  contribuicoesPeriodo: ReportMetric<number>;
  contribuicoesPeriodoCount: ReportMetric<number>;

  interacoesPeriodo: ReportMetric<number>;

  // Desempenho semana a semana (quando periodo === 'mes')
  desempenhoPorSemana: DesempenhoSemana[];
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function')
    return (v as { toDate: () => Date }).toDate();
  if (typeof (v as { seconds?: number }).seconds === 'number') return new Date((v as { seconds: number }).seconds * 1000);
  const d = new Date(typeof v === 'string' ? v : String(v));
  return isNaN(d.getTime()) ? null : d;
}

function getPeriodBounds(period: PeriodKey): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  if (period === 'dia') {
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === 'semana') {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  // mes
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function getPreviousPeriodBounds(period: PeriodKey, currentStart: Date, currentEnd: Date): { start: Date; end: Date } {
  const ms = currentEnd.getTime() - currentStart.getTime();
  const end = new Date(currentStart.getTime() - 1);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end.getTime() - ms);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function isInPeriod(d: Date | null, start: Date, end: Date): boolean {
  if (!d) return false;
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function variacaoPercentual(atual: number, anterior: number): number | undefined {
  if (anterior === 0) return atual > 0 ? 100 : undefined;
  return Math.round(((atual - anterior) / anterior) * 100);
}

export async function fetchRelatorioIndividual(
  imobiliariaId: string,
  corretorId: string,
  corretorNome: string,
  period: PeriodKey
): Promise<RelatorioIndividualData> {
  const { start, end } = getPeriodBounds(period);
  const { start: startAnt, end: endAnt } = getPreviousPeriodBounds(period, start, end);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Leads do corretor
  const leadsRef = collection(db, 'leads');
  const leadsSnap = await getDocs(
    query(leadsRef, where('imobiliariaId', '==', imobiliariaId), where('userId', '==', corretorId))
  );
  const leads = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; createdAt?: unknown; etapa?: string; userId?: string }));

  // Agrupa por etapa do relatório (nova nomenclatura)
  const leadsPorEtapa: Record<string, number> = {};
  REPORT_FUNIL_ETAPAS.forEach((e) => { leadsPorEtapa[e] = 0; });
  leads.forEach((l) => {
    const etapaBanco = l.etapa && PIPELINE_STAGES.includes(l.etapa) ? l.etapa : PIPELINE_STAGES[0];
    const etapaReport = ETAPA_BANCO_TO_REPORT[etapaBanco] || 'Topo de Funil';
    leadsPorEtapa[etapaReport] = (leadsPorEtapa[etapaReport] || 0) + 1;
  });

  const novosLeadsPeriodo = leads.filter((l) => isInPeriod(toDate(l.createdAt), start, end)).length;
  const novosLeadsAnterior = leads.filter((l) => isInPeriod(toDate(l.createdAt), startAnt, endAnt)).length;

  // Tarefas: do dia, atrasado, futuro, sem tarefa + concluídas no período
  const hojeStr = formatDate(hoje);
  let tarefasDoDia = 0;
  let tarefasAtrasadas = 0;
  let tarefasFuturas = 0;
  let leadsSemTarefa = 0;
  let tarefasConcluidasPeriodo = 0;
  let tarefasConcluidasAnterior = 0;
  let interacoesPeriodo = 0;
  let interacoesAnterior = 0;

  for (const lead of leads) {
    const tasksRef = collection(db, 'leads', lead.id, 'tarefas');
    const tasksSnap = await getDocs(query(tasksRef, where('status', '==', 'pendente')));
    const pendentes = tasksSnap.size;
    if (pendentes === 0) leadsSemTarefa += 1;
    tasksSnap.docs.forEach((t) => {
      const due = toDate(t.data().dueDate);
      if (!due) return;
      const dueStr = formatDate(due);
      if (dueStr < hojeStr) tarefasAtrasadas += 1;
      else if (dueStr === hojeStr) tarefasDoDia += 1;
      else tarefasFuturas += 1;
    });

    const interactionsRef = collection(db, 'leads', lead.id, 'interactions');
    const interactionsSnap = await getDocs(
      query(interactionsRef, orderBy('timestamp', 'desc'), limit(200))
    );
    interactionsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const type = (data.type as string) || '';
      const ts = toDate(data.timestamp);
      if (type === 'Tarefa Concluída') {
        if (ts && isInPeriod(ts, start, end)) tarefasConcluidasPeriodo += 1;
        if (ts && isInPeriod(ts, startAnt, endAnt)) tarefasConcluidasAnterior += 1;
      }
      if (ts && isInPeriod(ts, start, end)) interacoesPeriodo += 1;
      if (ts && isInPeriod(ts, startAnt, endAnt)) interacoesAnterior += 1;
    });
  }

  // Eventos e plantões em que participou (presentesIds ou respostasPresenca confirmado)
  const agendaRef = collection(db, 'agendaImobiliaria');
  const agendaSnap = await getDocs(query(agendaRef, where('imobiliariaId', '==', imobiliariaId)));
  const plantoesRef = collection(db, 'plantoes');
  const plantoesSnap = await getDocs(query(plantoesRef, where('imobiliariaId', '==', imobiliariaId)));

  const eventosParticipados: { titulo: string; data: string; horas: number; tipo: string }[] = [];
  let totalHorasPeriodo = 0;
  let totalHorasAnterior = 0;

  agendaSnap.docs.forEach((docSnap) => {
    const d = docSnap.data();
    const presentesIds = (d.presentesIds as string[]) || [];
    const respostas = (d.respostasPresenca as Record<string, string>) || {};
    const participou = presentesIds.includes(corretorId) || respostas[corretorId] === 'confirmado';
    if (!participou) return;
    const dataInicio = toDate(d.dataInicio);
    const dataFim = toDate(d.dataFim);
    if (!dataInicio || !isInPeriod(dataInicio, start, end)) return;
    const horas = dataFim
      ? (dataFim.getTime() - dataInicio.getTime()) / (60 * 60 * 1000)
      : 1;
    totalHorasPeriodo += horas;
    const tipoChave = (d.tipo as string) || 'outro';
    const tipoLabel = TIPO_EVENTO_LABEL[tipoChave] || 'Evento';
    eventosParticipados.push({
      titulo: (d.titulo as string) || 'Evento',
      data: dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      horas: Math.round(horas * 10) / 10,
      tipo: tipoLabel,
    });
  });

  plantoesSnap.docs.forEach((docSnap) => {
    const d = docSnap.data();
    const presentesIds = (d.presentesIds as string[]) || [];
    const respostas = (d.respostasPresenca as Record<string, string>) || {};
    const participou = presentesIds.includes(corretorId) || respostas[corretorId] === 'confirmado';
    if (!participou) return;
    const dataInicio = toDate(d.dataInicio);
    if (!dataInicio) return;
    const dataStr = formatDate(dataInicio);
    const startStr = formatDate(start);
    const endStr = formatDate(end);
    const startAntStr = formatDate(startAnt);
    const endAntStr = formatDate(endAnt);
    const noPeriodo = dataStr >= startStr && dataStr <= endStr;
    const noAnterior = dataStr >= startAntStr && dataStr <= endAntStr;
    const horas = 2; // padrão plantão 2h
    if (noPeriodo) totalHorasPeriodo += horas;
    if (noAnterior) totalHorasAnterior += horas;
    if (noPeriodo)
      eventosParticipados.push({
        titulo: (d.construtora as string) ? `Plantão — ${d.construtora}` : 'Plantão',
        data: dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        horas,
        tipo: 'Plantão',
      });
  });

  // Metas e contribuições (precisamos antes para desempenhoPorSemana)
  const metaRef = collection(db, 'metas', imobiliariaId, 'contribuicoes');
  const contribSnap = await getDocs(query(metaRef, orderBy('createdAt', 'desc')));
  const contribuicoes = contribSnap.docs.map((docSnap) => {
    const d = docSnap.data();
    return {
      corretorId: d.corretorId as string,
      valor: Number(d.valor) ?? 0,
      dataVenda: d.dataVenda as string | undefined,
    };
  });
  const contribCorretorPeriodo = contribuicoes.filter(
    (c) => c.corretorId === corretorId && c.dataVenda && c.dataVenda >= formatDate(start) && c.dataVenda <= formatDate(end)
  );
  const contribCorretorAnterior = contribuicoes.filter(
    (c) => c.corretorId === corretorId && c.dataVenda && c.dataVenda >= formatDate(startAnt) && c.dataVenda <= formatDate(endAnt)
  );
  const valorPeriodo = contribCorretorPeriodo.reduce((s, c) => s + c.valor, 0);
  const valorAnterior = contribCorretorAnterior.reduce((s, c) => s + c.valor, 0);

  // Desempenho semana a semana (quando período = mês)
  const desempenhoPorSemana: DesempenhoSemana[] = [];
  if (period === 'mes') {
    const semanas: { inicio: Date; fim: Date }[] = [];
    let d = new Date(start);
    while (d.getTime() <= end.getTime()) {
      const inicioSem = new Date(d);
      const fimSem = new Date(d);
      fimSem.setDate(fimSem.getDate() + 6);
      fimSem.setHours(23, 59, 59, 999);
      if (fimSem.getTime() > end.getTime()) fimSem.setTime(end.getTime());
      semanas.push({ inicio: new Date(inicioSem), fim: new Date(fimSem) });
      d.setDate(d.getDate() + 7);
    }
    for (let i = 0; i < semanas.length; i++) {
      const { inicio: si, fim: sf } = semanas[i];
      const novosS = leads.filter((l) => isInPeriod(toDate(l.createdAt), si, sf)).length;
      const contribS = contribuicoes.filter(
        (c) => c.corretorId === corretorId && c.dataVenda && c.dataVenda >= formatDate(si) && c.dataVenda <= formatDate(sf)
      );
      let tarefasS = 0;
      let interacoesS = 0;
      let horasS = 0;
      for (const lead of leads) {
        const interactionsRef = collection(db, 'leads', lead.id, 'interactions');
        const interactionsSnap = await getDocs(
          query(interactionsRef, orderBy('timestamp', 'desc'), limit(200))
        );
        interactionsSnap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const ts = toDate(data.timestamp);
          if (ts && isInPeriod(ts, si, sf)) {
            interacoesS += 1;
            if ((data.type as string) === 'Tarefa Concluída') tarefasS += 1;
          }
        });
      }
      agendaSnap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        const presentesIds = (d.presentesIds as string[]) || [];
        const respostas = (d.respostasPresenca as Record<string, string>) || {};
        if (!presentesIds.includes(corretorId) && respostas[corretorId] !== 'confirmado') return;
        const dataInicio = toDate(d.dataInicio);
        const dataFim = toDate(d.dataFim);
        if (!dataInicio || !isInPeriod(dataInicio, si, sf)) return;
        horasS += dataFim
          ? (dataFim.getTime() - dataInicio.getTime()) / (60 * 60 * 1000)
          : 1;
      });
      plantoesSnap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        const presentesIds = (d.presentesIds as string[]) || [];
        const respostas = (d.respostasPresenca as Record<string, string>) || {};
        if (!presentesIds.includes(corretorId) && respostas[corretorId] !== 'confirmado') return;
        const dataInicio = toDate(d.dataInicio);
        if (!dataInicio) return;
        const dataStr = formatDate(dataInicio);
        if (dataStr >= formatDate(si) && dataStr <= formatDate(sf)) horasS += 2;
      });
      desempenhoPorSemana.push({
        semana: i + 1,
        dataInicio: formatDate(si),
        dataFim: formatDate(sf),
        novosLeads: novosS,
        tarefasConcluidas: tarefasS,
        interacoes: interacoesS,
        valorContribuicoes: contribS.reduce((s, c) => s + c.valor, 0),
        horasEventos: Math.round(horasS * 10) / 10,
      });
    }
  }

  let metaMensalValor = 0;
  let metaMensalAlcancado = 0;
  const metaSnap = await getDoc(doc(db, 'metas', imobiliariaId));
  if (metaSnap.exists()) {
    const metaData = metaSnap.data();
    metaMensalValor = Number(metaData.valorMensal) ?? 0;
  }
  const contribMensal = contribuicoes.filter((c) => c.corretorId === corretorId);
  metaMensalAlcancado = contribMensal.reduce((s, c) => s + c.valor, 0);
  const metaMensalPercentual = metaMensalValor > 0 ? Math.round((metaMensalAlcancado / metaMensalValor) * 100) : 0;

  return {
    corretorId,
    corretorNome,
    periodo: period,
    dataInicio: formatDate(start),
    dataFim: formatDate(end),
    dataGeracao: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),

    leadsTotal: {
      valor: leads.length,
      anterior: undefined,
      variacao: undefined,
    },
    leadsPorEtapa,
    novosLeads: {
      valor: novosLeadsPeriodo,
      anterior: novosLeadsAnterior,
      variacao: variacaoPercentual(novosLeadsPeriodo, novosLeadsAnterior),
    },
    leadsFechadosPeriodo: contribCorretorPeriodo.length,

    tarefasDoDia,
    tarefasAtrasadas,
    tarefasFuturas,
    semTarefa: leadsSemTarefa,
    tarefasConcluidasPeriodo: {
      valor: tarefasConcluidasPeriodo,
      anterior: tarefasConcluidasAnterior,
      variacao: variacaoPercentual(tarefasConcluidasPeriodo, tarefasConcluidasAnterior),
    },

    eventosParticipados: eventosParticipados.sort((a, b) => a.data.localeCompare(b.data)),
    totalHorasEventos: {
      valor: Math.round(totalHorasPeriodo * 10) / 10,
      anterior: Math.round(totalHorasAnterior * 10) / 10,
      variacao: variacaoPercentual(totalHorasPeriodo, totalHorasAnterior),
    },

    metaMensalValor,
    metaMensalAlcancado,
    metaMensalPercentual,
    contribuicoesPeriodo: {
      valor: valorPeriodo,
      anterior: valorAnterior,
      variacao: variacaoPercentual(valorPeriodo, valorAnterior),
    },
    contribuicoesPeriodoCount: {
      valor: contribCorretorPeriodo.length,
      anterior: contribCorretorAnterior.length,
      variacao: variacaoPercentual(contribCorretorPeriodo.length, contribCorretorAnterior.length),
    },

    interacoesPeriodo: {
      valor: interacoesPeriodo,
      anterior: interacoesAnterior,
      variacao: variacaoPercentual(interacoesPeriodo, interacoesAnterior),
    },

    desempenhoPorSemana,
  };
}
