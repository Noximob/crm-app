'use client';

/**
 * O contexto do pipeline — duas réguas, uma por cima da outra:
 *
 *   stages   as 8 CASAS do circuito (o que se grava em lead.etapa). É o motor:
 *            catraca, pop-ups, relatórios com meet × visita separados.
 *   fases    as 6 FASES que a casa enxerga (o funil do gestor). É o que vira
 *            coluna do quadro, chip de filtro, barra do pipeline e TV.
 *
 * Toda tela de gente usa `fases` + `faseDe(etapa)`. Só o motor e os
 * relatórios olham `stages`.
 */
import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { DEFAULT_PIPELINE_STAGES } from '@/lib/pipelineStagesConfig';
import { mapEtapaCircuito } from '@/lib/circuito';
import { FASES, FASES_ROTULOS, rotuloDaFase, faseDaEtapa, type FaseFunil } from '@/lib/funilVendas';

interface PipelineStagesContextType {
  /** As casas do circuito (labels), na ordem. */
  stages: string[];
  /** As 6 fases do funil, com metadados (cor, descrição, casas). */
  fases: readonly FaseFunil[];
  /** Os rótulos das 6 fases — colunas, chips, filtros. */
  fasesRotulos: readonly string[];
  /** A fase (rótulo) de uma etapa qualquer — legada, atual, o que for. */
  faseDe: (etapa: string | undefined | null) => string;
  /** A fase (objeto) de uma etapa; null pra Descartado. */
  faseObj: (etapa: string | undefined | null) => FaseFunil | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Normaliza etapa de lead: legada → casa do circuito; 'Fechamento'/'Descartado' passam direto. */
  normalizeEtapa: (etapa: string | undefined) => string;
}

const PipelineStagesContext = createContext<PipelineStagesContextType | null>(null);

export function PipelineStagesProvider({
  children,
}: {
  children: ReactNode;
  /** mantido na assinatura por compatibilidade; as etapas são fixas */
  imobiliariaId?: string | undefined;
}) {
  const value = useMemo<PipelineStagesContextType>(() => ({
    stages: [...DEFAULT_PIPELINE_STAGES],
    fases: FASES,
    fasesRotulos: FASES_ROTULOS,
    faseDe: (etapa) => rotuloDaFase(mapEtapaCircuito(etapa)),
    faseObj: (etapa) => faseDaEtapa(mapEtapaCircuito(etapa)),
    loading: false,
    error: null,
    refetch: () => {},
    normalizeEtapa: (etapa) => mapEtapaCircuito(etapa),
  }), []);

  return (
    <PipelineStagesContext.Provider value={value}>
      {children}
    </PipelineStagesContext.Provider>
  );
}

export function usePipelineStages(): PipelineStagesContextType {
  const ctx = useContext(PipelineStagesContext);
  if (ctx === null) {
    throw new Error('usePipelineStages must be used within PipelineStagesProvider');
  }
  return ctx;
}

/** Retorna o context ou null (para uso em componentes que podem estar fora do Provider) */
export function usePipelineStagesOptional(): PipelineStagesContextType | null {
  return useContext(PipelineStagesContext);
}
