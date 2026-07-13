'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Lead } from '@/types';
import LoadingState from '@/components/ui/LoadingState';
import { ensureTarefasPendentes, getTaskStatusInfo, TaskStatus } from '@/lib/leadTasks';

// --- Tipos e Constantes ---
interface LeadWithTaskStatus extends Lead {
    taskStatus: TaskStatus;
}

const TAREFA_STATUS_ORDER: TaskStatus[] = ['Tarefa em Atraso', 'Tarefa do Dia', 'Sem tarefa'];

// --- Componentes de UI ---
const StatusIndicator = ({ status }: { status: TaskStatus }) => {
    const statusInfo = {
        'Tarefa em Atraso': { color: 'bg-[#FF1E56] shadow-[0_0_8px_rgba(255,30,86,0.6)]', text: 'Atrasada' },
        'Tarefa do Dia': { color: 'bg-[#E8C547] shadow-[0_0_8px_rgba(232,197,71,0.5)]', text: 'Para Hoje' },
        'Tarefa Futura': { color: 'bg-[#7DD3FC]', text: 'Futura' },
        'Sem tarefa': { color: 'bg-white/25', text: 'Sem Tarefa' },
    };
    const { color, text } = statusInfo[status] || statusInfo['Sem tarefa'];

    return (
        <div className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 ${color} rounded-full`}></span>
            <span className="text-text-secondary">{text}</span>
        </div>
    );
};

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

// --- Componente Principal ---
interface TaskListModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TaskListModal({ isOpen, onClose }: TaskListModalProps) {
    const { currentUser } = useAuth();
    const [leadsWithTasks, setLeadsWithTasks] = useState<LeadWithTaskStatus[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!currentUser) return;
            setLoading(true);

            try {
                // Buscar leads do usuário na estrutura correta
                const leadsRef = collection(db, 'leads');
                const leadsQuery = query(leadsRef, where('userId', '==', currentUser.uid));
                const leadsSnapshot = await getDocs(leadsQuery);
                const allLeads: Lead[] = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));

                const tarefasMap = await ensureTarefasPendentes(allLeads);
                const settledLeads = allLeads.map((lead) => ({
                    ...lead,
                    taskStatus: getTaskStatusInfo(tarefasMap.get(lead.id) || []),
                }));
                
                // Filtra para não mostrar tarefas futuras
                const leadsToShow = settledLeads.filter(
                    lead => lead.taskStatus !== 'Tarefa Futura'
                );

                leadsToShow.sort((a, b) => {
                    return TAREFA_STATUS_ORDER.indexOf(a.taskStatus) - TAREFA_STATUS_ORDER.indexOf(b.taskStatus);
                });

                setLeadsWithTasks(leadsToShow);
            } catch (error) {
                console.error('Erro ao buscar tarefas:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchTasks();
        }
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-start pt-16 sm:pt-24">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] p-6 w-full max-w-2xl relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 gx-line" />
                <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-[#FF5C7E] transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-6">Agenda de Tarefas</h2>
                
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {loading ? (
                        <LoadingState label="Carregando tarefas..." className="py-4" />
                    ) : leadsWithTasks.length === 0 ? (
                        <p className="text-text-secondary text-center py-4">Nenhuma tarefa encontrada.</p>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">
                                <tr>
                                    <th className="py-2 px-3">Lead</th>
                                    <th className="py-2 px-3">Status</th>
                                    <th className="py-2 px-3">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leadsWithTasks.map(lead => (
                                    <tr key={lead.id} className="border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                                        <td className="py-3 px-3 font-semibold text-white">{lead.nome}</td>
                                        <td className="py-3 px-3">
                                            <StatusIndicator status={lead.taskStatus} />
                                        </td>
                                        <td className="py-3 px-3">
                                            <Link href={`/dashboard/crm/${lead.id}`} onClick={onClose}>
                                                <span className="px-3 py-1 text-sm font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-lg shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] transition-all cursor-pointer">
                                                    Abrir
                                                </span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-white/10">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-xl transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
} 