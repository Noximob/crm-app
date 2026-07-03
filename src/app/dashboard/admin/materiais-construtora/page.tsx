'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { apoioDb, apoioStorage } from '@/lib/apoioFirebase';
import { useAuth } from '@/context/AuthContext';
import { CATEGORIES, type Construtora, type Imovel, type Material } from '@/lib/materiais/types';

const CORES = ['#D4A017', '#b39af0', '#5dc2a5', '#e0777b', '#7aa2f7', '#f0a35e', '#9d83b8', '#4fb0c6'];

interface FormImovel {
  id?: string;
  co: string; n: string; l: string; cid: string; end: string;
  pr: string; m2: string; st: string; t: string; a: string; ap: string; e: string;
  resumo: string; capa: string; tipText: string; difText: string;
  materiais: Material[];
}
const EMPTY: FormImovel = { co: '', n: '', l: '', cid: '', end: '', pr: '', m2: '', st: '', t: '', a: '', ap: '', e: '', resumo: '', capa: '', tipText: '', difText: '', materiais: [] };

function toForm(p: Imovel): FormImovel {
  return {
    id: p.id, co: p.co || '', n: p.n || '', l: p.l || '', cid: p.cid || '', end: p.end || '',
    pr: p.pr || '', m2: p.m2 || '', st: p.st || '', t: p.t || '', a: p.a || '', ap: p.ap || '', e: p.e || '',
    resumo: p.resumo || '', capa: p.capa || '',
    tipText: Array.isArray(p.tip) ? p.tip.map((t) => `${t[0]} | ${t[1]}`).join('\n') : '',
    difText: Array.isArray(p.dif) ? p.dif.join('\n') : '',
    materiais: Array.isArray(p.materiais) ? p.materiais : [],
  };
}

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
  const [form, setForm] = useState<FormImovel | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [sc, si] = await Promise.all([getDocs(collection(apoioDb, 'construtoras')), getDocs(collection(apoioDb, 'imoveis'))]);
      setConstrutoras(sc.docs.map((d) => ({ id: d.id, ...d.data() }) as Construtora).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
      setImoveis(si.docs.map((d) => ({ id: d.id, ...d.data() }) as Imovel).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
    } catch (e) {
      setMsg('Erro ao carregar do apoio-nox.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { carregar(); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };

  const imoveisFiltrados = useMemo(() => imoveis.filter((p) => !filtroCo || p.co === filtroCo), [imoveis, filtroCo]);

  // ---- Construtoras ----
  const criarConstrutora = async () => {
    if (!novaCo.trim()) return;
    try {
      await addDoc(collection(apoioDb, 'construtoras'), { name: novaCo.trim(), color: novaCor, ordem: construtoras.length });
      setNovaCo('');
      flash('Construtora criada.');
      carregar();
    } catch { flash('Erro ao criar construtora.'); }
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

  // ---- Imóvel form ----
  const set = (k: keyof FormImovel, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const addMaterial = (cat: string, name: string, url: string, dl?: string) => {
    if (!url.trim()) return;
    setForm((f) => (f ? { ...f, materiais: [...f.materiais, { cat, name: name.trim(), url: url.trim(), ...(dl ? { dl: dl.trim() } : {}) }] } : f));
  };
  const removeMaterial = (i: number) => setForm((f) => (f ? { ...f, materiais: f.materiais.filter((_, k) => k !== i) } : f));

  const uploadArquivo = async (file: File, cat: string) => {
    if (!form) return;
    try {
      flash('Enviando arquivo…');
      const path = `imoveis/${form.id || 'novos'}/${cat}/${Date.now()}_${file.name}`;
      const r = ref(apoioStorage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      addMaterial(cat, file.name, url);
      flash('Arquivo enviado.');
    } catch { flash('Erro no upload.'); }
  };

  const salvarImovel = async () => {
    if (!form || !form.n.trim() || !form.co) { flash('Preencha nome e construtora.'); return; }
    setSalvando(true);
    try {
      const tip = form.tipText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [a, ...d] = l.split('|'); return [a.trim(), d.join('|').trim()] as [string, string]; });
      const dif = form.difText.split('\n').map((l) => l.trim()).filter(Boolean);
      const data: Record<string, any> = {
        co: form.co, n: form.n.trim(), l: form.l, cid: form.cid, end: form.end, pr: form.pr, m2: form.m2, st: form.st,
        t: form.t, a: form.a, ap: form.ap, e: form.e, resumo: form.resumo, capa: form.capa, tip, dif, materiais: form.materiais,
      };
      if (form.id) {
        await updateDoc(doc(apoioDb, 'imoveis', form.id), data);
      } else {
        await addDoc(collection(apoioDb, 'imoveis'), { ...data, ordem: imoveis.length });
      }
      flash('Empreendimento salvo.');
      setForm(null);
      carregar();
    } catch { flash('Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const excluirImovel = async (p: Imovel) => {
    if (!window.confirm(`Excluir o empreendimento "${p.n}"?`)) return;
    try { await deleteDoc(doc(apoioDb, 'imoveis', p.id)); flash('Excluído.'); carregar(); }
    catch { flash('Erro ao excluir.'); }
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-text-secondary">Você não tem permissão para acessar esta página.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Material de apoio — administração</h1>
        <p className="text-sm text-text-secondary">Construtoras, empreendimentos e materiais (grava no apoio-nox, aparece pro corretor em “Materiais de apoio”).</p>
      </div>
      {msg && <div className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm">{msg}</div>}

      {/* Construtoras */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-lg font-bold text-white mb-3">Construtoras</h2>
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-text-secondary mb-1">Nome</label>
            <input value={novaCo} onChange={(e) => setNovaCo(e.target.value)} placeholder="Ex.: MRV, Cyrela…" className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white" />
          </div>
          <div className="flex items-center gap-1">
            {CORES.map((c) => (
              <button key={c} onClick={() => setNovaCor(c)} className={`w-6 h-6 rounded-full border-2 ${novaCor === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
            ))}
          </div>
          <button onClick={criarConstrutora} className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400">Criar</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {construtoras.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: c.color || '#D4A017' }} />
              <span className="text-sm font-semibold text-white">{c.name}</span>
              <div className="flex items-center gap-0.5">
                {CORES.map((col) => <button key={col} onClick={() => mudarCor(c, col)} title="mudar cor" className="w-3 h-3 rounded-full opacity-50 hover:opacity-100" style={{ background: col }} />)}
              </div>
              <button onClick={() => excluirConstrutora(c)} className="text-red-400 hover:text-red-300 text-xs ml-1">excluir</button>
            </div>
          ))}
          {construtoras.length === 0 && !loading && <p className="text-sm text-text-secondary">Nenhuma construtora ainda.</p>}
        </div>
      </section>

      {/* Empreendimentos */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-white">Empreendimentos</h2>
          <div className="flex items-center gap-2">
            <select value={filtroCo} onChange={(e) => setFiltroCo(e.target.value)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white">
              <option value="">Todas construtoras</option>
              {construtoras.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <button onClick={() => setForm({ ...EMPTY, co: filtroCo || construtoras[0]?.name || '' })} className="px-4 py-1.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400">+ Novo</button>
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
                <button onClick={() => setForm(toForm(p))} className="px-2.5 py-1 rounded-md text-xs text-amber-300 border border-amber-500/40 hover:bg-amber-500/10">Editar</button>
                <button onClick={() => excluirImovel(p)} className="px-2.5 py-1 rounded-md text-xs text-red-300 border border-red-500/40 hover:bg-red-500/10">Excluir</button>
              </div>
            ))}
            {imoveisFiltrados.length === 0 && <p className="text-sm text-text-secondary py-6 text-center">Nenhum empreendimento.</p>}
          </div>
        )}
      </section>

      {form && <ImovelForm form={form} construtoras={construtoras} salvando={salvando} setField={set} addMaterial={addMaterial} removeMaterial={removeMaterial} uploadArquivo={uploadArquivo} onSave={salvarImovel} onCancel={() => setForm(null)} />}
    </div>
  );
}

function ImovelForm({ form, construtoras, salvando, setField, addMaterial, removeMaterial, uploadArquivo, onSave, onCancel }: {
  form: FormImovel;
  construtoras: Construtora[];
  salvando: boolean;
  setField: (k: keyof FormImovel, v: string) => void;
  addMaterial: (cat: string, name: string, url: string, dl?: string) => void;
  removeMaterial: (i: number) => void;
  uploadArquivo: (file: File, cat: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [mCat, setMCat] = useState<string>(CATEGORIES[0].key);
  const [mName, setMName] = useState('');
  const [mUrl, setMUrl] = useState('');
  const [mDl, setMDl] = useState('');

  // função (não componente) p/ os inputs não perderem foco a cada tecla
  const campo = (k: keyof FormImovel, label: string, ph?: string) => (
    <div key={k as string}>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      <input value={(form[k] as string) || ''} onChange={(e) => setField(k, e.target.value)} placeholder={ph} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[75] bg-black/70 flex items-start justify-center p-4 overflow-y-auto" onClick={onCancel}>
      <div className="w-full max-w-3xl my-4 rounded-2xl bg-[#15151a] border border-white/15 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">{form.id ? 'Editar empreendimento' : 'Novo empreendimento'}</h3>
          <button onClick={onCancel} className="text-white/70 hover:text-white">✕</button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Construtora *</label>
              <select value={form.co} onChange={(e) => setField('co', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white">
                {construtoras.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            {campo('n', 'Nome *', 'Ex.: Stein One')}
            {campo('l', 'Linha/selo')}
            {campo('st', 'Status', 'Lançamento, Em obras…')}
            {campo('cid', 'Cidade')}
            {campo('end', 'Endereço')}
            {campo('pr', 'Preço (a partir de)', '2.400.000')}
            {campo('m2', 'Valor m²', '21.000')}
            {campo('t', 'Torres')}
            {campo('a', 'Andares')}
            {campo('ap', 'Apartamentos')}
            {campo('e', 'Entrega', 'Dez/30')}
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Resumo</label>
            <textarea value={form.resumo} onChange={(e) => setField('resumo', e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Tipologias (uma por linha: “área | descrição”)</label>
              <textarea value={form.tipText} onChange={(e) => setField('tipText', e.target.value)} rows={4} placeholder={'110,00 | 3 suítes\n168,00 | 4 suítes'} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Diferenciais (um por linha)</label>
              <textarea value={form.difText} onChange={(e) => setField('difText', e.target.value)} rows={4} placeholder={'Frente mar\nInfinity pool'} className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white" />
            </div>
          </div>
          {campo('capa', 'Foto de capa (URL)', 'cole aqui ou use “usar de capa” num material de imagem')}

          {/* Materiais */}
          <div className="rounded-xl border border-white/10 p-3">
            <h4 className="text-sm font-bold text-white mb-2">Materiais</h4>
            <div className="space-y-1 mb-3">
              {form.materiais.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-white/[0.03] rounded-md px-2 py-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">{m.cat}</span>
                  <span className="text-white truncate flex-1">{m.name || m.url}</span>
                  {(m.cat === 'imagens' || m.cat === 'plantas' || m.cat === 'decorado') && <button onClick={() => setField('capa', m.url)} className="text-amber-300 hover:underline">usar de capa</button>}
                  <button onClick={() => removeMaterial(i)} className="text-red-400 hover:text-red-300">remover</button>
                </div>
              ))}
              {form.materiais.length === 0 && <p className="text-xs text-text-secondary">Nenhum material adicionado.</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 items-end">
              <div>
                <label className="block text-[11px] text-text-secondary mb-1">Categoria</label>
                <select value={mCat} onChange={(e) => setMCat(e.target.value)} className="w-full px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-sm text-white">
                  {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Nome (opcional)" className="px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-sm text-white" />
              <input value={mUrl} onChange={(e) => setMUrl(e.target.value)} placeholder="Link (GitHub, Drive, YouTube…)" className="px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-sm text-white" />
              <input value={mDl} onChange={(e) => setMDl(e.target.value)} placeholder="Link de download (opcional, vídeo)" className="px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-sm text-white" />
              <button onClick={() => { addMaterial(mCat, mName, mUrl, mDl || undefined); setMName(''); setMUrl(''); setMDl(''); }} className="px-3 py-1.5 rounded-md bg-white/10 text-white text-sm hover:bg-white/15">Adicionar por link</button>
              <label className="px-3 py-1.5 rounded-md bg-white/10 text-white text-sm hover:bg-white/15 cursor-pointer text-center">
                Enviar arquivo
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadArquivo(f, mCat); e.currentTarget.value = ''; }} />
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10">Cancelar</button>
          <button onClick={onSave} disabled={salvando} className="px-5 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-60">{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
