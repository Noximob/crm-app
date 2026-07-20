'use client';

/**
 * Ligação Ativa — o cockpit da lista fria.
 *
 * EXCELZÃO em tela cheia. Contato aberto → faixa fina com o nome + bancada:
 * ações em cima, ANOTAÇÕES à esquerda (com o REGISTRO do que já foi feito
 * embaixo — tentativas, descarte, CRM…), QUALIFICAÇÃO à direita. O roteiro
 * virou um botão "📜 Roteiro" que abre por cima, só pra quem quiser ver.
 * Cada ação grava um evento no contato — é esse histórico que o admin vê no
 * bolsão pra decidir quem redistribuir.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDoc, arrayUnion, collection, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch,
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

export interface EventoContato {
  tipo: 'tentativa' | 'descartado' | 'restaurado' | 'crm' | 'realocado';
  detalhe?: string;
  em: any; // Timestamp
  /** Quem fez — o histórico real do cliente carrega a autoria */
  por?: string;
}

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  whatsapp?: string;
  status: 'pendente' | 'descartado' | 'crm' | 'realocado';
  anotacoes?: string;
  qualificacao?: Record<string, any>;
  ordem?: number;
  leadId?: string;
  tentativas?: number;
  descartadoMotivo?: string;
  eventos?: EventoContato[];
}

interface Sessao { client: string; corretor: string; lista: string; }

/** Motivos de descarte da lista fria (vão pro bolsão do admin). */
const MOTIVOS_FRIA = ['Não atende', 'Não quer', 'Número errado', 'Sem perfil', 'Outro'] as const;

const EVENTO_VISUAL: Record<EventoContato['tipo'], { icone: string; rotulo: (d?: string, por?: string) => string; cor: string }> = {
  tentativa: { icone: '💬', rotulo: (_d, por) => `Tentativa de contato${por ? ` (${por.split(' ')[0]})` : ''}`, cor: 'text-[#FFE9A6]' },
  descartado: { icone: '🗑', rotulo: (d, por) => `Descartado${por ? ` por ${por.split(' ')[0]}` : ''}${d ? ` — ${d}` : ''}`, cor: 'text-red-300' },
  restaurado: { icone: '↩', rotulo: (_d, por) => `Voltou pra lista${por ? ` (${por.split(' ')[0]})` : ''}`, cor: 'text-[#7DD3FC]' },
  crm: { icone: '✅', rotulo: (_d, por) => `Virou lead no CRM${por ? ` por ${por.split(' ')[0]}` : ''}`, cor: 'text-emerald-300' },
  realocado: { icone: '🔄', rotulo: (d, por) => `Realocado${d ? ` pra ${d}` : ''}${por ? ` (${por.split(' ')[0]})` : ''}`, cor: 'text-[#C4A6FF]' },
};

const p2 = (n: number) => String(n).padStart(2, '0');
const fmtEvento = (em: any) => {
  const d = em?.toDate ? em.toDate() : em?.seconds ? new Date(em.seconds * 1000) : null;
  return d ? `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}` : '—';
};

// ---------------------------------------------------------------------------
// Helpers do roteiro (script ÚNICO)
// ---------------------------------------------------------------------------
function interpolar(txt: string, s: Sessao): string {
  return (txt || '')
    .replace(/\[Nome\]/g, s.client || '[Nome]')
    .replace(/\[Seu nome\]/g, s.corretor || '[Seu nome]')
    .replace(/\[Lista\]/g, s.lista || 'nosso cadastro')
    .replace(/\[Produto\]/g, 'imóveis aqui no Litoral');
}
function textoDe(x: { mensagem?: string; mensagensPorProduto?: Record<string, string> }): string {
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
const demoTs = (hAtras: number) => Timestamp.fromMillis(Date.now() - hAtras * 3600_000);
const DEMO_LISTA: Lista = { id: 'demo-lista', nome: 'Feirão Litoral — Stand Barra Velha', total: 8 };
const DEMO_CONTATOS: Contato[] = [
  { id: 'dc1', nome: 'Rafael Nogueira', telefone: '(47) 99911-2233', status: 'pendente', anotacoes: '', qualificacao: {}, tentativas: 0, eventos: [] },
  { id: 'dc2', nome: 'Camila Duarte', telefone: '(47) 98822-3344', status: 'pendente', anotacoes: 'Pediu pra ligar depois das 18h.', qualificacao: { finalidade: ['Investimento'] }, tentativas: 2, eventos: [
    { tipo: 'tentativa', em: demoTs(50) }, { tipo: 'tentativa', em: demoTs(26) },
  ] },
  { id: 'dc3', nome: '', telefone: '(47) 97733-4455', status: 'pendente', anotacoes: '', qualificacao: {}, tentativas: 1, eventos: [{ tipo: 'tentativa', em: demoTs(30) }] },
  { id: 'dc4', nome: 'Sérgio Prado', telefone: '(47) 96644-5566', status: 'crm', leadId: 'demo-lead-1', anotacoes: 'Atendeu, quer 2 quartos na Barra.', qualificacao: { quartos: ['2 quartos'], localizacao: ['Barra Velha'] }, tentativas: 1, eventos: [
    { tipo: 'tentativa', em: demoTs(75) }, { tipo: 'crm', em: demoTs(73) },
  ] },
  { id: 'dc5', nome: 'Vera Lúcia', telefone: '(47) 95555-6677', status: 'descartado', anotacoes: '', qualificacao: {}, tentativas: 3, descartadoMotivo: 'Número errado', eventos: [
    { tipo: 'tentativa', em: demoTs(120) }, { tipo: 'tentativa', em: demoTs(96) }, { tipo: 'tentativa', em: demoTs(80) }, { tipo: 'descartado', detalhe: 'Número errado', em: demoTs(79) },
  ] },
  { id: 'dc6', nome: 'Tiago Melo', telefone: '(47) 94466-7788', status: 'pendente', anotacoes: '', qualificacao: {}, tentativas: 0, eventos: [] },
  { id: 'dc7', nome: 'Patrícia Reis', telefone: '(47) 93377-8899', status: 'pendente', anotacoes: '', qualificacao: {}, tentativas: 0, eventos: [] },
  { id: 'dc8', nome: 'Gilmar Souza', telefone: '(47) 92288-9900', status: 'descartado', anotacoes: '', qualificacao: {}, tentativas: 4, descartadoMotivo: 'Não atende', eventos: [
    { tipo: 'tentativa', em: demoTs(200) }, { tipo: 'tentativa', em: demoTs(170) }, { tipo: 'tentativa', em: demoTs(150) }, { tipo: 'tentativa', em: demoTs(122) }, { tipo: 'descartado', detalhe: 'Não atende', em: demoTs(120) },
  ] },
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

  // --- Roteiro (único, agora em modal) ---
  const [cfg, setCfg] = useState<FunilConfig>(FUNIL_DEFAULT);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [roteiroAberto, setRoteiroAberto] = useState(false);
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
  const [descartando, setDescartando] = useState(false);
  const [motivoSel, setMotivoSel] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');

  const [anot, setAnot] = useState('');
  const [qual, setQual] = useState<Record<string, string[]>>({});
  const [saveInfo, setSaveInfo] = useState<'idle' | 'salvando' | 'salvo'>('idle');
  const anotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [demoLocal, setDemoLocal] = useState<Record<string, { tentativas: number; eventos: EventoContato[] }>>({});

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

  // --- Seleção ---
  const selecionar = (c: Contato) => {
    setContatoSel(c.id);
    setAnot(c.anotacoes || '');
    const q0: Record<string, string[]> = {};
    Object.entries(c.qualificacao || {}).forEach(([k, v]) => { q0[k] = Array.isArray(v) ? v : [v as string]; });
    setQual(q0);
    setSaveInfo('idle');
    setDescartando(false);
    setMotivoSel('');
    setMotivoOutro('');
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

  // --- Ações (cada uma grava um EVENTO no contato — o histórico do bolsão) ---
  const tentativasDe = (c: Contato) => (demoLocal[c.id]?.tentativas ?? c.tentativas ?? 0);
  const eventosDe = (c: Contato): EventoContato[] => {
    const extra = demoLocal[c.id]?.eventos || [];
    return [...(c.eventos || []), ...extra];
  };

  const registrarTentativa = (c: Contato) => {
    if (isEspelhoDemo) {
      setDemoLocal(t => ({
        ...t,
        [c.id]: {
          tentativas: (t[c.id]?.tentativas ?? c.tentativas ?? 0) + 1,
          eventos: [...(t[c.id]?.eventos || []), { tipo: 'tentativa', em: Timestamp.now(), por: userData?.nome || '' }],
        },
      }));
      return;
    }
    if (!listaSel) return;
    updateDoc(doc(db, 'ligacaoAtivaListas', listaSel, 'contatos', c.id), {
      tentativas: (c.tentativas || 0) + 1,
      ultimaTentativaEm: serverTimestamp(),
      eventos: arrayUnion({ tipo: 'tentativa', em: Timestamp.now(), por: userData?.nome || '' }),
    }).catch(() => {});
  };

  const confirmarDescarte = (c: Contato) => {
    const motivo = motivoSel === 'Outro' ? motivoOutro.trim() : motivoSel;
    if (!motivo) return;
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    if (!listaSel) return;
    updateDoc(doc(db, 'ligacaoAtivaListas', listaSel, 'contatos', c.id), {
      status: 'descartado',
      descartadoMotivo: motivo,
      descartadoEm: serverTimestamp(),
      eventos: arrayUnion({ tipo: 'descartado', detalhe: motivo, em: Timestamp.now(), por: userData?.nome || '' }),
    }).catch(() => {});
    showToast(`${c.nome || 'Contato'} descartado (${motivo}) — foi pro bolsão do admin.`, 'info');
    setContatoSel(null);
    setDescartando(false);
  };

  const restaurar = (c: Contato) => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    if (!listaSel) return;
    updateDoc(doc(db, 'ligacaoAtivaListas', listaSel, 'contatos', c.id), {
      status: 'pendente',
      eventos: arrayUnion({ tipo: 'restaurado', em: Timestamp.now(), por: userData?.nome || '' }),
    }).catch(() => {});
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
        eventos: arrayUnion({ tipo: 'crm', em: Timestamp.now(), por: userData?.nome || '' }),
      });

      // O REGISTRO viaja junto: cada evento da lista fria vira interação no
      // lead (com a data original), entrando na linha do tempo do CRM.
      try {
        const interCol = collection(db, 'leads', novoLead.id, 'interactions');
        const batchInter = writeBatch(db);
        const evs = eventosDe(c).slice(-20);
        evs.forEach(ev => {
          const v = EVENTO_VISUAL[ev.tipo];
          batchInter.set(doc(interCol), {
            type: ev.tipo === 'tentativa' ? 'WhatsApp' : ev.tipo === 'descartado' ? 'Descarte' : 'Outros',
            notes: `☎️ Lista fria · ${v ? v.rotulo(ev.detalhe, ev.por) : ev.tipo}`,
            timestamp: ev.em?.toDate ? ev.em : Timestamp.now(),
            circuito: true,
          });
        });
        const tent = tentativasDe(c);
        batchInter.set(doc(interCol), {
          type: 'Ligação',
          notes: `☎️ Veio da Ligação Ativa · ${listaNome}${tent > 0 ? ` · atendeu na ${tent + 1}ª tentativa` : ''}`,
          timestamp: serverTimestamp(),
          circuito: true,
        });
        await batchInter.commit();
      } catch { /* histórico é bônus — não trava a inclusão */ }

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

  const irProximo = () => {
    if (!contatoAtivo) return;
    const lista = visiveis.length ? visiveis : contatos.filter(c => c.status === 'pendente');
    if (!lista.length) { setContatoSel(null); return; }
    const i = lista.findIndex(c => c.id === contatoAtivo.id);
    const prox = lista[(i + 1) % lista.length];
    if (prox && prox.id !== contatoAtivo.id) selecionar(prox);
  };

  if (loadingCfg || loadingListas) return <div className="flex-1 flex items-center justify-center"><LoadingState label="Carregando…" /></div>;

  const msgPrincipal = node ? interpolar(textoDe(node), sessao) : '';
  const bancadaAberta = !!contatoAtivo;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 p-1 sm:p-2">

      {/* ===== EXCELZÃO (fechado) ou FAIXA DO CONTATO (aberto) ===== */}
      {!bancadaAberta ? (
        <div className="al-card relative overflow-hidden flex-1 min-h-[150px] flex flex-col">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-white/[0.06]">
            {listas.length > 1 ? listas.map(l => (
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
            )) : listaAtiva ? (
              <span className="al-display text-[13px] font-extrabold text-[#FFE9A6] uppercase tracking-wide truncate">{listaAtiva.nome}</span>
            ) : null}
            <span className="ml-auto flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setRoteiroAberto(true)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-[#9F6BFF]/40 bg-[#9F6BFF]/10 text-[#C4A6FF] hover:bg-[#9F6BFF]/20 transition-colors"
              >
                📜 Roteiro
              </button>
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
            </span>
          </div>

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
                    <th className="px-3 py-2 w-[110px]">Tentativas</th>
                    <th className="px-3 py-2 text-right w-[70px]">Whats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {visiveis.map((c, idx) => {
                    const t = tentativasDe(c);
                    return (
                      <tr key={c.id} onClick={() => selecionar(c)} className="cursor-pointer transition-colors hover:bg-white/[0.03]">
                        <td className="px-3 py-2 text-[11px] tabular-nums text-white/30">{idx + 1}</td>
                        <td className="px-3 py-2 text-[13.5px] font-semibold text-white">
                          {c.nome || <span className="text-white/40 italic font-normal">Sem nome</span>}
                          {c.status === 'descartado' && c.descartadoMotivo && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-white/[0.05] border border-white/15 text-text-secondary">{c.descartadoMotivo}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[13px] text-text-secondary tabular-nums">{c.telefone}</td>
                        <td className="px-3 py-2">
                          {t > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6] tabular-nums">💬 {t}×</span>
                          ) : (
                            <span className="text-[11px] text-white/25">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <a
                            href={`https://wa.me/55${(c.whatsapp || c.telefone || '').replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => { e.stopPropagation(); registrarTentativa(c); }}
                            title="Chamar no WhatsApp (conta como tentativa)"
                            className="inline-flex px-2.5 py-1 rounded-lg text-[12px] font-bold bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                          >
                            💬
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="al-card relative overflow-hidden px-3.5 py-2.5 shrink-0">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setContatoSel(null)}
              className="shrink-0 px-2.5 py-1.5 rounded-lg text-[12px] font-bold border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors"
            >
              ← Lista
            </button>
            <div className="min-w-0 flex items-baseline gap-3">
              <p className="al-display text-[19px] font-extrabold text-white leading-none truncate">{contatoAtivo!.nome || 'Sem nome'}</p>
              <p className="text-[13px] text-text-secondary tabular-nums shrink-0">{contatoAtivo!.telefone}</p>
              {tentativasDe(contatoAtivo!) > 0 && (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6] tabular-nums">💬 {tentativasDe(contatoAtivo!)}×</span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity ${saveInfo === 'idle' ? 'opacity-0' : 'opacity-100'} ${saveInfo === 'salvo' ? 'text-emerald-300' : 'text-text-secondary'}`}>
                {saveInfo === 'salvando' ? 'salvando…' : 'salvo ✓'}
              </span>
              <button
                onClick={() => setRoteiroAberto(true)}
                className="px-2.5 py-1.5 rounded-lg text-[12px] font-bold border border-[#9F6BFF]/40 bg-[#9F6BFF]/10 text-[#C4A6FF] hover:bg-[#9F6BFF]/20 transition-colors"
              >
                📜 Roteiro
              </button>
              <button
                onClick={irProximo}
                className="px-2.5 py-1.5 rounded-lg text-[12px] font-bold border border-[#E8C547]/40 bg-[#E8C547]/10 text-[#FFE9A6] hover:bg-[#E8C547]/20 transition-colors"
              >
                Próximo →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== BANCADA — ações + anotações/registro (esq) e qualificação (dir) ===== */}
      {bancadaAberta && contatoAtivo && (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5">
          {/* Ações do contato */}
          <div className="al-card relative overflow-hidden p-3 shrink-0">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/55${(contatoAtivo.whatsapp || contatoAtivo.telefone || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => registrarTentativa(contatoAtivo)}
                className="flex-1 min-w-[150px] text-center px-3 py-2.5 rounded-xl text-[13px] font-bold bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              >
                💬 Chamar no WhatsApp{tentativasDe(contatoAtivo) > 0 ? ` · ${tentativasDe(contatoAtivo)}×` : ''}
              </a>
              {contatoAtivo.status !== 'crm' ? (
                <button
                  onClick={() => incluirNoCrm(contatoAtivo)}
                  disabled={incluindo === contatoAtivo.id}
                  className="flex-1 min-w-[150px] px-3 py-2.5 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {incluindo === contatoAtivo.id ? 'Incluindo…' : '✅ Incluir no CRM'}
                </button>
              ) : contatoAtivo.leadId ? (
                <button
                  onClick={() => router.push(`/dashboard/crm/${contatoAtivo.leadId}`)}
                  className="flex-1 min-w-[130px] px-3 py-2.5 rounded-xl text-[13px] font-bold bg-[#34D399]/10 border border-[#34D399]/40 text-[#34D399] hover:bg-[#34D399]/20 transition-colors"
                >
                  Abrir no CRM →
                </button>
              ) : null}
              {contatoAtivo.status === 'descartado' ? (
                <button
                  onClick={() => restaurar(contatoAtivo)}
                  className="px-3 py-2.5 rounded-xl text-[13px] font-bold bg-[#7DD3FC]/10 border border-[#7DD3FC]/40 text-[#7DD3FC] hover:bg-[#7DD3FC]/20 transition-colors"
                >
                  ↩ Voltar pra lista
                </button>
              ) : contatoAtivo.status === 'pendente' ? (
                <button
                  onClick={() => setDescartando(d => !d)}
                  className="px-3 py-2.5 rounded-xl text-[13px] font-bold bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20 transition-colors"
                >
                  🗑 Descartar
                </button>
              ) : null}
            </div>

            {descartando && contatoAtivo.status === 'pendente' && (
              <div className="mt-2.5 rounded-xl border border-red-500/35 bg-red-500/[0.06] p-3 space-y-2">
                <p className="text-[12px] text-red-200 font-semibold">Por que descartar? (vai pro bolsão do admin, que pode repassar a outro corretor)</p>
                <div className="flex flex-wrap gap-1.5">
                  {MOTIVOS_FRIA.map(m => (
                    <button
                      key={m}
                      onClick={() => setMotivoSel(m)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                        motivoSel === m
                          ? 'bg-red-500/15 border-red-500/60 text-red-200'
                          : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                  {motivoSel === 'Outro' && (
                    <input
                      value={motivoOutro}
                      onChange={e => setMotivoOutro(e.target.value)}
                      placeholder="Qual o motivo?"
                      className="flex-1 min-w-[160px] px-3 py-1 bg-white/[0.04] border border-white/10 rounded-lg text-white text-[12px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    />
                  )}
                  <button
                    onClick={() => confirmarDescarte(contatoAtivo)}
                    disabled={!motivoSel || (motivoSel === 'Outro' && !motivoOutro.trim())}
                    className="px-3 py-1 rounded-lg text-[12px] font-bold bg-red-500/15 border border-red-500/50 text-red-200 hover:bg-red-500/25 transition-colors disabled:opacity-40"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Esquerda: anotações + registro · Direita: qualificação */}
          <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-2.5">
            <div className="al-card relative overflow-hidden p-4 min-h-0 flex flex-col gap-3">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <div className="shrink-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Anotações da ligação</p>
                <textarea
                  value={anot}
                  onChange={e => onAnot(e.target.value)}
                  rows={4}
                  placeholder={isEspelhoDemo ? 'Modo demonstração — nada é salvo.' : 'O que rolou na ligação? Sobe junto quando virar lead.'}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg p-2.5 text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40 resize-y"
                />
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <p className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Registro do contato</p>
                {eventosDe(contatoAtivo).length === 0 ? (
                  <p className="text-[12.5px] text-white/35">Nada registrado ainda — cada WhatsApp, descarte ou inclusão no CRM aparece aqui.</p>
                ) : (
                  <ul className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
                    {[...eventosDe(contatoAtivo)].reverse().map((ev, i) => {
                      const v = EVENTO_VISUAL[ev.tipo] || EVENTO_VISUAL.tentativa;
                      return (
                        <li key={i} className="flex items-center gap-2 text-[12.5px]">
                          <span className="shrink-0 text-white/30 tabular-nums text-[11px] w-[86px]">{fmtEvento(ev.em)}</span>
                          <span className="shrink-0">{v.icone}</span>
                          <span className={`min-w-0 truncate ${v.cor}`}>{v.rotulo(ev.detalhe, ev.por)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="al-card relative overflow-hidden p-4 min-h-0 flex flex-col">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <p className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Qualificação (sobe junto pro CRM)</p>
              <div className="flex-1 min-h-0 xl:overflow-y-auto xl:pr-1.5 space-y-2.5">
                {QUALIFICATION_QUESTIONS.map(g => (
                  <div key={g.key}>
                    <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-white/35 mb-1">{g.title}</p>
                    <div className="flex flex-wrap gap-1">
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
      )}

      {/* ===== ROTEIRO — modal por cima (só pra quem quiser ver) ===== */}
      {roteiroAberto && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm overflow-y-auto" onClick={() => setRoteiroAberto(false)}>
          <div className="min-h-full flex items-start justify-center p-3 sm:p-6">
            <div
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl mt-6 bg-[#14121c] border border-[#9F6BFF]/40 rounded-2xl overflow-hidden shadow-[0_0_44px_-10px_rgba(159,107,255,0.35),0_24px_80px_-24px_rgba(0,0,0,0.9)]"
            >
              <div className="h-[2px] w-full bg-gradient-to-r from-[#9F6BFF] via-[#9F6BFF]/40 to-transparent" />
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/10">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#C4A6FF]">📜 O caminho da ligação</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <button onClick={voltarNo} disabled={!history.length} className="px-2 py-1 rounded-lg text-[11px] font-bold border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors disabled:opacity-40">← etapa</button>
                  <button onClick={recomecar} className="px-2 py-1 rounded-lg text-[11px] font-bold border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary transition-colors">↺</button>
                  <button onClick={() => setRoteiroAberto(false)} className="px-2 py-1 rounded-md text-[13px] text-white/40 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/15 transition-colors">✕</button>
                </div>
              </div>
              <div className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
                {node && (
                  <>
                    <div>
                      {node.eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FF7A97] mb-1">{node.eyebrow}</p>}
                      <h2 className="al-display text-[20px] font-extrabold text-white leading-tight">{node.titulo}</h2>
                      {node.descricao && <p className="text-[13.5px] text-text-secondary leading-relaxed mt-1.5">{node.descricao}</p>}
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
                              <span className={`text-[13.5px] ${marcados[k] ? 'text-text-secondary line-through' : 'text-white'}`}>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {node.choices && node.choices.length > 0 && (
                      <div>
                        {node.pergunta && <p className="text-[13.5px] font-bold text-white mb-2">{node.pergunta}</p>}
                        <div className="grid sm:grid-cols-2 gap-2">
                          {node.choices.map((c, i) => (
                            <button key={i} onClick={() => navegar(c.target)} className={`text-left px-3.5 py-2.5 rounded-xl border transition-all hover:-translate-y-0.5 active:scale-[0.98] ${corEscolha(c.label)}`}>
                              <div className="text-[13.5px] font-semibold text-white">{c.icon ? `${c.icon}  ` : ''}{c.label}</div>
                              {c.desc && <div className="text-[11.5px] text-text-secondary mt-0.5">{c.desc}</div>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
