import React from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lead } from '@/types';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
);

export default function LeadCard({ lead, corEtapa }: { lead: Lead; corEtapa?: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id: lead.id,
    data: {
      type: 'lead',
      lead: lead
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative overflow-hidden bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 hover:border-[#FF1E56]/40 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(255,30,86,0.35)] transition-all duration-200 min-h-[60px] flex flex-col gap-1 w-full max-w-[180px] mx-auto"
    >
      <span
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ backgroundColor: corEtapa || '#FF1E56', boxShadow: `0 0 8px ${corEtapa || '#FF1E56'}` }}
      />
      {/* Área de drag handle */}
      <div 
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex items-center justify-between mb-1"
      >
        <div className="font-semibold text-xs text-white truncate flex-1">{lead.nome}</div>
        <div className="text-[10px] text-text-secondary ml-2">⋮⋮</div>
      </div>
      <div className="text-[11px] text-text-secondary mb-1 truncate">{lead.telefone}</div>
      <div className="flex flex-col gap-1 mt-1">
        <a 
          href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/40 rounded-md hover:bg-emerald-500/10 transition-colors w-full justify-center"
        >
          <WhatsAppIcon className="h-3 w-3" />
          WhatsApp
        </a>
                            <Link href={`/dashboard/crm/${lead.id}`} onClick={e => e.stopPropagation()} className="w-full">
          <span className="block px-2 py-0.5 text-[11px] font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-md shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] transition-all text-center">
            + Info
          </span>
        </Link>
      </div>
    </div>
  );
} 