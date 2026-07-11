/**
 * Motor do funil invertido + GAP + prioridades de foco.
 * Tudo baseado na config (sem hardcode de etapas).
 */

import type {
  FunnelTemplate,
  NecessaryByStage,
  RealizedByStage,
  GapByStage,
  FocusPriority,
  PeriodBounds,
} from './configTypes';

/**
 * Calcula o "necessário" por etapa a partir da meta em R$ (funil invertido).
 * Ordem: do fundo (venda) para o topo; usa conversão e ticket médio da config.
 */
export function computeInvertedFunnel(
  metaR: number,
  template: FunnelTemplate,
  periodBounds: PeriodBounds,
  paceMode: boolean
): NecessaryByStage[] {
  const { stages, rules, stageOrder } = template;
  if (!stageOrder?.length || !rules) return [];

  const ticketMedio = rules.ticketMedio ?? 0;
  if (ticketMedio <= 0 && metaR > 0) {
    // Sem ticket médio: retorna meta em R$ só na última etapa e zeros nas outras
    const lastId = stageOrder[stageOrder.length - 1];
    const lastStage = stages.find((s) => s.id === lastId);
    return [
      {
        stageId: lastId,
        stageNome: lastStage?.nome ?? lastId,
        valor: 0,
        valorR: metaR,
      },
    ];
  }

  // Quantidade necessária na última etapa (vendas) no período
  const lastId = stageOrder[stageOrder.length - 1];
  let necessaryUnits = metaR > 0 && ticketMedio > 0 ? metaR / ticketMedio : 0;

  if (paceMode && periodBounds.progressPct != null && periodBounds.progressPct > 0) {
    necessaryUnits = necessaryUnits * periodBounds.progressPct;
  }

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const result: NecessaryByStage[] = [];
  let currentNecessary = necessaryUnits;

  // De trás pra frente
  for (let i = stageOrder.length - 1; i >= 0; i--) {
    const stageId = stageOrder[i];
    const stage = stageById.get(stageId);
    const nome = stage?.nome ?? stageId;
    const isLast = i === stageOrder.length - 1;
    const valorR = isLast && ticketMedio > 0 ? currentNecessary * ticketMedio : undefined;
    result.unshift({
      stageId,
      stageNome: nome,
      valor: Math.round(currentNecessary * 100) / 100,
      valorR,
    });
    if (i === 0) break;
    const nextId = stageOrder[i - 1];
    const nextStage = stageById.get(nextId);
    const conversao = nextStage?.conversaoParaProximo;
    if (conversao != null && conversao > 0 && conversao <= 1) {
      currentNecessary = currentNecessary / conversao;
    } else {
      currentNecessary = currentNecessary; // mantém (sem regra = 1:1)
    }
  }

  return result;
}

/**
 * Compara necessário vs realizado e gera GAP por etapa.
 */
export function computeGaps(
  necessary: NecessaryByStage[],
  realized: RealizedByStage[],
  template: FunnelTemplate
): GapByStage[] {
  const realizedById = new Map(realized.map((r) => [r.stageId, r]));
  const stageById = new Map(template.stages.map((s) => [s.id, s]));

  return necessary.map((n) => {
    const real = realizedById.get(n.stageId);
    const realizado = real?.valor ?? 0;
    const necessario = n.valor;
    const gapAbs = realizado - necessario;
    const gapPct =
      necessario > 0 ? Math.round((realizado / necessario) * 1000) / 1000 : null;
    const peso = stageById.get(n.stageId)?.pesoDiagnostico;
    return {
      stageId: n.stageId,
      stageNome: n.stageNome,
      necessario,
      realizado,
      gapAbs,
      gapPct,
      peso,
    };
  });
}

/**
 * Escolhe até max prioridades (gargalos) com base nos maiores GAPs.
 * Considera peso quando existir.
 */
export function getFocusPriorities(
  gaps: GapByStage[],
  max: number = 3
): FocusPriority[] {
  const withGap = gaps.filter((g) => g.necessario > 0);
  const scored = withGap.map((g) => {
    const gapAbs = g.gapAbs;
    const peso = g.peso ?? 1;
    const score = gapAbs < 0 ? Math.abs(gapAbs) * peso : 0;
    return { ...g, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((g) => ({
    stageId: g.stageId,
    stageNome: g.stageNome,
    mensagem:
      g.gapAbs >= 0
        ? `${g.stageNome}: no alvo ou acima.`
        : `${g.stageNome}: abaixo do necessário (${g.realizado.toFixed(0)} / ${g.necessario.toFixed(0)}).`,
    gapAbs: g.gapAbs,
    gapPct: g.gapPct,
  }));
}
