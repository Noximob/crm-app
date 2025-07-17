"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface MaterialImobiliaria {
  id: string;
  imobiliariaId: string;
  nome: string;
  tipo: "pdf" | "link" | "foto" | "video";
  url?: string;
  descricao?: string;
  tamanho?: number;
  extensao?: string;
  criadoEm: Date;
}

const FileIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const LinkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);
const VideoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
  </svg>
);

export default function MateriaisImobiliariaPage() {
  const { userData } = useAuth();
  const [materiais, setMateriais] = useState<MaterialImobiliaria[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchMateriais();
  }, [userData]);

  const fetchMateriais = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "materiais_imobiliaria"),
        where("imobiliariaId", "==", userData?.imobiliariaId)
      );
      const snap = await getDocs(q);
      const materiaisData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialImobiliaria));
      // Ordenar localmente por nome
      materiaisData.sort((a, b) => a.nome.localeCompare(b.nome));
      setMateriais(materiaisData);
    } catch (err) {
      // erro silencioso
    }
    setLoading(false);
  };

  const getMaterialIcon = (tipo: string) => {
    switch (tipo) {
      case "pdf":
        return <FileIcon className="h-5 w-5" />;
      case "link":
        return <LinkIcon className="h-5 w-5" />;
      case "foto":
        return <ImageIcon className="h-5 w-5" />;
      case "video":
        return <VideoIcon className="h-5 w-5" />;
      default:
        return <FileIcon className="h-5 w-5" />;
    }
  };

  // Agrupamento
  const getGroupedMateriais = () => {
    const links = materiais.filter((m) => m.tipo === "link");
    const materiais_pdf = materiais.filter((m) => m.tipo === "pdf");
    const videos = materiais.filter((m) => m.tipo === "video");
    const fotos = materiais.filter((m) => m.tipo === "foto");
    return { links, materiais_pdf, videos, fotos };
  };
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const handleDownload = async (material: MaterialImobiliaria) => {
    if (material.url) {
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
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 text-left">Materiais Imobiliária</h1>
        </div>
        
        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : materiais.length === 0 ? (
          <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
            Nenhum material cadastrado
          </div>
        ) : (
          <div className="space-y-8">
            {/* Links */}
            {getGroupedMateriais().links.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-[#3478F6]" />
                  Links
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getGroupedMateriais().links.map((material) => (
                    <div
                      key={material.id}
                      className="bg-white dark:bg-[#23283A] rounded-xl p-4 border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-md transition-all duration-200 hover:scale-105"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#3478F6] to-[#A3C8F7] rounded-lg flex items-center justify-center flex-shrink-0">
                          <LinkIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[#2E2F38] dark:text-white text-sm mb-1">
                            {material.nome}
                          </h4>
                          {material.descricao && (
                            <p className="text-xs text-[#6B6F76] dark:text-gray-300 mb-2 line-clamp-2">
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
                            className="flex-1 px-3 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded-lg transition-colors font-semibold text-center"
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
                  <FileIcon className="h-5 w-5 text-[#3478F6]" />
                  PDFs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getGroupedMateriais().materiais_pdf.map((material) => (
                    <div
                      key={material.id}
                      className="bg-white dark:bg-[#23283A] rounded-xl p-4 border border-[#E8E9F1] dark:border-[#23283A] hover:shadow-md transition-all duration-200 hover:scale-105"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#3478F6] to-[#A3C8F7] rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileIcon className="h-5 w-5 text-white" />
                        </div>
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
                            Download
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
                  <VideoIcon className="h-5 w-5 text-[#3478F6]" />
                  Vídeos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {getGroupedMateriais().videos.map((material) => (
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
                                <VideoIcon className="h-6 w-6 text-[#3478F6]" />
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
                            className="w-full mt-2 px-2 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded transition-colors font-semibold"
                          >
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fotos */}
            {getGroupedMateriais().fotos.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-[#3478F6]" />
                  Fotos Avulsas
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {getGroupedMateriais().fotos.map((material) => (
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
                            className="w-full mt-2 px-2 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded transition-colors font-semibold"
                          >
                            Download
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
    </div>
  );
} 