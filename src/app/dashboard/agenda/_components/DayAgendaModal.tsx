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
  comunidade: 'Evento Comunidade',
  imobiliaria: 'Imobiliária'
};

const tipoCores = {
  agenda: 'bg-[#34D399]/15 border border-[#34D399]/40 text-emerald-300',
  crm: 'bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-amber-300',
  nota: 'bg-yellow-500/15 border border-yellow-500/40 text-yellow-300',
  aviso: 'bg-[#FF1E56]/15 border border-[#FF1E56]/40 text-[#FF9EB5]',
  comunidade: 'bg-orange-500/15 border border-orange-500/40 text-orange-300',
  imobiliaria: 'bg-[#9F6BFF]/15 border border-[#9F6BFF]/40 text-[#C4A6FF]'
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
      // Para eventos da comunidade (Meet, YouTube, Instagram, Discord): Tipo e Organizador
      const info = [];
      const tipoMatch = item.descricao.match(/Tipo: (.+)/);
      const organizadorMatch = item.descricao.match(/Organizador: (.+)/);
      if (tipoMatch) info.push(tipoMatch[1]);
      if (organizadorMatch) info.push(organizadorMatch[1]);
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end lg:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#12101a] border border-white/10 rounded-t-3xl rounded-b-none lg:rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-4 w-full max-w-5xl mx-0 lg:mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="absolute inset-x-0 top-0 gx-line" />
        {/* Alça de arrastar (só mobile, visual) */}
        <div className="lg:hidden w-10 h-1 bg-white/20 rounded mx-auto mb-3" />
        {/* Header mais compacto */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FF1E56]/10 border border-[#FF1E56]/35 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="al-display text-[16px] font-bold text-white uppercase tracking-[0.14em]">
                Agenda do Dia
              </h2>
              <p className="text-sm text-text-secondary">
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
            className="p-2 text-text-secondary hover:text-[#FF5C7E] hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sortedItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              Nenhuma atividade agendada
            </h3>
            <p className="text-sm text-text-secondary">
              Este dia está livre de compromissos
            </p>
          </div>
        ) : (
          /* Grid de itens em duas colunas específicas */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
            {/* Coluna Esquerda: Tudo exceto CRM */}
            <div className="space-y-2">
              <div className="al-display text-[11px] font-bold text-white uppercase tracking-[0.14em] mb-3 px-2">
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
                      className={`p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] transition-all duration-200 ${
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
                            <h3 className="font-medium text-white text-sm truncate flex-1">
                              {item.titulo}
                            </h3>
                            <span className={`px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full ${tipoCores[item.tipo]} flex-shrink-0`}>
                              {tipoLabels[item.tipo]}
                            </span>
                            {item.status === 'concluida' && (
                              <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-[#34D399]/15 border border-[#34D399]/40 text-emerald-300 flex-shrink-0">
                                ✓
                              </span>
                            )}
                          </div>
                          
                          {/* Segunda linha: horário e informações compactas */}
                          <div className="flex items-center gap-3 text-xs text-text-secondary">
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
                              <div className="flex items-center gap-1 text-emerald-300">
                                <span className="text-xs">📞</span>
                                <span className="truncate max-w-24">{item.leadNome}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Terceira linha: informações compactas */}
                          {compactInfo && (
                            <div className="mt-1 text-xs text-text-secondary truncate">
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
              <div className="al-display text-[11px] font-bold text-white uppercase tracking-[0.14em] mb-3 px-2">
                Tarefas CRM
              </div>
              {(() => {
                const crmItems = sortedItems
                  .filter(item => item.tipo === 'crm')
                  .sort((a, b) => a.dataHora.toDate().getTime() - b.dataHora.toDate().getTime());
                
                if (crmItems.length === 0) {
                  return (
                    <div className="text-center py-8 text-sm text-text-secondary">
                      <div className="w-8 h-8 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className={`p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] transition-all duration-200 ${
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
                            <h3 className="font-medium text-white text-sm truncate flex-1">
                              {item.titulo}
                            </h3>
                            <span className={`px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full ${tipoCores[item.tipo]} flex-shrink-0`}>
                              {tipoLabels[item.tipo]}
                            </span>
                            {item.status === 'concluida' && (
                              <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-[#34D399]/15 border border-[#34D399]/40 text-emerald-300 flex-shrink-0">
                                ✓
                              </span>
                            )}
                          </div>
                          
                          {/* Segunda linha: horário e lead */}
                          <div className="flex items-center gap-3 text-xs text-text-secondary">
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
                              <div className="flex items-center gap-1 text-emerald-300">
                                <span className="text-xs">📞</span>
                                <span className="truncate max-w-24">{item.leadNome}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Terceira linha: informações compactas */}
                          {compactInfo && (
                            <div className="mt-1 text-xs text-text-secondary truncate">
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
        <div className="mt-4 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              Total: {sortedItems.length} atividade{sortedItems.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl transition-colors font-bold text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
