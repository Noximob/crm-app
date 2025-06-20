import React from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  [key: string]: any;
}

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
      className="bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing"
    >
      <div className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-1">{lead.nome}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">{lead.telefone}</div>
      <div className="flex items-center justify-between">
        <a 
          href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()} // Impede que o drag seja acionado ao clicar no botão
          className="text-green-500 hover:text-green-600"
        >
          <WhatsAppIcon className="h-5 w-5" />
        </a>
        <Link href={`/crm/${lead.id}`} onClick={e => e.stopPropagation()}>
            <span className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400">
                + Informações
            </span>
        </Link>
      </div>
    </div>
  );
} 