import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores personalizadas para o CRM
        primary: {
          50: '#f0f8ff',   // Azul muito claro
          100: '#e0f2fe',  // Azul claro
          200: '#bae6fd',  // Azul médio claro
          300: '#7dd3fc',  // Azul médio
          400: '#38bdf8',  // Azul
          500: '#0ea5e9',  // Azul principal
          600: '#0284c7',  // Azul escuro
          700: '#0369a1',  // Azul mais escuro
          800: '#075985',  // Azul muito escuro
          900: '#0c4a6e',  // Azul mais escuro ainda
        },
        // Branco menos branco para não cansar a vista
        offwhite: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
        },
        // Cinza suave para textos
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
        }
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