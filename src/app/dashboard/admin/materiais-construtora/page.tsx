'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, orderBy, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface Construtora {
  id: string;
  nome: string;
  logoUrl?: string;
  criadoEm: Date;
}

interface Produto {
  id: string;
  construtoraId: string;
  nome: string;
  descricao?: string;
  criadoEm: Date;
}

interface Material {
  id: string;
  produtoId: string;
  nome: string;
  tipo: 'pdf' | 'link' | 'foto' | 'video';
  url?: string;
  tamanho?: number;
  extensao?: string;
  criadoEm: Date;
}

// Ícones
const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18"/>
    <path d="M5 21V7l8-4v18"/>
    <path d="M19 21V11l-6-4"/>
    <path d="M9 9h.01"/>
    <path d="M9 12h.01"/>
    <path d="M9 15h.01"/>
    <path d="M9 18h.01"/>
  </svg>
);

const PackageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2"/>
    <path d="m15.194 13.707 3.306 3.307a1 1 0 0 1 0 1.414l-1.586 1.586a1 1 0 0 1-1.414 0l-3.307-3.306"/>
    <path d="M10 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
  </svg>
);

const FileIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const LinkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

const VideoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m22 8-6 4 6 4V8Z"/>
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
  </svg>
);

export default function MateriaisConstrutoraAdminPage() {
  const { userData } = useAuth();
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Navegação
  const [view, setView] = useState<'construtoras' | 'produtos' | 'materiais'>('construtoras');
  const [selectedConstrutora, setSelectedConstrutora] = useState<Construtora | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  // Formulários
  const [formConstrutora, setFormConstrutora] = useState({ nome: '', logo: null as File | null });
  const [formProduto, setFormProduto] = useState({ nome: '', descricao: '' });
  const [formMaterial, setFormMaterial] = useState({ nome: '', tipo: 'pdf' as 'pdf' | 'link' | 'foto' | 'video', url: '' });
  const [uploading, setUploading] = useState(false);

  // Buscar dados
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchConstrutoras();
  }, [userData]);

  useEffect(() => {
    if (selectedConstrutora) {
      fetchProdutos(selectedConstrutora.id);
    }
  }, [selectedConstrutora]);

  useEffect(() => {
    if (selectedProduto) {
      fetchMateriais(selectedProduto.id);
    }
  }, [selectedProduto]);

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
    } catch (err: any) {
      setMsg('Erro ao carregar construtoras: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const fetchProdutos = async (construtoraId: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'produtos'),
        where('construtoraId', '==', construtoraId),
        orderBy('nome')
      );
      const snap = await getDocs(q);
      setProdutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Produto)));
    } catch (err) {
      setMsg('Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMateriais = async (produtoId: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'materiais'),
        where('produtoId', '==', produtoId),
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
      let logoUrl = '';
      if (formConstrutora.logo) {
        const logoRef = ref(storage, `logos/${Date.now()}_${formConstrutora.logo.name}`);
        const snapshot = await uploadBytes(logoRef, formConstrutora.logo);
        logoUrl = await getDownloadURL(snapshot.ref);
      }

      const construtora = {
        nome: formConstrutora.nome.trim(),
        logoUrl,
        imobiliariaId: userData?.imobiliariaId,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, 'construtoras'), construtora);
      setFormConstrutora({ nome: '', logo: null });
      fetchConstrutoras();
      setMsg('Construtora criada com sucesso!');
    } catch (err) {
      setMsg('Erro ao criar construtora.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConstrutora = async (id: string) => {
    if (!confirm('Tem certeza? Isso excluirá todos os produtos e materiais.')) return;
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

  // CRUD Produto
  const handleAddProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduto.nome.trim() || !selectedConstrutora) return;
    setLoading(true);
    setMsg(null);
    try {
      const produto = {
        nome: formProduto.nome.trim(),
        descricao: formProduto.descricao.trim(),
        construtoraId: selectedConstrutora.id,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, 'produtos'), produto);
      setFormProduto({ nome: '', descricao: '' });
      fetchProdutos(selectedConstrutora.id);
      setMsg('Produto criado!');
    } catch (err) {
      setMsg('Erro ao criar produto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduto = async (id: string) => {
    if (!confirm('Tem certeza? Isso excluirá todos os materiais.')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'produtos', id));
      fetchProdutos(selectedConstrutora!.id);
      setMsg('Produto excluído!');
    } catch (err) {
      setMsg('Erro ao excluir produto.');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Material
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMaterial.nome.trim() || !selectedProduto) return;
    setLoading(true);
    setMsg(null);
    try {
      const material = {
        nome: formMaterial.nome.trim(),
        tipo: formMaterial.tipo,
        url: formMaterial.url.trim(),
        produtoId: selectedProduto.id,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, 'materiais'), material);
      setFormMaterial({ nome: '', tipo: 'pdf', url: '' });
      fetchMateriais(selectedProduto.id);
      setMsg('Material criado!');
    } catch (err) {
      setMsg('Erro ao criar material.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (file: File, tipo: 'pdf' | 'foto' | 'video') => {
    if (!selectedProduto) return;

    setUploading(true);
    setMsg(null);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `materiais/${selectedProduto.id}/${tipo}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const material = {
        nome: file.name,
        tipo,
        url: downloadURL,
        tamanho: file.size,
        extensao: file.name.split('.').pop()?.toLowerCase(),
        produtoId: selectedProduto.id,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, 'materiais'), material);
      fetchMateriais(selectedProduto.id);
      setMsg('Arquivo enviado com sucesso!');
    } catch (err) {
      setMsg('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadMultipleFiles = async (files: FileList, tipo: 'foto' | 'video') => {
    if (!selectedProduto) return;
    
    setUploading(true);
    setMsg(null);
    try {
      const uploadPromises = Array.from(files).map(file => handleUploadFile(file, tipo));
      await Promise.all(uploadPromises);
      setMsg(`${files.length} arquivo(s) enviado(s) com sucesso!`);
    } catch (err) {
      setMsg('Erro ao enviar arquivos.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string, url?: string) => {
    if (!confirm('Tem certeza?')) return;
    setLoading(true);
    try {
      if (url) {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      }
      await deleteDoc(doc(db, 'materiais', id));
      fetchMateriais(selectedProduto!.id);
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
    if (selectedProduto) breadcrumbs.push(selectedProduto.nome);
    return breadcrumbs.join(' > ');
  };

  const getMaterialIcon = (tipo: string) => {
    switch (tipo) {
      case 'pdf': return <FileIcon className="h-5 w-5" />;
      case 'link': return <LinkIcon className="h-5 w-5" />;
      case 'foto': return <ImageIcon className="h-5 w-5" />;
      case 'video': return <VideoIcon className="h-5 w-5" />;
      default: return <FileIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Gestão de Materiais Construtoras</h1>
            <p className="text-[#6B6F76] dark:text-gray-300">{getBreadcrumbs()}</p>
          </div>
          {view !== 'construtoras' && (
            <button
              onClick={() => {
                setView('construtoras');
                setSelectedConstrutora(null);
                setSelectedProduto(null);
              }}
              className="px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`p-4 rounded-lg mb-6 ${msg.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {msg}
          </div>
        )}

        {/* Construtoras */}
        {view === 'construtoras' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                <BuildingIcon className="h-6 w-6 text-[#3478F6]" />
                Nova Construtora
              </h2>
              <form onSubmit={handleAddConstrutora} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Nome da Construtora</label>
                  <input
                    type="text"
                    value={formConstrutora.nome}
                    onChange={e => setFormConstrutora({ ...formConstrutora, nome: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Ex: MRV, Cyrela, etc."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Logo (opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setFormConstrutora({ ...formConstrutora, logo: e.target.files?.[0] || null })}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar Construtora'}
                </button>
              </form>
            </div>

            {/* Lista */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Construtoras Cadastradas</h2>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : construtoras.length === 0 ? (
                <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
                  Nenhuma construtora cadastrada
                </div>
              ) : (
                <div className="space-y-3">
                  {construtoras.map(construtora => (
                    <div
                      key={construtora.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {construtora.logoUrl ? (
                          <img src={construtora.logoUrl} alt={construtora.nome} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-[#3478F6] rounded-full flex items-center justify-center">
                            <BuildingIcon className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <span className="font-semibold text-[#2E2F38] dark:text-white">{construtora.nome}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedConstrutora(construtora);
                            setView('produtos');
                          }}
                          className="px-3 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-sm rounded transition-colors"
                        >
                          Produtos
                        </button>
                        <button
                          onClick={() => handleDeleteConstrutora(construtora.id)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Produtos */}
        {view === 'produtos' && selectedConstrutora && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                <PackageIcon className="h-6 w-6 text-[#3478F6]" />
                Novo Produto
              </h2>
              <form onSubmit={handleAddProduto} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Nome do Produto</label>
                  <input
                    type="text"
                    value={formProduto.nome}
                    onChange={e => setFormProduto({ ...formProduto, nome: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Ex: Residencial Jardim das Flores"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Descrição (opcional)</label>
                  <textarea
                    value={formProduto.descricao}
                    onChange={e => setFormProduto({ ...formProduto, descricao: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    rows={3}
                    placeholder="Descrição do produto..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar Produto'}
                </button>
              </form>
            </div>

            {/* Lista */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Produtos de {selectedConstrutora.nome}</h2>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : produtos.length === 0 ? (
                <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
                  Nenhum produto cadastrado
                </div>
              ) : (
                <div className="space-y-3">
                  {produtos.map(produto => (
                    <div
                      key={produto.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-[#2E2F38] dark:text-white">{produto.nome}</span>
                        {produto.descricao && (
                          <p className="text-sm text-[#6B6F76] dark:text-gray-300">{produto.descricao}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedProduto(produto);
                            setView('materiais');
                          }}
                          className="px-3 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-sm rounded transition-colors"
                        >
                          Materiais
                        </button>
                        <button
                          onClick={() => handleDeleteProduto(produto.id)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Materiais */}
        {view === 'materiais' && selectedProduto && (
          <div className="space-y-6">
            {/* Formulários de Material */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PDF */}
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <FileIcon className="h-5 w-5 text-[#3478F6]" />
                  Upload PDF
                </h3>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(file, 'pdf');
                  }}
                  disabled={uploading}
                  className="w-full rounded-lg border px-3 py-2"
                />
                {uploading && <p className="text-sm text-[#6B6F76] mt-2">Enviando...</p>}
              </div>

              {/* Links */}
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-[#3478F6]" />
                  Adicionar Link
                </h3>
                <form onSubmit={handleAddMaterial} className="space-y-3">
                  <input
                    type="text"
                    value={formMaterial.nome}
                    onChange={e => setFormMaterial({ ...formMaterial, nome: e.target.value })}
                    placeholder="Nome do link"
                    className="w-full rounded-lg border px-3 py-2"
                    required
                  />
                  <input
                    type="url"
                    value={formMaterial.url}
                    onChange={e => setFormMaterial({ ...formMaterial, url: e.target.value })}
                    placeholder="URL do link"
                    className="w-full rounded-lg border px-3 py-2"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Adicionando...' : 'Adicionar Link'}
                  </button>
                </form>
              </div>
            </div>

            {/* Upload de Fotos e Vídeos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fotos */}
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-[#3478F6]" />
                  Upload Fotos
                </h3>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => {
                    if (e.target.files) {
                      handleUploadMultipleFiles(e.target.files, 'foto');
                    }
                  }}
                  disabled={uploading}
                  className="w-full rounded-lg border px-3 py-2"
                />
                {uploading && <p className="text-sm text-[#6B6F76] mt-2">Enviando...</p>}
              </div>

              {/* Vídeos */}
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <VideoIcon className="h-5 w-5 text-[#3478F6]" />
                  Upload Vídeos
                </h3>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={e => {
                    if (e.target.files) {
                      handleUploadMultipleFiles(e.target.files, 'video');
                    }
                  }}
                  disabled={uploading}
                  className="w-full rounded-lg border px-3 py-2"
                />
                {uploading && <p className="text-sm text-[#6B6F76] mt-2">Enviando...</p>}
              </div>
            </div>

            {/* Lista de Materiais */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Materiais de {selectedProduto.nome}</h3>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : materiais.length === 0 ? (
                <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
                  Nenhum material cadastrado
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materiais.map(material => (
                    <div
                      key={material.id}
                      className="p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {getMaterialIcon(material.tipo)}
                        <span className="font-semibold text-[#2E2F38] dark:text-white text-sm">{material.nome}</span>
                      </div>
                      <div className="flex gap-2">
                        {material.url && (
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded transition-colors"
                          >
                            Ver
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteMaterial(material.id, material.url)}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 