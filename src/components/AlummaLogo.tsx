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
  const src = LOGOS[variant][theme];
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
