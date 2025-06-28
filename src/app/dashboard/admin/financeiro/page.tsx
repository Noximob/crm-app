'use client';

import React, { useState } from 'react';

const financeiroTabs = [
  { label: 'Visão geral', icon: '📈' },
  { label: 'Lançamentos', icon: '↕️' },
  { label: 'Meus bancos', icon: '🏦' },
  { label: 'Meus cartões', icon: '💳' },
  { label: 'Histórico', icon: '🕒' },
  { label: 'Relatórios', icon: '📊', dropdown: ['Categorias', 'Fluxo'] },
  { label: 'Categorias', icon: '➕', dropdown: ['Receita', 'Despesa'] },
];

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState('Visão geral');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Financeiro</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Gerencie o financeiro da sua imobiliária de forma moderna e intuitiva.</p>
        {/* Abas do Financeiro */}
        <div className="flex gap-2 border-b border-[#E8E9F1] dark:border-[#23283A] mb-6 overflow-x-auto">
          {financeiroTabs.map((tab) => (
            <div key={tab.label} className="relative">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors duration-150 ${activeTab === tab.label ? 'bg-[#F5F6FA] dark:bg-[#181C23] text-[#3478F6]' : 'text-[#6B6F76] dark:text-gray-300 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23]'}`}
                onClick={() => {
                  setActiveTab(tab.label);
                  setOpenDropdown(null);
                }}
                onMouseEnter={() => tab.dropdown && setOpenDropdown(tab.label)}
                onMouseLeave={() => tab.dropdown && setOpenDropdown(null)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.dropdown && <span className="ml-1">▼</span>}
              </button>
              {/* Dropdown */}
              {tab.dropdown && openDropdown === tab.label && (
                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-[#23283A] shadow-lg rounded-lg py-2 min-w-[120px] z-10">
                  {tab.dropdown.map((item) => (
                    <button
                      key={item}
                      className="block w-full text-left px-4 py-2 text-[#2E2F38] dark:text-white hover:bg-[#F5F6FA] dark:hover:bg-[#181C23]"
                      onClick={() => {
                        setActiveTab(item);
                        setOpenDropdown(null);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Conteúdo da aba selecionada (mock) */}
        <div className="min-h-[200px] flex items-center justify-center text-[#6B6F76] dark:text-gray-300 text-lg">
          <span>Conteúdo: <b>{activeTab}</b> (mock)</span>
        </div>
      </div>
    </div>
  );
} 