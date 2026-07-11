import React from 'react';

/** Loading padrão GX: anel carmesim girando + rótulo opcional, centralizado. */
export default function LoadingState({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#FF1E56]/25 border-b-[#FF1E56] shrink-0" />
      {label && (
        <span className="text-text-secondary text-sm font-bold uppercase tracking-[0.18em]">{label}</span>
      )}
    </div>
  );
}
