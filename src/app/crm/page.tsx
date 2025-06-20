'use client';

import React, { useState, useEffect } from 'react';
import { PIPELINE_STAGES } from '@/lib/constants';
import CrmHeader from './_components/CrmHeader';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, DocumentData } from 'firebase/firestore';

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

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  situation: string;
  status: string;
  [key: string]: any; 
}

const FilterChip = ({ children, selected }: { children: React.ReactNode, selected?: boolean }) => (
    <button className={`px-2.5 py-1 text-xs font-semibold border rounded-lg transition-colors whitespace-nowrap ${
        selected 
        ? 'bg-primary-600 border-primary-600 text-white shadow' 
        : 'border-transparent text-primary-800 bg-primary-100/80 hover:bg-primary-200/70 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/20'
    }`}>
        {children}
    </button>
);

const StatusIndicator = ({ status }: { status: string }) => {
    const statusColor = {
        'Sem tarefa': 'bg-gray-400',
        'Tarefa em atraso': 'bg-red-500',
        'Tarefa do Dia': 'bg-yellow-500',
        'Tarefa Futura': 'bg-blue-500',
    }[status] || 'bg-gray-400';

    return <span className={`h-2.5 w-2.5 ${statusColor} rounded-full`}></span>;
};

export default function CrmPage() {
    const { currentUser } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser) {
            setLoading(true);
            const q = query(collection(db, `usuarios/${currentUser.uid}/leads`));
            
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const leadsData: Lead[] = [];
                querySnapshot.forEach((doc) => {
                    leadsData.push({ id: doc.id, ...doc.data() } as Lead);
                });
                setLeads(leadsData);
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

    return (
        <div className="bg-slate-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />
            <main className="flex flex-col gap-3 mt-4">
                <div className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-4 rounded-xl shadow-md">
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors shadow-sm">
                            <SearchIcon className="h-4 w-4" />
                            Filtrar
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors shadow-sm">
                            <XIcon className="h-4 w-4" />
                            Remover Filtros
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
                        {PIPELINE_STAGES.map(stage => <FilterChip key={stage}>{stage}</FilterChip>)}
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
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center p-6">Nenhum lead encontrado.</td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="bg-white even:bg-primary-50/50 dark:bg-gray-800 dark:even:bg-primary-500/5">
                                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                            <div>
                                                <div>{lead.nome}</div>
                                                <div className="font-normal text-gray-500 dark:text-gray-400">{lead.telefone}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30">
                                                <WhatsAppIcon className="h-3.5 w-3.5"/>
                                                WhatsApp
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">{lead.situation}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <StatusIndicator status={lead.status || 'Sem tarefa'} />
                                                {lead.status || 'Sem tarefa'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="px-5 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors shadow-sm">
                                                Abrir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
} 