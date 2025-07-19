'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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

interface NotesWidgetProps {
  className?: string;
}

export default function NotesWidget({ className = '' }: NotesWidgetProps) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
        setNotes(notesDoc.data().content || '');
        setLastSaved(notesDoc.data().lastSaved?.toDate() || null);
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
        content: notes,
        lastSaved: new Date(),
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

  const handleSave = async () => {
    await saveNotes();
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

  return (
    <>
      {/* Botão do bloco de notas */}
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${className}`}
        title="Bloco de Notas"
      >
        <StickyNoteIcon className="h-6 w-6" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
      </button>

      {/* Modal do bloco de notas */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
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

            {/* Área de texto */}
            <div className="flex-1 p-6">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Digite suas anotações aqui...&#10;&#10;• Ideias para vendas&#10;• Lembretes importantes&#10;• Contatos para follow-up&#10;• Metas do dia&#10;• Observações sobre leads"
                className="w-full h-full min-h-[300px] p-4 bg-[#F5F6FA] dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-[#E8E9F1] dark:border-[#23283A]">
              <div className="text-sm text-[#6B6F76] dark:text-gray-300">
                {notes.length} caracteres
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