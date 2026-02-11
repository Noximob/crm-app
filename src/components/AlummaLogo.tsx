'use client';

import React from 'react';

/**
 * Onde usar cada formato:
 * - full + dark  → Sidebar (expandida), TV canto, Login (fundo escuro)
 * - full + light → Esqueci-senha, cabeçalho do Relatório individual
 * - a + dark     → Sidebar recolhida, ícone em áreas escuras
 * - a + light    → Rodapé do relatório, ícone em fundo claro
 * - alumma + dark  → Só nome "ALUMMA" em fundo escuro
 * - alumma + light → Só nome "ALUMMA" em fundo claro
 */
// Legado (PNGs antigos) — mantido só como fallback.
const LOGOS = {
  a:      { dark: '/logo/logo-a-dark.png', light: '/logo/logo-a-white.png' },
  alumma: { dark: '/logo/logo-alumma-dark.png', light: '/logo/logo-alumma-white.png' },
  full:   { dark: '/logo/logo-full-dark.png', light: '/logo/logo-full-white.png' },
} as const;

type Variant = keyof typeof LOGOS;
type Theme = 'dark' | 'light';

interface AlummaLogoProps {
  variant?: Variant;
  theme?: Theme;
  className?: string;
  width?: number;
  height?: number;
}

export function AlummaLogo({ variant = 'full', theme = 'dark', className = '', width, height }: AlummaLogoProps) {
  // Altura base aproximada para manter proporção parecida com os PNGs antigos
  const effectiveHeight =
    height ?? (width ? Math.round(width * 0.3) : 32);

  // Novo padrão: usar sempre o SVG inline que é o mesmo do frame do dashboard
  if (variant === 'full') {
    return (
      <AlummaLogoFullInline
        theme={theme}
        height={effectiveHeight}
        className={className}
      />
    );
  }

  // Variante só com o ícone "A"
  if (variant === 'a') {
    return (
      <AlummaLogoFullInline
        theme={theme}
        height={effectiveHeight}
        className={className}
        iconOnly
      />
    );
  }

  // Fallback para variantes antigas (ex.: "alumma") — usa PNG legado
  const table = LOGOS[variant] ?? LOGOS.full;
  const src = table[theme];
  return (
    <img
      src={src}
      alt="Alumma"
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

/** Mesmo componente; nome alternativo para uso em relatórios/impressão. */
export function AlummaLogoImg(props: AlummaLogoProps) {
  return <AlummaLogo {...props} />;
}

/**
 * Logo completa (A + ALUMMA) em SVG — fundo transparente.
 * Usar no header/sidebar e no relatório individual (único lugar da logo inicialmente).
 */
export function AlummaLogoFullInline({
  className = '',
  height = 32,
  /** 'dark' = laranja/âmbar para fundo escuro; 'light' = para fundo claro (ex.: relatório) */
  theme = 'dark',
  /** Se true, mostra só o ícone A (ex.: sidebar recolhida) */
  iconOnly = false,
}: {
  className?: string;
  height?: number;
  theme?: 'dark' | 'light';
  iconOnly?: boolean;
}) {
  const isLight = theme === 'light';
  const viewBox = iconOnly ? '0 0 32 32' : '0 0 140 32';
  const textColor = isLight ? '#1a1a1a' : '#f5f5f5';
  const gradientStart = isLight ? '#B8860B' : '#f0b429';
  const gradientEnd = isLight ? '#D4A017' : '#ff9f2e';
  const gradId = `alumma-grad-${theme}-${iconOnly}`;

  return (
    <svg
      viewBox={viewBox}
      height={height}
      className={className}
      style={{ display: 'block' }}
      aria-label="Alumma"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      {iconOnly ? (
        <path
          fill={`url(#${gradId})`}
          d="M16 4 L6 24 L10 24 L11 15 L21 15 L22 24 L26 24 L16 4 Z"
          transform="translate(3, 4) scale(0.8)"
        />
      ) : (
        <>
          <path
            fill={`url(#${gradId})`}
            d="M16 4 L6 24 L10 24 L11 15 L21 15 L22 24 L26 24 L16 4 Z"
          />
          <text
            x="34"
            y="22"
            fill={textColor}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="700"
            fontSize="18"
            letterSpacing="0.02em"
          >
            ALUMMA
          </text>
        </>
      )}
    </svg>
  );
}
