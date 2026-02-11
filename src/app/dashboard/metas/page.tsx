import React from 'react';

const metas = [
  {
    title: 'Meta Mensal',
    value: 'R$ 180.000',
    progress: 75,
    description: 'Valor total de vendas para o mês',
    color: 'bg-[#F59E0B]',
  },
  {
    title: 'Vendas Realizadas',
    value: 'R$ 135.000',
    progress: 75,
    description: 'Total já vendido neste mês',
    color: 'bg-[#22C55E]',
  },
  {
    title: 'Propostas Enviadas',
    value: '12',
    progress: 60,
    description: 'Propostas enviadas para clientes',
    color: 'bg-[#F59E42]',
  },
];

const ranking = [
  { nome: 'Ana Silva', vendas: 8, avatar: '🟡' },
  { nome: 'Carlos Santos', vendas: 6, avatar: '⚪' },
  { nome: 'Mariana Costa', vendas: 5, avatar: '🟠' },
];

export default function MetasPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Metas</h1>
          <p className="text-[#6B6F76] dark:text-gray-300 text-left text-base">Acompanhe seu progresso, motive-se e bata suas metas!</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {metas.map((meta) => (
            <div key={meta.title} className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">{meta.title}</span>
              <span className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-2">{meta.value}</span>
              <div className="w-full h-3 bg-[#E8E9F1] dark:bg-[#181C23] rounded-full mb-2">
                <div className={`${meta.color} h-3 rounded-full`} style={{ width: `${meta.progress}%` }}></div>
              </div>
              <span className="text-xs text-[#6B6F76] dark:text-gray-400">{meta.description}</span>
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6">
          <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Ranking do Mês</h2>
          <div className="flex flex-col md:flex-row gap-6">
            {ranking.map((corretor, idx) => (
              <div key={corretor.nome} className="flex items-center gap-3 bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl px-4 py-3 flex-1">
                <span className="text-2xl">{corretor.avatar}</span>
                <div>
                  <span className="font-bold text-[#2E2F38] dark:text-white">{corretor.nome}</span>
                  <div className="text-xs text-[#6B6F76] dark:text-gray-300">{corretor.vendas} vendas</div>
                </div>
                <span className="ml-auto text-xs text-[#F59E0B] font-bold">#{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 