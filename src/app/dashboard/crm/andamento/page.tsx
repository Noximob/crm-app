'use client';

/** /dashboard/crm/andamento — o quadro da CASA (mesmo componente do quadro da rede). */
import CrmQuadro from '../_components/CrmQuadro';
import { CARTEIRA_IMOBILIARIA } from '@/lib/funilVendas';

export default function AndamentoPage() {
  return <CrmQuadro carteira={CARTEIRA_IMOBILIARIA} />;
}
