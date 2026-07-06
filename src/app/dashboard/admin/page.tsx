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

// Componente para título de seção (padrão GX)
const SectionTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] relative z-10">{children}</h2>
  </div>
);

// Paleta GX rotativa para os tiles de atalho
const gxTilePalette = [
  { b: 'border-[#FF1E56]/35 hover:border-[#FF1E56]/70', bg: 'bg-[#FF1E56]/[0.05] hover:bg-[#FF1E56]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(255,30,86,0.5)]', chip: 'from-[#FF1E56]/25 to-[#FF1E56]/[0.03] border-[#FF1E56]/30', accent: 'text-[#FF7A97]' },
  { b: 'border-[#E8C547]/35 hover:border-[#E8C547]/70', bg: 'bg-[#E8C547]/[0.05] hover:bg-[#E8C547]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(232,197,71,0.45)]', chip: 'from-[#E8C547]/25 to-[#E8C547]/[0.03] border-[#E8C547]/40', accent: 'text-[#FFE9A6]' },
  { b: 'border-[#34D399]/35 hover:border-[#34D399]/70', bg: 'bg-[#34D399]/[0.05] hover:bg-[#34D399]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(52,211,153,0.45)]', chip: 'from-[#34D399]/25 to-[#34D399]/[0.03] border-[#34D399]/30', accent: 'text-emerald-300' },
  { b: 'border-[#9F6BFF]/35 hover:border-[#9F6BFF]/70', bg: 'bg-[#9F6BFF]/[0.05] hover:bg-[#9F6BFF]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(159,107,255,0.45)]', chip: 'from-[#9F6BFF]/25 to-[#9F6BFF]/[0.03] border-[#9F6BFF]/30', accent: 'text-[#C4A6FF]' },
  { b: 'border-[#7DD3FC]/35 hover:border-[#7DD3FC]/70', bg: 'bg-[#7DD3FC]/[0.05] hover:bg-[#7DD3FC]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(125,211,252,0.45)]', chip: 'from-[#7DD3FC]/25 to-[#7DD3FC]/[0.03] border-[#7DD3FC]/30', accent: 'text-[#7DD3FC]' },
];

// Categorias organizadas para melhor UX
const adminCategories = [
  {
    title: 'Equipe',
    description: 'Corretores, acessos e leads',
    icon: '👥',
    color: 'from-[#FF1E56]/25 to-[#FF1E56]/[0.03] border-[#FF1E56]/30',
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
    color: 'from-[#34D399]/25 to-[#34D399]/[0.03] border-[#34D399]/30',
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
    color: 'from-[#E8C547]/25 to-[#E8C547]/[0.03] border-[#E8C547]/40',
    items: [
      { title: 'Comissões', icon: '💵', description: 'Imposto, meta, política de comissão e lançamento de vendas por equipe', href: '/dashboard/admin/comissoes' },
      { title: 'Metas', icon: '🎯', description: 'Meta da imobiliária e soma das metas dos corretores', href: '/dashboard/admin/metas' },
      { title: 'Meets & Visitas', icon: '🔥', description: 'Período contado, contadores por corretor e histórico do pódio da home', href: '/dashboard/admin/meets-visitas' },
      { title: 'Dashboards TV', icon: '📺', description: 'Telas para TV da imobiliária', href: '/dashboard/admin/dashboards-tv' },
    ]
  },
  {
    title: 'Configurações',
    description: 'Estrutura do CRM',
    icon: '⚙️',
    color: 'from-[#9F6BFF]/25 to-[#9F6BFF]/[0.03] border-[#9F6BFF]/30',
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
          <span className="gx-tag mb-2 inline-flex"><span>Painel de controle</span></span>
          <h1 className="al-display text-3xl font-bold text-white uppercase tracking-wide">Área do Administrador</h1>
          <p className="text-text-secondary mt-1">Tudo da sua imobiliária, organizado por setor.</p>
        </div>

        {/* Setores */}
        <div className="space-y-9">
          {adminCategories.map((category, ci) => (
            <section key={category.title}>
              {/* Cabeçalho do setor */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br border ${category.color} flex items-center justify-center text-xl shrink-0`}>
                  {category.icon}
                </div>
                <div className="min-w-0">
                  <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] leading-tight">{category.title}</h2>
                  <p className="text-xs text-text-secondary">{category.description}</p>
                </div>
                <div className="flex-1 gx-line opacity-30 ml-1" />
                <span className="shrink-0 text-[11px] font-semibold text-text-secondary tabular-nums px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">{category.items.length}</span>
              </div>

              {/* Itens do setor */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {category.items.map((item, ii) => {
                  const gx = gxTilePalette[(ci + ii) % gxTilePalette.length];
                  return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={`group relative overflow-hidden flex items-center gap-3.5 p-4 rounded-2xl border ${gx.b} ${gx.bg} ${gx.glow} hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200`}
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
                    <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br border ${gx.chip} flex items-center justify-center text-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white transition-colors truncate">{item.title}</h3>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2 leading-snug">{item.description}</p>
                    </div>
                    <span className={`shrink-0 ${gx.accent} opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`}>→</span>
                  </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

      {/* Modal Aprovação de Usuários */}
      {showAprovacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] w-full max-w-4xl p-6 relative overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <button
                className="absolute top-4 right-4 text-2xl text-text-secondary hover:text-[#FF5C7E] transition-colors"
                onClick={() => setShowAprovacao(false)}
              >
                ×
              </button>
              
              <div className="mb-6">
                <SectionTitle>Aprovação de Usuários</SectionTitle>
              </div>
            
            {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF1E56]"></div>
              </div>
            ) : usuariosPendentes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-lg text-text-secondary">Nenhum usuário pendente de aprovação</p>
                  <p className="text-sm text-text-secondary mt-2">Todos os cadastros foram processados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {usuariosPendentes.map((usuario) => (
                    <div key={usuario.id} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#FF1E56] to-[#A50D38] rounded-full flex items-center justify-center text-white font-semibold shadow-[0_0_16px_rgba(255,30,86,0.35)]">
                            {usuario.nome.charAt(0).toUpperCase()}
                          </div>
                      <div>
                            <h3 className="font-semibold text-white text-lg">{usuario.nome}</h3>
                            <p className="text-text-secondary">{usuario.email}</p>
                          </div>
                      </div>
                        <div className="flex gap-3">
                        <button
                          onClick={() => aprovarUsuario(usuario.id)}
                            className="px-6 py-2 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-xl font-medium transition-colors flex items-center gap-2"
                        >
                            <span>✓</span>
                          Aprovar
                        </button>
                        <button
                          onClick={() => rejeitarUsuario(usuario.id)}
                            className="px-6 py-2 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl font-medium transition-colors flex items-center gap-2"
                        >
                            <span>✕</span>
                          Rejeitar
                        </button>
                      </div>
                    </div>
                      
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-white/[0.03] border border-white/[0.08] p-3 rounded-lg">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Tipo</span>
                          <p className="font-medium text-white mt-1">{getTipoContaLabel(usuario.tipoConta)}</p>
                      </div>
                        <div className="bg-white/[0.03] border border-white/[0.08] p-3 rounded-lg">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Imobiliária</span>
                          <p className="font-medium text-white mt-1">{getNomeImobiliaria(usuario.imobiliariaId)}</p>
                      </div>
                        <div className="bg-white/[0.03] border border-white/[0.08] p-3 rounded-lg">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Cadastro</span>
                          <p className="font-medium text-white mt-1">{usuario.metodoCadastro === 'google' ? 'Google' : 'E-mail'}</p>
                      </div>
                        <div className="bg-white/[0.03] border border-white/[0.08] p-3 rounded-lg">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Data</span>
                          <p className="font-medium text-white mt-1">
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