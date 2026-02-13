'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import FilterModal, { Filters } from '@/app/dashboard/crm/_components/FilterModal';

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

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
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
    className={`px-2.5 py-1.5 text-xs font-semibold border rounded-lg transition-colors whitespace-nowrap ${
      selected ? 'bg-[#D4A017] border-[#D4A017] text-white shadow-sm' : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:border-white/20'
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

const SectionTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-base font-bold text-white relative z-10">{children}</h2>
    <div className="absolute -left-1.5 top-1/2 transform -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-r-full opacity-60" />
  </div>
);

const MAX_LEADS_LOAD = 500;
const PAGE_SIZE = 20;
const taskStatusFilters: TaskStatus[] = ['Tarefa em Atraso', 'Tarefa do Dia', 'Tarefa Futura', 'Sem tarefa'];

export default function VisualizarCrmCorretorPage() {
  const { userData } = useAuth();
  const { stages, normalizeEtapa } = usePipelineStages();
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [selectedCorretorId, setSelectedCorretorId] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskStatus | null>(null);
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<Filters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filtroRapidoOpen, setFiltroRapidoOpen] = useState(false);
  const filtroRapidoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filtroRapidoRef.current && !filtroRapidoRef.current.contains(e.target as Node)) setFiltroRapidoOpen(false);
    };
    if (filtroRapidoOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [filtroRapidoOpen]);

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

  const fetchLeads = async () => {
    if (!selectedCorretorId) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const leadsRef = collection(db, 'leads');
      const q = query(
        leadsRef,
        where('userId', '==', selectedCorretorId),
        orderBy('createdAt', 'desc'),
        limit(MAX_LEADS_LOAD)
      );
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
      setLeads(newLeads);
    } catch (e) {
      console.error('Erro ao buscar leads:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCorretorId) {
      setCurrentPage(1);
      fetchLeads();
    } else {
      setLeads([]);
      setLoading(false);
    }
  }, [selectedCorretorId]);

  useEffect(() => {
    if (activeFilter && !stages.includes(activeFilter)) {
      setActiveFilter(null);
      setCurrentPage(1);
    }
  }, [stages.join(','), activeFilter]);

  const handleApplyFilters = (filters: Filters) => {
    setAdvancedFilters(filters);
    setFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setActiveFilter(null);
    setActiveTaskFilter(null);
    setAdvancedFilters({});
    setCurrentPage(1);
  };

  const filteredLeads = useMemo(() => {
    let list = [...leads];
    if (searchTerm.trim()) list = list.filter(l => l.nome.toLowerCase().includes(searchTerm.toLowerCase().trim()));
    if (activeFilter) list = list.filter(l => normalizeEtapa(l.etapa) === activeFilter);
    if (activeTaskFilter) list = list.filter(l => l.taskStatus === activeTaskFilter);
    const hasAdvanced = Object.values(advancedFilters).some((opts: string[]) => opts.length > 0);
    if (hasAdvanced) {
      list = list.filter(lead => {
        return Object.entries(advancedFilters).every(([key, selectedOptions]: [string, string[]]) => {
          if (selectedOptions.length === 0) return true;
          if (key === 'taskStatus') return selectedOptions.includes(lead.taskStatus);
          const leadValue = key === 'etapa' ? normalizeEtapa(lead.etapa) : lead.qualificacao?.[key];
          if (leadValue === undefined) return false;
          if (Array.isArray(leadValue)) return leadValue.some(v => selectedOptions.includes(v));
          return selectedOptions.includes(leadValue);
        });
      });
    }
    return list;
  }, [leads, searchTerm, activeFilter, activeTaskFilter, advancedFilters, normalizeEtapa]);

  const totalFiltered = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages > 0 ? totalPages : 1);
  }, [totalFiltered, totalPages, currentPage]);

  const goToPage = (page: number) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  const activeAdvancedFilterCount = Object.values(advancedFilters).reduce((c, opts: string[]) => c + opts.length, 0);
  const selectedCorretor = corretores.find(c => c.id === selectedCorretorId);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-5rem)] min-h-0 p-3 sm:p-4 overflow-hidden">
        {/* Header no estilo do CRM atual: voltar + título + seletor de corretor */}
        <header className="card-glow p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 mb-4 flex-shrink-0">
          <div className="flex items-center gap-4 flex-wrap min-w-0">
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-orange-400 transition-colors shrink-0"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Voltar ao administrador
            </Link>
            <span className="text-gray-500 hidden sm:inline">|</span>
            <span className="text-sm font-semibold text-white shrink-0">Visualizar CRM do Corretor (somente leitura)</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-sm text-gray-300 whitespace-nowrap">Corretor:</label>
            <select
              value={selectedCorretorId}
              onChange={e => setSelectedCorretorId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[#D4A017]/50"
            >
              <option value="">Selecione um corretor</option>
              {corretores.map(c => (
                <option key={c.id} value={c.id} className="bg-[#23283A] text-white">{c.nome || c.email}</option>
              ))}
            </select>
          </div>
        </header>

        {!selectedCorretorId ? (
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-white/10 bg-[var(--bg-card)] p-8">
            <p className="text-gray-400 text-center">Selecione um corretor para ver o CRM dele (leads, filtros e detalhes em somente leitura).</p>
          </div>
        ) : (
          <>
            <div className="px-3 py-2 rounded-lg bg-[#D4A017]/10 border border-[#D4A017]/20 text-sm text-[#E8C547] mb-2 flex-shrink-0">
              Visualizando CRM de: <strong>{selectedCorretor?.nome || selectedCorretor?.email}</strong>. Somente leitura — você não pode editar etapas, tarefas ou anotações.
            </div>

            <main className="flex flex-col flex-1 min-h-0 gap-2 mt-0">
              <div className="flex flex-col flex-1 min-h-0 p-3 rounded-2xl border border-white/10">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 flex-shrink-0 min-w-0">
                  <SectionTitle>Gestão de Leads</SectionTitle>
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar lead por nome..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="block w-52 sm:w-60 pl-9 pr-3 py-1 border border-white/10 rounded-lg text-sm bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A017]/50 focus:border-transparent"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white">
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="relative flex-shrink-0" ref={filtroRapidoRef}>
                    <button
                      type="button"
                      onClick={() => setFiltroRapidoOpen(o => !o)}
                      className="relative flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#D4A017] hover:bg-[#B8860B] rounded-lg transition-colors shadow-soft"
                    >
                      <span>Filtro Rápido</span>
                      {((activeFilter ? 1 : 0) + (activeTaskFilter ? 1 : 0)) > 0 && (
                        <span className="bg-white/90 text-[#D4A017] text-[10px] font-bold rounded-full min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center">
                          {(activeFilter ? 1 : 0) + (activeTaskFilter ? 1 : 0)}
                        </span>
                      )}
                    </button>
                    {filtroRapidoOpen && (
                      <div className="absolute left-0 top-full mt-1.5 z-50 w-[min(90vw,420px)] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[var(--bg-card)] shadow-xl py-3 px-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Etapa do funil</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {stages.map(stage => (
                            <FilterChip
                              key={stage}
                              selected={activeFilter === stage}
                              onClick={() => { setActiveFilter(activeFilter === stage ? null : stage); setCurrentPage(1); setFiltroRapidoOpen(false); }}
                            >
                              {stage}
                            </FilterChip>
                          ))}
                        </div>
                        <div className="w-full h-px bg-white/10 my-2" />
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Status da tarefa</p>
                        <div className="flex flex-wrap gap-2">
                          {taskStatusFilters.map(ts => (
                            <FilterChip
                              key={ts}
                              selected={activeTaskFilter === ts}
                              onClick={() => { setActiveTaskFilter(activeTaskFilter === ts ? null : ts); setCurrentPage(1); setFiltroRapidoOpen(false); }}
                            >
                              {ts}
                            </FilterChip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                    <button
                      type="button"
                      onClick={() => setFilterModalOpen(true)}
                      className="relative flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#D4A017] hover:bg-[#B8860B] rounded-lg transition-colors shadow-soft"
                    >
                      <span>Filtro Completo</span>
                      {activeAdvancedFilterCount > 0 && (
                        <span className="bg-[#3AC17C] text-white text-[10px] font-bold rounded-full px-2 py-0.5 ml-1 animate-pulse-slow">{activeAdvancedFilterCount}</span>
                      )}
                    </button>
                    {(searchTerm.trim() || activeFilter || activeTaskFilter || activeAdvancedFilterCount > 0) && (
                      <button
                        onClick={handleClearFilters}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#F45B69] bg-[#F45B69]/10 hover:bg-[#F45B69]/20 rounded-lg transition-colors"
                      >
                        <XIcon className="h-4 w-4" /> Limpar filtros
                      </button>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 flex-nowrap shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                    {totalFiltered > 0 ? (
                      <>
                        <span className="text-xs text-gray-400 whitespace-nowrap tabular-nums shrink-0">
                          {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalFiltered)} de {totalFiltered} {totalFiltered === 1 ? 'lead' : 'leads'}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0" role="navigation" aria-label="Paginação">
                          <button
                            type="button"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage <= 1}
                            title="Anterior"
                            className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg border border-white/10 bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                          >
                            {'<'}
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2))
                            .map((p, idx, arr) => (
                              <React.Fragment key={p}>
                                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-0.5 text-gray-400">…</span>}
                                <button
                                  type="button"
                                  onClick={() => goToPage(p)}
                                  className={`min-w-[1.75rem] w-7 h-7 flex items-center justify-center text-xs font-semibold rounded-lg border transition-colors ${
                                    p === currentPage ? 'bg-[#D4A017] border-[#D4A017] text-white' : 'border-white/10 bg-white/5 hover:bg-white/10'
                                  }`}
                                >
                                  {p}
                                </button>
                              </React.Fragment>
                            ))}
                          <button
                            type="button"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            title="Próximo"
                            className="w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg border border-white/10 bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                          >
                            {'>'}
                          </button>
                        </div>
                      </>
                    ) : <span className="text-xs text-gray-500">—</span>}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-white/10">
                  <table className="min-w-full table-fixed">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-white/10 bg-[var(--bg-card)]/95 backdrop-blur-sm text-gray-200 text-xs shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
                        <th className="px-3 py-2 font-semibold text-left w-1/5 rounded-tl-xl">Nome</th>
                        <th className="px-3 py-2 font-semibold text-left w-1/6">Telefone</th>
                        <th className="px-3 py-2 font-semibold text-center w-1/12">WhatsApp</th>
                        <th className="px-3 py-2 font-semibold text-left w-1/5">Etapa</th>
                        <th className="px-3 py-2 font-semibold text-left w-1/5">Status da Tarefa</th>
                        <th className="px-3 py-2 font-semibold text-center w-1/5 rounded-tr-xl">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>
                      )}
                      {!loading && leads.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-gray-400 py-8">Nenhum lead encontrado.</td></tr>
                      )}
                      {!loading && leads.length > 0 && totalFiltered === 0 && (
                        <tr><td colSpan={6} className="text-center text-gray-400 py-8">Nenhum lead corresponde aos filtros. Limpe os filtros ou altere a busca.</td></tr>
                      )}
                      {!loading && totalFiltered > 0 && paginatedLeads.map(lead => (
                        <tr key={lead.id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors">
                          <td className="px-3 py-1.5 text-sm font-medium text-white w-1/5 truncate max-w-[180px]">{lead.nome}</td>
                          <td className="px-3 py-1.5 text-xs text-gray-200 w-1/6 truncate max-w-[140px]">{lead.telefone}</td>
                          <td className="px-3 py-1.5 text-center w-1/12">
                            <a
                              href={`https://wa.me/${String(lead.telefone || '').replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center text-[#25D366] hover:text-[#128C7E]"
                              title="Conversar no WhatsApp"
                            >
                              <WhatsAppIcon className="h-4 w-4" />
                            </a>
                          </td>
                          <td className="px-3 py-1.5 text-xs w-1/5">
                            <span className="inline-block px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[#E8C547] font-semibold text-[11px] truncate max-w-[120px]">{normalizeEtapa(lead.etapa)}</span>
                          </td>
                          <td className="px-3 py-1.5 text-xs w-1/5">
                            <span className="text-white"><StatusIndicator status={lead.taskStatus} /></span>
                          </td>
                          <td className="px-3 py-1.5 w-1/5 text-center">
                            <div className="flex justify-center">
                              <Link
                                href={`/dashboard/crm/${lead.id}?viewAs=1`}
                                className="px-2 py-1 text-xs font-semibold bg-[#D4A017] hover:bg-[#B8860B] text-white rounded-lg shadow-soft transition-colors"
                              >
                                Ver (somente leitura)
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!loading && leads.length >= MAX_LEADS_LOAD && (
                    <p className="text-xs text-gray-400 mt-2 text-center">Exibindo os {MAX_LEADS_LOAD} leads mais recentes. Use os filtros para refinar.</p>
                  )}
                </div>
              </div>
            </main>
            {isFilterModalOpen && (
              <FilterModal
                key={`filter-${stages.join('-')}`}
                isOpen={isFilterModalOpen}
                onClose={() => setFilterModalOpen(false)}
                onApply={handleApplyFilters}
                initialFilters={advancedFilters}
                pipelineStages={stages}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
