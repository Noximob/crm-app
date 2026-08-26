'use client';

/**
 * 📄 O DEMONSTRATIVO DE REPASSE — o papel que vai pro proprietário.
 *
 * É o documento mensal que toda imobiliária séria manda junto do PIX: o que
 * o inquilino pagou, o que a casa reteve, o que sobrou pro dono, com o
 * número do contrato e a data do crédito. Sem ele o dono recebe um valor na
 * conta e liga perguntando "de onde veio isso?".
 *
 * Sai impresso/PDF pelo mesmo caminho dos contratos, e também em texto pra
 * colar no WhatsApp — porque na prática é assim que ele chega.
 */
import React from 'react';
import {
  fmtValor, fmtData, cents, DADOS_IMOBILIARIA,
  type Movimento, type Locacao, type ImovelLocacao,
} from '@/lib/locacao';
import { btnOuro, btnGhost } from '../ui';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const compLonga = (c: string) => { const [a, m] = c.split('-'); return `${MESES[Number(m) - 1]}/${a}`; };

const CSS_PAPEL = `
@media print {
  body * { visibility: hidden; }
  #demo-print, #demo-print * { visibility: visible; }
  #demo-print { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  @page { size: A4 portrait; margin: 18mm 20mm; }
}`;

export function textoDemonstrativo(
  movs: Movimento[], dono: string, imovel: ImovelLocacao | undefined, inquilino: string,
): string {
  const total = cents(movs.reduce((s, m) => s + m.repasseDono, 0));
  const L = [
    `DEMONSTRATIVO DE REPASSE — ${DADOS_IMOBILIARIA.razao.replace(' Ltda.', '')}`,
    '',
    `Proprietário: ${dono}`,
    imovel ? `Imóvel: ${imovel.codigo} — ${imovel.titulo}` : '',
    inquilino ? `Inquilino: ${inquilino}` : '',
    '',
  ];
  for (const m of movs) {
    L.push(`${compLonga(m.competencia).toUpperCase()}  (pago em ${fmtData(m.pagoEm)})`);
    L.push(`  Aluguel .................. ${fmtValor(m.valorAluguel)}`);
    if (m.valorIptu > 0) L.push(`  Reembolso do IPTU ........ ${fmtValor(m.valorIptu)}`);
    L.push(`  Taxa de administração .... -${fmtValor(m.taxaAdm)}`);
    L.push(`  Repasse .................. ${fmtValor(m.repasseDono)}`);
    L.push('');
  }
  L.push(`TOTAL REPASSADO: ${fmtValor(total)}`);
  L.push('');
  L.push('O condomínio é pago pelo inquilino direto à administradora e não passa por nós.');
  L.push('A taxa de administração é dedutível no seu Imposto de Renda.');
  L.push('');
  L.push('Qualquer dúvida, é só chamar.');
  return L.filter((x) => x !== undefined).join('\n');
}

export default function Demonstrativo({ movs, dono, pix, imovel, inquilino, onFechar }: {
  movs: Movimento[];
  dono: string;
  pix: string;
  imovel?: ImovelLocacao;
  inquilino?: Locacao;
  onFechar: () => void;
}) {
  const total = cents(movs.reduce((s, m) => s + m.repasseDono, 0));
  const totalCobrado = cents(movs.reduce((s, m) => s + m.valorTotal, 0));
  const totalTaxa = cents(movs.reduce((s, m) => s + m.taxaAdm, 0));

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoDemonstrativo(movs, dono, imovel, inquilino?.nome || ''));
      alert('Demonstrativo copiado — cole no WhatsApp do proprietário.');
    } catch { /* sem clipboard */ }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-white/15">
      <div className="flex flex-wrap items-center gap-2 bg-white/[0.04] px-4 py-2.5 no-print">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
          Demonstrativo de repasse — vai junto do PIX
        </span>
        <span className="ml-auto flex flex-wrap gap-2">
          <button onClick={copiar} className={btnOuro}>📋 Copiar pro WhatsApp</button>
          <button onClick={() => window.print()} className={btnGhost}>🖨 Imprimir / PDF</button>
          <button onClick={onFechar} className={btnGhost}>fechar</button>
        </span>
      </div>

      <div id="demo-print" className="bg-white text-neutral-900 px-6 sm:px-10 py-8 text-[12.5px] leading-relaxed font-serif">
        <style dangerouslySetInnerHTML={{ __html: CSS_PAPEL }} />

        <div className="flex items-baseline justify-between border-b-2 border-neutral-800 pb-2 mb-5">
          <h1 className="text-[15px] font-bold uppercase tracking-wide">Demonstrativo de Repasse</h1>
          <span className="text-[10px] text-neutral-500">{new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        <p className="mb-1"><b>Proprietário:</b> {dono}</p>
        {imovel && <p className="mb-1"><b>Imóvel:</b> {imovel.codigo} — {imovel.titulo}</p>}
        {imovel && <p className="mb-1 text-[11.5px] text-neutral-600">{[imovel.rua, imovel.numero].filter(Boolean).join(', ')}{imovel.complemento ? `, ${imovel.complemento}` : ''}, {imovel.bairro}, {imovel.cidade}</p>}
        {inquilino && <p className="mb-1"><b>Inquilino:</b> {inquilino.nome}</p>}
        <p className="mb-5"><b>Crédito via PIX:</b> {pix || '(chave não cadastrada)'}</p>

        <table className="w-full border-collapse text-[11.5px] mb-5">
          <thead>
            <tr>
              {['Competência', 'Pago em', 'Aluguel', 'IPTU', 'Taxa adm.', 'Repasse'].map((h, i) => (
                <th key={h} className={`border-b-2 border-neutral-800 py-1.5 ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movs.map((m) => (
              <tr key={m.id}>
                <td className="border-b border-neutral-300 py-1.5 font-bold">{compLonga(m.competencia)}</td>
                <td className="border-b border-neutral-300 py-1.5">{fmtData(m.pagoEm)}</td>
                <td className="border-b border-neutral-300 py-1.5 text-right">{fmtValor(m.valorAluguel)}</td>
                <td className="border-b border-neutral-300 py-1.5 text-right">{m.valorIptu ? fmtValor(m.valorIptu) : '—'}</td>
                <td className="border-b border-neutral-300 py-1.5 text-right">−{fmtValor(m.taxaAdm)}</td>
                <td className="border-b border-neutral-300 py-1.5 text-right font-bold">{fmtValor(m.repasseDono)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="py-2 text-right font-bold border-t-2 border-neutral-800">TOTAL REPASSADO</td>
              <td className="py-2 text-right font-bold text-[14px] border-t-2 border-neutral-800">{fmtValor(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="text-[11px] text-neutral-600 space-y-1">
          <p>
            Cobrado do inquilino no período: <b>{fmtValor(totalCobrado)}</b> ·
            retido a título de administração: <b>{fmtValor(totalTaxa)}</b>
            {inquilino?.taxaAdmPct ? ` (${inquilino.taxaAdmPct}% sobre o aluguel)` : ''}.
          </p>
          <p>
            O <b>condomínio</b> é pago pelo inquilino diretamente à administradora do condomínio e não
            transita por esta administradora. O <b>seguro incêndio</b>, quando cobrado, é repassado à
            seguradora.
          </p>
          <p>
            A taxa de administração é despesa dedutível na apuração do seu Imposto de Renda; o
            reembolso do IPTU não constitui rendimento tributável.
          </p>
        </div>

        <p className="text-center text-[9px] text-neutral-400 mt-8">
          {DADOS_IMOBILIARIA.razao} · CNPJ {DADOS_IMOBILIARIA.cnpj} · {DADOS_IMOBILIARIA.creci} ·
          {' '}{DADOS_IMOBILIARIA.telefone} · {DADOS_IMOBILIARIA.email}
        </p>
      </div>
    </div>
  );
}
