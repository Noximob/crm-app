'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { FUNIL_DEFAULT } from '@/lib/funil/default';
import type { FunilConfig, FunilNode, FunilPasso } from '@/lib/funil/types';

interface Sessao { client: string; corretor: string; product: string; goal: string; }

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
function textoDe(x: { mensagem?: string; mensagensPorProduto?: Record<string, string> }, product: string): string {
  if (x.mensagensPorProduto) return x.mensagensPorProduto[product] || x.mensagensPorProduto['nao_sei'] || '';
  return x.mensagem || '';
}

function MensagemCard({ titulo, texto, audio }: { titulo?: string; texto: string; audio?: boolean }) {
  if (!texto) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#20202a] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
      {titulo && (
        <div className="px-4 py-2.5 bg-black/25 border-b border-white/10 flex items-center gap-2">
          {audio && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/40 text-purple-100 shrink-0">🎙 ÁUDIO</span>}
          <span className="text-[13px] font-semibold text-amber-200">{titulo}</span>
        </div>
      )}
      <div className="p-4">
        {!titulo && audio && <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/40 text-purple-100">🎙 grave lendo o texto</span>}
        <p className="text-[15.5px] text-white whitespace-pre-line leading-[1.8]">{texto}</p>
      </div>
    </div>
  );
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

  const sessao: Sessao = { client, corretor, product, goal };
  const node = nodeById[currentNode];
  const prodLabel = produtoLabel(cfg, product);

  const iniciar = () => { if (!product) return; setCurrentNode(cfg.startNode); setHistory([]); setIniciado(true); setSetupOpen(false); };
  const navegar = (target: string) => { if (!nodeById[target]) return; setHistory((h) => [...h, currentNode]); setCurrentNode(target); setMarcados({}); window.scrollTo?.({ top: 0 }); };
  const voltar = () => setHistory((h) => { if (!h.length) return h; setCurrentNode(h[h.length - 1]); return h.slice(0, -1); });
  const recomecar = () => { setCurrentNode(cfg.startNode); setHistory([]); setMarcados({}); };

  const produtoNome = cfg.produtos.find((p) => p.key === product)?.label || '—';

  if (loading) return <div className="flex-1 flex items-center justify-center text-text-secondary">Carregando…</div>;

  // ---------- SETUP ----------
  if (!iniciado || setupOpen) {
    const optBtn = (ativo: boolean) => `px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${ativo ? 'bg-amber-500 text-black border-amber-500' : 'border-white/15 text-white/85 hover:bg-white/5'}`;
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Ligação Ativa</h1>
            <p className="text-[15px] text-text-secondary mt-1">Seu roteiro pra conduzir a ligação. Preencha o lead e siga o passo a passo.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Nome do cliente</label>
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Ex: João da Silva" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-[15px] text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">Seu nome</label>
              <input value={corretor} onChange={(e) => setCorretor(e.target.value)} placeholder="Ex: Marcos" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-[15px] text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">Sobre qual imóvel/empreendimento é a ligação?</label>
            <div className="flex flex-wrap gap-2">{cfg.produtos.map((p) => <button key={p.key} onClick={() => setProduct(p.key)} className={optBtn(product === p.key)}>{p.label}</button>)}</div>
          </div>
          <button onClick={iniciar} disabled={!product} className="w-full px-4 py-3 rounded-xl bg-amber-500 text-black font-bold text-[15px] hover:bg-amber-400 disabled:opacity-50">
            {iniciado ? 'Salvar' : 'Começar atendimento →'}
          </button>
        </div>
      </div>
    );
  }

  if (!node) return <div className="flex-1 flex items-center justify-center text-red-400">Etapa não encontrada.</div>;
  const msgPrincipal = interpolar(textoDe(node, product), sessao, prodLabel);

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
      {/* Lead + ações */}
      <aside className="lg:w-60 shrink-0 flex flex-col gap-2 lg:sticky lg:top-0 self-start">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Lead</span>
            <button onClick={() => setSetupOpen(true)} className="text-[11px] text-text-secondary hover:text-white">editar ✎</button>
          </div>
          <p className="text-[15px] font-bold text-white leading-tight">{client || '(sem nome)'}</p>
          <p className="text-xs text-text-secondary mt-0.5">Corretor: {corretor || '—'}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-200">{produtoNome}</span>
          </div>
        </div>
        <button onClick={voltar} disabled={!history.length} className="px-3 py-2.5 rounded-xl text-sm font-semibold border border-white/15 text-white/85 hover:bg-white/5 disabled:opacity-40">← Voltar uma etapa</button>
        <button onClick={recomecar} className="px-3 py-2.5 rounded-xl text-sm font-semibold border border-white/15 text-text-secondary hover:bg-white/5">↺ Recomeçar</button>
      </aside>

      {/* Conteúdo */}
      <section className="flex-1 min-w-0">
        <div className="max-w-2xl mx-auto space-y-5">
          <div>
            {node.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300 mb-1.5">{node.eyebrow}</p>}
            <h2 className="text-[26px] font-extrabold text-white leading-tight">{node.titulo}</h2>
            {node.descricao && <p className="text-[15px] text-text-secondary leading-relaxed mt-2">{node.descricao}</p>}
          </div>

          {/* Passos (vários trechos na mesma página) */}
          {node.passos && node.passos.length > 0 && (
            <div className="space-y-3">
              {node.passos.map((p: FunilPasso, i) => (
                <MensagemCard key={i} titulo={p.titulo} audio={p.audio} texto={interpolar(textoDe(p, product), sessao, prodLabel)} />
              ))}
            </div>
          )}

          {/* Mensagem única */}
          {msgPrincipal && <MensagemCard audio={node.audio} texto={msgPrincipal} />}

          {node.infoNote && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-[13px] text-sky-100 leading-relaxed">💡 {node.infoNote}</div>
          )}

          {node.checklist && node.checklist.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
              {node.checklist.map((item, i) => {
                const k = `${node.id}:${i}`;
                return (
                  <label key={i} className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!marcados[k]} onChange={(e) => setMarcados((m) => ({ ...m, [k]: e.target.checked }))} className="mt-0.5 w-5 h-5 rounded border-amber-500 text-amber-500 focus:ring-amber-500 shrink-0" />
                    <span className={`text-[15px] ${marcados[k] ? 'text-text-secondary line-through' : 'text-white'}`}>{item}</span>
                  </label>
                );
              })}
            </div>
          )}

          {node.choices && node.choices.length > 0 && (
            <div className="pt-1">
              {node.pergunta && <p className="text-[15px] font-bold text-white mb-2.5">{node.pergunta}</p>}
              <div className="grid sm:grid-cols-2 gap-2.5">
                {node.choices.map((c, i) => (
                  <button key={i} onClick={() => navegar(c.target)} className="text-left px-4 py-3 rounded-xl border border-white/12 bg-white/[0.03] hover:bg-white/[0.08] hover:border-amber-500/50 transition-colors">
                    <div className="text-[15px] font-semibold text-white">{c.icon ? `${c.icon}  ` : ''}{c.label}</div>
                    {c.desc && <div className="text-xs text-text-secondary mt-0.5">{c.desc}</div>}
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
