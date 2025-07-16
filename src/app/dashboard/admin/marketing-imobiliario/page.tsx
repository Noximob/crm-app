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

  // Formulários separados por tipo
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfNome, setPdfNome] = useState('');
  const [pdfDescricao, setPdfDescricao] = useState('');

  const [linkNome, setLinkNome] = useState('');
  const [linkDescricao, setLinkDescricao] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [fotosFiles, setFotosFiles] = useState<File[]>([]);
  const [fotosNome, setFotosNome] = useState('');
  const [fotosDescricao, setFotosDescricao] = useState('');

  const [videosFiles, setVideosFiles] = useState<File[]>([]);
  const [videosNome, setVideosNome] = useState('');
  const [videosDescricao, setVideosDescricao] = useState('');

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

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.imobiliariaId || !pdfFile || !pdfNome.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${pdfFile.name}`;
      const storageRef = ref(storage, `marketing/${userData.imobiliariaId}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, pdfFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const materialData = {
        imobiliariaId: userData.imobiliariaId,
        nome: pdfNome.trim(),
        descricao: pdfDescricao.trim() || undefined,
        tipo: 'pdf' as const,
        url: downloadUrl,
        tamanho: pdfFile.size,
        extensao: pdfFile.name.split('.').pop() || '',
        criadoEm: new Date(),
      };

      await addDoc(collection(db, 'materiais_marketing'), materialData);
      
      // Limpar formulário
      setPdfFile(null);
      setPdfNome('');
      setPdfDescricao('');
      
      await fetchMateriais();
      alert('PDF adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar PDF:', error);
      alert('Erro ao adicionar PDF. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleLinkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.imobiliariaId || !linkNome.trim() || !linkUrl.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setUploading(true);
    try {
      const materialData = {
        imobiliariaId: userData.imobiliariaId,
        nome: linkNome.trim(),
        descricao: linkDescricao.trim() || undefined,
        tipo: 'link' as const,
        url: linkUrl.trim(),
        criadoEm: new Date(),
      };

      await addDoc(collection(db, 'materiais_marketing'), materialData);
      
      // Limpar formulário
      setLinkNome('');
      setLinkDescricao('');
      setLinkUrl('');
      
      await fetchMateriais();
      alert('Link adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar link:', error);
      alert('Erro ao adicionar link. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleFotosUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.imobiliariaId || fotosFiles.length === 0 || !fotosNome.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setUploading(true);
    try {
      for (const file of fotosFiles) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storageRef = ref(storage, `marketing/${userData.imobiliariaId}/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        const materialData = {
          imobiliariaId: userData.imobiliariaId,
          nome: fotosNome.trim(),
          descricao: fotosDescricao.trim() || undefined,
          tipo: 'foto' as const,
          url: downloadUrl,
          tamanho: file.size,
          extensao: file.name.split('.').pop() || '',
          criadoEm: new Date(),
        };

        await addDoc(collection(db, 'materiais_marketing'), materialData);
      }
      
      // Limpar formulário
      setFotosFiles([]);
      setFotosNome('');
      setFotosDescricao('');
      
      await fetchMateriais();
      alert('Fotos adicionadas com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar fotos:', error);
      alert('Erro ao adicionar fotos. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleVideosUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.imobiliariaId || videosFiles.length === 0 || !videosNome.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setUploading(true);
    try {
      for (const file of videosFiles) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storageRef = ref(storage, `marketing/${userData.imobiliariaId}/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        const materialData = {
          imobiliariaId: userData.imobiliariaId,
          nome: videosNome.trim(),
          descricao: videosDescricao.trim() || undefined,
          tipo: 'video' as const,
          url: downloadUrl,
          tamanho: file.size,
          extensao: file.name.split('.').pop() || '',
          criadoEm: new Date(),
        };

        await addDoc(collection(db, 'materiais_marketing'), materialData);
      }
      
      // Limpar formulário
      setVideosFiles([]);
      setVideosNome('');
      setVideosDescricao('');
      
      await fetchMateriais();
      alert('Vídeos adicionados com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar vídeos:', error);
      alert('Erro ao adicionar vídeos. Tente novamente.');
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Marketing Imobiliário</h1>
          <p className="text-[#6B6F76] dark:text-gray-300 text-base">
            Cadastre e gerencie os materiais de marketing da sua imobiliária. 
            Eles ficarão disponíveis para todos em Materiais &gt; Marketing Imobiliário.
          </p>
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Upload PDF */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#3478F6] to-[#A3C8F7] rounded-lg flex items-center justify-center">
                <FileIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Upload PDF</h2>
            </div>
            
            <form onSubmit={handlePdfUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Nome do PDF *
                </label>
                <input
                  type="text"
                  value={pdfNome}
                  onChange={(e) => setPdfNome(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  placeholder="Ex: Folder de lançamento"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={pdfDescricao}
                  onChange={(e) => setPdfDescricao(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  rows={2}
                  placeholder="Descrição do PDF..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Arquivo PDF *
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  required
                />
                {pdfFile && (
                  <p className="text-xs text-[#6B6F76] dark:text-gray-300 mt-1">
                    Arquivo selecionado: {pdfFile.name} ({formatFileSize(pdfFile.size)})
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-[#6B6F76] text-white font-bold py-3 rounded-xl shadow transition-all"
              >
                {uploading ? 'Adicionando...' : 'Adicionar PDF'}
              </button>
            </form>
          </div>

          {/* Adicionar Link */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#3478F6] to-[#A3C8F7] rounded-lg flex items-center justify-center">
                <LinkIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Adicionar Link</h2>
            </div>
            
            <form onSubmit={handleLinkAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Nome do link *
                </label>
                <input
                  type="text"
                  value={linkNome}
                  onChange={(e) => setLinkNome(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  placeholder="Ex: Campanha Google Ads"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Descrição do link (opcional)
                </label>
                <textarea
                  value={linkDescricao}
                  onChange={(e) => setLinkDescricao(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  rows={2}
                  placeholder="Descrição do link..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  URL do link *
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  placeholder="https://exemplo.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-[#6B6F76] text-white font-bold py-3 rounded-xl shadow transition-all"
              >
                {uploading ? 'Adicionando...' : 'Adicionar Link'}
              </button>
            </form>
          </div>

          {/* Upload Fotos */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#3478F6] to-[#A3C8F7] rounded-lg flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Upload Fotos</h2>
            </div>
            
            <form onSubmit={handleFotosUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Nome das fotos *
                </label>
                <input
                  type="text"
                  value={fotosNome}
                  onChange={(e) => setFotosNome(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  placeholder="Ex: Fotos do lançamento"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={fotosDescricao}
                  onChange={(e) => setFotosDescricao(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  rows={2}
                  placeholder="Descrição das fotos..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Arquivos de imagem *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFotosFiles(Array.from(e.target.files || []))}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  required
                />
                {fotosFiles.length > 0 && (
                  <p className="text-xs text-[#6B6F76] dark:text-gray-300 mt-1">
                    {fotosFiles.length} arquivo(s) selecionado(s)
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-[#6B6F76] text-white font-bold py-3 rounded-xl shadow transition-all"
              >
                {uploading ? 'Adicionando...' : 'Adicionar Fotos'}
              </button>
            </form>
          </div>

          {/* Upload Vídeos */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#3478F6] to-[#A3C8F7] rounded-lg flex items-center justify-center">
                <VideoIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Upload Vídeos</h2>
            </div>
            
            <form onSubmit={handleVideosUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Nome dos vídeos *
                </label>
                <input
                  type="text"
                  value={videosNome}
                  onChange={(e) => setVideosNome(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  placeholder="Ex: Vídeos promocionais"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={videosDescricao}
                  onChange={(e) => setVideosDescricao(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  rows={2}
                  placeholder="Descrição dos vídeos..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Arquivos de vídeo *
                </label>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => setVideosFiles(Array.from(e.target.files || []))}
                  className="w-full rounded-lg border border-[#E8E9F1] dark:border-[#23283A] px-3 py-2 text-sm bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white"
                  required
                />
                {videosFiles.length > 0 && (
                  <p className="text-xs text-[#6B6F76] dark:text-gray-300 mt-1">
                    {videosFiles.length} arquivo(s) selecionado(s)
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-[#6B6F76] text-white font-bold py-3 rounded-xl shadow transition-all"
              >
                {uploading ? 'Adicionando...' : 'Adicionar Vídeos'}
              </button>
            </form>
          </div>
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
              <p className="text-[#6B6F76] dark:text-gray-300">Adicione materiais de marketing usando os formulários acima.</p>
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