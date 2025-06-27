import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LeadCard from './LeadCard';
import { Lead } from '@/types'; // Importa do local central

interface KanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
}

export default function KanbanColumn({ id, title, leads }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <SortableContext id={id} items={leads} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className="flex flex-col flex-shrink-0 w-48 bg-white dark:bg-[#181C23] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] transition-all duration-200 min-h-[340px]"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#E8E9F1] dark:border-[#23283A] bg-[#F5F6FA] dark:bg-[#23283A] rounded-t-2xl">
          <h3 className="text-base font-bold text-[#2E2F38] dark:text-white tracking-tight">
            {title}
          </h3>
          <span className="text-xs font-bold text-[#3478F6] bg-[#E8E9F1] dark:bg-[#23283A] px-3 py-1 rounded-full">
            {leads.length}
          </span>
        </div>
        <div className="flex-grow min-h-[100px] p-3 space-y-3 overflow-y-auto bg-[#F8F9FB] dark:bg-[#181C23] rounded-b-2xl">
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </div>
    </SortableContext>
  );
} 