'use client';

/**
 * A ÁREA DE LOCAÇÃO — quem entra aqui.
 *
 * O setor saiu da Área do administrador e virou área própria, com a SUA
 * permissão: a tag "Locação", que o desenvolvedor liga por pessoa na tabela
 * de corretores. A conta da imobiliária (o dono) sempre entra; o resto só
 * com a tag — nem o admin entra de brinde, porque aqui dentro moram CPF,
 * contratos e o dinheiro dos repasses, e o gestor escolhe quem vê isso.
 */
import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import LoadingState from '@/components/ui/LoadingState';

export default function LocacaoLayout({ children }: { children: React.ReactNode }) {
  const { userData, loading, isEspelhoDemo } = useAuth();

  type ComPerms = typeof userData & { permissoes?: { admin?: boolean; developer?: boolean; locacao?: boolean } };
  const u = userData as ComPerms;
  const podeVer = u?.tipoConta === 'imobiliaria' || !!u?.permissoes?.locacao || isEspelhoDemo;

  if (loading || (!userData && !isEspelhoDemo)) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingState label="Carregando..." /></div>;
  }

  if (!podeVer) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-md mx-auto al-card p-8 text-center">
          <p className="text-[32px] mb-2">🔒</p>
          <p className="text-[14px] font-bold text-white">Área restrita</p>
          <p className="text-[12.5px] text-text-secondary mt-1 max-w-[38ch] mx-auto">
            O Setor de Locação guarda contratos e dados dos clientes. Peça ao
            gestor pra liberar a tag <b className="text-[#FFE9A6]">Locação</b> pro seu usuário.
          </p>
          <Link href="/dashboard" className="inline-block mt-4 px-4 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white transition-colors">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
