'use client';

/**
 * LOCAÇÃO · A CARTEIRA — os alugados que estão só rodando.
 *
 * Por que existe: com 40 contratos ativos, mostrar cada um como cartão de
 * 190px (com régua de 8 paradas e seis botões) dava 13 telas de rolagem —
 * e 36 desses cartões não pediam nada de ninguém. Contrato que corre bem
 * não é tarefa, é LINHA DE TABELA.
 *
 * Aqui eles viram uma tabela densa com o que o gestor consulta de fato:
 * quem é, quando vence, se o mês está pago, quanto entra e quanto sai. E as
 * AÇÕES EM MASSA que a rotina exige — no dia 7, confirmar vinte repasses um
 * a um é trabalho que o sistema tem que fazer sozinho.
 *
 * Clicar na linha abre os mesmos painéis da fila (ficha, contrato, extrato,
 * portais) — nada se perde por estar compacto.
 */
import React, { useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  alertasDoContrato, hojeYmd, fmtData, fmtValor, linkWhats,
  type ContratoLocacao, type ImovelLocacao, type MovimentoLocacao,
} from '@/lib/locacao';
import { btnOuro, btnGhost, btnSimula } from './ui';

export type PainelCarteira = 'ficha' | 'contrato' | 'minuta' | 'extrato' | 'portalDono' | 'portalInquilino';

interface Linha {
  contrato: ContratoLocacao;
  imovel?: ImovelLocacao;
  movs: MovimentoLocacao[];
  /** a competência do mês corrente */
  doMes?: MovimentoLocacao;
  atrasadas: number;
  liberados: MovimentoLocacao[];
  alertas: string[];
}

export default function Carteira({ isEspelhoDemo, contratos, imoveis, movimentos, recarregar, abertoEm, onAbrir, renderPainel }: {
  isEspelhoDemo?: boolean;
  contratos: ContratoLocacao[];
  imoveis: ImovelLocacao[];
  movimentos: MovimentoLocacao[];
  recarregar: () => Promise<void>;
  /** {id, painel} do contrato com painel aberto — o pai renderiza o conteúdo */
  abertoEm: { id: string; painel: PainelCarteira } | null;
  onAbrir: (id: string, painel: PainelCarteira) => void;
  /** o pai desenha o painel aberto — assim a tabela não conhece os detalhes */
  renderPainel: (contratoId: string) => React.ReactNode;
}) {
  const [filtro, setFiltro] = useState<'todos' | 'atrasados' | 'aberto' | 'repassar'>('todos');
  const [ocupado, setOcupado] = useState(false);
  const hoje = hojeYmd();
  const mesAtual = hoje.slice(0, 7);

  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  const linhas = useMemo<Linha[]>(() => {
    return contratos
      .filter((c) => c.status === 'ativo')
      .map((c) => {
        const movs = movimentos.filter((m) => m.contratoId === c.id);
        return {
          contrato: c,
          imovel: imoveis.find((i) => i.id === c.imovelId),
          movs,
          doMes: movs.find((m) => m.competencia === mesAtual),
          atrasadas: movs.filter((m) => m.statusCobranca !== 'paga' && m.vencimento < hoje).length,
          liberados: movs.filter((m) => m.statusRepasse === 'liberado'),
          alertas: alertasDoContrato(c).map((a) => (a.grave ? '🚨 ' : '⚠ ') + a.texto),
        };
      })
      // o que dói primeiro: atrasado, depois repasse esperando, depois alerta
      .sort((a, b) => (b.atrasadas - a.atrasadas)
        || (b.liberados.length - a.liberados.length)
        || (b.alertas.length - a.alertas.length)
        || (a.contrato.locatarioNome || '').localeCompare(b.contrato.locatarioNome || ''));
  }, [contratos, imoveis, movimentos, hoje, mesAtual]);

  const visiveis = useMemo(() => linhas.filter((l) => {
    if (filtro === 'atrasados') return l.atrasadas > 0;
    if (filtro === 'aberto') return l.doMes && l.doMes.statusCobranca !== 'paga';
    if (filtro === 'repassar') return l.liberados.length > 0;
    return true;
  }), [linhas, filtro]);

  const totalRepassar = linhas.reduce((s, l) => s + l.liberados.reduce((x, m) => x + m.repasseDono, 0), 0);
  const qtdRepassar = linhas.reduce((s, l) => s + l.liberados.length, 0);
  const vencendoSemana = linhas.filter((l) => {
    const m = l.doMes;
    if (!m || m.statusCobranca === 'paga') return false;
    const d = (new Date(m.vencimento + 'T12:00:00').getTime() - Date.now()) / 864e5;
    return d >= 0 && d <= 7;
  }).length;

  // ——— ações em massa: a rotina do mês em um clique ———

  const repassarTodos = async () => {
    if (guarda() || !qtdRepassar) return;
    const ok = await confirmDialog({
      title: `Repassar ${qtdRepassar} pagamento${qtdRepassar > 1 ? 's' : ''}?`,
      message: `${fmtValor(totalRepassar)} vão para os donos, cada um num PIX com o extrato discriminado. Com o Asaas ligado, isto vira transferência agendada de verdade.`,
      confirmLabel: 'Repassar todos',
    });
    if (!ok) return;
    setOcupado(true);
    for (const l of linhas) {
      for (const m of l.liberados) {
        await updateDoc(doc(db, 'locacaoMovimentos', m.id), { statusRepasse: 'repassado', repassadoEm: hoje, simulado: true });
      }
    }
    showToast(`⚡ ${fmtValor(totalRepassar)} repassados em ${qtdRepassar} PIX. NFs da taxa emitidas.`, 'success');
    setOcupado(false);
    recarregar();
  };

  const marcarPagos = async () => {
    if (guarda()) return;
    const alvos = linhas.map((l) => l.doMes).filter((m): m is MovimentoLocacao => !!m && m.statusCobranca !== 'paga');
    if (!alvos.length) { showToast('Nenhuma cobrança do mês em aberto.', 'info'); return; }
    const ok = await confirmDialog({
      title: `Marcar ${alvos.length} cobrança${alvos.length > 1 ? 's' : ''} como paga?`,
      message: 'Simula o que o Asaas fará sozinho pelo aviso de pagamento. Serve pra testar o mês inteiro de uma vez.',
      confirmLabel: 'Marcar pagas',
    });
    if (!ok) return;
    setOcupado(true);
    for (const m of alvos) {
      await updateDoc(doc(db, 'locacaoMovimentos', m.id), { statusCobranca: 'paga', pagoEm: hoje, statusRepasse: 'liberado', simulado: true });
    }
    showToast(`⚡ ${alvos.length} pagamentos confirmados. Os repasses estão liberados.`, 'success');
    setOcupado(false);
    recarregar();
  };

  const pagarUma = async (l: Linha) => {
    if (guarda()) return;
    const m = [...l.movs].filter((x) => x.statusCobranca !== 'paga').sort((a, b) => a.competencia.localeCompare(b.competencia))[0];
    if (!m) { showToast('Tudo pago.', 'info'); return; }
    await updateDoc(doc(db, 'locacaoMovimentos', m.id), { statusCobranca: 'paga', pagoEm: hoje, statusRepasse: 'liberado', simulado: true });
    showToast(`⚡ ${m.competencia.split('-').reverse().join('/')} paga. Repasse de ${fmtValor(m.repasseDono)} liberado.`, 'success');
    recarregar();
  };

  const repassarUma = async (l: Linha) => {
    if (guarda() || !l.liberados.length) return;
    for (const m of l.liberados) {
      await updateDoc(doc(db, 'locacaoMovimentos', m.id), { statusRepasse: 'repassado', repassadoEm: hoje, simulado: true });
    }
    showToast(`⚡ ${fmtValor(l.liberados.reduce((s, m) => s + m.repasseDono, 0))} repassado.`, 'success');
    recarregar();
  };

  if (!linhas.length) return null;

  const th = 'text-left font-extrabold uppercase tracking-[0.08em] text-[9.5px] text-text-secondary border-b border-white/15 px-2 py-1.5 whitespace-nowrap';
  const td = 'px-2 py-2 border-b border-white/[0.06] align-middle';

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-secondary">
          A carteira · {linhas.length} alugado{linhas.length > 1 ? 's' : ''} rodando
        </h2>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {([
            ['todos', `todos (${linhas.length})`],
            ['aberto', `a receber (${linhas.filter((l) => l.doMes && l.doMes.statusCobranca !== 'paga').length})`],
            ['atrasados', `atrasados (${linhas.filter((l) => l.atrasadas > 0).length})`],
            ['repassar', `a repassar (${qtdRepassar})`],
          ] as const).map(([k, r]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                filtro === k ? 'bg-[#E8C547]/15 text-[#FFE9A6] border border-[#E8C547]/40' : 'text-text-secondary hover:text-white bg-white/[0.04] border border-white/10'
              }`}>{r}</button>
          ))}
        </div>
      </div>

      {/* a rotina do mês, em um clique */}
      {(qtdRepassar > 0 || vencendoSemana > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
          {qtdRepassar > 0 && (
            <>
              <span className="text-[12px] text-white/85">
                <b className="text-amber-300">{fmtValor(totalRepassar)}</b> esperando repasse em {qtdRepassar} contrato{qtdRepassar > 1 ? 's' : ''}
              </span>
              <button onClick={repassarTodos} disabled={ocupado} className={btnOuro}>
                💸 Repassar todos
              </button>
            </>
          )}
          {vencendoSemana > 0 && (
            <span className="text-[11.5px] text-text-secondary">{vencendoSemana} vencem nos próximos 7 dias</span>
          )}
          <button onClick={marcarPagos} disabled={ocupado} className={btnSimula + ' ml-auto'}>
            ⚡ Simular o mês pago
          </button>
        </div>
      )}

      <div className="al-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px] border-collapse min-w-[720px]">
            <thead><tr>
              <th className={th}>Imóvel</th>
              <th className={th}>Inquilino</th>
              <th className={th}>Vence</th>
              <th className={th}>Este mês</th>
              <th className={th}>Aluguel</th>
              <th className={th}>Repasse</th>
              <th className={th}></th>
            </tr></thead>
            <tbody>
              {visiveis.map((l) => {
                const c = l.contrato;
                const pago = l.doMes?.statusCobranca === 'paga';
                const venceu = l.doMes && !pago && l.doMes.vencimento < hoje;
                const abertoAqui = abertoEm?.id === c.id;
                const zapInq = linkWhats(c.locatarioTelefone, `Olá ${(c.locatarioNome || '').split(' ')[0]}! Aqui é da Nox Imóveis, sobre o seu aluguel.`);
                return (
                  <React.Fragment key={c.id}>
                    <tr className={abertoAqui ? 'bg-white/[0.03]' : ''}>
                      <td className={td}>
                        <button onClick={() => onAbrir(c.id, 'contrato')} className="text-left hover:text-white">
                          <span className="text-white font-bold">{l.imovel?.codigo || '—'}</span>
                          <span className="block text-[10.5px] text-text-secondary">{l.imovel?.bairro || l.imovel?.titulo?.slice(0, 24) || ''}</span>
                        </button>
                      </td>
                      <td className={td + ' text-white/85'}>
                        {c.locatarioNome}
                        {l.alertas.length > 0 && (
                          <span className="block text-[10px] text-amber-300">{l.alertas[0].slice(0, 46)}…</span>
                        )}
                      </td>
                      <td className={td + ' text-text-secondary tabular-nums whitespace-nowrap'}>dia {c.diaVencimento}</td>
                      <td className={td + ' whitespace-nowrap'}>
                        {pago ? <span className="text-emerald-300 font-bold">✓ pago</span>
                          : venceu ? <span className="text-rose-300 font-bold">🚨 atrasado</span>
                            : <span className="text-text-secondary">aberto</span>}
                      </td>
                      <td className={td + ' text-white tabular-nums whitespace-nowrap'}>{fmtValor(c.valorAluguel)}</td>
                      <td className={td + ' tabular-nums whitespace-nowrap'}>
                        {l.liberados.length
                          ? <span className="text-amber-300 font-bold">{fmtValor(l.liberados.reduce((s, m) => s + m.repasseDono, 0))} ⏳</span>
                          : <span className="text-text-secondary">—</span>}
                      </td>
                      <td className={td}>
                        <span className="flex items-center gap-1 justify-end">
                          {l.liberados.length > 0 && <button onClick={() => repassarUma(l)} className={btnOuro + ' !px-2 !py-1 !text-[10.5px]'}>💸</button>}
                          {!pago && <button onClick={() => pagarUma(l)} className={btnSimula + ' !px-2 !py-1 !text-[10.5px]'}>⚡</button>}
                          {zapInq && <a href={zapInq} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-lg text-[10.5px] border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">💬</a>}
                          <button onClick={() => onAbrir(c.id, 'extrato')} className={btnGhost + ' !px-2 !py-1 !text-[10.5px]'}>⋯</button>
                        </span>
                      </td>
                    </tr>
                    {abertoAqui && (
                      <tr><td colSpan={7} className="border-b border-white/[0.06] bg-white/[0.02] p-0">
                        <div className="p-4">{renderPainel(c.id)}</div>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[10.5px] text-text-secondary mt-1.5">
        Cobrança = aluguel + IPTU + seguro (condomínio o inquilino paga direto). Repasse = aluguel − taxa + IPTU, num PIX só.
        Clique no código do imóvel pra abrir o contrato, ou em <b className="text-white/70">⋯</b> pro extrato.
      </p>
    </section>
  );
}
