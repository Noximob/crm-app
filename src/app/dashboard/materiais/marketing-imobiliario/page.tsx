'use client';

import React from 'react';

const materiaisMock = [
  {
    id: 1,
    titulo: 'Folder de lançamento',
    descricao: 'Material em PDF para divulgação do novo prédio.',
    tipo: 'pdf',
    data: '10/07/2024',
    link: '',
    preview: '',
  },
  {
    id: 2,
    titulo: 'Campanha Google Ads',
    descricao: 'Link da campanha ativa no Google.',
    tipo: 'link',
    data: '09/07/2024',
    link: 'https://ads.google.com/campanha123',
    preview: '',
  },
];

export default function MarketingImobiliarioMateriaisPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Marketing Imobiliário</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Confira os materiais de marketing produzidos pela imobiliária para uso da equipe.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {materiaisMock.map(m => (
            <div key={m.id} className="bg-white dark:bg-[#23283A] rounded-xl p-6 flex items-center gap-4 border border-[#E8E9F1] dark:border-[#23283A]">
              {m.tipo === 'pdf' && <span className="w-16 h-16 flex items-center justify-center bg-[#F5F6FA] dark:bg-[#181C23] rounded text-[#3478F6] font-bold text-lg">PDF</span>}
              {m.tipo === 'link' && <a href={m.link} target="_blank" rel="noopener noreferrer" className="w-16 h-16 flex items-center justify-center bg-[#F5F6FA] dark:bg-[#181C23] rounded text-[#3478F6] font-bold underline text-lg">Link</a>}
              <div className="flex-1">
                <div className="font-bold text-[#2E2F38] dark:text-white text-lg">{m.titulo}</div>
                <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1">{m.descricao}</div>
                <div className="text-xs text-[#6B6F76] dark:text-gray-400">{m.tipo.toUpperCase()} • {m.data}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 