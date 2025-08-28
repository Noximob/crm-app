'use client';

import React, { useState } from 'react';

// --- Tipos e Ícones ---
export interface TaskPayload {
    description: string;
    type: 'Ligação' | 'WhatsApp' | 'Visita';
    date: string;
    time: string;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
);

// --- Props do Componente ---
interface AgendaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payload: TaskPayload) => void;
    isLoading: boolean;
}

export default function AgendaModal({ isOpen, onClose, onSave, isLoading }: AgendaModalProps) {
    // --- Estados Internos ---
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'Ligação' | 'WhatsApp' | 'Visita'>('Ligação');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    // --- Validação e Funções ---
    const isFormValid = description.trim() !== '' && date !== '' && time !== '';

    const handleSave = () => {
        if (!isFormValid) return;
        onSave({ description, type, date, time });
        // Limpa o formulário após salvar
        setDescription('');
        setType('Ligação');
        setDate('');
        setTime('');
    };

    if (!isOpen) return null;

    // --- Renderização ---
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center">
            <div className="bg-[#F5F6FA] dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-[#6B6F76] hover:text-[#3478F6] dark:hover:text-[#A3C8F7] transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-6">Agendar Nova Tarefa</h2>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="task-description" className="block text-sm font-semibold text-[#2E2F38] dark:text-white">Descrição da Tarefa</label>
                        <textarea
                            id="task-description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-[#181C23] border border-[#A3C8F7] dark:border-[#3478F6] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6] text-[#2E2F38] dark:text-white"
                            placeholder="Ex: Ligar para confirmar proposta..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <label htmlFor="task-type" className="block text-sm font-semibold text-[#2E2F38] dark:text-white">Tipo de Interação</label>
                            <select
                                id="task-type"
                                value={type}
                                onChange={(e) => setType(e.target.value as TaskPayload['type'])}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-[#181C23] border border-[#A3C8F7] dark:border-[#3478F6] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6] text-[#2E2F38] dark:text-white"
                            >
                                <option>Ligação</option>
                                <option>WhatsApp</option>
                                <option>Visita</option>
                                <option>Outros</option>
                            </select>
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="task-date" className="block text-sm font-semibold text-[#2E2F38] dark:text-white">Data</label>
                            <input
                                type="date"
                                id="task-date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-[#181C23] border border-[#A3C8F7] dark:border-[#3478F6] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6] text-[#2E2F38] dark:text-white"
                            />
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="task-time" className="block text-sm font-semibold text-[#2E2F38] dark:text-white">Hora</label>
                            <input
                                type="time"
                                id="task-time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-[#181C23] border border-[#A3C8F7] dark:border-[#3478F6] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6] text-[#2E2F38] dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-8">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-[#6B6F76] bg-[#E8E9F1] hover:bg-[#A3C8F7]/40 rounded-lg transition-colors disabled:opacity-50 dark:bg-[#181C23] dark:text-[#A3C8F7] dark:hover:bg-[#23283A]">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading || !isFormValid}
                        className="px-4 py-2 text-sm font-semibold text-white bg-[#3478F6] hover:bg-[#255FD1] rounded-lg shadow-sm disabled:opacity-50 disabled:bg-[#A3C8F7]"
                    >
                        {isLoading ? 'Salvando...' : 'Salvar Tarefa'}
                    </button>
                </div>
            </div>
        </div>
    );
} 