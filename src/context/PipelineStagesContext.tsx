'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { PipelineStageWithMeta } from '@/lib/pipelineStagesConfig';
import {
  DEFAULT_PIPELINE_STAGES_WITH_META,
  buildEtapaBancoToReport,
  getCompactFunilGroups,
  type CompactFunilGroup,
} from '@/lib/pipelineStagesConfig';
import { mapEtapaCircuito } from '@/lib/circuito';

interface PipelineStagesContextType {
  /** Lista de nomes das etapas (labels) */
  stages: string[];
  /** Etapas com metadados (reportCategory, isQuente) */
  stagesWithMeta: PipelineStageWithMeta[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Mapa etapa (label) -> categoria do relatório */
  etapaBancoToReport: Record<string, string>;
  /** Grupos compactos para dashboard/TV (Qualif., Lig. e visita, etc.) */
  compactGroups: CompactFunilGroup[];
  /** Normaliza etapa de lead: se não estiver na lista, retorna a primeira etapa */
  normalizeEtapa: (etapa: string | undefined) => string;
}

const PipelineStagesContext = createContext<PipelineStagesContextType | null>(null);

export function PipelineStagesProvider({
  children,
  imobiliariaId, // mantido na assinatura por compatibilidade; etapas agora são fixas
}: {
  children: ReactNode;
  imobiliariaId: string | undefined;
}) {
  // O circuito do lead tem etapas FIXAS (a lógica do fluxo depende delas).
  // O doc configFunilVendas/{id} continua existindo, mas só guarda `cadencias`.
  const value = useMemo(() => {
    const stagesWithMeta = DEFAULT_PIPELINE_STAGES_WITH_META;
    const stages = stagesWithMeta.map((s) => s.label);
    const etapaBancoToReport = buildEtapaBancoToReport(stagesWithMeta);
    const compactGroups = getCompactFunilGroups(stagesWithMeta);

    return {
      stages,
      stagesWithMeta,
      loading: false,
      error: null,
      refetch: () => {},
      etapaBancoToReport,
      compactGroups,
      // Etapa legada é mapeada para o circuito; 'Fechado'/'Descartado' passam direto.
      normalizeEtapa: (etapa: string | undefined) => mapEtapaCircuito(etapa),
    };
  }, []);

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
