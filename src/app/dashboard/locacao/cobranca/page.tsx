'use client';

/**
 * 💰 A COBRANÇA — a bancada do dinheiro, a parte mais séria da gestão.
 *
 * Antes isso vivia espalhado em cartõezinhos e gavetas dentro do funil. O
 * gestor pediu um lugar só, organizado na ordem em que se trabalha de manhã:
 *
 *   1 · ATRASADAS      quem não pagou — cobrar no WhatsApp, acionar a Loft.
 *   2 · A REPASSAR     dinheiro recebido esperando ir pro dono, agrupado
 *                      por proprietário: cada grupo é UM PIX.
 *   3 · VENCENDO       o que vence neste mês e ainda não venceu.
 *   4 · FEITAS         o que já foi pago e repassado no mês — conferência.
 *
 * Cada linha diz de quem é, de qual imóvel, de que mês e quanto. Quando o
 * Asaas conectar, os ⚡ somem: o webhook marca pago e o repasse vira um
 * clique de aprovação.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  hojeYmd, fmtData, fmtValor, cents, linkWhats, diasAte,
  type Movimento,
} from '@/lib/locacao';
import { useDadosLocacao } from '../dados';
import { btnOuro, btnGhost, btnSimula, AbasDaArea } from '../ui';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const compCurta = (c: string) => {
  const [ano, mes] = c.split('-');
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`;
};

export default function PaginaCobranca() {
  const {
    imobiliariaId, isEspelhoDemo, imoveis, locacoes, movimentos,
    carregando, recarregar, abas,
  } = useDadosLocacao();

  const [verFeitas, setVerFeitas] = useState(false);
  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  const hoje = hojeYmd();
  const mesAtual = hoje.slice(0, 7);

  /** Tudo que a linha precisa dizer: quem, onde, quanto. */
  const contexto = useMemo(() => {
    const porLocacao = new Map(locacoes.map((l) => [l.id, l]));
    const porImovel = new Map(imoveis.map((i) => [i.id, i]));
    return (m: Movimento) => {
      const l = porLocacao.get(m.locacaoId);
      const im = l ? porImovel.get(l.imovelId) : undefined;
      return { l, im };
    };
  }, [locacoes, imoveis]);

  // ——— as quatro pilhas, na ordem do trabalho ———

  const pilhas = useMemo(() => {
    const abertas = movimentos.filter((m) => m.statusCobranca !== 'paga');
    return {
      atrasadas: abertas.filter((m) => m.vencimento < hoje)
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
      aRepassar: movimentos.filter((m) => m.statusRepasse === 'liberado')
        .sort((a, b) => a.competencia.localeCompare(b.competencia)),
      vencendo: abertas.filter((m) => m.vencimento >= hoje && m.competencia === mesAtual)
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
      feitas: movimentos.filter((m) => m.statusCobranca === 'paga' && m.competencia === mesAtual)
        .sort((a, b) => (b.pagoEm || '').localeCompare(a.pagoEm || '')),
    };
  }, [movimentos, hoje, mesAtual]);

  const totais = useMemo(() => ({
    recebido: cents(pilhas.feitas.reduce((s, m) => s + m.valorTotal, 0)),
    aReceber: cents(pilhas.vencendo.reduce((s, m) => s + m.valorTotal, 0)),
    emAtraso: cents(pilhas.atrasadas.reduce((s, m) => s + m.valorTotal, 0)),
    aRepassar: cents(pilhas.aRepassar.reduce((s, m) => s + m.repasseDono, 0)),
  }), [pilhas]);

  /** Os repasses agrupados por PROPRIETÁRIO — cada grupo é um PIX só. */
  const repassesPorDono = useMemo(() => {
    const grupos = new Map<string, { dono: string; pix: string; movs: Movimento[]; total: number }>();
    for (const m of pilhas.aRepassar) {
      const { im } = contexto(m);
      const chave = im?.id || 'sem-imovel';
      const g = grupos.get(chave) || { dono: im?.donoNome || '(sem proprietário)', pix: im?.donoPix || '', movs: [], total: 0 };
      g.movs.push(m);
      g.total = cents(g.total + m.repasseDono);
      grupos.set(chave, g);
    }
    return Array.from(grupos.values()).sort((a, b) => b.total - a.total);
  }, [pilhas.aRepassar, contexto]);

  // ——— as ações ———

  const marcarPaga = async (m: Movimento) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoMovimentos', m.id), {
      statusCobranca: 'paga', pagoEm: hojeYmd(), statusRepasse: 'liberado', simulado: true,
    });
    showToast(`⚡ ${compCurta(m.competencia)} paga — ${fmtValor(m.repasseDono)} liberados pro repasse.`, 'success');
    recarregar();
  };

  /** Repasse em LOTE atômico: ou marca tudo, ou não marca nada. */
  const repassarGrupo = async (movs: Movimento[], dono: string, total: number) => {
    if (guarda()) return;
    const ok = await confirmDialog({
      title: `Repassar ${fmtValor(total)} para ${dono}?`,
      message: `${movs.length} competência${movs.length > 1 ? 's' : ''} num PIX só, com o extrato discriminado. Confirme DEPOIS que o PIX sair de verdade.`,
      confirmLabel: 'Já repassei',
    });
    if (!ok) return;
    try {
      const b = writeBatch(db);
      const d = hojeYmd();
      for (const m of movs) b.update(doc(db, 'locacaoMovimentos', m.id), { statusRepasse: 'repassado', repassadoEm: d, simulado: true });
      await b.commit();
      showToast(`⚡ ${fmtValor(total)} repassados para ${dono}.`, 'success');
      recarregar();
    } catch (e) {
      console.error(e);
      showToast('Falha — NADA foi marcado. Tente de novo.', 'error');
    }
  };

  const repassarTodos = async () => {
    if (guarda() || !repassesPorDono.length) return;
    const ok = await confirmDialog({
      title: `Repassar tudo? ${fmtValor(totais.aRepassar)}`,
      message: repassesPorDono.map((g) => `${g.dono}: ${fmtValor(g.total)}`).join('\n')
        + '\n\nUm PIX por proprietário. Confirme depois que TODOS saírem.',
      confirmLabel: 'Já repassei todos',
    });
    if (!ok) return;
    try {
      const b = writeBatch(db);
      const d = hojeYmd();
      for (const m of pilhas.aRepassar) b.update(doc(db, 'locacaoMovimentos', m.id), { statusRepasse: 'repassado', repassadoEm: d, simulado: true });
      await b.commit();
      showToast(`⚡ ${fmtValor(totais.aRepassar)} repassados em ${repassesPorDono.length} PIX.`, 'success');
      recarregar();
    } catch (e) {
      console.error(e);
      showToast('Falha — NADA foi marcado. Tente de novo.', 'error');
    }
  };

  // ——— a linha padrão de uma competência ———

  const Linha = ({ m, direita }: { m: Movimento; direita: React.ReactNode }) => {
    const { l, im } = contexto(m);
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5 border-b border-white/[0.05] last:border-0">
        <span className="al-display text-[12px] font-bold uppercase text-white/60 w-[52px] shrink-0 tabular-nums">{compCurta(m.competencia)}</span>
        <div className="min-w-0 flex-1 basis-[200px]">
          <p className="text-[12.5px] font-bold text-white truncate">{l?.nome || 'inquilino'}</p>
          <p className="text-[11px] text-text-secondary truncate">{im ? `${im.codigo} · ${im.titulo}` : ''}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[13px] font-extrabold text-white tabular-nums">{fmtValor(m.valorTotal)}</p>
          <p className="text-[10.5px] text-text-secondary tabular-nums">vence {fmtData(m.vencimento)}</p>
        </div>
        <div className="shrink-0 flex flex-wrap gap-1.5">{direita}</div>
      </div>
    );
  };

  const Secao = ({ titulo, cor, children, vazio }: { titulo: React.ReactNode; cor: string; children: React.ReactNode; vazio?: string }) => (
    <div className="al-card overflow-hidden">
      <p className={`px-3.5 pt-3 pb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] ${cor}`}>{titulo}</p>
      {children}
      {vazio && <p className="px-3.5 pb-3 text-[12px] text-text-secondary">{vazio}</p>}
    </div>
  );

  if (carregando) {
    return <div className="min-h-screen py-8 px-4"><div className="max-w-5xl mx-auto al-card p-8 text-center text-sm text-text-secondary">Carregando…</div></div>;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-4">

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="gx-tag mb-2 inline-flex"><span>Setor de Locação</span></span>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Cobrança</h1>
            <p className="text-text-secondary text-[12.5px] mt-1 max-w-[62ch]">
              Na ordem do trabalho: cobrar quem atrasou, repassar o que entrou, acompanhar o
              que vence. Os <b className="text-amber-300">⚡</b> fazem o papel do Asaas até a integração ligar.
            </p>
          </div>
        </div>

        <AbasDaArea ativa="cobranca" crm={abas.crm} imoveis={abas.imoveis} locacoes={abas.locacoes} mensagens={abas.mensagens} cobranca={abas.cobranca} />

        {/* o placar do mês */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            [fmtValor(totais.recebido), `recebido no mês (${pilhas.feitas.length})`, 'text-emerald-300'],
            [fmtValor(totais.aReceber), `vence este mês (${pilhas.vencendo.length})`, 'text-white'],
            [fmtValor(totais.emAtraso), pilhas.atrasadas.length ? `EM ATRASO (${pilhas.atrasadas.length})` : 'em atraso', pilhas.atrasadas.length ? 'text-rose-300' : 'text-text-secondary'],
            [fmtValor(totais.aRepassar), `a repassar (${repassesPorDono.length} dono${repassesPorDono.length === 1 ? '' : 's'})`, totais.aRepassar ? 'text-amber-300' : 'text-text-secondary'],
          ] as const).map(([v, r, cor]) => (
            <div key={r} className="al-card px-3 py-2.5">
              <p className={`text-[17px] font-extrabold tabular-nums leading-none ${cor}`}>{v}</p>
              <p className="text-[10.5px] text-text-secondary mt-1">{r}</p>
            </div>
          ))}
        </div>

        {/* 1 · ATRASADAS — a primeira coisa da manhã */}
        {pilhas.atrasadas.length > 0 && (
          <Secao titulo={<>🚨 Atrasadas — cobrar primeiro</>} cor="text-rose-300">
            {pilhas.atrasadas.map((m) => {
              const { l } = contexto(m);
              const dias = -(diasAte(m.vencimento) ?? 0);
              const zap = l ? linkWhats(l.telefone, `Olá ${(l.nome || '').split(' ')[0]}! O aluguel de ${compCurta(m.competencia)} venceu dia ${fmtData(m.vencimento)} — consegue regularizar? Qualquer coisa estamos à disposição.`) : '';
              return (
                <Linha key={m.id} m={m} direita={
                  <>
                    <span className="self-center text-[10.5px] font-extrabold text-rose-300 mr-1">há {dias} dia{dias === 1 ? '' : 's'}</span>
                    {zap && <a href={zap} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">💬 cobrar</a>}
                    <button onClick={() => marcarPaga(m)} className={btnSimula + ' !py-1.5 !text-[11px]'}>⚡ Pagou</button>
                  </>
                } />
              );
            })}
            <p className="px-3.5 py-2.5 text-[11px] text-text-secondary border-t border-white/[0.06]">
              A Loft cobre o aluguel garantido — passando de 15 dias, acione a fiança além da régua de cobrança.
            </p>
          </Secao>
        )}

        {/* 2 · A REPASSAR — um PIX por dono */}
        {repassesPorDono.length > 0 && (
          <Secao titulo={<>💸 A repassar — um PIX por proprietário</>} cor="text-amber-300">
            {repassesPorDono.map((g) => (
              <div key={g.dono + g.pix} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5 border-b border-white/[0.05] last:border-0">
                <div className="min-w-0 flex-1 basis-[220px]">
                  <p className="text-[12.5px] font-bold text-white">{g.dono}</p>
                  <p className="text-[11px] text-text-secondary truncate">
                    {g.movs.map((m) => compCurta(m.competencia)).join(' + ')}
                    {g.pix ? ` · PIX ${g.pix}` : ' · ⚠ sem chave PIX cadastrada'}
                  </p>
                </div>
                <p className="text-[14px] font-extrabold text-amber-300 tabular-nums shrink-0">{fmtValor(g.total)}</p>
                <button onClick={() => repassarGrupo(g.movs, g.dono, g.total)} className={btnOuro + ' !py-1.5 shrink-0'}>💸 Repassar</button>
              </div>
            ))}
            {repassesPorDono.length > 1 && (
              <div className="px-3.5 py-2.5 border-t border-white/[0.06]">
                <button onClick={repassarTodos} className={btnOuro + ' w-full !py-2'}>
                  💸 Repassar todos — {fmtValor(totais.aRepassar)} em {repassesPorDono.length} PIX
                </button>
              </div>
            )}
          </Secao>
        )}

        {/* 3 · VENCENDO ESTE MÊS */}
        <Secao titulo={<>📅 Vencendo este mês</>} cor="text-white/70"
          vazio={pilhas.vencendo.length ? undefined : 'Nada mais vence este mês.'}>
          {pilhas.vencendo.map((m) => (
            <Linha key={m.id} m={m} direita={
              <button onClick={() => marcarPaga(m)} className={btnSimula + ' !py-1.5 !text-[11px]'}>⚡ Pagou</button>
            } />
          ))}
        </Secao>

        {/* 4 · FEITAS — conferência do mês */}
        <Secao
          titulo={
            <button onClick={() => setVerFeitas((v) => !v)} className="flex items-center gap-2">
              <span>✓ Recebidas no mês ({pilhas.feitas.length})</span>
              <span className="text-white/40">{verFeitas ? '▴' : '▾'}</span>
            </button>
          }
          cor="text-emerald-300"
          vazio={!verFeitas || pilhas.feitas.length ? undefined : 'Nenhum pagamento no mês ainda.'}>
          {verFeitas && pilhas.feitas.map((m) => {
            const { l, im } = contexto(m);
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2 border-b border-white/[0.05] last:border-0">
                <span className="al-display text-[12px] font-bold uppercase text-white/60 w-[52px] shrink-0 tabular-nums">{compCurta(m.competencia)}</span>
                <p className="text-[12px] text-white/85 min-w-0 flex-1 truncate">{l?.nome} <span className="text-text-secondary">· {im?.codigo}</span></p>
                <span className="text-[11px] text-emerald-300 tabular-nums shrink-0">pago {fmtData(m.pagoEm)}</span>
                <span className="text-[12px] font-bold text-white tabular-nums shrink-0">{fmtValor(m.valorTotal)}</span>
                <span className={`text-[11px] tabular-nums shrink-0 ${m.statusRepasse === 'repassado' ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {m.statusRepasse === 'repassado' ? `↗ repassado ${fmtData(m.repassadoEm)}` : '↗ aguardando repasse'}
                </span>
              </div>
            );
          })}
        </Secao>

        {movimentos.length === 0 && (
          <div className="al-card p-10 text-center">
            <p className="text-[32px] mb-2">💰</p>
            <p className="text-[14px] font-bold text-white">Nenhuma cobrança ainda.</p>
            <p className="text-[12.5px] text-text-secondary mt-1 max-w-[48ch] mx-auto">
              As cobranças nascem na entrega das chaves, lá no{' '}
              <Link href="/dashboard/locacao/locacoes" className="text-[#FFE9A6] font-bold">funil das locações</Link>.
              Ou clique em 🧪 exemplos em qualquer funil pra ver esta tela cheia.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
