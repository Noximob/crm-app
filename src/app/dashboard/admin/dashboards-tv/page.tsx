'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AgendaTvSlide } from './_components/AgendaTvSlide';
import { FunilVendasIndividualSlide } from './_components/FunilVendasIndividualSlide';
import { FunilVendasSlide } from './_components/FunilVendasSlide';
import { MetasResultadosSlide } from './_components/MetasResultadosSlide';
import { useAgendaTvData } from './_components/useAgendaTvData';
import { useFunilVendasData } from './_components/useFunilVendasData';
import { useMetasResultadosData } from './_components/useMetasResultadosData';
import type { ImovelSelecaoNox, NoticiaSemanaData, UnidadeSelecao, UnidadesSelecaoData } from './types';

export interface SlideConfig {
  id: string;
  name: string;
  enabled: boolean;
  durationSeconds: number; // 0 = fixo (fica até trocar manualmente)
}

const SLIDES_DISPONIVEIS: Omit<SlideConfig, 'enabled' | 'durationSeconds'>[] = [
  { id: 'agenda-semana', name: 'Agenda da Semana' },
  { id: 'agenda-dia', name: 'Agenda do Dia' },
  { id: 'ranking', name: 'Ranking (mensal/semanal/diário)' },
  { id: 'top3-selecao-nox', name: 'Top 3 Seleção Nox' },
  { id: 'unidades-selecao-0', name: 'Seleção Nox 1 - Unidades' },
  { id: 'unidades-selecao-1', name: 'Seleção Nox 2 - Unidades' },
  { id: 'unidades-selecao-2', name: 'Seleção Nox 3 - Unidades' },
  { id: 'noticia-semana', name: 'Notícia da Semana' },
  { id: 'metas-resultados', name: 'Metas & Resultados (trimestral e mensal)' },
  { id: 'funil-vendas', name: 'Funil de Vendas Corporativo' },
  { id: 'funil-vendas-individual', name: 'Funil de Vendas Individual' },
];

const DURACAO_PRESETS = [
  { label: '5 seg', value: 5 },
  { label: '10 seg', value: 10 },
  { label: '15 seg', value: 15 },
  { label: '30 seg', value: 30 },
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
];

const TvIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
    <polyline points="17,2 12,7 7,2" />
  </svg>
);
const ExternalIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const PencilIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const IMOVEL_VAZIO: ImovelSelecaoNox = { imageUrl: '', titulo: '', local: '', preco: '' };
const UNIDADE_VAZIA: UnidadeSelecao = { imageUrl: '', titulo: '', valor: '', descritivo: '' };

function defaultUnidadesSelecao(): UnidadesSelecaoData {
  return {
    selecoes: [
      { unidades: [UNIDADE_VAZIA, UNIDADE_VAZIA, UNIDADE_VAZIA] },
      { unidades: [UNIDADE_VAZIA, UNIDADE_VAZIA, UNIDADE_VAZIA] },
      { unidades: [UNIDADE_VAZIA, UNIDADE_VAZIA, UNIDADE_VAZIA] },
    ],
  };
}

export default function DashboardsTvPage() {
  const { userData } = useAuth();
  const [slides, setSlides] = useState<SlideConfig[]>([]);
  const [selecaoNox, setSelecaoNox] = useState<{ imoveis: ImovelSelecaoNox[]; fraseRolante: string }>({
    imoveis: [IMOVEL_VAZIO, IMOVEL_VAZIO, IMOVEL_VAZIO],
    fraseRolante: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSelecao, setSavingSelecao] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<number | null>(null);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [unidadesSelecao, setUnidadesSelecao] = useState<UnidadesSelecaoData>(defaultUnidadesSelecao);
  const [savingUnidades, setSavingUnidades] = useState(false);
  const [uploadingPhotoUnidad, setUploadingPhotoUnidad] = useState<string | null>(null);
  const [noticiaSemana, setNoticiaSemana] = useState<NoticiaSemanaData>({ titulo: '', imageUrl: '' });
  const [savingNoticia, setSavingNoticia] = useState(false);
  const [uploadingPhotoNoticia, setUploadingPhotoNoticia] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const fileInputRefsUnidades = useRef<(HTMLInputElement | null)[]>([]);
  const fileInputRefNoticia = useRef<HTMLInputElement | null>(null);
  const [previewFunil, setPreviewFunil] = useState<'corporativo' | 'individual' | null>(null);
  const [previewMetas, setPreviewMetas] = useState(false);
  const [previewAgenda, setPreviewAgenda] = useState<'day' | 'week' | null>(null);
  const [agendaFraseSemana, setAgendaFraseSemana] = useState('');
  const [corretoresVisiveisIds, setCorretoresVisiveisIds] = useState<string[]>([]);
  const [corretoresStatusTv, setCorretoresStatusTv] = useState<Record<string, 'tarefa_atrasada' | 'tarefa_dia' | 'sem_tarefa'>>({});
  const [listaCorretores, setListaCorretores] = useState<{ id: string; nome: string }[]>([]);
  const imobiliariaId = userData?.imobiliariaId;
  const funilData = useFunilVendasData(imobiliariaId ?? undefined, corretoresVisiveisIds);
  const metasData = useMetasResultadosData(imobiliariaId ?? undefined);
  const agendaTvData = useAgendaTvData(imobiliariaId ?? undefined, corretoresVisiveisIds, corretoresStatusTv);
  useEffect(() => {
    if (!imobiliariaId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const ref = doc(db, 'dashboardsTvConfig', imobiliariaId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data()!;
        setAgendaFraseSemana(data.agendaFraseSemana ?? '');
        if (Array.isArray(data.corretoresVisiveisIds)) {
          setCorretoresVisiveisIds(data.corretoresVisiveisIds as string[]);
        }
        if (data.corretoresStatusTv && typeof data.corretoresStatusTv === 'object') {
          setCorretoresStatusTv(data.corretoresStatusTv as Record<string, 'tarefa_atrasada' | 'tarefa_dia' | 'sem_tarefa'>);
        }
        if (Array.isArray(data.slides)) {
        const raw = data.slides as SlideConfig[];
        const migrated = raw.map(s => s.id === 'unidades-selecao' ? { ...s, id: 'unidades-selecao-0' as const, name: 'Seleção Nox 1 - Unidades' } : s);
        // Sempre exibir os 3 slides de Unidades separados: merge com a lista padrão para não faltar nenhum
        const defaultSlides = SLIDES_DISPONIVEIS.map(s => ({ ...s, enabled: false, durationSeconds: 60 }));
        const merged = defaultSlides.map(def => {
          const found = migrated.find(m => m.id === def.id);
          return found ? { ...def, ...found } : def;
        });
        setSlides(merged);
        }
      }
      if (!snap.exists() || !Array.isArray(snap.data()?.slides)) {
        setSlides(
          SLIDES_DISPONIVEIS.map(s => ({
            ...s,
            enabled: false,
            durationSeconds: 60,
          }))
        );
      }
      const refSelecao = doc(db, 'dashboardsTvSelecaoNox', imobiliariaId);
      const snapSelecao = await getDoc(refSelecao);
      if (snapSelecao.exists()) {
        const d = snapSelecao.data()!;
        const imoveis = Array.isArray(d.imoveis) ? d.imoveis : [];
        setSelecaoNox({
          imoveis: [
            imoveis[0] ?? IMOVEL_VAZIO,
            imoveis[1] ?? IMOVEL_VAZIO,
            imoveis[2] ?? IMOVEL_VAZIO,
          ],
          fraseRolante: d.fraseRolante ?? '',
        });
      }
      const refUnidades = doc(db, 'dashboardsTvUnidadesSelecao', imobiliariaId);
      const snapUnidades = await getDoc(refUnidades);
      if (snapUnidades.exists()) {
        const d = snapUnidades.data()!;
        const sel = Array.isArray(d.selecoes) ? d.selecoes : [];
        setUnidadesSelecao({
          selecoes: [
            sel[0] ?? { unidades: [UNIDADE_VAZIA, UNIDADE_VAZIA, UNIDADE_VAZIA] },
            sel[1] ?? { unidades: [UNIDADE_VAZIA, UNIDADE_VAZIA, UNIDADE_VAZIA] },
            sel[2] ?? { unidades: [UNIDADE_VAZIA, UNIDADE_VAZIA, UNIDADE_VAZIA] },
          ],
        });
      }
      const refNoticia = doc(db, 'dashboardsTvNoticiaSemana', imobiliariaId);
      const snapNoticia = await getDoc(refNoticia);
      if (snapNoticia.exists()) {
        const d = snapNoticia.data()!;
        setNoticiaSemana({ titulo: d.titulo ?? '', imageUrl: d.imageUrl ?? '' });
      }
      const qUsuarios = query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', imobiliariaId),
        where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo'])
      );
      const snapUsuarios = await getDocs(qUsuarios);
      setListaCorretores(snapUsuarios.docs.map((d) => ({ id: d.id, nome: (d.data().nome as string) || d.data().email || 'Sem nome' })));
      setLoading(false);
    };
    load();
  }, [imobiliariaId]);

  const updateSlide = (id: string, patch: Partial<SlideConfig>) => {
    setSlides(prev =>
      prev.map(s => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const moveSlide = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= slides.length) return;
    setSlides(prev => {
      const next = [...prev];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!imobiliariaId) return;
    setSaving(true);
    setMsg(null);
    try {
      await setDoc(
        doc(db, 'dashboardsTvConfig', imobiliariaId),
        {
          slides,
          agendaFraseSemana: agendaFraseSemana || null,
          corretoresVisiveisIds: corretoresVisiveisIds.length ? corretoresVisiveisIds : null,
          corretoresStatusTv: Object.keys(corretoresStatusTv).length ? corretoresStatusTv : null,
        },
        { merge: true }
      );
      setMsg('Configuração salva!');
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const updateSelecaoImovel = (index: number, patch: Partial<ImovelSelecaoNox>) => {
    setSelecaoNox(prev => ({
      ...prev,
      imoveis: prev.imoveis.map((im, i) => (i === index ? { ...im, ...patch } : im)),
    }));
  };

  const handleSaveSelecaoNox = async () => {
    if (!imobiliariaId) return;
    setSavingSelecao(true);
    setMsg(null);
    try {
      await setDoc(doc(db, 'dashboardsTvSelecaoNox', imobiliariaId), selecaoNox, { merge: true });
      setMsg('Seleção Nox salva!');
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg('Erro ao salvar Seleção Nox.');
    } finally {
      setSavingSelecao(false);
    }
  };

  const handleUploadFoto = async (idx: number, file: File | null) => {
    if (!imobiliariaId || !file || !file.type.startsWith('image/')) return;
    setUploadingPhoto(idx);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `dashboardsTvSelecaoNox/${imobiliariaId}/imovel_${idx}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateSelecaoImovel(idx, { imageUrl: url });
    } catch (e) {
      setMsg('Erro ao enviar foto.');
      setTimeout(() => setMsg(null), 3000);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const updateUnidad = (selecaoIdx: number, unidadIdx: number, patch: Partial<UnidadeSelecao>) => {
    setUnidadesSelecao(prev => ({
      ...prev,
      selecoes: prev.selecoes.map((s, si) =>
        si !== selecaoIdx ? s : {
          ...s,
          unidades: s.unidades.map((u, ui) => (ui !== unidadIdx ? u : { ...u, ...patch })),
        }
      ),
    }));
  };

  const handleUploadFotoUnidad = async (selecaoIdx: number, unidadIdx: number, file: File | null) => {
    if (!imobiliariaId || !file || !file.type.startsWith('image/')) return;
    const key = `${selecaoIdx}-${unidadIdx}`;
    setUploadingPhotoUnidad(key);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `dashboardsTvUnidadesSelecao/${imobiliariaId}/s${selecaoIdx}_u${unidadIdx}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateUnidad(selecaoIdx, unidadIdx, { imageUrl: url });
    } catch (e) {
      setMsg('Erro ao enviar foto.');
      setTimeout(() => setMsg(null), 3000);
    } finally {
      setUploadingPhotoUnidad(null);
    }
  };

  const handleSaveUnidadesSelecao = async () => {
    if (!imobiliariaId) return;
    setSavingUnidades(true);
    setMsg(null);
    try {
      await setDoc(doc(db, 'dashboardsTvUnidadesSelecao', imobiliariaId), unidadesSelecao, { merge: true });
      setMsg('Unidades da Seleção salvas!');
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg('Erro ao salvar.');
    } finally {
      setSavingUnidades(false);
    }
  };

  const handleSaveNoticiaSemana = async () => {
    if (!imobiliariaId) return;
    setSavingNoticia(true);
    setMsg(null);
    try {
      await setDoc(doc(db, 'dashboardsTvNoticiaSemana', imobiliariaId), noticiaSemana, { merge: true });
      setMsg('Notícia da Semana salva!');
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg('Erro ao salvar Notícia da Semana.');
    } finally {
      setSavingNoticia(false);
    }
  };

  const handleUploadFotoNoticia = async (file: File | null) => {
    if (!imobiliariaId || !file || !file.type.startsWith('image/')) return;
    setUploadingPhotoNoticia(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `dashboardsTvNoticiaSemana/${imobiliariaId}/foto_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setNoticiaSemana(prev => ({ ...prev, imageUrl: url }));
    } catch (e) {
      setMsg('Erro ao enviar foto.');
      setTimeout(() => setMsg(null), 3000);
    } finally {
      setUploadingPhotoNoticia(false);
    }
  };

  const enabledOrdered = slides.filter(s => s.enabled);
  const viewUrl = typeof window !== 'undefined' ? `${window.location.origin}/tv` : '';

  if (!imobiliariaId) {
    return (
      <div className="min-h-full py-8 px-4 flex items-center justify-center">
        <p className="text-text-secondary">Acesso restrito.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] flex items-center gap-2">
              <TvIcon className="w-7 h-7 text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)]" />
              Dashboards TV
            </h1>
            <p className="text-text-secondary mt-1">
              Escolha as telas que rodam na TV e o tempo de cada uma
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {viewUrl && (
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3AC17C] text-white font-semibold hover:bg-[#2ea86a]"
              >
                <ExternalIcon className="w-4 h-4" />
                Abrir na TV
              </a>
            )}
          </div>
        </div>

        {msg && (
          <div className="mb-4 p-3 rounded-lg bg-[#3AC17C]/20 text-[#3AC17C] border border-[#3AC17C]/40">
            {msg}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FF1E56] border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary mb-2">Use as setas para definir a ordem em que os slides aparecem na TV. Depois clique em Salvar.</p>
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="al-card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveSlide(index, 'up')}
                    disabled={index === 0}
                    className="p-2 rounded-lg border border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Subir na ordem"
                    aria-label="Subir"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(index, 'down')}
                    disabled={index === slides.length - 1}
                    className="p-2 rounded-lg border border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Descer na ordem"
                    aria-label="Descer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={slide.enabled}
                    onChange={e => updateSlide(slide.id, { enabled: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 accent-[#FF1E56] text-[#FF1E56] focus:ring-[#FF1E56]"
                  />
                  <span className="font-medium text-white">{slide.name}</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary">Tempo:</span>
                  <select
                    value={slide.durationSeconds}
                    onChange={e => updateSlide(slide.id, { durationSeconds: Number(e.target.value) })}
                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  >
                    {DURACAO_PRESETS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  {(slide.id === 'funil-vendas' || slide.id === 'funil-vendas-individual') && (
                    <button
                      type="button"
                      onClick={() => setPreviewFunil(slide.id === 'funil-vendas' ? 'corporativo' : 'individual')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#FF1E56]/10 text-[#FF7A97] hover:bg-[#FF1E56]/20"
                      title="Ver como ficará na TV"
                    >
                      <TvIcon className="w-4 h-4" />
                      Visualizar
                    </button>
                  )}
                  {slide.id === 'metas-resultados' && (
                    <button
                      type="button"
                      onClick={() => setPreviewMetas(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#FF1E56]/10 text-[#FF7A97] hover:bg-[#FF1E56]/20"
                      title="Ver como ficará na TV"
                    >
                      <TvIcon className="w-4 h-4" />
                      Visualizar
                    </button>
                  )}
                  {(slide.id === 'agenda-dia' || slide.id === 'agenda-semana') && (
                    <button
                      type="button"
                      onClick={() => setPreviewAgenda(slide.id === 'agenda-dia' ? 'day' : 'week')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#FF1E56]/10 text-[#FF7A97] hover:bg-[#FF1E56]/20"
                      title="Ver como ficará na TV"
                    >
                      <TvIcon className="w-4 h-4" />
                      Visualizar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingSlideId(slide.id === editingSlideId ? null : slide.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      slide.id === 'top3-selecao-nox' || slide.id.startsWith('unidades-selecao-') || slide.id === 'noticia-semana'
                        ? 'bg-[#FF1E56]/10 text-[#FF7A97] hover:bg-[#FF1E56]/20'
                        : 'bg-white/[0.06] text-text-secondary cursor-not-allowed'
                    }`}
                    title={slide.id === 'top3-selecao-nox' || slide.id.startsWith('unidades-selecao-') || slide.id === 'noticia-semana' ? 'Editar conteúdo desta tela' : 'Em breve'}
                    disabled={slide.id !== 'top3-selecao-nox' && !slide.id.startsWith('unidades-selecao-') && slide.id !== 'noticia-semana'}
                  >
                    <PencilIcon className="w-4 h-4" />
                    Editar
                  </button>
                </div>
              </div>
            ))}

            {/* Corretores visíveis na TV — Agenda do Dia (cards) e Funil de Vendas */}
            <div className="al-card p-4">
              <h3 className="font-semibold text-white mb-1">Corretores visíveis na TV</h3>
              <p className="text-sm text-text-secondary mb-3">
                Quem aparece nos cards da Agenda do Dia e no Funil de Vendas. Deixe todos desmarcados para mostrar todos; marque só quem usa CRM/leads.
              </p>
              <div className="flex flex-wrap gap-3">
                {listaCorretores.map((c) => {
                  const checked = corretoresVisiveisIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setCorretoresVisiveisIds((prev) =>
                            prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                          );
                        }}
                        className="w-4 h-4 rounded border-white/20 accent-[#FF1E56] text-[#FF1E56] focus:ring-[#FF1E56]"
                      />
                      <span className="text-sm text-white">{c.nome}</span>
                    </label>
                  );
                })}
              </div>
              {listaCorretores.length === 0 && <p className="text-sm text-text-secondary">Nenhum usuário encontrado.</p>}
            </div>

            {/* Status manual dos corretores na TV */}
            <div className="al-card p-4">
              <h3 className="font-semibold text-white mb-1">Status dos corretores na TV</h3>
              <p className="text-sm text-text-secondary mb-3">
                Defina manualmente se cada corretor está com tarefa atrasada, tarefa do dia ou sem tarefa. O status de <strong>+24h sem usar CRM</strong> é calculado automaticamente.
              </p>
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {(corretoresVisiveisIds.length ? listaCorretores.filter((c) => corretoresVisiveisIds.includes(c.id)) : listaCorretores).map(
                  (c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-white truncate">{c.nome}</span>
                      <select
                        value={corretoresStatusTv[c.id] ?? 'sem_tarefa'}
                        onChange={(e) =>
                          setCorretoresStatusTv((prev) => ({
                            ...prev,
                            [c.id]: e.target.value as 'tarefa_atrasada' | 'tarefa_dia' | 'sem_tarefa',
                          }))
                        }
                        className="text-xs px-2 py-1 rounded-md border border-white/10 bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                      >
                        <option value="tarefa_atrasada">Tarefa atrasada</option>
                        <option value="tarefa_dia">Tarefa do dia</option>
                        <option value="sem_tarefa">Sem tarefa</option>
                      </select>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Frase da semana — 8º quadrado da Agenda da Semana na TV */}
            <div className="al-card p-4">
              <h3 className="font-semibold text-white mb-2">Frase da semana (Agenda da Semana na TV)</h3>
              <p className="text-sm text-text-secondary mb-3">
                Aparece no 8º quadrado. Se vazio, usa a frase do dia: domingo &quot;Começamos a semana&quot;, sexta &quot;Quase acabando&quot;, sábado &quot;Estamos acabando&quot;, etc.
              </p>
              <input
                type="text"
                value={agendaFraseSemana}
                onChange={e => setAgendaFraseSemana(e.target.value)}
                placeholder="Ex: Foco total essa semana!"
                className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
              />
              <p className="text-xs text-text-secondary mt-1">Salve a configuração (botão Salvar no topo) para gravar a frase.</p>
            </div>

            {/* Configurar Seleção Nox — só quando clicar em Editar */}
            {editingSlideId === 'top3-selecao-nox' && (
              <div className="mt-4 al-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Configurar Top 3 Seleção Nox</h2>
                  <button
                    type="button"
                    onClick={() => setEditingSlideId(null)}
                    className="text-sm text-text-secondary hover:text-[#FF5C7E]"
                  >
                    Fechar
                  </button>
                </div>
                <p className="text-sm text-text-secondary mb-6">Três espaços para foto e texto (como na TV). Embaixo, a frase que passa na faixa rolante.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="rounded-xl border border-white/[0.08] p-4 bg-white/[0.03]">
                      <h3 className="font-semibold text-[#FF7A97] mb-3">Imóvel {idx + 1}</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">Foto do imóvel</label>
                          <div className="h-28 rounded-lg overflow-hidden bg-black/40 border border-white/10 relative">
                            {selecaoNox.imoveis[idx]?.imageUrl ? (
                              <img
                                src={selecaoNox.imoveis[idx].imageUrl}
                                alt={`Imóvel ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">
                                Nenhuma foto
                              </div>
                            )}
                            <input
                              ref={el => { fileInputRefs.current[idx] = el; }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingPhoto !== null}
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadFoto(idx, f);
                                e.target.value = '';
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[idx]?.click()}
                              disabled={uploadingPhoto !== null}
                              className="absolute bottom-1 right-1 px-2 py-1 rounded text-xs font-medium bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white disabled:opacity-50"
                            >
                              {uploadingPhoto === idx ? 'Enviando...' : selecaoNox.imoveis[idx]?.imageUrl ? 'Trocar' : 'Enviar foto'}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">Título</label>
                          <input
                            type="text"
                            value={selecaoNox.imoveis[idx]?.titulo ?? ''}
                            onChange={e => updateSelecaoImovel(idx, { titulo: e.target.value })}
                            placeholder="Ex: Apartamento frente mar na planta..."
                            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white bg-white/[0.04] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">Local</label>
                          <input
                            type="text"
                            value={selecaoNox.imoveis[idx]?.local ?? ''}
                            onChange={e => updateSelecaoImovel(idx, { local: e.target.value })}
                            placeholder="Ex: Tabuleiro, Barra Velha"
                            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white bg-white/[0.04] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">Preço (R$)</label>
                          <input
                            type="text"
                            value={selecaoNox.imoveis[idx]?.preco ?? ''}
                            onChange={e => updateSelecaoImovel(idx, { preco: e.target.value })}
                            placeholder="Ex: 936.408,50"
                            className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white bg-white/[0.04] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white mb-2">Frase da faixa rolante (passa embaixo dos 3 imóveis)</label>
                  <input
                    type="text"
                    value={selecaoNox.fraseRolante}
                    onChange={e => setSelecaoNox(prev => ({ ...prev, fraseRolante: e.target.value }))}
                    placeholder="Ex: Seleção Nox — os melhores imóveis para você. Consulte-nos!"
                    className="w-full rounded-lg border border-white/10 px-4 py-3 text-white bg-white/[0.04] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveSelecaoNox}
                  disabled={savingSelecao}
                  className="px-4 py-2 rounded-lg bg-[#3AC17C] text-white font-semibold hover:bg-[#2ea86a] disabled:opacity-50"
                >
                  {savingSelecao ? 'Salvando...' : 'Salvar Seleção Nox'}
                </button>
              </div>
            )}

            {/* Configurar Unidades — 1 painel por slide: ao editar "Seleção Nox 1 - Unidades" só mostra as 3 unidades dessa seleção */}
            {(editingSlideId === 'unidades-selecao-0' || editingSlideId === 'unidades-selecao-1' || editingSlideId === 'unidades-selecao-2') && (() => {
              const selecaoIdx = editingSlideId === 'unidades-selecao-0' ? 0 : editingSlideId === 'unidades-selecao-1' ? 1 : 2;
              const tituloSelecao = selecaoNox.imoveis[selecaoIdx]?.titulo || `Seleção Nox ${selecaoIdx + 1}`;
              return (
                <div className="mt-4 al-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Unidades — {tituloSelecao}</h2>
                    <button
                      type="button"
                      onClick={() => setEditingSlideId(null)}
                      className="text-sm text-text-secondary hover:text-[#FF5C7E]"
                    >
                      Fechar
                    </button>
                  </div>
                  <p className="text-sm text-text-secondary mb-6">
                    As 3 unidades que aparecem no slide &quot;Seleção Nox {selecaoIdx + 1} - Unidades&quot; na TV. Cada uma: foto, título, valor e descritivo (por que a unidade é boa).
                  </p>
                  <div className="space-y-5 mb-6">
                    {[0, 1, 2].map((unidadIdx) => {
                      const key = `${selecaoIdx}-${unidadIdx}`;
                      const flatIdx = selecaoIdx * 3 + unidadIdx;
                      const u = unidadesSelecao.selecoes[selecaoIdx]?.unidades[unidadIdx] ?? UNIDADE_VAZIA;
                      return (
                        <div key={unidadIdx} className="rounded-xl border border-white/[0.08] p-4 bg-white/[0.03]">
                          <p className="text-sm font-semibold text-[#FF7A97] mb-3">Unidade {unidadIdx + 1}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-text-secondary mb-1">Foto</label>
                              <div className="h-28 rounded-lg overflow-hidden bg-black/40 border border-white/10 relative">
                                {u.imageUrl ? (
                                  <img src={u.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">Sem foto</div>
                                )}
                                <input
                                  ref={el => { fileInputRefsUnidades.current[flatIdx] = el; }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (f) handleUploadFotoUnidad(selecaoIdx, unidadIdx, f);
                                    e.target.value = '';
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => fileInputRefsUnidades.current[flatIdx]?.click()}
                                  disabled={uploadingPhotoUnidad !== null}
                                  className="absolute bottom-1 right-1 px-2 py-1 rounded text-xs font-medium bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white disabled:opacity-50"
                                >
                                  {uploadingPhotoUnidad === key ? 'Enviando...' : u.imageUrl ? 'Trocar' : 'Enviar foto'}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1">Título</label>
                                <input
                                  type="text"
                                  value={u.titulo}
                                  onChange={e => updateUnidad(selecaoIdx, unidadIdx, { titulo: e.target.value })}
                                  placeholder="Título da unidade"
                                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white bg-white/[0.04] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1">Valor (R$)</label>
                                <input
                                  type="text"
                                  value={u.valor}
                                  onChange={e => updateUnidad(selecaoIdx, unidadIdx, { valor: e.target.value })}
                                  placeholder="Ex: 936.408,50"
                                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white bg-white/[0.04] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1">Descritivo (por que essa unidade é boa)</label>
                                <textarea
                                  value={u.descritivo}
                                  onChange={e => updateUnidad(selecaoIdx, unidadIdx, { descritivo: e.target.value })}
                                  placeholder="Explicação..."
                                  rows={3}
                                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white bg-white/[0.04] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 resize-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveUnidadesSelecao}
                    disabled={savingUnidades}
                    className="px-4 py-2 rounded-lg bg-[#3AC17C] text-white font-semibold hover:bg-[#2ea86a] disabled:opacity-50"
                  >
                    {savingUnidades ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              );
            })()}

            {/* Configurar Notícia da Semana — 1 título + 1 foto para a TV */}
            {editingSlideId === 'noticia-semana' && (
              <div className="mt-4 al-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Notícia da Semana</h2>
                  <button
                    type="button"
                    onClick={() => setEditingSlideId(null)}
                    className="text-sm text-text-secondary hover:text-[#FF5C7E]"
                  >
                    Fechar
                  </button>
                </div>
                <p className="text-sm text-text-secondary mb-6">
                  Um título e uma foto que aparecem em uma tela na TV (ex.: destaque do blog, atualização de mercado). Você escreve o texto para chamar atenção da equipe.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Título (chamada da notícia)</label>
                    <input
                      type="text"
                      value={noticiaSemana.titulo}
                      onChange={e => setNoticiaSemana(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Balneário Piçarras entre as 10 mais desejadas do Brasil"
                      className="w-full rounded-lg border border-white/10 px-4 py-3 text-white bg-white/[0.04] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Foto</label>
                    <div className="h-40 rounded-xl overflow-hidden bg-black/40 border border-white/10 relative">
                      {noticiaSemana.imageUrl ? (
                        <img src={noticiaSemana.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm">Nenhuma foto</div>
                      )}
                      <input
                        ref={fileInputRefNoticia}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadFotoNoticia(f);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefNoticia.current?.click()}
                        disabled={uploadingPhotoNoticia}
                        className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white disabled:opacity-50"
                      >
                        {uploadingPhotoNoticia ? 'Enviando...' : noticiaSemana.imageUrl ? 'Trocar' : 'Enviar foto'}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveNoticiaSemana}
                  disabled={savingNoticia}
                  className="px-4 py-2 rounded-lg bg-[#3AC17C] text-white font-semibold hover:bg-[#2ea86a] disabled:opacity-50"
                >
                  {savingNoticia ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}

            <div className="mt-6 p-4 rounded-xl bg-white/[0.04] border border-white/10">
              <p className="text-sm text-text-secondary">
                <strong>Como usar:</strong> marque as telas que deseja exibir e defina o tempo de cada uma. 
                Clique em <strong>Abrir na TV</strong> para abrir em nova aba <strong>sem menu lateral</strong> — coloque em tela cheia na TV. As telas habilitadas rodarão em loop.
              </p>
            </div>
          </div>
        )}

        {/* Modal Visualizar Funil de Vendas (Corporativo ou Individual) */}
        {previewFunil && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#0f1220]">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-[#151b2d] border-b border-white/10">
              <span className="text-white font-semibold">
                Prévia — Como ficará na TV ({previewFunil === 'corporativo' ? 'Funil Corporativo' : 'Funil Individual'})
              </span>
              <button
                type="button"
                onClick={() => setPreviewFunil(null)}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              {funilData.loading ? (
                <div className="flex items-center justify-center min-h-[50vh]">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#FF1E56] border-t-transparent" />
                </div>
              ) : previewFunil === 'corporativo' ? (
                <FunilVendasSlide
                  funilCorporativo={funilData.funilCorporativo}
                  funilPorCorretor={funilData.funilPorCorretor}
                  totalCorporativo={funilData.totalCorporativo}
                  compact
                  somenteCorporativo
                />
              ) : (
                <FunilVendasIndividualSlide funilPorCorretor={funilData.funilPorCorretor} compact />
              )}
            </div>
          </div>
        )}

        {/* Modal Visualizar Metas & Resultados */}
        {previewMetas && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#0f1220]">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-[#151b2d] border-b border-white/10">
              <span className="text-white font-semibold">Prévia — Metas & Resultados (como ficará na TV)</span>
              <button
                type="button"
                onClick={() => setPreviewMetas(false)}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              {metasData.loading ? (
                <div className="flex items-center justify-center min-h-[50vh]">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#FF1E56] border-t-transparent" />
                </div>
              ) : (
                <MetasResultadosSlide
                  metaTrimestral={metasData.metaTrimestral}
                  metaMensal={metasData.metaMensal}
                  contribuicoesPorCorretor={metasData.contribuicoesPorCorretor}
                />
              )}
            </div>
          </div>
        )}

        {/* Modal Visualizar Agenda (Dia ou Semana) */}
        {previewAgenda && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#0f1220]">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-[#151b2d] border-b border-white/10">
              <span className="text-white font-semibold">Prévia — {previewAgenda === 'day' ? 'Agenda do Dia' : 'Agenda da Semana'}</span>
              <button
                type="button"
                onClick={() => setPreviewAgenda(null)}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              {agendaTvData.loading ? (
                <div className="flex items-center justify-center min-h-[50vh]">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#FF1E56] border-t-transparent" />
                </div>
              ) : (
                <AgendaTvSlide
                  events={agendaTvData.events}
                  plantoes={agendaTvData.plantoes}
                  fraseSemana={agendaFraseSemana}
                  mode={previewAgenda}
                  agendaCorporativaItems={agendaTvData.agendaCorporativaItems}
                  corretoresStatus={agendaTvData.corretoresStatus}
                  corretoresStatusLoading={agendaTvData.corretoresStatusLoading}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
