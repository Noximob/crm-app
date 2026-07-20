'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, onSnapshot, updateDoc, collection, query, orderBy, serverTimestamp, where, writeBatch, limit } from 'firebase/firestore';
import { TarefaPendente, fetchPendentesDaSubcolecao, getTaskStatusInfo, toJsDate, type TaskStatus } from '@/lib/leadTasks';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { Lead } from '@/types';
import CrmHeader from '../_components/CrmHeader';
import AgendaModal, { TaskPayload } from '../_components/AgendaModal';
import CancelTaskModal from '../_components/CancelTaskModal';
import AtendimentoOverlay, { perguntaDoLead, fmtDataHora, type AcaoCircuito, type EstadoFluxo } from '@/components/atendimento/AtendimentoOverlay';
import { executarAcaoCircuito } from '@/lib/circuitoActions';
import { QUALIFICATION_QUESTIONS } from '@/lib/qualificacao';
import { getDemoLeadById, getDemoInteractions } from '@/lib/espelho/demoData';
import { CADENCIAS_PADRAO, carregarCadencias, ETAPA_DESCARTADO, type CadenciasFunil } from '@/lib/circuito';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';

// --- Ícones ---
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
const TaskIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

// --- Cores por tipo de tarefa/interação ---
const TIPO_COR: Record<string, { chip: string; borda: string }> = {
    'Ligação': { chip: 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]', borda: 'border-l-[#7DD3FC]/60' },
    'WhatsApp': { chip: 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300', borda: 'border-l-emerald-400/60' },
    'Visita': { chip: 'bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6]', borda: 'border-l-[#E8C547]/60' },
    'Meet': { chip: 'bg-[#9F6BFF]/10 border-[#9F6BFF]/35 text-[#C4A6FF]', borda: 'border-l-[#9F6BFF]/60' },
    'Follow-up': { chip: 'bg-[#FF1E56]/10 border-[#FF1E56]/35 text-[#FF7A97]', borda: 'border-l-[#FF1E56]/60' },
    'Produto': { chip: 'bg-[#F59E0B]/10 border-[#F59E0B]/35 text-[#FBBF24]', borda: 'border-l-[#F59E0B]/60' },
    'Outros': { chip: 'bg-white/[0.05] border-white/15 text-text-secondary', borda: 'border-l-white/25' },
    'Etapa': { chip: 'bg-white/[0.05] border-white/15 text-white/70', borda: 'border-l-white/30' },
    'Venda': { chip: 'bg-[#E8C547]/15 border-[#E8C547]/50 text-[#FFE9A6]', borda: 'border-l-[#E8C547]' },
    'Descarte': { chip: 'bg-red-500/10 border-red-500/35 text-red-300', borda: 'border-l-red-400/60' },
    'Tarefa Agendada': { chip: 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]', borda: 'border-l-[#7DD3FC]/60' },
    'Tarefa Concluída': { chip: 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300', borda: 'border-l-emerald-400/60' },
    'Tarefa Cancelada': { chip: 'bg-red-500/10 border-red-500/35 text-red-300', borda: 'border-l-red-400/60' },
};
const tipoCor = (t: string) => TIPO_COR[t] ?? TIPO_COR['Outros'];

const getTaskStatusColor = (status: TaskStatus | 'Venda fechada') => {
    switch (status) {
        case 'Tarefa em Atraso': return 'bg-[#FF1E56] shadow-[0_0_8px_rgba(255,30,86,0.8)]';
        case 'Tarefa do Dia': return 'bg-[#E8C547] shadow-[0_0_8px_rgba(232,197,71,0.8)]';
        case 'Tarefa Futura': return 'bg-[#7DD3FC] shadow-[0_0_8px_rgba(125,211,252,0.7)]';
        case 'Venda fechada': return 'bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.7)]';
        default: return 'bg-white/30';
    }
};

interface Interaction {
    id: string;
    type: string;
    notes: string;
    timestamp: any;
    taskId?: string;
    cancellationNotes?: string;
    /** Quem fez a ação — autoria no histórico real do cliente */
    por?: string;
}

interface QualificationData {
    [key: string]: string[];
}

interface Task {
    id: string;
    description: string;
    type: string;
    dueDate: any; // Firestore timestamp
    status: 'pendente' | 'concluída' | 'cancelada';
}

const p2 = (n: number) => String(n).padStart(2, '0');

export default function LeadDetailPage() {
    const { currentUser, userData, isEspelhoDemo } = useAuth();
    const { stages, normalizeEtapa } = usePipelineStages();
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const leadId = params.leadId as string;
    const viewAs = searchParams.get('viewAs') === '1';
    const isAdmin = userData?.permissoes?.admin || userData?.tipoConta === 'imobiliaria';
    const readOnly = viewAs && isAdmin;

    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [tasksLoaded, setTasksLoaded] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [taskToCancel, setTaskToCancel] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [qualifications, setQualifications] = useState<QualificationData>({});
    const [tempAnnotations, setTempAnnotations] = useState('');
    const [cadencias, setCadencias] = useState<CadenciasFunil>(CADENCIAS_PADRAO);
    const [executandoCircuito, setExecutandoCircuito] = useState(false);
    const [atendimentoAberto, setAtendimentoAberto] = useState(false);
    const [fechouNoX, setFechouNoX] = useState(false);
    // Botão "Descartar" da página: abre o overlay já no pop-up de descarte
    const [estadoForcado, setEstadoForcado] = useState<EstadoFluxo | null>(null);
    const foiDescartado = useRef(false);
    const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
    const [saveQual, setSaveQual] = useState<'idle' | 'salvando' | 'salvo'>('idle');
    const [saveNotas, setSaveNotas] = useState<'idle' | 'salvando' | 'salvo'>('idle');

    // Dirty-guards: não deixar o snapshot do lead atropelar edição em andamento
    const qualDirty = useRef(false);
    const notasDirty = useRef(false);
    const qualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notasTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Cadências da imobiliária (temporizadores do circuito) ---
    useEffect(() => {
        let ativo = true;
        carregarCadencias(isEspelhoDemo ? undefined : userData?.imobiliariaId).then(c => {
            if (ativo) setCadencias(c);
        });
        return () => { ativo = false; };
    }, [userData?.imobiliariaId, isEspelhoDemo]);

    // --- Lead ---
    useEffect(() => {
        if (isEspelhoDemo && leadId) {
            const demoLead = getDemoLeadById(leadId);
            if (demoLead) {
                const leadData = { ...demoLead, automacao: { status: 'inativa' as const } } as unknown as Lead;
                setLead(leadData);
                setTempAnnotations((leadData as any).anotacoes || '');
                const qual = demoLead.qualificacao || {};
                const safe: QualificationData = {};
                Object.entries(qual).forEach(([k, v]) => {
                    safe[k] = Array.isArray(v) ? v : [v as string];
                });
                setQualifications(safe);
                setTasks((demoLead.tasks || []) as Task[]);
                setInteractions(getDemoInteractions(leadId));
                setTasksLoaded(true);
            } else {
                setLead(null);
            }
            setLoading(false);
            return;
        }
        if (!currentUser || !leadId) return;
        const leadRef = doc(db, 'leads', leadId);
        const unsubscribe = onSnapshot(leadRef, async (docSnap) => {
            if (docSnap.exists()) {
                const leadData = { id: docSnap.id, ...docSnap.data() } as Lead;

                // Segurança: só o dono ou admin da imobiliária
                if (leadData.userId !== currentUser.uid) {
                    const userSnap = await getDoc(doc(db, 'usuarios', currentUser.uid));
                    const u = userSnap.exists() ? userSnap.data() : null;
                    const admin = u && (u.permissoes?.admin || u.tipoConta === 'imobiliaria');
                    if (!admin) {
                        console.error('Acesso negado: este lead não pertence a você.');
                        setLead(null);
                        setLoading(false);
                        return;
                    }
                }

                if (!leadData.automacao) leadData.automacao = { status: 'inativa' };
                setLead(leadData);

                if (!notasDirty.current) setTempAnnotations(leadData.anotacoes || '');
                if (!qualDirty.current) {
                    const qualificacao = leadData.qualificacao || {};
                    const safe: QualificationData = {};
                    Object.entries(qualificacao).forEach(([key, value]) => {
                        if (Array.isArray(value)) safe[key] = value;
                        else if (typeof value === 'string') safe[key] = [value];
                    });
                    setQualifications(safe);
                }
            } else {
                setLead(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, leadId, isEspelhoDemo]);

    // --- Interações (histórico) ---
    useEffect(() => {
        if (!currentUser || !leadId || isEspelhoDemo) return;
        const interactionsCol = collection(db, 'leads', leadId, 'interactions');
        const q = query(interactionsCol, orderBy('timestamp', 'desc'), limit(200));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setInteractions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Interaction)));
        });
        return () => unsubscribe();
    }, [currentUser, leadId, isEspelhoDemo]);

    // --- Tarefas pendentes ---
    useEffect(() => {
        if (!currentUser || !leadId || isEspelhoDemo) return;
        const tasksCol = collection(db, 'leads', leadId, 'tarefas');
        const q = query(tasksCol, where('status', '==', 'pendente'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
            setTasksLoaded(true);
        });
        return () => unsubscribe();
    }, [currentUser, leadId, isEspelhoDemo]);

    const tarefasOrdenadas = useMemo(
        () => [...tasks].sort((a, b) => (toJsDate(a.dueDate)?.getTime() ?? 0) - (toJsDate(b.dueDate)?.getTime() ?? 0)),
        [tasks]
    );
    const taskStatus = useMemo(
        () => (lead && normalizeEtapa(lead.etapa) === 'Fechamento'
            ? ('Venda fechada' as const)
            : getTaskStatusInfo(tasks as unknown as TarefaPendente[])),
        [tasks, lead, normalizeEtapa]
    );

    // ------------------------------------------------------------------
    // Pergunta pendente do circuito: qual pop-up abre e se ele deve insistir
    // ------------------------------------------------------------------
    // Relógio de 30s: a pergunta vence com a página aberta, sem precisar recarregar
    const [tickCircuito, setTickCircuito] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTickCircuito(t => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);
    const circuitoInfo = useMemo(() => {
        if (!lead) return null;
        void tickCircuito;
        return perguntaDoLead(normalizeEtapa(lead.etapa), tasks, cadencias, Date.now());
    }, [lead, tasks, cadencias, normalizeEtapa, tickCircuito]);

    // Rodízio do 1º contato: lead em Entrada/Follow-up que ainda não teve conversa de verdade
    const rodizioPrimeiroContato = useMemo(() => {
        if (!lead) return null;
        const e = normalizeEtapa(lead.etapa);
        if (e !== 'Entrada' && e !== 'Follow-up') return null;
        if (lead.circuito?.primeiroContatoEm) return null;
        return { tentativas: lead.circuito?.tentativas || 0 };
    }, [lead, normalizeEtapa]);

    // "Ao abrir o lead: entrou no lead que tem pergunta em aberto? Ela abre na hora, sobre a página."
    // Reativo: virou pendente (ex.: concluiu a última tarefa) → o pop-up abre sozinho.
    // Só não insiste na mesma visita depois de um ✕ (pendência fica avisando).
    useEffect(() => {
        if (loading || readOnly || atendimentoAberto || fechouNoX) return;
        if (circuitoInfo?.pendente) {
            const id = setTimeout(() => setAtendimentoAberto(true), 450);
            return () => clearTimeout(id);
        }
    }, [loading, readOnly, atendimentoAberto, fechouNoX, circuitoInfo]);

    const handleFecharX = () => {
        setAtendimentoAberto(false);
        setEstadoForcado(null);
        setFechouNoX(true);
        const primeiroNome = (lead?.nome || 'O lead').split(' ')[0];
        showToast(`⚠️ ${primeiroNome} ficou sem encaminhamento. Resolva pra voltar a receber leads novos.`, 'info');
    };

    const handleConcluido = (msg?: string) => {
        setAtendimentoAberto(false);
        setEstadoForcado(null);
        setFechouNoX(false);
        if (msg) showToast(msg, 'success');
        if (foiDescartado.current) {
            // Descartado sai da visão do corretor → vai pro bolsão da área do admin
            foiDescartado.current = false;
            showToast('O lead saiu do seu CRM e foi pro bolsão do administrador.', 'info');
            setTimeout(() => router.push('/dashboard/crm'), 900);
        }
    };

    // ------------------------------------------------------------------
    // Motor do circuito: uma ação composta = um batch atômico
    // ------------------------------------------------------------------
    const executarCircuito = useCallback(async (acao: AcaoCircuito): Promise<boolean> => {
        if (!currentUser || !lead) return false;
        if (isEspelhoDemo) {
            // No espelho o fluxo anda visualmente (pra demonstrar), mas nada é salvo.
            showToast('Modo demonstração — as ações do circuito não são salvas.', 'info');
            return true;
        }
        if (readOnly || executandoCircuito) return false;
        setExecutandoCircuito(true);
        const res = await executarAcaoCircuito({
            lead,
            acao,
            pendentesAtuais: tasksLoaded
                ? tasks.map(t => ({ id: t.id, description: t.description, type: t.type, dueDate: t.dueDate }))
                : null,
            imobiliariaId: userData?.imobiliariaId || '',
            currentUid: currentUser.uid,
            autorNome: userData?.nome || '',
        });
        setExecutandoCircuito(false);
        if (!res.ok) {
            showToast('Erro ao registrar a ação. Tente de novo.', 'error');
            return false;
        }
        if (acao.novaEtapa === ETAPA_DESCARTADO) {
            foiDescartado.current = true;
        }
        return true;
    }, [currentUser, lead, isEspelhoDemo, readOnly, executandoCircuito, tasks, tasksLoaded, userData?.imobiliariaId]);

    // Ajuste manual de etapa — o circuito conduz sozinho, mas dá pra mover na mão se precisar
    const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const novaEtapa = e.target.value;
        await executarCircuito({
            novaEtapa,
            interacao: { type: 'Etapa', notes: `↷ Etapa alterada manualmente para ${novaEtapa}` },
        });
    };

    // Registro avulso de tentativa de contato (botões "Liguei"/"Chamei no WhatsApp")
    const registrarContato = useCallback((via: 'Ligação' | 'WhatsApp') => {
        if (!currentUser || !lead || isEspelhoDemo || readOnly) return;
        addDoc(collection(db, 'leads', lead.id, 'interactions'), {
            type: via,
            notes: `${via === 'Ligação' ? '📞' : '💬'} Tentativa de contato por ${via === 'Ligação' ? 'ligação' : 'WhatsApp'}`,
            timestamp: serverTimestamp(),
            circuito: true,
            por: userData?.nome || '',
        }).catch(() => {});
    }, [currentUser, lead, isEspelhoDemo, readOnly]);

    // ------------------------------------------------------------------
    // Anotações — sempre abertas, salvam sozinhas
    // ------------------------------------------------------------------
    const handleAnnotationsChange = (valor: string) => {
        setTempAnnotations(valor);
        notasDirty.current = true;
        setSaveNotas('salvando');
        if (notasTimer.current) clearTimeout(notasTimer.current);
        notasTimer.current = setTimeout(() => {
            notasDirty.current = false;
            if (isEspelhoDemo || readOnly || !lead) { setSaveNotas('idle'); return; }
            updateDoc(doc(db, 'leads', lead.id), { anotacoes: valor })
                .then(() => {
                    setSaveNotas('salvo');
                    setTimeout(() => setSaveNotas(s => (s === 'salvo' ? 'idle' : s)), 2000);
                })
                .catch(() => {
                    setSaveNotas('idle');
                    showToast('Erro ao salvar anotações.', 'error');
                });
        }, 800);
    };

    // ------------------------------------------------------------------
    // Qualificação — sempre aberta, salva a cada toque (com debounce)
    // ------------------------------------------------------------------
    const handleQualificationChange = (groupKey: string, value: string) => {
        if (readOnly) return;
        qualDirty.current = true;
        setQualifications(prev => {
            const currentValues = prev[groupKey] || [];
            let next: QualificationData;
            if (currentValues.includes(value)) {
                const newValues = currentValues.filter(v => v !== value);
                if (newValues.length === 0) {
                    next = { ...prev };
                    delete next[groupKey];
                } else {
                    next = { ...prev, [groupKey]: newValues };
                }
            } else {
                next = { ...prev, [groupKey]: [...currentValues, value] };
            }

            setSaveQual('salvando');
            if (qualTimer.current) clearTimeout(qualTimer.current);
            qualTimer.current = setTimeout(() => {
                qualDirty.current = false;
                if (isEspelhoDemo || !lead) { setSaveQual('idle'); return; }
                updateDoc(doc(db, 'leads', lead.id), { qualificacao: next })
                    .then(() => {
                        setSaveQual('salvo');
                        setTimeout(() => setSaveQual(s => (s === 'salvo' ? 'idle' : s)), 2000);
                    })
                    .catch(() => {
                        setSaveQual('idle');
                        showToast('Erro ao salvar qualificação.', 'error');
                    });
            }, 600);

            return next;
        });
    };

    // ------------------------------------------------------------------
    // Tarefas manuais (modal existente) + concluir/cancelar
    // ------------------------------------------------------------------
    const handleSaveTask = async (task: TaskPayload) => {
        if (!currentUser || !leadId || isEspelhoDemo) return;
        setIsSavingTask(true);
        const { description, type, date, time } = task;
        const dueDate = new Date(`${date}T${time}`);
        try {
            const basePendentes: TarefaPendente[] = tasksLoaded
                ? tasks.map(t => ({ id: t.id, description: t.description, type: t.type, dueDate: t.dueDate }))
                : await fetchPendentesDaSubcolecao(leadId);

            const batch = writeBatch(db);
            const tasksCol = collection(db, 'leads', leadId, 'tarefas');
            const taskRef = doc(tasksCol);
            batch.set(taskRef, { description, type, dueDate, status: 'pendente' });
            batch.update(doc(db, 'leads', leadId), {
                tarefasPendentes: [...basePendentes, { id: taskRef.id, description, type, dueDate }],
            });
            const interactionsCol = collection(db, 'leads', leadId, 'interactions');
            batch.set(doc(interactionsCol), {
                type: 'Tarefa Agendada',
                notes: description,
                timestamp: serverTimestamp(),
                taskId: taskRef.id,
                por: userData?.nome || '',
            });
            await batch.commit();
            setIsAgendaModalOpen(false);
        } catch (error) {
            console.error('Erro ao salvar tarefa:', error);
        } finally {
            setIsSavingTask(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, status: 'concluída' | 'cancelada', reason?: string) => {
        if (!currentUser || !leadId || isEspelhoDemo) return;
        if (updatingTaskId) return;
        setUpdatingTaskId(taskId);
        if (status === 'cancelada') setIsCancelling(true);

        const batch = writeBatch(db);
        batch.update(doc(db, 'leads', leadId, 'tarefas', taskId), { status });
        const tarefasPendentes: TarefaPendente[] = tasks
            .filter(t => t.id !== taskId)
            .map(t => ({ id: t.id, description: t.description, type: t.type, dueDate: t.dueDate }));
        batch.update(doc(db, 'leads', leadId), { tarefasPendentes });
        // Concluir um Meet/Visita = "aconteceu" — narra no vocabulário do circuito
        // (o relatório conta '✅ ... realizado') e o pop-up de "aconteceu?" não precisa repetir a pergunta.
        const tarefa = tasks.find(t => t.id === taskId);
        const eventoFeito = status === 'concluída' && (tarefa?.type === 'Meet' || tarefa?.type === 'Visita') ? tarefa.type : null;
        const interactionData: any = {
            type: eventoFeito ?? (status === 'concluída' ? 'Tarefa Concluída' : 'Tarefa Cancelada'),
            notes: eventoFeito
                ? (eventoFeito === 'Meet' ? '✅ Meet realizado' : '✅ Visita realizada')
                : (status === 'concluída' ? 'Tarefa marcada como concluída' : 'Tarefa cancelada'),
            timestamp: serverTimestamp(),
            taskId,
            por: userData?.nome || '',
        };
        if (reason) interactionData.cancellationNotes = reason;
        batch.set(doc(collection(db, 'leads', leadId, 'interactions')), interactionData);

        try {
            await batch.commit();
            setIsCancelModalOpen(false);
            setTaskToCancel(null);
            // Meet/Visita concluído na mão → pula o "aconteceu?" e vai direto pro resultado
            if (eventoFeito && !readOnly) {
                setEstadoForcado({ t: eventoFeito === 'Meet' ? 'meetGostou' : 'visitaGostou' });
                setFechouNoX(false);
                setAtendimentoAberto(true);
            }
        } catch (error) {
            console.error('Erro ao atualizar status da tarefa:', error);
        } finally {
            setUpdatingTaskId(null);
            if (status === 'cancelada') setIsCancelling(false);
        }
    };

    // ------------------------------------------------------------------
    // Linha do tempo agrupada por dia, com marcadores de cadência
    // ------------------------------------------------------------------
    const timeline = useMemo(() => {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const grupos: { chave: string; label: string; gapDias: number; itens: Interaction[] }[] = [];
        for (const it of interactions) {
            const d = toJsDate(it.timestamp) ?? new Date();
            const dia = new Date(d); dia.setHours(0, 0, 0, 0);
            const chave = `${dia.getFullYear()}-${p2(dia.getMonth() + 1)}-${p2(dia.getDate())}`;
            const diffHoje = Math.round((hoje.getTime() - dia.getTime()) / 86_400_000);
            const label = diffHoje === 0 ? 'Hoje' : diffHoje === 1 ? 'Ontem' : fmtDataHora(dia).split(' · ')[0];
            const ultimo = grupos[grupos.length - 1];
            if (ultimo && ultimo.chave === chave) {
                ultimo.itens.push(it);
            } else {
                let gapDias = 0;
                if (ultimo) {
                    const [ya, ma, da] = ultimo.chave.split('-').map(Number);
                    const anterior = new Date(ya, ma - 1, da);
                    gapDias = Math.round((anterior.getTime() - dia.getTime()) / 86_400_000);
                }
                grupos.push({ chave, label, gapDias, itens: [it] });
            }
        }
        return grupos;
    }, [interactions]);

    const toggleExpandida = (id: string) => {
        setExpandidas(prev => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingState label="Carregando dados do lead..." />
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-text-secondary">Lead não encontrado.</p>
                </div>
            </div>
        );
    }

    const etapaAtual = normalizeEtapa(lead.etapa);
    const agora = Date.now();

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
            <CrmHeader />
            {readOnly && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6] text-sm font-medium flex items-center gap-2">
                <span>👁️</span> Visualizando CRM do corretor — somente leitura.
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                {/* ================= COLUNA ESQUERDA — o caminho do atendimento ================= */}
                <div className="lg:col-span-7 flex flex-col gap-5">
                    {/* Cliente */}
                    <div className="al-card relative overflow-hidden p-5">
                        <div className="absolute inset-x-0 top-0 gx-line" />
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <h2 className="al-display text-[22px] font-bold text-white uppercase tracking-wide leading-none truncate">{lead.nome}</h2>
                                <span className={`h-2 w-2 rounded-full shrink-0 ${getTaskStatusColor(taskStatus)}`} title={taskStatus}></span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {readOnly ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#FF1E56]/10 border border-[#FF1E56]/35 text-[#FF7A97]">{etapaAtual}</span>
                                ) : (
                                  <select
                                    id="lead-situation"
                                    value={etapaAtual}
                                    onChange={handleStageChange}
                                    disabled={executandoCircuito}
                                    className="px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#FF1E56]/10 border border-[#FF1E56]/35 rounded-full text-[#FF7A97] focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 [&>option]:bg-[#12101a] [&>option]:text-white disabled:opacity-60"
                                    title="O circuito move sozinho pelas respostas — aqui é o ajuste manual"
                                  >
                                    {(stages.includes(etapaAtual) ? stages : [etapaAtual, ...stages]).map(s => (<option key={s} value={s}>{s}</option>))}
                                  </select>
                                )}
                                {rodizioPrimeiroContato && (
                                    <span
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#7DD3FC]/10 border border-[#7DD3FC]/35 text-[#7DD3FC]"
                                        title="Ainda sem conversa de verdade — o contador zera quando o cliente atender ou responder."
                                    >
                                        🎯 1º contato · {rodizioPrimeiroContato.tentativas + 1}ª tentativa
                                    </span>
                                )}
                                {!readOnly && circuitoInfo && etapaAtual !== ETAPA_DESCARTADO && (
                                    <button
                                        onClick={() => {
                                            setEstadoForcado({ t: 'descarte', volta: circuitoInfo.estado });
                                            setFechouNoX(false);
                                            setAtendimentoAberto(true);
                                        }}
                                        className="px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border border-[#FF6B6B]/35 bg-[#FF6B6B]/[0.07] text-[#FF8F8F] hover:bg-[#FF6B6B]/15 transition-colors"
                                        title="Descartar este cliente (vai pedir o motivo)"
                                    >
                                        🗑 Descartar
                                    </button>
                                )}
                                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5">
                                    <PhoneIcon className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                                    <p className="text-xs text-white tabular-nums">{lead.telefone}</p>
                                    <a
                                        href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        <WhatsAppIcon className="h-3 w-3 fill-current"/>
                                    </a>
                                </div>
                                {lead.origem && (
                                    <div className="flex items-center gap-2 bg-[#7DD3FC]/10 border border-[#7DD3FC]/35 rounded-xl px-3 py-1.5 max-w-full">
                                        <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#7DD3FC]/70 shrink-0">Origem</span>
                                        <p className="text-xs text-[#7DD3FC] font-medium truncate min-w-0" title={lead.origem}>{lead.origem}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* O circuito conduz por pop-up — aqui só faixas finas quando precisa agir */}
                    {!readOnly && fechouNoX && !!circuitoInfo?.pendente && (
                        <button
                            onClick={() => { setAtendimentoAberto(true); setFechouNoX(false); }}
                            className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left hover:bg-amber-500/15 transition-colors"
                        >
                            <span className="text-[13px] text-amber-200 font-medium">⚠️ Pendente de encaminhamento — o pop-up foi fechado sem resposta.</span>
                            <span className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] animate-pulse">Resolver agora →</span>
                        </button>
                    )}
                    {!readOnly && (etapaAtual === 'Bolsão' || etapaAtual === 'Descartado') && (
                        <button
                            onClick={() => { setAtendimentoAberto(true); setFechouNoX(false); }}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#7DD3FC]/40 bg-[#7DD3FC]/[0.07] px-4 py-3 text-left hover:bg-[#7DD3FC]/15 transition-colors"
                        >
                            <span className="text-[13px] text-[#7DD3FC] font-medium">
                                {etapaAtual === 'Bolsão' ? '🧊 Estacionado no bolsão.' : `Descartado${lead.descartadoMotivo ? ` — ${lead.descartadoMotivo}` : ''}.`}
                            </span>
                            <span className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold text-[#7DD3FC] border border-[#7DD3FC]/40 bg-[#7DD3FC]/10">🔄 Reativar lead</span>
                        </button>
                    )}

                    {/* Próximas tarefas (com horário) */}
                    <div className="al-card relative overflow-hidden p-5">
                        <div className="absolute inset-x-0 top-0 gx-line" />
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Próximas Tarefas</h3>
                            {!readOnly && (
                                <button
                                    onClick={() => setIsAgendaModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-colors"
                                >
                                    <TaskIcon className="h-3.5 w-3.5" /> Nova tarefa
                                </button>
                            )}
                        </div>
                        {tarefasOrdenadas.length === 0 ? (
                            <p className="text-sm text-text-secondary py-2">Nenhuma tarefa pendente — o circuito acima cria a próxima ação.</p>
                        ) : (
                            <ul className="space-y-2">
                                {tarefasOrdenadas.map(t => {
                                    const due = toJsDate(t.dueDate);
                                    const atrasada = due ? due.getTime() < agora : false;
                                    const cor = tipoCor(t.type);
                                    return (
                                        <li key={t.id} className={`flex items-center gap-3 rounded-xl border bg-white/[0.03] px-3 py-2.5 ${atrasada ? 'border-[#FF1E56]/40' : 'border-white/[0.08]'}`}>
                                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider border ${cor.chip}`}>{t.type}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] text-white truncate">{t.description}</p>
                                                <p className={`text-[11px] tabular-nums font-bold ${atrasada ? 'text-[#FF7A97]' : 'text-[#FFE9A6]'}`}>
                                                    {due ? fmtDataHora(due) : 'sem data'}{atrasada ? ' · atrasada' : ''}
                                                </p>
                                            </div>
                                            {!readOnly && (
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        onClick={() => handleUpdateTaskStatus(t.id, 'concluída')}
                                                        disabled={updatingTaskId === t.id}
                                                        className="px-2 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors disabled:opacity-50"
                                                    >
                                                        Concluída
                                                    </button>
                                                    <button
                                                        onClick={() => { setTaskToCancel(t.id); setIsCancelModalOpen(true); }}
                                                        disabled={updatingTaskId === t.id}
                                                        className="px-2 py-1 text-[11px] font-bold text-red-300 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Linha do tempo — a cadência do atendimento */}
                    <div className="al-card relative overflow-hidden p-5">
                        <div className="absolute inset-x-0 top-0 gx-line" />
                        <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Linha do Tempo</h3>
                        {timeline.length === 0 ? (
                            <p className="text-sm text-text-secondary py-2">Nenhuma ação registrada ainda — começa pelo circuito ali em cima. 👆</p>
                        ) : (
                            <div className="max-h-[52vh] overflow-y-auto pr-2 space-y-3">
                                {timeline.map((grupo, gi) => (
                                    <div key={grupo.chave}>
                                        {gi > 0 && grupo.gapDias >= 2 && (
                                            <div className="flex items-center gap-2 my-3">
                                                <span className="flex-1 border-t border-dashed border-white/10" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">{grupo.gapDias} dias de intervalo</span>
                                                <span className="flex-1 border-t border-dashed border-white/10" />
                                            </div>
                                        )}
                                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">{grupo.label}</p>
                                        <ul className="space-y-2">
                                            {grupo.itens.map(interaction => {
                                                const relatedTask = tasks.find(task => task.id === interaction.taskId);
                                                const tag = interaction.type.startsWith('Tarefa') && relatedTask ? relatedTask.type : interaction.type;
                                                const cor = tipoCor(tag);
                                                const d = toJsDate(interaction.timestamp);
                                                const expandida = expandidas.has(interaction.id);
                                                const longa = (interaction.notes || '').length > 90 || !!interaction.cancellationNotes;
                                                return (
                                                    <li
                                                        key={interaction.id}
                                                        onClick={() => longa && toggleExpandida(interaction.id)}
                                                        className={`flex items-start gap-3 bg-white/[0.03] border border-white/[0.08] border-l-2 ${cor.borda} rounded-xl px-3 py-2.5 transition-colors ${longa ? 'cursor-pointer hover:bg-white/[0.05]' : ''}`}
                                                    >
                                                        <span className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${cor.chip}`}>{tag}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs text-white/85 ${expandida ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>{interaction.notes}</p>
                                                            {expandida && interaction.cancellationNotes && (
                                                                <p className="text-xs text-red-300 mt-1"><span className="font-semibold">Motivo:</span> {interaction.cancellationNotes}</p>
                                                            )}
                                                            <div className="mt-1 flex items-center gap-3 text-[10px] text-white/35 tabular-nums">
                                                                <span>{d ? `${p2(d.getHours())}:${p2(d.getMinutes())}` : 'agora'}</span>
                                                                {interaction.por && <span className="text-white/40">por {interaction.por.split(' ')[0]}</span>}
                                                                {relatedTask && toJsDate(relatedTask.dueDate) && (
                                                                    <span className="text-[#FFE9A6]/70">agendado: {fmtDataHora(toJsDate(relatedTask.dueDate)!)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ================= COLUNA DIREITA — sempre à mão ================= */}
                <div className="lg:col-span-5 flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
                    {/* Anotações PRIMEIRO — é o que mais se usa durante a conversa */}
                    <div className="al-card relative overflow-hidden p-5 flex flex-col">
                        <div className="absolute inset-x-0 top-0 gx-line" />
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Anotações</h3>
                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity ${
                                saveNotas === 'idle' ? 'opacity-0' : 'opacity-100'
                            } ${saveNotas === 'salvo' ? 'text-emerald-300' : 'text-text-secondary'}`}>
                                {saveNotas === 'salvando' ? 'salvando…' : 'salvo ✓'}
                            </span>
                        </div>
                        {readOnly ? (
                            <div className="prose prose-sm prose-invert max-w-none overflow-y-auto max-h-64 pr-2">
                                <p className="whitespace-pre-wrap text-text-secondary">{lead.anotacoes || 'Nenhuma anotação registrada.'}</p>
                            </div>
                        ) : (
                            <textarea
                                value={tempAnnotations}
                                onChange={(e) => handleAnnotationsChange(e.target.value)}
                                rows={5}
                                className="w-full bg-white/[0.04] border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 resize-y min-h-[7rem]"
                                placeholder={isEspelhoDemo ? 'Modo demonstração — nada é salvo.' : 'Anota tudo aqui — salva sozinho enquanto você digita.'}
                            />
                        )}
                    </div>

                    {/* Qualificação — compacta, logo abaixo */}
                    <div className="al-card relative overflow-hidden p-5">
                        <div className="absolute inset-x-0 top-0 gx-line" />
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Qualificação</h3>
                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity ${
                                saveQual === 'idle' ? 'opacity-0' : 'opacity-100'
                            } ${saveQual === 'salvo' ? 'text-emerald-300' : 'text-text-secondary'}`}>
                                {saveQual === 'salvando' ? 'salvando…' : 'salvo ✓'}
                            </span>
                        </div>
                        <div className="space-y-2.5">
                            {QUALIFICATION_QUESTIONS.map((group) => (
                                <div key={group.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <h4 className="shrink-0 w-[86px] text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary leading-tight">{group.title}</h4>
                                    <div className="flex-1 min-w-[200px] flex flex-wrap gap-1">
                                        {group.options.map((option) => {
                                            const ativo = Array.isArray(qualifications[group.key]) && qualifications[group.key].includes(option);
                                            return (
                                                <button
                                                    key={option}
                                                    onClick={() => handleQualificationChange(group.key, option)}
                                                    disabled={readOnly}
                                                    className={`px-2 py-1 text-[11px] font-medium border rounded-md transition-all duration-150 disabled:cursor-not-allowed ${
                                                        ativo
                                                        ? 'bg-[#9F6BFF]/15 border-[#9F6BFF]/60 text-[#C4A6FF] shadow-[0_0_12px_-2px_rgba(159,107,255,0.4)]'
                                                        : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08]'
                                                    }`}
                                                >
                                                    {option}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <AgendaModal
                isOpen={isAgendaModalOpen}
                onClose={() => setIsAgendaModalOpen(false)}
                onSave={handleSaveTask}
                isLoading={isSavingTask}
            />

            <CancelTaskModal
                isOpen={isCancelModalOpen}
                onClose={() => { setIsCancelModalOpen(false); setTaskToCancel(null); }}
                onConfirm={(reason: string) => {
                    if (taskToCancel) handleUpdateTaskStatus(taskToCancel, 'cancelada', reason);
                }}
                isLoading={isCancelling}
            />

            {/* Os 2 pop-ups do atendimento: fluxo à esquerda, anotações & qualificação à direita */}
            {circuitoInfo && !readOnly && (
                <AtendimentoOverlay
                    aberto={atendimentoAberto}
                    estadoInicial={estadoForcado ?? circuitoInfo.estado}
                    nome={lead.nome}
                    telefone={lead.telefone}
                    origem={lead.origem}
                    tasks={tasks}
                    cadencias={cadencias}
                    executando={executandoCircuito}
                    isDemo={isEspelhoDemo}
                    executar={executarCircuito}
                    registrarContato={registrarContato}
                    onFecharX={handleFecharX}
                    onConcluido={handleConcluido}
                    historico={interactions}
                    rodizioPrimeiroContato={rodizioPrimeiroContato}
                    qualGroups={QUALIFICATION_QUESTIONS}
                    qualifications={qualifications}
                    onToggleQual={handleQualificationChange}
                    saveQual={saveQual}
                    anotacoes={tempAnnotations}
                    onChangeAnotacoes={handleAnnotationsChange}
                    saveNotas={saveNotas}
                />
            )}
        </div>
    );
}
