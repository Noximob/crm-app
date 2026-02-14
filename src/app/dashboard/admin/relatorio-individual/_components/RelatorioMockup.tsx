'use client';

import React from 'react';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

/** Cor gradual: 0% vermelho → 50% amarelo → 100% verde (hex) */
function colorFromPct(pct: number): string {
  const t = Math.max(0, Math.min(1, pct / 100));
  const r1 = 239, g1 = 68, b1 = 68;   // red
  const r2 = 212, g2 = 160, b2 = 23;  // yellow/gold
  const r3 = 34, g3 = 197, b3 = 94;   // green
  let r: number, g: number, b: number;
  if (t <= 0.5) {
    const u = t * 2; // 0..1
    r = Math.round(r1 + (r2 - r1) * u);
    g = Math.round(g1 + (g2 - g1) * u);
    b = Math.round(b1 + (b2 - b1) * u);
  } else {
    const u = (t - 0.5) * 2; // 0..1
    r = Math.round(r2 + (r3 - r2) * u);
    g = Math.round(g2 + (g3 - g2) * u);
    b = Math.round(b2 + (b3 - b2) * u);
  }
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Círculo de progresso gamificado — cor gradual por % (vermelho → amarelo → verde); mostra realizado vs necessário e "faltam" */
function CircleCard({
  title,
  necessario,
  realizado,
  faltam,
  unidade = 'un',
}: {
  title: string;
  necessario: number;
  realizado: number;
  faltam?: number;
  unidade?: 'un' | 'R$';
}) {
  const pct = necessario > 0 ? Math.min(100, (realizado / necessario) * 100) : 0;
  const color = colorFromPct(pct);
  const r = 24;
  const stroke = 3;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const valorRealizado = unidade === 'R$' ? formatCurrency(realizado) : realizado % 1 === 0 ? realizado : realizado.toFixed(2).replace('.', ',');
  const valorNecessario = unidade === 'R$' ? formatCurrency(necessario) : necessario % 1 === 0 ? necessario : necessario.toFixed(2).replace('.', ',');

  return (
    <div className="flex flex-col items-center rounded-lg border border-white/10 bg-white/[0.06] p-1.5 flex-1 min-w-0">
      <div className="relative" style={{ width: r * 2 + stroke * 2, height: r * 2 + stroke * 2 }}>
        <svg width={r * 2 + stroke * 2} height={r * 2 + stroke * 2} className="-rotate-90">
          <circle cx={r + stroke} cy={r + stroke} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={r + stroke}
            cy={r + stroke}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold tabular-nums" style={{ color }}>
            {Math.round(pct)}%
          </span>
          <span className="text-[9px] text-gray-500 font-medium">feito</span>
        </div>
      </div>
      <p className="text-[11px] text-white font-medium mt-1.5 text-center leading-tight">{title}</p>
      <p className="text-[9px] text-gray-400 mt-0.5 text-center tabular-nums">{valorRealizado}/{valorNecessario}</p>
      {faltam != null && faltam > 0 && (
        <p className="text-[9px] text-amber-400 mt-0.5 text-center font-medium">faltam {unidade === 'R$' ? formatCurrency(Math.ceil(faltam)) : faltam % 1 === 0 ? faltam : faltam.toFixed(2).replace('.', ',')}</p>
      )}
    </div>
  );
}

/** Linha do funil: etapa, atual / necessário, barra e setinha verde/vermelho */
function FunilRow({
  etapa,
  atual,
  necessario,
}: {
  etapa: string;
  atual: number;
  necessario: number;
}) {
  const pct = necessario > 0 ? (atual / necessario) * 100 : 0;
  const status = pct >= 100 ? 'ok' : pct >= 50 ? 'atencao' : 'abaixo';
  const barColor = status === 'ok' ? '#22c55e' : status === 'atencao' ? '#D4A017' : '#ef4444';

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-300 w-28 shrink-0 truncate">{etapa}</span>
      <div className="flex-1 min-w-0 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-white w-12 text-right">{atual}/{necessario}</span>
      {status === 'ok' ? (
        <span className="text-emerald-400 text-xs" title="Acima ou no alvo">↑</span>
      ) : (
        <span className="text-red-400 text-xs" title="Abaixo do necessário">↓</span>
      )}
    </div>
  );
}

/** Dados mock — necessário/realizado podem ser "no período" (mensal/trimestral) conforme recorte */
const MOCK = {
  moedas: 1250,
  periodoLabel: 'Mensal',
  metaAno: 100_000,
  metaNoPeriodo: 8_317,
  comoChegar: {
    topoFunil: { necessario: 41, realizado: 31 },       // ~76% (verde)
    qualificados: { necessario: 17, realizado: 12 },   // ~71% (verde)
    reunioes: { necessario: 15, realizado: 8 },        // ~53% (amarelo)
    vendasNecessarias: 1,
    unidadesVender: 1,
    vgvNecessario: 8_317,
    vgvRealizado: 2_079,                               // ~25% (vermelho)
  },
  /** Funil completo (topo até troca de leads) — usado na coluna esquerda; valores do mês em evolução */
  funilCompleto: [
    { etapa: 'Topo de Funil', atual: 378, necessario: 500 },
    { etapa: 'Qualificação', atual: 118, necessario: 200 },
    { etapa: 'Qualificado', atual: 94, necessario: 200 },
    { etapa: 'Oferta do imóvel', atual: 43, necessario: 80 },
    { etapa: 'Atendimento Agendado', atual: 41, necessario: 98 },
    { etapa: 'Negociação e Proposta', atual: 17, necessario: 40 },
    { etapa: 'Contrato e fechamento', atual: 2, necessario: 4 },
    { etapa: 'Carteira Pessoal', atual: 28, necessario: 60 },
    { etapa: 'Pós Venda e Fidelização', atual: 12, necessario: 25 },
    { etapa: 'Interesse Futuro', atual: 45, necessario: 80 },
    { etapa: 'Trocar Leads', atual: 8, necessario: 15 },
  ],
  acimaAbaixoPeriodo: -19,
  /** Horas no período (mês); relatório é mensal, evolução vista semana a semana */
  semanaAtualDoMes: 2,
  totalSemanasNoMes: 4,
  eventosCorporativos: {
    horas: 8.5,
    detalhe: 'Treinamentos, reuniões, palestras',
  },
  eventosProspecao: {
    horas: 14,
    detalhe: 'Ação de rua, ligação ativa, revisão CRM, disparo de msg',
  },
  captacoesProduto: 5,
  tempoCrmEstaSemana: { horas: 4.2, interacoes: 42 },
  tarefas: { total: 18, atrasadas: 3 },
  tempoCrmMes: { interacoes: 153, horasEquivalentes: 12 },
  /** No máximo 4 ou 5 itens: crítico, atenção, muito bom — derivados das métricas */
  destaques: [
    { tipo: 'critico' as const, titulo: 'VGV abaixo do ritmo', texto: 'No período você está em 25% do VGV necessário para manter a meta anual.' },
    { tipo: 'atencao' as const, titulo: 'Reuniões no meio do caminho', texto: '53% das reuniões agendadas. Faltam 7 para fechar o ritmo do mês.' },
    { tipo: 'muito_bom' as const, titulo: 'Topo do funil forte', texto: '76% do topo do funil. Boa geração de leads para as próximas semanas.' },
    { tipo: 'muito_bom' as const, titulo: 'Presença em eventos', texto: '8h30 em eventos corporativos e 14h em prospecção no mês.' },
    { tipo: 'atencao' as const, titulo: 'Tarefas atrasadas', texto: '3 tarefas atrasadas. Vale priorizar para não acumular.' },
  ],
};

export default function RelatorioMockup() {
  const c = MOCK.comoChegar;
  const pctVgv = c.vgvNecessario > 0 ? c.vgvRealizado / c.vgvNecessario : 0;

  const semanaPct = (MOCK.semanaAtualDoMes / MOCK.totalSemanasNoMes) * 100;

  return (
    /* Um quadrado só: relatório inteiro em um único bloco gamificado */
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#D4A017]/40 bg-gradient-to-b from-[#1a1a1f] to-[#121218] p-4 shadow-[0_0_40px_-8px_rgba(212,160,23,0.25),0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Faixa dourada sutil no topo */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4A017]/60 to-transparent" />

      {/* Cabeçalho: meta + moedas + semana */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <span className="w-1 h-5 rounded-r-full bg-gradient-to-b from-[#D4A017] to-[#b8860b] shadow-[0_0_6px_rgba(212,160,23,0.5)]" />
          Como chegar na sua meta do ano
        </h2>
        <div className="flex items-center gap-2 rounded-lg border border-[#D4A017]/50 bg-[#D4A017]/10 px-3 py-1.5">
          <span className="text-[10px] text-gray-400">Meta</span>
          <span className="text-base font-bold tabular-nums text-[#D4A017]">{formatCurrency(MOCK.metaAno)}</span>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-lg border border-[#D4A017]/50 bg-[#D4A017]/15 px-3 py-1.5 shadow-[0_0_12px_rgba(212,160,23,0.2)]">
          <span className="text-base">🪙</span>
          <span className="font-bold tabular-nums text-[#D4A017]">{MOCK.moedas.toLocaleString('pt-BR')}</span>
          <span className="text-[10px] text-gray-400">moedas</span>
        </div>
      </div>

      {/* Barra “Semana X de Y” gamificada */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>Semana {MOCK.semanaAtualDoMes} de {MOCK.totalSemanasNoMes}</span>
          <span>evolução no mês</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#D4A017] to-[#e8c234] shadow-[0_0_8px_rgba(212,160,23,0.5)] transition-all"
            style={{ width: `${semanaPct}%` }}
          />
        </div>
      </div>

      {/* 6 círculos — meta no ritmo */}
      <div className="flex flex-nowrap gap-1 sm:gap-1.5 mb-4">
        <CircleCard title="VGV" necessario={c.vgvNecessario} realizado={c.vgvRealizado} faltam={Math.max(0, c.vgvNecessario - c.vgvRealizado)} unidade="R$" />
        <CircleCard title="Unidades" necessario={1} realizado={Math.min(1, pctVgv)} faltam={Math.max(0, 1 - pctVgv)} />
        <CircleCard title="Vendas" necessario={1} realizado={Math.min(1, pctVgv)} faltam={Math.max(0, 1 - pctVgv)} />
        <CircleCard title="Reuniões" necessario={c.reunioes.necessario} realizado={c.reunioes.realizado} faltam={Math.max(0, c.reunioes.necessario - c.reunioes.realizado)} />
        <CircleCard title="Leads" necessario={c.qualificados.necessario} realizado={c.qualificados.realizado} faltam={Math.max(0, c.qualificados.necessario - c.qualificados.realizado)} />
        <CircleCard title="Topo funil" necessario={c.topoFunil.necessario} realizado={c.topoFunil.realizado} faltam={Math.max(0, c.topoFunil.necessario - c.topoFunil.realizado)} />
      </div>

      <div className="border-t border-white/10 pt-3" />

      {/* 2 colunas: funil | participação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <h3 className="text-xs font-bold text-[#D4A017] mb-1.5 flex items-center gap-1.5">
            <span className="w-0.5 h-3.5 bg-[#D4A017] rounded-r-full" />
            Funil de vendas
          </h3>
          <div className="max-h-[240px] overflow-y-auto space-y-0 divide-y divide-white/5 pr-0.5">
            {MOCK.funilCompleto.map((f) => (
              <FunilRow key={f.etapa} etapa={f.etapa} atual={f.atual} necessario={f.necessario} />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between rounded-md bg-white/5 px-2 py-1.5 text-[11px]">
            <span className="text-gray-400">vs meta</span>
            {MOCK.acimaAbaixoPeriodo >= 0 ? (
              <span className="text-emerald-400 font-bold">↑ +{MOCK.acimaAbaixoPeriodo}%</span>
            ) : (
              <span className="text-red-400 font-bold">↓ {MOCK.acimaAbaixoPeriodo}%</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#D4A017] flex items-center gap-1.5">
            <span className="w-0.5 h-3.5 bg-[#D4A017] rounded-r-full" />
            Participação e uso
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[#D4A017]/30 bg-[#D4A017]/10 p-2.5 text-center">
              <p className="text-[10px] text-gray-500 uppercase">Corporativos</p>
              <p className="text-lg font-bold text-[#D4A017] tabular-nums">{MOCK.eventosCorporativos.horas}h</p>
            </div>
            <div className="rounded-lg border border-[#D4A017]/30 bg-[#D4A017]/10 p-2.5 text-center">
              <p className="text-[10px] text-gray-500 uppercase">Prospecção</p>
              <p className="text-lg font-bold text-[#D4A017] tabular-nums">{MOCK.eventosProspecao.horas}h</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
              <p className="text-[10px] text-gray-500 uppercase">Captações</p>
              <p className="text-lg font-bold text-white tabular-nums">{MOCK.captacoesProduto}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
              <p className="text-[10px] text-gray-500 uppercase">CRM esta sem.</p>
              <p className="text-lg font-bold text-white tabular-nums">{MOCK.tempoCrmEstaSemana.horas}h</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Tarefas</span>
              <span className="font-bold text-white">{MOCK.tarefas.total}</span>
            </div>
            {MOCK.tarefas.atrasadas > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 flex items-center gap-1 text-[11px]">
                <span className="text-amber-400">Atrasadas</span>
                <span className="font-bold text-amber-400">{MOCK.tarefas.atrasadas}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3" />

      {/* Destaques: crítico / atenção / muito bom — máx 5 itens */}
      <div>
        <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
          <span className="w-0.5 h-3.5 bg-[#D4A017] rounded-r-full" />
          Destaques do período
        </h3>
        <ul className="space-y-2">
          {MOCK.destaques.map((d, i) => (
            <li
              key={i}
              className={`rounded-lg border px-3 py-2 flex items-start gap-2 ${
                d.tipo === 'critico' ? 'border-red-500/50 bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.15)]' :
                d.tipo === 'atencao' ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]' :
                'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_12px_rgba(34,197,94,0.12)]'
              }`}
            >
              <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                d.tipo === 'critico' ? 'bg-red-500/40 text-red-200' :
                d.tipo === 'atencao' ? 'bg-amber-500/40 text-amber-200' :
                'bg-emerald-500/40 text-emerald-200'
              }`}>
                {d.tipo === 'critico' ? '!' : d.tipo === 'atencao' ? '↑' : '★'}
              </span>
              <div className="min-w-0">
                <p className={`font-semibold text-xs ${d.tipo === 'critico' ? 'text-red-300' : d.tipo === 'atencao' ? 'text-amber-300' : 'text-emerald-300'}`}>{d.titulo}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{d.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
