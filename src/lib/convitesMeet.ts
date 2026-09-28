'use client';

/**
 * CONVITE DE MEET — chamar um colega pro meet que acabou de ser marcado.
 *
 * A tarefa do meet mora numa subcoleção do lead (`leads/{id}/tarefas`), que é
 * do dono do lead. O convidado não tem como achar isso, então o convite é um
 * doc solto em `convitesMeet`: ele escuta os convites dele e responde ali.
 *
 * Quem aceita entra em `participantesIds` da tarefa — é essa lista que a função
 * do lembrete de 1 hora lê pra saber quem avisar (functions/src/meets.ts).
 *
 * O convite aparece em três lugares: o pop-up na hora (ConviteMeetCard), a
 * tela inicial e a Agenda Completa (ConvitesMeetPainel). Então dá pra deixar
 * pra depois — e até mudar a resposta enquanto o meet não aconteceu.
 */
import { useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, collection, doc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { toJsDate } from '@/lib/leadTasks';

export interface Colega { id: string; nome: string }

export interface ConviteMeet {
  id: string;
  leadId: string;
  leadNome?: string;
  taskId: string;
  descricao?: string;
  /** Timestamp do Firestore — hora do meet. */
  quando?: any;
  de: string;
  deNome?: string;
  para: string;
  paraNome?: string;
  status: 'pendente' | 'aceito' | 'recusado';
}

/** O que o convite é AGORA: pendente de um meet que já passou virou "expirado". */
export type SituacaoConvite = ConviteMeet['status'] | 'expirado';

/** Folga depois do horário: o meet das 15h não some da tela às 15h01. */
const FOLGA = 5 * 60_000;

export const quandoDoConvite = (c: ConviteMeet): number => toJsDate(c.quando)?.getTime() ?? 0;

/** O meet já aconteceu? */
export const meetPassou = (c: ConviteMeet, agora = Date.now()): boolean => quandoDoConvite(c) < agora - FOLGA;

export function situacaoDoConvite(c: ConviteMeet, agora = Date.now()): SituacaoConvite {
  return c.status === 'pendente' && meetPassou(c, agora) ? 'expirado' : c.status;
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const p2 = (n: number) => String(n).padStart(2, '0');

/** "hoje às 15:00" · "amanhã às 15:00" · "sex 12/07 às 15:00" */
export function quandoLabel(d: Date): string {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dia = new Date(d); dia.setHours(0, 0, 0, 0);
  const diff = Math.round((dia.getTime() - hoje.getTime()) / 86_400_000);
  const hm = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  if (diff === 0) return `hoje às ${hm}`;
  if (diff === 1) return `amanhã às ${hm}`;
  if (diff === -1) return `ontem às ${hm}`;
  return `${DIAS[d.getDay()]} ${p2(d.getDate())}/${p2(d.getMonth() + 1)} às ${hm}`;
}

/** Quem pode ser chamado: corretor da casa, aprovado (mesma query da agenda da imobiliária). */
const TIPOS_CORRETOR = ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria'];

/**
 * Os colegas da imobiliária, menos você. Carrega uma vez, quando o pop-up de
 * atendimento abre — se não vier ninguém, o passo do convite nem aparece.
 */
export function useColegas(ativo: boolean): Colega[] {
  const { currentUser, userData } = useAuth();
  const [colegas, setColegas] = useState<Colega[]>([]);
  const uid = currentUser?.uid;
  const imobiliariaId = userData?.imobiliariaId;

  useEffect(() => {
    if (!ativo || !uid || !imobiliariaId) { setColegas([]); return; }
    let vivo = true;
    getDocs(query(
      collection(db, 'usuarios'),
      where('imobiliariaId', '==', imobiliariaId),
      where('tipoConta', 'in', TIPOS_CORRETOR),
      where('aprovado', '==', true),
    ))
      .then(snap => {
        if (!vivo) return;
        setColegas(snap.docs
          .filter(d => d.id !== uid)
          .map(d => ({ id: d.id, nome: (d.data().nome as string) || 'Sem nome' }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      })
      .catch(() => { if (vivo) setColegas([]); });
    return () => { vivo = false; };
  }, [ativo, uid, imobiliariaId]);

  return colegas;
}

/**
 * Todos os convites que chegaram pra você, ao vivo — pendentes, aceitos e
 * recusados. Quem filtra o que mostrar é cada tela.
 */
export function useConvitesRecebidos(): { convites: ConviteMeet[]; carregou: boolean } {
  const { currentUser, isEspelhoDemo } = useAuth();
  const [convites, setConvites] = useState<ConviteMeet[]>([]);
  const [carregou, setCarregou] = useState(false);
  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid || isEspelhoDemo) { setConvites([]); setCarregou(true); return; }
    const q = query(collection(db, 'convitesMeet'), where('para', '==', uid));
    const unsub = onSnapshot(
      q,
      snap => { setConvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as ConviteMeet))); setCarregou(true); },
      () => { setConvites([]); setCarregou(true); },
    );
    return () => unsub();
  }, [uid, isEspelhoDemo]);

  return { convites, carregou };
}

/**
 * Resposta do convidado — serve também pra MUDAR a resposta enquanto o meet
 * não aconteceu. Aceitar entra na tarefa (e no lembrete de 1 hora); recusar
 * sai dela. O dono do meet segue com ele normalmente.
 */
export async function responderConvite(convite: ConviteMeet, uid: string, aceitou: boolean): Promise<void> {
  await updateDoc(doc(db, 'convitesMeet', convite.id), {
    status: aceitou ? 'aceito' : 'recusado',
    respondidoEm: serverTimestamp(),
  });
  if (!convite.leadId || !convite.taskId) return;
  // A tarefa pode ter sido remarcada/cancelada no meio do caminho — o convite
  // já está respondido, então aqui falhar em silêncio é o certo.
  await updateDoc(doc(db, 'leads', convite.leadId, 'tarefas', convite.taskId), {
    participantesIds: aceitou ? arrayUnion(uid) : arrayRemove(uid),
  }).catch(() => {});
}

/**
 * "Responder depois": tira o pop-up da frente só nesta sessão do navegador.
 * O convite continua pendente — e visível na tela inicial e na Agenda
 * Completa. Na próxima entrada no sistema, se ainda estiver sem resposta, o
 * pop-up volta a lembrar.
 */
const CHAVE_DEPOIS = 'nox-convites-depois';

export function convitesAdiados(): Set<string> {
  try {
    return new Set<string>(JSON.parse(sessionStorage.getItem(CHAVE_DEPOIS) || '[]'));
  } catch {
    return new Set<string>();
  }
}

export function adiarConvite(id: string): void {
  try {
    const todos = convitesAdiados();
    todos.add(id);
    sessionStorage.setItem(CHAVE_DEPOIS, JSON.stringify(Array.from(todos)));
  } catch {
    // sem storage: o pop-up some até a página recarregar, e só
  }
}
