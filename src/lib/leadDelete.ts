/**
 * Exclusão DEFINITIVA de leads com as subcoleções (tarefas + interactions).
 * Compartilhado entre Gestão de Corretores e o Bolsão do CRM (Importar Leads).
 * Empacota grupos inteiros em lotes de até 400 operações (limite do Firestore
 * é 500 por batch); um grupo sozinho maior que 400 ainda é dividido.
 */
import { collection, doc, getDocs, writeBatch, type DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function deleteLeadsComSubcolecoes(leadIds: string[]): Promise<void> {
  const grupos: DocumentReference[][] = [];
  for (const leadId of leadIds) {
    const grupo: DocumentReference[] = [];
    for (const sub of ['tarefas', 'interactions']) {
      const snap = await getDocs(collection(db, 'leads', leadId, sub));
      snap.forEach(d => grupo.push(d.ref));
    }
    grupo.push(doc(db, 'leads', leadId));
    grupos.push(grupo);
  }

  const lotes: DocumentReference[][] = [];
  let lote: DocumentReference[] = [];
  for (const grupo of grupos) {
    if (lote.length > 0 && lote.length + grupo.length > 400) {
      lotes.push(lote);
      lote = [];
    }
    if (grupo.length > 400) {
      for (let i = 0; i < grupo.length; i += 400) lotes.push(grupo.slice(i, i + 400));
    } else {
      lote.push(...grupo);
    }
  }
  if (lote.length > 0) lotes.push(lote);

  for (const refs of lotes) {
    const batch = writeBatch(db);
    refs.forEach(r => batch.delete(r));
    await batch.commit();
  }
}
