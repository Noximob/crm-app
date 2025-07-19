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

const SaveIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
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
  completed: boolean;
}

interface NotesWidgetProps {
  className?: string;
}

export default function NotesWidget({ className = '' }: NotesWidgetProps) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [newNote, setNewNote] = useState('');
  const [newNotePriority, setNewNotePriority] = useState<'urgente' | 'importante' | 'circunstancial'>('importante');
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgente' | 'importante' | 'circunstancial'>('all');

  // Carregar notas do usuário
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
        setNotes(data.notes || []);
        setLastSaved(data.lastSaved?.toDate() || null);
      }
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    }
  };

  const saveNotes = async () => {
    if (!currentUser) return;
    
    setIsSaving(true);
    try {
      const notesData = {
        notes: notes,
        lastSaved: Timestamp.now(),
        userId: currentUser.uid
      };
      
      await setDoc(doc(db, 'userNotes', currentUser.uid), notesData);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erro ao salvar notas:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    
    const note: Note = {
      id: Date.now().toString(),
      content: newNote.trim(),
      priority: newNotePriority,
      createdAt: new Date(),
      completed: false
    };
    
    setNotes([...notes, note]);
    setNewNote('');
    setNewNotePriority('importante');
  };

  const toggleNote = (id: string) => {
    setNotes(notes.map(note => 
      note.id === id ? { ...note, completed: !note.completed } : note
    ));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const getFilteredNotes = () => {
    if (activeFilter === 'all') return notes;
    return notes.filter(note => note.priority === activeFilter);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-red-500';
      case 'importante': return 'bg-yellow-500';
      case 'circunstancial': return 'bg-blue-500';
      default: return 'bg-gray-500';
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

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes} min atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  const handleSave = async () => {
    await saveNotes();
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
                  <StickyNoteIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Meu Bloco de Notas</h2>
                  <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                    {lastSaved ? `Salvo ${formatLastSaved(lastSaved)}` : 'Nunca salvo'}
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
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-[#2E2F38] dark:text-white">Filtrar por:</span>
                {(['all', 'urgente', 'importante', 'circunstancial'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      activeFilter === filter
                        ? 'bg-[#3478F6] text-white'
                        : 'bg-gray-100 dark:bg-[#181C23] text-[#6B6F76] dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#23283A]'
                    }`}
                  >
                    {filter === 'all' ? 'Todas' : getPriorityLabel(filter)}
                  </button>
                ))}
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
                  className="px-3 py-2 bg-[#3478F6] hover:bg-[#255FD1] disabled:bg-gray-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Lista de notas */}
            <div className="flex-1 p-6 overflow-y-auto">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <p className="text-[#6B6F76] dark:text-gray-300">
                    {activeFilter === 'all' ? 'Nenhuma nota ainda. Adicione sua primeira nota!' : `Nenhuma nota ${getPriorityLabel(activeFilter).toLowerCase()}`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-lg border transition-all ${
                        note.completed
                          ? 'bg-gray-50 dark:bg-[#181C23] border-gray-200 dark:border-[#23283A] opacity-60'
                          : 'bg-white dark:bg-[#23283A] border-[#E8E9F1] dark:border-[#23283A] hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleNote(note.id)}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-colors ${
                            note.completed
                              ? 'bg-[#3AC17C] border-[#3AC17C]'
                              : 'border-[#6B6F76] dark:border-gray-400 hover:border-[#3AC17C]'
                          }`}
                        >
                          {note.completed && (
                            <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${note.completed ? 'line-through text-[#6B6F76] dark:text-gray-400' : 'text-[#2E2F38] dark:text-white'}`}>
                            {note.content}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${getPriorityColor(note.priority)}`}>
                              {getPriorityLabel(note.priority)}
                            </span>
                            <span className="text-xs text-[#6B6F76] dark:text-gray-400">
                              {note.createdAt.toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="flex-shrink-0 p-1 text-[#6B6F76] dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
            <div className="flex items-center justify-between p-6 border-t border-[#E8E9F1] dark:border-[#23283A]">
              <div className="text-sm text-[#6B6F76] dark:text-gray-300">
                {filteredNotes.length} nota{filteredNotes.length !== 1 ? 's' : ''} {activeFilter !== 'all' ? getPriorityLabel(activeFilter).toLowerCase() : ''}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-[#6B6F76] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#181C23] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-lg transition-all disabled:opacity-50"
                >
                  <SaveIcon className="h-4 w-4" />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 