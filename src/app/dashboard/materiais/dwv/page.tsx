'use client';

import React from 'react';

export default function DWVPage() {
  const openDWV = () => {
    window.open('https://app.dwvapp.com.br/home', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-4 text-left">DWV</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Acesse o sistema DWV em uma nova aba.</p>
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-6">🏠</div>
            <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-4">Sistema DWV</h2>
            <p className="text-[#6B6F76] dark:text-gray-300 mb-8 max-w-md">
              Clique no botão abaixo para acessar o sistema DWV em uma nova aba do navegador.
            </p>
            <button
              onClick={openDWV}
              className="px-8 py-4 bg-[#D4A017] hover:bg-[#B8860B] text-white rounded-xl font-semibold transition-colors flex items-center gap-3 text-lg mx-auto"
            >
              <span>🔗</span>
              Abrir DWV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 