'use client';

/**
 * CONVITE DE MEET — o pop-up de quem foi chamado.
 *
 * Mesmo lugar e mesmo peso do pop-up de lead de anúncio: aparece por cima de
 * qualquer tela quando um colega te chama pro meet dele. Fica abaixo do lead
 * de anúncio (z-45 contra z-50) e do pop-up de atendimento (z-70) — lead novo
 * e tarefa vencida continuam sendo a coisa mais urgente da tela.
 *
 * Aceitar entra em `participantesIds` da tarefa: é o que te coloca no lembrete
 * de 1 hora antes (functions/src/meets.ts).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { responderConvite, type ConviteMeet } from '@/lib/convitesMeet';
import { toJsDate } from '@/lib/leadTasks';
import { showToast } from '@/components/ui/toast';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const p2 = (n: number) => String(n).padStart(2, '0');

/** "hoje às 15:00" · "amanhã às 15:00" · "sex 12/07 às 15:00" */
function quandoLabel(d: Date): string {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dia = new Date(d); dia.setHours(0, 0, 0, 0);
  const diff = Math.round((dia.getTime() - hoje.getTime()) / 86_400_000);
  const hm = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  if (diff === 0) return `hoje às ${hm}`;
  if (diff === 1) return `amanhã às ${hm}`;
  return `${DIAS[d.getDay()]} ${p2(d.getDate())}/${p2(d.getMonth() + 1)} às ${hm}`;
}

export default function ConviteMeetCard() {
  const { currentUser, isEspelhoDemo } = useAuth();
  const [convites, setConvites] = useState<ConviteMeet[]>([]);
  const [respondendo, setRespondendo] = useState(false);

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid || isEspelhoDemo) { setConvites([]); return; }
    const q = query(
      collection(db, 'convitesMeet'),
      where('para', '==', uid),
      where('status', '==', 'pendente'),
    );
    const unsub = onSnapshot(
      q,
      snap => setConvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as ConviteMeet))),
      () => setConvites([]),
    );
    return () => unsub();
  }, [uid, isEspelhoDemo]);

  /** O meet mais próximo que ainda não passou — convite velho não fica assombrando. */
  const convite = useMemo(() => {
    const corte = Date.now() - 5 * 60_000;
    return convites
      .map(c => ({ c, ms: toJsDate(c.quando)?.getTime() ?? 0 }))
      .filter(x => x.ms > corte)
      .sort((a, b) => a.ms - b.ms)[0]?.c ?? null;
  }, [convites]);

  if (!uid || isEspelhoDemo || !convite) return null;

  const quando = toJsDate(convite.quando);

  const responder = async (aceitou: boolean) => {
    if (respondendo) return;
    setRespondendo(true);
    try {
      await responderConvite(convite, uid, aceitou);
      showToast(
        aceitou
          ? 'Beleza! Você entra no meet — o lembrete chega 1 hora antes.'
          : 'Convite recusado. Avisamos quem te chamou.',
        aceitou ? 'success' : 'info',
      );
    } catch {
      showToast('Não deu pra responder o convite. Tenta de novo.', 'error');
    } finally {
      setRespondendo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[45] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-hidden />
      <div className="relative w-full max-w-[400px]">
        <div className="relative overflow-hidden rounded-2xl bg-[#12101a] border border-[#9F6BFF]/60 shadow-[0_0_32px_-4px_rgba(159,107,255,0.5),0_24px_80px_-24px_rgba(0,0,0,0.9)] p-4">
          <div className="absolute inset-x-0 top-0 gx-line" />

          <h3 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.14em]">
            📅 Convite de meet
          </h3>

          <p className="mt-2 text-[15px] text-white leading-snug">
            <b className="font-bold">{convite.deNome || 'Um corretor'}</b> te chamou pro meet
            {convite.leadNome ? <> com <b className="font-bold">{convite.leadNome}</b></> : null}.
          </p>

          {quando && (
            <p className="mt-1.5 text-[13px] font-bold text-[#C4A6FF]">{quandoLabel(quando)}</p>
          )}
          {convite.descricao && (
            <p className="mt-1 text-xs text-text-secondary truncate">{convite.descricao}</p>
          )}

          <p className="mt-2.5 text-[11px] font-semibold text-text-secondary">
            Aceitando, você recebe o lembrete 1 hora antes.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => responder(false)}
              disabled={respondendo}
              className="shrink-0 h-12 px-4 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white font-bold text-[14px] active:scale-[0.98] transition-all disabled:opacity-60 disabled:active:scale-100"
            >
              Não vou
            </button>
            <button
              onClick={() => responder(true)}
              disabled={respondendo}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#9F6BFF] to-[#5B2BD9] hover:brightness-110 text-white font-bold text-[15px] shadow-[0_8px_24px_-8px_rgba(159,107,255,0.5)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:active:scale-100"
            >
              {respondendo ? 'Enviando…' : 'Vou participar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
