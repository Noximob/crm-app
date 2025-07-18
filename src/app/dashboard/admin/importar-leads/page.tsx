'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

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
    const leads: LeadPreview[] = lines.map(line => {
      let [nome, telefone] = line.split(/\t|,|;/);
      if (!telefone) {
        telefone = nome;
        nome = '';
      }
      return {
        nome: nome?.trim() || '',
        telefone: telefone?.trim() || '',
      };
    }).filter(l => l.telefone);
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
          etapa: 'Pré Qualificação',
          origem: 'Importação em massa',
          createdAt: new Date(),
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
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Importar Leads em Massa</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Cole abaixo nomes e telefones (copie direto do Excel ou Google Sheets). Cada linha deve conter Nome e Telefone, separados por tabulação, vírgula ou ponto e vírgula.</p>
        {mensagem && <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800">{mensagem}</div>}
        <textarea
          className="w-full h-40 p-3 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white mb-4"
          placeholder="Exemplo:\nJoão Silva, (47) 99999-8888\nMaria Souza\t(47) 98888-7777\n(47) 97777-6666"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div className="mb-4">
          <label className="font-medium text-[#6B6F76] dark:text-gray-300 block mb-1">Corretor de destino:</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
            value={corretorDestino}
            onChange={e => setCorretorDestino(e.target.value)}
            disabled={corretores.length === 0}
          >
            <option value="">Selecione corretor de destino</option>
            {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        {leadsPreview.length > 0 && (
          <div className="mb-4 bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl p-4 border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="font-semibold mb-2 text-[#2E2F38] dark:text-white">Prévia dos Leads:</div>
            <ul className="space-y-1">
              {leadsPreview.map((lead, idx) => (
                <li key={idx} className="flex gap-2 items-center text-sm">
                  <span className="font-bold text-[#2E2F38] dark:text-white">{lead.nome || 'Sem nome'}</span>
                  <span className="text-[#6B6F76] dark:text-gray-300">{lead.telefone}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          className="w-full px-6 py-3 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          onClick={handleImportar}
          disabled={leadsPreview.length === 0 || !corretorDestino || loading}
        >
          {loading ? 'Importando...' : 'Importar'}
        </button>
      </div>
    </div>
  );
} 