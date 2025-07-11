'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, orderBy, Timestamp, doc } from 'firebase/firestore';

const TABS = [
  { key: 'visao', label: 'Visão geral', icon: '📈' },
  { key: 'lancamentos', label: 'Lançamentos', icon: '💸' },
  { key: 'bancos', label: 'Meus bancos', icon: '🏦' },
  { key: 'cartoes', label: 'Meus cartões', icon: '💳' },
  { key: 'historico', label: 'Histórico', icon: '🕒' },
  { key: 'relatorios', label: 'Relatórios', icon: '📊' },
  { key: 'categorias', label: 'Categorias', icon: '➕' },
];

const CATEGORIAS_PADRAO = [
  'Comissão', 'Aluguel recebido', 'Taxa de administração', 'Salário', 'Despesas operacionais', 'Taxas bancárias', 'Impostos', 'Outros'
];
const FORMAS_PAGAMENTO = ['Pix', 'Boleto', 'Cartão', 'Dinheiro', 'Transferência', 'Outro'];
const TIPOS = ['entrada', 'saída', 'transferência'];
const STATUS = ['pendente', 'confirmado', 'cancelado'];

export default function FinanceiroPage() {
  const { userData, currentUser } = useAuth();
  const [tab, setTab] = useState('visao');
  const [movs, setMovs] = useState<any[]>([]);
  const [categorias, setCategorias] = useState(CATEGORIAS_PADRAO);
  const [filtros, setFiltros] = useState({ tipo: '', categoria: '', status: '', periodo: '', busca: '' });
  const [form, setForm] = useState<any>({ tipo: 'entrada', valor: '', categoria: '', descricao: '', data: '', status: 'confirmado', formaPagamento: '', observacao: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Buscar movimentações
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    setLoading(true);
    const fetchMovs = async () => {
      const q = query(
        collection(db, 'financeiro_movimentacoes'),
        where('imobiliariaId', '==', userData.imobiliariaId),
        orderBy('data', 'desc')
      );
      const snap = await getDocs(q);
      setMovs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchMovs();
  }, [userData]);

  // CRUD movimentação
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    if (!userData?.imobiliariaId) { setMsg('Usuário não autenticado.'); setLoading(false); return; }
    try {
      const dataObj = form.data ? new Date(form.data) : new Date();
      const mov = {
        ...form,
        valor: Number(form.valor),
        imobiliariaId: userData.imobiliariaId,
        usuarioId: currentUser?.uid ?? '',
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        data: Timestamp.fromDate(dataObj),
      };
      if (editId) {
        await updateDoc(doc(db, 'financeiro_movimentacoes', editId), mov);
        setMsg('Movimentação atualizada!');
      } else {
        await addDoc(collection(db, 'financeiro_movimentacoes'), mov);
        setMsg('Movimentação criada!');
      }
      setForm({ tipo: 'entrada', valor: '', categoria: '', descricao: '', data: '', status: 'confirmado', formaPagamento: '', observacao: '' });
      setEditId(null);
      // Atualiza lista
      const q = query(
        collection(db, 'financeiro_movimentacoes'),
        where('imobiliariaId', '==', userData.imobiliariaId),
        orderBy('data', 'desc')
      );
      const snap = await getDocs(q);
      setMovs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      setMsg('Erro ao salvar movimentação.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (mov: any) => {
    setForm({ ...mov, data: mov.data?.toDate?.().toISOString().slice(0, 10) });
    setEditId(mov.id);
  };

  const handleExcluir = async (id: string) => {
    setLoading(true);
    setMsg(null);
    try {
      await deleteDoc(doc(db, 'financeiro_movimentacoes', id));
      setMovs(movs.filter(m => m.id !== id));
      setMsg('Movimentação excluída!');
    } catch {
      setMsg('Erro ao excluir.');
    } finally {
      setLoading(false);
    }
  };

  // Dashboard de saldos
  const saldo = movs.reduce((acc, m) => m.status === 'confirmado' ? acc + (m.tipo === 'entrada' ? m.valor : -m.valor) : acc, 0);
  const entradas = movs.filter(m => m.tipo === 'entrada' && m.status === 'confirmado').reduce((acc, m) => acc + m.valor, 0);
  const saidas = movs.filter(m => m.tipo === 'saída' && m.status === 'confirmado').reduce((acc, m) => acc + m.valor, 0);
  const saldoFuturo = movs.reduce((acc, m) => acc + (m.tipo === 'entrada' ? m.valor : -m.valor), 0);

  return (
    <div className="min-h-screen bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2 text-left">Financeiro</h1>
        <p className="text-gray-300 mb-8 text-left text-base">Gerencie o financeiro da sua imobiliária de forma moderna e intuitiva.</p>
        {/* Abas */}
        <div className="flex gap-6 mb-6">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-150 ${tab === t.key ? 'bg-[#23283A] text-[#3478F6]' : 'text-gray-300 hover:bg-[#23283A]'}`}
              onClick={() => setTab(t.key)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        {/* Dashboard Visão Geral */}
        {tab === 'visao' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Saldo Atual</span>
              <span className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-2">R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Entradas</span>
              <span className="text-2xl font-bold text-[#22C55E] mb-2">R$ {entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Saídas</span>
              <span className="text-2xl font-bold text-[#F45B69] mb-2">R$ {saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Saldo Futuro</span>
              <span className="text-2xl font-bold text-[#3478F6] mb-2">R$ {saldoFuturo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
        {/* Lançamentos */}
        {tab === 'lancamentos' && (
          <div>
            <form onSubmit={handleSalvar} className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mb-8 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Tipo</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white" value={form.tipo} onChange={e => setForm((f: any) => ({ ...f, tipo: e.target.value }))}>{TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Valor</label>
                  <input type="number" className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white" value={form.valor} onChange={e => setForm((f: any) => ({ ...f, valor: e.target.value }))} required min={0.01} step={0.01} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Categoria</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white" value={form.categoria} onChange={e => setForm((f: any) => ({ ...f, categoria: e.target.value }))}>{categorias.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Data</label>
                  <input type="date" className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white" value={form.data} onChange={e => setForm((f: any) => ({ ...f, data: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Status</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white" value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>{STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Forma de Pagamento</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white" value={form.formaPagamento} onChange={e => setForm((f: any) => ({ ...f, formaPagamento: e.target.value }))}>{FORMAS_PAGAMENTO.map(fp => <option key={fp} value={fp}>{fp}</option>)}</select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Descrição</label>
                  <input type="text" className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white" value={form.descricao} onChange={e => setForm((f: any) => ({ ...f, descricao: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-1">Observação</label>
                  <input type="text" className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white" value={form.observacao} onChange={e => setForm((f: any) => ({ ...f, observacao: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button type="submit" className="px-6 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors disabled:opacity-50" disabled={loading}>{editId ? 'Atualizar' : 'Cadastrar'}</button>
                {editId && <button type="button" className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors" onClick={() => { setForm({ tipo: 'entrada', valor: '', categoria: '', descricao: '', data: '', status: 'confirmado', formaPagamento: '', observacao: '' }); setEditId(null); }}>Cancelar edição</button>}
              </div>
              {msg && <div className="mt-2 text-sm text-[#3478F6] dark:text-[#A3C8F7]">{msg}</div>}
            </form>
            {/* Tabela de movimentações */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white dark:bg-[#23283A] rounded-xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] table-fixed">
                <thead>
                  <tr className="bg-[#F5F6FA] dark:bg-[#23283A] text-[#6B6F76] dark:text-gray-300 text-xs">
                    <th className="px-4 py-2 font-semibold text-left">Tipo</th>
                    <th className="px-4 py-2 font-semibold text-left">Valor</th>
                    <th className="px-4 py-2 font-semibold text-left">Categoria</th>
                    <th className="px-4 py-2 font-semibold text-left">Descrição</th>
                    <th className="px-4 py-2 font-semibold text-left">Data</th>
                    <th className="px-4 py-2 font-semibold text-left">Status</th>
                    <th className="px-4 py-2 font-semibold text-left">Forma Pgto</th>
                    <th className="px-4 py-2 font-semibold text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.map(mov => (
                    <tr key={mov.id} className="border-t hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                      <td className="px-4 py-2 font-medium text-[#2E2F38] dark:text-white">{mov.tipo}</td>
                      <td className="px-4 py-2 text-[#2E2F38] dark:text-white">R$ {Number(mov.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 text-[#6B6F76] dark:text-gray-300">{mov.categoria}</td>
                      <td className="px-4 py-2 text-[#6B6F76] dark:text-gray-300">{mov.descricao}</td>
                      <td className="px-4 py-2 text-[#6B6F76] dark:text-gray-300">{mov.data?.toDate?.().toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-2 text-[#6B6F76] dark:text-gray-300">{mov.status}</td>
                      <td className="px-4 py-2 text-[#6B6F76] dark:text-gray-300">{mov.formaPagamento}</td>
                      <td className="px-4 py-2">
                        <button className="text-blue-600 dark:text-blue-400 hover:underline mr-2" onClick={() => handleEditar(mov)}>Editar</button>
                        <button className="text-red-500 hover:underline" onClick={() => handleExcluir(mov.id)}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Outras abas podem ser implementadas depois */}
      </div>
    </div>
  );
} 