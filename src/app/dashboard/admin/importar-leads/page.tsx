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
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, deleteDoc, Timestamp } from 'firebase/firestore';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';

interface Corretor {
  id: string;
  nome: string;
}

interface ContatoPreview {
  nome: string;
  telefone: string;
}

interface EventoBolsao { tipo: string; detalhe?: string; em: any; por?: string }

interface DescartadoBolsao {
  listaId: string;
  listaNome: string;
  contatoId: string;
  nome: string;
  telefone: string;
  whatsapp?: string;
  motivo?: string;
  tentativas?: number;
  anotacoes?: string;
  qualificacao?: Record<string, any>;
  eventos?: EventoBolsao[];
  descartadoEm?: any;
}

const demoTs = (hAtras: number) => Timestamp.fromMillis(Date.now() - hAtras * 3600_000);
const DEMO_BOLSAO: DescartadoBolsao[] = [
  { listaId: 'demo-lista', listaNome: 'Feirão Litoral — Stand Barra Velha', contatoId: 'dc5', nome: 'Vera Lúcia', telefone: '(47) 95555-6677', motivo: 'Número errado', tentativas: 3, anotacoes: 'Caixa postal direto.', eventos: [
    { tipo: 'tentativa', em: demoTs(120) }, { tipo: 'tentativa', em: demoTs(96) }, { tipo: 'tentativa', em: demoTs(80) }, { tipo: 'descartado', detalhe: 'Número errado', em: demoTs(79) },
  ] },
  { listaId: 'demo-lista', listaNome: 'Feirão Litoral — Stand Barra Velha', contatoId: 'dc8', nome: 'Gilmar Souza', telefone: '(47) 92288-9900', motivo: 'Não atende', tentativas: 4, eventos: [
    { tipo: 'tentativa', em: demoTs(200) }, { tipo: 'tentativa', em: demoTs(170) }, { tipo: 'tentativa', em: demoTs(150) }, { tipo: 'tentativa', em: demoTs(122) }, { tipo: 'descartado', detalhe: 'Não atende', em: demoTs(120) },
  ] },
  { listaId: 'demo-lista-2', listaNome: 'Portaria Condomínios — Penha', contatoId: 'dx1', nome: 'Osmar Teles', telefone: '(47) 91111-0000', motivo: 'Não quer', tentativas: 2, eventos: [
    { tipo: 'tentativa', em: demoTs(300) }, { tipo: 'tentativa', em: demoTs(260) }, { tipo: 'descartado', detalhe: 'Não quer', em: demoTs(255) },
  ] },
];

const p2 = (n: number) => String(n).padStart(2, '0');
const fmtEv = (em: any) => {
  const d = em?.toDate ? em.toDate() : em?.seconds ? new Date(em.seconds * 1000) : null;
  return d ? `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}` : '—';
};
const EV_ROTULO: Record<string, (d?: string, por?: string) => string> = {
  tentativa: (_d, por) => `💬 Tentativa de contato${por ? ` (${por.split(' ')[0]})` : ''}`,
  descartado: (d, por) => `🗑 Descartado${por ? ` por ${por.split(' ')[0]}` : ''}${d ? ` — ${d}` : ''}`,
  restaurado: (_d, por) => `↩ Voltou pra lista${por ? ` (${por.split(' ')[0]})` : ''}`,
  crm: (_d, por) => `✅ Virou lead no CRM${por ? ` por ${por.split(' ')[0]}` : ''}`,
  realocado: (d, por) => `🔄 Realocado${d ? ` pra ${d}` : ''}${por ? ` (${por.split(' ')[0]})` : ''}`,
};

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

  // --- Bolsão de descartados (achar, retirar, realocar) ---
  const [bolsao, setBolsao] = useState<DescartadoBolsao[]>([]);
  const [bolsaoCarregado, setBolsaoCarregado] = useState(false);
  const [selBolsao, setSelBolsao] = useState<Set<string>>(new Set());
  const [bolsaoCorretor, setBolsaoCorretor] = useState('');
  const [bolsaoNome, setBolsaoNome] = useState('');
  const [realocando, setRealocando] = useState(false);
  const [bolsaoBusca, setBolsaoBusca] = useState('');
  const [bolsaoLista, setBolsaoLista] = useState<string>('todas');
  const [bolsaoMotivo, setBolsaoMotivo] = useState<string>('todos');
  const [bolsaoExpandido, setBolsaoExpandido] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const carregarBolsao = React.useCallback(async () => {
    if (isEspelhoDemo) {
      setBolsao(DEMO_BOLSAO);
      setBolsaoCarregado(true);
      return;
    }
    if (!userData?.imobiliariaId) return;
    try {
      const listasSnap = await getDocs(query(
        collection(db, 'ligacaoAtivaListas'),
        where('imobiliariaId', '==', userData.imobiliariaId)
      ));
      const itens: DescartadoBolsao[] = [];
      for (const l of listasSnap.docs) {
        const lNome = (l.data() as any).nome || 'Lista';
        try {
          const descSnap = await getDocs(query(collection(l.ref, 'contatos'), where('status', '==', 'descartado')));
          descSnap.docs.forEach(d => {
            const c = d.data() as any;
            itens.push({
              listaId: l.id, listaNome: lNome, contatoId: d.id,
              nome: c.nome || '', telefone: c.telefone || '', whatsapp: c.whatsapp,
              motivo: c.descartadoMotivo, tentativas: c.tentativas,
              anotacoes: c.anotacoes, qualificacao: c.qualificacao,
              eventos: c.eventos || [], descartadoEm: c.descartadoEm,
            });
          });
        } catch { /* lista sem acesso — segue */ }
      }
      setBolsao(itens);
    } catch { /* silencioso */ }
    setBolsaoCarregado(true);
  }, [isEspelhoDemo, userData?.imobiliariaId]);

  useEffect(() => { carregarBolsao(); }, [carregarBolsao]);

  const toggleSelBolsao = (chave: string) => {
    setSelBolsao(prev => {
      const n = new Set(prev);
      if (n.has(chave)) n.delete(chave); else n.add(chave);
      return n;
    });
  };

  const realocarSelecionados = async () => {
    const escolhidos = bolsao.filter(b => selBolsao.has(`${b.listaId}:${b.contatoId}`));
    if (!escolhidos.length || !bolsaoCorretor || !currentUser) return;
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    setRealocando(true);
    try {
      const nome = bolsaoNome.trim() || `Bolsão · ${new Date().toLocaleDateString('pt-BR')}`;
      const listaRef = doc(collection(db, 'ligacaoAtivaListas'));
      let batch = writeBatch(db);
      batch.set(listaRef, {
        nome,
        imobiliariaId: userData?.imobiliariaId || '',
        corretorId: bolsaoCorretor,
        criadaPor: currentUser.uid,
        criadaEm: serverTimestamp(),
        total: escolhidos.length,
        veioDoBolsao: true,
      });
      const corretorNome = corretores.find(c => c.id === bolsaoCorretor)?.nome || '';
      const adminNome = (userData as any)?.nome || '';
      let ops = 1;
      for (let i = 0; i < escolhidos.length; i++) {
        const b = escolhidos[i];
        // O HISTÓRICO INTEIRO viaja com o cliente: eventos anteriores + o realocado
        const eventosCompletos = [
          ...(b.eventos || []),
          { tipo: 'realocado', detalhe: corretorNome, em: Timestamp.now(), por: adminNome },
        ];
        batch.set(doc(collection(listaRef, 'contatos')), {
          nome: b.nome,
          telefone: b.telefone,
          whatsapp: b.whatsapp || b.telefone.replace(/\D/g, ''),
          status: 'pendente',
          anotacoes: b.anotacoes || '',
          qualificacao: b.qualificacao || {},
          tentativas: 0,
          tentativasAnteriores: b.tentativas || 0,
          motivoAnterior: b.motivo || '',
          eventos: eventosCompletos,
          ordem: i,
          criadoEm: serverTimestamp(),
        });
        // Original sai do bolsão (fica no histórico como realocado)
        batch.update(doc(db, 'ligacaoAtivaListas', b.listaId, 'contatos', b.contatoId), {
          status: 'realocado',
          realocadoEm: serverTimestamp(),
          realocadoPara: bolsaoCorretor,
          eventos: eventosCompletos,
        });
        ops += 2;
        if (ops >= 398) { await batch.commit(); batch = writeBatch(db); ops = 0; }
      }
      if (ops > 0) await batch.commit();
      showToast(`Lista "${nome}" criada com ${escolhidos.length} contato${escolhidos.length > 1 ? 's' : ''} pra ${corretores.find(c => c.id === bolsaoCorretor)?.nome || 'o corretor'}!`, 'success');
      setSelBolsao(new Set());
      setBolsaoNome('');
      carregarBolsao();
    } catch (e) {
      console.error(e);
      showToast('Erro ao realocar os contatos.', 'error');
    } finally {
      setRealocando(false);
    }
  };

  /** Retira DE VEZ os selecionados do bolsão (apaga os contatos descartados). */
  const retirarSelecionados = async () => {
    const escolhidos = bolsao.filter(b => selBolsao.has(`${b.listaId}:${b.contatoId}`));
    if (!escolhidos.length) return;
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    const ok = await confirmDialog({
      message: `Retirar ${escolhidos.length} contato${escolhidos.length > 1 ? 's' : ''} do bolsão DE VEZ? Eles são apagados e não voltam mais.`,
      confirmLabel: 'Retirar de vez',
    });
    if (!ok) return;
    setRemovendo(true);
    try {
      await Promise.all(escolhidos.map(b => deleteDoc(doc(db, 'ligacaoAtivaListas', b.listaId, 'contatos', b.contatoId))));
      showToast(`${escolhidos.length} contato${escolhidos.length > 1 ? 's retirados' : ' retirado'} do bolsão.`, 'success');
      setSelBolsao(new Set());
      carregarBolsao();
    } catch (e) {
      console.error(e);
      showToast('Erro ao retirar do bolsão.', 'error');
    } finally {
      setRemovendo(false);
    }
  };

  // Filtros do bolsão (busca + lista + motivo)
  const bolsaoFiltrado = useMemo(() => {
    const termo = bolsaoBusca.trim().toLowerCase();
    return bolsao.filter(b => {
      if (bolsaoLista !== 'todas' && b.listaId !== bolsaoLista) return false;
      if (bolsaoMotivo !== 'todos' && (b.motivo || 'Sem motivo') !== bolsaoMotivo) return false;
      if (termo && !(`${b.nome} ${b.telefone}`.toLowerCase().includes(termo))) return false;
      return true;
    });
  }, [bolsao, bolsaoBusca, bolsaoLista, bolsaoMotivo]);

  const bolsaoListas = useMemo(() => {
    const m = new Map<string, string>();
    bolsao.forEach(b => m.set(b.listaId, b.listaNome));
    return Array.from(m.entries());
  }, [bolsao]);

  const bolsaoMotivos = useMemo(() => Array.from(new Set(bolsao.map(b => b.motivo || 'Sem motivo'))), [bolsao]);

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

      {/* ===== Bolsão de descartados — achar, retirar, realocar ===== */}
      <div className="max-w-2xl mx-auto al-card relative overflow-hidden p-6 mt-6">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="al-display text-[17px] font-bold text-white uppercase tracking-[0.1em]">🧊 Bolsão de descartados</h2>
          {bolsao.length > 0 && (
            <span className="text-[11px] font-bold text-text-secondary tabular-nums px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">{bolsao.length} no bolsão</span>
          )}
        </div>
        <p className="text-text-secondary mb-4 text-sm">
          O que os corretores descartaram, com motivo e histórico. Ache, selecione e: <b className="text-white">realoque</b> pra outro corretor tentar de novo, ou <b className="text-white">retire de vez</b>.
        </p>

        {!bolsaoCarregado ? (
          <p className="text-sm text-text-secondary py-4">Carregando bolsão…</p>
        ) : bolsao.length === 0 ? (
          <p className="text-sm text-text-secondary py-4">Nenhum descartado no bolsão por enquanto. 👌</p>
        ) : (
          <>
            {/* Achar: busca + lista + motivo */}
            <div className="mb-3 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  className={inputCls}
                  placeholder="🔎 Buscar por nome ou telefone…"
                  value={bolsaoBusca}
                  onChange={e => setBolsaoBusca(e.target.value)}
                />
                <select className={inputCls} value={bolsaoLista} onChange={e => setBolsaoLista(e.target.value)}>
                  <option value="todas">Todas as listas ({bolsao.length})</option>
                  {bolsaoListas.map(([id, nome]) => (
                    <option key={id} value={id}>{nome} ({bolsao.filter(b => b.listaId === id).length})</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setBolsaoMotivo('todos')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${bolsaoMotivo === 'todos' ? 'bg-[#FF1E56]/15 border-[#FF3364]/60 text-[#FF9EB5]' : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08]'}`}
                >
                  Todos os motivos
                </button>
                {bolsaoMotivos.map(m => (
                  <button
                    key={m}
                    onClick={() => setBolsaoMotivo(prev => prev === m ? 'todos' : m)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${bolsaoMotivo === m ? 'bg-[#FF1E56]/15 border-[#FF3364]/60 text-[#FF9EB5]' : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08]'}`}
                  >
                    {m} ({bolsao.filter(b => (b.motivo || 'Sem motivo') === m).length})
                  </button>
                ))}
                <button
                  onClick={() => {
                    const todosSel = bolsaoFiltrado.every(b => selBolsao.has(`${b.listaId}:${b.contatoId}`));
                    setSelBolsao(prev => {
                      const n = new Set(prev);
                      bolsaoFiltrado.forEach(b => { const k = `${b.listaId}:${b.contatoId}`; if (todosSel) n.delete(k); else n.add(k); });
                      return n;
                    });
                  }}
                  className="ml-auto px-2.5 py-1 rounded-lg text-[11px] font-bold border border-[#E8C547]/40 bg-[#E8C547]/10 text-[#FFE9A6] hover:bg-[#E8C547]/20 transition-colors"
                >
                  {bolsaoFiltrado.length > 0 && bolsaoFiltrado.every(b => selBolsao.has(`${b.listaId}:${b.contatoId}`)) ? 'Desmarcar' : 'Selecionar'} os {bolsaoFiltrado.length} filtrados
                </button>
              </div>
            </div>

            {/* Lista filtrada com histórico expandível */}
            <div className="mb-4 max-h-80 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]">
              {bolsaoFiltrado.length === 0 ? (
                <p className="text-sm text-text-secondary p-4">Nada com esses filtros.</p>
              ) : bolsaoFiltrado.map(b => {
                const chave = `${b.listaId}:${b.contatoId}`;
                const marcado = selBolsao.has(chave);
                const expandido = bolsaoExpandido === chave;
                return (
                  <div key={chave}>
                    <div
                      onClick={() => toggleSelBolsao(chave)}
                      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${marcado ? 'bg-[#E8C547]/[0.07]' : 'hover:bg-white/[0.03]'}`}
                    >
                      <span className={`h-3.5 w-3.5 rounded border grid place-items-center text-[9px] shrink-0 ${marcado ? 'bg-[#E8C547]/20 border-[#E8C547]/60 text-[#FFE9A6]' : 'border-white/20 text-transparent'}`}>✓</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold text-white truncate">{b.nome || <span className="text-white/40 italic font-normal">Sem nome</span>}</span>
                        {bolsaoLista === 'todas' && <span className="block text-[10px] text-[#FFE9A6]/60 truncate">{b.listaNome}</span>}
                      </span>
                      <span className="text-[12px] text-text-secondary tabular-nums shrink-0">{b.telefone}</span>
                      {b.motivo && <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-white/[0.05] border border-white/15 text-text-secondary">{b.motivo}</span>}
                      {(b.tentativas || 0) > 0 && <span className="shrink-0 text-[10px] text-[#FFE9A6]/70 tabular-nums">💬 {b.tentativas}×</span>}
                      <button
                        onClick={e => { e.stopPropagation(); setBolsaoExpandido(expandido ? null : chave); }}
                        className="shrink-0 px-1.5 py-0.5 rounded text-[11px] text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        title="Ver histórico"
                      >
                        {expandido ? '▲' : '▼'}
                      </button>
                    </div>
                    {expandido && (
                      <div className="px-9 pb-2.5 pt-0.5 space-y-1">
                        {b.anotacoes && <p className="text-[12px] text-white/60 italic">“{b.anotacoes}”</p>}
                        {(b.eventos || []).length === 0 ? (
                          <p className="text-[11.5px] text-white/35">Sem registro de atividade.</p>
                        ) : [...(b.eventos || [])].reverse().map((ev, i) => (
                          <p key={i} className="text-[11.5px] text-white/55">
                            <span className="text-white/30 tabular-nums mr-1.5">{fmtEv(ev.em)}</span>
                            {(EV_ROTULO[ev.tipo] || (() => ev.tipo))(ev.detalhe, ev.por)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Realocar ou retirar */}
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <select className={inputCls} value={bolsaoCorretor} onChange={e => setBolsaoCorretor(e.target.value)}>
                <option value="">Corretor que vai receber</option>
                {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <input
                className={inputCls}
                placeholder={`Nome da nova lista (padrão: Bolsão · ${new Date().toLocaleDateString('pt-BR')})`}
                value={bolsaoNome}
                onChange={e => setBolsaoNome(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={realocarSelecionados}
                disabled={selBolsao.size === 0 || !bolsaoCorretor || realocando}
                className="flex-1 px-6 py-3 bg-[#7DD3FC]/10 border border-[#7DD3FC]/40 text-[#7DD3FC] hover:bg-[#7DD3FC]/20 rounded-xl font-bold transition-colors disabled:opacity-40"
              >
                {realocando ? 'Realocando…' : `🔄 Realocar ${selBolsao.size} selecionado${selBolsao.size === 1 ? '' : 's'}`}
              </button>
              <button
                onClick={retirarSelecionados}
                disabled={selBolsao.size === 0 || removendo}
                className="sm:w-56 px-6 py-3 bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20 rounded-xl font-bold transition-colors disabled:opacity-40"
              >
                {removendo ? 'Retirando…' : `🗑 Retirar de vez (${selBolsao.size})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
