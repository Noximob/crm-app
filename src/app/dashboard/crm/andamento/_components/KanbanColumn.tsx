import React from 'react';
import LeadCard from './LeadCard';
import { Lead } from '@/types';

interface KanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
  corEtapa?: string;
}

// Coluna do kanban — SÓ leitura (o circuito conduz). Header fixo + lista com
// scroll VERTICAL próprio (h-full herdado da linha, que só rola na horizontal).
export default function KanbanColumn({ title, leads, corEtapa }: KanbanColumnProps) {
  const cor = corEtapa || '#FF1E56';
  return (
    <div className="kanban-col flex flex-col flex-shrink-0 w-40 h-full al-card relative overflow-hidden mx-1">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] z-10"
        style={{ backgroundColor: cor, boxShadow: `0 0 12px ${cor}` }}
      />
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <h3 className="al-display text-[11px] font-bold text-white uppercase tracking-[0.14em] truncate">
          {title}
        </h3>
        <span className="text-[11px] font-bold tabular-nums text-text-secondary bg-white/[0.06] px-2 py-0.5 rounded-full">
          {leads.length}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {leads.length > 0 ? (
          leads.map(lead => <LeadCard key={lead.id} lead={lead} corEtapa={cor} />)
        ) : (
          <div className="w-full h-20 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center bg-white/[0.02]">
            <span className="text-xs text-text-secondary">Sem leads aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}
