'use client';

import { useEffect, useState } from 'react';

/**
 * Camada global do tema Copa do Mundo (Brasil).
 * Aplica a classe `copa-theme` no <html> e renderiza a moldura + confete
 * em TODAS as páginas (dashboard, login, landing). Ligado por padrão;
 * o botão do cabeçalho do dashboard liga/desliga e dispara o evento 'copa-toggle'.
 */
export default function CopaRoot() {
  const [mounted, setMounted] = useState(false);
  const [on, setOn] = useState(true);

  useEffect(() => {
    const apply = () => {
      const v = typeof window !== 'undefined' && window.localStorage.getItem('copaTheme') !== '0';
      setOn(v);
      document.documentElement.classList.toggle('copa-theme', v);
    };
    setMounted(true);
    apply();
    window.addEventListener('copa-toggle', apply);
    window.addEventListener('storage', apply);
    return () => {
      window.removeEventListener('copa-toggle', apply);
      window.removeEventListener('storage', apply);
    };
  }, []);

  if (!mounted || !on) return null;

  return (
    <>
      <div className="copa-frame" aria-hidden="true" />
      <div className="copa-confetti" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className={`copa-confetti-piece c${i % 3}`}
            style={{
              left: `${(i * 8 + 4) % 100}%`,
              animationDelay: `${(i % 6) * 0.8}s`,
              animationDuration: `${7 + (i % 5)}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
