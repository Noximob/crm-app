'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import Link from 'next/link';

interface Imobiliaria {
  id: string;
  nome: string;
  tipo?: string;
  aprovado?: boolean;
  status?: string;
  criadoEm?: any;
}

export default function AdminEntidadesPage() {
  const { currentUser } = useAuth();
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadImobiliarias();
    }
  }, [currentUser]);

  const loadImobiliarias = async () => {
    try {
      setLoading(true);
      const imobiliariasRef = collection(db, 'imobiliarias');
      const snapshot = await getDocs(imobiliariasRef);
      
      const imobiliariasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Imobiliaria[];
      
      setImobiliarias(imobiliariasData);
    } catch (error) {
      console.error('Erro ao carregar imobiliárias:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateImobiliarias = async () => {
    setUpdating(true);
    setMessage(null);
    
    try {
      let updatedCount = 0;
      
      for (const imobiliaria of imobiliarias) {
        const updates: any = {};
        let needsUpdate = false;
        
        // Adicionar campo tipo se não existir
        if (!imobiliaria.tipo) {
          updates.tipo = 'imobiliaria';
          needsUpdate = true;
        }
        
        // Adicionar campo status se não existir
        if (!imobiliaria.status) {
          updates.status = imobiliaria.aprovado ? 'ativo' : 'pendente';
          needsUpdate = true;
        }
        
        // Garantir que aprovado seja boolean
        if (typeof imobiliaria.aprovado !== 'boolean') {
          updates.aprovado = false;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          const imobiliariaRef = doc(db, 'imobiliarias', imobiliaria.id);
          await updateDoc(imobiliariaRef, updates);
          updatedCount++;
        }
      }
      
      setMessage(`✅ ${updatedCount} imobiliárias foram atualizadas com sucesso!`);
      await loadImobiliarias(); // Recarregar dados
      
    } catch (error) {
      console.error('Erro ao atualizar imobiliárias:', error);
      setMessage('❌ Erro ao atualizar imobiliárias. Verifique o console.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusInfo = (imobiliaria: Imobiliaria) => {
    const hasTipo = !!imobiliaria.tipo;
    const hasStatus = !!imobiliaria.status;
    const hasAprovado = typeof imobiliaria.aprovado === 'boolean';
    
    if (hasTipo && hasStatus && hasAprovado) {
      return { status: 'complete', text: '✅ Completa', color: 'text-green-600' };
    } else {
      const missing = [];
      if (!hasTipo) missing.push('tipo');
      if (!hasStatus) missing.push('status');
      if (!hasAprovado) missing.push('aprovado');
      
      return { 
        status: 'incomplete', 
        text: `⚠️ Incompleta (faltam: ${missing.join(', ')})`, 
        color: 'text-yellow-600' 
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <p>Carregando imobiliárias...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <Link 
              href="/dashboard/developer"
              className="text-[#3478F6] hover:text-[#2E6FD9] transition-colors"
            >
              ← Voltar à Área do Desenvolvedor
            </Link>
          </div>
        </div>

        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#2E2F38] dark:text-white mb-4">
            Administração de Entidades
          </h1>
          <p className="text-xl text-[#6B6F76] dark:text-gray-300">
            Corrija dados inconsistentes e atualize entidades existentes
          </p>
        </div>

        {/* Mensagem */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-center font-medium ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Botão de Atualização */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-2">
                Atualizar Imobiliárias
              </h3>
              <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                Adiciona campos obrigatórios (tipo, status, aprovado) às imobiliárias existentes
              </p>
            </div>
            <button
              onClick={updateImobiliarias}
              disabled={updating}
              className="bg-[#3478F6] hover:bg-[#2E6FD9] disabled:bg-[#6B6F76] text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              {updating ? 'Atualizando...' : 'Atualizar Todas'}
            </button>
          </div>
        </div>

        {/* Lista de Imobiliárias */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F5F6FA] dark:bg-[#181C23]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#2E2F38] dark:text-white">Nome</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#2E2F38] dark:text-white">Tipo</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#2E2F38] dark:text-white">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#2E2F38] dark:text-white">Aprovado</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#2E2F38] dark:text-white">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E9F1] dark:divide-[#23283A]">
                {imobiliarias.map((imobiliaria) => {
                  const statusInfo = getStatusInfo(imobiliaria);
                  return (
                    <tr key={imobiliaria.id} className="hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-[#2E2F38] dark:text-white">{imobiliaria.nome}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                        {imobiliaria.tipo || 'Não definido'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                        {imobiliaria.status || 'Não definido'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                        {typeof imobiliaria.aprovado === 'boolean' ? (imobiliaria.aprovado ? 'Sim' : 'Não') : 'Não definido'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {imobiliarias.length === 0 && (
          <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
            <p>Nenhuma imobiliária encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
} 