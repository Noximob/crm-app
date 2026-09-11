/**
 * A conversão esperada do funil, guardada no Firestore.
 *
 * Mora no MESMO doc das cadências (configFunilVendas/{imobiliariaId}), no
 * campo `conversaoEsperada` — merge, sem mexer no resto. Separado de
 * funilVendas.ts pra aquele continuar puro (testável sem Firebase).
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CONVERSAO_PADRAO, normalizarConversao, type ConversaoEsperada } from '@/lib/funilVendas';

/** Sempre resolve — sem doc, sem campo ou com erro, devolve o padrão. */
export async function carregarConversaoEsperada(imobiliariaId: string | undefined): Promise<ConversaoEsperada> {
  if (!imobiliariaId || imobiliariaId === 'espelho-demo') return CONVERSAO_PADRAO;
  try {
    const snap = await getDoc(doc(db, 'configFunilVendas', imobiliariaId));
    return normalizarConversao(snap.exists() ? (snap.data() as { conversaoEsperada?: unknown }).conversaoEsperada : null);
  } catch {
    return CONVERSAO_PADRAO;
  }
}

export async function salvarConversaoEsperada(imobiliariaId: string, conv: ConversaoEsperada): Promise<void> {
  await setDoc(
    doc(db, 'configFunilVendas', imobiliariaId),
    { conversaoEsperada: normalizarConversao(conv), conversaoAtualizadaEm: serverTimestamp() },
    { merge: true },
  );
}
