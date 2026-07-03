'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { apoioDb } from '@/lib/apoioFirebase';
import { CATEGORIES, catByKey, type Construtora, type Imovel, type Material } from '@/lib/materiais/types';
import { toCdn, youtubeId, waLink, encaminharWhatsApp } from '@/lib/materiais/toCdn';

function matsOf(p: Imovel, key: string): Material[] {
  return (p.materiais || []).filter((m) => m.cat === key);
}
function coverImg(p: Imovel): string | null {
  if (p.capa) return toCdn(p.capa);
  const m = (p.materiais || []).find((x) => x.cat === 'imagens' || catByKey(x.cat)?.kind === 'image');
  return m ? toCdn(m.url) : null;
}

interface LightboxState {
  imgs: { url: string; name: string }[];
  idx: number;
}

export default function MateriaisPage() {
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [filtroCo, setFiltroCo] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('resumo');
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [snapC, snapI] = await Promise.all([
          getDocs(collection(apoioDb, 'construtoras')),
          getDocs(collection(apoioDb, 'imoveis')),
        ]);
        const cs = snapC.docs.map((d) => ({ id: d.id, ...d.data() }) as Construtora).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        const is = snapI.docs.map((d) => ({ id: d.id, ...d.data() }) as Imovel).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        setConstrutoras(cs);
        setImoveis(is);
      } catch (e) {
        setErro('Não foi possível carregar os materiais.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const corCo = useMemo(() => {
    const map: Record<string, string> = {};
    construtoras.forEach((c) => (map[c.name] = c.color || '#D4A017'));
    return map;
  }, [construtoras]);

  const listaFiltrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return imoveis.filter((p) => {
      if (filtroCo && p.co !== filtroCo) return false;
      if (!q) return true;
      return `${p.n} ${p.cid || ''} ${p.co}`.toLowerCase().includes(q);
    });
  }, [imoveis, filtroCo, busca]);

  const sel = useMemo(() => imoveis.find((p) => p.id === selId) || null, [imoveis, selId]);

  useEffect(() => {
    if (!sel && listaFiltrada.length) setSelId(listaFiltrada[0].id);
  }, [listaFiltrada, sel]);

  const abas = useMemo(() => {
    if (!sel) return [] as { key: string; label: string }[];
    const arr: { key: string; label: string }[] = [{ key: 'resumo', label: 'Resumo' }];
    CATEGORIES.forEach((c) => {
      if (matsOf(sel, c.key).length) arr.push({ key: c.key, label: c.label });
    });
    if (sel.end || sel.cid) arr.push({ key: 'local', label: 'Localização' });
    return arr;
  }, [sel]);

  useEffect(() => {
    if (abas.length && !abas.some((a) => a.key === tab)) setTab(abas[0].key);
  }, [abas, tab]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-white">Materiais de apoio</h1>
        <p className="text-sm text-text-secondary">Catálogos, apresentações e mídias das construtoras parceiras.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary">Carregando materiais…</div>
      ) : erro ? (
        <div className="flex-1 flex items-center justify-center text-red-400">{erro}</div>
      ) : imoveis.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary">Nenhum imóvel cadastrado ainda.</div>
      ) : (
        <div className="flex-1 min-h-0 flex gap-3">
          <aside className="w-64 shrink-0 flex flex-col rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="p-3 border-b border-white/10 space-y-2">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar imóvel…"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFiltroCo('')}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${!filtroCo ? 'bg-amber-500 text-black' : 'bg-white/[0.06] text-text-secondary'}`}
                >
                  Todas
                </button>
                {construtoras.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFiltroCo(c.name)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${filtroCo === c.name ? 'text-black' : 'text-text-secondary bg-white/[0.06]'}`}
                    style={filtroCo === c.name ? { background: c.color || '#D4A017' } : undefined}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
              {listaFiltrada.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelId(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selId === p.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: corCo[p.co] || '#D4A017' }} />
                    <span className="text-sm font-semibold text-white truncate">{p.n}</span>
                  </div>
                  <div className="text-[11px] text-text-secondary truncate pl-4">{p.co}{p.cid ? ` · ${p.cid}` : ''}</div>
                </button>
              ))}
              {listaFiltrada.length === 0 && <p className="text-xs text-text-secondary text-center py-6">Nada encontrado.</p>}
            </div>
          </aside>

          <section className="flex-1 min-w-0 flex flex-col rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            {!sel ? (
              <div className="flex-1 flex items-center justify-center text-text-secondary">Selecione um imóvel.</div>
            ) : (
              <>
                <div className="relative shrink-0 h-40 bg-[#181818]">
                  {coverImg(sel) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImg(sel)!} alt={sel.n} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-black" style={{ background: corCo[sel.co] || '#D4A017' }}>{sel.co}</span>
                      {sel.st && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white">{sel.st}</span>}
                    </div>
                    <h2 className="text-xl font-bold text-white leading-tight">{sel.n}</h2>
                    {(sel.cid || sel.end) && <p className="text-xs text-white/70">{[sel.end, sel.cid].filter(Boolean).join(' · ')}</p>}
                  </div>
                </div>

                <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 border-b border-white/10 text-center">
                  {([['Torres', sel.t], ['Andares', sel.a], ['Aptos', sel.ap], ['Entrega', sel.e]] as [string, string | undefined][])
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-white/[0.03] py-1.5">
                        <div className="text-sm font-bold text-white">{v}</div>
                        <div className="text-[10px] uppercase tracking-wide text-text-secondary">{k}</div>
                      </div>
                    ))}
                </div>

                <div className="shrink-0 flex gap-1 px-3 pt-2 overflow-x-auto scrollbar-thin border-b border-white/10">
                  {abas.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => setTab(a.key)}
                      className={`px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${tab === a.key ? 'border-amber-500 text-white' : 'border-transparent text-text-secondary hover:text-white'}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                  <TabConteudo imovel={sel} tab={tab} onLightbox={setLightbox} />
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {lightbox && <Lightbox state={lightbox} onClose={() => setLightbox(null)} onNav={(i) => setLightbox({ ...lightbox, idx: i })} />}
    </div>
  );
}

function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 mb-3">{children}</div>;
}
function BtnWhats({ url, text, asFile }: { url: string; text: string; asFile: boolean }) {
  return (
    <button
      onClick={() => encaminharWhatsApp(url, text, asFile)}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/10"
    >
      Encaminhar
    </button>
  );
}
function BtnDownload({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-sky-300 border border-sky-500/40 hover:bg-sky-500/10">
      Baixar
    </a>
  );
}

function TabConteudo({ imovel, tab, onLightbox }: { imovel: Imovel; tab: string; onLightbox: (s: LightboxState) => void }) {
  if (tab === 'resumo') {
    return (
      <div className="space-y-4">
        {(imovel.pr || imovel.m2) && (
          <div className="flex gap-3">
            {imovel.pr && <div className="rounded-lg bg-white/[0.03] px-3 py-2"><div className="text-[10px] text-text-secondary uppercase">A partir de</div><div className="text-lg font-bold text-white">R$ {imovel.pr}</div></div>}
            {imovel.m2 && <div className="rounded-lg bg-white/[0.03] px-3 py-2"><div className="text-[10px] text-text-secondary uppercase">Valor m²</div><div className="text-lg font-bold text-white">R$ {imovel.m2}</div></div>}
          </div>
        )}
        {imovel.resumo && <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">{imovel.resumo}</p>}
        {imovel.tip && imovel.tip.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-white mb-2">Tipologias</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {imovel.tip.map((t, i) => (
                <div key={i} className="rounded-lg bg-white/[0.03] px-3 py-2 flex items-baseline gap-2">
                  <span className="text-sm font-bold text-amber-300">{t[0]} m²</span>
                  <span className="text-xs text-text-secondary">{t[1]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {imovel.dif && imovel.dif.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-white mb-2">Diferenciais</h3>
            <div className="flex flex-wrap gap-1.5">
              {imovel.dif.map((d, i) => (
                <span key={i} className="px-2 py-1 rounded-full text-xs bg-white/[0.05] text-text-secondary border border-white/10">{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tab === 'local') {
    const q = encodeURIComponent([imovel.end, imovel.cid].filter(Boolean).join(', '));
    return (
      <div className="rounded-xl overflow-hidden border border-white/10 h-[380px]">
        <iframe title="Mapa" className="w-full h-full" src={`https://www.google.com/maps?q=${q}&output=embed`} />
      </div>
    );
  }

  const cat = catByKey(tab);
  const mats = matsOf(imovel, tab);
  if (!cat || mats.length === 0) return <p className="text-sm text-text-secondary">Nenhum material em “{cat?.label || tab}”.</p>;

  if (cat.kind === 'pdf') {
    const m = mats[0];
    const url = toCdn(m.url);
    return (
      <div>
        <Toolbar>
          <span className="text-sm font-semibold text-white mr-auto">{m.name || cat.label}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 rounded-md border border-white/15 text-white/80 hover:bg-white/5">Tela cheia</a>
          <BtnWhats url={url} text={`${imovel.n} — ${m.name || cat.label}\n${url}`} asFile />
          <BtnDownload url={url} />
        </Toolbar>
        <div className="rounded-xl overflow-hidden border border-white/10 h-[560px] bg-white">
          <iframe src={`${url}#view=FitH`} title={m.name || 'PDF'} className="w-full h-full" />
        </div>
      </div>
    );
  }

  if (cat.kind === 'video') {
    const m = mats[0];
    const url = toCdn(m.url);
    const yt = youtubeId(m.url);
    const fileUrl = m.dl && m.dl.trim() ? toCdn(m.dl) : yt ? null : url;
    return (
      <div>
        <Toolbar>
          <span className="text-sm font-semibold text-white mr-auto">{m.name || cat.label}</span>
          {fileUrl ? <BtnWhats url={fileUrl} text={`${imovel.n} — ${m.name || cat.label}`} asFile /> : yt ? <BtnWhats url={`https://youtu.be/${yt}`} text={`${imovel.n} — ${m.name || cat.label}\nhttps://youtu.be/${yt}`} asFile={false} /> : null}
          {fileUrl && <BtnDownload url={fileUrl} />}
        </Toolbar>
        <div className="rounded-xl overflow-hidden border border-white/10 aspect-video bg-black">
          {yt ? (
            <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1&playsinline=1`} allow="autoplay; fullscreen; encrypted-media" allowFullScreen title="Vídeo" />
          ) : (
            <video src={url} controls playsInline preload="metadata" className="w-full h-full" />
          )}
        </div>
      </div>
    );
  }

  if (cat.kind === 'image') {
    const imgs = mats.map((m) => ({ url: toCdn(m.url), name: imovel.n + (m.name ? ` — ${m.name}` : '') }));
    return (
      <div>
        <p className="text-xs text-text-secondary mb-2">{cat.label} · {imgs.length} {imgs.length === 1 ? 'item' : 'itens'} — toque para ampliar, baixar ou encaminhar</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {imgs.map((im, k) => (
            <button key={k} onClick={() => onLightbox({ imgs, idx: k })} className="aspect-[4/3] rounded-lg overflow-hidden border border-white/10 bg-white/[0.03]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={im.name} loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (cat.kind === 'link') {
    const m = mats[0];
    return (
      <div className="max-w-md mx-auto text-center rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="text-base font-bold text-white mb-1">{m.name || cat.label}</div>
        <p className="text-sm text-text-secondary mb-4">Abre em nova aba para você apresentar valores e disponibilidade.</p>
        <a href={m.url.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400">
          Abrir {cat.label.toLowerCase()}
        </a>
      </div>
    );
  }

  if (cat.kind === 'linklist') {
    return (
      <div className="space-y-2">
        {mats.map((m, i) => {
          const url = m.url.trim();
          return (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{m.name || url}</div>
                <div className="text-[11px] text-text-secondary truncate">{url}</div>
              </div>
              <a href={waLink(`${imovel.n} — ${m.name || 'link'}\n${url}`)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded-md text-xs text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/10">WhatsApp</a>
              <a href={url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded-md text-xs text-white/80 border border-white/15 hover:bg-white/5">Abrir</a>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

function Lightbox({ state, onClose, onNav }: { state: LightboxState; onClose: () => void; onNav: (i: number) => void }) {
  const { imgs, idx } = state;
  const cur = imgs[idx];
  const prev = () => onNav((idx - 1 + imgs.length) % imgs.length);
  const next = () => onNav((idx + 1) % imgs.length);
  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => encaminharWhatsApp(cur.url, cur.name, true)} className="px-3 py-1.5 rounded-md text-sm font-semibold text-emerald-300 border border-emerald-500/50 bg-black/40 hover:bg-emerald-500/10">Encaminhar</button>
        <a href={cur.url} target="_blank" rel="noopener noreferrer" download className="px-3 py-1.5 rounded-md text-sm font-semibold text-sky-300 border border-sky-500/50 bg-black/40 hover:bg-sky-500/10">Baixar</a>
        <button onClick={onClose} className="px-3 py-1.5 rounded-md text-sm font-semibold text-white border border-white/30 bg-black/40 hover:bg-white/10">Fechar</button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cur.url} alt={cur.name} className="max-w-full max-h-[82vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
      {imgs.length > 1 && (
        <div className="mt-3 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <button onClick={prev} className="px-3 py-1.5 rounded-md text-white border border-white/30 hover:bg-white/10">‹</button>
          <span className="text-sm text-white/70">{idx + 1} / {imgs.length}</span>
          <button onClick={next} className="px-3 py-1.5 rounded-md text-white border border-white/30 hover:bg-white/10">›</button>
        </div>
      )}
    </div>
  );
}
