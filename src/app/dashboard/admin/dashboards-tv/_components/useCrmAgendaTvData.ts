'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  collectionGroup,
  getDocs,
  getDoc,
  doc,
  query,
  where,
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
        const userIdsSet = new Set<string>();
        usuariosSnapshot.docs.forEach((docSnap) => {
          const nome = (docSnap.data().nome as string) ?? '';
          if (nome) usuariosMap.set(docSnap.id, nome);
          userIdsSet.add(docSnap.id);
        });

        const tarefasRef = collectionGroup(db, 'tarefas');
        const tarefasSnapshot = await getDocs(
          query(tarefasRef, where('status', '==', 'pendente'))
        );
        if (cancelled) return;

        const leadIds = new Set<string>();
        tarefasSnapshot.docs.forEach((taskDoc) => {
          const path = taskDoc.ref.path;
          const parts = path.split('/');
          if (parts.length >= 2) leadIds.add(parts[1]);
        });

        const leadMap = new Map<string, { nome: string; userId: string; imobiliariaId: string }>();
        await Promise.all(
          Array.from(leadIds).map(async (leadId) => {
            const leadRef = doc(db, 'leads', leadId);
            const leadSnap = await getDoc(leadRef);
            if (cancelled) return;
            if (!leadSnap.exists()) return;
            const d = leadSnap.data();
            leadMap.set(leadId, {
              nome: (d.nome as string) ?? 'Lead',
              userId: (d.userId as string) ?? '',
              imobiliariaId: (d.imobiliariaId as string) ?? '',
            });
          })
        );
        if (cancelled) return;

        const ligacoesList: CrmTarefaTv[] = [];
        const visitasList: CrmTarefaTv[] = [];

        tarefasSnapshot.docs.forEach((taskDoc) => {
          const path = taskDoc.ref.path;
          const parts = path.split('/');
          const leadId = parts.length >= 2 ? parts[1] : '';
          const leadInfo = leadMap.get(leadId);
          if (!leadInfo) return;
          const pertenceImobiliaria = leadInfo.imobiliariaId === imobiliariaId || userIdsSet.has(leadInfo.userId);
          if (!pertenceImobiliaria) return;

          const d = taskDoc.data();
          const typeRaw = (d.type as string) ?? '';
          if (!isLigacao(typeRaw) && !isVisita(typeRaw)) return;

          const dueDate = parseDueDate(d.dueDate);
          const dueStr = dueDate.getFullYear() + '-' + String(dueDate.getMonth() + 1).padStart(2, '0') + '-' + String(dueDate.getDate()).padStart(2, '0');
          const dueStrUTC = dueDate.getUTCFullYear() + '-' + String(dueDate.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dueDate.getUTCDate()).padStart(2, '0');
          if (dueStr !== hojeStr && dueStrUTC !== hojeStrUTC) return;

          const responsavelNome = usuariosMap.get(leadInfo.userId) ?? '';
          const item: CrmTarefaTv = {
            id: taskDoc.id,
            leadId,
            leadNome: leadInfo.nome,
            responsavelNome,
            type: isLigacao(typeRaw) ? 'Ligação' : 'Visita',
            description: d.description,
            dueDate,
          };
          if (isLigacao(typeRaw)) ligacoesList.push(item);
          else visitasList.push(item);
        });

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
