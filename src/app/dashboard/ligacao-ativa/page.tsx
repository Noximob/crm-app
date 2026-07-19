'use client';

/**
 * Ligação Ativa — o cockpit da lista fria.
 *
 * EXCELZÃO em cima (tabela protagonista, largura toda: nome, telefone e ações
 * na linha). Clicou num contato → abre a BANCADA embaixo: roteiro ÚNICO da
 * ligação à esquerda (com o nome do contato e a lista interpolados) e, à
 * direita, anotações + qualificação + ações grandes. "Incluir no CRM" sobe
 * tudo junto e o circuito assume (lead nasce em Entrada, pop-ups abrem).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { FUNIL_DEFAULT } from '@/lib/funil/default';
import type { FunilConfig, FunilNode, FunilPasso } from '@/lib/funil/types';
import { QUALIFICATION_QUESTIONS } from '@/lib/qualificacao';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface Lista {
  id: string;
  nome: string;
  total?: number;
  criadaEm?: any;
}

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  whatsapp?: string;
  status: 'pendente' | 'descartado' | 'crm';
  anotacoes?: string;
  qualificacao?: Record<string, any>;
  ordem?: number;
  leadId?: string;
}

interface Sessao { client: string; corretor: string; lista: string; }

// ---------------------------------------------------------------------------
// Helpers do roteiro (script ÚNICO — sem variação por produto)
// ---------------------------------------------------------------------------
function interpolar(txt: string, s: Sessao): string {
  return (txt || '')
    .replace(/\[Nome\]/g, s.client || '[Nome]')
    .replace(/\[Seu nome\]/g, s.corretor || '[Seu nome]')
    .replace(/\[Lista\]/g, s.lista || 'nosso cadastro')
    .replace(/\[Produto\]/g, 'imóveis aqui no Litoral'); // compat com roteiros antigos salvos
}
function textoDe(x: { mensagem?: string; mensagensPorProduto?: Record<string, string> }): string {
  // roteiros antigos salvos podem ter variação por produto — usa o texto geral
  if (x.mensagem) return x.mensagem;
  if (x.mensagensPorProduto) return x.mensagensPorProduto['nao_sei'] || Object.values(x.mensagensPorProduto)[0] || '';
  return '';
}
function corEscolha(label: string): string {
  const l = (label || '').toLowerCase();
  if (/(topou|marcou|aceita|voltar a marcar|confirmad|puxar)/.test(l))
    return 'border-[#34D399]/35 bg-[#34D399]/[0.06] hover:border-[#34D399]/60 hover:bg-[#34D399]/[0.12]';
  if (/(não|nao\b|desconfi|encerrar|encerrado)/.test(l))
    return 'border-[#FF1E56]/35 bg-[#FF1E56]/[0.06] hover:border-[#FF1E56]/60 hover:bg-[#FF1E56]/[0.12]';
  if (/(sem tempo|pensar|pesquisando|retorno|whatsapp|combinei)/.test(l))
    return 'border-[#E8C547]/35 bg-[#E8C547]/[0.06] hover:border-[#E8C547]/60 hover:bg-[#E8C547]/[0.12]';
  return 'border-white/[0.08] bg-white/[0.03] hover:border-[#FF1E56]/45 hover:bg-white/[0.07]';
}

function MensagemCard({ titulo, texto, audio }: { titulo?: string; texto: string; audio?: boolean }) {
  if (!texto) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      {titulo && (
        <div className="px-3.5 py-2 bg-white/[0.02] border-b border-white/[0.08] flex items-center gap-2">
          {audio && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#9F6BFF]/10 border border-[#9F6BFF]/35 text-[#C4A6FF] shrink-0">🎙 ÁUDIO</span>}
          <span className="text-[12.5px] font-semibold text-[#FF9EB5]">{titulo}</span>
        </div>
      )}
      <div className="p-3.5">
        {!titulo && audio && <span className="inline-flex items-center mb-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#9F6BFF]/10 border border-[#9F6BFF]/35 text-[#C4A6FF]">🎙 grave lendo o texto</span>}
        <p className="text-[14px] text-white whitespace-pre-line leading-[1.7]">{texto}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo (espelho)
// ---------------------------------------------------------------------------
const DEMO_LISTA: Lista = { id: 'demo-lista', nome: 'Feirão Litoral — Stand Barra Velha', total: 8 };
const DEMO_CONTATOS: Contato[] = [
  { id: 'dc1', nome: 'Rafael Nogueira', telefone: '(47) 99911-2233', status: 'pendente', anotacoes: '', qualificacao: {} },
  { id: 'dc2', nome: 'Camila Duarte', telefone: '(47) 98822-3344', status: 'pendente', anotacoes: 'Pediu pra ligar depois das 18h.', qualificacao: { finalidade: ['Investimento'] } },
  { id: 'dc3', nome: '', telefone: '(47) 97733-4455', status: 'pendente', anotacoes: '', qualificacao: {} },
  { id: 'dc4', nome: 'Sérgio Prado', telefone: '(47) 96644-5566', status: 'crm', leadId: 'demo-lead-1', anotacoes: 'Atendeu, quer 2 quartos na Barra.', qualificacao: { quartos: ['2 quartos'], localizacao: ['Barra Velha'] } },
  { id: 'dc5', nome: 'Vera Lúcia', telefone: '(47) 95555-6677', status: 'descartado', anotacoes: 'Número errado.', qualificacao: {} },
  { id: 'dc6', nome: 'Tiago Melo', telefone: '(47) 94466-7788', status: 'pendente', anotacoes: '', qualificacao: {} },
  { id: 'dc7', nome: 'Patrícia Reis', telefone: '(47) 93377-8899', status: 'pendente', anotacoes: '', qualificacao: {} },
  { id: 'dc8', nome: 'Gilmar Souza', telefone: '(47) 92288-9900', status: 'pendente', anotacoes: '', qualificacao: {} },
];

const FILTROS = [
  { key: 'pendente', label: 'Pra ligar' },
  { key: 'crm', label: 'No CRM' },
  { key: 'descartado', label: 'Descartados' },
] as const;

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function LigacaoAtivaPage() {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
  const { stages } = usePipelineStages();
  const router = useRouter();

  // --- Roteiro (único) ---
  const [cfg, setCfg] = useState<FunilConfig>(FUNIL_DEFAULT);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [currentNode, setCurrentNode] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});

  // --- Listas & contatos ---
  const [listas, setListas] = useState<Lista[]>([]);
  const [listaSel, setListaSel] = useState<string | null>(null);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loadingListas, setLoadingListas] = useState(true);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['key']>('pendente');
  const [contatoSel, setContatoSel] = useState<string | null>(null);
  const [incluindo, setIncluindo] = useState<string | null>(null);

  // Anotações/qualificação do contato selecionado (edição local + autosave)
  const [anot, setAnot] = useState('');
  const [qual, setQual] = useState<Record<string, string[]>>({});
  const [saveInfo, setSaveInfo] = useState<'idle' | 'salvando' | 'salvo'>('idle');
  const anotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Carrega roteiro ---
  useEffect(() => {
    (async () => {
      try {
        if (userData?.imobiliariaId && !isEspelhoDemo) {
          const snap = await getDoc(doc(db, 'configLigacaoAtiva', userData.imobiliariaId));
          const data = snap.exists() ? (snap.data() as { config?: FunilConfig }) : null;
          if (data?.config?.nodes?.length) { setCfg(data.config); return; }
        }
      } catch { /* usa o padrão */ }
      setCfg(FUNIL_DEFAULT);
    })().finally(() => setLoadingCfg(false));
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  useEffect(() => {
    if (!loadingCfg && !currentNode) setCurrentNode(cfg.startNode);
  }, [loadingCfg, cfg, currentNode]);

  // --- Carrega listas do corretor ---
  useEffect(() => {
    if (isEspelhoDemo) {
      setListas([DEMO_LISTA]);
      setListaSel(DEMO_LISTA.id);
      setContatos(DEMO_CONTATOS);
      setLoadingListas(false);
      return;
    }
    if (!currentUser) return;
    const q = query(collection(db, 'ligacaoAtivaListas'), where('corretorId', '==', currentUser.uid));
    const unsub = onSnapshot(q, snap => {
      const ls = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lista));
      ls.sort((a, b) => (b.criadaEm?.seconds ?? 0) - (a.criadaEm?.seconds ?? 0));
      setListas(ls);
      setListaSel(prev => (prev && ls.some(l => l.id === prev) ? prev : ls[0]?.id ?? null));
      setLoadingListas(false);
    }, () => setLoadingListas(false));
    return () => unsub();
  }, [currentUser, isEspelhoDemo]);

  // --- Contatos da lista selecionada ---
  useEffect(() => {
    if (isEspelhoDemo || !listaSel) return;
    const unsub = onSnapshot(collection(db, 'ligacaoAtivaListas', listaSel, 'contatos'), snap => {
      const cs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contato));
      cs.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
      setContatos(cs);
    });
    return () => unsub();
  }, [listaSel, isEspelhoDemo]);

  // --- Seleção de contato ---
  const selecionar = (c: Contato) => {
    setContatoSel(c.id);
    setAnot(c.anotacoes || '');
    const q0: Record<string, string[]> = {};
    Object.entries(c.qualificacao || {}).forEach(([k, v]) => { q0[k] = Array.isArray(v) ? v : [v as string]; });
    setQual(q0);
    setSaveInfo('idle');
    // Cada cliente é uma ligação nova: roteiro volta pro início
    setCurrentNode(cfg.startNode);
    setHistory([]);
    setMarcados({});
  };

  const salvarContato = (campos: Record<string, any>) => {
    if (isEspelhoDemo || !listaSel || !contatoSel) { setSaveInfo('idle'); return; }
    updateDoc(doc(db, 'ligacaoAtivaListas', listaSel, 'contatos', contatoSel), { ...campos, atualizadoEm: serverTimestamp() })
      .then(() => { setSaveInfo('salvo'); setTimeout(() => setSaveInfo(s => s === 'salvo' ? 'idle' : s), 2000); })
      .catch(() => setSaveInfo('idle'));
  };

  const onAnot = (v: string) => {
    setAnot(v);
    setSaveInfo('salvando');
    if (anotTimer.current) clearTimeout(anotTimer.current);
    anotTimer.current = setTimeout(() => salvarContato({ anotacoes: v }), 800);
  };

  const onQual = (key: string, value: string) => {
    setQual(prev => {
      const atual = prev[key] || [];
      let next: Record<string, string[]>;
      if (atual.includes(value)) {
        const vals = atual.filter(v => v !== value);
        next = { ...prev };
        if (vals.length === 0) delete next[key]; else next[key] = vals;
      } else {
        next = { ...prev, [key]: [...atual, value] };
      }
      setSaveInfo('salvando');
      if (qualTimer.current) clearTimeout(qualTimer.current);
      qualTimer.current = setTimeout(() => salvarContato({ qualificacao: next }), 600);
      return next;
    });
  };

  // --- Ações por contato ---
  const descartar = (c: Contato) => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    if (!listaSel) return;
    updateDoc(doc(db, 'ligacaoAtivaListas', listaSel, 'contatos', c.id), { status: 'descartado', descartadoEm: serverTimestamp() }).catch(() => {});
    if (contatoSel === c.id) setContatoSel(null);
  };

  const restaurar = (c: Contato) => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    if (!listaSel) return;
    updateDoc(doc(db, 'ligacaoAtivaListas', listaSel, 'contatos', c.id), { status: 'pendente' }).catch(() => {});
  };

  const incluirNoCrm = async (c: Contato) => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    if (!currentUser || !listaSel || incluindo) return;
    setIncluindo(c.id);
    try {
      const digits = (c.whatsapp || c.telefone || '').replace(/\D/g, '');
      const imobId = userData?.imobiliariaId || '';
      const candidatos = digits.length >= 10 ? [digits, `55${digits}`] : [digits];
      let dupDe: string | null = null;
      for (const cand of candidatos) {
        const snap = await getDocs(query(collection(db, 'leads'), where('imobiliariaId', '==', imobId), where('whatsapp', '==', cand), limit(1)));
        if (!snap.empty) {
          const dono = snap.docs[0].data() as { userId?: string };
          if (dono.userId) {
            try {
              const donoSnap = await getDoc(doc(db, 'usuarios', dono.userId));
              dupDe = (donoSnap.data()?.nome as string) || 'outro corretor';
            } catch { dupDe = 'outro corretor'; }
          } else dupDe = 'outro corretor';
          break;
        }
      }
      if (dupDe) {
        showToast(`Esse telefone já é lead de ${dupDe}.`, 'error');
        return;
      }

      const listaNome = listas.find(l => l.id === listaSel)?.nome || 'Lista';
      const anotacoesFinais = contatoSel === c.id ? anot : (c.anotacoes || '');
      const qualFinal = contatoSel === c.id ? qual : (c.qualificacao || {});
      const novoLead = await addDoc(collection(db, 'leads'), {
        userId: currentUser.uid,
        imobiliariaId: imobId,
        nome: c.nome || 'Contato da Ligação Ativa',
        telefone: c.telefone,
        whatsapp: digits,
        email: '',
        etapa: stages[0] ?? '',
        origem: `Ligação Ativa · ${listaNome}`,
        origemTipo: 'Ligação',
        createdAt: serverTimestamp(),
        tarefasPendentes: [],
        anotacoes: anotacoesFinais,
        qualificacao: qualFinal,
        automacao: { status: 'inativa', nomeTratamento: null, dataInicio: null, dataCancelamento: null },
      });
      await updateDoc(doc(db, 'ligacaoAtivaListas', listaSel, 'contatos', c.id), {
        status: 'crm',
        leadId: novoLead.id,
        incluidoEm: serverTimestamp(),
      });
      showToast(`${c.nome || 'Contato'} agora é lead no CRM! 🎉`, 'success');
      router.push(`/dashboard/crm/${novoLead.id}`);
    } catch (e) {
      console.error(e);
      showToast('Erro ao incluir no CRM. Tente de novo.', 'error');
    } finally {
      setIncluindo(null);
    }
  };

  // --- Roteiro: navegação ---
  const nodeById = useMemo(() => {
    const m: Record<string, FunilNode> = {};
    cfg.nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [cfg]);

  const listaAtiva = listas.find(l => l.id === listaSel) || null;
  const contatoAtivo = contatos.find(c => c.id === contatoSel) || null;
  const sessao: Sessao = {
    client: (contatoAtivo?.nome || '').split(' ')[0] || '[Nome]',
    corretor: (userData?.nome || '').split(' ')[0] || '[Seu nome]',
    lista: listaAtiva?.nome || '',
  };
  const node = nodeById[currentNode];
  const navegar = (target: string) => { if (!nodeById[target]) return; setHistory((h) => [...h, currentNode]); setCurrentNode(target); setMarcados({}); };
  const voltarNo = () => setHistory((h) => { if (!h.length) return h; setCurrentNode(h[h.length - 1]); return h.slice(0, -1); });
  const recomecar = () => { setCurrentNode(cfg.startNode); setHistory([]); setMarcados({}); };

  const contagens = useMemo(() => ({
    pendente: contatos.filter(c => c.status === 'pendente').length,
    crm: contatos.filter(c => c.status === 'crm').length,
    descartado: contatos.filter(c => c.status === 'descartado').length,
  }), [contatos]);
  const visiveis = contatos.filter(c => c.status === filtro);

  if (loadingCfg || loadingListas) return <div className="flex-1 flex items-center justify-center"><LoadingState label="Carregando…" /></div>;

  const msgPrincipal = node ? interpolar(textoDe(node), sessao) : '';
  const bancadaAberta = !!contatoAtivo;

  const acaoBtns = (c: Contato, compacto: boolean) => (
    <>
      <a
        href={`https://wa.me/55${(c.whatsapp || c.telefone || '').replace(/\D/g, '')}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        title="Chamar no WhatsApp"
        className={`${compacto ? 'px-2 py-1 text-[11px]' : 'flex-1 min-w-[120px] text-center px-3 py-2.5 text-[13px]'} rounded-lg font-bold bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 transition-colors`}
      >
        💬{compacto ? '' : ' Ligar / WhatsApp'}
      </a>
      {c.status !== 'crm' ? (
        <button
          onClick={e => { e.stopPropagation(); incluirNoCrm(c); }}
          disabled={incluindo === c.id}
          title="Atendeu e evoluiu? Vira lead no CRM"
          className={`${compacto ? 'px-2 py-1 text-[11px]' : 'flex-1 min-w-[140px] px-3 py-2.5 text-[13px]'} rounded-lg font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50`}
        >
          {incluindo === c.id ? '…' : compacto ? '✅' : '✅ Incluir no CRM'}
        </button>
      ) : c.leadId ? (
        <button
          onClick={e => { e.stopPropagation(); router.push(`/dashboard/crm/${c.leadId}`); }}
          className={`${compacto ? 'px-2 py-1 text-[11px]' : 'flex-1 min-w-[120px] px-3 py-2.5 text-[13px]'} rounded-lg font-bold bg-[#34D399]/10 border border-[#34D399]/40 text-[#34D399] hover:bg-[#34D399]/20 transition-colors`}
        >
          {compacto ? '↗' : 'Abrir no CRM →'}
        </button>
      ) : null}
      {c.status === 'descartado' ? (
        <button
          onClick={e => { e.stopPropagation(); restaurar(c); }}
          title="Voltar pra lista"
          className={`${compacto ? 'px-2 py-1 text-[11px]' : 'px-3 py-2.5 text-[13px]'} rounded-lg font-bold bg-[#7DD3FC]/10 border border-[#7DD3FC]/40 text-[#7DD3FC] hover:bg-[#7DD3FC]/20 transition-colors`}
        >
          ↩{compacto ? '' : ' Voltar pra lista'}
        </button>
      ) : c.status === 'pendente' ? (
        <button
          onClick={e => { e.stopPropagation(); descartar(c); }}
          title="Descartar (sai da lista)"
          className={`${compacto ? 'px-2 py-1 text-[11px]' : 'px-3 py-2.5 text-[13px]'} rounded-lg font-bold bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20 transition-colors`}
        >
          🗑{compacto ? '' : ' Descartar'}
        </button>
      ) : null}
    </>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 p-1 sm:p-2">
      {/* ===== Cabeçalho: a lista (de onde veio) + filtros ===== */}
      <div className="al-card relative overflow-hidden px-4 py-2.5 shrink-0">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="gx-tag shrink-0"><span>Ligação ativa</span></span>
            <h1 className="al-display text-[17px] font-extrabold text-white uppercase tracking-wide leading-none truncate">
              {listaAtiva ? listaAtiva.nome : 'Sem lista fria por enquanto'}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            {listas.length > 1 && listas.map(l => (
              <button
                key={l.id}
                onClick={() => { setListaSel(l.id); setContatoSel(null); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                  l.id === listaSel
                    ? 'bg-[#E8C547]/12 border-[#E8C547]/60 text-[#FFE9A6]'
                    : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08]'
                }`}
              >
                {l.nome}
              </button>
            ))}
            {listaAtiva && FILTROS.map(f => (
              <button
                key={f.key}
                onClick={() => { setFiltro(f.key); setContatoSel(null); }}
                className={`px-2.5 py-1 text-[11px] font-semibold border rounded-lg transition-colors ${
                  filtro === f.key
                    ? 'bg-[#FF1E56]/15 border-[#FF3364]/60 text-[#FF9EB5] shadow-[0_0_12px_-2px_rgba(255,30,86,0.4)]'
                    : 'border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08]'
                }`}
              >
                {f.label} <span className="tabular-nums opacity-70">({contagens[f.key]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== EXCELZÃO — protagonista, largura toda ===== */}
      <div className={`al-card relative overflow-hidden shrink-0 flex flex-col min-h-[150px] ${bancadaAberta ? 'xl:h-[34%]' : 'xl:flex-1'}`}>
        <div className="absolute inset-x-0 top-0 gx-line" />
        {!listaAtiva ? (
          <div className="flex-1 grid place-items-center p-8 text-center">
            <div className="space-y-1.5">
              <p className="text-[15px] text-white font-semibold">Nenhuma lista fria por aqui ainda.</p>
              <p className="text-sm text-text-secondary">O admin sobe as listas em <b className="text-white">Área do Administrador → Importar Lista de Ligação</b>.</p>
            </div>
          </div>
        ) : visiveis.length === 0 ? (
          <div className="flex-1 grid place-items-center p-8">
            <p className="text-sm text-text-secondary">
              {filtro === 'pendente' ? '🏁 Lista zerada — todo mundo ligado! Escolhe outra lista ou pede mais uma pro admin.' : 'Nada por aqui.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[#14121c] z-10">
                <tr className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-text-secondary border-b border-white/[0.08]">
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Telefone</th>
                  <th className="px-3 py-2 text-right w-[190px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {visiveis.map((c, idx) => {
                  const ativo = contatoSel === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => (ativo ? setContatoSel(null) : selecionar(c))}
                      className={`cursor-pointer transition-colors ${ativo ? 'bg-[#E8C547]/[0.08]' : 'hover:bg-white/[0.03]'}`}
                    >
                      <td className={`px-3 py-2 text-[11px] tabular-nums ${ativo ? 'text-[#FFE9A6] font-bold' : 'text-white/30'}`}>{idx + 1}</td>
                      <td className="px-3 py-2 text-[13.5px] font-semibold text-white">
                        <span className={ativo ? 'text-[#FFE9A6]' : ''}>{c.nome || <span className="text-white/40 italic font-normal">Sem nome</span>}</span>
                      </td>
                      <td className="px-3 py-2 text-[13px] text-text-secondary tabular-nums">{c.telefone}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">{acaoBtns(c, true)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== BANCADA — abre ao selecionar: roteiro + ficha do contato ===== */}
      {bancadaAberta && contatoAtivo && (
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-2.5">
          {/* Roteiro único da ligação */}
          <div className="al-card relative overflow-hidden p-4 min-h-0 flex flex-col">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex items-center justify-between gap-2 mb-2.5 shrink-0">
              <span className="gx-tag"><span>O caminho da ligação</span></span>
              <div className="flex items-center gap-1.5">
                <button onClick={voltarNo} disabled={!history.length} className="px-2 py-1 rounded-lg text-[11px] font-bold border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors disabled:opacity-40">← etapa</button>
                <button onClick={recomecar} className="px-2 py-1 rounded-lg text-[11px] font-bold border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary transition-colors">↺ recomeçar</button>
              </div>
            </div>
            {node && (
              <div className="space-y-3 flex-1 min-h-0 xl:overflow-y-auto xl:pr-1.5">
                <div>
                  {node.eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FF7A97] mb-1">{node.eyebrow}</p>}
                  <h2 className="al-display text-[19px] font-extrabold text-white leading-tight">{node.titulo}</h2>
                  {node.descricao && <p className="text-[13px] text-text-secondary leading-relaxed mt-1.5">{node.descricao}</p>}
                </div>
                {node.passos && node.passos.length > 0 && (
                  <div className="space-y-2.5">
                    {node.passos.map((p: FunilPasso, i) => (
                      <MensagemCard key={i} titulo={p.titulo} audio={p.audio} texto={interpolar(textoDe(p), sessao)} />
                    ))}
                  </div>
                )}
                {msgPrincipal && <MensagemCard audio={node.audio} texto={msgPrincipal} />}
                {node.infoNote && (
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5 text-[12.5px] text-sky-100 leading-relaxed">💡 {node.infoNote}</div>
                )}
                {node.checklist && node.checklist.length > 0 && (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 space-y-2">
                    {node.checklist.map((item, i) => {
                      const k = `${node.id}:${i}`;
                      return (
                        <label key={i} className="flex items-start gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={!!marcados[k]} onChange={(e) => setMarcados((m) => ({ ...m, [k]: e.target.checked }))} className="mt-0.5 w-4 h-4 rounded border-[#FF1E56] text-[#FF1E56] focus:ring-[#FF1E56] shrink-0" />
                          <span className={`text-[13px] ${marcados[k] ? 'text-text-secondary line-through' : 'text-white'}`}>{item}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {node.choices && node.choices.length > 0 && (
                  <div>
                    {node.pergunta && <p className="text-[13px] font-bold text-white mb-2">{node.pergunta}</p>}
                    <div className="grid gap-2">
                      {node.choices.map((c, i) => (
                        <button key={i} onClick={() => navegar(c.target)} className={`text-left px-3.5 py-2.5 rounded-xl border transition-all hover:-translate-y-0.5 active:scale-[0.98] ${corEscolha(c.label)}`}>
                          <div className="text-[13px] font-semibold text-white">{c.icon ? `${c.icon}  ` : ''}{c.label}</div>
                          {c.desc && <div className="text-[11.5px] text-text-secondary mt-0.5">{c.desc}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ficha do contato: ações + anotações + qualificação */}
          <div className="al-card relative overflow-hidden p-4 min-h-0 flex flex-col">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
              <div className="min-w-0">
                <p className="al-display text-[17px] font-extrabold text-white leading-tight truncate">{contatoAtivo.nome || 'Sem nome'}</p>
                <p className="text-[12.5px] text-text-secondary tabular-nums">{contatoAtivo.telefone}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity ${saveInfo === 'idle' ? 'opacity-0' : 'opacity-100'} ${saveInfo === 'salvo' ? 'text-emerald-300' : 'text-text-secondary'}`}>
                  {saveInfo === 'salvando' ? 'salvando…' : 'salvo ✓'}
                </span>
                <button onClick={() => setContatoSel(null)} className="px-2 py-1 rounded-md text-[13px] text-white/40 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/15 transition-colors" title="Fechar a ficha">✕</button>
              </div>
            </div>

            <div className="flex-1 min-h-0 xl:overflow-y-auto xl:pr-1.5 space-y-3.5">
              <div className="flex flex-wrap gap-2">{acaoBtns(contatoAtivo, false)}</div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Anotações da ligação</p>
                <textarea
                  value={anot}
                  onChange={e => onAnot(e.target.value)}
                  rows={3}
                  placeholder={isEspelhoDemo ? 'Modo demonstração — nada é salvo.' : 'O que rolou na ligação? Sobe junto quando virar lead.'}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg p-2.5 text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40 resize-y"
                />
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Qualificação (sobe junto pro CRM)</p>
                <div className="space-y-2">
                  {QUALIFICATION_QUESTIONS.map(g => (
                    <div key={g.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p className="shrink-0 w-[86px] text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-white/35 leading-tight">{g.title}</p>
                      <div className="flex-1 min-w-[180px] flex flex-wrap gap-1">
                        {g.options.map(op => {
                          const ativo = Array.isArray(qual[g.key]) && qual[g.key].includes(op);
                          return (
                            <button
                              key={op}
                              onClick={() => onQual(g.key, op)}
                              className={`px-2 py-1 text-[11px] font-medium border rounded-md transition-all ${
                                ativo
                                  ? 'bg-[#9F6BFF]/15 border-[#9F6BFF]/60 text-[#C4A6FF]'
                                  : 'bg-white/[0.04] border-white/10 text-white/55 hover:bg-white/[0.08]'
                              }`}
                            >
                              {op}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sem contato selecionado: dica curta embaixo */}
      {!bancadaAberta && listaAtiva && visiveis.length > 0 && (
        <p className="shrink-0 text-center text-[12px] text-text-secondary py-1">
          Clica num contato pra abrir o roteiro da ligação e a ficha dele aqui embaixo. 👇
        </p>
      )}
    </div>
  );
}
