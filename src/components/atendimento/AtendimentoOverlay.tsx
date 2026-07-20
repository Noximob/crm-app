'use client';

/**
 * Atendimento — os 2 pop-ups do circuito, NA FRENTE da página.
 *
 * Esquerda: o fluxo que conduz o corretor (textos do protótipo aprovado,
 * palavra por palavra). Direita: anotações + qualificação sempre abertas,
 * para preencher durante a conversa — por isso a antiga "corrente de 3
 * passos" aqui vira só a Próxima ação (passos 1 e 2 moram no pop-up direito).
 *
 * Toda resposta vira UMA ação composta (tarefa + etapa + interação) executada
 * pelo pai via `executar` (batch atômico). Fechar no ✕ = pendência.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ETAPA_ENTRADA, ETAPA_FOLLOWUP, ETAPA_MEET, ETAPA_VISITA, ETAPA_NEGOCIACAO, ETAPA_BOLSAO, ETAPA_FECHADO, ETAPA_DESCARTADO,
  TIPO_TAREFA_MEET, TIPO_TAREFA_VISITA, TIPO_TAREFA_FOLLOWUP, TIPO_TAREFA_PRODUTO,
  TIPOS_CONTATO, MOTIVOS_DESCARTE, REQUALIFICA_OPCOES,
  type CadenciasFunil,
} from '@/lib/circuito';
import { toJsDate } from '@/lib/leadTasks';

// ---------------------------------------------------------------------------
// Tipos compartilhados com a página
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
  /** Conversa de verdade (atendeu/respondeu/falei) — marca o 1º contato e conta o rodízio */
  contatoEfetivo?: boolean;
  descartadoMotivo?: string;
  vendaValor?: string;
  transferirParaGestor?: boolean;
}

/** Estados do fluxo — espelham as funções do protótipo. */
export type EstadoFluxo =
  | { t: 'entrada' }
  | { t: 'ligar' }
  | { t: 'atendeu' }
  | { t: 'followQ' }
  | { t: 'proximaAcao'; concluirTaskId?: string; contato?: boolean }
  | { t: 'quando'; concluirTaskId?: string; cancelarTaskId?: string; tentativa?: boolean }
  | { t: 'tarefaAgora'; taskId?: string }
  | { t: 'fuRetry'; taskId?: string }
  | { t: 'meetQ'; taskId?: string }
  | { t: 'meetGostou' }
  | { t: 'meetNext' }
  | { t: 'meetRemarca'; cancelarTaskId?: string }
  | { t: 'visitaQ'; taskId?: string }
  | { t: 'visitaGostou' }
  | { t: 'visitaRemarca'; cancelarTaskId?: string }
  | { t: 'agendarData'; tipo: 'Meet' | 'Visita'; cancelarTaskId?: string; remarcando?: boolean }
  | { t: 'requalifica' }
  | { t: 'negPrazo'; cancelarTaskId?: string }
  | { t: 'negQ'; taskId?: string }
  | { t: 'venda' }
  | { t: 'descarte'; volta: EstadoFluxo };

interface QualGroup { title: string; key: string; options: string[] }

// ---------------------------------------------------------------------------
// Qual pergunta do circuito está pendente para um lead?
// Usado pela página do lead E pelo vigia global (que dispara os pop-ups
// na hora certa, em qualquer tela).
// ---------------------------------------------------------------------------
export interface PerguntaPendente {
  /** true = o pop-up deve abrir sozinho agora */
  pendente: boolean;
  estado: EstadoFluxo;
  /** urgência (ms) — quanto menor, mais urgente; usado pra ordenar */
  urgencia: number;
}

export function perguntaDoLead(
  etapaNormalizada: string,
  pendentes: TaskLike[],
  cadencias: CadenciasFunil,
  agora: number
): PerguntaPendente | null {
  const porData = (a: TaskLike, b: TaskLike) =>
    (toJsDate(a.dueDate)?.getTime() ?? 0) - (toJsDate(b.dueDate)?.getTime() ?? 0);
  const contato = pendentes
    .filter(t => (TIPOS_CONTATO as unknown as string[]).includes(t.type) || t.type === TIPO_TAREFA_PRODUTO)
    .sort(porData)[0];
  // Na Negociação a cobrança é sempre a resposta da proposta — tarefa de
  // Produto NÃO pode virar a pergunta "Fechou?"
  const cobranca = pendentes
    .filter(t => (TIPOS_CONTATO as unknown as string[]).includes(t.type))
    .sort(porData)[0];
  const meet = pendentes.filter(t => t.type === TIPO_TAREFA_MEET).sort(porData)[0];
  const visita = pendentes.filter(t => t.type === TIPO_TAREFA_VISITA).sort(porData)[0];
  const dueMs = (t?: TaskLike) => (t ? toJsDate(t.dueDate)?.getTime() ?? 0 : 0);
  const venceu = (t: TaskLike | undefined, horasExtra = 0) =>
    t ? agora >= dueMs(t) + horasExtra * 3600_000 : false;

  switch (etapaNormalizada) {
    case ETAPA_ENTRADA:
      return { pendente: true, estado: { t: 'entrada' }, urgencia: 0 };
    case ETAPA_FOLLOWUP:
      if (!contato) return { pendente: true, estado: { t: 'proximaAcao' }, urgencia: agora };
      return { pendente: venceu(contato), estado: { t: 'tarefaAgora', taskId: contato.id }, urgencia: dueMs(contato) };
    case ETAPA_MEET:
      if (!meet) return { pendente: true, estado: { t: 'agendarData', tipo: 'Meet' }, urgencia: agora };
      return { pendente: venceu(meet, cadencias.perguntarMeetHoras), estado: { t: 'meetQ', taskId: meet.id }, urgencia: dueMs(meet) };
    case ETAPA_VISITA:
      if (!visita) return { pendente: true, estado: { t: 'agendarData', tipo: 'Visita' }, urgencia: agora };
      return { pendente: venceu(visita, cadencias.perguntarVisitaHoras), estado: { t: 'visitaQ', taskId: visita.id }, urgencia: dueMs(visita) };
    case ETAPA_NEGOCIACAO:
      if (!cobranca) return { pendente: true, estado: { t: 'negPrazo' }, urgencia: agora };
      return { pendente: venceu(cobranca), estado: { t: 'negQ', taskId: cobranca.id }, urgencia: dueMs(cobranca) };
    case ETAPA_BOLSAO:
      return { pendente: false, estado: { t: 'quando' }, urgencia: Infinity };
    case ETAPA_FECHADO:
      return null;
    default: // Descartado → reativar agenda um follow-up
      return { pendente: false, estado: { t: 'quando' }, urgencia: Infinity };
  }
}

interface AtendimentoOverlayProps {
  aberto: boolean;
  estadoInicial: EstadoFluxo;
  nome: string;
  telefone: string;
  origem?: string;
  tasks: TaskLike[];
  cadencias: CadenciasFunil;
  executando: boolean;
  isDemo: boolean;
  executar: (acao: AcaoCircuito) => Promise<boolean>;
  registrarContato: (via: 'Ligação' | 'WhatsApp') => void;
  onFecharX: () => void;   // ✕ → pendência
  onConcluido: (msg?: string) => void; // ação final ok → fecha
  /** Histórico de interações do lead — aparece abaixo da pergunta pra ajudar a pensar */
  historico?: { id: string; type: string; notes: string; timestamp: any }[];
  /**
   * Rodízio do 1º contato: informado quando o lead AINDA não teve conversa de
   * verdade (Entrada/Follow-up sem circuito.primeiroContatoEm). `tentativas` =
   * quantas já foram sem resposta; o selo mostra a tentativa atual (N+1).
   */
  rodizioPrimeiroContato?: { tentativas: number } | null;
  // pop-up direito (sempre aberto)
  qualGroups: QualGroup[];
  qualifications: Record<string, string[]>;
  onToggleQual: (key: string, value: string) => void;
  saveQual: 'idle' | 'salvando' | 'salvo';
  anotacoes: string;
  onChangeAnotacoes: (v: string) => void;
  saveNotas: 'idle' | 'salvando' | 'salvo';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const p2 = (n: number) => String(n).padStart(2, '0');
export const fmtDataHora = (d: Date) =>
  `${DIAS[d.getDay()]} ${p2(d.getDate())}/${p2(d.getMonth() + 1)} · ${p2(d.getHours())}:${p2(d.getMinutes())}`;

/** "hoje às 15:00" / "ontem às 15:00" / "sex 12/07 às 15:00" */
const quandoLabel = (d: Date) => {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dia = new Date(d); dia.setHours(0, 0, 0, 0);
  const diff = Math.round((hoje.getTime() - dia.getTime()) / 86_400_000);
  const hm = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  if (diff === 0) return `hoje às ${hm}`;
  if (diff === 1) return `ontem às ${hm}`;
  if (diff === -1) return `amanhã às ${hm}`;
  return `${DIAS[d.getDay()]} ${p2(d.getDate())}/${p2(d.getMonth() + 1)} às ${hm}`;
};

const toDateStr = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

const CHIPS_QUANDO = ['Hoje', 'Amanhã', 'Em 3 dias', 'Em 7 dias', '📅 Escolher data'] as const;
const CHIPS_PRAZO = ['Amanhã', 'Em 3 dias', 'Em 1 semana', '📅 Escolher data'] as const;

const dataDoChip = (chip: string): Date => {
  const d = new Date();
  if (chip === 'Amanhã') d.setDate(d.getDate() + 1);
  else if (chip === 'Em 3 dias') d.setDate(d.getDate() + 3);
  else if (chip === 'Em 7 dias' || chip === 'Em 1 semana') d.setDate(d.getDate() + 7);
  return d;
};

// classes visuais (fiéis ao protótipo, em Tailwind)
const PBTN = {
  primary: 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white',
  ghost: 'bg-white/[0.05] border border-white/15 text-white',
  win: 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-300',
  danger: 'bg-[#FF6B6B]/10 border border-[#FF6B6B]/40 text-[#FF8F8F]',
  gold: 'bg-[#E8C547]/10 border border-[#E8C547]/45 text-[#E8C547]',
} as const;

function Pbtn({ c, onClick, disabled, children }: { c: keyof typeof PBTN; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[13px] font-bold px-4 py-2 rounded-[10px] transition-all hover:brightness-125 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${PBTN[c]}`}
    >
      {children}
    </button>
  );
}

function Chips({ itens, sel, onSel }: { itens: readonly string[]; sel: string[]; onSel: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 my-2">
      {itens.map(o => (
        <button
          key={o}
          onClick={() => onSel(o)}
          className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
            sel.includes(o)
              ? 'bg-[#E8C547]/10 border-[#E8C547] text-[#E8C547] font-bold'
              : 'bg-white/[0.04] border-white/15 text-white/70 hover:border-[#E8C547]/60'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function AtendimentoOverlay(props: AtendimentoOverlayProps) {
  const {
    aberto, estadoInicial, nome, telefone, origem, tasks, cadencias, executando, isDemo,
    executar, registrarContato, onFecharX, onConcluido, historico, rodizioPrimeiroContato,
    qualGroups, qualifications, onToggleQual, saveQual, anotacoes, onChangeAnotacoes, saveNotas,
  } = props;

  const [estado, setEstado] = useState<EstadoFluxo>(estadoInicial);

  // Pilha de navegação: todo passo tem "‹ voltar" — MENOS depois de algo já
  // gravado no banco (aí a pilha é zerada; não dá pra desfazer voltando).
  const pilha = useRef<EstadoFluxo[]>([]);
  const irPara = (novo: EstadoFluxo) => { pilha.current = [...pilha.current, estado]; setEstado(novo); };
  const irLimpo = (novo: EstadoFluxo) => { pilha.current = []; setEstado(novo); };
  const voltarPasso = () => {
    const copia = [...pilha.current];
    const anterior = copia.pop();
    if (anterior) { pilha.current = copia; setEstado(anterior); }
  };
  // seleções dos chips / inputs (resetam a cada troca de estado)
  const [acaoSel, setAcaoSel] = useState('');
  const [quandoSel, setQuandoSel] = useState('');
  const [dataStr, setDataStr] = useState('');
  const [horaStr, setHoraStr] = useState('10:00');
  const [motivoSel, setMotivoSel] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [requalSel, setRequalSel] = useState<string[]>([]);
  const [aviso, setAviso] = useState('');

  // Reseta pro estado inicial só quando o overlay ABRE (não a cada render/snapshot)
  const prevAberto = useRef(false);
  useEffect(() => {
    if (aberto && !prevAberto.current) {
      pilha.current = [];
      setEstado(estadoInicial);
    }
    prevAberto.current = aberto;
  }, [aberto, estadoInicial]);

  useEffect(() => {
    setAcaoSel(''); setQuandoSel(''); setDataStr(''); setHoraStr('10:00');
    setMotivoSel(''); setMotivoOutro(''); setRequalSel([]); setAviso('');
  }, [estado.t]);

  const primeiroNome = (nome || 'o cliente').split(' ')[0];
  const digits = (telefone || '').replace(/\D/g, '');
  const taskDe = (id?: string) => tasks.find(t => t.id === id);

  /** Data final escolhida nos agendadores (chip ou 📅) + hora. */
  const dataEscolhida = (): Date | null => {
    if (!horaStr) return null;
    let base: Date | null = null;
    if (quandoSel && quandoSel !== '📅 Escolher data') base = dataDoChip(quandoSel);
    else if (dataStr) base = new Date(`${dataStr}T00:00`);
    if (!base) return null;
    const [h, m] = horaStr.split(':').map(Number);
    base.setHours(h || 0, m || 0, 0, 0);
    return base;
  };

  /** Valida a escolha: precisa existir e ser no FUTURO (ex.: "Hoje" às 18h quando já são 20h). */
  const dataValidada = (avisoVazio = '⚠️ Escolha quando.'): Date | null => {
    const d = dataEscolhida();
    if (!d) { setAviso(avisoVazio); return null; }
    if (d.getTime() < Date.now() - 60_000) {
      setAviso('⚠️ Esse horário já passou — escolhe um no futuro.');
      return null;
    }
    return d;
  };

  const seletorQuando = (chips: readonly string[] = CHIPS_QUANDO) => (
    <>
      <Chips itens={chips} sel={quandoSel ? [quandoSel] : []} onSel={v => { setQuandoSel(v); setAviso(''); }} />
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {quandoSel === '📅 Escolher data' && (
          <input
            type="date"
            value={dataStr}
            onChange={e => setDataStr(e.target.value)}
            className="px-3 py-1.5 bg-white/[0.04] border border-white/15 rounded-lg text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#E8C547]/50"
          />
        )}
        <label className="flex items-center gap-2 text-[12px] text-white/60">
          às
          <input
            type="time"
            value={horaStr}
            onChange={e => setHoraStr(e.target.value)}
            className="px-3 py-1.5 bg-white/[0.04] border border-white/15 rounded-lg text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#E8C547]/50"
          />
        </label>
      </div>
    </>
  );

  const fecha = (msg?: string) => onConcluido(msg);

  // ------------------------------------------------------------------
  // Definição de cada pop-up (bar, body, botões) — textos do protótipo
  // ------------------------------------------------------------------
  type Btn = { t: string; c: keyof typeof PBTN; f: () => void };
  interface PopupDef { bar: string; red?: boolean; noX?: boolean; body: React.ReactNode; btns: Btn[] }

  const b = (s: string) => <b className="font-bold text-white">{s}</b>;

  const def = (): PopupDef => {
    switch (estado.t) {
      case 'entrada':
        return {
          bar: 'Lead novo · Entrada',
          body: (
            <>
              Você já falou com {b(primeiroNome)}?
              {origem && <small>Chegou por: {origem}.</small>}
            </>
          ),
          btns: [
            { t: `Já falei com ${primeiroNome}`, c: 'primary', f: () => irPara({ t: 'proximaAcao', contato: true }) },
            { t: 'Ainda não', c: 'ghost', f: () => irPara({ t: 'ligar' }) },
          ],
        };

      case 'ligar':
        return {
          bar: 'Primeiro contato',
          body: (
            <>
              Liga pra {b(primeiroNome)} agora — quanto antes, maior a chance de conversão.
              <small>
                Telefone: {telefone} · <a className="text-[#7DD3FC] underline" href={`tel:${digits}`}>ligar</a> · <a className="text-emerald-300 underline" href={`https://wa.me/55${digits}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              </small>
            </>
          ),
          btns: [
            { t: '📞 Liguei', c: 'gold', f: () => { registrarContato('Ligação'); irPara({ t: 'atendeu' }); } },
            { t: '💬 Chamei no WhatsApp', c: 'gold', f: () => { registrarContato('WhatsApp'); irPara({ t: 'atendeu' }); } },
          ],
        };

      case 'atendeu':
        return {
          bar: 'Primeiro contato',
          body: <>E aí, {b(primeiroNome)} atendeu?</>,
          btns: [
            { t: 'Atendeu ✓', c: 'primary', f: () => irPara({ t: 'proximaAcao', contato: true }) },
            { t: 'Não atendeu', c: 'ghost', f: () => irPara({ t: 'followQ' }) },
          ],
        };

      case 'followQ':
        return {
          bar: 'Sem resposta',
          body: <>Quer programar um follow-up pra tentar de novo?</>,
          btns: [
            { t: 'Sim, agendar', c: 'primary', f: () => irPara({ t: 'quando', tentativa: true }) },
            { t: 'Não, desistir', c: 'danger', f: () => irPara({ t: 'descarte', volta: { t: 'followQ' } }) },
          ],
        };

      case 'proximaAcao': {
        const m = estado;
        const executaAcao = async () => {
          if (!acaoSel) {
            setAviso('⚠️ O sistema não deixa concluir sem escolher ação + quando.');
            return;
          }
          const d = acaoSel !== '🤝 Negociação'
            ? dataValidada('⚠️ O sistema não deixa concluir sem escolher ação + quando.')
            : null;
          if (!d && acaoSel !== '🤝 Negociação') return;
          if (acaoSel === '🤝 Negociação') {
            const ok = await executar({
              novaEtapa: ETAPA_NEGOCIACAO,
              concluirTaskId: m.concluirTaskId,
              circuitoTentativas: 'zero',
              contatoEfetivo: m.contato,
              interacao: { type: 'Etapa', notes: `🤝 ${primeiroNome} pronto pra negociar — direto pra proposta` },
            });
            if (ok) irLimpo({ t: 'negPrazo' });
            return;
          }
          const mapa: Record<string, { tipo: string; etapa: string; desc: string; inter: string }> = {
            'Ligar': { tipo: 'Ligação', etapa: ETAPA_FOLLOWUP, desc: `Ligar para ${nome}`, inter: '📌 Tarefa criada: ligar' },
            'WhatsApp': { tipo: 'WhatsApp', etapa: ETAPA_FOLLOWUP, desc: `Chamar ${nome} no WhatsApp`, inter: '📌 Tarefa criada: WhatsApp' },
            'Marcar meet': { tipo: TIPO_TAREFA_MEET, etapa: ETAPA_MEET, desc: `Meet com ${nome}`, inter: '📅 Meet marcado' },
            'Marcar visita': { tipo: TIPO_TAREFA_VISITA, etapa: ETAPA_VISITA, desc: `Visita com ${nome}`, inter: '🏠 Visita marcada' },
            '🔎 Procurar produto': { tipo: TIPO_TAREFA_PRODUTO, etapa: ETAPA_FOLLOWUP, desc: `Procurar produto para ${nome}`, inter: '🔎 Vai procurar produto — tarefa' },
          };
          const a = mapa[acaoSel];
          const ok = await executar({
            novaEtapa: a.etapa,
            concluirTaskId: m.concluirTaskId,
            novaTarefa: { description: a.desc, type: a.tipo, dueDate: d! },
            circuitoTentativas: 'zero',
            contatoEfetivo: m.contato,
            interacao: { type: a.tipo, notes: `${a.inter} · ${fmtDataHora(d!)}` },
          });
          if (ok) fecha(`✓ ${primeiroNome} registrado. Próxima ação: ${acaoSel.replace('🔎 ', '').toLowerCase()} ${quandoLabel(d!)}.`);
        };
        return {
          bar: 'Próxima ação',
          body: (
            <>
              Qual o próximo passo com {b(primeiroNome)}?
              <small>Anotações e qualificação ficam no painel ao lado — preenche lá enquanto conversa. →</small>
              <Chips
                itens={['Ligar', 'WhatsApp', 'Marcar meet', 'Marcar visita', '🤝 Negociação', '🔎 Procurar produto']}
                sel={acaoSel ? [acaoSel] : []}
                onSel={v => { setAcaoSel(v); setAviso(''); }}
              />
              {acaoSel !== '🤝 Negociação' && (<>Quando?{seletorQuando()}</>)}
              {aviso && <small className="!text-amber-300">{aviso}</small>}
            </>
          ),
          btns: [{ t: executando ? 'Registrando…' : 'Concluir ✓', c: 'primary', f: executaAcao }],
        };
      }

      case 'quando': {
        const m = estado;
        return {
          bar: 'Agendar',
          body: (
            <>
              Quando?
              {seletorQuando()}
              {aviso && <small className="!text-amber-300">{aviso}</small>}
            </>
          ),
          btns: [{
            t: executando ? 'Agendando…' : 'Agendar ✓', c: 'primary', f: async () => {
              const d = dataValidada();
              if (!d) return;
              const ok = await executar({
                novaEtapa: ETAPA_FOLLOWUP,
                concluirTaskId: m.concluirTaskId,
                cancelarTaskId: m.cancelarTaskId,
                novaTarefa: { description: `Follow-up com ${nome}`, type: TIPO_TAREFA_FOLLOWUP, dueDate: d },
                circuitoTentativas: m.tentativa ? 'inc' : undefined,
                interacao: {
                  type: 'Follow-up',
                  // "tentativa" = veio de um "não atendeu" → registra nomeado (alimenta o relatório de atividade)
                  notes: `${m.tentativa ? '📵 Não atendeu · ' : ''}📌 Tarefa criada: follow-up · ${fmtDataHora(d)}`,
                },
              });
              if (ok) fecha(`✓ Follow-up com ${primeiroNome} agendado: ${quandoLabel(d)}.`);
            },
          }],
        };
      }

      case 'tarefaAgora': {
        // "No horário abre o pop-up dizendo que ele tem aquilo pra fazer AGORA"
        const task = taskDe(estado.taskId);
        const due = task ? toJsDate(task.dueDate) : null;
        const atrasada = due ? due.getTime() < Date.now() - 60_000 : false;
        const ehProduto = task?.type === TIPO_TAREFA_PRODUTO;
        if (ehProduto) {
          return {
            bar: '⏰ Agora · Produto',
            body: (
              <>
                🔎 Hora de {b(task?.description || `procurar produto para ${primeiroNome}`)}.
                {due && <small>Combinado para {quandoLabel(due)}.</small>}
              </>
            ),
            btns: [
              { t: 'Achei! Falar com o cliente ✓', c: 'primary', f: () => irPara({ t: 'proximaAcao', concluirTaskId: estado.taskId }) },
              { t: '🕐 Remarcar', c: 'ghost', f: () => irPara({ t: 'quando', cancelarTaskId: estado.taskId }) },
            ],
          };
        }
        return {
          bar: `⏰ Agora · ${task?.type || 'Contato'}`,
          body: (
            <>
              Hora do próximo passo com {b(primeiroNome)}: {b(task?.description || 'fazer contato')}.
              {due && <small>{atrasada ? 'Estava combinado' : 'Combinado'} para {quandoLabel(due)}. · <a className="text-[#7DD3FC] underline" href={`tel:${digits}`}>ligar</a> · <a className="text-emerald-300 underline" href={`https://wa.me/55${digits}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></small>}
            </>
          ),
          btns: [
            { t: `✅ Falei com ${primeiroNome}`, c: 'primary', f: () => irPara({ t: 'proximaAcao', concluirTaskId: estado.taskId, contato: true }) },
            { t: '📵 Não atendeu', c: 'ghost', f: () => irPara({ t: 'fuRetry', taskId: estado.taskId }) },
            { t: '🕐 Remarcar', c: 'ghost', f: () => irPara({ t: 'quando', cancelarTaskId: estado.taskId }) },
          ],
        };
      }

      case 'fuRetry':
        return {
          bar: 'Follow-up',
          body: <>Tentar de novo? Em imóveis, a venda média sai {b('depois do 5º contato')} — persistência fecha negócio.</>,
          btns: [
            { t: 'Sim, novo follow-up', c: 'primary', f: () => irPara({ t: 'quando', concluirTaskId: estado.taskId, tentativa: true }) },
            { t: `Desistir de ${primeiroNome}`, c: 'danger', f: () => irPara({ t: 'descarte', volta: { t: 'fuRetry', taskId: estado.taskId } }) },
          ],
        };

      case 'meetQ': {
        const task = taskDe(estado.taskId);
        const due = task ? toJsDate(task.dueDate) : null;
        const futuro = due ? due.getTime() > Date.now() : false;
        return {
          bar: due ? `Meet · ${quandoLabel(due)}` : 'Meet',
          body: futuro
            ? <>Seu meet com {b(primeiroNome)} tá marcado pra {due ? quandoLabel(due) : 'breve'}. Já aconteceu?</>
            : <>Seu meet com {b(primeiroNome)} era {due ? quandoLabel(due) : 'marcado'}. Aconteceu?</>,
          btns: [
            {
              t: 'Aconteceu ✓', c: 'primary', f: async () => {
                const ok = await executar({
                  concluirTaskId: estado.taskId,
                  interacao: { type: 'Meet', notes: '✅ Meet realizado' },
                });
                if (ok) irLimpo({ t: 'meetGostou' });
              },
            },
            { t: 'Não rolou', c: 'ghost', f: () => irPara({ t: 'meetRemarca', cancelarTaskId: estado.taskId }) },
            ...(futuro ? [{ t: '🕐 Remarcar', c: 'ghost' as const, f: () => irPara({ t: 'agendarData', tipo: 'Meet' as const, cancelarTaskId: estado.taskId, remarcando: true }) }] : []),
          ],
        };
      }

      case 'meetGostou':
        return {
          bar: 'Meet · resultado',
          body: <>{b(primeiroNome)} gostou do {b('produto')} que você apresentou?</>,
          btns: [
            { t: 'Gostou 😀', c: 'primary', f: () => irPara({ t: 'meetNext' }) },
            { t: 'Não gostou', c: 'ghost', f: () => irPara({ t: 'requalifica' }) },
          ],
        };

      case 'meetNext':
        return {
          bar: 'Próximo passo',
          body: <>Boa! Qual o próximo passo com {b(primeiroNome)}?</>,
          btns: [
            { t: '📅 Marcar visita', c: 'primary', f: () => irPara({ t: 'agendarData', tipo: 'Visita' }) },
            {
              t: 'Direto pra proposta', c: 'gold', f: async () => {
                const ok = await executar({
                  novaEtapa: ETAPA_NEGOCIACAO,
                  circuitoTentativas: 'zero',
                  interacao: { type: 'Etapa', notes: '🤝 Meet aprovado — direto pra proposta' },
                });
                if (ok) irLimpo({ t: 'negPrazo' });
              },
            },
            { t: 'Outra ação (follow)', c: 'ghost', f: () => irPara({ t: 'quando' }) },
          ],
        };

      case 'meetRemarca':
        return {
          bar: 'Meet desmarcado',
          body: <>Remarca com {b(primeiroNome)} {b('agora')} — cliente que remarca ainda tá quente.</>,
          btns: [
            { t: '📅 Remarcar o meet', c: 'primary', f: () => irPara({ t: 'agendarData', tipo: 'Meet', cancelarTaskId: estado.cancelarTaskId, remarcando: true }) },
            { t: 'Não consegui falar', c: 'ghost', f: () => irPara({ t: 'quando', cancelarTaskId: estado.cancelarTaskId, tentativa: true }) },
          ],
        };

      case 'visitaQ': {
        const task = taskDe(estado.taskId);
        const due = task ? toJsDate(task.dueDate) : null;
        const futuro = due ? due.getTime() > Date.now() : false;
        return {
          bar: due ? `Visita · ${quandoLabel(due)}` : 'Visita',
          body: futuro
            ? <>A visita de {b(primeiroNome)} tá marcada pra {due ? quandoLabel(due) : 'breve'}. Já aconteceu?</>
            : <>A visita de {b(primeiroNome)} era {due ? quandoLabel(due) : 'marcada'}. Aconteceu?</>,
          btns: [
            {
              t: 'Aconteceu ✓', c: 'primary', f: async () => {
                const ok = await executar({
                  concluirTaskId: estado.taskId,
                  interacao: { type: 'Visita', notes: '✅ Visita realizada' },
                });
                if (ok) irLimpo({ t: 'visitaGostou' });
              },
            },
            { t: 'Não rolou', c: 'ghost', f: () => irPara({ t: 'visitaRemarca', cancelarTaskId: estado.taskId }) },
            ...(futuro ? [{ t: '🕐 Remarcar', c: 'ghost' as const, f: () => irPara({ t: 'agendarData', tipo: 'Visita' as const, cancelarTaskId: estado.taskId, remarcando: true }) }] : []),
          ],
        };
      }

      case 'visitaGostou':
        return {
          bar: 'Visita · resultado',
          body: <>{b(primeiroNome)} gostou do {b('imóvel')}?</>,
          btns: [
            {
              t: 'Gostou 😀 — hora da proposta', c: 'primary', f: async () => {
                const ok = await executar({
                  novaEtapa: ETAPA_NEGOCIACAO,
                  circuitoTentativas: 'zero',
                  interacao: { type: 'Etapa', notes: '🏠 Visita aprovada — hora da proposta' },
                });
                if (ok) irLimpo({ t: 'negPrazo' });
              },
            },
            { t: 'Não gostou', c: 'ghost', f: () => irPara({ t: 'requalifica' }) },
          ],
        };

      case 'visitaRemarca':
        return {
          bar: 'Visita desmarcada',
          body: <>Remarca com {b(primeiroNome)} {b('agora')} — cliente que remarca ainda tá quente.</>,
          btns: [
            { t: '📅 Remarcar a visita', c: 'primary', f: () => irPara({ t: 'agendarData', tipo: 'Visita', cancelarTaskId: estado.cancelarTaskId, remarcando: true }) },
            { t: 'Não consegui falar', c: 'ghost', f: () => irPara({ t: 'quando', cancelarTaskId: estado.cancelarTaskId, tentativa: true }) },
          ],
        };

      case 'agendarData': {
        const m = estado;
        const nomeEvento = m.tipo === 'Meet' ? 'o meet' : 'a visita';
        return {
          bar: m.remarcando ? `${m.tipo} · remarcar` : `Agendar ${m.tipo.toLowerCase()}`,
          body: (
            <>
              Quando vai ser {nomeEvento} com {b(primeiroNome)}?
              {seletorQuando()}
              {aviso && <small className="!text-amber-300">{aviso}</small>}
            </>
          ),
          btns: [{
            t: executando ? 'Marcando…' : `Confirmar ${m.tipo.toLowerCase()} ✓`, c: 'primary', f: async () => {
              const d = dataValidada();
              if (!d) return;
              const ehMeet = m.tipo === 'Meet';
              const ok = await executar({
                novaEtapa: ehMeet ? ETAPA_MEET : ETAPA_VISITA,
                cancelarTaskId: m.cancelarTaskId,
                novaTarefa: { description: `${m.tipo} com ${nome}`, type: ehMeet ? TIPO_TAREFA_MEET : TIPO_TAREFA_VISITA, dueDate: d },
                circuitoTentativas: 'zero',
                interacao: { type: m.tipo, notes: `📌 ${m.tipo} ${m.remarcando ? 'remarcad' : 'marcad'}${ehMeet ? 'o' : 'a'} · ${fmtDataHora(d)}` },
              });
              if (ok) fecha(`✓ ${m.tipo} com ${primeiroNome}: ${quandoLabel(d)}.`);
            },
          }],
        };
      }

      case 'requalifica':
        return {
          bar: 'Requalificação',
          body: (
            <>
              O que {b('não encaixou')}? Atualiza aqui:
              <Chips itens={REQUALIFICA_OPCOES} sel={requalSel} onSel={v => setRequalSel(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])} />
              <small>O lead volta pro follow-up mais inteligente do que entrou. A qualificação completa fica no painel ao lado. →</small>
            </>
          ),
          btns: [{
            t: 'Salvar e voltar a nutrir →', c: 'primary', f: async () => {
              const ok = await executar({
                novaEtapa: ETAPA_FOLLOWUP,
                interacao: { type: 'Etapa', notes: `🎯 Requalificação${requalSel.length ? `: ${requalSel.join(', ')}` : ' registrada'}` },
              });
              if (ok) irLimpo({ t: 'quando' });
            },
          }],
        };

      case 'negPrazo': {
        const m = estado;
        return {
          bar: 'Negociação',
          body: (
            <>
              Proposta apresentada! Quando sai a {b(`resposta de ${primeiroNome}`)}?
              {seletorQuando(CHIPS_PRAZO)}
              {aviso && <small className="!text-amber-300">{aviso}</small>}
            </>
          ),
          btns: [{
            t: executando ? 'Definindo…' : 'Definir prazo ✓', c: 'primary', f: async () => {
              const d = dataValidada('⚠️ Escolha o prazo.');
              if (!d) return;
              const ok = await executar({
                novaEtapa: ETAPA_NEGOCIACAO,
                cancelarTaskId: m.cancelarTaskId,
                novaTarefa: { description: `Resposta da proposta — ${nome}`, type: TIPO_TAREFA_FOLLOWUP, dueDate: d },
                interacao: { type: 'Follow-up', notes: `📌 Cobrança agendada: resposta da proposta · ${fmtDataHora(d)}` },
              });
              if (ok) fecha(`✓ ${primeiroNome} em Negociação — o sistema cobra a resposta ${quandoLabel(d)}.`);
            },
          }],
        };
      }

      case 'negQ': {
        const task = taskDe(estado.taskId);
        const due = task ? toJsDate(task.dueDate) : null;
        return {
          bar: 'Negociação · prazo venceu',
          body: <>A proposta pra {b(primeiroNome)} tinha resposta prevista pra {due ? quandoLabel(due) : 'ontem'}. Fechou?</>,
          btns: [
            { t: 'FECHOU! 🎉', c: 'win', f: () => irPara({ t: 'venda' }) },
            { t: 'Ainda negociando', c: 'ghost', f: () => irPara({ t: 'negPrazo', cancelarTaskId: estado.taskId }) },
            {
              t: 'Esfriou', c: 'ghost', f: async () => {
                const ok = await executar({
                  novaEtapa: ETAPA_FOLLOWUP,
                  concluirTaskId: estado.taskId,
                  interacao: { type: 'Etapa', notes: '🌡️ Negociação esfriou — voltando a nutrir' },
                });
                if (ok) irLimpo({ t: 'quando' });
              },
            },
            { t: 'Morreu', c: 'danger', f: () => irPara({ t: 'descarte', volta: { t: 'negQ', taskId: estado.taskId } }) },
          ],
        };
      }

      case 'venda':
        return {
          bar: '🎉 Venda fechada',
          noX: true,
          body: (
            <>
              Fechou com {b(primeiroNome)}? 🎉
              <small>O lançamento oficial (valor, comissão, meta) é feito em <b className="text-white">Comissões</b>, na área do administrador — lá também se registra de onde veio a venda.</small>
            </>
          ),
          btns: [{
            t: executando ? 'Registrando…' : '🏆 Confirmar — FECHOU!', c: 'win', f: async () => {
              const ok = await executar({
                novaEtapa: ETAPA_FECHADO,
                cancelarTodasPendentes: true,
                circuitoTentativas: 'zero',
                interacao: { type: 'Venda', notes: '🏆 VENDA FECHADA! (lançamento oficial em Comissões)' },
              });
              if (ok) fecha(`🏆 VENDA de ${primeiroNome} fechada! Parabéns! 🎉 Avisa o admin pra lançar em Comissões.`);
            },
          }],
        };

      case 'descarte': {
        const volta = estado.volta;
        const motivoFinal = motivoSel === 'Outro' ? motivoOutro.trim() : motivoSel;
        return {
          bar: 'Descarte · confirmação',
          red: true,
          body: (
            <>
              ⚠️ Sem um próximo passo, {b(primeiroNome)} sai do seu funil e vai pro descarte. Tem certeza?
              <small>Escolha o motivo (obrigatório):</small>
              <Chips itens={MOTIVOS_DESCARTE} sel={motivoSel ? [motivoSel] : []} onSel={v => { setMotivoSel(v); setAviso(''); }} />
              {motivoSel === 'Outro' && (
                <input
                  value={motivoOutro}
                  onChange={e => setMotivoOutro(e.target.value)}
                  placeholder="Qual o motivo?"
                  className="mt-1 w-full px-3 py-2 bg-white/[0.04] border border-white/15 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/50"
                />
              )}
              {aviso && <small className="!text-amber-300">{aviso}</small>}
            </>
          ),
          btns: [
            { t: '← Voltar (dar mais uma chance)', c: 'ghost', f: () => irPara(volta) },
            {
              t: executando ? 'Descartando…' : 'Confirmar descarte', c: 'danger', f: async () => {
                if (!motivoFinal) { setAviso('⚠️ O sistema não deixa descartar sem motivo.'); return; }
                const ok = await executar({
                  novaEtapa: ETAPA_DESCARTADO,
                  cancelarTodasPendentes: true,
                  descartadoMotivo: motivoFinal,
                  interacao: { type: 'Descarte', notes: `🗑️ Descartado — motivo: ${motivoFinal}` },
                });
                if (ok) fecha(`${primeiroNome} descartado (${motivoFinal}).`);
              },
            },
          ],
        };
      }
    }
  };

  if (!aberto) return null;
  const d = def();

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="min-h-full flex items-start justify-center p-3 sm:p-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start pt-6 lg:pt-14">

          {/* ============ COLUNA ESQUERDA — a AÇÃO (destaque dourado) + histórico ============ */}
          <div className="max-w-[520px] w-full mx-auto lg:mx-0 space-y-3">
            <div className={`bg-[#201c2e] rounded-xl overflow-hidden border ${
              d.red
                ? 'border-[#FF6B6B]/50 shadow-[0_0_44px_-10px_rgba(255,107,107,0.35),0_24px_80px_-24px_rgba(0,0,0,0.9)]'
                : 'border-[#E8C547]/55 shadow-[0_0_44px_-10px_rgba(232,197,71,0.4),0_24px_80px_-24px_rgba(0,0,0,0.9)]'
            }`}>
              <div className={`h-[2px] w-full bg-gradient-to-r ${d.red ? 'from-[#FF6B6B] via-[#FF6B6B]/40' : 'from-[#E8C547] via-[#E8C547]/40'} to-transparent`} />
              <div className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.03] border-b border-white/10 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/50">
                <span className={`h-2 w-2 rounded-full ${d.red ? 'bg-[#FF6B6B]' : 'bg-[#E8C547] shadow-[0_0_8px_rgba(232,197,71,0.8)]'}`} />
                {d.bar}
                <span className="ml-auto flex items-center gap-1">
                  {pilha.current.length > 0 && (
                    <button
                      onClick={voltarPasso}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors normal-case tracking-normal"
                      title="Voltar um passo"
                    >
                      ‹ voltar
                    </button>
                  )}
                  {!d.noX && (
                    <button
                      onClick={onFecharX}
                      className="px-2 py-0.5 rounded-md text-[13px] font-normal text-white/40 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/15 transition-colors"
                      title="Fechar sem responder (vira pendência)"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
              {/* Rodízio do 1º contato — mostra em que tentativa o corretor está */}
              {rodizioPrimeiroContato && estado.t !== 'descarte' && estado.t !== 'venda' && (
                <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-[#7DD3FC]/30 bg-[#7DD3FC]/[0.07] px-3 py-1.5">
                  <span className="text-[13px]">🎯</span>
                  <span className="text-[11.5px] font-bold text-[#7DD3FC]">
                    1º contato · {rodizioPrimeiroContato.tentativas + 1}ª tentativa
                  </span>
                  <span className="text-[10.5px] text-white/40">
                    {rodizioPrimeiroContato.tentativas === 0
                      ? 'ainda sem resposta registrada — bora abrir o placar'
                      : `${rodizioPrimeiroContato.tentativas} sem resposta — a venda média sai depois do 5º contato`}
                  </span>
                </div>
              )}
              <div className="px-4 pt-3.5 pb-1.5 text-[14.5px] text-white leading-relaxed [&_small]:block [&_small]:text-white/55 [&_small]:text-xs [&_small]:mt-1.5 [&_small]:leading-snug">
                {d.body}
              </div>
              <div className="flex flex-wrap gap-2 px-4 pb-4 pt-3">
                {d.btns.map((btn, i) => (
                  <Pbtn key={`${estado.t}-${i}`} c={btn.c} onClick={btn.f} disabled={executando}>{btn.t}</Pbtn>
                ))}
              </div>
              {/* Descarte sempre à mão — de qualquer passo do circuito */}
              {estado.t !== 'descarte' && estado.t !== 'venda' && (
                <div className="px-4 pb-3 -mt-1.5 flex justify-end">
                  <button
                    onClick={() => irPara({ t: 'descarte', volta: estado })}
                    disabled={executando}
                    className="text-[11px] font-semibold text-white/35 hover:text-[#FF8F8F] transition-colors disabled:opacity-40"
                    title="Descartar este cliente (vai pedir o motivo)"
                  >
                    🗑 Descartar {primeiroNome}
                  </button>
                </div>
              )}
            </div>

            {/* Histórico — o que já rolou, pra pensar antes de responder */}
            {historico && historico.length > 0 && (
              <div className="bg-[#201c2e]/95 border border-white/10 rounded-xl overflow-hidden shadow-[0_14px_40px_-18px_rgba(0,0,0,0.8)]">
                <div className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.03] border-b border-white/10 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7DD3FC]/70" />
                  O que já rolou com {primeiroNome}
                </div>
                <ul className="max-h-44 overflow-y-auto px-3.5 py-2.5 space-y-1.5">
                  {historico.slice(0, 30).map(h => {
                    const dh = toJsDate(h.timestamp);
                    return (
                      <li key={h.id} className="flex items-start gap-2 text-[12px] leading-snug">
                        <span className="shrink-0 text-white/30 tabular-nums text-[11px] pt-px">
                          {dh ? `${p2(dh.getDate())}/${p2(dh.getMonth() + 1)} ${p2(dh.getHours())}:${p2(dh.getMinutes())}` : 'agora'}
                        </span>
                        <span className="text-white/70 min-w-0">{h.notes}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* ============ POP-UP DIREITO — anotações & qualificação (sempre abertos) ============ */}
          <div className="bg-[#201c2e] border border-white/15 rounded-xl overflow-hidden shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] w-full">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.03] border-b border-white/10 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/40">
              <span className="h-2 w-2 rounded-full bg-[#7DD3FC]" />
              {primeiroNome} · Anotações & Qualificação
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/45">Anotações</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity ${saveNotas === 'idle' ? 'opacity-0' : 'opacity-100'} ${saveNotas === 'salvo' ? 'text-emerald-300' : 'text-white/45'}`}>
                    {saveNotas === 'salvando' ? 'salvando…' : 'salvo ✓'}
                  </span>
                </div>
                <textarea
                  value={anotacoes}
                  onChange={e => onChangeAnotacoes(e.target.value)}
                  rows={4}
                  placeholder={isDemo ? 'Modo demonstração — nada é salvo.' : 'O que vocês conversaram? Salva sozinho.'}
                  className="w-full bg-white/[0.04] border border-white/15 rounded-lg p-2.5 text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#7DD3FC]/40 resize-y"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/45">Qualificação</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity ${saveQual === 'idle' ? 'opacity-0' : 'opacity-100'} ${saveQual === 'salvo' ? 'text-emerald-300' : 'text-white/45'}`}>
                    {saveQual === 'salvando' ? 'salvando…' : 'salvo ✓'}
                  </span>
                </div>
                <div className="space-y-3">
                  {qualGroups.map(g => (
                    <div key={g.key}>
                      <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-white/35 mb-1">{g.title}</p>
                      <div className="flex flex-wrap gap-1">
                        {g.options.map(op => {
                          const ativo = Array.isArray(qualifications[g.key]) && qualifications[g.key].includes(op);
                          return (
                            <button
                              key={op}
                              onClick={() => onToggleQual(g.key, op)}
                              className={`px-2 py-1 text-[11px] font-medium border rounded-md transition-all ${
                                ativo
                                  ? 'bg-[#9F6BFF]/15 border-[#9F6BFF]/60 text-[#C4A6FF]'
                                  : 'bg-white/[0.04] border-white/10 text-white/55 hover:bg-white/[0.08]'
                              }`}
                            >
                              {op}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
