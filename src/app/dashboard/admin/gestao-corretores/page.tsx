'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>('Pré Qualificação');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [transferTarget, setTransferTarget] = useState<string>('');

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
    if (!userData?.imobiliariaId) return;

    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, where('imobiliariaId', '==', userData.imobiliariaId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      
      console.log('Leads carregados:', leadsData);
      console.log('Imobiliária ID:', userData.imobiliariaId);
      
      setLeads(leadsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  // Filtrar leads por usuário e etapa
  const filteredLeads = leads.filter(lead => {
    const userMatch = selectedUser ? lead.userId === selectedUser : true;
    const stageMatch = lead.etapa === selectedStage;
    
    console.log('Filtro - Lead:', lead.nome, 'userId:', lead.userId, 'selectedUser:', selectedUser, 'etapa:', lead.etapa, 'selectedStage:', selectedStage);
    console.log('Filtro - userMatch:', userMatch, 'stageMatch:', stageMatch);
    
    return userMatch && stageMatch;
  });

  console.log('Leads filtrados:', filteredLeads);
  console.log('Usuários:', users);
  console.log('Usuário selecionado:', selectedUser);
  console.log('Etapa selecionada:', selectedStage);

  // Transferir leads
  const handleTransferLeads = async () => {
    if (!transferTarget || selectedLeads.length === 0) return;

    try {
      const batch = writeBatch(db);
      
      selectedLeads.forEach(leadId => {
        const leadRef = doc(db, 'leads', leadId);
        batch.update(leadRef, {
          userId: transferTarget,
          etapa: 'Pré Qualificação' // Volta para pré qualificação
        });
      });

      await batch.commit();
      
      setSelectedLeads([]);
      setShowTransferModal(false);
      setTransferTarget('');
      
      alert(`${selectedLeads.length} lead(s) transferido(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao transferir leads:', error);
      alert('Erro ao transferir leads. Tente novamente.');
    }
  };

  // Excluir lead
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;

    try {
      await deleteDoc(doc(db, 'leads', leadId));
      alert('Lead excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      alert('Erro ao excluir lead. Tente novamente.');
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
          <p className="text-[#6B6F76] dark:text-gray-300">Gerencie leads e transfira entre corretores</p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Filtro de Corretor */}
            <div>
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                Corretor
              </label>
              <select
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value || null)}
                className="w-full px-4 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
              >
                <option value="">Todos os corretores</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nome} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Etapa */}
            <div>
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                Etapa do Lead
              </label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full px-4 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
              >
                {PIPELINE_STAGES.map(stage => (
                  <option key={stage} value={stage}>
                    {stage} ({leads.filter(lead => lead.etapa === stage).length})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ações em massa */}
        {filteredLeads.length > 0 && (
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
              {selectedLeads.length > 0 && (
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors font-medium"
                >
                  Transferir {selectedLeads.length} Lead(s)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lista de Leads */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden">
          <div className="p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
            <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">
              Leads em {selectedStage}
              {selectedUser && ` - ${users.find(u => u.id === selectedUser)?.nome}`}
            </h2>
            <p className="text-[#6B6F76] dark:text-gray-300 mt-1">
              {filteredLeads.length} lead(s) encontrado(s)
            </p>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[#6B6F76] dark:text-gray-300">Nenhum lead encontrado para os filtros selecionados.</p>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6F76] dark:text-gray-300">Corretor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B6F76] dark:text-gray-300">Data</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[#6B6F76] dark:text-gray-300">Ações</th>
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
                      <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                        {users.find(u => u.id === lead.userId)?.nome || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                        {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Excluir lead"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Transferência */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">
              Transferir {selectedLeads.length} Lead(s)
            </h2>
            <p className="text-[#6B6F76] dark:text-gray-300 mb-4">
              Selecione o corretor para quem deseja transferir os leads. 
              Os leads voltarão para "Pré Qualificação".
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                Corretor Destino
              </label>
              <select
                value={transferTarget}
                onChange={(e) => setTransferTarget(e.target.value)}
                className="w-full px-4 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
              >
                <option value="">Selecione um corretor</option>
                {users.filter(user => user.status === 'ativo').map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nome} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferTarget('');
                }}
                className="flex-1 px-4 py-2 border border-[#E8E9F1] dark:border-[#23283A] text-[#2E2F38] dark:text-white rounded-lg hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransferLeads}
                disabled={!transferTarget}
                className="flex-1 px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transferir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 