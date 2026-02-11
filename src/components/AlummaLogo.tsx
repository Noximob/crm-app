'use client';

import React from 'react';

/** Onde usar: dark = fundo escuro (sidebar, TV, login escuro). light = fundo claro (esqueci-senha, header relatório). */
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
