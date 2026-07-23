'use client';

// Pop-up central de lead de anúncio (Meta Ads) — visão do corretor.
// Escuta adsLeads escalados pra ele (exclusivo) ou abertos pra geral, mostra
// countdown até prazoAte. Aceitar (entra no CRM dele, race-safe) ou Negar
// (solta pra escala inteira na hora); os dois já mostram o próximo da fila.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { aceitarAdsLead, type AdsLead } from '@/lib/adsLeads';
import { showToast } from '@/components/ui/toast';

// Aviso gravado pelo backend quando o telefone já é lead de alguém no CRM.
// O campo ainda não existe no tipo AdsLead de @/lib/adsLeads — lido defensivamente.
interface DuplicadoDeInfo {
  leadId?: string;
  userId?: string;
  nomeCorretor?: string;
}

function formatTelefone(digitos: string): string {
  const d = String(digitos || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const corte = d.length > 10 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`;
}

function tsToMillis(ts: Timestamp | undefined | null): number {
  return ts instanceof Timestamp ? ts.toMillis() : 0;
}

export default function AdsLeadCard() {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
  const { stages } = usePipelineStages();
  const router = useRouter();

  const [escalados, setEscalados] = useState<AdsLead[]>([]);
  const [gerais, setGerais] = useState<AdsLead[]>([]);
  const [naEscala, setNaEscala] = useState(false);
  const [aceitando, setAceitando] = useState(false);
  const [jaPego, setJaPego] = useState<{ leadId: string; nome: string } | null>(null);
  const [dispensados, setDispensados] = useState<Set<string>>(new Set());
  const [agora, setAgora] = useState(() => Date.now());
  const jaPegoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uid = currentUser?.uid;
  const imobiliariaId = userData?.imobiliariaId;

  // Config da distribuição: usuário faz parte da escala? (habilita o listener do
  // "geral"). NÃO exige rodízio ligado — com o rodízio DESLIGADO todo lead nasce
  // como 'geral', então a escala precisa enxergar mesmo assim; senão o corretor
  // recebe o push mas o pop-up nunca aparece.
  useEffect(() => {
    if (!uid || !imobiliariaId || isEspelhoDemo) return;
    const unsub = onSnapshot(
      doc(db, 'distribuicaoAds', 'config'),
      (snap) => {
        const cfg = snap.data();
        setNaEscala(
          !!cfg &&
            cfg.imobiliariaId === imobiliariaId &&
            Array.isArray(cfg.corretores) &&
            cfg.corretores.includes(uid)
        );
      },
      () => setNaEscala(false)
    );
    return () => unsub();
  }, [uid, imobiliariaId, isEspelhoDemo]);

  // (a) Leads escalados exclusivamente pra este corretor
  useEffect(() => {
    if (!uid || isEspelhoDemo) return;
    const q = query(
      collection(db, 'adsLeads'),
      where('status', '==', 'escalado'),
      where('corretorEscalado', '==', uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setEscalados(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdsLead))),
      () => setEscalados([])
    );
    return () => unsub();
  }, [uid, isEspelhoDemo]);

  // (b) Leads abertos pra geral na imobiliária (só se o corretor está na escala)
  useEffect(() => {
    if (!uid || !imobiliariaId || isEspelhoDemo || !naEscala) {
      setGerais([]);
      return;
    }
    const q = query(
      collection(db, 'adsLeads'),
      where('status', '==', 'geral'),
      where('imobiliariaId', '==', imobiliariaId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setGerais(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdsLead))),
      () => setGerais([])
    );
    return () => unsub();
  }, [uid, imobiliariaId, isEspelhoDemo, naEscala]);

  // Junta os dois e pega o mais recente (não dispensado, não negado por mim)
  const lead = useMemo(() => {
    const todos = [...escalados, ...gerais].filter(
      (l) =>
        !dispensados.has(l.id) &&
        !((l as { negadoPor?: string[] }).negadoPor?.includes(uid ?? ''))
    );
    if (todos.length === 0) return null;
    todos.sort((a, b) => tsToMillis(b.escaladoEm) - tsToMillis(a.escaladoEm));
    return todos[0];
  }, [escalados, gerais, dispensados, uid]);

  // Tick de 1s pro countdown (só enquanto tem card na tela)
  useEffect(() => {
    if (!lead && !jaPego) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lead, jaPego]);

  useEffect(() => () => {
    if (jaPegoTimer.current) clearTimeout(jaPegoTimer.current);
  }, []);

  if (isEspelhoDemo) return null;
  if (!uid || !imobiliariaId) return null;
  if (!lead && !jaPego) return null;

  const dispensar = (leadId: string) => {
    setDispensados((prev) => {
      const novo = new Set(prev);
      novo.add(leadId);
      return novo;
    });
  };

  const handleAceitar = async () => {
    if (!lead || aceitando) return;
    setAceitando(true);
    try {
      const resultado = await aceitarAdsLead({
        adsLeadId: lead.id,
        uid,
        nomeCorretor: userData?.nome || currentUser?.email || 'Corretor',
        imobiliariaId,
        etapaInicial: stages[0] ?? '',
      });
      if (resultado.status === 'ok') {
        showToast('Lead aceito! Ele já está no seu CRM.', 'success');
        dispensar(lead.id);
        router.push(`/dashboard/crm/${resultado.leadId}`);
      } else {
        setJaPego({ leadId: lead.id, nome: resultado.aceitoPorNome || 'outro corretor' });
        if (jaPegoTimer.current) clearTimeout(jaPegoTimer.current);
        jaPegoTimer.current = setTimeout(() => {
          dispensar(lead.id);
          setJaPego(null);
        }, 5000);
      }
    } finally {
      setAceitando(false);
    }
  };

  // Negar: chama a função de servidor que libera o lead pra escala inteira NA HORA
  // (escalado → geral) e dispara push pra todos (menos quem negou), pra chegar
  // rápido mesmo com o app fechado. Some da tela dele na hora e mostra o próximo.
  const handleNegar = async () => {
    if (!lead || !uid) return;
    const alvo = lead;
    dispensar(alvo.id); // some da tela dele imediatamente (não espera a rede)
    try {
      const negar = httpsCallable(getFunctions(app), 'negarAdsLead');
      await negar({ adsLeadId: alvo.id });
    } catch (e) {
      console.error('negar adsLead falhou:', e);
    }
  };

  // Pop-up centralizado (modal) — não briga mais com as tarefas atrasadas do canto.
  const overlayCls = 'fixed inset-0 z-50 grid place-items-center p-4';
  const backdropCls = 'absolute inset-0 bg-black/60 backdrop-blur-[2px]';
  const cardWrapCls = 'relative w-full max-w-[400px]';

  // ── Estado "já foi pego" ──────────────────────────────────────────────────
  if (jaPego) {
    return (
      <div className={overlayCls}>
        <div className={backdropCls} />
        <div className={cardWrapCls}>
          <div className="relative overflow-hidden rounded-2xl bg-[#12101a] border border-white/10 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] p-5 text-center">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <p className="text-[15px] font-bold text-white">😔 Esse lead já foi pego por {jaPego.nome}</p>
            <p className="mt-1 text-xs text-text-secondary">Fica ligado no próximo — velocidade é tudo.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const duplicadoDe = (lead as AdsLead & { duplicadoDe?: DuplicadoDeInfo }).duplicadoDe;
  const prazoMs = tsToMillis(lead.prazoAte);
  const restanteSeg = Math.max(0, Math.floor((prazoMs - agora) / 1000));
  const mm = String(Math.floor(restanteSeg / 60)).padStart(2, '0');
  const ss = String(restanteSeg % 60).padStart(2, '0');
  const urgente = restanteSeg < 60;
  const exclusivo = lead.status === 'escalado';
  const minutosExclusivo = Math.max(
    1,
    Math.round((prazoMs - tsToMillis(lead.escaladoEm)) / 60000)
  );

  return (
    <div className={overlayCls}>
      <div className={backdropCls} aria-hidden />
      <div className={cardWrapCls}>
      <div className="relative overflow-hidden rounded-2xl bg-[#12101a] border border-[#FF3364]/60 shadow-[0_0_32px_-4px_rgba(255,30,86,0.55),0_24px_80px_-24px_rgba(0,0,0,0.9)] p-4">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-[#FF1E56]/40 animate-pulse" aria-hidden />

        <div className="flex items-start gap-2">
          <h3 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.14em]">
            🔥 Lead de anúncio
          </h3>
        </div>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-white truncate">{lead.nome || 'Sem nome'}</p>
            <p className="text-sm text-text-secondary tabular-nums">{formatTelefone(lead.telefone)}</p>
            {lead.campanhaNome && (
              <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#9F6BFF]/10 border border-[#9F6BFF]/35 text-[#C4A6FF] max-w-full">
                <span className="truncate">{lead.campanhaNome}</span>
              </span>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p
              className={`al-display text-[26px] font-bold leading-none tabular-nums ${
                urgente
                  ? 'text-[#FF3364] [text-shadow:0_0_12px_rgba(255,30,86,0.7)] animate-pulse'
                  : 'text-[#E8C547] [text-shadow:0_0_12px_rgba(232,197,71,0.5)]'
              }`}
            >
              {mm}:{ss}
            </p>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mt-0.5">
              restante
            </p>
          </div>
        </div>

        <p className="mt-2.5 text-[11px] font-semibold text-text-secondary">
          {exclusivo
            ? `Exclusivo pra você por ${minutosExclusivo} min`
            : '⚡ Aberto pra todos — quem clicar primeiro leva'}
        </p>

        {duplicadoDe && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold bg-amber-500/10 border border-amber-500/40 text-amber-200">
            <span aria-hidden>⚠️</span>
            <span>Esse telefone já é lead de {duplicadoDe.nomeCorretor || 'outro corretor'}</span>
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleNegar}
            disabled={aceitando}
            className="shrink-0 h-12 px-4 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white font-bold text-[14px] active:scale-[0.98] transition-all disabled:opacity-60 disabled:active:scale-100"
            title="Negar e ir pro próximo"
          >
            Negar
          </button>
          <button
            onClick={handleAceitar}
            disabled={aceitando}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold text-[15px] shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:active:scale-100"
          >
            {aceitando ? 'Aceitando...' : 'Aceitar lead'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
