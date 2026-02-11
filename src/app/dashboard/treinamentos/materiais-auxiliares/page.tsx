'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const materiais = [
  {
    id: 1,
    titulo: 'Roteiro de Apresentação',
    tipo: 'pdf',
    tamanho: '1.5 MB',
    descricao: 'Roteiro completo para apresentação de imóveis com pontos-chave.',
    thumbnail: '📋',
    url: '#',
    tags: ['Roteiro', 'Obrigatório'],
    downloads: 567,
    avaliacao: 4.8
  },
  {
    id: 2,
    titulo: 'Scripts de Telefone',
    tipo: 'pdf',
    tamanho: '2.1 MB',
    descricao: 'Scripts prontos para diferentes situações de contato telefônico.',
    thumbnail: '📞',
    url: '#',
    tags: ['Script', 'Prático'],
    downloads: 423,
    avaliacao: 4.7
  },
  {
    id: 3,
    titulo: 'Apresentação Institucional',
    tipo: 'pdf',
    tamanho: '4.2 MB',
    descricao: 'Apresentação da imobiliária para usar em reuniões e eventos.',
    thumbnail: '🏢',
    url: '#',
    tags: ['Apresentação'],
    downloads: 234,
    avaliacao: 4.6
  },
  {
    id: 4,
    titulo: 'Checklist de Visita',
    tipo: 'pdf',
    tamanho: '0.8 MB',
    descricao: 'Checklist completo para não esquecer nada durante visitas.',
    thumbnail: '✅',
    url: '#',
    tags: ['Checklist', 'Prático'],
    downloads: 345,
    avaliacao: 4.9
  },
  {
    id: 5,
    titulo: 'Modelos de Contratos',
    tipo: 'pdf',
    tamanho: '3.5 MB',
    descricao: 'Modelos de contratos de locação e compra e venda.',
    thumbnail: '📄',
    url: '#',
    tags: ['Contrato', 'Legal'],
    downloads: 189,
    avaliacao: 4.5
  },
  {
    id: 6,
    titulo: 'Calculadora de Financiamento',
    tipo: 'link',
    descricao: 'Ferramenta online para calcular financiamentos imobiliários.',
    thumbnail: '🧮',
    url: '#',
    tags: ['Ferramenta'],
    acessos: 678,
    avaliacao: 4.8
  },
  {
    id: 7,
    titulo: 'Glossário Imobiliário',
    tipo: 'pdf',
    tamanho: '1.2 MB',
    descricao: 'Dicionário com termos técnicos do mercado imobiliário.',
    thumbnail: '📚',
    url: '#',
    tags: ['Referência'],
    downloads: 156,
    avaliacao: 4.4
  },
  {
    id: 8,
    titulo: 'Templates de E-mail',
    tipo: 'pdf',
    tamanho: '1.8 MB',
    descricao: 'Modelos de e-mails para diferentes situações com clientes.',
    thumbnail: '📧',
    url: '#',
    tags: ['Template', 'Comunicação'],
    downloads: 267,
    avaliacao: 4.6
  },
  {
    id: 9,
    titulo: 'Ficha de Qualificação',
    tipo: 'pdf',
    tamanho: '0.9 MB',
    descricao: 'Formulário para qualificar leads e entender necessidades.',
    thumbnail: '📝',
    url: '#',
    tags: ['Formulário', 'Prático'],
    downloads: 298,
    avaliacao: 4.7
  },
  {
    id: 10,
    titulo: 'Guia de Bairros',
    tipo: 'pdf',
    tamanho: '5.1 MB',
    descricao: 'Informações sobre bairros, infraestrutura e valores.',
    thumbnail: '🗺️',
    url: '#',
    tags: ['Referência'],
    downloads: 145,
    avaliacao: 4.5
  },
  {
    id: 11,
    titulo: 'Simulador de Comissão',
    tipo: 'link',
    descricao: 'Calculadora para simular comissões de diferentes tipos de venda.',
    thumbnail: '💰',
    url: '#',
    tags: ['Ferramenta'],
    acessos: 234,
    avaliacao: 4.6
  },
  {
    id: 12,
    titulo: 'Biblioteca de Fotos',
    tipo: 'link',
    descricao: 'Acesso a fotos profissionais de imóveis para usar em anúncios.',
    thumbnail: '📸',
    url: '#',
    tags: ['Recurso'],
    acessos: 189,
    avaliacao: 4.3
  },
  {
    id: 13,
    titulo: 'Manual de Compliance',
    tipo: 'pdf',
    tamanho: '2.7 MB',
    descricao: 'Manual com regras e procedimentos de compliance imobiliário.',
    thumbnail: '⚖️',
    url: '#',
    tags: ['Legal', 'Obrigatório'],
    downloads: 98,
    avaliacao: 4.4
  },
  {
    id: 14,
    titulo: 'Templates de Anúncios',
    tipo: 'pdf',
    tamanho: '2.3 MB',
    descricao: 'Modelos de anúncios para diferentes plataformas.',
    thumbnail: '📢',
    url: '#',
    tags: ['Marketing'],
    downloads: 176,
    avaliacao: 4.5
  }
];

export default function MateriaisAuxiliaresPage() {
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
              className="text-[#D4A017] hover:text-[#B8860B] transition-colors"
            >
              ← Voltar aos Treinamentos
            </Link>
          </div>
        </div>

        {/* Título e Descrição */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-5xl">🗂️</span>
            <h1 className="text-4xl font-bold text-[#2E2F38] dark:text-white">Materiais Auxiliares</h1>
          </div>
          <p className="text-xl text-[#6B6F76] dark:text-gray-300 max-w-3xl mx-auto">
            Acesse roteiros, scripts, apresentações e outros recursos de apoio para seu trabalho.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            <p className="text-3xl mb-2">⬇️</p>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{materiais.reduce((acc, m) => acc + (m.downloads || 0), 0)}</p>
            <p className="text-sm text-[#6B6F76] dark:text-gray-300">Downloads</p>
          </div>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
            <p className="text-3xl mb-2">⭐</p>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">4.6</p>
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
                className="w-full px-4 py-3 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D4A017] transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTipo('todos')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'todos' 
                    ? 'bg-[#D4A017] text-white' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38]'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterTipo('pdf')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'pdf' 
                    ? 'bg-[#D4A017] text-white' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-[#E8E9F1] dark:hover:bg-[#2E2F38]'
                }`}
              >
                📄 PDFs
              </button>
              <button
                onClick={() => setFilterTipo('link')}
                className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  filterTipo === 'link' 
                    ? 'bg-[#D4A017] text-white' 
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
              <div className="relative h-48 bg-gradient-to-br from-[#9C27B0] to-[#E91E63] flex items-center justify-center">
                <span className="text-6xl">{material.thumbnail}</span>
                <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-white text-sm font-medium">{getTipoLabel(material.tipo)}</span>
                </div>
                {material.tipo === 'pdf' && (
                  <div className="absolute bottom-4 left-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-white text-sm font-medium">📏 {material.tamanho}</span>
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-2 group-hover:text-[#9C27B0] transition-colors">
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
                          : tag === 'Prático'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : tag === 'Legal'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          : tag === 'Marketing'
                          ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                          : tag === 'Ferramenta'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          : tag === 'Referência'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
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
                <button className="w-full bg-[#9C27B0] hover:bg-[#7B1FA2] text-white py-3 px-4 rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2">
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