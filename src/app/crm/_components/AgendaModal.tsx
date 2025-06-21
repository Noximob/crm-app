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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Agendar Nova Tarefa</h2>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição da Tarefa</label>
                        <textarea
                            id="task-description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Ex: Ligar para confirmar proposta..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <label htmlFor="task-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Interação</label>
                            <select
                                id="task-type"
                                value={type}
                                onChange={(e) => setType(e.target.value as TaskPayload['type'])}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option>Ligação</option>
                                <option>WhatsApp</option>
                                <option>Visita</option>
                            </select>
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="task-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
                            <input
                                type="date"
                                id="task-date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="task-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora</label>
                            <input
                                type="time"
                                id="task-time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-8">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading || !isFormValid}
                        className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm disabled:opacity-50 disabled:bg-primary-400"
                    >
                        {isLoading ? 'Salvando...' : 'Salvar Tarefa'}
                    </button>
                </div>
            </div>
        </div>
    );
} 