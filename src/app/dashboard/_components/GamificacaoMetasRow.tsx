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

interface GamificacaoMetasRowProps {
  pontos?: number;
  meta: any;
  nomeImobiliaria: string;
}

const CARD_BASE = 'rounded-xl border border-amber-500/25 flex flex-col relative overflow-hidden shadow-md';
const GLOW = 'absolute left-0 top-0 w-0.5 h-full bg-[#D4A017]';

export function GamificacaoMetasRow({ pontos = PONTOS_EXEMPLO, meta, nomeImobiliaria }: GamificacaoMetasRowProps) {
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
        {/* 1. Ranking dos corretores — no lugar das moedas */}
        <div className={`${CARD_BASE} bg-[#23283A]/30 backdrop-blur-sm p-3`}>
          <div className={GLOW} />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400">🏆</span>
            <span className="font-bold text-white text-sm">Ranking</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-[10px] shrink-0">1º</span>
              <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-sm shrink-0">👤</div>
              <span className="flex-1 min-w-0 font-semibold text-white text-xs truncate">Corretor destaque</span>
              <span className="text-[10px] font-bold text-amber-400 tabular-nums">2.450</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="w-5 h-5 rounded-full bg-gray-400/80 flex items-center justify-center text-white font-bold text-[9px] shrink-0">2º</span>
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">👤</div>
              <span className="flex-1 min-w-0 font-medium text-white/80 text-xs truncate">Segundo lugar</span>
              <span className="text-[9px] font-bold text-amber-200/90 tabular-nums">2.150</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="w-5 h-5 rounded-full bg-amber-700/90 flex items-center justify-center text-amber-200 font-bold text-[9px] shrink-0">3º</span>
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0">👤</div>
              <span className="flex-1 min-w-0 font-medium text-white/70 text-xs truncate">Terceiro lugar</span>
              <span className="text-[9px] font-bold text-amber-200/80 tabular-nums">1.890</span>
            </div>
          </div>
        </div>

        {/* 2. Meta Nox — somente VGV total (percentual em cima já explica) */}
        <div className={`${CARD_BASE} bg-[#23283A]/30 backdrop-blur-sm p-3`}>
          <div className={GLOW} />
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-bold text-white text-xs truncate">
              Metas{nomeImobiliaria ? ` — ${nomeImobiliaria}` : ''}
            </span>
            <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${colors.percentual} bg-white/10`}>
              {progresso}%
            </span>
          </div>
          <div className="text-[9px] text-amber-200/80 mb-2">
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

      {/* Linha 2: Minhas Moedas — full width, no lugar do ranking */}
      <div className={`${CARD_BASE} bg-[#23283A]/30 backdrop-blur-sm p-3`}>
        <div className={GLOW} />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-amber-500/20 border border-amber-500/30">
              <CoinIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-[#E8C547] text-sm">Minhas Moedas</span>
          </div>
          <div className="flex items-center gap-2">
            <CoinIcon className="w-8 h-8 text-amber-400 shrink-0" />
            <span className="text-xl font-black text-[#E8C547] tabular-nums">
              {pontos.toLocaleString('pt-BR')} <span className="text-sm font-semibold text-amber-200/90">pontos</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
