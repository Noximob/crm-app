'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc, collection, query, orderBy, addDoc, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { PIPELINE_STAGES } from '@/lib/constants';
import { Lead } from '@/types';
import LogInteractionModal from '../../../crm/_components/LogInteractionModal';
import CrmHeader from '../../../crm/_components/CrmHeader';
import AgendaModal, { TaskPayload } from '../../../crm/_components/AgendaModal';
import CancelTaskModal from '../../../crm/_components/CancelTaskModal';
import StartAutomationModal from '../../../crm/_components/StartAutomationModal';

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
        const pendingTasks = tasks.filter(task => task.status === 'pendente');
        
        if (pendingTasks.length === 0) {
            return {
                text: 'Sem tarefa',
                color: 'bg-gray-400'
            };
        }

        const nextTask = pendingTasks.sort((a, b) => a.dueDate.seconds - b.dueDate.seconds)[0];
        const now = new Date();
        const taskDate = new Date(nextTask.dueDate.seconds * 1000);
        const diffHours = (taskDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (diffHours < 0) {
            return {
                text: 'Tarefa atrasada',
                color: 'bg-red-500'
            };
        } else if (diffHours < 24) {
            return {
                text: 'Tarefa hoje',
                color: 'bg-yellow-500'
            };
        } else {
            return {
                text: 'Tarefa agendada',
                color: 'bg-green-500'
            };
        }
    };

    const handleStartAutomation = async (treatmentName: string) => {
        if (!currentUser || !lead) return;
        setIsUpdatingAutomation(true);

        const leadRef = doc(db, 'leads', lead.id);
        try {
            await updateDoc(leadRef, {
                'automacao.status': 'ativa',
                'automacao.tratamento': treatmentName,
                'automacao.inicio': serverTimestamp()
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
                'automacao.fim': serverTimestamp()
            });
        } catch (error) {
            console.error("Erro ao cancelar automação:", error);
        } finally {
            setIsUpdatingAutomation(false);
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

    const taskStatus = getTaskStatusInfo();
    const automationStatus = lead.automacao?.status || 'inativa';

    return (
        <div className="bg-[#F5F6FA] dark:bg-[#181C23] min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- COLUNA DA ESQUERDA --- */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* Card de Informações do Lead */}
                    <div className="bg-white dark:bg-[#23283A] p-6 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#E8E9F1] dark:bg-[#23283A] text-[#3478F6] dark:text-[#A3C8F7] font-bold text-xl rounded-lg h-14 w-14 flex items-center justify-center">
                                {lead.nome.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white tracking-tight">{lead.nome}</h2>
                                <div className="flex items-center gap-2">
                                    <p className="text-[#6B6F76] dark:text-gray-400">{lead.telefone}</p>
                                    <a 
                                        href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-green-500 hover:text-green-600 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <WhatsAppIcon className="h-4 w-4 fill-current"/>
                                    </a>
                                </div>
                                <p className="text-[#6B6F76] dark:text-gray-400">{lead.email}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${taskStatus.color}`}></span>
                            <span className="text-sm text-[#6B6F76] dark:text-gray-300">{taskStatus.text}</span>
                        </div>
                    </div>

                    {/* Card de Situação do Lead */}
                    <div className="bg-white dark:bg-[#23283A] p-6 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                        <label htmlFor="lead-situation" className="block text-base font-semibold text-[#2E2F38] dark:text-white mb-2">Situação do Lead</label>
                        <select id="lead-situation" value={lead.etapa} onChange={handleStageChange} className="w-full p-2 border border-[#A3C8F7] dark:border-[#3478F6] rounded-lg bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white focus:ring-2 focus:ring-[#3478F6]">
                            {PIPELINE_STAGES.map(stage => (<option key={stage} value={stage}>{stage}</option>))}
                        </select>
                    </div>

                    {/* Card O que deseja fazer? */}
                    <div className="bg-white dark:bg-[#23283A] p-6 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                        <h3 className="text-base font-semibold text-[#2E2F38] dark:text-white mb-4">O que deseja fazer?</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => openInteractionModal('Ligação')} className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#3478F6] bg-[#E8E9F1] rounded-lg hover:bg-[#A3C8F7]/40 transition-colors"><PhoneIcon className="h-4 w-4"/>Ligação</button>
                            <button onClick={() => openInteractionModal('WhatsApp')} className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-green-700 bg-green-100/80 rounded-lg hover:bg-green-200/70 transition-colors"><WhatsAppIcon className="h-4 w-4 fill-current"/>WhatsApp</button>
                            <button onClick={() => openInteractionModal('Visita')} className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-100/80 rounded-lg hover:bg-indigo-200/70 transition-colors"><BuildingIcon className="h-4 w-4"/>Visita</button>
                            <button onClick={() => setIsAgendaModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#3478F6] bg-[#E8E9F1] rounded-lg hover:bg-[#A3C8F7]/40 transition-colors"><TaskIcon className="h-4 w-4"/>Tarefa</button>
                        </div>
                    </div>

                    {/* Card de Automação de Mensagens */}
                    <div className="bg-white dark:bg-[#23283A] p-6 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                        <h3 className="text-base font-semibold text-[#2E2F38] dark:text-white mb-4">Automação Mensagens</h3>
                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAutomationModalOpen(true)}
                                disabled={automationStatus !== 'inativa' || isUpdatingAutomation}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PlayIcon className="h-4 w-4" />
                                Iniciar Disparo
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelAutomation}
                                disabled={automationStatus !== 'ativa' || isUpdatingAutomation}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <StopIcon className="h-4 w-4" />
                                Cancelar Disparo
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- COLUNA DA DIREITA --- */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Card de Qualificação do Lead */}
                    <div className="bg-white dark:bg-[#23283A] p-6 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                        <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Qualificação do Lead</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                            {QUALIFICATION_QUESTIONS.map((group) => (
                                <div key={group.key}>
                                    <h4 className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">{group.title}</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {group.options.map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => handleQualificationChange(group.key, option)}
                                                className={`px-2.5 py-1 text-xs font-medium border rounded-md transition-all duration-150 ${
                                                    qualifications[group.key] === option
                                                    ? 'bg-primary-600 border-primary-700 text-white shadow'
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

                    {/* Card de Histórico */}
                    <div className="bg-white dark:bg-[#23283A] p-6 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col">
                        <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex-shrink-0">Histórico de Ações</h3>
                        <div className="flex-grow overflow-y-auto min-h-0 pr-2">
                            {interactions.length > 0 ? (
                                <ul className="space-y-4">
                                    {interactions.map(interaction => {
                                        const isPendingTask = interaction.type === 'Tarefa Agendada' &&
                                            interaction.taskId &&
                                            tasks.some(task => task.id === interaction.taskId);

                                        return (
                                            <li key={interaction.id} className="flex items-start gap-3">
                                                <div className="bg-slate-100 dark:bg-gray-700 p-2 rounded-full">
                                                    {getIconForInteraction(interaction.type)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-700 dark:text-gray-200">{interaction.type}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{interaction.notes}</p>
                                                    
                                                    {interaction.type === 'Tarefa Cancelada' && interaction.cancellationNotes && (
                                                        <p className="text-sm text-red-500 mt-1">
                                                            <span className="font-semibold">Motivo:</span> {interaction.cancellationNotes}
                                                        </p>
                                                    )}

                                                    {isPendingTask && (
                                                        <div className="mt-2 flex items-center gap-3">
                                                            <button
                                                                onClick={() => handleUpdateTaskStatus(interaction.id, interaction.taskId!, 'concluída')}
                                                                className="px-2.5 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                                                            >
                                                                Tarefa Concluída
                                                            </button>
                                                            <button
                                                                onClick={() => openCancelModal(interaction.id, interaction.taskId!)}
                                                                className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                                                            >
                                                                Cancelar Tarefa
                                                            </button>
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        {interaction.timestamp ? new Date(interaction.timestamp.seconds * 1000).toLocaleString('pt-BR') : 'Data indisponível'}
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-center text-gray-500 dark:text-gray-400">Nenhuma interação registrada ainda.</p>
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

            <StartAutomationModal
                isOpen={isAutomationModalOpen}
                onClose={() => setIsAutomationModalOpen(false)}
                onConfirm={handleStartAutomation}
                leadName={lead?.nome || ''}
                isLoading={isUpdatingAutomation}
            />
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