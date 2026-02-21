'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
  </svg>
);
const WalletIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m2 4h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z" />
  </svg>
);
const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const TrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ReceiptIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const PercentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="19" r="3" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M5 12h14" /><path d="M12 5v14" />
  </svg>
);
const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);
const MegaphoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
  </svg>
);

const CATEGORIAS_ENTRADA = ['Comissão de Venda', 'Comissão de Aluguel', 'Taxa de Administração', 'Receita de Serviços', 'Outros'];
const CATEGORIAS_SAIDA = ['Salários', 'Aluguel', 'Contas', 'Marketing', 'Material de Escritório', 'Impostos', 'Outros'];
const FORMAS_PAGAMENTO = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro', 'Outro'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

/** Dados mock para o template — baseado em CRMs imobiliários e ferramentas (QuickBooks, ZeroPaper, Supremo CRM) */
const MOCK = {
  periodo: 'Fevereiro 2025',
  saldoAtual: 84750,
  entradasPeriodo: 124300,
  saidasPeriodo: 39550,
  contasAReceber: 18200,
  contasAPagar: 8700,
  comissoesPendentes: 15600,
  comissoesAprovadas: 4200,
  comissoesPagas: 18900,
  fluxoMeses: [
    { mes: 'Nov', entrada: 98000, saida: 62000 },
    { mes: 'Dez', entrada: 112000, saida: 58000 },
    { mes: 'Jan', entrada: 105000, saida: 72000 },
    { mes: 'Fev', entrada: 124300, saida: 39550 },
  ],
  contasAPagarLista: [
    { desc: 'Aluguel escritório', venc: '05/03', valor: 4500 },
    { desc: 'Fornecedor marketing', venc: '12/03', valor: 2200 },
    { desc: 'Conta de luz', venc: '15/03', valor: 2000 },
  ],
  contasAReceberLista: [
    { desc: 'Comissão venda Imóvel A', venc: '28/02', valor: 8200 },
    { desc: 'Taxa administração', venc: '10/03', valor: 5000 },
    { desc: 'Comissão aluguel', venc: '15/03', valor: 5000 },
  ],
  comissoesLista: [
    { corretor: 'Ana Silva', venda: 'R$ 450.000', pct: 3, valor: 13500, status: 'pendente' },
    { corretor: 'Bruno Costa', venda: 'R$ 280.000', pct: 3, valor: 8400, status: 'aprovada' },
    { corretor: 'Carla Mendes', venda: 'R$ 520.000', pct: 2.5, valor: 13000, status: 'paga' },
  ],
  movimentacoesRecentes: [
    { data: '19/02', desc: 'Comissão venda — Torre B', tipo: 'entrada', valor: 12000 },
    { data: '18/02', desc: 'Pagamento fornecedor', tipo: 'saida', valor: 3500 },
    { data: '17/02', desc: 'Taxa de administração', tipo: 'entrada', valor: 2200 },
  ],
};

/** Dados mock para Relatório de Custos */
const MOCK_CUSTOS = {
  periodo: 'Fevereiro 2025',
  custosFixos: {
    total: 18500,
    itens: [
      { desc: 'Aluguel do escritório', valor: 6500 },
      { desc: 'Salários fixos (administrativo)', valor: 8200 },
      { desc: 'Contas (luz, água, internet)', valor: 1800 },
      { desc: 'Software e assinaturas', valor: 1200 },
      { desc: 'Outros custos fixos', valor: 800 },
    ],
  },
  custosVariaveis: {
    total: 42100,
    itens: [
      { tipo: 'Comissão corretor', desc: 'Ana Silva — venda R$ 450k', valor: 13500 },
      { tipo: 'Comissão corretor', desc: 'Bruno Costa — venda R$ 280k', valor: 8400 },
      { tipo: 'Comissão corretor', desc: 'Carla Mendes — venda R$ 520k', valor: 13000 },
      { tipo: 'Bônus por meta', desc: 'Meta mensal atingida — equipe', valor: 5200 },
      { tipo: 'Bônus por meta', desc: 'Bônus individual — João', valor: 2000 },
    ],
  },
  custosAquisicao: {
    total: 12800,
    itens: [
      { canal: 'Meta Ads', valor: 5400, detalhe: 'Campanhas lançamentos e remarketing' },
      { canal: 'Google Ads', valor: 4200, detalhe: 'Search e Display' },
      { canal: 'Produção de mídia', valor: 3200, detalhe: 'Vídeos, fotos e materiais gráficos' },
    ],
  },
  totalGeral: 73400,
};

interface Movimentacao {
  id: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  categoria: string;
  descricao: string;
  data: Date;
  status: string;
  formaPagamento?: string;
  observacao?: string;
}

export default function FinanceiroPage() {
  const { userData, currentUser } = useAuth();
  const imobiliariaId = userData?.imobiliariaId ?? (userData?.tipoConta === 'imobiliaria' ? currentUser?.uid : undefined);
  const [tab, setTab] = useState<'financeiro' | 'custos' | 'lancamentos'>('financeiro');
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre'>('mes');

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    valor: '',
    categoria: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    status: 'confirmado',
    formaPagamento: '',
    observacao: '',
  });

  useEffect(() => {
    if (tab === 'lancamentos' && imobiliariaId) fetchMovimentacoes();
  }, [tab, imobiliariaId]);

  const fetchMovimentacoes = async () => {
    if (!imobiliariaId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'financeiro_movimentacoes'),
        where('imobiliariaId', '==', imobiliariaId),
        orderBy('data', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => {
        const x = d.data();
        const dt = x.data?.toDate ? x.data.toDate() : new Date(x.data);
        return { id: d.id, ...x, data: dt } as Movimentacao;
      });
      setMovimentacoes(data);
    } catch (err) {
      setMsg('Erro ao carregar lançamentos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      tipo: 'entrada',
      valor: '',
      categoria: '',
      descricao: '',
      data: new Date().toISOString().split('T')[0],
      status: 'confirmado',
      formaPagamento: '',
      observacao: '',
    });
    setEditId(null);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.valor || !form.categoria || !form.descricao || !imobiliariaId) {
      setMsg('Preencha todos os campos obrigatórios');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const dataObj = new Date(form.data);
      const movData = {
        tipo: form.tipo,
        valor: Number(form.valor),
        categoria: form.categoria,
        descricao: form.descricao,
        data: Timestamp.fromDate(dataObj),
        status: form.status,
        formaPagamento: form.formaPagamento || '',
        observacao: form.observacao || '',
        imobiliariaId,
        usuarioId: currentUser?.uid,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      };
      if (editId) {
        await updateDoc(doc(db, 'financeiro_movimentacoes', editId), movData);
        setMsg('Lançamento atualizado!');
      } else {
        await addDoc(collection(db, 'financeiro_movimentacoes'), movData);
        setMsg('Lançamento criado!');
      }
      setShowModal(false);
      resetForm();
      fetchMovimentacoes();
    } catch (err) {
      setMsg('Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (m: Movimentacao) => {
    setForm({
      tipo: m.tipo,
      valor: m.valor.toString(),
      categoria: m.categoria,
      descricao: m.descricao,
      data: m.data.toISOString().split('T')[0],
      status: m.status,
      formaPagamento: m.formaPagamento || '',
      observacao: m.observacao || '',
    });
    setEditId(m.id);
    setShowModal(true);
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Excluir este lançamento?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'financeiro_movimentacoes', id));
      setMovimentacoes((prev) => prev.filter((m) => m.id !== id));
      setMsg('Lançamento excluído');
    } catch {
      setMsg('Erro ao excluir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f1115] text-[#1e293b] dark:text-gray-100 financeiro-print">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .financeiro-print { background: #fff !important; color: #111 !important; }
        }
      `}</style>
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6">
        <Link href="/dashboard/admin" className="no-print inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:underline mb-6">
          <ArrowLeftIcon className="h-4 w-4" /> Voltar ao administrador
        </Link>

        {/* Título e período */}
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Financeiro</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Controle de caixa, fluxo e comissões da imobiliária</p>
          <div className="no-print flex items-center gap-4 mt-3 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setTab('financeiro')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  tab === 'financeiro'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'
                }`}
              >
                Rel. Financeiro
              </button>
              <button
                type="button"
                onClick={() => setTab('custos')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  tab === 'custos'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'
                }`}
              >
                Rel. Custos
              </button>
              <button
                type="button"
                onClick={() => setTab('lancamentos')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  tab === 'lancamentos'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'
                }`}
              >
                Lançamentos
              </button>
            </div>
            {(tab === 'financeiro' || tab === 'custos') && (
              <div className="no-print flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <select
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value as 'mes' | 'trimestre')}
                    className="text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 px-3 py-1.5 text-gray-700 dark:text-gray-300"
                  >
                    <option value="mes">Este mês</option>
                    <option value="trimestre">Este trimestre</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm"
                >
                  Baixar PDF
                </button>
              </div>
            )}
          </div>
        </header>

        {msg && (
          <div
            className={`no-print mb-4 px-4 py-2 rounded-lg text-sm ${
              msg.includes('Erro') ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {msg}
          </div>
        )}

        {tab === 'lancamentos' && (
          /* ——— ABA LANÇAMENTOS ——— */
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-amber-500" />
                Entradas e saídas
              </h2>
              <button
                type="button"
                onClick={() => { resetForm(); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm"
              >
                <PlusIcon className="h-4 w-4" /> Novo lançamento
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
              {loading && movimentacoes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Carregando...</div>
              ) : movimentacoes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="font-medium mb-1">Nenhum lançamento</p>
                  <p className="text-sm">Clique em Novo lançamento para adicionar entradas e saídas.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/10">
                  {movimentacoes.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${m.tipo === 'entrada' ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}>
                          {m.tipo === 'entrada' ? <TrendingUpIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <TrendingDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{m.descricao}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {m.data.toLocaleDateString('pt-BR')} · {m.categoria}
                            {m.formaPagamento && ` · ${m.formaPagamento}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold tabular-nums ${m.tipo === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {m.tipo === 'entrada' ? '+' : '-'}{formatCurrency(m.valor)}
                        </span>
                        <button type="button" onClick={() => handleEditar(m)} className="p-1.5 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded" title="Editar">
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleExcluir(m.id)} className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 rounded" title="Excluir">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'custos' && (
          /* ——— RELATÓRIO DE CUSTOS ——— */
          <section className="space-y-6">
            {/* Resumo rápido — batida de olho */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3">
                <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Custos fixos</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(MOCK_CUSTOS.custosFixos.total)}</p>
              </div>
              <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-3">
                <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300">Custos variáveis</p>
                <p className="text-lg font-bold text-amber-900 dark:text-amber-200 tabular-nums">{formatCurrency(MOCK_CUSTOS.custosVariaveis.total)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <MegaphoneIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Aquisição / marketing</p>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(MOCK_CUSTOS.custosAquisicao.total)}</p>
              </div>
            </div>

            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-amber-500" />
              Custos fixos
            </h2>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {MOCK_CUSTOS.custosFixos.itens.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{item.desc}</p>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 flex justify-between items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Total custos fixos</span>
                <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">{formatCurrency(MOCK_CUSTOS.custosFixos.total)}</span>
              </div>
            </div>

            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mt-8">
              <span className="w-1 h-4 rounded-full bg-amber-500" />
              Custos variáveis
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Comissões e bônus por meta</p>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {MOCK_CUSTOS.custosVariaveis.itens.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-medium mb-1">{item.tipo}</span>
                      <p className="font-medium text-gray-900 dark:text-white">{item.desc}</p>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 flex justify-between items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Total custos variáveis</span>
                <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">{formatCurrency(MOCK_CUSTOS.custosVariaveis.total)}</span>
              </div>
            </div>

            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mt-8">
              <span className="w-1 h-4 rounded-full bg-amber-500" />
              Custos de aquisição / marketing
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Meta Ads, Google Ads e produção de mídia</p>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {MOCK_CUSTOS.custosAquisicao.itens.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.canal}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.detalhe}</p>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 flex justify-between items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Total custos aquisição</span>
                <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">{formatCurrency(MOCK_CUSTOS.custosAquisicao.total)}</span>
              </div>
            </div>

            <div className="rounded-xl border-2 border-amber-200 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/10 p-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 dark:text-white">Total geral de custos</span>
                <span className="text-xl font-bold text-amber-900 dark:text-amber-200 tabular-nums">{formatCurrency(MOCK_CUSTOS.totalGeral)}</span>
              </div>
            </div>
          </section>
        )}

        {tab === 'financeiro' && (
          <>
        {/* Resumo — cards principais (estilo Alumma) */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            Visão geral
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <WalletIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">Saldo atual</p>
              </div>
              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">{formatCurrency(MOCK.saldoAtual)}</p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUpIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300">Entradas (período)</p>
              </div>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-200 tabular-nums">{formatCurrency(MOCK.entradasPeriodo)}</p>
            </div>
            <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/80 dark:bg-red-500/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-[10px] font-medium text-red-800 dark:text-red-300">Saídas (período)</p>
              </div>
              <p className="text-lg font-bold text-red-900 dark:text-red-200 tabular-nums">{formatCurrency(MOCK.saidasPeriodo)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <ReceiptIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">A receber</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(MOCK.contasAReceber)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-1">
                <ReceiptIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">A pagar</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(MOCK.contasAPagar)}</p>
            </div>
          </div>
        </section>

        {/* Fluxo de caixa — barras (estilo relatório individual) */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            Fluxo de caixa
          </h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {MOCK.fluxoMeses.map((f) => {
                const max = Math.max(...MOCK.fluxoMeses.flatMap((m) => [m.entrada, m.saida]));
                return (
                  <div key={f.mes} className="flex flex-col items-center min-w-[64px]">
                    <div className="h-24 flex flex-col justify-end gap-1 mb-2">
                      <div
                        className="w-6 rounded-t bg-amber-500/80 dark:bg-amber-500/60"
                        style={{ height: `${(f.entrada / max) * 80}px` }}
                        title={`Entrada: ${formatCurrency(f.entrada)}`}
                      />
                      <div
                        className="w-6 rounded-t bg-red-500/60 dark:bg-red-500/40"
                        style={{ height: `${(f.saida / max) * 80}px` }}
                        title={`Saída: ${formatCurrency(f.saida)}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">{f.mes}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded bg-amber-500" /> Entradas
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded bg-red-500" /> Saídas
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contas a pagar */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-amber-500" />
              Contas a pagar
            </h2>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-gray-100 dark:divide-white/10">
              {MOCK.contasAPagarLista.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{c.desc}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Venc: {c.venc}</p>
                  </div>
                  <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums">-{formatCurrency(c.valor)}</span>
                </div>
              ))}
              <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                Total: {formatCurrency(MOCK.contasAPagar)}
              </div>
            </div>
          </section>

          {/* Contas a receber */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-amber-500" />
              Contas a receber
            </h2>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-gray-100 dark:divide-white/10">
              {MOCK.contasAReceberLista.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{c.desc}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Venc: {c.venc}</p>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatCurrency(c.valor)}</span>
                </div>
              ))}
              <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                Total: {formatCurrency(MOCK.contasAReceber)}
              </div>
            </div>
          </section>
        </div>

        {/* Comissões — específico imobiliário */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            Comissões
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 p-2">
              <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300">Pendentes</p>
              <p className="text-base font-bold text-amber-900 dark:text-amber-200 tabular-nums">{formatCurrency(MOCK.comissoesPendentes)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-2">
              <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Aprovadas</p>
              <p className="text-base font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(MOCK.comissoesAprovadas)}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/10 p-2">
              <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">Pagas (período)</p>
              <p className="text-base font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">{formatCurrency(MOCK.comissoesPagas)}</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-gray-400">Corretor</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-gray-400">Venda</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-gray-400">%</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600 dark:text-gray-400">Valor</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK.comissoesLista.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-white/5">
                    <td className="py-2 px-4 font-medium text-gray-900 dark:text-white">{c.corretor}</td>
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400">{c.venda}</td>
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400">{c.pct}%</td>
                    <td className="py-2 px-4 text-right font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(c.valor)}</td>
                    <td className="py-2 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          c.status === 'paga'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : c.status === 'aprovada'
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {c.status === 'paga' ? 'Paga' : c.status === 'aprovada' ? 'Aprovada' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Movimentações recentes */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-amber-500" />
            Movimentações recentes
          </h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-gray-100 dark:divide-white/10">
            {MOCK.movimentacoesRecentes.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{m.desc}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.data}</p>
                </div>
                <span
                  className={`font-semibold tabular-nums ${
                    m.tipo === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {m.tipo === 'entrada' ? '+' : '-'}{formatCurrency(m.valor)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Rodapé — DRE / Relatórios (placeholder) */}
        <section className="mt-6">
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50/50 dark:bg-white/5 p-6 text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">DRE gerencial e relatórios financeiros</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Em breve: exportação, filtros e integração</p>
          </div>
        </section>
          </>
        )}

        {/* Modal Novo/Editar Lançamento */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1a1d24] rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editId ? 'Editar' : 'Novo'} lançamento</h2>
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl">×</button>
                </div>
                <form onSubmit={handleSalvar} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo *</label>
                      <select
                        value={form.tipo}
                        onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as 'entrada' | 'saida', categoria: '', formaPagamento: '' }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                        required
                      >
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Valor (R$) *</label>
                      <input
                        type="number"
                        value={form.valor}
                        onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                        placeholder="0,00"
                        step="0.01"
                        min="0.01"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {form.tipo === 'entrada' ? 'Categoria (entrada) *' : 'Categoria (saída) *'}
                      </label>
                      <select
                        value={form.categoria}
                        onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                        required
                      >
                        <option value="">Selecione</option>
                        {(form.tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data *</label>
                      <input
                        type="date"
                        value={form.data}
                        onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                        required
                      />
                    </div>
                  </div>
                  {form.tipo === 'saida' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Forma de pagamento</label>
                      <select
                        value={form.formaPagamento}
                        onChange={(e) => setForm((p) => ({ ...p, formaPagamento: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">Selecione</option>
                        {FORMAS_PAGAMENTO.map((fp) => (
                          <option key={fp} value={fp}>{fp}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descrição *</label>
                    <input
                      type="text"
                      value={form.descricao}
                      onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm"
                      placeholder="Ex: Comissão venda Torre A"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observação</label>
                    <textarea
                      value={form.observacao}
                      onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm resize-none"
                      rows={2}
                      placeholder="Observações adicionais..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-white/5">
                      Cancelar
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm disabled:opacity-50">
                      {loading ? 'Salvando...' : editId ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
