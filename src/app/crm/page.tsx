'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PIPELINE_STAGES } from '@/lib/constants';
import CrmHeader from './_components/CrmHeader';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
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
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;


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
    const [isFilterModalOpen, setFilterModalOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState<Filters>({});

    useEffect(() => {
        if (currentUser) {
            setLoading(true);
            const leadsRef = collection(db, 'leads');
            const q = query(leadsRef, where("userId", "==", currentUser.uid));
            
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
        setAdvancedFilters({});
    };

    const filteredLeads = useMemo(() => {
        let leadsToFilter = [...leads];
        
        if (activeFilter) {
            leadsToFilter = leadsToFilter.filter(lead => lead.etapa === activeFilter);
        }

        const hasAdvancedFilters = Object.values(advancedFilters).some((options: string[]) => options.length > 0);
        if (hasAdvancedFilters) {
            leadsToFilter = leadsToFilter.filter(lead => {
                return Object.entries(advancedFilters).every(([key, selectedOptions]: [string, string[]]) => {
                    if (selectedOptions.length === 0) {
                        return true; 
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
    }, [leads, activeFilter, advancedFilters]);
    
    const activeAdvancedFilterCount = Object.values(advancedFilters).reduce((count, options: string[]) => count + options.length, 0);

    return (
        <>
        <div className="bg-[#F5F6FA] dark:bg-[#181C23] min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />
            <main className="flex flex-col gap-4 mt-4">
                <div className="bg-white p-4 rounded-2xl shadow-soft border border-[#E8E9F1]">
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
                            {(activeFilter || activeAdvancedFilterCount > 0) && (
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
                    </div>
                    {/* Lista de leads */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-xl shadow-soft border border-[#E8E9F1] table-fixed">
                            <thead>
                                <tr className="bg-[#F5F6FA] text-[#6B6F76] text-xs">
                                    <th className="px-4 py-2 font-semibold text-left w-1/5 rounded-tl-xl">Nome</th>
                                    <th className="px-4 py-2 font-semibold text-left w-1/5">Telefone</th>
                                    <th className="px-4 py-2 font-semibold text-left w-1/5">Etapa</th>
                                    <th className="px-4 py-2 font-semibold text-left w-1/5">Status da Tarefa</th>
                                    <th className="px-4 py-2 font-semibold text-center w-1/5">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center text-[#6B6F76] py-8">Nenhum lead encontrado.</td>
                                    </tr>
                                )}
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="border-b last:border-b-0 hover:bg-[#F5F6FA] transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-[#2E2F38] w-1/5 truncate max-w-[180px]">{lead.nome}</td>
                                        <td className="px-4 py-3 text-xs text-[#6B6F76] w-1/5 truncate max-w-[140px]">{lead.telefone}</td>
                                        <td className="px-4 py-3 text-xs w-1/5">
                                            <span className="inline-block px-2 py-1 rounded bg-[#E8E9F1] text-[#3478F6] font-semibold text-[11px] truncate max-w-[120px]">{lead.etapa}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs w-1/5">
                                            <StatusIndicator status={lead.taskStatus} />
                                        </td>
                                        <td className="px-4 py-3 w-1/5 text-center">
                                            <div className="flex justify-center">
                                                <Link
                                                    href={`/crm/${lead.id}`}
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