'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

interface Imobiliaria {
  id: string;
  nome: string;
  status?: string;
  aprovado?: boolean;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipoConta: string;
  aprovado: boolean;
  imobiliariaId?: string;
  permissoes?: {
    admin?: boolean;
    developer?: boolean;
  };
}

export default function DeveloperPage() {
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([]);
  const [selectedImobiliaria, setSelectedImobiliaria] = useState<Imobiliaria | null>(null);
  const [corretores, setCorretores] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCorretores, setLoadingCorretores] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadImobiliarias();
  }, []);

  const loadImobiliarias = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'imobiliarias'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Imobiliaria[];
      setImobiliarias(data);
    } catch (err) {
      setMessage('Erro ao carregar imobiliárias');
    } finally {
      setLoading(false);
    }
  };

  const loadCorretores = async (imobiliariaId: string) => {
    setLoadingCorretores(true);
    setCorretores([]);
    try {
      const q = query(collection(db, 'usuarios'), where('imobiliariaId', '==', imobiliariaId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Usuario[];
      setCorretores(data);
    } catch (err) {
      setMessage('Erro ao carregar corretores');
    } finally {
      setLoadingCorretores(false);
    }
  };

  const handleAprovarCheckbox = async (user: Usuario, valor: boolean) => {
    setMessage(null);
    try {
      await updateDoc(doc(db, 'usuarios', user.id), { aprovado: valor });
      setCorretores(corretores => corretores.map(c => c.id === user.id ? { ...c, aprovado: valor } : c));
      setMessage(valor ? 'Usuário aprovado!' : 'Usuário reprovado!');
    } catch (err) {
      setMessage('Erro ao atualizar usuário');
    }
  };

  const handlePermissao = async (user: Usuario, tipo: 'admin' | 'developer', valor: boolean) => {
    setMessage(null);
    try {
      const novasPerms = { ...user.permissoes, [tipo]: valor };
      await updateDoc(doc(db, 'usuarios', user.id), { permissoes: novasPerms });
      setCorretores(corretores => corretores.map(c => c.id === user.id ? { ...c, permissoes: novasPerms } : c));
      setMessage(`Permissão de ${tipo === 'admin' ? 'Admin' : 'Desenvolvedor'} ${valor ? 'concedida' : 'removida'}!`);
    } catch (err) {
      setMessage('Erro ao atualizar permissões');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-[#2E2F38]">Área do Desenvolvedor</h1>
      {message && <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800">{message}</div>}
      <div className="bg-white rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Imobiliárias</h2>
        {loading ? <p>Carregando...</p> : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F5F6FA] dark:bg-[#181C23] text-[#2E2F38] dark:text-white font-semibold">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aprovada</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {imobiliarias.map(imob => (
                <tr key={imob.id} className="border-t hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                  <td className="px-4 py-3 font-medium">{imob.nome}</td>
                  <td className="px-4 py-3">{imob.status || '-'}</td>
                  <td className="px-4 py-3">{imob.aprovado ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:underline mr-2" onClick={() => { setSelectedImobiliaria(imob); loadCorretores(imob.id); }}>Ver corretores</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedImobiliaria && (
        <div className="bg-white rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Corretores de {selectedImobiliaria.nome}</h2>
            <button className="ml-auto text-[#6B6F76] dark:text-gray-400 text-xs font-medium hover:underline" onClick={() => { setSelectedImobiliaria(null); setCorretores([]); }}>Fechar</button>
          </div>
          {loadingCorretores ? <p>Carregando corretores...</p> : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F5F6FA] dark:bg-[#181C23] text-[#2E2F38] dark:text-white font-semibold">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-center">Aprovado</th>
                  <th className="px-4 py-3 text-center">Admin</th>
                  <th className="px-4 py-3 text-center">Desenvolvedor</th>
                </tr>
              </thead>
              <tbody>
                {corretores.map(corretor => (
                  <tr key={corretor.id} className="border-t hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                    <td className="px-4 py-3 font-medium">{corretor.nome}</td>
                    <td className="px-4 py-3">{corretor.email}</td>
                    <td className="px-4 py-3">{corretor.tipoConta}</td>
                    <td className="px-4 py-3 text-center"><input type="checkbox" checked={!!corretor.aprovado} onChange={e => handleAprovarCheckbox(corretor, e.target.checked)} /></td>
                    <td className="px-4 py-3 text-center"><input type="checkbox" checked={!!corretor.permissoes?.admin} onChange={e => handlePermissao(corretor, 'admin', e.target.checked)} /></td>
                    <td className="px-4 py-3 text-center"><input type="checkbox" checked={!!corretor.permissoes?.developer} onChange={e => handlePermissao(corretor, 'developer', e.target.checked)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* Futuro: gestão de permissões e leads */}
    </div>
  );
} 