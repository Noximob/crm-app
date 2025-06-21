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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Registrar Interação: {interactionType}</h2>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Descrição
                    </label>
                    <textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder={`Descreva os detalhes da ${interactionType.toLowerCase()}...`}
                    />
                </div>
                <div className="flex justify-end gap-4 pt-6">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading || !description.trim()}
                        className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm disabled:opacity-50 disabled:bg-primary-400"
                    >
                        {isLoading ? 'Salvando...' : 'Salvar Interação'}
                    </button>
                </div>
            </div>
        </div>
    );
} 