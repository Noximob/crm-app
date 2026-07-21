"use client";

import React, { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, addDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { contarMeetsVisitasDoCrm } from '@/lib/meetsVisitas';
import { DEMO_REPORT_CORRETORES } from '@/lib/espelho/demoData';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
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
  automatico?: boolean; // true = contadores recalculados das tarefas de Meet e Visita do CRM
  createdAt?: any;
}

const fmtBr = (ymd?: string) => (ymd ? `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}` : '—');

const hojeYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dateToYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function AdminMeetsVisitasPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoMeets[]>([]);
  const [fetching, setFetching] = useState(true);

  // Novo período
  const [novoInicio, setNovoInicio] = useState('');
  const [novoFim, setNovoFim] = useState('');
  const [criando, setCriando] = useState(false);

  // Edição de contadores (rascunho local por período)
  const [drafts, setDrafts] = useState<Record<string, Record<string, number>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [okId, setOkId] = useState<string | null>(null);

  // Modo automático
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [recalcId, setRecalcId] = useState<string | null>(null);
  const [recalcOk, setRecalcOk] = useState<Record<string, number>>({}); // periodoId -> total recalculado
  const autoRecalcFeito = useRef(false);

  // Erros visíveis por card ('novo' = formulário de criação)
  const [erros, setErros] = useState<Record<string, string>>({});
  const setErro = (k: string, msg: string) => setErros((prev) => ({ ...prev, [k]: msg }));
  const limpaErro = (k: string) =>
    setErros((prev) => {
      const n = { ...prev };
      delete n[k];
      return n;
    });

  // Corretores aprovados da imobiliária (mesmo padrão da página de Metas)
  useEffect(() => {
    if (!userData?.imobiliariaId && !isEspelhoDemo) return;
    if (isEspelhoDemo) {
      setCorretores(DEMO_REPORT_CORRETORES.map((c: any) => ({ id: c.uid, nome: c.nome })));
      return;
    }
    const fetchCorretores = async () => {
      const q = query(
        collection(db, 'usuarios'),
        where('imobiliariaId', '==', userData!.imobiliariaId),
        where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria']),
        where('aprovado', '==', true)
      );
      const snapshot = await getDocs(q);
      setCorretores(snapshot.docs.map((d) => ({ id: d.id, nome: d.data().nome })));
    };
    fetchCorretores();
  }, [userData?.imobiliariaId, isEspelhoDemo]);

  const fetchPeriodos = async () => {
    if (isEspelhoDemo) {
      const hoje = new Date();
      const dow = (hoje.getDay() + 6) % 7;
      const seg = new Date(hoje); seg.setDate(hoje.getDate() - dow);
      const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
      setPeriodos([{ id: 'demo', imobiliariaId: 'demo', inicio: dateToYmd(seg), fim: dateToYmd(dom), contadores: Object.fromEntries(DEMO_REPORT_CORRETORES.map((c: any, i: number) => [c.uid, [12, 9, 7, 5][i] ?? 3])) }]);
      setFetching(false);
      return;
    }
    if (!userData?.imobiliariaId) { setFetching(false); return; }
    setFetching(true);
    try {
      const q = query(collection(db, 'meetsVisitas'), where('imobiliariaId', '==', userData.imobiliariaId));
      const snap = await getDocs(q);
      const lista = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }) as PeriodoMeets)
        .sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''));
      setPeriodos(lista);
    } catch (e) {
      console.error('Erro ao buscar períodos de meets & visitas:', e);
      setErro('novo', 'Não foi possível carregar os períodos — recarregue a página.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchPeriodos(); }, [userData?.imobiliariaId, isEspelhoDemo]);

  const statusPeriodo = (p: PeriodoMeets): { label: string; cls: string } => {
    const hoje = hojeYmd();
    if (p.inicio <= hoje && hoje <= p.fim) return { label: 'ATIVO', cls: 'bg-[#34D399]/10 border-[#34D399]/40 text-emerald-300' };
    if (p.fim < hoje) return { label: 'ENCERRADO', cls: 'bg-white/[0.05] border-white/15 text-text-secondary' };
    return { label: 'FUTURO', cls: 'bg-[#7DD3FC]/10 border-[#7DD3FC]/40 text-[#7DD3FC]' };
  };

  const getDraft = (p: PeriodoMeets): Record<string, number> => drafts[p.id] ?? p.contadores ?? {};

  const setContador = (periodoId: string, corretorId: string, valor: number, base: Record<string, number>) => {
    setDrafts((prev) => ({ ...prev, [periodoId]: { ...(prev[periodoId] ?? base), [corretorId]: Math.max(0, valor) } }));
  };

  // ---------------------------------------------------------------------------
  // MODO AUTOMÁTICO — contagem a partir das tarefas de Meet e Visita do CRM
  //
  // Abordagem escolhida: buscamos os leads da imobiliária (where imobiliariaId ==,
  // índice simples automático) e depois lemos a subcoleção leads/{id}/tarefas de
  // cada lead com where('type', 'in', ['Visita', 'Meet']) (índice automático de
  // campo único; uma query só cobre os dois tipos do circuito).
  // NÃO usamos collectionGroup('tarefas') porque os docs de tarefa não têm
  // imobiliariaId/userId: um collectionGroup filtrando type + intervalo de dueDate
  // exigiria índice composto no console E varreria tarefas de todas as imobiliárias
  // (as regras/custos não permitem isolar o tenant). Aqui tudo funciona sem criar
  // índice nenhum. O intervalo de data é filtrado no cliente: dueDate (Timestamp)
  // vira YYYY-MM-DD local e é comparado com [inicio, fim] do período.
  // Tarefas com status 'cancelada' não contam.
  // ---------------------------------------------------------------------------
  // A contagem em si mora em src/lib/meetsVisitas.ts — a home usa a mesma função
  // pro auto-refresh silencioso (períodos automáticos se atualizam sozinhos).
  const contarVisitasDoCrm = (p: PeriodoMeets) => contarMeetsVisitasDoCrm(userData!.imobiliariaId!, p);

  const handleRecalcular = async (p: PeriodoMeets) => {
    if (isEspelhoDemo) return; // demo: botão aparece mas não grava
    if (!userData?.imobiliariaId) return;
    setRecalcId(p.id);
    limpaErro(p.id);
    try {
      const contadores = await contarVisitasDoCrm(p);
      await setDoc(doc(db, 'meetsVisitas', p.id), { contadores, recalculadoEm: serverTimestamp() }, { merge: true });
      setPeriodos((prev) => prev.map((x) => (x.id === p.id ? { ...x, contadores } : x)));
      // descarta rascunho manual antigo desse período — o valor da verdade agora é o CRM
      setDrafts((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
      const total = Object.values(contadores).reduce((s, v) => s + v, 0);
      setRecalcOk((prev) => ({ ...prev, [p.id]: total }));
      setTimeout(() => setRecalcOk((prev) => { const n = { ...prev }; delete n[p.id]; return n; }), 5000);
    } catch (err) {
      console.error('Erro ao recalcular do CRM:', err);
      setErro(p.id, 'Não foi possível recalcular do CRM — tente de novo.');
    } finally {
      setRecalcId(null);
    }
  };

  const handleToggleAutomatico = async (p: PeriodoMeets) => {
    if (isEspelhoDemo) return; // demo: chip aparece mas não grava
    const novo = !p.automatico;
    setTogglingId(p.id);
    limpaErro(p.id);
    try {
      await setDoc(doc(db, 'meetsVisitas', p.id), { automatico: novo }, { merge: true });
      setPeriodos((prev) => prev.map((x) => (x.id === p.id ? { ...x, automatico: novo } : x)));
      if (novo) await handleRecalcular({ ...p, automatico: true }); // ao ligar, já puxa do CRM
    } catch (err) {
      console.error('Erro ao alterar modo automático:', err);
      setErro(p.id, 'Não foi possível salvar — tente de novo.');
    } finally {
      setTogglingId(null);
    }
  };

  // Recalcula sozinho ao abrir a página: períodos automáticos e ATIVOS se
  // retroalimentam do CRM sempre que o admin visita a tela.
  useEffect(() => {
    if (fetching || isEspelhoDemo || autoRecalcFeito.current || !userData?.imobiliariaId) return;
    const ativos = periodos.filter((p) => p.automatico && statusPeriodo(p).label === 'ATIVO');
    if (ativos.length === 0) return;
    autoRecalcFeito.current = true;
    (async () => {
      for (const p of ativos) await handleRecalcular(p);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetching, periodos, isEspelhoDemo, userData?.imobiliariaId]);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEspelhoDemo || !userData?.imobiliariaId || !novoInicio || !novoFim) return;
    limpaErro('novo');
    if (novoFim < novoInicio) {
      setErro('novo', 'A data final não pode ser antes da inicial.');
      return;
    }
    // Impede sobreposição: dois intervalos [a1,a2] e [b1,b2] se cruzam quando a1 <= b2 e b1 <= a2
    const conflito = periodos.find((pp) => novoInicio <= pp.fim && pp.inicio <= novoFim);
    if (conflito) {
      setErro('novo', `Esse intervalo sobrepõe o período ${fmtBr(conflito.inicio)} → ${fmtBr(conflito.fim)}. Ajuste as datas.`);
      return;
    }
    setCriando(true);
    try {
      const ini = novoInicio;
      const fim = novoFim;
      const ref = await addDoc(collection(db, 'meetsVisitas'), {
        imobiliariaId: userData.imobiliariaId,
        inicio: ini,
        fim: fim,
        contadores: {},
        // Nasce AUTOMÁTICO: os contadores vêm das tarefas de Meet/Visita do CRM
        // (o lançamento manual continua disponível desligando o chip).
        automatico: true,
        createdAt: serverTimestamp(),
      });
      setNovoInicio('');
      setNovoFim('');
      await fetchPeriodos();
      // Já nasce com os números do CRM — sem precisar lançar nada na mão
      await handleRecalcular({ id: ref.id, imobiliariaId: userData.imobiliariaId, inicio: ini, fim: fim, contadores: {}, automatico: true });
    } catch (err) {
      console.error('Erro ao criar período:', err);
      setErro('novo', 'Não foi possível criar o período — tente de novo.');
    } finally {
      setCriando(false);
    }
  };

  const handleSalvar = async (p: PeriodoMeets) => {
    if (isEspelhoDemo) return;
    setSavingId(p.id);
    limpaErro(p.id);
    try {
      const contadores = getDraft(p);
      await setDoc(doc(db, 'meetsVisitas', p.id), { contadores }, { merge: true });
      setPeriodos((prev) => prev.map((x) => (x.id === p.id ? { ...x, contadores } : x)));
      setOkId(p.id);
      setTimeout(() => setOkId(null), 1800);
    } catch (err) {
      console.error('Erro ao salvar contadores:', err);
      setErro(p.id, 'Não foi possível salvar — tente de novo.');
    } finally {
      setSavingId(null);
    }
  };

  const handleExcluir = async (p: PeriodoMeets) => {
    if (isEspelhoDemo) { setPeriodos((prev) => prev.filter((x) => x.id !== p.id)); return; }
    if (!(await confirmDialog({ message: `Excluir o período ${fmtBr(p.inicio)} → ${fmtBr(p.fim)}? Os contadores dele somem do histórico dos corretores.`, danger: true, confirmLabel: 'Excluir' }))) return;
    limpaErro(p.id);
    try {
      await deleteDoc(doc(db, 'meetsVisitas', p.id));
      setPeriodos((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      console.error('Erro ao excluir período:', err);
      setErro(p.id, 'Não foi possível excluir — tente de novo.');
    }
  };

  const nomeDoCorretor = (id: string) => corretores.find((c) => c.id === id)?.nome;

  return (
    <div className="max-w-3xl mx-auto mt-6 space-y-4 pb-10">
      <div>
        <span className="gx-tag"><span>Área do administrador</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2">Meets & Visitas</h1>
        <p className="text-[12px] text-text-secondary mt-1">
          Defina o período que está sendo contado — a contagem é <b className="text-white">automática</b>: as tarefas de Meet
          e Visita agendadas no CRM viram o placar sozinhas (atualiza a cada hora, sem lançar nada na mão).
          Quer lançar manualmente? Desliga o chip automático do período. O pódio e o placar da home leem daqui;
          períodos encerrados viram o histórico do corretor.
        </p>
      </div>

      {/* Novo período */}
      <form onSubmit={handleCriar} className="al-card relative overflow-hidden p-4">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em] mb-3">Abrir novo período</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Início</label>
            <input type="date" value={novoInicio} onChange={(e) => setNovoInicio(e.target.value)} required className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">Fim</label>
            <input type="date" value={novoFim} onChange={(e) => setNovoFim(e.target.value)} required className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50" />
          </div>
          <button type="submit" disabled={criando || isEspelhoDemo} className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-5 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50">
            {criando ? 'Criando...' : 'Criar período'}
          </button>
        </div>
        {erros['novo'] && <p className="text-red-300 text-[11.5px] font-bold mt-2">{erros['novo']}</p>}
        <p className="text-[10.5px] text-text-secondary mt-2">
          A semana atual (seg → dom) <b className="text-white">se cria sozinha</b> no modo automático — só crie na mão se quiser
          um intervalo diferente (períodos não podem se sobrepor).
        </p>
      </form>

      {/* Períodos */}
      {fetching ? (
        <div className="al-card p-6">
          <LoadingState label="Carregando períodos..." />
        </div>
      ) : periodos.length === 0 ? (
        <div className="al-card p-6 text-center">
          <p className="text-text-secondary text-sm">Nenhum período criado ainda — abra o primeiro acima.</p>
        </div>
      ) : (
        periodos.map((p) => {
          const st = statusPeriodo(p);
          const auto = !!p.automatico;
          const draft = auto ? (p.contadores ?? {}) : getDraft(p);
          const total = corretores.reduce((s, c) => s + (Number(draft[c.id]) || 0), 0);
          const recalculando = recalcId === p.id;
          // Contadores de corretores que saíram da imobiliária (ids sem cadastro) continuam visíveis p/ auditoria
          const orfaos = Object.keys(p.contadores || {}).filter((id) => !nomeDoCorretor(id));
          return (
            <div key={p.id} className="al-card relative overflow-hidden p-4">
              <div className="absolute inset-x-0 top-0 gx-line-gold" />
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <h3 className="al-display text-[15px] font-bold text-white tabular-nums">{fmtBr(p.inicio)} → {fmtBr(p.fim)}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider border ${st.cls}`}>{st.label}</span>
                <button
                  type="button"
                  onClick={() => handleToggleAutomatico(p)}
                  disabled={togglingId === p.id || recalculando}
                  title={auto
                    ? 'Modo automático ligado: os contadores vêm das tarefas de Meet e Visita agendadas no CRM. Clique para voltar ao lançamento manual.'
                    : 'Ligar modo automático: contar as tarefas de Meet e Visita agendadas no CRM dentro do período.'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider border transition-colors disabled:opacity-50 ${
                    auto
                      ? 'bg-gradient-to-r from-[#E8C547]/15 to-[#34D399]/10 border-[#E8C547]/50 text-[#FFE9A6]'
                      : 'bg-white/[0.04] border-white/15 text-text-secondary hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${auto ? 'bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-white/25'}`} />
                  Automático
                </button>
                <span className="ml-auto text-[11px] text-text-secondary">total do período: <b className="text-[#FFE9A6] al-display text-[14px] tabular-nums">{total}</b></span>
              </div>
              {auto && recalculando && (
                <p className="text-[10.5px] text-text-secondary mb-2 flex items-center gap-1.5">
                  <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-[#E8C547]" />
                  Recalculando meets e visitas do CRM...
                </p>
              )}
              <div className="space-y-1.5">
                {corretores.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-1.5 bg-white/[0.03] border border-white/[0.07]">
                    <span className="flex-1 min-w-0 truncate text-[12.5px] font-bold text-white">{c.nome}</span>
                    <input
                      type="number"
                      min={0}
                      value={draft[c.id] ?? 0}
                      disabled={auto}
                      title={auto ? 'Contador automático: vem das tarefas de Meet e Visita do CRM. Desligue o modo automático para editar à mão.' : undefined}
                      onChange={(e) => setContador(p.id, c.id, parseInt(e.target.value || '0', 10) || 0, p.contadores || {})}
                      className="w-20 text-center bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-white al-display text-[15px] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#E8C547]/50 focus:border-[#E8C547]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-[9.5px] uppercase tracking-wider text-text-secondary w-14">agend.</span>
                  </div>
                ))}
                {corretores.length === 0 && (
                  <p className="text-[12px] text-text-secondary">Nenhum corretor aprovado na imobiliária.</p>
                )}
                {orfaos.length > 0 && (
                  <p className="text-[10px] text-white/35">+{orfaos.length} contador(es) de corretor(es) que não está(ão) mais na equipe (preservados no histórico).</p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                {auto ? (
                  <button type="button" onClick={() => handleRecalcular(p)} disabled={recalculando || isEspelhoDemo} className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-4 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50">
                    {recalculando ? 'Recalculando...' : 'Recalcular do CRM'}
                  </button>
                ) : (
                  <button type="button" onClick={() => handleSalvar(p)} disabled={savingId === p.id || isEspelhoDemo} className="bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 text-[#181203] font-bold rounded-xl px-4 py-2 shadow-[0_8px_24px_-8px_rgba(232,197,71,0.5)] active:scale-[0.98] transition-all disabled:opacity-50">
                    {savingId === p.id ? 'Salvando...' : 'Salvar contadores'}
                  </button>
                )}
                {okId === p.id && <span className="text-emerald-300 text-[12px] font-bold">✓ salvo</span>}
                {recalcOk[p.id] !== undefined && (
                  <span className="text-emerald-300 text-[12px] font-bold">✓ recalculado · total {recalcOk[p.id]}</span>
                )}
                <button type="button" onClick={() => handleExcluir(p)} className="ml-auto border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 font-bold rounded-xl px-4 py-2 transition-colors">
                  Excluir período
                </button>
              </div>
              {erros[p.id] && <p className="text-red-300 text-[11.5px] font-bold mt-2">{erros[p.id]}</p>}
            </div>
          );
        })
      )}
    </div>
  );
}
