'use client';

import { useEffect, useState, useMemo } from 'react';
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
  respostasPresenca?: Record<string, string>;
}

export interface PlantaoTv {
  id: string;
  construtora: string;
  corretorResponsavel: string;
  horario: string;
  dataInicio: Date;
  dataFim: Date;
  observacoes?: string;
  respostasPresenca?: Record<string, string>;
}

export interface AgendaCorporativaItemTv {
  tipo: 'plantao' | 'agenda';
  id: string;
  titulo: string;
  tipoLabel: string;
  dataStr: string;
  horarioStr: string;
  startTime: number;
  fimTime: number;
  confirmados: { nome: string; photoURL?: string }[];
}

export interface CorretorStatusTv {
  id: string;
  nome: string;
  photoURL?: string;
  status: 'tarefa_atrasada' | 'tarefa_dia' | 'sem_uso_24h' | 'sem_tarefa';
}

const TIPO_AGENDA_LABEL: Record<string, string> = {
  reuniao: 'Reunião',
  evento: 'Evento',
  treinamento: 'Treinamento',
  'revisar-crm': 'Revisar CRM',
  'ligacao-ativa': 'Ligação Ativa',
  'acao-de-rua': 'Ação de rua',
  'disparo-de-msg': 'Disparo de Msg',
  outro: 'Outro',
};

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

function getTaskStatus(tasks: { dueDate: Timestamp | Date }[]): CorretorStatusTv['status'] {
  if (tasks.length === 0) return 'sem_tarefa';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const hasOverdue = tasks.some((t) => {
    const d = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return d < now;
  });
  if (hasOverdue) return 'tarefa_atrasada';
  const hasToday = tasks.some((t) => {
    const d = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === now.getTime();
  });
  return hasToday ? 'tarefa_dia' : 'sem_tarefa';
}

export function useAgendaTvData(imobiliariaId: string | undefined) {
  const [events, setEvents] = useState<AgendaEventoTv[]>([]);
  const [plantoes, setPlantoes] = useState<PlantaoTv[]>([]);
  const [corretoresList, setCorretoresList] = useState<{ id: string; nome: string; photoURL?: string }[]>([]);
  const [corretoresStatus, setCorretoresStatus] = useState<CorretorStatusTv[]>([]);
  const [loading, setLoading] = useState(!!imobiliariaId);
  const [corretoresLoading, setCorretoresLoading] = useState(false);

  useEffect(() => {
    if (!imobiliariaId) {
      setLoading(false);
      setCorretoresList([]);
      setCorretoresStatus([]);
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
            respostasPresenca: (d.respostasPresenca as Record<string, string>) || undefined,
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
            respostasPresenca: (d.respostasPresenca as Record<string, string>) || undefined,
          });
        });
        listP.sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());
        setPlantoes(listP);

        const qUsuarios = query(
          collection(db, 'usuarios'),
          where('imobiliariaId', '==', imobiliariaId),
          where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo'])
        );
        const snapUsuarios = await getDocs(qUsuarios);
        if (cancelled) return;
        const corretores = snapUsuarios.docs.map((docSnap) => {
          const data = docSnap.data();
          const lastActiveAt = data.lastActiveAt ?? data.ultimoAcesso ?? null;
          return {
            id: docSnap.id,
            nome: (data.nome as string) || (data.email as string) || '',
            photoURL: data.photoURL as string | undefined,
            lastActiveAt: lastActiveAt && typeof lastActiveAt.toDate === 'function' ? lastActiveAt : lastActiveAt,
          };
        });
        setCorretoresList(corretores.map(({ id, nome, photoURL }) => ({ id, nome, photoURL })));
        setLoading(false);

        setCorretoresLoading(true);
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const statusResults = await Promise.all(
          corretores.map(async (c) => {
            if (cancelled) return null;
            const snapLeads = await getDocs(query(collection(db, 'leads'), where('userId', '==', c.id)));
            const allTasks: { dueDate: Timestamp }[] = [];
            for (const leadDoc of snapLeads.docs) {
              const snapTasks = await getDocs(query(collection(db, 'leads', leadDoc.id, 'tarefas'), where('status', '==', 'pendente')));
              snapTasks.docs.forEach((t) => {
                const due = t.data().dueDate;
                if (due) allTasks.push({ dueDate: due as Timestamp });
              });
            }
            let status = getTaskStatus(allTasks);
            if (status === 'sem_tarefa' && c.lastActiveAt) {
              const ms = typeof c.lastActiveAt.toDate === 'function'
                ? (c.lastActiveAt as { toDate: () => Date }).toDate().getTime()
                : new Date(c.lastActiveAt as Date).getTime();
              if (Date.now() - ms > ONE_DAY_MS) status = 'sem_uso_24h';
            }
            return { id: c.id, nome: c.nome, photoURL: c.photoURL, status } as CorretorStatusTv;
          })
        );
        const statusList = statusResults.filter((r): r is CorretorStatusTv => r != null);
        if (!cancelled) setCorretoresStatus(statusList);
      } catch (e) {
        if (!cancelled) {
          setLoading(false);
          setEvents([]);
          setPlantoes([]);
          setCorretoresList([]);
          setCorretoresStatus([]);
        }
      } finally {
        if (!cancelled) setCorretoresLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [imobiliariaId]);

  const agendaCorporativaItems = useMemo(() => {
    const hojeStr = new Date().toISOString().slice(0, 10);
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().slice(0, 10);
    const mapCorretor = (uid: string) => corretoresList.find((c) => c.id === uid);
    const items: AgendaCorporativaItemTv[] = [];

    plantoes.forEach((p) => {
      const d = p.dataInicio.toISOString().slice(0, 10);
      if (d !== hojeStr && d !== amanhaStr) return;
      const [hh = 9, mm = 0] = (p.horario || '09:00').toString().trim().split(':').map(Number);
      const inicio = new Date(p.dataInicio.getFullYear(), p.dataInicio.getMonth(), p.dataInicio.getDate(), hh, mm, 0, 0);
      const startTime = inicio.getTime();
      const fimTime = startTime + 2 * 60 * 60 * 1000;
      const horario = (p.horario || '09:00').toString().substring(0, 5);
      const confirmados = (p.respostasPresenca && typeof p.respostasPresenca === 'object'
        ? Object.entries(p.respostasPresenca).filter(([, v]) => v === 'confirmado').map(([uid]) => mapCorretor(uid)).filter(Boolean) as { nome: string; photoURL?: string }[]
        : []).map((x) => ({ nome: x!.nome, photoURL: x!.photoURL }));
      items.push({
        tipo: 'plantao',
        id: p.id,
        titulo: p.construtora ? `Plantão — ${p.construtora}` : 'Plantão',
        tipoLabel: 'Plantão',
        dataStr: new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        horarioStr: horario,
        startTime,
        fimTime,
        confirmados,
      });
    });

    events.forEach((ev) => {
      const dt = ev.dataInicio.toDate();
      const dStr = dt.toISOString().slice(0, 10);
      if (dStr !== hojeStr && dStr !== amanhaStr) return;
      const startTime = dt.getTime();
      const fimEv = ev.dataFim?.toDate();
      const fimTime = fimEv ? fimEv.getTime() : startTime + 60 * 60 * 1000;
      const confirmados = (ev.respostasPresenca && typeof ev.respostasPresenca === 'object'
        ? Object.entries(ev.respostasPresenca).filter(([, v]) => v === 'confirmado').map(([uid]) => mapCorretor(uid)).filter(Boolean) as { nome: string; photoURL?: string }[]
        : []).map((x) => ({ nome: x!.nome, photoURL: x!.photoURL }));
      items.push({
        tipo: 'agenda',
        id: ev.id,
        titulo: ev.titulo || 'Evento',
        tipoLabel: TIPO_AGENDA_LABEL[ev.tipo] || ev.tipo,
        dataStr: dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        horarioStr: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        startTime,
        fimTime,
        confirmados,
      });
    });

    items.sort((a, b) => a.fimTime - b.fimTime);
    return items;
  }, [events, plantoes, corretoresList]);

  return { events, plantoes, loading, agendaCorporativaItems, corretoresStatus, corretoresStatusLoading: corretoresLoading };
}

export { startOfDay, endOfDay, startOfWeek, endOfWeek };
