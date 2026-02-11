'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { fetchRelatorioIndividual, type PeriodKey, type RelatorioIndividualData } from './_lib/reportData';
import ReportCard from './_components/ReportCard';

interface Corretor {
  id: string;
  nome: string;
}

const SectionTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white relative z-10">{children}</h2>
    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#F59E0B] to-[#FCD34D] rounded-r-full opacity-60" />
  </div>
);

export default function RelatorioIndividualPage() {
  const { userData } = useAuth();
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [selectedCorretor, setSelectedCorretor] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('dia');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [report, setReport] = useState<RelatorioIndividualData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const imobiliariaId = userData?.imobiliariaId;

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

  const handleGerar = async () => {
    if (!imobiliariaId || !selectedCorretor) return;
    const corretor = corretores.find((c) => c.id === selectedCorretor);
    if (!corretor) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await fetchRelatorioIndividual(
        imobiliariaId,
        selectedCorretor,
        corretor.nome,
        period
      );
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar relatório.');
    } finally {
      setLoading(false);
    }
  };

  const handleBaixarImagem = async () => {
    const el = document.getElementById('relatorio-individual-card');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `relatorio-${report?.corretorNome.replace(/\s+/g, '-') || 'corretor'}-${report?.dataInicio || 'hoje'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  if (!imobiliariaId) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Acesso restrito à imobiliária.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <SectionTitle className="mb-6">Relatório individual por corretor</SectionTitle>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-8">
        Gere um relatório completo (dia, semana ou mês) com números, crescimentos e perdas. Baixe em uma imagem para enviar por WhatsApp ao corretor ou ao agente de análise (ex.: ChatGPT).
      </p>

      <div className="bg-white dark:bg-[#23283A] rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Corretor</label>
            <select
              value={selectedCorretor}
              onChange={(e) => setSelectedCorretor(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#181C23] text-gray-900 dark:text-white px-3 py-2 text-sm"
              disabled={loadingList}
            >
              {loadingList && (
                <option value="">Carregando...</option>
              )}
              {!loadingList && corretores.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#181C23] text-gray-900 dark:text-white px-3 py-2 text-sm"
            >
              <option value="dia">Dia (hoje)</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGerar}
              disabled={loading || !selectedCorretor}
              className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-[#F59E0B] text-white font-semibold text-sm hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Gerando...' : 'Gerar relatório'}
            </button>
          </div>
        </div>
        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>

      {report && (
        <div ref={cardRef} className="flex flex-col items-center">
          <ReportCard data={report} />
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleBaixarImagem}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition"
            >
              Baixar como imagem
            </button>
            <button
              type="button"
              onClick={() => setReport(null)}
              className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
