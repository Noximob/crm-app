/**
 * Agregação pura dos relatórios: recebe os dados brutos (ReportSource),
 * o período selecionado e as etapas do funil, e devolve tudo que as abas
 * renderizam. Nenhum acesso a Firestore aqui — recomputa no cliente a cada
 * troca de período/aba sem refazer fetch.
 */

import type { PipelineStageWithMeta } from '@/lib/pipelineStagesConfig';
import { ETAPA_BOLSAO, ETAPA_DESCARTADO, ETAPA_FECHADO, ETAPA_NEGOCIACAO, mapEtapaCircuito } from '@/lib/circuito';
import {
  DIA_MS, InteracaoLite, LeadLite, Periodo, ReportSource, funilCor, inicioDoDia, ymdLocal,
} from './reportShared';

export interface KpiComp { atual: number; anterior: number }

export interface EsquecidoItem {
  leadId: string;
  nome: string;
  etapa: string;
  etapaIdx: number;
  corretorNome: string;
  diasSem: number;
}

export interface MetricasCorretor {
  leadsNovos: number;
  interacoes: number;
  tarefasConcluidas: number;
  tarefasCanceladas: number;
  visitas: number;
  vendasValor: number;
  vendasQtd: number;
  meets: number;
  aceites: number;
  tempoAceiteMedioSeg: number | null;
  leadsAtivos: number;
  leadsQuentes: number;
  pctQuente: number | null;
  pendentesTotal: number;
  pendentesAtrasadas: number;
}

export interface CorretorRow extends MetricasCorretor { id: string; nome: string }

// ---------------------------------------------------------------------------
// Atividade por corretor — o circuito narrado, traduzido em números
// ---------------------------------------------------------------------------
export interface MotivoCount { motivo: string; count: number }

export interface AtividadeAgora {
  /** tarefas pendentes com prazo estourado (dueDate < agora, hora real) */
  atrasadas: number;
  /** leads em etapa ativa do circuito (Entrada→Negociação) sem nenhuma tarefa pendente */
  semAcao: number;
  /** leads parados em Negociação (sem próxima ação agendada) */
  negociacaoParada: number;
}

export interface AtividadeRow {
  id: string;
  nome: string;
  contatos: number;
  semResposta: number;
  meetsMarcados: number;
  meetsFeitos: number;
  visitasMarcadas: number;
  visitasFeitas: number;
  negociacoes: number;
  vendasQtd: number;
  vendasValor: number;
  descartes: number;
  descartesMotivos: MotivoCount[];
  ligAtivaTrabalhados: number;
  ligAtivaCrm: number;
  manuais: number;
  /** interações do período nascidas do circuito (circuito: true) */
  circuitoQtd: number;
  /** todas as interações do período atribuídas a ele */
  interacoesTotal: number;
  aceites: number;
  tempoAceiteMedioSeg: number | null;
  /** retrato AGORA — não obedece ao período */
  agora: AtividadeAgora;
}

export interface AtividadeMedia {
  contatos: number;
  semResposta: number;
  meetsMarcados: number;
  meetsFeitos: number;
  visitasMarcadas: number;
  visitasFeitas: number;
  negociacoes: number;
  vendasQtd: number;
  vendasValor: number;
  descartes: number;
  ligAtivaTrabalhados: number;
  ligAtivaCrm: number;
  manuais: number;
}

type CircuitoEvento =
  | 'contato' | 'semResposta' | 'meetMarcado' | 'meetFeito' | 'visitaMarcada'
  | 'visitaFeita' | 'negociacao' | 'venda' | 'descarte' | 'manual' | null;

/**
 * Traduz uma interação narrada pelo circuito num evento contável.
 * Defensivo: notes ausente/legado → a interação simplesmente não conta.
 */
export function classificaInteracao(type: string, notes: string | undefined | null): CircuitoEvento {
  const n = typeof notes === 'string' ? notes : '';
  switch (type) {
    case 'Ligação':
    case 'WhatsApp':
      return 'contato'; // tentativa de contato (circuito ou manual, é contato do mesmo jeito)
    case 'Follow-up':
      if (n.startsWith('📵 Não atendeu')) return 'semResposta';
      if (n.includes('📌 Cobrança agendada: resposta da proposta')) return 'negociacao'; // proposta apresentada
      return null;
    case 'Meet':
      if (n.startsWith('✅ Meet realizado')) return 'meetFeito';
      if (n.startsWith('📌 Meet marcad') || n.startsWith('📌 Meet remarcad') || n.startsWith('📅 Meet marcado')) return 'meetMarcado';
      return null;
    case 'Visita':
      if (n.startsWith('✅ Visita realizada')) return 'visitaFeita';
      if (n.startsWith('📌 Visita marcad') || n.startsWith('📌 Visita remarcad') || n.startsWith('🏠 Visita marcada')) return 'visitaMarcada';
      return null;
    case 'Etapa':
      if (n.startsWith('↷ Etapa alterada manualmente') || (n.includes('Movido para') && n.includes('(kanban)'))) return 'manual';
      if (n.includes('pra proposta') || n.includes('pronto pra negociar') || n.includes('pra negociação')) return 'negociacao';
      return null;
    case 'Venda':
      return 'venda';
    case 'Descarte':
      return 'descarte';
    default:
      return null;
  }
}

/** Valor pt-BR ("750.000" / "1.234.567,89") → número; 0 quando não dá pra ler. */
function parseValorPtBR(raw: string): number {
  const limpo = raw.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isFinite(n) && n > 0 ? n : 0;
}

/** Extrai o valor da venda da nota '🏆 VENDA LANÇADA: R$ 750.000' (fallback: lead.vendaValor). */
export function parseVendaValor(notes: string | undefined | null, leadVendaValor?: string): number {
  const m = /R\$\s*([\d.,]+)/.exec(typeof notes === 'string' ? notes : '');
  if (m) {
    const v = parseValorPtBR(m[1]);
    if (v > 0) return v;
  }
  return leadVendaValor ? parseValorPtBR(leadVendaValor) : 0;
}

/** Extrai o motivo da nota '🗑️ Descartado — motivo: X' (fallback: lead.descartadoMotivo). */
export function parseMotivoDescarte(notes: string | undefined | null, leadMotivo?: string): string {
  const n = typeof notes === 'string' ? notes : '';
  const ix = n.indexOf('motivo:');
  if (ix >= 0) {
    const m = n.slice(ix + 'motivo:'.length).trim();
    if (m) return m;
  }
  return (leadMotivo || '').trim() || 'Sem motivo';
}

export interface OrigemRow { origem: string; count: number; pct: number }

export interface CampanhaAdsRow {
  nome: string;
  total: number;
  aceitos: number;
  tempoMedioSeg: number | null;
  pctViaGeral: number | null;
}

export interface ReportComputed {
  agoraMs: number;
  kpis: {
    leadsNovos: KpiComp;
    atividade: KpiComp;
    tarefasConcluidas: KpiComp;
    visitas: KpiComp;
    vendasValor: KpiComp;
    vendasQtd: KpiComp;
    adsLeads: KpiComp;
    adsTempoMedioSeg: { atual: number | null; anterior: number | null };
  };
  /** Tarefas (subcoleção) com vencimento dentro do período — a "agenda do período" */
  agendaPeriodo: { total: number; concluidas: number; canceladas: number; pendentes: number };
  timeline: { label: string; leads: number; atividade: number }[];
  timelineGranularidade: 'dia' | 'semana';
  funil: { etapa: string; cor: string; total: number; pctTotal: number; novosPeriodo: number }[];
  /** Leads nas etapas do circuito, incluindo Fechamento (Descartado/Bolsão ficam fora) */
  totalLeadsBase: number;
  /** Leads em estado terminal na base inteira */
  fechadosTotal: number;
  descartadosTotal: number;
  esquecidos: { b30: EsquecidoItem[]; b14: EsquecidoItem[]; b7: EsquecidoItem[] };
  corretorRows: CorretorRow[];
  equipeMedia: MetricasCorretor;
  /** Aba Atividade: o circuito narrado por corretor + retrato AGORA + motivos de descarte */
  atividade: {
    rows: AtividadeRow[];
    media: AtividadeMedia;
    motivosGlobal: MotivoCount[];
    descartesTotal: number;
  };
  origens: OrigemRow[];
  origensTotal: number;
  campanhasCrm: { nome: string; count: number }[];
  adsResumo: { total: number; aceitos: number; pctViaGeral: number | null; tempoMedioSeg: number | null };
  campanhasAds: CampanhaAdsRow[];
  conversaoOrigem: { origem: string; total: number; pctSaiuTopo: number; pctQuente: number }[];
}

const media = (soma: number, n: number): number | null => (n > 0 ? soma / n : null);

function novaMetrica(): MetricasCorretor {
  return {
    leadsNovos: 0, interacoes: 0, tarefasConcluidas: 0, tarefasCanceladas: 0, visitas: 0,
    vendasValor: 0, vendasQtd: 0, meets: 0, aceites: 0, tempoAceiteMedioSeg: null,
    leadsAtivos: 0, leadsQuentes: 0, pctQuente: null, pendentesTotal: 0, pendentesAtrasadas: 0,
  };
}

export function computeReport(
  src: ReportSource,
  periodo: Periodo,
  stagesWithMeta: PipelineStageWithMeta[]
): ReportComputed {
  const agoraMs = Date.now();
  const hoje0Ms = inicioDoDia(new Date()).getTime();
  const { inicioMs, fimMs, prevInicioMs, prevFimMs } = periodo;
  const noPeriodo = (ms: number | null) => ms !== null && ms >= inicioMs && ms <= fimMs;
  const noAnterior = (ms: number | null) => ms !== null && ms >= prevInicioMs && ms <= prevFimMs;

  // ------------------------------------------------------------------
  // Mapas de apoio
  // ------------------------------------------------------------------
  const leadMap = new Map<string, LeadLite>();
  src.leads.forEach((l) => leadMap.set(l.id, l));

  const etapaIdx = new Map<string, number>();
  const etapaQuente = new Set<string>();
  // Bolsão não é mais etapa do funil — é o estacionamento da área do admin; fica fora da carteira
  const etapaParada = new Set<string>([ETAPA_BOLSAO]);
  stagesWithMeta.forEach((s, i) => {
    etapaIdx.set(s.label, i);
    if (s.isQuente) etapaQuente.add(s.label);
    if (s.reportCategory === 'Troca de Leads') etapaParada.add(s.label);
  });
  // Estados terminais gravados em lead.etapa — fora do funil e das métricas de carteira
  const isTerminal = (etapa: string) => etapa === ETAPA_FECHADO || etapa === ETAPA_DESCARTADO;

  const nomeCorretor = new Map<string, string>();
  src.corretores.forEach((c) => nomeCorretor.set(c.id, c.nome));

  // Interações/tarefas de leads que não são desta base são descartadas
  const interacoes: InteracaoLite[] = src.interacoes.filter((i) => leadMap.has(i.leadId));
  const tarefas = src.tarefas.filter((t) => leadMap.has(t.leadId));

  // ------------------------------------------------------------------
  // KPIs (atual × período anterior de mesmo tamanho)
  // ------------------------------------------------------------------
  const kpis: ReportComputed['kpis'] = {
    leadsNovos: { atual: 0, anterior: 0 },
    atividade: { atual: 0, anterior: 0 },
    tarefasConcluidas: { atual: 0, anterior: 0 },
    visitas: { atual: 0, anterior: 0 },
    vendasValor: { atual: 0, anterior: 0 },
    vendasQtd: { atual: 0, anterior: 0 },
    adsLeads: { atual: 0, anterior: 0 },
    adsTempoMedioSeg: { atual: null, anterior: null },
  };

  src.leads.forEach((l) => {
    if (noPeriodo(l.createdAtMs)) kpis.leadsNovos.atual++;
    else if (noAnterior(l.createdAtMs)) kpis.leadsNovos.anterior++;
  });

  interacoes.forEach((i) => {
    const atual = noPeriodo(i.tsMs);
    const anterior = !atual && noAnterior(i.tsMs);
    if (!atual && !anterior) return;
    const alvo = atual ? 'atual' : 'anterior';
    kpis.atividade[alvo]++;
    if (i.type === 'Visita') kpis.visitas[alvo]++;
    if (i.type === 'Tarefa Concluída') kpis.tarefasConcluidas[alvo]++;
  });

  const ymdIni = ymdLocal(inicioMs);
  const ymdFim = ymdLocal(fimMs);
  const ymdPrevIni = ymdLocal(prevInicioMs);
  const ymdPrevFim = ymdLocal(prevFimMs);
  src.contribuicoes.forEach((c) => {
    if (!c.dataVenda) return;
    if (c.dataVenda >= ymdIni && c.dataVenda <= ymdFim) {
      kpis.vendasValor.atual += c.valor;
      kpis.vendasQtd.atual++;
    } else if (c.dataVenda >= ymdPrevIni && c.dataVenda <= ymdPrevFim) {
      kpis.vendasValor.anterior += c.valor;
      kpis.vendasQtd.anterior++;
    }
  });

  let somaAceiteAtual = 0, nAceiteAtual = 0, somaAceiteAnt = 0, nAceiteAnt = 0;
  src.adsLeads.forEach((a) => {
    const atual = noPeriodo(a.criadoEmMs);
    const anterior = !atual && noAnterior(a.criadoEmMs);
    if (!atual && !anterior) return;
    if (atual) kpis.adsLeads.atual++;
    else kpis.adsLeads.anterior++;
    if (a.status === 'aceito' && typeof a.tempoAceiteSeg === 'number') {
      if (atual) { somaAceiteAtual += a.tempoAceiteSeg; nAceiteAtual++; }
      else { somaAceiteAnt += a.tempoAceiteSeg; nAceiteAnt++; }
    }
  });
  kpis.adsTempoMedioSeg = { atual: media(somaAceiteAtual, nAceiteAtual), anterior: media(somaAceiteAnt, nAceiteAnt) };

  // Agenda do período: tarefas com vencimento dentro do período
  const agendaPeriodo = { total: 0, concluidas: 0, canceladas: 0, pendentes: 0 };
  tarefas.forEach((t) => {
    if (!noPeriodo(t.dueMs)) return;
    agendaPeriodo.total++;
    if (t.status === 'concluída') agendaPeriodo.concluidas++;
    else if (t.status === 'cancelada') agendaPeriodo.canceladas++;
    else agendaPeriodo.pendentes++;
  });

  // ------------------------------------------------------------------
  // Linha do tempo (barras por dia ou semana)
  // ------------------------------------------------------------------
  const nDias = Math.max(1, Math.round((fimMs - inicioMs + 1) / DIA_MS));
  const porSemana = nDias > 21;
  const passoMs = porSemana ? 7 * DIA_MS : DIA_MS;
  const nBuckets = Math.max(1, Math.ceil((fimMs - inicioMs + 1) / passoMs));
  const timeline = Array.from({ length: nBuckets }, (_, i) => {
    const d = new Date(inicioMs + i * passoMs);
    return {
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      leads: 0,
      atividade: 0,
    };
  });
  const bucketDe = (ms: number) => {
    const idx = Math.floor((ms - inicioMs) / passoMs);
    return idx >= 0 && idx < nBuckets ? idx : -1;
  };
  src.leads.forEach((l) => {
    if (!noPeriodo(l.createdAtMs)) return;
    const b = bucketDe(l.createdAtMs as number);
    if (b >= 0) timeline[b].leads++;
  });
  interacoes.forEach((i) => {
    if (!noPeriodo(i.tsMs)) return;
    const b = bucketDe(i.tsMs);
    if (b >= 0) timeline[b].atividade++;
  });

  // ------------------------------------------------------------------
  // Funil (retrato atual + entradas novas do período por etapa)
  // Etapa legada é mapeada para o circuito; Fechado/Descartado são terminais
  // e ficam fora das linhas do funil (contados à parte).
  // ------------------------------------------------------------------
  const funilCount = new Map<string, { total: number; novos: number }>();
  stagesWithMeta.forEach((s) => funilCount.set(s.label, { total: 0, novos: 0 }));
  let fechadosTotal = 0;
  let descartadosTotal = 0;
  src.leads.forEach((l) => {
    const label = funilCount.has(l.etapa) ? l.etapa : mapEtapaCircuito(l.etapa);
    if (label === ETAPA_FECHADO) fechadosTotal++; // Fechamento também é linha do funil (segue pro slot)
    if (label === ETAPA_DESCARTADO) { descartadosTotal++; return; }
    const slot = funilCount.get(label);
    if (!slot) return;
    slot.total++;
    if (noPeriodo(l.createdAtMs)) slot.novos++;
  });
  const totalLeadsBase = Array.from(funilCount.values()).reduce((s, v) => s + v.total, 0);
  const funil = stagesWithMeta.map((s, i) => {
    const slot = funilCount.get(s.label) || { total: 0, novos: 0 };
    return {
      etapa: s.label,
      cor: funilCor(i),
      total: slot.total,
      pctTotal: totalLeadsBase > 0 ? (slot.total / totalLeadsBase) * 100 : 0,
      novosPeriodo: slot.novos,
    };
  });

  // ------------------------------------------------------------------
  // Leads esquecidos (sem interação há 7/14/30 dias e sem tarefa pendente).
  // Bolsão fica de fora (estacionado de propósito), assim como os estados
  // terminais Fechado/Descartado.
  // ------------------------------------------------------------------
  const ultimaAtividade = new Map<string, number>();
  interacoes.forEach((i) => {
    const cur = ultimaAtividade.get(i.leadId) ?? 0;
    if (i.tsMs > cur && i.tsMs <= agoraMs) ultimaAtividade.set(i.leadId, i.tsMs);
  });
  const b30: EsquecidoItem[] = [];
  const b14: EsquecidoItem[] = [];
  const b7: EsquecidoItem[] = [];
  src.leads.forEach((l) => {
    const etapaCirc = mapEtapaCircuito(l.etapa);
    if (etapaParada.has(etapaCirc) || isTerminal(etapaCirc)) return;
    if (l.pendentesMs.length > 0) return;
    const base = Math.max(l.createdAtMs ?? 0, ultimaAtividade.get(l.id) ?? 0);
    if (base <= 0) return;
    const diasSem = Math.floor((agoraMs - base) / DIA_MS);
    if (diasSem < 7) return;
    const item: EsquecidoItem = {
      leadId: l.id,
      nome: l.nome || 'Sem nome',
      etapa: etapaCirc,
      etapaIdx: etapaIdx.get(etapaCirc) ?? 0,
      corretorNome: nomeCorretor.get(l.userId) || '—',
      diasSem,
    };
    if (diasSem >= 30) b30.push(item);
    else if (diasSem >= 14) b14.push(item);
    else b7.push(item);
  });
  const porDias = (a: EsquecidoItem, b: EsquecidoItem) => b.diasSem - a.diasSem;
  b30.sort(porDias); b14.sort(porDias); b7.sort(porDias);

  // ------------------------------------------------------------------
  // Por corretor (ranking + base do Individual × Coletivo)
  // ------------------------------------------------------------------
  const porCorretor = new Map<string, MetricasCorretor>();
  src.corretores.forEach((c) => porCorretor.set(c.id, novaMetrica()));
  const metrica = (uid: string | undefined | null): MetricasCorretor | null =>
    (uid && porCorretor.get(uid)) || null;

  src.leads.forEach((l) => {
    const m = metrica(l.userId);
    if (!m) return;
    if (noPeriodo(l.createdAtMs)) m.leadsNovos++;
    const etapaCirc = mapEtapaCircuito(l.etapa);
    if (!etapaParada.has(etapaCirc) && !isTerminal(etapaCirc)) {
      m.leadsAtivos++;
      if (etapaQuente.has(etapaCirc)) m.leadsQuentes++;
    }
    m.pendentesTotal += l.pendentesMs.length;
    m.pendentesAtrasadas += l.pendentesMs.filter((ms) => ms < hoje0Ms).length;
  });

  interacoes.forEach((i) => {
    if (!noPeriodo(i.tsMs)) return;
    const m = metrica(leadMap.get(i.leadId)?.userId);
    if (!m) return;
    m.interacoes++;
    if (i.type === 'Visita') m.visitas++;
    if (i.type === 'Tarefa Concluída') m.tarefasConcluidas++;
    if (i.type === 'Tarefa Cancelada') m.tarefasCanceladas++;
  });

  src.contribuicoes.forEach((c) => {
    if (!c.dataVenda || c.dataVenda < ymdIni || c.dataVenda > ymdFim) return;
    const m = metrica(c.corretorId);
    if (!m) return;
    m.vendasValor += c.valor;
    m.vendasQtd++;
  });

  src.meets.forEach((p) => {
    if (!(p.inicio <= ymdFim && ymdIni <= p.fim)) return; // período do placar intersecta o range
    Object.entries(p.contadores || {}).forEach(([uid, n]) => {
      const m = metrica(uid);
      if (m) m.meets += Number(n) || 0;
    });
  });

  const somaAceitePorCorretor = new Map<string, { soma: number; n: number }>();
  src.adsLeads.forEach((a) => {
    if (a.status !== 'aceito' || !a.aceitoPor) return;
    if (!noPeriodo(a.aceitoEmMs)) return;
    const m = metrica(a.aceitoPor);
    if (!m) return;
    m.aceites++;
    if (typeof a.tempoAceiteSeg === 'number') {
      const cur = somaAceitePorCorretor.get(a.aceitoPor) || { soma: 0, n: 0 };
      cur.soma += a.tempoAceiteSeg;
      cur.n++;
      somaAceitePorCorretor.set(a.aceitoPor, cur);
    }
  });

  const corretorRows: CorretorRow[] = src.corretores.map((c) => {
    const m = porCorretor.get(c.id) || novaMetrica();
    const aceite = somaAceitePorCorretor.get(c.id);
    return {
      id: c.id,
      nome: c.nome,
      ...m,
      tempoAceiteMedioSeg: aceite ? aceite.soma / aceite.n : null,
      pctQuente: m.leadsAtivos > 0 ? (m.leadsQuentes / m.leadsAtivos) * 100 : null,
    };
  });

  // Média da equipe (por corretor)
  const nCor = Math.max(1, corretorRows.length);
  const equipeMedia = novaMetrica();
  let somaTempoEquipe = 0, nTempoEquipe = 0, quentesEquipe = 0, ativosEquipe = 0;
  corretorRows.forEach((r) => {
    equipeMedia.leadsNovos += r.leadsNovos;
    equipeMedia.interacoes += r.interacoes;
    equipeMedia.tarefasConcluidas += r.tarefasConcluidas;
    equipeMedia.tarefasCanceladas += r.tarefasCanceladas;
    equipeMedia.visitas += r.visitas;
    equipeMedia.vendasValor += r.vendasValor;
    equipeMedia.vendasQtd += r.vendasQtd;
    equipeMedia.meets += r.meets;
    equipeMedia.aceites += r.aceites;
    equipeMedia.pendentesTotal += r.pendentesTotal;
    equipeMedia.pendentesAtrasadas += r.pendentesAtrasadas;
    ativosEquipe += r.leadsAtivos;
    quentesEquipe += r.leadsQuentes;
    const aceite = somaAceitePorCorretor.get(r.id);
    if (aceite) { somaTempoEquipe += aceite.soma; nTempoEquipe += aceite.n; }
  });
  equipeMedia.leadsNovos /= nCor;
  equipeMedia.interacoes /= nCor;
  equipeMedia.tarefasConcluidas /= nCor;
  equipeMedia.tarefasCanceladas /= nCor;
  equipeMedia.visitas /= nCor;
  equipeMedia.vendasValor /= nCor;
  equipeMedia.vendasQtd /= nCor;
  equipeMedia.meets /= nCor;
  equipeMedia.aceites /= nCor;
  equipeMedia.pendentesTotal /= nCor;
  equipeMedia.pendentesAtrasadas /= nCor;
  equipeMedia.leadsAtivos = ativosEquipe / nCor;
  equipeMedia.leadsQuentes = quentesEquipe / nCor;
  equipeMedia.pctQuente = ativosEquipe > 0 ? (quentesEquipe / ativosEquipe) * 100 : null;
  equipeMedia.tempoAceiteMedioSeg = media(somaTempoEquipe, nTempoEquipe);

  // ------------------------------------------------------------------
  // Atividade por corretor — parse do vocabulário narrado do circuito
  // ------------------------------------------------------------------
  const atvMap = new Map<string, AtividadeRow>();
  const motivosPorCorretor = new Map<string, Map<string, number>>();
  src.corretores.forEach((c) => {
    atvMap.set(c.id, {
      id: c.id,
      nome: c.nome,
      contatos: 0, semResposta: 0, meetsMarcados: 0, meetsFeitos: 0,
      visitasMarcadas: 0, visitasFeitas: 0, negociacoes: 0,
      vendasQtd: 0, vendasValor: 0, descartes: 0, descartesMotivos: [],
      ligAtivaTrabalhados: 0, ligAtivaCrm: 0, manuais: 0,
      circuitoQtd: 0, interacoesTotal: 0,
      aceites: 0, tempoAceiteMedioSeg: null,
      agora: { atrasadas: 0, semAcao: 0, negociacaoParada: 0 },
    });
    motivosPorCorretor.set(c.id, new Map());
  });
  const motivosGlobalMap = new Map<string, number>();
  let descartesTotal = 0;

  interacoes.forEach((i) => {
    if (!noPeriodo(i.tsMs)) return;
    const lead = leadMap.get(i.leadId);
    if (!lead) return;
    const evento = classificaInteracao(i.type, i.notes);
    // Descarte pode transferir o lead pra conta da imobiliária — descartadoPor manda
    const donoId = evento === 'descarte' ? (lead.descartadoPor || lead.userId) : lead.userId;
    const a = atvMap.get(donoId);
    if (!a) return;
    a.interacoesTotal++;
    if (i.circuito) a.circuitoQtd++;
    switch (evento) {
      case 'contato': a.contatos++; break;
      case 'semResposta': a.semResposta++; break;
      case 'meetMarcado': a.meetsMarcados++; break;
      case 'meetFeito': a.meetsFeitos++; break;
      case 'visitaMarcada': a.visitasMarcadas++; break;
      case 'visitaFeita': a.visitasFeitas++; break;
      case 'negociacao': a.negociacoes++; break;
      case 'venda':
        a.vendasQtd++;
        a.vendasValor += parseVendaValor(i.notes, lead.vendaValor);
        break;
      case 'descarte': {
        a.descartes++;
        descartesTotal++;
        const motivo = parseMotivoDescarte(i.notes, lead.descartadoMotivo);
        const mm = motivosPorCorretor.get(donoId);
        if (mm) mm.set(motivo, (mm.get(motivo) || 0) + 1);
        motivosGlobalMap.set(motivo, (motivosGlobalMap.get(motivo) || 0) + 1);
        break;
      }
      case 'manual': a.manuais++; break;
      default: break; // desconhecida/legado — não conta
    }
  });

  // Retrato AGORA (não obedece ao período): atrasos e leads sem próxima ação
  src.leads.forEach((l) => {
    const a = atvMap.get(l.userId);
    if (!a) return;
    a.agora.atrasadas += l.pendentesMs.filter((ms) => ms < agoraMs).length;
    const etapaCirc = mapEtapaCircuito(l.etapa);
    if (etapaCirc === ETAPA_BOLSAO || isTerminal(etapaCirc)) return; // Bolsão é estacionado de propósito
    if (l.pendentesMs.length === 0) {
      a.agora.semAcao++;
      if (etapaCirc === ETAPA_NEGOCIACAO) a.agora.negociacaoParada++;
    }
  });

  // Ligação ativa: contatos frios trabalhados no período → quantos viraram lead no CRM
  src.ligacaoAtiva.forEach((c) => {
    const a = atvMap.get(c.corretorId);
    if (!a) return;
    if (c.status === 'crm' && noPeriodo(c.incluidoEmMs)) {
      a.ligAtivaTrabalhados++;
      a.ligAtivaCrm++;
    } else if (c.status === 'descartado' && noPeriodo(c.descartadoEmMs)) {
      a.ligAtivaTrabalhados++;
    }
  });

  // Aceite de anúncio: reusa o que o ranking já calculou
  corretorRows.forEach((r) => {
    const a = atvMap.get(r.id);
    if (!a) return;
    a.aceites = r.aceites;
    a.tempoAceiteMedioSeg = r.tempoAceiteMedioSeg;
  });

  const atividadeRows: AtividadeRow[] = src.corretores.map((c) => {
    const a = atvMap.get(c.id)!;
    a.descartesMotivos = Array.from((motivosPorCorretor.get(c.id) || new Map<string, number>()).entries())
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((x, y) => y.count - x.count);
    return a;
  });

  const atvMedia: AtividadeMedia = {
    contatos: 0, semResposta: 0, meetsMarcados: 0, meetsFeitos: 0,
    visitasMarcadas: 0, visitasFeitas: 0, negociacoes: 0,
    vendasQtd: 0, vendasValor: 0, descartes: 0,
    ligAtivaTrabalhados: 0, ligAtivaCrm: 0, manuais: 0,
  };
  atividadeRows.forEach((a) => {
    atvMedia.contatos += a.contatos;
    atvMedia.semResposta += a.semResposta;
    atvMedia.meetsMarcados += a.meetsMarcados;
    atvMedia.meetsFeitos += a.meetsFeitos;
    atvMedia.visitasMarcadas += a.visitasMarcadas;
    atvMedia.visitasFeitas += a.visitasFeitas;
    atvMedia.negociacoes += a.negociacoes;
    atvMedia.vendasQtd += a.vendasQtd;
    atvMedia.vendasValor += a.vendasValor;
    atvMedia.descartes += a.descartes;
    atvMedia.ligAtivaTrabalhados += a.ligAtivaTrabalhados;
    atvMedia.ligAtivaCrm += a.ligAtivaCrm;
    atvMedia.manuais += a.manuais;
  });
  (Object.keys(atvMedia) as (keyof AtividadeMedia)[]).forEach((k) => { atvMedia[k] /= nCor; });

  const motivosGlobal: MotivoCount[] = Array.from(motivosGlobalMap.entries())
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((x, y) => y.count - x.count);

  // ------------------------------------------------------------------
  // Origens & campanhas
  // ------------------------------------------------------------------
  const origemDe = (l: LeadLite) => l.origemTipo || l.origem || 'Sem origem';
  const campanhaDe = (l: LeadLite) => {
    if (l.origemPropaganda) return l.origemPropaganda;
    const raw = l.origem || '';
    const sep = raw.indexOf('·');
    return sep >= 0 ? raw.slice(sep + 1).trim() || 'Sem campanha' : 'Sem campanha';
  };

  const origemCount = new Map<string, number>();
  const campanhaCount = new Map<string, number>();
  let origensTotal = 0;
  src.leads.forEach((l) => {
    if (!noPeriodo(l.createdAtMs)) return;
    origensTotal++;
    const o = origemDe(l);
    origemCount.set(o, (origemCount.get(o) || 0) + 1);
    if (o === 'Propaganda') {
      const camp = campanhaDe(l);
      campanhaCount.set(camp, (campanhaCount.get(camp) || 0) + 1);
    }
  });
  const origens: OrigemRow[] = Array.from(origemCount.entries())
    .map(([origem, count]) => ({ origem, count, pct: origensTotal > 0 ? (count / origensTotal) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
  const campanhasCrm = Array.from(campanhaCount.entries())
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count);

  // Anúncios (adsLeads criados no período)
  const adsNoPeriodo = src.adsLeads.filter((a) => noPeriodo(a.criadoEmMs));
  const adsAceitos = adsNoPeriodo.filter((a) => a.status === 'aceito');
  const comTempo = adsAceitos.filter((a) => typeof a.tempoAceiteSeg === 'number');
  const adsResumo = {
    total: adsNoPeriodo.length,
    aceitos: adsAceitos.length,
    pctViaGeral: adsAceitos.length > 0 ? (adsAceitos.filter((a) => a.viaGeral).length / adsAceitos.length) * 100 : null,
    tempoMedioSeg: media(comTempo.reduce((s, a) => s + (a.tempoAceiteSeg || 0), 0), comTempo.length),
  };
  const campMap = new Map<string, { total: number; aceitos: number; viaGeral: number; somaTempo: number; nTempo: number }>();
  adsNoPeriodo.forEach((a) => {
    const nome = a.campanhaNome || 'Sem campanha';
    const cur = campMap.get(nome) || { total: 0, aceitos: 0, viaGeral: 0, somaTempo: 0, nTempo: 0 };
    cur.total++;
    if (a.status === 'aceito') {
      cur.aceitos++;
      if (a.viaGeral) cur.viaGeral++;
      if (typeof a.tempoAceiteSeg === 'number') { cur.somaTempo += a.tempoAceiteSeg; cur.nTempo++; }
    }
    campMap.set(nome, cur);
  });
  const campanhasAds: CampanhaAdsRow[] = Array.from(campMap.entries())
    .map(([nome, c]) => ({
      nome,
      total: c.total,
      aceitos: c.aceitos,
      tempoMedioSeg: media(c.somaTempo, c.nTempo),
      pctViaGeral: c.aceitos > 0 ? (c.viaGeral / c.aceitos) * 100 : null,
    }))
    .sort((a, b) => b.total - a.total);

  // Conversão por origem: sobre TODA a base, % que saiu do topo do funil e % quente
  const convMap = new Map<string, { total: number; saiuTopo: number; quente: number }>();
  src.leads.forEach((l) => {
    const o = origemDe(l);
    const cur = convMap.get(o) || { total: 0, saiuTopo: 0, quente: 0 };
    const etapaCirc = mapEtapaCircuito(l.etapa);
    cur.total++;
    // Saiu do topo = qualquer etapa além de Entrada; Fechado/Descartado contam (já saíram)
    if (etapaIdx.get(etapaCirc) !== 0) cur.saiuTopo++;
    if (etapaQuente.has(etapaCirc)) cur.quente++;
    convMap.set(o, cur);
  });
  const conversaoOrigem = Array.from(convMap.entries())
    .map(([origem, c]) => ({
      origem,
      total: c.total,
      pctSaiuTopo: c.total > 0 ? (c.saiuTopo / c.total) * 100 : 0,
      pctQuente: c.total > 0 ? (c.quente / c.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    agoraMs,
    kpis,
    agendaPeriodo,
    timeline,
    timelineGranularidade: porSemana ? 'semana' : 'dia',
    funil,
    totalLeadsBase,
    fechadosTotal,
    descartadosTotal,
    esquecidos: { b30, b14, b7 },
    corretorRows,
    equipeMedia,
    atividade: { rows: atividadeRows, media: atvMedia, motivosGlobal, descartesTotal },
    origens,
    origensTotal,
    campanhasCrm,
    adsResumo,
    campanhasAds,
    conversaoOrigem,
  };
}
