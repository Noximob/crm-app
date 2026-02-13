'use client';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { PipelineStageWithMeta } from './pipelineStagesConfig';
import { DEFAULT_PIPELINE_STAGES_WITH_META } from './pipelineStagesConfig';

const COLLECTION = 'configFunilVendas';

export interface ConfigFunilVendasDoc {
  stages: PipelineStageWithMeta[];
  updatedAt?: { seconds: number; nanoseconds: number };
}

/** Busca a configuração do funil da imobiliária. Se não existir, retorna null (use default). */
export async function getPipelineStagesConfig(
  imobiliariaId: string
): Promise<PipelineStageWithMeta[] | null> {
  const ref = doc(db, COLLECTION, imobiliariaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as ConfigFunilVendasDoc;
  if (!Array.isArray(data.stages) || data.stages.length === 0) return null;
  return data.stages as PipelineStageWithMeta[];
}

/** Salva a configuração do funil da imobiliária. */
export async function setPipelineStagesConfig(
  imobiliariaId: string,
  stages: PipelineStageWithMeta[]
): Promise<void> {
  const ref = doc(db, COLLECTION, imobiliariaId);
  await setDoc(ref, {
    stages,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/** Retorna as etapas a usar: config do Firestore ou padrão. */
export async function resolvePipelineStages(
  imobiliariaId: string | undefined
): Promise<PipelineStageWithMeta[]> {
  if (!imobiliariaId) return DEFAULT_PIPELINE_STAGES_WITH_META;
  const custom = await getPipelineStagesConfig(imobiliariaId);
  return custom ?? DEFAULT_PIPELINE_STAGES_WITH_META;
}
