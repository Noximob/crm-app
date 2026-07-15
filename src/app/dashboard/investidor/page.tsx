'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import MoneyInput, { formatBRL } from '@/components/MoneyInput';
import { showToast } from '@/components/ui/toast';

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

export default function InvestidorPage() {
  // Seção 1 — identificação
  const [empreendimento, setEmpreendimento] = useState('');
  const [unidade, setUnidade] = useState('');
  const [torre, setTorre] = useState('');
  const [cliente, setCliente] = useState('');
  const [valorImovel, setValorImovel] = useState(0);
  // Seção 2 — prazo
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(() => toYMD(new Date()));
  const [dataEntrega, setDataEntrega] = useState('');
  const [dataVenda, setDataVenda] = useState('');
  // Seção 3 — pagamentos até as chaves
  const [entrada, setEntrada] = useState(0);
  const [nParcelas, setNParcelas] = useState('');
  const [valorParcela, setValorParcela] = useState(0);
  const [nReforcos, setNReforcos] = useState('');
  const [periodicidade, setPeriodicidade] = useState('anual');
  // datas dos reforços: '' = usa a sugerida (1ª parcela + j×periodicidade) — mesma ideia do refDatas do fluxo
  const [refDatas, setRefDatas] = useState<string[]>([]);
  // valores dos reforços: null = intocado → espelha o primeiro valor digitado; editado mantém o seu
  const [refValores, setRefValores] = useState<(number | null)[]>([]);
  // Seção 4 — índices
  const [cubOn, setCubOn] = useState(false);
  const [cubAA, setCubAA] = useState('');
  const [valAA, setValAA] = useState('');

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

    // projeção de venda no mês H: o que vence depois do mês H não é pago
    // mês a mês — é quitado na venda (mês H), pelo valor nominal (corrigido
    // pelo acumulado do CUB até H quando o toggle está ligado).
    let parcAposH = 0, refAposH = 0, restParcNom = 0, restRefNom = 0;
    let investido = 0, totalParcCorr = 0, totalRefCorr = 0, totalRefPagoNom = 0;
    let valorVenda = 0, equity = 0, lucro = 0, roi = 0;
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
      equity = valorVenda - quitacao;
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
      investido, totalParcCorr, totalRefCorr, totalRefPagoNom,
      valorVenda, equity, lucro, roi, tirMes, tirAno,
    };
  }, [valorImovel, dataPrimeiraParcela, dataEntrega, dataVenda, entrada, nParcelas, valorParcela, nReforcos, refDatas, refValores, periodicidade, cubOn, cubAA, valAA]);

  const setRefData = (j: number, v: string) => setRefDatas((prev) => { const n = [...prev]; n[j] = v; return n; });
  const setRefValor = (j: number, v: number) => setRefValores((prev) => { const n = [...prev]; n[j] = v; return n; });

  const parcPagas = c.nParc - c.parcAposH;
  const refPagos = c.nRef - c.refAposH;
  const quandoVenda = c.vendaAtiva ? 'na venda' : 'nas chaves';
  // barras da jornada (mesma escala; negativo trava em 0)
  const maxJornada = Math.max(c.investido, c.equity, 1);
  const wInveste = Math.max(0, Math.min(1, c.investido / maxJornada)) * 100;
  const wVira = Math.max(0, Math.min(1, c.equity / maxJornada)) * 100;
  const wRoi = Math.max(0, Math.min(c.roi / 2, 1)) * 100; // barra do ROI limitada a 200%

  const gerarProposta = () => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const primeiraParcela = dataPrimeiraParcela ? fmtData(parseLocal(dataPrimeiraParcela)) : '—';
    const entrega = dataEntrega ? fmtData(parseLocal(dataEntrega)) : '—';
    const vendaStr = c.vendaAtiva && dataVenda ? fmtData(parseLocal(dataVenda)) : entrega;
    const tirMesStr = c.tirMes !== null ? fmtPct2(c.tirMes * 100) : '—';
    const tirAnoStr = c.tirAno !== null ? fmtPct2(c.tirAno * 100) : '—';
    const wInv = Math.round(wInveste);
    const wVi = Math.round(wVira);

    const invLinhas: string[] = [];
    if (entrada > 0) invLinhas.push(`<tr><td>Entrada <span class="mut">· no ato (não corrige)</span></td><td class="c">1×</td><td class="r">${brl(entrada)}</td><td class="r">${brl(entrada)}</td></tr>`);
    if (parcPagas > 0 && valorParcela > 0) invLinhas.push(`<tr><td>Parcelas mensais pagas até a venda${cubOn ? ' <span class="mut">· corrigidas pelo CUB</span>' : ''}${c.parcAposH > 0 ? ` <span class="mut">· ${c.parcAposH} restantes quitadas na venda</span>` : ''}</td><td class="c">${parcPagas}×</td><td class="r">${brl(valorParcela)}</td><td class="r">${brl(cubOn ? c.totalParcCorr : parcPagas * valorParcela)}</td></tr>`);
    c.refs.forEach((r, j) => {
      if (!r.aposH && r.valor > 0) invLinhas.push(`<tr><td>Reforço ${j + 1} <span class="mut">· ${fmtData(parseLocal(r.ymd))}${cubOn ? ' · corrigido pelo CUB' : ''}</span></td><td class="c">1×</td><td class="r">${brl(r.valor)}</td><td class="r">${brl(cubOn ? r.pago : r.valor)}</td></tr>`);
    });
    const refsAposH = c.refs.map((r, j) => ({ ...r, n: j + 1 })).filter((r) => r.aposH && r.valor > 0);
    if (refsAposH.length > 0) invLinhas.push(`<tr><td colspan="4"><span class="mut">Reforços após a venda — quitados na venda: ${refsAposH.map((r) => `Reforço ${r.n} (${brl(r.valor)} em ${fmtData(parseLocal(r.ymd))})`).join(', ')}</span></td></tr>`);
    invLinhas.push(`<tr class="sub"><td colspan="3">Total investido</td><td class="r">${brl(c.investido)}</td></tr>`);

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Análise do Investidor — Nox Imóveis</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#13212e;padding:36px 40px;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .brand{font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;letter-spacing:.02em}.brand span{color:#b9852b}
  .brandsub{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#b9852b;margin-top:2px}
  .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #b9852b;padding-bottom:12px;margin-bottom:16px}
  .doc{font-size:11px;color:#6c7480;text-align:right;line-height:1.6}
  .band{display:flex;gap:10px;margin-bottom:14px}
  .box{flex:1;border:1px solid #e6e1d6;border-radius:10px;padding:12px 10px;text-align:center;background:#faf8f3}
  .box.hero{background:#13212e;border-color:#13212e}
  .box .k{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:#8a8f96;margin-bottom:4px;font-weight:700}
  .box.hero .k{color:#e8c547}
  .box .n{font-size:25px;font-weight:800;letter-spacing:-.01em}
  .box.hero .n{color:#e8c547}
  .box.roi .n{color:#0f7a4d}
  .box .s{font-size:9.5px;color:#9aa0a6;margin-top:3px}
  .box.hero .s{color:#9fb0c0}
  .imovel{background:#f7f5f0;border:1px solid #e6e1d6;border-radius:10px;padding:11px 16px;margin-bottom:14px}
  .imovel .row{display:flex;justify-content:space-between;font-size:12.5px;padding:2.5px 0}.imovel .lab{color:#6c7480}
  .sec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#b9852b;margin:0 0 6px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px}
  th{background:#13212e;color:#fff;text-align:left;padding:7px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
  th.r,td.r{text-align:right}th.c,td.c{text-align:center}
  td{padding:7px 10px;border-bottom:1px solid #eee}.mut{color:#9aa0a6;font-size:10px}
  tr.sub td{background:#f3e6c9;font-weight:700}
  .venda{border:1px solid #e6e1d6;border-radius:10px;padding:11px 16px;margin-bottom:14px}
  .venda .row{display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0}.venda .lab{color:#6c7480}
  .res{border:2px solid #b9852b;border-radius:10px;padding:13px 16px}
  .res .top{display:flex;justify-content:space-between;align-items:baseline}
  .res .lab{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#6c7480}
  .lucro{font-size:23px;font-weight:800;color:#0f7a4d}.lucro.neg{color:#b3261e}
  .barrow{display:flex;align-items:center;gap:8px;margin-top:7px;font-size:10.5px}
  .barlab{width:64px;color:#6c7480;font-weight:700}
  .bartrack{flex:1;background:#efece4;border-radius:6px;height:13px;overflow:hidden}
  .barfill{height:100%;border-radius:6px}
  .barfill.inv{background:#7c5cd6}.barfill.vira{background:#0f9d63}
  .barval{width:112px;text-align:right;font-weight:700;font-size:11px}
  .foot{margin-top:14px;font-size:10px;color:#9aa0a6;border-top:1px solid #e6e1d6;padding-top:10px;line-height:1.5}
  @media print{body{padding:20px 26px}}
</style></head><body>
  <div class="head"><div><div class="brand">NOX <span>IMÓVEIS</span></div><div class="brandsub">Análise do Investidor</div></div>
    <div class="doc"><b>Valorização e alavancagem</b><br>${hoje}${cliente ? `<br>Cliente: ${cliente}` : ''}</div></div>

  <div class="band">
    <div class="box hero"><div class="k">TIR ao mês</div><div class="n">${tirMesStr}</div><div class="s">rendimento mensal do dinheiro investido</div></div>
    <div class="box hero"><div class="k">TIR ao ano</div><div class="n">${tirAnoStr}</div><div class="s">taxa anual equivalente</div></div>
    <div class="box roi"><div class="k">ROI</div><div class="n">${fmtPct2(c.roi * 100)}</div><div class="s">lucro sobre o total investido</div></div>
  </div>

  <div class="imovel">
    <div class="row"><span class="lab">Empreendimento</span><b>${empreendimento || '—'}</b></div>
    <div class="row"><span class="lab">Unidade / Torre</span><b>${[unidade, torre].filter(Boolean).join(' - ') || '—'}</b></div>
    <div class="row"><span class="lab">Valor do imóvel</span><b>${brl(c.valor)}</b></div>
    <div class="row"><span class="lab">1ª parcela → venda projetada</span><b>${primeiraParcela} → ${vendaStr} (${c.H} meses)</b></div>
    ${c.vendaAtiva ? `<div class="row"><span class="lab">Cenário</span><b>Venda antecipada — mês ${c.V} de ${c.M} (chaves em ${entrega})</b></div>` : `<div class="row"><span class="lab">Cenário</span><b>Venda na entrega das chaves (mês ${c.M})</b></div>`}
    ${cubOn ? `<div class="row"><span class="lab">Correção aplicada</span><b>CUB ${c.cubPct.toLocaleString('pt-BR')}% a.a.</b></div>` : ''}
  </div>

  <div class="sec">Investimento</div>
  <table><thead><tr><th>Item</th><th class="c">Qtde</th><th class="r">Valor unit.</th><th class="r">Total</th></tr></thead><tbody>${invLinhas.join('')}</tbody></table>

  <div class="sec">Venda projetada</div>
  <div class="venda">
    <div class="row"><span class="lab">Data da venda</span><b>${vendaStr}${c.vendaAtiva ? ` — antes das chaves (mês ${c.V} de ${c.M})` : ' — na entrega das chaves'}</b></div>
    <div class="row"><span class="lab">Valor projetado do imóvel <span class="mut">· valorização de ${c.valPct.toLocaleString('pt-BR')}% a.a. em ${c.H} meses</span></span><b>${brl(c.valorVenda)}</b></div>
    <div class="row"><span class="lab">${c.temAposH ? 'Quitação na venda <span class="mut">· parcelas restantes + saldo</span>' : 'Saldo quitado na venda'}${cubOn ? ` <span class="mut">· ${brl(c.quitacaoNominal)} sem CUB → corrigido</span>` : ''}</span><b>${brl(c.quitacao)}</b></div>
    <div class="row"><span class="lab">Patrimônio na venda <span class="mut">· valor projetado − quitação</span></span><b>${brl(c.equity)}</b></div>
  </div>

  <div class="sec">Resultado</div>
  <div class="res">
    <div class="top"><span class="lab">Lucro projetado</span><span class="lucro${c.lucro < 0 ? ' neg' : ''}">${brl(c.lucro)}</span></div>
    <div class="barrow"><span class="barlab">Ele investe</span><span class="bartrack"><span class="barfill inv" style="display:block;width:${wInv}%"></span></span><span class="barval">${brl(c.investido)}</span></div>
    <div class="barrow"><span class="barlab">Vira</span><span class="bartrack"><span class="barfill vira" style="display:block;width:${wVi}%"></span></span><span class="barval">${brl(c.equity)}</span></div>
  </div>

  <div class="foot">Análise gerada pela Nox Imóveis para fins de simulação. TIR = taxa interna de retorno mensal do fluxo de caixa do investidor até a venda projetada (${c.vendaAtiva ? `venda antecipada no mês ${c.V}, antes da entrega das chaves no mês ${c.M}` : 'venda na entrega das chaves'}). Premissas: valorização de ${c.valPct.toLocaleString('pt-BR')}% ao ano${cubOn ? ` e correção pelo CUB de ${c.cubPct.toLocaleString('pt-BR')}% ao ano` : ' (correção monetária não inclusa)'}. Valores sujeitos à confirmação e às condições da construtora.</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { showToast('Libere os pop-ups para gerar a proposta.', 'error'); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="min-h-full py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="al-display text-2xl font-bold text-white uppercase tracking-[0.08em]">Calculadora do Investidor</h1>
          <p className="text-sm text-text-secondary">Valorização e alavancagem até a venda: quanto o investidor coloca, quanto vira patrimônio e a TIR do dinheiro. Nada é salvo.</p>
        </div>

        {/* ---------- FAIXA DE DESTAQUES — as respostas, sempre à vista ----------
            sticky no scroll do <main> (p-2 md:p-3): o top negativo compensa o padding
            do container pra faixa colar no topo visível; o pt do wrapper vira a área clipada */}
        <div className="sticky top-[-16px] md:top-[-24px] z-20 pt-2 md:pt-3 mb-5">
          <div className="rounded-2xl border border-white/[0.08] bg-[#12101a]/95 backdrop-blur-md shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] p-2.5 sm:p-3">
            <div className="grid grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.3fr] gap-2 lg:gap-2.5">
              {/* TIR — o herói */}
              <div className="relative overflow-hidden rounded-xl border border-[#E8C547]/50 px-3 py-2.5 text-center col-span-2 lg:col-span-1"
                style={{ background: 'linear-gradient(160deg, rgba(232,197,71,0.15), rgba(20,13,5,0.6))', boxShadow: '0 0 30px -10px rgba(232,197,71,0.5), inset 0 1px 0 rgba(232,197,71,0.3)' }}>
                <div className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-[#E8C547]">TIR ao mês</div>
                {!c.bloqueado && c.tirMes !== null ? (
                  <>
                    <div className="mt-0.5 leading-none whitespace-nowrap">
                      <CountUp n={c.tirMes * 100} fmt={fmtNum2} className="al-display align-baseline text-[38px] lg:text-[44px] font-bold al-grad-text tabular-nums leading-[0.95] drop-shadow-[0_0_22px_rgba(232,197,71,0.55)]" />
                      <span className="al-display align-baseline text-[16px] lg:text-[18px] font-bold text-[#E8C547] ml-1">% a.m.</span>
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5">= <b className="text-[#FFE9A6] tabular-nums">{fmtPct2((c.tirAno || 0) * 100)}</b> ao ano</div>
                  </>
                ) : (
                  <>
                    <div className="al-display text-[38px] lg:text-[44px] font-bold text-white/25 leading-[0.95] mt-0.5">—</div>
                    <div className="text-[10.5px] text-text-secondary mt-0.5">{c.bloqueado ? 'rendimento mensal do dinheiro investido' : 'sem TIR para este fluxo'}</div>
                  </>
                )}
              </div>

              {/* ROI */}
              <div className="al-card relative overflow-hidden rounded-xl px-3 py-2.5 text-center">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400 to-transparent" />
                <div className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-emerald-300">ROI</div>
                {!c.bloqueado ? (
                  <>
                    <CountUp n={c.roi * 100} fmt={(v) => fmtNum2(v) + '%'} className="al-display block text-[26px] lg:text-[30px] font-bold text-emerald-300 tabular-nums leading-tight mt-0.5 drop-shadow-[0_0_14px_rgba(52,211,153,0.45)]" />
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1.5">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-700" style={{ width: `${wRoi}%` }} />
                    </div>
                    <div className="text-[9.5px] text-text-secondary mt-1">lucro sobre o investido</div>
                  </>
                ) : (
                  <>
                    <div className="al-display text-[26px] lg:text-[30px] font-bold text-white/25 leading-tight mt-0.5">—</div>
                    <div className="text-[9.5px] text-text-secondary mt-1">lucro sobre o investido</div>
                  </>
                )}
              </div>

              {/* Lucro projetado */}
              <div className="al-card relative overflow-hidden rounded-xl px-3 py-2.5 text-center">
                <div className="absolute inset-x-0 top-0 gx-line-gold" />
                <div className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-text-secondary">Lucro projetado</div>
                {!c.bloqueado ? (
                  <>
                    <CountUp n={c.lucro} fmt={brl} className={`al-display block text-[16px] sm:text-[19px] lg:text-[22px] font-bold tabular-nums leading-tight mt-1.5 whitespace-nowrap ${c.lucro >= 0 ? 'text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.4)]' : 'text-rose-300'}`} />
                    <div className="text-[9.5px] text-text-secondary mt-1.5">patrimônio − investido</div>
                  </>
                ) : (
                  <>
                    <div className="al-display text-[26px] lg:text-[30px] font-bold text-white/25 leading-tight mt-0.5">—</div>
                    <div className="text-[9.5px] text-text-secondary mt-1">patrimônio − investido</div>
                  </>
                )}
              </div>

              {/* Investe → vira */}
              <div className="al-card relative overflow-hidden rounded-xl px-3 py-2.5 col-span-2 lg:col-span-1">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#9F6BFF] to-transparent" />
                <div className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-text-secondary">A jornada do dinheiro</div>
                {!c.bloqueado ? (
                  <div className="space-y-1.5 mt-1.5">
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
                ) : (
                  <>
                    <div className="al-display text-[26px] lg:text-[30px] font-bold text-white/25 leading-tight mt-0.5 text-center">—</div>
                    <div className="text-[9.5px] text-text-secondary mt-1 text-center">quanto coloca → quanto vira patrimônio</div>
                  </>
                )}
              </div>
            </div>

            {/* chips de cenário + CTA */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                </>
              )}
              <button onClick={gerarProposta} disabled={c.bloqueado} className="group relative overflow-hidden ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 text-[#181203] font-bold text-[12.5px] shadow-[0_8px_24px_-8px_rgba(232,197,71,0.5)] disabled:opacity-40 active:scale-[0.98] transition-all whitespace-nowrap">
                <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
                Gerar proposta
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_minmax(360px,420px)] gap-5 items-start">
          {/* ---------- FORM ---------- */}
          <div className="space-y-4">
            <Secao icon="🏢" titulo="Identificação">
              <div className="grid sm:grid-cols-2 gap-3">
                <Campo label="Empreendimento"><input value={empreendimento} onChange={(e) => setEmpreendimento(e.target.value)} placeholder="Ex: Orla da Barra" className={inputCls} /></Campo>
                <Campo label="Cliente (opcional)"><input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do investidor" className={inputCls} /></Campo>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Campo label="Unidade"><input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Ex: Apto 1405" className={inputCls} /></Campo>
                <Campo label="Torre"><input value={torre} onChange={(e) => setTorre(e.target.value)} placeholder="Ex: Torre B" className={inputCls} /></Campo>
                <Campo label="Valor do imóvel"><MoneyInput value={valorImovel} onChange={setValorImovel} placeholder="500.000,00" className={inputCls} /></Campo>
              </div>
            </Secao>

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
          </div>

          {/* ---------- DESCRITIVO — a história por trás dos números do topo ---------- */}
          <div className="space-y-4">
            {c.bloqueado ? (
              <div className="al-card relative overflow-hidden rounded-2xl p-5">
                <div className="absolute inset-x-0 top-0 gx-line-gold" />
                <div className="flex items-center gap-2.5">
                  <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#E8C547] to-[#C89210] shadow-[0_0_8px_rgba(232,197,71,0.5)]" />
                  <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Como chega lá</h2>
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  {c.valor <= 0 ? 'Preencha o valor do imóvel' : 'Escolha a data de entrega das chaves'} e o descritivo completo do cálculo aparece aqui — junto com os números lá em cima.
                </p>
              </div>
            ) : (
              <div className="al-card relative overflow-hidden rounded-2xl p-4">
                <div className="absolute inset-x-0 top-0 gx-line-gold" />
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#E8C547] to-[#C89210] shadow-[0_0_8px_rgba(232,197,71,0.5)]" />
                  <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Como chega lá</h2>
                </div>
                <p className="text-[11px] text-text-secondary mb-3">o passo a passo por trás dos números do topo</p>

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
                <Linha l="Patrimônio na venda" v={brl(c.equity)} sub={`valor do imóvel ${quandoVenda} − quitação`} destaque />
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
                  <p className="text-[10.5px] text-text-secondary mt-0.5">patrimônio na venda − total investido — é daqui que saem o ROI e a TIR do topo</p>
                </div>
              </div>
            )}
            <p className="text-[11px] text-center text-text-secondary">Projeção para fins de simulação — nada é salvo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
