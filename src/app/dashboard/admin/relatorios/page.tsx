'use client';

import React, { useState } from 'react';

const relatorioTabs = [
  'Leads',
  'Imóveis',
  'Captação',
  'Atendimentos',
  'Equipe',
  'Marketing',
  'Ocupação',
  'Documentação',
  'Parcerias',
  'Treinamentos',
];

export default function RelatoriosAdminPage() {
  const [activeTab, setActiveTab] = useState('Leads');

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Relatórios</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Acompanhe os principais indicadores e resultados da sua imobiliária.</p>
        {/* Abas */}
        <div className="flex gap-2 border-b border-[#E8E9F1] dark:border-[#23283A] mb-6 overflow-x-auto">
          {relatorioTabs.map(tab => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors duration-150 ${activeTab === tab ? 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#3478F6]' : 'text-[#6B6F76] dark:text-gray-300 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23]'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {/* Conteúdo mock de cada aba */}
        <div className="min-h-[300px]">
          {activeTab === 'Leads' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col items-center">
                <span className="text-3xl font-bold text-[#3478F6] mb-2">1.250</span>
                <span className="text-sm text-[#6B6F76] dark:text-gray-300">Leads totais</span>
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col items-center">
                <span className="text-3xl font-bold text-[#22C55E] mb-2">320</span>
                <span className="text-sm text-[#6B6F76] dark:text-gray-300">Novos este mês</span>
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col items-center">
                <span className="text-3xl font-bold text-[#F59E42] mb-2">18%</span>
                <span className="text-sm text-[#6B6F76] dark:text-gray-300">Taxa de conversão</span>
              </div>
            </div>
          )}
          {activeTab === 'Imóveis' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col">
                <span className="font-bold text-[#3478F6] mb-2">Mais visualizados</span>
                <ul className="text-sm text-[#2E2F38] dark:text-white">
                  <li>Apto Central - 120 visitas</li>
                  <li>Casa Piscina - 98 visitas</li>
                  <li>Studio Moderno - 75 visitas</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col">
                <span className="font-bold text-[#22C55E] mb-2">Vendidos este mês</span>
                <ul className="text-sm text-[#2E2F38] dark:text-white">
                  <li>Casa Piscina - R$ 850.000</li>
                  <li>Apto Central - R$ 450.000</li>
                </ul>
              </div>
            </div>
          )}
          {activeTab === 'Captação' && (
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <span className="font-bold text-[#3478F6] mb-2 block">Origem dos Leads</span>
              <ul className="text-sm text-[#2E2F38] dark:text-white">
                <li>Instagram: 40%</li>
                <li>Google Ads: 35%</li>
                <li>Indicação: 15%</li>
                <li>Site: 10%</li>
              </ul>
            </div>
          )}
          {activeTab === 'Atendimentos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col">
                <span className="font-bold text-[#3478F6] mb-2">Tempo médio de atendimento</span>
                <span className="text-2xl font-bold">2h 15min</span>
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col">
                <span className="font-bold text-[#22C55E] mb-2">Satisfação dos clientes</span>
                <span className="text-2xl font-bold">4,7/5 ⭐</span>
              </div>
            </div>
          )}
          {activeTab === 'Equipe' && (
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <span className="font-bold text-[#3478F6] mb-2 block">Ranking de Corretores</span>
              <ol className="text-sm text-[#2E2F38] dark:text-white list-decimal ml-4">
                <li>Ana Corretora - 12 vendas</li>
                <li>Carlos Santos - 9 vendas</li>
                <li>Equipe Alume - 7 vendas</li>
              </ol>
            </div>
          )}
          {activeTab === 'Marketing' && (
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <span className="font-bold text-[#3478F6] mb-2 block">Campanhas Recentes</span>
              <ul className="text-sm text-[#2E2F38] dark:text-white">
                <li>Google Ads - 120 leads</li>
                <li>Instagram - 80 leads</li>
                <li>Facebook - 40 leads</li>
              </ul>
            </div>
          )}
          {activeTab === 'Ocupação' && (
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <span className="font-bold text-[#3478F6] mb-2 block">Taxa de Ocupação</span>
              <span className="text-2xl font-bold">92%</span>
              <div className="text-xs text-[#6B6F76] dark:text-gray-300 mt-2">Imóveis alugados vs. disponíveis</div>
            </div>
          )}
          {activeTab === 'Documentação' && (
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <span className="font-bold text-[#3478F6] mb-2 block">Contratos Pendentes</span>
              <ul className="text-sm text-[#2E2F38] dark:text-white">
                <li>João Silva - Aguardando assinatura</li>
                <li>Maria Souza - Vencimento em 3 dias</li>
              </ul>
            </div>
          )}
          {activeTab === 'Parcerias' && (
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <span className="font-bold text-[#3478F6] mb-2 block">Construtoras Parceiras</span>
              <ul className="text-sm text-[#2E2F38] dark:text-white">
                <li>Construtora Alpha - 5 imóveis ativos</li>
                <li>Construtora Beta - 3 imóveis ativos</li>
              </ul>
            </div>
          )}
          {activeTab === 'Treinamentos' && (
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <span className="font-bold text-[#3478F6] mb-2 block">Participação em Treinamentos</span>
              <ul className="text-sm text-[#2E2F38] dark:text-white">
                <li>Ana Corretora - 100%</li>
                <li>Carlos Santos - 80%</li>
                <li>Equipe Alume - 60%</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 