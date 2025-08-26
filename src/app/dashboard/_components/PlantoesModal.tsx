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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] rounded-xl flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Plantões da Imobiliária</h2>
              <p className="text-sm text-[#6B6F76] dark:text-gray-300">Todos os plantões agendados</p>
            </div>
          </div>
                      <button
              onClick={onClose}
              className="p-2 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] rounded-lg transition-colors"
            >
              <XIcon className="h-5 w-5 text-[#6B6F76] dark:text-gray-300" />
            </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {plantoesOrdenados.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-[#8B5CF6]/10 to-[#A855F7]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-[#8B5CF6]" />
              </div>
              <h3 className="text-lg font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhum plantão agendado</h3>
              <p className="text-[#6B6F76] dark:text-gray-300">Os administradores ainda não agendaram plantões</p>
            </div>
          ) : (
            <div className="space-y-4">
              {plantoesOrdenados.map((plantao) => (
                <div
                  key={plantao.id}
                  className="p-4 bg-gradient-to-r from-[#8B5CF6]/5 to-[#A855F7]/5 border border-[#8B5CF6]/20 rounded-xl hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-full">
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
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#A855F7]/10 text-[#A855F7] rounded-full">
                          <span className="text-sm font-medium">{plantao.horario}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <BuildingIcon className="h-4 w-4 text-[#8B5CF6]" />
                          <span className="text-sm text-[#6B6F76] dark:text-gray-300">Construtora:</span>
                          <span className="font-medium text-[#2E2F38] dark:text-white">{plantao.construtora}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-[#8B5CF6]" />
                          <span className="text-sm text-[#6B6F76] dark:text-gray-300">Corretor:</span>
                          <span className="font-medium text-[#2E2F38] dark:text-white">{plantao.corretorResponsavel}</span>
                        </div>
                      </div>
                      
                      {plantao.observacoes && (
                        <div className="mt-3 p-3 bg-white/50 dark:bg-[#181C23]/50 rounded-lg border border-[#8B5CF6]/20">
                          <p className="text-sm text-[#2E2F38] dark:text-white">
                            <span className="font-medium text-[#8B5CF6]">Observações:</span> {plantao.observacoes}
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
