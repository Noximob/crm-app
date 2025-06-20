'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>;

const CrmHeader = () => {
    const pathname = usePathname();

    const navLinks = [
        { href: '/crm', text: 'Gestão de Leads' },
        { href: '/crm/andamento', text: 'Andamento dos Leads' }
    ];

    return (
        <header className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-center justify-between mb-6">
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
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                    <CalendarIcon className="h-5 w-5" />
                    Agenda
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors shadow-sm">
                    <PlusIcon className="h-5 w-5" />
                    Novo Lead
                </button>
            </div>
        </header>
    );
};

export default CrmHeader; 