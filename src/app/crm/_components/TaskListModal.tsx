'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Lead } from '@/types';

const StatusIndicator = ({ status }: { status: string }) => {
    const statusColor = {
        'Sem tarefa': 'bg-gray-500 dark:bg-gray-600',
        'Tarefa em Atraso': 'bg-red-500',
        'Tarefa do Dia': 'bg-yellow-400',
        'Tarefa Futura': 'bg-sky-500',
    }[status] || 'bg-gray-500 dark:bg-gray-600';

    return <span className={`h-2.5 w-2.5 ${statusColor} rounded-full`}></span>;
};

interface TaskListModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

const TAREFA_STATUS_ORDER = ['Tarefa em Atraso', 'Tarefa do Dia', 'Tarefa Futura', 'Sem tarefa'];

export default function TaskListModal({ isOpen, onClose }: TaskListModalProps) {
    const { currentUser } = useAuth();
    const [tasks, setTasks] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !currentUser) {
            setTasks([]);
            return;
        };

        setLoading(true);
        const leadsRef = collection(db, `leads/${currentUser.uid}/leads`);
        const q = query(leadsRef, where('status', 'in', ['Tarefa em Atraso', 'Tarefa do Dia', 'Tarefa Futura']));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const leadsData: Lead[] = [];
            querySnapshot.forEach((doc) => {
                leadsData.push({ id: doc.id, ...doc.data() } as Lead);
            });
            
            const sortedLeads = leadsData.sort((a, b) => {
                const statusA = a.status || '';
                const statusB = b.status || '';
                return TAREFA_STATUS_ORDER.indexOf(statusA) - TAREFA_STATUS_ORDER.indexOf(statusB);
            });

            setTasks(sortedLeads);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar tarefas: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
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
                        <p>Carregando tarefas...</p>
                    ) : tasks.length === 0 ? (
                        <p className="text-gray-600 dark:text-gray-300">Nenhuma tarefa encontrada.</p>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-white">{task.nome}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{task.telefone}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <StatusIndicator status={task.status || 'Sem tarefa'} />
                                    <span>{task.status}</span>
                                </div>
                            </div>
                        ))
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