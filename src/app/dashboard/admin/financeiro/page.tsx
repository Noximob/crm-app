'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
  </svg>
);
const WalletIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m2 4h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z" />
  </svg>
);
const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const TrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ReceiptIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const PercentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="19" r="3" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function formatCurrency(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

/** Dados mock para o template — baseado em CRMs imobiliários e ferramentas (QuickBooks, ZeroPaper, Supremo CRM) */
const MOCK = {
  periodo: 'Fevereiro 2025',
  saldoAtual: 84750,
  entradasPeriodo: 124300,
  saidasPeriodo: 39550,
  contasAReceber: 18200,
  contasAPagar: 8700,
  comissoesPendentes: 15600,
  comissoesAprovadas: 4200,
  comissoesPagas: 18900,
  fluxoMeses: [
    { mes: 'Nov', entrada: 98000, saida: 62000 },
    { mes: 'Dez', entrada: 112000, saida: 58000 },
    { mes: 'Jan', entrada: 105000, saida: 72000 },
    { mes: 'Fev', entrada: 124300, saida: 39550 },
  ],
  contasAPagarLista: [
    { desc: 'Aluguel escritório', venc: '05/03', valor: 4500 },
    { desc: 'Fornecedor marketing', venc: '12/03', valor: 2200 },
    { desc: 'Conta de luz', venc: '15/03', valor: 2000 },
  ],
  contasAReceberLista: [
    { desc: 'Comissão venda Imóvel A', venc: '28/02', valor: 8200 },
    { desc: 'Taxa administração', venc: '10/03', valor: 5000 },
    { desc: 'Comissão aluguel', venc: '15/03', valor: 5000 },
  ],
  comissoesLista: [
    { corretor: 'Ana Silva', venda: 'R$ 450.000', pct: 3, valor: 13500, status: 'pendente' },
    { corretor: 'Bruno Costa', venda: 'R$ 280.000', pct: 3, valor: 8400, status: 'aprovada' },
    { corretor: 'Carla Mendes', venda: 'R$ 520.000', pct: 2.5, valor: 13000, status: 'paga' },
  ],
  movimentacoesRecentes: [
    { data: '19/02', desc: 'Comissão venda — Torre B', tipo: 'entrada', valor: 12000 },
    { data: '18/02', desc: 'Pagamento fornecedor', tipo: 'saida', valor: 3500 },
    { data: '17/02', desc: 'Taxa de administração', tipo: 'entrada', valor: 2200 },
  ],
};

export default function FinanceiroPage() {
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre'>('mes');

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f1115] text-[#1e293b] dark:text-gray-100">
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6">
        <Link href="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:underline mb-6">
          <ArrowLeftIcon className="h-4 w-4" /> Voltar ao administrador
        </Link>

        {/* Título e período */}
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Financeiro</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Controle de caixa, fluxo e comissões da imobiliária</p>
          <div className="flex items-center gap-2 mt-3">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as 'mes' | 'trimestre')}
              className="text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 px-3 py-1.5 text-gray-700 dark:text-gray-300"
            >
              <option value="mes">Este mês</option>
              <option value="trimestre">Este trimestre</option>
            </select>
          </div>
        </header>

        {/* Resumo — cards principais (estilo Alumma) */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            Visão geral
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <WalletIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">Saldo atual</p>
              </div>
              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">{formatCurrency(MOCK.saldoAtual)}</p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUpIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300">Entradas (período)</p>
              </div>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-200 tabular-nums">{formatCurrency(MOCK.entradasPeriodo)}</p>
            </div>
            <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/80 dark:bg-red-500/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-[10px] font-medium text-red-800 dark:text-red-300">Saídas (período)</p>
              </div>
              <p className="text-lg font-bold text-red-900 dark:text-red-200 tabular-nums">{formatCurrency(MOCK.saidasPeriodo)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <ReceiptIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">A receber</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(MOCK.contasAReceber)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-1">
                <ReceiptIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">A pagar</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(MOCK.contasAPagar)}</p>
            </div>
          </div>
        </section>

        {/* Fluxo de caixa — barras (estilo relatório individual) */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            Fluxo de caixa
          </h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {MOCK.fluxoMeses.map((f) => {
                const max = Math.max(...MOCK.fluxoMeses.flatMap((m) => [m.entrada, m.saida]));
                return (
                  <div key={f.mes} className="flex flex-col items-center min-w-[64px]">
                    <div className="h-24 flex flex-col justify-end gap-1 mb-2">
                      <div
                        className="w-6 rounded-t bg-amber-500/80 dark:bg-amber-500/60"
                        style={{ height: `${(f.entrada / max) * 80}px` }}
                        title={`Entrada: ${formatCurrency(f.entrada)}`}
                      />
                      <div
                        className="w-6 rounded-t bg-red-500/60 dark:bg-red-500/40"
                        style={{ height: `${(f.saida / max) * 80}px` }}
                        title={`Saída: ${formatCurrency(f.saida)}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">{f.mes}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded bg-amber-500" /> Entradas
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded bg-red-500" /> Saídas
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contas a pagar */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-amber-500" />
              Contas a pagar
            </h2>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-gray-100 dark:divide-white/10">
              {MOCK.contasAPagarLista.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{c.desc}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Venc: {c.venc}</p>
                  </div>
                  <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums">-{formatCurrency(c.valor)}</span>
                </div>
              ))}
              <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                Total: {formatCurrency(MOCK.contasAPagar)}
              </div>
            </div>
          </section>

          {/* Contas a receber */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-amber-500" />
              Contas a receber
            </h2>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-gray-100 dark:divide-white/10">
              {MOCK.contasAReceberLista.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{c.desc}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Venc: {c.venc}</p>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatCurrency(c.valor)}</span>
                </div>
              ))}
              <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                Total: {formatCurrency(MOCK.contasAReceber)}
              </div>
            </div>
          </section>
        </div>

        {/* Comissões — específico imobiliário */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            Comissões
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 p-2">
              <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300">Pendentes</p>
              <p className="text-base font-bold text-amber-900 dark:text-amber-200 tabular-nums">{formatCurrency(MOCK.comissoesPendentes)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-2">
              <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Aprovadas</p>
              <p className="text-base font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(MOCK.comissoesAprovadas)}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/10 p-2">
              <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">Pagas (período)</p>
              <p className="text-base font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">{formatCurrency(MOCK.comissoesPagas)}</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-gray-400">Corretor</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-gray-400">Venda</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-gray-400">%</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600 dark:text-gray-400">Valor</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK.comissoesLista.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-white/5">
                    <td className="py-2 px-4 font-medium text-gray-900 dark:text-white">{c.corretor}</td>
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400">{c.venda}</td>
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400">{c.pct}%</td>
                    <td className="py-2 px-4 text-right font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(c.valor)}</td>
                    <td className="py-2 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          c.status === 'paga'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : c.status === 'aprovada'
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {c.status === 'paga' ? 'Paga' : c.status === 'aprovada' ? 'Aprovada' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Movimentações recentes */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            Movimentações recentes
          </h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-gray-100 dark:divide-white/10">
            {MOCK.movimentacoesRecentes.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{m.desc}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.data}</p>
                </div>
                <span
                  className={`font-semibold tabular-nums ${
                    m.tipo === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {m.tipo === 'entrada' ? '+' : '-'}{formatCurrency(m.valor)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Rodapé — DRE / Relatórios (placeholder) */}
        <section className="mt-6">
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50/50 dark:bg-white/5 p-6 text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">DRE gerencial e relatórios financeiros</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Em breve: exportação, filtros e integração</p>
          </div>
        </section>
      </div>
    </div>
  );
}
