'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { AgendaEventoTv, PlantaoTv, AgendaCorporativaItemTv, CorretorStatusTv } from './useAgendaTvData';
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
  agendaCorporativaItems?: AgendaCorporativaItemTv[];
  corretoresStatus?: CorretorStatusTv[];
  corretoresStatusLoading?: boolean;
}

export function AgendaTvSlide({
  events,
  plantoes = [],
  fraseSemana,
  mode,
  agendaCorporativaItems = [],
  corretoresStatus = [],
  corretoresStatusLoading = false,
}: AgendaTvSlideProps) {
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
      ? 'Agenda corporativa e status dos corretores'
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
        {mode === 'day' && (() => {
          const totalHoje = concluidosHoje + slotsRestantesHoje.length + plantoesRestantesHoje.length;
          const percent = totalHoje > 0 ? Math.round((concluidosHoje / totalHoje) * 100) : 0;
          return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30">
              <span className="text-2xl md:text-3xl font-black text-cyan-400 tabular-nums">{percent}%</span>
              <span className="text-sm text-slate-300 hidden sm:inline">do dia cumprido</span>
            </div>
          );
        })()}
        <div className="text-right">
          <div className="text-3xl md:text-4xl font-mono font-black tabular-nums text-cyan-400">
            {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-sm text-slate-400">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
        </div>
      </header>

      <div className="relative flex-1 min-h-0 p-3 md:p-4 flex flex-col overflow-hidden">
        {mode === 'day' && (
          <div className="h-full w-full flex flex-col gap-3 min-h-0 overflow-hidden">
            {/* Card 1: Agenda Corporativa — um card por evento, some após o horário */}
            <div className="flex-1 min-h-0 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-[#0c0f1a] to-violet-500/5 p-3 md:p-4 shadow-lg shadow-cyan-500/5 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-2 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-base shadow-md">
                  📅
                </div>
                <h2 className="text-base md:text-lg font-bold text-white">Agenda Corporativa</h2>
              </div>
              <p className="text-xs text-slate-400 mb-2 shrink-0">Eventos e plantões do dia — quem confirmou.</p>
              {(() => {
                const itensRestantes = agendaCorporativaItems.filter((item) => item.fimTime > now.getTime()).slice(0, 6);
                if (itensRestantes.length === 0) {
                  return <p className="text-slate-500 text-sm py-2">Nenhum evento pela frente ou dia encerrado.</p>;
                }
                return (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 flex-1 min-h-0 content-start overflow-auto">
                    {itensRestantes.map((item) => (
                      <div
                        key={`${item.tipo}-${item.id}`}
                        className="rounded-xl border border-cyan-400/20 bg-white/5 p-2.5 flex flex-col gap-1.5 hover:border-cyan-400/40 transition-colors shrink-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-sm shrink-0">
                            {item.tipo === 'plantao' ? '🏢' : (TIPO_ICON[item.tipoEvento ?? 'outro'] ?? '📅')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-semibold text-cyan-400">{item.tipoLabel}</span>
                            <p className="text-sm font-semibold text-white truncate">{item.titulo}</p>
                          </div>
                        </div>
                        <p className="text-xs font-mono text-cyan-400/90">{item.horarioStr}</p>
                        <div className="flex items-center gap-1.5 mt-auto">
                          {item.confirmados.length === 0 ? (
                            <span className="text-[10px] text-slate-500">Ninguém confirmado</span>
                          ) : (
                            <>
                              {item.confirmados.slice(0, 1).map((c, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  {c.photoURL ? (
                                    <img src={c.photoURL} alt="" className="w-5 h-5 rounded-full border border-[#0c0f1a] object-cover ring-1 ring-white/20" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-cyan-500/30 flex items-center justify-center text-[9px] font-bold text-cyan-300">
                                      {(c.nome || '?').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="text-[10px] text-white truncate">{c.nome}</span>
                                  {item.confirmados.length > 1 && <span className="text-[10px] text-slate-400">+{item.confirmados.length - 1}</span>}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Card 2: Corretores — fotinho bonita, quadrados, 1 página TV */}
            <div className="shrink-0 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#0c0f1a] to-amber-500/5 p-3 md:p-4 shadow-lg shadow-emerald-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-base shadow-md">
                  👥
                </div>
                <h2 className="text-base md:text-lg font-bold text-white">Corretores</h2>
              </div>
              <p className="text-xs text-slate-400 mb-2">Sem uso, tarefa atrasada ou tarefa do dia.</p>
              {corretoresStatusLoading ? (
                <div className="flex items-center gap-2 py-2 text-slate-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-400 border-t-transparent" />
                  <span className="text-xs">Carregando...</span>
                </div>
              ) : corretoresStatus.length === 0 ? (
                <p className="text-slate-500 text-xs py-2">Nenhum corretor vinculado.</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {corretoresStatus.map((c) => {
                    const isAtrasada = c.status === 'tarefa_atrasada';
                    const isTarefaDia = c.status === 'tarefa_dia';
                    const isDestaque = isAtrasada || isTarefaDia;
                    const label = isAtrasada ? 'Atrasada' : isTarefaDia ? 'Tarefa hoje' : 'Sem uso';
                    const cardBg = isAtrasada
                      ? 'bg-red-500/15 border-red-400/50'
                      : isTarefaDia
                        ? 'bg-emerald-500/15 border-emerald-400/50'
                        : 'bg-white/[0.04] border-white/10';
                    const dotColor = isAtrasada ? 'bg-red-400' : isTarefaDia ? 'bg-emerald-400' : 'bg-slate-500';
                    const textLabel = isAtrasada ? 'text-red-400' : isTarefaDia ? 'text-emerald-400' : 'text-slate-500';
                    return (
                      <div
                        key={c.id}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border ${cardBg} transition-colors`}
                        title={c.nome + ' — ' + label}
                      >
                        <div className="relative mb-1">
                          {c.photoURL ? (
                            <img
                              src={c.photoURL}
                              alt={c.nome}
                              className="w-10 h-10 rounded-full object-cover border-2 border-[#0c0f1a] ring-2 ring-white/20 shadow-md"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-full border-2 border-[#0c0f1a] flex items-center justify-center text-sm font-semibold shadow-inner ${
                                isDestaque ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/20 text-cyan-300' : 'bg-slate-600/40 text-slate-400'
                              }`}
                            >
                              {(c.nome || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ${dotColor} ring-2 ring-[#0c0f1a]`} />
                        </div>
                        <span className={`text-[10px] font-medium truncate w-full text-center ${isDestaque ? 'text-white' : 'text-slate-400'}`}>
                          {c.nome.split(' ')[0] || c.nome}
                        </span>
                        <span className={`text-[9px] ${textLabel}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
