'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import Link from 'next/link';

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
      case 'ativo': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inativo': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pendente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
              className="text-[#F59E0B] hover:text-[#2E6FD9] transition-colors"
            >
              ← Voltar à Área do Desenvolvedor
            </Link>
          </div>
        </div>

        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#2E2F38] dark:text-white mb-4">
            Gestão de Imobiliárias
          </h1>
          <p className="text-xl text-[#6B6F76] dark:text-gray-300">
            Administre imobiliárias, permissões e acessos
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <p className="text-3xl mb-2">🏢</p>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{imobiliarias.length}</p>
            <p className="text-sm text-[#6B6F76] dark:text-gray-300">Total</p>
          </div>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">
              {imobiliarias.filter(i => i.status === 'ativo').length}
            </p>
            <p className="text-sm text-[#6B6F76] dark:text-gray-300">Ativas</p>
          </div>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <p className="text-3xl mb-2">⏳</p>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">
              {imobiliarias.filter(i => i.status === 'pendente').length}
            </p>
            <p className="text-sm text-[#6B6F76] dark:text-gray-300">Pendentes</p>
          </div>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <p className="text-3xl mb-2">❌</p>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">
              {imobiliarias.filter(i => i.status === 'inativo').length}
            </p>
            <p className="text-sm text-[#6B6F76] dark:text-gray-300">Inativas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por nome, email ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('todos')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterStatus === 'todos' 
                    ? 'bg-[#F59E0B] text-white' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38]'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('ativo')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterStatus === 'ativo' 
                    ? 'bg-[#F59E0B] text-white' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38]'
                }`}
              >
                Ativas
              </button>
              <button
                onClick={() => setFilterStatus('pendente')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterStatus === 'pendente' 
                    ? 'bg-[#F59E0B] text-white' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38]'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFilterStatus('inativo')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterStatus === 'inativo' 
                    ? 'bg-[#F59E0B] text-white' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38]'
                }`}
              >
                Inativas
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Imobiliárias */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F5F6FA] dark:bg-[#181C23]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#2E2F38] dark:text-white">Imobiliária</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#2E2F38] dark:text-white">Contato</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#2E2F38] dark:text-white">CNPJ</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#2E2F38] dark:text-white">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[#2E2F38] dark:text-white">Data Cadastro</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-[#2E2F38] dark:text-white">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E9F1] dark:divide-[#23283A]">
                {filteredImobiliarias.map((imobiliaria) => (
                  <tr key={imobiliaria.id} className="hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-[#2E2F38] dark:text-white">{imobiliaria.nome}</div>
                        <div className="text-sm text-[#6B6F76] dark:text-gray-300">{imobiliaria.endereco}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-[#2E2F38] dark:text-white">{imobiliaria.email}</div>
                        <div className="text-sm text-[#6B6F76] dark:text-gray-300">{imobiliaria.telefone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                      {imobiliaria.cnpj}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(imobiliaria.status)}`}>
                        {getStatusLabel(imobiliaria.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                      {imobiliaria.dataCadastro?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {imobiliaria.status === 'pendente' && (
                          <button
                            onClick={() => handleAction('approve', imobiliaria)}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 transition-colors"
                          >
                            Aprovar
                          </button>
                        )}
                        {imobiliaria.status === 'ativo' && (
                          <button
                            onClick={() => handleAction('disable', imobiliaria)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs hover:bg-yellow-600 transition-colors"
                          >
                            Desativar
                          </button>
                        )}
                        <button
                          onClick={() => handleAction('edit', imobiliaria)}
                          className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs hover:bg-amber-600 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleAction('delete', imobiliaria)}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">
                {modalAction === 'approve' && 'Aprovar Imobiliária'}
                {modalAction === 'disable' && 'Desativar Imobiliária'}
                {modalAction === 'delete' && 'Excluir Imobiliária'}
                {modalAction === 'edit' && 'Editar Imobiliária'}
              </h3>
              <p className="text-[#6B6F76] dark:text-gray-300 mb-6">
                {modalAction === 'approve' && `Tem certeza que deseja aprovar "${selectedImobiliaria.nome}"?`}
                {modalAction === 'disable' && `Tem certeza que deseja desativar "${selectedImobiliaria.nome}"?`}
                {modalAction === 'delete' && `Tem certeza que deseja excluir "${selectedImobiliaria.nome}"? Esta ação não pode ser desfeita.`}
                {modalAction === 'edit' && `Editar dados de "${selectedImobiliaria.nome}"`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#6B6F76] dark:text-gray-300 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAction}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                    modalAction === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                    modalAction === 'disable' ? 'bg-yellow-500 hover:bg-yellow-600' :
                    modalAction === 'delete' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-amber-500 hover:bg-amber-600'
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