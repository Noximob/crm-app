'use client';

/** /dashboard/crm-rede/andamento — o quadro da REDE, com a gaveta de Interesse futuro. */
import CrmQuadro from '../../crm/_components/CrmQuadro';
import { CARTEIRA_REDE } from '@/lib/funilVendas';

export default function AndamentoRedePage() {
  return <CrmQuadro carteira={CARTEIRA_REDE} />;
}
