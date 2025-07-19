'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

// Ícones
const StickyNoteIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M8 13h8"/>
    <path d="M8 17h8"/>
    <path d="M8 9h4"/>
  </svg>
);

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18"/>
    <path d="M6 6l12 12"/>
  </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14"/>
    <path d="M12 5v14"/>
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

interface Note {
  id: string;
  content: string;
  priority: 'urgente' | 'importante' | 'circunstancial';
  createdAt: Date;
}

interface NotesWidgetProps {
  className?: string;
}

export default function NotesWidget({ className = '' }: NotesWidgetProps) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newNotePriority, setNewNotePriority] = useState<'urgente' | 'importante' | 'circunstancial'>('importante');
  const [priorityFilter, setPriorityFilter] = useState<'todos' | 'urgente' | 'importante' | 'circunstancial'>('todos');
  const [dateFilter, setDateFilter] = useState<'mais_novas' | 'mais_velhas'>('mais_novas');

  // Carregar notas
  useEffect(() => {
    if (currentUser && isOpen) {
      loadNotes();
    }
  }, [currentUser, isOpen]);

  const loadNotes = async () => {
    if (!currentUser) return;
    
    try {
      const notesDoc = await getDoc(doc(db, 'userNotes', currentUser.uid));
      if (notesDoc.exists()) {
        const data = notesDoc.data();
        const notesData = data.notes || [];
        
        // Converter timestamps para Date
        const convertedNotes = notesData.map((note: any) => ({
          ...note,
          createdAt: note.createdAt?.toDate ? note.createdAt.toDate() : new Date(note.createdAt)
        }));
        
        setNotes(convertedNotes);
      }
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    }
  };

  const saveNotes = async () => {
    if (!currentUser) return;
    
    try {
      const notesData = {
        notes: notes,
        userId: currentUser.uid,
        updatedAt: Timestamp.now()
      };
      
      await setDoc(doc(db, 'userNotes', currentUser.uid), notesData);
    } catch (error) {
      console.error('Erro ao salvar notas:', error);
    }
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    
    const note: Note = {
      id: Date.now().toString(),
      content: newNote.trim(),
      priority: newNotePriority,
      createdAt: new Date()
    };
    
    const updatedNotes = [...notes, note];
    setNotes(updatedNotes);
    setNewNote('');
    setNewNotePriority('importante');
    
    // Salvar automaticamente
    setTimeout(() => saveNotes(), 100);
  };

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    
    // Salvar automaticamente
    setTimeout(() => saveNotes(), 100);
  };

  const getFilteredNotes = () => {
    let filtered = notes;
    
    // Filtrar por prioridade
    if (priorityFilter !== 'todos') {
      filtered = filtered.filter(note => note.priority === priorityFilter);
    }
    
    // Ordenar por data
    filtered.sort((a, b) => {
      if (dateFilter === 'mais_novas') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
    });
    
    return filtered;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-red-500 text-white';
      case 'importante': return 'bg-yellow-500 text-white';
      case 'circunstancial': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'Urgente';
      case 'importante': return 'Importante';
      case 'circunstancial': return 'Circunstancial';
      default: return 'Normal';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotes = getFilteredNotes();

  return (
    <>
      {/* Botão do bloco de notas */}
      <button
        onClick={() => setIsOpen(true)}
        className={`relative flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group hover:scale-105 ${className}`}
        title="Bloco de Notas"
      >
        <StickyNoteIcon className="h-4 w-4" />
        <div className="text-center">
          <div className="text-xs font-bold text-white group-hover:text-white transition-colors">
            Notas
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      </button>

      {/* Modal do bloco de notas */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
                  <StickyNoteIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Minhas Notas</h2>
                  <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                    {notes.length} nota{notes.length !== 1 ? 's' : ''} salva{notes.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#181C23] rounded-lg transition-colors"
              >
                <CloseIcon className="h-5 w-5 text-[#6B6F76] dark:text-gray-300" />
              </button>
            </div>

            {/* Filtros */}
            <div className="p-4 border-b border-[#E8E9F1] dark:border-[#23283A]">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#2E2F38] dark:text-white">Prioridade:</span>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as any)}
                    className="px-3 py-1 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-sm"
                  >
                    <option value="todos">Todas</option>
                    <option value="urgente">Urgente</option>
                    <option value="importante">Importante</option>
                    <option value="circunstancial">Circunstancial</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#2E2F38] dark:text-white">Data:</span>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="px-3 py-1 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-sm"
                  >
                    <option value="mais_novas">Mais novas</option>
                    <option value="mais_velhas">Mais velhas</option>
                  </select>
                </div>
              </div>

              {/* Adicionar nova nota */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Digite uma nova nota..."
                  className="flex-1 px-3 py-2 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  onKeyPress={(e) => e.key === 'Enter' && addNote()}
                />
                <select
                  value={newNotePriority}
                  onChange={(e) => setNewNotePriority(e.target.value as any)}
                  className="px-3 py-2 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="urgente">Urgente</option>
                  <option value="importante">Importante</option>
                  <option value="circunstancial">Circunstancial</option>
                </select>
                <button
                  onClick={addNote}
                  disabled={!newNote.trim()}
                  className="px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-gray-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Lista de notas */}
            <div className="flex-1 p-4 overflow-y-auto">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-[#6B6F76] dark:text-gray-300">
                    {priorityFilter === 'todos' ? 'Nenhuma nota ainda. Adicione sua primeira nota!' : `Nenhuma nota ${getPriorityLabel(priorityFilter).toLowerCase()}`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-[#2E2F38] dark:text-white mb-2">
                            {note.content}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(note.priority)}`}>
                              {getPriorityLabel(note.priority)}
                            </span>
                            <span className="text-xs text-[#6B6F76] dark:text-gray-400">
                              {formatDate(note.createdAt)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="ml-3 p-1 text-[#6B6F76] dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Excluir nota"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#E8E9F1] dark:border-[#23283A]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#6B6F76] dark:text-gray-300">
                  {filteredNotes.length} de {notes.length} nota{notes.length !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-[#3478F6] hover:bg-[#255FD1] text-white rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 