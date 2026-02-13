'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { getActiveTemplate } from './_lib/getActiveTemplate';
import { aggregateMetrics } from './_lib/aggregateMetrics';
import { getPeriodBounds } from './_lib/periodUtils';
import { computeInvertedFunnel, computeGaps, getFocusPriorities } from './_lib/funnelEngine';
import type { PeriodKey } from './_lib/configTypes';
import type { FunnelTemplate, NecessaryByStage, RealizedByStage, GapByStage, FocusPriority } from './_lib/configTypes';
import { DEFAULT_FUNNEL_TEMPLATE } from './_lib/defaultTemplate';

interface Corretor {
  id: string;
  nome: string;
}

const SectionTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-base font-bold text-[#2E2F38] dark:text-white relative z-10">{children}</h2>
    <div className="absolute -left-1.5 top-1/2 transform -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-r-full opacity-60" />
  </div>
);

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export default function RelatorioIndividualPage() {
  const { userData } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [selectedCorretor, setSelectedCorretor] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('mes');
  const [metaR, setMetaR] = useState<number>(0);
  const [usePace, setUsePace] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [template, setTemplate] = useState<FunnelTemplate | null>(null);
  const [necessary, setNecessary] = useState<NecessaryByStage[]>([]);
  const [realized, setRealized] = useState<RealizedByStage[]>([]);
  const [gaps, setGaps] = useState<GapByStage[]>([]);
  const [focus, setFocus] = useState<FocusPriority[]>([]);
  const [rotina, setRotina] = useState<{ tarefasConcluidas: number; horasEventos: number; interacoes: number; valorRealizadoR: number } | null>(null);
  const [periodBounds, setPeriodBounds] = useState<{ start: Date; end: Date; progressPct: number } | null>(null);

  useEffect(() => {
    if (!imobiliariaId) {
      setLoadingList(false);
      return;
    }
    const load = async () => {
      const q = query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', imobiliariaId),
        where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo']),
        where('aprovado', '==', true)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        nome: (d.data().nome as string) || (d.data().email as string) || 'Sem nome',
      }));
      setCorretores(list);
      if (list.length && !selectedCorretor) setSelectedCorretor(list[0].id);
      setLoadingList(false);
    };
    load();
  }, [imobiliariaId]);

  // Meta do sistema (módulo Metas) para preencher ou espelhar
  useEffect(() => {
    if (!imobiliariaId) return;
    getDoc(doc(db, 'metas', imobiliariaId)).then((snap) => {
      if (snap.exists()) {
        const v = Number(snap.data()?.valorMensal);
        if (v > 0 && metaR === 0) setMetaR(v);
      }
    });
  }, [imobiliariaId]);

  const handleGerar = async () => {
    if (!imobiliariaId || !selectedCorretor) return;
    const corretor = corretores.find((c) => c.id === selectedCorretor);
    if (!corretor) return;

    setLoading(true);
    setError(null);
    setNecessary([]);
    setRealized([]);
    setGaps([]);
    setFocus([]);
    setRotina(null);

    try {
      const bounds = getPeriodBounds(period);
      setPeriodBounds(bounds);

      const t = await getActiveTemplate(imobiliariaId, bounds.end);
      setTemplate(t);

      const periodBoundsForEngine = {
        start: bounds.start,
        end: bounds.end,
        progressPct: usePace ? bounds.progressPct : undefined,
      };

      const necessaryList = computeInvertedFunnel(metaR, t, periodBoundsForEngine, usePace);
      setNecessary(necessaryList);

      const aggregated = await aggregateMetrics(imobiliariaId, selectedCorretor, corretor.nome, period, t);
      setRealized(aggregated.byStage);
      setRotina({
        tarefasConcluidas: aggregated.tarefasConcluidas,
        horasEventos: aggregated.horasEventos,
        interacoes: aggregated.interacoes,
        valorRealizadoR: aggregated.valorRealizadoR,
      });

      const gapsList = computeGaps(necessaryList, aggregated.byStage, t);
      setGaps(gapsList);

      const focusList = getFocusPriorities(gapsList, 3);
      setFocus(focusList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  const hasData = necessary.length > 0 || realized.length > 0;

  if (!imobiliariaId) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Acesso restrito à imobiliária.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/admin"
          className="flex items-center gap-2 text-sm font-semibold text-[#6B6F76] dark:text-gray-400 hover:text-[#D4A017] transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Voltar
        </Link>
        <span className="text-gray-400">|</span>
        <SectionTitle>Relatório individual do corretor</SectionTitle>
      </div>

      {/* Header: período, meta R$, pace, corretor */}
      <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-white/10 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Corretor</label>
            <select
              value={selectedCorretor}
              onChange={(e) => setSelectedCorretor(e.target.value)}
              className="w-full rounded-lg border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white px-3 py-2 text-sm"
              disabled={loadingList}
            >
              {loadingList && <option value="">Carregando...</option>}
              {!loadingList && corretores.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Período</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              className="w-full rounded-lg border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white px-3 py-2 text-sm"
            >
              <option value="dia">Diário</option>
              <option value="semana">Semanal</option>
              <option value="mes">Mensal</option>
              <option value="trimestre">Trimestral</option>
              <option value="semestre">Semestral</option>
              <option value="ano">Anual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Meta individual (R$)</label>
            <input
              type="number"
              min={0}
              step={10000}
              value={metaR || ''}
              onChange={(e) => setMetaR(Number(e.target.value) || 0)}
              placeholder="Ex: 500000"
              className="w-full rounded-lg border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={usePace}
                onChange={(e) => setUsePace(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Pace (esperado até hoje)
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGerar}
            disabled={loading || !selectedCorretor}
            className="px-5 py-2.5 rounded-lg bg-[#D4A017] text-white font-semibold text-sm hover:bg-[#B8860B] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
          {periodBounds && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {periodBounds.start.toLocaleDateString('pt-BR')} – {periodBounds.end.toLocaleDateString('pt-BR')}
              {usePace && ` · ${Math.round((periodBounds.progressPct ?? 0) * 100)}% do período`}
            </span>
          )}
        </div>
        {error && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D4A017] border-t-transparent" />
        </div>
      )}

      {!loading && !hasData && selectedCorretor && (
        <div className="rounded-xl border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-[#23283A] p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">Selecione o corretor, defina a meta (R$) e clique em <strong>Gerar relatório</strong>.</p>
        </div>
      )}

      {!loading && hasData && template && (
        <div className="space-y-4">
          {template.id !== 'default' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Template: <strong>{template.nome}</strong> (v{template.versao})
            </p>
          )}

          {/* Card 1: Necessário (Funil Invertido) */}
          <div className="rounded-xl border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-[#23283A] p-4">
            <SectionTitle className="mb-3">Necessário (funil invertido)</SectionTitle>
            <ul className="space-y-1.5">
              {necessary.map((n) => (
                <li key={n.stageId} className="flex justify-between items-center text-sm">
                  <span className="text-[#2E2F38] dark:text-gray-200">{n.stageNome}</span>
                  <span className="font-semibold text-[#D4A017] tabular-nums">
                    {n.valorR != null ? formatCurrency(n.valorR) : n.valor.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 2: Realizado */}
          <div className="rounded-xl border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-[#23283A] p-4">
            <SectionTitle className="mb-3">Realizado (no período)</SectionTitle>
            <ul className="space-y-1.5">
              {realized.map((r) => (
                <li key={r.stageId} className="flex justify-between items-center text-sm">
                  <span className="text-[#2E2F38] dark:text-gray-200">{r.stageNome}</span>
                  <span className="font-semibold tabular-nums text-[#2E2F38] dark:text-white">{r.valor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Card 3: GAP */}
          <div className="rounded-xl border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-[#23283A] p-4">
            <SectionTitle className="mb-3">GAP por etapa</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-[#E8E9F1] dark:border-white/10">
                    <th className="pb-2 pr-2">Etapa</th>
                    <th className="pb-2 pr-2 text-right">Necessário</th>
                    <th className="pb-2 pr-2 text-right">Realizado</th>
                    <th className="pb-2 pr-2 text-right">GAP</th>
                    <th className="pb-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((g) => (
                    <tr key={g.stageId} className="border-b border-[#E8E9F1] dark:border-white/5">
                      <td className="py-1.5 pr-2 text-[#2E2F38] dark:text-gray-200">{g.stageNome}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{g.necessario.toFixed(1)}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{g.realizado}</td>
                      <td className={`py-1.5 pr-2 text-right tabular-nums font-medium ${g.gapAbs >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {g.gapAbs >= 0 ? '+' : ''}{g.gapAbs.toFixed(1)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                        {g.gapPct != null ? `${(g.gapPct * 100).toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rotina */}
          {rotina && (
            <div className="rounded-xl border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-[#23283A] p-4">
              <SectionTitle className="mb-3">Rotina / Atividade</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Tarefas concluídas</p>
                  <p className="font-semibold text-[#2E2F38] dark:text-white">{rotina.tarefasConcluidas}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Horas em eventos</p>
                  <p className="font-semibold text-[#2E2F38] dark:text-white">{rotina.horasEventos.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Interações</p>
                  <p className="font-semibold text-[#2E2F38] dark:text-white">{rotina.interacoes}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">VGV realizado</p>
                  <p className="font-semibold text-[#2E2F38] dark:text-white">{formatCurrency(rotina.valorRealizadoR)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Foco do período */}
          {focus.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4">
              <SectionTitle className="mb-3">Foco do período</SectionTitle>
              <ul className="space-y-2">
                {focus.map((f, i) => (
                  <li key={f.stageId} className="flex gap-2 text-sm">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{i + 1}.</span>
                    <span className="text-[#2E2F38] dark:text-gray-200">{f.mensagem}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
