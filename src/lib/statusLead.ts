/**
 * Status do lead em sintonia com o CIRCUITO.
 * "Ação agora" = a pergunta do circuito está vencida (lead novo em Entrada,
 * tarefa no horário, meet/visita que passou, etapa ativa sem próxima ação).
 * Senão vale a régua normal das tarefas (hora exata).
 */
import { getTaskStatusInfo, type TarefaPendente, type TaskStatus } from '@/lib/leadTasks';
import { CADENCIAS_PADRAO, mapEtapaCircuito } from '@/lib/circuito';
import { perguntaDoLead } from '@/components/atendimento/AtendimentoOverlay';

export type StatusLead = TaskStatus | 'Ação agora';

export function statusDoLead(etapa: string | undefined, pendentes: TarefaPendente[]): StatusLead {
  const p = perguntaDoLead(mapEtapaCircuito(etapa), pendentes as any, CADENCIAS_PADRAO, Date.now());
  if (p?.pendente) return 'Ação agora';
  return getTaskStatusInfo(pendentes);
}
