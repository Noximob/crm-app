'use client';

import React from 'react';
import { Timestamp } from 'firebase/firestore';

interface AvisoImportante {
  id: string;
  titulo: string;
  mensagem: string;
  data: Timestamp;
  dataInicio?: Timestamp;
  dataFim?: Timestamp;
  imobiliariaId: string;
}

interface AvisosImportantesModalProps {
  isOpen: boolean;
  onClose: () => void;
  avisos: AvisoImportante[];
}

export default function AvisosImportantesModal({ isOpen, onClose, avisos }: AvisosImportantesModalProps) {
  if (!isOpen) return null;

  const sortedAvisos = avisos.sort((a, b) => {
    // Priorizar avisos com dataInicio/dataFim
    if (a.dataInicio && !b.dataInicio) return -1;
    if (!a.dataInicio && b.dataInicio) return 1;
    
    // Se ambos têm dataInicio, ordenar por ela
    if (a.dataInicio && b.dataInicio) {
      return b.dataInicio.toDate().getTime() - a.dataInicio.toDate().getTime();
    }
    
    // Caso contrário, ordenar por data de criação
    return b.data.toDate().getTime() - a.data.toDate().getTime();
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 shadow-xl border border-[#E8E9F1] max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#2E2F38]">
                Avisos Importantes
              </h2>
              <p className="text-[#6B6F76]">
                {avisos.length} aviso{avisos.length !== 1 ? 's' : ''} da imobiliária
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

        {sortedAvisos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#2E2F38] mb-2">
              Nenhum aviso importante
            </h3>
            <p className="text-[#6B6F76]">
              A imobiliária ainda não cadastrou avisos importantes
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {sortedAvisos.map((aviso) => (
              <div
                key={aviso.id}
                className="p-4 rounded-xl border border-[#E8E9F1] hover:bg-[#F5F6FA] transition-all duration-200"
                style={{ borderLeftColor: '#FF6B6B', borderLeftWidth: '4px' }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 bg-[#FF6B6B] rounded-full shadow-md mt-1 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-[#2E2F38] group-hover:text-[#FF6B6B] transition-colors">
                        {aviso.titulo}
                      </h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[#FF6B6B] text-white">
                        Aviso Importante
                      </span>
                    </div>
                    
                    <div className="text-sm text-[#6B6F76] leading-relaxed mb-3">
                      {aviso.mensagem}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-[#6B6F76]">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">Criado:</span>
                        {aviso.data.toDate().toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>

                      {aviso.dataInicio && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Início:</span>
                          {aviso.dataInicio.toDate().toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}

                      {aviso.dataFim && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Fim:</span>
                          {aviso.dataFim.toDate().toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
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
              Total: {sortedAvisos.length} aviso{sortedAvisos.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#FF6B6B] text-white rounded-lg hover:bg-[#FF5252] transition-colors font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
