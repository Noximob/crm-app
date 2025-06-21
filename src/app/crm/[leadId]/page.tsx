'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc, collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { PIPELINE_STAGES } from '@/lib/constants';
import { Lead } from '@/types';
import LogInteractionModal from '../_components/LogInteractionModal';
import CrmHeader from '../_components/CrmHeader';

// --- Ícones ---
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const TaskIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
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
        default: return null;
    }
};

interface Interaction {
    id: string;
    type: string;
    notes: string;
    timestamp: any;
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

    // --- Lógica para buscar os dados do lead ---
    useEffect(() => {
        if (!currentUser || !leadId) return;
        const leadRef = doc(db, `leads/${currentUser.uid}/leads`, leadId);
        const unsubscribe = onSnapshot(leadRef, (docSnap) => {
            if (docSnap.exists()) {
                const leadData = { id: docSnap.id, ...docSnap.data() } as Lead;
                setLead(leadData);
                setTempAnnotations(leadData.anotacoes || '');
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
        const interactionsCol = collection(db, `leads/${currentUser.uid}/leads`, leadId, 'interactions');
        const q = query(interactionsCol, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedInteractions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interaction));
            setInteractions(fetchedInteractions);
        });

        return () => unsubscribe();
    }, [currentUser, leadId]);

    const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!currentUser || !lead) return;
        const newEtapa = e.target.value;
        const leadRef = doc(db, `leads/${currentUser.uid}/leads`, lead.id);
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
        const interactionsCol = collection(db, `leads/${currentUser.uid}/leads`, leadId, 'interactions');
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
        const leadRef = doc(db, `leads/${currentUser.uid}/leads`, lead.id);
        try {
            await updateDoc(leadRef, { anotacoes: tempAnnotations });
            setIsEditingAnnotations(false);
        } catch (error) {
            console.error("Erro ao salvar anotações:", error);
        }
    };

    return (
        <div className="bg-slate-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />

            {loading ? (
                <div className="text-center py-10 mt-6">Carregando dados do lead...</div>
            ) : lead ? (
                 <div className="mt-6">
                    {/* --- LINHA SUPERIOR --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Card de Informações do Lead */}
                        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 font-bold text-xl rounded-lg h-14 w-14 flex items-center justify-center">
                                    {lead.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{lead.nome}</h2>
                                    <p className="text-gray-500 dark:text-gray-400">{lead.telefone}</p>
                                    <p className="text-gray-500 dark:text-gray-400">{lead.email}</p>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${getTaskStatusColor('Sem tarefa')}`}></span>
                                <span className="text-sm text-gray-600 dark:text-gray-300">Sem tarefa</span>
                            </div>
                        </div>

                        {/* Card de Anotações */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col h-56">
                            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Anotações</h3>
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

                    {/* --- LINHA INFERIOR --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Coluna da Esquerda (Situação e Ações) */}
                        <div className="lg:col-span-1 flex flex-col gap-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                                <label htmlFor="lead-situation" className="block text-base font-semibold text-gray-800 dark:text-white mb-2">Situação do Lead</label>
                                <select id="lead-situation" value={lead.etapa} onChange={handleStageChange} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    {PIPELINE_STAGES.map(stage => (<option key={stage} value={stage}>{stage}</option>))}
                                </select>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                                <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4">O que deseja fazer?</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => openInteractionModal('Ligação')} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary-700 bg-primary-100/80 rounded-lg hover:bg-primary-200/70 transition-colors"><PhoneIcon className="h-4 w-4"/>Ligação</button>
                                    <button onClick={() => openInteractionModal('WhatsApp')} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-green-700 bg-green-100/80 rounded-lg hover:bg-green-200/70 transition-colors"><WhatsAppIcon className="h-4 w-4 fill-current"/>WhatsApp</button>
                                    <button onClick={() => openInteractionModal('Visita')} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-100/80 rounded-lg hover:bg-indigo-200/70 transition-colors"><BuildingIcon className="h-4 w-4"/>Visita</button>
                                    <button onClick={() => alert('Funcionalidade de Tarefa em breve!')} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-sky-700 bg-sky-100/80 rounded-lg hover:bg-sky-200/70 transition-colors"><TaskIcon className="h-4 w-4"/>Tarefa</button>
                                </div>
                            </div>
                            {/* Card de Automação de Mensagens */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                                <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4">Automação Mensagens</h3>
                                <div className="flex flex-col gap-3">
                                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm">
                                        <PlayIcon className="h-4 w-4" />
                                        Iniciar Disparo
                                    </button>
                                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm">
                                        <StopIcon className="h-4 w-4" />
                                        Cancelar Disparo
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Coluna da Direita (Histórico) */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex-shrink-0">Histórico de Ações</h3>
                            <div className="flex-grow overflow-y-auto min-h-0 pr-2">
                                {interactions.length > 0 ? (
                                    <ul className="space-y-4">
                                        {interactions.map(interaction => (
                                            <li key={interaction.id} className="flex items-start gap-3">
                                                <div className="bg-slate-100 dark:bg-gray-700 p-2 rounded-full">
                                                {getIconForInteraction(interaction.type)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-700 dark:text-gray-200">{interaction.type}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{interaction.notes}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        {interaction.timestamp ? new Date(interaction.timestamp.seconds * 1000).toLocaleString('pt-BR') : 'Data indisponível'}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
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
            ) : (
                <div className="text-center py-10 mt-6">Lead não encontrado.</div>
            )}
            
            <LogInteractionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleLogInteraction}
                interactionType={interactionType}
                isLoading={isSaving}
            />
        </div>
    );
} 