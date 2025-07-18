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

const TASK_STATUS_OPTIONS = [
    'Tarefa em Atraso',
    'Tarefa do Dia', 
    'Tarefa Futura',
    'Sem tarefa'
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

const FilterTag = ({ label, isSelected, onClick }: { label: string; isSelected: boolean; onClick: () => void; }) => (
    <button
        type="button"
        onClick={onClick}
        className={`
            w-full text-left px-2.5 py-1.5 text-sm rounded-md border transition-all duration-200
            ${isSelected
                ? 'bg-primary-500 border-primary-500 text-white font-semibold shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 dark:bg-gray-700/80 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
            }
        `}
    >
        {label}
    </button>
);

export default function FilterModal({ isOpen, onClose, onApply, initialFilters, pipelineStages }: FilterModalProps) {
    const [selectedFilters, setSelectedFilters] = useState<Filters>(initialFilters);

    useEffect(() => {
        setSelectedFilters(initialFilters);
    }, [initialFilters]);

    const handleTagClick = (groupKey: string, option: string) => {
        const currentGroupFilters = selectedFilters[groupKey] || [];
        const newGroupFilters = currentGroupFilters.includes(option)
            ? currentGroupFilters.filter(item => item !== option)
            : [...currentGroupFilters, option];

        setSelectedFilters(prev => ({
            ...prev,
            [groupKey]: newGroupFilters,
        }));
    };
    
    const handleClearFilters = () => {
        setSelectedFilters({});
    }

    const hasActiveFilters = Object.values(selectedFilters).some(arr => arr && arr.length > 0);
    const situationQuestion = { title: 'Situação do Cliente', key: 'etapa', options: pipelineStages };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onMouseDown={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl relative flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
                {/* Cabeçalho */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Filtrar Leads</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                
                {/* Conteúdo com scroll */}
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Status de Tarefa */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2.5">Status da Tarefa</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            {TASK_STATUS_OPTIONS.map(option => (
                                <FilterTag 
                                    key={option}
                                    label={option}
                                    isSelected={(selectedFilters['taskStatus'] || []).includes(option)}
                                    onClick={() => handleTagClick('taskStatus', option)}
                                />
                            ))}
                        </div>
                    </div>

                    {[situationQuestion, ...QUALIFICATION_QUESTIONS].map(group => (
                        <div key={group.key}>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2.5">{group.title}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {group.options.map(option => (
                                    <FilterTag 
                                        key={option}
                                        label={option}
                                        isSelected={(selectedFilters[group.key] || []).includes(option)}
                                        onClick={() => handleTagClick(group.key, option)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Rodapé */}
                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                    <button 
                        type="button" 
                        onClick={handleClearFilters} 
                        disabled={!hasActiveFilters}
                        className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Limpar
                    </button>
                    <button 
                        type="button" 
                        onClick={() => {
                            onApply(selectedFilters);
                            onClose();
                        }}
                        className="px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
} 