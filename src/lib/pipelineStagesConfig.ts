/**
 * Configuração do funil de vendas: etapas padrão com metadados para relatórios e "etapas quentes".
 * Usado como fallback quando não há documento em configFunilVendas/{imobiliariaId}.
 */

export const REPORT_FUNIL_ETAPAS = [
  'Topo de Funil',
  'Qualificado',
  'Apresentação do imóvel',
  'Reunião agendada',
  'Negociação e contrato',
  'Follow up',
  'Troca de Leads',
] as const;

export type ReportCategory = (typeof REPORT_FUNIL_ETAPAS)[number];

export interface PipelineStageWithMeta {
  label: string;
  reportCategory: ReportCategory;
  isQuente: boolean;
}

/** Etapas padrão do funil com metadados (relatório e quente) */
export const DEFAULT_PIPELINE_STAGES_WITH_META: PipelineStageWithMeta[] = [
  { label: 'Pré Qualificação', reportCategory: 'Topo de Funil', isQuente: false },
  { label: 'Qualificação', reportCategory: 'Qualificado', isQuente: false },
  { label: 'Apresentação do imóvel', reportCategory: 'Apresentação do imóvel', isQuente: false },
  { label: 'Ligação agendada', reportCategory: 'Reunião agendada', isQuente: false },
  { label: 'Visita agendada', reportCategory: 'Reunião agendada', isQuente: false },
  { label: 'Negociação e Proposta', reportCategory: 'Negociação e contrato', isQuente: true },
  { label: 'Contrato e fechamento', reportCategory: 'Negociação e contrato', isQuente: true },
  { label: 'Pós Venda e Fidelização', reportCategory: 'Follow up', isQuente: true },
  { label: 'Interesse Futuro', reportCategory: 'Troca de Leads', isQuente: false },
  { label: 'Carteira', reportCategory: 'Troca de Leads', isQuente: false },
  { label: 'Geladeira', reportCategory: 'Troca de Leads', isQuente: false },
];

/** Labels curtos para exibição em TV / cards compactos (por categoria) */
export const COMPACT_GROUP_LABELS: Record<ReportCategory, string> = {
  'Topo de Funil': 'Topo',
  'Qualificado': 'Qualif.',
  'Apresentação do imóvel': 'Apres. imóvel',
  'Reunião agendada': 'Lig. e visita',
  'Negociação e contrato': 'Negoc. e prop.',
  'Follow up': 'Pós Venda',
  'Troca de Leads': 'Int. futuro',
};

/** Constrói mapa etapa (label) -> categoria do relatório */
export function buildEtapaBancoToReport(stages: PipelineStageWithMeta[]): Record<string, string> {
  const map: Record<string, string> = {};
  stages.forEach((s) => { map[s.label] = s.reportCategory; });
  return map;
}

/** Grupo compacto para exibir no funil resumido (dashboard / TV) */
export interface CompactFunilGroup {
  key: string;
  label: string;
  quente: boolean;
  reportCategory: ReportCategory;
  getVal: (porEtapa: Record<string, number>) => number;
}

/** Retorna os 4 grupos compactos para exibição, baseados nas etapas configuradas */
export function getCompactFunilGroups(stages: PipelineStageWithMeta[]): CompactFunilGroup[] {
  const byCategory = new Map<ReportCategory, string[]>();
  stages.forEach((s) => {
    const list = byCategory.get(s.reportCategory) || [];
    list.push(s.label);
    byCategory.set(s.reportCategory, list);
  });

  const order: ReportCategory[] = [
    'Qualificado',
    'Reunião agendada',
    'Negociação e contrato',
    'Troca de Leads',
  ];
  return order.map((cat) => {
    const stageLabels = byCategory.get(cat) || [];
    const isQuente = stages.some((s) => s.reportCategory === cat && s.isQuente);
    return {
      key: cat.replace(/\s/g, '-').toLowerCase(),
      label: COMPACT_GROUP_LABELS[cat] ?? cat,
      quente: isQuente,
      reportCategory: cat,
      getVal: (porEtapa: Record<string, number>) =>
        stageLabels.reduce((sum, label) => sum + (porEtapa[label] ?? 0), 0),
    };
  });
}
