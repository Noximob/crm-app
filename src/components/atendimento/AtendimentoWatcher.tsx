'use client';

/**
 * Vigia do circuito — o sistema chama o corretor NA HORA CERTA, sem perseguir.
 *
 * Comportamento:
 *  - Coisas ATRASADAS (de antes) nunca abrem pop-up sozinhas ao navegar:
 *    ficam no aviso fixo embaixo ("N atendimentos esperando — Resolver"),
 *    sempre visível em todas as telas.
 *  - Pop-up automático SÓ quando uma tarefa VENCE com o sistema aberto
 *    ("no horário abre o pop-up dizendo que ele tem aquilo pra fazer agora").
 *  - Clicou em "Resolver" → abre a fila UMA A UMA, na ordem de urgência.
 *  - Nunca interrompe quem está dentro de uma página de lead (lá quem
 *    conduz é a própria página); um pop-up por vez.
 *
 * Anti-avalanche: só leads já no ritmo (lead.circuito) ou novos de Entrada
 * (<72h). Leads antigos entram "manso", quando o corretor abrir o lead.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
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

interface Candidato {
  lead: LeadDoc;
  estado: EstadoFluxo;
  urgencia: number;
  /** chave única da pergunta (muda quando a tarefa muda) */
  chave: string;
  /** true = veio de tarefa com horário → pode abrir sozinho quando VENCE */
  porHorario: boolean;
}

export default function AtendimentoWatcher() {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
  const { normalizeEtapa } = usePipelineStages();
  const pathname = usePathname();

  const [leads, setLeads] = useState<LeadDoc[]>([]);
  const [snapshotChegou, setSnapshotChegou] = useState(false);
  const [cadencias, setCadencias] = useState<CadenciasFunil>(CADENCIAS_PADRAO);
  const [tick, setTick] = useState(0);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [estadoInicial, setEstadoInicial] = useState<EstadoFluxo>({ t: 'entrada' });
  const [executando, setExecutando] = useState(false);

  // Perguntas já anunciadas nesta sessão (não re-abrem sozinhas; ficam no aviso)
  const vistos = useRef<Set<string>>(new Set());
  const inicializado = useRef(false);
  // Modo fila: aberto pelo botão "Resolver" → encadeia um a um
  const modoFila = useRef(false);

  // qualificação/anotações do lead aberto (o pop-up direito)
  const [qual, setQual] = useState<Record<string, string[]>>({});
  const [anot, setAnot] = useState('');
  const [saveQual, setSaveQual] = useState<'idle' | 'salvando' | 'salvo'>('idle');
  const [saveNotas, setSaveNotas] = useState<'idle' | 'salvando' | 'salvo'>('idle');
  const qualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notasTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ativo = !!currentUser && !isEspelhoDemo;

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
      setSnapshotChegou(true);
    }, () => {});
    return () => unsub();
  }, [ativo, currentUser]);

  useEffect(() => {
    if (!ativo) return;
    carregarCadencias(userData?.imobiliariaId).then(setCadencias);
  }, [ativo, userData?.imobiliariaId]);

  // Relógio de 30s: é ele que percebe "a tarefa venceu AGORA"
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Página de detalhe do lead? Lá a própria página conduz — o vigia se recolhe.
  const emPaginaDeLead = useMemo(
    () => /^\/dashboard\/crm\/(?!andamento)[^/]+\/?$/.test(pathname || ''),
    [pathname]
  );

  // Fila de atendimentos esperando (mais urgente primeiro)
  const fila = useMemo((): Candidato[] => {
    const agora = Date.now();
    void tick;
    const lista: Candidato[] = [];
    for (const lead of leads) {
      const etapa = normalizeEtapa(lead.etapa);
      const criadoMs = toJsDate(lead.createdAt)?.getTime() ?? 0;
      const noRitmo = !!lead.circuito;
      const novoRecente = etapa === 'Entrada' && agora - criadoMs < 72 * 3600_000;
      if (!noRitmo && !novoRecente) continue; // lead antigo entra "manso" pela página
      const p = perguntaDoLead(etapa, lead.tarefasPendentes || [], cadencias, agora);
      if (!p?.pendente) continue;
      const taskId = 'taskId' in p.estado ? p.estado.taskId : undefined;
      lista.push({
        lead,
        estado: p.estado,
        urgencia: etapa === 'Entrada' ? criadoMs : p.urgencia,
        chave: `${lead.id}:${taskId || p.estado.t}`,
        porHorario: !!taskId, // tem tarefa com horário marcado
      });
    }
    return lista.sort((a, b) => a.urgencia - b.urgencia);
  }, [leads, cadencias, tick, normalizeEtapa]);

  const abrir = useCallback((c: Candidato) => {
    const q0: Record<string, string[]> = {};
    Object.entries(c.lead.qualificacao || {}).forEach(([k, v]) => {
      q0[k] = Array.isArray(v) ? v : [v as string];
    });
    setQual(q0);
    setAnot(c.lead.anotacoes || '');
    setEstadoInicial(c.estado);
    setAbertoId(c.lead.id);
    vistos.current.add(c.chave);
  }, []);

  // "No horário": pop-up automático SÓ quando a pergunta vence com o app aberto.
  // O que já estava atrasado ao entrar vira aviso fixo — não persegue ninguém.
  useEffect(() => {
    if (!ativo || !snapshotChegou) return;
    if (!inicializado.current) {
      // primeira leitura da sessão: tudo que já venceu vai pro aviso, sem pop-up
      fila.forEach(c => vistos.current.add(c.chave));
      inicializado.current = true;
      return;
    }
    const novas = fila.filter(c => !vistos.current.has(c.chave));
    if (novas.length === 0) return;
    const abrivel = novas.find(c => c.porHorario);
    // marca todas como anunciadas (as que não abrem sozinhas ficam no aviso)
    novas.forEach(c => vistos.current.add(c.chave));
    if (abrivel && !abertoId && !emPaginaDeLead) {
      const id = setTimeout(() => abrir(abrivel), 800);
      return () => clearTimeout(id);
    }
  }, [ativo, snapshotChegou, fila, abertoId, emPaginaDeLead, abrir]);

  const leadAberto = useMemo(() => leads.find(l => l.id === abertoId) || null, [leads, abertoId]);

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

  const abrirFila = () => {
    modoFila.current = true;
    const primeiro = fila.find(c => c.lead.id !== abertoId);
    if (primeiro) abrir(primeiro);
  };

  if (!ativo) return null;

  const esperando = fila.length;

  return (
    <>
      {/* Aviso fixo — sempre que houver atendimento esperando, em toda tela */}
      {esperando > 0 && !abertoId && !emPaginaDeLead && (
        <button
          onClick={abrirFila}
          className="fixed z-[60] bottom-20 lg:bottom-6 right-4 lg:right-6 flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-2xl border border-[#FF1E56]/40 bg-[#201c2e]/95 backdrop-blur-sm shadow-[0_14px_40px_-14px_rgba(0,0,0,0.85)] hover:border-[#FF1E56]/70 hover:bg-[#FF1E56]/[0.08] active:scale-[0.98] transition-all"
          title="Abre os atendimentos um a um, na ordem de urgência"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF1E56] opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF1E56]" />
          </span>
          <span className="text-[12.5px] font-bold text-white">
            {esperando} atendimento{esperando > 1 ? 's' : ''} esperando
          </span>
          <span className="text-[12px] font-extrabold text-[#FF7A97]">Resolver →</span>
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
            modoFila.current = false;
            setAbertoId(null);
            const nome = (leadAberto.nome || 'O lead').split(' ')[0];
            showToast(`⚠️ ${nome} ficou sem encaminhamento — segue no aviso aí embaixo.`, 'info');
          }}
          onConcluido={(msg) => {
            setAbertoId(null);
            if (msg) showToast(msg, 'success');
            // Modo fila: emenda no próximo da ordem (um a um, até zerar)
            if (modoFila.current) {
              setTimeout(() => {
                const proximo = fila.find(c => c.lead.id !== leadAberto.id);
                if (proximo) abrir(proximo);
                else modoFila.current = false;
              }, 700);
            }
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
