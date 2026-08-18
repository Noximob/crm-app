'use client';

/**
 * AUDITORIA · A RODADA — a análise apresentada no layout da casa.
 *
 * O documento tem TRÊS camadas, e a ordem delas é a coisa mais importante
 * deste arquivo:
 *
 *   1. A REUNIÃO — o que o gestor e o corretor leem juntos, olhando a mesma
 *      tela. O gargalo, o retrato (todo número num lugar só), a fila de
 *      amanhã, o que ele faz bem e o que muda. Abre sempre.
 *   2. A PROVA — o quadro de indicadores linha a linha, cliente por cliente,
 *      o que foi combinado e as ressalvas. Abre fechada: é onde se vai
 *      quando alguém pergunta "de onde saiu isso?".
 *   3. SÓ O GESTOR — o risco apurado, as perguntas preparadas para o 1:1 e o
 *      que a casa precisa destravar. Some no modo reunião e não sai no PDF
 *      do corretor: mandar isso para ele queima a conversa antes dela
 *      começar.
 *
 * A versão anterior tinha 22 seções no mesmo nível e um índice em cima — que
 * é a definição de "espalhado". Os números apareciam em seis pontos
 * diferentes e metade das seções só existia para blocos de relatório que a
 * análise não produz mais.
 *
 * Recebe a rodada pronta por prop e não fala com o Firestore: quem carrega é
 * a page. Isso mantém a apresentação testável fora do banco.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  asObj, asArr, asStr, asNum, fmtYmd, fmtDinheiro, fmtNum,
  lerIndicadores, valorIndicador, referenciaIndicador, GRUPOS, BOLA_STATUS, COR_STATUS,
  VEREDITO, TEMPERATURA, naturezaLegivel,
  TIPO_DESTRAVE, PRAZO_LEGIVEL, PERGUNTA_DO_GRUPO,
  type ChaveVeredito, type Indicador,
} from '@/lib/auditoriaAnalise';
import { lerRelatorio, type Citacao as TCitacao } from '@/lib/auditoriaRelatorio';
import { showToast } from '@/components/ui/toast';
import { montarQuadro, compararComAnterior } from '@/lib/auditoriaQuadro';
import type { DiretrizesAuditoria } from '@/lib/auditoria';
import RodadaPrint, { CSS_PRINT_RODADA } from './print';
import GraficosRodada from './graficos';

const btnOuro = 'px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40';

export interface RodadaDoc {
  id: string; corretorUid: string; corretorNome: string;
  geradoEmYmd: string; periodoInicio: string; periodoFim: string;
  versaoDiretrizes?: string; tamanhoAmostra?: number;
  gargalo?: string; instrucao?: string; statusInstrucao?: string;
  analise?: Record<string, unknown>;
  /** o que o CRM sabia quando o pacote foi gerado — é daqui que sai o quadro */
  panorama?: Record<string, unknown>;
  cobranca?: Record<string, unknown>;
  destaques?: Record<string, unknown>;
  cadencia?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// blocos visuais
// ---------------------------------------------------------------------------

function Secao({ id, titulo, hint, children }: {
  id?: string; titulo: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="al-card relative overflow-hidden p-4 sm:p-5 scroll-mt-20">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em] mb-3">{titulo}</h2>
      {hint && <p className="text-[11px] text-text-secondary -mt-2 mb-3">{hint}</p>}
      {children}
    </section>
  );
}

/**
 * Um trecho que não é fala de ninguém — "CRM: 8 dias sem toque · WhatsApp:
 * conversa às 18h02" — é anotação da análise, não citação. Apresentar isso
 * entre aspas e em itálico, como se o cliente tivesse dito, é o que faz o
 * relatório soar incongruente para quem conhece a conversa de verdade. Aqui
 * a diferença fica explícita em vez de escondida.
 */
const PARECE_ANOTACAO = /CRM:|WhatsApp:|whatsapp:|→|\bdias sem\b|\bsem toque\b|^\s*\[/;

function Citacao({ c, mostrarLead = true }: { c: TCitacao; mostrarLead?: boolean }) {
  if (!c.trecho) return null;
  const rodape = [mostrarLead ? c.lead : '', c.data ? fmtYmd(c.data) : '', c.de && c.de !== 'corretor' ? c.de : '']
    .filter(Boolean).join(' · ');

  if (PARECE_ANOTACAO.test(c.trecho)) {
    return (
      <div className="my-2 rounded-lg border border-white/[0.09] bg-white/[0.02] px-3 py-2">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">
          anotação da análise — não é fala do cliente
        </p>
        <p className="text-[12px] text-white/80 leading-relaxed">{c.trecho}</p>
        {rodape && <p className="text-[10.5px] text-text-secondary font-bold mt-1">{rodape}</p>}
      </div>
    );
  }
  return (
    <blockquote className="my-2 pl-3 border-l-2 border-[#E8C547]/50 bg-white/[0.03] rounded-r-lg py-2 pr-3">
      <p className="text-[12.5px] text-white/90 italic leading-relaxed">“{c.trecho}”</p>
      {rodape && <p className="text-[10.5px] text-text-secondary font-bold mt-1.5">{rodape}</p>}
    </blockquote>
  );
}

/**
 * Duas citações bastam para provar um padrão. A análise às vezes manda cinco
 * do mesmo erro, e ler cinco variações da mesma coisa numa reunião faz o
 * ponto perder força em vez de ganhar. As outras ficam a um clique.
 */
function Citacoes({ lista }: { lista: TCitacao[] }) {
  const [tudo, setTudo] = useState(false);
  if (!lista.length) return null;
  const mostra = tudo ? lista : lista.slice(0, 2);
  const resto = lista.length - mostra.length;
  return (
    <>
      {mostra.map((c, i) => <Citacao key={i} c={c} />)}
      {resto > 0 && (
        <button onClick={() => setTudo(true)}
          className="text-[10.5px] font-bold text-text-secondary hover:text-white no-print">
          + {resto} exemplo{resto === 1 ? '' : 's'} do mesmo erro
        </button>
      )}
    </>
  );
}

/** A caixa tracejada com a mensagem que o corretor copia e cola. */
function MensagemPronta({ rotulo, texto }: { rotulo: string; texto: string }) {
  const [copiou, setCopiou] = useState(false);
  if (!texto) return null;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiou(true); setTimeout(() => setCopiou(false), 1600);
    } catch { showToast('Não foi possível copiar.', 'error'); }
  };
  return (
    <div className="mt-2 rounded-xl border border-dashed border-[#E8C547]/40 bg-[#E8C547]/[0.05] p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#E8C547]/80">{rotulo}</span>
        <button onClick={copiar} className="ml-auto text-[10px] font-bold text-text-secondary hover:text-white no-print">
          {copiou ? '✓ copiado' : 'copiar'}
        </button>
      </div>
      <p className="text-[12.5px] text-white/90 leading-relaxed whitespace-pre-wrap">{texto}</p>
    </div>
  );
}

function Tabela({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[11.5px] border-collapse min-w-[560px]">
        <thead>
          <tr>{cols.map((c, i) => (
            <th key={i} className="text-left font-extrabold uppercase tracking-[0.08em] text-[9.5px] text-text-secondary border-b border-white/15 px-2 py-1.5 whitespace-nowrap">{c}</th>
          ))}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const td = 'px-2 py-1.5 border-b border-white/[0.06] align-top';

// ---------------------------------------------------------------------------
// a apresentação
// ---------------------------------------------------------------------------

export default function RodadaView({ r, anteriorQuadro, corretores, diretrizes, onRenomear }: {
  r: RodadaDoc;
  /** quadro_indicadores da rodada anterior — dá o rumo de cada linha */
  anteriorQuadro?: unknown;
  corretores?: { id: string; nome: string }[];
  /** a régua da casa — dá as referências do quadro */
  diretrizes?: DiretrizesAuditoria | null;
  /** ausente = o nome não é editável (preview, espelho) */
  onRenomear?: (nome: string) => Promise<void>;
}) {
  const [modoPdf, setModoPdf] = useState<'corretor' | 'gestor'>('corretor');
  /**
   * A tela abre mostrando tudo — quem entra aqui é o gestor. Mas a reunião
   * acontece com os dois olhando a MESMA tela, e aí o risco apurado e as
   * perguntas preparadas não podem estar à vista: o corretor lê o roteiro
   * antes de a conversa começar.
   */
  const [modoTela, setModoTela] = useState<'gestor' | 'corretor'>('gestor');
  /** a prova abre fechada: a reunião se faz com a camada de cima */
  const [mostrarProva, setMostrarProva] = useState(false);
  const soEu = modoTela === 'gestor';
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeNovo, setNomeNovo] = useState(r.corretorNome || '');

  const a = useMemo(() => asObj(r?.analise), [r]);
  const temAnalise = Object.keys(a).length > 0;

  /**
   * Uma estrutura só, venha o relatório no formato antigo ou no novo. Daqui
   * para baixo a tela nunca pergunta qual chegou.
   */
  const rel = useMemo(() => lerRelatorio(a), [a]);

  /**
   * O QUADRO SAI DO SISTEMA — sempre que a rodada tiver o panorama guardado.
   *
   * Antes a tela preferia o quadro que a análise digitava, e ele se
   * contradizia: 100% de visitas realizadas contra meta de 70% marcado como
   * "atenção", e duas linhas sem valor nenhum também marcadas como
   * "atenção". Quem conhece a operação lê isso e para de confiar no
   * documento inteiro — com razão.
   *
   * O CRM já tem esses números e a régua é sempre a mesma conta. Só se cai
   * no quadro da análise quando a rodada é antiga e não guardou panorama —
   * e mesmo lá o status é recalculado, nunca lido do JSON.
   */
  const indicadores = useMemo(() => {
    if (r.panorama) {
      return compararComAnterior(
        montarQuadro(r.panorama, rel.daConversa, asObj(a.cobertura), diretrizes ?? null),
        Array.isArray(anteriorQuadro) ? (anteriorQuadro as Indicador[]) : null,
      );
    }
    return lerIndicadores(rel.legado.quadro, anteriorQuadro);
  }, [a, rel, r.panorama, anteriorQuadro, diretrizes]);

  const quadroDoSistema = !!r.panorama;

  const porGrupo = useMemo<[string, Indicador[]][]>(() => {
    const m = new Map<string, Indicador[]>();
    for (const i of indicadores) {
      if (!m.has(i.grupo)) m.set(i.grupo, []);
      m.get(i.grupo)!.push(i);
    }
    return Array.from(m.entries()).sort(
      (x, y) => (GRUPOS as readonly string[]).indexOf(x[0]) - (GRUPOS as readonly string[]).indexOf(y[0])
    );
  }, [indicadores]);

  const natureza = naturezaLegivel(rel.natureza);
  const destaques = asObj(rel.legado.destaques);
  const combinado = rel.legado.combinado;
  const paradosPrazo = asArr(combinado.leads_parados_alem_do_prazo);
  const descartesExplicar = asArr(combinado.descartes_a_explicar);
  const fichaIncompleta = asArr(combinado.ficha_incompleta);
  const naoCombinado = asArr(combinado.o_que_nao_foi_combinado).map((x) => String(x));

  const temProva = indicadores.length > 0 || rel.leads.length > 0
    || paradosPrazo.length > 0 || descartesExplicar.length > 0
    || fichaIncompleta.length > 0 || rel.ressalvas.length > 0;

  const nomeArquivo = useMemo(() => {
    const nome = (r?.corretorNome || 'corretor').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return `auditoria-${nome}-${r?.geradoEmYmd || ''}${modoPdf === 'gestor' ? '-gestor' : ''}`;
  }, [r, modoPdf]);

  /** O nome do arquivo salvo pelo navegador vem do document.title. */
  const imprimir = (modo: 'corretor' | 'gestor') => {
    setModoPdf(modo);
    const antes = document.title;
    setTimeout(() => {
      document.title = `auditoria-${(r?.corretorNome || 'corretor')}-${r?.geradoEmYmd || ''}${modo === 'gestor' ? '-gestor' : ''}`;
      window.print();
      document.title = antes;
    }, 60);
  };

  const salvarNome = async () => {
    if (!nomeNovo.trim() || !onRenomear) return;
    try {
      await onRenomear(nomeNovo.trim());
      setEditandoNome(false);
    } catch { showToast('Não foi possível salvar.', 'error'); }
  };

  if (!temAnalise) {
    return (
      <div className="al-card max-w-3xl mx-auto mt-10 p-10 text-center">
        <p className="text-[36px] mb-2">⏳</p>
        <h1 className="al-display text-[16px] font-bold text-white uppercase tracking-[0.1em]">{r.corretorNome}</h1>
        <p className="text-sm text-text-secondary mt-2">
          O pacote desta rodada foi gerado, mas a análise ainda não foi importada.
          Traga o <b className="text-white">rodada.json</b> de volta no histórico e a apresentação aparece aqui.
        </p>
        <Link href="/dashboard/admin/auditoria/historico/" className={btnOuro + ' inline-block mt-4'}>← Importar no histórico</Link>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_PRINT_RODADA }} />

      <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-20 pt-6 space-y-4 no-print">

        {/* cabeçalho */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="gx-tag"><span>Área do administrador</span></span>
            <div className="flex items-center gap-2 mt-2">
              <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] truncate">{r.corretorNome}</h1>
              {onRenomear && (
                <button onClick={() => setEditandoNome((v) => !v)} title="corrigir o nome do corretor"
                  className="text-text-secondary hover:text-white text-[13px]">✎</button>
              )}
            </div>
            <p className="text-[12px] text-text-secondary mt-0.5 tabular-nums">
              {fmtYmd(r.periodoInicio)} a {fmtYmd(r.periodoFim)}
              {rel.cobertura.lidas !== null && ` · ${fmtNum(rel.cobertura.lidas)} de ${fmtNum(rel.cobertura.naAmostra)} conversas lidas`}
              {r.versaoDiretrizes && ` · régua ${r.versaoDiretrizes}`}
              {natureza.txt !== '—' && <> · natureza <b className={natureza.cor}>{natureza.txt}</b></>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/admin/auditoria/historico/" className={btnGhost}>← Histórico</Link>
            <button
              onClick={() => setModoTela(soEu ? 'corretor' : 'gestor')}
              title={soEu ? 'esconde o risco, as perguntas do 1:1 e o que a casa precisa destravar' : 'volta a mostrar tudo'}
              className={soEu ? btnGhost : 'px-3 py-2 rounded-xl text-[12px] font-bold border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors'}>
              {soEu ? '👥 Ver com o corretor' : '✓ Modo reunião · voltar a ver tudo'}
            </button>
            <button onClick={() => imprimir('gestor')} className={btnGhost}>🖨 PDF do gestor</button>
            <button onClick={() => imprimir('corretor')} className={btnOuro}>📄 PDF do corretor</button>
          </div>
        </div>

        {/* precisa saltar aos olhos: o custo de achar que está escondido e não
            estar é o corretor ler o roteiro da reunião por cima do seu ombro */}
        {!soEu && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.08] px-4 py-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-emerald-300">👥 Modo reunião</span>
            <span className="text-[11.5px] text-white/80">
              Pode virar a tela: o risco, as perguntas do 1:1 e o que a casa precisa destravar estão escondidos.
            </span>
          </div>
        )}

        {editandoNome && (
          <div className="al-card p-3 flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-text-secondary">Este relatório é de:</span>
            {/* input + datalist: escolhe da lista OU digita, para quando o
                corretor ainda não está cadastrado com esse nome */}
            <input list="aud-corretores" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-[12.5px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40" />
            <datalist id="aud-corretores">
              {(corretores || []).map((c) => <option key={c.id} value={c.nome} />)}
            </datalist>
            <button onClick={salvarNome} className={btnOuro}>salvar</button>
            <button onClick={() => { setEditandoNome(false); setNomeNovo(r.corretorNome); }} className={btnGhost}>cancelar</button>
            <span className="text-[10.5px] text-text-secondary w-full">
              O nome vale para o título e para o arquivo do PDF: <b className="text-white/70">{nomeArquivo}.pdf</b>
            </span>
          </div>
        )}

        {/* ═══════════ CAMADA 1 · A REUNIÃO ═══════════ */}

        {/* a conversa inteira em duas frases */}
        <section className="al-card relative overflow-hidden p-4 sm:p-5">
          <div className="absolute inset-x-0 top-0 gx-line" />
          {rel.gargalo && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/[0.07] p-3.5 mb-3">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-rose-300/80 mb-1">O gargalo</p>
              <p className="text-[15px] font-bold text-white leading-snug">{rel.gargalo}</p>
            </div>
          )}
          {rel.instrucao && (
            <div className="rounded-xl border border-[#E8C547]/40 bg-[#E8C547]/[0.07] p-3.5">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#E8C547]/80 mb-1">
                A instrução{PRAZO_LEGIVEL[rel.prazoInstrucao] ? ` · prazo ${PRAZO_LEGIVEL[rel.prazoInstrucao]}` : ''}
              </p>
              <p className="text-[15px] font-bold text-white leading-snug">{rel.instrucao}</p>
            </div>
          )}
          {rel.veredito.etapaDefasada ? (
            <p className="text-[11.5px] text-text-secondary mt-3 pt-3 border-t border-white/[0.07]">
              <b className="text-amber-300 tabular-nums">{fmtNum(rel.veredito.etapaDefasada)}</b> clientes
              estão numa etapa do CRM diferente da que a conversa mostra — todo relatório da casa que usa etapa
              erra por causa deles.
            </p>
          ) : null}
        </section>

        {/* o retrato — TODO número da rodada vive aqui dentro */}
        <GraficosRodada rel={rel} indicadores={indicadores} porGrupo={porGrupo} />

        {/* a fila de amanhã */}
        {rel.fila.length > 0 && (
          <Secao id="fila" titulo="Fila de ataque" hint="O que fazer amanhã de manhã, nesta ordem.">
            <div className="space-y-2.5">
              {rel.fila.map((f, i) => {
                const t = TEMPERATURA[asStr(f.temperatura).toLowerCase()] || TEMPERATURA.frio;
                const dias = asNum(f.esfria_em_dias);
                const urgente = dias !== null && dias <= 3;
                return (
                  <div key={i} className={`rounded-xl border p-3 ${urgente ? 'border-rose-500/40 bg-rose-500/[0.05]' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="w-5 h-5 rounded-full bg-white/[0.08] text-[11px] font-extrabold text-white flex items-center justify-center shrink-0">
                        {asNum(f.posicao) ?? i + 1}
                      </span>
                      <span className="text-[13.5px] font-bold text-white">{asStr(f.lead) || 'lead'}</span>
                      <span className={`text-[11px] font-bold ${t.cor}`}>{t.simb} {asStr(f.temperatura)}</span>
                      {asNum(f.valor_em_jogo) !== null && (
                        <span className="text-[11.5px] font-bold text-[#E8C547] tabular-nums">{fmtDinheiro(asNum(f.valor_em_jogo))}</span>
                      )}
                      {dias !== null && (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${urgente ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' : 'bg-white/[0.05] border-white/15 text-text-secondary'}`}>
                          esfria em {dias} dia{dias === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    {asStr(f.por_que_agora) && <p className="text-[12px] text-text-secondary mt-1.5 leading-relaxed">{asStr(f.por_que_agora)}</p>}
                    <MensagemPronta rotulo="mensagem pronta" texto={asStr(f.mensagem_pronta)} />
                  </div>
                );
              })}
            </div>
          </Secao>
        )}

        {/* o que faz bem — abre antes da cobrança, de propósito */}
        {(rel.acertos.length > 0 || asStr(destaques.observacao)) && (
          <Secao id="bem" titulo="O que você faz bem" hint="Manter e replicar — é daqui que sai o material de treino do time.">
            {asStr(destaques.observacao) && (
              <p className="text-[12.5px] text-white/85 leading-relaxed mb-3">{asStr(destaques.observacao)}</p>
            )}
            <div className="space-y-3">
              {rel.acertos.map((ac, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-bold text-white">{ac.lead || 'lead'}</span>
                    {ac.valeComoTreino && (
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border bg-emerald-500/10 border-emerald-500/40 text-emerald-300">vale como treino</span>
                    )}
                  </div>
                  <Citacao c={ac} mostrarLead={false} />
                  {ac.porQue && (
                    <p className="text-[12px] text-text-secondary leading-relaxed"><b className="text-white/80">Por que funciona:</b> {ac.porQue}</p>
                  )}
                </div>
              ))}
            </div>
          </Secao>
        )}

        {/* o que muda — a cobrança, com dois exemplos por padrão */}
        {rel.achados.length > 0 && (
          <Secao id="muda" titulo="O que muda a partir de agora"
            hint="Cada ponto é um padrão que se repete, não um caso isolado. Os exemplos são a prova dele.">
            <div className="space-y-5">
              {rel.achados.map((ac, i) => {
                const est = VEREDITO[ac.estado as ChaveVeredito];
                return (
                  <div key={i} className={i > 0 ? 'pt-4 border-t border-white/[0.07]' : ''}>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-[13.5px] font-bold text-white">{ac.titulo || `Ponto ${i + 1}`}</h3>
                      {est && <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${est.bg}`}>{est.simb} {est.txt}</span>}
                      {ac.quantosLeads !== null && (
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border bg-white/[0.05] border-white/15 text-text-secondary">
                          em {fmtNum(ac.quantosLeads)} cliente{ac.quantosLeads === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    {ac.oQueAconteceu && <p className="text-[12.5px] text-white/85 leading-relaxed mb-1"><b className="text-white">O que aconteceu.</b> {ac.oQueAconteceu}</p>}
                    <Citacoes lista={ac.citacoes} />
                    {ac.oQueCustou && <p className="text-[12.5px] text-white/85 leading-relaxed mb-1"><b className="text-rose-300">O que custou.</b> {ac.oQueCustou}</p>}
                    {ac.oQueFazer && <p className="text-[12.5px] text-white/85 leading-relaxed"><b className="text-emerald-300">O que fazer no lugar.</b> {ac.oQueFazer}</p>}
                    <MensagemPronta rotulo="modelo" texto={ac.mensagemPronta} />
                  </div>
                );
              })}
            </div>
          </Secao>
        )}

        {/* o que a casa deve antes de cobrar — fica visível para os dois */}
        {rel.naoEDele.length > 0 && (
          <Secao id="naodele" titulo="Nem tudo é do corretor" hint="O que a casa precisa assumir antes de cobrar dele.">
            <ul className="space-y-2">
              {rel.naoEDele.map((n, i) => (
                <li key={i} className="text-[12.5px] text-white/85 leading-relaxed">
                  <span className="text-text-secondary">•</span> <b className="text-white/70">{asStr(n.lead) || asStr(n.tipo).replace(/_/g, ' ')}</b> — {asStr(n.descricao)}
                </li>
              ))}
            </ul>
          </Secao>
        )}

        {/* ═══════════ CAMADA 3 · SÓ O GESTOR ═══════════ */}
        {soEu && (rel.risco.length > 0 || rel.perguntas.length > 0 || rel.destravar.length > 0) && (
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-text-secondary">Só para o gestor · não vai no PDF do corretor</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        )}

        {soEu && rel.perguntas.length > 0 && (
          <Secao id="perguntas" titulo="Perguntas para a reunião" hint="Perguntas, não acusações — a primeira abre a conversa.">
            <ol className="space-y-2">
              {rel.perguntas.map((p, i) => (
                <li key={i} className="text-[12.5px] text-white/90 leading-relaxed">
                  <span className="text-[#E8C547]/60 font-bold mr-1.5">{i + 1}.</span>{p}
                </li>
              ))}
            </ol>
          </Secao>
        )}

        {soEu && rel.risco.length > 0 && (
          <Secao id="risco" titulo="Risco para a imobiliária"
            hint="Cada ocorrência traz o trecho literal — sem prova, não se registra.">
            {rel.risco.map((o, i) => (
              <div key={i}>
                <Citacao c={o} />
                {o.porQue && <p className="text-[11.5px] text-text-secondary -mt-1 mb-2 leading-relaxed">{o.porQue}</p>}
              </div>
            ))}
          </Secao>
        )}

        {soEu && rel.destravar.length > 0 && (
          <Secao id="destravar" titulo="O que VOCÊ precisa destravar" hint="O corretor não resolve isso sozinho.">
            <Tabela cols={['Tipo', 'O que travou', 'Responsável']}>
              {rel.destravar.map((d, i) => (
                <tr key={i}>
                  <td className={td + ' text-[#E8C547] font-bold whitespace-nowrap'}>{TIPO_DESTRAVE[asStr(d.tipo)] || asStr(d.tipo)}</td>
                  <td className={td + ' text-white/85 leading-relaxed'}>{asStr(d.descricao)}</td>
                  <td className={td + ' text-text-secondary whitespace-nowrap'}>{asStr(d.responsavel_sugerido) || '—'}</td>
                </tr>
              ))}
            </Tabela>
          </Secao>
        )}

        {/* ═══════════ CAMADA 2 · A PROVA ═══════════ */}
        {temProva && (
          <>
            <button
              onClick={() => setMostrarProva((v) => !v)}
              className="w-full al-card px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors text-left">
              <span>
                <span className="al-display text-[12.5px] font-bold text-white uppercase tracking-[0.1em]">
                  {mostrarProva ? 'Esconder a prova' : 'Ver a prova'}
                </span>
                <span className="block text-[11px] text-text-secondary mt-0.5">
                  O quadro linha a linha, cliente por cliente, o que foi combinado e as ressalvas.
                  {' '}É consulta — para quando alguém perguntar de onde saiu um número.
                </span>
              </span>
              <span className="text-[18px] text-text-secondary shrink-0">{mostrarProva ? '▴' : '▾'}</span>
            </button>

            {mostrarProva && (
              <>
                {/* o quadro linha a linha */}
                {indicadores.length > 0 && (
                  <Secao id="quadro" titulo="Os números, linha a linha"
                    hint={quadroDoSistema
                      ? 'Calculado pelo CRM contra a régua da casa — a mesma conta em toda rodada.'
                      : 'Rodada antiga: estes números vieram do relatório, não do CRM.'}>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[11.5px]">
                      {(['verde', 'amarelo', 'vermelho', 'nd'] as const).map((k) => {
                        const v = indicadores.filter((i) => i.status === k).length;
                        if (!v) return null;
                        return <span key={k} className="text-text-secondary">{BOLA_STATUS[k]} <b className="text-white tabular-nums">{v}</b></span>;
                      })}
                      {indicadores.some((i) => i.origemReferencia === 'mercado') && (
                        <span className="text-[10.5px] text-white/40">status vermelho só contra o que a casa combinou</span>
                      )}
                    </div>

                    {/* de onde vem cada número: sem isto o gestor lê um percentual
                        da amostra como se fosse da carteira — e a amostra é
                        sorteada de propósito nas faixas mais críticas */}
                    <p className="text-[10.5px] text-text-secondary mb-3 leading-relaxed">
                      <span className="inline-block text-[8.5px] font-extrabold uppercase tracking-[0.08em] px-1 py-px rounded bg-sky-500/15 text-sky-300 align-middle">lido</span>
                      {' '}saiu dos {fmtNum(rel.cobertura.lidas)} clientes cuja conversa foi lida — tem prova, mas é uma
                      amostra sorteada nas faixas mais críticas e <b className="text-white/70">não representa a carteira inteira</b>.
                      {' '}
                      <span className="inline-block text-[8.5px] font-extrabold uppercase tracking-[0.08em] px-1 py-px rounded bg-white/[0.07] text-white/40 align-middle">CRM</span>
                      {' '}saiu da carteira toda, direto do sistema — cobre todo mundo, mas mede o que foi digitado.
                    </p>
                    <Tabela cols={['#', 'Indicador', 'Valor', 'Referência', 'Anterior', '']}>
                      {porGrupo.map(([grupo, linhas]) => (
                        <React.Fragment key={grupo}>
                          <tr><td colSpan={6} className="px-2 pt-4 pb-1">
                            <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#E8C547]/70">{grupo}</span>
                            {PERGUNTA_DO_GRUPO[grupo] && <span className="text-[10.5px] text-text-secondary ml-2 font-normal normal-case tracking-normal">{PERGUNTA_DO_GRUPO[grupo]}</span>}
                          </td></tr>
                          {linhas.map((ind) => (
                            <tr key={ind.n}>
                              <td className={td + ' text-text-secondary tabular-nums'}>{ind.n}</td>
                              <td className={td + ' text-white/85'}>
                                <span className="inline-flex items-baseline gap-1.5">
                                  {ind.rotulo}
                                  <span className={`text-[8.5px] font-extrabold uppercase tracking-[0.08em] px-1 py-px rounded ${
                                    ind.base === 'amostra' ? 'bg-sky-500/15 text-sky-300' : 'bg-white/[0.07] text-white/40'
                                  }`} title={ind.base === 'amostra'
                                    ? 'medido nos leads sorteados, com a conversa lida no WhatsApp'
                                    : 'vem do CRM, da carteira inteira — não foi verificado no WhatsApp'}>
                                    {ind.base === 'amostra' ? 'lido' : 'CRM'}
                                  </span>
                                </span>
                                {ind.oQueMede && <span className="block text-[10px] text-text-secondary font-normal leading-snug mt-0.5">{ind.oQueMede}</span>}
                              </td>
                              <td className={`${td} font-bold tabular-nums ${COR_STATUS[ind.status]}`}>{valorIndicador(ind)}</td>
                              <td className={td + ' text-text-secondary tabular-nums'}>
                                {referenciaIndicador(ind)}
                                {ind.origemReferencia === 'mercado' && (
                                  <span className="block text-[9.5px] text-white/30 font-normal normal-case tracking-normal">de mercado, não combinado</span>
                                )}
                              </td>
                              <td className={td + ' text-text-secondary tabular-nums'}>
                                {ind.anterior === null ? '—' : valorIndicador({ valor: ind.anterior, unidade: ind.unidade })}
                                {ind.rumo === 'melhorou' && <span className="text-emerald-300 ml-1">↑</span>}
                                {ind.rumo === 'piorou' && <span className="text-rose-300 ml-1">↓</span>}
                              </td>
                              <td className={td}>{BOLA_STATUS[ind.status]}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </Tabela>
                  </Secao>
                )}

                {/* cliente por cliente */}
                {rel.leads.length > 0 && (
                  <Secao id="leads" titulo="Cliente por cliente"
                    hint={rel.leadsSemAchado !== null
                      ? `${rel.leads.length} clientes na lista. Outros ${rel.leadsSemAchado} foram lidos e estavam em ordem.`
                      : `${rel.leads.length} clientes, um por linha.`}>
                    <Tabela cols={['Cliente', '', 'Etapa no CRM', 'Etapa real', 'Sem toque', 'O que travou']}>
                      {rel.leads.map((l, i) => {
                        const v = VEREDITO[l.veredito as ChaveVeredito];
                        const divergiu = !!l.etapaReal && !!l.etapaCrm && l.etapaReal !== l.etapaCrm;
                        return (
                          <tr key={i}>
                            <td className={td + ' text-white font-bold whitespace-nowrap'}>{l.lead}</td>
                            <td className={td + ' whitespace-nowrap'} title={v?.txt}>{v ? <span className={v.cor + ' font-bold'}>{v.simb}</span> : '—'}</td>
                            <td className={td + ' text-text-secondary'}>{l.etapaCrm || '—'}</td>
                            <td className={`${td} ${divergiu ? 'text-amber-300 font-bold' : 'text-text-secondary'}`}>{l.etapaReal || '—'}</td>
                            <td className={td + ' text-text-secondary tabular-nums whitespace-nowrap'}>
                              {l.diasSemToqueReal === null ? '—' : `${fmtNum(l.diasSemToqueReal)}d`}
                            </td>
                            <td className={td + ' text-text-secondary leading-relaxed'}>{l.porQueParou || l.oQueQueria}</td>
                          </tr>
                        );
                      })}
                    </Tabela>
                  </Secao>
                )}

                {/* o combinado — a única parte cobrável, porque foi acertada antes */}
                {(paradosPrazo.length > 0 || descartesExplicar.length > 0 || fichaIncompleta.length > 0 || naoCombinado.length > 0) && (
                  <Secao id="combinado" titulo="O combinado"
                    hint="Só entra aqui o que a casa acertou antes. O que não foi combinado não é cobrança do corretor — é do gestor.">

                    {paradosPrazo.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[11.5px] font-bold text-white mb-1.5">Passaram do prazo da etapa</p>
                        <Tabela cols={['Lead', 'Etapa', 'Está há', 'Prazo']}>
                          {paradosPrazo.map((l, i) => (
                            <tr key={i}>
                              <td className={td + ' text-white font-bold whitespace-nowrap'}>{asStr(l.lead)}</td>
                              <td className={td + ' text-text-secondary'}>{asStr(l.etapa)}</td>
                              <td className={td + ' text-rose-300 font-bold tabular-nums whitespace-nowrap'}>{fmtNum(asNum(l.dias_na_etapa))} dias</td>
                              <td className={td + ' text-text-secondary tabular-nums whitespace-nowrap'}>{fmtNum(asNum(l.prazo_da_etapa))} dias</td>
                            </tr>
                          ))}
                        </Tabela>
                      </div>
                    )}

                    {descartesExplicar.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[11.5px] font-bold text-white mb-1.5">Descartes para explicar</p>
                        <p className="text-[10.5px] text-text-secondary mb-1.5">Motivos que não se parecem com nenhum critério da régua. Pergunta, não acusação.</p>
                        <Tabela cols={['Motivo registrado', 'Quantos', 'Por que chamou atenção']}>
                          {descartesExplicar.map((x, i) => (
                            <tr key={i}>
                              <td className={td + ' text-amber-300 font-bold'}>“{asStr(x.motivo)}”</td>
                              <td className={td + ' text-white tabular-nums'}>{fmtNum(asNum(x.quantidade))}</td>
                              <td className={td + ' text-text-secondary leading-relaxed'}>{asStr(x.por_que_chamou_atencao)}</td>
                            </tr>
                          ))}
                        </Tabela>
                      </div>
                    )}

                    {fichaIncompleta.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[11.5px] font-bold text-white mb-1.5">Ficha do cliente incompleta</p>
                        <div className="flex flex-wrap gap-2">
                          {fichaIncompleta.map((f, i) => (
                            <div key={i} className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] px-3 py-1.5">
                              <span className="text-[11.5px] text-white font-bold">{asStr(f.campo)}</span>
                              <span className="text-[11.5px] text-amber-300 tabular-nums"> · falta em {fmtNum(asNum(f.leads_sem))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {naoCombinado.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">
                          Isto ainda não foi combinado — cobrança sua, não dele
                        </p>
                        <ul className="space-y-1">
                          {naoCombinado.map((s, i) => <li key={i} className="text-[12px] text-white/80 leading-relaxed">• {s}</li>)}
                        </ul>
                        <Link href="/dashboard/admin/auditoria/diretrizes/" className="inline-block mt-2 text-[11px] font-bold text-[#E8C547] hover:brightness-125">
                          definir na régua →
                        </Link>
                      </div>
                    )}
                  </Secao>
                )}

                {/* ressalvas — fecham o documento */}
                {rel.ressalvas.length > 0 && (
                  <Secao id="ressalvas" titulo="Ressalvas" hint="O que não foi possível verificar, e por quê.">
                    <ul className="space-y-1.5">
                      {rel.ressalvas.map((s, i) => <li key={i} className="text-[11.5px] text-text-secondary leading-relaxed">• {s}</li>)}
                    </ul>
                  </Secao>
                )}
              </>
            )}
          </>
        )}

        <p className="text-[10.5px] text-text-secondary text-center pt-2">
          Análise cruzada CRM × WhatsApp · régua {r.versaoDiretrizes || '—'} · gerado em {fmtYmd(r.geradoEmYmd)}
        </p>
      </div>

      {/* o documento impresso */}
      <RodadaPrint r={r} a={a} indicadores={indicadores} porGrupo={porGrupo} modo={modoPdf} />
    </>
  );
}
