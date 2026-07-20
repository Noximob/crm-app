'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import CrmHeader from './_components/CrmHeader';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import FilterModal, { Filters, ORIGEM_FILTER_OPTIONS, getOrigemBucket, getCampanhaDoLead } from './_components/FilterModal';
import { getDemoLeads } from '@/lib/espelho/demoData';
import LoadingState from '@/components/ui/LoadingState';
import { ensureTarefasPendentes } from '@/lib/leadTasks';
import { ETAPA_FECHADO, ETAPA_DESCARTADO, ETAPAS_DO_ADMIN } from '@/lib/circuito';
import { statusDoLead, type StatusLead } from '@/lib/statusLead';

// --- Tipos ---
interface Lead {
  id: string;
  nome: string;
  telefone: string;
  etapa: string;
  taskStatus: StatusLead;
  origem?: string;
  origemTipo?: string;
  origemPropaganda?: string;
  qualificacao?: { [key: string]: string | string[] };
  [key: string]: any;
}

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
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 32 32" width="24" height="24" fill="none">
    <circle cx="16" cy="16" r="16" fill="#25D366" />
    <path d="M23.5 20.5c-.3-.2-1.7-.8-2-1s-.5-.2-.7.1c-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.2-.4-2.3-1.3-.8-.7-1.3-1.5-1.5-1.8-.2-.3 0-.5.1-.7.1-.1.2-.3.3-.5.1-.2.1-.4 0-.6-.1-.2-.7-1.7-1-2.3-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.2.2-.7.7-.7 1.7 0 1 .7 2 1.1 2.5.4.5 1.5 2 3.6 2.7 2.1.7 2.1.5 2.5.5.4 0 1.2-.5 1.4-1 .2-.5.2-.9.1-1.1z" fill="#fff" />
  </svg>
);



// --- Componentes ---
const FilterChip = ({ children, selected, onClick, className = '', title }: { children: React.ReactNode, selected?: boolean, onClick: () => void, className?: string, title?: string }) => (
    <button onClick={onClick} title={title} className={`px-2.5 py-1.5 text-xs font-semibold border rounded-lg transition-colors whitespace-nowrap ${
        selected
            ? 'bg-[#FF1E56]/15 border-[#FF3364]/60 text-[#FF9EB5] shadow-[0_0_12px_-2px_rgba(255,30,86,0.4)]'
            : 'border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:border-white/20'
    } ${className}`}>
        {children}
    </button>
);

const StatusIndicator = ({ status }: { status: StatusLead }) => {
    const statusInfo: Record<string, { color: string; text: string; destaque?: boolean }> = {
        'Ação agora': { color: 'bg-[#FF1E56] shadow-[0_0_10px_rgba(255,30,86,0.9)] animate-pulse', text: 'Ação agora', destaque: true },
        'Tarefa em Atraso': { color: 'bg-[#FF1E56] shadow-[0_0_8px_rgba(255,30,86,0.6)]', text: 'Atrasada' },
        'Tarefa do Dia': { color: 'bg-[#E8C547] shadow-[0_0_8px_rgba(232,197,71,0.5)]', text: 'Para Hoje' },
        'Tarefa Futura': { color: 'bg-[#7DD3FC]', text: 'Futura' },
        'Sem tarefa': { color: 'bg-white/25', text: 'Sem Tarefa' },
        'Venda fechada': { color: 'bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.6)]', text: '🏆 Venda' },
    };
    const { color, text, destaque } = statusInfo[status] || statusInfo['Sem tarefa'];

    return (
        <div className={`flex items-center gap-2 ${destaque ? 'text-[#FF9EB5] font-bold' : ''}`}>
            <span className={`h-2.5 w-2.5 ${color} rounded-full`}></span>
            {text}
        </div>
    )
};

// Classes de cor do chip de etapa: dourado no circuito, verde para Fechado, cinza para Descartado
const etapaChipClasses = (etapa: string) => {
    if (etapa === ETAPA_FECHADO) return 'bg-[#34D399]/10 border-[#34D399]/35 text-[#34D399]';
    if (etapa === ETAPA_DESCARTADO) return 'bg-white/[0.05] border-white/15 text-text-secondary';
    return 'bg-[#E8C547]/10 border-[#E8C547]/35 text-[#FFE9A6]';
};

// Novo componente para título com barra colorida
const SectionTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] relative z-10">{children}</h2>
  </div>
);

const TAREFA_PARAM_MAP: Record<string, StatusLead> = {
    acao: 'Ação agora',
    atraso: 'Tarefa em Atraso',
    hoje: 'Tarefa do Dia',
    sem: 'Sem tarefa',
    futura: 'Tarefa Futura',
};

const CRM_LIST_STATE_KEY = 'crm-list-state-v1';

export default function CrmPage() {
    const { currentUser, isEspelhoDemo } = useAuth();
    const { stages, normalizeEtapa } = usePipelineStages();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [activeTaskFilter, setActiveTaskFilter] = useState<StatusLead | null>(null);
    const [activeOrigemFilter, setActiveOrigemFilter] = useState<string | null>(null);
    const [activePropagandaFilter, setActivePropagandaFilter] = useState<string | null>(null);
    const [isFilterModalOpen, setFilterModalOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState<Filters>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasRestoredState, setHasRestoredState] = useState(false);
    const [filtroRapidoOpen, setFiltroRapidoOpen] = useState(false);
    const filtroRapidoRef = useRef<HTMLDivElement>(null);
    const PAGE_SIZE = 20;
    const MAX_LEADS_LOAD = 500;

    // Fechar dropdown Filtro Rápido ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filtroRapidoRef.current && !filtroRapidoRef.current.contains(e.target as Node)) {
                setFiltroRapidoOpen(false);
            }
        };
        if (filtroRapidoOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [filtroRapidoOpen]);

    // Filtro de tarefa vindo da URL (?tarefa=atraso|hoje|sem)
    useEffect(() => {
        const tarefa = searchParams.get('tarefa');
        if (tarefa && TAREFA_PARAM_MAP[tarefa]) {
            setActiveTaskFilter(TAREFA_PARAM_MAP[tarefa]);
        }
    }, [searchParams]);

    // Restaurar filtros / busca / página ao voltar do detalhe do lead
    useEffect(() => {
        if (typeof window === 'undefined') {
            setHasRestoredState(true);
            return;
        }
        try {
            // Se chegou com ?tarefa= na URL (botões do plano de ação da home), o filtro da URL manda:
            // não restaurar o filtro de tarefa nem a página salvos, senão eles atropelam o clique do usuário.
            const tarefaUrl = new URLSearchParams(window.location.search).get('tarefa');
            const veioComFiltroUrl = !!(tarefaUrl && TAREFA_PARAM_MAP[tarefaUrl]);
            const raw = window.sessionStorage.getItem(CRM_LIST_STATE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved.activeFilter !== undefined) setActiveFilter(saved.activeFilter);
                if (saved.activeTaskFilter !== undefined && !veioComFiltroUrl) setActiveTaskFilter(saved.activeTaskFilter);
                if (saved.activeOrigemFilter !== undefined) setActiveOrigemFilter(saved.activeOrigemFilter);
                if (saved.activePropagandaFilter !== undefined) setActivePropagandaFilter(saved.activePropagandaFilter);
                if (saved.advancedFilters !== undefined) setAdvancedFilters(saved.advancedFilters);
                if (saved.searchTerm !== undefined) setSearchTerm(saved.searchTerm);
                if (saved.currentPage !== undefined && !veioComFiltroUrl) setCurrentPage(saved.currentPage);
            }
        } catch (err) {
            console.error('Erro ao restaurar estado da lista CRM:', err);
        } finally {
            // Marca que já tentamos restaurar (com ou sem dados salvos),
            // para que o efeito de persistência só rode depois disso
            setHasRestoredState(true);
        }
    }, []);

    // Quando o funil (etapas) muda, limpar filtro rápido se a etapa selecionada não existir mais
    // Só aplica quando stages já foi carregado (length > 0) para não resetar página ao voltar do detalhe
    useEffect(() => {
        if (
            stages.length > 0 &&
            activeFilter &&
            !stages.includes(activeFilter)
        ) {
            setActiveFilter(null);
            setCurrentPage(1);
        }
    }, [stages.join(','), activeFilter]);

    // Persistir estado atual da lista (filtros, busca, página) para navegações de ida/volta.
    // Só começa a persistir depois que a tentativa de restore já aconteceu,
    // para não sobrescrever o estado salvo logo no primeiro mount.
    useEffect(() => {
        if (!hasRestoredState || typeof window === 'undefined') return;
        try {
            const toSave = {
                activeFilter,
                activeTaskFilter,
                activeOrigemFilter,
                activePropagandaFilter,
                advancedFilters,
                searchTerm,
                currentPage,
            };
            window.sessionStorage.setItem(CRM_LIST_STATE_KEY, JSON.stringify(toSave));
        } catch (err) {
            console.error('Erro ao salvar estado da lista CRM:', err);
        }
    }, [hasRestoredState, activeFilter, activeTaskFilter, activeOrigemFilter, activePropagandaFilter, advancedFilters, searchTerm, currentPage]);

    useEffect(() => {
        if (isEspelhoDemo) {
            // Mesmo status do modo real: régua das tarefas + "Ação agora" do circuito
            // Bolsão/Descartado ficam só na área do admin — não aparecem pro corretor
            setLeads(getDemoLeads()
                .filter(l => !(ETAPAS_DO_ADMIN as readonly string[]).includes(normalizeEtapa((l as any).etapa)))
                .map(l => ({
                    ...l,
                    taskStatus: statusDoLead((l as any).etapa, ((l as any).tasks || []).filter((t: any) => t.status === 'pendente')),
                })) as unknown as Lead[]);
            setLoading(false);
            return;
        }
        if (currentUser) {
            setLoading(true);
            fetchLeads();
        } else {
            setLeads([]);
            setLoading(false);
        }
    }, [currentUser, isEspelhoDemo]);

    // Tempo real para o lead mais novo (não usado no modo Espelho)
    useEffect(() => {
        if (!currentUser || isEspelhoDemo) return;
        const leadsRef = collection(db, 'leads');
        const q = query(
            leadsRef,
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc"),
            limit(1)
        );
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) return;
            const doc = snapshot.docs[0];
            const leadData = { id: doc.id, ...doc.data() } as Lead;
            // Bolsão/Descartado são da área do admin — não entram na lista do corretor
            if ((ETAPAS_DO_ADMIN as readonly string[]).includes(normalizeEtapa(leadData.etapa))) return;
            // Lead novo já traz tarefasPendentes ([]); ensure cobre leads legados sem o campo
            const tarefasMap = await ensureTarefasPendentes([leadData]);
            leadData.taskStatus = statusDoLead(leadData.etapa, tarefasMap.get(leadData.id) || []);
            leadData.qualificacao = doc.data().qualificacao || {};
            // Só adiciona se não estiver na lista
            setLeads(prev => {
                if (prev.length > 0 && prev[0].id === leadData.id) return prev;
                // Se o lead já está em qualquer posição, move para o topo
                const filtered = prev.filter(l => l.id !== leadData.id);
                return [leadData, ...filtered];
            });
        });
        return () => unsubscribe();
    }, [currentUser]);

    // Carrega todos os leads do usuário (até MAX_LEADS_LOAD), com taskStatus calculado igual ao dashboard,
    // para filtros de tarefa (Atrasada / Hoje) baterem com os números do dashboard e nenhum lead "sumir".
    const fetchLeads = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const leadsRef = collection(db, 'leads');
            const q = query(
                leadsRef,
                where("userId", "==", currentUser.uid),
                orderBy("createdAt", "desc"),
                limit(MAX_LEADS_LOAD)
            );
            const snapshot = await getDocs(q);
            const rawLeads = snapshot.docs.map(leadDoc => {
                const leadData = { id: leadDoc.id, ...leadDoc.data() } as Lead;
                leadData.qualificacao = leadDoc.data().qualificacao || {};
                return leadData;
            // Bolsão/Descartado são da área do admin — não aparecem pro corretor
            }).filter(lead => !(ETAPAS_DO_ADMIN as readonly string[]).includes(normalizeEtapa(lead.etapa)));
            const tarefasMap = await ensureTarefasPendentes(rawLeads);
            const newLeads = rawLeads.map(leadData => {
                leadData.taskStatus = statusDoLead(leadData.etapa, tarefasMap.get(leadData.id) || []);
                return leadData;
            });
            setLeads(newLeads);
        } catch (error) {
            console.error("Erro ao buscar leads:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = (filters: Filters, origem: string | null, campanha: string | null) => {
        setAdvancedFilters(filters);
        setActiveOrigemFilter(origem);
        setActivePropagandaFilter(origem === 'Propaganda' ? campanha : null);
        setCurrentPage(1);
        setFilterModalOpen(false);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setActiveFilter(null);
        setActiveTaskFilter(null);
        setActiveOrigemFilter(null);
        setActivePropagandaFilter(null);
        setAdvancedFilters({});
        setCurrentPage(1);
    };

    const filteredLeads = useMemo(() => {
        let leadsToFilter = [...leads];
        
        // Filtro por busca de nome
        if (searchTerm.trim()) {
            leadsToFilter = leadsToFilter.filter(lead => 
                lead.nome.toLowerCase().includes(searchTerm.toLowerCase().trim())
            );
        }
        
        if (activeFilter) {
            leadsToFilter = leadsToFilter.filter(lead => normalizeEtapa(lead.etapa) === activeFilter);
        }

        if (activeTaskFilter) {
            leadsToFilter = leadsToFilter.filter(lead => lead.taskStatus === activeTaskFilter);
        }

        // Filtro por origem do lead (derivada: legado sem origemTipo cai em "Outros")
        if (activeOrigemFilter) {
            leadsToFilter = leadsToFilter.filter(lead => getOrigemBucket(lead) === activeOrigemFilter);
            // Dentro de Propaganda, filtrar por campanha específica
            if (activeOrigemFilter === 'Propaganda' && activePropagandaFilter) {
                leadsToFilter = leadsToFilter.filter(lead => getCampanhaDoLead(lead) === activePropagandaFilter);
            }
        }

        const hasAdvancedFilters = Object.values(advancedFilters).some((options: string[]) => options.length > 0);
        if (hasAdvancedFilters) {
            leadsToFilter = leadsToFilter.filter(lead => {
                return Object.entries(advancedFilters).every(([key, selectedOptions]: [string, string[]]) => {
                    if (selectedOptions.length === 0) {
                        return true; 
                    }

                    // Tratamento especial para status de tarefa
                    if (key === 'taskStatus') {
                        return selectedOptions.includes(lead.taskStatus);
                    }

                    const leadValue = key === 'etapa' ? normalizeEtapa(lead.etapa) : lead.qualificacao?.[key];
                    
                    if (leadValue === undefined) {
                        return false; 
                    }

                    // Tratar tanto strings quanto arrays
                    if (Array.isArray(leadValue)) {
                        return leadValue.some(value => selectedOptions.includes(value));
                    } else {
                        return selectedOptions.includes(leadValue);
                    }
                });
            });
        }

        return leadsToFilter;
    }, [leads, searchTerm, activeFilter, activeTaskFilter, activeOrigemFilter, activePropagandaFilter, advancedFilters, normalizeEtapa]);

    // Campanhas (propagandas) distintas nos leads carregados, com contagem — para os chips "Qual propaganda?"
    const campanhas = useMemo(() => {
        const counts = new Map<string, number>();
        for (const lead of leads) {
            const campanha = getCampanhaDoLead(lead);
            if (campanha) counts.set(campanha, (counts.get(campanha) || 0) + 1);
        }
        return Array.from(counts.entries())
            .map(([nome, count]) => ({ nome, count }))
            .sort((a, b) => b.count - a.count || a.nome.localeCompare(b.nome, 'pt-BR'));
    }, [leads]);

    // Paginação em cima dos filtros (mesma lógica do dashboard: todos os leads carregados, filtrar e paginar)
    const totalFiltered = filteredLeads.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
    const paginatedLeads = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredLeads.slice(start, start + PAGE_SIZE);
    }, [filteredLeads, currentPage]);

    // Se página atual ficar inválida (ex.: menos resultados após filtro), ajustar. Só quando já temos leads para não sobrescrever o restore ao voltar do detalhe.
    useEffect(() => {
        if (totalFiltered > 0 && currentPage > totalPages) setCurrentPage(totalPages > 0 ? totalPages : 1);
    }, [totalFiltered, totalPages, currentPage]);

    const goToPage = (page: number) => {
        const p = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(p);

        // Persistir a página imediatamente para garantir que, se o usuário clicar em um lead logo em seguida, o estado mais recente esteja salvo
        if (typeof window !== 'undefined') {
            try {
                const raw = window.sessionStorage.getItem(CRM_LIST_STATE_KEY);
                const saved = raw ? JSON.parse(raw) : {};
                const toSave = {
                    ...saved,
                    activeFilter,
                    activeTaskFilter,
                    activeOrigemFilter,
                    activePropagandaFilter,
                    advancedFilters,
                    searchTerm,
                    currentPage: p,
                };
                window.sessionStorage.setItem(CRM_LIST_STATE_KEY, JSON.stringify(toSave));
            } catch (err) {
                console.error('Erro ao salvar página atual da lista CRM:', err);
            }
        }
    };

    // Exporta os leads atualmente filtrados (lista completa pós-filtros/busca, não só a página atual) para CSV
    const handleExportCsv = () => {
        if (filteredLeads.length === 0) return;

        const escapeCsv = (value: string) => {
            let v = value ?? '';
            // Proteção contra injeção de fórmula em planilhas (=, +, -, @ no início)
            if (/^[=+\-@]/.test(v)) v = `'${v}`;
            return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        };

        const formatCreatedAt = (createdAt: any): string => {
            if (!createdAt) return '';
            let d: Date | null = null;
            if (typeof createdAt.toDate === 'function') {
                d = createdAt.toDate();
            } else if (createdAt instanceof Date) {
                d = createdAt;
            } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
                const parsed = new Date(createdAt);
                if (!isNaN(parsed.getTime())) d = parsed;
            }
            return d ? d.toLocaleString('pt-BR') : '';
        };

        const header = ['Nome', 'Telefone', 'WhatsApp', 'Etapa', 'Status da tarefa', 'Origem', 'Criado em'];
        const rows = filteredLeads.map(lead => [
            lead.nome || '',
            lead.telefone || '',
            lead.whatsapp || (lead.telefone ? lead.telefone.replace(/\D/g, '') : ''),
            normalizeEtapa(lead.etapa) || '',
            lead.taskStatus || '',
            lead.origem || '',
            formatCreatedAt(lead.createdAt),
        ]);

        // BOM UTF-8 + separador ";" para abrir com acentuação correta no Excel pt-BR
        const csv = '﻿' + [header, ...rows].map(r => r.map(escapeCsv).join(';')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const today = new Date();
        const fileName = `leads-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.csv`;

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const activeAdvancedFilterCount = Object.values(advancedFilters).reduce((count, options: string[]) => count + options.length, 0);

    // Status de tarefa para filtros rápidos (mesma ordem e lógica do dashboard)
    const taskStatusFilters: StatusLead[] = ['Ação agora', 'Tarefa em Atraso', 'Tarefa do Dia', 'Tarefa Futura', 'Sem tarefa', 'Venda fechada'];

    // Quantos filtros rápidos estão ativos (etapa + tarefa + origem + campanha) — badge do botão
    const quickFilterCount = (activeFilter ? 1 : 0) + (activeTaskFilter ? 1 : 0) + (activeOrigemFilter ? 1 : 0) + (activePropagandaFilter ? 1 : 0);

    return (
        <>
        {/* Altura fixa: só os leads rolam; título, busca, paginação, filtros e cabeçalho da tabela ficam fixos */}
        <div className="flex flex-col h-[calc(100vh-5rem)] min-h-0 p-3 sm:p-4 overflow-hidden">
            <CrmHeader />
            <main className="flex flex-col flex-1 min-h-0 gap-2 mt-2">
                {/* Card principal — parte de cima fixa; compacta para sobrar mais espaço pros leads */}
                <div className="al-card relative overflow-hidden flex flex-col flex-1 min-h-0 p-3 rounded-2xl">
                    <div className="absolute inset-x-0 top-0 gx-line" />
                    {/* Uma linha (pode quebrar): título | busca | filtros | Filtro Completo + Limpar | contagem+setas — setas economizam espaço */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 flex-shrink-0 min-w-0">
                        <SectionTitle>Gestão de Leads</SectionTitle>
                        <div className="relative w-full sm:w-auto flex-shrink-0">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-4 w-4 text-text-secondary" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar lead por nome..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full sm:w-60 pl-9 pr-3 py-2 sm:py-1 border border-white/10 rounded-lg text-sm bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-[#FF5C7E]"
                                >
                                    <XIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        {/* Filtro Rápido — dropdown com chips (etapa + tarefa); página fica clean */}
                        <div className="relative flex-shrink-0" ref={filtroRapidoRef}>
                            <button
                                type="button"
                                onClick={() => setFiltroRapidoOpen((o) => !o)}
                                className="relative flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-lg transition-all shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98]"
                            >
                                <span>Filtro Rápido</span>
                                {quickFilterCount > 0 && (
                                    <span className="bg-white/90 text-[#A50D38] text-[10px] font-bold rounded-full min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center">
                                        {quickFilterCount}
                                    </span>
                                )}
                            </button>
                            {filtroRapidoOpen && (
                                <div key={`filtro-etapas-${stages.join('-')}`} className="absolute left-0 top-full mt-1.5 z-50 w-[min(90vw,420px)] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#12101a] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] py-3 px-3">
                                    <p className="text-[10px] font-extrabold text-text-secondary uppercase tracking-[0.18em] mb-2 px-1">Etapa do funil</p>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {stages.map((stage) => (
                                            <FilterChip
                                                key={stage}
                                                selected={activeFilter === stage}
                                                onClick={() => {
                                                    setActiveFilter(activeFilter === stage ? null : stage);
                                                    setCurrentPage(1);
                                                    setFiltroRapidoOpen(false);
                                                }}
                                            >
                                                {stage}
                                            </FilterChip>
                                        ))}
                                    </div>
                                    <div className="w-full h-px bg-white/10 my-2" />
                                    <p className="text-[10px] font-extrabold text-text-secondary uppercase tracking-[0.18em] mb-2 px-1">Status da tarefa</p>
                                    <div className="flex flex-wrap gap-2">
                                        {taskStatusFilters.map((taskStatus) => (
                                            <FilterChip
                                                key={taskStatus}
                                                selected={activeTaskFilter === taskStatus}
                                                onClick={() => {
                                                    setActiveTaskFilter(activeTaskFilter === taskStatus ? null : taskStatus);
                                                    setCurrentPage(1);
                                                    setFiltroRapidoOpen(false);
                                                }}
                                            >
                                                {taskStatus}
                                            </FilterChip>
                                        ))}
                                    </div>
                                    <div className="w-full h-px bg-white/10 my-2" />
                                    <p className="text-[10px] font-extrabold text-text-secondary uppercase tracking-[0.18em] mb-2 px-1">Origem do lead</p>
                                    <div className="flex flex-wrap gap-2">
                                        <FilterChip
                                            selected={!activeOrigemFilter}
                                            onClick={() => {
                                                setActiveOrigemFilter(null);
                                                setActivePropagandaFilter(null);
                                                setCurrentPage(1);
                                                setFiltroRapidoOpen(false);
                                            }}
                                        >
                                            Todas
                                        </FilterChip>
                                        {ORIGEM_FILTER_OPTIONS.map((origem) => (
                                            <FilterChip
                                                key={origem}
                                                selected={activeOrigemFilter === origem}
                                                onClick={() => {
                                                    const next = activeOrigemFilter === origem ? null : origem;
                                                    setActiveOrigemFilter(next);
                                                    if (next !== 'Propaganda') setActivePropagandaFilter(null);
                                                    setCurrentPage(1);
                                                    // Ao escolher Propaganda, mantém aberto para escolher a campanha logo abaixo
                                                    if (next !== 'Propaganda') setFiltroRapidoOpen(false);
                                                }}
                                            >
                                                {origem}
                                            </FilterChip>
                                        ))}
                                    </div>
                                    {activeOrigemFilter === 'Propaganda' && (
                                        <div className="mt-3">
                                            <p className="text-[10px] font-extrabold text-text-secondary uppercase tracking-[0.18em] mb-2 px-1">Qual propaganda?</p>
                                            {campanhas.length === 0 ? (
                                                <p className="text-xs text-text-secondary px-1">Nenhuma propaganda encontrada nos leads carregados.</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    <FilterChip
                                                        selected={!activePropagandaFilter}
                                                        onClick={() => {
                                                            setActivePropagandaFilter(null);
                                                            setCurrentPage(1);
                                                            setFiltroRapidoOpen(false);
                                                        }}
                                                    >
                                                        Todas
                                                    </FilterChip>
                                                    {campanhas.map(({ nome, count }) => (
                                                        <FilterChip
                                                            key={nome}
                                                            title={nome}
                                                            className="max-w-full truncate"
                                                            selected={activePropagandaFilter === nome}
                                                            onClick={() => {
                                                                setActivePropagandaFilter(activePropagandaFilter === nome ? null : nome);
                                                                setCurrentPage(1);
                                                                setFiltroRapidoOpen(false);
                                                            }}
                                                        >
                                                            {nome} ({count})
                                                        </FilterChip>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Filtro Completo + Limpar filtros (quando aparece) — lado a lado, permitem quebrar antes da paginação */}
                        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                            <button
                                type="button"
                                onClick={() => setFilterModalOpen(true)}
                                className="relative flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-lg transition-all shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98]"
                            >
                                <span>Filtro Completo</span>
                                {activeAdvancedFilterCount > 0 && (
                                    <span className="bg-[#34D399] text-[#052e1b] text-[10px] font-bold rounded-full px-2 py-0.5 ml-1 animate-pulse-slow">
                                        {activeAdvancedFilterCount}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleExportCsv}
                                disabled={totalFiltered === 0}
                                title="Exportar os leads filtrados para CSV"
                                className="px-3 py-1.5 text-xs font-semibold text-text-secondary border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Exportar CSV
                            </button>
                            {(searchTerm.trim() || activeFilter || activeTaskFilter || activeOrigemFilter || activeAdvancedFilterCount > 0) && (
                                <button
                                    onClick={handleClearFilters}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-300 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                                >
                                    <XIcon className="h-4 w-4" /> Limpar filtros
                                </button>
                            )}
                        </div>
                        {/* Contagem e paginação — no canto; setas < > economizam espaço e evitam sumir quando Limpar aparece */}
                        <div className="ml-auto flex items-center gap-1.5 flex-nowrap shrink-0 w-full sm:w-auto justify-center sm:justify-start">
                            {totalFiltered > 0 ? (
                                <>
                                    <span className="text-xs text-text-secondary whitespace-nowrap tabular-nums shrink-0">
                                        {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalFiltered)} de {totalFiltered} {totalFiltered === 1 ? 'lead' : 'leads'}
                                    </span>
                                    <div className="flex items-center gap-0.5 shrink-0" role="navigation" aria-label="Paginação">
                                        <button
                                            type="button"
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage <= 1}
                                            title="Anterior"
                                            className="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center text-xs font-bold rounded-lg border border-white/10 bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.08] transition-colors"
                                        >
                                            {'<'}
                                        </button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(p => p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2))
                                            .map((p, idx, arr) => (
                                                <React.Fragment key={p}>
                                                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-0.5 text-text-secondary">…</span>}
                                                    <button
                                                        type="button"
                                                        onClick={() => goToPage(p)}
                                                        className={`min-w-[2.5rem] w-10 h-10 sm:min-w-[1.75rem] sm:w-7 sm:h-7 flex items-center justify-center text-xs font-semibold rounded-lg border transition-colors ${
                                                            p === currentPage
                                                                ? 'bg-[#FF1E56] border-[#FF1E56] text-white shadow-[0_0_12px_-2px_rgba(255,30,86,0.5)]'
                                                                : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                                                        }`}
                                                    >
                                                        {p}
                                                    </button>
                                                </React.Fragment>
                                            ))}
                                        <button
                                            type="button"
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage >= totalPages}
                                            title="Próximo"
                                            className="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center text-xs font-bold rounded-lg border border-white/10 bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.08] transition-colors"
                                        >
                                            {'>'}
                                        </button>
                                    </div>
                                </>
                            ) : <span className="text-xs text-text-secondary">—</span>}
                        </div>
                    </div>
                    {/* Só esta parte rola: corpo da tabela (leads). Cabeçalho da tabela fica fixo no topo desta área. */}
                    <div className="hidden sm:block flex-1 min-h-0 overflow-auto rounded-xl border border-white/10">
                        <table className="w-full min-w-[760px] table-fixed">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b border-white/10 bg-[#12101a]/95 backdrop-blur-sm text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
                                    <th className="px-3 py-2 font-semibold text-left w-1/5 rounded-tl-xl">Nome</th>
                                    <th className="px-3 py-2 font-semibold text-left w-1/6">Telefone</th>
                                    <th className="px-3 py-2 font-semibold text-center w-1/12">WhatsApp</th>
                                    <th className="px-3 py-2 font-semibold text-left w-1/5">Etapa</th>
                                    <th className="px-3 py-2 font-semibold text-left w-1/5">Status da Tarefa</th>
                                    <th className="px-3 py-2 font-semibold text-center w-1/5 rounded-tr-xl">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr><td colSpan={6} className="py-8"><LoadingState label="Carregando..." /></td></tr>
                                )}
                                {!loading && leads.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center text-text-secondary py-8">Nenhum lead encontrado.</td>
                                    </tr>
                                )}
                                {!loading && leads.length > 0 && totalFiltered === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center text-text-secondary py-8">Nenhum lead corresponde aos filtros. Limpe os filtros ou altere a busca.</td>
                                    </tr>
                                )}
                                {!loading && totalFiltered > 0 && paginatedLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center text-text-secondary py-8">Nenhum lead nesta página.</td>
                                    </tr>
                                )}
                                {!loading && paginatedLeads.map((lead) => (
                                    <tr key={lead.id} className="border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.04] transition-colors">
                                        <td className="px-3 py-1.5 text-sm font-medium text-white w-1/5 truncate max-w-[180px]">{lead.nome}</td>
                                        <td className="px-3 py-1.5 text-xs text-text-secondary w-1/6 truncate max-w-[140px]">{lead.telefone}</td>
                                        <td className="px-3 py-1.5 text-center w-1/12">
                                            <a
                                                href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center text-[#25D366] hover:text-[#128C7E]"
                                                title="Conversar no WhatsApp"
                                            >
                                                <WhatsAppIcon className="h-4 w-4" />
                                            </a>
                                        </td>
                                        <td className="px-3 py-1.5 text-xs w-1/5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border truncate max-w-[120px] ${etapaChipClasses(normalizeEtapa(lead.etapa))}`}>{normalizeEtapa(lead.etapa)}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-xs w-1/5">
                                            <span className="text-white">
                                                <StatusIndicator status={lead.taskStatus} />
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 w-1/5 text-center">
                                            <div className="flex justify-center">
                                                <Link
                                                    href={`/dashboard/crm/${lead.id}`}
                                                    className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white rounded-lg shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] transition-all active:scale-[0.98]"
                                                >
                                                    Ver
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!loading && leads.length >= MAX_LEADS_LOAD && (
                            <p className="text-xs text-text-secondary mt-2 text-center">
                                Exibindo os {MAX_LEADS_LOAD} leads mais recentes. Use os filtros para refinar.
                            </p>
                        )}
                    </div>
                    {/* Mobile (<sm): lista de cards estilo app nativo — mesmos paginatedLeads e handlers da tabela */}
                    <div className="sm:hidden flex-1 min-h-0 overflow-y-auto">
                        {loading && (
                            <div className="py-8"><LoadingState label="Carregando..." /></div>
                        )}
                        {!loading && leads.length === 0 && (
                            <p className="text-center text-text-secondary py-8">Nenhum lead encontrado.</p>
                        )}
                        {!loading && leads.length > 0 && totalFiltered === 0 && (
                            <p className="text-center text-text-secondary py-8">Nenhum lead corresponde aos filtros. Limpe os filtros ou altere a busca.</p>
                        )}
                        {!loading && totalFiltered > 0 && paginatedLeads.length === 0 && (
                            <p className="text-center text-text-secondary py-8">Nenhum lead nesta página.</p>
                        )}
                        {!loading && paginatedLeads.length > 0 && (
                            <div className="flex flex-col gap-2 pb-1">
                                {paginatedLeads.map((lead) => (
                                    <div
                                        key={lead.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => router.push(`/dashboard/crm/${lead.id}`)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/dashboard/crm/${lead.id}`); } }}
                                        className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 active:scale-[0.99] transition-transform cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between gap-3 min-w-0">
                                            <p className="font-semibold text-white truncate">{lead.nome}</p>
                                            <span className="shrink-0 text-[11px] text-text-secondary">
                                                <StatusIndicator status={lead.taskStatus} />
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 min-w-0">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border truncate max-w-[55%] shrink-0 ${etapaChipClasses(normalizeEtapa(lead.etapa))}`}>{normalizeEtapa(lead.etapa)}</span>
                                            <span className="text-text-secondary text-sm truncate">{lead.telefone}</span>
                                        </div>
                                        <div className="flex items-center justify-end gap-3 mt-1">
                                            <a
                                                href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                title="Conversar no WhatsApp"
                                                className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 text-emerald-300 text-xs font-bold active:bg-[#34D399]/20 transition-colors"
                                            >
                                                <WhatsAppIcon className="h-4 w-4" />
                                                WhatsApp
                                            </a>
                                            <span className="text-white/30 text-base" aria-hidden="true">▸</span>
                                        </div>
                                    </div>
                                ))}
                                {leads.length >= MAX_LEADS_LOAD && (
                                    <p className="text-xs text-text-secondary mt-1 text-center">
                                        Exibindo os {MAX_LEADS_LOAD} leads mais recentes. Use os filtros para refinar.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            {isFilterModalOpen && (
                <FilterModal
                    key={`filter-${stages.join('-')}`}
                    isOpen={isFilterModalOpen}
                    onClose={() => setFilterModalOpen(false)}
                    onApply={handleApplyFilters}
                    initialFilters={advancedFilters}
                    initialOrigem={activeOrigemFilter}
                    initialCampanha={activePropagandaFilter}
                    campanhas={campanhas}
                    pipelineStages={stages}
                />
            )}
        </div>
        </>
    );
}

const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
); 