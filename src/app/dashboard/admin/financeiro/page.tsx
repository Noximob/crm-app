'use client';

/**
 * FINANCEIRO — "quanto a gente ganha de verdade em cada venda e no mês".
 *
 * Nasce da consultoria de 28/07/2026: DRE mensal, margem real por venda,
 * progressão do corretor (faixas marginais por trimestre), retenção de lead,
 * custos fixos com meta por linha e meta de VGV.
 *
 * Fluxo em 2 passos: o corretor fecha a venda no pop-up do atendimento
 * (passo 1 → doc em `vendas` com status pendente_confirmacao) e o admin
 * completa gerente/SDR/agenciador/permuta AQUI e oficializa o rateio (passo 2).
 * Nada conta em DRE/meta antes de oficializado.
 *
 * Toda a matemática mora em src/lib/financeiro.ts (pura e testada).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, doc, onSnapshot, query, where, getDocs, writeBatch, setDoc,
  addDoc, deleteDoc, serverTimestamp, Timestamp, arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import LoadingState from '@/components/ui/LoadingState';
import { showToast } from '@/components/ui/toast';
import MoneyInput from '@/components/MoneyInput';
import {
  CONFIG_FINANCEIRO_DEFAULT, PENDENCIAS_CONFIG, type ConfigFinanceiro, type Venda,
  type Beneficiario, type StatusNota, type FaixaComissao, type OrigemVenda, type TipoProduto,
  calcularRateio, montarBeneficiarios, recalcularTrimestre, tabelaVigente, vgvLiquidoDe,
  percComissaoPadrao, trimestreDe, labelTrimestre, mesDe, hojeYMD, round2,
  fmtBRL, fmtBRL2, fmtPctBR,
} from '@/lib/financeiro';

// ---------------------------------------------------------------------------
// Moldes visuais da casa (padrão admin/relatorios)
// ---------------------------------------------------------------------------

function Secao({ titulo, sub, children, acao }: { titulo: string; sub?: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="al-card relative overflow-hidden p-4 sm:p-5">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.1em]">{titulo}</h2>
          {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, valor, tom, hint }: { label: string; valor: React.ReactNode; tom?: string; hint?: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
      <p className={`al-display text-[19px] font-bold tabular-nums leading-tight ${tom || 'text-white'}`}>{valor}</p>
      {hint && <p className="text-[10px] text-text-secondary mt-0.5">{hint}</p>}
    </div>
  );
}

function Barra({ pct, cor, alt = 'h-2' }: { pct: number; cor: string; alt?: string }) {
  return (
    <div className={`${alt} rounded-full bg-white/[0.07] overflow-hidden`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(1, Math.min(100, pct * 100))}%`, background: cor }} />
    </div>
  );
}

/** CountUp da casa, com formatador (pra dinheiro animar formatado). */
function CountUpFmt({ n, fmt, className = '' }: { n: number; fmt?: (v: number) => string; className?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const dur = 850;
    const step = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setV(n * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <span className={className}>{fmt ? fmt(v) : Math.round(v).toLocaleString('pt-BR')}</span>;
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40 transition';
const btnOuro = 'px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors';

const ORIGEM_LABEL: Record<string, string> = { lead: 'Lead', carteira: 'Carteira', ligacao_ativa: 'Ligação ativa', outro: 'Outro' };
const PRODUTO_LABEL: Record<string, string> = { lancamento: 'Lançamento', pronto: 'Pronto', pronto_carteira: 'Pronto (carteira)' };
const STATUS_LABEL: Record<string, string> = { pre_reserva: 'Pré-reserva', pendente_confirmacao: 'Pendente', assinada: 'Assinada', distratada: 'Distratada' };
const STATUS_COR: Record<string, string> = {
  pre_reserva: 'bg-white/[0.05] border-white/15 text-text-secondary',
  pendente_confirmacao: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
  assinada: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
  distratada: 'bg-rose-500/10 border-rose-500/40 text-rose-300',
};

interface UsuarioMin { id: string; nome: string; tipoConta?: string }
interface CustoFixo { id: string; imobiliariaId: string; mes: string; categoria: string; valor: number }
interface MetaDoc { valor?: number; metaUnidades?: number; inicio?: string; fim?: string }

const mesAtualYM = () => hojeYMD().slice(0, 7);
const addMesesYM = (ym: string, n: number) => {
  const [a, m] = ym.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const labelMes = (ym: string) => {
  const [a, m] = ym.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// ── Demo (modo Espelho): números de exemplo, nada é salvo ──
function demoVendas(imobId: string): Venda[] {
  const hoje = hojeYMD();
  const ym = mesAtualYM();
  const mk = (id: string, dias: string, extra: Partial<Venda>): Venda => ({
    id, imobiliariaId: imobId, corretorUid: 'demo-1', corretorNome: 'Ana Corretora',
    valorBruto: 800_000, valorPermuta: 0, parceriaPct: 0, tipoProduto: 'lancamento',
    origem: 'carteira', status: 'assinada', dataVenda: dias, percComissao: 5,
    leadNome: 'Cliente Exemplo', empreendimento: 'Orla da Barra', construtora: 'SANTER', ...extra,
  });
  const lista = [
    mk('d1', `${ym}-05`, { leadNome: 'Beatriz Souza', origem: 'lead', valorBruto: 750_000 }),
    mk('d2', `${ym}-12`, { leadNome: 'Carlos Melo', valorBruto: 900_000, tipoProduto: 'pronto', percComissao: 6 }),
    mk('d3', `${addMesesYM(ym, -1)}-20`, { leadNome: 'Duda Reis', corretorUid: 'demo-2', corretorNome: 'Bruno Corretor', valorBruto: 1_300_000, valorPermuta: 200_000 }),
    mk('d4', hoje, { leadNome: 'Eduardo Lima', status: 'pendente_confirmacao', valorBruto: 650_000, origem: 'lead' }),
  ];
  // passa o demo pelo MESMO motor da oficialização — números de exemplo reais
  const cfg = CONFIG_FINANCEIRO_DEFAULT;
  for (const uid of ['demo-1', 'demo-2']) {
    for (const tri of Array.from(new Set(lista.map((v) => trimestreDe(v.dataVenda))))) {
      const grupo = lista.filter((v) => v.corretorUid === uid && trimestreDe(v.dataVenda) === tri);
      for (const r of recalcularTrimestre(grupo, cfg)) {
        if (!r.patch) continue;
        const alvo = lista.find((v) => v.id === r.vendaId);
        if (alvo) Object.assign(alvo, r.patch);
      }
    }
  }
  return lista;
}

// ===========================================================================
export default function FinanceiroPage() {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  const [aba, setAba] = useState<'painel' | 'vendas' | 'contas' | 'corretores' | 'config'>('painel');
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [cfgDoc, setCfgDoc] = useState<Partial<ConfigFinanceiro> | null>(null);
  const [custos, setCustos] = useState<CustoFixo[]>([]);
  const [meta, setMeta] = useState<MetaDoc | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioMin[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Venda | 'nova' | null>(null);

  // filtros
  const [mesDre, setMesDre] = useState(mesAtualYM());
  const [triSel, setTriSel] = useState(trimestreDe(hojeYMD()));
  const [fStatus, setFStatus] = useState('');
  const [fCorretor, setFCorretor] = useState('');
  const [fBusca, setFBusca] = useState('');

  // ── dados ──
  useEffect(() => {
    if (!imobiliariaId) return;
    if (isEspelhoDemo) {
      setVendas(demoVendas(imobiliariaId));
      setCfgDoc(null);
      setMeta({ valor: 56_000_000, inicio: '2026-07-01', fim: '2027-06-30' });
      setUsuarios([{ id: 'demo-1', nome: 'Ana Corretora' }, { id: 'demo-2', nome: 'Bruno Corretor' }]);
      setLoading(false);
      return;
    }
    const u1 = onSnapshot(query(collection(db, 'vendas'), where('imobiliariaId', '==', imobiliariaId)),
      (s) => { setVendas(s.docs.map((d) => ({ id: d.id, ...d.data() } as Venda))); setLoading(false); },
      () => setLoading(false));
    const u2 = onSnapshot(doc(db, 'configFinanceiro', imobiliariaId),
      (s) => setCfgDoc(s.exists() ? (s.data() as Partial<ConfigFinanceiro>) : null), () => {});
    const u3 = onSnapshot(query(collection(db, 'custosFixos'), where('imobiliariaId', '==', imobiliariaId)),
      (s) => setCustos(s.docs.map((d) => ({ id: d.id, ...d.data() } as CustoFixo))), () => {});
    const u4 = onSnapshot(doc(db, 'metas', imobiliariaId),
      (s) => setMeta(s.exists() ? (s.data() as MetaDoc) : null), () => {});
    getDocs(query(collection(db, 'usuarios'), where('imobiliariaId', '==', imobiliariaId)))
      .then((s) => setUsuarios(s.docs.map((d) => ({ id: d.id, nome: (d.data().nome as string) || '—', tipoConta: d.data().tipoConta }))))
      .catch(() => {});
    return () => { u1(); u2(); u3(); u4(); };
  }, [imobiliariaId, isEspelhoDemo]);

  const cfg: ConfigFinanceiro = useMemo(() => ({
    ...CONFIG_FINANCEIRO_DEFAULT,
    ...(cfgDoc || {}),
    tabelas: cfgDoc?.tabelas?.length ? cfgDoc.tabelas : CONFIG_FINANCEIRO_DEFAULT.tabelas,
    custoCategorias: cfgDoc?.custoCategorias?.length ? cfgDoc.custoCategorias : CONFIG_FINANCEIRO_DEFAULT.custoCategorias,
  }), [cfgDoc]);

  const nomeDe = useMemo(() => new Map(usuarios.map((u) => [u.id, u.nome] as const)), [usuarios]);

  // ── derivados ──
  const assinadas = useMemo(() => vendas.filter((v) => v.status === 'assinada'), [vendas]);
  // Fluxo simplificado a pedido: venda ou está PENDENTE (corretor fechou) ou
  // ASSINADA (você oficializou). Pré-reserva saiu da UI — reserva de pré-
  // lançamento nem entra no sistema (só vira venda no contrato).
  const pendentes = useMemo(() => vendas.filter((v) => v.status === 'pendente_confirmacao'), [vendas]);

  /** Grava a venda editada + recalcula em cascata o(s) trimestre(s) afetado(s). */
  const salvarVenda = async (v: Venda, ehNova: boolean) => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return false; }
    if (!imobiliariaId || !currentUser) return false;
    try {
      const ref = ehNova ? doc(collection(db, 'vendas')) : doc(db, 'vendas', v.id);
      const vendaFinal: Venda = { ...v, id: ref.id, imobiliariaId };
      const batch = writeBatch(db);
      const { id: _id, ...campos } = vendaFinal;
      batch.set(ref, {
        ...campos,
        ...(v.status === 'assinada' && !v.oficializadaEm ? { oficializadaEm: serverTimestamp(), oficializadaPor: currentUser.uid } : {}),
        ...(v.status === 'distratada' && !v.distratadaEm ? { distratadaEm: serverTimestamp() } : {}),
        atualizadoEm: serverTimestamp(),
      }, { merge: true });

      // cascata: trimestre(s) do corretor afetado (o antigo também, se corretor/data mudou)
      const lista = [...vendas.filter((x) => x.id !== vendaFinal.id), vendaFinal];
      const grupos = new Set([`${vendaFinal.corretorUid}|${trimestreDe(vendaFinal.dataVenda)}`]);
      const antiga = vendas.find((x) => x.id === v.id);
      if (antiga) grupos.add(`${antiga.corretorUid}|${trimestreDe(antiga.dataVenda)}`);
      for (const g of Array.from(grupos)) {
        const [uid, tri] = g.split('|');
        const doCorretor = lista.filter((x) => x.corretorUid === uid && trimestreDe(x.dataVenda) === tri);
        for (const r of recalcularTrimestre(doCorretor, cfg)) {
          const alvo = r.vendaId === vendaFinal.id ? ref : doc(db, 'vendas', r.vendaId);
          if (r.patch) batch.set(alvo, r.patch as Record<string, unknown>, { merge: true });
          if (r.ajuste) batch.set(alvo, {
            ajustes: arrayUnion({
              em: Timestamp.now(), por: currentUser.uid, porNome: userData?.nome || '',
              motivo: 'Recálculo em cascata (edição/distrato no trimestre) — venda já paga ficou congelada',
              deltaCorretor: r.ajuste.deltaCorretor,
            }),
          }, { merge: true });
        }
      }
      await batch.commit();
      showToast(ehNova ? 'Venda lançada.' : 'Venda salva — trimestre recalculado.', 'success');
      return true;
    } catch (e) {
      console.error('salvarVenda falhou:', e);
      showToast('Não foi possível salvar a venda — tente de novo.', 'error');
      return false;
    }
  };

  const salvarConfig = async (novo: Partial<ConfigFinanceiro>) => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    if (!imobiliariaId) return;
    try {
      await setDoc(doc(db, 'configFinanceiro', imobiliariaId), { ...novo, atualizadoEm: serverTimestamp(), atualizadoPor: currentUser?.uid || '' }, { merge: true });
      showToast('Configuração salva.', 'success');
    } catch { showToast('Não foi possível salvar — tente de novo.', 'error'); }
  };

  // ── DRE do mês ──
  const dre = useMemo(() => {
    const calc = (ym: string) => {
      const doMes = assinadas.filter((v) => mesDe(v.dataVenda) === ym);
      const soma = (f: (v: Venda) => number) => round2(doMes.reduce((s, v) => s + f(v), 0));
      const receita = soma((v) => v.comissaoBruta || 0);
      const imposto = soma((v) => v.imposto || 0);
      const retLead = soma((v) => v.retencaoLead || 0);
      const porPapel = (p: string) => soma((v) => (v.rateio || []).filter((b) => b.papel === p).reduce((s, b) => s + b.valor, 0));
      // ajustes (clawback/estorno de venda congelada) entram no repasse do
      // corretor — competência do mês da venda original (inclui distratadas,
      // que carregam o estorno do que já tinha sido pago)
      const ajustesCorretor = round2(vendas
        .filter((v) => mesDe(v.dataVenda) === ym && (v.status === 'assinada' || v.status === 'distratada'))
        .reduce((s, v) => s + (v.ajustes || []).reduce((a, x) => a + (x.deltaCorretor || 0), 0), 0));
      const repCorretorBase = round2(porPapel('corretor') + ajustesCorretor);
      const repasses = round2(repCorretorBase + porPapel('gerente') + porPapel('sdr') + porPapel('agenciador'));
      const margemContrib = round2(receita - imposto - retLead - repasses);
      const custosMes = custos.filter((c) => c.mes === ym);
      const totalCustos = round2(custosMes.reduce((s, c) => s + (c.valor || 0), 0));
      const resultado = round2(margemContrib + retLead - totalCustos); // retenção de lead fica com a casa
      return {
        ym, unidades: doMes.length, vgv: soma((v) => v.vgvLiquido || 0),
        receita, imposto, retLead,
        repCorretor: repCorretorBase, ajustesCorretor, repGerente: porPapel('gerente'), repSdr: porPapel('sdr'), repAgenciador: porPapel('agenciador'),
        repasses, margemContrib, custosMes, totalCustos, resultado,
        margemLiqPct: receita > 0 ? (resultado / receita) * 100 : 0,
      };
    };
    return { atual: calc(mesDre), anterior: calc(addMesesYM(mesDre, -1)) };
  }, [assinadas, vendas, custos, mesDre]);

  // ── KPIs / meta ──
  const kpis = useMemo(() => {
    const vgv = round2(assinadas.reduce((s, v) => s + (v.vgvLiquido || 0), 0));
    const receita = round2(assinadas.reduce((s, v) => s + (v.comissaoBruta || 0), 0));
    const casa = round2(assinadas.reduce((s, v) => s + ((v.rateio || []).find((b) => b.papel === 'casa')?.valor || 0), 0));
    const unidades = assinadas.length;
    return {
      vgv, receita, unidades,
      ticket: unidades ? vgv / unidades : 0,
      taxaEfetiva: vgv > 0 ? (receita / vgv) * 100 : 0,
      margemCasa: receita > 0 ? (casa / receita) * 100 : 0,
    };
  }, [assinadas]);

  const metaInfo = useMemo(() => {
    const valor = meta?.valor || 0;
    const inicio = meta?.inicio || '';
    const fim = meta?.fim || '';
    const noPeriodo = assinadas.filter((v) => (!inicio || v.dataVenda >= inicio) && (!fim || v.dataVenda <= fim));
    const vgv = round2(noPeriodo.reduce((s, v) => s + (v.vgvLiquido || 0), 0));
    const unidades = noPeriodo.length;
    const mesZerado = assinadas.filter((v) => mesDe(v.dataVenda) === mesAtualYM()).length === 0;
    const triCorrente = trimestreDe(hojeYMD());
    const vgvTri = round2(assinadas.filter((v) => trimestreDe(v.dataVenda) === triCorrente).reduce((s, v) => s + (v.vgvLiquido || 0), 0));
    return { valor, metaUnidades: meta?.metaUnidades || 0, inicio, fim, vgv, unidades, mesZerado, vgvTri, triCorrente };
  }, [meta, assinadas]);

  // ── cortes ──
  const cortes = useMemo(() => {
    const agrupa = (chave: (v: Venda) => string) => {
      const m = new Map<string, { vgv: number; receita: number; casa: number; n: number }>();
      for (const v of assinadas) {
        const k = chave(v) || '—';
        const c = m.get(k) || { vgv: 0, receita: 0, casa: 0, n: 0 };
        c.vgv += v.vgvLiquido || 0; c.receita += v.comissaoBruta || 0;
        c.casa += (v.rateio || []).find((b) => b.papel === 'casa')?.valor || 0; c.n++;
        m.set(k, c);
      }
      return Array.from(m.entries()).map(([nome, c]) => ({ nome, ...c })).sort((a, b) => b.vgv - a.vgv);
    };
    return {
      construtora: agrupa((v) => v.construtora || v.empreendimento || '—'),
      origem: agrupa((v) => ORIGEM_LABEL[v.origem] || v.origem),
    };
  }, [assinadas]);

  // ── extrato por corretor (trimestre selecionado) ──
  const extrato = useMemo(() => {
    const doTri = assinadas.filter((v) => trimestreDe(v.dataVenda) === triSel);
    const porCorretor = new Map<string, Venda[]>();
    doTri.forEach((v) => { const l = porCorretor.get(v.corretorUid) || []; l.push(v); porCorretor.set(v.corretorUid, l); });
    const hoje = new Date();
    return Array.from(porCorretor.entries()).map(([uid, lista]) => {
      const vgvTri = round2(lista.reduce((s, v) => s + (v.vgvLiquido || 0), 0));
      // ajustes do trimestre (clawback de congelada + estorno de distratada paga)
      const ajustes = round2(vendas
        .filter((v) => v.corretorUid === uid && trimestreDe(v.dataVenda) === triSel && (v.status === 'assinada' || v.status === 'distratada'))
        .reduce((s, v) => s + (v.ajustes || []).reduce((a, x) => a + (x.deltaCorretor || 0), 0), 0));
      const aPagar = round2(lista.reduce((s, v) => s + ((v.rateio || []).find((b) => b.papel === 'corretor')?.valor || 0), 0) + ajustes);
      const retencoes = round2(lista.reduce((s, v) => s + (v.imposto || 0) + (v.retencaoLead || 0), 0));
      const notasPend = lista.reduce((s, v) => s + (v.rateio || []).filter((b) => b.papel !== 'casa' && b.statusNota === 'pendente').length, 0);
      const faixas = tabelaVigente(cfg, lista[lista.length - 1]?.dataVenda || hojeYMD());
      // faixa em que o PRÓXIMO real vai cair + quanto falta pro degrau seguinte
      let faixaAtual = faixas[faixas.length - 1].pct;
      let proxima: { falta: number; pct: number } | null = null;
      for (let i = 0; i < faixas.length; i++) {
        const limite = faixas[i].ateVgv;
        if (limite === null || vgvTri < limite) {
          faixaAtual = faixas[i].pct;
          if (limite !== null) proxima = { falta: round2(limite - vgvTri), pct: faixas[i + 1]?.pct ?? faixas[i].pct };
          break;
        }
      }
      // vacância: meses sem venda ASSINADA desde a última (qualquer trimestre)
      const ultimaGeral = assinadas.filter((v) => v.corretorUid === uid).map((v) => v.dataVenda).sort().pop() || '';
      let vacancia = 0;
      if (ultimaGeral) {
        const [a, m] = ultimaGeral.split('-').map(Number);
        vacancia = Math.max(0, (hoje.getFullYear() - a) * 12 + (hoje.getMonth() + 1 - m));
      }
      return {
        uid, nome: lista[0]?.corretorNome || nomeDe.get(uid) || uid.slice(0, 6),
        vendas: lista.length, vgvTri, aPagar, ajustes, retencoes, notasPend, faixaAtual, proxima, vacancia,
      };
    }).sort((a, b) => b.vgvTri - a.vgvTri);
  }, [assinadas, vendas, triSel, cfg, nomeDe]);

  /** Corretores com vacância ≥ 2 meses (todos, não só os do trimestre) — pedido explícito da consultoria. */
  const vacantes = useMemo(() => {
    const hoje = new Date();
    const porCorretor = new Map<string, { nome: string; ultima: string }>();
    assinadas.forEach((v) => {
      const at = porCorretor.get(v.corretorUid);
      if (!at || v.dataVenda > at.ultima) porCorretor.set(v.corretorUid, { nome: v.corretorNome || nomeDe.get(v.corretorUid) || '—', ultima: v.dataVenda });
    });
    return Array.from(porCorretor.entries()).map(([uid, x]) => {
      const [a, m] = x.ultima.split('-').map(Number);
      const meses = Math.max(0, (hoje.getFullYear() - a) * 12 + (hoje.getMonth() + 1 - m));
      return { uid, nome: x.nome, ultima: x.ultima, meses };
    }).filter((x) => x.meses >= 2).sort((a, b) => b.meses - a.meses);
  }, [assinadas, nomeDe]);

  // ── vendas filtradas (aba Vendas) ──
  const vendasVisiveis = useMemo(() => {
    let arr = [...vendas].sort((a, b) => (a.dataVenda < b.dataVenda ? 1 : -1));
    if (fStatus) arr = arr.filter((v) => v.status === fStatus);
    if (fCorretor) arr = arr.filter((v) => v.corretorUid === fCorretor);
    const q = fBusca.trim().toLowerCase();
    if (q) arr = arr.filter((v) => `${v.leadNome} ${v.empreendimento} ${v.construtora} ${v.corretorNome}`.toLowerCase().includes(q));
    return arr;
  }, [vendas, fStatus, fCorretor, fBusca]);

  // recebíveis futuros (caixa)
  const caixaFuturo = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of assinadas) for (const r of v.recebiveis || []) {
      if (r.recebidoEm) continue;
      const ym = mesDe(r.dataPrevista);
      m.set(ym, (m.get(ym) || 0) + (r.valorPrevisto || 0));
    }
    return Array.from(m.entries()).sort().slice(0, 6);
  }, [assinadas]);

  const trimestres = useMemo(() => {
    const s = new Set(vendas.map((v) => trimestreDe(v.dataVenda)).filter(Boolean));
    s.add(trimestreDe(hojeYMD()));
    return Array.from(s).sort().reverse();
  }, [vendas]);

  if (!imobiliariaId) return <div className="p-8 text-center text-text-secondary">Carregando…</div>;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      <span className="gx-tag"><span>Área do administrador</span></span>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Financeiro</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">
            Quanto a casa ganha de verdade — margem por venda, DRE e a progressão de cada corretor.
            {isEspelhoDemo && <span className="text-amber-300 font-bold"> · modo demonstração (nada é salvo)</span>}
          </p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1 gap-1">
          {([['painel', '📊 Painel'], ['vendas', '🏆 Vendas'], ['contas', '💸 Contas'], ['corretores', '👥 Corretores'], ['config', '⚙️ Configuração']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`px-3 py-2 rounded-lg text-[12px] font-bold transition-all ${aba === id ? 'bg-gradient-to-r from-[#E8C547] to-[#C89210] text-[#181203] shadow-[0_0_16px_rgba(232,197,71,0.35)]' : 'text-text-secondary hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingState label="Carregando o financeiro..." className="py-10" /> : (
        <>
          {/* pendentes de confirmação — sempre visíveis, em qualquer aba */}
          {pendentes.length > 0 && (
            <div className="al-card relative overflow-hidden p-3.5 border border-amber-500/30">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[13px] font-bold text-amber-300">⏳ {pendentes.length} venda{pendentes.length > 1 ? 's' : ''} esperando confirmação</span>
                <span className="text-[11px] text-text-secondary">o corretor fechou no atendimento — confirme o rateio pra contar no DRE e na meta</span>
                <div className="ml-auto flex gap-2 flex-wrap">
                  {pendentes.slice(0, 3).map((v) => (
                    <button key={v.id} onClick={() => setModal(v)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/10 border border-amber-500/40 text-amber-200 hover:bg-amber-500/20 transition-colors">
                      {v.leadNome || 'Venda'} · {fmtBRL(v.valorBruto)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ PAINEL ══════════ */}
          {aba === 'painel' && (
            <div className="space-y-4">
              {metaInfo.mesZerado && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-[12.5px] font-bold text-rose-300">
                  🚨 {labelMes(mesAtualYM())} ainda está ZERADO em vendas assinadas — atenção à sazonalidade.
                </div>
              )}

              <Secao titulo="O período todo em números" sub="Somente vendas ASSINADAS (competência) — pendentes não contam">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Metric label="VGV líquido" valor={<CountUpFmt n={kpis.vgv} fmt={fmtBRL} />} tom="al-grad-text" />
                  <Metric label="Receita (comissão)" valor={<CountUpFmt n={kpis.receita} fmt={fmtBRL} />} tom="text-[#E8C547]" />
                  <Metric label="Unidades" valor={<CountUpFmt n={kpis.unidades} />} />
                  <Metric label="Ticket médio" valor={fmtBRL(kpis.ticket)} />
                  <Metric label="Taxa efetiva" valor={fmtPctBR(kpis.taxaEfetiva, 2)} hint="comissão ÷ VGV" />
                  <Metric label="Margem da casa" valor={fmtPctBR(kpis.margemCasa)} hint="líquido da casa ÷ receita" tom={kpis.margemCasa >= 40 ? 'text-emerald-300' : 'text-amber-300'} />
                </div>
              </Secao>

              <Secao titulo="Meta de VGV" sub={metaInfo.inicio ? `período ${metaInfo.inicio} → ${metaInfo.fim || 'aberto'}` : 'defina a meta na aba Configuração'}>
                {metaInfo.valor > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[12px] text-text-secondary">VGV assinado</span>
                        <span className="al-display text-[15px] font-bold text-white tabular-nums">{fmtBRL(metaInfo.vgv)} <span className="text-text-secondary text-[11px] font-normal">de {fmtBRL(metaInfo.valor)} · {fmtPctBR(metaInfo.valor ? (metaInfo.vgv / metaInfo.valor) * 100 : 0)}</span></span>
                      </div>
                      <Barra pct={metaInfo.valor ? metaInfo.vgv / metaInfo.valor : 0} cor="linear-gradient(90deg,#E8C547,#C89210)" alt="h-3" />
                    </div>
                    {metaInfo.metaUnidades > 0 && (
                      <div>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-[12px] text-text-secondary">Unidades</span>
                          <span className="al-display text-[15px] font-bold text-white tabular-nums">{metaInfo.unidades} <span className="text-text-secondary text-[11px] font-normal">de {metaInfo.metaUnidades}</span></span>
                        </div>
                        <Barra pct={metaInfo.metaUnidades ? metaInfo.unidades / metaInfo.metaUnidades : 0} cor="linear-gradient(90deg,#7C5CFF,#B48CFF)" />
                      </div>
                    )}
                    <p className="text-[11px] text-text-secondary">Trimestre corrente ({labelTrimestre(metaInfo.triCorrente)}): <b className="text-white">{fmtBRL(metaInfo.vgvTri)}</b> assinados.</p>
                  </div>
                ) : (
                  <p className="text-[12px] text-text-secondary">Sem meta configurada. Proposta da consultoria: <b className="text-white">R$ 56 mi em 12 meses</b> (dobro do baseline de 28 mi) — defina na aba <b>Configuração</b>.</p>
                )}
              </Secao>

              <Secao titulo={`DRE · ${labelMes(mesDre)}`} sub="Competência: o mês em que a venda foi assinada"
                acao={
                  <div className="flex items-center gap-1.5">
                    <button className={btnGhost} onClick={() => setMesDre(addMesesYM(mesDre, -1))}>‹</button>
                    <input type="month" value={mesDre} onChange={(e) => setMesDre(e.target.value || mesAtualYM())} className={inputCls + ' w-auto [color-scheme:dark]'} />
                    <button className={btnGhost} onClick={() => setMesDre(addMesesYM(mesDre, 1))}>›</button>
                  </div>
                }>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px] border-collapse">
                    <tbody>
                      <LinhaDre nome={`Receita de comissões (${dre.atual.unidades} un · VGV ${fmtBRL(dre.atual.vgv)})`} valor={dre.atual.receita} anterior={dre.anterior.receita} forte />
                      <LinhaDre nome="(−) Impostos" valor={-dre.atual.imposto} anterior={-dre.anterior.imposto} />
                      <LinhaDre nome={`(−) Retenção de lead (${fmtPctBR(cfg.taxaLeadPct, 0)} — custeia a geração)`} valor={-dre.atual.retLead} anterior={-dre.anterior.retLead} />
                      <LinhaDre nome="(−) Repasse corretores" valor={-dre.atual.repCorretor} anterior={-dre.anterior.repCorretor} />
                      {dre.atual.repGerente > 0 || dre.anterior.repGerente > 0 ? <LinhaDre nome="(−) Repasse gerente" valor={-dre.atual.repGerente} anterior={-dre.anterior.repGerente} /> : null}
                      {dre.atual.repSdr > 0 || dre.anterior.repSdr > 0 ? <LinhaDre nome="(−) Repasse SDR" valor={-dre.atual.repSdr} anterior={-dre.anterior.repSdr} /> : null}
                      {dre.atual.repAgenciador > 0 || dre.anterior.repAgenciador > 0 ? <LinhaDre nome="(−) Repasse agenciador" valor={-dre.atual.repAgenciador} anterior={-dre.anterior.repAgenciador} /> : null}
                      <LinhaDre nome="= MARGEM DE CONTRIBUIÇÃO" valor={dre.atual.margemContrib} anterior={dre.anterior.margemContrib} destaque />
                      <LinhaDre nome="(+) Retenção de lead fica com a casa" valor={dre.atual.retLead} anterior={dre.anterior.retLead} />
                      {cfg.custoCategorias.map((cat) => {
                        const gasto = dre.atual.custosMes.filter((c) => c.categoria === cat.nome).reduce((s, c) => s + c.valor, 0);
                        const gastoAnt = custos.filter((c) => c.mes === addMesesYM(mesDre, -1) && c.categoria === cat.nome).reduce((s, c) => s + c.valor, 0);
                        if (!gasto && !gastoAnt && !cat.metaMensal) return null;
                        const estourou = cat.metaMensal > 0 && gasto > cat.metaMensal;
                        return <LinhaDre key={cat.nome} nome={`(−) ${cat.nome}${cat.metaMensal ? ` · meta ${fmtBRL(cat.metaMensal)}${estourou ? ' ⚠' : ''}` : ''}`} valor={-gasto} anterior={-gastoAnt} alerta={estourou} />;
                      })}
                      {(() => {
                        // custos de categoria renomeada/excluída — sem esta linha o
                        // RESULTADO somaria um valor invisível e o DRE não fecharia
                        const nomes = new Set(cfg.custoCategorias.map((cat) => cat.nome));
                        const orfao = round2(dre.atual.custosMes.filter((c) => !nomes.has(c.categoria)).reduce((s, c) => s + c.valor, 0));
                        const orfaoAnt = round2(custos.filter((c) => c.mes === addMesesYM(mesDre, -1) && !nomes.has(c.categoria)).reduce((s, c) => s + c.valor, 0));
                        if (!orfao && !orfaoAnt) return null;
                        return <LinhaDre nome="(−) Outros custos (categoria renomeada/excluída)" valor={-orfao} anterior={-orfaoAnt} alerta />;
                      })()}
                      <LinhaDre nome="= RESULTADO" valor={dre.atual.resultado} anterior={dre.anterior.resultado} forte destaque />
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-text-secondary">
                  Margem líquida: <b className={dre.atual.margemLiqPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{fmtPctBR(dre.atual.margemLiqPct)}</b>
                  {' '}· mês anterior: {fmtPctBR(dre.anterior.margemLiqPct)} · lance os custos fixos na aba Configuração.
                </p>
              </Secao>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Secao titulo="Por origem" sub="A retenção de 10% torna esse corte financeiro, não só comercial">
                  <TabelaCorte linhas={cortes.origem} />
                </Secao>
                <Secao titulo="Por construtora" sub="Onde a casa ganha mais">
                  <TabelaCorte linhas={cortes.construtora} />
                </Secao>
              </div>

              {vacantes.length > 0 && (
                <Secao titulo="🧊 Vacância — corretores sem vender há 2+ meses" sub="Pedido da consultoria: sair do 'de cabeça' e entrar no sistema">
                  <div className="space-y-1.5">
                    {vacantes.map((x) => (
                      <div key={x.uid} className="flex items-center gap-3 rounded-lg bg-rose-500/[0.06] border border-rose-500/25 px-3 py-2">
                        <span className="flex-1 text-[13px] font-bold text-white truncate">{x.nome}</span>
                        <span className="text-[11px] text-text-secondary">última venda {x.ultima.split('-').reverse().join('/')}</span>
                        <span className="al-display text-[16px] font-bold text-rose-300 tabular-nums">{x.meses} meses</span>
                      </div>
                    ))}
                  </div>
                </Secao>
              )}

              {caixaFuturo.length > 0 && (
                <Secao titulo="Caixa futuro (recebíveis)" sub="Vendido ≠ recebido — o que ainda vai entrar, por mês previsto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {caixaFuturo.map(([ym, valor]) => <Metric key={ym} label={labelMes(ym)} valor={fmtBRL(valor)} />)}
                  </div>
                </Secao>
              )}
            </div>
          )}

          {/* ══════════ VENDAS ══════════ */}
          {aba === 'vendas' && (
            <Secao titulo="Margem por venda" sub="A conta inteira de cada venda — clique pra editar/oficializar"
              acao={<button className={btnOuro} onClick={() => setModal('nova')}>+ Lançar venda</button>}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={inputCls + ' w-auto'}>
                  <option value="">Todos os status</option>
                  {Object.entries(STATUS_LABEL).filter(([k]) => k !== 'pre_reserva').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <select value={fCorretor} onChange={(e) => setFCorretor(e.target.value)} className={inputCls + ' w-auto'}>
                  <option value="">Todos os corretores</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <input value={fBusca} onChange={(e) => setFBusca(e.target.value)} placeholder="buscar cliente, empreendimento…" className={inputCls + ' w-auto flex-1 min-w-[160px]'} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="text-text-secondary">
                      {['Data', 'Cliente / imóvel', 'Corretor', 'VGV líq.', '%', 'Comissão', 'Imposto', 'Ret. lead', 'Repasses', 'Casa', 'Margem', 'Status'].map((h, i) => (
                        <th key={h} className={`px-2 py-2 font-bold whitespace-nowrap ${i <= 2 ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vendasVisiveis.map((v) => {
                      const repasses = (v.rateio || []).filter((b) => b.papel !== 'casa').reduce((s, b) => s + b.valor, 0);
                      const casa = (v.rateio || []).find((b) => b.papel === 'casa')?.valor || 0;
                      const margem = (v.comissaoBruta || 0) > 0 ? (casa / (v.comissaoBruta || 1)) * 100 : 0;
                      const oficial = v.status === 'assinada';
                      return (
                        <tr key={v.id} onClick={() => setModal(v)} className="border-t border-white/[0.06] hover:bg-white/[0.04] cursor-pointer transition-colors">
                          <td className="px-2 py-2 whitespace-nowrap text-white/80 tabular-nums">{v.dataVenda.split('-').reverse().slice(0, 2).join('/')}</td>
                          <td className="px-2 py-2 max-w-[190px]">
                            <span className="block truncate font-semibold text-white">{v.leadNome || '—'}</span>
                            <span className="block truncate text-[10.5px] text-text-secondary">{[v.empreendimento, v.construtora].filter(Boolean).join(' · ') || PRODUTO_LABEL[v.tipoProduto]}</span>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-white/85">{v.corretorNome || nomeDe.get(v.corretorUid) || '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-white">{fmtBRL(oficial ? (v.vgvLiquido || 0) : v.valorBruto)}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-white/70">{v.percComissao ? fmtPctBR(v.percComissao) : '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-[#E8C547]">{oficial ? fmtBRL(v.comissaoBruta || 0) : '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-white/70">{oficial ? fmtBRL(v.imposto || 0) : '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-white/70">{oficial && v.retencaoLead ? fmtBRL(v.retencaoLead) : '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-white/85">{oficial ? fmtBRL(repasses) : '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums font-bold text-emerald-300">{oficial ? fmtBRL(casa) : '—'}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-white/85">{oficial ? fmtPctBR(margem) : '—'}</td>
                          <td className="px-2 py-2 text-right whitespace-nowrap">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${STATUS_COR[v.status]}`}>{STATUS_LABEL[v.status]}</span>
                            {v.congelada && <span className="ml-1" title="Pagamento efetuado — rateio congelado">🔒</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {vendasVisiveis.length === 0 && <tr><td colSpan={12} className="px-2 py-8 text-center text-text-secondary">Nenhuma venda ainda. Quando um corretor fechar no atendimento, ela chega aqui pra você confirmar.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Secao>
          )}

          {/* ══════════ CORRETORES ══════════ */}
          {aba === 'corretores' && (
            <Secao titulo="Extrato por corretor" sub="A progressão de faixas zera a cada trimestre — modelo marginal, como IR"
              acao={
                <select value={triSel} onChange={(e) => setTriSel(e.target.value)} className={inputCls + ' w-auto'}>
                  {trimestres.map((t) => <option key={t} value={t}>{labelTrimestre(t)}</option>)}
                </select>
              }>
              {extrato.length === 0 ? (
                <p className="text-[12px] text-text-secondary py-4 text-center">Nenhuma venda assinada em {labelTrimestre(triSel)}.</p>
              ) : (
                <div className="space-y-2">
                  {extrato.map((c) => (
                    <div key={c.uid} className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5">
                      <div className="flex flex-wrap items-center gap-3 mb-2.5">
                        <span className="text-[14px] font-bold text-white">{c.nome}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#E8C547]/10 border border-[#E8C547]/40 text-[#E8C547]">faixa {fmtPctBR(c.faixaAtual, 0)}</span>
                        {c.vacancia >= 2 && <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/10 border border-rose-500/40 text-rose-300">{c.vacancia} meses sem vender</span>}
                        {c.notasPend > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 border border-amber-500/40 text-amber-300">{c.notasPend} nota{c.notasPend > 1 ? 's' : ''} pendente{c.notasPend > 1 ? 's' : ''}</span>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2.5">
                        <Metric label="VGV no trimestre" valor={fmtBRL(c.vgvTri)} />
                        <Metric label="Vendas" valor={String(c.vendas)} />
                        <Metric label="A pagar (corretor)" valor={fmtBRL2(c.aPagar)} tom="text-[#E8C547]" hint={c.ajustes !== 0 ? `inclui ajustes ${fmtBRL2(c.ajustes)}` : undefined} />
                        <Metric label="Retido (imposto + lead)" valor={fmtBRL2(c.retencoes)} />
                      </div>
                      {c.proxima ? (
                        <div>
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-[10.5px] text-text-secondary">faltam <b className="text-white">{fmtBRL(c.proxima.falta)}</b> pra faixa de <b className="text-[#E8C547]">{fmtPctBR(c.proxima.pct, 0)}</b></span>
                          </div>
                          <Barra pct={c.vgvTri / (c.vgvTri + c.proxima.falta)} cor="linear-gradient(90deg,#E8C547,#C89210)" alt="h-1.5" />
                        </div>
                      ) : (
                        <p className="text-[10.5px] text-emerald-300 font-bold">✓ Faixa máxima do trimestre</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Secao>
          )}

          {/* ══════════ CONTAS DO MÊS ══════════ */}
          {aba === 'contas' && (
            <ContasTab cfg={cfg} custos={custos}
              onSalvarCategorias={salvarConfig}
              onAddCusto={async (mes, categoria, valor) => {
                if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
                try {
                  await addDoc(collection(db, 'custosFixos'), { imobiliariaId, mes, categoria, valor, criadoEm: serverTimestamp() });
                  showToast('Conta lançada.', 'success');
                } catch { showToast('Não foi possível lançar a conta.', 'error'); }
              }}
              onDelCusto={async (id) => {
                if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
                try { await deleteDoc(doc(db, 'custosFixos', id)); } catch { showToast('Não foi possível excluir.', 'error'); }
              }}
            />
          )}

          {/* ══════════ CONFIGURAÇÃO ══════════ */}
          {aba === 'config' && (
            <ConfigTab cfg={cfg} meta={meta} isDemo={isEspelhoDemo}
              onSalvar={salvarConfig}
              onSalvarMeta={async (m) => {
                if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
                try {
                  await setDoc(doc(db, 'metas', imobiliariaId), m, { merge: true });
                  showToast('Meta salva.', 'success');
                } catch { showToast('Não foi possível salvar a meta.', 'error'); }
              }}
            />
          )}
        </>
      )}

      {modal && (
        <ModalVenda
          venda={modal === 'nova' ? null : modal}
          cfg={cfg}
          vendas={vendas}
          usuarios={usuarios}
          onFechar={() => setModal(null)}
          onSalvar={async (v, ehNova) => { const ok = await salvarVenda(v, ehNova); if (ok) setModal(null); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Linha do DRE (com comparativo do mês anterior)
// ---------------------------------------------------------------------------
function LinhaDre({ nome, valor, anterior, forte, destaque, alerta }: { nome: string; valor: number; anterior: number; forte?: boolean; destaque?: boolean; alerta?: boolean }) {
  const delta = valor - anterior;
  return (
    <tr className={destaque ? 'bg-[#E8C547]/[0.06]' : ''}>
      <td className={`px-2 py-1.5 ${forte ? 'font-bold text-white' : alerta ? 'text-amber-300' : 'text-white/80'}`}>{nome}</td>
      <td className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${forte ? 'al-display font-bold text-[14px] ' : ''}${valor < 0 ? 'text-[#F45B69]' : destaque ? 'text-[#E8C547]' : 'text-white'}`}>{fmtBRL2(valor)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap text-[11px] text-text-secondary hidden sm:table-cell" title="variação vs mês anterior">
        {Math.abs(delta) < 0.01 ? '—' : <span className={delta > 0 ? 'text-emerald-300/80' : 'text-rose-300/80'}>{delta > 0 ? '▲' : '▼'} {fmtBRL(Math.abs(delta))}</span>}
      </td>
    </tr>
  );
}

function TabelaCorte({ linhas }: { linhas: { nome: string; vgv: number; receita: number; casa: number; n: number }[] }) {
  if (!linhas.length) return <p className="text-[12px] text-text-secondary">Sem vendas assinadas ainda.</p>;
  const max = linhas[0]?.vgv || 1;
  return (
    <div className="space-y-2">
      {linhas.slice(0, 8).map((l) => (
        <div key={l.nome}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-[12px] font-semibold text-white truncate">{l.nome} <span className="text-text-secondary font-normal">· {l.n} un</span></span>
            <span className="text-[11px] text-text-secondary tabular-nums shrink-0">{fmtBRL(l.vgv)} · casa <b className="text-emerald-300">{fmtBRL(l.casa)}</b></span>
          </div>
          <Barra pct={l.vgv / max} cor="linear-gradient(90deg,#E8C547,#C89210)" alt="h-1.5" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Lançar / editar venda (passo 2 — oficialização)
// ---------------------------------------------------------------------------
function ModalVenda({ venda, cfg, vendas, usuarios, onFechar, onSalvar }: {
  venda: Venda | null;
  cfg: ConfigFinanceiro;
  vendas: Venda[];
  usuarios: UsuarioMin[];
  onFechar: () => void;
  onSalvar: (v: Venda, ehNova: boolean) => Promise<void>;
}) {
  const ehNova = !venda;
  const [f, setF] = useState<Venda>(() => venda ? { ...venda } : {
    id: '', imobiliariaId: '', leadNome: '', corretorUid: '', corretorNome: '',
    valorBruto: 0, valorPermuta: 0, parceriaPct: 0, tipoProduto: 'lancamento',
    origem: 'carteira', construtora: '', empreendimento: '',
    status: 'pendente_confirmacao', dataVenda: hojeYMD(), percComissao: 0,
  });
  const [salvando, setSalvando] = useState(false);
  const set = (patch: Partial<Venda>) => setF((p) => ({ ...p, ...patch }));

  // % padrão pelo produto (edição livre) — pronto vendido pra carteira paga menos
  const percSugerida = useMemo(() => {
    const tipoEfetivo: TipoProduto = f.tipoProduto === 'pronto' && f.origem === 'carteira' ? 'pronto_carteira' : f.tipoProduto;
    return percComissaoPadrao(cfg, tipoEfetivo);
  }, [cfg, f.tipoProduto, f.origem]);
  const perc = f.percComissao || percSugerida;

  // preview do rateio EXATAMENTE como a oficialização vai gravar
  const preview = useMemo(() => {
    const liquido = vgvLiquidoDe(f.valorBruto, f.valorPermuta, f.parceriaPct, cfg.parceriaModo);
    const tri = trimestreDe(f.dataVenda);
    const acumuladoAntes = vendas
      .filter((v) => v.id !== f.id && v.status === 'assinada' && v.corretorUid === f.corretorUid && trimestreDe(v.dataVenda) === tri)
      .filter((v) => v.dataVenda < f.dataVenda || (v.dataVenda === f.dataVenda && String(v.id) < String(f.id || '￿')))
      .reduce((s, v) => s + (v.vgvLiquido ?? vgvLiquidoDe(v.valorBruto, v.valorPermuta, v.parceriaPct, cfg.parceriaModo)), 0);
    const r = calcularRateio({
      cfg, faixas: tabelaVigente(cfg, f.dataVenda), vgvLiquido: liquido, percComissao: perc,
      origemLead: f.origem === 'lead', acumuladoTrimestreAntes: acumuladoAntes,
      temGerente: !!f.gerenteUid, temSdr: !!f.sdrUid, temAgenciador: !!f.agenciadorUid,
    });
    return { liquido, r };
  }, [f, cfg, vendas, perc]);

  const selUsuario = (label: string, uidKey: 'gerenteUid' | 'sdrUid' | 'agenciadorUid', nomeKey: 'gerenteNome' | 'sdrNome' | 'agenciadorNome', hint: string) => (
    <div>
      <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">{label}</label>
      <select value={(f[uidKey] as string) || ''} onChange={(e) => {
        const u = usuarios.find((x) => x.id === e.target.value);
        set({ [uidKey]: u?.id || '', [nomeKey]: u?.nome || '' } as Partial<Venda>);
      }} className={inputCls}>
        <option value="">— sem —</option>
        {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
      </select>
      <p className="text-[10px] text-text-secondary mt-0.5">{hint}</p>
    </div>
  );

  const alternarNota = (idx: number) => {
    const ordem: StatusNota[] = ['pendente', 'emitida', 'dispensada'];
    const rateio = [...(f.rateio || [])];
    const atual = rateio[idx];
    rateio[idx] = { ...atual, statusNota: ordem[(ordem.indexOf(atual.statusNota) + 1) % 3] };
    set({ rateio });
  };
  const alternarPago = (idx: number) => {
    const rateio = [...(f.rateio || [])];
    const { pagoEm: _pagoEm, ...resto } = rateio[idx];
    // nunca gravar `undefined` (o Firestore rejeita) — desmarcar remove a chave
    rateio[idx] = (!rateio[idx].pago
      ? { ...resto, pago: true, pagoEm: Timestamp.now() }
      : { ...resto, pago: false }) as Beneficiario;
    set({ rateio, congelada: rateio.some((b) => b.papel !== 'casa' && b.pago) });
  };

  const salvar = async (statusFinal?: Venda['status'], extra?: Partial<Venda>) => {
    if (!f.corretorUid) { showToast('Escolha o corretor da venda.', 'error'); return; }
    if (!f.valorBruto || f.valorBruto <= 0) { showToast('Informe o valor do imóvel.', 'error'); return; }
    // Congelada (pagamento efetuado): os campos-base não podem mudar — senão o
    // doc ficaria meio-atualizado (base nova, rateio congelado antigo). A rota
    // de correção é desmarcar o pagamento, editar e remarcar.
    if (venda?.congelada && statusFinal !== 'distratada') {
      const baseMudou = venda.valorBruto !== f.valorBruto || venda.valorPermuta !== f.valorPermuta
        || venda.parceriaPct !== f.parceriaPct || venda.percComissao !== perc
        || venda.dataVenda !== f.dataVenda || venda.origem !== f.origem
        || venda.corretorUid !== f.corretorUid || venda.gerenteUid !== f.gerenteUid
        || venda.sdrUid !== f.sdrUid || venda.agenciadorUid !== f.agenciadorUid;
      if (baseMudou) {
        showToast('Venda com pagamento efetuado: desmarque o "pago" antes de mudar valores/rateio.', 'error');
        return;
      }
    }
    setSalvando(true);
    try {
      // nome do corretor sempre pelo uid (o passo 1 pode ter gravado o nome do
      // OPERADOR quando um admin fechou o pop-up de lead alheio)
      const nomeCorretor = usuarios.find((x) => x.id === f.corretorUid)?.nome || f.corretorNome || '';
      await onSalvar({ ...f, ...extra, corretorNome: nomeCorretor, percComissao: perc, status: statusFinal || f.status }, ehNova);
    } finally { setSalvando(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-start pt-8 sm:pt-14 px-3 overflow-y-auto pb-8">
      <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] w-full max-w-3xl relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 gx-line-gold" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="al-display text-[16px] font-bold text-white uppercase tracking-[0.12em]">{ehNova ? 'Lançar venda' : `${f.leadNome || 'Venda'}`}</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {f.status === 'pendente_confirmacao' ? 'O corretor fechou no atendimento — complete e oficialize pra contar no DRE e na meta.' : 'Editar recalcula em cascata as vendas seguintes do corretor no trimestre.'}
              </p>
            </div>
            <button onClick={onFechar} className="text-text-secondary hover:text-[#FF5C7E] transition-colors text-xl leading-none">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Cliente</label>
              <input value={f.leadNome || ''} onChange={(e) => set({ leadNome: e.target.value })} placeholder="Nome do cliente" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Corretor (vendedor)</label>
              <select value={f.corretorUid} onChange={(e) => {
                const u = usuarios.find((x) => x.id === e.target.value);
                set({ corretorUid: u?.id || '', corretorNome: u?.nome || '' });
              }} className={inputCls}>
                <option value="">— escolher —</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Data da assinatura</label>
              <input type="date" value={f.dataVenda} onChange={(e) => set({ dataVenda: e.target.value || hojeYMD() })} className={inputCls + ' [color-scheme:dark]'} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Valor do imóvel (VGV)</label>
              <MoneyInput value={f.valorBruto} onChange={(n) => set({ valorBruto: n })} className={inputCls + ' pl-9 tabular-nums'} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Permuta (sai do VGV)</label>
              <MoneyInput value={f.valorPermuta} onChange={(n) => set({ valorPermuta: n })} className={inputCls + ' pl-9 tabular-nums'} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Parceria (% do parceiro)</label>
              <input type="number" min={0} max={100} step={1} value={f.parceriaPct || ''} onChange={(e) => set({ parceriaPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} placeholder="0" className={inputCls + ' tabular-nums'} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Produto</label>
              <select value={f.tipoProduto} onChange={(e) => set({ tipoProduto: e.target.value as TipoProduto })} className={inputCls}>
                <option value="lancamento">Lançamento</option>
                <option value="pronto">Pronto</option>
                <option value="pronto_carteira">Pronto (cliente de carteira)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Origem do cliente</label>
              <select value={f.origem} onChange={(e) => set({ origem: e.target.value as OrigemVenda })} className={inputCls}>
                {Object.entries(ORIGEM_LABEL).map(([k, l]) => <option key={k} value={k}>{l}{k === 'lead' ? ` (retenção ${fmtPctBR(cfg.taxaLeadPct, 0)})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">% de comissão <span className="text-[#E8C547]">(sugerida: {fmtPctBR(percSugerida)})</span></label>
              <input type="number" min={0} max={20} step={0.5} value={f.percComissao || ''} onChange={(e) => set({ percComissao: Math.max(0, Number(e.target.value) || 0) })} placeholder={String(percSugerida)} className={inputCls + ' tabular-nums'} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Empreendimento</label>
              <input value={f.empreendimento || ''} onChange={(e) => set({ empreendimento: e.target.value })} placeholder="Ex: Orla da Barra" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Construtora</label>
              <input value={f.construtora || ''} onChange={(e) => set({ construtora: e.target.value })} placeholder="Ex: SANTER" className={inputCls} />
            </div>
            {selUsuario('Gerente', 'gerenteUid', 'gerenteNome', `${fmtPctBR(cfg.gerentePct, 0)} da base`)}
            {selUsuario('SDR (originou a reunião)', 'sdrUid', 'sdrNome', `racha ${fmtPctBR(cfg.sdrSplitPct, 0)} do bloco do gerente`)}
            {selUsuario('Agenciador (agenciou o imóvel)', 'agenciadorUid', 'agenciadorNome', `${cfg.agenciadorPontos} p.p. saem da fatia do corretor`)}
          </div>

          {/* preview do rateio */}
          <div className="mt-4 rounded-xl bg-white/[0.03] border border-[#E8C547]/25 p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#E8C547] mb-2">A conta desta venda (ordem canônica)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 text-[12px] tabular-nums">
              <Metric label="VGV líquido" valor={fmtBRL(preview.liquido)} hint={f.valorPermuta || f.parceriaPct ? `bruto ${fmtBRL(f.valorBruto)}` : undefined} />
              <Metric label={`Comissão (${fmtPctBR(perc)})`} valor={fmtBRL2(preview.r.comissaoBruta)} tom="text-[#E8C547]" />
              <Metric label={`− Imposto (${fmtPctBR(cfg.aliquotaImpostoPct)})`} valor={fmtBRL2(preview.r.imposto)} />
              <Metric label={f.origem === 'lead' ? `− Lead (${fmtPctBR(cfg.taxaLeadPct, 0)})` : '− Lead'} valor={f.origem === 'lead' ? fmtBRL2(preview.r.retencaoLead) : '—'} />
              <Metric label="= Base de rateio" valor={fmtBRL2(preview.r.baseRateio)} tom="text-white" />
              <Metric label={`Corretor (${fmtPctBR(preview.r.corretorPctMedio)})`} valor={fmtBRL2(preview.r.corretorValor)} />
              <Metric label="Gerente / SDR / Agenc." valor={fmtBRL2(preview.r.gerenteValor + preview.r.sdrValor + preview.r.agenciadorValor)} />
              <Metric label={`Casa (margem ${fmtPctBR(preview.r.margemCasaPct)})`} valor={fmtBRL2(preview.r.casaValor)} tom={preview.r.casaValor >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
            </div>
            {preview.r.proximaFaixa && (
              <p className="mt-2 text-[10.5px] text-text-secondary">Depois desta venda, faltam <b className="text-white">{fmtBRL(preview.r.proximaFaixa.falta)}</b> de VGV pro corretor subir pra faixa de <b className="text-[#E8C547]">{fmtPctBR(preview.r.proximaFaixa.pct, 0)}</b>.</p>
            )}
          </div>

          {/* rateio gravado (notas / pagamentos) — só depois de oficializada */}
          {!ehNova && (f.rateio?.length || 0) > 0 && (
            <div className="mt-3 rounded-xl bg-white/[0.03] border border-white/10 p-3.5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-secondary mb-2">Beneficiários gravados · nota e pagamento {f.congelada && <span className="text-amber-300">· 🔒 congelada (pagamento efetuado)</span>}</p>
              <div className="space-y-1.5">
                {(f.rateio || []).map((benef, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="w-24 shrink-0 uppercase text-[10px] font-bold text-text-secondary">{benef.papel}</span>
                    <span className="flex-1 min-w-[100px] text-white/90 truncate">{benef.nome || (benef.papel === 'casa' ? 'Nox' : '—')}</span>
                    <span className="tabular-nums font-bold text-white">{fmtBRL2(benef.valor)}</span>
                    {benef.papel !== 'casa' && (
                      <>
                        <button onClick={() => alternarNota(i)} className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-colors ${benef.statusNota === 'emitida' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : benef.statusNota === 'dispensada' ? 'bg-white/[0.05] border-white/15 text-text-secondary' : 'bg-amber-500/10 border-amber-500/40 text-amber-300'}`}>
                          NF {benef.statusNota}
                        </button>
                        <button onClick={() => alternarPago(i)} className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-colors ${benef.pago ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-white/[0.04] border-white/15 text-text-secondary hover:text-white'}`}>
                          {benef.pago ? '✓ pago' : 'marcar pago'}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {(f.ajustes?.length || 0) > 0 && (
                <div className="mt-2 pt-2 border-t border-white/[0.06]">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 mb-1">Ajustes registrados</p>
                  {(f.ajustes || []).map((a, i) => (
                    <p key={i} className="text-[11px] text-text-secondary">· {a.motivo} — corretor <b className={a.deltaCorretor >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{a.deltaCorretor >= 0 ? '+' : ''}{fmtBRL2(a.deltaCorretor)}</b> {a.porNome ? `(${a.porNome})` : ''}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* recebíveis */}
          <RecebiveisEditor recebiveis={f.recebiveis || []} onChange={(r) => set({ recebiveis: r })} />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-white/10">
            <div className="flex gap-2">
              {f.status !== 'distratada' && !ehNova && (
                <button disabled={salvando} onClick={() => {
                  const motivo = (window.prompt('Motivo do distrato:') || '').trim();
                  if (!motivo) return;
                  // motivo vai por argumento — setState é assíncrono e o closure
                  // de `salvar` leria o `f` velho (motivo se perderia)
                  void salvar('distratada', { motivoDistrato: motivo });
                }} className="px-3 py-2 rounded-xl text-[12px] font-bold border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors">
                  Distratar (estorna tudo)
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onFechar} className={btnGhost}>Cancelar</button>
              <button disabled={salvando} onClick={() => salvar('assinada')} className={btnOuro}>
                {salvando ? 'Salvando…' : f.status === 'assinada' ? 'Salvar (recalcula o trimestre)' : '✓ Oficializar — contrato assinado'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecebiveisEditor({ recebiveis, onChange }: { recebiveis: { valorPrevisto: number; dataPrevista: string; recebidoEm?: unknown }[]; onChange: (r: { valorPrevisto: number; dataPrevista: string; recebidoEm?: unknown }[]) => void }) {
  const [valor, setValor] = useState(0);
  const [data, setData] = useState('');
  return (
    <div className="mt-3 rounded-xl bg-white/[0.03] border border-white/10 p-3.5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-secondary mb-2">Recebíveis — vendido hoje, recebido depois ("eu vendi hoje, vou receber em novembro")</p>
      {recebiveis.length > 0 && (
        <div className="space-y-1 mb-2">
          {recebiveis.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              <span className="tabular-nums text-white">{fmtBRL2(r.valorPrevisto)}</span>
              <span className="text-text-secondary">previsto p/ {r.dataPrevista.split('-').reverse().join('/')}</span>
              <button onClick={() => {
                const n = [...recebiveis];
                const { recebidoEm: _rec, ...resto } = n[i];
                n[i] = n[i].recebidoEm ? resto : { ...resto, recebidoEm: Timestamp.now() }; // sem `undefined` no doc
                onChange(n);
              }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border transition-colors ${r.recebidoEm ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-white/[0.04] border-white/15 text-text-secondary hover:text-white'}`}>
                {r.recebidoEm ? '✓ recebido' : 'marcar recebido'}
              </button>
              <button onClick={() => onChange(recebiveis.filter((_, j) => j !== i))} className="text-text-secondary hover:text-rose-300 text-[12px]">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-36"><MoneyInput value={valor} onChange={setValor} className={inputCls + ' pl-9 tabular-nums'} /></div>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputCls + ' w-auto [color-scheme:dark]'} />
        <button onClick={() => { if (valor > 0 && data) { onChange([...recebiveis, { valorPrevisto: valor, dataPrevista: data }]); setValor(0); setData(''); } }} className={btnGhost}>+ parcela</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Configuração — os parâmetros da consultoria (nada é fixo no código)
// ---------------------------------------------------------------------------
function ConfigTab({ cfg, meta, isDemo, onSalvar, onSalvarMeta }: {
  cfg: ConfigFinanceiro;
  meta: MetaDoc | null;
  isDemo: boolean;
  onSalvar: (c: Partial<ConfigFinanceiro>) => Promise<void>;
  onSalvarMeta: (m: MetaDoc) => Promise<void>;
}) {
  const [c, setC] = useState<ConfigFinanceiro>(cfg);
  useEffect(() => setC(cfg), [cfg]);
  const [m, setM] = useState<MetaDoc>({ valor: meta?.valor || 0, metaUnidades: meta?.metaUnidades || 0, inicio: meta?.inicio || '', fim: meta?.fim || '' });
  useEffect(() => setM({ valor: meta?.valor || 0, metaUnidades: meta?.metaUnidades || 0, inicio: meta?.inicio || '', fim: meta?.fim || '' }), [meta]);
  const [novaVigencia, setNovaVigencia] = useState('');

  const num = (label: string, key: keyof ConfigFinanceiro, hint?: string, step = 0.1) => (
    <div>
      <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">{label}</label>
      <input type="number" step={step} value={(c[key] as number) ?? ''} onChange={(e) => setC({ ...c, [key]: Number(e.target.value) || 0 })} className={inputCls + ' tabular-nums'} />
      {hint && <p className="text-[10px] text-amber-300/90 mt-0.5">{hint}</p>}
    </div>
  );

  const tabelaAtual = c.tabelas[c.tabelas.length - 1];
  const setFaixas = (faixas: FaixaComissao[]) => {
    const tabelas = [...c.tabelas];
    tabelas[tabelas.length - 1] = { ...tabelaAtual, faixas };
    setC({ ...c, tabelas });
  };

  return (
    <div className="space-y-4">
      <Secao titulo="Parâmetros do rateio" sub="Da consultoria de 28/07 — os campos em âmbar precisam de confirmação da Nox"
        acao={<button className={btnOuro} onClick={() => onSalvar(c)}>Salvar parâmetros</button>}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {num('Alíquota imposto (%)', 'aliquotaImpostoPct', PENDENCIAS_CONFIG[0].aviso)}
          {num('Taxa de lead (%)', 'taxaLeadPct', 'Só em venda vinda de lead — retida pela casa.')}
          {num('Gerente (%)', 'gerentePct', PENDENCIAS_CONFIG[1].aviso)}
          {num('SDR — % do bloco do gerente', 'sdrSplitPct', PENDENCIAS_CONFIG[2].aviso, 1)}
          {num('Agenciador (pontos %)', 'agenciadorPontos', 'Saem da fatia do corretor vendedor.', 1)}
          {num('Comissão lançamento (%)', 'percLancamento', undefined, 0.5)}
          {num('Comissão pronto (%)', 'percPronto', undefined, 0.5)}
          {num('Pronto p/ carteira (%)', 'percProntoCarteira', undefined, 0.5)}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Parceria</label>
            <select value={c.parceriaModo} onChange={(e) => setC({ ...c, parceriaModo: e.target.value as ConfigFinanceiro['parceriaModo'] })} className={inputCls}>
              <option value="exclui">Exclui do VGV</option>
              <option value="parcial">Conta parcial</option>
            </select>
            <p className="text-[10px] text-amber-300/90 mt-0.5">{PENDENCIAS_CONFIG[3].aviso}</p>
          </div>
        </div>
      </Secao>

      <Secao titulo={`Faixas do corretor · vigência desde ${tabelaAtual.inicio.split('-').reverse().join('/')}`}
        sub="Progressão MARGINAL por trimestre (só o excedente muda de faixa). Tabela nova NÃO recalcula vendas antigas."
        acao={<button className={btnOuro} onClick={() => onSalvar(c)}>Salvar faixas</button>}>
        <div className="space-y-2">
          {tabelaAtual.faixas.map((fx, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="text-text-secondary w-14">Faixa {i + 1}</span>
              {fx.ateVgv === null ? (
                <span className="text-white/70">acima da última</span>
              ) : (
                <>
                  <span className="text-text-secondary">até</span>
                  <div className="w-40"><MoneyInput value={fx.ateVgv} onChange={(n) => { const fs = [...tabelaAtual.faixas]; fs[i] = { ...fx, ateVgv: n }; setFaixas(fs); }} className={inputCls + ' pl-9 tabular-nums'} /></div>
                  <span className="text-text-secondary">de VGV no trimestre →</span>
                </>
              )}
              <input type="number" step={1} value={fx.pct} onChange={(e) => { const fs = [...tabelaAtual.faixas]; fs[i] = { ...fx, pct: Number(e.target.value) || 0 }; setFaixas(fs); }} className={inputCls + ' w-20 tabular-nums'} />
              <span className="text-text-secondary">%</span>
              {fx.ateVgv !== null && tabelaAtual.faixas.length > 2 && (
                <button onClick={() => setFaixas(tabelaAtual.faixas.filter((_, j) => j !== i))} className="text-text-secondary hover:text-rose-300">✕</button>
              )}
            </div>
          ))}
          <button className={btnGhost} onClick={() => {
            const ultima = tabelaAtual.faixas[tabelaAtual.faixas.length - 1];
            const penultimo = tabelaAtual.faixas[tabelaAtual.faixas.length - 2];
            const novoLimite = (penultimo?.ateVgv || 1_200_000) + 500_000;
            setFaixas([...tabelaAtual.faixas.slice(0, -1), { ateVgv: novoLimite, pct: ultima.pct }, { ateVgv: null, pct: ultima.pct + 5 }]);
          }}>+ degrau</button>
        </div>
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-text-secondary">Nova vigência (ex.: próximo trimestre — "tudo pode ser mudado"):</span>
          <input type="date" value={novaVigencia} onChange={(e) => setNovaVigencia(e.target.value)} className={inputCls + ' w-auto [color-scheme:dark]'} />
          <button className={btnGhost} onClick={() => {
            if (!novaVigencia) return;
            const tabelas = [...c.tabelas, { id: `v${c.tabelas.length + 1}`, inicio: novaVigencia, faixas: tabelaAtual.faixas.map((x) => ({ ...x })) }];
            setC({ ...c, tabelas });
            setNovaVigencia('');
            showToast('Vigência criada — ajuste as faixas e salve.', 'info');
          }}>criar vigência</button>
          <span className="text-[10px] text-text-secondary">({c.tabelas.length} vigência{c.tabelas.length > 1 ? 's' : ''} no histórico)</span>
        </div>
      </Secao>

      <Secao titulo="Meta de VGV" sub='Baseline: 28 mi/12m. Proposta da consultoria: dobrar — R$ 56 mi em 12 meses ("meta é dado, não constante")'
        acao={<button className={btnOuro} onClick={() => onSalvarMeta(m)}>Salvar meta</button>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Meta de VGV (R$)</label>
            <MoneyInput value={m.valor || 0} onChange={(n) => setM({ ...m, valor: n })} placeholder="56.000.000,00" className={inputCls + ' pl-9 tabular-nums'} />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Meta de unidades</label>
            <input type="number" value={m.metaUnidades || ''} onChange={(e) => setM({ ...m, metaUnidades: Number(e.target.value) || 0 })} placeholder="70" className={inputCls + ' tabular-nums'} />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Início</label>
            <input type="date" value={m.inicio || ''} onChange={(e) => setM({ ...m, inicio: e.target.value })} className={inputCls + ' [color-scheme:dark]'} />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Fim</label>
            <input type="date" value={m.fim || ''} onChange={(e) => setM({ ...m, fim: e.target.value })} className={inputCls + ' [color-scheme:dark]'} />
          </div>
        </div>
      </Secao>

      {isDemo && <p className="text-center text-[11px] text-amber-300 font-bold">Modo demonstração — nada aqui é salvo de verdade.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Contas — o dinheiro que SAI pra manter a casa aberta ("lançar uma conta")
// ---------------------------------------------------------------------------
function ContasTab({ cfg, custos, onSalvarCategorias, onAddCusto, onDelCusto }: {
  cfg: ConfigFinanceiro;
  custos: CustoFixo[];
  onSalvarCategorias: (c: Partial<ConfigFinanceiro>) => Promise<void>;
  onAddCusto: (mes: string, categoria: string, valor: number) => Promise<void>;
  onDelCusto: (id: string) => Promise<void>;
}) {
  const [mes, setMes] = useState(mesAtualYM());
  const [cat, setCat] = useState('');
  const [valor, setValor] = useState(0);
  const [cats, setCats] = useState(cfg.custoCategorias);
  useEffect(() => setCats(cfg.custoCategorias), [cfg.custoCategorias]);
  const [editandoCats, setEditandoCats] = useState(false);

  const doMes = custos.filter((x) => x.mes === mes);
  const totalMes = round2(doMes.reduce((s, x) => s + (x.valor || 0), 0));
  const totalMetas = round2(cfg.custoCategorias.reduce((s, x) => s + (x.metaMensal || 0), 0));
  const gastoDe = (nome: string) => round2(doMes.filter((x) => x.categoria === nome).reduce((s, x) => s + x.valor, 0));

  return (
    <div className="space-y-4">
      <Secao titulo={`Contas de ${labelMes(mes)}`} sub='O dinheiro que sai pra manter a casa — cada categoria com meta ("meta de conta de luz")'
        acao={
          <div className="flex items-center gap-1.5">
            <button className={btnGhost} onClick={() => setMes(addMesesYM(mes, -1))}>‹</button>
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value || mesAtualYM())} className={inputCls + ' w-auto [color-scheme:dark]'} />
            <button className={btnGhost} onClick={() => setMes(addMesesYM(mes, 1))}>›</button>
          </div>
        }>
        {/* resumo do mês */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 rounded-xl bg-white/[0.03] border border-white/10 p-3">
          <Metric label="Gasto no mês" valor={fmtBRL2(totalMes)} tom={totalMetas > 0 && totalMes > totalMetas ? 'text-rose-300' : 'text-white'} />
          <Metric label="Meta total do mês" valor={totalMetas > 0 ? fmtBRL2(totalMetas) : '—'} hint={totalMetas > 0 ? undefined : 'defina metas por categoria abaixo'} />
          <Metric label="Folga / estouro" valor={totalMetas > 0 ? fmtBRL2(totalMetas - totalMes) : '—'} tom={totalMetas - totalMes >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
        </div>

        {/* lançar conta */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls + ' w-auto max-w-[240px]'}>
            <option value="">— qual conta? —</option>
            {cfg.custoCategorias.map((x) => <option key={x.nome} value={x.nome}>{x.nome}</option>)}
          </select>
          <div className="w-36"><MoneyInput value={valor} onChange={setValor} className={inputCls + ' pl-9 tabular-nums'} /></div>
          <button className={btnOuro} onClick={async () => {
            if (!cat || valor <= 0) { showToast('Escolha a conta e o valor.', 'error'); return; }
            await onAddCusto(mes, cat, valor);
            setValor(0);
          }}>+ Lançar conta</button>
        </div>

        {/* categoria a categoria: gasto vs meta */}
        <div className="space-y-2.5">
          {cfg.custoCategorias.map((x) => {
            const gasto = gastoDe(x.nome);
            const estourou = x.metaMensal > 0 && gasto > x.metaMensal;
            if (!gasto && !x.metaMensal) return null;
            return (
              <div key={x.nome}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-white truncate">{x.nome}{estourou && <span className="ml-1 text-rose-300">⚠ estourou</span>}</span>
                  <span className="text-[11px] text-text-secondary tabular-nums shrink-0">
                    {fmtBRL2(gasto)}{x.metaMensal > 0 && <> de <b className={estourou ? 'text-rose-300' : 'text-white/80'}>{fmtBRL2(x.metaMensal)}</b></>}
                  </span>
                </div>
                {x.metaMensal > 0 && <Barra pct={gasto / x.metaMensal} cor={estourou ? 'linear-gradient(90deg,#F45B69,#FB7185)' : 'linear-gradient(90deg,#3AC17C,#34D399)'} alt="h-1.5" />}
              </div>
            );
          })}
        </div>

        {/* lançamentos do mês */}
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-secondary mb-2">Lançamentos de {labelMes(mes)}</p>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {doMes.map((x) => (
              <div key={x.id} className="flex items-center gap-2 text-[12px]">
                <span className="flex-1 text-white/85 truncate">{x.categoria}</span>
                <span className="tabular-nums text-white">{fmtBRL2(x.valor)}</span>
                <button onClick={() => onDelCusto(x.id)} className="text-text-secondary hover:text-rose-300" title="Excluir lançamento">✕</button>
              </div>
            ))}
            {doMes.length === 0 && <p className="text-[11px] text-text-secondary">Nenhuma conta lançada em {labelMes(mes)} ainda.</p>}
          </div>
        </div>
      </Secao>

      <Secao titulo="Categorias e metas mensais" sub="As contas fixas da casa — o DRE cobra o estouro de cada meta"
        acao={<button className={btnGhost} onClick={() => setEditandoCats((v) => !v)}>{editandoCats ? 'fechar edição' : '✎ editar'}</button>}>
        {editandoCats ? (
          <div className="space-y-1.5">
            {cats.map((x, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={x.nome} onChange={(e) => { const cs = [...cats]; cs[i] = { ...x, nome: e.target.value }; setCats(cs); }} className={inputCls + ' flex-1'} />
                <div className="w-32"><MoneyInput value={x.metaMensal} onChange={(n) => { const cs = [...cats]; cs[i] = { ...x, metaMensal: n }; setCats(cs); }} className={inputCls + ' pl-9 tabular-nums'} /></div>
                <button onClick={() => setCats(cats.filter((_, j) => j !== i))} className="text-text-secondary hover:text-rose-300">✕</button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button className={btnGhost} onClick={() => setCats([...cats, { nome: 'Nova categoria', metaMensal: 0 }])}>+ categoria</button>
              <button className={btnOuro} onClick={async () => { await onSalvarCategorias({ custoCategorias: cats }); setEditandoCats(false); }}>Salvar categorias</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cfg.custoCategorias.map((x) => (
              <span key={x.nome} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.04] border border-white/10 text-white/85">
                {x.nome}{x.metaMensal > 0 && <span className="text-text-secondary"> · meta {fmtBRL(x.metaMensal)}</span>}
              </span>
            ))}
          </div>
        )}
      </Secao>
    </div>
  );
}
