'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, onSnapshot, doc as firestoreDoc, getDoc } from 'firebase/firestore';
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

// Mock dos trending posts
const trendingPosts = [
  {
    id: 1,
    user: {
      name: 'Ana Corretora',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      handle: '@anacorretora',
    },
    time: '2h',
    content: 'Novo lançamento no centro! 🏢 #imobiliaria #oportunidade',
    reposts: 12,
    likes: 30,
    comments: 8,
  },
  {
    id: 2,
    user: {
      name: 'Equipe Alume',
      avatar: '/favicon.ico',
      handle: '@alume',
    },
    time: '1d',
    content: 'Parabéns a todos os corretores que bateram meta este mês! 🎉 #sucesso',
    reposts: 9,
    likes: 25,
    comments: 5,
  },
  {
    id: 3,
    user: {
      name: 'Carlos Santos',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      handle: '@carlossantos',
    },
    time: '5h',
    content: 'Dica: sempre atualize suas fotos profissionais! 📸 #marketingimobiliario',
    reposts: 7,
    likes: 18,
    comments: 2,
  },
];

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [performanceData, setPerformanceData] = useState<number[]>([]);
  const [indicadoresExternos, setIndicadoresExternos] = useState<any>(null);
  const [indicadoresExternosAnterior, setIndicadoresExternosAnterior] = useState<any>(null);

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

  function calcularVariacao(atual: string, anterior: string) {
    const a = parseFloat((atual || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    const b = parseFloat((anterior || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(a) || isNaN(b) || b === 0) return null;
    return ((a - b) / b) * 100;
  }

  const indicadoresList = [
    { key: 'cub', label: 'CUB (SC)' },
    { key: 'selic', label: 'SELIC' },
    { key: 'ipca', label: 'IPCA' },
    { key: 'igpm', label: 'IGP-M' },
    { key: 'incc', label: 'INCC' },
  ];

  const EconomicIndicator = ({ title, value, variacao }: { title: string; value: string; variacao: number | null }) => (
    <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-r from-[#3478F6]/5 to-[#A3C8F7]/5 rounded-lg border border-[#A3C8F7]/20 min-w-[120px] animate-slide-in">
      <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1">{title}</div>
      <div className="text-lg font-bold text-[#2E2F38] dark:text-white">{value}</div>
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
            {indicadoresList.map(ind => (
              <EconomicIndicator
                key={ind.key}
                title={ind.label}
                value={indicadoresExternos?.[ind.key] || '--'}
                variacao={calcularVariacao(indicadoresExternos?.[ind.key], indicadoresExternosAnterior?.[ind.key])}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid de conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda do Dia */}
        <Card className="lg:col-span-2 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <SectionTitle>Agenda do Dia</SectionTitle>
            <a className="text-[#3478F6] dark:text-white font-bold">Ver todas</a>
          </div>
          <div className="space-y-2">
            {todayTasks.map((task, index) => (
              <TaskItem key={index} {...task} />
            ))}
          </div>
        </Card>

        {/* Top Trending */}
        <Card className="animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <SectionTitle>Top Trending</SectionTitle>
            <span className="text-[#3478F6] font-bold text-sm cursor-pointer hover:underline" onClick={() => window.location.href='/dashboard/comunidade'}>Ver comunidade</span>
          </div>
          <div className="flex flex-col gap-4">
            {trendingPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-3">
                <img src={post.user.avatar} alt={post.user.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2E2F38] dark:text-white text-sm">{post.user.name}</span>
                    <span className="text-xs text-[#6B6F76] dark:text-gray-300">{post.user.handle} · {post.time}</span>
                  </div>
                  <div className="text-xs text-[#2E2F38] dark:text-white truncate max-w-[180px]">{post.content}</div>
                  <div className="flex gap-3 mt-1 text-xs text-[#6B6F76] dark:text-gray-300">
                    <span>🔁 {post.reposts}</span>
                    <span>❤️ {post.likes}</span>
                    <span>💬 {post.comments}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Seção inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Gráfico de Performance */}
        <Card className="animate-fade-in">
          <SectionTitle className="mb-6">Performance Semanal</SectionTitle>
          <div className="h-48 flex items-end justify-between gap-2">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, index) => (
              <div key={day} className="flex flex-col items-center">
                <div 
                  className="w-8 bg-gradient-to-t from-[#3478F6] to-[#A3C8F7] rounded-t-lg transition-all duration-300 hover:opacity-80"
                  style={{ height: `${performanceData[index] || 50}px` }}
                ></div>
                <span className="text-xs text-[#6B6F76] dark:text-gray-300 mt-2">{day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Avisos Importantes */}
        <Card className="animate-fade-in">
          <SectionTitle className="mb-6">Avisos Importantes</SectionTitle>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-[#FFCC66]/10 rounded-xl border border-[#FFCC66]/20">
              <AlertCircleIcon className="h-5 w-5 text-[#FFCC66] mt-0.5" />
              <div>
                <div className="text-sm font-medium text-[#2E2F38] dark:text-white">Reunião de Equipe</div>
                <div className="text-xs text-[#6B6F76] dark:text-gray-100">Amanhã às 10h - Novas metas do mês</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#A3C8F7]/10 rounded-xl border border-[#A3C8F7]/20">
              <CheckCircleIcon className="h-5 w-5 text-[#A3C8F7] mt-0.5" />
              <div>
                <div className="text-sm font-medium text-[#2E2F38] dark:text-white">Sistema Atualizado</div>
                <div className="text-xs text-[#6B6F76] dark:text-gray-100">Nova funcionalidade de automação disponível</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#3AC17C]/10 rounded-xl border border-[#3AC17C]/20">
              <StarIcon className="h-5 w-5 text-[#3AC17C] mt-0.5" />
              <div>
                <div className="text-sm font-medium text-[#2E2F38] dark:text-white">Meta Atingida!</div>
                <div className="text-xs text-[#6B6F76] dark:text-gray-100">Você atingiu 75% da meta mensal</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Adicionar link para Pagamentos na navegação lateral, se não existir */}
      <Link href="/dashboard/pagamentos" className="block px-4 py-2 rounded-lg text-[#3478F6] hover:bg-[#E8E9F1] font-semibold transition-colors">
        Pagamentos
      </Link>
    </div>
  );
} 