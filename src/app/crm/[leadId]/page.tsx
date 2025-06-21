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

// --- Ícones ---
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const TaskIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

interface HistoryLog {
    id: string;
    type: string;
    description: string;
    timestamp: any;
}

// --- Componente de Indicador de Status (reutilizado) ---
const StatusIndicator = ({ status }: { status: string }) => {
    const statusColor = { 'Sem tarefa': 'bg-gray-500', 'Tarefa em atraso': 'bg-red-500', 'Tarefa do Dia': 'bg-yellow-400', 'Tarefa Futura': 'bg-green-500' }[status] || 'bg-gray-500';
    return <span className={`h-2.5 w-2.5 ${statusColor} rounded-full`}></span>;
};

export default function LeadDetailPage() {
    const { currentUser } = useAuth();
    const params = useParams();
    const leadId = params.leadId as string;

    const [lead, setLead] = useState<Lead | null>(null);
    const [history, setHistory] = useState<HistoryLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [interactionType, setInteractionType] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // --- Lógica para buscar os dados do lead ---
    useEffect(() => {
        if (!currentUser || !leadId) return;
        const leadRef = doc(db, `leads/${currentUser.uid}/leads`, leadId);
        const unsubscribe = onSnapshot(leadRef, (docSnap) => {
            if (docSnap.exists()) {
                setLead({ id: docSnap.id, ...docSnap.data() } as Lead);
            } else {
                console.log("Lead não encontrado!");
                setLead(null);
            }
            setLoading(false);
        });

        // Lógica para buscar o histórico de interações
        const historyRef = collection(db, `leads/${currentUser.uid}/leads`, leadId, 'historico');
        const q = query(historyRef, orderBy('timestamp', 'desc'));
        const unsubscribeHistory = onSnapshot(q, (snapshot) => {
            const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryLog));
            setHistory(historyData);
        });

        return () => {
            unsubscribe();
            unsubscribeHistory();
        };
    }, [currentUser, leadId]);

    const handleSituationChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!currentUser || !lead) return;
        const newEtapa = e.target.value;
        const leadRef = doc(db, `leads/${currentUser.uid}/leads`, lead.id);
        try {
            await updateDoc(leadRef, { etapa: newEtapa });
            // O estado local será atualizado automaticamente pelo listener onSnapshot
        } catch (error) {
            console.error("Erro ao atualizar situação:", error);
        }
    };

    const openInteractionModal = (type: string) => {
        setInteractionType(type);
        setIsModalOpen(true);
    };

    const handleSaveInteraction = async (description: string) => {
        if (!currentUser || !leadId) return;
        setIsSaving(true);
        const historyRef = collection(db, `leads/${currentUser.uid}/leads`, leadId, 'historico');
        try {
            await addDoc(historyRef, {
                type: interactionType,
                description,
                timestamp: serverTimestamp()
            });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar interação:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-slate-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
            <header className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-center justify-between mb-6">
                <Link href="/crm" className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary-500 transition-colors">
                    <ArrowLeftIcon className="h-5 w-5" />
                    Voltar para a Gestão
                </Link>
                {/* Aqui podemos adicionar outros botões de ação do cabeçalho se necessário */}
            </header>

            {loading ? (
                <div className="text-center py-10">Carregando dados do lead...</div>
            ) : lead ? (
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coluna de Informações e Ações */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{lead.nome}</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{lead.telefone}</p>
                            {lead.email && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{lead.email}</p>}

                            <div className="flex items-center gap-3 mt-4">
                                <StatusIndicator status={lead.status} />
                                <span className="text-sm font-medium">{lead.status}</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                            <label htmlFor="situation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Situação do Lead</label>
                            <select 
                                id="situation" 
                                value={lead.etapa} 
                                onChange={handleSituationChange}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            >
                                {PIPELINE_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                            </select>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                            <div className="grid grid-cols-2 gap-3">
                                <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary-700 bg-primary-100/80 rounded-lg hover:bg-primary-200/70 transition-colors"><PhoneIcon className="h-4 w-4"/>Ligação</button>
                                <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-green-700 bg-green-100/80 rounded-lg hover:bg-green-200/70 transition-colors"><WhatsAppIcon className="h-4 w-4 fill-current"/>WhatsApp</button>
                                <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-100/80 rounded-lg hover:bg-indigo-200/70 transition-colors"><BuildingIcon className="h-4 w-4"/>Visita</button>
                                <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-sky-700 bg-sky-100/80 rounded-lg hover:bg-sky-200/70 transition-colors"><TaskIcon className="h-4 w-4"/>Tarefa</button>
                            </div>
                        </div>
                    </div>

                    {/* Coluna do Histórico */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Histórico de Ações</h2>
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            {history.length > 0 ? (
                                history.map(log => (
                                    <div key={log.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 border-primary-500">
                                        <p className="font-semibold text-gray-800 dark:text-white">{log.type}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mt-1">{log.description}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-2">
                                            {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('pt-BR') : 'Registrando...'}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-8">Nenhuma interação registrada ainda.</p>
                            )}
                        </div>
                    </div>
                </main>
            ) : (
                <div className="text-center py-10">Lead não encontrado.</div>
            )}
            <LogInteractionModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveInteraction} 
                interactionType={interactionType}
                isLoading={isSaving}
            />
        </div>
    );
} 