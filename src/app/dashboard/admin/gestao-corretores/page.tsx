'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, deleteDoc, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { useRouter } from 'next/navigation';
import { getDemoLeads, DEMO_USUARIOS } from '@/lib/espelho/demoData';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';

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
  const { userData, isEspelhoDemo } = useAuth();
  const { stages } = usePipelineStages();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOriginUser, setSelectedOriginUser] = useState<string>('');
  const [selectedDestUser, setSelectedDestUser] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Buscar usuários da imobiliária
  useEffect(() => {
    if (!userData?.imobiliariaId && !isEspelhoDemo) return;

    if (isEspelhoDemo) {
      setUsers(DEMO_USUARIOS as User[]);
      return;
    }

    const usersRef = collection(db, 'usuarios');
    const q = query(usersRef, where('imobiliariaId', '==', userData!.imobiliariaId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, [userData, isEspelhoDemo]);

  // Buscar leads
  useEffect(() => {
    if (!userData?.imobiliariaId && !isEspelhoDemo) {
      setLoading(false);
      return;
    }

    if (isEspelhoDemo) {
      const demoLeads = getDemoLeads();
      setLeads(demoLeads.map(l => ({
        id: l.id,
        nome: l.nome,
        telefone: l.telefone,
        etapa: l.etapa,
        userId: l.userId,
        imobiliariaId: 'espelho-demo',
        createdAt: l.createdAt,
      })) as Lead[]);
      setLoading(false);
      return;
    }

    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, where('imobiliariaId', '==', userData!.imobiliariaId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao buscar leads:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userData, isEspelhoDemo]);

  const corretores = users.filter(user => 
    (user.tipoConta === 'corretor-vinculado' && user.aprovado) || 
    (user.tipoConta === 'imobiliaria' && user.aprovado)
  );

  // Filtrar leads do corretor de origem por etapa
  const filteredLeads = leads.filter(lead => {
    const userMatch = selectedOriginUser ? lead.userId === selectedOriginUser : false;
    const stageMatch = selectedStage ? lead.etapa === selectedStage : true;
    return userMatch && stageMatch;
  });

  // Transferir leads
  const handleTransferLeads = async () => {
    if (!selectedDestUser || selectedLeads.length === 0) {
      showToast('Selecione um corretor de destino e pelo menos um lead.', 'error');
      return;
    }

    if (isEspelhoDemo) {
      setSelectedLeads([]);
      showToast(`Modo demonstração: ${selectedLeads.length} lead(s) transferido(s) com sucesso (simulado).`, 'success');
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedLeads.forEach(leadId => {
        const leadRef = doc(db, 'leads', leadId);
        batch.update(leadRef, {
          userId: selectedDestUser,
          etapa: stages[0] ?? ''
        });
      });
      await batch.commit();
      setSelectedLeads([]);
      showToast(`${selectedLeads.length} lead(s) transferido(s) com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro ao transferir leads:', error);
      showToast('Erro ao transferir leads. Tente novamente.', 'error');
    }
  };

  // Excluir leads
  const handleDeleteLeads = async () => {
    if (selectedLeads.length === 0) {
      showToast('Selecione pelo menos um lead para excluir.', 'error');
      return;
    }

    if (!(await confirmDialog({ message: `Tem certeza que deseja excluir ${selectedLeads.length} lead(s)?`, danger: true, confirmLabel: 'Excluir' }))) return;

    try {
      const batch = writeBatch(db);
      
      selectedLeads.forEach(leadId => {
        const leadRef = doc(db, 'leads', leadId);
        batch.delete(leadRef);
      });

      await batch.commit();
      
      setSelectedLeads([]);
      showToast(`${selectedLeads.length} lead(s) excluído(s) com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro ao excluir leads:', error);
      showToast('Erro ao excluir leads. Tente novamente.', 'error');
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

  const handleVerDetalhes = (leadId: string) => {
    router.push(`/dashboard/crm/${leadId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState label="Carregando..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mb-2">Gestão de Corretores</h1>
          <p className="text-text-secondary text-sm">Transfira leads entre corretores</p>
        </div>

        {/* Seleção de Corretores */}
        <div className="al-card relative overflow-hidden p-6 mb-6">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Corretor de Origem */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">
                Corretor Origem
              </label>
              <select
                value={selectedOriginUser}
                onChange={(e) => {
                  setSelectedOriginUser(e.target.value);
                  setSelectedLeads([]); // Limpar seleção ao trocar corretor
                }}
                className="w-full px-4 py-2 border border-white/10 rounded-lg bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
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
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">
                Corretor Destino
              </label>
              <select
                value={selectedDestUser}
                onChange={(e) => setSelectedDestUser(e.target.value)}
                className="w-full px-4 py-2 border border-white/10 rounded-lg bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
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
          <div className="al-card relative overflow-hidden p-4 mb-6">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">
                  Filtrar por Etapa:
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="px-4 py-2 border border-white/10 rounded-lg bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                >
                  <option value="">Todas as etapas</option>
                  {stages.map(stage => {
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
                className="px-4 py-2 text-sm border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl transition-colors"
              >
                Limpar Filtro
              </button>
            </div>
          </div>
        )}

        {/* Ações em massa */}
        {selectedOriginUser && filteredLeads.length > 0 && (
          <div className="al-card relative overflow-hidden p-4 mb-6">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-text-secondary">
                  {selectedLeads.length} de {filteredLeads.length} leads selecionados
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllLeads}
                    className="px-3 py-1 text-xs border border-[#FF3364]/40 text-[#FF7A97] font-bold rounded-full hover:bg-[#FF1E56]/[0.09] transition-colors"
                  >
                    Selecionar Todos
                  </button>
                  <button
                    onClick={deselectAllLeads}
                    className="px-3 py-1 text-xs border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-full transition-colors"
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
                      className="px-4 py-2 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white rounded-xl font-bold shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Transferir {selectedLeads.length} Lead(s)
                    </button>
                    <button
                      onClick={handleDeleteLeads}
                      className="px-4 py-2 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl transition-colors font-bold"
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
        <div className="al-card relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="p-6 border-b border-white/[0.08]">
            {selectedOriginUser ? (
              <>
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">
                  Leads de {users.find(u => u.id === selectedOriginUser)?.nome}
                  {selectedStage && ` - ${selectedStage}`}
                </h2>
                <p className="text-text-secondary mt-1 text-sm">
                  {filteredLeads.length} lead(s) encontrado(s)
                </p>
              </>
            ) : (
              <>
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">
                  Selecione um corretor de origem
                </h2>
                <p className="text-text-secondary mt-1 text-sm">
                  Escolha um corretor para ver seus leads
                </p>
              </>
            )}
          </div>

          {!selectedOriginUser ? (
            <div className="p-8 text-center">
              <p className="text-text-secondary">Selecione um corretor de origem para gerenciar seus leads.</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-text-secondary">
                Nenhum lead encontrado{selectedStage && ` em "${selectedStage}"`} para {users.find(u => u.id === selectedOriginUser)?.nome}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.03]">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={(e) => e.target.checked ? selectAllLeads() : deselectAllLeads()}
                        className="rounded border-white/20 bg-white/[0.06] accent-[#FF1E56]"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Nome</th>
                    <th className="px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Telefone</th>
                    <th className="px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Etapa</th>
                    <th className="px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Data</th>
                    <th className="px-6 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => toggleLeadSelection(lead.id)}
                          className="rounded border-white/20 bg-white/[0.06] accent-[#FF1E56]"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {lead.nome}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {lead.telefone}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6]">
                          {lead.etapa}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          className="text-[#FF7A97] hover:text-[#FF9EB5] text-xs px-2 py-1 rounded hover:bg-[#FF1E56]/10 transition-colors"
                          onClick={() => handleVerDetalhes(lead.id)}
                          title="Ver detalhes do lead"
                        >
                          Detalhes
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
    </div>
  );
} 