'use client';

import React, { useState } from 'react';

const themes = [
  { name: 'Claro', value: 'light', color: '#F5F6FA' },
  { name: 'Escuro', value: 'dark', color: '#181C23' },
  { name: 'Azul', value: 'blue', color: '#3478F6' },
  { name: 'Verde', value: 'green', color: '#22C55E' },
];

const layouts = [
  { name: 'Banner grande + grid de imóveis', img: '/public/globe.svg' },
  { name: 'Vitrine lateral + destaques', img: '/public/window.svg' },
  { name: 'Depoimentos + contato', img: '/public/vercel.svg' },
];

const sections = [
  { label: 'Equipe', key: 'equipe' },
  { label: 'Blog', key: 'blog' },
  { label: 'Depoimentos', key: 'depoimentos' },
  { label: 'Formulário de contato', key: 'contato' },
];

export default function SiteBuilderPage() {
  const [theme, setTheme] = useState('light');
  const [layout, setLayout] = useState('Banner grande + grid de imóveis');
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [slogan, setSlogan] = useState('Sua nova casa está aqui!');
  const [about, setAbout] = useState('Somos especialistas em realizar sonhos imobiliários.');
  const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>({ equipe: true, blog: false, depoimentos: true, contato: true });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setLogo(e.target.files[0]);
  };
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setBanner(e.target.files[0]);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Construtor de Site</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Monte o site da sua imobiliária de forma fácil, bonita e personalizada. Visualize as mudanças em tempo real antes de publicar!</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Personalização */}
          <div className="flex flex-col gap-6">
            {/* Tema */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="font-bold text-lg mb-2 text-[#2E2F38] dark:text-white">Tema do site</h2>
              <div className="flex gap-3">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    className={`w-10 h-10 rounded-full border-2 ${theme === t.value ? 'border-[#3478F6]' : 'border-gray-300'} flex items-center justify-center`}
                    style={{ background: t.color }}
                    onClick={() => setTheme(t.value)}
                  >
                    {theme === t.value && <span className="text-white font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>
            {/* Layout */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="font-bold text-lg mb-2 text-[#2E2F38] dark:text-white">Layout</h2>
              <div className="flex gap-3">
                {layouts.map((l) => (
                  <button
                    key={l.name}
                    className={`rounded-xl border-2 ${layout === l.name ? 'border-[#3478F6]' : 'border-gray-300'} p-2 flex flex-col items-center w-28 h-24 bg-[#F5F6FA] dark:bg-[#181C23]`}
                    onClick={() => setLayout(l.name)}
                  >
                    <img src={l.img} alt={l.name} className="w-10 h-10 mb-1" />
                    <span className="text-xs text-[#2E2F38] dark:text-white text-center">{l.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Logo e banner */}
            <div className="flex gap-4">
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex-1">
                <h2 className="font-bold text-lg mb-2 text-[#2E2F38] dark:text-white">Logo</h2>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="mb-2" />
                {logo && <span className="text-xs text-[#3478F6]">{logo.name}</span>}
              </div>
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex-1">
                <h2 className="font-bold text-lg mb-2 text-[#2E2F38] dark:text-white">Banner principal</h2>
                <input type="file" accept="image/*" onChange={handleBannerChange} className="mb-2" />
                {banner && <span className="text-xs text-[#3478F6]">{banner.name}</span>}
              </div>
            </div>
            {/* Textos principais */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="font-bold text-lg mb-2 text-[#2E2F38] dark:text-white">Textos principais</h2>
              <input type="text" value={slogan} onChange={e => setSlogan(e.target.value)} className="w-full mb-2 rounded-lg border px-3 py-2 text-sm" placeholder="Slogan" />
              <textarea value={about} onChange={e => setAbout(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Sobre a imobiliária" rows={2} />
            </div>
            {/* Seções */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="font-bold text-lg mb-2 text-[#2E2F38] dark:text-white">Seções do site</h2>
              <div className="flex flex-wrap gap-3">
                {sections.map((sec) => (
                  <label key={sec.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledSections[sec.key]}
                      onChange={() => setEnabledSections(s => ({ ...s, [sec.key]: !s[sec.key] }))}
                      className="accent-[#3478F6]"
                    />
                    <span className="text-sm text-[#2E2F38] dark:text-white">{sec.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {/* Preview mock */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col items-center min-h-[500px]">
            <h2 className="font-bold text-lg mb-4 text-[#2E2F38] dark:text-white">Preview do site</h2>
            <div className="w-full h-80 bg-gradient-to-br from-[#F5F6FA] to-[#E8E9F1] dark:from-[#23283A] dark:to-[#181C23] rounded-xl flex flex-col items-center justify-center">
              {logo && <img src={URL.createObjectURL(logo)} alt="Logo" className="w-16 h-16 rounded-full mb-2 object-cover" />}
              <span className="text-2xl font-bold text-[#3478F6] mb-1">{slogan}</span>
              <span className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2 text-center">{about}</span>
              <div className="flex gap-2 mt-2">
                {Object.entries(enabledSections).map(([key, enabled]) => enabled && <span key={key} className="bg-[#3478F6] text-white rounded-full px-3 py-1 text-xs">{sections.find(s => s.key === key)?.label}</span>)}
              </div>
              <span className="mt-4 text-xs text-[#6B6F76] dark:text-gray-400">(Preview ilustrativo)</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button className="bg-[#3478F6] hover:bg-[#245bb5] text-white font-bold px-8 py-3 rounded-xl shadow transition-all">Publicar site</button>
        </div>
      </div>
    </div>
  );
} 