'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const materiais = [
  {
    id: 1,
    titulo: 'Entendendo o Funil de Vendas',
    tipo: 'video',
    duracao: '22:15',
    descricao: 'Conceitos fundamentais sobre o funil de vendas e suas etapas.',
    thumbnail: '🔄',
    url: '#',
    tags: ['Básico', 'Obrigatório'],
    visualizacoes: 312,
    avaliacao: 4.9
  },
  {
    id: 2,
    titulo: 'Qualificação de Leads',
    tipo: 'video',
    duracao: '18:30',
    descricao: 'Como identificar e qualificar leads de qualidade para o funil.',
    thumbnail: '🎯',
    url: '#',
    tags: ['Intermediário'],
    visualizacoes: 267,
    avaliacao: 4.8
  },
  {
    id: 3,
    titulo: 'Prospecção Eficiente',
    tipo: 'video',
    duracao: '25:45',
    descricao: 'Técnicas avançadas de prospecção para captar mais leads.',
    thumbnail: '🔍',
    url: '#',
    tags: ['Avançado'],
    visualizacoes: 198,
    avaliacao: 4.7
  },
  {
    id: 4,
    titulo: 'Primeiro Contato - Scripts',
    tipo: 'pdf',
    tamanho: '1.8 MB',
    descricao: 'Scripts e roteiros para o primeiro contato com leads.',
    thumbnail: '📞',
    url: '#',
    tags: ['Prático'],
    downloads: 156,
    avaliacao: 4.6
  },
  {
    id: 5,
    titulo: 'Apresentação de Imóveis',
    tipo: 'video',
    duracao: '20:10',
    descricao: 'Como fazer apresentações impactantes que convertem.',
    thumbnail: '🏠',
    url: '#',
    tags: ['Intermediário'],
    visualizacoes: 234,
    avaliacao: 4.8
  },
  {
    id: 6,
    titulo: 'Objeções e Contrarrespostas',
    tipo: 'video',
    duracao: '28:20',
    descricao: 'Como lidar com as principais objeções dos clientes.',
    thumbnail: '💬',
    url: '#',
    tags: ['Avançado'],
    visualizacoes: 189,
    avaliacao: 4.9
  },
  {
    id: 7,
    titulo: 'Fechamento de Vendas',
    tipo: 'video',
    duracao: '15:45',
    descricao: 'Técnicas para fechar vendas de forma eficaz.',
    thumbnail: '✅',
    url: '#',
    tags: ['Avançado'],
    visualizacoes: 145,
    avaliacao: 4.7
  },
  {
    id: 8,
    titulo: 'Pós-Venda e Fidelização',
    tipo: 'video',
    duracao: '12:30',
    descricao: 'Como manter clientes satisfeitos e gerar indicações.',
    thumbnail: '🤝',
    url: '#',
    tags: ['Intermediário'],
    visualizacoes: 123,
    avaliacao: 4.5
  },
  {
    id: 9,
    titulo: 'Métricas do Funil',
    tipo: 'pdf',
    tamanho: '2.1 MB',
    descricao: 'Como medir e otimizar cada etapa do funil de vendas.',
    thumbnail: '📊',
    url: '#',
    tags: ['Avançado'],
    downloads: 89,
    avaliacao: 4.4
  },
  {
    id: 10,
    titulo: 'Ferramentas de Automação',
    tipo: 'link',
    descricao: 'Recursos e ferramentas para automatizar o funil de vendas.',
    thumbnail: '⚙️',
    url: '#',
    tags: ['Tecnologia'],
    acessos: 78,
    avaliacao: 4.3
  }
];

export default function FunilVendasPage() {
  const [filterTipo, setFilterTipo] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const materiaisFiltrados = materiais.filter(material => {
    const matchTipo = filterTipo === 'todos' || material.tipo === filterTipo;
    const matchSearch = material.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       material.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTipo && matchSearch;
  });

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'video': return 'Vídeo';
      case 'pdf': return 'PDF';
      case 'link': return 'Link';
      default: return 'Arquivo';
    }
  };

  return (
    <div className="min-h-full py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <Link 
              href="/dashboard/treinamentos"
              className="text-text-secondary hover:text-[#FF7A97] transition-colors"
            >
              ← Voltar aos Treinamentos
            </Link>
          </div>
        </div>

        {/* Título e Descrição */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="al-display text-2xl font-bold text-white uppercase tracking-[0.14em]">Funil de Vendas</h1>
          </div>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Entenda o processo de vendas e como conduzir leads desde a prospecção até o fechamento.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="al-card relative overflow-hidden p-6 text-center"><div className="absolute inset-x-0 top-0 gx-line" />
            <p className="text-3xl mb-2">🎥</p>
            <p className="text-2xl font-bold text-white">{materiais.filter(m => m.tipo === 'video').length}</p>
            <p className="text-sm text-text-secondary">Vídeos</p>
          </div>
          <div className="al-card relative overflow-hidden p-6 text-center"><div className="absolute inset-x-0 top-0 gx-line" />
            <p className="text-3xl mb-2">📄</p>
            <p className="text-2xl font-bold text-white">{materiais.filter(m => m.tipo === 'pdf').length}</p>
            <p className="text-sm text-text-secondary">PDFs</p>
          </div>
          <div className="al-card relative overflow-hidden p-6 text-center"><div className="absolute inset-x-0 top-0 gx-line" />
            <p className="text-3xl mb-2">🔗</p>
            <p className="text-2xl font-bold text-white">{materiais.filter(m => m.tipo === 'link').length}</p>
            <p className="text-sm text-text-secondary">Links</p>
          </div>
          <div className="al-card relative overflow-hidden p-6 text-center"><div className="absolute inset-x-0 top-0 gx-line" />
            <p className="text-3xl mb-2">⭐</p>
            <p className="text-2xl font-bold text-white">4.7</p>
            <p className="text-sm text-text-secondary">Avaliação Média</p>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="al-card relative overflow-hidden p-6 mb-8"><div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar materiais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTipo('todos')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'todos' 
                    ? 'bg-[#FF1E56] border border-transparent text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                    : 'bg-white/[0.04] border border-white/10 text-text-secondary hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterTipo('video')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'video' 
                    ? 'bg-[#FF1E56] border border-transparent text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                    : 'bg-white/[0.04] border border-white/10 text-text-secondary hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                🎥 Vídeos
              </button>
              <button
                onClick={() => setFilterTipo('pdf')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'pdf' 
                    ? 'bg-[#FF1E56] border border-transparent text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                    : 'bg-white/[0.04] border border-white/10 text-text-secondary hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                📄 PDFs
              </button>
              <button
                onClick={() => setFilterTipo('link')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'link' 
                    ? 'bg-[#FF1E56] border border-transparent text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                    : 'bg-white/[0.04] border border-white/10 text-text-secondary hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                🔗 Links
              </button>
            </div>
          </div>
        </div>

        {/* Grid de Materiais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materiaisFiltrados.map((material) => (
            <div key={material.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-[#E8C547]/40 hover:-translate-y-0.5 transition-all duration-200 group">
              {/* Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-[#E8C547]/25 to-[#12101a] flex items-center justify-center">
                <span className="text-6xl">{material.thumbnail}</span>
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-white text-sm font-medium">{getTipoLabel(material.tipo)}</span>
                </div>
                {material.tipo === 'video' && (
                  <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-white text-sm font-medium">⏱️ {material.duracao}</span>
                  </div>
                )}
                {material.tipo === 'pdf' && (
                  <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-white text-sm font-medium">📏 {material.tamanho}</span>
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#FFE9A6] transition-colors">
                  {material.titulo}
                </h3>
                <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                  {material.descricao}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {material.tags.map((tag, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        tag === 'Obrigatório'
                          ? 'bg-[#FF1E56]/10 border border-[#FF1E56]/35 text-[#FF7A97]'
                          : tag === 'Básico'
                          ? 'bg-[#34D399]/10 border border-[#34D399]/35 text-emerald-300'
                          : tag === 'Intermediário'
                          ? 'bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6]'
                          : tag === 'Avançado'
                          ? 'bg-[#9F6BFF]/10 border border-[#9F6BFF]/35 text-[#C4A6FF]'
                          : tag === 'Prático'
                          ? 'bg-[#34D399]/10 border border-[#34D399]/35 text-emerald-300'
                          : 'bg-white/[0.06] border border-white/20 text-text-secondary'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-text-secondary mb-4">
                  <div className="flex items-center gap-4">
                    {material.tipo === 'video' && (
                      <span>👁️ {material.visualizacoes} visualizações</span>
                    )}
                    {material.tipo === 'pdf' && (
                      <span>⬇️ {material.downloads} downloads</span>
                    )}
                    {material.tipo === 'link' && (
                      <span>🔗 {material.acessos} acessos</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span>⭐</span>
                    <span>{material.avaliacao}</span>
                  </div>
                </div>

                {/* Botão de Ação */}
                <button className="w-full bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white py-3 px-4 rounded-xl font-bold shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
                  {material.tipo === 'video' && '▶️ Assistir'}
                  {material.tipo === 'pdf' && '📄 Baixar'}
                  {material.tipo === 'link' && '🔗 Acessar'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem quando não há resultados */}
        {materiaisFiltrados.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🔍</span>
            <h3 className="text-xl font-bold text-white mb-2">Nenhum material encontrado</h3>
            <p className="text-text-secondary">Tente ajustar os filtros ou termos de busca.</p>
          </div>
        )}
      </div>
    </div>
  );
} 