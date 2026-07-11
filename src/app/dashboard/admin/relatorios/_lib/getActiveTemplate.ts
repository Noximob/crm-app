/**
 * Retorna o template de funil ativo para a data (config no Firestore ou default).
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FunnelTemplate } from './configTypes';
import { DEFAULT_FUNNEL_TEMPLATE } from './defaultTemplate';

const COLLECTION = 'reportConfig';

export async function getActiveTemplate(
  imobiliariaId: string,
  asOfDate: Date
): Promise<FunnelTemplate> {
  try {
    const ref = doc(db, COLLECTION, imobiliariaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return DEFAULT_FUNNEL_TEMPLATE;

    const data = snap.data();
    const template = data?.funnelTemplate as FunnelTemplate | undefined;
    const effectiveFrom = data?.effectiveFrom as string | undefined;

    if (!template?.stages?.length || !template?.stageOrder?.length) {
      return DEFAULT_FUNNEL_TEMPLATE;
    }

    const effective = effectiveFrom ? new Date(effectiveFrom) : new Date(0);
    if (asOfDate < effective) return DEFAULT_FUNNEL_TEMPLATE;

    return template;
  } catch {
    return DEFAULT_FUNNEL_TEMPLATE;
  }
}
