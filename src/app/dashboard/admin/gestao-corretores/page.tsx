'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Mock data - corretores e seus leads
const corretores = [
  {
    id: 1,
    nome: 'João Silva',
    email: 'joao.silva@imobiliaria.com',
    telefone: '(11) 99999-1111',
    status: 'ativo',
    leads: 24,
    vendas: 8,
    comissao: 12500,
    ultimaAtividade: '2 horas atrás',
    foto: '👨‍💼',
    especialidade: 'Residencial',
    leadsRecentes: [
      { id: 1, nome: 'Maria Santos', telefone: '(11) 88888-1111', status: 'Contato', data: '2024-01-15' },
      { id: 2, nome: 'Pedro Costa', telefone: '(11) 88888-2222', status: 'Proposta', data: '2024-01-14' },
      { id: 3, nome: 'Ana Oliveira', telefone: '(11) 88888-3333', status: 'Fechado', data: '2024-01-13' },
    ]
  },
  {
    id: 2,
    nome: 'Maria Santos',
    email: 'maria.santos@imobiliaria.com',
    telefone: '(11) 99999-2222',
    status: 'ativo',
    leads: 18,
    vendas: 6,
    comissao: 9800,
    ultimaAtividade: '1 hora atrás',
    foto: '👩‍💼',
    especialidade: 'Comercial',
    leadsRecentes: [
      { id: 4, nome: 'Carlos Lima', telefone: '(11) 88888-4444', status: 'Contato', data: '2024-01-15' },
      { id: 5, nome: 'Lucia Ferreira', telefone: '(11) 88888-5555', status: 'Proposta', data: '2024-01-14' },
    ]
  },
  {
    id: 3,
    nome: 'Pedro Costa',
    email: 'pedro.costa@imobiliaria.com',
    telefone: '(11) 99999-3333',
    status: 'inativo',
    leads: 12,
    vendas: 3,
    comissao: 4500,
    ultimaAtividade: '3 dias atrás',
    foto: '👨‍💼',
    especialidade: 'Luxo',
    leadsRecentes: [
      { id: 6, nome: 'Roberto Alves', telefone: '(11) 88888-6666', status: 'Contato', data: '2024-01-12' },
    ]
  },
  {
    id: 4,
    nome: 'Ana Oliveira',
    email: 'ana.oliveira@imobiliaria.com',
    telefone: '(11) 99999-4444',
    status: 'ativo',
    leads: 31,
    vendas: 12,
    comissao: 18900,
    ultimaAtividade: '30 min atrás',
    foto: '👩‍💼',
    especialidade: 'Residencial',
    leadsRecentes: [
      { id: 7, nome: 'Fernando Silva', telefone: '(11) 88888-7777', status: 'Fechado', data: '2024-01-15' },
      { id: 8, nome: 'Patricia Lima', telefone: '(11) 88888-8888', status: 'Proposta', data: '2024-01-15' },
      { id: 9, nome: 'Ricardo Santos', telefone: '(11) 88888-9999', status: 'Contato', data: '2024-01-14' },
    ]
  }
];

export default function GestaoCorretoresPage() {
  const [selectedCorretor, setSelectedCorretor] = useState<number | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('todos');

  const corretoresFiltrados = filterStatus === 'todos' 
    ? corretores 
    : corretores.filter(c => c.status === filterStatus);

  const handleTransferLead = (leadId: number, novoCorretorId: number) => {
    // Mock - aqui seria uma chamada API
    console.log(`Transferindo lead ${leadId} para corretor ${novoCorretorId}`);
    setShowTransferModal(false);
  };

  const handleDeleteLead = (leadId: number) => {
    // Mock - aqui seria uma chamada API
    console.log(`Deletando lead ${leadId}`);
    setShowLeadModal(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Gestão de Corretores</h1>
            <p className="text-[#6B6F76] dark:text-gray-300 text-base">Gerencie a equipe e acompanhe o desempenho dos corretores</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button className="bg-[#3478F6] hover:bg-[#2E6FD9] text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200">
              + Adicionar Corretor
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B6F76] dark:text-gray-300 text-sm">Total de Corretores</p>
                <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{corretores.length}</p>
              </div>
              <span className="text-3xl">👥</span>
            </div>
          </div>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B6F76] dark:text-gray-300 text-sm">Corretores Ativos</p>
                <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{corretores.filter(c => c.status === 'ativo').length}</p>
              </div>
              <span className="text-3xl">✅</span>
            </div>
          </div>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B6F76] dark:text-gray-300 text-sm">Total de Leads</p>
                <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{corretores.reduce((acc, c) => acc + c.leads, 0)}</p>
              </div>
              <span className="text-3xl">📊</span>
            </div>
          </div>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B6F76] dark:text-gray-300 text-sm">Vendas do Mês</p>
                <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{corretores.reduce((acc, c) => acc + c.vendas, 0)}</p>
              </div>
              <span className="text-3xl">💰</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                filterStatus === 'todos' 
                  ? 'bg-[#3478F6] text-white' 
                  : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300'
              }`}
            >
              Todos ({corretores.length})
            </button>
            <button
              onClick={() => setFilterStatus('ativo')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                filterStatus === 'ativo' 
                  ? 'bg-[#3478F6] text-white' 
                  : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300'
              }`}
            >
              Ativos ({corretores.filter(c => c.status === 'ativo').length})
            </button>
            <button
              onClick={() => setFilterStatus('inativo')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                filterStatus === 'inativo' 
                  ? 'bg-[#3478F6] text-white' 
                  : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300'
              }`}
            >
              Inativos ({corretores.filter(c => c.status === 'inativo').length})
            </button>
          </div>
        </div>

        {/* Corretores Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {corretoresFiltrados.map((corretor) => (
            <div key={corretor.id} className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden">
              {/* Header do Card */}
              <div className="p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{corretor.foto}</span>
                    <div>
                      <h3 className="text-xl font-bold text-[#2E2F38] dark:text-white">{corretor.nome}</h3>
                      <p className="text-[#6B6F76] dark:text-gray-300 text-sm">{corretor.especialidade}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      corretor.status === 'ativo' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {corretor.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                    <button 
                      onClick={() => setSelectedCorretor(selectedCorretor === corretor.id ? null : corretor.id)}
                      className="text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] transition-colors"
                    >
                      {selectedCorretor === corretor.id ? '▼' : '▶'}
                    </button>
                  </div>
                </div>
                
                {/* Stats do Corretor */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#3478F6]">{corretor.leads}</p>
                    <p className="text-xs text-[#6B6F76] dark:text-gray-300">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{corretor.vendas}</p>
                    <p className="text-xs text-[#6B6F76] dark:text-gray-300">Vendas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">R$ {corretor.comissao.toLocaleString()}</p>
                    <p className="text-xs text-[#6B6F76] dark:text-gray-300">Comissão</p>
                  </div>
                </div>
              </div>

              {/* Detalhes Expandidos */}
              {selectedCorretor === corretor.id && (
                <div className="p-6">
                  {/* Informações de Contato */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-[#2E2F38] dark:text-white mb-3">Informações de Contato</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-[#6B6F76] dark:text-gray-300">
                        <span className="font-medium">Email:</span> {corretor.email}
                      </p>
                      <p className="text-[#6B6F76] dark:text-gray-300">
                        <span className="font-medium">Telefone:</span> {corretor.telefone}
                      </p>
                      <p className="text-[#6B6F76] dark:text-gray-300">
                        <span className="font-medium">Última atividade:</span> {corretor.ultimaAtividade}
                      </p>
                    </div>
                  </div>

                  {/* Leads Recentes */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-[#2E2F38] dark:text-white">Leads Recentes</h4>
                      <Link 
                        href={`/crm?corretor=${corretor.id}`}
                        className="text-[#3478F6] hover:text-[#2E6FD9] text-sm font-medium transition-colors"
                      >
                        Ver todos →
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {corretor.leadsRecentes.map((lead) => (
                        <div key={lead.id} className="flex items-center justify-between p-3 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-[#2E2F38] dark:text-white">{lead.nome}</p>
                            <p className="text-sm text-[#6B6F76] dark:text-gray-300">{lead.telefone}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              lead.status === 'Fechado' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              lead.status === 'Proposta' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {lead.status}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowLeadModal(true);
                              }}
                              className="text-[#6B6F76] dark:text-gray-300 hover:text-red-500 transition-colors"
                              title="Gerenciar lead"
                            >
                              ⚙️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3">
                    <Link
                      href={`/crm?corretor=${corretor.id}`}
                      className="flex-1 bg-[#3478F6] hover:bg-[#2E6FD9] text-white py-2 px-4 rounded-lg text-center font-medium transition-colors duration-200"
                    >
                      Ver CRM
                    </Link>
                    <button className="flex-1 bg-[#F5F6FA] dark:bg-[#181C23] hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38] text-[#2E2F38] dark:text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200">
                      Editar
                    </button>
                    <button className="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 py-2 px-4 rounded-lg font-medium transition-colors duration-200">
                      Desativar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Gerenciamento de Lead */}
      {showLeadModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-lg w-full max-w-md p-6 relative animate-fade-in">
            <button 
              className="absolute top-4 right-4 text-2xl text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6]" 
              onClick={() => setShowLeadModal(false)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Gerenciar Lead</h2>
            <div className="mb-6">
              <p className="text-[#6B6F76] dark:text-gray-300 mb-2">
                <span className="font-medium">Nome:</span> {selectedLead.nome}
              </p>
              <p className="text-[#6B6F76] dark:text-gray-300 mb-2">
                <span className="font-medium">Telefone:</span> {selectedLead.telefone}
              </p>
              <p className="text-[#6B6F76] dark:text-gray-300 mb-2">
                <span className="font-medium">Status:</span> {selectedLead.status}
              </p>
              <p className="text-[#6B6F76] dark:text-gray-300">
                <span className="font-medium">Data:</span> {selectedLead.data}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(true);
                  setShowLeadModal(false);
                }}
                className="flex-1 bg-[#3478F6] hover:bg-[#2E6FD9] text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
              >
                Transferir
              </button>
              <button
                onClick={() => handleDeleteLead(selectedLead.id)}
                className="flex-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 py-2 px-4 rounded-lg font-medium transition-colors duration-200"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-lg w-full max-w-md p-6 relative animate-fade-in">
            <button 
              className="absolute top-4 right-4 text-2xl text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6]" 
              onClick={() => setShowTransferModal(false)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Transferir Lead</h2>
            <p className="text-[#6B6F76] dark:text-gray-300 mb-6">
              Selecione o corretor para quem deseja transferir o lead:
            </p>
            <div className="space-y-3 mb-6">
              {corretores.filter(c => c.status === 'ativo').map((corretor) => (
                <button
                  key={corretor.id}
                  onClick={() => handleTransferLead(selectedLead?.id || 0, corretor.id)}
                  className="w-full flex items-center gap-3 p-3 bg-[#F5F6FA] dark:bg-[#181C23] hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38] rounded-lg transition-colors duration-200"
                >
                  <span className="text-2xl">{corretor.foto}</span>
                  <div className="text-left">
                    <p className="font-medium text-[#2E2F38] dark:text-white">{corretor.nome}</p>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-300">{corretor.especialidade}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 