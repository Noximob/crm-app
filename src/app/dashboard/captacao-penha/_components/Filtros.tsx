'use client';

/**
 * O PAINEL DE FILTROS — um só, com tudo à vista (decisão do gestor: nada de
 * filtro escondido, gaveta ou faixa pronta).
 *
 *   busca       prédio, construtora, bairro, imobiliária (escolhe na lista que
 *               abre) ou palavra solta, que procura no texto dos anúncios;
 *   linha 1     quem anuncia · preço de/até · quartos de/até · distância do
 *               mar até X m · anunciado há de/até X dias — todos de digitar;
 *   linha 2     tipo · bairro · situação (o que está marcado aparece).
 *
 * Os campos de número valem enquanto a pessoa digita; ao sair do campo o
 * valor aparece arrumado (500 → 500.000) e "de" maior que "até" é trocado.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LEITOR, SITUACAO, SITUACAO_DICA, SUGESTAO_TITULO, confirmarCampo, mostrado, num, sugerir, temFiltro,
  type BaseCaptacao, type CampoNumero, type ChaveSugestao, type Contagens, type Filtro, type Situacao,
} from '@/lib/captacaoPenha';

/** Muda o filtro. `paraImoveis` volta pra aba Imóveis (escolher um nome sempre mostra os imóveis dele). */
export type Muda = (fn: (s: Filtro) => Filtro, paraImoveis?: boolean) => void;

const rotulo = 'block text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-secondary mb-1.5 leading-tight';
export const campoCls = 'h-11 md:h-10 w-full min-w-0 px-3 rounded-xl border border-white/10 bg-white/[0.04] text-[14px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50';
const entre = 'text-[12.5px] text-text-secondary shrink-0';

/** Campo de número: vale enquanto digita (com uma pausa) e se arruma ao sair. */
function Numero({ id, S, muda, ...resto }: { id: CampoNumero; S: Filtro; muda: Muda } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange'>) {
  // null = a pessoa não está mexendo: mostra o que está valendo, arrumado
  const [texto, setTexto] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const relogio = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(relogio.current), []);
  // fora do campo, vale sempre o que está no filtro (ex.: "Limpar tudo" esvazia mesmo um campo que ficou com texto)
  useEffect(() => { if (texto !== null && document.activeElement !== campo.current) setTexto(null); });
  return (
    <input
      {...resto}
      ref={campo}
      autoComplete="off"
      value={texto ?? mostrado(S, id)}
      onChange={(e) => {
        const v = e.target.value;
        setTexto(v);
        clearTimeout(relogio.current);
        relogio.current = setTimeout(() => muda((s) => ({ ...s, [id]: LEITOR[id](v) })), 450);
      }}
      onBlur={() => {
        clearTimeout(relogio.current);
        if (texto === null) return;
        const lido = LEITOR[id](texto);
        muda((s) => confirmarCampo(s, id, lido));
        setTexto(null);
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
      className={`${campoCls} flex-1 basis-0 tabular-nums ${resto.className || ''}`}
    />
  );
}

export default function Filtros({ base, S, cont, total, muda, limpar }: {
  base: BaseCaptacao;
  S: Filtro;
  cont: Contagens;
  /** quantos imóveis estão na lista agora */
  total: number;
  muda: Muda;
  limpar: () => void;
}) {
  // ---------- busca ----------
  const [texto, setTexto] = useState(S.text);
  const [sugAberta, setSugAberta] = useState(false);
  const [telaPequena, setTelaPequena] = useState(false);
  const campoBusca = useRef<HTMLInputElement>(null);
  const caixaBusca = useRef<HTMLDivElement>(null);
  const relogio = useRef<ReturnType<typeof setTimeout>>();

  // o filtro mudou por fora (limpar tudo, tirar uma etiqueta): o campo acompanha — menos enquanto se digita nele
  useEffect(() => {
    if (document.activeElement !== campoBusca.current) setTexto((t) => (t.trim() !== S.text ? S.text : t));
  }, [S.text]);
  useEffect(() => () => clearTimeout(relogio.current), []);

  useEffect(() => {
    const fora = (e: MouseEvent) => { if (caixaBusca.current && !caixaBusca.current.contains(e.target as Node)) setSugAberta(false); };
    // "/" leva pra busca, como no painel original
    const barra = (e: KeyboardEvent) => {
      const onde = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(onde)) { e.preventDefault(); campoBusca.current?.focus(); }
    };
    document.addEventListener('click', fora);
    document.addEventListener('keydown', barra);
    return () => { document.removeEventListener('click', fora); document.removeEventListener('keydown', barra); };
  }, []);
  // no celular o texto de exemplo precisa ser mais curto pra caber
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const ve = () => setTelaPequena(mq.matches);
    ve();
    mq.addEventListener('change', ve);
    return () => mq.removeEventListener('change', ve);
  }, []);

  const sug = useMemo(() => sugerir(base, S.text), [base, S.text]);
  const digita = (v: string) => {
    setTexto(v);
    clearTimeout(relogio.current);
    relogio.current = setTimeout(() => { muda((s) => ({ ...s, text: v.trim() })); setSugAberta(true); }, 220);
  };
  const escolhe = (k: ChaveSugestao, v: string) => {
    clearTimeout(relogio.current);
    setTexto(''); setSugAberta(false); campoBusca.current?.blur();
    muda((s) => ({ ...s, text: '', [k]: { [v]: 1 } }), true);
  };
  const limparTudo = () => { clearTimeout(relogio.current); setTexto(''); setSugAberta(false); limpar(); };

  const tpAtual = Object.keys(S.tp).length === 1 ? Object.keys(S.tp)[0] : '';
  const baAtual = Object.keys(S.ba).length === 1 ? Object.keys(S.ba)[0] : '';
  const quem: ['' | 'P' | 'I', string, number | null, string][] = [
    ['', 'Todos', null, ''],
    ['P', 'Particular', cont.particular, 'min-w-[2.3ch]'],
    ['I', 'Imobiliária', cont.imobiliaria, 'min-w-[4.9ch]'],
  ];

  return (
    <section aria-label="Filtros" className="al-card relative z-20 rounded-2xl p-3.5 sm:p-5">
      {/* a linha do topo fica numa camada própria, recortada no arredondado — o card não pode cortar a lista de sugestões */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"><div className="gx-line" /></div>

      <div className="flex items-center gap-2.5 mb-3">
        <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#FF1E56] to-[#A50D38] shadow-[0_0_8px_rgba(255,30,86,0.5)]" />
        <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Filtros</h2>
        {temFiltro(S) && (
          <button type="button" onClick={limparTudo} className="ml-auto text-[12px] font-bold text-[#FF7A97] hover:underline">Limpar tudo</button>
        )}
      </div>

      <div>
        <label htmlFor="cp-busca" className={rotulo}>Buscar por nome ou palavra</label>
        <div ref={caixaBusca} className="relative min-w-0">
          <input
            id="cp-busca"
            ref={campoBusca}
            type="search"
            autoComplete="off"
            value={texto}
            placeholder={telaPequena ? 'Prédio, construtora, rua ou palavra' : 'Prédio, construtora, imobiliária, rua ou palavra do anúncio'}
            onChange={(e) => digita(e.target.value)}
            onFocus={() => setSugAberta(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') { setSugAberta(false); if (e.key === 'Enter') e.currentTarget.blur(); }
            }}
            className={campoCls}
          />
          {sugAberta && sug && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-[min(60vh,420px)] overflow-auto rounded-xl border border-white/12 bg-[#15131d] p-1.5 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95)]">
              {sug.map((g) => (
                <div key={g.chave}>
                  <p className="px-2 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">{SUGESTAO_TITULO[g.chave]}</p>
                  {g.itens.map((x) => (
                    <button key={x[0]} type="button" onClick={() => escolhe(g.chave, x[0])}
                      className="flex w-full items-baseline gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13.5px] text-white hover:bg-[#FF1E56]/12 focus-visible:bg-[#FF1E56]/12 focus:outline-none">
                      <span className="min-w-0 flex-1 break-words">{x[0]}</span>
                      <i className="not-italic text-[12px] text-text-secondary tabular-nums whitespace-nowrap">{num(x[1])}{x[1] === 1 ? ' imóvel' : ' imóveis'}</i>
                    </button>
                  ))}
                </div>
              ))}
              <p className="px-2 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">Palavra nos anúncios</p>
              <button type="button" onClick={() => { setSugAberta(false); campoBusca.current?.blur(); }}
                className="flex w-full items-baseline gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13.5px] text-white hover:bg-[#FF1E56]/12 focus-visible:bg-[#FF1E56]/12 focus:outline-none">
                <span className="min-w-0 flex-1 break-words">Procurar “{S.text}” no texto dos anúncios</span>
                <i className="not-italic text-[12px] text-text-secondary tabular-nums whitespace-nowrap">{num(total)}</i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* linha 1: os cinco principais. Larga: numa linha só, cada um com o espaço que precisa; média: duas linhas (o tempo de anúncio leva mais espaço que os quartos); celular: preço e tempo na linha inteira */}
      <div className="mt-3.5 grid grid-cols-6 gap-x-3 gap-y-3 md:grid-cols-12 xl:grid-cols-[max-content_minmax(0,2.57fr)_minmax(0,1.45fr)_minmax(0,1.24fr)_minmax(0,2.4fr)]">
        <div className="col-span-6 xl:col-span-1 min-w-0">
          <span className={rotulo}>Quem anuncia</span>
          <div className="flex gap-1.5">
            {quem.map(([v, nome, n, largura]) => (
              <button key={v || 'todos'} type="button" aria-pressed={S.who === v}
                onClick={() => muda((s) => ({ ...s, who: v }), true)}
                className={`flex-1 h-11 md:h-10 inline-flex items-center justify-center px-2 sm:px-3 rounded-xl border text-[13px] whitespace-nowrap ${S.who === v
                  ? 'border-[#FF1E56]/60 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white font-bold shadow-[0_0_14px_rgba(255,30,86,0.35)]'
                  : 'border-white/10 bg-white/[0.04] text-white hover:border-[#FF1E56]/50'}`}>
                {nome}
                {n !== null && <i className={`not-italic ml-1.5 text-[12px] opacity-80 tabular-nums text-left ${largura}`}>{num(n)}</i>}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-6 xl:col-span-1 min-w-0">
          <span className={rotulo}>Preço (R$)</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={entre}>de</span>
            <Numero id="pmin" S={S} muda={muda} inputMode="decimal" placeholder="ex.: 500 mil" aria-label="Preço mínimo" />
            <span className={entre}>até</span>
            <Numero id="pmax" S={S} muda={muda} inputMode="decimal" placeholder="ex.: 1,5 mi" aria-label="Preço máximo" />
          </div>
        </div>

        <div className="col-span-3 xl:col-span-1 min-w-0">
          <span className={rotulo}>Quartos</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={entre}>de</span>
            <Numero id="qmin" S={S} muda={muda} inputMode="numeric" maxLength={2} aria-label="Mínimo de quartos" className="!px-1.5 text-center md:!px-3 md:text-left" />
            <span className={entre}>até</span>
            <Numero id="qmax" S={S} muda={muda} inputMode="numeric" maxLength={2} aria-label="Máximo de quartos" className="!px-1.5 text-center md:!px-3 md:text-left" />
          </div>
        </div>

        <div className="col-span-3 md:col-span-4 xl:col-span-1 min-w-0">
          <span className={rotulo}>Distância do mar</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={entre}>até</span>
            <Numero id="mar" S={S} muda={muda} inputMode="numeric" maxLength={5} placeholder="ex.: 300"
              aria-label="Distância máxima do mar, em metros" title="Em metros. 0 mostra só os que dizem frente mar." />
            <span className={entre}>m</span>
          </div>
        </div>

        <div className="col-span-6 md:col-span-5 xl:col-span-1 min-w-0">
          <span className={rotulo}>Anunciado há</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={entre}>de</span>
            <Numero id="dmin" S={S} muda={muda} inputMode="numeric" maxLength={9} placeholder="ex.: 30" aria-label="Anunciado há pelo menos quantos dias" />
            <span className={entre}>até</span>
            <Numero id="dmax" S={S} muda={muda} inputMode="numeric" maxLength={9} placeholder="ex.: 180" aria-label="Anunciado há no máximo quantos dias" />
            <span className={entre}>dias</span>
          </div>
        </div>
      </div>

      {/* linha 2: tipo, bairro e situação */}
      <div className="mt-3.5 grid grid-cols-6 gap-x-3 gap-y-3 md:grid-cols-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_max-content]">
        <div className="col-span-3 md:col-span-6 xl:col-span-1 min-w-0">
          <label htmlFor="cp-tipo" className={rotulo}>Tipo de imóvel</label>
          <select id="cp-tipo" value={tpAtual} onChange={(e) => { const v = e.target.value; muda((s) => ({ ...s, tp: v ? { [v]: 1 } : {} })); }} className={campoCls}>
            <option value="">Todos</option>
            {base.tipos.map((k) => <option key={k} value={k}>{k} ({num(cont.tp[k] || 0)})</option>)}
          </select>
        </div>
        <div className="col-span-3 md:col-span-6 xl:col-span-1 min-w-0">
          <label htmlFor="cp-bairro" className={rotulo}>Bairro</label>
          <select id="cp-bairro" value={baAtual} onChange={(e) => { const v = e.target.value; muda((s) => ({ ...s, ba: v ? { [v]: 1 } : {} })); }} className={campoCls}>
            <option value="">Todos</option>
            {base.bairros.map((k) => <option key={k} value={k}>{k} ({num(cont.ba[k] || 0)})</option>)}
          </select>
        </div>
        <div className="col-span-6 md:col-span-12 xl:col-span-1 min-w-0">
          <span className={rotulo}>Situação</span>
          {/* celular: as quatro em duas colunas iguais, sem o número (não cabe sem quebrar o nome) */}
          <div className="flex flex-wrap gap-1.5 max-[520px]:grid max-[520px]:grid-cols-2">
            {(['c', 'p', 't', 'a'] as Situacao[]).map((k) => {
              const ligado = !!S.st[k];
              return (
                <label key={k} title={SITUACAO_DICA[k]}
                  className={`inline-flex items-center gap-2 min-h-[44px] md:min-h-[40px] px-2.5 sm:px-3 rounded-xl border cursor-pointer select-none text-[13px] leading-tight whitespace-nowrap max-[520px]:whitespace-normal max-[520px]:text-[12.5px] ${ligado
                    ? 'border-[#FF3364]/55 bg-[#FF1E56]/[0.12] text-white' : 'border-white/10 bg-white/[0.04] text-white/85 hover:border-[#FF1E56]/50'}`}>
                  <input type="checkbox" checked={ligado}
                    onChange={(e) => { const on = e.target.checked; muda((s) => { const st = { ...s.st }; if (on) st[k] = 1; else delete st[k]; return { ...s, st }; }); }}
                    className="m-0 h-4 w-4 shrink-0 cursor-pointer accent-[#FF1E56]" />
                  <span>{SITUACAO[k]}</span>
                  <i className="not-italic text-[12px] text-text-secondary tabular-nums min-w-[4.9ch] max-[520px]:hidden">{num(cont.st[k] || 0)}</i>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
