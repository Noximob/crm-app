'use client';

/**
 * CALCULADORA DETALHADA — a "científica" do fluxo de pagamento, pros casos que
 * fogem do padrão (poucas vezes, mas acontece): entrada com valores e datas
 * diferentes, cliente que paga menos por um tempo e depois aumenta, reforços
 * de valores diferentes. A Fluxo de Pagamento (a "normal") continua igual.
 *
 *   · Entrada: lista livre de pagamentos — cada um com a sua data e o seu valor;
 *   · Parcelas mensais em FAIXAS — "12× de R$ 1.000, depois 28× de R$ 1.500" —
 *     uma atrás da outra, de mês em mês a partir da 1ª parcela;
 *   · Reforços: lista livre (data + valor), com um gerador pra criar vários de
 *     uma vez no fim dos períodos (jun/dez etc.), como na calculadora normal.
 *
 * O "falta / passou" soma tudo; os botões de fechar ajustam a ÚLTIMA faixa ou o
 * ÚLTIMO reforço. O PDF sai igual ao da normal, só que com cada linha detalhada.
 */
import React, { useMemo, useState } from 'react';
import MoneyInput, { formatBRL } from '@/components/MoneyInput';
import { showToast } from '@/components/ui/toast';
import type { HeaderImovel } from './shared';

type Modo = 'rs' | 'pct';
type Pagto = { id: string; data: string; val: number };   // uma entrada ou um reforço
type Faixa = { id: string; n: string; val: number };      // n parcelas mensais de `val`

const PERIODOS: Record<string, { label: string; meses: number }> = {
  trimestral: { label: 'trimestrais', meses: 3 },
  semestral: { label: 'semestrais', meses: 6 },
  anual: { label: 'anuais', meses: 12 },
};
// Reforços vencem no FIM dos períodos do calendário (dia 30): semestral = jun/dez;
// anual = dez; trimestral = mar/jun/set/dez — igual à calculadora normal.
const REF_MESES_FIM: Record<string, number[]> = { trimestral: [3, 6, 9, 12], semestral: [6, 12], anual: [12] };
function proximosFimPeriodo(depoisDe: Date, per: string, n: number): Date[] {
  const alvo = REF_MESES_FIM[per] || [6, 12];
  const out: Date[] = [];
  const d = new Date(depoisDe.getFullYear(), depoisDe.getMonth(), 1);
  let guard = 0;
  while (out.length < n && guard++ < 600) {
    d.setMonth(d.getMonth() + 1);
    if (alvo.includes(d.getMonth() + 1)) out.push(new Date(d.getFullYear(), d.getMonth(), 30));
  }
  return out;
}

const brl = (n: number) => 'R$ ' + formatBRL(n);
const numI = (s: string) => { const v = parseFloat(s); return isNaN(v) ? 0 : v; };
const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const fmtPct = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtData = (d: Date) => d.toLocaleDateString('pt-BR');
const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
let seq = 0;
const novoId = () => `d${Date.now().toString(36)}${(seq++).toString(36)}`;

// ---------- inputs (nível de módulo p/ não perder foco) ----------
const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-[15px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 transition';
const inputLinha = inputCls.replace('py-2.5', 'py-1.5').replace('text-[15px]', 'text-sm');
const foraCls = ' !border-rose-400/60 !bg-rose-500/10';
const Campo = ({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-text-secondary mt-1">{hint}</p>}
  </div>
);
const Secao = ({ titulo, extra, children }: { titulo: string; extra?: React.ReactNode; children: React.ReactNode }) => (
  <div className="al-card relative overflow-hidden rounded-2xl p-5">
    <div className="absolute inset-x-0 top-0 gx-line" />
    <div className="flex flex-wrap items-center gap-2.5 mb-4">
      <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#FF1E56] to-[#A50D38] shadow-[0_0_8px_rgba(255,30,86,0.5)]" />
      <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">{titulo}</h2>
      {extra && <span className="ml-auto text-[12px] text-text-secondary">{extra}</span>}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);
const btnFechar = 'text-xs px-3 py-1.5 rounded-lg border border-[#FF3364]/40 bg-[#FF1E56]/[0.08] text-[#FF7A97] font-bold hover:bg-[#FF1E56]/[0.15] transition-colors';
const btnAdd = 'text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-white font-bold hover:bg-white/[0.08] transition-colors';
const BtnRemover = ({ onClick, titulo }: { onClick: () => void; titulo: string }) => (
  <button type="button" onClick={onClick} title={titulo} aria-label={titulo}
    className="shrink-0 w-8 h-8 rounded-lg border border-white/10 text-text-secondary hover:text-rose-300 hover:border-rose-400/40 hover:bg-rose-500/10 transition-colors">✕</button>
);

/** Campo de valor em R$ OU em % (do valor da proposta). Ao alternar, converte o número. */
const ValorFlex = ({ label, mode, value, base, onMode, onValue, hint, ph }: {
  label: string; mode: Modo; value: number; base: number;
  onMode: (m: Modo) => void; onValue: (n: number) => void; hint?: React.ReactNode; ph?: string;
}) => {
  const trocar = (m: Modo) => {
    if (m === mode) return;
    let v = value;
    if (base > 0 && value > 0) v = m === 'pct' ? round3((value / base) * 100) : round2(base * (value / 100));
    onMode(m); onValue(v);
  };
  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-1.5 min-h-[26px]">
        <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary leading-snug">{label}</label>
        <div className="flex rounded-md overflow-hidden border border-white/10 bg-white/[0.04] shrink-0">
          {(['rs', 'pct'] as const).map((m) => (
            <button key={m} type="button" onClick={() => trocar(m)} className={`px-2 py-0.5 text-[10px] font-extrabold transition-colors ${mode === m ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_0_10px_rgba(255,30,86,0.4)]' : 'text-text-secondary hover:text-white'}`}>
              {m === 'rs' ? 'R$' : '%'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'rs' ? (
        <MoneyInput value={value} onChange={onValue} placeholder="0,00" className={inputCls} />
      ) : (
        <div className="relative">
          <input type="number" step="any" min="0" value={value || ''} onChange={(e) => onValue(parseFloat(e.target.value) || 0)} placeholder={ph || '0'} className={inputCls + ' pr-8 tabular-nums'} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-white/40 pointer-events-none">%</span>
        </div>
      )}
      {hint && <p className="text-[11px] text-text-secondary mt-1">{hint}</p>}
    </div>
  );
};

export default function DetalhadaTab({ header }: { header: HeaderImovel }) {
  const { empreendimento, unidade, torre, cliente, valorImovel } = header;
  const hojeYMD = toYMD(new Date());
  const [descMode, setDescMode] = useState<Modo>('pct');
  const [descVal, setDescVal] = useState(0);
  const [chaveMode, setChaveMode] = useState<Modo>('pct');
  const [chaveVal, setChaveVal] = useState(0);
  const [dataLimite, setDataLimite] = useState(''); // até quando paga direto com a construtora (entrega das chaves)
  const [entradas, setEntradas] = useState<Pagto[]>(() => [{ id: novoId(), data: hojeYMD, val: 0 }]);
  const [dataBase, setDataBase] = useState('');     // 1ª parcela mensal
  const [faixas, setFaixas] = useState<Faixa[]>(() => [{ id: novoId(), n: '', val: 0 }]);
  const [reforcos, setReforcos] = useState<Pagto[]>([]);
  // gerador de reforços (vários de uma vez, no fim dos períodos)
  const [gQtd, setGQtd] = useState('');
  const [gPer, setGPer] = useState('semestral');
  const [gVal, setGVal] = useState(0);

  // Prazo até a entrega: quantas parcelas mensais cabem (da 1ª parcela, ou de hoje, até a data limite).
  const mesesPrazo = useMemo(() => {
    if (!dataLimite) return 0;
    const a = dataBase ? parseLocal(dataBase) : new Date();
    const b = parseLocal(dataLimite);
    const m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
    return m > 0 ? m : 0;
  }, [dataBase, dataLimite]);

  const c = useMemo(() => {
    const valor = valorImovel;
    const descR = descMode === 'pct' ? valor * (descVal / 100) : descVal;
    const vp = Math.max(0, valor - descR);
    const pctDesc = valor > 0 ? (descR / valor) * 100 : 0;
    const ac = chaveMode === 'pct' ? vp * (chaveVal / 100) : chaveVal; // total a pagar até a chave
    const pctChaveEff = vp > 0 ? (ac / vp) * 100 : 0;
    const saldo = Math.max(0, vp - ac);
    const limite = dataLimite ? parseLocal(dataLimite) : null;
    const fora = (d: Date | null) => !!(limite && d && d > limite);

    const entr = entradas.map((e) => { const d = e.data ? parseLocal(e.data) : null; return { ...e, d, fora: fora(d) }; });
    const entradaR = soma(entradas.map((e) => e.val));

    const base = dataBase ? parseLocal(dataBase) : null;
    let ofs = 0;
    const fx = faixas.map((f) => {
      const n = Math.max(0, Math.round(numI(f.n)));
      const ini = ofs; ofs += n;
      return { ...f, nN: n, ini, total: n * f.val, d1: base && n ? addMonths(base, ini) : null, d2: base && n ? addMonths(base, ini + n - 1) : null };
    });
    const nParc = ofs;
    const totalParc = soma(fx.map((f) => f.total));
    const parcUltima = base && nParc > 0 ? addMonths(base, nParc - 1) : null;

    const ref = reforcos.map((r) => { const d = r.data ? parseLocal(r.data) : null; return { ...r, d, fora: fora(d) }; });
    const totalRef = soma(reforcos.map((r) => r.val));

    const montado = entradaR + totalParc + totalRef; // fluxo até a chave
    const diferenca = ac - montado;
    const tol = 0.01 * (entradas.length + nParc + reforcos.length) + 0.005;
    const fecha = ac > 0 && Math.abs(diferenca) <= tol;
    const algoFora = entr.some((e) => e.fora) || ref.some((r) => r.fora) || fora(parcUltima);
    return { valor, descR, pctDesc, vp, ac, pctChaveEff, saldo, entr, entradaR, base, fx, nParc, totalParc, parcUltima, ref, totalRef, montado, diferenca, fecha, algoFora };
  }, [valorImovel, descMode, descVal, chaveMode, chaveVal, dataLimite, entradas, dataBase, faixas, reforcos]);

  // ---------- entrada ----------
  const mudaEntrada = (id: string, p: Partial<Pagto>) => setEntradas((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const addEntrada = () => setEntradas((xs) => {
    const u = xs[xs.length - 1];
    const data = u?.data ? toYMD(addMonths(parseLocal(u.data), 1)) : hojeYMD;
    return [...xs, { id: novoId(), data, val: u?.val || 0 }];
  });
  const tiraEntrada = (id: string) => setEntradas((xs) => xs.filter((x) => x.id !== id));

  // ---------- faixas ----------
  const mudaFaixa = (id: string, p: Partial<Faixa>) => setFaixas((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const addFaixa = () => setFaixas((xs) => [...xs, { id: novoId(), n: '', val: xs[xs.length - 1]?.val || 0 }]);
  const tiraFaixa = (id: string) => setFaixas((xs) => xs.filter((x) => x.id !== id));
  /** Completa a ÚLTIMA faixa pra quantidade total bater com o prazo até a entrega. */
  const completarPrazo = () => {
    if (!mesesPrazo || faixas.length === 0) return;
    const u = c.fx[c.fx.length - 1];
    const resto = mesesPrazo - (c.nParc - u.nN);
    if (resto <= 0) { showToast('As outras faixas já ocupam o prazo todo.', 'error'); return; }
    mudaFaixa(u.id, { n: String(resto) });
  };
  const fecharUltimaFaixa = () => {
    const u = [...c.fx].reverse().find((f) => f.nN > 0);
    if (!u) { showToast('Coloque a quantidade de parcelas na faixa.', 'error'); return; }
    const outros = c.totalParc - u.total;
    mudaFaixa(u.id, { val: round2(Math.max(0, (c.ac - c.entradaR - c.totalRef - outros) / u.nN)) });
  };

  // ---------- reforços ----------
  const mudaReforco = (id: string, p: Partial<Pagto>) => setReforcos((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const addReforco = () => setReforcos((xs) => {
    const u = xs[xs.length - 1];
    const depois = u?.data ? parseLocal(u.data) : (c.base || new Date());
    const [d] = proximosFimPeriodo(depois, gPer, 1);
    return [...xs, { id: novoId(), data: d ? toYMD(d) : '', val: u?.val || gVal || 0 }];
  });
  const tiraReforco = (id: string) => setReforcos((xs) => xs.filter((x) => x.id !== id));
  const sugestaoQtd = mesesPrazo > 0 ? Math.floor(mesesPrazo / PERIODOS[gPer].meses) : 0;
  const gerarReforcos = () => {
    const n = Math.round(numI(gQtd)) || sugestaoQtd;
    if (n <= 0) { showToast('Diga quantos reforços gerar.', 'error'); return; }
    const datas = proximosFimPeriodo(c.base || new Date(), gPer, n);
    setReforcos(datas.map((d) => ({ id: novoId(), data: toYMD(d), val: gVal })));
  };
  const fecharUltimoReforco = () => {
    const u = reforcos[reforcos.length - 1];
    if (!u) { showToast('Adicione pelo menos um reforço.', 'error'); return; }
    const outros = c.totalRef - u.val;
    mudaReforco(u.id, { val: round2(Math.max(0, c.ac - c.entradaR - c.totalParc - outros)) });
  };

  // ---------- linhas do resumo e do PDF (as mesmas) ----------
  type L = { nome: string; sub?: string; qtd: string; valor: number; total: number };
  const linhas = useMemo(() => {
    const out: { entrada: L[]; parcelas: L[]; reforcos: L[] } = { entrada: [], parcelas: [], reforcos: [] };
    const nE = c.entr.filter((e) => e.val > 0).length;
    let k = 0;
    c.entr.forEach((e) => {
      if (e.val <= 0) return;
      k++;
      out.entrada.push({ nome: nE > 1 ? `Entrada ${k}` : 'Entrada', sub: e.d ? fmtData(e.d) : undefined, qtd: '1×', valor: e.val, total: e.val });
    });
    const fxValidas = c.fx.filter((f) => f.nN > 0 && f.val > 0);
    c.fx.forEach((f) => {
      if (f.nN <= 0 || f.val <= 0) return;
      const nome = fxValidas.length > 1 ? `Parcelas ${f.ini + 1}ª a ${f.ini + f.nN}ª` : 'Parcelas mensais';
      out.parcelas.push({ nome, sub: f.d1 && f.d2 ? `${fmtData(f.d1)} a ${fmtData(f.d2)}` : undefined, qtd: `${f.nN}×`, valor: f.val, total: f.total });
    });
    const nR = c.ref.filter((r) => r.val > 0).length;
    k = 0;
    c.ref.forEach((r) => {
      if (r.val <= 0) return;
      k++;
      out.reforcos.push({ nome: nR > 1 ? `Reforço ${k}` : 'Reforço', sub: r.d ? fmtData(r.d) : undefined, qtd: '1×', valor: r.val, total: r.val });
    });
    return out;
  }, [c]);

  const gerarPDF = () => {
    const unidadeTorre = [unidade, torre].filter(Boolean).join(' - ');
    const tr = (l: L) => `<tr><td>${l.nome}${l.sub ? ` <span class="mut">· ${l.sub}</span>` : ''}</td><td class="c">${l.qtd}</td><td class="r">${brl(l.valor)}</td><td class="r">${brl(l.total)}</td></tr>`;
    const rows: string[] = [...linhas.entrada.map(tr), ...linhas.parcelas.map(tr), ...linhas.reforcos.map(tr)];
    rows.push(`<tr class="sub"><td colspan="3">Total até a entrega das chaves</td><td class="r">${brl(c.montado)}</td></tr>`);
    rows.push(`<tr><td>Saldo financiado na entrega <span class="mut">· banco / construtora</span></td><td class="c">—</td><td class="r">—</td><td class="r">${brl(c.saldo)}</td></tr>`);
    rows.push(`<tr class="tot"><td colspan="3">Valor total do imóvel</td><td class="r">${brl(c.vp)}</td></tr>`);
    const hoje = new Date().toLocaleDateString('pt-BR');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Proposta de Pagamento — Nox Imóveis</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Times New Roman',serif;color:#13212e;padding:44px 40px;background:#fff}
  .brand{font-family:Georgia,serif;font-size:27px;font-weight:700;letter-spacing:.02em}.brand span{color:#b9852b}
  .brandsub{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#b9852b;margin-top:2px}
  .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #b9852b;padding-bottom:16px;margin-bottom:22px}
  .doc{font-size:12px;color:#6c7480;text-align:right;line-height:1.7}
  .imovel{background:#f7f5f0;border:1px solid #e6e1d6;border-radius:10px;padding:16px 18px;margin-bottom:22px}
  .imovel .row{display:flex;justify-content:space-between;font-size:14px;padding:3px 0}.imovel .lab{color:#6c7480}
  table{width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px}
  th{background:#13212e;color:#fff;text-align:left;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  th.r,td.r{text-align:right}th.c,td.c{text-align:center}
  td{padding:9px 12px;border-bottom:1px solid #eee}.mut{color:#9aa0a6;font-size:11px}
  tr.sub td{background:#f3e6c9;font-weight:700}tr.tot td{background:#13212e;color:#fff;font-weight:700;font-size:14px}
  .disc{font-size:12px;color:#6c7480;margin-top:8px}
  .foot{margin-top:26px;font-size:11px;color:#9aa0a6;border-top:1px solid #e6e1d6;padding-top:12px;line-height:1.6}
  @media print{body{padding:24px}}
</style></head><body>
  <div class="head"><div><div class="brand">NOX <span>IMÓVEIS</span></div><div class="brandsub">Proposta de Pagamento</div></div>
    <div class="doc"><b>Fluxo de pagamento</b><br>${hoje}${cliente ? `<br>Cliente: ${cliente}` : ''}</div></div>
  <div class="imovel">
    <div class="row"><span class="lab">Empreendimento</span><b>${empreendimento || '—'}</b></div>
    <div class="row"><span class="lab">Unidade / Torre</span><b>${unidadeTorre || '—'}</b></div>
    <div class="row"><span class="lab">Valor de tabela</span><b>${brl(c.valor)}</b></div>
    ${c.descR > 0 ? `<div class="row"><span class="lab">Desconto (${c.pctDesc.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)</span><b>- ${brl(c.descR)}</b></div><div class="row"><span class="lab">Valor da proposta</span><b>${brl(c.vp)}</b></div>` : ''}
    <div class="row"><span class="lab">A pagar até a chave</span><b>${c.pctChaveEff.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% · ${brl(c.ac)}</b></div>
  </div>
  <table><thead><tr><th>Condição</th><th class="c">Qtde</th><th class="r">Valor unit.</th><th class="r">Total</th></tr></thead><tbody>${rows.join('')}</tbody></table>
  ${!c.fecha ? `<div class="disc"><b>Observação:</b> o fluxo montado ${c.diferenca > 0 ? 'está ' + brl(c.diferenca) + ' abaixo' : 'excede em ' + brl(Math.abs(c.diferenca))} do valor a pagar até a chave.</div>` : ''}
  <div class="foot">Proposta gerada pela Nox Imóveis para fins de simulação. Valores sujeitos à confirmação e às condições da construtora. As parcelas e reforços sofrem correção monetária (INCC / CUB / IGP-M) conforme contrato — <b>não inclusa</b> nesta simulação.</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { showToast('Libere os pop-ups para gerar o PDF.', 'error'); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  const status = c.ac <= 0 ? 'vazio' : c.fecha ? 'ok' : c.diferenca > 0 ? 'falta' : 'excedente';
  const statusCor = { vazio: 'border-white/10 bg-white/[0.04]', ok: 'border-emerald-400/40 bg-emerald-500/10', falta: 'border-amber-400/40 bg-amber-500/10', excedente: 'border-rose-400/40 bg-rose-500/10' }[status];
  const mesAno = (d: Date | null) => (d ? d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. de ', '/').replace(' de ', '/') : '');

  return (
    <div className="grid lg:grid-cols-[1fr_minmax(360px,420px)] gap-5 items-start">
      {/* ---------- FORM ---------- */}
      <div className="space-y-4">
        <Secao titulo="Até a entrega das chaves">
          <div className="grid sm:grid-cols-3 gap-3">
            <ValorFlex label="Desconto no valor de tabela" mode={descMode} value={descVal} base={c.valor} onMode={setDescMode} onValue={setDescVal}
              hint={c.descR > 0 ? <>{descMode === 'pct' ? <>= {brl(c.descR)}</> : <>= {fmtPct(c.pctDesc)}</>} · proposta <b>{brl(c.vp)}</b></> : 'opcional — deixe 0 se não houver'} />
            <ValorFlex label="Total a pagar até as chaves" mode={chaveMode} value={chaveVal} base={c.vp} onMode={setChaveMode} onValue={setChaveVal} ph="30"
              hint={c.ac > 0 ? (chaveMode === 'pct' ? <>= <b>{brl(c.ac)}</b></> : <>= <b>{fmtPct(c.pctChaveEff)}</b> da proposta</>) : 'quanto entra antes de financiar — ex.: 30%'} />
            <Campo label="Pagar direto com a construtora até" hint={mesesPrazo > 0 ? <>prazo de <b>{mesesPrazo} meses</b>{!dataBase ? ' (contando de hoje)' : ''} — o que passar dessa data fica em vermelho</> : 'opcional — a entrega das chaves'}>
              <input type="date" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} className={inputCls} />
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Entrada" extra={c.entradaR > 0 ? <>soma <b className="text-white">{brl(c.entradaR)}</b>{c.vp > 0 ? <> · {fmtPct((c.entradaR / c.vp) * 100)}</> : null}</> : undefined}>
          <p className="text-[11px] text-text-secondary -mt-1">Cada pagamento da entrada com a sua data e o seu valor — pode ser tudo diferente.</p>
          <div className="space-y-2">
            {c.entr.map((e, j) => (
              <div key={e.id} className="grid grid-cols-[58px_minmax(0,1fr)_minmax(0,1fr)_auto] sm:grid-cols-[64px_150px_minmax(140px,1fr)_auto] items-center gap-2">
                <span className="text-xs text-text-secondary">{c.entr.length > 1 ? `Entrada ${j + 1}` : 'Entrada'}</span>
                <input type="date" value={e.data} onChange={(ev) => mudaEntrada(e.id, { data: ev.target.value })} className={inputLinha + (e.fora ? foraCls : '')} />
                <MoneyInput value={e.val} onChange={(v) => mudaEntrada(e.id, { val: v })} className={inputLinha} />
                <BtnRemover onClick={() => tiraEntrada(e.id)} titulo="Tirar este pagamento da entrada" />
              </div>
            ))}
          </div>
          <button type="button" onClick={addEntrada} className={btnAdd}>+ pagamento da entrada</button>
        </Secao>

        <Secao titulo="Parcelas mensais em faixas" extra={c.nParc > 0 ? <><b className="text-white">{c.nParc}</b> parcelas · <b className="text-white">{brl(c.totalParc)}</b></> : undefined}>
          <div className="grid sm:grid-cols-[220px_1fr] gap-3 items-end">
            <Campo label="Data da 1ª parcela mensal" hint="as faixas seguem de mês em mês, uma atrás da outra">
              <input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} className={inputCls} />
            </Campo>
            <p className="text-[11px] text-text-secondary sm:pb-6">Ex.: cliente que paga menos no começo — <b className="text-white/80">12× de R$ 1.000</b>, depois <b className="text-white/80">28× de R$ 1.500</b>.</p>
          </div>
          <div className="space-y-2">
            {c.fx.map((f, i) => (
              <div key={f.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
                <span className="block text-xs font-bold text-white/80 mb-1.5">{i + 1}ª faixa</span>
                <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] sm:grid-cols-[84px_auto_minmax(140px,1fr)_auto] items-center gap-2">
                  <div className="relative">
                    <input type="number" min="0" value={f.n} onChange={(e) => mudaFaixa(f.id, { n: e.target.value })} placeholder="12" className={inputLinha + ' pr-8 tabular-nums'} />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-white/40 pointer-events-none">×</span>
                  </div>
                  <span className="hidden sm:inline text-xs text-text-secondary">parcelas de</span>
                  <MoneyInput value={f.val} onChange={(v) => mudaFaixa(f.id, { val: v })} className={inputLinha} />
                  <BtnRemover onClick={() => tiraFaixa(f.id)} titulo="Tirar esta faixa" />
                </div>
                {f.nN > 0 && (
                  <p className={`text-[11px] mt-1.5 ${c.parcUltima && dataLimite && f.d2 && f.d2 > parseLocal(dataLimite) ? 'text-rose-300' : 'text-text-secondary'}`}>
                    {f.ini + 1}ª a {f.ini + f.nN}ª{f.d1 && f.d2 ? <> · {mesAno(f.d1)} a {mesAno(f.d2)}</> : ' · coloque a data da 1ª parcela pra ver os meses'}{f.val > 0 ? <> · total <b className="text-white/80">{brl(f.total)}</b></> : null}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={addFaixa} className={btnAdd}>+ faixa</button>
            <button type="button" onClick={fecharUltimaFaixa} className={btnFechar}>↳ a última faixa fecha a conta</button>
            {mesesPrazo > 0 && faixas.length > 0 && c.nParc !== mesesPrazo && (
              <button type="button" onClick={completarPrazo} className="text-[11px] text-[#FFE9A6] font-bold hover:underline">
                o prazo comporta {mesesPrazo} parcelas — completar a última faixa
              </button>
            )}
          </div>
        </Secao>

        <Secao titulo="Reforços (balões)" extra={c.totalRef > 0 ? <>soma <b className="text-white">{brl(c.totalRef)}</b></> : undefined}>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Gerar vários de uma vez</p>
            <div className="grid grid-cols-2 sm:grid-cols-[90px_1fr_1fr_auto] gap-2 items-center">
              <input type="number" min="1" value={gQtd} onChange={(e) => setGQtd(e.target.value)} placeholder={sugestaoQtd ? String(sugestaoQtd) : 'qtd.'} className={inputLinha + ' tabular-nums'} title="Quantos reforços" />
              <select value={gPer} onChange={(e) => setGPer(e.target.value)} className={inputLinha}>
                <option value="semestral">semestrais (jun/dez)</option>
                <option value="anual">anuais (dez)</option>
                <option value="trimestral">trimestrais (mar/jun/set/dez)</option>
              </select>
              <MoneyInput value={gVal} onChange={setGVal} className={inputLinha} />
              <button type="button" onClick={gerarReforcos} className={btnAdd + ' col-span-2 sm:col-span-1'}>Gerar</button>
            </div>
            <p className="text-[11px] text-text-secondary mt-1.5">Cria a lista abaixo (troca a que estiver lá) — depois é só mudar a data ou o valor de cada um.</p>
          </div>
          {c.ref.length > 0 && (
            <div className="space-y-2">
              {c.ref.map((r, j) => (
                <div key={r.id} className="grid grid-cols-[58px_minmax(0,1fr)_minmax(0,1fr)_auto] sm:grid-cols-[64px_150px_minmax(140px,1fr)_auto] items-center gap-2">
                  <span className="text-xs text-text-secondary">Reforço {j + 1}</span>
                  <input type="date" value={r.data} onChange={(ev) => mudaReforco(r.id, { data: ev.target.value })} className={inputLinha + (r.fora ? foraCls : '')} />
                  <MoneyInput value={r.val} onChange={(v) => mudaReforco(r.id, { val: v })} className={inputLinha} />
                  <BtnRemover onClick={() => tiraReforco(r.id)} titulo="Tirar este reforço" />
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={addReforco} className={btnAdd}>+ reforço</button>
            <button type="button" onClick={fecharUltimoReforco} className={btnFechar}>↳ o último reforço fecha a conta</button>
          </div>
        </Secao>
      </div>

      {/* ---------- RESULTADO (sticky) ---------- */}
      <div className="space-y-4 lg:sticky lg:top-4">
        <div className={`rounded-2xl border p-5 ${statusCor}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-white">
              {status === 'vazio' && 'Preencha o valor e o que vai até a chave'}
              {status === 'ok' && '✓ O fluxo fecha certinho'}
              {status === 'falta' && 'Falta pra fechar'}
              {status === 'excedente' && 'Passou do necessário'}
            </span>
            {status !== 'vazio' && status !== 'ok' && (
              <span className={`al-display text-lg font-bold tabular-nums ${status === 'falta' ? 'text-amber-300' : 'text-rose-300'}`}>{status === 'falta' ? '−' : '+'} {brl(Math.abs(c.diferenca))}</span>
            )}
          </div>
          {c.ac > 0 && <p className="text-xs text-text-secondary mt-1">Montado <b className="text-white">{brl(c.montado)}</b> de <b className="text-white">{brl(c.ac)}</b> a pagar até a chave.{c.algoFora && <span className="text-rose-300"> ⚠ Tem pagamento depois da entrega.</span>}</p>}
        </div>

        <div className="al-card relative overflow-hidden rounded-2xl">
          <div className="absolute inset-x-0 top-0 gx-line-gold" />
          <div className="px-5 py-3 border-b border-white/10 al-display text-[13px] font-bold text-white uppercase tracking-[0.14em]">Condições de pagamento</div>
          <div className="divide-y divide-white/[0.06] text-sm">
            {[...linhas.entrada, ...linhas.parcelas, ...linhas.reforcos].map((l, i) => (
              <Linha key={i} nome={l.nome} sub={l.sub} qtd={l.qtd} valor={brl(l.valor)} total={brl(l.total)} />
            ))}
            <Linha nome="Total até a entrega das chaves" total={brl(c.montado)} destaque />
            <Linha nome="Saldo financiado na entrega" sub="banco / construtora" total={brl(c.saldo)} />
            {c.descR > 0 && <Linha nome="Valor de tabela" total={brl(c.valor)} />}
            {c.descR > 0 && <Linha nome={`Desconto (${fmtPct(c.pctDesc)})`} sub="negociado pra proposta" total={`− ${brl(c.descR)}`} />}
            <Linha nome="Valor total do imóvel" sub={c.descR > 0 ? 'já com o desconto' : undefined} total={brl(c.vp)} forte />
          </div>
        </div>

        <button onClick={gerarPDF} disabled={c.vp <= 0} className="group relative overflow-hidden w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 text-[#181203] font-bold text-[15px] shadow-[0_8px_24px_-8px_rgba(232,197,71,0.5)] disabled:opacity-40 active:scale-[0.98] transition-all">
          <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
          Gerar proposta em PDF (logo Nox)
        </button>
        <p className="text-[11px] text-center text-text-secondary">Correção monetária (INCC / CUB / IGP-M) não inclusa nesta simulação.</p>
      </div>
    </div>
  );
}

function Linha({ nome, sub, qtd, valor, total, destaque, forte }: { nome: string; sub?: string; qtd?: string; valor?: string; total: string; destaque?: boolean; forte?: boolean }) {
  return (
    <div className={`flex items-center px-5 py-2.5 ${destaque ? 'bg-[#E8C547]/[0.08]' : ''} ${forte ? 'bg-[#E8C547]/[0.06]' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-white ${destaque || forte ? 'font-bold' : ''}`}>{nome}</div>
        {sub && <div className="text-[11px] text-text-secondary">{sub}</div>}
      </div>
      {qtd && <div className="w-9 sm:w-12 text-center text-xs text-text-secondary">{qtd}</div>}
      {valor && <div className="hidden sm:block w-28 text-right text-xs tabular-nums text-text-secondary">{valor}</div>}
      <div className={`w-28 sm:w-32 text-right font-semibold tabular-nums ${forte ? 'al-display al-grad-text text-[15px] font-bold' : destaque ? 'text-[#FFE9A6] font-bold' : 'text-white'}`}>{total}</div>
    </div>
  );
}
