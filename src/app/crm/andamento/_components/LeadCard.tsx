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
      className="bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm border border-primary-200/70 dark:border-primary-500/20 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary-300 dark:hover:border-primary-500/60 transition-all duration-200"
    >
      <div className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-1">{lead.nome}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">{lead.telefone}</div>
      <div className="flex items-center justify-between mt-4">
        <a 
          href={`https://wa.me/${lead.telefone.replace(/\\D/g, '')}`} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-green-600 dark:text-green-400 border border-green-300 dark:border-green-500/50 rounded-md hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          WhatsApp
        </a>
        <Link href={`/crm/${lead.id}`} onClick={e => e.stopPropagation()}>
            <span className="px-2.5 py-1 text-xs font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors">
                + Informações
            </span>
        </Link>
      </div>
    </div>
  );
} 