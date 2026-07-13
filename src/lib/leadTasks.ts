import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Tarefa pendente espelhada no documento do lead (campo `tarefasPendentes`).
 * `dueDate` é mantido como veio do Firestore (Timestamp) — nunca convertido ao salvar.
 */
export interface TarefaPendente {
    id: string;
    description: string;
    type: string;
    dueDate: any; // Timestamp | Date | { seconds } | string
}

export type TaskStatus = 'Sem tarefa' | 'Tarefa em Atraso' | 'Tarefa do Dia' | 'Tarefa Futura';

/** Converte dueDate (Timestamp, Date, {seconds}, string) para Date local; null se ausente/inválido. */
export function toJsDate(d: any): Date | null {
    if (!d) return null;
    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
    if (typeof d.toDate === 'function') {
        try {
            const dt = d.toDate();
            return dt instanceof Date && !isNaN(dt.getTime()) ? dt : null;
        } catch {
            return null;
        }
    }
    if (typeof d === 'object') {
        const sec = (d as any).seconds ?? (d as any)._seconds;
        if (typeof sec === 'number') return new Date(sec * 1000);
        return null;
    }
    if (typeof d === 'string' || typeof d === 'number') {
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? null : dt;
    }
    return null;
}

/**
 * Status calculado no cliente a partir das tarefas pendentes (mesma semântica
 * da função original do CRM: comparação por dia local, 00:00).
 * NUNCA armazenar este valor — ele muda à meia-noite.
 */
export function getTaskStatusInfo(tasks: TarefaPendente[] | undefined | null): TaskStatus {
    if (!tasks || tasks.length === 0) return 'Sem tarefa';

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const hasOverdue = tasks.some(task => {
        const dueDate = toJsDate(task.dueDate);
        if (!dueDate) return false;
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
    });
    if (hasOverdue) return 'Tarefa em Atraso';

    const hasTodayTask = tasks.some(task => {
        const dueDate = toJsDate(task.dueDate);
        if (!dueDate) return false;
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === now.getTime();
    });
    if (hasTodayTask) return 'Tarefa do Dia';

    return 'Tarefa Futura';
}

/** Busca as tarefas pendentes na subcoleção `leads/{id}/tarefas` (fallback para leads legados). */
export async function fetchPendentesDaSubcolecao(leadId: string): Promise<TarefaPendente[]> {
    const tasksCol = collection(db, 'leads', leadId, 'tarefas');
    const snapshot = await getDocs(query(tasksCol, where('status', '==', 'pendente')));
    return snapshot.docs.map(d => {
        const data = d.data() as any;
        return {
            id: d.id,
            description: data.description ?? '',
            type: data.type ?? '',
            dueDate: data.dueDate ?? null,
        } as TarefaPendente;
    });
}

const MAX_CONCURRENT_FETCHES = 25;

/**
 * Garante as tarefas pendentes de cada lead:
 * - campo `tarefasPendentes` presente (array, mesmo vazio) → usa direto, zero leituras extras;
 * - campo ausente (lead legado) → busca a subcoleção uma vez e, se `opts.backfill !== false`,
 *   grava o campo no doc do lead (fire-and-forget) para se auto-curar.
 * Nunca lança por falha de um lead individual (cai para []).
 */
export async function ensureTarefasPendentes(
    leads: Array<{ id: string; tarefasPendentes?: TarefaPendente[] }>,
    opts?: { backfill?: boolean }
): Promise<Map<string, TarefaPendente[]>> {
    const result = new Map<string, TarefaPendente[]>();
    const legacy: string[] = [];

    for (const lead of leads) {
        if (Array.isArray(lead.tarefasPendentes)) {
            result.set(lead.id, lead.tarefasPendentes);
        } else {
            legacy.push(lead.id);
        }
    }

    // Leads legados: buscar subcoleção em lotes de no máximo 25 requisições simultâneas
    for (let i = 0; i < legacy.length; i += MAX_CONCURRENT_FETCHES) {
        const chunk = legacy.slice(i, i + MAX_CONCURRENT_FETCHES);
        await Promise.all(chunk.map(async (leadId) => {
            try {
                const fetched = await fetchPendentesDaSubcolecao(leadId);
                result.set(leadId, fetched);
                if (opts?.backfill !== false) {
                    // Auto-cura: grava o campo no lead sem bloquear (e sem propagar erro)
                    updateDoc(doc(db, 'leads', leadId), { tarefasPendentes: fetched }).catch(() => {});
                }
            } catch {
                result.set(leadId, []);
            }
        }));
    }

    return result;
}
