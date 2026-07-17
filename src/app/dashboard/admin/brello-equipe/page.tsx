'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  DEMO_BRELLO_BOARDS,
  DEMO_BRELLO_COLUMNS,
  DEMO_BRELLO_CARDS,
  DEMO_REPORT_CORRETORES,
} from '@/lib/espelho/demoData';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';

/**
 * Brello da Equipe — visão do administrador, SOMENTE LEITURA.
 * Mostra os quadros (boards) salvos por cada corretor da imobiliária,
 * com colunas e cards, e permite copiar o conteúdo em texto para repassar.
 */

interface Corretor {
  id: string;
  nome: string;
  email: string;
  tipoConta?: string;
  aprovado?: boolean;
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

interface BrelloColumn {
  id: string;
  title: string;
  boardId: string;
  order: number;
  createdAt?: any;
}

interface BrelloCard {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  order: number;
  createdAt?: any;
}

interface BrelloAttachment {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
}

interface BrelloComment {
  id: string;
  text: string;
  author: string;
  createdAt: any;
  replies: Array<{ id: string; text: string; author: string; createdAt: any }>;
}

interface BoardData {
  columns: BrelloColumn[];
  cards: BrelloCard[];
}

const GX_COLUMN_COLORS = ['#FFE9A6', '#E8C547', '#D4A017', '#F59E0B', '#FF7A45', '#FF1E56'];

// ---------- helpers ----------

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Converte Timestamp | Date | string em Date com defesa total. */
function toDateSafe(v: any): Date | null {
  try {
    if (!v) return null;
    const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function formatDate(v: any): string {
  const d = toDateSafe(v);
  return d ? d.toLocaleDateString('pt-BR') : '';
}

function formatDateTime(v: any): string {
  const d = toDateSafe(v);
  if (!d) return '';
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/** Monta o esboço em texto puro do quadro (colunas + cards) para copiar/repassar. */
function buildBoardOutline(board: BrelloBoard, corretorNome: string, data: BoardData): string {
  const lines: string[] = [];
  lines.push(`Quadro: ${board.title}`);
  if (corretorNome) lines.push(`Corretor: ${corretorNome}`);
  const created = formatDate(board.createdAt);
  if (created) lines.push(`Criado em: ${created}`);
  lines.push('');

  const columns = [...data.columns].sort((a, b) => (a.order || 0) - (b.order || 0));
  if (columns.length === 0) {
    lines.push('(Quadro sem colunas)');
  }
  columns.forEach((col) => {
    const colCards = data.cards
      .filter((c) => c.columnId === col.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    lines.push(`== ${col.title} (${colCards.length}) ==`);
    if (colCards.length === 0) {
      lines.push('  (sem cards)');
    }
    colCards.forEach((card, i) => {
      lines.push(`  ${i + 1}. ${card.title}`);
      const desc = (card.description || '').trim();
      if (desc) {
        desc.split('\n').forEach((dl) => lines.push(`     ${dl.trim()}`));
      }
    });
    lines.push('');
  });

  return lines.join('\n').trimEnd() + '\n';
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback para ambientes sem Clipboard API
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('Clipboard indisponível');
}

// ---------- ícones (svg, sem emoji) ----------

const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);
const ChevronIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const FileIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
  </svg>
);

// ---------- página ----------

export default function BrelloEquipePage() {
  const { userData, isEspelhoDemo } = useAuth();

  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [allBoards, setAllBoards] = useState<BrelloBoard[]>([]);
  const [selectedCorretorId, setSelectedCorretorId] = useState('');
  const [loading, setLoading] = useState(true);

  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(null);
  const [boardData, setBoardData] = useState<Record<string, BoardData>>({});
  const [boardLoadingId, setBoardLoadingId] = useState<string | null>(null);
  const [copyingBoardId, setCopyingBoardId] = useState<string | null>(null);

  const [selectedCard, setSelectedCard] = useState<{ card: BrelloCard; columnTitle: string; boardTitle: string } | null>(null);
  const [cardAttachments, setCardAttachments] = useState<BrelloAttachment[]>([]);
  const [cardComments, setCardComments] = useState<BrelloComment[]>([]);
  const [cardDetailsLoading, setCardDetailsLoading] = useState(false);

  // Carregar corretores aprovados + todos os boards da equipe (contagem por corretor)
  useEffect(() => {
    if (!userData?.imobiliariaId && !isEspelhoDemo) {
      setLoading(false);
      return;
    }

    if (isEspelhoDemo) {
      const list: Corretor[] = DEMO_REPORT_CORRETORES.map((c) => ({ id: c.uid, nome: c.nome, email: c.email }));
      setCorretores(list);
      setAllBoards(DEMO_BRELLO_BOARDS as BrelloBoard[]);
      const firstWithBoard = list.find((c) => (DEMO_BRELLO_BOARDS as BrelloBoard[]).some((b) => b.userId === c.id));
      setSelectedCorretorId((firstWithBoard || list[0])?.id || '');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const usersSnap = await getDocs(
          query(collection(db, 'usuarios'), where('imobiliariaId', '==', userData!.imobiliariaId))
        );
        const users = usersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Corretor))
          .filter(
            (u) =>
              u.aprovado &&
              (u.tipoConta === 'corretor-vinculado' || u.tipoConta === 'corretor-autonomo' || u.tipoConta === 'imobiliaria')
          )
          .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

        // Boards de todos os corretores (query por userId em lotes de 10 — boards antigos podem não ter imobiliariaId)
        const boards: BrelloBoard[] = [];
        for (const ids of chunk(users.map((u) => u.id), 10)) {
          if (ids.length === 0) continue;
          const snap = await getDocs(query(collection(db, 'brelloBoards'), where('userId', 'in', ids)));
          snap.docs.forEach((d) => boards.push({ id: d.id, ...d.data() } as BrelloBoard));
        }

        if (cancelled) return;
        setCorretores(users);
        setAllBoards(boards);
        const firstWithBoard = users.find((u) => boards.some((b) => b.userId === u.id));
        setSelectedCorretorId((prev) => prev || (firstWithBoard || users[0])?.id || '');
      } catch (error) {
        console.error('Erro ao carregar corretores/boards do Brello da Equipe:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  // Ao trocar de corretor, recolhe o quadro aberto
  useEffect(() => {
    setExpandedBoardId(null);
  }, [selectedCorretorId]);

  const boardCountByCorretor = useMemo(() => {
    const map: Record<string, number> = {};
    allBoards.forEach((b) => {
      map[b.userId] = (map[b.userId] || 0) + 1;
    });
    return map;
  }, [allBoards]);

  const selectedCorretor = useMemo(
    () => corretores.find((c) => c.id === selectedCorretorId) || null,
    [corretores, selectedCorretorId]
  );

  const boardsDoCorretor = useMemo(() => {
    const list = allBoards.filter((b) => b.userId === selectedCorretorId);
    list.sort((a, b) => {
      const ad = toDateSafe(a.createdAt)?.getTime() || 0;
      const bd = toDateSafe(b.createdAt)?.getTime() || 0;
      return bd - ad;
    });
    return list;
  }, [allBoards, selectedCorretorId]);

  /** Busca (ou usa cache) colunas + cards de um quadro. */
  const ensureBoardData = async (boardId: string): Promise<BoardData> => {
    const cached = boardData[boardId];
    if (cached) return cached;

    let data: BoardData;
    if (isEspelhoDemo) {
      data = {
        columns: (DEMO_BRELLO_COLUMNS as BrelloColumn[]).filter((c) => c.boardId === boardId),
        cards: DEMO_BRELLO_CARDS as BrelloCard[],
      };
    } else {
      const colSnap = await getDocs(query(collection(db, 'brelloColumns'), where('boardId', '==', boardId)));
      const columns = colSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as BrelloColumn))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const cards: BrelloCard[] = [];
      for (const ids of chunk(columns.map((c) => c.id), 10)) {
        if (ids.length === 0) continue;
        const cardSnap = await getDocs(query(collection(db, 'brelloCards'), where('columnId', 'in', ids)));
        cardSnap.docs.forEach((d) => cards.push({ id: d.id, ...d.data() } as BrelloCard));
      }
      cards.sort((a, b) => (a.order || 0) - (b.order || 0));
      data = { columns, cards };
    }

    setBoardData((prev) => ({ ...prev, [boardId]: data }));
    return data;
  };

  const toggleBoard = async (board: BrelloBoard) => {
    if (expandedBoardId === board.id) {
      setExpandedBoardId(null);
      return;
    }
    setExpandedBoardId(board.id);
    if (!boardData[board.id]) {
      setBoardLoadingId(board.id);
      try {
        await ensureBoardData(board.id);
      } catch (error) {
        console.error('Erro ao carregar quadro:', error);
        showToast('Erro ao carregar o quadro. Tente novamente.', 'error');
        setExpandedBoardId(null);
      } finally {
        setBoardLoadingId(null);
      }
    }
  };

  const copyBoard = async (board: BrelloBoard) => {
    setCopyingBoardId(board.id);
    try {
      const data = await ensureBoardData(board.id);
      const text = buildBoardOutline(board, selectedCorretor?.nome || '', data);
      await copyTextToClipboard(text);
      showToast('Conteúdo do quadro copiado! Cole onde quiser para repassar ao corretor.', 'success');
    } catch (error) {
      console.error('Erro ao copiar conteúdo do quadro:', error);
      showToast('Não foi possível copiar o conteúdo.', 'error');
    } finally {
      setCopyingBoardId(null);
    }
  };

  const openCard = async (card: BrelloCard, columnTitle: string, boardTitle: string) => {
    setSelectedCard({ card, columnTitle, boardTitle });
    setCardAttachments([]);
    setCardComments([]);
    if (isEspelhoDemo) return;

    setCardDetailsLoading(true);
    try {
      const [attSnap, comSnap] = await Promise.all([
        getDocs(query(collection(db, 'brelloAttachments'), where('cardId', '==', card.id))),
        getDocs(query(collection(db, 'brelloComments'), where('cardId', '==', card.id))),
      ]);

      const attachments = attSnap.docs.map((d) => {
        const data = d.data() as any;
        return { id: d.id, name: data.name || 'Arquivo', url: data.url || '', type: data.type, size: data.size };
      });

      const comments: BrelloComment[] = comSnap.docs
        .map((d) => {
          const data = d.data() as any;
          return { id: d.id, text: data.text || '', author: data.author || 'Usuário', createdAt: data.createdAt, replies: [] };
        })
        .sort((a, b) => (toDateSafe(a.createdAt)?.getTime() || 0) - (toDateSafe(b.createdAt)?.getTime() || 0));

      // Respostas dos comentários (lotes de 10)
      if (comments.length > 0) {
        const byComment: Record<string, BrelloComment> = {};
        comments.forEach((c) => {
          byComment[c.id] = c;
        });
        for (const ids of chunk(comments.map((c) => c.id), 10)) {
          const repSnap = await getDocs(query(collection(db, 'brelloReplies'), where('commentId', 'in', ids)));
          repSnap.docs.forEach((d) => {
            const data = d.data() as any;
            const parent = byComment[data.commentId];
            if (parent) {
              parent.replies.push({ id: d.id, text: data.text || '', author: data.author || 'Usuário', createdAt: data.createdAt });
            }
          });
        }
        comments.forEach((c) =>
          c.replies.sort((a, b) => (toDateSafe(a.createdAt)?.getTime() || 0) - (toDateSafe(b.createdAt)?.getTime() || 0))
        );
      }

      setCardAttachments(attachments);
      setCardComments(comments);
    } catch (error) {
      console.error('Erro ao carregar detalhes do card:', error);
    } finally {
      setCardDetailsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center py-24">
        <LoadingState label="Carregando Brello da Equipe..." />
      </div>
    );
  }

  const expandedData = expandedBoardId ? boardData[expandedBoardId] : null;

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="gx-tag"><span>Área do administrador</span></span>
            {isEspelhoDemo && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-[#E8C547]/10 border border-[#E8C547]/40 text-[#FFE9A6]">
                Demonstração — dados fictícios
              </span>
            )}
          </div>
          <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2">Brello da Equipe</h1>
          <p className="text-[12px] text-text-secondary mt-1">
            Veja tudo o que cada corretor tem salvo no Brello — quadros, colunas e cards, somente leitura.
            Use &quot;Copiar conteúdo&quot; para repassar o material a eles.
          </p>
        </div>

        {/* Seletor de corretor */}
        <div className="al-card relative overflow-hidden rounded-xl p-4 sm:p-5 mb-6">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.14em] mb-3">Corretores</h2>
          {corretores.length === 0 ? (
            <p className="text-text-secondary text-sm">Nenhum corretor aprovado encontrado na imobiliária.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {corretores.map((c) => {
                const count = boardCountByCorretor[c.id] || 0;
                const selected = c.id === selectedCorretorId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCorretorId(c.id)}
                    className={`px-2.5 py-1.5 text-xs font-semibold border rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      selected
                        ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] border-[#FF1E56]/60 text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)]'
                        : 'border-white/10 bg-white/5 text-text-secondary hover:bg-white/10 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="max-w-[160px] truncate">{c.nome || c.email}</span>
                    <span
                      className={`rounded-full px-1.5 text-[10px] tabular-nums font-extrabold ${
                        selected ? 'bg-black/25 text-white' : count > 0 ? 'bg-[#E8C547]/15 text-[#FFE9A6]' : 'bg-white/[0.06] text-text-secondary'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quadros do corretor selecionado */}
        {selectedCorretor && (
          <div className="mb-4 flex flex-wrap items-baseline gap-2">
            <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">
              Quadros de {selectedCorretor.nome || selectedCorretor.email}
            </h2>
            <span className="text-[11px] text-text-secondary tabular-nums">
              {boardsDoCorretor.length} {boardsDoCorretor.length === 1 ? 'quadro' : 'quadros'}
            </span>
          </div>
        )}

        {boardsDoCorretor.length === 0 ? (
          <div className="al-card relative overflow-hidden rounded-xl p-10 text-center">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <p className="text-text-secondary">
              {selectedCorretor
                ? 'Este corretor ainda não tem nenhum quadro salvo no Brello.'
                : 'Selecione um corretor para ver os quadros.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {boardsDoCorretor.map((board) => {
              const isExpanded = expandedBoardId === board.id;
              const isBoardLoading = boardLoadingId === board.id;
              const isCopying = copyingBoardId === board.id;
              const data = boardData[board.id];
              const createdLabel = formatDate(board.createdAt);

              return (
                <div key={board.id} className="al-card relative overflow-hidden rounded-xl">
                  <div className="absolute inset-x-0 top-0 gx-line" />

                  {/* Linha do quadro */}
                  <div className="p-4 sm:p-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => toggleBoard(board)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left group"
                    >
                      <span
                        className={`text-text-secondary group-hover:text-[#FF5C7E] transition-all ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <ChevronIcon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-white font-bold truncate">{board.title}</span>
                        <span className="block text-[11px] text-text-secondary mt-0.5">
                          {createdLabel && <>Criado em {createdLabel}</>}
                          {board.isShared && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6]">
                              Compartilhado
                            </span>
                          )}
                        </span>
                      </span>
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => copyBoard(board)}
                        disabled={isCopying}
                        className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 disabled:opacity-50 disabled:cursor-wait text-white font-bold rounded-xl px-3.5 py-2 text-xs shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all flex items-center gap-2"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                        {isCopying ? 'Copiando...' : 'Copiar conteúdo'}
                      </button>
                      <button
                        onClick={() => toggleBoard(board)}
                        className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl px-3.5 py-2 text-xs transition-colors"
                      >
                        {isExpanded ? 'Fechar' : 'Ver quadro'}
                      </button>
                    </div>
                  </div>

                  {/* Mini-kanban somente leitura */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] p-4 sm:p-5">
                      {isBoardLoading || !data ? (
                        <div className="py-10">
                          <LoadingState label="Carregando quadro..." />
                        </div>
                      ) : data.columns.length === 0 ? (
                        <p className="text-text-secondary text-sm text-center py-6">Este quadro não tem colunas.</p>
                      ) : (
                        <div className="flex gap-4 overflow-x-auto pb-3">
                          {data.columns.map((column, columnIndex) => {
                            const gxColor = GX_COLUMN_COLORS[columnIndex % GX_COLUMN_COLORS.length];
                            const columnCards = data.cards
                              .filter((card) => card.columnId === column.id)
                              .sort((a, b) => (a.order || 0) - (b.order || 0));
                            return (
                              <div
                                key={column.id}
                                className="flex-shrink-0 w-64 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 relative overflow-hidden"
                              >
                                <div
                                  className="absolute inset-x-0 top-0 h-[2px]"
                                  style={{ backgroundColor: gxColor, boxShadow: `0 0 12px ${gxColor}` }}
                                />
                                <div className="flex items-center gap-2 mb-3 min-w-0">
                                  <h3 className="al-display text-[12px] font-bold text-white uppercase tracking-[0.14em] truncate">
                                    {column.title}
                                  </h3>
                                  <span className="bg-white/[0.06] rounded-full px-2 text-[11px] tabular-nums text-text-secondary flex-shrink-0">
                                    {columnCards.length}
                                  </span>
                                </div>
                                <div className="space-y-2.5">
                                  {columnCards.length === 0 && (
                                    <p className="text-white/30 text-xs italic py-2">Sem cards</p>
                                  )}
                                  {columnCards.map((card) => (
                                    <button
                                      key={card.id}
                                      onClick={() => openCard(card, column.title, board.title)}
                                      className="w-full text-left relative overflow-hidden bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 pl-4 hover:border-[#FF1E56]/40 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(255,30,86,0.35)] transition-all"
                                    >
                                      <span
                                        className="pointer-events-none absolute inset-y-0 left-0 w-[2px]"
                                        style={{ backgroundColor: gxColor }}
                                      />
                                      <span className="block text-white text-sm font-medium break-words">{card.title}</span>
                                      {(card.description || '').trim() && (
                                        <span className="block text-text-secondary text-xs mt-1 line-clamp-2 break-words">
                                          {card.description}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal do card (somente leitura) */}
        {selectedCard && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCard(null)}
          >
            <div
              className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden w-full max-w-lg max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 gx-line" />
              <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white break-words">{selectedCard.card.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#FF1E56]/10 border border-[#FF1E56]/35 text-[#FF9EB5]">
                      {selectedCard.columnTitle}
                    </span>
                    <span className="text-[11px] text-text-secondary truncate">{selectedCard.boardTitle}</span>
                    {formatDate(selectedCard.card.createdAt) && (
                      <span className="text-[11px] text-text-secondary">• {formatDate(selectedCard.card.createdAt)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-text-secondary hover:text-[#FF5C7E] text-2xl leading-none transition-colors flex-shrink-0"
                >
                  ×
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5">
                {/* Descrição completa */}
                <div>
                  <h4 className="al-display text-[12px] font-bold text-white uppercase tracking-[0.14em] mb-2">Descrição</h4>
                  <div className="bg-white/[0.03] border border-white/[0.08] p-3.5 rounded-xl">
                    {(selectedCard.card.description || '').trim() ? (
                      <p className="text-text-secondary text-sm whitespace-pre-wrap break-words">{selectedCard.card.description}</p>
                    ) : (
                      <p className="text-white/40 text-sm italic">Nenhuma descrição adicionada</p>
                    )}
                  </div>
                </div>

                {cardDetailsLoading ? (
                  <LoadingState label="Carregando anexos..." className="py-2" />
                ) : (
                  <>
                    {/* Anexos */}
                    {cardAttachments.length > 0 && (
                      <div>
                        <h4 className="al-display text-[12px] font-bold text-white uppercase tracking-[0.14em] mb-2">Anexos</h4>
                        <div className="space-y-2">
                          {cardAttachments.map((att) => (
                            <div
                              key={att.id}
                              className="bg-white/[0.03] border border-white/[0.08] p-3 rounded-xl flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileIcon className="w-4 h-4 text-[#FF5C7E] flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-white text-sm font-medium truncate">{att.name}</p>
                                  {formatFileSize(att.size) && (
                                    <p className="text-text-secondary text-xs">{formatFileSize(att.size)}</p>
                                  )}
                                </div>
                              </div>
                              {att.url && (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#FF7A97] hover:text-[#FF9EB5] text-sm transition-colors flex-shrink-0"
                                >
                                  Abrir
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comentários */}
                    {cardComments.length > 0 && (
                      <div>
                        <h4 className="al-display text-[12px] font-bold text-white uppercase tracking-[0.14em] mb-2">Comentários</h4>
                        <div className="space-y-2.5">
                          {cardComments.map((comment) => (
                            <div key={comment.id} className="bg-white/[0.03] border border-white/[0.08] p-3 rounded-xl">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-6 h-6 bg-gradient-to-br from-[#FF1E56] to-[#A50D38] rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                  {(comment.author || 'U').charAt(0).toUpperCase()}
                                </span>
                                <span className="text-white font-medium text-xs">{comment.author}</span>
                                {formatDateTime(comment.createdAt) && (
                                  <span className="text-text-secondary text-[10px]">{formatDateTime(comment.createdAt)}</span>
                                )}
                              </div>
                              <p className="text-text-secondary text-sm whitespace-pre-wrap break-words">{comment.text}</p>
                              {comment.replies.length > 0 && (
                                <div className="mt-2 space-y-1.5 pl-4 border-l border-white/[0.08]">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id}>
                                      <span className="text-white text-xs font-medium">{reply.author}</span>
                                      {formatDateTime(reply.createdAt) && (
                                        <span className="text-text-secondary text-[10px] ml-2">{formatDateTime(reply.createdAt)}</span>
                                      )}
                                      <p className="text-text-secondary text-xs whitespace-pre-wrap break-words">{reply.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {cardAttachments.length === 0 && cardComments.length === 0 && (
                      <p className="text-white/40 text-xs italic">Sem anexos ou comentários neste card.</p>
                    )}
                  </>
                )}
              </div>

              <div className="p-4 border-t border-white/10">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="w-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 rounded-xl transition-colors text-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
