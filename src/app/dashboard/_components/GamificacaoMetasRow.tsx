'use client';

import React from 'react';

const PONTOS_EXEMPLO = 2150;

// Ícone de moeda dourada
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

  const cardBase = 'rounded-2xl border-2 border-[#D4A017]/30 bg-gradient-to-br from-[#23283A] to-[#181C23] flex flex-col relative overflow-hidden shadow-lg';
  const glowLeft = 'absolute left-0 top-0 w-1 h-full bg-[#D4A017]';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      {/* 1. Minhas Moedas — igual à foto: título + ícone pequeno no topo, moeda grande + pontos abaixo (nosso background) */}
      <div className={`${cardBase} p-5 min-h-[140px]`}>
        <div className={glowLeft} />
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
            <CoinIcon className="w-6 h-6" />
          </div>
          <span className="font-bold text-[#E8C547] text-base tracking-tight">Minhas Moedas</span>
        </div>
        <div className="flex items-center gap-3 flex-1">
          <CoinIcon className="w-12 h-12 text-amber-400 shrink-0" />
          <span className="text-2xl font-black text-[#E8C547] tabular-nums">
            {pontos.toLocaleString('pt-BR')} <span className="text-base font-semibold text-amber-200/90">pontos</span>
          </span>
        </div>
      </div>

      {/* 2. Meta da imobiliária (conteúdo que estava no card do topo) */}
      <div className={`${cardBase} p-4`}>
        <div className={glowLeft} />
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="h-5 w-5 text-[#D4A017] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span className="font-bold text-white text-sm tracking-tight truncate">
              Metas{nomeImobiliaria ? ` — ${nomeImobiliaria}` : ''}
            </span>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${colors.percentual} bg-white/10 border border-current/20`}>
            {progresso}%
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#E8C547] mb-2">
          <span>Início: {formatMetaDate(meta?.inicio)}</span>
          <span>|</span>
          <span>Fim: {formatMetaDate(meta?.fim)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-[#E8C547]">VGV da Meta</span>
            <span className="text-sm font-bold text-[#D4A017] truncate">
              {meta?.valor != null ? meta.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}
            </span>
          </div>
          <div className="flex flex-col items-end min-w-0">
            <span className="text-[10px] text-[#E8C547]">Realizado</span>
            <span className={`text-sm font-bold ${progresso >= 100 ? 'text-[#3AC17C]' : 'text-[#D4A017]'}`}>
              {typeof meta?.alcancado === 'number' ? meta.alcancado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '--'}
            </span>
          </div>
        </div>
        <div className="w-full h-2 bg-[#23283A] rounded-full overflow-hidden mt-2">
          <div className={`h-2 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${colors.barra}`} style={{ width: `${progressoDisplay}%` }} />
        </div>
      </div>
    </div>
  );
}
