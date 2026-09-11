'use client';

/**
 * /dashboard/crm-rede — o CRM DA REDE do corretor: networking, indicação,
 * ação de rua, cliente de plantão — e a gaveta de Interesse futuro (até 50).
 * Exatamente o mesmo CRM da casa, com outra carteira: agendar tarefa é
 * opcional e atraso aqui não pesa na métrica.
 */
import CrmLista from '../crm/_components/CrmLista';
import { CARTEIRA_REDE } from '@/lib/funilVendas';

export default function CrmRedePage() {
  return <CrmLista carteira={CARTEIRA_REDE} />;
}
