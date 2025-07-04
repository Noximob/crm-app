'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import AdminEntidades from './admin-entidades';

// Ícones
const BugIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m8 2 1.88 1.88"/>
    <path d="M14.12 3.88 16 2"/>
    <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/>
    <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/>
    <path d="M12 20v-9"/>
    <path d="M6.53 9C4.6 8.8 3 7.1 3 5"/>
    <path d="M6 13H2"/>
    <path d="M3 21c0-2.1 1.7-3.9 3.8-4"/>
    <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/>
    <path d="M22 13h-4"/>
    <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>
  </svg>
);

const DatabaseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
  </svg>
);

const ActivityIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);

const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const TerminalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"/>
    <line x1="12" x2="20" y1="19" y2="19"/>
  </svg>
);

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 ${className}`}>
    {children}
  </div>
);

const MetricCard = ({ title, value, icon: Icon, color = 'blue' }: {
  title: string;
  value: string | number;
  icon: any;
  color?: 'blue' | 'green' | 'red' | 'orange';
}) => {
  const colorClasses = {
    blue: 'bg-[#3478F6]/10 text-[#3478F6]',
    green: 'bg-[#3AC17C]/10 text-[#3AC17C]',
    red: 'bg-[#F45B69]/10 text-[#F45B69]',
    orange: 'bg-[#FF6B6B]/10 text-[#FF6B6B]'
  };

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-1">{value}</div>
      <div className="text-sm text-[#6B6F76] dark:text-gray-300">{title}</div>
    </Card>
  );
};

export default function DeveloperPage() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLeads: 0,
    activeSessions: 0,
    errors: 0
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadDeveloperStats();
      loadSystemLogs();
    }
  }, [currentUser]);

  const loadDeveloperStats = async () => {
    try {
      // Buscar estatísticas do sistema
      const usersSnapshot = await getDocs(collection(db, 'usuarios'));
      const leadsSnapshot = await getDocs(collection(db, 'leads'));
      
      setStats({
        totalUsers: usersSnapshot.size,
        totalLeads: leadsSnapshot.size,
        activeSessions: Math.floor(Math.random() * 50) + 10, // Simulado
        errors: Math.floor(Math.random() * 5) // Simulado
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadSystemLogs = () => {
    // Simular logs do sistema
    const mockLogs = [
      { id: 1, level: 'info', message: 'Sistema iniciado com sucesso', timestamp: new Date(), user: 'Sistema' },
      { id: 2, level: 'warning', message: 'Tentativa de login falhou', timestamp: new Date(Date.now() - 300000), user: 'user@example.com' },
      { id: 3, level: 'error', message: 'Erro na conexão com Firebase', timestamp: new Date(Date.now() - 600000), user: 'Sistema' },
      { id: 4, level: 'info', message: 'Novo usuário registrado', timestamp: new Date(Date.now() - 900000), user: 'admin@alume.com' },
      { id: 5, level: 'info', message: 'Backup automático realizado', timestamp: new Date(Date.now() - 1200000), user: 'Sistema' }
    ];
    setLogs(mockLogs);
    setIsLoading(false);
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <p>Carregando área do desenvolvedor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">


        {/* Título e Descrição */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-5xl">💻</span>
            <h1 className="text-4xl font-bold text-[#2E2F38] dark:text-white">Área do Desenvolvedor</h1>
          </div>
          <p className="text-xl text-[#6B6F76] dark:text-gray-300 max-w-3xl mx-auto">
            Ferramentas e informações para desenvolvimento, debugging e monitoramento do sistema.
          </p>
        </div>

        {/* Métricas do Sistema */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Usuários Totais"
            value={stats.totalUsers}
            icon={DatabaseIcon}
            color="blue"
          />
          <MetricCard
            title="Leads no Sistema"
            value={stats.totalLeads}
            icon={ActivityIcon}
            color="green"
          />
          <MetricCard
            title="Sessões Ativas"
            value={stats.activeSessions}
            icon={SettingsIcon}
            color="orange"
          />
          <MetricCard
            title="Erros Hoje"
            value={stats.errors}
            icon={BugIcon}
            color="red"
          />
        </div>
        <AdminEntidades />

        {/* Ferramentas de Desenvolvimento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Console de Logs */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Logs do Sistema</h2>
              <button className="text-[#3478F6] hover:text-[#2E6FD9] text-sm font-medium">
                Ver Todos
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border border-[#E8E9F1] dark:border-[#23283A]">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLogLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-[#2E2F38] dark:text-white mb-1">{log.message}</p>
                  <p className="text-xs text-[#6B6F76] dark:text-gray-300">Usuário: {log.user}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Admin Imobiliárias */}
          <Card>
            <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-6">Admin Imobiliárias</h2>
            <div className="space-y-4">
              <Link href="/dashboard/developer/admin-imobiliarias" className="w-full flex items-center justify-between p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-[#3478F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-[#2E2F38] dark:text-white font-medium">Gestão de Imobiliárias</span>
                </div>
                <span className="text-[#6B6F76] dark:text-gray-300">→</span>
              </Link>
              
              <Link href="/dashboard/developer/admin-corretores" className="w-full flex items-center justify-between p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-[#3AC17C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span className="text-[#2E2F38] dark:text-white font-medium">Gestão de Corretores</span>
                </div>
                <span className="text-[#6B6F76] dark:text-gray-300">→</span>
              </Link>
              
              <Link href="/dashboard/developer/admin-leads" className="w-full flex items-center justify-between p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-[#2E2F38] dark:text-white font-medium">Gestão de Leads</span>
                </div>
                <span className="text-[#6B6F76] dark:text-gray-300">→</span>
              </Link>
              
              <Link href="/dashboard/developer/admin-permissoes" className="w-full flex items-center justify-between p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-[#F45B69]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-[#2E2F38] dark:text-white font-medium">Gestão de Permissões</span>
                </div>
                <span className="text-[#6B6F76] dark:text-gray-300">→</span>
              </Link>
            </div>
          </Card>
        </div>

        {/* Status do Sistema */}
        <Card>
          <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-6">Status do Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Firebase</p>
                <p className="text-sm text-green-600 dark:text-green-300">Conectado</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">API</p>
                <p className="text-sm text-green-600 dark:text-green-300">Online</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Banco de Dados</p>
                <p className="text-sm text-green-600 dark:text-green-300">Ativo</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 