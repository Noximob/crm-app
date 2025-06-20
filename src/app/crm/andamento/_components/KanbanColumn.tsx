import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LeadCard from './LeadCard'; // Será criado a seguir

interface Lead {
  id: string;
  [key: string]: any;
}

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
        className="flex flex-col flex-shrink-0 w-72 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-sm"
      >
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 p-4 border-b border-gray-200 dark:border-gray-700">
          {title}
        </h3>
        <div className="flex-grow min-h-[100px] p-2 space-y-2 overflow-y-auto">
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </div>
    </SortableContext>
  );
} 