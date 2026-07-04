'use client';

import React, { useMemo, useState } from 'react';

const PERIODOS: Record<string, { label: string; meses: number }> = {
  trimestral: { label: 'Trimestrais', meses: 3 },
  semestral: { label: 'Semestrais', meses: 6 },
  anual: { label: 'Anuais', meses: 12 },
};

const brl = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (s: string) => {
  const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  return isNaN(v) ? 0 : v;
};

const Campo = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-semibold text-[#6B6F76] dark:text-gray-300 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-[#9aa0a6] mt-1">{hint}</p>}
  </div>
);

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-[#E8E9F1] dark:border-white/10 bg-white dark:bg-[#1b1f2e] text-[15px] text-[#2E2F38] dark:text-white focus:outline-none focus:border-[#D4A017]';

export default function FluxoPagamentoPage() {
  const [empreendimento, setEmpreendimento] = useState('');
  const [unidade, setUnidade] = useState('');
  const [cliente, setCliente] = useState('');
  const [valorImovel, setValorImovel] = useState('');
  const [desconto, setDesconto] = useState('');
  const [pctChave, setPctChave] = useState('30');
  const [entrada, setEntrada] = useState('');
  const [nParcelas, setNParcelas] = useState('40');
  const [parcela, setParcela] = useState('');
  const [nReforcos, setNReforcos] = useState('3');
  const [reforco, setReforco] = useState('');
  const [periodicidade, setPeriodicidade] = useState('semestral');

  const c = useMemo(() => {
    const valor = num(valorImovel);
    const desc = num(desconto);
    const vp = Math.max(0, valor - desc);
    const pctDesc = valor > 0 ? (desc / valor) * 100 : 0;
    const p = num(pctChave);
    const ac = vp * (p / 100); // total a pagar até a chave
    const saldo = Math.max(0, vp - ac); // financiamento na entrega
    const entradaV = num(entrada);
    const nParc = Math.max(0, Math.round(num(nParcelas)));
    const parcelaV = num(parcela);
    const nRef = Math.max(0, Math.round(num(nReforcos)));
    const reforcoV = num(reforco);
    const totalParc = nParc * parcelaV;
    const totalRef = nRef * reforcoV;
    const montado = entradaV + totalParc + totalRef;
    const diferenca = ac - montado; // >0 falta, <0 excedente (sobra)
    const fecha = Math.abs(diferenca) < 0.005 && ac > 0;
    const periodo = PERIODOS[periodicidade].meses;
    const refMeses = Array.from({ length: nRef }, (_, i) => periodo * (i + 1));
    const refForaPrazo = nParc > 0 && refMeses.some((m) => m > nParc);
    return { valor, desc, vp, pctDesc, p, ac, saldo, entradaV, nParc, parcelaV, nRef, reforcoV, totalParc, totalRef, montado, diferenca, fecha, periodo, refMeses, refForaPrazo };
  }, [valorImovel, desconto, pctChave, entrada, nParcelas, parcela, nReforcos, reforco, periodicidade]);

  const fecharPelaParcela = () => {
    if (c.nParc <= 0) return;
    const v = (c.ac - c.entradaV - c.totalRef) / c.nParc;
    setParcela(String(Math.max(0, Math.round(v * 100) / 100)));
  };
  const fecharPeloReforco = () => {
    if (c.nRef <= 0) return;
    const v = (c.ac - c.entradaV - c.totalParc) / c.nRef;
    setReforco(String(Math.max(0, Math.round(v * 100) / 100)));
  };

  const gerarPDF = () => {
    const linhas: string[] = [];
    if (c.entradaV > 0) linhas.push(`<tr><td>Entrada / ato</td><td class="c">1×</td><td class="r">${brl(c.entradaV)}</td><td class="r">${brl(c.entradaV)}</td></tr>`);
    if (c.nParc > 0 && c.parcelaV > 0) linhas.push(`<tr><td>Parcelas mensais</td><td class="c">${c.nParc}×</td><td class="r">${brl(c.parcelaV)}</td><td class="r">${brl(c.totalParc)}</td></tr>`);
    if (c.nRef > 0 && c.reforcoV > 0) linhas.push(`<tr><td>Reforços ${PERIODOS[periodicidade].label.toLowerCase()} <span class="mut">(meses ${c.refMeses.join(', ')})</span></td><td class="c">${c.nRef}×</td><td class="r">${brl(c.reforcoV)}</td><td class="r">${brl(c.totalRef)}</td></tr>`);
    linhas.push(`<tr class="sub"><td colspan="3">Total até a entrega das chaves</td><td class="r">${brl(c.montado)}</td></tr>`);
    linhas.push(`<tr><td>Saldo financiado na entrega (banco/construtora)</td><td class="c">—</td><td class="r">—</td><td class="r">${brl(c.saldo)}</td></tr>`);
    linhas.push(`<tr class="tot"><td colspan="3">Valor total do imóvel</td><td class="r">${brl(c.vp)}</td></tr>`);

    const hoje = new Date().toLocaleDateString('pt-BR');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Proposta de Fluxo de Pagamento</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Times New Roman',serif;color:#13212e;padding:44px 40px;background:#fff}
  .brand{font-family:Georgia,serif;font-size:26px;font-weight:700;letter-spacing:.02em;color:#13212e}
  .brand span{color:#b9852b}
  .brandsub{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#b9852b;margin-top:2px}
  .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #b9852b;padding-bottom:16px;margin-bottom:22px}
  .doc{font-size:12px;color:#6c7480;text-align:right;line-height:1.7}
  h1{font-size:19px;margin:0 0 4px}
  .imovel{background:#f7f5f0;border:1px solid #e6e1d6;border-radius:10px;padding:16px 18px;margin-bottom:22px}
  .imovel .row{display:flex;justify-content:space-between;font-size:14px;padding:3px 0}
  .imovel .lab{color:#6c7480}
  .imovel b{font-weight:700}
  table{width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px}
  th{background:#13212e;color:#fff;text-align:left;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  th.r,td.r{text-align:right}th.c,td.c{text-align:center}
  td{padding:9px 12px;border-bottom:1px solid #eee}
  .mut{color:#9aa0a6;font-size:11px}
  tr.sub td{background:#f3e6c9;font-weight:700}
  tr.tot td{background:#13212e;color:#fff;font-weight:700;font-size:14px}
  .disc{font-size:12px;color:#6c7480;margin-top:6px}
  .foot{margin-top:28px;font-size:11px;color:#9aa0a6;border-top:1px solid #e6e1d6;padding-top:12px;line-height:1.6}
  @media print{body{padding:24px}}
</style></head><body>
  <div class="head">
    <div><div class="brand">NOX <span>IMÓVEIS</span></div><div class="brandsub">Proposta de Pagamento</div></div>
    <div class="doc"><b>Fluxo de pagamento</b><br>${hoje}${cliente ? `<br>Cliente: ${cliente}` : ''}</div>
  </div>
  <div class="imovel">
    <div class="row"><span class="lab">Empreendimento</span><b>${empreendimento || '—'}</b></div>
    <div class="row"><span class="lab">Unidade / Torre</span><b>${unidade || '—'}</b></div>
    <div class="row"><span class="lab">Valor de tabela</span><b>${brl(c.valor)}</b></div>
    ${c.desc > 0 ? `<div class="row"><span class="lab">Desconto (${c.pctDesc.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)</span><b>- ${brl(c.desc)}</b></div><div class="row"><span class="lab">Valor da proposta</span><b>${brl(c.vp)}</b></div>` : ''}
    <div class="row"><span class="lab">A pagar até a chave</span><b>${c.p.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% · ${brl(c.ac)}</b></div>
  </div>
  <table><thead><tr><th>Condição</th><th class="c">Qtde</th><th class="r">Valor unit.</th><th class="r">Total</th></tr></thead>
  <tbody>${linhas.join('')}</tbody></table>
  ${!c.fecha ? `<div class="disc">Observação: o fluxo montado ${c.diferenca > 0 ? 'está R$ ' + c.diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' abaixo' : 'excede em R$ ' + Math.abs(c.diferenca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} do valor a pagar até a chave.</div>` : ''}
  <div class="foot">Proposta gerada pela Nox Imóveis para fins de simulação. Valores sujeitos à confirmação e às condições da construtora. Correção monetária (INCC/IGPM) não inclusa nesta simulação.</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { alert('Libere os pop-ups para gerar o PDF.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const podeGerar = c.vp > 0;

  return (
    <div className="min-h-full py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Fluxo de Pagamento</h1>
          <p className="text-sm text-[#6B6F76] dark:text-gray-300">Monte a proposta de pagamento do imóvel e gere o PDF com a logo da Nox. Nada é salvo.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* ---------- FORMULÁRIO ---------- */}
          <div className="bg-white dark:bg-[#23283A] rounded-2xl border border-[#E8E9F1] dark:border-white/10 p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo label="Empreendimento"><input value={empreendimento} onChange={(e) => setEmpreendimento(e.target.value)} placeholder="Ex: Residencial Vista Mar" className={inputCls} /></Campo>
              <Campo label="Unidade / Torre"><input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Ex: Apto 1204 - Torre B" className={inputCls} /></Campo>
            </div>
            <Campo label="Cliente (opcional)"><input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" className={inputCls} /></Campo>

            <div className="grid sm:grid-cols-2 gap-3">
              <Campo label="Valor do imóvel (R$)"><input type="number" value={valorImovel} onChange={(e) => setValorImovel(e.target.value)} placeholder="500000" className={inputCls} /></Campo>
              <Campo label="Desconto (R$)" hint={c.desc > 0 ? `${c.pctDesc.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% · proposta ${brl(c.vp)}` : 'opcional'}><input type="number" value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0" className={inputCls} /></Campo>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Campo label="% a pagar até a chave" hint={`= ${brl(c.ac)} até as chaves`}><input type="number" value={pctChave} onChange={(e) => setPctChave(e.target.value)} placeholder="30" className={inputCls} /></Campo>
              <Campo label="Entrada / ato (R$)" hint="opcional"><input type="number" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="0" className={inputCls} /></Campo>
            </div>

            <div className="h-px bg-[#E8E9F1] dark:bg-white/10" />

            <div className="grid sm:grid-cols-2 gap-3">
              <Campo label="Nº de parcelas mensais"><input type="number" value={nParcelas} onChange={(e) => setNParcelas(e.target.value)} placeholder="40" className={inputCls} /></Campo>
              <Campo label="Valor da parcela (R$)"><input type="number" value={parcela} onChange={(e) => setParcela(e.target.value)} placeholder="0" className={inputCls} /></Campo>
            </div>
            <button onClick={fecharPelaParcela} className="text-xs px-3 py-1.5 rounded-lg bg-[#D4A017]/15 text-[#8a6d10] dark:text-[#e8c547] font-semibold hover:bg-[#D4A017]/25">↳ ajustar a parcela pra fechar</button>

            <div className="grid sm:grid-cols-3 gap-3">
              <Campo label="Nº de reforços"><input type="number" value={nReforcos} onChange={(e) => setNReforcos(e.target.value)} placeholder="3" className={inputCls} /></Campo>
              <Campo label="Valor do reforço (R$)"><input type="number" value={reforco} onChange={(e) => setReforco(e.target.value)} placeholder="0" className={inputCls} /></Campo>
              <Campo label="Periodicidade">
                <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} className={inputCls}>
                  <option value="trimestral">Trimestrais</option>
                  <option value="semestral">Semestrais</option>
                  <option value="anual">Anuais</option>
                </select>
              </Campo>
            </div>
            <button onClick={fecharPeloReforco} className="text-xs px-3 py-1.5 rounded-lg bg-[#D4A017]/15 text-[#8a6d10] dark:text-[#e8c547] font-semibold hover:bg-[#D4A017]/25">↳ ajustar o reforço pra fechar</button>
          </div>

          {/* ---------- RESULTADO ---------- */}
          <div className="space-y-4">
            {/* status de fechamento */}
            <div className={`rounded-2xl border p-5 ${c.fecha ? 'border-emerald-400/40 bg-emerald-50 dark:bg-emerald-500/10' : c.diferenca > 0 ? 'border-amber-400/40 bg-amber-50 dark:bg-amber-500/10' : 'border-rose-400/40 bg-rose-50 dark:bg-rose-500/10'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#2E2F38] dark:text-white">
                  {c.ac <= 0 ? 'Preencha o valor e o % até a chave' : c.fecha ? '✓ O fluxo fecha certinho' : c.diferenca > 0 ? 'Falta pra fechar' : 'Excedente (passou do necessário)'}
                </span>
                {c.ac > 0 && !c.fecha && (
                  <span className={`text-lg font-bold ${c.diferenca > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-rose-600 dark:text-rose-300'}`}>
                    {c.diferenca > 0 ? '−' : '+'} {brl(Math.abs(c.diferenca))}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B6F76] dark:text-gray-300 mt-1">
                Montado {brl(c.montado)} de {brl(c.ac)} a pagar até a chave.
                {c.refForaPrazo && <span className="text-rose-600 dark:text-rose-300"> ⚠ Há reforço depois da entrega (mês {'>'} {c.nParc}).</span>}
              </p>
            </div>

            {/* quadro de condições */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl border border-[#E8E9F1] dark:border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E8E9F1] dark:border-white/10 text-sm font-bold text-[#2E2F38] dark:text-white">Condições de pagamento</div>
              <div className="divide-y divide-[#E8E9F1] dark:divide-white/10 text-sm">
                {c.entradaV > 0 && <Linha nome="Entrada / ato" qtd="1×" valor={brl(c.entradaV)} total={brl(c.entradaV)} />}
                <Linha nome="Parcelas mensais" qtd={`${c.nParc}×`} valor={brl(c.parcelaV)} total={brl(c.totalParc)} />
                <Linha nome={`Reforços ${PERIODOS[periodicidade].label.toLowerCase()}`} sub={c.nRef > 0 ? `meses ${c.refMeses.join(', ')}` : undefined} qtd={`${c.nRef}×`} valor={brl(c.reforcoV)} total={brl(c.totalRef)} />
                <Linha nome="Total até a entrega das chaves" total={brl(c.montado)} destaque />
                <Linha nome="Saldo financiado na entrega" sub="banco / construtora" total={brl(c.saldo)} />
                <Linha nome="Valor total do imóvel" total={brl(c.vp)} forte />
              </div>
            </div>

            <button onClick={gerarPDF} disabled={!podeGerar} className="w-full px-4 py-3 rounded-xl bg-[#13212e] text-white font-bold text-[15px] hover:bg-[#1c2f40] disabled:opacity-40">
              🧾 Gerar proposta em PDF (logo Nox)
            </button>
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
      {qtd && <div className={`w-14 text-center text-xs ${forte ? 'text-white/80' : 'text-[#6B6F76] dark:text-gray-300'}`}>{qtd}</div>}
      {valor && <div className={`w-28 text-right text-xs ${forte ? 'text-white/80' : 'text-[#6B6F76] dark:text-gray-300'}`}>{valor}</div>}
      <div className={`w-32 text-right font-semibold tabular-nums ${forte ? 'text-white' : 'text-[#2E2F38] dark:text-white'}`}>{total}</div>
    </div>
  );
}
