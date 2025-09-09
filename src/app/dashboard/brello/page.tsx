'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Tipos para o sistema Brello
interface BrelloCard {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  order: number;
  labels: string[];
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

interface BrelloColumn {
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

// Componente de Card
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
    <div className="bg-white dark:bg-[#23283A] rounded-lg shadow-sm border border-[#E8E9F1] dark:border-[#23283A] p-3 mb-3 hover:shadow-md transition-all duration-200 group cursor-pointer">
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

// Componente de Coluna
const Column = ({ column, cards, onAddCard, onEditCard, onDeleteCard, onEditColumn, onDeleteColumn }: {
  column: BrelloColumn;
  cards: BrelloCard[];
  onAddCard: (columnId: string) => void;
  onEditCard: (card: BrelloCard) => void;
  onDeleteCard: (id: string) => void;
  onEditColumn: (column: BrelloColumn) => void;
  onDeleteColumn: (id: string) => void;
}) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const handleAddCard = async () => {
    if (newCardTitle.trim()) {
      await onAddCard(column.id);
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  const sortedCards = cards
    .filter(card => card.columnId === column.id)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="bg-[#F5F6FA] dark:bg-[#181C23] rounded-xl p-4 min-w-[280px] max-w-[280px] shadow-lg transition-colors">
      {/* Header da Coluna */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full shadow-sm"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-[#2E2F38] dark:text-white text-base">
            {column.title}
          </h3>
          <span className="text-xs text-[#6B6F76] dark:text-gray-300 bg-white dark:bg-[#23283A] px-2 py-1 rounded-full shadow-sm">
            {sortedCards.length}
          </span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEditColumn(column)}
            className="p-1 text-[#6B6F76] dark:text-gray-300 hover:text-[#3478F6] hover:bg-[#3478F6] hover:text-white rounded transition-all"
            title="Editar coluna"
          >
            ✏️
          </button>
          <button
            onClick={() => onDeleteColumn(column.id)}
            className="p-1 text-[#6B6F76] dark:text-gray-300 hover:text-[#F45B69] hover:bg-[#F45B69] hover:text-white rounded transition-all"
            title="Excluir coluna"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Cartões */}
      <div className="space-y-3 mb-4 min-h-[100px]">
        {sortedCards.map((card, index) => (
          <Draggable key={card.id} draggableId={card.id} index={index}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`transition-all duration-200 ${
                  snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl' : ''
                }`}
              >
                <Card
                  card={card}
                  onEdit={onEditCard}
                  onDelete={onDeleteCard}
                />
              </div>
            )}
          </Draggable>
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

export default function BrelloPage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<BrelloBoard[]>([]);
  const [columns, setColumns] = useState<BrelloColumn[]>([]);
  const [cards, setCards] = useState<BrelloCard[]>([]);
  const [currentBoard, setCurrentBoard] = useState<BrelloBoard | null>(null);
  
  // Estados para modais
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showNewColumnModal, setShowNewColumnModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  
  // Estados para edição
  const [editingCard, setEditingCard] = useState<BrelloCard | null>(null);
  const [editingColumn, setEditingColumn] = useState<BrelloColumn | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3B82F6');

  // Carregar boards do Firebase
  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }

    setLoading(true);

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
      
      console.log('Boards carregados:', boardsData.length);
      setBoards(boardsData);
      
      // Selecionar o primeiro board se não houver nenhum selecionado
      if (boardsData.length > 0 && !currentBoard) {
        console.log('Selecionando primeiro board:', boardsData[0].title);
        setCurrentBoard(boardsData[0]);
      } else if (boardsData.length === 0) {
        console.log('Nenhum board encontrado');
        setCurrentBoard(null);
        setLoading(false);
      } else {
        // Se já há um board selecionado, apenas parar o loading
        setLoading(false);
      }
    }, (error) => {
      console.error('Erro ao carregar boards:', error);
      setLoading(false);
    });

    return () => {
      unsubscribeBoards();
    };
  }, [userData]);

  // Carregar colunas e cartões quando o board mudar
  useEffect(() => {
    if (!currentBoard) {
      setColumns([]);
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let loadedColumns = false;
    let loadedCards = false;

    const checkLoadingComplete = () => {
      if (loadedColumns && loadedCards) {
        setLoading(false);
      }
    };

    // Timeout de segurança para evitar loading infinito
    const timeoutId = setTimeout(() => {
      console.warn('Timeout no carregamento do board');
      setLoading(false);
    }, 10000);

    // Carregar colunas
    const columnsQuery = query(
      collection(db, 'brelloColumns'),
      where('boardId', '==', currentBoard.id),
      orderBy('order', 'asc')
    );

    const unsubscribeColumns = onSnapshot(columnsQuery, (snapshot) => {
      const columnsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BrelloColumn[];
      
      console.log('Colunas carregadas:', columnsData.length);
      setColumns(columnsData);
      loadedColumns = true;
      checkLoadingComplete();
    }, (error) => {
      console.error('Erro ao carregar colunas:', error);
      loadedColumns = true;
      checkLoadingComplete();
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
      
      console.log('Cartões carregados:', cardsData.length);
      setCards(cardsData);
      loadedCards = true;
      checkLoadingComplete();
    }, (error) => {
      console.error('Erro ao carregar cartões:', error);
      loadedCards = true;
      checkLoadingComplete();
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribeColumns();
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

      const docRef = await addDoc(collection(db, 'brelloBoards'), boardData);
      
      // Criar o novo board e selecioná-lo
      const newBoard = {
        id: docRef.id,
        ...boardData
      } as BrelloBoard;
      
      setCurrentBoard(newBoard);
      setNewBoardTitle('');
      setShowNewBoardModal(false);
    } catch (error) {
      console.error('Erro ao criar board:', error);
    }
  };

  const deleteBoard = async (boardId: string) => {
    try {
      // Primeiro excluir todas as colunas do board
      const boardColumns = columns.filter(c => c.boardId === boardId);
      for (const column of boardColumns) {
        await deleteColumn(column.id);
      }
      
      // Depois excluir o board
      await deleteDoc(doc(db, 'brelloBoards', boardId));
      
      // Se era o board atual, limpar a seleção
      if (currentBoard?.id === boardId) {
        setCurrentBoard(null);
        setColumns([]);
        setCards([]);
      }
    } catch (error) {
      console.error('Erro ao excluir board:', error);
    }
  };

  // Funções para gerenciar colunas
  const addColumn = async () => {
    if (!currentBoard || !newColumnTitle.trim()) return;

    try {
      const columnData = {
        title: newColumnTitle.trim(),
        color: newColumnColor,
        order: columns.length,
        boardId: currentBoard.id,
      };

      await addDoc(collection(db, 'brelloColumns'), columnData);
      setNewColumnTitle('');
      setNewColumnColor('#3B82F6');
      setShowNewColumnModal(false);
    } catch (error) {
      console.error('Erro ao criar coluna:', error);
    }
  };

  const updateColumn = async (column: BrelloColumn) => {
    try {
      await updateDoc(doc(db, 'brelloColumns', column.id), {
        title: column.title,
        color: column.color,
        updatedAt: new Date(),
      });
      setShowColumnModal(false);
    } catch (error) {
      console.error('Erro ao atualizar coluna:', error);
    }
  };

  const deleteColumn = async (id: string) => {
    try {
      // Primeiro excluir todos os cartões da coluna
      const columnCards = cards.filter(c => c.columnId === id);
      for (const card of columnCards) {
        await deleteDoc(doc(db, 'brelloCards', card.id));
      }
      
      // Depois excluir a coluna
      await deleteDoc(doc(db, 'brelloColumns', id));
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
    }
  };

  // Funções para gerenciar cartões
  const addCard = async (columnId: string) => {
    if (!currentBoard) return;

    try {
      const cardData = {
        title: 'Novo Cartão',
        description: '',
        columnId,
        boardId: currentBoard.id,
        order: cards.filter(c => c.columnId === columnId).length,
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

  // Função para drag & drop
  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    const sourceColumnId = source.droppableId;
    const destinationColumnId = destination.droppableId;

    if (sourceColumnId === destinationColumnId && source.index === destination.index) {
      return;
    }

    // Reordenar cartões na mesma coluna
    if (sourceColumnId === destinationColumnId) {
      const columnCards = cards
        .filter(card => card.columnId === sourceColumnId)
        .sort((a, b) => a.order - b.order);

      const [movedCard] = columnCards.splice(source.index, 1);
      columnCards.splice(destination.index, 0, movedCard);

      // Atualizar ordens no Firebase
      for (let i = 0; i < columnCards.length; i++) {
        await updateDoc(doc(db, 'brelloCards', columnCards[i].id), {
          order: i,
          updatedAt: new Date(),
        });
      }
    } else {
      // Mover cartão entre colunas
      const sourceCards = cards
        .filter(card => card.columnId === sourceColumnId)
        .sort((a, b) => a.order - b.order);
      
      const destinationCards = cards
        .filter(card => card.columnId === destinationColumnId)
        .sort((a, b) => a.order - b.order);

      const [movedCard] = sourceCards.splice(source.index, 1);
      movedCard.columnId = destinationColumnId;
      destinationCards.splice(destination.index, 0, movedCard);

      // Atualizar ordens no Firebase
      for (let i = 0; i < sourceCards.length; i++) {
        await updateDoc(doc(db, 'brelloCards', sourceCards[i].id), {
          order: i,
          updatedAt: new Date(),
        });
      }

      for (let i = 0; i < destinationCards.length; i++) {
        await updateDoc(doc(db, 'brelloCards', destinationCards[i].id), {
          order: i,
          columnId: destinationColumnId,
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
            
            {/* Botão Nova Coluna */}
            {currentBoard && (
              <button
                onClick={() => setShowNewColumnModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-lg hover:from-[#059669] hover:to-[#047857] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                + Nova Coluna
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {currentBoard ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-6 overflow-x-auto pb-6">
                {columns.map((column) => (
                  <Droppable key={column.id} droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`transition-all duration-200 ${
                          snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <Column
                          column={column}
                          cards={cards}
                          onAddCard={addCard}
                          onEditCard={(card) => {
                            setEditingCard(card);
                            setShowCardModal(true);
                          }}
                          onDeleteCard={deleteCard}
                          onEditColumn={(column) => {
                            setEditingColumn(column);
                            setShowColumnModal(true);
                          }}
                          onDeleteColumn={deleteColumn}
                        />
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
                
                {/* Botão para adicionar nova coluna */}
                <button
                  onClick={() => setShowNewColumnModal(true)}
                  className="min-w-[280px] h-fit p-8 border-2 border-dashed border-[#E8E9F1] dark:border-[#23283A] rounded-xl hover:border-[#3478F6] hover:bg-white/50 dark:hover:bg-[#23283A]/50 transition-all duration-200 group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#3478F6] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <span className="text-2xl text-white">+</span>
                    </div>
                    <p className="text-[#6B6F76] dark:text-gray-300 group-hover:text-[#3478F6] transition-colors">
                      Adicionar Coluna
                    </p>
                  </div>
                </button>
              </div>
            </DragDropContext>
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

      {/* Modal Nova Coluna */}
      {showNewColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#3478F6] to-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Nova Coluna</h2>
              <p className="text-[#6B6F76] dark:text-gray-300">Configure sua nova coluna</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Nome da Coluna
                </label>
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="Nome da coluna..."
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
                      onClick={() => setNewColumnColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newColumnColor === c ? 'border-[#2E2F38] dark:border-white scale-110' : 'border-[#E8E9F1] dark:border-[#23283A]'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowNewColumnModal(false)}
                className="px-4 py-2 bg-[#6B6F76] text-white rounded-lg hover:bg-[#4B5563] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addColumn}
                className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors"
              >
                Criar Coluna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Coluna */}
      {showColumnModal && editingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#3478F6] to-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✏️</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Editar Coluna</h2>
              <p className="text-[#6B6F76] dark:text-gray-300">Configure sua coluna</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Nome da Coluna
                </label>
                <input
                  type="text"
                  value={editingColumn.title}
                  onChange={(e) => setEditingColumn({...editingColumn, title: e.target.value})}
                  placeholder="Nome da coluna..."
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
                      onClick={() => setEditingColumn({...editingColumn, color: c})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        editingColumn.color === c ? 'border-[#2E2F38] dark:border-white scale-110' : 'border-[#E8E9F1] dark:border-[#23283A]'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => deleteColumn(editingColumn.id)}
                className="px-4 py-2 bg-[#F45B69] text-white rounded-lg hover:bg-[#DC2626] transition-colors"
              >
                Excluir
              </button>
              <button
                onClick={() => setShowColumnModal(false)}
                className="px-4 py-2 bg-[#6B6F76] text-white rounded-lg hover:bg-[#4B5563] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateColumn(editingColumn)}
                className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Cartão */}
      {showCardModal && editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-[#E8E9F1] dark:border-[#23283A]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#3478F6] to-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Editar Cartão</h2>
              <p className="text-[#6B6F76] dark:text-gray-300">Configure seu cartão</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={editingCard.title}
                  onChange={(e) => setEditingCard({...editingCard, title: e.target.value})}
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
                  value={editingCard.description || ''}
                  onChange={(e) => setEditingCard({...editingCard, description: e.target.value})}
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
                  value={editingCard.priority}
                  onChange={(e) => setEditingCard({...editingCard, priority: e.target.value as 'low' | 'medium' | 'high'})}
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
                  value={editingCard.dueDate ? new Date(editingCard.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingCard({...editingCard, dueDate: e.target.value ? new Date(e.target.value) : undefined})}
                  className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478F6] bg-white dark:bg-[#23283A] text-[#2E2F38] dark:text-white shadow-sm"
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => deleteCard(editingCard.id)}
                className="px-4 py-2 bg-[#F45B69] text-white rounded-lg hover:bg-[#DC2626] transition-colors"
              >
                Excluir
              </button>
              <button
                onClick={() => setShowCardModal(false)}
                className="px-4 py-2 bg-[#6B6F76] text-white rounded-lg hover:bg-[#4B5563] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateCard(editingCard)}
                className="px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}