'use client';

import React from 'react';

const PONTOS_EXEMPLO = 2150;

const CoinIcon = ({ className = 'w-10 h-10' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="coinGold" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFE066"/>
        <stop offset="0.4" stopColor="#F5D547"/>
        <stop offset="0.7" stopColor="#D4A017"/>
        <stop offset="1" stopColor="#B8860B"/>
      </linearGradient>
      <filter id="coinGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#coinGold)" stroke="#E8C547" strokeWidth="2" filter="url(#coinGlow)"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
    <circle cx="32" cy="28" r="6" fill="none" stroke="#B8860B" strokeWidth="1" opacity="0.6"/>
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
    <div className="space-y-1 mt-0.5">
      {/* Linha 1: Ranking (esquerda) | Meta Nox — só VGV total (direita) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* 1. Ranking — 1º, 2º, 3º com nomes dos corretores */}
        <div className={`${CARD_BASE} bg-[#23283A]/5 p-2`}>
          <div className={GLOW} />
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-amber-400 text-sm">🏆</span>
            <span className="font-bold text-white text-xs">Ranking</span>
          </div>
          <div className="space-y-1">
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
        <div className={`${CARD_BASE} bg-[#23283A]/5 p-2`}>
          <div className={GLOW} />
          <div className="flex items-center justify-between gap-1.5 mb-0.5">
            <span className="font-bold text-white text-[11px] truncate">
              Metas{nomeImobiliaria ? ` — ${nomeImobiliaria}` : ''}
            </span>
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${colors.percentual} bg-white/10`}>
              {progresso}%
            </span>
          </div>
          <div className="text-[10px] font-bold text-amber-200/95 mb-1">
            {formatMetaDate(meta?.inicio)} → {formatMetaDate(meta?.fim)}
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[9px] text-amber-200/90 uppercase tracking-wide mb-0.5">VGV total</p>
            <p className="text-base font-black text-[#E8C547] tabular-nums leading-tight">
              {meta?.valor != null ? meta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}
            </p>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
            <div className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${colors.barra}`} style={{ width: `${progressoDisplay}%` }} />
          </div>
        </div>
      </div>

      {/* Linha 2: Minhas Moedas — compacto + gamificado (evita barra de rolagem) */}
      <div className={`${CARD_BASE} p-2 min-h-0 overflow-hidden bg-gradient-to-r from-[#1a1510]/90 via-[#1a1612]/70 to-[#0d0a08]/80 border-amber-500/30 shadow-[0_0_20px_rgba(212,160,23,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]`}>
        <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-amber-300 via-[#D4A017] to-amber-600 rounded-r-full shadow-[0_0_10px_rgba(212,160,23,0.5)]" />
        <div className="flex items-center justify-between gap-2 pl-1">
          {/* Esquerda: ícone + título + pontos em linha compacta */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1 rounded-lg bg-amber-500/30 border border-amber-400/50 shadow-[0_0_10px_rgba(248,191,59,0.4)] ring-1 ring-amber-300/20 shrink-0">
              <CoinIcon className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
              <span className="text-[10px] font-bold text-amber-200/95 tracking-wide uppercase shrink-0">
                Minhas Moedas
              </span>
              <span className="text-base font-black text-[#F8D34A] tabular-nums leading-none drop-shadow-[0_0_8px_rgba(248,211,74,0.5)]">
                {pontos.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] font-semibold text-amber-200/80 shrink-0">pts</span>
            </div>
          </div>

          {/* Direita: pilha de moedas menor + brilho */}
          <div className="relative w-20 h-10 shrink-0 flex items-end justify-end">
            <div className="absolute inset-0 bottom-0 h-4 bg-amber-500/30 blur-md rounded-full scale-75 origin-bottom" />
            <div className="absolute right-0 bottom-0 scale-75 origin-bottom">
              <CoinIcon className="w-8 h-8" />
            </div>
            <div className="absolute right-4 bottom-0.5 scale-90 origin-bottom">
              <CoinIcon className="w-9 h-9" />
            </div>
            <div className="absolute right-8 bottom-1 scale-70 origin-bottom">
              <CoinIcon className="w-7 h-7" />
            </div>
            <span className="absolute top-0 right-2 text-[8px] text-amber-300/80">✦</span>
            <span className="absolute top-1 right-6 text-[7px] text-amber-200/70">✶</span>
          </div>
        </div>
      </div>
    </div>
  );
}
