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

const ChatGPTIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142-.0852 4.783-2.7582a.7712.7712 0 0 0 .7806 0l5.8428 3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="currentColor"/>
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
    {/* Bola azul com gradiente */}
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: '#3478F6', stopOpacity: 1}} />
        <stop offset="100%" style={{stopColor: '#255FD1', stopOpacity: 1}} />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#logoGradient)" />
    {/* Letra A elegante em branco */}
    <path d="M12 4L8 18H10L11 14H13L14 18H16L12 4ZM11.5 12L12 10L12.5 12H11.5Z" fill="white" stroke="white" strokeWidth="0.5" />
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
  const { theme } = useTheme();
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
    { href: 'https://chat.openai.com', icon: ChatGPTIcon, label: 'ChatGPT', isExternal: true },
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
            <button 
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
              title="Voltar ao Dashboard"
            >
              <AlumeLogo className="h-8 w-8" />
              {!collapsed && <h1 className="text-xl font-bold text-[#2E2F38] dark:text-white transition-all">Alume</h1>}
            </button>
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
                  ) : item.isExternal ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center ${collapsed ? 'justify-center' : ''} px-4 py-2.5 rounded-lg transition-colors relative text-[#6B6F76] dark:text-gray-300 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] hover:text-[#2E2F38] dark:hover:text-white`}
                      title={`Abrir ${item.label} em nova aba`}
                    >
                      <span className="mr-3 relative">
                        <item.icon className="h-5 w-5" />
                      </span>
                      {!collapsed && item.label}
                    </a>
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
                        {item.notifications && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-3 w-3 flex items-center justify-center animate-pulse">
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