/**
 * Agrega dados reais do corretor no período e mapeia para etapas do template (RealizedByStage).
 * Usa o relatório existente (reportData) e mapeia categorias → stageId.
 */

import type { FunnelTemplate, RealizedByStage } from './configTypes';
import { REPORT_CATEGORY_TO_STAGE_ID } from './defaultTemplate';
import { fetchRelatorioIndividual, type RelatorioIndividualData } from './reportData';
import { toLegacyPeriod } from './periodUtils';
import type { PeriodKey } from './configTypes';

const STAGE_ID_TO_CATEGORY: Record<string, string> = {};
Object.entries(REPORT_CATEGORY_TO_STAGE_ID).forEach(([cat, id]) => {
  STAGE_ID_TO_CATEGORY[id] = cat;
});

/**
 * Converte o relatório legado em RealizedByStage[] na ordem do template.
 */
function mapReportToRealized(report: RelatorioIndividualData, template: FunnelTemplate): RealizedByStage[] {
  const result: RealizedByStage[] = [];
  const { leadsPorEtapa } = report;

  for (const stage of template.stages) {
    const category = STAGE_ID_TO_CATEGORY[stage.id];
    const valor = category != null && leadsPorEtapa[category] != null
      ? Number(leadsPorEtapa[category])
      : 0;
    result.push({
      stageId: stage.id,
      stageNome: stage.nome,
      valor,
    });
  }

  return result;
}

/**
 * Retorna também métricas extras para a seção Rotina (tarefas, horas, interações).
 */
export interface AggregatedRealized {
  byStage: RealizedByStage[];
  tarefasConcluidas: number;
  horasEventos: number;
  interacoes: number;
  valorRealizadoR: number; // VGV realizado no período
}

/**
 * Agrega métricas do corretor no período usando o relatório existente.
 * Períodos trimestre/semestre/ano usam "mes" para a query (limitação atual).
 */
export async function aggregateMetrics(
  imobiliariaId: string,
  corretorId: string,
  corretorNome: string,
  period: PeriodKey,
  template: FunnelTemplate
): Promise<AggregatedRealized> {
  const legacyPeriod = toLegacyPeriod(period);
  const report = await fetchRelatorioIndividual(
    imobiliariaId,
    corretorId,
    corretorNome,
    legacyPeriod
  );

  const byStage = mapReportToRealized(report, template);

  return {
    byStage,
    tarefasConcluidas: report.tarefasConcluidasPeriodo?.valor ?? 0,
    horasEventos: report.totalHorasEventos?.valor ?? 0,
    interacoes: report.interacoesPeriodo?.valor ?? 0,
    valorRealizadoR: report.contribuicoesPeriodo?.valor ?? 0,
  };
}
