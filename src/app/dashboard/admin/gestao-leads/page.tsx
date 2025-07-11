'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';

interface Corretor {
  id: string;
  nome: string;
}

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  etapa: string;
  email?: string;
}

export default function GestaoLeadsPage() {
  const { userData } = useAuth();
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [corretorOrigem, setCorretorOrigem] = useState<string>('');
  const [corretorDestino, setCorretorDestino] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsSelecionados, setLeadsSelecionados] = useState<string[]>([]);
  const [filtroEtapa, setFiltroEtapa] = useState<string>('');
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingCorretores, setLoadingCorretores] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  // Buscar corretores vinculados à imobiliária logada
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    setLoadingCorretores(true);
    const fetchCorretores = async () => {
      const q = query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', userData.imobiliariaId),
        where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo'])
      );
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome }));
      setCorretores(lista);
      setLoadingCorretores(false);
    };
    fetchCorretores();
  }, [userData]);

  // Buscar leads do corretor selecionado
  useEffect(() => {
    if (!corretorOrigem) {
      setLeads([]);
      return;
    }
    setLoadingLeads(true);
    const fetchLeads = async () => {
      let qLeads = query(collection(db, 'leads'), where('userId', '==', corretorOrigem));
      const snapshot = await getDocs(qLeads);
      let lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      if (filtroEtapa) {
        lista = lista.filter(lead => lead.etapa === filtroEtapa);
      }
      setLeads(lista);
      setLoadingLeads(false);
    };
    fetchLeads();
  }, [corretorOrigem, filtroEtapa]);

  const handleSelectLead = (leadId: string) => {
    setLeadsSelecionados(prev => prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]);
  };

  const handleTransferir = async () => {
    if (!corretorDestino || leadsSelecionados.length === 0) return;
    setMensagem(null);
    try {
      await Promise.all(
        leadsSelecionados.map(async (leadId) => {
          const leadRef = doc(db, 'leads', leadId);
          await updateDoc(leadRef, { userId: corretorDestino, etapa: 'Pré-qualificação' });
        })
      );
      setMensagem('Leads transferidos com sucesso!');
      setLeadsSelecionados([]);
      // Atualiza lista de leads
      setLeads(leads.filter(lead => !leadsSelecionados.includes(lead.id)));
    } catch (err) {
      setMensagem('Erro ao transferir leads.');
    }
  };

  const handleApagar = async (leadId: string) => {
    setMensagem(null);
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      setLeads(leads.filter(lead => lead.id !== leadId));
      setLeadsSelecionados(leadsSelecionados.filter(id => id !== leadId));
      setMensagem('Lead apagado com sucesso!');
    } catch (err) {
      setMensagem('Erro ao apagar lead.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Gestão de Leads dos Corretores</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Transfira, filtre e organize os leads entre os corretores da sua imobiliária.</p>
        {mensagem && <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800">{mensagem}</div>}
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
          <label className="font-medium text-[#6B6F76] dark:text-gray-300">Corretor de origem:</label>
          <select
            className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
            value={corretorOrigem}
            onChange={e => { setCorretorOrigem(e.target.value); setLeadsSelecionados([]); }}
            disabled={loadingCorretores}
          >
            <option value="">Selecione um corretor</option>
            {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <label className="font-medium text-[#6B6F76] dark:text-gray-300">Filtrar por etapa:</label>
          <select
            className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
            value={filtroEtapa}
            onChange={e => setFiltroEtapa(e.target.value)}
            disabled={loadingLeads}
          >
            <option value="">Todas</option>
            {PIPELINE_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </div>
        <div className="mb-6">
          {loadingLeads ? (
            <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">Carregando leads...</div>
          ) : corretorOrigem && leads.length === 0 ? (
            <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">Nenhum lead encontrado para este corretor.</div>
          ) : (
            <ul className="space-y-2">
              {leads.map(lead => (
                <li key={lead.id} className="flex items-center gap-2 bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl p-3 border border-[#E8E9F1] dark:border-[#23283A]">
                  <input
                    type="checkbox"
                    checked={leadsSelecionados.includes(lead.id)}
                    onChange={() => handleSelectLead(lead.id)}
                  />
                  <span className="flex-1 text-[#2E2F38] dark:text-white">{lead.nome} ({lead.etapa})</span>
                  <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => handleApagar(lead.id)}>Apagar</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-6 flex gap-4 justify-end">
          <select
            className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
            value={corretorDestino}
            onChange={e => setCorretorDestino(e.target.value)}
            disabled={loadingCorretores || !corretorOrigem}
          >
            <option value="">Selecione corretor de destino</option>
            {corretores.filter(c => c.id !== corretorOrigem).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button
            className="px-6 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            onClick={handleTransferir}
            disabled={!corretorDestino || leadsSelecionados.length === 0}
          >
            Transferir
          </button>
        </div>
      </div>
    </div>
  );
} 