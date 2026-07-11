'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import Link from 'next/link';
import LoadingState from '@/components/ui/LoadingState';

interface Imobiliaria {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cnpj: string;
  endereco: string;
  aprovado: boolean;
  dataCadastro: any;
  status: 'ativo' | 'inativo' | 'pendente';
}

export default function AdminImobiliariasPage() {
  const { currentUser } = useAuth();
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [selectedImobiliaria, setSelectedImobiliaria] = useState<Imobiliaria | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'disable' | 'delete' | 'edit'>('approve');

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

  const filteredImobiliarias = imobiliarias.filter(imobiliaria => {
    const matchSearch = imobiliaria.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       imobiliaria.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       imobiliaria.cnpj.includes(searchTerm);
    
    const matchStatus = filterStatus === 'todos' || imobiliaria.status === filterStatus;
    
    return matchSearch && matchStatus;
  });

  const handleAction = async (action: 'approve' | 'disable' | 'delete' | 'edit', imobiliaria: Imobiliaria) => {
    setSelectedImobiliaria(imobiliaria);
    setModalAction(action);
    setShowModal(true);
  };

  const confirmAction = async () => {
    if (!selectedImobiliaria) return;

    try {
      const imobiliariaRef = doc(db, 'imobiliarias', selectedImobiliaria.id);

      switch (modalAction) {
        case 'approve':
          await updateDoc(imobiliariaRef, { 
            aprovado: true, 
            status: 'ativo' 
          });
          break;
        case 'disable':
          await updateDoc(imobiliariaRef, { 
            aprovado: false, 
            status: 'inativo' 
          });
          break;
        case 'delete':
          await deleteDoc(imobiliariaRef);
          break;
        case 'edit':
          // Implementar edição
          break;
      }

      await loadImobiliarias();
      setShowModal(false);
      setSelectedImobiliaria(null);
    } catch (error) {
      console.error('Erro ao executar ação:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-[#34D399]/10 border border-[#34D399]/35 text-emerald-300';
      case 'inativo': return 'bg-[#FF1E56]/10 border border-[#FF1E56]/35 text-[#FF9EB5]';
      case 'pendente': return 'bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6]';
      default: return 'bg-white/[0.05] border border-white/15 text-text-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'inativo': return 'Inativo';
      case 'pendente': return 'Pendente';
      default: return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="al-card p-6">
            <LoadingState label="Carregando imobiliárias..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
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
            Gestão de Imobiliárias
          </h1>
          <p className="text-[13px] text-text-secondary">
            Administre imobiliárias, permissões e acessos
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="al-card relative overflow-hidden p-6 text-center">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <p className="text-2xl font-bold text-white al-display tabular-nums">{imobiliarias.length}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mt-1">Total</p>
          </div>
          <div className="al-card relative overflow-hidden p-6 text-center">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <p className="text-2xl font-bold text-emerald-300 al-display tabular-nums">
              {imobiliarias.filter(i => i.status === 'ativo').length}
            </p>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mt-1">Ativas</p>
          </div>
          <div className="al-card relative overflow-hidden p-6 text-center">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <p className="text-2xl font-bold text-[#FFE9A6] al-display tabular-nums">
              {imobiliarias.filter(i => i.status === 'pendente').length}
            </p>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mt-1">Pendentes</p>
          </div>
          <div className="al-card relative overflow-hidden p-6 text-center">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <p className="text-2xl font-bold text-[#FF9EB5] al-display tabular-nums">
              {imobiliarias.filter(i => i.status === 'inativo').length}
            </p>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mt-1">Inativas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="al-card relative overflow-hidden p-6 mb-8">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por nome, email ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('todos')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterStatus === 'todos' 
                    ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                    : 'bg-white/[0.04] border border-white/10 text-text-secondary hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('ativo')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterStatus === 'ativo' 
                    ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                    : 'bg-white/[0.04] border border-white/10 text-text-secondary hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                Ativas
              </button>
              <button
                onClick={() => setFilterStatus('pendente')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterStatus === 'pendente' 
                    ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                    : 'bg-white/[0.04] border border-white/10 text-text-secondary hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFilterStatus('inativo')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterStatus === 'inativo' 
                    ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                    : 'bg-white/[0.04] border border-white/10 text-text-secondary hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                Inativas
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Imobiliárias */}
        <div className="al-card relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Imobiliária</th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Contato</th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">CNPJ</th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Data Cadastro</th>
                  <th className="px-6 py-4 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredImobiliarias.map((imobiliaria) => (
                  <tr key={imobiliaria.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{imobiliaria.nome}</div>
                        <div className="text-sm text-text-secondary">{imobiliaria.endereco}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-white">{imobiliaria.email}</div>
                        <div className="text-sm text-text-secondary">{imobiliaria.telefone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {imobiliaria.cnpj}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${getStatusColor(imobiliaria.status)}`}>
                        {getStatusLabel(imobiliaria.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {imobiliaria.dataCadastro?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {imobiliaria.status === 'pendente' && (
                          <button
                            onClick={() => handleAction('approve', imobiliaria)}
                            className="px-3 py-1 border border-[#34D399]/40 bg-[#34D399]/10 hover:bg-[#34D399]/20 text-emerald-300 font-bold rounded-lg text-xs transition-colors"
                          >
                            Aprovar
                          </button>
                        )}
                        {imobiliaria.status === 'ativo' && (
                          <button
                            onClick={() => handleAction('disable', imobiliaria)}
                            className="px-3 py-1 border border-[#E8C547]/40 bg-[#E8C547]/10 hover:bg-[#E8C547]/20 text-[#FFE9A6] font-bold rounded-lg text-xs transition-colors"
                          >
                            Desativar
                          </button>
                        )}
                        <button
                          onClick={() => handleAction('edit', imobiliaria)}
                          className="px-3 py-1 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleAction('delete', imobiliaria)}
                          className="px-3 py-1 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 font-bold rounded-lg text-xs transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Confirmação */}
        {showModal && selectedImobiliaria && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 max-w-md w-full mx-4">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">
                {modalAction === 'approve' && 'Aprovar Imobiliária'}
                {modalAction === 'disable' && 'Desativar Imobiliária'}
                {modalAction === 'delete' && 'Excluir Imobiliária'}
                {modalAction === 'edit' && 'Editar Imobiliária'}
              </h3>
              <p className="text-text-secondary mb-6">
                {modalAction === 'approve' && `Tem certeza que deseja aprovar "${selectedImobiliaria.nome}"?`}
                {modalAction === 'disable' && `Tem certeza que deseja desativar "${selectedImobiliaria.nome}"?`}
                {modalAction === 'delete' && `Tem certeza que deseja excluir "${selectedImobiliaria.nome}"? Esta ação não pode ser desfeita.`}
                {modalAction === 'edit' && `Editar dados de "${selectedImobiliaria.nome}"`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAction}
                  className={`flex-1 px-4 py-2 rounded-xl font-bold transition-all active:scale-[0.98] ${
                    modalAction === 'approve' ? 'border border-[#34D399]/40 bg-[#34D399]/10 hover:bg-[#34D399]/20 text-emerald-300' :
                    modalAction === 'disable' ? 'border border-[#E8C547]/40 bg-[#E8C547]/10 hover:bg-[#E8C547]/20 text-[#FFE9A6]' :
                    modalAction === 'delete' ? 'border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300' :
                    'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 