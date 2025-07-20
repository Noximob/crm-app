'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, orderBy, Timestamp, doc } from 'firebase/firestore';

// Ícones
const DollarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" x2="12" y1="1" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const TrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6"/>
    <line x1="8" x2="8" y1="2" y2="6"/>
    <line x1="3" x2="21" y1="10" y2="10"/>
  </svg>
);

const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14"/>
    <path d="M12 5v14"/>
  </svg>
);

// Categorias e opções
const CATEGORIAS_ENTRADA = [
  'Comissão de Venda',
  'Comissão de Aluguel', 
  'Taxa de Administração',
  'Taxa de Intermediação',
  'Receita de Serviços',
  'Rendimentos Financeiros',
  'Reembolso',
  'Outros'
];

const CATEGORIAS_SAIDA = [
  'Salários e Benefícios',
  'Aluguel do Escritório',
  'Contas de Luz/Água/Gás',
  'Internet e Telefone',
  'Marketing e Publicidade',
  'Material de Escritório',
  'Impostos e Taxas',
  'Manutenção e Limpeza',
  'Seguros',
  'Despesas com Veículos',
  'Treinamentos e Cursos',
  'Software e Sistemas',
  'Outros'
];

const FORMAS_PAGAMENTO = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito', 
  'Boleto Bancário',
  'Transferência Bancária',
  'Dinheiro',
  'Cheque',
  'Outro'
];

const STATUS = [
  { value: 'pendente', label: 'Pendente', color: 'text-yellow-600 bg-yellow-100' },
  { value: 'confirmado', label: 'Confirmado', color: 'text-green-600 bg-green-100' },
  { value: 'cancelado', label: 'Cancelado', color: 'text-red-600 bg-red-100' }
];

export default function FinanceiroPage() {
  const { userData, currentUser } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    tipo: '',
    categoria: '',
    status: '',
    dataInicio: '',
    dataFim: '',
    busca: ''
  });

  // Formulário
  const [form, setForm] = useState({
    tipo: 'entrada',
    valor: '',
    categoria: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    status: 'confirmado',
    formaPagamento: '',
    observacao: '',
    anexo: null as File | null
  });

  // Buscar movimentações
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchMovimentacoes();
  }, [userData]);

  const fetchMovimentacoes = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'financeiro_movimentacoes'),
        where('imobiliariaId', '==', userData?.imobiliariaId),
        orderBy('data', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        data: doc.data().data?.toDate ? doc.data().data.toDate() : new Date(doc.data().data)
      }));
      setMovimentacoes(data);
    } catch (err) {
      setMsg('Erro ao carregar movimentações');
    } finally {
      setLoading(false);
    }
  };

  // Salvar movimentação
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.valor || !form.categoria || !form.descricao) {
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
        formaPagamento: form.formaPagamento,
        observacao: form.observacao,
        imobiliariaId: userData?.imobiliariaId,
        usuarioId: currentUser?.uid,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now()
      };

      if (editId) {
        await updateDoc(doc(db, 'financeiro_movimentacoes', editId), movData);
        setMsg('Movimentação atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'financeiro_movimentacoes'), movData);
        setMsg('Movimentação criada com sucesso!');
      }

      setShowModal(false);
      setEditId(null);
      resetForm();
      fetchMovimentacoes();
    } catch (err) {
      setMsg('Erro ao salvar movimentação');
    } finally {
      setLoading(false);
    }
  };

  // Editar movimentação
  const handleEditar = (mov: any) => {
    setForm({
      tipo: mov.tipo,
      valor: mov.valor.toString(),
      categoria: mov.categoria,
      descricao: mov.descricao,
      data: mov.data.toISOString().split('T')[0],
      status: mov.status,
      formaPagamento: mov.formaPagamento || '',
      observacao: mov.observacao || '',
      anexo: null
    });
    setEditId(mov.id);
    setShowModal(true);
  };

  // Excluir movimentação
  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'financeiro_movimentacoes', id));
      setMovimentacoes(prev => prev.filter(m => m.id !== id));
      setMsg('Movimentação excluída com sucesso!');
    } catch (err) {
      setMsg('Erro ao excluir movimentação');
    } finally {
      setLoading(false);
    }
  };

  // Resetar formulário
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
      anexo: null
    });
  };

  // Filtros
  const movimentacoesFiltradas = movimentacoes.filter(mov => {
    if (filtros.tipo && mov.tipo !== filtros.tipo) return false;
    if (filtros.categoria && mov.categoria !== filtros.categoria) return false;
    if (filtros.status && mov.status !== filtros.status) return false;
    if (filtros.dataInicio && mov.data < new Date(filtros.dataInicio)) return false;
    if (filtros.dataFim && mov.data > new Date(filtros.dataFim)) return false;
    if (filtros.busca && !mov.descricao.toLowerCase().includes(filtros.busca.toLowerCase())) return false;
    return true;
  });

  // Cálculos
  const saldoAtual = movimentacoes
    .filter(m => m.status === 'confirmado')
    .reduce((acc, m) => acc + (m.tipo === 'entrada' ? m.valor : -m.valor), 0);

  const entradas = movimentacoes
    .filter(m => m.tipo === 'entrada' && m.status === 'confirmado')
    .reduce((acc, m) => acc + m.valor, 0);

  const saidas = movimentacoes
    .filter(m => m.tipo === 'saida' && m.status === 'confirmado')
    .reduce((acc, m) => acc + m.valor, 0);

  const pendentes = movimentacoes
    .filter(m => m.status === 'pendente')
    .reduce((acc, m) => acc + (m.tipo === 'entrada' ? m.valor : -m.valor), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const statusObj = STATUS.find(s => s.value === status);
    return statusObj?.color || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Financeiro</h1>
          <p className="text-[#6B6F76] dark:text-gray-300">Gerencie o fluxo financeiro da sua imobiliária</p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <TrendingUpIcon className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="text-sm font-medium text-[#6B6F76] dark:text-gray-300 mb-1">Saldo Atual</h3>
            <p className="text-2xl font-bold text-[#2E2F38] dark:text-white">
              {formatCurrency(saldoAtual)}
            </p>
          </div>

          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <TrendingUpIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-green-500 text-sm font-medium">+{formatCurrency(entradas)}</span>
            </div>
            <h3 className="text-sm font-medium text-[#6B6F76] dark:text-gray-300 mb-1">Entradas</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(entradas)}
            </p>
          </div>

          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <TrendingDownIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-red-500 text-sm font-medium">-{formatCurrency(saidas)}</span>
            </div>
            <h3 className="text-sm font-medium text-[#6B6F76] dark:text-gray-300 mb-1">Saídas</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(saidas)}
            </p>
          </div>

          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-yellow-500 text-sm font-medium">
                {pendentes >= 0 ? '+' : ''}{formatCurrency(pendentes)}
              </span>
            </div>
            <h3 className="text-sm font-medium text-[#6B6F76] dark:text-gray-300 mb-1">Pendentes</h3>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(pendentes)}
            </p>
          </div>
        </div>

        {/* Barra de Ações */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold rounded-lg transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Nova Movimentação
              </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
                className="px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
              >
                <option value="">Todos os tipos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>

              <select
                value={filtros.status}
                onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
              >
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="cancelado">Cancelado</option>
              </select>

              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                className="px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
                placeholder="Data início"
              />

              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                className="px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
                placeholder="Data fim"
              />

              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B6F76] dark:text-gray-400" />
                <input
                  type="text"
                  value={filtros.busca}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                  className="pl-10 pr-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm w-48"
                  placeholder="Buscar..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`p-4 rounded-lg mb-6 ${msg.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {msg}
          </div>
        )}

        {/* Lista de Movimentações */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F5F6FA] dark:bg-[#181C23]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6F76] dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6F76] dark:text-gray-300 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6F76] dark:text-gray-300 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6F76] dark:text-gray-300 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6F76] dark:text-gray-300 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6F76] dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6F76] dark:text-gray-300 uppercase tracking-wider">
                    Forma Pgto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6B6F76] dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E9F1] dark:divide-[#23283A]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-[#6B6F76] dark:text-gray-300">
                      Carregando...
                    </td>
                  </tr>
                ) : movimentacoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-[#6B6F76] dark:text-gray-300">
                      Nenhuma movimentação encontrada
                    </td>
                  </tr>
                ) : (
                  movimentacoesFiltradas.map((mov) => (
                    <tr key={mov.id} className="hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mov.tipo === 'entrada' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${
                          mov.tipo === 'entrada' 
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {mov.tipo === 'entrada' ? '+' : '-'}{formatCurrency(mov.valor)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#2E2F38] dark:text-white">
                        {mov.categoria}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#2E2F38] dark:text-white max-w-xs truncate">
                        {mov.descricao}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                        {mov.data.toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(mov.status)}`}>
                          {STATUS.find(s => s.value === mov.status)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B6F76] dark:text-gray-300">
                        {mov.formaPagamento || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditar(mov)}
                            className="text-[#3478F6] hover:text-[#255FD1] text-sm font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleExcluir(mov.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Nova/Editar Movimentação */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">
                    {editId ? 'Editar' : 'Nova'} Movimentação
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditId(null);
                      resetForm();
                    }}
                    className="text-[#6B6F76] hover:text-[#2E2F38] dark:text-gray-300 dark:hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSalvar} className="space-y-6">
                  {/* Tipo e Valor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                        Tipo *
                      </label>
                      <select
                        value={form.tipo}
                        onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                        required
                      >
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                        Valor *
                      </label>
                      <input
                        type="number"
                        value={form.valor}
                        onChange={(e) => setForm(prev => ({ ...prev, valor: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                        placeholder="0,00"
                        step="0.01"
                        min="0.01"
                        required
                      />
                    </div>
                  </div>

                  {/* Categoria e Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                        Categoria *
                      </label>
                      <select
                        value={form.categoria}
                        onChange={(e) => setForm(prev => ({ ...prev, categoria: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                        required
                      >
                        <option value="">Selecione uma categoria</option>
                        {(form.tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                        Data *
                      </label>
                      <input
                        type="date"
                        value={form.data}
                        onChange={(e) => setForm(prev => ({ ...prev, data: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Status e Forma de Pagamento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                        Status *
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                        required
                      >
                        {STATUS.map(status => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                        Forma de Pagamento
                      </label>
                      <select
                        value={form.formaPagamento}
                        onChange={(e) => setForm(prev => ({ ...prev, formaPagamento: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                      >
                        <option value="">Selecione</option>
                        {FORMAS_PAGAMENTO.map(fp => (
                          <option key={fp} value={fp}>{fp}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                      Descrição *
                    </label>
                    <input
                      type="text"
                      value={form.descricao}
                      onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                      placeholder="Descrição da movimentação"
                      required
                    />
                  </div>

                  {/* Observação */}
                  <div>
                    <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                      Observação
                    </label>
                    <textarea
                      value={form.observacao}
                      onChange={(e) => setForm(prev => ({ ...prev, observacao: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white resize-none"
                      rows={3}
                      placeholder="Observações adicionais..."
                    />
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditId(null);
                        resetForm();
                      }}
                      className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : (editId ? 'Atualizar' : 'Criar')}
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