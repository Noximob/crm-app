'use client';

/**
 * CONVITES DE MEET — a lista que fica.
 *
 * O pop-up (ConviteMeetCard) é o aviso na hora. Se a pessoa não responde ali —
 * estava no meio de outra coisa, clicou em "responder depois" — o convite não
 * some: continua aqui.
 *
 *   · modo "inicio": na tela inicial, só os que esperam resposta (some quando
 *     não tem nenhum, pra não ocupar o painel à toa);
 *   · modo "agenda": na Agenda Completa, tudo — os que esperam, os meets que
 *     você vai, os que recusou e os que já passaram (14 dias).
 *
 * Enquanto o meet não aconteceu dá pra mudar de ideia: "não vou mais" tira
 * você da tarefa (e do lembrete de 1 hora); "afinal, vou" põe de volta.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  meetPassou, quandoDoConvite, quandoLabel, responderConvite, situacaoDoConvite, useConvitesRecebidos, type ConviteMeet,
} from '@/lib/convitesMeet';
import { toJsDate } from '@/lib/leadTasks';
import { showToast } from '@/components/ui/toast';

const DIAS_DE_HISTORICO = 14;
/** Na tela inicial cabe pouco: o resto fica pra Agenda Completa. */
const MAX_NO_INICIO = 3;

export default function ConvitesMeetPainel({ modo }: { modo: 'inicio' | 'agenda' }) {
  const { currentUser, isEspelhoDemo } = useAuth();
  const { convites, carregou } = useConvitesRecebidos();
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const uid = currentUser?.uid;

  const grupos = useMemo(() => {
    const agora = Date.now();
    const cedoPrimeiro = (a: ConviteMeet, b: ConviteMeet) => quandoDoConvite(a) - quandoDoConvite(b);
    const futuros = convites.filter(c => !meetPassou(c, agora));
    return {
      pendentes: futuros.filter(c => c.status === 'pendente').sort(cedoPrimeiro),
      aceitos: futuros.filter(c => c.status === 'aceito').sort(cedoPrimeiro),
      recusados: futuros.filter(c => c.status === 'recusado').sort(cedoPrimeiro),
      passados: convites
        .filter(c => meetPassou(c, agora) && quandoDoConvite(c) > agora - DIAS_DE_HISTORICO * 86_400_000)
        .sort((a, b) => quandoDoConvite(b) - quandoDoConvite(a)),
    };
  }, [convites]);

  if (!uid || isEspelhoDemo) return null;
  if (modo === 'inicio' && grupos.pendentes.length === 0) return null;
  if (modo === 'agenda' && !carregou) return null;

  const responder = async (c: ConviteMeet, aceitou: boolean) => {
    if (respondendo) return;
    setRespondendo(c.id);
    try {
      await responderConvite(c, uid, aceitou);
      showToast(
        aceitou
          ? 'Beleza! Você entra no meet — o lembrete chega 1 hora antes.'
          : 'Combinado, você não vai. Avisamos quem te chamou.',
        aceitou ? 'success' : 'info',
      );
    } catch {
      showToast('Não deu pra responder o convite. Tenta de novo.', 'error');
    } finally {
      setRespondendo(null);
    }
  };

  const Quem = ({ c, apagado = false }: { c: ConviteMeet; apagado?: boolean }) => {
    const quando = toJsDate(c.quando);
    return (
      <div className="min-w-0 flex-1">
        <p className={`text-[13.5px] leading-snug ${apagado ? 'text-white/55' : 'text-white'}`}>
          <b className="font-bold">{c.deNome || 'Um corretor'}</b> te chamou pro meet
          {c.leadNome ? <> com <b className="font-bold">{c.leadNome}</b></> : null}
        </p>
        <p className={`text-[12px] font-bold mt-0.5 ${apagado ? 'text-white/40' : 'text-[#C4A6FF]'}`}>
          {quando ? quandoLabel(quando) : 'sem horário'}
          {c.descricao ? <span className="font-normal text-text-secondary"> · {c.descricao}</span> : null}
        </p>
      </div>
    );
  };

  const Botoes = ({ c }: { c: ConviteMeet }) => (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => responder(c, false)}
        disabled={respondendo === c.id}
        className="h-9 px-3 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-[12.5px] font-bold transition-colors disabled:opacity-50"
      >
        Não vou
      </button>
      <button
        onClick={() => responder(c, true)}
        disabled={respondendo === c.id}
        className="h-9 px-3.5 rounded-lg bg-gradient-to-r from-[#9F6BFF] to-[#5B2BD9] hover:brightness-110 text-white text-[12.5px] font-bold shadow-[0_6px_18px_-8px_rgba(159,107,255,0.6)] transition-all disabled:opacity-50"
      >
        {respondendo === c.id ? 'Enviando…' : 'Vou participar'}
      </button>
    </div>
  );

  const Linha = ({ children }: { children: React.ReactNode }) => (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">{children}</li>
  );

  const Selo = ({ tom, children }: { tom: 'ok' | 'nao' | 'neutro'; children: React.ReactNode }) => (
    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
      tom === 'ok' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
        : tom === 'nao' ? 'bg-white/[0.04] border-white/15 text-text-secondary'
          : 'bg-white/[0.03] border-white/10 text-white/40'}`}>{children}</span>
  );

  const Mudar = ({ c, aceitar }: { c: ConviteMeet; aceitar: boolean }) => (
    <button
      onClick={() => responder(c, aceitar)}
      disabled={respondendo === c.id}
      className="shrink-0 text-[11.5px] font-bold text-text-secondary hover:text-white underline-offset-2 hover:underline transition-colors disabled:opacity-50"
    >
      {respondendo === c.id ? 'salvando…' : aceitar ? 'afinal, vou' : 'não vou mais'}
    </button>
  );

  // ── Tela inicial: só o que espera resposta ──────────────────────────────
  if (modo === 'inicio') {
    const mostrar = grupos.pendentes.slice(0, MAX_NO_INICIO);
    const resto = grupos.pendentes.length - mostrar.length;
    return (
      <div className="al-card relative overflow-hidden p-3.5 mb-3 al-rise">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.14em]">
            📅 Convites de meet esperando você <span className="text-[#C4A6FF]">({grupos.pendentes.length})</span>
          </h2>
          <Link href="/dashboard/agenda" className="text-[11px] font-bold text-[#C4A6FF] hover:underline shrink-0">ver todos na agenda ▸</Link>
        </div>
        <ul className="space-y-2">
          {mostrar.map(c => (
            <Linha key={c.id}><Quem c={c} /><Botoes c={c} /></Linha>
          ))}
        </ul>
        {resto > 0 && (
          <p className="mt-2 text-[11px] text-text-secondary">
            e mais {resto} — <Link href="/dashboard/agenda" className="font-bold text-[#C4A6FF] hover:underline">responde na Agenda Completa</Link>
          </p>
        )}
      </div>
    );
  }

  // ── Agenda Completa: tudo ─────────────────────────────────────────────────
  const vazio = grupos.pendentes.length + grupos.aceitos.length + grupos.recusados.length + grupos.passados.length === 0;
  const Secao = ({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) => (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">{titulo}</h3>
        {dica && <span className="text-[11px] text-white/40">{dica}</span>}
      </div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );

  return (
    <div className="al-card relative overflow-hidden p-6 mb-8">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">📅 Convites de meet</h2>
        <span className="text-[11px] text-text-secondary">quando um colega te chama pro meet dele, fica aqui até você responder</span>
      </div>

      {vazio ? (
        <p className="text-sm text-text-secondary">Nenhum convite por enquanto.</p>
      ) : (
        <div className="space-y-5">
          {grupos.pendentes.length > 0 && (
            <Secao titulo="Esperando sua resposta">
              {grupos.pendentes.map(c => <Linha key={c.id}><Quem c={c} /><Botoes c={c} /></Linha>)}
            </Secao>
          )}
          {grupos.aceitos.length > 0 && (
            <Secao titulo="Você vai" dica="o lembrete chega 1 hora antes">
              {grupos.aceitos.map(c => <Linha key={c.id}><Quem c={c} /><Selo tom="ok">✓ você vai</Selo><Mudar c={c} aceitar={false} /></Linha>)}
            </Secao>
          )}
          {grupos.recusados.length > 0 && (
            <Secao titulo="Você recusou">
              {grupos.recusados.map(c => <Linha key={c.id}><Quem c={c} /><Selo tom="nao">✗ não vai</Selo><Mudar c={c} aceitar /></Linha>)}
            </Secao>
          )}
          {grupos.passados.length > 0 && (
            <Secao titulo="Já passaram" dica={`últimos ${DIAS_DE_HISTORICO} dias`}>
              {grupos.passados.map(c => {
                const s = situacaoDoConvite(c);
                return (
                  <Linha key={c.id}>
                    <Quem c={c} apagado />
                    <Selo tom={s === 'aceito' ? 'ok' : 'neutro'}>{s === 'aceito' ? '✓ aceito' : s === 'recusado' ? '✗ recusado' : '— sem resposta'}</Selo>
                  </Linha>
                );
              })}
            </Secao>
          )}
        </div>
      )}
    </div>
  );
}
