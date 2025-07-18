'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Treinamento {
  id: string;
  categoria: 'audiobooks' | 'vendas' | 'mercado' | 'institucional' | 'técnicas' | 'motivacional' | 'gestão';
  titulo: string;
  descricao: string;
  tipo: 'video' | 'pdf';
  url: string;
  criadoEm: Date;
}

const categorias = [
  { key: 'todos', label: 'Todos', icon: '🎬', color: 'bg-gray-500' },
  { key: 'vendas', label: 'Vendas', icon: '📈', color: 'bg-blue-500' },
  { key: 'técnicas', label: 'Técnicas', icon: '🛠️', color: 'bg-green-500' },
  { key: 'mercado', label: 'Mercado', icon: '🏢', color: 'bg-purple-500' },
  { key: 'motivacional', label: 'Motivacional', icon: '💪', color: 'bg-orange-500' },
  { key: 'gestão', label: 'Gestão', icon: '👔', color: 'bg-indigo-500' },
  { key: 'institucional', label: 'Institucional', icon: '🏛️', color: 'bg-red-500' },
  { key: 'audiobooks', label: 'Áudio Books', icon: '📚', color: 'bg-teal-500' },
];

export default function TreinamentosPage() {
  const { userData } = useAuth();
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchTreinamentos();
  }, [userData]);

  const fetchTreinamentos = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'treinamentos'),
        where('imobiliariaId', '==', userData?.imobiliariaId)
      );
      const snap = await getDocs(q);
      const treinamentosData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          categoria: data.categoria,
          titulo: data.titulo,
          descricao: data.descricao,
          tipo: data.tipo,
          url: data.url,
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date(data.criadoEm)
        } as Treinamento;
      });
      treinamentosData.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      setTreinamentos(treinamentosData);
    } catch (err) {
      console.error('Erro ao carregar treinamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : undefined;
  };

  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined;
  };

  const filteredTreinamentos = treinamentos.filter(treinamento => {
    const matchesSearch = treinamento.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         treinamento.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || treinamento.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleVideoClick = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Treinamentos</h1>
          <p className="text-[#6B6F76] dark:text-gray-300">Capacite-se com nossos treinamentos exclusivos</p>
        </div>

        {/* Barra de Busca */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar treinamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6B6F76] dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filtros Rápidos */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            {categorias.map((categoria) => (
              <button
                key={categoria.key}
                onClick={() => setSelectedCategory(categoria.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === categoria.key
                    ? `${categoria.color} text-white shadow-lg`
                    : 'bg-white dark:bg-[#23283A] text-[#6B6F76] dark:text-gray-300 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A]'
                }`}
              >
                <span>{categoria.icon}</span>
                <span>{categoria.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Vídeos */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6] mx-auto mb-4"></div>
            <p className="text-[#6B6F76] dark:text-gray-300">Carregando treinamentos...</p>
          </div>
        ) : filteredTreinamentos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-2">Nenhum treinamento encontrado</h3>
            <p className="text-[#6B6F76] dark:text-gray-300">
              {searchTerm || selectedCategory !== 'todos' 
                ? 'Tente ajustar sua busca ou filtros'
                : 'Aguarde o administrador adicionar treinamentos'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTreinamentos.map((treinamento) => (
              <div
                key={treinamento.id}
                className="bg-white dark:bg-[#23283A] rounded-xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => handleVideoClick(treinamento.url)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  {treinamento.tipo === 'video' && getYouTubeThumbnail(treinamento.url) ? (
                    <img
                      src={getYouTubeThumbnail(treinamento.url)}
                      alt={treinamento.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-4xl">📄</div>
                    </div>
                  )}
                  
                  {/* Overlay com ícone de play */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-6 h-6 text-[#3478F6] ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Badge de categoria */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                      categorias.find(c => c.key === treinamento.categoria)?.color || 'bg-gray-500'
                    }`}>
                      {categorias.find(c => c.key === treinamento.categoria)?.label}
                    </span>
                  </div>
                </div>

                {/* Informações do vídeo */}
                <div className="p-4">
                  <h3 className="font-bold text-[#2E2F38] dark:text-white text-sm mb-2 line-clamp-2 group-hover:text-[#3478F6] transition-colors">
                    {treinamento.titulo}
                  </h3>
                  {treinamento.descricao && (
                    <p className="text-xs text-[#6B6F76] dark:text-gray-300 line-clamp-2 mb-2">
                      {treinamento.descricao}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-[#6B6F76] dark:text-gray-400">
                    <span>{treinamento.tipo === 'video' ? '🎥 Vídeo' : '📄 PDF'}</span>
                    <span>{treinamento.criadoEm.toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 