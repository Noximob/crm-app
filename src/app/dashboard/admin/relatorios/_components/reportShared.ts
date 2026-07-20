/**
 * Relatórios do administrador — tipos compartilhados, período global e formatação.
 * Tudo aqui é puro (sem Firestore, sem React) para os agregadores serem testáveis.
 */

// ---------------------------------------------------------------------------
// Tipos "lite" — o shape mínimo que os relatórios precisam de cada coleção
// ---------------------------------------------------------------------------
export interface LeadLite {
  id: string;
  userId: string;
  nome: string;
  etapa: string;
  origem?: string;
  origemTipo?: string;
  origemPropaganda?: string;
  createdAtMs: number | null;
  /** dueDates (ms) das tarefas pendentes espelhadas no doc do lead */
  pendentesMs: number[];
  /** valor pt-BR da venda lançada (ex.: "750.000") — fallback quando a nota não traz o valor */
  vendaValor?: string;
  /** motivo do descarte gravado no lead — fallback quando a nota não traz o motivo */
  descartadoMotivo?: string;
  /** quem descartou — o userId pode migrar pra conta da imobiliária depois do descarte */
  descartadoPor?: string;
  /** true = ainda não teve conversa de verdade registrada (circuito.primeiroContatoEm ausente) */
  semPrimeiroContato?: boolean;
  /** tentativas de contato sem resposta acumuladas (circuito.tentativas) */
  tentativasAtuais?: number;
}

export interface CorretorLite {
  id: string;
  nome: string;
}

export interface InteracaoLite {
  leadId: string;
  type: string; // 'Ligação' | 'WhatsApp' | 'Visita' | 'Meet' | 'Etapa' | 'Venda' | 'Descarte' | 'Follow-up' | 'Tarefa *'
  /** texto narrado pelo circuito ('' quando ausente/legado) */
  notes: string;
  /** true quando a interação nasceu dos pop-ups do circuito guiado */
  circuito?: boolean;
  tsMs: number;
}

export interface TarefaLite {
  leadId: string;
  type: string; // 'Ligação' | 'WhatsApp' | 'Visita' | 'Outros'
  status: string; // 'pendente' | 'concluída' | 'cancelada'
  dueMs: number;
}

export interface ContribLite {
  corretorId: string;
  corretorNome: string;
  valor: number;
  dataVenda: string; // YYYY-MM-DD ('' se ausente)
}

export interface MeetsPeriodoLite {
  inicio: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
  contadores: Record<string, number>;
}

export interface AdsLeadLite {
  id: string;
  nome: string;
  campanhaNome: string;
  status: string;
  aceitoPor?: string;
  aceitoPorNome?: string;
  tempoAceiteSeg?: number;
  viaGeral: boolean;
  criadoEmMs: number | null;
  aceitoEmMs: number | null;
}

/** Contato de lista de ligação ativa (cold call), achatado com o corretor dono da lista. */
export interface LigAtivaContatoLite {
  corretorId: string;
  status: string; // 'pendente' | 'descartado' | 'crm'
  incluidoEmMs: number | null;
  descartadoEmMs: number | null;
}

/** Conjunto completo de dados brutos que alimenta os relatórios. */
export interface ReportSource {
  leads: LeadLite[];
  corretores: CorretorLite[];
  contribuicoes: ContribLite[];
  meets: MeetsPeriodoLite[];
  adsLeads: AdsLeadLite[];
  /** Contatos das listas de ligação ativa da imobiliária */
  ligacaoAtiva: LigAtivaContatoLite[];
  /** Interações dentro da janela estendida [janelaInicioMs, janelaFimMs] */
  interacoes: InteracaoLite[];
  /** Tarefas (subcoleção) com vencimento dentro da janela estendida */
  tarefas: TarefaLite[];
  janelaInicioMs: number;
}

// ---------------------------------------------------------------------------
// Datas defensivas (Timestamp | Date | {seconds} | string)
// ---------------------------------------------------------------------------
export function anyToMs(d: any): number | null {
  if (!d && d !== 0) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d.getTime();
  if (typeof d?.toDate === 'function') {
    try {
      const dt = d.toDate();
      return dt instanceof Date && !isNaN(dt.getTime()) ? dt.getTime() : null;
    } catch { return null; }
  }
  if (typeof d === 'object') {
    const sec = d.seconds ?? d._seconds;
    if (typeof sec === 'number') return sec * 1000;
    return null;
  }
  if (typeof d === 'string' || typeof d === 'number') {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt.getTime();
  }
  return null;
}

export const DIA_MS = 24 * 60 * 60 * 1000;

export function inicioDoDia(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

export function fimDoDia(d: Date): Date {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}

export function ymdLocal(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Período global
// ---------------------------------------------------------------------------
export type PeriodoPreset = 'semana' | 'mes' | 'trimestre' | '90d' | 'custom';

export interface Periodo {
  preset: PeriodoPreset;
  inicioMs: number;
  fimMs: number;
  /** período anterior de mesmo tamanho, imediatamente antes */
  prevInicioMs: number;
  prevFimMs: number;
  label: string;
}

export const PERIODO_PRESETS: { key: PeriodoPreset; label: string }[] = [
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mês' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: '90d', label: '90 dias' },
  { key: 'custom', label: 'Personalizado' },
];

const fmtDia = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function resolvePeriodo(preset: PeriodoPreset, customIni: string, customFim: string): Periodo {
  const hoje = new Date();
  let inicio: Date;
  let fim: Date = fimDoDia(hoje);

  if (preset === 'semana') {
    const dow = hoje.getDay(); // 0 = domingo
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() - ((dow + 6) % 7));
    inicio = inicioDoDia(seg);
  } else if (preset === 'mes') {
    inicio = inicioDoDia(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  } else if (preset === 'trimestre') {
    const qStart = Math.floor(hoje.getMonth() / 3) * 3;
    inicio = inicioDoDia(new Date(hoje.getFullYear(), qStart, 1));
  } else if (preset === '90d') {
    const d = new Date(hoje);
    d.setDate(d.getDate() - 89);
    inicio = inicioDoDia(d);
  } else {
    // custom — datas YYYY-MM-DD dos inputs; se inválido, cai no mês
    const pi = customIni ? new Date(`${customIni}T00:00:00`) : null;
    const pf = customFim ? new Date(`${customFim}T00:00:00`) : null;
    if (pi && pf && !isNaN(pi.getTime()) && !isNaN(pf.getTime()) && pi.getTime() <= pf.getTime()) {
      inicio = inicioDoDia(pi);
      fim = fimDoDia(pf);
    } else {
      inicio = inicioDoDia(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    }
  }

  const inicioMs = inicio.getTime();
  const fimMs = fim.getTime();
  const len = fimMs - inicioMs + 1;
  return {
    preset,
    inicioMs,
    fimMs,
    prevInicioMs: inicioMs - len,
    prevFimMs: inicioMs - 1,
    label: `${fmtDia(inicioMs)} → ${fmtDia(fimMs)}`,
  };
}

/** Janela estendida de busca: cobre o período anterior E os últimos 35 dias (p/ leads esquecidos). */
export function janelaBusca(p: Periodo): { inicioMs: number; fimMs: number } {
  const agora = Date.now();
  return {
    inicioMs: Math.min(p.prevInicioMs, agora - 35 * DIA_MS),
    fimMs: Math.max(p.fimMs, fimDoDia(new Date()).getTime()),
  };
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------
export function fmtInt(n: number): string {
  return n.toLocaleString('pt-BR');
}

export function fmtMoney(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000).toLocaleString('pt-BR')} mil`;
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

export function fmtMoneyFull(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function fmtPct(n: number): string {
  return `${Math.round(n)}%`;
}

export function fmtSeg(seg: number | null): string {
  if (seg === null || !isFinite(seg)) return '—';
  const s = Math.max(0, Math.round(seg));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${s % 60 ? ` ${s % 60} s` : ''}`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** Variação % vs período anterior; null quando não dá pra comparar. */
export function delta(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null;
  return ((atual - anterior) / anterior) * 100;
}

/** Paleta do funil por índice de etapa (repete com módulo). */
export const FUNIL_PALETTE = ['#FFE9A6', '#E8C547', '#D4A017', '#F59E0B', '#FF7A45', '#34D399'];
export const funilCor = (i: number) => FUNIL_PALETTE[i % FUNIL_PALETTE.length];
