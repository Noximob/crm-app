/**
 * Status do lead em sintonia com o CIRCUITO.
 * "Ação agora" = a pergunta do circuito está vencida (lead novo em Entrada,
 * tarefa no horário, meet/visita que passou, etapa ativa sem próxima ação).
 * Senão vale a régua normal das tarefas (hora exata).
 *
 * `cobrado` = o circuito cobra este lead. Na carteira da REDE (networking,
 * indicação, plantão) e no lead GUARDADO em Interesse futuro, agendar é
 * opcional — então não existe "Ação agora": vale só a régua das tarefas que
 * o corretor quis marcar.
 */
import { getTaskStatusInfo, type TarefaPendente, type TaskStatus } from '@/lib/leadTasks';
import { CADENCIAS_PADRAO, ETAPA_FECHADO, mapEtapaCircuito } from '@/lib/circuito';
import { perguntaDoLead } from '@/components/atendimento/AtendimentoOverlay';

export type StatusLead = TaskStatus | 'Ação agora' | 'Venda fechada';

export function statusDoLead(etapa: string | undefined, pendentes: TarefaPendente[], cobrado = true): StatusLead {
  const etapaCirc = mapEtapaCircuito(etapa);
  // Fechamento = venda concluída — não é "sem tarefa", é missão cumprida
  if (etapaCirc === ETAPA_FECHADO) return 'Venda fechada';
  if (cobrado) {
    const p = perguntaDoLead(etapaCirc, pendentes as any, CADENCIAS_PADRAO, Date.now());
    if (p?.pendente) return 'Ação agora';
  }
  return getTaskStatusInfo(pendentes);
}
