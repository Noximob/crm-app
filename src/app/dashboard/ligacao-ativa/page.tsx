'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { FUNIL_DEFAULT } from '@/lib/funil/default';
import type { FunilConfig, FunilNode } from '@/lib/funil/types';

interface Sessao {
  client: string;
  corretor: string;
  product: string;
  goal: string;
  currentNode: string;
  history: string[];
}

function produtoLabel(cfg: FunilConfig, key: string): string {
  if (key === 'nao_sei') return 'imóveis aqui no Litoral';
  return cfg.produtos.find((p) => p.key === key)?.label || '[Produto]';
}
function interpolar(txt: string, s: Sessao, prodLabel: string): string {
  return (txt || '')
    .replace(/\[Nome\]/g, s.client || '[Nome]')
    .replace(/\[Seu nome\]/g, s.corretor || '[Seu nome]')
    .replace(/\[Produto\]/g, prodLabel);
}
function msgDoNo(n: FunilNode, product: string): string {
  if (n.mensagensPorProduto) return n.mensagensPorProduto[product] || n.mensagensPorProduto['nao_sei'] || '';
  return n.mensagem || '';
}

export default function LigacaoAtivaPage() {
  const { userData } = useAuth();
  const [cfg, setCfg] = useState<FunilConfig>(FUNIL_DEFAULT);
  const [loading, setLoading] = useState(true);

  const [iniciado, setIniciado] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [client, setClient] = useState('');
  const [corretor, setCorretor] = useState('');
  const [product, setProduct] = useState('');
  const [goal, setGoal] = useState('');
  const [currentNode, setCurrentNode] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (userData?.imobiliariaId) {
          const snap = await getDoc(doc(db, 'configLigacaoAtiva', userData.imobiliariaId));
          const data = snap.exists() ? (snap.data() as { config?: FunilConfig }) : null;
          if (data?.config?.nodes?.length) { setCfg(data.config); return; }
        }
      } catch { /* usa o padrão */ }
      setCfg(FUNIL_DEFAULT);
    })().finally(() => setLoading(false));
  }, [userData?.imobiliariaId]);

  const nodeById = useMemo(() => {
    const m: Record<string, FunilNode> = {};
    cfg.nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [cfg]);

  const sessao: Sessao = { client, corretor, product, goal, currentNode, history };
  const node = nodeById[currentNode];
  const prodLabel = produtoLabel(cfg, product);

  const iniciar = () => {
    if (!product || !goal) return;
    setCurrentNode(cfg.startNode);
    setHistory([]);
    setIniciado(true);
    setSetupOpen(false);
  };
  const navegar = (target: string) => {
    if (!nodeById[target]) return;
    setHistory((h) => [...h, currentNode]);
    setCurrentNode(target);
  };
  const voltar = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setCurrentNode(prev);
      return h.slice(0, -1);
    });
  };
  const recomecar = () => { setCurrentNode(cfg.startNode); setHistory([]); setMarcados({}); };
  const clienteRespondeu = () => navegar('hub_replied');

  const copiar = async (texto: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch { /* noop */ }
  };

  const objetivoLabel = cfg.objetivos.find((o) => o.key === goal)?.label || '—';
  const produtoNome = cfg.produtos.find((p) => p.key === product)?.label || '—';

  if (loading) return <div className="flex-1 flex items-center justify-center text-text-secondary">Carregando…</div>;

  // ---- Setup ----
  if (!iniciado || setupOpen) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Ligação Ativa</h1>
            <p className="text-sm text-text-secondary">Mapa mental pra conduzir a ligação. Preencha o lead e siga o roteiro.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Nome do cliente</label>
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Ex: João da Silva" className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Seu nome</label>
              <input value={corretor} onChange={(e) => setCorretor(e.target.value)} placeholder="Ex: Marcos" className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Produto *</label>
            <div className="flex flex-wrap gap-2">
              {cfg.produtos.map((p) => (
                <button key={p.key} onClick={() => setProduct(p.key)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${product === p.key ? 'bg-amber-500 text-black border-amber-500' : 'border-white/15 text-white/80 hover:bg-white/5'}`}>{p.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Objetivo *</label>
            <div className="flex flex-wrap gap-2">
              {cfg.objetivos.map((o) => (
                <button key={o.key} onClick={() => setGoal(o.key)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${goal === o.key ? 'bg-amber-500 text-black border-amber-500' : 'border-white/15 text-white/80 hover:bg-white/5'}`}>{o.label}</button>
              ))}
            </div>
          </div>
          <button onClick={iniciar} disabled={!product || !goal} className="w-full px-4 py-2.5 rounded-lg bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-50">
            {iniciado ? 'Salvar' : 'Começar atendimento'}
          </button>
        </div>
      </div>
    );
  }

  if (!node) return <div className="flex-1 flex items-center justify-center text-red-400">Nó não encontrado.</div>;

  const msg = interpolar(msgDoNo(node, product), sessao, prodLabel);

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
      {/* Painel do lead + ações */}
      <aside className="lg:w-64 shrink-0 flex flex-col gap-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wide text-amber-300">Lead</span>
            <button onClick={() => setSetupOpen(true)} className="text-[11px] text-text-secondary hover:text-white">editar ✎</button>
          </div>
          <p className="text-sm font-semibold text-white">{client || '(sem nome)'}</p>
          <p className="text-[11px] text-text-secondary">Corretor: {corretor || '—'}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white">{produtoNome}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white">{objetivoLabel}</span>
          </div>
        </div>
        <button onClick={voltar} disabled={!history.length} className="px-3 py-2 rounded-lg text-sm font-semibold border border-white/15 text-white/80 hover:bg-white/5 disabled:opacity-40">← Voltar</button>
        <button onClick={clienteRespondeu} className="px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-500/90 text-white hover:bg-emerald-500">💬 Cliente respondeu</button>
        <button onClick={recomecar} className="px-3 py-2 rounded-lg text-sm font-semibold border border-white/15 text-text-secondary hover:bg-white/5">↺ Recomeçar</button>
      </aside>

      {/* Conteúdo do nó */}
      <section className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          {node.eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-amber-300">{node.eyebrow}</p>}
          <h2 className="text-2xl font-bold text-white leading-tight">{node.titulo}</h2>
          {node.descricao && <p className="text-sm text-text-secondary leading-relaxed">{node.descricao}</p>}

          {msg && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              {node.audio && <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200">🎙 Áudio — grave lendo o texto</span>}
              <p className="text-sm text-white whitespace-pre-line leading-relaxed">{msg}</p>
              <button onClick={() => copiar(msg)} className="mt-3 px-3 py-1.5 rounded-md text-xs font-bold bg-amber-500 text-black hover:bg-amber-400">{copiado ? 'Copiado! ✓' : '📋 Copiar mensagem'}</button>
            </div>
          )}

          {node.infoNote && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">{node.infoNote}</div>
          )}

          {node.checklist && node.checklist.length > 0 && (
            <div className="space-y-1.5">
              {node.checklist.map((item, i) => {
                const k = `${node.id}:${i}`;
                return (
                  <label key={i} className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!marcados[k]} onChange={(e) => setMarcados((m) => ({ ...m, [k]: e.target.checked }))} className="mt-0.5 w-4 h-4 rounded border-amber-500 text-amber-500 focus:ring-amber-500" />
                    <span className={`text-sm ${marcados[k] ? 'text-text-secondary line-through' : 'text-white'}`}>{item}</span>
                  </label>
                );
              })}
            </div>
          )}

          {node.choices && node.choices.length > 0 && (
            <div>
              {node.pergunta && <p className="text-sm font-bold text-white mb-2">{node.pergunta}</p>}
              <div className="grid sm:grid-cols-2 gap-2">
                {node.choices.map((c, i) => (
                  <button key={i} onClick={() => navegar(c.target)} className="text-left px-3 py-2.5 rounded-lg border border-white/12 bg-white/[0.03] hover:bg-white/[0.07] hover:border-amber-500/40 transition-colors">
                    <div className="text-sm font-semibold text-white">{c.icon ? `${c.icon} ` : ''}{c.label}</div>
                    {c.desc && <div className="text-[11px] text-text-secondary mt-0.5">{c.desc}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
