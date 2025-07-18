'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';

// Ícones
const AlertTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;

const LayoutDashboardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;

const BarChartIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>;

const FileTextIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>;

const CommunityIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

const PresentationIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>;

const HouseIcon = ({ active, ...props }: React.SVGProps<SVGSVGElement> & { active?: boolean }) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;

const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;

const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;

const KeyIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>;

const CodeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>;

const LogOutIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;

const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>;

const AlumeLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NavLink = ({ href, icon: Icon, children, collapsed, isActive }: any) => (
    <Link href={href} className={`flex items-center px-3 py-2.5 text-[#2E2F38] hover:bg-[#E8E9F1] rounded-lg transition-all duration-200 text-sm font-medium ${
        isActive ? 'bg-[#3478F6] text-white shadow-md' : 'hover:text-[#3478F6]'
    }`}>
        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#3478F6]'}`} />
        {!collapsed && <span className="ml-3">{children}</span>}
    </Link>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser: user, userData, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { notifications, resetNotification } = useNotifications();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Resetar notificação quando acessa a seção
  useEffect(() => {
    if (pathname === '/dashboard/comunidade') {
      // Resetar imediatamente ao acessar a página
      resetNotification('comunidade');
    }
  }, [pathname, resetNotification]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA]"><p className="text-[#2E2F38]">Carregando...</p></div>;
  if (!user) return null;

  // Adicionar uma tipagem local para userData que inclua permissoes opcional
  // (isso é só para evitar erro de linter, pois o campo pode existir no Firestore)
  type UserDataWithPerms = typeof userData & { permissoes?: { admin?: boolean; developer?: boolean } };
  const userDataWithPerms = userData as UserDataWithPerms;

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard' },
    { href: '/dashboard/crm', icon: BarChartIcon, label: 'CRM' },
    { href: '/dashboard/materiais', icon: FileTextIcon, label: 'Materiais' },
    { href: '/dashboard/comunidade', icon: CommunityIcon, label: 'Comunidade', notifications: notifications.comunidade },
    { href: '/dashboard/treinamentos', icon: PresentationIcon, label: 'Treinamentos' },
    { href: '/dashboard/incluir-imovel', icon: HouseIcon, label: 'Incluir imóvel' },
    { href: '/dashboard/pagamentos', icon: CreditCardIcon, label: 'Pagamentos' },
    { href: '/dashboard/configuracoes', icon: SettingsIcon, label: 'Configurações' },
    // Exibir admin se for imobiliaria OU tiver permissao admin
    ...((userDataWithPerms?.tipoConta === 'imobiliaria' || userDataWithPerms?.permissoes?.admin) ? [
    { href: '/dashboard/admin', icon: KeyIcon, label: 'Área administrador' },
    ] : []),
    // Exibir dev se for imobiliaria OU tiver permissao developer
    ...((userDataWithPerms?.tipoConta === 'imobiliaria' || userDataWithPerms?.permissoes?.developer) ? [
    { href: '/dashboard/developer', icon: CodeIcon, label: 'Área do Desenvolvedor' },
    ] : []),
    { href: '#', icon: LogOutIcon, label: 'Desconectar', isLogout: true },
  ];

  return (
    <div className={`flex h-screen bg-[#F5F6FA] dark:bg-[#181C23]`}>
      {/* Sidebar */}
      <div className={`flex flex-col h-screen fixed inset-y-0 left-0 z-50 ${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-[#23283A] shadow-lg transition-all duration-300 text-xs pb-8`}>
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center gap-2">
              <AlumeLogo className="h-8 w-8" />
              {!collapsed && <h1 className="text-xl font-bold text-[#2E2F38] dark:text-white transition-all">Alume</h1>}
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-lg hover:bg-[#E8E9F1] transition-colors"
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              <ChevronLeftIcon className={`h-5 w-5 text-[#6B6F76] transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          <nav className="flex-1 p-4">
            <ul className="space-y-0.5">
              {navItems.map((item) => (
                <li key={item.href}>
                  {item.isLogout ? (
                    <button
                      onClick={handleLogout}
                      className={`flex items-center ${collapsed ? 'justify-center' : ''} w-full px-4 py-2.5 rounded-lg transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400`}
                      title="Desconectar"
                    >
                      <span className="mr-3">
                        <item.icon className="h-5 w-5" />
                      </span>
                      {!collapsed && item.label}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center ${collapsed ? 'justify-center' : ''} px-4 py-2.5 rounded-lg transition-colors relative ${
                        pathname === item.href
                          ? 'bg-[#3478F6] text-white'
                          : 'text-[#6B6F76] dark:text-gray-300 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] hover:text-[#2E2F38] dark:hover:text-white'
                      }`}
                      onClick={() => setCollapsed(false)}
                    >
                      <span className="mr-3 relative">
                        {item.label === 'Incluir imóvel' ? (
                          <HouseIcon active={pathname === item.href} className="h-5 w-5" />
                        ) : item.label === 'Área do Desenvolvedor' ? (
                          <CodeIcon className="h-5 w-5" />
                        ) : (
                          <item.icon className="h-5 w-5" />
                        )}
                        {/* Badge de notificação */}
                        {item.notifications && item.notifications > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                            {item.notifications > 99 ? '99+' : item.notifications}
                          </span>
                        )}
                      </span>
                      {!collapsed && item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-white dark:bg-[#23283A] shadow-sm border-b border-[#E8E9F1] dark:border-[#23283A] p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCollapsed(true)}
              className="md:hidden text-[#6B6F76] dark:text-gray-300 hover:text-[#2E2F38] dark:hover:text-white"
            >
              ☰
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Overlay */}
      {collapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setCollapsed(false)}
        />
      )}
    </div>
  );
} 