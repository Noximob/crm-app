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
 */
import { useEffect, useState } from 'react';
import { arrayUnion, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

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
  status: 'pendente' | 'aceito' | 'recusado';
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
 * Resposta do convidado. Aceitar entra na tarefa (e no lembrete de 1 hora);
 * recusar só fecha o convite — o dono do meet continua com ele normalmente.
 */
export async function responderConvite(convite: ConviteMeet, uid: string, aceitou: boolean): Promise<void> {
  await updateDoc(doc(db, 'convitesMeet', convite.id), {
    status: aceitou ? 'aceito' : 'recusado',
    respondidoEm: serverTimestamp(),
  });
  if (!aceitou || !convite.leadId || !convite.taskId) return;
  // A tarefa pode ter sido remarcada/cancelada no meio do caminho — o convite
  // já está respondido, então aqui falhar em silêncio é o certo.
  await updateDoc(doc(db, 'leads', convite.leadId, 'tarefas', convite.taskId), {
    participantesIds: arrayUnion(uid),
  }).catch(() => {});
}
