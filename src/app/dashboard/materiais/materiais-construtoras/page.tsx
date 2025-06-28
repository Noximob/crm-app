'use client';

import React from 'react';

const linksMock = [
  {
    id: 1,
    construtora: 'Construtora Alpha',
    link: 'https://materiais.alpha.com.br/folder2024',
    descricao: 'Folder institucional atualizado 2024.'
  },
  {
    id: 2,
    construtora: 'Construtora Beta',
    link: 'https://beta.com.br/materiais',
    descricao: 'Acesso ao drive de materiais da Beta.'
  },
];

export default function MateriaisConstrutorasPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Materiais Construtoras</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Acesse os links de materiais das construtoras parceiras cadastrados pela imobiliária.</p>
        <div className="flex flex-col gap-6">
          {linksMock.map(l => (
            <div key={l.id} className="bg-white dark:bg-[#23283A] rounded-xl p-6 flex items-center gap-4 border border-[#E8E9F1] dark:border-[#23283A]">
              <div className="flex-1">
                <div className="font-bold text-[#2E2F38] dark:text-white text-lg">{l.construtora}</div>
                <a href={l.link} target="_blank" rel="noopener noreferrer" className="text-[#3478F6] underline break-all text-sm">{l.link}</a>
                {l.descricao && <div className="text-xs text-[#6B6F76] dark:text-gray-300 mt-1">{l.descricao}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 