'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Lead } from '@/types';
import LoadingState from '@/components/ui/LoadingState';
import { ensureTarefasPendentes, getTaskStatusInfo, toJsDate, TarefaPendente, TaskStatus } from '@/lib/leadTasks';
import { getDemoLeads } from '@/lib/espelho/demoData';

// --- Tipos e Constantes ---
interface LeadWithTask extends Lead {
    taskStatus: TaskStatus;
    /** Próxima tarefa pendente (a de dueDate mais cedo) — null quando não há */
    nextTask: TarefaPendente | null;
    /** dueDate da próxima tarefa convertido para Date (null se ausente/inválido) */
    nextDue: Date | null;
}

// Ordem de urgência dos buckets (Futuras ficam fora da agenda)
const TAREFA_STATUS_ORDER: TaskStatus[] = ['Tarefa em Atraso', 'Tarefa do Dia', 'Sem tarefa'];

// Chip por tipo de tarefa — fórmula GX bg-{cor}/10 border-{cor}/35 (mesma paleta do atendimento)
const TIPO_CHIP: Record<string, string> = {
    'Ligação': 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]',
    'WhatsApp': 'bg-[#34D399]/10 border-[#34D399]/35 text-[#34D399]',
    'Visita': 'bg-[#E8C547]/10 border-[#E8C547]/35 text-[#FFE9A6]',
    'Meet': 'bg-[#9F6BFF]/10 border-[#9F6BFF]/35 text-[#C4A6FF]',
    'Follow-up': 'bg-[#FF7A97]/10 border-[#FF7A97]/35 text-[#FF9EB5]',
    'Produto': 'bg-[#F59E0B]/10 border-[#F59E0B]/35 text-[#FBBF24]',
    'Outros': 'bg-white/[0.05] border-white/15 text-text-secondary',
};
const tipoChip = (t: string) => TIPO_CHIP[t] ?? TIPO_CHIP['Outros'];

// "sex 18/07 · 14:30" — mesmo formato curto do circuito
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const quandoLabel = (d: Date) =>
    `${DIAS_SEMANA[d.getDay()]} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** Tarefa pendente com o dueDate mais cedo (tarefas sem data válida ficam por último). */
const proximaTarefa = (tasks: TarefaPendente[]): { task: TarefaPendente | null; due: Date | null } => {
    let best: TarefaPendente | null = null;
    let bestDue: Date | null = null;
    for (const task of tasks) {
        const due = toJsDate(task.dueDate);
        if (!due) continue;
        if (!bestDue || due.getTime() < bestDue.getTime()) {
            best = task;
            bestDue = due;
        }
    }
    if (!best && tasks.length > 0) best = tasks[0]; // só tarefas sem data válida
    return { task: best, due: bestDue };
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
    const { currentUser, isEspelhoDemo } = useAuth();
    const [leadsWithTasks, setLeadsWithTasks] = useState<LeadWithTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!currentUser) return;
            setLoading(true);

            try {
                let allLeads: Lead[];
                let tarefasMap: Map<string, TarefaPendente[]>;

                if (isEspelhoDemo) {
                    // Modo Espelho: leads de demonstração (sem Firestore)
                    allLeads = getDemoLeads().map(l => ({
                        ...l,
                        tarefasPendentes: (l.tasks || []).filter(t => t.status === 'pendente'),
                    })) as unknown as Lead[];
                    tarefasMap = new Map(allLeads.map(l => [l.id, l.tarefasPendentes || []]));
                } else {
                    // Buscar leads do usuário na estrutura correta
                    const leadsRef = collection(db, 'leads');
                    const leadsQuery = query(leadsRef, where('userId', '==', currentUser.uid));
                    const leadsSnapshot = await getDocs(leadsQuery);
                    allLeads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
                    tarefasMap = await ensureTarefasPendentes(allLeads);
                }

                const settledLeads: LeadWithTask[] = allLeads.map((lead) => {
                    const pendentes = tarefasMap.get(lead.id) || [];
                    const { task, due } = proximaTarefa(pendentes);
                    return {
                        ...lead,
                        taskStatus: getTaskStatusInfo(pendentes),
                        nextTask: task,
                        nextDue: due,
                    };
                });

                // Filtra para não mostrar tarefas futuras
                const leadsToShow = settledLeads.filter(
                    lead => lead.taskStatus !== 'Tarefa Futura'
                );

                // Urgência: atrasadas primeiro, depois as de hoje — e, dentro de cada
                // bucket, pela hora real da tarefa (sem tarefa fica por último)
                leadsToShow.sort((a, b) => {
                    const bucket = TAREFA_STATUS_ORDER.indexOf(a.taskStatus) - TAREFA_STATUS_ORDER.indexOf(b.taskStatus);
                    if (bucket !== 0) return bucket;
                    const aMs = a.nextDue ? a.nextDue.getTime() : Number.POSITIVE_INFINITY;
                    const bMs = b.nextDue ? b.nextDue.getTime() : Number.POSITIVE_INFINITY;
                    return aMs - bMs;
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
    }, [isOpen, currentUser, isEspelhoDemo]);

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
                                    <th className="py-2 px-3">Próxima tarefa</th>
                                    <th className="py-2 px-3 whitespace-nowrap">Quando</th>
                                    <th className="py-2 px-3">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leadsWithTasks.map(lead => {
                                    const atrasada = lead.taskStatus === 'Tarefa em Atraso';
                                    return (
                                        <tr key={lead.id} className="border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                                            <td className="py-3 px-3 font-semibold text-white max-w-[160px]">
                                                <span className="block truncate">{lead.nome}</span>
                                            </td>
                                            <td className="py-3 px-3 max-w-[220px]">
                                                {lead.nextTask ? (
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${tipoChip(lead.nextTask.type)}`}>
                                                            {lead.nextTask.type || 'Outros'}
                                                        </span>
                                                        {lead.nextTask.description && (
                                                            <span className="text-sm text-text-secondary truncate" title={lead.nextTask.description}>
                                                                {lead.nextTask.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-white/35">Sem tarefa marcada</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 whitespace-nowrap">
                                                {lead.nextDue ? (
                                                    <span className={`text-sm tabular-nums ${atrasada ? 'text-[#FF7A97] font-semibold' : 'text-text-secondary'}`}>
                                                        {quandoLabel(lead.nextDue)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-white/25">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3">
                                                <Link href={`/dashboard/crm/${lead.id}`} onClick={onClose}>
                                                    <span className="px-3 py-1 text-sm font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-lg shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] transition-all cursor-pointer whitespace-nowrap">
                                                        Abrir
                                                    </span>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
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
