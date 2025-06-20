'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const CrmPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Cabeçalho */}
      <header className="bg-white shadow-sm border-b border-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Nome do Sistema */}
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-500 rounded-full flex items-center justify-center mr-3">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-softgray-800">
                Alume
              </h1>
            </div>

            {/* Área do Usuário e Logout */}
            <div className="flex items-center space-x-4">
              {/* Email do Usuário */}
              <div className="text-sm text-softgray-600">
                <span className="font-medium">{user.email}</span>
              </div>

              {/* Botão de Logout */}
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do CRM */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-primary-100">
          <h2 className="text-2xl font-bold text-softgray-800">Área do CRM</h2>
          <p className="text-softgray-600 mt-2">Aqui ficarão as ferramentas de gestão de clientes, propriedades, etc.</p>
        </div>
      </main>
    </div>
  );
};

export default CrmPage; 