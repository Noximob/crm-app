'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocs, onSnapshot, updateDoc, collection, query, orderBy, addDoc, serverTimestamp, where, writeBatch, limit } from 'firebase/firestore';
import { TarefaPendente, fetchPendentesDaSubcolecao } from '@/lib/leadTasks';
import Link from 'next/link';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { Lead } from '@/types';
import LogInteractionModal from '../_components/LogInteractionModal';
import CrmHeader from '../_components/CrmHeader';
import AgendaModal, { TaskPayload } from '../_components/AgendaModal';
import CancelTaskModal from '../_components/CancelTaskModal';
import { getDemoLeadById, getDemoInteractions } from '@/lib/espelho/demoData';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';


// --- Ícones ---
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const TaskIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>;
const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;


// --- Funções de Ajuda ---
type TaskStatus = 'Tarefa em Atraso' | 'Tarefa do Dia' | 'Tarefa Futura' | 'Sem tarefa';

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

const getTaskStatusColor = (status: TaskStatus) => {
    switch (status) {
        case 'Tarefa em Atraso': return 'bg-[#FF1E56] shadow-[0_0_8px_rgba(255,30,86,0.8)]';
        case 'Tarefa do Dia': return 'bg-[#E8C547] shadow-[0_0_8px_rgba(232,197,71,0.8)]';
        case 'Tarefa Futura': return 'bg-[#7DD3FC] shadow-[0_0_8px_rgba(125,211,252,0.7)]';
        case 'Sem tarefa': return 'bg-white/30';
        default: return 'bg-white/30';
    }
};

const getIconForInteraction = (type: string) => {
    switch (type) {
        case 'Ligação': return <PhoneIcon className="h-5 w-5 text-[#7DD3FC] drop-shadow-[0_0_6px_rgba(125,211,252,0.5)]" />;
        case 'WhatsApp': return <WhatsAppIcon className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />;
        case 'Visita': return <BuildingIcon className="h-5 w-5 text-[#C4A6FF] drop-shadow-[0_0_6px_rgba(159,107,255,0.5)]" />;
        case 'Tarefa Agendada': return <TaskIcon className="h-5 w-5 text-[#7DD3FC] drop-shadow-[0_0_6px_rgba(125,211,252,0.5)]" />;
        case 'Tarefa Concluída': return <CheckCircleIcon className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />;
        case 'Tarefa Cancelada': return <XCircleIcon className="h-5 w-5 text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.5)]" />;
        default: return <div className="h-5 w-5 bg-white/20 rounded-full" />; // Um ícone padrão
    }
};

// Cor da borda lateral do histórico (apenas visual)
const getInteractionBorderClass = (type: string) => {
    switch (type) {
        case 'Ligação': return 'border-l-[#7DD3FC]/60';
        case 'WhatsApp': return 'border-l-emerald-400/60';
        case 'Visita': return 'border-l-[#9F6BFF]/60';
        case 'Tarefa Agendada': return 'border-l-[#7DD3FC]/60';
        case 'Tarefa Concluída': return 'border-l-emerald-400/60';
        case 'Tarefa Cancelada': return 'border-l-red-400/60';
        default: return 'border-l-white/20';
    }
};

const getCategoryTitle = (key: string) => {
    switch (key) {
        case 'finalidade': return 'Finalidade';
        case 'estagio': return 'Estágio do Imóvel';
        case 'quartos': return 'Quartos';
        case 'localizacao': return 'Localização';
        case 'tipo': return 'Tipo do Imóvel';
        case 'vagas': return 'Vagas de Garagem';
        case 'valor': return 'Valor do Imóvel';
        default: return key;
    }
};

interface Interaction {
    id: string;
    type: string;
    notes: string;
    timestamp: any;
    taskId?: string;
    cancellationNotes?: string;
}

interface QualificationData {
    [key: string]: string[];
}

interface Task {
    id: string;
    description: string;
    type: 'Ligação' | 'WhatsApp' | 'Visita' | 'Outros';
    dueDate: any; // Firestore timestamp
    status: 'pendente' | 'concluída' | 'cancelada';
}

export default function LeadDetailPage() {
    const { currentUser, userData, isEspelhoDemo } = useAuth();
    const { stages, normalizeEtapa } = usePipelineStages();
    const params = useParams();
    const searchParams = useSearchParams();
    const leadId = params.leadId as string;
    const viewAs = searchParams.get('viewAs') === '1';
    const isAdmin = userData?.permissoes?.admin || userData?.tipoConta === 'imobiliaria';
    const readOnly = viewAs && isAdmin;

    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [interactionType, setInteractionType] = useState('');
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingAnnotations, setIsEditingAnnotations] = useState(false);
    const [tempAnnotations, setTempAnnotations] = useState('');
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [tasksLoaded, setTasksLoaded] = useState(false);
    const [taskStatus, setTaskStatus] = useState<TaskStatus>('Sem tarefa');
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [taskToCancel, setTaskToCancel] = useState<{ interactionId: string; taskId: string } | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [qualifications, setQualifications] = useState<QualificationData>({});
    const [isQualificationModalOpen, setIsQualificationModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);


    // --- Lógica para buscar os dados do lead ---
    useEffect(() => {
        if (isEspelhoDemo && leadId) {
            const demoLead = getDemoLeadById(leadId);
            if (demoLead) {
                const leadData = { ...demoLead, automacao: { status: 'inativa' as const } } as unknown as Lead;
                setLead(leadData);
                setTempAnnotations((leadData as any).anotacoes || '');
                const qual = demoLead.qualificacao || {};
                const safe: QualificationData = {};
                Object.entries(qual).forEach(([k, v]) => {
                    safe[k] = Array.isArray(v) ? v : [v as string];
                });
                setQualifications(safe);
                setTasks(demoLead.tasks || []);
                setTaskStatus(getTaskStatusInfo(demoLead.tasks || []));
                setInteractions(getDemoInteractions(leadId));
            } else {
                setLead(null);
            }
            setLoading(false);
            return;
        }
        if (!currentUser || !leadId) return;
        // Busca o lead diretamente da coleção principal 'leads'
        const leadRef = doc(db, 'leads', leadId);
        const unsubscribe = onSnapshot(leadRef, async (docSnap) => {
            if (docSnap.exists()) {
                const leadData = { id: docSnap.id, ...docSnap.data() } as Lead;

                // Verificação de segurança: usuário só pode ver seus próprios leads OU ser administrador da imobiliária
                if (leadData.userId !== currentUser.uid) {
                    // Verificar se o usuário atual é administrador da imobiliária
                    const userRef = doc(db, 'usuarios', currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const isAdmin = userData.permissoes?.admin || userData.tipoConta === 'imobiliaria';
                        
                        if (!isAdmin) {
                            console.error("Acesso negado: Este lead não pertence a você e você não é administrador.");
                            setLead(null);
                            setLoading(false);
                            return;
                        }
                    } else {
                    console.error("Acesso negado: Este lead não pertence a você.");
                    setLead(null);
                    setLoading(false);
                    return;
                    }
                }

                if (!leadData.automacao) {
                    leadData.automacao = { status: 'inativa' };
                }
                setLead(leadData);
                setTempAnnotations(leadData.anotacoes || '');
                
                // Verificação de segurança para qualificações
                const qualificacao = leadData.qualificacao || {};
                const safeQualificacao: QualificationData = {};
                
                // Garantir que todas as qualificações sejam arrays
                Object.entries(qualificacao).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        safeQualificacao[key] = value;
                    } else if (typeof value === 'string') {
                        // Se for string, converter para array (compatibilidade com dados antigos)
                        safeQualificacao[key] = [value];
                    }
                });
                
                setQualifications(safeQualificacao);
            } else {
                setLead(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, leadId, isEspelhoDemo]);

    useEffect(() => {
        if (!currentUser || !leadId || isEspelhoDemo) return;
        // Caminhos atualizados para as sub-coleções
        const interactionsCol = collection(db, 'leads', leadId, 'interactions');
        const q = query(interactionsCol, orderBy('timestamp', 'desc'), limit(200));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedInteractions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interaction));
            setInteractions(fetchedInteractions);
        });

        return () => unsubscribe();
    }, [currentUser, leadId]);

    // Garante que toda tarefa pendente tenha sua interação "Tarefa Agendada" na lista,
    // mesmo que ela seja mais antiga que as 200 interações carregadas — senão os botões
    // de concluir/cancelar não aparecem para tarefas antigas.
    const [extraInteractions, setExtraInteractions] = useState<Interaction[]>([]);
    const fetchedExtraTaskIds = React.useRef<Set<string>>(new Set());
    useEffect(() => {
        if (!currentUser || !leadId || isEspelhoDemo || tasks.length === 0) return;
        const faltando = tasks.filter(t =>
            !interactions.some(i => i.taskId === t.id) &&
            !fetchedExtraTaskIds.current.has(t.id)
        );
        if (faltando.length === 0) return;
        faltando.forEach(t => fetchedExtraTaskIds.current.add(t.id));
        (async () => {
            try {
                const interactionsCol = collection(db, 'leads', leadId, 'interactions');
                const resultados = await Promise.all(faltando.map(t =>
                    getDocs(query(interactionsCol, where('taskId', '==', t.id)))
                ));
                const extras = resultados.flatMap(snap =>
                    snap.docs.map(d => ({ id: d.id, ...d.data() } as Interaction))
                );
                if (extras.length > 0) {
                    setExtraInteractions(prev => {
                        const vistos = new Set(prev.map(i => i.id));
                        return [...prev, ...extras.filter(i => !vistos.has(i.id))];
                    });
                }
            } catch (err) {
                console.error('Erro ao buscar interações de tarefas antigas:', err);
            }
        })();
    }, [tasks, interactions, currentUser, leadId, isEspelhoDemo]);

    // Lista final: 200 mais recentes + interações resgatadas de tarefas antigas (sem duplicar)
    const interacoesVisiveis = React.useMemo(() => {
        if (extraInteractions.length === 0) return interactions;
        const ids = new Set(interactions.map(i => i.id));
        const extras = extraInteractions.filter(i => !ids.has(i.id));
        if (extras.length === 0) return interactions;
        const ts = (i: Interaction) => {
            const t: any = i.timestamp;
            return t?.toDate ? t.toDate().getTime() : (t?.seconds ? t.seconds * 1000 : 0);
        };
        return [...interactions, ...extras].sort((a, b) => ts(b) - ts(a));
    }, [interactions, extraInteractions]);

    useEffect(() => {
        if (!currentUser || !leadId || isEspelhoDemo) return;
        const tasksCol = collection(db, 'leads', leadId, 'tarefas');
        const q = query(tasksCol, where('status', '==', 'pendente'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(fetchedTasks);
            setTasksLoaded(true);
            // Calcular e atualizar o status da tarefa
            const newTaskStatus = getTaskStatusInfo(fetchedTasks);
            setTaskStatus(newTaskStatus);
        });

        return () => unsubscribe();
    }, [currentUser, leadId]);

    const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!currentUser || !lead || isEspelhoDemo) return;
        const newEtapa = e.target.value;
        const leadRef = doc(db, 'leads', lead.id);
        try {
            await updateDoc(leadRef, { etapa: newEtapa });
        } catch (error) {
            console.error("Erro ao atualizar etapa:", error);
        }
    };

    const openInteractionModal = (type: string) => {
        setInteractionType(type);
        setIsModalOpen(true);
    };

    const handleLogInteraction = async (notes: string) => {
        if (!currentUser || !leadId || isEspelhoDemo) return;
        setIsSaving(true);
        const interactionsCol = collection(db, 'leads', leadId, 'interactions');
        try {
            await addDoc(interactionsCol, {
                type: interactionType,
                notes,
                timestamp: serverTimestamp()
            });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar interação:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAnnotations = async () => {
        if (!currentUser || !lead || isEspelhoDemo) return;
        const leadRef = doc(db, 'leads', lead.id);
        try {
            await updateDoc(leadRef, { anotacoes: tempAnnotations });
            setIsEditingAnnotations(false);
        } catch (error) {
            console.error("Erro ao salvar anotações:", error);
        }
    };

    const handleSaveTask = async (task: TaskPayload) => {
        if (!currentUser || !leadId || isEspelhoDemo) return;
        setIsSavingTask(true);

        const { description, type, date, time } = task;
        // Cria a data/hora exatamente como o corretor escolheu (horário local),
        // sem aplicar ajustes manuais de fuso para evitar deslocar para 06:00 etc.
        const dueDate = new Date(`${date}T${time}`);

        try {
            // Base do espelho: usa o snapshot em memória; se ele ainda não hidratou,
            // busca a subcoleção direto para não apagar tarefas existentes do espelho
            const basePendentes: TarefaPendente[] = tasksLoaded
                ? tasks.map(t => ({ id: t.id, description: t.description, type: t.type, dueDate: t.dueDate }))
                : await fetchPendentesDaSubcolecao(leadId);

            // Tarefa + espelho no lead + interação num único batch atômico
            const batch = writeBatch(db);
            const tasksCol = collection(db, 'leads', leadId, 'tarefas');
            const taskRef = doc(tasksCol);
            batch.set(taskRef, {
                description,
                type,
                dueDate,
                status: 'pendente'
            });

            const tarefasPendentes: TarefaPendente[] = [
                ...basePendentes,
                { id: taskRef.id, description, type, dueDate },
            ];
            batch.update(doc(db, 'leads', leadId), { tarefasPendentes });

            const interactionsCol = collection(db, 'leads', leadId, 'interactions');
            batch.set(doc(interactionsCol), {
                type: 'Tarefa Agendada',
                notes: description,
                timestamp: serverTimestamp(),
                taskId: taskRef.id
            });

            await batch.commit();
            setIsAgendaModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar tarefa:", error);
        } finally {
            setIsSavingTask(false);
        }
    };

    const handleUpdateTaskStatus = async (interactionId: string, taskId: string, status: 'concluída' | 'cancelada', reason?: string) => {
        if (!currentUser || !leadId || isEspelhoDemo) return;
        if (updatingTaskId) return; // evita duplo clique / dupla submissão
        setUpdatingTaskId(taskId);
        if (status === 'cancelada') setIsCancelling(true);

        const batch = writeBatch(db);

        // Atualizar o status da tarefa
        const taskRef = doc(db, 'leads', leadId, 'tarefas', taskId);
        batch.update(taskRef, { status });

        // Manter o espelho de tarefas pendentes no doc do lead (remove a tarefa concluída/cancelada)
        const tarefasPendentes: TarefaPendente[] = tasks
            .filter(t => t.id !== taskId)
            .map(t => ({ id: t.id, description: t.description, type: t.type, dueDate: t.dueDate }));
        batch.update(doc(db, 'leads', leadId), { tarefasPendentes });

        // Adicionar interação de conclusão/cancelamento
        const interactionsCol = collection(db, 'leads', leadId, 'interactions');
        const interactionData: any = {
            type: status === 'concluída' ? 'Tarefa Concluída' : 'Tarefa Cancelada',
            notes: status === 'concluída' ? 'Tarefa marcada como concluída' : 'Tarefa cancelada',
            timestamp: serverTimestamp(),
            taskId
        };

        if (reason) {
            interactionData.cancellationNotes = reason;
        }

        batch.set(doc(interactionsCol), interactionData);

        try {
            await batch.commit();
            setIsCancelModalOpen(false);
            setTaskToCancel(null);
        } catch (error) {
            console.error("Erro ao atualizar status da tarefa:", error);
        } finally {
            setUpdatingTaskId(null);
            if (status === 'cancelada') setIsCancelling(false);
        }
    };

    const openCancelModal = (interactionId: string, taskId: string) => {
        setTaskToCancel({ interactionId, taskId });
        setIsCancelModalOpen(true);
    };

    const handleQualificationChange = (groupKey: string, value: string) => {
        setQualifications(prev => {
            const currentValues = prev[groupKey] || [];
            
            if (currentValues.includes(value)) {
                // Remove o valor se já estiver selecionado
                const newValues = currentValues.filter(v => v !== value);
                if (newValues.length === 0) {
                    // Se não há mais valores, remove a categoria
                    const newQuals = { ...prev };
                    delete newQuals[groupKey];
                    return newQuals;
                } else {
                    return { ...prev, [groupKey]: newValues };
                }
            } else {
                // Adiciona o valor à lista
                return { ...prev, [groupKey]: [...currentValues, value] };
            }
        });
    };

    const handleCloseQualificationModal = () => {
        setIsQualificationModalOpen(false);
    };

    const handleSaveQualifications = async () => {
        if (!currentUser || !lead || isEspelhoDemo) return;
        const leadRef = doc(db, 'leads', lead.id);
        try {
            await updateDoc(leadRef, { qualificacao: qualifications });
            handleCloseQualificationModal();
        } catch (error) {
            console.error("Erro ao salvar qualificações:", error);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingState label="Carregando dados do lead..." />
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-text-secondary">Lead não encontrado.</p>
                </div>
            </div>
        );
    }

    // Usar o status da tarefa calculado no useEffect

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
            <CrmHeader />
            {readOnly && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6] text-sm font-medium flex items-center gap-2">
                <span>👁️</span> Visualizando CRM do corretor — somente leitura. Você não pode editar etapas, tarefas, anotações ou qualificação.
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* --- COLUNA DA ESQUERDA (20% a mais) --- */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Card de Informações do Lead */}
                    <div className="al-card relative overflow-hidden p-5">
                        <div className="absolute inset-x-0 top-0 gx-line" />
                        <div className="flex flex-col gap-3">
                            <div className="order-1 flex items-center gap-3">
                                <h2 className="al-display text-[22px] font-bold text-white uppercase tracking-wide leading-none truncate">{lead.nome}</h2>
                                <span className={`h-2 w-2 rounded-full shrink-0 ${getTaskStatusColor(taskStatus)}`}></span>
                            </div>
                            <div className="order-3 lg:hidden grid grid-cols-2 gap-3">
                                <a
                                    href={`tel:${lead.telefone.replace(/\D/g, '')}`}
                                    className="h-12 flex items-center justify-center gap-2 rounded-xl border border-[#7DD3FC]/40 bg-[#7DD3FC]/[0.08] text-[#7DD3FC] text-sm font-bold active:scale-[0.98] transition-all"
                                >
                                    <PhoneIcon className="h-4 w-4 shrink-0" /> Ligar
                                </a>
                                <a
                                    href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-12 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-sm font-bold active:scale-[0.98] transition-all"
                                >
                                    <WhatsAppIcon className="h-4 w-4 fill-current shrink-0" /> WhatsApp
                                </a>
                            </div>
                            <div className="order-4 lg:order-2 flex items-center justify-between gap-3">
                                {readOnly ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#FF1E56]/10 border border-[#FF1E56]/35 text-[#FF7A97]">{normalizeEtapa(lead.etapa)}</span>
                                ) : (
                                  <select 
                                    id="lead-situation" 
                                    value={normalizeEtapa(lead.etapa)} 
                                    onChange={handleStageChange} 
                                    className="flex-1 min-h-[44px] lg:flex-none lg:min-h-0 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#FF1E56]/10 border border-[#FF1E56]/35 rounded-full text-[#FF7A97] focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 [&>option]:bg-[#12101a] [&>option]:text-white"
                                  >
                                    {stages.map(s => (<option key={s} value={s}>{s}</option>))}
                                  </select>
                                )}
                                {!readOnly && (
                                  <div className="flex flex-col items-center gap-1">
                                    <button 
                                        onClick={() => setIsAgendaModalOpen(true)} 
                                        className="w-10 h-10 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white rounded-full flex items-center justify-center transition-all duration-200 active:scale-[0.98] shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]"
                                        title="Agendar Tarefa"
                                    >
                                        <TaskIcon className="h-5 w-5"/>
                                    </button>
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Tarefas</span>
                                  </div>
                                )}
                            </div>
                                <div className="order-2 lg:order-3 flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 w-fit">
                                <PhoneIcon className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                                <p className="text-xs text-white tabular-nums">{lead.telefone}</p>
                                    <a
                                        href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hidden lg:block text-emerald-400 hover:text-emerald-300 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                    <WhatsAppIcon className="h-3 w-3 fill-current"/>
                                    </a>
                                </div>
                        </div>
                    </div>

                    {/* Card de Próximos Passos */}
                    <div className="al-card relative overflow-hidden p-5">
                        <div className="absolute inset-x-0 top-0 gx-line" />
                        <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Próximos Passos</h3>
                        <div className="max-h-[50vh] lg:max-h-none lg:h-48 overflow-y-auto pr-2">
                            {interacoesVisiveis.length > 0 ? (
                                <ul className="space-y-3">
                                    {interacoesVisiveis.map(interaction => {
                                        const isPendingTask = interaction.type === 'Tarefa Agendada' &&
                                            interaction.taskId &&
                                            tasks.some(task => task.id === interaction.taskId);
                                         
                                         // Buscar a tarefa correspondente para obter horário e tag (Ligação/Visita/WhatsApp)
                                         const relatedTask = tasks.find(task => task.id === interaction.taskId);
                                         const taskTag = relatedTask?.type ?? interaction.type;

                                         return (
                                             <li key={interaction.id} className={`flex items-start gap-3 bg-white/[0.03] border border-white/[0.08] border-l-2 ${getInteractionBorderClass(taskTag)} rounded-xl p-3 hover:bg-white/[0.04] transition-colors`}>
                                                 <div className="bg-white/[0.06] border border-white/[0.08] p-2 rounded-full">
                                                     {getIconForInteraction(taskTag)}
                                                 </div>
                                                 <div className="flex-1 min-w-0">
                                                     <p className="al-display font-bold text-white text-[12px] uppercase tracking-wider">{taskTag}</p>
                                                     <p className="text-xs text-text-secondary">{interaction.notes}</p>
                                                     
                                                     {interaction.type === 'Tarefa Cancelada' && interaction.cancellationNotes && (
                                                         <p className="text-xs text-red-300 mt-1">
                                                             <span className="font-semibold">Motivo:</span> {interaction.cancellationNotes}
                                                         </p>
                                                     )}

{isPendingTask && !readOnly && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <button
                                                                 onClick={() => handleUpdateTaskStatus(interaction.id, interaction.taskId!, 'concluída')}
                                                                 disabled={updatingTaskId === interaction.taskId}
                                                                 className="px-2 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                             >
                                                                 Concluída
                                                             </button>
                                                             <button
                                                                 onClick={() => openCancelModal(interaction.id, interaction.taskId!)}
                                                                 className="px-2 py-1 text-xs font-bold text-red-300 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
                                                             >
                                                                 Cancelar
                                                             </button>
                                                         </div>
                                                     )}

                                                     <div className="mt-2 flex items-center gap-3 text-xs">
                                                         <span className="text-white/35 tabular-nums">
                                                             Criado: {interaction.timestamp ? new Date(interaction.timestamp.seconds * 1000).toLocaleString('pt-BR') : 'Data indisponível'}
                                                         </span>
                                                         {relatedTask && (
                                                             <span className="text-[#FFE9A6] font-medium tabular-nums">
                                                                 Agendado: {relatedTask.dueDate ? new Date(relatedTask.dueDate.seconds * 1000).toLocaleString('pt-BR') : 'Data indisponível'}
                                                             </span>
                                                         )}
                                                     </div>
                    </div>
                                                 {/* Botão para ver descrição completa */}
                                                <button
                                                    onClick={() => {
                                                        let descricaoCompleta = `Descrição completa da ${(taskTag || interaction.type).toString().toLowerCase()}:\n\n${interaction.notes}`;
                                                         
                                                         // Adicionar motivo de cancelamento se existir
                                                         if (interaction.type === 'Tarefa Cancelada' && interaction.cancellationNotes) {
                                                             descricaoCompleta += `\n\nMotivo do cancelamento:\n${interaction.cancellationNotes}`;
                                                         }
                                                         
                                                         // Adicionar horário agendado se existir
                                                         if (relatedTask && relatedTask.dueDate) {
                                                             const horarioAgendado = new Date(relatedTask.dueDate.seconds * 1000).toLocaleString('pt-BR');
                                                             descricaoCompleta += `\n\nHorário agendado: ${horarioAgendado}`;
                                                         }
                                                         
                                                         showToast(descricaoCompleta, 'info');
                                                     }}
                                                     className="text-text-secondary hover:text-[#FF5C7E] transition-colors p-1"
                                                     title="Ver descrição completa"
                                                 >
                                                     <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                     </svg>
                                                 </button>
                                             </li>
                                         );
                                     })}
                                 </ul>
                             ) : (
                                 <div className="h-full min-h-[120px] flex items-center justify-center">
                                     <p className="text-center text-text-secondary text-sm">Nenhuma ação registrada ainda.</p>
                                 </div>
                             )}
                        </div>
                    </div>


                </div>

                {/* --- COLUNA DA DIREITA (20% a menos) --- */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* Card de Qualificação do Lead */}
                    <div className="al-card relative overflow-hidden p-6">
                        <div className="absolute inset-x-0 top-0 gx-line" />
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Qualificação do Lead</h3>
                                            {!readOnly && (
                                <button
                                  onClick={() => setIsQualificationModalOpen(true)}
                                  className="px-3 py-1.5 text-xs font-bold text-white border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-colors"
                                >
                                  Editar Qualificação
                                </button>
                                            )}
                        </div>
                        
                        {/* Exibição compacta em linha única com separadores simples */}
                        <div className="space-y-3">
                            {Object.keys(qualifications).length > 0 ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {Object.entries(qualifications).map(([key, values], index) => {
                                        // Verificação de segurança para garantir que values é um array
                                        if (!Array.isArray(values)) {
                                            return null;
                                        }
                                        
                                        return (
                                            <React.Fragment key={key}>
                                                {values.map((value, valueIndex) => (
                                                    <span 
                                                        key={`${key}-${valueIndex}`}
                                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#9F6BFF]/10 border border-[#9F6BFF]/35 text-[#C4A6FF]"
                                                    >
                                                        {value}
                                                    </span>
                                                ))}
                                                {/* Separador simples entre categorias */}
                                                {index < Object.keys(qualifications).length - 1 && (
                                                    <span className="text-white/20 mx-1">—</span>
                                                )}
                                            </React.Fragment>
                                        );
                                    }).filter(Boolean)}
                                    </div>
                            ) : (
                                <div className="text-center py-6 text-text-secondary">
                                    <p className="text-sm">Nenhuma qualificação definida</p>
                                    <p className="text-xs mt-1">Clique em "Editar Qualificação" para começar</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card de Anotações */}
                    <div className="al-card relative overflow-hidden p-6 flex flex-col h-56">
                        <div className="absolute inset-x-0 top-0 gx-line" />
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Anotações</h3>
                            {!readOnly && !isEditingAnnotations && (
                                <button onClick={() => setIsEditingAnnotations(true)} className="text-sm font-bold text-[#FF7A97] hover:text-[#FF9EB5] transition-colors">Editar</button>
                            )}
                        </div>
                        <div className="flex-grow min-h-0">
                            {isEditingAnnotations ? (
                                <div className="flex flex-col h-full">
                                    <textarea
                                        value={tempAnnotations}
                                        onChange={(e) => setTempAnnotations(e.target.value)}
                                        className="w-full flex-grow bg-white/[0.04] border border-white/10 rounded-lg p-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 resize-none"
                                        placeholder="Adicione suas anotações aqui..."
                                    />
                                    <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
                                        <button onClick={() => { setIsEditingAnnotations(false); setTempAnnotations(lead.anotacoes || ''); }} className="px-3 py-1 text-sm font-semibold text-white border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-colors">Cancelar</button>
                                        <button onClick={handleSaveAnnotations} className="px-3 py-1 text-sm font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all">Confirmar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="prose prose-sm prose-invert max-w-none overflow-y-auto h-full pr-2">
                                    <p className="whitespace-pre-wrap text-text-secondary">
                                        {lead.anotacoes || 'Nenhuma anotação registrada.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    
                </div>
            </div>
            
            <LogInteractionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleLogInteraction}
                interactionType={interactionType}
                isLoading={isSaving}
            />

            <AgendaModal 
                isOpen={isAgendaModalOpen}
                onClose={() => setIsAgendaModalOpen(false)}
                onSave={handleSaveTask}
                isLoading={isSavingTask}
            />

            <CancelTaskModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={(reason: string) => {
                    if (taskToCancel) {
                        handleUpdateTaskStatus(taskToCancel.interactionId, taskToCancel.taskId, 'cancelada', reason);
                    }
                }}
                isLoading={isCancelling}
            />

            {/* Modal de Qualificação */}
            <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm ${isQualificationModalOpen ? 'visible' : 'invisible'}`}>
                <div className="bg-[#12101a] border border-white/10 p-6 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto">
                    <div className="absolute inset-x-0 top-0 gx-line" />
                    <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Editar Qualificação</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {QUALIFICATION_QUESTIONS.map((group) => (
                            <div key={group.key}>
                                <h4 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">{group.title}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {group.options.map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => handleQualificationChange(group.key, option)}
                                            className={`px-3 py-2 text-sm font-medium border rounded-lg transition-all duration-150 ${
                                                Array.isArray(qualifications[group.key]) && qualifications[group.key].includes(option)
                                                ? 'bg-[#FF1E56]/15 border-[#FF1E56]/60 text-[#FF9EB5] shadow-[0_0_12px_-2px_rgba(255,30,86,0.4)]'
                                                : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08]'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={handleCloseQualificationModal} className="px-4 py-2 text-sm font-semibold text-white border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-colors">Cancelar</button>
                        <button onClick={handleSaveQualifications} className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all">Salvar</button>
                    </div>
                </div>
            </div>


        </div>
    );
}

const QUALIFICATION_QUESTIONS = [
    {
        title: 'Finalidade',
        key: 'finalidade',
        options: ['Moradia', 'Veraneio', 'Investimento', 'Locação', 'Imóvel à Venda'],
    },
    {
        title: 'Estágio do Imóvel',
        key: 'estagio',
        options: ['Lançamento', 'Em Construção', 'Pronto para Morar'],
    },
    {
        title: 'Quartos',
        key: 'quartos',
        options: ['1 quarto', '2 quartos', '1 Suíte + 1 Quarto', '3 quartos', '4 quartos'],
    },
    {
        title: 'Localização',
        key: 'localizacao',
        options: ['Penha', 'Piçarras', 'Barra Velha', 'Outros'],
    },
    {
        title: 'Tipo do Imóvel',
        key: 'tipo',
        options: ['Apartamento', 'Casa', 'Terreno'],
    },
    {
        title: 'Vagas de Garagem',
        key: 'vagas',
        options: ['1', '2', '3+'],
    },
    {
        title: 'Valor do Imóvel',
        key: 'valor',
        options: ['< 500k', '500k-800k', '800k-1.2M', '1.2M-2M', '> 2M'],
    },
]; 