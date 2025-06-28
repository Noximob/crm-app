'use client';

import React, { useState } from 'react';

export default function MateriaisConstrutoraAdminPage() {
  const [links, setLinks] = useState([
    {
      id: 1,
      construtora: 'Construtora Alpha',
      link: 'https://materiais.alpha.com.br/folder2024',
      descricao: 'Folder institucional atualizado 2024.'
    },
    {
      id: 2,
      construtora: 'Construtora Beta',
      link: 'https://beta.com.br/materiais',
      descricao: 'Acesso ao drive de materiais da Beta.'
    },
  ]);
  const [construtora, setConstrutora] = useState('');
  const [link, setLink] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleAdd = () => {
    if (!construtora || !link) return;
    setLinks([
      { id: Date.now(), construtora, link, descricao },
      ...links,
    ]);
    setConstrutora('');
    setLink('');
    setDescricao('');
  };

  const handleDelete = (id: number) => {
    setLinks(links.filter(l => l.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Materiais Construtora</h1>
        <p className="text-[#6B6F76] dark:text-gray-300 mb-8 text-left text-base">Cadastre e gerencie os links de materiais das construtoras parceiras. Eles ficarão disponíveis para todos em Materiais &gt; Materiais Construtoras.</p>
        {/* Formulário */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
          <div className="flex flex-col gap-4">
            <input type="text" placeholder="Nome da construtora" value={construtora} onChange={e => setConstrutora(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
            <input type="url" placeholder="Link do material" value={link} onChange={e => setLink(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
            <textarea placeholder="Descrição (opcional)" value={descricao} onChange={e => setDescricao(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" rows={2} />
            <button onClick={handleAdd} className="bg-[#3478F6] hover:bg-[#245bb5] text-white font-bold px-8 py-3 rounded-xl shadow transition-all self-end">Adicionar link</button>
          </div>
        </div>
        {/* Lista de links */}
        <div className="flex flex-col gap-4">
          {links.length === 0 && <span className="text-[#6B6F76] dark:text-gray-300 text-center">Nenhum link cadastrado ainda.</span>}
          {links.map(l => (
            <div key={l.id} className="bg-white dark:bg-[#23283A] rounded-xl p-4 flex items-center gap-4 border border-[#E8E9F1] dark:border-[#23283A]">
              <div className="flex-1">
                <div className="font-bold text-[#2E2F38] dark:text-white">{l.construtora}</div>
                <a href={l.link} target="_blank" rel="noopener noreferrer" className="text-[#3478F6] underline break-all text-sm">{l.link}</a>
                {l.descricao && <div className="text-xs text-[#6B6F76] dark:text-gray-300 mt-1">{l.descricao}</div>}
              </div>
              <button onClick={() => handleDelete(l.id)} className="text-red-500 hover:underline text-xs">Excluir</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 