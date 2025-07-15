'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface MaterialMarketing {
  id: string;
  imobiliariaId: string;
  nome: string;
  tipo: 'pdf' | 'link' | 'foto' | 'video';
  url?: string;
  descricao?: string;
  tamanho?: number;
  extensao?: string;
  criadoEm: Date;
}

// Ícones
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
  const [materiais, setMateriais] = useState<MaterialMarketing[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'pdf' | 'link' | 'foto' | 'video'>('pdf');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [url, setUrl] = useState('');

  // Modal de confirmação
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<MaterialMarketing | null>(null);

  useEffect(() => {
    if (userData?.imobiliariaId) {
      fetchMateriais();
    }
  }, [userData]);

  const fetchMateriais = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'materiais_marketing'),
        where('imobiliariaId', '==', userData?.imobiliariaId),
        orderBy('criadoEm', 'desc')
      );
      const snap = await getDocs(q);
      setMateriais(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialMarketing)));
    } catch (err) {
      console.error('Erro ao carregar materiais:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivo(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.imobiliariaId) return;

    if (tipo === 'link' && !url.trim()) {
      alert('Por favor, insira a URL do link.');
      return;
    }

    if (tipo !== 'link' && !arquivo) {
      alert('Por favor, selecione um arquivo.');
      return;
    }

    if (!nome.trim()) {
      alert('Por favor, insira um nome para o material.');
      return;
    }

    setUploading(true);
    try {
      let downloadUrl = '';
      let tamanho = 0;
      let extensao = '';

      if (tipo === 'link') {
        downloadUrl = url.trim();
      } else if (arquivo) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${arquivo.name}`;
        const storageRef = ref(storage, `marketing/${userData.imobiliariaId}/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, arquivo);
        downloadUrl = await getDownloadURL(snapshot.ref);
        tamanho = arquivo.size;
        extensao = arquivo.name.split('.').pop() || '';
      }

      const materialData = {
        imobiliariaId: userData.imobiliariaId,
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        tipo,
        url: downloadUrl,
        tamanho: tamanho || undefined,
        extensao: extensao || undefined,
        criadoEm: new Date(),
      };

      await addDoc(collection(db, 'materiais_marketing'), materialData);
      
      // Limpar formulário
      setNome('');
      setDescricao('');
      setTipo('pdf');
      setArquivo(null);
      setUrl('');
      
      // Recarregar lista
      await fetchMateriais();
      
      alert('Material adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar material:', error);
      alert('Erro ao adicionar material. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (material: MaterialMarketing) => {
    setMaterialToDelete(material);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;

    try {
      // Deletar arquivo do Storage se não for link
      if (materialToDelete.tipo !== 'link' && materialToDelete.url) {
        const storageRef = ref(storage, materialToDelete.url);
        await deleteObject(storageRef);
      }

      // Deletar documento do Firestore
      await deleteDoc(doc(db, 'materiais_marketing', materialToDelete.id));
      
      await fetchMateriais();
      alert('Material excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      alert('Erro ao excluir material. Tente novamente.');
    } finally {
      setShowDeleteModal(false);
      setMaterialToDelete(null);
    }
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Marketing Imobiliário</h1>
                     <p className="text-[#6B6F76] dark:text-gray-300 text-base">
             Cadastre e gerencie os materiais de marketing da sua imobiliária. 
             Eles ficarão disponíveis para todos em Materiais &gt; Marketing Imobiliário.
           </p>
        </div>

        {/* Formulário */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
          <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Adicionar Material</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Nome do Material *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  placeholder="Ex: Folder de lançamento"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Tipo *
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'pdf' | 'link' | 'foto' | 'video')}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                >
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                  <option value="foto">Foto</option>
                  <option value="video">Vídeo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                Descrição
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                rows={3}
                placeholder="Descrição opcional do material..."
              />
            </div>

            {tipo === 'link' ? (
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  URL do Link *
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  placeholder="https://exemplo.com"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Arquivo *
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept={
                    tipo === 'pdf' ? 'application/pdf' :
                    tipo === 'foto' ? 'image/*' :
                    tipo === 'video' ? 'video/*' : '*'
                  }
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  required
                />
                {arquivo && (
                  <p className="text-xs text-[#6B6F76] dark:text-gray-300 mt-1">
                    Arquivo selecionado: {arquivo.name} ({formatFileSize(arquivo.size)})
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading}
                className="bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-[#6B6F76] text-white font-bold px-8 py-3 rounded-xl shadow transition-all"
              >
                {uploading ? 'Adicionando...' : 'Adicionar Material'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Materiais */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
          <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Materiais Cadastrados</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6]"></div>
            </div>
          ) : materiais.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhum material cadastrado</h3>
              <p className="text-[#6B6F76] dark:text-gray-300">Adicione materiais de marketing usando o formulário acima.</p>
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
                      <span className="text-xs text-[#6B6F76] dark:text-gray-400">
                        • {formatDate(material.criadoEm)}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(material)}
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
      </div>

      {/* Modal de Confirmação */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-[#6B6F76] dark:text-gray-300 mb-6">
              Tem certeza que deseja excluir o material "{materialToDelete?.nome}"? 
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-[#6B6F76] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#181C23] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 