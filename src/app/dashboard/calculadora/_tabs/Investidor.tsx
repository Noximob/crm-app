'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import MoneyInput, { formatBRL } from '@/components/MoneyInput';
import { showToast } from '@/components/ui/toast';
import type { HeaderImovel } from './shared';

const PERIODOS: Record<string, { label: string; meses: number }> = {
  semestral: { label: 'Semestrais', meses: 6 },
  anual: { label: 'Anuais', meses: 12 },
};

const brl = (n: number) => 'R$ ' + formatBRL(n);
const numI = (s: string) => { const v = parseFloat(s); return isNaN(v) ? 0 : v; };
const numF = (s: string) => { const v = parseFloat(String(s).replace(',', '.')); return isNaN(v) ? 0 : v; };
const fmtNum2 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct2 = (n: number) => fmtNum2(n) + '%';

const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtData = (d: Date) => d.toLocaleDateString('pt-BR');
/** Soma meses preservando o dia (trava no último dia do mês quando não existe, ex.: 31/jan + 1m = 28/fev). */
const addMonths = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimo = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(d.getDate(), ultimo));
  return x;
};
/** Meses inteiros entre duas datas (diferença de calendário, pode ser negativo). */
const mesesEntre = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

/** TIR mensal por bisseção robusta sobre NPV(r) = Σ cf_t / (1+r)^t. Devolve null se não convergir. */
function irrMensal(cf: number[]): number | null {
  const npv = (r: number) => cf.reduce((acc, v, t) => acc + v / Math.pow(1 + r, t), 0);
  let lo = -0.95, hi = 5;
  let fLo = npv(lo), fHi = npv(hi);
  if (!isFinite(fLo) || !isFinite(fHi) || fLo * fHi > 0) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7 || (hi - lo) / 2 < 1e-9) return mid;
    if (fLo * fMid < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

// ---------- blocos de UI (nível de módulo p/ não perder foco) ----------
const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-[15px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 transition';
// variação compacta p/ as linhas de reforço (data + valor lado a lado em 375px)
const refInputCls = 'w-full px-2 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 transition tabular-nums';
const Campo = ({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-text-secondary mt-1">{hint}</p>}
  </div>
);
const Secao = ({ icon, titulo, children }: { icon: string; titulo: string; children: React.ReactNode }) => (
  <div className="al-card relative overflow-hidden rounded-2xl p-5">
    <div className="absolute inset-x-0 top-0 gx-line" />
    <div className="flex items-center gap-2.5 mb-4">
      <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#FF1E56] to-[#A50D38] shadow-[0_0_8px_rgba(255,30,86,0.5)]" />
      <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">{titulo}</h2>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

/** Toggle no padrão do CUB: botão largo com chavinha + campo de % quando ligado. */
const ToggleCusto = ({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) => (
  <button type="button" onClick={onToggle} aria-pressed={on}
    className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl border text-[14px] font-bold transition-colors ${on ? 'border-[#FF3364]/50 bg-[#FF1E56]/10 text-[#FF9EB5]' : 'border-white/10 bg-white/[0.04] text-text-secondary hover:text-white'}`}>
    <span>{label}</span>
    <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${on ? 'bg-[#FF5C7E]' : 'bg-white/15'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </span>
  </button>
);

/** Número animado: conta do valor anterior até o novo com easing (adaptado do placar da home). */
const CountUp = ({ n, fmt, className = '' }: { n: number; fmt: (v: number) => string; className?: string }) => {
  const [v, setV] = useState(0);
  const fmtRef = useRef(fmt); fmtRef.current = fmt;
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    let raf = 0;
    const t0 = performance.now();
    const dur = 900;
    const step = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (n - from) * eased;
      setV(val);
      fromRef.current = val;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <span className={className}>{fmtRef.current(v)}</span>;
};

const Linha = ({ l, v, sub, destaque }: { l: React.ReactNode; v: React.ReactNode; sub?: React.ReactNode; destaque?: boolean }) => (
  <div className="py-1.5 border-b border-white/[0.05] last:border-0">
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-[12px] ${destaque ? 'font-extrabold text-white uppercase tracking-wide' : 'text-text-secondary'}`}>{l}</span>
      <span className={`tabular-nums font-bold whitespace-nowrap ${destaque ? 'al-display text-[15px] text-[#FFE9A6]' : 'text-[13px] text-white'}`}>{v}</span>
    </div>
    {sub && <div className="text-[10.5px] text-text-secondary mt-0.5">{sub}</div>}
  </div>
);

const chipCls = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap';

export default function InvestidorTab({ header }: { header: HeaderImovel }) {
  // identificação do imóvel: vem do cabeçalho compartilhado da Calculadora
  const { empreendimento, unidade, torre, cliente, valorImovel } = header;
  // Seção — prazo
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(() => toYMD(new Date()));
  const [dataEntrega, setDataEntrega] = useState('');
  const [dataVenda, setDataVenda] = useState('');
  // Seção — pagamentos até as chaves
  const [entrada, setEntrada] = useState(0);
  const [nParcelas, setNParcelas] = useState('');
  const [valorParcela, setValorParcela] = useState(0);
  const [nReforcos, setNReforcos] = useState('');
  const [periodicidade, setPeriodicidade] = useState('anual');
  // datas dos reforços: '' = usa a sugerida (1ª parcela + j×periodicidade) — mesma ideia do refDatas do fluxo
  const [refDatas, setRefDatas] = useState<string[]>([]);
  // valores dos reforços: null = intocado → espelha o primeiro valor digitado; editado mantém o seu
  const [refValores, setRefValores] = useState<(number | null)[]>([]);
  // Seção — índices
  const [cubOn, setCubOn] = useState(false);
  const [cubAA, setCubAA] = useState('');
  const [valAA, setValAA] = useState('');
  // Seção — custos na venda (igual ao CUB: toggle + % definido pelo usuário)
  const [comissaoOn, setComissaoOn] = useState(false);
  const [comissaoPct, setComissaoPct] = useState('');
  const [distratoOn, setDistratoOn] = useState(false);
  const [distratoPct, setDistratoPct] = useState('');

  const c = useMemo(() => {
    const valor = valorImovel;
    const nParc = Math.max(0, Math.round(numI(nParcelas)));
    const nRef = Math.max(0, Math.round(numI(nReforcos)));
    const perMeses = PERIODOS[periodicidade].meses;
    const base = dataPrimeiraParcela ? parseLocal(dataPrimeiraParcela) : new Date();

    // prazo em meses inteiros entre a 1ª parcela e a entrega (mín 1)
    let M = 0;
    let semEntrega = true;
    if (dataEntrega) {
      semEntrega = false;
      M = Math.max(1, mesesEntre(base, parseLocal(dataEntrega)));
    }

    // venda antecipada (opcional): V meses entre a 1ª parcela e a venda pretendida
    let V = 0;
    let vendaAtiva = false;
    let vendaIgnorada = false;
    if (dataVenda && !semEntrega) {
      V = Math.max(1, mesesEntre(base, parseLocal(dataVenda)));
      if (V < M) vendaAtiva = true; else { vendaIgnorada = true; V = 0; }
    }
    // horizonte da projeção: até a venda antecipada (V) ou até as chaves (M)
    const H = vendaAtiva ? V : M;

    // reforços individuais: data sugerida = 1ª parcela + j×periodicidade (override em refDatas);
    // valor intocado espelha o primeiro valor digitado (override em refValores)
    const valorPadraoRef = refValores.find((v) => v !== null && v !== undefined) ?? 0;
    const refs = Array.from({ length: nRef }, (_, i) => {
      const ymdSugerida = toYMD(addMonths(base, (i + 1) * perMeses));
      const ymd = refDatas[i] || ymdSugerida;
      const mBruto = mesesEntre(base, parseLocal(ymd));
      const valorRef = refValores[i] ?? valorPadraoRef;
      return { ymd, ymdSugerida, m: Math.max(0, mBruto), antesBase: mBruto < 0, valor: valorRef, aposH: false, pago: valorRef };
    });

    // resumo nominal (independe de datas/índices)
    const totalParcNom = nParc * valorParcela;
    const totalRefNom = refs.reduce((acc, r) => acc + r.valor, 0);
    // saldo que o plano de pagamento nunca cobre (nominal)
    const saldoResidualNominal = Math.max(0, valor - entrada - totalParcNom - totalRefNom);

    const bloqueado = semEntrega || valor <= 0;

    // taxas mensais equivalentes
    const cubPct = numF(cubAA);
    const valPct = numF(valAA);
    const icub = cubOn ? Math.pow(1 + cubPct / 100, 1 / 12) - 1 : 0;
    const ival = Math.pow(1 + valPct / 100, 1 / 12) - 1;
    // custos na venda (% sobre o valor de venda, descontados no momento da venda)
    const comissaoPctN = comissaoOn ? numF(comissaoPct) : 0;
    const distratoPctN = distratoOn ? numF(distratoPct) : 0;

    // projeção de venda no mês H: o que vence depois do mês H não é pago
    // mês a mês — é quitado na venda (mês H), pelo valor nominal (corrigido
    // pelo acumulado do CUB até H quando o toggle está ligado).
    let parcAposH = 0, refAposH = 0, restParcNom = 0, restRefNom = 0;
    let investido = 0, totalParcCorr = 0, totalRefCorr = 0, totalRefPagoNom = 0;
    let valorVenda = 0, equity = 0, lucro = 0, roi = 0;
    let comissaoR = 0, distratoR = 0;
    let tirMes: number | null = null, tirAno: number | null = null;
    const cf = new Array<number>(Math.max(1, H) + 1).fill(0);

    if (!semEntrega) {
      cf[0] = -entrada;
      // a data-base é a da 1ª PARCELA: parcela k cai no mês k-1 (a 1ª cai na
      // própria data-base, sem correção; a 2ª um mês depois, e assim por diante)
      for (let k = 1; k <= nParc; k++) {
        const m = k - 1;
        if (m <= H) {
          const pago = cubOn ? valorParcela * Math.pow(1 + icub, m) : valorParcela;
          totalParcCorr += pago;
          cf[m] -= pago;
        } else { parcAposH++; restParcNom += valorParcela; }
      }
      // cada reforço cai no mês da SUA data efetiva (m já vem clampado em ≥ 0);
      // depois do horizonte H ele vai, nominal, para a quitação na venda
      for (const r of refs) {
        if (r.m <= H) {
          r.pago = cubOn ? r.valor * Math.pow(1 + icub, r.m) : r.valor;
          totalRefCorr += r.pago;
          totalRefPagoNom += r.valor;
          cf[r.m] -= r.pago;
        } else { r.aposH = true; refAposH++; restRefNom += r.valor; }
      }
    }
    // quitação na venda = parcelas/reforços restantes + saldo residual
    const quitacaoNominal = restParcNom + restRefNom + saldoResidualNominal;
    const quitacaoComCub = quitacaoNominal * Math.pow(1 + icub, H);
    const quitacao = cubOn ? quitacaoComCub : quitacaoNominal;
    const temAposH = parcAposH + refAposH > 0;

    if (!bloqueado) {
      investido = entrada + totalParcCorr + totalRefCorr;
      valorVenda = valor * Math.pow(1 + ival, H);
      // comissão e distrato saem do resultado NO MOMENTO DA VENDA
      comissaoR = valorVenda * (comissaoPctN / 100);
      distratoR = valorVenda * (distratoPctN / 100);
      equity = valorVenda - quitacao - comissaoR - distratoR;
      lucro = equity - investido;
      roi = investido > 0 ? lucro / investido : 0;
      if (investido > 0) {
        cf[H] += equity;
        tirMes = irrMensal(cf);
        tirAno = tirMes !== null ? Math.pow(1 + tirMes, 12) - 1 : null;
      }
    }

    return {
      valor, M, V, H, vendaAtiva, vendaIgnorada, semEntrega, nParc, nRef, perMeses, refs,
      totalParcNom, totalRefNom, saldoResidualNominal, quitacaoNominal, quitacaoComCub,
      quitacao, parcAposH, refAposH, temAposH, bloqueado, cubPct, valPct,
      comissaoPctN, distratoPctN, comissaoR, distratoR,
      investido, totalParcCorr, totalRefCorr, totalRefPagoNom,
      valorVenda, equity, lucro, roi, tirMes, tirAno,
    };
  }, [valorImovel, dataPrimeiraParcela, dataEntrega, dataVenda, entrada, nParcelas, valorParcela, nReforcos, refDatas, refValores, periodicidade, cubOn, cubAA, valAA, comissaoOn, comissaoPct, distratoOn, distratoPct]);

  const setRefData = (j: number, v: string) => setRefDatas((prev) => { const n = [...prev]; n[j] = v; return n; });
  const setRefValor = (j: number, v: number) => setRefValores((prev) => { const n = [...prev]; n[j] = v; return n; });

  const parcPagas = c.nParc - c.parcAposH;
  const refPagos = c.nRef - c.refAposH;
  const temCustosVenda = c.comissaoR > 0 || c.distratoR > 0;
  const quandoVenda = c.vendaAtiva ? 'na venda' : 'nas chaves';
  // barras da jornada (mesma escala; negativo trava em 0)
  const maxJornada = Math.max(c.investido, c.equity, 1);
  const wInveste = Math.max(0, Math.min(1, c.investido / maxJornada)) * 100;
  const wVira = Math.max(0, Math.min(1, c.equity / maxJornada)) * 100;
  const wRoi = Math.max(0, Math.min(c.roi / 2, 1)) * 100; // barra do ROI limitada a 200%

  /** Documento impresso: uma página, linguagem de leigo, valores finais.
   *  Quando o CUB está ligado, os valores já saem corrigidos e o documento
   *  NÃO mostra nenhuma comparação sem/com CUB — só a nota discreta no rodapé. */
  const gerarProposta = () => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const entrega = dataEntrega ? fmtData(parseLocal(dataEntrega)) : '—';
    const vendaStr = c.vendaAtiva && dataVenda ? fmtData(parseLocal(dataVenda)) : entrega;
    const tirMesStr = c.tirMes !== null ? fmtPct2(c.tirMes * 100) : '—';
    const tirAnoStr = c.tirAno !== null ? fmtPct2(c.tirAno * 100) : '—';
    const unidadeTorre = [unidade, torre].filter(Boolean).join(' · ');

    // valores FINAIS (já corrigidos quando o CUB está ligado) — sem comparações
    const parcTotalFinal = cubOn ? c.totalParcCorr : parcPagas * valorParcela;
    const refsPagos = c.refs.filter((r) => !r.aposH && r.valor > 0);
    const refTotalFinal = cubOn ? c.totalRefCorr : c.totalRefPagoNom;
    const refsIguais = refsPagos.length > 0 && refsPagos.every((r) => r.valor === refsPagos[0].valor);
    const refDatasTxt = refsPagos.map((r) => fmtData(parseLocal(r.ymd))).join(' · ');

    const linha = (lab: string, sub: string, val: string, cls = '') =>
      `<div class="li${cls ? ' ' + cls : ''}"><div class="lt"><div class="ll">${lab}</div>${sub ? `<div class="ls">${sub}</div>` : ''}</div><div class="lv">${val}</div></div>`;

    const inv: string[] = [];
    if (entrada > 0) inv.push(linha('Entrada', 'paga no ato', brl(entrada)));
    if (parcPagas > 0 && valorParcela > 0) inv.push(linha('Parcelas mensais', cubOn ? `${parcPagas} pagamentos, um por mês` : `${parcPagas} pagamentos de ${brl(valorParcela)}`, brl(parcTotalFinal)));
    if (refsPagos.length > 0 && refTotalFinal > 0) inv.push(linha(refsPagos.length > 1 ? 'Reforços' : 'Reforço', `${!cubOn && refsIguais ? `${refsPagos.length}× de ${brl(refsPagos[0].valor)} · ` : ''}${refDatasTxt}`, brl(refTotalFinal)));
    inv.push(linha('Total que o investidor coloca', `ao longo de ${c.H} meses`, brl(c.investido), 'tot'));

    const ven: string[] = [];
    ven.push(linha('Data da venda', c.vendaAtiva ? `antes da entrega das chaves (entrega em ${entrega})` : 'na entrega das chaves', vendaStr));
    ven.push(linha('Valor de venda do imóvel', `com o imóvel valorizando ${c.valPct.toLocaleString('pt-BR')}% ao ano`, brl(c.valorVenda)));
    ven.push(linha('Quitação com a construtora', 'o que ainda falta do imóvel, pago com o dinheiro da venda', `− ${brl(c.quitacao)}`, 'neg'));
    if (c.comissaoR > 0) ven.push(linha(`Comissão de venda (${c.comissaoPctN.toLocaleString('pt-BR')}%)`, 'paga na venda', `− ${brl(c.comissaoR)}`, 'neg'));
    if (c.distratoR > 0) ven.push(linha(`Distrato / taxa de cessão (${c.distratoPctN.toLocaleString('pt-BR')}%)`, 'paga na venda', `− ${brl(c.distratoR)}`, 'neg'));
    ven.push(linha('Fica para o investidor', `valor da venda menos quitação${temCustosVenda ? ' e custos' : ''}`, brl(c.equity), 'tot'));

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Simulação de Investimento — Nox Imóveis</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#13212e;padding:36px 42px;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .brand{font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;letter-spacing:.02em}.brand span{color:#b9852b}
  .brandsub{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#b9852b;margin-top:2px}
  .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #b9852b;padding-bottom:12px;margin-bottom:16px}
  .doc{font-size:11px;color:#6c7480;text-align:right;line-height:1.6}
  .imovel{display:flex;justify-content:space-between;align-items:center;gap:16px;background:#f7f5f0;border:1px solid #e6e1d6;border-radius:10px;padding:12px 16px;margin-bottom:18px}
  .imovel .emp{font-size:15px;font-weight:700}
  .imovel .un{font-size:11.5px;color:#6c7480;margin-top:2px}
  .imovel .val{text-align:right;white-space:nowrap}
  .imovel .val .k{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:#8a8f96;font-weight:700}
  .imovel .val .n{font-size:17px;font-weight:800}
  .sec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:#b9852b;margin:0 0 6px}
  .sec b{color:#13212e}
  .card{border:1px solid #e6e1d6;border-radius:10px;padding:2px 16px;margin-bottom:16px}
  .li{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:8px 0;border-bottom:1px solid #f0ede6}
  .card .li:last-child{border-bottom:none}
  .ll{font-size:13px;font-weight:600}
  .ls{font-size:10.5px;color:#9aa0a6;margin-top:1px}
  .lv{font-size:13.5px;font-weight:700;white-space:nowrap}
  .li.neg .lv{color:#b3261e}
  .li.tot{border-top:2px solid #13212e}
  .li.tot .ll{font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:800}
  .li.tot .lv{font-size:15.5px;font-weight:800}
  .story{font-size:13px;color:#3c4652;background:#faf8f3;border:1px solid #e6e1d6;border-radius:10px;padding:10px 14px;margin-bottom:10px;line-height:1.55}
  .tiles{display:flex;gap:10px;margin-bottom:10px}
  .tile{flex:1;border:1px solid #e6e1d6;border-radius:10px;padding:12px 10px;text-align:center;background:#faf8f3}
  .tile .k{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:#8a8f96;margin-bottom:4px;font-weight:700}
  .tile .n{font-size:20px;font-weight:800;white-space:nowrap}
  .tile .n.pos{color:#0f7a4d}.tile .n.neg{color:#b3261e}
  .tirband{display:flex;justify-content:space-between;align-items:center;gap:16px;background:#13212e;border-radius:10px;padding:14px 18px}
  .tirband .k{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#e8c547;font-weight:800}
  .tirband .s{font-size:10px;color:#9fb0c0;margin-top:3px}
  .tirband .big{font-size:26px;font-weight:800;color:#e8c547;white-space:nowrap;text-align:right}
  .tirband .eq{font-size:11px;color:#9fb0c0;font-weight:600;margin-top:2px;text-align:right}
  .foot{margin-top:16px;font-size:10px;color:#9aa0a6;border-top:1px solid #e6e1d6;padding-top:10px;line-height:1.5}
  @media print{body{padding:20px 26px}}
</style></head><body>
  <div class="head"><div><div class="brand">NOX <span>IMÓVEIS</span></div><div class="brandsub">Simulação de Investimento</div></div>
    <div class="doc">${hoje}${cliente ? `<br>Preparada para <b>${cliente}</b>` : ''}</div></div>

  <div class="imovel">
    <div>
      <div class="emp">${empreendimento || 'Imóvel em análise'}</div>
      ${unidadeTorre ? `<div class="un">${unidadeTorre}</div>` : ''}
    </div>
    <div class="val"><div class="k">Valor do imóvel hoje</div><div class="n">${brl(c.valor)}</div></div>
  </div>

  <div class="sec">1 · O investimento</div>
  <div class="card">${inv.join('')}</div>

  <div class="sec">2 · A venda projetada</div>
  <div class="card">${ven.join('')}</div>

  <div class="sec">3 · O resultado</div>
  <div class="story">Em <b>${c.H} meses</b>, o investidor coloca <b>${brl(c.investido)}</b> e sai da venda com <b>${brl(c.equity)}</b> — lucro de <b>${brl(c.lucro)}</b>.</div>
  <div class="tiles">
    <div class="tile"><div class="k">Patrimônio na venda</div><div class="n">${brl(c.equity)}</div></div>
    <div class="tile"><div class="k">Lucro</div><div class="n ${c.lucro >= 0 ? 'pos' : 'neg'}">${brl(c.lucro)}</div></div>
    <div class="tile"><div class="k">Retorno (ROI)</div><div class="n ${c.lucro >= 0 ? 'pos' : 'neg'}">${fmtPct2(c.roi * 100)}</div></div>
  </div>
  <div class="tirband">
    <div><div class="k">Rendimento do dinheiro (TIR)</div><div class="s">como uma aplicação que rende isso por mês, todo mês</div></div>
    <div><div class="big">${tirMesStr} ao mês</div><div class="eq">equivalente a ${tirAnoStr} ao ano</div></div>
  </div>

  <div class="foot">Simulação elaborada pela Nox Imóveis em ${hoje}, para estudo — não é promessa de rentabilidade. Valores e condições sujeitos à confirmação da construtora.${cubOn ? ' Os valores consideram o reajuste contratual previsto.' : ''}</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { showToast('Libere os pop-ups para gerar a proposta.', 'error'); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_minmax(360px,420px)] gap-5 items-start">
      {/* ---------- FORM ---------- */}
      <div className="space-y-4">
        <Secao icon="📅" titulo="Prazo">
          <div className="grid sm:grid-cols-3 gap-3">
            <Campo label="Data da 1ª parcela" hint="o cronograma conta a partir dela"><input type="date" value={dataPrimeiraParcela} onChange={(e) => setDataPrimeiraParcela(e.target.value)} className={inputCls} /></Campo>
            <Campo label="Entrega das chaves" hint={!c.semEntrega ? <>prazo de <b className="text-white">{c.M} meses</b> até as chaves</> : undefined}>
              <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className={inputCls} />
            </Campo>
            <Campo label="Venda pretendida (opcional)" hint={c.vendaAtiva ? <>venda no <b className="text-white">mês {c.V} de {c.M}</b>, antes das chaves</> : 'se o investidor quer vender antes das chaves'}>
              <input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} className={inputCls} />
            </Campo>
          </div>
          {c.semEntrega && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-2.5 text-[13px] text-amber-200">
              Escolha a data de entrega das chaves para eu calcular a valorização e a TIR.
            </div>
          )}
          {c.vendaIgnorada && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-2.5 text-[13px] text-amber-200">
              venda após a entrega — usando a data das chaves
            </div>
          )}
        </Secao>

        <Secao icon="💵" titulo="O que o investidor paga até as chaves">
          <div className="grid sm:grid-cols-3 gap-3">
            <Campo label="Entrada" hint="paga no ato (mês 0) — nunca corrige"><MoneyInput value={entrada} onChange={setEntrada} placeholder="50.000,00" className={inputCls} /></Campo>
            <Campo label="Qtde de parcelas mensais" hint="caem nos meses 1, 2, 3…">
              <input type="number" min="0" value={nParcelas} onChange={(e) => setNParcelas(e.target.value)} placeholder="36" className={inputCls + ' tabular-nums'} />
            </Campo>
            <Campo label="Valor de cada parcela"><MoneyInput value={valorParcela} onChange={setValorParcela} placeholder="3.000,00" className={inputCls} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Qtde de reforços" hint="data e valor editáveis abaixo">
              <input type="number" min="0" value={nReforcos} onChange={(e) => setNReforcos(e.target.value)} placeholder="3" className={inputCls + ' tabular-nums'} />
            </Campo>
            <Campo label="Periodicidade dos reforços" hint={periodicidade === 'anual' ? 'sugere os meses 12, 24, 36…' : 'sugere os meses 6, 12, 18…'}>
              <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} className={inputCls}>
                <option value="semestral">Semestrais</option><option value="anual">Anuais</option>
              </select>
            </Campo>
          </div>
          {c.nRef > 0 && (
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Data e valor de cada reforço (sugeridos — pode alterar)</span>
                {refDatas.some(Boolean) && <button onClick={() => setRefDatas([])} className="text-[11px] text-[#FF7A97] font-bold hover:underline whitespace-nowrap shrink-0">usar sugeridas</button>}
              </div>
              {c.refs.map((r, j) => (
                <div key={j}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                      Reforço {j + 1} <span className="normal-case font-semibold text-white/40 tracking-normal">· mês {r.m}</span>
                    </span>
                    {r.antesBase && <span className="text-[10px] text-amber-300 text-right">reforço antes da 1ª parcela — considerado no mês 0</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={refDatas[j] || r.ymdSugerida} onChange={(e) => setRefData(j, e.target.value)} className={refInputCls} />
                    <MoneyInput value={r.valor} onChange={(v) => setRefValor(j, v)} placeholder="20.000,00" prefix={false} className={refInputCls} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {c.temAposH && (
            <p className="text-[11px] text-text-secondary">
              {[c.parcAposH > 0 ? `${c.parcAposH} parcela${c.parcAposH > 1 ? 's' : ''}` : '', c.refAposH > 0 ? `${c.refAposH} reforço${c.refAposH > 1 ? 's' : ''}` : ''].filter(Boolean).join(' e ')} venceriam depois d{c.vendaAtiva ? 'a venda pretendida' : 'a entrega'} — na projeção, são quitad{c.parcAposH > 0 ? 'as' : 'os'} na venda (mês {c.H}).
            </p>
          )}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] px-3.5 py-2.5 flex items-center justify-between gap-3">
            <span className="text-[13px] text-text-secondary">{c.temAposH ? `Quitação ${quandoVenda} (sem CUB)` : `Fica para ${c.vendaAtiva ? 'a venda' : 'as chaves'} (sem CUB)`}</span>
            <span className="al-display text-[15px] font-bold tabular-nums text-[#FFE9A6]">{brl(c.semEntrega ? c.saldoResidualNominal : c.quitacaoNominal)}</span>
          </div>
        </Secao>

        <Secao icon="📈" titulo="Índices">
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Correção pelo CUB</label>
              <button type="button" onClick={() => setCubOn(!cubOn)} aria-pressed={cubOn}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl border text-[14px] font-bold transition-colors ${cubOn ? 'border-[#E8C547]/50 bg-[#E8C547]/10 text-[#FFE9A6]' : 'border-white/10 bg-white/[0.04] text-text-secondary hover:text-white'}`}>
                <span>Reajustar pelo CUB</span>
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cubOn ? 'bg-[#E8C547]' : 'bg-white/15'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${cubOn ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </span>
              </button>
            </div>
            {cubOn && (
              <Campo label="% CUB ao ano" hint="corrige parcelas, reforços e o saldo devedor">
                <div className="relative">
                  <input type="number" step="any" min="0" value={cubAA} onChange={(e) => setCubAA(e.target.value)} placeholder="6" className={inputCls + ' pr-8 tabular-nums'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-white/40 pointer-events-none">%</span>
                </div>
              </Campo>
            )}
          </div>
          <Campo label="Valorização do imóvel % ao ano" hint="quanto o imóvel valoriza por ano até a venda">
            <div className="relative">
              <input type="number" step="any" min="0" value={valAA} onChange={(e) => setValAA(e.target.value)} placeholder="12" className={inputCls + ' pr-8 tabular-nums'} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-white/40 pointer-events-none">%</span>
            </div>
          </Campo>
        </Secao>

        <Secao icon="🧾" titulo="Custos na venda">
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Comissão de venda</label>
              <ToggleCusto label="Descontar comissão" on={comissaoOn} onToggle={() => setComissaoOn(!comissaoOn)} />
            </div>
            {comissaoOn && (
              <Campo label="% de comissão" hint="sobre o valor de venda — sai do resultado na venda">
                <div className="relative">
                  <input type="number" step="any" min="0" value={comissaoPct} onChange={(e) => setComissaoPct(e.target.value)} placeholder="6" className={inputCls + ' pr-8 tabular-nums'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-white/40 pointer-events-none">%</span>
                </div>
              </Campo>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Distrato / taxa de cessão</label>
              <ToggleCusto label="Descontar distrato" on={distratoOn} onToggle={() => setDistratoOn(!distratoOn)} />
            </div>
            {distratoOn && (
              <Campo label="% do distrato / cessão" hint="sobre o valor de venda — sai do resultado na venda">
                <div className="relative">
                  <input type="number" step="any" min="0" value={distratoPct} onChange={(e) => setDistratoPct(e.target.value)} placeholder="2" className={inputCls + ' pr-8 tabular-nums'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-white/40 pointer-events-none">%</span>
                </div>
              </Campo>
            )}
          </div>
        </Secao>
      </div>

      {/* ---------- RESULTADOS (lateral direita, sticky no desktop) ---------- */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto scrollbar-camouflage">
        {/* TIR — o herói */}
        <div className="relative overflow-hidden rounded-2xl border border-[#E8C547]/50 px-5 py-5 text-center"
          style={{ background: 'linear-gradient(160deg, rgba(232,197,71,0.15), rgba(20,13,5,0.6))', boxShadow: '0 0 30px -10px rgba(232,197,71,0.5), inset 0 1px 0 rgba(232,197,71,0.3)' }}>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#E8C547]">TIR ao mês</div>
          {!c.bloqueado && c.tirMes !== null ? (
            <>
              <div className="mt-1 leading-none whitespace-nowrap">
                <CountUp n={c.tirMes * 100} fmt={fmtNum2} className="al-display align-baseline text-[46px] sm:text-[52px] font-bold al-grad-text tabular-nums leading-[0.95] drop-shadow-[0_0_22px_rgba(232,197,71,0.55)]" />
                <span className="al-display align-baseline text-[17px] sm:text-[19px] font-bold text-[#E8C547] ml-1.5">% a.m.</span>
              </div>
              <div className="text-[12px] text-text-secondary mt-1.5">= <b className="text-[#FFE9A6] tabular-nums">{fmtPct2((c.tirAno || 0) * 100)}</b> ao ano — rendimento do dinheiro investido</div>
            </>
          ) : (
            <>
              <div className="al-display text-[46px] sm:text-[52px] font-bold text-white/25 leading-[0.95] mt-1">—</div>
              <div className="text-[11px] text-text-secondary mt-1.5">{c.bloqueado ? 'rendimento mensal do dinheiro investido' : 'sem TIR para este fluxo'}</div>
            </>
          )}
        </div>

        {!c.bloqueado && (
          <>
            {/* ROI + Lucro */}
            <div className="grid grid-cols-2 gap-4">
              <div className="al-card relative overflow-hidden rounded-2xl px-3 py-3.5 text-center">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400 to-transparent" />
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-300">ROI</div>
                <CountUp n={c.roi * 100} fmt={(v) => fmtNum2(v) + '%'} className="al-display block text-[24px] sm:text-[28px] font-bold text-emerald-300 tabular-nums leading-tight mt-1 drop-shadow-[0_0_14px_rgba(52,211,153,0.45)]" />
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-700" style={{ width: `${wRoi}%` }} />
                </div>
                <div className="text-[9.5px] text-text-secondary mt-1">lucro sobre o investido</div>
              </div>
              <div className="al-card relative overflow-hidden rounded-2xl px-2.5 py-3.5 text-center">
                <div className="absolute inset-x-0 top-0 gx-line-gold" />
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-secondary">Lucro projetado</div>
                <CountUp n={c.lucro} fmt={brl} className={`al-display block text-[15px] sm:text-[19px] font-bold tabular-nums leading-tight mt-2.5 whitespace-nowrap ${c.lucro >= 0 ? 'text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.4)]' : 'text-rose-300'}`} />
                <div className="text-[9.5px] text-text-secondary mt-2.5">patrimônio − investido</div>
              </div>
            </div>

            {/* Investe → vira */}
            <div className="al-card relative overflow-hidden rounded-2xl px-4 py-3.5">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#9F6BFF] to-transparent" />
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-secondary">A jornada do dinheiro</div>
              <div className="space-y-2 mt-2">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#C4A6FF]">Ele investe</span>
                    <CountUp n={c.investido} fmt={brl} className="text-[12px] font-bold tabular-nums text-white whitespace-nowrap" />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden mt-0.5">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#9F6BFF] to-[#7DD3FC] transition-all duration-700" style={{ width: `${wInveste}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-300">Vira</span>
                    <CountUp n={c.equity} fmt={brl} className="text-[12px] font-bold tabular-nums text-white whitespace-nowrap" />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden mt-0.5">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-700" style={{ width: `${wVira}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* chips de cenário */}
        <div className="flex flex-wrap items-center gap-1.5">
          {c.bloqueado ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-amber-400/40 bg-amber-500/10 text-[11px] font-bold text-amber-200">
              {c.valor <= 0 ? 'Preencha o valor do imóvel' : 'Escolha a entrega das chaves'} — os números aparecem aqui na hora
            </span>
          ) : (
            <>
              {c.vendaAtiva ? (
                <span className={`${chipCls} bg-[#E8C547]/10 border-[#E8C547]/45 text-[#FFE9A6]`}>Venda antecipada · mês {c.V} de {c.M}</span>
              ) : (
                <span className={`${chipCls} bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]`}>Venda na entrega · mês {c.M}</span>
              )}
              {cubOn ? (
                <span className={`${chipCls} bg-[#E8C547]/10 border-[#E8C547]/35 text-[#FFE9A6]`}>CUB {c.cubPct.toLocaleString('pt-BR')}% a.a.</span>
              ) : (
                <span className={`${chipCls} bg-white/[0.04] border-white/10 text-text-secondary`}>sem CUB</span>
              )}
              <span className={`${chipCls} bg-emerald-400/10 border-emerald-400/35 text-emerald-300`}>valorização {c.valPct.toLocaleString('pt-BR')}% a.a.</span>
              {c.comissaoR > 0 && <span className={`${chipCls} bg-[#FF1E56]/10 border-[#FF3364]/40 text-[#FF9EB5]`}>comissão {c.comissaoPctN.toLocaleString('pt-BR')}%</span>}
              {c.distratoR > 0 && <span className={`${chipCls} bg-[#FF1E56]/10 border-[#FF3364]/40 text-[#FF9EB5]`}>distrato {c.distratoPctN.toLocaleString('pt-BR')}%</span>}
            </>
          )}
        </div>

        {/* Como chega lá — o passo a passo por trás dos números */}
        {c.bloqueado ? (
          <div className="al-card relative overflow-hidden rounded-2xl p-5">
            <div className="absolute inset-x-0 top-0 gx-line-gold" />
            <div className="flex items-center gap-2.5">
              <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#E8C547] to-[#C89210] shadow-[0_0_8px_rgba(232,197,71,0.5)]" />
              <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Como chega lá</h2>
            </div>
            <p className="text-xs text-text-secondary mt-2">
              {c.valor <= 0 ? 'Preencha o valor do imóvel' : 'Escolha a data de entrega das chaves'} e o descritivo completo do cálculo aparece aqui — junto com os números.
            </p>
          </div>
        ) : (
          <div className="al-card relative overflow-hidden rounded-2xl p-4">
            <div className="absolute inset-x-0 top-0 gx-line-gold" />
            <div className="flex items-center gap-2.5 mb-1">
              <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#E8C547] to-[#C89210] shadow-[0_0_8px_rgba(232,197,71,0.5)]" />
              <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Como chega lá</h2>
            </div>
            <p className="text-[11px] text-text-secondary mb-3">o passo a passo por trás dos números</p>

            {/* 1) o que ele paga */}
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#C4A6FF] mb-0.5">O que ele paga até a venda</div>
            {entrada > 0 && <Linha l="Entrada" v={brl(entrada)} sub="no ato (mês 0) — não corrige" />}
            {parcPagas > 0 && valorParcela > 0 && (
              <Linha l={`Parcelas pagas · ${parcPagas}× de ${brl(valorParcela)}`} v={brl(cubOn ? c.totalParcCorr : parcPagas * valorParcela)} sub={cubOn ? 'corrigidas pelo CUB, mês a mês' : undefined} />
            )}
            {refPagos > 0 && c.totalRefPagoNom > 0 && (
              <Linha
                l={`Reforços pagos · ${refPagos}×`}
                v={brl(cubOn ? c.totalRefCorr : c.totalRefPagoNom)}
                sub={c.refs.filter((r) => !r.aposH && r.valor > 0).map((r) => `${brl(r.valor)} em ${fmtData(parseLocal(r.ymd))}`).join(' · ') + (cubOn ? ' — corrigidos pelo CUB, mês a mês' : '')}
              />
            )}
            <Linha l="Total investido" v={brl(c.investido)} destaque />

            {/* 2) o imóvel na venda */}
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-300 mt-4 mb-0.5">O imóvel na venda</div>
            <Linha l={`Valor do imóvel ${quandoVenda}`} v={brl(c.valorVenda)} sub={`valorização de ${c.valPct.toLocaleString('pt-BR')}% a.a. em ${c.H} meses`} />
            <Linha
              l={`Quitação ${quandoVenda}`}
              v={brl(c.quitacao)}
              sub={<>
                {cubOn && <><span className="tabular-nums">{brl(c.quitacaoNominal)}</span> sem CUB <span className="text-[#E8C547]">→</span> com CUB · </>}
                {c.temAposH ? `parcelas/reforços restantes + saldo, quitados na venda (mês ${c.H})` : 'saldo devedor no dia da venda'}
              </>}
            />
            {c.comissaoR > 0 && (
              <Linha l={`Comissão de venda (${c.comissaoPctN.toLocaleString('pt-BR')}%)`} v={`− ${brl(c.comissaoR)}`} sub="sobre o valor de venda, descontada na venda" />
            )}
            {c.distratoR > 0 && (
              <Linha l={`Distrato / cessão (${c.distratoPctN.toLocaleString('pt-BR')}%)`} v={`− ${brl(c.distratoR)}`} sub="sobre o valor de venda, descontado na venda" />
            )}
            <Linha l="Patrimônio na venda" v={brl(c.equity)} sub={`valor do imóvel ${quandoVenda} − quitação${temCustosVenda ? ' − custos da venda' : ''}`} destaque />
            {c.temAposH && (
              <p className="text-[10.5px] text-amber-200/80 mt-2">
                {[c.parcAposH > 0 ? `${c.parcAposH} parcela${c.parcAposH > 1 ? 's' : ''}` : '', c.refAposH > 0 ? `${c.refAposH} reforço${c.refAposH > 1 ? 's' : ''}` : ''].filter(Boolean).join(' e ')} vence{c.parcAposH + c.refAposH > 1 ? 'm' : ''} depois da venda — já somados na quitação acima.
              </p>
            )}

            {/* 3) o resultado */}
            <div className="mt-4 pt-3 border-t border-white/[0.08]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-extrabold text-white uppercase tracking-wide">Lucro projetado</span>
                <span className={`al-display text-xl font-bold tabular-nums whitespace-nowrap ${c.lucro >= 0 ? 'text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.4)]' : 'text-rose-300'}`}>{brl(c.lucro)}</span>
              </div>
              <p className="text-[10.5px] text-text-secondary mt-0.5">patrimônio na venda − total investido — é daqui que saem o ROI e a TIR</p>
            </div>
          </div>
        )}

        <button onClick={gerarProposta} disabled={c.bloqueado} className="group relative overflow-hidden w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 text-[#181203] font-bold text-[15px] shadow-[0_8px_24px_-8px_rgba(232,197,71,0.5)] disabled:opacity-40 active:scale-[0.98] transition-all">
          <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
          Gerar proposta
        </button>
        <p className="text-[11px] text-center text-text-secondary">Projeção para fins de simulação — nada é salvo.</p>
      </div>
    </div>
  );
}
