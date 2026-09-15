'use client';

/**
 * A APRESENTAÇÃO — a pasta "Ayra - Apresentacao (HTML com videos)" do jeito
 * que veio, servida de public/ayra/apresentacao num iframe do mesmo site.
 * Nada do index.html nem das pastas dele é tocado.
 *
 * F11 põe o NAVEGADOR em tela cheia, mas a página continua a mesma — com o
 * menu do sistema em volta. Então este componente percebe a tela cheia e
 * estica o quadro por cima de tudo. Estica mudando só o CSS: o iframe nunca
 * sai do lugar no DOM, porque iframe movido recarrega e a apresentação
 * voltaria pro slide 1 no meio da reunião.
 *
 * O "F" da própria apresentação (tela cheia dela) também continua valendo.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AYRA_APRESENTACAO } from '@/lib/ayra';

/**
 * O navegador está em tela cheia? F11 não dispara evento próprio: lê-se pelo
 * display-mode (Chrome/Edge/Firefox marcam "fullscreen" no F11) e, de
 * reserva, pela janela ocupar a tela inteira. Só em computador — F11 não
 * existe no celular, e lá o app instalado ocupa a tela toda sem estar em
 * tela cheia.
 */
function useTelaCheiaDoNavegador(): boolean {
  const [cheia, setCheia] = useState(false);

  useEffect(() => {
    const computador = window.matchMedia('(hover: hover) and (pointer: fine)');
    const modoTelaCheia = window.matchMedia('(display-mode: fullscreen)');

    const avaliar = () => {
      if (!computador.matches) { setCheia(false); return; }
      const ocupaATela = Math.abs(window.innerWidth - window.screen.width) <= 2
        && Math.abs(window.innerHeight - window.screen.height) <= 2;
      setCheia(modoTelaCheia.matches || !!document.fullscreenElement || ocupaATela);
    };

    avaliar();
    window.addEventListener('resize', avaliar);
    document.addEventListener('fullscreenchange', avaliar);
    modoTelaCheia.addEventListener?.('change', avaliar);
    return () => {
      window.removeEventListener('resize', avaliar);
      document.removeEventListener('fullscreenchange', avaliar);
      modoTelaCheia.removeEventListener?.('change', avaliar);
    };
  }, []);

  return cheia;
}

export default function Apresentacao({ ativa }: { ativa: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ativaRef = useRef(ativa);
  ativaRef.current = ativa;

  const telaCheia = useTelaCheiaDoNavegador() && ativa;

  /** O teclado (← →) precisa estar dentro da apresentação. */
  const focar = () => { try { frame.current?.contentWindow?.focus(); } catch { /* ok */ } };

  // Saiu da aba: pausa os vídeos (senão seguem rodando escondidos).
  // Voltou: retoma só o vídeo do slide que está na tela e devolve o teclado.
  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    try {
      if (ativa) {
        doc.querySelectorAll<HTMLVideoElement>('.slide.on video').forEach((v) => { v.play().catch(() => {}); });
        focar();
      } else {
        doc.querySelectorAll<HTMLVideoElement>('video').forEach((v) => v.pause());
      }
    } catch { /* documento ainda carregando */ }
  }, [ativa]);

  useEffect(() => {
    if (telaCheia) focar();
  }, [telaCheia]);

  // A apresentação só reescala no evento "resize" DELA. Quando o quadro muda
  // de tamanho (entrou/saiu da tela cheia, ou a aba voltou a aparecer), o
  // navegador pode demorar a entregar esse evento — e os slides ficariam no
  // tamanho antigo, pequenos no meio da tela. Então o evento é disparado
  // aqui, na hora e de novo logo depois. O index.html continua intocado.
  useEffect(() => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    const reescalar = () => { try { w.dispatchEvent(new Event('resize')); } catch { /* ok */ } };
    reescalar();
    const t = setTimeout(reescalar, 150);
    return () => clearTimeout(t);
  }, [telaCheia, ativa]);

  return (
    <div className={ativa ? '' : 'hidden'}>
      <div
        className={telaCheia
          ? 'fixed inset-0 z-[400] bg-black'
          : 'relative mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)]'}
        // fora da tela cheia: 16:9, do maior tamanho que cabe sem rolar
        style={telaCheia ? undefined : { width: 'min(100%, calc((100vh - 12rem) * 16 / 9))', aspectRatio: '16 / 9' }}
      >
        <iframe
          ref={frame}
          src={AYRA_APRESENTACAO}
          title="Ayra — Apresentação de pré-lançamento"
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
          onLoad={() => { if (ativaRef.current) focar(); }}
        />
      </div>
      {!telaCheia && (
        <p className="text-center text-[11px] text-text-secondary mt-2">
          <b className="text-white/80">F11</b> apresenta em tela cheia, só a apresentação · <b className="text-white/80">← →</b> passam os slides
        </p>
      )}
    </div>
  );
}
