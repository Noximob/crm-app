'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

// Ícones
const AlertTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
const LayoutDashboardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
const BarChartIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></svg>;
const FileTextIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>;
const TargetIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const PresentationIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m7 21 5-5 5 5" /></svg>;
const MessageSquareIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const LogOutIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>;
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="m15 18-6-6 6-6" /></svg>;
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;

// Novo ícone de casa para 'Incluir imóvel'
const HouseIcon = ({active, ...props}: React.SVGProps<SVGSVGElement> & {active?: boolean}) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10L12 3l9 7" />
    <path d="M9 21V14h6v7" />
    <path d="M21 10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10" />
  </svg>
);

// Ícone de chave para Área administrador
const KeyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3478F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="3.5" />
    <path d="M21 2l-9.6 9.6" />
    <path d="M15.5 7.5l1.5 1.5" />
    <path d="M17.5 5.5l1.5 1.5" />
  </svg>
);

// Adicionar logo fictícia SVG
const AlumeLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#3478F6" />
    <path d="M10 22L16 8L22 22" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="16" cy="18" r="2" fill="#fff" />
  </svg>
);

// Ícone de comunidade (balão de diálogo)
const CommunityIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="8.5" cy="10.5" r="1" />
    <circle cx="12" cy="10.5" r="1" />
    <circle cx="15.5" cy="10.5" r="1" />
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
  const { currentUser: user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

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

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard' },
    { href: '/crm', icon: BarChartIcon, label: 'CRM' },
    { href: '/dashboard/materiais', icon: FileTextIcon, label: 'Materiais' },
    { href: '/dashboard/comunidade', icon: CommunityIcon, label: 'Comunidade' },
    { href: '/dashboard/metas', icon: TargetIcon, label: 'Metas' },
    { href: '/dashboard/treinamentos', icon: PresentationIcon, label: 'Treinamentos' },
    { href: '/dashboard/incluir-imovel', icon: HouseIcon, label: 'Incluir imóvel' },
    { href: '/dashboard/pagamentos', icon: CreditCardIcon, label: 'Pagamentos' },
    { href: '/dashboard/configuracoes', icon: SettingsIcon, label: 'Configurações' },
    { href: '/dashboard/admin', icon: KeyIcon, label: 'Área administrador' },
  ];

  return (
    <div className={`flex h-screen bg-[#F5F6FA] dark:bg-[#181C23]`}>
      {/* Sidebar */}
      <div className={`flex flex-col justify-between h-screen fixed inset-y-0 left-0 z-50 ${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-[#23283A] shadow-lg transition-all duration-300 text-xs`}>
        <div>
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
          <nav className="p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center ${collapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg transition-colors ${
                      pathname === item.href
                        ? 'bg-[#3478F6] text-white'
                        : 'text-[#6B6F76] dark:text-gray-300 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] hover:text-[#2E2F38] dark:hover:text-white'
                    }`}
                    onClick={() => setCollapsed(false)}
                  >
                    <span className="mr-3">
                      {item.label === 'Incluir imóvel' ? (
                        <HouseIcon active={pathname === item.href} className="h-5 w-5" />
                      ) : (
                        <item.icon className="h-5 w-5" />
                      )}
                    </span>
                    {!collapsed && item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        {/* Botão Desconectar */}
        <div className="p-4 border-t border-[#E8E9F1] dark:border-[#23283A] mb-12">
          <button
            onClick={handleLogout}
            className={`flex items-center ${collapsed ? 'justify-center' : ''} w-full px-4 py-3 rounded-lg transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400`}
            title="Desconectar"
          >
            <LogOutIcon className="h-5 w-5 mr-3" />
            {!collapsed && <span>Desconectar</span>}
          </button>
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