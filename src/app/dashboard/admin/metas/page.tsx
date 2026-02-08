"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

interface Corretor {
  id: string;
  nome: string;
}

interface Contribuicao {
  id: string;
  corretorId: string;
  corretorNome: string;
  valor: number;
  dataVenda?: string; // YYYY-MM-DD para relatórios mês a mês
  createdAt: any;
}

export default function AdminMetasPage() {
  const { userData, currentUser } = useAuth();
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [vgv, setVgv] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [ultimaAtualizacaoPor, setUltimaAtualizacaoPor] = useState<string | null>(null);

  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([]);
  const [corretorSelecionado, setCorretorSelecionado] = useState('');
  const [valorContribuicao, setValorContribuicao] = useState('');
  const [dataVendaContribuicao, setDataVendaContribuicao] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [adding, setAdding] = useState(false);

  const totalRealizado = contribuicoes.reduce((s, c) => s + c.valor, 0);
  const percentualCalculado = vgv && totalRealizado >= 0 ? Math.round((totalRealizado / parseFloat(vgv)) * 100) : 0;

  // Buscar corretores aprovados da imobiliária
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    const fetchCorretores = async () => {
      const q = query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', userData.imobiliariaId),
        where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria']),
        where('aprovado', '==', true)
      );
      const snapshot = await getDocs(q);
      setCorretores(snapshot.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    fetchCorretores();
  }, [userData?.imobiliariaId]);

  // Buscar meta e contribuições
  const fetchMeta = async () => {
    if (!userData?.imobiliariaId) {
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const metaRef = doc(db, 'metas', userData.imobiliariaId);
      const snap = await getDoc(metaRef);
      if (snap.exists()) {
        const meta = snap.data();
        setInicio(meta.inicio ? meta.inicio.split('T')[0] : '');
        setFim(meta.fim ? meta.fim.split('T')[0] : '');
        setVgv(meta.valor != null ? meta.valor.toString() : '');
        setUltimaAtualizacaoPor(meta.updatedByNome ?? null);
      }
      const contribRef = collection(db, 'metas', userData.imobiliariaId, 'contribuicoes');
      const contribSnap = await getDocs(query(contribRef, orderBy('createdAt', 'desc')));
      const lista = contribSnap.docs.map(d => ({
        id: d.id,
        corretorId: d.data().corretorId ?? '',
        corretorNome: d.data().corretorNome ?? '',
        valor: Number(d.data().valor) ?? 0,
        dataVenda: d.data().dataVenda ?? undefined,
        createdAt: d.data().createdAt,
      }));
      setContribuicoes(lista);
      // Sincronizar documento da meta com a soma das contribuições (primeira página do dashboard lê esse doc)
      const totalContribuicoes = lista.reduce((s, c) => s + c.valor, 0);
      const valorMeta = snap.exists() ? Number(snap.data()?.valor) : 0;
      const percentual = valorMeta > 0 ? Math.round((totalContribuicoes / valorMeta) * 100) : 0;
      await setDoc(metaRef, {
        alcancado: totalContribuicoes,
        percentual,
        updatedAt: Timestamp.now(),
      }, { merge: true });
    } catch (error) {
      console.error('Erro ao buscar meta:', error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, [userData?.imobiliariaId]);

  async function updateMetaAlcancado(alcancado: number) {
    if (!userData?.imobiliariaId) return;
    const metaRef = doc(db, 'metas', userData.imobiliariaId);
    const valorNum = parseFloat(vgv) || 0;
    const percentual = valorNum > 0 ? Math.round((alcancado / valorNum) * 100) : 0;
    await setDoc(metaRef, {
      alcancado,
      percentual,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser?.uid ?? null,
      updatedByNome: userData?.nome ?? null,
    }, { merge: true });
  }

  async function handleAddContribuicao(e: React.FormEvent) {
    e.preventDefault();
    if (!userData?.imobiliariaId || !corretorSelecionado || !valorContribuicao) return;
    const valor = parseFloat(valorContribuicao.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) return;
    const corretor = corretores.find(c => c.id === corretorSelecionado);
    setAdding(true);
    try {
      const contribRef = collection(db, 'metas', userData.imobiliariaId, 'contribuicoes');
      await addDoc(contribRef, {
        corretorId: corretorSelecionado,
        corretorNome: corretor?.nome ?? '',
        valor,
        dataVenda: dataVendaContribuicao || new Date().toISOString().slice(0, 10),
        createdAt: Timestamp.now(),
      });
      setValorContribuicao('');
      await fetchMeta();
      await updateMetaAlcancado(totalRealizado + valor);
      setUltimaAtualizacaoPor(userData?.nome ?? null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Erro ao adicionar contribuição:', err);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveContribuicao(id: string) {
    if (!userData?.imobiliariaId) return;
    try {
      await deleteDoc(doc(db, 'metas', userData.imobiliariaId, 'contribuicoes', id));
      const novaLista = contribuicoes.filter(c => c.id !== id);
      setContribuicoes(novaLista);
      await updateMetaAlcancado(novaLista.reduce((s, c) => s + c.valor, 0));
    } catch (err) {
      console.error('Erro ao remover contribuição:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userData?.imobiliariaId) return;
    setLoading(true);
    try {
      const metaRef = doc(db, 'metas', userData.imobiliariaId);
      const valorNum = parseFloat(vgv) || 0;
      const novaMeta = {
        imobiliariaId: userData.imobiliariaId,
        inicio,
        fim,
        valor: valorNum,
        alcancado: totalRealizado,
        percentual: percentualCalculado,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser?.uid ?? null,
        updatedByNome: userData?.nome ?? null,
      };
      await setDoc(metaRef, novaMeta, { merge: true });
      const historicoRef = collection(db, 'metas', userData.imobiliariaId, 'historico');
      await addDoc(historicoRef, {
        updatedBy: currentUser?.uid ?? null,
        updatedByNome: userData?.nome ?? null,
        valor: valorNum,
        alcancado: totalRealizado,
        percentual: percentualCalculado,
        inicio,
        fim,
        createdAt: Timestamp.now(),
      });
      setSuccess(true);
      setUltimaAtualizacaoPor(userData?.nome ?? null);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3478F6]"></div>
          <span className="ml-2 text-white">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10 bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-8 shadow-xl">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <svg className="h-7 w-7 text-[#3478F6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        Gerenciar Meta da Imobiliária
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-white">Início</label>
            <input type="date" className="w-full rounded-lg border px-3 py-2 text-white bg-[#23283A]/50 border-[#3478F6]/30" value={inicio} onChange={e => setInicio(e.target.value)} required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-white">Fim</label>
            <input type="date" className="w-full rounded-lg border px-3 py-2 text-white bg-[#23283A]/50 border-[#3478F6]/30" value={fim} onChange={e => setFim(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-white">VGV Estimado (R$)</label>
          <input 
            type="number" 
            className="w-full rounded-lg border px-3 py-2 text-white bg-[#23283A]/50 border-[#3478F6]/30" 
            value={vgv} 
            onChange={e => setVgv(e.target.value)}
            placeholder="0"
            min="0"
            step="0.01"
            required 
          />
        </div>

        {/* Contribuições por corretor — soma vira o VGV realizado */}
        <div className="rounded-xl border border-[#3478F6]/30 bg-[#23283A]/40 p-4 space-y-4">
          <h3 className="text-base font-semibold text-white">Contribuições por corretor</h3>
          <form onSubmit={handleAddContribuicao} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium mb-1 text-white/80">Corretor</label>
              <select
                value={corretorSelecionado}
                onChange={e => setCorretorSelecionado(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-white bg-[#23283A]/50 border-[#3478F6]/30"
                required
              >
                <option value="">Selecione</option>
                {corretores.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium mb-1 text-white/80">Data da venda</label>
              <input
                type="date"
                value={dataVendaContribuicao}
                onChange={e => setDataVendaContribuicao(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-white bg-[#23283A]/50 border-[#3478F6]/30"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium mb-1 text-white/80">Valor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valorContribuicao}
                onChange={e => setValorContribuicao(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-white bg-[#23283A]/50 border-[#3478F6]/30"
              />
            </div>
            <button
              type="submit"
              disabled={adding || !corretorSelecionado || !valorContribuicao}
              className="bg-[#3AC17C] hover:bg-[#2fa86a] text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
            >
              {adding ? '...' : 'Adicionar'}
            </button>
          </form>
          {contribuicoes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-white/80">Lançamentos:</p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {contribuicoes.map(c => {
                const dataExib = c.dataVenda ? (() => {
                  const [y, m, d] = c.dataVenda!.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
                })() : '–';
                return (
                  <li key={c.id} className="flex items-center justify-between text-sm text-white bg-[#23283A]/50 rounded-lg px-3 py-2">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0">
                      <span>{c.corretorNome}</span>
                      <span className="text-white/70 text-xs">{dataExib}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span>R$ {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveContribuicao(c.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
              </ul>
              <p className="text-base font-bold text-[#3478F6] pt-2 border-t border-[#3478F6]/20">
                Total realizado: R$ {totalRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {contribuicoes.length === 0 && (
            <p className="text-sm text-white/70">Adicione valores por corretor; o total será o VGV realizado.</p>
          )}
        </div>

        {ultimaAtualizacaoPor && (
          <p className="text-sm text-white/70">Última atualização: <span className="font-medium text-white">{ultimaAtualizacaoPor}</span></p>
        )}
        <div className="bg-[#23283A]/30 border border-[#3478F6]/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">% Alcançado (calculado automaticamente)</span>
            <span className="text-lg font-bold text-[#3478F6]">{percentualCalculado}%</span>
          </div>
          <div className="w-full h-2 bg-[#23283A] rounded-full mt-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${percentualCalculado >= 100 ? 'bg-[#3AC17C]' : 'bg-[#3478F6]'}`} 
              style={{ width: `${Math.min(percentualCalculado, 100)}%` }}
            ></div>
          </div>
        </div>
        <button type="submit" className="mt-4 bg-[#3478F6] hover:bg-[#255FD1] text-white font-bold py-2 px-6 rounded-lg transition-all disabled:opacity-60" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Meta'}
        </button>
        {success && <div className="text-green-400 font-semibold mt-2">Meta salva com sucesso!</div>}
      </form>
    </div>
  );
} 