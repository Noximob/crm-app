'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface Treinamento {
  id: string;
  categoria: 'audiobooks' | 'vendas' | 'mercado' | 'institucional' | 'gestão';
  titulo: string;
  descricao: string;
  tipo: 'video';
  url: string;
  criadoEm: Date;
}

interface YouTubeVideoInfo {
  title: string;
  description: string;
  thumbnail: string;
}

const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

export default function TreinamentosAdminPage() {
  const { userData } = useAuth();
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingTreinamento, setEditingTreinamento] = useState<Treinamento | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<'audiobooks' | 'vendas' | 'mercado' | 'institucional' | 'gestão'>('vendas');
  const [formTreinamento, setFormTreinamento] = useState({
    categoria: 'vendas' as 'audiobooks' | 'vendas' | 'mercado' | 'institucional' | 'gestão',
    titulo: '',
    descricao: '',
    url: '',
  });
  const [youtubeInfo, setYoutubeInfo] = useState<YouTubeVideoInfo | null>(null);
  const [fetchingYoutube, setFetchingYoutube] = useState(false);

  const categorias = [
    { key: 'vendas', label: 'Vendas', icon: '📈' },
    { key: 'audiobooks', label: 'Áudio Book', icon: '📚' },
    { key: 'mercado', label: 'Mercado', icon: '🏢' },
    { key: 'institucional', label: 'Institucional', icon: '🏛️' },
    { key: 'gestão', label: 'Gestão', icon: '👔' }
  ];

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchTreinamentos();
  }, [userData, selectedCategoria]);

  const fetchTreinamentos = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'treinamentos'),
        where('imobiliariaId', '==', userData?.imobiliariaId),
        where('categoria', '==', selectedCategoria)
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
      setMsg('Erro ao carregar treinamentos.');
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

  const fetchYouTubeInfo = async (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;

    setFetchingYoutube(true);
    try {
      // Usar a API pública do YouTube para buscar informações do vídeo
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (response.ok) {
        const data = await response.json();
        return {
          title: data.title,
          description: data.title, // Usar o título como descrição por padrão
          thumbnail: getYouTubeThumbnail(url) || ''
        };
      }
    } catch (err) {
      console.error('Erro ao buscar informações do YouTube:', err);
    } finally {
      setFetchingYoutube(false);
    }
    return null;
  };

  const handleUrlChange = async (url: string) => {
    setFormTreinamento({ ...formTreinamento, url });
    
    if (url && getYouTubeVideoId(url)) {
      const info = await fetchYouTubeInfo(url);
      if (info) {
        setYoutubeInfo(info);
        setFormTreinamento({
          ...formTreinamento,
          url,
          titulo: info.title,
          descricao: info.description
        });
      }
    } else {
      setYoutubeInfo(null);
    }
  };

  const resetForm = () => {
    setFormTreinamento({
      categoria: selectedCategoria,
      titulo: '',
      descricao: '',
      url: '',
    });
    setYoutubeInfo(null);
    setEditingTreinamento(null);
  };

  const handleAddTreinamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTreinamento.titulo.trim() || !formTreinamento.url.trim()) {
      setMsg('Por favor, preencha o link do YouTube.');
      return;
    }
    
    if (!getYouTubeVideoId(formTreinamento.url)) {
      setMsg('Por favor, insira um link válido do YouTube.');
      return;
    }
    
    setUploading(true);
    setMsg(null);
    try {
      const treinamento = {
        categoria: formTreinamento.categoria,
        titulo: formTreinamento.titulo.trim(),
        descricao: formTreinamento.descricao.trim(),
        tipo: 'video' as const,
        url: formTreinamento.url.trim(),
        imobiliariaId: userData?.imobiliariaId,
        criadoEm: Timestamp.now(),
      };

      await addDoc(collection(db, 'treinamentos'), treinamento);
      resetForm();
      fetchTreinamentos();
      setMsg('Treinamento adicionado com sucesso!');
    } catch (err) {
      setMsg('Erro ao adicionar treinamento.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditTreinamento = (treinamento: Treinamento) => {
    setEditingTreinamento(treinamento);
    setFormTreinamento({
      categoria: treinamento.categoria,
      titulo: treinamento.titulo,
      descricao: treinamento.descricao,
      url: treinamento.url,
    });
    if (treinamento.url) {
      setYoutubeInfo({
        title: treinamento.titulo,
        description: treinamento.descricao,
        thumbnail: getYouTubeThumbnail(treinamento.url) || ''
      });
    }
  };

  const handleUpdateTreinamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreinamento || !formTreinamento.titulo.trim() || !formTreinamento.url.trim()) {
      setMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    if (!getYouTubeVideoId(formTreinamento.url)) {
      setMsg('Por favor, insira um link válido do YouTube.');
      return;
    }
    
    setUploading(true);
    setMsg(null);
    try {
      await updateDoc(doc(db, 'treinamentos', editingTreinamento.id), {
        categoria: formTreinamento.categoria,
        titulo: formTreinamento.titulo.trim(),
        descricao: formTreinamento.descricao.trim(),
        url: formTreinamento.url.trim(),
      });
      
      resetForm();
      fetchTreinamentos();
      setMsg('Treinamento atualizado com sucesso!');
    } catch (err) {
      setMsg('Erro ao atualizar treinamento.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTreinamento = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este treinamento?')) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'treinamentos', id));
      fetchTreinamentos();
      setMsg('Treinamento excluído com sucesso!');
    } catch (err) {
      setMsg('Erro ao excluir treinamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Gestão de Treinamentos</h1>
          <p className="text-[#6B6F76] dark:text-gray-300">Adicione e gerencie treinamentos para sua equipe</p>
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`p-4 rounded-lg mb-6 ${msg.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-6 flex items-center gap-2">
              <PlayIcon className="h-6 w-6 text-[#3478F6]" />
              {editingTreinamento ? 'Editar Treinamento' : 'Novo Treinamento'}
            </h2>
            
            <form onSubmit={editingTreinamento ? handleUpdateTreinamento : handleAddTreinamento} className="space-y-4">
              {/* Categoria */}
              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Categoria</label>
                <select
                  value={formTreinamento.categoria}
                  onChange={(e) => setFormTreinamento({ ...formTreinamento, categoria: e.target.value as any })}
                  className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  required
                >
                  {categorias.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Link do YouTube */}
              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Link do YouTube</label>
                <input
                  type="url"
                  value={formTreinamento.url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  required
                />
                {fetchingYoutube && (
                  <p className="text-sm text-[#3478F6] mt-1">Buscando informações do vídeo...</p>
                )}
              </div>

              {/* Preview do YouTube */}
              {youtubeInfo && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <img 
                      src={youtubeInfo.thumbnail} 
                      alt="Thumbnail" 
                      className="w-16 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#2E2F38] dark:text-white">
                        {youtubeInfo.title}
                      </p>
                      <p className="text-xs text-[#6B6F76] dark:text-gray-300">
                        Título original do YouTube
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Título</label>
                <input
                  type="text"
                  value={formTreinamento.titulo}
                  onChange={(e) => setFormTreinamento({ ...formTreinamento, titulo: e.target.value })}
                  placeholder="Título do treinamento"
                  className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Descrição (opcional)</label>
                <textarea
                  value={formTreinamento.descricao}
                  onChange={(e) => setFormTreinamento({ ...formTreinamento, descricao: e.target.value })}
                  placeholder="Descrição do treinamento..."
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Salvando...' : (editingTreinamento ? 'Atualizar' : 'Adicionar')}
                </button>
                {editingTreinamento && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de Treinamentos */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Treinamentos</h2>
              
              {/* Filtro de Categoria */}
              <div className="flex gap-2">
                {categorias.map((categoria) => (
                  <button
                    key={categoria.key}
                    onClick={() => setSelectedCategoria(categoria.key as any)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedCategoria === categoria.key
                        ? 'bg-[#3478F6] text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-[#6B6F76] dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{categoria.icon}</span>
                    <span>{categoria.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : treinamentos.length === 0 ? (
              <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
                Nenhum treinamento encontrado
              </div>
            ) : (
              <div className="space-y-4">
                {treinamentos.map((treinamento) => (
                  <div
                    key={treinamento.id}
                    className="p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <img
                          src={getYouTubeThumbnail(treinamento.url)}
                          alt={treinamento.titulo}
                          className="w-20 h-15 object-cover rounded"
                        />
                      </div>
                      
                      {/* Informações */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#2E2F38] dark:text-white text-sm mb-1 line-clamp-2">
                          {treinamento.titulo}
                        </h3>
                        {treinamento.descricao && (
                          <p className="text-xs text-[#6B6F76] dark:text-gray-300 mb-2 line-clamp-2">
                            {treinamento.descricao}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6B6F76] dark:text-gray-400">
                            {treinamento.criadoEm.toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditTreinamento(treinamento)}
                              className="p-1 text-[#3478F6] hover:bg-[#3478F6]/10 rounded transition-colors"
                            >
                              <EditIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTreinamento(treinamento.id)}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 