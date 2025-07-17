'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Treinamento {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string;
  tipo: 'video' | 'pdf';
  url: string;
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

const MaximizeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
    <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
    <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
    <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
  </svg>
);

export default function MercadoPage() {
  const { userData } = useAuth();
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchTreinamentos();
  }, [userData]);

  const fetchTreinamentos = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'treinamentos'),
        where('imobiliariaId', '==', userData?.imobiliariaId),
        where('categoria', '==', 'mercado')
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
      console.error('Erro ao carregar treinamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : undefined;
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : undefined;
  };

  const pdfs = treinamentos.filter(t => t.tipo === 'pdf');
  const videos = treinamentos.filter(t => t.tipo === 'video');

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">🏢 Mercado</h1>
          <p className="text-[#6B6F76] dark:text-gray-300">Análises de mercado, tendências e insights sobre o setor imobiliário</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6] mx-auto"></div>
            <p className="mt-4 text-[#6B6F76] dark:text-gray-300">Carregando treinamentos...</p>
          </div>
        ) : treinamentos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h2 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhum treinamento de mercado disponível</h2>
            <p className="text-[#6B6F76] dark:text-gray-300">Os treinamentos serão adicionados em breve pela administração.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* PDFs */}
            {pdfs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <FileIcon className="h-6 w-6 text-red-500" />
                  Materiais em PDF
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pdfs.map((treinamento) => (
                    <div
                      key={treinamento.id}
                      className="bg-white dark:bg-[#23283A] rounded-xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                          <FileIcon className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#2E2F38] dark:text-white">
                            {treinamento.titulo}
                          </h3>
                        </div>
                      </div>
                      
                      {treinamento.descricao && (
                        <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-4">
                          {treinamento.descricao}
                        </p>
                      )}
                      
                      <a
                        href={treinamento.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                      >
                        <FileIcon className="h-4 w-4" />
                        Download PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vídeos */}
            {videos.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <PlayIcon className="h-6 w-6 text-red-500" />
                  Vídeos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((treinamento) => {
                    const embedUrl = getYouTubeEmbedUrl(treinamento.url);
                    return (
                      <div
                        key={treinamento.id}
                        className="bg-white dark:bg-[#23283A] rounded-xl overflow-hidden shadow-soft border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-lg transition-shadow"
                      >
                        {embedUrl ? (
                          <div className="relative">
                            <iframe
                              src={embedUrl}
                              title={treinamento.titulo}
                              className="w-full h-48"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                            <button
                              onClick={() => setSelectedVideo(treinamento.url)}
                              className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-lg transition-colors"
                              title="Maximizar vídeo"
                            >
                              <MaximizeIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <PlayIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        
                        <div className="p-4">
                          <h3 className="font-semibold text-[#2E2F38] dark:text-white mb-2">
                            {treinamento.titulo}
                          </h3>
                          
                          {treinamento.descricao && (
                            <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-3">
                              {treinamento.descricao}
                            </p>
                          )}
                          
                          <a
                            href={treinamento.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                          >
                            <PlayIcon className="h-4 w-4" />
                            Assistir no YouTube
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal de vídeo maximizado */}
        {selectedVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#23283A] rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#2E2F38] dark:text-white">
                  Vídeo em Tela Cheia
                </h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="relative">
                <iframe
                  src={getYouTubeEmbedUrl(selectedVideo) || ''}
                  title="Vídeo maximizado"
                  className="w-full h-96"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 