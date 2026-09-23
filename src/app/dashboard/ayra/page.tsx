'use client';

/**
 * AYRA — o espaço do pré-lançamento Nox Imóveis × Santer.
 *
 * Botões pequenos em cima, e só isso:
 *   · Cronograma do pessoal    — a agenda de ação, escrita na tela;
 *   · Mídias de Apoio          — as artes de WhatsApp, com pop-up e download;
 *   · Apresentação V2          — a apresentação oficial, intocada. F11 = tela cheia;
 *   · Mapa Interativo de Penha — o mapa 3D, do mesmo jeito, também em F11.
 *
 * A aba escolhida vai pra URL (?aba=), então dá pra mandar o link direto.
 */
import React, { useEffect, useState } from 'react';
import Cronograma from './_components/Cronograma';
import Midias from './_components/Midias';
import Apresentacao from './_components/Apresentacao';
import { AYRA_APRESENTACAO_V2, AYRA_MAPA } from '@/lib/ayra';

type Aba = 'cronograma' | 'midias' | 'apresentacao-v2' | 'mapa';

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'cronograma', rotulo: 'Cronograma do pessoal' },
  { id: 'midias', rotulo: 'Mídias de Apoio' },
  { id: 'apresentacao-v2', rotulo: 'Apresentação V2' },
  { id: 'mapa', rotulo: 'Mapa Interativo de Penha' },
];

const ehAba = (v: string | null): v is Aba =>
  v === 'cronograma' || v === 'midias' || v === 'apresentacao-v2' || v === 'mapa';

export default function AyraPage() {
  const [aba, setAba] = useState<Aba>('cronograma');
  // Apresentação e mapa são pesados (vídeos, Cesium): cada um só carrega quando
  // é aberto e depois fica montado — sair e voltar não recomeça do zero.
  const [v2Montada, setV2Montada] = useState(false);
  const [mapaMontado, setMapaMontado] = useState(false);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('aba');
    if (ehAba(v)) setAba(v);
  }, []);

  useEffect(() => {
    if (aba === 'apresentacao-v2') setV2Montada(true);
    if (aba === 'mapa') setMapaMontado(true);
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
      {v2Montada && (
        <Apresentacao
          ativa={aba === 'apresentacao-v2'}
          src={AYRA_APRESENTACAO_V2}
          titulo="Ayra — Apresentação V2"
        />
      )}
      {mapaMontado && (
        <Apresentacao
          ativa={aba === 'mapa'}
          src={AYRA_MAPA}
          titulo="Mapa Interativo de Penha"
          dica={<><b className="text-white/80">F11</b> abre o mapa em tela cheia — é assim que ele fica bom pra apresentar</>}
        />
      )}
    </div>
  );
}
