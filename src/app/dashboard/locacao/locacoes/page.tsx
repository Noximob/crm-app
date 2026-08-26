'use client';

/**
 * FUNIL DA LOCAÇÃO — a página. O trabalho todo mora em ../funis.tsx.
 *
 * Aceita dois atalhos vindos do funil dos imóveis:
 *   ?busca=LOC-006  → abre já filtrada pelos interessados daquele imóvel
 *   ?novo=<id>      → abre com o formulário de interessado pré-selecionado
 */
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SetorLocacao from '../funis';
import LoadingState from '@/components/ui/LoadingState';

function Miolo() {
  const params = useSearchParams();
  return (
    <SetorLocacao
      funil="locacoes"
      buscaInicial={params.get('busca') || ''}
      novoLeadImovelId={params.get('novo') || ''}
    />
  );
}

export default function PaginaLocacoes() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingState label="Carregando..." /></div>}>
      <Miolo />
    </Suspense>
  );
}
