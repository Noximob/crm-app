'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NewLeadModal from './NewLeadModal';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>
    </svg>
);
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;

const CrmHeader = () => {
    const pathname = usePathname();
    const [isModalOpen, setIsModalOpen] = useState(false);

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

                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        {navLinks.map(link => (
                            <Link key={link.href} href={link.href}>
                                <span className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${pathname === link.href 
                                    ? 'bg-white dark:bg-gray-800 text-primary-500 shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`
                                }>
                                    {link.text}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <CalendarIcon className="h-5 w-5" />
                        Agenda
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors shadow-sm">
                        <PlusIcon className="h-5 w-5 stroke-white" strokeWidth="2.5" />
                        Novo Lead
                    </button>
                </div>
            </header>
            <NewLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
};

export default CrmHeader; 