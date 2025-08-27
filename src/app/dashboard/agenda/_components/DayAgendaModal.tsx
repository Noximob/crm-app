'use client';

import React from 'react';
import { Timestamp } from 'firebase/firestore';

interface AgendaItem {
  id: string;
  titulo: string;
  descricao?: string;
  dataHora: Timestamp;
  tipo: 'agenda' | 'crm' | 'nota' | 'aviso' | 'comunidade' | 'imobiliaria';
  status: 'pendente' | 'concluida' | 'cancelada';
  cor: string;
  leadId?: string;
  leadNome?: string;
  createdAt: Timestamp;
  userId: string;
  source?: 'agenda' | 'notas' | 'crm' | 'aviso' | 'comunidade' | 'imobiliaria';
  originalId?: string;
}

interface DayAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  items: AgendaItem[];
}

const tipoLabels = {
  agenda: 'Agenda',
  crm: 'CRM',
  nota: 'Nota',
  aviso: 'Aviso Importante',
  comunidade: 'Evento Comunidade',
  imobiliaria: 'Agenda Imobiliária'
};

const tipoCores = {
  agenda: 'bg-emerald-500',
  crm: 'bg-blue-500',
  nota: 'bg-yellow-500',
  aviso: 'bg-red-600',
  comunidade: 'bg-orange-500',
  imobiliaria: 'bg-purple-500'
};

export default function DayAgendaModal({ isOpen, onClose, date, items }: DayAgendaModalProps) {
  if (!isOpen || !date) return null;

  const sortedItems = items.sort((a, b) => a.dataHora.toDate().getTime() - b.dataHora.toDate().getTime());

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 w-full max-w-4xl mx-4 shadow-xl border border-[#E8E9F1] dark:border-[#23283A]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#3478F6] to-[#A3C8F7] rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">
                Agenda do Dia
              </h2>
              <p className="text-[#6B6F76] dark:text-gray-300">
                {date.toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#181C23] rounded-lg transition-colors"
          >
                          <svg className="w-6 h-6 text-[#6B6F76] dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
          </button>
        </div>

        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-[#181C23] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#2E2F38] dark:text-white mb-2">
              Nenhuma atividade agendada
            </h3>
            <p className="text-[#6B6F76] dark:text-gray-300">
              Este dia está livre de compromissos
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-all duration-200 ${
                  item.status === 'concluida' ? 'opacity-60' : ''
                }`}
                style={{ borderLeftColor: item.cor, borderLeftWidth: '4px' }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-4 h-4 rounded-full shadow-md mt-1 flex-shrink-0"
                    style={{ backgroundColor: item.cor }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-[#2E2F38] dark:text-white group-hover:text-[#3478F6] transition-colors">
                        {item.titulo}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tipoCores[item.tipo]} text-white`}>
                        {tipoLabels[item.tipo]}
                      </span>
                      {item.status === 'concluida' && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500 text-white">
                          Concluída
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {item.dataHora.toDate().toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>

                    {item.descricao && (
                      <div className="text-sm text-[#6B6F76] dark:text-gray-400 leading-relaxed mb-2">
                        {item.descricao}
                      </div>
                    )}

                    {item.leadNome && (
                      <div className="text-xs text-[#3478F76] dark:text-[#A3C8F7] font-medium">
                        📞 Lead: {item.leadNome}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[#E8E9F1] dark:border-[#23283A]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#6B6F76] dark:text-gray-300">
              Total: {sortedItems.length} atividade{sortedItems.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
