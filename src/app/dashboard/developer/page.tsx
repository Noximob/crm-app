'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where, Timestamp, setDoc, doc as firestoreDoc, getDoc } from 'firebase/firestore';

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

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-[#2E2F38]">Área do Desenvolvedor</h1>
      {message && <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800">{message}</div>}
      <div className="bg-white rounded-2xl shadow-soft border border-[#E8E9F1] dark:bg-[#23283A] p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Imobiliárias</h2>
        {loading ? <p>Carregando...</p> : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F5F6FA] dark:bg-[#181C23] text-[#2E2F38] dark:text-white font-semibold">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aprovada</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {imobiliarias.map((imob, idx) => (
                <tr
                  key={imob.id}
                  className={`border-t transition-colors ${
                    idx % 2 === 0
                      ? 'bg-white dark:bg-[#23283A]' // zebra stripe
                      : 'bg-[#F5F6FA] dark:bg-[#1e1e24]'
                  } hover:bg-[#F0F4FF] dark:hover:bg-[#262631]`}
                >
                  <td className="px-4 py-3 font-medium text-[#2E2F38] dark:text-white">{imob.nome}</td>
                  <td className="px-4 py-3 text-[#6B6F76] dark:text-gray-300">{imob.status || '-'}</td>
                  <td className="px-4 py-3 text-[#6B6F76] dark:text-gray-300">{imob.aprovado ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 dark:text-blue-400 hover:underline mr-2" onClick={() => { setSelectedImobiliaria(imob); loadCorretores(imob.id); }}>Ver corretores</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedImobiliaria && (
        <div className="bg-white rounded-2xl shadow-soft border border-[#E8E9F1] dark:bg-[#23283A] p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Corretores de {selectedImobiliaria.nome}</h2>
            <button
              className="ml-auto text-[#6B6F76] dark:text-gray-400 text-xs font-medium hover:text-[#3478F6] dark:hover:text-[#A3C8F7] p-1 rounded-full transition-colors"
              onClick={() => { setSelectedImobiliaria(null); setCorretores([]); }}
              title="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {loadingCorretores ? <p>Carregando corretores...</p> : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F5F6FA] dark:bg-[#181C23] text-[#2E2F38] dark:text-white font-semibold">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-center">Aprovado</th>
                  <th className="px-4 py-3 text-center">Admin</th>
                  <th className="px-4 py-3 text-center">Desenvolvedor</th>
                </tr>
              </thead>
              <tbody>
                {corretores.map((corretor, idx) => (
                  <tr
                    key={corretor.id}
                    className={`border-t transition-colors ${
                      idx % 2 === 0
                        ? 'bg-white dark:bg-[#23283A]'
                        : 'bg-[#F5F6FA] dark:bg-[#1e1e24]'
                    } hover:bg-[#F0F4FF] dark:hover:bg-[#262631]`}
                  >
                    <td className="px-4 py-3 font-medium text-[#2E2F38] dark:text-white">{corretor.nome}</td>
                    <td className="px-4 py-3 text-[#6B6F76] dark:text-gray-300">{corretor.email}</td>
                    <td className="px-4 py-3 text-[#6B6F76] dark:text-gray-300">{corretor.tipoConta}</td>
                    <td className="px-4 py-3 text-center"><input type="checkbox" checked={!!corretor.aprovado} onChange={e => handleAprovarCheckbox(corretor, e.target.checked)} /></td>
                    <td className="px-4 py-3 text-center"><input type="checkbox" checked={!!corretor.permissoes?.admin} onChange={e => handlePermissao(corretor, 'admin', e.target.checked)} /></td>
                    <td className="px-4 py-3 text-center"><input type="checkbox" checked={!!corretor.permissoes?.developer} onChange={e => handlePermissao(corretor, 'developer', e.target.checked)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* Botão e modal de indicadores externos SEMPRE visíveis */}
      <div className="flex justify-end mt-8">
        <button
          className="bg-[#3478F6] hover:bg-[#245bb5] text-white font-semibold py-2 px-6 rounded-lg shadow transition-colors"
          onClick={abrirModalIndicadores}
        >
          Cadastrar Indicadores Externos
        </button>
      </div>
      {showIndicadoresModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-[#23283A] rounded-xl p-8 w-full max-w-2xl shadow-lg relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white"
              onClick={() => setShowIndicadoresModal(false)}
              title="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-xl font-bold mb-4">Indicadores Externos</h2>
            <form onSubmit={e => { e.preventDefault(); salvarIndicadores(); }}>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-2">Mês Atual</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">CUB (SC)</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadores.cub} onChange={e => setIndicadores({ ...indicadores, cub: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">SELIC</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadores.selic} onChange={e => setIndicadores({ ...indicadores, selic: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">IPCA</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadores.ipca} onChange={e => setIndicadores({ ...indicadores, ipca: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">IGP-M</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadores.igpm} onChange={e => setIndicadores({ ...indicadores, igpm: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">INCC</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadores.incc} onChange={e => setIndicadores({ ...indicadores, incc: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Taxa média de financiamento imobiliário</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadores.financiamento} onChange={e => setIndicadores({ ...indicadores, financiamento: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Mês Anterior</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">CUB (SC)</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadoresAnterior.cub} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, cub: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">SELIC</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadoresAnterior.selic} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, selic: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">IPCA</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadoresAnterior.ipca} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, ipca: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">IGP-M</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadoresAnterior.igpm} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, igpm: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">INCC</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadoresAnterior.incc} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, incc: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Taxa média de financiamento imobiliário</label>
                      <input type="text" className="w-full rounded border px-3 py-2" value={indicadoresAnterior.financiamento} onChange={e => setIndicadoresAnterior({ ...indicadoresAnterior, financiamento: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
              {indicadoresMsg && <div className="mt-3 text-sm text-green-600 dark:text-green-400">{indicadoresMsg}</div>}
              <button
                type="submit"
                className="mt-6 w-full bg-[#3478F6] hover:bg-[#245bb5] text-white font-semibold py-2 px-6 rounded-lg shadow transition-colors disabled:opacity-60"
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