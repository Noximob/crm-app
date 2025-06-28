import React from 'react';

const treinamentos = [
  {
    title: 'Treinamento Sistema',
    description: 'Aprenda a usar todas as funcionalidades do CRM e do sistema.',
    icon: '💻',
  },
  {
    title: 'Funil de Vendas',
    description: 'Entenda o processo de vendas e como conduzir leads até o fechamento.',
    icon: '🔄',
  },
  {
    title: 'Vendas',
    description: 'Dicas, técnicas e estratégias para aumentar sua conversão.',
    icon: '📈',
  },
  {
    title: 'Materiais Auxiliares',
    description: 'Acesse roteiros, scripts, apresentações e outros recursos de apoio.',
    icon: '🗂️',
  },
];

export default function TreinamentosPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Treinamentos</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Capacite-se e potencialize seus resultados com nossos treinamentos e materiais exclusivos.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {treinamentos.map((item) => (
            <button
              key={item.title}
              className="flex flex-col items-center justify-center bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-8 transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] group"
            >
              <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-xl font-bold text-[#3478F6] dark:text-[#A3C8F7] mb-2 text-center">{item.title}</span>
              <span className="text-sm text-[#6B6F76] dark:text-gray-300 text-center">{item.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 