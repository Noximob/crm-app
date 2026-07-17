'use client';

/**
 * Circuito do lead — o card que CONDUZ o atendimento.
 *
 * Lê a etapa + tarefas pendentes e mostra a pergunta/ação do momento; cada
 * resposta vira UMA ação composta (tarefa + etapa + interação) executada pelo
 * pai via `executar` (batch atômico). Qualificação e anotações moram fora
 * (coluna direita), então o caminho aqui é só o atendimento.
 */
import React, { useMemo, useState } from 'react';
import {
  ETAPA_ENTRADA, ETAPA_FOLLOWUP, ETAPA_MEET, ETAPA_VISITA, ETAPA_NEGOCIACAO,
  ETAPA_BOLSAO, ETAPA_FECHADO, ETAPA_DESCARTADO, ETAPAS_CIRCUITO,
  TIPO_TAREFA_MEET, TIPO_TAREFA_VISITA, TIPO_TAREFA_FOLLOWUP, TIPO_TAREFA_PRODUTO,
  TIPOS_CONTATO, CORES_CIRCUITO, MOTIVOS_DESCARTE,
  type CadenciasFunil, sugestaoDaqui, sugestaoAmanha,
} from '@/lib/circuito';
import { toJsDate } from '@/lib/leadTasks';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export interface TaskLike {
  id: string;
  description: string;
  type: string;
  dueDate: any;
}

/** Ação composta que o pai executa num único batch. */
export interface AcaoCircuito {
  novaEtapa?: string;
  concluirTaskId?: string;
  cancelarTaskId?: string;
  cancelarTodasPendentes?: boolean;
  novaTarefa?: { description: string; type: string; dueDate: Date };
  interacao: { type: string; notes: string };
  circuitoTentativas?: 'inc' | 'zero';
  descartadoMotivo?: string;
}

interface CircuitoCardProps {
  etapa: string; // já normalizada
  nomeCliente: string;
  telefone: string;
  tasks: TaskLike[];
  cadencias: CadenciasFunil;
  tentativas: number;
  desde: any; // Timestamp da última mudança de etapa (lead.circuito.desde)
  descartadoMotivo?: string;
  readOnly: boolean;
  executando: boolean;
  executar: (acao: AcaoCircuito) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers visuais
// ---------------------------------------------------------------------------
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const p2 = (n: number) => String(n).padStart(2, '0');
export const fmtDataHora = (d: Date) =>
  `${DIAS_SEMANA[d.getDay()]} ${p2(d.getDate())}/${p2(d.getMonth() + 1)} · ${p2(d.getHours())}:${p2(d.getMinutes())}`;

const toDateStr = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const toTimeStr = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;

const BTN = {
  primary: 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]',
  ghost: 'bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-white',
  win: 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20',
  gold: 'bg-[#E8C547]/10 border border-[#E8C547]/40 text-[#FFE9A6] hover:bg-[#E8C547]/20',
  danger: 'bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20',
  sky: 'bg-[#7DD3FC]/10 border border-[#7DD3FC]/40 text-[#7DD3FC] hover:bg-[#7DD3FC]/20',
  violet: 'bg-[#9F6BFF]/10 border border-[#9F6BFF]/40 text-[#C4A6FF] hover:bg-[#9F6BFF]/20',
} as const;

function Botao({ estilo, onClick, disabled, children, className = '' }: {
  estilo: keyof typeof BTN; onClick: () => void; disabled?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${BTN[estilo]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Opção grande dos painéis (emoji + título + subtítulo). */
function Opcao({ emoji, titulo, sub, onClick, disabled, tom = 'ghost' }: {
  emoji: string; titulo: string; sub?: string; onClick: () => void; disabled?: boolean; tom?: keyof typeof BTN;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left rounded-xl px-3.5 py-3 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${BTN[tom]}`}
    >
      <span className="flex items-center gap-3">
        <span className="text-xl leading-none">{emoji}</span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold leading-tight">{titulo}</span>
          {sub && <span className="block text-[11px] opacity-70 leading-tight mt-0.5">{sub}</span>}
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Agendador de data + hora (com sugestões rápidas)
// ---------------------------------------------------------------------------
function Agendador({ sugestao, confirmLabel, onConfirm, executando, cadHoras }: {
  sugestao: Date; confirmLabel: string; onConfirm: (d: Date) => void; executando: boolean; cadHoras: number;
}) {
  const [dataStr, setDataStr] = useState(toDateStr(sugestao));
  const [horaStr, setHoraStr] = useState(toTimeStr(sugestao));

  const chips: { label: string; d: Date }[] = useMemo(() => {
    const hoje18 = new Date(); hoje18.setHours(18, 0, 0, 0);
    const lista = [
      ...(hoje18.getTime() > Date.now() ? [{ label: 'Hoje 18:00', d: hoje18 }] : []),
      { label: 'Amanhã 09:00', d: sugestaoAmanha(9) },
      { label: 'Amanhã 14:00', d: sugestaoAmanha(14) },
      { label: `Em ${cadHoras}h`, d: sugestaoDaqui(cadHoras) },
    ];
    return lista;
  }, [cadHoras]);

  const valido = dataStr !== '' && horaStr !== '';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {chips.map(c => {
          const ativo = toDateStr(c.d) === dataStr && toTimeStr(c.d) === horaStr;
          return (
            <button
              key={c.label}
              onClick={() => { setDataStr(toDateStr(c.d)); setHoraStr(toTimeStr(c.d)); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                ativo
                  ? 'bg-[#FF1E56]/15 border-[#FF1E56]/60 text-[#FF9EB5]'
                  : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08]'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={dataStr}
          onChange={e => setDataStr(e.target.value)}
          className="px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50"
        />
        <input
          type="time"
          value={horaStr}
          onChange={e => setHoraStr(e.target.value)}
          className="px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50"
        />
      </div>
      <Botao
        estilo="primary"
        disabled={!valido || executando}
        onClick={() => valido && onConfirm(new Date(`${dataStr}T${horaStr}`))}
        className="w-full"
      >
        {executando ? 'Registrando…' : confirmLabel}
      </Botao>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trilho de etapas
// ---------------------------------------------------------------------------
function Trilho({ etapa }: { etapa: string }) {
  const ativas = ETAPAS_CIRCUITO.slice(0, 5) as unknown as string[];
  const idx = ativas.indexOf(etapa);
  const especial =
    etapa === ETAPA_BOLSAO ? { txt: '🧊 Bolsão', cls: 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]' } :
    etapa === ETAPA_FECHADO ? { txt: '🏆 Fechado', cls: 'bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6]' } :
    etapa === ETAPA_DESCARTADO ? { txt: 'Descartado', cls: 'bg-white/[0.05] border-white/15 text-text-secondary' } :
    null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ativas.map((e, i) => {
        const cor = CORES_CIRCUITO[i];
        const atual = i === idx;
        const passou = idx >= 0 && i < idx;
        return (
          <React.Fragment key={e}>
            {i > 0 && <span className={`h-px w-2.5 sm:w-4 ${passou || atual ? 'bg-white/40' : 'bg-white/10'}`} />}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9.5px] font-extrabold uppercase tracking-wider transition-all ${
                atual ? 'scale-105' : ''
              }`}
              style={{
                borderColor: atual ? cor : 'rgba(255,255,255,0.1)',
                background: atual ? `${cor}1f` : passou ? `${cor}10` : 'rgba(255,255,255,0.03)',
                color: atual || passou ? cor : 'rgba(255,255,255,0.35)',
                boxShadow: atual ? `0 0 14px -2px ${cor}80` : 'none',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: atual || passou ? cor : 'rgba(255,255,255,0.2)' }} />
              {e}
            </span>
          </React.Fragment>
        );
      })}
      {especial && (
        <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full border text-[9.5px] font-extrabold uppercase tracking-wider ${especial.cls}`}>
          {especial.txt}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card principal
// ---------------------------------------------------------------------------
type Modo =
  | { t: 'raiz' }
  | { t: 'oque-rolou'; concluirTaskId?: string }
  | { t: 'nao-atendeu'; concluirTaskId?: string }
  | { t: 'pos-evento'; evento: 'Meet' | 'Visita'; concluirTaskId?: string }
  | { t: 'nao-rolou'; evento: 'Meet' | 'Visita'; cancelarTaskId?: string }
  | {
      t: 'agendar';
      titulo: string;
      tipoTarefa: string;
      etapaDestino: string;
      descricaoTarefa: string;
      interTipo: string;
      interPrefix: string;
      confirmLabel: string;
      sugestao: Date;
      concluirTaskId?: string;
      cancelarTaskId?: string;
      zerarTentativas?: boolean;
      notaExtra?: string;
    }
  | { t: 'descartar'; concluirTaskId?: string };

export default function CircuitoCard(props: CircuitoCardProps) {
  const { etapa, nomeCliente, telefone, tasks, cadencias, tentativas, desde, descartadoMotivo, readOnly, executando, executar } = props;
  const [modo, setModo] = useState<Modo>({ t: 'raiz' });
  const [motivoSel, setMotivoSel] = useState<string>('');
  const [motivoObs, setMotivoObs] = useState('');
  // Relógio de 30s: perguntas como "o meet aconteceu?" aparecem sem precisar recarregar
  const [tick, setTick] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const primeiroNome = (nomeCliente || 'o cliente').split(' ')[0];
  const digits = (telefone || '').replace(/\D/g, '');

  // Tarefas relevantes por tipo (a mais próxima primeiro)
  const porData = (a: TaskLike, b: TaskLike) => (toJsDate(a.dueDate)?.getTime() ?? 0) - (toJsDate(b.dueDate)?.getTime() ?? 0);
  const taskMeet = useMemo(() => tasks.filter(t => t.type === TIPO_TAREFA_MEET).sort(porData)[0], [tasks]);
  const taskVisita = useMemo(() => tasks.filter(t => t.type === TIPO_TAREFA_VISITA).sort(porData)[0], [tasks]);
  const taskContato = useMemo(
    () => tasks.filter(t => (TIPOS_CONTATO as unknown as string[]).includes(t.type)).sort(porData)[0],
    [tasks]
  );

  const agora = Date.now() + tick * 0; // tick só força re-render periódico
  const executa = async (acao: AcaoCircuito) => {
    await executar(acao);
    setModo({ t: 'raiz' });
    setMotivoSel('');
    setMotivoObs('');
  };

  // ------------------------------------------------------------------
  // Construtores de modo "agendar" (evita repetir os campos toda hora)
  // ------------------------------------------------------------------
  const agendarMeet = (ctx: { concluirTaskId?: string; cancelarTaskId?: string; remarcando?: boolean }): Modo => ({
    t: 'agendar',
    titulo: ctx.remarcando ? 'Remarcar o meet' : 'Quando vai ser o meet?',
    tipoTarefa: TIPO_TAREFA_MEET,
    etapaDestino: ETAPA_MEET,
    descricaoTarefa: `Meet com ${nomeCliente}`,
    interTipo: 'Meet',
    interPrefix: ctx.remarcando ? '📅 Meet remarcado para' : '📅 Meet marcado para',
    confirmLabel: 'Confirmar meet',
    sugestao: sugestaoAmanha(10),
    zerarTentativas: true,
    ...ctx,
  });

  const agendarVisita = (ctx: { concluirTaskId?: string; cancelarTaskId?: string; remarcando?: boolean; nota?: string }): Modo => ({
    t: 'agendar',
    titulo: ctx.remarcando ? 'Remarcar a visita' : 'Quando vai ser a visita?',
    tipoTarefa: TIPO_TAREFA_VISITA,
    etapaDestino: ETAPA_VISITA,
    descricaoTarefa: `Visita com ${nomeCliente}`,
    interTipo: 'Visita',
    interPrefix: ctx.remarcando ? '🏠 Visita remarcada para' : '🏠 Visita marcada para',
    confirmLabel: 'Confirmar visita',
    sugestao: sugestaoAmanha(10),
    zerarTentativas: true,
    notaExtra: ctx.nota,
    concluirTaskId: ctx.concluirTaskId,
    cancelarTaskId: ctx.cancelarTaskId,
  });

  const agendarFollow = (ctx: { concluirTaskId?: string; cancelarTaskId?: string; titulo?: string; nota?: string; zerar?: boolean }): Modo => ({
    t: 'agendar',
    titulo: ctx.titulo ?? 'Quando é o próximo contato?',
    tipoTarefa: TIPO_TAREFA_FOLLOWUP,
    etapaDestino: ETAPA_FOLLOWUP,
    descricaoTarefa: `Contato com ${nomeCliente}`,
    interTipo: 'Follow-up',
    interPrefix: '⏰ Próximo contato combinado para',
    confirmLabel: 'Confirmar contato',
    sugestao: sugestaoDaqui(cadencias.naoAtendeuHoras),
    zerarTentativas: ctx.zerar ?? true,
    notaExtra: ctx.nota,
    concluirTaskId: ctx.concluirTaskId,
    cancelarTaskId: ctx.cancelarTaskId,
  });

  const agendarProduto = (ctx: { concluirTaskId?: string }): Modo => ({
    t: 'agendar',
    titulo: 'Quando você vai procurar o produto?',
    tipoTarefa: TIPO_TAREFA_PRODUTO,
    etapaDestino: ETAPA_FOLLOWUP,
    descricaoTarefa: `Procurar produto para ${nomeCliente}`,
    interTipo: 'Produto',
    interPrefix: '🔎 Vai procurar produto — tarefa para',
    confirmLabel: 'Agendar busca',
    sugestao: sugestaoDaqui(2),
    zerarTentativas: true,
    concluirTaskId: ctx.concluirTaskId,
  });

  // ------------------------------------------------------------------
  // Painéis compartilhados
  // ------------------------------------------------------------------
  const Voltar = () => (
    <button onClick={() => setModo({ t: 'raiz' })} className="text-[11px] font-bold text-text-secondary hover:text-white transition-colors">
      ← voltar
    </button>
  );

  const painelOqueRolou = (m: { concluirTaskId?: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="al-display text-[15px] font-bold text-white uppercase tracking-wide">Falou! 🎙 O que rolou?</p>
        <Voltar />
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <Opcao emoji="📅" titulo="Marcamos um meet" sub="reunião com o cliente" tom="violet" onClick={() => setModo(agendarMeet({ concluirTaskId: m.concluirTaskId }))} />
        <Opcao emoji="🏠" titulo="Marcamos uma visita" sub="ver imóvel ao vivo" tom="gold" onClick={() => setModo(agendarVisita({ concluirTaskId: m.concluirTaskId }))} />
        <Opcao emoji="🤝" titulo="Já quer negociar" sub="pula direto pra proposta" tom="win" disabled={executando} onClick={() =>
          executa({
            novaEtapa: ETAPA_NEGOCIACAO,
            concluirTaskId: m.concluirTaskId,
            circuitoTentativas: 'zero',
            interacao: { type: 'Etapa', notes: '🤝 Cliente pronto — direto pra negociação' },
          })
        } />
        <Opcao emoji="🔎" titulo="Vou procurar produto" sub="agenda a busca pra você" tom="sky" onClick={() => setModo(agendarProduto({ concluirTaskId: m.concluirTaskId }))} />
        <Opcao emoji="⏰" titulo="Combinamos outro contato" sub="follow-up com data e hora" onClick={() => setModo(agendarFollow({ concluirTaskId: m.concluirTaskId }))} />
        <Opcao emoji="🗑" titulo="Descartar" sub="não é comprador" tom="danger" onClick={() => setModo({ t: 'descartar', concluirTaskId: m.concluirTaskId })} />
      </div>
    </div>
  );

  const painelNaoAtendeu = (m: { concluirTaskId?: string }) => {
    const n = tentativas + 1;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="al-display text-[15px] font-bold text-white uppercase tracking-wide">📵 Não atendeu — bola pra frente</p>
          <Voltar />
        </div>
        <p className="text-xs text-text-secondary">Deixa o próximo contato já marcado ({n}ª tentativa):</p>
        <Agendador
          sugestao={sugestaoDaqui(cadencias.naoAtendeuHoras)}
          confirmLabel="Confirmar próximo contato"
          executando={executando}
          cadHoras={cadencias.naoAtendeuHoras}
          onConfirm={(d) =>
            executa({
              novaEtapa: ETAPA_FOLLOWUP,
              concluirTaskId: m.concluirTaskId,
              novaTarefa: { description: `Tentar contato com ${nomeCliente}`, type: TIPO_TAREFA_FOLLOWUP, dueDate: d },
              circuitoTentativas: 'inc',
              interacao: { type: 'Ligação', notes: `📵 Não atendeu (tentativa ${n}) · novo contato ${fmtDataHora(d)}` },
            })
          }
        />
        {n >= cadencias.tentativasAteDescarte && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <p className="text-xs text-amber-200 font-medium">Já {n >= cadencias.tentativasAteDescarte + 1 ? 'são' : 'vão ser'} {n} tentativas sem resposta. Vale insistir?</p>
            <div className="flex gap-2">
              <Botao estilo="danger" onClick={() => setModo({ t: 'descartar', concluirTaskId: m.concluirTaskId })} className="flex-1">🗑 Descartar</Botao>
              <Botao estilo="sky" disabled={executando} className="flex-1" onClick={() =>
                executa({
                  novaEtapa: ETAPA_BOLSAO,
                  concluirTaskId: m.concluirTaskId,
                  interacao: { type: 'Etapa', notes: `🧊 Mandado pro bolsão após ${tentativas} tentativas sem resposta` },
                })
              }>🧊 Bolsão</Botao>
            </div>
          </div>
        )}
      </div>
    );
  };

  const painelPosEvento = (m: { evento: 'Meet' | 'Visita'; concluirTaskId?: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="al-display text-[15px] font-bold text-white uppercase tracking-wide">
          {m.evento === 'Meet' ? '🎉 Meet aconteceu!' : '🎉 Visita feita!'} <span className="text-[#FFE9A6]">+1 no placar</span>
        </p>
        <Voltar />
      </div>
      <p className="text-xs text-text-secondary">Qual o próximo passo com {primeiroNome}?</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {m.evento === 'Meet' ? (
          <Opcao emoji="🏠" titulo="Marcamos visita" sub="cliente topou conhecer" tom="gold" onClick={() =>
            setModo(agendarVisita({ concluirTaskId: m.concluirTaskId, nota: '🎉 Meet aconteceu' }))
          } />
        ) : (
          <Opcao emoji="🏠" titulo="Nova visita" sub="ver outro imóvel" tom="gold" onClick={() =>
            setModo(agendarVisita({ concluirTaskId: m.concluirTaskId, nota: '🎉 Visita feita' }))
          } />
        )}
        <Opcao emoji="🤝" titulo={m.evento === 'Visita' ? 'Gostou! Negociação' : 'Partiu negociação'} sub="proposta na mesa" tom="win" disabled={executando} onClick={() =>
          executa({
            novaEtapa: ETAPA_NEGOCIACAO,
            concluirTaskId: m.concluirTaskId,
            circuitoTentativas: 'zero',
            interacao: { type: m.evento, notes: `🎉 ${m.evento} aconteceu · cliente em negociação` },
          })
        } />
        <Opcao emoji="⏰" titulo="Segue no follow-up" sub="ainda amadurecendo" onClick={() =>
          setModo(agendarFollow({ concluirTaskId: m.concluirTaskId, nota: `🎉 ${m.evento} aconteceu`, titulo: 'Quando é o próximo contato?' }))
        } />
        <Opcao emoji="🗑" titulo="Descartar" sub="não evoluiu" tom="danger" onClick={() => setModo({ t: 'descartar', concluirTaskId: m.concluirTaskId })} />
      </div>
    </div>
  );

  const painelNaoRolou = (m: { evento: 'Meet' | 'Visita'; cancelarTaskId?: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="al-display text-[15px] font-bold text-white uppercase tracking-wide">😕 {m.evento} não rolou</p>
        <Voltar />
      </div>
      <p className="text-xs text-text-secondary">Sem deixar o lead solto: remarca ou devolve pro follow-up.</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <Opcao emoji="📅" titulo={`Remarcar ${m.evento.toLowerCase()}`} sub="nova data e hora" tom={m.evento === 'Meet' ? 'violet' : 'gold'} onClick={() =>
          setModo(m.evento === 'Meet'
            ? agendarMeet({ cancelarTaskId: m.cancelarTaskId, remarcando: true })
            : agendarVisita({ cancelarTaskId: m.cancelarTaskId, remarcando: true }))
        } />
        <Opcao emoji="⏰" titulo="Voltar pro follow-up" sub="combinar novo contato" onClick={() =>
          setModo(agendarFollow({ cancelarTaskId: m.cancelarTaskId, nota: `${m.evento} não aconteceu`, zerar: false }))
        } />
        <Opcao emoji="🗑" titulo="Descartar" sub="cliente sumiu / desistiu" tom="danger" onClick={() => setModo({ t: 'descartar' })} />
      </div>
    </div>
  );

  const painelAgendar = (m: Extract<Modo, { t: 'agendar' }>) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="al-display text-[15px] font-bold text-white uppercase tracking-wide">{m.titulo}</p>
        <Voltar />
      </div>
      <Agendador
        sugestao={m.sugestao}
        confirmLabel={m.confirmLabel}
        executando={executando}
        cadHoras={cadencias.naoAtendeuHoras}
        onConfirm={(d) =>
          executa({
            novaEtapa: m.etapaDestino,
            concluirTaskId: m.concluirTaskId,
            cancelarTaskId: m.cancelarTaskId,
            novaTarefa: { description: m.descricaoTarefa, type: m.tipoTarefa, dueDate: d },
            circuitoTentativas: m.zerarTentativas ? 'zero' : undefined,
            interacao: {
              type: m.interTipo,
              notes: `${m.notaExtra ? `${m.notaExtra} · ` : ''}${m.interPrefix} ${fmtDataHora(d)}`,
            },
          })
        }
      />
    </div>
  );

  const painelDescartar = (m: { concluirTaskId?: string }) => {
    const motivoFinal = motivoSel === 'Outro' ? motivoObs.trim() : motivoSel;
    const valido = motivoSel !== '' && (motivoSel !== 'Outro' || motivoObs.trim() !== '');
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="al-display text-[15px] font-bold text-white uppercase tracking-wide">🗑 Descartar {primeiroNome}</p>
          <Voltar />
        </div>
        <p className="text-xs text-text-secondary">Por quê? (fica registrado no histórico)</p>
        <div className="flex flex-wrap gap-1.5">
          {MOTIVOS_DESCARTE.map(mo => (
            <button
              key={mo}
              onClick={() => setMotivoSel(mo)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                motivoSel === mo
                  ? 'bg-red-500/15 border-red-500/60 text-red-200'
                  : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08]'
              }`}
            >
              {mo}
            </button>
          ))}
        </div>
        {motivoSel === 'Outro' && (
          <input
            value={motivoObs}
            onChange={e => setMotivoObs(e.target.value)}
            placeholder="Qual o motivo?"
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50"
          />
        )}
        <Botao
          estilo="danger"
          disabled={!valido || executando}
          className="w-full"
          onClick={() =>
            executa({
              novaEtapa: ETAPA_DESCARTADO,
              concluirTaskId: m.concluirTaskId,
              cancelarTodasPendentes: true,
              descartadoMotivo: motivoFinal,
              interacao: { type: 'Descarte', notes: `🗑 Descartado — ${motivoFinal}` },
            })
          }
        >
          {executando ? 'Registrando…' : 'Confirmar descarte'}
        </Botao>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // Raiz por etapa
  // ------------------------------------------------------------------
  const linksContato = (
    <div className="flex gap-2">
      <a href={`tel:${digits}`} className={`flex-1 text-center rounded-xl px-3 py-2 text-[12px] font-bold ${BTN.sky}`}>📞 Ligar</a>
      <a href={`https://wa.me/55${digits}`} target="_blank" rel="noopener noreferrer" className={`flex-1 text-center rounded-xl px-3 py-2 text-[12px] font-bold ${BTN.win}`}>💬 WhatsApp</a>
    </div>
  );

  const stripTentativas = tentativas > 0 && etapa !== ETAPA_DESCARTADO && etapa !== ETAPA_FECHADO && (
    <p className="text-[11px] text-amber-200/80">📵 {tentativas} tentativa{tentativas > 1 ? 's' : ''} sem resposta até agora</p>
  );

  const raizContato = (opts: { titulo: string; sub: string; concluirTaskId?: string; destaque?: boolean }) => (
    <div className="space-y-3">
      <div>
        <p className={`al-display text-[17px] font-bold uppercase tracking-wide ${opts.destaque ? 'text-[#FF9EB5]' : 'text-white'}`}>{opts.titulo}</p>
        <p className="text-xs text-text-secondary mt-0.5">{opts.sub}</p>
      </div>
      {stripTentativas}
      {linksContato}
      <div className="grid grid-cols-2 gap-2">
        <Botao estilo="win" onClick={() => setModo({ t: 'oque-rolou', concluirTaskId: opts.concluirTaskId })}>✅ Consegui falar</Botao>
        <Botao estilo="ghost" onClick={() => setModo({ t: 'nao-atendeu', concluirTaskId: opts.concluirTaskId })}>📵 Não atendeu</Botao>
      </div>
    </div>
  );

  const raizEvento = (evento: 'Meet' | 'Visita', task: TaskLike | undefined) => {
    const due = task ? toJsDate(task.dueDate) : null;
    const horas = evento === 'Meet' ? cadencias.perguntarMeetHoras : cadencias.perguntarVisitaHoras;
    const passou = due ? agora >= due.getTime() + horas * 3600_000 : false;
    const emoji = evento === 'Meet' ? '📅' : '🏠';

    if (!task || !due) {
      // Estado inconsistente: etapa Meet/Visita sem tarefa marcada → repara na hora
      return (
        <div className="space-y-3">
          <p className="al-display text-[15px] font-bold text-amber-200 uppercase tracking-wide">{emoji} {evento} sem data marcada</p>
          <p className="text-xs text-text-secondary">Marca agora pra não perder o combinado:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <Opcao emoji={emoji} titulo={`Marcar ${evento.toLowerCase()}`} sub="data e hora" tom={evento === 'Meet' ? 'violet' : 'gold'} onClick={() =>
              setModo(evento === 'Meet' ? agendarMeet({}) : agendarVisita({}))
            } />
            <Opcao emoji="⏰" titulo="Voltar pro follow-up" sub="combinar contato" onClick={() => setModo(agendarFollow({ zerar: false }))} />
          </div>
        </div>
      );
    }

    if (passou) {
      return (
        <div className="space-y-3">
          <div>
            <p className="al-display text-[17px] font-bold text-[#FF9EB5] uppercase tracking-wide">E aí, o {evento.toLowerCase()} aconteceu?</p>
            <p className="text-xs text-text-secondary mt-0.5">Estava marcado para {fmtDataHora(due)}.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Botao estilo="win" onClick={() => setModo({ t: 'pos-evento', evento, concluirTaskId: task.id })}>🎉 Aconteceu!</Botao>
            <Botao estilo="ghost" onClick={() => setModo({ t: 'nao-rolou', evento, cancelarTaskId: task.id })}>😕 Não rolou</Botao>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div>
          <p className="al-display text-[15px] font-bold text-white uppercase tracking-wide">{emoji} {evento} marcado</p>
          <p className="text-[15px] font-bold text-[#FFE9A6] tabular-nums mt-1">{fmtDataHora(due)}</p>
        </div>
        {linksContato}
        <div className="grid grid-cols-3 gap-2">
          <Botao estilo="win" onClick={() => setModo({ t: 'pos-evento', evento, concluirTaskId: task.id })}>🎉 Aconteceu</Botao>
          <Botao estilo="ghost" onClick={() => setModo(evento === 'Meet' ? agendarMeet({ cancelarTaskId: task.id, remarcando: true }) : agendarVisita({ cancelarTaskId: task.id, remarcando: true }))}>🕐 Remarcar</Botao>
          <Botao estilo="ghost" onClick={() => setModo({ t: 'nao-rolou', evento, cancelarTaskId: task.id })}>❌ Desmarcou</Botao>
        </div>
      </div>
    );
  };

  const raiz = () => {
    switch (etapa) {
      case ETAPA_ENTRADA:
        return raizContato({
          titulo: `Lead novo — liga agora! 🔥`,
          sub: 'Quanto mais rápido o primeiro contato, maior a conversão.',
          destaque: true,
        });

      case ETAPA_FOLLOWUP: {
        const due = taskContato ? toJsDate(taskContato.dueDate) : null;
        if (taskContato && due && agora < due.getTime()) {
          return (
            <div className="space-y-3">
              <div>
                <p className="al-display text-[15px] font-bold text-white uppercase tracking-wide">⏰ Próximo contato combinado</p>
                <p className="text-[15px] font-bold text-[#FFE9A6] tabular-nums mt-1">{fmtDataHora(due)}</p>
                {taskContato.description && <p className="text-xs text-text-secondary mt-0.5">{taskContato.description}</p>}
              </div>
              {stripTentativas}
              {linksContato}
              <div className="grid grid-cols-3 gap-2">
                <Botao estilo="win" onClick={() => setModo({ t: 'oque-rolou', concluirTaskId: taskContato.id })}>✅ Já falei</Botao>
                <Botao estilo="ghost" onClick={() => setModo({ t: 'nao-atendeu', concluirTaskId: taskContato.id })}>📵 Não atendeu</Botao>
                <Botao estilo="ghost" onClick={() => setModo(agendarFollow({ cancelarTaskId: taskContato.id, titulo: 'Remarcar o contato', zerar: false }))}>🕐 Remarcar</Botao>
              </div>
            </div>
          );
        }
        if (taskContato && due) {
          return raizContato({
            titulo: `Hora do contato com ${primeiroNome}!`,
            sub: `Combinado para ${fmtDataHora(due)} — bora.`,
            concluirTaskId: taskContato.id,
            destaque: true,
          });
        }
        return (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <p className="text-xs text-amber-200 font-medium">⚠️ Sem próximo contato combinado — lead solto no follow-up.</p>
            </div>
            {raizContato({ titulo: 'Retomar o contato', sub: 'Fala com o cliente ou já deixa a próxima ação marcada.' })}
            <Botao estilo="ghost" className="w-full" onClick={() => setModo(agendarFollow({ titulo: 'Agendar o próximo contato', zerar: false }))}>🕐 Só agendar o contato</Botao>
          </div>
        );
      }

      case ETAPA_MEET:
        return raizEvento('Meet', taskMeet);

      case ETAPA_VISITA:
        return raizEvento('Visita', taskVisita);

      case ETAPA_NEGOCIACAO: {
        const d = toJsDate(desde);
        const dias = d ? Math.floor((agora - d.getTime()) / 86_400_000) : null;
        const alerta = dias !== null && dias >= cadencias.negociacaoAlertaDias;
        return (
          <div className="space-y-3">
            <div>
              <p className="al-display text-[17px] font-bold text-white uppercase tracking-wide">🤝 Em negociação{dias !== null ? ` há ${dias === 0 ? 'menos de 1 dia' : `${dias} dia${dias > 1 ? 's' : ''}`}` : ''}</p>
              <p className="text-xs text-text-secondary mt-0.5">Proposta na mesa — mantém o cliente aquecido.</p>
            </div>
            {alerta && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <p className="text-xs text-amber-200 font-medium">🔥 Já faz {dias} dias — dá um gás! Liga e destrava essa venda.</p>
              </div>
            )}
            {linksContato}
            <div className="grid grid-cols-1 gap-2">
              <Botao estilo="gold" disabled={executando} className="text-[15px] py-3" onClick={() =>
                executa({
                  novaEtapa: ETAPA_FECHADO,
                  cancelarTodasPendentes: true,
                  circuitoTentativas: 'zero',
                  interacao: { type: 'Venda', notes: '🏆 VENDA FECHADA!' },
                })
              }>🏆 FECHOU!</Botao>
              <div className="grid grid-cols-2 gap-2">
                <Botao estilo="ghost" onClick={() => setModo(agendarFollow({ titulo: 'Combinar próximo contato', zerar: false }))}>⏰ Follow-up</Botao>
                <Botao estilo="danger" onClick={() => setModo({ t: 'descartar' })}>🗑 Descartar</Botao>
              </div>
            </div>
          </div>
        );
      }

      case ETAPA_BOLSAO: {
        const d = toJsDate(desde);
        return (
          <div className="space-y-3">
            <div>
              <p className="al-display text-[15px] font-bold text-[#7DD3FC] uppercase tracking-wide">🧊 No bolsão{d ? ` desde ${p2(d.getDate())}/${p2(d.getMonth() + 1)}` : ''}</p>
              <p className="text-xs text-text-secondary mt-0.5">Estacionado de propósito — sem cobrança de próxima ação.</p>
            </div>
            <Botao estilo="sky" className="w-full" onClick={() => setModo(agendarFollow({ titulo: 'Reativar: quando é o contato?', nota: '🔄 Reativado do bolsão' }))}>🔄 Reativar lead</Botao>
          </div>
        );
      }

      case ETAPA_FECHADO:
        return (
          <div className="space-y-3">
            <div className="rounded-xl border border-[#E8C547]/40 bg-[#E8C547]/10 px-4 py-4 text-center">
              <p className="al-display text-[22px] font-bold text-[#FFE9A6] uppercase tracking-wide">🏆 Vendido!</p>
              <p className="text-xs text-[#FFE9A6]/70 mt-1">Circuito completo com {nomeCliente}.</p>
            </div>
            <Botao estilo="ghost" className="w-full" disabled={executando} onClick={() =>
              executa({ novaEtapa: ETAPA_NEGOCIACAO, interacao: { type: 'Etapa', notes: '↩ Negociação reaberta' } })
            }>↩ Reabrir negociação</Botao>
          </div>
        );

      case ETAPA_DESCARTADO:
        return (
          <div className="space-y-3">
            <div>
              <p className="al-display text-[15px] font-bold text-text-secondary uppercase tracking-wide">Descartado</p>
              {descartadoMotivo && <p className="text-xs text-text-secondary mt-0.5">Motivo: {descartadoMotivo}</p>}
            </div>
            <Botao estilo="sky" className="w-full" onClick={() => setModo(agendarFollow({ titulo: 'Reativar: quando é o contato?', nota: '🔄 Reativado do descarte' }))}>🔄 Reativar lead</Botao>
          </div>
        );

      default:
        return raizContato({ titulo: 'Retomar o atendimento', sub: 'Fala com o cliente e registra o que rolou.' });
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const corpo = () => {
    switch (modo.t) {
      case 'oque-rolou': return painelOqueRolou(modo);
      case 'nao-atendeu': return painelNaoAtendeu(modo);
      case 'pos-evento': return painelPosEvento(modo);
      case 'nao-rolou': return painelNaoRolou(modo);
      case 'agendar': return painelAgendar(modo);
      case 'descartar': return painelDescartar(modo);
      default: return raiz();
    }
  };

  return (
    <div className="al-card relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="gx-tag">Circuito do lead</span>
        {readOnly && (
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">👁 só visualização</span>
        )}
      </div>
      <div className="mb-4">
        <Trilho etapa={etapa} />
      </div>
      {readOnly ? (
        <fieldset disabled className="pointer-events-none opacity-60">{raiz()}</fieldset>
      ) : (
        corpo()
      )}
    </div>
  );
}
