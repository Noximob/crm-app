'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  { id: 'unidades-selecao', name: 'Unidades da Seleção' },
  { id: 'noticia-semana', name: 'Notícia da Semana' },
  { id: 'metas-resultados', name: 'Metas & Resultados (trimestral e mensal)' },
  { id: 'funil-vendas', name: 'Funil de Vendas (corporativo e individuais)' },
];

const DURACAO_PRESETS = [
  { label: '30 seg', value: 30 },
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: 'Fixo', value: 0 },
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

export default function DashboardsTvPage() {
  const { userData } = useAuth();
  const [slides, setSlides] = useState<SlideConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const imobiliariaId = userData?.imobiliariaId;

  useEffect(() => {
    if (!imobiliariaId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const ref = doc(db, 'dashboardsTvConfig', imobiliariaId);
      const snap = await getDoc(ref);
      if (snap.exists() && Array.isArray(snap.data()?.slides)) {
        setSlides(snap.data()!.slides as SlideConfig[]);
      } else {
        setSlides(
          SLIDES_DISPONIVEIS.map(s => ({
            ...s,
            enabled: false,
            durationSeconds: 60,
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, [imobiliariaId]);

  const updateSlide = (id: string, patch: Partial<SlideConfig>) => {
    setSlides(prev =>
      prev.map(s => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const handleSave = async () => {
    if (!imobiliariaId) return;
    setSaving(true);
    setMsg(null);
    try {
      await setDoc(doc(db, 'dashboardsTvConfig', imobiliariaId), { slides }, { merge: true });
      setMsg('Configuração salva!');
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const enabledOrdered = slides.filter(s => s.enabled);
  const viewUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/admin/dashboards-tv/view` : '';

  if (!imobiliariaId) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4 flex items-center justify-center">
        <p className="text-[#6B6F76] dark:text-gray-300">Acesso restrito.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2E2F38] dark:text-white flex items-center gap-2">
              <TvIcon className="w-8 h-8 text-[#3478F6]" />
              Dashboards TV
            </h1>
            <p className="text-[#6B6F76] dark:text-gray-300 mt-1">
              Escolha as telas que rodam na TV e o tempo de cada uma
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#3478F6] text-white font-semibold hover:bg-[#255FD1] disabled:opacity-50"
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
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#3478F6] border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {slides.map((slide) => (
              <div
                key={slide.id}
                className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={slide.enabled}
                    onChange={e => updateSlide(slide.id, { enabled: e.target.checked })}
                    className="w-5 h-5 rounded border-[#3478F6] text-[#3478F6] focus:ring-[#3478F6]"
                  />
                  <span className="font-medium text-[#2E2F38] dark:text-white">{slide.name}</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6B6F76] dark:text-gray-400">Tempo:</span>
                  <select
                    value={slide.durationSeconds}
                    onChange={e => updateSlide(slide.id, { durationSeconds: Number(e.target.value) })}
                    className="px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
                  >
                    {DURACAO_PRESETS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <div className="mt-6 p-4 rounded-xl bg-[#3478F6]/10 border border-[#3478F6]/20">
              <p className="text-sm text-[#2E2F38] dark:text-gray-200">
                <strong>Como usar:</strong> marque as telas que deseja exibir, defina o tempo de cada uma (ou &quot;Fixo&quot; para deixar até trocar). 
                Clique em <strong>Abrir na TV</strong> e coloque o navegador em tela cheia na TV. As telas habilitadas rodarão em loop na ordem acima.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
