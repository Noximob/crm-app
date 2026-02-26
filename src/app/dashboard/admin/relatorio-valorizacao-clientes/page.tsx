'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AlummaLogoFullInline } from '@/components/AlummaLogo';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const PdfIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 15h6" />
    <path d="M9 19h6" />
    <path d="M9 11h6" />
  </svg>
);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(value);
}

function formatPct(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(value / 100);
}

export default function RelatorioValorizacaoClientesPage() {
  const [nomeCliente, setNomeCliente] = useState('');
  const [produto, setProduto] = useState('');
  const [unidade, setUnidade] = useState('');
  const [valorContrato, setValorContrato] = useState<number>(0);
  const [valorAtual, setValorAtual] = useState<number>(0);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { ganho, valorizacaoPct } = useMemo(() => {
    const contrato = Number(valorContrato) || 0;
    const atual = Number(valorAtual) || 0;
    const ganho = contrato > 0 ? atual - contrato : 0;
    const valorizacaoPct = contrato > 0 ? (ganho / contrato) * 100 : 0;
    return { ganho, valorizacaoPct };
  }, [valorContrato, valorAtual]);

  const periodoLabel = useMemo(() => {
    if (dataInicio && dataFim) {
      const fmt = (s: string) => {
        const d = new Date(s + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      };
      return `${fmt(dataInicio)} – ${fmt(dataFim)}`;
    }
    if (dataInicio) return `A partir de ${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    return 'Período não informado';
  }, [dataInicio, dataFim]);

  const contratoNum = Number(valorContrato) || 0;
  const atualNum = Number(valorAtual) || 0;
  const temDados = contratoNum > 0 || atualNum > 0;

  // Período em meses para o gráfico (data início/fim ou padrão 12 meses)
  const mesesPeriodo = useMemo(() => {
    if (dataInicio && dataFim) {
      const d1 = new Date(dataInicio + 'T12:00:00');
      const d2 = new Date(dataFim + 'T12:00:00');
      const meses = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
      return Math.min(meses, 120); // cap 10 anos
    }
    return 12;
  }, [dataInicio, dataFim]);

  // Selic: taxa anual de referência (ex.: 10,5% a.a.) — capital aplicado renderizando mês a mês
  const SELIC_ANUAL_PCT = 10.5;
  const selicMensal = Math.pow(1 + SELIC_ANUAL_PCT / 100, 1 / 12) - 1;

  const chartData = useMemo(() => {
    if (!temDados) return { pontos: [], selic: [], imovel: [], minY: 0, maxY: 0 };
    const selic: number[] = [];
    const imovel: number[] = [];
    for (let m = 0; m <= mesesPeriodo; m++) {
      selic.push(contratoNum * Math.pow(1 + selicMensal, m));
      imovel.push(contratoNum + (atualNum - contratoNum) * (m / mesesPeriodo));
    }
    const minY = Math.min(selic[0], imovel[0], ...selic, ...imovel);
    const maxY = Math.max(...selic, ...imovel);
    const pontos = selic.map((_, i) => i);
    return { pontos, selic, imovel, minY, maxY };
  }, [temDados, contratoNum, atualNum, mesesPeriodo, selicMensal]);

  const chartW = 400;
  const chartH = 200;
  const pad = { left: 48, right: 16, top: 12, bottom: 28 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  const scaleX = (m: number) => pad.left + (m / mesesPeriodo) * innerW;
  const scaleY = (v: number) => {
    if (chartData.maxY <= chartData.minY) return pad.top + innerH / 2;
    return pad.top + innerH - ((v - chartData.minY) / (chartData.maxY - chartData.minY)) * innerH;
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 1.5rem; background: #fff; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/admin"
          className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-[#D4A017] transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Voltar
        </Link>
        <span className="text-gray-500">|</span>
        <h1 className="text-base font-bold text-white">Relatório de Valorização dos Clientes</h1>
      </div>

      {/* Formulário — não imprime */}
      <header className="no-print rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
        <p className="text-xs text-gray-400 mb-4">Preencha os dados para gerar o relatório de valorização para o cliente investidor.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome do cliente</label>
            <input
              type="text"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              placeholder="Ex.: João Silva"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#D4A017]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Produto (empreendimento / imóvel)</label>
            <input
              type="text"
              value={produto}
              onChange={(e) => setProduto(e.target.value)}
              placeholder="Ex.: Residencial Solar das Flores"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#D4A017]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Unidade</label>
            <input
              type="text"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              placeholder="Ex.: Torre A – Apto 101"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#D4A017]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Valor de contrato (R$)</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={valorContrato || ''}
              onChange={(e) => setValorContrato(Number(e.target.value) || 0)}
              placeholder="Valor pago na aquisição"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#D4A017]/50 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Valor atual (R$)</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={valorAtual || ''}
              onChange={(e) => setValorAtual(Number(e.target.value) || 0)}
              placeholder="Valor de mercado / avaliação atual"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#D4A017]/50 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Data início do período</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A017]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Data fim do período</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A017]/50"
            />
          </div>
        </div>
        <div className="no-print flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!temDados}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4A017] text-white font-semibold text-sm hover:bg-[#B8860B] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <PdfIcon className="h-5 w-5" />
            Baixar PDF
          </button>
        </div>
      </header>

      {/* Relatório — área que vai no PDF: dados que o cliente entende rápido */}
      <div className="print-area rounded-2xl border border-white/10 bg-[#181C23] p-6 print:bg-white print:border-gray-200 print:shadow-none">
        <div className="flex items-center justify-between mb-5 print:mb-4">
          <AlummaLogoFullInline theme="light" className="h-8" />
          <span className="text-xs text-gray-400 print:text-gray-500 font-medium">Relatório de Valorização</span>
        </div>

        {/* Identificação: cliente, produto, unidade, período */}
        <div className="mb-6 print:mb-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 print:bg-gray-50 print:border-gray-200">
          {nomeCliente.trim() && (
            <p className="text-sm font-bold text-white print:text-gray-900 mb-2">{nomeCliente.trim()}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {produto.trim() && (
              <p className="text-gray-300 print:text-gray-700"><span className="text-gray-500 print:text-gray-500 font-medium">Produto:</span> {produto.trim()}</p>
            )}
            {unidade.trim() && (
              <p className="text-gray-300 print:text-gray-700"><span className="text-gray-500 print:text-gray-500 font-medium">Unidade:</span> {unidade.trim()}</p>
            )}
          </div>
          <p className="text-xs text-gray-400 print:text-gray-500 mt-2">{periodoLabel}</p>
        </div>

        {/* Valores do negócio */}
        <div className="grid grid-cols-2 gap-4 mb-6 print:mb-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 print:bg-gray-50 print:border-gray-200">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide print:text-gray-500">Valor de contrato</p>
            <p className="text-lg font-bold text-white tabular-nums mt-1 print:text-gray-900">{formatCurrency(contratoNum)}</p>
            <p className="text-[10px] text-gray-500 print:text-gray-500 mt-0.5">capital aplicado</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 print:bg-gray-50 print:border-gray-200">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide print:text-gray-500">Valor atual</p>
            <p className="text-lg font-bold text-white tabular-nums mt-1 print:text-gray-900">{formatCurrency(atualNum)}</p>
            <p className="text-[10px] text-gray-500 print:text-gray-500 mt-0.5">avaliação atual</p>
          </div>
        </div>

        {/* Destaque: quanto ganhou, valorização, retorno — o cliente bate o olho e entende */}
        <div className="mb-6 print:mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 print:text-gray-600">Resultado do investimento</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border-2 border-[#D4A017]/40 bg-[#D4A017]/10 p-4 print:bg-amber-50 print:border-amber-300">
              <p className="text-[10px] font-medium text-[#E8C547] uppercase tracking-wide print:text-amber-800">Quanto ganhou</p>
              <p className={`text-xl font-bold tabular-nums mt-1 ${ganho >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-red-400 print:text-red-600'}`}>
                {temDados ? formatCurrency(ganho) : '—'}
              </p>
            </div>
            <div className="rounded-xl border-2 border-[#D4A017]/40 bg-[#D4A017]/10 p-4 print:bg-amber-50 print:border-amber-300">
              <p className="text-[10px] font-medium text-[#E8C547] uppercase tracking-wide print:text-amber-800">Valorização do imóvel</p>
              <p className={`text-xl font-bold tabular-nums mt-1 ${valorizacaoPct >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-red-400 print:text-red-600'}`}>
                {temDados ? formatPct(valorizacaoPct) : '—'}
              </p>
            </div>
            <div className="rounded-xl border-2 border-[#D4A017]/40 bg-[#D4A017]/10 p-4 print:bg-amber-50 print:border-amber-300">
              <p className="text-[10px] font-medium text-[#E8C547] uppercase tracking-wide print:text-amber-800">Retorno sobre capital aplicado</p>
              <p className={`text-xl font-bold tabular-nums mt-1 ${valorizacaoPct >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-red-400 print:text-red-600'}`}>
                {temDados ? formatPct(valorizacaoPct) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Frase de impacto */}
        <div className="rounded-xl border border-[#D4A017]/30 bg-[#D4A017]/10 p-4 mb-6 print:bg-amber-50 print:border-amber-200">
          <p className="text-sm font-semibold text-[#E8C547] print:text-amber-900 text-center leading-relaxed">
            {temDados
              ? valorizacaoPct >= 0
                ? `Seu investimento valorizou ${formatPct(valorizacaoPct)} no período. Você ganhou ${formatCurrency(ganho)} sobre o capital aplicado de ${formatCurrency(contratoNum)}.`
                : `No período, a variação foi de ${formatPct(valorizacaoPct)} (${formatCurrency(ganho)}).`
              : 'Preencha valor de contrato e valor atual para visualizar o resultado.'}
          </p>
        </div>

        {/* Gráfico em linha: capital na Selic x retorno do imóvel */}
        {temDados && chartData.pontos.length > 0 && (
          <div className="space-y-2 print:mb-0">
            <p className="text-xs font-medium text-gray-400 print:text-gray-600">Se o capital estivesse na Selic vs retorno do imóvel</p>
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} className="max-w-full h-auto" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="line-selic" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#64748b" />
                  </linearGradient>
                  <linearGradient id="line-imovel" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D4A017" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                {/* Grid leve */}
                {[0.25, 0.5, 0.75].map((t) => (
                  <line key={t} x1={pad.left} y1={pad.top + t * innerH} x2={pad.left + innerW} y2={pad.top + t * innerH} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} className="print:stroke-gray-300" />
                ))}
                {/* Eixo Y: valores */}
                <text x={pad.left - 4} y={pad.top} textAnchor="end" className="text-[9px] fill-gray-500 print:fill-gray-500" style={{ dominantBaseline: 'middle' }}>{formatCurrency(chartData.maxY)}</text>
                <text x={pad.left - 4} y={pad.top + innerH} textAnchor="end" className="text-[9px] fill-gray-500 print:fill-gray-500" style={{ dominantBaseline: 'middle' }}>{formatCurrency(chartData.minY)}</text>
                {/* Linha Selic */}
                <polyline
                  fill="none"
                  stroke="url(#line-selic)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="print:stroke-slate-500"
                  points={chartData.selic.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ')}
                />
                {/* Linha Imóvel */}
                <polyline
                  fill="none"
                  stroke={valorizacaoPct >= 0 ? 'url(#line-imovel)' : '#ef4444'}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={valorizacaoPct >= 0 ? 'print:stroke-emerald-500' : 'print:stroke-red-500'}
                  points={chartData.imovel.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ')}
                />
                {/* Eixo X: tempo */}
                <text x={pad.left} y={chartH - 6} textAnchor="middle" className="text-[9px] fill-gray-500 print:fill-gray-500">Início</text>
                <text x={pad.left + innerW} y={chartH - 6} textAnchor="middle" className="text-[9px] fill-gray-500 print:fill-gray-500">Hoje</text>
              </svg>
              <div className="flex flex-wrap gap-4 sm:flex-col sm:gap-2 text-[11px] print:text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 rounded-full bg-slate-400 print:bg-slate-500" />
                  <span className="text-gray-400 print:text-gray-600">Se na Selic ({SELIC_ANUAL_PCT}% a.a.)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-0.5 rounded-full ${valorizacaoPct >= 0 ? 'bg-emerald-500 print:bg-emerald-500' : 'bg-red-500 print:bg-red-500'}`} />
                  <span className="text-gray-400 print:text-gray-600">Retorno do imóvel</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
