'use client';

import React, { useState } from 'react';

// --- Tipos e Ícones ---
export interface TaskPayload {
    description: string;
    type: 'Ligação' | 'WhatsApp' | 'Visita' | 'Outros';
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
    const [type, setType] = useState<TaskPayload['type']>('Ligação');
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-[#12101a] rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] border border-white/10 p-6 w-full max-w-lg relative overflow-hidden max-h-[85vh] overflow-y-auto">
                <div className="absolute inset-x-0 top-0 gx-line" />
                <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-[#FF5C7E] transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-6">Agendar Nova Tarefa</h2>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="task-description" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Descrição da Tarefa</label>
                        <textarea
                            id="task-description"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 text-white placeholder-white/30"
                            placeholder="Ex: Ligar para confirmar proposta..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <label htmlFor="task-type" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Tipo de Interação</label>
                            <select
                                id="task-type"
                                value={type}
                                onChange={(e) => setType(e.target.value as TaskPayload['type'])}
                                className="mt-1 block w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 text-white placeholder-white/30"
                            >
                                <option>Ligação</option>
                                <option>WhatsApp</option>
                                <option>Visita</option>
                                <option>Outros</option>
                            </select>
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="task-date" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Data</label>
                            <input
                                type="date"
                                id="task-date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 text-white placeholder-white/30"
                            />
                        </div>
                        <div className="sm:col-span-1">
                            <label htmlFor="task-time" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Hora</label>
                            <input
                                type="time"
                                id="task-time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 text-white placeholder-white/30"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-8">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-xl transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading || !isFormValid}
                        className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Salvando...' : 'Salvar Tarefa'}
                    </button>
                </div>
            </div>
        </div>
    );
} 