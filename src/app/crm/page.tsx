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
  qualification?: { [key: string]: string };
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
            const leadsRef = collection(db, `leads/${currentUser.uid}/leads`);
            
            const unsubscribe = onSnapshot(leadsRef, async (querySnapshot) => {
                const leadsDataPromises = querySnapshot.docs.map(async (leadDoc) => {
                    const leadData = { id: leadDoc.id, ...leadDoc.data() };
                    
                    const tasksCol = collection(db, `leads/${currentUser.uid}/leads`, leadDoc.id, 'tarefas');
                    const q = query(tasksCol, where('status', '==', 'pendente'));
                    const tasksSnapshot = await getDocs(q);
                    const tasks = tasksSnapshot.docs.map(doc => doc.data() as Task);

                    const taskStatus = getTaskStatusInfo(tasks);
                    
                    return { ...leadData, taskStatus } as Lead;
                });

                const leadsWithStatus = await Promise.all(leadsDataPromises);
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
        setFilterModalOpen(false); // Fechar o modal ao aplicar
    };

    const handleClearFilters = () => {
        setActiveFilter(null);
        setAdvancedFilters({});
    };

    const filteredLeads = useMemo(() => {
        let leadsToFilter = [...leads];
        
        // Filtro rápido por situação
        if (activeFilter) {
            leadsToFilter = leadsToFilter.filter(lead => lead.etapa === activeFilter);
        }

        // Filtro avançado do modal
        const hasAdvancedFilters = Object.values(advancedFilters).some((options: string[]) => options.length > 0);
        if (hasAdvancedFilters) {
            leadsToFilter = leadsToFilter.filter(lead => {
                return Object.entries(advancedFilters).every(([key, selectedOptions]: [string, string[]]) => {
                    if (selectedOptions.length === 0) {
                        return true; 
                    }

                    const leadValue = key === 'etapa' ? lead.etapa : lead.qualification?.[key];
                    
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
        <div className="bg-slate-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />
            <main className="flex flex-col gap-3 mt-4">
                <div className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-4 rounded-xl shadow-md">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterModalOpen(true)}
                            className="relative flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors shadow-sm"
                        >
                            <FilterIcon className="h-4 w-4" />
                            Filtrar
                            {activeAdvancedFilterCount > 0 && (
                                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                    {activeAdvancedFilterCount}
                                </span>
                            )}
                        </button>
                         <button 
                            onClick={handleClearFilters} 
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                        >
                            <XIcon className="h-4 w-4" />
                            Limpar Filtros
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
                        {PIPELINE_STAGES.map(stage => (
                            <FilterChip 
                                key={stage} 
                                selected={activeFilter === stage}
                                onClick={() => setActiveFilter(prev => (prev === stage ? null : stage))}
                            >
                                {stage}
                            </FilterChip>
                        ))}
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-primary-800 uppercase bg-primary-100/60 dark:bg-primary-900/20 dark:text-primary-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nome</th>
                                <th scope="col" className="px-6 py-3">WhatsApp</th>
                                <th scope="col" className="px-6 py-3">Situação</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center p-6">Carregando leads...</td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center p-6">Nenhum lead encontrado.</td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="bg-white even:bg-primary-50/50 dark:bg-gray-800 dark:even:bg-primary-500/5">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{lead.nome}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{lead.telefone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <a 
                                                href={`https://wa.me/55${lead.telefone.replace(/\\D/g, '')}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-fit px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30"
                                            >
                                                <WhatsAppIcon className="h-3.5 w-3.5 fill-current"/>
                                                WhatsApp
                                            </a>
                                        </td>
                                        <td className="px-6 py-4">{lead.etapa}</td>
                                        <td className="px-6 py-4">
                                            <StatusIndicator status={lead.taskStatus || 'Sem tarefa'} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/crm/${lead.id}`}>
                                                <span className="px-5 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors shadow-sm">
                                                    Abrir
                                                </span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
        <FilterModal 
            isOpen={isFilterModalOpen}
            onClose={() => setFilterModalOpen(false)}
            onApply={handleApplyFilters}
            initialFilters={advancedFilters}
            pipelineStages={PIPELINE_STAGES}
        />
        </>
    );
}

const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
); 