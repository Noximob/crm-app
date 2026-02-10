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

export function AgendaTvSlide({ events, plantoes = [], fraseSemana, mode, agendaCorporativaItems = [], corretoresStatus = [], corretoresStatusLoading }: AgendaTvSlideProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const {
    slotsHoje,
    slotsRestantesHoje,
    plantoesHoje,
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
    const totalRestantesComPlantoes = slotsRestantesHoje.length + plantoesRestantesHoje.length;

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
      ? totalRestantesComPlantoes
      : diasSemana.reduce((s, dd) => s + dd.slots.length, 0) + diasSemanaPlantoes.reduce((s, dd) => s + dd.slots.length, 0);
    const subtitulo = mode === 'day'
      ? `${concluidosHoje} concluídos · ${totalRestantes} restantes`
      : `${totalRestantes} compromissos pela frente`;

    return {
      slotsHoje,
      slotsRestantesHoje,
      plantoesHoje,
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

      <header className="relative shrink-0 flex items-center justify-between gap-3 py-3 px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-lg shadow-amber-500/25">
            📋
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              {titulo}
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-0.5">{subtitulo}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl md:text-3xl font-mono font-black tabular-nums text-cyan-400">
            {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-xs md:text-sm text-slate-400">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
        </div>
      </header>

      <div className="relative flex-1 min-h-0 p-4 md:p-6 flex flex-col overflow-hidden">
        {mode === 'day' && (
          <div className="h-full w-full flex flex-col gap-4 min-h-0">
            {/* De plantão hoje — fixo na tela, não some com o tempo */}
            {plantoesHoje.length > 0 && (
              <section className="shrink-0 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-widest mr-2">De plantão hoje</span>
                {plantoesHoje.map((s) => (
                  <div
                    key={s.id}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-orange-500 bg-orange-600/40 text-white px-4 py-2 shadow-lg shadow-orange-500/20"
                  >
                    <span className="text-xl">🏢</span>
                    <span className="font-semibold text-sm">{s.construtora}</span>
                    <span className="text-orange-200 text-sm">—</span>
                    <span className="text-amber-100 text-sm font-medium">{s.corretorResponsavel}</span>
                    <span className="text-orange-200 text-xs font-mono">{s.horario?.slice(0, 5) ?? ''}</span>
                  </div>
                ))}
              </section>
            )}

            {/* Parte 1: Eventos do dia em quadrados — só agenda (sem plantão) */}
            <section className="shrink-0">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Eventos do dia</h2>
              {(() => {
                const nowTime = now.getTime();
                const hojeInicio = startOfDay(now).getTime();
                const hojeFim = endOfDay(now).getTime();
                const itensFuturos = agendaCorporativaItems.filter(
                  (i) => i.tipo !== 'plantao' && i.startTime >= hojeInicio && i.startTime <= hojeFim && i.fimTime > nowTime
                );
                if (itensFuturos.length === 0) {
                  return (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-400">
                      Nenhum evento restante hoje.
                    </div>
                  );
                }
                // Janela de atenção: eventos que começam em até 45 minutos
                const ATENCAO_MS = 45 * 60 * 1000;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {itensFuturos.map((item, idx) => {
                      const isAgora = item.startTime <= nowTime && item.fimTime >= nowTime;
                      const emBreve = item.startTime > nowTime && item.startTime - nowTime <= ATENCAO_MS;
                      const destaque = isAgora || emBreve;
                      const cardClass = destaque
                        ? isAgora
                          ? 'rounded-xl border-2 border-red-500 bg-red-600/30 shadow-xl shadow-red-500/40 ring-2 ring-red-500/70'
                          : 'rounded-xl border-2 border-amber-400 bg-amber-500/25 shadow-xl shadow-amber-500/40 ring-2 ring-amber-400/70'
                        : 'rounded-xl border-2 border-emerald-400 bg-emerald-500/20';
                      return (
                        <div
                          key={`${item.tipo}-${item.id}`}
                          className={`${cardClass} ${destaque ? 'animate-pulse' : ''} p-4 flex flex-col gap-2 min-h-[130px] md:min-h-[150px] relative`}
                          style={destaque ? { animationDelay: `${idx * 0.3}s` } : undefined}
                        >
                          {isAgora && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold uppercase animate-pulse">Agora</span>
                          )}
                          {emBreve && !isAgora && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-400 text-black text-[10px] font-bold uppercase">Em breve</span>
                          )}
                          <p className="font-bold text-white text-sm truncate pr-16" title={item.titulo}>{item.titulo}</p>
                          <p className={`text-xs ${destaque ? 'text-white/90' : 'text-emerald-200/90'}`}>{item.tipoLabel} · {item.horarioStr}</p>
                          {item.confirmados && item.confirmados.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {item.confirmados.slice(0, 5).map((c, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  {c.photoURL ? (
                                    <img src={c.photoURL} alt="" className="w-6 h-6 rounded-full object-cover border border-white/20" />
                                  ) : (
                                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">{c.nome?.charAt(0) ?? '?'}</span>
                                  )}
                                  <span className="text-[10px] text-slate-300 truncate max-w-[70px]">{(c.nome || '').split(' ')[0]}</span>
                                </div>
                              ))}
                              {item.confirmados.length > 5 && <span className="text-[10px] text-slate-500">+{item.confirmados.length - 5}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>

            {/* Parte 2: Cards dos corretores — ordem: atraso, tarefa dia, sem tarefa, +24h sem CRM */}
            <section className="flex-1 min-h-0 flex flex-col">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 shrink-0">Corretores</h2>
              {corretoresStatusLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">Carregando...</div>
              ) : (() => {
                const pesoStatus = (s: CorretorStatusTv['status']) => {
                  switch (s) {
                    case 'tarefa_atrasada':
                      return 0;
                    case 'tarefa_dia':
                      return 1;
                    case 'sem_tarefa':
                      return 2;
                    case 'sem_uso_24h':
                      return 3;
                    default:
                      return 4;
                  }
                };
                const ordenados = [...corretoresStatus]
                  .sort((a, b) => pesoStatus(a.status) - pesoStatus(b.status));
                if (ordenados.length === 0) {
                  return <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-slate-400 text-sm">Nenhum corretor com pendência.</div>;
                }
                return (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 flex-1 content-start overflow-auto min-h-0">
                    {ordenados.map((c) => {
                      const isAtrasado = c.status === 'tarefa_atrasada';
                      const isTarefaDia = c.status === 'tarefa_dia';
                      const isSemTarefa = c.status === 'sem_tarefa';
                      const isSemUso24h = c.status === 'sem_uso_24h';
                      const borderClass = isAtrasado
                        ? 'border-2 border-red-500/80 bg-red-500/10'
                        : isTarefaDia
                          ? 'border-2 border-amber-400/80 bg-amber-500/10'
                          : isSemTarefa
                            ? 'border-2 border-emerald-400/80 bg-emerald-500/10'
                            : 'border-2 border-slate-500/70 bg-slate-600/40 text-slate-300';
                      return (
                        <div
                          key={c.id}
                          className={`rounded-xl p-3 flex flex-col items-center gap-1.5 text-center min-w-0 ${borderClass}`}
                        >
                          {c.photoURL ? (
                            <img src={c.photoURL} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white/20 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold shrink-0">{c.nome?.charAt(0) ?? '?'}</div>
                          )}
                          <p className="text-xs font-medium truncate w-full" title={c.nome}>{c.nome}</p>
                          {isAtrasado && <span className="text-[10px] text-red-300 font-medium">Tarefa atrasada</span>}
                          {isTarefaDia && <span className="text-[10px] text-amber-300 font-medium">Tarefa do dia</span>}
                          {isSemTarefa && <span className="text-[10px] text-emerald-200 font-medium">Sem tarefa</span>}
                          {isSemUso24h && <span className="text-[10px] text-slate-400 font-medium">+24h sem usar CRM</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>
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
