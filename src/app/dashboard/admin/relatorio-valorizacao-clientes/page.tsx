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
  const [valorAplicado, setValorAplicado] = useState<number>(0);
  const [valorAtual, setValorAtual] = useState<number>(0);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { ganho, rentabilidadePct } = useMemo(() => {
    const aplicado = Number(valorAplicado) || 0;
    const atual = Number(valorAtual) || 0;
    const ganho = aplicado > 0 ? atual - aplicado : 0;
    const rentabilidadePct = aplicado > 0 ? (ganho / aplicado) * 100 : 0;
    return { ganho, rentabilidadePct };
  }, [valorAplicado, valorAtual]);

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

  const aplicadoNum = Number(valorAplicado) || 0;
  const atualNum = Number(valorAtual) || 0;
  const maxBar = Math.max(aplicadoNum, atualNum, 1);
  const barAplicadoPct = (aplicadoNum / maxBar) * 100;
  const barAtualPct = (atualNum / maxBar) * 100;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 1rem; background: #fff; }
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
        <p className="text-xs text-gray-400 mb-4">Preencha os dados para montar o dashboard de valorização para o cliente investidor.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome do cliente ou portfolio</label>
            <input
              type="text"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              placeholder="Ex.: João Silva Investimentos"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#D4A017]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Valor aplicado (R$)</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={valorAplicado || ''}
              onChange={(e) => setValorAplicado(Number(e.target.value) || 0)}
              placeholder="Ex.: 500000"
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
              placeholder="Ex.: 575000"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#D4A017]/50 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Data início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A017]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Data fim</label>
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
            disabled={valorAplicado <= 0 && valorAtual <= 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4A017] text-white font-semibold text-sm hover:bg-[#B8860B] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <PdfIcon className="h-5 w-5" />
            Baixar PDF
          </button>
        </div>
      </header>

      {/* Dashboard — área que vai no PDF: enxuto, fácil de entender */}
      <div className="print-area rounded-2xl border border-white/10 bg-[#181C23] p-6 print:bg-white print:border-gray-200 print:shadow-none">
        <div className="flex items-center justify-between mb-6 print:mb-4">
          <AlummaLogoFullInline theme="light" className="h-8" />
          <span className="text-xs text-gray-400 print:text-gray-500">Relatório de Valorização</span>
        </div>

        {nomeCliente.trim() && (
          <p className="text-sm font-semibold text-white print:text-gray-800 mb-1">{nomeCliente.trim()}</p>
        )}
        <p className="text-xs text-gray-400 print:text-gray-500 mb-6">{periodoLabel}</p>

        {/* KPIs em linha — bater o olho e entender */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 print:mb-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 print:bg-gray-50 print:border-gray-200">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide print:text-gray-500">Valor aplicado</p>
            <p className="text-lg font-bold text-white tabular-nums mt-1 print:text-gray-900">{formatCurrency(aplicadoNum)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 print:bg-gray-50 print:border-gray-200">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide print:text-gray-500">Valor atual</p>
            <p className="text-lg font-bold text-white tabular-nums mt-1 print:text-gray-900">{formatCurrency(atualNum)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 print:bg-gray-50 print:border-gray-200">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide print:text-gray-500">Rentabilidade</p>
            <p className={`text-lg font-bold tabular-nums mt-1 ${rentabilidadePct >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-red-400 print:text-red-600'}`}>
              {formatPct(rentabilidadePct)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 print:bg-gray-50 print:border-gray-200">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide print:text-gray-500">Ganho / Perda</p>
            <p className={`text-lg font-bold tabular-nums mt-1 ${ganho >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-red-400 print:text-red-600'}`}>
              {formatCurrency(ganho)}
            </p>
          </div>
        </div>

        {/* Frase de impacto */}
        <div className="rounded-xl border border-[#D4A017]/30 bg-[#D4A017]/10 p-4 mb-6 print:bg-amber-50 print:border-amber-200">
          <p className="text-sm font-semibold text-[#E8C547] print:text-amber-900 text-center">
            {aplicadoNum > 0
              ? rentabilidadePct >= 0
                ? `Seu investimento valorizou ${formatPct(rentabilidadePct)} no período (${formatCurrency(ganho)}).`
                : `No período, a variação foi de ${formatPct(rentabilidadePct)} (${formatCurrency(ganho)}).`
              : 'Informe valor aplicado e valor atual para ver a valorização.'}
          </p>
        </div>

        {/* Barras comparativas — visual enxuto */}
        {aplicadoNum > 0 || atualNum > 0 ? (
          <div className="space-y-3 print:mb-0">
            <p className="text-xs font-medium text-gray-400 print:text-gray-600">Comparativo</p>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 print:text-gray-500 mb-0.5">
                  <span>Aplicado</span>
                  <span className="tabular-nums">{formatCurrency(aplicadoNum)}</span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden print:bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#D4A017] to-[#E8C547] print:bg-amber-400 transition-all duration-500"
                    style={{ width: `${barAplicadoPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 print:text-gray-500 mb-0.5">
                  <span>Atual</span>
                  <span className="tabular-nums">{formatCurrency(atualNum)}</span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden print:bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${rentabilidadePct >= 0 ? 'bg-emerald-500 print:bg-emerald-400' : 'bg-red-500 print:bg-red-400'}`}
                    style={{ width: `${barAtualPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
