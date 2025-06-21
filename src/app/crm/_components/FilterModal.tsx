'use client';

import React, { useState, useEffect } from 'react';

// Definições movidas para cá para evitar dependências circulares e manter o componente contido.
const QUALIFICATION_QUESTIONS = [
    { title: 'Finalidade', key: 'finalidade', options: ['Moradia', 'Veraneio', 'Investimento'] },
    { title: 'Estágio do Imóvel', key: 'estagio', options: ['Lançamento', 'Em Construção', 'Pronto para Morar'] },
    { title: 'Quartos', key: 'quartos', options: ['2 quartos', '1 Suíte + 1 Quarto', '3 quartos', '4 quartos'] },
    { title: 'Tipo do Imóvel', key: 'tipo', options: ['Apartamento', 'Casa', 'Terreno'] },
    { title: 'Vagas de Garagem', key: 'vagas', options: ['1', '2', '3+'] },
    { title: 'Valor do Imóvel', key: 'valor', options: ['< 500k', '500k-800k', '800k-1.2M', '1.2M-2M', '> 2M'] },
];

export interface Filters {
    [key: string]: string[];
}

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: Filters) => void;
    initialFilters: Filters;
    pipelineStages: string[];
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

export default function FilterModal({ isOpen, onClose, onApply, initialFilters, pipelineStages }: FilterModalProps) {
    const [selectedFilters, setSelectedFilters] = useState<Filters>(initialFilters);

    useEffect(() => {
        setSelectedFilters(initialFilters);
    }, [initialFilters]);

    const handleCheckboxChange = (groupKey: string, option: string) => {
        const currentGroupFilters = selectedFilters[groupKey] || [];
        const newGroupFilters = currentGroupFilters.includes(option)
            ? currentGroupFilters.filter(item => item !== option)
            : [...currentGroupFilters, option];

        setSelectedFilters({
            ...selectedFilters,
            [groupKey]: newGroupFilters,
        });
    };
    
    const hasActiveFilters = Object.values(selectedFilters).some(arr => arr.length > 0);
    const situationQuestion = { title: 'Situação do Cliente', key: 'etapa', options: pipelineStages };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-start pt-10 sm:pt-16" onMouseDown={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-3xl relative" onMouseDown={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Filtrar Leads</h2>
                
                <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-4">
                    {[situationQuestion, ...QUALIFICATION_QUESTIONS].map(group => (
                        <div key={group.key}>
                            <h4 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">{group.title}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {group.options.map(option => (
                                    <label key={option} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                        <input
                                            type="checkbox"
                                            checked={(selectedFilters[group.key] || []).includes(option)}
                                            onChange={() => handleCheckboxChange(group.key, option)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <button 
                        type="button" 
                        onClick={() => setSelectedFilters({})} 
                        disabled={!hasActiveFilters}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                        Limpar Filtros
                    </button>
                    <button 
                        type="button" 
                        onClick={() => {
                            onApply(selectedFilters);
                            onClose();
                        }}
                        className="px-6 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
} 