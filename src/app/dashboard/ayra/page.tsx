'use client';

/**
 * AYRA — o espaço do pré-lançamento Nox Imóveis × Santer.
 *
 * Três botões pequenos em cima, e só isso:
 *   · Cronograma do pessoal — a agenda de ação, escrita na tela;
 *   · Mídias de Apoio       — as artes de WhatsApp, com pop-up e download;
 *   · Apresentação          — a apresentação aprovada, intocada. F11 = tela cheia.
 *
 * A aba escolhida vai pra URL (?aba=), então dá pra mandar o link direto.
 */
import React, { useEffect, useState } from 'react';
import Cronograma from './_components/Cronograma';
import Midias from './_components/Midias';
import Apresentacao from './_components/Apresentacao';

type Aba = 'cronograma' | 'midias' | 'apresentacao';

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'cronograma', rotulo: 'Cronograma do pessoal' },
  { id: 'midias', rotulo: 'Mídias de Apoio' },
  { id: 'apresentacao', rotulo: 'Apresentação' },
];

const ehAba = (v: string | null): v is Aba => v === 'cronograma' || v === 'midias' || v === 'apresentacao';

export default function AyraPage() {
  const [aba, setAba] = useState<Aba>('cronograma');
  // A apresentação só carrega quando é aberta (os vídeos somam ~40 MB) e
  // depois fica montada: ir nas mídias e voltar não recomeça do slide 1.
  const [apresentacaoMontada, setApresentacaoMontada] = useState(false);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('aba');
    if (ehAba(v)) setAba(v);
  }, []);

  useEffect(() => {
    if (aba === 'apresentacao') setApresentacaoMontada(true);
  }, [aba]);

  const trocar = (a: Aba) => {
    setAba(a);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('aba', a);
      window.history.replaceState(window.history.state, '', url.toString());
    } catch { /* sem history: a aba troca mesmo assim */ }
  };

  return (
    <div className="p-2 sm:p-3 space-y-4">
      <div>
        <span className="gx-tag mb-2 inline-flex"><span>Pré-lançamento</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Ayra</h1>
        <p className="text-text-secondary text-[12.5px] mt-0.5">Nox Imóveis × Santer · material de uso interno</p>
        <div className="flex flex-wrap gap-1.5 mt-3" role="tablist">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => trocar(a.id)}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-extrabold uppercase tracking-wider border transition-colors ${
                aba === a.id
                  ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] border-[#FF1E56]/60 text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                  : 'border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>

      {aba === 'cronograma' && <Cronograma />}
      {aba === 'midias' && <Midias />}
      {apresentacaoMontada && <Apresentacao ativa={aba === 'apresentacao'} />}
    </div>
  );
}
