'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { FUNIL_DEFAULT } from '@/lib/funil/default';
import type { FunilConfig, FunilNode, FunilChoice } from '@/lib/funil/types';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import LoadingState from '@/components/ui/LoadingState';

const INP = 'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white';
const SEL = 'px-2 py-1.5 rounded-lg bg-[#1e1e24] border border-white/10 text-sm text-white';
const OPT = 'bg-[#15151a] text-white';

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }
function slug(s: string) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'no'; }

export default function AdminLigacaoAtivaPage() {
  const { userData } = useAuth();
  const isAdmin = userData?.tipoConta === 'imobiliaria' || userData?.permissoes?.admin;
  const imobiliariaId = userData?.imobiliariaId;

  const [config, setConfig] = useState<FunilConfig>(() => clone(FUNIL_DEFAULT));
  const [selId, setSelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (imobiliariaId) {
          const snap = await getDoc(doc(db, 'configLigacaoAtiva', imobiliariaId));
          const data = snap.exists() ? (snap.data() as { config?: FunilConfig }) : null;
          if (data?.config?.nodes?.length) { setConfig(data.config); setSelId(data.config.startNode || data.config.nodes[0].id); return; }
        }
      } catch { /* usa padrão */ }
      setConfig(clone(FUNIL_DEFAULT));
      setSelId(FUNIL_DEFAULT.startNode);
    })().finally(() => setLoading(false));
  }, [imobiliariaId]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };
  const sel = useMemo(() => config.nodes.find((n) => n.id === selId) || null, [config, selId]);
  const nodeOpcoes = config.nodes.map((n) => ({ id: n.id, label: n.titulo || n.id }));

  const patchNode = (patch: Partial<FunilNode>) => setConfig((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === selId ? { ...n, ...patch } : n)) }));

  const novoPasso = () => {
    let id = `passo_${config.nodes.length + 1}`;
    while (config.nodes.some((n) => n.id === id)) id = `${id}_`;
    const novo: FunilNode = { id, titulo: 'Novo passo', eyebrow: '', descricao: '', mensagem: '', choices: [] };
    setConfig((c) => ({ ...c, nodes: [...c.nodes, novo] }));
    setSelId(id);
  };
  const excluirPasso = async (id: string) => {
    if (config.nodes.length <= 1) { flash('Precisa ter pelo menos um passo.'); return; }
    const apontam = config.nodes.filter((n) => n.id !== id && (n.choices || []).some((c) => c.target === id)).length;
    if (!(await confirmDialog({ message: `Excluir este passo?${apontam ? ` ${apontam} botão(ões) de outros passos apontam pra ele e serão removidos também.` : ''}`, danger: true, confirmLabel: 'Excluir' }))) return;
    setConfig((c) => {
      const nodes = c.nodes
        .filter((n) => n.id !== id)
        .map((n) => ({ ...n, choices: (n.choices || []).filter((ch) => ch.target !== id) }));
      return { ...c, nodes, startNode: c.startNode === id ? nodes[0].id : c.startNode };
    });
    setSelId((cur) => (cur === id ? config.nodes.find((n) => n.id !== id)?.id || '' : cur));
  };

  // choices
  const addChoice = () => patchNode({ choices: [...(sel?.choices || []), { label: 'Novo botão', target: config.nodes[0].id }] });
  const setChoice = (i: number, patch: Partial<FunilChoice>) => patchNode({ choices: (sel?.choices || []).map((c, k) => (k === i ? { ...c, ...patch } : c)) });
  const delChoice = (i: number) => patchNode({ choices: (sel?.choices || []).filter((_, k) => k !== i) });

  // checklist
  const addCheck = () => patchNode({ checklist: [...(sel?.checklist || []), ''] });
  const setCheck = (i: number, v: string) => patchNode({ checklist: (sel?.checklist || []).map((x, k) => (k === i ? v : x)) });
  const delCheck = (i: number) => patchNode({ checklist: (sel?.checklist || []).filter((_, k) => k !== i) });

  // produtos
  const setProdLabel = (i: number, label: string) => setConfig((c) => ({ ...c, produtos: c.produtos.map((p, k) => (k === i ? { key: p.key, label } : p)) }));
  const addProd = () => setConfig((c) => ({ ...c, produtos: [...c.produtos, { key: `p_${c.produtos.length + 1}`, label: 'Novo' }] }));
  const delProd = (i: number) => setConfig((c) => ({ ...c, produtos: c.produtos.filter((_, k) => k !== i) }));

  const salvar = async () => {
    if (!imobiliariaId) { flash('Sem imobiliária.'); return; }
    // normaliza keys de produto a partir do label (com dedupe: colisão ganha sufixo -2, -3, …)
    const keysUsadas = new Set<string>();
    const cfg: FunilConfig = {
      ...config,
      produtos: config.produtos.map((p) => {
        let key = p.key.startsWith('p_') ? slug(p.label) : p.key;
        if (keysUsadas.has(key)) {
          let n = 2;
          while (keysUsadas.has(`${key}-${n}`)) n++;
          key = `${key}-${n}`;
        }
        keysUsadas.add(key);
        return { key, label: p.label };
      }),
    };
    setSalvando(true);
    try {
      await setDoc(doc(db, 'configLigacaoAtiva', imobiliariaId), { config: cfg, updatedAt: serverTimestamp() });
      flash('Salvo! O corretor já vê a versão nova.');
    } catch (e: any) { flash('Erro ao salvar: ' + (e?.message || e)); }
    finally { setSalvando(false); }
  };
  const restaurar = async () => { if (await confirmDialog({ message: 'Restaurar o roteiro padrão? Você perde as edições não salvas.', confirmLabel: 'Restaurar' })) { setConfig(clone(FUNIL_DEFAULT)); setSelId(FUNIL_DEFAULT.startNode); } };

  if (!isAdmin) return <div className="p-8 text-center text-text-secondary">Você não tem permissão para acessar esta página.</div>;
  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingState label="Carregando…" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Ligação Ativa — editor do roteiro</h1>
          <p className="text-sm text-text-secondary">Edite as mensagens, adicione ou apague passos e ajuste pra onde cada botão leva. É o que o corretor vê na tela “Ligação Ativa”.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={restaurar} className="px-3 py-2 rounded-lg text-sm text-text-secondary border border-white/15 hover:bg-white/5">Restaurar padrão</button>
          <button onClick={salvar} disabled={salvando} className="px-5 py-2 rounded-lg bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-60">{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
      {msg && <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm">{msg}</div>}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
        {/* Lista de passos */}
        <aside className="lg:w-72 shrink-0 flex flex-col rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="p-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary px-1">Passos ({config.nodes.length})</span>
            <button onClick={novoPasso} className="px-2 py-1 rounded-md text-xs font-bold bg-amber-500 text-black hover:bg-amber-400">+ Novo</button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1 max-h-[60vh] lg:max-h-none">
            {config.nodes.map((n) => (
              <button key={n.id} onClick={() => setSelId(n.id)} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selId === n.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}>
                <div className="flex items-center gap-1.5">
                  {config.startNode === n.id && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-bold shrink-0">INÍCIO</span>}
                  <span className="text-sm font-semibold text-white truncate">{n.titulo || n.id}</span>
                </div>
                {n.eyebrow && <div className="text-[11px] text-text-secondary truncate pl-0.5">{n.eyebrow}</div>}
              </button>
            ))}
          </div>
          {/* Produtos + início */}
          <div className="p-3 border-t border-white/10 space-y-2">
            <div>
              <label className="block text-[11px] font-bold uppercase text-text-secondary mb-1">Passo inicial</label>
              <select value={config.startNode} onChange={(e) => setConfig((c) => ({ ...c, startNode: e.target.value }))} className={`${SEL} w-full`}>
                {nodeOpcoes.map((o) => <option key={o.id} value={o.id} className={OPT}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-text-secondary mb-1">Imóveis/produtos (setup)</label>
              <div className="space-y-1">
                {config.produtos.map((p, i) => (
                  <div key={i} className="flex gap-1">
                    <input value={p.label} onChange={(e) => setProdLabel(i, e.target.value)} className="flex-1 px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs text-white" />
                    <button onClick={() => delProd(i)} className="px-1.5 text-red-400 hover:text-red-300 text-xs">✕</button>
                  </div>
                ))}
                <button onClick={addProd} className="text-[11px] px-2 py-1 rounded-md bg-white/10 text-white hover:bg-white/15">+ produto</button>
              </div>
            </div>
          </div>
        </aside>

        {/* Editor do passo */}
        <section className="flex-1 min-w-0 overflow-y-auto scrollbar-thin rounded-xl border border-white/10 bg-white/[0.02] p-4">
          {!sel ? (
            <p className="text-text-secondary text-center py-10">Selecione um passo à esquerda.</p>
          ) : (
            <div className="space-y-4 max-w-2xl">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Rótulo da etapa <span className="opacity-60">(ex.: “Fechamento”)</span></label>
                  <input value={sel.eyebrow || ''} onChange={(e) => patchNode({ eyebrow: e.target.value })} className={INP} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Título do passo</label>
                  <input value={sel.titulo} onChange={(e) => patchNode({ titulo: e.target.value })} className={INP} />
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Orientação ao corretor <span className="opacity-60">(o guia, aparece antes da mensagem)</span></label>
                <textarea value={sel.descricao || ''} onChange={(e) => patchNode({ descricao: e.target.value })} rows={2} className={INP} />
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1">Mensagem / roteiro <span className="opacity-60">(o que o corretor fala — use [Nome], [Seu nome], [Produto], [dia], [Horário])</span></label>
                <textarea value={sel.mensagem || ''} onChange={(e) => patchNode({ mensagem: e.target.value })} rows={5} className={INP} />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Pergunta acima dos botões <span className="opacity-60">(opcional)</span></label>
                  <input value={sel.pergunta || ''} onChange={(e) => patchNode({ pergunta: e.target.value })} placeholder="Ex.: Como o cliente reagiu?" className={INP} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Nota destacada 💡 <span className="opacity-60">(opcional)</span></label>
                  <input value={sel.infoNote || ''} onChange={(e) => patchNode({ infoNote: e.target.value })} className={INP} />
                </div>
              </div>

              {/* Checklist */}
              <div className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-text-secondary">Checklist <span className="opacity-60 normal-case font-normal">(itens pra marcar — opcional)</span></span>
                  <button onClick={addCheck} className="text-xs px-2 py-1 rounded-md bg-white/10 text-white hover:bg-white/15">+ item</button>
                </div>
                <div className="space-y-1.5">
                  {(sel.checklist || []).map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={item} onChange={(e) => setCheck(i, e.target.value)} className={INP} />
                      <button onClick={() => delCheck(i)} className="px-2 text-red-400 hover:text-red-300">✕</button>
                    </div>
                  ))}
                  {!(sel.checklist || []).length && <p className="text-xs text-text-secondary">Sem checklist.</p>}
                </div>
              </div>

              {/* Botões (choices) */}
              <div className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-text-secondary">Botões <span className="opacity-60 normal-case font-normal">(cada botão leva a outro passo)</span></span>
                  <button onClick={addChoice} className="text-xs px-2 py-1 rounded-md bg-white/10 text-white hover:bg-white/15">+ botão</button>
                </div>
                <div className="space-y-2">
                  {(sel.choices || []).map((c, i) => (
                    <div key={i} className="rounded-lg bg-white/[0.03] p-2 space-y-1.5">
                      <div className="flex gap-1.5">
                        <input value={c.icon || ''} onChange={(e) => setChoice(i, { icon: e.target.value })} placeholder="🙂" className="w-12 text-center px-1 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-sm text-white" />
                        <input value={c.label} onChange={(e) => setChoice(i, { label: e.target.value })} placeholder="Texto do botão" className="flex-1 px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-sm text-white" />
                        <button onClick={() => delChoice(i)} className="px-2 text-red-400 hover:text-red-300">✕</button>
                      </div>
                      <input value={c.desc || ''} onChange={(e) => setChoice(i, { desc: e.target.value })} placeholder="Descrição pequena (opcional)" className="w-full px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-xs text-white" />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-text-secondary shrink-0">vai para →</span>
                        <select value={c.target} onChange={(e) => setChoice(i, { target: e.target.value })} className={`${SEL} flex-1`}>
                          {nodeOpcoes.map((o) => <option key={o.id} value={o.id} className={OPT}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                  {!(sel.choices || []).length && <p className="text-xs text-text-secondary">Sem botões (passo final).</p>}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setConfig((c) => ({ ...c, startNode: sel.id }))} disabled={config.startNode === sel.id} className="text-xs px-3 py-1.5 rounded-md border border-white/15 text-white/80 hover:bg-white/5 disabled:opacity-40">Definir como passo inicial</button>
                <button onClick={() => excluirPasso(sel.id)} className="text-xs px-3 py-1.5 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10">Excluir este passo</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
