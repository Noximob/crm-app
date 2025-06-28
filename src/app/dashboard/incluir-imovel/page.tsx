import React from 'react';

const qualificacoes = [
  { label: 'Tipo de Imóvel', type: 'select', options: ['Apartamento', 'Casa', 'Cobertura', 'Terreno', 'Comercial'] },
  { label: 'Finalidade', type: 'select', options: ['Venda', 'Aluguel', 'Temporada'] },
  { label: 'Dormitórios', type: 'select', options: ['1', '2', '3', '4+'] },
  { label: 'Suítes', type: 'select', options: ['0', '1', '2', '3+'] },
  { label: 'Vagas de Garagem', type: 'select', options: ['0', '1', '2', '3+'] },
  { label: 'Área (m²)', type: 'text' },
  { label: 'Aceita Permuta', type: 'checkbox' },
  { label: 'Mobiliado', type: 'checkbox' },
];

export default function IncluirImovelPage() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-6 text-left">Incluir Imóvel</h1>
        <form className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-8 flex flex-col gap-6">
          {/* Título */}
          <div>
            <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Título do Imóvel</label>
            <input type="text" className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white" placeholder="Ex: Apartamento alto padrão no centro" />
          </div>
          {/* Upload de fotos (simulado) */}
          <div>
            <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Fotos do Imóvel</label>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-[#3478F6] rounded-xl cursor-pointer bg-[#F5F6FA] dark:bg-[#181C23] hover:bg-[#E8E9F1] dark:hover:bg-[#23283A] transition-colors">
                <span className="text-4xl text-[#3478F6]">+</span>
                <span className="text-xs text-[#6B6F76] dark:text-gray-300 mt-2">Adicionar foto</span>
                <input type="file" className="hidden" multiple />
              </label>
              {/* Miniaturas simuladas */}
              <div className="w-20 h-20 bg-[#E8E9F1] dark:bg-[#181C23] rounded-lg flex items-center justify-center text-[#3478F6] text-2xl">🏠</div>
              <div className="w-20 h-20 bg-[#E8E9F1] dark:bg-[#181C23] rounded-lg flex items-center justify-center text-[#3478F6] text-2xl">🌇</div>
            </div>
          </div>
          {/* Descrição */}
          <div>
            <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Descrição</label>
            <textarea className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white min-h-[100px]" placeholder="Descreva os diferenciais, localização, condições, etc." />
          </div>
          {/* Qualificação do Imóvel */}
          <div>
            <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Qualificação do Imóvel</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qualificacoes.map((q) => (
                <div key={q.label} className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300">{q.label}</label>
                  {q.type === 'select' && (
                    <select className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white">
                      <option value="">Selecione</option>
                      {q.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {q.type === 'text' && (
                    <input type="text" className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white" />
                  )}
                  {q.type === 'checkbox' && (
                    <div className="flex items-center gap-2 mt-1">
                      <input type="checkbox" className="rounded border-[#E8E9F1] dark:border-[#23283A] text-[#3478F6] focus:ring-[#3478F6]" id={q.label} />
                      <label htmlFor={q.label} className="text-xs text-[#6B6F76] dark:text-gray-300">Sim</label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Botão de salvar (simulado) */}
          <div className="flex justify-end">
            <button type="button" className="px-6 py-2 rounded-lg bg-[#3478F6] text-white font-bold shadow-soft hover:bg-[#255FD1] transition-colors">Salvar imóvel</button>
          </div>
        </form>
      </div>
    </div>
  );
} 