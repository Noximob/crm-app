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
      case 'plantao': return '🏢';
      default: return '📅';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'reuniao': return 'bg-[#E8C547]/10 border-[#E8C547]/35 text-[#FFE9A6]';
      case 'evento': return 'bg-[#9F6BFF]/10 border-[#9F6BFF]/35 text-[#C4A6FF]';
      case 'treinamento': return 'bg-[#34D399]/10 border-[#34D399]/35 text-emerald-200';
      case 'revisar-crm': return 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]';
      case 'ligacao-ativa': return 'bg-[#34D399]/10 border-[#34D399]/35 text-emerald-300';
      case 'acao-de-rua': return 'bg-[#E8C547]/10 border-[#E8C547]/35 text-[#FFE9A6]';
      case 'disparo-de-msg': return 'bg-indigo-500/10 border-indigo-400/35 text-indigo-300';
      case 'plantao': return 'bg-[#9F6BFF]/10 border-[#9F6BFF]/35 text-[#C4A6FF]';
      default: return 'bg-white/[0.06] border-white/15 text-text-secondary';
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
      case 'plantao': return 'Plantão';
      default: return 'Outro';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#12101a] rounded-2xl p-6 w-full max-w-4xl mx-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] border border-white/10 max-h-[90vh] overflow-hidden relative" onClick={e => e.stopPropagation()}>
        <div className="absolute inset-x-0 top-0 gx-line" />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#9F6BFF] to-[#6D3FD4] rounded-full flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(159,107,255,0.5)]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">
                Agenda Imobiliária
              </h2>
              <p className="text-text-secondary text-sm">
                {agenda.length} evento{agenda.length !== 1 ? 's' : ''} agendado{agenda.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-[#FF5C7E] rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sortedAgenda.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/[0.04] border border-white/[0.08] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Nenhum evento agendado
            </h3>
            <p className="text-text-secondary">
              A imobiliária ainda não agendou eventos
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {sortedAgenda.map((evento) => (
              <div
                key={evento.id}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] transition-all duration-200"
                style={{ borderLeftColor: '#9F6BFF', borderLeftWidth: '4px' }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 bg-[#9F6BFF] rounded-full shadow-[0_0_8px_rgba(159,107,255,0.6)] mt-1 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white transition-colors">
                        {evento.titulo}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getTipoColor(evento.tipo)}`}>
                        {getTipoIcon(evento.tipo)} {getTipoLabel(evento.tipo)}
                      </span>
                    </div>

                    {evento.descricao && (
                      <div className="text-sm text-text-secondary leading-relaxed mb-3">
                        {evento.descricao}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
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

        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              Total: {sortedAgenda.length} evento{sortedAgenda.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all font-bold"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
