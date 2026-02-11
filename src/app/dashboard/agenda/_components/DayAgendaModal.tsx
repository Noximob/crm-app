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
  aviso: 'Aviso',
  comunidade: 'Plantão',
  imobiliaria: 'Imobiliária'
};

const tipoCores = {
  agenda: 'bg-emerald-500',
  crm: 'bg-amber-500',
  nota: 'bg-yellow-500',
  aviso: 'bg-red-600',
  comunidade: 'bg-orange-500',
  imobiliaria: 'bg-purple-500'
};

// Função para extrair informações essenciais de forma compacta
const getCompactInfo = (item: AgendaItem) => {
  if (!item.descricao) return null;
  
  const lines = item.descricao.split('\n').filter(line => line.trim() !== '');
  
  switch (item.tipo) {
    case 'crm':
      const crmMatch = item.descricao.match(/(.+?) - (.+)/);
      return crmMatch ? `${crmMatch[1]} • ${crmMatch[2]}` : null;
      
    case 'nota':
      const prioridadeMatch = item.descricao.match(/Prioridade: (.+)/);
      return prioridadeMatch ? `Prioridade: ${prioridadeMatch[1]}` : null;
      
    case 'aviso':
      // Para avisos, mostrar apenas período e horário se disponível
      const periodoMatch = item.descricao.match(/Período: (.+)/);
      const horarioDiarioMatch = item.descricao.match(/Horário diário: (.+)/);
      if (periodoMatch && horarioDiarioMatch) {
        return `${periodoMatch[1]} • ${horarioDiarioMatch[1]}`;
      } else if (periodoMatch) {
        return periodoMatch[1];
      } else if (horarioDiarioMatch) {
        return horarioDiarioMatch[1];
      }
      return null;
      
    case 'comunidade':
      // Para eventos da comunidade, mostrar apenas informações essenciais
      const info = [];
      const tipoMatch = item.descricao.match(/Tipo: (.+)/);
      const construtoraMatch = item.descricao.match(/Construtora: (.+)/);
      const corretorMatch = item.descricao.match(/Corretor: (.+)/);
      const horarioEventoMatch = item.descricao.match(/Horário: (.+)/);
      
      if (tipoMatch) info.push(tipoMatch[1]);
      if (construtoraMatch) info.push(construtoraMatch[1]);
      if (corretorMatch) info.push(corretorMatch[1]);
      if (horarioEventoMatch) info.push(horarioEventoMatch[1]);
      
      return info.length > 0 ? info.slice(0, 2).join(' • ') : null;
      
    case 'imobiliaria':
      // Para agenda imobiliária, mostrar apenas informações essenciais
      const imobInfo = [];
      const tipoImobMatch = item.descricao.match(/Tipo: (.+)/);
      const localMatch = item.descricao.match(/Local: (.+)/);
      const responsavelMatch = item.descricao.match(/Responsável: (.+)/);
      
      if (tipoImobMatch) imobInfo.push(tipoImobMatch[1]);
      if (localMatch) imobInfo.push(localMatch[1]);
      if (responsavelMatch) imobInfo.push(responsavelMatch[1]);
      
      return imobInfo.length > 0 ? imobInfo.slice(0, 2).join(' • ') : null;
      
    default:
      return lines[0] || null;
  }
};

export default function DayAgendaModal({ isOpen, onClose, date, items }: DayAgendaModalProps) {
  if (!isOpen || !date) return null;

  const sortedItems = items.sort((a, b) => a.dataHora.toDate().getTime() - b.dataHora.toDate().getTime());

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-[#23283A] rounded-2xl p-4 w-full max-w-5xl mx-4 shadow-xl border border-[#E8E9F1] dark:border-[#23283A]" onClick={e => e.stopPropagation()}>
        {/* Header mais compacto */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#D4A017] to-[#E8C547] rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">
                Agenda do Dia
              </h2>
              <p className="text-sm text-[#6B6F76] dark:text-gray-300">
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
            <svg className="w-5 h-5 text-[#6B6F76] dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sortedItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 dark:bg-[#181C23] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#2E2F38] dark:text-white mb-1">
              Nenhuma atividade agendada
            </h3>
            <p className="text-sm text-[#6B6F76] dark:text-gray-300">
              Este dia está livre de compromissos
            </p>
          </div>
        ) : (
          /* Grid de itens em duas colunas específicas */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
            {/* Coluna Esquerda: Tudo exceto CRM */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-3 px-2">
                Outros Compromissos
              </div>
              {sortedItems
                .filter(item => item.tipo !== 'crm')
                .sort((a, b) => a.dataHora.toDate().getTime() - b.dataHora.toDate().getTime())
                .map((item) => {
                  const compactInfo = getCompactInfo(item);
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-all duration-200 ${
                        item.status === 'concluida' ? 'opacity-60' : ''
                      }`}
                      style={{ borderLeftColor: item.cor, borderLeftWidth: '3px' }}
                    >
                      {/* Layout em linha única mais compacto */}
                      <div className="flex items-start gap-2">
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: item.cor }}
                        ></div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Primeira linha: título e tags */}
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-[#2E2F38] dark:text-white text-sm truncate flex-1">
                              {item.titulo}
                            </h3>
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${tipoCores[item.tipo]} text-white flex-shrink-0`}>
                              {tipoLabels[item.tipo]}
                            </span>
                            {item.status === 'concluida' && (
                              <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-green-500 text-white flex-shrink-0">
                                ✓
                              </span>
                            )}
                          </div>
                          
                          {/* Segunda linha: horário e informações compactas */}
                          <div className="flex items-center gap-3 text-xs text-[#6B6F76] dark:text-gray-400">
                            <div className="flex items-center gap-1 font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {item.dataHora.toDate().toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                            
                            {item.leadNome && (
                              <div className="flex items-center gap-1 text-[#D4A017] dark:text-[#E8C547]">
                                <span className="text-xs">📞</span>
                                <span className="truncate max-w-24">{item.leadNome}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Terceira linha: informações compactas */}
                          {compactInfo && (
                            <div className="mt-1 text-xs text-[#6B6F76] dark:text-gray-400 truncate">
                              {compactInfo}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Coluna Direita: Apenas CRM */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-3 px-2">
                Tarefas CRM
              </div>
              {(() => {
                const crmItems = sortedItems
                  .filter(item => item.tipo === 'crm')
                  .sort((a, b) => a.dataHora.toDate().getTime() - b.dataHora.toDate().getTime());
                
                if (crmItems.length === 0) {
                  return (
                    <div className="text-center py-8 text-sm text-[#6B6F76] dark:text-gray-400">
                      <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p>Nenhuma tarefa CRM</p>
                    </div>
                  );
                }

                return crmItems.map((item) => {
                  const compactInfo = getCompactInfo(item);
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-all duration-200 ${
                        item.status === 'concluida' ? 'opacity-60' : ''
                      }`}
                      style={{ borderLeftColor: item.cor, borderLeftWidth: '3px' }}
                    >
                      {/* Layout em linha única mais compacto */}
                      <div className="flex items-start gap-2">
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: item.cor }}
                        ></div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Primeira linha: título e tags */}
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-[#2E2F38] dark:text-white text-sm truncate flex-1">
                              {item.titulo}
                            </h3>
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${tipoCores[item.tipo]} text-white flex-shrink-0`}>
                              {tipoLabels[item.tipo]}
                            </span>
                            {item.status === 'concluida' && (
                              <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-green-500 text-white flex-shrink-0">
                                ✓
                              </span>
                            )}
                          </div>
                          
                          {/* Segunda linha: horário e lead */}
                          <div className="flex items-center gap-3 text-xs text-[#6B6F76] dark:text-gray-400">
                            <div className="flex items-center gap-1 font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {item.dataHora.toDate().toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                            
                            {item.leadNome && (
                              <div className="flex items-center gap-1 text-[#D4A017] dark:text-[#E8C547]">
                                <span className="text-xs">📞</span>
                                <span className="truncate max-w-24">{item.leadNome}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Terceira linha: informações compactas */}
                          {compactInfo && (
                            <div className="mt-1 text-xs text-[#6B6F76] dark:text-gray-400 truncate">
                              {compactInfo}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Footer mais compacto */}
        <div className="mt-4 pt-3 border-t border-[#E8E9F1] dark:border-[#23283A]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#6B6F76] dark:text-gray-300">
              Total: {sortedItems.length} atividade{sortedItems.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#D4A017] text-white rounded-lg hover:bg-[#B8860B] transition-colors font-medium text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
