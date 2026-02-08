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
import { startOfDay, endOfDay } from './useAgendaTvData';

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
        let leadsSnapshot = await getDocs(
          query(leadsRef, where('imobiliariaId', '==', imobiliariaId), limit(80))
        );
        if (cancelled) return;
        if (leadsSnapshot.empty && usuariosMap.size > 0) {
          const userIds = Array.from(usuariosMap.keys()).slice(0, 10);
          leadsSnapshot = await getDocs(
            query(leadsRef, where('userId', 'in', userIds), limit(80))
          );
        }
        if (cancelled) return;

        const ligacoesList: CrmTarefaTv[] = [];
        const visitasList: CrmTarefaTv[] = [];

        const startMs = startOfDay(hoje).getTime();
        const endMs = endOfDay(hoje).getTime();

        for (const leadDoc of leadsSnapshot.docs) {
          const leadData = leadDoc.data();
          const leadNome = (leadData.nome as string) ?? 'Lead';
          const userId = (leadData.userId as string) ?? '';
          const responsavelNome = usuariosMap.get(userId) ?? '';
          const tasksRef = collection(db, 'leads', leadDoc.id, 'tarefas');
          const tasksQuery = query(
            tasksRef,
            where('status', '==', 'pendente')
          );
          const tasksSnapshot = await getDocs(tasksQuery);
          if (cancelled) return;

          tasksSnapshot.docs.forEach((taskDoc) => {
            const d = taskDoc.data();
            const type = d.type as string;
            if (type !== 'Ligação' && type !== 'Visita') return;
            const dueDate = d.dueDate instanceof Timestamp
              ? d.dueDate.toDate()
              : d.dueDate?.toDate?.() ?? new Date(0);
            const dueMs = dueDate.getTime();
            if (dueMs < startMs || dueMs > endMs) return;
            const item: CrmTarefaTv = {
              id: taskDoc.id,
              leadId: leadDoc.id,
              leadNome,
              responsavelNome,
              type: type as 'Ligação' | 'Visita',
              description: d.description,
              dueDate,
            };
            if (type === 'Ligação') ligacoesList.push(item);
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
