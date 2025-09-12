'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
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
  isShared?: boolean;
  sharedWith?: string[];
  imobiliariaId?: string;
}

const Brello = () => {
  const { currentUser, userData } = useAuth();
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'board' | 'column' | 'card' | null>(null);
  const [deleteId, setDeleteId] = useState('');
  const [deleteTitle, setDeleteTitle] = useState('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BrelloCard | null>(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<BrelloColumn | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetBoardId, setTargetBoardId] = useState('');
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<BrelloBoard | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [comments, setComments] = useState<Array<{id: string, text: string, author: string, createdAt: any, replies?: Array<{id: string, text: string, author: string, createdAt: any}>}>>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [attachments, setAttachments] = useState<Array<{id: string, name: string, url: string, type: string, size: number}>>([]);
  const [uploading, setUploading] = useState(false);

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

  // Carregar membros da equipe
  useEffect(() => {
    console.log('useEffect membros - currentUser:', currentUser);
    console.log('useEffect membros - userData:', userData);
    console.log('userData?.imobiliariaId:', userData?.imobiliariaId);
    
    // Aguardar o userData ser carregado
    if (!currentUser) {
      console.log('currentUser não está disponível');
      return;
    }
    
    if (!userData) {
      console.log('userData ainda não foi carregado');
      return;
    }
    
    if (!userData.imobiliariaId) {
      console.log('userData não tem imobiliariaId:', userData);
      return;
    }

    const loadTeamMembers = async () => {
      try {
        console.log('Carregando membros da imobiliária:', userData.imobiliariaId);
        
        // Primeiro, vamos ver todos os usuários para debug
        const allUsersQuery = query(collection(db, 'usuarios'));
        const allUsersSnapshot = await getDocs(allUsersQuery);
        console.log('Total de usuários na coleção:', allUsersSnapshot.docs.length);
        
        allUsersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`Usuário ${doc.id}:`, data);
        });
        
        // Buscar usuários da mesma imobiliária
        const usersQuery = query(
          collection(db, 'usuarios'),
          where('imobiliariaId', '==', userData.imobiliariaId)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        console.log('Snapshot de usuários com imobiliariaId:', usersSnapshot.docs.length);
        
        const members = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Dados do usuário:', data);
          return {
            id: doc.id,
            name: data.nome || data.name || 'Sem nome',
            email: data.email || 'Sem email',
            ...data
          };
        });

        console.log('Membros encontrados:', members);
        const filteredMembers = members.filter(member => member.id !== currentUser.uid);
        console.log('Membros filtrados:', filteredMembers);
        setTeamMembers(filteredMembers);
      } catch (error) {
        console.error('Erro ao carregar membros da equipe:', error);
      }
    };

    loadTeamMembers();
  }, [currentUser, userData]);

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

    // Se for uma coluna sendo arrastada (source.droppableId é "columns")
    if (source.droppableId === 'columns') {
      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(source.index, 1);
      reorderedColumns.splice(destination.index, 0, movedColumn);

      // Atualizar ordem de todas as colunas
      for (let i = 0; i < reorderedColumns.length; i++) {
        await updateDoc(doc(db, 'brelloColumns', reorderedColumns[i].id), {
          order: i
        });
      }
      return;
    }

    // Se moveu entre colunas (card)
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

  const confirmDelete = (type: 'board' | 'column' | 'card', id: string, title: string) => {
    setDeleteType(type);
    setDeleteId(id);
    setDeleteTitle(title);
    setShowDeleteModal(true);
  };

  const openCardModal = (card: BrelloCard) => {
    setSelectedCard(card);
    setNewDescription(card.description || '');
    setNewTitle(card.title);
    setEditingDescription(false);
    setEditingTitle(false);
    setShowCardModal(true);
    loadComments(card.id);
    loadAttachments(card.id);
  };

  const loadComments = async (cardId: string) => {
    // Por enquanto, vamos simular comentários
    // Depois pode ser implementado com Firebase
    setComments([]);
  };

  const loadAttachments = async (cardId: string) => {
    // Por enquanto, vamos simular anexos
    // Depois pode ser implementado com Firebase
    setAttachments([]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCard || !currentUser) return;

    setUploading(true);
    try {
      // Criar referência no Firebase Storage
      const fileRef = ref(storage, `brello-attachments/${selectedCard.id}/${Date.now()}-${file.name}`);
      
      // Upload do arquivo
      await uploadBytes(fileRef, file);
      
      // Obter URL de download
      const downloadURL = await getDownloadURL(fileRef);
      
      // Salvar informações do anexo no Firestore
      const attachmentData = {
        name: file.name,
        url: downloadURL,
        type: file.type,
        size: file.size,
        cardId: selectedCard.id,
        uploadedBy: currentUser.uid,
        uploadedAt: new Date()
      };

      await addDoc(collection(db, 'brelloAttachments'), attachmentData);
      
      // Atualizar estado local
      setAttachments([...attachments, {
        id: Date.now().toString(),
        name: file.name,
        url: downloadURL,
        type: file.type,
        size: file.size
      }]);
      
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (attachmentId: string, fileName: string) => {
    try {
      // Deletar do Firestore
      await deleteDoc(doc(db, 'brelloAttachments', attachmentId));
      
      // Deletar do Storage
      const fileRef = ref(storage, `brello-attachments/${selectedCard?.id}/${fileName}`);
      await deleteObject(fileRef);
      
      // Atualizar estado local
      setAttachments(attachments.filter(att => att.id !== attachmentId));
    } catch (error) {
      console.error('Erro ao deletar anexo:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📈';
    return '📎';
  };

  const saveDescription = async () => {
    if (!selectedCard) return;

    try {
      await updateDoc(doc(db, 'brelloCards', selectedCard.id), {
        description: newDescription
      });
      
      setSelectedCard({...selectedCard, description: newDescription});
      setEditingDescription(false);
    } catch (error) {
      console.error('Erro ao salvar descrição:', error);
    }
  };

  const saveTitle = async () => {
    if (!selectedCard) return;

    try {
      await updateDoc(doc(db, 'brelloCards', selectedCard.id), {
        title: newTitle
      });
      
      setSelectedCard({...selectedCard, title: newTitle});
      setEditingTitle(false);
    } catch (error) {
      console.error('Erro ao salvar título:', error);
    }
  };

  const addComment = async () => {
    if (!selectedCard || !newComment.trim() || !currentUser) return;

    try {
      const commentData = {
        text: newComment.trim(),
        author: currentUser.email?.split('@')[0] || 'Usuário',
        createdAt: new Date(),
        cardId: selectedCard.id
      };

      await addDoc(collection(db, 'brelloComments'), commentData);
      
      setComments([...comments, {
        id: Date.now().toString(),
        text: newComment.trim(),
        author: currentUser.email?.split('@')[0] || 'Usuário',
        createdAt: new Date(),
        replies: []
      }]);
      
      setNewComment('');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    }
  };

  const addReply = async (commentId: string) => {
    if (!replyText.trim() || !currentUser) return;

    try {
      const replyData = {
        text: replyText.trim(),
        author: currentUser.email?.split('@')[0] || 'Usuário',
        createdAt: new Date(),
        commentId: commentId
      };

      await addDoc(collection(db, 'brelloReplies'), replyData);
      
      setComments(comments.map(comment => 
        comment.id === commentId 
          ? {
              ...comment,
              replies: [
                ...(comment.replies || []),
                {
                  id: Date.now().toString(),
                  text: replyText.trim(),
                  author: currentUser.email?.split('@')[0] || 'Usuário',
                  createdAt: new Date()
                }
              ]
            }
          : comment
      ));
      
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Erro ao adicionar resposta:', error);
    }
  };

  const openColumnMenu = (column: BrelloColumn) => {
    setSelectedColumn(column);
    setShowColumnMenu(true);
  };

  const openBoardMenu = (board: BrelloBoard) => {
    setSelectedBoard(board);
    setShowBoardMenu(true);
  };

  const shareBoard = async () => {
    if (!selectedBoard || !currentUser || selectedMembers.length === 0) return;

    try {
      const boardRef = doc(db, 'brelloBoards', selectedBoard.id);
      await updateDoc(boardRef, {
        isShared: true,
        sharedWith: selectedMembers,
        imobiliariaId: userData?.imobiliariaId
      });

      setShowShareModal(false);
      setSelectedMembers([]);
      alert('Board compartilhado com sucesso!');
    } catch (error) {
      console.error('Erro ao compartilhar board:', error);
      alert('Erro ao compartilhar board');
    }
  };

  const copyColumnToBoard = async () => {
    if (!selectedColumn || !targetBoardId) return;

    try {
      // Criar nova coluna no board de destino
      const newColumnData = {
        title: selectedColumn.title,
        boardId: targetBoardId,
        order: 0,
        createdAt: new Date()
      };

      const newColumnRef = await addDoc(collection(db, 'brelloColumns'), newColumnData);

      // Copiar todos os cards da coluna
      const columnCards = cards.filter(card => card.columnId === selectedColumn.id);
      for (const card of columnCards) {
        await addDoc(collection(db, 'brelloCards'), {
          title: card.title,
          description: card.description,
          columnId: newColumnRef.id,
          order: card.order,
          createdAt: new Date()
        });
      }

      setShowCopyModal(false);
      setShowColumnMenu(false);
      setSelectedColumn(null);
      setTargetBoardId('');
    } catch (error) {
      console.error('Erro ao copiar coluna:', error);
    }
  };

  const moveColumnToBoard = async () => {
    if (!selectedColumn || !targetBoardId) return;

    try {
      // Atualizar coluna para o novo board
      await updateDoc(doc(db, 'brelloColumns', selectedColumn.id), {
        boardId: targetBoardId
      });

      // Atualizar todos os cards da coluna
      const columnCards = cards.filter(card => card.columnId === selectedColumn.id);
      for (const card of columnCards) {
        await updateDoc(doc(db, 'brelloCards', card.id), {
          columnId: selectedColumn.id
        });
      }

      setShowMoveModal(false);
      setShowColumnMenu(false);
      setSelectedColumn(null);
      setTargetBoardId('');
    } catch (error) {
      console.error('Erro ao mover coluna:', error);
    }
  };

  const executeDelete = async () => {
    if (!deleteType || !deleteId) return;

    try {
      if (deleteType === 'board') {
        await deleteBoard(deleteId);
      } else if (deleteType === 'column') {
        await deleteColumn(deleteId);
      } else if (deleteType === 'card') {
        await deleteCard(deleteId);
      }
      
      setShowDeleteModal(false);
      setDeleteType(null);
      setDeleteId('');
      setDeleteTitle('');
    } catch (error) {
      console.error('Erro ao deletar:', error);
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
    <div className="min-h-screen bg-[#0F0F23] p-4 sm:p-6 lg:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white">Brello</h1>
          <button
            onClick={() => setShowNewBoardModal(true)}
            className="bg-[#6366F1] hover:bg-[#5855EB] text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Novo Board
          </button>
          <p className="text-gray-400 ml-auto">Organize suas tarefas com estilo</p>
        </div>

        {/* Boards List */}
        {boards.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Seus Boards</h2>
            <div className="flex gap-4 flex-wrap">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className={`p-4 rounded-lg cursor-pointer transition-colors relative ${
                    currentBoard?.id === board.id
                      ? board.isShared 
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black'
                        : 'bg-[#6366F1] text-white'
                      : board.isShared
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400'
                        : 'bg-[#23283A] text-gray-300 hover:bg-[#2A2F42]'
                  }`}
                  onClick={() => setCurrentBoard(board)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{board.title}</span>
                      {board.isShared && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                          Compartilhado
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openBoardMenu(board);
                      }}
                      className={`ml-2 p-1 ${
                        board.isShared 
                          ? 'text-yellow-800 hover:text-yellow-900' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      ⋯
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
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white">{currentBoard.title}</h2>
              <button
                onClick={() => setShowNewColumnModal(true)}
                className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Nova Coluna
              </button>
              <button
                onClick={() => setShowNewCardModal(true)}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Novo Card
              </button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="columns" direction="horizontal" type="COLUMN">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex gap-6 overflow-x-auto pb-4"
                  >
                    {columns.map((column, columnIndex) => {
                      const columnCards = cards
                        .filter(card => card.columnId === column.id)
                        .sort((a, b) => a.order - b.order);

                      return (
                        <Draggable key={column.id} draggableId={column.id} index={columnIndex}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex-shrink-0 w-80"
                            >
                              <div
                                {...provided.dragHandleProps}
                                className={`bg-[#23283A] rounded-lg p-4 min-h-[500px] cursor-move transition-all ${
                                  snapshot.isDragging ? 'shadow-lg transform rotate-1' : 'hover:shadow-md'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-4">
                                  <h3 className="text-lg font-semibold text-white">{column.title}</h3>
                                  <div className="relative">
                                    <button
                                      onClick={() => openColumnMenu(column)}
                                      className="text-gray-400 hover:text-white text-xl font-bold"
                                    >
                                      ⋯
                                    </button>
                                  </div>
                                </div>

                                <Droppable droppableId={column.id} type="CARD">
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`space-y-3 min-h-[400px] ${
                                        snapshot.isDraggingOver ? 'bg-[#2A2F42] rounded-lg' : ''
                                      }`}
                                    >
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
                                              <div 
                                                className="flex justify-between items-start cursor-pointer"
                                                onClick={() => openCardModal(card)}
                                              >
                                                <h4 className="text-white font-medium whitespace-pre-wrap break-words flex-1">{card.title}</h4>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    confirmDelete('card', card.id, card.title);
                                                  }}
                                                  className="text-red-400 hover:text-red-300 text-sm flex-shrink-0 ml-2"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      ))}
                                      {/* Botão + para adicionar card */}
                                      <button
                                        onClick={() => {
                                          setSelectedColumnId(column.id);
                                          setShowNewCardModal(true);
                                        }}
                                        className="w-full mt-3 p-3 bg-[#181C23] hover:bg-[#2A2F42] text-gray-400 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                      >
                                        <span className="text-xl">+</span>
                                        <span>Adicionar card</span>
                                      </button>
                                      
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
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

        {/* Menu da Coluna */}
        {showColumnMenu && selectedColumn && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#23283A] rounded-lg p-6 w-80">
              <h3 className="text-xl font-semibold text-white mb-4">Opções da Coluna</h3>
              <p className="text-gray-300 mb-6">"{selectedColumn.title}"</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowColumnMenu(false);
                    setShowCopyModal(true);
                  }}
                  className="w-full bg-[#6366F1] hover:bg-[#5855EB] text-white py-3 rounded-lg transition-colors text-left px-4"
                >
                  📋 Copiar para outro Board
                </button>
                <button
                  onClick={() => {
                    setShowColumnMenu(false);
                    setShowMoveModal(true);
                  }}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-white py-3 rounded-lg transition-colors text-left px-4"
                >
                  📦 Mover para outro Board
                </button>
                <button
                  onClick={() => {
                    setShowColumnMenu(false);
                    confirmDelete('column', selectedColumn.id, selectedColumn.title);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors text-left px-4"
                >
                  🗑️ Excluir Coluna
                </button>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowColumnMenu(false);
                    setSelectedColumn(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Menu do Board */}
        {showBoardMenu && selectedBoard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#23283A] rounded-lg p-6 w-80">
              <h3 className="text-xl font-semibold text-white mb-4">Opções do Board</h3>
              <p className="text-gray-300 mb-6">"{selectedBoard.title}"</p>
              
              <div className="space-y-3">
                {selectedBoard.userId === currentUser?.uid && (
                  <button
                    onClick={() => {
                      setShowBoardMenu(false);
                      setShowShareModal(true);
                    }}
                    className="w-full bg-[#6366F1] hover:bg-[#5855EB] text-white py-3 rounded-lg transition-colors text-left px-4"
                  >
                    👥 Compartilhar Board
                  </button>
                )}
                {selectedBoard.userId === currentUser?.uid && (
                  <button
                    onClick={() => {
                      setShowBoardMenu(false);
                      confirmDelete('board', selectedBoard.id, selectedBoard.title);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors text-left px-4"
                  >
                    🗑️ Excluir Board
                  </button>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowBoardMenu(false);
                    setSelectedBoard(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Copiar Coluna */}
        {showCopyModal && selectedColumn && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#23283A] rounded-lg p-6 w-96">
              <h3 className="text-xl font-semibold text-white mb-4">Copiar Coluna</h3>
              <p className="text-gray-300 mb-4">Copiar "{selectedColumn.title}" para qual board?</p>
              
              <select
                value={targetBoardId}
                onChange={(e) => setTargetBoardId(e.target.value)}
                className="w-full p-3 bg-[#181C23] text-white rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              >
                <option value="">Selecione um board</option>
                {boards.filter(board => board.id !== currentBoard?.id).map(board => (
                  <option key={board.id} value={board.id}>{board.title}</option>
                ))}
              </select>
              
              <div className="flex gap-3">
                <button
                  onClick={copyColumnToBoard}
                  disabled={!targetBoardId}
                  className="flex-1 bg-[#6366F1] hover:bg-[#5855EB] disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
                >
                  Copiar
                </button>
                <button
                  onClick={() => {
                    setShowCopyModal(false);
                    setTargetBoardId('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Compartilhar Board */}
        {showShareModal && selectedBoard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#23283A] rounded-lg p-6 w-96">
              <h3 className="text-xl font-semibold text-white mb-4">Compartilhar Board</h3>
              <p className="text-gray-300 mb-4">Selecione os membros da equipe para compartilhar "{selectedBoard.title}"</p>
              
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <label key={member.id} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, member.id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                          }
                        }}
                        className="w-4 h-4 text-[#6366F1] bg-gray-700 border-gray-600 rounded focus:ring-[#6366F1] focus:ring-2"
                      />
                      <div>
                        <div className="text-white font-medium">{member.name}</div>
                        <div className="text-gray-400 text-sm">{member.email}</div>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">Nenhum membro da equipe encontrado</div>
                    <div className="text-gray-500 text-sm">
                      Verifique se você está vinculado a uma imobiliária
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={shareBoard}
                  disabled={selectedMembers.length === 0}
                  className="flex-1 bg-[#6366F1] hover:bg-[#5855EB] disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
                >
                  Compartilhar ({selectedMembers.length})
                </button>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setSelectedMembers([]);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Mover Coluna */}
        {showMoveModal && selectedColumn && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#23283A] rounded-lg p-6 w-96">
              <h3 className="text-xl font-semibold text-white mb-4">Mover Coluna</h3>
              <p className="text-gray-300 mb-4">Mover "{selectedColumn.title}" para qual board?</p>
              
              <select
                value={targetBoardId}
                onChange={(e) => setTargetBoardId(e.target.value)}
                className="w-full p-3 bg-[#181C23] text-white rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              >
                <option value="">Selecione um board</option>
                {boards.filter(board => board.id !== currentBoard?.id).map(board => (
                  <option key={board.id} value={board.id}>{board.title}</option>
                ))}
              </select>
              
              <div className="flex gap-3">
                <button
                  onClick={moveColumnToBoard}
                  disabled={!targetBoardId}
                  className="flex-1 bg-[#10B981] hover:bg-[#059669] disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
                >
                  Mover
                </button>
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setTargetBoardId('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal do Card - Layout Trello */}
        {showCardModal && selectedCard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#23283A] rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#6366F1] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">📋</span>
                  </div>
                  {editingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="text-2xl font-bold bg-transparent text-white border-b-2 border-[#6366F1] focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={saveTitle}
                        className="text-green-400 hover:text-green-300 text-lg"
                        title="Salvar"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setEditingTitle(false);
                          setNewTitle(selectedCard.title);
                        }}
                        className="text-red-400 hover:text-red-300 text-lg"
                        title="Cancelar"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold text-white">{selectedCard.title}</h3>
                      <button
                        onClick={() => setEditingTitle(true)}
                        className="text-gray-400 hover:text-white text-lg"
                        title="Editar título"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowCardModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - Card Details */}
                <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-600">
                  <div className="space-y-6">
                    {/* Descrição */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                          <span>≡</span> Descrição
                        </h4>
                        <div className="flex items-center gap-3">
                          {!editingDescription && (
                            <>
                              <input
                                type="file"
                                id="file-upload"
                                onChange={handleFileUpload}
                                className="hidden"
                                accept="*/*"
                                disabled={uploading}
                              />
                              <label htmlFor="file-upload" className="cursor-pointer">
                                <span className="text-gray-400 hover:text-white text-lg">📎</span>
                              </label>
                              <label htmlFor="file-upload" className="cursor-pointer">
                                <span className="text-gray-400 hover:text-white text-sm">
                                  {uploading ? 'Enviando...' : 'Anexar'}
                                </span>
                              </label>
                              <button
                                onClick={() => setEditingDescription(true)}
                                className="text-[#6366F1] hover:text-[#5855EB] text-sm font-medium"
                              >
                                Editar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {editingDescription ? (
                        <div className="space-y-3">
                          <textarea
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            className="w-full p-3 bg-[#181C23] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] min-h-[100px] resize-none"
                            placeholder="Adicione uma descrição mais detalhada..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveDescription}
                              className="bg-[#6366F1] hover:bg-[#5855EB] text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => {
                                setEditingDescription(false);
                                setNewDescription(selectedCard.description || '');
                              }}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#181C23] p-4 rounded-lg">
                          {selectedCard.description ? (
                            <p className="text-gray-300 whitespace-pre-wrap break-words">
                              {selectedCard.description}
                            </p>
                          ) : (
                            <p className="text-gray-500 italic">
                              Nenhuma descrição adicionada
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Anexos */}
                    {attachments.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <span>📎</span> Anexos
                        </h4>
                        <div className="space-y-2">
                          {attachments.map((attachment) => (
                            <div key={attachment.id} className="bg-[#181C23] p-3 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{getFileIcon(attachment.type)}</span>
                                <div>
                                  <p className="text-white text-sm font-medium">{attachment.name}</p>
                                  <p className="text-gray-400 text-xs">{formatFileSize(attachment.size)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#6366F1] hover:text-[#5855EB] text-sm"
                                >
                                  Abrir
                                </a>
                                <button
                                  onClick={() => deleteAttachment(attachment.id, attachment.name)}
                                  className="text-red-400 hover:text-red-300 text-sm"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex gap-3 pt-4 border-t border-gray-600">
                      <button
                        onClick={() => {
                          confirmDelete('card', selectedCard.id, selectedCard.title);
                          setShowCardModal(false);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Excluir Card
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Comments */}
                <div className="w-1/2 p-6 overflow-y-auto">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-white">Comentários e atividade</h4>
                  </div>

                  {/* Comment Input */}
                  <div className="mb-6">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escrever um comentário..."
                      className="w-full p-3 bg-[#181C23] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] resize-none min-h-[80px]"
                    />
                    <button
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="mt-2 bg-[#6366F1] hover:bg-[#5855EB] disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Comentar
                    </button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-[#181C23] p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-[#6366F1] rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {comment.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-sm">{comment.author}</span>
                              <span className="text-gray-400 text-xs">
                                {comment.createdAt.toLocaleDateString('pt-BR')} {comment.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm">{comment.text}</p>
                            <button 
                              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                              className="text-[#6366F1] hover:text-[#5855EB] text-xs mt-2"
                            >
                              Responder
                            </button>
                            
                            {/* Reply Input */}
                            {replyingTo === comment.id && (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Escrever uma resposta..."
                                  className="w-full p-2 bg-[#0F0F23] text-white rounded text-sm resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => addReply(comment.id)}
                                    disabled={!replyText.trim()}
                                    className="bg-[#6366F1] hover:bg-[#5855EB] disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs transition-colors"
                                  >
                                    Responder
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText('');
                                    }}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="bg-[#0F0F23] p-3 rounded-lg ml-4">
                                    <div className="flex items-start gap-2">
                                      <div className="w-6 h-6 bg-[#10B981] rounded-full flex items-center justify-center text-white text-xs font-bold">
                                        {reply.author.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-white font-medium text-xs">{reply.author}</span>
                                          <span className="text-gray-400 text-xs">
                                            {reply.createdAt.toLocaleDateString('pt-BR')} {reply.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                        <p className="text-gray-300 text-xs">{reply.text}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#23283A] rounded-lg p-6 w-96">
              <h3 className="text-xl font-semibold text-white mb-4">
                Confirmar Exclusão
              </h3>
              <p className="text-gray-300 mb-6">
                Tem certeza que deseja excluir{' '}
                {deleteType === 'board' && 'o board'}
                {deleteType === 'column' && 'a coluna'}
                {deleteType === 'card' && 'o card'}{' '}
                <span className="font-semibold text-white">"{deleteTitle}"</span>?
                {deleteType === 'board' && ' Todos os dados serão perdidos permanentemente.'}
                {deleteType === 'column' && ' Todos os cards desta coluna serão excluídos.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={executeDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
                >
                  Excluir
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteType(null);
                    setDeleteId('');
                    setDeleteTitle('');
                  }}
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