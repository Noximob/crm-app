/**
 * AUDITORIA DE ATENDIMENTO — as diretrizes (a régua) e as contas de tempo.
 *
 * O CRM monta um pacote de dados de um corretor; a análise acontece FORA,
 * cruzando o que está registrado aqui com as conversas reais de WhatsApp.
 * Este módulo guarda a régua contra a qual esse cruzamento é julgado.
 *
 * Duas decisões da casa moram aqui e valem pra todo o resto:
 *
 * 1. HORÁRIO ÚTIL — das 20h às 9h não conta. Não dá pra cobrar cadência de
 *    madrugada: um lead que entra 22h e é atendido 9h05 do dia seguinte
 *    esperou 11 horas no relógio e ~5 minutos úteis. É o número útil que
 *    entra na cobrança.
 * 2. TEMPO DE REGISTRO ≠ TEMPO DE ATENDIMENTO — o CRM só sabe quando o
 *    corretor ANOTOU. Quem ficou 2h em ligação e anotou depois aparece como
 *    lento aqui e rápido no WhatsApp. O pacote leva o aviso junto.
 */
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const HORA = 3_600_000;

/**
 * Quando o time começou a USAR o CRM de verdade. Antes disso a base existe
 * mas está vazia de trabalho — puxar período anterior faz o corretor parecer
 * parado quando na verdade o sistema é que não estava em uso. Toda tela de
 * auditoria ancora o período aqui.
 */
export const DADOS_CONFIAVEIS_DESDE = '2026-07-15';
export const dadosConfiaveisDesdeMs = (): number => {
  const [a, m, d] = DADOS_CONFIAVEIS_DESDE.split('-').map(Number);
  return new Date(a, m - 1, d).getTime();
};

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface PassoCadencia {
  contato: number;
  /** dia ÚTIL de cadência contado a partir da entrada do lead (0 = mesmo dia) */
  dia: number;
  acao: string;
}

export interface HorarioUtil {
  /** hora em que a cobrança começa a contar (0-23) */
  inicioHora: number;
  /** hora em que para de contar (0-23, maior que inicioHora) */
  fimHora: number;
  contarSabado: boolean;
  contarDomingo: boolean;
}

export interface PrazosAuditoria {
  /** minutos ÚTEIS até o 1º contato ser registrado */
  primeiroContatoMaximoMin: number;
  /** horas ÚTEIS de atraso a partir das quais a tarefa "deixou atrasar" */
  tarefaAtrasadaHoras: number;
  /** dias corridos sem nenhum toque pra o lead virar "parado" */
  leadParadoDias: number;
}

export interface PromptsAuditoria {
  principal: string;
  formatoRelatorio: string;
  instrucoesLeitura: string;
}

export interface DiretrizesAuditoria {
  /** rótulo da versão vigente — vai em meta.versao_diretrizes de todo pacote */
  versao: string;
  cadencia: PassoCadencia[];
  prazos: PrazosAuditoria;
  horarioUtil: HorarioUtil;
  /** o que conta como descarte legítimo — a casa preenche, não inventamos */
  criteriosDescarteValido: string[];
  /** quanto vale cada dimensão na nota — a casa preenche */
  pesosAvaliacao: { dimensao: string; peso: number }[];
  tomDoRelatorio: string;
  prompts: PromptsAuditoria;
  atualizadoEm?: unknown;
  atualizadoPor?: string;
}

// ---------------------------------------------------------------------------
// Padrão — a cadência dos 6 contatos que a casa usa hoje
// ---------------------------------------------------------------------------

export const CADENCIA_PADRAO: PassoCadencia[] = [
  { contato: 1, dia: 0, acao: 'Ligação imediata. Se não atender, áudio se identificando, explicando o motivo e perguntando o melhor horário.' },
  { contato: 2, dia: 1, acao: 'Ligar em período oposto ao da 1ª tentativa. Se não atender, mandar o conteúdo do áudio por escrito.' },
  { contato: 3, dia: 3, acao: '5 fotos ou vídeo do decorado + mensagem curta + áudio com pitch de 40 segundos.' },
  { contato: 4, dia: 4, acao: 'Nova ligação.' },
  { contato: 5, dia: 7, acao: 'Mensagem descontraída pedindo horário na agenda, inclusive fora do horário comercial.' },
  { contato: 6, dia: 10, acao: 'Mensagem de encerramento, deixando a porta aberta.' },
];

export const DIRETRIZES_PADRAO: DiretrizesAuditoria = {
  versao: 'v1',
  cadencia: CADENCIA_PADRAO,
  prazos: {
    primeiroContatoMaximoMin: 15,
    tarefaAtrasadaHoras: 24,
    leadParadoDias: 7,
  },
  horarioUtil: { inicioHora: 9, fimHora: 20, contarSabado: true, contarDomingo: false },
  criteriosDescarteValido: [],
  pesosAvaliacao: [],
  tomDoRelatorio: 'Direto, em fatos e acordos. Sempre com data e trecho como evidência. Nunca em traços de personalidade.',
  prompts: { principal: '', formatoRelatorio: '', instrucoesLeitura: '' },
};

// ---------------------------------------------------------------------------
// Normalização — aceita qualquer doc salvo e devolve o shape completo
// ---------------------------------------------------------------------------

const num = (v: unknown, min: number, max: number, fb: number): number => {
  const n = Number(v);
  if (!isFinite(n)) return fb;
  return Math.min(max, Math.max(min, Math.round(n)));
};
const txt = (v: unknown, fb = ''): string => (typeof v === 'string' ? v : fb);

export function normalizarDiretrizes(raw: unknown): DiretrizesAuditoria {
  const d = (raw || {}) as Record<string, any>;
  const p = (d.prazos || {}) as Record<string, unknown>;
  const h = (d.horarioUtil || {}) as Record<string, unknown>;
  const pr = (d.prompts || {}) as Record<string, unknown>;

  const cadencia: PassoCadencia[] = Array.isArray(d.cadencia) && d.cadencia.length
    ? d.cadencia.map((x: Record<string, unknown>, i: number) => ({
        contato: num(x?.contato, 1, 99, i + 1),
        dia: num(x?.dia, 0, 365, 0),
        acao: txt(x?.acao),
      })).sort((a: PassoCadencia, b: PassoCadencia) => a.dia - b.dia || a.contato - b.contato)
    : CADENCIA_PADRAO;

  const inicioHora = num(h.inicioHora, 0, 23, DIRETRIZES_PADRAO.horarioUtil.inicioHora);
  // fim tem que ser depois do início; se vier inválido, cai no padrão
  const fimBruto = num(h.fimHora, 1, 24, DIRETRIZES_PADRAO.horarioUtil.fimHora);

  return {
    versao: txt(d.versao, DIRETRIZES_PADRAO.versao),
    cadencia,
    prazos: {
      primeiroContatoMaximoMin: num(p.primeiroContatoMaximoMin, 1, 10_080, DIRETRIZES_PADRAO.prazos.primeiroContatoMaximoMin),
      tarefaAtrasadaHoras: num(p.tarefaAtrasadaHoras, 1, 720, DIRETRIZES_PADRAO.prazos.tarefaAtrasadaHoras),
      leadParadoDias: num(p.leadParadoDias, 1, 180, DIRETRIZES_PADRAO.prazos.leadParadoDias),
    },
    horarioUtil: {
      inicioHora,
      fimHora: fimBruto > inicioHora ? fimBruto : DIRETRIZES_PADRAO.horarioUtil.fimHora,
      contarSabado: h.contarSabado !== false,
      contarDomingo: h.contarDomingo === true,
    },
    criteriosDescarteValido: Array.isArray(d.criteriosDescarteValido)
      ? d.criteriosDescarteValido.filter((s: unknown) => typeof s === 'string' && s.trim()) : [],
    pesosAvaliacao: Array.isArray(d.pesosAvaliacao)
      ? d.pesosAvaliacao
          .filter((x: Record<string, unknown>) => x && typeof x.dimensao === 'string' && x.dimensao.trim())
          .map((x: Record<string, unknown>) => ({ dimensao: String(x.dimensao), peso: num(x.peso, 0, 100, 0) }))
      : [],
    tomDoRelatorio: txt(d.tomDoRelatorio, DIRETRIZES_PADRAO.tomDoRelatorio),
    prompts: {
      principal: txt(pr.principal),
      formatoRelatorio: txt(pr.formatoRelatorio),
      instrucoesLeitura: txt(pr.instrucoesLeitura),
    },
    atualizadoEm: d.atualizadoEm,
    atualizadoPor: txt(d.atualizadoPor),
  };
}

// ---------------------------------------------------------------------------
// Persistência — vigente + histórico de versões
// ---------------------------------------------------------------------------

export const refDiretrizes = (imobiliariaId: string) => doc(db, 'configAuditoria', imobiliariaId);

export async function carregarDiretrizes(imobiliariaId: string | undefined): Promise<DiretrizesAuditoria> {
  if (!imobiliariaId || imobiliariaId === 'espelho-demo') return DIRETRIZES_PADRAO;
  try {
    const snap = await getDoc(refDiretrizes(imobiliariaId));
    return normalizarDiretrizes(snap.exists() ? snap.data() : null);
  } catch {
    return DIRETRIZES_PADRAO;
  }
}

/** Rótulo automático da próxima versão: v3 - 2026-08-10 */
export function proximaVersao(atual: string): string {
  const m = /^v(\d+)/i.exec(atual.trim());
  const n = m ? parseInt(m[1], 10) + 1 : 1;
  const hoje = new Date();
  const ymd = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  return `v${n} - ${ymd}`;
}

/**
 * Salva a régua vigente E arquiva a versão. Meses depois é o que permite
 * saber se a régua mudou no meio de uma comparação entre rodadas.
 */
export async function salvarDiretrizes(imobiliariaId: string, d: DiretrizesAuditoria, porNome: string): Promise<DiretrizesAuditoria> {
  const nova = normalizarDiretrizes({ ...d, versao: proximaVersao(d.versao) });
  const payload = { ...nova, atualizadoEm: serverTimestamp(), atualizadoPor: porNome, imobiliariaId };
  await setDoc(refDiretrizes(imobiliariaId), payload, { merge: true });
  // histórico imutável (a vigente é sobrescrita; esta coleção não)
  await addDoc(collection(db, 'configAuditoria', imobiliariaId, 'versoes'), payload);
  return nova;
}

// ---------------------------------------------------------------------------
// Tempo ÚTIL — o coração da justiça da cobrança
// ---------------------------------------------------------------------------

/**
 * Horas ÚTEIS entre dois instantes, descontando fora do expediente e os dias
 * que a casa não conta. Reconstrói a janela dia a dia (em vez de somar
 * offsets) pra não escorregar em virada de horário de verão.
 */
export function horasUteisEntre(iniMs: number, fimMs: number, h: HorarioUtil): number {
  if (!(fimMs > iniMs)) return 0;
  if (!(h.fimHora > h.inicioHora)) return (fimMs - iniMs) / HORA; // janela inválida: cai no corrido
  let total = 0;
  const cursor = new Date(iniMs);
  cursor.setHours(0, 0, 0, 0);
  for (let guarda = 0; guarda < 800 && cursor.getTime() < fimMs; guarda++) {
    const dow = cursor.getDay();
    const conta = dow === 0 ? h.contarDomingo : dow === 6 ? h.contarSabado : true;
    if (conta) {
      const jIni = new Date(cursor); jIni.setHours(h.inicioHora, 0, 0, 0);
      const jFim = new Date(cursor); jFim.setHours(h.fimHora, 0, 0, 0);
      const a = Math.max(iniMs, jIni.getTime());
      const b = Math.min(fimMs, jFim.getTime());
      if (b > a) total += (b - a) / HORA;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.round(total * 100) / 100;
}

export const minutosUteisEntre = (iniMs: number, fimMs: number, h: HorarioUtil): number =>
  Math.round(horasUteisEntre(iniMs, fimMs, h) * 60);

/** Rótulo curto do horário útil, pro JSON e pra tela. */
export const descreverHorarioUtil = (h: HorarioUtil): string => {
  const dias = h.contarDomingo ? 'todos os dias' : h.contarSabado ? 'de segunda a sábado' : 'em dias úteis';
  return `${String(h.inicioHora).padStart(2, '0')}h às ${String(h.fimHora).padStart(2, '0')}h, ${dias}`;
};
