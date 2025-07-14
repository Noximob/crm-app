'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

interface UsuarioPendente {
  id: string;
  nome: string;
  email: string;
  tipoConta: 'imobiliaria' | 'corretor-vinculado' | 'corretor-autonomo';
  imobiliariaId?: string;
  criadoEm: any;
  metodoCadastro: 'email' | 'google';
}

const adminCards = [
  { title: 'Gestão de Corretores', icon: '🧑‍💼', description: 'Administre os leads dos seus corretores', href: '/dashboard/admin/gestao-leads' },
  { title: 'Materiais Construtora', icon: '🏗️', description: 'Adicione e gerencie materiais das construtoras.', href: '/dashboard/admin/materiais-construtora' },
  { title: 'Marketing Imobiliário', icon: '📢', description: 'Ferramentas e campanhas de marketing.', href: '/dashboard/admin/marketing-imobiliario' },
  { title: 'Financeiro', icon: '💰', description: 'Controle financeiro da imobiliária.', href: '/dashboard/admin/financeiro' },
  { title: 'Relatórios', icon: '📊', description: 'Acompanhe métricas e resultados detalhados.', href: '/dashboard/admin/relatorios' },
  { title: 'Site', icon: '🌐', description: 'Gerencie o site institucional e vitrines.', href: '/dashboard/admin/site' },
  { title: 'Importar Leads', icon: '⬆️', description: 'Importe vários leads de uma vez, colando nomes e telefones.', href: '/dashboard/admin/importar-leads' },
  { title: 'Avisos Importantes', icon: '📢', description: 'Crie e edite avisos para os corretores.', href: '/dashboard/admin/avisos-importantes' },
  { title: 'Aprovação de Usuários', icon: '✅', description: 'Aprove ou rejeite novos cadastros.', href: '#', special: true },
];

const financeiroTabs = [
  { label: 'Visão geral', icon: '📈' },
  { label: 'Lançamentos', icon: '↕️' },
  { label: 'Meus bancos', icon: '🏦' },
  { label: 'Meus cartões', icon: '💳' },
  { label: 'Histórico', icon: '🕒' },
  { label: 'Relatórios', icon: '📊', dropdown: ['Categorias', 'Fluxo'] },
  { label: 'Categorias', icon: '➕', dropdown: ['Receita', 'Despesa'] },
];

export default function AdminPage() {
  const [showFinanceiro, setShowFinanceiro] = useState(false);
  const [showAprovacao, setShowAprovacao] = useState(false);
  const [activeTab, setActiveTab] = useState('Visão geral');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [usuariosPendentes, setUsuariosPendentes] = useState<UsuarioPendente[]>([]);
  const [loading, setLoading] = useState(false);
  const [imobiliarias, setImobiliarias] = useState<{ id: string, nome: string }[]>([]);
  const [showGestaoLeads, setShowGestaoLeads] = useState(false);
  const { userData } = useAuth();

  // Buscar usuários pendentes
  useEffect(() => {
    if (showAprovacao) {
      fetchUsuariosPendentes();
      fetchImobiliarias();
    }
  }, [showAprovacao]);

  const fetchUsuariosPendentes = async () => {
    setLoading(true);
    try {
      let q;
      if (userData?.tipoConta === 'imobiliaria') {
        // Imobiliária só vê corretores vinculados a ela
        q = query(
          collection(db, 'usuarios'),
          where('imobiliariaId', '==', userData.imobiliariaId),
          where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo']),
          where('aprovado', '==', false)
        );
      } else {
        // Admin vê todos pendentes
        q = query(
          collection(db, 'usuarios'),
          where('aprovado', '==', false),
          orderBy('criadoEm', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      const usuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UsuarioPendente[];
      setUsuariosPendentes(usuarios);
    } catch (error) {
      console.error('Erro ao buscar usuários pendentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchImobiliarias = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'imobiliarias'));
      setImobiliarias(snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome })));
    } catch (error) {
      console.error('Erro ao buscar imobiliárias:', error);
    }
  };

  const aprovarUsuario = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'usuarios', userId), {
        aprovado: true,
        aprovadoEm: new Date()
      });
      await fetchUsuariosPendentes(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao aprovar usuário:', error);
    }
  };

  const rejeitarUsuario = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'usuarios', userId), {
        aprovado: false,
        rejeitadoEm: new Date(),
        rejeitado: true
      });
      await fetchUsuariosPendentes(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao rejeitar usuário:', error);
    }
  };

  const getNomeImobiliaria = (imobiliariaId?: string) => {
    if (!imobiliariaId) return 'N/A';
    const imobiliaria = imobiliarias.find(i => i.id === imobiliariaId);
    return imobiliaria ? imobiliaria.nome : 'Imobiliária não encontrada';
  };

  const getTipoContaLabel = (tipo: string) => {
    switch (tipo) {
      case 'imobiliaria': return 'Imobiliária';
      case 'corretor-vinculado': return 'Corretor Vinculado';
      case 'corretor-autonomo': return 'Corretor Autônomo';
      default: return tipo;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Área do Administrador</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Gerencie recursos avançados da sua imobiliária.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {adminCards.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex flex-col items-center justify-center bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-8 transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] group cursor-pointer"
              tabIndex={0}
              onClick={e => item.special ? (e.preventDefault(), setShowAprovacao(true)) : null}
            >
              <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-xl font-bold text-[#3478F6] dark:text-[#A3C8F7] mb-2 text-center">{item.title}</span>
              <span className="text-sm text-[#6B6F76] dark:text-gray-300 text-center">{item.description}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Modal Aprovação de Usuários */}
      {showAprovacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-lg w-full max-w-6xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button className="absolute top-4 right-4 text-2xl text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6]" onClick={() => setShowAprovacao(false)}>&times;</button>
            <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-6">Aprovação de Usuários</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3478F6]"></div>
              </div>
            ) : usuariosPendentes.length === 0 ? (
              <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
                <p className="text-lg">Nenhum usuário pendente de aprovação.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {usuariosPendentes.map((usuario) => (
                  <div key={usuario.id} className="bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg p-4 border border-[#E8E9F1] dark:border-[#23283A]">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-[#2E2F38] dark:text-white">{usuario.nome}</h3>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">{usuario.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => aprovarUsuario(usuario.id)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => rejeitarUsuario(usuario.id)}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Rejeitar
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-[#6B6F76] dark:text-gray-300">Tipo:</span>
                        <p className="font-medium text-[#2E2F38] dark:text-white">{getTipoContaLabel(usuario.tipoConta)}</p>
                      </div>
                      <div>
                        <span className="text-[#6B6F76] dark:text-gray-300">Imobiliária:</span>
                        <p className="font-medium text-[#2E2F38] dark:text-white">{getNomeImobiliaria(usuario.imobiliariaId)}</p>
                      </div>
                      <div>
                        <span className="text-[#6B6F76] dark:text-gray-300">Cadastro:</span>
                        <p className="font-medium text-[#2E2F38] dark:text-white">{usuario.metodoCadastro === 'google' ? 'Google' : 'E-mail'}</p>
                      </div>
                      <div>
                        <span className="text-[#6B6F76] dark:text-gray-300">Data:</span>
                        <p className="font-medium text-[#2E2F38] dark:text-white">
                          {usuario.criadoEm?.toDate ? usuario.criadoEm.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Financeiro */}
      {showFinanceiro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-lg w-full max-w-3xl p-6 relative animate-fade-in">
            <button className="absolute top-4 right-4 text-2xl text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6]" onClick={() => setShowFinanceiro(false)}>&times;</button>
            <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-6">Financeiro</h2>
            {/* Abas do Financeiro */}
            <div className="flex gap-2 border-b border-[#E8E9F1] dark:border-[#23283A] mb-6 overflow-x-auto">
              {financeiroTabs.map((tab) => (
                <div key={tab.label} className="relative">
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors duration-150 ${activeTab === tab.label ? 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#3478F6]' : 'text-[#6B6F76] dark:text-gray-300 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23]'}`}
                    onClick={() => {
                      setActiveTab(tab.label);
                      setOpenDropdown(null);
                    }}
                    onMouseEnter={() => tab.dropdown && setOpenDropdown(tab.label)}
                    onMouseLeave={() => tab.dropdown && setOpenDropdown(null)}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.dropdown && <span className="ml-1">▼</span>}
                  </button>
                  {/* Dropdown */}
                  {tab.dropdown && openDropdown === tab.label && (
                    <div className="absolute left-0 top-full mt-1 bg-white dark:bg-[#23283A] shadow-lg rounded-lg py-2 min-w-[120px] z-10">
                      {tab.dropdown.map((item) => (
                        <button
                          key={item}
                          className="block w-full text-left px-4 py-2 text-[#2E2F38] dark:text-white hover:bg-[#F5F6FA] dark:hover:bg-[#181C23]"
                          onClick={() => {
                            setActiveTab(item);
                            setOpenDropdown(null);
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Conteúdo da aba selecionada (mock) */}
            <div className="min-h-[200px] flex items-center justify-center text-[#6B6F76] dark:text-gray-300 text-lg">
              <span>Conteúdo: <b>{activeTab}</b> (mock)</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestão de Leads dos Corretores */}
      {showGestaoLeads && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-lg w-full max-w-6xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button className="absolute top-4 right-4 text-2xl text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6]" onClick={() => setShowGestaoLeads(false)}>&times;</button>
            <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-6">Gestão de Leads dos Corretores</h2>
            {/* Filtros por etapa, seleção de leads, botão transferir e apagar - estrutura inicial */}
            <div className="mb-4 flex flex-col md:flex-row md:items-center gap-4">
              <label className="font-medium text-[#6B6F76] dark:text-gray-300">Filtrar por etapa:</label>
              <select className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white">
                <option value="">Todas</option>
                <option value="Pré-qualificação">Pré-qualificação</option>
                <option value="Qualificação">Qualificação</option>
                <option value="Proposta">Proposta</option>
                <option value="Geladeira">Geladeira</option>
                {/* Adicione outras etapas conforme necessário */}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Aqui será renderizada a lista de corretores e seus leads, com seleção e botões de ação */}
              <div className="bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl p-4 border border-[#E8E9F1] dark:border-[#23283A]">
                <p className="text-[#6B6F76] dark:text-gray-300">(Exemplo) Corretor: João Silva</p>
                <ul className="mt-2 space-y-2">
                  <li className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span className="flex-1 text-[#2E2F38] dark:text-white">Lead: Maria Souza (Pré-qualificação)</span>
                    <button className="text-red-500 hover:text-red-700 text-xs">Apagar</button>
                  </li>
                  {/* Repita para outros leads */}
                </ul>
              </div>
              {/* Repita para outros corretores */}
            </div>
            <div className="mt-6 flex gap-4 justify-end">
              <select className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white">
                <option value="">Selecione corretor de destino</option>
                {/* Listar corretores */}
              </select>
              <button className="px-6 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors">Transferir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 