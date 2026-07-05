'use client';

import React from 'react';

// Ícones customizados
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6"/>
    <line x1="8" x2="8" y1="2" y2="6"/>
    <line x1="3" x2="21" y1="10" y2="10"/>
  </svg>
);

const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
    <path d="M9 9h1v6H9z"/>
    <path d="M14 9h1v6h-1z"/>
    <path d="M4 14h16"/>
  </svg>
);

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

interface Plantao {
  id: string;
  dataInicio: string;
  dataFim: string;
  construtora: string;
  corretorResponsavel: string;
  horario: string;
  observacoes?: string;
  criadoEm: any;
}

interface PlantoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantoes: Plantao[];
}

export default function PlantoesModal({ isOpen, onClose, plantoes }: PlantoesModalProps) {
  if (!isOpen) return null;

  // Ordenar plantões por data de início
  const plantoesOrdenados = [...plantoes].sort((a, b) => {
    const dataA = new Date(a.dataInicio);
    const dataB = new Date(b.dataInicio);
    return dataA.getTime() - dataB.getTime();
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] w-full max-w-4xl max-h-[90vh] overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 gx-line" />
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#9F6BFF] to-[#6D3FD4] rounded-xl flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(159,107,255,0.5)]">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Plantões da Imobiliária</h2>
              <p className="text-sm text-text-secondary">Todos os plantões agendados</p>
            </div>
          </div>
                      <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-[#FF5C7E] rounded-lg transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {plantoesOrdenados.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#9F6BFF]/10 border border-[#9F6BFF]/25 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-[#9F6BFF]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Nenhum plantão agendado</h3>
              <p className="text-text-secondary">Os administradores ainda não agendaram plantões</p>
            </div>
          ) : (
            <div className="space-y-4">
              {plantoesOrdenados.map((plantao) => (
                <div
                  key={plantao.id}
                  className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:border-[#9F6BFF]/40 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#9F6BFF]/10 border border-[#9F6BFF]/35 text-[#C4A6FF] rounded-full">
                          <CalendarIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {new Date(plantao.dataInicio).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit'
                            })} - {new Date(plantao.dataFim).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#7DD3FC]/10 border border-[#7DD3FC]/35 text-[#7DD3FC] rounded-full">
                          <span className="text-sm font-medium">
                            {plantao.horario && plantao.horario.length >= 5 
                              ? plantao.horario.substring(0, 5) 
                              : plantao.horario}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <BuildingIcon className="h-4 w-4 text-[#9F6BFF]" />
                          <span className="text-sm text-text-secondary">Construtora:</span>
                          <span className="font-medium text-white">{plantao.construtora}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-[#9F6BFF]" />
                          <span className="text-sm text-text-secondary">Corretor:</span>
                          <span className="font-medium text-white">{plantao.corretorResponsavel}</span>
                        </div>
                      </div>

                      {plantao.observacoes && (
                        <div className="mt-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                          <p className="text-sm text-white">
                            <span className="font-medium text-[#C4A6FF]">Observações:</span> {plantao.observacoes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
