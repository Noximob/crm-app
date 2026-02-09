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
  /** Para agenda: tipo do evento (reuniao, evento, etc.) para ícone */
  tipoEvento?: string;
  dataStr: string;
  horarioStr: string;
  /** Timestamp de fim do evento (para esconder quando passar do horário) */
  fimTime: number;
  confirmados: { nome: string; photoURL?: string }[];
}

export interface CorretorStatusTv {
  id: string;
  nome: string;
  photoURL?: string;
  status: 'tarefa_atrasada' | 'tarefa_dia' | 'sem_tarefa';
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

/** Status de tarefas do CRM (igual ao dashboard) */
function getTaskStatusInfo(tasks: { dueDate: Timestamp | Date }[]): 'tarefa_atrasada' | 'tarefa_dia' | 'sem_tarefa' {
  if (tasks.length === 0) return 'sem_tarefa';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const hasOverdue = tasks.some((task) => {
    const dueDate = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < now;
  });
  if (hasOverdue) return 'tarefa_atrasada';
  const hasToday = tasks.some((task) => {
    const dueDate = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === now.getTime();
  });
  if (hasToday) return 'tarefa_dia';
  return 'sem_tarefa';
}

export function useAgendaTvData(imobiliariaId: string | undefined) {
  const [events, setEvents] = useState<AgendaEventoTv[]>([]);
  const [plantoes, setPlantoes] = useState<PlantaoTv[]>([]);
  const [corretoresList, setCorretoresList] = useState<{ id: string; nome: string; photoURL?: string }[]>([]);
  const [corretoresStatus, setCorretoresStatus] = useState<CorretorStatusTv[]>([]);
  const [loading, setLoading] = useState(!!imobiliariaId);
  const [corretoresStatusLoading, setCorretoresStatusLoading] = useState(false);

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

        const refUsuarios = collection(db, 'usuarios');
        const qUsuarios = query(
          refUsuarios,
          where('imobiliariaId', '==', imobiliariaId),
          where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo'])
        );
        const snapUsuarios = await getDocs(qUsuarios);
        if (cancelled) return;
        const corretores = snapUsuarios.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nome: (data.nome as string) || (data.email as string) || '',
            photoURL: data.photoURL as string | undefined,
          };
        });
        setCorretoresList(corretores);

        setCorretoresStatusLoading(true);
        const statusList: CorretorStatusTv[] = [];
        for (const c of corretores) {
          if (cancelled) break;
          const leadsRef = collection(db, 'leads');
          const qLeads = query(leadsRef, where('userId', '==', c.id));
          const snapLeads = await getDocs(qLeads);
          let status: CorretorStatusTv['status'] = 'sem_tarefa';
          for (const leadDoc of snapLeads.docs) {
            const tasksRef = collection(db, 'leads', leadDoc.id, 'tarefas');
            const qTasks = query(tasksRef, where('status', '==', 'pendente'));
            const snapTasks = await getDocs(qTasks);
            const tasks = snapTasks.docs.map((t) => ({ dueDate: t.data().dueDate as Timestamp }));
            const s = getTaskStatusInfo(tasks);
            if (s === 'tarefa_atrasada') {
              status = 'tarefa_atrasada';
              break;
            }
            if (s === 'tarefa_dia') status = 'tarefa_dia';
          }
          statusList.push({ id: c.id, nome: c.nome, photoURL: c.photoURL, status });
        }
        if (!cancelled) {
          setCorretoresStatus(statusList);
        }
      } catch (e) {
        if (!cancelled) {
          setEvents([]);
          setPlantoes([]);
          setCorretoresList([]);
          setCorretoresStatus([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCorretoresStatusLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [imobiliariaId]);

  const agendaCorporativaItems = useMemo(() => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().slice(0, 10);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().slice(0, 10);
    const mapCorretor = (uid: string) => corretoresList.find((c) => c.id === uid);
    const items: AgendaCorporativaItemTv[] = [];

    plantoes.forEach((p) => {
      const d = p.dataInicio.toISOString().slice(0, 10);
      if (d !== hojeStr && d !== amanhaStr) return;
      const [hh = 9, mm = 0] = (p.horario || '09:00').toString().trim().split(':').map(Number);
      const inicioDate = new Date(p.dataInicio.getFullYear(), p.dataInicio.getMonth(), p.dataInicio.getDate(), hh, mm, 0, 0);
      const fimDate = new Date(inicioDate.getTime() + 2 * 60 * 60 * 1000);
      const horario = (p.horario || '00:00').toString().substring(0, 5);
      const confirmados = (
        p.respostasPresenca && typeof p.respostasPresenca === 'object'
          ? Object.entries(p.respostasPresenca)
              .filter(([, v]) => v === 'confirmado')
              .map(([uid]) => mapCorretor(uid))
              .filter(Boolean) as { nome: string; photoURL?: string }[]
          : []
      ).map((x) => ({ nome: x!.nome, photoURL: x!.photoURL }));
      items.push({
        tipo: 'plantao',
        id: p.id,
        titulo: p.construtora ? `Plantão — ${p.construtora}` : 'Plantão',
        tipoLabel: 'Plantão',
        dataStr: d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
        horarioStr: horario,
        fimTime: fimDate.getTime(),
        confirmados,
      });
    });

    events.forEach((ev) => {
      const dt = ev.dataInicio.toDate();
      const dStr = dt.toISOString().slice(0, 10);
      if (dStr !== hojeStr && dStr !== amanhaStr) return;
      const fimEv = ev.dataFim?.toDate();
      const fimTime = fimEv ? fimEv.getTime() : dt.getTime() + 60 * 60 * 1000;
      const confirmados = (
        ev.respostasPresenca && typeof ev.respostasPresenca === 'object'
          ? Object.entries(ev.respostasPresenca)
              .filter(([, v]) => v === 'confirmado')
              .map(([uid]) => mapCorretor(uid))
              .filter(Boolean) as { nome: string; photoURL?: string }[]
          : []
      ).map((x) => ({ nome: x!.nome, photoURL: x!.photoURL }));
      items.push({
        tipo: 'agenda',
        id: ev.id,
        titulo: ev.titulo || 'Evento',
        tipoLabel: TIPO_AGENDA_LABEL[ev.tipo] || ev.tipo,
        tipoEvento: ev.tipo,
        dataStr: dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        horarioStr: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        fimTime,
        confirmados,
      });
    });

    items.sort((a, b) => {
      const toMs = (item: AgendaCorporativaItemTv) => {
        const [datePart] = item.dataStr.split(',');
        const d = (datePart || '').trim().split('/');
        if (d.length !== 3) return 0;
        const [dd, mm, yyyy] = d;
        const t = (item.horarioStr || '00:00').substring(0, 5);
        return new Date(`${yyyy}-${mm}-${dd}T${t}`).getTime();
      };
      return toMs(a) - toMs(b);
    });
    return items;
  }, [events, plantoes, corretoresList]);

  return {
    events,
    plantoes,
    loading,
    agendaCorporativaItems,
    corretoresStatus,
    corretoresStatusLoading,
  };
}

export { startOfDay, endOfDay, startOfWeek, endOfWeek };
