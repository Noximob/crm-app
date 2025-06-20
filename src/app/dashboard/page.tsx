'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const DashboardPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }
  
  if (!user) {
    return null; // ou uma tela de acesso negado antes do redirecionamento
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-softgray-800 mb-4">
          Bem-vindo ao seu Dashboard!
        </h1>
        <p className="text-softgray-600">
          Login realizado com sucesso. Esta é a sua área principal do CRM.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage; 