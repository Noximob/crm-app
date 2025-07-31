"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  orderBy,
  onSnapshot,
  updateDoc,
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
}

interface Comentario {
  id: string;
  ideiaId: string;
  userId: string;
  userNome: string;
  texto: string;
  criadoEm: Timestamp;
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

export default function IdeiasPage() {
  const { currentUser, userData } = useAuth();
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedIdeia, setSelectedIdeia] = useState<Ideia | null>(null);
  const [showComentarios, setShowComentarios] = useState<string | null>(null);
  const [novoComentario, setNovoComentario] = useState("");
  const [votandoIds, setVotandoIds] = useState<Set<string>>(new Set());

  const [formIdeia, setFormIdeia] = useState({
    titulo: "",
    descricao: "",
    categoria: "funcionalidade" as "interface" | "funcionalidade" | "performance" | "outros",
  });

  useEffect(() => {
    if (currentUser) {
      fetchIdeias();
    }
  }, [currentUser]);

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

  const handleAddIdeia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIdeia.titulo.trim() || !formIdeia.descricao.trim() || !currentUser) return;
    
    setLoading(true);
    try {
      const ideia = {
        userId: currentUser.uid,
        userNome: userData?.nome || "Usuário",
        titulo: formIdeia.titulo.trim(),
        descricao: formIdeia.descricao.trim(),
        categoria: formIdeia.categoria,
        status: "pendente" as const,
        votos: 0,
        criadoEm: Timestamp.now(),
      };
      
      await addDoc(collection(db, "ideias"), ideia);
      setFormIdeia({ titulo: "", descricao: "", categoria: "funcionalidade" });
      setShowForm(false);
      setMsg("Ideia enviada com sucesso!");
    } catch (err) {
      setMsg("Erro ao enviar ideia.");
    } finally {
      setLoading(false);
    }
  };

  const handleVotar = async (ideiaId: string) => {
    if (!currentUser) return;
    
    setVotandoIds(prev => new Set(prev).add(ideiaId));
    try {
      const ideiaRef = doc(db, "ideias", ideiaId);
      const ideia = ideias.find(i => i.id === ideiaId);
      if (ideia) {
        await updateDoc(ideiaRef, {
          votos: ideia.votos + 1
        });
      }
    } catch (err) {
      setMsg("Erro ao votar.");
    } finally {
      setVotandoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(ideiaId);
        return newSet;
      });
    }
  };

  const handleAddComentario = async (ideiaId: string) => {
    if (!novoComentario.trim() || !currentUser) return;
    
    try {
      const comentario = {
        ideiaId,
        userId: currentUser.uid,
        userNome: userData?.nome || "Usuário",
        texto: novoComentario.trim(),
        criadoEm: Timestamp.now(),
      };
      
      await addDoc(collection(db, "comentarios_ideias"), comentario);
      setNovoComentario("");
      setMsg("Comentário adicionado!");
    } catch (err) {
      setMsg("Erro ao adicionar comentário.");
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
        return <ClockIcon className="h-4 w-4" />;
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

  const ideiasAprovadas = ideias.filter(i => i.status === "aprovada" || i.status === "implementada");
  const ideiasPendentes = ideias.filter(i => i.status === "pendente");

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2 flex items-center gap-3">
              <LightbulbIcon className="h-8 w-8 text-[#3478F6]" />
              Ideias para Melhorias
            </h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Compartilhe suas ideias para melhorar nossa plataforma</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            <LightbulbIcon className="h-5 w-5" />
            Nova Ideia
          </button>
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`p-4 rounded-lg mb-6 ${msg.includes("Erro") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {msg}
          </div>
        )}

        {/* Box de Ideias Aprovadas */}
        {ideiasAprovadas.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 mb-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <CheckIcon className="h-6 w-6" />
              <h2 className="text-xl font-bold">Próximas Implementações</h2>
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
                  <p className="text-sm opacity-90 line-clamp-2">{ideia.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulário de Nova Ideia */}
        {showForm && (
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-8">
            <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Nova Ideia</h3>
            <form onSubmit={handleAddIdeia} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                  Título da Ideia *
                </label>
                <input
                  type="text"
                  value={formIdeia.titulo}
                  onChange={e => setFormIdeia({ ...formIdeia, titulo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  placeholder="Ex: Adicionar filtros avançados no CRM"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                  Categoria
                </label>
                <select
                  value={formIdeia.categoria}
                  onChange={e => setFormIdeia({ ...formIdeia, categoria: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                >
                  <option value="funcionalidade">Funcionalidade</option>
                  <option value="interface">Interface</option>
                  <option value="performance">Performance</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">
                  Descrição *
                </label>
                <textarea
                  value={formIdeia.descricao}
                  onChange={e => setFormIdeia({ ...formIdeia, descricao: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white min-h-[100px]"
                  placeholder="Descreva sua ideia em detalhes..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar Ideia"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Ideias */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
          <h3 className="text-lg font-bold text-[#2E2F38] dark:text-white mb-4">Todas as Ideias</h3>
          
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : ideias.length === 0 ? (
            <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
              Nenhuma ideia cadastrada ainda
            </div>
          ) : (
            <div className="space-y-4">
              {ideias.map((ideia) => (
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
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleShowComentarios(ideia.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#2E2F38] dark:text-white text-xs rounded transition-colors"
                          >
                            <MessageIcon className="h-3 w-3" />
                            Comentários
                          </button>
                          
                          <button
                            onClick={() => handleVotar(ideia.id)}
                            disabled={votandoIds.has(ideia.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-[#3478F6] hover:bg-[#255FD1] text-white text-xs rounded transition-colors disabled:opacity-50"
                          >
                            <ThumbsUpIcon className="h-3 w-3" />
                            {ideia.votos} Votos
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comentários */}
                  {showComentarios === ideia.id && (
                    <div className="mt-4 pt-4 border-t border-[#E8E9F1] dark:border-[#23283A]">
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
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={novoComentario}
                            onChange={e => setNovoComentario(e.target.value)}
                            placeholder="Adicionar comentário..."
                            className="flex-1 px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white text-sm"
                          />
                          <button
                            onClick={() => handleAddComentario(ideia.id)}
                            disabled={!novoComentario.trim()}
                            className="px-3 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white text-sm rounded transition-colors disabled:opacity-50"
                          >
                            Comentar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 