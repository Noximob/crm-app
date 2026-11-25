'use client';

/**
 * A TELA DA CAPTAÇÃO — uma coluna só: o painel de filtros em cima e a lista
 * embaixo, por imóvel, prédio, construtora ou imobiliária.
 *
 * É o painel original (Desktop/Captação Penha) com a cara do Alumma: as regras
 * moram em lib/captacaoPenha.ts e são conferidas contra o original no teste.
 * Aqui fica o estado da tela e o que depende de rolagem — lembrando que no
 * dashboard quem rola é o <main>, não a janela.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GRUPO_PLURAL, GRUPO_SINGULAR, ORDEM_ROTULO, agrupar, aprontar, contar, contarAbas, curto, dma, etiquetas, filtroInicial, listar, mediana, num,
  ordenarGrupos, planilha, temFiltro,
  type BaseCaptacao, type Filtro, type Ordem, type OrdemGrupo, type TipoGrupo,
} from '@/lib/captacaoPenha';
import { showToast } from '@/components/ui/toast';
import Filtros, { campoCls, type Muda } from './Filtros';
import Cartao, { type Ir } from './Cartao';
import Grupos from './Grupos';
import type { Marcas } from './useMarcas';

type Aba = 'im' | TipoGrupo;
const ABAS: [Aba, string][] = [['im', 'Imóveis'], ['emp', 'Prédios'], ['con', 'Construtoras'], ['imob', 'Imobiliárias']];
/** quantos cartões entram de cada vez */
const PASSO = 48;
const link = 'font-bold text-[#FF7A97] underline underline-offset-2 hover:text-[#FF9EB5]';

export default function Painel({ base, marcas }: { base: BaseCaptacao; marcas: Marcas }) {
  const { excluidos, notas, excluir: marcarExcluido, devolver: desmarcarExcluido, anotar: guardarNota } = marcas;
  const [S, setS] = useState<Filtro>(filtroInicial);
  const [ordem, setOrdem] = useState<Ordem>('cap');
  const [aba, setAba] = useState<Aba>('im');
  const [limite, setLimite] = useState(PASSO);
  // dentro das abas Prédios / Construtoras / Imobiliárias: o que se procurou e a ordem
  const [gq, setGq] = useState('');
  const [gordem, setGordem] = useState<OrdemGrupo>('n');

  const F = useMemo(() => aprontar(S), [S]);
  const lista = useMemo(() => listar(base, F, excluidos, ordem), [base, F, excluidos, ordem]);
  const cont = useMemo(() => contar(base, F, excluidos), [base, F, excluidos]);
  const nAbas = useMemo(() => contarAbas(lista), [lista]);
  const grupos = useMemo(() => (aba === 'im' ? null : agrupar(aba, lista, base.meta)), [aba, lista, base]);
  const linhas = useMemo(() => (grupos ? ordenarGrupos(grupos, gq, gordem) : []), [grupos, gq, gordem]);
  const comNome = useMemo(() => (grupos ? grupos.filter((r) => !r.none).length : 0), [grupos]);
  const precoDoMeio = useMemo(() => mediana(lista.map((it) => it.p).filter(Boolean) as number[]), [lista]);
  const ligado = temFiltro(S);
  const nExcluidos = Object.keys(excluidos).length;
  const chips = etiquetas(S);

  // toda mudança de filtro volta a lista pro começo (os primeiros 48)
  const muda: Muda = useCallback((fn, paraImoveis) => {
    setS(fn);
    setLimite(PASSO);
    if (paraImoveis) setAba('im');
  }, []);
  const limpar = useCallback(() => { setS(filtroInicial()); setLimite(PASSO); }, []);
  /** O "×" de uma etiqueta: tira aquele prédio, construtora ou imobiliária — ou sai da lista de excluídos. */
  const tirar = (t: ['hid'] | ['em' | 'co' | 'an', string]) => muda((s) => {
    if (t.length === 1) return { ...s, hid: false };
    const marcados = { ...s[t[0]] };
    delete marcados[t[1]];
    return { ...s, [t[0]]: marcados };
  });

  // ---------- rolagem (quem rola é o <main> do dashboard) ----------
  const raiz = useRef<HTMLDivElement>(null);
  const refEtiquetas = useRef<HTMLDivElement>(null);
  const refAbas = useRef<HTMLDivElement>(null);
  const refSaida = useRef<HTMLDivElement>(null);
  const rolagem = useCallback((): HTMLElement | null => (raiz.current ? raiz.current.closest('main') : null), []);
  const ate = useCallback((el: HTMLElement | null, folga: number) => {
    const m = rolagem();
    if (!m || !el) return;
    m.scrollTo({ top: Math.max(0, m.scrollTop + el.getBoundingClientRect().top - m.getBoundingClientRect().top - folga), behavior: 'smooth' });
  }, [rolagem]);
  // pedido de rolagem feito junto com uma mudança de filtro: só rola depois que a tela nova existe
  const [rolar, setRolar] = useState<{ para: 'etiquetas' | 'topo'; vez: number } | null>(null);
  useEffect(() => {
    if (!rolar) return;
    if (rolar.para === 'topo') { const m = rolagem(); if (m) m.scrollTo({ top: 0, behavior: 'smooth' }); }
    else ate(refEtiquetas.current, 12);
  }, [rolar, rolagem, ate]);

  /** Clicou num prédio, construtora ou imobiliária: mostra os imóveis dele e leva a tela até a etiqueta. */
  const ir: Ir = useCallback((chave, valor) => {
    muda((s) => ({ ...s, [chave]: { [valor]: 1 } }), true);
    setRolar({ para: 'etiquetas', vez: Date.now() });
  }, [muda]);
  const verExcluidos = () => { muda((s) => ({ ...s, hid: true }), true); setRolar({ para: 'topo', vez: Date.now() }); };

  // ---------- excluir (com desfazer) e anotar ----------
  const [desfazer, setDesfazer] = useState<string | null>(null);
  const relogioDesfazer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(relogioDesfazer.current), []);
  const excluir = useCallback((id: string) => {
    marcarExcluido(id);
    setDesfazer(id);
    clearTimeout(relogioDesfazer.current);
    relogioDesfazer.current = setTimeout(() => setDesfazer(null), 7000);
  }, [marcarExcluido]);
  const devolver = useCallback((id: string) => {
    desmarcarExcluido(id);
    setDesfazer(null);
    showToast('Anúncio de volta à lista.', 'success');
  }, [desmarcarExcluido]);
  const anotar = useCallback((id: string, texto: string) => {
    guardarNota(id, texto);
    showToast(texto.trim() ? 'Anotação guardada.' : 'Anotação apagada.', 'success');
  }, [guardarNota]);
  // devolveu o último excluído: volta pra lista normal
  useEffect(() => { if (S.hid && nExcluidos === 0) setS((s) => ({ ...s, hid: false })); }, [S.hid, nExcluidos]);

  // ---------- botão flutuante: lá embaixo volta aos filtros; com filtro ligado e a lista fora da tela (celular), leva até ela ----------
  const [fab, setFab] = useState<'sobe' | 'desce' | null>(null);
  const medir = useCallback(() => {
    const m = rolagem();
    if (!m) return;
    if (m.scrollTop >= 700) { setFab('sobe'); return; }
    const saida = refSaida.current;
    setFab(ligado && saida && saida.getBoundingClientRect().top > m.getBoundingClientRect().bottom - 80 ? 'desce' : null);
  }, [rolagem, ligado]);
  useEffect(() => {
    const m = rolagem();
    if (!m) return;
    m.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => { m.removeEventListener('scroll', medir); window.removeEventListener('resize', medir); };
  }, [rolagem, medir]);
  useEffect(() => { medir(); }, [medir, lista.length, aba, limite, chips.length]);
  const aoFab = () => {
    if (fab === 'desce') {
      const el = document.activeElement as HTMLElement | null;
      if (el && el.blur) el.blur();
      ate(refAbas.current, 10);
    } else { const m = rolagem(); if (m) m.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  const exportar = () => {
    const blob = new Blob([planilha(lista, notas, base.FT)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'imoveis-prontos-penha.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  // ---------- o que aparece ----------
  const n = lista.length;
  const mostrados = aba === 'im' ? lista.slice(0, limite) : [];
  const linhasMostradas = aba === 'im' ? [] : linhas.slice(0, limite * 2);
  const restantes = aba === 'im' ? Math.max(0, n - limite) : linhas.length - linhasMostradas.length;
  const extras: React.ReactNode[] = [];
  if (aba === 'im') {
    if (S.mar != null) extras.push('só entram anúncios que dizem a distância do mar');
    if (S.dmin != null || S.dmax != null) extras.push('só entram anúncios com data de publicação');
    if (nExcluidos && !S.hid) extras.push(<button type="button" onClick={verExcluidos} className={link}>{num(nExcluidos)}{nExcluidos === 1 ? ' excluído' : ' excluídos'} por você (ver)</button>);
  }
  const C = base.meta.cob;

  return (
    <div ref={raiz} className="mx-auto w-full max-w-[1380px] p-2 sm:p-3 pb-24">
      <div className="mb-4">
        <span className="gx-tag mb-2 inline-flex"><span>Captação</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Captação Penha</h1>
        <p className="text-text-secondary text-[12.5px] mt-0.5">Imóveis prontos e terrenos à venda em Penha/SC · varredura de {dma(base.meta.scan)}</p>
      </div>

      <Filtros base={base} S={S} cont={cont} total={n} muda={muda} limpar={limpar} />

      {/* etiquetas: prédio, construtora ou imobiliária escolhidos, e a lista de excluídos */}
      <div ref={refEtiquetas} className={chips.length ? 'mt-3 flex flex-wrap items-center gap-1.5' : ''}>
        {chips.map((c) => (
          <span key={c.tira.join('|')} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#E8C547]/50 bg-[#E8C547]/[0.12] py-1 pl-3 pr-1.5 text-[12.5px] text-[#FFE9A6]">
            <span className="truncate">{c.rotulo}</span>
            <button type="button" aria-label={`Tirar ${c.rotulo}`} onClick={() => tirar(c.tira)}
              className="grid h-5 w-5 place-items-center rounded-full text-[15px] leading-none hover:bg-[#E8C547]/25">×</button>
          </span>
        ))}
      </div>

      <div className="mt-3.5 mb-2 flex flex-wrap items-center gap-2.5">
        <div ref={refAbas} role="tablist" aria-label="Ver por" className="flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] p-1 [scrollbar-width:none] md:w-auto">
          {ABAS.map(([t, nome]) => (
            <button key={t} type="button" role="tab" aria-selected={aba === t}
              onClick={() => { setAba(t); setGq(''); setLimite(PASSO); }}
              className={`al-display flex-1 whitespace-nowrap rounded-lg px-1 py-2 text-[13px] font-bold uppercase tracking-[0.04em] sm:px-2 sm:tracking-[0.08em] md:flex-none md:px-4 md:text-[14px] md:tracking-[0.1em] ${aba === t
                ? 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white shadow-[0_0_16px_rgba(255,30,86,0.45)]' : 'text-text-secondary hover:text-white'}`}>
              {nome}<i className="ml-1.5 hidden text-[11.5px] font-bold not-italic opacity-75 tabular-nums md:inline">{num(nAbas[t])}</i>
            </button>
          ))}
        </div>
        {aba === 'im' && (
          <select value={ordem} onChange={(e) => { setOrdem(e.target.value as Ordem); setLimite(PASSO); }} aria-label="Ordenar"
            className={`${campoCls} md:ml-auto md:!w-auto`}>
            {ORDEM_ROTULO.map(([v, nome]) => <option key={v} value={v}>{nome}</option>)}
          </select>
        )}
      </div>

      <p className="mb-3 text-[13px] text-text-secondary" aria-live="polite">
        {aba === 'im' ? (
          <>
            {n > 0 && <><b className="text-white tabular-nums">{num(n)}</b> {n === 1 ? 'imóvel' : 'imóveis'}{precoDoMeio ? ' · preço do meio ' + curto(precoDoMeio) : ''}</>}
            {extras.map((x, i) => <React.Fragment key={i}>{(n > 0 || i > 0) && ' · '}{x}</React.Fragment>)}
          </>
        ) : (
          <>
            <b className="text-white tabular-nums">{num(comNome)}</b> {comNome === 1 ? GRUPO_SINGULAR[aba] : GRUPO_PLURAL[aba]}
            {n === 1 ? <> no <b className="text-white">1</b> imóvel</> : <> nos <b className="text-white tabular-nums">{num(n)}</b> imóveis</>} do filtro. Toque num nome para ver os imóveis.
          </>
        )}
      </p>

      <div ref={refSaida}>
        {aba !== 'im' ? (
          <Grupos key={aba} tipo={aba} linhas={linhasMostradas} ordem={gordem} aoProcurar={setGq} aoOrdenar={setGordem} ir={ir} />
        ) : n === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-[14px] text-text-secondary">
            {S.hid ? 'Você não excluiu nenhum anúncio.'
              : Object.keys(S.st).length ? 'Nenhum imóvel com esses filtros. Apague um dos campos acima ou toque em "Limpar tudo".'
                : 'Marque pelo menos uma situação (pronto confirmado, provável pronto, terreno ou a confirmar).'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {mostrados.map((it) => (
              <Cartao key={it.i} it={it} base={base} excluido={!!excluidos[it.i]} nota={notas[it.i] || ''} ir={ir} excluir={excluir} devolver={devolver} anotar={anotar} />
            ))}
          </div>
        )}
      </div>

      {restantes > 0 && (
        <div className="mt-5 mb-2 flex justify-center">
          <button type="button" onClick={() => setLimite((l) => l + PASSO)}
            className="al-cta rounded-xl bg-gradient-to-r from-[#FF1E56] to-[#A50D38] px-5 py-2.5 text-[13.5px] font-bold text-white shadow-[0_8px_24px_-10px_rgba(255,30,86,0.6)] hover:brightness-110 active:scale-[0.98]">
            Mostrar mais ({num(restantes)} restantes)
          </button>
        </div>
      )}
      <p className="mt-4 text-center text-[13px]">
        <button type="button" onClick={exportar} className={link}>Exportar esta lista para planilha</button>
      </p>

      <details className="mt-6 max-w-[980px] text-[12.5px] leading-relaxed text-text-secondary [&_b]:font-semibold [&_b]:text-white/90 [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-white [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-[18px]">
        <summary className="cursor-pointer py-1.5 text-[13px] font-semibold text-white">Como ler este painel</summary>
        <h3>Como usar os filtros</h3>
        <ul>
          <li><b>Preço</b>: digite do jeito que se fala. &quot;500&quot; vira 500 mil, &quot;1,5&quot; vira 1,5 milhão; também vale &quot;850 mil&quot;, &quot;2 mi&quot; ou o número inteiro. Ao sair do campo, o valor aparece completo para você conferir.</li>
          <li>Pode preencher só um dos lados: só &quot;de&quot; = a partir de; só &quot;até&quot; = no máximo.</li>
          <li><b>Distância do mar</b>: em metros. Vale o que o anúncio escreve; quem não informa fica de fora quando o campo está preenchido. &quot;0&quot; mostra só os que dizem frente mar.</li>
          <li><b>Anunciado há</b>: em dias, contando da primeira publicação encontrada até o dia da varredura. &quot;de 180&quot; mostra os que estão há 6 meses ou mais; &quot;até 30&quot; mostra os do último mês. Em parte dos anúncios a data é estimada, e alguns portais não mostram data.</li>
          <li><b>Particular</b>: anúncio de pessoa física, direto com o dono. <b>Imobiliária</b>: tem pelo menos um anúncio de imobiliária, corretor ou construtora.</li>
          <li><b>Situação</b>: o que está marcado aparece na lista. &quot;Pronto confirmado&quot; = o anúncio diz que está pronto, mobiliado, alugado ou averbado, ou o prédio já foi entregue. &quot;Provável pronto&quot; = descrito sem menção a obra ou entrega futura. &quot;A confirmar&quot; = faltou informação no anúncio; vem desmarcado.</li>
          <li>Na busca, digite o nome de um prédio, construtora, bairro ou imobiliária e escolha na lista que aparece. Uma palavra solta procura no texto dos anúncios.</li>
          <li>&quot;Excluir&quot; tira o anúncio da lista (por exemplo, quando ele não existe mais). Dá para desfazer na hora ou depois, em &quot;excluídos por você&quot;.</li>
          <li>Os anúncios que você exclui e as suas anotações ficam na sua conta: acompanham você no computador e no celular, e cada pessoa só vê os seus.</li>
        </ul>
        <h3>De onde vieram os dados</h3>
        <ul>{base.meta.fontes.map((f) => <li key={f[0]}><b>{f[0]}</b>: {f[1]}</li>)}</ul>
        <h3>Prédio e construtora</h3>
        <ul>
          <li>O prédio, condomínio ou loteamento foi identificado em <b>{num(C.emp)}</b> imóveis ({num(C.aptosEmp)} dos {num(C.aptos)} apartamentos). Em {num(C.end)} deles o anúncio esconde o nome e o prédio foi descoberto pelo endereço.</li>
          <li>A construtora ({num(C.con)} imóveis) vem da incorporadora cadastrada no DWV, do que os anúncios dizem e de pesquisa na internet.</li>
          <li>O &quot;m² típico&quot; citado nos cartões é o valor do meio (mediana) entre os imóveis desta base, do mesmo prédio ou do mesmo bairro.</li>
          <li>Ficaram de fora {num(base.meta.fora)} imóveis em planta, obra, lançamento ou de outra cidade e {num(base.meta.mortos)} anúncios parados (sem atualização em 2026).</li>
        </ul>
        <h3>Limites</h3>
        <ul>{base.meta.limites.map((t) => <li key={t}>{t}</li>)}</ul>
      </details>

      {/* aviso de exclusão, com desfazer — fica acima do botão flutuante e da barra do celular */}
      {desfazer && (
        <div role="status" aria-live="polite"
          className="fixed inset-x-0 z-[45] mx-auto w-fit max-w-[min(92vw,520px)] rounded-xl border border-white/15 bg-[#1b1824] px-4 py-2.5 text-center text-[13px] text-white shadow-[0_18px_44px_-14px_rgba(0,0,0,0.9)] bottom-[calc(132px+env(safe-area-inset-bottom))] lg:bottom-[76px]">
          Anúncio excluído da lista.
          <button type="button" onClick={() => { desmarcarExcluido(desfazer); setDesfazer(null); }} className={`ml-2.5 ${link}`}>Desfazer</button>
        </div>
      )}
      {fab && (
        <button type="button" onClick={aoFab}
          className="fixed inset-x-0 z-40 mx-auto w-fit rounded-full bg-gradient-to-r from-[#FF1E56] to-[#A50D38] px-5 py-3 text-[13.5px] font-bold text-white shadow-[0_12px_32px_-10px_rgba(255,30,86,0.7)] bottom-[calc(76px+env(safe-area-inset-bottom))] lg:bottom-5">
          {fab === 'sobe' ? '↑ Filtros' : (aba === 'im' ? `Ver ${num(n)}${n === 1 ? ' imóvel' : ' imóveis'}` : 'Ver a lista') + ' ↓'}
        </button>
      )}
    </div>
  );
}
