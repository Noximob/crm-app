'use client';

import React from 'react';

const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

export default function DashboardPage() {
    return (
        <div className="w-full h-full flex items-center justify-center p-10 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <div className="text-center">
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-primary-500 to-sky-400">
                    <TrendingUpIcon className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                    Seu dia de vendas começa agora
                </h2>
                <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-300">
                    Que seja produtivo e cheio de conquistas.
                </p>
            </div>
        </div>
    );
} 