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
            <header className="bg-[#F5F6FA] dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] p-4 rounded-2xl shadow-soft flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Voltar
                    </Link>

                    <div className="flex items-center gap-2">
                        {links.map(link => (
                            <Link key={link.href} href={link.href}>
                                <span className={`block px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors border border-transparent ${pathname === link.href 
                                    ? 'bg-[#3478F6] text-white' 
                                    : 'bg-white text-[#3478F6] border border-[#A3C8F7] hover:bg-[#E8E9F1] dark:bg-[#181C23] dark:text-[#A3C8F7] dark:border-[#23283A] dark:hover:bg-[#23283A]'}
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
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#3478F6] bg-[#E8E9F1] rounded-lg hover:bg-[#A3C8F7]/40 transition-colors shadow-sm border border-[#A3C8F7] dark:bg-[#181C23] dark:text-[#A3C8F7] dark:border-[#23283A] dark:hover:bg-[#23283A]"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Agenda
                    </button>
                    <button 
                        onClick={() => setNewLeadModalOpen(true)} 
                        className="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-white bg-[#3478F6] rounded-lg shadow-sm hover:bg-[#255FD1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A3C8F7]"
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