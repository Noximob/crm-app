'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, onSnapshot, doc as firestoreDoc, getDoc, Timestamp, orderBy, limit, deleteDoc, setDoc, doc } from 'firebase/firestore';
import Link from 'next/link';

// Ícones
const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

const TrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
    </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
    </svg>
);

const TrophyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 1.1.9 2 2 2s2-.9 2-2v-2.34"/>
        <path d="M12 14V6"/>
    </svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
        <line x1="16" x2="16" y1="2" y2="6"/>
        <line x1="8" x2="8" y1="2" y2="6"/>
        <line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
);

const DollarSignIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="1" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
);

const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="m22 21-2-2"/>
        <path d="M16 16h6"/>
    </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);

const AlertCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" x2="12" y1="8" y2="12"/>
        <line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
);

const StarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
);

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-[#23283A] rounded-2xl shadow-sm border border-[#E8E9F1] dark:border-[#23283A] p-6 hover-lift ${className}`}>{children}</div>
);

const MetricCard = ({ title, value, change, icon: Icon, trend = 'up' }: {
  title: string;
  value: string;
  change?: string;
  icon: any;
  trend?: 'up' | 'down';
}) => (
  <Card className="flex flex-col animate-fade-in">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-lg ${trend === 'up' ? 'bg-[#3AC17C]/10 text-[#3AC17C]' : 'bg-[#F45B69]/10 text-[#F45B69]'}`}>
        <Icon className="h-5 w-5" />
      </div>
      {change && (
        <div className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-[#3AC17C]' : 'text-[#F45B69]'}`}>
          {trend === 'up' ? <TrendingUpIcon className="h-3 w-3 mr-1" /> : <TrendingDownIcon className="h-3 w-3 mr-1" />}
          {change}
        </div>
      )}
    </div>
    <div className="text-xl font-bold text-[#2E2F38] dark:text-white mb-1">{value}</div>
    <div className="text-xs text-[#6B6F76] dark:text-gray-300">{title}</div>
  </Card>
);

// Substituir EconomicIndicator por um componente mais simples, sem variação
const SimpleIndicator = ({ title, value }: { title: string; value: string }) => (
  <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-r from-[#3478F6]/5 to-[#A3C8F7]/5 rounded-lg border border-[#A3C8F7]/20 min-w-[120px] animate-slide-in">
    <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1">{title}</div>
    <div className="text-lg font-bold text-[#2E2F38] dark:text-white">{value}</div>
  </div>
);

const TaskItem = ({ time, title, status = 'pending' }: {
  time: string;
  title: string;
  status?: 'pending' | 'completed' | 'overdue';
}) => {
  const statusConfig = {
    pending: { color: 'bg-[#FFCC66]', text: 'Pendente' },
    completed: { color: 'bg-[#3AC17C]', text: 'Concluída' },
    overdue: { color: 'bg-[#F45B69]', text: 'Atrasada' }
  };
  
  const config = statusConfig[status];
  
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[#F5F6FA] rounded-xl transition-colors">
      <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
      <div className="flex-1">
        <div className="text-sm font-medium text-[#2E2F38] dark:text-white">{title}</div>
        <div className="text-xs text-[#6B6F76] dark:text-gray-100 flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          {time}
        </div>
      </div>
      <div className="text-xs text-[#6B6F76] dark:text-gray-100">{config.text}</div>
    </div>
  );
};

const RankingItem = ({ position, name, sales, avatar, rating }: {
  position: number;
  name: string;
  sales: string;
  avatar: string;
  rating?: number;
}) => {
  const getPositionColor = (pos: number) => {
    switch (pos) {
      case 1: return 'bg-yellow-400 text-white';
      case 2: return 'bg-gray-300 text-white';
      case 3: return 'bg-orange-400 text-white';
      default: return 'bg-[#E8E9F1] text-[#6B6F76]';
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[#F5F6FA] rounded-xl transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getPositionColor(position)}`}>
        {position}
      </div>
      <img src={avatar} alt={name} className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <div className="text-sm font-medium text-[#2E2F38] dark:text-white">{name}</div>
        <div className="text-xs text-[#6B6F76] dark:text-gray-100 flex items-center gap-2">
          <span>{sales} vendas</span>
          {rating && (
            <div className="flex items-center gap-1">
              <StarIcon className="h-3 w-3 text-yellow-400 fill-current" />
              <span>{rating}</span>
            </div>
          )}
        </div>
      </div>
      {position <= 3 && <TrophyIcon className="h-5 w-5 text-yellow-500" />}
    </div>
  );
};

const SectionTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white relative z-10">{children}</h2>
    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#3478F6] to-[#A3C8F7] rounded-r-full opacity-60"></div>
  </div>
);



// --- Tipos para tarefas ---
interface Task {
  id: string;
  description: string;
  type: 'Ligação' | 'WhatsApp' | 'Visita';
  dueDate: Timestamp;
  status: 'pendente' | 'concluída' | 'cancelada';
}

// --- Status e cores ---
type TaskStatus = 'Tarefa em Atraso' | 'Tarefa do Dia' | 'Sem tarefa' | 'Tarefa Futura';

const TAREFA_STATUS_ORDER = ['Tarefa em Atraso', 'Tarefa do Dia', 'Sem tarefa', 'Tarefa Futura'];

const statusInfo = {
  'Tarefa em Atraso': { color: 'bg-red-500', text: 'Em Atraso' },
  'Tarefa do Dia': { color: 'bg-yellow-500', text: 'Para Hoje' },
  'Sem tarefa': { color: 'bg-gray-500', text: 'Sem Tarefa' },
  'Tarefa Futura': { color: 'bg-blue-500', text: 'Futura' }
};
function getTaskStatusInfo(tasks: Task[]): TaskStatus {
  if (tasks.length === 0) return 'Sem tarefa';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const hasOverdue = tasks.some(task => {
    const dueDate = task.dueDate.toDate();
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < now;
  });
  if (hasOverdue) return 'Tarefa em Atraso';
  const hasTodayTask = tasks.some(task => {
    const dueDate = task.dueDate.toDate();
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === now.getTime();
  });
  if (hasTodayTask) return 'Tarefa do Dia';
  return 'Tarefa Futura';
}

// Novo Card de Metas moderno
const MetasCard = ({ meta, nomeImobiliaria }: { meta: any, nomeImobiliaria: string }) => {
  // Usar o percentual salvo no Firestore, ou calcular automaticamente se não existir
  const progresso = meta?.percentual !== undefined ? meta.percentual : (meta && meta.valor > 0 ? Math.round((meta.alcancado / meta.valor) * 100) : 0);
  const progressoDisplay = progresso > 100 ? 100 : progresso;
  
  // Determinar cores baseado no progresso
  const getProgressColors = () => {
    if (progresso >= 100) {
      return {
        barra: 'from-[#3AC17C] to-[#2E8B57]',
        percentual: 'text-[#3AC17C]',
        percentualBg: 'bg-[#3AC17C]/10'
      };
    } else if (progresso >= 75) {
      return {
        barra: 'from-[#4CAF50] to-[#45A049]',
        percentual: 'text-[#4CAF50]',
        percentualBg: 'bg-[#4CAF50]/10'
      };
    } else if (progresso >= 50) {
      return {
        barra: 'from-[#FF9800] to-[#F57C00]',
        percentual: 'text-[#FF9800]',
        percentualBg: 'bg-[#FF9800]/10'
      };
    } else {
      return {
        barra: 'from-[#A3C8F7] to-[#3478F6]',
        percentual: 'text-[#3478F6]',
        percentualBg: 'bg-[#3478F6]/10'
      };
    }
  };

  const colors = getProgressColors();

  return (
    <div className="flex flex-col gap-3 p-6 rounded-2xl shadow-xl bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 min-h-[200px] relative overflow-hidden">
      {/* Borda azul à esquerda */}
      <div className="absolute top-0 left-0 w-1 h-full bg-[#3478F6]" />
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <svg className="h-6 w-6 text-[#3478F6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span className="font-bold text-white text-lg tracking-tight">Metas</span>
        {nomeImobiliaria && (
          <span className="ml-2 px-2 py-0.5 rounded bg-[#3478F6]/10 text-[#3478F6] text-xs font-semibold">{nomeImobiliaria}</span>
        )}
      </div>
      {/* Datas */}
      <div className="flex items-center gap-2 text-xs text-[#A3C8F7] mb-2">
        <span className="font-semibold">Início:</span>
        <span className="text-white">{meta?.inicio ? new Date(meta.inicio).toLocaleDateString('pt-BR') : '--'}</span>
        <span>|</span>
        <span className="font-semibold">Fim:</span>
        <span className="text-white">{meta?.fim ? new Date(meta.fim).toLocaleDateString('pt-BR') : '--'}</span>
      </div>
      {/* Valores principais */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex flex-col">
          <span className="text-xs text-[#A3C8F7]">VGV da Meta</span>
          <span className="text-xl font-bold text-[#3478F6]">{meta?.valor ? meta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-[#A3C8F7]">Já Realizado</span>
          <span className={`text-xl font-bold ${progresso >= 100 ? 'text-[#3AC17C]' : 'text-[#3478F6]'}`}>{meta?.alcancado ? meta.alcancado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}</span>
        </div>
      </div>
      {/* Barra de progresso com gradiente */}
      <div className="w-full h-3 bg-[#23283A] rounded-full overflow-hidden mb-2 relative">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${colors.barra} shadow-lg`} 
          style={{ width: `${progressoDisplay}%` }}
        >
          {/* Efeito de brilho na barra */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
        </div>
      </div>
      {/* Percentual destacado */}
      <div className={`text-right`}>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${colors.percentual} ${colors.percentualBg} border border-current/20 shadow-sm`}>
          {progresso}% da meta
        </span>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { currentUser, userData } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [indicadoresExternos, setIndicadoresExternos] = useState<any>(null);
  const [indicadoresExternosAnterior, setIndicadoresExternosAnterior] = useState<any>(null);
  const [agendaLeads, setAgendaLeads] = useState<any[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [avisosImportantes, setAvisosImportantes] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [nomeImobiliaria, setNomeImobiliaria] = useState('Imobiliária');
  
  // Estados para interatividade do Top Trending
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiking, setIsLiking] = useState<string | null>(null);
  const [isReposting, setIsReposting] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Atualizar hora a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Buscar indicadores econômicos
  useEffect(() => {
    const fetchIndicadores = async () => {
      try {
        const now = new Date();
        const docIdAtual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const docIdAnterior = `${now.getMonth() === 0 ? now.getFullYear()-1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2,'0')}`;
        const refAtual = firestoreDoc(db, 'indicadoresExternos', docIdAtual);
        const refAnterior = firestoreDoc(db, 'indicadoresExternos', docIdAnterior);
        const snapAtual = await getDoc(refAtual);
        const snapAnterior = await getDoc(refAnterior);
        if (snapAtual.exists()) {
          setIndicadoresExternos(snapAtual.data());
        } else {
          setIndicadoresExternos(null);
        }
        if (snapAnterior.exists()) {
          setIndicadoresExternosAnterior(snapAnterior.data());
        } else {
          setIndicadoresExternosAnterior(null);
        }
      } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
      }
    };
    fetchIndicadores();
  }, []);

  // Buscar agenda do dia
  useEffect(() => {
    const fetchAgenda = async () => {
      if (!currentUser) return;
      setAgendaLoading(true);
      try {
        const leadsRef = collection(db, 'leads');
        const leadsQuery = query(leadsRef, where('userId', '==', currentUser.uid));
        const leadsSnapshot = await getDocs(leadsQuery);
        const allLeads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const leadsWithTasksPromises = allLeads.map(async (lead) => {
          const tasksCol = collection(db, 'leads', lead.id, 'tarefas');
          const q = query(tasksCol, where('status', '==', 'pendente'));
          const tasksSnapshot = await getDocs(q);
          const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
          const taskStatus = getTaskStatusInfo(tasks);
          return { ...lead, taskStatus, tasks };
        });
        const settledLeads = await Promise.all(leadsWithTasksPromises);
        // Filtra para não mostrar tarefas futuras
        const leadsToShow = settledLeads.filter(lead => lead.taskStatus !== 'Tarefa Futura');
        leadsToShow.sort((a, b) => TAREFA_STATUS_ORDER.indexOf(a.taskStatus) - TAREFA_STATUS_ORDER.indexOf(b.taskStatus));
        setAgendaLeads(leadsToShow.slice(0, 6));
      } catch (error) {
        console.error('Erro ao buscar agenda:', error);
        setAgendaLeads([]);
      } finally {
        setAgendaLoading(false);
      }
    };
    fetchAgenda();
  }, [currentUser]);

  // Buscar avisos importantes
  useEffect(() => {
    const fetchAvisos = async () => {
      if (!userData?.imobiliariaId) return;
      const q = query(collection(db, 'avisosImportantes'), where('imobiliariaId', '==', userData.imobiliariaId));
      const snapshot = await getDocs(q);
      setAvisosImportantes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchAvisos();
  }, [userData]);

  useEffect(() => {
    const fetchTrendingPosts = async () => {
      if (!userData?.imobiliariaId) return;
      setTrendingLoading(true);
      try {
        const postsRef = collection(db, 'comunidadePosts');
        const q = query(postsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Buscar contadores de comentários e reposts para cada post
        const postsWithCounts = await Promise.all(
          posts.map(async (post: any) => {
            const commentsSnapshot = await getDocs(collection(db, 'comunidadePosts', post.id, 'comments'));
            const repostsSnapshot = await getDocs(collection(db, 'comunidadePosts', post.id, 'reposts'));
            
            // Verificar se o usuário atual já curtiu o post
            const userLikeSnapshot = await getDocs(
              query(collection(db, 'comunidadePosts', post.id, 'likes'), where('userId', '==', currentUser?.uid))
            );
            
            return {
              ...post,
              commentsCount: commentsSnapshot.size,
              repostsCount: repostsSnapshot.size,
              totalEngagement: (post.likes || 0) + commentsSnapshot.size + repostsSnapshot.size,
              userLiked: userLikeSnapshot.size > 0
            };
          })
        );
        
        // Ordena por engajamento total (likes + comentários + reposts)
        const sortedPosts = postsWithCounts.sort((a, b) => b.totalEngagement - a.totalEngagement);
        setTrendingPosts(sortedPosts.slice(0, 3));
      } catch (error) {
        console.error('Erro ao buscar posts trending:', error);
        setTrendingPosts([]);
      } finally {
        setTrendingLoading(false);
      }
    };
    fetchTrendingPosts();
  }, [userData, currentUser]);

  // Funções para interatividade
  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    
    setIsLiking(postId);
    try {
      const likeRef = doc(db, 'comunidadePosts', postId, 'likes', currentUser.uid);
      const likeDoc = await getDoc(likeRef);
      
      if (likeDoc.exists()) {
        // Remover like
        await deleteDoc(likeRef);
        setTrendingPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, likes: (post.likes || 1) - 1, userLiked: false }
            : post
        ));
        // Atualizar post selecionado no modal
        setSelectedPost((prev: any) => prev && prev.id === postId ? {
          ...prev,
          likes: (prev.likes || 1) - 1,
          userLiked: false
        } : prev);
      } else {
        // Adicionar like
        await setDoc(likeRef, { userId: currentUser.uid, timestamp: new Date() });
        setTrendingPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, likes: (post.likes || 0) + 1, userLiked: true }
            : post
        ));
        // Atualizar post selecionado no modal
        setSelectedPost((prev: any) => prev && prev.id === postId ? {
          ...prev,
          likes: (prev.likes || 0) + 1,
          userLiked: true
        } : prev);
      }
    } catch (error) {
      console.error('Erro ao curtir post:', error);
    } finally {
      setIsLiking(null);
    }
  };

  const handleRepost = async (postId: string) => {
    if (!currentUser) return;
    
    setIsReposting(postId);
    try {
      const repostRef = doc(db, 'comunidadePosts', postId, 'reposts', currentUser.uid);
      const repostDoc = await getDoc(repostRef);
      
      if (repostDoc.exists()) {
        // Remover repost
        await deleteDoc(repostRef);
        setTrendingPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, repostsCount: (post.repostsCount || 1) - 1 }
            : post
        ));
        // Atualizar post selecionado no modal
        setSelectedPost((prev: any) => prev && prev.id === postId ? {
          ...prev,
          repostsCount: (prev.repostsCount || 1) - 1
        } : prev);
      } else {
        // Adicionar repost
        await setDoc(repostRef, { userId: currentUser.uid, timestamp: new Date() });
        setTrendingPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, repostsCount: (post.repostsCount || 0) + 1 }
            : post
        ));
        // Atualizar post selecionado no modal
        setSelectedPost((prev: any) => prev && prev.id === postId ? {
          ...prev,
          repostsCount: (prev.repostsCount || 0) + 1
        } : prev);
      }
    } catch (error) {
      console.error('Erro ao repostar:', error);
    } finally {
      setIsReposting(null);
    }
  };

  const handleComment = async (postId: string) => {
    if (!currentUser || !commentText.trim()) return;
    
    try {
      const commentRef = doc(collection(db, 'comunidadePosts', postId, 'comments'));
      const newComment = {
        userId: currentUser.uid,
        nome: currentUser.email?.split('@')[0] || 'Usuário',
        texto: commentText.trim(),
        createdAt: new Date()
      };
      
      await setDoc(commentRef, newComment);
      
      // Atualizar a lista de comentários localmente
      setPostComments(prev => [{
        id: commentRef.id,
        ...newComment
      }, ...prev]);
      
      // Atualizar contador de comentários no post
      setTrendingPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
          : post
      ));
      
      // Atualizar contador no post selecionado
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev: any) => prev ? {
          ...prev,
          commentsCount: (prev.commentsCount || 0) + 1
        } : null);
      }
      
      setCommentText('');
    } catch (error) {
      console.error('Erro ao comentar:', error);
    }
  };

  const openPostModal = async (post: any) => {
    setSelectedPost(post);
    setShowPostModal(true);
    setCommentsLoading(true);
    
    try {
      // Buscar comentários do post
      const commentsRef = collection(db, 'comunidadePosts', post.id, 'comments');
      const commentsSnapshot = await getDocs(commentsRef);
      const comments = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      
      // Ordenar comentários por data (mais recentes primeiro)
      const sortedComments = comments.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      setPostComments(sortedComments);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      setPostComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Buscar dados da meta e nome da imobiliária
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    let unsubscribe: (() => void) | undefined;

    // Buscar nome da imobiliária
    const fetchNomeImobiliaria = async () => {
      try {
        const imobiliariaRef = firestoreDoc(db, 'imobiliarias', userData.imobiliariaId!);
        const imobiliariaSnap = await getDoc(imobiliariaRef);
        if (imobiliariaSnap.exists()) {
          setNomeImobiliaria(imobiliariaSnap.data().nome || 'Imobiliária');
        }
      } catch (error) {
        console.error('Erro ao buscar nome da imobiliária:', error);
        setNomeImobiliaria('Imobiliária');
      }
    };

    fetchNomeImobiliaria();

    // Buscar meta
    const metaRef = firestoreDoc(db, 'metas', userData.imobiliariaId);
    unsubscribe = onSnapshot(metaRef, (snap) => {
      if (snap.exists()) {
        setMeta(snap.data());
      } else {
        setMeta(null);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userData]);

  function calcularVariacao(atual: string, anterior: string) {
    const a = parseFloat((atual || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    const b = parseFloat((anterior || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(a) || isNaN(b) || b === 0) return null;
    return ((a - b) / b) * 100;
  }

  const indicadoresList = [
    { key: 'cub', label: 'CUB (SC)', tipo: 'mensal' },
    { key: 'selic', label: 'SELIC', tipo: 'mensal' },
    { key: 'ipca', label: 'IPCA', tipo: 'anual' },
    { key: 'igpm', label: 'IGP-M', tipo: 'anual' },
    { key: 'incc', label: 'INCC', tipo: 'anual' },
  ];

  const EconomicIndicator = ({ title, value, variacao, subtitulo }: { title: string; value: string; variacao: number | null; subtitulo: string }) => (
    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-[#3478F6]/5 to-[#A3C8F7]/5 rounded-xl border border-[#A3C8F7]/20 min-w-[120px] cursor-pointer group hover:scale-105 hover:shadow-lg hover:border-[#3478F6]/40 transition-all duration-300 relative overflow-hidden">
      {/* Efeito de brilho no hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Borda superior que aparece no hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#3478F6] to-[#A3C8F7] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
      
      <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1 group-hover:text-[#3478F6] transition-colors duration-300">{title}</div>
      <div className="text-lg font-bold text-[#2E2F38] dark:text-white group-hover:text-[#3478F6] transition-colors duration-300">{value}</div>
      <div className="text-[10px] text-[#6B6F76] dark:text-gray-400 mb-1 group-hover:text-[#A3C8F7] transition-colors duration-300">({subtitulo})</div>
      {variacao !== null && (
        <div className={`flex items-center text-xs font-medium ${variacao >= 0 ? 'text-[#3AC17C]' : 'text-[#F45B69]'} group-hover:scale-110 transition-transform duration-300`}> 
          {variacao >= 0 ? (
            <svg className="h-3 w-3 mr-1 group-hover:animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
          ) : (
            <svg className="h-3 w-3 mr-1 group-hover:animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>
          )}
          {variacao > 0 ? '+' : ''}{variacao.toFixed(2)}%
        </div>
      )}
    </div>
  );

  const todayTasks = [
    { time: '09:00', title: 'Follow-up com João Silva', status: 'pending' as const },
    { time: '14:30', title: 'Enviar proposta para Maria', status: 'pending' as const },
    { time: '16:00', title: 'Agendar visita com Pedro', status: 'overdue' as const },
  ];

  const topCorretores = [
    { position: 1, name: 'Ana Silva', sales: '12', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', rating: 4.9 },
    { position: 2, name: 'Carlos Santos', sales: '10', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', rating: 4.7 },
    { position: 3, name: 'Mariana Costa', sales: '8', avatar: 'https://randomuser.me/api/portraits/women/3.jpg', rating: 4.5 },
  ];

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentTimeString = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-[#F5F6FA] dark:bg-[#181C23] min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header com boas-vindas, indicadores econômicos e hora em uma linha */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#3478F6] via-[#A3C8F7] to-[#6B6F76] bg-clip-text text-transparent">
                Olá, {currentUser?.email?.split('@')[0] || 'Corretor'}! <span className="text-yellow-400">👋</span>
              </h1>
            </div>
            
            {/* Indicadores econômicos compactos na mesma linha */}
            <div className="flex gap-2">
              {indicadoresExternos && indicadoresExternosAnterior && indicadoresList.map(ind => (
                <div
                  key={ind.key}
                  className="flex items-center gap-1 px-2 py-1 bg-white/60 dark:bg-[#23283A]/60 backdrop-blur-sm rounded-lg border border-[#3478F6]/20 hover:border-[#3478F6]/40 transition-all duration-200 cursor-pointer group hover:scale-105"
                >
                  <div className="text-center">
                    <div className="text-xs font-bold text-[#2E2F38] dark:text-white group-hover:text-[#3478F6] transition-colors">
                      {indicadoresExternos?.[ind.key] || '--'}
                    </div>
                    <div className="text-[10px] text-[#6B6F76] dark:text-gray-300 font-medium">
                      {ind.label}
                    </div>
                  </div>
                  {calcularVariacao(indicadoresExternos?.[ind.key], indicadoresExternosAnterior?.[ind.key]) !== null && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${
                      (calcularVariacao(indicadoresExternos?.[ind.key], indicadoresExternosAnterior?.[ind.key]) || 0) > 0 
                        ? 'text-green-500' 
                        : 'text-red-500'
                    }`}>
                      {(calcularVariacao(indicadoresExternos?.[ind.key], indicadoresExternosAnterior?.[ind.key]) || 0) > 0 ? (
                        <TrendingUpIcon className="w-2.5 h-2.5" />
                      ) : (
                        <TrendingDownIcon className="w-2.5 h-2.5" />
                      )}
                      <span>
                        {Math.abs(calcularVariacao(indicadoresExternos?.[ind.key], indicadoresExternosAnterior?.[ind.key]) || 0).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xl font-bold text-[#3478F6]">{currentTimeString}</div>
              <div className="text-xs text-[#6B6F76]">Horário atual</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda - Agenda, Avisos e Metas */}
        <div className="space-y-6">
          {/* Agenda do Dia */}
          <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#3478F6]"></div>
            <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Agenda do Dia</h2>
            {agendaLoading ? (
              <p className="text-gray-300">Carregando tarefas...</p>
            ) : agendaLeads.length === 0 ? (
              <p className="text-gray-300">Nenhuma tarefa prioritária encontrada.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="text-xs text-gray-400 uppercase">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Lead</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                    <th className="py-2 px-3 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {agendaLeads.map(lead => (
                    <tr key={lead.id} className="border-b border-gray-700 last:border-0 hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">{lead.nome}</td>
                      <td className="py-3 px-3">
                        <div className={`flex items-center gap-2 text-sm`}>
                          <span className={`h-2.5 w-2.5 ${statusInfo[lead.taskStatus as TaskStatus].color} rounded-full`}></span>
                          <span className="text-gray-300">{statusInfo[lead.taskStatus as TaskStatus].text}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Link href={`/dashboard/crm/${lead.id}`}>
                          <span className="px-4 py-1 text-sm font-semibold text-white bg-[#3478F6] hover:bg-[#255FD1] rounded-lg transition-colors cursor-pointer">
                            Abrir
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Avisos Importantes */}
          <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-6 relative overflow-hidden shadow-xl animate-fade-in flex flex-col gap-4">
            {/* Borda vermelha à esquerda */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#FF6B6B] to-[#FF8E8E]" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="relative">
                <AlertCircleIcon className="h-8 w-8 text-[#FF6B6B] drop-shadow-lg animate-pulse" />
              </div>
              <span className="font-extrabold text-white text-2xl tracking-tight drop-shadow-lg">Avisos Importantes</span>
              {/* Badge de destaque */}
              <span className="px-2 py-1 bg-[#FF6B6B]/20 text-[#FF6B6B] text-xs font-bold rounded-full border border-[#FF6B6B]/30 animate-pulse">
                ATENÇÃO
              </span>
            </div>
            <div className="space-y-3 relative z-10">
              {avisosImportantes
                .sort((a, b) => b.dataHora?.toDate() - a.dataHora?.toDate())
                .length === 0 ? (
                <p className="text-[#6B6F76] dark:text-gray-300 text-sm">Nenhum aviso importante cadastrado pela imobiliária.</p>
              ) : (
                avisosImportantes
                  .sort((a, b) => b.dataHora?.toDate() - a.dataHora?.toDate())
                  .map((aviso, idx) => (
                    <div
                      key={aviso.id}
                      className="flex items-start gap-3 p-4 rounded-xl border border-[#FF6B6B]/40 bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF8E8E]/0 shadow-lg hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group backdrop-blur-sm"
                    >
                      <div className="relative z-10">
                        <AlertCircleIcon className="h-5 w-5 text-[#FF6B6B] mt-0.5 animate-pulse" />
                      </div>
                      <div className="flex-1 relative z-10">
                        <div className="text-sm font-bold text-[#2E2F38] dark:text-white mb-1 group-hover:text-[#FF6B6B] transition-colors">
                          {aviso.titulo}
                        </div>
                        <div className="text-xs text-[#6B6F76] dark:text-gray-100 mb-2 leading-relaxed">
                          {aviso.mensagem}
                        </div>
                        <div className="text-[10px] text-[#FF6B6B] font-semibold bg-[#FF6B6B]/10 px-2 py-1 rounded-full inline-block">
                          {aviso.dataHora?.toDate ? aviso.dataHora.toDate().toLocaleString('pt-BR') : ''}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Metas */}
          <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-6 relative overflow-hidden shadow-xl animate-fade-in">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#3478F6]"></div>
            <MetasCard meta={meta} nomeImobiliaria={nomeImobiliaria} />
          </div>
        </div>

        {/* Coluna Direita - Top Trending */}
        <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-6 relative overflow-hidden shadow-xl animate-fade-in">
          {/* Borda decorativa */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#3478F6] to-[#A3C8F7]"></div>
          
          {/* Header com ícone de fogo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-white text-lg">🔥</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">HOT</span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Top Trending</h2>
              <p className="text-xs text-[#6B6F76] dark:text-gray-300">Posts mais quentes da comunidade</p>
            </div>
          </div>

          {trendingLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3478F6]"></div>
            </div>
          ) : trendingPosts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📱</div>
              <p className="text-[#6B6F76] dark:text-gray-300 text-sm">Nenhum post ainda. Seja o primeiro!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trendingPosts.map((post, index) => (
                <div 
                  key={post.id} 
                  className="group relative bg-white/60 dark:bg-[#23283A]/60 backdrop-blur-sm rounded-xl p-4 hover:bg-white/80 dark:hover:bg-[#23283A]/80 transition-all duration-300 cursor-pointer border border-white/20 hover:border-[#3478F6]/30 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                  onClick={() => openPostModal(post)}
                >
                  {/* Badge de ranking */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    #{index + 1}
                  </div>

                  {/* Header do post */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative">
                      <img src={post.avatar} alt={post.nome} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-[#23283A] shadow-md" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-[#23283A]"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[#2E2F38] dark:text-white text-sm truncate">{post.nome}</span>
                        <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                          {post.createdAt?.toDate ? 
                            post.createdAt.toDate().toLocaleString('pt-BR', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : ''
                          }
                        </span>
                      </div>
                      <div className="text-sm text-[#2E2F38] dark:text-white line-clamp-2 leading-relaxed">
                        {post.texto}
                      </div>
                    </div>
                  </div>

                  {/* Preview de mídia */}
                  {(post.file || post.youtubeData) && (
                    <div className="mb-3 relative overflow-hidden rounded-lg">
                      {post.youtubeData && (
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                          <iframe
                            src={post.youtubeData.embedUrl}
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
                      {post.file && post.fileMeta && post.fileMeta.type.startsWith('image/') && (
                        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                          <img 
                            src={post.file} 
                            alt="Post image" 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                            FOTO
                          </div>
                        </div>
                      )}
                      {post.file && post.fileMeta && post.fileMeta.type.startsWith('video/') && (
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                          <video 
                            src={post.file} 
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                          <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold">
                            VÍDEO
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Estatísticas de engajamento */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/20 dark:border-[#23283A]/20">
                    <div className="flex items-center gap-4">
                      {/* Botão Curtir */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                        disabled={isLiking === post.id}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-200 ${
                          post.userLiked 
                            ? 'text-red-500 scale-110' 
                            : 'text-[#6B6F76] dark:text-gray-300 hover:text-red-500 hover:scale-105'
                        }`}
                      >
                        {isLiking === post.id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="text-lg">{post.userLiked ? '❤️' : '🤍'}</span>
                        )}
                        <span>{post.likes || 0}</span>
                      </button>
                      
                      {/* Botão Comentar */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); openPostModal(post); }}
                        className="flex items-center gap-1.5 text-sm font-medium text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] hover:scale-105 transition-all duration-200"
                      >
                        <span className="text-lg">💬</span>
                        <span>{post.commentsCount || 0}</span>
                      </button>
                      
                      {/* Botão Repostar */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRepost(post.id); }}
                        disabled={isReposting === post.id}
                        className="flex items-center gap-1.5 text-sm font-medium text-[#6B6F76] dark:text-gray-300 hover:text-green-500 hover:scale-105 transition-all duration-200"
                      >
                        {isReposting === post.id ? (
                          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="text-lg">🔁</span>
                        )}
                        <span>{post.repostsCount || 0}</span>
                      </button>
                    </div>
                    
                    {/* Indicador de engajamento com gradiente */}
                    <div className="px-2 py-1 bg-gradient-to-r from-[#3478F6]/20 to-[#A3C8F7]/20 rounded-full border border-[#3478F6]/30">
                      <span className="text-xs font-medium text-[#3478F6] dark:text-[#A3C8F7]">
                        🔥 {post.totalEngagement}
                      </span>
                    </div>
                  </div>

                  {/* Efeito de brilho no hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              ))}
            </div>
          )}

          {/* Footer com link para comunidade */}
          <div className="mt-6 pt-4 border-t border-white/20 dark:border-[#23283A]/20">
            <Link 
              href="/dashboard/comunidade" 
              className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-gradient-to-r from-[#3478F6] to-[#A3C8F7] text-white font-semibold rounded-lg hover:from-[#255FD1] hover:to-[#3478F6] transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <span>🚀</span>
              <span>Ver mais na Comunidade</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>



      {/* Modal do Post */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-lg w-full max-w-3xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button 
              className="absolute top-4 right-4 text-2xl text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] transition-colors" 
              onClick={() => setShowPostModal(false)}
            >
              ×
            </button>
            
            {/* Header do Post com destaque */}
            <div className="bg-gradient-to-r from-[#A3C8F7]/10 to-[#3478F6]/10 rounded-xl p-6 mb-6 border border-[#3478F6]/20">
              <div className="flex items-start gap-4">
                <img src={selectedPost.avatar} alt={selectedPost.nome} className="w-16 h-16 rounded-full object-cover border-4 border-white dark:border-[#23283A] shadow-lg" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-xl text-[#2E2F38] dark:text-white">{selectedPost.nome}</span>
                    <span className="px-3 py-1 bg-[#3478F6]/20 text-[#3478F6] text-xs font-semibold rounded-full">
                      Post em Destaque
                    </span>
                  </div>
                  <div className="text-sm text-[#6B6F76] dark:text-gray-300 mb-3">
                    {selectedPost.createdAt?.toDate ? 
                      selectedPost.createdAt.toDate().toLocaleString('pt-BR', { 
                        weekday: 'long',
                        day: '2-digit', 
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : ''
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo do Post */}
            <div className="bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl p-4 mb-4">
              <div className="text-base text-[#2E2F38] dark:text-white leading-relaxed whitespace-pre-wrap mb-3">
                {selectedPost.texto}
              </div>
              
              {/* Mídia do Post */}
              {selectedPost.file && selectedPost.fileMeta && (
                <div className="mt-3">
                  {selectedPost.fileMeta.type.startsWith('image/') && (
                    <div className="relative">
                      <img 
                        src={selectedPost.file} 
                        alt={selectedPost.fileMeta.name} 
                        className="w-full max-h-64 object-contain rounded-lg border border-[#E8E9F1] dark:border-[#23283A]" 
                      />
                    </div>
                  )}
                  
                  {selectedPost.fileMeta.type.startsWith('video/') && (
                    <div className="relative">
                      <video 
                        src={selectedPost.file} 
                        controls 
                        className="w-full max-h-64 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-black" 
                      />
                    </div>
                  )}
                  
                  {selectedPost.fileMeta.type === 'application/pdf' && (
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#23283A] rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
                      <span className="text-2xl text-red-500">📄</span>
                      <div className="flex-1">
                        <div className="font-semibold text-[#2E2F38] dark:text-white text-sm">
                          {selectedPost.fileMeta.name}
                        </div>
                      </div>
                      <a 
                        href={selectedPost.file} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded text-sm font-medium transition-colors"
                      >
                        Abrir
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              {/* Indicação de Repost */}
              {selectedPost.repostOf && (
                <div className="mt-3 p-2 bg-[#3478F6]/10 border border-[#3478F6]/20 rounded-lg">
                  <div className="flex items-center gap-2 text-[#3478F6] text-xs">
                    <span>🔁</span>
                    <span>Repost</span>
                    {selectedPost.repostComment && (
                      <span className="text-[#2E2F38] dark:text-white">
                        com comentário: "{selectedPost.repostComment}"
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Estatísticas do Post */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                <div className="text-lg font-bold text-[#3478F6]">{selectedPost.likes || 0}</div>
                <div className="text-xs text-[#6B6F76] dark:text-gray-300">Curtidas</div>
              </div>
              <div className="text-center p-3 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                <div className="text-lg font-bold text-[#3478F6]">{selectedPost.commentsCount || 0}</div>
                <div className="text-xs text-[#6B6F76] dark:text-gray-300">Comentários</div>
              </div>
              <div className="text-center p-3 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                <div className="text-lg font-bold text-[#3478F6]">{selectedPost.repostsCount || 0}</div>
                <div className="text-xs text-[#6B6F76] dark:text-gray-300">Reposts</div>
              </div>
            </div>

            {/* Botões de Interação */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#E8E9F1] dark:border-[#23283A]">
              <button 
                onClick={() => handleLike(selectedPost.id)}
                disabled={isLiking === selectedPost.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedPost.userLiked 
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                    : 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-red-500/10 hover:text-red-500 border border-[#E8E9F1] dark:border-[#23283A]'
                }`}
              >
                {isLiking === selectedPost.id ? (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-lg">{selectedPost.userLiked ? '❤️' : '🤍'}</span>
                )}
                <span className="text-sm font-medium">Curtir</span>
              </button>
              
              <button 
                onClick={() => handleRepost(selectedPost.id)}
                disabled={isReposting === selectedPost.id}
                className="flex items-center gap-2 px-4 py-2 bg-[#F5F6FA] dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 rounded-lg hover:bg-green-500/10 hover:text-green-500 transition-colors border border-[#E8E9F1] dark:border-[#23283A]"
              >
                {isReposting === selectedPost.id ? (
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-lg">🔁</span>
                )}
                <span className="text-sm font-medium">Repostar</span>
              </button>
            </div>

            {/* Seção de Comentários */}
            <div>
              <h3 className="font-semibold text-[#2E2F38] dark:text-white mb-3 flex items-center gap-2">
                <span>💬</span>
                Comentários ({selectedPost.commentsCount || 0})
              </h3>
              
              {/* Input para novo comentário */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Adicione um comentário sobre este post..."
                  className="flex-1 px-3 py-2 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6] text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleComment(selectedPost.id)}
                />
                <button
                  onClick={() => handleComment(selectedPost.id)}
                  disabled={!commentText.trim()}
                  className="px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-[#6B6F76] disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Comentar
                </button>
              </div>

              {/* Lista de comentários */}
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {commentsLoading ? (
                  <div className="text-center text-[#6B6F76] dark:text-gray-300 text-sm py-6 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                    <div className="text-xl mb-2">💭</div>
                    <div>Carregando comentários...</div>
                  </div>
                ) : postComments.length === 0 ? (
                  <div className="text-center text-[#6B6F76] dark:text-gray-300 text-sm py-6 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                    <div className="text-xl mb-2">💭</div>
                    <div>Nenhum comentário encontrado para este post.</div>
                    <div className="text-xs mt-1">Seja o primeiro a comentar!</div>
                  </div>
                ) : (
                  postComments.map((comment) => (
                    <div key={comment.id} className="bg-white/50 dark:bg-[#23283A]/50 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={comment.userId === currentUser?.uid ? currentUser?.photoURL || 'https://via.placeholder.com/24' : 'https://via.placeholder.com/24'} alt={comment.nome} className="w-5 h-5 rounded-full object-cover" />
                        <span className="font-semibold text-[#2E2F38] dark:text-white text-sm">{comment.nome}</span>
                        <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                          {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString('pt-BR') : ''}
                        </span>
                      </div>
                      <p className="text-[#2E2F38] dark:text-white text-sm">{comment.texto}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 