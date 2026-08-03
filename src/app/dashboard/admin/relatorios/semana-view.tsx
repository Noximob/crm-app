'use client';

/**
 * RELATÓRIO SEMANAL — tela (dark) + versão de impressão (A4 claro).
 *
 * A tela é pra navegar; o PDF é o produto: "Gerar PDF" abre o print do
 * navegador com um layout claro, uma página do TIME + uma página POR CORRETOR,
 * pronto pra levar na reunião 1:1 (tem até espaço de combinados pra preencher
 * à mão). Salvar como PDF é o destino padrão do diálogo de impressão.
 */
import React, { useMemo, useState } from 'react';
import { computeSemana, semanaDe, type CorretorSemana, type MetricasJanela, type SemanaResumo } from './semana';
import type { RelLead, RelCorretor, AtividadeLead, RelVenda } from './logic';
import { ETAPA_FECHADO, ETAPA_DESCARTADO } from '@/lib/circuito';

const fmtMoeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtData = (ms: number) => new Date(ms).toLocaleDateString('pt-BR');

// ---------------------------------------------------------------------------
// Peças pequenas
// ---------------------------------------------------------------------------

/** Seta de variação vs semana anterior (verde subiu, vermelho caiu). */
function Delta({ v, antes, invertido = false }: { v: number; antes: number; invertido?: boolean }) {
  const d = v - antes;
  if (d === 0) return <span className="delta zero">=</span>;
  const bom = invertido ? d < 0 : d > 0;
  return <span className={`delta ${bom ? 'bom' : 'ruim'}`}>{d > 0 ? '▲' : '▼'}{Math.abs(d)}</span>;
}

function KpiPrint({ rotulo, valor, antes, invertido }: { rotulo: string; valor: React.ReactNode; antes?: React.ReactNode; invertido?: boolean }) {
  return (
    <div className="kpi">
      <span className="kpi-r">{rotulo}</span>
      <span className="kpi-v">{valor}</span>
      {antes !== undefined && <span className="kpi-a">ant.: {antes}</span>}
    </div>
  );
}

/** Linha do movimento do funil (quantos CHEGARAM em cada etapa na semana). */
function MovimentoFunil({ m }: { m: MetricasJanela }) {
  const passos: [string, number][] = [
    ['Novos', m.leadsNovos],
    ['1º contato', m.primeirosContatos],
    ['Meet agendado', m.meetsAgendados],
    ['Meet feito', m.meetsFeitos],
    ['Visita feita', m.visitasFeitas],
    ['Negociação', m.negociacoes],
    ['Venda', m.vendas],
  ];
  return (
    <div className="mov">
      {passos.map(([r, n], i) => (
        <React.Fragment key={r}>
          {i > 0 && <span className="mov-seta">→</span>}
          <span className={`mov-passo ${n > 0 ? 'on' : ''}`}><b>{n}</b> {r}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página de impressão: TIME
// ---------------------------------------------------------------------------

function PaginaTime({ r }: { r: SemanaResumo }) {
  const a = r.time.atual, p = r.time.anterior;
  return (
    <section className="pg">
      <header className="cab">
        <div>
          <p className="cab-marca">NOX IMÓVEIS</p>
          <h1>Relatório semanal do time</h1>
        </div>
        <div className="cab-dir">
          <p className="cab-sem">Semana {r.janela.label}</p>
          <p className="cab-ger">gerado em {fmtData(Date.now())}</p>
        </div>
      </header>

      <div className="kpis">
        <KpiPrint rotulo="Leads novos" valor={a.leadsNovos} antes={p.leadsNovos} />
        <KpiPrint rotulo="Toques nos leads" valor={a.toques} antes={p.toques} />
        <KpiPrint rotulo="Meets feitos" valor={a.meetsFeitos} antes={p.meetsFeitos} />
        <KpiPrint rotulo="Visitas" valor={a.visitasFeitas} antes={p.visitasFeitas} />
        <KpiPrint rotulo="Vendas" valor={a.vendas} antes={p.vendas} />
        <KpiPrint rotulo="VGV da semana" valor={fmtMoeda(a.vgv)} antes={fmtMoeda(p.vgv)} />
      </div>

      <h2>O caminho da semana</h2>
      <MovimentoFunil m={a} />
      <p className="mini">
        {a.novosAtendidos}/{a.leadsNovos} novos já atendidos
        {a.tempoMedio1oContatoHoras !== null && <> · 1º contato em {a.tempoMedio1oContatoHoras}h em média</>}
        · {a.avancos} avanços de etapa · {a.descartes} descartes{a.descartesRapidos > 0 && <> ({a.descartesRapidos} no 1º toque)</>}
      </p>
      {a.motivosDescarte.length > 0 && (
        <p className="mini">Motivos de descarte: {a.motivosDescarte.map(([m, n]) => `${m} (${n})`).join(' · ')}</p>
      )}

      <h2>Corretor por corretor</h2>
      <table className="tab">
        <thead>
          <tr>
            <th>Corretor</th><th>Novos</th><th>Toques</th><th>Dias ativos</th><th>Meets</th><th>Visitas</th>
            <th>Avanços</th><th>Vendas</th><th>VGV</th><th>Atrasadas</th><th>+7d s/ toque</th>
          </tr>
        </thead>
        <tbody>
          {r.corretores.map((c) => (
            <tr key={c.uid}>
              <td className="td-nome">{c.nome}</td>
              <td>{c.atual.leadsNovos}</td>
              <td>{c.atual.toques} <Delta v={c.atual.toques} antes={c.anterior.toques} /></td>
              <td>{c.atual.diasAtivos}/7</td>
              <td>{c.atual.meetsFeitos}/{c.atual.meetsAgendados}</td>
              <td>{c.atual.visitasFeitas}</td>
              <td>{c.atual.avancos} <Delta v={c.atual.avancos} antes={c.anterior.avancos} /></td>
              <td>{c.atual.vendas}</td>
              <td>{c.atual.vgv > 0 ? fmtMoeda(c.atual.vgv) : '—'}</td>
              <td className={c.tarefasAtrasadas > 0 ? 'ruim' : ''}>{c.tarefasAtrasadas}</td>
              <td className={c.semToque7d >= 3 ? 'ruim' : ''}>{c.semToque7d}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mini">Meets = feitos/agendados na semana · Atrasadas e +7d sem toque são a foto de hoje, não da semana.</p>

      {(r.time.destaque || r.time.atencao) && (
        <div className="selo-linha">
          {r.time.destaque && <p className="selo bom">⭐ Destaque da semana: <b>{r.time.destaque}</b></p>}
          {r.time.atencao && <p className="selo ruim">⚠ Precisa de conversa: <b>{r.time.atencao}</b></p>}
        </div>
      )}

      {r.historicoDesdeMs && (
        <p className="rodape-nota">O carimbo de movimento de etapa existe desde {fmtData(r.historicoDesdeMs)} — semanas anteriores a isso subnotificam avanços.</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Página de impressão: UM CORRETOR (o dossiê da 1:1)
// ---------------------------------------------------------------------------

function PaginaCorretor({ c, label }: { c: CorretorSemana; label: string }) {
  const a = c.atual, p = c.anterior;
  const funil = c.funilAgora.filter((f) => f.etapa !== ETAPA_FECHADO && f.etapa !== ETAPA_DESCARTADO);
  return (
    <section className="pg">
      <header className="cab">
        <div>
          <p className="cab-marca">NOX IMÓVEIS · SEMANAL DO CORRETOR</p>
          <h1>{c.nome}</h1>
        </div>
        <div className="cab-dir">
          <p className="cab-sem">Semana {label}</p>
          <p className="cab-ger">{c.ativos} leads ativos na carteira</p>
        </div>
      </header>

      <div className="kpis kpis-8">
        <KpiPrint rotulo="Leads novos" valor={<>{a.leadsNovos} <Delta v={a.leadsNovos} antes={p.leadsNovos} /></>} />
        <KpiPrint rotulo="Toques" valor={<>{a.toques} <Delta v={a.toques} antes={p.toques} /></>} />
        <KpiPrint rotulo="Dias ativos" valor={`${a.diasAtivos}/7`} />
        <KpiPrint rotulo="Tarefas feitas" valor={<>{a.tarefasConcluidas} <Delta v={a.tarefasConcluidas} antes={p.tarefasConcluidas} /></>} />
        <KpiPrint rotulo="Meets (feito/agend.)" valor={`${a.meetsFeitos}/${a.meetsAgendados}`} />
        <KpiPrint rotulo="Visitas" valor={<>{a.visitasFeitas} <Delta v={a.visitasFeitas} antes={p.visitasFeitas} /></>} />
        <KpiPrint rotulo="Avanços de etapa" valor={<>{a.avancos} <Delta v={a.avancos} antes={p.avancos} /></>} />
        <KpiPrint rotulo="Vendas / VGV" valor={a.vendas > 0 ? `${a.vendas} · ${fmtMoeda(a.vgv)}` : '—'} />
      </div>

      <div className="cols">
        <div>
          <h2>✔ O que reconhecer</h2>
          {c.fortes.length ? <ul className="lista">{c.fortes.map((f, i) => <li key={i}>{f}</li>)}</ul>
            : <p className="mini">Sem destaque registrado nesta semana.</p>}

          <h2>⚠ O que cobrar</h2>
          {c.cobrar.length ? <ul className="lista ruim">{c.cobrar.map((f, i) => <li key={i}>{f}</li>)}</ul>
            : <p className="mini">Nada pendente — semana redonda.</p>}
        </div>
        <div>
          <h2>Carteira agora</h2>
          <table className="tab tab-funil">
            <tbody>
              {funil.map((f) => (
                <tr key={f.etapa}>
                  <td>{f.etapa}</td>
                  <td className="td-n">{f.n || '—'}</td>
                  <td className="td-barra"><span style={{ width: `${Math.min(100, f.n * 12)}%` }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mini">{c.parados14d} parados há +14d · {c.semToque7d} sem toque há +7d · qualificação {Math.round(c.qualifPct * 100)}%</p>

          {c.novosSemContato.length > 0 && (
            <>
              <h3>Novos ainda sem 1º contato</h3>
              <p className="nomes">{c.novosSemContato.map((x) => `${x.nome} (${x.dias}d)`).join(' · ')}</p>
            </>
          )}
          {c.topSemToque.length > 0 && (
            <>
              <h3>Abandonados há mais tempo</h3>
              <p className="nomes">{c.topSemToque.map((x) => `${x.nome} (${x.dias}d)`).join(' · ')}</p>
            </>
          )}
        </div>
      </div>

      <div className="combinados">
        <h2>Combinados da semana</h2>
        <div className="linha-escrever" /><div className="linha-escrever" /><div className="linha-escrever" />
        <div className="assinaturas">
          <span>Conversado em ____/____/______</span>
          <span>Gestor: ______________________</span>
          <span>Corretor: ______________________</span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CSS de impressão (o app é dark; o papel é claro)
// ---------------------------------------------------------------------------

const CSS_PRINT = `
#semanal-print { display: none; }
@media print {
  body * { visibility: hidden; }
  #semanal-print, #semanal-print * { visibility: visible; }
  #semanal-print { display: block; position: absolute; left: 0; top: 0; width: 100%;
    background: #fff; color: #0f172a; font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 11mm 12mm; }
}
#semanal-print .pg { break-after: page; padding: 2mm 0; }
#semanal-print .pg:last-child { break-after: auto; }
#semanal-print .cab { display: flex; justify-content: space-between; align-items: flex-end;
  border-bottom: 2.5px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px; }
#semanal-print .cab-marca { font-size: 9px; font-weight: 800; letter-spacing: 2px; color: #b91c1c; margin: 0; }
#semanal-print h1 { font-size: 21px; margin: 2px 0 0; letter-spacing: .5px; }
#semanal-print .cab-dir { text-align: right; }
#semanal-print .cab-sem { font-size: 12px; font-weight: 700; margin: 0; }
#semanal-print .cab-ger { font-size: 9.5px; color: #64748b; margin: 2px 0 0; }
#semanal-print h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #0f172a;
  border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 14px 0 7px; }
#semanal-print h3 { font-size: 9.5px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 10px 0 3px; }
#semanal-print .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin: 10px 0 2px; }
#semanal-print .kpis-8 { grid-template-columns: repeat(4, 1fr); }
#semanal-print .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; }
#semanal-print .kpi-r { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
#semanal-print .kpi-v { display: block; font-size: 16px; font-weight: 800; margin-top: 1px; }
#semanal-print .kpi-a { display: block; font-size: 8.5px; color: #94a3b8; margin-top: 1px; }
#semanal-print .delta { font-size: 9px; font-weight: 800; margin-left: 2px; }
#semanal-print .delta.bom { color: #15803d; }
#semanal-print .delta.ruim { color: #b91c1c; }
#semanal-print .delta.zero { color: #94a3b8; }
#semanal-print .mov { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 6px 0; }
#semanal-print .mov-passo { border: 1px solid #cbd5e1; border-radius: 20px; padding: 3px 9px; font-size: 10px; color: #94a3b8; }
#semanal-print .mov-passo.on { color: #0f172a; border-color: #0f172a; }
#semanal-print .mov-passo b { font-size: 12px; }
#semanal-print .mov-seta { color: #cbd5e1; font-size: 11px; }
#semanal-print .mini { font-size: 9.5px; color: #475569; margin: 3px 0; }
#semanal-print .tab { width: 100%; border-collapse: collapse; font-size: 10px; }
#semanal-print .tab th { text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: .8px;
  color: #64748b; border-bottom: 1.5px solid #0f172a; padding: 3px 5px; }
#semanal-print .tab td { border-bottom: 1px solid #e2e8f0; padding: 4px 5px; }
#semanal-print .tab .td-nome { font-weight: 700; }
#semanal-print .tab td.ruim { color: #b91c1c; font-weight: 800; }
#semanal-print .tab-funil td { font-size: 10px; }
#semanal-print .tab-funil .td-n { font-weight: 800; text-align: right; width: 26px; }
#semanal-print .tab-funil .td-barra { width: 45%; }
#semanal-print .tab-funil .td-barra span { display: block; height: 7px; background: #b91c1c; border-radius: 4px; min-width: 2px; }
#semanal-print .selo-linha { display: flex; gap: 10px; margin-top: 12px; }
#semanal-print .selo { font-size: 10.5px; border: 1px solid; border-radius: 6px; padding: 5px 9px; margin: 0; }
#semanal-print .selo.bom { color: #15803d; border-color: #86efac; background: #f0fdf4; }
#semanal-print .selo.ruim { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
#semanal-print .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
#semanal-print .lista { margin: 4px 0; padding-left: 16px; font-size: 10.5px; line-height: 1.5; }
#semanal-print .lista.ruim li { color: #7f1d1d; }
#semanal-print .nomes { font-size: 10px; color: #334155; margin: 2px 0; }
#semanal-print .combinados { margin-top: 16px; }
#semanal-print .linha-escrever { border-bottom: 1px solid #94a3b8; height: 22px; }
#semanal-print .assinaturas { display: flex; justify-content: space-between; font-size: 9.5px; color: #475569; margin-top: 14px; }
#semanal-print .rodape-nota { font-size: 8.5px; color: #94a3b8; margin-top: 14px; }
`;

// ---------------------------------------------------------------------------
// Tela (dark) + botão de PDF
// ---------------------------------------------------------------------------

export function RelatorioSemanal({ leads, corretores, vendas, atividade, selecionados, comAtividade }: {
  leads: RelLead[]; corretores: RelCorretor[]; vendas: RelVenda[];
  atividade: Map<string, AtividadeLead>; selecionados: Set<string>; comAtividade: boolean;
}) {
  // Segunda-feira a tela abre na SEMANA PASSADA: é o dia da reunião 1:1, e a
  // semana corrente com meio dia de vida só mostraria zeros.
  const [offset, setOffset] = useState(() => (new Date().getDay() === 1 ? -1 : 0));
  const janela = useMemo(() => semanaDe(offset), [offset]);
  const r = useMemo(
    () => computeSemana(leads, corretores, vendas, atividade, selecionados, janela),
    [leads, corretores, vendas, atividade, selecionados, janela]
  );
  const [aberto, setAberto] = useState<string | null>(null);
  const a = r.time.atual, p = r.time.anterior;

  const MetricaDark = ({ rotulo, v, antes, dinheiro }: { rotulo: string; v: number; antes: number; dinheiro?: boolean }) => (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-secondary">{rotulo}</p>
      <p className="al-display text-[19px] font-bold tabular-nums leading-tight text-white">
        {dinheiro ? fmtMoeda(v) : v}
        {v !== antes && <span className={`text-[10px] ml-1 font-extrabold ${v > antes ? 'text-emerald-300' : 'text-rose-300'}`}>{v > antes ? '▲' : '▼'}{dinheiro ? fmtMoeda(Math.abs(v - antes)) : Math.abs(v - antes)}</span>}
      </p>
      <p className="text-[10px] text-text-secondary mt-0.5">semana ant.: {dinheiro ? fmtMoeda(antes) : antes}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* navegação de semana + PDF */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] border border-white/10 p-1">
          <button onClick={() => setOffset((o) => o - 1)} className="px-2.5 py-1.5 rounded-lg text-[13px] font-bold text-text-secondary hover:text-white hover:bg-white/[0.08]" title="semana anterior">‹</button>
          <span className="px-2 text-[12px] font-bold text-white tabular-nums">{janela.ehAtual ? `Esta semana · ${janela.label}` : janela.label}</span>
          <button onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={offset === 0}
            className="px-2.5 py-1.5 rounded-lg text-[13px] font-bold text-text-secondary hover:text-white hover:bg-white/[0.08] disabled:opacity-30" title="semana seguinte">›</button>
          {offset !== 0 && <button onClick={() => setOffset(0)} className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-text-secondary hover:text-white">hoje</button>}
        </div>
        <button onClick={() => window.print()}
          className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all">
          🖨️ Gerar PDF ({1 + r.corretores.length} páginas)
        </button>
      </div>

      {!comAtividade && (
        <div className="al-card p-3 text-[12px] text-amber-300/90">A leitura da atividade (toques, tarefas) ainda está carregando — os números de movimento aparecem já; os de toque completam em instantes.</div>
      )}

      {/* o time na semana */}
      <section className="al-card relative overflow-hidden p-4 sm:p-5">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.1em] mb-3">O time na semana</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3">
          <MetricaDark rotulo="Leads novos" v={a.leadsNovos} antes={p.leadsNovos} />
          <MetricaDark rotulo="Toques" v={a.toques} antes={p.toques} />
          <MetricaDark rotulo="Meets feitos" v={a.meetsFeitos} antes={p.meetsFeitos} />
          <MetricaDark rotulo="Visitas" v={a.visitasFeitas} antes={p.visitasFeitas} />
          <MetricaDark rotulo="Vendas" v={a.vendas} antes={p.vendas} />
          <MetricaDark rotulo="VGV" v={a.vgv} antes={p.vgv} dinheiro />
        </div>
        <p className="text-[11px] text-text-secondary mt-3">
          {a.novosAtendidos}/{a.leadsNovos} novos atendidos
          {a.tempoMedio1oContatoHoras !== null && <> · 1º contato em <b className="text-white">{a.tempoMedio1oContatoHoras}h</b></>}
          · <b className="text-white">{a.avancos}</b> avanços de etapa
          · {a.descartes} descartes{a.descartesRapidos > 0 && <span className="text-amber-300"> ({a.descartesRapidos} no 1º toque)</span>}
        </p>
        {(r.time.destaque || r.time.atencao) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {r.time.destaque && <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/40 text-emerald-300">⭐ Destaque: {r.time.destaque}</span>}
            {r.time.atencao && <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/10 border border-rose-500/40 text-rose-300">⚠ Precisa de conversa: {r.time.atencao}</span>}
          </div>
        )}
      </section>

      {/* corretor por corretor */}
      <section className="al-card relative overflow-hidden p-4 sm:p-5">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.1em]">Semana de cada um</h2>
          <span className="text-[10px] text-text-secondary">clique pra ver o roteiro da conversa</span>
        </div>
        <div className="space-y-1.5">
          {r.corretores.map((c) => (
            <div key={c.uid} className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <button onClick={() => setAberto(aberto === c.uid ? null : c.uid)} className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] transition-colors">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[13px] font-bold text-white min-w-[140px]">{c.nome}</span>
                  <span className="text-[11px] text-text-secondary tabular-nums flex-1">
                    {c.atual.leadsNovos} novos · {c.atual.toques} toques · {c.atual.diasAtivos}/7 dias
                    · {c.atual.meetsFeitos}/{c.atual.meetsAgendados} meets · {c.atual.avancos} avanços
                    {c.atual.vendas > 0 && <b className="text-emerald-300"> · {c.atual.vendas} venda{c.atual.vendas > 1 ? 's' : ''} ({fmtMoeda(c.atual.vgv)})</b>}
                  </span>
                  {c.cobrar.length > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 border border-rose-500/40 text-rose-300">{c.cobrar.length} pontos</span>}
                  <span className="text-text-secondary text-[11px]">{aberto === c.uid ? '▲' : '▼'}</span>
                </div>
              </button>
              {aberto === c.uid && (
                <div className="px-3 pb-3 pt-1 grid sm:grid-cols-2 gap-3 border-t border-white/[0.06]">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-300 mb-1">✔ Reconhecer</p>
                    {c.fortes.length ? c.fortes.map((f, i) => <p key={i} className="text-[11.5px] text-white/85 py-0.5">• {f}</p>)
                      : <p className="text-[11px] text-text-secondary">Sem destaque nesta semana.</p>}
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-rose-300 mt-2 mb-1">⚠ Cobrar</p>
                    {c.cobrar.length ? c.cobrar.map((f, i) => <p key={i} className="text-[11.5px] text-white/85 py-0.5">• {f}</p>)
                      : <p className="text-[11px] text-text-secondary">Nada pendente — semana redonda.</p>}
                  </div>
                  <div className="text-[11px] text-text-secondary space-y-1">
                    <p><b className="text-white">{c.ativos}</b> ativos · <b className="text-white">{c.parados14d}</b> parados +14d · <b className="text-white">{c.semToque7d}</b> sem toque +7d · <b className="text-white">{c.tarefasAtrasadas}</b> tarefas vencidas</p>
                    {c.novosSemContato.length > 0 && <p><b className="text-amber-300">Novos sem contato:</b> {c.novosSemContato.map((x) => `${x.nome} (${x.dias}d)`).join(' · ')}</p>}
                    {c.topSemToque.length > 0 && <p><b className="text-rose-300">Abandonados:</b> {c.topSemToque.map((x) => `${x.nome} (${x.dias}d)`).join(' · ')}</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
          {r.corretores.length === 0 && <p className="text-[12px] text-text-secondary py-4 text-center">Nenhum corretor na régua.</p>}
        </div>
      </section>

      {r.historicoDesdeMs && (
        <p className="text-[10px] text-text-secondary">O carimbo de movimento de etapa existe desde {fmtData(r.historicoDesdeMs)} — semanas anteriores subnotificam avanços.</p>
      )}

      {/* versão de papel — só existe na impressão */}
      <style dangerouslySetInnerHTML={{ __html: CSS_PRINT }} />
      <div id="semanal-print">
        <PaginaTime r={r} />
        {r.corretores.map((c) => <PaginaCorretor key={c.uid} c={c} label={r.janela.label} />)}
      </div>
    </div>
  );
}
