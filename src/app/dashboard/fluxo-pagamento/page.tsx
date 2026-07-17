'use client';

// A página virou a aba "Fluxo de Pagamento" da Calculadora unificada.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FluxoPagamentoRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/calculadora'); }, [router]);
  return null;
}
