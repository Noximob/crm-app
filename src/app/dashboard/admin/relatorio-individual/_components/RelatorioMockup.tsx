'use client';

import React from 'react';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

/** Círculo de progresso gamificado — % feito no centro, arco colorido; mostra realizado vs necessário e "faltam" */
function CircleCard({
  title,
  necessario,
  realizado,
  faltam,
  unidade = 'un',
  variant = 'gold',
}: {
  title: string;
  necessario: number;
  realizado: number;
  faltam?: number;
  unidade?: 'un' | 'R$';
  variant?: 'gold' | 'green' | 'red' | 'gray';
}) {
  const pct = necessario > 0 ? Math.min(100, (realizado / necessario) * 100) : 0;
  const colors = { gold: '#D4A017', green: '#22c55e', red: '#ef4444', gray: 'rgba(255,255,255,0.3)' };
  const color = colors[variant];
  const r = 24;
  const stroke = 3;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const valorRealizado = unidade === 'R$' ? formatCurrency(realizado) : realizado % 1 === 0 ? realizado : realizado.toFixed(2).replace('.', ',');
  const valorNecessario = unidade === 'R$' ? formatCurrency(necessario) : necessario % 1 === 0 ? necessario : necessario.toFixed(2).replace('.', ',');

  return (
    <div className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 p-2 flex-1 min-w-0">
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
          <span className={`text-sm font-bold tabular-nums ${variant === 'green' ? 'text-emerald-400' : variant === 'red' ? 'text-red-400' : 'text-[#D4A017]'}`}>
            {Math.round(pct)}%
          </span>
          <span className="text-[9px] text-gray-500 font-medium">feito</span>
        </div>
      </div>
      <p className="text-xs text-white font-medium mt-2 text-center leading-tight">{title}</p>
      <p className="text-[10px] text-gray-400 mt-0.5 text-center tabular-nums">
        {valorRealizado} / {valorNecessario}
      </p>
      {faltam != null && faltam > 0 && (
        <p className="text-[10px] text-amber-400 mt-0.5 text-center font-medium">faltam {unidade === 'R$' ? formatCurrency(Math.ceil(faltam)) : faltam % 1 === 0 ? faltam : faltam.toFixed(2).replace('.', ',')}</p>
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
    <div className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-gray-300 w-32 shrink-0 truncate">{etapa}</span>
      <div className="flex-1 min-w-0 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs tabular-nums text-white w-16 text-right">{atual} / {necessario}</span>
      {status === 'ok' ? (
        <span className="text-emerald-400" title="Acima ou no alvo">↑</span>
      ) : (
        <span className="text-red-400" title="Abaixo do necessário">↓</span>
      )}
    </div>
  );
}

const ETAPAS_FUNIL = [
  'Topo de Funil',
  'Qualificação',
  'Qualificado',
  'Oferta do imóvel',
  'Atendimento Agendado',
  'Negociação e Proposta',
  'Contrato e fechamento',
  'Carteira Pessoal',
  'Pós Venda e Fidelização',
  'Interesse Futuro',
  'Trocar Leads',
];

/** Dados mock — necessário/realizado podem ser "no período" (mensal/trimestral) conforme recorte */
const MOCK = {
  moedas: 1250,
  periodoLabel: 'Mensal',
  metaAno: 100_000,
  metaNoPeriodo: 8_333,
  comoChegar: {
    topoFunil: { necessario: 42, realizado: 38 },
    qualificados: { necessario: 17, realizado: 8 },
    reunioes: { necessario: 8, realizado: 4 },
    vendasNecessarias: 1,
    unidadesVender: 1,
    vgvNecessario: 8_333,
    vgvRealizado: 2_120,
  },
  funilAgora: [
    { etapa: 'Topo de Funil', atual: 380, necessario: 500 },
    { etapa: 'Qualificação', atual: 120, necessario: 200 },
    { etapa: 'Qualificado', atual: 95, necessario: 200 },
    { etapa: 'Oferta do imóvel', atual: 45, necessario: 80 },
    { etapa: 'Atendimento Agendado', atual: 42, necessario: 100 },
    { etapa: 'Negociação e Proposta', atual: 18, necessario: 40 },
    { etapa: 'Contrato e fechamento', atual: 2, necessario: 4 },
  ],
  acimaAbaixoPeriodo: -21,
  participacao: {
    eventosImobiliaria: 12,
    prospecao: {
      ligacaoAtiva: 28,
      acaoRua: 14,
      disparoMsg: 45,
      leads: 32,
      plantoes: 6,
    },
  },
  tarefas: { total: 18, atrasadas: 3 },
  tempoCrm: { interacoes: 156, horasEquivalentes: 12 },
};

export default function RelatorioMockup() {
  const c = MOCK.comoChegar;
  const pctVgv = c.vgvNecessario > 0 ? c.vgvRealizado / c.vgvNecessario : 0;
  const pctGeralPeriodo = Math.round(pctVgv * 100);

  return (
    <div className="space-y-6 pb-8">
      {/* Como chegar na sua meta do ano — título + moedas à direita */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-0.5 h-5 bg-[#D4A017] rounded-r-full" />
            Como chegar na sua meta do ano
          </h2>
          <div className="flex items-center gap-2 rounded-xl border border-[#D4A017]/40 bg-[#D4A017]/10 px-3 py-1.5">
            <span className="text-lg">🪙</span>
            <span className="font-bold text-[#D4A017] tabular-nums">{MOCK.moedas.toLocaleString('pt-BR')}</span>
            <span className="text-xs text-gray-400">moedas</span>
          </div>
        </div>

        <p className="text-sm text-gray-300 mb-1">
          Meta do ano: <strong className="text-[#D4A017]">{formatCurrency(MOCK.metaAno)}</strong>. No período ({MOCK.periodoLabel.toLowerCase()}): você deveria fazer <strong className="text-white">{formatCurrency(MOCK.metaNoPeriodo)}</strong> em VGV.
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Abaixo: <strong className="text-white">% feito</strong> em cada camada do funil no período — o que você realizou vs o que precisaria para bater a meta no ritmo.
        </p>

        {/* Círculos em uma única linha (ordem: VGV → Unidades → Vendas → Reuniões → Qualificados → Topo) */}
        <div className="flex flex-nowrap gap-1 sm:gap-2">
          <CircleCard
            title="VGV no período"
            necessario={c.vgvNecessario}
            realizado={c.vgvRealizado}
            faltam={Math.max(0, c.vgvNecessario - c.vgvRealizado)}
            unidade="R$"
            variant={pctVgv >= 1 ? 'green' : pctVgv >= 0.5 ? 'gold' : 'red'}
          />
          <CircleCard
            title="Unidades a vender"
            necessario={1}
            realizado={Math.min(1, pctVgv)}
            faltam={Math.max(0, 1 - pctVgv)}
            variant={pctVgv >= 1 ? 'green' : 'gold'}
          />
          <CircleCard
            title="Vendas no período"
            necessario={1}
            realizado={Math.min(1, pctVgv)}
            faltam={Math.max(0, 1 - pctVgv)}
            variant={pctVgv >= 1 ? 'green' : 'gold'}
          />
          <CircleCard
            title="Reuniões agendadas"
            necessario={c.reunioes.necessario}
            realizado={c.reunioes.realizado}
            faltam={Math.max(0, c.reunioes.necessario - c.reunioes.realizado)}
            variant={c.reunioes.realizado >= c.reunioes.necessario ? 'green' : 'gold'}
          />
          <CircleCard
            title="Leads qualificados"
            necessario={c.qualificados.necessario}
            realizado={c.qualificados.realizado}
            faltam={Math.max(0, c.qualificados.necessario - c.qualificados.realizado)}
            variant={c.qualificados.realizado >= c.qualificados.necessario ? 'green' : 'gold'}
          />
          <CircleCard
            title="Topo do funil"
            necessario={c.topoFunil.necessario}
            realizado={c.topoFunil.realizado}
            faltam={Math.max(0, c.topoFunil.necessario - c.topoFunil.realizado)}
            variant={c.topoFunil.realizado >= c.topoFunil.necessario ? 'green' : 'gold'}
          />
        </div>

        <div className={`mt-4 rounded-xl px-4 py-2 text-center text-sm font-semibold ${pctGeralPeriodo >= 100 ? 'bg-emerald-500/20 text-emerald-400' : pctGeralPeriodo >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
          No período você fez <strong>{pctGeralPeriodo}%</strong> do VGV necessário para manter o ritmo da meta do ano.
        </div>
      </section>

      {/* Funil de vendas agora — GAP */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <span className="w-0.5 h-5 bg-[#D4A017] rounded-r-full" />
          Como está seu funil agora
        </h2>
        <p className="text-xs text-gray-400 mb-3">GAP: onde você está vs onde precisa estar (média de mercado).</p>
        <div className="space-y-0 divide-y divide-white/5 rounded-xl bg-black/20 p-3">
          {MOCK.funilAgora.map((f) => (
            <FunilRow key={f.etapa} etapa={f.etapa} atual={f.atual} necessario={f.necessario} />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
          <span className="text-sm text-gray-400">No período, você está</span>
          {MOCK.acimaAbaixoPeriodo >= 0 ? (
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="text-lg">↑</span> +{MOCK.acimaAbaixoPeriodo}%
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400 font-bold">
              <span className="text-lg">↓</span> {MOCK.acimaAbaixoPeriodo}%
            </span>
          )}
          <span className="text-xs text-gray-500">vs métricas da meta</span>
        </div>
      </section>

      {/* Participação no período */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-0.5 h-5 bg-[#D4A017] rounded-r-full" />
          Participação no período
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Eventos da imobiliária</p>
            <p className="text-3xl font-bold text-[#D4A017] tabular-nums">{MOCK.participacao.eventosImobiliaria}</p>
            <p className="text-xs text-gray-400 mt-0.5">Reuniões, treinamentos e outros</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Prospecção</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-gray-300">Ligação ativa: <strong className="text-white">{MOCK.participacao.prospecao.ligacaoAtiva}</strong></span>
              <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-gray-300">Ação de rua: <strong className="text-white">{MOCK.participacao.prospecao.acaoRua}</strong></span>
              <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-gray-300">Disparo: <strong className="text-white">{MOCK.participacao.prospecao.disparoMsg}</strong></span>
              <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-gray-300">Leads: <strong className="text-white">{MOCK.participacao.prospecao.leads}</strong></span>
              <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-gray-300">Plantões: <strong className="text-white">{MOCK.participacao.prospecao.plantoes}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Tarefas e tempo no CRM */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-0.5 h-5 bg-[#D4A017] rounded-r-full" />
          Tarefas e uso do CRM
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Tarefas na semana</p>
            <p className="text-2xl font-bold text-white tabular-nums">{MOCK.tarefas.total}</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
            <p className="text-xs text-amber-400 uppercase tracking-wide">Atrasadas</p>
            <p className="text-2xl font-bold text-amber-400 tabular-nums">{MOCK.tarefas.atrasadas}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Interações / ações no CRM</p>
            <p className="text-2xl font-bold text-white tabular-nums">{MOCK.tempoCrm.interacoes}</p>
            <p className="text-[10px] text-gray-500">~{MOCK.tempoCrm.horasEquivalentes}h de uso</p>
          </div>
        </div>
      </section>
    </div>
  );
}
