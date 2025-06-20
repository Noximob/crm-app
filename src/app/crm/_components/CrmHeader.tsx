'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NewLeadModal from './NewLeadModal';
import AgendaModal from './AgendaModal';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>
    </svg>
);
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;

const CrmHeader = () => {
    const pathname = usePathname();
    const [isNewLeadModalOpen, setNewLeadModalOpen] = useState(false);
    const [isAgendaModalOpen, setAgendaModalOpen] = useState(false);

    const navLinks = [
        { href: '/crm', text: 'Gestão de Leads' },
        { href: '/crm/andamento', text: 'Andamento dos Leads' }
    ];

    return (
        <>
            <header className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary-500 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </Link>

                    <div className="flex items-center gap-1 bg-primary-100/60 dark:bg-gray-700 p-1 rounded-lg">
                        {navLinks.map(link => (
                            <Link key={link.href} href={link.href}>
                                <span className={`block px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${pathname === link.href 
                                    ? 'bg-primary-600 text-white shadow-md' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-primary-200/50 dark:hover:bg-gray-600'}`
                                }>
                                    {link.text}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setAgendaModalOpen(true)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-primary-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Agenda
                    </button>
                    <button 
                        onClick={() => setNewLeadModalOpen(true)} 
                        className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Novo Lead
                    </button>
                </div>
            </header>
            <NewLeadModal isOpen={isNewLeadModalOpen} onClose={() => setNewLeadModalOpen(false)} />
            <AgendaModal isOpen={isAgendaModalOpen} onClose={() => setAgendaModalOpen(false)} />
        </>
    );
};

export default CrmHeader; 