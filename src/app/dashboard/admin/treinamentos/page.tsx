'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface Treinamento {
  id: string;
  categoria: 'audiobooks' | 'vendas' | 'mercado' | 'institucional';
  titulo: string;
  descricao: string;
  tipo: 'video' | 'pdf';
  url: string;
  arquivo?: File;
  criadoEm: Date;
}

const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const FileIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

export default function TreinamentosAdminPage() {
  const { userData } = useAuth();
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingTreinamento, setEditingTreinamento] = useState<Treinamento | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<'audiobooks' | 'vendas' | 'mercado' | 'institucional'>('audiobooks');
  const [formTreinamento, setFormTreinamento] = useState({
    categoria: 'audiobooks' as 'audiobooks' | 'vendas' | 'mercado' | 'institucional',
    titulo: '',
    descricao: '',
    tipo: 'video' as 'video' | 'pdf',
    url: '',
    arquivo: null as File | null
  });

  const categorias = [
    { key: 'vendas', label: 'Vendas', icon: '📈' },
    { key: 'técnicas', label: 'Técnicas', icon: '🛠️' },
    { key: 'mercado', label: 'Mercado', icon: '🏢' },
    { key: 'motivacional', label: 'Motivacional', icon: '💪' },
    { key: 'gestão', label: 'Gestão', icon: '👔' },
    { key: 'institucional', label: 'Institucional', icon: '🏛️' },
    { key: 'audiobooks', label: 'Áudio Books', icon: '📚' }
  ];

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchTreinamentos();
  }, [userData, selectedCategoria]);

  const fetchTreinamentos = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'treinamentos'),
        where('imobiliariaId', '==', userData?.imobiliariaId),
        where('categoria', '==', selectedCategoria)
      );
      const snap = await getDocs(q);
      const treinamentosData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          categoria: data.categoria,
          titulo: data.titulo,
          descricao: data.descricao,
          tipo: data.tipo,
          url: data.url,
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date(data.criadoEm)
        } as Treinamento;
      });
      treinamentosData.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      setTreinamentos(treinamentosData);
    } catch (err) {
      setMsg('Erro ao carregar treinamentos.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormTreinamento({
      categoria: selectedCategoria,
      titulo: '',
      descricao: '',
      tipo: 'video',
      url: '',
      arquivo: null
    });
    setEditingTreinamento(null);
  };

  const handleAddTreinamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTreinamento.titulo.trim() || (!formTreinamento.url && !formTreinamento.arquivo)) {
      setMsg('Por favor, preencha os campos obrigatórios.');
      return;
    }
    
    setUploading(true);
    setMsg(null);
    try {
      let finalUrl = formTreinamento.url;

      // Upload do arquivo PDF se selecionado
      if (formTreinamento.arquivo && formTreinamento.tipo === 'pdf') {
        const arquivoRef = ref(storage, `treinamentos/${userData?.imobiliariaId}/${Date.now()}_${formTreinamento.arquivo.name}`);
        const snapshot = await uploadBytes(arquivoRef, formTreinamento.arquivo);
        finalUrl = await getDownloadURL(snapshot.ref);
      }

      const treinamento = {
        categoria: formTreinamento.categoria,
        titulo: formTreinamento.titulo.trim(),
        descricao: formTreinamento.descricao.trim(),
        tipo: formTreinamento.tipo,
        url: finalUrl,
        imobiliariaId: userData?.imobiliariaId,
        criadoEm: Timestamp.now(),
      };

      await addDoc(collection(db, 'treinamentos'), treinamento);
      resetForm();
      fetchTreinamentos();
      setMsg('Treinamento adicionado com sucesso!');
    } catch (err) {
      setMsg('Erro ao adicionar treinamento.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditTreinamento = (treinamento: Treinamento) => {
    setEditingTreinamento(treinamento);
    setFormTreinamento({
      categoria: treinamento.categoria,
      titulo: treinamento.titulo,
      descricao: treinamento.descricao,
      tipo: treinamento.tipo,
      url: treinamento.url,
      arquivo: null
    });
  };

  const handleUpdateTreinamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreinamento || !formTreinamento.titulo.trim() || (!formTreinamento.url && !formTreinamento.arquivo)) {
      setMsg('Por favor, preencha os campos obrigatórios.');
      return;
    }
    
    setUploading(true);
    setMsg(null);
    try {
      let finalUrl = formTreinamento.url;

      // Upload do arquivo PDF se selecionado
      if (formTreinamento.arquivo && formTreinamento.tipo === 'pdf') {
        const arquivoRef = ref(storage, `treinamentos/${userData?.imobiliariaId}/${Date.now()}_${formTreinamento.arquivo.name}`);
        const snapshot = await uploadBytes(arquivoRef, formTreinamento.arquivo);
        finalUrl = await getDownloadURL(snapshot.ref);
      }

      const updateData = {
        categoria: formTreinamento.categoria,
        titulo: formTreinamento.titulo.trim(),
        descricao: formTreinamento.descricao.trim(),
        tipo: formTreinamento.tipo,
        url: finalUrl,
      };

      await updateDoc(doc(db, 'treinamentos', editingTreinamento.id), updateData);
      resetForm();
      fetchTreinamentos();
      setMsg('Treinamento atualizado com sucesso!');
    } catch (err) {
      setMsg('Erro ao atualizar treinamento.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTreinamento = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este treinamento?')) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'treinamentos', id));
      fetchTreinamentos();
      setMsg('Treinamento excluído com sucesso!');
    } catch (err) {
      setMsg('Erro ao excluir treinamento.');
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : undefined;
  };

  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined;
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Gerenciar Treinamentos</h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Adicione e gerencie treinamentos para sua equipe</p>
          </div>
        </div>

        {msg && (
          <div className={`p-4 rounded-lg mb-6 ${msg.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {msg}
          </div>
        )}

        {/* Seletor de Categoria */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-6">
          <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Selecionar Categoria</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categorias.map((categoria) => (
              <button
                key={categoria.key}
                onClick={() => setSelectedCategoria(categoria.key as any)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedCategoria === categoria.key
                    ? 'border-[#3478F6] bg-[#3478F6]/10'
                    : 'border-[#E8E9F1] dark:border-[#23283A] hover:border-[#3478F6]/50'
                }`}
              >
                <div className="text-2xl mb-2">{categoria.icon}</div>
                <div className="font-semibold text-[#2E2F38] dark:text-white">{categoria.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] sticky top-6">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                {categorias.find(c => c.key === selectedCategoria)?.icon}
                {editingTreinamento ? 'Editar Treinamento' : 'Adicionar Treinamento'}
              </h2>
              
              <form onSubmit={editingTreinamento ? handleUpdateTreinamento : handleAddTreinamento} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Título *</label>
                  <input
                    type="text"
                    value={formTreinamento.titulo}
                    onChange={e => setFormTreinamento({ ...formTreinamento, titulo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                    placeholder="Ex: Técnicas de Vendas Avançadas"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Descrição</label>
                  <textarea
                    value={formTreinamento.descricao}
                    onChange={e => setFormTreinamento({ ...formTreinamento, descricao: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white min-h-[80px]"
                    placeholder="Descreva o conteúdo do treinamento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Tipo *</label>
                  <select
                    value={formTreinamento.tipo}
                    onChange={e => setFormTreinamento({ ...formTreinamento, tipo: e.target.value as 'video' | 'pdf' })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  >
                    <option value="video">Vídeo (YouTube)</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>

                {formTreinamento.tipo === 'video' ? (
                  <div>
                    <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">URL do YouTube *</label>
                    <input
                      type="url"
                      value={formTreinamento.url}
                      onChange={e => setFormTreinamento({ ...formTreinamento, url: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Arquivo PDF *</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        setFormTreinamento({ ...formTreinamento, arquivo: file });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                      required={!editingTreinamento}
                    />
                    {formTreinamento.arquivo && (
                      <p className="text-sm text-[#6B6F76] dark:text-gray-300 mt-2">
                        Arquivo selecionado: {formTreinamento.arquivo.name}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Salvando...' : (editingTreinamento ? 'Atualizar' : 'Adicionar')}
                  </button>
                  {editingTreinamento && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Lista de Treinamentos */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">
                {categorias.find(c => c.key === selectedCategoria)?.label} - Treinamentos
              </h2>
              
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : treinamentos.length === 0 ? (
                <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
                  Nenhum treinamento cadastrado nesta categoria
                </div>
              ) : (
                <div className="space-y-4">
                  {/* PDFs primeiro */}
                  {treinamentos.filter(t => t.tipo === 'pdf').map((treinamento) => (
                    <div
                      key={treinamento.id}
                      className="p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                            <FileIcon className="h-8 w-8 text-red-500" />
                          </div>
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-[#2E2F38] dark:text-white mb-1">
                            {treinamento.titulo}
                          </h3>
                          {treinamento.descricao && (
                            <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                              {treinamento.descricao}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <a
                              href={treinamento.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded transition-colors flex items-center gap-1"
                            >
                              <FileIcon className="h-3 w-3" />
                              Download
                            </a>
                            <button
                              onClick={() => handleEditTreinamento(treinamento)}
                              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                            >
                              <EditIcon className="h-3 w-3" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteTreinamento(treinamento.id)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                            >
                              <TrashIcon className="h-3 w-3" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Vídeos depois */}
                  {treinamentos.filter(t => t.tipo === 'video').map((treinamento) => (
                    <div
                      key={treinamento.id}
                      className="p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {getYouTubeThumbnail(treinamento.url) ? (
                            <img
                              src={getYouTubeThumbnail(treinamento.url)}
                              alt="Thumbnail do vídeo"
                              className="w-24 h-16 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-24 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <PlayIcon className="h-6 w-6 text-gray-500" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-[#2E2F38] dark:text-white mb-1">
                            {treinamento.titulo}
                          </h3>
                          {treinamento.descricao && (
                            <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                              {treinamento.descricao}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <a
                              href={treinamento.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                            >
                              <PlayIcon className="h-3 w-3" />
                              Assistir
                            </a>
                            <button
                              onClick={() => handleEditTreinamento(treinamento)}
                              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                            >
                              <EditIcon className="h-3 w-3" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteTreinamento(treinamento.id)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                            >
                              <TrashIcon className="h-3 w-3" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 