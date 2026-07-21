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
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { DEMO_REPORT_CORRETORES } from '@/lib/espelho/demoData';
import { garantirPeriodoSemanaAtual, recalcularPeriodoMeets } from '@/lib/meetsVisitas';
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

  // Edição das datas do período atual (opcional — o normal é deixar a semana automática)
  const [editIni, setEditIni] = useState('');
  const [editFim, setEditFim] = useState('');
  const [salvandoDatas, setSalvandoDatas] = useState(false);
  const [erroDatas, setErroDatas] = useState('');

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

  const hoje = hojeYmd();
  const atual = periodos.find((p) => p.inicio <= hoje && hoje <= p.fim) ?? null;
  const historico = periodos.filter((p) => p.id !== atual?.id);

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

  /** Linhas do placar: todos os corretores (0 incluso), maiores primeiro. */
  const linhasDe = (p: PeriodoMeets) => {
    const cont = p.contadores || {};
    const ids = new Set<string>([...corretores.map((c) => c.id), ...Object.keys(cont)]);
    return Array.from(ids)
      .map((id) => ({ id, nome: nomeDe(id), n: cont[id] || 0 }))
      .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR'));
  };

  const totalDe = (p: PeriodoMeets) => Object.values(p.contadores || {}).reduce((s, v) => s + v, 0);

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
                  return (
                    <div key={l.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2">
                      <span className="w-6 shrink-0 text-center text-[13px]">{l.n > 0 ? (MEDALHA[i] ?? '') : ''}</span>
                      <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-white">{l.nome}</span>
                      <div className="hidden sm:block w-40 h-1.5 rounded bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded bg-gradient-to-r from-[#E8C547] to-[#F59E0B] transition-all duration-500" style={{ width: `${(l.n / max) * 100}%` }} />
                      </div>
                      <span className="al-display text-[20px] font-bold text-[#FFE9A6] tabular-nums w-10 text-right">{l.n}</span>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-text-secondary">agend.</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-right text-[11px] text-text-secondary mt-2">
                total do período: <b className="text-[#FFE9A6] tabular-nums">{totalDe(atual)}</b>
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
