'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, query, where, onSnapshot, doc as firestoreDoc, getDoc, Timestamp, orderBy, limit, deleteDoc, setDoc, doc, serverTimestamp, updateDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { PIPELINE_STAGES } from '@/lib/constants';
import AvisosImportantesModal from './_components/AvisosImportantesModal';
import AgendaImobiliariaModal from './_components/AgendaImobiliariaModal';
import PlantoesModal from './_components/PlantoesModal';

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

const NotesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
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

const Card = ({ children, className = '', glow }: { children: React.ReactNode, className?: string; glow?: boolean }) => (
  <div className={`rounded-2xl p-6 hover-lift ${glow ? 'card-glow' : 'bg-background-card border border-[var(--border-subtle)]'} ${className}`}>{children}</div>
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
    <div className="text-xl font-bold text-text-primary mb-1">{value}</div>
    <div className="text-xs text-text-secondary">{title}</div>
  </Card>
);

// Substituir EconomicIndicator por um componente mais simples, sem variação
const SimpleIndicator = ({ title, value }: { title: string; value: string }) => (
  <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-r from-[#D4A017]/5 to-[#E8C547]/5 rounded-lg border border-[#E8C547]/20 min-w-[120px] animate-slide-in">
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
    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-r-full opacity-60"></div>
  </div>
);

// Funções para o card de notas
const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'Urgente': return '🚨';
    case 'Importante': return '⚠️';
    case 'Circunstancial': return 'ℹ️';
    default: return '📝';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Urgente': return 'bg-red-500 text-white';
    case 'Importante': return 'bg-orange-500 text-white';
    case 'Circunstancial': return 'bg-amber-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};



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
  'Tarefa Futura': { color: 'bg-amber-500', text: 'Futura' }
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

// Formata data salva como YYYY-MM-DD para exibição em pt-BR (evita mudar de dia por UTC)
const formatMetaDate = (value: string | undefined) => {
  if (!value) return '--';
  const s = typeof value === 'string' ? value.split('T')[0] : '';
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return '--';
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
};

// Novo Card de Metas moderno
const MetasCard = ({ meta, nomeImobiliaria }: { meta: any, nomeImobiliaria: string }) => {
  // Usar o percentual salvo no Firestore, ou calcular automaticamente se não existir
  const progresso = meta?.percentual !== undefined ? meta.percentual : (meta && meta.valor > 0 ? Math.round(((meta.alcancado ?? 0) / meta.valor) * 100) : 0);
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
        barra: 'from-[#E8C547] to-[#D4A017]',
        percentual: 'text-[#D4A017]',
        percentualBg: 'bg-[#D4A017]/10'
      };
    }
  };

  const colors = getProgressColors();

  return (
    <div className="flex flex-col gap-3 p-6 rounded-2xl shadow-xl bg-gradient-to-br from-[#E8C547]/30 to-[#D4A017]/10 border-2 border-[#D4A017]/20 min-h-[200px] relative overflow-hidden">
      {/* Borda azul à esquerda */}
      <div className="absolute top-0 left-0 w-1 h-full bg-[#D4A017]" />
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <svg className="h-6 w-6 text-[#D4A017]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span className="font-bold text-white text-lg tracking-tight">Metas</span>
        {nomeImobiliaria && (
          <span className="ml-2 px-2 py-0.5 rounded bg-[#D4A017]/10 text-[#D4A017] text-xs font-semibold">{nomeImobiliaria}</span>
        )}
      </div>
      {/* Datas (mesmo formato do admin, sem deslocamento por fuso) */}
      <div className="flex items-center gap-2 text-xs text-[#E8C547] mb-2">
        <span className="font-semibold">Início:</span>
        <span className="text-white">{formatMetaDate(meta?.inicio)}</span>
        <span>|</span>
        <span className="font-semibold">Fim:</span>
        <span className="text-white">{formatMetaDate(meta?.fim)}</span>
      </div>
      {/* Valores principais */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex flex-col">
          <span className="text-xs text-[#E8C547]">VGV da Meta</span>
          <span className="text-xl font-bold text-[#D4A017]">{meta?.valor ? meta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-[#E8C547]">Já Realizado</span>
          <span className={`text-xl font-bold ${progresso >= 100 ? 'text-[#3AC17C]' : 'text-[#D4A017]'}`}>{typeof meta?.alcancado === 'number' ? meta.alcancado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}</span>
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
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [agendaLeads, setAgendaLeads] = useState<any[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [funilPessoal, setFunilPessoal] = useState<Record<string, number>>({});
  const [tarefaAtrasadaCount, setTarefaAtrasadaCount] = useState(0);
  const [tarefaDiaCount, setTarefaDiaCount] = useState(0);
  const [semTarefaCount, setSemTarefaCount] = useState(0);
  const [avisosImportantes, setAvisosImportantes] = useState<any[]>([]);
  const [agendaImobiliaria, setAgendaImobiliaria] = useState<any[]>([]);
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
  const [isCommenting, setIsCommenting] = useState<string | null>(null);
  const [showEmojiRepost, setShowEmojiRepost] = useState(false);
  const [repostWithComment, setRepostWithComment] = useState(false);
  const [repostComment, setRepostComment] = useState('');
  const [repostInputId, setRepostInputId] = useState<string | null>(null);
  const [novoPostComunidade, setNovoPostComunidade] = useState('');
  const [postandoComunidade, setPostandoComunidade] = useState(false);
  const [fileComunidade, setFileComunidade] = useState<File | null>(null);
  const [filePreviewComunidade, setFilePreviewComunidade] = useState<string | null>(null);
  const [youtubeLinkComunidade, setYoutubeLinkComunidade] = useState('');
  const [youtubePreviewComunidade, setYoutubePreviewComunidade] = useState<{ videoId: string; embedUrl: string; thumbnail: string; url: string; isShort: boolean } | null>(null);
  const [showEmojiComunidade, setShowEmojiComunidade] = useState(false);
  const [showEmojiComment, setShowEmojiComment] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [selectedPostForLikes, setSelectedPostForLikes] = useState<any>(null);
  const [postLikes, setPostLikes] = useState<any[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  
  // Estado para o modal de avisos importantes
  const [showAvisosModal, setShowAvisosModal] = useState(false);
  
  // Estado para o modal de agenda imobiliária
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [plantoes, setPlantoes] = useState<any[]>([]);
  const [showPlantoesModal, setShowPlantoesModal] = useState(false);

  // Função para voltar ao topo da seção de trending
  const scrollToTrendingTop = () => {
    const trendingSection = document.getElementById('trending-section');
    if (trendingSection) {
      trendingSection.scrollIntoView({ behavior: 'smooth' });
    }
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

  // Atualizar hora a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Indicadores econômicos (CUB, SELIC, etc.) são exibidos no header pelo layout

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
        // Funil pessoal: contagem por etapa
        const porEtapa: Record<string, number> = {};
        PIPELINE_STAGES.forEach(e => { porEtapa[e] = 0; });
        allLeads.forEach((lead: any) => {
          const etapa = lead.etapa || PIPELINE_STAGES[0];
          if (PIPELINE_STAGES.includes(etapa)) porEtapa[etapa] = (porEtapa[etapa] || 0) + 1;
        });
        setFunilPessoal(porEtapa);
        // Contagens: Tarefa em Atraso, Tarefa do Dia, Sem tarefa
        setTarefaAtrasadaCount(settledLeads.filter(l => l.taskStatus === 'Tarefa em Atraso').length);
        setTarefaDiaCount(settledLeads.filter(l => l.taskStatus === 'Tarefa do Dia').length);
        setSemTarefaCount(settledLeads.filter(l => l.taskStatus === 'Sem tarefa').length);
        // Lista para compatibilidade (ex.: link Ver Completa)
        const leadsToShow = settledLeads.filter(lead => lead.taskStatus !== 'Tarefa Futura');
        leadsToShow.sort((a, b) => TAREFA_STATUS_ORDER.indexOf(a.taskStatus) - TAREFA_STATUS_ORDER.indexOf(b.taskStatus));
        setAgendaLeads(leadsToShow);
      } catch (error) {
        console.error('Erro ao buscar agenda:', error);
        setAgendaLeads([]);
        setFunilPessoal({});
        setTarefaAtrasadaCount(0);
        setTarefaDiaCount(0);
        setSemTarefaCount(0);
      } finally {
        setAgendaLoading(false);
      }
    };
    fetchAgenda();
  }, [currentUser]);

  // Buscar avisos importantes
  useEffect(() => {
    const fetchAvisos = async () => {
      console.log('fetchAvisos chamado, userData:', userData);
      if (!userData?.imobiliariaId) {
        console.log('userData ou imobiliariaId não encontrado');
        return;
      }
      console.log('Buscando avisos para imobiliariaId:', userData.imobiliariaId);
      const q = query(collection(db, 'avisosImportantes'), where('imobiliariaId', '==', userData.imobiliariaId));
      const snapshot = await getDocs(q);
      console.log('Avisos encontrados:', snapshot.docs.length);
      setAvisosImportantes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchAvisos();
  }, [userData]);

  // Buscar agenda imobiliária
  useEffect(() => {
    const fetchAgendaImobiliaria = async () => {
      if (!userData?.imobiliariaId) return;
      try {
        const q = query(collection(db, 'agendaImobiliaria'), where('imobiliariaId', '==', userData.imobiliariaId));
        const snapshot = await getDocs(q);
        setAgendaImobiliaria(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Erro ao buscar agenda imobiliária:', error);
        setAgendaImobiliaria([]);
      }
    };
    fetchAgendaImobiliaria();
  }, [userData]);

  // Buscar plantões
  useEffect(() => {
    const fetchPlantoes = async () => {
      if (!userData?.imobiliariaId) return;
      try {
        const q = query(collection(db, 'plantoes'), where('imobiliariaId', '==', userData.imobiliariaId));
        const snapshot = await getDocs(q);
        setPlantoes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Erro ao buscar plantões:', error);
        setPlantoes([]);
      }
    };
    fetchPlantoes();
  }, [userData]);

  // Labels do tipo da agenda (igual ao admin)
  const getTipoAgendaLabel = (tipo: string) => {
    const map: Record<string, string> = {
      reuniao: 'Reunião',
      evento: 'Evento',
      treinamento: 'Treinamento',
      'revisar-crm': 'Revisar CRM',
      'ligacao-ativa': 'Ligação Ativa',
      'acao-de-rua': 'Ação de rua',
      'disparo-de-msg': 'Disparo de Msg',
      outro: 'Outro'
    };
    return map[tipo] || tipo;
  };

  // Eventos/plantões em que o usuário foi marcado e ainda NÃO respondeu — ordenado do mais próximo no tempo
  const eventosEmQueFuiMarcado = useMemo(() => {
    const uid = currentUser?.uid;
    if (!uid) return [];
    const lista: {
      tipo: 'plantao' | 'agenda';
      id: string;
      titulo: string;
      tipoLabel: string;
      dataStr: string;
      horarioStr: string;
      sortTime: number;
      respostasPresenca?: Record<string, string>;
    }[] = [];
    plantoes.forEach((p: any) => {
      if (!Array.isArray(p.presentesIds) || !p.presentesIds.includes(uid)) return;
      if (p.respostasPresenca?.[uid]) return; // já respondeu → não aparece
      const dataInicio = p.dataInicio || '';
      const horario = p.horario || '00:00';
      const sortTime = dataInicio && horario ? new Date(`${dataInicio}T${horario.substring(0, 5)}`).getTime() : 0;
      const dataStr = dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      lista.push({
        tipo: 'plantao',
        id: p.id,
        titulo: p.construtora ? `Plantão — ${p.construtora}` : 'Plantão',
        tipoLabel: 'Plantão',
        dataStr,
        horarioStr: horario.substring(0, 5),
        sortTime,
        respostasPresenca: p.respostasPresenca
      });
    });
    agendaImobiliaria.forEach((a: any) => {
      if (!Array.isArray(a.presentesIds) || !a.presentesIds.includes(uid)) return;
      if (a.respostasPresenca?.[uid]) return; // já respondeu → não aparece
      const dt = a.dataInicio?.toDate ? a.dataInicio.toDate() : (a.dataInicio ? new Date(a.dataInicio) : null);
      const sortTime = dt ? dt.getTime() : 0;
      const dataStr = dt ? dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      const horarioStr = dt ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      lista.push({
        tipo: 'agenda',
        id: a.id,
        titulo: a.titulo || 'Evento',
        tipoLabel: getTipoAgendaLabel(a.tipo || 'outro'),
        dataStr,
        horarioStr,
        sortTime,
        respostasPresenca: a.respostasPresenca
      });
    });
    lista.sort((a, b) => a.sortTime - b.sortTime); // mais próximo primeiro
    return lista;
  }, [currentUser?.uid, plantoes, agendaImobiliaria]);

  // Próximo evento em que o usuário está CONFIRMADO (participa de 1 por vez) — atualiza conforme o horário
  const proximoEventoConfirmado = useMemo(() => {
    const uid = currentUser?.uid;
    const now = currentTime.getTime();
    if (!uid) return null;
    const lista: { tipo: 'plantao' | 'agenda'; id: string; titulo: string; tipoLabel: string; dataStr: string; horarioStr: string; sortTime: number }[] = [];
    plantoes.forEach((p: any) => {
      if (!Array.isArray(p.presentesIds) || !p.presentesIds.includes(uid)) return;
      if (p.respostasPresenca?.[uid] !== 'confirmado') return;
      const dataInicio = p.dataInicio || '';
      const dataFim = p.dataFim || dataInicio;
      const horario = (p.horario || '00:00').substring(0, 5);
      const start = dataInicio ? new Date(`${dataInicio}T${horario}`).getTime() : 0;
      if (start > now) {
        const dataStr = dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        lista.push({
          tipo: 'plantao',
          id: p.id,
          titulo: p.construtora ? `Plantão — ${p.construtora}` : 'Plantão',
          tipoLabel: 'Plantão',
          dataStr,
          horarioStr: horario,
          sortTime: start
        });
      } else if (dataFim && dataInicio) {
        const dIni = new Date(dataInicio);
        const dFim = new Date(dataFim);
        for (let d = new Date(dIni); d <= dFim; d.setDate(d.getDate() + 1)) {
          const dt = new Date(`${d.toISOString().slice(0, 10)}T${horario}`);
          if (dt.getTime() > now) {
            lista.push({
              tipo: 'plantao',
              id: p.id,
              titulo: p.construtora ? `Plantão — ${p.construtora}` : 'Plantão',
              tipoLabel: 'Plantão',
              dataStr: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              horarioStr: horario,
              sortTime: dt.getTime()
            });
            break;
          }
        }
      }
    });
    agendaImobiliaria.forEach((a: any) => {
      if (!Array.isArray(a.presentesIds) || !a.presentesIds.includes(uid)) return;
      if (a.respostasPresenca?.[uid] !== 'confirmado') return;
      const dt = a.dataInicio?.toDate ? a.dataInicio.toDate() : (a.dataInicio ? new Date(a.dataInicio) : null);
      const sortTime = dt ? dt.getTime() : 0;
      if (sortTime <= now) return;
      const dataStr = dt ? dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      const horarioStr = dt ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      lista.push({
        tipo: 'agenda',
        id: a.id,
        titulo: a.titulo || 'Evento',
        tipoLabel: getTipoAgendaLabel(a.tipo || 'outro'),
        dataStr,
        horarioStr,
        sortTime
      });
    });
    lista.sort((a, b) => a.sortTime - b.sortTime);
    return lista[0] ?? null;
  }, [currentUser?.uid, plantoes, agendaImobiliaria, currentTime]);

  const [respondendoPresenca, setRespondendoPresenca] = useState<string | null>(null);
  const responderPresenca = async (tipo: 'plantao' | 'agenda', id: string, status: 'confirmado' | 'cancelado') => {
    const uid = currentUser?.uid;
    if (!uid) return;
    const key = `${tipo}-${id}`;
    setRespondendoPresenca(key);
    try {
      const col = tipo === 'plantao' ? 'plantoes' : 'agendaImobiliaria';
      const ref = doc(db, col, id);
      const item = tipo === 'plantao' ? plantoes.find((p: any) => p.id === id) : agendaImobiliaria.find((a: any) => a.id === id);
      const atuais = (item?.respostasPresenca || {}) as Record<string, string>;
      await updateDoc(ref, { respostasPresenca: { ...atuais, [uid]: status } });
      if (tipo === 'plantao') {
        setPlantoes(prev => prev.map((p: any) => p.id === id ? { ...p, respostasPresenca: { ...atuais, [uid]: status } } : p));
      } else {
        setAgendaImobiliaria(prev => prev.map((a: any) => a.id === id ? { ...a, respostasPresenca: { ...atuais, [uid]: status } } : a));
      }
    } catch (e) {
      console.error('Erro ao atualizar presença:', e);
    } finally {
      setRespondendoPresenca(null);
    }
  };

  useEffect(() => {
    const fetchTrendingPosts = async () => {
      console.log('fetchTrendingPosts chamado, userData:', userData);
      if (!userData?.imobiliariaId) {
        console.log('userData ou imobiliariaId não encontrado para trending posts');
        return;
      }
      setTrendingLoading(true);
      try {
        const postsRef = collection(db, 'comunidadePosts');
        const q = query(postsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        console.log('Posts encontrados:', snapshot.docs.length);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Buscar contadores de comentários e reposts para cada post
        const postsWithCounts = await Promise.all(
          posts.map(async (post: any) => {
            const commentsSnapshot = await getDocs(collection(db, 'comunidadePosts', post.id, 'comments'));
            const repostsSnapshot = await getDocs(collection(db, 'comunidadePosts', post.id, 'reposts'));
            const likesSnapshot = await getDocs(collection(db, 'comunidadePosts', post.id, 'likes'));
            
            // Verificar se o usuário atual já curtiu o post
            const userLikeDoc = await getDoc(doc(db, 'comunidadePosts', post.id, 'likes', currentUser?.uid || ''));
            
            // Buscar nome do autor original se for repost
            let repostAuthorName = '';
            let originalTexto = '';
            let originalCreatedAt = '';
            let originalFile = '';
            let originalFileMeta = null;
            let originalYoutubeData = null;
            if (post.repostOf) {
              try {
                const originalDoc = await getDoc(doc(db, 'comunidadePosts', post.repostOf));
                if (originalDoc.exists()) {
                  const data = originalDoc.data();
                  repostAuthorName = data.nome || 'Original';
                  originalTexto = data.texto || '';
                  originalCreatedAt = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                  originalFile = data.file || '';
                  originalFileMeta = data.fileMeta || null;
                  originalYoutubeData = data.youtubeData || null;
                }
              } catch {}
            }
            return {
              ...post,
              likes: likesSnapshot.size, // Usar o contador real do Firestore
              commentsCount: commentsSnapshot.size,
              repostsCount: repostsSnapshot.size,
              totalEngagement: likesSnapshot.size + commentsSnapshot.size + repostsSnapshot.size + (post.views || 0),
              userLiked: userLikeDoc.exists(),
              repostAuthorName,
              originalTexto,
              originalCreatedAt,
              originalFile,
              originalFileMeta,
              originalYoutubeData,
            };
          })
        );
        
        // Ordenar por ordem cronológica de post (mais recentes primeiro)
        const sortedPosts = postsWithCounts.sort((a, b) => {
          const aCreatedAt = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bCreatedAt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          
          // Ordenar por data de criação (mais recentes primeiro)
          return bCreatedAt.getTime() - aCreatedAt.getTime();
        });
        setTrendingPosts(sortedPosts);
      } catch (error) {
        console.error('Erro ao buscar posts trending:', error);
        setTrendingPosts([]);
      } finally {
        setTrendingLoading(false);
      }
    };
    fetchTrendingPosts();
  }, [userData, currentUser]);

  // Verificar likes do usuário em tempo real para sincronizar com comunidade
  useEffect(() => {
    if (!currentUser || !trendingPosts.length) return;
    
    const unsubscribes: any[] = [];
    
    trendingPosts.forEach((post) => {
      // Listener para likes
      const unsubLike = onSnapshot(
        doc(db, "comunidadePosts", post.id, "likes", currentUser.uid),
        (snapshot) => {
          setTrendingPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, userLiked: snapshot.exists() }
              : p
          ));
        },
        (error) => {
          console.error('Erro no listener de userLiked:', error);
        }
      );
      
      // Listener para contadores de likes
      const unsubLikesCount = onSnapshot(
        collection(db, "comunidadePosts", post.id, "likes"),
        (snapshot) => {
          setTrendingPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, likes: snapshot.size }
              : p
          ));
        },
        (error) => {
          console.error('Erro no listener de likes count:', error);
        }
      );
      
      // Listener para contadores de comentários
      const unsubCommentsCount = onSnapshot(
        collection(db, "comunidadePosts", post.id, "comments"),
        (snapshot) => {
          setTrendingPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, commentsCount: snapshot.size }
              : p
          ));
        },
        (error) => {
          console.error('Erro no listener de comments count:', error);
        }
      );
      
      // Listener para contadores de reposts
      const unsubRepostsCount = onSnapshot(
        collection(db, "comunidadePosts", post.id, "reposts"),
        (snapshot) => {
          setTrendingPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, repostsCount: snapshot.size }
              : p
          ));
        },
        (error) => {
          console.error('Erro no listener de reposts count:', error);
        }
      );
      
      unsubscribes.push(unsubLike, unsubLikesCount, unsubCommentsCount, unsubRepostsCount);
    });
    
    return () => { 
      unsubscribes.forEach((unsub) => {
        try {
          unsub();
        } catch (error) {
          console.error('Erro ao desinscrever listener:', error);
        }
      }); 
    };
  }, [trendingPosts, currentUser]);

  // Funções para interatividade
  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    
    setIsLiking(postId);
    try {
      const likeRef = doc(db, 'comunidadePosts', postId, 'likes', currentUser.uid);
      const likeDoc = await getDoc(likeRef);
      
                  if (likeDoc.exists()) {
              // Remover like - deixar os listeners em tempo real atualizarem o contador
              await deleteDoc(likeRef);
              // Atualizar apenas o status do usuário imediatamente
              setTrendingPosts(prev => prev.map(post => 
                post.id === postId 
                  ? { ...post, userLiked: false }
                  : post
              ));
              // Atualizar post selecionado no modal
              setSelectedPost((prev: any) => prev && prev.id === postId ? {
                ...prev,
                userLiked: false
              } : prev);
            } else {
              // Adicionar like - deixar os listeners em tempo real atualizarem o contador
              await setDoc(likeRef, { 
                userId: currentUser.uid, 
                timestamp: serverTimestamp(),
                userName: userData?.nome || currentUser.email?.split("@")[0] || "Usuário"
              });
              // Atualizar apenas o status do usuário imediatamente
              setTrendingPosts(prev => prev.map(post => 
                post.id === postId 
                  ? { ...post, userLiked: true }
                  : post
              ));
              // Atualizar post selecionado no modal
              setSelectedPost((prev: any) => prev && prev.id === postId ? {
                ...prev,
                userLiked: true
              } : prev);
            }
    } catch (error) {
      console.error('Erro ao curtir post:', error);
      // Em caso de erro, reverter o estado
      setTrendingPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, userLiked: !post.userLiked }
          : post
      ));
    } finally {
      setIsLiking(null);
    }
  };

  const handleShowLikes = async (post: any) => {
    setSelectedPostForLikes(post);
    setShowLikesModal(true);
    setLoadingLikes(true);
    
    try {
      const likesRef = collection(db, 'comunidadePosts', post.id, 'likes');
      const likesSnapshot = await getDocs(likesRef);
      const likesData = likesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPostLikes(likesData);
    } catch (error) {
      console.error('Erro ao buscar likes:', error);
      setPostLikes([]);
    } finally {
      setLoadingLikes(false);
    }
  };

  const handleRepost = async (postId: string, comment?: string) => {
    if (!currentUser) return;
    setIsReposting(postId);
    try {
      // Buscar dados do post original
      const originalDoc = await getDoc(doc(db, 'comunidadePosts', postId));
      if (!originalDoc.exists()) return;
      const original = originalDoc.data();
      // Criar novo post na coleção comunidadePosts
      await setDoc(doc(collection(db, 'comunidadePosts')), {
        texto: original.texto,
        userId: currentUser.uid,
        nome: currentUser.email?.split('@')[0] || 'Usuário',
        email: currentUser.email || '',
        avatar: original.avatar,
        createdAt: new Date(),
        likes: 0,
        likedBy: [],
        comments: [],
        file: original.file,
        fileMeta: original.fileMeta,
        youtubeLink: original.youtubeLink || null,
        youtubeData: original.youtubeData || null,
        repostOf: postId,
        repostComment: comment || '',
      });
      // Marcar repost na subcoleção para controle
      await setDoc(doc(db, 'comunidadePosts', postId, 'reposts', currentUser.uid), {
        userId: currentUser.uid,
        timestamp: new Date(),
        comment: comment || '',
      });
      setTrendingPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, repostsCount: (post.repostsCount || 0) + 1 }
          : post
      ));
      setSelectedPost((prev: any) => prev && prev.id === postId ? {
        ...prev,
        repostsCount: (prev.repostsCount || 0) + 1
      } : prev);
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

  const getComunidadeAvatar = () => {
    if (userData?.photoURL) return userData.photoURL;
    const nome = userData?.nome || currentUser?.email?.split('@')[0] || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=random`;
  };
  const getComunidadeNome = () => userData?.nome || currentUser?.email?.split('@')[0] || 'Usuário';

  const handleFileComunidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) return;
    setFileComunidade(f);
    const reader = new FileReader();
    reader.onload = () => setFilePreviewComunidade(reader.result as string);
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1];
  };
  const isYouTubeShort = (url: string) => url.includes('/shorts/') || url.includes('youtube.com/shorts/');
  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return undefined;
    return isYouTubeShort(url)
      ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&autoplay=0`
      : `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`;
  };
  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined;
  };
  const handleYoutubeLinkChangeComunidade = (link: string) => {
    setYoutubeLinkComunidade(link);
    if (link.trim()) {
      const videoId = getYouTubeVideoId(link);
      if (videoId) {
        setYoutubePreviewComunidade({
          videoId,
          embedUrl: getYouTubeEmbedUrl(link)!,
          thumbnail: getYouTubeThumbnail(link)!,
          url: link,
          isShort: isYouTubeShort(link),
        });
      } else {
        setYoutubePreviewComunidade(null);
      }
    } else {
      setYoutubePreviewComunidade(null);
    }
  };
  const handleEmojiSelectComunidade = (emoji: { native: string }) => {
    setNovoPostComunidade(prev => prev + emoji.native);
  };

  const handlePostarComunidade = async () => {
    if (!currentUser || (!novoPostComunidade.trim() && !fileComunidade && !youtubePreviewComunidade)) return;
    setPostandoComunidade(true);
    try {
      let fileUrl: string | null = null;
      let fileMeta: { name: string; type: string } | null = null;
      if (fileComunidade) {
        const fileName = `${Date.now()}_${fileComunidade.name}`;
        const folder = fileComunidade.type.startsWith('image/') ? 'images' : 'videos';
        const storageRef = ref(storage, `comunidade/${currentUser.uid}/${folder}/${fileName}`);
        await uploadBytes(storageRef, fileComunidade);
        fileUrl = await getDownloadURL(storageRef);
        fileMeta = { name: fileComunidade.name, type: fileComunidade.type };
      }
      const postData = {
        texto: novoPostComunidade.trim() || '',
        userId: currentUser.uid,
        nome: getComunidadeNome(),
        email: currentUser.email || '',
        avatar: getComunidadeAvatar(),
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        comments: [],
        file: fileUrl,
        fileMeta,
        youtubeLink: youtubePreviewComunidade ? youtubePreviewComunidade.url : null,
        youtubeData: youtubePreviewComunidade ? { videoId: youtubePreviewComunidade.videoId, embedUrl: youtubePreviewComunidade.embedUrl, thumbnail: youtubePreviewComunidade.thumbnail } : null,
        ...(userData?.imobiliariaId && { imobiliariaId: userData.imobiliariaId }),
      };
      const docRef = await addDoc(collection(db, 'comunidadePosts'), postData);
      const newPost = {
        id: docRef.id,
        ...postData,
        createdAt: { toDate: () => new Date() },
        userLiked: false,
        likes: 0,
        commentsCount: 0,
        repostsCount: 0,
        totalEngagement: 0,
        avatar: getComunidadeAvatar(),
        nome: getComunidadeNome(),
        youtubeData: youtubePreviewComunidade ? { videoId: youtubePreviewComunidade.videoId, embedUrl: youtubePreviewComunidade.embedUrl, thumbnail: youtubePreviewComunidade.thumbnail } : null,
      };
      setTrendingPosts(prev => [newPost, ...prev]);
      setNovoPostComunidade('');
      setFileComunidade(null);
      setFilePreviewComunidade(null);
      setYoutubeLinkComunidade('');
      setYoutubePreviewComunidade(null);
      setShowEmojiComunidade(false);
    } catch (error) {
      console.error('Erro ao criar post:', error);
    } finally {
      setPostandoComunidade(false);
    }
  };

  const openPostModal = async (post: any) => {
    setSelectedPost(post);
    setShowPostModal(true);
    setCommentsLoading(true);
    
    try {
      const commentsRef = collection(db, "comunidadePosts", post.id, "comments");
      const commentsSnapshot = await getDocs(commentsRef);
      const comments = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPostComments(comments);
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const openLeadModal = async (lead: any) => {
    // Redirecionar para a página de detalhes do lead
    router.push(`/dashboard/crm/${lead.id}`);
  };

  // Buscar dados da meta e nome da imobiliária
  useEffect(() => {
    console.log('useEffect metas chamado, userData:', userData);
    if (!userData?.imobiliariaId) {
      console.log('userData ou imobiliariaId não encontrado para metas');
      return;
    }
    console.log('Buscando metas para imobiliariaId:', userData.imobiliariaId);
    let unsubscribe: (() => void) | undefined;

    // Buscar nome da imobiliária
    const fetchNomeImobiliaria = async () => {
      try {
        console.log('Buscando nome da imobiliária...');
        const imobiliariaRef = firestoreDoc(db, 'imobiliarias', userData.imobiliariaId!);
        const imobiliariaSnap = await getDoc(imobiliariaRef);
        if (imobiliariaSnap.exists()) {
          const nome = imobiliariaSnap.data().nome || 'Imobiliária';
          console.log('Nome da imobiliária encontrado:', nome);
          setNomeImobiliaria(nome);
        } else {
          console.log('Imobiliária não encontrada no Firestore');
          setNomeImobiliaria('Imobiliária');
        }
      } catch (error) {
        console.error('Erro ao buscar nome da imobiliária:', error);
        setNomeImobiliaria('Imobiliária');
      }
    };

    fetchNomeImobiliaria();

    // Buscar meta
    console.log('Configurando listener para metas...');
    const metaRef = firestoreDoc(db, 'metas', userData.imobiliariaId);
    unsubscribe = onSnapshot(metaRef, (snap) => {
      if (snap.exists()) {
        console.log('Meta encontrada:', snap.data());
        setMeta(snap.data());
      } else {
        console.log('Meta não encontrada');
        setMeta(null);
      }
    });

    // Carregar notas do usuário
    if (currentUser) {
      const q = query(
        collection(db, 'notes'),
        where('userId', '==', currentUser.uid),
        orderBy('criadoEm', 'desc')
      );

      const notesUnsubscribe = onSnapshot(q, (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotes(notesData);
      }, (error) => {
        console.error('Erro ao carregar notas:', error);
      });

      return () => {
        if (unsubscribe) {
          console.log('Desconectando listener de metas');
          unsubscribe();
        }
        notesUnsubscribe();
      };
    }

    return () => {
      if (unsubscribe) {
        console.log('Desconectando listener de metas');
        unsubscribe();
      }
    };
  }, [userData, currentUser]);

  function calcularVariacao(atual: string, anterior: string) {
    const a = parseFloat((atual || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    const b = parseFloat((anterior || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(a) || isNaN(b) || b === 0) return null;
    return ((a - b) / b) * 100;
  }

  // Funções auxiliares para eventos
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
      case 'meet': return 'bg-amber-500';
      case 'youtube': return 'bg-red-500';
      case 'instagram': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const indicadoresList = [
    { key: 'cub', label: 'CUB (SC)', tipo: 'mensal' },
    { key: 'selic', label: 'SELIC', tipo: 'mensal' },
    { key: 'ipca', label: 'IPCA', tipo: 'anual' },
    { key: 'igpm', label: 'IGP-M', tipo: 'anual' },
    { key: 'incc', label: 'INCC', tipo: 'anual' },
  ];

  const EconomicIndicator = ({ title, value, variacao, subtitulo }: { title: string; value: string; variacao: number | null; subtitulo: string }) => (
    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-[#D4A017]/5 to-[#E8C547]/5 rounded-xl border border-[#E8C547]/20 min-w-[120px] cursor-pointer group hover:scale-105 hover:shadow-lg hover:border-[#D4A017]/40 transition-all duration-300 relative overflow-hidden">
      {/* Efeito de brilho no hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Borda superior que aparece no hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#D4A017] to-[#E8C547] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
      
      <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1 group-hover:text-[#D4A017] transition-colors duration-300">{title}</div>
      <div className="text-lg font-bold text-[#2E2F38] dark:text-white group-hover:text-[#D4A017] transition-colors duration-300">{value}</div>
      <div className="text-[10px] text-[#6B6F76] dark:text-gray-400 mb-1 group-hover:text-[#E8C547] transition-colors duration-300">({subtitulo})</div>
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

  // Filtrar posts para não mostrar o original se já está aninhado em um repost
  const trendingPostsFiltered = (() => {
    const shownOriginals = new Set();
    return trendingPosts.filter(post => {
      if (post.repostOf) {
        shownOriginals.add(post.repostOf);
        return true;
      }
      if (shownOriginals.has(post.id)) {
        return false;
      }
      return true;
    });
  })();

  return (
    <div className="min-h-full flex flex-col">
      {/* Grid em 2 colunas com rolagem independente; barras de rolagem ocultas */}
      <div id="dashboard-two-columns" className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 pt-2" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Coluna Esquerda — rola independente; scrollbar totalmente oculta */}
        <div className="dashboard-scroll-hide space-y-6 overflow-y-auto overflow-x-hidden pr-2 min-h-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Quadro: eventos em que fui marcado — Confirmar Presença / Cancelar */}
          {eventosEmQueFuiMarcado.length > 0 && (
            <div className="bg-background-card rounded-2xl border border-[var(--border-subtle)] p-5 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-orange-400" />
                Você foi marcado(a) nestas ações
              </h2>
              <p className="text-sm text-text-secondary mb-4">Confirme ou cancele sua presença. Essas informações serão usadas para acompanhamento.</p>
              <ul className="space-y-3">
                {eventosEmQueFuiMarcado.map((ev) => {
                  const key = `${ev.tipo}-${ev.id}`;
                  const loading = respondendoPresenca === key;
                  return (
                    <li key={key} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                            {ev.tipoLabel}
                          </span>
                          <span className="font-semibold text-white truncate">{ev.titulo}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                          {ev.dataStr && <span>{ev.dataStr}</span>}
                          {ev.horarioStr && <span className="flex items-center gap-1"><ClockIcon className="h-3 w-3" /> {ev.horarioStr}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => responderPresenca(ev.tipo, ev.id, 'confirmado')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#3AC17C] hover:bg-[#2fa866] rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loading ? '...' : 'Confirmar Presença'}
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => responderPresenca(ev.tipo, ev.id, 'cancelado')}
                          className="px-3 py-1.5 text-xs font-semibold text-[#F45B69] bg-[#F45B69]/10 hover:bg-[#F45B69]/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Missões Diárias — próximo evento + totais por status de tarefa (funil está na coluna direita) */}
          <div className="card-glow rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 rounded-r" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Missões Diárias</h2>
              <Link
                href="/dashboard/agenda"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors border border-emerald-400/30"
              >
                <CalendarIcon className="h-3 w-3" />
                Ver Completa
              </Link>
            </div>

            {/* 1) Próximo evento confirmado */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Próximo evento</p>
              {agendaLoading ? (
                <p className="text-gray-400 text-sm">Carregando...</p>
              ) : proximoEventoConfirmado ? (
                <div className="rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 p-4">
                  <div className="font-semibold text-white">{proximoEventoConfirmado.titulo}</div>
                  <div className="text-sm text-orange-200 mt-1">{proximoEventoConfirmado.tipoLabel}</div>
                  <div className="text-sm text-gray-300 mt-1">
                    {proximoEventoConfirmado.dataStr} · {proximoEventoConfirmado.horarioStr}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-gray-700/30 border border-gray-600/50 p-4 text-gray-400 text-sm">
                  Nenhum evento confirmado no momento.
                </div>
              )}
            </div>

            {/* 2) Leads por tarefa — 3 botões lado a lado, compactos, bolinha piscando + texto */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Leads por tarefa</p>
              <div className="flex gap-2 flex-nowrap">
                <Link href="/dashboard/agenda?filtro=atraso" className="flex-1 min-w-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 hover:bg-red-500/25 transition-colors">
                  <span className="h-2 w-2 bg-red-500 rounded-full shrink-0 animate-pulse" />
                  <span className="text-xs font-medium truncate">Atrasada</span>
                  <span className="text-sm font-bold tabular-nums shrink-0">{tarefaAtrasadaCount}</span>
                </Link>
                <Link href="/dashboard/agenda?filtro=hoje" className="flex-1 min-w-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/25 transition-colors">
                  <span className="h-2 w-2 bg-yellow-500 rounded-full shrink-0 animate-pulse" />
                  <span className="text-xs font-medium truncate">Hoje</span>
                  <span className="text-sm font-bold tabular-nums shrink-0">{tarefaDiaCount}</span>
                </Link>
                <Link href="/dashboard/agenda?filtro=sem" className="flex-1 min-w-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-500/15 border border-gray-500/40 text-gray-300 hover:bg-gray-500/25 transition-colors">
                  <span className="h-2 w-2 bg-gray-500 rounded-full shrink-0 animate-pulse" />
                  <span className="text-xs font-medium truncate">Sem tarefa</span>
                  <span className="text-sm font-bold tabular-nums shrink-0">{semTarefaCount}</span>
                </Link>
              </div>
            </div>
          </div>

                     {/* Avisos Importantes — mesmo padrão do site */}
           <div className="card-glow rounded-xl p-5 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-r" />
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                 <h3 className="font-semibold text-white text-base">Avisos Importantes</h3>
                 <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 text-xs font-medium rounded">
                   {avisosImportantes.length}
                 </span>
               </div>
               {avisosImportantes.length > 0 && (
                 <button
                   onClick={() => setShowAvisosModal(true)}
                   className="px-3 py-1.5 text-xs font-semibold text-red-300 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/30"
                 >
                   Ver Todos
                 </button>
               )}
             </div>
             <div className="space-y-2">
               {avisosImportantes
                 .sort((a, b) => b.dataHora?.toDate() - a.dataHora?.toDate())
                 .length === 0 ? (
                 <p className="text-text-secondary text-sm italic">Nenhum aviso importante cadastrado pela imobiliária.</p>
               ) : (
                 avisosImportantes
                   .sort((a, b) => b.data?.toDate() - a.data?.toDate())
                   .slice(0, 3) // Mostrar apenas os 3 mais recentes
                   .map((aviso, idx) => (
                     <div
                       key={aviso.id}
                       className="group p-3 rounded-lg hover:bg-white/[0.04] transition-colors border-l-2 border-red-500/30 hover:border-red-500/50"
                     >
                       <div className="flex items-start gap-2">
                         <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                         <div className="flex-1 min-w-0">
                           <div className="text-sm font-medium text-white mb-1 group-hover:text-red-300 transition-colors truncate">
                             {aviso.titulo}
                           </div>
                           <div className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                             {aviso.mensagem}
                           </div>
                           <div className="text-[10px] text-red-400/80 font-medium mt-1">
                             {aviso.dataInicio && (
                               <div>Início: {aviso.dataInicio.toDate ? aviso.dataInicio.toDate().toLocaleDateString('pt-BR', { 
                                 day: '2-digit', 
                                 month: '2-digit', 
                                 hour: '2-digit', 
                                 minute: '2-digit' 
                               }) : ''}</div>
                             )}
                             {aviso.dataFim && (
                               <div>Fim: {aviso.dataFim.toDate ? aviso.dataFim.toDate().toLocaleDateString('pt-BR', { 
                                 day: '2-digit', 
                                 month: '2-digit', 
                                 hour: '2-digit', 
                                 minute: '2-digit' 
                               }) : ''}</div>
                             )}
                           </div>
                         </div>
                       </div>
                     </div>
                   ))
               )}
               {avisosImportantes.length > 3 && (
                 <div className="text-center pt-2">
                   <button
                     onClick={() => setShowAvisosModal(true)}
                     className="text-xs text-red-400 hover:text-red-300 font-medium hover:underline transition-colors cursor-pointer"
                   >
                     +{avisosImportantes.length - 3} avisos anteriores
                   </button>
                 </div>
               )}
             </div>
           </div>

           {/* Agenda Imobiliária — mesmo padrão Agenda do Dia: card-glow + barra lateral visível */}
           <div className="card-glow rounded-2xl p-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500 rounded-r shadow-[0_0_12px_rgba(139,92,246,0.6)]" />
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                 <h3 className="font-semibold text-white text-base">Agenda Imobiliária</h3>
                 <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-300 text-xs font-medium rounded">
                   {agendaImobiliaria.length}
                 </span>
               </div>
               {agendaImobiliaria.length > 0 && (
                 <button
                   onClick={() => setShowAgendaModal(true)}
                   className="px-3 py-1.5 text-xs font-semibold text-violet-300 bg-violet-500/10 rounded-lg hover:bg-violet-500/20 transition-colors border border-violet-500/30"
                 >
                   Ver Todos
                 </button>
               )}
             </div>
             <div className="space-y-2">
               {agendaImobiliaria.length === 0 ? (
                 <p className="text-text-secondary text-sm italic">Nenhum evento agendado pela imobiliária.</p>
               ) : (
                 agendaImobiliaria
                   .sort((a, b) => {
                     if (a.dataInicio && !b.dataInicio) return -1;
                     if (!a.dataInicio && b.dataInicio) return 1;
                     if (a.dataInicio && b.dataInicio) {
                       return a.dataInicio.toDate().getTime() - b.dataInicio.toDate().getTime();
                     }
                     return a.data.toDate().getTime() - b.data.toDate().getTime();
                   })
                   .slice(0, 3)
                   .map((evento, idx) => (
                     <div
                       key={evento.id}
                       className="group p-3 rounded-lg hover:bg-white/[0.04] transition-colors border-l-2 border-violet-500/30 hover:border-violet-500/50"
                     >
                       <div className="flex items-start gap-2">
                         <div className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 flex-shrink-0" />
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <div className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                               {evento.titulo}
                             </div>
                             <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                               evento.tipo === 'reuniao' ? 'bg-amber-500/20 text-amber-300' :
                               evento.tipo === 'evento' ? 'bg-violet-500/20 text-violet-300' :
                               evento.tipo === 'treinamento' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-text-secondary'
                             }`}>
                               {evento.tipo === 'reuniao' ? '👥' : 
                                evento.tipo === 'evento' ? '🎉' : 
                                evento.tipo === 'treinamento' ? '📚' : '📅'} {evento.tipo}
                             </span>
                           </div>
                           {evento.descricao && (
                             <div className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                               {evento.descricao}
                             </div>
                           )}
                           <div className="text-[10px] text-violet-400/80 font-medium mt-1">
                             {evento.dataInicio && (
                               <div>Início: {evento.dataInicio.toDate ? evento.dataInicio.toDate().toLocaleDateString('pt-BR', { 
                                 day: '2-digit', 
                                 month: '2-digit', 
                                 hour: '2-digit', 
                                 minute: '2-digit' 
                               }) : ''}</div>
                             )}
                             {evento.local && (
                               <div>Local: {evento.local}</div>
                             )}
                           </div>
                         </div>
                       </div>
                     </div>
                   ))
               )}
               {agendaImobiliaria.length > 3 && (
                 <div className="text-center pt-2">
                   <button
                     onClick={() => setShowAgendaModal(true)}
                     className="text-xs text-violet-400 hover:text-violet-300 font-medium hover:underline transition-colors cursor-pointer"
                   >
                     +{agendaImobiliaria.length - 3} eventos anteriores
                   </button>
                 </div>
               )}
             </div>
           </div>


          {/* Plantões — mesmo padrão Agenda do Dia: card-glow + barra lateral visível */}
          <div className="card-glow rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 rounded-r shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <h3 className="font-semibold text-white text-base">Plantões</h3>
                <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 text-xs font-medium rounded">
                  {plantoes.length}
                </span>
              </div>
              {plantoes.length > 0 && (
                <button
                  onClick={() => setShowPlantoesModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-orange-300 bg-orange-500/10 rounded-lg hover:bg-orange-500/20 transition-colors border border-orange-500/30"
                >
                  Ver Todos
                </button>
              )}
            </div>
            <div className="space-y-2">
              {plantoes.length === 0 ? (
                <p className="text-text-secondary text-sm italic">Nenhum plantão agendado pela imobiliária.</p>
              ) : (
                plantoes
                  .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(a.dataInicio).getTime())
                  .slice(0, 3)
                  .map((plantao, idx) => (
                    <div
                      key={plantao.id}
                      className="group p-3 rounded-lg hover:bg-white/[0.04] transition-colors border-l-2 border-orange-500/30 hover:border-orange-500/50"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white mb-1 group-hover:text-orange-400 transition-colors truncate">
                            Plantão {plantao.construtora}
                          </div>
                          <div className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                            Corretor: {plantao.corretorResponsavel} - Horário: {plantao.horario}
                          </div>
                          <div className="text-[10px] text-orange-400/80 font-medium mt-1">
                            <div>Início: {new Date(plantao.dataInicio).toLocaleDateString('pt-BR', { 
                              day: '2-digit', 
                              month: '2-digit'
                            })}</div>
                            <div>Fim: {new Date(plantao.dataFim).toLocaleDateString('pt-BR', { 
                              day: '2-digit', 
                              month: '2-digit'
                            })}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
              {plantoes.length > 3 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setShowPlantoesModal(true)}
                    className="text-xs text-orange-400 hover:text-orange-300 font-medium hover:underline transition-colors cursor-pointer"
                  >
                    +{plantoes.length - 3} plantões anteriores
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Metas — congruente com o site */}
          <div className="card-glow rounded-2xl p-6 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-r" />
            <MetasCard meta={meta} nomeImobiliaria={nomeImobiliaria} />
          </div>
        </div>

        {/* Coluna Direita — rola independente; scrollbar totalmente oculta */}
        <div id="trending-section" className="dashboard-scroll-hide overflow-y-auto overflow-x-hidden pr-2 min-h-0 space-y-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Funil de vendas individual — estilo Dashboard TV */}
          <div className="card-glow rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-r from-[#D4A017] to-[#60a5fa] rounded-r" />
            <h2 className="text-base font-bold text-white mb-1">Funil de vendas</h2>
            <p className="text-xs text-gray-400 mb-4">Seus leads por etapa</p>
            {agendaLoading ? (
              <p className="text-gray-400 text-sm">Carregando...</p>
            ) : (() => {
              const totalFunil = Object.values(funilPessoal).reduce((a, b) => a + b, 0);
              const maxLocal = Math.max(...Object.values(funilPessoal), 1);
              const STAGE_LABELS: Record<string, string> = {
                'Pré Qualificação': 'Pré Qualif.', 'Qualificação': 'Qualificação', 'Apresentação do imóvel': 'Apres. imóvel',
                'Ligação agendada': 'Lig. agendada', 'Visita agendada': 'Visita agend.', 'Negociação e Proposta': 'Negoc. e Proposta',
                'Contrato e fechamento': 'Contrato', 'Pós Venda e Fidelização': 'Pós Venda', 'Interesse Futuro': 'Int. Futuro',
                'Carteira': 'Carteira', 'Geladeira': 'Geladeira'
              };
              return (
                <>
                  <div className="inline-flex items-baseline gap-2 px-4 py-2 rounded-xl bg-[#D4A017]/20 border border-[#D4A017]/40 mb-4">
                    <span className="text-gray-400 text-sm font-medium">Total no funil</span>
                    <span className="text-2xl font-black tabular-nums text-white">{totalFunil}</span>
                    <span className="text-gray-400 text-sm">leads</span>
                  </div>
                  <div className="space-y-2">
                    {PIPELINE_STAGES.map((etapa) => {
                      const qtd = funilPessoal[etapa] ?? 0;
                      const pct = Math.round((qtd / maxLocal) * 100);
                      const label = STAGE_LABELS[etapa] ?? etapa;
                      const isQuente = ['Negociação e Proposta', 'Contrato e fechamento', 'Pós Venda e Fidelização'].includes(etapa);
                      return (
                        <div key={etapa} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-24 truncate" title={etapa}>{label}</span>
                          <div className="flex-1 min-w-0 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#D4A017] to-[#60a5fa] transition-all duration-500"
                              style={{ width: `${Math.max(pct, 8)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums w-6 text-right ${isQuente ? 'text-amber-400' : 'text-[#D4A017]'}`}>{qtd}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          <div className="card-glow rounded-2xl p-6 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-r" />

            {/* Composer: postar direto da comunidade (igual à página Comunidade) */}
            <div className="mb-6 pb-6 border-b border-white/10 dark:border-[#23283A]">
              <div className="flex gap-3">
                <img src={getComunidadeAvatar()} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=U&background=random`; }} />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white/80 dark:bg-[#181C23] text-[#2E2F38] dark:text-white resize-none min-h-[72px] text-sm placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A017]/50"
                    placeholder="O que está acontecendo?"
                    value={novoPostComunidade}
                    onChange={(e) => setNovoPostComunidade(e.target.value)}
                    disabled={postandoComunidade}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white/80 dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none"
                    placeholder="🔗 Link do YouTube (opcional)"
                    value={youtubeLinkComunidade}
                    onChange={(e) => handleYoutubeLinkChangeComunidade(e.target.value)}
                    disabled={postandoComunidade}
                  />
                  {youtubePreviewComunidade && (
                    <div className="relative rounded-lg overflow-hidden border border-[#E8E9F1] dark:border-[#23283A] bg-black/20">
                      <iframe
                        src={youtubePreviewComunidade.embedUrl}
                        title="YouTube"
                        className={`w-full ${youtubePreviewComunidade.isShort ? 'h-48' : 'h-36'}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <button type="button" onClick={() => { setYoutubeLinkComunidade(''); setYoutubePreviewComunidade(null); }} className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 text-xs">✕</button>
                      {youtubePreviewComunidade.isShort && <span className="absolute top-1 left-1 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-semibold">SHORT</span>}
                    </div>
                  )}
                  {filePreviewComunidade && (
                    <div className="relative inline-block">
                      {fileComunidade?.type.startsWith('image/') && (
                        <img src={filePreviewComunidade} alt="" className="max-h-28 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]" />
                      )}
                      {fileComunidade?.type.startsWith('video/') && (
                        <video src={filePreviewComunidade} controls className="max-h-28 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]" />
                      )}
                      <button type="button" onClick={() => { setFileComunidade(null); setFilePreviewComunidade(null); }} className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 text-xs">✕</button>
                    </div>
                  )}
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2 relative">
                      <label className="cursor-pointer text-[#D4A017] hover:text-[#B8860B] text-lg" title="Anexar foto ou vídeo">
                        <span>📎</span>
                        <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileComunidadeChange} />
                      </label>
                      <button type="button" onClick={() => setShowEmojiComunidade(v => !v)} className="text-[#D4A017] hover:text-[#B8860B] text-lg" title="Emoji">😊</button>
                      {showEmojiComunidade && (
                        <div className="absolute left-0 bottom-8 z-50">
                          <Picker data={data} onEmojiSelect={handleEmojiSelectComunidade} theme={typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'} />
                        </div>
                      )}
                      <Link href="/dashboard/comunidade" className="text-[#3AC17C] hover:text-[#2E9D63] text-lg" title="Agendar evento">📅</Link>
                    </div>
                    <button
                      type="button"
                      onClick={handlePostarComunidade}
                      disabled={postandoComunidade || (!novoPostComunidade.trim() && !fileComunidade && !youtubePreviewComunidade)}
                      className="px-4 py-2 rounded-lg bg-[#D4A017] text-white font-semibold text-sm hover:bg-[#B8860B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {postandoComunidade ? 'Postando...' : 'Postar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {trendingLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A017]"></div>
              </div>
            ) : trendingPosts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📱</div>
                <p className="text-[#6B6F76] dark:text-gray-300 text-sm">Nenhum post ainda. Seja o primeiro!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trendingPostsFiltered.slice(0, 8).map((post, index) => (
                  <div 
                    key={post.id} 
                    className={`group relative backdrop-blur-sm rounded-xl p-4 transition-all duration-300 cursor-pointer border hover:scale-[1.02] shadow-lg hover:shadow-xl ${
                      post.isEvento
                        ? 'bg-gradient-to-r from-yellow-50/80 to-orange-50/80 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200/50 dark:border-yellow-700/50 hover:bg-gradient-to-r hover:from-yellow-100/90 hover:to-orange-100/90 dark:hover:from-yellow-800/30 dark:hover:to-orange-800/30'
                        : 'bg-white/60 dark:bg-[#23283A]/60 border-white/20 hover:bg-white/80 dark:hover:bg-[#23283A]/80 hover:border-[#D4A017]/30'
                    }`}
                    // onClick={() => openPostModal(post)}
                  >
                    {/* Badge de ranking */}
                    <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      #{index + 1}
                    </div>

                    {/* Badge Especial para eventos */}
                    {post.isEvento && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                          <span>⭐</span>
                          <span>ESPECIAL</span>
                        </div>
                      </div>
                    )}

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
                        {/* Se for repost, mostrar SOMENTE o comentário do repostador e o card aninhado do post original */}
                        {post.repostOf ? (
                          <div>
                            {post.repostComment && (
                              <div className="mb-2 px-3 py-2 bg-[#F5F6FA] dark:bg-[#23283A] border-l-4 border-[#D4A017] text-[#D4A017] rounded-r-lg text-sm font-medium">
                                <span className="font-semibold">{post.nome}:</span> {post.repostComment}
                              </div>
                            )}
                            <div className="bg-white dark:bg-[#23283A] border border-[#D4A017]/20 rounded-lg p-3 shadow-inner mt-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-[#D4A017]/10 text-[#D4A017] text-xs rounded-full font-semibold">🔁 Repost de {post.repostAuthorName || 'Original'}</span>
                              </div>
                              <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1">{post.originalCreatedAt}</div>
                              <div className="text-sm text-[#2E2F38] dark:text-white leading-relaxed mb-2">{post.originalTexto}</div>
                              {/* Mídia do post original */}
                              {post.originalFileMeta && post.originalFileMeta.type.startsWith('image/') && (
                                <img src={post.originalFile} alt="Post image" className="w-full rounded-lg mb-2" />
                              )}
                              {post.originalFileMeta && post.originalFileMeta.type.startsWith('video/') && (
                                <video src={post.originalFile} controls className="w-full rounded-lg mb-2" />
                              )}
                              {post.originalYoutubeData && (
                                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-2">
                                  <iframe
                                    src={post.originalYoutubeData.embedUrl}
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
                          </div>
                        ) : (
                          post.texto && <div className="text-sm text-[#2E2F38] dark:text-white line-clamp-2 leading-relaxed">{post.texto}</div>
                        )}
                      </div>
                    </div>

                    {/* Preview de mídia - APENAS para posts originais (não reposts) */}
                    {!post.repostOf && (post.file || post.youtubeData) && (
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
                            <div className="absolute top-2 left-2 bg-amber-600 text-white px-2 py-1 rounded text-xs font-semibold">
                              FOTO
                            </div>
                          </div>
                        )}
                        {post.file && post.fileMeta && post.fileMeta.type.startsWith('video/') && (
                          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                            <video 
                              src={post.file} 
                              className="w-full h-full object-cover"
                              controls
                              muted
                              loop
                            />
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
                        <div className="flex items-center gap-1.5">
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
                          </button>
                          {/* Número de likes clicável */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShowLikes(post); }}
                            className={`text-sm font-medium transition-all duration-200 hover:scale-105 ${
                              post.likes > 0 
                                ? 'text-[#6B6F76] dark:text-gray-300 hover:text-[#D4A017] cursor-pointer' 
                                : 'text-[#6B6F76] dark:text-gray-300 cursor-default'
                            }`}
                            disabled={!post.likes || post.likes === 0}
                          >
                            {post.likes || 0}
                          </button>
                        </div>
                        
                        {/* Botão Comentar */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); openPostModal(post); }}
                          className="flex items-center gap-1.5 text-sm font-medium text-[#6B6F76] dark:text-gray-300 hover:text-[#D4A017] hover:scale-105 transition-all duration-200"
                        >
                          <span className="text-lg">💬</span>
                          <span>{post.commentsCount || 0}</span>
                        </button>
                        
                        {/* Botão Repostar */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setRepostInputId(post.id); setRepostComment(''); }}
                          className="flex items-center gap-1.5 text-sm font-medium text-[#6B6F76] dark:text-gray-300 hover:text-green-500 hover:scale-105 transition-all duration-200"
                        >
                          <span className="text-lg">🔁</span>
                          <span>{post.repostsCount || 0}</span>
                        </button>
                      </div>
                      
                      {/* Indicador de engajamento com gradiente */}
                      <div className="px-2 py-1 bg-gradient-to-r from-[#D4A017]/20 to-[#E8C547]/20 rounded-full border border-[#D4A017]/30">
                        <span className="text-xs font-medium text-[#D4A017] dark:text-[#E8C547]">
                          🔥 {post.totalEngagement}
                        </span>
                      </div>
                    </div>

                    {/* Campo de repost abaixo do post */}
                    {repostInputId === post.id && (
                      <div className="mt-4 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg p-4 border border-[#D4A017]/20 flex flex-col gap-2 animate-fade-in">
                        <textarea
                          className="w-full rounded p-2 text-sm bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none"
                          placeholder="Adicione um comentário (opcional) para o repost..."
                          value={repostComment}
                          onChange={e => setRepostComment(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            className="px-4 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                            onClick={() => { setRepostInputId(null); setRepostComment(''); }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="px-4 py-1 rounded bg-green-500 hover:bg-green-600 text-white text-sm font-semibold"
                            onClick={async () => {
                              await handleRepost(post.id, repostComment);
                              setRepostInputId(null);
                              setRepostComment('');
                            }}
                          >
                            Repostar
                          </button>
                        </div>
                      </div>
                    )}

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
                className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-gradient-to-r from-[#D4A017] to-[#E8C547] text-white font-semibold rounded-lg hover:from-[#B8860B] hover:to-[#D4A017] transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <span>🚀</span>
                <span>Ver mais na Comunidade</span>
                <span>→</span>
              </Link>
          </div>
          </div>
        </div>
      </div>



      {/* Modal do Post */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowPostModal(false)}>
          <div className="relative max-w-2xl w-full mx-2 bg-white dark:bg-[#23283A] rounded-2xl shadow-xl p-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPostModal(false)} className="absolute top-4 right-4 text-white text-2xl z-10 hover:text-[#F45B69]">✕</button>
            
            {/* Imagem do post se existir */}
            {selectedPost.file && selectedPost.fileMeta && selectedPost.fileMeta.type.startsWith('image/') && (
              <div className="flex justify-center items-center p-4">
                <img src={selectedPost.file} alt="imagem ampliada" className="max-h-[60vh] rounded-xl mx-auto" />
              </div>
            )}
            
            {/* Seção de comentários */}
            <div className="p-4 border-t border-[#E8E9F1] dark:border-[#23283A]">
              <h3 className="font-bold text-lg mb-2 text-[#2E2F38] dark:text-white">Comentários ({selectedPost.commentsCount || 0})</h3>
              <div className="max-h-60 overflow-y-auto space-y-3 mb-3">
                {commentsLoading ? (
                  <div className="text-center text-[#6B6F76] dark:text-gray-300 text-sm py-6">
                    <div className="text-xl mb-2">💭</div>
                    <div>Carregando comentários...</div>
                  </div>
                ) : postComments.length === 0 ? (
                  <div className="text-gray-400 text-sm">Nenhum comentário ainda.</div>
                ) : (
                  postComments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <img src={c.userId === currentUser?.uid ? currentUser?.photoURL || 'https://via.placeholder.com/32' : 'https://via.placeholder.com/32'} alt={c.nome} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="font-semibold text-[#2E2F38] dark:text-white text-sm">{c.nome}</div>
                        <div className="text-[#2E2F38] dark:text-gray-200 text-sm">{c.texto}</div>
                        <div className="text-xs text-gray-400">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('pt-BR') : ''}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 mt-2 relative">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  placeholder="Adicionar comentário..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleComment(selectedPost.id); }}
                />
                <button
                  className="text-[#D4A017] hover:text-[#B8860B] text-xl"
                  title="Adicionar emoji"
                  onClick={() => setShowEmojiComment((v) => !v)}
                  type="button"
                >😊</button>
                {showEmojiComment && (
                  <div className="absolute z-50 top-12 right-0">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: any) => { setCommentText((prev) => prev + emoji.native); setShowEmojiComment(false); }}
                      theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                    />
                  </div>
                )}
                <button
                  className="px-4 py-2 rounded-lg bg-[#D4A017] text-white font-bold shadow-soft hover:bg-[#B8860B] transition-colors"
                  onClick={() => handleComment(selectedPost.id)}
                  disabled={!commentText.trim()}
                >Comentar</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal de Notas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setIsModalOpen(false)}>
          <div className="relative max-w-3xl w-full mx-4 bg-white dark:bg-[#23283A] rounded-2xl shadow-xl p-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-[#6B6F76] dark:text-gray-300 text-2xl z-10 hover:text-[#F45B69]">✕</button>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <NotesIcon className="h-8 w-8 text-[#D4A017]" />
                <div>
                  <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Todas as Notas</h2>
                  <p className="text-[#6B6F76] dark:text-gray-300">Suas notas e lembretes</p>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-3">
                {notes.length === 0 ? (
                  <div className="text-center py-8">
                    <NotesIcon className="h-12 w-12 text-[#D4A017] mx-auto mb-3 opacity-50" />
                    <p className="text-[#6B6F76] dark:text-gray-300">Nenhuma nota criada ainda</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">{getPriorityIcon(note.prioridade)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(note.prioridade)}`}>
                              {note.prioridade}
                            </span>
                            <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                              {note.criadoEm.toDate().toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="text-sm text-[#2E2F38] dark:text-white leading-relaxed mb-2">
                            {note.texto}
                          </div>
                          {note.dataHora && (
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-[#D4A017]" />
                              <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                                Agendado: {new Date(note.dataHora).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avisos Importantes */}
      <AvisosImportantesModal
        isOpen={showAvisosModal}
        onClose={() => setShowAvisosModal(false)}
        avisos={avisosImportantes}
      />

      {/* Modal de Agenda Imobiliária */}
      <AgendaImobiliariaModal
        isOpen={showAgendaModal}
        onClose={() => setShowAgendaModal(false)}
        agenda={agendaImobiliaria}
      />

      {/* Modal de Plantões */}
      <PlantoesModal
        isOpen={showPlantoesModal}
        onClose={() => setShowPlantoesModal(false)}
        plantoes={plantoes}
      />

      {/* Modal de Likes */}
      {showLikesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowLikesModal(false)}>
          <div className="relative max-w-md w-full mx-4 bg-white dark:bg-[#23283A] rounded-2xl shadow-xl p-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowLikesModal(false)} className="absolute top-4 right-4 text-[#6B6F76] dark:text-gray-300 text-2xl z-10 hover:text-[#F45B69]">✕</button>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">❤️</span>
                <div>
                  <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Quem curtiu</h2>
                  <p className="text-[#6B6F76] dark:text-gray-300">
                    {selectedPostForLikes?.nome} • {postLikes.length} curtida{postLikes.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {loadingLikes ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A017]"></div>
                  </div>
                ) : postLikes.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-3 block">🤍</span>
                    <p className="text-[#6B6F76] dark:text-gray-300">Ninguém curtiu ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {postLikes.map((like) => (
                      <div
                        key={like.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                      >
                        <div className="w-10 h-10 bg-gradient-to-r from-[#D4A017] to-[#E8C547] rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {like.userName ? like.userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#2E2F38] dark:text-white text-sm truncate">
                            {like.userName || 'Usuário'}
                          </div>
                          <div className="text-xs text-[#6B6F76] dark:text-gray-300">
                            {like.timestamp?.toDate ? 
                              like.timestamp.toDate().toLocaleString('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : 'Agora'
                            }
                          </div>
                        </div>
                        <span className="text-red-500 text-lg">❤️</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão Voltar ao Topo */}
      {showScrollToTop && (
        <button
          onClick={scrollToTrendingTop}
          className="fixed bottom-6 right-6 bg-[#D4A017] hover:bg-[#B8860B] text-white font-bold py-3 px-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-40"
          title="Voltar ao topo do Trending"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}


    </div>
  );
}