'use client';

import React, { useMemo, useState } from 'react';
import MoneyInput, { formatBRL } from '@/components/MoneyInput';
import { showToast } from '@/components/ui/toast';
import type { HeaderImovel } from './shared';

const PERIODOS: Record<string, { label: string; meses: number }> = {
  trimestral: { label: 'Trimestrais', meses: 3 },
  semestral: { label: 'Semestrais', meses: 6 },
  anual: { label: 'Anuais', meses: 12 },
};

type Modo = 'rs' | 'pct';

const brl = (n: number) => 'R$ ' + formatBRL(n);
const numI = (s: string) => { const v = parseFloat(s); return isNaN(v) ? 0 : v; };
const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const fmtPct = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';

const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

// Reforços vencem no FIM dos períodos do calendário (dia 30): semestral = jun/dez;
// anual = dez; trimestral = mar/jun/set/dez. Sugere as N próximas após o início.
const REF_MESES_FIM: Record<string, number[]> = { trimestral: [3, 6, 9, 12], semestral: [6, 12], anual: [12] };
function sugerirReforcos(inicio: Date, per: string, n: number): Date[] {
  const alvo = REF_MESES_FIM[per] || [6, 12];
  const out: Date[] = [];
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  let guard = 0;
  while (out.length < n && guard++ < 600) {
    d.setMonth(d.getMonth() + 1);
    if (alvo.includes(d.getMonth() + 1)) out.push(new Date(d.getFullYear(), d.getMonth(), 30));
  }
  return out;
}
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtData = (d: Date) => d.toLocaleDateString('pt-BR');

// ---------- inputs (nível de módulo p/ não perder foco) ----------
const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-[15px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 transition';
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
const btnFechar = 'text-xs px-3 py-1.5 rounded-lg border border-[#FF3364]/40 bg-[#FF1E56]/[0.08] text-[#FF7A97] font-bold hover:bg-[#FF1E56]/[0.15] transition-colors';

/** Campo de valor com raciocínio flexível: digite em R$ OU em % (do valor da proposta). Ao alternar, converte o número. */
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
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary truncate">{label}</label>
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

export default function FluxoTab({ header }: { header: HeaderImovel }) {
  const { empreendimento, unidade, torre, cliente, valorImovel } = header;
  const [descMode, setDescMode] = useState<Modo>('pct');
  const [descVal, setDescVal] = useState(0);
  const [chaveMode, setChaveMode] = useState<Modo>('pct');
  const [chaveVal, setChaveVal] = useState(0);
  const [entradaMode, setEntradaMode] = useState<Modo>('rs');
  const [entradaVal, setEntradaVal] = useState(0);
  const [nEntrada, setNEntrada] = useState('');
  const [dataBase, setDataBase] = useState('');
  const [nParcelas, setNParcelas] = useState('');
  const [parcelaMode, setParcelaMode] = useState<Modo>('rs');
  const [parcelaVal, setParcelaVal] = useState(0);
  const [nReforcos, setNReforcos] = useState('');
  const [reforcoMode, setReforcoMode] = useState<Modo>('rs');
  const [reforcoVal, setReforcoVal] = useState(0);
  const [periodicidade, setPeriodicidade] = useState('semestral');
  const [dataLimite, setDataLimite] = useState(''); // até quando dá pra pagar (entrega das chaves)
  const [refDatas, setRefDatas] = useState<string[]>([]); // overrides YYYY-MM-DD; vazio = usa a sugerida
  const [entradaDatas, setEntradaDatas] = useState<string[]>([]); // vencimentos da entrada (1ª sugerida: hoje/ato)

  // Prazo total: com o "pagar até" definido, calcula sozinho quantas parcelas
  // mensais e quantos reforços cabem. Sem a data da 1ª parcela, conta de hoje.
  const mesesPrazo = React.useMemo(() => {
    if (!dataLimite) return 0;
    const a = dataBase ? parseLocal(dataBase) : new Date();
    const b = parseLocal(dataLimite);
    const m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
    return m > 0 ? m : 0;
  }, [dataBase, dataLimite]);
  React.useEffect(() => {
    if (!mesesPrazo) return;
    setNParcelas(String(mesesPrazo));
    setNReforcos(String(Math.floor(mesesPrazo / PERIODOS[periodicidade].meses)));
  }, [mesesPrazo, periodicidade]);

  const c = useMemo(() => {
    const valor = valorImovel;
    const descR = descMode === 'pct' ? valor * (descVal / 100) : descVal;
    const vp = Math.max(0, valor - descR);
    const pctDesc = valor > 0 ? (descR / valor) * 100 : 0;
    const ac = chaveMode === 'pct' ? vp * (chaveVal / 100) : chaveVal; // total a pagar até a chave
    const pctChaveEff = vp > 0 ? (ac / vp) * 100 : 0;
    const saldo = Math.max(0, vp - ac);
    const entradaR = entradaMode === 'pct' ? vp * (entradaVal / 100) : entradaVal;
    const nEntr = Math.max(1, Math.round(numI(nEntrada)) || 1);
    const entradaParc = nEntr > 0 ? entradaR / nEntr : entradaR;
    const nParc = Math.max(0, Math.round(numI(nParcelas)));
    // no modo %, o percentual é do TOTAL (a conta final do cliente) — divide pela quantidade
    const baseParcela = nParc > 0 ? vp / nParc : 0;
    const parcelaR = parcelaMode === 'pct' ? baseParcela * (parcelaVal / 100) : parcelaVal;
    const nRef = Math.max(0, Math.round(numI(nReforcos)));
    const baseReforco = nRef > 0 ? vp / nRef : 0;
    const reforcoR = reforcoMode === 'pct' ? baseReforco * (reforcoVal / 100) : reforcoVal;
    const totalParc = nParc * parcelaR;
    const totalRef = nRef * reforcoR;
    const montado = entradaR + totalParc + totalRef; // fluxo até a chave
    const diferenca = ac - montado;
    const tol = 0.01 * (nParc + nRef + nEntr) + 0.005;
    const fecha = ac > 0 && Math.abs(diferenca) <= tol;
    const hoje = new Date();
    const base = dataBase ? parseLocal(dataBase) : null;
    const parcUltima = base && nParc > 0 ? addMonths(base, nParc - 1) : null;
    // reforços: datas sempre sugeridas no fim dos períodos do calendário (dia 30) — editáveis
    const refSugeridas = sugerirReforcos(base || hoje, periodicidade, nRef);
    const refDateObjs = refSugeridas.map((d, j) => (refDatas[j] ? parseLocal(refDatas[j]) : d));
    const refForaPrazo = dataLimite ? refDateObjs.some((d) => d > parseLocal(dataLimite)) : false;
    // vencimentos da entrada: 1ª sugerida hoje (ato) e as demais nos meses seguintes — editáveis
    const entradaDateObjs = Array.from({ length: nEntr }, (_, j) => (entradaDatas[j] ? parseLocal(entradaDatas[j]) : addMonths(hoje, j)));
    return { valor, descR, pctDesc, vp, ac, pctChaveEff, saldo, entradaR, nEntr, entradaParc, entradaDateObjs, nParc, baseParcela, parcelaR, nRef, baseReforco, reforcoR, totalParc, totalRef, montado, diferenca, fecha, base, parcUltima, refSugeridas, refDateObjs, refForaPrazo };
  }, [valorImovel, descMode, descVal, chaveMode, chaveVal, entradaMode, entradaVal, nEntrada, entradaDatas, dataBase, dataLimite, nParcelas, parcelaMode, parcelaVal, nReforcos, reforcoMode, reforcoVal, periodicidade, refDatas]);

  const suggestedYMD = (j: number) => (c.refSugeridas[j] ? toYMD(c.refSugeridas[j]) : '');
  const setRefData = (j: number, v: string) => setRefDatas((prev) => { const n = [...prev]; n[j] = v; return n; });
  const setEntradaData = (j: number, v: string) => setEntradaDatas((prev) => { const n = [...prev]; n[j] = v; return n; });

  // “fechar”: calcula o R$ da unidade e grava no modo atual do campo (R$ ou % do total)
  const setNoModo = (alvoR: number, mode: Modo, baseUnit: number, setVal: (n: number) => void) => {
    const v = Math.max(0, alvoR);
    setVal(mode === 'pct' ? (baseUnit > 0 ? round3((v / baseUnit) * 100) : 0) : round2(v));
  };
  const fecharPelaParcela = () => { if (c.nParc > 0) setNoModo((c.ac - c.entradaR - c.totalRef) / c.nParc, parcelaMode, c.baseParcela, setParcelaVal); };
  const fecharPeloReforco = () => { if (c.nRef > 0) setNoModo((c.ac - c.entradaR - c.totalParc) / c.nRef, reforcoMode, c.baseReforco, setReforcoVal); };

  // dica “equivalente” pros campos flexíveis
  const eq = (mode: Modo, val: number, extra?: React.ReactNode) => {
    if (!val) return extra || undefined;
    const conv = mode === 'pct' ? <>= <b>{brl(c.vp * (val / 100))}</b></> : c.vp > 0 ? <>= <b>{fmtPct((val / c.vp) * 100)}</b> da proposta</> : undefined;
    return conv ? <>{conv}{extra ? <> · {extra}</> : null}</> : extra || undefined;
  };

  const gerarPDF = () => {
    const unidadeTorre = [unidade, torre].filter(Boolean).join(' - ');
    const linhas: string[] = [];
    if (c.entradaR > 0) {
      const dtE = c.entradaDateObjs.map(fmtData);
      const dtETxt = dtE.length <= 6 ? dtE.join(' · ') : `${dtE[0]} a ${dtE[dtE.length - 1]}`;
      const detEntr = c.nEntr > 1 ? ` <span class="mut">· ${c.nEntr}× de ${brl(c.entradaParc)} · ${dtETxt}</span>` : ` <span class="mut">· ${dtETxt}</span>`;
      linhas.push(`<tr><td>Entrada${detEntr}</td><td class="c">${c.nEntr}×</td><td class="r">${brl(c.entradaParc)}</td><td class="r">${brl(c.entradaR)}</td></tr>`);
    }
    if (c.nParc > 0 && c.parcelaR > 0) {
      const per = c.base && c.parcUltima ? ` <span class="mut">· ${fmtData(c.base)} a ${fmtData(c.parcUltima)}</span>` : '';
      linhas.push(`<tr><td>Parcelas mensais${per}</td><td class="c">${c.nParc}×</td><td class="r">${brl(c.parcelaR)}</td><td class="r">${brl(c.totalParc)}</td></tr>`);
    }
    if (c.nRef > 0 && c.reforcoR > 0) {
      const datas = c.refDateObjs.map((d) => (d ? fmtData(d) : '')).filter(Boolean).join(' · ');
      linhas.push(`<tr><td>Reforços ${PERIODOS[periodicidade].label.toLowerCase()}${datas ? ` <span class="mut">· ${datas}</span>` : ''}</td><td class="c">${c.nRef}×</td><td class="r">${brl(c.reforcoR)}</td><td class="r">${brl(c.totalRef)}</td></tr>`);
    }
    linhas.push(`<tr class="sub"><td colspan="3">Total até a entrega das chaves</td><td class="r">${brl(c.montado)}</td></tr>`);
    linhas.push(`<tr><td>Saldo financiado na entrega <span class="mut">· banco / construtora</span></td><td class="c">—</td><td class="r">—</td><td class="r">${brl(c.saldo)}</td></tr>`);
    linhas.push(`<tr class="tot"><td colspan="3">Valor total do imóvel</td><td class="r">${brl(c.vp)}</td></tr>`);
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
  <table><thead><tr><th>Condição</th><th class="c">Qtde</th><th class="r">Valor unit.</th><th class="r">Total</th></tr></thead><tbody>${linhas.join('')}</tbody></table>
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

  return (
    <div className="grid lg:grid-cols-[1fr_minmax(360px,420px)] gap-5 items-start">
      {/* ---------- FORM ---------- */}
      <div className="space-y-4">
        <Secao icon="🔑" titulo="Até a entrega das chaves">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ValorFlex label="Desconto" mode={descMode} value={descVal} base={c.valor} onMode={setDescMode} onValue={setDescVal}
              hint={c.descR > 0 ? <>{descMode === 'pct' ? <>= {brl(c.descR)}</> : <>= {fmtPct(c.pctDesc)}</>} · proposta <b>{brl(c.vp)}</b></> : 'opcional'} />
            <ValorFlex label="A pagar até a chave" mode={chaveMode} value={chaveVal} base={c.vp} onMode={setChaveMode} onValue={setChaveVal} ph="30"
              hint={c.ac > 0 ? (chaveMode === 'pct' ? <>= <b>{brl(c.ac)}</b></> : <>= <b>{fmtPct(c.pctChaveEff)}</b> da proposta</>) : 'ex.: 30% até a entrega'} />
            <ValorFlex label="Entrada (total)" mode={entradaMode} value={entradaVal} base={c.vp} onMode={setEntradaMode} onValue={setEntradaVal}
              hint={eq(entradaMode, entradaVal, c.nEntr > 1 && c.entradaR > 0 ? <b>{c.nEntr}× de {brl(c.entradaParc)}</b> : undefined)} />
            <Campo label="Entrada em quantas vezes" hint={c.nEntr > 1 ? 'no ato e meses seguintes' : '1 = à vista no ato'}>
              <input type="number" min="1" value={nEntrada} onChange={(e) => setNEntrada(e.target.value)} placeholder="1" className={inputCls + ' tabular-nums'} />
            </Campo>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Parcelamento com a construtora até quando?" hint={mesesPrazo > 0
              ? <>prazo de <b>{mesesPrazo} meses</b> → já preenchi <b>{mesesPrazo} parcelas</b> e <b>{Math.floor(mesesPrazo / PERIODOS[periodicidade].meses)} reforços</b> {PERIODOS[periodicidade].label.toLowerCase()} lá embaixo{!dataBase ? ' (contando a partir de hoje)' : ''}</>
              : 'a data limite do parcelamento direto com a construtora (entrega das chaves). Ao escolher, preencho sozinho quantas parcelas e reforços cabem no prazo.'}>
              <input type="date" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} className={inputCls} />
            </Campo>
          </div>
          {c.entradaR > 0 && (
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Vencimento da entrada {c.nEntr > 1 ? '(1ª no ato, demais sugeridas — pode alterar)' : '(sugerido hoje/ato — pode alterar)'}</span>
                {entradaDatas.length > 0 && <button onClick={() => setEntradaDatas([])} className="text-[11px] text-[#FF7A97] font-bold hover:underline">usar sugeridas</button>}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {Array.from({ length: c.nEntr }, (_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary w-20 shrink-0">{c.nEntr > 1 ? `Entrada ${j + 1}` : 'Entrada'}</span>
                    <input type="date" value={entradaDatas[j] || toYMD(c.entradaDateObjs[j])} onChange={(e) => setEntradaData(j, e.target.value)} className={inputCls + ' py-1.5 text-sm'} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Secao>

        <Secao icon="📅" titulo="Parcelas mensais">
          <div className="grid sm:grid-cols-3 gap-3">
            <Campo label="Data da 1ª parcela"><input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} className={inputCls} /></Campo>
            <Campo label="Quantidade de parcelas" hint={mesesPrazo > 0 ? 'calculada pelo prazo (pode ajustar)' : undefined}><input type="number" value={nParcelas} onChange={(e) => setNParcelas(e.target.value)} placeholder="40" className={inputCls + ' tabular-nums'} /></Campo>
            <ValorFlex label={parcelaMode === 'pct' ? 'Parcelas — % do total' : 'Valor de cada parcela'} mode={parcelaMode} value={parcelaVal} base={c.baseParcela} onMode={setParcelaMode} onValue={setParcelaVal}
              hint={parcelaVal > 0 ? (parcelaMode === 'pct'
                ? <>{fmtPct(parcelaVal)} do valor ÷ {c.nParc} = <b>{brl(c.parcelaR)}</b> por parcela</>
                : c.vp > 0 && c.totalParc > 0 ? <>total <b>{brl(c.totalParc)}</b> = <b>{fmtPct((c.totalParc / c.vp) * 100)}</b> do valor</> : undefined) : undefined} />
          </div>
          {c.base && c.parcUltima && <p className="text-xs text-text-secondary">Vencimentos: <b className="text-white">{fmtData(c.base)}</b> a <b className="text-white">{fmtData(c.parcUltima)}</b> (mensal).</p>}
          <button onClick={fecharPelaParcela} className={btnFechar}>↳ calcular a parcela que fecha</button>
        </Secao>

        <Secao icon="💰" titulo="Reforços (balões)">
          <div className="grid sm:grid-cols-3 gap-3">
            <Campo label="Quantidade" hint={mesesPrazo > 0 ? 'calculada pelo prazo (pode ajustar)' : undefined}><input type="number" value={nReforcos} onChange={(e) => setNReforcos(e.target.value)} placeholder="3" className={inputCls + ' tabular-nums'} /></Campo>
            <ValorFlex label={reforcoMode === 'pct' ? 'Reforços — % do total' : 'Valor de cada reforço'} mode={reforcoMode} value={reforcoVal} base={c.baseReforco} onMode={setReforcoMode} onValue={setReforcoVal}
              hint={reforcoVal > 0 ? (reforcoMode === 'pct'
                ? <>{fmtPct(reforcoVal)} do valor ÷ {c.nRef} = <b>{brl(c.reforcoR)}</b> por reforço</>
                : c.vp > 0 && c.totalRef > 0 ? <>total <b>{brl(c.totalRef)}</b> = <b>{fmtPct((c.totalRef / c.vp) * 100)}</b> do valor</> : undefined) : undefined} />
            <Campo label="Periodicidade (sugestão)">
              <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} className={inputCls}>
                <option value="trimestral">Trimestrais</option><option value="semestral">Semestrais</option><option value="anual">Anuais</option>
              </select>
            </Campo>
          </div>
          {c.nRef > 0 && (
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Vencimento de cada reforço (sugerido no fim de {periodicidade === 'anual' ? 'dezembro' : periodicidade === 'trimestral' ? 'mar/jun/set/dez' : 'junho e dezembro'} — pode alterar)</span>
                {refDatas.length > 0 && <button onClick={() => setRefDatas([])} className="text-[11px] text-[#FF7A97] font-bold hover:underline">usar sugeridas</button>}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {Array.from({ length: c.nRef }, (_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary w-20 shrink-0">Reforço {j + 1}</span>
                    <input type="date" value={refDatas[j] || suggestedYMD(j)} onChange={(e) => setRefData(j, e.target.value)} className={inputCls + ' py-1.5 text-sm'} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={fecharPeloReforco} className={btnFechar}>↳ calcular o reforço que fecha</button>
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
          {c.ac > 0 && <p className="text-xs text-text-secondary mt-1">Montado <b className="text-white">{brl(c.montado)}</b> de <b className="text-white">{brl(c.ac)}</b> a pagar até a chave.{c.refForaPrazo && <span className="text-rose-300"> ⚠ Reforço após a entrega.</span>}</p>}
        </div>

        <div className="al-card relative overflow-hidden rounded-2xl">
          <div className="absolute inset-x-0 top-0 gx-line-gold" />
          <div className="px-5 py-3 border-b border-white/10 al-display text-[13px] font-bold text-white uppercase tracking-[0.14em]">Condições de pagamento</div>
          <div className="divide-y divide-white/[0.06] text-sm">
            {c.entradaR > 0 && <Linha nome="Entrada" sub={c.entradaDateObjs.length ? (c.nEntr > 1 ? `${c.nEntr}× de ${brl(c.entradaParc)} · ${fmtData(c.entradaDateObjs[0])} a ${fmtData(c.entradaDateObjs[c.nEntr - 1])}` : fmtData(c.entradaDateObjs[0])) : 'no ato'} qtd={`${c.nEntr}×`} valor={brl(c.entradaParc)} total={brl(c.entradaR)} />}
            <Linha nome="Parcelas mensais" sub={c.base && c.parcUltima ? `${fmtData(c.base)} a ${fmtData(c.parcUltima)}` : undefined} qtd={`${c.nParc}×`} valor={brl(c.parcelaR)} total={brl(c.totalParc)} />
            <Linha nome={`Reforços ${PERIODOS[periodicidade].label.toLowerCase()}`} sub={c.refDateObjs.length ? c.refDateObjs.map((d) => fmtData(d)).join(' · ') : undefined} qtd={`${c.nRef}×`} valor={brl(c.reforcoR)} total={brl(c.totalRef)} />
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
