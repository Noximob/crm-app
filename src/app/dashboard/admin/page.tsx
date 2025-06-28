'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const adminCards = [
  { title: 'Relatórios', icon: '📊', description: 'Acompanhe métricas e resultados detalhados.', href: '/dashboard/admin/relatorios' },
  { title: 'Financeiro', icon: '💰', description: 'Controle financeiro da imobiliária.', href: '/dashboard/admin/financeiro' },
  { title: 'Site', icon: '🌐', description: 'Gerencie o site institucional e vitrines.', href: '/dashboard/admin/site' },
  { title: 'Marketing Imobiliário', icon: '📢', description: 'Ferramentas e campanhas de marketing.', href: '/dashboard/admin/marketing-imobiliario' },
  { title: 'Materiais Construtora', icon: '🏗️', description: 'Adicione e gerencie materiais das construtoras.', href: '/dashboard/admin/materiais-construtora' },
  { title: 'Gestão de Corretores', icon: '🧑‍💼', description: 'Administre os corretores da sua equipe.', href: '#' },
];

const financeiroTabs = [
  { label: 'Visão geral', icon: '📈' },
  { label: 'Lançamentos', icon: '↕️' },
  { label: 'Meus bancos', icon: '🏦' },
  { label: 'Meus cartões', icon: '💳' },
  { label: 'Histórico', icon: '🕒' },
  { label: 'Relatórios', icon: '📊', dropdown: ['Categorias', 'Fluxo'] },
  { label: 'Categorias', icon: '➕', dropdown: ['Receita', 'Despesa'] },
];

export default function AdminPage() {
  const [showFinanceiro, setShowFinanceiro] = useState(false);
  const [activeTab, setActiveTab] = useState('Visão geral');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Área do Administrador</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Gerencie recursos avançados da sua imobiliária.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {adminCards.map((item) => (
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
      {/* Modal Financeiro */}
      {showFinanceiro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-lg w-full max-w-3xl p-6 relative animate-fade-in">
            <button className="absolute top-4 right-4 text-2xl text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6]" onClick={() => setShowFinanceiro(false)}>&times;</button>
            <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-6">Financeiro</h2>
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
      )}
    </div>
  );
} 