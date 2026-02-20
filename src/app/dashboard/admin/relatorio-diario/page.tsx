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
  return pessoas.map((p, i) => ({
    id: `mock-${i + 1}`,
    nome: p.nome,
    email: p.email,
    telefone: p.telefone,
    etapa: p.etapa,
    entrouEm: p.entrouEm,
    qualificacao: p.qualificacao ?? {},
    anotacoes: p.anotacoes ?? '',
    proximaTarefa: tarefas[i % tarefas.length],
  }));
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

/** Logo Nox: imagem se existir em /logo/logo-nox.png, senão texto NOX (para PDF e tela) */
function NoxLogo() {
  const [imgFailed, setImgFailed] = useState(false);
  const useImg = !imgFailed;
  return (
    <>
      {useImg && (
        <img
          src="/logo/logo-nox.png"
          alt="Nox"
          className="h-9 w-auto object-contain"
          onError={() => setImgFailed(true)}
        />
      )}
      {imgFailed && (
        <span className="text-[#2E2F38] dark:text-white font-bold text-xl tracking-widest">NOX</span>
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
              lead.proximaTarefa = {
                type: t.type || 'Tarefa',
                description: t.description || '—',
                data: formatTaskDate(t.dueDate),
              };
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
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] text-[#2E2F38] dark:text-gray-100 relatorio-diario-print">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .relatorio-diario-print { background: #fff !important; color: #1a1a1a !important; }
          .relatorio-diario-print .dark\\:bg-\\[\\#181C23\\] { background: #fff !important; }
          .relatorio-diario-print .dark\\:text-white { color: #1a1a1a !important; }
          .relatorio-diario-print .dark\\:text-gray-400 { color: #555 !important; }
          .relatorio-diario-print .dark\\:border-white\\/10 { border-color: #eee !important; }
          .relatorio-diario-print .dark\\:bg-white\\/5 { background: #f8f8f8 !important; }
          .page-break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
          .relatorio-diario-print .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>
      <div className="max-w-6xl mx-auto py-8 px-4">
        <Link
          href="/dashboard/admin"
          className="no-print inline-flex items-center gap-2 text-sm text-[#D4A017] hover:underline mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar ao administrador
        </Link>

        {/* Cabeçalho com logos Alumma e Nox — visível na tela e no PDF */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E8E9F1] dark:border-white/10">
          <div className="flex items-center gap-3">
            <AlummaLogoFullInline theme="dark" height={36} className="print:!hidden" />
            <AlummaLogoFullInline theme="light" height={36} className="hidden print:!block" />
          </div>
          <div className="text-center flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-[#2E2F38] dark:text-white">
              Relatório diário
            </h1>
            <p className="text-[#6B6F76] dark:text-gray-400 mt-1 capitalize">{dataHoje}</p>
          </div>
          <div className="flex items-center justify-end w-24">
            <NoxLogo />
          </div>
        </header>

        <div className="no-print flex flex-wrap items-center gap-4 mb-6">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => setUseMockData(e.target.checked)}
              className="rounded border-[#E8E9F1] text-[#D4A017] focus:ring-[#D4A017]"
            />
            <span className="text-sm text-[#2E2F38] dark:text-gray-300">Exibir dados de exemplo</span>
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-[#D4A017] hover:bg-[#B8860B] text-white font-medium text-sm"
          >
            Imprimir / Gerar PDF
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#6B6F76] dark:text-gray-400">
            Carregando leads e tarefas...
          </div>
        ) : (
          <>
            {/* ——— TOPO: batida rápida (funil + % no estilo relatório individual) ——— */}
            <section className="mb-8 print:mb-6">
              <div className="relative overflow-hidden rounded-2xl border-2 border-[#D4A017]/40 bg-gradient-to-b from-[#1a1a1f] to-[#121218] p-4 shadow-[0_0_40px_-8px_rgba(212,160,23,0.25),0_8px_32px_rgba(0,0,0,0.4)] print:shadow-none print:border print:border-[#D4A017]/50">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4A017]/60 to-transparent" />
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-1 h-5 rounded-r-full bg-gradient-to-b from-[#D4A017] to-[#b8860b] shadow-[0_0_6px_rgba(212,160,23,0.5)]" />
                    Funil de vendas
                  </h2>
                  <div className="flex items-center gap-2 rounded-lg border border-[#D4A017]/50 bg-[#D4A017]/10 px-3 py-1.5">
                    <span className="text-[10px] text-gray-400">Total de leads</span>
                    <span className="text-lg font-bold tabular-nums text-[#D4A017]">{leads.length}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {funil.map(({ label, count, pct }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setFiltroEtapa((e) => (e === label ? null : label))}
                      className={`no-print text-left p-3 rounded-xl border transition-all print:pointer-events-none ${
                        filtroEtapa === label
                          ? 'border-[#D4A017] bg-[#D4A017]/20 shadow-[0_0_12px_rgba(212,160,23,0.2)]'
                          : 'border-white/10 bg-white/[0.06] hover:bg-white/[0.1]'
                      }`}
                    >
                      <div className="text-[10px] font-medium text-gray-400 truncate" title={label}>{label}</div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold text-white tabular-nums">{count}</span>
                        <span className="text-xs font-medium text-[#D4A017] tabular-nums">{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#D4A017] to-[#e8c234] rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
                {filtroEtapa && (
                  <p className="no-print mt-2 text-[10px] text-gray-500">
                    Filtro: <span className="text-[#D4A017] font-medium">{filtroEtapa}</span>
                    {' · '}
                    <button type="button" onClick={() => setFiltroEtapa(null)} className="text-[#D4A017] hover:underline">Limpar</button>
                  </p>
                )}
              </div>
            </section>

            {/* ——— EMBAIXO: descritivo (nome, quando entrou, qualif/anotações, estágio, próx tarefa) ——— */}
            <section>
              <h2 className="text-lg font-semibold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-[#D4A017] to-[#E8C547] rounded-full" />
                Descritivo — leads conosco ({filteredLeads.length})
                {useMockData && <span className="no-print ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">(dados de exemplo)</span>}
              </h2>
              <div className="no-print mb-4">
                <input
                  type="text"
                  placeholder="Buscar por nome, e-mail ou telefone..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full max-w-md px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-white/5 text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-500"
                />
              </div>
              <div className="space-y-3 print:space-y-2">
                {filteredLeads.length === 0 ? (
                  <div className="py-8 text-center text-[#6B6F76] dark:text-gray-400 rounded-xl border border-[#E8E9F1] dark:border-white/10">
                    Nenhum lead encontrado.
                  </div>
                ) : (
                  filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="break-inside-avoid page-break-inside-avoid rounded-xl border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-white/[0.04] p-4 print:border print:border-gray-300 print:bg-gray-50/80 print:shadow-none"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-[#2E2F38] dark:text-white">{lead.nome}</h3>
                          {(lead.telefone || lead.email) && (
                            <p className="text-xs text-[#6B6F76] dark:text-gray-400 mt-0.5">
                              {lead.telefone}
                              {lead.telefone && lead.email ? ' · ' : ''}
                              {lead.email}
                            </p>
                          )}
                          <p className="text-[11px] text-[#6B6F76] dark:text-gray-500 mt-1">
                            <span className="font-medium text-[#2E2F38] dark:text-gray-300">Entrou em:</span> {lead.entrouEm}
                          </p>
                        </div>
                        <span className="shrink-0 inline-block px-2.5 py-1 rounded-lg bg-[#D4A017]/15 dark:bg-[#D4A017]/20 text-[#B8860B] dark:text-[#E8C547] font-medium text-xs">
                          {lead.etapa}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-[#E8E9F1] dark:border-white/10">
                        <p className="text-[10px] font-semibold text-[#6B6F76] dark:text-gray-400 uppercase tracking-wide mb-1">Qualificações / Anotações</p>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {lead.qualificacao && Object.keys(lead.qualificacao).length > 0 ? (
                            Object.entries(lead.qualificacao).map(([key, val]) => {
                              const arr = Array.isArray(val) ? val : [val];
                              return arr.map((v, i) =>
                                v ? (
                                  <span key={`${key}-${i}`} className="inline-block px-2 py-0.5 rounded bg-[#D4A017]/10 dark:bg-[#D4A017]/15 text-[10px] text-[#B8860B] dark:text-[#E8C547]">
                                    {key}: {String(v)}
                                  </span>
                                ) : null
                              );
                            })
                          ) : null}
                        </div>
                        {lead.anotacoes ? (
                          <p className="text-xs text-[#6B6F76] dark:text-gray-400 leading-snug">{lead.anotacoes}</p>
                        ) : (
                          <p className="text-xs text-[#6B6F76] dark:text-gray-500 italic">—</p>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-semibold text-[#6B6F76] dark:text-gray-400 uppercase tracking-wide">Próxima tarefa</p>
                        {lead.proximaTarefa ? (
                          <span className="text-xs text-[#2E2F38] dark:text-white">
                            <span className="font-medium text-[#D4A017]">{lead.proximaTarefa.type}</span>
                            {' — '}
                            {lead.proximaTarefa.description}
                            {' · '}
                            <span className="text-[#D4A017]">{lead.proximaTarefa.data}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-[#6B6F76] dark:text-gray-500">Sem tarefa agendada</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Rodapé com marcas Alumma e Nox — para PDF e tela */}
            <footer className="mt-10 pt-6 border-t border-[#E8E9F1] dark:border-white/10 flex items-center justify-between flex-wrap gap-4">
              <AlummaLogoFullInline theme="dark" height={28} className="opacity-90 print:hidden" />
              <AlummaLogoFullInline theme="light" height={28} className="opacity-90 hidden print:!block" />
              <div className="flex items-center gap-2">
                <NoxLogo />
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
