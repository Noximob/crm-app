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
import { formatarTelefone, linkWhatsApp, linkTelefone } from '@/lib/telefone';

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

const WhatsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z"/>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23z"/>
    </svg>
);

const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
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
                                            <td className="py-3 px-3 max-w-[200px]">
                                                <span className="block truncate font-semibold text-white">{lead.nome}</span>
                                                {lead.telefone && (
                                                    <span className="mt-0.5 flex items-center gap-1.5">
                                                        <span className="text-[11px] text-text-secondary tabular-nums">{formatarTelefone(lead.telefone)}</span>
                                                        <a
                                                            href={linkTelefone(lead.telefone)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="Ligar"
                                                            aria-label={`Ligar para ${lead.nome}`}
                                                            className="grid place-items-center w-5 h-5 rounded-md text-[#7DD3FC] hover:bg-[#7DD3FC]/15 transition-colors"
                                                        >
                                                            <PhoneIcon className="w-3 h-3" />
                                                        </a>
                                                        <a
                                                            href={linkWhatsApp(lead.telefone)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="Abrir no WhatsApp"
                                                            aria-label={`WhatsApp de ${lead.nome}`}
                                                            className="grid place-items-center w-5 h-5 rounded-md text-[#34D399] hover:bg-[#34D399]/15 transition-colors"
                                                        >
                                                            <WhatsIcon className="w-3.5 h-3.5" />
                                                        </a>
                                                    </span>
                                                )}
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
