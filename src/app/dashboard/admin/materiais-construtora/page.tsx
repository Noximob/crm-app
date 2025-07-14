'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, orderBy, doc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface Construtora {
  id: string;
  nome: string;
  criadoEm: Date;
}

interface Empreendimento {
  id: string;
  construtoraId: string;
  nome: string;
  descricao?: string;
  criadoEm: Date;
}

interface Material {
  id: string;
  empreendimentoId: string;
  nome: string;
  tipo: 'arquivo' | 'pasta';
  categoria?: 'booking' | 'tabela' | 'video' | 'foto' | 'outro';
  url?: string;
  tamanho?: number;
  extensao?: string;
  criadoEm: Date;
}

const CATEGORIAS = [
  { value: 'booking', label: 'Booking', icon: '📋' },
  { value: 'tabela', label: 'Tabela', icon: '📊' },
  { value: 'video', label: 'Vídeo', icon: '🎥' },
  { value: 'foto', label: 'Foto', icon: '📸' },
  { value: 'outro', label: 'Outro', icon: '📁' },
];

export default function MateriaisConstrutoraAdminPage() {
  const { userData } = useAuth();
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Navegação
  const [view, setView] = useState<'construtoras' | 'empreendimentos' | 'materiais'>('construtoras');
  const [selectedConstrutora, setSelectedConstrutora] = useState<Construtora | null>(null);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<Empreendimento | null>(null);

  // Formulários
  const [formConstrutora, setFormConstrutora] = useState({ nome: '' });
  const [formEmpreendimento, setFormEmpreendimento] = useState({ nome: '', descricao: '' });
  const [formMaterial, setFormMaterial] = useState({ nome: '', categoria: 'outro', tipo: 'arquivo' as 'arquivo' | 'pasta' });
  const [uploading, setUploading] = useState(false);

  // Buscar dados
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchConstrutoras();
  }, [userData]);

  useEffect(() => {
    if (selectedConstrutora) {
      fetchEmpreendimentos(selectedConstrutora.id);
    }
  }, [selectedConstrutora]);

  useEffect(() => {
    if (selectedEmpreendimento) {
      fetchMateriais(selectedEmpreendimento.id);
    }
  }, [selectedEmpreendimento]);

  const fetchConstrutoras = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'construtoras'),
        where('imobiliariaId', '==', userData?.imobiliariaId),
        orderBy('nome')
      );
      const snap = await getDocs(q);
      setConstrutoras(snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : data.criadoEm
        } as Construtora;
      }));
      if (snap.empty) setMsg('Nenhuma construtora encontrada para esta imobiliária.');
    } catch (err: any) {
      setMsg('Erro ao carregar construtoras: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpreendimentos = async (construtoraId: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'empreendimentos'),
        where('construtoraId', '==', construtoraId),
        orderBy('nome')
      );
      const snap = await getDocs(q);
      setEmpreendimentos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Empreendimento)));
    } catch (err) {
      setMsg('Erro ao carregar empreendimentos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMateriais = async (empreendimentoId: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'materiais'),
        where('empreendimentoId', '==', empreendimentoId),
        orderBy('nome')
      );
      const snap = await getDocs(q);
      setMateriais(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material)));
    } catch (err) {
      setMsg('Erro ao carregar materiais.');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Construtora
  const handleAddConstrutora = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConstrutora.nome.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const construtora = {
        nome: formConstrutora.nome.trim(),
        imobiliariaId: userData?.imobiliariaId,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, 'construtoras'), construtora);
      setFormConstrutora({ nome: '' });
      fetchConstrutoras();
      setMsg('Construtora criada!');
    } catch (err) {
      setMsg('Erro ao criar construtora.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConstrutora = async (id: string) => {
    if (!confirm('Tem certeza? Isso excluirá todos os empreendimentos e materiais.')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'construtoras', id));
      fetchConstrutoras();
      setMsg('Construtora excluída!');
    } catch (err) {
      setMsg('Erro ao excluir construtora.');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Empreendimento
  const handleAddEmpreendimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmpreendimento.nome.trim() || !selectedConstrutora) return;
    setLoading(true);
    setMsg(null);
    try {
      const empreendimento = {
        nome: formEmpreendimento.nome.trim(),
        descricao: formEmpreendimento.descricao.trim(),
        construtoraId: selectedConstrutora.id,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, 'empreendimentos'), empreendimento);
      setFormEmpreendimento({ nome: '', descricao: '' });
      fetchEmpreendimentos(selectedConstrutora.id);
      setMsg('Empreendimento criado!');
    } catch (err) {
      setMsg('Erro ao criar empreendimento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmpreendimento = async (id: string) => {
    if (!confirm('Tem certeza? Isso excluirá todos os materiais.')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'empreendimentos', id));
      fetchEmpreendimentos(selectedConstrutora!.id);
      setMsg('Empreendimento excluído!');
    } catch (err) {
      setMsg('Erro ao excluir empreendimento.');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Material
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMaterial.nome.trim() || !selectedEmpreendimento) return;
    setLoading(true);
    setMsg(null);
    try {
      const material = {
        nome: formMaterial.nome.trim(),
        tipo: formMaterial.tipo,
        categoria: formMaterial.categoria,
        empreendimentoId: selectedEmpreendimento.id,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, 'materiais'), material);
      setFormMaterial({ nome: '', categoria: 'outro', tipo: 'arquivo' });
      fetchMateriais(selectedEmpreendimento.id);
      setMsg('Material criado!');
    } catch (err) {
      setMsg('Erro ao criar material.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEmpreendimento) return;

    setUploading(true);
    setMsg(null);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `materiais/${selectedEmpreendimento.id}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const material = {
        nome: file.name,
        tipo: 'arquivo' as const,
        categoria: formMaterial.categoria,
        url: downloadURL,
        tamanho: file.size,
        extensao: file.name.split('.').pop(),
        empreendimentoId: selectedEmpreendimento.id,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, 'materiais'), material);
      fetchMateriais(selectedEmpreendimento.id);
      setMsg('Arquivo enviado!');
    } catch (err) {
      setMsg('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string, url?: string) => {
    setLoading(true);
    try {
      if (url) {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      }
      await deleteDoc(doc(db, 'materiais', id));
      fetchMateriais(selectedEmpreendimento!.id);
      setMsg('Material excluído!');
    } catch (err) {
      setMsg('Erro ao excluir material.');
    } finally {
      setLoading(false);
    }
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = ['Materiais Construtoras'];
    if (selectedConstrutora) breadcrumbs.push(selectedConstrutora.nome);
    if (selectedEmpreendimento) breadcrumbs.push(selectedEmpreendimento.nome);
    return breadcrumbs.join(' > ');
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Materiais Construtoras</h1>
            <p className="text-[#6B6F76] dark:text-gray-300 text-left text-base">{getBreadcrumbs()}</p>
          </div>
          {view !== 'construtoras' && (
            <button
              onClick={() => {
                setView('construtoras');
                setSelectedConstrutora(null);
                setSelectedEmpreendimento(null);
              }}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>

        {msg && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">{msg}</p>
          </div>
        )}

        {/* Lista de Construtoras */}
        {view === 'construtoras' && (
          <div>
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Nova Construtora</h2>
              <form onSubmit={handleAddConstrutora} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Nome da construtora"
                  value={formConstrutora.nome}
                  onChange={e => setFormConstrutora({ nome: e.target.value })}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Adicionar
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {construtoras.map(construtora => (
                <div
                  key={construtora.id}
                  className="bg-white dark:bg-[#23283A] rounded-xl p-6 border border-[#E8E9F1] dark:border-[#23283A] cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedConstrutora(construtora);
                    setView('empreendimentos');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[#2E2F38] dark:text-white text-lg">{construtora.nome}</h3>
                      <p className="text-sm text-[#6B6F76] dark:text-gray-300">Clique para ver empreendimentos</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConstrutora(construtora.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Empreendimentos */}
        {view === 'empreendimentos' && selectedConstrutora && (
          <div>
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Novo Empreendimento</h2>
              <form onSubmit={handleAddEmpreendimento} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nome do empreendimento"
                    value={formEmpreendimento.nome}
                    onChange={e => setFormEmpreendimento({ ...formEmpreendimento, nome: e.target.value })}
                    className="rounded-lg border px-3 py-2 text-sm"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Descrição (opcional)"
                    value={formEmpreendimento.descricao}
                    onChange={e => setFormEmpreendimento({ ...formEmpreendimento, descricao: e.target.value })}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 self-end"
                >
                  Adicionar
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {empreendimentos.map(empreendimento => (
                <div
                  key={empreendimento.id}
                  className="bg-white dark:bg-[#23283A] rounded-xl p-6 border border-[#E8E9F1] dark:border-[#23283A] cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedEmpreendimento(empreendimento);
                    setView('materiais');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[#2E2F38] dark:text-white text-lg">{empreendimento.nome}</h3>
                      {empreendimento.descricao && (
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">{empreendimento.descricao}</p>
                      )}
                      <p className="text-sm text-[#6B6F76] dark:text-gray-300">Clique para ver materiais</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEmpreendimento(empreendimento.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Materiais */}
        {view === 'materiais' && selectedEmpreendimento && (
          <div>
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Novo Material</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Criar pasta */}
                <div>
                  <h3 className="font-semibold text-[#2E2F38] dark:text-white mb-3">Criar Pasta</h3>
                  <form onSubmit={handleAddMaterial} className="flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Nome da pasta"
                      value={formMaterial.nome}
                      onChange={e => setFormMaterial({ ...formMaterial, nome: e.target.value })}
                      className="rounded-lg border px-3 py-2 text-sm"
                      required
                    />
                    <select
                      value={formMaterial.categoria}
                      onChange={e => setFormMaterial({ ...formMaterial, categoria: e.target.value as any })}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      {CATEGORIAS.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      Criar Pasta
                    </button>
                  </form>
                </div>

                {/* Upload arquivo */}
                <div>
                  <h3 className="font-semibold text-[#2E2F38] dark:text-white mb-3">Upload de Arquivo</h3>
                  <div className="flex flex-col gap-3">
                    <select
                      value={formMaterial.categoria}
                      onChange={e => setFormMaterial({ ...formMaterial, categoria: e.target.value as any })}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      {CATEGORIAS.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                      ))}
                    </select>
                    <input
                      type="file"
                      onChange={handleUploadFile}
                      disabled={uploading}
                      className="rounded-lg border px-3 py-2 text-sm"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.mov"
                    />
                    {uploading && <p className="text-sm text-[#6B6F76] dark:text-gray-300">Enviando...</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materiais.map(material => (
                <div
                  key={material.id}
                  className="bg-white dark:bg-[#23283A] rounded-xl p-4 border border-[#E8E9F1] dark:border-[#23283A]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {material.tipo === 'pasta' ? '📁' : 
                           material.extensao === 'pdf' ? '📄' :
                           material.extensao === 'mp4' ? '🎥' :
                           material.extensao === 'jpg' || material.extensao === 'png' ? '📸' : '📄'}
                        </span>
                        <h3 className="font-semibold text-[#2E2F38] dark:text-white">{material.nome}</h3>
                      </div>
                      {material.tamanho && (
                        <p className="text-xs text-[#6B6F76] dark:text-gray-300">
                          {(material.tamanho / 1024 / 1024).toFixed(1)} MB
                        </p>
                      )}
                      {material.url && (
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3478F6] hover:underline text-sm"
                        >
                          Abrir arquivo
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteMaterial(material.id, material.url)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Excluir
                    </button>
                  </div>
            </div>
          ))}
        </div>
          </div>
        )}
      </div>
    </div>
  );
} 