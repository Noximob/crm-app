'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ArrowRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
);

export default function DashboardPage() {
    const router = useRouter();

    return (
        <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900/90">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Bem-vindo ao seu Dashboard Principal</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                    Utilize a barra de navegação à esquerda para acessar as ferramentas e informações disponíveis ou clique no botão abaixo para ir diretamente ao CRM.
                </p>
                <Link href="/crm" legacyBehavior>
                    <a className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                        Acessar CRM
                        <ArrowRightIcon className="ml-3 h-6 w-6" />
                    </a>
                </Link>
            </div>
        </div>
    );
} 