'use client';

/**
 * TourInicial — onboarding do corretor novo (3 passos, estilo dicas GX).
 * Passo 1: Teus leads (item CRM) · Passo 2: Tua agenda · Passo 3: Teu placar (gx-placar da home).
 *
 * Aparece UMA vez por dispositivo (localStorage 'nox-tour-v1'); no modo Espelho (demo)
 * usa sessionStorage — reaparece a cada nova sessão, mas não repete dentro da mesma.
 * Puramente visual: não altera nenhuma lógica da home.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const TOUR_KEY = 'nox-tour-v1';
const PAD_ANEL = 6; // folga do anel em volta do alvo
const GAP = 14; // distância card ↔ alvo (desktop)
const MARGEM = 12; // margem mínima da viewport

// Evita warning de useLayoutEffect no SSR (o componente renderiza null no servidor)
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type Passo = { titulo: string; texto: string; seletor: string };

const PASSOS: Passo[] = [
  {
    titulo: 'Teus leads',
    texto: 'No CRM vivem teus clientes: lista, kanban e cada lead com tarefas e histórico.',
    seletor: 'a[href*="/dashboard/crm"]',
  },
  {
    titulo: 'Tua agenda',
    texto: 'Tarefas e eventos do dia — o sistema te lembra de tudo.',
    seletor: 'a[href*="/dashboard/agenda"]',
  },
  {
    titulo: 'Teu placar',
    texto: 'Meets & visitas da semana: o número que converte. Bora pro topo do pódio!',
    seletor: '.gx-placar',
  },
];

type Ret = { top: number; left: number; width: number; height: number };

/** Entre todos os matches do seletor, prefere um visível dentro de <nav> (sidebar/tab bar); senão o primeiro visível. */
function acharAlvo(seletor: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let els: HTMLElement[] = [];
  try {
    els = Array.from(document.querySelectorAll<HTMLElement>(seletor));
  } catch {
    return null;
  }
  const visiveis = els.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  if (visiveis.length === 0) return null;
  return visiveis.find((el) => el.closest('nav')) ?? visiveis[0];
}

const mesmoRet = (a: Ret | null, b: Ret | null) =>
  !!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 &&
  Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

export default function TourInicial() {
  const { isEspelhoDemo } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState(0);
  // Lazy init: já nasce com o breakpoint certo (o componente só renderiza no client)
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );
  const [alvoRet, setAlvoRet] = useState<Ret | null>(null);
  const [cardTam, setCardTam] = useState<{ w: number; h: number } | null>(null);

  const alvoRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const guardarStore = useCallback((): Storage | null => {
    try {
      return isEspelhoDemo ? window.sessionStorage : window.localStorage;
    } catch {
      return null;
    }
  }, [isEspelhoDemo]);

  // Abre uma única vez (flag ausente) — pequeno delay p/ a home pintar e a nav existir
  useEffect(() => {
    const store = guardarStore();
    if (!store) return; // storage bloqueado → não mostra (evita repetir a cada load)
    let flag: string | null = null;
    try {
      flag = store.getItem(TOUR_KEY);
    } catch {
      return;
    }
    if (flag) return;
    const t = window.setTimeout(() => setAberto(true), 650);
    return () => window.clearTimeout(t);
  }, [guardarStore]);

  // Concluir/Pular: grava a flag e fecha
  const fechar = useCallback(() => {
    try {
      guardarStore()?.setItem(TOUR_KEY, String(Date.now()));
    } catch {
      /* sem storage, só fecha */
    }
    setAberto(false);
  }, [guardarStore]);

  const avancar = useCallback(() => {
    setPasso((p) => {
      if (p >= PASSOS.length - 1) {
        fechar();
        return p;
      }
      return p + 1;
    });
  }, [fechar]);

  // Breakpoint lg (sidebar vs. tab bar inferior)
  useEffect(() => {
    if (!aberto) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [aberto]);

  // Localiza o alvo do passo e segue a posição dele (resize + scroll de qualquer container)
  useEffect(() => {
    if (!aberto) return;
    const alvo = acharAlvo(PASSOS[passo].seletor);
    alvoRef.current = alvo;
    try {
      alvo?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch {
      /* noop */
    }
    const medir = () => {
      const el = alvoRef.current;
      if (!el || !el.isConnected) {
        setAlvoRet(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) {
        setAlvoRet(null);
        return;
      }
      const novo = { top: r.top, left: r.left, width: r.width, height: r.height };
      setAlvoRet((atual) => (mesmoRet(atual, novo) ? atual : novo));
    };
    medir();
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true); // capture: pega scroll do <main> interno
    // Acompanha o scrollIntoView suave por ~1s
    let raf = 0;
    let frames = 0;
    const tick = () => {
      medir();
      if (++frames < 60) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
      cancelAnimationFrame(raf);
    };
  }, [aberto, passo, desktop]);

  // ESC = pular
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        fechar();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [aberto, fechar]);

  // Foco no botão principal ao abrir e a cada passo
  useEffect(() => {
    if (!aberto) return;
    const t = window.setTimeout(() => btnRef.current?.focus(), 90);
    return () => window.clearTimeout(t);
  }, [aberto, passo]);

  // Mede o card p/ posicionar sem estourar a viewport
  useIsoLayoutEffect(() => {
    if (!aberto) return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCardTam((atual) =>
      atual && Math.abs(atual.w - r.width) < 1 && Math.abs(atual.h - r.height) < 1
        ? atual
        : { w: r.width, h: r.height }
    );
  });

  // Trap simples de foco entre os botões do card
  const onCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const botoes = cardRef.current?.querySelectorAll<HTMLElement>('button');
    if (!botoes || botoes.length === 0) return;
    const primeiro = botoes[0];
    const ultimo = botoes[botoes.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };

  if (!aberto) return null;

  const atual = PASSOS[passo];
  const ultimoPasso = passo === PASSOS.length - 1;
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

  // Posição do card no desktop: direita do alvo → esquerda → abaixo → acima → centro (sempre clampado)
  const estiloCardDesktop = (): React.CSSProperties => {
    if (typeof window === 'undefined') return {};
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = cardTam?.w ?? 340;
    const ch = cardTam?.h ?? 210;
    if (!alvoRet) return { left: (vw - cw) / 2, top: (vh - ch) / 2 };
    let left: number;
    let top: number;
    if (alvoRet.left + alvoRet.width + GAP + cw <= vw - MARGEM) {
      left = alvoRet.left + alvoRet.width + GAP;
      top = clamp(alvoRet.top, MARGEM, vh - ch - MARGEM);
    } else if (alvoRet.left - GAP - cw >= MARGEM) {
      left = alvoRet.left - GAP - cw;
      top = clamp(alvoRet.top, MARGEM, vh - ch - MARGEM);
    } else {
      left = clamp(alvoRet.left + alvoRet.width / 2 - cw / 2, MARGEM, vw - cw - MARGEM);
      top = alvoRet.top + alvoRet.height + GAP;
      if (top + ch > vh - MARGEM) top = alvoRet.top - GAP - ch;
      if (top < MARGEM) top = clamp((vh - ch) / 2, MARGEM, vh - ch - MARGEM);
    }
    return { left, top };
  };

  return (
    <>
      {/* Pulso do anel (keyframes locais do tour, prefixados p/ não colidir) */}
      <style>{`
        @keyframes noxTourPulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 30, 86, 0.55); }
          70% { box-shadow: 0 0 0 13px rgba(255, 30, 86, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 30, 86, 0); }
        }
      `}</style>

      {/* Bloqueia interação com a página; escurece tudo quando não há alvo p/ recortar */}
      <div className={`fixed inset-0 z-[100] ${alvoRet ? 'bg-transparent' : 'bg-black/75'}`} aria-hidden />

      {/* Holofote: recorte claro sobre o alvo + escurecimento do resto via sombra gigante */}
      {alvoRet && (
        <>
          <div
            aria-hidden
            className="fixed z-[100] rounded-xl border border-[#FF1E56]/70 pointer-events-none transition-all duration-300"
            style={{
              top: alvoRet.top - PAD_ANEL,
              left: alvoRet.left - PAD_ANEL,
              width: alvoRet.width + PAD_ANEL * 2,
              height: alvoRet.height + PAD_ANEL * 2,
              boxShadow: '0 0 0 9999px rgba(5, 4, 8, 0.74), 0 0 26px rgba(255, 30, 86, 0.45)',
            }}
          />
          {/* Anel pulsante por cima do recorte */}
          <div
            aria-hidden
            className="fixed z-[100] rounded-xl border-2 border-[#FF3364] pointer-events-none transition-all duration-300"
            style={{
              top: alvoRet.top - PAD_ANEL,
              left: alvoRet.left - PAD_ANEL,
              width: alvoRet.width + PAD_ANEL * 2,
              height: alvoRet.height + PAD_ANEL * 2,
              animation: 'noxTourPulse 1.6s ease-out infinite',
            }}
          />
        </>
      )}

      {/* Card do tour */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour inicial — passo ${passo + 1} de ${PASSOS.length}: ${atual.titulo}`}
        onKeyDown={onCardKeyDown}
        className={`fixed z-[101] transition-none al-rise bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] overflow-hidden p-4 ${
          desktop
            ? 'w-[340px]'
            : 'inset-x-3 mx-auto bottom-[90px] max-w-[360px]'
        }`}
        style={desktop ? estiloCardDesktop() : undefined}
      >
        <div className="absolute inset-x-0 top-0 gx-line" />
        <span className="gx-tag"><span>Tour · {passo + 1}/{PASSOS.length}</span></span>
        <h2 className="al-display text-[18px] font-bold text-white uppercase tracking-[0.14em] mt-3">
          {atual.titulo}
        </h2>
        <p className="text-[13px] text-text-secondary leading-relaxed mt-1.5">{atual.texto}</p>
        <div className="flex items-center justify-between gap-3 mt-4">
          {/* Dots de progresso 1/2/3 */}
          <div className="flex items-center gap-1.5" aria-hidden>
            {PASSOS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === passo
                    ? 'w-5 bg-[#FF1E56] shadow-[0_0_10px_rgba(255,30,86,0.8)]'
                    : i < passo
                      ? 'w-1.5 bg-[#E8C547]/80'
                      : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={fechar}
              className="px-3 py-2 rounded-xl text-[12px] font-bold text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Pular
            </button>
            <button
              type="button"
              ref={btnRef}
              onClick={avancar}
              className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white text-[12.5px] font-bold rounded-xl px-4 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/60"
            >
              {ultimoPasso ? 'Começar! 🚀' : 'Próximo →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
