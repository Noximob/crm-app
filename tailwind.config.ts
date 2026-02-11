import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: 'var(--bg-primary)',
          card: 'var(--bg-card)',
          secondary: 'var(--bg-card-hover, #E8E9F1)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
        
        // Cor Primária (Ação e Identidade) — Amarelo/âmbar suave (menos gritante)
        primary: {
          50: '#fffbeb',
          100: '#fef6e7',
          200: '#fdecc2',
          300: '#fbe08f',
          400: '#f5c94a',
          500: '#D4A017',         // Dourado suave - principal
          600: '#B8860B',         // Dark goldenrod - hover
          700: '#9A7309',
          800: '#7C5E08',
          900: '#654D06',
        },
        
        // Cores de Estado / Feedback Visual
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#3AC17C',         // Verde menta - Sucesso
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#FFCC66',         // Amarelo suave - Aviso
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#F45B69',         // Vermelho rosado - Erro
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        
        info: {
          50: '#fffbeb',
          100: '#fef6e7',
          200: '#fdecc2',
          300: '#fbe08f',
          400: '#f5c94a',
          500: '#E8C547',         // Amarelo suave - info
          600: '#B8860B',
          700: '#9A7309',
          800: '#7C5E08',
          900: '#654D06',
        },
        
        // Cores legadas para compatibilidade
        offwhite: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
        },
        softgray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config; 