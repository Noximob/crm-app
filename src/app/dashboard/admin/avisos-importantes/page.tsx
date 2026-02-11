'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';

interface Aviso {
  id?: string;
  titulo: string;
  mensagem: string;
  data: any;
  dataInicio?: any;
  dataFim?: any;
}

function formatInputDateTime(ts: any) {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return d.toISOString().slice(0, 16);
}

export default function AvisosImportantesPage() {
  const { userData } = useAuth();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvisos();
  }, [userData]);

  const fetchAvisos = async () => {
    if (!userData?.imobiliariaId) return;
    setLoading(true);
    const q = query(collection(db, 'avisosImportantes'), where('imobiliariaId', '==', userData.imobiliariaId));
    const snapshot = await getDocs(q);
    setAvisos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aviso)));
    setLoading(false);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim() || !userData?.imobiliariaId || !dataInicio || !dataFim) return;
    setLoading(true);

    const tsInicio = Timestamp.fromDate(new Date(dataInicio));
    const tsFim = Timestamp.fromDate(new Date(dataFim));

    const avisoData = {
      titulo,
      mensagem,
      data: Timestamp.now(),
      imobiliariaId: userData.imobiliariaId,
      dataInicio: tsInicio,
      dataFim: tsFim
    };

    if (editId) {
      await updateDoc(doc(db, 'avisosImportantes', editId), avisoData);
    } else {
      await addDoc(collection(db, 'avisosImportantes'), avisoData);
    }

    setTitulo('');
    setMensagem('');
    setDataInicio('');
    setDataFim('');
    setEditId(null);
    fetchAvisos();
    setLoading(false);
  };

  const handleEditar = (aviso: Aviso) => {
    setTitulo(aviso.titulo);
    setMensagem(aviso.mensagem);
    setDataInicio(formatInputDateTime(aviso.dataInicio));
    setDataFim(formatInputDateTime(aviso.dataFim));
    setEditId(aviso.id!);
  };

  const handleExcluir = async (id: string) => {
    setLoading(true);
    await deleteDoc(doc(db, 'avisosImportantes', id));
    fetchAvisos();
    setLoading(false);
  };

  const resetForm = () => {
    setTitulo('');
    setMensagem('');
    setDataInicio('');
    setDataFim('');
    setEditId(null);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-[#2E2F38] dark:text-white">Avisos Importantes</h1>
      <form onSubmit={handleSalvar} className="bg-white dark:bg-[#1E1E1E] p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold text-[#2E2F38] dark:text-white mb-4">
          {editId ? 'Editar Aviso' : 'Novo Aviso Importante'}
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-1">Título</label>
          <input 
            type="text" 
            className="w-full rounded border px-3 py-2 dark:bg-[#2E2F38] dark:text-white" 
            value={titulo} 
            onChange={e => setTitulo(e.target.value)} 
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-1">Mensagem</label>
          <textarea 
            className="w-full rounded border px-3 py-2 h-32 dark:bg-[#2E2F38] dark:text-white" 
            value={mensagem} 
            onChange={e => setMensagem(e.target.value)} 
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-1">Data e Hora de Início</label>
            <input 
              type="datetime-local" 
              className="w-full rounded border px-3 py-2 dark:bg-[#2E2F38] dark:text-white" 
              value={dataInicio} 
              onChange={e => setDataInicio(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-1">Data e Hora de Fim</label>
            <input 
              type="datetime-local" 
              className="w-full rounded border px-3 py-2 dark:bg-[#2E2F38] dark:text-white" 
              value={dataFim} 
              onChange={e => setDataFim(e.target.value)} 
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-[#FF6B6B] text-white px-4 py-2 rounded hover:bg-[#FF5252] disabled:opacity-50"
          >
            {loading ? 'Salvando...' : (editId ? 'Atualizar' : 'Salvar')}
          </button>
          {editId && (
            <button 
              type="button" 
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>
      <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6">
        <h2 className="text-lg font-bold mb-4 text-[#2E2F38] dark:text-white">Avisos Cadastrados</h2>
        {loading ? <p>Carregando...</p> : avisos.length === 0 ? <p className="text-gray-400">Nenhum aviso cadastrado.</p> : (
          <ul className="space-y-4">
            {avisos.map(aviso => (
              <li key={aviso.id} className="border-b border-[#E8E9F1] dark:border-[#23283A] pb-3 flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-[#F59E0B] dark:text-[#FCD34D]">{aviso.titulo}</div>
                  <div className="text-[#2E2F38] dark:text-white text-sm mb-1">{aviso.mensagem}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div className="mb-1">
                      <strong>Início:</strong> {aviso.dataInicio?.toDate ? aviso.dataInicio.toDate().toLocaleString('pt-BR') : ''}
                    </div>
                    <div className="mb-1">
                      <strong>Fim:</strong> {aviso.dataFim?.toDate ? aviso.dataFim.toDate().toLocaleString('pt-BR') : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      Criado em: {aviso.data?.toDate ? aviso.data.toDate().toLocaleString('pt-BR') : ''}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button className="text-[#F59E0B] hover:underline text-sm" onClick={() => handleEditar(aviso)}>Editar</button>
                  <button className="text-[#F45B69] hover:underline text-sm" onClick={() => aviso.id && handleExcluir(aviso.id)}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 