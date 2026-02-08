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
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    const sec = o.seconds ?? o._seconds;
    if (typeof sec === 'number') return new Date(sec * 1000);
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function normalizarTipo(type: string): string {
  return (type || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function isLigacao(type: string): boolean {
  const t = normalizarTipo(type);
  return t === 'ligacao' || t.startsWith('ligac');
}
function isVisita(type: string): boolean {
  const t = normalizarTipo(type);
  return t === 'visita';
}

function isHoje(dueDate: Date, hojeStr: string, hojeStrUTC: string): boolean {
  const dueStr = dueDate.getFullYear() + '-' + String(dueDate.getMonth() + 1).padStart(2, '0') + '-' + String(dueDate.getDate()).padStart(2, '0');
  const dueStrUTC = dueDate.getUTCFullYear() + '-' + String(dueDate.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dueDate.getUTCDate()).padStart(2, '0');
  return dueStr === hojeStr || dueStrUTC === hojeStrUTC;
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
    const hojeStr = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
    const hojeStrUTC = hoje.getUTCFullYear() + '-' + String(hoje.getUTCMonth() + 1).padStart(2, '0') + '-' + String(hoje.getUTCDate()).padStart(2, '0');

    (async () => {
      try {
        const usuariosRef = collection(db, 'usuarios');
        const usuariosSnapshot = await getDocs(
          query(usuariosRef, where('imobiliariaId', '==', imobiliariaId))
        );
        if (cancelled) return;
        const usuariosMap = new Map<string, string>();
        const userIdsList = new Array<string>();
        usuariosSnapshot.docs.forEach((docSnap) => {
          const nome = (docSnap.data().nome as string) ?? '';
          if (nome) usuariosMap.set(docSnap.id, nome);
          userIdsList.push(docSnap.id);
        });

        const leadsRef = collection(db, 'leads');
        const leadIdsSeen = new Set<string>();
        const leadDocs: { id: string; data: Record<string, unknown> }[] = [];

        const snapImob = await getDocs(
          query(leadsRef, where('imobiliariaId', '==', imobiliariaId), limit(1000))
        );
        if (cancelled) return;
        snapImob.docs.forEach((docSnap) => {
          if (!leadIdsSeen.has(docSnap.id)) {
            leadIdsSeen.add(docSnap.id);
            leadDocs.push({ id: docSnap.id, data: docSnap.data() });
          }
        });

        for (let i = 0; i < userIdsList.length; i += 10) {
          const chunk = userIdsList.slice(i, i + 10);
          const snapUser = await getDocs(
            query(leadsRef, where('userId', 'in', chunk), limit(1000))
          );
          if (cancelled) return;
          snapUser.docs.forEach((docSnap) => {
            if (!leadIdsSeen.has(docSnap.id)) {
              leadIdsSeen.add(docSnap.id);
              leadDocs.push({ id: docSnap.id, data: docSnap.data() });
            }
          });
        }

        const ligacoesList: CrmTarefaTv[] = [];
        const visitasList: CrmTarefaTv[] = [];

        for (const { id: leadId, data: leadData } of leadDocs) {
          const leadNome = (leadData.nome as string) ?? 'Lead';
          const userId = (leadData.userId as string) ?? '';
          const responsavelNome = usuariosMap.get(userId) ?? '';
          const tasksRef = collection(db, 'leads', leadId, 'tarefas');
          const tasksSnapshot = await getDocs(
            query(tasksRef, where('status', '==', 'pendente'))
          );
          if (cancelled) return;

          tasksSnapshot.docs.forEach((taskDoc) => {
            const d = taskDoc.data() as Record<string, unknown>;
            const typeRaw = String(d.type ?? d.tipo ?? '').trim();
            if (!isLigacao(typeRaw) && !isVisita(typeRaw)) return;
            const dueDate = parseDueDate(d.dueDate);
            if (!isHoje(dueDate, hojeStr, hojeStrUTC)) return;
            const item: CrmTarefaTv = {
              id: taskDoc.id,
              leadId,
              leadNome,
              responsavelNome,
              type: isLigacao(typeRaw) ? 'Ligação' : 'Visita',
              description: d.description as string | undefined,
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
      } catch {
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
