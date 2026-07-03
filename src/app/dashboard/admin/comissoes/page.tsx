'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AdminComissoesPage() {
  const { userData } = useAuth();
  const isAdmin = userData?.tipoConta === 'imobiliaria' || userData?.permissoes?.admin;

  if (!isAdmin) return <div className="p-8 text-center text-text-secondary">Você não tem permissão para acessar esta página.</div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-white">Comissões — Administrativo</h1>
        <p className="text-sm text-text-secondary">Configure imposto, meta, política de comissão e lance as vendas por equipe. É o que alimenta as visões do corretor e do gerente.</p>
      </div>
      <div className="flex-1 min-h-0 px-2 pb-2">
        <iframe
          src="/comissoes/index.html?mode=admin"
          title="Comissões — Administrativo"
          className="w-full h-full rounded-xl border border-white/10 bg-[#f7f5f0]"
          style={{ minHeight: 'calc(100vh - 140px)' }}
        />
      </div>
    </div>
  );
}
