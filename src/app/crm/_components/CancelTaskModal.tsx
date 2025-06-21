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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-start pt-16 sm:pt-24">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50" disabled={isLoading}>
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Cancelar Tarefa</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Por favor, descreva o motivo do cancelamento da tarefa.</p>
                
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full h-28 border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder="Digite o motivo aqui..."
                />

                <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                        Voltar
                    </button>
                    <button type="button" onClick={handleConfirm} disabled={isLoading || !reason.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
                    </button>
                </div>
            </div>
        </div>
    );
} 