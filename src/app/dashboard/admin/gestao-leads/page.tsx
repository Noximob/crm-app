import React from 'react';

export default function GestaoLeadsPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Gestão de Leads dos Corretores</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Transfira, filtre e organize os leads entre os corretores da sua imobiliária.</p>
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
          <label className="font-medium text-[#6B6F76] dark:text-gray-300">Filtrar por etapa:</label>
          <select className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white">
            <option value="">Todas</option>
            <option value="Pré-qualificação">Pré-qualificação</option>
            <option value="Qualificação">Qualificação</option>
            <option value="Proposta">Proposta</option>
            <option value="Geladeira">Geladeira</option>
            {/* Adicione outras etapas conforme necessário */}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Aqui será renderizada a lista de corretores e seus leads, com seleção e botões de ação */}
          <div className="bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl p-4 border border-[#E8E9F1] dark:border-[#23283A]">
            <p className="text-[#6B6F76] dark:text-gray-300">(Exemplo) Corretor: João Silva</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-center gap-2">
                <input type="checkbox" />
                <span className="flex-1 text-[#2E2F38] dark:text-white">Lead: Maria Souza (Pré-qualificação)</span>
                <button className="text-red-500 hover:text-red-700 text-xs">Apagar</button>
              </li>
              {/* Repita para outros leads */}
            </ul>
          </div>
          {/* Repita para outros corretores */}
        </div>
        <div className="mt-6 flex gap-4 justify-end">
          <select className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white">
            <option value="">Selecione corretor de destino</option>
            {/* Listar corretores */}
          </select>
          <button className="px-6 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors">Transferir</button>
        </div>
      </div>
    </div>
  );
} 