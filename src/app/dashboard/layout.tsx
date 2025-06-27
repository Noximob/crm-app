'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';

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
    { href: '/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard CRM' },
    { href: '/crm', icon: BarChartIcon, label: 'CRM' },
    { href: '/dashboard/materiais', icon: FileTextIcon, label: 'Materiais' },
    { href: '#', icon: TargetIcon, label: 'Metas' },
    { href: '#', icon: PresentationIcon, label: 'Treinamentos' },
    { href: '#', icon: AlertTriangleIcon, label: 'Avisos' },
    { href: '/dashboard/pagamentos', icon: CreditCardIcon, label: 'Pagamentos' },
    { href: '#', icon: SettingsIcon, label: 'Configurações' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F5F6FA] flex items-start p-4 gap-4">
      <aside className={`bg-white rounded-xl shadow-sm border border-[#E8E9F1] flex flex-col transition-all duration-300 sticky top-4 ${collapsed ? 'w-16' : 'w-56'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E8E9F1]">
             <div className={`flex items-center overflow-hidden ${collapsed ? 'w-0' : 'w-auto'}`}>
                <div className="h-8 w-8 bg-[#3478F6] rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h1 className="text-xl font-bold text-[#2E2F38] whitespace-nowrap">Alume</h1>
             </div>
             <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-lg hover:bg-[#E8E9F1] transition-colors">
                <ChevronLeftIcon className={`h-5 w-5 text-[#6B6F76] transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
             </button>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
                <NavLink 
                    key={item.href}
                    href={item.href} 
                    icon={item.icon} 
                    collapsed={collapsed}
                    isActive={pathname === item.href}
                >
                    {item.label}
                </NavLink>
            ))}
        </nav>

        <div className="px-3 py-3 border-t border-[#E8E9F1]">
            <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-[#3478F6] flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                  {user.email ? user.email.charAt(0).toUpperCase() : ''}
                </div>
                {!collapsed && (
                    <div className="ml-3 text-sm overflow-hidden">
                        <p className="font-semibold text-[#2E2F38] truncate text-xs">{user.email}</p>
                        <p className="text-[#6B6F76] text-xs">Corretor(a)</p>
                    </div>
                )}
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center mt-3 bg-[#E8E9F1] hover:bg-[#F45B69] hover:text-white text-[#6B6F76] px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200">
                <LogOutIcon className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Logout</span>}
            </button>
        </div>
      </aside>

      <main className="flex-1">
          {children}
      </main>
    </div>
  );
} 