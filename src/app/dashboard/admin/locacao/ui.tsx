'use client';

/**
 * LOCAÇÃO · os blocos visuais compartilhados pelas abas.
 *
 * A regra da casa: tudo que é SIMULAÇÃO se veste de simulação (âmbar, raio,
 * palavra escrita). O gestor nunca pode confundir um botão de teste com um
 * botão que move dinheiro de verdade — quando o Asaas/ClickSign/Loft
 * conectarem, os botões âmbar somem e os estados passam a ser movidos pelos
 * webhooks.
 */
import React, { useState } from 'react';

export const inputCls = 'w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40';
export const btnOuro = 'px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40';
export const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40';
/** ação de simulação: âmbar e explícita — some quando a integração real ligar */
export const btnSimula = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-40';
export const rotCls = 'text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary block mb-1';

export const pillCls = (ativo: boolean) => `px-4 py-1.5 rounded-full text-[12px] font-extrabold uppercase tracking-wider border transition-colors ${
  ativo ? 'bg-gradient-to-r from-[#E8C547] to-[#C89210] border-[#E8C547]/60 text-[#181203]' : 'border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white'
}`;

export const Campo = ({ rot, children, largura = '' }: { rot: string; children: React.ReactNode; largura?: string }) => (
  <div className={largura}><label className={rotCls}>{rot}</label>{children}</div>
);

/** número de input de texto: vazio = null, vírgula vale como decimal */
export const num = (s: string): number | null => {
  const t = s.replace(/\./g, '').replace(',', '.').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export function Marcaveis({ opcoes, sel, onSel }: { opcoes: readonly string[]; sel: string[]; onSel: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const on = sel.includes(o);
        return (
          <button key={o} type="button"
            onClick={() => onSel(on ? sel.filter((x) => x !== o) : [...sel, o])}
            className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold border transition-colors ${
              on ? 'bg-[#E8C547]/15 border-[#E8C547]/50 text-[#FFE9A6]' : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-white'
            }`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** O selo que marca toda ação/estado que ainda é de mentira. */
export function SeloSimulacao({ texto = 'simulação' }: { texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider border bg-amber-500/10 border-amber-500/40 text-amber-300">
      ⚡ {texto}
    </span>
  );
}

export function Tabela({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[11.5px] border-collapse min-w-[560px]">
        <thead>
          <tr>{cols.map((c, i) => (
            <th key={i} className="text-left font-extrabold uppercase tracking-[0.08em] text-[9.5px] text-text-secondary border-b border-white/15 px-2 py-1.5 whitespace-nowrap">{c}</th>
          ))}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const td = 'px-2 py-1.5 border-b border-white/[0.06] align-top';

/** Cartão dobrável — o padrão da área: fechado mostra o resumo, aberto o trabalho. */
export function Dobra({ titulo, sub, chips, aberto0 = false, children }: {
  titulo: React.ReactNode; sub?: React.ReactNode; chips?: React.ReactNode;
  aberto0?: boolean; children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(aberto0);
  return (
    <div className="al-card overflow-hidden">
      <button onClick={() => setAberto((v) => !v)} className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-[13.5px] font-bold text-white">{titulo}</span>
          {chips}
          <span className="ml-auto text-[15px] text-text-secondary shrink-0">{aberto ? '▴' : '▾'}</span>
        </div>
        {sub && <div className="text-[11.5px] text-text-secondary mt-0.5">{sub}</div>}
      </button>
      {aberto && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
