'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FunilVendasIndividualSlide } from '@/app/dashboard/admin/dashboards-tv/_components/FunilVendasIndividualSlide';
import { FunilVendasSlide } from '@/app/dashboard/admin/dashboards-tv/_components/FunilVendasSlide';
import { MetasResultadosSlide } from '@/app/dashboard/admin/dashboards-tv/_components/MetasResultadosSlide';
import { SelecaoNoxSlide } from '@/app/dashboard/admin/dashboards-tv/_components/SelecaoNoxSlide';
import { UnidadesSelecaoSlide } from '@/app/dashboard/admin/dashboards-tv/_components/UnidadesSelecaoSlide';
import { useFunilVendasData } from '@/app/dashboard/admin/dashboards-tv/_components/useFunilVendasData';
import { useMetasResultadosData } from '@/app/dashboard/admin/dashboards-tv/_components/useMetasResultadosData';
import type { ImovelSelecaoNox, NoticiaSemanaData } from '@/app/dashboard/admin/dashboards-tv/types';
import type { UnidadesSelecaoData } from '@/app/dashboard/admin/dashboards-tv/types';

function getUnidadesSelecaoIndex(slideId: string): number | null {
  if (slideId === 'unidades-selecao-0') return 0;
  if (slideId === 'unidades-selecao-1') return 1;
  if (slideId === 'unidades-selecao-2') return 2;
  return null;
}

export interface SlideConfig {
  id: string;
  name: string;
  enabled: boolean;
  durationSeconds: number;
}

const TvIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
    <polyline points="17,2 12,7 7,2" />
  </svg>
);

export default function TvPage() {
  const { userData } = useAuth();
  const [config, setConfig] = useState<SlideConfig[]>([]);
  const [selecaoNox, setSelecaoNox] = useState<{ imoveis: ImovelSelecaoNox[]; fraseRolante: string }>({ imoveis: [], fraseRolante: '' });
  const [unidadesData, setUnidadesData] = useState<UnidadesSelecaoData>({ selecoes: [] });
  const [noticiaSemana, setNoticiaSemana] = useState<NoticiaSemanaData>({ titulo: '', imageUrl: '' });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const funilData = useFunilVendasData(userData?.imobiliariaId ?? undefined);
  const metasData = useMetasResultadosData(userData?.imobiliariaId ?? undefined);

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
        const slides = (snap.data()!.slides as SlideConfig[]).filter(s => s.enabled);
        setConfig(slides);
      }
      const refSelecao = doc(db, 'dashboardsTvSelecaoNox', imobiliariaId);
      const snapSelecao = await getDoc(refSelecao);
      if (snapSelecao.exists()) {
        const d = snapSelecao.data()!;
        setSelecaoNox({
          imoveis: Array.isArray(d.imoveis) ? d.imoveis : [],
          fraseRolante: d.fraseRolante ?? '',
        });
      }
      const refUnidades = doc(db, 'dashboardsTvUnidadesSelecao', imobiliariaId);
      const snapUnidades = await getDoc(refUnidades);
      if (snapUnidades.exists()) {
        const d = snapUnidades.data()!;
        setUnidadesData({
          selecoes: Array.isArray(d.selecoes) ? d.selecoes : [],
        });
      }
      const refNoticia = doc(db, 'dashboardsTvNoticiaSemana', imobiliariaId);
      const snapNoticia = await getDoc(refNoticia);
      if (snapNoticia.exists()) {
        const d = snapNoticia.data()!;
        setNoticiaSemana({ titulo: d.titulo ?? '', imageUrl: d.imageUrl ?? '' });
      }
      setLoading(false);
    };
    load();
  }, [imobiliariaId]);

  const currentSlide = config[currentIndex];
  const duration = currentSlide?.durationSeconds ?? 60;

  const goNext = useCallback(() => {
    if (config.length <= 1) return;
    setCurrentIndex(i => (i + 1) % config.length);
  }, [config.length]);

  useEffect(() => {
    if (!currentSlide || config.length === 0) return;
    if (duration === 0) return;
    const t = setTimeout(goNext, duration * 1000);
    return () => clearTimeout(t);
  }, [currentIndex, currentSlide, duration, config.length, goNext]);

  if (!imobiliariaId) {
    return (
      <div className="min-h-screen bg-[#181C23] flex items-center justify-center text-white">
        <p>Faça login para exibir os dashboards na TV.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#181C23] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#3478F6] border-t-transparent" />
      </div>
    );
  }

  if (config.length === 0) {
    return (
      <div className="min-h-screen bg-[#181C23] flex flex-col items-center justify-center text-white p-8">
        <TvIcon className="w-16 h-16 text-[#3478F6] mb-4" />
        <p className="text-xl font-semibold mb-2">Nenhuma tela ativa</p>
        <p className="text-gray-400 text-center max-w-md">
          Configure as telas em Admin → Dashboards TV e ative pelo menos uma.
        </p>
      </div>
    );
  }

  // Conteúdo da tela "Top 3 Seleção Nox"
  if (currentSlide?.id === 'top3-selecao-nox') {
    return (
      <div className="min-h-screen flex flex-col">
        <SelecaoNoxSlide
          imoveis={selecaoNox.imoveis}
          fraseRolante={selecaoNox.fraseRolante}
        />
        {config.length > 1 && (
          <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {config.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-[#3478F6] scale-125' : 'bg-white/30'}`}
                aria-label={`Ir para ${s.name}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Conteúdo das telas "Unidades da Seleção 1/2/3" (1 slide por seleção Nox, mesmo estilo: 3 cards com foto + texto embaixo)
  const unidadesIdx = currentSlide?.id ? getUnidadesSelecaoIndex(currentSlide.id) : null;
  if (unidadesIdx !== null) {
    const titulo = selecaoNox.imoveis[unidadesIdx]?.titulo || `Seleção ${unidadesIdx + 1}`;
    const unidades = unidadesData.selecoes[unidadesIdx]?.unidades ?? [];
    return (
      <div className="min-h-screen flex flex-col">
        <UnidadesSelecaoSlide tituloSelecao={titulo} unidades={unidades} />
        {config.length > 1 && (
          <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {config.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-[#3478F6] scale-125' : 'bg-white/30'}`}
                aria-label={`Ir para ${s.name}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Notícia da Semana — 1 página: foto + título (sem rolagem)
  if (currentSlide?.id === 'noticia-semana') {
    const temConteudo = noticiaSemana.titulo?.trim() || noticiaSemana.imageUrl;
    return (
      <div className="min-h-screen flex flex-col bg-[#181C23] text-white overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0">
          {noticiaSemana.imageUrl ? (
            <div className="flex-1 min-h-0 relative">
              <img
                src={noticiaSemana.imageUrl}
                alt=""
                className="w-full h-full object-cover object-center"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-[#23283A] to-[#181C23]">
              <div className="text-center text-[#6B6F76] px-4">Sem imagem</div>
            </div>
          )}
          <div className="shrink-0 px-6 py-5 bg-[#181C23]/95 border-t border-white/10">
            <h2 className="text-xl md:text-3xl font-bold text-white text-center md:text-left">
              {noticiaSemana.titulo?.trim() || 'Notícia da Semana'}
            </h2>
          </div>
        </div>
        {!temConteudo && (
          <p className="text-center text-[#6B6F76] text-sm py-4">Configure em Admin → Dashboards TV → Editar Notícia da Semana</p>
        )}
        {config.length > 1 && (
          <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {config.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-[#3478F6] scale-125' : 'bg-white/30'}`}
                aria-label={`Ir para ${s.name}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Funil de Vendas Corporativo — total + etapas (uma página)
  if (currentSlide?.id === 'funil-vendas') {
    return (
      <div className="min-h-screen flex flex-col">
        {funilData.loading ? (
          <div className="min-h-screen flex items-center justify-center bg-[#0f1220]">
            <div className="animate-spin rounded-full h-14 w-14 border-2 border-[#3478F6] border-t-transparent" />
          </div>
        ) : (
          <FunilVendasSlide
            funilCorporativo={funilData.funilCorporativo}
            funilPorCorretor={funilData.funilPorCorretor}
            totalCorporativo={funilData.totalCorporativo}
            somenteCorporativo
          />
        )}
        {config.length > 1 && (
          <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {config.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-[#3478F6] scale-125' : 'bg-white/30'}`}
                aria-label={`Ir para ${s.name}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Funil de Vendas Individual — top 9 corretores em cards (outra página)
  if (currentSlide?.id === 'funil-vendas-individual') {
    return (
      <div className="min-h-screen flex flex-col">
        {funilData.loading ? (
          <div className="min-h-screen flex items-center justify-center bg-[#0f1220]">
            <div className="animate-spin rounded-full h-14 w-14 border-2 border-[#3478F6] border-t-transparent" />
          </div>
        ) : (
          <FunilVendasIndividualSlide funilPorCorretor={funilData.funilPorCorretor} />
        )}
        {config.length > 1 && (
          <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {config.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-[#3478F6] scale-125' : 'bg-white/30'}`}
                aria-label={`Ir para ${s.name}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Metas & Resultados — trimestral, mensal, quanto falta, quem vendeu
  if (currentSlide?.id === 'metas-resultados') {
    return (
      <div className="min-h-screen flex flex-col">
        {metasData.loading ? (
          <div className="min-h-screen flex items-center justify-center bg-[#0f1220]">
            <div className="animate-spin rounded-full h-14 w-14 border-2 border-[#3478F6] border-t-transparent" />
          </div>
        ) : (
          <MetasResultadosSlide
            metaTrimestral={metasData.metaTrimestral}
            metaMensal={metasData.metaMensal}
            contribuicoesPorCorretor={metasData.contribuicoesPorCorretor}
          />
        )}
        {config.length > 1 && (
          <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {config.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-[#3478F6] scale-125' : 'bg-white/30'}`}
                aria-label={`Ir para ${s.name}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Placeholder para outras telas (em breve)
  return (
    <div className="min-h-screen bg-[#181C23] text-white overflow-hidden flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#3478F6]/20 text-[#3478F6] mb-6">
            <TvIcon className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{currentSlide?.name}</h1>
          <p className="text-gray-400">Conteúdo desta tela em breve.</p>
          {duration > 0 && (
            <p className="text-sm text-gray-500 mt-4">Próxima tela em {duration}s</p>
          )}
        </div>
      </div>
      <div className="flex justify-center gap-2 pb-6">
        {config.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-[#3478F6] scale-125' : 'bg-gray-600'}`}
            aria-label={`Ir para ${s.name}`}
          />
        ))}
      </div>
    </div>
  );
}
