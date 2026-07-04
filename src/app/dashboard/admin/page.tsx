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

// Componente para título com barra colorida (padrão do sistema)
const SectionTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white relative z-10">{children}</h2>
    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-r-full opacity-60"></div>
  </div>
);

// Categorias organizadas para melhor UX
const adminCategories = [
  {
    title: 'Equipe',
    description: 'Corretores, acessos e leads',
    icon: '👥',
    color: 'from-primary-400 to-primary-600',
    items: [
      { title: 'Gestão de Corretores', icon: '🧑‍💼', description: 'Administre leads e desempenho dos corretores', href: '/dashboard/admin/gestao-corretores' },
      { title: 'Agenda dos Usuários', icon: '📅', description: 'Visualize a agenda de todos os usuários', href: '/dashboard/admin/agenda-usuarios' },
      { title: 'Importar Leads', icon: '⬆️', description: 'Importe leads em massa', href: '/dashboard/admin/importar-leads' },
    ]
  },
  {
    title: 'Imobiliária',
    description: 'Rotina, captações e conteúdo',
    icon: '🏢',
    color: 'from-green-500 to-green-600',
    items: [
      { title: 'Agenda Imobiliária', icon: '📆', description: 'Gerencie agenda e plantões da imobiliária', href: '/dashboard/admin/agenda-imobiliaria' },
      { title: 'Materiais Construtora', icon: '🏗️', description: 'Materiais das construtoras', href: '/dashboard/admin/materiais-construtora' },
      { title: 'Ligação Ativa (roteiro)', icon: '📞', description: 'Edite o mapa mental da ligação ativa: mensagens, passos e botões', href: '/dashboard/admin/ligacao-ativa' },
      { title: 'Academia', icon: '🎓', description: 'Materiais educacionais', href: '/dashboard/admin/treinamentos' },
    ]
  },
  {
    title: 'Financeiro e Metas',
    description: 'Comissões, caixa e objetivos',
    icon: '💰',
    color: 'from-purple-500 to-purple-600',
    items: [
      { title: 'Comissões', icon: '💵', description: 'Imposto, meta, política de comissão e lançamento de vendas por equipe', href: '/dashboard/admin/comissoes' },
      { title: 'Metas', icon: '🎯', description: 'Meta da imobiliária e soma das metas dos corretores', href: '/dashboard/admin/metas' },
      { title: 'Dashboards TV', icon: '📺', description: 'Telas para TV da imobiliária', href: '/dashboard/admin/dashboards-tv' },
    ]
  },
  {
    title: 'Configurações',
    description: 'Estrutura do CRM',
    icon: '⚙️',
    color: 'from-orange-500 to-orange-600',
    items: [
      { title: 'Funil de Vendas', icon: '📊', description: 'Adicionar, editar ou remover etapas do funil (CRM)', href: '/dashboard/admin/funil-vendas' },
    ]
  }
];

export default function AdminPage() {
  const [showAprovacao, setShowAprovacao] = useState(false);
  const [usuariosPendentes, setUsuariosPendentes] = useState<UsuarioPendente[]>([]);
  const [loading, setLoading] = useState(false);
  const [imobiliarias, setImobiliarias] = useState<{ id: string, nome: string }[]>([]);
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
        q = query(
          collection(db, 'usuarios'),
          where('imobiliariaId', '==', userData.imobiliariaId),
          where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo']),
          where('aprovado', '==', false)
        );
      } else {
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
      await fetchUsuariosPendentes();
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
      await fetchUsuariosPendentes();
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
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4A017] mb-1.5">Painel de controle</p>
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white">Área do Administrador</h1>
          <p className="text-[#6B6F76] dark:text-gray-300 mt-1">Tudo da sua imobiliária, organizado por setor.</p>
        </div>

        {/* Setores */}
        <div className="space-y-9">
          {adminCategories.map((category) => (
            <section key={category.title}>
              {/* Cabeçalho do setor */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center text-xl shadow-lg shrink-0`}>
                  {category.icon}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white leading-tight">{category.title}</h2>
                  <p className="text-xs text-[#6B6F76] dark:text-gray-400">{category.description}</p>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-[#E8E9F1] dark:from-white/10 to-transparent ml-1" />
                <span className="shrink-0 text-[11px] font-semibold text-[#9aa0a6] px-2 py-1 rounded-full bg-[#F0F1F5] dark:bg-white/[0.04]">{category.items.length}</span>
              </div>

              {/* Itens do setor */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {category.items.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group relative flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-white/[0.06] hover:border-[#D4A017]/60 dark:hover:border-[#D4A017]/45 hover:shadow-[0_10px_30px_-8px_rgba(212,160,23,0.30)] hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-[#F8F9FB] dark:bg-white/[0.04] group-hover:bg-[#D4A017]/12 flex items-center justify-center text-2xl transition-colors">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#2E2F38] dark:text-white group-hover:text-[#D4A017] transition-colors truncate">{item.title}</h3>
                      <p className="text-xs text-[#6B6F76] dark:text-gray-400 mt-0.5 line-clamp-2 leading-snug">{item.description}</p>
                    </div>
                    <span className="shrink-0 text-[#c9ccd4] dark:text-gray-500 group-hover:text-[#D4A017] group-hover:translate-x-0.5 transition-all">→</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

      {/* Modal Aprovação de Usuários */}
      {showAprovacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-lg w-full max-w-4xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
              <button 
                className="absolute top-4 right-4 text-2xl text-[#6B6F76] dark:text-gray-300 hover:text-[#D4A017] transition-colors" 
                onClick={() => setShowAprovacao(false)}
              >
                ×
              </button>
              
              <div className="mb-6">
                <SectionTitle>Aprovação de Usuários</SectionTitle>
              </div>
            
            {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4A017]"></div>
              </div>
            ) : usuariosPendentes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-lg text-[#6B6F76] dark:text-gray-300">Nenhum usuário pendente de aprovação</p>
                  <p className="text-sm text-[#6B6F76] dark:text-gray-400 mt-2">Todos os cadastros foram processados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {usuariosPendentes.map((usuario) => (
                    <div key={usuario.id} className="bg-[#F8F9FB] dark:bg-[#181C23] rounded-xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#D4A017] to-[#E8C547] rounded-full flex items-center justify-center text-white font-semibold">
                            {usuario.nome.charAt(0).toUpperCase()}
                          </div>
                      <div>
                            <h3 className="font-semibold text-[#2E2F38] dark:text-white text-lg">{usuario.nome}</h3>
                            <p className="text-[#6B6F76] dark:text-gray-300">{usuario.email}</p>
                          </div>
                      </div>
                        <div className="flex gap-3">
                        <button
                          onClick={() => aprovarUsuario(usuario.id)}
                            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <span>✓</span>
                          Aprovar
                        </button>
                        <button
                          onClick={() => rejeitarUsuario(usuario.id)}
                            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <span>✕</span>
                          Rejeitar
                        </button>
                      </div>
                    </div>
                      
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-white dark:bg-[#23283A] p-3 rounded-lg">
                          <span className="text-[#6B6F76] dark:text-gray-300 text-xs uppercase tracking-wide">Tipo</span>
                          <p className="font-medium text-[#2E2F38] dark:text-white mt-1">{getTipoContaLabel(usuario.tipoConta)}</p>
                      </div>
                        <div className="bg-white dark:bg-[#23283A] p-3 rounded-lg">
                          <span className="text-[#6B6F76] dark:text-gray-300 text-xs uppercase tracking-wide">Imobiliária</span>
                          <p className="font-medium text-[#2E2F38] dark:text-white mt-1">{getNomeImobiliaria(usuario.imobiliariaId)}</p>
                      </div>
                        <div className="bg-white dark:bg-[#23283A] p-3 rounded-lg">
                          <span className="text-[#6B6F76] dark:text-gray-300 text-xs uppercase tracking-wide">Cadastro</span>
                          <p className="font-medium text-[#2E2F38] dark:text-white mt-1">{usuario.metodoCadastro === 'google' ? 'Google' : 'E-mail'}</p>
                      </div>
                        <div className="bg-white dark:bg-[#23283A] p-3 rounded-lg">
                          <span className="text-[#6B6F76] dark:text-gray-300 text-xs uppercase tracking-wide">Data</span>
                          <p className="font-medium text-[#2E2F38] dark:text-white mt-1">
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
        </div>
    </div>
  );
} 