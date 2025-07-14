'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, deleteDoc, doc } from 'firebase/firestore';

const ActionIcon = ({ icon, label, onClick, active = false, danger = false }: { icon: React.ReactNode; label?: string; onClick?: () => void; active?: boolean; danger?: boolean }) => (
  <button
    className={`flex items-center gap-1 text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-[#E8E9F1] dark:hover:bg-[#23283A] ${danger ? 'text-[#F45B69] hover:bg-[#F45B69]/10' : active ? 'text-[#3478F6]' : 'text-[#6B6F76] dark:text-gray-300'}`}
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
  const [novoPost, setNovoPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'comunidadePosts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handlePostar = async () => {
    if (!novoPost.trim() || !currentUser) return;
    setLoading(true);
    await addDoc(collection(db, 'comunidadePosts'), {
      texto: novoPost,
      userId: currentUser.uid,
      nome: userData?.nome || currentUser.email?.split('@')[0] || 'Usuário',
      email: currentUser.email || '',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${userData?.nome || currentUser.email?.[0] || 'U'}`,
      createdAt: serverTimestamp(),
      likes: 0,
      comments: 0,
      reposts: 0,
    });
    setNovoPost('');
    setLoading(false);
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Tem certeza que deseja apagar este post?')) return;
    setDeletando(postId);
    await deleteDoc(doc(db, 'comunidadePosts', postId));
    setDeletando(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-6 text-left">Comunidade</h1>
        {/* Nova postagem */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mb-8 flex gap-4">
          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${userData?.nome || currentUser?.email?.[0] || 'U'}`} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white resize-none min-h-[60px]"
              placeholder="Compartilhe novidades, dicas ou oportunidades..."
              value={novoPost}
              onChange={e => setNovoPost(e.target.value)}
              disabled={loading}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-2">
                <button className="text-[#3478F6] hover:text-[#255FD1] text-xl" title="Adicionar imagem" disabled>📷</button>
                <button className="text-[#3478F6] hover:text-[#255FD1] text-xl" title="Adicionar hashtag" disabled>#</button>
              </div>
              <button
                className="px-5 py-2 rounded-lg bg-[#3478F6] text-white font-bold shadow-soft hover:bg-[#255FD1] transition-colors disabled:opacity-60"
                onClick={handlePostar}
                disabled={loading || !novoPost.trim()}
              >
                {loading ? 'Postando...' : 'Postar'}
              </button>
            </div>
          </div>
        </div>
        {/* Feed de posts */}
        <div className="flex flex-col gap-6">
          {posts.map((post) => {
            const isAuthor = currentUser && post.userId === currentUser.uid;
            return (
              <div
                key={post.id}
                className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 flex gap-4 group hover:shadow-lg transition-all"
              >
                <img src={post.avatar} alt={post.nome} className="w-12 h-12 rounded-full object-cover mt-1" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2E2F38] dark:text-white text-base">{post.nome}</span>
                    <span className="text-xs text-[#6B6F76] dark:text-gray-400">{gerarHandle(post.nome, post.email)}</span>
                    <span className="text-xs text-[#6B6F76] dark:text-gray-400">{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString('pt-BR') : ''}</span>
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
                  <div className="flex gap-4 mt-1">
                    <ActionIcon icon={<span>💬</span>} label={post.comments?.toString() || '0'} />
                    <ActionIcon icon={<span>❤️</span>} label={post.likes?.toString() || '0'} />
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