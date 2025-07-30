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
  dataHora: any;
  dataInicio?: any;
  dataFim?: any;
  horario?: string;
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
  const [dataHora, setDataHora] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [horario, setHorario] = useState('');
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
    if (!titulo.trim() || !mensagem.trim() || !userData?.imobiliariaId || !dataHora) return;
    setLoading(true);
    
    const ts = Timestamp.fromDate(new Date(dataHora));
    const tsInicio = dataInicio ? Timestamp.fromDate(new Date(dataInicio)) : null;
    const tsFim = dataFim ? Timestamp.fromDate(new Date(dataFim)) : null;
    
    const avisoData = {
      titulo,
      mensagem,
      data: Timestamp.now(),
      dataHora: ts,
      imobiliariaId: userData.imobiliariaId,
      ...(tsInicio && { dataInicio: tsInicio }),
      ...(tsFim && { dataFim: tsFim }),
      ...(horario && { horario })
    };

    if (editId) {
      await updateDoc(doc(db, 'avisosImportantes', editId), avisoData);
    } else {
      await addDoc(collection(db, 'avisosImportantes'), avisoData);
    }
    
    setTitulo('');
    setMensagem('');
    setDataHora('');
    setDataInicio('');
    setDataFim('');
    setHorario('');
    setEditId(null);
    fetchAvisos();
    setLoading(false);
  };

  const handleEditar = (aviso: Aviso) => {
    setTitulo(aviso.titulo);
    setMensagem(aviso.mensagem);
    setDataHora(formatInputDateTime(aviso.dataHora));
    setDataInicio(formatInputDateTime(aviso.dataInicio));
    setDataFim(formatInputDateTime(aviso.dataFim));
    setHorario(aviso.horario || '');
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
    setDataHora('');
    setDataInicio('');
    setDataFim('');
    setHorario('');
    setEditId(null);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-[#2E2F38] dark:text-white">Avisos Importantes</h1>
      <form onSubmit={handleSalvar} className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mb-8">
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-1">Título</label>
          <input type="text" className="w-full rounded border px-3 py-2" value={titulo} onChange={e => setTitulo(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-1">Mensagem</label>
          <textarea className="w-full rounded border px-3 py-2" rows={3} value={mensagem} onChange={e => setMensagem(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-1">Data e Hora para Exibir</label>
          <input type="datetime-local" className="w-full rounded border px-3 py-2" value={dataHora} onChange={e => setDataHora(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-1">Data de Início</label>
            <input type="datetime-local" className="w-full rounded border px-3 py-2" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-1">Data de Fim</label>
            <input type="datetime-local" className="w-full rounded border px-3 py-2" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-1">Horário (opcional)</label>
          <input type="time" className="w-full rounded border px-3 py-2" value={horario} onChange={e => setHorario(e.target.value)} />
        </div>
        <button type="submit" className="bg-[#3478F6] hover:bg-[#245bb5] text-white font-semibold py-2 px-6 rounded-lg shadow transition-colors" disabled={loading}>
          {editId ? 'Salvar Alterações' : 'Lançar Aviso'}
        </button>
        {editId && (
          <button type="button" className="ml-4 text-sm text-[#F45B69] underline" onClick={resetForm}>Cancelar edição</button>
        )}
      </form>
      <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6">
        <h2 className="text-lg font-bold mb-4 text-[#2E2F38] dark:text-white">Avisos Cadastrados</h2>
        {loading ? <p>Carregando...</p> : avisos.length === 0 ? <p className="text-gray-400">Nenhum aviso cadastrado.</p> : (
          <ul className="space-y-4">
            {avisos.map(aviso => (
              <li key={aviso.id} className="border-b border-[#E8E9F1] dark:border-[#23283A] pb-3 flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-[#3478F6] dark:text-[#A3C8F7]">{aviso.titulo}</div>
                  <div className="text-[#2E2F38] dark:text-white text-sm mb-1">{aviso.mensagem}</div>
                  <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1">
                    <div>Exibir em: {aviso.dataHora?.toDate ? aviso.dataHora.toDate().toLocaleString('pt-BR') : ''}</div>
                    {aviso.dataInicio && (
                      <div>Início: {aviso.dataInicio.toDate ? aviso.dataInicio.toDate().toLocaleString('pt-BR') : ''}</div>
                    )}
                    {aviso.dataFim && (
                      <div>Fim: {aviso.dataFim.toDate ? aviso.dataFim.toDate().toLocaleString('pt-BR') : ''}</div>
                    )}
                    {aviso.horario && (
                      <div>Horário: {aviso.horario}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button className="text-[#3478F6] hover:underline text-sm" onClick={() => handleEditar(aviso)}>Editar</button>
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