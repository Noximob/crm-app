'use client';

import React, { useState } from 'react';

interface LogInteractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (description: string) => void;
    interactionType: string;
    isLoading: boolean;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
);

export default function LogInteractionModal({ isOpen, onClose, onSave, interactionType, isLoading }: LogInteractionModalProps) {
    const [description, setDescription] = useState('');

    const handleSave = () => {
        onSave(description);
        setDescription('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] p-6 w-full max-w-lg relative overflow-hidden max-h-[85vh] overflow-y-auto">
                <div className="absolute inset-x-0 top-0 gx-line" />
                <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-[#FF5C7E] transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Registrar Interação: {interactionType}</h2>
                <div>
                    <label htmlFor="description" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">
                        Descrição
                    </label>
                    <textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 text-white placeholder-white/30"
                        placeholder={`Descreva os detalhes da ${interactionType.toLowerCase()}...`}
                    />
                </div>
                <div className="flex justify-end gap-4 pt-6">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-xl transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading || !description.trim()}
                        className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Salvando...' : 'Salvar Interação'}
                    </button>
                </div>
            </div>
        </div>
    );
} 