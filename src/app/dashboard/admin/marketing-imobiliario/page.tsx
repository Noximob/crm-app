'use client';

import React, { useState } from 'react';

const tipos = [
  { label: 'Imagem', value: 'imagem' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Vídeo', value: 'video' },
  { label: 'Link', value: 'link' },
];

export default function MarketingImobiliarioAdminPage() {
  const [materiais, setMateriais] = useState<any[]>([
    {
      id: 1,
      titulo: 'Folder de lançamento',
      descricao: 'Material em PDF para divulgação do novo prédio.',
      tipo: 'pdf',
      data: '10/07/2024',
      arquivo: null,
      link: '',
      preview: '',
    },
    {
      id: 2,
      titulo: 'Campanha Google Ads',
      descricao: 'Link da campanha ativa no Google.',
      tipo: 'link',
      data: '09/07/2024',
      arquivo: null,
      link: 'https://ads.google.com/campanha123',
      preview: '',
    },
  ]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('imagem');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [link, setLink] = useState('');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setArquivo(e.target.files[0]);
  };

  const handleAdd = () => {
    if (!titulo || (!arquivo && tipo !== 'link') && tipo !== 'link') return;
    const novo = {
      id: Date.now(),
      titulo,
      descricao,
      tipo,
      data: new Date().toLocaleDateString(),
      arquivo: tipo !== 'link' ? arquivo : null,
      link: tipo === 'link' ? link : '',
      preview: tipo === 'imagem' && arquivo ? URL.createObjectURL(arquivo) : '',
    };
    setMateriais([novo, ...materiais]);
    setTitulo('');
    setDescricao('');
    setTipo('imagem');
    setArquivo(null);
    setLink('');
  };

  const handleDelete = (id: number) => {
    setMateriais(materiais.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Marketing Imobiliário</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Cadastre e gerencie os materiais de marketing produzidos pela sua imobiliária. Eles ficarão disponíveis para todos em Materiais &gt; Marketing Imobiliário.</p>
        {/* Formulário */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <input type="text" placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} className="flex-1 rounded-lg border px-3 py-2 text-sm" />
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <textarea placeholder="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" rows={2} />
            {tipo === 'imagem' && <input type="file" accept="image/*" onChange={handleUpload} />}
            {tipo === 'pdf' && <input type="file" accept="application/pdf" onChange={handleUpload} />}
            {tipo === 'video' && <input type="file" accept="video/*" onChange={handleUpload} />}
            {tipo === 'link' && <input type="url" placeholder="URL do material" value={link} onChange={e => setLink(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />}
            <button onClick={handleAdd} className="bg-[#3478F6] hover:bg-[#245bb5] text-white font-bold px-8 py-3 rounded-xl shadow transition-all self-end">Adicionar material</button>
          </div>
        </div>
        {/* Lista de materiais */}
        <div className="flex flex-col gap-4">
          {materiais.length === 0 && <span className="text-[#6B6F76] dark:text-gray-300 text-center">Nenhum material cadastrado ainda.</span>}
          {materiais.map(m => (
            <div key={m.id} className="bg-white dark:bg-[#23283A] rounded-xl p-4 flex items-center gap-4 border border-[#E8E9F1] dark:border-[#23283A]">
              {m.tipo === 'imagem' && m.preview && <img src={m.preview} alt={m.titulo} className="w-16 h-16 object-cover rounded" />}
              {m.tipo === 'pdf' && <span className="w-16 h-16 flex items-center justify-center bg-[#F5F6FA] dark:bg-[#181C23] rounded text-[#3478F6] font-bold">PDF</span>}
              {m.tipo === 'video' && <span className="w-16 h-16 flex items-center justify-center bg-[#F5F6FA] dark:bg-[#181C23] rounded text-[#3478F6] font-bold">Vídeo</span>}
              {m.tipo === 'link' && <a href={m.link} target="_blank" rel="noopener noreferrer" className="w-16 h-16 flex items-center justify-center bg-[#F5F6FA] dark:bg-[#181C23] rounded text-[#3478F6] font-bold underline">Link</a>}
              <div className="flex-1">
                <div className="font-bold text-[#2E2F38] dark:text-white">{m.titulo}</div>
                <div className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1">{m.descricao}</div>
                <div className="text-xs text-[#6B6F76] dark:text-gray-400">{m.tipo.toUpperCase()} • {m.data}</div>
              </div>
              <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:underline text-xs">Excluir</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 