'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import ComissoesEmbed from '@/components/ComissoesEmbed';

export default function AdminComissoesPage() {
  const { userData } = useAuth();
  const isAdmin = userData?.tipoConta === 'imobiliaria' || userData?.permissoes?.admin;

  if (!isAdmin) return <div className="p-8 text-center text-text-secondary">Você não tem permissão para acessar esta página.</div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-white">Comissões — Administrativo</h1>
        <p className="text-sm text-text-secondary">Configure imposto, meta, métricas da calculadora e política; lance as vendas e vincule cada pessoa ao usuário do CRM (gerente, corretor, SDR ou autônomo).</p>
      </div>
      <div className="flex-1 min-h-0 px-2 pb-2">
        <ComissoesEmbed mode="admin" />
      </div>
    </div>
  );
}
