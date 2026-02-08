'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, collection, getDoc, getDocs, query, orderBy } from 'firebase/firestore';

export interface ContribuicaoMeta {
  id: string;
  corretorId: string;
  corretorNome: string;
  valor: number;
  dataVenda?: string;
  createdAt: unknown;
}

export interface MetaTrimestral {
  valor: number;
  alcancado: number;
  percentual: number;
  inicio?: string;
  fim?: string;
}

export interface MetaMensal {
  valor: number;
  alcancado: number;
  percentual: number;
  inicio?: string;
  fim?: string;
}

export interface CorretorContribuicao {
  corretorId: string;
  corretorNome: string;
  total: number;
}

export interface MetasResultadosData {
  metaTrimestral: MetaTrimestral;
  metaMensal: MetaMensal | null;
  contribuicoesPorCorretor: CorretorContribuicao[];
  loading: boolean;
  error: string | null;
}

function parseMetaDoc(d: Record<string, unknown>) {
  const valor = typeof d.valor === 'number' ? d.valor : 0;
  const alcancado = typeof d.alcancado === 'number' ? d.alcancado : 0;
  const percentual = valor > 0 ? Math.round((alcancado / valor) * 100) : 0;
  return { valor, alcancado, percentual, inicio: d.inicio as string | undefined, fim: d.fim as string | undefined };
}

function isDataInRange(dataStr: string | undefined, inicio?: string, fim?: string): boolean {
  if (!dataStr || !inicio || !fim) return false;
  const d = dataStr.slice(0, 10);
  return d >= inicio.slice(0, 10) && d <= fim.slice(0, 10);
}

export function useMetasResultadosData(imobiliariaId: string | undefined): MetasResultadosData {
  const [metaDoc, setMetaDoc] = useState<Record<string, unknown> | null>(null);
  const [contribuicoes, setContribuicoes] = useState<ContribuicaoMeta[]>([]);
  const [loading, setLoading] = useState(!!imobiliariaId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imobiliariaId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const metaRef = doc(db, 'metas', imobiliariaId);
        const metaSnap = await getDoc(metaRef);
        if (cancelled) return;
        if (metaSnap.exists()) {
          setMetaDoc(metaSnap.data() as Record<string, unknown>);
        } else {
          setMetaDoc(null);
        }
        const contribRef = collection(db, 'metas', imobiliariaId, 'contribuicoes');
        const contribSnap = await getDocs(query(contribRef, orderBy('createdAt', 'desc')));
        if (cancelled) return;
        setContribuicoes(
          contribSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              corretorId: data.corretorId ?? '',
              corretorNome: data.corretorNome ?? '',
              valor: Number(data.valor) ?? 0,
              dataVenda: data.dataVenda ?? undefined,
              createdAt: data.createdAt,
            };
          })
        );
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar metas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imobiliariaId]);

  return useMemo(() => {
    const doc = metaDoc ?? {};
    const valorTrim = typeof doc.valor === 'number' ? doc.valor : 0;
    const alcancadoTrim = typeof doc.alcancado === 'number' ? doc.alcancado : contribuicoes.reduce((s, c) => s + c.valor, 0);
    const percentualTrim = valorTrim > 0 ? Math.round((alcancadoTrim / valorTrim) * 100) : 0;
    const metaTrimestral: MetaTrimestral = {
      valor: valorTrim,
      alcancado: alcancadoTrim,
      percentual: percentualTrim,
      inicio: doc.inicio as string | undefined,
      fim: doc.fim as string | undefined,
    };

    const inicioMensal = doc.inicioMensal as string | undefined;
    const fimMensal = doc.fimMensal as string | undefined;
    const valorMensal = typeof doc.valorMensal === 'number' ? doc.valorMensal : 0;
    let metaMensal: MetaMensal | null = null;
    if (valorMensal > 0 && inicioMensal && fimMensal) {
      const alcancadoMensal = contribuicoes
        .filter((c) => isDataInRange(c.dataVenda, inicioMensal, fimMensal))
        .reduce((s, c) => s + c.valor, 0);
      metaMensal = {
        valor: valorMensal,
        alcancado: alcancadoMensal,
        percentual: valorMensal > 0 ? Math.round((alcancadoMensal / valorMensal) * 100) : 0,
        inicio: inicioMensal,
        fim: fimMensal,
      };
    }

    const byCorretor = new Map<string, CorretorContribuicao>();
    contribuicoes.forEach((c) => {
      const id = c.corretorId || c.corretorNome || '?';
      const existing = byCorretor.get(id);
      if (existing) {
        existing.total += c.valor;
      } else {
        byCorretor.set(id, { corretorId: c.corretorId, corretorNome: c.corretorNome || 'Sem nome', total: c.valor });
      }
    });
    const contribuicoesPorCorretor = Array.from(byCorretor.values()).sort((a, b) => b.total - a.total);

    return {
      metaTrimestral,
      metaMensal,
      contribuicoesPorCorretor,
      loading,
      error,
    };
  }, [metaDoc, contribuicoes, loading, error]);
}
