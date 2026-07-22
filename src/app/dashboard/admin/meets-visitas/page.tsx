"use client";

/**
 * Meets & Visitas — 100% AUTOMÁTICO.
 * A contagem vem das tarefas de Meet e Visita agendadas no CRM; a semana atual
 * (seg → dom) se cria sozinha e o placar se atualiza a cada hora pela home.
 * Aqui o admin só ENXERGA: as datas do período (editáveis, se quiser um
 * intervalo diferente) e o contador de cada corretor. Histórico embaixo.
 */
import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { DEMO_REPORT_CORRETORES } from '@/lib/espelho/demoData';
import { garantirPeriodoSemanaAtual, recalcularPeriodoMeets, listarAgendamentosDoCorretor, type AgendamentoContado } from '@/lib/meetsVisitas';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';

interface Corretor {
  id: string;
  nome: string;
}

interface PeriodoMeets {
  id: string;
  imobiliariaId: string;
  inicio: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
  contadores: Record<string, number>;
  automatico?: boolean;
  recalculadoEm?: any;
}

const fmtBr = (ymd?: string) => (ymd ? `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}` : '—');

const hojeYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dateToYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtRecalculado = (r: any): string => {
  const ms = r?.toMillis ? r.toMillis() : (typeof r?.seconds === 'number' ? r.seconds * 1000 : null);
  if (ms === null) return 'ainda não contado';
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 2) return 'atualizado agora';
  if (min < 60) return `atualizado há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `atualizado há ${h} h`;
  return `atualizado há ${Math.floor(h / 24)} d`;
};

const MEDALHA = ['🥇', '🥈', '🥉'];

export default function AdminMeetsVisitasPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoMeets[]>([]);
  const [fetching, setFetching] = useState(true);
  const [recalcId, setRecalcId] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  // Auditoria do contador: corretor expandido no placar atual + agendamentos que contaram
  const [provaAberta, setProvaAberta] = useState<string | null>(null);
  const [provas, setProvas] = useState<Record<string, { dentro: AgendamentoContado[]; fora: AgendamentoContado[] } | 'carregando'>>({});

  // Edição das datas do período atual (opcional — o normal é deixar a semana automática)
  const [editIni, setEditIni] = useState('');
  const [editFim, setEditFim] = useState('');
  const [salvandoDatas, setSalvandoDatas] = useState(false);
  const [erroDatas, setErroDatas] = useState('');

  // Quem aparece no COLETIVO (placar/pódio). uids ocultos ficam de fora do
  // ranking — mas o número pessoal de cada um continua na home dele.
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());
  const [ocultosConfig, setOcultosConfig] = useState(false);

  // ------------------------------------------------------------------
  // Carga: corretores + períodos (garantindo que a semana atual existe)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!userData?.imobiliariaId && !isEspelhoDemo) return;
    if (isEspelhoDemo) {
      setCorretores(DEMO_REPORT_CORRETORES.map((c: any) => ({ id: c.uid, nome: c.nome })));
      return;
    }
    getDocs(query(
      collection(db, 'usuarios'),
      where('imobiliariaId', '==', userData!.imobiliariaId),
      where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria']),
      where('aprovado', '==', true)
    )).then((snap) => setCorretores(snap.docs.map((d) => ({ id: d.id, nome: d.data().nome }))));
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  const carregarPeriodos = async (garantir = false) => {
    if (isEspelhoDemo) {
      const hoje = new Date();
      const seg = new Date(hoje); seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
      const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
      const segAnt = new Date(seg); segAnt.setDate(seg.getDate() - 7);
      const domAnt = new Date(segAnt); domAnt.setDate(segAnt.getDate() + 6);
      setPeriodos([
        { id: 'demo-atual', imobiliariaId: 'demo', inicio: dateToYmd(seg), fim: dateToYmd(dom), automatico: true, contadores: Object.fromEntries(DEMO_REPORT_CORRETORES.map((c: any, i: number) => [c.uid, [12, 9, 7, 5, 4, 2][i] ?? 1])) },
        { id: 'demo-ant', imobiliariaId: 'demo', inicio: dateToYmd(segAnt), fim: dateToYmd(domAnt), automatico: true, contadores: Object.fromEntries(DEMO_REPORT_CORRETORES.map((c: any, i: number) => [c.uid, [9, 11, 5, 6, 2, 3][i] ?? 1])) },
      ]);
      setFetching(false);
      return;
    }
    if (!userData?.imobiliariaId) { setFetching(false); return; }
    try {
      const buscar = async () => {
        const snap = await getDocs(query(collection(db, 'meetsVisitas'), where('imobiliariaId', '==', userData.imobiliariaId)));
        return snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }) as PeriodoMeets)
          .sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''));
      };
      let lista = await buscar();
      if (garantir) {
        // Semana atual se cria sozinha (e já conta) se nenhum período cobre hoje
        await garantirPeriodoSemanaAtual(userData.imobiliariaId, lista);
        lista = await buscar();
      }
      setPeriodos(lista);
    } catch (e) {
      console.error('Erro ao buscar períodos de meets & visitas:', e);
      showToast('Não foi possível carregar — recarregue a página.', 'error');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { carregarPeriodos(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userData?.imobiliariaId, isEspelhoDemo]);

  // Config de quem aparece no coletivo (lista de uids ocultos)
  useEffect(() => {
    if (isEspelhoDemo || !userData?.imobiliariaId) return;
    getDoc(doc(db, 'meetsVisitasConfig', userData.imobiliariaId))
      .then((snap) => {
        const arr = snap.exists() ? (snap.data() as any).ocultos : [];
        setOcultos(new Set(Array.isArray(arr) ? arr : []));
      })
      .catch((e) => console.error('Erro ao carregar config do coletivo:', e));
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  const toggleOculto = async (uid: string) => {
    if (guardaDemo() || !userData?.imobiliariaId) return;
    const novo = new Set(ocultos);
    if (novo.has(uid)) novo.delete(uid); else novo.add(uid);
    setOcultos(novo);
    try {
      await setDoc(doc(db, 'meetsVisitasConfig', userData.imobiliariaId), { ocultos: Array.from(novo) }, { merge: true });
    } catch (e) {
      console.error('Erro ao salvar config do coletivo:', e);
      showToast('Não foi possível salvar — tente de novo.', 'error');
    }
  };

  const hoje = hojeYmd();
  const atual = periodos.find((p) => p.inicio <= hoje && hoje <= p.fim) ?? null;
  const historico = periodos.filter((p) => p.id !== atual?.id);

  // Números sempre FRESCOS pro admin: recalcula sozinho ao abrir se a última
  // contagem passou de 10 min (remarcações pra fora da semana somem na hora).
  const recontouAoAbrir = React.useRef(false);
  useEffect(() => {
    if (isEspelhoDemo || !userData?.imobiliariaId || !atual || recontouAoAbrir.current) return;
    const r: any = atual.recalculadoEm;
    const ms = r?.toMillis ? r.toMillis() : (typeof r?.seconds === 'number' ? r.seconds * 1000 : 0);
    if (Date.now() - ms < 10 * 60 * 1000) { recontouAoAbrir.current = true; return; }
    recontouAoAbrir.current = true;
    recalcularPeriodoMeets(userData.imobiliariaId, atual)
      .then((contadores) => setPeriodos((prev) => prev.map((x) => (x.id === atual.id ? { ...x, contadores, recalculadoEm: { toMillis: () => Date.now() } } : x))))
      .catch((e) => console.error('Recontagem ao abrir falhou:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual?.id, isEspelhoDemo, userData?.imobiliariaId]);

  /** Abre/fecha a PROVA do contador de um corretor (lista o que entrou na conta). */
  const toggleProva = async (corretorId: string) => {
    if (provaAberta === corretorId) { setProvaAberta(null); return; }
    setProvaAberta(corretorId);
    if (!atual || provas[corretorId] || isEspelhoDemo || !userData?.imobiliariaId) return;
    setProvas((prev) => ({ ...prev, [corretorId]: 'carregando' }));
    try {
      const resultado = await listarAgendamentosDoCorretor(userData.imobiliariaId, corretorId, atual);
      setProvas((prev) => ({ ...prev, [corretorId]: resultado }));
    } catch (e) {
      console.error('Erro ao listar agendamentos do corretor:', e);
      setProvas((prev) => { const n = { ...prev }; delete n[corretorId]; return n; });
      showToast('Não foi possível listar os agendamentos — tente de novo.', 'error');
    }
  };

  // Sincroniza os inputs de data quando o período atual muda
  useEffect(() => {
    setEditIni(atual?.inicio ?? '');
    setEditFim(atual?.fim ?? '');
    setErroDatas('');
  }, [atual?.id, atual?.inicio, atual?.fim]);

  const datasMudaram = !!atual && (editIni !== atual.inicio || editFim !== atual.fim);

  // ------------------------------------------------------------------
  // Ações
  // ------------------------------------------------------------------
  const guardaDemo = (): boolean => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return true; }
    return false;
  };

  const recalcular = async (p: PeriodoMeets) => {
    if (guardaDemo() || !userData?.imobiliariaId) return;
    setRecalcId(p.id);
    try {
      // Recontar já torna o período automático (o modo manual não existe mais)
      await setDoc(doc(db, 'meetsVisitas', p.id), { automatico: true }, { merge: true });
      const contadores = await recalcularPeriodoMeets(userData.imobiliariaId, p);
      setPeriodos((prev) => prev.map((x) => (x.id === p.id ? { ...x, contadores, automatico: true, recalculadoEm: { toMillis: () => Date.now() } } : x)));
      setProvas({}); // a lista de prova pode ter mudado junto
      const total = Object.values(contadores).reduce((s, v) => s + v, 0);
      showToast(`Contagem atualizada: ${total} agendamento${total === 1 ? '' : 's'} no período.`, 'success');
    } catch (e) {
      console.error('Erro ao recalcular:', e);
      showToast('Não foi possível recontar — tente de novo.', 'error');
    } finally {
      setRecalcId(null);
    }
  };

  const salvarDatas = async () => {
    if (!atual || guardaDemo() || !userData?.imobiliariaId) return;
    if (!editIni || !editFim || editFim < editIni) { setErroDatas('A data final não pode ser antes da inicial.'); return; }
    const conflito = periodos.find((pp) => pp.id !== atual.id && editIni <= pp.fim && pp.inicio <= editFim);
    if (conflito) { setErroDatas(`Sobrepõe o período ${fmtBr(conflito.inicio)} → ${fmtBr(conflito.fim)}.`); return; }
    setSalvandoDatas(true);
    setErroDatas('');
    try {
      await setDoc(doc(db, 'meetsVisitas', atual.id), { inicio: editIni, fim: editFim, automatico: true }, { merge: true });
      await recalcularPeriodoMeets(userData.imobiliariaId, { ...atual, inicio: editIni, fim: editFim });
      await carregarPeriodos();
      showToast('Datas salvas e contagem refeita pro novo intervalo.', 'success');
    } catch (e) {
      console.error('Erro ao salvar datas:', e);
      showToast('Não foi possível salvar as datas — tente de novo.', 'error');
    } finally {
      setSalvandoDatas(false);
    }
  };

  const excluir = async (p: PeriodoMeets) => {
    if (guardaDemo()) return;
    const ok = await confirmDialog({
      title: 'Excluir período?',
      message: `Apaga o placar de ${fmtBr(p.inicio)} → ${fmtBr(p.fim)}. O histórico dos corretores perde essa semana.`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'meetsVisitas', p.id));
      setPeriodos((prev) => prev.filter((x) => x.id !== p.id));
      showToast('Período excluído.', 'success');
    } catch (e) {
      console.error('Erro ao excluir período:', e);
      showToast('Não foi possível excluir — tente de novo.', 'error');
    }
  };

  const nomeDe = (uid: string) => corretores.find((c) => c.id === uid)?.nome || 'Corretor';

  /** Linhas do placar: corretores DO COLETIVO (ocultos ficam de fora), maiores primeiro. */
  const linhasDe = (p: PeriodoMeets) => {
    const cont = p.contadores || {};
    const ids = new Set<string>([...corretores.map((c) => c.id), ...Object.keys(cont)]);
    return Array.from(ids)
      .filter((id) => !ocultos.has(id))
      .map((id) => ({ id, nome: nomeDe(id), n: cont[id] || 0 }))
      .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR'));
  };

  const totalDe = (p: PeriodoMeets) =>
    Object.entries(p.contadores || {}).reduce((s, [uid, v]) => s + (ocultos.has(uid) ? 0 : v), 0);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const inputCls = 'px-3 py-2 bg-white/[0.04] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50';

  return (
    <div className="max-w-3xl mx-auto mt-6 space-y-4 pb-10">
      <div>
        <span className="gx-tag"><span>Área do administrador</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2">Meets & Visitas</h1>
        <p className="text-[12px] text-text-secondary mt-1">
          Tudo automático: a semana (seg → dom) se cria sozinha e o placar conta as tarefas de Meet e Visita
          agendadas no CRM, atualizando a cada hora. Só mexa nas datas se quiser um intervalo diferente.
        </p>
      </div>

      {fetching ? (
        <div className="al-card p-6"><LoadingState label="Carregando placar..." /></div>
      ) : (
        <>
          {/* Quem aparece no coletivo — tira sócios / conta da imobiliária do ranking */}
          {!isEspelhoDemo && corretores.length > 0 && (
            <div className="al-card relative overflow-hidden p-4">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <button type="button" onClick={() => setOcultosConfig(v => !v)} className="w-full flex items-center gap-2 text-left">
                <span className="text-[13px]">👁️</span>
                <span className="al-display text-[13px] font-bold text-white uppercase tracking-[0.12em]">Quem aparece no coletivo</span>
                {ocultos.size > 0 && <span className="text-[10px] font-bold text-text-secondary tabular-nums px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08]">{ocultos.size} fora</span>}
                <span className={`ml-auto text-[10px] shrink-0 transition-transform ${ocultosConfig ? 'rotate-90 text-[#FF9EB5]' : 'text-white/30'}`}>▶</span>
              </button>
              {ocultosConfig && (
                <>
                  <p className="text-[10.5px] text-text-secondary mt-2 mb-2.5">
                    Desmarque quem não deve entrar no ranking (sócios, conta da imobiliária…). O número pessoal de cada um continua na home dele — isso é só a visão coletiva.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {corretores.map((c) => {
                      const dentro = !ocultos.has(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleOculto(c.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            dentro
                              ? 'bg-[#34D399]/10 border-[#34D399]/40 text-emerald-300'
                              : 'bg-white/[0.03] border-white/12 text-white/40 line-through'
                          }`}
                        >
                          {dentro ? '✓ ' : ''}{c.nome}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Período atual — datas (editáveis) + contadores */}
          {!atual ? (
            <div className="al-card relative overflow-hidden p-5">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <p className="text-sm text-text-secondary">
                Nenhum período cobre hoje — a semana atual se cria sozinha assim que alguém abrir a home. Recarregue em instantes.
              </p>
            </div>
          ) : (
            <div className="al-card relative overflow-hidden p-5">
              <div className="absolute inset-x-0 top-0 gx-line-gold" />
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.12em]">Período atual</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border bg-[#34D399]/10 border-[#34D399]/40 text-emerald-300">Ativo · automático</span>
                <span className="ml-auto text-[10px] text-text-secondary">{fmtRecalculado(atual.recalculadoEm)}</span>
              </div>

              <div className="flex flex-wrap items-end gap-2 mb-4">
                <label className="flex flex-col gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-text-secondary">
                  Início
                  <input type="date" value={editIni} onChange={(e) => setEditIni(e.target.value)} className={inputCls} />
                </label>
                <span className="pb-2.5 text-white/30">→</span>
                <label className="flex flex-col gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-text-secondary">
                  Fim
                  <input type="date" value={editFim} onChange={(e) => setEditFim(e.target.value)} className={inputCls} />
                </label>
                {datasMudaram && (
                  <button
                    onClick={salvarDatas}
                    disabled={salvandoDatas}
                    className="px-4 py-2 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white rounded-xl font-bold shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {salvandoDatas ? 'Salvando…' : 'Salvar datas'}
                  </button>
                )}
                <button
                  onClick={() => recalcular(atual)}
                  disabled={recalcId === atual.id}
                  className="ml-auto px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white transition-colors disabled:opacity-50"
                  title="A contagem se atualiza sozinha a cada hora — esse botão só adianta o relógio."
                >
                  {recalcId === atual.id ? 'Contando…' : '↻ Atualizar agora'}
                </button>
              </div>
              {erroDatas && <p className="text-[11px] font-bold text-[#FF9EB5] -mt-2 mb-3">{erroDatas}</p>}

              <div className="space-y-1.5">
                {linhasDe(atual).map((l, i) => {
                  const max = Math.max(1, ...linhasDe(atual).map((x) => x.n));
                  const aberto = provaAberta === l.id;
                  const prova = provas[l.id];
                  return (
                    <div key={l.id} className="rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleProva(l.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
                        title="Clique pra ver exatamente quais agendamentos entraram na conta"
                      >
                        <span className="w-6 shrink-0 text-center text-[13px]">{l.n > 0 ? (MEDALHA[i] ?? '') : ''}</span>
                        <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-white">{l.nome}</span>
                        <div className="hidden sm:block w-40 h-1.5 rounded bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded bg-gradient-to-r from-[#E8C547] to-[#F59E0B] transition-all duration-500" style={{ width: `${(l.n / max) * 100}%` }} />
                        </div>
                        <span className="al-display text-[20px] font-bold text-[#FFE9A6] tabular-nums w-10 text-right">{l.n}</span>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-text-secondary">agend.</span>
                        <span className={`text-[9px] shrink-0 transition-transform ${aberto ? 'rotate-90 text-[#FF9EB5]' : 'text-white/25'}`}>▶</span>
                      </button>
                      {aberto && (
                        <div className="px-3 pb-2.5 pt-2 border-t border-white/[0.05] space-y-1">
                          {isEspelhoDemo ? (
                            <p className="text-[10.5px] text-text-secondary">Modo demonstração — a lista real aparece na conta de verdade.</p>
                          ) : prova === 'carregando' || prova === undefined ? (
                            <p className="text-[10.5px] text-text-secondary">Conferindo os agendamentos…</p>
                          ) : (
                            <>
                              {prova.dentro.length === 0 ? (
                                <p className="text-[10.5px] text-text-secondary">Nenhum Meet/Visita com data dentro do período.</p>
                              ) : (
                                prova.dentro.map((ag, k) => {
                                  const d = new Date(ag.dueMs);
                                  const quando = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                  return (
                                    <div key={k} className="flex items-center gap-2 text-[11.5px]">
                                      <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wider border ${ag.tipo === 'Meet' ? 'bg-[#9F6BFF]/10 border-[#9F6BFF]/35 text-[#C4A6FF]' : 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]'}`}>{ag.tipo}</span>
                                      <span className="shrink-0 text-white/60 tabular-nums">{quando}</span>
                                      <span className="flex-1 min-w-0 truncate text-white/85" title={ag.descricao}>{ag.leadNome}</span>
                                      <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider ${ag.status === 'concluída' ? 'text-emerald-300' : 'text-[#FFE9A6]/70'}`}>{ag.status === 'concluída' ? '✓ feito' : 'agendado'}</span>
                                    </div>
                                  );
                                })
                              )}
                              {prova.fora.length > 0 && (
                                <div className="pt-1.5 mt-1 border-t border-white/[0.05]">
                                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/35 mb-1">Marcados pra depois — contam na semana deles</p>
                                  {prova.fora.map((ag, k) => {
                                    const d = new Date(ag.dueMs);
                                    const quando = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                    return (
                                      <div key={k} className="flex items-center gap-2 text-[11px] opacity-55">
                                        <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wider border bg-white/[0.04] border-white/15 text-white/60">{ag.tipo}</span>
                                        <span className="shrink-0 text-white/60 tabular-nums">{quando}</span>
                                        <span className="flex-1 min-w-0 truncate text-white/70" title={ag.descricao}>{ag.leadNome}</span>
                                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-white/40">fora da semana</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {prova.dentro.length !== l.n && (
                                <p className="text-[10px] font-bold text-[#FFE9A6] pt-1">
                                  ⚠️ A lista mostra {prova.dentro.length} e o contador {l.n} — houve remarcação depois da última contagem. Clique em &quot;↻ Atualizar agora&quot; que acerta.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-right text-[11px] text-text-secondary mt-2">
                total do período: <b className="text-[#FFE9A6] tabular-nums">{totalDe(atual)}</b>
              </p>
              <p className="text-[10px] text-white/30 mt-1">
                Conta agendamentos de Meet e Visita com data DENTRO do período — feitos e por vir. Remarcou pra fora da semana? Sai da conta na próxima atualização. Clique num corretor pra ver a lista exata.
              </p>
            </div>
          )}

          {/* Histórico — semanas anteriores (e períodos futuros, se houver) */}
          {historico.length > 0 && (
            <div className="al-card relative overflow-hidden p-5">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.12em] mb-3">Histórico</h2>
              <div className="space-y-1.5">
                {historico.map((p) => {
                  const aberto = expandido === p.id;
                  const futuro = p.inicio > hoje;
                  return (
                    <div key={p.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button onClick={() => setExpandido(aberto ? null : p.id)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                          <span className={`text-[9px] shrink-0 transition-transform ${aberto ? 'rotate-90 text-[#FF9EB5]' : 'text-white/30'}`}>▶</span>
                          <span className="text-[12.5px] font-bold text-white tabular-nums">{fmtBr(p.inicio)} → {fmtBr(p.fim)}</span>
                          {futuro && <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wider border bg-[#7DD3FC]/10 border-[#7DD3FC]/40 text-[#7DD3FC]">futuro</span>}
                          <span className="ml-auto text-[11px] text-text-secondary tabular-nums shrink-0">total: <b className="text-white">{totalDe(p)}</b></span>
                        </button>
                        <button
                          onClick={() => recalcular(p)}
                          disabled={recalcId === p.id}
                          className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold text-text-secondary border border-white/10 bg-white/[0.03] hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                          title="Recontar do CRM as tarefas desse intervalo"
                        >
                          {recalcId === p.id ? '…' : '↻'}
                        </button>
                        <button
                          onClick={() => excluir(p)}
                          className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold text-[#FF8F8F] border border-[#FF6B6B]/25 bg-[#FF6B6B]/[0.05] hover:bg-[#FF6B6B]/15 transition-colors"
                          title="Excluir o período"
                        >
                          🗑
                        </button>
                      </div>
                      {aberto && (
                        <div className="px-3 pb-2.5 space-y-1 border-t border-white/[0.05] pt-2">
                          {linhasDe(p).map((l, i) => (
                            <div key={l.id} className="flex items-center gap-2 text-[12px]">
                              <span className="w-5 text-center text-[11px]">{l.n > 0 ? (MEDALHA[i] ?? '') : ''}</span>
                              <span className="flex-1 min-w-0 truncate text-white/80">{l.nome}</span>
                              <span className="al-display text-[14px] font-bold text-[#FFE9A6] tabular-nums">{l.n}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
