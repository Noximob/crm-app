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

/** Cor do chip de resultado pelo significado do rótulo (apenas visual) */
function corEscolha(label: string): string {
  const l = (label || '').toLowerCase();
  if (/(topou|marcou|aceita|voltar a marcar|confirmad)/.test(l))
    return 'border-[#34D399]/35 bg-[#34D399]/[0.06] hover:border-[#34D399]/60 hover:bg-[#34D399]/[0.12]';
  if (/(não|nao\b|desconfi|encerrar)/.test(l))
    return 'border-[#FF1E56]/35 bg-[#FF1E56]/[0.06] hover:border-[#FF1E56]/60 hover:bg-[#FF1E56]/[0.12]';
  if (/(sem tempo|pensar|pesquisando|retorno|whatsapp)/.test(l))
    return 'border-[#E8C547]/35 bg-[#E8C547]/[0.06] hover:border-[#E8C547]/60 hover:bg-[#E8C547]/[0.12]';
  return 'border-white/[0.08] bg-white/[0.03] hover:border-[#FF1E56]/45 hover:bg-white/[0.07]';
}

function MensagemCard({ titulo, texto, audio }: { titulo?: string; texto: string; audio?: boolean }) {
  if (!texto) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      {titulo && (
        <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.08] flex items-center gap-2">
          {audio && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#9F6BFF]/10 border border-[#9F6BFF]/35 text-[#C4A6FF] shrink-0">🎙 ÁUDIO</span>}
          <span className="text-[13px] font-semibold text-[#FF9EB5]">{titulo}</span>
        </div>
      )}
      <div className="p-4">
        {!titulo && audio && <span className="inline-flex items-center mb-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#9F6BFF]/10 border border-[#9F6BFF]/35 text-[#C4A6FF]">🎙 grave lendo o texto</span>}
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
    const optBtn = (ativo: boolean) => `px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${ativo ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white border-transparent shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]' : 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'}`;
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg al-card relative overflow-hidden p-6 space-y-6">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div>
            <h1 className="al-display text-2xl font-extrabold text-white uppercase tracking-[0.08em]">Ligação Ativa</h1>
            <p className="text-[15px] text-text-secondary mt-1">Seu roteiro pra conduzir a ligação. Preencha o lead e siga o passo a passo.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Nome do cliente</label>
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Ex: João da Silva" className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-[15px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Seu nome</label>
              <input value={corretor} onChange={(e) => setCorretor(e.target.value)} placeholder="Ex: Marcos" className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-[15px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Sobre qual imóvel/empreendimento é a ligação?</label>
            <div className="flex flex-wrap gap-2">{cfg.produtos.map((p) => <button key={p.key} onClick={() => setProduct(p.key)} className={optBtn(product === p.key)}>{p.label}</button>)}</div>
          </div>
          <button onClick={iniciar} disabled={!product} className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold text-[15px] shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50">
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
        <div className="al-card relative overflow-hidden p-4">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex items-center justify-between mb-2">
            <span className="gx-tag"><span>Lead</span></span>
            <button onClick={() => setSetupOpen(true)} className="text-[11px] text-text-secondary hover:text-[#FF5C7E] transition-colors">editar ✎</button>
          </div>
          <p className="al-display text-xl font-extrabold text-white leading-tight">{client || '(sem nome)'}</p>
          <p className="text-xs text-text-secondary mt-0.5">Corretor: {corretor || '—'}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#FF1E56]/10 border border-[#FF1E56]/35 text-[#FF9EB5]">{produtoNome}</span>
          </div>
        </div>
        <button onClick={voltar} disabled={!history.length} className="px-3 py-2.5 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white transition-colors disabled:opacity-40">← Voltar uma etapa</button>
        <button onClick={recomecar} className="px-3 py-2.5 rounded-xl text-sm font-semibold border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary transition-colors">↺ Recomeçar</button>
      </aside>

      {/* Conteúdo */}
      <section className="flex-1 min-w-0">
        <div className="max-w-2xl mx-auto al-card relative overflow-hidden p-5 sm:p-6 space-y-5">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div>
            {node.eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FF7A97] mb-1.5">{node.eyebrow}</p>}
            <h2 className="al-display text-[26px] font-extrabold text-white leading-tight">{node.titulo}</h2>
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
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2.5">
              {node.checklist.map((item, i) => {
                const k = `${node.id}:${i}`;
                return (
                  <label key={i} className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={!!marcados[k]} onChange={(e) => setMarcados((m) => ({ ...m, [k]: e.target.checked }))} className="mt-0.5 w-5 h-5 rounded border-[#FF1E56] text-[#FF1E56] focus:ring-[#FF1E56] shrink-0" />
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
                  <button key={i} onClick={() => navegar(c.target)} className={`text-left px-4 py-3 rounded-xl border transition-all hover:-translate-y-0.5 active:scale-[0.98] ${corEscolha(c.label)}`}>
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
