'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { apoioDb } from '@/lib/apoioFirebase';
import { CATEGORIES, catByKey, parseTip, type Construtora, type Imovel, type Material } from '@/lib/materiais/types';
import { toCdn, youtubeId, waLink, encaminharWhatsApp } from '@/lib/materiais/toCdn';
import PdfPager from '@/components/PdfPager';

function matsArr(p: Imovel): Material[] {
  return Array.isArray(p.materiais) ? p.materiais : [];
}
function matsOf(p: Imovel, key: string): Material[] {
  return matsArr(p).filter((m) => m && m.cat === key);
}

interface LightboxState {
  imgs: { url: string; name: string; label?: string }[];
  idx: number;
}

const WAIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
);

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
  const [menuAberto, setMenuAberto] = useState(false);

  // Modo apresentação (tela cheia do navegador — ideal pra compartilhar no Meet)
  const secRef = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else secRef.current?.requestFullscreen?.();
  };

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

  // Construtoras sem duplicatas (a base pode ter nomes repetidos)
  const construtorasView = useMemo(() => {
    const seen = new Set<string>();
    return construtoras.filter((c) => {
      const k = (c.name || '').trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
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
    if (!sel) return [] as { key: string; label: string; count?: number }[];
    const arr: { key: string; label: string; count?: number }[] = [{ key: 'resumo', label: 'Resumo' }];
    CATEGORIES.forEach((c) => {
      const n = matsOf(sel, c.key).length;
      if (n) arr.push({ key: c.key, label: c.label, count: c.kind === 'image' ? n : undefined });
    });
    // Localização: mostra se houver material de localização OU endereço cadastrado
    if (!arr.some((x) => x.key === 'localizacao') && (sel.end || sel.cid)) arr.push({ key: 'localizacao', label: 'Localização' });
    return arr;
  }, [sel]);

  useEffect(() => {
    if (abas.length && !abas.some((a) => a.key === tab)) setTab(abas[0].key);
  }, [abas, tab]);

  const temImoveis = !loading && !erro && imoveis.length > 0;

  const stats: [string, string][] = sel
    ? ([['Torres', sel.t], ['Andares', sel.a], ['Aptos', sel.ap], ['Entrega', sel.e], ['A partir de', sel.pr ? `R$ ${sel.pr}` : undefined], ['m²', sel.m2 ? `R$ ${sel.m2}` : undefined]] as [string, string | undefined][])
        .filter((x): x is [string, string] => Boolean(x[1]))
    : [];

  // Pílulas de abas (compact = barra única do modo apresentação)
  const pills = (compact: boolean) =>
    abas.map((a) => (
      <button
        key={a.key}
        onClick={() => setTab(a.key)}
        className={`${compact ? 'px-3 py-1.5 text-[13px]' : 'px-3.5 py-2 text-sm'} rounded-lg font-bold whitespace-nowrap transition-colors ${tab === a.key ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_0_14px_rgba(255,30,86,0.35)]' : 'bg-white/[0.05] text-text-secondary hover:text-white hover:bg-white/[0.09]'}`}
      >
        {a.label}
        {a.count ? <span className={`ml-1.5 text-[10px] font-extrabold ${tab === a.key ? 'text-white/70' : 'text-text-secondary'}`}>{a.count}</span> : null}
      </button>
    ));

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Cabeçalho + seletor de empreendimento */}
      <div className="relative shrink-0 mb-3 z-30">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="al-display text-2xl font-bold text-white uppercase tracking-[0.08em]">Materiais de apoio</h1>
            <p className="text-sm text-text-secondary">Abra, apresente no Meet e encaminhe pro cliente no WhatsApp.</p>
          </div>
          {temImoveis && (
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.09] transition-colors max-w-full"
            >
              {sel ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: corCo[sel.co] || '#D4A017' }} />
                  <span className="font-semibold text-sm text-white truncate max-w-[200px]">{sel.n}</span>
                  <span className="text-xs text-text-secondary hidden sm:inline">· {sel.co}</span>
                </>
              ) : (
                <span className="text-sm text-white">Selecionar empreendimento</span>
              )}
              <svg className={`w-4 h-4 text-text-secondary transition-transform ${menuAberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
        </div>

        {menuAberto && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenuAberto(false)} />
            <div className="absolute right-0 mt-2 w-full sm:w-96 max-w-full z-30 rounded-xl border border-white/10 bg-[#12101a] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] overflow-hidden">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <div className="p-3 border-b border-white/10 space-y-2">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar empreendimento…"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                />
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setFiltroCo('')}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${!filtroCo ? 'bg-[#FF1E56] text-white' : 'bg-white/[0.06] text-text-secondary'}`}
                  >
                    Todas
                  </button>
                  {construtorasView.map((c) => (
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
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin p-2 space-y-1">
                {listaFiltrada.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelId(p.id); setMenuAberto(false); }}
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
            </div>
          </>
        )}
      </div>

      {/* Corpo (largura total) */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary">Carregando materiais…</div>
      ) : erro ? (
        <div className="flex-1 flex items-center justify-center text-red-400">{erro}</div>
      ) : imoveis.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary">Nenhum imóvel cadastrado ainda.</div>
      ) : (
        <section ref={secRef} className={`${fullscreen ? 'w-screen h-screen rounded-none' : 'flex-1 rounded-xl'} relative min-w-0 min-h-0 flex flex-col border border-white/10 bg-[#101015] overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 gx-line z-10" />
          {!sel ? (
            <div className="flex-1 flex items-center justify-center text-text-secondary">Selecione um empreendimento no seletor acima.</div>
          ) : (
            <>
              {fullscreen ? (
                /* Modo apresentação: UMA barra fina (nome + abas + sair) — o conteúdo fica com o resto da tela */
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/10">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-black shrink-0" style={{ background: corCo[sel.co] || '#D4A017' }}>{sel.co}</span>
                  <span className="text-sm font-extrabold text-white truncate max-w-[220px] shrink-0">{sel.n}</span>
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-thin flex-1 min-w-0 px-1">{pills(true)}</div>
                  <button
                    onClick={toggleFullscreen}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white hover:bg-white/15 transition-colors"
                    title="Sair da tela cheia (Esc)"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4m7 5l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m7-5l5 5m0 0v-4m0 4h-4" /></svg>
                    Sair
                  </button>
                </div>
              ) : (
                <>
                  {/* Cabeçalho fino: nome + dados + apresentar (sem capa — o conteúdo é o protagonista) */}
                  <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-black shrink-0" style={{ background: corCo[sel.co] || '#D4A017' }}>{sel.co}</span>
                      <h2 className="al-display text-xl font-extrabold text-white leading-tight truncate">{sel.n}</h2>
                      {sel.st && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/80 shrink-0">{sel.st}</span>}
                      {(sel.cid || sel.end) && <span className="text-xs text-text-secondary truncate">{[sel.end, sel.cid].filter(Boolean).join(' · ')}</span>}
                      <button
                        onClick={toggleFullscreen}
                        className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                        title="Tela cheia — ideal pra apresentar no Meet"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                        Apresentar
                      </button>
                    </div>
                    {stats.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {stats.map(([k, v]) => (
                          <span key={k} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-[11px] text-text-secondary">
                            {k}: <b className="text-white font-semibold">{v}</b>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Abas em pílulas — grandes, fáceis de achar durante a call */}
                  <div className="shrink-0 flex gap-1.5 px-3 py-2.5 overflow-x-auto scrollbar-thin border-b border-white/10">{pills(false)}</div>
                </>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3">
                <TabConteudo imovel={sel} tab={tab} presenting={fullscreen} onLightbox={setLightbox} />
              </div>
            </>
          )}

          {/* Lightbox dentro da section pra funcionar também em tela cheia */}
          {lightbox && <Lightbox state={lightbox} onClose={() => setLightbox(null)} onNav={(i) => setLightbox({ ...lightbox, idx: i })} />}
        </section>
      )}
    </div>
  );
}

function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="shrink-0 flex flex-wrap items-center gap-2 mb-2.5">{children}</div>;
}
function BtnWhats({ url, text, asFile }: { url: string; text: string; asFile: boolean }) {
  return (
    <button
      onClick={() => encaminharWhatsApp(url, text, asFile)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#25D366] hover:bg-[#1fbd5a] transition-colors shadow-[0_2px_10px_rgba(37,211,102,0.3)]"
      title="Encaminhar este material pro cliente no WhatsApp"
    >
      <WAIcon className="w-3.5 h-3.5" />
      Enviar no WhatsApp
    </button>
  );
}
function BtnDownload({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
      Baixar
    </a>
  );
}

function TabConteudo({ imovel, tab, presenting, onLightbox }: { imovel: Imovel; tab: string; presenting: boolean; onLightbox: (s: LightboxState) => void }) {
  // Tela cheia só do PDF (o pager já passa página a página com scroll/clique/setas)
  const pdfRef = useRef<HTMLDivElement>(null);
  const pdfFullscreen = () => { pdfRef.current?.requestFullscreen?.(); pdfRef.current?.focus?.(); };

  if (tab === 'resumo') {
    const tips = parseTip(imovel.tip);
    const lazer = Array.isArray(imovel.lazer) ? imovel.lazer.filter(Boolean) : [];
    const temDif = Array.isArray(imovel.dif) && imovel.dif.length > 0;
    const temLateral = temDif || lazer.length > 0;
    return (
      <div className={`grid gap-6 ${temLateral ? 'lg:grid-cols-[minmax(0,1fr),380px]' : 'max-w-4xl'} ${presenting ? 'pt-4' : ''}`}>
        {/* Coluna principal: tipologias (com "a partir de") + resumo */}
        <div className="space-y-5 min-w-0">
          {tips.length > 0 && (
            <div>
              <h3 className="al-display text-[11px] font-bold text-text-secondary uppercase tracking-[0.24em] mb-2">Tipologias</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tips.map((t, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 hover:border-[#E8C547]/35 transition-colors">
                    <div className="flex items-baseline gap-1">
                      <span className="al-display text-[17px] font-bold text-white leading-none tabular-nums">{t[0]}</span>
                      <span className="text-[9px] text-text-secondary">m²</span>
                    </div>
                    {t[1] && <div className="text-[11px] font-semibold text-white/80 mt-0.5 truncate" title={t[1]}>{t[1]}</div>}
                    {t[2] && (
                      <div className="mt-1 leading-tight">
                        <span className="block text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-text-secondary">a partir de</span>
                        <span className="al-display text-[13.5px] font-bold text-[#FFE9A6] tabular-nums">R$ {t[2]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {imovel.resumo && (
            <div>
              <h3 className="al-display text-[11px] font-bold text-text-secondary uppercase tracking-[0.24em] mb-2">Resumo</h3>
              <p className="text-[14.5px] text-white/85 whitespace-pre-line leading-relaxed">{imovel.resumo}</p>
            </div>
          )}
          {!imovel.resumo && !tips.length && !temLateral && (
            <p className="text-sm text-text-secondary">Sem descrição cadastrada. Veja os materiais nas abas acima.</p>
          )}
        </div>
        {/* Lateral: diferenciais + lazer & convívio (sem emojis) */}
        {temLateral && (
          <div className="space-y-5 min-w-0">
            {temDif && (
              <div>
                <h3 className="al-display text-[11px] font-bold text-text-secondary uppercase tracking-[0.24em] mb-2">Diferenciais</h3>
                <div className="space-y-1.5">
                  {imovel.dif!.map((d, i) => (
                    <div key={i} className="rounded-lg bg-white/[0.03] border border-white/[0.07] border-l-2 border-l-[#FF1E56]/60 px-3 py-2 text-[12.5px] text-white/85">{d}</div>
                  ))}
                </div>
              </div>
            )}
            {lazer.length > 0 && (
              <div>
                <h3 className="al-display text-[11px] font-bold text-text-secondary uppercase tracking-[0.24em] mb-2">Lazer & Convívio</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {lazer.map((d, i) => (
                    <div key={i} className="rounded-lg bg-white/[0.03] border border-white/[0.07] px-3 py-2 text-[12px] text-white/80">{d}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (tab === 'localizacao') {
    const locMat = matsOf(imovel, 'localizacao')[0];
    const link = locMat?.url?.trim();
    const q = encodeURIComponent(link || [imovel.end, imovel.cid].filter(Boolean).join(', '));
    return (
      <div className="h-full flex flex-col">
        {!presenting && (
          <Toolbar>
            <span className="text-sm font-semibold text-white mr-auto">Localização</span>
            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors">Abrir no Google Maps</a>}
            <BtnWhats url={link || ''} text={`${imovel.n} — Localização\n${link || [imovel.end, imovel.cid].filter(Boolean).join(', ')}`} asFile={false} />
          </Toolbar>
        )}
        <div className="flex-1 min-h-[380px] rounded-xl overflow-hidden border border-white/10">
          <iframe title="Mapa" className="w-full h-full" src={`https://www.google.com/maps?q=${q}&output=embed`} />
        </div>
      </div>
    );
  }

  const cat = catByKey(tab);
  const mats = matsOf(imovel, tab);
  if (!cat || mats.length === 0) return <p className="text-sm text-text-secondary">Nenhum material em “{cat?.label || tab}”.</p>;

  // Tabela aceita link OU PDF enviado: quando a URL é de PDF, abre no mesmo visualizador da Apresentação
  const ehPdfUrl = (u: string) => { try { return /\.pdf(\?|#|$)/i.test(decodeURIComponent(u || '')); } catch { return /\.pdf(\?|#|$)/i.test(u || ''); } };
  const kindEfetivo = cat.kind === 'link' && ehPdfUrl(mats[0]?.url || '') ? 'pdf' : cat.kind;

  if (kindEfetivo === 'pdf') {
    const m = mats[0];
    const url = toCdn(m.url);
    return (
      <div className="h-full flex flex-col">
        <Toolbar>
          <span className="text-sm font-semibold text-white mr-auto">{m.name || cat.label}</span>
          <button onClick={pdfFullscreen} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all" title="Só o PDF na tela inteira — role o mouse, clique ou use as setas pra passar as páginas">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            Apresentar PDF
          </button>
          {!presenting && (
            <>
              <BtnDownload url={url} />
              <BtnWhats url={url} text={`${imovel.n} — ${m.name || cat.label}\n${url}`} asFile />
            </>
          )}
        </Toolbar>
        <div className="flex-1 min-h-[420px] rounded-xl overflow-hidden border border-white/10">
          <PdfPager url={url} innerRef={pdfRef} />
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
      <div className="h-full flex flex-col">
        {!presenting && (
          <Toolbar>
            <span className="text-sm font-semibold text-white mr-auto">{m.name || cat.label}</span>
            {fileUrl && <BtnDownload url={fileUrl} />}
            {fileUrl ? <BtnWhats url={fileUrl} text={`${imovel.n} — ${m.name || cat.label}`} asFile /> : yt ? <BtnWhats url={`https://youtu.be/${yt}`} text={`${imovel.n} — ${m.name || cat.label}\nhttps://youtu.be/${yt}`} asFile={false} /> : null}
          </Toolbar>
        )}
        <div className="flex-1 min-h-[380px] rounded-xl overflow-hidden border border-white/10 bg-black">
          {yt ? (
            <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1&playsinline=1`} allow="autoplay; fullscreen; encrypted-media" allowFullScreen title="Vídeo" />
          ) : (
            <video src={url} controls playsInline preload="metadata" className="w-full h-full object-contain" />
          )}
        </div>
      </div>
    );
  }

  if (cat.kind === 'image') {
    const imgs = mats.map((m) => ({ url: toCdn(m.url), name: imovel.n + (m.name ? ` — ${m.name}` : ''), label: m.name || '' }));
    return (
      <div>
        {!presenting && <p className="text-xs text-text-secondary mb-2">{cat.label} · {imgs.length} {imgs.length === 1 ? 'item' : 'itens'} — clique para ampliar (use as setas do teclado pra navegar)</p>}
        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5">
          {imgs.map((im, k) => (
            <button key={k} onClick={() => onLightbox({ imgs, idx: k })} className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.03] hover:border-[#FF1E56]/40 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(255,30,86,0.35)] transition-all duration-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={im.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
              {im.label && (
                <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-[11px] font-semibold text-white px-2.5 pt-4 pb-1.5 text-left truncate">{im.label}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (cat.kind === 'link') {
    const m = mats[0];
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md w-full text-center al-card relative overflow-hidden p-8">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="al-display text-lg font-bold text-white uppercase tracking-[0.08em] mb-1">{m.name || cat.label}</div>
          <p className="text-sm text-text-secondary mb-5">Abre em nova aba para você apresentar valores e disponibilidade.</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <a href={m.url.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold text-sm shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all">
              Abrir {cat.label.toLowerCase()}
            </a>
            <BtnWhats url={m.url.trim()} text={`${imovel.n} — ${m.name || cat.label}\n${m.url.trim()}`} asFile={false} />
          </div>
        </div>
      </div>
    );
  }

  if (cat.kind === 'linklist') {
    return (
      <div className="space-y-2 max-w-2xl">
        {mats.map((m, i) => {
          const url = m.url.trim();
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{m.name || url}</div>
                <div className="text-[11px] text-text-secondary truncate">{url}</div>
              </div>
              <a href={url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors">Abrir</a>
              <a href={waLink(`${imovel.n} — ${m.name || 'link'}\n${url}`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#25D366] hover:bg-[#1fbd5a]"><WAIcon className="w-3.5 h-3.5" />WhatsApp</a>
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

  // Navegação por teclado — apresentação fluida (setas e Esc)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, imgs.length]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2 z-10" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => encaminharWhatsApp(cur.url, cur.name, true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold text-white bg-[#25D366] hover:bg-[#1fbd5a]"><WAIcon className="w-4 h-4" />Enviar no WhatsApp</button>
        <a href={cur.url} target="_blank" rel="noopener noreferrer" download className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white/85 border border-white/25 bg-black/40 hover:bg-white/10">Baixar</a>
        <button onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white border border-white/25 bg-black/40 hover:bg-white/10">✕</button>
      </div>
      {cur.label && <div className="absolute top-5 left-5 text-sm font-semibold text-white/85 bg-black/40 px-3 py-1.5 rounded-lg" onClick={(e) => e.stopPropagation()}>{cur.label}</div>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cur.url} alt={cur.name} className="max-w-full max-h-[86vh] object-contain rounded-lg select-none" onClick={(e) => e.stopPropagation()} />
      {imgs.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full text-2xl text-white bg-white/10 hover:bg-white/20 flex items-center justify-center">‹</button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full text-2xl text-white bg-white/10 hover:bg-white/20 flex items-center justify-center">›</button>
          <div className="absolute bottom-4 text-sm text-white/70 bg-black/40 px-3 py-1 rounded-full" onClick={(e) => e.stopPropagation()}>{idx + 1} / {imgs.length}</div>
        </>
      )}
    </div>
  );
}
