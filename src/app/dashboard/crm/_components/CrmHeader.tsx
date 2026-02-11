'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NewLeadModal from './NewLeadModal';
import TaskListModal from './TaskListModal';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>
    </svg>
);
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

export const CrmHeader = () => {
    const pathname = usePathname();
    const [isNewLeadModalOpen, setNewLeadModalOpen] = useState(false);
    const [isAgendaModalOpen, setAgendaModalOpen] = useState(false);
    const { currentUser, loading } = useAuth();
    const router = useRouter();

    const links = [
        { href: '/dashboard/crm', text: 'Gestão de Leads' },
        { href: '/dashboard/crm/andamento', text: 'Andamento dos Leads' }
    ];

    const handleSignOut = async () => {
        await auth.signOut();
        router.push('/');
    };

    return (
        <>
            <header className="card-glow p-4 rounded-2xl flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard/crm" className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-orange-400 transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </Link>

                    <div className="flex items-center gap-2">
                        {links.map(link => (
                            <Link key={link.href} href={link.href}>
                                <span className={`block px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors border ${pathname === link.href 
                                    ? 'bg-orange-500 text-white border-orange-500' 
                                    : 'bg-[var(--surface-hover)] text-orange-400 border-[var(--border-subtle)] hover:border-orange-500/40'}
                                `}>
                                    {link.text}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setAgendaModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-orange-400 bg-[var(--surface-hover)] rounded-lg hover:bg-orange-500/20 transition-colors shadow-sm border border-[var(--border-subtle)]"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Agenda
                    </button>
                    <Link 
                        href="/dashboard/agenda"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#3AC17C] bg-[#3AC17C]/10 rounded-lg hover:bg-[#3AC17C]/20 transition-colors shadow-sm border border-[#3AC17C]/30 dark:bg-[#3AC17C]/10 dark:text-[#3AC17C] dark:border-[#3AC17C]/30 dark:hover:bg-[#3AC17C]/20"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Agenda Completa
                    </Link>
                    <button 
                        onClick={() => setNewLeadModalOpen(true)} 
                        className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Novo Lead
                    </button>
                </div>
            </header>
            <NewLeadModal isOpen={isNewLeadModalOpen} onClose={() => setNewLeadModalOpen(false)} />
            <TaskListModal isOpen={isAgendaModalOpen} onClose={() => setAgendaModalOpen(false)} />
        </>
    );
};

export default CrmHeader; 