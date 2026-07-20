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
}

const DEMO_BOLSAO: DescartadoBolsao[] = [
  { listaId: 'demo-lista', listaNome: 'Feirão Litoral — Stand Barra Velha', contatoId: 'dc5', nome: 'Vera Lúcia', telefone: '(47) 95555-6677', motivo: 'Número errado', tentativas: 3 },
  { listaId: 'demo-lista', listaNome: 'Feirão Litoral — Stand Barra Velha', contatoId: 'dc8', nome: 'Gilmar Souza', telefone: '(47) 92288-9900', motivo: 'Não atende', tentativas: 4 },
  { listaId: 'demo-lista-2', listaNome: 'Portaria Condomínios — Penha', contatoId: 'dx1', nome: 'Osmar Teles', telefone: '(47) 91111-0000', motivo: 'Não quer', tentativas: 2 },
];

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

  // --- Bolsão de descartados (realocar pra outro corretor) ---
  const [bolsao, setBolsao] = useState<DescartadoBolsao[]>([]);
  const [bolsaoCarregado, setBolsaoCarregado] = useState(false);
  const [selBolsao, setSelBolsao] = useState<Set<string>>(new Set());
  const [bolsaoCorretor, setBolsaoCorretor] = useState('');
  const [bolsaoNome, setBolsaoNome] = useState('');
  const [realocando, setRealocando] = useState(false);

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
      let ops = 1;
      for (let i = 0; i < escolhidos.length; i++) {
        const b = escolhidos[i];
        // Cópia limpa pro novo corretor (mantém o histórico útil)
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
          ordem: i,
          criadoEm: serverTimestamp(),
        });
        // Original sai do bolsão (fica no histórico como realocado)
        batch.update(doc(db, 'ligacaoAtivaListas', b.listaId, 'contatos', b.contatoId), {
          status: 'realocado',
          realocadoEm: serverTimestamp(),
          realocadoPara: bolsaoCorretor,
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

      {/* ===== Bolsão de descartados — realocar pra outro corretor ===== */}
      <div className="max-w-2xl mx-auto al-card relative overflow-hidden p-6 mt-6">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <h2 className="al-display text-[17px] font-bold text-white uppercase tracking-[0.1em] mb-1">🧊 Bolsão de descartados</h2>
        <p className="text-text-secondary mb-4 text-sm">
          Contatos que os corretores descartaram (com motivo). Selecione e crie uma nova lista pra outro corretor tentar de novo.
        </p>

        {!bolsaoCarregado ? (
          <p className="text-sm text-text-secondary py-4">Carregando bolsão…</p>
        ) : bolsao.length === 0 ? (
          <p className="text-sm text-text-secondary py-4">Nenhum descartado no bolsão por enquanto. 👌</p>
        ) : (
          <>
            <div className="mb-4 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary block mb-1">Novo corretor</label>
                <select
                  className={inputCls}
                  value={bolsaoCorretor}
                  onChange={e => setBolsaoCorretor(e.target.value)}
                >
                  <option value="">Selecione o corretor</option>
                  {corretores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary block mb-1">Nome da nova lista (opcional)</label>
                <input
                  className={inputCls}
                  placeholder={`Bolsão · ${new Date().toLocaleDateString('pt-BR')}`}
                  value={bolsaoNome}
                  onChange={e => setBolsaoNome(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4 max-h-72 overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]">
              {Array.from(new Set(bolsao.map(b => b.listaId))).map(listaId => {
                const doGrupo = bolsao.filter(b => b.listaId === listaId);
                const todos = doGrupo.every(b => selBolsao.has(`${b.listaId}:${b.contatoId}`));
                return (
                  <div key={listaId}>
                    <button
                      onClick={() => {
                        setSelBolsao(prev => {
                          const n = new Set(prev);
                          doGrupo.forEach(b => { const k = `${b.listaId}:${b.contatoId}`; if (todos) n.delete(k); else n.add(k); });
                          return n;
                        });
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] text-left hover:bg-white/[0.05] transition-colors"
                    >
                      <span className={`h-3.5 w-3.5 rounded border grid place-items-center text-[9px] ${todos ? 'bg-[#E8C547]/20 border-[#E8C547]/60 text-[#FFE9A6]' : 'border-white/20 text-transparent'}`}>✓</span>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FFE9A6]">{doGrupo[0].listaNome}</span>
                      <span className="text-[11px] text-text-secondary tabular-nums">({doGrupo.length})</span>
                    </button>
                    {doGrupo.map(b => {
                      const chave = `${b.listaId}:${b.contatoId}`;
                      const marcado = selBolsao.has(chave);
                      return (
                        <button
                          key={chave}
                          onClick={() => toggleSelBolsao(chave)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${marcado ? 'bg-[#E8C547]/[0.07]' : 'hover:bg-white/[0.03]'}`}
                        >
                          <span className={`h-3.5 w-3.5 rounded border grid place-items-center text-[9px] shrink-0 ${marcado ? 'bg-[#E8C547]/20 border-[#E8C547]/60 text-[#FFE9A6]' : 'border-white/20 text-transparent'}`}>✓</span>
                          <span className="flex-1 min-w-0 text-[13px] font-semibold text-white truncate">{b.nome || <span className="text-white/40 italic font-normal">Sem nome</span>}</span>
                          <span className="text-[12px] text-text-secondary tabular-nums shrink-0">{b.telefone}</span>
                          {b.motivo && <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-white/[0.05] border border-white/15 text-text-secondary">{b.motivo}</span>}
                          {(b.tentativas || 0) > 0 && <span className="shrink-0 text-[10px] text-[#FFE9A6]/70 tabular-nums">💬 {b.tentativas}×</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <button
              onClick={realocarSelecionados}
              disabled={selBolsao.size === 0 || !bolsaoCorretor || realocando}
              className="w-full px-6 py-3 bg-[#7DD3FC]/10 border border-[#7DD3FC]/40 text-[#7DD3FC] hover:bg-[#7DD3FC]/20 rounded-xl font-bold transition-colors disabled:opacity-40"
            >
              {realocando ? 'Realocando…' : `🔄 Criar lista com ${selBolsao.size} selecionado${selBolsao.size === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
