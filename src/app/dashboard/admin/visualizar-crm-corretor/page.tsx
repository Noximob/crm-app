'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PIPELINE_STAGES } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore';

interface Task {
  id: string;
  dueDate: Timestamp;
  status: 'pendente' | 'concluída' | 'cancelada';
}

type TaskStatus = 'Tarefa em Atraso' | 'Tarefa do Dia' | 'Tarefa Futura' | 'Sem tarefa';

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  etapa: string;
  taskStatus: TaskStatus;
  qualificacao?: { [key: string]: string | string[] };
  [key: string]: unknown;
}

interface Corretor {
  id: string;
  nome: string;
  email: string;
  tipoConta: string;
}

const getTaskStatusInfo = (tasks: Task[]): TaskStatus => {
  if (tasks.length === 0) return 'Sem tarefa';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const hasOverdue = tasks.some(task => {
    const dueDate = task.dueDate.toDate();
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < now;
  });
  if (hasOverdue) return 'Tarefa em Atraso';
  const hasTodayTask = tasks.some(task => {
    const dueDate = task.dueDate.toDate();
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === now.getTime();
  });
  if (hasTodayTask) return 'Tarefa do Dia';
  return 'Tarefa Futura';
};

const SectionTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white relative z-10">{children}</h2>
    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#3478F6] to-[#A3C8F7] rounded-r-full opacity-60" />
  </div>
);

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 32 32" width="24" height="24" fill="none">
    <circle cx="16" cy="16" r="16" fill="#25D366" />
    <path d="M23.5 20.5c-.3-.2-1.7-.8-2-1s-.5-.2-.7.1c-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.2-.4-2.3-1.3-.8-.7-1.3-1.5-1.5-1.8-.2-.3 0-.5.1-.7.1-.1.2-.3.3-.5.1-.2.1-.4 0-.6-.1-.2-.7-1.7-1-2.3-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.2.2-.7.7-.7 1.7 0 1 .7 2 1.1 2.5.4.5 1.5 2 3.6 2.7 2.1.7 2.1.5 2.5.5.4 0 1.2-.5 1.4-1 .2-.5.2-.9.1-1.1z" fill="#fff" />
  </svg>
);
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

const FilterChip = ({ children, selected, onClick }: { children: React.ReactNode; selected?: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 text-xs font-semibold border rounded-lg transition-colors whitespace-nowrap ${
      selected ? 'bg-primary-600 border-primary-600 text-white shadow' : 'border-transparent text-primary-800 bg-primary-100/80 hover:bg-primary-200/70 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/20'
    }`}
  >
    {children}
  </button>
);

const StatusIndicator = ({ status }: { status: TaskStatus }) => {
  const statusInfo: Record<TaskStatus, { color: string; text: string }> = {
    'Tarefa em Atraso': { color: 'bg-red-500', text: 'Atrasada' },
    'Tarefa do Dia': { color: 'bg-yellow-400', text: 'Para Hoje' },
    'Tarefa Futura': { color: 'bg-sky-500', text: 'Futura' },
    'Sem tarefa': { color: 'bg-gray-400', text: 'Sem Tarefa' },
  };
  const { color, text } = statusInfo[status] || statusInfo['Sem tarefa'];
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 ${color} rounded-full`} />
      {text}
    </div>
  );
};

const PAGE_SIZE = 15;

export default function VisualizarCrmCorretorPage() {
  const { userData } = useAuth();
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [selectedCorretorId, setSelectedCorretorId] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastVisible, setLastVisible] = useState<unknown>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    const usersRef = collection(db, 'usuarios');
    const q = query(
      usersRef,
      where('imobiliariaId', '==', userData.imobiliariaId),
      where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo'])
    );
    getDocs(q).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Corretor));
      setCorretores(list);
      if (list.length === 1 && !selectedCorretorId) setSelectedCorretorId(list[0].id);
    });
  }, [userData?.imobiliariaId]);

  const fetchLeads = async (loadMore = false) => {
    if (!selectedCorretorId) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const leadsRef = collection(db, 'leads');
      let q = query(
        leadsRef,
        where('userId', '==', selectedCorretorId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      if (loadMore && lastVisible) {
        q = query(
          leadsRef,
          where('userId', '==', selectedCorretorId),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(PAGE_SIZE)
        );
      }
      const snapshot = await getDocs(q);
      const newLeads = await Promise.all(
        snapshot.docs.map(async leadDoc => {
          const leadData = { id: leadDoc.id, ...leadDoc.data() } as Lead;
          const tasksCol = collection(db, 'leads', leadDoc.id, 'tarefas');
          const tasksQuery = query(tasksCol, where('status', '==', 'pendente'));
          const tasksSnapshot = await getDocs(tasksQuery);
          const tasks = tasksSnapshot.docs.map(doc => doc.data() as Task);
          leadData.taskStatus = getTaskStatusInfo(tasks);
          leadData.qualificacao = leadDoc.data().qualificacao || {};
          return leadData;
        })
      );
      if (loadMore) {
        setLeads(prev => {
          const ids = new Set(prev.map(l => l.id));
          const filtered = newLeads.filter(l => !ids.has(l.id));
          return [...prev, ...filtered];
        });
      } else {
        setLeads(newLeads);
      }
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error('Erro ao buscar leads:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCorretorId) {
      setLastVisible(null);
      fetchLeads();
    } else {
      setLeads([]);
      setLoading(false);
    }
  }, [selectedCorretorId]);

  const filteredLeads = useMemo(() => {
    let list = [...leads];
    if (searchTerm.trim()) {
      list = list.filter(l => l.nome.toLowerCase().includes(searchTerm.toLowerCase().trim()));
    }
    if (activeFilter) list = list.filter(l => l.etapa === activeFilter);
    if (activeTaskFilter) list = list.filter(l => l.taskStatus === activeTaskFilter);
    return list;
  }, [leads, searchTerm, activeFilter, activeTaskFilter]);

  const selectedCorretor = corretores.find(c => c.id === selectedCorretorId);
  const taskStatusFilters: TaskStatus[] = ['Tarefa em Atraso', 'Tarefa do Dia', 'Tarefa Futura', 'Sem tarefa'];

  return (
    <div className="bg-[#F5F6FA] dark:bg-[#181C23] min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="bg-[#F5F6FA] dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] p-4 rounded-2xl shadow-soft flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-2 text-sm font-semibold text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Voltar ao administrador
          </Link>
          <span className="text-[#6B6F76] dark:text-gray-400">|</span>
          <span className="text-sm font-semibold text-[#2E2F38] dark:text-white">
            Visualizar CRM do Corretor (somente leitura)
          </span>
        </div>
      </header>

      <div className="bg-white dark:bg-[#23283A] p-4 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-[#2E2F38] dark:text-white">
            Corretor:
          </label>
          <select
            value={selectedCorretorId}
            onChange={e => setSelectedCorretorId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm max-w-xs"
          >
            <option value="">Selecione um corretor</option>
            {corretores.map(c => (
              <option key={c.id} value={c.id}>{c.nome || c.email}</option>
            ))}
          </select>
        </div>

        {!selectedCorretorId ? (
          <p className="text-[#6B6F76] dark:text-gray-400 py-8 text-center">
            Selecione um corretor para ver o CRM dele exatamente como ele vê (somente leitura).
          </p>
        ) : (
          <>
            <div className="mb-4 px-3 py-2 rounded-lg bg-[#3478F6]/10 border border-[#3478F6]/20 text-sm text-[#3478F6] dark:text-[#A3C8F7]">
              Visualizando CRM de: <strong>{selectedCorretor?.nome || selectedCorretor?.email}</strong>. Você não pode editar; apenas visualizar.
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <SectionTitle>Gestão de Leads</SectionTitle>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar lead por nome..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="block w-64 pl-10 pr-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <XIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {PIPELINE_STAGES.map(stage => (
                <FilterChip
                  key={stage}
                  selected={activeFilter === stage}
                  onClick={() => setActiveFilter(activeFilter === stage ? null : stage)}
                >
                  {stage}
                </FilterChip>
              ))}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
              {taskStatusFilters.map(ts => (
                <FilterChip
                  key={ts}
                  selected={activeTaskFilter === ts}
                  onClick={() => setActiveTaskFilter(activeTaskFilter === ts ? null : ts)}
                >
                  {ts}
                </FilterChip>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] table-fixed">
                <thead>
                  <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-gray-300 text-xs">
                    <th className="px-4 py-2 font-semibold text-left w-1/5 rounded-tl-xl">Nome</th>
                    <th className="px-4 py-2 font-semibold text-left w-1/6">Telefone</th>
                    <th className="px-4 py-2 font-semibold text-center w-1/12">WhatsApp</th>
                    <th className="px-4 py-2 font-semibold text-left w-1/5">Etapa</th>
                    <th className="px-4 py-2 font-semibold text-left w-1/5">Status da Tarefa</th>
                    <th className="px-4 py-2 font-semibold text-center w-1/5">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={6} className="text-center py-8">Carregando...</td></tr>
                  )}
                  {!loading && leads.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-[#6B6F76] dark:text-gray-300 py-8">Nenhum lead encontrado.</td></tr>
                  )}
                  {!loading && filteredLeads.map(lead => (
                    <tr key={lead.id} className="border-b last:border-b-0 hover:bg-[#F5F6FA] dark:hover:bg-[#23283A] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#2E2F38] dark:text-white w-1/5 truncate max-w-[180px]">{lead.nome}</td>
                      <td className="px-4 py-3 text-xs text-[#6B6F76] dark:text-gray-100 w-1/6 truncate max-w-[140px]">{lead.telefone}</td>
                      <td className="px-4 py-3 text-center w-1/12">
                        <a
                          href={`https://wa.me/${String(lead.telefone).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-[#25D366] hover:text-[#128C7E]"
                          title="Conversar no WhatsApp"
                        >
                          <WhatsAppIcon className="h-5 w-5" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs w-1/5">
                        <span className="inline-block px-2 py-1 rounded bg-[#E8E9F1] dark:bg-[#181C23] text-[#3478F6] dark:text-primary-200 font-semibold text-[11px] truncate max-w-[120px]">{lead.etapa}</span>
                      </td>
                      <td className="px-4 py-3 text-xs w-1/5">
                        <StatusIndicator status={lead.taskStatus} />
                      </td>
                      <td className="px-4 py-3 w-1/5 text-center">
                        <Link
                          href={`/dashboard/crm/${lead.id}?viewAs=1`}
                          className="inline-block px-3 py-1.5 text-xs font-semibold bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg transition-colors"
                        >
                          Ver (somente leitura)
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasMore && !loading && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => fetchLeads(true)}
                    className="px-6 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold rounded-lg transition-colors"
                  >
                    Mostrar mais
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
