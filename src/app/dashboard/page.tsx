'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, query, where, onSnapshot, doc as firestoreDoc, getDoc, Timestamp, orderBy, limit, deleteDoc, setDoc, doc, serverTimestamp, updateDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { getDemoLeads } from '@/lib/espelho/demoData';
import { DEMO_AGENDA_IMOBILIARIA, DEMO_AVISOS, DEMO_COMUNIDADE_POSTS } from '@/lib/espelho/demoData';
import AvisosImportantesModal from './_components/AvisosImportantesModal';
import AgendaImobiliariaModal from './_components/AgendaImobiliariaModal';
import PlantoesModal from './_components/PlantoesModal';
import { GamificacaoMetasRow, type MetaPessoalData } from './_components/GamificacaoMetasRow';

/** Ícones de traço neon (estilo HUD) — coerentes com o visual GX, sem emoji */
const IC_PATHS: Record<string, JSX.Element> = {
  alert: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  gem: <><path d="M6 3h12l4 6-10 13L2 9z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  folder: <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />,
  receipt: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" /><path d="M14 8H8" /><path d="M16 12H8" /><path d="M13 16H8" /></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>,
  flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  history: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></>,
  trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></>,
  radar: <><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" /><path d="M4 6h.01" /><path d="M2.29 9.62a10 10 0 1 0 19.02-1.27" /><path d="M16.24 7.76a6 6 0 1 0-8.01 8.91" /><path d="M12 18h.01" /><path d="M17.99 11.66a6 6 0 0 1-2.22 5.01" /><circle cx="12" cy="12" r="2" /><path d="m13.41 10.59 5.66-5.66" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="m9 16 2 2 4-4" /></>,
  chart: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  hourglass: <><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" /></>,
  chev: <polyline points="9 18 15 12 9 6" />,
};
const Ic = ({ k, s = 20, className = '' }: { k: string; s?: number; className?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {IC_PATHS[k]}
  </svg>
);

/** Número que conta de 0 até o valor (HUD vivo) */
const CountUp = ({ n, className = '' }: { n: number; className?: string }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const dur = 850;
    const step = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setV(Math.round(n * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <span className={className}>{v}</span>;
};

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

const BarChartIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="20" y2="10"/>
        <line x1="18" x2="18" y1="20" y2="4"/>
        <line x1="6" x2="6" y1="20" y2="16"/>
    </svg>
);

const NotesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
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

const Card = ({ children, className = '', glow }: { children: React.ReactNode, className?: string; glow?: boolean }) => (
  <div className={`rounded-2xl p-6 hover-lift ${glow ? 'card-glow' : 'bg-background-card border border-[var(--border-subtle)]'} ${className}`}>{children}</div>
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
    <div className="text-xl font-bold text-text-primary mb-1">{value}</div>
    <div className="text-xs text-text-secondary">{title}</div>
  </Card>
);

// Substituir EconomicIndicator por um componente mais simples, sem variação
const SimpleIndicator = ({ title, value }: { title: string; value: string }) => (
  <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-r from-[#D4A017]/5 to-[#E8C547]/5 rounded-lg border border-[#E8C547]/20 min-w-[120px] animate-slide-in">
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

const SectionTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white relative z-10">{children}</h2>
    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-r-full opacity-60"></div>
  </div>
);

// Funções para o card de notas
const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'Urgente': return '🚨';
    case 'Importante': return '⚠️';
    case 'Circunstancial': return 'ℹ️';
    default: return '📝';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Urgente': return 'bg-red-500 text-white';
    case 'Importante': return 'bg-orange-500 text-white';
    case 'Circunstancial': return 'bg-amber-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};



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

const TAREFA_STATUS_ORDER = ['Tarefa em Atraso', 'Tarefa do Dia', 'Sem tarefa', 'Tarefa Futura'];

const statusInfo = {
  'Tarefa em Atraso': { color: 'bg-red-500', text: 'Em Atraso' },
  'Tarefa do Dia': { color: 'bg-yellow-500', text: 'Para Hoje' },
  'Sem tarefa': { color: 'bg-gray-500', text: 'Sem Tarefa' },
  'Tarefa Futura': { color: 'bg-amber-500', text: 'Futura' }
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

// Formata data salva como YYYY-MM-DD para exibição em pt-BR (evita mudar de dia por UTC)
const formatMetaDate = (value: string | undefined) => {
  if (!value) return '--';
  const s = typeof value === 'string' ? value.split('T')[0] : '';
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return '--';
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
};

function diasRestantesMeta(fimStr: string | undefined): number | null {
  if (!fimStr) return null;
  const s = String(fimStr).split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  const fim = new Date(y, m - 1, d);
  fim.setHours(23, 59, 59, 999);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

// Card do topo: Meta Individual (compacto para caber na coluna direita)
const MetaIndividualCard = ({ metaPessoal, meta }: { metaPessoal: { valorAlmejado: number; alcancadoPessoal: number } | null; meta: any }) => {
  const valorAlmejado = metaPessoal?.valorAlmejado ?? 0;
  const alcancado = metaPessoal?.alcancadoPessoal ?? 0;
  const progresso = valorAlmejado > 0 ? Math.min(100, Math.round((alcancado / valorAlmejado) * 100)) : 0;
  const progressoDisplay = progresso > 100 ? 100 : progresso;
  const dias = diasRestantesMeta(meta?.fim);
  const getProgressColors = () => {
    if (progresso >= 100) return { barra: 'from-[#3AC17C] to-[#2E8B57]', percentual: 'text-[#3AC17C]', percentualBg: 'bg-[#3AC17C]/10' };
    if (progresso >= 75) return { barra: 'from-[#4CAF50] to-[#45A049]', percentual: 'text-[#4CAF50]', percentualBg: 'bg-[#4CAF50]/10' };
    if (progresso >= 50) return { barra: 'from-[#FF9800] to-[#F57C00]', percentual: 'text-[#FF9800]', percentualBg: 'bg-[#FF9800]/10' };
    return { barra: 'from-[#E8C547] to-[#D4A017]', percentual: 'text-[#D4A017]', percentualBg: 'bg-[#D4A017]/10' };
  };
  const colors = getProgressColors();
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl shadow-lg bg-[#23283A]/5 border border-[#D4A017]/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-0.5 h-full bg-[#D4A017]" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <svg className="h-4 w-4 text-[#D4A017] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <span className="font-bold text-white text-sm truncate">Minha Meta</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${colors.percentual} ${colors.percentualBg} border border-current/20`}>
            {progresso}%
          </span>
          {dias !== null && (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums ${
              dias > 0
                ? 'bg-gradient-to-r from-red-500/50 to-red-600/50 text-red-100 border border-red-400/70 animate-pulse-red'
                : dias === 0
                  ? 'bg-gradient-to-r from-orange-500/50 to-red-500/50 text-orange-100 border border-orange-400/70 animate-pulse'
                  : 'bg-white/10 text-white/80'
            }`}>
              {dias > 0 ? `${dias} dias` : dias === 0 ? 'Último dia!' : 'Encerrado'}
            </span>
          )}
        </div>
      </div>
      <div className="text-[9px] text-[#E8C547]">
        <span>{formatMetaDate(meta?.inicio)} → {formatMetaDate(meta?.fim)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] text-[#E8C547]">Almejado</span>
        <span className="text-xs font-bold text-[#D4A017] truncate">
          {valorAlmejado > 0 ? valorAlmejado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0'}
        </span>
        <span className="text-[9px] text-[#E8C547]">Realizado</span>
        <span className={`text-xs font-bold ${progresso >= 100 ? 'text-[#3AC17C]' : 'text-[#D4A017]'}`}>
          {alcancado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>
      <div className="w-full h-1.5 bg-[#23283A] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${colors.barra}`} style={{ width: `${progressoDisplay}%` }} />
      </div>
    </div>
  );
};

// Card de Meta da Imobiliária (usado no painel ao lado de Minhas Moedas)
const MetasCard = ({ meta, nomeImobiliaria }: { meta: any, nomeImobiliaria: string }) => {
  // Usar o percentual salvo no Firestore, ou calcular automaticamente se não existir
  const progresso = meta?.percentual !== undefined ? meta.percentual : (meta && meta.valor > 0 ? Math.round(((meta.alcancado ?? 0) / meta.valor) * 100) : 0);
  const progressoDisplay = progresso > 100 ? 100 : progresso;
  
  // Determinar cores baseado no progresso
  const getProgressColors = () => {
    if (progresso >= 100) {
      return {
        barra: 'from-[#3AC17C] to-[#2E8B57]',
        percentual: 'text-[#3AC17C]',
        percentualBg: 'bg-[#3AC17C]/10'
      };
    } else if (progresso >= 75) {
      return {
        barra: 'from-[#4CAF50] to-[#45A049]',
        percentual: 'text-[#4CAF50]',
        percentualBg: 'bg-[#4CAF50]/10'
      };
    } else if (progresso >= 50) {
      return {
        barra: 'from-[#FF9800] to-[#F57C00]',
        percentual: 'text-[#FF9800]',
        percentualBg: 'bg-[#FF9800]/10'
      };
    } else {
      return {
        barra: 'from-[#E8C547] to-[#D4A017]',
        percentual: 'text-[#D4A017]',
        percentualBg: 'bg-[#D4A017]/10'
      };
    }
  };

  const colors = getProgressColors();

  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl shadow-xl bg-gradient-to-br from-[#E8C547]/30 to-[#D4A017]/10 border-2 border-[#D4A017]/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-[#D4A017]" />
      {/* Título: Metas - Nome | percentual à direita */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="h-5 w-5 text-[#D4A017] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span className="font-bold text-white text-base tracking-tight truncate">
            Metas{nomeImobiliaria ? ` — ${nomeImobiliaria}` : ''}
          </span>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-sm font-bold ${colors.percentual} ${colors.percentualBg} border border-current/20`}>
          {progresso}%
        </span>
      </div>
      {/* Datas */}
      <div className="flex items-center gap-2 text-[10px] text-[#E8C547]">
        <span className="font-semibold">Início:</span>
        <span className="text-white">{formatMetaDate(meta?.inicio)}</span>
        <span>|</span>
        <span className="font-semibold">Fim:</span>
        <span className="text-white">{formatMetaDate(meta?.fim)}</span>
      </div>
      {/* Valores + barra */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-[#E8C547]">VGV da Meta</span>
          <span className="text-sm font-bold text-[#D4A017] truncate">{meta?.valor ? meta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}</span>
        </div>
        <div className="flex flex-col items-end min-w-0">
          <span className="text-[10px] text-[#E8C547]">Realizado</span>
          <span className={`text-sm font-bold ${progresso >= 100 ? 'text-[#3AC17C]' : 'text-[#D4A017]'}`}>{typeof meta?.alcancado === 'number' ? meta.alcancado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}</span>
        </div>
      </div>
      <div className="w-full h-2 bg-[#23283A] rounded-full overflow-hidden relative">
        <div className={`h-2 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${colors.barra} shadow-lg`} style={{ width: `${progressoDisplay}%` }} />
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
  const { stages, normalizeEtapa } = usePipelineStages();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [agendaLeads, setAgendaLeads] = useState<any[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [funilPessoal, setFunilPessoal] = useState<Record<string, number>>({});
  const [tarefaAtrasadaCount, setTarefaAtrasadaCount] = useState(0);
  const [tarefaDiaCount, setTarefaDiaCount] = useState(0);
  const [semTarefaCount, setSemTarefaCount] = useState(0);
  const [avisosImportantes, setAvisosImportantes] = useState<any[]>([]);
  const [agendaImobiliaria, setAgendaImobiliaria] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [nomeImobiliaria, setNomeImobiliaria] = useState('Imobiliária');
  const [metaPessoalValorAlmejado, setMetaPessoalValorAlmejado] = useState<number>(0);
  const [contribuicoesMeta, setContribuicoesMeta] = useState<{ corretorId: string; valor: number; dataVenda?: string }[]>([]);
  const [corretoresRanking, setCorretoresRanking] = useState<{ id: string; nome: string }[]>([]);

  const metaPessoal: MetaPessoalData | null = useMemo(() => {
    const inicio = meta?.inicio ? String(meta.inicio).split('T')[0] : undefined;
    const fim = meta?.fim ? String(meta.fim).split('T')[0] : undefined;
    const alcancado = currentUser?.uid && inicio && fim
      ? contribuicoesMeta
          .filter((c) => c.corretorId === currentUser.uid && c.dataVenda && c.dataVenda >= inicio && c.dataVenda <= fim)
          .reduce((s, c) => s + c.valor, 0)
      : 0;
    if (metaPessoalValorAlmejado <= 0 && alcancado <= 0) return null;
    return {
      valorAlmejado: metaPessoalValorAlmejado,
      alcancadoPessoal: alcancado,
      metaInicio: inicio,
      metaFim: fim,
    };
  }, [meta?.inicio, meta?.fim, metaPessoalValorAlmejado, contribuicoesMeta, currentUser?.uid]);

  // Estados para interatividade do Top Trending
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiking, setIsLiking] = useState<string | null>(null);
  const [isReposting, setIsReposting] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isCommenting, setIsCommenting] = useState<string | null>(null);
  const [showEmojiRepost, setShowEmojiRepost] = useState(false);
  const [repostWithComment, setRepostWithComment] = useState(false);
  const [repostComment, setRepostComment] = useState('');
  const [repostInputId, setRepostInputId] = useState<string | null>(null);
  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [repostTarget, setRepostTarget] = useState<any>(null);
  const [novoPostComunidade, setNovoPostComunidade] = useState('');
  const [postandoComunidade, setPostandoComunidade] = useState(false);
  const [fileComunidade, setFileComunidade] = useState<File | null>(null);
  const [filePreviewComunidade, setFilePreviewComunidade] = useState<string | null>(null);
  const [youtubeLinkComunidade, setYoutubeLinkComunidade] = useState('');
  const [youtubePreviewComunidade, setYoutubePreviewComunidade] = useState<{ videoId: string; embedUrl: string; thumbnail: string; url: string; isShort: boolean } | null>(null);
  const [showEmojiComunidade, setShowEmojiComunidade] = useState(false);
  const [showEmojiComment, setShowEmojiComment] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [selectedPostForLikes, setSelectedPostForLikes] = useState<any>(null);
  const [postLikes, setPostLikes] = useState<any[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  
  // Estado para o modal de avisos importantes
  const [showAvisosModal, setShowAvisosModal] = useState(false);
  
  // Estado para o modal de agenda imobiliária
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showPlantoesModal, setShowPlantoesModal] = useState(false);

  // Função para voltar ao topo da seção de trending
  const scrollToTrendingTop = () => {
    const trendingSection = document.getElementById('trending-section');
    if (trendingSection) {
      trendingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Detectar scroll para mostrar/esconder botão
  useEffect(() => {
    const handleScroll = () => {
      // Simplificar: mostrar botão após 200px de scroll
      setShowScrollToTop(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Atualizar hora a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Indicadores econômicos (CUB, SELIC, etc.) são exibidos no header pelo layout

  // Buscar agenda do dia
  useEffect(() => {
    if (isEspelhoDemo) {
      const demoLeads = getDemoLeads();
      const porEtapa: Record<string, number> = {};
      stages.forEach(e => { porEtapa[e] = 0; });
      demoLeads.forEach(lead => {
        const etapa = normalizeEtapa(lead.etapa);
        porEtapa[etapa] = (porEtapa[etapa] || 0) + 1;
      });
      setFunilPessoal(porEtapa);
      setTarefaAtrasadaCount(demoLeads.filter(l => l.taskStatus === 'Tarefa em Atraso').length);
      setTarefaDiaCount(demoLeads.filter(l => l.taskStatus === 'Tarefa do Dia').length);
      setSemTarefaCount(demoLeads.filter(l => l.taskStatus === 'Sem tarefa').length);
      const leadsToShow = demoLeads.filter(lead => lead.taskStatus !== 'Tarefa Futura');
      leadsToShow.sort((a, b) => TAREFA_STATUS_ORDER.indexOf(a.taskStatus) - TAREFA_STATUS_ORDER.indexOf(b.taskStatus));
      setAgendaLeads(leadsToShow);
      setAgendaLoading(false);
      return;
    }
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
        // Funil pessoal: contagem por etapa
        const porEtapa: Record<string, number> = {};
        stages.forEach(e => { porEtapa[e] = 0; });
        allLeads.forEach((lead: any) => {
          const etapa = normalizeEtapa(lead.etapa);
          porEtapa[etapa] = (porEtapa[etapa] || 0) + 1;
        });
        setFunilPessoal(porEtapa);
        // Contagens: Tarefa em Atraso, Tarefa do Dia, Sem tarefa
        setTarefaAtrasadaCount(settledLeads.filter(l => l.taskStatus === 'Tarefa em Atraso').length);
        setTarefaDiaCount(settledLeads.filter(l => l.taskStatus === 'Tarefa do Dia').length);
        setSemTarefaCount(settledLeads.filter(l => l.taskStatus === 'Sem tarefa').length);
        // Lista para compatibilidade (ex.: link Ver Completa)
        const leadsToShow = settledLeads.filter(lead => lead.taskStatus !== 'Tarefa Futura');
        leadsToShow.sort((a, b) => TAREFA_STATUS_ORDER.indexOf(a.taskStatus) - TAREFA_STATUS_ORDER.indexOf(b.taskStatus));
        setAgendaLeads(leadsToShow);
      } catch (error) {
        console.error('Erro ao buscar agenda:', error);
        setAgendaLeads([]);
        setFunilPessoal({});
        setTarefaAtrasadaCount(0);
        setTarefaDiaCount(0);
        setSemTarefaCount(0);
      } finally {
        setAgendaLoading(false);
      }
    };
    fetchAgenda();
  }, [currentUser, stages, normalizeEtapa, isEspelhoDemo]);

  // Buscar avisos importantes
  useEffect(() => {
    if (isEspelhoDemo) {
      setAvisosImportantes(DEMO_AVISOS);
      return;
    }
    const fetchAvisos = async () => {
      if (!userData?.imobiliariaId) return;
      const q = query(collection(db, 'avisosImportantes'), where('imobiliariaId', '==', userData.imobiliariaId));
      const snapshot = await getDocs(q);
      setAvisosImportantes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchAvisos();
  }, [userData, isEspelhoDemo]);

  // Buscar agenda imobiliária
  useEffect(() => {
    if (isEspelhoDemo) {
      setAgendaImobiliaria(DEMO_AGENDA_IMOBILIARIA);
      return;
    }
    const fetchAgendaImobiliaria = async () => {
      if (!userData?.imobiliariaId) return;
      try {
        const q = query(collection(db, 'agendaImobiliaria'), where('imobiliariaId', '==', userData.imobiliariaId));
        const snapshot = await getDocs(q);
        setAgendaImobiliaria(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Erro ao buscar agenda imobiliária:', error);
        setAgendaImobiliaria([]);
      }
    };
    fetchAgendaImobiliaria();
  }, [userData, isEspelhoDemo]);

  // Labels e ícones do tipo da agenda (igual Dashboard TV - Agenda do Dia)
  const getTipoAgendaLabel = (tipo: string) => {
    const map: Record<string, string> = {
      reuniao: 'Reunião',
      evento: 'Evento',
      treinamento: 'Treinamento',
      'revisar-crm': 'Revisar CRM',
      'ligacao-ativa': 'Ligação Ativa',
      'acao-de-rua': 'Ação de rua',
      'disparo-de-msg': 'Disparo de Msg',
      plantao: 'Plantão',
      outro: 'Outro',
      meet: 'Google Meet',
      youtube: 'YouTube Live',
      instagram: 'Instagram Live',
      discord: 'Discord',
    };
    return map[tipo] || tipo;
  };
  const TIPO_ICON: Record<string, string> = {
    reuniao: '👥',
    evento: '🎉',
    treinamento: '📚',
    'revisar-crm': '📋',
    'ligacao-ativa': '📞',
    'acao-de-rua': '📍',
    'disparo-de-msg': '💬',
    plantao: '🏢',
    outro: '📅',
    meet: '🎥',
    youtube: '📺',
    instagram: '📱',
    discord: '💬',
  };

  // Plantões agora são eventos da agenda (tipo 'plantao') — derivados para o modal de plantões
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const plantoes = useMemo(
    () =>
      (agendaImobiliaria as any[])
        .filter((a) => a.tipo === 'plantao')
        .map((a) => ({
          id: a.id,
          dataInicio: a.diaInicio || (a.dataInicio?.toDate ? ymd(a.dataInicio.toDate()) : ''),
          dataFim: a.diaFim || (a.dataFim?.toDate ? ymd(a.dataFim.toDate()) : ''),
          horario: a.horaInicio || (a.dataInicio?.toDate ? a.dataInicio.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''),
          construtora: a.construtora || '',
          corretorResponsavel: a.responsavel || '',
          observacoes: a.descricao || '',
          criadoEm: a.data ?? null,
          presentesIds: a.presentesIds,
          respostasPresenca: a.respostasPresenca,
        })),
    [agendaImobiliaria]
  );

  // Radar: corretor vê os eventos em que está marcado (presentesIds); a conta imobiliária/admin vê todos (é quem publica)
  const proximosEventosConfirmados = useMemo(() => {
    const uid = currentUser?.uid;
    const now = currentTime.getTime();
    if (!uid) return [];
    const ehAdminImob = (userData as any)?.tipoConta === 'imobiliaria' || (userData as any)?.permissoes?.admin;
    type Item = { tipo: 'plantao' | 'agenda'; id: string; titulo: string; tipoLabel: string; tipoChave?: string; dataStr: string; horarioStr: string; horarioFimStr: string; startTime: number; fimTime: number };
    const lista: Item[] = [];
    agendaImobiliaria.forEach((a: any) => {
      const marcado = Array.isArray(a.presentesIds) && a.presentesIds.includes(uid);
      if (!marcado && !ehAdminImob) return;

      // Intervalo de dias (modelo novo diaInicio/diaFim; fallback p/ Timestamps antigos)
      const diaIni = a.diaInicio || (a.dataInicio?.toDate ? ymd(a.dataInicio.toDate()) : (a.dataInicio ? ymd(new Date(a.dataInicio)) : ''));
      if (!diaIni) return;
      const diaFim = a.diaFim || (a.dataFim?.toDate ? ymd(a.dataFim.toDate()) : diaIni);
      const horaIni = a.horaInicio || (a.dataInicio?.toDate ? a.dataInicio.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '00:00');
      const horaFim = a.horaFim || (a.dataFim?.toDate ? a.dataFim.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
      const [hi = 0, mi = 0] = horaIni.split(':').map(Number);

      const ehPlantao = a.tipo === 'plantao';
      const titulo = ehPlantao ? (a.construtora ? `Plantão — ${a.construtora}` : (a.titulo || 'Plantão')) : (a.titulo || 'Evento');
      const tipoLabel = getTipoAgendaLabel(a.tipo || 'outro');

      const dIni = new Date(`${diaIni}T00:00:00`);
      const dFim = new Date(`${diaFim}T00:00:00`);
      // Evento ocorre todos os dias do intervalo, na mesma faixa de horário
      for (let d = new Date(dIni); d <= dFim; d.setDate(d.getDate() + 1)) {
        const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hi, mi, 0, 0);
        const startTime = dt.getTime();
        let fimTime: number;
        if (horaFim) {
          const [hf = hi, mf = mi] = horaFim.split(':').map(Number);
          fimTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hf, mf, 0, 0).getTime();
        } else {
          fimTime = startTime + 60 * 60 * 1000;
        }
        if (fimTime < now) continue;
        const dataStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horarioStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const horarioFimStr = new Date(fimTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        lista.push({
          tipo: ehPlantao ? 'plantao' : 'agenda',
          id: a.id,
          titulo,
          tipoLabel,
          tipoChave: a.tipo || 'outro',
          dataStr,
          horarioStr,
          horarioFimStr,
          startTime,
          fimTime,
        });
      }
    });
    lista.sort((a, b) => a.startTime - b.startTime);
    return lista.slice(0, 6);
  }, [currentUser?.uid, userData, agendaImobiliaria, currentTime]);

  const [respondendoPresenca, setRespondendoPresenca] = useState<string | null>(null);
  const responderPresenca = async (tipo: 'plantao' | 'agenda', id: string, status: 'confirmado' | 'cancelado') => {
    const uid = currentUser?.uid;
    if (!uid) return;
    const key = `${tipo}-${id}`;
    setRespondendoPresenca(key);
    if (isEspelhoDemo) {
      if (tipo === 'agenda') {
        setAgendaImobiliaria(prev => prev.map((a: any) => a.id === id ? { ...a, respostasPresenca: { ...(a.respostasPresenca || {}), [uid]: status } } : a));
      }
      setRespondendoPresenca(null);
      return;
    }
    try {
      // Plantões agora também vivem em 'agendaImobiliaria' (coleção unificada)
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

  useEffect(() => {
    if (isEspelhoDemo) {
      setTrendingPosts(DEMO_COMUNIDADE_POSTS.map(p => ({
        ...p,
        commentsCount: p.comentarios ?? 0,
        repostsCount: 0,
        totalEngagement: (p.likes ?? 0) + (p.comentarios ?? 0),
        userLiked: false,
      })));
      setTrendingLoading(false);
      return;
    }
    const fetchTrendingPosts = async () => {
      if (!userData?.imobiliariaId) return;
      setTrendingLoading(true);
      try {
        const postsRef = collection(db, 'comunidadePosts');
        const q = query(postsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        console.log('Posts encontrados:', snapshot.docs.length);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Buscar contadores de comentários e reposts para cada post
        const postsWithCounts = await Promise.all(
          posts.map(async (post: any) => {
            const commentsSnapshot = await getDocs(collection(db, 'comunidadePosts', post.id, 'comments'));
            const repostsSnapshot = await getDocs(collection(db, 'comunidadePosts', post.id, 'reposts'));
            const likesSnapshot = await getDocs(collection(db, 'comunidadePosts', post.id, 'likes'));
            
            // Verificar se o usuário atual já curtiu o post
            const userLikeDoc = await getDoc(doc(db, 'comunidadePosts', post.id, 'likes', currentUser?.uid || ''));
            
            // Buscar nome do autor original se for repost
            let repostAuthorName = '';
            let originalTexto = '';
            let originalCreatedAt = '';
            let originalFile = '';
            let originalFileMeta = null;
            let originalYoutubeData = null;
            if (post.repostOf) {
              try {
                const originalDoc = await getDoc(doc(db, 'comunidadePosts', post.repostOf));
                if (originalDoc.exists()) {
                  const data = originalDoc.data();
                  repostAuthorName = data.nome || 'Original';
                  originalTexto = data.texto || '';
                  originalCreatedAt = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                  originalFile = data.file || '';
                  originalFileMeta = data.fileMeta || null;
                  originalYoutubeData = data.youtubeData || null;
                }
              } catch {}
            }
            return {
              ...post,
              likes: likesSnapshot.size, // Usar o contador real do Firestore
              commentsCount: commentsSnapshot.size,
              repostsCount: repostsSnapshot.size,
              totalEngagement: likesSnapshot.size + commentsSnapshot.size + repostsSnapshot.size + (post.views || 0),
              userLiked: userLikeDoc.exists(),
              repostAuthorName,
              originalTexto,
              originalCreatedAt,
              originalFile,
              originalFileMeta,
              originalYoutubeData,
            };
          })
        );
        
        // Ordenar por ordem cronológica de post (mais recentes primeiro)
        const sortedPosts = postsWithCounts.sort((a, b) => {
          const aCreatedAt = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bCreatedAt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          
          // Ordenar por data de criação (mais recentes primeiro)
          return bCreatedAt.getTime() - aCreatedAt.getTime();
        });
        setTrendingPosts(sortedPosts);
      } catch (error) {
        console.error('Erro ao buscar posts trending:', error);
        setTrendingPosts([]);
      } finally {
        setTrendingLoading(false);
      }
    };
    fetchTrendingPosts();
  }, [userData, currentUser, isEspelhoDemo]);

  // Verificar likes do usuário em tempo real para sincronizar com comunidade
  useEffect(() => {
    if (!currentUser || !trendingPosts.length) return;
    
    const unsubscribes: any[] = [];
    
    trendingPosts.forEach((post) => {
      // Listener para likes
      const unsubLike = onSnapshot(
        doc(db, "comunidadePosts", post.id, "likes", currentUser.uid),
        (snapshot) => {
          setTrendingPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, userLiked: snapshot.exists() }
              : p
          ));
        },
        (error) => {
          console.error('Erro no listener de userLiked:', error);
        }
      );
      
      // Listener para contadores de likes
      const unsubLikesCount = onSnapshot(
        collection(db, "comunidadePosts", post.id, "likes"),
        (snapshot) => {
          setTrendingPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, likes: snapshot.size }
              : p
          ));
        },
        (error) => {
          console.error('Erro no listener de likes count:', error);
        }
      );
      
      // Listener para contadores de comentários
      const unsubCommentsCount = onSnapshot(
        collection(db, "comunidadePosts", post.id, "comments"),
        (snapshot) => {
          setTrendingPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, commentsCount: snapshot.size }
              : p
          ));
        },
        (error) => {
          console.error('Erro no listener de comments count:', error);
        }
      );
      
      // Listener para contadores de reposts
      const unsubRepostsCount = onSnapshot(
        collection(db, "comunidadePosts", post.id, "reposts"),
        (snapshot) => {
          setTrendingPosts(prev => prev.map(p => 
            p.id === post.id 
              ? { ...p, repostsCount: snapshot.size }
              : p
          ));
        },
        (error) => {
          console.error('Erro no listener de reposts count:', error);
        }
      );
      
      unsubscribes.push(unsubLike, unsubLikesCount, unsubCommentsCount, unsubRepostsCount);
    });
    
    return () => { 
      unsubscribes.forEach((unsub) => {
        try {
          unsub();
        } catch (error) {
          console.error('Erro ao desinscrever listener:', error);
        }
      }); 
    };
  }, [trendingPosts, currentUser]);

  // Funções para interatividade
  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    
    setIsLiking(postId);
    try {
      const likeRef = doc(db, 'comunidadePosts', postId, 'likes', currentUser.uid);
      const likeDoc = await getDoc(likeRef);
      
                  if (likeDoc.exists()) {
              // Remover like - deixar os listeners em tempo real atualizarem o contador
              await deleteDoc(likeRef);
              // Atualizar apenas o status do usuário imediatamente
              setTrendingPosts(prev => prev.map(post => 
                post.id === postId 
                  ? { ...post, userLiked: false }
                  : post
              ));
              // Atualizar post selecionado no modal
              setSelectedPost((prev: any) => prev && prev.id === postId ? {
                ...prev,
                userLiked: false
              } : prev);
            } else {
              // Adicionar like - deixar os listeners em tempo real atualizarem o contador
              await setDoc(likeRef, { 
                userId: currentUser.uid, 
                timestamp: serverTimestamp(),
                userName: userData?.nome || currentUser.email?.split("@")[0] || "Usuário"
              });
              // Atualizar apenas o status do usuário imediatamente
              setTrendingPosts(prev => prev.map(post => 
                post.id === postId 
                  ? { ...post, userLiked: true }
                  : post
              ));
              // Atualizar post selecionado no modal
              setSelectedPost((prev: any) => prev && prev.id === postId ? {
                ...prev,
                userLiked: true
              } : prev);
            }
    } catch (error) {
      console.error('Erro ao curtir post:', error);
      // Em caso de erro, reverter o estado
      setTrendingPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, userLiked: !post.userLiked }
          : post
      ));
    } finally {
      setIsLiking(null);
    }
  };

  const handleShowLikes = async (post: any) => {
    setSelectedPostForLikes(post);
    setShowLikesModal(true);
    setLoadingLikes(true);
    
    try {
      const likesRef = collection(db, 'comunidadePosts', post.id, 'likes');
      const likesSnapshot = await getDocs(likesRef);
      const likesData = likesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPostLikes(likesData);
    } catch (error) {
      console.error('Erro ao buscar likes:', error);
      setPostLikes([]);
    } finally {
      setLoadingLikes(false);
    }
  };

  const handleRepost = async (postId: string, comment?: string) => {
    if (!currentUser) return;
    setIsReposting(postId);
    try {
      // Buscar dados do post original
      const originalDoc = await getDoc(doc(db, 'comunidadePosts', postId));
      if (!originalDoc.exists()) return;
      const original = originalDoc.data();
      // Criar novo post na coleção comunidadePosts
      await setDoc(doc(collection(db, 'comunidadePosts')), {
        texto: original.texto,
        userId: currentUser.uid,
        nome: currentUser.email?.split('@')[0] || 'Usuário',
        email: currentUser.email || '',
        avatar: original.avatar,
        createdAt: new Date(),
        likes: 0,
        likedBy: [],
        comments: [],
        file: original.file,
        fileMeta: original.fileMeta,
        youtubeLink: original.youtubeLink || null,
        youtubeData: original.youtubeData || null,
        repostOf: postId,
        repostComment: comment || '',
      });
      // Marcar repost na subcoleção para controle
      await setDoc(doc(db, 'comunidadePosts', postId, 'reposts', currentUser.uid), {
        userId: currentUser.uid,
        timestamp: new Date(),
        comment: comment || '',
      });
      setTrendingPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, repostsCount: (post.repostsCount || 0) + 1 }
          : post
      ));
      setSelectedPost((prev: any) => prev && prev.id === postId ? {
        ...prev,
        repostsCount: (prev.repostsCount || 0) + 1
      } : prev);
    } catch (error) {
      console.error('Erro ao repostar:', error);
    } finally {
      setIsReposting(null);
    }
  };

  const confirmRepost = async (withComment: boolean) => {
    if (!repostTarget) return;
    await handleRepost(repostTarget.id, withComment ? repostComment : undefined);
    setRepostModalOpen(false);
    setRepostTarget(null);
    setRepostComment('');
    setRepostWithComment(false);
  };

  const handleComment = async (postId: string) => {
    if (!currentUser || !commentText.trim()) return;
    
    try {
      const commentRef = doc(collection(db, 'comunidadePosts', postId, 'comments'));
      const newComment = {
        userId: currentUser.uid,
        nome: currentUser.email?.split('@')[0] || 'Usuário',
        texto: commentText.trim(),
        createdAt: new Date()
      };
      
      await setDoc(commentRef, newComment);
      
      // Atualizar a lista de comentários localmente
      setPostComments(prev => [{
        id: commentRef.id,
        ...newComment
      }, ...prev]);
      
      // Atualizar contador de comentários no post
      setTrendingPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
          : post
      ));
      
      // Atualizar contador no post selecionado
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev: any) => prev ? {
          ...prev,
          commentsCount: (prev.commentsCount || 0) + 1
        } : null);
      }
      
      setCommentText('');
    } catch (error) {
      console.error('Erro ao comentar:', error);
    }
  };

  const getComunidadeAvatar = () => {
    if (userData?.photoURL) return userData.photoURL;
    const nome = userData?.nome || currentUser?.email?.split('@')[0] || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=random`;
  };
  const getComunidadeNome = () => userData?.nome || currentUser?.email?.split('@')[0] || 'Usuário';

  const handleFileComunidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) return;
    setFileComunidade(f);
    const reader = new FileReader();
    reader.onload = () => setFilePreviewComunidade(reader.result as string);
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1];
  };
  const isYouTubeShort = (url: string) => url.includes('/shorts/') || url.includes('youtube.com/shorts/');
  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return undefined;
    return isYouTubeShort(url)
      ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&autoplay=0`
      : `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`;
  };
  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined;
  };
  const handleYoutubeLinkChangeComunidade = (link: string) => {
    setYoutubeLinkComunidade(link);
    if (link.trim()) {
      const videoId = getYouTubeVideoId(link);
      if (videoId) {
        setYoutubePreviewComunidade({
          videoId,
          embedUrl: getYouTubeEmbedUrl(link)!,
          thumbnail: getYouTubeThumbnail(link)!,
          url: link,
          isShort: isYouTubeShort(link),
        });
      } else {
        setYoutubePreviewComunidade(null);
      }
    } else {
      setYoutubePreviewComunidade(null);
    }
  };
  const handleEmojiSelectComunidade = (emoji: { native: string }) => {
    setNovoPostComunidade(prev => prev + emoji.native);
  };

  const handlePostarComunidade = async () => {
    if (!currentUser || (!novoPostComunidade.trim() && !fileComunidade && !youtubePreviewComunidade)) return;
    setPostandoComunidade(true);
    try {
      let fileUrl: string | null = null;
      let fileMeta: { name: string; type: string } | null = null;
      if (fileComunidade) {
        const fileName = `${Date.now()}_${fileComunidade.name}`;
        const folder = fileComunidade.type.startsWith('image/') ? 'images' : 'videos';
        const storageRef = ref(storage, `comunidade/${currentUser.uid}/${folder}/${fileName}`);
        await uploadBytes(storageRef, fileComunidade);
        fileUrl = await getDownloadURL(storageRef);
        fileMeta = { name: fileComunidade.name, type: fileComunidade.type };
      }
      const postData = {
        texto: novoPostComunidade.trim() || '',
        userId: currentUser.uid,
        nome: getComunidadeNome(),
        email: currentUser.email || '',
        avatar: getComunidadeAvatar(),
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        comments: [],
        file: fileUrl,
        fileMeta,
        youtubeLink: youtubePreviewComunidade ? youtubePreviewComunidade.url : null,
        youtubeData: youtubePreviewComunidade ? { videoId: youtubePreviewComunidade.videoId, embedUrl: youtubePreviewComunidade.embedUrl, thumbnail: youtubePreviewComunidade.thumbnail } : null,
        ...(userData?.imobiliariaId && { imobiliariaId: userData.imobiliariaId }),
      };
      const docRef = await addDoc(collection(db, 'comunidadePosts'), postData);
      const newPost = {
        id: docRef.id,
        ...postData,
        createdAt: { toDate: () => new Date() },
        userLiked: false,
        likes: 0,
        commentsCount: 0,
        repostsCount: 0,
        totalEngagement: 0,
        avatar: getComunidadeAvatar(),
        nome: getComunidadeNome(),
        youtubeData: youtubePreviewComunidade ? { videoId: youtubePreviewComunidade.videoId, embedUrl: youtubePreviewComunidade.embedUrl, thumbnail: youtubePreviewComunidade.thumbnail } : null,
      };
      setTrendingPosts(prev => [newPost, ...prev]);
      setNovoPostComunidade('');
      setFileComunidade(null);
      setFilePreviewComunidade(null);
      setYoutubeLinkComunidade('');
      setYoutubePreviewComunidade(null);
      setShowEmojiComunidade(false);
    } catch (error) {
      console.error('Erro ao criar post:', error);
    } finally {
      setPostandoComunidade(false);
    }
  };

  const openPostModal = async (post: any) => {
    setSelectedPost(post);
    setShowPostModal(true);
    setCommentsLoading(true);
    
    try {
      const commentsRef = collection(db, "comunidadePosts", post.id, "comments");
      const commentsSnapshot = await getDocs(commentsRef);
      const comments = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPostComments(comments);
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const openLeadModal = async (lead: any) => {
    // Redirecionar para a página de detalhes do lead
    router.push(`/dashboard/crm/${lead.id}`);
  };

  // Buscar dados da meta e nome da imobiliária
  useEffect(() => {
    console.log('useEffect metas chamado, userData:', userData);
    if (!userData?.imobiliariaId) {
      console.log('userData ou imobiliariaId não encontrado para metas');
      return;
    }
    console.log('Buscando metas para imobiliariaId:', userData.imobiliariaId);
    let unsubscribe: (() => void) | undefined;

    // Buscar nome da imobiliária
    const fetchNomeImobiliaria = async () => {
      try {
        console.log('Buscando nome da imobiliária...');
        const imobiliariaRef = firestoreDoc(db, 'imobiliarias', userData.imobiliariaId!);
        const imobiliariaSnap = await getDoc(imobiliariaRef);
        if (imobiliariaSnap.exists()) {
          const nome = imobiliariaSnap.data().nome || 'Imobiliária';
          console.log('Nome da imobiliária encontrado:', nome);
          setNomeImobiliaria(nome);
        } else {
          console.log('Imobiliária não encontrada no Firestore');
          setNomeImobiliaria('Imobiliária');
        }
      } catch (error) {
        console.error('Erro ao buscar nome da imobiliária:', error);
        setNomeImobiliaria('Imobiliária');
      }
    };

    fetchNomeImobiliaria();

    // Buscar meta
    console.log('Configurando listener para metas...');
    const metaRef = firestoreDoc(db, 'metas', userData.imobiliariaId);
    unsubscribe = onSnapshot(metaRef, (snap) => {
      if (snap.exists()) {
        console.log('Meta encontrada:', snap.data());
        setMeta(snap.data());
      } else {
        console.log('Meta não encontrada');
        setMeta(null);
      }
    });

    // Carregar notas do usuário
    if (currentUser) {
      const q = query(
        collection(db, 'notes'),
        where('userId', '==', currentUser.uid),
        orderBy('criadoEm', 'desc')
      );

      const notesUnsubscribe = onSnapshot(q, (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotes(notesData);
      }, (error) => {
        console.error('Erro ao carregar notas:', error);
      });

      return () => {
        if (unsubscribe) {
          console.log('Desconectando listener de metas');
          unsubscribe();
        }
        notesUnsubscribe();
      };
    }

    return () => {
      if (unsubscribe) {
        console.log('Desconectando listener de metas');
        unsubscribe();
      }
    };
  }, [userData, currentUser]);

  // Meta pessoal (valor almejado) e contribuições para calcular realizado no período
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    const imobiliariaId = userData.imobiliariaId;

    const unsubMetaPessoal = currentUser?.uid
      ? onSnapshot(firestoreDoc(db, 'metas', imobiliariaId, 'metasPessoais', currentUser.uid), (snap) => {
          if (snap.exists()) {
            const v = snap.data()?.valorAlmejado;
            setMetaPessoalValorAlmejado(typeof v === 'number' ? v : 0);
          } else {
            setMetaPessoalValorAlmejado(0);
          }
        })
      : () => {};

    const contribRef = collection(db, 'metas', imobiliariaId, 'contribuicoes');
    const unsubContrib = onSnapshot(query(contribRef, orderBy('createdAt', 'desc')), (snap) => {
      setContribuicoesMeta(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            corretorId: x.corretorId ?? '',
            valor: Number(x.valor) ?? 0,
            dataVenda: x.dataVenda ?? undefined,
          };
        })
      );
    });

    return () => {
      if (typeof unsubMetaPessoal === 'function') unsubMetaPessoal();
      unsubContrib();
    };
  }, [userData?.imobiliariaId, currentUser?.uid]);

  // Corretores da imobiliária para o ranking (1º, 2º, 3º)
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    const q = query(
      collection(db, 'usuarios'),
      where('imobiliariaId', '==', userData.imobiliariaId),
      where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria']),
      where('aprovado', '==', true)
    );
    getDocs(q).then((snap) => {
      setCorretoresRanking(snap.docs.map((d) => ({ id: d.id, nome: d.data().nome || 'Corretor' })));
    });
  }, [userData?.imobiliariaId]);

  // Períodos de Meets & Visitas — criados na Área do administrador (tempo real)
  const [mvPeriodos, setMvPeriodos] = useState<any[]>([]);
  useEffect(() => {
    if (isEspelhoDemo || !userData?.imobiliariaId) return;
    const qMv = query(collection(db, 'meetsVisitas'), where('imobiliariaId', '==', userData.imobiliariaId));
    const unsub = onSnapshot(qMv, (snap) => setMvPeriodos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  function calcularVariacao(atual: string, anterior: string) {
    const a = parseFloat((atual || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    const b = parseFloat((anterior || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(a) || isNaN(b) || b === 0) return null;
    return ((a - b) / b) * 100;
  }

  // Funções auxiliares para eventos
  const getEventIcon = (tipo: string) => {
    switch (tipo) {
      case 'meet': return '🎥';
      case 'youtube': return '📺';
      case 'instagram': return '📱';
      default: return '📅';
    }
  };

  const getEventColor = (tipo: string) => {
    switch (tipo) {
      case 'meet': return 'bg-amber-500';
      case 'youtube': return 'bg-red-500';
      case 'instagram': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const indicadoresList = [
    { key: 'cub', label: 'CUB (SC)', tipo: 'mensal' },
    { key: 'selic', label: 'SELIC', tipo: 'mensal' },
    { key: 'ipca', label: 'IPCA', tipo: 'anual' },
    { key: 'igpm', label: 'IGP-M', tipo: 'anual' },
    { key: 'incc', label: 'INCC', tipo: 'anual' },
  ];

  const EconomicIndicator = ({ title, value, variacao, subtitulo }: { title: string; value: string; variacao: number | null; subtitulo: string }) => (
    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-[#D4A017]/5 to-[#E8C547]/5 rounded-xl border border-[#E8C547]/20 min-w-[120px] cursor-pointer group hover:scale-105 hover:shadow-lg hover:border-[#D4A017]/40 transition-all duration-300 relative overflow-hidden">
      {/* Efeito de brilho no hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Borda superior que aparece no hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#D4A017] to-[#E8C547] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
      
      <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1 group-hover:text-[#D4A017] transition-colors duration-300">{title}</div>
      <div className="text-lg font-bold text-[#2E2F38] dark:text-white group-hover:text-[#D4A017] transition-colors duration-300">{value}</div>
      <div className="text-[10px] text-[#6B6F76] dark:text-gray-400 mb-1 group-hover:text-[#E8C547] transition-colors duration-300">({subtitulo})</div>
      {variacao !== null && (
        <div className={`flex items-center text-xs font-medium ${variacao >= 0 ? 'text-[#3AC17C]' : 'text-[#F45B69]'} group-hover:scale-110 transition-transform duration-300`}> 
          {variacao >= 0 ? (
            <svg className="h-3 w-3 mr-1 group-hover:animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
          ) : (
            <svg className="h-3 w-3 mr-1 group-hover:animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>
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

  // Filtrar posts para não mostrar o original se já está aninhado em um repost
  const trendingPostsFiltered = (() => {
    const shownOriginals = new Set();
    return trendingPosts.filter(post => {
      if (post.repostOf) {
        shownOriginals.add(post.repostOf);
        return true;
      }
      if (shownOriginals.has(post.id)) {
        return false;
      }
      return true;
    });
  })();

  const horaAgora = currentTime.getHours();
  const saudacaoDia = horaAgora < 12 ? 'Bom dia' : horaAgora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroNomeHome = (userData?.nome || currentUser?.email?.split('@')[0] || 'corretor').split(' ')[0];
  const totalFunilHome = Object.values(funilPessoal || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  // Meets & Visitas — dados reais dos períodos criados na Área do administrador (demo usa exemplo)
  const ymdHoje = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
  const nomesEquipe: Record<string, string> = Object.fromEntries(corretoresRanking.map((c) => [c.id, c.nome]));
  const periodoMeets = mvPeriodos
    .filter((p) => p.inicio && p.fim && p.inicio <= ymdHoje && ymdHoje <= p.fim)
    .sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''))[0] || null;
  const contadoresMeets: Record<string, number> = (periodoMeets?.contadores as Record<string, number>) || {};
  const podioMeets: { nome: string; qtd: number }[] = isEspelhoDemo
    ? [{ nome: 'Renan', qtd: 12 }, { nome: 'Toni', qtd: 9 }, { nome: 'Breno', qtd: 7 }]
    : Object.entries(contadoresMeets)
        .map(([id, q]) => ({ nome: nomesEquipe[id] || 'Corretor', qtd: Number(q) || 0 }))
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 3);
  const meusMeets = isEspelhoDemo ? 5 : Number(contadoresMeets[currentUser?.uid || ''] || 0);
  const minhaPosMeets = isEspelhoDemo ? 4 : Object.values(contadoresMeets).filter((q) => Number(q) > meusMeets).length + 1;
  const liderMeets = Math.max(podioMeets[0]?.qtd || 0, meusMeets, 1);
  const qtdMinhaMeets = (p: any) => Number(p?.contadores?.[currentUser?.uid || ''] || 0);
  const ymdAtras = (dias: number) => { const d = new Date(currentTime); d.setDate(d.getDate() - dias); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const encerradosMeets = mvPeriodos.filter((p) => p.fim && p.fim < ymdHoje).sort((a, b) => (b.fim || '').localeCompare(a.fim || ''));
  const historicoMeets = isEspelhoDemo
    ? { semana: 8, mes: 23, tri: 61 }
    : {
        semana: encerradosMeets[0] ? qtdMinhaMeets(encerradosMeets[0]) : 0,
        mes: mvPeriodos.filter((p) => p.fim && p.inicio && p.fim >= ymdAtras(30) && p.inicio <= ymdHoje).reduce((s, p) => s + qtdMinhaMeets(p), 0),
        tri: mvPeriodos.filter((p) => p.fim && p.inicio && p.fim >= ymdAtras(90) && p.inicio <= ymdHoje).reduce((s, p) => s + qtdMinhaMeets(p), 0),
      };
  const fmtDiaMes = (s?: string) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '');
  const periodoTagMeets = isEspelhoDemo ? '01/07 → 07/07' : periodoMeets ? `${fmtDiaMes(periodoMeets.inicio)} → ${fmtDiaMes(periodoMeets.fim)}` : 'período não definido';
  const temPeriodoMeets = isEspelhoDemo || !!periodoMeets;
  // Countdown: até o fim do período ativo; sem período, até o fim da semana (dom) — a ampulheta esvaziando
  const diasFimSemana = (() => {
    if (!isEspelhoDemo && periodoMeets?.fim) {
      const fimDt = new Date(periodoMeets.fim + 'T23:59:59');
      return Math.max(1, Math.ceil((fimDt.getTime() - currentTime.getTime()) / 86400000));
    }
    return ((7 - currentTime.getDay()) % 7) + 1;
  })();
  const countdownSemana = diasFimSemana === 1 ? 'falta 1 dia' : `faltam ${diasFimSemana} dias`;
  const urgSemana = diasFimSemana <= 2
    ? { bg: 'linear-gradient(135deg, #FF1E56, #A50D38)', glow: '0 0 22px rgba(255,30,86,0.75)', cls: 'text-white border-[#FF6B93]/60' }
    : diasFimSemana <= 4
      ? { bg: 'linear-gradient(135deg, #FB923C, #C2410C)', glow: '0 0 18px rgba(251,146,60,0.6)', cls: 'text-white border-[#FDBA74]/60' }
      : { bg: 'linear-gradient(135deg, #FFD569, #C89210)', glow: '0 0 18px rgba(232,197,71,0.55)', cls: 'text-[#181203] border-[#FFE9A6]/70' };

  return (
    <div className="min-h-full lg:h-full flex flex-col pb-6 lg:pb-0 lg:overflow-hidden">
      {/* ===== WAR ROOM — bento grid que preenche exatamente a altura da tela (sem rolagem no desktop) ===== */}
      <div id="trending-section" className="grid grid-cols-6 lg:grid-cols-12 auto-rows-[minmax(84px,auto)] lg:grid-rows-[repeat(6,minmax(72px,1fr))] gap-3 [grid-auto-flow:dense] mt-1 lg:mt-0 lg:flex-1 lg:min-h-0">

        {/* Identidade do corretor — o card herói: fundo calmo e escuro pra atenção ir toda pro placar (MOCKUP até integrar) */}
        <div className="col-span-6 lg:col-span-4 lg:row-span-2 !rounded-[24px] border border-[#E8C547]/20 relative overflow-hidden p-4 al-rise flex flex-col" style={{ background: 'linear-gradient(150deg, #16121d 0%, #0d0b12 52%, #120e08 100%)', boxShadow: '0 0 40px -18px rgba(232,197,71,0.35), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <div className="absolute -top-24 -right-14 w-64 h-64 rounded-full bg-[#E8C547]/[0.09] blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -left-20 w-56 h-56 rounded-full bg-[#FF1E56]/[0.05] blur-3xl pointer-events-none" />
          <span className="pointer-events-none absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-[#E8C547]/45 rounded-tl-sm" />
          <span className="pointer-events-none absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-[#E8C547]/45 rounded-br-sm" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="gx-tag"><span>{saudacaoDia} · {nomeImobiliaria || 'Sua imobiliária'}</span></span>
              <div className="flex items-center gap-3 mt-4">
                <div className="relative w-[52px] h-[52px] p-[2px] rounded-full bg-gradient-to-br from-[#FF6B93] via-[#FF1E56] to-[#8B0F31] shadow-[0_0_22px_rgba(255,30,86,0.45)] shrink-0">
                  <div className="w-full h-full rounded-full bg-[#16090e] flex items-center justify-center text-[#FF9EB5] al-display font-bold text-xl">
                    {primeiroNomeHome.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0">
                  <h1 className="al-display text-[25px] font-bold text-white uppercase tracking-wide leading-none truncate">{primeiroNomeHome}</h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1.5 rounded-full text-[10px] font-extrabold tracking-[0.14em] bg-[#E8C547]/10 border border-[#E8C547]/40 text-[#E8C547] shadow-[0_0_12px_rgba(232,197,71,0.25)]">
                    <Ic k="trophy" s={12} /> {temPeriodoMeets ? `${minhaPosMeets}º NO RANKING` : 'SEM PERÍODO ATIVO'}
                  </span>
                </div>
              </div>
            </div>
            {/* Placar da semana — o número principal, emoldurado */}
            <div className="gx-placar gx-sheen relative shrink-0 rounded-2xl border-2 border-[#E8C547]/55 px-5 py-2.5 text-right overflow-hidden group" style={{ background: 'linear-gradient(160deg, rgba(232,197,71,0.16), rgba(20,13,5,0.55))' }}>
              <span className="pointer-events-none absolute inset-0 gx-stripes opacity-40" />
              <CountUp n={meusMeets} className="relative al-display block text-[56px] font-bold al-grad-text leading-[0.9] tabular-nums drop-shadow-[0_0_26px_rgba(232,197,71,0.65)]" />
              <span className="relative block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#E8C547] mt-0.5">meets & visitas</span>
              <span className="relative block text-[8.5px] font-bold uppercase tracking-[0.2em] text-white/60">nesta semana</span>
            </div>
          </div>
          <div className="relative mt-auto pt-2 flex items-end justify-between gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[11px] font-extrabold tracking-[0.12em] uppercase animate-pulse shrink-0 whitespace-nowrap ${urgSemana.cls}`} style={{ background: urgSemana.bg, boxShadow: urgSemana.glow }}>
              <Ic k="hourglass" s={13} /> {countdownSemana}
            </span>
            {(() => {
              const hojeIdx = (currentTime.getDay() + 6) % 7;
              return (
                <div className="hidden sm:flex flex-col items-center gap-1.5 pb-0.5 shrink-0">
                  <div className="flex items-start gap-[6px]">
                    {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
                      <span key={i} className="flex flex-col items-center gap-1">
                        <span className={`text-[8px] font-extrabold leading-none ${i === hojeIdx ? 'text-[#FF7A97]' : 'text-white/30'}`}>{d}</span>
                        <span className={`w-2 h-2 rounded-full ${i < hojeIdx ? 'bg-[#E8C547] shadow-[0_0_7px_rgba(232,197,71,0.65)]' : i === hojeIdx ? 'bg-[#FF1E56] shadow-[0_0_9px_#FF1E56] animate-pulse' : 'bg-white/10'}`} />
                      </span>
                    ))}
                  </div>
                  <span className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/40 whitespace-nowrap">progresso da semana</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* PLANO DE AÇÃO — a jornada do próximo agendamento: 1 atrasadas → 2 hoje → 3 sem tarefa → 4 ligação ativa */}
        <div className="col-span-6 lg:col-span-8 lg:row-span-1 flex flex-col al-rise al-d1 min-h-0">
          <div className="flex items-center gap-2.5 mb-1.5 shrink-0">
            <span className="gx-tag"><Ic k="zap" s={11} /><span>Plano de ação</span></span>
            <span className="hidden md:block text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-white/50 whitespace-nowrap">onde está seu próximo meet? siga a ordem</span>
            <div className="flex-1 gx-line opacity-25" />
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-2 sm:flex sm:items-stretch gap-1.5">
            {[
              { href: '/dashboard/crm?tarefa=atraso', n: 1, label: 'TAREFAS ATRASADAS', count: tarefaAtrasadaCount, acao: 'resolva já ▸', ic: 'alert', icc: 'text-[#FF7A97] drop-shadow-[0_0_8px_rgba(255,30,86,0.6)]', lbl: 'text-[#FF9EB5]', box: 'border-[#FF1E56]/40 bg-[#FF1E56]/[0.06] hover:bg-[#FF1E56]/[0.13] hover:border-[#FF1E56]/80 hover:shadow-[0_10px_28px_-10px_rgba(255,30,86,0.55)]', num: 'border-[#FF1E56]/50 text-[#FF7A97] bg-[#FF1E56]/10', dash: '' },
              { href: '/dashboard/crm?tarefa=hoje', n: 2, label: 'TAREFAS DE HOJE', count: tarefaDiaCount, acao: 'não deixe passar ▸', ic: 'zap', icc: 'text-[#E8C547] drop-shadow-[0_0_8px_rgba(232,197,71,0.6)]', lbl: 'text-[#FFE9A6]', box: 'border-[#E8C547]/40 bg-[#E8C547]/[0.06] hover:bg-[#E8C547]/[0.13] hover:border-[#E8C547]/80 hover:shadow-[0_10px_28px_-10px_rgba(232,197,71,0.5)]', num: 'border-[#E8C547]/50 text-[#E8C547] bg-[#E8C547]/10', dash: '' },
              { href: '/dashboard/crm?tarefa=sem', n: 3, label: 'LEADS ESQUECIDOS', count: semTarefaCount, acao: 'acorde eles ▸', ic: 'gem', icc: 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]', lbl: 'text-emerald-200', box: 'border-[#34D399]/40 bg-[#34D399]/[0.06] hover:bg-[#34D399]/[0.13] hover:border-[#34D399]/80 hover:shadow-[0_10px_28px_-10px_rgba(52,211,153,0.5)]', num: 'border-[#34D399]/50 text-emerald-300 bg-[#34D399]/10', dash: '' },
              { href: '/dashboard/ligacao-ativa', n: 4, label: 'LIGAÇÃO ATIVA', count: null, acao: 'gere contatos do zero ▸', ic: 'phone', icc: 'text-[#C4A6FF] drop-shadow-[0_0_8px_rgba(159,107,255,0.6)]', lbl: 'text-[#C4A6FF]', box: 'border-[#9F6BFF]/45 bg-[#9F6BFF]/[0.06] hover:bg-[#9F6BFF]/[0.14] hover:border-[#9F6BFF]/85 hover:shadow-[0_10px_28px_-10px_rgba(159,107,255,0.55)]', num: 'border-[#9F6BFF]/55 text-[#C4A6FF] bg-[#9F6BFF]/10', dash: 'border-dashed' },
            ].map((s, i) => [
              <Link key={`passo-${s.n}`} href={s.href} className={`group relative sm:flex-1 min-w-0 overflow-hidden rounded-xl border ${s.dash} ${s.box} px-3 py-2 flex flex-col justify-between gap-1 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200`}>
                <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
                <span className="relative flex items-center gap-1.5 min-w-0">
                  <span className={`w-[18px] h-[18px] rounded-full grid place-items-center al-display text-[10px] font-extrabold shrink-0 border ${s.num}`}>{s.n}</span>
                  <span className={`text-[9px] font-extrabold tracking-[0.1em] truncate ${s.lbl}`}>{s.label}</span>
                  <Ic k={s.ic} s={15} className={`ml-auto shrink-0 ${s.icc} group-hover:scale-110 transition-transform duration-200`} />
                </span>
                <span className="relative flex items-baseline gap-2 min-w-0">
                  {s.count != null && <CountUp n={s.count} className="al-display text-[25px] font-bold text-white leading-none tabular-nums shrink-0" />}
                  <span className={`text-[10.5px] font-extrabold whitespace-nowrap truncate ${s.lbl} ${s.count == null ? 'text-[12.5px] text-white mt-1' : ''}`}>{s.acao}</span>
                </span>
              </Link>,
              i < 3 ? <Ic key={`seta-${s.n}`} k="chev" s={15} className="hidden sm:block self-center shrink-0 text-white/30" /> : null,
            ])}
          </div>
        </div>

        {/* Radar de eventos — varredura + lista HUD */}
        <div className="col-span-6 lg:col-span-8 lg:row-span-3 lg:col-start-5 lg:row-start-4 al-card relative overflow-hidden p-3.5 al-rise al-d5 flex flex-col">
          <div className="absolute inset-x-0 top-0 gx-line opacity-60" />
          <span className="pointer-events-none absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-[#FF3364]/50 rounded-tl-sm" />
          <span className="pointer-events-none absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-[#FF3364]/50 rounded-tr-sm" />
          <span className="pointer-events-none absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-[#FF3364]/30 rounded-bl-sm" />
          <span className="pointer-events-none absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-[#FF3364]/30 rounded-br-sm" />
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] flex items-center gap-2"><Ic k="radar" s={18} className="text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)]" /> Radar de eventos</h2>
            <Link href="/dashboard/agenda" className="text-[11px] font-bold text-[#FF5C7E] hover:underline shrink-0">agenda completa ▸</Link>
          </div>
          <div className="flex gap-4 items-center flex-1 min-h-0">
            <div className="hidden sm:flex flex-col items-center shrink-0">
              <div className="gx-radar w-[100px] h-[100px]">
                <span className="gx-blip" style={{ left: '62%', top: '28%' }} />
                <span className="gx-blip" style={{ left: '36%', top: '56%', animationDelay: '0.7s' }} />
                <span className="gx-blip" style={{ left: '55%', top: '68%', animationDelay: '1.3s' }} />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#FF3364] shadow-[0_0_8px_#FF3364]" />
              </div>
              <span className="al-display text-[9px] font-bold tracking-[0.26em] text-[#FF5C7E] mt-1.5">SCANNING</span>
            </div>
            <div className="flex-1 min-w-0 w-full self-stretch flex flex-col justify-center">
              {agendaLoading ? (
                <p className="text-text-secondary text-sm">Carregando…</p>
              ) : proximosEventosConfirmados.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                  <p className="text-[12.5px] text-text-secondary">Nenhum evento no radar por enquanto.</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">os eventos são publicados pela imobiliária — bom momento pra prospectar</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {proximosEventosConfirmados.slice(0, 5).map((item) => {
                    const nowTime = currentTime.getTime();
                    const isAgora = item.startTime <= nowTime && item.fimTime >= nowTime;
                    const emBreve = !isAgora && item.startTime > nowTime && item.startTime - nowTime <= 45 * 60 * 1000;
                    const horaCls = isAgora ? 'text-[#FF5C7E]' : emBreve ? 'text-[#E8C547]' : 'text-white/70';
                    const rowCls = isAgora
                      ? 'border-[#FF1E56] bg-[#FF1E56]/[0.09] gx-pulse'
                      : emBreve
                        ? 'border-[#E8C547] bg-[#E8C547]/[0.06]'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]';
                    return (
                      <Link href="/dashboard/agenda" key={`${item.tipo}-${item.id}-${item.startTime}`} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border-l-2 transition-all hover:translate-x-1 ${rowCls}`}>
                        <span className={`al-display text-[15px] font-bold tabular-nums w-12 shrink-0 ${horaCls}`}>{item.horarioStr}</span>
                        <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-white" title={item.titulo}>{item.titulo}</span>
                        <span className="hidden md:inline text-[10px] text-text-secondary shrink-0">{item.tipoLabel}</span>
                        {isAgora ? (
                          <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#FF1E56] text-white text-[9px] font-extrabold tracking-[0.14em] animate-pulse">AGORA</span>
                        ) : emBreve ? (
                          <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#E8C547] text-black text-[9px] font-extrabold tracking-[0.14em]">EM BREVE</span>
                        ) : (
                          <span className="shrink-0 text-[10px] text-text-secondary tabular-nums">{item.dataStr}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
          {/* Comunidade — oculta da home a pedido (lógica preservada; usaremos depois). Basta remover "hidden" daqui e do card p/ reativar. */}
          <div className="w-full hidden">
          <div className="rounded-2xl p-4 relative overflow-hidden animate-fade-in border border-white/10 hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-r pointer-events-none" />

            {/* Tópico chamativo — foguinho tempo real */}
            <div className="mb-3 pb-3 border-b border-amber-500/20">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-2xl animate-pulse" title="Ao vivo">🔥</span>
                Comunidade
              </h2>
              <p className="text-xs font-semibold text-amber-300/95 mt-1 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Em tempo real · O que tá rolando na equipe
              </p>
            </div>

            {/* Composer: bloco semi-transparente para deixar o background aparecer */}
            <div className="mb-3 rounded-xl p-4 bg-white/10 backdrop-blur-sm border border-white/10">
              <div className="flex gap-3">
                <img src={getComunidadeAvatar()} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=U&background=random`; }} />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white resize-none min-h-[72px] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A017]/50"
                    placeholder="O que está acontecendo?"
                    value={novoPostComunidade}
                    onChange={(e) => setNovoPostComunidade(e.target.value)}
                    disabled={postandoComunidade}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A017]/50"
                    placeholder="🔗 Link do YouTube (opcional)"
                    value={youtubeLinkComunidade}
                    onChange={(e) => handleYoutubeLinkChangeComunidade(e.target.value)}
                    disabled={postandoComunidade}
                  />
                  {youtubePreviewComunidade && (
                    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20">
                      <iframe
                        src={youtubePreviewComunidade.embedUrl}
                        title="YouTube"
                        className={`w-full ${youtubePreviewComunidade.isShort ? 'h-48' : 'h-36'}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <button type="button" onClick={() => { setYoutubeLinkComunidade(''); setYoutubePreviewComunidade(null); }} className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 text-xs">✕</button>
                      {youtubePreviewComunidade.isShort && <span className="absolute top-1 left-1 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-semibold">SHORT</span>}
                    </div>
                  )}
                  {filePreviewComunidade && (
                    <div className="relative inline-block">
                      {fileComunidade?.type.startsWith('image/') && (
                        <img src={filePreviewComunidade} alt="" className="max-h-28 rounded-lg border border-white/10" />
                      )}
                      {fileComunidade?.type.startsWith('video/') && (
                        <video src={filePreviewComunidade} controls className="max-h-28 rounded-lg border border-white/10" />
                      )}
                      <button type="button" onClick={() => { setFileComunidade(null); setFilePreviewComunidade(null); }} className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 text-xs">✕</button>
                    </div>
                  )}
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2 relative">
                      <label className="cursor-pointer text-[#D4A017] hover:text-[#B8860B] text-lg" title="Anexar foto ou vídeo">
                        <span>📎</span>
                        <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileComunidadeChange} />
                      </label>
                      <button type="button" onClick={() => setShowEmojiComunidade(v => !v)} className="text-[#D4A017] hover:text-[#B8860B] text-lg" title="Emoji">😊</button>
                      {showEmojiComunidade && (
                        <div className="absolute left-0 bottom-8 z-50">
                          <Picker data={data} onEmojiSelect={handleEmojiSelectComunidade} theme={typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'} />
                        </div>
                      )}
                      <Link href="/dashboard/comunidade" className="text-[#3AC17C] hover:text-[#2E9D63] text-lg" title="Agendar evento">📅</Link>
                    </div>
                    <button
                      type="button"
                      onClick={handlePostarComunidade}
                      disabled={postandoComunidade || (!novoPostComunidade.trim() && !fileComunidade && !youtubePreviewComunidade)}
                      className="px-4 py-2 rounded-lg bg-[#D4A017] text-white font-semibold text-sm hover:bg-[#B8860B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {postandoComunidade ? 'Postando...' : 'Postar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {trendingLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A017]"></div>
              </div>
            ) : trendingPosts.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">📱</div>
                <p className="text-gray-300 text-sm">Nenhum post ainda. Seja o primeiro!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trendingPostsFiltered.slice(0, 6).map((post, index) => {
                  const hasMedia = !!(post.file && post.fileMeta) || !!post.youtubeData?.thumbnail;
                  const eventIcon = (t: string) => ({ meet: '🎥', youtube: '📺', instagram: '📱', discord: '💬' }[t] || '📅');
                  const eventColor = (t: string) => ({ meet: 'bg-amber-500', youtube: 'bg-red-500', instagram: 'bg-pink-500', discord: 'bg-indigo-500' }[t] || 'bg-gray-500');
                  return (
                  <div
                    key={post.id}
                    className={`group relative rounded-xl transition-all duration-300 cursor-pointer border backdrop-blur-sm hover:scale-[1.01] ${
                      hasMedia ? 'p-3' : 'p-4'
                    } ${
                      post.isEvento
                        ? 'bg-amber-500/15 border-amber-400/30 hover:bg-amber-500/20'
                        : 'bg-white/10 border-white/10 hover:bg-white/15 hover:border-white/20'
                    } ${hasMedia ? 'min-h-[8rem]' : ''}`}
                  >
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg">#{index + 1}</div>
                    <div className="flex items-start gap-3">
                      <img src={post.avatar} alt={post.nome} className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-sm truncate">{post.nome}</span>
                          <span className="text-[10px] text-gray-300 shrink-0">
                            {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        {post.isEvento && (
                          <div className="mb-2">
                            <a
                              href={post.eventoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${eventColor(post.eventoTipo || '')} text-white hover:opacity-90`}
                            >
                              <span>{eventIcon(post.eventoTipo || '')}</span>
                              <span className="truncate max-w-[140px]">{post.titulo}</span>
                              <span className="opacity-90">
                                {post.eventoData?.toDate ? post.eventoData.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </a>
                            {post.eventoLink && (
                              <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-full" title={post.eventoLink}>Link: {post.eventoLink}</p>
                            )}
                          </div>
                        )}
                        {!post.repostOf && post.texto && !post.isEvento && <div className="text-sm text-white line-clamp-2">{post.texto}</div>}
                        {!post.repostOf && post.texto && post.isEvento && <div className="text-xs text-gray-300 line-clamp-2">{post.texto}</div>}
                        {post.repostOf && post.repostComment && <div className="text-xs text-gray-400 italic">Repost: {post.repostComment}</div>}
                        {/* Thumbnail centralizada, clicável para abrir o post */}
                        {((post.file && post.fileMeta) || post.youtubeData?.thumbnail) ? (
                          <div className="w-full flex justify-center mt-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openPostModal(post); }}
                              className="relative flex items-center justify-center w-full max-w-[280px] aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/30 hover:border-[#D4A017]/50 hover:ring-2 hover:ring-[#D4A017]/30 transition-all shadow-lg"
                            >
                              {post.file && post.fileMeta && post.fileMeta.type?.startsWith('image/') && (
                                <img src={post.file} alt="" className="w-full h-full object-cover" />
                              )}
                              {post.file && post.fileMeta && post.fileMeta.type?.startsWith('video/') && (
                                <>
                                  <video src={post.file} className="w-full h-full object-cover" muted playsInline />
                                  <span className="absolute inset-0 flex items-center justify-center text-white/90 text-4xl drop-shadow-lg bg-black/20 rounded-xl">▶</span>
                                </>
                              )}
                              {post.youtubeData?.thumbnail && !post.file && (
                                <>
                                  <img src={post.youtubeData.thumbnail} alt="" className="w-full h-full object-cover" />
                                  <span className="absolute inset-0 flex items-center justify-center text-white/90 text-4xl drop-shadow-lg bg-black/20 rounded-xl">▶</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : null}
                        {/* Ações iguais à Comunidade: like, comentário, repost */}
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/10 text-xs">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                            disabled={isLiking === post.id}
                            className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            {isLiking === post.id ? (
                              <span className="inline-block w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <span>{post.userLiked ? '❤️' : '🤍'}</span>
                            )}
                            <span>{post.likes ?? 0}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openPostModal(post); }}
                            className="flex items-center gap-1.5 text-gray-400 hover:text-[#D4A017] transition-colors"
                          >
                            <span>💬</span>
                            <span>{post.commentsCount ?? 0}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setRepostTarget(post); setRepostModalOpen(true); }}
                            disabled={isReposting === post.id}
                            className="flex items-center gap-1.5 text-gray-400 hover:text-green-500 transition-colors disabled:opacity-50"
                          >
                            <span>🔁</span>
                            <span>{post.repostsCount ?? 0}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openPostModal(post); }}
                            className="ml-auto text-[#D4A017] hover:underline text-xs font-medium"
                          >
                            Ver
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-white/10">
              <Link href="/dashboard/comunidade" className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-gradient-to-r from-[#D4A017] to-[#E8C547] text-white font-semibold rounded-lg hover:from-[#B8860B] hover:to-[#D4A017] transition-all text-sm">
                <span>🚀</span>
                <span>Ver mais na Comunidade</span>
                <span>→</span>
              </Link>
            </div>
          </div>
          </div>

          {/* Pipeline em formato de funil */}
          <div className="col-span-6 lg:col-span-4 lg:row-span-2 lg:col-start-1 lg:row-start-5 al-card p-3.5 relative overflow-hidden al-rise al-d4 flex flex-col">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] flex items-center gap-2"><Ic k="chart" s={18} className="text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)]" /> Seu pipeline</h2>
              <Link href="/dashboard/crm/andamento" className="text-[11px] font-bold text-[#FF5C7E] hover:underline shrink-0">kanban ▸</Link>
            </div>
            {agendaLoading ? (
              <p className="text-gray-400 text-sm">Carregando...</p>
            ) : (() => {
              const porEtapa = funilPessoal;
              const etapasVisiveis = stages.slice(0, 6);
              const maxLocal = Math.max(...etapasVisiveis.map((e) => porEtapa[e] ?? 0), 1);
              const coresFunil = ['#FFE9A6', '#E8C547', '#D4A017', '#F59E0B', '#FF7A45', '#FF1E56'];
              return (
                <div className="min-w-0 flex-1 min-h-0 flex flex-col justify-center gap-[5px]">
                  {etapasVisiveis.map((etapa, ei) => {
                    const qtd = porEtapa[etapa] ?? 0;
                    const w = qtd > 0 ? Math.max((qtd / maxLocal) * 100, 18) : 5;
                    const cor = coresFunil[ei % coresFunil.length];
                    return (
                      <Link key={etapa} href="/dashboard/crm" className="group flex items-center gap-2 min-w-0" title={`${etapa}: ${qtd} lead${qtd === 1 ? '' : 's'}`}>
                        <span className="w-[7.5rem] shrink-0 text-[10px] text-text-secondary truncate text-right group-hover:text-white transition-colors">{etapa}</span>
                        <span className="flex-1 flex justify-center min-w-0">
                          <span
                            className="h-[13px] rounded-[5px] transition-all duration-300 group-hover:brightness-125"
                            style={{ width: `${w}%`, background: `linear-gradient(90deg, ${cor}e6, ${cor}55)`, boxShadow: qtd > 0 ? `0 0 12px ${cor}45` : 'none' }}
                          />
                        </span>
                        <span className="w-6 shrink-0 al-display text-[13px] font-bold text-white tabular-nums">{qtd}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Acesso rápido — as ferramentas do dia a dia, em destaque acima do pipeline */}
          <div className="col-span-6 lg:col-span-4 lg:row-span-2 lg:col-start-1 lg:row-start-3 flex flex-col al-rise al-d2 min-h-0">
            <div className="flex items-center gap-2 mb-1.5 shrink-0">
              <span className="gx-tag"><Ic k="rocket" s={11} /><span>Acesso rápido</span></span>
              <div className="flex-1 gx-line opacity-30" />
            </div>
            <div className="grid grid-cols-1 gap-2 flex-1 min-h-0">
              {[
                { href: '/dashboard/crm', ic: 'users', icc: 'text-[#FF7A97] drop-shadow-[0_0_8px_rgba(255,30,86,0.6)]', t: 'CRM', b: 'border-[#FF1E56]/35 hover:border-[#FF1E56]/70', bg: 'bg-[#FF1E56]/[0.05] hover:bg-[#FF1E56]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(255,30,86,0.5)]', chip: 'from-[#FF1E56]/25 to-[#FF1E56]/[0.03] border-[#FF1E56]/30', arrow: 'text-[#FF7A97]' },
                { href: '/dashboard/materiais', ic: 'folder', icc: 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]', t: 'Produtos', b: 'border-[#34D399]/35 hover:border-[#34D399]/70', bg: 'bg-[#34D399]/[0.05] hover:bg-[#34D399]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(52,211,153,0.45)]', chip: 'from-[#34D399]/25 to-[#34D399]/[0.03] border-[#34D399]/30', arrow: 'text-emerald-300' },
                { href: '/dashboard/fluxo-pagamento', ic: 'receipt', icc: 'text-[#C4A6FF] drop-shadow-[0_0_8px_rgba(159,107,255,0.6)]', t: 'Fluxo de Pagamento', b: 'border-[#9F6BFF]/35 hover:border-[#9F6BFF]/70', bg: 'bg-[#9F6BFF]/[0.05] hover:bg-[#9F6BFF]/[0.12]', glow: 'hover:shadow-[0_10px_30px_-10px_rgba(159,107,255,0.45)]', chip: 'from-[#9F6BFF]/25 to-[#9F6BFF]/[0.03] border-[#9F6BFF]/30', arrow: 'text-[#C4A6FF]' },
              ].map((a) => (
                <Link key={a.href} href={a.href} className={`group relative overflow-hidden rounded-2xl border ${a.b} ${a.bg} ${a.glow} flex items-center gap-2.5 px-3 py-2 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200`}>
                  <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
                  <span className={`grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br border ${a.chip} shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200`}>
                    <Ic k={a.ic} s={20} className={a.icc} />
                  </span>
                  <span className="text-[12px] font-bold text-white leading-tight">{a.t}</span>
                  <Ic k="chev" s={15} className={`ml-auto shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ${a.arrow}`} />
                </Link>
              ))}
            </div>
          </div>

          {/* PÓDIO MEETS & VISITAS — vitrine da produção (MOCKUP; datas de início/fim virão da área do administrador) */}
          <div className="col-span-6 lg:col-span-8 lg:row-span-2 lg:col-start-5 lg:row-start-2 al-card relative overflow-hidden p-4 al-rise al-d3 flex flex-col">
            <div className="absolute inset-x-0 top-0 gx-line-gold" />
            <div className="relative flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8C547]/30 to-[#E8C547]/[0.04] border border-[#E8C547]/40 shrink-0">
                  <Ic k="flame" s={21} className="text-[#E8C547] drop-shadow-[0_0_10px_rgba(232,197,71,0.7)]" />
                </span>
                <div className="min-w-0">
                  <h2 className="al-display text-[17px] font-bold text-white uppercase tracking-[0.14em] leading-none truncate">Meets & Visitas</h2>
                  <p className="text-[9px] text-[#E8C547]/90 font-extrabold uppercase tracking-[0.22em] mt-1">o número que converte</p>
                </div>
              </div>
              {/* Período definido na Área do administrador → Meets & Visitas */}
              <span className="gx-tag shrink-0"><span>{periodoTagMeets}</span></span>
            </div>
            <div className="relative flex items-center gap-3 flex-1 min-h-0 pt-5">
              {/* Corrida do período — raias com barra proporcional ao líder; a sua raia em carmesim */}
              {!temPeriodoMeets ? (
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 text-center py-4">
                  <p className="text-[12.5px] text-text-secondary">O período de meets & visitas ainda não foi aberto pelo gestor.</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">Área do administrador → Meets & Visitas</p>
                </div>
              ) : (
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                {[
                  ...podioMeets.map((p, i) => ({
                    nome: p.nome,
                    qtd: p.qtd,
                    pos: i + 1,
                    ring: ['from-[#FFE9A6] via-[#E8C547] to-[#8a6d13]', 'from-slate-200 via-slate-400 to-slate-600', 'from-[#f0b27a] via-[#c47a3d] to-[#7a4319]'][i],
                    bar: ['linear-gradient(90deg, #FFE9A6, #E8C547)', 'linear-gradient(90deg, #E2E8F0, #94A3B8)', 'linear-gradient(90deg, #F0B27A, #C47A3D)'][i],
                    glow: ['rgba(232,197,71,0.5)', 'rgba(148,163,184,0.4)', 'rgba(196,122,61,0.4)'][i],
                    eu: false,
                  })),
                  { nome: 'Você', qtd: meusMeets, pos: minhaPosMeets, ring: 'from-[#FF6B93] via-[#FF1E56] to-[#8B0F31]', bar: 'linear-gradient(90deg, #FF6B93, #FF1E56)', glow: 'rgba(255,30,86,0.55)', eu: true },
                ].map((l) => (
                  <div key={`${l.pos}-${l.nome}`} className={`flex items-center gap-2.5 ${l.eu ? 'rounded-lg px-2 py-1 -mx-2 bg-[#FF1E56]/[0.08] border border-[#FF1E56]/35' : ''}`}>
                    {l.eu ? (
                      <span className="w-[22px] h-[22px] grid place-items-center shrink-0"><span className="w-2.5 h-2.5 rounded-full bg-[#FF1E56] shadow-[0_0_10px_#FF1E56] animate-pulse" /></span>
                    ) : (
                      <span className={`w-[22px] h-[22px] rounded-full grid place-items-center al-display text-[10.5px] font-extrabold shrink-0 bg-gradient-to-br ${l.ring} text-[#141414]`}>{l.pos}</span>
                    )}
                    <span className={`w-16 shrink-0 truncate text-[11px] font-bold ${l.eu ? 'text-[#FF9EB5]' : 'text-white'}`} title={l.nome}>{l.nome}</span>
                    <div className="flex-1 h-[13px] rounded-full bg-white/[0.05] border border-white/[0.06] overflow-hidden min-w-0">
                      <i className="block h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(6, Math.round((l.qtd / liderMeets) * 100))}%`, background: l.bar, boxShadow: `0 0 12px ${l.glow}` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right">
                      <CountUp n={l.qtd} className={`al-display text-[16px] font-bold tabular-nums ${l.eu ? 'text-[#FF7A97]' : l.pos === 1 ? 'al-grad-text' : 'text-white/85'}`} />
                    </span>
                  </div>
                ))}
              </div>
              )}
              <div className="hidden md:block w-px self-stretch bg-gradient-to-b from-transparent via-[#E8C547]/35 to-transparent shrink-0" />
              <div className="hidden md:flex w-[210px] shrink-0 flex-col justify-center gap-1">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#E8C547] flex items-center gap-1.5 mb-0.5"><Ic k="history" s={11} /> Seu histórico</span>
                {[{ l: 'Semana passada', v: historicoMeets.semana }, { l: 'Último mês', v: historicoMeets.mes }, { l: 'Trimestre', v: historicoMeets.tri }].map((h) => (
                  <div key={h.l} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1 bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] hover:border-[#E8C547]/25 transition-colors">
                    <span className="text-[10px] font-bold text-white/70">{h.l}</span>
                    <CountUp n={h.v} className="al-display text-[16px] font-bold al-grad-text leading-none tabular-nums" />
                  </div>
                ))}
              </div>
            </div>
            <div className="relative md:hidden shrink-0 mt-2 grid grid-cols-3 gap-1.5">
              {[{ l: 'Semana', v: historicoMeets.semana }, { l: 'Mês', v: historicoMeets.mes }, { l: 'Tri', v: historicoMeets.tri }].map((h) => (
                <div key={h.l} className="flex flex-col items-center rounded-lg px-2 py-1.5 bg-white/[0.03] border border-white/[0.07]">
                  <CountUp n={h.v} className="al-display text-[17px] font-bold al-grad-text leading-none tabular-nums" />
                  <span className="text-[8.5px] font-bold text-white/60 uppercase tracking-wider mt-0.5">{h.l}</span>
                </div>
              ))}
            </div>
          </div>

      </div>



      {/* Modal do Post — conteúdo completo igual à Comunidade: autor, texto, mídia, like/repost, comentários */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowPostModal(false)}>
          <div className="relative max-w-2xl w-full mx-2 max-h-[90vh] overflow-y-auto bg-white dark:bg-[#23283A] rounded-2xl shadow-xl p-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPostModal(false)} className="absolute top-4 right-4 text-[#6B6F76] dark:text-gray-300 text-2xl z-10 hover:text-[#F45B69]">✕</button>
            
            <div className="p-4">
              {/* Cabeçalho: autor e data */}
              <div className="flex items-center gap-3 mb-3">
                <img src={selectedPost.avatar} alt={selectedPost.nome} className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shrink-0" />
                <div>
                  <div className="font-bold text-[#2E2F38] dark:text-white">{selectedPost.nome}</div>
                  <div className="text-xs text-[#6B6F76] dark:text-gray-400">
                    {selectedPost.createdAt?.toDate ? selectedPost.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
              {/* Badge de evento */}
              {selectedPost.isEvento && (
                <div className="mb-3">
                  <a
                    href={selectedPost.eventoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${({ meet: 'bg-amber-500', youtube: 'bg-red-500', instagram: 'bg-pink-500', discord: 'bg-indigo-500' } as Record<string, string>)[selectedPost.eventoTipo || ''] || 'bg-gray-500'} text-white hover:opacity-90`}
                  >
                    <span>{({ meet: '🎥', youtube: '📺', instagram: '📱', discord: '💬' } as Record<string, string>)[selectedPost.eventoTipo || ''] || '📅'}</span>
                    <span className="truncate max-w-[200px]">{selectedPost.titulo}</span>
                    <span className="opacity-90">
                      {selectedPost.eventoData?.toDate ? selectedPost.eventoData.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </a>
                </div>
              )}
              {/* Texto do post */}
              {selectedPost.texto && <p className="text-[#2E2F38] dark:text-gray-200 text-sm whitespace-pre-wrap mb-3">{selectedPost.texto}</p>}
              {selectedPost.repostOf && selectedPost.repostComment && <p className="text-xs text-gray-500 italic mb-2">Repost: {selectedPost.repostComment}</p>}
              {/* Mídia: imagem, vídeo ou YouTube */}
              {selectedPost.file && selectedPost.fileMeta && selectedPost.fileMeta.type.startsWith('image/') && (
                <div className="flex justify-center items-center mb-3">
                  <img src={selectedPost.file} alt="imagem do post" className="max-h-[50vh] rounded-xl mx-auto" />
                </div>
              )}
              {selectedPost.file && selectedPost.fileMeta && selectedPost.fileMeta.type.startsWith('video/') && (
                <div className="rounded-xl overflow-hidden bg-black mb-3">
                  <video src={selectedPost.file} controls className="w-full max-h-[50vh]" playsInline />
                </div>
              )}
              {selectedPost.youtubeData?.embedUrl && !selectedPost.file && (
                <div className="aspect-video rounded-xl overflow-hidden bg-black mb-3">
                  <iframe src={selectedPost.youtubeData.embedUrl} title="YouTube" className="w-full h-full" allowFullScreen />
                </div>
              )}
              {/* Ações: like, comentários, repost, ver quem curtiu */}
              <div className="flex items-center gap-4 pt-2 border-t border-[#E8E9F1] dark:border-[#23283A] text-sm">
                <button type="button" onClick={() => handleLike(selectedPost.id)} disabled={isLiking === selectedPost.id} className="flex items-center gap-1.5 text-[#6B6F76] dark:text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
                  {isLiking === selectedPost.id ? <span className="inline-block w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <span>{selectedPost.userLiked ? '❤️' : '🤍'}</span>}
                  <span>{selectedPost.likes ?? 0}</span>
                </button>
                <span className="flex items-center gap-1.5 text-[#6B6F76] dark:text-gray-400">💬 {selectedPost.commentsCount ?? 0}</span>
                <button type="button" onClick={() => { setRepostTarget(selectedPost); setShowPostModal(false); setRepostModalOpen(true); }} disabled={isReposting === selectedPost.id} className="flex items-center gap-1.5 text-[#6B6F76] dark:text-gray-400 hover:text-green-500 transition-colors disabled:opacity-50">
                  <span>🔁</span><span>{selectedPost.repostsCount ?? 0}</span>
                </button>
                <button type="button" onClick={() => handleShowLikes(selectedPost)} className="ml-auto text-[#D4A017] hover:underline text-xs font-medium">Ver quem curtiu</button>
              </div>
            </div>
            
            {/* Seção de comentários */}
            <div className="p-4 border-t border-[#E8E9F1] dark:border-[#23283A]">
              <h3 className="font-bold text-lg mb-2 text-[#2E2F38] dark:text-white">Comentários ({selectedPost.commentsCount || 0})</h3>
              <div className="max-h-60 overflow-y-auto space-y-3 mb-3">
                {commentsLoading ? (
                  <div className="text-center text-[#6B6F76] dark:text-gray-300 text-sm py-6">
                    <div className="text-xl mb-2">💭</div>
                    <div>Carregando comentários...</div>
                  </div>
                ) : postComments.length === 0 ? (
                  <div className="text-gray-400 text-sm">Nenhum comentário ainda.</div>
                ) : (
                  postComments.map((c) => {
                    const isCurrentUser = currentUser && c.userId === currentUser.uid;
                    const currentUserPhoto = currentUser && 'photoURL' in currentUser ? currentUser.photoURL : undefined;
                    const avatarSrc = isCurrentUser && currentUserPhoto ? currentUserPhoto : 'https://via.placeholder.com/32';
                    return (
                    <div key={c.id} className="flex items-start gap-2">
                      <img src={avatarSrc} alt={c.nome} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="font-semibold text-[#2E2F38] dark:text-white text-sm">{c.nome}</div>
                        <div className="text-[#2E2F38] dark:text-gray-200 text-sm">{c.texto}</div>
                        <div className="text-xs text-gray-400">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('pt-BR') : ''}</div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2 mt-2 relative">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  placeholder="Adicionar comentário..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleComment(selectedPost.id); }}
                />
                <button
                  className="text-[#D4A017] hover:text-[#B8860B] text-xl"
                  title="Adicionar emoji"
                  onClick={() => setShowEmojiComment((v) => !v)}
                  type="button"
                >😊</button>
                {showEmojiComment && (
                  <div className="absolute z-50 top-12 right-0">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: any) => { setCommentText((prev) => prev + emoji.native); setShowEmojiComment(false); }}
                      theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                    />
                  </div>
                )}
                <button
                  className="px-4 py-2 rounded-lg bg-[#D4A017] text-white font-bold shadow-soft hover:bg-[#B8860B] transition-colors"
                  onClick={() => handleComment(selectedPost.id)}
                  disabled={!commentText.trim()}
                >Comentar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Repost (igual à página Comunidade) */}
      {repostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => { setRepostModalOpen(false); setRepostTarget(null); setRepostComment(''); setRepostWithComment(false); }}>
          <div className="relative max-w-md w-full mx-4 bg-white dark:bg-[#23283A] rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setRepostModalOpen(false); setRepostTarget(null); setRepostComment(''); setRepostWithComment(false); }} className="absolute top-4 right-4 text-[#6B6F76] dark:text-gray-300 text-xl hover:text-[#F45B69]">✕</button>
            <h2 className="font-bold text-lg mb-4 text-[#2E2F38] dark:text-white">Repostar</h2>
            {!repostWithComment ? (
              <div className="flex flex-col gap-4">
                <button
                  className="px-4 py-2 rounded-lg bg-[#D4A017] text-white font-bold shadow-soft hover:bg-[#B8860B] transition-colors"
                  onClick={() => confirmRepost(false)}
                  disabled={!!repostTarget && isReposting === repostTarget.id}
                >Repostar direto</button>
                <button
                  className="px-4 py-2 rounded-lg bg-[#E8E9F1] text-[#2E2F38] dark:bg-[#23283A] dark:text-white font-bold shadow-soft hover:bg-[#E8C547] transition-colors"
                  onClick={() => setRepostWithComment(true)}
                  disabled={!!repostTarget && isReposting === repostTarget.id}
                >Repostar com comentário</button>
              </div>
            ) : (
              <>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white resize-none min-h-[60px]"
                  placeholder="Adicione um comentário"
                  value={repostComment}
                  onChange={e => setRepostComment(e.target.value)}
                  disabled={!!repostTarget && isReposting === repostTarget.id}
                />
                <div className="flex items-center gap-2 mt-2 relative">
                  <button type="button" className="text-[#D4A017] hover:text-[#B8860B] text-xl" title="Adicionar emoji" onClick={() => setShowEmojiRepost((v) => !v)}>😊</button>
                  {showEmojiRepost && (
                    <div className="absolute z-50 top-12 left-0">
                      <Picker data={data} onEmojiSelect={(emoji: any) => { setRepostComment((prev) => prev + emoji.native); setShowEmojiRepost(false); }} theme={typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'} />
                    </div>
                  )}
                  <button className="px-4 py-2 rounded-lg bg-[#D4A017] text-white font-bold shadow-soft hover:bg-[#B8860B] transition-colors" onClick={() => confirmRepost(true)} disabled={(!!repostTarget && isReposting === repostTarget.id) || !repostComment.trim()}>Ok</button>
                  <button className="px-4 py-2 rounded-lg bg-[#F45B69] text-white font-bold shadow-soft hover:bg-[#F45B69]/80 transition-colors" onClick={() => { setRepostWithComment(false); setRepostComment(''); setShowEmojiRepost(false); }} disabled={!!repostTarget && isReposting === repostTarget.id}>Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Notas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setIsModalOpen(false)}>
          <div className="relative max-w-3xl w-full mx-4 bg-white dark:bg-[#23283A] rounded-2xl shadow-xl p-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-[#6B6F76] dark:text-gray-300 text-2xl z-10 hover:text-[#F45B69]">✕</button>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <NotesIcon className="h-8 w-8 text-[#D4A017]" />
                <div>
                  <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Todas as Notas</h2>
                  <p className="text-[#6B6F76] dark:text-gray-300">Suas notas e lembretes</p>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-3">
                {notes.length === 0 ? (
                  <div className="text-center py-8">
                    <NotesIcon className="h-12 w-12 text-[#D4A017] mx-auto mb-3 opacity-50" />
                    <p className="text-[#6B6F76] dark:text-gray-300">Nenhuma nota criada ainda</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">{getPriorityIcon(note.prioridade)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(note.prioridade)}`}>
                              {note.prioridade}
                            </span>
                            <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                              {note.criadoEm.toDate().toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="text-sm text-[#2E2F38] dark:text-white leading-relaxed mb-2">
                            {note.texto}
                          </div>
                          {note.dataHora && (
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-[#D4A017]" />
                              <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                                Agendado: {new Date(note.dataHora).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avisos Importantes */}
      <AvisosImportantesModal
        isOpen={showAvisosModal}
        onClose={() => setShowAvisosModal(false)}
        avisos={avisosImportantes}
      />

      {/* Modal de Agenda Imobiliária */}
      <AgendaImobiliariaModal
        isOpen={showAgendaModal}
        onClose={() => setShowAgendaModal(false)}
        agenda={agendaImobiliaria}
      />

      {/* Modal de Plantões */}
      <PlantoesModal
        isOpen={showPlantoesModal}
        onClose={() => setShowPlantoesModal(false)}
        plantoes={plantoes}
      />

      {/* Modal de Likes */}
      {showLikesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowLikesModal(false)}>
          <div className="relative max-w-md w-full mx-4 bg-white dark:bg-[#23283A] rounded-2xl shadow-xl p-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowLikesModal(false)} className="absolute top-4 right-4 text-[#6B6F76] dark:text-gray-300 text-2xl z-10 hover:text-[#F45B69]">✕</button>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">❤️</span>
                <div>
                  <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Quem curtiu</h2>
                  <p className="text-[#6B6F76] dark:text-gray-300">
                    {selectedPostForLikes?.nome} • {postLikes.length} curtida{postLikes.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {loadingLikes ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A017]"></div>
                  </div>
                ) : postLikes.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-3 block">🤍</span>
                    <p className="text-[#6B6F76] dark:text-gray-300">Ninguém curtiu ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {postLikes.map((like) => (
                      <div
                        key={like.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                      >
                        <div className="w-10 h-10 bg-gradient-to-r from-[#D4A017] to-[#E8C547] rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {like.userName ? like.userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#2E2F38] dark:text-white text-sm truncate">
                            {like.userName || 'Usuário'}
                          </div>
                          <div className="text-xs text-[#6B6F76] dark:text-gray-300">
                            {like.timestamp?.toDate ? 
                              like.timestamp.toDate().toLocaleString('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : 'Agora'
                            }
                          </div>
                        </div>
                        <span className="text-red-500 text-lg">❤️</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão Voltar ao Topo */}
      {showScrollToTop && (
        <button
          onClick={scrollToTrendingTop}
          className="fixed bottom-6 right-6 bg-[#D4A017] hover:bg-[#B8860B] text-white font-bold py-3 px-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-40"
          title="Voltar ao topo do Trending"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}


    </div>
  );
}