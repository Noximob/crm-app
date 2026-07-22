"use client";

/**
 * CRM e Agenda do Corretor — visão unificada: um clique só, e lá dentro
 * alterna entre o CRM (leads/tarefas) e a Agenda de cada corretor.
 * As duas abas ficam MONTADAS (a inativa fica hidden) pra não perder a
 * seleção/estado ao alternar.
 */
import React, { useEffect, useState } from 'react';
import CrmDoCorretor from './_tabs/CrmDoCorretor';
import AgendaDoCorretor from './_tabs/AgendaDoCorretor';

type Aba = 'crm' | 'agenda';

export default function CorretorPage() {
  const [aba, setAba] = useState<Aba>('crm');

  // ?tab= na URL (deep-link + voltar dos redirects antigos), sem recarregar
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'agenda' || t === 'crm') setAba(t);
  }, []);
  const trocar = (t: Aba) => {
    setAba(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.replaceState(null, '', url.toString());
  };

  const pill = (t: Aba, label: string) => (
    <button
      type="button"
      onClick={() => trocar(t)}
      className={`px-4 py-1.5 rounded-full text-[12px] font-extrabold uppercase tracking-wider border transition-colors ${
        aba === t
          ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] border-[#FF1E56]/60 text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
          : 'border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">CRM e Agenda do Corretor</h1>
          <div className="flex items-center gap-1.5">
            {pill('crm', '🔎 CRM')}
            {pill('agenda', '📅 Agenda')}
          </div>
        </div>
      </div>
      <div className={aba === 'crm' ? '' : 'hidden'}><CrmDoCorretor /></div>
      <div className={aba === 'agenda' ? '' : 'hidden'}><AgendaDoCorretor /></div>
    </div>
  );
}
