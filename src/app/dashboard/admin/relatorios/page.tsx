'use client';

/**
 * Relatórios do administrador — visão gerencial da imobiliária.
 * Período global compartilhado por todas as abas; dados pesados carregados
 * uma vez por período (2 collectionGroup queries) + base 1x (5 queries);
 * troca de aba recomputa só no cliente.
 */

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import LoadingState from '@/components/ui/LoadingState';
import { PERIODO_PRESETS, PeriodoPreset, resolvePeriodo } from './_components/reportShared';
import { useRelatoriosData } from './_components/useRelatoriosData';
import { computeReport } from './_components/computeReport';
import PulsoTab from './_components/PulsoTab';
import FunilTab from './_components/FunilTab';
import CorretoresTab from './_components/CorretoresTab';
import IndividualTab from './_components/IndividualTab';
import OrigensTab from './_components/OrigensTab';

type TabKey = 'pulso' | 'funil' | 'corretores' | 'individual' | 'origens';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pulso', label: 'Pulso' },
  { key: 'funil', label: 'Funil' },
  { key: 'corretores', label: 'Corretores' },
  { key: 'individual', label: 'Individual × Coletivo' },
  { key: 'origens', label: 'Origens & Campanhas' },
];

const fmtDia = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function RelatoriosAdminPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const { stagesWithMeta } = usePipelineStages();

  // Período global (compartilhado por todas as abas)
  const [preset, setPreset] = useState<PeriodoPreset>('mes');
  const [customIni, setCustomIni] = useState('');
  const [customFim, setCustomFim] = useState('');
  const periodo = useMemo(() => resolvePeriodo(preset, customIni, customFim), [preset, customIni, customFim]);

  const { carregando, progresso, source } = useRelatoriosData(userData?.imobiliariaId, isEspelhoDemo, periodo);
  const report = useMemo(
    () => (source ? computeReport(source, periodo, stagesWithMeta) : null),
    [source, periodo, stagesWithMeta]
  );

  const [tab, setTab] = useState<TabKey>('pulso');
  const [corretorSel, setCorretorSel] = useState('');

  const compararCorretor = (id: string) => {
    setCorretorSel(id);
    setTab('individual');
  };

  const inputCls = 'bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50';

  return (
    <div className="max-w-5xl mx-auto mt-6 space-y-4 pb-10 px-1">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="gx-tag"><span>Área do administrador</span></span>
          {isEspelhoDemo && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-[#E8C547]/10 border border-[#E8C547]/40 text-[#FFE9A6]">
              Demonstração — dados fictícios
            </span>
          )}
        </div>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2">Relatórios</h1>
        <p className="text-[12px] text-text-secondary mt-1">
          O raio-x da operação: ritmo do período, saúde do funil, ranking da equipe, cada corretor contra a média
          do coletivo e de onde os leads estão vindo. Escolha o período — todas as abas obedecem.
        </p>
      </div>

      {/* Seletor de período global */}
      <div className="al-card relative overflow-hidden p-3.5">
        <div className="absolute inset-x-0 top-0 gx-line-gold" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mr-1">Período</span>
          {PERIODO_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider border transition-colors ${
                preset === p.key
                  ? 'bg-[#E8C547]/12 border-[#E8C547]/55 text-[#FFE9A6] shadow-[0_0_12px_-2px_rgba(232,197,71,0.4)]'
                  : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-text-secondary tabular-nums">
            {periodo.label} <span className="text-white/25">· comparando com {fmtDia(periodo.prevInicioMs)} → {fmtDia(periodo.prevFimMs)}</span>
          </span>
        </div>
        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 mt-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">De</label>
              <input type="date" value={customIni} onChange={(e) => setCustomIni(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Até</label>
              <input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)} className={inputCls} />
            </div>
            {(!customIni || !customFim) && (
              <span className="text-[10.5px] text-[#FFE9A6] pb-2">escolha as duas datas — enquanto isso vale o mês atual</span>
            )}
          </div>
        )}
      </div>

      {/* Abas */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border transition-colors ${
              tab === t.key
                ? 'bg-[#FF1E56]/15 border-[#FF3364]/60 text-[#FF9EB5] shadow-[0_0_12px_-2px_rgba(255,30,86,0.4)]'
                : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
        {!carregando && progresso && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-text-secondary">
            <span className="animate-spin rounded-full h-3 w-3 border border-[#FF1E56]/25 border-b-[#FF1E56]" />
            {progresso}
          </span>
        )}
      </div>

      {/* Conteúdo */}
      {carregando || !report ? (
        <div className="al-card p-8">
          <LoadingState label={progresso || 'Carregando relatórios...'} />
        </div>
      ) : (
        <>
          {tab === 'pulso' && <PulsoTab report={report} periodo={periodo} />}
          {tab === 'funil' && <FunilTab report={report} />}
          {tab === 'corretores' && <CorretoresTab report={report} onComparar={compararCorretor} />}
          {tab === 'individual' && <IndividualTab report={report} corretorId={corretorSel} onSelecionar={setCorretorSel} />}
          {tab === 'origens' && <OrigensTab report={report} />}
        </>
      )}
    </div>
  );
}
