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
  if (nome) return '@' + nome.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (email) return '@' + email.split('@')[0].toLowerCase();
  return '@usuario';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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
    if (!novoPost.trim() && !file) return;
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
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${userData?.nome || currentUser.email?.[0] || "U"}`,
      createdAt: serverTimestamp(),
      likes: 0,
      likedBy: [],
      comments: [],
      file: fileUrl,
      fileMeta,
    });
    setNovoPost("");
    setFile(null);
    setFilePreview(null);
    setFileType(null);
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

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Comunidade Estilo Twitter */}
        {/* Campo de novo post */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mb-8 flex gap-4">
          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${userData?.nome || currentUser?.email?.[0] || "U"}`} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white resize-none min-h-[60px]"
              placeholder="O que está acontecendo?"
              value={novoPost}
              onChange={(e) => setNovoPost(e.target.value)}
              disabled={loading}
            />
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
                disabled={loading || (!novoPost.trim() && !file)}
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
                    <span className="text-xs text-[#6B6F76] dark:text-white">{gerarHandle(post.nome, post.email)}</span>
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
                  {(post.file && post.fileMeta) && (
                    <div className="flex gap-2 mt-2">
                      {post.fileMeta.type.startsWith('image/') && (
                        <div className="relative">
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
                      label={commentsCount.toString()} 
                    />
                    <ActionIcon 
                      icon={<span>{isLiked ? '❤️' : '🤍'}</span>} 
                      label={likesCount.toString()} 
                      onClick={() => handleLike(post.id)}
                      active={isLiked}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 