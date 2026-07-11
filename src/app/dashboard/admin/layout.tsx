'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingState from '@/components/ui/LoadingState';

/**
 * Trava de acesso da área do administrador: corretor comum não entra nem
 * digitando a URL direto (gestão de leads, exclusões etc. são só do gestor).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userData, loading, isEspelhoDemo } = useAuth();
  const router = useRouter();

  type UserDataWithPerms = typeof userData & { permissoes?: { admin?: boolean; developer?: boolean } };
  const userDataWithPerms = userData as UserDataWithPerms;
  const isAdminUser =
    isEspelhoDemo || userDataWithPerms?.tipoConta === 'imobiliaria' || !!userDataWithPerms?.permissoes?.admin;

  useEffect(() => {
    if (!loading && userData && !isAdminUser) {
      router.replace('/dashboard');
    }
  }, [loading, userData, isAdminUser, router]);

  if (loading || (userData && !isAdminUser)) {
    return (
      <div className="min-h-full flex items-center justify-center py-24">
        <LoadingState label="Carregando..." />
      </div>
    );
  }

  return <>{children}</>;
}
