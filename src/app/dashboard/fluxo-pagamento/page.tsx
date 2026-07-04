'use client';

import React, { useMemo, useState } from 'react';

const PERIODOS: Record<string, { label: string; meses: number }> = {
  trimestral: { label: 'Trimestrais', meses: 3 },
  semestral: { label: 'Semestrais', meses: 6 },
  anual: { label: 'Anuais', meses: 12 },
};

const brl = (n: number) => (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// campos são <input type="number"> → valor sempre com "." decimal e sem separador de milhar
const num = (s: string) => { const v = parseFloat(s); return isNaN(v) ? 0 : v; };
const round2 = (n: number) => Math.round(n * 100) / 100;

const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
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
const Money = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9aa0a6] pointer-events-none">R$</span>
    <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls + ' pl-9 tabular-nums'} />
  </div>
);
const Percent = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="relative">
    <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls + ' pr-8 tabular-nums'} />
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#9aa0a6] pointer-events-none">%</span>
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

export default function FluxoPagamentoPage() {
  const [empreendimento, setEmpreendimento] = useState('');
  const [unidade, setUnidade] = useState('');
  const [cliente, setCliente] = useState('');
  const [valorImovel, setValorImovel] = useState('');
  const [descontoPct, setDescontoPct] = useState('');
  const [pctChave, setPctChave] = useState('30');
  const [dataBase, setDataBase] = useState('');
  const [entrada, setEntrada] = useState('');
  const [nParcelas, setNParcelas] = useState('40');
  const [parcela, setParcela] = useState('');
  const [nReforcos, setNReforcos] = useState('3');
  const [reforco, setReforco] = useState('');
  const [periodicidade, setPeriodicidade] = useState('semestral');

  const c = useMemo(() => {
    const valor = num(valorImovel);
    const dPct = num(descontoPct);
    const descVal = valor * (dPct / 100);
    const vp = Math.max(0, valor - descVal);
    const p = num(pctChave);
    const ac = vp * (p / 100);
    const saldo = Math.max(0, vp - ac);
    const entradaV = num(entrada);
    const nParc = Math.max(0, Math.round(num(nParcelas)));
    const parcelaV = num(parcela);
    const nRef = Math.max(0, Math.round(num(nReforcos)));
    const reforcoV = num(reforco);
    const totalParc = nParc * parcelaV;
    const totalRef = nRef * reforcoV;
    const montado = entradaV + totalParc + totalRef;
    const diferenca = ac - montado;
    // tolerância de arredondamento em centavos (ex.: 220.000/3 deixa 1 centavo de resíduo)
    const tol = 0.01 * (nParc + nRef) + 0.005;
    const fecha = ac > 0 && Math.abs(diferenca) <= tol;
    const periodo = PERIODOS[periodicidade].meses;
    const refMeses = Array.from({ length: nRef }, (_, i) => periodo * (i + 1));
    const refForaPrazo = nParc > 0 && refMeses.some((m) => m > nParc);
    const base = dataBase ? parseLocal(dataBase) : null;
    const parcPrimeira = base ? base : null;
    const parcUltima = base && nParc > 0 ? addMonths(base, nParc - 1) : null;
    const refDatas = base ? refMeses.map((m) => addMonths(base, m - 1)) : refMeses.map(() => null as Date | null);
    return { valor, dPct, descVal, vp, p, ac, saldo, entradaV, nParc, parcelaV, nRef, reforcoV, totalParc, totalRef, montado, diferenca, fecha, periodo, refMeses, refForaPrazo, parcPrimeira, parcUltima, refDatas };
  }, [valorImovel, descontoPct, pctChave, dataBase, entrada, nParcelas, parcela, nReforcos, reforco, periodicidade]);

  const fecharPelaParcela = () => { if (c.nParc > 0) setParcela(String(Math.max(0, round2((c.ac - c.entradaV - c.totalRef) / c.nParc)))); };
  const fecharPeloReforco = () => { if (c.nRef > 0) setReforco(String(Math.max(0, round2((c.ac - c.entradaV - c.totalParc) / c.nRef)))); };

  const gerarPDF = () => {
    const rowsParc = c.parcPrimeira && c.parcUltima ? ` <span class="mut">· ${fmtData(c.parcPrimeira)} a ${fmtData(c.parcUltima)}</span>` : '';
    const rowsRef = c.refDatas[0] ? ` <span class="mut">· ${c.refDatas.map((d) => (d ? fmtData(d) : '')).filter(Boolean).join(' · ')}</span>` : ` <span class="mut">(meses ${c.refMeses.join(', ')})</span>`;
    const linhas: string[] = [];
    if (c.entradaV > 0) linhas.push(`<tr><td>Entrada / ato <span class="mut">· no ato</span></td><td class="c">1×</td><td class="r">${brl(c.entradaV)}</td><td class="r">${brl(c.entradaV)}</td></tr>`);
    if (c.nParc > 0 && c.parcelaV > 0) linhas.push(`<tr><td>Parcelas mensais${rowsParc}</td><td class="c">${c.nParc}×</td><td class="r">${brl(c.parcelaV)}</td><td class="r">${brl(c.totalParc)}</td></tr>`);
    if (c.nRef > 0 && c.reforcoV > 0) linhas.push(`<tr><td>Reforços ${PERIODOS[periodicidade].label.toLowerCase()}${rowsRef}</td><td class="c">${c.nRef}×</td><td class="r">${brl(c.reforcoV)}</td><td class="r">${brl(c.totalRef)}</td></tr>`);
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
    ${c.descVal > 0 ? `<div class="row"><span class="lab">Desconto (${c.dPct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)</span><b>- ${brl(c.descVal)}</b></div><div class="row"><span class="lab">Valor da proposta</span><b>${brl(c.vp)}</b></div>` : ''}
    <div class="row"><span class="lab">A pagar até a chave</span><b>${c.p.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% · ${brl(c.ac)}</b></div>
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
          <p className="text-sm text-[#6B6F76] dark:text-gray-300">Monte a proposta de pagamento do imóvel e gere o PDF com a logo da Nox. Nada é salvo.</p>
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
                <Campo label="Valor do imóvel"><Money value={valorImovel} onChange={setValorImovel} placeholder="500.000" /></Campo>
                <Campo label="Desconto" hint={c.descVal > 0 ? <>= {brl(c.descVal)} · proposta <b>{brl(c.vp)}</b></> : 'opcional'}><Percent value={descontoPct} onChange={setDescontoPct} placeholder="0" /></Campo>
              </div>
            </Secao>

            <Secao icon="🔑" titulo="Até a entrega das chaves">
              <div className="grid sm:grid-cols-3 gap-3">
                <Campo label="% a pagar até a chave" hint={<>= <b>{brl(c.ac)}</b></>}><Percent value={pctChave} onChange={setPctChave} placeholder="30" /></Campo>
                <Campo label="Entrada / ato" hint="opcional"><Money value={entrada} onChange={setEntrada} placeholder="0" /></Campo>
                <Campo label="Data da 1ª parcela" hint="opcional"><input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} className={inputCls} /></Campo>
              </div>
            </Secao>

            <Secao icon="📅" titulo="Parcelas mensais">
              <div className="grid sm:grid-cols-2 gap-3">
                <Campo label="Quantidade de parcelas"><input type="number" value={nParcelas} onChange={(e) => setNParcelas(e.target.value)} placeholder="40" className={inputCls + ' tabular-nums'} /></Campo>
                <Campo label="Valor de cada parcela"><Money value={parcela} onChange={setParcela} placeholder="0" /></Campo>
              </div>
              <button onClick={fecharPelaParcela} className={btnFechar}>↳ calcular a parcela que fecha</button>
            </Secao>

            <Secao icon="💰" titulo="Reforços (balões)">
              <div className="grid sm:grid-cols-3 gap-3">
                <Campo label="Quantidade"><input type="number" value={nReforcos} onChange={(e) => setNReforcos(e.target.value)} placeholder="3" className={inputCls + ' tabular-nums'} /></Campo>
                <Campo label="Valor de cada reforço"><Money value={reforco} onChange={setReforco} placeholder="0" /></Campo>
                <Campo label="Periodicidade">
                  <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} className={inputCls}>
                    <option value="trimestral">Trimestrais</option><option value="semestral">Semestrais</option><option value="anual">Anuais</option>
                  </select>
                </Campo>
              </div>
              <button onClick={fecharPeloReforco} className={btnFechar}>↳ calcular o reforço que fecha</button>
            </Secao>
          </div>

          {/* ---------- RESULTADO (sticky) ---------- */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <div className={`rounded-2xl border p-5 ${statusCor}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[#2E2F38] dark:text-white">
                  {status === 'vazio' && 'Preencha o valor e o % até a chave'}
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
                {c.entradaV > 0 && <Linha nome="Entrada / ato" sub="no ato" qtd="1×" valor={brl(c.entradaV)} total={brl(c.entradaV)} />}
                <Linha nome="Parcelas mensais" sub={c.parcPrimeira && c.parcUltima ? `${fmtData(c.parcPrimeira)} a ${fmtData(c.parcUltima)}` : undefined} qtd={`${c.nParc}×`} valor={brl(c.parcelaV)} total={brl(c.totalParc)} />
                <Linha nome={`Reforços ${PERIODOS[periodicidade].label.toLowerCase()}`} sub={c.refDatas[0] ? c.refDatas.map((d) => (d ? fmtData(d) : '')).filter(Boolean).join(' · ') : c.nRef > 0 ? `meses ${c.refMeses.join(', ')}` : undefined} qtd={`${c.nRef}×`} valor={brl(c.reforcoV)} total={brl(c.totalRef)} />
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
