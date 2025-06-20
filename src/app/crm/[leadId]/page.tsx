'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import Link from 'next/link';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;

export default function LeadDetailPage() {
    const { currentUser } = useAuth();
    const params = useParams();
    const leadId = params.leadId as string;

    const [lead, setLead] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || !leadId) return;

        const fetchLead = async () => {
            setLoading(true);
            const leadRef = doc(db, `leads/${currentUser.uid}/leads`, leadId);
            const docSnap = await getDoc(leadRef);

            if (docSnap.exists()) {
                setLead({ id: docSnap.id, ...docSnap.data() });
            } else {
                console.log("No such document!");
                setLead(null);
            }
            setLoading(false);
        };

        fetchLead();
    }, [currentUser, leadId]);

    return (
        <div className="bg-slate-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
            <header className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-center justify-between mb-4">
                <Link href="/crm" className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary-500 transition-colors">
                    <ArrowLeftIcon className="h-5 w-5" />
                    Voltar para a Gestão
                </Link>
            </header>

            <main>
                {loading ? (
                    <div className="text-center py-10">Carregando dados do lead...</div>
                ) : lead ? (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{lead.nome}</h1>
                        <p className="text-gray-600 dark:text-gray-400">{lead.telefone}</p>
                        <p className="mt-4">ID do Lead: {lead.id}</p>
                        <p className="text-sm mt-4 text-gray-500">Mais detalhes e funcionalidades de edição virão aqui em breve.</p>
                    </div>
                ) : (
                    <div className="text-center py-10">Lead não encontrado.</div>
                )}
            </main>
        </div>
    );
} 