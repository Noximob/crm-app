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

export default function PagamentosPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          {/* Ícone de construção */}
          <div className="flex justify-center mb-8">
            <div className="p-8 bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF8E8E]/5 rounded-full border border-[#FF6B6B]/20">
              <ConstructionIcon className="text-[#FF6B6B] animate-pulse" />
            </div>
          </div>
          
          {/* Título */}
          <h1 className="text-4xl font-bold text-[#2E2F38] dark:text-white mb-4">
            🚧 Em Construção 🚧
          </h1>
          
          {/* Subtítulo */}
          <p className="text-xl text-[#6B6F76] dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            A área de pagamentos está sendo desenvolvida com muito carinho para oferecer a melhor experiência possível.
          </p>
          
          {/* Card informativo */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-lg border border-[#E8E9F1] dark:border-[#23283A] p-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[#3478F6]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h2 className="text-lg font-semibold">O que está por vir:</h2>
              </div>
              
              <ul className="space-y-3 text-left">
                <li className="flex items-center gap-3 text-[#6B6F76] dark:text-gray-300">
                  <span className="w-2 h-2 bg-[#3AC17C] rounded-full"></span>
                  Gestão completa de planos e assinaturas
                </li>
                <li className="flex items-center gap-3 text-[#6B6F76] dark:text-gray-300">
                  <span className="w-2 h-2 bg-[#3AC17C] rounded-full"></span>
                  Integração com gateways de pagamento
                </li>
                <li className="flex items-center gap-3 text-[#6B6F76] dark:text-gray-300">
                  <span className="w-2 h-2 bg-[#3AC17C] rounded-full"></span>
                  Histórico detalhado de transações
                </li>
                <li className="flex items-center gap-3 text-[#6B6F76] dark:text-gray-300">
                  <span className="w-2 h-2 bg-[#3AC17C] rounded-full"></span>
                  Relatórios financeiros avançados
                </li>
                <li className="flex items-center gap-3 text-[#6B6F76] dark:text-gray-300">
                  <span className="w-2 h-2 bg-[#3AC17C] rounded-full"></span>
                  Notificações automáticas de pagamento
                </li>
              </ul>
            </div>
          </div>
          
          {/* Mensagem de agradecimento */}
          <div className="mt-8 p-4 bg-gradient-to-r from-[#3478F6]/10 to-[#A3C8F7]/10 rounded-xl border border-[#3478F6]/20">
            <p className="text-[#6B6F76] dark:text-gray-300">
              <strong className="text-[#3478F6]">Obrigado pela paciência!</strong> Estamos trabalhando para trazer funcionalidades incríveis em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 