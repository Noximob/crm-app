'use client';

import React from 'react';
import type { ImovelSelecaoNox } from '../types';

export type { ImovelSelecaoNox };

interface SelecaoNoxSlideProps {
  imoveis: ImovelSelecaoNox[];
  fraseRolante: string;
}

function formatPreco(p: string | number): string {
  if (typeof p === 'number' && !Number.isNaN(p)) {
    return p.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  }
  const s = String(p).trim();
  if (!s) return '—';
  const num = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  if (!Number.isNaN(num)) {
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  }
  return s;
}

export function SelecaoNoxSlide({ imoveis, fraseRolante }: SelecaoNoxSlideProps) {
  const list = imoveis.slice(0, 3);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-[#181C23] via-[#1a1f2e] to-[#181C23] text-white overflow-hidden">
      {/* Subtítulo no topo */}
      <p className="text-center text-[#A3C8F7]/90 text-lg md:text-xl pt-8 pb-4 px-4">
        com foco em valorização, localização estratégica e qualidade construtiva.
      </p>

      {/* 3 cards */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full max-w-6xl">
          {list.map((imovel, idx) => (
            <div
              key={idx}
              className="group bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-2xl hover:border-[#3478F6]/40 hover:shadow-[0_0_40px_-10px_rgba(52,120,246,0.4)] transition-all duration-500"
            >
              <div className="aspect-[4/3] relative overflow-hidden bg-[#23283A]">
                {imovel.imageUrl ? (
                  <img
                    src={imovel.imageUrl}
                    alt={imovel.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#6B6F76]">
                    <span className="text-4xl">🏠</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-base md:text-lg text-white leading-tight line-clamp-2 mb-1">
                  {imovel.titulo || 'Imóvel em destaque'}
                </h3>
                <p className="text-sm text-[#A3C8F7]/80 mb-2">{imovel.local || '—'}</p>
                <p className="text-lg font-bold text-[#3478F6]">{formatPreco(imovel.preco)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Faixa de frase rolante (rolagem contínua) */}
      <div className="border-t border-white/10 bg-[#23283A]/80 py-3 overflow-hidden">
        <div className="flex w-[200%] animate-marquee">
          <span className="inline-block w-1/2 shrink-0 text-center text-[#A3C8F7] text-lg md:text-xl font-medium whitespace-nowrap">
            {fraseRolante || 'Seleção Nox — os melhores imóveis para você.'}
          </span>
          <span className="inline-block w-1/2 shrink-0 text-center text-[#A3C8F7] text-lg md:text-xl font-medium whitespace-nowrap">
            {fraseRolante || 'Seleção Nox — os melhores imóveis para você.'}
          </span>
        </div>
      </div>
    </div>
  );
}
