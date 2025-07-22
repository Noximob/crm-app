'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

// Ícones
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="m22 21-2-2"/>
    <path d="M16 16l4 4"/>
  </svg>
);

const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
);

const BarChartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);

const ActivityIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const MessageSquareIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const BookOpenIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

interface DashboardStats {
  totalUsers: number;
  totalLeads: number;
  totalImoveis: number;
  totalPosts: number;
  totalTreinamentos: number;
  leadsThisMonth: number;
  imoveisThisMonth: number;
  postsThisMonth: number;
  topCorretores: Array<{nome: string, leads: number, imoveis: number}>;
  leadsByStage: Array<{stage: string, count: number}>;
  postsByType: Array<{type: string, count: number}>;
  imoveisByType: Array<{type: string, count: number}>;
  recentActivity: Array<{type: string, description: string, date: Date}>;
}

interface UserData {
  id: string;
  nome: string;
  tipoConta: string;
  imobiliariaId: string;
  aprovado: boolean;
}

interface LeadData {
  id: string;
  nome: string;
  etapa: string;
  createdAt: any;
  userId: string;
  imobiliariaId: string;
}

interface ImovelData {
  id: string;
  nome: string;
  tipo: string;
  criadoEm: any;
  corretorId: string;
  imobiliariaId: string;
}

interface PostData {
  id: string;
  nome: string;
  file?: string;
  youtubeLink?: string;
  createdAt: any;
  userId: string;
}

const relatorioTabs = [
  { id: 'overview', label: 'Visão Geral', icon: BarChartIcon },
  { id: 'users', label: 'Usuários', icon: UsersIcon },
  { id: 'leads', label: 'Leads', icon: TrendingUpIcon },
  { id: 'imoveis', label: 'Imóveis', icon: HomeIcon },
  { id: 'comunidade', label: 'Comunidade', icon: MessageSquareIcon },
  { id: 'treinamentos', label: 'Treinamentos', icon: BookOpenIcon },
];

export default function RelatoriosAdminPage() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // dias

  useEffect(() => {
    if (userData?.imobiliariaId) {
      fetchDashboardStats();
    }
  }, [userData, dateRange]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const imobiliariaId = userData?.imobiliariaId;
      if (!imobiliariaId) {
        setLoading(false);
        return;
      }
      
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      // Buscar dados em paralelo
      const [
        usersData,
        leadsData,
        imoveisData,
        postsData,
        treinamentosData
      ] = await Promise.all([
        fetchUsers(imobiliariaId),
        fetchLeads(imobiliariaId, daysAgo),
        fetchImoveis(imobiliariaId, daysAgo),
        fetchPosts(imobiliariaId, daysAgo),
        fetchTreinamentos(imobiliariaId)
      ]);

      setStats({
        totalUsers: usersData.total,
        totalLeads: leadsData.total,
        totalImoveis: imoveisData.total,
        totalPosts: postsData.total,
        totalTreinamentos: treinamentosData.total,
        leadsThisMonth: leadsData.thisMonth,
        imoveisThisMonth: imoveisData.thisMonth,
        postsThisMonth: postsData.thisMonth,
        topCorretores: usersData.topCorretores,
        leadsByStage: leadsData.byStage,
        postsByType: postsData.byType,
        imoveisByType: imoveisData.byType,
        recentActivity: [...leadsData.recent, ...postsData.recent, ...imoveisData.recent]
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 10)
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (imobiliariaId: string) => {
    const q = query(
      collection(db, 'usuarios'),
      where('imobiliariaId', '==', imobiliariaId),
      where('aprovado', '==', true)
    );
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));

    // Buscar leads por usuário para ranking
    const topCorretores = await Promise.all(
      users.filter(u => u.tipoConta !== 'imobiliaria').map(async (user) => {
        const leadsQuery = query(
          collection(db, 'leads'),
          where('userId', '==', user.id)
        );
        const imoveisQuery = query(
          collection(db, 'imoveis_captados'),
          where('corretorId', '==', user.id)
        );
        
        const [leadsSnap, imoveisSnap] = await Promise.all([
          getDocs(leadsQuery),
          getDocs(imoveisQuery)
        ]);

        return {
          nome: user.nome,
          leads: leadsSnap.size,
          imoveis: imoveisSnap.size
        };
      })
    );

    return {
      total: users.length,
      topCorretores: topCorretores.sort((a, b) => b.leads - a.leads).slice(0, 5)
    };
  };

  const fetchLeads = async (imobiliariaId: string, daysAgo: Date) => {
    const q = query(
      collection(db, 'leads'),
      where('imobiliariaId', '==', imobiliariaId)
    );
    const snapshot = await getDocs(q);
    const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeadData));

    const thisMonth = leads.filter(lead => {
      const createdAt = lead.createdAt?.toDate?.() || new Date(lead.createdAt);
      return createdAt >= daysAgo;
    });

    // Agrupar por etapa
    const byStage = leads.reduce((acc, lead) => {
      const stage = lead.etapa || 'Sem etapa';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recent = thisMonth.slice(0, 5).map(lead => ({
      type: 'lead',
      description: `Novo lead: ${lead.nome}`,
      date: lead.createdAt?.toDate?.() || new Date(lead.createdAt)
    }));

    return {
      total: leads.length,
      thisMonth: thisMonth.length,
      byStage: Object.entries(byStage).map(([stage, count]) => ({ stage, count })),
      recent
    };
  };

  const fetchImoveis = async (imobiliariaId: string, daysAgo: Date) => {
    const q = query(
      collection(db, 'imoveis_captados'),
      where('imobiliariaId', '==', imobiliariaId)
    );
    const snapshot = await getDocs(q);
    const imoveis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImovelData));

    const thisMonth = imoveis.filter(imovel => {
      const createdAt = imovel.criadoEm?.toDate?.() || new Date(imovel.criadoEm);
      return createdAt >= daysAgo;
    });

    // Agrupar por tipo
    const byType = imoveis.reduce((acc, imovel) => {
      const type = imovel.tipo || 'Não especificado';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recent = thisMonth.slice(0, 5).map(imovel => ({
      type: 'imovel',
      description: `Imóvel captado: ${imovel.nome}`,
      date: imovel.criadoEm?.toDate?.() || new Date(imovel.criadoEm)
    }));

    return {
      total: imoveis.length,
      thisMonth: thisMonth.length,
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      recent
    };
  };

  const fetchPosts = async (imobiliariaId: string, daysAgo: Date) => {
    const q = query(
      collection(db, 'comunidadePosts'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostData));

    // Filtrar posts de usuários da imobiliária
    const usersQuery = query(
      collection(db, 'usuarios'),
      where('imobiliariaId', '==', imobiliariaId)
    );
    const usersSnap = await getDocs(usersQuery);
    const userIds = usersSnap.docs.map(doc => doc.id);
    
    const filteredPosts = posts.filter(post => userIds.includes(post.userId));
    const thisMonth = filteredPosts.filter(post => {
      const createdAt = post.createdAt?.toDate?.() || new Date(post.createdAt);
      return createdAt >= daysAgo;
    });

    // Agrupar por tipo
    const byType = filteredPosts.reduce((acc, post) => {
      let type = 'texto';
      if (post.file) type = 'arquivo';
      if (post.youtubeLink) type = 'youtube';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recent = thisMonth.slice(0, 5).map(post => ({
      type: 'post',
      description: `Post de ${post.nome}`,
      date: post.createdAt?.toDate?.() || new Date(post.createdAt)
    }));

    return {
      total: filteredPosts.length,
      thisMonth: thisMonth.length,
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      recent
    };
  };

  const fetchTreinamentos = async (imobiliariaId: string) => {
    const q = query(
      collection(db, 'treinamentos'),
      where('imobiliariaId', '==', imobiliariaId)
    );
    const snapshot = await getDocs(q);
    const treinamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return {
      total: treinamentos.length
    };
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6] mx-auto mb-4"></div>
              <p className="text-[#6B6F76] dark:text-gray-300">Carregando relatórios...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Relatórios e Analytics</h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Acompanhe os principais indicadores da sua imobiliária</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#2E2F38] dark:text-white"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-2 border-b border-[#E8E9F1] dark:border-[#23283A] mb-6 overflow-x-auto">
          {relatorioTabs.map(tab => (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors duration-150 ${
                activeTab === tab.id 
                  ? 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#3478F6]' 
                  : 'text-[#6B6F76] dark:text-gray-300 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23]'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="min-h-[600px]">
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Cards principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <UsersIcon className="h-6 w-6 text-[#3478F6]" />
                    </div>
                    <span className="text-sm text-green-600 font-medium">+12%</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-1">
                    {formatNumber(stats.totalUsers)}
                  </h3>
                  <p className="text-sm text-[#6B6F76] dark:text-gray-300">Usuários ativos</p>
                </div>

                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <TrendingUpIcon className="h-6 w-6 text-[#22C55E]" />
                    </div>
                    <span className="text-sm text-green-600 font-medium">+{stats.leadsThisMonth}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-1">
                    {formatNumber(stats.totalLeads)}
                  </h3>
                  <p className="text-sm text-[#6B6F76] dark:text-gray-300">Leads totais</p>
                </div>

                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <HomeIcon className="h-6 w-6 text-[#A855F7]" />
                    </div>
                    <span className="text-sm text-green-600 font-medium">+{stats.imoveisThisMonth}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-1">
                    {formatNumber(stats.totalImoveis)}
                  </h3>
                  <p className="text-sm text-[#6B6F76] dark:text-gray-300">Imóveis captados</p>
                </div>

                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <MessageSquareIcon className="h-6 w-6 text-[#F59E0B]" />
                    </div>
                    <span className="text-sm text-green-600 font-medium">+{stats.postsThisMonth}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-1">
                    {formatNumber(stats.totalPosts)}
                  </h3>
                  <p className="text-sm text-[#6B6F76] dark:text-gray-300">Posts na comunidade</p>
                </div>
              </div>

              {/* Gráficos e rankings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Corretores */}
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                  <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                    <ActivityIcon className="h-5 w-5 text-[#3478F6]" />
                    Top Corretores
                  </h3>
                  <div className="space-y-4">
                    {stats.topCorretores.map((corretor, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-orange-500' : 'bg-[#3478F6]'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium text-[#2E2F38] dark:text-white">{corretor.nome}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#3478F6]">{corretor.leads} leads</div>
                          <div className="text-sm text-[#6B6F76] dark:text-gray-300">{corretor.imoveis} imóveis</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leads por Etapa */}
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                  <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                    <BarChartIcon className="h-5 w-5 text-[#3478F6]" />
                    Leads por Etapa
                  </h3>
                  <div className="space-y-3">
                    {stats.leadsByStage.map((stage, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-[#6B6F76] dark:text-gray-300">{stage.stage}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-[#3478F6] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(stage.count / stats.totalLeads) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-[#2E2F38] dark:text-white w-8 text-right">
                            {stage.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Atividade Recente */}
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Atividade Recente</h3>
                <div className="space-y-3">
                  {stats.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'lead' ? 'bg-green-500' :
                        activity.type === 'imovel' ? 'bg-blue-500' :
                        'bg-orange-500'
                      }`}></div>
                      <span className="text-sm text-[#2E2F38] dark:text-white flex-1">{activity.description}</span>
                      <span className="text-xs text-[#6B6F76] dark:text-gray-300">{formatDate(activity.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#3478F6] mb-2">{formatNumber(stats.totalUsers)}</h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Total de Usuários</p>
                </div>
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#22C55E] mb-2">{formatNumber(stats.topCorretores.length)}</h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Corretores Ativos</p>
                </div>
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#F59E0B] mb-2">
                    {stats.topCorretores.length > 0 ? Math.round(stats.totalLeads / stats.topCorretores.length) : 0}
                  </h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Média de Leads/Corretor</p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Performance dos Corretores</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E8E9F1] dark:border-[#23283A]">
                        <th className="text-left py-3 text-[#6B6F76] dark:text-gray-300 font-medium">Corretor</th>
                        <th className="text-center py-3 text-[#6B6F76] dark:text-gray-300 font-medium">Leads</th>
                        <th className="text-center py-3 text-[#6B6F76] dark:text-gray-300 font-medium">Imóveis</th>
                        <th className="text-center py-3 text-[#6B6F76] dark:text-gray-300 font-medium">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topCorretores.map((corretor, index) => (
                        <tr key={index} className="border-b border-[#E8E9F1] dark:border-[#23283A]">
                          <td className="py-3 text-[#2E2F38] dark:text-white font-medium">{corretor.nome}</td>
                          <td className="py-3 text-center text-[#3478F6] font-bold">{corretor.leads}</td>
                          <td className="py-3 text-center text-[#22C55E] font-bold">{corretor.imoveis}</td>
                          <td className="py-3 text-center">
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {Math.round((corretor.leads / Math.max(...stats.topCorretores.map(c => c.leads))) * 100)}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leads' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#3478F6] mb-2">{formatNumber(stats.totalLeads)}</h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Total de Leads</p>
                </div>
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#22C55E] mb-2">{formatNumber(stats.leadsThisMonth)}</h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Novos este mês</p>
                </div>
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#F59E0B] mb-2">
                    {stats.totalLeads > 0 ? Math.round((stats.leadsThisMonth / stats.totalLeads) * 100) : 0}%
                  </h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Crescimento mensal</p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Distribuição por Etapa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {stats.leadsByStage.map((stage, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                      <div>
                        <h4 className="font-medium text-[#2E2F38] dark:text-white">{stage.stage}</h4>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                          {stats.totalLeads > 0 ? Math.round((stage.count / stats.totalLeads) * 100) : 0}% do total
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#3478F6]">{stage.count}</div>
                        <div className="text-sm text-[#6B6F76] dark:text-gray-300">leads</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'imoveis' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#3478F6] mb-2">{formatNumber(stats.totalImoveis)}</h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Total de Imóveis</p>
                </div>
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#22C55E] mb-2">{formatNumber(stats.imoveisThisMonth)}</h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Captados este mês</p>
                </div>
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#F59E0B] mb-2">
                    {stats.totalImoveis > 0 ? Math.round((stats.imoveisThisMonth / stats.totalImoveis) * 100) : 0}%
                  </h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Crescimento mensal</p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Imóveis por Tipo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {stats.imoveisByType.map((type, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                      <div>
                        <h4 className="font-medium text-[#2E2F38] dark:text-white capitalize">{type.type}</h4>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                          {stats.totalImoveis > 0 ? Math.round((type.count / stats.totalImoveis) * 100) : 0}% do total
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#A855F7]">{type.count}</div>
                        <div className="text-sm text-[#6B6F76] dark:text-gray-300">imóveis</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comunidade' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#3478F6] mb-2">{formatNumber(stats.totalPosts)}</h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Total de Posts</p>
                </div>
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#22C55E] mb-2">{formatNumber(stats.postsThisMonth)}</h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Posts este mês</p>
                </div>
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#F59E0B] mb-2">
                    {stats.totalPosts > 0 ? Math.round((stats.postsThisMonth / stats.totalPosts) * 100) : 0}%
                  </h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Engajamento mensal</p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Posts por Tipo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {stats.postsByType.map((type, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-[#F5F6FA] dark:bg-[#181C23] rounded-lg">
                      <div>
                        <h4 className="font-medium text-[#2E2F38] dark:text-white capitalize">{type.type}</h4>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                          {stats.totalPosts > 0 ? Math.round((type.count / stats.totalPosts) * 100) : 0}% do total
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#F59E0B]">{type.count}</div>
                        <div className="text-sm text-[#6B6F76] dark:text-gray-300">posts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'treinamentos' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#3478F6] mb-2">{formatNumber(stats.totalTreinamentos)}</h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Total de Treinamentos</p>
                </div>
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] text-center">
                  <h3 className="text-3xl font-bold text-[#22C55E] mb-2">
                    {stats.totalUsers > 0 ? Math.round(stats.totalTreinamentos / stats.totalUsers) : 0}
                  </h3>
                  <p className="text-[#6B6F76] dark:text-gray-300">Média por usuário</p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Resumo de Treinamentos</h3>
                <div className="text-center py-8">
                  <BookOpenIcon className="h-16 w-16 text-[#6B6F76] dark:text-gray-300 mx-auto mb-4" />
                  <p className="text-[#6B6F76] dark:text-gray-300">
                    {stats.totalTreinamentos} treinamentos disponíveis para {stats.totalUsers} usuários
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 