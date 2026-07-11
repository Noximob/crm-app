"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import MoneyInput from '@/components/MoneyInput';
import { DEMO_REPORT_CORRETORES, DEMO_CONTRIBUICOES, DEMO_METAS_VGV, DEMO_METAS_VGV_MENSAL, DEMO_METAS_PESSOAIS } from '@/lib/espelho/demoData';
import LoadingState from '@/components/ui/LoadingState';

interface Corretor {
  id: string;
  nome: string;
}

// Data de hoje no fuso local em formato YYYY-MM-DD (sem deslocamento UTC)
function localYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Contribuicao {
  id: string;
  corretorId: string;
  corretorNome: string;
  valor: number;
  dataVenda?: string; // YYYY-MM-DD para relatórios mês a mês
  createdAt: any;
}

// Se a meta tem período (inicio/fim), só conta contribuições com dataVenda dentro dele
// (comparação de string funciona para YYYY-MM-DD)
function filtraContribuicoesPeriodo(lista: Contribuicao[], inicio: string, fim: string): Contribuicao[] {
  if (!inicio || !fim) return lista;
  return lista.filter(c => c.dataVenda && c.dataVenda >= inicio && c.dataVenda <= fim);
}

export default function AdminMetasPage() {
  const { userData, currentUser, isEspelhoDemo } = useAuth();
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [vgv, setVgv] = useState<number>(0);
  const [inicioMensal, setInicioMensal] = useState('');
  const [fimMensal, setFimMensal] = useState('');
  const [vgvMensal, setVgvMensal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [ultimaAtualizacaoPor, setUltimaAtualizacaoPor] = useState<string | null>(null);

  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([]);
  const [corretorSelecionado, setCorretorSelecionado] = useState('');
  const [valorContribuicao, setValorContribuicao] = useState<number>(0);
  const [dataVendaContribuicao, setDataVendaContribuicao] = useState(() => localYmd());
  const [adding, setAdding] = useState(false);

  const [metasPessoais, setMetasPessoais] = useState<Record<string, number>>({});
  const [valorAlmejadoInputs, setValorAlmejadoInputs] = useState<Record<string, number>>({});
  const [savingPessoal, setSavingPessoal] = useState<string | null>(null);

  const totalRealizado = filtraContribuicoesPeriodo(contribuicoes, inicio, fim).reduce((s, c) => s + c.valor, 0);
  const percentualCalculado = vgv > 0 && totalRealizado >= 0 ? Math.round((totalRealizado / vgv) * 100) : 0;
  // Soma das metas pessoais dos corretores (interliga com o que cada corretor tem definido)
  const somaMetasPessoais = Object.values(metasPessoais).reduce((s, v) => s + (Number(v) || 0), 0);
  const metaImobValor = vgv;

  // Converte valor em formato BR (3.000.000,00) ou número simples para número
  function parseValorBR(str: string): number {
    if (!str || !String(str).trim()) return NaN;
    const cleaned = String(str).trim().replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned);
  }

  // Buscar corretores aprovados da imobiliária
  useEffect(() => {
    if (!userData?.imobiliariaId && !isEspelhoDemo) return;
    if (isEspelhoDemo) {
      setCorretores(DEMO_REPORT_CORRETORES.map(c => ({ id: c.uid, nome: c.nome })));
      setMetasPessoais(DEMO_METAS_PESSOAIS);
      setValorAlmejadoInputs({ ...DEMO_METAS_PESSOAIS });
      return;
    }
    const fetchCorretores = async () => {
      const q = query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', userData!.imobiliariaId),
        where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria']),
        where('aprovado', '==', true)
      );
      const snapshot = await getDocs(q);
      setCorretores(snapshot.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    fetchCorretores();
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  // Buscar metas pessoais (valor almejado por corretor)
  useEffect(() => {
    if (!userData?.imobiliariaId || isEspelhoDemo) return;
    const refPessoais = collection(db, 'metas', userData.imobiliariaId, 'metasPessoais');
    getDocs(refPessoais).then((snap) => {
      const map: Record<string, number> = {};
      const inputs: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const v = Number(d.data().valorAlmejado);
        if (!isNaN(v)) {
          map[d.id] = v;
          inputs[d.id] = v;
        }
      });
      setMetasPessoais(map);
      setValorAlmejadoInputs((prev) => ({ ...prev, ...inputs }));
    });
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  // Buscar meta e contribuições
  const fetchMeta = async () => {
    if (!userData?.imobiliariaId && !isEspelhoDemo) {
      setFetching(false);
      return;
    }
    if (isEspelhoDemo) {
      setVgv(Number(DEMO_METAS_VGV));
      setVgvMensal(Number(DEMO_METAS_VGV_MENSAL));
      setContribuicoes(DEMO_CONTRIBUICOES as Contribuicao[]);
      setFetching(false);
      return;
    }
    setFetching(true);
    const imobId = userData!.imobiliariaId!;
    try {
      const metaRef = doc(db, 'metas', imobId);
      const snap = await getDoc(metaRef);
      if (snap.exists()) {
        const meta = snap.data();
        setInicio(meta.inicio ? meta.inicio.split('T')[0] : '');
        setFim(meta.fim ? meta.fim.split('T')[0] : '');
        setVgv(meta.valor != null ? Number(meta.valor) : 0);
        setInicioMensal(meta.inicioMensal ? meta.inicioMensal.split('T')[0] : '');
        setFimMensal(meta.fimMensal ? meta.fimMensal.split('T')[0] : '');
        setVgvMensal(meta.valorMensal != null ? Number(meta.valorMensal) : 0);
        setUltimaAtualizacaoPor(meta.updatedByNome ?? null);
      }
      const contribRef = collection(db, 'metas', imobId, 'contribuicoes');
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
      // Sincronizar documento da meta com a soma das contribuições DO PERÍODO (primeira página do dashboard lê esse doc)
      const metaInicio = snap.exists() && snap.data()?.inicio ? String(snap.data()!.inicio).split('T')[0] : '';
      const metaFim = snap.exists() && snap.data()?.fim ? String(snap.data()!.fim).split('T')[0] : '';
      const totalContribuicoes = filtraContribuicoesPeriodo(lista, metaInicio, metaFim).reduce((s, c) => s + c.valor, 0);
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
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  async function updateMetaAlcancado(alcancado: number) {
    if (isEspelhoDemo || !userData?.imobiliariaId) return;
    const metaRef = doc(db, 'metas', userData.imobiliariaId);
    const valorNum = vgv;
    const percentual = valorNum > 0 ? Math.round((alcancado / valorNum) * 100) : 0;
    await setDoc(metaRef, {
      alcancado,
      percentual,
      updatedAt: Timestamp.now(),
      updatedBy: currentUser?.uid ?? null,
      updatedByNome: userData?.nome ?? null,
    }, { merge: true });
  }

  async function handleAddContribuicao(e?: React.FormEvent) {
    e?.preventDefault();
    if (isEspelhoDemo) return;
    if (!userData?.imobiliariaId || !corretorSelecionado || !valorContribuicao) return;
    const valor = valorContribuicao;
    if (!valor || valor <= 0) return;
    const corretor = corretores.find(c => c.id === corretorSelecionado);
    setAdding(true);
    try {
      const contribRef = collection(db, 'metas', userData.imobiliariaId, 'contribuicoes');
      await addDoc(contribRef, {
        corretorId: corretorSelecionado,
        corretorNome: corretor?.nome ?? '',
        valor,
        dataVenda: dataVendaContribuicao || localYmd(),
        createdAt: Timestamp.now(),
      });
      setValorContribuicao(0);
      await fetchMeta(); // fetchMeta já recalcula e persiste o total atualizado
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
    if (isEspelhoDemo) {
      setContribuicoes(prev => prev.filter(c => c.id !== id));
      return;
    }
    if (!userData?.imobiliariaId) return;
    try {
      await deleteDoc(doc(db, 'metas', userData.imobiliariaId, 'contribuicoes', id));
      const novaLista = contribuicoes.filter(c => c.id !== id);
      setContribuicoes(novaLista);
      await updateMetaAlcancado(filtraContribuicoesPeriodo(novaLista, inicio, fim).reduce((s, c) => s + c.valor, 0));
    } catch (err) {
      console.error('Erro ao remover contribuição:', err);
    }
  }

  async function handleSaveMetaPessoal(corretorId: string) {
    if (isEspelhoDemo || !userData?.imobiliariaId) return;
    const valor = valorAlmejadoInputs[corretorId] ?? 0;
    if (valor < 0) return;
    setSavingPessoal(corretorId);
    try {
      const refPessoal = doc(db, 'metas', userData.imobiliariaId, 'metasPessoais', corretorId);
      await setDoc(refPessoal, { valorAlmejado: valor }, { merge: true });
      setMetasPessoais((prev) => ({ ...prev, [corretorId]: valor }));
      setValorAlmejadoInputs((prev) => ({ ...prev, [corretorId]: valor }));
    } catch (err) {
      console.error('Erro ao salvar meta pessoal:', err);
    } finally {
      setSavingPessoal(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEspelhoDemo || !userData?.imobiliariaId) return;
    setLoading(true);
    try {
      const metaRef = doc(db, 'metas', userData.imobiliariaId);
      const valorNum = vgv;
      const valorMensalNum = vgvMensal;
      const novaMeta = {
        imobiliariaId: userData.imobiliariaId,
        inicio,
        fim,
        valor: valorNum,
        inicioMensal: inicioMensal || null,
        fimMensal: fimMensal || null,
        valorMensal: valorMensalNum || null,
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
      <div className="max-w-xl mx-auto mt-10 al-card relative overflow-hidden p-8">
        <div className="absolute inset-x-0 top-0 gx-line-gold" />
        <LoadingState label="Carregando..." />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10 al-card relative overflow-hidden p-8">
      <div className="absolute inset-x-0 top-0 gx-line-gold" />
      <h1 className="al-display text-[20px] font-bold text-white uppercase tracking-[0.1em] mb-6 flex items-center gap-2">
        <svg className="h-6 w-6 text-[#E8C547] drop-shadow-[0_0_8px_rgba(232,197,71,0.5)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        Gerenciar Meta da Imobiliária
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Início</label>
            <input type="date" className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={inicio} onChange={e => setInicio(e.target.value)} required />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Fim</label>
            <input type="date" className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={fim} onChange={e => setFim(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">VGV Meta Trimestral (R$)</label>
          <MoneyInput value={vgv} onChange={setVgv} className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" />
        </div>

        <div className="border-t border-white/[0.08] pt-4 mt-4">
          <h3 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em] mb-3">Meta mensal</h3>
          <div className="flex gap-4 mb-3">
            <div className="flex-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Início do mês</label>
              <input type="date" className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={inicioMensal} onChange={e => setInicioMensal(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Fim do mês</label>
              <input type="date" className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={fimMensal} onChange={e => setFimMensal(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">VGV Meta Mensal (R$)</label>
            <MoneyInput value={vgvMensal} onChange={setVgvMensal} className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" />
          </div>
        </div>

        {/* Contribuições por corretor — soma vira o VGV realizado (bloco fora do form principal para o botão Adicionar funcionar) */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-4">
          <h3 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">Contribuições por corretor</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Corretor</label>
              <select
                value={corretorSelecionado}
                onChange={e => setCorretorSelecionado(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
              >
                <option value="">Selecione</option>
                {corretores.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Data da venda</label>
              <input
                type="date"
                value={dataVendaContribuicao}
                onChange={e => setDataVendaContribuicao(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Valor (R$)</label>
              <MoneyInput value={valorContribuicao} onChange={setValorContribuicao} placeholder="0,00" className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" />
            </div>
            <button
              type="button"
              onClick={() => handleAddContribuicao()}
              disabled={adding || !corretorSelecionado || !valorContribuicao}
              className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold py-2 px-4 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {adding ? '...' : 'Adicionar'}
            </button>
          </div>
          {contribuicoes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Lançamentos:</p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {contribuicoes.map(c => {
                const dataExib = c.dataVenda ? (() => {
                  const [y, m, d] = c.dataVenda!.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
                })() : '–';
                return (
                  <li key={c.id} className="flex items-center justify-between text-sm text-white bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0">
                      <span>{c.corretorNome}</span>
                      <span className="text-text-secondary text-xs">{dataExib}</span>
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
              <p className="text-base font-bold text-[#FFE9A6] al-display tabular-nums pt-2 border-t border-white/[0.08]">
                Total realizado: R$ {totalRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {contribuicoes.length === 0 && (
            <p className="text-sm text-text-secondary">Adicione valores por corretor; o total será o VGV realizado.</p>
          )}
        </div>

        {ultimaAtualizacaoPor && (
          <p className="text-sm text-text-secondary">Última atualização: <span className="font-medium text-white">{ultimaAtualizacaoPor}</span></p>
        )}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">% Alcançado (calculado automaticamente)</span>
            <span className="text-lg font-bold text-[#FFE9A6] al-display tabular-nums">{percentualCalculado}%</span>
          </div>
          <div className="w-full h-2 bg-white/[0.06] rounded-full mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${percentualCalculado >= 100 ? 'bg-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-[#E8C547] shadow-[0_0_10px_rgba(232,197,71,0.5)]'}`}
              style={{ width: `${Math.min(percentualCalculado, 100)}%` }}
            ></div>
          </div>
        </div>
        <button type="submit" className="mt-4 bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 text-[#181203] font-bold py-2 px-6 rounded-xl shadow-[0_8px_24px_-8px_rgba(232,197,71,0.5)] active:scale-[0.98] transition-all disabled:opacity-60" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Meta'}
        </button>
        {success && <div className="text-emerald-300 font-semibold mt-2">Meta salva com sucesso!</div>}
      </form>

      {/* Metas pessoais dos corretores — fora do form para não dar submit/reload ao pressionar Enter */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-4 mt-6">
        <h3 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">
          Metas pessoais dos corretores
        </h3>
        <p className="text-sm text-text-secondary">
          O período é o mesmo da meta da imobiliária (acima). Defina o valor almejado de cada corretor para acompanhar a meta.
        </p>
        {inicio && fim && (
          <p className="text-xs text-[#FFE9A6]/90 font-medium">
            Período (somente leitura): {new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR')} a {new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR')}
          </p>
        )}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {corretores.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 py-2 border-b border-white/[0.05] last:border-0">
              <span className="font-medium text-white min-w-[140px] truncate">{c.nome}</span>
              <div className="flex-1 min-w-[160px] flex items-center gap-2">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary shrink-0">Valor almejado (R$)</label>
                <div className="flex-1 max-w-[180px]">
                  <MoneyInput value={valorAlmejadoInputs[c.id] ?? 0} onChange={(n) => setValorAlmejadoInputs((prev) => ({ ...prev, [c.id]: n }))} placeholder="0,00" className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" />
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveMetaPessoal(c.id)}
                  disabled={savingPessoal === c.id}
                  className="bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 text-[#181203] font-bold py-2 px-3 rounded-xl text-sm shadow-[0_8px_24px_-8px_rgba(232,197,71,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {savingPessoal === c.id ? '...' : 'Salvar'}
                </button>
              </div>
            </div>
          ))}
        </div>
        {corretores.length === 0 && (
          <p className="text-sm text-text-secondary">Nenhum corretor aprovado na imobiliária.</p>
        )}

        {/* Soma das metas pessoais + comparação com a meta da imobiliária */}
        <div className="pt-3 mt-1 border-t border-white/[0.08] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Soma das metas pessoais</span>
            <span className="text-lg font-bold text-[#FFE9A6] al-display tabular-nums">R$ {somaMetasPessoais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          {metaImobValor > 0 && (
            <p className="text-xs text-text-secondary">
              Meta da imobiliária: <span className="text-white font-medium">R$ {metaImobValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> ·{' '}
              {somaMetasPessoais >= metaImobValor
                ? <span className="text-emerald-300">✓ as metas pessoais já cobrem a meta da imobiliária</span>
                : <>faltam <span className="text-[#FFE9A6] font-medium">R$ {(metaImobValor - somaMetasPessoais).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> para cobrir a meta da imobiliária</>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 