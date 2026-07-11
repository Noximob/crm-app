'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { usePipelineStages } from '@/context/PipelineStagesContext';

interface Corretor {
  id: string;
  nome: string;
}

interface LeadPreview {
  nome: string;
  telefone: string;
}

export default function ImportarLeadsPage() {
  const { userData } = useAuth();
  const { stages } = usePipelineStages();
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [corretorDestino, setCorretorDestino] = useState('');
  const [input, setInput] = useState('');
  const [leadsPreview, setLeadsPreview] = useState<LeadPreview[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Buscar corretores aprovados
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    const fetchCorretores = async () => {
      const q = query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', userData.imobiliariaId),
        where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria']),
        where('aprovado', '==', true)
      );
      const snapshot = await getDocs(q);
      setCorretores(snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome })));
    };
    fetchCorretores();
  }, [userData]);

  // Parsing inteligente do input
  useEffect(() => {
    if (!input) {
      setLeadsPreview([]);
      return;
    }
    // Aceita tabulação, vírgula ou ponto e vírgula como separador
    const lines = input.split(/\r?\n/).filter(Boolean);

    const looksLikePhone = (value: string | undefined | null) => {
      if (!value) return false;
      const digits = value.replace(/\D/g, '');
      return digits.length >= 8; // heurística simples para telefone
    };

    const leads: LeadPreview[] = lines
      .map(line => {
        const [rawA = '', rawB = ''] = line.split(/\t|,|;/);
        let nome = rawA;
        let telefone = rawB;

        // Caso só tenha 1 coluna, assume que é telefone
        if (!telefone) {
          telefone = nome;
          nome = '';
        } else {
          const aIsPhone = looksLikePhone(rawA);
          const bIsPhone = looksLikePhone(rawB);

          // Se a primeira coluna parece telefone e a segunda parece nome, inverte
          if (aIsPhone && !bIsPhone) {
            telefone = rawA;
            nome = rawB;
          }
          // Se a segunda coluna parece telefone e a primeira parece nome, mantém (nome, telefone)
          // Caso ambas pareçam telefone ou nenhuma pareça, deixa como veio.
        }

        return {
          nome: nome?.trim() || '',
          telefone: telefone?.trim() || '',
        };
      })
      .filter(l => l.telefone);
    setLeadsPreview(leads);
  }, [input]);

  const handleImportar = async () => {
    if (!corretorDestino || leadsPreview.length === 0) return;
    setLoading(true);
    setMensagem(null);
    try {
      await Promise.all(leadsPreview.map(async (lead) => {
        await addDoc(collection(db, 'leads'), {
          userId: corretorDestino,
          imobiliariaId: userData?.imobiliariaId || '', // Adiciona o ID da imobiliária
          nome: lead.nome || 'Lead importado',
          telefone: lead.telefone,
          whatsapp: lead.telefone.replace(/\D/g, ''),
          etapa: stages[0] ?? '',
          origem: 'Importação em massa',
          createdAt: serverTimestamp(),
        });
      }));
      setMensagem('Leads importados com sucesso!');
      setInput('');
      setLeadsPreview([]);
    } catch (err) {
      setMensagem('Erro ao importar leads.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto al-card relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <h1 className="al-display text-[20px] font-bold text-white uppercase tracking-[0.1em] mb-2 text-left">Importar Leads em Massa</h1>
        <p className="text-text-secondary mb-8 text-left text-sm">Cole abaixo nomes e telefones (copie direto do Excel ou Google Sheets). Cada linha deve conter Nome e Telefone, separados por tabulação, vírgula ou ponto e vírgula.</p>
        {mensagem && <div className={`mb-4 p-3 rounded-xl border text-sm font-semibold ${mensagem.includes('Erro') ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-[#34D399]/10 border-[#34D399]/35 text-emerald-200'}`}>{mensagem}</div>}
        <textarea
          className="w-full h-40 p-3 rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 mb-4"
          placeholder="Exemplo:\nJoão Silva, (47) 99999-8888\nMaria Souza\t(47) 98888-7777\n(47) 97777-6666"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div className="mb-4">
          <label className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary block mb-1">Corretor de destino:</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
            value={corretorDestino}
            onChange={e => setCorretorDestino(e.target.value)}
            disabled={corretores.length === 0}
          >
            <option value="">Selecione corretor de destino</option>
            {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        {leadsPreview.length > 0 && (
          <div className="mb-4 bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Prévia dos Leads:</div>
            <ul className="space-y-1">
              {leadsPreview.map((lead, idx) => (
                <li key={idx} className="flex gap-2 items-center text-sm">
                  <span className="font-bold text-white">{lead.nome || 'Sem nome'}</span>
                  <span className="text-text-secondary">{lead.telefone}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          className="w-full px-6 py-3 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white rounded-xl font-bold shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
          onClick={handleImportar}
          disabled={leadsPreview.length === 0 || !corretorDestino || loading}
        >
          {loading ? 'Importando...' : 'Importar'}
        </button>
      </div>
    </div>
  );
} 