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

  const cardBase = 'rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#23283A] to-[#181C23] p-4 flex flex-col relative overflow-hidden';
  const glowLeft = 'absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-amber-400 to-amber-600';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
      {/* Quadrado 1: Minhas Moedas */}
      <div className={`${cardBase} shadow-lg hover:shadow-amber-500/10 transition-shadow`}>
        <div className={glowLeft} />
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-amber-500/20">
            <CoinIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-amber-200/90 uppercase tracking-wide">Minhas Moedas</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <CoinIcon className="w-8 h-8 text-amber-400 shrink-0" />
          <span className="text-2xl font-black text-amber-400 tabular-nums">
            {pontos.toLocaleString('pt-BR')} <span className="text-sm font-semibold text-white/80">pontos</span>
          </span>
        </div>
        <div className="absolute bottom-1 right-1 opacity-20 pointer-events-none">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <CoinIcon key={i} className="w-6 h-6" />
            ))}
          </div>
        </div>
      </div>

      {/* Quadrado 2: Visual moedas (gamificado) */}
      <div className={`${cardBase} shadow-lg hover:shadow-amber-500/10 transition-shadow`}>
        <div className={glowLeft} />
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-amber-200/90 uppercase tracking-wide">Conquistas</span>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[80px] relative">
          <div className="flex items-end gap-0.5">
            <CoinIcon className="w-10 h-10 text-amber-400/90" />
            <CoinIcon className="w-12 h-12 text-amber-400 -ml-2 z-10" />
            <CoinIcon className="w-10 h-10 text-amber-400/90 -ml-2" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-4xl opacity-20">✨</span>
            <span className="text-2xl opacity-15 absolute top-2 right-4">⭐</span>
            <span className="text-2xl opacity-15 absolute bottom-2 left-4">🌟</span>
          </div>
        </div>
      </div>

      {/* Quadrado 3: Meta pessoal do corretor */}
      <div className={`${cardBase} shadow-lg hover:shadow-amber-500/10 transition-shadow`}>
        <div className={glowLeft} />
        <div className="flex items-center gap-2 mb-1">
          <TargetIcon className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-amber-200/90 uppercase tracking-wide">Minha Meta</span>
        </div>
        {valorAlmejado > 0 ? (
          <>
            <div className="text-[10px] text-amber-200/70 mt-1">
              Período: {formatMetaDate(metaInicio)} → {formatMetaDate(metaFim)}
            </div>
            <div className="mt-2 space-y-1">
              <div>
                <span className="text-[10px] text-amber-200/80">Almejado</span>
                <p className="text-sm font-bold text-amber-400">
                  {valorAlmejado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-amber-200/80">Realizado</span>
                <span className="text-sm font-bold text-white">
                  {alcancado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-[10px] text-amber-200/80">% feito</span>
                <span className={`text-sm font-bold ${percentualPessoal >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {percentualPessoal}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${percentualPessoal >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`}
                  style={{ width: `${Math.min(percentualPessoal, 100)}%` }}
                />
              </div>
              {dias !== null && (
                <p className="text-[10px] text-amber-200/80 mt-1.5">
                  {dias > 0 ? `${dias} dias restantes` : dias === 0 ? 'Último dia!' : 'Período encerrado'}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center min-h-[80px] text-center">
            {(metaInicio || metaFim) && (
              <p className="text-[10px] text-amber-200/70 mb-1">
                Período da imobiliária: {formatMetaDate(metaInicio)} → {formatMetaDate(metaFim)}
                {dias !== null && dias >= 0 && (
                  <span className="block mt-0.5"> {dias > 0 ? `${dias} dias restantes` : dias === 0 ? 'Último dia!' : 'Período encerrado'}</span>
                )}
              </p>
            )}
            <p className="text-xs text-white/60">Sua meta pessoal ainda não foi definida.</p>
            <p className="text-[10px] text-white/40 mt-1">O administrador pode configurá-la na área de metas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
