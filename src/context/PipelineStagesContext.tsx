'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PipelineStageWithMeta } from '@/lib/pipelineStagesConfig';
import {
  DEFAULT_PIPELINE_STAGES_WITH_META,
  buildEtapaBancoToReport,
  getCompactFunilGroups,
  type CompactFunilGroup,
} from '@/lib/pipelineStagesConfig';

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

function useStagesFromDoc(imobiliariaId: string | undefined) {
  const [stagesWithMeta, setStagesWithMeta] = useState<PipelineStageWithMeta[]>(DEFAULT_PIPELINE_STAGES_WITH_META);
  const [loading, setLoading] = useState(!!imobiliariaId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imobiliariaId) {
      setStagesWithMeta(DEFAULT_PIPELINE_STAGES_WITH_META);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, 'configFunilVendas', imobiliariaId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setStagesWithMeta(DEFAULT_PIPELINE_STAGES_WITH_META);
        } else {
          const data = snap.data();
          const stages = data?.stages;
          if (Array.isArray(stages) && stages.length > 0) {
            setStagesWithMeta(stages as PipelineStageWithMeta[]);
          } else {
            setStagesWithMeta(DEFAULT_PIPELINE_STAGES_WITH_META);
          }
        }
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Erro ao carregar funil');
        setStagesWithMeta(DEFAULT_PIPELINE_STAGES_WITH_META);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [imobiliariaId]);

  return { stagesWithMeta, loading, error };
}

export function PipelineStagesProvider({
  children,
  imobiliariaId,
}: {
  children: ReactNode;
  imobiliariaId: string | undefined;
}) {
  const { stagesWithMeta, loading, error } = useStagesFromDoc(imobiliariaId);

  const value = useMemo(() => {
    const stages = stagesWithMeta.map((s) => s.label);
    const etapaBancoToReport = buildEtapaBancoToReport(stagesWithMeta);
    const compactGroups = getCompactFunilGroups(stagesWithMeta);
    const setStages = new Set(stages);
    const firstStage = stages[0] ?? '';

    return {
      stages,
      stagesWithMeta,
      loading,
      error,
      refetch: () => {},
      etapaBancoToReport,
      compactGroups,
      normalizeEtapa: (etapa: string | undefined) =>
        etapa && setStages.has(etapa) ? etapa : firstStage,
    };
  }, [stagesWithMeta, loading, error]);

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
