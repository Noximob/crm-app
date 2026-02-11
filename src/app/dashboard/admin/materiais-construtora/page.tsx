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

interface ImovelCaptado {
  id: string;
  imobiliariaId: string;
  corretorId: string;
  corretorNome: string;
  nome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  localizacao: string; // Link do Google Maps
  tipo: 'casa' | 'apartamento' | 'terreno' | 'comercial';
  valor: number;
  descricao: string;
  fotos: string[];
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

const HouseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const MapIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 4m0 13V4m-6 3l6-3"/>
  </svg>
);

const StoreIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

export default function MateriaisConstrutoraAdminPage() {
  const { userData, currentUser } = useAuth();
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [imoveisCaptados, setImoveisCaptados] = useState<ImovelCaptado[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Navegação
  const [view, setView] = useState<'construtoras' | 'produtos' | 'materiais' | 'captacoes'>('construtoras');
  const [selectedConstrutora, setSelectedConstrutora] = useState<Construtora | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  // Formulários
  const [formConstrutora, setFormConstrutora] = useState({ nome: '', logo: null as File | null });
  const [formProduto, setFormProduto] = useState({ nome: '', descricao: '' });
  const [formMaterial, setFormMaterial] = useState({ nome: '', tipo: 'pdf' as 'pdf' | 'link' | 'foto' | 'video', url: '', descricao: '' });
  const [uploading, setUploading] = useState(false);

  // Modal de edição de logo
  const [editingLogo, setEditingLogo] = useState<{ construtora: Construtora, logo: File | null } | null>(null);

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

  const fetchImoveisCaptados = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'imoveis_captados'),
        where('imobiliariaId', '==', userData?.imobiliariaId)
      );
      const snap = await getDocs(q);
      const imoveisData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImovelCaptado));
      imoveisData.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      setImoveisCaptados(imoveisData);
    } catch (err) {
      setMsg('Erro ao carregar imóveis captados.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImovel = async (id: string, fotos: string[]) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;
    
    setLoading(true);
    try {
      // Deletar fotos do storage
      for (const fotoUrl of fotos) {
        const fotoRef = ref(storage, fotoUrl);
        await deleteObject(fotoRef);
      }
      
      await deleteDoc(doc(db, 'imoveis_captados', id));
      fetchImoveisCaptados();
      setMsg('Imóvel excluído com sucesso!');
    } catch (err) {
      setMsg('Erro ao excluir imóvel.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'casa':
        return <HouseIcon className="h-5 w-5" />;
      case 'apartamento':
        return <BuildingIcon className="h-5 w-5" />;
      case 'terreno':
        return <MapIcon className="h-5 w-5" />;
      case 'comercial':
        return <StoreIcon className="h-5 w-5" />;
      default:
        return <HouseIcon className="h-5 w-5" />;
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

  // Editar logo da construtora
  const handleEditLogo = async () => {
    if (!editingLogo?.construtora || !editingLogo.logo) return;
    
    setLoading(true);
    setMsg(null);
    try {
      // Upload da nova logo
      const logoRef = ref(storage, `logos/${Date.now()}_${editingLogo.logo.name}`);
      const snapshot = await uploadBytes(logoRef, editingLogo.logo);
      const logoUrl = await getDownloadURL(snapshot.ref);

      // Atualizar no Firestore
      await updateDoc(doc(db, 'construtoras', editingLogo.construtora.id), {
        logoUrl
      });

      setEditingLogo(null);
      fetchConstrutoras();
      setMsg('Logo atualizada com sucesso!');
    } catch (err) {
      setMsg('Erro ao atualizar logo.');
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
        tipo: 'link' as const, // Forçar tipo link
        url: formMaterial.url.trim(),
        descricao: formMaterial.descricao.trim(),
        produtoId: selectedProduto.id,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, 'materiais'), material);
      setFormMaterial({ nome: '', tipo: 'pdf', url: '', descricao: '' });
      fetchMateriais(selectedProduto.id);
      setMsg('Link criado!');
    } catch (err) {
      setMsg('Erro ao criar link.');
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
      // Para fotos, criar pasta "Fotos avulsas"
      const folderPath = tipo === 'foto' ? 'Fotos avulsas' : tipo;
      const storageRef = ref(storage, `materiais/${selectedProduto.id}/${folderPath}/${fileName}`);
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
              className="px-4 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-white rounded-lg font-semibold transition-colors"
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
                <BuildingIcon className="h-6 w-6 text-[#D4A017]" />
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
                  className="w-full bg-[#D4A017] hover:bg-[#B8860B] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
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
                          <div className="w-8 h-8 bg-[#D4A017] rounded-full flex items-center justify-center">
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
                          className="px-3 py-1 bg-[#D4A017] hover:bg-[#B8860B] text-white text-sm rounded transition-colors"
                        >
                          Produtos
                        </button>
                        <button
                          onClick={() => setEditingLogo({ construtora, logo: null })}
                          className="px-3 py-1 bg-[#3AC17C] hover:bg-[#2E9D63] text-white text-sm rounded transition-colors"
                        >
                          Logo
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
                <PackageIcon className="h-6 w-6 text-[#D4A017]" />
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
                  className="w-full bg-[#D4A017] hover:bg-[#B8860B] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
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
                          className="px-3 py-1 bg-[#D4A017] hover:bg-[#B8860B] text-white text-sm rounded transition-colors"
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
                  <FileIcon className="h-5 w-5 text-[#D4A017]" />
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
                  <LinkIcon className="h-5 w-5 text-[#D4A017]" />
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
                    type="text"
                    value={formMaterial.descricao}
                    onChange={e => setFormMaterial({ ...formMaterial, descricao: e.target.value })}
                    placeholder="Descrição do link (opcional)"
                    className="w-full rounded-lg border px-3 py-2"
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
                    className="w-full bg-[#D4A017] hover:bg-[#B8860B] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
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
                  <ImageIcon className="h-5 w-5 text-[#D4A017]" />
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
                  <VideoIcon className="h-5 w-5 text-[#D4A017]" />
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
                            className="px-2 py-1 bg-[#D4A017] hover:bg-[#B8860B] text-white text-xs rounded transition-colors"
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

        {/* Captações */}
        {view === 'captacoes' && (
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <HouseIcon className="h-8 w-8 text-[#3AC17C]" />
                <div>
                  <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Captações</h2>
                  <p className="text-[#6B6F76] dark:text-gray-300">Imóveis captados pelos corretores</p>
                </div>
              </div>
              <button
                onClick={() => setView('construtoras')}
                className="px-4 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-white rounded-lg font-semibold transition-colors"
              >
                ← Voltar
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : imoveisCaptados.length === 0 ? (
              <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
                Nenhum imóvel captado ainda
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {imoveisCaptados.map((imovel) => (
                  <div
                    key={imovel.id}
                    className="p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                  >
                    {/* Fotos */}
                    {imovel.fotos.length > 0 && (
                      <div className="mb-3">
                        <img
                          src={imovel.fotos[0]}
                          alt="Foto principal"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {imovel.fotos.length > 1 && (
                          <div className="flex gap-1 mt-1">
                            {imovel.fotos.slice(1, 4).map((foto, index) => (
                              <img
                                key={index}
                                src={foto}
                                alt={`Foto ${index + 2}`}
                                className="w-8 h-8 object-cover rounded"
                              />
                            ))}
                            {imovel.fotos.length > 4 && (
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500">
                                +{imovel.fotos.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Informações */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(imovel.tipo)}
                        <h3 className="font-semibold text-[#2E2F38] dark:text-white text-sm">
                          {imovel.nome}
                        </h3>
                      </div>
                      
                      <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                        {imovel.endereco}
                      </p>
                      
                      <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                        {imovel.bairro}, {imovel.cidade} - {imovel.estado}
                      </p>
                      
                      <p className="text-lg font-bold text-[#D4A017]">
                        {formatCurrency(imovel.valor)}
                      </p>
                      
                      {imovel.descricao && (
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300 line-clamp-2">
                          {imovel.descricao}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-[#6B6F76] dark:text-gray-300">
                            {imovel.corretorNome}
                          </p>
                          {imovel.localizacao && (
                            <a
                              href={imovel.localizacao}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-[#D4A017] hover:underline"
                            >
                              <MapPinIcon className="h-3 w-3" />
                              Maps
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteImovel(imovel.id, imovel.fotos)}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
            </div>
          ))}
        </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Edição de Logo */}
      {editingLogo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white flex items-center gap-2">
                <BuildingIcon className="h-6 w-6 text-[#D4A017]" />
                Editar Logo da Construtora
              </h2>
              <button
                onClick={() => setEditingLogo(null)}
                className="text-[#6B6F76] hover:text-[#2E2F38] dark:text-gray-300 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Nova Logo (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setEditingLogo({ ...editingLogo, logo: e.target.files?.[0] || null })}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingLogo(null)}
                  className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditLogo}
                  disabled={loading}
                  className="flex-1 bg-[#D4A017] hover:bg-[#B8860B] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Atualizando...' : 'Atualizar Logo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 