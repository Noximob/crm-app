"use client";

import React, { useEffect, useState, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  setDoc,
  getDocs, // ADICIONAR
  limit, // ADICIONAR
  startAfter // ADICIONAR
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const ActionIcon = ({ icon, label, onClick, active = false, danger = false }: { icon: React.ReactNode; label?: string; onClick?: () => void; active?: boolean; danger?: boolean }) => (
  <button
    className={`flex items-center gap-1 text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-[#E8E9F1] dark:hover:bg-[#23283A] ${danger ? 'text-[#F45B69] hover:bg-[#F45B69]/10' : active ? 'text-[#F45B69]' : 'text-[#6B6F76] dark:text-gray-300'}`}
    onClick={onClick}
    type="button"
  >
    {icon}
    {label && <span>{label}</span>}
  </button>
);

function gerarHandle(nome: string, email: string) {
  const handle = nome.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
  return `@${handle}`;
}

function gerarAvatar(userData: any, currentUser: any) {
  // Prioriza foto do Google, depois foto salva no Firestore, depois avatar de iniciais
  if (currentUser?.photoURL) {
    return currentUser.photoURL;
  }
  if (userData?.photoURL) {
    return userData.photoURL;
  }
  return `https://api.dicebear.com/7.x/initials/svg?seed=${userData?.nome || currentUser?.email?.[0] || "U"}`;
}

function Modal({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-w-2xl w-full mx-2 bg-white dark:bg-[#23283A] rounded-2xl shadow-xl p-0" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white text-2xl z-10 hover:text-[#F45B69]">✕</button>
        {children}
      </div>
    </div>
  );
}

export default function ComunidadePage() {
  const { currentUser, userData } = useAuth();
  const { resetNotification } = useNotifications();
  const [posts, setPosts] = useState<any[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [firstVisible, setFirstVisible] = useState<any>(null);
  const [pageStack, setPageStack] = useState<any[]>([]);
  const PAGE_SIZE = 10;
  const [novoPost, setNovoPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [gifFile, setGifFile] = useState<File | null>(null);
  const [gifPreview, setGifPreview] = useState<string | null>(null);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [youtubePreview, setYoutubePreview] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [modalPostId, setModalPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsMap, setCommentsMap] = useState<Record<string, number>>({});
  const [showEmojiComment, setShowEmojiComment] = useState(false);
  const emojiCommentRef = useRef<HTMLDivElement>(null);
  const [viewsMap, setViewsMap] = useState<Record<string, number>>({});
  const [repostsMap, setRepostsMap] = useState<Record<string, number>>({});
  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [repostTarget, setRepostTarget] = useState<any>(null);
  const [repostComment, setRepostComment] = useState("");
  const [repostLoading, setRepostLoading] = useState(false);
  const [repostWithComment, setRepostWithComment] = useState(false);
  const [showEmojiRepost, setShowEmojiRepost] = useState(false);
  const emojiRepostRef = useRef<HTMLDivElement>(null);
  const [originalAuthors, setOriginalAuthors] = useState<Record<string, { nome: string, handle: string }>>({});
  
  // Estados para eventos agendados
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    titulo: '',
    descricao: '',
    tipo: 'meet' as 'meet' | 'youtube' | 'instagram',
    link: '',
    data: '',
    hora: ''
  });
  const [eventLoading, setEventLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [orderByTrending, setOrderByTrending] = useState<'recent' | 'relevant'>('recent');
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  // Função para voltar ao topo
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Detectar scroll para mostrar/esconder botão
  useEffect(() => {
    const handleScroll = () => {
      // Simplificar: mostrar botão após 200px de scroll
      setShowScrollToTop(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Função para extrair ID do vídeo do YouTube (incluindo Shorts)
  const getYouTubeVideoId = (url: string) => {
    // Padrão para vídeos normais e Shorts
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : undefined;
  };

  // Função para detectar se é um Short do YouTube
  const isYouTubeShort = (url: string) => {
    return url.includes('/shorts/') || url.includes('youtube.com/shorts/');
  };

  // Função para gerar URL de embed do YouTube (otimizada para Shorts)
  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return undefined;
    
    // Para Shorts, usar parâmetros específicos para melhor experiência
    if (isYouTubeShort(url)) {
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&autoplay=0`;
    }
    
    // Para vídeos normais
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`;
  };

  // Função para gerar thumbnail do YouTube
  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined;
  };

  // Função para validar e processar link do YouTube
  const handleYoutubeLinkChange = (link: string) => {
    setYoutubeLink(link);
    
    if (link.trim()) {
      const videoId = getYouTubeVideoId(link);
      if (videoId) {
        setYoutubePreview({
          videoId,
          embedUrl: getYouTubeEmbedUrl(link),
          thumbnail: getYouTubeThumbnail(link),
          url: link,
          isShort: isYouTubeShort(link)
        });
      } else {
        setYoutubePreview(null);
      }
    } else {
      setYoutubePreview(null);
    }
  };

  // Buscar posts paginados
  const fetchPosts = async (direction: 'next' | 'prev' | 'first' = 'first') => {
    let q;
    if (direction === 'first') {
      q = query(
        collection(db, 'comunidadePosts'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
    } else if (direction === 'next' && lastVisible) {
      q = query(
        collection(db, 'comunidadePosts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
    } else if (direction === 'prev' && pageStack.length > 1) {
      const prev = pageStack[pageStack.length - 2];
      q = query(
        collection(db, 'comunidadePosts'),
        orderBy('createdAt', 'desc'),
        startAfter(prev),
        limit(PAGE_SIZE)
      );
    } else {
      return;
    }
    const snapshot = await getDocs(q);
    const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setPosts(postsData);
    setFirstVisible(snapshot.docs[0] || null);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
    if (direction === 'next') setPageStack(prev => [...prev, snapshot.docs[0]]);
    if (direction === 'first') setPageStack([snapshot.docs[0]]);
    if (direction === 'prev') setPageStack(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    fetchPosts('first');
  }, []);

  // Resetar notificação quando acessa a página da Comunidade
  useEffect(() => {
    if (currentUser && userData) {
      console.log('Página da Comunidade carregada - resetando notificação...');
      resetNotification('comunidade');
    }
  }, [currentUser, userData, resetNotification]);

  // Fechar emoji picker quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmoji(false);
      }
    };

    if (showEmoji) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmoji]);

  // Carregar comentários do post selecionado
  useEffect(() => {
    if (modalPostId) {
      const unsub = onSnapshot(
        collection(db, "comunidadePosts", modalPostId, "comments"),
        (snapshot) => {
          setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      );
      return () => unsub();
    }
  }, [modalPostId]);

  // Atualizar contador de comentários de todos os posts em tempo real
  useEffect(() => {
    const unsubscribes: any[] = [];
    posts.forEach((post) => {
      const unsub = onSnapshot(
        collection(db, "comunidadePosts", post.id, "comments"),
        (snapshot) => {
          setCommentsMap((prev) => ({ ...prev, [post.id]: snapshot.size }));
        }
      );
      unsubscribes.push(unsub);
    });
    return () => { unsubscribes.forEach((unsub) => unsub()); };
  }, [posts]);

  // Atualizar contador de visualizações e reposts de todos os posts em tempo real
  useEffect(() => {
    const unsubscribes: any[] = [];
    posts.forEach((post) => {
      // Visualizações
      const unsubViews = onSnapshot(
        collection(db, "comunidadePosts", post.id, "views"),
        (snapshot) => {
          setViewsMap((prev) => ({ ...prev, [post.id]: snapshot.size }));
        }
      );
      unsubscribes.push(unsubViews);
      // Reposts
      const unsubReposts = onSnapshot(
        collection(db, "comunidadePosts", post.id, "reposts"),
        (snapshot) => {
          setRepostsMap((prev) => ({ ...prev, [post.id]: snapshot.size }));
        }
      );
      unsubscribes.push(unsubReposts);
    });
    return () => { unsubscribes.forEach((unsub) => unsub()); };
  }, [posts]);

  // Calcular engajamento total para cada post
  const getTotalEngagement = (postId: string) => {
    const likes = posts.find(p => p.id === postId)?.likes || 0;
    const comments = commentsMap[postId] || 0;
    const reposts = repostsMap[postId] || 0;
    const views = viewsMap[postId] || 0;
    return likes + comments + reposts + views;
  };

  // Registrar visualização única ao abrir modal
  useEffect(() => {
    if (modalOpen && modalPostId && currentUser) {
      const viewRef = doc(db, "comunidadePosts", modalPostId, "views", currentUser.uid);
      setDoc(viewRef, { viewedAt: serverTimestamp() }, { merge: true });
    }
  }, [modalOpen, modalPostId, currentUser]);

  // Registrar visualização ao renderizar post (primeira vez)
  useEffect(() => {
    if (currentUser) {
      posts.forEach((post) => {
        const viewRef = doc(db, "comunidadePosts", post.id, "views", currentUser.uid);
        setDoc(viewRef, { viewedAt: serverTimestamp() }, { merge: true });
      });
    }
  }, [posts, currentUser]);

  // Buscar nome/handle do autor original dos reposts
  useEffect(() => {
    const fetchOriginalAuthors = async () => {
      const repostPosts = posts.filter(p => p.repostOf);
      const updates: Record<string, { nome: string, handle: string }> = {};
      for (const post of repostPosts) {
        if (post.repostOf && !originalAuthors[post.repostOf]) {
          const docRef = doc(db, "comunidadePosts", post.repostOf);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            updates[post.repostOf] = {
              nome: data.nome || 'Usuário',
              handle: gerarHandle(data.nome, data.email),
            };
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        setOriginalAuthors(prev => ({ ...prev, ...updates }));
      }
    };
    fetchOriginalAuthors();
    // eslint-disable-next-line
  }, [posts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      setFileType(file.type);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else if (file.type.startsWith('video/')) {
        setFilePreview(URL.createObjectURL(file));
      } else if (file.type === 'application/pdf') {
        setFilePreview('pdf');
      } else {
        setFilePreview(null);
      }
    }
  };

  const handlePostar = async () => {
    if (!currentUser) return;
    setLoading(true);
    let fileUrl = null;
    let fileMeta = null;
    if (file) {
      const fileName = `${Date.now()}_${file.name}`;
      let folder = 'outros';
      if (file.type.startsWith('image/')) folder = 'images';
      else if (file.type.startsWith('video/')) folder = 'videos';
      else if (file.type === 'application/pdf') folder = 'pdfs';
      const storageRef = ref(storage, `comunidade/${currentUser.uid}/${folder}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      fileUrl = await getDownloadURL(snapshot.ref);
      fileMeta = { name: file.name, type: file.type };
    }
    await addDoc(collection(db, "comunidadePosts"), {
      texto: novoPost,
      userId: currentUser.uid,
      nome: userData?.nome || currentUser.email?.split("@")[0] || "Usuário",
      email: currentUser.email || "",
      avatar: gerarAvatar(userData, currentUser),
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      comments: [],
      file: fileUrl,
      fileMeta,
      youtubeLink: youtubePreview ? youtubePreview.url : null,
      youtubeData: youtubePreview ? {
        videoId: youtubePreview.videoId,
        embedUrl: youtubePreview.embedUrl,
        thumbnail: youtubePreview.thumbnail
      } : null,
    });
    setNovoPost("");
    setFile(null);
    setFilePreview(null);
    setFileType(null);
    setYoutubeLink("");
    setYoutubePreview(null);
    setLoading(false);
    setShowEmoji(false);
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm("Tem certeza que deseja apagar este post?")) return;
    setDeletando(postId);
    await deleteDoc(doc(db, "comunidadePosts", postId));
    setDeletando(null);
  };

  const handleEmojiSelect = (emoji: any) => {
    setNovoPost((prev) => prev + emoji.native);
    setShowEmoji(false);
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    
    const postRef = doc(db, "comunidadePosts", postId);
    const post = posts.find(p => p.id === postId);
    
    if (!post) return;
    
    const isLiked = post.likedBy?.includes(currentUser.uid);
    
    if (isLiked) {
      // Descurtir
      await updateDoc(postRef, {
        likedBy: arrayRemove(currentUser.uid),
        likes: (post.likes || 0) - 1
      });
    } else {
      // Curtir
      await updateDoc(postRef, {
        likedBy: arrayUnion(currentUser.uid),
        likes: (post.likes || 0) + 1
      });
    }
  };

  const handleAddComment = async () => {
    if (!modalPostId || !currentUser || !newComment.trim()) return;
    await addDoc(collection(db, "comunidadePosts", modalPostId, "comments"), {
      texto: newComment,
      userId: currentUser.uid,
      nome: userData?.nome || currentUser.email?.split("@")[0] || "Usuário",
      avatar: gerarAvatar(userData, currentUser),
      createdAt: serverTimestamp(),
    });
    setNewComment("");
  };

  const handleRepost = (post: any) => {
    setRepostTarget(post);
    setRepostModalOpen(true);
  };

  const confirmRepost = async (withComment: boolean) => {
    if (!currentUser || !repostTarget) return;
    setRepostLoading(true);
    await addDoc(collection(db, "comunidadePosts"), {
      texto: withComment ? repostComment : repostTarget.texto,
      userId: currentUser.uid,
      nome: userData?.nome || currentUser.email?.split("@")[0] || "Usuário",
      email: currentUser.email || "",
      avatar: gerarAvatar(userData, currentUser),
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      comments: [],
      file: repostTarget.file,
      fileMeta: repostTarget.fileMeta,
      youtubeLink: repostTarget.youtubeLink || null,
      youtubeData: repostTarget.youtubeData || null,
      repostOf: repostTarget.id,
      repostComment: withComment ? repostComment : null,
    });
    await setDoc(doc(db, "comunidadePosts", repostTarget.id, "reposts", currentUser.uid), {
      repostedAt: serverTimestamp(),
    });
    setRepostModalOpen(false);
    setRepostTarget(null);
    setRepostComment("");
    setRepostLoading(false);
  };

  // Funções para eventos agendados
  const handleCreateEvent = async () => {
    if (!currentUser || !userData || !eventForm.titulo || !eventForm.link || !eventForm.data || !eventForm.hora) return;
    
    setEventLoading(true);
    try {
      const eventDateTime = new Date(`${eventForm.data}T${eventForm.hora}`);
      
      const eventData = {
        texto: eventForm.descricao,
        titulo: eventForm.titulo,
        tipo: 'evento',
        eventoTipo: eventForm.tipo,
        eventoLink: eventForm.link,
        eventoData: eventDateTime,
        eventoStatus: 'agendado', // agendado, acontecendo, finalizado
        userId: currentUser.uid,
        nome: userData.nome,
        handle: gerarHandle(userData.nome, userData.email),
        avatar: gerarAvatar(userData, currentUser),
        imobiliariaId: userData.imobiliariaId,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        comments: [],
        views: 0,
        reposts: 0,
        isEvento: true,
      };
      
      await addDoc(collection(db, "comunidadePosts"), eventData);
      
      setShowEventModal(false);
      setEventForm({
        titulo: '',
        descricao: '',
        tipo: 'meet',
        link: '',
        data: '',
        hora: ''
      });
      resetNotification('comunidade');
    } catch (err) {
      console.error('Erro ao criar evento:', err);
    } finally {
      setEventLoading(false);
    }
  };

  const getEventStatus = (eventoData: any) => {
    const now = new Date();
    const eventTime = eventoData instanceof Date ? eventoData : eventoData.toDate();
    const diffHours = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return 'finalizado';
    if (diffHours <= 1) return 'acontecendo';
    return 'agendado';
  };

  const getEventIcon = (tipo: string) => {
    switch (tipo) {
      case 'meet': return '🎥';
      case 'youtube': return '📺';
      case 'instagram': return '📱';
      default: return '📅';
    }
  };

  const getEventColor = (tipo: string) => {
    switch (tipo) {
      case 'meet': return 'bg-blue-500';
      case 'youtube': return 'bg-red-500';
      case 'instagram': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const sortedPosts = [...posts].sort((a, b) => {
    // Priorizar eventos agendados no topo
    const aIsEvent = a.isEvento && a.eventoStatus === 'agendado';
    const bIsEvent = b.isEvento && b.eventoStatus === 'agendado';
    
    if (aIsEvent && !bIsEvent) return -1;
    if (!aIsEvent && bIsEvent) return 1;
    
    // Se ambos são eventos, ordenar por data do evento
    if (aIsEvent && bIsEvent) {
      const aEventTime = a.eventoData instanceof Date ? a.eventoData : a.eventoData.toDate();
      const bEventTime = b.eventoData instanceof Date ? b.eventoData : b.eventoData.toDate();
      return aEventTime.getTime() - bEventTime.getTime();
    }
    
    // Para posts normais, usar a lógica existente
    if (orderByTrending === 'recent') {
      return b.createdAt?.toDate() - a.createdAt?.toDate();
    } else {
      // No Top Trending, eventos agendados sempre ficam no topo
      if (aIsEvent && !bIsEvent) return -1;
      if (!aIsEvent && bIsEvent) return 1;
      
      // Se ambos são eventos, ordenar por data
      if (aIsEvent && bIsEvent) {
        const aEventTime = a.eventoData instanceof Date ? a.eventoData : a.eventoData.toDate();
        const bEventTime = b.eventoData instanceof Date ? b.eventoData : b.eventoData.toDate();
        return aEventTime.getTime() - bEventTime.getTime();
      }
      
      // Para posts normais, ordenar por engajamento
      return getTotalEngagement(b.id) - getTotalEngagement(a.id);
    }
  });

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Comunidade Estilo Twitter */}
        {/* Campo de novo post */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mb-8 flex gap-4">
          <img src={gerarAvatar(userData, currentUser)} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white resize-none min-h-[60px]"
              placeholder="O que está acontecendo?"
              value={novoPost}
              onChange={(e) => setNovoPost(e.target.value)}
              disabled={loading}
            />
            
            {/* Campo para link do YouTube */}
            <input
              type="text"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
              placeholder="🔗 Cole aqui o link do YouTube (opcional)"
              value={youtubeLink}
              onChange={(e) => handleYoutubeLinkChange(e.target.value)}
              disabled={loading}
            />
            
            {/* Preview do vídeo do YouTube */}
            {youtubePreview && (
              <div className="relative mt-2">
                <div className="bg-white dark:bg-[#23283A] rounded-xl overflow-hidden border border-[#E8E9F1] dark:border-[#23283A]">
                  <div className="relative">
                    <iframe
                      src={youtubePreview.embedUrl}
                      title="YouTube preview"
                      className={`w-full ${youtubePreview.isShort ? 'h-64' : 'h-48'}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                    <button
                      onClick={() => setSelectedVideo(youtubePreview.url)}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-lg transition-colors"
                      title="Maximizar vídeo"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
                        <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                        <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
                        <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                      </svg>
                    </button>
                    {youtubePreview.isShort && (
                      <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                        SHORT
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-[#2E2F38] dark:text-white font-medium">
                      {youtubePreview.isShort ? 'YouTube Short' : 'Vídeo do YouTube'}
                    </p>
                    <p className="text-xs text-[#6B6F76] dark:text-gray-300">Prévia do vídeo</p>
                  </div>
                </div>
                <button
                  className="absolute top-2 right-2 bg-white/80 dark:bg-[#23283A]/80 rounded-full p-1 text-[#F45B69] hover:bg-[#F45B69]/10"
                  onClick={() => { setYoutubeLink(""); setYoutubePreview(null); }}
                  type="button"
                >
                  ✕
                </button>
              </div>
            )}
            
            {filePreview && (
              <div className="flex gap-2 mt-2">
                {fileType && fileType.startsWith('image/') && (
                  <div className="relative">
                    <img src={filePreview} alt="preview" className="max-h-40 rounded-xl border border-[#E8E9F1] dark:border-[#23283A]" />
                    <span className="block text-sm text-white font-medium">{file?.name}</span>
                    <button
                      className="absolute top-1 right-1 bg-white/80 dark:bg-[#23283A]/80 rounded-full p-1 text-[#F45B69] hover:bg-[#F45B69]/10"
                      onClick={() => { setFile(null); setFilePreview(null); setFileType(null); }}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {fileType && fileType.startsWith('video/') && (
                  <div className="relative">
                    <video src={filePreview!} controls className="max-h-40 rounded-xl border border-[#E8E9F1] dark:border-[#23283A] bg-black" />
                    <span className="block text-sm text-white font-medium">{file?.name}</span>
                    <button
                      className="absolute top-1 right-1 bg-white/80 dark:bg-[#23283A]/80 rounded-full p-1 text-[#F45B69] hover:bg-[#F45B69]/10"
                      onClick={() => { setFile(null); setFilePreview(null); setFileType(null); }}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {fileType === 'application/pdf' && (
                  <div className="relative flex flex-col items-center justify-center">
                    <a href={filePreview === 'pdf' ? undefined : filePreview!} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
                      <span className="text-4xl text-red-500">📄</span>
                      <span className="block text-sm text-white font-medium">{file?.name}</span>
                    </a>
                    <button
                      className="absolute top-1 right-1 bg-white/80 dark:bg-[#23283A]/80 rounded-full p-1 text-[#F45B69] hover:bg-[#F45B69]/10"
                      onClick={() => { setFile(null); setFilePreview(null); setFileType(null); }}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-2 relative">
                <button
                  className="text-[#3478F6] hover:text-[#255FD1] text-xl"
                  title="Adicionar arquivo"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >📎</button>
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  className="text-[#3478F6] hover:text-[#255FD1] text-xl"
                  title="Adicionar emoji"
                  onClick={() => setShowEmoji((v) => !v)}
                  type="button"
                >😊</button>
                {showEmoji && (
                  <div ref={emojiPickerRef} className="absolute z-50 mt-12">
                    <Picker 
                      data={data} 
                      onEmojiSelect={handleEmojiSelect} 
                      theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'} 
                    />
                  </div>
                )}
                <button
                  className="text-[#3AC17C] hover:text-[#2E9D63] text-xl"
                  title="Agendar evento"
                  onClick={() => setShowEventModal(true)}
                  type="button"
                >📅</button>
              </div>
              <button
                className="px-5 py-2 rounded-lg bg-[#3478F6] text-white font-bold shadow-soft hover:bg-[#255FD1] transition-colors disabled:opacity-60"
                onClick={handlePostar}
                disabled={loading || (!novoPost.trim() && !file && !youtubePreview)}
              >
                {loading ? "Postando..." : "Postar"}
              </button>
            </div>
          </div>
        </div>
        {/* Filtro de ordenação */}
        <div className="flex justify-end mb-4">
          <div className="flex gap-2 bg-white dark:bg-[#23283A] rounded-lg shadow border border-[#E8E9F1] dark:border-[#23283A] p-1">
            <button
              className={`px-4 py-1 rounded-lg font-medium text-sm transition-colors ${orderByTrending === 'recent' ? 'bg-[#3478F6] text-white' : 'text-[#3478F6] hover:bg-[#E8E9F1] dark:hover:bg-[#181C23]'}`}
              onClick={() => setOrderByTrending('recent')}
            >Mais recentes</button>
            <button
              className={`px-4 py-1 rounded-lg font-medium text-sm transition-colors ${orderByTrending === 'relevant' ? 'bg-[#3478F6] text-white' : 'text-[#3478F6] hover:bg-[#E8E9F1] dark:hover:bg-[#181C23]'}`}
              onClick={() => setOrderByTrending('relevant')}
            >Mais relevantes</button>
          </div>
        </div>
        {/* Feed de posts */}
        <div className="flex flex-col gap-6">
          {sortedPosts.map((post) => {
            
            const isAuthor = currentUser && post.userId === currentUser.uid;
            const isLiked = currentUser && post.likedBy?.includes(currentUser.uid);
            const likesCount = post.likes || 0;
            const commentsCount = commentsMap[post.id] || 0;
            const repostsCount = repostsMap[post.id] || 0;
            const totalEngagement = getTotalEngagement(post.id);
            // Se for repost, buscar dados do original
            const original = post.repostOf && posts.find(p => p.id === post.repostOf);
            return (
              <div
                key={post.id}
                className={`group relative backdrop-blur-sm rounded-2xl p-6 transition-all duration-300 cursor-pointer border hover:scale-[1.02] shadow-lg hover:shadow-xl ${
                  post.isEvento
                    ? 'bg-gradient-to-r from-yellow-50/80 to-orange-50/80 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200/50 dark:border-yellow-700/50 hover:bg-gradient-to-r hover:from-yellow-100/90 hover:to-orange-100/90 dark:hover:from-yellow-800/30 dark:hover:to-orange-800/30'
                    : 'bg-white/60 dark:bg-[#23283A]/60 border-white/20 hover:bg-white/80 dark:hover:bg-[#23283A]/80 hover:border-[#3478F6]/30'
                }`}
              >
                {/* Badge Especial para eventos */}
                {post.isEvento && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                      <span>⭐</span>
                      <span>ESPECIAL</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-4 mb-2">
                  <img src={post.avatar} alt={post.nome} className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-[#23283A] shadow-md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[#2E2F38] dark:text-white text-lg truncate">{post.nome}</span>
                      <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                        {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      {(isAuthor || userData?.permissoes?.developer) && (
                        <ActionIcon
                          icon={deletando === post.id ? <span className="animate-spin">🗑️</span> : <span>🗑️</span>}
                          label=""
                          onClick={() => handleDelete(post.id)}
                          danger
                        />
                      )}
                    </div>
                    
                    {/* Badge de evento agendado */}
                    {post.isEvento && (
                      <div className="mb-2">
                        <button
                          onClick={() => window.open(post.eventoLink, '_blank')}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getEventColor(post.eventoTipo)} text-white hover:opacity-80 transition-opacity cursor-pointer`}
                          title="Clique para participar do evento"
                        >
                          <span>{getEventIcon(post.eventoTipo)}</span>
                          <span>{post.titulo}</span>
                          <span className="text-xs opacity-90">
                            {post.eventoData?.toDate ? post.eventoData.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </button>
                        {post.eventoStatus === 'acontecendo' && (
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded-full font-semibold animate-pulse">
                            <span>🔴</span>
                            <span>AO VIVO</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Se for repost, mostrar comentário do repostador e card aninhado do original */}
                    {post.repostOf ? (
                      <>
                        {post.repostComment && (
                          <div className="mb-2 px-3 py-2 bg-[#F5F6FA] dark:bg-[#23283A] border-l-4 border-[#3478F6] text-[#3478F6] rounded-r-lg text-sm font-medium">
                            <span className="font-semibold">{post.nome}:</span> {post.repostComment}
                          </div>
                        )}
                        {original && (
                          <div className="bg-white dark:bg-[#23283A] border border-[#3478F6]/20 rounded-lg p-3 shadow-inner mt-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-[#3478F6]/10 text-[#3478F6] text-xs rounded-full font-semibold">Repost de {original.nome || 'Original'}</span>
                            </div>
                            <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1">{original.createdAt?.toDate ? original.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                            <div className="text-sm text-[#2E2F38] dark:text-white leading-relaxed mb-2">{original.texto}</div>
                            {/* Mídia do post original */}
                            {original.fileMeta && original.fileMeta.type.startsWith('image/') && (
                              <img src={original.file} alt="Post image" className="w-full rounded-lg mb-2" />
                            )}
                            {original.fileMeta && original.fileMeta.type.startsWith('video/') && (
                              <video src={original.file} controls className="w-full rounded-lg mb-2" />
                            )}
                            {original.youtubeData && (
                              <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-2">
                                <iframe
                                  src={original.youtubeData.embedUrl}
                                  title="YouTube video"
                                  className="w-full h-full"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                ></iframe>
                                <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
                                  YOUTUBE
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {post.texto && <div className="text-base text-[#2E2F38] dark:text-white leading-relaxed mb-2">{post.texto}</div>}
                        {/* Preview de mídia - só para posts originais */}
                        {(post.file && post.fileMeta) && (
                          <div className="mb-2">
                            {post.fileMeta.type.startsWith('image/') && (
                              <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                                <img src={post.file} alt="Post image" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">FOTO</div>
                              </div>
                            )}
                            {post.fileMeta.type.startsWith('video/') && (
                              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                <video src={post.file} className="w-full h-full object-cover" controls muted loop />
                                <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold">VÍDEO</div>
                              </div>
                            )}
                            {post.fileMeta.type === 'application/pdf' && (
                              <div className="flex flex-col items-center justify-center">
                                <a href={post.file} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
                                  <span className="text-4xl text-red-500">📄</span>
                                  <span className="block text-sm text-[#2E2F38] dark:text-white font-medium">{post.fileMeta.name}</span>
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                        {post.youtubeData && (
                          <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-2">
                            <iframe
                              src={post.youtubeData.embedUrl}
                              title="YouTube video"
                              className="w-full h-full"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">YOUTUBE</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {/* Botões de interação e engajamento */}
                <div className="flex items-center justify-between pt-3 border-t border-white/20 dark:border-[#23283A]/20 mt-2">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-200 ${isLiked ? 'text-red-500 scale-110' : 'text-[#6B6F76] dark:text-gray-300 hover:text-red-500 hover:scale-105'}`}
                    >
                      <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
                      <span>{likesCount}</span>
                    </button>
                    <button 
                      onClick={() => { setModalImage(post.file && post.fileMeta && post.fileMeta.type.startsWith('image/') ? post.file : null); setModalPostId(post.id); setModalOpen(true); }}
                      className="flex items-center gap-1.5 text-sm font-medium text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] hover:scale-105 transition-all duration-200"
                    >
                      <span className="text-lg">💬</span>
                      <span>{commentsCount}</span>
                    </button>
                    <button 
                      onClick={() => { setRepostWithComment(false); setShowEmojiRepost(false); handleRepost(post); }}
                      className="flex items-center gap-1.5 text-sm font-medium text-[#6B6F76] dark:text-gray-300 hover:text-green-500 hover:scale-105 transition-all duration-200"
                    >
                      <span className="text-lg">🔁</span>
                      <span>{repostsCount}</span>
                    </button>
                  </div>
                  <div className="px-2 py-1 bg-gradient-to-r from-[#3478F6]/20 to-[#A3C8F7]/20 rounded-full border border-[#3478F6]/30">
                    <span className="text-xs font-medium text-[#3478F6] dark:text-[#A3C8F7]">
                      🔥 {totalEngagement}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Paginação */}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => fetchPosts('first')} disabled={pageStack.length <= 1} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50">Primeira página</button>
          <button onClick={() => fetchPosts('prev')} disabled={pageStack.length <= 1} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50">Anterior</button>
          <button onClick={() => fetchPosts('next')} disabled={posts.length < PAGE_SIZE} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded disabled:opacity-50">Próxima</button>
        </div>
      </div>
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setModalImage(null); setModalPostId(null); }}>
        {modalImage && (
          <div className="flex justify-center items-center p-4">
            <img src={modalImage} alt="imagem ampliada" className="max-h-[60vh] rounded-xl mx-auto" />
          </div>
        )}
        {modalPostId && (
          <div className="p-4 border-t border-[#E8E9F1] dark:border-[#23283A]">
            <h3 className="font-bold text-lg mb-2 text-[#2E2F38] dark:text-white">Comentários</h3>
            <div className="max-h-60 overflow-y-auto space-y-3 mb-3">
              {comments.length === 0 && <div className="text-gray-400 text-sm">Nenhum comentário ainda.</div>}
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <img src={c.avatar} alt={c.nome} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold text-[#2E2F38] dark:text-white text-sm">{c.nome}</div>
                    <div className="text-[#2E2F38] dark:text-gray-200 text-sm">{c.texto}</div>
                    <div className="text-xs text-gray-400">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('pt-BR') : ''}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2 relative">
              <input
                type="text"
                className="flex-1 px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                placeholder="Adicionar comentário..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
              />
              <button
                className="text-[#3478F6] hover:text-[#255FD1] text-xl"
                title="Adicionar emoji"
                onClick={() => setShowEmojiComment((v) => !v)}
                type="button"
              >😊</button>
              {showEmojiComment && (
                <div ref={emojiCommentRef} className="absolute z-50 top-12 right-0">
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji: any) => { setNewComment((prev) => prev + emoji.native); setShowEmojiComment(false); }}
                    theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                  />
                </div>
              )}
              <button
                className="px-4 py-2 rounded-lg bg-[#3478F6] text-white font-bold shadow-soft hover:bg-[#255FD1] transition-colors"
                onClick={handleAddComment}
              >Comentar</button>
            </div>
          </div>
        )}
      </Modal>
      {/* Modal de Repost */}
      <Modal open={repostModalOpen} onClose={() => { setRepostModalOpen(false); setRepostTarget(null); setRepostComment(""); setRepostWithComment(false); }}>
        <div className="p-6">
          <h2 className="font-bold text-lg mb-4 text-[#2E2F38] dark:text-white">Repostar</h2>
          {!repostWithComment ? (
            <div className="flex flex-col gap-4">
              <button
                className="px-4 py-2 rounded-lg bg-[#3478F6] text-white font-bold shadow-soft hover:bg-[#255FD1] transition-colors"
                onClick={() => { confirmRepost(false); }}
                disabled={repostLoading}
              >Repostar direto</button>
              <button
                className="px-4 py-2 rounded-lg bg-[#E8E9F1] text-[#2E2F38] dark:bg-[#23283A] dark:text-white font-bold shadow-soft hover:bg-[#A3C8F7] transition-colors"
                onClick={() => setRepostWithComment(true)}
                disabled={repostLoading}
              >Repostar com comentário</button>
            </div>
          ) : (
            <>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white resize-none min-h-[60px]"
                placeholder="Adicione um comentário"
                value={repostComment}
                onChange={e => setRepostComment(e.target.value)}
                disabled={repostLoading}
              />
              <div className="flex items-center gap-2 mt-2 relative">
                <button
                  className="text-[#3478F6] hover:text-[#255FD1] text-xl"
                  title="Adicionar emoji"
                  onClick={() => setShowEmojiRepost((v) => !v)}
                  type="button"
                >😊</button>
                {showEmojiRepost && (
                  <div ref={emojiRepostRef} className="absolute z-50 top-12 left-0">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: any) => { setRepostComment((prev) => prev + emoji.native); setShowEmojiRepost(false); }}
                      theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                    />
                  </div>
                )}
                <button
                  className="px-4 py-2 rounded-lg bg-[#3478F6] text-white font-bold shadow-soft hover:bg-[#255FD1] transition-colors"
                  onClick={() => confirmRepost(true)}
                  disabled={repostLoading || !repostComment.trim()}
                >Ok</button>
                <button
                  className="px-4 py-2 rounded-lg bg-[#F45B69] text-white font-bold shadow-soft hover:bg-[#F45B69]/80 transition-colors"
                  onClick={() => { setRepostWithComment(false); setRepostComment(""); setShowEmojiRepost(false); }}
                  disabled={repostLoading}
                >Cancelar</button>
              </div>
            </>
          )}
          {repostLoading && <div className="mt-4 text-[#3478F6] font-bold">Repostando...</div>}
        </div>
      </Modal>

      {/* Modal de vídeo maximizado */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#23283A] rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2E2F38] dark:text-white">
                Vídeo em Tela Cheia
              </h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="relative">
              <iframe
                src={getYouTubeEmbedUrl(selectedVideo)}
                title="Vídeo maximizado"
                className="w-full h-96"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
        </div>
      </div>
      )}

      {/* Modal de Criação de Evento */}
      <Modal open={showEventModal} onClose={() => setShowEventModal(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white flex items-center gap-2">
              <span>📅</span>
              Agendar Evento
            </h2>
            <button
              onClick={() => setShowEventModal(false)}
              className="text-[#6B6F76] hover:text-[#2E2F38] dark:text-gray-300 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Tipo de Evento */}
            <div>
              <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                Tipo de Evento
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'meet', label: 'Google Meet', icon: '🎥', color: 'bg-blue-500' },
                  { key: 'youtube', label: 'YouTube Live', icon: '📺', color: 'bg-red-500' },
                  { key: 'instagram', label: 'Instagram Live', icon: '📱', color: 'bg-pink-500' }
                ].map((tipo) => (
                  <button
                    key={tipo.key}
                    onClick={() => setEventForm({ ...eventForm, tipo: tipo.key as any })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      eventForm.tipo === tipo.key
                        ? `${tipo.color} text-white border-transparent`
                        : 'border-[#E8E9F1] dark:border-[#23283A] text-[#6B6F76] dark:text-gray-300 hover:border-[#3478F6]'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">{tipo.icon}</div>
                      <div className="text-xs font-medium">{tipo.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Título do Evento */}
            <div>
              <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                Título do Evento *
              </label>
              <input
                type="text"
                value={eventForm.titulo}
                onChange={(e) => setEventForm({ ...eventForm, titulo: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                placeholder="Ex: Reunião de Vendas, Live de Lançamento..."
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                Descrição (opcional)
              </label>
              <textarea
                value={eventForm.descricao}
                onChange={(e) => setEventForm({ ...eventForm, descricao: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white resize-none"
                rows={3}
                placeholder="Descreva o evento..."
              />
            </div>

            {/* Link */}
            <div>
              <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                Link do Evento *
              </label>
              <input
                type="url"
                value={eventForm.link}
                onChange={(e) => setEventForm({ ...eventForm, link: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                placeholder={
                  eventForm.tipo === 'meet' 
                    ? 'https://meet.google.com/xxx-xxxx-xxx'
                    : eventForm.tipo === 'youtube'
                    ? 'https://youtube.com/watch?v=...'
                    : 'https://instagram.com/live/...'
                }
                required
              />
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  value={eventForm.data}
                  onChange={(e) => setEventForm({ ...eventForm, data: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                  Hora *
                </label>
                <input
                  type="time"
                  value={eventForm.hora}
                  onChange={(e) => setEventForm({ ...eventForm, hora: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowEventModal(false)}
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={eventLoading || !eventForm.titulo || !eventForm.link || !eventForm.data || !eventForm.hora}
                className="flex-1 px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {eventLoading ? 'Criando...' : 'Criar Evento'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-colors"
          title="Voltar ao topo"
        >
          ↑
        </button>
      )}
    </div>
  );
} 