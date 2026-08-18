'use client';

/**
 * AUDITORIA · A RODADA — o relatório que se lê em pé, em dez segundos.
 *
 * A versão anterior tinha 4.143 palavras e 296 números na camada de
 * abertura, e o gestor rolava três telas de gráfico antes de chegar na
 * primeira cobrança. Era um artigo longo, não um documento de 1:1.
 *
 * A regra desta versão: AO ABRIR, cabe numa tela. Nada mais.
 *
 *   A CAPA      o problema em uma frase, TRÊS números, o que muda.
 *   OS PONTOS   a cobrança em acordeão. Fechado, cada ponto mostra só o
 *               título, em quantos clientes acontece e o que custou. O
 *               gestor abre o que vai discutir — um assunto por vez, que é
 *               como reunião funciona.
 *   AMANHÃ      a fila, com a mensagem pronta a um clique.
 *   A PROVA     o retrato completo, o quadro linha a linha, cliente por
 *               cliente, o combinado e as ressalvas. Tudo continua aqui,
 *               fechado, para quando alguém perguntar de onde saiu.
 *
 * E uma camada que atravessa todas: o que é SÓ DO GESTOR (risco apurado,
 * perguntas do 1:1, o que a casa precisa destravar) some no modo reunião e
 * não sai no PDF do corretor. Mandar isso para ele queima a conversa antes
 * dela começar.
 *
 * Recebe a rodada pronta por prop e não fala com o Firestore: quem carrega é
 * a page. Isso mantém a apresentação testável fora do banco.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  asObj, asArr, asStr, asNum, fmtYmd, fmtDinheiro, fmtNum,
  lerIndicadores, valorIndicador, referenciaIndicador, GRUPOS, BOLA_STATUS, COR_STATUS,
  VEREDITO, TEMPERATURA, TIPO_DESTRAVE, PRAZO_LEGIVEL, PERGUNTA_DO_GRUPO,
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

/** Texto corrido nunca passa disto: linha longa demais o olho não reencontra. */
const LEITURA = 'max-w-[62ch]';

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

/**
 * O acordeão é a peça central desta tela. Fechado, ele mostra o que basta
 * para decidir se vale abrir; aberto, mostra tudo. Cinco achados abertos ao
 * mesmo tempo eram duas mil palavras de uma vez — a parede que ninguém lê.
 */
function Dobra({ n, titulo, etiqueta, resumo, tom = 'neutro', children }: {
  n?: number; titulo: string; etiqueta?: string; resumo?: string;
  tom?: 'neutro' | 'ruim' | 'bom'; children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const barra = tom === 'ruim' ? 'bg-rose-500/70' : tom === 'bom' ? 'bg-emerald-500/70' : 'bg-white/15';
  return (
    <div className="al-card overflow-hidden">
      <button onClick={() => setAberto((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors">
        <span className={`w-[3px] self-stretch rounded-full shrink-0 ${barra}`} />
        {n !== undefined && (
          <span className="text-[15px] font-extrabold text-white/25 tabular-nums shrink-0 leading-tight">{n}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[14.5px] font-bold text-white leading-snug">{titulo}</span>
            {etiqueta && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold text-text-secondary bg-white/[0.06] shrink-0">
                {etiqueta}
              </span>
            )}
          </span>
          {resumo && <span className={`block text-[12px] text-text-secondary leading-relaxed mt-1 ${LEITURA}`}>{resumo}</span>}
        </span>
        <span className="text-[15px] text-text-secondary shrink-0 leading-none mt-1">{aberto ? '▴' : '▾'}</span>
      </button>
      {aberto && <div className="px-4 pb-4 pt-1 pl-[30px]">{children}</div>}
    </div>
  );
}

function Secao({ id, titulo, hint, children }: {
  id?: string; titulo: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="al-card relative overflow-hidden p-4 sm:p-5 scroll-mt-20">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em] mb-3">{titulo}</h2>
      {hint && <p className={`text-[11px] text-text-secondary -mt-2 mb-3 ${LEITURA}`}>{hint}</p>}
      {children}
    </section>
  );
}

/**
 * Um trecho que não é fala de ninguém — "CRM: 8 dias sem toque · WhatsApp:
 * conversa às 18h02" — é anotação da análise, não citação. Apresentar isso
 * entre aspas e em itálico, como se o cliente tivesse dito, é o que faz o
 * relatório soar incongruente para quem conhece a conversa de verdade.
 */
const PARECE_ANOTACAO = /CRM:|WhatsApp:|whatsapp:|→|\bdias sem\b|\bsem toque\b|^\s*\[/;

function Citacao({ c, mostrarLead = true }: { c: TCitacao; mostrarLead?: boolean }) {
  if (!c.trecho) return null;
  const rodape = [mostrarLead ? c.lead : '', c.data ? fmtYmd(c.data) : '', c.de && c.de !== 'corretor' ? c.de : '']
    .filter(Boolean).join(' · ');

  if (PARECE_ANOTACAO.test(c.trecho)) {
    return (
      <div className={`my-2 rounded-lg border border-white/[0.09] bg-white/[0.02] px-3 py-2 ${LEITURA}`}>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">
          anotação da análise — não é fala do cliente
        </p>
        <p className="text-[12px] text-white/80 leading-relaxed">{c.trecho}</p>
        {rodape && <p className="text-[10.5px] text-text-secondary font-bold mt-1">{rodape}</p>}
      </div>
    );
  }
  return (
    <blockquote className={`my-2 pl-3 border-l-2 border-[#E8C547]/50 bg-white/[0.03] rounded-r-lg py-2 pr-3 ${LEITURA}`}>
      <p className="text-[12.5px] text-white/90 italic leading-relaxed">“{c.trecho}”</p>
      {rodape && <p className="text-[10.5px] text-text-secondary font-bold mt-1.5">{rodape}</p>}
    </blockquote>
  );
}

/** Duas citações provam o padrão; cinco variações do mesmo erro só cansam. */
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
    <div className={`mt-2 rounded-xl border border-dashed border-[#E8C547]/40 bg-[#E8C547]/[0.05] p-3 ${LEITURA}`}>
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

/**
 * Corta na primeira frase, para o resumo do acordeão caber numa linha.
 *
 * Ponto dentro de aspas não termina frase — a análise cita o cliente o tempo
 * todo, e cortar ali produzia resumo que não diz nada: `Em 28/07 ele
 * respondeu "Vou dar uma olhadinha.`. Frase curta demais também não serve de
 * resumo, então segue para a próxima até dar corpo.
 */
function primeiraFrase(t: string, max = 130, min = 55): string {
  if (!t) return '';
  const p = t.replace(/\s+/g, ' ').trim();

  let aspas = false;
  let corte = -1;
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '"' || c === '“' || c === '”') aspas = !aspas;
    if (aspas || !'.!?'.includes(c)) continue;
    const prox = p[i + 1];
    if (prox && prox !== ' ') continue;
    if (i + 1 >= min) { corte = i + 1; break; }
  }

  const frase = corte > 0 ? p.slice(0, corte) : p;
  return frase.length <= max ? frase : frase.slice(0, max).replace(/\s\S*$/, '') + '…';
}

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
   * perguntas preparadas não podem estar à vista.
   */
  const [modoTela, setModoTela] = useState<'gestor' | 'corretor'>('gestor');
  const [mostrarProva, setMostrarProva] = useState(false);
  const soEu = modoTela === 'gestor';
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeNovo, setNomeNovo] = useState(r.corretorNome || '');

  const a = useMemo(() => asObj(r?.analise), [r]);
  const temAnalise = Object.keys(a).length > 0;

  /** Uma estrutura só, venha o relatório no formato antigo ou no novo. */
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

  const destaques = asObj(rel.legado.destaques);
  const combinado = rel.legado.combinado;
  const metas = useMemo(() => asArr(combinado.metas), [combinado]);
  const paradosPrazo = asArr(combinado.leads_parados_alem_do_prazo);
  const descartesExplicar = asArr(combinado.descartes_a_explicar);
  const fichaIncompleta = asArr(combinado.ficha_incompleta);
  const naoCombinado = asArr(combinado.o_que_nao_foi_combinado).map((x) => String(x));

  const v = rel.veredito;
  const aTratar = v.processo + v.naoFez;

  /**
   * O TERCEIRO NÚMERO DA CAPA é escolhido, não fixo.
   *
   * Mostrar as cinco metas na abertura é o que produzia a parede. Só uma
   * importa para começar a conversa: a que está mais longe de ser batida.
   * As outras continuam inteiras no retrato, dentro da prova.
   */
  const metaPior = useMemo(() => {
    const cand = metas
      .map((m) => ({ m, meta: asNum(m.meta), feito: asNum(m.realizado) }))
      .filter((x) => x.meta !== null && x.meta > 0 && x.m.avaliavel !== false && x.feito !== null)
      .map((x) => ({ ...x, pct: x.feito! / x.meta! }))
      .sort((x, y) => x.pct - y.pct);
    return cand[0] ?? null;
  }, [metas]);

  const temProva = indicadores.length > 0 || rel.leads.length > 0 || metas.length > 0
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

      <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-20 pt-5 space-y-3 no-print">

        {/* ═══════════ A CAPA — cabe numa tela ═══════════ */}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="al-display text-[20px] font-bold text-white uppercase tracking-[0.1em] truncate">{r.corretorNome}</h1>
              {onRenomear && (
                <button onClick={() => setEditandoNome((x) => !x)} title="corrigir o nome do corretor"
                  className="text-text-secondary hover:text-white text-[13px]">✎</button>
              )}
            </div>
            <p className="text-[11.5px] text-text-secondary tabular-nums">
              {fmtYmd(r.periodoInicio)} a {fmtYmd(r.periodoFim)}
              {r.versaoDiretrizes && ` · régua ${r.versaoDiretrizes}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/admin/auditoria/historico/" className={btnGhost}>← Histórico</Link>
            <button
              onClick={() => setModoTela(soEu ? 'corretor' : 'gestor')}
              title={soEu ? 'esconde o risco, as perguntas do 1:1 e o que a casa precisa destravar' : 'volta a mostrar tudo'}
              className={soEu ? btnGhost : 'px-3 py-2 rounded-xl text-[12px] font-bold border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors'}>
              {soEu ? '👥 Ver com o corretor' : '✓ Modo reunião'}
            </button>
            <button onClick={() => imprimir('gestor')} className={btnGhost}>🖨 Gestor</button>
            <button onClick={() => imprimir('corretor')} className={btnOuro}>📄 Corretor</button>
          </div>
        </div>

        {!soEu && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.08] px-4 py-2 flex flex-wrap items-center gap-2">
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

        {/* o problema e o que muda — as duas únicas frases da capa */}
        <section className="al-card relative overflow-hidden p-5">
          <div className="absolute inset-x-0 top-0 gx-line" />
          {rel.gargalo && (
            <>
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-rose-300/80 mb-1.5">O problema</p>
              <p className={`text-[16px] font-bold text-white leading-relaxed ${LEITURA}`}>{rel.gargalo}</p>
            </>
          )}
          {rel.instrucao && (
            <div className="mt-4 pt-4 border-t border-white/[0.08]">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#E8C547]/80 mb-1.5">
                O que muda a partir de amanhã{PRAZO_LEGIVEL[rel.prazoInstrucao] ? ` · ${PRAZO_LEGIVEL[rel.prazoInstrucao]}` : ''}
              </p>
              <p className={`text-[14px] text-white/90 leading-relaxed ${LEITURA}`}>{rel.instrucao}</p>
            </div>
          )}
        </section>

        {/* TRÊS números. Os outros 290 estão no retrato, dentro da prova. */}
        <div className="grid grid-cols-3 gap-2">
          {rel.cobertura.lidas !== null && (
            <div className="al-card px-3 py-2.5">
              <p className="text-[19px] font-extrabold text-white tabular-nums leading-none">{fmtNum(rel.cobertura.lidas)}</p>
              <p className="text-[10.5px] text-text-secondary leading-snug mt-1">
                conversas lidas de {fmtNum(rel.cobertura.naAmostra)}
              </p>
            </div>
          )}
          {v.ok + aTratar > 0 && (
            <div className="al-card px-3 py-2.5">
              <p className={`text-[19px] font-extrabold tabular-nums leading-none ${aTratar > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                {fmtNum(aTratar)}
              </p>
              <p className="text-[10.5px] text-text-secondary leading-snug mt-1">
                clientes com algo a tratar · {v.ok} em ordem
              </p>
            </div>
          )}
          {metaPior && (
            <div className="al-card px-3 py-2.5">
              <p className={`text-[19px] font-extrabold tabular-nums leading-none ${metaPior.pct >= 1 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {fmtNum(metaPior.feito)}<span className="text-[13px] text-text-secondary"> / {fmtNum(metaPior.meta)}</span>
              </p>
              <p className="text-[10.5px] text-text-secondary leading-snug mt-1">
                {asStr(metaPior.m.indicador).replace(/_/g, ' ').toLowerCase()} · a meta mais distante
              </p>
            </div>
          )}
        </div>

        {/* ═══════════ OS PONTOS — um assunto por vez ═══════════ */}
        {rel.achados.length > 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-text-secondary px-1">
              O que muda · {rel.achados.length} ponto{rel.achados.length === 1 ? '' : 's'} · clique para abrir
            </p>
            {rel.achados.map((ac, i) => {
              const est = VEREDITO[ac.estado as ChaveVeredito];
              return (
                <Dobra key={i} n={i + 1}
                  titulo={ac.titulo || `Ponto ${i + 1}`}
                  tom={ac.estado === 'nao_fez' ? 'ruim' : 'neutro'}
                  etiqueta={ac.quantosLeads !== null ? `${fmtNum(ac.quantosLeads)} clientes` : est?.txt}
                  resumo={primeiraFrase(ac.oQueCustou) || primeiraFrase(ac.oQueAconteceu)}>
                  {ac.oQueAconteceu && (
                    <p className={`text-[12.5px] text-white/85 leading-relaxed mb-1 ${LEITURA}`}>{ac.oQueAconteceu}</p>
                  )}
                  <Citacoes lista={ac.citacoes} />
                  {ac.oQueCustou && (
                    <p className={`text-[12.5px] text-white/85 leading-relaxed mb-1 mt-2 ${LEITURA}`}>
                      <b className="text-rose-300">O que custou.</b> {ac.oQueCustou}
                    </p>
                  )}
                  {ac.oQueFazer && (
                    <p className={`text-[12.5px] text-white/85 leading-relaxed ${LEITURA}`}>
                      <b className="text-emerald-300">O que fazer no lugar.</b> {ac.oQueFazer}
                    </p>
                  )}
                  <MensagemPronta rotulo="modelo" texto={ac.mensagemPronta} />
                </Dobra>
              );
            })}
          </div>
        )}

        {/* ═══════════ AMANHÃ DE MANHÃ ═══════════ */}
        {rel.fila.length > 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-text-secondary px-1">
              Amanhã de manhã · nesta ordem
            </p>
            {rel.fila.map((f, i) => {
              const t = TEMPERATURA[asStr(f.temperatura).toLowerCase()] || TEMPERATURA.frio;
              const dias = asNum(f.esfria_em_dias);
              const urgente = dias !== null && dias <= 3;
              const valor = asNum(f.valor_em_jogo);
              return (
                <Dobra key={i} n={asNum(f.posicao) ?? i + 1}
                  titulo={asStr(f.lead) || 'lead'}
                  tom={urgente ? 'ruim' : 'neutro'}
                  etiqueta={[
                    `${t.simb} ${asStr(f.temperatura)}`,
                    valor !== null ? fmtDinheiro(valor) : '',
                    dias !== null ? `esfria em ${dias}d` : '',
                  ].filter(Boolean).join(' · ')}
                  resumo={primeiraFrase(asStr(f.por_que_agora))}>
                  {asStr(f.por_que_agora) && (
                    <p className={`text-[12.5px] text-white/85 leading-relaxed ${LEITURA}`}>{asStr(f.por_que_agora)}</p>
                  )}
                  <MensagemPronta rotulo="mensagem pronta" texto={asStr(f.mensagem_pronta)} />
                </Dobra>
              );
            })}
          </div>
        )}

        {/* ═══════════ O QUE ELE FAZ BEM ═══════════ */}
        {(rel.acertos.length > 0 || asStr(destaques.observacao)) && (
          <div className="pt-2">
            <Dobra titulo="O que você faz bem" tom="bom"
              etiqueta={rel.acertos.length ? `${rel.acertos.length}` : undefined}
              resumo={primeiraFrase(asStr(destaques.observacao))
                || 'Manter e replicar — é daqui que sai o material de treino do time.'}>
              {asStr(destaques.observacao) && (
                <p className={`text-[12.5px] text-white/85 leading-relaxed mb-3 ${LEITURA}`}>{asStr(destaques.observacao)}</p>
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
                      <p className={`text-[12px] text-text-secondary leading-relaxed ${LEITURA}`}>
                        <b className="text-white/80">Por que funciona:</b> {ac.porQue}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Dobra>
          </div>
        )}

        {/* o que a casa deve antes de cobrar — os dois veem */}
        {rel.naoEDele.length > 0 && (
          <Dobra titulo="Nem tudo é do corretor" etiqueta={`${rel.naoEDele.length}`}
            resumo="O que a casa precisa assumir antes de cobrar dele.">
            <ul className="space-y-2">
              {rel.naoEDele.map((n, i) => (
                <li key={i} className={`text-[12.5px] text-white/85 leading-relaxed ${LEITURA}`}>
                  <span className="text-text-secondary">•</span> <b className="text-white/70">{asStr(n.lead) || asStr(n.tipo).replace(/_/g, ' ')}</b> — {asStr(n.descricao)}
                </li>
              ))}
            </ul>
          </Dobra>
        )}

        {/* ═══════════ SÓ O GESTOR ═══════════ */}
        {soEu && (rel.risco.length > 0 || rel.perguntas.length > 0 || rel.destravar.length > 0) && (
          <div className="pt-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-text-secondary">Só você vê · não sai no PDF do corretor</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {rel.perguntas.length > 0 && (
              <Dobra titulo="Perguntas para abrir a conversa" etiqueta={`${rel.perguntas.length}`}
                resumo={primeiraFrase(rel.perguntas[0])}>
                <ol className="space-y-2">
                  {rel.perguntas.map((p, i) => (
                    <li key={i} className={`text-[12.5px] text-white/90 leading-relaxed ${LEITURA}`}>
                      <span className="text-[#E8C547]/60 font-bold mr-1.5">{i + 1}.</span>{p}
                    </li>
                  ))}
                </ol>
              </Dobra>
            )}

            {rel.risco.length > 0 && (
              <Dobra titulo="Risco para a imobiliária" tom="ruim" etiqueta={`${rel.risco.length}`}
                resumo="Cada ocorrência traz o trecho literal — sem prova, não se registra.">
                {rel.risco.map((o, i) => (
                  <div key={i}>
                    <Citacao c={o} />
                    {o.porQue && <p className={`text-[11.5px] text-text-secondary -mt-1 mb-2 leading-relaxed ${LEITURA}`}>{o.porQue}</p>}
                  </div>
                ))}
              </Dobra>
            )}

            {rel.destravar.length > 0 && (
              <Dobra titulo="O que VOCÊ precisa destravar" etiqueta={`${rel.destravar.length}`}
                resumo="O corretor não resolve isso sozinho.">
                <Tabela cols={['Tipo', 'O que travou', 'Responsável']}>
                  {rel.destravar.map((d, i) => (
                    <tr key={i}>
                      <td className={td + ' text-[#E8C547] font-bold whitespace-nowrap'}>{TIPO_DESTRAVE[asStr(d.tipo)] || asStr(d.tipo)}</td>
                      <td className={td + ' text-white/85 leading-relaxed'}>{asStr(d.descricao)}</td>
                      <td className={td + ' text-text-secondary whitespace-nowrap'}>{asStr(d.responsavel_sugerido) || '—'}</td>
                    </tr>
                  ))}
                </Tabela>
              </Dobra>
            )}
          </div>
        )}

        {/* ═══════════ A PROVA ═══════════ */}
        {temProva && (
          <div className="pt-3 space-y-3">
            <button
              onClick={() => setMostrarProva((x) => !x)}
              className="w-full al-card px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors text-left">
              <span>
                <span className="al-display text-[12.5px] font-bold text-white uppercase tracking-[0.1em]">
                  {mostrarProva ? 'Esconder os números' : 'Ver todos os números'}
                </span>
                <span className={`block text-[11px] text-text-secondary mt-0.5 ${LEITURA}`}>
                  As metas, os {indicadores.length} indicadores linha a linha, cliente por cliente e as ressalvas.
                  {' '}É consulta — para quando alguém perguntar de onde saiu um número.
                </span>
              </span>
              <span className="text-[18px] text-text-secondary shrink-0">{mostrarProva ? '▴' : '▾'}</span>
            </button>

            {mostrarProva && (
              <>
                <GraficosRodada rel={rel} indicadores={indicadores} porGrupo={porGrupo} />

                {indicadores.length > 0 && (
                  <Secao id="quadro" titulo="Os números, linha a linha"
                    hint={quadroDoSistema
                      ? 'Calculado pelo CRM contra a régua da casa — a mesma conta em toda rodada.'
                      : 'Rodada antiga: os valores vieram do relatório, mas a régua é a da casa.'}>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[11.5px]">
                      {(['verde', 'amarelo', 'vermelho', 'nd'] as const).map((k) => {
                        const q = indicadores.filter((i) => i.status === k).length;
                        if (!q) return null;
                        return <span key={k} className="text-text-secondary">{BOLA_STATUS[k]} <b className="text-white tabular-nums">{q}</b></span>;
                      })}
                      {indicadores.some((i) => i.origemReferencia === 'mercado') && (
                        <span className="text-[10.5px] text-white/40">status vermelho só contra o que a casa combinou</span>
                      )}
                    </div>

                    {/* de onde vem cada número: sem isto o gestor lê um percentual
                        da amostra como se fosse da carteira — e a amostra é
                        sorteada de propósito nas faixas mais críticas */}
                    <p className={`text-[10.5px] text-text-secondary mb-3 leading-relaxed ${LEITURA}`}>
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

                {rel.leads.length > 0 && (
                  <Secao id="leads" titulo="Cliente por cliente"
                    hint={rel.leadsSemAchado !== null
                      ? `${rel.leads.length} clientes na lista. Outros ${rel.leadsSemAchado} foram lidos e estavam em ordem.`
                      : `${rel.leads.length} clientes, um por linha.`}>
                    <Tabela cols={['Cliente', '', 'Etapa no CRM', 'Etapa real', 'Sem toque', 'O que travou']}>
                      {rel.leads.map((l, i) => {
                        const vd = VEREDITO[l.veredito as ChaveVeredito];
                        const divergiu = !!l.etapaReal && !!l.etapaCrm && l.etapaReal !== l.etapaCrm;
                        return (
                          <tr key={i}>
                            <td className={td + ' text-white font-bold whitespace-nowrap'}>{l.lead}</td>
                            <td className={td + ' whitespace-nowrap'} title={vd?.txt}>{vd ? <span className={vd.cor + ' font-bold'}>{vd.simb}</span> : '—'}</td>
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
                          {naoCombinado.map((s, i) => <li key={i} className={`text-[12px] text-white/80 leading-relaxed ${LEITURA}`}>• {s}</li>)}
                        </ul>
                        <Link href="/dashboard/admin/auditoria/diretrizes/" className="inline-block mt-2 text-[11px] font-bold text-[#E8C547] hover:brightness-125">
                          definir na régua →
                        </Link>
                      </div>
                    )}
                  </Secao>
                )}

                {rel.ressalvas.length > 0 && (
                  <Secao id="ressalvas" titulo="Ressalvas" hint="O que não foi possível verificar, e por quê.">
                    <ul className="space-y-1.5">
                      {rel.ressalvas.map((s, i) => <li key={i} className={`text-[11.5px] text-text-secondary leading-relaxed ${LEITURA}`}>• {s}</li>)}
                    </ul>
                  </Secao>
                )}
              </>
            )}
          </div>
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
