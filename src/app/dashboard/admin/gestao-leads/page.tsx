'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { useRouter } from 'next/navigation';

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
  const { stages } = usePipelineStages();
  const router = useRouter();
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [corretorOrigem, setCorretorOrigem] = useState<string>('');
  const [corretorDestino, setCorretorDestino] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsSelecionados, setLeadsSelecionados] = useState<string[]>([]);
  const [filtroEtapa, setFiltroEtapa] = useState<string>('');
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingCorretores, setLoadingCorretores] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  // Buscar corretores vinculados à imobiliária logada e aprovados
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    setLoadingCorretores(true);
    const fetchCorretores = async () => {
      const q = query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', userData.imobiliariaId),
        where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria']),
        where('aprovado', '==', true)
      );
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome, tipoConta: doc.data().tipoConta }));
      setCorretores(lista);
      setLoadingCorretores(false);
    };
    fetchCorretores();
  }, [userData]);

  // Buscar leads do corretor selecionado e etapas únicas
  const [etapasUnicas, setEtapasUnicas] = useState<string[]>([]);
  useEffect(() => {
    if (!corretorOrigem) {
      setLeads([]);
      setEtapasUnicas([]);
      return;
    }
    setLoadingLeads(true);
    const fetchLeads = async () => {
      let qLeads = query(collection(db, 'leads'), where('userId', '==', corretorOrigem));
      const snapshot = await getDocs(qLeads);
      let lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      // Etapas únicas
      const etapas = Array.from(new Set(lista.map(lead => lead.etapa).filter(Boolean)));
      setEtapasUnicas(etapas);
      // Filtro
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
          await updateDoc(leadRef, { userId: corretorDestino, etapa: stages[0] ?? '' });
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

  const handleVerDetalhes = (leadId: string) => {
    router.push(`/dashboard/crm/${leadId}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Gestão de Leads dos Corretores</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Transfira, filtre e organize os leads entre os corretores da sua imobiliária.</p>
        {mensagem && <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800">{mensagem}</div>}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <label className="font-medium text-[#6B6F76] dark:text-gray-300 block mb-1">Corretor de origem:</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                value={corretorOrigem}
                onChange={e => { setCorretorOrigem(e.target.value); setLeadsSelecionados([]); }}
                disabled={loadingCorretores}
              >
                <option value="">Selecione um corretor</option>
                {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="flex-1 flex items-end gap-2 justify-end">
              <div className="w-full">
                <label className="font-medium text-[#6B6F76] dark:text-gray-300 block mb-1">Corretor de destino:</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  value={corretorDestino}
                  onChange={e => setCorretorDestino(e.target.value)}
                  disabled={loadingCorretores || !corretorOrigem}
                >
                  <option value="">Selecione corretor de destino</option>
                  {corretores.filter(c => c.id !== corretorOrigem).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <button
                className="h-11 px-6 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 mt-6"
                onClick={handleTransferir}
                disabled={!corretorDestino || leadsSelecionados.length === 0}
              >
                Transferir
              </button>
            </div>
          </div>
          <div className="flex-1 mt-2 max-w-xs">
            <label className="font-medium text-[#6B6F76] dark:text-gray-300 block mb-1">Filtrar por etapa:</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
              value={filtroEtapa}
              onChange={e => setFiltroEtapa(e.target.value)}
              disabled={loadingLeads}
            >
              <option value="">Todas</option>
              {etapasUnicas.map(stage => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-6">
          {loadingLeads ? (
            <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">Carregando leads...</div>
          ) : corretorOrigem && leads.length === 0 ? (
            <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">Nenhum lead encontrado para este corretor.</div>
          ) : (
            <ul className="space-y-2">
              {leads.length > 0 && (
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={leadsSelecionados.length === leads.length}
                    onChange={e => setLeadsSelecionados(e.target.checked ? leads.map(l => l.id) : [])}
                    className="mr-2 accent-[#D4A017]"
                  />
                  <span className="text-sm text-[#2E2F38] dark:text-white cursor-pointer select-none" onClick={() => setLeadsSelecionados(leadsSelecionados.length === leads.length ? [] : leads.map(l => l.id))}>
                    Selecionar Tudo
                  </span>
                </div>
              )}
              {leads.map(lead => (
                <li key={lead.id} className="flex items-center gap-4 bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl p-3 border border-[#E8E9F1] dark:border-[#23283A]">
                  <input
                    type="checkbox"
                    checked={leadsSelecionados.includes(lead.id)}
                    onChange={() => handleSelectLead(lead.id)}
                    className="accent-[#D4A017] h-5 w-5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#2E2F38] dark:text-white truncate">{lead.nome}</div>
                    <div className="text-sm text-[#6B6F76] dark:text-gray-300">{formatPhone(lead.telefone)}</div>
                  </div>
                  <span className="inline-block px-2 py-1 rounded bg-[#E8E9F1] dark:bg-[#181C23] text-[#D4A017] dark:text-primary-200 font-semibold text-xs truncate max-w-[120px]">{lead.etapa}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      className="text-[#D4A017] hover:text-[#B8860B] text-xs px-2 py-1 rounded hover:bg-[#D4A017]/10 transition-colors" 
                      onClick={() => handleVerDetalhes(lead.id)}
                      title="Ver detalhes do lead"
                    >
                      Detalhes
                    </button>
                    <button 
                      className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors" 
                      onClick={() => handleApagar(lead.id)}
                      title="Apagar lead"
                    >
                      Apagar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// Função utilitária para formatar telefone (adicione no topo ou em um utils)
function formatPhone(phone: string) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
} 