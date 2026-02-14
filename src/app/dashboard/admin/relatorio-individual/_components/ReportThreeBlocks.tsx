'use client';

import React from 'react';
import ReportHero from './ReportHero';
import ComoChegarMetaCard from './ComoChegarMetaCard';
import RealizadoNoRecorteCard from './RealizadoNoRecorteCard';
import GapTableEnhanced from './GapTableEnhanced';
import { RotinaCard, FocoCard } from './RotinaFocoCards';
import type { PeriodKey } from '../_lib/configTypes';
import type { NecessaryByStage, RealizedByStage, GapByStage, FocusPriority } from '../_lib/configTypes';
import type { RelatorioIndividualData } from '../_lib/reportData';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

export interface ReportThreeBlocksProps {
  corretorNome: string;
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  metaAno: number;
  periodStart: string;
  periodEnd: string;
  progressPct: number;
  usePace: boolean;
  progressoPct: number | null;
  acimaAbaixo: 'acima' | 'abaixo' | 'no_alvo';
  necessaryInPeriod: number;
  necessarioMes: number;
  periodLabel: string;
  necessary: NecessaryByStage[];
  realized: RealizedByStage[];
  gaps: GapByStage[];
  focus: FocusPriority[];
  report: RelatorioIndividualData;
  valorRealizadoR: number;
  tarefasConcluidas: number;
  horasEventos: number;
  interacoes: number;
  weeksInPeriod: number;
}

function BlockHeader({ number, title, subtitle, id }: { number: number; title: string; subtitle: string; id?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-1">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D4A017]/20 text-[#D4A017] font-bold text-lg"
          aria-hidden
        >
          {number}
        </span>
        <h2 id={id} className="text-lg font-bold text-white">{title}</h2>
      </div>
      <p className="text-sm text-gray-400 pl-12">{subtitle}</p>
    </div>
  );
}

export default function ReportThreeBlocks(props: ReportThreeBlocksProps) {
  const {
    corretorNome,
    period,
    onPeriodChange,
    metaAno,
    periodStart,
    periodEnd,
    progressPct,
    usePace,
    progressoPct,
    acimaAbaixo,
    necessaryInPeriod,
    necessarioMes,
    periodLabel,
    necessary,
    realized,
    gaps,
    focus,
    report,
    valorRealizadoR,
    tarefasConcluidas,
    horasEventos,
    interacoes,
    weeksInPeriod,
  } = props;

  const statusLabel = acimaAbaixo === 'acima' ? 'Acima do esperado' : acimaAbaixo === 'abaixo' ? 'Abaixo do esperado' : 'No alvo';
  const statusSubtext =
    acimaAbaixo === 'acima'
      ? 'Seguir assim. Foco em manter o ritmo e fechar o que falta.'
      : acimaAbaixo === 'abaixo'
        ? 'Priorize as ações do bloco 3 para voltar ao ritmo.'
        : 'Quase lá. As dicas abaixo ajudam a fechar no verde.';

  return (
    <div className="space-y-10 report-print-root">
      <ReportHero
        nomeCorretor={corretorNome}
        period={period}
        onPeriodChange={onPeriodChange}
        metaAno={metaAno}
        periodStart={periodStart}
        periodEnd={periodEnd}
        progressPct={progressPct}
        usePace={usePace}
      />

      {/* Resumo em 1 frase — gamificado, bata o olho */}
      <div className="report-block-1 rounded-2xl border-2 p-5 transition-colors" style={{
        borderColor: acimaAbaixo === 'acima' ? 'rgba(34, 197, 94, 0.4)' : acimaAbaixo === 'abaixo' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)',
        backgroundColor: acimaAbaixo === 'acima' ? 'rgba(34, 197, 94, 0.06)' : acimaAbaixo === 'abaixo' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(234, 179, 8, 0.06)',
      }}>
        <p className="text-sm text-gray-400 mb-2">Resumo do período</p>
        <p className="text-xl font-bold text-white mb-2">
          Você está em <span className={acimaAbaixo === 'acima' ? 'text-emerald-400' : acimaAbaixo === 'abaixo' ? 'text-red-400' : 'text-amber-400'}>
            {progressoPct != null ? `${(progressoPct * 100).toFixed(0)}%` : '—'} do esperado
          </span>
          {' '}· {formatCurrency(valorRealizadoR)} de {formatCurrency(necessaryInPeriod)} no recorte.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${
              acimaAbaixo === 'acima'
                ? 'bg-emerald-500/25 text-emerald-400'
                : acimaAbaixo === 'abaixo'
                  ? 'bg-red-500/25 text-red-400'
                  : 'bg-amber-500/25 text-amber-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current" aria-hidden />
            {statusLabel}
          </span>
          <span className="text-sm text-gray-400">{statusSubtext}</span>
        </div>
      </div>

      {/* ——— Bloco 1: Onde você está ——— */}
      <section className="report-block-1" aria-labelledby="block1-title">
        <BlockHeader
          id="block1-title"
          number={1}
          title="Onde você está"
          subtitle="Seu resultado e ritmo no período. Um olhar e você sabe se está no caminho certo."
        />
        <ComoChegarMetaCard
          metaAno={metaAno}
          necessary={necessary}
          realized={realized}
          valorRealizadoR={valorRealizadoR}
          necessarioNoPeriodo={necessaryInPeriod}
          necessarioMes={necessarioMes}
          periodLabel={periodLabel}
        />
      </section>

      {/* ——— Bloco 2: De onde veio e o que falta ——— */}
      <section className="report-block-2" aria-labelledby="block2-title">
        <BlockHeader
          id="block2-title"
          number={2}
          title="De onde veio e o que falta"
          subtitle="Origem do seu resultado e onde está o gargalo. Cada barra mostra o que era preciso vs o que você fez."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RealizadoNoRecorteCard
            valorRealizadoR={valorRealizadoR}
            necessary={necessary}
            realized={realized}
            weeksInPeriod={weeksInPeriod}
            periodLabel={periodLabel}
          />
          <div className="card-glow rounded-2xl border border-white/10 bg-white/5 dark:bg-[#23283A]/80 p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-0.5 h-4 bg-[#D4A017] rounded-r-full opacity-60" />
              GAP por etapa
            </h3>
            <p className="text-xs text-gray-500 mb-3">Vermelho = prioridade. Ordene pelo maior GAP para atacar primeiro.</p>
            <GapTableEnhanced gaps={gaps} defaultSort="pior" />
          </div>
        </div>
      </section>

      {/* ——— Bloco 3: Próximos passos e o que corrigir ——— */}
      <section className="report-block-3" aria-labelledby="block3-title">
        <BlockHeader
          id="block3-title"
          number={3}
          title="Próximos passos e o que corrigir"
          subtitle="O que fazer agora e onde está o erro. Siga a ordem: primeiro os itens em destaque."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <RotinaCard
              tarefasConcluidas={tarefasConcluidas}
              horasEventos={horasEventos}
              interacoes={interacoes}
              valorRealizadoR={valorRealizadoR}
              tarefasAtrasadas={report.tarefasAtrasadas}
            />
            {report.tarefasAtrasadas > 0 && (
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                <span className="font-semibold">Atenção:</span> tarefas atrasadas atrapalham o funil. Resolva primeiro.
              </p>
            )}
          </div>
          <div>
            <FocoCard focus={focus} />
            {focus.length > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                Cada item acima é uma prioridade. Faça na ordem 1, 2, 3 para o maior impacto.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
