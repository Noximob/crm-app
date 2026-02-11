'use client';

import React from 'react';
import type { UnidadeSelecao } from '../types';

interface UnidadesSelecaoSlideProps {
  /** Título desta seleção (nome do imóvel do Seleção Nox) */
  tituloSelecao: string;
  /** As 3 unidades desta seleção */
  unidades: UnidadeSelecao[];
}

function formatValor(p: string | number): string {
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

/** Um slide = uma das 3 seleções Nox, com 3 unidades em cards (mesmo estilo do Seleção Nox: foto em cima, título + valor + descritivo embaixo) */
export function UnidadesSelecaoSlide({ tituloSelecao, unidades }: UnidadesSelecaoSlideProps) {
  const list = (unidades?.length ? unidades : []).slice(0, 3);
  const fill = list.length < 3 ? list.concat(Array(3 - list.length).fill(null)) : list;

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-[#181C23] via-[#1a1f2e] to-[#181C23] text-white overflow-hidden">
      <p className="text-center text-[#FCD34D]/90 text-lg md:text-xl pt-8 pb-4 px-4">
        Unidades em destaque
      </p>
      <p className="text-center text-white font-semibold text-xl md:text-2xl pb-6 px-4">
        {tituloSelecao || 'Seleção'}
      </p>

      <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full max-w-6xl">
          {fill.map((unidad, idx) => (
            <div
              key={idx}
              className="group bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-2xl hover:border-[#F59E0B]/40 hover:shadow-[0_0_40px_-10px_rgba(52,120,246,0.4)] transition-all duration-500"
            >
              <div className="aspect-[4/3] relative overflow-hidden bg-[#23283A]">
                {unidad?.imageUrl ? (
                  <img
                    src={unidad.imageUrl}
                    alt={unidad.titulo || ''}
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
                  {unidad?.titulo || 'Unidade em destaque'}
                </h3>
                <p className="text-lg font-bold text-[#F59E0B] mb-2">
                  {unidad != null && unidad.valor !== undefined && unidad.valor !== '' ? formatValor(unidad.valor) : '—'}
                </p>
                <p className="text-sm text-[#FCD34D]/80 line-clamp-3">
                  {unidad?.descritivo || '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
