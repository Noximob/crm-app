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

const fakeImoveis = [
  { img: '/public/globe.svg', title: 'Apartamento Central', price: 'R$ 450.000' },
  { img: '/public/window.svg', title: 'Casa com Piscina', price: 'R$ 850.000' },
  { img: '/public/vercel.svg', title: 'Studio Moderno', price: 'R$ 320.000' },
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

  // Cores dinâmicas do tema
  const themeBg = theme === 'dark' ? '#181C23' : theme === 'blue' ? '#3478F6' : theme === 'green' ? '#22C55E' : '#F5F6FA';
  const themeText = theme === 'dark' ? '#fff' : theme === 'blue' ? '#fff' : theme === 'green' ? '#fff' : '#2E2F38';
  const accent = theme === 'blue' ? '#3478F6' : theme === 'green' ? '#22C55E' : '#3478F6';

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
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
          {/* Preview mock - agora site modelo */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] flex flex-col items-center min-h-[600px] w-full">
            <h2 className="font-bold text-lg mb-4 text-[#2E2F38] dark:text-white">Preview do site</h2>
            <div
              className="w-full max-w-2xl rounded-xl overflow-hidden shadow-lg border border-[#E8E9F1] dark:border-[#181C23]"
              style={{ background: themeBg, color: themeText }}
            >
              {/* Menu */}
              <div className="flex items-center justify-between px-6 py-4 bg-opacity-80" style={{ background: accent }}>
                <div className="flex items-center gap-2">
                  {logo ? (
                    <img src={URL.createObjectURL(logo)} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold" style={{ color: theme === 'light' ? accent : '#fff' }}>Alume</span>
                  )}
                </div>
                <nav className="flex gap-6">
                  <span className="cursor-pointer font-medium hover:underline">Home</span>
                  <span className="cursor-pointer font-medium hover:underline">Imóveis</span>
                  {enabledSections.contato && <span className="cursor-pointer font-medium hover:underline">Contato</span>}
                </nav>
              </div>
              {/* Banner */}
              <div className="relative w-full h-48 md:h-56 flex items-center justify-center" style={{ background: accent }}>
                {banner ? (
                  <img src={URL.createObjectURL(banner)} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                ) : null}
                <div className="relative z-10 text-center w-full px-4">
                  <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: theme === 'light' ? accent : '#fff' }}>{slogan}</h1>
                  <p className="text-base md:text-lg" style={{ color: theme === 'light' ? '#2E2F38' : '#fff' }}>{about}</p>
                </div>
              </div>
              {/* Grid de imóveis */}
              <div className="px-6 py-8">
                <h3 className="text-xl font-bold mb-4" style={{ color: accent }}>Imóveis em destaque</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fakeImoveis.map((imovel, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#23283A] rounded-xl shadow p-4 flex flex-col items-center border border-[#E8E9F1] dark:border-[#181C23]">
                      <img src={imovel.img} alt={imovel.title} className="w-20 h-20 object-cover rounded mb-2" />
                      <span className="font-bold text-[#2E2F38] dark:text-white">{imovel.title}</span>
                      <span className="text-[#3478F6] font-semibold">{imovel.price}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Seções opcionais */}
              {enabledSections.depoimentos && (
                <div className="px-6 py-6 bg-[#F5F6FA] dark:bg-[#23283A]">
                  <h3 className="text-lg font-bold mb-2" style={{ color: accent }}>Depoimentos</h3>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="bg-white dark:bg-[#181C23] rounded-xl p-4 shadow flex-1">
                      <span className="text-sm">“Ótimo atendimento, encontrei meu imóvel dos sonhos!”</span>
                      <div className="mt-2 text-xs text-[#3478F6]">— Cliente Satisfeito</div>
                    </div>
                    <div className="bg-white dark:bg-[#181C23] rounded-xl p-4 shadow flex-1">
                      <span className="text-sm">“Equipe muito profissional e dedicada.”</span>
                      <div className="mt-2 text-xs text-[#3478F6]">— Maria S.</div>
                    </div>
                  </div>
                </div>
              )}
              {enabledSections.equipe && (
                <div className="px-6 py-6">
                  <h3 className="text-lg font-bold mb-2" style={{ color: accent }}>Nossa Equipe</h3>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#3478F6] flex items-center justify-center text-white font-bold">A</div>
                      <span className="text-xs mt-1">Ana</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#22C55E] flex items-center justify-center text-white font-bold">C</div>
                      <span className="text-xs mt-1">Carlos</span>
                    </div>
                  </div>
                </div>
              )}
              {enabledSections.contato && (
                <div className="px-6 py-6 bg-[#F5F6FA] dark:bg-[#23283A]">
                  <h3 className="text-lg font-bold mb-2" style={{ color: accent }}>Fale conosco</h3>
                  <form className="flex flex-col gap-2">
                    <input type="text" placeholder="Nome" className="rounded px-3 py-2 border" />
                    <input type="email" placeholder="E-mail" className="rounded px-3 py-2 border" />
                    <textarea placeholder="Mensagem" className="rounded px-3 py-2 border" />
                    <button type="button" className="bg-[#3478F6] text-white rounded px-4 py-2 font-bold mt-2">Enviar</button>
                  </form>
                </div>
              )}
              {/* Rodapé */}
              <div className="px-6 py-4 text-center text-xs" style={{ background: accent, color: '#fff' }}>
                © {new Date().getFullYear()} Imobiliária Exemplo. Todos os direitos reservados.
              </div>
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