'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { usePipelineStages } from '@/context/PipelineStagesContext';

export interface LeadFunil {
  id: string;
  userId?: string;
  etapa?: string;
  [key: string]: unknown;
}

export interface CorretorFunil {
  id: string;
  nome: string;
}

export interface FunilPorEtapa {
  [etapa: string]: number;
}

export interface FunilCorretor {
  id: string;
  nome: string;
  total: number;
  porEtapa: FunilPorEtapa;
}

export interface FunilVendasData {
  funilCorporativo: FunilPorEtapa;
  funilPorCorretor: FunilCorretor[];
  totalCorporativo: number;
  loading: boolean;
  error: string | null;
}

export function useFunilVendasData(imobiliariaId: string | undefined, corretoresVisiveisIds?: string[]): FunilVendasData {
  const { stages, normalizeEtapa } = usePipelineStages();
  const [leads, setLeads] = useState<LeadFunil[]>([]);
  const [corretores, setCorretores] = useState<CorretorFunil[]>([]);
  const [loading, setLoading] = useState(!!imobiliariaId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imobiliariaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubLeads = onSnapshot(
      query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeadFunil));
        setLeads(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Erro ao carregar leads');
        setLoading(false);
      }
    );
    const unsubUsers = onSnapshot(
      query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', imobiliariaId),
        where('aprovado', '==', true)
      ),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, nome: data.nome || 'Sem nome' } as CorretorFunil;
        });
        setCorretores(list);
      },
      () => {}
    );
    return () => {
      unsubLeads();
      unsubUsers();
    };
  }, [imobiliariaId]);

  return useMemo(() => {
    const setVisiveis = corretoresVisiveisIds?.length ? new Set(corretoresVisiveisIds) : null;
    const leadsFiltrados = setVisiveis ? leads.filter((l) => l.userId && setVisiveis.has(l.userId)) : leads;
    const corretoresFiltrados = setVisiveis ? corretores.filter((c) => setVisiveis.has(c.id)) : corretores;

    const funilCorporativo: FunilPorEtapa = {};
    stages.forEach((e) => { funilCorporativo[e] = 0; });
    leadsFiltrados.forEach((l) => {
      const etapa = normalizeEtapa(l.etapa);
      funilCorporativo[etapa] = (funilCorporativo[etapa] || 0) + 1;
    });

    const totalCorporativo = leadsFiltrados.length;

    const porCorretorMap = new Map<string, FunilPorEtapa>();
    corretoresFiltrados.forEach((c) => {
      const porEtapa: FunilPorEtapa = {};
      stages.forEach((e) => { porEtapa[e] = 0; });
      porCorretorMap.set(c.id, porEtapa);
    });
    leadsFiltrados.forEach((l) => {
      const uid = l.userId;
      if (!uid) return;
      let porEtapa = porCorretorMap.get(uid);
      if (!porEtapa) {
        porEtapa = {};
        stages.forEach((e) => { porEtapa![e] = 0; });
        porEtapa[normalizeEtapa(l.etapa)] = 1;
        porCorretorMap.set(uid, porEtapa);
      } else {
        const etapa = normalizeEtapa(l.etapa);
        porEtapa[etapa] = (porEtapa[etapa] || 0) + 1;
      }
    });

    const funilPorCorretor: FunilCorretor[] = corretoresFiltrados
      .map((c) => {
        const porEtapa = porCorretorMap.get(c.id) || {};
        const total = Object.values(porEtapa).reduce((a, b) => a + b, 0);
        return { id: c.id, nome: c.nome, total, porEtapa };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      funilCorporativo,
      funilPorCorretor,
      totalCorporativo,
      loading,
      error,
    };
  }, [leads, corretores, loading, error, stages, normalizeEtapa, corretoresVisiveisIds?.join(',')]);
}
