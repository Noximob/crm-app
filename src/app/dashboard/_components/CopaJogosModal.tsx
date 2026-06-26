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

function LinhaJogo({ jogo, agora, destaque }: { jogo: CopaJogo; agora: number; destaque?: boolean }) {
  const encerrado = jogoEncerrado(jogo, agora);
  const temPlacar = jogo.golsCasa !== null && jogo.golsFora !== null;
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
        destaque
          ? 'border-yellow-300/60 bg-gradient-to-r from-[#009C3B]/20 to-[#002776]/20'
          : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-center gap-3">
          <span className="flex items-center gap-2 flex-1 justify-end text-sm font-semibold text-white truncate">
            {jogo.casa.nome} <span className="text-lg">{jogo.casa.flag}</span>
          </span>
          <span className="shrink-0 text-center min-w-[64px]">
            {temPlacar ? (
              <span className="text-base font-extrabold text-white tabular-nums">
                {jogo.golsCasa} <span className="text-text-secondary">x</span> {jogo.golsFora}
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-300">{fmtHora(jogo.dataISO)}</span>
            )}
          </span>
          <span className="flex items-center gap-2 flex-1 text-sm font-semibold text-white truncate">
            <span className="text-lg">{jogo.fora.flag}</span> {jogo.fora.nome}
          </span>
        </div>
        <div className="mt-1 text-center text-[11px] text-text-secondary">
          {jogo.fase} · {fmtData(jogo.dataISO)}
          {destaque && <span className="ml-2 text-amber-300 font-bold">• Próximo</span>}
          {encerrado && !destaque && <span className="ml-2 text-emerald-400/80">• Encerrado</span>}
        </div>
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
        className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-[#15151a] border border-yellow-300/30 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#009C3B] via-[#FFDF00]/30 to-[#002776]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🏆</span> Brasil na Copa
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10" title="Fechar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {futuros.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-300 mb-2">Próximos jogos</h3>
              <div className="space-y-2">
                {futuros.map((j, i) => (
                  <LinhaJogo key={j.id} jogo={j} agora={agora} destaque={i === 0} />
                ))}
              </div>
            </div>
          )}

          {encerrados.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-400 mb-2">Já jogados</h3>
              <div className="space-y-2">
                {encerrados.map((j) => (
                  <LinhaJogo key={j.id} jogo={j} agora={agora} />
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-text-secondary text-center pt-1">
            Tabela de exemplo — jogos e placares editáveis em <code className="text-amber-300/80">src/lib/copaJogos.ts</code>
          </p>
        </div>
      </div>
    </div>
  );
}
