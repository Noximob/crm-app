import React from 'react';

const materiais = [
  {
    title: 'Marketing Imobiliário',
    description: 'Materiais e estratégias para divulgação de imóveis e captação de leads.',
    icon: '📢',
  },
  {
    title: 'DWV',
    description: 'Documentos, workflows e materiais para vendas e processos internos.',
    icon: '📄',
  },
  {
    title: 'Materiais Construtoras',
    description: 'Catálogos, folders e apresentações das construtoras parceiras.',
    icon: '🏗️',
  },
];

export default function MateriaisPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Materiais</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Acesse conteúdos, documentos e recursos para impulsionar suas vendas e operações.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {materiais.map((mat) => (
            <button
              key={mat.title}
              className="flex flex-col items-center justify-center bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-8 transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] group"
              onClick={() => {
                if (mat.title === 'Marketing Imobiliário') {
                  window.location.href = '/dashboard/materiais/marketing-imobiliario';
                } else if (mat.title === 'Materiais Construtoras') {
                  window.location.href = '/dashboard/materiais/materiais-construtoras';
                }
              }}
            >
              <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">{mat.icon}</span>
              <span className="text-xl font-bold text-[#3478F6] dark:text-[#A3C8F7] mb-2 text-center">{mat.title}</span>
              <span className="text-sm text-[#6B6F76] dark:text-gray-300 text-center">{mat.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 