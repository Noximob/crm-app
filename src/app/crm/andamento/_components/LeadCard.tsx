import React from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lead } from '@/types';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
);

export default function LeadCard({ lead }: { lead: Lead }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-[#23283A] rounded-xl p-3 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] cursor-grab active:cursor-grabbing hover:shadow-md hover:border-[#A3C8F7] dark:hover:border-[#3478F6]/40 transition-all duration-200 min-h-[90px] flex flex-col gap-1"
    >
      <div className="font-semibold text-sm text-[#2E2F38] dark:text-white mb-0.5 truncate">{lead.nome}</div>
      <div className="text-xs text-[#6B6F76] dark:text-gray-400 mb-2 truncate">{lead.telefone}</div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 justify-between mt-2">
        <a 
          href={`https://wa.me/${lead.telefone.replace(/\\D/g, '')}`} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/40 rounded-md hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors w-full sm:w-auto justify-center"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp
        </a>
        <Link href={`/crm/${lead.id}`} onClick={e => e.stopPropagation()} className="w-full sm:w-auto">
          <span className="block px-2.5 py-1 text-xs font-semibold text-white bg-[#3478F6] rounded-md hover:bg-[#255FD1] transition-colors text-center">
            + Informações
          </span>
        </Link>
      </div>
    </div>
  );
} 