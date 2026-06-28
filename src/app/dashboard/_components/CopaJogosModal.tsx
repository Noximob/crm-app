'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { COPA_JOGOS, jogoEncerrado, type CopaJogo } from '@/lib/copaJogos';
import { fetchCopaJogos } from '@/lib/copaApi';

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function diaSemana(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}
function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function diasFaltam(iso: string, agora: number) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - agora) / 86400000));
}

function Flag({ cod, nome }: { cod: string; nome: string }) {
  if (!cod) return null;
  return (
    <img
      src={`https://flagcdn.com/h20/${cod}.png`}
      alt={nome}
      className="h-4 w-auto rounded-[2px] shrink-0 shadow-sm"
      loading="lazy"
    />
  );
}

function LinhaJogo({ jogo, agora, modo }: { jogo: CopaJogo; agora: number; modo: 'placar' | 'hora' | 'proximo' }) {
  const ehBrasil = jogo.casa.cod === 'br' || jogo.fora.cod === 'br';
  const temPlacar = jogo.golsCasa !== null && jogo.golsFora !== null;
  return (
    <div
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border ${
        ehBrasil ? 'border-yellow-300/60 bg-yellow-400/[0.07]' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <span className="flex items-center gap-1.5 flex-1 justify-end text-[13px] font-semibold text-white truncate">
        {jogo.casa.nome} <Flag cod={jogo.casa.cod} nome={jogo.casa.nome} />
      </span>
      <span className="shrink-0 text-center min-w-[58px]">
        {temPlacar ? (
          <span className="text-[15px] font-extrabold text-white tabular-nums">
            {jogo.golsCasa} <span className="text-text-secondary font-normal">x</span> {jogo.golsFora}
          </span>
        ) : (
          <span className="inline-block text-[11px] font-bold text-amber-300 leading-tight">
            {modo === 'proximo' ? (
              <>
                {diaSemana(jogo.dataISO)} {fmtData(jogo.dataISO)}
                <br />
                {fmtHora(jogo.dataISO)}
              </>
            ) : (
              fmtHora(jogo.dataISO)
            )}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1.5 flex-1 text-[13px] font-semibold text-white truncate">
        <Flag cod={jogo.fora.cod} nome={jogo.fora.nome} /> {jogo.fora.nome}
      </span>
    </div>
  );
}

function Secao({ titulo, cor, children }: { titulo: string; cor: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className={`text-[11px] font-bold uppercase tracking-wide mb-1.5 ${cor}`}>{titulo}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export default function CopaJogosModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [jogos, setJogos] = useState<CopaJogo[]>(COPA_JOGOS);
  const [aoVivo, setAoVivo] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Busca ao vivo ao abrir (uma vez); mantém o fallback estático se falhar
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

  const grupos = useMemo(() => {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const hojeStr = ymdLocal(inicioHoje);
    const amanhaDate = new Date(inicioHoje);
    amanhaDate.setDate(amanhaDate.getDate() + 1);
    const amanhaStr = ymdLocal(amanhaDate);

    const jaJogados: CopaJogo[] = [];
    const hoje: CopaJogo[] = [];
    const amanha: CopaJogo[] = [];
    const proximos: CopaJogo[] = [];

    jogos.forEach((j) => {
      const d = new Date(j.dataISO);
      const dia = ymdLocal(d);
      if (dia === hojeStr) hoje.push(j);
      else if (dia === amanhaStr) amanha.push(j);
      else if (d.getTime() < inicioHoje.getTime()) jaJogados.push(j);
      else proximos.push(j);
    });

    jaJogados.sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime());
    [hoje, amanha, proximos].forEach((arr) => arr.sort((a, b) => new Date(a.dataISO).getTime() - new Date(b.dataISO).getTime()));
    return { jaJogados, hoje, amanha, proximos };
  }, [jogos, agora]);

  if (!isOpen) return null;

  const vazio = jogos.length === 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm max-h-[82vh] overflow-hidden rounded-2xl bg-[#15151a] border border-yellow-300/30 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: '3px solid transparent', borderImage: 'linear-gradient(90deg,#009C3B,#FFDF00,#002776) 1' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
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

        <div className="px-4 py-2 text-center" style={{ background: 'linear-gradient(90deg,#009C3B,#002776)' }}>
          <p className="text-sm font-extrabold tracking-wide text-yellow-300 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
            RUMO AO HEXA! Bora pra cima, Brasil! ⚽
          </p>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {grupos.hoje.length > 0 && (
            <Secao titulo="🔴 Hoje" cor="text-red-400">
              {grupos.hoje.map((j) => (
                <LinhaJogo key={j.id} jogo={j} agora={agora} modo={jogoEncerrado(j, agora) ? 'placar' : 'hora'} />
              ))}
            </Secao>
          )}
          {grupos.amanha.length > 0 && (
            <Secao titulo="Amanhã" cor="text-amber-300">
              {grupos.amanha.map((j) => (
                <LinhaJogo key={j.id} jogo={j} agora={agora} modo="hora" />
              ))}
            </Secao>
          )}
          {grupos.proximos.length > 0 && (
            <Secao titulo="Próximos jogos" cor="text-sky-300">
              {grupos.proximos.map((j) => (
                <LinhaJogo key={j.id} jogo={j} agora={agora} modo="proximo" />
              ))}
            </Secao>
          )}
          {grupos.jaJogados.length > 0 && (
            <Secao titulo="Já jogados" cor="text-emerald-400">
              {grupos.jaJogados.map((j) => (
                <LinhaJogo key={j.id} jogo={j} agora={agora} modo="placar" />
              ))}
            </Secao>
          )}

          {vazio && (
            <p className="text-center text-sm text-text-secondary py-6">Nenhum jogo encontrado no momento.</p>
          )}
        </div>
      </div>
    </div>
  );
}
