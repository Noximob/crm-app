'use client';

import React from 'react';

export default function ConfiguracoesPage() {
  return (
    <div className="min-h-screen bg-[#181C23] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Configurações
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Gerencie suas preferências e configurações da conta
          </p>
        </div>

        {/* Informações da Conta */}
        <div className="bg-[#23283A] rounded-2xl shadow-lg border border-[#23283A] p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Informações da Conta</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-300">
              <span className="font-semibold">Sistema configurado para modo escuro</span>
            </div>
          </div>
        </div>

        {/* Outras Configurações */}
        <div className="bg-[#23283A] rounded-2xl shadow-lg border border-[#23283A] p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Outras Configurações</h2>
          
          <p className="text-gray-300">
            Mais opções de configuração serão adicionadas em breve.
          </p>
        </div>
      </div>
    </div>
  );
} 