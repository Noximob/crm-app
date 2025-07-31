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
  runTransaction,
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

interface Voto {
  id: string;
  ideiaId: string;
  userId: string;
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

const AdminIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
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
  const [votos, setVotos] = useState<Voto[]>([]);
  const [melhoriasEmAndamento, setMelhoriasEmAndamento] = useState<MelhoriasEmAndamento[]>([]);

  // Função para limpar mensagens após um tempo
  const setMessageWithTimeout = (message: string, timeout: number = 3000) => {
    setMsg(message);
    setTimeout(() => setMsg(null), timeout);
  };

  const [formIdeia, setFormIdeia] = useState({
    titulo: "",
    descricao: "",
    categoria: "funcionalidade" as "interface" | "funcionalidade" | "performance" | "outros",
  });

  useEffect(() => {
    if (currentUser?.uid) {
      fetchIdeias();
      fetchVotos();
      fetchMelhoriasEmAndamento();
    } else {
      // Limpar estados quando não há usuário logado
      setVotos([]);
      setIdeias([]);
      setMelhoriasEmAndamento([]);
    }
  }, [currentUser?.uid]);

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

  const fetchVotos = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const q = query(
        collection(db, "votos_ideias"),
        where("userId", "==", currentUser.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const votosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Voto));
        setVotos(votosData);
      }, (error) => {
        console.error("Erro ao carregar votos:", error);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Erro ao carregar votos:", err);
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
      setMessageWithTimeout("Ideia enviada com sucesso!");
    } catch (err) {
      setMessageWithTimeout("Erro ao enviar ideia.");
    } finally {
      setLoading(false);
    }
  };

  const handleVotar = async (ideiaId: string) => {
    if (!currentUser?.uid) return;
    
    // Verificar se o usuário já votou nesta ideia (verificação local)
    const jaVotou = votos.some(voto => voto.ideiaId === ideiaId);
    if (jaVotou) {
      setMessageWithTimeout("Você já votou nesta ideia!");
      return;
    }
    
    // Verificar se o usuário está tentando votar em sua própria ideia
    const ideia = ideias.find(i => i.id === ideiaId);
    if (ideia && ideia.userId === currentUser.uid) {
      setMessageWithTimeout("Você não pode votar em sua própria ideia!");
      return;
    }
    
    // Verificar se o botão está desabilitado (dupla verificação)
    if (votandoIds.has(ideiaId)) {
      return;
    }
    
    setVotandoIds(prev => new Set(prev).add(ideiaId));
    
    try {
      // Usar transação para garantir atomicidade
      await runTransaction(db, async (transaction) => {
        // Verificar se o usuário já votou (verificação no servidor)
        const votosQuery = query(
          collection(db, "votos_ideias"),
          where("userId", "==", currentUser.uid),
          where("ideiaId", "==", ideiaId)
        );
        const votosSnapshot = await getDocs(votosQuery);
        
        if (!votosSnapshot.empty) {
          throw new Error("Você já votou nesta ideia!");
        }
        
        // Buscar a ideia para atualizar o contador
        const ideiaRef = doc(db, "ideias", ideiaId);
        const ideiaDoc = await transaction.get(ideiaRef);
        
        if (!ideiaDoc.exists()) {
          throw new Error("Ideia não encontrada!");
        }
        
        const ideiaData = ideiaDoc.data();
        const novoVoto = {
          ideiaId,
          userId: currentUser.uid,
          criadoEm: Timestamp.now(),
        };
        
        // Adicionar o voto
        const votoRef = doc(collection(db, "votos_ideias"));
        transaction.set(votoRef, novoVoto);
        
        // Atualizar contador de votos na ideia
        transaction.update(ideiaRef, {
          votos: (ideiaData.votos || 0) + 1
        });
      });
      
      setMessageWithTimeout("Voto registrado com sucesso!");
    } catch (err) {
      console.error("Erro ao votar:", err);
      if (err instanceof Error && err.message === "Você já votou nesta ideia!") {
        setMessageWithTimeout("Você já votou nesta ideia!");
      } else {
        setMessageWithTimeout("Erro ao votar. Tente novamente.");
      }
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
      setMessageWithTimeout("Comentário adicionado!");
    } catch (err) {
      setMessageWithTimeout("Erro ao adicionar comentário.");
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

  const jaVotouNaIdeia = (ideiaId: string) => {
    if (!currentUser?.uid || !ideiaId) return false;
    return votos.some(voto => voto.ideiaId === ideiaId && voto.userId === currentUser.uid);
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

        {/* Box de Melhorias em Andamento */}
        {melhoriasEmAndamento.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 mb-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-xl font-bold">Melhorias em Andamento</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {melhoriasEmAndamento.slice(0, 6).map((melhoria) => (
                <div key={melhoria.id} className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <h3 className="font-semibold mb-2">{melhoria.titulo}</h3>
                  <p className="text-sm opacity-90 line-clamp-3">{melhoria.descricao}</p>
                  <div className="text-xs opacity-75 mt-2">
                    Atualizado em: {melhoria.atualizadoEm.toDate().toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
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
                      
                      {/* Comentário Administrativo */}
                      {ideia.comentarioAdmin && (
                        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AdminIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                              Comentário da Administração
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {ideia.comentarioAdmin}
                          </p>
                        </div>
                      )}
                      
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
                            disabled={votandoIds.has(ideia.id) || jaVotouNaIdeia(ideia.id) || ideia.userId === currentUser?.uid}
                            className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                              jaVotouNaIdeia(ideia.id)
                                ? "bg-green-500 text-white cursor-not-allowed opacity-75"
                                : votandoIds.has(ideia.id)
                                ? "bg-gray-400 text-white cursor-not-allowed opacity-50"
                                : ideia.userId === currentUser?.uid
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                                : "bg-[#3478F6] hover:bg-[#255FD1] text-white disabled:opacity-50"
                            }`}
                            title={
                              jaVotouNaIdeia(ideia.id) 
                                ? "Você já votou nesta ideia" 
                                : ideia.userId === currentUser?.uid
                                ? "Você não pode votar em sua própria ideia"
                                : "Votar nesta ideia"
                            }
                          >
                            <ThumbsUpIcon className="h-3 w-3" />
                            {votandoIds.has(ideia.id) ? "Votando..." : `${ideia.votos} Votos`} {
                              jaVotouNaIdeia(ideia.id) && "(Votado)"
                            } {
                              ideia.userId === currentUser?.uid && "(Sua ideia)"
                            }
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