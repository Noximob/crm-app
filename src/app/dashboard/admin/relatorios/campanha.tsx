'use client';

/**
 * RELATÓRIO DE CAMPANHA — o resultado dos LEADS que entraram, apresentável.
 *
 * O caso de uso é externo: a construtora banca uma propaganda e a Nox precisa
 * DEMONSTRAR o que aconteceu com cada real — quantos leads entraram, em quanto
 * tempo foram atendidos, quantos chegaram a reunião/visita e o que virou venda.
 * Por isso o PDF é de UMA página, limpo, e o investimento (custo interno) só
 * entra se o gestor ligar o toggle — nem toda construtora precisa ver o CPL.
 *
 * O funil usa a catraca (etapa atual nunca regride), então "chegaram a X" é
 * exato: quem está em Negociação necessariamente passou por Meet e Visita.
 */
import React, { useMemo, useState } from 'react';
import { ETAPAS_CIRCUITO, ETAPA_FECHADO, ETAPA_DESCARTADO } from '@/lib/circuito';
import type { LeadDistRow, GastoCampanha, RelVenda } from './logic';

const fmtMoeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtMoeda2 = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
const fmtData = (ms: number) => new Date(ms).toLocaleDateString('pt-BR');

// ---------------------------------------------------------------------------
// Conta
// ---------------------------------------------------------------------------

export interface ResumoCampanha {
  nome: string;
  total: number;                 // leads recebidos (linhas do ads)
  noCrm: number;                 // já viraram lead trabalhável no CRM
  atendidos: number;             // com 1º contato feito
  tempoMedio1oContatoHoras: number | null;
  funil: { etapa: string; chegaram: number; pct: number }[];
  ativos: number;
  descartados: number;
  fechados: number;
  vgv: number;
  periodoIni: number | null;     // 1º e último lead (pra datar o PDF)
  periodoFim: number | null;
  gasto: GastoCampanha | null;
  custoPorLead: number | null;
  custoPorMeet: number | null;
  custoPorVenda: number | null;
}

export function computeCampanha(
  linhas: LeadDistRow[], campanha: string | null, vendas: RelVenda[], gastos: GastoCampanha[],
): ResumoCampanha {
  const sel = campanha ? linhas.filter((l) => l.campanha === campanha) : linhas;
  const comLead = sel.filter((l) => !!l.leadId);
  const atendidosArr = comLead.filter((l) => l.tempo1oContatoDias !== null);
  const t1 = atendidosArr.map((l) => (l.tempo1oContatoDias as number) * 24);

  // Catraca da etapa ATUAL. Descartado tem idx -1 e some do funil — subnotifica
  // de propósito: nunca mostramos pra construtora um "chegou a visita" de lead
  // que morreu; ele aparece na linha própria de descartados.
  const funilSimples = ETAPAS_CIRCUITO.map((etapa, i) => {
    const chegaram = comLead.filter((l) => l.etapaIdx >= i).length;
    return { etapa, chegaram, pct: comLead.length ? chegaram / comLead.length : 0 };
  });

  const ids = new Set(comLead.map((l) => l.leadId as string));
  const doFunil = vendas.filter((v) => v.status === 'assinada' && v.leadId && ids.has(v.leadId));
  const vgv = doFunil.reduce((s, v) => s + (v.vgvLiquido ?? v.valorBruto ?? 0), 0);
  const fechados = Math.max(doFunil.length, comLead.filter((l) => l.fechado).length);

  const criados = sel.map((l) => l.criadoMs).filter((n) => n > 0).sort((a, b) => a - b);
  const gasto = campanha ? gastos.find((g) => g.nome === campanha) || null : null;
  const gastoTotal = campanha ? (gasto?.gasto ?? null) : (gastos.length ? gastos.reduce((s, g) => s + g.gasto, 0) : null);
  const meets = funilSimples.find((f) => f.etapa === 'Meet Agendado')?.chegaram || 0;

  return {
    nome: campanha || 'Todas as campanhas',
    total: sel.length,
    noCrm: comLead.length,
    atendidos: atendidosArr.length,
    tempoMedio1oContatoHoras: t1.length ? Math.round((t1.reduce((s, n) => s + n, 0) / t1.length) * 10) / 10 : null,
    funil: funilSimples,
    ativos: comLead.filter((l) => !l.fechado && !l.descartado).length,
    descartados: comLead.filter((l) => l.descartado).length,
    fechados,
    vgv,
    periodoIni: criados[0] ?? null,
    periodoFim: criados[criados.length - 1] ?? null,
    gasto,
    custoPorLead: gastoTotal !== null && sel.length ? gastoTotal / sel.length : null,
    custoPorMeet: gastoTotal !== null && meets ? gastoTotal / meets : null,
    custoPorVenda: gastoTotal !== null && fechados ? gastoTotal / fechados : null,
  };
}

// ---------------------------------------------------------------------------
// CSS de impressão (uma página A4 clara)
// ---------------------------------------------------------------------------

const CSS_PRINT = `
#campanha-print { display: none; }
@media print {
  body * { visibility: hidden; }
  #campanha-print, #campanha-print * { visibility: visible; }
  #campanha-print { display: block; position: absolute; left: 0; top: 0; width: 100%;
    background: #fff; color: #0f172a; font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 13mm 14mm; }
}
#campanha-print .cab { display: flex; justify-content: space-between; align-items: flex-end;
  border-bottom: 2.5px solid #0f172a; padding-bottom: 7px; margin-bottom: 12px; }
#campanha-print .cab-marca { font-size: 9px; font-weight: 800; letter-spacing: 2px; color: #b91c1c; margin: 0; }
#campanha-print h1 { font-size: 20px; margin: 2px 0 0; }
#campanha-print .cab-dir { text-align: right; font-size: 10px; color: #475569; }
#campanha-print h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
  border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 15px 0 8px; }
#campanha-print .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
#campanha-print .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 9px; }
#campanha-print .kpi-r { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
#campanha-print .kpi-v { display: block; font-size: 17px; font-weight: 800; margin-top: 1px; }
#campanha-print .kpi-s { display: block; font-size: 8.5px; color: #64748b; margin-top: 1px; }
#campanha-print .fx { margin: 3px 0; }
#campanha-print .fx-linha { display: flex; align-items: center; gap: 8px; font-size: 10.5px; padding: 2.5px 0; }
#campanha-print .fx-etapa { width: 110px; color: #334155; }
#campanha-print .fx-barra { flex: 1; height: 13px; background: #f1f5f9; border-radius: 7px; overflow: hidden; }
#campanha-print .fx-barra span { display: block; height: 100%; background: linear-gradient(90deg, #b91c1c, #ef4444); border-radius: 7px; min-width: 2px; }
#campanha-print .fx-n { width: 34px; text-align: right; font-weight: 800; }
#campanha-print .fx-pct { width: 40px; text-align: right; color: #64748b; }
#campanha-print .mini { font-size: 9.5px; color: #475569; margin: 4px 0; }
#campanha-print .destaques { display: flex; gap: 8px; margin-top: 4px; }
#campanha-print .destaque { flex: 1; border: 1px solid #e2e8f0; border-left: 3px solid #b91c1c; border-radius: 6px; padding: 7px 10px; }
#campanha-print .destaque b { font-size: 15px; display: block; }
#campanha-print .destaque span { font-size: 8.5px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
#campanha-print .rodape { margin-top: 18px; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
`;

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function RelatorioCampanha({ linhas, vendas, gastos, erroGasto, periodoLabel }: {
  linhas: LeadDistRow[]; vendas: RelVenda[]; gastos: GastoCampanha[]; erroGasto: string | null; periodoLabel: string;
}) {
  const campanhas = useMemo(() => Array.from(new Set(linhas.map((l) => l.campanha))).sort(), [linhas]);
  const [sel, setSel] = useState<string>('');
  const [mostrarCusto, setMostrarCusto] = useState(false);
  const r = useMemo(() => computeCampanha(linhas, sel || null, vendas, gastos), [linhas, sel, vendas, gastos]);

  const funilVisivel = r.funil.filter((f) => f.etapa !== ETAPA_FECHADO && f.etapa !== ETAPA_DESCARTADO);
  const max = Math.max(1, ...funilVisivel.map((f) => f.chegaram));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select value={sel} onChange={(e) => setSel(e.target.value)}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40">
            <option value="">Todas as campanhas ({linhas.length} leads)</option>
            {campanhas.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-[11.5px] text-text-secondary cursor-pointer select-none">
            <input type="checkbox" checked={mostrarCusto} onChange={(e) => setMostrarCusto(e.target.checked)} className="accent-[#E8C547]" />
            incluir investimento no PDF
          </label>
        </div>
        <button onClick={() => window.print()}
          className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all">
          🖨️ Gerar PDF (1 página)
        </button>
      </div>

      {/* tela */}
      <section className="al-card relative overflow-hidden p-4 sm:p-5">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.1em] mb-1">{r.nome}</h2>
        <p className="text-[11px] text-text-secondary mb-3">
          {r.periodoIni && r.periodoFim ? `leads de ${fmtData(r.periodoIni)} a ${fmtData(r.periodoFim)}` : 'sem leads no período'} · período: {periodoLabel}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mb-4">
          {[
            ['Leads recebidos', String(r.total), ''],
            ['Atendidos', `${r.atendidos} (${r.noCrm ? fmtPct(r.atendidos / r.noCrm) : '—'})`, r.tempoMedio1oContatoHoras !== null ? `1º contato em ${r.tempoMedio1oContatoHoras}h` : ''],
            ['Em andamento', String(r.ativos), `${r.descartados} descartados`],
            ['Vendas', r.fechados ? `${r.fechados} · ${fmtMoeda(r.vgv)}` : '—', ''],
          ].map(([rot, v, s]) => (
            <div key={rot as string}>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-secondary">{rot}</p>
              <p className="al-display text-[19px] font-bold tabular-nums text-white leading-tight">{v}</p>
              {s && <p className="text-[10px] text-text-secondary mt-0.5">{s}</p>}
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {funilVisivel.map((f) => (
            <div key={f.etapa} className="flex items-center gap-2 text-[11.5px]">
              <span className="w-28 sm:w-32 shrink-0 text-text-secondary truncate">{f.etapa}</span>
              <div className="flex-1 h-2 rounded-full bg-white/[0.07] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(1, (f.chegaram / max) * 100)}%`, background: 'linear-gradient(90deg,#FF1E56,#A50D38)' }} />
              </div>
              <span className="w-9 text-right tabular-nums text-white font-bold">{f.chegaram}</span>
              <span className="w-11 text-right tabular-nums text-text-secondary">{fmtPct(f.pct)}</span>
            </div>
          ))}
          <p className="text-[9.5px] text-text-secondary pt-1">quantos leads CHEGARAM em cada etapa (quem está na frente passou pelas de trás) · % sobre os {r.noCrm} leads no CRM</p>
        </div>
        {mostrarCusto && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11.5px] text-text-secondary">
            {erroGasto ? <span className="text-amber-300">Investimento indisponível: {erroGasto}</span> : (
              <>Investimento: <b className="text-white">{r.gasto ? fmtMoeda2(r.gasto.gasto) : (r.custoPorLead !== null && r.total ? fmtMoeda2(r.custoPorLead * r.total) : '—')}</b>
                {r.custoPorLead !== null && <> · por lead <b className="text-white">{fmtMoeda2(r.custoPorLead)}</b></>}
                {r.custoPorMeet !== null && <> · por meet <b className="text-white">{fmtMoeda2(r.custoPorMeet)}</b></>}
                {r.custoPorVenda !== null && <> · por venda <b className="text-white">{fmtMoeda2(r.custoPorVenda)}</b></>}</>
            )}
          </div>
        )}
      </section>

      {/* papel */}
      <style dangerouslySetInnerHTML={{ __html: CSS_PRINT }} />
      <div id="campanha-print">
        <header className="cab">
          <div>
            <p className="cab-marca">NOX IMÓVEIS · RESULTADO DE CAMPANHA</p>
            <h1>{r.nome}</h1>
          </div>
          <div className="cab-dir">
            {r.periodoIni && r.periodoFim && <p>leads recebidos de {fmtData(r.periodoIni)} a {fmtData(r.periodoFim)}</p>}
            <p>relatório gerado em {fmtData(Date.now())}</p>
          </div>
        </header>

        <div className="kpis">
          <div className="kpi"><span className="kpi-r">Leads recebidos</span><span className="kpi-v">{r.total}</span></div>
          <div className="kpi"><span className="kpi-r">Atendidos</span><span className="kpi-v">{r.noCrm ? fmtPct(r.atendidos / r.noCrm) : '—'}</span>
            {r.tempoMedio1oContatoHoras !== null && <span className="kpi-s">1º contato em {r.tempoMedio1oContatoHoras}h em média</span>}</div>
          <div className="kpi"><span className="kpi-r">Em atendimento hoje</span><span className="kpi-v">{r.ativos}</span><span className="kpi-s">{r.descartados} sem perfil/desistiram</span></div>
          <div className="kpi"><span className="kpi-r">Vendas geradas</span><span className="kpi-v">{r.fechados || '—'}</span>
            {r.vgv > 0 && <span className="kpi-s">{fmtMoeda(r.vgv)} em VGV</span>}</div>
        </div>

        <h2>Do anúncio à venda — onde cada lead chegou</h2>
        <div className="fx">
          {funilVisivel.map((f) => (
            <div key={f.etapa} className="fx-linha">
              <span className="fx-etapa">{f.etapa}</span>
              <div className="fx-barra"><span style={{ width: `${Math.max(2, (f.chegaram / max) * 100)}%` }} /></div>
              <span className="fx-n">{f.chegaram}</span>
              <span className="fx-pct">{fmtPct(f.pct)}</span>
            </div>
          ))}
        </div>
        <p className="mini">Leitura: cada linha mostra quantos leads chegaram ao menos àquela etapa — quem avança carrega as anteriores. Percentual sobre os {r.noCrm} leads em atendimento no CRM.</p>

        <h2>Resumo</h2>
        <div className="destaques">
          <div className="destaque"><b>{r.total}</b><span>leads gerados</span></div>
          <div className="destaque"><b>{r.funil.find((f) => f.etapa === 'Meet Agendado')?.chegaram || 0}</b><span>chegaram a reunião</span></div>
          <div className="destaque"><b>{r.funil.find((f) => f.etapa === 'Visita Feita')?.chegaram || 0}</b><span>visitaram</span></div>
          <div className="destaque"><b>{r.fechados || 0}</b><span>compraram{r.vgv > 0 ? ` · ${fmtMoeda(r.vgv)}` : ''}</span></div>
        </div>

        {mostrarCusto && !erroGasto && r.custoPorLead !== null && (
          <>
            <h2>Investimento</h2>
            <div className="destaques">
              <div className="destaque"><b>{r.gasto ? fmtMoeda2(r.gasto.gasto) : fmtMoeda2(r.custoPorLead * r.total)}</b><span>investido</span></div>
              <div className="destaque"><b>{fmtMoeda2(r.custoPorLead)}</b><span>por lead</span></div>
              {r.custoPorMeet !== null && <div className="destaque"><b>{fmtMoeda2(r.custoPorMeet)}</b><span>por reunião</span></div>}
              {r.custoPorVenda !== null && <div className="destaque"><b>{fmtMoeda2(r.custoPorVenda)}</b><span>por venda</span></div>}
            </div>
          </>
        )}

        <p className="rodape">Nox Imóveis — CRM · leads em atendimento ativo seguem evoluindo; este retrato é do dia da geração do relatório.</p>
      </div>
    </div>
  );
}
