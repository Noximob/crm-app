'use client';

import React, { useMemo, useState } from 'react';
import MoneyInput, { formatBRL } from '@/components/MoneyInput';

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
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtData = (d: Date) => d.toLocaleDateString('pt-BR');

// ---------- inputs (nível de módulo p/ não perder foco) ----------
const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-[#171b28] text-[15px] text-[#2E2F38] dark:text-white focus:outline-none focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20 transition';
const Campo = ({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-semibold text-[#6B6F76] dark:text-gray-300 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-[#9aa0a6] mt-1">{hint}</p>}
  </div>
);
const Secao = ({ icon, titulo, children }: { icon: string; titulo: string; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-[#23283A] rounded-2xl border border-[#E8E9F1] dark:border-white/10 p-5">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#2E2F38] dark:text-white">{titulo}</h2>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);
const btnFechar = 'text-xs px-3 py-1.5 rounded-lg bg-[#D4A017]/15 text-[#8a6d10] dark:text-[#e8c547] font-semibold hover:bg-[#D4A017]/25 transition';

/** Campo de valor com raciocínio flexível: digite em R$ OU em % (do valor da proposta). Ao alternar, converte o número. */
const ValorFlex = ({ label, mode, value, base, onMode, onValue, hint }: {
  label: string; mode: Modo; value: number; base: number;
  onMode: (m: Modo) => void; onValue: (n: number) => void; hint?: React.ReactNode;
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
        <label className="block text-xs font-semibold text-[#6B6F76] dark:text-gray-300 truncate">{label}</label>
        <div className="flex rounded-md overflow-hidden border border-[#E8E9F1] dark:border-white/15 shrink-0">
          {(['rs', 'pct'] as const).map((m) => (
            <button key={m} type="button" onClick={() => trocar(m)} className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${mode === m ? 'bg-[#D4A017] text-black' : 'text-[#9aa0a6] hover:text-[#6B6F76] dark:hover:text-white'}`}>
              {m === 'rs' ? 'R$' : '%'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'rs' ? (
        <MoneyInput value={value} onChange={onValue} placeholder="0,00" className={inputCls} />
      ) : (
        <div className="relative">
          <input type="number" step="any" min="0" value={value || ''} onChange={(e) => onValue(parseFloat(e.target.value) || 0)} placeholder="0" className={inputCls + ' pr-8 tabular-nums'} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9aa0a6] pointer-events-none">%</span>
        </div>
      )}
      {hint && <p className="text-[11px] text-[#9aa0a6] mt-1">{hint}</p>}
    </div>
  );
};

export default function FluxoPagamentoPage() {
  const [empreendimento, setEmpreendimento] = useState('');
  const [unidade, setUnidade] = useState('');
  const [cliente, setCliente] = useState('');
  const [valorImovel, setValorImovel] = useState(0);
  const [descMode, setDescMode] = useState<Modo>('pct');
  const [descVal, setDescVal] = useState(0);
  const [permutaDesc, setPermutaDesc] = useState('');
  const [permutaValor, setPermutaValor] = useState(0);
  const [chaveMode, setChaveMode] = useState<Modo>('pct');
  const [chaveVal, setChaveVal] = useState(30);
  const [entradaMode, setEntradaMode] = useState<Modo>('rs');
  const [entradaVal, setEntradaVal] = useState(0);
  const [nEntrada, setNEntrada] = useState('1');
  const [dataBase, setDataBase] = useState('');
  const [nParcelas, setNParcelas] = useState('40');
  const [parcelaMode, setParcelaMode] = useState<Modo>('rs');
  const [parcelaVal, setParcelaVal] = useState(0);
  const [nReforcos, setNReforcos] = useState('3');
  const [reforcoMode, setReforcoMode] = useState<Modo>('rs');
  const [reforcoVal, setReforcoVal] = useState(0);
  const [periodicidade, setPeriodicidade] = useState('semestral');
  const [dataLimite, setDataLimite] = useState(''); // até quando dá pra pagar (entrega das chaves)
  const [refDatas, setRefDatas] = useState<string[]>([]); // overrides YYYY-MM-DD; vazio = usa a sugerida

  // Prazo total: com a 1ª parcela e o limite definidos, calcula sozinho quantas
  // parcelas mensais cabem e quantos reforços cabem na periodicidade escolhida.
  const mesesPrazo = React.useMemo(() => {
    if (!dataBase || !dataLimite) return 0;
    const a = parseLocal(dataBase), b = parseLocal(dataLimite);
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
    const parcelaR = parcelaMode === 'pct' ? vp * (parcelaVal / 100) : parcelaVal;
    const nRef = Math.max(0, Math.round(numI(nReforcos)));
    const reforcoR = reforcoMode === 'pct' ? vp * (reforcoVal / 100) : reforcoVal;
    const totalParc = nParc * parcelaR;
    const totalRef = nRef * reforcoR;
    const montado = entradaR + permutaValor + totalParc + totalRef; // permuta abate do que se paga até a chave
    const diferenca = ac - montado;
    const tol = 0.01 * (nParc + nRef + nEntr) + 0.005;
    const fecha = ac > 0 && Math.abs(diferenca) <= tol;
    const periodo = PERIODOS[periodicidade].meses;
    const base = dataBase ? parseLocal(dataBase) : null;
    const parcUltima = base && nParc > 0 ? addMonths(base, nParc - 1) : null;
    const refMeses = Array.from({ length: nRef }, (_, j) => periodo * (j + 1));
    const refDateObjs = Array.from({ length: nRef }, (_, j) => {
      if (refDatas[j]) return parseLocal(refDatas[j]);
      return base ? addMonths(base, refMeses[j] - 1) : null;
    });
    const refForaPrazo = nParc > 0 && refMeses.some((m) => m > nParc);
    return { valor, descR, pctDesc, vp, ac, pctChaveEff, saldo, entradaR, nEntr, entradaParc, nParc, parcelaR, nRef, reforcoR, totalParc, totalRef, montado, diferenca, fecha, periodo, base, parcUltima, refMeses, refDateObjs, refForaPrazo };
  }, [valorImovel, descMode, descVal, chaveMode, chaveVal, entradaMode, entradaVal, nEntrada, permutaValor, dataBase, nParcelas, parcelaMode, parcelaVal, nReforcos, reforcoMode, reforcoVal, periodicidade, refDatas]);

  const suggestedYMD = (j: number) => (c.base ? toYMD(addMonths(c.base, c.refMeses[j] - 1)) : '');
  const setRefData = (j: number, v: string) => setRefDatas((prev) => { const n = [...prev]; n[j] = v; return n; });

  // “fechar”: calcula o R$ necessário e grava no modo atual do campo (R$ ou %)
  const setNoModo = (alvoR: number, mode: Modo, setVal: (n: number) => void) => {
    const v = Math.max(0, alvoR);
    setVal(mode === 'pct' ? (c.vp > 0 ? round3((v / c.vp) * 100) : 0) : round2(v));
  };
  const fecharPelaParcela = () => { if (c.nParc > 0) setNoModo((c.ac - c.entradaR - permutaValor - c.totalRef) / c.nParc, parcelaMode, setParcelaVal); };
  const fecharPeloReforco = () => { if (c.nRef > 0) setNoModo((c.ac - c.entradaR - permutaValor - c.totalParc) / c.nRef, reforcoMode, setReforcoVal); };

  // dica “equivalente” pros campos flexíveis
  const eq = (mode: Modo, val: number, extra?: React.ReactNode) => {
    if (!val) return extra || undefined;
    const conv = mode === 'pct' ? <>= <b>{brl(c.vp * (val / 100))}</b></> : c.vp > 0 ? <>= <b>{fmtPct((val / c.vp) * 100)}</b> da proposta</> : undefined;
    return conv ? <>{conv}{extra ? <> · {extra}</> : null}</> : extra || undefined;
  };

  const gerarPDF = () => {
    const linhas: string[] = [];
    if (c.entradaR > 0) {
      const detEntr = c.nEntr > 1 ? ` <span class="mut">· ${c.nEntr}× de ${brl(c.entradaParc)} (ato e meses seguintes)</span>` : ' <span class="mut">· no ato</span>';
      linhas.push(`<tr><td>Entrada${detEntr}</td><td class="c">${c.nEntr}×</td><td class="r">${brl(c.entradaParc)}</td><td class="r">${brl(c.entradaR)}</td></tr>`);
    }
    if (permutaValor > 0) linhas.push(`<tr><td>Permuta${permutaDesc ? ` <span class="mut">· ${permutaDesc}</span>` : ''}</td><td class="c">1×</td><td class="r">${brl(permutaValor)}</td><td class="r">${brl(permutaValor)}</td></tr>`);
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
    <div class="row"><span class="lab">Unidade / Torre</span><b>${unidade || '—'}</b></div>
    <div class="row"><span class="lab">Valor de tabela</span><b>${brl(c.valor)}</b></div>
    ${c.descR > 0 ? `<div class="row"><span class="lab">Desconto (${c.pctDesc.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)</span><b>- ${brl(c.descR)}</b></div><div class="row"><span class="lab">Valor da proposta</span><b>${brl(c.vp)}</b></div>` : ''}
    <div class="row"><span class="lab">A pagar até a chave</span><b>${c.pctChaveEff.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% · ${brl(c.ac)}</b></div>
  </div>
  <table><thead><tr><th>Condição</th><th class="c">Qtde</th><th class="r">Valor unit.</th><th class="r">Total</th></tr></thead><tbody>${linhas.join('')}</tbody></table>
  ${!c.fecha ? `<div class="disc"><b>Observação:</b> o fluxo montado ${c.diferenca > 0 ? 'está ' + brl(c.diferenca) + ' abaixo' : 'excede em ' + brl(Math.abs(c.diferenca))} do valor a pagar até a chave.</div>` : ''}
  <div class="foot">Proposta gerada pela Nox Imóveis para fins de simulação. Valores sujeitos à confirmação e às condições da construtora. As parcelas e reforços sofrem correção monetária (INCC / CUB / IGP-M) conforme contrato — <b>não inclusa</b> nesta simulação.</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { alert('Libere os pop-ups para gerar o PDF.'); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  const status = c.ac <= 0 ? 'vazio' : c.fecha ? 'ok' : c.diferenca > 0 ? 'falta' : 'excedente';
  const statusCor = { vazio: 'border-[#E8E9F1] dark:border-white/10 bg-[#f7f7f9] dark:bg-white/5', ok: 'border-emerald-400/50 bg-emerald-50 dark:bg-emerald-500/10', falta: 'border-amber-400/50 bg-amber-50 dark:bg-amber-500/10', excedente: 'border-rose-400/50 bg-rose-50 dark:bg-rose-500/10' }[status];

  return (
    <div className="min-h-full py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Fluxo de Pagamento</h1>
          <p className="text-sm text-[#6B6F76] dark:text-gray-300">Monte a proposta em R$ ou em % — cada campo tem o seletor. Gere o PDF com a logo da Nox. Nada é salvo.</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_minmax(360px,420px)] gap-5 items-start">
          {/* ---------- FORM ---------- */}
          <div className="space-y-4">
            <Secao icon="🏢" titulo="Imóvel">
              <div className="grid sm:grid-cols-2 gap-3">
                <Campo label="Empreendimento"><input value={empreendimento} onChange={(e) => setEmpreendimento(e.target.value)} placeholder="Ex: Orla da Barra" className={inputCls} /></Campo>
                <Campo label="Unidade / Torre"><input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Ex: Apto 1405 - Torre B" className={inputCls} /></Campo>
              </div>
              <Campo label="Cliente (opcional)"><input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" className={inputCls} /></Campo>
              <div className="grid sm:grid-cols-2 gap-3">
                <Campo label="Valor do imóvel"><MoneyInput value={valorImovel} onChange={setValorImovel} placeholder="500.000,00" className={inputCls} /></Campo>
                <ValorFlex label="Desconto" mode={descMode} value={descVal} base={c.valor} onMode={setDescMode} onValue={setDescVal}
                  hint={c.descR > 0 ? <>{descMode === 'pct' ? <>= {brl(c.descR)}</> : <>= {fmtPct(c.pctDesc)}</>} · proposta <b>{brl(c.vp)}</b></> : 'opcional'} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Campo label="Permuta (o que entra)" hint="carro, casa, terreno… (opcional)"><input value={permutaDesc} onChange={(e) => setPermutaDesc(e.target.value)} placeholder="Ex: Honda Civic 2020" className={inputCls} /></Campo>
                <Campo label="Valor da permuta" hint={permutaValor > 0 ? 'abatido do que se paga até a chave' : 'opcional'}><MoneyInput value={permutaValor} onChange={setPermutaValor} placeholder="0,00" className={inputCls} /></Campo>
              </div>
            </Secao>

            <Secao icon="🔑" titulo="Até a entrega das chaves">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <ValorFlex label="A pagar até a chave" mode={chaveMode} value={chaveVal} base={c.vp} onMode={setChaveMode} onValue={setChaveVal}
                  hint={c.ac > 0 ? (chaveMode === 'pct' ? <>= <b>{brl(c.ac)}</b></> : <>= <b>{fmtPct(c.pctChaveEff)}</b> da proposta</>) : undefined} />
                <ValorFlex label="Entrada (total)" mode={entradaMode} value={entradaVal} base={c.vp} onMode={setEntradaMode} onValue={setEntradaVal}
                  hint={eq(entradaMode, entradaVal, c.nEntr > 1 && c.entradaR > 0 ? <b>{c.nEntr}× de {brl(c.entradaParc)}</b> : undefined)} />
                <Campo label="Entrada em quantas vezes" hint={c.nEntr > 1 ? 'no ato e meses seguintes' : '1 = à vista no ato'}>
                  <input type="number" min="1" value={nEntrada} onChange={(e) => setNEntrada(e.target.value)} placeholder="1" className={inputCls + ' tabular-nums'} />
                </Campo>
                <Campo label="Pagar até (entrega das chaves)" hint={mesesPrazo > 0 ? <>prazo de <b>{mesesPrazo} meses</b> → {mesesPrazo} parcelas e {Math.floor(mesesPrazo / PERIODOS[periodicidade].meses)} reforços {PERIODOS[periodicidade].label.toLowerCase()}</> : 'com a data da 1ª parcela, preenche parcelas e reforços sozinho'}>
                  <input type="date" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} className={inputCls} />
                </Campo>
              </div>
            </Secao>

            <Secao icon="📅" titulo="Parcelas mensais">
              <div className="grid sm:grid-cols-3 gap-3">
                <Campo label="Data da 1ª parcela"><input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} className={inputCls} /></Campo>
                <Campo label="Quantidade de parcelas" hint={mesesPrazo > 0 ? 'calculada pelo prazo (pode ajustar)' : undefined}><input type="number" value={nParcelas} onChange={(e) => setNParcelas(e.target.value)} placeholder="40" className={inputCls + ' tabular-nums'} /></Campo>
                <ValorFlex label="Valor de cada parcela" mode={parcelaMode} value={parcelaVal} base={c.vp} onMode={setParcelaMode} onValue={setParcelaVal}
                  hint={eq(parcelaMode, parcelaVal, c.totalParc > 0 ? <>total <b>{brl(c.totalParc)}</b></> : undefined)} />
              </div>
              {c.base && c.parcUltima && <p className="text-xs text-[#6B6F76] dark:text-gray-400">Vencimentos: <b>{fmtData(c.base)}</b> a <b>{fmtData(c.parcUltima)}</b> (mensal).</p>}
              <button onClick={fecharPelaParcela} className={btnFechar}>↳ calcular a parcela que fecha</button>
            </Secao>

            <Secao icon="💰" titulo="Reforços (balões)">
              <div className="grid sm:grid-cols-3 gap-3">
                <Campo label="Quantidade" hint={mesesPrazo > 0 ? 'calculada pelo prazo (pode ajustar)' : undefined}><input type="number" value={nReforcos} onChange={(e) => setNReforcos(e.target.value)} placeholder="3" className={inputCls + ' tabular-nums'} /></Campo>
                <ValorFlex label="Valor de cada reforço" mode={reforcoMode} value={reforcoVal} base={c.vp} onMode={setReforcoMode} onValue={setReforcoVal}
                  hint={eq(reforcoMode, reforcoVal, c.totalRef > 0 ? <>total <b>{brl(c.totalRef)}</b></> : undefined)} />
                <Campo label="Periodicidade (sugestão)">
                  <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} className={inputCls}>
                    <option value="trimestral">Trimestrais</option><option value="semestral">Semestrais</option><option value="anual">Anuais</option>
                  </select>
                </Campo>
              </div>
              {c.nRef > 0 && (
                <div className="rounded-xl border border-[#E8E9F1] dark:border-white/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#6B6F76] dark:text-gray-300">Vencimento de cada reforço {c.base ? '(sugerido — pode alterar)' : '(defina a data da 1ª parcela p/ sugerir)'}</span>
                    {refDatas.length > 0 && <button onClick={() => setRefDatas([])} className="text-[11px] text-[#8a6d10] dark:text-[#e8c547] font-semibold hover:underline">usar sugeridas</button>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {Array.from({ length: c.nRef }, (_, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className="text-xs text-[#6B6F76] dark:text-gray-400 w-20 shrink-0">Reforço {j + 1}</span>
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
                <span className="text-sm font-semibold text-[#2E2F38] dark:text-white">
                  {status === 'vazio' && 'Preencha o valor e o que vai até a chave'}
                  {status === 'ok' && '✓ O fluxo fecha certinho'}
                  {status === 'falta' && 'Falta pra fechar'}
                  {status === 'excedente' && 'Passou do necessário'}
                </span>
                {status !== 'vazio' && status !== 'ok' && (
                  <span className={`text-lg font-bold tabular-nums ${status === 'falta' ? 'text-amber-600 dark:text-amber-300' : 'text-rose-600 dark:text-rose-300'}`}>{status === 'falta' ? '−' : '+'} {brl(Math.abs(c.diferenca))}</span>
                )}
              </div>
              {c.ac > 0 && <p className="text-xs text-[#6B6F76] dark:text-gray-300 mt-1">Montado <b>{brl(c.montado)}</b> de <b>{brl(c.ac)}</b> a pagar até a chave.{c.refForaPrazo && <span className="text-rose-600 dark:text-rose-300"> ⚠ Reforço após a entrega.</span>}</p>}
            </div>

            <div className="bg-white dark:bg-[#23283A] rounded-2xl border border-[#E8E9F1] dark:border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E8E9F1] dark:border-white/10 text-sm font-bold text-[#2E2F38] dark:text-white">Condições de pagamento</div>
              <div className="divide-y divide-[#E8E9F1] dark:divide-white/10 text-sm">
                {c.entradaR > 0 && <Linha nome="Entrada" sub={c.nEntr > 1 ? `${c.nEntr}× de ${brl(c.entradaParc)} · ato e meses seguintes` : 'no ato'} qtd={`${c.nEntr}×`} valor={brl(c.entradaParc)} total={brl(c.entradaR)} />}
                {permutaValor > 0 && <Linha nome="Permuta" sub={permutaDesc || undefined} qtd="1×" valor={brl(permutaValor)} total={brl(permutaValor)} />}
                <Linha nome="Parcelas mensais" sub={c.base && c.parcUltima ? `${fmtData(c.base)} a ${fmtData(c.parcUltima)}` : undefined} qtd={`${c.nParc}×`} valor={brl(c.parcelaR)} total={brl(c.totalParc)} />
                <Linha nome={`Reforços ${PERIODOS[periodicidade].label.toLowerCase()}`} sub={c.refDateObjs[0] ? c.refDateObjs.map((d) => (d ? fmtData(d) : '')).filter(Boolean).join(' · ') : c.nRef > 0 ? `meses ${c.refMeses.join(', ')}` : undefined} qtd={`${c.nRef}×`} valor={brl(c.reforcoR)} total={brl(c.totalRef)} />
                <Linha nome="Total até a entrega das chaves" total={brl(c.montado)} destaque />
                <Linha nome="Saldo financiado na entrega" sub="banco / construtora" total={brl(c.saldo)} />
                <Linha nome="Valor total do imóvel" total={brl(c.vp)} forte />
              </div>
            </div>

            <button onClick={gerarPDF} disabled={c.vp <= 0} className="w-full px-4 py-3 rounded-xl bg-[#13212e] text-white font-bold text-[15px] hover:bg-[#1c2f40] disabled:opacity-40 transition">🧾 Gerar proposta em PDF (logo Nox)</button>
            <p className="text-[11px] text-center text-[#9aa0a6]">Correção monetária (INCC / CUB / IGP-M) não inclusa nesta simulação.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Linha({ nome, sub, qtd, valor, total, destaque, forte }: { nome: string; sub?: string; qtd?: string; valor?: string; total: string; destaque?: boolean; forte?: boolean }) {
  return (
    <div className={`flex items-center px-5 py-2.5 ${destaque ? 'bg-[#D4A017]/10' : ''} ${forte ? 'bg-[#13212e] text-white' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${forte ? 'text-white' : 'text-[#2E2F38] dark:text-white'} ${destaque ? 'font-bold' : ''}`}>{nome}</div>
        {sub && <div className={`text-[11px] ${forte ? 'text-white/70' : 'text-[#9aa0a6]'}`}>{sub}</div>}
      </div>
      {qtd && <div className={`w-12 text-center text-xs ${forte ? 'text-white/80' : 'text-[#6B6F76] dark:text-gray-300'}`}>{qtd}</div>}
      {valor && <div className={`w-28 text-right text-xs tabular-nums ${forte ? 'text-white/80' : 'text-[#6B6F76] dark:text-gray-300'}`}>{valor}</div>}
      <div className={`w-32 text-right font-semibold tabular-nums ${forte ? 'text-white' : 'text-[#2E2F38] dark:text-white'}`}>{total}</div>
    </div>
  );
}
