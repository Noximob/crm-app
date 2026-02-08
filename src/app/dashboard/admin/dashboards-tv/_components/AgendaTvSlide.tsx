'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { AgendaEventoTv, PlantaoTv } from './useAgendaTvData';
import { startOfDay, endOfDay } from './useAgendaTvData';

const TIPOS_ACOES_VENDA = ['revisar-crm', 'ligacao-ativa', 'acao-de-rua', 'disparo-de-msg'];

const TIPO_ICON: Record<string, string> = {
  reuniao: '👥',
  evento: '🎉',
  treinamento: '📚',
  'revisar-crm': '📋',
  'ligacao-ativa': '📞',
  'acao-de-rua': '📍',
  'disparo-de-msg': '💬',
  outro: '📅',
};

const TIPO_LABEL: Record<string, string> = {
  reuniao: 'Reunião',
  evento: 'Evento',
  treinamento: 'Treinamento',
  'revisar-crm': 'Revisar CRM',
  'ligacao-ativa': 'Ligação Ativa',
  'acao-de-rua': 'Ação de rua',
  'disparo-de-msg': 'Disparo de Msg',
  outro: 'Outro',
};

const TIPO_COR: Record<string, string> = {
  reuniao: 'from-blue-500 to-blue-600',
  evento: 'from-purple-500 to-purple-600',
  treinamento: 'from-green-500 to-green-600',
  'revisar-crm': 'from-cyan-500 to-cyan-600',
  'ligacao-ativa': 'from-emerald-500 to-emerald-600',
  'acao-de-rua': 'from-amber-500 to-amber-600',
  'disparo-de-msg': 'from-indigo-500 to-indigo-600',
  outro: 'from-slate-500 to-slate-600',
};

interface SlotDia {
  id: string;
  titulo: string;
  tipo: string;
  local?: string;
  responsavel?: string;
  inicio: Date;
  fim: Date;
  isAcaoVenda: boolean;
}

interface SlotPlantao {
  id: string;
  construtora: string;
  corretorResponsavel: string;
  horario: string;
  inicio: Date;
  fim: Date;
}

function expandirPlantoesParaSlots(
  plantoes: PlantaoTv[],
  diaInicio: Date,
  diaFim: Date,
  now: Date
): SlotPlantao[] {
  const slots: SlotPlantao[] = [];
  const start = diaInicio.getTime();
  const end = diaFim.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  plantoes.forEach((p) => {
    const inicioOnly = new Date(p.dataInicio.getFullYear(), p.dataInicio.getMonth(), p.dataInicio.getDate());
    const fimOnly = new Date(p.dataFim.getFullYear(), p.dataFim.getMonth(), p.dataFim.getDate());
    const [h = 9, m = 0] = (p.horario || '09:00').toString().trim().split(':').map(Number);
    for (let t = Math.max(start, inicioOnly.getTime()); t <= end && t <= fimOnly.getTime(); t += oneDay) {
      const dayCur = new Date(t);
      const slotInicio = new Date(dayCur.getFullYear(), dayCur.getMonth(), dayCur.getDate(), h, m, 0, 0);
      const slotFim = new Date(slotInicio.getTime() + 2 * 60 * 60 * 1000);
      if (slotInicio.getTime() > end) continue;
      slots.push({
        id: `${p.id}_${slotInicio.getTime()}`,
        construtora: p.construtora,
        corretorResponsavel: p.corretorResponsavel,
        horario: p.horario,
        inicio: slotInicio,
        fim: slotFim,
      });
    }
  });
  slots.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  return slots;
}

function expandirEventosParaSlots(
  events: AgendaEventoTv[],
  diaInicio: Date,
  diaFim: Date,
  now: Date
): SlotDia[] {
  const slots: SlotDia[] = [];
  const start = diaInicio.getTime();
  const end = diaFim.getTime();

  events.forEach((ev) => {
    const inicio = ev.dataInicio.toDate();
    const fimEv = ev.dataFim?.toDate();
    if (fimEv && fimEv.getTime() < start) return;
    if (inicio.getTime() > end) return;

    const inicioOnly = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    const fimOnly = fimEv
      ? new Date(fimEv.getFullYear(), fimEv.getMonth(), fimEv.getDate())
      : inicioOnly;
    const isMultiDay = fimOnly.getTime() > inicioOnly.getTime();

    if (!isMultiDay) {
      const slotFim = fimEv || new Date(inicio.getTime() + 60 * 60 * 1000);
      if (inicio.getTime() >= start && inicio.getTime() <= end) {
        slots.push({
          id: ev.id,
          titulo: ev.titulo,
          tipo: ev.tipo,
          local: ev.local,
          responsavel: ev.responsavel,
          inicio,
          fim: slotFim,
          isAcaoVenda: TIPOS_ACOES_VENDA.includes(ev.tipo),
        });
      }
      return;
    }

    if (!fimEv) return;
    const oneDay = 24 * 60 * 60 * 1000;
    for (let t = Math.max(start, inicioOnly.getTime()); t <= end && t <= fimOnly.getTime(); t += oneDay) {
      const dayCur = new Date(t);
      const dayStart = new Date(dayCur.getFullYear(), dayCur.getMonth(), dayCur.getDate(), inicio.getHours(), inicio.getMinutes(), 0, 0);
      const dayEnd = new Date(dayCur.getFullYear(), dayCur.getMonth(), dayCur.getDate(), fimEv.getHours(), fimEv.getMinutes(), 59, 999);
      if (dayEnd.getTime() < start) continue;
      if (dayStart.getTime() > end) continue;
      const slotInicio = dayStart.getTime() < start ? new Date(start) : dayStart;
      const slotFim = dayEnd.getTime() > end ? new Date(end) : dayEnd;
      slots.push({
        id: `${ev.id}_${dayStart.getTime()}`,
        titulo: ev.titulo,
        tipo: ev.tipo,
        local: ev.local,
        responsavel: ev.responsavel,
        inicio: slotInicio,
        fim: slotFim,
        isAcaoVenda: TIPOS_ACOES_VENDA.includes(ev.tipo),
      });
    }
  });

  slots.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  return slots;
}

function fmtHora(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDiaCurto(d: Date): string {
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

const FRASE_POR_DIA: Record<number, string> = {
  0: 'Começamos a semana!',
  1: 'Começamos a semana!',
  2: 'Semana em andamento',
  3: 'Meio da semana',
  4: 'Quase lá!',
  5: 'Quase acabando!',
  6: 'Estamos acabando!',
};

interface AgendaTvSlideProps {
  events: AgendaEventoTv[];
  plantoes?: PlantaoTv[];
  fraseSemana?: string;
  mode: 'day' | 'week';
}

export function AgendaTvSlide({ events, plantoes = [], fraseSemana, mode }: AgendaTvSlideProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const {
    slotsHoje,
    slotsRestantesHoje,
    plantoesRestantesHoje,
    concluidosHoje,
    diasSemana,
    diasSemanaPlantoes,
    diasRestantesNaSemana,
    titulo,
    subtitulo,
  } = useMemo(() => {
    const hoje = startOfDay(now);
    const fimHoje = endOfDay(now);

    const slotsHoje = expandirEventosParaSlots(events, hoje, fimHoje, now);
    const slotsRestantesHoje = slotsHoje.filter((s) => s.fim.getTime() > now.getTime());
    const plantoesHoje = expandirPlantoesParaSlots(plantoes, hoje, fimHoje, now);
    const plantoesRestantesHoje = plantoesHoje.filter((s) => s.fim.getTime() > now.getTime());
    const concluidosHoje = slotsHoje.length - slotsRestantesHoje.length;

    const diasSemana: { data: Date; slots: SlotDia[] }[] = [];
    const diasSemanaPlantoes: { data: Date; slots: SlotPlantao[] }[] = [];
    let diasRestantesNaSemana = 0;
    if (mode === 'week') {
      // Só de hoje até sábado — dias vão “sumindo” conforme a semana avança
      diasRestantesNaSemana = 7 - now.getDay();
      for (let i = 0; i < diasRestantesNaSemana; i++) {
        const d = new Date(hoje);
        d.setDate(d.getDate() + i);
        const di = startOfDay(d);
        const df = endOfDay(d);
        const slots = expandirEventosParaSlots(events, di, df, now);
        const slotsFuturos = d.getTime() === hoje.getTime()
          ? slots.filter((s) => s.fim.getTime() > now.getTime())
          : slots;
        diasSemana.push({ data: d, slots: slotsFuturos });
        const slotsP = expandirPlantoesParaSlots(plantoes, di, df, now);
        const slotsPFuturos = d.getTime() === hoje.getTime()
          ? slotsP.filter((s) => s.fim.getTime() > now.getTime())
          : slotsP;
        diasSemanaPlantoes.push({ data: d, slots: slotsPFuturos });
      }
    }

    const titulo = mode === 'day' ? 'Agenda do Dia' : 'Agenda da Semana';
    const totalRestantes = mode === 'day'
      ? slotsRestantesHoje.length + plantoesRestantesHoje.length
      : diasSemana.reduce((s, dd) => s + dd.slots.length, 0) + diasSemanaPlantoes.reduce((s, dd) => s + dd.slots.length, 0);
    const subtitulo = mode === 'day'
      ? `${concluidosHoje} concluídos · ${totalRestantes} restantes`
      : `${totalRestantes} compromissos pela frente`;

    return {
      slotsHoje,
      slotsRestantesHoje,
      plantoesRestantesHoje,
      concluidosHoje,
      diasSemana,
      diasSemanaPlantoes,
      diasRestantesNaSemana,
      titulo,
      subtitulo,
    };
  }, [events, plantoes, now, mode]);

  const acoesRestantes = slotsRestantesHoje.filter((s) => s.isAcaoVenda);
  const reunioesRestantes = slotsRestantesHoje.filter((s) => !s.isAcaoVenda);

  return (
    <div className="h-screen w-full flex flex-col bg-[#0c0f1a] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-[#0c0f1a] to-cyan-950/10 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

      <header className="relative shrink-0 flex items-center justify-between gap-4 py-5 px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/25">
            📋
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              {titulo}
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-0.5">{subtitulo}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl md:text-4xl font-mono font-black tabular-nums text-cyan-400">
            {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-sm text-slate-400">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
        </div>
      </header>

      <div className="relative flex-1 min-h-0 p-4 md:p-6 overflow-auto">
        {mode === 'day' && (
          <div className="h-full flex flex-col gap-6 max-w-5xl mx-auto">
            {/* Progresso do dia — gamificado */}
            {(() => {
              const totalRestantes = plantoesRestantesHoje.length + slotsRestantesHoje.length;
              const totalHoje = concluidosHoje + totalRestantes;
              const percent = totalHoje > 0 ? Math.round((concluidosHoje / totalHoje) * 100) : 0;
              return (
                <div className="shrink-0 flex items-center gap-6 p-5 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-violet-500/10 to-amber-500/15 border border-white/10">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                      <path className="text-white/10" stroke="currentColor" strokeWidth="2.5" fill="none" d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" />
                      <path className="text-cyan-400 transition-all duration-500" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${percent}, 100`} strokeLinecap="round" fill="none" d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-cyan-400">{percent}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold text-white">
                      {concluidosHoje > 0 && <span className="text-emerald-400">{concluidosHoje} concluído{concluidosHoje !== 1 ? 's' : ''}</span>}
                      {concluidosHoje > 0 && totalRestantes > 0 && <span className="text-slate-400"> · </span>}
                      {totalRestantes > 0 && <span>{totalRestantes} pela frente</span>}
                      {totalRestantes === 0 && concluidosHoje === 0 && <span className="text-slate-400">Nada agendado</span>}
                      {totalRestantes === 0 && concluidosHoje > 0 && <span className="text-emerald-400"> — dia fechado!</span>}
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {totalRestantes > 0 && totalRestantes <= 4 && 'Foco no que importa. Você dá conta!'}
                      {totalRestantes > 4 && 'Bora executar.'}
                      {totalRestantes === 0 && concluidosHoje === 0 && 'Agenda livre.'}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Lista unificada do dia — poucos itens, destaque visual */}
            {(() => {
              const itensPlantao = plantoesRestantesHoje.map((s) => ({ tipo: 'plantao' as const, id: s.id, slot: s }));
              const itensAcoes = acoesRestantes.map((s) => ({ tipo: 'acao' as const, id: s.id, slot: s }));
              const itensReunioes = reunioesRestantes.map((s) => ({ tipo: 'reuniao' as const, id: s.id, slot: s }));
              const todosItens = [...itensPlantao, ...itensAcoes, ...itensReunioes]
                .sort((a, b) => {
                  const tA = 'inicio' in a.slot ? (a.slot as SlotDia).inicio.getTime() : (a.slot as SlotPlantao).inicio.getTime();
                  const tB = 'inicio' in b.slot ? (b.slot as SlotDia).inicio.getTime() : (b.slot as SlotPlantao).inicio.getTime();
                  return tA - tB;
                });
              if (todosItens.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6">
                    <div className="text-7xl mb-6 animate-pulse">🎯</div>
                    <p className="text-2xl font-bold text-white">Tudo em dia!</p>
                    <p className="text-slate-400 mt-2 max-w-sm">Nada mais por agora. Aproveite o fôlego.</p>
                  </div>
                );
              }
              return (
                <section>
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                    {todosItens.length} compromisso{todosItens.length !== 1 ? 's' : ''} restante{todosItens.length !== 1 ? 's' : ''}
                  </h2>
                  <div className="space-y-4">
                    {todosItens.map((item, idx) => {
                      const isProximo = idx === 0;
                      if (item.tipo === 'plantao') {
                        const s = item.slot as SlotPlantao;
                        return (
                          <div
                            key={s.id}
                            className={`flex items-center gap-5 p-5 rounded-2xl border-2 transition-all ${isProximo ? 'border-orange-400/60 bg-gradient-to-r from-orange-500/25 to-amber-500/15 shadow-lg shadow-orange-500/10' : 'border-orange-400/20 bg-orange-500/10'}`}
                          >
                            <div className="relative">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-center text-2xl shrink-0 shadow-lg">🏢</div>
                              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              {isProximo && <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Próximo</span>}
                              <p className="font-bold text-white text-lg truncate">Plantão {s.construtora}</p>
                              <p className="text-sm text-orange-300">Responsável: {s.corretorResponsavel}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xl font-mono font-bold text-cyan-400">{s.horario?.slice(0, 5) || fmtHora(s.inicio)}</p>
                              <p className="text-xs text-slate-500">até {fmtHora(s.fim)}</p>
                            </div>
                          </div>
                        );
                      }
                      const s = item.slot as SlotDia;
                      const isAcao = s.isAcaoVenda;
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center gap-5 p-5 rounded-2xl border-2 transition-all ${isProximo ? 'border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 to-violet-500/10 shadow-lg shadow-cyan-500/10' : 'border-white/10 bg-white/5'}`}
                        >
                          <div className="relative">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${TIPO_COR[s.tipo] ?? TIPO_COR.outro} flex items-center justify-center text-2xl shrink-0 shadow-lg`}>
                              {TIPO_ICON[s.tipo] ?? TIPO_ICON.outro}
                            </div>
                            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {isProximo && <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Próximo</span>}
                            <p className="font-bold text-white text-lg truncate">{s.titulo}</p>
                            <p className="text-sm text-slate-400">{isAcao ? (TIPO_LABEL[s.tipo] ?? s.tipo) : (s.local || TIPO_LABEL[s.tipo])}</p>
                            {s.responsavel && <p className="text-xs text-slate-300 mt-0.5">Com: {s.responsavel}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xl font-mono font-bold text-cyan-400">{fmtHora(s.inicio)}</p>
                            <p className="text-xs text-slate-500">até {fmtHora(s.fim)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}
          </div>
        )}

        {mode === 'week' && (
          <div className="h-full overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
              {diasSemana.map(({ data, slots }, idx) => {
                const isHoje = data.toDateString() === now.toDateString();
                const totalDia = slots.length;
                const plantoesDia = diasSemanaPlantoes[idx]?.slots ?? [];
                return (
                  <div
                    key={data.getTime()}
                    className={`rounded-2xl border p-4 min-h-[180px] flex flex-col ${
                      isHoje ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-bold ${isHoje ? 'text-cyan-400' : 'text-slate-300'}`}>
                        {fmtDiaCurto(data)}
                      </span>
                      {isHoje && <span className="text-xs bg-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full">Hoje</span>}
                    </div>
                    {plantoesDia.length > 0 && (
                      <div className="mb-2 pb-2 border-b border-white/10">
                        <p className="text-xs font-semibold text-orange-400/90 uppercase tracking-wider mb-1">Plantões</p>
                        {plantoesDia.slice(0, 3).map((s) => (
                          <div key={s.id} className="text-sm text-slate-200">
                            <span className="font-mono text-cyan-400/90">{s.horario?.slice(0, 5)}</span>
                            {' '}{s.construtora} — <span className="text-orange-300 font-medium">{s.corretorResponsavel}</span>
                          </div>
                        ))}
                        {plantoesDia.length > 3 && <p className="text-xs text-slate-500">+{plantoesDia.length - 3} mais</p>}
                      </div>
                    )}
                    {totalDia === 0 && plantoesDia.length === 0 ? (
                      <p className="text-sm text-slate-500 flex-1">Sem compromissos</p>
                    ) : totalDia > 0 ? (
                      <ul className="space-y-2 flex-1">
                        {slots.slice(0, 5).map((s) => (
                          <li key={s.id} className="flex items-center gap-2 text-sm">
                            <span className="shrink-0">{TIPO_ICON[s.tipo] ?? '📅'}</span>
                            <span className="font-mono text-cyan-400/90 shrink-0">{fmtHora(s.inicio)}</span>
                            <span className="truncate text-slate-200">{s.titulo}</span>
                          </li>
                        ))}
                        {slots.length > 5 && (
                          <li className="text-xs text-slate-500">+{slots.length - 5} mais</li>
                        )}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
              {/* Slots vazios para completar 7 quadrados de dias */}
              {Array.from({ length: Math.max(0, 7 - diasSemana.length) }, (_, i) => (
                <div key={`vazio-${i}`} className="rounded-2xl border border-white/5 bg-white/[0.02] min-h-[180px]" aria-hidden />
              ))}
              {/* 8º quadrado: frase da semana (editável no admin) ou frase do dia */}
              <div
                key="frase-semana"
                className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-orange-600/10 p-4 min-h-[180px] flex flex-col items-center justify-center text-center"
              >
                <div className="text-4xl mb-2">💬</div>
                <p className="font-bold text-amber-300 text-lg leading-tight">
                  {fraseSemana?.trim() || FRASE_POR_DIA[now.getDay()] || 'Boa semana!'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
