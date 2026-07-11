'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface Treinamento {
  id: string;
  categorias: string[]; // Mudança para array de categorias
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
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>(['vendas']); // Mudança para array
  const [formTreinamento, setFormTreinamento] = useState({
    categorias: ['vendas'] as string[], // Mudança para array
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
    { key: 'gestão', label: 'Gestão', icon: '👔' },
    { key: 'autoral', label: 'Autoral', icon: '✍️' },
  ];

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchTreinamentos();
  }, [userData, selectedCategorias]);

  const fetchTreinamentos = async () => {
    setLoading(true);
    try {
      // Buscar todos os treinamentos da imobiliária
      const q = query(
        collection(db, 'treinamentos'),
        where('imobiliariaId', '==', userData?.imobiliariaId)
      );
      const snap = await getDocs(q);
      const treinamentosData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          categorias: data.categorias || [data.categoria], // Suporte para dados antigos
          titulo: data.titulo,
          descricao: data.descricao,
          tipo: data.tipo,
          url: data.url,
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date(data.criadoEm)
        } as Treinamento;
      });
      
      // Filtrar por categorias selecionadas
      const filteredData = treinamentosData.filter(treinamento => 
        selectedCategorias.some(cat => treinamento.categorias.includes(cat))
      );
      
      filteredData.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      setTreinamentos(filteredData);
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

  const handleCategoriaToggle = (categoriaKey: string) => {
    setSelectedCategorias(prev => {
      if (prev.includes(categoriaKey)) {
        return prev.filter(cat => cat !== categoriaKey);
      } else {
        return [...prev, categoriaKey];
      }
    });
  };

  const handleFormCategoriaToggle = (categoriaKey: string) => {
    setFormTreinamento(prev => {
      const newCategorias = prev.categorias.includes(categoriaKey)
        ? prev.categorias.filter(cat => cat !== categoriaKey)
        : [...prev.categorias, categoriaKey];
      
      return { ...prev, categorias: newCategorias };
    });
  };

  const resetForm = () => {
    setFormTreinamento({
      categorias: ['vendas'],
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

    if (formTreinamento.categorias.length === 0) {
      setMsg('Por favor, selecione pelo menos uma categoria.');
      return;
    }
    
    setUploading(true);
    setMsg(null);
    try {
      const treinamento = {
        categorias: formTreinamento.categorias,
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
      categorias: treinamento.categorias,
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

    if (formTreinamento.categorias.length === 0) {
      setMsg('Por favor, selecione pelo menos uma categoria.');
      return;
    }
    
    setUploading(true);
    setMsg(null);
    try {
      await updateDoc(doc(db, 'treinamentos', editingTreinamento.id), {
        categorias: formTreinamento.categorias,
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
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mb-2">Gestão de Treinamentos</h1>
          <p className="text-text-secondary text-sm">Adicione e gerencie treinamentos para sua equipe</p>
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`p-4 rounded-xl border mb-6 text-sm font-semibold ${msg.includes('Erro') ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-[#34D399]/10 border-[#34D399]/35 text-emerald-200'}`}>
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário */}
          <div className="al-card relative overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-6 flex items-center gap-2">
              <PlayIcon className="h-5 w-5 text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)]" />
              {editingTreinamento ? 'Editar Treinamento' : 'Novo Treinamento'}
            </h2>
            
            <form onSubmit={editingTreinamento ? handleUpdateTreinamento : handleAddTreinamento} className="space-y-4">
              {/* Categorias */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Categorias</label>
                <div className="flex flex-wrap gap-2">
                  {categorias.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleFormCategoriaToggle(cat.key)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        formTreinamento.categorias.includes(cat.key)
                          ? 'bg-[#FF1E56]/15 border border-[#FF3364]/50 text-[#FF9EB5]'
                          : 'bg-white/[0.04] border border-white/10 text-text-secondary hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
                {formTreinamento.categorias.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">Selecione pelo menos uma categoria</p>
                )}
              </div>

              {/* Link do YouTube */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Link do YouTube</label>
                <input
                  type="url"
                  value={formTreinamento.url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  required
                />
                {fetchingYoutube && (
                  <p className="text-sm text-[#FF7A97] mt-1">Buscando informações do vídeo...</p>
                )}
              </div>

              {/* Preview do YouTube */}
              {youtubeInfo && (
                <div className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={youtubeInfo.thumbnail}
                      alt="Thumbnail"
                      className="w-16 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {youtubeInfo.title}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Título original do YouTube
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Título</label>
                <input
                  type="text"
                  value={formTreinamento.titulo}
                  onChange={(e) => setFormTreinamento({ ...formTreinamento, titulo: e.target.value })}
                  placeholder="Título do treinamento"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Descrição (opcional)</label>
                <textarea
                  value={formTreinamento.descricao}
                  onChange={(e) => setFormTreinamento({ ...formTreinamento, descricao: e.target.value })}
                  placeholder="Descrição do treinamento..."
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold py-2 px-4 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {uploading ? 'Salvando...' : (editingTreinamento ? 'Atualizar' : 'Adicionar')}
                </button>
                {editingTreinamento && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de Treinamentos */}
          <div className="al-card relative overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="mb-6">
              <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Treinamentos</h2>
              
              {/* Filtro de Categoria */}
              <div className="flex flex-wrap gap-2">
                {categorias.map((categoria) => (
                  <button
                    key={categoria.key}
                    onClick={() => handleCategoriaToggle(categoria.key)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedCategorias.includes(categoria.key)
                        ? 'bg-[#FF1E56]/15 border border-[#FF3364]/50 text-[#FF9EB5]'
                        : 'bg-white/[0.04] border border-white/10 text-text-secondary hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{categoria.icon}</span>
                    <span>{categoria.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-text-secondary">Carregando...</div>
            ) : treinamentos.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                Nenhum treinamento encontrado
              </div>
            ) : (
              <div className="space-y-4">
                {treinamentos.map((treinamento) => (
                  <div
                    key={treinamento.id}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] transition-colors"
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
                        <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">
                          {treinamento.titulo}
                        </h3>
                        {treinamento.descricao && (
                          <p className="text-xs text-text-secondary mb-2 line-clamp-2">
                            {treinamento.descricao}
                          </p>
                        )}
                        
                        {/* Categorias do treinamento */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {treinamento.categorias.map((cat) => {
                            const categoria = categorias.find(c => c.key === cat);
                            return categoria ? (
                              <span
                                key={cat}
                                className="inline-flex items-center px-2 py-0.5 bg-[#9F6BFF]/10 border border-[#9F6BFF]/35 text-[#C4A6FF] text-[10px] font-extrabold uppercase tracking-wider rounded-full"
                              >
                                {categoria.icon} {categoria.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-secondary">
                            {treinamento.criadoEm.toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditTreinamento(treinamento)}
                              className="p-1 text-[#FF7A97] hover:bg-[#FF1E56]/10 rounded transition-colors"
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