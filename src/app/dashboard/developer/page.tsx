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

  const handleAprovar = async (user: Usuario, aprovado: boolean) => {
    setMessage(null);
    try {
      await updateDoc(doc(db, 'usuarios', user.id), { aprovado });
      setCorretores(corretores => corretores.map(c => c.id === user.id ? { ...c, aprovado } : c));
      setMessage(aprovado ? 'Usuário aprovado!' : 'Usuário reprovado!');
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
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Imobiliárias</h2>
        {loading ? <p>Carregando...</p> : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="py-2">Nome</th>
                <th className="py-2">Status</th>
                <th className="py-2">Aprovada</th>
                <th className="py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {imobiliarias.map(imob => (
                <tr key={imob.id} className="border-t">
                  <td className="py-2 font-medium">{imob.nome}</td>
                  <td className="py-2">{imob.status || '-'}</td>
                  <td className="py-2">{imob.aprovado ? 'Sim' : 'Não'}</td>
                  <td className="py-2">
                    <button className="text-blue-600 hover:underline mr-2" onClick={() => { setSelectedImobiliaria(imob); loadCorretores(imob.id); }}>Ver corretores</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedImobiliaria && (
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Corretores de {selectedImobiliaria.nome}</h2>
            <button className="text-sm text-gray-500 hover:underline" onClick={() => { setSelectedImobiliaria(null); setCorretores([]); }}>Fechar</button>
          </div>
          {loadingCorretores ? <p>Carregando corretores...</p> : (
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="py-2">Nome</th>
                  <th className="py-2">E-mail</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2">Aprovado</th>
                  <th className="py-2">Admin</th>
                  <th className="py-2">Desenvolvedor</th>
                  <th className="py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {corretores.map(corretor => (
                  <tr key={corretor.id} className="border-t">
                    <td className="py-2 font-medium">{corretor.nome}</td>
                    <td className="py-2">{corretor.email}</td>
                    <td className="py-2">{corretor.tipoConta}</td>
                    <td className="py-2">{corretor.aprovado ? 'Sim' : 'Não'}</td>
                    <td className="py-2 text-center"><input type="checkbox" checked={!!corretor.permissoes?.admin} onChange={e => handlePermissao(corretor, 'admin', e.target.checked)} /></td>
                    <td className="py-2 text-center"><input type="checkbox" checked={!!corretor.permissoes?.developer} onChange={e => handlePermissao(corretor, 'developer', e.target.checked)} /></td>
                    <td className="py-2">
                      <button className="text-green-600 hover:underline mr-2" onClick={() => handleAprovar(corretor, true)}>Aprovar</button>
                      <button className="text-red-600 hover:underline" onClick={() => handleAprovar(corretor, false)}>Reprovar</button>
                      {/* Futuro: botão para ver leads, permissões, etc */}
                    </td>
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