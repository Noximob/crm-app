'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';

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
    <div className="bg-white dark:bg-[#23283A] rounded-lg shadow-sm border border-[#E8E9F1] dark:border-[#23283A] p-3 mb-3 hover:shadow-md transition-all duration-200 group">
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
      <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(card)}
          className="text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] transition-colors"
          title="Editar cartão"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(card.id)}
          className="text-[#6B6F76] dark:text-gray-300 hover:text-[#F45B69] transition-colors"
          title="Excluir cartão"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

// Componente de Lista
const List = ({ list, cards, onAddCard, onEditCard, onDeleteCard, onEditList, onDeleteList }: {
  list: BrelloList;
  cards: BrelloCard[];
  onAddCard: (listId: string) => void;
  onEditCard: (card: BrelloCard) => void;
  onDeleteCard: (id: string) => void;
  onEditList: (list: BrelloList) => void;
  onDeleteList: (id: string) => void;
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

  const sortedCards = cards
    .filter(card => card.listId === list.id)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl p-4 min-w-[280px] max-w-[280px] shadow-lg transition-colors">
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddCard();
              } else if (e.key === 'Escape') {
                setIsAddingCard(false);
                setNewCardTitle('');
              }
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddCard}
              className="px-3 py-1 bg-[#10B981] text-white text-sm rounded-lg hover:bg-[#059669] transition-colors"
            >
              Adicionar
            </button>
            <button
              onClick={() => {
                setIsAddingCard(false);
                setNewCardTitle('');
              }}
              className="px-3 py-1 bg-[#6B6F76] text-white text-sm rounded-lg hover:bg-[#4B5563] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingCard(true)}
          className="w-full p-2 text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] hover:bg-white/50 dark:hover:bg-[#23283A]/50 rounded-lg transition-all duration-200 text-sm"
        >
          + Adicionar cartão
        </button>
      )}
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
    } else {
      setTitle('');
      setColor('#3B82F6');
    }
  }, [list]);

  const handleSave = () => {
    if (title.trim() && list) {
      onSave({ ...list, title: title.trim(), color });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-[#E8E9F1] dark:border-[#23283A]">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#3478F6] to-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">
            {list ? 'Editar Lista' : 'Nova Lista'}
          </h2>
          <p className="text-[#6B6F76] dark:text-gray-300">Configure sua lista</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Nome da Lista
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da lista..."
              className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Cor
            </label>
            <div className="flex gap-2">
              {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? 'border-[#2E2F38] dark:border-white scale-110' : 'border-[#E8E9F1] dark:border-[#23283A]'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end mt-6">
          {list && (
            <button
              onClick={() => onDelete(list.id)}
              className="px-4 py-2 bg-[#F45B69] text-white rounded-lg hover:bg-[#DC2626] transition-colors"
            >
              Excluir
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#6B6F76] text-white rounded-lg hover:bg-[#4B5563] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
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

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setPriority(card.priority);
      setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
    }
  }, [card]);

  const handleSave = () => {
    if (title.trim() && card) {
      onSave({
        ...card,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        updatedAt: new Date(),
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-[#E8E9F1] dark:border-[#23283A]">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#3478F6] to-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📝</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">
            {card ? 'Editar Cartão' : 'Novo Cartão'}
          </h2>
          <p className="text-[#6B6F76] dark:text-gray-300">Configure seu cartão</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do cartão..."
              className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do cartão..."
              rows={3}
              className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Prioridade
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
              Data de Vencimento
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
            />
          </div>
        </div>
        
        <div className="flex gap-3 justify-end mt-6">
          {card && (
            <button
              onClick={() => onDelete(card.id)}
              className="px-4 py-2 bg-[#F45B69] text-white rounded-lg hover:bg-[#DC2626] transition-colors"
            >
              Excluir
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#6B6F76] text-white rounded-lg hover:bg-[#4B5563] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

// Página Principal do Brello
export default function BrelloPage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<BrelloBoard[]>([]);
  const [lists, setLists] = useState<BrelloList[]>([]);
  const [cards, setCards] = useState<BrelloCard[]>([]);
  const [currentBoard, setCurrentBoard] = useState<BrelloBoard | null>(null);
  
  // Estados para modais
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  
  // Estados para edição
  const [editingCard, setEditingCard] = useState<BrelloCard | null>(null);
  const [editingList, setEditingList] = useState<BrelloList | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [newListColor, setNewListColor] = useState('#3B82F6');

  // Carregar dados do Firebase
  useEffect(() => {
    if (!userData) return;

    setLoading(true);

    // Carregar boards
          const boardsQuery = query(
        collection(db, 'brelloBoards'),
        where('imobiliariaId', '==', userData.imobiliariaId),
        orderBy('createdAt', 'desc')
      );

    const unsubscribeBoards = onSnapshot(boardsQuery, (snapshot) => {
      const boardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BrelloBoard[];
      
      setBoards(boardsData);
      
      // Selecionar o primeiro board se não houver nenhum selecionado
      if (boardsData.length > 0 && !currentBoard) {
        setCurrentBoard(boardsData[0]);
      }
    });

    return () => {
      unsubscribeBoards();
    };
  }, [userData, currentBoard]);

  // Carregar listas e cartões quando o board mudar
  useEffect(() => {
    if (!currentBoard) {
      setLists([]);
      setCards([]);
      return;
    }

    // Carregar listas
    const listsQuery = query(
      collection(db, 'brelloLists'),
      where('boardId', '==', currentBoard.id),
      orderBy('order', 'asc')
    );

    const unsubscribeLists = onSnapshot(listsQuery, (snapshot) => {
      const listsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BrelloList[];
      
      setLists(listsData);
    });

    // Carregar cartões
    const cardsQuery = query(
      collection(db, 'brelloCards'),
      where('boardId', '==', currentBoard.id),
      orderBy('order', 'asc')
    );

    const unsubscribeCards = onSnapshot(cardsQuery, (snapshot) => {
      const cardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BrelloCard[];
      
      setCards(cardsData);
      setLoading(false);
    });

    return () => {
      unsubscribeLists();
      unsubscribeCards();
    };
  }, [currentBoard]);

  // Funções para gerenciar boards
  const addBoard = async () => {
    if (!userData || !newBoardTitle.trim()) return;

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

  const deleteBoard = async (boardId: string) => {
    try {
      // Primeiro excluir todas as listas do board
      const boardLists = lists.filter(l => l.boardId === boardId);
      for (const list of boardLists) {
        await deleteList(list.id);
      }
      
      // Depois excluir o board
      await deleteDoc(doc(db, 'brelloBoards', boardId));
      
      // Se era o board atual, limpar a seleção
      if (currentBoard?.id === boardId) {
        setCurrentBoard(null);
        setLists([]);
        setCards([]);
      }
    } catch (error) {
      console.error('Erro ao excluir board:', error);
    }
  };

  // Funções para gerenciar listas
  const addList = async () => {
    if (!currentBoard || !newListTitle.trim()) return;

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

  const updateList = async (list: BrelloList) => {
    try {
      await updateDoc(doc(db, 'brelloLists', list.id), {
        title: list.title,
        color: list.color,
        updatedAt: new Date(),
      });
      setShowListModal(false);
    } catch (error) {
      console.error('Erro ao atualizar lista:', error);
    }
  };

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

  // Funções para gerenciar cartões
  const addCard = async (listId: string) => {
    if (!currentBoard) return;

    try {
      const cardData = {
        title: 'Novo Cartão',
        description: '',
        listId,
        boardId: currentBoard.id,
        order: cards.filter(c => c.listId === listId).length,
        labels: [],
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, 'brelloCards'), cardData);
    } catch (error) {
      console.error('Erro ao criar cartão:', error);
    }
  };

  const updateCard = async (card: BrelloCard) => {
    try {
      await updateDoc(doc(db, 'brelloCards', card.id), {
        title: card.title,
        description: card.description,
        priority: card.priority,
        dueDate: card.dueDate,
        updatedAt: new Date(),
      });
      setShowCardModal(false);
    } catch (error) {
      console.error('Erro ao atualizar cartão:', error);
    }
  };

  const deleteCard = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'brelloCards', id));
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
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
                
                {currentBoard && (
                  <button
                    onClick={() => deleteBoard(currentBoard.id)}
                    className="px-3 py-2 bg-[#F45B69] text-white rounded-lg hover:bg-[#DC2626] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    title="Excluir Board"
                  >
                    🗑️
                  </button>
                )}
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
                className="px-4 py-2 bg-[#6B6F76] text-white rounded-lg hover:bg-[#4B5563] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addBoard}
                className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors"
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
              <div className="w-16 h-16 bg-gradient-to-br from-[#3478F6] to-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Nova Lista</h2>
              <p className="text-[#6B6F76] dark:text-gray-300">Configure sua nova lista</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Nome da Lista
                </label>
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Nome da lista..."
                  className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Cor
                </label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewListColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newListColor === c ? 'border-[#2E2F38] dark:border-white scale-110' : 'border-[#E8E9F1] dark:border-[#23283A]'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowNewListModal(false)}
                className="px-4 py-2 bg-[#6B6F76] text-white rounded-lg hover:bg-[#4B5563] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addList}
                className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors"
              >
                Criar Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      <ListModal
        list={editingList}
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        onSave={updateList}
        onDelete={deleteList}
      />

      <CardModal
        card={editingCard}
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        onSave={updateCard}
        onDelete={deleteCard}
      />
    </div>
  );
}
