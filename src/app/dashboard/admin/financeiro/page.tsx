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

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14"/>
    <path d="M12 5v14"/>
  </svg>
);

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

// Categorias simplificadas
const CATEGORIAS_ENTRADA = [
  'Comissão de Venda',
  'Comissão de Aluguel', 
  'Taxa de Administração',
  'Receita de Serviços',
  'Outros'
];

const CATEGORIAS_SAIDA = [
  'Salários',
  'Aluguel',
  'Contas',
  'Marketing',
  'Material de Escritório',
  'Impostos',
  'Outros'
];

const FORMAS_PAGAMENTO = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito', 
  'Transferência',
  'Dinheiro',
  'Outro'
];

export default function FinanceiroPage() {
  const { userData, currentUser } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo: '',
    categoria: '',
    status: '',
    dataInicio: '',
    dataFim: '',
    busca: ''
  });

  // Formulário simplificado
  const [form, setForm] = useState({
    tipo: 'entrada',
    valor: '',
    categoria: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    status: 'confirmado',
    formaPagamento: '',
    observacao: ''
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
      observacao: mov.observacao || ''
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
      observacao: ''
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Controle Financeiro</h1>
          <p className="text-[#6B6F76] dark:text-gray-300">Gerencie entradas e saídas da sua imobiliária</p>
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
                <DollarIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
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
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-4 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-6">
          <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Nova Movimentação
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-2 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg text-sm transition-colors"
              >
                <FilterIcon className="h-4 w-4" />
                Filtros
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={filtros.busca}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                className="pl-8 pr-2 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white w-48 text-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                placeholder="Buscar..."
              />
              <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B6F76] dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[#E8E9F1] dark:border-[#23283A]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                <select
                  value={filtros.tipo}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
                  className="px-2 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
                >
                  <option value="">Todos os tipos</option>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
                  className="px-2 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
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
                  className="px-2 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
                  placeholder="Data início"
                />
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                  className="px-2 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
                  placeholder="Data fim"
                />
                <button
                  onClick={() => setFiltros({
                    tipo: '',
                    categoria: '',
                    status: '',
                    dataInicio: '',
                    dataFim: '',
                    busca: ''
                  })}
                  className="px-2 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`p-4 rounded-xl mb-6 ${msg.includes('Erro') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
            {msg}
          </div>
        )}

        {/* Lista de Movimentações */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[#6B6F76] dark:text-gray-300">
              Carregando movimentações...
            </div>
          ) : movimentacoesFiltradas.length === 0 ? (
            <div className="p-8 text-center text-[#6B6F76] dark:text-gray-300">
              <DollarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Nenhuma movimentação encontrada</p>
              <p className="text-sm">Comece adicionando sua primeira movimentação financeira</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E8E9F1] dark:divide-[#23283A]">
              {movimentacoesFiltradas.map((mov) => (
                <div key={mov.id} className="p-4 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${
                        mov.tipo === 'entrada' 
                          ? 'bg-green-100 dark:bg-green-900/20' 
                          : 'bg-red-100 dark:bg-red-900/20'
                      }`}>
                        {mov.tipo === 'entrada' ? (
                          <TrendingUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDownIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#2E2F38] dark:text-white text-base">
                            {mov.descricao}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#6B6F76] dark:text-gray-300">
                          <span>{mov.tipo === 'entrada' ? mov.categoria : mov.formaPagamento || '-'}</span>
                          <span>•</span>
                          <span>{formatDate(mov.data)}</span>
                        </div>
                        {mov.observacao && (
                          <p className="text-xs text-[#6B6F76] dark:text-gray-400 mt-1">
                            {mov.observacao}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          mov.tipo === 'entrada' 
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {mov.tipo === 'entrada' ? '+' : '-'}{formatCurrency(mov.valor)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => handleEditar(mov)}
                        className="p-1 text-[#3478F6] hover:bg-[#3478F6] hover:text-white rounded-md transition-colors"
                        title="Editar"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleExcluir(mov.id)}
                        className="p-1 text-red-600 hover:bg-red-600 hover:text-white rounded-md transition-colors"
                        title="Excluir"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Nova/Editar Movimentação */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
                    className="text-[#6B6F76] hover:text-[#2E2F38] dark:text-gray-300 dark:hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSalvar} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">
                        Tipo *
                      </label>
                      <select
                        value={form.tipo}
                        onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value, categoria: '', formaPagamento: '' }))}
                        className="w-full px-2 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                        required
                      >
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">
                        Valor *
                      </label>
                      <input
                        type="number"
                        value={form.valor}
                        onChange={(e) => setForm(prev => ({ ...prev, valor: e.target.value }))}
                        className="w-full px-2 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                        placeholder="0,00"
                        step="0.01"
                        min="0.01"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {form.tipo === 'entrada' ? (
                      <div>
                        <label className="block text-xs font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">
                          Tipo de Entrada *
                        </label>
                        <select
                          value={form.categoria}
                          onChange={(e) => setForm(prev => ({ ...prev, categoria: e.target.value }))}
                          className="w-full px-2 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                          required
                        >
                          <option value="">Selecione</option>
                          {CATEGORIAS_ENTRADA.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">
                          Forma de Pagamento *
                        </label>
                        <select
                          value={form.formaPagamento}
                          onChange={(e) => setForm(prev => ({ ...prev, formaPagamento: e.target.value }))}
                          className="w-full px-2 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                          required
                        >
                          <option value="">Selecione</option>
                          {FORMAS_PAGAMENTO.map(fp => (
                            <option key={fp} value={fp}>{fp}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">
                        Data *
                      </label>
                      <input
                        type="date"
                        value={form.data}
                        onChange={(e) => setForm(prev => ({ ...prev, data: e.target.value }))}
                        className="w-full px-2 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">
                      Descrição *
                    </label>
                    <input
                      type="text"
                      value={form.descricao}
                      onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                      className="w-full px-2 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                      placeholder="Descrição da movimentação"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">
                      Observação
                    </label>
                    <textarea
                      value={form.observacao}
                      onChange={(e) => setForm(prev => ({ ...prev, observacao: e.target.value }))}
                      className="w-full px-2 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3478F6]"
                      rows={2}
                      placeholder="Observações adicionais..."
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditId(null);
                        resetForm();
                      }}
                      className="flex-1 px-2 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-2 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
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