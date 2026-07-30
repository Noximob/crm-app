'use client';

/**
 * Minhas comissões — a visão do CORRETOR sobre o Financeiro.
 *
 * Lê as vendas dele em /vendas (a fonte oficial: o rateio que o admin
 * oficializou) e mostra: o trimestre, a faixa em que ele está, quanto falta
 * pro próximo degrau, o que tem a receber e o que já foi pago.
 * Substitui o app de Comissões legado (iframe) — read-only por natureza:
 * quem dita números é o admin, no Financeiro.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import LoadingState from '@/components/ui/LoadingState';
import {
  normalizarConfig, type ConfigFinanceiro, type Venda,
  tabelaVigente, periodoDe, labelTrimestre, hojeYMD, round2,
  fmtBRL, fmtBRL2, fmtPctBR,
} from '@/lib/financeiro';

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

/** Demo (modo Espelho): números de exemplo. */
function demoMinhasVendas(uid: string): Venda[] {
  const ym = hojeYMD().slice(0, 7);
  const mk = (id: string, data: string, extra: Partial<Venda>): Venda => ({
    id, imobiliariaId: 'espelho-demo', corretorUid: uid, corretorNome: 'Você',
    valorBruto: 800_000, valorPermuta: 0, parceriaPct: 0, tipoProduto: 'lancamento',
    origem: 'carteira', status: 'assinada', dataVenda: data, percComissao: 5,
    vgvLiquido: 800_000, comissaoBruta: 40_000, imposto: 3_640, retencaoLead: 0, baseRateio: 36_360,
    rateio: [{ papel: 'corretor', uid, nome: 'Você', pct: 50, valor: 18_180, statusNota: 'pendente' }], ...extra,
  });
  return [
    mk('d1', `${ym}-05`, { leadNome: 'Beatriz Souza', empreendimento: 'Orla da Barra' }),
    mk('d2', `${ym}-14`, {
      leadNome: 'Carlos Melo', empreendimento: 'Vista Mar', valorBruto: 600_000, vgvLiquido: 600_000,
      comissaoBruta: 30_000, imposto: 2_730, baseRateio: 27_270,
      rateio: [{ papel: 'corretor', uid, nome: 'Você', pct: 50, valor: 13_635, statusNota: 'emitida', pago: true }],
    }),
    mk('d3', hojeYMD(), { leadNome: 'Eduardo Lima', status: 'pendente_confirmacao', valorBruto: 650_000, vgvLiquido: undefined, comissaoBruta: undefined, rateio: undefined }),
  ];
}

export default function MinhasComissoesPage() {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
  const uid = currentUser?.uid;
  const imobiliariaId = userData?.imobiliariaId;

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [cfgDoc, setCfgDoc] = useState<Partial<ConfigFinanceiro> | null>(null);
  const [loading, setLoading] = useState(true);
  // '' = período corrente (resolvido quando a config carrega)
  const [triSel, setTriSel] = useState('');

  useEffect(() => {
    if (!uid) return;
    if (isEspelhoDemo) {
      setVendas(demoMinhasVendas(uid));
      setLoading(false);
      return;
    }
    const u1 = onSnapshot(query(collection(db, 'vendas'), where('corretorUid', '==', uid)),
      (s) => { setVendas(s.docs.map((d) => ({ id: d.id, ...d.data() } as Venda))); setLoading(false); },
      () => setLoading(false));
    const u2 = imobiliariaId
      ? onSnapshot(doc(db, 'configFinanceiro', imobiliariaId),
        (s) => setCfgDoc(s.exists() ? (s.data() as Partial<ConfigFinanceiro>) : null), () => {})
      : undefined;
    return () => { u1(); if (u2) u2(); };
  }, [uid, imobiliariaId, isEspelhoDemo]);

  const cfg: ConfigFinanceiro = useMemo(() => normalizarConfig(cfgDoc), [cfgDoc]);
  const periodoAtual = useMemo(() => periodoDe(hojeYMD(), cfg), [cfg]);
  const triAtivo = triSel || periodoAtual;

  const trimestres = useMemo(() => {
    const s = new Set(vendas.map((v) => periodoDe(v.dataVenda, cfg)).filter(Boolean));
    s.add(periodoAtual);
    return Array.from(s).sort().reverse();
  }, [vendas, cfg, periodoAtual]);

  const resumo = useMemo(() => {
    const doTri = vendas.filter((v) => periodoDe(v.dataVenda, cfg) === triAtivo);
    const assinadas = doTri.filter((v) => v.status === 'assinada');
    const pendentes = doTri.filter((v) => v.status === 'pendente_confirmacao');
    const minhaFatia = (v: Venda) => (v.rateio || []).find((b) => b.papel === 'corretor');
    const vgvTri = round2(assinadas.reduce((s, v) => s + (v.vgvLiquido || 0), 0));
    const ajustes = round2(doTri.filter((v) => v.status === 'assinada' || v.status === 'distratada')
      .reduce((s, v) => s + (v.ajustes || []).reduce((a, x) => a + (x.deltaCorretor || 0), 0), 0));
    const totalTri = round2(assinadas.reduce((s, v) => s + (minhaFatia(v)?.valor || 0), 0) + ajustes);
    const jaPago = round2(assinadas.reduce((s, v) => { const b = minhaFatia(v); return s + (b?.pago ? b.valor : 0); }, 0));
    const aReceber = round2(totalTri - jaPago);
    const notasPendentes = assinadas.reduce((s, v) => { const b = minhaFatia(v); return s + (b && b.statusNota === 'pendente' ? 1 : 0); }, 0);

    // faixa atual + quanto falta pro degrau (mesma régua do admin — coluna do corretor)
    const faixas = tabelaVigente(cfg, hojeYMD());
    let faixaAtual = faixas[faixas.length - 1].corretor;
    let proxima: { falta: number; pct: number } | null = null;
    for (let i = 0; i < faixas.length; i++) {
      const limite = faixas[i].ateVgv;
      if (limite === null || vgvTri < limite) {
        faixaAtual = faixas[i].corretor;
        if (limite !== null) proxima = { falta: round2(limite - vgvTri), pct: faixas[i + 1]?.corretor ?? faixas[i].corretor };
        break;
      }
    }
    return { doTri, assinadas, pendentes, vgvTri, ajustes, totalTri, jaPago, aReceber, notasPendentes, faixaAtual, proxima, minhaFatia };
  }, [vendas, triAtivo, cfg]);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Minhas comissões</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">
            Suas vendas oficializadas e a progressão de faixa do trimestre.
            {isEspelhoDemo && <span className="text-amber-300 font-bold"> · modo demonstração</span>}
          </p>
        </div>
        <select value={triAtivo} onChange={(e) => setTriSel(e.target.value)}
          className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40">
          {trimestres.map((t) => <option key={t} value={t}>{labelTrimestre(t)}</option>)}
        </select>
      </div>

      {loading ? <LoadingState label="Carregando suas comissões..." className="py-10" /> : (
        <>
          {/* progressão do trimestre */}
          <section className="al-card relative overflow-hidden p-4 sm:p-5">
            <div className="absolute inset-x-0 top-0 gx-line-gold" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Metric label="VGV no trimestre" valor={fmtBRL(resumo.vgvTri)} tom="al-grad-text" />
              <Metric label="Sua faixa agora" valor={fmtPctBR(resumo.faixaAtual, 0)} tom="text-[#E8C547]" hint="da base de rateio" />
              <Metric label="Total do trimestre" valor={fmtBRL2(resumo.totalTri)} hint={resumo.ajustes !== 0 ? `inclui ajustes ${fmtBRL2(resumo.ajustes)}` : undefined} />
              <Metric label="A receber" valor={fmtBRL2(resumo.aReceber)} tom={resumo.aReceber > 0 ? 'text-emerald-300' : 'text-white'} hint={resumo.jaPago > 0 ? `já pago ${fmtBRL2(resumo.jaPago)}` : undefined} />
            </div>
            {resumo.proxima ? (
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] text-text-secondary">faltam <b className="text-white">{fmtBRL(resumo.proxima.falta)}</b> de VGV pra faixa de <b className="text-[#E8C547]">{fmtPctBR(resumo.proxima.pct, 0)}</b></span>
                  <span className="text-[10px] text-text-secondary">a progressão zera na virada do trimestre</span>
                </div>
                <Barra pct={resumo.vgvTri / (resumo.vgvTri + resumo.proxima.falta)} cor="linear-gradient(90deg,#E8C547,#C89210)" alt="h-3" />
              </div>
            ) : (
              <p className="text-[11px] text-emerald-300 font-bold">🏆 Você está na faixa máxima do trimestre!</p>
            )}
            {resumo.notasPendentes > 0 && (
              <p className="mt-3 text-[11px] font-bold text-amber-300">🧾 {resumo.notasPendentes} nota{resumo.notasPendentes > 1 ? 's' : ''} fiscal{resumo.notasPendentes > 1 ? 'is' : ''} pendente{resumo.notasPendentes > 1 ? 's' : ''} — emita pra liberar o pagamento.</p>
            )}
          </section>

          {/* aguardando confirmação */}
          {resumo.pendentes.length > 0 && (
            <div className="al-card relative overflow-hidden p-3.5 border border-amber-500/30">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <p className="text-[12px] text-amber-200">
                ⏳ <b>{resumo.pendentes.length} venda{resumo.pendentes.length > 1 ? 's' : ''} aguardando confirmação do admin</b> — o valor da sua comissão aparece aqui quando o rateio for oficializado no Financeiro.
              </p>
            </div>
          )}

          {/* vendas do trimestre */}
          <section className="al-card relative overflow-hidden p-4 sm:p-5">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.1em] mb-3">Suas vendas · {labelTrimestre(triAtivo)}</h2>
            {resumo.doTri.length === 0 ? (
              <p className="text-[12.5px] text-text-secondary py-6 text-center">
                Nenhuma venda neste trimestre ainda. Quando você fechar um cliente no atendimento (botão FECHOU! 🎉), ela aparece aqui após a confirmação do admin.
              </p>
            ) : (
              <div className="space-y-2">
                {[...resumo.doTri].sort((a, b) => (a.dataVenda < b.dataVenda ? 1 : -1)).map((v) => {
                  const b = resumo.minhaFatia(v);
                  const pendente = v.status === 'pendente_confirmacao';
                  const distratada = v.status === 'distratada';
                  return (
                    <div key={v.id} className={`rounded-xl border p-3 ${distratada ? 'bg-rose-500/[0.04] border-rose-500/25 opacity-75' : pendente ? 'bg-amber-500/[0.04] border-amber-500/25' : 'bg-white/[0.03] border-white/10'}`}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[12px] text-white/60 tabular-nums shrink-0">{v.dataVenda.split('-').reverse().slice(0, 2).join('/')}</span>
                        <span className="flex-1 min-w-[140px]">
                          <span className="block text-[13px] font-bold text-white truncate">{v.leadNome || 'Venda'}</span>
                          <span className="block text-[10.5px] text-text-secondary truncate">{[v.empreendimento, v.construtora].filter(Boolean).join(' · ') || '—'}</span>
                        </span>
                        <span className="text-[12px] text-white/80 tabular-nums shrink-0">VGV {fmtBRL(v.vgvLiquido ?? v.valorBruto)}</span>
                        {distratada ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/10 border border-rose-500/40 text-rose-300 shrink-0">distratada</span>
                        ) : pendente ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 border border-amber-500/40 text-amber-300 shrink-0">aguardando admin</span>
                        ) : (
                          <span className="text-right shrink-0">
                            <span className="block al-display text-[16px] font-bold text-[#E8C547] tabular-nums">{fmtBRL2(b?.valor || 0)}</span>
                            <span className="block text-[10px] text-text-secondary">{b?.pct ? `${fmtPctBR(b.pct)} da base · ` : ''}{b?.pago ? '✓ pago' : b?.statusNota === 'pendente' ? 'emitir NF' : 'a receber'}</span>
                          </span>
                        )}
                      </div>
                      {(v.ajustes?.length || 0) > 0 && (
                        <p className="mt-1.5 text-[10.5px] text-amber-300/90">
                          {(v.ajustes || []).map((a, i) => <span key={i}>· ajuste {a.deltaCorretor >= 0 ? '+' : ''}{fmtBRL2(a.deltaCorretor)} ({a.motivo.split('—')[0].trim()}) </span>)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <p className="text-center text-[10px] text-text-secondary px-4">
            Os valores são calculados pelo Financeiro do admin na oficialização de cada venda — imposto e retenções já descontados.
            Dúvida sobre um valor? Fala com a gestão.
          </p>
        </>
      )}
    </div>
  );
}
