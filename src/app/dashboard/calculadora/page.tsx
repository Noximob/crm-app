'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import MoneyInput from '@/components/MoneyInput';
import FluxoTab from './_tabs/Fluxo';
import InvestidorTab from './_tabs/Investidor';
import type { HeaderImovel } from './_tabs/shared';

type Tab = 'fluxo' | 'investidor';

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-[15px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 transition';
const Campo = ({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-text-secondary mt-1">{hint}</p>}
  </div>
);

const TABS: [Tab, string][] = [
  ['fluxo', 'Fluxo de Pagamento'],
  ['investidor', 'Investidor (TIR)'],
];

function CalculadoraInner() {
  const sp = useSearchParams();
  const spTab: Tab = sp.get('tab') === 'investidor' ? 'investidor' : 'fluxo';
  const [tab, setTab] = useState<Tab>(spTab);
  useEffect(() => { setTab(spTab); }, [spTab]);

  // ---- dados do imóvel: digitados UMA vez, usados pelas duas abas ----
  const [empreendimento, setEmpreendimento] = useState('');
  const [unidade, setUnidade] = useState('');
  const [torre, setTorre] = useState('');
  const [cliente, setCliente] = useState('');
  const [valorImovel, setValorImovel] = useState(0);
  const header: HeaderImovel = { empreendimento, unidade, torre, cliente, valorImovel };

  const selectTab = (t: Tab) => {
    setTab(t);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', t === 'investidor' ? `${window.location.pathname}?tab=investidor` : window.location.pathname);
    }
  };

  return (
    <div className="min-h-full py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="al-display text-2xl font-bold text-white uppercase tracking-[0.08em]">Calculadora</h1>
          <p className="text-sm text-text-secondary">
            {tab === 'fluxo'
              ? 'Monte a proposta em R$ ou em % — cada campo tem o seletor. Gere o PDF com a logo da Nox. Nada é salvo.'
              : 'Valorização e alavancagem até a venda: quanto o investidor coloca, quanto vira patrimônio e a TIR do dinheiro. Nada é salvo.'}
          </p>
        </div>

        {/* ---- abas ---- */}
        <div className="flex sm:inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1 gap-1 mb-4">
          {TABS.map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => selectTab(t)}
              className={`flex-1 sm:flex-none px-1.5 sm:px-5 py-2 rounded-lg text-[10.5px] sm:text-[13px] font-extrabold uppercase tracking-wide sm:tracking-wider whitespace-nowrap transition-all ${
                tab === t
                  ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_0_16px_rgba(255,30,86,0.45)]'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ---- imóvel (compartilhado entre as abas) ---- */}
        <div className="al-card relative overflow-hidden rounded-2xl p-5 mb-4">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 mb-4">
            <span className="h-4 w-1 self-center rounded-full bg-gradient-to-b from-[#FF1E56] to-[#A50D38] shadow-[0_0_8px_rgba(255,30,86,0.5)]" />
            <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Imóvel</h2>
            <span className="text-[11px] text-text-secondary">digite uma vez — vale para as duas abas</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Campo label="Empreendimento"><input value={empreendimento} onChange={(e) => setEmpreendimento(e.target.value)} placeholder="Ex: Orla da Barra" className={inputCls} /></Campo>
            <Campo label="Unidade"><input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Ex: Apto 1405" className={inputCls} /></Campo>
            <Campo label="Torre"><input value={torre} onChange={(e) => setTorre(e.target.value)} placeholder="Ex: Torre B" className={inputCls} /></Campo>
            <Campo label="Cliente (opcional)"><input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" className={inputCls} /></Campo>
            <Campo label="Valor do imóvel"><MoneyInput value={valorImovel} onChange={setValorImovel} placeholder="500.000,00" className={inputCls} /></Campo>
          </div>
        </div>

        {/* ---- conteúdo das abas (as duas ficam montadas p/ não perder o que foi digitado) ---- */}
        <div className={tab === 'fluxo' ? '' : 'hidden'}><FluxoTab header={header} /></div>
        <div className={tab === 'investidor' ? '' : 'hidden'}><InvestidorTab header={header} /></div>
      </div>
    </div>
  );
}

export default function CalculadoraPage() {
  return (
    <Suspense fallback={null}>
      <CalculadoraInner />
    </Suspense>
  );
}
