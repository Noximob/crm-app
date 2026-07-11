'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import Link from 'next/link';
import LoadingState from '@/components/ui/LoadingState';

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
      return { status: 'complete', text: '✅ Completa', color: 'text-emerald-300' };
    } else {
      const missing = [];
      if (!hasTipo) missing.push('tipo');
      if (!hasStatus) missing.push('status');
      if (!hasAprovado) missing.push('aprovado');

      return {
        status: 'incomplete',
        text: `⚠️ Incompleta (faltam: ${missing.join(', ')})`,
        color: 'text-[#FFE9A6]'
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-full py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="al-card p-6">
            <LoadingState label="Carregando imobiliárias..." />
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-full py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <Link
              href="/dashboard/developer"
              className="text-text-secondary hover:text-[#FF7A97] text-sm font-bold transition-colors"
            >
              ← Voltar à Área do Desenvolvedor
            </Link>
          </div>
        </div>

        {/* Título */}
        <div className="text-center mb-8">
          <span className="gx-tag"><span>Área do desenvolvedor</span></span>
          <h1 className="al-display text-[26px] font-bold text-white uppercase tracking-[0.1em] mt-2 mb-2">
            Administração de Entidades
          </h1>
          <p className="text-[13px] text-text-secondary">
            Corrija dados inconsistentes e atualize entidades existentes
          </p>
        </div>

        {/* Mensagem */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-center font-bold text-sm border ${
            message.includes('✅') ? 'bg-[#34D399]/10 border-[#34D399]/35 text-emerald-300' : 'bg-red-500/10 border-red-500/40 text-red-300'
          }`}>
            {message}
      </div>
        )}

        {/* Botão de Atualização */}
        <div className="al-card relative overflow-hidden p-6 mb-8">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-2">
                Atualizar Imobiliárias
              </h3>
              <p className="text-sm text-text-secondary">
                Adiciona campos obrigatórios (tipo, status, aprovado) às imobiliárias existentes
              </p>
      </div>
            <button
              onClick={updateImobiliarias}
              disabled={updating}
              className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
            >
              {updating ? 'Atualizando...' : 'Atualizar Todas'}
        </button>
      </div>
        </div>

        {/* Lista de Imobiliárias */}
        <div className="al-card relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Nome</th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Tipo</th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Aprovado</th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Estado</th>
            </tr>
          </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {imobiliarias.map((imobiliaria) => {
                  const statusInfo = getStatusInfo(imobiliaria);
                  return (
                    <tr key={imobiliaria.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{imobiliaria.nome}</div>
                </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {imobiliaria.tipo || 'Não definido'}
                </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {imobiliaria.status || 'Não definido'}
                </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
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
          <div className="text-center py-8 text-text-secondary">
            <p>Nenhuma imobiliária encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
} 