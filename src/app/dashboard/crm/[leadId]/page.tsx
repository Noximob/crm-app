'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc, collection, query, orderBy, addDoc, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { PIPELINE_STAGES } from '@/lib/constants';
import { Lead } from '@/types';
import LogInteractionModal from '../../crm/_components/LogInteractionModal';
import CrmHeader from '../../crm/_components/CrmHeader';
import AgendaModal, { TaskPayload } from '../../crm/_components/AgendaModal';
import CancelTaskModal from '../../crm/_components/CancelTaskModal';
import StartAutomationModal from '../../crm/_components/StartAutomationModal';

// --- Ícones ---
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const TaskIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>;
const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
const StopIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>;

// --- Funções de Ajuda ---
const getTaskStatusColor = (status: string) => {
    // Por enquanto, apenas um status é usado.
    if (status === 'Sem tarefa') return 'bg-gray-400';
    return 'bg-gray-400';
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

interface Interaction {
    id: string;
    type: string;
    notes: string;
    timestamp: any;
    taskId?: string;
    cancellationNotes?: string;
}

interface QualificationData {
    [key: string]: string;
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
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [taskToCancel, setTaskToCancel] = useState<{ interactionId: string; taskId: string } | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [qualifications, setQualifications] = useState<QualificationData>({});
    const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
    const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);

    // --- Lógica para buscar os dados do lead ---
    useEffect(() => {
        if (!currentUser || !leadId) return;
        // Busca o lead diretamente da coleção principal 'leads'
        const leadRef = doc(db, 'leads', leadId);
        const unsubscribe = onSnapshot(leadRef, (docSnap) => {
            if (docSnap.exists()) {
                const leadData = { id: docSnap.id, ...docSnap.data() } as Lead;

                // Verificação de segurança para garantir que o usuário só veja seus próprios leads
                if (leadData.userId !== currentUser.uid) {
                    console.error("Acesso negado: Este lead não pertence a você.");
                    setLead(null);
                    setLoading(false);
                    return;
                }

                if (!leadData.automacao) {
                    leadData.automacao = { status: 'inativa' };
                }
                setLead(leadData);
                setTempAnnotations(leadData.anotacoes || '');
                setQualifications(leadData.qualificacao || {});
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

        try {
            // Adicionar tarefa à sub-coleção 'tarefas'
            const tasksCol = collection(db, 'leads', leadId, 'tarefas');
            const taskDoc = await addDoc(tasksCol, {
                description,
                type,
                dueDate,
                status: 'pendente'
            });

            // Adicionar interação à sub-coleção 'interactions'
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

        // Atualizar status da tarefa
        const taskRef = doc(db, 'leads', leadId, 'tarefas', taskId);
        batch.update(taskRef, { status });

        // Adicionar interação de conclusão/cancelamento
        const interactionsCol = collection(db, 'leads', leadId, 'interactions');
        const interactionData: any = {
            type: status === 'concluída' ? 'Tarefa Concluída' : 'Tarefa Cancelada',
            notes: status === 'concluída' ? 'Tarefa concluída com sucesso' : `Tarefa cancelada${reason ? `: ${reason}` : ''}`,
            timestamp: serverTimestamp(),
            taskId
        };

        if (status === 'cancelada' && reason) {
            interactionData.cancellationNotes = reason;
        }

        batch.set(doc(interactionsCol), interactionData);

        try {
            await batch.commit();
        } catch (error) {
            console.error("Erro ao atualizar status da tarefa:", error);
        }
    };

    const openCancelModal = (interactionId: string, taskId: string) => {
        setTaskToCancel({ interactionId, taskId });
        setIsCancelModalOpen(true);
    };

    const handleQualificationChange = async (groupKey: string, value: string) => {
        if (!currentUser || !lead) return;

        const newQualifications = { ...qualifications, [groupKey]: value };
        setQualifications(newQualifications);

        const leadRef = doc(db, 'leads', lead.id);
        try {
            await updateDoc(leadRef, { qualificacao: newQualifications });
        } catch (error) {
            console.error("Erro ao atualizar qualificação:", error);
        }
    };

    const getTaskStatusInfo = () => {
        if (tasks.length === 0) return { status: 'Sem tarefa', color: 'bg-gray-400' };

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const hasOverdue = tasks.some(task => {
            const dueDate = task.dueDate.toDate();
            dueDate.setHours(0, 0, 0, 0);
            return dueDate < now;
        });
        if (hasOverdue) return { status: 'Tarefa em Atraso', color: 'bg-red-500' };

        const hasTodayTask = tasks.some(task => {
            const dueDate = task.dueDate.toDate();
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === now.getTime();
        });
        if (hasTodayTask) return { status: 'Tarefa do Dia', color: 'bg-yellow-400' };

        return { status: 'Tarefa Futura', color: 'bg-sky-500' };
    };

    const handleStartAutomation = async (treatmentName: string) => {
        if (!currentUser || !lead) return;
        setIsUpdatingAutomation(true);

        const leadRef = doc(db, 'leads', lead.id);
        try {
            await updateDoc(leadRef, {
                'automacao.status': 'ativa',
                'automacao.tratamento': treatmentName,
                'automacao.dataInicio': serverTimestamp()
            });
            setIsAutomationModalOpen(false);
        } catch (error) {
            console.error("Erro ao iniciar automação:", error);
        } finally {
            setIsUpdatingAutomation(false);
        }
    };

    const handleCancelAutomation = async () => {
        if (!currentUser || !lead) return;
        setIsUpdatingAutomation(true);

        const leadRef = doc(db, 'leads', lead.id);
        try {
            await updateDoc(leadRef, {
                'automacao.status': 'inativa',
                'automacao.dataFim': serverTimestamp()
            });
        } catch (error) {
            console.error("Erro ao cancelar automação:", error);
        } finally {
            setIsUpdatingAutomation(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center">
                        <p>Carregando detalhes do lead...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center">
                        <p>Lead não encontrado ou acesso negado.</p>
                        <Link href="/dashboard/crm" className="text-[#3478F6] hover:text-[#2E6FD9] transition-colors">
                            Voltar ao CRM
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const taskStatusInfo = getTaskStatusInfo();

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <Link 
                            href="/dashboard/crm"
                            className="text-[#3478F6] hover:text-[#2E6FD9] transition-colors flex items-center gap-2"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                            Voltar ao CRM
                        </Link>
                    </div>
                </div>

                {/* Informações do Lead */}
                <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">
                                {lead.nome}
                            </h1>
                            <p className="text-[#6B6F76] dark:text-gray-300">
                                {lead.telefone} • {lead.email}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 mt-4 lg:mt-0">
                            <div className="flex items-center gap-2">
                                <span className={`h-3 w-3 ${taskStatusInfo.color} rounded-full`}></span>
                                <span className="text-sm text-[#6B6F76] dark:text-gray-300">
                                    {taskStatusInfo.status}
                                </span>
                            </div>
                            <select
                                value={lead.etapa}
                                onChange={handleStageChange}
                                className="px-4 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                            >
                                {PIPELINE_STAGES.map((stage) => (
                                    <option key={stage} value={stage}>
                                        {stage}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => openInteractionModal('Ligação')}
                            className="flex items-center gap-2 px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#2E6FD9] transition-colors"
                        >
                            <PhoneIcon className="h-4 w-4" />
                            Ligação
                        </button>
                        <button
                            onClick={() => openInteractionModal('WhatsApp')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                            <WhatsAppIcon className="h-4 w-4" />
                            WhatsApp
                        </button>
                        <button
                            onClick={() => openInteractionModal('Visita')}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                        >
                            <BuildingIcon className="h-4 w-4" />
                            Visita
                        </button>
                        <button
                            onClick={() => setIsAgendaModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                        >
                            <TaskIcon className="h-4 w-4" />
                            Agendar Tarefa
                        </button>
                        <button
                            onClick={() => setIsAutomationModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                            <PlayIcon className="h-4 w-4" />
                            Automação
                        </button>
                    </div>
                </div>

                {/* Grid de Conteúdo */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Coluna 1: Interações */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6">
                            <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-6">Interações</h2>
                            <div className="space-y-4">
                                {interactions.map((interaction) => (
                                    <div key={interaction.id} className="border border-[#E8E9F1] dark:border-[#23283A] rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                {getIconForInteraction(interaction.type)}
                                                <span className="font-medium text-[#2E2F38] dark:text-white">
                                                    {interaction.type}
                                                </span>
                                            </div>
                                            <span className="text-sm text-[#6B6F76] dark:text-gray-300">
                                                {interaction.timestamp?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'}
                                            </span>
                                        </div>
                                        <p className="text-[#6B6F76] dark:text-gray-300 mb-2">{interaction.notes}</p>
                                        
                                        {/* Botões de ação para tarefas */}
                                        {interaction.taskId && (
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => handleUpdateTaskStatus(interaction.id, interaction.taskId!, 'concluída')}
                                                    className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                                >
                                                    Concluir
                                                </button>
                                                <button
                                                    onClick={() => openCancelModal(interaction.id, interaction.taskId!)}
                                                    className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                
                                {interactions.length === 0 && (
                                    <p className="text-[#6B6F76] dark:text-gray-300 text-center py-8">
                                        Nenhuma interação registrada ainda.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Coluna 2: Anotações e Qualificação */}
                    <div className="space-y-6">
                        {/* Anotações */}
                        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white">Anotações</h3>
                                {!isEditingAnnotations ? (
                                    <button
                                        onClick={() => setIsEditingAnnotations(true)}
                                        className="text-[#3478F6] hover:text-[#2E6FD9] text-sm font-medium"
                                    >
                                        Editar
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveAnnotations}
                                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                                        >
                                            Salvar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingAnnotations(false);
                                                setTempAnnotations(lead.anotacoes || '');
                                            }}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {isEditingAnnotations ? (
                                <textarea
                                    value={tempAnnotations}
                                    onChange={(e) => setTempAnnotations(e.target.value)}
                                    className="w-full h-32 p-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                                    placeholder="Digite suas anotações..."
                                />
                            ) : (
                                <div className="text-[#6B6F76] dark:text-gray-300 whitespace-pre-wrap">
                                    {lead.anotacoes || 'Nenhuma anotação registrada.'}
                                </div>
                            )}
                        </div>

                        {/* Qualificação */}
                        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6">
                            <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Qualificação</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#6B6F76] dark:text-gray-300 mb-2">
                                        Interesse
                                    </label>
                                    <select
                                        value={qualifications.interesse || ''}
                                        onChange={(e) => handleQualificationChange('interesse', e.target.value)}
                                        className="w-full px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Alto">Alto</option>
                                        <option value="Médio">Médio</option>
                                        <option value="Baixo">Baixo</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-[#6B6F76] dark:text-gray-300 mb-2">
                                        Orçamento
                                    </label>
                                    <select
                                        value={qualifications.orcamento || ''}
                                        onChange={(e) => handleQualificationChange('orcamento', e.target.value)}
                                        className="w-full px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Até R$ 200k">Até R$ 200k</option>
                                        <option value="R$ 200k - R$ 500k">R$ 200k - R$ 500k</option>
                                        <option value="R$ 500k - R$ 1M">R$ 500k - R$ 1M</option>
                                        <option value="Acima de R$ 1M">Acima de R$ 1M</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-[#6B6F76] dark:text-gray-300 mb-2">
                                        Urgência
                                    </label>
                                    <select
                                        value={qualifications.urgencia || ''}
                                        onChange={(e) => handleQualificationChange('urgencia', e.target.value)}
                                        className="w-full px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Imediata">Imediata</option>
                                        <option value="Alta">Alta</option>
                                        <option value="Média">Média</option>
                                        <option value="Baixa">Baixa</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Status da Automação */}
                        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6">
                            <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Automação</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[#6B6F76] dark:text-gray-300">Status:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        lead.automacao?.status === 'ativa' 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                    }`}>
                                        {lead.automacao?.status === 'ativa' ? 'Ativa' : 'Inativa'}
                                    </span>
                                </div>
                                
                                {lead.automacao?.status === 'ativa' && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-[#6B6F76] dark:text-gray-300">Tratamento:</span>
                                            <span className="text-sm font-medium text-[#2E2F38] dark:text-white">
                                                {lead.automacao?.tratamento || 'N/A'}
                                            </span>
                                        </div>
                                        
                                        <button
                                            onClick={handleCancelAutomation}
                                            disabled={isUpdatingAutomation}
                                            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                        >
                                            {isUpdatingAutomation ? 'Cancelando...' : 'Cancelar Automação'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modais */}
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
                onConfirm={(reason) => {
                    if (taskToCancel) {
                        handleUpdateTaskStatus(taskToCancel.interactionId, taskToCancel.taskId, 'cancelada', reason);
                    }
                    setIsCancelModalOpen(false);
                    setTaskToCancel(null);
                }}
                isLoading={isCancelling}
            />

            <StartAutomationModal
                isOpen={isAutomationModalOpen}
                onClose={() => setIsAutomationModalOpen(false)}
                onConfirm={handleStartAutomation}
                leadName={lead.nome}
                isLoading={isUpdatingAutomation}
            />
        </div>
    );
} 