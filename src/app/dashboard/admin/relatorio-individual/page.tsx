'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { getActiveTemplate } from './_lib/getActiveTemplate';
import { aggregateMetrics } from './_lib/aggregateMetrics';
import { getPeriodBounds, getPeriodFractionOfYear, getWeeksRemainingInPeriod, formatPeriodLabel } from './_lib/periodUtils';
import { computeInvertedFunnel, computeGaps, getFocusPriorities } from './_lib/funnelEngine';
import type { PeriodKey } from './_lib/configTypes';
import type { FunnelTemplate, NecessaryByStage, RealizedByStage, GapByStage, FocusPriority } from './_lib/configTypes';
import SummaryHeader from './_components/SummaryHeader';
import FunnelMissionList from './_components/FunnelMissionList';
import GapTableEnhanced from './_components/GapTableEnhanced';
import FocusOfPeriodSmart from './_components/FocusOfPeriodSmart';
import Page1OrigemResultado from './_components/Page1OrigemResultado';
import GamifiedPanels from './_components/GamifiedPanels';
import type { RelatorioIndividualData } from './_lib/reportData';

interface Corretor {
  id: string;
  nome: string;
}

const SectionTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-base font-bold text-white relative z-10">{children}</h2>
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
  const [metaAno, setMetaAno] = useState<number>(0);
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
  const [report, setReport] = useState<RelatorioIndividualData | null>(null);

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

  useEffect(() => {
    if (!imobiliariaId) return;
    getDoc(doc(db, 'metas', imobiliariaId)).then((snap) => {
      if (snap.exists()) {
        const v = Number(snap.data()?.valorMensal);
        if (v > 0 && metaAno === 0) setMetaAno(v * 12);
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
    setReport(null);

    try {
      const bounds = getPeriodBounds(period);
      setPeriodBounds(bounds);

      const t = await getActiveTemplate(imobiliariaId, bounds.end);
      setTemplate(t);

      const periodFraction = getPeriodFractionOfYear(period, bounds.start, bounds.end);
      const metaForPeriod = metaAno * periodFraction;
      const periodBoundsForEngine = {
        start: bounds.start,
        end: bounds.end,
        progressPct: usePace ? bounds.progressPct : undefined,
      };

      const necessaryList = computeInvertedFunnel(metaForPeriod, t, periodBoundsForEngine, usePace);
      setNecessary(necessaryList);

      const aggregated = await aggregateMetrics(imobiliariaId, selectedCorretor, corretor.nome, period, t);
      setRealized(aggregated.byStage);
      setReport(aggregated.report);
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
  const periodFraction = periodBounds ? getPeriodFractionOfYear(period, periodBounds.start, periodBounds.end) : 0;
  const necessaryInPeriod = periodBounds && metaAno > 0 ? metaAno * periodFraction * (usePace ? periodBounds.progressPct : 1) : 0;
  const progressoPct = rotina && necessaryInPeriod > 0 ? rotina.valorRealizadoR / necessaryInPeriod : null;
  const acimaAbaixo = progressoPct == null ? 'no_alvo' : progressoPct >= 1 ? 'acima' : progressoPct >= 0.9 ? 'no_alvo' : 'abaixo';
  const weeksInPeriod = periodBounds ? getWeeksRemainingInPeriod(periodBounds.start, periodBounds.end) : 0;

  if (!imobiliariaId) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Acesso restrito à imobiliária.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/admin"
          className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-[#D4A017] transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Voltar
        </Link>
        <span className="text-gray-500">|</span>
        <SectionTitle>Relatório individual do corretor</SectionTitle>
      </div>

      <header className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Corretor</label>
            <select
              value={selectedCorretor}
              onChange={(e) => setSelectedCorretor(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 dark:bg-[#181C23] text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A017]/50"
              disabled={loadingList}
            >
              {loadingList && <option value="">Carregando...</option>}
              {!loadingList && corretores.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#23283A]">{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Recorte do período</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              className="w-full rounded-lg border border-white/10 bg-white/5 dark:bg-[#181C23] text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A017]/50"
            >
              <option value="dia" className="bg-[#23283A]">Diário</option>
              <option value="semana" className="bg-[#23283A]">Semanal</option>
              <option value="mes" className="bg-[#23283A]">Mensal</option>
              <option value="trimestre" className="bg-[#23283A]">Trimestral</option>
              <option value="semestre" className="bg-[#23283A]">Semestral</option>
              <option value="ano" className="bg-[#23283A]">Anual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Meta anual (R$)</label>
            <input
              type="number"
              min={0}
              step={10000}
              value={metaAno || ''}
              onChange={(e) => setMetaAno(Number(e.target.value) || 0)}
              placeholder="Ex: 2400000"
              className="w-full rounded-lg border border-white/10 bg-white/5 dark:bg-[#181C23] text-white px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#D4A017]/50"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={usePace}
                onChange={(e) => setUsePace(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-[#D4A017] focus:ring-[#D4A017]/50"
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
            className="px-5 py-2.5 rounded-lg bg-[#D4A017] text-white font-semibold text-sm hover:bg-[#B8860B] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-soft"
          >
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
          {periodBounds && (
            <span className="text-xs text-gray-500">
              {periodBounds.start.toLocaleDateString('pt-BR')} – {periodBounds.end.toLocaleDateString('pt-BR')}
              {usePace && ` · ${Math.round((periodBounds.progressPct ?? 0) * 100)}% do período`}
            </span>
          )}
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </header>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D4A017] border-t-transparent" />
        </div>
      )}

      {!loading && !hasData && selectedCorretor && (
        <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/60 p-8 text-center">
          <p className="text-gray-400">Defina a <strong className="text-white">meta anual</strong>, escolha o corretor e o recorte (período). Clique em <strong className="text-[#D4A017]">Gerar relatório</strong>.</p>
        </div>
      )}

      {!loading && hasData && template && periodBounds && report && (
        <div className="space-y-5">
          <SummaryHeader
            metaAno={metaAno}
            periodLabel={formatPeriodLabel(period)}
            periodStart={periodBounds.start.toLocaleDateString('pt-BR')}
            periodEnd={periodBounds.end.toLocaleDateString('pt-BR')}
            progressPct={periodBounds.progressPct}
            usePace={usePace}
            progressoPct={progressoPct}
            acimaAbaixo={acimaAbaixo}
          />

          {/* Legenda rápida: como ler o relatório */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-400">
            <p className="font-semibold text-white mb-1">Como ler este relatório</p>
            <p>
              (1) <strong className="text-white">Resultado vs meta</strong> acima · (2) <span className="text-emerald-400">Verde</span> = dando certo, <span className="text-amber-400">Âmbar</span> = precisa melhorar · (3) <strong className="text-white">De onde veio</strong> = atividade, leads e vendas · (4) <strong className="text-white">Funil</strong> = necessário vs realizado em cada etapa · (5) <strong className="text-amber-400">Onde focar</strong> = prioridades de ação.
            </p>
          </div>

          {/* Quadros laterais gamificados: dando certo | precisa melhorar */}
          <GamifiedPanels
            report={report}
            gaps={gaps}
            focus={focus}
            progressoPct={progressoPct}
            acimaAbaixo={acimaAbaixo}
            valorRealizadoR={rotina?.valorRealizadoR ?? 0}
            tarefasConcluidas={rotina?.tarefasConcluidas ?? 0}
          />

          {/* De onde veio o resultado */}
          <Page1OrigemResultado report={report} />

          {/* Como chegar na meta + GAP */}
          <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-5">
            <SectionTitle className="mb-4">Como chegar na meta do ano</SectionTitle>
            <p className="text-sm text-gray-400 mb-4">
              Cada barra mostra <strong className="text-white">quanto era necessário</strong> (100%) vs <strong className="text-white">quanto você realizou</strong>. Verde = no alvo, amarelo = falta um pouco, vermelho = prioridade.
            </p>
            <FunnelMissionList
              metaAno={metaAno}
              necessary={necessary}
              realized={realized}
              weeksInPeriod={weeksInPeriod}
            />
          </div>

          <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-5">
            <SectionTitle className="mb-4">GAP por etapa</SectionTitle>
            <p className="text-sm text-gray-400 mb-4">
              Ordene por <strong className="text-white">maior GAP primeiro</strong> para ver onde está o gargalo, ou pela <strong className="text-white">ordem do funil</strong> para acompanhar etapa a etapa.
            </p>
            <GapTableEnhanced gaps={gaps} defaultSort="pior" />
          </div>

          {focus.length > 0 && (
            <div className="card-glow rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-5">
              <SectionTitle className="mb-4">Onde colocar o esforço</SectionTitle>
              <p className="text-sm text-gray-400 mb-4">
                Priorize estas ações <strong className="text-white">nesta ordem</strong>. Cada item tem uma sugestão concreta para a etapa.
              </p>
              <FocusOfPeriodSmart focus={focus} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
