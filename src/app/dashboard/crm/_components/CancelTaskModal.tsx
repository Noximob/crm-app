'use client';

import React, { useState } from 'react';

interface CancelTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isLoading: boolean;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

export default function CancelTaskModal({ isOpen, onClose, onConfirm, isLoading }: CancelTaskModalProps) {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        if (!reason.trim()) {
            // Opcional: Adicionar feedback para o usuário
            alert('Por favor, insira um motivo para o cancelamento.');
            return;
        }
        onConfirm(reason);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-start pt-16 sm:pt-24">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] p-6 w-full max-w-md relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 gx-line" />
                <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-[#FF5C7E] transition-colors disabled:opacity-50" disabled={isLoading}>
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Cancelar Tarefa</h2>
                <p className="text-text-secondary mb-6">Por favor, descreva o motivo do cancelamento da tarefa.</p>

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full h-28 border border-white/10 rounded-lg p-2 bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 resize-none"
                    placeholder="Digite o motivo aqui..."
                />

                <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-white/10">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Voltar
                    </button>
                    <button type="button" onClick={handleConfirm} disabled={isLoading || !reason.trim()} className="px-4 py-2 text-sm font-semibold text-red-300 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
                    </button>
                </div>
            </div>
        </div>
    );
} 