'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, addDoc, deleteDoc, doc, Timestamp, onSnapshot } from 'firebase/firestore';

interface Note {
  id: string;
  texto: string;
  prioridade: 'Urgente' | 'Importante' | 'Circunstancial';
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

export default function NotesWidget() {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'Urgente' | 'Importante' | 'Circunstancial'>('Importante');
  const [filterPriority, setFilterPriority] = useState<'Todas' | 'Urgente' | 'Importante' | 'Circunstancial'>('Todas');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'notes'),
      where('userId', '==', currentUser.uid),
      orderBy('criadoEm', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      setNotes(notesData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'notes'), {
        texto: newNote.trim(),
        prioridade: selectedPriority,
        criadoEm: Timestamp.now(),
        userId: currentUser.uid
      });
      setNewNote('');
      setSelectedPriority('Importante');
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
      case 'Urgente': return 'bg-red-500 text-white';
      case 'Importante': return 'bg-orange-500 text-white';
      case 'Circunstancial': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
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

  return (
    <>
      {/* Widget Compacto */}
      <div className="relative group">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#3478F6]/10 to-[#A3C8F7]/10 hover:from-[#3478F6]/20 hover:to-[#A3C8F7]/20 border border-[#3478F6]/30 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg backdrop-blur-sm"
        >
          <div className="relative">
            <NotesIcon className="h-6 w-6 text-[#3478F6]" />
            {notes.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#3AC17C] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {notes.length}
              </span>
            )}
          </div>
          <div className="text-left">
            <div className="font-semibold text-[#2E2F38] dark:text-white text-sm">Minhas Notas</div>
            <div className="text-xs text-[#6B6F76] dark:text-gray-300">
              {notes.length === 0 ? 'Nenhuma nota' : `${notes.length} nota${notes.length > 1 ? 's' : ''}`}
            </div>
          </div>
        </button>

        {/* Preview das notas recentes */}
        {recentNotes.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#23283A] rounded-xl shadow-xl border border-[#E8E9F1] dark:border-[#23283A] p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50 min-w-[280px]">
            <div className="text-xs font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Notas Recentes:</div>
            <div className="space-y-2">
              {recentNotes.map(note => (
                <div key={note.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                  <span className="text-sm">{getPriorityIcon(note.prioridade)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#2E2F38] dark:text-white line-clamp-2">{note.texto}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(note.prioridade)}`}>
                        {note.prioridade}
                      </span>
                      <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                        {note.criadoEm.toDate().toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Completo */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-start pt-20">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl border border-[#E8E9F1] dark:border-[#23283A] w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
              <div className="flex items-center gap-3">
                <NotesIcon className="h-6 w-6 text-[#3478F6]" />
                <div>
                  <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Minhas Notas</h2>
                  <p className="text-sm text-[#6B6F76] dark:text-gray-300">Organize suas ideias e lembretes</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#6B6F76] hover:text-[#2E2F38] dark:text-gray-300 dark:hover:text-white transition-colors"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Filtros e Ordenação */}
            <div className="p-4 bg-[#F5F6FA] dark:bg-[#181C23] border-b border-[#E8E9F1] dark:border-[#23283A]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FilterIcon className="h-4 w-4 text-[#6B6F76]" />
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value as any)}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:ring-2 focus:ring-[#3478F6] focus:border-transparent"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Urgente">Urgente</option>
                    <option value="Importante">Importante</option>
                    <option value="Circunstancial">Circunstancial</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <SortIcon className="h-4 w-4 text-[#6B6F76]" />
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:ring-2 focus:ring-[#3478F6] focus:border-transparent"
                  >
                    <option value="newest">Mais recentes</option>
                    <option value="oldest">Mais antigas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Formulário de Nova Nota */}
            <div className="p-4 border-b border-[#E8E9F1] dark:border-[#23283A]">
              <div className="flex gap-3">
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as any)}
                  className="px-3 py-2 text-sm bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:ring-2 focus:ring-[#3478F6] focus:border-transparent"
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
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:ring-2 focus:ring-[#3478F6] focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <button
                  onClick={handleAddNote}
                  disabled={loading || !newNote.trim()}
                  className="px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  {loading ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </div>

            {/* Lista de Notas */}
            <div className="p-4 overflow-y-auto max-h-[400px]">
              {filteredAndSortedNotes.length === 0 ? (
                <div className="text-center py-8">
                  <NotesIcon className="h-12 w-12 text-[#6B6F76] mx-auto mb-3" />
                  <p className="text-[#6B6F76] dark:text-gray-300">Nenhuma nota encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAndSortedNotes.map(note => (
                    <div
                      key={note.id}
                      className="group p-4 bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] hover:bg-white dark:hover:bg-[#23283A] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{getPriorityIcon(note.prioridade)}</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(note.prioridade)}`}>
                              {note.prioridade}
                            </span>
                            <span className="text-xs text-[#6B6F76] dark:text-gray-300">
                              {note.criadoEm.toDate().toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-[#2E2F38] dark:text-white leading-relaxed">{note.texto}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all"
                        >
                          <XIcon className="h-4 w-4" />
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