'use client';

/**
 * CONVITE DE MEET — o pop-up de quem foi chamado.
 *
 * Mesmo lugar e mesmo peso do pop-up de lead de anúncio: aparece por cima de
 * qualquer tela quando um colega te chama pro meet dele. Fica abaixo do lead
 * de anúncio (z-45 contra z-50) e do pop-up de atendimento (z-70) — lead novo
 * e tarefa vencida continuam sendo a coisa mais urgente da tela.
 *
 * É só o AVISO na hora. Quem não quer decidir agora clica em "responder
 * depois": o convite continua na tela inicial e na Agenda Completa
 * (ConvitesMeetPainel), e dá pra responder — ou mudar a resposta — por lá.
 *
 * Aceitar entra em `participantesIds` da tarefa: é o que te coloca no lembrete
 * de 1 hora antes (functions/src/meets.ts).
 */
import React, { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  adiarConvite, convitesAdiados, quandoDoConvite, quandoLabel, responderConvite, situacaoDoConvite, useConvitesRecebidos,
} from '@/lib/convitesMeet';
import { toJsDate } from '@/lib/leadTasks';
import { showToast } from '@/components/ui/toast';

export default function ConviteMeetCard() {
  const { currentUser, isEspelhoDemo } = useAuth();
  const { convites } = useConvitesRecebidos();
  const [respondendo, setRespondendo] = useState(false);
  const [adiados, setAdiados] = useState<Set<string>>(() => (typeof window === 'undefined' ? new Set<string>() : convitesAdiados()));

  const uid = currentUser?.uid;

  /** O pendente mais próximo que ainda não passou e não foi deixado pra depois. */
  const convite = useMemo(() => {
    const agora = Date.now();
    return convites
      .filter(c => situacaoDoConvite(c, agora) === 'pendente' && !adiados.has(c.id))
      .sort((a, b) => quandoDoConvite(a) - quandoDoConvite(b))[0] ?? null;
  }, [convites, adiados]);

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

  const depois = () => {
    adiarConvite(convite.id);
    setAdiados(prev => { const n = new Set(prev); n.add(convite.id); return n; });
    showToast('Fica na tela inicial e na Agenda Completa pra você responder depois.', 'info');
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

          <button
            onClick={depois}
            disabled={respondendo}
            className="mt-2.5 w-full text-center text-[11.5px] font-bold text-text-secondary hover:text-white transition-colors disabled:opacity-60"
            title="O convite continua na tela inicial e na Agenda Completa"
          >
            Responder depois
          </button>
        </div>
      </div>
    </div>
  );
}
