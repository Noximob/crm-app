'use client';

import React from 'react';

interface AlummaLogoProps {
  variant?: 'full' | 'a';
  theme?: 'dark' | 'light';
  className?: string;
  width?: number;
  height?: number;
}

/** Logo Nox Imóveis (SVG inline). variant 'a' mostra só o ícone. */
export function AlummaLogo({ variant = 'full', theme = 'dark', className = '', width, height }: AlummaLogoProps) {
  const effectiveHeight = height ?? (width ? Math.round(width * 0.3) : 32);
  return (
    <AlummaLogoFullInline
      theme={theme}
      height={effectiveHeight}
      className={className}
      iconOnly={variant === 'a'}
    />
  );
}

/**
 * Logo completa (ícone + NOX IMÓVEIS) em SVG — fundo transparente.
 */
export function AlummaLogoFullInline({
  className = '',
  height = 32,
  /** 'dark' = para fundo escuro; 'light' = para fundo claro (ex.: relatório impresso) */
  theme = 'dark',
  /** Se true, mostra só o ícone (ex.: sidebar recolhida) */
  iconOnly = false,
}: {
  className?: string;
  height?: number;
  theme?: 'dark' | 'light';
  iconOnly?: boolean;
}) {
  const isLight = theme === 'light';
  const viewBox = iconOnly ? '0 0 32 32' : '0 0 160 32';
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
      aria-label="Nox Imóveis"
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
            y="21"
            fill={textColor}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="700"
            fontSize="15"
            letterSpacing="0.02em"
          >
            NOX IMÓVEIS
          </text>
        </>
      )}
    </svg>
  );
}
