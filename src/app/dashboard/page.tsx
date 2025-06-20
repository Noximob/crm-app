'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();

    return (
        <div className="w-full h-full flex items-center justify-center p-10 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <div className="text-center">
                <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                    "O único lugar onde o sucesso vem antes do trabalho é no dicionário."
                </h2>
                <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                    Tenha um dia produtivo e boas vendas!
                </p>
            </div>
        </div>
    );
} 