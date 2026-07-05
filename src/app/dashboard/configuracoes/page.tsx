'use client';

import React from 'react';

// Ícone de construção
const ConstructionIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2Z"/>
    <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>
    <path d="M4 15h16"/>
    <path d="M10 14v4"/>
    <path d="M14 14v4"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export default function ConfiguracoesPage() {
  return (
    <div className="min-h-full py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          {/* Ícone de construção */}
          <div className="flex justify-center mb-8">
            <div className="p-8 bg-gradient-to-br from-[#FF1E56]/10 to-[#FF3364]/5 rounded-full border border-[#FF1E56]/25">
              <ConstructionIcon className="text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)] animate-pulse" />
            </div>
          </div>

          {/* Título */}
          <h1 className="al-display text-4xl font-bold text-white uppercase tracking-[0.1em] mb-4">
            Em Construção
          </h1>

          {/* Subtítulo */}
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            A área de configurações está sendo desenvolvida com muito carinho para oferecer a melhor experiência possível.
          </p>
          
          {/* Card informativo */}
          <div className="al-card relative overflow-hidden p-8 max-w-2xl mx-auto">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">O que está por vir:</h2>
              </div>

              <ul className="space-y-3 text-left">
                <li className="flex items-center gap-3 text-text-secondary">
                  <span className="w-2 h-2 bg-[#34D399] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                  Personalização de perfil e preferências
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <span className="w-2 h-2 bg-[#34D399] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                  Configurações de notificações
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <span className="w-2 h-2 bg-[#34D399] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                  Integrações com sistemas externos
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <span className="w-2 h-2 bg-[#34D399] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                  Configurações de segurança da conta
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <span className="w-2 h-2 bg-[#34D399] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                  Preferências de idioma e região
                </li>
              </ul>
            </div>
          </div>

          {/* Mensagem de agradecimento */}
          <div className="mt-8 p-4 bg-white/[0.03] rounded-xl border border-white/[0.08]">
            <p className="text-text-secondary">
              <strong className="text-[#FF7A97]">Obrigado pela paciência!</strong> Estamos trabalhando para trazer funcionalidades incríveis em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 