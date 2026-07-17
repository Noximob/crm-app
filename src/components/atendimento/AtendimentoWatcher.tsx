'use client';

/**
 * Vigia do circuito — dispara os pop-ups de atendimento NA HORA CERTA,
 * em qualquer tela do sistema ("Ao abrir o sistema: se existe pergunta
 * pendente, ela aparece antes de tudo — uma por vez, a mais urgente primeiro").
 *
 * Observa os leads do corretor em tempo real; quando uma pergunta vence
 * (lead novo em Entrada, tarefa no horário, meet/visita que passou — tudo
 * conforme as cadências do admin), abre os 2 pop-ups sobre a página atual.
 *
 * Regras anti-avalanche:
 *  - só entram leads que JÁ estão no ritmo do circuito (têm lead.circuito)
 *    ou leads novos em Entrada criados nas últimas 72h — os antigos entram
 *    "manso", quando o corretor abrir o lead;
 *  - um pop-up por vez, o mais urgente primeiro;
 *  - fechou no ✕ = pendência: não insiste na sessão, mas fica o aviso fixo
 *    "N leads sem encaminhamento — Resolver agora".
 *  - pausa nas páginas de detalhe do lead (lá quem manda é a própria página).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { collection, doc, onSnapshot, query, updateDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { CADENCIAS_PADRAO, carregarCadencias, ETAPAS_CIRCUITO, type CadenciasFunil } from '@/lib/circuito';
import { executarAcaoCircuito } from '@/lib/circuitoActions';
import { toJsDate, type TarefaPendente } from '@/lib/leadTasks';
import { showToast } from '@/components/ui/toast';
import AtendimentoOverlay, { perguntaDoLead, type AcaoCircuito, type EstadoFluxo } from './AtendimentoOverlay';
import { QUALIFICATION_QUESTIONS } from '@/lib/qualificacao';

interface LeadDoc {
  id: string;
  nome: string;
  telefone: string;
  origem?: string;
  etapa?: string;
  userId?: string;
  createdAt?: any;
  circuito?: { tentativas?: number; desde?: any };
  tarefasPendentes?: TarefaPendente[];
  qualificacao?: Record<string, any>;
  anotacoes?: string;
}

const SNOOZE_KEY = 'nox-atend-snooze';

const lerSnooze = (): Record<string, number> => {
  try { return JSON.parse(sessionStorage.getItem(SNOOZE_KEY) || '{}'); } catch { return {}; }
};

export default function AtendimentoWatcher() {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
  const { normalizeEtapa } = usePipelineStages();
  const pathname = usePathname();
  const router = useRouter();

  const [leads, setLeads] = useState<LeadDoc[]>([]);
  const [cadencias, setCadencias] = useState<CadenciasFunil>(CADENCIAS_PADRAO);
  const [tick, setTick] = useState(0);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [estadoInicial, setEstadoInicial] = useState<EstadoFluxo>({ t: 'entrada' });
  const [executando, setExecutando] = useState(false);
  const [snooze, setSnooze] = useState<Record<string, number>>({});

  // qualificação/anotações do lead aberto (o pop-up direito)
  const [qual, setQual] = useState<Record<string, string[]>>({});
  const [anot, setAnot] = useState('');
  const [saveQual, setSaveQual] = useState<'idle' | 'salvando' | 'salvo'>('idle');
  const [saveNotas, setSaveNotas] = useState<'idle' | 'salvando' | 'salvo'>('idle');
  const qualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notasTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ativo = !!currentUser && !isEspelhoDemo;

  useEffect(() => { setSnooze(lerSnooze()); }, []);

  // Leads do corretor nas etapas ativas do circuito (em tempo real)
  useEffect(() => {
    if (!ativo) return;
    const q = query(
      collection(db, 'leads'),
      where('userId', '==', currentUser!.uid),
      where('etapa', 'in', [...ETAPAS_CIRCUITO])
    );
    const unsub = onSnapshot(q, snap => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeadDoc)));
    }, () => {});
    return () => unsub();
  }, [ativo, currentUser]);

  useEffect(() => {
    if (!ativo) return;
    carregarCadencias(userData?.imobiliariaId).then(setCadencias);
  }, [ativo, userData?.imobiliariaId]);

  // Relógio de 30s: perguntas vencem sem precisar de novo snapshot
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Página de detalhe do lead? Lá a própria página conduz — o vigia pausa.
  const emPaginaDeLead = useMemo(
    () => /^\/dashboard\/crm\/(?!andamento)[^/]+\/?$/.test(pathname || ''),
    [pathname]
  );

  // Candidatos: pergunta vencida + elegível + sem snooze, mais urgente primeiro
  const candidatos = useMemo(() => {
    const agora = Date.now();
    void tick;
    const lista: { lead: LeadDoc; estado: EstadoFluxo; urgencia: number }[] = [];
    for (const lead of leads) {
      const etapa = normalizeEtapa(lead.etapa);
      const criadoMs = toJsDate(lead.createdAt)?.getTime() ?? 0;
      const noRitmo = !!lead.circuito;
      const novoRecente = etapa === 'Entrada' && agora - criadoMs < 72 * 3600_000;
      if (!noRitmo && !novoRecente) continue; // lead antigo entra "manso" pela página
      const p = perguntaDoLead(etapa, lead.tarefasPendentes || [], cadencias, agora);
      if (!p?.pendente) continue;
      lista.push({ lead, estado: p.estado, urgencia: etapa === 'Entrada' ? criadoMs : p.urgencia });
    }
    return lista.sort((a, b) => a.urgencia - b.urgencia);
  }, [leads, cadencias, tick, normalizeEtapa]);

  const pendencias = useMemo(
    () => candidatos.filter(c => snooze[c.lead.id]),
    [candidatos, snooze]
  );
  const naFila = useMemo(
    () => candidatos.filter(c => !snooze[c.lead.id]),
    [candidatos, snooze]
  );

  const abrir = useCallback((leadId: string, estado: EstadoFluxo) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const q0: Record<string, string[]> = {};
    Object.entries(lead.qualificacao || {}).forEach(([k, v]) => {
      q0[k] = Array.isArray(v) ? v : [v as string];
    });
    setQual(q0);
    setAnot(lead.anotacoes || '');
    setEstadoInicial(estado);
    setAbertoId(leadId);
  }, [leads]);

  // Auto-abre a pergunta mais urgente (uma por vez, nunca sobre a página do lead)
  useEffect(() => {
    if (!ativo || abertoId || emPaginaDeLead) return;
    const primeira = naFila[0];
    if (!primeira) return;
    const id = setTimeout(() => abrir(primeira.lead.id, primeira.estado), 1200);
    return () => clearTimeout(id);
  }, [ativo, abertoId, emPaginaDeLead, naFila, abrir]);

  const leadAberto = useMemo(() => leads.find(l => l.id === abertoId) || null, [leads, abertoId]);

  const marcarSnooze = (leadId: string) => {
    setSnooze(prev => {
      const next = { ...prev, [leadId]: Date.now() };
      try { sessionStorage.setItem(SNOOZE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const limparSnooze = (leadId: string) => {
    setSnooze(prev => {
      const next = { ...prev };
      delete next[leadId];
      try { sessionStorage.setItem(SNOOZE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const executar = useCallback(async (acao: AcaoCircuito): Promise<boolean> => {
    if (!leadAberto || !currentUser || executando) return false;
    setExecutando(true);
    const res = await executarAcaoCircuito({
      lead: leadAberto,
      acao,
      pendentesAtuais: leadAberto.tarefasPendentes ?? null,
      imobiliariaId: userData?.imobiliariaId || '',
      currentUid: currentUser.uid,
    });
    setExecutando(false);
    if (!res.ok) {
      showToast('Erro ao registrar a ação. Tente de novo.', 'error');
      return false;
    }
    return true;
  }, [leadAberto, currentUser, executando, userData?.imobiliariaId]);

  const registrarContato = useCallback((via: 'Ligação' | 'WhatsApp') => {
    if (!leadAberto) return;
    addDoc(collection(db, 'leads', leadAberto.id, 'interactions'), {
      type: via,
      notes: `${via === 'Ligação' ? '📞' : '💬'} Tentativa de contato por ${via === 'Ligação' ? 'ligação' : 'WhatsApp'}`,
      timestamp: serverTimestamp(),
      circuito: true,
    }).catch(() => {});
  }, [leadAberto]);

  const handleToggleQual = (key: string, value: string) => {
    if (!leadAberto) return;
    setQual(prev => {
      const atual = prev[key] || [];
      let next: Record<string, string[]>;
      if (atual.includes(value)) {
        const vals = atual.filter(v => v !== value);
        next = { ...prev };
        if (vals.length === 0) delete next[key]; else next[key] = vals;
      } else {
        next = { ...prev, [key]: [...atual, value] };
      }
      setSaveQual('salvando');
      if (qualTimer.current) clearTimeout(qualTimer.current);
      qualTimer.current = setTimeout(() => {
        updateDoc(doc(db, 'leads', leadAberto.id), { qualificacao: next })
          .then(() => { setSaveQual('salvo'); setTimeout(() => setSaveQual(s => s === 'salvo' ? 'idle' : s), 2000); })
          .catch(() => setSaveQual('idle'));
      }, 600);
      return next;
    });
  };

  const handleAnot = (v: string) => {
    if (!leadAberto) return;
    setAnot(v);
    setSaveNotas('salvando');
    if (notasTimer.current) clearTimeout(notasTimer.current);
    notasTimer.current = setTimeout(() => {
      updateDoc(doc(db, 'leads', leadAberto.id), { anotacoes: v })
        .then(() => { setSaveNotas('salvo'); setTimeout(() => setSaveNotas(s => s === 'salvo' ? 'idle' : s), 2000); })
        .catch(() => setSaveNotas('idle'));
    }, 800);
  };

  if (!ativo) return null;

  return (
    <>
      {/* Aviso fixo de pendências ("fora do ritmo") */}
      {pendencias.length > 0 && !abertoId && (
        <button
          onClick={() => { const p = pendencias[0]; limparSnooze(p.lead.id); abrir(p.lead.id, p.estado); }}
          className="fixed z-[60] bottom-20 lg:bottom-6 right-4 lg:right-6 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/50 bg-[#201c2e] shadow-[0_14px_40px_-14px_rgba(0,0,0,0.8)] text-[12.5px] font-bold text-amber-200 hover:bg-amber-500/10 active:scale-[0.98] transition-all"
        >
          🔒 {pendencias.length} lead{pendencias.length > 1 ? 's' : ''} sem encaminhamento
          <span className="text-white">Resolver agora →</span>
        </button>
      )}

      {leadAberto && (
        <AtendimentoOverlay
          aberto={!!abertoId}
          estadoInicial={estadoInicial}
          nome={leadAberto.nome}
          telefone={leadAberto.telefone}
          origem={leadAberto.origem}
          tasks={leadAberto.tarefasPendentes || []}
          cadencias={cadencias}
          executando={executando}
          isDemo={false}
          executar={executar}
          registrarContato={registrarContato}
          onFecharX={() => {
            const nome = (leadAberto.nome || 'O lead').split(' ')[0];
            marcarSnooze(leadAberto.id);
            setAbertoId(null);
            showToast(`⚠️ ${nome} ficou sem encaminhamento. Resolva pra voltar ao ritmo.`, 'info');
          }}
          onConcluido={(msg) => {
            limparSnooze(leadAberto.id);
            setAbertoId(null);
            if (msg) showToast(msg, 'success');
          }}
          qualGroups={QUALIFICATION_QUESTIONS}
          qualifications={qual}
          onToggleQual={handleToggleQual}
          saveQual={saveQual}
          anotacoes={anot}
          onChangeAnotacoes={handleAnot}
          saveNotas={saveNotas}
        />
      )}
    </>
  );
}
