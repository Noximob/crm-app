"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  onSnapshot,
  updateDoc,
  where,
  Timestamp,
  addDoc,
} from "firebase/firestore";

interface Ideia {
  id: string;
  userId: string;
  userNome: string;
  titulo: string;
  descricao: string;
  status: "pendente" | "aprovada" | "implementada" | "rejeitada";
  votos: number;
  criadoEm: Timestamp;
  categoria: "interface" | "funcionalidade" | "performance" | "outros";
  comentarioAdmin?: string; // Comentário do administrador sobre a decisão
}

interface Comentario {
  id: string;
  ideiaId: string;
  userId: string;
  userNome: string;
  texto: string;
  criadoEm: Timestamp;
}

interface MelhoriasEmAndamento {
  id: string;
  titulo: string;
  descricao: string;
  atualizadoEm: Timestamp;
}

const LightbulbIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21h6"/>
    <path d="M10 21c5-3 7-7 7-12a6 6 0 0 0-12 0c0 5 2 9 5 12z"/>
  </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const MessageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const ThumbsUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 9V5a3 3 0 0 0-6 0v4"/>
    <rect width="20" height="14" x="2" y="9" rx="2" ry="2"/>
  </svg>
);

export default function IdeiasAdminPage() {
  const { userData } = useAuth();
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedIdeia, setSelectedIdeia] = useState<Ideia | null>(null);
  const [showComentarios, setShowComentarios] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todas" | "pendente" | "aprovada" | "implementada" | "rejeitada">("todas");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [melhoriasEmAndamento, setMelhoriasEmAndamento] = useState<MelhoriasEmAndamento[]>([]);
  const [showMelhoriasForm, setShowMelhoriasForm] = useState(false);
  const [formMelhoria, setFormMelhoria] = useState({
    titulo: "",
    descricao: "",
  });

  // Estados para comentário administrativo
  const [showComentarioAdminModal, setShowComentarioAdminModal] = useState(false);
  const [ideiaParaComentar, setIdeiaParaComentar] = useState<Ideia | null>(null);
  const [novoStatus, setNovoStatus] = useState<"aprovada" | "rejeitada" | "implementada">("aprovada");
  const [comentarioAdmin, setComentarioAdmin] = useState("");

  useEffect(() => {
    if (userData) {
      fetchIdeias();
      fetchMelhoriasEmAndamento();
    }
  }, [userData]);

  const fetchIdeias = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "ideias"),
        orderBy("criadoEm", "desc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ideiasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ideia));
        setIdeias(ideiasData);
      });
      return () => unsubscribe();
    } catch (err) {
      setMsg("Erro ao carregar ideias.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ideiaId: string, novoStatus: "pendente" | "aprovada" | "implementada" | "rejeitada", comentario?: string) => {
    try {
      const ideiaRef = doc(db, "ideias", ideiaId);
      const updateData: any = { status: novoStatus };
      
      if (comentario && comentario.trim()) {
        updateData.comentarioAdmin = comentario.trim();
      }
      
      await updateDoc(ideiaRef, updateData);
      setMsg(`Status atualizado para ${getStatusLabel(novoStatus)}`);
    } catch (err) {
      setMsg("Erro ao atualizar status.");
    }
  };

  const handleOpenComentarioAdminModal = (ideia: Ideia, status: "aprovada" | "rejeitada" | "implementada") => {
    setIdeiaParaComentar(ideia);
    setNovoStatus(status);
    setComentarioAdmin("");
    setShowComentarioAdminModal(true);
  };

  const handleSubmitComentarioAdmin = async () => {
    if (!ideiaParaComentar) return;
    
    await handleUpdateStatus(ideiaParaComentar.id, novoStatus, comentarioAdmin);
    setShowComentarioAdminModal(false);
    setIdeiaParaComentar(null);
    setComentarioAdmin("");
  };

  const handleDeleteIdeia = async (ideiaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ideia?")) return;
    
    setDeletingIds(prev => new Set(prev).add(ideiaId));
    try {
      // Deletar comentários primeiro
      const comentariosQuery = query(
        collection(db, "comentarios_ideias"),
        where("ideiaId", "==", ideiaId)
      );
      const comentariosSnapshot = await getDocs(comentariosQuery);
      const deleteComentariosPromises = comentariosSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteComentariosPromises);
      
      // Deletar a ideia
      await deleteDoc(doc(db, "ideias", ideiaId));
      setMsg("Ideia excluída com sucesso!");
    } catch (err) {
      setMsg("Erro ao excluir ideia.");
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(ideiaId);
        return newSet;
      });
    }
  };

  const fetchComentarios = async (ideiaId: string) => {
    try {
      const q = query(
        collection(db, "comentarios_ideias"),
        where("ideiaId", "==", ideiaId),
        orderBy("criadoEm", "asc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const comentariosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comentario));
        setComentarios(comentariosData);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Erro ao carregar comentários:", err);
    }
  };

  const fetchMelhoriasEmAndamento = async () => {
    try {
      const q = query(
        collection(db, "melhorias_em_andamento"),
        orderBy("atualizadoEm", "desc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const melhoriasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MelhoriasEmAndamento));
        setMelhoriasEmAndamento(melhoriasData);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Erro ao carregar melhorias em andamento:", err);
    }
  };

  const handleAddMelhoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMelhoria.titulo.trim() || !formMelhoria.descricao.trim()) return;
    
    try {
      const melhoria = {
        titulo: formMelhoria.titulo.trim(),
        descricao: formMelhoria.descricao.trim(),
        atualizadoEm: Timestamp.now(),
      };
      
      await addDoc(collection(db, "melhorias_em_andamento"), melhoria);
      setFormMelhoria({ titulo: "", descricao: "" });
      setShowMelhoriasForm(false);
      setMsg("Melhoria adicionada com sucesso!");
    } catch (err) {
      setMsg("Erro ao adicionar melhoria.");
    }
  };

  const handleDeleteMelhoria = async (melhoriaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta melhoria?")) return;
    
    try {
      await deleteDoc(doc(db, "melhorias_em_andamento", melhoriaId));
      setMsg("Melhoria excluída com sucesso!");
    } catch (err) {
      setMsg("Erro ao excluir melhoria.");
    }
  };

  const handleShowComentarios = (ideiaId: string) => {
    if (showComentarios === ideiaId) {
      setShowComentarios(null);
    } else {
      setShowComentarios(ideiaId);
      fetchComentarios(ideiaId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aprovada":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "implementada":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "rejeitada":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "aprovada":
        return <CheckIcon className="h-4 w-4" />;
      case "implementada":
        return <CheckIcon className="h-4 w-4" />;
      case "rejeitada":
        return <XIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "aprovada":
        return "Aprovada";
      case "implementada":
        return "Implementada";
      case "rejeitada":
        return "Rejeitada";
      default:
        return "Pendente";
    }
  };

  const getCategoriaLabel = (categoria: string) => {
    switch (categoria) {
      case "interface":
        return "Interface";
      case "funcionalidade":
        return "Funcionalidade";
      case "performance":
        return "Performance";
      default:
        return "Outros";
    }
  };

  const filteredIdeias = ideias.filter(ideia => {
    if (filter === "todas") return true;
    return ideia.status === filter;
  });

  const ideiasAprovadas = ideias.filter(i => i.status === "aprovada" || i.status === "implementada");

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 flex items-center gap-3">
              <LightbulbIcon className="h-8 w-8 text-[#3478F6]" />
              Gestão de Ideias
            </h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Gerencie as ideias dos usuários</p>
          </div>
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`p-4 rounded-lg mb-6 ${msg.includes("Erro") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {msg}
          </div>
        )}

        {/* Gerenciamento de Melhorias em Andamento */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-[#3478F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Melhorias em Andamento</h2>
            </div>
            <button
              onClick={() => setShowMelhoriasForm(!showMelhoriasForm)}
              className="bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Melhoria
            </button>
          </div>

          {/* Formulário de Nova Melhoria */}
          {showMelhoriasForm && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Nova Melhoria em Andamento</h3>
              <form onSubmit={handleAddMelhoria} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                    Título da Melhoria *
                  </label>
                  <input
                    type="text"
                    value={formMelhoria.titulo}
                    onChange={e => setFormMelhoria({ ...formMelhoria, titulo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                    placeholder="Ex: Implementação de filtros avançados"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                    Descrição *
                  </label>
                  <textarea
                    value={formMelhoria.descricao}
                    onChange={e => setFormMelhoria({ ...formMelhoria, descricao: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white min-h-[100px]"
                    placeholder="Descreva a melhoria em detalhes..."
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Adicionar Melhoria
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMelhoriasForm(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de Melhorias em Andamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {melhoriasEmAndamento.map((melhoria) => (
              <div key={melhoria.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-[#E8E9F1] dark:border-[#23283A]">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[#2E2F38] dark:text-white">{melhoria.titulo}</h3>
                  <button
                    onClick={() => handleDeleteMelhoria(melhoria.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">{melhoria.descricao}</p>
                <div className="text-xs text-[#6B6F76] dark:text-gray-300">
                  Atualizado em: {melhoria.atualizadoEm.toDate().toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {melhoriasEmAndamento.length === 0 && (
            <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
              Nenhuma melhoria em andamento cadastrada
            </div>
          )}
        </div>

        {/* Box de Ideias Aprovadas */}
        {ideiasAprovadas.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 mb-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckIcon className="h-6 w-6" />
                <h2 className="text-xl font-bold">Ideias Aprovadas para Implementação</h2>
              </div>
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                {ideiasAprovadas.length} ideia(s)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideiasAprovadas.slice(0, 6).map((ideia) => (
                <div key={ideia.id} className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{getCategoriaLabel(ideia.categoria)}</span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">
                      {getStatusLabel(ideia.status)}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-2">{ideia.titulo}</h3>
                  <p className="text-sm opacity-90 line-clamp-2 mb-2">{ideia.descricao}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span>Por: {ideia.userNome}</span>
                    <span>{ideia.votos} votos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300">Filtrar por:</span>
            <div className="flex gap-2">
              {[
                { value: "todas", label: "Todas" },
                { value: "pendente", label: "Pendentes" },
                { value: "aprovada", label: "Aprovadas" },
                { value: "implementada", label: "Implementadas" },
                { value: "rejeitada", label: "Rejeitadas" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value as any)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filter === option.value
                      ? "bg-[#3478F6] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-[#6B6F76] dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Ideias */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
          <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">
            Ideias ({filteredIdeias.length})
          </h3>
          
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredIdeias.length === 0 ? (
            <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
              Nenhuma ideia encontrada
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIdeias.map((ideia) => (
                <div
                  key={ideia.id}
                  className="p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(ideia.status)} flex items-center gap-1`}>
                          {getStatusIcon(ideia.status)}
                          {getStatusLabel(ideia.status)}
                        </span>
                        <span className="text-xs text-[#6B6F76] dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {getCategoriaLabel(ideia.categoria)}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-[#2E2F38] dark:text-white mb-2">
                        {ideia.titulo}
                      </h3>
                      
                      <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-3">
                        {ideia.descricao}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-[#6B6F76] dark:text-gray-300">
                          <span>Por: {ideia.userNome}</span>
                          <span>{ideia.criadoEm.toDate().toLocaleDateString()}</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUpIcon className="h-3 w-3" />
                            {ideia.votos} votos
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleShowComentarios(ideia.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#2E2F38] dark:text-white text-xs rounded transition-colors"
                          >
                            <MessageIcon className="h-3 w-3" />
                            Comentários
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações de Administração */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8E9F1] dark:border-[#23283A]">
                    <span className="text-sm font-semibold text-[#6B6F76] dark:text-gray-300">Ações:</span>
                    
                    {ideia.status === "pendente" && (
                      <>
                        <button
                          onClick={() => handleOpenComentarioAdminModal(ideia, "aprovada")}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleOpenComentarioAdminModal(ideia, "rejeitada")}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                    
                    {ideia.status === "aprovada" && (
                      <button
                        onClick={() => handleOpenComentarioAdminModal(ideia, "implementada")}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                      >
                        Marcar como Implementada
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteIdeia(ideia.id)}
                      disabled={deletingIds.has(ideia.id)}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors disabled:opacity-50"
                    >
                      {deletingIds.has(ideia.id) ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>

                  {/* Comentários */}
                  {showComentarios === ideia.id && (
                    <div className="mt-4 pt-4 border-t border-[#E8E9F1] dark:border-[#23283A]">
                      <h4 className="text-sm font-semibold text-[#2E2F38] dark:text-white mb-3">Comentários</h4>
                      <div className="space-y-3">
                        {comentarios.map((comentario) => (
                          <div key={comentario.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-[#2E2F38] dark:text-white">
                                {comentario.userNome}
                              </span>
                                                             <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                                 {comentario.criadoEm.toDate().toLocaleDateString()}
                               </span>
                            </div>
                            <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                              {comentario.texto}
                            </p>
                          </div>
                        ))}
                        
                        {comentarios.length === 0 && (
                          <p className="text-sm text-[#6B6F76] dark:text-gray-300 text-center py-4">
                            Nenhum comentário ainda
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Comentário Administrativo */}
      {showComentarioAdminModal && ideiaParaComentar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {novoStatus === "aprovada" ? "Aprovar Ideia" : 
                 novoStatus === "rejeitada" ? "Rejeitar Ideia" : 
                 "Marcar como Implementada"}
              </h3>
              <button 
                onClick={() => setShowComentarioAdminModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                  {ideiaParaComentar.titulo}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {ideiaParaComentar.descricao}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  Comentário (opcional)
                </label>
                <textarea
                  value={comentarioAdmin}
                  onChange={(e) => setComentarioAdmin(e.target.value)}
                  placeholder={
                    novoStatus === "aprovada" ? "Explique por que esta ideia foi aprovada..." :
                    novoStatus === "rejeitada" ? "Explique por que esta ideia foi rejeitada..." :
                    "Explique como esta ideia foi implementada..."
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white min-h-[100px] resize-none"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitComentarioAdmin}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setShowComentarioAdminModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 