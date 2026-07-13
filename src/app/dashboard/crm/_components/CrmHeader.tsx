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
            <header className="al-card relative overflow-hidden p-4 rounded-2xl flex flex-wrap items-center justify-between gap-y-3 mb-4">
                <div className="absolute inset-x-0 top-0 gx-line" />
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 min-w-0">
                    <Link href="/dashboard/crm" className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-[#FF5C7E] transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </Link>

                    <div className="flex flex-wrap items-center gap-2">
                        {links.map(link => (
                            <Link key={link.href} href={link.href}>
                                <span className={`block px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all border whitespace-nowrap ${pathname === link.href
                                    ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white border-transparent shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                                    : 'bg-white/[0.04] text-text-secondary border-white/10 hover:border-[#FF1E56]/40 hover:text-white'}
                                `}>
                                    {link.text}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => setAgendaModalOpen(true)}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#FF7A97] bg-white/[0.04] rounded-lg hover:bg-[#FF1E56]/[0.09] transition-colors border border-white/10 hover:border-[#FF3364]/40 whitespace-nowrap"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Agenda
                    </button>
                    <Link
                        href="/dashboard/agenda"
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-300 bg-[#34D399]/10 rounded-lg hover:bg-[#34D399]/20 transition-colors border border-[#34D399]/35 whitespace-nowrap"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Agenda Completa
                    </Link>
                    <button
                        onClick={() => setNewLeadModalOpen(true)}
                        className="flex items-center gap-2.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] rounded-lg shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] hover:brightness-110 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 whitespace-nowrap"
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