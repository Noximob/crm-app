'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, deleteDoc, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';

interface User {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  status?: 'ativo' | 'inativo';
  imobiliariaId?: string;
  tipoConta: 'imobiliaria' | 'corretor-vinculado' | 'corretor-autonomo';
  aprovado: boolean;
}

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  etapa: string;
  userId: string;
  imobiliariaId: string;
  createdAt: any;
  [key: string]: any;
}

export default function GestaoCorretoresPage() {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOriginUser, setSelectedOriginUser] = useState<string>('');
  const [selectedDestUser, setSelectedDestUser] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Buscar usuários da imobiliária
  useEffect(() => {
    if (!userData?.imobiliariaId) return;

    const usersRef = collection(db, 'usuarios');
    const q = query(usersRef, where('imobiliariaId', '==', userData.imobiliariaId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, [userData]);

  // Buscar leads
  useEffect(() => {
    if (!userData?.imobiliariaId) {
      console.log('userData ou imobiliariaId não encontrado para leads:', userData);
      return;
    }

    console.log('=== DEBUG LEADS ===');
    console.log('userData completo:', userData);
    console.log('imobiliariaId sendo usado:', userData.imobiliariaId);
    console.log('Tipo do imobiliariaId:', typeof userData.imobiliariaId);
    
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, where('imobiliariaId', '==', userData.imobiliariaId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      
      console.log('Query de leads executada');
      console.log('Snapshot size:', snapshot.size);
      console.log('Leads encontrados:', leadsData);
      console.log('Leads por usuário:', leadsData.reduce((acc, lead) => {
        acc[lead.userId] = (acc[lead.userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao buscar leads:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  const corretores = users.filter(user => 
    (user.tipoConta === 'corretor-vinculado' && user.aprovado) || 
    (user.tipoConta === 'imobiliaria' && user.aprovado)
  );

  // Filtrar leads do corretor de origem por etapa
  const filteredLeads = leads.filter(lead => {
    const userMatch = selectedOriginUser ? lead.userId === selectedOriginUser : false;
    const stageMatch = selectedStage ? lead.etapa === selectedStage : true;
    
    console.log('Filtro - Lead:', lead.nome, 'userId:', lead.userId, 'selectedOriginUser:', selectedOriginUser, 'etapa:', lead.etapa, 'selectedStage:', selectedStage);
    console.log('Filtro - userMatch:', userMatch, 'stageMatch:', stageMatch);
    
    return userMatch && stageMatch;
  });

  console.log('Leads filtrados:', filteredLeads);
  console.log('Usuários:', users);
  console.log('Corretores filtrados:', corretores);
  console.log('Usuário origem selecionado:', selectedOriginUser);
  console.log('Etapa selecionada:', selectedStage);
  console.log('Total de leads:', leads.length);

  // Transferir leads
  const handleTransferLeads = async () => {
    if (!selectedDestUser || selectedLeads.length === 0) {
      alert('Selecione um corretor de destino e pelo menos um lead.');
      return;
    }

    try {
      const batch = writeBatch(db);
      
      selectedLeads.forEach(leadId => {
        const leadRef = doc(db, 'leads', leadId);
        batch.update(leadRef, {
          userId: selectedDestUser,
          etapa: 'Pré Qualificação' // Volta para pré qualificação
        });
      });

      await batch.commit();
      
      setSelectedLeads([]);
      alert(`${selectedLeads.length} lead(s) transferido(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao transferir leads:', error);
      alert('Erro ao transferir leads. Tente novamente.');
    }
  };

  // Excluir leads
  const handleDeleteLeads = async () => {
    if (selectedLeads.length === 0) {
      alert('Selecione pelo menos um lead para excluir.');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.length} lead(s)?`)) return;

    try {
      const batch = writeBatch(db);
      
      selectedLeads.forEach(leadId => {
        const leadRef = doc(db, 'leads', leadId);
        batch.delete(leadRef);
      });

      await batch.commit();
      
      setSelectedLeads([]);
      alert(`${selectedLeads.length} lead(s) excluído(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao excluir leads:', error);
      alert('Erro ao excluir leads. Tente novamente.');
    }
  };

  // Selecionar/deselecionar lead
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  // Selecionar todos os leads da etapa
  const selectAllLeads = () => {
    setSelectedLeads(filteredLeads.map(lead => lead.id));
  };

  // Deselecionar todos
  const deselectAllLeads = () => {
    setSelectedLeads([]);
  };

  // Limpar filtro
  const clearFilter = () => {
    setSelectedStage('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6] mx-auto mb-4"></div>
          <p className="text-[#6B6F76] dark:text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Gestão de Corretores</h1>
          <p className="text-[#6B6F76] dark:text-gray-300">Transfira leads entre corretores</p>
        </div>

        {/* Seleção de Corretores */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Corretor de Origem */}
            <div>
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                Corretor Origem
              </label>
              <select
                value={selectedOriginUser}
                onChange={(e) => {
                  setSelectedOriginUser(e.target.value);
                  setSelectedLeads([]); // Limpar seleção ao trocar corretor
                }}
                className="w-full px-4 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
              >
                <option value="">Selecione o corretor de origem</option>
                {corretores.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nome} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Corretor de Destino */}
            <div>
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                Corretor Destino
              </label>
              <select
                value={selectedDestUser}
                onChange={(e) => setSelectedDestUser(e.target.value)}
                className="w-full px-4 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
              >
                <option value="">Selecione o corretor de destino</option>
                {corretores.filter(user => user.id !== selectedOriginUser).map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nome} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filtro por Etapa */}
        {selectedOriginUser && (
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-4 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-[#2E2F38] dark:text-white">
                  Filtrar por Etapa:
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="px-4 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                >
                  <option value="">Todas as etapas</option>
                  {PIPELINE_STAGES.map(stage => {
                    const stageCount = leads.filter(lead => 
                      lead.userId === selectedOriginUser && lead.etapa === stage
                    ).length;
                    return (
                      <option key={stage} value={stage}>
                        {stage} ({stageCount})
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                onClick={clearFilter}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Limpar Filtro
              </button>
            </div>
          </div>
        )}

        {/* Ações em massa */}
        {selectedOriginUser && filteredLeads.length > 0 && (
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-4 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#6B6F76] dark:text-gray-300">
                  {selectedLeads.length} de {filteredLeads.length} leads selecionados
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllLeads}
                    className="px-3 py-1 text-xs bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors"
                  >
                    Selecionar Todos
                  </button>
                  <button
                    onClick={deselectAllLeads}
                    className="px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Limpar Seleção
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedLeads.length > 0 && (
                  <>
                    <button
                      onClick={handleTransferLeads}
                      disabled={!selectedDestUser}
                      className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Transferir {selectedLeads.length} Lead(s)
                    </button>
                    <button
                      onClick={handleDeleteLeads}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                    >
                      Apagar {selectedLeads.length} Lead(s)
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Leads */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden">
          <div className="p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
            {selectedOriginUser ? (
              <>
                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">
                  Leads de {users.find(u => u.id === selectedOriginUser)?.nome}
                  {selectedStage && ` - ${selectedStage}`}
                </h2>
                <p className="text-[#6B6F76] dark:text-gray-300 mt-1">
                  {filteredLeads.length} lead(s) encontrado(s)
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">
                  Selecione um corretor de origem
                </h2>
                <p className="text-[#6B6F76] dark:text-gray-300 mt-1">
                  Escolha um corretor para ver seus leads
                </p>
              </>
            )}
          </div>

          {!selectedOriginUser ? (
            <div className="p-8 text-center">
              <p className="text-[#6B6F76] dark:text-gray-300">Selecione um corretor de origem para gerenciar seus leads.</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[#6B6F76] dark:text-gray-300">
                Nenhum lead encontrado{selectedStage && ` em "${selectedStage}"`} para {users.find(u => u.id === selectedOriginUser)?.nome}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F5F6FA] dark:bg-[#181C23]">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={(e) => e.target.checked ? selectAllLeads() : deselectAllLeads()}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6F76] dark:text-gray-300">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6F76] dark:text-gray-300">Telefone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6F76] dark:text-gray-300">Etapa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6F76] dark:text-gray-300">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E9F1] dark:divide-[#23283A]">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => toggleLeadSelection(lead.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#2E2F38] dark:text-white">
                        {lead.nome}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                        {lead.telefone}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {lead.etapa}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                        {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 