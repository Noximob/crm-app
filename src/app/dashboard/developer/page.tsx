'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where, Timestamp, setDoc, doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import LoadingState from '@/components/ui/LoadingState';

interface Imobiliaria {
  id: string;
  nome: string;
  status?: string;
  aprovado?: boolean;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipoConta: string;
  aprovado: boolean;
  imobiliariaId?: string;
  permissoes?: {
    admin?: boolean;
    developer?: boolean;
  };
}

export default function DeveloperPage() {
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([]);
  const [selectedImobiliaria, setSelectedImobiliaria] = useState<Imobiliaria | null>(null);
  const [corretores, setCorretores] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCorretores, setLoadingCorretores] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showIndicadoresModal, setShowIndicadoresModal] = useState(false);
  const [indicadores, setIndicadores] = useState({
    cub: '',
    selic: '',
    ipca: '',
    igpm: '',
    incc: '',
    financiamento: '',
  });
  const [indicadoresAnterior, setIndicadoresAnterior] = useState({
    cub: '',
    selic: '',
    ipca: '',
    igpm: '',
    incc: '',
    financiamento: '',
  });
  const [salvandoIndicadores, setSalvandoIndicadores] = useState(false);
  const [indicadoresMsg, setIndicadoresMsg] = useState<string|null>(null);

  useEffect(() => {
    loadImobiliarias();
  }, []);

  const loadImobiliarias = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'imobiliarias'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Imobiliaria[];
      setImobiliarias(data);
    } catch (err) {
      setMessage('Erro ao carregar imobiliárias');
    } finally {
      setLoading(false);
    }
  };

  const loadCorretores = async (imobiliariaId: string) => {
    setLoadingCorretores(true);
    setCorretores([]);
    try {
      const q = query(collection(db, 'usuarios'), where('imobiliariaId', '==', imobiliariaId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Usuario[];
      setCorretores(data);
    } catch (err) {
      setMessage('Erro ao carregar corretores');
    } finally {
      setLoadingCorretores(false);
    }
  };

  const handleAprovarCheckbox = async (user: Usuario, valor: boolean) => {
    setMessage(null);
    try {
      await updateDoc(doc(db, 'usuarios', user.id), { aprovado: valor });
      setCorretores(corretores => corretores.map(c => c.id === user.id ? { ...c, aprovado: valor } : c));
      setMessage(valor ? 'Usuário aprovado!' : 'Usuário reprovado!');
    } catch (err) {
      setMessage('Erro ao atualizar usuário');
    }
  };

  const handlePermissao = async (user: Usuario, tipo: 'admin' | 'developer', valor: boolean) => {
    setMessage(null);
    try {
      const novasPerms = { ...user.permissoes, [tipo]: valor };
      await updateDoc(doc(db, 'usuarios', user.id), { permissoes: novasPerms });
      setCorretores(corretores => corretores.map(c => c.id === user.id ? { ...c, permissoes: novasPerms } : c));
      setMessage(`Permissão de ${tipo === 'admin' ? 'Admin' : 'Desenvolvedor'} ${valor ? 'concedida' : 'removida'}!`);
    } catch (err) {
      setMessage('Erro ao atualizar permissões');
    }
  };

  const handleExcluirCorretor = async (user: Usuario) => {
    if (user.tipoConta === 'imobiliaria') {
      setMessage('Não é possível excluir a conta da imobiliária.');
      return;
    }
    const ok = await confirmDialog({
      message: `Excluir o corretor "${user.nome || user.email}"?\n\nOs leads dele serão enviados para o topo do funil da imobiliária. Esta ação não pode ser desfeita.`,
      danger: true,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    setMessage(null);
    try {
      const imobiliariaId = user.imobiliariaId || selectedImobiliaria?.id || undefined;

      // 1. Conta da imobiliária = destino dos leads
      let destinoUid: string | null = null;
      if (imobiliariaId) {
        const ownerQ = query(
          collection(db, 'usuarios'),
          where('imobiliariaId', '==', imobiliariaId),
          where('tipoConta', '==', 'imobiliaria')
        );
        const ownerSnap = await getDocs(ownerQ);
        destinoUid = ownerSnap.docs[0]?.id ?? null;
      }

      // 2. Primeira etapa do funil (topo) — usa config da imobiliária se existir
      let primeiraEtapa = PIPELINE_STAGES[0];
      if (imobiliariaId) {
        const cfgSnap = await getDoc(firestoreDoc(db, 'configFunilVendas', imobiliariaId));
        const stages = cfgSnap.exists() ? (cfgSnap.data().stages as Array<{ label?: string }>) : null;
        if (Array.isArray(stages) && stages[0]?.label) primeiraEtapa = stages[0].label!;
      }

      // 3. Reatribuir leads do corretor para a imobiliária (topo do funil)
      const leadsSnap = await getDocs(query(collection(db, 'leads'), where('userId', '==', user.id)));
      if (!leadsSnap.empty) {
        if (!destinoUid) {
          setMessage('Conta da imobiliária (destino dos leads) não encontrada. Exclusão cancelada.');
          return;
        }
        const docsArr = leadsSnap.docs;
        for (let i = 0; i < docsArr.length; i += 450) {
          const batch = writeBatch(db);
          docsArr.slice(i, i + 450).forEach(d => {
            batch.update(d.ref, { userId: destinoUid, etapa: primeiraEtapa });
          });
          await batch.commit();
        }
      }

      // 4. Excluir o cadastro do corretor
      await deleteDoc(doc(db, 'usuarios', user.id));
      setCorretores(prev => prev.filter(c => c.id !== user.id));
      setMessage(
        leadsSnap.size > 0
          ? `Corretor excluído. ${leadsSnap.size} lead(s) enviados ao topo do funil da imobiliária.`
          : 'Corretor excluído.'
      );
    } catch (err) {
      console.error('Erro ao excluir corretor:', err);
      setMessage('Erro ao excluir corretor.');
    }
  };

  // Buscar indicadores do mês atual e anterior ao abrir modal
  const carregarIndicadores = async () => {
    setIndicadoresMsg(null);
    const now = new Date();
    const docIdAtual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const docIdAnterior = `${now.getMonth() === 0 ? now.getFullYear()-1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2,'0')}`;
    const refAtual = firestoreDoc(db, 'indicadoresExternos', docIdAtual);
    const refAnterior = firestoreDoc(db, 'indicadoresExternos', docIdAnterior);
    const snapAtual = await getDoc(refAtual);
    const snapAnterior = await getDoc(refAnterior);
    if (snapAtual.exists()) {
      setIndicadores(snapAtual.data() as any);
    } else {
      setIndicadores({ cub: '', selic: '', ipca: '', igpm: '', incc: '', financiamento: '' });
    }
    if (snapAnterior.exists()) {
      setIndicadoresAnterior(snapAnterior.data() as any);
    } else {
      setIndicadoresAnterior({ cub: '', selic: '', ipca: '', igpm: '', incc: '', financiamento: '' });
    }
  };

  const abrirModalIndicadores = async () => {
    await carregarIndicadores();
    setShowIndicadoresModal(true);
  };

  const salvarIndicadores = async () => {
    setSalvandoIndicadores(true);
    setIndicadoresMsg(null);
    try {
      const now = new Date();
      const docIdAtual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const docIdAnterior = `${now.getMonth() === 0 ? now.getFullYear()-1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2,'0')}`;
      await setDoc(firestoreDoc(db, 'indicadoresExternos', docIdAtual), indicadores);
      await setDoc(firestoreDoc(db, 'indicadoresExternos', docIdAnterior), indicadoresAnterior);
      setIndicadoresMsg('Indicadores salvos com sucesso!');
    } catch (err) {
      setIndicadoresMsg('Erro ao salvar indicadores.');
    } finally {
      setSalvandoIndicadores(false);
    }
  };

  // Adicionar ícone SVG para o botão
  const ChartBarIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="9" y="8" width="4" height="12" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
  );

    return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="al-display text-3xl font-bold mb-6 text-white uppercase tracking-wide">Área do Desenvolvedor</h1>
      {message && <div className="mb-4 p-3 rounded-xl bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6]">{message}</div>}
      <div className="al-card relative overflow-hidden p-6 mb-8">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <h2 className="al-display text-[15px] font-bold mb-4 text-white uppercase tracking-[0.14em]">Imobiliárias</h2>
        {loading ? <LoadingState label="Carregando..." className="py-4" /> : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aprovada</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {imobiliarias.map((imob) => (
                <tr
                  key={imob.id}
                  className="border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">{imob.nome}</td>
                  <td className="px-4 py-3 text-text-secondary">{imob.status || '-'}</td>
                  <td className="px-4 py-3 text-text-secondary">{imob.aprovado ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-3">
                    <button className="text-[#FF7A97] hover:text-[#FF9EB5] font-bold hover:underline mr-2 transition-colors" onClick={() => { setSelectedImobiliaria(imob); loadCorretores(imob.id); }}>Ver corretores</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedImobiliaria && (
        <div className="al-card relative overflow-hidden p-6 mb-8">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Corretores de {selectedImobiliaria.nome}</h2>
            <button
              className="ml-auto text-text-secondary text-xs font-medium hover:text-[#FF5C7E] p-1 rounded-full transition-colors"
              onClick={() => { setSelectedImobiliaria(null); setCorretores([]); }}
              title="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {loadingCorretores ? <LoadingState label="Carregando corretores..." className="py-4" /> : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-center">Aprovado</th>
                  <th className="px-4 py-3 text-center">Admin</th>
                  <th className="px-4 py-3 text-center">Desenvolvedor</th>
                  <th className="px-4 py-3 text-center">Excluir</th>
                </tr>
              </thead>
              <tbody>
                {corretores.map((corretor) => (
                  <tr
                    key={corretor.id}
                    className="border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">{corretor.nome}</td>
                    <td className="px-4 py-3 text-text-secondary">{corretor.email}</td>
                    <td className="px-4 py-3 text-text-secondary">{corretor.tipoConta}</td>
                    <td className="px-4 py-3 text-center"><input type="checkbox" className="accent-[#FF1E56]" checked={!!corretor.aprovado} onChange={e => handleAprovarCheckbox(corretor, e.target.checked)} /></td>
                    <td className="px-4 py-3 text-center"><input type="checkbox" className="accent-[#FF1E56]" checked={!!corretor.permissoes?.admin} onChange={e => handlePermissao(corretor, 'admin', e.target.checked)} /></td>
                    <td className="px-4 py-3 text-center"><input type="checkbox" className="accent-[#FF1E56]" checked={!!corretor.permissoes?.developer} onChange={e => handlePermissao(corretor, 'developer', e.target.checked)} /></td>
                    <td className="px-4 py-3 text-center">
                      {corretor.tipoConta !== 'imobiliaria' && (
                        <button
                          onClick={() => handleExcluirCorretor(corretor)}
                          title="Excluir corretor"
                          className="text-red-400 hover:text-red-300 hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)] p-1 rounded transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* Botões de administração */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          className="group relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#9F6BFF]/35 hover:border-[#9F6BFF]/70 bg-[#9F6BFF]/[0.05] hover:bg-[#9F6BFF]/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(159,107,255,0.45)] text-white font-semibold hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
          onClick={abrirModalIndicadores}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#9F6BFF]/25 to-[#9F6BFF]/[0.03] border border-[#9F6BFF]/30 shrink-0 text-[#C4A6FF] drop-shadow-[0_0_8px_rgba(159,107,255,0.6)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200">
            <ChartBarIcon />
          </span>
          Cadastrar Indicadores Externos
        </button>

        <a
          href="/dashboard/developer/admin-imobiliarias"
          className="group relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#34D399]/35 hover:border-[#34D399]/70 bg-[#34D399]/[0.05] hover:bg-[#34D399]/[0.12] hover:shadow-[0_10px_30px_-10px_rgba(52,211,153,0.45)] text-white font-semibold hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#34D399]/25 to-[#34D399]/[0.03] border border-[#34D399]/30 shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200">
            <svg className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          </span>
          Administrar Imobiliárias
        </a>
      </div>
      {showIndicadoresModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12101a] border border-white/10 rounded-2xl p-8 w-full max-w-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <button
              className="absolute top-3 right-3 text-text-secondary hover:text-[#FF5C7E] transition-colors"
              onClick={() => setShowIndicadoresModal(false)}
              title="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="al-display text-[15px] font-bold mb-4 text-white uppercase tracking-[0.14em]">Indicadores Externos</h2>
            <form onSubmit={e => { e.preventDefault(); salvarIndicadores(); }}>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="al-display text-[12px] font-bold uppercase tracking-[0.14em] mb-2 text-[#FFE9A6]">Mês Atual</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1 text-text-secondary">CUB (SC)</label>
                      <input type="text" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={indicadores.cub} onChange={e => setIndicadores({ ...indicadores, cub: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1 text-text-secondary">SELIC</label>
                      <input type="text" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={indicadores.selic} onChange={e => setIndicadores({ ...indicadores, selic: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1 text-text-secondary">IPCA</label>
                      <input type="text" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={indicadores.ipca} onChange={e => setIndicadores({ ...indicadores, ipca: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1 text-text-secondary">IGP-M</label>
                      <input type="text" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={indicadores.igpm} onChange={e => setIndicadores({ ...indicadores, igpm: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1 text-text-secondary">INCC</label>
                      <input type="text" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={indicadores.incc} onChange={e => setIndicadores({ ...indicadores, incc: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="al-display text-[12px] font-bold uppercase tracking-[0.14em] mb-2 text-text-secondary">Mês Anterior</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1 text-text-secondary">CUB (SC)</label>
                      <input type="text" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={indicadoresAnterior.cub} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, cub: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1 text-text-secondary">SELIC</label>
                      <input type="text" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={indicadoresAnterior.selic} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, selic: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1 text-text-secondary">IPCA</label>
                      <input type="text" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={indicadoresAnterior.ipca} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, ipca: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1 text-text-secondary">IGP-M</label>
                      <input type="text" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={indicadoresAnterior.igpm} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, igpm: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1 text-text-secondary">INCC</label>
                      <input type="text" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" value={indicadoresAnterior.incc} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, incc: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
              {indicadoresMsg && <div className="mt-3 text-sm text-emerald-300">{indicadoresMsg}</div>}
              <button
                type="submit"
                className="mt-6 w-full bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold py-2 px-6 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-60"
                disabled={salvandoIndicadores}
              >
                {salvandoIndicadores ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 