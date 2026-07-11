'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch, type DocumentReference } from 'firebase/firestore';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { useRouter } from 'next/navigation';
import { getDemoLeads, DEMO_REPORT_CORRETORES } from '@/lib/espelho/demoData';
import LoadingState from '@/components/ui/LoadingState';

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

// Apaga o lead junto com suas subcoleções (tarefas e interactions). Como a função trata UM lead
// por vez, os refs formam um único grupo (subdocs + doc do lead) — só é dividido em mais de um
// lote se o próprio grupo passar de 400 operações (caso raro, limite do Firestore é 500 por batch)
async function deleteLeadComSubcolecoes(leadId: string) {
  const refs: DocumentReference[] = [];
  for (const sub of ['tarefas', 'interactions']) {
    const snap = await getDocs(collection(db, 'leads', leadId, sub));
    snap.forEach(d => refs.push(d.ref));
  }
  refs.push(doc(db, 'leads', leadId));
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach(r => batch.delete(r));
    await batch.commit();
  }
}

export default function GestaoLeadsPage() {
  const { userData, isEspelhoDemo } = useAuth();
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
    if (!userData?.imobiliariaId && !isEspelhoDemo) return;
    if (isEspelhoDemo) {
      setCorretores(DEMO_REPORT_CORRETORES.map(c => ({ id: c.uid, nome: c.nome })));
      setLoadingCorretores(false);
      return;
    }
    setLoadingCorretores(true);
    const fetchCorretores = async () => {
      const q = query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', userData!.imobiliariaId),
        where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria']),
        where('aprovado', '==', true)
      );
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome, tipoConta: doc.data().tipoConta }));
      setCorretores(lista);
      setLoadingCorretores(false);
    };
    fetchCorretores();
  }, [userData, isEspelhoDemo]);

  // Buscar leads do corretor selecionado (filtro por etapa usa stages do funil configurado)
  useEffect(() => {
    if (!corretorOrigem) {
      setLeads([]);
      return;
    }
    if (isEspelhoDemo) {
      const demoLeads = getDemoLeads();
      let lista = demoLeads.filter(l => l.userId === corretorOrigem).map(l => ({ id: l.id, nome: l.nome, telefone: l.telefone, etapa: l.etapa, email: undefined as string | undefined }));
      if (filtroEtapa) lista = lista.filter(lead => lead.etapa === filtroEtapa);
      setLeads(lista);
      setLoadingLeads(false);
      return;
    }
    setLoadingLeads(true);
    const fetchLeads = async () => {
      const qLeads = query(collection(db, 'leads'), where('userId', '==', corretorOrigem));
      const snapshot = await getDocs(qLeads);
      let lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      if (filtroEtapa) {
        lista = lista.filter(lead => lead.etapa === filtroEtapa);
      }
      setLeads(lista);
      setLoadingLeads(false);
    };
    fetchLeads();
  }, [corretorOrigem, filtroEtapa, isEspelhoDemo]);

  const handleSelectLead = (leadId: string) => {
    setLeadsSelecionados(prev => prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]);
  };

  const handleTransferir = async () => {
    if (!corretorDestino || leadsSelecionados.length === 0) return;
    setMensagem(null);
    if (isEspelhoDemo) {
      setMensagem('Modo demonstração: transferência simulada com sucesso!');
      setLeadsSelecionados([]);
      setLeads(leads.filter(lead => !leadsSelecionados.includes(lead.id)));
      return;
    }
    try {
      await Promise.all(
        leadsSelecionados.map(async (leadId) => {
          const leadRef = doc(db, 'leads', leadId);
          await updateDoc(leadRef, { userId: corretorDestino, etapa: stages[0] ?? '' });
        })
      );
      setMensagem('Leads transferidos com sucesso!');
      setLeadsSelecionados([]);
      setLeads(leads.filter(lead => !leadsSelecionados.includes(lead.id)));
    } catch (err) {
      setMensagem('Erro ao transferir leads.');
    }
  };

  const handleApagar = async (leadId: string) => {
    setMensagem(null);
    if (isEspelhoDemo) {
      setLeads(leads.filter(lead => lead.id !== leadId));
      setLeadsSelecionados(leadsSelecionados.filter(id => id !== leadId));
      setMensagem('Modo demonstração: lead removido da lista (simulado).');
      return;
    }
    try {
      await deleteLeadComSubcolecoes(leadId);
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
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2 mb-2 text-left">Gestão de Leads dos Corretores</h1>
        <p className="text-text-secondary mb-8 text-left text-[13px]">Transfira, filtre e organize os leads entre os corretores da sua imobiliária.</p>
        {mensagem && <div className="mb-4 p-3 rounded-xl bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6] text-sm font-bold">{mensagem}</div>}
        <div className="al-card relative overflow-hidden p-4 mb-6 flex flex-col gap-4">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Corretor de origem:</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
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
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Corretor de destino:</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  value={corretorDestino}
                  onChange={e => setCorretorDestino(e.target.value)}
                  disabled={loadingCorretores || !corretorOrigem}
                >
                  <option value="">Selecione corretor de destino</option>
                  {corretores.filter(c => c.id !== corretorOrigem).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <button
                className="h-11 px-6 py-2 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white rounded-xl font-bold shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50 mt-6"
                onClick={handleTransferir}
                disabled={!corretorDestino || leadsSelecionados.length === 0}
              >
                Transferir
              </button>
            </div>
          </div>
          <div className="flex-1 mt-2 max-w-xs">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Filtrar por etapa:</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
              value={stages.includes(filtroEtapa) ? filtroEtapa : ''}
              onChange={e => setFiltroEtapa(e.target.value || '')}
              disabled={loadingLeads}
            >
              <option value="">Todas</option>
              {stages.map(stage => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-6">
          {loadingLeads ? (
            <LoadingState label="Carregando leads..." className="py-8" />
          ) : corretorOrigem && leads.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">Nenhum lead encontrado para este corretor.</div>
          ) : (
            <ul className="space-y-2">
              {leads.length > 0 && (
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={leadsSelecionados.length === leads.length}
                    onChange={e => setLeadsSelecionados(e.target.checked ? leads.map(l => l.id) : [])}
                    className="mr-2 accent-[#FF1E56]"
                  />
                  <span className="text-sm text-white cursor-pointer select-none" onClick={() => setLeadsSelecionados(leadsSelecionados.length === leads.length ? [] : leads.map(l => l.id))}>
                    Selecionar Tudo
                  </span>
                </div>
              )}
              {leads.map(lead => (
                <li key={lead.id} className="flex items-center gap-4 bg-white/[0.03] rounded-xl p-3 border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={leadsSelecionados.includes(lead.id)}
                    onChange={() => handleSelectLead(lead.id)}
                    className="accent-[#FF1E56] h-5 w-5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{lead.nome}</div>
                    <div className="text-sm text-text-secondary">{formatPhone(lead.telefone)}</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6] font-extrabold uppercase tracking-wider text-[10px] truncate max-w-[120px]">{lead.etapa}</span>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-[#FF7A97] hover:text-[#FF9EB5] text-xs px-2 py-1 rounded hover:bg-[#FF1E56]/10 transition-colors"
                      onClick={() => handleVerDetalhes(lead.id)}
                      title="Ver detalhes do lead"
                    >
                      Detalhes
                    </button>
                    <button
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
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