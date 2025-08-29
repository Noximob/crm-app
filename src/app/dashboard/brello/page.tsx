'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { DndContext, closestCorners, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useSensor } from '@dnd-kit/core';

// Tipos para o sistema Brello
interface BrelloCard {
  id: string;
  title: string;
  description?: string;
  listId: string;
  order: number;
  labels: string[];
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

interface BrelloList {
  id: string;
  title: string;
  order: number;
  color: string;
  boardId: string;
}

interface BrelloBoard {
  id: string;
  title: string;
  description?: string;
  imobiliariaId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Componente de Cartão
const Card = ({ card, onEdit, onDelete }: { 
  card: BrelloCard; 
  onEdit: (card: BrelloCard) => void; 
  onDelete: (id: string) => void; 
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'N/A';
    }
  };

  return (
    <div className="bg-white dark:bg-[#23283A] rounded-lg shadow-sm border border-[#E8E9F1] dark:border-[#23283A] p-3 mb-3 cursor-pointer hover:shadow-md transition-all duration-200 group">
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex gap-1 mb-3">
          {card.labels.map((label, index) => (
            <span
              key={index}
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: label }}
            />
          ))}
        </div>
      )}
      
      {/* Título */}
      <h3 className="font-medium text-[#2E2F38] dark:text-white text-sm mb-2 line-clamp-2">
        {card.title}
      </h3>
      
      {/* Descrição */}
      {card.description && (
        <p className="text-xs text-[#6B6F76] dark:text-gray-300 mb-3 line-clamp-2">
          {card.description}
        </p>
      )}
      
      {/* Prioridade */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${getPriorityColor(card.priority)}`} />
        <span className="text-xs text-[#6B6F76] dark:text-gray-300">
          {getPriorityText(card.priority)}
        </span>
      </div>
      
      {/* Data de vencimento */}
      {card.dueDate && (
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-[#6B6F76] dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span className="text-xs text-[#6B6F76] dark:text-gray-300">
            {new Date(card.dueDate).toLocaleDateString('pt-BR')}
          </span>
        </div>
      )}
      
      {/* Ações */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E8E9F1] dark:border-[#23283A] opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(card)}
            className="p-1 text-[#3478F6] hover:bg-[#3478F6] hover:text-white rounded transition-colors"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(card.id)}
            className="p-1 text-[#F45B69] hover:bg-[#F45B69] hover:text-white rounded transition-colors"
            title="Excluir"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente de Lista
const List = ({ list, cards, onAddCard, onEditCard, onDeleteCard, onEditList, onDeleteList, onMoveCard }: {
  list: BrelloList;
  cards: BrelloCard[];
  onAddCard: (listId: string) => void;
  onEditCard: (card: BrelloCard) => void;
  onDeleteCard: (id: string) => void;
  onEditList: (list: BrelloList) => void;
  onDeleteList: (id: string) => void;
  onMoveCard: (cardId: string, newListId: string) => void;
}) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const handleAddCard = async () => {
    if (newCardTitle.trim()) {
      await onAddCard(list.id);
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-white/20', 'dark:bg-[#23283A]/20');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-white/20', 'dark:bg-[#23283A]/20');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-white/20', 'dark:bg-[#23283A]/20');
    
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId && cardId !== list.id) { // Evita mover para a mesma lista
      onMoveCard(cardId, list.id);
    }
  };

  const sortedCards = cards
    .filter(card => card.listId === list.id)
    .sort((a, b) => a.order - b.order);

  return (
    <div 
      className="bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl p-4 min-w-[280px] max-w-[280px] shadow-lg transition-colors"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header da Lista */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full shadow-sm"
            style={{ backgroundColor: list.color }}
          />
          <h3 className="font-semibold text-[#2E2F38] dark:text-white text-base">
            {list.title}
          </h3>
          <span className="text-xs text-[#6B6F76] dark:text-gray-300 bg-white dark:bg-[#23283A] px-2 py-1 rounded-full shadow-sm">
            {sortedCards.length}
          </span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEditList(list)}
            className="p-1 text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] hover:bg-[#3478F6] hover:text-white rounded transition-all"
            title="Editar lista"
          >
            ✏️
          </button>
          <button
            onClick={() => onDeleteList(list.id)}
            className="p-1 text-[#6B6F76] dark:text-gray-300 hover:text-[#F45B69] hover:bg-[#F45B69] hover:text-white rounded transition-all"
            title="Excluir lista"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Cartões */}
      <div className="space-y-3 mb-4 min-h-[100px]">
        {sortedCards.map((card) => (
          <Card
            key={card.id}
            card={card}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
          />
        ))}
      </div>

      {/* Adicionar Cartão */}
      {isAddingCard ? (
        <div className="space-y-3">
          <input
            type="text"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="Título do cartão..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] text-[#2E2F38] dark:text-white shadow-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddCard}
              className="px-3 py-1 bg-[#3478F6] text-white text-sm rounded-lg hover:bg-[#255FD1] transition-colors shadow-sm"
            >
              Adicionar
            </button>
            <button
              onClick={() => setIsAddingCard(false)}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors shadow-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingCard(true)}
          className="w-full text-left text-sm text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] dark:hover:text-[#A3C8F7] p-3 rounded-lg hover:bg-white/50 dark:hover:bg-[#23283A]/50 transition-all duration-200 border-2 border-dashed border-[#E8E9F1] dark:border-[#23283A] hover:border-[#3478F6]"
        >
          + Adicionar cartão
        </button>
      )}
    </div>
  );
};

// Componente Modal para Cartão
const CardModal = ({ card, isOpen, onClose, onSave, onDelete }: {
  card: BrelloCard | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: BrelloCard) => void;
  onDelete: (id: string) => void;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState<string[]>([]);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setPriority(card.priority);
      setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
      setLabels(card.labels);
    }
  }, [card]);

  const handleSave = () => {
    if (card && title.trim()) {
      const updatedCard = {
        ...card,
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        labels,
        updatedAt: new Date(),
      };
      onSave(updatedCard);
      onClose();
    }
  };

  const labelColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-[#E8E9F1] dark:border-[#23283A]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Editar Cartão</h2>
          <button onClick={onClose} className="text-2xl text-[#6B6F76] dark:text-gray-300 hover:text-[#F45B69] transition-colors">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
              placeholder="Título do cartão..."
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
              placeholder="Descrição do cartão..."
            />
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Prioridade
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>

          {/* Data de vencimento */}
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Data de vencimento
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Labels
            </label>
            <div className="flex flex-wrap gap-2">
              {labelColors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    if (labels.includes(color)) {
                      setLabels(labels.filter(l => l !== color));
                    } else {
                      setLabels([...labels, color]);
                    }
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm ${
                    labels.includes(color) 
                      ? 'border-[#2E2F38] dark:border-white scale-110' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between pt-6 border-t border-[#E8E9F1] dark:border-[#23283A]">
          <button
            onClick={() => onDelete(card.id)}
            className="px-4 py-2 bg-[#F45B69] text-white rounded-lg hover:bg-[#DC2626] transition-colors shadow-sm"
          >
            Excluir
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors shadow-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors shadow-sm"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Modal para Lista
const ListModal = ({ list, isOpen, onClose, onSave, onDelete }: {
  list: BrelloList | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (list: BrelloList) => void;
  onDelete: (id: string) => void;
}) => {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#3B82F6');

  useEffect(() => {
    if (list) {
      setTitle(list.title);
      setColor(list.color);
    }
  }, [list]);

  const handleSave = () => {
    if (list && title.trim()) {
      const updatedList = {
        ...list,
        title: title.trim(),
        color,
      };
      onSave(updatedList);
      onClose();
    }
  };

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  if (!isOpen || !list) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-[#E8E9F1] dark:border-[#23283A]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Editar Lista</h2>
          <button onClick={onClose} className="text-2xl text-[#6B6F76] dark:text-gray-300 hover:text-[#F45B69] transition-colors">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
              placeholder="Título da lista..."
            />
          </div>

          {/* Cor */}
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Cor
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  className={`w-10 h-10 rounded-full border-2 transition-all shadow-sm ${
                    color === colorOption 
                      ? 'border-[#2E2F38] dark:border-white scale-110' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between pt-6 border-t border-[#E8E9F1] dark:border-[#23283A]">
          <button
            onClick={() => onDelete(list.id)}
            className="px-4 py-2 bg-[#F45B69] text-white rounded-lg hover:bg-[#DC2626] transition-colors shadow-sm"
          >
            Excluir
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors shadow-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors shadow-sm"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BrelloPage() {
  const { userData } = useAuth();
  const [boards, setBoards] = useState<BrelloBoard[]>([]);
  const [currentBoard, setCurrentBoard] = useState<BrelloBoard | null>(null);
  const [lists, setLists] = useState<BrelloList[]>([]);
  const [cards, setCards] = useState<BrelloCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modais
  const [showCardModal, setShowCardModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [editingCard, setEditingCard] = useState<BrelloCard | null>(null);
  const [editingList, setEditingList] = useState<BrelloList | null>(null);
  
  // Estados para criação
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [newListColor, setNewListColor] = useState('#3B82F6');

  // Carregar dados iniciais
  useEffect(() => {
    if (userData?.imobiliariaId) {
      loadBoards();
    }
  }, [userData]);

  // Carregar listas e cartões quando mudar o board
  useEffect(() => {
    if (currentBoard) {
      loadLists();
      loadCards();
    }
  }, [currentBoard]);

  const loadBoards = async () => {
    try {
      const q = query(
        collection(db, 'brelloBoards'),
        where('imobiliariaId', '==', userData?.imobiliariaId)
        // Removido orderBy para evitar problemas de índice
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const boardsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BrelloBoard[];
        
        // Ordenar localmente em vez de no Firebase
        const sortedBoards = boardsData.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setBoards(sortedBoards);
        if (sortedBoards.length > 0 && !currentBoard) {
          setCurrentBoard(sortedBoards[0]);
        }
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Erro ao carregar boards:', error);
      setLoading(false);
    }
  };

  const loadLists = async () => {
    if (!currentBoard) return;
    
    try {
      const q = query(
        collection(db, 'brelloLists'),
        where('boardId', '==', currentBoard.id)
        // Removido orderBy para evitar problemas de índice
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const listsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BrelloList[];
        
        // Ordenar localmente em vez de no Firebase
        const sortedLists = listsData.sort((a, b) => a.order - b.order);
        setLists(sortedLists);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
    }
  };

  const loadCards = async () => {
    if (!currentBoard) return;
    
    try {
      const q = query(
        collection(db, 'brelloCards'),
        where('boardId', '==', currentBoard.id)
        // Removido orderBy para evitar problemas de índice
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const cardsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BrelloCard[];
        
        // Ordenar localmente em vez de no Firebase
        const sortedCards = cardsData.sort((a, b) => a.order - b.order);
        setCards(sortedCards);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    }
  };

  // Criar novo board
  const createBoard = async () => {
    if (!newBoardTitle.trim() || !userData?.imobiliariaId) return;
    
    try {
      const boardData = {
        title: newBoardTitle.trim(),
        imobiliariaId: userData.imobiliariaId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await addDoc(collection(db, 'brelloBoards'), boardData);
      setNewBoardTitle('');
      setShowNewBoardModal(false);
    } catch (error) {
      console.error('Erro ao criar board:', error);
    }
  };

  // Criar nova lista
  const createList = async () => {
    if (!newListTitle.trim() || !currentBoard) return;
    
    try {
      const listData = {
        title: newListTitle.trim(),
        color: newListColor,
        order: lists.length,
        boardId: currentBoard.id,
      };
      
      await addDoc(collection(db, 'brelloLists'), listData);
      setNewListTitle('');
      setNewListColor('#3B82F6');
      setShowNewListModal(false);
    } catch (error) {
      console.error('Erro ao criar lista:', error);
    }
  };

  // Adicionar cartão
  const addCard = async (listId: string) => {
    if (!currentBoard) return;
    
    try {
      const cardData = {
        title: 'Novo Cartão',
        description: '',
        listId,
        order: cards.filter(c => c.listId === listId).length,
        labels: [],
        priority: 'medium' as const,
        boardId: currentBoard.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await addDoc(collection(db, 'brelloCards'), cardData);
    } catch (error) {
      console.error('Erro ao criar cartão:', error);
    }
  };

  // Salvar cartão
  const saveCard = async (card: BrelloCard) => {
    try {
      await updateDoc(doc(db, 'brelloCards', card.id), {
        title: card.title,
        description: card.description,
        priority: card.priority,
        dueDate: card.dueDate,
        labels: card.labels,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
    }
  };

  // Excluir cartão
  const deleteCard = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'brelloCards', id));
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
    }
  };

  // Salvar lista
  const saveList = async (list: BrelloList) => {
    try {
      await updateDoc(doc(db, 'brelloLists', list.id), {
        title: list.title,
        color: list.color,
      });
    } catch (error) {
      console.error('Erro ao salvar lista:', error);
    }
  };

  // Excluir lista
  const deleteList = async (id: string) => {
    try {
      // Primeiro excluir todos os cartões da lista
      const listCards = cards.filter(c => c.listId === id);
      for (const card of listCards) {
        await deleteDoc(doc(db, 'brelloCards', card.id));
      }
      
      // Depois excluir a lista
      await deleteDoc(doc(db, 'brelloLists', id));
    } catch (error) {
      console.error('Erro ao excluir lista:', error);
    }
  };

  // Sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  // Drag & Drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Verificar se é um cartão sendo movido
    const activeCard = cards.find(c => c.id === activeId);
    if (activeCard) {
      const overList = lists.find(l => l.id === overId);
      if (overList) {
        // Mover cartão para nova lista
        await updateDoc(doc(db, 'brelloCards', activeCard.id), {
          listId: overList.id,
          updatedAt: new Date(),
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F6FA] to-[#E8E9F1] dark:from-[#181C23] dark:to-[#23283A] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#E8E9F1] dark:border-[#23283A] border-t-[#3478F6] rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-[#10B981] rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <h3 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-2">Carregando Brello</h3>
          <p className="text-[#6B6F76] dark:text-gray-300">Preparando seu espaço de trabalho...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F6FA] to-[#E8E9F1] dark:from-[#181C23] dark:to-[#23283A]">
      {/* Header */}
      <div className="bg-white/80 dark:bg-[#23283A]/80 backdrop-blur-sm border-b border-[#E8E9F1] dark:border-[#23283A] p-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#3478F6] to-[#10B981] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-[#2E2F38] to-[#3478F6] dark:from-white dark:to-[#A3C8F7] bg-clip-text text-transparent">
                    Brello
                  </h1>
                  <p className="text-sm text-[#6B6F76] dark:text-gray-300">Organize suas tarefas com estilo</p>
                </div>
              </div>
              
              {/* Seletor de Board */}
              <div className="flex items-center gap-3">
                <select
                  value={currentBoard?.id || ''}
                  onChange={(e) => {
                    const board = boards.find(b => b.id === e.target.value);
                    setCurrentBoard(board || null);
                  }}
                  className="px-4 py-2 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3478F6] shadow-sm"
                >
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.title}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={() => setShowNewBoardModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-[#3478F6] to-[#255FD1] text-white rounded-lg hover:from-[#255FD1] hover:to-[#1E40AF] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  + Novo Board
                </button>
              </div>
            </div>
            
            {/* Botão Nova Lista */}
            {currentBoard && (
              <button
                onClick={() => setShowNewListModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-lg hover:from-[#059669] hover:to-[#047857] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                + Nova Lista
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {currentBoard ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-6 overflow-x-auto pb-6">
                {lists.map((list) => (
                  <List
                    key={list.id}
                    list={list}
                    cards={cards}
                    onAddCard={addCard}
                    onEditCard={(card) => {
                      setEditingCard(card);
                      setShowCardModal(true);
                    }}
                    onDeleteCard={deleteCard}
                    onEditList={(list) => {
                      setEditingList(list);
                      setShowListModal(true);
                    }}
                    onDeleteList={deleteList}
                    onMoveCard={(cardId, newListId) => {
                      // Encontrar o cartão a ser movido
                      const cardToMove = cards.find(c => c.id === cardId);
                      if (cardToMove) {
                        // Atualizar o ID da lista no cartão
                        updateDoc(doc(db, 'brelloCards', cardId), {
                          listId: newListId,
                          updatedAt: new Date(),
                        });
                      }
                    }}
                  />
                ))}
                
                {/* Botão para adicionar nova lista */}
                <button
                  onClick={() => setShowNewListModal(true)}
                  className="min-w-[280px] h-fit p-8 border-2 border-dashed border-[#E8E9F1] dark:border-[#23283A] rounded-xl hover:border-[#3478F6] hover:bg-white/50 dark:hover:bg-[#23283A]/50 transition-all duration-200 group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#3478F6] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <span className="text-2xl text-white">+</span>
                    </div>
                    <p className="text-[#6B6F76] dark:text-gray-300 group-hover:text-[#3478F6] transition-colors">
                      Adicionar Lista
                    </p>
                  </div>
                </button>
              </div>
            </DndContext>
          ) : (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-[#3478F6] to-[#10B981] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <span className="text-4xl">📋</span>
              </div>
              <h3 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-4">
                Bem-vindo ao Brello!
              </h3>
              <p className="text-lg text-[#6B6F76] dark:text-gray-300 mb-8 max-w-md mx-auto">
                Crie seu primeiro board para começar a organizar suas tarefas de forma visual e intuitiva
              </p>
              <button
                onClick={() => setShowNewBoardModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-[#3478F6] to-[#255FD1] text-white rounded-xl hover:from-[#255FD1] hover:to-[#1E40AF] transition-all duration-200 text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
              >
                🚀 Criar Primeiro Board
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Board */}
      {showNewBoardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#3478F6] to-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Novo Board</h2>
              <p className="text-[#6B6F76] dark:text-gray-300">Dê um nome ao seu novo espaço de trabalho</p>
            </div>
            
            <input
              type="text"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              placeholder="Nome do board..."
              className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white mb-6 shadow-sm text-lg"
              autoFocus
            />
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewBoardModal(false)}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={createBoard}
                className="px-6 py-3 bg-gradient-to-r from-[#3478F6] to-[#255FD1] text-white rounded-lg hover:from-[#255FD1] hover:to-[#1E40AF] transition-all duration-200 shadow-sm"
              >
                Criar Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Lista */}
      {showNewListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Nova Lista</h2>
              <p className="text-[#6B6F76] dark:text-gray-300">Organize suas tarefas em colunas</p>
            </div>
            
            <input
              type="text"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="Nome da lista..."
              className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white mb-6 shadow-sm text-lg"
              autoFocus
            />
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-3">
                Escolha uma cor para a lista
              </label>
              <div className="flex flex-wrap gap-3 justify-center">
                {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewListColor(color)}
                    className={`w-12 h-12 rounded-full border-4 transition-all shadow-lg hover:scale-110 ${
                      newListColor === color 
                        ? 'border-[#2E2F38] dark:border-white scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewListModal(false)}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={createList}
                className="px-6 py-3 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-lg hover:from-[#059669] hover:to-[#047857] transition-all duration-200 shadow-sm"
              >
                Criar Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Cartão */}
      <CardModal
        card={editingCard}
        isOpen={showCardModal}
        onClose={() => {
          setShowCardModal(false);
          setEditingCard(null);
        }}
        onSave={saveCard}
        onDelete={deleteCard}
      />

      {/* Modal Editar Lista */}
      <ListModal
        list={editingList}
        isOpen={showListModal}
        onClose={() => {
          setShowListModal(false);
          setEditingList(null);
        }}
        onSave={saveList}
        onDelete={deleteList}
      />
    </div>
  );
}
