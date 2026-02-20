'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { AlummaLogoFullInline } from '@/components/AlummaLogo';
import { DEFAULT_PIPELINE_STAGES_WITH_META } from '@/lib/pipelineStagesConfig';

const MAX_LEADS = 500;

/** Dados de exemplo para visualização e impressão em PDF (Alumma + Nox) */
function buildMockLeads(): LeadRow[] {
  const etapas = DEFAULT_PIPELINE_STAGES_WITH_META.map((s) => s.label);
  const tarefas = [
    { type: 'Ligação', description: 'Retornar contato sobre planta', data: '20/02 14:00' },
    { type: 'WhatsApp', description: 'Enviar vídeo do empreendimento', data: '20/02 10:30' },
    { type: 'Visita', description: 'Visita ao stand — torre A', data: '21/02 15:00' },
    { type: 'Ligação', description: 'Confirmar documentação', data: '22/02 09:00' },
    { type: 'WhatsApp', description: 'Enviar proposta comercial', data: '19/02 18:00' },
    { type: 'Visita', description: 'Segunda visita — acabamento', data: '25/02 11:00' },
    { type: 'Ligação', description: 'Follow-up pós-visita', data: '20/02 16:00' },
    undefined,
  ];
  const entradasMock = ['05/02/2025 09:15', '08/02/2025 14:20', '10/02/2025 11:00', '11/02/2025 16:45', '12/02/2025 10:30', '13/02/2025 09:00', '14/02/2025 14:00', '15/02/2025 11:20', '15/02/2025 17:00', '16/02/2025 08:45', '16/02/2025 13:10', '17/02/2025 10:00', '17/02/2025 15:30', '18/02/2025 09:40', '18/02/2025 14:22', '19/02/2025 08:00', '19/02/2025 11:15', '19/02/2025 16:00'];
  const pessoas: Array<{ nome: string; email: string; telefone: string; etapa: string; entrouEm: string; qualificacao?: Record<string, string | string[]>; anotacoes?: string }> = [
    { nome: 'Ana Carolina Mendes', email: 'ana.mendes@email.com', telefone: '(11) 98765-4321', etapa: etapas[0], entrouEm: entradasMock[0], qualificacao: { Orçamento: 'R$ 800k–1,2M', Interesse: '3 dorm' }, anotacoes: 'Veio pelo site. Primeiro contato em 18/02. Interesse em unidades de alto padrão.' },
    { nome: 'Bruno Ferreira Santos', email: 'bruno.santos@empresa.com', telefone: '(21) 99876-1234', etapa: etapas[1], entrouEm: entradasMock[1], qualificacao: { Perfil: 'Investidor', Orçamento: 'R$ 1,5M' }, anotacoes: 'Qualificado em 17/02. Quer 2 unidades para revenda. Enviar proposta até sexta.' },
    { nome: 'Carla Oliveira Lima', email: 'carla.lima@gmail.com', telefone: '(11) 97654-3210', etapa: etapas[2], entrouEm: entradasMock[2], qualificacao: { Finalidade: 'Moradia', Prazo: '6 meses' }, anotacoes: 'Visitou stand dia 15/02. Gostou do jardim e da área gourmet. Pediu simulação com subsídio.' },
    { nome: 'Diego Rodrigues Alves', email: 'diego.alves@outlook.com', telefone: '(31) 99123-4567', etapa: etapas[2], entrouEm: entradasMock[3], qualificacao: {}, anotacoes: 'Apresentação feita por vídeo. Agendar visita presencial.' },
    { nome: 'Elena Souza Costa', email: 'elena.costa@yahoo.com.br', telefone: '(41) 98765-1111', etapa: etapas[3], entrouEm: entradasMock[4], qualificacao: { Financiamento: 'FGTS + Subsídio' }, anotacoes: 'Ligação agendada para 20/02 14h. Objetivo: fechar documentação.' },
    { nome: 'Fernando Martins Ribeiro', email: 'fernando.m@corp.com', telefone: '(51) 99999-2222', etapa: etapas[4], entrouEm: entradasMock[5], qualificacao: { Perfil: 'Primeira casa', Renda: 'Aprovado' }, anotacoes: 'Visita agendada 21/02 15h. Levar proposta de financiamento.' },
    { nome: 'Gabriela Nunes Pereira', email: 'gabi.nunes@email.com', telefone: '(11) 91234-5678', etapa: etapas[5], entrouEm: entradasMock[6], qualificacao: { Proposta: 'Enviada', Valor: 'R$ 1,1M' }, anotacoes: 'Em negociação. Aguardando retorno do banco. Cliente ansioso.' },
    { nome: 'Henrique Castro Silva', email: 'henrique.silva@gmail.com', telefone: '(21) 98888-3333', etapa: etapas[5], entrouEm: entradasMock[7], qualificacao: {}, anotacoes: 'Proposta entregue. Reunião de alinhamento com advogado em 22/02.' },
    { nome: 'Isabela Rocha Freitas', email: 'isa.rocha@empresa.com', telefone: '(19) 97777-4444', etapa: etapas[6], entrouEm: entradasMock[8], qualificacao: { Status: 'Contrato em análise' }, anotacoes: 'Contrato e fechamento. Assinatura prevista para 24/02.' },
    { nome: 'João Pedro Lima', email: 'joao.pedro@email.com', telefone: '(11) 96666-5555', etapa: etapas[6], entrouEm: entradasMock[9], qualificacao: {}, anotacoes: 'Fechamento. Só falta laudo do imóvel.' },
    { nome: 'Larissa Mendes Dias', email: 'larissa.dias@gmail.com', telefone: '(31) 95555-6666', etapa: etapas[7], entrouEm: entradasMock[10], qualificacao: { Pós: 'Fidelização' }, anotacoes: 'Pós venda. Cliente fechou em jan/25. Indicou 2 amigos.' },
    { nome: 'Marcos Antonio Teixeira', email: 'marcos.t@outlook.com', telefone: '(41) 94444-7777', etapa: etapas[8], entrouEm: entradasMock[11], qualificacao: { Interesse: 'Futuro 2º imóvel' }, anotacoes: 'Interesse futuro. Quer lançamento com 4 dorm em 2026.' },
    { nome: 'Natália Barbosa Campos', email: 'natalia.bc@email.com', telefone: '(51) 93333-8888', etapa: etapas[9], entrouEm: entradasMock[12], qualificacao: { Carteira: 'Ativa' }, anotacoes: 'Carteira. Mantém contato mensal. Possível venda em Q2.' },
    { nome: 'Otávio Correia Neto', email: 'otavio.neto@corp.com', telefone: '(11) 92222-9999', etapa: etapas[10], entrouEm: entradasMock[13], qualificacao: { Motivo: 'Preço' }, anotacoes: 'Geladeira. Não fechou por preço. Reativar em junho com nova condição.' },
    { nome: 'Patricia Almeida Souza', email: 'patricia.as@gmail.com', telefone: '(21) 91111-0000', etapa: etapas[0], entrouEm: entradasMock[14], qualificacao: { Origem: 'Indicação' }, anotacoes: 'Indicada por Larissa Mendes. Contato inicial em 19/02.' },
    { nome: 'Ricardo Gomes Ferreira', email: 'ricardo.gomes@email.com', telefone: '(19) 90000-1234', etapa: etapas[1], entrouEm: entradasMock[15], qualificacao: { Orçamento: 'R$ 600k', Interesse: '2 dorm' }, anotacoes: 'Qualificado. Preferência por andar alto. Enviar plantas.' },
    { nome: 'Sandra Cristina Moraes', email: 'sandra.moraes@yahoo.com.br', telefone: '(11) 98989-5678', etapa: etapas[3], entrouEm: entradasMock[16], qualificacao: { Visita: 'Agendada' }, anotacoes: 'Visita agendada 23/02 10h. Casal, primeiro imóvel.' },
    { nome: 'Thiago Henrique Lopes', email: 'thiago.lopes@empresa.com', telefone: '(31) 97878-9012', etapa: etapas[4], entrouEm: entradasMock[17], qualificacao: {}, anotacoes: 'Ligação agendada para confirmar documentação e enviar minuta.' },
  ];
  return pessoas.map((p, i) => {
    const prox = tarefas[i % tarefas.length];
    return {
      id: `mock-${i + 1}`,
      nome: p.nome,
      email: p.email,
      telefone: p.telefone,
      etapa: p.etapa,
      entrouEm: p.entrouEm,
      qualificacao: p.qualificacao ?? {},
      anotacoes: p.anotacoes ?? '',
      proximaTarefa: prox,
      proximaTarefaDataOrdenacao: prox?.data ? parseTaskDateString(prox.data) : undefined,
    };
  });
}
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
  </svg>
);

interface Task {
  id: string;
  description?: string;
  type?: string;
  dueDate: Timestamp | { seconds: number };
  status: string;
}

interface LeadRow {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  etapa: string;
  entrouEm: string;
  qualificacao?: Record<string, string | string[]>;
  anotacoes?: string;
  proximaTarefa?: { type: string; description: string; data: string };
  /** Timestamp (ms) da próxima tarefa para ordenar "próximas ações" (mais cedo primeiro) */
  proximaTarefaDataOrdenacao?: number;
}

function formatTaskDate(d: Timestamp | { seconds: number }): string {
  const sec = d && typeof d === 'object' && 'seconds' in d ? d.seconds : 0;
  if (!sec) return '—';
  return new Date(sec * 1000).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Parse "DD/MM HH:mm" para timestamp (ano atual) — usado na ordenação do mock */
function parseTaskDateString(s: string): number {
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  const [, d, m, h, min] = match;
  const year = new Date().getFullYear();
  return new Date(year, Number(m) - 1, Number(d), Number(h), Number(min)).getTime();
}

/** Logo Nox: tenta /logo/nox.png (logo oficial) e /logo/logo-nox.png; fallback texto discreto */
const NOX_LOGO_PATHS = ['/logo/nox.png', '/logo/logo-nox.png'];
function NoxLogo({ className = '' }: { className?: string }) {
  const [tried, setTried] = useState(0);
  const src = NOX_LOGO_PATHS[tried];
  const next = () => setTried((t) => Math.min(t + 1, NOX_LOGO_PATHS.length));
  return (
    <>
      {tried < NOX_LOGO_PATHS.length && (
        <img
          src={src}
          alt="Nox"
          className={`h-8 w-auto object-contain ${className}`}
          onError={next}
        />
      )}
      {tried >= NOX_LOGO_PATHS.length && (
        <span className={`font-medium text-sm text-[#374151] dark:text-gray-300 ${className}`} aria-label="Nox">Nox</span>
      )}
    </>
  );
}

export default function RelatorioDiarioPage() {
  const { userData, currentUser } = useAuth();
  const { stages, normalizeEtapa } = usePipelineStages();
  const imobiliariaId = userData?.imobiliariaId ?? (userData?.tipoConta === 'imobiliaria' ? currentUser?.uid : undefined);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEtapa, setFiltroEtapa] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [useMockData, setUseMockData] = useState(true);

  useEffect(() => {
    if (useMockData) {
      setLeads(buildMockLeads());
      setLoading(false);
      return;
    }
    if (!imobiliariaId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const leadsRef = collection(db, 'leads');
        const q = query(
          leadsRef,
          where('imobiliariaId', '==', imobiliariaId),
          limit(MAX_LEADS)
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.sort((a, b) => {
          const aAt = a.data().createdAt?.toMillis?.() ?? 0;
          const bAt = b.data().createdAt?.toMillis?.() ?? 0;
          return bAt - aAt;
        });
        const list: LeadRow[] = docs.map((docSnap) => {
          const d = docSnap.data();
          const createdAt = d.createdAt;
          let entrouEm = '—';
          if (createdAt?.toMillis) {
            entrouEm = new Date(createdAt.toMillis()).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          } else if (createdAt?.seconds) {
            entrouEm = new Date(createdAt.seconds * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          }
          return {
            id: docSnap.id,
            nome: d.nome || '—',
            email: d.email,
            telefone: d.telefone,
            etapa: normalizeEtapa(d.etapa),
            entrouEm,
            qualificacao: d.qualificacao || {},
            anotacoes: d.anotacoes || '',
          };
        });

        for (const lead of list) {
          try {
            const tasksRef = collection(db, 'leads', lead.id, 'tarefas');
            const tq = query(
              tasksRef,
              where('status', '==', 'pendente'),
              orderBy('dueDate', 'asc'),
              limit(1)
            );
            const tsnap = await getDocs(tq);
            if (!tsnap.empty) {
              const t = tsnap.docs[0].data() as Task;
              const sec = t.dueDate && typeof t.dueDate === 'object' && 'seconds' in t.dueDate ? (t.dueDate as { seconds: number }).seconds : 0;
              lead.proximaTarefa = {
                type: t.type || 'Tarefa',
                description: t.description || '—',
                data: formatTaskDate(t.dueDate),
              };
              lead.proximaTarefaDataOrdenacao = sec ? sec * 1000 : undefined;
            }
          } catch {
            // índice pode não existir; ignorar
          }
        }

        setLeads(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [imobiliariaId, normalizeEtapa, useMockData]);

  const funil = useMemo(() => {
    const byEtapa: Record<string, number> = {};
    stages.forEach((s) => { byEtapa[s] = 0; });
    leads.forEach((l) => {
      const e = l.etapa || stages[0];
      byEtapa[e] = (byEtapa[e] ?? 0) + 1;
    });
    const total = leads.length;
    return stages.map((label) => ({
      label,
      count: byEtapa[label] ?? 0,
      pct: total ? Math.round(((byEtapa[label] ?? 0) / total) * 100) : 0,
    }));
  }, [leads, stages]);

  const filteredLeads = useMemo(() => {
    let list = [...leads];
    if (filtroEtapa) list = list.filter((l) => l.etapa === filtroEtapa);
    if (busca.trim()) {
      const b = busca.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.nome?.toLowerCase().includes(b) ||
          l.email?.toLowerCase().includes(b) ||
          l.telefone?.includes(b)
      );
    }
    return list;
  }, [leads, filtroEtapa, busca]);

  const countProximasAcoes = useMemo(() => filteredLeads.filter((l) => l.proximaTarefa).length, [filteredLeads]);

  const { proximasAcoesLeads, demaisLeads } = useMemo(() => {
    const comTarefa = filteredLeads.filter((l) => l.proximaTarefa);
    const semTarefa = filteredLeads.filter((l) => !l.proximaTarefa);
    comTarefa.sort((a, b) => (a.proximaTarefaDataOrdenacao ?? 0) - (b.proximaTarefaDataOrdenacao ?? 0));
    semTarefa.sort((a, b) => a.nome.localeCompare(b.nome));
    return { proximasAcoesLeads: comTarefa, demaisLeads: semTarefa };
  }, [filteredLeads]);

  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  if (!imobiliariaId) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-[#6B6F76] dark:text-gray-400">
          Acesso restrito. Identifique a imobiliária.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f1115] text-[#1e293b] dark:text-gray-100 relatorio-diario-print">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
          .no-print { display: none !important; }
          .relatorio-diario-print { background: #fff !important; color: #111 !important; }
          .relatorio-diario-print .print\\:bg-white { background: #fff !important; }
          .relatorio-diario-print .print\\:text-gray-900 { color: #111 !important; }
          .relatorio-diario-print .print\\:border-gray-200 { border-color: #e5e7eb !important; }
          .relatorio-diario-print .print\\:border-amber-200 { border-color: #fde68a !important; }
          .break-inside-avoid, .page-break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 print:py-4 print:px-0">
        <Link href="/dashboard/admin" className="no-print inline-flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 hover:underline mb-6">
          <ArrowLeftIcon className="h-4 w-4" /> Voltar ao administrador
        </Link>

        {/* Cabeçalho limpo — tela e PDF */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-white/10 print:border-gray-200 print:pb-3">
          <AlummaLogoFullInline theme="dark" height={32} className="print:hidden" />
          <AlummaLogoFullInline theme="light" height={32} className="hidden print:!block" />
          <div className="text-center flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white print:text-gray-900">Relatório diário</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-600 capitalize">{dataHoje}</p>
          </div>
          <div className="w-24 flex justify-end">
            <NoxLogo className="print:opacity-90" />
          </div>
        </header>

        <div className="no-print flex flex-wrap items-center gap-4 mb-6">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={useMockData} onChange={(e) => setUseMockData(e.target.checked)} className="rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            Exibir dados de exemplo
          </label>
          <button type="button" onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm">
            Imprimir / Gerar PDF
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Carregando...</div>
        ) : (
          <>
            {/* Resumo — onde colocar o olho: próximas ações + total */}
            <section className="mb-6 print:mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3">
                <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-4 print:bg-amber-50/50 print:border-amber-200">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 print:text-amber-900">Próximas ações agendadas</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-200 tabular-nums print:text-amber-900">{countProximasAcoes}</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 print:bg-gray-50 print:border-gray-200">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 print:text-gray-600">Total de leads</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums print:text-gray-900">{filteredLeads.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 print:bg-gray-50 print:border-gray-200 col-span-2 sm:col-span-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 print:text-gray-600">Etapas no funil</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums print:text-gray-900">{funil.length}</p>
                </div>
              </div>
            </section>

            {/* Funil compacto */}
            <section className="mb-8 print:mb-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 print:text-gray-700 mb-3">Funil de vendas</h2>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 print:bg-white print:border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {funil.map(({ label, count, pct }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setFiltroEtapa((e) => (e === label ? null : label))}
                      className={`no-print text-left px-3 py-2 rounded-lg border text-xs transition-all print:pointer-events-none ${
                        filtroEtapa === label
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/20 dark:border-amber-500/50'
                          : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                      } print:border-gray-200`}
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-300 print:text-gray-700 truncate max-w-[120px] block" title={label}>{label}</span>
                      <span className="text-gray-900 dark:text-white font-bold tabular-nums print:text-gray-900">{count}</span>
                      <span className="text-amber-600 dark:text-amber-400 tabular-nums ml-1">({pct}%)</span>
                    </button>
                  ))}
                </div>
                {filtroEtapa && (
                  <p className="no-print mt-2 text-xs text-gray-500">
                    Filtro: <span className="text-amber-600 font-medium">{filtroEtapa}</span>
                    {' · '}
                    <button type="button" onClick={() => setFiltroEtapa(null)} className="text-amber-600 hover:underline">Limpar</button>
                  </p>
                )}
              </div>
            </section>

            {/* Busca — só tela */}
            <div className="no-print mb-4">
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou telefone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full max-w-md px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            {/* Próximas ações com clientes — os mais quentes primeiro */}
            <section className="mb-8 print:mb-6">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white print:text-gray-800 mb-1 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-amber-500" />
                Próximas ações com clientes
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({proximasAcoesLeads.length} agendadas)</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 print:text-gray-600">Leads com tarefa agendada, ordenados pela data da próxima ação.</p>
              <div className="space-y-3 print:space-y-2">
                {proximasAcoesLeads.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-6 text-center text-sm text-gray-500 print:border-gray-200 print:bg-gray-50">
                    Nenhuma próxima ação agendada.
                  </div>
                ) : (
                  proximasAcoesLeads.map((lead) => (
                    <div key={lead.id} className="break-inside-avoid page-break-inside-avoid rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 print:border print:border-gray-200 print:bg-white print:shadow-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white print:text-gray-900">{lead.nome}</h3>
                          {(lead.telefone || lead.email) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-600 mt-0.5">{lead.telefone}{lead.telefone && lead.email ? ' · ' : ''}{lead.email}</p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-600 mt-1">Entrou em {lead.entrouEm}</p>
                        </div>
                        <span className="shrink-0 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium print:bg-amber-50 print:text-amber-900">{lead.etapa}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 print:text-gray-600">Qualificações / Anotações</p>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {lead.qualificacao && Object.entries(lead.qualificacao).map(([key, val]) => {
                            const arr = Array.isArray(val) ? val : [val];
                            return arr.map((v, i) => v ? <span key={`${key}-${i}`} className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-[10px] text-gray-700 dark:text-gray-300 print:bg-gray-100 print:text-gray-700">{key}: {String(v)}</span> : null);
                          })}
                        </div>
                        {lead.anotacoes ? <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug print:text-gray-700">{lead.anotacoes}</p> : <p className="text-xs text-gray-400 italic">—</p>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                        <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase print:text-amber-800">Próxima ação</span>
                        <span className="text-xs text-gray-900 dark:text-white print:text-gray-900">
                          <span className="font-medium text-amber-700 dark:text-amber-400 print:text-amber-800">{lead.proximaTarefa!.type}</span>
                          {' — '}{lead.proximaTarefa!.description}
                          {' · '}<span className="font-medium text-amber-700 dark:text-amber-400 print:text-amber-800">{lead.proximaTarefa!.data}</span>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Demais leads */}
            <section className="mb-8 print:mb-6">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white print:text-gray-800 mb-1 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-gray-400 dark:bg-gray-500" />
                Demais leads
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({demaisLeads.length})</span>
                {useMockData && <span className="no-print text-xs text-amber-600">(exemplo)</span>}
              </h2>
              <div className="space-y-3 print:space-y-2">
                {demaisLeads.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-6 text-center text-sm text-gray-500 print:border-gray-200">
                    Nenhum outro lead no filtro atual.
                  </div>
                ) : (
                  demaisLeads.map((lead) => (
                    <div key={lead.id} className="break-inside-avoid page-break-inside-avoid rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 print:border print:border-gray-200 print:bg-white">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white print:text-gray-900">{lead.nome}</h3>
                          {(lead.telefone || lead.email) && <p className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-600 mt-0.5">{lead.telefone}{lead.telefone && lead.email ? ' · ' : ''}{lead.email}</p>}
                          <p className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-600 mt-1">Entrou em {lead.entrouEm}</p>
                        </div>
                        <span className="shrink-0 px-2 py-1 rounded-md bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-medium print:bg-gray-100 print:text-gray-800">{lead.etapa}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1 print:text-gray-600">Qualificações / Anotações</p>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {lead.qualificacao && Object.entries(lead.qualificacao).map(([key, val]) => {
                            const arr = Array.isArray(val) ? val : [val];
                            return arr.map((v, i) => v ? <span key={`${key}-${i}`} className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-[10px] text-gray-700 dark:text-gray-300 print:bg-gray-100">{key}: {String(v)}</span> : null);
                          })}
                        </div>
                        {lead.anotacoes ? <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug print:text-gray-700">{lead.anotacoes}</p> : <p className="text-xs text-gray-400 italic">—</p>}
                      </div>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 print:text-gray-600">Próxima tarefa: {lead.proximaTarefa ? `${lead.proximaTarefa.type} — ${lead.proximaTarefa.data}` : 'Sem tarefa agendada'}</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Rodapé */}
            <footer className="mt-8 pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between flex-wrap gap-4 print:border-gray-200 print:pt-3">
              <AlummaLogoFullInline theme="dark" height={24} className="print:hidden opacity-80" />
              <AlummaLogoFullInline theme="light" height={24} className="hidden print:!block opacity-90" />
              <NoxLogo className="print:opacity-90" />
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
