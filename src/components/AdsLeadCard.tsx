'use client';

// Card flutuante de lead de anúncio (Meta Ads) — visão do corretor.
// Escuta adsLeads escalados pra ele (exclusivo) ou abertos pra geral,
// mostra countdown até prazoAte e o botão "Aceitar lead" (race-safe).

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
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { aceitarAdsLead, type AdsLead } from '@/lib/adsLeads';
import { showToast } from '@/components/ui/toast';

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

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
  const [minimizado, setMinimizado] = useState(false);
  const [aceitando, setAceitando] = useState(false);
  const [jaPego, setJaPego] = useState<{ leadId: string; nome: string } | null>(null);
  const [dispensados, setDispensados] = useState<Set<string>>(new Set());
  const [agora, setAgora] = useState(() => Date.now());
  const jaPegoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uid = currentUser?.uid;
  const imobiliariaId = userData?.imobiliariaId;

  // Config da distribuição: usuário está na escala? (habilita o listener do "geral")
  useEffect(() => {
    if (!uid || !imobiliariaId || isEspelhoDemo) return;
    const unsub = onSnapshot(
      doc(db, 'distribuicaoAds', 'config'),
      (snap) => {
        const cfg = snap.data();
        setNaEscala(
          !!cfg &&
            cfg.ativo === true &&
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

  // Junta os dois e pega o mais recente (não dispensado)
  const lead = useMemo(() => {
    const todos = [...escalados, ...gerais].filter((l) => !dispensados.has(l.id));
    if (todos.length === 0) return null;
    todos.sort((a, b) => tsToMillis(b.escaladoEm) - tsToMillis(a.escaladoEm));
    return todos[0];
  }, [escalados, gerais, dispensados]);

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

  // ── Minimizado: bolinha carmesim flutuante com badge ─────────────────────
  if (minimizado && !jaPego) {
    return (
      <button
        onClick={() => setMinimizado(false)}
        className="fixed bottom-[84px] right-3 lg:bottom-6 lg:right-6 z-40 grid place-items-center w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1E56] to-[#A50D38] shadow-[0_0_24px_rgba(255,30,86,0.6)] border border-[#FF3364]/60 active:scale-[0.95] transition-all"
        title="Lead de anúncio aguardando"
        aria-label="Reabrir lead de anúncio"
      >
        <span className="text-lg" aria-hidden>🔥</span>
        <span className="absolute -top-1 -right-1 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#A50D38] text-[10px] font-extrabold animate-pulse">
          1
        </span>
      </button>
    );
  }

  const containerCls =
    'fixed bottom-[84px] inset-x-3 lg:bottom-6 lg:right-6 lg:left-auto lg:w-[380px] z-40';

  // ── Estado "já foi pego" ──────────────────────────────────────────────────
  if (jaPego) {
    return (
      <div className={containerCls}>
        <div className="relative overflow-hidden rounded-2xl bg-[#12101a] border border-white/10 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] p-5 text-center">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <p className="text-[15px] font-bold text-white">😔 Esse lead já foi pego por {jaPego.nome}</p>
          <p className="mt-1 text-xs text-text-secondary">Fica ligado no próximo — velocidade é tudo.</p>
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
    <div className={containerCls}>
      <div className="relative overflow-hidden rounded-2xl bg-[#12101a] border border-[#FF3364]/60 shadow-[0_0_32px_-4px_rgba(255,30,86,0.55),0_24px_80px_-24px_rgba(0,0,0,0.9)] p-4">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-[#FF1E56]/40 animate-pulse" aria-hidden />

        <div className="flex items-start justify-between gap-2">
          <h3 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.14em]">
            🔥 Lead de anúncio
          </h3>
          <button
            onClick={() => setMinimizado(true)}
            className="shrink-0 -mt-1 -mr-1 grid place-items-center w-8 h-8 rounded-lg text-text-secondary hover:text-[#FF5C7E] hover:bg-white/[0.06] transition-colors"
            title="Minimizar"
            aria-label="Minimizar card de lead"
          >
            <XIcon className="w-4 h-4" />
          </button>
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

        <button
          onClick={handleAceitar}
          disabled={aceitando}
          className="mt-3 w-full h-12 rounded-xl bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold text-[15px] shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:active:scale-100"
        >
          {aceitando ? 'Aceitando...' : 'Aceitar lead'}
        </button>
      </div>
    </div>
  );
}
