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

const TargetIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

function formatMetaDate(dateStr: string | undefined): string {
  if (!dateStr) return '--';
  const s = String(dateStr).split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return '--';
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

function diasRestantes(fimStr: string | undefined): number | null {
  if (!fimStr) return null;
  const s = String(fimStr).split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  const fim = new Date(y, m - 1, d);
  fim.setHours(23, 59, 59, 999);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export interface MetaPessoalData {
  valorAlmejado: number;
  alcancadoPessoal: number;
  metaInicio?: string;
  metaFim?: string;
}

interface GamificacaoMetasRowProps {
  pontos?: number;
  metaPessoal: MetaPessoalData | null;
  metaInicio?: string;
  metaFim?: string;
}

export function GamificacaoMetasRow({ pontos = PONTOS_EXEMPLO, metaPessoal, metaInicio, metaFim }: GamificacaoMetasRowProps) {
  const valorAlmejado = metaPessoal?.valorAlmejado ?? 0;
  const alcancado = metaPessoal?.alcancadoPessoal ?? 0;
  const percentualPessoal = valorAlmejado > 0 ? Math.min(100, Math.round((alcancado / valorAlmejado) * 100)) : 0;
  const dias = diasRestantes(metaFim ?? metaPessoal?.metaFim);

  const cardBase = 'rounded-lg border border-amber-500/30 bg-gradient-to-br from-[#23283A] to-[#181C23] p-2.5 flex flex-col relative overflow-hidden';
  const glowLeft = 'absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-amber-400 to-amber-600';

  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {/* 1. Minhas Moedas (esquerda) */}
      <div className={`${cardBase} shadow-md hover:shadow-amber-500/10 transition-shadow`}>
        <div className={glowLeft} />
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="p-1 rounded bg-amber-500/20">
            <CoinIcon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold text-amber-200/90 uppercase tracking-wide">Minhas Moedas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CoinIcon className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-base font-black text-amber-400 tabular-nums leading-tight">
            {pontos.toLocaleString('pt-BR')} <span className="text-[10px] font-semibold text-white/80">pts</span>
          </span>
        </div>
        <div className="absolute bottom-0.5 right-0.5 opacity-20 pointer-events-none">
          <div className="flex -space-x-1">
            {[1, 2].map((i) => (
              <CoinIcon key={i} className="w-3 h-3" />
            ))}
          </div>
        </div>
      </div>

      {/* 2. Minha Meta (meio) — sempre mostra layout; se não setou meta fica zerado */}
      <div className={`${cardBase} shadow-md hover:shadow-amber-500/10 transition-shadow`}>
        <div className={glowLeft} />
        <div className="flex items-center gap-1 mb-0.5">
          <TargetIcon className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[10px] font-semibold text-amber-200/90 uppercase tracking-wide">Minha Meta</span>
        </div>
        <div className="text-[9px] text-amber-200/70">
          {formatMetaDate(metaInicio)} → {formatMetaDate(metaFim)}
        </div>
        <div className="mt-1 space-y-0.5">
          <div className="flex justify-between items-baseline gap-1">
            <span className="text-[9px] text-amber-200/80">Almejado</span>
            <span className="text-xs font-bold text-amber-400 truncate">
              {valorAlmejado > 0 ? valorAlmejado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0'}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-1">
            <span className="text-[9px] text-amber-200/80">Realizado</span>
            <span className="text-xs font-bold text-white">
              {alcancado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-1">
            <span className="text-[9px] text-amber-200/80">% feito</span>
            <span className={`text-xs font-bold ${percentualPessoal >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {percentualPessoal}%
            </span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${percentualPessoal >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`}
              style={{ width: `${Math.min(percentualPessoal, 100)}%` }}
            />
          </div>
          {dias !== null && (
            <p className="text-[9px] text-amber-200/80">
              {dias > 0 ? `${dias} dias` : dias === 0 ? 'Último dia' : 'Encerrado'}
            </p>
          )}
        </div>
      </div>

      {/* 3. Conquistas (direita) */}
      <div className={`${cardBase} shadow-md hover:shadow-amber-500/10 transition-shadow`}>
        <div className={glowLeft} />
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[10px] font-semibold text-amber-200/90 uppercase tracking-wide">Conquistas</span>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[56px] relative">
          <div className="flex items-end gap-0.5">
            <CoinIcon className="w-6 h-6 text-amber-400/90" />
            <CoinIcon className="w-7 h-7 text-amber-400 -ml-1.5 z-10" />
            <CoinIcon className="w-6 h-6 text-amber-400/90 -ml-1.5" />
          </div>
          <span className="absolute text-2xl opacity-20">✨</span>
        </div>
      </div>
    </div>
  );
}
