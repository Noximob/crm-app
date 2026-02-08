'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';

function parseDueDate(v: unknown): Date {
  if (!v) return new Date(0);
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'object' && v !== null && 'seconds' in v) {
    const s = (v as { seconds: number }).seconds;
    return new Date(typeof s === 'number' ? s * 1000 : 0);
  }
  return new Date(0);
}

function isLigacao(type: string): boolean {
  const t = (type || '').trim().toLowerCase();
  return t === 'ligação' || t === 'ligacao';
}
function isVisita(type: string): boolean {
  return (type || '').trim().toLowerCase() === 'visita';
}

export interface CrmTarefaTv {
  id: string;
  leadId: string;
  leadNome: string;
  responsavelNome: string;
  type: 'Ligação' | 'Visita';
  description?: string;
  dueDate: Date;
}

export function useCrmAgendaTvData(imobiliariaId: string | undefined) {
  const [ligacoes, setLigacoes] = useState<CrmTarefaTv[]>([]);
  const [visitas, setVisitas] = useState<CrmTarefaTv[]>([]);
  const [loading, setLoading] = useState(!!imobiliariaId);

  useEffect(() => {
    if (!imobiliariaId) {
      setLigacoes([]);
      setVisitas([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const hoje = new Date();

    (async () => {
      try {
        const usuariosRef = collection(db, 'usuarios');
        const usuariosQuery = query(
          usuariosRef,
          where('imobiliariaId', '==', imobiliariaId)
        );
        const usuariosSnapshot = await getDocs(usuariosQuery);
        if (cancelled) return;
        const usuariosMap = new Map<string, string>();
        usuariosSnapshot.docs.forEach((docSnap) => {
          const nome = (docSnap.data().nome as string) ?? '';
          if (nome) usuariosMap.set(docSnap.id, nome);
        });

        const leadsRef = collection(db, 'leads');
        const leadIdsSeen = new Set<string>();
        const leadDocs: { id: string; data: Record<string, unknown> }[] = [];

        const snapImob = await getDocs(
          query(leadsRef, where('imobiliariaId', '==', imobiliariaId), limit(200))
        );
        if (cancelled) return;
        snapImob.docs.forEach((docSnap) => {
          if (!leadIdsSeen.has(docSnap.id)) {
            leadIdsSeen.add(docSnap.id);
            leadDocs.push({ id: docSnap.id, data: docSnap.data() });
          }
        });

        const userIds = Array.from(usuariosMap.keys());
        for (let i = 0; i < userIds.length; i += 10) {
          const chunk = userIds.slice(i, i + 10);
          const snapUser = await getDocs(
            query(leadsRef, where('userId', 'in', chunk), limit(200))
          );
          if (cancelled) return;
          snapUser.docs.forEach((docSnap) => {
            if (!leadIdsSeen.has(docSnap.id)) {
              leadIdsSeen.add(docSnap.id);
              leadDocs.push({ id: docSnap.id, data: docSnap.data() });
            }
          });
        }

        const hojeStr = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
        const hojeStrUTC = hoje.getUTCFullYear() + '-' + String(hoje.getUTCMonth() + 1).padStart(2, '0') + '-' + String(hoje.getUTCDate()).padStart(2, '0');
        const ligacoesList: CrmTarefaTv[] = [];
        const visitasList: CrmTarefaTv[] = [];

        for (const { id: leadId, data: leadData } of leadDocs) {
          const leadNome = (leadData.nome as string) ?? 'Lead';
          const userId = (leadData.userId as string) ?? '';
          const responsavelNome = usuariosMap.get(userId) ?? '';
          const tasksRef = collection(db, 'leads', leadId, 'tarefas');
          const tasksQuery = query(
            tasksRef,
            where('status', '==', 'pendente')
          );
          const tasksSnapshot = await getDocs(tasksQuery);
          if (cancelled) return;

          tasksSnapshot.docs.forEach((taskDoc) => {
            const d = taskDoc.data();
            const typeRaw = (d.type as string) ?? '';
            if (!isLigacao(typeRaw) && !isVisita(typeRaw)) return;
            const dueDate = parseDueDate(d.dueDate);
            const dueStr = dueDate.getFullYear() + '-' + String(dueDate.getMonth() + 1).padStart(2, '0') + '-' + String(dueDate.getDate()).padStart(2, '0');
            const dueStrUTC = dueDate.getUTCFullYear() + '-' + String(dueDate.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dueDate.getUTCDate()).padStart(2, '0');
            if (dueStr !== hojeStr && dueStrUTC !== hojeStrUTC) return;
            const item: CrmTarefaTv = {
              id: taskDoc.id,
              leadId,
              leadNome,
              responsavelNome,
              type: isLigacao(typeRaw) ? 'Ligação' : 'Visita',
              description: d.description,
              dueDate,
            };
            if (isLigacao(typeRaw)) ligacoesList.push(item);
            else visitasList.push(item);
          });
        }

        ligacoesList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        visitasList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

        if (!cancelled) {
          setLigacoes(ligacoesList);
          setVisitas(visitasList);
        }
      } catch (e) {
        if (!cancelled) {
          setLigacoes([]);
          setVisitas([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [imobiliariaId]);

  return { ligacoes, visitas, loading };
}
