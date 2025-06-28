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
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <Link 
              href="/dashboard/treinamentos"
              className="text-[#3478F6] hover:text-[#2E6FD9] transition-colors"
            >
              ← Voltar aos Treinamentos
            </Link>
          </div>
        </div>

        {/* Título e Descrição */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-5xl">🔄</span>
            <h1 className="text-4xl font-bold text-[#2E2F38] dark:text-white">Funil de Vendas</h1>
          </div>
          <p className="text-xl text-[#6B6F76] dark:text-gray-300 max-w-3xl mx-auto">
            Entenda o processo de vendas e como conduzir leads desde a prospecção até o fechamento.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <p className="text-3xl mb-2">🎥</p>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{materiais.filter(m => m.tipo === 'video').length}</p>
            <p className="text-sm text-[#6B6F76] dark:text-gray-300">Vídeos</p>
          </div>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <p className="text-3xl mb-2">📄</p>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{materiais.filter(m => m.tipo === 'pdf').length}</p>
            <p className="text-sm text-[#6B6F76] dark:text-gray-300">PDFs</p>
          </div>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <p className="text-3xl mb-2">🔗</p>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{materiais.filter(m => m.tipo === 'link').length}</p>
            <p className="text-sm text-[#6B6F76] dark:text-gray-300">Links</p>
          </div>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <p className="text-3xl mb-2">⭐</p>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">4.7</p>
            <p className="text-sm text-[#6B6F76] dark:text-gray-300">Avaliação Média</p>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar materiais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3478F6] transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTipo('todos')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'todos' 
                    ? 'bg-[#3478F6] text-white' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38]'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterTipo('video')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'video' 
                    ? 'bg-[#3478F6] text-white' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38]'
                }`}
              >
                🎥 Vídeos
              </button>
              <button
                onClick={() => setFilterTipo('pdf')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'pdf' 
                    ? 'bg-[#3478F6] text-white' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38]'
                }`}
              >
                📄 PDFs
              </button>
              <button
                onClick={() => setFilterTipo('link')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'link' 
                    ? 'bg-[#3478F6] text-white' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38]'
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
            <div key={material.id} className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden hover:shadow-lg transition-all duration-200 group">
              {/* Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] flex items-center justify-center">
                <span className="text-6xl">{material.thumbnail}</span>
                <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-white text-sm font-medium">{getTipoLabel(material.tipo)}</span>
                </div>
                {material.tipo === 'video' && (
                  <div className="absolute bottom-4 left-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-white text-sm font-medium">⏱️ {material.duracao}</span>
                  </div>
                )}
                {material.tipo === 'pdf' && (
                  <div className="absolute bottom-4 left-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-white text-sm font-medium">📏 {material.tamanho}</span>
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-2 group-hover:text-[#FF6B6B] transition-colors">
                  {material.titulo}
                </h3>
                <p className="text-[#6B6F76] dark:text-gray-300 text-sm mb-4 line-clamp-2">
                  {material.descricao}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {material.tags.map((tag, index) => (
                    <span
                      key={index}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        tag === 'Obrigatório' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : tag === 'Básico'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : tag === 'Intermediário'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : tag === 'Avançado'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : tag === 'Prático'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-[#6B6F76] dark:text-gray-300 mb-4">
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
                <button className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white py-3 px-4 rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2">
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
            <h3 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-2">Nenhum material encontrado</h3>
            <p className="text-[#6B6F76] dark:text-gray-300">Tente ajustar os filtros ou termos de busca.</p>
          </div>
        )}
      </div>
    </div>
  );
} 