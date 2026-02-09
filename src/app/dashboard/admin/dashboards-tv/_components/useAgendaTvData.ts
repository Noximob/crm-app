'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

export interface AgendaEventoTv {
  id: string;
  titulo: string;
  tipo: string;
  local?: string;
  responsavel?: string;
  dataInicio: Timestamp;
  dataFim?: Timestamp;
}

export interface PlantaoTv {
  id: string;
  construtora: string;
  corretorResponsavel: string;
  horario: string;
  dataInicio: Date;
  dataFim: Date;
  observacoes?: string;
}

/** Início do dia em UTC (meia-noite local seria timezone-dependent; usamos date como YYYY-MM-DD para comparação) */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Fim do dia (23:59:59.999) */
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Início da semana (domingo 00:00) */
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
}

/** Fim da semana (sábado 23:59:59) */
function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6, 23, 59, 59, 999);
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  const d = new Date(typeof v === 'string' ? v : String(v));
  return isNaN(d.getTime()) ? null : d;
}

export function useAgendaTvData(imobiliariaId: string | undefined) {
  const [events, setEvents] = useState<AgendaEventoTv[]>([]);
  const [plantoes, setPlantoes] = useState<PlantaoTv[]>([]);
  const [loading, setLoading] = useState(!!imobiliariaId);

  useEffect(() => {
    if (!imobiliariaId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const start = startOfDay(new Date());
    const end = endOfWeek(new Date());
    (async () => {
      try {
        const refAgenda = collection(db, 'agendaImobiliaria');
        const qAgenda = query(refAgenda, where('imobiliariaId', '==', imobiliariaId));
        const snapAgenda = await getDocs(qAgenda);
        if (cancelled) return;
        const list: AgendaEventoTv[] = [];
        snapAgenda.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const dataInicio = d.dataInicio as Timestamp | undefined;
          if (!dataInicio) return;
          const inicioDate = dataInicio.toDate();
          if (inicioDate > end) return;
          const dataFim = d.dataFim as Timestamp | undefined;
          const fimDate = dataFim?.toDate();
          if (fimDate && fimDate < start) return;
          list.push({
            id: docSnap.id,
            titulo: d.titulo ?? '',
            tipo: d.tipo ?? 'outro',
            local: d.local,
            responsavel: d.responsavel,
            dataInicio,
            dataFim,
          });
        });
        list.sort((a, b) => a.dataInicio.toMillis() - b.dataInicio.toMillis());
        setEvents(list);

        const refPlantoes = collection(db, 'plantoes');
        const qPlantoes = query(refPlantoes, where('imobiliariaId', '==', imobiliariaId));
        const snapPlantoes = await getDocs(qPlantoes);
        if (cancelled) return;
        const listP: PlantaoTv[] = [];
        snapPlantoes.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const di = parseDate(d.dataInicio);
          const df = parseDate(d.dataFim);
          if (!di || !df || df < start || di > end) return;
          listP.push({
            id: docSnap.id,
            construtora: d.construtora ?? '',
            corretorResponsavel: d.corretorResponsavel ?? '',
            horario: d.horario ?? '09:00',
            dataInicio: di,
            dataFim: df,
            observacoes: d.observacoes,
          });
        });
        listP.sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());
        setPlantoes(listP);
      } catch (e) {
        if (!cancelled) {
          setEvents([]);
          setPlantoes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [imobiliariaId]);

  return { events, plantoes, loading };
}

export { startOfDay, endOfDay, startOfWeek, endOfWeek };
