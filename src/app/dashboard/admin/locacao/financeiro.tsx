'use client';

/**
 * LOCAÇÃO · ABA FINANCEIRO — etapas 8 e 9: cobrança e repasse.
 *
 * Cada linha é um movimento: a cobrança do inquilino e o repasse do dono da
 * mesma competência. A trava da esteira é estrutural, não aviso: o botão de
 * repasse SÓ EXISTE depois do pagamento — impossível repassar o que não
 * entrou.
 *
 * Tudo aqui é PREVISÃO movida por botões de simulação (âmbar). Quando o
 * Asaas conectar: a cobrança nasce lá (assinatura), o webhook de pagamento
 * marca "paga" sozinho, a transferência PIX real substitui o "confirmar
 * repasse" e a NF da taxa sai automática. A tela é a mesma — troca a mão.
 */
import React, { useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from '@/components/ui/toast';
import {
  STATUS_COBRANCA, STATUS_REPASSE, fmtValor, fmtData, hojeYmd, descricaoRepasse,
  type MovimentoLocacao, type ContratoLocacao, type ImovelLocacao,
} from '@/lib/locacao';
import { btnGhost, btnSimula, Tabela, td, SeloSimulacao } from './ui';

export default function AbaFinanceiro({ isEspelhoDemo, movimentos, contratos, imoveis, recarregar }: {
  isEspelhoDemo?: boolean;
  movimentos: MovimentoLocacao[];
  contratos: ContratoLocacao[];
  imoveis: ImovelLocacao[];
  recarregar: () => Promise<void>;
}) {
  const [contratoSel, setContratoSel] = useState<string>('todos');
  const hoje = hojeYmd();
  const mesAtual = hoje.slice(0, 7);

  const contratoDe = (id: string) => contratos.find((c) => c.id === id);
  const tituloDe = (m: MovimentoLocacao) => {
    const c = contratoDe(m.contratoId);
    const im = c ? imoveis.find((i) => i.id === c.imovelId) : undefined;
    return c ? `${c.locatarioNome} · ${im?.codigo || ''}` : 'contrato removido';
  };

  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  const marcarPaga = async (m: MovimentoLocacao) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoMovimentos', m.id), {
      statusCobranca: 'paga', pagoEm: hoje, statusRepasse: 'liberado', simulado: true,
    });
    showToast('⚡ Simulação: pagamento confirmado. O repasse liberou (D+2). Com o Asaas real, quem faz isso é o webhook.', 'success');
    recarregar();
  };

  const confirmarRepasse = async (m: MovimentoLocacao) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoMovimentos', m.id), {
      statusRepasse: 'repassado', repassadoEm: hoje, simulado: true,
    });
    showToast('⚡ Simulação: repasse feito e NF da taxa "emitida". Com o Asaas real, é a transferência PIX agendada.', 'success');
    recarregar();
  };

  const copiarDescricao = async (m: MovimentoLocacao) => {
    try {
      await navigator.clipboard.writeText(descricaoRepasse(m));
      showToast('Descrição do PIX copiada.', 'success');
    } catch { /* sem clipboard */ }
  };

  const visiveis = useMemo(() => {
    // atrasada é estado derivado: prevista/emitida com vencimento no passado
    return movimentos
      .filter((m) => contratoSel === 'todos' || m.contratoId === contratoSel)
      .map((m) => (m.statusCobranca !== 'paga' && m.vencimento < hoje ? { ...m, statusCobranca: 'atrasada' as const } : m))
      .sort((a, b) => a.competencia.localeCompare(b.competencia));
  }, [movimentos, contratoSel, hoje]);

  const doMes = visiveis.filter((m) => m.competencia === mesAtual);
  const resumo = {
    previsto: doMes.reduce((s, m) => s + m.valorTotal, 0),
    recebido: doMes.filter((m) => m.statusCobranca === 'paga').reduce((s, m) => s + m.valorTotal, 0),
    aRepassar: visiveis.filter((m) => m.statusRepasse === 'liberado').reduce((s, m) => s + m.repasseDono, 0),
    taxaMes: doMes.filter((m) => m.statusCobranca === 'paga').reduce((s, m) => s + m.taxaAdm, 0),
    atrasadas: visiveis.filter((m) => m.statusCobranca === 'atrasada').length,
  };

  if (!movimentos.length) {
    return (
      <div className="al-card p-8 text-center">
        <p className="text-[32px] mb-2">💰</p>
        <p className="text-sm text-text-secondary max-w-[52ch] mx-auto">
          O dinheiro nasce quando um contrato é ATIVADO (chaves entregues): cada competência vira uma
          linha aqui — cobrança do inquilino e repasse do dono, com a trava entre os dois.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* o resumo do mês */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="al-card px-3 py-2.5">
          <p className="text-[19px] font-extrabold text-white tabular-nums leading-none">{fmtValor(resumo.previsto)}</p>
          <p className="text-[10.5px] text-text-secondary mt-1">previsto no mês ({doMes.length} cobrança{doMes.length === 1 ? '' : 's'})</p>
        </div>
        <div className="al-card px-3 py-2.5">
          <p className="text-[19px] font-extrabold text-emerald-300 tabular-nums leading-none">{fmtValor(resumo.recebido)}</p>
          <p className="text-[10.5px] text-text-secondary mt-1">recebido no mês</p>
        </div>
        <div className="al-card px-3 py-2.5">
          <p className="text-[19px] font-extrabold text-amber-300 tabular-nums leading-none">{fmtValor(resumo.aRepassar)}</p>
          <p className="text-[10.5px] text-text-secondary mt-1">liberado pra repassar (D+2)</p>
        </div>
        <div className="al-card px-3 py-2.5">
          <p className="text-[19px] font-extrabold text-[#FFE9A6] tabular-nums leading-none">{fmtValor(resumo.taxaMes)}</p>
          <p className="text-[10.5px] text-text-secondary mt-1">tua taxa no mês (com NF)</p>
        </div>
      </div>

      {resumo.atrasadas > 0 && (
        <p className="text-[12px] font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          🚨 {resumo.atrasadas} cobrança{resumo.atrasadas === 1 ? '' : 's'} atrasada{resumo.atrasadas === 1 ? '' : 's'} — régua: aviso D+1,
          ligação D+5, acionar a garantia Loft DENTRO DO PRAZO (perder o prazo é perder a cobertura).
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select value={contratoSel} onChange={(e) => setContratoSel(e.target.value)}
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] focus:outline-none">
          <option value="todos">Todos os contratos</option>
          {contratos.filter((c) => c.status === 'ativo' || c.status === 'encerrando').map((c) => (
            <option key={c.id} value={c.id}>{c.locatarioNome}</option>
          ))}
        </select>
        <span className="text-[11px] text-text-secondary ml-auto">
          Condomínio não aparece aqui: o inquilino paga direto à administradora.
        </span>
      </div>

      <div className="al-card p-4">
        <Tabela cols={['Competência', 'Contrato', 'Cobrança (inquilino)', 'Situação', 'Repasse (dono)', 'Situação', '']}>
          {visiveis.map((m) => {
            const sc = STATUS_COBRANCA[m.statusCobranca] || STATUS_COBRANCA.prevista;
            const sr = STATUS_REPASSE[m.statusRepasse] || STATUS_REPASSE.aguardando;
            return (
              <tr key={m.id}>
                <td className={td + ' text-white font-bold tabular-nums whitespace-nowrap'}>
                  {m.competencia.split('-').reverse().join('/')}
                  <span className="block text-[10px] text-text-secondary font-normal">vence {fmtData(m.vencimento)}</span>
                </td>
                <td className={td + ' text-text-secondary'}>{tituloDe(m)}</td>
                <td className={td + ' text-white tabular-nums whitespace-nowrap'}>
                  {fmtValor(m.valorTotal)}
                  <span className="block text-[10px] text-text-secondary">
                    aluguel {fmtValor(m.valorAluguel)}{m.valorIptu ? ` + IPTU ${fmtValor(m.valorIptu)}` : ''}{m.valorSeguro ? ` + seguro ${fmtValor(m.valorSeguro)}` : ''}
                  </span>
                </td>
                <td className={td + ' whitespace-nowrap'}>
                  <span className={`text-[11px] font-bold ${sc.cor}`}>{sc.rotulo}</span>
                  {m.statusCobranca !== 'paga' && (
                    <button onClick={() => marcarPaga(m)} className={btnSimula + ' block mt-1 !px-2 !py-1 !text-[10.5px]'}>⚡ pagou</button>
                  )}
                </td>
                <td className={td + ' text-emerald-300 tabular-nums whitespace-nowrap'}>
                  {fmtValor(m.repasseDono)}
                  <span className="block text-[10px] text-text-secondary">− taxa {fmtValor(m.taxaAdm)}</span>
                </td>
                <td className={td + ' whitespace-nowrap'}>
                  <span className={`text-[11px] font-bold ${sr.cor}`}>{sr.rotulo}</span>
                  {/* a trava: o botão de repasse só existe com a cobrança paga */}
                  {m.statusRepasse === 'liberado' && (
                    <button onClick={() => confirmarRepasse(m)} className={btnSimula + ' block mt-1 !px-2 !py-1 !text-[10.5px]'}>⚡ repassar</button>
                  )}
                  {m.repassadoEm && <span className="block text-[10px] text-text-secondary">em {fmtData(m.repassadoEm)}</span>}
                </td>
                <td className={td}>
                  <button onClick={() => copiarDescricao(m)} title="descrição que vai no PIX do repasse" className={btnGhost + ' !px-2 !py-1 !text-[10.5px]'}>PIX ⧉</button>
                  {m.simulado && <span className="block mt-1"><SeloSimulacao /></span>}
                </td>
              </tr>
            );
          })}
        </Tabela>
      </div>
    </div>
  );
}
