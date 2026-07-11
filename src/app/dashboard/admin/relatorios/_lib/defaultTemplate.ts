/**
 * Template padrão do funil (média de mercado).
 * Usado quando não existe config no Firestore ou como fallback.
 */

import type { FunnelTemplate, MetricDefinition } from './configTypes';

/** Ordem do funil para CÁLCULO invertido: última = etapa que gera R$ (negociacao). follow_up e troca_leads entram só no realizado. */
export const DEFAULT_STAGE_ORDER = [
  'topo_funil',
  'qualificado',
  'apresentacao',
  'reuniao_agendada',
  'negociacao',
] as const;

export const ALL_STAGE_IDS = [
  ...DEFAULT_STAGE_ORDER,
  'follow_up',
  'troca_leads',
] as const;

export const DEFAULT_FUNNEL_TEMPLATE: FunnelTemplate = {
  id: 'default',
  nome: 'Funil padrão (média de mercado)',
  versao: '1',
  effectiveFrom: '2020-01-01',
  stageOrder: [...DEFAULT_STAGE_ORDER],
  stages: [
    { id: 'topo_funil', nome: 'Topo de Funil', tipo: 'stage', conversaoParaProximo: 0.15, pesoDiagnostico: 1 },
    { id: 'qualificado', nome: 'Qualificado', tipo: 'stage', conversaoParaProximo: 0.25, pesoDiagnostico: 1.2 },
    { id: 'apresentacao', nome: 'Apresentação do imóvel', tipo: 'stage', conversaoParaProximo: 0.3, pesoDiagnostico: 1.1 },
    { id: 'reuniao_agendada', nome: 'Reunião agendada', tipo: 'stage', conversaoParaProximo: 0.35, pesoDiagnostico: 1.2 },
    { id: 'negociacao', nome: 'Negociação e contrato', tipo: 'stage', conversaoParaProximo: 0.4, pesoDiagnostico: 1.3 },
    { id: 'follow_up', nome: 'Follow up', tipo: 'stage', conversaoParaProximo: 0.5, pesoDiagnostico: 1 },
    { id: 'troca_leads', nome: 'Troca de Leads', tipo: 'stage', conversaoParaProximo: 0.5, pesoDiagnostico: 0.8 },
  ],
  rules: {
    ticketMedio: 400_000,
  },
};

/** Mapeamento: categoria do relatório antigo (REPORT_FUNIL_ETAPAS) → stageId do template */
export const REPORT_CATEGORY_TO_STAGE_ID: Record<string, string> = {
  'Topo de Funil': 'topo_funil',
  'Qualificado': 'qualificado',
  'Apresentação do imóvel': 'apresentacao',
  'Reunião agendada': 'reuniao_agendada',
  'Negociação e contrato': 'negociacao',
  'Follow up': 'follow_up',
  'Troca de Leads': 'troca_leads',
};

/** Métricas padrão (categorias do relatório) */
export const DEFAULT_METRIC_DEFINITIONS: MetricDefinition[] = [
  { id: 'topo_funil', nome: 'Topo de Funil', categoria: 'funil', unidade: 'count', ativo: true, ordem: 1, tipo: 'count' },
  { id: 'qualificado', nome: 'Qualificado', categoria: 'funil', unidade: 'count', ativo: true, ordem: 2, tipo: 'count' },
  { id: 'apresentacao', nome: 'Apresentação do imóvel', categoria: 'funil', unidade: 'count', ativo: true, ordem: 3, tipo: 'count' },
  { id: 'reuniao_agendada', nome: 'Reunião agendada', categoria: 'funil', unidade: 'count', ativo: true, ordem: 4, tipo: 'count' },
  { id: 'negociacao', nome: 'Negociação e contrato', categoria: 'funil', unidade: 'count', ativo: true, ordem: 5, tipo: 'count' },
  { id: 'follow_up', nome: 'Follow up', categoria: 'funil', unidade: 'count', ativo: true, ordem: 6, tipo: 'count' },
  { id: 'troca_leads', nome: 'Troca de Leads', categoria: 'funil', unidade: 'count', ativo: true, ordem: 7, tipo: 'count' },
  { id: 'tarefas_concluidas', nome: 'Tarefas concluídas', categoria: 'tarefas', unidade: 'count', ativo: true, ordem: 10, tipo: 'count' },
  { id: 'horas_eventos', nome: 'Horas em eventos', categoria: 'eventos_internos', unidade: 'duration', ativo: true, ordem: 11, tipo: 'duration' },
  { id: 'interacoes', nome: 'Interações', categoria: 'uso_crm', unidade: 'count', ativo: true, ordem: 12, tipo: 'count' },
];
