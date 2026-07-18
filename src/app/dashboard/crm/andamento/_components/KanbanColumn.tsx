import React from 'react';
import LeadCard from './LeadCard';
import { Lead } from '@/types';

interface KanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
  corEtapa?: string;
}

export default function KanbanColumn({ title, leads, corEtapa }: KanbanColumnProps) {
  const cor = corEtapa || '#FF1E56';

  return (
    <div className="kanban-col flex flex-col flex-shrink-0 w-40 al-card relative overflow-hidden transition-all duration-200 min-h-[340px] mx-1">
      {/* Barra da etapa no topo */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
        style={{ backgroundColor: cor, boxShadow: `0 0 12px ${cor}` }}
      />
      {/* Header da coluna */}
      <div className="kanban-col-head flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <h3 className="al-display text-[11px] font-bold text-white uppercase tracking-[0.14em] truncate">
          {title}
        </h3>
        <span className="text-[11px] font-bold tabular-nums text-text-secondary bg-white/[0.06] px-2 py-0.5 rounded-full">
          {leads.length}
        </span>
      </div>

      {/* Área de conteúdo da coluna — sem drag: o circuito é quem move os leads */}
      <div className="flex-grow min-h-[100px] p-3 space-y-3 flex flex-col items-center relative">
        {leads.length > 0 ? (
          <div className="w-full space-y-3">
            {leads.map(lead => (
              <LeadCard key={lead.id} lead={lead} corEtapa={cor} />
            ))}
          </div>
        ) : (
          <div className="w-full h-20 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center bg-white/[0.02]">
            <span className="text-xs text-text-secondary">Sem leads aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}
