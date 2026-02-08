'use client';

import React from 'react';
import { Timestamp } from 'firebase/firestore';

interface AgendaImobiliaria {
  id: string;
  titulo: string;
  descricao?: string;
  data: Timestamp;
  dataInicio?: Timestamp;
  dataFim?: Timestamp;
  tipo: 'reuniao' | 'evento' | 'treinamento' | 'outro' | 'revisar-crm' | 'ligacao-ativa' | 'acao-de-rua' | 'disparo-de-msg';
  local?: string;
  responsavel?: string;
  imobiliariaId: string;
}

interface AgendaImobiliariaModalProps {
  isOpen: boolean;
  onClose: () => void;
  agenda: AgendaImobiliaria[];
}

export default function AgendaImobiliariaModal({ isOpen, onClose, agenda }: AgendaImobiliariaModalProps) {
  if (!isOpen) return null;

  const sortedAgenda = agenda.sort((a, b) => {
    // Priorizar eventos com dataInicio/dataFim
    if (a.dataInicio && !b.dataInicio) return -1;
    if (!a.dataInicio && b.dataInicio) return 1;
    
    // Se ambos têm dataInicio, ordenar por ela
    if (a.dataInicio && b.dataInicio) {
      return a.dataInicio.toDate().getTime() - b.dataInicio.toDate().getTime();
    }
    
    // Caso contrário, ordenar por data de criação
    return a.data.toDate().getTime() - b.data.toDate().getTime();
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'reuniao': return '👥';
      case 'evento': return '🎉';
      case 'treinamento': return '📚';
      case 'revisar-crm': return '📋';
      case 'ligacao-ativa': return '📞';
      case 'acao-de-rua': return '📍';
      case 'disparo-de-msg': return '💬';
      default: return '📅';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'reuniao': return 'bg-blue-500';
      case 'evento': return 'bg-purple-500';
      case 'treinamento': return 'bg-green-500';
      case 'revisar-crm': return 'bg-cyan-500';
      case 'ligacao-ativa': return 'bg-emerald-500';
      case 'acao-de-rua': return 'bg-amber-500';
      case 'disparo-de-msg': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'reuniao': return 'Reunião';
      case 'evento': return 'Evento';
      case 'treinamento': return 'Treinamento';
      case 'revisar-crm': return 'Revisar CRM';
      case 'ligacao-ativa': return 'Ligação Ativa';
      case 'acao-de-rua': return 'Ação de rua';
      case 'disparo-de-msg': return 'Disparo de Msg';
      default: return 'Outro';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 shadow-xl border border-[#E8E9F1] max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#2E2F38]">
                Agenda Imobiliária
              </h2>
              <p className="text-[#6B6F76]">
                {agenda.length} evento{agenda.length !== 1 ? 's' : ''} agendado{agenda.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-[#6B6F76]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sortedAgenda.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#2E2F38] mb-2">
              Nenhum evento agendado
            </h3>
            <p className="text-[#6B6F76]">
              A imobiliária ainda não agendou eventos
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {sortedAgenda.map((evento) => (
              <div
                key={evento.id}
                className="p-4 rounded-xl border border-[#E8E9F1] hover:bg-[#F5F6FA] transition-all duration-200"
                style={{ borderLeftColor: '#8B5CF6', borderLeftWidth: '4px' }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 bg-purple-500 rounded-full shadow-md mt-1 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-[#2E2F38] group-hover:text-purple-600 transition-colors">
                        {evento.titulo}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(evento.tipo)} text-white`}>
                        {getTipoIcon(evento.tipo)} {getTipoLabel(evento.tipo)}
                      </span>
                    </div>
                    
                    {evento.descricao && (
                      <div className="text-sm text-[#6B6F76] leading-relaxed mb-3">
                        {evento.descricao}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-[#6B6F76]">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">Criado:</span>
                        {evento.data.toDate().toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>

                      {evento.dataInicio && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Início:</span>
                          {evento.dataInicio.toDate().toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}

                      {evento.dataFim && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Fim:</span>
                          {evento.dataFim.toDate().toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}

                      {evento.local && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-medium">Local:</span>
                          {evento.local}
                        </div>
                      )}

                      {evento.responsavel && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-medium">Responsável:</span>
                          {evento.responsavel}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[#E8E9F1]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#6B6F76]">
              Total: {sortedAgenda.length} evento{sortedAgenda.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
