/**
 * Bounds do período e % decorrido (para pace).
 */

import type { PeriodKey } from './configTypes';

export function getPeriodBounds(period: PeriodKey): { start: Date; end: Date; progressPct: number } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'dia':
      return { start, end, progressPct: 1 };
    case 'semana': {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      const totalDays = 7;
      const elapsed = end.getDay() === 0 ? 6 : end.getDay() - 1;
      const progressPct = (elapsed + (end.getHours() / 24)) / totalDays;
      return { start, end, progressPct: Math.min(1, Math.max(0, progressPct)) };
    }
    case 'mes': {
      start.setDate(1);
      const totalDays = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const elapsed = end.getDate() - 1 + (end.getHours() / 24);
      const progressPct = elapsed / totalDays;
      return { start, end, progressPct: Math.min(1, Math.max(0, progressPct)) };
    }
    case 'trimestre': {
      const q = Math.floor(start.getMonth() / 3) + 1;
      start.setMonth((q - 1) * 3);
      start.setDate(1);
      const endTrim = new Date(start.getFullYear(), start.getMonth() + 3, 0);
      const totalDays = endTrim.getDate();
      const elapsed = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
      const progressPct = elapsed / totalDays;
      return { start, end, progressPct: Math.min(1, Math.max(0, progressPct)) };
    }
    case 'semestre': {
      const s = start.getMonth() < 6 ? 0 : 6;
      start.setMonth(s);
      start.setDate(1);
      const endSem = new Date(start.getFullYear(), start.getMonth() + 6, 0);
      const totalDays = endSem.getDate() + (5 * 30);
      const elapsed = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
      const progressPct = elapsed / totalDays;
      return { start, end, progressPct: Math.min(1, Math.max(0, progressPct)) };
    }
    case 'ano': {
      start.setMonth(0);
      start.setDate(1);
      const totalDays = new Date(start.getFullYear(), 12, 0).getDate() + 334;
      const elapsed = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
      const progressPct = elapsed / totalDays;
      return { start, end, progressPct: Math.min(1, Math.max(0, progressPct)) };
    }
    default:
      start.setDate(1);
      return { start, end, progressPct: 0.5 };
  }
}

/** Converte PeriodKey para o formato antigo (dia/semana/mes) usado por fetchRelatorioIndividual */
export function toLegacyPeriod(period: PeriodKey): 'dia' | 'semana' | 'mes' {
  if (period === 'dia' || period === 'semana' || period === 'mes') return period;
  return 'mes';
}

export function formatPeriodLabel(period: PeriodKey): string {
  const labels: Record<PeriodKey, string> = {
    dia: 'Diário',
    semana: 'Semanal',
    mes: 'Mensal',
    trimestre: 'Trimestral',
    semestre: 'Semestral',
    ano: 'Anual',
  };
  return labels[period] ?? period;
}
