'use client';

/**
 * O ESPAÇO AYRA — quem entra aqui.
 *
 * A conta da imobiliária e quem tem a área do Desenvolvedor entram sempre.
 * Os demais, só com a tag "Ayra", que o desenvolvedor liga por pessoa na
 * tabela de corretores. Mesmo desenho do Setor de Locação.
 */
import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import LoadingState from '@/components/ui/LoadingState';
import { podeVerAyra } from '@/lib/ayra';

export default function AyraLayout({ children }: { children: React.ReactNode }) {
  const { userData, loading, isEspelhoDemo } = useAuth();
  const podeVer = podeVerAyra(userData as Parameters<typeof podeVerAyra>[0]) || isEspelhoDemo;

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
            O espaço Ayra guarda o material interno do pré-lançamento. Peça ao
            gestor pra liberar a tag <b className="text-[#E8CF8A]">Ayra</b> pro seu usuário.
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
