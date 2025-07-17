'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

// Componente para título com barra colorida (padrão do sistema)
const SectionTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white relative z-10">{children}</h2>
    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#3478F6] to-[#A3C8F7] rounded-r-full opacity-60"></div>
  </div>
);

interface Indicadores {
  cub?: string;
  selic?: string;
  ipca?: string;
  igpm?: string;
  incc?: string;
  dataAtualizacao?: Timestamp;
}

export default function IndicadoresEconomicosPage() {
  const { userData } = useAuth();
  const [indicadores, setIndicadores] = useState<Indicadores>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (userData?.imobiliariaId) {
      fetchIndicadores();
    }
  }, [userData]);

  const fetchIndicadores = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const docId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const docRef = doc(db, 'indicadoresExternos', docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setIndicadores(docSnap.data() as Indicadores);
      } else {
        setIndicadores({});
      }
    } catch (error) {
      console.error('Erro ao buscar indicadores:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar indicadores' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userData?.imobiliariaId) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const now = new Date();
      const docId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const docRef = doc(db, 'indicadoresExternos', docId);
      
      await setDoc(docRef, {
        ...indicadores,
        dataAtualizacao: Timestamp.now(),
        atualizadoPor: userData.imobiliariaId
      });
      
      setMessage({ type: 'success', text: 'Indicadores salvos com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar indicadores:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar indicadores' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof Indicadores, value: string) => {
    setIndicadores(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="bg-[#F5F6FA] dark:bg-[#181C23] min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F6FA] dark:bg-[#181C23] min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">
            Indicadores Econômicos
          </h1>
          <p className="text-[#6B6F76] dark:text-gray-300 text-lg">
            Configure os indicadores econômicos que aparecem no dashboard
          </p>
        </div>

        {/* Mensagem de feedback */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400' 
              : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Formulário */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-8">
          <SectionTitle className="mb-6">Configuração dos Indicadores</SectionTitle>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CUB */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white">
                CUB (Custo Unitário Básico) - SC
              </label>
              <input
                type="text"
                value={indicadores.cub || ''}
                onChange={(e) => handleInputChange('cub', e.target.value)}
                placeholder="Ex: 1.234,56"
                className="w-full px-4 py-3 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6] transition-all"
              />
              <p className="text-xs text-[#6B6F76] dark:text-gray-400">
                Custo por m² para construção em Santa Catarina
              </p>
            </div>

            {/* SELIC */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white">
                SELIC (% ao ano)
              </label>
              <input
                type="text"
                value={indicadores.selic || ''}
                onChange={(e) => handleInputChange('selic', e.target.value)}
                placeholder="Ex: 13,75"
                className="w-full px-4 py-3 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6] transition-all"
              />
              <p className="text-xs text-[#6B6F76] dark:text-gray-400">
                Taxa básica de juros da economia
              </p>
            </div>

            {/* IPCA */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white">
                IPCA (% acumulado 12 meses)
              </label>
              <input
                type="text"
                value={indicadores.ipca || ''}
                onChange={(e) => handleInputChange('ipca', e.target.value)}
                placeholder="Ex: 4,62"
                className="w-full px-4 py-3 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6] transition-all"
              />
              <p className="text-xs text-[#6B6F76] dark:text-gray-400">
                Índice Nacional de Preços ao Consumidor Amplo
              </p>
            </div>

            {/* IGP-M */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white">
                IGP-M (% acumulado 12 meses)
              </label>
              <input
                type="text"
                value={indicadores.igpm || ''}
                onChange={(e) => handleInputChange('igpm', e.target.value)}
                placeholder="Ex: 3,45"
                className="w-full px-4 py-3 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6] transition-all"
              />
              <p className="text-xs text-[#6B6F76] dark:text-gray-400">
                Índice Geral de Preços do Mercado
              </p>
            </div>

            {/* INCC */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white">
                INCC (% acumulado 12 meses)
              </label>
              <input
                type="text"
                value={indicadores.incc || ''}
                onChange={(e) => handleInputChange('incc', e.target.value)}
                placeholder="Ex: 5,23"
                className="w-full px-4 py-3 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6] transition-all"
              />
              <p className="text-xs text-[#6B6F76] dark:text-gray-400">
                Índice Nacional do Custo da Construção
              </p>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="mt-8 p-4 bg-[#F0F4FF] dark:bg-[#23283A] rounded-xl border border-[#A3C8F7]/20">
            <h3 className="font-semibold text-[#2E2F38] dark:text-white mb-2">ℹ️ Informações</h3>
            <ul className="text-sm text-[#6B6F76] dark:text-gray-300 space-y-1">
              <li>• Os indicadores são salvos por mês (formato: YYYY-MM)</li>
              <li>• Use vírgula como separador decimal (Ex: 13,75)</li>
              <li>• Os valores aparecem no dashboard de todos os usuários</li>
              <li>• A variação é calculada automaticamente entre os meses</li>
            </ul>
          </div>

          {/* Botões */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-[#E8E9F1] dark:border-[#23283A]">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-[#6B6F76] disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                'Salvar Indicadores'
              )}
            </button>
            
            <button
              onClick={fetchIndicadores}
              className="px-8 py-3 bg-[#F5F6FA] dark:bg-[#181C23] hover:bg-[#E8E9F1] dark:hover:bg-[#23283A] text-[#2E2F38] dark:text-white rounded-lg font-semibold transition-colors border border-[#E8E9F1] dark:border-[#23283A]"
            >
              Recarregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 