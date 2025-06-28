import React from 'react';

const mockPosts = [
  {
    id: 1,
    user: {
      name: 'Ana Corretora',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      handle: '@anacorretora',
    },
    time: '2h',
    content: 'Novo lançamento no centro! 🏢 #imobiliaria #oportunidade',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    likes: 12,
    comments: 3,
    reposts: 2,
  },
  {
    id: 2,
    user: {
      name: 'Carlos Santos',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      handle: '@carlossantos',
    },
    time: '5h',
    content: 'Dica: sempre atualize suas fotos profissionais! 📸 #marketingimobiliario',
    image: '',
    likes: 8,
    comments: 1,
    reposts: 0,
  },
  {
    id: 3,
    user: {
      name: 'Equipe Alume',
      avatar: '/favicon.ico',
      handle: '@alume',
    },
    time: '1d',
    content: 'Parabéns a todos os corretores que bateram meta este mês! 🎉 #sucesso',
    image: '',
    likes: 20,
    comments: 5,
    reposts: 4,
  },
];

const ActionIcon = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <button className="flex items-center gap-1 text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] dark:hover:text-[#A3C8F7] text-sm font-medium transition-colors">
    {icon}
    <span>{label}</span>
  </button>
);

export default function ComunidadePage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-6 text-left">Comunidade</h1>
        {/* Nova postagem */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mb-8 flex gap-4">
          <img src="https://randomuser.me/api/portraits/men/1.jpg" alt="avatar" className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1 flex flex-col gap-2">
            <textarea className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white resize-none min-h-[60px]" placeholder="Compartilhe novidades, dicas ou oportunidades..." />
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-2">
                <button className="text-[#3478F6] hover:text-[#255FD1] text-xl" title="Adicionar imagem">📷</button>
                <button className="text-[#3478F6] hover:text-[#255FD1] text-xl" title="Adicionar hashtag">#</button>
              </div>
              <button className="px-5 py-2 rounded-lg bg-[#3478F6] text-white font-bold shadow-soft hover:bg-[#255FD1] transition-colors">Postar</button>
            </div>
          </div>
        </div>
        {/* Feed de posts */}
        <div className="flex flex-col gap-6">
          {mockPosts.map((post) => (
            <div key={post.id} className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 flex gap-4">
              <img src={post.user.avatar} alt={post.user.name} className="w-12 h-12 rounded-full object-cover" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#2E2F38] dark:text-white">{post.user.name}</span>
                  <span className="text-xs text-[#6B6F76] dark:text-gray-300">{post.user.handle} · {post.time}</span>
                </div>
                <div className="text-[#2E2F38] dark:text-white text-base whitespace-pre-line">{post.content}</div>
                {post.image && (
                  <img src={post.image} alt="imagem do post" className="rounded-xl mt-2 max-h-60 object-cover border border-[#E8E9F1] dark:border-[#23283A]" />
                )}
                <div className="flex gap-6 mt-2">
                  <ActionIcon icon={<span>💬</span>} label={post.comments.toString()} />
                  <ActionIcon icon={<span>🔁</span>} label={post.reposts.toString()} />
                  <ActionIcon icon={<span>❤️</span>} label={post.likes.toString()} />
                  <ActionIcon icon={<span>↗️</span>} label={"Compartilhar"} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 