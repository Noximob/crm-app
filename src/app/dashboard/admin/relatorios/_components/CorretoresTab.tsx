'use client';

/** Aba CORRETORES — ranking sortável da equipe no período. */

import React, { useMemo, useState } from 'react';
import type { CorretorRow, ReportComputed } from './computeReport';
import { fmtInt, fmtMoney, fmtSeg } from './reportShared';
import { EmptyMsg, Medalha, SectionCard } from './ui';

type SortKey = 'leadsNovos' | 'interacoes' | 'tarefas' | 'visitas' | 'vendasValor' | 'meets' | 'aceite';

const COLS: { key: SortKey; label: string; title: string }[] = [
  { key: 'leadsNovos', label: 'Leads', title: 'Leads novos no período' },
  { key: 'interacoes', label: 'Interações', title: 'Ligações, WhatsApp, visitas e tarefas registradas' },
  { key: 'tarefas', label: 'Tarefas ✓ × ✗', title: 'Tarefas concluídas × canceladas no período' },
  { key: 'visitas', label: 'Visitas', title: 'Visitas registradas na timeline dos leads' },
  { key: 'vendasValor', label: 'Vendas', title: 'Vendas lançadas na meta (contribuições)' },
  { key: 'meets', label: 'Meets', title: 'Placar de meets dos períodos que cruzam o range' },
  { key: 'aceite', label: 'Aceite anúncio', title: 'Aceites de leads de anúncio e tempo médio' },
];

function valorDe(r: CorretorRow, k: SortKey): number {
  switch (k) {
    case 'leadsNovos': return r.leadsNovos;
    case 'interacoes': return r.interacoes;
    case 'tarefas': return r.tarefasConcluidas;
    case 'visitas': return r.visitas;
    case 'vendasValor': return r.vendasValor;
    case 'meets': return r.meets;
    // aceite: menor tempo = melhor; sem aceite vai pro fim
    case 'aceite': return r.tempoAceiteMedioSeg === null ? Number.MAX_SAFE_INTEGER : r.tempoAceiteMedioSeg;
  }
}

export default function CorretoresTab({
  report, onComparar,
}: {
  report: ReportComputed;
  onComparar: (corretorId: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('interacoes');

  const rows = useMemo(() => {
    const asc = sortKey === 'aceite'; // tempo menor = melhor
    return [...report.corretorRows].sort((a, b) => {
      const va = valorDe(a, sortKey);
      const vb = valorDe(b, sortKey);
      if (va !== vb) return asc ? va - vb : vb - va;
      return b.interacoes - a.interacoes; // desempate: quem trabalhou mais
    });
  }, [report.corretorRows, sortKey]);

  const thBase = 'px-2.5 py-2 text-[9.5px] font-extrabold uppercase tracking-[0.14em] whitespace-nowrap cursor-pointer select-none transition-colors';

  return (
    <SectionCard
      title="Ranking da equipe"
      right={<span className="text-[10px] text-text-secondary">clique numa coluna pra ordenar · medalhas seguem a ordenação</span>}
    >
      {rows.length === 0 ? (
        <EmptyMsg>Nenhum corretor aprovado na imobiliária.</EmptyMsg>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-2.5 py-2 text-left text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">Corretor</th>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    title={c.title}
                    onClick={() => setSortKey(c.key)}
                    className={`${thBase} text-right ${sortKey === c.key ? 'text-[#FF9EB5]' : 'text-text-secondary hover:text-white'}`}
                  >
                    {c.label} {sortKey === c.key ? (c.key === 'aceite' ? '▲' : '▼') : ''}
                  </th>
                ))}
                <th className="px-2.5 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                  <td className="px-2.5 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Medalha pos={i + 1} />
                      <span className="text-[12.5px] font-bold text-white truncate max-w-[160px]">{r.nome}</span>
                    </div>
                  </td>
                  <td className="px-2.5 py-2.5 text-right al-display text-[13px] font-bold text-white tabular-nums">{fmtInt(r.leadsNovos)}</td>
                  <td className="px-2.5 py-2.5 text-right al-display text-[13px] font-bold text-white tabular-nums">{fmtInt(r.interacoes)}</td>
                  <td className="px-2.5 py-2.5 text-right text-[12px] tabular-nums whitespace-nowrap">
                    <span className="font-bold text-emerald-300">{fmtInt(r.tarefasConcluidas)}</span>
                    <span className="text-text-secondary"> × </span>
                    <span className={r.tarefasCanceladas > 0 ? 'font-bold text-red-300' : 'text-text-secondary'}>{fmtInt(r.tarefasCanceladas)}</span>
                  </td>
                  <td className="px-2.5 py-2.5 text-right al-display text-[13px] font-bold text-white tabular-nums">{fmtInt(r.visitas)}</td>
                  <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                    <span className={`al-display text-[13px] font-bold tabular-nums ${r.vendasValor > 0 ? 'text-[#FFE9A6]' : 'text-text-secondary'}`}>
                      {r.vendasValor > 0 ? fmtMoney(r.vendasValor) : '—'}
                    </span>
                    {r.vendasQtd > 0 && <span className="text-[10px] text-text-secondary tabular-nums"> ({fmtInt(r.vendasQtd)})</span>}
                  </td>
                  <td className="px-2.5 py-2.5 text-right al-display text-[13px] font-bold text-white tabular-nums">{r.meets > 0 ? fmtInt(r.meets) : '—'}</td>
                  <td className="px-2.5 py-2.5 text-right text-[11.5px] tabular-nums whitespace-nowrap">
                    {r.aceites > 0 ? (
                      <>
                        <span className="font-bold text-white">{fmtSeg(r.tempoAceiteMedioSeg)}</span>
                        <span className="text-[10px] text-text-secondary"> · {fmtInt(r.aceites)}</span>
                      </>
                    ) : (
                      <span className="text-text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-2.5 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onComparar(r.id)}
                      className="border border-[#9F6BFF]/40 bg-[#9F6BFF]/10 hover:bg-[#9F6BFF]/20 text-[#C4A6FF] text-[10px] font-extrabold uppercase tracking-wider rounded-full px-3 py-1 transition-colors whitespace-nowrap"
                    >
                      Comparar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[9.5px] text-white/30 mt-2">Ranking cobre os corretores aprovados. &quot;Comparar&quot; abre o Individual × Coletivo do corretor.</p>
        </div>
      )}
    </SectionCard>
  );
}
