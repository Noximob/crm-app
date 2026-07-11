'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingState from '@/components/ui/LoadingState';

/**
 * Trava de acesso da área do desenvolvedor (aprovação/exclusão de corretores,
 * gestão de imobiliárias): só dono ou permissão developer.
 */
export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const { userData, loading, isEspelhoDemo } = useAuth();
  const router = useRouter();

  type UserDataWithPerms = typeof userData & { permissoes?: { admin?: boolean; developer?: boolean } };
  const userDataWithPerms = userData as UserDataWithPerms;
  const isDevUser =
    isEspelhoDemo || userDataWithPerms?.tipoConta === 'imobiliaria' || !!userDataWithPerms?.permissoes?.developer;

  useEffect(() => {
    if (!loading && userData && !isDevUser) {
      router.replace('/dashboard');
    }
  }, [loading, userData, isDevUser, router]);

  if (loading || (userData && !isDevUser)) {
    return (
      <div className="min-h-full flex items-center justify-center py-24">
        <LoadingState label="Carregando..." />
      </div>
    );
  }

  return <>{children}</>;
}
