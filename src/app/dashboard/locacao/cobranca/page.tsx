'use client';

/**
 * 💰 A COBRANÇA — a bancada do dinheiro, a parte mais séria da gestão.
 *
 * A tela tem duas lentes, porque são duas perguntas diferentes:
 *
 *   POR PESSOA   "como está o Fulano?" — uma linha por inquilino ativo, com
 *                a situação dele, o que deve e o que já pagou. É a lente do
 *                atendimento: alguém liga e você acha na hora.
 *   POR MÊS      "o que tenho pra fazer hoje?" — as competências separadas
 *                em atrasadas, a repassar, vencendo e pagas. É a lente da
 *                rotina, e o mês é escolhido (não fica preso no atual).
 *
 * Tudo com busca por nome e filtros. Antes a tela abria travada no mês
 * corrente: com o contrato começando meses atrás, quase tudo ficava fora e
 * ela parecia vazia.
 *
 * Quando o Asaas conectar, os ⚡ somem: o webhook marca pago e o repasse
 * vira um clique de aprovação.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  hojeYmd, fmtData, fmtValor, cents, linkWhats, diasAte, avisoGarantia,
  type Movimento, type Locacao, type ImovelLocacao,
} from '@/lib/locacao';
import { useDadosLocacao } from '../dados';
import { inputCls, btnOuro, btnGhost, btnSimula, AbasDaArea } from '../ui';
import Demonstrativo from './demonstrativo';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const compCurta = (c: string) => { const [a, m] = c.split('-'); return `${MESES[Number(m) - 1]}/${a.slice(2)}`; };
const compLonga = (c: string) => { const [a, m] = c.split('-'); return `${MESES_LONGO[Number(m) - 1]} de ${a}`; };

type Lente = 'pessoas' | 'mes';
type Pilha = 'atrasadas' | 'repassar' | 'vencendo' | 'pagas';

export default function PaginaCobranca() {
  const {
    isEspelhoDemo, imoveis, locacoes, movimentos, carregando, recarregar, abas,
  } = useDadosLocacao();

  const hoje = hojeYmd();
  const [lente, setLente] = useState<Lente>('pessoas');
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [busca, setBusca] = useState('');
  const [pilhaSel, setPilhaSel] = useState<Pilha | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  /** qual proprietário está com o demonstrativo aberto pra imprimir/enviar */
  const [demonstrativo, setDemonstrativo] = useState<{ movs: Movimento[]; dono: string; pix: string; imovelId: string; locacaoId: string } | null>(null);

  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  /** Quem é quem: toda linha de dinheiro precisa dizer o nome. */
  const ctx = useMemo(() => {
    const porLoc = new Map(locacoes.map((l) => [l.id, l]));
    const porImo = new Map(imoveis.map((i) => [i.id, i]));
    return (m: Movimento): { l?: Locacao; im?: ImovelLocacao } => {
      const l = porLoc.get(m.locacaoId);
      return { l, im: l ? porImo.get(l.imovelId) : undefined };
    };
  }, [locacoes, imoveis]);

  const casaBusca = (m: Movimento) => {
    const b = busca.trim().toLowerCase();
    if (!b) return true;
    const { l, im } = ctx(m);
    const bDig = busca.replace(/\D/g, '');
    return (l?.nome || '').toLowerCase().includes(b)
      || (im ? `${im.codigo} ${im.titulo} ${im.donoNome}`.toLowerCase().includes(b) : false)
      || (bDig.length >= 3 && (l?.telefone || '').replace(/\D/g, '').includes(bDig));
  };

  // ═══════════ a lente POR PESSOA ═══════════

  const pessoas = useMemo(() => {
    const ativos = locacoes.filter((l) => l.etapa === 'ativa' || l.etapa === 'encerrando');
    return ativos.map((l) => {
      const meus = movimentos.filter((m) => m.locacaoId === l.id);
      const atrasadas = meus.filter((m) => m.statusCobranca !== 'paga' && m.vencimento < hoje);
      const aberta = meus.filter((m) => m.statusCobranca !== 'paga')
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
      const pagas = meus.filter((m) => m.statusCobranca === 'paga');
      const aRepassar = meus.filter((m) => m.statusRepasse === 'liberado');
      return {
        l, im: imoveis.find((x) => x.id === l.imovelId), meus,
        atrasadas, aberta, pagas, aRepassar,
        devendo: cents(atrasadas.reduce((s, m) => s + m.valorTotal, 0)),
        jaPago: cents(pagas.reduce((s, m) => s + m.valorTotal, 0)),
        repasseAberto: cents(aRepassar.reduce((s, m) => s + m.repasseDono, 0)),
      };
    })
      .filter((p) => {
        const b = busca.trim().toLowerCase();
        if (!b) return true;
        const bDig = busca.replace(/\D/g, '');
        return p.l.nome.toLowerCase().includes(b)
          || (p.im ? `${p.im.codigo} ${p.im.titulo} ${p.im.donoNome}`.toLowerCase().includes(b) : false)
          || (bDig.length >= 3 && (p.l.telefone || '').replace(/\D/g, '').includes(bDig));
      })
      .filter((p) => {
        if (!pilhaSel) return true;
        if (pilhaSel === 'atrasadas') return p.atrasadas.length > 0;
        if (pilhaSel === 'repassar') return p.aRepassar.length > 0;
        if (pilhaSel === 'vencendo') return !!p.aberta && p.aberta.vencimento >= hoje;
        return p.pagas.length > 0;
      })
      .sort((a, b) => b.atrasadas.length - a.atrasadas.length
        || b.aRepassar.length - a.aRepassar.length
        || a.l.nome.localeCompare(b.l.nome));
  }, [locacoes, movimentos, imoveis, hoje, busca, pilhaSel]);

  // ═══════════ a lente POR MÊS ═══════════

  const doMes = useMemo(() => movimentos.filter((m) => m.competencia === mes && casaBusca(m)), [movimentos, mes, busca, ctx]);

  const pilhas = useMemo(() => ({
    // atrasadas ignoram o mês escolhido: dívida antiga não pode sumir de vista
    atrasadas: movimentos.filter((m) => m.statusCobranca !== 'paga' && m.vencimento < hoje && casaBusca(m))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    repassar: movimentos.filter((m) => m.statusRepasse === 'liberado' && casaBusca(m))
      .sort((a, b) => a.competencia.localeCompare(b.competencia)),
    vencendo: doMes.filter((m) => m.statusCobranca !== 'paga' && m.vencimento >= hoje)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    pagas: doMes.filter((m) => m.statusCobranca === 'paga')
      .sort((a, b) => (b.pagoEm || '').localeCompare(a.pagoEm || '')),
  }), [movimentos, doMes, hoje, busca, ctx]);

  /**
   * Um alerta por inquilino em atraso com garantia de seguradora, calculado
   * do vencimento MAIS ANTIGO em aberto — é ele que dispara o prazo.
   */
  const garantias = useMemo(() => {
    const porLoc = new Map<string, Movimento[]>();
    for (const m of pilhas.atrasadas) {
      const arr = porLoc.get(m.locacaoId) || [];
      arr.push(m);
      porLoc.set(m.locacaoId, arr);
    }
    return Array.from(porLoc.entries()).map(([locacaoId, movs]: [string, Movimento[]]) => {
      const l = locacoes.find((x) => x.id === locacaoId);
      if (!l) return null;
      const maisAntigo = movs.map((m) => m.vencimento).sort()[0];
      const a = avisoGarantia(l, maisAntigo);
      return a.vale ? { locacaoId, nome: l.nome, ...a } : null;
    }).filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [pilhas.atrasadas, locacoes]);

  const totais = useMemo(() => ({
    atraso: cents(pilhas.atrasadas.reduce((s, m) => s + m.valorTotal, 0)),
    repassar: cents(pilhas.repassar.reduce((s, m) => s + m.repasseDono, 0)),
    vencendo: cents(pilhas.vencendo.reduce((s, m) => s + m.valorTotal, 0)),
    pagas: cents(pilhas.pagas.reduce((s, m) => s + m.valorTotal, 0)),
  }), [pilhas]);

  /**
   * O FECHAMENTO DA CASA no mês escolhido — a pergunta que o dono da
   * imobiliária faz e que a tela não respondia: "quanto a Nox ganhou?".
   * Do que o inquilino paga, três destinos: o proprietário, a seguradora
   * (seguro incêndio) e a casa (a taxa). Só a taxa é receita.
   */
  const fechamento = useMemo(() => {
    const pagasDoMes = movimentos.filter((m) => m.competencia === mes && m.statusCobranca === 'paga');
    const previstasDoMes = movimentos.filter((m) => m.competencia === mes);
    return {
      recebido: cents(pagasDoMes.reduce((s, m) => s + m.valorTotal, 0)),
      taxa: cents(pagasDoMes.reduce((s, m) => s + m.taxaAdm, 0)),
      aoDono: cents(pagasDoMes.reduce((s, m) => s + m.repasseDono, 0)),
      seguro: cents(pagasDoMes.reduce((s, m) => s + m.valorSeguro, 0)),
      taxaPrevista: cents(previstasDoMes.reduce((s, m) => s + m.taxaAdm, 0)),
      contratos: previstasDoMes.length,
      pagos: pagasDoMes.length,
    };
  }, [movimentos, mes]);

  /** Repasses agrupados por PROPRIETÁRIO — cada grupo é um PIX só. */
  const porDono = useMemo(() => {
    const g = new Map<string, { dono: string; pix: string; movs: Movimento[]; total: number; imovel: string }>();
    for (const m of pilhas.repassar) {
      const { im } = ctx(m);
      const k = im?.id || 'sem';
      const atual = g.get(k) || {
        dono: im?.donoNome || '(sem proprietário)', pix: im?.donoPix || '',
        imovel: im ? `${im.codigo} · ${im.titulo}` : '', movs: [], total: 0,
      };
      atual.movs.push(m);
      atual.total = cents(atual.total + m.repasseDono);
      g.set(k, atual);
    }
    return Array.from(g.values()).sort((a, b) => b.total - a.total);
  }, [pilhas.repassar, ctx]);

  /** Os meses que existem, pro seletor — sem inventar mês vazio. */
  const mesesDisponiveis = useMemo(() => {
    const s = new Set(movimentos.map((m) => m.competencia));
    s.add(hoje.slice(0, 7));
    return Array.from(s).sort().reverse();
  }, [movimentos, hoje]);

  // ——— ações ———

  const marcarPaga = async (m: Movimento) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoMovimentos', m.id), {
      statusCobranca: 'paga', pagoEm: hojeYmd(), statusRepasse: 'liberado', simulado: true,
    });
    showToast(`⚡ ${compCurta(m.competencia)} paga — ${fmtValor(m.repasseDono)} liberados pro repasse.`, 'success');
    recarregar();
  };

  const repassar = async (movs: Movimento[], dono: string, total: number) => {
    if (guarda()) return;
    const ok = await confirmDialog({
      title: `Repassar ${fmtValor(total)} para ${dono}?`,
      message: `${movs.length} competência${movs.length > 1 ? 's' : ''} num PIX só, com extrato discriminado. Confirme DEPOIS que o PIX sair de verdade.`,
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
    } catch (e) { console.error(e); showToast('Falha — NADA foi marcado.', 'error'); }
  };

  const repassarTodos = async () => {
    if (guarda() || !porDono.length) return;
    const ok = await confirmDialog({
      title: `Repassar tudo? ${fmtValor(totais.repassar)}`,
      message: porDono.map((g) => `${g.dono}: ${fmtValor(g.total)}`).join('\n') + '\n\nUm PIX por proprietário.',
      confirmLabel: 'Já repassei todos',
    });
    if (!ok) return;
    try {
      const b = writeBatch(db);
      const d = hojeYmd();
      for (const m of pilhas.repassar) b.update(doc(db, 'locacaoMovimentos', m.id), { statusRepasse: 'repassado', repassadoEm: d, simulado: true });
      await b.commit();
      showToast(`⚡ ${fmtValor(totais.repassar)} repassados em ${porDono.length} PIX.`, 'success');
      recarregar();
    } catch (e) { console.error(e); showToast('Falha — NADA foi marcado.', 'error'); }
  };

  // ——— peças ———

  /** Uma competência, sempre com NOME de quem é. */
  const Linha = ({ m, acao }: { m: Movimento; acao?: React.ReactNode }) => {
    const { l, im } = ctx(m);
    const atrasada = m.statusCobranca !== 'paga' && m.vencimento < hoje;
    const dias = atrasada ? -(diasAte(m.vencimento) ?? 0) : 0;
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5 border-b border-white/[0.05] last:border-0">
        <span className="al-display text-[11.5px] font-bold uppercase text-white/55 w-[50px] shrink-0 tabular-nums">{compCurta(m.competencia)}</span>
        <div className="min-w-0 flex-1 basis-[190px]">
          <p className="text-[13px] font-bold text-white truncate">{l?.nome || '(inquilino removido)'}</p>
          <p className="text-[11px] text-text-secondary truncate">
            {im ? `${im.codigo} · ${im.titulo}` : 'imóvel removido'}
            {im?.donoNome && <span className="text-white/30"> · dono: {im.donoNome}</span>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[13px] font-extrabold text-white tabular-nums">{fmtValor(m.valorTotal)}</p>
          <p className={`text-[10.5px] tabular-nums ${atrasada ? 'text-rose-300 font-bold' : 'text-text-secondary'}`}>
            {m.statusCobranca === 'paga' ? `pago ${fmtData(m.pagoEm)}` : atrasada ? `venceu há ${dias}d` : `vence ${fmtData(m.vencimento)}`}
          </p>
        </div>
        {acao && <div className="shrink-0 flex flex-wrap gap-1.5">{acao}</div>}
      </div>
    );
  };

  const Secao = ({ titulo, cor, children, vazio }: { titulo: React.ReactNode; cor: string; children?: React.ReactNode; vazio?: string }) => (
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

        <div>
          <span className="gx-tag mb-2 inline-flex"><span>Setor de Locação</span></span>
          <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Cobrança</h1>
          <p className="text-text-secondary text-[12.5px] mt-1 max-w-[64ch]">
            Duas lentes: <b className="text-white/85">por pessoa</b> pra quando alguém liga, e
            {' '}<b className="text-white/85">por mês</b> pra rotina do dia. Os
            {' '}<b className="text-amber-300">⚡</b> fazem o papel do Asaas até a integração ligar.
          </p>
        </div>

        <AbasDaArea ativa="cobranca" crm={abas.crm} imoveis={abas.imoveis} locacoes={abas.locacoes} mensagens={abas.mensagens} cobranca={abas.cobranca} />

        {/* o placar — cada número é um filtro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            ['atrasadas', totais.atraso, `em atraso (${pilhas.atrasadas.length})`, 'text-rose-300'],
            ['repassar', totais.repassar, `a repassar (${porDono.length} dono${porDono.length === 1 ? '' : 's'})`, 'text-amber-300'],
            ['vencendo', totais.vencendo, `a vencer (${pilhas.vencendo.length})`, 'text-white'],
            ['pagas', totais.pagas, `recebido (${pilhas.pagas.length})`, 'text-emerald-300'],
          ] as const).map(([k, v, rot, cor]) => (
            <button key={k} onClick={() => setPilhaSel(pilhaSel === k ? null : k)}
              className={`al-card px-3 py-2.5 text-left transition-all ${pilhaSel === k ? 'ring-1 ring-[#E8C547]/50' : 'hover:bg-white/[0.04]'}`}>
              <p className={`text-[17px] font-extrabold tabular-nums leading-none ${v ? cor : 'text-text-secondary'}`}>{fmtValor(v)}</p>
              <p className="text-[10.5px] text-text-secondary mt-1">{rot}</p>
            </button>
          ))}
        </div>

        {/* controles: lente, busca, mês */}
        <div className="al-card relative overflow-hidden p-3">
          <div className="absolute inset-x-0 top-0 gx-line-gold" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              {([['pessoas', '👤 Por pessoa'], ['mes', '📅 Por mês']] as const).map(([k, rot]) => (
                <button key={k} onClick={() => setLente(k)}
                  className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition-colors ${
                    lente === k ? 'bg-[#E8C547]/15 border-[#E8C547]/50 text-[#FFE9A6]' : 'border-white/10 bg-white/[0.04] text-text-secondary hover:text-white'}`}>
                  {rot}
                </button>
              ))}
            </div>
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por inquilino, proprietário ou imóvel…"
              className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40" />
            {lente === 'mes' && (
              <select className={inputCls + ' !w-auto'} value={mes} onChange={(e) => setMes(e.target.value)}>
                {mesesDisponiveis.map((c) => <option key={c} value={c}>{compLonga(c)}</option>)}
              </select>
            )}
            {(busca || pilhaSel) && (
              <button onClick={() => { setBusca(''); setPilhaSel(null); }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-rose-500/35 bg-rose-500/10 text-rose-300">× limpar</button>
            )}
          </div>
        </div>

        {/* o demonstrativo aberto ocupa a tela — é um documento */}
        {demonstrativo && (
          <Demonstrativo
            movs={demonstrativo.movs}
            dono={demonstrativo.dono}
            pix={demonstrativo.pix}
            imovel={imoveis.find((x) => x.id === demonstrativo.imovelId)}
            inquilino={locacoes.find((x) => x.id === demonstrativo.locacaoId)}
            onFechar={() => setDemonstrativo(null)}
          />
        )}

        {/* o fechamento da casa — só na lente por mês, que é a da rotina */}
        {lente === 'mes' && fechamento.contratos > 0 && (
          <div className="al-card p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-2.5">
              O mês da casa · {compLonga(mes)} — {fechamento.pagos} de {fechamento.contratos} pagos
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3">
              {([
                ['Entrou dos inquilinos', fechamento.recebido, 'text-white'],
                ['Foi pros proprietários', fechamento.aoDono, 'text-emerald-300'],
                ['Foi pra seguradora', fechamento.seguro, 'text-sky-300'],
                ['FICOU NA CASA (taxa)', fechamento.taxa, 'text-[#FFE9A6]'],
              ] as const).map(([rot, v, cor]) => (
                <div key={rot}>
                  <p className={`text-[17px] font-extrabold tabular-nums leading-none ${cor}`}>{fmtValor(v)}</p>
                  <p className="text-[10.5px] text-text-secondary mt-1">{rot}</p>
                </div>
              ))}
            </div>
            {fechamento.taxaPrevista > fechamento.taxa && (
              <p className="text-[11.5px] text-amber-300 mt-3 pt-2.5 border-t border-white/[0.06]">
                Faltam {fmtValor(cents(fechamento.taxaPrevista - fechamento.taxa))} de taxa a entrar neste mês —
                é o que está preso nas cobranças ainda não pagas.
              </p>
            )}
          </div>
        )}

        {/* ═══════════ LENTE: POR PESSOA ═══════════ */}
        {lente === 'pessoas' && (
          <>
            {pessoas.map((p) => {
              const aberto = abertoId === p.l.id;
              const zapCobrar = linkWhats(p.l.telefone,
                p.atrasadas.length
                  ? `Olá ${(p.l.nome || '').split(' ')[0]}! O aluguel de ${compCurta(p.atrasadas[0].competencia)} venceu em ${fmtData(p.atrasadas[0].vencimento)} — consegue regularizar? Qualquer coisa estamos à disposição.`
                  : `Olá ${(p.l.nome || '').split(' ')[0]}! Aqui é da Nox Imóveis.`);
              return (
                <div key={p.l.id} className={`al-card relative overflow-hidden ${p.atrasadas.length ? 'ring-1 ring-rose-500/30' : ''}`}>
                  {p.atrasadas.length > 0 && <div className="absolute inset-x-0 top-0 gx-line-gold" />}
                  <button onClick={() => setAbertoId(aberto ? null : p.l.id)}
                    className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="min-w-0 flex-1 basis-[220px]">
                        <p className="text-[14px] font-bold text-white">
                          {p.l.nome}
                          {p.atrasadas.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-rose-500/40 bg-rose-500/15 text-rose-300">
                              {p.atrasadas.length} em atraso
                            </span>
                          )}
                        </p>
                        <p className="text-[11.5px] text-text-secondary mt-0.5 truncate">
                          {p.im ? `${p.im.codigo} · ${p.im.titulo}` : 'imóvel removido'}
                          {p.im?.donoNome && ` · dono: ${p.im.donoNome}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {p.atrasadas.length > 0 ? (
                          <>
                            <p className="text-[15px] font-extrabold text-rose-300 tabular-nums leading-none">{fmtValor(p.devendo)}</p>
                            <p className="text-[10.5px] text-text-secondary mt-0.5">em aberto</p>
                          </>
                        ) : p.aberta ? (
                          <>
                            <p className="text-[15px] font-extrabold text-white tabular-nums leading-none">{fmtValor(p.aberta.valorTotal)}</p>
                            <p className="text-[10.5px] text-text-secondary mt-0.5">vence {fmtData(p.aberta.vencimento)}</p>
                          </>
                        ) : (
                          <p className="text-[12px] font-bold text-emerald-300">✓ tudo pago</p>
                        )}
                      </div>
                      <span className="text-[15px] text-text-secondary shrink-0">{aberto ? '▴' : '▾'}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11.5px] text-text-secondary">
                      <span>{p.pagas.length} pagas · <b className="text-white/80">{fmtValor(p.jaPago)}</b></span>
                      {p.repasseAberto > 0 && <span className="text-amber-300 font-bold">{fmtValor(p.repasseAberto)} a repassar ao dono</span>}
                      <span>{p.meus.length} competências no contrato</span>
                    </div>
                  </button>

                  {aberto && (
                    <div className="border-t border-white/[0.08] bg-white/[0.02]">
                      <div className="flex flex-wrap gap-2 p-3.5 border-b border-white/[0.06]">
                        {zapCobrar && (
                          <a href={zapCobrar} target="_blank" rel="noreferrer"
                            className="px-3 py-2 rounded-xl text-[11.5px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">
                            💬 {p.atrasadas.length ? 'cobrar no WhatsApp' : 'falar no WhatsApp'}
                          </a>
                        )}
                        {p.aberta && (
                          <button onClick={() => marcarPaga(p.aberta!)} className={btnSimula + ' !py-2 !text-[11.5px]'}>
                            ⚡ Registrar pagamento de {compCurta(p.aberta.competencia)}
                          </button>
                        )}
                        {p.pagas.length > 0 && p.im && (
                          <button onClick={() => setDemonstrativo({
                            movs: [...p.pagas].sort((a, b) => a.competencia.localeCompare(b.competencia)),
                            dono: p.im!.donoNome, pix: p.im!.donoPix, imovelId: p.im!.id, locacaoId: p.l.id,
                          })} className={btnGhost + ' !py-2 !text-[11.5px]'}>
                            📄 Demonstrativo pro proprietário
                          </button>
                        )}
                        {p.aRepassar.length > 0 && p.im && (
                          <button onClick={() => repassar(p.aRepassar, p.im!.donoNome, p.repasseAberto)} className={btnOuro + ' !py-2'}>
                            💸 Repassar {fmtValor(p.repasseAberto)} a {p.im.donoNome.split(' ')[0]}
                          </button>
                        )}
                      </div>
                      <div className="max-h-[320px] overflow-y-auto">
                        {[...p.meus].sort((a, b) => b.competencia.localeCompare(a.competencia)).map((m) => (
                          <Linha key={m.id} m={m}
                            acao={m.statusCobranca !== 'paga'
                              ? <button onClick={() => marcarPaga(m)} className={btnSimula + ' !py-1 !text-[10.5px]'}>⚡ pagou</button>
                              : <span className={`text-[10.5px] font-bold ${m.statusRepasse === 'repassado' ? 'text-emerald-300' : 'text-amber-300'}`}>
                                  {m.statusRepasse === 'repassado' ? `↗ repassado` : '↗ a repassar'}
                                </span>} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {pessoas.length === 0 && (
              <div className="al-card p-10 text-center">
                <p className="text-[32px] mb-2">💰</p>
                <p className="text-[14px] font-bold text-white">
                  {busca || pilhaSel ? 'Ninguém com esse filtro.' : 'Nenhum cliente ativo ainda.'}
                </p>
                <p className="text-[12.5px] text-text-secondary mt-1 max-w-[48ch] mx-auto">
                  As cobranças nascem na entrega das chaves, no{' '}
                  <Link href="/dashboard/locacao/locacoes" className="text-[#FFE9A6] font-bold">funil das locações</Link>.
                </p>
              </div>
            )}
          </>
        )}

        {/* ═══════════ LENTE: POR MÊS ═══════════ */}
        {lente === 'mes' && (
          <>
            {(!pilhaSel || pilhaSel === 'atrasadas') && pilhas.atrasadas.length > 0 && (
              <Secao titulo={<>🚨 Em atraso — de qualquer mês, cobrar primeiro</>} cor="text-rose-300">
                {/* O RELÓGIO DA GARANTIA. Um por inquilino: a seguradora só paga
                    se for avisada no prazo, e o atraso mais antigo é que conta. */}
                {garantias.map((g) => (
                  <div key={g.locacaoId}
                    className={`mx-3 mb-2 rounded-xl border px-3 py-2.5 ${g.tom === 'alerta'
                      ? 'border-rose-500/40 bg-rose-500/[0.1]' : 'border-amber-500/30 bg-amber-500/[0.07]'}`}>
                    <p className={`text-[12px] font-extrabold ${g.tom === 'alerta' ? 'text-rose-200' : 'text-amber-200'}`}>
                      {g.tom === 'alerta' ? '🚨' : '⏳'} {g.nome} — acionar a garantia
                    </p>
                    <p className="text-[11.5px] text-white/75 mt-0.5 max-w-[70ch]">{g.texto}</p>
                    <button onClick={() => showToast(`Aviso de sinistro enviado à seguradora (simulação) — ${g.nome}.`, 'success')}
                      className={btnSimula + ' !py-1.5 !text-[11px] mt-2'}>
                      ⚡ Avisar a seguradora
                    </button>
                  </div>
                ))}
                {pilhas.atrasadas.map((m) => {
                  const { l } = ctx(m);
                  const zap = l ? linkWhats(l.telefone, `Olá ${(l.nome || '').split(' ')[0]}! O aluguel de ${compCurta(m.competencia)} venceu em ${fmtData(m.vencimento)} — consegue regularizar?`) : '';
                  return (
                    <Linha key={m.id} m={m} acao={
                      <>
                        {zap && <a href={zap} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">💬 cobrar</a>}
                        <button onClick={() => marcarPaga(m)} className={btnSimula + ' !py-1.5 !text-[11px]'}>⚡ Pagou</button>
                      </>
                    } />
                  );
                })}
              </Secao>
            )}

            {(!pilhaSel || pilhaSel === 'repassar') && porDono.length > 0 && (
              <Secao titulo={<>💸 A repassar — um PIX por proprietário</>} cor="text-amber-300">
                {porDono.map((g) => (
                  <div key={g.dono + g.pix} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5 border-b border-white/[0.05] last:border-0">
                    <div className="min-w-0 flex-1 basis-[220px]">
                      <p className="text-[13px] font-bold text-white">{g.dono}</p>
                      <p className="text-[11px] text-text-secondary truncate">
                        {g.imovel} · {g.movs.map((m) => compCurta(m.competencia)).join(' + ')}
                      </p>
                      <p className="text-[10.5px] text-text-secondary">
                        {g.pix ? `PIX ${g.pix}` : <span className="text-amber-300">⚠ sem chave PIX cadastrada</span>}
                      </p>
                    </div>
                    <p className="text-[14px] font-extrabold text-amber-300 tabular-nums shrink-0">{fmtValor(g.total)}</p>
                    <button onClick={() => {
                      const { im, l } = ctx(g.movs[0]);
                      setDemonstrativo({ movs: g.movs, dono: g.dono, pix: g.pix, imovelId: im?.id || '', locacaoId: l?.id || '' });
                    }} className={btnGhost + ' !py-1.5 shrink-0'}>📄 demonstrativo</button>
                    <button onClick={() => repassar(g.movs, g.dono, g.total)} className={btnOuro + ' !py-1.5 shrink-0'}>💸 Repassar</button>
                  </div>
                ))}
                {porDono.length > 1 && (
                  <div className="px-3.5 py-2.5 border-t border-white/[0.06]">
                    <button onClick={repassarTodos} className={btnOuro + ' w-full !py-2'}>
                      💸 Repassar todos — {fmtValor(totais.repassar)} em {porDono.length} PIX
                    </button>
                  </div>
                )}
              </Secao>
            )}

            {(!pilhaSel || pilhaSel === 'vencendo') && (
              <Secao titulo={<>📅 A vencer em {compLonga(mes)}</>} cor="text-white/70"
                vazio={pilhas.vencendo.length ? undefined : 'Nada a vencer neste mês.'}>
                {pilhas.vencendo.map((m) => (
                  <Linha key={m.id} m={m} acao={<button onClick={() => marcarPaga(m)} className={btnSimula + ' !py-1.5 !text-[11px]'}>⚡ Pagou</button>} />
                ))}
              </Secao>
            )}

            {(!pilhaSel || pilhaSel === 'pagas') && (
              <Secao titulo={<>✓ Recebidas em {compLonga(mes)}</>} cor="text-emerald-300"
                vazio={pilhas.pagas.length ? undefined : 'Nenhum pagamento neste mês.'}>
                {pilhas.pagas.map((m) => (
                  <Linha key={m.id} m={m} acao={
                    <span className={`text-[10.5px] font-bold ${m.statusRepasse === 'repassado' ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {m.statusRepasse === 'repassado' ? `↗ repassado ${fmtData(m.repassadoEm)}` : '↗ a repassar'}
                    </span>
                  } />
                ))}
              </Secao>
            )}
          </>
        )}
      </div>
    </div>
  );
}
