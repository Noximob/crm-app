import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export default function AdminMetasPage() {
  const { userData } = useAuth();
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [vgv, setVgv] = useState('');
  const [realizado, setRealizado] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Buscar meta atual
  useEffect(() => {
    async function fetchMeta() {
      if (!userData?.imobiliariaId) return;
      setLoading(true);
      const metasRef = collection(db, 'metas');
      const q = query(metasRef, where('imobiliariaId', '==', userData.imobiliariaId), orderBy('createdAt', 'desc'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const meta = snap.docs[0].data();
        setInicio(meta.inicio ? meta.inicio.split('T')[0] : '');
        setFim(meta.fim ? meta.fim.split('T')[0] : '');
        setVgv(meta.valor ? meta.valor.toString() : '');
        setRealizado(meta.alcancado ? meta.alcancado.toString() : '');
      }
      setLoading(false);
    }
    fetchMeta();
  }, [userData]);

  const percentual = vgv && realizado ? Math.round((parseFloat(realizado) / parseFloat(vgv)) * 100) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userData?.imobiliariaId) return;
    setLoading(true);
    const metasRef = collection(db, 'metas');
    const novaMeta = {
      imobiliariaId: userData.imobiliariaId,
      inicio,
      fim,
      valor: parseFloat(vgv),
      alcancado: parseFloat(realizado),
      percentual,
      createdAt: Timestamp.now(),
    };
    const docRef = doc(metasRef);
    await setDoc(docRef, novaMeta);
    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <div className="max-w-xl mx-auto mt-10 bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-8 shadow-xl">
      <h1 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-6 flex items-center gap-2">
        <svg className="h-7 w-7 text-[#3478F6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        Gerenciar Meta da Imobiliária
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Início</label>
            <input type="date" className="w-full rounded-lg border px-3 py-2" value={inicio} onChange={e => setInicio(e.target.value)} required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Fim</label>
            <input type="date" className="w-full rounded-lg border px-3 py-2" value={fim} onChange={e => setFim(e.target.value)} required />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">VGV Estimado (R$)</label>
            <input type="number" className="w-full rounded-lg border px-3 py-2" value={vgv} onChange={e => setVgv(e.target.value)} required min="0" step="0.01" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">VGV Realizado (R$)</label>
            <input type="number" className="w-full rounded-lg border px-3 py-2" value={realizado} onChange={e => setRealizado(e.target.value)} required min="0" step="0.01" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">% Alcançado</label>
          <input type="text" className="w-full rounded-lg border px-3 py-2 bg-gray-100" value={percentual + '%'} readOnly />
        </div>
        <button type="submit" className="mt-4 bg-[#3478F6] hover:bg-[#255FD1] text-white font-bold py-2 px-6 rounded-lg transition-all disabled:opacity-60" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Meta'}
        </button>
        {success && <div className="text-green-600 font-semibold mt-2">Meta salva com sucesso!</div>}
      </form>
    </div>
  );
} 