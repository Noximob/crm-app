"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  orderBy,
  doc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

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

export default function MateriaisImobiliariaAdminPage() {
  const { userData } = useAuth();
  const [materiais, setMateriais] = useState<MaterialImobiliaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [formMaterial, setFormMaterial] = useState({ nome: "", tipo: "pdf" as "pdf" | "link" | "foto" | "video", url: "", descricao: "" });
  const [uploading, setUploading] = useState(false);

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
      setMsg("Erro ao carregar materiais.");
    } finally {
      setLoading(false);
    }
  };

  // CRUD Material
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMaterial.nome.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const material = {
        nome: formMaterial.nome.trim(),
        tipo: "link" as const, // Forçar tipo link
        url: formMaterial.url.trim(),
        descricao: formMaterial.descricao.trim(),
        imobiliariaId: userData?.imobiliariaId,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, "materiais_imobiliaria"), material);
      setFormMaterial({ nome: "", tipo: "pdf", url: "", descricao: "" });
      fetchMateriais();
      setMsg("Link criado!");
    } catch (err) {
      setMsg("Erro ao criar link.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (file: File, tipo: "pdf" | "foto" | "video") => {
    setUploading(true);
    setMsg(null);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const folderPath = tipo === "foto" ? "fotos" : tipo;
      const storageRef = ref(storage, `materiais_imobiliaria/${userData?.imobiliariaId}/${folderPath}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const material = {
        nome: file.name,
      tipo,
        url: downloadURL,
        tamanho: file.size,
        extensao: file.name.split(".").pop()?.toLowerCase(),
        imobiliariaId: userData?.imobiliariaId,
        criadoEm: Timestamp.now(),
      };
      await addDoc(collection(db, "materiais_imobiliaria"), material);
      fetchMateriais();
      setMsg("Arquivo enviado com sucesso!");
    } catch (err) {
      setMsg("Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadMultipleFiles = async (files: FileList, tipo: "foto" | "video") => {
    setUploading(true);
    setMsg(null);
    try {
      const uploadPromises = Array.from(files).map(file => handleUploadFile(file, tipo));
      await Promise.all(uploadPromises);
      setMsg(`${files.length} arquivo(s) enviado(s) com sucesso!`);
    } catch (err) {
      setMsg("Erro ao enviar arquivos.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string, url?: string) => {
    if (!confirm("Tem certeza?")) return;
    setLoading(true);
    try {
      if (url) {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      }
      await deleteDoc(doc(db, "materiais_imobiliaria", id));
      fetchMateriais();
      setMsg("Material excluído!");
    } catch (err) {
      setMsg("Erro ao excluir material.");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Gestão de Materiais Imobiliária</h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Materiais Imobiliária</p>
          </div>
        </div>
        {/* Mensagem */}
        {msg && (
          <div className={`p-4 rounded-lg mb-6 ${msg.includes("Erro") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {msg}
          </div>
        )}
        {/* Formulários de Material */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* PDF */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
              <FileIcon className="h-5 w-5 text-[#3478F6]" />
              Upload PDF
            </h3>
            <input
              type="file"
              accept=".pdf"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file, "pdf");
              }}
              disabled={uploading}
              className="w-full rounded-lg border px-3 py-2"
            />
            {uploading && <p className="text-sm text-[#6B6F76] mt-2">Enviando...</p>}
            </div>
          {/* Links */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-[#3478F6]" />
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
                className="w-full bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Adicionando..." : "Adicionar Link"}
              </button>
            </form>
          </div>
        </div>
        {/* Upload de Fotos e Vídeos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Fotos */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
            <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-[#3478F6]" />
              Upload Fotos
            </h3>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => {
                if (e.target.files) {
                  handleUploadMultipleFiles(e.target.files, "foto");
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
              <VideoIcon className="h-5 w-5 text-[#3478F6]" />
              Upload Vídeos
            </h3>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={e => {
                if (e.target.files) {
                  handleUploadMultipleFiles(e.target.files, "video");
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
          <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Materiais Imobiliária</h3>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : getGroupedMateriais().links.length + getGroupedMateriais().materiais_pdf.length + getGroupedMateriais().videos.length + getGroupedMateriais().fotos.length === 0 ? (
            <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
              Nenhum material cadastrado
            </div>
          ) : (
            <div className="space-y-8">
              {/* Links */}
              {getGroupedMateriais().links.length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-[#2E2F38] dark:text-white mb-2 flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-[#3478F6]" />
                    Links
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getGroupedMateriais().links.map((material) => (
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
                              className="px-2 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded transition-colors"
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
                </div>
              )}
              {/* PDFs */}
              {getGroupedMateriais().materiais_pdf.length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-[#2E2F38] dark:text-white mb-2 flex items-center gap-2">
                    <FileIcon className="h-5 w-5 text-[#3478F6]" />
                    PDFs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getGroupedMateriais().materiais_pdf.map((material) => (
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
                              className="px-2 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded transition-colors"
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
                </div>
              )}
              {/* Vídeos */}
              {getGroupedMateriais().videos.length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-[#2E2F38] dark:text-white mb-2 flex items-center gap-2">
                    <VideoIcon className="h-5 w-5 text-[#3478F6]" />
                    Vídeos
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {getGroupedMateriais().videos.map((material) => (
                      <div
                        key={material.id}
                        className="p-3 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                      >
                        <div className="aspect-square mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center relative group">
                          {material.url ? (
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
                          ) : null}
                          <div className="hidden items-center justify-center text-gray-400">
                            <VideoIcon className="h-8 w-8" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-[#2E2F38] dark:text-white truncate mb-1">{material.nome}</p>
                          {material.tamanho && (
                            <p className="text-xs text-[#6B6F76] dark:text-gray-300">{formatFileSize(material.tamanho)}</p>
                          )}
                          {material.url && (
                            <a
                              href={material.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full mt-2 px-2 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded transition-colors font-semibold block"
                            >
                              Ver
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteMaterial(material.id, material.url)}
                            className="w-full mt-2 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors font-semibold"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Fotos */}
              {getGroupedMateriais().fotos.length > 0 && (
                <div>
                  <h4 className="text-md font-bold text-[#2E2F38] dark:text-white mb-2 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-[#3478F6]" />
                    Fotos
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {getGroupedMateriais().fotos.map((material) => (
                      <div
                        key={material.id}
                        className="p-3 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
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
                            <p className="text-xs text-[#6B6F76] dark:text-gray-300 mb-1">{formatFileSize(material.tamanho)}</p>
                          )}
                          {material.url && (
                            <a
                              href={material.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full mt-2 px-2 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded transition-colors font-semibold block"
                            >
                              Ver
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteMaterial(material.id, material.url)}
                            className="w-full mt-2 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors font-semibold"
                          >
                            Excluir
                          </button>
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
    </div>
  );
} 