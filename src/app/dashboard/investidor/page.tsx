'use client';

import React, { useMemo, useState } from 'react';
import MoneyInput, { formatBRL } from '@/components/MoneyInput';
import { showToast } from '@/components/ui/toast';

const PERIODOS: Record<string, { label: string; meses: number }> = {
  semestral: { label: 'Semestrais', meses: 6 },
  anual: { label: 'Anuais', meses: 12 },
};

const brl = (n: number) => 'R$ ' + formatBRL(n);
const numI = (s: string) => { const v = parseFloat(s); return isNaN(v) ? 0 : v; };
const numF = (s: string) => { const v = parseFloat(String(s).replace(',', '.')); return isNaN(v) ? 0 : v; };
const fmtPct2 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtData = (d: Date) => d.toLocaleDateString('pt-BR');

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
const CardResultado = ({ titulo, children, gold }: { titulo: string; children: React.ReactNode; gold?: boolean }) => (
  <div className="al-card relative overflow-hidden rounded-2xl p-4">
    <div className={`absolute inset-x-0 top-0 ${gold ? 'gx-line-gold' : 'gx-line'}`} />
    <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">{titulo}</div>
    {children}
  </div>
);

export default function InvestidorPage() {
  // Seção 1 — identificação
  const [empreendimento, setEmpreendimento] = useState('');
  const [unidade, setUnidade] = useState('');
  const [torre, setTorre] = useState('');
  const [cliente, setCliente] = useState('');
  const [valorImovel, setValorImovel] = useState(0);
  // Seção 2 — prazo
  const [dataAssinatura, setDataAssinatura] = useState(() => toYMD(new Date()));
  const [dataEntrega, setDataEntrega] = useState('');
  // Seção 3 — pagamentos até as chaves
  const [entrada, setEntrada] = useState(0);
  const [nParcelas, setNParcelas] = useState('');
  const [valorParcela, setValorParcela] = useState(0);
  const [nReforcos, setNReforcos] = useState('');
  const [valorReforco, setValorReforco] = useState(0);
  const [periodicidade, setPeriodicidade] = useState('anual');
  // Seção 4 — índices
  const [cubOn, setCubOn] = useState(false);
  const [cubAA, setCubAA] = useState('');
  const [valAA, setValAA] = useState('');

  const c = useMemo(() => {
    const valor = valorImovel;
    const nParc = Math.max(0, Math.round(numI(nParcelas)));
    const nRef = Math.max(0, Math.round(numI(nReforcos)));
    const perMeses = PERIODOS[periodicidade].meses;

    // prazo em meses inteiros entre assinatura e entrega (mín 1)
    let M = 0;
    let semEntrega = true;
    if (dataEntrega) {
      semEntrega = false;
      const a = dataAssinatura ? parseLocal(dataAssinatura) : new Date();
      const b = parseLocal(dataEntrega);
      M = Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
    }

    // resumo nominal (independe de datas/índices)
    const totalParcNom = nParc * valorParcela;
    const totalRefNom = nRef * valorReforco;
    // saldo que o plano de pagamento nunca cobre (nominal)
    const saldoResidualNominal = Math.max(0, valor - entrada - totalParcNom - totalRefNom);

    const bloqueado = semEntrega || valor <= 0;

    // taxas mensais equivalentes
    const cubPct = numF(cubAA);
    const valPct = numF(valAA);
    const icub = cubOn ? Math.pow(1 + cubPct / 100, 1 / 12) - 1 : 0;
    const ival = Math.pow(1 + valPct / 100, 1 / 12) - 1;

    // projeção de venda na entrega: o que vence depois do mês M não é pago
    // mês a mês — é quitado na venda (mês M), pelo valor nominal (corrigido
    // pelo acumulado do CUB até M quando o toggle está ligado).
    let parcAposM = 0, refAposM = 0, restParcNom = 0, restRefNom = 0;
    let investido = 0, totalParcCorr = 0, totalRefCorr = 0;
    let valorEntrega = 0, equity = 0, lucro = 0, roi = 0;
    let tirMes: number | null = null, tirAno: number | null = null;
    const cf = new Array<number>(Math.max(1, M) + 1).fill(0);

    if (!semEntrega) {
      cf[0] = -entrada;
      for (let m = 1; m <= nParc; m++) {
        if (m <= M) {
          const pago = cubOn ? valorParcela * Math.pow(1 + icub, m) : valorParcela;
          totalParcCorr += pago;
          cf[m] -= pago;
        } else { parcAposM++; restParcNom += valorParcela; }
      }
      for (let j = 1; j <= nRef; j++) {
        const m = j * perMeses;
        if (m <= M) {
          const pago = cubOn ? valorReforco * Math.pow(1 + icub, m) : valorReforco;
          totalRefCorr += pago;
          cf[m] -= pago;
        } else { refAposM++; restRefNom += valorReforco; }
      }
    }
    // quitação na entrega = parcelas/reforços restantes + saldo residual
    const quitacaoNominal = restParcNom + restRefNom + saldoResidualNominal;
    const quitacaoComCub = quitacaoNominal * Math.pow(1 + icub, Math.max(1, M));
    const quitacao = cubOn ? quitacaoComCub : quitacaoNominal;
    const temAposM = parcAposM + refAposM > 0;

    if (!bloqueado) {
      investido = entrada + totalParcCorr + totalRefCorr;
      valorEntrega = valor * Math.pow(1 + ival, M);
      equity = valorEntrega - quitacao;
      lucro = equity - investido;
      roi = investido > 0 ? lucro / investido : 0;
      if (investido > 0) {
        cf[M] += equity;
        tirMes = irrMensal(cf);
        tirAno = tirMes !== null ? Math.pow(1 + tirMes, 12) - 1 : null;
      }
    }

    return {
      valor, M, semEntrega, nParc, nRef, perMeses, totalParcNom, totalRefNom,
      saldoResidualNominal, quitacaoNominal, quitacaoComCub, quitacao,
      parcAposM, refAposM, temAposM, bloqueado, cubPct, valPct,
      investido, totalParcCorr, totalRefCorr,
      valorEntrega, equity, lucro, roi, tirMes, tirAno,
    };
  }, [valorImovel, dataAssinatura, dataEntrega, entrada, nParcelas, valorParcela, nReforcos, valorReforco, periodicidade, cubOn, cubAA, valAA]);

  const gerarProposta = () => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const assinatura = dataAssinatura ? fmtData(parseLocal(dataAssinatura)) : '—';
    const entrega = dataEntrega ? fmtData(parseLocal(dataEntrega)) : '—';
    const linhas: string[] = [];
    if (entrada > 0) linhas.push(`<tr><td>Entrada <span class="mut">· no ato (não corrige)</span></td><td class="c">1×</td><td class="r">${brl(entrada)}</td><td class="r">${brl(entrada)}</td></tr>`);
    const parcPagas = c.nParc - c.parcAposM;
    const refPagos = c.nRef - c.refAposM;
    if (parcPagas > 0 && valorParcela > 0) linhas.push(`<tr><td>Parcelas mensais pagas até a entrega${cubOn ? ' <span class="mut">· corrigidas pelo CUB</span>' : ''}${c.parcAposM > 0 ? ` <span class="mut">· ${c.parcAposM} restantes quitadas na venda</span>` : ''}</td><td class="c">${parcPagas}×</td><td class="r">${brl(valorParcela)}</td><td class="r">${brl(cubOn ? c.totalParcCorr : parcPagas * valorParcela)}</td></tr>`);
    if (refPagos > 0 && valorReforco > 0) linhas.push(`<tr><td>Reforços ${PERIODOS[periodicidade].label.toLowerCase()} pagos até a entrega${cubOn ? ' <span class="mut">· corrigidos pelo CUB</span>' : ''}${c.refAposM > 0 ? ` <span class="mut">· ${c.refAposM} restantes quitados na venda</span>` : ''}</td><td class="c">${refPagos}×</td><td class="r">${brl(valorReforco)}</td><td class="r">${brl(cubOn ? c.totalRefCorr : refPagos * valorReforco)}</td></tr>`);
    linhas.push(`<tr class="sub"><td colspan="3">Total investido até as chaves</td><td class="r">${brl(c.investido)}</td></tr>`);
    linhas.push(`<tr><td>${c.temAposM ? 'Quitação nas chaves <span class="mut">· parcelas restantes + saldo, na venda</span>' : 'Saldo nas chaves'}${cubOn ? ` <span class="mut">· ${brl(c.quitacaoNominal)} sem CUB → corrigido</span>` : ''}</td><td class="c">—</td><td class="r">—</td><td class="r">${brl(c.quitacao)}</td></tr>`);
    linhas.push(`<tr><td>Valor do imóvel na entrega <span class="mut">· valorização de ${c.valPct.toLocaleString('pt-BR')}% a.a. em ${c.M} meses</span></td><td class="c">—</td><td class="r">—</td><td class="r">${brl(c.valorEntrega)}</td></tr>`);
    linhas.push(`<tr><td>Patrimônio nas chaves <span class="mut">· valor na entrega − saldo devedor</span></td><td class="c">—</td><td class="r">—</td><td class="r">${brl(c.equity)}</td></tr>`);
    linhas.push(`<tr class="sub"><td colspan="3">Lucro projetado</td><td class="r">${brl(c.lucro)}</td></tr>`);
    linhas.push(`<tr class="tot"><td colspan="3">ROI ${fmtPct2(c.roi * 100)} · TIR ${c.tirMes !== null ? fmtPct2(c.tirMes * 100) + ' a.m. / ' + fmtPct2((c.tirAno || 0) * 100) + ' a.a.' : '—'}</td><td class="r">&nbsp;</td></tr>`);
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Análise do Investidor — Nox Imóveis</title>
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
  .foot{margin-top:26px;font-size:11px;color:#9aa0a6;border-top:1px solid #e6e1d6;padding-top:12px;line-height:1.6}
  @media print{body{padding:24px}}
</style></head><body>
  <div class="head"><div><div class="brand">NOX <span>IMÓVEIS</span></div><div class="brandsub">Análise do Investidor</div></div>
    <div class="doc"><b>Valorização e alavancagem</b><br>${hoje}${cliente ? `<br>Cliente: ${cliente}` : ''}</div></div>
  <div class="imovel">
    <div class="row"><span class="lab">Empreendimento</span><b>${empreendimento || '—'}</b></div>
    <div class="row"><span class="lab">Unidade / Torre</span><b>${[unidade, torre].filter(Boolean).join(' - ') || '—'}</b></div>
    <div class="row"><span class="lab">Valor do imóvel</span><b>${brl(c.valor)}</b></div>
    <div class="row"><span class="lab">Assinatura → entrega das chaves</span><b>${assinatura} → ${entrega} (${c.M} meses)</b></div>
    ${cubOn ? `<div class="row"><span class="lab">Correção aplicada</span><b>CUB ${c.cubPct.toLocaleString('pt-BR')}% a.a.</b></div>` : ''}
  </div>
  <table><thead><tr><th>Item</th><th class="c">Qtde</th><th class="r">Valor unit.</th><th class="r">Total</th></tr></thead><tbody>${linhas.join('')}</tbody></table>
  <div class="foot">Análise gerada pela Nox Imóveis para fins de simulação. TIR = taxa interna de retorno mensal do fluxo de caixa do investidor até a entrega das chaves. Valorização projetada de ${c.valPct.toLocaleString('pt-BR')}% ao ano${cubOn ? ` e correção pelo CUB de ${c.cubPct.toLocaleString('pt-BR')}% ao ano` : ' (correção monetária não inclusa)'}. Valores sujeitos à confirmação e às condições da construtora.</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { showToast('Libere os pop-ups para gerar a proposta.', 'error'); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="min-h-full py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-5">
          <h1 className="al-display text-2xl font-bold text-white uppercase tracking-[0.08em]">Calculadora do Investidor</h1>
          <p className="text-sm text-text-secondary">Valorização e alavancagem até a entrega das chaves: quanto o investidor coloca, quanto vira patrimônio e a TIR do dinheiro. Nada é salvo.</p>
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
              <div className="grid sm:grid-cols-2 gap-3">
                <Campo label="Data da assinatura"><input type="date" value={dataAssinatura} onChange={(e) => setDataAssinatura(e.target.value)} className={inputCls} /></Campo>
                <Campo label="Entrega das chaves" hint={!c.semEntrega ? <>prazo de <b className="text-white">{c.M} meses</b> até as chaves</> : undefined}>
                  <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className={inputCls} />
                </Campo>
              </div>
              {c.semEntrega && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-2.5 text-[13px] text-amber-200">
                  Escolha a data de entrega das chaves para eu calcular a valorização e a TIR.
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
              <div className="grid sm:grid-cols-3 gap-3">
                <Campo label="Qtde de reforços" hint={periodicidade === 'anual' ? 'caem nos meses 12, 24, 36…' : 'caem nos meses 6, 12, 18…'}>
                  <input type="number" min="0" value={nReforcos} onChange={(e) => setNReforcos(e.target.value)} placeholder="3" className={inputCls + ' tabular-nums'} />
                </Campo>
                <Campo label="Valor de cada reforço"><MoneyInput value={valorReforco} onChange={setValorReforco} placeholder="20.000,00" className={inputCls} /></Campo>
                <Campo label="Periodicidade dos reforços">
                  <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)} className={inputCls}>
                    <option value="semestral">Semestrais</option><option value="anual">Anuais</option>
                  </select>
                </Campo>
              </div>
              {c.temAposM && (
                <p className="text-[11px] text-text-secondary">
                  {[c.parcAposM > 0 ? `${c.parcAposM} parcela${c.parcAposM > 1 ? 's' : ''}` : '', c.refAposM > 0 ? `${c.refAposM} reforço${c.refAposM > 1 ? 's' : ''}` : ''].filter(Boolean).join(' e ')} venceriam após a entrega — na projeção, são quitad{c.parcAposM > 0 ? 'as' : 'os'} na venda (mês {c.M}).
                </p>
              )}
              <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] px-3.5 py-2.5 flex items-center justify-between gap-3">
                <span className="text-[13px] text-text-secondary">{c.temAposM ? 'Quitação nas chaves (sem CUB)' : 'Fica para as chaves (sem CUB)'}</span>
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
              <Campo label="Valorização do imóvel % ao ano" hint="quanto o imóvel valoriza por ano até a entrega">
                <div className="relative">
                  <input type="number" step="any" min="0" value={valAA} onChange={(e) => setValAA(e.target.value)} placeholder="12" className={inputCls + ' pr-8 tabular-nums'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-white/40 pointer-events-none">%</span>
                </div>
              </Campo>
            </Secao>
          </div>

          {/* ---------- RESULTADO (sticky) ---------- */}
          <div className="space-y-4 lg:sticky lg:top-4">
            {c.bloqueado ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <span className="text-sm font-semibold text-white">
                  {c.valor <= 0 ? 'Preencha o valor do imóvel' : 'Escolha a data de entrega das chaves'}
                </span>
                <p className="text-xs text-text-secondary mt-1">Os resultados aparecem aqui assim que os dados fecharem.</p>
              </div>
            ) : (
              <>
                <div className="al-card relative overflow-hidden rounded-2xl p-5 text-center">
                  <div className="absolute inset-x-0 top-0 gx-line-gold" />
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">TIR ao mês</div>
                  <div className="al-display text-4xl font-bold tabular-nums text-[#E8C547] drop-shadow-[0_0_18px_rgba(232,197,71,0.45)] mt-1">
                    {c.tirMes !== null ? fmtPct2(c.tirMes * 100) : '—'}
                  </div>
                  <div className="text-[13px] text-text-secondary mt-2">
                    {c.tirAno !== null ? <>= <b className="text-[#FFE9A6]">{fmtPct2(c.tirAno * 100)}</b> ao ano</> : 'sem TIR para este fluxo'}
                    <span className="mx-2 text-white/20">|</span>
                    ROI <b className="text-white">{fmtPct2(c.roi * 100)}</b>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-3">TIR = quanto o dinheiro investido rendeu por mês, já considerando quando cada real saiu do bolso.</p>
                </div>

                <CardResultado titulo="Total investido até as chaves">
                  <div className="al-display text-xl font-bold tabular-nums text-white">{brl(c.investido)}</div>
                  {cubOn && <p className="text-[11px] text-text-secondary mt-0.5">já com correção do CUB de {c.cubPct.toLocaleString('pt-BR')}% a.a.</p>}
                </CardResultado>

                <CardResultado titulo={c.temAposM ? 'Quitação nas chaves' : 'Saldo nas chaves'}>
                  {cubOn ? (
                    <div className="text-[15px] text-white tabular-nums">
                      <span className="text-text-secondary">{brl(c.quitacaoNominal)} (sem CUB)</span>
                      <span className="mx-2 text-[#E8C547]">→</span>
                      <b className="al-display text-xl">{brl(c.quitacaoComCub)}</b> <span className="text-[11px] text-text-secondary">(com CUB)</span>
                    </div>
                  ) : (
                    <div className="al-display text-xl font-bold tabular-nums text-white">{brl(c.quitacaoNominal)}</div>
                  )}
                  {c.temAposM && <p className="text-[11px] text-text-secondary mt-0.5">parcelas restantes + saldo, quitados na venda (mês {c.M})</p>}
                </CardResultado>

                <CardResultado titulo="Valor do imóvel na entrega" gold>
                  <div className="al-display text-xl font-bold tabular-nums text-[#FFE9A6]">{brl(c.valorEntrega)}</div>
                  <p className="text-[11px] text-text-secondary mt-0.5">valorização de {c.valPct.toLocaleString('pt-BR')}% a.a. em {c.M} meses</p>
                </CardResultado>

                <CardResultado titulo="Patrimônio nas chaves">
                  <div className="al-display text-xl font-bold tabular-nums text-white">{brl(c.equity)}</div>
                  <p className="text-[11px] text-text-secondary mt-0.5">valor na entrega − saldo devedor</p>
                </CardResultado>

                <CardResultado titulo="Lucro">
                  <div className={`al-display text-xl font-bold tabular-nums ${c.lucro > 0 ? 'text-emerald-300' : c.lucro < 0 ? 'text-rose-300' : 'text-white'}`}>{brl(c.lucro)}</div>
                  <p className="text-[11px] text-text-secondary mt-0.5">patrimônio − total investido</p>
                </CardResultado>
              </>
            )}

            <button onClick={gerarProposta} disabled={c.bloqueado} className="group relative overflow-hidden w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 text-[#181203] font-bold text-[15px] shadow-[0_8px_24px_-8px_rgba(232,197,71,0.5)] disabled:opacity-40 active:scale-[0.98] transition-all">
              <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
              Gerar proposta
            </button>
            <p className="text-[11px] text-center text-text-secondary">Projeção para fins de simulação — nada é salvo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
