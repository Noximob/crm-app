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

/**
 * Etapas do circuito do lead com metadados (relatório e quente).
 * As categorias antigas são mantidas como CHAVES internas (relatórios/TV
 * dependem delas); o rótulo exibido vem de COMPACT_GROUP_LABELS.
 */
export const DEFAULT_PIPELINE_STAGES_WITH_META: PipelineStageWithMeta[] = [
  { label: 'Entrada', reportCategory: 'Topo de Funil', isQuente: false },
  { label: 'Em Contato', reportCategory: 'Qualificado', isQuente: false },
  { label: 'Meet Agendado', reportCategory: 'Reunião agendada', isQuente: false },
  { label: 'Meet Feito', reportCategory: 'Reunião agendada', isQuente: true },
  { label: 'Visita Agendada', reportCategory: 'Reunião agendada', isQuente: false },
  { label: 'Visita Feita', reportCategory: 'Reunião agendada', isQuente: true },
  { label: 'Negociação', reportCategory: 'Negociação e contrato', isQuente: true },
  { label: 'Fechamento', reportCategory: 'Follow up', isQuente: false },
];

/** Labels curtos para exibição em TV / cards compactos (por categoria) */
export const COMPACT_GROUP_LABELS: Record<ReportCategory, string> = {
  'Topo de Funil': 'Entrada',
  'Qualificado': 'Em Contato',
  'Apresentação do imóvel': 'Em Contato',
  'Reunião agendada': 'Meet & Visita',
  'Negociação e contrato': 'Negociação',
  'Follow up': 'Fechamento',
  'Troca de Leads': 'Bolsão',
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
