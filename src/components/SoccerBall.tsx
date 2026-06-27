import React from 'react';

/**
 * Bola de futebol estilizada (padrão clássico Telstar) com brilho para dar volume.
 * Usada no tema Copa do Mundo no lugar do ícone do WhatsApp.
 */
export const SoccerBallIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" fill="none" {...props}>
    {/* corpo da bola + brilho */}
    <circle cx="16" cy="16" r="15" fill="#fbfcfe" stroke="#0f172a" strokeWidth="1" />
    <ellipse cx="11" cy="10" rx="6.5" ry="4.2" fill="#ffffff" opacity="0.55" />
    <path d="M16 31a15 15 0 0 0 13-7.5A15 15 0 0 1 9 29.6 15 15 0 0 0 16 31Z" fill="#0f172a" opacity="0.06" />

    {/* costuras */}
    <g stroke="#0f172a" strokeWidth="1.1" strokeLinecap="round">
      <line x1="16" y1="11" x2="16" y2="3.8" />
      <line x1="20.76" y1="14.45" x2="27.6" y2="12.23" />
      <line x1="18.94" y1="20.05" x2="23.17" y2="25.87" />
      <line x1="13.06" y1="20.05" x2="8.83" y2="25.87" />
      <line x1="11.24" y1="14.45" x2="4.4" y2="12.23" />
    </g>

    {/* pentágono central */}
    <polygon points="16,11 20.76,14.45 18.94,20.05 13.06,20.05 11.24,14.45" fill="#0f172a" />

    {/* pentágonos das bordas */}
    <g fill="#0f172a">
      <polygon points="16,1.5 18.19,3.09 17.35,5.66 14.65,5.66 13.81,3.09" />
      <polygon points="27.6,9.93 29.79,11.52 28.95,14.09 26.25,14.09 25.41,11.52" />
      <polygon points="23.17,23.57 25.36,25.16 24.52,27.73 21.82,27.73 20.98,25.16" />
      <polygon points="8.83,23.57 11.02,25.16 10.18,27.73 7.48,27.73 6.64,25.16" />
      <polygon points="4.4,9.93 6.59,11.52 5.75,14.09 3.05,14.09 2.21,11.52" />
    </g>
  </svg>
);

export default SoccerBallIcon;
