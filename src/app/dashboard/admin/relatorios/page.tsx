'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
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
}

// --- Helpers de data ---
function getPeriodBounds(period: PeriodKey, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  if (period === 'hoje') {
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === 'semana') {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (period === 'mes') {
    start.setMonth(start.getMonth() - 1);
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

function leadCreatedAt(lead: LeadRaw): Date | null {
  const t = lead.createdAt;
  if (!t) return null;
  if (t?.toDate) return t.toDate();
  if (t?.seconds) return new Date(t.seconds * 1000);
  if (typeof t === 'string') return new Date(t);
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

const ETAPAS_QUENTES = ['Negociação e Proposta', 'Contrato e fechamento', 'Pós Venda e Fidelização'];

export default function RelatoriosAdminPage() {
  const { userData } = useAuth();
  const [leads, setLeads] = useState<LeadRaw[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [meta, setMeta] = useState<MetaDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [corretorFilter, setCorretorFilter] = useState<string>('');

  const imobiliariaId = userData?.imobiliariaId;

  useEffect(() => {
    if (!imobiliariaId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [leadsSnap, usersSnap, metaSnap] = await Promise.all([
          getDocs(query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId))),
          getDocs(query(collection(db, 'usuarios'), where('imobiliariaId', '==', imobiliariaId), where('aprovado', '==', true))),
          getDoc(doc(db, 'metas', imobiliariaId)),
        ]);

        setLeads(leadsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LeadRaw)));
        setCorretores(usersSnap.docs.map(d => {
          const data = d.data() as any;
          return { id: d.id, nome: data.nome || 'Sem nome', email: data.email, tipoConta: data.tipoConta };
        }));
        setMeta(metaSnap.exists() ? (metaSnap.data() as MetaDoc) : null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
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

  const ranking = useMemo(() => {
    const byUser: Record<string, number> = {};
    leadsNoPeriodo.forEach(l => {
      const uid = l.userId || '';
      byUser[uid] = (byUser[uid] || 0) + 1;
    });
    return Object.entries(byUser)
      .map(([userId, count]) => ({ userId, count, nome: corretores.find(c => c.id === userId)?.nome || 'Corretor' }))
      .sort((a, b) => b.count - a.count);
  }, [leadsNoPeriodo, corretores]);

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

  // Tabela por corretor (sempre visão corporativa: todos os corretores com métricas reais)
  const tabelaPorCorretor = useMemo(() => {
    return corretores.map(c => {
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
    }).sort((a, b) => b.totalLeads - a.totalLeads);
  }, [corretores, leads, start, end]);

  if (!imobiliariaId) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4 flex items-center justify-center">
        <p className="text-[#6B6F76] dark:text-gray-300">Acesso restrito à imobiliária.</p>
      </div>
    );
  }

  const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2E2F38] dark:text-white">Relatórios</h1>
            <p className="text-[#6B6F76] dark:text-gray-300 mt-1">Visão macro para dashboards e TV</p>
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
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#3478F6] border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <p className="text-sm text-[#6B6F76] dark:text-gray-400">
                Período: {formatDate(start)} até {formatDate(end)}
              </p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${corretorFilter ? 'bg-[#A3C8F7]/30 text-[#3478F6]' : 'bg-[#3478F6]/20 text-[#3478F6]'}`}>
                {corretorFilter ? `Visão individual: ${corretores.find(c => c.id === corretorFilter)?.nome || 'Corretor'}` : 'Visão corporativa'}
              </span>
            </div>

            {/* Cards macro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#3478F6]/10 text-[#3478F6]"><ChartIcon className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-400">Total de leads</p>
                    <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{totaisCards.totalLeads}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#3AC17C]/10 text-[#3AC17C]"><ChartIcon className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-400">Novos no período</p>
                    <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{totaisCards.novosNoPeriodo}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><TargetIcon className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-400">Leads quentes</p>
                    <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{totaisCards.leadsQuentes}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400"><UsersIcon className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-400">Corretores ativos</p>
                    <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">{totaisCards.corretoresAtivos}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Funil por etapa */}
              <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <ChartIcon className="w-5 h-5 text-[#3478F6]" />
                  Funil de vendas {corretorFilter && <span className="text-sm font-normal text-[#6B6F76] dark:text-gray-400">(individual)</span>}
                </h2>
                <div className="space-y-3">
                  {PIPELINE_STAGES.map((etapa, i) => {
                    const qtd = porEtapa[etapa] ?? 0;
                    const max = Math.max(...Object.values(porEtapa), 1);
                    const pct = max ? Math.round((qtd / max) * 100) : 0;
                    return (
                      <div key={etapa}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[#2E2F38] dark:text-gray-200 truncate pr-2">{etapa}</span>
                          <span className="font-semibold text-[#3478F6] whitespace-nowrap">{qtd}</span>
                        </div>
                        <div className="h-2 bg-[#E8E9F1] dark:bg-[#181C23] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#3478F6] to-[#A3C8F7] rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Por origem */}
              <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <ChartIcon className="w-5 h-5 text-[#3478F6]" />
                  Por origem do lead {corretorFilter && <span className="text-sm font-normal text-[#6B6F76] dark:text-gray-400">(individual)</span>}
                </h2>
                <div className="space-y-2">
                  {Object.entries(porOrigem)
                    .sort((a, b) => b[1] - a[1])
                    .map(([origem, qtd]) => {
                      const total = filteredLeads.length || 1;
                      const pct = Math.round((qtd / total) * 100);
                      return (
                        <div key={origem} className="flex justify-between items-center py-1.5 border-b border-[#E8E9F1] dark:border-[#23283A] last:border-0">
                          <span className="text-[#2E2F38] dark:text-gray-200">{origem}</span>
                          <span className="font-semibold text-[#3478F6]">{qtd} ({pct}%)</span>
                        </div>
                      );
                    })}
                  {Object.keys(porOrigem).length === 0 && (
                    <p className="text-[#6B6F76] dark:text-gray-400 text-sm">Nenhum lead no filtro ou origem não preenchida.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Ranking + Metas na mesma linha */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <TrophyIcon className="w-5 h-5 text-amber-500" />
                  Ranking (novos leads no período)
                </h2>
                <div className="space-y-2">
                  {ranking.slice(0, 10).map((r, i) => (
                    <div key={r.userId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F5F6FA] dark:bg-[#181C23]">
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#3478F6] text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        {r.nome}
                      </span>
                      <span className="font-bold text-[#3478F6]">{r.count}</span>
                    </div>
                  ))}
                  {ranking.length === 0 && <p className="text-[#6B6F76] dark:text-gray-400 text-sm">Nenhum lead novo no período.</p>}
                </div>
              </div>

              <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <TargetIcon className="w-5 h-5 text-[#3478F6]" />
                  Metas (corporativo)
                </h2>
                {meta ? (
                  <div className="space-y-4">
                    {(meta.inicio || meta.fim) && (
                      <p className="text-sm text-[#6B6F76] dark:text-gray-400">
                        Período: {meta.inicio ? formatDate(new Date(meta.inicio)) : '–'} a {meta.fim ? formatDate(new Date(meta.fim)) : '–'}
                      </p>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>VGV meta</span>
                      <span className="font-semibold">R$ {meta.valor != null ? meta.valor.toLocaleString('pt-BR') : '–'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>VGV realizado</span>
                      <span className="font-semibold text-[#3AC17C]">R$ {meta.alcancado != null ? meta.alcancado.toLocaleString('pt-BR') : '–'}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>% alcançado</span>
                        <span className="font-bold text-[#3478F6]">{meta.percentual ?? 0}%</span>
                      </div>
                      <div className="h-3 bg-[#E8E9F1] dark:bg-[#181C23] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${(meta.percentual ?? 0) >= 100 ? 'bg-[#3AC17C]' : 'bg-[#3478F6]'}`}
                          style={{ width: `${Math.min(meta.percentual ?? 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#6B6F76] dark:text-gray-400 text-sm">Configure a meta em Admin → Metas.</p>
                )}
              </div>
            </div>

            {/* Tabela por corretor — sempre corporativa, dados reais */}
            <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-sm mb-8 overflow-x-auto">
              <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-[#3478F6]" />
                Por corretor (visão corporativa)
              </h2>
              <p className="text-sm text-[#6B6F76] dark:text-gray-400 mb-4">
                Todos os corretores aprovados da imobiliária com métricas reais do período selecionado.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E9F1] dark:border-[#23283A] text-left text-[#6B6F76] dark:text-gray-400">
                    <th className="py-3 px-2 font-semibold">#</th>
                    <th className="py-3 px-2 font-semibold">Corretor</th>
                    <th className="py-3 px-2 font-semibold">Tipo</th>
                    <th className="py-3 px-2 font-semibold text-center">Total leads</th>
                    <th className="py-3 px-2 font-semibold text-center">Novos no período</th>
                    <th className="py-3 px-2 font-semibold text-center">Leads quentes</th>
                    <th className="py-3 px-2 font-semibold">Principal origem</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaPorCorretor.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b border-[#E8E9F1] dark:border-[#23283A] ${corretorFilter === row.id ? 'bg-[#3478F6]/10 dark:bg-[#3478F6]/20' : ''}`}
                    >
                      <td className="py-3 px-2 text-[#6B6F76] dark:text-gray-400">{i + 1}</td>
                      <td className="py-3 px-2 font-medium text-[#2E2F38] dark:text-white">
                        {row.nome}
                        {row.email && <span className="block text-xs text-[#6B6F76] dark:text-gray-400 font-normal">{row.email}</span>}
                      </td>
                      <td className="py-3 px-2 text-[#6B6F76] dark:text-gray-400">
                        {row.tipoConta === 'imobiliaria' ? 'Imobiliária' : row.tipoConta === 'corretor-vinculado' ? 'Vinculado' : row.tipoConta === 'corretor-autonomo' ? 'Autônomo' : row.tipoConta || '–'}
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-[#3478F6]">{row.totalLeads}</td>
                      <td className="py-3 px-2 text-center font-semibold text-[#3AC17C]">{row.novosNoPeriodo}</td>
                      <td className="py-3 px-2 text-center font-semibold text-amber-500">{row.leadsQuentes}</td>
                      <td className="py-3 px-2 text-[#2E2F38] dark:text-gray-200">{row.principalOrigem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tabelaPorCorretor.length === 0 && (
                <p className="text-[#6B6F76] dark:text-gray-400 text-sm py-4">Nenhum corretor aprovado na imobiliária.</p>
              )}
            </div>

            <div className="bg-[#3478F6]/10 dark:bg-[#3478F6]/20 border border-[#3478F6]/30 rounded-xl p-4 text-center">
              <p className="text-[#2E2F38] dark:text-white text-sm">
                <strong>Próximo passo:</strong> use a área <strong>Dashboards TV</strong> (Admin) para montar as telas que rodam na TV e definir o tempo de cada uma.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
