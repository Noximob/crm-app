/**
 * Agregação pura dos relatórios: recebe os dados brutos (ReportSource),
 * o período selecionado e as etapas do funil, e devolve tudo que as abas
 * renderizam. Nenhum acesso a Firestore aqui — recomputa no cliente a cada
 * troca de período/aba sem refazer fetch.
 */

import type { PipelineStageWithMeta } from '@/lib/pipelineStagesConfig';
import { ETAPA_DESCARTADO, ETAPA_FECHADO, ETAPA_NEGOCIACAO, mapEtapaCircuito } from '@/lib/circuito';
import {
  DIA_MS, InteracaoLite, LeadLite, Periodo, ReportSource, fmtInt, fmtPct, funilCor, inicioDoDia, ymdLocal,
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

/** Um achado do diagnóstico automático do corretor. */
export interface DiagItem {
  nivel: 'critico' | 'atencao' | 'ok';
  icone: string;
  titulo: string;
  frase: string;
}

export interface AtividadeAgora {
  /** tarefas pendentes com prazo estourado (dueDate < agora, hora real) */
  atrasadas: number;
  /** leads em etapa ativa do circuito (Entrada→Negociação) sem nenhuma tarefa pendente */
  semAcao: number;
  /** leads parados em Negociação (sem próxima ação agendada) */
  negociacaoParada: number;
  /** leads em Entrada/Follow-up que ainda não tiveram conversa de verdade (rodízio do 1º contato) */
  semPrimeiroContato: number;
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
  /** 1ºs contatos conquistados no período (cliente atendeu/respondeu pela 1ª vez) */
  primeirosContatos: number;
  /** média de tentativas até o 1º contato (dos conquistados no período); null sem amostra */
  tentativasMediaPrimeiroContato: number | null;
  ligAtivaTrabalhados: number;
  ligAtivaCrm: number;
  manuais: number;
  /** requalificações registradas no período ("o que não encaixou?") */
  requalificacoes: number;
  /** tarefas de buscar imóvel pra oferecer criadas no período */
  buscasProduto: number;
  /** agendamentos do período em que o corretor escreveu observação (· 📝) */
  comObservacao: number;
  /** tarefas agendadas na mão (modal da agenda) — trabalho fora do circuito que conta */
  tarefasAgendadasMao: number;
  /** tarefas concluídas na mão (fora dos pop-ups) */
  tarefasConcluidasMao: number;
  /** leads novos do período gerados por esforço próprio (origem fora de Propaganda) */
  geracaoPropria: number;
  // ---- Capricho da carteira (retrato AGORA, não obedece ao período) ----
  /** leads em etapa ativa (Entrada → Negociação) */
  carteiraAtiva: number;
  /** % da carteira ativa com pelo menos 1 grupo de qualificação preenchido */
  qualificadosPct: number | null;
  /** média de grupos de qualificação preenchidos na carteira ativa (0..7) */
  qualMediaGrupos: number | null;
  /** % da carteira ativa com anotações escritas */
  anotadosPct: number | null;
  /** leads ativos SEM nenhuma qualificação e SEM anotação — trabalhados no escuro */
  semRegistro: number;
  // ---- Velocidade & constância ----
  /** dias distintos com pelo menos 1 interação no período */
  diasAtivos: number;
  /** tamanho do período em dias (denominador dos dias ativos) */
  periodoDias: number;
  /** última interação registrada (dentro da janela carregada); null = nada na janela */
  ultimaAtividadeMs: number | null;
  /** média de horas entre criar o lead e o 1º contato efetivo; null sem amostra */
  tempo1oContatoMedioHoras: number | null;
  // ---- Corrente do funil & tempos de resposta ----
  /** leads novos do período (todas as origens) — topo da corrente do funil */
  leadsNovosPeriodo: number;
  /** média de horas entre o lead nascer e a PRIMEIRA ação do corretor (leads do período) */
  respostaLeadNovoHoras: number | null;
  /** leads criados no período que ainda não receberam NENHUMA ação */
  novosSemResposta: number;
  /** contatos frios pendentes que nunca receberam uma tentativa */
  friosSemTentativa: number;
  /** média de horas entre a lista fria chegar e a primeira tentativa do corretor */
  tempoAtacarFrioHoras: number | null;
  /** leads ativos parados na MESMA etapa há 7+ dias */
  paradosNaEtapa7d: number;
  /** diagnóstico automático — os gargalos apontados em texto, do pior pro menor */
  diagnostico: DiagItem[];
  // ---- Nota geral (0-100) ----
  nota: number;
  notaPartes: { ritmo: number; resultado: number; capricho: number | null; emDia: number | null };
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
  primeirosContatos: number;
  ligAtivaTrabalhados: number;
  ligAtivaCrm: number;
  manuais: number;
}

type CircuitoEvento =
  | 'contato' | 'semResposta' | 'primeiroContato' | 'meetMarcado' | 'meetFeito' | 'visitaMarcada'
  | 'visitaFeita' | 'negociacao' | 'venda' | 'descarte' | 'manual'
  | 'requalificacao' | 'produto' | 'tarefaAgendadaMao' | 'tarefaConcluidaMao' | null;

/**
 * Traduz uma interação narrada pelo circuito num evento contável.
 * Defensivo: notes ausente/legado → a interação simplesmente não conta.
 */
export function classificaInteracao(type: string, notes: string | undefined | null): CircuitoEvento {
  const n = typeof notes === 'string' ? notes : '';
  switch (type) {
    case 'Contato':
      // marco gravado pelo motor quando o cliente atende/responde pela 1ª vez
      if (n.startsWith('🎯 1º contato')) return 'primeiroContato';
      return null;
    case 'Produto':
      // "🔎 Vai buscar imóvel pra oferecer" — trabalho de bastidor que merece contar
      return 'produto';
    case 'Ligação':
    case 'WhatsApp':
      return 'contato'; // tentativa de contato (circuito ou manual, é contato do mesmo jeito)
    case 'Follow-up':
      if (n.startsWith('📵 Não atendeu')) return 'semResposta';
      // 'Cobrança agendada' NÃO conta mais como negociação: ela repete a cada
      // re-prazo ("Ainda negociando") e duplicava a transição — auditoria 21/07.
      return null;
    case 'Tarefa Agendada':
      // Agendamento manual pelo modal da agenda — trabalho real que ficava invisível
      return 'tarefaAgendadaMao';
    case 'Tarefa Concluída':
      return 'tarefaConcluidaMao';
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
      if (n.startsWith('🎯 Requalificação')) return 'requalificacao';
      // Negociação = TRANSIÇÕES pra etapa ('hora da proposta' cobre a visita aprovada — bug achado na auditoria)
      if (n.includes('pra proposta') || n.includes('pronto pra negociar') || n.includes('pra negociação') || n.includes('hora da proposta')) return 'negociacao';
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
  /** Leads nas etapas do circuito, incluindo Fechamento (Descartado fica fora) */
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
  // 'Bolsão' deixou de existir como estado de lead (legados viram Follow-up);
  // o set continua só pra etapas custom futuras marcadas como 'Troca de Leads'.
  const etapaParada = new Set<string>();
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
  // Ficam de fora os estados
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
      primeirosContatos: 0, tentativasMediaPrimeiroContato: null,
      ligAtivaTrabalhados: 0, ligAtivaCrm: 0, manuais: 0,
      requalificacoes: 0, buscasProduto: 0, comObservacao: 0, geracaoPropria: 0,
      tarefasAgendadasMao: 0, tarefasConcluidasMao: 0,
      carteiraAtiva: 0, qualificadosPct: null, qualMediaGrupos: null, anotadosPct: null, semRegistro: 0,
      diasAtivos: 0, periodoDias: 1, ultimaAtividadeMs: null, tempo1oContatoMedioHoras: null,
      leadsNovosPeriodo: 0, respostaLeadNovoHoras: null, novosSemResposta: 0,
      friosSemTentativa: 0, tempoAtacarFrioHoras: null, paradosNaEtapa7d: 0, diagnostico: [],
      nota: 0, notaPartes: { ritmo: 0, resultado: 0, capricho: null, emDia: null },
      circuitoQtd: 0, interacoesTotal: 0,
      aceites: 0, tempoAceiteMedioSeg: null,
      agora: { atrasadas: 0, semAcao: 0, negociacaoParada: 0, semPrimeiroContato: 0 },
    });
    motivosPorCorretor.set(c.id, new Map());
  });
  const motivosGlobalMap = new Map<string, number>();
  let descartesTotal = 0;
  // tentativas até o 1º contato — soma/n por corretor pra tirar a média
  const tent1oMap = new Map<string, { soma: number; n: number }>();
  // constância: dias distintos com interação no período + última atividade (janela toda)
  const diasAtivosMap = new Map<string, Set<string>>();
  const ultimaAtividadeMap = new Map<string, number>();
  // primeira ação registrada em cada lead (janela toda) — mede o tempo de resposta
  const primeiraInteracaoLead = new Map<string, number>();

  interacoes.forEach((i) => {
    const leadJanela = leadMap.get(i.leadId);
    if (leadJanela) {
      const dono = leadJanela.userId;
      if ((ultimaAtividadeMap.get(dono) ?? 0) < i.tsMs) ultimaAtividadeMap.set(dono, i.tsMs);
      if ((primeiraInteracaoLead.get(i.leadId) ?? Infinity) > i.tsMs) primeiraInteracaoLead.set(i.leadId, i.tsMs);
    }
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
    if (i.notes.includes('· 📝')) a.comObservacao++;
    const diasSet = diasAtivosMap.get(donoId) || new Set<string>();
    diasSet.add(ymdLocal(i.tsMs));
    diasAtivosMap.set(donoId, diasSet);
    switch (evento) {
      case 'contato': a.contatos++; break;
      case 'semResposta': a.semResposta++; break;
      case 'primeiroContato': {
        a.primeirosContatos++;
        const mTent = /na (\d+)ª tentativa/.exec(i.notes || '');
        if (mTent) {
          const cur = tent1oMap.get(donoId) || { soma: 0, n: 0 };
          cur.soma += Number(mTent[1]);
          cur.n++;
          tent1oMap.set(donoId, cur);
        }
        break;
      }
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
      case 'requalificacao': a.requalificacoes++; break;
      case 'produto': a.buscasProduto++; break;
      case 'tarefaAgendadaMao': a.tarefasAgendadasMao++; break;
      case 'tarefaConcluidaMao': a.tarefasConcluidasMao++; break;
      default: break; // desconhecida/legado — não conta
    }
  });

  // Retrato AGORA (não obedece ao período): atrasos, leads sem próxima ação e
  // CAPRICHO da carteira (qualificação + anotações), velocidade e geração própria
  const caprichoMap = new Map<string, { ativa: number; qualCom: number; qualSoma: number; anot: number; semReg: number }>();
  const tempo1oMap = new Map<string, { somaH: number; n: number }>();
  const respostaMap = new Map<string, { somaH: number; n: number }>();
  src.leads.forEach((l) => {
    const a = atvMap.get(l.userId);
    if (!a) return;
    // Geração própria: lead criado no período por esforço do corretor (fora Propaganda)
    if (noPeriodo(l.createdAtMs) && l.origemTipo && l.origemTipo !== 'Propaganda') a.geracaoPropria++;
    // Tempo de resposta: lead nasceu no período → quanto demorou a PRIMEIRA ação?
    if (noPeriodo(l.createdAtMs)) {
      a.leadsNovosPeriodo++;
      const prim = primeiraInteracaoLead.get(l.id);
      if (prim !== undefined && l.createdAtMs !== null && prim >= l.createdAtMs) {
        const horas = Math.min(720, (prim - l.createdAtMs) / (60 * 60 * 1000));
        const rMap = respostaMap.get(l.userId) || { somaH: 0, n: 0 };
        rMap.somaH += horas; rMap.n++;
        respostaMap.set(l.userId, rMap);
      } else if (prim === undefined) {
        a.novosSemResposta++;
      }
    }
    // Velocidade: horas entre criar o lead e o cliente atender pela 1ª vez
    if (l.primeiroContatoMs !== null && l.createdAtMs !== null && l.primeiroContatoMs > l.createdAtMs) {
      const horas = Math.min(720, (l.primeiroContatoMs - l.createdAtMs) / (60 * 60 * 1000));
      const t = tempo1oMap.get(l.userId) || { somaH: 0, n: 0 };
      t.somaH += horas; t.n++;
      tempo1oMap.set(l.userId, t);
    }
    a.agora.atrasadas += l.pendentesMs.filter((ms) => ms < agoraMs).length;
    const etapaCirc = mapEtapaCircuito(l.etapa);
    if (isTerminal(etapaCirc)) return;
    // Capricho: só a carteira ATIVA conta (Entrada → Negociação)
    const cap = caprichoMap.get(l.userId) || { ativa: 0, qualCom: 0, qualSoma: 0, anot: 0, semReg: 0 };
    cap.ativa++;
    if (l.qualGrupos > 0) cap.qualCom++;
    cap.qualSoma += l.qualGrupos;
    if (l.temAnotacoes) cap.anot++;
    if (l.qualGrupos === 0 && !l.temAnotacoes) cap.semReg++;
    caprichoMap.set(l.userId, cap);
    if (l.etapaDesdeMs !== null && agoraMs - l.etapaDesdeMs > 7 * DIA_MS) a.paradosNaEtapa7d++;
    if (l.pendentesMs.length === 0) {
      a.agora.semAcao++;
      if (etapaCirc === ETAPA_NEGOCIACAO) a.agora.negociacaoParada++;
    }
    // Rodízio do 1º contato: quem tá em Entrada/Follow-up sem conversa registrada
    if (l.semPrimeiroContato && (etapaCirc === 'Entrada' || etapaCirc === 'Follow-up')) {
      a.agora.semPrimeiroContato++;
    }
  });

  // Ligação ativa: contatos frios trabalhados no período → quantos viraram lead no CRM
  // + agilidade na lista (frios sem tentativa e tempo até a 1ª tentativa)
  const atacarMap = new Map<string, { somaH: number; n: number }>();
  src.ligacaoAtiva.forEach((c) => {
    const a = atvMap.get(c.corretorId);
    if (!a) return;
    if (c.status === 'pendente' && c.tentativas === 0) a.friosSemTentativa++;
    if (c.primeiraTentativaMs !== null && c.listaCriadaEmMs !== null && c.primeiraTentativaMs > c.listaCriadaEmMs) {
      const horas = Math.min(720, (c.primeiraTentativaMs - c.listaCriadaEmMs) / (60 * 60 * 1000));
      const at = atacarMap.get(c.corretorId) || { somaH: 0, n: 0 };
      at.somaH += horas; at.n++;
      atacarMap.set(c.corretorId, at);
    }
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

  const periodoDias = Math.max(1, Math.round((fimMs - inicioMs + 1) / DIA_MS));
  const atividadeRows: AtividadeRow[] = src.corretores.map((c) => {
    const a = atvMap.get(c.id)!;
    a.descartesMotivos = Array.from((motivosPorCorretor.get(c.id) || new Map<string, number>()).entries())
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((x, y) => y.count - x.count);
    const t1 = tent1oMap.get(c.id);
    a.tentativasMediaPrimeiroContato = t1 && t1.n > 0 ? t1.soma / t1.n : null;
    // Capricho da carteira
    const cap = caprichoMap.get(c.id);
    if (cap && cap.ativa > 0) {
      a.carteiraAtiva = cap.ativa;
      a.qualificadosPct = (cap.qualCom / cap.ativa) * 100;
      a.qualMediaGrupos = cap.qualSoma / cap.ativa;
      a.anotadosPct = (cap.anot / cap.ativa) * 100;
      a.semRegistro = cap.semReg;
    }
    // Velocidade & constância
    a.diasAtivos = diasAtivosMap.get(c.id)?.size ?? 0;
    a.periodoDias = periodoDias;
    a.ultimaAtividadeMs = ultimaAtividadeMap.get(c.id) ?? null;
    const v1 = tempo1oMap.get(c.id);
    a.tempo1oContatoMedioHoras = v1 && v1.n > 0 ? v1.somaH / v1.n : null;
    const rp = respostaMap.get(c.id);
    a.respostaLeadNovoHoras = rp && rp.n > 0 ? rp.somaH / rp.n : null;
    const at = atacarMap.get(c.id);
    a.tempoAtacarFrioHoras = at && at.n > 0 ? at.somaH / at.n : null;
    return a;
  });

  // ------------------------------------------------------------------
  // NOTA GERAL (0-100) — 4 componentes de até 25 pts, transparentes:
  //   Ritmo      = volume de interações vs o melhor da equipe no período
  //   Resultado  = meets/visitas feitos + negociações + vendas + 1ºs contatos vs o melhor
  //   Capricho   = qualificação (60%) + anotações (40%) da carteira ativa
  //   Em dia     = desconta atrasadas e leads sem próxima ação da carteira
  // Componente sem amostra (carteira vazia) sai do denominador — corretor novo
  // não é punido pelo que ainda não teve como fazer.
  // ------------------------------------------------------------------
  const maxInteracoes = Math.max(1, ...atividadeRows.map((r) => r.interacoesTotal));
  const pontosResultado = (r: AtividadeRow) =>
    r.meetsFeitos * 2 + r.visitasFeitas * 3 + r.negociacoes * 2 + r.vendasQtd * 8 + r.primeirosContatos;
  const maxPontos = Math.max(1, ...atividadeRows.map(pontosResultado));
  atividadeRows.forEach((r) => {
    const ritmo = 25 * Math.min(1, r.interacoesTotal / maxInteracoes);
    const resultado = 25 * Math.min(1, pontosResultado(r) / maxPontos);
    const capricho = r.carteiraAtiva > 0 && r.qualificadosPct !== null && r.anotadosPct !== null
      ? 25 * (0.6 * (r.qualificadosPct / 100) + 0.4 * (r.anotadosPct / 100))
      : null;
    const emDia = r.carteiraAtiva > 0
      ? 25 * Math.max(0, 1 - (r.agora.atrasadas + 0.5 * r.agora.semAcao) / r.carteiraAtiva)
      : null;
    const partes = [ritmo, resultado, capricho, emDia].filter((p): p is number => p !== null);
    r.notaPartes = { ritmo, resultado, capricho, emDia };
    r.nota = partes.length > 0 ? Math.round((partes.reduce((s, p) => s + p, 0) / (partes.length * 25)) * 100) : 0;
  });

  // ------------------------------------------------------------------
  // DIAGNÓSTICO AUTOMÁTICO — regras que apontam o GARGALO de cada corretor
  // em texto claro, comparando com a equipe. Críticos primeiro, no máx. 4.
  // ------------------------------------------------------------------
  const fmtH = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h)} h` : `${(h / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`);
  const mediaNaoNula = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x !== null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const eqResposta = mediaNaoNula(atividadeRows.map((r) => r.respostaLeadNovoHoras));
  const eqContatos1o = atividadeRows.reduce((s, r) => s + r.primeirosContatos, 0);
  const eqMeetPorContato = eqContatos1o > 0 ? atividadeRows.reduce((s, r) => s + r.meetsMarcados, 0) / eqContatos1o : null;
  const eqDescartes = atividadeRows.length ? atividadeRows.reduce((s, r) => s + r.descartes, 0) / atividadeRows.length : 0;

  atividadeRows.forEach((r) => {
    type Achado = DiagItem & { peso: number };
    const achados: Achado[] = [];
    const add = (nivel: DiagItem['nivel'], peso: number, icone: string, titulo: string, frase: string) =>
      achados.push({ nivel, peso, icone, titulo, frase });

    if (r.interacoesTotal === 0 && r.carteiraAtiva === 0 && r.leadsNovosPeriodo === 0) {
      r.diagnostico = [{ nivel: 'atencao', icone: '💤', titulo: 'Sem movimento no período', frase: 'Nenhuma ação registrada e carteira vazia — sem dados pra diagnosticar.' }];
      return;
    }

    // 1. Demora pra responder lead novo
    if (r.respostaLeadNovoHoras !== null && r.respostaLeadNovoHoras > 24) {
      add(r.respostaLeadNovoHoras > 48 ? 'critico' : 'atencao', 90 + r.respostaLeadNovoHoras / 24, '🐢',
        'Demora pra responder lead novo',
        `${fmtH(r.respostaLeadNovoHoras)} em média até a 1ª ação num lead novo${eqResposta !== null ? ` (equipe: ${fmtH(eqResposta)})` : ''}. Lead de imóvel esfria em horas.`);
    }
    // 2. Leads novos sem NENHUMA ação
    if (r.novosSemResposta >= 3) {
      add(r.novosSemResposta >= 5 ? 'critico' : 'atencao', 95 + r.novosSemResposta, '🧊',
        'Leads novos sem nenhuma ação',
        `${fmtInt(r.novosSemResposta)} lead${r.novosSemResposta > 1 ? 's' : ''} que chegaram no período seguem sem UM contato sequer.`);
    }
    // 3. Rodízio de 1º contato parado (carteira que nunca atendeu)
    if (r.carteiraAtiva >= 5) {
      const pctSem1o = (r.agora.semPrimeiroContato / r.carteiraAtiva) * 100;
      if (pctSem1o > 35) {
        add(pctSem1o > 55 ? 'critico' : 'atencao', 80 + pctSem1o, '📵',
          'Carteira que nunca atendeu',
          `${fmtPct(pctSem1o)} da carteira nunca teve conversa de verdade (${fmtInt(r.agora.semPrimeiroContato)} leads) — falta insistir no rodízio de 1º contato.`);
      }
    }
    // 4. Conversa não vira meet (o gargalo do pitch)
    if (r.primeirosContatos >= 4 && eqMeetPorContato !== null && eqMeetPorContato > 0) {
      const dele = r.meetsMarcados / r.primeirosContatos;
      if (dele < eqMeetPorContato * 0.5) {
        add(dele < eqMeetPorContato * 0.35 ? 'critico' : 'atencao', 85, '🗣️',
          'Conversa não vira meet',
          `${fmtInt(r.primeirosContatos)} clientes atenderam mas só ${fmtInt(r.meetsMarcados)} viraram meet (${fmtPct(dele * 100)} · equipe ${fmtPct(eqMeetPorContato * 100)}). O gargalo é a ABORDAGEM, não o esforço.`);
      }
    }
    // 5. Marca mas não acontece (no-show)
    if (r.meetsMarcados >= 3 && r.meetsFeitos / r.meetsMarcados < 0.5) {
      add('atencao', 70, '👻',
        'Meets marcados que não acontecem',
        `Só ${fmtInt(r.meetsFeitos)} de ${fmtInt(r.meetsMarcados)} meets aconteceram — confirmar na véspera e encurtar o intervalo entre marcar e realizar.`);
    }
    // 6. Negociações esfriando
    if (r.agora.negociacaoParada >= 1) {
      add(r.agora.negociacaoParada >= 3 ? 'critico' : 'atencao', 75 + r.agora.negociacaoParada * 5, '🥶',
        'Proposta na mesa esfriando',
        `${fmtInt(r.agora.negociacaoParada)} negociaç${r.agora.negociacaoParada > 1 ? 'ões' : 'ão'} sem próxima ação agendada — é o dinheiro mais perto do bolso.`);
    }
    // 7. CRM estourado
    if (r.carteiraAtiva > 0 && r.agora.atrasadas / r.carteiraAtiva > 0.25) {
      const pctAtr = (r.agora.atrasadas / r.carteiraAtiva) * 100;
      add(pctAtr > 50 ? 'critico' : 'atencao', 78 + pctAtr / 2, '⏰',
        'Tarefas estouradas',
        `${fmtInt(r.agora.atrasadas)} tarefas com prazo vencido (${fmtPct(pctAtr)} da carteira) — o sistema cobra e ele não responde.`);
    }
    // 8. Trabalhando no escuro (não qualifica nem anota)
    if (r.carteiraAtiva >= 5 && r.qualificadosPct !== null && r.anotadosPct !== null) {
      const capPct = 0.6 * r.qualificadosPct + 0.4 * r.anotadosPct;
      if (capPct < 40) {
        add(capPct < 20 ? 'critico' : 'atencao', 60 + (40 - capPct), '🕶️',
          'Trabalhando no escuro',
          `Só ${fmtPct(r.qualificadosPct)} da carteira qualificada e ${fmtPct(r.anotadosPct)} com anotação — sem registro, ninguém cruza cliente × produto.`);
      }
    }
    // 9. Lista fria intocada
    if (r.friosSemTentativa >= 10) {
      add(r.friosSemTentativa >= 25 ? 'critico' : 'atencao', 65 + r.friosSemTentativa / 5, '☎️',
        'Lista fria esperando',
        `${fmtInt(r.friosSemTentativa)} contatos frios sem a 1ª tentativa${r.tempoAtacarFrioHoras !== null ? ` — e quando ataca, demora ${fmtH(r.tempoAtacarFrioHoras)} pra começar a lista` : ''}.`);
    }
    // 10. Constância baixa
    if (r.periodoDias >= 7 && r.diasAtivos / r.periodoDias < 0.35) {
      add('atencao', 55, '📆',
        'Pouca constância',
        `Mexeu no CRM em só ${fmtInt(r.diasAtivos)} de ${fmtInt(r.periodoDias)} dias do período.`);
    }
    // 11. Leads mofando na etapa
    if (r.paradosNaEtapa7d >= 5) {
      add('atencao', 50 + r.paradosNaEtapa7d, '🪨',
        'Leads parados na mesma etapa',
        `${fmtInt(r.paradosNaEtapa7d)} leads há 7+ dias sem sair do lugar no funil.`);
    }
    // 12. Descarta acima da equipe
    if (r.descartes >= 3 && r.descartes > 2 * Math.max(1, eqDescartes)) {
      add('atencao', 45, '🗑️',
        'Descartando acima da equipe',
        `${fmtInt(r.descartes)} descartes no período (equipe: ~${fmtInt(Math.round(eqDescartes))}) — vale conferir os motivos no raio-x.`);
    }

    const ordem = { critico: 0, atencao: 1, ok: 2 } as const;
    achados.sort((x, y) => ordem[x.nivel] - ordem[y.nivel] || y.peso - x.peso);
    r.diagnostico = achados.length > 0
      ? achados.slice(0, 4).map(({ nivel, icone, titulo, frase }) => ({ nivel, icone, titulo, frase }))
      : [{ nivel: 'ok', icone: '✅', titulo: 'Sem gargalo crítico', frase: 'Resposta, ritmo e registro dentro do saudável — agora é cobrar consistência e resultado.' }];
  });

  const atvMedia: AtividadeMedia = {
    contatos: 0, semResposta: 0, meetsMarcados: 0, meetsFeitos: 0,
    visitasMarcadas: 0, visitasFeitas: 0, negociacoes: 0,
    vendasQtd: 0, vendasValor: 0, descartes: 0, primeirosContatos: 0,
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
    atvMedia.primeirosContatos += a.primeirosContatos;
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
