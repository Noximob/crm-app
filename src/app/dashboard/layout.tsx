'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';

// Ícones
const LayoutDashboardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
const NewspaperIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2V4" /><path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3v18" /></svg>;
const BarChartIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>;
const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>;
const MegaphoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>;
const TargetIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L8.6 3.3a2 2 0 0 0-1.7-.9H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>;
const PresentationIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m7 21 5-5 5 5" /></svg>;
const MessageSquareIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const LogOutIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>;
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props}><path d="m15 18-6-6 6-6" /></svg>;


const NavLink = ({ href, icon: Icon, children, collapsed }: any) => (
    <Link href={href} className="flex items-center px-4 py-2.5 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-semibold">
        <Icon className="h-5 w-5 text-primary-500" />
        {!collapsed && <span className="ml-4">{children}</span>}
    </Link>
);


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><p>Carregando...</p></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 flex items-start p-4 gap-4">
      <aside className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex flex-col transition-all duration-300 sticky top-4 ${collapsed ? 'w-20' : 'w-72'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
             <div className={`flex items-center overflow-hidden ${collapsed ? 'w-0' : 'w-auto'}`}>
                <div className="h-10 w-10 bg-primary-500 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white whitespace-nowrap">Alume</h1>
             </div>
             <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronLeftIcon className={`h-6 w-6 text-gray-500 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
             </button>
        </div>
        
        <nav className="px-4 py-6 space-y-2">
            <NavLink href="/dashboard" icon={LayoutDashboardIcon} collapsed={collapsed}>Dashboard</NavLink>
            <NavLink href="#" icon={BuildingIcon} collapsed={collapsed}>Material Construtoras</NavLink>
            <NavLink href="#" icon={BarChartIcon} collapsed={collapsed}>DWV</NavLink>
            <NavLink href="#" icon={MegaphoneIcon} collapsed={collapsed}>Material de Marketing</NavLink>
            <NavLink href="#" icon={TargetIcon} collapsed={collapsed}>Metas do time</NavLink>
            <NavLink href="#" icon={PresentationIcon} collapsed={collapsed}>Treinamentos</NavLink>
            <NavLink href="#" icon={MessageSquareIcon} collapsed={collapsed}>Chat Interno</NavLink>
        </nav>

        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
            <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-500 font-bold flex-shrink-0">
                  {user.email ? user.email.charAt(0).toUpperCase() : ''}
                </div>
                {!collapsed && (
                    <div className="ml-3 text-sm overflow-hidden">
                        <p className="font-semibold text-gray-800 dark:text-white truncate">{user.email}</p>
                    </div>
                )}
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center mt-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <LogOutIcon className="h-5 w-5" />
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