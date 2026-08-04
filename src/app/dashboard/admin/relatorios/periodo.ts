'use client';

/**
 * PERÍODO DE ANÁLISE — a régua de tempo dos dois relatórios.
 *
 * O gestor analisa "a semana", "o mês", "o trimestre" — e SEMPRE comparando
 * com o período equivalente anterior (semana vs semana passada, mês vs mês
 * passado). Este módulo dá a janela [iniMs, fimMs), a anterior de mesmo
 * tamanho, navegação (‹ ›) e a série semanal pra tendência.
 */

const DIA = 24 * 60 * 60 * 1000;

export type TipoPeriodo = 'semana' | 'mes' | 'trimestre' | '30d';

export interface PeriodoAnalise {
  tipo: TipoPeriodo;
  /** deslocamento: 0 = corrente, -1 = anterior… */
  offset: number;
  iniMs: number;
  /** exclusivo */
  fimMs: number;
  label: string;
  ehCorrente: boolean;
}

const fmtDia = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function periodoDe(tipo: TipoPeriodo, offset: number, agora = Date.now()): PeriodoAnalise {
  const d = new Date(agora);
  d.setHours(0, 0, 0, 0);

  if (tipo === 'semana') {
    const dow = (d.getDay() + 6) % 7; // 0 = segunda
    const ini = d.getTime() - dow * DIA + offset * 7 * DIA;
    const fim = ini + 7 * DIA;
    return { tipo, offset, iniMs: ini, fimMs: fim, ehCorrente: offset === 0, label: `${fmtDia(ini)} a ${fmtDia(fim - 1)}` };
  }
  if (tipo === 'mes') {
    const ini = new Date(d.getFullYear(), d.getMonth() + offset, 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + offset + 1, 1);
    return { tipo, offset, iniMs: ini.getTime(), fimMs: fim.getTime(), ehCorrente: offset === 0, label: `${MESES[ini.getMonth()]}/${ini.getFullYear()}` };
  }
  if (tipo === 'trimestre') {
    const triBase = Math.floor(d.getMonth() / 3) + offset;
    const ini = new Date(d.getFullYear(), triBase * 3, 1);
    const fim = new Date(d.getFullYear(), triBase * 3 + 3, 1);
    return { tipo, offset, iniMs: ini.getTime(), fimMs: fim.getTime(), ehCorrente: offset === 0, label: `${MESES[ini.getMonth()]}–${MESES[fim.getMonth() === 0 ? 11 : fim.getMonth() - 1]}/${ini.getFullYear()}` };
  }
  // 30d corridos, terminando hoje (offset desloca a janela inteira)
  const fim = d.getTime() + DIA + offset * 30 * DIA;
  const ini = fim - 30 * DIA;
  return { tipo, offset, iniMs: ini, fimMs: fim, ehCorrente: offset === 0, label: `${fmtDia(ini)} a ${fmtDia(fim - 1)}` };
}

/**
 * O período equivalente ANTERIOR (mesma duração, imediatamente antes).
 * SEMPRE derivado do próprio `p` — nunca de Date.now(): um período memoizado
 * que atravessa a virada de mês/trimestre re-ancorado no relógio devolveria
 * o MESMO intervalo como "anterior" e zeraria todos os deltas em silêncio.
 */
export function periodoAnterior(p: PeriodoAnalise): { iniMs: number; fimMs: number } {
  if (p.tipo === 'mes' || p.tipo === 'trimestre') {
    // âncora no 1º dia do próprio período; offset -1 anda um mês/trimestre pra trás
    const a = periodoDe(p.tipo, -1, p.iniMs + 12 * 60 * 60 * 1000);
    return { iniMs: a.iniMs, fimMs: a.fimMs };
  }
  const dur = p.fimMs - p.iniMs;
  return { iniMs: p.iniMs - dur, fimMs: p.iniMs };
}

/** N janelas semanais terminando na última semana FECHADA (pra série de tendência). */
export function serieSemanas(n: number, agora = Date.now()): { iniMs: number; fimMs: number; label: string }[] {
  const out: { iniMs: number; fimMs: number; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(agora);
    d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7;
    const ini = d.getTime() - dow * DIA - i * 7 * DIA;
    out.push({ iniMs: ini, fimMs: ini + 7 * DIA, label: fmtDia(ini) });
  }
  return out;
}

export const PRESETS_PERIODO: { tipo: TipoPeriodo; label: string }[] = [
  { tipo: 'semana', label: 'Semana' },
  { tipo: 'mes', label: 'Mês' },
  { tipo: 'trimestre', label: 'Trimestre' },
  { tipo: '30d', label: '30 dias' },
];
