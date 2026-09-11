'use client';

/**
 * /dashboard/crm — o CRM da CASA: leads que a imobiliária entrega ao
 * corretor (propaganda, ligação ativa, distribuição). O componente é o
 * mesmo do CRM da rede (/dashboard/crm-rede) — muda a carteira.
 */
import CrmLista from './_components/CrmLista';
import { CARTEIRA_IMOBILIARIA } from '@/lib/funilVendas';

export default function CrmPage() {
  return <CrmLista carteira={CARTEIRA_IMOBILIARIA} />;
}
