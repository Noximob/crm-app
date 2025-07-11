'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

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

export default function MateriaisConstrutorasPage() {
  const { userData } = useAuth();
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');

  // Navegação
  const [view, setView] = useState<'construtoras' | 'empreendimentos' | 'materiais'>('construtoras');
  const [selectedConstrutora, setSelectedConstrutora] = useState<Construtora | null>(null);
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<Empreendimento | null>(null);

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
      setConstrutoras(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Construtora)));
    } catch (err) {
      console.error('Erro ao carregar construtoras:', err);
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
      console.error('Erro ao carregar empreendimentos:', err);
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
      console.error('Erro ao carregar materiais:', err);
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

  const getFilteredMateriais = () => {
    let filtered = materiais;
    
    if (searchTerm) {
      filtered = filtered.filter(material => 
        material.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategoria) {
      filtered = filtered.filter(material => material.categoria === selectedCategoria);
    }
    
    return filtered;
  };

  const getFileIcon = (material: Material) => {
    if (material.tipo === 'pasta') return '📁';
    if (material.extensao === 'pdf') return '📄';
    if (material.extensao === 'doc' || material.extensao === 'docx') return '📝';
    if (material.extensao === 'xls' || material.extensao === 'xlsx') return '📊';
    if (material.extensao === 'mp4' || material.extensao === 'mov') return '🎥';
    if (material.extensao === 'jpg' || material.extensao === 'jpeg' || material.extensao === 'png') return '📸';
    return '📄';
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
                setSelectedEmpreendimento(null);
                setSearchTerm('');
                setSelectedCategoria('');
              }}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>

        {/* Filtros para materiais */}
        {view === 'materiais' && selectedEmpreendimento && (
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
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Filtrar por categoria</label>
                <select
                  value={selectedCategoria}
                  onChange={e => setSelectedCategoria(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Todas as categorias</option>
                  {CATEGORIAS.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
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
                    className="bg-white dark:bg-[#23283A] rounded-xl p-6 border border-[#E8E9F1] dark:border-[#23283A] cursor-pointer hover:shadow-md transition-shadow hover:scale-105"
                    onClick={() => {
                      setSelectedConstrutora(construtora);
                      setView('empreendimentos');
                    }}
                  >
                    <div className="text-4xl mb-4">🏗️</div>
                    <h3 className="font-bold text-[#2E2F38] dark:text-white text-lg mb-2">{construtora.nome}</h3>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-300">Clique para ver empreendimentos</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de Empreendimentos */}
        {view === 'empreendimentos' && selectedConstrutora && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6]"></div>
              </div>
            ) : empreendimentos.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏠</div>
                <h3 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhum empreendimento cadastrado</h3>
                <p className="text-[#6B6F76] dark:text-gray-300">Os empreendimentos aparecerão aqui quando forem cadastrados pelo administrador.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {empreendimentos.map(empreendimento => (
                  <div
                    key={empreendimento.id}
                    className="bg-white dark:bg-[#23283A] rounded-xl p-6 border border-[#E8E9F1] dark:border-[#23283A] cursor-pointer hover:shadow-md transition-shadow hover:scale-105"
                    onClick={() => {
                      setSelectedEmpreendimento(empreendimento);
                      setView('materiais');
                    }}
                  >
                    <div className="text-4xl mb-4">🏠</div>
                    <h3 className="font-bold text-[#2E2F38] dark:text-white text-lg mb-2">{empreendimento.nome}</h3>
                    {empreendimento.descricao && (
                      <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">{empreendimento.descricao}</p>
                    )}
                    <p className="text-sm text-[#6B6F76] dark:text-gray-300">Clique para ver materiais</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de Materiais */}
        {view === 'materiais' && selectedEmpreendimento && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6]"></div>
              </div>
            ) : getFilteredMateriais().length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">
                  {searchTerm || selectedCategoria ? 'Nenhum material encontrado' : 'Nenhum material cadastrado'}
                </h3>
                <p className="text-[#6B6F76] dark:text-gray-300">
                  {searchTerm || selectedCategoria 
                    ? 'Tente ajustar os filtros de busca.' 
                    : 'Os materiais aparecerão aqui quando forem cadastrados pelo administrador.'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredMateriais().map(material => (
                  <div
                    key={material.id}
                    className="bg-white dark:bg-[#23283A] rounded-xl p-6 border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-3xl">{getFileIcon(material)}</div>
                      {material.categoria && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                          {CATEGORIAS.find(cat => cat.value === material.categoria)?.icon} {CATEGORIAS.find(cat => cat.value === material.categoria)?.label}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-[#2E2F38] dark:text-white text-lg mb-2">{material.nome}</h3>
                    
                    {material.tamanho && (
                      <p className="text-xs text-[#6B6F76] dark:text-gray-300 mb-3">
                        {formatFileSize(material.tamanho)}
                      </p>
                    )}
                    
                    {material.url && material.tipo === 'arquivo' && (
                      <button
                        onClick={() => handleDownload(material)}
                        className="w-full px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors text-sm"
                      >
                        📥 Download
                      </button>
                    )}
                    
                    {material.tipo === 'pasta' && (
                      <div className="text-sm text-[#6B6F76] dark:text-gray-300">
                        Pasta organizacional
                      </div>
                    )}
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