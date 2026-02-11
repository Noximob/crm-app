'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

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
  descricao?: string;
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
  condicoesPagamento?: string;
  descricao: string;
  fotoCapa: string;
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

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function MateriaisConstrutorasPage() {
  const { userData } = useAuth();
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [imoveisCaptados, setImoveisCaptados] = useState<ImovelCaptado[]>([]);
  const [loading, setLoading] = useState(false);

  // Navegação
  const [view, setView] = useState<'construtoras' | 'produtos' | 'materiais' | 'captacoes' | 'detalhes-imovel'>('construtoras');
  const [selectedConstrutora, setSelectedConstrutora] = useState<Construtora | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [selectedImovel, setSelectedImovel] = useState<ImovelCaptado | null>(null);

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
      setConstrutoras(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Construtora)));
    } catch (err) {
      console.error('Erro ao carregar construtoras:', err);
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
      console.error('Erro ao carregar produtos:', err);
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
      console.error('Erro ao carregar materiais:', err);
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
      const imoveisData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          imobiliariaId: data.imobiliariaId,
          corretorId: data.corretorId,
          corretorNome: data.corretorNome,
          nome: data.nome,
          endereco: data.endereco,
          bairro: data.bairro || '',
          cidade: data.cidade || '',
          estado: data.estado || '',
          localizacao: data.localizacao || '',
          tipo: data.tipo,
          valor: data.valor,
          condicoesPagamento: data.condicoesPagamento || '',
          descricao: data.descricao || '',
          fotoCapa: data.fotoCapa || '',
          fotos: data.fotos || [],
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date(data.criadoEm)
        } as ImovelCaptado;
      });
      imoveisData.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      setImoveisCaptados(imoveisData);
      console.log('Imóveis captados carregados:', imoveisData.length);
    } catch (err) {
      console.error('Erro ao carregar imóveis captados:', err);
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

  const getBreadcrumbs = () => {
    const breadcrumbs = ['Materiais Construtoras'];
    if (selectedConstrutora) breadcrumbs.push(selectedConstrutora.nome);
    if (selectedProduto) breadcrumbs.push(selectedProduto.nome);
    return breadcrumbs.join(' > ');
  };

  const getFilteredMateriais = () => {
    return materiais;
  };

  const getGroupedMateriais = () => {
    const links = materiais.filter(m => m.tipo === 'link');
    const materiais_pdf = materiais.filter(m => m.tipo === 'pdf');
    const videos = materiais.filter(m => m.tipo === 'video');
    const fotos = materiais.filter(m => m.tipo === 'foto');
    
    return { links, materiais_pdf, videos, fotos };
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  // Adicionar estado de loading por material
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (material: Material) => {
    if (material.url) {
      setDownloadingId(material.id);
      try {
        const response = await fetch(material.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = material.nome;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (e) {
        alert('Erro ao baixar o arquivo.');
      }
      setDownloadingId(null);
    }
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
                setSelectedProduto(null);
              }}
              className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg font-semibold transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>



        {/* Lista de Construtoras */}
        {view === 'construtoras' && (
          <div>
            {/* Pasta Captações Fixa */}
            <div className="mb-8 p-6 rounded-xl border-2 border-[#3AC17C] bg-gradient-to-r from-[#3AC17C]/10 to-[#3AC17C]/5 dark:from-[#3AC17C]/20 dark:to-[#3AC17C]/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#3AC17C] to-[#4CAF50] rounded-xl flex items-center justify-center">
                    <HouseIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#2E2F38] dark:text-white">Captações</h3>
                    <p className="text-[#6B6F76] dark:text-gray-300">Imóveis captados pelos corretores</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setView('captacoes');
                    fetchImoveisCaptados();
                  }}
                  className="px-6 py-3 bg-[#3AC17C] hover:bg-[#2E9D63] text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
                >
                  Acessar Captações
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div>
              </div>
            ) : construtoras.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏗️</div>
                <h3 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhuma construtora cadastrada</h3>
                <p className="text-[#6B6F76] dark:text-gray-300">As construtoras aparecerão aqui quando forem cadastradas pelo administrador.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {construtoras.map(construtora => (
                  <div
                    key={construtora.id}
                    className="bg-white dark:bg-[#23283A] rounded-xl p-6 border border-[#E8E9F1] dark:border-[#23283A] cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 group"
                    onClick={() => {
                      setSelectedConstrutora(construtora);
                      setView('produtos');
                    }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      {construtora.logoUrl ? (
                        <img src={construtora.logoUrl} alt={construtora.nome} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-[#F59E0B] to-[#FCD34D] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <BuildingIcon className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-[#2E2F38] dark:text-white text-lg group-hover:text-[#F59E0B] transition-colors">
                          {construtora.nome}
                        </h3>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">Clique para ver produtos</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#6B6F76] dark:text-gray-300">
                      <span>Produtos disponíveis</span>
                      <span className="bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-1 rounded-full">Ver</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de Produtos */}
        {view === 'produtos' && selectedConstrutora && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div>
              </div>
            ) : produtos.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhum produto cadastrado</h3>
                <p className="text-[#6B6F76] dark:text-gray-300">Os produtos de {selectedConstrutora.nome} aparecerão aqui quando forem cadastrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {produtos.map(produto => (
                  <div
                    key={produto.id}
                    className="bg-white dark:bg-[#23283A] rounded-xl p-6 border border-[#E8E9F1] dark:border-[#23283A] cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 group"
                    onClick={() => {
                      setSelectedProduto(produto);
                      setView('materiais');
                    }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#3AC17C] to-[#4CAF50] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <PackageIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#2E2F38] dark:text-white text-lg group-hover:text-[#3AC17C] transition-colors">
                          {produto.nome}
                        </h3>
                        {produto.descricao && (
                          <p className="text-sm text-[#6B6F76] dark:text-gray-300">{produto.descricao}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#6B6F76] dark:text-gray-300">
                      <span>Materiais disponíveis</span>
                      <span className="bg-[#3AC17C]/10 text-[#3AC17C] px-2 py-1 rounded-full">Ver</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de Materiais */}
        {view === 'materiais' && selectedProduto && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div>
              </div>
            ) : materiais.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhum material encontrado</h3>
                <p className="text-[#6B6F76] dark:text-gray-300">
                  {selectedProduto.nome + ' não possui materiais cadastrados.'}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Links */}
                {getGroupedMateriais().links.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-[#F59E0B]" />
                      Links
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getGroupedMateriais().links.map(material => (
                        <div
                          key={material.id}
                          className="bg-white dark:bg-[#23283A] rounded-xl p-3 border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-md transition-all duration-200 hover:scale-105"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#F59E0B] to-[#FCD34D] rounded-lg flex items-center justify-center flex-shrink-0">
                              <LinkIcon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[#2E2F38] dark:text-white text-sm mb-1">
                                {material.nome}
                              </h4>
                              {material.descricao && (
                                <p className="text-xs text-[#6B6F76] dark:text-gray-300 line-clamp-1">
                                  {material.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {material.url && (
                              <a
                                href={material.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs rounded-lg transition-colors font-semibold text-center"
                              >
                                Acessar Link
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PDFs */}
                {getGroupedMateriais().materiais_pdf.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                      <FileIcon className="h-5 w-5 text-[#F59E0B]" />
                      PDFs
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getGroupedMateriais().materiais_pdf.map(material => (
                        <div
                          key={material.id}
                          className="bg-white dark:bg-[#23283A] rounded-xl p-3 border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-md transition-all duration-200 hover:scale-105"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#F59E0B] to-[#FCD34D] rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileIcon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[#2E2F38] dark:text-white text-sm truncate">
                                {material.nome}
                              </h4>
                              {material.tamanho && (
                                <p className="text-xs text-[#6B6F76] dark:text-gray-300">
                                  {formatFileSize(material.tamanho)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {material.url && (
                              <button
                                onClick={() => handleDownload(material)}
                                disabled={downloadingId === material.id}
                                className="flex-1 px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs rounded-lg transition-colors font-semibold"
                              >
                                {downloadingId === material.id ? (
                                  <span className="flex items-center gap-2"><SpinnerIcon /> Baixando...</span>
                                ) : 'Download'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vídeos */}
                {getGroupedMateriais().videos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                      <VideoIcon className="h-5 w-5 text-[#F59E0B]" />
                      Vídeos
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {getGroupedMateriais().videos.map(material => (
                        <div
                          key={material.id}
                          className="bg-white dark:bg-[#23283A] rounded-xl p-3 border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-md transition-all duration-200 hover:scale-105"
                        >
                          <div className="aspect-square mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center relative group">
                            {material.url ? (
                              <>
                                <video
                                  src={material.url}
                                  className="w-full h-full object-cover rounded-lg"
                                  preload="metadata"
                                  onLoadedData={e => {
                                    const video = e.currentTarget;
                                    video.currentTime = 0.1;
                                  }}
                                  onError={e => {
                                    const target = e.currentTarget as HTMLElement;
                                    target.style.display = "none";
                                    const nextElement = target.nextElementSibling as HTMLElement;
                                    if (nextElement) nextElement.style.display = "flex";
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                                    <VideoIcon className="h-6 w-6 text-[#F59E0B]" />
                                  </div>
                                </div>
                              </>
                            ) : null}
                            <div className="hidden items-center justify-center text-gray-400">
                              <VideoIcon className="h-8 w-8" />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-[#2E2F38] dark:text-white truncate mb-1">
                              {material.nome}
                            </p>
                            {material.tamanho && (
                              <p className="text-xs text-[#6B6F76] dark:text-gray-300">
                                {formatFileSize(material.tamanho)}
                              </p>
                            )}
                            {material.url && (
                              <button
                                onClick={() => handleDownload(material)}
                                disabled={downloadingId === material.id}
                                className="w-full mt-2 px-2 py-1 bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs rounded transition-colors font-semibold"
                              >
                                {downloadingId === material.id ? (
                                  <span className="flex items-center gap-2"><SpinnerIcon /> Baixando...</span>
                                ) : 'Download'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fotos Avulsas */}
                {getGroupedMateriais().fotos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-[#F59E0B]" />
                      Fotos Avulsas
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {getGroupedMateriais().fotos.map(material => (
                        <div
                          key={material.id}
                          className="bg-white dark:bg-[#23283A] rounded-xl p-3 border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-md transition-all duration-200 hover:scale-105"
                        >
                          <div className="aspect-square mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            {material.url ? (
                              <img
                                src={material.url}
                                alt={material.nome}
                                className="w-full h-full object-cover rounded-lg"
                                onError={e => {
                                  const target = e.currentTarget as HTMLElement;
                                  target.style.display = "none";
                                  const nextElement = target.nextElementSibling as HTMLElement;
                                  if (nextElement) nextElement.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div className="hidden items-center justify-center text-gray-400">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                          </div>
                          <div className="text-center">
                            {material.tamanho && (
                              <p className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1">
                                {formatFileSize(material.tamanho)}
                              </p>
                            )}
                            {material.url && (
                              <button
                                onClick={() => handleDownload(material)}
                                disabled={downloadingId === material.id}
                                className="w-full mt-2 px-2 py-1 bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs rounded transition-colors font-semibold"
                              >
                                {downloadingId === material.id ? (
                                  <span className="flex items-center gap-2"><SpinnerIcon /> Baixando...</span>
                                ) : 'Download'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Lista de Captações */}
        {view === 'captacoes' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B]"></div>
              </div>
            ) : imoveisCaptados.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏠</div>
                <h3 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhum imóvel captado</h3>
                <p className="text-[#6B6F76] dark:text-gray-300">Os imóveis captados pelos corretores aparecerão aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {imoveisCaptados.map((imovel) => (
                  <div
                    key={imovel.id}
                    className="bg-white dark:bg-[#23283A] rounded-xl p-4 border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-md transition-all duration-200 hover:scale-105 group cursor-pointer"
                    onClick={() => {
                      setSelectedImovel(imovel);
                      setView('detalhes-imovel');
                    }}
                  >
                    {/* Foto Capa */}
                    {imovel.fotoCapa ? (
                      <div className="mb-3">
                        <img
                          src={imovel.fotoCapa}
                          alt="Foto capa"
                          className="w-full h-24 object-cover rounded-lg mb-2"
                        />
                        {imovel.fotos.length > 0 && (
                          <div className="flex gap-1">
                            {imovel.fotos.slice(0, 3).map((foto, index) => (
                              <img
                                key={index}
                                src={foto}
                                alt={`Foto ${index + 1}`}
                                className="w-6 h-6 object-cover rounded"
                              />
                            ))}
                            {imovel.fotos.length > 3 && (
                              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500">
                                +{imovel.fotos.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : imovel.fotos.length > 0 ? (
                      <div className="mb-3">
                        <img
                          src={imovel.fotos[0]}
                          alt="Foto principal"
                          className="w-full h-24 object-cover rounded-lg mb-2"
                        />
                        {imovel.fotos.length > 1 && (
                          <div className="flex gap-1">
                            {imovel.fotos.slice(1, 4).map((foto, index) => (
                              <img
                                key={index}
                                src={foto}
                                alt={`Foto ${index + 2}`}
                                className="w-6 h-6 object-cover rounded"
                              />
                            ))}
                            {imovel.fotos.length > 4 && (
                              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500">
                                +{imovel.fotos.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-3 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}

                    {/* Informações Essenciais */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(imovel.tipo)}
                        <h3 className="font-bold text-[#2E2F38] dark:text-white text-base group-hover:text-[#3AC17C] transition-colors truncate">
                          {imovel.nome}
                        </h3>
                      </div>
                      
                      <p className="text-lg font-bold text-[#3AC17C]">
                        {formatCurrency(imovel.valor)}
                      </p>
                      
                      {imovel.condicoesPagamento && (
                        <p className="text-xs text-[#6B6F76] dark:text-gray-300 line-clamp-1">
                          {imovel.condicoesPagamento}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-[#6B6F76] dark:text-gray-300">
                          {imovel.corretorNome}
                        </p>
                        {imovel.localizacao && (
                          <a
                            href={imovel.localizacao}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-[#F59E0B] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPinIcon className="h-3 w-3" />
                            Maps
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detalhes do Imóvel */}
        {view === 'detalhes-imovel' && selectedImovel && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setView('captacoes');
                    setSelectedImovel(null);
                  }}
                  className="p-2 rounded-lg bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] hover:bg-gray-50 dark:hover:bg-[#2A2F42] transition-colors"
                >
                  <svg className="h-5 w-5 text-[#2E2F38] dark:text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m12 19-7-7 7-7"/>
                    <path d="M19 12H5"/>
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white">{selectedImovel.nome}</h1>
                  <p className="text-[#6B6F76] dark:text-gray-300">{selectedImovel.endereco}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Coluna Principal */}
              <div className="lg:col-span-2 space-y-6">
                {/* Foto Capa */}
                {selectedImovel.fotoCapa && (
                  <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                    <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Foto Principal</h2>
                    <img
                      src={selectedImovel.fotoCapa}
                      alt="Foto capa"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Galeria de Fotos */}
                {selectedImovel.fotos.filter(f => f.toLowerCase().includes('.jpg') || f.toLowerCase().includes('.jpeg') || f.toLowerCase().includes('.png') || f.toLowerCase().includes('.gif') || f.toLowerCase().includes('.webp')).length > 0 && (
                  <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                    <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-[#F59E0B]" />
                      Fotos
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {selectedImovel.fotos.filter(f => f.toLowerCase().includes('.jpg') || f.toLowerCase().includes('.jpeg') || f.toLowerCase().includes('.png') || f.toLowerCase().includes('.gif') || f.toLowerCase().includes('.webp')).map((foto, index) => (
                        <div key={index} className="bg-white dark:bg-[#23283A] rounded-xl p-4 border border-[#E8E9F1] dark:border-[#23283A] flex flex-col items-center">
                          <div className="aspect-square mb-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden w-full">
                            <img
                              src={foto}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                          <div className="space-y-2 w-full">
                            <h4 className="font-semibold text-[#2E2F38] dark:text-white text-sm truncate text-center">
                              Foto {index + 1}
                            </h4>
                            {/* Não temos tamanho real, então não mostra */}
                            <button
                              onClick={async () => {
                                setDownloadingId(`foto-${index}`);
                                try {
                                  const response = await fetch(foto);
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `foto_${index + 1}.jpg`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                } catch (error) {
                                  alert('Erro ao baixar a foto.');
                                }
                                setDownloadingId(null);
                              }}
                              disabled={downloadingId === `foto-${index}`}
                              className="w-full px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#6B6F76] disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold text-sm"
                            >
                              {downloadingId === `foto-${index}` ? (
                                <span className="flex items-center justify-center gap-2">
                                  <SpinnerIcon /> 
                                  Baixando...
                                </span>
                              ) : 'Download'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Galeria de Vídeos */}
                {selectedImovel.fotos.filter(f => f.toLowerCase().includes('.mp4') || f.toLowerCase().includes('.avi') || f.toLowerCase().includes('.mov') || f.toLowerCase().includes('.wmv') || f.toLowerCase().includes('.flv') || f.toLowerCase().includes('.webm') || f.toLowerCase().includes('.mkv')).length > 0 && (
                  <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                    <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                      <VideoIcon className="h-5 w-5 text-[#F59E0B]" />
                      Vídeos
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {selectedImovel.fotos.filter(f => f.toLowerCase().includes('.mp4') || f.toLowerCase().includes('.avi') || f.toLowerCase().includes('.mov') || f.toLowerCase().includes('.wmv') || f.toLowerCase().includes('.flv') || f.toLowerCase().includes('.webm') || f.toLowerCase().includes('.mkv')).map((video, index) => (
                        <div key={index} className="bg-white dark:bg-[#23283A] rounded-xl p-4 border border-[#E8E9F1] dark:border-[#23283A] flex flex-col items-center">
                          <div className="aspect-video mb-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden w-full">
                            <video
                              src={video}
                              controls
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                          <div className="space-y-2 w-full">
                            <h4 className="font-semibold text-[#2E2F38] dark:text-white text-sm truncate text-center">
                              Vídeo {index + 1}
                            </h4>
                            <button
                              onClick={async () => {
                                setDownloadingId(`video-${index}`);
                                try {
                                  const response = await fetch(video);
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `video_${index + 1}.mp4`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                } catch (error) {
                                  alert('Erro ao baixar o vídeo.');
                                }
                                setDownloadingId(null);
                              }}
                              disabled={downloadingId === `video-${index}`}
                              className="w-full px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#6B6F76] disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold text-sm"
                            >
                              {downloadingId === `video-${index}` ? (
                                <span className="flex items-center justify-center gap-2">
                                  <SpinnerIcon /> 
                                  Baixando...
                                </span>
                              ) : 'Download'}
                            </button>
              </div>
            </div>
          ))}
        </div>
                  </div>
                )}

                {/* Descrição */}
                {selectedImovel.descricao && (
                  <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                    <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Descrição</h2>
                    <p className="text-[#6B6F76] dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {selectedImovel.descricao}
                    </p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Informações Principais */}
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                  <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Informações</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <HouseIcon className="h-5 w-5 text-[#F59E0B]" />
                      <div>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">Tipo</p>
                        <p className="font-semibold text-[#2E2F38] dark:text-white">
                          {selectedImovel.tipo === 'casa' ? 'Casa' : 
                           selectedImovel.tipo === 'apartamento' ? 'Apartamento' :
                           selectedImovel.tipo === 'terreno' ? 'Terreno' : 'Comercial'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPinIcon className="h-5 w-5 text-[#F59E0B]" />
                      <div>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">Endereço</p>
                        <p className="font-semibold text-[#2E2F38] dark:text-white">{selectedImovel.endereco}</p>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                          {selectedImovel.bairro}, {selectedImovel.cidade} - {selectedImovel.estado}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-[#F59E0B]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <div>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">Corretor</p>
                        <p className="font-semibold text-[#2E2F38] dark:text-white">{selectedImovel.corretorNome}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-[#F59E0B]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                        <line x1="16" x2="16" y1="2" y2="6"/>
                        <line x1="8" x2="8" y1="2" y2="6"/>
                        <line x1="3" x2="21" y1="10" y2="10"/>
                      </svg>
                      <div>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">Captado em</p>
                        <p className="font-semibold text-[#2E2F38] dark:text-white">
                          {new Intl.DateTimeFormat('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).format(selectedImovel.criadoEm)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valor */}
                <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                  <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Valor</h2>
                  <p className="text-3xl font-bold text-[#3AC17C]">{formatCurrency(selectedImovel.valor)}</p>
                  {selectedImovel.condicoesPagamento && (
                    <p className="text-sm text-[#6B6F76] dark:text-gray-300 mt-2">
                      {selectedImovel.condicoesPagamento}
                    </p>
                  )}
                </div>

                {/* Localização */}
                {selectedImovel.localizacao && (
                  <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                    <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Localização</h2>
                    <a
                      href={selectedImovel.localizacao}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      Ver no Google Maps
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 