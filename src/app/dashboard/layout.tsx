'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '@/lib/firebase';
import { getDoc, doc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { PipelineStagesProvider } from '@/context/PipelineStagesContext';

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
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>;
const ReceiptIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>;

const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;

const KeyIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>;

const CodeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>;

const LogOutIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;

/** Ícone Shop — moeda amarela (único do menu com cor); gasto de moedas */
const ShopIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
  </svg>
);

const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6"/></svg>;

const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;

// Ícones novos — mais fiéis à função de cada item do menu
const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const KanbanIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/></svg>;
const BanknoteIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/></svg>;
const GraduationCapIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>;
const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>;
const ShieldIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>;

// Label do tipo de evento/agenda (igual dashboard)
function getTipoAgendaLabel(tipo: string): string {
  const map: Record<string, string> = {
    reuniao: 'Reunião', evento: 'Evento', treinamento: 'Treinamento', 'revisar-crm': 'Revisar CRM',
    'ligacao-ativa': 'Ligação Ativa', 'acao-de-rua': 'Ação de rua', 'disparo-de-msg': 'Disparo de Msg',
    plantao: 'Plantão',
    outro: 'Outro', meet: 'Google Meet', youtube: 'YouTube Live', instagram: 'Instagram Live', discord: 'Discord',
  };
  return map[tipo] || tipo;
}

const NavLink = ({ href, icon: Icon, children, collapsed, isActive }: any) => (
    <Link href={href} className={`flex items-center px-3 py-2.5 text-[#2E2F38] hover:bg-[#E8E9F1] rounded-lg transition-all duration-200 text-sm font-medium ${
        isActive ? 'bg-primary-500 text-white shadow-md' : 'hover:text-primary-600'
    }`}>
        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-primary-500'}`} />
        {!collapsed && <span className="ml-3">{children}</span>}
    </Link>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser: user, userData, loading, isEspelhoDemo, logout } = useAuth();
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

  // Convites de eventos (plantoes + agenda) em que o usuário foi marcado e ainda não respondeu
  const [agendaImobiliaria, setAgendaImobiliaria] = useState<any[]>([]);
  const [respondendoPresenca, setRespondendoPresenca] = useState<string | null>(null);

  useEffect(() => {
    if (isEspelhoDemo) return;
    const fetchAgenda = async () => {
      if (!userData?.imobiliariaId) return;
      try {
        const q = query(collection(db, 'agendaImobiliaria'), where('imobiliariaId', '==', userData.imobiliariaId));
        const snapshot = await getDocs(q);
        setAgendaImobiliaria(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setAgendaImobiliaria([]);
      }
    };
    fetchAgenda();
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  const convitesPendentes = React.useMemo(() => {
    const uid = user?.uid;
    if (!uid) return [];
    const lista: { tipo: 'plantao' | 'agenda'; id: string; titulo: string; tipoLabel: string; dataStr: string; horarioStr: string; sortTime: number }[] = [];
    agendaImobiliaria.forEach((a: any) => {
      if (!Array.isArray(a.presentesIds) || !a.presentesIds.includes(uid)) return;
      if (a.respostasPresenca?.[uid]) return;
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
      });
    });
    lista.sort((a, b) => a.sortTime - b.sortTime);
    return lista;
  }, [user?.uid, agendaImobiliaria]);

  const responderPresenca = async (tipo: 'plantao' | 'agenda', id: string, status: 'confirmado' | 'cancelado') => {
    const uid = user?.uid;
    if (!uid) return;
    const key = `${tipo}-${id}`;
    setRespondendoPresenca(key);
    try {
      // Plantões agora também são eventos da agenda imobiliária (coleção unificada)
      const ref = doc(db, 'agendaImobiliaria', id);
      const item = agendaImobiliaria.find((a: any) => a.id === id);
      const atuais = (item?.respostasPresenca || {}) as Record<string, string>;
      await updateDoc(ref, { respostasPresenca: { ...atuais, [uid]: status } });
      setAgendaImobiliaria(prev => prev.map((a: any) => a.id === id ? { ...a, respostasPresenca: { ...atuais, [uid]: status } } : a));
    } catch (e) {
      console.error('Erro ao atualizar presença:', e);
    } finally {
      setRespondendoPresenca(null);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-particles"><p className="text-text-primary">Carregando...</p></div>;
  if (!user) return null;

  // Adicionar uma tipagem local para userData que inclua permissoes opcional
  // (isso é só para evitar erro de linter, pois o campo pode existir no Firestore)
  type UserDataWithPerms = typeof userData & { permissoes?: { admin?: boolean; developer?: boolean } };
  const userDataWithPerms = userData as UserDataWithPerms;

  const isAdminUser = userDataWithPerms?.tipoConta === 'imobiliaria' || userDataWithPerms?.permissoes?.admin;
  const isDevUser = userDataWithPerms?.tipoConta === 'imobiliaria' || userDataWithPerms?.permissoes?.developer;
  type NavItem = { href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; isExternal?: boolean; cor?: string };
  const navGroups: { titulo: string | null; itens: NavItem[] }[] = [
    { titulo: null, itens: [
      { href: '/dashboard', icon: HomeIcon, label: 'Início', cor: 'text-[#FF3364]' },
    ] },
    { titulo: 'Vendas', itens: [
      { href: '/dashboard/crm', icon: UsersIcon, label: 'Clientes', cor: 'text-[#FF7A97]' },
      { href: '/dashboard/brello', icon: KanbanIcon, label: 'Brello', cor: 'text-[#7DD3FC]' },
      { href: '/dashboard/ligacao-ativa', icon: PhoneIcon, label: 'Ligação Ativa', cor: 'text-[#E8C547]' },
    ] },
    { titulo: 'Ferramentas', itens: [
      { href: '/dashboard/materiais', icon: FolderIcon, label: 'Materiais de apoio', cor: 'text-[#34D399]' },
      { href: '/dashboard/fluxo-pagamento', icon: ReceiptIcon, label: 'Fluxo de Pagamento', cor: 'text-[#C4A6FF]' },
      { href: '/dashboard/comissoes', icon: BanknoteIcon, label: 'Comissões', cor: 'text-[#FFD569]' },
    ] },
    { titulo: 'Mais', itens: [
      { href: '/dashboard/treinamentos', icon: GraduationCapIcon, label: 'Academia', cor: 'text-[#FB923C]' },
      { href: 'https://chat.openai.com', icon: ChatGPTIcon, label: 'ChatGPT', isExternal: true, cor: 'text-white/75' },
      { href: 'https://noximobiliaria.com.br/', icon: GlobeIcon, label: 'Site', isExternal: true, cor: 'text-[#60A5FA]' },
    ] },
    ...((isAdminUser || isDevUser) ? [{
      titulo: 'Gestão', itens: [
        ...(isAdminUser ? [{ href: '/dashboard/admin', icon: ShieldIcon, label: 'Área administrador', cor: 'text-[#FF5C7E]' }] : []),
        ...(isDevUser ? [{ href: '/dashboard/developer', icon: CodeIcon, label: 'Desenvolvedor', cor: 'text-[#C4A6FF]' }] : []),
      ] as NavItem[],
    }] : []),
  ];

  const displayName = userData?.nome || user?.email?.split('@')[0] || 'usuário';

  return (
    <PipelineStagesProvider imobiliariaId={userData?.imobiliariaId}>
    <div className="flex h-screen min-h-screen bg-particles">
      {/* Sidebar — rail GX: fina com ícones, expande no hover */}
      <div className="group/side fixed left-0 top-0 bottom-0 z-50 w-[60px] hover:w-[196px] transition-[width] duration-200 text-xs">
        <div className="h-full flex flex-col min-h-0 bg-[#0d0d12]/95 backdrop-blur-md border-r border-white/[0.06] overflow-hidden">
          <div className="h-14 flex items-center gap-2.5 px-[16px] shrink-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer group/logo"
              title="Voltar ao Início"
            >
              {/* Marca Nox — círculo neon vazado com N, sem fundo */}
              <span className="relative grid place-items-center w-9 h-9 rounded-full border-2 border-[#FF3364] shadow-[0_0_14px_rgba(255,30,86,0.55),inset_0_0_10px_rgba(255,30,86,0.22)] shrink-0 group-hover/logo:shadow-[0_0_22px_rgba(255,30,86,0.8),inset_0_0_12px_rgba(255,30,86,0.35)] transition-shadow">
                <span className="al-display text-[16px] font-bold text-[#FF3364] leading-none [text-shadow:0_0_10px_rgba(255,30,86,0.85)]">N</span>
              </span>
              <span className="al-display text-[15px] font-bold text-white uppercase tracking-[0.18em] opacity-0 group-hover/side:opacity-100 transition-opacity whitespace-nowrap">Nox Imóveis</span>
            </button>
          </div>
          <div className="mx-4 gx-line opacity-30 shrink-0" />

          <nav className="flex-1 px-2.5 pt-2 pb-3 overflow-y-auto overflow-x-hidden scrollbar-thin min-h-0">
            {navGroups.map((grupo, gi) => (
              <div key={grupo.titulo ?? gi} className={gi > 0 ? 'mt-3' : ''}>
                {grupo.titulo && (
                  <p className="pl-[10px] h-3.5 mb-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/25 opacity-0 group-hover/side:opacity-100 transition-opacity whitespace-nowrap">{grupo.titulo}</p>
                )}
                <ul className="space-y-0.5">
                  {grupo.itens.map((item) => {
                    const ativo = pathname === item.href;
                    const cls = `group relative flex items-center gap-3 pl-[10px] pr-2 py-2 rounded-lg text-[12.5px] font-semibold transition-all ${
                      ativo ? 'bg-white/[0.05] text-white' : 'text-text-secondary hover:bg-white/[0.04] hover:text-white'
                    }`;
                    const icone = <item.icon className={`h-[19px] w-[19px] shrink-0 transition-all ${item.cor || 'text-current'} ${ativo ? '[filter:drop-shadow(0_0_7px_currentColor)] brightness-125' : 'opacity-70 group-hover:opacity-100 group-hover:[filter:drop-shadow(0_0_6px_currentColor)]'}`} />;
                    const indicador = ativo && <span className="absolute left-[-10px] top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-[#FF1E56] shadow-[0_0_12px_#FF1E56]" />;
                    return (
                      <li key={item.href}>
                        {item.isExternal ? (
                          <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls} title={`Abrir ${item.label} em nova aba`}>
                            {indicador}
                            {icone}
                            <span className="truncate flex-1 opacity-0 group-hover/side:opacity-100 transition-opacity whitespace-nowrap">{item.label}</span>
                            <svg className="w-3 h-3 opacity-0 group-hover/side:opacity-40 transition-opacity shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></svg>
                          </a>
                        ) : (
                          <Link href={item.href} className={cls} title={item.label}>
                            {indicador}
                            {icone}
                            <span className="truncate opacity-0 group-hover/side:opacity-100 transition-opacity whitespace-nowrap">{item.label}</span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Rodapé fixo: perfil + sair */}
          <div className="shrink-0 p-2.5 border-t border-white/[0.06] space-y-0.5">
            <div className="flex items-center gap-2.5 pl-[6px] pr-2 py-1.5" title={displayName}>
              <div className="relative w-8 h-8 p-[2px] rounded-full bg-gradient-to-br from-[#FF6B93] via-[#FF1E56] to-[#8B0F31] shadow-[0_0_14px_rgba(255,30,86,0.35)] shrink-0">
                <div className="w-full h-full rounded-full bg-[#16090e] flex items-center justify-center text-[#FF9EB5] font-bold text-[12px] al-display">
                  {(displayName || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#0d0d12]" title="Online" />
              </div>
              <div className="min-w-0 opacity-0 group-hover/side:opacity-100 transition-opacity">
                <p className="text-[11.5px] font-bold text-white truncate leading-tight">{displayName}</p>
                <p className="text-[8.5px] text-emerald-400 font-extrabold uppercase tracking-[0.16em] leading-tight">online</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 pl-[10px] pr-2 w-full py-2 rounded-lg text-[12.5px] font-semibold text-text-secondary hover:bg-[#FF1E56]/10 hover:text-[#FF6B93] transition-all"
              title="Desconectar"
            >
              <LogOutIcon className="h-[19px] w-[19px] shrink-0" />
              <span className="opacity-0 group-hover/side:opacity-100 transition-opacity whitespace-nowrap">Desconectar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-[60px]">
        <main className="flex flex-col flex-1 min-h-0 overflow-x-hidden overflow-y-auto p-2 md:p-3">
          {children}
        </main>
      </div>

      {/* Convites de evento pendentes — card flutuante (o header saiu; saudação vive só na home) */}
      {convitesPendentes.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm animate-fade-in">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#15121a]/95 backdrop-blur-md border border-amber-500/30 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85),0_0_24px_-8px_rgba(245,158,11,0.35)]">
            <CalendarIcon className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-text-secondary leading-tight">
                Você tem <span className="font-bold text-white">{convitesPendentes.length}</span> {convitesPendentes.length === 1 ? 'evento' : 'eventos'} a confirmar
              </p>
              <p className="text-xs font-semibold text-white truncate">{convitesPendentes[0].titulo}</p>
              <p className="text-[10px] text-text-secondary">{convitesPendentes[0].dataStr} · {convitesPendentes[0].horarioStr}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={respondendoPresenca === `${convitesPendentes[0].tipo}-${convitesPendentes[0].id}`}
                onClick={() => responderPresenca(convitesPendentes[0].tipo, convitesPendentes[0].id, 'confirmado')}
                className="px-2 py-1 text-[10px] font-semibold text-white bg-emerald-500/90 hover:bg-emerald-500 rounded transition-colors disabled:opacity-50"
              >
                {respondendoPresenca === `${convitesPendentes[0].tipo}-${convitesPendentes[0].id}` ? '...' : 'Confirmar'}
              </button>
              <button
                type="button"
                disabled={respondendoPresenca === `${convitesPendentes[0].tipo}-${convitesPendentes[0].id}`}
                onClick={() => responderPresenca(convitesPendentes[0].tipo, convitesPendentes[0].id, 'cancelado')}
                className="px-2 py-1 text-[10px] font-semibold text-red-200 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors disabled:opacity-50"
              >
                Recusar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </PipelineStagesProvider>
  );
} 