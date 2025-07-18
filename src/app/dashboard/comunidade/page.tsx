"use client";

import React, { useEffect, useState, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
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
  const [posts, setPosts] = useState<any[]>([]);
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
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Função para extrair ID do vídeo do YouTube
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : undefined;
  };

  // Função para gerar URL de embed do YouTube
  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : undefined;
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
          url: link
        });
      } else {
        setYoutubePreview(null);
      }
    } else {
      setYoutubePreview(null);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "comunidadePosts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

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
                    <img 
                      src={youtubePreview.thumbnail} 
                      alt="YouTube thumbnail" 
                      className="w-full h-32 object-cover object-center"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors cursor-pointer"
                           onClick={() => setSelectedVideo(youtubePreview.url)}>
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
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
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-[#2E2F38] dark:text-white font-medium">Vídeo do YouTube</p>
                    <p className="text-xs text-[#6B6F76] dark:text-gray-300">Clique para assistir</p>
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
        {/* Feed de posts */}
        <div className="flex flex-col gap-6">
          {posts.map((post) => {
            const isAuthor = currentUser && post.userId === currentUser.uid;
            const isLiked = currentUser && post.likedBy?.includes(currentUser.uid);
            const likesCount = post.likes || 0;
            const commentsCount = post.comments?.length || 0;
            
            return (
              <div
                key={post.id}
                className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 flex gap-4 group hover:shadow-lg transition-all"
              >
                <img src={post.avatar} alt={post.nome} className="w-12 h-12 rounded-full object-cover mt-1" />
                <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2E2F38] dark:text-white text-base">{post.nome}</span>
                    <span className="text-xs text-[#6B6F76] dark:text-white">
                      {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString('pt-BR') : ''}
                    </span>
                    {isAuthor && (
                      <ActionIcon
                        icon={deletando === post.id ? <span className="animate-spin">🗑️</span> : <span>🗑️</span>}
                        label=""
                        onClick={() => handleDelete(post.id)}
                        danger
                      />
                    )}
                  </div>
                  <div className="text-[#2E2F38] dark:text-white text-base whitespace-pre-line mb-2">{post.texto}</div>
                  
                  {/* Vídeo do YouTube */}
                  {post.youtubeData && (
                    <div className="mt-2">
                      <div className="bg-white dark:bg-[#23283A] rounded-xl overflow-hidden border border-[#E8E9F1] dark:border-[#23283A] cursor-pointer hover:shadow-lg transition-shadow">
                        <div className="relative">
                          <img 
                            src={post.youtubeData.thumbnail} 
                            alt="YouTube thumbnail" 
                            className="w-full h-48 object-cover object-center"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                                 onClick={(e) => { e.stopPropagation(); setSelectedVideo(post.youtubeLink); }}>
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedVideo(post.youtubeLink); }}
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
                        </div>
                        <div className="p-4" onClick={() => window.open(post.youtubeLink, '_blank')}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                            </div>
                            <p className="text-sm text-[#2E2F38] dark:text-white font-medium">YouTube</p>
                          </div>
                          <p className="text-xs text-[#6B6F76] dark:text-gray-300">Clique para assistir no YouTube</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(post.file && post.fileMeta) && (
                    <div className="flex gap-2 mt-2">
                      {post.fileMeta.type.startsWith('image/') && (
                        <div className="relative cursor-pointer" onClick={() => { setModalImage(post.file); setModalPostId(post.id); setModalOpen(true); }}>
                          <img src={post.file} alt={post.fileMeta.name} className="max-h-60 rounded-xl border border-[#E8E9F1] dark:border-[#23283A]" />
                        </div>
                      )}
                      {post.fileMeta.type.startsWith('video/') && (
                        <div className="relative">
                          <video src={post.file} controls className="max-h-60 rounded-xl border border-[#E8E9F1] dark:border-[#23283A] bg-black" />
                        </div>
                      )}
                      {post.fileMeta.type === 'application/pdf' && (
                        <div className="relative flex flex-col items-center justify-center">
                          <a href={post.file} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
                            <span className="text-4xl text-red-500">📄</span>
                            <span className="block text-sm text-white font-medium">{post.fileMeta.name}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-4 mt-3">
                    <ActionIcon 
                      icon={<span>💬</span>} 
                      label={(commentsMap[post.id] ?? 0).toString()} 
                      onClick={() => { setModalImage(post.file && post.fileMeta && post.fileMeta.type.startsWith('image/') ? post.file : null); setModalPostId(post.id); setModalOpen(true); }}
                    />
                    <ActionIcon 
                      icon={<span title="Repostar">🔁</span>}
                      label={(repostsMap[post.id] ?? 0).toString()}
                      onClick={() => { setRepostWithComment(false); setShowEmojiRepost(false); handleRepost(post); }}
                    />
                    <ActionIcon 
                      icon={<span>{isLiked ? '❤️' : '🤍'}</span>} 
                      label={likesCount.toString()} 
                      onClick={() => handleLike(post.id)}
                      active={isLiked}
                    />
                  </div>
                  {/* Indicação de repost na timeline */}
                  {post.repostOf && (
                    <div className="flex items-center gap-1 text-xs text-[#3478F6] dark:text-[#A3C8F7] mb-1">
                      <span>🔁</span>
                      {post.userId === currentUser?.uid ? (
                        <span>Você repostou</span>
                      ) : originalAuthors[post.repostOf] ? (
                        <span>Repostado de <span className="underline cursor-pointer hover:text-[#255FD1]" title={originalAuthors[post.repostOf].handle}>{originalAuthors[post.repostOf].nome}</span></span>
                      ) : (
                        <span>Repost</span>
                      )}
                </div>
                )}
                </div>
              </div>
            );
          })}
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
    </div>
  );
} 