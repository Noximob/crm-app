'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import type { PeriodKey } from './_lib/configTypes';

interface Corretor {
  id: string;
  nome: string;
}

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

export default function RelatorioIndividualPage() {
  const { userData } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [selectedCorretor, setSelectedCorretor] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('mes');
  const [metaAno, setMetaAno] = useState<number>(0);
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imobiliariaId) {
      setLoadingList(false);
      return;
    }
    const load = async () => {
      const q = query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', imobiliariaId),
        where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo']),
        where('aprovado', '==', true)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        nome: (d.data().nome as string) || (d.data().email as string) || 'Sem nome',
      }));
      setCorretores(list);
      if (list.length && !selectedCorretor) setSelectedCorretor(list[0].id);
      setLoadingList(false);
    };
    load();
  }, [imobiliariaId]);

  useEffect(() => {
    if (!imobiliariaId) return;
    getDoc(doc(db, 'metas', imobiliariaId)).then((snap) => {
      if (snap.exists()) {
        const v = Number(snap.data()?.valorMensal);
        if (v > 0 && metaAno === 0) setMetaAno(v * 12);
      }
    });
  }, [imobiliariaId]);

  const handleGerar = async () => {
    if (!imobiliariaId || !selectedCorretor) return;
    setLoading(true);
    setError(null);
    try {
      // Aqui você reconstrói o relatório do zero
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar.');
    } finally {
      setLoading(false);
    }
  };

  if (!imobiliariaId) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Acesso restrito à imobiliária.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/admin"
          className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-[#D4A017] transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Voltar
        </Link>
        <span className="text-gray-500">|</span>
        <h1 className="text-base font-bold text-white">Relatório individual do corretor</h1>
      </div>

      <header className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Corretor</label>
            <select
              value={selectedCorretor}
              onChange={(e) => setSelectedCorretor(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A017]/50"
              disabled={loadingList}
            >
              {loadingList && <option value="">Carregando...</option>}
              {!loadingList && corretores.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#23283A]">
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Período</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4A017]/50"
            >
              <option value="dia" className="bg-[#23283A]">Diário</option>
              <option value="semana" className="bg-[#23283A]">Semanal</option>
              <option value="mes" className="bg-[#23283A]">Mensal</option>
              <option value="trimestre" className="bg-[#23283A]">Trimestral</option>
              <option value="semestre" className="bg-[#23283A]">Semestral</option>
              <option value="ano" className="bg-[#23283A]">Anual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Meta anual (R$)</label>
            <input
              type="number"
              min={0}
              step={10000}
              value={metaAno || ''}
              onChange={(e) => setMetaAno(Number(e.target.value) || 0)}
              placeholder="Ex: 2400000"
              className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#D4A017]/50"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGerar}
            disabled={loading || !selectedCorretor}
            className="px-5 py-2.5 rounded-lg bg-[#D4A017] text-white font-semibold text-sm hover:bg-[#B8860B] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </header>

      {!loading && !loadingList && selectedCorretor && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400">
            Escolha o corretor, o período e a meta. Clique em <strong className="text-[#D4A017]">Gerar relatório</strong>.
          </p>
          <p className="text-sm text-gray-500 mt-2">Relatório em construção — pronto para ser montado do zero.</p>
        </div>
      )}
    </div>
  );
}
