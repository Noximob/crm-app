"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export default function AdminMetasPage() {
  const { userData, currentUser } = useAuth();
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [vgv, setVgv] = useState('');
  const [realizado, setRealizado] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [ultimaAtualizacaoPor, setUltimaAtualizacaoPor] = useState<string | null>(null);

  // Buscar meta única da imobiliária
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
        setVgv(meta.valor ? meta.valor.toString() : '');
        setRealizado(meta.alcancado ? meta.alcancado.toString() : '');
        setUltimaAtualizacaoPor(meta.updatedByNome ?? null);
      }
    } catch (error) {
      console.error('Erro ao buscar meta:', error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, [userData]);

  // Calcular percentual automático baseado nos valores
  const percentualCalculado = vgv && realizado ? Math.round((parseFloat(realizado) / parseFloat(vgv)) * 100) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userData?.imobiliariaId) return;
    
    setLoading(true);
    try {
      const metaRef = doc(db, 'metas', userData.imobiliariaId);
      
      const novaMeta = {
        imobiliariaId: userData.imobiliariaId,
        inicio,
        fim,
        valor: parseFloat(vgv),
        alcancado: parseFloat(realizado),
        percentual: percentualCalculado,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser?.uid ?? null,
        updatedByNome: userData?.nome ?? null,
      };
      
      console.log('Salvando meta:', novaMeta);
      await setDoc(metaRef, novaMeta, { merge: true });
      // Histórico: cada alteração fica registrada por corretor para dashboards
      const historicoRef = collection(db, 'metas', userData.imobiliariaId, 'historico');
      await addDoc(historicoRef, {
        updatedBy: currentUser?.uid ?? null,
        updatedByNome: userData?.nome ?? null,
        valor: parseFloat(vgv),
        alcancado: parseFloat(realizado),
        percentual: percentualCalculado,
        inicio,
        fim,
        createdAt: Timestamp.now(),
      });
      console.log('Meta salva com sucesso!');
      
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
        <div className="flex gap-4">
          <div className="flex-1">
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
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-white">VGV Realizado (R$)</label>
            <input 
              type="number" 
              className="w-full rounded-lg border px-3 py-2 text-white bg-[#23283A]/50 border-[#3478F6]/30" 
              value={realizado} 
              onChange={e => setRealizado(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              required 
            />
          </div>
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