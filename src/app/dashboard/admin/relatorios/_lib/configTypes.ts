/**
 * Tipos para o Relatório Individual configurável.
 * Métricas e etapas são definidas por config (versionada com effective_from).
 */

export type PeriodKey = 'dia' | 'semana' | 'mes' | 'trimestre' | 'semestre' | 'ano';

/** Definição de uma métrica (id estável para referência em regras e eventos) */
export interface MetricDefinition {
  id: string;
  nome: string;
  categoria: 'funil' | 'eventos_internos' | 'prospeccao' | 'tarefas' | 'inovacao' | 'captacao' | 'uso_crm';
  unidade: 'count' | 'sum' | 'duration' | 'currency';
  ativo: boolean;
  ordem: number;
  tipo: 'count' | 'sum' | 'duration';
}

/** Uma etapa/métrica no funil (pode ser stage do pipeline ou métrica agregada) */
export interface FunnelStageConfig {
  id: string;
  nome: string;
  tipo: 'stage' | 'metric';
  /** Para cálculo reverso: quantos desta etapa são necessários para 1 da próxima (conversão) */
  conversaoParaProximo?: number; // 0..1, ex: 0.25 = 25% vira próximo
  /** Peso no diagnóstico de GAP (maior = mais importante no foco) */
  pesoDiagnostico?: number;
}

/** Regra de cálculo: ticket médio ou como obter VGV/unidades a partir da última etapa */
export interface FunnelRuleConfig {
  /** Última etapa do funil (ex: venda) → valor em R$ por unidade */
  ticketMedio?: number;
  /** Ou: métrica_id que contém o valor realizado em R$ (ex: VGV) */
  metricIdVgv?: string;
}

/** Template do funil versionado */
export interface FunnelTemplate {
  id: string;
  nome: string;
  versao: string;
  effectiveFrom: string; // ISO date, e.g. "2025-01-01"
  stages: FunnelStageConfig[];
  rules: FunnelRuleConfig;
  /** IDs das etapas na ordem (topo → fundo) para exibição */
  stageOrder: string[];
}

/** Config completa do relatório (por imobiliária) */
export interface ReportConfig {
  imobiliariaId: string;
  metricDefinitions: MetricDefinition[];
  funnelTemplate: FunnelTemplate;
  /** Mapeamento evento → métrica (versionado) */
  eventToMetricMap?: EventToMetricMapping[];
  updatedAt?: string;
}

/** Mapeamento: tipo de evento → qual métrica incrementa */
export interface EventToMetricMapping {
  eventType: string;
  metricId: string;
  operation: 'increment' | 'sum';
  multiplier?: number;
  effectiveFrom: string;
}

/** Resultado do funil invertido: necessário por etapa no período */
export interface NecessaryByStage {
  stageId: string;
  stageNome: string;
  valor: number;
  /** Valor em R$ se for a etapa final */
  valorR?: number;
}

/** Realizado por etapa/métrica (agregado do período) */
export interface RealizedByStage {
  stageId: string;
  stageNome: string;
  valor: number;
}

/** GAP por etapa */
export interface GapByStage {
  stageId: string;
  stageNome: string;
  necessario: number;
  realizado: number;
  gapAbs: number;
  gapPct: number | null; // realizado/necessário; null se necessário=0
  peso?: number;
}

/** Prioridade de foco (gargalo) */
export interface FocusPriority {
  stageId: string;
  stageNome: string;
  mensagem: string;
  gapAbs: number;
  gapPct: number | null;
}

/** Bounds do período para cálculos */
export interface PeriodBounds {
  start: Date;
  end: Date;
  /** Para pace: quantos % do período já passou (0..1) */
  progressPct?: number;
}
