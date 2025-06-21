'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Lead } from '@/types';

// --- Tipos e Constantes ---
interface Task {
    id: string;
    description: string;
    type: 'Ligação' | 'WhatsApp' | 'Visita';
    dueDate: Timestamp;
    status: 'pendente' | 'concluída' | 'cancelada';
}

type TaskStatus = 'Tarefa em Atraso' | 'Tarefa do Dia' | 'Tarefa Futura' | 'Sem tarefa';

interface LeadWithTaskStatus extends Lead {
    taskStatus: TaskStatus;
}

const TAREFA_STATUS_ORDER: TaskStatus[] = ['Tarefa em Atraso', 'Tarefa do Dia', 'Sem tarefa'];

// --- Componentes de UI ---
const StatusIndicator = ({ status }: { status: TaskStatus }) => {
    const statusInfo = {
        'Tarefa em Atraso': { color: 'bg-red-500', text: 'Atrasada' },
        'Tarefa do Dia': { color: 'bg-yellow-400', text: 'Para Hoje' },
        'Tarefa Futura': { color: 'bg-sky-500', text: 'Futura' },
        'Sem tarefa': { color: 'bg-gray-400', text: 'Sem Tarefa' },
    };
    const { color, text } = statusInfo[status] || statusInfo['Sem tarefa'];

    return (
        <div className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 ${color} rounded-full`}></span>
            <span className="text-gray-600 dark:text-gray-300">{text}</span>
        </div>
    );
};

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

// --- Funções de Ajuda ---
const getTaskStatusInfo = (tasks: Task[]): TaskStatus => {
    if (tasks.length === 0) return 'Sem tarefa';

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const hasOverdue = tasks.some(task => {
        const dueDate = task.dueDate.toDate();
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
    });
    if (hasOverdue) return 'Tarefa em Atraso';

    const hasTodayTask = tasks.some(task => {
        const dueDate = task.dueDate.toDate();
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === now.getTime();
    });
    if (hasTodayTask) return 'Tarefa do Dia';

    return 'Tarefa Futura';
};

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

            const leadsRef = collection(db, `leads/${currentUser.uid}/leads`);
            const leadsSnapshot = await getDocs(leadsRef);
            const allLeads: Lead[] = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));

            const leadsWithStatusPromises = allLeads.map(async (lead) => {
                const tasksCol = collection(db, `leads/${currentUser.uid}/leads`, lead.id, 'tarefas');
                const q = query(tasksCol, where('status', '==', 'pendente'));
                const tasksSnapshot = await getDocs(q);
                const tasks = tasksSnapshot.docs.map(doc => doc.data() as Task);

                const taskStatus = getTaskStatusInfo(tasks);
                return { ...lead, taskStatus };
            });

            const settledLeads = await Promise.all(leadsWithStatusPromises);
            
            // Filtra para não mostrar tarefas futuras
            const leadsToShow = settledLeads.filter(
                lead => lead.taskStatus !== 'Tarefa Futura'
            );

            leadsToShow.sort((a, b) => {
                return TAREFA_STATUS_ORDER.indexOf(a.taskStatus) - TAREFA_STATUS_ORDER.indexOf(b.taskStatus);
            });

            setLeadsWithTasks(leadsToShow);
            setLoading(false);
        };

        if (isOpen) {
            fetchTasks();
        }
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-start pt-16 sm:pt-24">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Agenda de Tarefas</h2>
                
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {loading ? (
                        <p className="text-gray-600 dark:text-gray-300 text-center py-4">Carregando tarefas...</p>
                    ) : leadsWithTasks.length === 0 ? (
                        <p className="text-gray-600 dark:text-gray-300 text-center py-4">Nenhuma tarefa encontrada.</p>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                                <tr>
                                    <th className="py-2 px-3">Lead</th>
                                    <th className="py-2 px-3">Status</th>
                                    <th className="py-2 px-3">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leadsWithTasks.map(lead => (
                                    <tr key={lead.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="py-3 px-3 font-semibold text-gray-800 dark:text-white">{lead.nome}</td>
                                        <td className="py-3 px-3">
                                            <StatusIndicator status={lead.taskStatus} />
                                        </td>
                                        <td className="py-3 px-3">
                                            <Link href={`/crm/${lead.id}`} onClick={onClose}>
                                                <span className="px-3 py-1 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors cursor-pointer">
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

                <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
} 