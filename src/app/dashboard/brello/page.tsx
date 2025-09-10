'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

interface BrelloCard {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  order: number;
  createdAt: any;
}

interface BrelloColumn {
  id: string;
  title: string;
  boardId: string;
  order: number;
  createdAt: any;
}

interface BrelloBoard {
  id: string;
  title: string;
  userId: string;
  createdAt: any;
}

const Brello = () => {
  const { currentUser } = useAuth();
  const [boards, setBoards] = useState<BrelloBoard[]>([]);
  const [currentBoard, setCurrentBoard] = useState<BrelloBoard | null>(null);
  const [columns, setColumns] = useState<BrelloColumn[]>([]);
  const [cards, setCards] = useState<BrelloCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showNewColumnModal, setShowNewColumnModal] = useState(false);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState('');

  // Timeout de segurança para loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  // Carregar boards
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'brelloBoards'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('onSnapshot boards - dados recebidos:', snapshot.docs.length);
      const boardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BrelloBoard[];
      
      // Ordenar localmente por data de criação (mais recente primeiro)
      boardsData.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return bDate.getTime() - aDate.getTime();
      });
      
      console.log('Boards carregados:', boardsData);
      setBoards(boardsData);
      
      // Selecionar o primeiro board se não houver nenhum selecionado
      if (boardsData.length > 0 && !currentBoard) {
        console.log('Selecionando primeiro board:', boardsData[0]);
        setCurrentBoard(boardsData[0]);
      }
      
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar boards:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Carregar colunas do board atual
  useEffect(() => {
    if (!currentBoard) {
      setColumns([]);
      setCards([]);
      return;
    }

    const q = query(
      collection(db, 'brelloColumns'),
      where('boardId', '==', currentBoard.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('onSnapshot colunas - dados recebidos:', snapshot.docs.length);
      const columnsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BrelloColumn[];
      
      // Ordenar localmente por ordem
      columnsData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('Colunas carregadas:', columnsData);
      setColumns(columnsData);
    }, (error) => {
      console.error('Erro ao carregar colunas:', error);
    });

    return () => unsubscribe();
  }, [currentBoard?.id]);

  // Carregar cards das colunas
  useEffect(() => {
    if (!currentBoard || columns.length === 0) {
      setCards([]);
      return;
    }

    const columnIds = columns.map(col => col.id);
    if (columnIds.length === 0) return;

    const q = query(
      collection(db, 'brelloCards'),
      where('columnId', 'in', columnIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('onSnapshot cards - dados recebidos:', snapshot.docs.length);
      const cardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BrelloCard[];
      
      // Ordenar localmente por ordem
      cardsData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('Cards carregados:', cardsData);
      setCards(cardsData);
    }, (error) => {
      console.error('Erro ao carregar cards:', error);
    });

    return () => unsubscribe();
  }, [currentBoard?.id, columns.length]);

  const createBoard = async () => {
    if (!currentUser || !newBoardTitle.trim()) return;

    try {
      console.log('Criando board:', newBoardTitle);
      
      const boardData = {
        title: newBoardTitle.trim(),
        userId: currentUser.uid,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'brelloBoards'), boardData);
      console.log('Board criado com ID:', docRef.id);
      
      // Criar coluna padrão "To Do"
      await addDoc(collection(db, 'brelloColumns'), {
        title: 'To Do',
        boardId: docRef.id,
        order: 0,
        createdAt: new Date()
      });
      console.log('Coluna padrão criada');

      setNewBoardTitle('');
      setShowNewBoardModal(false);
    } catch (error) {
      console.error('Erro ao criar board:', error);
    }
  };

  const createColumn = async () => {
    if (!currentBoard || !newColumnTitle.trim()) return;

    try {
      console.log('Criando coluna:', newColumnTitle, 'para board:', currentBoard.id);
      
      const columnData = {
        title: newColumnTitle.trim(),
        boardId: currentBoard.id,
        order: columns.length,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'brelloColumns'), columnData);
      console.log('Coluna criada com ID:', docRef.id);
      
      setNewColumnTitle('');
      setShowNewColumnModal(false);
    } catch (error) {
      console.error('Erro ao criar coluna:', error);
    }
  };

  const createCard = async () => {
    if (!selectedColumnId || !newCardTitle.trim()) return;

    try {
      console.log('Criando card:', newCardTitle, 'para coluna:', selectedColumnId);
      
      const cardData = {
        title: newCardTitle.trim(),
        description: newCardDescription.trim(),
        columnId: selectedColumnId,
        order: cards.filter(card => card.columnId === selectedColumnId).length,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'brelloCards'), cardData);
      console.log('Card criado com ID:', docRef.id);
      
      setNewCardTitle('');
      setNewCardDescription('');
      setSelectedColumnId('');
      setShowNewCardModal(false);
    } catch (error) {
      console.error('Erro ao criar card:', error);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Se moveu para a mesma posição, não faz nada
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Se moveu entre colunas
    if (source.droppableId !== destination.droppableId) {
      const card = cards.find(c => c.id === draggableId);
      if (!card) return;

      // Atualizar coluna do card
      await updateDoc(doc(db, 'brelloCards', draggableId), {
        columnId: destination.droppableId,
        order: destination.index
      });

      // Reordenar cards na coluna de origem
      const sourceCards = cards.filter(c => c.columnId === source.droppableId);
      for (let i = 0; i < sourceCards.length; i++) {
        if (sourceCards[i].id !== draggableId) {
          await updateDoc(doc(db, 'brelloCards', sourceCards[i].id), {
            order: i
          });
        }
      }

      // Reordenar cards na coluna de destino
      const destCards = cards.filter(c => c.columnId === destination.droppableId);
      for (let i = 0; i < destCards.length; i++) {
        if (destCards[i].id !== draggableId) {
          await updateDoc(doc(db, 'brelloCards', destCards[i].id), {
            order: i
          });
        }
      }
    } else {
      // Se moveu dentro da mesma coluna
      const columnCards = cards.filter(c => c.columnId === source.droppableId);
      const reorderedCards = Array.from(columnCards);
      const [movedCard] = reorderedCards.splice(source.index, 1);
      reorderedCards.splice(destination.index, 0, movedCard);

      // Atualizar ordem de todos os cards
      for (let i = 0; i < reorderedCards.length; i++) {
        await updateDoc(doc(db, 'brelloCards', reorderedCards[i].id), {
          order: i
        });
      }
    }
  };

  const deleteCard = async (cardId: string) => {
    try {
      await deleteDoc(doc(db, 'brelloCards', cardId));
    } catch (error) {
      console.error('Erro ao deletar card:', error);
    }
  };

  const deleteColumn = async (columnId: string) => {
    try {
      // Deletar todos os cards da coluna primeiro
      const columnCards = cards.filter(card => card.columnId === columnId);
      for (const card of columnCards) {
        await deleteDoc(doc(db, 'brelloCards', card.id));
      }

      // Deletar a coluna
      await deleteDoc(doc(db, 'brelloColumns', columnId));
    } catch (error) {
      console.error('Erro ao deletar coluna:', error);
    }
  };

  const deleteBoard = async (boardId: string) => {
    try {
      // Deletar todas as colunas do board
      const boardColumns = columns.filter(col => col.boardId === boardId);
      for (const column of boardColumns) {
        await deleteColumn(column.id);
      }

      // Deletar o board
      await deleteDoc(doc(db, 'brelloBoards', boardId));
      
      // Se era o board atual, selecionar outro
      if (currentBoard?.id === boardId) {
        const remainingBoards = boards.filter(b => b.id !== boardId);
        setCurrentBoard(remainingBoards.length > 0 ? remainingBoards[0] : null);
      }
    } catch (error) {
      console.error('Erro ao deletar board:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F23] flex items-center justify-center">
        <div className="text-white text-xl">Carregando Brello...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F23] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Brello</h1>
            <p className="text-gray-400">Organize suas tarefas com estilo</p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => setShowNewBoardModal(true)}
              className="bg-[#6366F1] hover:bg-[#5855EB] text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Novo Board
            </button>
            
            {currentBoard && (
              <button
                onClick={() => setShowNewColumnModal(true)}
                className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Nova Coluna
              </button>
            )}
          </div>
        </div>

        {/* Boards List */}
        {boards.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Seus Boards</h2>
            <div className="flex gap-4 flex-wrap">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    currentBoard?.id === board.id
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-[#23283A] text-gray-300 hover:bg-[#2A2F42]'
                  }`}
                  onClick={() => setCurrentBoard(board)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{board.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBoard(board.id);
                      }}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kanban Board */}
        {currentBoard && (
          <div className="bg-[#181C23] rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">{currentBoard.title}</h2>
              <button
                onClick={() => setShowNewCardModal(true)}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Novo Card
              </button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-6 overflow-x-auto pb-4">
                {columns.map((column) => {
                  const columnCards = cards
                    .filter(card => card.columnId === column.id)
                    .sort((a, b) => a.order - b.order);

                  return (
                    <div key={column.id} className="flex-shrink-0 w-80">
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`bg-[#23283A] rounded-lg p-4 min-h-[500px] ${
                              snapshot.isDraggingOver ? 'bg-[#2A2F42]' : ''
                            }`}
                          >
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-semibold text-white">{column.title}</h3>
                              <button
                                onClick={() => deleteColumn(column.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                ×
                              </button>
                            </div>

                            <div className="space-y-3">
                              {columnCards.map((card, index) => (
                                <Draggable key={card.id} draggableId={card.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`bg-[#181C23] rounded-lg p-4 cursor-move transition-all ${
                                        snapshot.isDragging ? 'shadow-lg transform rotate-2' : 'hover:shadow-md'
                                      }`}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-white font-medium">{card.title}</h4>
                                        <button
                                          onClick={() => deleteCard(card.id)}
                                          className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                          ×
                                        </button>
                                      </div>
                                      {card.description && (
                                        <p className="text-gray-400 text-sm">{card.description}</p>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </div>
        )}

        {/* Modals */}
        {showNewBoardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#23283A] rounded-lg p-6 w-96">
              <h3 className="text-xl font-semibold text-white mb-4">Novo Board</h3>
              <input
                type="text"
                placeholder="Nome do board"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                className="w-full p-3 bg-[#181C23] text-white rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={createBoard}
                  className="flex-1 bg-[#6366F1] hover:bg-[#5855EB] text-white py-2 rounded-lg transition-colors"
                >
                  Criar
                </button>
                <button
                  onClick={() => setShowNewBoardModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewColumnModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#23283A] rounded-lg p-6 w-96">
              <h3 className="text-xl font-semibold text-white mb-4">Nova Coluna</h3>
              <input
                type="text"
                placeholder="Nome da coluna"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                className="w-full p-3 bg-[#181C23] text-white rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={createColumn}
                  className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white py-2 rounded-lg transition-colors"
                >
                  Criar
                </button>
                <button
                  onClick={() => setShowNewColumnModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewCardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#23283A] rounded-lg p-6 w-96">
              <h3 className="text-xl font-semibold text-white mb-4">Novo Card</h3>
              <select
                value={selectedColumnId}
                onChange={(e) => setSelectedColumnId(e.target.value)}
                className="w-full p-3 bg-[#181C23] text-white rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
              >
                <option value="">Selecione uma coluna</option>
                {columns.map(column => (
                  <option key={column.id} value={column.id}>{column.title}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Título do card"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                className="w-full p-3 bg-[#181C23] text-white rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
              />
              <textarea
                placeholder="Descrição (opcional)"
                value={newCardDescription}
                onChange={(e) => setNewCardDescription(e.target.value)}
                className="w-full p-3 bg-[#181C23] text-white rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] h-20 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={createCard}
                  className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-white py-2 rounded-lg transition-colors"
                >
                  Criar
                </button>
                <button
                  onClick={() => setShowNewCardModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Brello;