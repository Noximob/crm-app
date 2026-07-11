'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { DEMO_BRELLO_BOARDS, DEMO_BRELLO_BOARD_ID, DEMO_BRELLO_COLUMNS, DEMO_BRELLO_CARDS } from '@/lib/espelho/demoData';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';

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

const GX_COLUMN_COLORS = ['#FFE9A6', '#E8C547', '#D4A017', '#F59E0B', '#FF7A45', '#FF1E56'];

const Brello = () => {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
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

    if (isEspelhoDemo) {
      setBoards(DEMO_BRELLO_BOARDS as BrelloBoard[]);
      if (DEMO_BRELLO_BOARDS.length > 0) {
        setCurrentBoard(DEMO_BRELLO_BOARDS[0] as BrelloBoard);
      }
      setLoading(false);
      return;
    }

    // Buscar boards próprios e compartilhados
    const ownBoardsQuery = query(
      collection(db, 'brelloBoards'),
      where('userId', '==', currentUser.uid)
    );

    const sharedBoardsQuery = query(
      collection(db, 'brelloBoards'),
      where('sharedWith', 'array-contains', currentUser.uid)
    );

    const loadBoards = async () => {
      try {
        // Buscar boards próprios
        const ownBoardsSnapshot = await getDocs(ownBoardsQuery);
        const ownBoards = ownBoardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BrelloBoard[];

        // Buscar boards compartilhados
        const sharedBoardsSnapshot = await getDocs(sharedBoardsQuery);
        const sharedBoards = sharedBoardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BrelloBoard[];

        // Combinar e remover duplicatas
        const allBoards = [...ownBoards, ...sharedBoards];
        const uniqueBoards = allBoards.filter((board, index, self) => 
          index === self.findIndex(b => b.id === board.id)
        );
        
        // Ordenar localmente por data de criação (mais recente primeiro)
        uniqueBoards.sort((a, b) => {
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return bDate.getTime() - aDate.getTime();
        });
        
        setBoards(uniqueBoards);

        // Selecionar o primeiro board se não houver nenhum selecionado
        if (uniqueBoards.length > 0 && !currentBoard) {
          setCurrentBoard(uniqueBoards[0]);
        }
      } catch (error) {
        console.error('Erro ao carregar boards:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBoards();
  }, [currentUser]);

  // Carregar membros da equipe
  useEffect(() => {
    // Aguardar o userData ser carregado
    if (!currentUser || !userData || !userData.imobiliariaId) {
      return;
    }

    const loadTeamMembers = async () => {
      try {
        // Buscar usuários da mesma imobiliária
        const usersQuery = query(
          collection(db, 'usuarios'),
          where('imobiliariaId', '==', userData.imobiliariaId)
        );

        const usersSnapshot = await getDocs(usersQuery);

        const members = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.nome || data.name || 'Sem nome',
            email: data.email || 'Sem email',
            ...data
          };
        });

        const filteredMembers = members.filter(member => member.id !== currentUser.uid);
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

    if (isEspelhoDemo && currentBoard.id === DEMO_BRELLO_BOARD_ID) {
      setColumns(DEMO_BRELLO_COLUMNS as BrelloColumn[]);
      return;
    }

    const q = query(
      collection(db, 'brelloColumns'),
      where('boardId', '==', currentBoard.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const columnsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BrelloColumn[];

      // Ordenar localmente por ordem
      columnsData.sort((a, b) => (a.order || 0) - (b.order || 0));

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

    if (isEspelhoDemo && currentBoard.id === DEMO_BRELLO_BOARD_ID) {
      setCards(DEMO_BRELLO_CARDS as BrelloCard[]);
      return;
    }

    const columnIds = columns.map(col => col.id);
    if (columnIds.length === 0) return;

    const q = query(
      collection(db, 'brelloCards'),
      where('columnId', 'in', columnIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BrelloCard[];

      // Ordenar localmente por ordem
      cardsData.sort((a, b) => (a.order || 0) - (b.order || 0));

      setCards(cardsData);
    }, (error) => {
      console.error('Erro ao carregar cards:', error);
    });

    return () => unsubscribe();
  }, [currentBoard?.id, columns.length]);

  const createBoard = async () => {
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
    if (!currentUser || !newBoardTitle.trim()) return;

    try {
      const boardData = {
        title: newBoardTitle.trim(),
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'brelloBoards'), boardData);

      // Criar coluna padrão "To Do"
      await addDoc(collection(db, 'brelloColumns'), {
        title: 'To Do',
        boardId: docRef.id,
        order: 0,
        createdAt: serverTimestamp()
      });

      setNewBoardTitle('');
      setShowNewBoardModal(false);
    } catch (error) {
      console.error('Erro ao criar board:', error);
    }
  };

  const createColumn = async () => {
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
    if (!currentBoard || !newColumnTitle.trim()) return;

    try {
      const columnData = {
        title: newColumnTitle.trim(),
        boardId: currentBoard.id,
        order: columns.length,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'brelloColumns'), columnData);

      setNewColumnTitle('');
      setShowNewColumnModal(false);
    } catch (error) {
      console.error('Erro ao criar coluna:', error);
    }
  };

  const createCard = async () => {
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
    if (!selectedColumnId || !newCardTitle.trim()) return;

    try {
      const cardData = {
        title: newCardTitle.trim(),
        description: newCardDescription.trim(),
        columnId: selectedColumnId,
        order: cards.filter(card => card.columnId === selectedColumnId).length,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'brelloCards'), cardData);

      setNewCardTitle('');
      setNewCardDescription('');
      setSelectedColumnId('');
      setShowNewCardModal(false);
    } catch (error) {
      console.error('Erro ao criar card:', error);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
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
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
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
        uploadedAt: serverTimestamp()
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
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
    if (!(await confirmDialog({ message: `Tem certeza que deseja excluir o anexo "${fileName}"? Esta ação não pode ser desfeita.`, danger: true, confirmLabel: 'Excluir' }))) return;
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
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
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
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
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
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
    if (!selectedCard || !newComment.trim() || !currentUser) return;

    try {
      const commentData = {
        text: newComment.trim(),
        author: currentUser.email?.split('@')[0] || 'Usuário',
        createdAt: serverTimestamp(),
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
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
    if (!replyText.trim() || !currentUser) return;

    try {
      const replyData = {
        text: replyText.trim(),
        author: currentUser.email?.split('@')[0] || 'Usuário',
        createdAt: serverTimestamp(),
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

  const openShareModal = (board: BrelloBoard) => {
    setSelectedBoard(board);
    setSelectedMembers(board.sharedWith || []);
    setShowShareModal(true);
  };

  const shareBoard = async () => {
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
    if (!selectedBoard || !currentUser) return;

    try {
      const boardRef = doc(db, 'brelloBoards', selectedBoard.id);
      
      if (selectedMembers.length === 0) {
        // Se não há membros selecionados, remover compartilhamento
        await updateDoc(boardRef, {
          isShared: false,
          sharedWith: [],
          imobiliariaId: userData?.imobiliariaId
        });
        
        // Atualizar estado local
        setBoards(prevBoards => 
          prevBoards.map(board => 
            board.id === selectedBoard.id 
              ? { ...board, isShared: false, sharedWith: [] }
              : board
          )
        );
        
        // Atualizar board atual se for o mesmo
        if (currentBoard?.id === selectedBoard.id) {
          setCurrentBoard(prev => prev ? { ...prev, isShared: false, sharedWith: [] } : null);
        }
        
        showToast('Compartilhamento removido!', 'success');
      } else {
        // Se há membros selecionados, atualizar compartilhamento
        await updateDoc(boardRef, {
          isShared: true,
          sharedWith: selectedMembers,
          imobiliariaId: userData?.imobiliariaId
        });
        
        // Atualizar estado local
        setBoards(prevBoards => 
          prevBoards.map(board => 
            board.id === selectedBoard.id 
              ? { ...board, isShared: true, sharedWith: selectedMembers }
              : board
          )
        );
        
        // Atualizar board atual se for o mesmo
        if (currentBoard?.id === selectedBoard.id) {
          setCurrentBoard(prev => prev ? { ...prev, isShared: true, sharedWith: selectedMembers } : null);
        }
        
        showToast('Board compartilhado com sucesso!', 'success');
      }

      setShowShareModal(false);
      setSelectedMembers([]);
    } catch (error) {
      console.error('Erro ao compartilhar board:', error);
      showToast('Erro ao compartilhar board', 'error');
    }
  };

  const copyColumnToBoard = async () => {
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
    if (!selectedColumn || !targetBoardId) return;

    try {
      // Criar nova coluna no board de destino
      const newColumnData = {
        title: selectedColumn.title,
        boardId: targetBoardId,
        order: 0,
        createdAt: serverTimestamp()
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
          createdAt: serverTimestamp()
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
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
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
    if (isEspelhoDemo) { showToast('Modo demonstração — alterações não são salvas.', 'info'); return; }
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
      <div className="min-h-full flex items-center justify-center">
        <LoadingState label="Carregando Brello..." />
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <h1 className="al-display text-2xl font-bold text-white uppercase tracking-[0.14em]">Brello</h1>
          <button
            onClick={() => setShowNewBoardModal(true)}
            className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-4 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
          >
            + Novo Board
          </button>
          <p className="text-text-secondary ml-auto">Organize suas tarefas com estilo</p>
        </div>

        {/* Boards List */}
        {boards.length > 0 && (
          <div className="mb-6">
            <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Seus Boards</h2>
            <div className="flex gap-4 flex-wrap">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className={`p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 relative border ${
                    currentBoard?.id === board.id
                      ? board.isShared
                        ? 'bg-gradient-to-r from-[#E8C547] to-[#C89210] border-[#E8C547]/60 text-[#181203] shadow-[0_8px_24px_-8px_rgba(232,197,71,0.5)]'
                        : 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] border-[#FF1E56]/60 text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                      : board.isShared
                        ? 'bg-[#E8C547]/10 border-[#E8C547]/35 text-[#FFE9A6] hover:bg-[#E8C547]/20'
                        : 'bg-white/[0.03] border-white/[0.08] text-text-secondary hover:bg-white/[0.06] hover:text-white'
                  }`}
                  onClick={() => setCurrentBoard(board)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{board.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openBoardMenu(board);
                      }}
                      className={`ml-2 p-1 transition-colors ${
                        board.isShared
                          ? currentBoard?.id === board.id
                            ? 'text-[#181203]/70 hover:text-[#181203]'
                            : 'text-[#FFE9A6]/70 hover:text-[#FFE9A6]'
                          : 'text-text-secondary hover:text-[#FF5C7E]'
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

        {/* Kanban Board — sem fundo preto, só colunas e cards; background do app aparece */}
        {currentBoard && (
          <div className="rounded-xl p-6 border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="al-display text-lg font-bold text-white uppercase tracking-[0.14em]">{currentBoard.title}</h2>
              <button
                onClick={() => setShowNewColumnModal(true)}
                className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl px-4 py-2 transition-colors"
              >
                + Nova Coluna
              </button>
              <button
                onClick={() => setShowNewCardModal(true)}
                className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-4 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
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
                      const gxColor = GX_COLUMN_COLORS[columnIndex % GX_COLUMN_COLORS.length];

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
                                className={`al-card relative overflow-hidden rounded-xl p-4 min-h-[500px] cursor-move transition-all ${
                                  snapshot.isDragging ? 'shadow-[0_24px_48px_-16px_rgba(0,0,0,0.8)] transform rotate-1' : ''
                                }`}
                              >
                                <div
                                  className="absolute inset-x-0 top-0 h-[2px]"
                                  style={{ backgroundColor: gxColor, boxShadow: `0 0 12px ${gxColor}` }}
                                />
                                <div className="flex justify-between items-center mb-4">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.14em] truncate">{column.title}</h3>
                                    <span className="bg-white/[0.06] rounded-full px-2 text-[11px] tabular-nums text-text-secondary flex-shrink-0">{columnCards.length}</span>
                                  </div>
                                  <div className="relative">
                                    <button
                                      onClick={() => openColumnMenu(column)}
                                      className="text-text-secondary hover:text-[#FF5C7E] text-xl font-bold transition-colors"
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
                                        snapshot.isDraggingOver ? 'bg-[#FF1E56]/[0.05] rounded-xl' : ''
                                      }`}
                                    >
                                      {columnCards.map((card, index) => (
                                        <Draggable key={card.id} draggableId={card.id} index={index}>
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className={`relative overflow-hidden bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 pl-4 cursor-grab transition-all ${
                                                snapshot.isDragging ? 'shadow-[0_16px_32px_-12px_rgba(255,30,86,0.35)] transform rotate-2 border-[#FF1E56]/40' : 'hover:border-[#FF1E56]/40 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(255,30,86,0.35)]'
                                              }`}
                                            >
                                              <span
                                                className="pointer-events-none absolute inset-y-0 left-0 w-[2px]"
                                                style={{ backgroundColor: gxColor }}
                                              />
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
                                                  className="text-text-secondary hover:text-[#FF5C7E] text-sm flex-shrink-0 ml-2 transition-colors"
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
                                        className="w-full mt-3 p-3 bg-white/[0.02] hover:bg-[#FF1E56]/[0.07] text-text-secondary hover:text-[#FF7A97] rounded-xl transition-colors flex items-center justify-center gap-2 border border-dashed border-white/15 hover:border-[#FF1E56]/40"
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-96">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Novo Board</h3>
              <input
                type="text"
                placeholder="Nome do board"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 mb-4 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={createBoard}
                  className="flex-1 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold py-2 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                >
                  Criar
                </button>
                <button
                  onClick={() => setShowNewBoardModal(false)}
                  className="flex-1 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewColumnModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-96">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Nova Coluna</h3>
              <input
                type="text"
                placeholder="Nome da coluna"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 mb-4 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={createColumn}
                  className="flex-1 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold py-2 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                >
                  Criar
                </button>
                <button
                  onClick={() => setShowNewColumnModal(false)}
                  className="flex-1 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewCardModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-96">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Novo Card</h3>
              <select
                value={selectedColumnId}
                onChange={(e) => setSelectedColumnId(e.target.value)}
                className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 mb-4 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
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
                className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 mb-4 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
              />
              <textarea
                placeholder="Descrição (opcional)"
                value={newCardDescription}
                onChange={(e) => setNewCardDescription(e.target.value)}
                className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 mb-4 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 h-20 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={createCard}
                  className="flex-1 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold py-2 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                >
                  Criar
                </button>
                <button
                  onClick={() => setShowNewCardModal(false)}
                  className="flex-1 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Menu da Coluna */}
        {showColumnMenu && selectedColumn && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-80">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Opções da Coluna</h3>
              <p className="text-text-secondary mb-6">"{selectedColumn.title}"</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowColumnMenu(false);
                    setShowCopyModal(true);
                  }}
                  className="w-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-3 rounded-xl transition-colors text-left px-4"
                >
                  Copiar para outro Board
                </button>
                <button
                  onClick={() => {
                    setShowColumnMenu(false);
                    setShowMoveModal(true);
                  }}
                  className="w-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-3 rounded-xl transition-colors text-left px-4"
                >
                  Mover para outro Board
                </button>
                <button
                  onClick={() => {
                    setShowColumnMenu(false);
                    confirmDelete('column', selectedColumn.id, selectedColumn.title);
                  }}
                  className="w-full border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 py-3 rounded-xl transition-colors text-left px-4"
                >
                  Excluir Coluna
                </button>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowColumnMenu(false);
                    setSelectedColumn(null);
                  }}
                  className="flex-1 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Menu do Board */}
        {showBoardMenu && selectedBoard && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-80">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Opções do Board</h3>
              <p className="text-text-secondary mb-6">"{selectedBoard.title}"</p>
              
              <div className="space-y-3">
                {selectedBoard.userId === currentUser?.uid && (
                  <button
                    onClick={() => {
                      setShowBoardMenu(false);
                      openShareModal(selectedBoard);
                    }}
                    className="w-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-3 rounded-xl transition-colors text-left px-4"
                  >
                    Compartilhar Board
                  </button>
                )}
                {selectedBoard.userId === currentUser?.uid && (
                  <button
                    onClick={() => {
                      setShowBoardMenu(false);
                      confirmDelete('board', selectedBoard.id, selectedBoard.title);
                    }}
                    className="w-full border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 py-3 rounded-xl transition-colors text-left px-4"
                  >
                    Excluir Board
                  </button>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowBoardMenu(false);
                    setSelectedBoard(null);
                  }}
                  className="flex-1 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Copiar Coluna */}
        {showCopyModal && selectedColumn && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-96">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Copiar Coluna</h3>
              <p className="text-text-secondary mb-4">Copiar "{selectedColumn.title}" para qual board?</p>
              
              <select
                value={targetBoardId}
                onChange={(e) => setTargetBoardId(e.target.value)}
                className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 mb-4 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
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
                  className="flex-1 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                >
                  Copiar
                </button>
                <button
                  onClick={() => {
                    setShowCopyModal(false);
                    setTargetBoardId('');
                  }}
                  className="flex-1 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Compartilhar Board */}
        {showShareModal && selectedBoard && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-96">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Compartilhar Board</h3>
              <p className="text-text-secondary mb-4">Selecione os membros da equipe para compartilhar "{selectedBoard.title}"</p>
              
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
                        className="w-4 h-4 accent-[#FF1E56] bg-white/[0.06] border-white/10 rounded focus:ring-[#FF1E56]/50 focus:ring-2"
                      />
                      <div>
                        <div className="text-white font-medium">{member.name}</div>
                        <div className="text-text-secondary text-sm">{member.email}</div>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-text-secondary mb-2">Nenhum membro da equipe encontrado</div>
                    <div className="text-white/40 text-sm">
                      Verifique se você está vinculado a uma imobiliária
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={shareBoard}
                  className="flex-1 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold py-2 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                >
                  {selectedMembers.length === 0 ? 'Remover Compartilhamento' : `Compartilhar (${selectedMembers.length})`}
                </button>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setSelectedMembers([]);
                  }}
                  className="flex-1 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Mover Coluna */}
        {showMoveModal && selectedColumn && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-96">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Mover Coluna</h3>
              <p className="text-text-secondary mb-4">Mover "{selectedColumn.title}" para qual board?</p>
              
              <select
                value={targetBoardId}
                onChange={(e) => setTargetBoardId(e.target.value)}
                className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 mb-4 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
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
                  className="flex-1 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                >
                  Mover
                </button>
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setTargetBoardId('');
                  }}
                  className="flex-1 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal do Card - Layout Trello */}
        {showCardModal && selectedCard && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="absolute inset-x-0 top-0 gx-line" />
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-8 rounded-full bg-gradient-to-b from-[#FF1E56] to-[#A50D38] shadow-[0_0_12px_rgba(255,30,86,0.5)]" />
                  {editingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="text-2xl font-bold bg-transparent text-white border-b-2 border-[#FF1E56] focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={saveTitle}
                        className="text-[#34D399] hover:text-emerald-300 text-lg transition-colors"
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
                        className="text-text-secondary hover:text-[#FF5C7E] text-lg transition-colors"
                        title="Editar título"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowCardModal(false)}
                  className="text-text-secondary hover:text-[#FF5C7E] text-2xl transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - Card Details */}
                <div className="w-1/2 p-6 overflow-y-auto border-r border-white/10">
                  <div className="space-y-6">
                    {/* Descrição */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.14em] flex items-center gap-2">
                          <span className="text-[#FF5C7E]">≡</span> Descrição
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
                                <span className="text-text-secondary hover:text-white text-lg transition-colors">📎</span>
                              </label>
                              <label htmlFor="file-upload" className="cursor-pointer">
                                <span className="text-text-secondary hover:text-white text-sm transition-colors">
                                  {uploading ? 'Enviando...' : 'Anexar'}
                                </span>
                              </label>
                              <button
                                onClick={() => setEditingDescription(true)}
                                className="text-[#FF7A97] hover:text-[#FF9EB5] text-sm font-medium transition-colors"
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
                            className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 min-h-[100px] resize-none"
                            placeholder="Adicione uma descrição mais detalhada..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveDescription}
                              className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => {
                                setEditingDescription(false);
                                setNewDescription(selectedCard.description || '');
                              }}
                              className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white px-4 py-2 rounded-xl text-sm transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/[0.03] border border-white/[0.08] p-4 rounded-xl">
                          {selectedCard.description ? (
                            <p className="text-text-secondary whitespace-pre-wrap break-words">
                              {selectedCard.description}
                            </p>
                          ) : (
                            <p className="text-white/40 italic">
                              Nenhuma descrição adicionada
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Anexos */}
                    {attachments.length > 0 && (
                      <div>
                        <h4 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.14em] mb-3 flex items-center gap-2">
                          <span className="text-[#FF5C7E]">📎</span> Anexos
                        </h4>
                        <div className="space-y-2">
                          {attachments.map((attachment) => (
                            <div key={attachment.id} className="bg-white/[0.03] border border-white/[0.08] p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.05] transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{getFileIcon(attachment.type)}</span>
                                <div>
                                  <p className="text-white text-sm font-medium">{attachment.name}</p>
                                  <p className="text-text-secondary text-xs">{formatFileSize(attachment.size)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#FF7A97] hover:text-[#FF9EB5] text-sm transition-colors"
                                >
                                  Abrir
                                </a>
                                <button
                                  onClick={() => deleteAttachment(attachment.id, attachment.name)}
                                  className="text-red-400 hover:text-red-300 text-sm transition-colors"
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
                    <div className="flex gap-3 pt-4 border-t border-white/10">
                      <button
                        onClick={() => {
                          confirmDelete('card', selectedCard.id, selectedCard.title);
                          setShowCardModal(false);
                        }}
                        className="border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 px-4 py-2 rounded-xl transition-colors"
                      >
                        Excluir Card
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Comments */}
                <div className="w-1/2 p-6 overflow-y-auto">
                  <div className="mb-4">
                    <h4 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.14em]">Comentários e atividade</h4>
                  </div>

                  {/* Comment Input */}
                  <div className="mb-6">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escrever um comentário..."
                      className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 resize-none min-h-[80px]"
                    />
                    <button
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="mt-2 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-xl text-sm shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                    >
                      Comentar
                    </button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-white/[0.03] border border-white/[0.08] p-4 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#FF1E56] to-[#A50D38] rounded-full flex items-center justify-center text-white text-sm font-bold shadow-[0_0_12px_rgba(255,30,86,0.35)]">
                            {comment.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-sm">{comment.author}</span>
                              <span className="text-text-secondary text-xs">
                                {comment.createdAt.toLocaleDateString('pt-BR')} {comment.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-text-secondary text-sm">{comment.text}</p>
                            <button
                              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                              className="text-[#FF7A97] hover:text-[#FF9EB5] text-xs mt-2 transition-colors"
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
                                  className="w-full p-2 bg-white/[0.04] border border-white/10 text-white placeholder-white/30 rounded-lg text-sm resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => addReply(comment.id)}
                                    disabled={!replyText.trim()}
                                    className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-3 py-1 rounded-lg text-xs active:scale-[0.98] transition-all"
                                  >
                                    Responder
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText('');
                                    }}
                                    className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white px-3 py-1 rounded-lg text-xs transition-colors"
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
                                  <div key={reply.id} className="bg-white/[0.03] border border-white/[0.08] p-3 rounded-xl ml-4">
                                    <div className="flex items-start gap-2">
                                      <div className="w-6 h-6 bg-gradient-to-br from-[#34D399] to-[#0B8457] rounded-full flex items-center justify-center text-white text-xs font-bold">
                                        {reply.author.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-white font-medium text-xs">{reply.author}</span>
                                          <span className="text-text-secondary text-xs">
                                            {reply.createdAt.toLocaleDateString('pt-BR')} {reply.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                        <p className="text-text-secondary text-xs">{reply.text}</p>
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-96">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h3 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">
                Confirmar Exclusão
              </h3>
              <p className="text-text-secondary mb-6">
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
                  className="flex-1 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 py-2 rounded-xl transition-colors"
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
                  className="flex-1 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-xl transition-colors"
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