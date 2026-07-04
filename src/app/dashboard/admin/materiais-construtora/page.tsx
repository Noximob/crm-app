'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { apoioDb, apoioStorage } from '@/lib/apoioFirebase';
import { useAuth } from '@/context/AuthContext';
import { CATEGORIES, catByKey, parseTip, type Construtora, type Imovel, type Material } from '@/lib/materiais/types';

const CORES = ['#D4A017', '#b39af0', '#5dc2a5', '#e0777b', '#7aa2f7', '#f0a35e', '#9d83b8', '#4fb0c6'];
const STATUS = ['Em construção', 'Lançamento', 'Pronto para morar'];

// select com fundo sólido (evita opções invisíveis no dark do Chrome)
const SEL = 'w-full px-3 py-2 rounded-lg bg-[#1e1e24] border border-white/10 text-sm text-white';
const INP = 'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white';
const OPT = 'bg-[#15151a] text-white';

export default function AdminMateriaisPage() {
  const { userData } = useAuth();
  const isAdmin = userData?.tipoConta === 'imobiliaria' || userData?.permissoes?.admin;

  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [novaCo, setNovaCo] = useState('');
  const [novaCor, setNovaCor] = useState(CORES[0]);
  const [filtroCo, setFiltroCo] = useState('');
  const [editing, setEditing] = useState<Partial<Imovel> | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [sc, si] = await Promise.all([getDocs(collection(apoioDb, 'construtoras')), getDocs(collection(apoioDb, 'imoveis'))]);
      setConstrutoras(sc.docs.map((d) => ({ id: d.id, ...d.data() }) as Construtora).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
      setImoveis(si.docs.map((d) => ({ id: d.id, ...d.data() }) as Imovel).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
    } catch { setMsg('Erro ao carregar do apoio-nox.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };
  const imoveisFiltrados = useMemo(() => imoveis.filter((p) => !filtroCo || p.co === filtroCo), [imoveis, filtroCo]);

  const criarConstrutora = async () => {
    if (!novaCo.trim()) return;
    try { await addDoc(collection(apoioDb, 'construtoras'), { name: novaCo.trim(), color: novaCor, ordem: construtoras.length }); setNovaCo(''); flash('Construtora criada.'); carregar(); }
    catch { flash('Erro ao criar construtora.'); }
  };
  const excluirConstrutora = async (c: Construtora) => {
    if (!window.confirm(`Excluir a construtora "${c.name}"? Os imóveis dela não são apagados.`)) return;
    try { await deleteDoc(doc(apoioDb, 'construtoras', c.id)); flash('Construtora excluída.'); carregar(); }
    catch { flash('Erro ao excluir.'); }
  };
  const mudarCor = async (c: Construtora, color: string) => {
    try { await updateDoc(doc(apoioDb, 'construtoras', c.id), { color }); setConstrutoras((prev) => prev.map((x) => x.id === c.id ? { ...x, color } : x)); }
    catch { flash('Erro ao mudar cor.'); }
  };
  const excluirImovel = async (p: Imovel) => {
    if (!window.confirm(`Excluir o empreendimento "${p.n}"?`)) return;
    try { await deleteDoc(doc(apoioDb, 'imoveis', p.id)); flash('Excluído.'); carregar(); }
    catch { flash('Erro ao excluir.'); }
  };

  if (!isAdmin) return <div className="p-8 text-center text-text-secondary">Você não tem permissão para acessar esta página.</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Material de apoio — administração</h1>
        <p className="text-sm text-text-secondary">Construtoras e empreendimentos (grava no apoio-nox; aparece pro corretor em “Materiais de apoio”).</p>
      </div>
      {msg && <div className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm">{msg}</div>}

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-lg font-bold text-white mb-3">Construtoras</h2>
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-text-secondary mb-1">Nome</label>
            <input value={novaCo} onChange={(e) => setNovaCo(e.target.value)} placeholder="Ex.: MRV, Cyrela…" className={INP} />
          </div>
          <div className="flex items-center gap-1">
            {CORES.map((c) => <button key={c} onClick={() => setNovaCor(c)} className={`w-6 h-6 rounded-full border-2 ${novaCor === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />)}
          </div>
          <button onClick={criarConstrutora} className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400">Criar</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {construtoras.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: c.color || '#D4A017' }} />
              <span className="text-sm font-semibold text-white">{c.name}</span>
              <div className="flex items-center gap-0.5">{CORES.map((col) => <button key={col} onClick={() => mudarCor(c, col)} title="mudar cor" className="w-3 h-3 rounded-full opacity-50 hover:opacity-100" style={{ background: col }} />)}</div>
              <button onClick={() => excluirConstrutora(c)} className="text-red-400 hover:text-red-300 text-xs ml-1">excluir</button>
            </div>
          ))}
          {construtoras.length === 0 && !loading && <p className="text-sm text-text-secondary">Nenhuma construtora ainda.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-white">Empreendimentos</h2>
          <div className="flex items-center gap-2">
            <select value={filtroCo} onChange={(e) => setFiltroCo(e.target.value)} className={SEL}>
              <option value="" className={OPT}>Todas construtoras</option>
              {construtoras.map((c) => <option key={c.id} value={c.name} className={OPT}>{c.name}</option>)}
            </select>
            <button onClick={() => setEditing({ co: filtroCo || construtoras[0]?.name || '' })} className="px-4 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 whitespace-nowrap">+ Novo</button>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-text-secondary py-6 text-center">Carregando…</p>
        ) : (
          <div className="divide-y divide-white/10">
            {imoveisFiltrados.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: (construtoras.find((c) => c.name === p.co)?.color) || '#D4A017' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{p.n}</div>
                  <div className="text-[11px] text-text-secondary truncate">{p.co}{p.cid ? ` · ${p.cid}` : ''} · {Array.isArray(p.materiais) ? p.materiais.length : 0} materiais</div>
                </div>
                <button onClick={() => setEditing(p)} className="px-2.5 py-1 rounded-md text-xs text-amber-300 border border-amber-500/40 hover:bg-amber-500/10">Editar</button>
                <button onClick={() => excluirImovel(p)} className="px-2.5 py-1 rounded-md text-xs text-red-300 border border-red-500/40 hover:bg-red-500/10">Excluir</button>
              </div>
            ))}
            {imoveisFiltrados.length === 0 && <p className="text-sm text-text-secondary py-6 text-center">Nenhum empreendimento.</p>}
          </div>
        )}
      </section>

      {editing && (
        <ImovelForm
          initial={editing}
          construtoras={construtoras}
          imoveisCount={imoveis.length}
          onSaved={() => { setEditing(null); flash('Empreendimento salvo.'); carregar(); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ImovelForm({ initial, construtoras, imoveisCount, onSaved, onClose }: {
  initial: Partial<Imovel>;
  construtoras: Construtora[];
  imoveisCount: number;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [co, setCo] = useState(initial.co || construtoras[0]?.name || '');
  const [n, setN] = useState(initial.n || '');
  const [l, setL] = useState(initial.l || '');
  const [st, setSt] = useState(initial.st || STATUS[1]);
  const [cid, setCid] = useState(initial.cid || '');
  const [end, setEnd] = useState(initial.end || '');
  const [pr, setPr] = useState(initial.pr || '');
  const [m2, setM2] = useState(initial.m2 || '');
  const [t, setT] = useState(initial.t || '');
  const [a, setA] = useState(initial.a || '');
  const [ap, setAp] = useState(initial.ap || '');
  const [e, setE] = useState(initial.e || '');
  const [resumo, setResumo] = useState(initial.resumo || '');
  const [capa, setCapa] = useState(initial.capa || '');
  const [tip, setTip] = useState<[string, string][]>(() => { const p = parseTip(initial.tip); return p.length ? p : [['', '']]; });
  const [dif, setDif] = useState<string[]>(Array.isArray(initial.dif) && initial.dif.length ? [...initial.dif] : ['']);
  const [materiais, setMateriais] = useState<Material[]>(Array.isArray(initial.materiais) ? initial.materiais : []);

  const [mCat, setMCat] = useState<string>(CATEGORIES[0].key);
  const [mName, setMName] = useState('');
  const [mUrl, setMUrl] = useState('');
  const [prog, setProg] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [err, setErr] = useState('');

  const kind = catByKey(mCat)?.kind;
  // upload de arquivo p/ pdf/imagem/vídeo e p/ Capa; link p/ Tabela/Links/Localização
  const isArquivo = mCat === 'capa' || kind === 'pdf' || kind === 'image' || kind === 'video';

  const addLink = () => {
    if (!mUrl.trim()) { setErr('Cole o link.'); return; }
    setMateriais((prev) => [...prev, { cat: mCat, name: mName.trim() || catByKey(mCat)?.label || mCat, url: mUrl.trim() }]);
    setMName(''); setMUrl(''); setErr('');
  };

  const upload = (file: File) => {
    const cat = mCat;
    const name = mName.trim() || file.name.replace(/\.[^.]+$/, '');
    const key = initial.id || `novo_${Date.now()}`;
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `imoveis/${key}/${cat}/${Date.now()}_${safe}`;
    setErr(''); setProg(0);
    // cacheControl: o navegador do corretor guarda o arquivo (nome tem timestamp, nunca muda)
    const task = uploadBytesResumable(ref(apoioStorage, path), file, { cacheControl: 'public, max-age=31536000, immutable' });
    task.on('state_changed',
      (s) => setProg(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      (error) => { setErr('Erro no upload: ' + error.message); setProg(null); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        if (cat === 'capa') setCapa(url); // Capa define a foto do topo (não vira material)
        else setMateriais((prev) => [...prev, { cat, name, url }]);
        setProg(null); setMName('');
      }
    );
  };

  const salvar = async () => {
    if (!n.trim()) { setErr('Informe o nome do empreendimento.'); return; }
    if (!cid.trim()) { setErr('Informe a cidade.'); return; }
    setSalvando(true); setErr('');
    try {
      const data: Record<string, any> = {
        co, n: n.trim(), l: l.trim(), st, cid: cid.trim(), end: end.trim(),
        pr: pr.trim(), m2: m2.trim(), t: t.trim(), a: a.trim(), ap: ap.trim(), e: e.trim(),
        resumo, capa,
        // tip vai como JSON string (Firestore não aceita array-dentro-de-array)
        tip: JSON.stringify(tip.map(([ar, de]) => [ar.trim(), de.trim()]).filter((x) => x[0] || x[1])),
        dif: dif.map((x) => x.trim()).filter(Boolean),
        materiais,
      };
      if (initial.id) await updateDoc(doc(apoioDb, 'imoveis', initial.id), data);
      else await addDoc(collection(apoioDb, 'imoveis'), { ...data, ordem: imoveisCount });
      onSaved();
    } catch (e: any) { setErr('Erro ao salvar: ' + (e?.message || e)); }
    finally { setSalvando(false); }
  };

  const campo = (label: string, val: string, setter: (v: string) => void, ph?: string) => (
    <div>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      <input value={val} onChange={(ev) => setter(ev.target.value)} placeholder={ph} className={INP} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[75] bg-black/70 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-3xl my-4 rounded-2xl bg-[#15151a] border border-white/15 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">{initial.id ? 'Editar imóvel' : 'Novo imóvel'}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">✕</button>
        </div>

        <div className="p-5 space-y-5 max-h-[76vh] overflow-y-auto scrollbar-thin">
          <div className="grid sm:grid-cols-2 gap-3">
            {campo('Empreendimento *', n, setN, 'Ex: Orla da Barra')}
            <div>
              <label className="block text-xs text-text-secondary mb-1">Construtora</label>
              <select value={co} onChange={(ev) => setCo(ev.target.value)} className={SEL}>
                {construtoras.map((c) => <option key={c.id} value={c.name} className={OPT}>{c.name}</option>)}
              </select>
            </div>
            {campo('Linha / Selo', l, setL, 'Ex: Santer Prime')}
            <div>
              <label className="block text-xs text-text-secondary mb-1">Status</label>
              <select value={st} onChange={(ev) => setSt(ev.target.value)} className={SEL}>
                {STATUS.map((s) => <option key={s} value={s} className={OPT}>{s}</option>)}
              </select>
            </div>
            {campo('Cidade *', cid, setCid, 'Ex: Barra Velha, SC')}
            {campo('Endereço', end, setEnd, 'Rua, número')}
            {campo('Preço a partir de (R$)', pr, setPr, '853.007')}
            {campo('Valor do m² (R$)', m2, setM2, '13.028')}
            {campo('Torres', t, setT, '2')}
            {campo('Andares', a, setA, '30+')}
            {campo('Apartamentos', ap, setAp, '88')}
            {campo('Entrega', e, setE, 'Dez/29')}
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Resumo / descrição</label>
            <textarea value={resumo} onChange={(ev) => setResumo(ev.target.value)} rows={3} className={INP} placeholder="Texto livre que aparece na aba Resumo." />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-2">Tipologias (área m² · descrição)</p>
            <div className="space-y-1.5">
              {tip.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input value={row[0]} onChange={(ev) => setTip((p) => p.map((r, k) => k === i ? [ev.target.value, r[1]] : r))} placeholder="Área (ex: 68,72)" className="w-32 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white" />
                  <input value={row[1]} onChange={(ev) => setTip((p) => p.map((r, k) => k === i ? [r[0], ev.target.value] : r))} placeholder="Descrição (ex: Suíte + 1 dorm)" className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white" />
                  <button onClick={() => setTip((p) => { const nx = p.filter((_, k) => k !== i); return nx.length ? nx : [['', '']]; })} className="px-2 rounded-lg text-red-400 hover:bg-red-500/10">✕</button>
                </div>
              ))}
            </div>
            <button onClick={() => setTip((p) => [...p, ['', '']])} className="mt-1.5 text-xs px-2 py-1 rounded-md bg-white/10 text-white hover:bg-white/15">+ tipologia</button>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-2">Diferenciais</p>
            <div className="space-y-1.5">
              {dif.map((val, i) => (
                <div key={i} className="flex gap-2">
                  <input value={val} onChange={(ev) => setDif((p) => p.map((r, k) => k === i ? ev.target.value : r))} placeholder="Diferencial" className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white" />
                  <button onClick={() => setDif((p) => { const nx = p.filter((_, k) => k !== i); return nx.length ? nx : ['']; })} className="px-2 rounded-lg text-red-400 hover:bg-red-500/10">✕</button>
                </div>
              ))}
            </div>
            <button onClick={() => setDif((p) => [...p, ''])} className="mt-1.5 text-xs px-2 py-1 rounded-md bg-white/10 text-white hover:bg-white/15">+ diferencial</button>
          </div>

          {/* Materiais */}
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-1">Materiais</p>
            <p className="text-[11px] text-text-secondary mb-3">Escolha o <b>Tipo</b>, dê um <b>Nome</b> e <b>envie o arquivo</b> — sobe pro Storage e abre direto aqui pro corretor. (<b>Tabela</b>, <b>Links</b> e <b>Localização</b> usam link; <b>Capa</b> define a foto do topo.)</p>

            <div className="space-y-1 mb-3">
              {materiais.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-white/[0.03] rounded-md px-2 py-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 shrink-0">{catByKey(m.cat)?.label || m.cat}</span>
                  <span className="text-white truncate flex-1">{m.name || m.url}</span>
                  <button onClick={() => setMateriais((p) => p.filter((_, k) => k !== i))} className="text-red-400 hover:text-red-300 shrink-0">remover</button>
                </div>
              ))}
              {materiais.length === 0 && <p className="text-xs text-text-secondary">Nenhum material ainda. Adicione abaixo.</p>}
            </div>

            <div className="rounded-lg bg-white/[0.03] p-3 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1">Tipo</label>
                  <select value={mCat} onChange={(ev) => { setMCat(ev.target.value); setErr(''); }} className={SEL}>
                    {CATEGORIES.map((c) => <option key={c.key} value={c.key} className={OPT}>{c.label}</option>)}
                    <option value="capa" className={OPT}>Capa (foto do topo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1">Nome (opcional)</label>
                  <input value={mName} onChange={(ev) => setMName(ev.target.value)} placeholder="Ex: Book de apresentação" className={INP} />
                </div>
              </div>

              {isArquivo ? (
                <div className="flex items-center gap-3">
                  <label className={`px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer ${prog !== null ? 'bg-white/10 text-white/60' : 'bg-amber-500 text-black hover:bg-amber-400'}`}>
                    📎 Enviar arquivo
                    <input type="file" className="hidden" disabled={prog !== null} onChange={(ev) => { const f = ev.target.files?.[0]; if (f) upload(f); ev.currentTarget.value = ''; }} />
                  </label>
                  {prog !== null && <span className="text-xs text-amber-300">Enviando… {prog}%</span>}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={mUrl} onChange={(ev) => setMUrl(ev.target.value)} placeholder={mCat === 'localizacao' ? 'link do Google Maps' : mCat === 'tabela' ? 'link da tabela de valores' : 'colar o link'} className={INP} />
                  <button onClick={addLink} className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 whitespace-nowrap">Adicionar</button>
                </div>
              )}
            </div>

            {capa && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-3">
                <span className="text-[11px] text-text-secondary">⭐ Capa do topo:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={capa} alt="capa" className="h-10 w-16 object-cover rounded border border-white/15" />
                <button onClick={() => setCapa('')} className="text-xs text-red-400 hover:text-red-300">remover</button>
              </div>
            )}
          </div>

          {err && <p className="text-sm text-red-400">{err}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10">Voltar</button>
          <button onClick={salvar} disabled={salvando} className="px-5 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-60">{salvando ? 'Salvando…' : 'Salvar imóvel'}</button>
        </div>
      </div>
    </div>
  );
}
