'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, onSnapshot, doc as firestoreDoc, getDoc, Timestamp, orderBy, limit } from 'firebase/firestore';
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

const WeatherWidget = () => {
  const [weather, setWeather] = useState({ temp: 24, condition: 'Ensolarado', icon: '☀️' });
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#A3C8F7]/10 to-[#3478F6]/10 rounded-lg border border-[#A3C8F7]/20">
      <div className="text-2xl">{weather.icon}</div>
      <div>
        <div className="text-sm font-bold text-[#3478F6]">{weather.temp}°C</div>
        <div className="text-xs text-[#6B6F76]">{weather.condition}</div>
      </div>
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
const TAREFA_STATUS_ORDER: TaskStatus[] = ['Tarefa em Atraso', 'Tarefa do Dia', 'Sem tarefa', 'Tarefa Futura'];
const statusInfo: Record<TaskStatus, { color: string; text: string }> = {
  'Tarefa em Atraso': { color: 'bg-red-500', text: 'Atrasada' },
  'Tarefa do Dia': { color: 'bg-yellow-400', text: 'Para Hoje' },
  'Tarefa Futura': { color: 'bg-sky-500', text: 'Futura' },
  'Sem tarefa': { color: 'bg-gray-400', text: 'Sem Tarefa' },
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
  const corBarra = progresso >= 100 ? 'bg-[#3AC17C]' : 'bg-[#3478F6]';
  return (
    <div className="flex flex-col gap-4 p-8 rounded-3xl shadow-xl bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 min-h-[220px] relative overflow-hidden">
      <div className="flex items-center gap-3 mb-2">
        <svg className="h-8 w-8 text-[#3478F6] drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span className="font-extrabold text-[#2E2F38] dark:text-white text-2xl tracking-tight">Metas</span>
        <span className="ml-2 px-3 py-1 rounded-full bg-[#3478F6]/10 text-[#3478F6] dark:bg-[#23283A] dark:text-[#A3C8F7] text-base font-bold">{nomeImobiliaria}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
        <span>Início: <span className="font-semibold text-[#3478F6]">{meta?.inicio ? new Date(meta.inicio).toLocaleDateString('pt-BR') : '--'}</span></span>
        <span>|</span>
        <span>Fim: <span className="font-semibold text-[#3478F6]">{meta?.fim ? new Date(meta.fim).toLocaleDateString('pt-BR') : '--'}</span></span>
      </div>
      <div className="flex items-center justify-between mt-2 mb-1">
        <div className="text-sm text-[#6B6F76] dark:text-gray-300">VGV da Meta</div>
        <div className="text-sm text-[#6B6F76] dark:text-gray-300">Já Realizado</div>
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl font-extrabold text-[#3478F6] dark:text-[#A3C8F7]">{meta?.valor ? meta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}</div>
        <div className={`text-2xl font-extrabold ${progresso >= 100 ? 'text-[#3AC17C]' : 'text-[#3478F6]'} dark:text-[#3AC17C]`}>{meta?.alcancado ? meta.alcancado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}</div>
      </div>
      <div className="w-full h-6 bg-[#E8E9F1] dark:bg-[#23283A] rounded-full overflow-hidden mb-1">
        <div className={`h-6 rounded-full transition-all duration-700 ${corBarra}`} style={{ width: `${progressoDisplay}%` }}></div>
      </div>
      <div className="text-sm text-[#6B6F76] dark:text-gray-300 text-right font-semibold">{progresso}% da meta</div>
    </div>
  );
};

export default function DashboardPage() {
  const { currentUser, userData } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [performanceData, setPerformanceData] = useState<number[]>([]);
  const [indicadoresExternos, setIndicadoresExternos] = useState<any>(null);
  const [indicadoresExternosAnterior, setIndicadoresExternosAnterior] = useState<any>(null);
  const [agendaLeads, setAgendaLeads] = useState<Array<any>>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [avisosImportantes, setAvisosImportantes] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [nomeImobiliaria, setNomeImobiliaria] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      const leadsRef = collection(db, 'leads');
      const q = query(leadsRef, where("userId", "==", currentUser.uid));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeads(leadsData);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [currentUser]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Gerar dados dinâmicos para o gráfico de performance
  useEffect(() => {
    const generatePerformanceData = () => {
      const data = [];
      for (let i = 0; i < 7; i++) {
        data.push(Math.floor(Math.random() * 80) + 20); // Valores entre 20 e 100
      }
      setPerformanceData(data);
    };

    generatePerformanceData();
    const interval = setInterval(generatePerformanceData, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchIndicadores = async () => {
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
    };
    fetchIndicadores();
  }, []);

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
        setAgendaLeads(leadsToShow.slice(0, 3));
      } catch (error) {
        setAgendaLeads([]);
      } finally {
        setAgendaLoading(false);
      }
    };
    fetchAgenda();
  }, [currentUser]);

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
            
            return {
              ...post,
              commentsCount: commentsSnapshot.size,
              repostsCount: repostsSnapshot.size,
              totalEngagement: (post.likes || 0) + commentsSnapshot.size + repostsSnapshot.size
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
  }, [userData]);

  // Buscar dados da meta e nome da imobiliária
  useEffect(() => {
    if (!userData?.imobiliariaId) return;

    let unsubscribe: (() => void) | undefined;

    const setupMetaListener = async () => {
      try {
        // Buscar nome da imobiliária
        const imobiliariaRef = firestoreDoc(db, 'imobiliarias', userData.imobiliariaId!);
        const imobiliariaSnap = await getDoc(imobiliariaRef);
        if (imobiliariaSnap.exists()) {
          setNomeImobiliaria(imobiliariaSnap.data().nome || 'Imobiliária');
        }

        // Buscar meta atual com listener em tempo real
        const metasRef = collection(db, 'metas');
        
        // Primeiro tenta com orderBy, se falhar usa sem orderBy
        const tryWithOrderBy = async () => {
          try {
            const q = query(metasRef, where('imobiliariaId', '==', userData.imobiliariaId), orderBy('createdAt', 'desc'), limit(1));
            
            unsubscribe = onSnapshot(q, (snapshot) => {
              if (!snapshot.empty) {
                console.log('Meta atualizada no dashboard:', snapshot.docs[0].data());
                setMeta(snapshot.docs[0].data());
              } else {
                console.log('Nenhuma meta encontrada, usando valores padrão');
                setMeta({
                  valor: 1000000,
                  alcancado: 750000,
                  inicio: new Date().toISOString(),
                  fim: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
                });
              }
            }, (error) => {
              console.error('Erro com orderBy, tentando sem orderBy:', error);
              // Se falhar com orderBy, tenta sem orderBy
              tryWithoutOrderBy();
            });
          } catch (error) {
            console.error('Erro ao configurar listener com orderBy:', error);
            tryWithoutOrderBy();
          }
        };

        const tryWithoutOrderBy = () => {
          try {
            const q = query(metasRef, where('imobiliariaId', '==', userData.imobiliariaId), limit(1));
            
            unsubscribe = onSnapshot(q, (snapshot) => {
              if (!snapshot.empty) {
                // Ordena manualmente por createdAt se existir
                const docs = snapshot.docs.sort((a, b) => {
                  const aTime = a.data().createdAt?.toMillis() || 0;
                  const bTime = b.data().createdAt?.toMillis() || 0;
                  return bTime - aTime;
                });
                console.log('Meta atualizada no dashboard (sem orderBy):', docs[0].data());
                setMeta(docs[0].data());
              } else {
                console.log('Nenhuma meta encontrada, usando valores padrão');
                setMeta({
                  valor: 1000000,
                  alcancado: 750000,
                  inicio: new Date().toISOString(),
                  fim: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
                });
              }
            }, (error) => {
              console.error('Erro ao buscar dados da meta:', error);
              setNomeImobiliaria('Imobiliária');
              setMeta({
                valor: 1000000,
                alcancado: 750000,
                inicio: new Date().toISOString(),
                fim: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
              });
            });
          } catch (error) {
            console.error('Erro ao configurar listener sem orderBy:', error);
            setNomeImobiliaria('Imobiliária');
            setMeta({
              valor: 1000000,
              alcancado: 750000,
              inicio: new Date().toISOString(),
              fim: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
            });
          }
        };

        // Inicia tentando com orderBy
        tryWithOrderBy();
      } catch (error) {
        console.error('Erro ao buscar dados da meta:', error);
        // Valores padrão em caso de erro
        setNomeImobiliaria('Imobiliária');
        setMeta({
          valor: 1000000,
          alcancado: 750000,
          inicio: new Date().toISOString(),
          fim: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
        });
      }
    };
    
    setupMetaListener();
    
    // Limpeza do listener quando o componente for desmontado
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
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
    <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-r from-[#3478F6]/5 to-[#A3C8F7]/5 rounded-lg border border-[#A3C8F7]/20 min-w-[120px]">
      <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1">{title}</div>
      <div className="text-lg font-bold text-[#2E2F38] dark:text-white">{value}</div>
      <div className="text-[10px] text-[#6B6F76] dark:text-gray-400 mb-1">({subtitulo})</div>
      {variacao !== null && (
        <div className={`flex items-center text-xs font-medium ${variacao >= 0 ? 'text-[#3AC17C]' : 'text-[#F45B69]'}`}> 
          {variacao >= 0 ? (
            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
          ) : (
            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>
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
      {/* Header com boas-vindas, indicadores econômicos, clima e hora */}
      <div className="mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-1">
                Olá, {currentUser?.email?.split('@')[0] || 'Corretor'}! 👋
              </h1>
              <p className="text-[#6B6F76] capitalize text-sm">{currentDate}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Clima primeiro, depois hora */}
              <WeatherWidget />
              <div className="text-right">
                <div className="text-xl font-bold text-[#3478F6]">{currentTimeString}</div>
                <div className="text-xs text-[#6B6F76]">Horário atual</div>
              </div>
            </div>
          </div>
          {/* Indicadores econômicos logo abaixo do Olá, corretor... */}
          <div className="flex gap-3 mt-2 flex-wrap">
            {indicadoresExternos && indicadoresExternosAnterior && indicadoresList.map(ind => (
              <EconomicIndicator
                key={ind.key}
                title={ind.label}
                value={indicadoresExternos?.[ind.key] || '--'}
                variacao={calcularVariacao(indicadoresExternos?.[ind.key], indicadoresExternosAnterior?.[ind.key])}
                subtitulo={ind.tipo}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid de conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda do Dia */}
        <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-6 mb-6 lg:col-span-2 relative overflow-hidden">
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
        {/* Top Trending */}
        <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-6 mb-6 flex flex-col justify-between lg:col-span-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#3478F6]"></div>
          <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Top Trending</h2>
          {trendingLoading ? (
            <p className="text-gray-300">Carregando posts...</p>
          ) : trendingPosts.length === 0 ? (
            <p className="text-gray-300">Nenhum post encontrado.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {trendingPosts.map((post) => (
                <div key={post.id} className="flex items-start gap-3">
                  <img src={post.avatar} alt={post.nome} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#2E2F38] dark:text-white text-sm">{post.nome}</span>
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
                    <div className="text-xs text-[#2E2F38] dark:text-white truncate max-w-[180px]">{post.texto}</div>
                    <div className="flex gap-3 mt-1 text-xs text-[#6B6F76] dark:text-gray-300">
                      <span>🔁 {post.repostsCount || 0}</span>
                      <span>❤️ {post.likes || 0}</span>
                      <span>💬 {post.commentsCount || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Seção inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Metas */}
        <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-8 min-h-[220px] relative overflow-hidden shadow-xl animate-fade-in">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#3478F6]"></div>
          <MetasCard meta={meta} nomeImobiliaria={nomeImobiliaria} />
        </div>
        {/* Avisos Importantes */}
        <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-8 min-h-[220px] relative overflow-hidden shadow-xl animate-fade-in flex flex-col gap-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#3478F6]"></div>
          <div className="flex items-center gap-3 mb-4">
            <svg className="h-8 w-8 text-[#3478F6] drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <span className="font-extrabold text-white text-2xl tracking-tight">Avisos Importantes</span>
          </div>
          <div className="space-y-3">
            {avisosImportantes
              .sort((a, b) => b.dataHora?.toDate() - a.dataHora?.toDate())
              .length === 0 ? (
              <p className="text-[#6B6F76] dark:text-gray-300 text-sm">Nenhum aviso importante cadastrado pela imobiliária.</p>
            ) : (
              avisosImportantes
                .sort((a, b) => b.dataHora?.toDate() - a.dataHora?.toDate())
                .map((aviso, idx) => {
                  // Cores azuis para manter consistência
                  const cardStyles = [
                    { bg: 'bg-[#3478F6]/10', border: 'border-[#3478F6]/20', icon: <AlertCircleIcon className="h-5 w-5 text-[#3478F6] mt-0.5" /> },
                    { bg: 'bg-[#A3C8F7]/10', border: 'border-[#A3C8F7]/20', icon: <CheckCircleIcon className="h-5 w-5 text-[#A3C8F7] mt-0.5" /> },
                    { bg: 'bg-[#255FD1]/10', border: 'border-[#255FD1]/20', icon: <StarIcon className="h-5 w-5 text-[#255FD1] mt-0.5" /> },
                  ];
                  const style = cardStyles[idx % cardStyles.length];
                  return (
                    <div key={aviso.id} className={`flex items-start gap-3 p-3 rounded-xl border ${style.bg} ${style.border} hover:shadow-md transition-all duration-200`}>
                      {style.icon}
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#2E2F38] dark:text-white mb-1">{aviso.titulo}</div>
                        <div className="text-xs text-[#6B6F76] dark:text-gray-100 mb-1">{aviso.mensagem}</div>
                        <div className="text-[10px] text-[#6B6F76] dark:text-gray-300">{aviso.dataHora?.toDate ? aviso.dataHora.toDate().toLocaleString('pt-BR') : ''}</div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 