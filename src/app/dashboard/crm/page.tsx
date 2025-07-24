'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PIPELINE_STAGES } from '@/lib/constants';
import CrmHeader from './_components/CrmHeader';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot, query, where, Timestamp, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import FilterModal, { Filters } from './_components/FilterModal';

// --- Tipos ---
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
  qualificacao?: { [key: string]: string };
  [key: string]: any; 
}

// --- Ícones ---
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3"/>
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


// --- Componentes ---
const FilterChip = ({ children, selected, onClick }: { children: React.ReactNode, selected?: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`px-2.5 py-1 text-xs font-semibold border rounded-lg transition-colors whitespace-nowrap ${
        selected 
        ? 'bg-primary-600 border-primary-600 text-white shadow' 
        : 'border-transparent text-primary-800 bg-primary-100/80 hover:bg-primary-200/70 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/20'
    }`}>
        {children}
    </button>
);

const StatusIndicator = ({ status }: { status: TaskStatus }) => {
    const statusInfo = {
        'Tarefa em Atraso': { color: 'bg-red-500', text: 'Atrasada' },
        'Tarefa do Dia': { color: 'bg-yellow-400', text: 'Para Hoje' },
        'Tarefa Futura': { color: 'bg-sky-500', text: 'Futura' },
        'Sem tarefa': { color: 'bg-gray-400', text: 'Sem Tarefa' },
    };
    const { color, text } = statusInfo[status] || statusInfo['Sem tarefa'];

    return (
        <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 ${color} rounded-full`}></span>
            {text}
        </div>
    )
};

// --- Funções de Ajuda ---
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

// Novo componente para título com barra colorida
const SectionTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white relative z-10">{children}</h2>
    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#3478F6] to-[#A3C8F7] rounded-r-full opacity-60"></div>
  </div>
);

export default function CrmPage() {
    const { currentUser } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [activeTaskFilter, setActiveTaskFilter] = useState<TaskStatus | null>(null);
    const [isFilterModalOpen, setFilterModalOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState<Filters>({});

    useEffect(() => {
        if (currentUser) {
            setLoading(true);
            const leadsRef = collection(db, 'leads');
            // Adiciona orderBy para createdAt decrescente
            const q = query(leadsRef, where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
            
            const unsubscribe = onSnapshot(q, async (querySnapshot) => {
                const leadsDataPromises = querySnapshot.docs.map(async (leadDoc) => {
                    try {
                        const leadData = { id: leadDoc.id, ...leadDoc.data() } as Lead;
                        
                        const tasksCol = collection(db, 'leads', leadDoc.id, 'tarefas');
                        const tasksQuery = query(tasksCol, where('status', '==', 'pendente'));
                        const tasksSnapshot = await getDocs(tasksQuery);
                        const tasks = tasksSnapshot.docs.map(doc => doc.data() as Task);

                        leadData.taskStatus = getTaskStatusInfo(tasks);
                        
                        leadData.qualificacao = leadDoc.data().qualificacao || {};

                        return leadData;
                    } catch (error) {
                        console.error("Erro ao processar o lead:", leadDoc.id, error);
                        return null;
                    }
                });

                const leadsWithStatus = (await Promise.all(leadsDataPromises))
                    .filter((lead): lead is Lead => lead !== null);
                
                setLeads(leadsWithStatus);
                setLoading(false);
            }, (error) => {
                console.error("Erro ao buscar leads: ", error);
                setLoading(false);
            });

            return () => unsubscribe();
        } else {
            setLeads([]);
            setLoading(false);
        }
    }, [currentUser]);

    const handleApplyFilters = (filters: Filters) => {
        setAdvancedFilters(filters);
        setFilterModalOpen(false);
    };

    const handleClearFilters = () => {
        setActiveFilter(null);
        setActiveTaskFilter(null);
        setAdvancedFilters({});
    };

    const filteredLeads = useMemo(() => {
        let leadsToFilter = [...leads];
        
        if (activeFilter) {
            leadsToFilter = leadsToFilter.filter(lead => lead.etapa === activeFilter);
        }

        if (activeTaskFilter) {
            leadsToFilter = leadsToFilter.filter(lead => lead.taskStatus === activeTaskFilter);
        }

        const hasAdvancedFilters = Object.values(advancedFilters).some((options: string[]) => options.length > 0);
        if (hasAdvancedFilters) {
            leadsToFilter = leadsToFilter.filter(lead => {
                return Object.entries(advancedFilters).every(([key, selectedOptions]: [string, string[]]) => {
                    if (selectedOptions.length === 0) {
                        return true; 
                    }

                    // Tratamento especial para status de tarefa
                    if (key === 'taskStatus') {
                        return selectedOptions.includes(lead.taskStatus);
                    }

                    const leadValue = key === 'etapa' ? lead.etapa : lead.qualificacao?.[key];
                    
                    if (leadValue === undefined) {
                        return false; 
                    }

                    return selectedOptions.includes(leadValue);
                });
            });
        }

        return leadsToFilter;
    }, [leads, activeFilter, activeTaskFilter, advancedFilters]);
    
    const activeAdvancedFilterCount = Object.values(advancedFilters).reduce((count, options: string[]) => count + options.length, 0);

    // Status de tarefa para filtros rápidos
    const taskStatusFilters: TaskStatus[] = ['Tarefa em Atraso', 'Tarefa do Dia', 'Tarefa Futura', 'Sem tarefa'];

    return (
        <>
        <div className="bg-[#F5F6FA] dark:bg-[#181C23] min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />
            <main className="flex flex-col gap-4 mt-4">
                <div className="bg-white dark:bg-[#23283A] p-4 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                        <SectionTitle>Gestão de Leads</SectionTitle>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFilterModalOpen(true)}
                                className="relative flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#3478F6] hover:bg-[#255FD1] rounded-lg transition-colors shadow-soft"
                            >
                                <span>Filtrar</span>
                                {activeAdvancedFilterCount > 0 && (
                                    <span className="bg-[#3AC17C] text-white text-[10px] font-bold rounded-full px-2 py-0.5 ml-1 animate-pulse-slow">
                                        {activeAdvancedFilterCount}
                                    </span>
                                )}
                            </button>
                            {(activeFilter || activeTaskFilter || activeAdvancedFilterCount > 0) && (
                                <button
                                    onClick={handleClearFilters}
                                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-[#F45B69] bg-[#F45B69]/10 hover:bg-[#F45B69]/20 rounded-lg transition-colors"
                                >
                                    <XIcon className="h-4 w-4" /> Limpar filtros
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Chips de filtro rápido */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {PIPELINE_STAGES.map((stage) => (
                            <FilterChip
                                key={stage}
                                selected={activeFilter === stage}
                                onClick={() => setActiveFilter(activeFilter === stage ? null : stage)}
                            >
                                {stage}
                            </FilterChip>
                        ))}
                        {/* Separador visual */}
                        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                        {/* Filtros de status de tarefa */}
                        {taskStatusFilters.map((taskStatus) => (
                            <FilterChip
                                key={taskStatus}
                                selected={activeTaskFilter === taskStatus}
                                onClick={() => setActiveTaskFilter(activeTaskFilter === taskStatus ? null : taskStatus)}
                            >
                                {taskStatus}
                            </FilterChip>
                        ))}
                    </div>
                    {/* Lista de leads */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white dark:bg-[#23283A] rounded-xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] table-fixed">
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
                                {filteredLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center text-[#6B6F76] dark:text-gray-300 py-8">Nenhum lead encontrado.</td>
                                    </tr>
                                )}
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="border-b last:border-b-0 hover:bg-[#F5F6FA] dark:hover:bg-[#23283A] transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-[#2E2F38] dark:text-white w-1/5 truncate max-w-[180px]">{lead.nome}</td>
                                        <td className="px-4 py-3 text-xs text-[#6B6F76] dark:text-gray-100 w-1/6 truncate max-w-[140px]">{lead.telefone}</td>
                                        <td className="px-4 py-3 text-center w-1/12">
                                            <a
                                                href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
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
                                            <span className="dark:text-white">
                                                <StatusIndicator status={lead.taskStatus} />
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 w-1/5 text-center">
                                            <div className="flex justify-center">
                                                <Link
                                                    href={`/dashboard/crm/${lead.id}`}
                                                    className="px-3 py-1.5 text-xs font-semibold bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg shadow-soft transition-colors"
                                                >
                                                    Ver
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
            {isFilterModalOpen && (
                <FilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setFilterModalOpen(false)}
                    onApply={handleApplyFilters}
                    initialFilters={advancedFilters}
                    pipelineStages={PIPELINE_STAGES}
                />
            )}
        </div>
        </>
    );
}

const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
); 