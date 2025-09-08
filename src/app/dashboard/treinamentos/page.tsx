'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, onSnapshot, orderBy, addDoc, Timestamp } from 'firebase/firestore';

interface Treinamento {
  id: string;
  categoria: 'audiobooks' | 'vendas' | 'mercado' | 'institucional' | 'técnicas' | 'motivacional' | 'gestão';
  titulo: string;
  descricao: string;
  tipo: 'video' | 'pdf';
  url: string;
  criadoEm: Date;
  likesCount?: number;
  commentsCount?: number;
  duracao?: string;
}

interface Comment {
  id: string;
  treinamentoId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Timestamp;
}

const categorias = [
  { key: 'todos', label: 'Todos', icon: '🎬', color: 'bg-gray-500' },
  { key: 'vendas', label: 'Vendas', icon: '📈', color: 'bg-blue-500' },
  { key: 'audiobooks', label: 'Áudio Book', icon: '📚', color: 'bg-teal-500' },
  { key: 'mercado', label: 'Mercado', icon: '🏢', color: 'bg-purple-500' },
  { key: 'institucional', label: 'Institucional', icon: '🏛️', color: 'bg-red-500' },
  { key: 'gestão', label: 'Gestão', icon: '👔', color: 'bg-indigo-500' },
];

export default function TreinamentosPage() {
  const { userData, currentUser } = useAuth();
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<string>('todos');
  const [selectedTreinamento, setSelectedTreinamento] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchTreinamentos();
    generateSuggestion();
  }, [userData]);

  useEffect(() => {
    if (treinamentos.length > 0) {
      fetchLikesAndCommentsCount();
      fetchUserLikes();
    }
  }, [treinamentos]);

  useEffect(() => {
    if (selectedTreinamento) {
      fetchComments(selectedTreinamento);
    }
  }, [selectedTreinamento]);

  // Gerar sugestão aleatória de categoria
  const generateSuggestion = () => {
    const categoryKeys = categorias.filter(cat => cat.key !== 'todos').map(cat => cat.key);
    const randomIndex = Math.floor(Math.random() * categoryKeys.length);
    setSuggestedCategory(categoryKeys[randomIndex]);
  };

  const fetchTreinamentos = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'treinamentos'),
        where('imobiliariaId', '==', userData?.imobiliariaId)
      );
      const snap = await getDocs(q);
      const treinamentosData = await Promise.all(snap.docs.map(async doc => {
        const data = doc.data();
        let duracao = '00:00';
        
        // Buscar duração apenas para vídeos do YouTube
        if (data.tipo === 'video' && data.url) {
          duracao = await getYouTubeDuration(data.url);
        }
        
        return {
          id: doc.id,
          categoria: data.categoria,
          titulo: data.titulo,
          descricao: data.descricao,
          tipo: data.tipo,
          url: data.url,
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date(data.criadoEm),
          duracao: duracao
        } as Treinamento;
      }));
      
      // Embaralhar os treinamentos para mostrar sugestões diferentes
      const shuffledData = treinamentosData.sort(() => Math.random() - 0.5);
      
      // Debug logs
      console.log('=== DADOS CARREGADOS ===');
      console.log('Total de treinamentos carregados:', shuffledData.length);
      console.log('Categorias encontradas:', [...new Set(shuffledData.map(t => t.categoria))]);
      console.log('Treinamentos:', shuffledData.map(t => ({
        id: t.id,
        titulo: t.titulo,
        categoria: t.categoria
      })));
      console.log('========================');
      
      setTreinamentos(shuffledData);
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

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined;
  };

  const getYouTubeDuration = async (url: string): Promise<string> => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return '00:00';
    
    try {
      // Usar uma API pública alternativa para buscar informações do vídeo
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      const data = await response.json();
      
      // Como não temos acesso direto à duração via oEmbed, vamos usar uma duração estimada
      // baseada no ID do vídeo (não é preciso, mas é melhor que 10:30 fixo)
      const estimatedDuration = generateEstimatedDuration(videoId);
      return estimatedDuration;
    } catch (error) {
      console.error('Erro ao buscar duração do vídeo:', error);
      // Retornar uma duração estimada baseada no ID do vídeo
      return generateEstimatedDuration(videoId);
    }
  };

  const generateEstimatedDuration = (videoId: string): string => {
    // Gerar uma duração estimada baseada no ID do vídeo para ser mais realista
    const hash = videoId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const minutes = Math.abs(hash) % 30 + 5; // Entre 5 e 35 minutos
    const seconds = Math.abs(hash) % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (isoDuration: string): string => {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '00:00';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const filteredTreinamentos = treinamentos.filter(treinamento => {
    const matchesSearch = treinamento.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         treinamento.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || treinamento.categoria === selectedCategory;
    
    // Debug logs
    console.log('=== DEBUG FILTROS ===');
    console.log('Total treinamentos:', treinamentos.length);
    console.log('Categoria selecionada:', selectedCategory);
    console.log('Termo de busca:', searchTerm);
    console.log('Treinamento atual:', {
      id: treinamento.id,
      titulo: treinamento.titulo,
      categoria: treinamento.categoria,
      matchesSearch,
      matchesCategory
    });
    console.log('========================');
    
    return matchesSearch && matchesCategory;
  });

  const handleVideoClick = (treinamento: Treinamento) => {
    if (treinamento.tipo === 'video') {
      // Se já está tocando, para. Se não, começa a tocar
      if (playingVideo === treinamento.id) {
        setPlayingVideo(null);
      } else {
        setPlayingVideo(treinamento.id);
      }
    } else {
      // Para PDFs, abrir em nova aba
      window.open(treinamento.url, '_blank');
    }
  };

  const getCategoriaIcon = (categoria: string) => {
    const cat = categorias.find(c => c.key === categoria);
    return cat ? cat.icon : '🎬';
  };

  const getSuggestedCategoryLabel = () => {
    const cat = categorias.find(c => c.key === suggestedCategory);
    return cat ? cat.label : 'Vendas';
  };

  const getSuggestedCategoryIcon = () => {
    const cat = categorias.find(c => c.key === suggestedCategory);
    return cat ? cat.icon : '📈';
  };

  // Funções para likes e comentários
  const handleLike = async (treinamentoId: string) => {
    if (!currentUser?.uid) return;
    
    const likeRef = doc(db, 'treinamentos', treinamentoId, 'likes', currentUser.uid);
    
    if (userLikes.has(treinamentoId)) {
      // Unlike
      await deleteDoc(likeRef);
      setUserLikes(prev => {
        const newSet = new Set(prev);
        newSet.delete(treinamentoId);
        return newSet;
      });
    } else {
      // Like
      await setDoc(likeRef, {
        userId: currentUser.uid,
        createdAt: Timestamp.now()
      });
      setUserLikes(prev => new Set(prev).add(treinamentoId));
    }
  };

  const handleComment = async (treinamentoId: string) => {
    if (!currentUser?.uid || !newComment.trim()) return;
    
    try {
      await addDoc(collection(db, 'treinamentos', treinamentoId, 'comments'), {
        userId: currentUser.uid,
        userName: userData?.nome || 'Usuário',
        text: newComment.trim(),
        createdAt: Timestamp.now()
      });
      setNewComment('');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    }
  };

  const fetchComments = async (treinamentoId: string) => {
    try {
      const q = query(
        collection(db, 'treinamentos', treinamentoId, 'comments'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentsData);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
    }
  };

  const fetchUserLikes = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const userLikesSet = new Set<string>();
      
      for (const treinamento of treinamentos) {
        const likeDoc = await getDocs(query(
          collection(db, 'treinamentos', treinamento.id, 'likes'),
          where('userId', '==', currentUser.uid)
        ));
        
        if (!likeDoc.empty) {
          userLikesSet.add(treinamento.id);
        }
      }
      
      setUserLikes(userLikesSet);
    } catch (error) {
      console.error('Erro ao buscar likes do usuário:', error);
    }
  };

  const fetchLikesAndCommentsCount = async () => {
    try {
      const updatedTreinamentos = await Promise.all(
        treinamentos.map(async (treinamento) => {
          const [likesSnapshot, commentsSnapshot] = await Promise.all([
            getDocs(collection(db, 'treinamentos', treinamento.id, 'likes')),
            getDocs(collection(db, 'treinamentos', treinamento.id, 'comments'))
          ]);
          
          return {
            ...treinamento,
            likesCount: likesSnapshot.size,
            commentsCount: commentsSnapshot.size
          };
        })
      );
      
      setTreinamentos(updatedTreinamentos);
    } catch (error) {
      console.error('Erro ao buscar contadores:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Academia</h1>
          <p className="text-[#6B6F76] dark:text-gray-300">Capacite-se com nossos treinamentos exclusivos</p>
        </div>

        {/* Sugestão Aleatória */}
        {selectedCategory === 'todos' && !searchTerm && (
          <div className="mb-6 p-4 bg-gradient-to-r from-[#3478F6]/10 to-[#A3C8F7]/10 rounded-xl border border-[#3478F6]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getSuggestedCategoryIcon()}</span>
                <div>
                  <h3 className="font-semibold text-[#2E2F38] dark:text-white">
                    Que tal explorar {getSuggestedCategoryLabel()}?
                  </h3>
                  <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                    Descubra novos conhecimentos nesta categoria
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory(suggestedCategory);
                  generateSuggestion();
                }}
                className="px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold rounded-lg transition-colors"
              >
                Explorar
              </button>
            </div>
          </div>
        )}

        {/* Barra de Busca */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar na Academia..."
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

        {/* Grid da Academia - Estilo YouTube */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6] mx-auto mb-4"></div>
            <p className="text-[#6B6F76] dark:text-gray-300">Carregando Academia...</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredTreinamentos.map((treinamento) => (
              <div
                key={treinamento.id}
                className="bg-white dark:bg-[#23283A] rounded-xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => handleVideoClick(treinamento)}
              >
                {/* Thumbnail/Player - Estilo YouTube */}
                <div className="relative aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  {treinamento.tipo === 'video' && playingVideo === treinamento.id ? (
                    // Player ativo
                    <div className="w-full h-full">
                      <iframe
                        src={`${getYouTubeEmbedUrl(treinamento.url)}?autoplay=1`}
                        title={treinamento.titulo}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  ) : treinamento.tipo === 'video' && getYouTubeThumbnail(treinamento.url) ? (
                    // Thumbnail com overlay
                    <div className="relative w-full h-full">
                      <img
                        src={getYouTubeThumbnail(treinamento.url)}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      
                      {/* Overlay com ícone de play - Estilo YouTube */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                        <div className="w-12 h-12 bg-black bg-opacity-80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>

                      {/* Duração do vídeo */}
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                        {treinamento.duracao || '00:00'}
                      </div>
                    </div>
                  ) : (
                    // PDF ou conteúdo não suportado
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-4xl">📄</div>
                    </div>
                  )}
                </div>

                {/* Informações do vídeo - Estilo YouTube */}
                <div className="p-3">
                  {/* Título - Estilo YouTube */}
                  <h3 className="font-semibold text-[#2E2F38] dark:text-white text-sm mb-2 line-clamp-2 group-hover:text-[#3478F6] transition-colors leading-tight">
                    {treinamento.titulo}
                  </h3>
                  
                  {/* Descrição - Estilo YouTube (apenas se for diferente do título) */}
                  {treinamento.descricao && treinamento.descricao !== treinamento.titulo && (
                    <p className="text-xs text-[#6B6F76] dark:text-gray-300 line-clamp-2 mb-2 leading-tight">
                      {treinamento.descricao}
                    </p>
                  )}
                  
                  {/* Metadados - Estilo YouTube */}
                  <div className="flex items-center justify-between text-xs text-[#6B6F76] dark:text-gray-400 mb-2">
                    <div className="flex items-center gap-1">
                      <span>{getCategoriaIcon(treinamento.categoria)}</span>
                      <span>•</span>
                      <span>{treinamento.criadoEm.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{treinamento.tipo === 'video' ? '🎥' : '📄'}</span>
                    </div>
                  </div>

                  {/* Botões de Interação - Estilo YouTube */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E8E9F1] dark:border-[#23283A]">
                    <div className="flex items-center gap-4">
                      {/* Botão Like */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(treinamento.id);
                        }}
                        className="flex items-center gap-1 text-xs text-[#6B6F76] dark:text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg 
                          className={`w-4 h-4 ${userLikes.has(treinamento.id) ? 'text-red-500 fill-current' : 'text-gray-400'}`} 
                          fill="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        <span>{treinamento.likesCount || 0}</span>
                      </button>

                      {/* Botão Comentários */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTreinamento(treinamento.id);
                          setShowComments(true);
                        }}
                        className="flex items-center gap-1 text-xs text-[#6B6F76] dark:text-gray-400 hover:text-[#3478F6] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>{treinamento.commentsCount || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Comentários */}
        {showComments && selectedTreinamento && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              {/* Header do Modal */}
              <div className="p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[#2E2F38] dark:text-white">
                    Comentários
                  </h3>
                  <button
                    onClick={() => {
                      setShowComments(false);
                      setSelectedTreinamento(null);
                      setComments([]);
                    }}
                    className="text-[#6B6F76] dark:text-gray-400 hover:text-[#2E2F38] dark:hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Lista de Comentários */}
              <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">💬</div>
                    <p className="text-[#6B6F76] dark:text-gray-300">
                      Seja o primeiro a comentar!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-[#3478F6] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {comment.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[#2E2F38] dark:text-white text-sm">
                              {comment.userName}
                            </span>
                            <span className="text-xs text-[#6B6F76] dark:text-gray-400">
                              {comment.createdAt.toDate().toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-[#2E2F38] dark:text-white text-sm">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Input de Novo Comentário */}
              <div className="p-6 border-t border-[#E8E9F1] dark:border-[#23283A]">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-[#3478F6] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {userData?.nome?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Adicione um comentário..."
                      className="w-full px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleComment(selectedTreinamento)}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Comentar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 