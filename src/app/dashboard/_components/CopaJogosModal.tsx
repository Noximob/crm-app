'use client';

import React, { useMemo } from 'react';
import { COPA_JOGOS, jogoEncerrado, type CopaJogo } from '@/lib/copaJogos';

function fmtData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function fmtHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function diaSemana(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function LinhaJogo({ jogo, agora, destaque }: { jogo: CopaJogo; agora: number; destaque?: boolean }) {
  const encerrado = jogoEncerrado(jogo, agora);
  const temPlacar = jogo.golsCasa !== null && jogo.golsFora !== null;
  return (
    <div
      className={`flex flex-col px-3 py-2 rounded-lg border ${
        destaque ? 'border-yellow-300/60 bg-yellow-400/[0.08]' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="flex items-center gap-1.5 flex-1 justify-end text-[13px] font-semibold text-white truncate">
          {jogo.casa.nome} <span className="text-xl leading-none">{jogo.casa.flag}</span>
        </span>
        <span className="shrink-0 text-center min-w-[58px]">
          {temPlacar ? (
            <span className="text-[15px] font-extrabold text-white tabular-nums">
              {jogo.golsCasa} <span className="text-text-secondary font-normal">x</span> {jogo.golsFora}
            </span>
          ) : (
            <span className="inline-block text-[11px] font-bold text-amber-300 leading-tight">
              {diaSemana(jogo.dataISO)}<br />{fmtHora(jogo.dataISO)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 flex-1 text-[13px] font-semibold text-white truncate">
          <span className="text-xl leading-none">{jogo.fora.flag}</span> {jogo.fora.nome}
        </span>
      </div>
      <div className="mt-0.5 text-center text-[10px] text-text-secondary">
        {jogo.fase ? `${jogo.fase} · ` : ''}{fmtData(jogo.dataISO)}
        {destaque && <span className="ml-1.5 text-amber-300 font-bold">• Próximo</span>}
        {encerrado && !destaque && <span className="ml-1.5 text-emerald-400/80">• Encerrado</span>}
      </div>
    </div>
  );
}

export default function CopaJogosModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const agora = useMemo(() => Date.now(), [isOpen]);

  const { encerrados, futuros } = useMemo(() => {
    const enc: CopaJogo[] = [];
    const fut: CopaJogo[] = [];
    COPA_JOGOS.forEach((j) => (jogoEncerrado(j, agora) ? enc : fut).push(j));
    enc.sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime());
    fut.sort((a, b) => new Date(a.dataISO).getTime() - new Date(b.dataISO).getTime());
    return { encerrados: enc, futuros: fut };
  }, [agora]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm max-h-[80vh] overflow-hidden rounded-2xl bg-[#15151a] border border-yellow-300/30 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: '3px solid transparent', borderImage: 'linear-gradient(90deg,#009C3B,#FFDF00,#002776) 1' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🏆</span> Brasil na Copa
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10" title="Fechar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Banner motivacional */}
        <div className="px-4 py-2 text-center" style={{ background: 'linear-gradient(90deg,#009C3B,#002776)' }}>
          <p className="text-sm font-extrabold tracking-wide text-yellow-300 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
            🇧🇷 RUMO AO HEXA! Bora pra cima, Brasil! ⚽
          </p>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {futuros.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-amber-300 mb-1.5">Próximo jogo</h3>
              <div className="space-y-1.5">
                {futuros.map((j, i) => (
                  <LinhaJogo key={j.id} jogo={j} agora={agora} destaque={i === 0} />
                ))}
              </div>
            </div>
          )}

          {encerrados.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-emerald-400 mb-1.5">Já jogados</h3>
              <div className="space-y-1.5">
                {encerrados.map((j) => (
                  <LinhaJogo key={j.id} jogo={j} agora={agora} />
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-text-secondary text-center">
            Jogos e placares editáveis em <code className="text-amber-300/80">src/lib/copaJogos.ts</code>
          </p>
        </div>
      </div>
    </div>
  );
}
