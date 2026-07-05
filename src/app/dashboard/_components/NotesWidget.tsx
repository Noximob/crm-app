'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, addDoc, deleteDoc, doc, Timestamp, onSnapshot, getDocs, limit } from 'firebase/firestore';

interface Note {
  id: string;
  texto: string;
  prioridade: 'Urgente' | 'Importante' | 'Circunstancial';
  dataHora?: string; // Data e hora opcional
  criadoEm: Timestamp;
}

const NotesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

const SortIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18"/>
    <path d="M6 12h12"/>
    <path d="M9 18h6"/>
  </svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

export default function NotesWidget() {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'Urgente' | 'Importante' | 'Circunstancial'>('Importante');
  const [filterPriority, setFilterPriority] = useState<'Todas' | 'Urgente' | 'Importante' | 'Circunstancial'>('Todas');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(false);
  const [dataHora, setDataHora] = useState(''); // Data e hora opcional
  const [latestNote, setLatestNote] = useState<Note | null>(null);
  const [otherNotes, setOtherNotes] = useState<Note[]>([]);

  // Tempo real apenas para a nota mais recente
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', currentUser.uid),
      orderBy('criadoEm', 'desc'),
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Note[];
      setLatestNote(notesData[0] || null);
    }, (error) => {
      console.error('Erro ao carregar nota mais recente:', error);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Atualizar o número de notas ao abrir o modal
  useEffect(() => {
    if (!isModalOpen && latestNote) {
      // Quando fechar o modal, buscar o total de notas para atualizar o contador
      (async () => {
        if (!currentUser) return;
        const q = query(
          collection(db, 'notes'),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Note[];
        setOtherNotes(notesData.filter(n => !latestNote || n.id !== latestNote.id));
      })();
    }
  }, [isModalOpen, latestNote, currentUser]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !currentUser) return;

    console.log('Tentando adicionar nota:', { texto: newNote.trim(), prioridade: selectedPriority, dataHora });
    setLoading(true);
    try {
      const noteData = {
        texto: newNote.trim(),
        prioridade: selectedPriority,
        dataHora: dataHora || null, // Salvar data/hora se fornecida
        criadoEm: Timestamp.now(),
        userId: currentUser.uid
      };
      
      console.log('Dados da nota a serem salvos:', noteData);
      const docRef = await addDoc(collection(db, 'notes'), noteData);
      console.log('Nota salva com sucesso, ID:', docRef.id);
      
      setNewNote('');
      setSelectedPriority('Importante');
      setDataHora(''); // Limpar data/hora
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, 'notes', noteId));
    } catch (error) {
      console.error('Erro ao deletar nota:', error);
    }
  };

  const filteredAndSortedNotes = notes
    .filter(note => filterPriority === 'Todas' || note.prioridade === filterPriority)
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.criadoEm.toDate().getTime() - a.criadoEm.toDate().getTime();
      } else {
        return a.criadoEm.toDate().getTime() - b.criadoEm.toDate().getTime();
      }
    });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgente': return 'bg-[#FF1E56]/10 border border-[#FF1E56]/35 text-[#FF7A97]';
      case 'Importante': return 'bg-orange-500/10 border border-orange-400/35 text-orange-300';
      case 'Circunstancial': return 'bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6]';
      default: return 'bg-white/[0.06] border border-white/15 text-text-secondary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Urgente': return '🚨';
      case 'Importante': return '⚠️';
      case 'Circunstancial': return 'ℹ️';
      default: return '📝';
    }
  };

  const recentNotes = notes.slice(0, 3);

  // Remover preview das notas recentes no hover do botão
  return (
    <>
      {/* Widget Compacto - Mesmo tamanho dos índices */}
      <div className="relative">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 bg-white/[0.04] backdrop-blur-sm rounded-lg border border-white/10 hover:border-[#9F6BFF]/40 transition-all duration-200 cursor-pointer hover:scale-105"
        >
          <NotesIcon className="h-4 w-4 text-[#9F6BFF]" />
          <div className="text-center">
            <div className="text-xs font-bold text-white hover:text-[#C4A6FF] transition-colors">
              Notas
            </div>
            <div className="text-[10px] text-text-secondary font-medium">
              {/* Mostrar o total real de notas */}
              {latestNote ? (1 + otherNotes.length) : otherNotes.length}
            </div>
          </div>
        </button>
      </div>

      {/* Modal Completo */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-start pt-10">
          <div className="bg-[#12101a] rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] border border-white/10 w-full max-w-4xl mx-4 max-h-[85vh] overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 gx-line" />
            {/* Header mais compacto */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <NotesIcon className="h-5 w-5 text-[#9F6BFF] drop-shadow-[0_0_8px_rgba(159,107,255,0.5)]" />
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Notas</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-secondary hover:text-[#FF5C7E] transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Filtros e Ordenação mais compactos */}
            <div className="p-3 bg-white/[0.02] border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FilterIcon className="h-3 w-3 text-text-secondary" />
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value as any)}
                    className="px-2 py-1 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Urgente">Urgente</option>
                    <option value="Importante">Importante</option>
                    <option value="Circunstancial">Circunstancial</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <SortIcon className="h-3 w-3 text-text-secondary" />
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="px-2 py-1 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  >
                    <option value="newest">Mais recentes</option>
                    <option value="oldest">Mais antigas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Formulário de Nova Nota mais compacto */}
            <div className="p-3 border-b border-white/10">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value as any)}
                    className="px-2 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  >
                    <option value="Urgente">🚨 Urgente</option>
                    <option value="Importante">⚠️ Importante</option>
                    <option value="Circunstancial">ℹ️ Circunstancial</option>
                  </select>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Digite sua nota..."
                    className="flex-1 px-3 py-1.5 text-sm bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={loading || !newNote.trim()}
                    className="px-3 py-1.5 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                  >
                    <PlusIcon className="h-3 w-3" />
                    {loading ? 'Salvando...' : 'Adicionar'}
                  </button>
                </div>
                
                {/* Data e Hora opcional mais compacto */}
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3 text-text-secondary" />
                  <input
                    type="datetime-local"
                    value={dataHora}
                    onChange={(e) => setDataHora(e.target.value)}
                    placeholder="Data e hora (opcional)"
                    className="px-2 py-1 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  />
                  <span className="text-xs text-text-secondary">Data e hora (opcional)</span>
                </div>
              </div>
            </div>

            {/* Lista de Notas com mais espaço */}
            <div className="p-3 overflow-y-auto" style={{height: 'calc(85vh - 200px)'}}>
              {(!latestNote && otherNotes.length === 0) ? (
                <div className="text-center py-8">
                  <NotesIcon className="h-8 w-8 text-text-secondary mx-auto mb-2" />
                  <p className="text-text-secondary text-sm">Nenhuma nota encontrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {latestNote && (
                    <div
                      key={latestNote.id}
                      className="group p-3 bg-white/[0.03] rounded-lg border border-white/[0.08] hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{getPriorityIcon(latestNote.prioridade)}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${getPriorityColor(latestNote.prioridade)}`}>
                              {latestNote.prioridade}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {latestNote.criadoEm.toDate().toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-white text-sm leading-relaxed">{latestNote.texto}</p>
                          {latestNote.dataHora && (
                            <div className="flex items-center gap-1 mt-1">
                              <CalendarIcon className="h-3 w-3 text-text-secondary" />
                              <span className="text-xs text-text-secondary">
                                Agendado: {new Date(latestNote.dataHora).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteNote(latestNote.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  {otherNotes.map(note => (
                    <div
                      key={note.id}
                      className="group p-3 bg-white/[0.03] rounded-lg border border-white/[0.08] hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{getPriorityIcon(note.prioridade)}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${getPriorityColor(note.prioridade)}`}>
                              {note.prioridade}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {note.criadoEm.toDate().toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-white text-sm leading-relaxed">{note.texto}</p>
                          {note.dataHora && (
                            <div className="flex items-center gap-1 mt-1">
                              <CalendarIcon className="h-3 w-3 text-text-secondary" />
                              <span className="text-xs text-text-secondary">
                                Agendado: {new Date(note.dataHora).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 