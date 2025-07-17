'use client';

import React from 'react';
import Link from 'next/link';

const treinamentos = [
  {
    title: 'Áudio Books',
    description: 'Acesse nossa biblioteca de áudio books para desenvolvimento pessoal e profissional.',
    icon: '📚',
    href: '/dashboard/treinamentos/audiobooks',
  },
  {
    title: 'Vendas',
    description: 'Técnicas, estratégias e dicas para aumentar sua conversão e fechar mais vendas.',
    icon: '📈',
    href: '/dashboard/treinamentos/vendas',
  },
  {
    title: 'Mercado',
    description: 'Análises de mercado, tendências e insights sobre o setor imobiliário.',
    icon: '🏢',
    href: '/dashboard/treinamentos/mercado',
  },
  {
    title: 'Institucional',
    description: 'Conteúdo sobre a empresa, valores, processos e políticas institucionais.',
    icon: '🏛️',
    href: '/dashboard/treinamentos/institucional',
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
            <Link
              key={item.title}
              href={item.href}
              className="flex flex-col items-center justify-center bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-8 transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] group cursor-pointer"
              tabIndex={0}
            >
              <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-xl font-bold text-[#3478F6] dark:text-[#A3C8F7] mb-2 text-center">{item.title}</span>
              <span className="text-sm text-[#6B6F76] dark:text-gray-300 text-center">{item.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 