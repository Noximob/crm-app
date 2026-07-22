'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CrmHeader from '../_components/CrmHeader';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import KanbanColumn from './_components/KanbanColumn';
import { Lead } from '@/types';
import LoadingState from '@/components/ui/LoadingState';
import { ORIGEM_FILTER_OPTIONS, ACAO_FILTER_OPTIONS, getOrigemBucket, getCampanhaDoLead, getAcaoBuckets } from '../_components/FilterModal';
import { getTaskStatusInfo, TaskStatus } from '@/lib/leadTasks';
import { getDemoLeads } from '@/lib/espelho/demoData';
import { ETAPAS_DO_ADMIN } from '@/lib/circuito';

type LeadsByStage = { [key: string]: Lead[] };

// Paleta do funil GX — cor por índice de etapa (repete com módulo)
const FUNNEL_COLORS = ['#FFE9A6', '#E8C547', '#D4A017', '#F59E0B', '#FB923C', '#FF7A45', '#FB5E7E', '#34D399'];

// Persistência dos filtros do kanban (própria — NÃO compartilhada com a lista)
const KANBAN_FILTERS_KEY = 'crm-kanban-filtros-v1';

// Status de tarefa (label curto no chip → valor do helper compartilhado)
const TASK_FILTER_OPTIONS: { label: string; value: TaskStatus }[] = [
    { label: 'Em Atraso', value: 'Tarefa em Atraso' },
    { label: 'Para Hoje', value: 'Tarefa do Dia' },
    { label: 'Futura', value: 'Tarefa Futura' },
    { label: 'Sem tarefa', value: 'Sem tarefa' },
];

// Título de seção no padrão GX
const SectionTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">{children}</h2>
  </div>
);

// --- Ícones ---
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3"/>
    </svg>
);
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

// Chip de filtro — mesmo visual dos chips do Filtro Rápido da lista (crm/page.tsx)
const FilterChip = ({ children, selected, onClick, className = '', title }: { children: React.ReactNode, selected?: boolean, onClick: () => void, className?: string, title?: string }) => (
    <button onClick={onClick} title={title} className={`px-2.5 py-1.5 text-xs font-semibold border rounded-lg transition-colors whitespace-nowrap ${
        selected
            ? 'bg-[#FF1E56]/15 border-[#FF3364]/60 text-[#FF9EB5] shadow-[0_0_12px_-2px_rgba(255,30,86,0.4)]'
            : 'border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:border-white/20'
    } ${className}`}>
        {children}
    </button>
);

// Label de grupo do filtro (padrão GX das seções de filtro)
const FilterLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">{children}</span>
);

// Adaptadores: o tipo Lead compartilhado não declara os campos de origem (só index signature),
// então extraímos explicitamente antes de passar para os helpers compartilhados.
const origemDoLead = (lead: Lead) =>
    getOrigemBucket({ origemTipo: lead.origemTipo, origem: lead.origem });
const campanhaDoLead = (lead: Lead) =>
    getCampanhaDoLead({ origemTipo: lead.origemTipo, origem: lead.origem, origemPropaganda: lead.origemPropaganda });

export default function AndamentoPage() {
    const { currentUser, isEspelhoDemo } = useAuth();
    const { stages, normalizeEtapa } = usePipelineStages();
    const [leads, setLeads] = useState<LeadsByStage>({});
    const [loading, setLoading] = useState(true);

    // --- Filtros do kanban ---
    const [searchTerm, setSearchTerm] = useState('');
    const [origemFilter, setOrigemFilter] = useState<string | null>(null);
    const [campanhaFilter, setCampanhaFilter] = useState<string | null>(null);
    const [taskFilter, setTaskFilter] = useState<TaskStatus | null>(null);
    const [acaoFilter, setAcaoFilter] = useState<string | null>(null);
    const [filtersRestored, setFiltersRestored] = useState(false);

    // Restaurar filtros da sessão (chave própria do kanban)
    useEffect(() => {
        try {
            const raw = window.sessionStorage.getItem(KANBAN_FILTERS_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (typeof saved.searchTerm === 'string') setSearchTerm(saved.searchTerm);
                if (typeof saved.origemFilter === 'string' && (ORIGEM_FILTER_OPTIONS as readonly string[]).includes(saved.origemFilter)) {
                    setOrigemFilter(saved.origemFilter);
                    if (saved.origemFilter === 'Propaganda' && typeof saved.campanhaFilter === 'string') {
                        setCampanhaFilter(saved.campanhaFilter);
                    }
                }
                if (typeof saved.taskFilter === 'string' && TASK_FILTER_OPTIONS.some(o => o.value === saved.taskFilter)) {
                    setTaskFilter(saved.taskFilter as TaskStatus);
                }
                if (typeof saved.acaoFilter === 'string' && (ACAO_FILTER_OPTIONS as readonly string[]).includes(saved.acaoFilter)) {
                    setAcaoFilter(saved.acaoFilter);
                }
            }
        } catch (err) {
            console.error('Erro ao restaurar filtros do kanban:', err);
        }
        setFiltersRestored(true);
    }, []);

    // Persistir filtros na sessão (só depois de restaurar, para não sobrescrever)
    useEffect(() => {
        if (!filtersRestored) return;
        try {
            window.sessionStorage.setItem(KANBAN_FILTERS_KEY, JSON.stringify({ searchTerm, origemFilter, campanhaFilter, taskFilter, acaoFilter }));
        } catch (err) {
            console.error('Erro ao salvar filtros do kanban:', err);
        }
    }, [filtersRestored, searchTerm, origemFilter, campanhaFilter, taskFilter, acaoFilter]);

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        const stageList = stages.length ? stages : [];
        const groupByStage = (list: Lead[]) => {
            const leadsByStage = stageList.reduce<LeadsByStage>((acc, stage) => ({ ...acc, [stage]: [] }), {});
            for (const lead of list) {
                const stage = normalizeEtapa(lead.etapa);
                // Descartado/Bolsão ficam fora do quadro (bolsa é do admin); Fechamento é coluna
                if ((ETAPAS_DO_ADMIN as readonly string[]).includes(stage)) continue;
                if (leadsByStage[stage]) {
                    leadsByStage[stage].push(lead);
                } else {
                    const first = stageList[0];
                    if (first) leadsByStage[first].push(lead);
                }
            }
            return leadsByStage;
        };

        // Modo Espelho: usa os leads de demonstração (mesma fonte da lista), sem Firestore
        if (isEspelhoDemo) {
            const demoLeads = getDemoLeads().map(l => ({
                ...l,
                tarefasPendentes: (l.tasks || []).filter(t => t.status === 'pendente'),
            })) as unknown as Lead[];
            setLeads(groupByStage(demoLeads));
            setLoading(false);
            return;
        }

        const leadsRef = collection(db, 'leads');
        const q = query(leadsRef, where("userId", "==", currentUser.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Lead[] = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() } as Lead);
            });
            setLeads(groupByStage(list));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, isEspelhoDemo, stages, normalizeEtapa]);

    // Campanhas (propagandas) distintas nos leads carregados, com contagem — mesmo padrão do filtro rápido da lista
    const campanhas = useMemo(() => {
        const counts = new Map<string, number>();
        for (const stage of Object.keys(leads)) {
            for (const lead of leads[stage]) {
                const campanha = campanhaDoLead(lead);
                if (campanha) counts.set(campanha, (counts.get(campanha) || 0) + 1);
            }
        }
        return Array.from(counts.entries())
            .map(([nome, count]) => ({ nome, count }))
            .sort((a, b) => b.count - a.count || a.nome.localeCompare(b.nome, 'pt-BR'));
    }, [leads]);

    // Leads visíveis por coluna após aplicar os filtros (colunas/etapas continuam todas visíveis)
    const filteredLeads = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        const searchDigitos = searchTerm.replace(/\D/g, '');
        const matches = (lead: Lead) => {
            if (search) {
                const nomeOk = (lead.nome || '').toLowerCase().includes(search);
                const telOk = searchDigitos.length >= 3 && ((lead as any).telefone || '').replace(/\D/g, '').includes(searchDigitos);
                if (!nomeOk && !telOk) return false;
            }
            if (origemFilter) {
                if (origemDoLead(lead) !== origemFilter) return false;
                if (origemFilter === 'Propaganda' && campanhaFilter && campanhaDoLead(lead) !== campanhaFilter) return false;
            }
            if (taskFilter && getTaskStatusInfo(lead.tarefasPendentes) !== taskFilter) return false;
            if (acaoFilter && !getAcaoBuckets(lead.tarefasPendentes as any).includes(acaoFilter)) return false;
            return true;
        };
        const out: LeadsByStage = {};
        for (const stage of Object.keys(leads)) {
            out[stage] = leads[stage].filter(matches);
        }
        return out;
    }, [leads, searchTerm, origemFilter, campanhaFilter, taskFilter, acaoFilter]);

    // Badge: quantos filtros estão ativos (busca + origem + campanha + tarefa + ação)
    const activeFilterCount =
        (searchTerm.trim() ? 1 : 0) +
        (origemFilter ? 1 : 0) +
        (origemFilter === 'Propaganda' && campanhaFilter ? 1 : 0) +
        (taskFilter ? 1 : 0) +
        (acaoFilter ? 1 : 0);

    const handleClearFilters = () => {
        setSearchTerm('');
        setOrigemFilter(null);
        setCampanhaFilter(null);
        setTaskFilter(null);
        setAcaoFilter(null);
    };

    const handleOrigemClick = (option: string) => {
        const next = origemFilter === option ? null : option;
        setOrigemFilter(next);
        if (next !== 'Propaganda') setCampanhaFilter(null);
    };

    return (
        <div className="flex flex-col min-h-0 flex-1 min-w-0">
            <CrmHeader />
            <main className="flex flex-col flex-1 min-h-0 gap-4 mt-4 min-w-0">
                <div className="flex flex-col flex-1 min-h-0 al-card relative p-4 min-w-0 overflow-hidden">
                    <div className="absolute inset-x-0 top-0 gx-line" />
                    <div className="shrink-0 mb-3">
                        <SectionTitle>Andamento dos Leads</SectionTitle>
                        <p className="text-[11px] text-text-secondary mt-0.5">O circuito move os leads sozinho pelo momento do cliente — o quadro é só pra acompanhar. Clique no card pra abrir.</p>
                    </div>

                    {/* Barra de filtros do kanban — compacta, padrão GX */}
                    <div className="shrink-0 mb-3 flex flex-col gap-2 min-w-0">
                        {/* Busca + badge de filtros ativos + limpar */}
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <div className="relative w-full sm:w-64 shrink-0">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-4 w-4 text-text-secondary" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar por nome ou telefone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-9 pr-8 py-2 sm:py-1.5 border border-white/10 rounded-lg text-sm bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-secondary hover:text-[#FF5C7E]"
                                        title="Limpar busca"
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            {activeFilterCount > 0 && (
                                <>
                                    <span className="text-[11px] font-bold tabular-nums text-[#FF9EB5] bg-[#FF1E56]/15 border border-[#FF3364]/60 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {activeFilterCount} {activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                                    </span>
                                    <button
                                        onClick={handleClearFilters}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-300 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                                    >
                                        <XIcon className="h-4 w-4" /> Limpar
                                    </button>
                                </>
                            )}
                        </div>
                        {/* Origem do lead — single-select */}
                        <div className="flex items-center gap-2 min-w-0">
                            <FilterLabel>Origem</FilterLabel>
                            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto min-w-0 pb-1 -mb-1">
                                <FilterChip
                                    selected={!origemFilter}
                                    onClick={() => { setOrigemFilter(null); setCampanhaFilter(null); }}
                                >
                                    Todas
                                </FilterChip>
                                {ORIGEM_FILTER_OPTIONS.map((origem) => (
                                    <FilterChip
                                        key={origem}
                                        selected={origemFilter === origem}
                                        onClick={() => handleOrigemClick(origem)}
                                    >
                                        {origem}
                                    </FilterChip>
                                ))}
                            </div>
                        </div>
                        {/* Qual propaganda? — só quando Origem = Propaganda */}
                        {origemFilter === 'Propaganda' && (
                            <div className="flex items-center gap-2 min-w-0">
                                <FilterLabel>Qual propaganda?</FilterLabel>
                                {campanhas.length === 0 ? (
                                    <p className="text-xs text-text-secondary">Nenhuma propaganda encontrada nos leads carregados.</p>
                                ) : (
                                    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto min-w-0 pb-1 -mb-1">
                                        <FilterChip
                                            selected={!campanhaFilter}
                                            onClick={() => setCampanhaFilter(null)}
                                        >
                                            Todas
                                        </FilterChip>
                                        {campanhas.map(({ nome, count }) => (
                                            <FilterChip
                                                key={nome}
                                                title={nome}
                                                selected={campanhaFilter === nome}
                                                onClick={() => setCampanhaFilter(campanhaFilter === nome ? null : nome)}
                                            >
                                                {nome} ({count})
                                            </FilterChip>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Status da tarefa — single-select */}
                        <div className="flex items-center gap-2 min-w-0">
                            <FilterLabel>Tarefa</FilterLabel>
                            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto min-w-0 pb-1 -mb-1">
                                <FilterChip
                                    selected={!taskFilter}
                                    onClick={() => setTaskFilter(null)}
                                >
                                    Todas
                                </FilterChip>
                                {TASK_FILTER_OPTIONS.map(({ label, value }) => (
                                    <FilterChip
                                        key={value}
                                        selected={taskFilter === value}
                                        onClick={() => setTaskFilter(taskFilter === value ? null : value)}
                                    >
                                        {label}
                                    </FilterChip>
                                ))}
                            </div>
                        </div>
                        {/* Próxima ação — o que está MARCADO (a etapa diz até onde chegou; a tarefa diz o próximo passo) */}
                        <div className="flex items-center gap-2 min-w-0">
                            <FilterLabel>Próxima ação</FilterLabel>
                            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto min-w-0 pb-1 -mb-1">
                                <FilterChip
                                    selected={!acaoFilter}
                                    onClick={() => setAcaoFilter(null)}
                                >
                                    Todas
                                </FilterChip>
                                {ACAO_FILTER_OPTIONS.map((acao) => (
                                    <FilterChip
                                        key={acao}
                                        selected={acaoFilter === acao}
                                        onClick={() => setAcaoFilter(acaoFilter === acao ? null : acao)}
                                    >
                                        {acao}
                                    </FilterChip>
                                ))}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <LoadingState label="Carregando quadro..." className="py-10" />
                    ) : (
                        <div className="flex gap-4 flex-1 min-h-0 overflow-x-auto w-full max-w-full pb-2">
                            {stages.map((stage, index) => (
                                <KanbanColumn
                                    key={stage}
                                    id={stage}
                                    title={stage}
                                    leads={filteredLeads[stage] || []}
                                    corEtapa={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
