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

export default function MateriaisConstrutorasPage() {
  const { userData } = useAuth();
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');

  // Navegação
  const [view, setView] = useState<'construtoras' | 'produtos' | 'materiais'>('construtoras');
  const [selectedConstrutora, setSelectedConstrutora] = useState<Construtora | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

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

  const getBreadcrumbs = () => {
    const breadcrumbs = ['Materiais Construtoras'];
    if (selectedConstrutora) breadcrumbs.push(selectedConstrutora.nome);
    if (selectedProduto) breadcrumbs.push(selectedProduto.nome);
    return breadcrumbs.join(' > ');
  };

  const getFilteredMateriais = () => {
    let filtered = materiais;
    
    if (searchTerm) {
      filtered = filtered.filter(material => 
        material.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedTipo) {
      filtered = filtered.filter(material => material.tipo === selectedTipo);
    }
    
    return filtered;
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

  const handleDownload = (material: Material) => {
    if (material.url) {
      const link = document.createElement('a');
      link.href = material.url;
      link.download = material.nome;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
                setSearchTerm('');
                setSelectedTipo('');
              }}
              className="px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>

        {/* Filtros para materiais */}
        {view === 'materiais' && selectedProduto && (
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Buscar material</label>
                <input
                  type="text"
                  placeholder="Digite o nome do material..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Filtrar por tipo</label>
                <select
                  value={selectedTipo}
                  onChange={e => setSelectedTipo(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Todos os tipos</option>
                  <option value="pdf">📄 PDF</option>
                  <option value="link">🔗 Link</option>
                  <option value="foto">📸 Foto</option>
                  <option value="video">🎥 Vídeo</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Construtoras */}
        {view === 'construtoras' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6]"></div>
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
                        <div className="w-12 h-12 bg-gradient-to-br from-[#3478F6] to-[#A3C8F7] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <BuildingIcon className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-[#2E2F38] dark:text-white text-lg group-hover:text-[#3478F6] transition-colors">
                          {construtora.nome}
                        </h3>
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300">Clique para ver produtos</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#6B6F76] dark:text-gray-300">
                      <span>Produtos disponíveis</span>
                      <span className="bg-[#3478F6]/10 text-[#3478F6] px-2 py-1 rounded-full">Ver</span>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6]"></div>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6]"></div>
              </div>
            ) : getFilteredMateriais().length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhum material encontrado</h3>
                <p className="text-[#6B6F76] dark:text-gray-300">
                  {searchTerm || selectedTipo ? 'Tente ajustar os filtros de busca.' : 'Os materiais de ' + selectedProduto.nome + ' aparecerão aqui quando forem cadastrados.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredMateriais().map(material => (
                  <div
                    key={material.id}
                    className="bg-white dark:bg-[#23283A] rounded-xl p-4 border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-md transition-all duration-200 hover:scale-105"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {getMaterialIcon(material.tipo)}
                      <div className="flex-1">
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
                          className="flex-1 px-3 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded-lg transition-colors font-semibold"
                        >
                          {material.tipo === 'link' ? 'Abrir' : 'Download'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 