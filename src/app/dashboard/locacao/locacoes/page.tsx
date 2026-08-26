'use client';

/**
 * FUNIL DA LOCAÇÃO — a página. O trabalho todo mora em ../funis.tsx.
 *
 * Aceita o atalho ?busca=… (nome ou código do imóvel) vindo das outras abas.
 * Lead novo não nasce aqui: nasce no CRM.
 */
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SetorLocacao from '../funis';
import LoadingState from '@/components/ui/LoadingState';

function Miolo() {
  const params = useSearchParams();
  return (
    <SetorLocacao funil="locacoes" buscaInicial={params.get('busca') || ''} />
  );
}

export default function PaginaLocacoes() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingState label="Carregando..." /></div>}>
      <Miolo />
    </Suspense>
  );
}
