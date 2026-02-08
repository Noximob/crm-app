'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, doc, onSnapshot } from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';

type PeriodKey = 'hoje' | 'semana' | 'mes' | 'custom';

interface LeadRaw {
  id: string;
  userId?: string;
  imobiliariaId?: string;
  nome?: string;
  etapa?: string;
  origem?: string;
  origemTipo?: string;
  createdAt?: any;
  [key: string]: any;
}

interface Corretor {
  id: string;
  nome: string;
  email?: string;
  tipoConta?: string;
}

interface MetaDoc {
  inicio?: string;
  fim?: string;
  valor?: number;
  alcancado?: number;
  percentual?: number;
  updatedBy?: string;
  updatedByNome?: string;
}

interface AvisoDestaque {
  id: string;
  titulo: string;
  mensagem: string;
  dataInicio?: any;
  dataFim?: any;
}

// --- Helpers de data ---
function getPeriodBounds(period: PeriodKey, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);

  if (period === 'hoje') {
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === 'semana') {
    // Esta semana = segunda-feira 00:00 até hoje (dia da semana: 0=dom, 1=seg, ...)
    const diaSemana = start.getDay();
    const diasParaSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
    start.setDate(start.getDate() - diasParaSegunda);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === 'mes') {
    // Este mês = dia 1 do mês atual 00:00 até hoje
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === 'custom' && customStart && customEnd) {
    return {
      start: new Date(customStart + 'T00:00:00'),
      end: new Date(customEnd + 'T23:59:59'),
    };
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function getPreviousPeriodBounds(period: PeriodKey, currentStart: Date, currentEnd: Date): { start: Date; end: Date } {
  const msPeriod = currentEnd.getTime() - currentStart.getTime();
  const end = new Date(currentStart.getTime() - 1);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end.getTime() - msPeriod);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function leadCreatedAt(lead: LeadRaw): Date | null {
  const t = lead.createdAt;
  if (t == null) return null;
  if (typeof t?.toDate === 'function') return t.toDate();
  if (typeof t?.seconds === 'number') return new Date(t.seconds * 1000);
  if (typeof t === 'string') return new Date(t);
  if (typeof t === 'number') return new Date(t);
  return null;
}

function isInPeriod(date: Date | null, start: Date, end: Date): boolean {
  if (!date) return false;
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

// --- Ícones ---
const ChartIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
);
const UsersIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
);
const TrophyIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
);
const TargetIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
);
const TrendUpIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
);
const TrendDownIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"/></svg>
);
const MegaphoneIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
);
const AlertTriangleIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
);

const ETAPAS_QUENTES = ['Negociação e Proposta', 'Contrato e fechamento', 'Pós Venda e Fidelização'];
const ETAPAS_QUALIFICACAO_SEM_REUNIAO = ['Pré Qualificação', 'Qualificação', 'Apresentação do imóvel'];
const ETAPAS_LIGACAO_OU_VISITA = ['Ligação agendada', 'Visita agendada'];

export default function RelatoriosAdminPage() {
  const { userData } = useAuth();
  const [leads, setLeads] = useState<LeadRaw[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [meta, setMeta] = useState<MetaDoc | null>(null);
  const [avisos, setAvisos] = useState<AvisoDestaque[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [corretorFilter, setCorretorFilter] = useState<string>('');

  const imobiliariaId = userData?.imobiliariaId;

  // Tempo real: leads, corretores e metas atualizam sozinhos
  useEffect(() => {
    if (!imobiliariaId) {
      setLoading(false);
      return;
    }

    let resolved = 0;
    const maybeDone = () => {
      resolved++;
      if (resolved >= 4) setLoading(false);
    };

    const unsubLeads = onSnapshot(
      query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId)),
      (snap) => {
        setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeadRaw)));
        maybeDone();
      },
      (e) => {
        console.error(e);
        maybeDone();
      }
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'usuarios'), where('imobiliariaId', '==', imobiliariaId), where('aprovado', '==', true)),
      (snap) => {
        setCorretores(snap.docs.map(d => {
          const data = d.data() as any;
          return { id: d.id, nome: data.nome || 'Sem nome', email: data.email, tipoConta: data.tipoConta };
        }));
        maybeDone();
      },
      (e) => {
        console.error(e);
        maybeDone();
      }
    );

    const unsubMeta = onSnapshot(
      doc(db, 'metas', imobiliariaId),
      (snap) => {
        setMeta(snap.exists() ? (snap.data() as MetaDoc) : null);
        maybeDone();
      },
      (e) => {
        console.error(e);
        maybeDone();
      }
    );

    const unsubAvisos = onSnapshot(
      query(collection(db, 'avisosImportantes'), where('imobiliariaId', '==', imobiliariaId)),
      (snap) => {
        setAvisos(snap.docs.map(d => ({ id: d.id, ...d.data() } as AvisoDestaque)));
        maybeDone();
      },
      (e) => {
        console.error(e);
        maybeDone();
      }
    );

    return () => {
      unsubLeads();
      unsubUsers();
      unsubMeta();
      unsubAvisos();
    };
  }, [imobiliariaId]);

  const { start, end } = useMemo(() => getPeriodBounds(period, customStart, customEnd), [period, customStart, customEnd]);

  const filteredLeads = useMemo(() => {
    let list = leads;
    if (corretorFilter) list = list.filter(l => l.userId === corretorFilter);
    return list;
  }, [leads, corretorFilter]);

  const leadsNoPeriodo = useMemo(() => {
    return filteredLeads.filter(l => isInPeriod(leadCreatedAt(l), start, end));
  }, [filteredLeads, start, end]);

  // Novos no período em nível corporativo (sempre todos os leads) — para ranking verdadeiro
  const leadsNoPeriodoCorporativo = useMemo(() => {
    return leads.filter(l => isInPeriod(leadCreatedAt(l), start, end));
  }, [leads, start, end]);

  const porEtapa = useMemo(() => {
    const map: Record<string, number> = {};
    PIPELINE_STAGES.forEach(e => { map[e] = 0; });
    filteredLeads.forEach(l => {
      const etapa = l.etapa && PIPELINE_STAGES.includes(l.etapa) ? l.etapa : PIPELINE_STAGES[0];
      map[etapa] = (map[etapa] || 0) + 1;
    });
    return map;
  }, [filteredLeads]);

  const porOrigem = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const o = l.origem || l.origemTipo || 'Não informado';
      map[o] = (map[o] || 0) + 1;
    });
    return map;
  }, [filteredLeads]);

  // Ranking sempre corporativo: quem mais trouxe novos leads no período (não muda com filtro de corretor)
  const ranking = useMemo(() => {
    const byUser: Record<string, number> = {};
    leadsNoPeriodoCorporativo.forEach(l => {
      const uid = l.userId || '_sem_corretor_';
      byUser[uid] = (byUser[uid] || 0) + 1;
    });
    return Object.entries(byUser)
      .map(([userId, count]) => ({
        userId,
        count,
        nome: userId === '_sem_corretor_' ? 'Sem corretor' : (corretores.find(c => c.id === userId)?.nome || 'Não identificado'),
      }))
      .sort((a, b) => b.count - a.count);
  }, [leadsNoPeriodoCorporativo, corretores]);

  const totaisCards = useMemo(() => {
    const quentes = filteredLeads.filter(l => ETAPAS_QUENTES.includes(l.etapa || ''));
    const corretoresComLead = new Set(filteredLeads.map(l => l.userId).filter(Boolean)).size;
    return {
      totalLeads: filteredLeads.length,
      novosNoPeriodo: leadsNoPeriodo.length,
      leadsQuentes: quentes.length,
      corretoresAtivos: corretoresComLead,
    };
  }, [filteredLeads, leadsNoPeriodo]);

  // Tabela por corretor (sempre visão corporativa): corretores + linha "Sem corretor" para soma bater
  const tabelaPorCorretor = useMemo(() => {
    const corretorIds = new Set(corretores.map(c => c.id));
    const rows = corretores.map(c => {
      const leadsDoCorretor = leads.filter(l => l.userId === c.id);
      const novos = leadsDoCorretor.filter(l => isInPeriod(leadCreatedAt(l), start, end));
      const quentes = leadsDoCorretor.filter(l => ETAPAS_QUENTES.includes(l.etapa || ''));
      const porOrigemLocal: Record<string, number> = {};
      leadsDoCorretor.forEach(l => {
        const o = l.origem || l.origemTipo || 'Não informado';
        porOrigemLocal[o] = (porOrigemLocal[o] || 0) + 1;
      });
      const principalOrigem = Object.entries(porOrigemLocal).sort((a, b) => b[1] - a[1])[0]?.[0] || '–';
      return {
        ...c,
        totalLeads: leadsDoCorretor.length,
        novosNoPeriodo: novos.length,
        leadsQuentes: quentes.length,
        principalOrigem,
      };
    });
    const leadsSemCorretor = leads.filter(l => !l.userId || !corretorIds.has(l.userId));
    if (leadsSemCorretor.length > 0) {
      const novos = leadsSemCorretor.filter(l => isInPeriod(leadCreatedAt(l), start, end));
      const quentes = leadsSemCorretor.filter(l => ETAPAS_QUENTES.includes(l.etapa || ''));
      const porOrigemLocal: Record<string, number> = {};
      leadsSemCorretor.forEach(l => {
        const o = l.origem || l.origemTipo || 'Não informado';
        porOrigemLocal[o] = (porOrigemLocal[o] || 0) + 1;
      });
      const principalOrigem = Object.entries(porOrigemLocal).sort((a, b) => b[1] - a[1])[0]?.[0] || '–';
      rows.push({
        id: '_sem_corretor_',
        nome: 'Sem corretor / Não identificado',
        totalLeads: leadsSemCorretor.length,
        novosNoPeriodo: novos.length,
        leadsQuentes: quentes.length,
        principalOrigem,
      });
    }
    return rows.sort((a, b) => b.totalLeads - a.totalLeads);
  }, [corretores, leads, start, end]);

  const { start: startAnt, end: endAnt } = useMemo(() => getPreviousPeriodBounds(period, start, end), [period, start, end]);

  const novosNoPeriodoAnterior = useMemo(() => leads.filter(l => isInPeriod(leadCreatedAt(l), startAnt, endAnt)).length, [leads, startAnt, endAnt]);

  const comparativoNovos = useMemo(() => {
    const atual = leadsNoPeriodoCorporativo.length;
    if (novosNoPeriodoAnterior === 0) return atual > 0 ? { diff: 100, label: '+' } : { diff: 0, label: null };
    const diff = Math.round(((atual - novosNoPeriodoAnterior) / novosNoPeriodoAnterior) * 100);
    return { diff, label: diff >= 0 ? '+' : '' };
  }, [leadsNoPeriodoCorporativo.length, novosNoPeriodoAnterior]);

  const destaquePeriodo = useMemo(() => {
    const first = ranking[0];
    if (!first || first.userId === '_sem_corretor_') return null;
    return { nome: first.nome, count: first.count };
  }, [ranking]);

  const fraseResumo = useMemo(() => {
    const total = filteredLeads.length;
    const novos = leadsNoPeriodo.length;
    const quentes = filteredLeads.filter(l => ETAPAS_QUENTES.includes(l.etapa || '')).length;
    const ativos = new Set(filteredLeads.map(l => l.userId).filter(Boolean)).size;
    return `Neste período: ${total} leads no funil, ${novos} novos, ${quentes} em negociação e ${ativos} corretores ativos.`;
  }, [filteredLeads, leadsNoPeriodo, start, end]);

  const origemQueConverte = useMemo(() => {
    const quentes = filteredLeads.filter(l => ETAPAS_QUENTES.includes(l.etapa || ''));
    const porOrigem: Record<string, number> = {};
    quentes.forEach(l => {
      const o = l.origem || l.origemTipo || 'Não informado';
      porOrigem[o] = (porOrigem[o] || 0) + 1;
    });
    const ent = Object.entries(porOrigem).sort((a, b) => b[1] - a[1])[0];
    return ent ? { origem: ent[0], count: ent[1] } : null;
  }, [filteredLeads]);

  const avisoEmDestaque = useMemo(() => {
    const tNow = Date.now();
    const vigentes = avisos.filter(a => {
      const ini = a.dataInicio?.toDate?.() ?? a.dataInicio;
      const fim = a.dataFim?.toDate?.() ?? a.dataFim;
      if (ini && fim) return new Date(ini).getTime() <= tNow && tNow <= new Date(fim).getTime();
      return true;
    });
    return vigentes.length > 0 ? vigentes[vigentes.length - 1] : null;
  }, [avisos]);

  // Alerta de atenção: avanço do funil, follow-up, qualificados sem ligação/reunião
  const alertaAtencao = useMemo(() => {
    const emQualificacaoSemReuniao = filteredLeads.filter(l => ETAPAS_QUALIFICACAO_SEM_REUNIAO.includes(l.etapa || ''));
    const novosAindaEmQualificacao = leadsNoPeriodo.filter(l => ETAPAS_QUALIFICACAO_SEM_REUNIAO.includes(l.etapa || ''));
    const comLigacaoOuVisita = filteredLeads.filter(l => ETAPAS_LIGACAO_OU_VISITA.includes(l.etapa || ''));
    const total = filteredLeads.length || 1;
    const quentes = filteredLeads.filter(l => ETAPAS_QUENTES.includes(l.etapa || '')).length;
    const pctQuentes = Math.round((quentes / total) * 100);
    return {
      totalEmQualificacaoSemReuniao: emQualificacaoSemReuniao.length,
      novosAindaEmQualificacao: novosAindaEmQualificacao.length,
      comLigacaoOuVisita: comLigacaoOuVisita.length,
      pctEmEtapasQuentes: pctQuentes,
      totalLeads: filteredLeads.length,
    };
  }, [filteredLeads, leadsNoPeriodo]);

  if (!imobiliariaId) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4 flex items-center justify-center">
        <p className="text-[#6B6F76] dark:text-gray-300">Acesso restrito à imobiliária.</p>
      </div>
    );
  }

  const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#2E2F38] dark:text-white">Relatórios</h1>
            <p className="text-base text-[#6B6F76] dark:text-gray-300 mt-1">Storytelling por corretor · Atualização em tempo real · Pronto para TV</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as PeriodKey)}
              className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white text-sm"
            >
              <option value="hoje">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
              <option value="custom">Personalizado</option>
            </select>
            {period === 'custom' && (
              <>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3 py-2 rounded-lg border bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white text-sm" />
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-3 py-2 rounded-lg border bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white text-sm" />
              </>
            )}
            <select
              value={corretorFilter}
              onChange={e => setCorretorFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white text-sm"
            >
              <option value="">Todos os corretores</option>
              {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#3478F6] border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <p className="text-base text-[#6B6F76] dark:text-gray-400">
                Período: {formatDate(start)} até {formatDate(end)}
              </p>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-base font-medium ${corretorFilter ? 'bg-[#A3C8F7]/30 text-[#3478F6]' : 'bg-[#3478F6]/20 text-[#3478F6]'}`}>
                {corretorFilter ? `Visão individual: ${corretores.find(c => c.id === corretorFilter)?.nome || 'Corretor'}` : 'Visão corporativa'}
              </span>
            </div>

            {/* Alerta de atenção: avanço do funil, follow-up, qualificados sem ligação/reunião */}
            <div className="mb-8 p-6 md:p-8 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-500/40">
              <h2 className="text-xl font-bold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-3">
                <AlertTriangleIcon className="w-7 h-7 shrink-0" />
                Alerta de atenção
              </h2>
              <p className="text-sm text-[#6B6F76] dark:text-gray-400 mb-5">Acompanhamento do avanço do funil e leads que precisam de follow-up.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/80 dark:bg-[#23283A]/80 rounded-xl p-4 border border-amber-500/20">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">Novos no período sem avanço</p>
                  <p className="text-2xl md:text-3xl font-bold text-[#2E2F38] dark:text-white tabular-nums">{alertaAtencao.novosAindaEmQualificacao}</p>
                  <p className="text-xs text-[#6B6F76] dark:text-gray-400 mt-1">leads criados no período que ainda não foram para ligação ou reunião</p>
                </div>
                <div className="bg-white/80 dark:bg-[#23283A]/80 rounded-xl p-4 border border-amber-500/20">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">Em qualificação (sem reunião agendada)</p>
                  <p className="text-2xl md:text-3xl font-bold text-[#2E2F38] dark:text-white tabular-nums">{alertaAtencao.totalEmQualificacaoSemReuniao}</p>
                  <p className="text-xs text-[#6B6F76] dark:text-gray-400 mt-1">pré-qualificação, qualificação ou apresentação — podem precisar de follow-up</p>
                </div>
                <div className="bg-white/80 dark:bg-[#23283A]/80 rounded-xl p-4 border border-[#3AC17C]/30">
                  <p className="text-sm font-semibold text-[#3AC17C] mb-1">Com ligação ou visita agendada</p>
                  <p className="text-2xl md:text-3xl font-bold text-[#2E2F38] dark:text-white tabular-nums">{alertaAtencao.comLigacaoOuVisita}</p>
                  <p className="text-xs text-[#6B6F76] dark:text-gray-400 mt-1">leads em ação agendada</p>
                </div>
                <div className="bg-white/80 dark:bg-[#23283A]/80 rounded-xl p-4 border border-[#3478F6]/30">
                  <p className="text-sm font-semibold text-[#3478F6] mb-1">Concentração em negociação/contrato</p>
                  <p className="text-2xl md:text-3xl font-bold text-[#2E2F38] dark:text-white tabular-nums">{alertaAtencao.pctEmEtapasQuentes}%</p>
                  <p className="text-xs text-[#6B6F76] dark:text-gray-400 mt-1">do funil em etapas quentes — acompanhe o avanço</p>
                </div>
              </div>
            </div>

            {/* Resumo em uma linha (dados detalhados nos cards abaixo) */}
            <div className="mb-8 p-4 rounded-xl bg-[#F5F6FA] dark:bg-[#23283A]/50 border border-[#E8E9F1] dark:border-[#23283A]">
              <p className="text-base text-[#2E2F38] dark:text-gray-200">{fraseResumo}</p>
            </div>

            {/* Destaque + Origem que converte — cards grandes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {destaquePeriodo && (
                <div className="p-6 md:p-8 rounded-2xl bg-amber-500/15 dark:bg-amber-500/25 border-2 border-amber-500/40">
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Destaque do período</p>
                  <p className="text-2xl md:text-3xl font-bold text-[#2E2F38] dark:text-white mt-2">{destaquePeriodo.nome}</p>
                  <p className="text-xl font-semibold text-amber-600 dark:text-amber-400 mt-1">{destaquePeriodo.count} novos leads</p>
                </div>
              )}
              {origemQueConverte && (
                <div className="p-6 md:p-8 rounded-2xl bg-[#3AC17C]/15 dark:bg-[#3AC17C]/25 border-2 border-[#3AC17C]/40">
                  <p className="text-sm font-bold text-[#3AC17C] uppercase tracking-wider">Origem que mais converte</p>
                  <p className="text-2xl md:text-3xl font-bold text-[#2E2F38] dark:text-white mt-2">{origemQueConverte.origem}</p>
                  <p className="text-xl font-semibold text-[#3AC17C] mt-1">{origemQueConverte.count} em negociação</p>
                </div>
              )}
            </div>

            {/* Aviso em destaque — maior */}
            {avisoEmDestaque && (
              <div className="mb-8 p-6 rounded-2xl bg-[#3478F6]/15 dark:bg-[#3478F6]/25 border-2 border-[#3478F6]/40 flex items-start gap-4">
                <MegaphoneIcon className="w-8 h-8 text-[#3478F6] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#3478F6] uppercase tracking-wider">Aviso em destaque</p>
                  <p className="text-xl font-bold text-[#2E2F38] dark:text-white mt-1">{avisoEmDestaque.titulo}</p>
                  <p className="text-base text-[#6B6F76] dark:text-gray-300 mt-2 line-clamp-2">{avisoEmDestaque.mensagem}</p>
                </div>
              </div>
            )}

            {/* Cards macro — números grandes para TV */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white dark:bg-[#23283A] rounded-2xl border-2 border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#3478F6]/10 text-[#3478F6]"><ChartIcon className="w-7 h-7" /></div>
                  <div>
                    <p className="text-base text-[#6B6F76] dark:text-gray-400 font-medium">Total de leads</p>
                    <p className="text-4xl md:text-5xl font-bold text-[#2E2F38] dark:text-white tabular-nums">{totaisCards.totalLeads}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-2xl border-2 border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#3AC17C]/10 text-[#3AC17C]"><ChartIcon className="w-7 h-7" /></div>
                  <div className="min-w-0">
                    <p className="text-base text-[#6B6F76] dark:text-gray-400 font-medium">Novos no período</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-4xl md:text-5xl font-bold text-[#2E2F38] dark:text-white tabular-nums">{totaisCards.novosNoPeriodo}</p>
                      {period !== 'custom' && !corretorFilter && comparativoNovos.label != null && (
                        <span className={`inline-flex items-center gap-1 text-sm font-bold ${comparativoNovos.diff >= 0 ? 'text-[#3AC17C]' : 'text-red-500'}`}>
                          {comparativoNovos.diff >= 0 ? <TrendUpIcon className="w-5 h-5" /> : <TrendDownIcon className="w-5 h-5" />}
                          {comparativoNovos.label}{comparativoNovos.diff}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-2xl border-2 border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500"><TargetIcon className="w-7 h-7" /></div>
                  <div>
                    <p className="text-base text-[#6B6F76] dark:text-gray-400 font-medium">Leads quentes</p>
                    <p className="text-4xl md:text-5xl font-bold text-[#2E2F38] dark:text-white tabular-nums">{totaisCards.leadsQuentes}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-2xl border-2 border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400"><UsersIcon className="w-7 h-7" /></div>
                  <div>
                    <p className="text-base text-[#6B6F76] dark:text-gray-400 font-medium">Corretores ativos</p>
                    <p className="text-4xl md:text-5xl font-bold text-[#2E2F38] dark:text-white tabular-nums">{totaisCards.corretoresAtivos}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ranking + Funil — tamanho TV */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <div className="bg-white dark:bg-[#23283A] rounded-2xl border-2 border-[#E8E9F1] dark:border-[#23283A] p-6 md:p-8 shadow-md">
                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-2 flex items-center gap-3">
                  <TrophyIcon className="w-7 h-7 text-amber-500" />
                  Ranking (novos leads no período)
                </h2>
                <p className="text-sm text-[#6B6F76] dark:text-gray-400 mb-5">Sempre visão corporativa.</p>
                <div className="space-y-3">
                  {ranking.slice(0, 10).map((r, i) => (
                    <div key={r.userId} className={`flex items-center justify-between py-3 px-4 rounded-xl ${i < 3 ? 'bg-[#3478F6]/10 dark:bg-[#3478F6]/20' : 'bg-[#F5F6FA] dark:bg-[#181C23]'}`}>
                      <span className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-[#3478F6] text-white'}`}>{i + 1}</span>
                        <span className="text-base md:text-lg font-medium text-[#2E2F38] dark:text-white">{r.nome}</span>
                      </span>
                      <span className="text-xl font-bold text-[#3478F6] tabular-nums">{r.count}</span>
                    </div>
                  ))}
                  {ranking.length === 0 && <p className="text-[#6B6F76] dark:text-gray-400 text-base py-4">Nenhum lead novo no período.</p>}
                </div>
              </div>

              <div className="bg-white dark:bg-[#23283A] rounded-2xl border-2 border-[#E8E9F1] dark:border-[#23283A] p-6 md:p-8 shadow-md">
                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-5 flex items-center gap-3">
                  <ChartIcon className="w-7 h-7 text-[#3478F6]" />
                  Funil de vendas {corretorFilter && <span className="text-base font-normal text-[#6B6F76] dark:text-gray-400">(individual)</span>}
                </h2>
                <div className="space-y-4">
                  {PIPELINE_STAGES.map((etapa) => {
                    const qtd = porEtapa[etapa] ?? 0;
                    const max = Math.max(...Object.values(porEtapa), 1);
                    const pct = max ? Math.round((qtd / max) * 100) : 0;
                    return (
                      <div key={etapa}>
                        <div className="flex justify-between text-base mb-1.5">
                          <span className="text-[#2E2F38] dark:text-gray-200 truncate pr-3">{etapa}</span>
                          <span className="font-bold text-[#3478F6] text-lg tabular-nums shrink-0">{qtd}</span>
                        </div>
                        <div className="h-3 bg-[#E8E9F1] dark:bg-[#181C23] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#3478F6] to-[#A3C8F7] rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tabela por corretor — centro do storytelling, legível na TV */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl border-2 border-[#E8E9F1] dark:border-[#23283A] p-6 md:p-8 shadow-md mb-10 overflow-x-auto">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-2 flex items-center gap-3">
                <UsersIcon className="w-7 h-7 text-[#3478F6]" />
                Por corretor (visão corporativa)
              </h2>
              <p className="text-base text-[#6B6F76] dark:text-gray-400 mb-6">
                Entenda cada corretor: totais, novos no período, quentes e principal origem.
              </p>
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b-2 border-[#E8E9F1] dark:border-[#23283A] text-left text-[#6B6F76] dark:text-gray-400">
                    <th className="py-4 px-3 font-bold">#</th>
                    <th className="py-4 px-3 font-bold">Corretor</th>
                    <th className="py-4 px-3 font-bold">Tipo</th>
                    <th className="py-4 px-3 font-bold text-center">Total</th>
                    <th className="py-4 px-3 font-bold text-center">Novos</th>
                    <th className="py-4 px-3 font-bold text-center">Quentes</th>
                    <th className="py-4 px-3 font-bold">Principal origem</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaPorCorretor.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b border-[#E8E9F1] dark:border-[#23283A] ${corretorFilter === row.id ? 'bg-[#3478F6]/10 dark:bg-[#3478F6]/20' : ''}`}
                    >
                      <td className="py-4 px-3 text-[#6B6F76] dark:text-gray-400 font-medium">{i + 1}</td>
                      <td className="py-4 px-3 font-semibold text-[#2E2F38] dark:text-white">
                        {row.nome}
                        {row.email && <span className="block text-sm text-[#6B6F76] dark:text-gray-400 font-normal">{row.email}</span>}
                      </td>
                      <td className="py-4 px-3 text-[#6B6F76] dark:text-gray-400">{row.tipoConta === 'imobiliaria' ? 'Imobiliária' : row.tipoConta === 'corretor-vinculado' ? 'Vinculado' : row.tipoConta === 'corretor-autonomo' ? 'Autônomo' : row.tipoConta || '–'}</td>
                      <td className="py-4 px-3 text-center font-bold text-[#3478F6] text-lg tabular-nums">{row.totalLeads}</td>
                      <td className="py-4 px-3 text-center font-bold text-[#3AC17C] text-lg tabular-nums">{row.novosNoPeriodo}</td>
                      <td className="py-4 px-3 text-center font-bold text-amber-500 text-lg tabular-nums">{row.leadsQuentes}</td>
                      <td className="py-4 px-3 text-[#2E2F38] dark:text-gray-200">{row.principalOrigem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tabelaPorCorretor.length === 0 && (
                <p className="text-[#6B6F76] dark:text-gray-400 text-base py-6">Nenhum corretor aprovado na imobiliária.</p>
              )}
            </div>

            {/* Metas (corporativo) + Por origem (secundário) — tamanho TV */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <div className="bg-white dark:bg-[#23283A] rounded-2xl border-2 border-[#E8E9F1] dark:border-[#23283A] p-6 md:p-8 shadow-md">
                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-5 flex items-center gap-3">
                  <TargetIcon className="w-7 h-7 text-[#3478F6]" />
                  Metas (corporativo)
                </h2>
                {meta ? (
                  <div className="space-y-5">
                    {(meta.inicio || meta.fim) && (
                      <p className="text-base text-[#6B6F76] dark:text-gray-400">
                        Período: {meta.inicio ? formatDate(new Date(meta.inicio)) : '–'} a {meta.fim ? formatDate(new Date(meta.fim)) : '–'}
                      </p>
                    )}
                    {meta.updatedByNome && (
                      <p className="text-sm text-[#6B6F76] dark:text-gray-400">
                        Última atualização por: <span className="font-medium text-[#2E2F38] dark:text-gray-200">{meta.updatedByNome}</span>
                      </p>
                    )}
                    <div className="flex justify-between text-base">
                      <span className="font-medium">VGV meta</span>
                      <span className="font-bold text-lg">R$ {meta.valor != null ? meta.valor.toLocaleString('pt-BR') : '–'}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="font-medium">VGV realizado</span>
                      <span className="font-bold text-lg text-[#3AC17C]">R$ {meta.alcancado != null ? meta.alcancado.toLocaleString('pt-BR') : '–'}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-base mb-2">
                        <span className="font-medium">% alcançado</span>
                        <span className="text-2xl font-bold text-[#3478F6] tabular-nums">{meta.percentual ?? 0}%</span>
                      </div>
                      <div className="h-4 bg-[#E8E9F1] dark:bg-[#181C23] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${(meta.percentual ?? 0) >= 100 ? 'bg-[#3AC17C]' : 'bg-[#3478F6]'}`}
                          style={{ width: `${Math.min(meta.percentual ?? 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#6B6F76] dark:text-gray-400 text-base">Configure a meta em Admin → Metas.</p>
                )}
              </div>

              <div className="bg-[#F5F6FA] dark:bg-[#181C23] rounded-2xl border-2 border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-md">
                <h3 className="text-base font-bold text-[#6B6F76] dark:text-gray-400 mb-4">Por origem do lead {corretorFilter && <span className="font-normal">(individual)</span>}</h3>
                <div className="space-y-2 text-base">
                  {Object.entries(porOrigem)
                    .sort((a, b) => b[1] - a[1])
                    .map(([origem, qtd]) => {
                      const total = filteredLeads.length || 1;
                      const pct = Math.round((qtd / total) * 100);
                      return (
                        <div key={origem} className="flex justify-between items-center py-2">
                          <span className="text-[#2E2F38] dark:text-gray-200 truncate pr-3">{origem}</span>
                          <span className="font-semibold text-[#3478F6] tabular-nums shrink-0">{qtd} ({pct}%)</span>
                        </div>
                      );
                    })}
                  {Object.keys(porOrigem).length === 0 && (
                    <p className="text-[#6B6F76] dark:text-gray-400">Nenhum lead no filtro.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#3478F6]/15 dark:bg-[#3478F6]/25 border-2 border-[#3478F6]/40 rounded-2xl p-6 text-center">
              <p className="text-[#2E2F38] dark:text-white text-base md:text-lg">
                <strong>Próximo passo:</strong> use <strong>Dashboards TV</strong> (Admin) para montar as telas que rodam na TV e definir o tempo de cada uma.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
