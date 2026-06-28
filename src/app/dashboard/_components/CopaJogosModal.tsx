'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COPA_JOGOS, jogoEncerrado, type CopaJogo } from '@/lib/copaJogos';
import { fetchCopaJogos } from '@/lib/copaApi';

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function rotuloData(iso: string) {
  const d = new Date(iso);
  const sem = d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
  const dm = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${sem.charAt(0).toUpperCase()}${sem.slice(1)} · ${dm}`;
}

function Flag({ cod, nome }: { cod: string; nome: string }) {
  if (!cod) return <span className="w-[20px] h-4 rounded-[2px] bg-white/10 shrink-0" />;
  return (
    <img src={`https://flagcdn.com/h20/${cod}.png`} alt={nome} className="h-4 w-auto rounded-[2px] shrink-0 shadow-sm" loading="lazy" />
  );
}

function LinhaJogo({ jogo, agora }: { jogo: CopaJogo; agora: number }) {
  const ehBrasil = jogo.casa.cod === 'br' || jogo.fora.cod === 'br';
  const temPlacar = jogo.golsCasa !== null && jogo.golsFora !== null;
  const encerrado = jogoEncerrado(jogo, agora);
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
        ehBrasil ? 'border-yellow-300/50 bg-yellow-400/[0.06]' : 'border-white/[0.07] bg-white/[0.02]'
      }`}
    >
      <span className="flex items-center gap-1.5 flex-1 justify-end text-[13px] font-semibold text-white truncate">
        {jogo.casa.nome} <Flag cod={jogo.casa.cod} nome={jogo.casa.nome} />
      </span>
      <span className="shrink-0 text-center min-w-[52px]">
        {temPlacar ? (
          <span className="text-[15px] font-extrabold text-white tabular-nums">
            {jogo.golsCasa} <span className="text-text-secondary font-normal">x</span> {jogo.golsFora}
          </span>
        ) : (
          <span className="text-[12px] font-bold text-amber-300">{fmtHora(jogo.dataISO)}</span>
        )}
      </span>
      <span className="flex items-center gap-1.5 flex-1 text-[13px] font-semibold text-white truncate">
        <Flag cod={jogo.fora.cod} nome={jogo.fora.nome} /> {jogo.fora.nome}
      </span>
      <span className="shrink-0 w-[58px] text-right text-[9px] font-bold uppercase tracking-wide">
        {encerrado ? <span className="text-emerald-400/70">fim</span> : <span className="text-sky-300/70">a jogar</span>}
      </span>
    </div>
  );
}

export default function CopaJogosModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [jogos, setJogos] = useState<CopaJogo[]>(COPA_JOGOS);
  const [aoVivo, setAoVivo] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [soBrasil, setSoBrasil] = useState(false);
  const alvoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || aoVivo) return;
    let cancelado = false;
    setCarregando(true);
    fetchCopaJogos()
      .then((lista) => {
        if (!cancelado && lista.length) {
          setJogos(lista);
          setAoVivo(true);
        }
      })
      .catch(() => {})
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [isOpen, aoVivo]);

  const agora = useMemo(() => Date.now(), [isOpen, jogos]);

  const { dias, hojeStr, alvoKey } = useMemo(() => {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const hoje = ymdLocal(inicioHoje);

    const lista = soBrasil ? jogos.filter((j) => j.casa.cod === 'br' || j.fora.cod === 'br') : jogos;
    const ordenados = [...lista].sort((a, b) => new Date(a.dataISO).getTime() - new Date(b.dataISO).getTime());

    const grupos = new Map<string, CopaJogo[]>();
    ordenados.forEach((j) => {
      const k = ymdLocal(new Date(j.dataISO));
      (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(j);
    });

    const chaves = Array.from(grupos.keys());
    // dia alvo p/ rolar: hoje, senão o primeiro futuro, senão o último
    const alvo = chaves.includes(hoje)
      ? hoje
      : chaves.find((k) => k >= hoje) ?? chaves[chaves.length - 1];

    return {
      dias: chaves.map((k) => ({ key: k, jogos: grupos.get(k)! })),
      hojeStr: hoje,
      alvoKey: alvo,
    };
  }, [jogos, soBrasil]);

  useEffect(() => {
    if (isOpen && alvoRef.current) {
      const t = setTimeout(() => alvoRef.current?.scrollIntoView({ block: 'start' }), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen, alvoKey, jogos, soBrasil]);

  if (!isOpen) return null;

  const amanhaDate = new Date();
  amanhaDate.setHours(0, 0, 0, 0);
  amanhaDate.setDate(amanhaDate.getDate() + 1);
  const amanhaStr = ymdLocal(amanhaDate);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm h-[82vh] overflow-hidden rounded-2xl bg-[#15151a] border border-yellow-300/30 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: '3px solid transparent', borderImage: 'linear-gradient(90deg,#009C3B,#FFDF00,#002776) 1' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🏆</span> Copa do Mundo 2026
          </h2>
          <div className="flex items-center gap-2">
            {aoVivo ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ao vivo
              </span>
            ) : carregando ? (
              <span className="text-[10px] text-text-secondary">buscando…</span>
            ) : null}
            <button onClick={onClose} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10" title="Fechar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="px-4 py-2 text-center shrink-0" style={{ background: 'linear-gradient(90deg,#009C3B,#002776)' }}>
          <p className="text-sm font-extrabold tracking-wide text-yellow-300 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
            RUMO AO HEXA! Bora pra cima, Brasil! ⚽
          </p>
        </div>

        {/* Filtro */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 shrink-0">
          <button
            onClick={() => setSoBrasil(false)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${!soBrasil ? 'bg-white/15 text-white' : 'text-text-secondary hover:text-white'}`}
          >
            Calendário
          </button>
          <button
            onClick={() => setSoBrasil(true)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${soBrasil ? 'bg-yellow-400/20 text-yellow-200' : 'text-text-secondary hover:text-white'}`}
          >
            <Flag cod="br" nome="Brasil" /> Só Brasil
          </button>
          {!aoVivo && !carregando && <span className="ml-auto text-[9px] text-text-secondary">tabela local</span>}
        </div>

        <div className="overflow-y-auto flex-1 px-3 py-2 space-y-3">
          {dias.length === 0 && (
            <p className="text-center text-sm text-text-secondary py-8">Nenhum jogo encontrado.</p>
          )}
          {dias.map((dia) => {
            const ehHoje = dia.key === hojeStr;
            const ehAmanha = dia.key === amanhaStr;
            return (
              <div key={dia.key} ref={dia.key === alvoKey ? alvoRef : undefined}>
                <div className="sticky top-0 z-10 flex items-center gap-2 py-1.5 bg-[#15151a]">
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${ehHoje ? 'text-red-400' : 'text-text-secondary'}`}>
                    {rotuloData(dia.jogos[0].dataISO)}
                  </span>
                  {ehHoje && <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-500 text-white">HOJE</span>}
                  {ehAmanha && <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/80 text-black">AMANHÃ</span>}
                  <span className="flex-1 h-px bg-white/10" />
                </div>
                <div className="space-y-1.5 pt-1">
                  {dia.jogos.map((j) => (
                    <LinhaJogo key={j.id} jogo={j} agora={agora} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-1.5 border-t border-white/10 shrink-0 text-center">
          <span className="text-[9px] text-text-secondary">Atualiza automaticamente · fonte: TheSportsDB</span>
        </div>
      </div>
    </div>
  );
}
