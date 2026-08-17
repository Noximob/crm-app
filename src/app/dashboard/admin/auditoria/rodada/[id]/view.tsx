'use client';

/**
 * AUDITORIA · A RODADA — a análise apresentada no layout da casa.
 *
 * O rodada.json é lido fora do sistema e importado inteiro. Esta view é onde
 * ele vira documento: o mesmo conteúdo do HTML, mas no design do CRM e com
 * dois PDFs distintos.
 *
 * A separação dos dois PDFs não é enfeite. O relatório tem partes que são do
 * GESTOR e não do corretor — o risco apurado, as perguntas preparadas para o
 * 1:1, o que a diretoria precisa destravar. Mandar isso para o corretor
 * queima a conversa antes dela começar. Por isso "PDF do corretor" corta
 * essas seções e "PDF do gestor" leva tudo.
 *
 * Recebe a rodada pronta por prop e não fala com o Firestore: quem carrega é
 * a page. Isso mantém a apresentação testável fora do banco.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  asObj, asArr, asStrArr, asStr, asNum, fmtYmd, fmtDinheiro, fmtNum,
  lerIndicadores, valorIndicador, referenciaIndicador, GRUPOS, BOLA_STATUS, COR_STATUS,
  VEREDITO, TEMPERATURA, naturezaLegivel, valorSolto,
  ROTULO_QUALIDADE, ROTULO_OPORTUNIDADE, ROTULO_FUNIL, TIPO_DESTRAVE, PRAZO_LEGIVEL, PERGUNTA_DO_GRUPO,
  type ChaveVeredito, type Indicador,
} from '@/lib/auditoriaAnalise';
import { showToast } from '@/components/ui/toast';
import RodadaPrint, { CSS_PRINT_RODADA } from './print';

const btnOuro = 'px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40';

export interface RodadaDoc {
  id: string; corretorUid: string; corretorNome: string;
  geradoEmYmd: string; periodoInicio: string; periodoFim: string;
  versaoDiretrizes?: string; tamanhoAmostra?: number;
  gargalo?: string; instrucao?: string; statusInstrucao?: string;
  analise?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// blocos visuais
// ---------------------------------------------------------------------------

function Secao({ id, n, titulo, hint, children }: {
  id?: string; n?: number; titulo: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="al-card relative overflow-hidden p-4 sm:p-5 scroll-mt-20">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <div className="flex items-baseline gap-2 mb-3">
        {n !== undefined && <span className="text-[11px] font-extrabold text-[#E8C547]/60 tabular-nums">{n}</span>}
        <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em]">{titulo}</h2>
      </div>
      {hint && <p className="text-[11px] text-text-secondary -mt-2 mb-3">{hint}</p>}
      {children}
    </section>
  );
}

function Citacao({ lead, data, trecho }: { lead?: string; data?: string; trecho?: string }) {
  if (!trecho) return null;
  return (
    <blockquote className="my-2 pl-3 border-l-2 border-[#E8C547]/50 bg-white/[0.03] rounded-r-lg py-2 pr-3">
      <p className="text-[12.5px] text-white/90 italic leading-relaxed">“{trecho}”</p>
      {(lead || data) && (
        <p className="text-[10.5px] text-text-secondary font-bold mt-1.5">
          {lead}{lead && data ? ' · ' : ''}{data ? fmtYmd(data) : ''}
        </p>
      )}
    </blockquote>
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

function Grade({ itens }: { itens: { rot: string; val: string; nulo?: boolean }[] }) {
  if (!itens.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {itens.map((it, i) => (
        <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-text-secondary leading-tight">{it.rot}</p>
          <p className={`text-[17px] font-extrabold tabular-nums mt-0.5 ${it.nulo ? 'text-white/25' : 'text-white'}`}>{it.val}</p>
        </div>
      ))}
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

/**
 * Âncora dos blocos de métricas. Vive aqui porque índice e seção precisam
 * chegar EXATAMENTE ao mesmo id — quando cada um monta o seu, os links do
 * índice apontam para o vazio e ninguém percebe.
 */
const ancoraBloco = (titulo: string) => 'b-' + titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------------------------------------------------------------------------
// a apresentação
// ---------------------------------------------------------------------------

export default function RodadaView({ r, anteriorQuadro, corretores, onRenomear }: {
  r: RodadaDoc;
  /** quadro_indicadores da rodada anterior — dá o rumo de cada linha */
  anteriorQuadro?: unknown;
  corretores?: { id: string; nome: string }[];
  /** ausente = o nome não é editável (preview, espelho) */
  onRenomear?: (nome: string) => Promise<void>;
}) {
  const [modoPdf, setModoPdf] = useState<'corretor' | 'gestor'>('corretor');
  /**
   * A tela abre mostrando tudo — quem entra aqui é o gestor. Mas a reunião
   * acontece com os dois olhando a MESMA tela, e aí o risco apurado e as
   * perguntas preparadas não podem estar à vista: o corretor lê o roteiro
   * antes de a conversa começar. Este botão é o que torna a tela usável na
   * frente dele.
   */
  const [modoTela, setModoTela] = useState<'gestor' | 'corretor'>('gestor');
  const soEu = modoTela === 'gestor';
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeNovo, setNomeNovo] = useState(r.corretorNome || '');

  const a = useMemo(() => asObj(r?.analise), [r]);
  const temAnalise = Object.keys(a).length > 0;

  const indicadores = useMemo(() => lerIndicadores(a.quadro_indicadores, anteriorQuadro), [a, anteriorQuadro]);
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

  const placar = asObj(a.placar_indicadores);
  const veredito = asObj(a.veredito);
  const natureza = naturezaLegivel(asStr(veredito.natureza_do_problema));
  const cobertura = asObj(a.cobertura);
  const fila = asArr(a.fila_de_ataque).sort((x, y) => (asNum(x.posicao) ?? 99) - (asNum(y.posicao) ?? 99));
  const acertos = asArr(a.acertos);
  const destaques = asObj(a.destaques_do_periodo);
  const achados = asArr(a.achados);
  const leadsAud = asArr(a.leads_auditados);
  const crmVsReal = asArr(a.crm_vs_real);
  const destravar = asArr(a.gestor_precisa_destravar);
  const naoEDele = asArr(a.nao_e_do_corretor);
  const perguntas = asStrArr(a.perguntas_para_reuniao);
  const padroes = asStrArr(a.padroes_observados);
  const ressalvas = asStrArr(a.ressalvas);
  const corrente = asObj(a.corrente_causal);
  const risco = asObj(a.risco);
  const riscoOcorr = asArr(risco.ocorrencias);
  const temperatura = asObj(a.temperatura_da_carteira);
  const engajamento = asObj(a.engajamento);
  const evidencias = asArr(a.evidencias);
  const combinado = asObj(a.combinado);
  const metasComb = asArr(combinado.metas);
  const paradosPrazo = asArr(combinado.leads_parados_alem_do_prazo);
  const descartesExplicar = asArr(combinado.descartes_a_explicar);
  const fichaIncompleta = asArr(combinado.ficha_incompleta);
  const naoCombinado = asStrArr(combinado.o_que_nao_foi_combinado);
  const temCombinado = metasComb.length > 0 || paradosPrazo.length > 0
    || descartesExplicar.length > 0 || fichaIncompleta.length > 0 || naoCombinado.length > 0;

  const sinais = asArr(a.sinais_de_compra);
  const metas = asArr(a.metas_da_instrucao);
  const duasConversas = asObj(a.duas_conversas);

  /**
   * "observacao" é prosa e não cabe numa célula de número — sai da grade e
   * vira parágrafo abaixo dela.
   */
  const blocos = useMemo(() => [
    { t: 'Qualidade da conversa', src: asObj(a.qualidade_conversa), rot: ROTULO_QUALIDADE },
    { t: 'Oportunidade perdida', src: asObj(a.oportunidade_perdida), rot: ROTULO_OPORTUNIDADE },
    { t: 'O funil de imóvel', src: asObj(a.funil_imovel), rot: ROTULO_FUNIL },
  ].filter((b) => Object.keys(b.src).length > 0).map((b) => ({
    ...b,
    numeros: Object.entries(b.src).filter(([k]) => k !== 'observacao'),
    observacao: asStr(b.src.observacao),
  })), [a]);

  /**
   * O índice é a fonte única da ordem E da numeração das seções. Numerar à
   * mão fazia o documento pular do 1 para o 3 quando um bloco não vinha no
   * JSON — e um relatório que pula número parece quebrado.
   */
  const indice = useMemo(() => ([
    { id: 'fila', t: 'Fila de ataque', tem: fila.length > 0, gestor: false },
    { id: 'bem', t: 'O que você faz bem', tem: acertos.length > 0 || Object.keys(destaques).length > 0, gestor: false },
    { id: 'muda', t: 'O que muda agora', tem: achados.length > 0 || evidencias.length > 0, gestor: false },
    { id: 'combinado', t: 'O combinado', tem: temCombinado, gestor: false },
    { id: 'quadro', t: 'Os números', tem: indicadores.length > 0, gestor: false },
    { id: 'crm', t: 'CRM × realidade', tem: crmVsReal.length > 0, gestor: false },
    { id: 'leads', t: 'Cliente por cliente', tem: leadsAud.length > 0, gestor: false },
    ...blocos.map((b) => ({ id: ancoraBloco(b.t), t: b.t, tem: true, gestor: false })),
    { id: 'temp', t: 'Temperatura da carteira', tem: Object.keys(temperatura).length > 0, gestor: false },
    { id: 'corrente', t: 'Como um erro puxa o outro', tem: asStrArr(corrente.elos).length > 0 || asNum(corrente.custo_estimado_vgv) !== null, gestor: false },
    { id: 'metas', t: 'Como medir a instrução', tem: metas.length > 0, gestor: false },
    { id: 'duas', t: 'Duas conversas', tem: !!(asStr(asObj(duasConversas.melhor).lead) || asStr(asObj(duasConversas.pior).lead)), gestor: false },
    { id: 'antes', t: 'Desde a rodada anterior', tem: !!asStr(a.comparativo_rodada_anterior), gestor: false },
    { id: 'padroes', t: 'Padrões recorrentes', tem: padroes.length > 0, gestor: false },
    { id: 'engaja', t: 'Engajamento', tem: !!asStr(engajamento.observacao) || asStrArr(engajamento.sinais_de_queda).length > 0, gestor: false },
    { id: 'naodele', t: 'Nem tudo é do corretor', tem: naoEDele.length > 0, gestor: false },
    { id: 'risco', t: 'Risco para a imobiliária', tem: riscoOcorr.length > 0, gestor: true },
    { id: 'perguntas', t: 'Perguntas para a reunião', tem: perguntas.length > 0, gestor: true },
    { id: 'destravar', t: 'O que você precisa destravar', tem: destravar.length > 0, gestor: true },
    { id: 'ressalvas', t: 'Ressalvas', tem: ressalvas.length > 0, gestor: false },
  ].filter((s) => s.tem)), [a, fila, acertos, achados, evidencias, indicadores, crmVsReal, leadsAud, blocos,
    temperatura, corrente, metas, duasConversas, padroes, engajamento, naoEDele, riscoOcorr, perguntas, destravar, ressalvas]);

  const indiceVisivel = useMemo(() => indice.filter((s) => soEu || !s.gestor), [indice, soEu]);
  const nDe = (id: string) => indice.findIndex((s) => s.id === id) + 1;

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
              {asNum(cobertura.conversas_lidas) !== null && ` · ${fmtNum(asNum(cobertura.conversas_lidas))} de ${fmtNum(asNum(cobertura.leads_na_amostra))} conversas lidas`}
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

        {/* 1 — a conversa em três linhas */}
        <section className="al-card relative overflow-hidden p-4 sm:p-5">
          <div className="absolute inset-x-0 top-0 gx-line" />
          {asStr(a.gargalo) && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/[0.07] p-3.5 mb-3">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-rose-300/80 mb-1">O gargalo</p>
              <p className="text-[15px] font-bold text-white leading-snug">{asStr(a.gargalo)}</p>
            </div>
          )}
          {asStr(a.instrucao) && (
            <div className="rounded-xl border border-[#E8C547]/40 bg-[#E8C547]/[0.07] p-3.5">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#E8C547]/80 mb-1">
                A instrução{PRAZO_LEGIVEL[asStr(a.prazo_da_instrucao)] ? ` · prazo ${PRAZO_LEGIVEL[asStr(a.prazo_da_instrucao)]}` : ''}
              </p>
              <p className="text-[15px] font-bold text-white leading-snug">{asStr(a.instrucao)}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 pt-3 border-t border-white/[0.07]">
            {(Object.keys(VEREDITO) as ChaveVeredito[]).map((k) => {
              const v = asNum(veredito[k]);
              if (v === null) return null;
              return (
                <span key={k} className="text-[11.5px] text-text-secondary">
                  <b className={`${VEREDITO[k].cor} text-[15px] tabular-nums`}>{VEREDITO[k].simb} {v}</b> {VEREDITO[k].txt}
                </span>
              );
            })}
            {asNum(veredito.leads_com_etapa_defasada) !== null && (
              <span className="text-[11.5px] text-text-secondary">
                <b className="text-white text-[15px] tabular-nums">{fmtNum(asNum(veredito.leads_com_etapa_defasada))}</b> com etapa defasada
              </span>
            )}
          </div>
        </section>

        {/* índice — o documento é longo e ninguém rola atrás do que quer */}
        {indiceVisivel.length > 2 && (
          <nav className="al-card p-3">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-text-secondary mb-2">Neste relatório</p>
            <div className="flex flex-wrap gap-1.5">
              {indiceVisivel.map((s, i) => (
                <a key={s.id} href={`#${s.id}`}
                  className={`px-2.5 py-1 rounded-lg text-[11.5px] font-bold transition-colors ${
                    s.gestor
                      ? 'bg-[#9F6BFF]/10 text-[#C4A6FF] hover:bg-[#9F6BFF]/20'
                      : 'bg-white/[0.05] text-text-secondary hover:text-white hover:bg-white/[0.1]'
                  }`}>
                  <span className="opacity-50 mr-1 tabular-nums">{i + 1}</span>{s.t}
                </a>
              ))}
            </div>
            {soEu && indice.some((s) => s.gestor) && (
              <p className="text-[10px] text-text-secondary mt-2">
                <span className="inline-block w-2 h-2 rounded-sm bg-[#9F6BFF]/40 align-middle mr-1" />
                roxo = só você vê; não sai no PDF do corretor
              </p>
            )}
          </nav>
        )}

        {/* 2 — fila de ataque */}
        {fila.length > 0 && (
          <Secao id="fila" n={nDe("fila")} titulo="Fila de ataque" hint="O que fazer amanhã de manhã, nesta ordem.">
            <div className="space-y-2.5">
              {fila.map((f, i) => {
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

        {/* 3 — o que faz bem */}
        {(acertos.length > 0 || Object.keys(destaques).length > 0) && (
          <Secao id="bem" n={nDe("bem")} titulo="O que você faz bem" hint="Manter e replicar — é daqui que sai o material de treino do time.">
            {Object.keys(destaques).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                {([
                  ['avancos_de_etapa', 'clientes que avançaram'],
                  ['leads_recuperados', 'recuperados de parado'],
                  ['atendimento_mais_rapido', 'atendimento mais rápido'],
                  ['tarefas_no_prazo', 'tarefas no prazo'],
                  ['dias_fora_do_expediente', 'dias fora do expediente'],
                ] as const).map(([k, rot]) => {
                  const v = valorSolto(destaques[k]);
                  if (v.nulo) return null;
                  return (
                    <div key={k} className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] px-3 py-2">
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-emerald-300/70 leading-tight">{rot}</p>
                      <p className="text-[17px] font-extrabold text-emerald-300 tabular-nums mt-0.5">{v.txt}</p>
                    </div>
                  );
                })}
              </div>
            )}
            {asStr(destaques.observacao) && (
              <p className="text-[12.5px] text-white/85 leading-relaxed mb-3">{asStr(destaques.observacao)}</p>
            )}
            <div className="space-y-3">
              {acertos.map((ac, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-bold text-white">{asStr(ac.lead) || 'lead'}</span>
                    {ac.vale_como_treino === true && (
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border bg-emerald-500/10 border-emerald-500/40 text-emerald-300">vale como treino</span>
                    )}
                  </div>
                  <Citacao lead="" data={asStr(ac.data)} trecho={asStr(ac.trecho)} />
                  {asStr(ac.por_que_funcionou) && (
                    <p className="text-[12px] text-text-secondary leading-relaxed"><b className="text-white/80">Por que funciona:</b> {asStr(ac.por_que_funcionou)}</p>
                  )}
                </div>
              ))}
            </div>
          </Secao>
        )}

        {/* 4 — achados (a prosa) */}
        {achados.length > 0 && (
          <Secao id="muda" n={nDe("muda")} titulo="O que muda a partir de agora">
            <div className="space-y-5">
              {achados.map((ac, i) => {
                const est = VEREDITO[asStr(ac.estado) as ChaveVeredito];
                return (
                  <div key={i} className={i > 0 ? 'pt-4 border-t border-white/[0.07]' : ''}>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-[13.5px] font-bold text-white">{asStr(ac.titulo) || `Achado ${i + 1}`}</h3>
                      {est && <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${est.bg}`}>{est.simb} {est.txt}</span>}
                    </div>
                    {asStr(ac.o_que_aconteceu) && <p className="text-[12.5px] text-white/85 leading-relaxed mb-1"><b className="text-white">O que aconteceu.</b> {asStr(ac.o_que_aconteceu)}</p>}
                    {asArr(ac.citacoes).map((c, j) => <Citacao key={j} lead={asStr(c.lead)} data={asStr(c.data)} trecho={asStr(c.trecho)} />)}
                    {asStr(ac.o_que_custou) && <p className="text-[12.5px] text-white/85 leading-relaxed mb-1"><b className="text-rose-300">O que custou.</b> {asStr(ac.o_que_custou)}</p>}
                    {asStr(ac.o_que_fazer) && <p className="text-[12.5px] text-white/85 leading-relaxed"><b className="text-emerald-300">O que fazer no lugar.</b> {asStr(ac.o_que_fazer)}</p>}
                    <MensagemPronta rotulo="modelo" texto={asStr(ac.modelo_de_mensagem)} />
                  </div>
                );
              })}
            </div>
          </Secao>
        )}

        {/* evidências avulsas — só quando não vieram achados */}
        {achados.length === 0 && evidencias.length > 0 && (
          <Secao id="muda" n={nDe("muda")} titulo="Evidências">
            {evidencias.map((e, i) => (
              <div key={i}>
                <Citacao lead={asStr(e.lead)} data={asStr(e.data)} trecho={asStr(e.trecho)} />
                {asStr(e.tipo) && <p className="text-[10.5px] text-text-secondary -mt-1 mb-2">{asStr(e.tipo).replace(/_/g, ' ')}</p>}
              </div>
            ))}
          </Secao>
        )}

        {/* o combinado — a única parte cobrável, porque foi acertada antes */}
        {temCombinado && (
          <Secao id="combinado" n={nDe('combinado')} titulo="O combinado"
            hint="Só entra aqui o que a casa acertou antes. O que não foi combinado não é cobrança do corretor — é do gestor.">

            {metasComb.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {metasComb.map((m, i) => {
                  const bateu = m.bateu === true;
                  // "não avaliável" é cinza, não vermelho: ou o CRM não mede,
                  // ou o período é curto demais para a meta fazer sentido
                  const semMeta = asNum(m.meta) === null || m.avaliavel === false;
                  return (
                    <div key={i} className={`rounded-xl border px-3 py-2.5 ${
                      semMeta ? 'border-white/[0.07] bg-white/[0.02]'
                        : bateu ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-rose-500/30 bg-rose-500/[0.05]'}`}>
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-text-secondary leading-tight">
                        {asStr(m.indicador).replace(/_/g, ' ')}
                      </p>
                      <p className="mt-1">
                        <span className={`text-[20px] font-extrabold tabular-nums ${semMeta ? 'text-white/60' : bateu ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {fmtNum(asNum(m.realizado))}
                        </span>
                        {!semMeta && <span className="text-[12px] text-text-secondary tabular-nums"> / {fmtNum(asNum(m.meta))}</span>}
                      </p>
                      <p className="text-[10.5px] text-text-secondary leading-snug mt-0.5">
                        {asStr(m.faltou)
                          || (asNum(m.meta) === null ? 'a casa não cobra isto'
                            : m.avaliavel === false ? `meta de ${fmtNum(asNum(m.meta_mensal))} no mês — não dá pra cobrar neste período`
                              : bateu ? 'meta batida' : '')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {asNum(combinado.dinheiro_parado) !== null && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.05] p-3 mb-4">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-rose-300/80">Dinheiro da casa parado na mão dele</p>
                <p className="text-[24px] font-extrabold text-rose-300 tabular-nums">{fmtDinheiro(asNum(combinado.dinheiro_parado))}</p>
                <p className="text-[10.5px] text-text-secondary">O que a casa pagou pelos leads que estão parados na carteira.</p>
              </div>
            )}

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

        {/* 5 — quadro de indicadores */}
        {indicadores.length > 0 && (
          <Secao id="quadro" n={nDe("quadro")} titulo="Os números" hint="O que cada linha mede está escrito embaixo do nome.">
            {/* contado a partir da tabela, não copiado do JSON: o status pode
                ter sido rebaixado aqui, e placar que não bate com a tabela
                logo abaixo dele derruba a confiança no documento inteiro */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[11.5px]">
              {(['verde', 'amarelo', 'vermelho', 'nd'] as const).map((k) => {
                const v = indicadores.filter((i) => i.status === k).length;
                if (!v) return null;
                return <span key={k} className="text-text-secondary">{BOLA_STATUS[k]} <b className="text-white tabular-nums">{v}</b></span>;
              })}
              {indicadores.some((i) => i.origemReferencia === 'mercado') && (
                <span className="text-[10.5px] text-white/40">
                  status vermelho só contra o que a casa combinou
                </span>
              )}
            </div>

            {/* de onde vem cada número: sem isto o gestor lê um percentual da
                amostra como se fosse da carteira — e a amostra é sorteada de
                propósito nas faixas mais críticas, então não representa o todo */}
            <p className="text-[10.5px] text-text-secondary mb-3 leading-relaxed">
              <span className="inline-block text-[8.5px] font-extrabold uppercase tracking-[0.08em] px-1 py-px rounded bg-sky-500/15 text-sky-300 align-middle">lido</span>
              {' '}saiu dos {fmtNum(asNum(cobertura.conversas_lidas))} clientes cuja conversa foi lida — tem prova, mas é uma
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
            {asStrArr(placar.tres_piores).length > 0 && (
              <p className="text-[11.5px] text-text-secondary mt-3"><b className="text-rose-300">Três piores:</b> {asStrArr(placar.tres_piores).join(' · ')}</p>
            )}
            {asStr(placar.mais_melhorou) && <p className="text-[11.5px] text-text-secondary mt-1"><b className="text-emerald-300">Mais melhorou:</b> {asStr(placar.mais_melhorou)}</p>}
            {asStr(placar.mais_piorou) && <p className="text-[11.5px] text-text-secondary mt-1"><b className="text-rose-300">Mais piorou:</b> {asStr(placar.mais_piorou)}</p>}
          </Secao>
        )}

        {/* 6 — CRM × real */}
        {crmVsReal.length > 0 && (
          <Secao id="crm" n={nDe("crm")} titulo="O CRM × o que de fato aconteceu" hint="Onde as duas fontes divergem — e para que lado o erro pende.">
            <Tabela cols={['Métrica', 'CRM', 'Real', 'Veredito', 'Leitura']}>
              {crmVsReal.map((l, i) => {
                const v = VEREDITO[asStr(l.veredito) as ChaveVeredito];
                return (
                  <tr key={i}>
                    <td className={td + ' text-white/85 font-medium'}>{asStr(l.metrica).replace(/_/g, ' ')}</td>
                    <td className={td + ' text-text-secondary tabular-nums'}>{valorSolto(l.valor_crm).txt}</td>
                    <td className={td + ' text-white font-bold tabular-nums'}>{valorSolto(l.valor_real).txt}</td>
                    <td className={td}>{v ? <span className={v.cor + ' font-bold'}>{v.simb} {v.txt}</span> : '—'}</td>
                    <td className={td + ' text-text-secondary leading-relaxed'}>{asStr(l.observacao)}</td>
                  </tr>
                );
              })}
            </Tabela>
          </Secao>
        )}

        {/* 7 — tabela dos leads */}
        {leadsAud.length > 0 && (
          <Secao id="leads" n={nDe("leads")} titulo="Cliente por cliente" hint={`${leadsAud.length} leads da amostra, um por linha.`}>
            <Tabela cols={['Lead', 'T', 'Etapa CRM', 'Etapa real', 'Ver.', 'Sem toque', 'Formato', 'O que queria', 'Por que parou']}>
              {leadsAud.map((l, i) => {
                const t = TEMPERATURA[asStr(l.temperatura).toLowerCase()];
                const crmD = asNum(l.sem_toque_crm); const realD = asNum(l.sem_toque_real);
                const divergiu = crmD !== null && realD !== null && Math.abs(crmD - realD) > 2;
                return (
                  <tr key={i}>
                    <td className={td + ' text-white font-bold whitespace-nowrap'}>{asStr(l.lead)}</td>
                    <td className={td}>{t?.simb || '·'}</td>
                    <td className={td + ' text-text-secondary'}>{asStr(l.etapa_crm) || '—'}</td>
                    <td className={`${td} ${asStr(l.etapa_real) && asStr(l.etapa_real) !== asStr(l.etapa_crm) ? 'text-amber-300 font-bold' : 'text-text-secondary'}`}>{asStr(l.etapa_real) || '—'}</td>
                    <td className={td + ' whitespace-nowrap'}>{asStr(l.veredito) || '—'}</td>
                    <td className={`${td} tabular-nums whitespace-nowrap ${divergiu ? 'text-amber-300 font-bold' : 'text-text-secondary'}`}>
                      {crmD === null ? '—' : crmD} → {realD === null ? 'n/d' : realD}
                    </td>
                    <td className={td + ' text-text-secondary'}>{asStr(l.formato) || '—'}</td>
                    <td className={td + ' text-text-secondary leading-relaxed'}>{asStr(l.o_que_o_cliente_queria)}</td>
                    <td className={td + ' text-text-secondary leading-relaxed'}>{asStr(l.por_que_parou)}</td>
                  </tr>
                );
              })}
            </Tabela>
          </Secao>
        )}

        {/* 8 — qualidade / oportunidade / funil */}
        {blocos.map((b, i) => (
          <Secao key={b.t} id={ancoraBloco(b.t)} n={nDe(ancoraBloco(b.t))} titulo={b.t}>
            <Grade itens={b.numeros.map(([k, v]) => {
              const s = valorSolto(v);
              return { rot: b.rot[k] || k.replace(/_/g, ' '), val: s.txt, nulo: s.nulo };
            })} />
            {b.observacao && <p className="text-[12.5px] text-white/85 leading-relaxed mt-3">{b.observacao}</p>}
            {b.t === 'Oportunidade perdida' && sinais.length > 0 && (
              <div className="mt-3">
                <Tabela cols={['Lead', 'Data', 'O que o cliente disse', 'O que você respondeu', 'Veredito']}>
                  {sinais.map((s, j) => {
                    const v = asStr(s.veredito).toLowerCase();
                    const cor = v.startsWith('aprov') ? 'text-emerald-300' : v.startsWith('ignor') ? 'text-rose-300' : 'text-amber-300';
                    return (
                      <tr key={j}>
                        <td className={td + ' text-white font-bold whitespace-nowrap'}>{asStr(s.lead)}</td>
                        <td className={td + ' text-text-secondary whitespace-nowrap tabular-nums'}>{fmtYmd(asStr(s.data))}</td>
                        <td className={td + ' text-white/85 italic leading-relaxed'}>{asStr(s.o_que_o_cliente_disse)}</td>
                        <td className={td + ' text-text-secondary leading-relaxed'}>{asStr(s.o_que_voce_respondeu)}</td>
                        <td className={`${td} font-bold whitespace-nowrap ${cor}`}>{asStr(s.veredito)}</td>
                      </tr>
                    );
                  })}
                </Tabela>
              </div>
            )}
          </Secao>
        ))}

        {/* 9 — temperatura da carteira */}
        {Object.keys(temperatura).length > 0 && (
          <Secao id="temp" n={nDe("temp")} titulo="Temperatura da carteira">
            <div className="flex flex-wrap gap-2">
              {(['quente', 'morno', 'frio', 'perdido'] as const).map((k) => {
                const v = asNum(temperatura[k]);
                if (v === null) return null;
                return (
                  <div key={k} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 min-w-[92px]">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${TEMPERATURA[k].cor}`}>{TEMPERATURA[k].simb} {k}</p>
                    <p className="text-[22px] font-extrabold text-white tabular-nums">{v}</p>
                  </div>
                );
              })}
            </div>
          </Secao>
        )}

        {/* 10 — corrente causal + custo */}
        {(asStrArr(corrente.elos).length > 0 || asNum(corrente.custo_estimado_vgv) !== null) && (
          <Secao id="corrente" n={nDe("corrente")} titulo="Como um erro puxa o outro" hint="Como um elo puxa o outro até virar dinheiro perdido.">
            {asStrArr(corrente.elos).length > 0 && (
              <div className="space-y-1 mb-3">
                {asStrArr(corrente.elos).map((e, i) => (
                  <p key={i} className="text-[12.5px] text-white/85 leading-relaxed">
                    <span className="text-[#E8C547]/60 font-bold mr-1.5">{i + 1}.</span>{e}
                  </p>
                ))}
              </div>
            )}
            {asStr(corrente.primeiro_elo) && (
              <p className="text-[12.5px] text-white/90 mb-3"><b className="text-rose-300">O primeiro elo:</b> {asStr(corrente.primeiro_elo)}</p>
            )}
            {(asNum(corrente.custo_estimado_vgv) !== null || asNum(corrente.custo_estimado_comissao) !== null) && (
              <div className="rounded-xl border border-[#E8C547]/25 bg-[#E8C547]/[0.04] p-3">
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  {asNum(corrente.custo_estimado_vgv) !== null && (
                    <div>
                      <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">VGV parado e recuperável</p>
                      <p className="text-[22px] font-extrabold text-[#E8C547] tabular-nums">{fmtDinheiro(asNum(corrente.custo_estimado_vgv))}</p>
                    </div>
                  )}
                  {asNum(corrente.custo_estimado_comissao) !== null && (
                    <div>
                      <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">Comissão estimada</p>
                      <p className="text-[22px] font-extrabold text-white tabular-nums">{fmtDinheiro(asNum(corrente.custo_estimado_comissao))}</p>
                    </div>
                  )}
                </div>
                {asStr(corrente.base_do_calculo) && (
                  <p className="text-[10.5px] text-text-secondary mt-2 leading-relaxed"><b>Estimativa, não valor apurado.</b> {asStr(corrente.base_do_calculo)}</p>
                )}
              </div>
            )}
          </Secao>
        )}

        {/* como medir em 30 dias — a instrução vira número cobrável */}
        {metas.length > 0 && (
          <Secao id="metas" n={nDe("metas")} titulo="Como medir a instrução" hint="O que precisa ter mudado quando a próxima rodada abrir.">
            <Tabela cols={['Indicador', 'Hoje', 'Meta']}>
              {metas.map((m, i) => (
                <tr key={i}>
                  <td className={td + ' text-white/85'}>{asStr(m.indicador)}</td>
                  <td className={td + ' text-rose-300 font-bold tabular-nums whitespace-nowrap'}>{asStr(m.hoje) || valorSolto(m.hoje).txt}</td>
                  <td className={td + ' text-emerald-300 font-bold tabular-nums whitespace-nowrap'}>{asStr(m.meta) || valorSolto(m.meta).txt}</td>
                </tr>
              ))}
            </Tabela>
          </Secao>
        )}

        {/* a melhor e a pior — material de treino e pauta do 1:1 */}
        {(asStr(asObj(duasConversas.melhor).lead) || asStr(asObj(duasConversas.pior).lead)) && (
          <Secao id="duas" n={nDe("duas")} titulo="Duas conversas">
            <div className="grid sm:grid-cols-2 gap-3">
              {([['melhor', 'A melhor', 'material de treinamento', 'emerald'], ['pior', 'A pior', 'pauta do 1:1', 'rose']] as const).map(([k, tit, uso, cor]) => {
                const c = asObj(duasConversas[k]);
                if (!asStr(c.lead)) return null;
                return (
                  <div key={k} className={`rounded-xl border p-3 ${cor === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-rose-500/30 bg-rose-500/[0.04]'}`}>
                    <p className={`text-[9.5px] font-extrabold uppercase tracking-[0.14em] ${cor === 'emerald' ? 'text-emerald-300/80' : 'text-rose-300/80'}`}>{tit} · {uso}</p>
                    <p className="text-[13px] font-bold text-white mt-1">
                      {asStr(c.lead)}{asStr(c.data) ? <span className="text-text-secondary font-normal"> · {fmtYmd(asStr(c.data))}</span> : null}
                    </p>
                    <p className="text-[12px] text-white/85 leading-relaxed mt-1">{asStr(c.por_que)}</p>
                  </div>
                );
              })}
            </div>
          </Secao>
        )}

        {/* o que mudou desde a rodada passada */}
        {asStr(a.comparativo_rodada_anterior) && (
          <Secao id="antes" n={nDe("antes")} titulo="Desde a rodada anterior">
            <p className="text-[12.5px] text-white/85 leading-relaxed">{asStr(a.comparativo_rodada_anterior)}</p>
          </Secao>
        )}

        {/* 11 — padrões */}
        {padroes.length > 0 && (
          <Secao id="padroes" n={nDe("padroes")} titulo="Padrões recorrentes">
            <ol className="space-y-1.5">
              {padroes.map((p, i) => (
                <li key={i} className="text-[12.5px] text-white/85 leading-relaxed">
                  <span className="text-[#E8C547]/60 font-bold mr-1.5">{i + 1}.</span>{p}
                </li>
              ))}
            </ol>
          </Secao>
        )}

        {/* 12 — engajamento */}
        {(asStr(engajamento.observacao) || asStrArr(engajamento.sinais_de_queda).length > 0) && (
          <Secao id="engaja" n={nDe("engaja")} titulo="Engajamento">
            {asStrArr(engajamento.sinais_de_queda).length > 0 && (
              <ul className="mb-2 space-y-1">
                {asStrArr(engajamento.sinais_de_queda).map((s, i) => (
                  <li key={i} className="text-[12.5px] text-amber-300">• {s}</li>
                ))}
              </ul>
            )}
            {asStr(engajamento.observacao) && <p className="text-[12.5px] text-white/85 leading-relaxed">{asStr(engajamento.observacao)}</p>}
          </Secao>
        )}

        {/* 13 — nem tudo é do corretor */}
        {naoEDele.length > 0 && (
          <Secao id="naodele" n={nDe("naodele")} titulo="Nem tudo é do corretor" hint="O que a casa precisa assumir antes de cobrar dele.">
            <ul className="space-y-2">
              {naoEDele.map((n, i) => (
                <li key={i} className="text-[12.5px] text-white/85 leading-relaxed">
                  <span className="text-text-secondary">•</span> <b className="text-white/70">{asStr(n.lead) || asStr(n.tipo).replace(/_/g, ' ')}</b> — {asStr(n.descricao)}
                </li>
              ))}
            </ul>
          </Secao>
        )}

        {/* ——— daqui para baixo: só o gestor ——— */}
        {soEu && (riscoOcorr.length > 0 || perguntas.length > 0 || destravar.length > 0) && (
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-text-secondary">Só para o gestor · não vai no PDF do corretor</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        )}

        {soEu && riscoOcorr.length > 0 && (
          <Secao id="risco" n={nDe("risco")} titulo="Risco para a imobiliária">
            <p className="text-[11px] text-text-secondary mb-2">
              Gravidade <b className={asStr(risco.gravidade) === 'alta' ? 'text-rose-300' : 'text-amber-300'}>{asStr(risco.gravidade) || '—'}</b>.
              Cada ocorrência traz o trecho literal — sem prova, não se registra.
            </p>
            {riscoOcorr.map((o, i) => <Citacao key={i} lead={asStr(o.lead)} data={asStr(o.data)} trecho={asStr(o.trecho)} />)}
          </Secao>
        )}

        {soEu && perguntas.length > 0 && (
          <Secao id="perguntas" n={nDe("perguntas")} titulo="Perguntas para a reunião" hint="Perguntas, não acusações — a primeira abre a conversa.">
            <ol className="space-y-2">
              {perguntas.map((p, i) => (
                <li key={i} className="text-[12.5px] text-white/90 leading-relaxed">
                  <span className="text-[#E8C547]/60 font-bold mr-1.5">{i + 1}.</span>{p}
                </li>
              ))}
            </ol>
          </Secao>
        )}

        {soEu && destravar.length > 0 && (
          <Secao id="destravar" n={nDe("destravar")} titulo="O que VOCÊ precisa destravar" hint="O corretor não resolve isso sozinho.">
            <Tabela cols={['Tipo', 'O que travou', 'Responsável']}>
              {destravar.map((d, i) => (
                <tr key={i}>
                  <td className={td + ' text-[#E8C547] font-bold whitespace-nowrap'}>{TIPO_DESTRAVE[asStr(d.tipo)] || asStr(d.tipo)}</td>
                  <td className={td + ' text-white/85 leading-relaxed'}>{asStr(d.descricao)}</td>
                  <td className={td + ' text-text-secondary whitespace-nowrap'}>{asStr(d.responsavel_sugerido) || '—'}</td>
                </tr>
              ))}
            </Tabela>
          </Secao>
        )}

        {/* ressalvas — fecham o documento */}
        {ressalvas.length > 0 && (
          <Secao id="ressalvas" n={nDe("ressalvas")} titulo="Ressalvas" hint="O que não foi possível verificar, e por quê.">
            <ul className="space-y-1.5">
              {ressalvas.map((s, i) => <li key={i} className="text-[11.5px] text-text-secondary leading-relaxed">• {s}</li>)}
            </ul>
          </Secao>
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
