'use client';

import React, { useState, useEffect } from 'react';

interface StartAutomationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (treatmentName: string) => void;
    leadName: string;
    isLoading: boolean;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

export default function StartAutomationModal({ isOpen, onClose, onConfirm, leadName, isLoading }: StartAutomationModalProps) {
    const [treatmentName, setTreatmentName] = useState(leadName);

    useEffect(() => {
        // Atualiza o nome no modal se o nome do lead mudar enquanto o modal está aberto
        setTreatmentName(leadName);
    }, [leadName]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        console.log("Modal: Botão Confirmar clicado. Chamando onConfirm...");
        onConfirm(treatmentName);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onMouseDown={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md relative flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Iniciar Automação</h2>
                    <button onClick={onClose} disabled={isLoading} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Confirme o nome que será usado para tratar o lead nas mensagens automáticas.
                    </p>
                    <div>
                        <label htmlFor="treatmentName" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Nome de Tratamento
                        </label>
                        <input
                            id="treatmentName"
                            type="text"
                            value={treatmentName}
                            onChange={(e) => setTreatmentName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading || !treatmentName}
                        className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:bg-primary-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Iniciando...' : 'Confirmar e Iniciar'}
                    </button>
                </div>
            </div>
        </div>
    );
} 