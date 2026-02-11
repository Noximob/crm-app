import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LeadCard from './LeadCard';
import { Lead } from '@/types';

interface KanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
}

export default function KanbanColumn({ id, title, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ 
    id: `column-${id}`,
    data: {
      type: 'column',
      columnId: id
    }
  });

  // Droppable específico para colunas vazias
  const { setNodeRef: setEmptyRef, isOver: isOverEmpty } = useDroppable({
    id: `empty-${id}`,
    data: {
      type: 'empty-column',
      columnId: id
    }
  });

  return (
    <div className="flex flex-col flex-shrink-0 w-40 bg-[#F8F9FB] dark:bg-[#181C23] rounded-2xl shadow-soft border border-[#E8C547] dark:border-[#D4A017]/40 transition-all duration-200 min-h-[340px] mx-1">
      {/* Header da coluna */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8C547] dark:border-[#D4A017]/40 bg-[#F0F4FF] dark:bg-[#23283A] rounded-t-2xl">
        <h3 className="text-base font-bold text-[#2E2F38] dark:text-white tracking-tight">
          {title}
        </h3>
        <span className="text-xs font-bold text-[#D4A017] bg-[#E8E9F1] dark:bg-[#23283A] px-3 py-1 rounded-full">
          {leads.length}
        </span>
      </div>
      
      {/* Área de conteúdo da coluna */}
      <div className="flex-grow min-h-[100px] p-3 space-y-3 overflow-y-auto flex flex-col items-center bg-[#F8F9FB] dark:bg-[#181C23] rounded-b-2xl relative">
        {leads.length > 0 ? (
          // Se há leads, usar a área normal droppable
          <div 
            ref={setNodeRef}
            className={`w-full space-y-3 ${
              isOver ? 'ring-4 ring-[#D4A017] ring-opacity-50 rounded-lg' : ''
            }`}
          >
            <SortableContext id={`sortable-${id}`} items={leads.map(lead => lead.id)} strategy={verticalListSortingStrategy}>
              {leads.map(lead => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </SortableContext>
          </div>
        ) : (
          // Se não há leads, usar área de drop vazia específica
          <div 
            ref={setEmptyRef}
            className={`w-full h-20 border-2 border-dashed border-[#E8C547] dark:border-[#D4A017]/40 rounded-lg flex items-center justify-center bg-[#F0F4FF] dark:bg-[#23283A]/50 transition-all duration-200 ${
              isOverEmpty ? 'ring-4 ring-[#D4A017] ring-opacity-50 border-[#D4A017]' : ''
            }`}
          >
            <span className="text-xs text-[#6B6F76] dark:text-gray-400">Solte aqui</span>
          </div>
        )}
      </div>
    </div>
  );
} 