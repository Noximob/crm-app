'use client';

import React, { useState, useEffect } from 'react';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { QUALIFICATION_QUESTIONS } from '@/lib/qualificacao';
import { TIPO_TAREFA_MEET, TIPO_TAREFA_VISITA, TIPO_TAREFA_PRODUTO, TIPOS_CONTATO } from '@/lib/circuito';

// Valor interno (bate com lead.taskStatus) + rótulo amigável exibido no chip
const TASK_STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'Ação agora', label: '⚡ Ação agora' },
    { value: 'Tarefa em Atraso', label: 'Atrasada' },
    { value: 'Tarefa do Dia', label: 'Para Hoje' },
    { value: 'Tarefa Futura', label: 'Futura' },
    { value: 'Sem tarefa', label: 'Sem tarefa' },
    { value: 'Venda fechada', label: '🏆 Venda fechada' },
];

// ---------------------------------------------------------------------------
// Próxima ação — o jeito novo de achar os leads pelo que está MARCADO.
// (A etapa é o estágio máximo alcançado; quem diz o próximo passo é a tarefa.)
// ---------------------------------------------------------------------------
export const ACAO_FILTER_OPTIONS = [
    '📅 Meet marcado',
    '🏠 Visita marcada',
    '🤝 Resposta de proposta',
    '💬 Follow-up marcado',
    '🔎 Buscando imóvel',
    'Sem próxima ação',
] as const;

/** Buckets de "próxima ação" de um lead a partir das tarefas pendentes (pode ter vários). */
export function getAcaoBuckets(pendentes: { type?: string; description?: string }[] | undefined): string[] {
    const tasks = pendentes || [];
    if (tasks.length === 0) return ['Sem próxima ação'];
    const buckets = new Set<string>();
    for (const t of tasks) {
        const tipo = t.type || '';
        if (tipo === TIPO_TAREFA_MEET) buckets.add('📅 Meet marcado');
        else if (tipo === TIPO_TAREFA_VISITA) buckets.add('🏠 Visita marcada');
        else if (tipo === TIPO_TAREFA_PRODUTO) buckets.add('🔎 Buscando imóvel');
        else if ((TIPOS_CONTATO as readonly string[]).includes(tipo)) {
            if (/^resposta da proposta/i.test((t.description || '').trim())) buckets.add('🤝 Resposta de proposta');
            else buckets.add('💬 Follow-up marcado');
        }
    }
    return buckets.size > 0 ? Array.from(buckets) : ['Sem próxima ação'];
}

// Origens conhecidas (mesmas opções do NewLeadModal). Leads legados sem origemTipo caem em "Outros".
export const ORIGEM_FILTER_OPTIONS = ['Networking', 'Ligação', 'Ação de rua', 'Disparo de msg', 'Propaganda', 'Outros'] as const;

/**
 * Deriva a "origem" de um lead para fins de filtro:
 * - origemTipo válido → usa direto;
 * - senão, origem começando com "Propaganda" → Propaganda;
 * - senão, origem igual a uma das opções conhecidas → essa opção;
 * - qualquer outra coisa (legado, texto livre, sem origem) → "Outros".
 */
export function getOrigemBucket(lead: { origemTipo?: unknown; origem?: unknown }): string {
    const conhecidas = ORIGEM_FILTER_OPTIONS as readonly string[];
    const tipo = typeof lead.origemTipo === 'string' ? lead.origemTipo.trim() : '';
    if (conhecidas.includes(tipo)) return tipo;
    const origem = typeof lead.origem === 'string' ? lead.origem.trim() : '';
    if (origem.toLowerCase().startsWith('propaganda')) return 'Propaganda';
    if (conhecidas.includes(origem)) return origem;
    return 'Outros';
}

/**
 * Nome da campanha (propaganda) de um lead. Usa origemPropaganda quando existe;
 * senão tenta extrair do texto "Propaganda · Nome da Campanha (Anúncio)".
 * Retorna null para leads que não são de Propaganda.
 */
export function getCampanhaDoLead(lead: { origemTipo?: unknown; origem?: unknown; origemPropaganda?: unknown }): string | null {
    if (getOrigemBucket(lead) !== 'Propaganda') return null;
    if (typeof lead.origemPropaganda === 'string' && lead.origemPropaganda.trim()) {
        return lead.origemPropaganda.trim();
    }
    const origem = typeof lead.origem === 'string' ? lead.origem.trim() : '';
    const semPrefixo = origem.replace(/^propaganda\s*[·\-–—:]?\s*/i, '').trim();
    return semPrefixo || 'Sem campanha';
}

export interface Filters {
    [key: string]: string[];
}

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: Filters, origem: string | null, campanha: string | null) => void;
    initialFilters: Filters;
    /** Origem selecionada (single-select) — mesma fonte de verdade do Filtro Rápido */
    initialOrigem?: string | null;
    /** Campanha (propaganda) selecionada — só faz sentido quando origem = Propaganda */
    initialCampanha?: string | null;
    /** Campanhas distintas encontradas nos leads carregados (com contagem) */
    campanhas?: { nome: string; count: number }[];
    /** @deprecated Etapas vêm do contexto (funil configurável) */
    pipelineStages?: string[];
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
                ? 'bg-[#FF1E56]/15 border-[#FF3364]/60 text-[#FF9EB5] font-semibold shadow-[0_0_12px_-2px_rgba(255,30,86,0.4)]'
                : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08] hover:border-[#FF1E56]/30'
            }
        `}
    >
        {label}
    </button>
);

export default function FilterModal({ isOpen, onClose, onApply, initialFilters, initialOrigem = null, initialCampanha = null, campanhas = [] }: FilterModalProps) {
    const { stages: stagesFromContext } = usePipelineStages();
    const pipelineStages = stagesFromContext;
    const [selectedFilters, setSelectedFilters] = useState<Filters>(initialFilters);
    const [origemSel, setOrigemSel] = useState<string | null>(initialOrigem);
    const [campanhaSel, setCampanhaSel] = useState<string | null>(initialCampanha);

    useEffect(() => {
        setSelectedFilters(initialFilters);
    }, [initialFilters]);

    useEffect(() => {
        setOrigemSel(initialOrigem);
        setCampanhaSel(initialCampanha);
    }, [initialOrigem, initialCampanha]);

    useEffect(() => {
        if (!pipelineStages.length) return;
        const etapasValidas = [...pipelineStages];
        setSelectedFilters((prev) => {
            const etapaSelected = prev['etapa'] || [];
            const valid = etapaSelected.filter((e) => etapasValidas.includes(e));
            if (valid.length === etapaSelected.length) return prev;
            return { ...prev, etapa: valid.length ? valid : [] };
        });
    }, [pipelineStages.join(',')]);

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
        setOrigemSel(null);
        setCampanhaSel(null);
    }

    const handleOrigemClick = (option: string) => {
        const next = origemSel === option ? null : option;
        setOrigemSel(next);
        if (next !== 'Propaganda') setCampanhaSel(null);
    };

    const hasActiveFilters = Object.values(selectedFilters).some(arr => arr && arr.length > 0) || origemSel !== null;
    const situationQuestion = { title: 'Etapa do funil (até onde o cliente chegou)', key: 'etapa', options: [...pipelineStages] };
    const acaoQuestion = { title: 'Próxima ação (o que está marcado)', key: 'proximaAcao', options: [...ACAO_FILTER_OPTIONS] };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4" onMouseDown={onClose}>
            <div className="bg-[#12101a] rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] w-full max-w-2xl relative overflow-hidden flex flex-col border border-white/10" onMouseDown={(e) => e.stopPropagation()}>
                <div className="absolute inset-x-0 top-0 gx-line" />
                {/* Cabeçalho */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Filtrar Leads</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-white/10 hover:text-[#FF5C7E] transition-colors">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                
                {/* Conteúdo com scroll */}
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Status de Tarefa */}
                    <div>
                        <h4 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2.5">Status da Tarefa</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            {TASK_STATUS_OPTIONS.map(({ value, label }) => (
                                <FilterTag
                                    key={value}
                                    label={label}
                                    isSelected={(selectedFilters['taskStatus'] || []).includes(value)}
                                    onClick={() => handleTagClick('taskStatus', value)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Origem do Lead (single-select) — mesma fonte de verdade do Filtro Rápido */}
                    <div>
                        <h4 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2.5">Origem do Lead</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                            <FilterTag
                                label="Todas"
                                isSelected={origemSel === null}
                                onClick={() => { setOrigemSel(null); setCampanhaSel(null); }}
                            />
                            {ORIGEM_FILTER_OPTIONS.map(option => (
                                <FilterTag
                                    key={option}
                                    label={option}
                                    isSelected={origemSel === option}
                                    onClick={() => handleOrigemClick(option)}
                                />
                            ))}
                        </div>
                        {origemSel === 'Propaganda' && (
                            <div className="mt-3">
                                <h4 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2.5">Qual propaganda?</h4>
                                {campanhas.length === 0 ? (
                                    <p className="text-xs text-text-secondary">Nenhuma propaganda encontrada nos leads carregados.</p>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                        <FilterTag
                                            label="Todas"
                                            isSelected={campanhaSel === null}
                                            onClick={() => setCampanhaSel(null)}
                                        />
                                        {campanhas.map(({ nome, count }) => (
                                            <FilterTag
                                                key={nome}
                                                label={`${nome} (${count})`}
                                                isSelected={campanhaSel === nome}
                                                onClick={() => setCampanhaSel(campanhaSel === nome ? null : nome)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {[situationQuestion, acaoQuestion, ...QUALIFICATION_QUESTIONS].map(group => (
                        <div key={group.key}>
                            <h4 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2.5">{group.title}</h4>
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
                <div className="flex justify-end gap-3 p-4 border-t border-white/10 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={handleClearFilters}
                        disabled={!hasActiveFilters}
                        className="px-4 py-2 text-xs font-semibold text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Limpar
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onApply(selectedFilters, origemSel, origemSel === 'Propaganda' ? campanhaSel : null);
                            onClose();
                        }}
                        className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-xl transition-all shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
} 