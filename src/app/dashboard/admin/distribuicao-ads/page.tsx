"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { DEMO_REPORT_CORRETORES } from '@/lib/espelho/demoData';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';

// ---------------------------------------------------------------------------
// Tipos (contrato compartilhado com o backend de distribuição de anúncios)
// ---------------------------------------------------------------------------
interface Corretor {
  id: string;
  nome: string;
}

interface AdsConfig {
  ativo: boolean;
  corretores: string[]; // uids na ordem do rodízio
  proximoIndex: number;
  minutosExclusivo: number;
  minutosGeral: number;
  imobiliariaId?: string;
}

interface AdsLead {
  id: string;
  nome: string;
  telefone: string;
  origem: 'meta-form' | 'meta-whatsapp' | 'manual' | string;
  campanhaNome?: string;
  anuncioNome?: string;
  formNome?: string;
  status: 'escalado' | 'geral' | 'aceito' | 'nao-atendido' | 'descartado' | string;
  corretorEscalado?: string | null;
  escaladoEm?: any;
  prazoAte?: any;
  abriuGeralEm?: any;
  aceitoPor?: string;
  aceitoPorNome?: string;
  aceitoEm?: any;
  tempoAceiteSeg?: number;
  viaGeral?: boolean;
  criadoEm?: any;
  imobiliariaId?: string;
}

// ---------------------------------------------------------------------------
// Helpers de formatação (timestamps sempre defensivos)
// ---------------------------------------------------------------------------
const tsToDate = (t: any): Date | null => {
  if (!t) return null;
  if (typeof t.toDate === 'function') return t.toDate();
  if (typeof t.seconds === 'number') return new Date(t.seconds * 1000);
  if (t instanceof Date) return t;
  return null;
};

const tsToMs = (t: any): number | null => {
  const d = tsToDate(t);
  return d ? d.getTime() : null;
};

const fmtTelefone = (raw?: string) => {
  const d = (raw || '').replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d || '—';
};

const fmtQuando = (t: any) => {
  const d = tsToDate(t);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fmtTempoSeg = (seg?: number) => {
  if (seg === undefined || seg === null || !isFinite(seg)) return '—';
  const s = Math.max(0, Math.round(seg));
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
};

const fmtCountdown = (prazoAte: any, nowMs: number): { texto: string; vencido: boolean } => {
  const alvo = tsToMs(prazoAte);
  if (alvo === null) return { texto: '—', vencido: false };
  const resto = Math.floor((alvo - nowMs) / 1000);
  if (resto <= 0) return { texto: 'tempo esgotado', vencido: true };
  const m = Math.floor(resto / 60);
  const s = resto % 60;
  return { texto: `${m}:${String(s).padStart(2, '0')}`, vencido: false };
};

const ORIGEM_LABEL: Record<string, string> = {
  'meta-form': 'Formulário Meta',
  'meta-whatsapp': 'WhatsApp Meta',
  manual: 'Manual',
};

const ORIGEM_CHIP: Record<string, string> = {
  'meta-form': 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]',
  'meta-whatsapp': 'bg-[#9F6BFF]/10 border-[#9F6BFF]/35 text-[#C4A6FF]',
  manual: 'bg-white/[0.05] border-white/15 text-text-secondary',
};

const chipBase = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider border';

// ---------------------------------------------------------------------------
// Dados do modo Espelho (demo, somente leitura)
// ---------------------------------------------------------------------------
const demoTs = (deltaMs: number) => Timestamp.fromMillis(Date.now() + deltaMs);

const buildDemo = () => {
  const config: AdsConfig = {
    ativo: true,
    corretores: [DEMO_REPORT_CORRETORES[1].uid, DEMO_REPORT_CORRETORES[2].uid, DEMO_REPORT_CORRETORES[3].uid, DEMO_REPORT_CORRETORES[4].uid],
    proximoIndex: 1,
    minutosExclusivo: 5,
    minutosGeral: 30,
    imobiliariaId: 'espelho-demo',
  };
  const aoVivo: AdsLead[] = [
    {
      id: 'demo-ads-1', nome: 'Marcos Vinícius', telefone: '47991234567', origem: 'meta-form',
      campanhaNome: 'Lançamento Vista Mar', formNome: 'Form frente-mar', status: 'escalado',
      corretorEscalado: DEMO_REPORT_CORRETORES[2].uid, escaladoEm: demoTs(-2 * 60000), prazoAte: demoTs(3 * 60000),
      criadoEm: demoTs(-2 * 60000),
    },
    {
      id: 'demo-ads-2', nome: 'Patrícia Ramos', telefone: '47988884444', origem: 'meta-whatsapp',
      campanhaNome: 'Retargeting Julho', status: 'geral', corretorEscalado: null,
      abriuGeralEm: demoTs(-4 * 60000), prazoAte: demoTs(26 * 60000), criadoEm: demoTs(-9 * 60000),
    },
  ];
  const naoAtendidos: AdsLead[] = [
    {
      id: 'demo-ads-3', nome: 'Juliano Teixeira', telefone: '47996667777', origem: 'meta-form',
      campanhaNome: 'Lançamento Vista Mar', status: 'nao-atendido', criadoEm: demoTs(-2 * 3600000),
      prazoAte: demoTs(-90 * 60000),
    },
  ];
  const nomes = [2, 3, 4, 5, 2, 3];
  const tempos = [45, 230, 95, 610, 152, 78];
  const aceitos: AdsLead[] = nomes.map((n, i) => ({
    id: `demo-ads-ok-${i}`,
    nome: ['Fernanda Souza', 'Ricardo Prado', 'Aline Martins', 'Otávio Nunes', 'Beatriz Melo', 'Caio Duarte'][i],
    telefone: `4799${String(1110000 + i * 137)}`,
    origem: i % 2 === 0 ? 'meta-form' : 'meta-whatsapp',
    campanhaNome: i % 2 === 0 ? 'Lançamento Vista Mar' : 'Retargeting Julho',
    status: 'aceito',
    aceitoPor: DEMO_REPORT_CORRETORES[n].uid,
    aceitoPorNome: DEMO_REPORT_CORRETORES[n].nome,
    aceitoEm: demoTs(-(i + 1) * 5 * 3600000),
    tempoAceiteSeg: tempos[i],
    viaGeral: i === 1 || i === 3,
    criadoEm: demoTs(-(i + 1) * 5 * 3600000 - tempos[i] * 1000),
  }));
  return { config, aoVivo, naoAtendidos, aceitos };
};

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function AdminDistribuicaoAdsPage() {
  const { userData, isEspelhoDemo } = useAuth();

  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [config, setConfig] = useState<AdsConfig | null>(null);
  const [cfgCarregada, setCfgCarregada] = useState(false);
  const [corrCarregados, setCorrCarregados] = useState(false);

  // Leads por bucket (queries simples, sem índice composto; ordenação no cliente)
  const [aoVivo, setAoVivo] = useState<AdsLead[]>([]);
  const [naoAtendidos, setNaoAtendidos] = useState<AdsLead[]>([]);
  const [aceitos, setAceitos] = useState<AdsLead[]>([]);

  // Config (rascunho local dos tempos)
  const [minExc, setMinExc] = useState('5');
  const [minGer, setMinGer] = useState('30');
  const temposSincronizados = useRef(false);
  const [salvandoCfg, setSalvandoCfg] = useState(false);

  // Escala (rascunho local da ordem do rodízio)
  const [escala, setEscala] = useState<string[]>([]);
  const escalaSincronizada = useRef(false);
  const [salvandoEscala, setSalvandoEscala] = useState(false);

  // Lançamento manual
  const [mNome, setMNome] = useState('');
  const [mTelefone, setMTelefone] = useState('');
  const [mOrigem, setMOrigem] = useState<'manual' | 'meta-whatsapp'>('manual');
  const [mCampanha, setMCampanha] = useState('');
  const [lancando, setLancando] = useState(false);

  // Ações em andamento por lead (re-disparar / descartar)
  const [agindoId, setAgindoId] = useState<string | null>(null);

  // Relógio do countdown (só roda quando há lead ao vivo)
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    if (aoVivo.length === 0) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [aoVivo.length]);

  // ------------------------------------------------------------------
  // Modo Espelho: tudo demo, somente leitura
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isEspelhoDemo) return;
    const demo = buildDemo();
    setCorretores(DEMO_REPORT_CORRETORES.map((c: any) => ({ id: c.uid, nome: c.nome })));
    setConfig(demo.config);
    setEscala(demo.config.corretores);
    setMinExc(String(demo.config.minutosExclusivo));
    setMinGer(String(demo.config.minutosGeral));
    setAoVivo(demo.aoVivo);
    setNaoAtendidos(demo.naoAtendidos);
    setAceitos(demo.aceitos);
    setCfgCarregada(true);
    setCorrCarregados(true);
  }, [isEspelhoDemo]);

  // ------------------------------------------------------------------
  // Corretores aprovados da imobiliária (mesmo padrão de meets-visitas)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isEspelhoDemo || !userData?.imobiliariaId) return;
    const fetchCorretores = async () => {
      try {
        const q = query(
          collection(db, 'usuarios'),
          where('imobiliariaId', '==', userData.imobiliariaId),
          where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria']),
          where('aprovado', '==', true)
        );
        const snapshot = await getDocs(q);
        setCorretores(snapshot.docs.map((d) => ({ id: d.id, nome: d.data().nome })));
      } catch (e) {
        console.error('Erro ao buscar corretores:', e);
        showToast('Não foi possível carregar os corretores — recarregue a página.', 'error');
      } finally {
        setCorrCarregados(true);
      }
    };
    fetchCorretores();
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  // ------------------------------------------------------------------
  // Config em tempo real (badge do "próximo da vez" acompanha o rodízio)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isEspelhoDemo || !userData?.imobiliariaId) return;
    const unsub = onSnapshot(
      doc(db, 'distribuicaoAds', 'config'),
      (snap) => {
        const data = snap.exists() ? (snap.data() as any) : null;
        const cfg: AdsConfig | null = data
          ? {
              ativo: !!data.ativo,
              corretores: Array.isArray(data.corretores) ? data.corretores : [],
              proximoIndex: Number(data.proximoIndex) || 0,
              minutosExclusivo: Number(data.minutosExclusivo) > 0 ? Number(data.minutosExclusivo) : 5,
              minutosGeral: Number(data.minutosGeral) > 0 ? Number(data.minutosGeral) : 30,
              imobiliariaId: data.imobiliariaId,
            }
          : null;
        setConfig(cfg);
        if (!temposSincronizados.current) {
          setMinExc(String(cfg?.minutosExclusivo ?? 5));
          setMinGer(String(cfg?.minutosGeral ?? 30));
          temposSincronizados.current = true;
        }
        if (!escalaSincronizada.current) {
          setEscala(cfg?.corretores ?? []);
          escalaSincronizada.current = true;
        }
        setCfgCarregada(true);
      },
      (e) => {
        console.error('Erro ao ouvir config de distribuição:', e);
        setCfgCarregada(true);
      }
    );
    return () => unsub();
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  // ------------------------------------------------------------------
  // Leads em tempo real — 3 listeners de igualdade simples (sem orderBy,
  // ordenação no cliente => nenhum índice composto novo é necessário)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isEspelhoDemo || !userData?.imobiliariaId) return;
    const col = collection(db, 'adsLeads');
    const mapDocs = (snap: any): AdsLead[] => snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));

    const unsubVivo = onSnapshot(
      query(col, where('imobiliariaId', '==', userData.imobiliariaId), where('status', 'in', ['escalado', 'geral'])),
      (snap) => {
        const lista = mapDocs(snap).sort((a, b) => (tsToMs(b.criadoEm) ?? 0) - (tsToMs(a.criadoEm) ?? 0));
        setAoVivo(lista);
      },
      (e) => console.error('Erro ao ouvir leads ao vivo:', e)
    );
    const unsubNao = onSnapshot(
      query(col, where('imobiliariaId', '==', userData.imobiliariaId), where('status', '==', 'nao-atendido')),
      (snap) => {
        const lista = mapDocs(snap).sort((a, b) => (tsToMs(b.criadoEm) ?? 0) - (tsToMs(a.criadoEm) ?? 0));
        setNaoAtendidos(lista);
      },
      (e) => console.error('Erro ao ouvir leads não atendidos:', e)
    );
    const unsubOk = onSnapshot(
      query(col, where('imobiliariaId', '==', userData.imobiliariaId), where('status', '==', 'aceito')),
      (snap) => {
        const lista = mapDocs(snap)
          .sort((a, b) => (tsToMs(b.aceitoEm) ?? 0) - (tsToMs(a.aceitoEm) ?? 0))
          .slice(0, 50);
        setAceitos(lista);
      },
      (e) => console.error('Erro ao ouvir histórico de aceites:', e)
    );
    return () => { unsubVivo(); unsubNao(); unsubOk(); };
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  // ------------------------------------------------------------------
  // Persistência da config (sempre grava o shape completo via merge)
  // ------------------------------------------------------------------
  const guardaDemo = (): boolean => {
    if (isEspelhoDemo) {
      showToast('Modo demonstração: as alterações não são salvas.', 'info');
      return true;
    }
    return false;
  };

  const persistConfig = async (patch: Partial<AdsConfig>) => {
    if (!userData?.imobiliariaId) return;
    const base = {
      ativo: config?.ativo ?? false,
      corretores: config?.corretores ?? [],
      proximoIndex: config?.proximoIndex ?? 0,
      minutosExclusivo: config?.minutosExclusivo ?? 5,
      minutosGeral: config?.minutosGeral ?? 30,
      imobiliariaId: userData.imobiliariaId,
    };
    await setDoc(doc(db, 'distribuicaoAds', 'config'), { ...base, ...patch, atualizadoEm: serverTimestamp() }, { merge: true });
  };

  const handleToggleAtivo = async () => {
    if (guardaDemo()) return;
    if (!config && !userData?.imobiliariaId) return;
    const novo = !(config?.ativo ?? false);
    try {
      await persistConfig({ ativo: novo });
      showToast(novo ? 'Distribuição ativada.' : 'Distribuição pausada.', 'success');
    } catch (e) {
      console.error('Erro ao alternar distribuição:', e);
      showToast('Não foi possível salvar — tente de novo.', 'error');
    }
  };

  const handleSalvarTempos = async () => {
    if (guardaDemo()) return;
    const exc = Math.max(1, parseInt(minExc || '0', 10) || 5);
    const ger = Math.max(1, parseInt(minGer || '0', 10) || 30);
    setSalvandoCfg(true);
    try {
      await persistConfig({ minutosExclusivo: exc, minutosGeral: ger });
      setMinExc(String(exc));
      setMinGer(String(ger));
      showToast('Tempos salvos.', 'success');
    } catch (e) {
      console.error('Erro ao salvar tempos:', e);
      showToast('Não foi possível salvar — tente de novo.', 'error');
    } finally {
      setSalvandoCfg(false);
    }
  };

  const handleSalvarEscala = async () => {
    if (guardaDemo()) return;
    setSalvandoEscala(true);
    try {
      await persistConfig({ corretores: escala });
      showToast('Escala salva.', 'success');
    } catch (e) {
      console.error('Erro ao salvar escala:', e);
      showToast('Não foi possível salvar a escala — tente de novo.', 'error');
    } finally {
      setSalvandoEscala(false);
    }
  };

  // ------------------------------------------------------------------
  // Rodízio no cliente: transação que escala o lead pro próximo da vez
  // (usada no re-disparo e no lançamento manual — sem depender de function)
  // ------------------------------------------------------------------
  const escalarViaRodizio = async (leadId: string | null, novoLead?: Record<string, any>): Promise<string> => {
    const cfgRef = doc(db, 'distribuicaoAds', 'config');
    let uidEscalado = '';
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(cfgRef);
      const cfg = snap.exists() ? (snap.data() as any) : null;
      const lista: string[] = Array.isArray(cfg?.corretores) ? cfg.corretores : [];
      if (lista.length === 0) throw new Error('escala-vazia');
      const idx = (((Number(cfg?.proximoIndex) || 0) % lista.length) + lista.length) % lista.length;
      uidEscalado = lista[idx];
      const minutos = Number(cfg?.minutosExclusivo) > 0 ? Number(cfg.minutosExclusivo) : 5;
      const agora = Timestamp.now();
      const prazo = Timestamp.fromMillis(agora.toMillis() + minutos * 60000);
      const patch = { status: 'escalado', corretorEscalado: uidEscalado, escaladoEm: agora, prazoAte: prazo };
      if (leadId) {
        tx.update(doc(db, 'adsLeads', leadId), patch);
      } else {
        tx.set(doc(collection(db, 'adsLeads')), { ...novoLead, ...patch, criadoEm: agora });
      }
      tx.set(cfgRef, { proximoIndex: idx + 1, atualizadoEm: serverTimestamp() }, { merge: true });
    });
    return uidEscalado;
  };

  const nomeDoCorretor = (id?: string | null) => (id ? corretores.find((c) => c.id === id)?.nome || id.slice(0, 8) : '—');

  const handleRedisparar = async (lead: AdsLead) => {
    if (guardaDemo()) return;
    setAgindoId(lead.id);
    try {
      const uid = await escalarViaRodizio(lead.id);
      showToast(`Lead re-disparado para ${nomeDoCorretor(uid)}.`, 'success');
    } catch (e: any) {
      console.error('Erro ao re-disparar lead:', e);
      showToast(e?.message === 'escala-vazia' ? 'Nenhum corretor na escala — monte a escala antes.' : 'Não foi possível re-disparar — tente de novo.', 'error');
    } finally {
      setAgindoId(null);
    }
  };

  const handleDescartar = async (lead: AdsLead) => {
    if (guardaDemo()) return;
    const ok = await confirmDialog({
      title: 'Descartar lead',
      message: `Descartar o lead ${lead.nome || 'sem nome'}? Ele sai da lista de não atendidos e não volta pra escala.`,
      danger: true,
      confirmLabel: 'Descartar',
    });
    if (!ok) return;
    setAgindoId(lead.id);
    try {
      await updateDoc(doc(db, 'adsLeads', lead.id), { status: 'descartado' });
      showToast('Lead descartado.', 'success');
    } catch (e) {
      console.error('Erro ao descartar lead:', e);
      showToast('Não foi possível descartar — tente de novo.', 'error');
    } finally {
      setAgindoId(null);
    }
  };

  const handleLancarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardaDemo()) return;
    if (!userData?.imobiliariaId) return;
    const nome = mNome.trim();
    const telefone = mTelefone.replace(/\D/g, '');
    if (!nome) { showToast('Informe o nome do lead.', 'error'); return; }
    if (telefone.length < 10) { showToast('Telefone incompleto — informe DDD + número.', 'error'); return; }
    setLancando(true);
    try {
      const novo: Record<string, any> = {
        nome,
        telefone,
        origem: mOrigem,
        imobiliariaId: userData.imobiliariaId,
      };
      if (mCampanha.trim()) novo.campanhaNome = mCampanha.trim();
      const uid = await escalarViaRodizio(null, novo);
      showToast(`Lead lançado e escalado para ${nomeDoCorretor(uid)}.`, 'success');
      setMNome('');
      setMTelefone('');
      setMCampanha('');
    } catch (err: any) {
      console.error('Erro ao lançar lead manual:', err);
      showToast(err?.message === 'escala-vazia' ? 'Nenhum corretor na escala — monte a escala antes.' : 'Não foi possível lançar o lead — tente de novo.', 'error');
    } finally {
      setLancando(false);
    }
  };

  // ------------------------------------------------------------------
  // Escala: rascunho local (checkbox entra/sai + setas reordenam)
  // ------------------------------------------------------------------
  const toggleNaEscala = (uid: string) => {
    setEscala((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  };

  const moverNaEscala = (uid: string, delta: -1 | 1) => {
    setEscala((prev) => {
      const i = prev.indexOf(uid);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const n = [...prev];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  };

  const escalaSalva = config?.corretores ?? [];
  const escalaSuja = JSON.stringify(escala) !== JSON.stringify(escalaSalva);
  const proximoUid = escalaSalva.length > 0 ? escalaSalva[(config?.proximoIndex ?? 0) % escalaSalva.length] : null;

  // Ordena a listagem: quem está na escala primeiro (na ordem do rodízio), depois o resto
  const listaEscala = useMemo(() => {
    const naEscala = escala
      .map((uid) => corretores.find((c) => c.id === uid))
      .filter((c): c is Corretor => !!c);
    const fora = corretores.filter((c) => !escala.includes(c.id));
    return { naEscala, fora };
  }, [escala, corretores]);

  // ------------------------------------------------------------------
  // Histórico: resumo + mini ranking por corretor
  // ------------------------------------------------------------------
  const resumoHistorico = useMemo(() => {
    const comTempo = aceitos.filter((l) => typeof l.tempoAceiteSeg === 'number');
    const media = comTempo.length > 0 ? comTempo.reduce((s, l) => s + (l.tempoAceiteSeg || 0), 0) / comTempo.length : null;
    const pctGeral = aceitos.length > 0 ? Math.round((aceitos.filter((l) => l.viaGeral).length / aceitos.length) * 100) : null;
    const porCorretor = new Map<string, { nome: string; soma: number; n: number }>();
    comTempo.forEach((l) => {
      const key = l.aceitoPor || l.aceitoPorNome || '?';
      const cur = porCorretor.get(key) || { nome: l.aceitoPorNome || nomeDoCorretor(l.aceitoPor), soma: 0, n: 0 };
      cur.soma += l.tempoAceiteSeg || 0;
      cur.n += 1;
      porCorretor.set(key, cur);
    });
    const ranking = Array.from(porCorretor.values())
      .map((r) => ({ nome: r.nome, media: r.soma / r.n, n: r.n }))
      .sort((a, b) => a.media - b.media)
      .slice(0, 5);
    return { media, pctGeral, ranking };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aceitos, corretores]);

  const carregando = !cfgCarregada || !corrCarregados;
  const inputCls = 'bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50';
  const labelCls = 'block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1';

  return (
    <div className="max-w-4xl mx-auto mt-6 space-y-4 pb-10 px-1">
      {/* 1. Header */}
      <div>
        <span className="gx-tag"><span>Área do administrador</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2">Distribuição de anúncios</h1>
        <p className="text-[12px] text-text-secondary mt-1">
          Os leads que chegam dos anúncios entram aqui e rodam a escala: o próximo corretor da vez recebe o lead
          com exclusividade por alguns minutos; se não aceitar, o lead abre pra distribuição geral e qualquer um
          da escala pode pegar. Configure os tempos, monte a ordem do rodízio e acompanhe tudo ao vivo.
        </p>
      </div>

      {carregando ? (
        <div className="al-card p-6">
          <LoadingState label="Carregando distribuição..." />
        </div>
      ) : (
        <>
          {/* 2. Configurações */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">Configurações</h2>
              <button
                type="button"
                onClick={handleToggleAtivo}
                className={`ml-auto inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-colors ${
                  config?.ativo
                    ? 'bg-[#34D399]/10 border-[#34D399]/40 text-emerald-300'
                    : 'bg-white/[0.04] border-white/15 text-text-secondary hover:border-white/30 hover:text-white'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${config?.ativo ? 'bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-white/25'}`} />
                {config?.ativo ? 'Distribuição ativa' : 'Distribuição pausada'}
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className={labelCls}>Minutos de exclusividade</label>
                <input type="number" min={1} inputMode="numeric" value={minExc} onChange={(e) => setMinExc(e.target.value)} className={`${inputCls} w-28 text-center al-display tabular-nums`} />
              </div>
              <div>
                <label className={labelCls}>Minutos na distribuição geral</label>
                <input type="number" min={1} inputMode="numeric" value={minGer} onChange={(e) => setMinGer(e.target.value)} className={`${inputCls} w-28 text-center al-display tabular-nums`} />
              </div>
              <button
                type="button"
                onClick={handleSalvarTempos}
                disabled={salvandoCfg}
                className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-4 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {salvandoCfg ? 'Salvando...' : 'Salvar tempos'}
              </button>
            </div>
            <p className="text-[10.5px] text-text-secondary mt-2">
              Exclusividade: quanto tempo o corretor da vez tem pra aceitar sozinho. Distribuição geral: quanto tempo o lead
              fica aberto pra todos antes de cair em &quot;não atendidos&quot;.
            </p>
            {!config?.ativo && (
              <p className="text-[11px] font-bold text-[#FFE9A6] mt-2">Distribuição pausada — leads novos de anúncio não serão escalados automaticamente.</p>
            )}
          </div>

          {/* 3. Escala / rodízio */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">Escala do rodízio</h2>
              <span className="ml-auto text-[11px] text-text-secondary tabular-nums">{escala.length} na escala</span>
            </div>
            <p className="text-[10.5px] text-text-secondary mb-3">Marque quem participa e use as setas pra definir a ordem — o rodízio segue exatamente essa sequência.</p>
            <div className="space-y-1.5">
              {listaEscala.naEscala.map((c, i) => {
                const isProximo = proximoUid === c.id;
                return (
                  <div key={c.id} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border ${isProximo ? 'bg-[#E8C547]/[0.06] border-[#E8C547]/35' : 'bg-white/[0.03] border-white/[0.08]'}`}>
                    <button
                      type="button"
                      onClick={() => toggleNaEscala(c.id)}
                      aria-label={`Tirar ${c.nome} da escala`}
                      className="shrink-0 w-5 h-5 rounded border border-[#FF1E56]/60 bg-[#FF1E56]/80 flex items-center justify-center transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.8 9.3L10 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <span className="shrink-0 w-6 text-center al-display text-[13px] font-bold text-[#FF7A97] tabular-nums">{i + 1}º</span>
                    <span className="flex-1 min-w-0 truncate text-[12.5px] font-bold text-white">{c.nome}</span>
                    {isProximo && (
                      <span className={`${chipBase} bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6] shrink-0`}>Próximo da vez</span>
                    )}
                    <div className="shrink-0 flex items-center gap-1">
                      <button type="button" onClick={() => moverNaEscala(c.id, -1)} disabled={i === 0} aria-label="Subir na escala" className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-white disabled:opacity-30 transition-colors flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button type="button" onClick={() => moverNaEscala(c.id, 1)} disabled={i === listaEscala.naEscala.length - 1} aria-label="Descer na escala" className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-white disabled:opacity-30 transition-colors flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
              {listaEscala.naEscala.length === 0 && (
                <p className="text-[12px] text-text-secondary py-1">Ninguém na escala ainda — marque os corretores abaixo.</p>
              )}
              {listaEscala.fora.map((c) => (
                <div key={c.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-white/[0.02] border border-white/[0.05] opacity-70 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => toggleNaEscala(c.id)}
                    aria-label={`Colocar ${c.nome} na escala`}
                    className="shrink-0 w-5 h-5 rounded border border-white/25 bg-white/[0.03] hover:border-[#FF1E56]/60 transition-colors"
                  />
                  <span className="shrink-0 w-6" />
                  <span className="flex-1 min-w-0 truncate text-[12.5px] text-text-secondary">{c.nome}</span>
                  <span className="shrink-0 text-[9.5px] uppercase tracking-wider text-white/25">fora da escala</span>
                </div>
              ))}
              {corretores.length === 0 && (
                <p className="text-[12px] text-text-secondary">Nenhum corretor aprovado na imobiliária.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleSalvarEscala}
                disabled={salvandoEscala || !escalaSuja}
                className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-4 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {salvandoEscala ? 'Salvando...' : 'Salvar escala'}
              </button>
              {escalaSuja && <span className="text-[11px] font-bold text-[#FFE9A6]">alterações não salvas</span>}
            </div>
          </div>

          {/* 4. Ao vivo */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">Ao vivo</h2>
              {aoVivo.length > 0 && (
                <span className="text-[11px] font-semibold text-text-secondary tabular-nums px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]">{aoVivo.length}</span>
              )}
            </div>
            {aoVivo.length === 0 ? (
              <p className="text-[12px] text-text-secondary text-center py-3">Nenhum lead rodando a escala agora — quando um anúncio gerar lead, ele aparece aqui em tempo real.</p>
            ) : (
              <div className="space-y-2">
                {aoVivo.map((l) => {
                  const cd = fmtCountdown(l.prazoAte, nowMs);
                  return (
                    <div key={l.id} className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[13px] font-bold text-white">{l.nome || 'Sem nome'}</span>
                        <span className="text-[12px] text-text-secondary tabular-nums">{fmtTelefone(l.telefone)}</span>
                        <span className={`${chipBase} ${ORIGEM_CHIP[l.origem] || ORIGEM_CHIP.manual}`}>{ORIGEM_LABEL[l.origem] || l.origem}</span>
                        {l.campanhaNome && (
                          <span className={`${chipBase} bg-white/[0.05] border-white/15 text-text-secondary normal-case tracking-normal max-w-[180px] truncate`}>{l.campanhaNome}</span>
                        )}
                        <span className="ml-auto text-[10px] text-text-secondary tabular-nums">{fmtQuando(l.criadoEm)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {l.status === 'escalado' ? (
                          <span className={`${chipBase} bg-[#FF1E56]/10 border-[#FF1E56]/35 text-[#FF7A97]`}>
                            Com {nomeDoCorretor(l.corretorEscalado)} · <span className="tabular-nums">{cd.vencido ? 'prazo vencido' : cd.texto}</span>
                          </span>
                        ) : (
                          <span className={`${chipBase} bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6] animate-pulse`}>
                            Aberto pra todos · <span className="tabular-nums">{cd.texto}</span>
                          </span>
                        )}
                        {l.status === 'geral' && (
                          <button
                            type="button"
                            onClick={() => handleRedisparar(l)}
                            disabled={agindoId === l.id}
                            className="ml-auto border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-[11px] font-bold rounded-xl px-3 py-1.5 transition-colors disabled:opacity-50"
                          >
                            {agindoId === l.id ? 'Disparando...' : 'Re-disparar'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Não atendidos */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">Não atendidos</h2>
              {naoAtendidos.length > 0 && (
                <span className="text-[11px] font-semibold text-red-300 tabular-nums px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">{naoAtendidos.length}</span>
              )}
            </div>
            {naoAtendidos.length === 0 ? (
              <p className="text-[12px] text-text-secondary text-center py-3">Nenhum lead perdido — todos os leads foram aceitos dentro do tempo.</p>
            ) : (
              <div className="space-y-2">
                {naoAtendidos.map((l) => (
                  <div key={l.id} className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[13px] font-bold text-white">{l.nome || 'Sem nome'}</span>
                      <span className="text-[12px] text-text-secondary tabular-nums">{fmtTelefone(l.telefone)}</span>
                      <span className={`${chipBase} ${ORIGEM_CHIP[l.origem] || ORIGEM_CHIP.manual}`}>{ORIGEM_LABEL[l.origem] || l.origem}</span>
                      {l.campanhaNome && (
                        <span className={`${chipBase} bg-white/[0.05] border-white/15 text-text-secondary normal-case tracking-normal max-w-[180px] truncate`}>{l.campanhaNome}</span>
                      )}
                      <span className="ml-auto text-[10px] text-text-secondary tabular-nums">{fmtQuando(l.criadoEm)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`${chipBase} bg-red-500/10 border-red-500/35 text-red-300`}>Ninguém aceitou</span>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRedisparar(l)}
                          disabled={agindoId === l.id}
                          className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white text-[11px] font-bold rounded-xl px-3 py-1.5 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {agindoId === l.id ? 'Disparando...' : 'Re-disparar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDescartar(l)}
                          disabled={agindoId === l.id}
                          className="border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11px] font-bold rounded-xl px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          Descartar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. Histórico */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line-gold" />
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">Histórico de aceites</h2>
              <span className="text-[10px] text-text-secondary">últimos 50</span>
              {resumoHistorico.media !== null && (
                <span className={`${chipBase} bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6] ml-auto`}>Tempo médio: <span className="tabular-nums normal-case">{fmtTempoSeg(resumoHistorico.media)}</span></span>
              )}
              {resumoHistorico.pctGeral !== null && (
                <span className={`${chipBase} bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]`}><span className="tabular-nums">{resumoHistorico.pctGeral}%</span> via geral</span>
              )}
            </div>
            {aceitos.length === 0 ? (
              <p className="text-[12px] text-text-secondary text-center py-3">Nenhum lead aceito ainda — o histórico monta conforme a equipe for aceitando.</p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {aceitos.map((l) => (
                    <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 bg-white/[0.03] border border-white/[0.07]">
                      <span className="text-[12.5px] font-bold text-white min-w-0 truncate max-w-[45%]">{l.nome || 'Sem nome'}</span>
                      <span className={`${chipBase} bg-[#34D399]/10 border-[#34D399]/35 text-emerald-300 normal-case tracking-normal`}>{l.aceitoPorNome || nomeDoCorretor(l.aceitoPor)}</span>
                      <span className="text-[11px] text-text-secondary tabular-nums">{fmtTempoSeg(l.tempoAceiteSeg)}</span>
                      {l.viaGeral && <span className={`${chipBase} bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6]`}>via geral</span>}
                      {l.campanhaNome && (
                        <span className="text-[10px] text-white/35 truncate max-w-[150px]">{l.campanhaNome}</span>
                      )}
                      <span className="ml-auto text-[10px] text-text-secondary tabular-nums">{fmtQuando(l.aceitoEm)}</span>
                    </div>
                  ))}
                </div>
                {resumoHistorico.ranking.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Mais rápidos no gatilho</h3>
                    <div className="flex flex-wrap gap-2">
                      {resumoHistorico.ranking.map((r, i) => (
                        <span key={r.nome + i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-white/[0.04] border border-white/10 text-white">
                          <span className="al-display text-[#FFE9A6] tabular-nums">{i + 1}º</span>
                          <span className="truncate max-w-[120px]">{r.nome}</span>
                          <span className="text-text-secondary tabular-nums font-medium">{fmtTempoSeg(r.media)} · {r.n} lead{r.n > 1 ? 's' : ''}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 7. Lançar manual */}
          <form onSubmit={handleLancarManual} className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em] mb-1">Lançar lead manual</h2>
            <p className="text-[10.5px] text-text-secondary mb-3">Coloque um lead direto na escala — serve também pra testar o rodízio antes de conectar os anúncios.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome</label>
                <input type="text" value={mNome} onChange={(e) => setMNome(e.target.value)} placeholder="Nome do lead" className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className={labelCls}>Telefone</label>
                <input type="tel" inputMode="tel" value={mTelefone} onChange={(e) => setMTelefone(e.target.value)} placeholder="(47) 99999-9999" className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className={labelCls}>Origem</label>
                <select value={mOrigem} onChange={(e) => setMOrigem(e.target.value as 'manual' | 'meta-whatsapp')} className={`${inputCls} w-full`}>
                  <option value="manual" className="bg-[#12101a]">Manual</option>
                  <option value="meta-whatsapp" className="bg-[#12101a]">WhatsApp Meta</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Campanha (opcional)</label>
                <input type="text" value={mCampanha} onChange={(e) => setMCampanha(e.target.value)} placeholder="Nome da campanha" className={`${inputCls} w-full`} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="submit"
                disabled={lancando}
                className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-5 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {lancando ? 'Lançando...' : 'Lançar na escala'}
              </button>
              {escalaSalva.length > 0 && (
                <span className="text-[11px] text-text-secondary">vai pra <b className="text-[#FFE9A6]">{nomeDoCorretor(proximoUid)}</b> (próximo da vez)</span>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
