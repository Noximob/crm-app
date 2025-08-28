'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc, collection, query, orderBy, addDoc, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { PIPELINE_STAGES } from '@/lib/constants';
import { Lead } from '@/types';
import LogInteractionModal from '../_components/LogInteractionModal';
import CrmHeader from '../_components/CrmHeader';
import AgendaModal, { TaskPayload } from '../_components/AgendaModal';
import CancelTaskModal from '../_components/CancelTaskModal';


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
        case 'Tarefa em Atraso': return 'bg-red-500';
        case 'Tarefa do Dia': return 'bg-yellow-400';
        case 'Tarefa Futura': return 'bg-sky-500';
        case 'Sem tarefa': return 'bg-gray-400';
        default: return 'bg-gray-400';
    }
};

const getIconForInteraction = (type: string) => {
    switch (type) {
        case 'Ligação': return <PhoneIcon className="h-5 w-5 text-primary-600" />;
        case 'WhatsApp': return <WhatsAppIcon className="h-5 w-5 text-green-600" />;
        case 'Visita': return <BuildingIcon className="h-5 w-5 text-indigo-600" />;
        case 'Tarefa Agendada': return <TaskIcon className="h-5 w-5 text-sky-600" />;
        case 'Tarefa Concluída': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
        case 'Tarefa Cancelada': return <XCircleIcon className="h-5 w-5 text-red-500" />;
        default: return <div className="h-5 w-5 bg-gray-300 rounded-full" />; // Um ícone padrão
    }
};

const getCategoryTitle = (key: string) => {
    switch (key) {
        case 'finalidade': return 'Finalidade';
        case 'estagio': return 'Estágio do Imóvel';
        case 'quartos': return 'Quartos';
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
    type: 'Ligação' | 'WhatsApp' | 'Visita';
    dueDate: any; // Firestore timestamp
    status: 'pendente' | 'concluída' | 'cancelada';
}

export default function LeadDetailPage() {
    const { currentUser } = useAuth();
    const params = useParams();
    const leadId = params.leadId as string;

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
    const [taskStatus, setTaskStatus] = useState<TaskStatus>('Sem tarefa');
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [taskToCancel, setTaskToCancel] = useState<{ interactionId: string; taskId: string } | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [qualifications, setQualifications] = useState<QualificationData>({});
    const [isQualificationModalOpen, setIsQualificationModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);


    // --- Lógica para buscar os dados do lead ---
    useEffect(() => {
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
                    } else {
                        console.warn(`Qualificação ${key} com tipo inválido:`, value);
                    }
                });
                
                setQualifications(safeQualificacao);
            } else {
                console.log("No such document!");
                setLead(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, leadId]);

    useEffect(() => {
        if (!currentUser || !leadId) return;
        // Caminhos atualizados para as sub-coleções
        const interactionsCol = collection(db, 'leads', leadId, 'interactions');
        const q = query(interactionsCol, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedInteractions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interaction));
            setInteractions(fetchedInteractions);
        });

        return () => unsubscribe();
    }, [currentUser, leadId]);

    useEffect(() => {
        if (!currentUser || !leadId) return;
        const tasksCol = collection(db, 'leads', leadId, 'tarefas');
        const q = query(tasksCol, where('status', '==', 'pendente'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(fetchedTasks);
            // Calcular e atualizar o status da tarefa
            const newTaskStatus = getTaskStatusInfo(fetchedTasks);
            setTaskStatus(newTaskStatus);
        });

        return () => unsubscribe();
    }, [currentUser, leadId]);

    const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!currentUser || !lead) return;
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
        if (!currentUser || !leadId) return;
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
        if (!currentUser || !lead) return;
        const leadRef = doc(db, 'leads', lead.id);
        try {
            await updateDoc(leadRef, { anotacoes: tempAnnotations });
            setIsEditingAnnotations(false);
        } catch (error) {
            console.error("Erro ao salvar anotações:", error);
        }
    };

    const handleSaveTask = async (task: TaskPayload) => {
        if (!currentUser || !leadId) return;
        setIsSavingTask(true);

        const { description, type, date, time } = task;
        const dueDate = new Date(`${date}T${time}`);
        const dueDateTimestamp = new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60000);

        try {
            // Adicionar a tarefa
            const tasksCol = collection(db, 'leads', leadId, 'tarefas');
            const taskDoc = await addDoc(tasksCol, {
                description,
                type,
                dueDate: dueDateTimestamp,
                status: 'pendente'
            });

            // Adicionar a interação
            const interactionsCol = collection(db, 'leads', leadId, 'interactions');
            await addDoc(interactionsCol, {
                type: 'Tarefa Agendada',
                notes: description,
                timestamp: serverTimestamp(),
                taskId: taskDoc.id
            });

            setIsAgendaModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar tarefa:", error);
        } finally {
            setIsSavingTask(false);
        }
    };

    const handleUpdateTaskStatus = async (interactionId: string, taskId: string, status: 'concluída' | 'cancelada', reason?: string) => {
        if (!currentUser || !leadId) return;

        const batch = writeBatch(db);

        // Atualizar o status da tarefa
        const taskRef = doc(db, 'leads', leadId, 'tarefas', taskId);
        batch.update(taskRef, { status });

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
        if (!currentUser || !lead) return;
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
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6] mx-auto mb-4"></div>
                    <p className="text-[#6B6F76] dark:text-gray-300">Carregando dados do lead...</p>
                </div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-[#6B6F76] dark:text-gray-300">Lead não encontrado.</p>
                </div>
            </div>
        );
    }

    // Usar o status da tarefa calculado no useEffect

    return (
        <div className="bg-[#F5F6FA] dark:bg-[#181C23] min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* --- COLUNA DA ESQUERDA (20% a mais) --- */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Card de Informações do Lead */}
                    <div className="bg-white dark:bg-[#23283A] p-5 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-base font-semibold text-[#2E2F38] dark:text-white tracking-tight">{lead.nome}</h2>
                                <span className={`h-2 w-2 rounded-full ${getTaskStatusColor(taskStatus)}`}></span>
                            </div>
                            <div className="flex items-center justify-between">
                                <select 
                                    id="lead-situation" 
                                    value={lead.etapa} 
                                    onChange={handleStageChange} 
                                    className="px-2 py-1 text-xs border border-[#A3C8F7] dark:border-[#3478F6] rounded-md bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white focus:ring-1 focus:ring-[#3478F6] focus:outline-none"
                                >
                                    {PIPELINE_STAGES.map(stage => (<option key={stage} value={stage}>{stage}</option>))}
                                </select>
                                <div className="flex flex-col items-center gap-1">
                                    <button 
                                        onClick={() => setIsAgendaModalOpen(true)} 
                                        className="w-10 h-10 bg-[#3478F6] hover:bg-[#3478F6]/80 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg"
                                        title="Agendar Tarefa"
                                    >
                                        <TaskIcon className="h-5 w-5"/>
                                    </button>
                                    <span className="text-xs text-[#6B6F76] dark:text-gray-400">Tarefas</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-[#6B6F76] dark:text-gray-400">{lead.telefone}</p>
                                <a 
                                    href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-green-500 hover:text-green-600 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <WhatsAppIcon className="h-3 w-3 fill-current"/>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Card de Próximos Passos */}
                    <div className="bg-white dark:bg-[#23283A] p-5 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                        <h3 className="text-base font-semibold text-[#2E2F38] dark:text-white mb-4">Próximos Passos</h3>
                        <div className="h-48 overflow-y-auto pr-2">
                            {interactions.length > 0 ? (
                                <ul className="space-y-3">
                                    {interactions.slice(0, 3).map(interaction => {
                                        const isPendingTask = interaction.type === 'Tarefa Agendada' &&
                                            interaction.taskId &&
                                            tasks.some(task => task.id === interaction.taskId);
                                         
                                         // Buscar a tarefa correspondente para obter horário agendado
                                         const relatedTask = tasks.find(task => task.id === interaction.taskId);

                                         return (
                                             <li key={interaction.id} className="flex items-start gap-3">
                                                 <div className="bg-slate-100 dark:bg-gray-700 p-2 rounded-full">
                                                     {getIconForInteraction(interaction.type)}
                                                 </div>
                                                 <div className="flex-1 min-w-0">
                                                     <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{interaction.type}</p>
                                                     <p className="text-xs text-gray-600 dark:text-gray-400">{interaction.notes}</p>
                                                     
                                                     {interaction.type === 'Tarefa Cancelada' && interaction.cancellationNotes && (
                                                         <p className="text-xs text-red-500 mt-1">
                                                             <span className="font-semibold">Motivo:</span> {interaction.cancellationNotes}
                                                         </p>
                                                     )}

                                                     {isPendingTask && (
                                                         <div className="mt-2 flex items-center gap-2">
                                                             <button
                                                                 onClick={() => handleUpdateTaskStatus(interaction.id, interaction.taskId!, 'concluída')}
                                                                 className="px-2 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                                                             >
                                                                 Concluída
                                                             </button>
                                                             <button
                                                                 onClick={() => openCancelModal(interaction.id, interaction.taskId!)}
                                                                 className="px-2 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                                                             >
                                                                 Cancelar
                                                             </button>
                                                         </div>
                                                     )}

                                                     <div className="mt-2 flex items-center gap-3 text-xs">
                                                         <span className="text-gray-400 dark:text-gray-500">
                                                             Criado: {interaction.timestamp ? new Date(interaction.timestamp.seconds * 1000).toLocaleString('pt-BR') : 'Data indisponível'}
                                                         </span>
                                                         {relatedTask && (
                                                             <span className="text-[#3478F6] dark:text-[#A3C8F7] font-medium">
                                                                 Agendado: {relatedTask.dueDate ? new Date(relatedTask.dueDate.seconds * 1000).toLocaleString('pt-BR') : 'Data indisponível'}
                                                             </span>
                                                         )}
                                                     </div>
                                                 </div>
                                                 {/* Botão para ver descrição completa */}
                                                 <button
                                                     onClick={() => {
                                                         let descricaoCompleta = `Descrição completa da ${interaction.type.toLowerCase()}:\n\n${interaction.notes}`;
                                                         
                                                         // Adicionar motivo de cancelamento se existir
                                                         if (interaction.type === 'Tarefa Cancelada' && interaction.cancellationNotes) {
                                                             descricaoCompleta += `\n\nMotivo do cancelamento:\n${interaction.cancellationNotes}`;
                                                         }
                                                         
                                                         // Adicionar horário agendado se existir
                                                         if (relatedTask && relatedTask.dueDate) {
                                                             const horarioAgendado = new Date(relatedTask.dueDate.seconds * 1000).toLocaleString('pt-BR');
                                                             descricaoCompleta += `\n\nHorário agendado: ${horarioAgendado}`;
                                                         }
                                                         
                                                         alert(descricaoCompleta);
                                                     }}
                                                     className="text-[#3478F6] dark:text-[#A3C8F7] hover:text-[#255FD1] dark:hover:text-[#7BA3E8] transition-colors p-1"
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
                                     {interactions.length > 3 && (
                                         <li className="text-center py-2">
                                             <p className="text-xs text-gray-500 dark:text-gray-400">
                                                 +{interactions.length - 3} ações anteriores
                                             </p>
                                         </li>
                                     )}
                                 </ul>
                             ) : (
                                 <div className="h-full flex items-center justify-center">
                                     <p className="text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma ação registrada ainda.</p>
                                 </div>
                             )}
                         </div>
                     </div>


                </div>

                {/* --- COLUNA DA DIREITA (20% a menos) --- */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* Card de Qualificação do Lead */}
                    <div className="bg-white dark:bg-[#23283A] p-6 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white">Qualificação do Lead</h3>
                            <button 
                                onClick={() => setIsQualificationModalOpen(true)}
                                className="px-3 py-1.5 text-sm font-semibold text-[#3478F6] bg-[#E8E9F1] hover:bg-[#A3C8F7]/40 rounded-lg transition-colors dark:bg-[#23283A] dark:hover:bg-[#3478F6]/20"
                            >
                                ✏️ Editar Qualificação
                            </button>
                        </div>
                        
                        {/* Exibição compacta em linha única com separadores simples */}
                        <div className="space-y-3">
                            {Object.keys(qualifications).length > 0 ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {Object.entries(qualifications).map(([key, values], index) => {
                                        // Verificação de segurança para garantir que values é um array
                                        if (!Array.isArray(values)) {
                                            console.warn(`Qualificação ${key} não é um array:`, values);
                                            return null;
                                        }
                                        
                                        return (
                                            <React.Fragment key={key}>
                                                {values.map((value, valueIndex) => (
                                                    <span 
                                                        key={`${key}-${valueIndex}`}
                                                        className="px-2 py-1 text-xs font-medium bg-[#F0F4FF] dark:bg-[#23283A] text-[#3478F6] dark:text-[#A3C8F7] rounded-md border border-[#A3C8F7]/20"
                                                    >
                                                        {value}
                                                    </span>
                                                ))}
                                                {/* Separador simples entre categorias */}
                                                {index < Object.keys(qualifications).length - 1 && (
                                                    <span className="text-[#6B6F76] dark:text-gray-400 mx-1">—</span>
                                                )}
                                            </React.Fragment>
                                        );
                                    }).filter(Boolean)}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-[#6B6F76] dark:text-gray-400">
                                    <p className="text-sm">Nenhuma qualificação definida</p>
                                    <p className="text-xs mt-1">Clique em "Editar Qualificação" para começar</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card de Anotações */}
                    <div className="bg-white dark:bg-[#23283A] p-6 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col h-56">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white">Anotações</h3>
                            {!isEditingAnnotations && (
                                <button onClick={() => setIsEditingAnnotations(true)} className="text-sm font-semibold text-primary-600 hover:text-primary-800 transition-colors">Editar</button>
                            )}
                        </div>
                        <div className="flex-grow min-h-0">
                            {isEditingAnnotations ? (
                                <div className="flex flex-col h-full">
                                    <textarea
                                        value={tempAnnotations}
                                        onChange={(e) => setTempAnnotations(e.target.value)}
                                        className="w-full flex-grow border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                        placeholder="Adicione suas anotações aqui..."
                                    />
                                    <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
                                        <button onClick={() => { setIsEditingAnnotations(false); setTempAnnotations(lead.anotacoes || ''); }} className="px-3 py-1 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors">Cancelar</button>
                                        <button onClick={handleSaveAnnotations} className="px-3 py-1 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">Confirmar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto h-full pr-2">
                                    <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
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
            <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${isQualificationModalOpen ? 'visible' : 'invisible'}`}>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Editar Qualificação</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {QUALIFICATION_QUESTIONS.map((group) => (
                            <div key={group.key}>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{group.title}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {group.options.map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => handleQualificationChange(group.key, option)}
                                            className={`px-3 py-2 text-sm font-medium border rounded-md transition-all duration-150 ${
                                                Array.isArray(qualifications[group.key]) && qualifications[group.key].includes(option)
                                                ? 'bg-[#3478F6] border-[#3478F6] text-white shadow'
                                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
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
                        <button onClick={handleCloseQualificationModal} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancelar</button>
                        <button onClick={handleSaveQualifications} className="px-4 py-2 text-sm font-semibold text-white bg-[#3478F6] hover:bg-[#3478F6]/80 rounded-lg transition-colors">Salvar</button>
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
        options: ['Moradia', 'Veraneio', 'Investimento'],
    },
    {
        title: 'Estágio do Imóvel',
        key: 'estagio',
        options: ['Lançamento', 'Em Construção', 'Pronto para Morar'],
    },
    {
        title: 'Quartos',
        key: 'quartos',
        options: ['2 quartos', '1 Suíte + 1 Quarto', '3 quartos', '4 quartos'],
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