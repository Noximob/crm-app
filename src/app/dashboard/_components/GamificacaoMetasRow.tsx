'use client';

import React from 'react';

const PONTOS_EXEMPLO = 2150;

/* Moeda premium SVG — brilho, relevo, sem conflito de ID */
const CoinPremium = ({ className = 'w-10 h-10', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="coinShine" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFF5B8"/>
        <stop offset="0.25" stopColor="#FFE066"/>
        <stop offset="0.5" stopColor="#F5D547"/>
        <stop offset="0.75" stopColor="#D4A017"/>
        <stop offset="1" stopColor="#B8860B"/>
      </linearGradient>
      <linearGradient id="coinEdge" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E8C547"/>
        <stop offset="0.5" stopColor="#B8860B"/>
        <stop offset="1" stopColor="#8B6914"/>
      </linearGradient>
      <filter id="coinGlowSoft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="32" cy="32" r="26" fill="url(#coinEdge)" opacity="0.5"/>
    <circle cx="32" cy="32" r="24" fill="url(#coinShine)" stroke="url(#coinEdge)" strokeWidth="2" filter="url(#coinGlowSoft)"/>
    <ellipse cx="32" cy="26" rx="10" ry="6" fill="rgba(255,255,255,0.4)"/>
    <circle cx="32" cy="32" r="18" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
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
    <div className="flex flex-col flex-1 min-h-0 gap-1 mt-0.5">
      {/* Linha 1: Ranking (esquerda) | Meta Nox — só VGV total (direita) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
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

    </div>
  );
}
