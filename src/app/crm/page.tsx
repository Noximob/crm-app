'use client';

import React from 'react';
import CrmHeader from './_components/CrmHeader';

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3"/>
    </svg>
);
const XIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;

const leadsData = [
    { name: 'Renan', phone: '(47) 99694-4751', situation: 'Geladeira', status: 'Sem tarefa' },
    { name: 'Renanzera', phone: '(47) 99694-4751', situation: 'Pós Venda e Fidelização', status: 'Tarefa em atraso' },
    { name: 'Renan Scheffel', phone: '(47) 99694-4751', situation: 'Pré Qualificação', status: 'Tarefa do Dia' },
    { name: 'Novo Lead', phone: '(47) 99999-9999', situation: 'Qualificação', status: 'Tarefa Futura' },
];

const pipelineStages = [
    'Pré Qualificação', 'Qualificação', 'Apresentação do imóvel', 'Ligação agendada',
    'Visita agendada', 'Negociação e Proposta', 'Contrato e fechamento',
    'Pós Venda e Fidelização', 'Geladeira'
];

const FilterChip = ({ children, selected }: { children: React.ReactNode, selected?: boolean }) => (
    <button className={`px-2.5 py-1 text-sm font-medium border rounded-lg transition-colors ${
        selected 
        ? 'bg-primary-500 border-primary-500 text-white' 
        : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-100 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
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
    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />
            <main className="flex flex-col gap-4 mt-4">
                <div className="bg-white dark:bg-gray-800/80 dark:backdrop-blur-sm p-4 rounded-xl shadow-md">
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                            <SearchIcon className="h-4 w-4" />
                            Filtrar
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 whitespace-nowrap">
                            <XIcon className="h-4 w-4" />
                            Remover Filtros
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        {pipelineStages.map(stage => <FilterChip key={stage}>{stage}</FilterChip>)}
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-mauve-800 uppercase bg-mauve-50 dark:bg-mauve-900/20 dark:text-mauve-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nome</th>
                                <th scope="col" className="px-6 py-3">WhatsApp</th>
                                <th scope="col" className="px-6 py-3">Situação</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leadsData.map((lead, index) => (
                                <tr key={index} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                        <div>
                                            <div>{lead.name}</div>
                                            <div className="font-normal text-gray-500 dark:text-gray-400">{lead.phone}</div>
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
                                            <StatusIndicator status={lead.status} />
                                            {lead.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="px-5 py-2 text-sm font-semibold text-white bg-mauve-600 hover:bg-mauve-700 rounded-lg transition-colors shadow-sm">
                                            Abrir
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
} 