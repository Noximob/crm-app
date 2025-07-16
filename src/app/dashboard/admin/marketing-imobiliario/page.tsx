'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, orderBy, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface Campanha {
  id: string;
  nome: string;
  descricao?: string;
  criadoEm: Date;
}

interface MaterialMarketing {
  id: string;
  campanhaId: string;
  nome: string;
  tipo: 'pdf' | 'link' | 'foto' | 'video';
  url?: string;
  descricao?: string;
  tamanho?: number;
  extensao?: string;
  criadoEm: Date;
}

// Ícones
const CampaignIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5Z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
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

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

export default function MarketingImobiliarioAdminPage() {
  const { userData } = useAuth();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [materiais, setMateriais] = useState<MaterialMarketing[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Navegação
  const [view, setView] = useState<'campanhas' | 'materiais'>('campanhas');
  const [selectedCampanha, setSelectedCampanha] = useState<Campanha | null>(null);

  // Formulários
  const [formCampanha, setFormCampanha] = useState({ nome: '', descricao: '' });
  const [formMaterial, setFormMaterial] = useState({ 
    nome: '', 
    tipo: 'pdf' as 'pdf' | 'link' | 'foto' | 'video', 
    url: '', 
    descricao: '' 
  });
  const [uploading, setUploading] = useState(false);

  // Buscar dados
  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchCampanhas();
  }, [userData]);

  useEffect(() => {
    if (selectedCampanha) {
      fetchMateriais(selectedCampanha.id);
    }
  }, [selectedCampanha]);

  const fetchCampanhas = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'campanhas_marketing'),
        where('imobiliariaId', '==', userData?.imobiliariaId),
        orderBy('nome')
      );
      const snap = await getDocs(q);
      setCampanhas(snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : data.criadoEm
        } as Campanha;
      }));
    } catch (err: any) {
      setMsg('Erro ao carregar campanhas: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const fetchMateriais = async (campanhaId: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'materiais_marketing'),
        where('campanhaId', '==', campanhaId),
        orderBy('nome')
      );
      const snap = await getDocs(q);
      setMateriais(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialMarketing)));
    } catch (err) {
      setMsg('Erro ao carregar materiais.');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Campanha
  const handleAddCampanha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCampanha.nome.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const campanha = {
        nome: formCampanha.nome.trim(),
        descricao: formCampanha.descricao.trim() || undefined,
        imobiliariaId: userData?.imobiliariaId,
        criadoEm: Timestamp.now()
      };

      await addDoc(collection(db, 'campanhas_marketing'), campanha);
      setFormCampanha({ nome: '', descricao: '' });
      await fetchCampanhas();
      setMsg('Campanha criada com sucesso!');
    } catch (err: any) {
      setMsg('Erro ao criar campanha: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampanha = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'campanhas_marketing', id));
      await fetchCampanhas();
      setMsg('Campanha excluída com sucesso!');
    } catch (err) {
      setMsg('Erro ao excluir campanha.');
    } finally {
      setLoading(false);
    }
  };

  // CRUD Material
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMaterial.nome.trim()) return;
    if (formMaterial.tipo === 'link' && !formMaterial.url.trim()) {
      setMsg('URL é obrigatória para links.');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      let url = '';
      let tamanho = 0;
      let extensao = '';

      if (formMaterial.tipo === 'link') {
        url = formMaterial.url.trim();
      } else {
        // Para outros tipos, precisaria de upload de arquivo
        setMsg('Funcionalidade de upload será implementada.');
        return;
      }

      const material = {
        campanhaId: selectedCampanha?.id,
        nome: formMaterial.nome.trim(),
        tipo: formMaterial.tipo,
        url,
        descricao: formMaterial.descricao.trim() || undefined,
        tamanho: tamanho || undefined,
        extensao: extensao || undefined,
        criadoEm: Timestamp.now()
      };

      await addDoc(collection(db, 'materiais_marketing'), material);
      setFormMaterial({ nome: '', tipo: 'pdf', url: '', descricao: '' });
      await fetchMateriais(selectedCampanha!.id);
      setMsg('Material adicionado com sucesso!');
    } catch (err: any) {
      setMsg('Erro ao adicionar material: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (file: File, tipo: 'pdf' | 'foto' | 'video') => {
    if (!selectedCampanha) return;
    
    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `marketing/${userData?.imobiliariaId}/${selectedCampanha.id}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const material = {
        campanhaId: selectedCampanha.id,
        nome: file.name,
        tipo,
        url: downloadUrl,
        tamanho: file.size,
        extensao: file.name.split('.').pop() || '',
        criadoEm: Timestamp.now()
      };

      await addDoc(collection(db, 'materiais_marketing'), material);
      await fetchMateriais(selectedCampanha.id);
      setMsg('Arquivo enviado com sucesso!');
    } catch (err: any) {
      setMsg('Erro ao enviar arquivo: ' + (err?.message || err));
    } finally {
      setUploading(false);
    }
  };

  const handleUploadMultipleFiles = async (files: FileList, tipo: 'foto' | 'video') => {
    if (!selectedCampanha) return;
    
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await handleUploadFile(file, tipo);
      }
      setMsg(`${files.length} arquivo(s) enviado(s) com sucesso!`);
    } catch (err: any) {
      setMsg('Erro ao enviar arquivos: ' + (err?.message || err));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string, url?: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;
    setLoading(true);
    try {
      if (url && !url.startsWith('http')) {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      }
      await deleteDoc(doc(db, 'materiais_marketing', id));
      await fetchMateriais(selectedCampanha!.id);
      setMsg('Material excluído com sucesso!');
    } catch (err) {
      setMsg('Erro ao excluir material.');
    } finally {
      setLoading(false);
    }
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = ['Marketing Imobiliário'];
    if (selectedCampanha) breadcrumbs.push(selectedCampanha.nome);
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Marketing Imobiliário</h1>
            <p className="text-[#6B6F76] dark:text-gray-300 text-left text-base">{getBreadcrumbs()}</p>
          </div>
          {view !== 'campanhas' && (
            <button
              onClick={() => {
                setView('campanhas');
                setSelectedCampanha(null);
              }}
              className="px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg font-semibold transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>

        {msg && (
          <div className={`mb-6 p-4 rounded-lg ${msg.includes('sucesso') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {msg}
          </div>
        )}

        {/* Lista de Campanhas */}
        {view === 'campanhas' && (
          <div>
            {/* Formulário para adicionar campanha */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Nova Campanha</h2>
              <form onSubmit={handleAddCampanha} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Nome da campanha"
                  value={formCampanha.nome}
                  onChange={(e) => setFormCampanha({ ...formCampanha, nome: e.target.value })}
                  className="flex-1 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={formCampanha.descricao}
                  onChange={(e) => setFormCampanha({ ...formCampanha, descricao: e.target.value })}
                  className="flex-1 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-[#6B6F76] text-white font-bold px-6 py-2 rounded-lg shadow transition-all"
                >
                  {loading ? 'Criando...' : 'Criar Campanha'}
                </button>
              </form>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6]"></div>
              </div>
            ) : campanhas.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📢</div>
                <h3 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhuma campanha cadastrada</h3>
                <p className="text-[#6B6F76] dark:text-gray-300">Crie uma campanha para começar a adicionar materiais de marketing.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campanhas.map(campanha => (
                  <div
                    key={campanha.id}
                    className="bg-white dark:bg-[#23283A] rounded-xl p-6 border border-[#E8E9F1] dark:border-[#23283A] cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105 group"
                    onClick={() => {
                      setSelectedCampanha(campanha);
                      setView('materiais');
                    }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#3478F6] to-[#A3C8F7] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CampaignIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#2E2F38] dark:text-white text-lg group-hover:text-[#3478F6] transition-colors">
                          {campanha.nome}
                        </h3>
                        {campanha.descricao && (
                          <p className="text-sm text-[#6B6F76] dark:text-gray-300">{campanha.descricao}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#6B6F76] dark:text-gray-300">
                      <span>Materiais disponíveis</span>
                      <span className="bg-[#3478F6]/10 text-[#3478F6] px-2 py-1 rounded-full">Ver</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de Materiais */}
        {view === 'materiais' && selectedCampanha && (
          <div>
            {/* Formulário para adicionar material */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Adicionar Material</h2>
              
              <form onSubmit={handleAddMaterial} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nome do material"
                    value={formMaterial.nome}
                    onChange={(e) => setFormMaterial({ ...formMaterial, nome: e.target.value })}
                    className="rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                    required
                  />
                  <select
                    value={formMaterial.tipo}
                    onChange={(e) => setFormMaterial({ ...formMaterial, tipo: e.target.value as 'pdf' | 'link' | 'foto' | 'video' })}
                    className="rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  >
                    <option value="pdf">PDF</option>
                    <option value="link">Link</option>
                    <option value="foto">Foto</option>
                    <option value="video">Vídeo</option>
                  </select>
                </div>

                {formMaterial.tipo === 'link' && (
                  <input
                    type="url"
                    placeholder="URL do link"
                    value={formMaterial.url}
                    onChange={(e) => setFormMaterial({ ...formMaterial, url: e.target.value })}
                    className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                    required
                  />
                )}

                {formMaterial.tipo === 'pdf' && (
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0], 'pdf')}
                    className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  />
                )}

                {formMaterial.tipo === 'foto' && (
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleUploadMultipleFiles(e.target.files, 'foto')}
                    className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  />
                )}

                {formMaterial.tipo === 'video' && (
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => e.target.files && handleUploadMultipleFiles(e.target.files, 'video')}
                    className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  />
                )}

                <textarea
                  placeholder="Descrição (opcional)"
                  value={formMaterial.descricao}
                  onChange={(e) => setFormMaterial({ ...formMaterial, descricao: e.target.value })}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  rows={2}
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || uploading}
                    className="bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-[#6B6F76] text-white font-bold px-6 py-2 rounded-lg shadow transition-all"
                  >
                    {loading || uploading ? 'Adicionando...' : 'Adicionar Material'}
                  </button>
                </div>
              </form>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6]"></div>
              </div>
            ) : materiais.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhum material encontrado</h3>
                <p className="text-[#6B6F76] dark:text-gray-300">
                  {selectedCampanha.nome + ' não possui materiais cadastrados.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {materiais.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center gap-4 p-4 border border-[#E8E9F1] dark:border-[#23283A] rounded-xl hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-[#3478F6] to-[#A3C8F7] rounded-lg flex items-center justify-center flex-shrink-0">
                      {getMaterialIcon(material.tipo)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#2E2F38] dark:text-white text-sm truncate">
                        {material.nome}
                      </h3>
                      {material.descricao && (
                        <p className="text-xs text-[#6B6F76] dark:text-gray-300 line-clamp-2">
                          {material.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#6B6F76] dark:text-gray-400 uppercase">
                          {material.tipo}
                        </span>
                        {material.tamanho && (
                          <span className="text-xs text-[#6B6F76] dark:text-gray-400">
                            • {formatFileSize(material.tamanho)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteMaterial(material.id, material.url)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Excluir material"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
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