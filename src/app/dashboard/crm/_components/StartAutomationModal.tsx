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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4" onMouseDown={onClose}>
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] w-full max-w-md relative overflow-hidden flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
                <div className="absolute inset-x-0 top-0 gx-line" />
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Iniciar Automação</h2>
                    <button onClick={onClose} disabled={isLoading} className="p-1 rounded-full text-text-secondary hover:bg-white/10 hover:text-[#FF5C7E] transition-colors disabled:opacity-50">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-text-secondary">
                        Confirme o nome que será usado para tratar o lead nas mensagens automáticas.
                    </p>
                    <div>
                        <label htmlFor="treatmentName" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">
                            Nome de Tratamento
                        </label>
                        <input
                            id="treatmentName"
                            type="text"
                            value={treatmentName}
                            onChange={(e) => setTreatmentName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-4 bg-white/[0.02] border-t border-white/10 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-semibold text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading || !treatmentName}
                        className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-xl transition-all shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Iniciando...' : 'Confirmar e Iniciar'}
                    </button>
                </div>
            </div>
        </div>
    );
} 