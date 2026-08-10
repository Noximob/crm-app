'use client';

/**
 * Relatórios do admin — DUAS análises, e só duas (pedido explícito do dono
 * depois de várias tentativas com mais abas):
 *
 * 👤 ANÁLISE DO CORRETOR — o dossiê 1:1 por período (semana/mês/trimestre):
 *    velocidade de atendimento, agenda marcada vs feita, carteira parada com
 *    nome, funil dele vs time, disciplina, resultado e os combinados que
 *    reabrem na próxima reunião. PDF de 2 páginas pra levar na mesa.
 *
 * 📣 ANÁLISE DE PROPAGANDA — por período e/ou campanha: velocidade da equipe,
 *    tratamento, funil da coorte, custo por visita/venda e o PDF de 1 página
 *    pra prestar contas à construtora.
 */
import React, { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRelatorioData, useAtividade, useCustoCampanhas, computeRelatorioDist, type Periodo } from './logic';
import { dadosDemo } from './demo';
import { AnaliseCorretorView } from './corretor-view';
import { AnalisePropagandaView } from './propaganda-view';
import { Semana7View } from './semana7-view';

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'tudo', label: 'Tudo' }, { id: 'mes', label: 'Mês' }, { id: '30d', label: '30d' }, { id: '90d', label: '90d' },
];

export default function RelatoriosPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;
  const ativo = !!imobiliariaId && !isEspelhoDemo;
  const { leads, corretores, ads, vendas, minutosExclusivo, loading, error } = useRelatorioData(imobiliariaId, ativo);
  const { mapa, loadingAtiv, progresso } = useAtividade(leads, ativo);

  const [aba, setAba] = useState<'semana7' | 'corretor' | 'propaganda'>('semana7');
  const [periodoAds, setPeriodoAds] = useState<Periodo>('tudo');
  const { gastos, totalGasto, erroGasto, carregandoGasto } = useCustoCampanhas(ativo && aba === 'propaganda', periodoAds);
  const comAtividade = mapa.size > 0;

  // no Espelho a análise roda com dados sintéticos (a estrutura é a mesma)
  const demo = useMemo(() => (isEspelhoDemo ? dadosDemo() : null), [isEspelhoDemo]);
  const dLeads = demo ? demo.leads : leads;
  const dCorretores = demo ? demo.corretores : corretores;
  const dVendas = demo ? demo.vendas : vendas;
  const dMapa = demo ? demo.atividade : mapa;

  // quem entra na régua: corretores aprovados (o CRM do proprietário fica fora)
  const selecionados = useMemo(
    () => (demo ? demo.selecionados : new Set(corretores.filter((c) => c.aprovado !== false && (c.tipoConta || '').startsWith('corretor')).map((c) => c.id))),
    [demo, corretores]
  );

  // rodízio no dossiê do corretor e na aba dos 7 dias: SEMPRE o histórico todo
  // — quem consome é que corta pela janela
  const distTudo = useMemo(
    () => (isEspelhoDemo ? null : computeRelatorioDist(ads, leads, corretores, mapa, 'tudo', minutosExclusivo)),
    [isEspelhoDemo, ads, leads, corretores, mapa, minutosExclusivo]
  );
  const dDist = demo ? demo.distLinhas : (distTudo?.linhas || []);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      <div className="flex flex-col gap-3">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Relatórios</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">
              {loading && !isEspelhoDemo ? 'Carregando…'
                : aba === 'semana7'
                  ? 'os últimos 7 dias de cada corretor — funil, propagandas atendidas, agenda e atrasos, tudo de relance'
                  : aba === 'corretor'
                    ? 'a análise 1:1 — escolha o corretor e o período, aponte o gargalo, gere o PDF da reunião'
                    : 'o que a propaganda entregou — por período ou campanha, com o PDF pra construtora'}
              {loadingAtiv && ` · lendo atividade ${Math.round(progresso * 100)}%`}
            </p>
          </div>
          {aba === 'propaganda' && !isEspelhoDemo && (
            <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/10 p-1">
              {PERIODOS.map((p) => (
                <button key={p.id} onClick={() => setPeriodoAds(p.id)} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${periodoAds === p.id ? 'bg-white/[0.10] text-white' : 'text-text-secondary hover:text-white'}`}>{p.label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap rounded-xl border border-white/10 bg-white/[0.04] p-1 gap-1 self-start">
          {([['semana7', '📅 Semana dos corretores'], ['corretor', '👤 Análise do corretor'], ['propaganda', '📣 Análise de propaganda']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`px-3.5 py-2 rounded-lg text-[12px] font-bold transition-all ${aba === id ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_0_16px_rgba(255,30,86,0.35)]' : 'text-text-secondary hover:text-white'}`}>{label}</button>
          ))}
        </div>
      </div>

      {isEspelhoDemo && (
        <div className="al-card p-3 text-[12px] text-text-secondary border-l-2 border-l-[#E8C547]">
          <b className="text-white">Modo demonstração.</b> Números de exemplo, só pra mostrar a leitura — o relatório real usa os dados da sua imobiliária.
        </div>
      )}

      {error && !isEspelhoDemo && <div className="al-card p-4 text-rose-300 text-sm">Erro: {error}</div>}
      {loading && !isEspelhoDemo && <div className="al-card p-8 text-center text-text-secondary">Carregando dados…</div>}

      {(!loading || isEspelhoDemo) && aba === 'semana7' && (
        <Semana7View
          leads={dLeads} corretores={dCorretores} vendas={dVendas} atividade={dMapa}
          distLinhas={dDist} selecionados={selecionados} comAtividade={comAtividade || isEspelhoDemo}
        />
      )}

      {(!loading || isEspelhoDemo) && aba === 'corretor' && (
        <AnaliseCorretorView
          leads={dLeads} corretores={dCorretores} vendas={dVendas} atividade={dMapa}
          distLinhas={dDist}
          selecionados={selecionados} comAtividade={comAtividade || isEspelhoDemo}
          imobiliariaId={imobiliariaId} isDemo={isEspelhoDemo}
        />
      )}

      {isEspelhoDemo && aba === 'propaganda' && (
        <div className="al-card p-10 text-center"><p className="text-[40px] mb-2">📣</p><p className="text-sm text-text-secondary">A análise de propaganda lê os anúncios reais da imobiliária — indisponível no modo demonstração.</p></div>
      )}

      {!loading && !isEspelhoDemo && aba === 'propaganda' && (
        <AnalisePropagandaView
          ads={ads} leads={leads} corretores={corretores} mapa={mapa} vendas={vendas}
          periodo={periodoAds} minutosExclusivo={minutosExclusivo} comAtividade={comAtividade}
          gastos={gastos} totalGasto={totalGasto} erroGasto={erroGasto} carregandoGasto={carregandoGasto}
        />
      )}
    </div>
  );
}
