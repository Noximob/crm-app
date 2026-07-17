'use client';

// A página virou a aba "Investidor (TIR)" da Calculadora unificada.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvestidorRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/calculadora?tab=investidor'); }, [router]);
  return null;
}
