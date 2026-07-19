'use client';

/**
 * Importar Ligação Ativa — a importação em massa NÃO cria mais leads no CRM.
 * Ela abastece a TABELA da Ligação Ativa do corretor: uma lista fria com nome
 * de origem (ex.: "Feirão Barra Velha") que o corretor trabalha ligando; o
 * contato só vira lead de verdade quando atende ("Incluir no CRM").
 *
 * Coleções: ligacaoAtivaListas/{id} {nome, imobiliariaId, corretorId, criadaEm,
 * criadaPor, total} + subcoleção contatos/{cid} {nome, telefone, whatsapp,
 * status pendente|descartado|crm, anotacoes, qualificacao, ordem, leadId?}.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { showToast } from '@/components/ui/toast';

interface Corretor {
  id: string;
  nome: string;
}

interface ContatoPreview {
  nome: string;
  telefone: string;
}

export default function ImportarLigacaoAtivaPage() {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [corretorDestino, setCorretorDestino] = useState('');
  const [nomeLista, setNomeLista] = useState('');
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<ContatoPreview[]>([]);
  const [linhasIgnoradas, setLinhasIgnoradas] = useState(0);
  const [jaExistentes, setJaExistentes] = useState(0); // telefones que já são leads do CRM (pulados)
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

  // Parsing inteligente do input (nome/telefone em qualquer ordem; 1 coluna = telefone)
  useEffect(() => {
    setJaExistentes(0);
    if (!input) {
      setPreview([]);
      setLinhasIgnoradas(0);
      return;
    }
    const lines = input.split(/\r?\n/).filter(Boolean);

    const looksLikePhone = (value: string | undefined | null) => {
      if (!value) return false;
      const digits = value.replace(/\D/g, '');
      return digits.length >= 8;
    };

    const contatos: ContatoPreview[] = lines.map(line => {
      const [rawA = '', rawB = ''] = line.split(/\t|,|;/);
      let nome = rawA;
      let telefone = rawB;
      if (!telefone) {
        telefone = nome;
        nome = '';
      } else {
        const aIsPhone = looksLikePhone(rawA);
        const bIsPhone = looksLikePhone(rawB);
        if (aIsPhone && !bIsPhone) {
          telefone = rawA;
          nome = rawB;
        }
      }
      return { nome: nome?.trim() || '', telefone: telefone?.trim() || '' };
    });

    const validos = contatos.filter(l => l.telefone.replace(/\D/g, '').length >= 8);
    const vistos = new Set<string>();
    const unicos = validos.filter(l => {
      const digitos = l.telefone.replace(/\D/g, '');
      if (vistos.has(digitos)) return false;
      vistos.add(digitos);
      return true;
    });
    setPreview(unicos);
    setLinhasIgnoradas(contatos.length - unicos.length);
  }, [input]);

  const handleImportar = async () => {
    if (!corretorDestino || !nomeLista.trim() || preview.length === 0 || !currentUser) return;
    if (isEspelhoDemo) {
      showToast('Modo demonstração — nada é salvo.', 'info');
      return;
    }
    setLoading(true);
    setMensagem(null);
    try {
      // Quem já é lead no CRM não entra na lista fria (não faz sentido ligar frio
      // pra quem já está sendo atendido).
      const existentesSnap = await getDocs(query(
        collection(db, 'leads'),
        where('imobiliariaId', '==', userData?.imobiliariaId || '')
      ));
      const telefonesExistentes = new Set<string>();
      existentesSnap.docs.forEach((d) => {
        const dados = d.data() as { whatsapp?: string; telefone?: string };
        const w = String(dados.whatsapp || '').replace(/\D/g, '');
        const t = String(dados.telefone || '').replace(/\D/g, '');
        if (w) telefonesExistentes.add(w);
        if (t) telefonesExistentes.add(t);
      });

      const novos = preview.filter(l => !telefonesExistentes.has(l.telefone.replace(/\D/g, '')));
      const pulados = preview.length - novos.length;
      setJaExistentes(pulados);

      if (novos.length === 0) {
        setMensagem(`Nenhum contato novo — ${pulados === 1 ? 'esse telefone já é lead' : `esses ${pulados} telefones já são leads`} no CRM.`);
        return;
      }

      // Cria a lista + contatos em batches (≤400 gravações por batch)
      const listaRef = doc(collection(db, 'ligacaoAtivaListas'));
      let batch = writeBatch(db);
      batch.set(listaRef, {
        nome: nomeLista.trim(),
        imobiliariaId: userData?.imobiliariaId || '',
        corretorId: corretorDestino,
        criadaPor: currentUser.uid,
        criadaEm: serverTimestamp(),
        total: novos.length,
      });
      let ops = 1;
      for (let i = 0; i < novos.length; i++) {
        const c = novos[i];
        batch.set(doc(collection(listaRef, 'contatos')), {
          nome: c.nome,
          telefone: c.telefone,
          whatsapp: c.telefone.replace(/\D/g, ''),
          status: 'pendente',
          anotacoes: '',
          qualificacao: {},
          ordem: i,
          criadoEm: serverTimestamp(),
        });
        ops++;
        if (ops >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      }
      if (ops > 0) await batch.commit();

      setMensagem(
        `Lista "${nomeLista.trim()}" criada com ${novos.length} contato${novos.length > 1 ? 's' : ''} pra ${corretores.find(c => c.id === corretorDestino)?.nome || 'o corretor'}!` +
        (pulados > 0 ? ` ${pulados} já era${pulados > 1 ? 'm' : ''} lead no CRM (pulado${pulados > 1 ? 's' : ''}).` : '')
      );
      setInput('');
      setPreview([]);
      setNomeLista('');
    } catch (err) {
      console.error(err);
      setMensagem('Erro ao importar a lista.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto al-card relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <span className="gx-tag mb-2 inline-flex"><span>Ligação ativa</span></span>
        <h1 className="al-display text-[20px] font-bold text-white uppercase tracking-[0.1em] mb-2 text-left">Importar Lista de Ligação</h1>
        <p className="text-text-secondary mb-6 text-left text-sm">
          Cole nomes e telefones (direto do Excel/Sheets). A lista vira a <b className="text-white">tabela da Ligação Ativa</b> do corretor —
          o contato só entra no CRM quando atender e o corretor clicar em &quot;Incluir no CRM&quot;.
        </p>
        {mensagem && <div className={`mb-4 p-3 rounded-xl border text-sm font-semibold ${mensagem.includes('Erro') ? 'bg-red-500/10 border-red-500/40 text-red-300' : mensagem.startsWith('Nenhum contato') ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-[#34D399]/10 border-[#34D399]/35 text-emerald-200'}`}>{mensagem}</div>}

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary block mb-1">Nome da lista (de onde veio)</label>
            <input
              className={inputCls}
              placeholder='Ex: Feirão Barra Velha — Stand'
              value={nomeLista}
              onChange={e => setNomeLista(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary block mb-1">Corretor que vai ligar</label>
            <select
              className={inputCls}
              value={corretorDestino}
              onChange={e => setCorretorDestino(e.target.value)}
              disabled={corretores.length === 0}
            >
              <option value="">Selecione o corretor</option>
              {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        <textarea
          className="w-full h-40 p-3 rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 mb-4"
          placeholder={'Exemplo:\nJoão Silva, (47) 99999-8888\nMaria Souza\t(47) 98888-7777\n(47) 97777-6666'}
          value={input}
          onChange={e => setInput(e.target.value)}
        />

        {(linhasIgnoradas > 0 || jaExistentes > 0) && (
          <div className="mb-4 p-3 rounded-xl border text-sm font-semibold bg-amber-500/10 border-amber-500/40 text-amber-200">
            {[
              linhasIgnoradas > 0 ? `${linhasIgnoradas} linha${linhasIgnoradas > 1 ? 's' : ''} ignorada${linhasIgnoradas > 1 ? 's' : ''} (telefone inválido ou duplicado na colagem)` : null,
              jaExistentes > 0 ? `${jaExistentes} já ${jaExistentes > 1 ? 'são leads' : 'é lead'} no CRM (pulado${jaExistentes > 1 ? 's' : ''})` : null,
            ].filter(Boolean).join(' · ')}
          </div>
        )}

        {preview.length > 0 && (
          <div className="mb-4 bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] max-h-56 overflow-y-auto">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Prévia — {preview.length} contato{preview.length > 1 ? 's' : ''}:</div>
            <ul className="space-y-1">
              {preview.map((c, idx) => (
                <li key={idx} className="flex gap-2 items-center text-sm">
                  <span className="font-bold text-white">{c.nome || 'Sem nome'}</span>
                  <span className="text-text-secondary tabular-nums">{c.telefone}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="w-full px-6 py-3 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white rounded-xl font-bold shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
          onClick={handleImportar}
          disabled={preview.length === 0 || !corretorDestino || !nomeLista.trim() || loading}
        >
          {loading ? 'Criando lista…' : `Criar lista da Ligação Ativa (${preview.length})`}
        </button>
      </div>
    </div>
  );
}
