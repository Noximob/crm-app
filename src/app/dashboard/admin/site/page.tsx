'use client';

import React, { useState } from 'react';

const defaultSections = [
  { key: 'banner', label: 'Banner', enabled: true },
  { key: 'imoveis', label: 'Imóveis', enabled: true },
  { key: 'depoimentos', label: 'Depoimentos', enabled: true },
  { key: 'equipe', label: 'Equipe', enabled: true },
  { key: 'contato', label: 'Contato', enabled: true },
  { key: 'rodape', label: 'Rodapé', enabled: true },
];

const palettes = [
  { name: 'Azul', main: '#3478F6', bg: '#F5F6FA', text: '#2E2F38' },
  { name: 'Verde', main: '#22C55E', bg: '#F5F6FA', text: '#2E2F38' },
  { name: 'Escuro', main: '#23283A', bg: '#181C23', text: '#fff' },
];

const fonts = [
  { name: 'Sans', class: 'font-sans' },
  { name: 'Serif', class: 'font-serif' },
  { name: 'Mono', class: 'font-mono' },
];

export default function SiteBuilderPage() {
  const [sections, setSections] = useState(defaultSections);
  const [activeSection, setActiveSection] = useState('banner');
  const [palette, setPalette] = useState(palettes[0]);
  const [font, setFont] = useState(fonts[0]);
  const [logo, setLogo] = useState<File | null>(null);
  const [bannerImg, setBannerImg] = useState<File | null>(null);
  const [bannerTitle, setBannerTitle] = useState('Sua nova casa está aqui!');
  const [bannerSubtitle, setBannerSubtitle] = useState('Encontre o imóvel dos seus sonhos com a Alume.');
  const [imoveis, setImoveis] = useState([
    { img: '/public/globe.svg', title: 'Apartamento Central', price: 'R$ 450.000' },
    { img: '/public/window.svg', title: 'Casa com Piscina', price: 'R$ 850.000' },
    { img: '/public/vercel.svg', title: 'Studio Moderno', price: 'R$ 320.000' },
  ]);
  const [showMobile, setShowMobile] = useState(false);

  // Funções de edição
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setLogo(e.target.files[0]);
  };
  const handleBannerImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setBannerImg(e.target.files[0]);
  };
  const handleSectionToggle = (key: string) => {
    setSections(sections => sections.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s));
  };
  const handleSectionSelect = (key: string) => setActiveSection(key);
  // Drag-and-drop mock (troca de ordem)
  const moveSection = (from: number, to: number) => {
    if (from === to) return;
    const updated = [...sections];
    const [removed] = updated.splice(from, 1);
    updated.splice(to, 0, removed);
    setSections(updated);
  };

  // Paleta e fonte
  const mainColor = palette.main;
  const bgColor = palette.bg;
  const textColor = palette.text;
  const fontClass = font.class;

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-2 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        {/* Menu lateral de seções */}
        <aside className="w-full md:w-64 flex-shrink-0 bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-4 flex flex-col gap-6 h-fit sticky top-8">
          <h2 className="font-bold text-lg mb-2 text-[#2E2F38] dark:text-white">Seções do site</h2>
          <ul className="flex flex-col gap-2">
            {sections.map((sec, idx) => (
              <li key={sec.key} className="flex items-center gap-2 group">
                <button
                  className={`flex-1 text-left px-3 py-2 rounded-lg transition-all ${activeSection === sec.key ? 'bg-[#3478F6] text-white' : 'hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] text-[#2E2F38] dark:text-white'}`}
                  onClick={() => handleSectionSelect(sec.key)}
                  disabled={!sec.enabled}
                >
                  {sec.label}
                </button>
                <input type="checkbox" checked={sec.enabled} onChange={() => handleSectionToggle(sec.key)} />
                {/* Drag-and-drop mock */}
                <button
                  className="text-xs text-gray-400 group-hover:text-[#3478F6]"
                  onClick={() => idx > 0 && moveSection(idx, idx - 1)}
                  title="Mover para cima"
                >▲</button>
                <button
                  className="text-xs text-gray-400 group-hover:text-[#3478F6]"
                  onClick={() => idx < sections.length - 1 && moveSection(idx, idx + 1)}
                  title="Mover para baixo"
                >▼</button>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <h3 className="font-bold text-sm mb-1 text-[#2E2F38] dark:text-white">Paleta de cores</h3>
            <div className="flex gap-2">
              {palettes.map(p => (
                <button
                  key={p.name}
                  className={`w-8 h-8 rounded-full border-2 ${palette.name === p.name ? 'border-[#3478F6]' : 'border-gray-300'}`}
                  style={{ background: p.main }}
                  onClick={() => setPalette(p)}
                />
              ))}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-sm mb-1 text-[#2E2F38] dark:text-white">Fonte</h3>
            <div className="flex gap-2">
              {fonts.map(f => (
                <button
                  key={f.name}
                  className={`px-3 py-1 rounded border ${font.name === f.name ? 'border-[#3478F6] bg-[#F5F6FA]' : 'border-gray-300'}`}
                  onClick={() => setFont(f)}
                >{f.name}</button>
              ))}
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <button className={`px-3 py-1 rounded ${!showMobile ? 'bg-[#3478F6] text-white' : 'bg-gray-200 dark:bg-[#181C23] text-[#2E2F38] dark:text-white'}`} onClick={() => setShowMobile(false)}>Desktop</button>
            <button className={`px-3 py-1 rounded ${showMobile ? 'bg-[#3478F6] text-white' : 'bg-gray-200 dark:bg-[#181C23] text-[#2E2F38] dark:text-white'}`} onClick={() => setShowMobile(true)}>Mobile</button>
          </div>
        </aside>
        {/* Área de edição e preview */}
        <main className="flex-1 flex flex-col md:flex-row gap-6">
          {/* Editor visual */}
          <section className="w-full md:w-96 flex-shrink-0 bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mb-6 md:mb-0">
            <h2 className="font-bold text-lg mb-4 text-[#2E2F38] dark:text-white">Editar seção</h2>
            {activeSection === 'banner' && (
              <div className="flex flex-col gap-3">
                <label className="font-bold text-sm">Logo</label>
                <input type="file" accept="image/*" onChange={handleLogoChange} />
                <label className="font-bold text-sm">Imagem do banner</label>
                <input type="file" accept="image/*" onChange={handleBannerImgChange} />
                <label className="font-bold text-sm">Título</label>
                <input type="text" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} className="rounded px-3 py-2 border" />
                <label className="font-bold text-sm">Subtítulo</label>
                <input type="text" value={bannerSubtitle} onChange={e => setBannerSubtitle(e.target.value)} className="rounded px-3 py-2 border" />
              </div>
            )}
            {activeSection === 'imoveis' && (
              <div className="flex flex-col gap-3">
                <label className="font-bold text-sm">Imóveis em destaque</label>
                {imoveis.map((imovel, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <input type="text" value={imovel.title} onChange={e => setImoveis(imoveis => imoveis.map((im, i) => i === idx ? { ...im, title: e.target.value } : im))} className="rounded px-2 py-1 border text-xs" />
                    <input type="text" value={imovel.price} onChange={e => setImoveis(imoveis => imoveis.map((im, i) => i === idx ? { ...im, price: e.target.value } : im))} className="rounded px-2 py-1 border text-xs" />
                  </div>
                ))}
              </div>
            )}
            {activeSection === 'depoimentos' && (
              <div className="flex flex-col gap-3">
                <label className="font-bold text-sm">Depoimentos (mock)</label>
                <span className="text-xs text-[#6B6F76]">Personalização futura</span>
              </div>
            )}
            {activeSection === 'equipe' && (
              <div className="flex flex-col gap-3">
                <label className="font-bold text-sm">Equipe (mock)</label>
                <span className="text-xs text-[#6B6F76]">Personalização futura</span>
              </div>
            )}
            {activeSection === 'contato' && (
              <div className="flex flex-col gap-3">
                <label className="font-bold text-sm">Formulário de contato (mock)</label>
                <span className="text-xs text-[#6B6F76]">Personalização futura</span>
              </div>
            )}
            {activeSection === 'rodape' && (
              <div className="flex flex-col gap-3">
                <label className="font-bold text-sm">Rodapé (mock)</label>
                <span className="text-xs text-[#6B6F76]">Personalização futura</span>
              </div>
            )}
          </section>
          {/* Preview ao vivo */}
          <section className={`flex-1 flex items-center justify-center ${showMobile ? 'max-w-xs mx-auto' : ''}`}>
            <div
              className={`rounded-2xl shadow-lg border border-[#E8E9F1] dark:border-[#181C23] overflow-hidden w-full ${showMobile ? 'max-w-xs' : 'max-w-2xl'} ${fontClass}`}
              style={{ background: bgColor, color: textColor }}
            >
              {/* Menu */}
              <div className="flex items-center justify-between px-6 py-4 bg-opacity-80" style={{ background: mainColor }}>
                <div className="flex items-center gap-2">
                  {logo ? (
                    <img src={URL.createObjectURL(logo)} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold" style={{ color: palette.name === 'Escuro' ? '#fff' : mainColor }}>Alume</span>
                  )}
                </div>
                <nav className="flex gap-6">
                  <span className="cursor-pointer font-medium hover:underline">Home</span>
                  <span className="cursor-pointer font-medium hover:underline">Imóveis</span>
                  {sections.find(s => s.key === 'contato')?.enabled && <span className="cursor-pointer font-medium hover:underline">Contato</span>}
                </nav>
              </div>
              {/* Banner */}
              {sections.find(s => s.key === 'banner')?.enabled && (
                <div className="relative w-full h-48 md:h-56 flex items-center justify-center" style={{ background: mainColor }}>
                  {bannerImg ? (
                    <img src={URL.createObjectURL(bannerImg)} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  ) : null}
                  <div className="relative z-10 text-center w-full px-4">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: palette.name === 'Escuro' ? '#fff' : mainColor }}>{bannerTitle}</h1>
                    <p className="text-base md:text-lg" style={{ color: palette.name === 'Escuro' ? '#fff' : '#2E2F38' }}>{bannerSubtitle}</p>
                  </div>
                </div>
              )}
              {/* Imóveis */}
              {sections.find(s => s.key === 'imoveis')?.enabled && (
                <div className="px-6 py-8">
                  <h3 className="text-xl font-bold mb-4" style={{ color: mainColor }}>Imóveis em destaque</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {imoveis.map((imovel, idx) => (
                      <div key={idx} className="bg-white dark:bg-[#23283A] rounded-xl shadow p-4 flex flex-col items-center border border-[#E8E9F1] dark:border-[#181C23]">
                        <img src={imovel.img} alt={imovel.title} className="w-20 h-20 object-cover rounded mb-2" />
                        <span className="font-bold text-[#2E2F38] dark:text-white">{imovel.title}</span>
                        <span className="text-[#3478F6] font-semibold">{imovel.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Depoimentos */}
              {sections.find(s => s.key === 'depoimentos')?.enabled && (
                <div className="px-6 py-6 bg-[#F5F6FA] dark:bg-[#23283A]">
                  <h3 className="text-lg font-bold mb-2" style={{ color: mainColor }}>Depoimentos</h3>
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
              {/* Equipe */}
              {sections.find(s => s.key === 'equipe')?.enabled && (
                <div className="px-6 py-6">
                  <h3 className="text-lg font-bold mb-2" style={{ color: mainColor }}>Nossa Equipe</h3>
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
              {/* Contato */}
              {sections.find(s => s.key === 'contato')?.enabled && (
                <div className="px-6 py-6 bg-[#F5F6FA] dark:bg-[#23283A]">
                  <h3 className="text-lg font-bold mb-2" style={{ color: mainColor }}>Fale conosco</h3>
                  <form className="flex flex-col gap-2">
                    <input type="text" placeholder="Nome" className="rounded px-3 py-2 border" />
                    <input type="email" placeholder="E-mail" className="rounded px-3 py-2 border" />
                    <textarea placeholder="Mensagem" className="rounded px-3 py-2 border" />
                    <button type="button" className="bg-[#3478F6] text-white rounded px-4 py-2 font-bold mt-2">Enviar</button>
                  </form>
                </div>
              )}
              {/* Rodapé */}
              {sections.find(s => s.key === 'rodape')?.enabled && (
                <div className="px-6 py-4 text-center text-xs" style={{ background: mainColor, color: '#fff' }}>
                  © {new Date().getFullYear()} Imobiliária Exemplo. Todos os direitos reservados.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      <div className="flex justify-end max-w-7xl mx-auto mt-6">
        <button className="bg-[#3478F6] hover:bg-[#245bb5] text-white font-bold px-8 py-3 rounded-xl shadow transition-all">Publicar site</button>
      </div>
    </div>
  );
} 