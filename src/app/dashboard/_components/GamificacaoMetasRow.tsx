'use client';

import React from 'react';

const PONTOS_EXEMPLO = 2150;

const CoinIcon = ({ className = 'w-10 h-10' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="28" fill="url(#coinGold)" stroke="#E8C547" strokeWidth="2"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="#D4A017" strokeWidth="1" opacity="0.6"/>
    <circle cx="32" cy="28" r="6" fill="none" stroke="#B8860B" strokeWidth="1" opacity="0.5"/>
    <defs>
      <linearGradient id="coinGold" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F5D547"/>
        <stop offset="0.5" stopColor="#D4A017"/>
        <stop offset="1" stopColor="#B8860B"/>
      </linearGradient>
    </defs>
  </svg>
);

function formatMetaDate(dateStr: string | undefined): string {
  if (!dateStr) return '--';
  const s = String(dateStr).split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return '--';
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

export interface MetaPessoalData {
  valorAlmejado: number;
  alcancadoPessoal: number;
  metaInicio?: string;
  metaFim?: string;
}

interface CorretorRanking {
  id: string;
  nome: string;
}

interface GamificacaoMetasRowProps {
  pontos?: number;
  meta: any;
  nomeImobiliaria: string;
  corretores?: CorretorRanking[];
}

const CARD_BASE = 'rounded-xl border border-amber-500/25 flex flex-col relative overflow-hidden shadow-md';
const GLOW = 'absolute left-0 top-0 w-0.5 h-full bg-[#D4A017]';

export function GamificacaoMetasRow({ pontos = PONTOS_EXEMPLO, meta, nomeImobiliaria, corretores = [] }: GamificacaoMetasRowProps) {
  const top3 = corretores.slice(0, 3);
  const posicoes = ['1º', '2º', '3º'] as const;
  const progresso = meta?.percentual !== undefined ? meta.percentual : (meta?.valor > 0 ? Math.round(((meta?.alcancado ?? 0) / meta.valor) * 100) : 0);
  const progressoDisplay = progresso > 100 ? 100 : progresso;
  const getProgressColors = () => {
    if (progresso >= 100) return { barra: 'from-[#3AC17C] to-[#2E8B57]', percentual: 'text-[#3AC17C]' };
    if (progresso >= 75) return { barra: 'from-[#4CAF50] to-[#45A049]', percentual: 'text-[#4CAF50]' };
    if (progresso >= 50) return { barra: 'from-[#FF9800] to-[#F57C00]', percentual: 'text-[#FF9800]' };
    return { barra: 'from-[#E8C547] to-[#D4A017]', percentual: 'text-[#D4A017]' };
  };
  const colors = getProgressColors();

  return (
    <div className="space-y-1.5 mt-1">
      {/* Linha 1: Ranking (esquerda) | Meta Nox — só VGV total (direita) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* 1. Ranking — 1º, 2º, 3º com nomes dos corretores */}
        <div className={`${CARD_BASE} bg-[#23283A]/5 p-3`}>
          <div className={GLOW} />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400">🏆</span>
            <span className="font-bold text-white text-sm">Ranking</span>
          </div>
          <div className="space-y-1.5">
            {posicoes.map((pos, i) => {
              const c = top3[i];
              const isFirst = i === 0;
              const isSecond = i === 1;
              const isThird = i === 2;
              return (
                <div
                  key={c?.id || i}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded-lg border ${
                    isFirst ? 'bg-amber-500/10 border-amber-500/25' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-[10px] shrink-0 ${
                    isFirst ? 'bg-gradient-to-br from-amber-400 to-amber-600' : isSecond ? 'bg-gray-400/90' : 'bg-amber-700/90'
                  }`}>
                    {pos}
                  </span>
                  <span className="flex-1 min-w-0 font-medium text-white text-xs truncate">
                    {c?.nome || `Corretor ${i + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Meta Nox — somente VGV total (percentual em cima já explica) */}
        <div className={`${CARD_BASE} bg-[#23283A]/5 p-3`}>
          <div className={GLOW} />
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-bold text-white text-xs truncate">
              Metas{nomeImobiliaria ? ` — ${nomeImobiliaria}` : ''}
            </span>
            <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${colors.percentual} bg-white/10`}>
              {progresso}%
            </span>
          </div>
          <div className="text-xs font-bold text-amber-200/95 mb-2">
            {formatMetaDate(meta?.inicio)} → {formatMetaDate(meta?.fim)}
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[10px] text-amber-200/90 uppercase tracking-wide mb-0.5">VGV total</p>
            <p className="text-lg font-black text-[#E8C547] tabular-nums leading-tight">
              {meta?.valor != null ? meta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}
            </p>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
            <div className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${colors.barra}`} style={{ width: `${progressoDisplay}%` }} />
          </div>
        </div>
      </div>

      {/* Linha 2: Minhas Moedas — full width, estilo banner gamificado */}
      <div className={`${CARD_BASE} bg-gradient-to-r from-[#1a1a1e]/70 via-[#1a1a1e]/40 to-[#1a1a1e]/10 p-3`}>
        <div className={GLOW} />
        <div className="flex items-center justify-between gap-4">
          {/* Bloco de texto e pontos */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/25 border border-amber-400/50 shadow-[0_0_12px_rgba(248,191,59,0.45)]">
              <CoinIcon className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-amber-200/90 tracking-wide uppercase">
                Minhas Moedas
              </span>
              <span className="text-xl font-black text-[#F8D34A] tabular-nums leading-tight">
                {pontos.toLocaleString('pt-BR')}{' '}
                <span className="text-xs font-semibold text-amber-200/90">pontos</span>
              </span>
              <span className="text-[10px] text-amber-100/85 mt-0.5">
                Acumule moedas participando das ações da imobiliária.
              </span>
            </div>
          </div>

          {/* Ilustração de moedas empilhadas — inspirado no mockup */}
          <div className="relative w-28 h-16 shrink-0">
            {/* brilho de fundo */}
            <div className="absolute inset-x-2 bottom-0 h-6 bg-amber-500/40 blur-md rounded-full" />
            {/* moeda esquerda (mais baixa) */}
            <div className="absolute left-0 bottom-0 scale-75 origin-bottom">
              <CoinIcon className="w-12 h-12" />
            </div>
            {/* moeda central (principal) */}
            <div className="absolute left-5 bottom-1 scale-90 origin-bottom">
              <CoinIcon className="w-14 h-14" />
            </div>
            {/* moeda direita (um pouco mais alta) */}
            <div className="absolute right-0 bottom-2 scale-80 origin-bottom">
              <CoinIcon className="w-12 h-12" />
            </div>
            {/* estrelinhas de fundo para dar sensação de festa */}
            <span className="absolute top-1 left-3 text-xs text-amber-300/90">✦</span>
            <span className="absolute top-0 right-6 text-[10px] text-amber-200/90">✶</span>
            <span className="absolute top-4 right-2 text-[9px] text-amber-300/80">✦</span>
          </div>
        </div>
      </div>
    </div>
  );
}
