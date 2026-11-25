/**
 * CAPTAÇÃO PENHA — os imóveis prontos e terrenos à venda em Penha/SC.
 *
 * A base é uma varredura dos portais (OLX, VivaReal, ZAP, Chaves na Mão,
 * Imovelweb, Imóveis-SC), dos sites das imobiliárias e do DWV, feita pelo
 * "motor" que mora em Desktop/Captação Penha/_motor (o NOTAS.md de lá explica
 * cada passo). O motor une o mesmo imóvel anunciado em vários lugares, separa
 * pronto de planta e grava um arquivo só: public/captacao-penha/dados.json.
 *
 * ATUALIZAR A BASE: rodar o motor e mandar ele gravar aqui —
 *   node norm.js && node cluster.js && node classify.js
 *   node page.js "<crm-app>/public/captacao-penha" crm
 * — e dar push. A tela não muda: ela só lê o arquivo.
 *
 * Este arquivo é a REGRA da tela (o que cada filtro deixa passar, a ordem, os
 * grupos, a planilha) sem nada de React — o teste em __tests__ compara cada
 * regra com a do painel original, imóvel por imóvel.
 *
 * O desenho dos filtros foi decidido pelo gestor depois de cinco versões: uma
 * coluna só, um painel único, nada escondido, campos de digitar "de/até". Não
 * tem favoritos, etapas, buscas salvas nem faixas prontas — e é pra continuar
 * assim.
 */

export const CAPTACAO_DADOS_URL = '/captacao-penha/dados.json';
/** Onde ficam os excluídos e as anotações de cada pessoa: captacaoPenha/{uid}. */
export const CAPTACAO_COLECAO = 'captacaoPenha';

// ---------------------------------------------------------------------------
// O que vem no arquivo (nomes curtos: são 4 mil imóveis numa lista só)
// ---------------------------------------------------------------------------
/** c = pronto confirmado · p = provável pronto · a = a confirmar · t = terreno */
export type Situacao = 'c' | 'p' | 'a' | 't';
/** P = particular · I = imobiliária ou corretor · C = construtora · X = não informado */
export type TipoAnunciante = 'P' | 'I' | 'C' | 'X';
/** Um anúncio do imóvel: [portal, link, preço, quem anuncia, nome curto, 1 = é do particular] */
export type LinkAnuncio = [string, string, number, string, string, number];
/** Quem anuncia: [nome, tipo, telefone] — particular vem sem nome e sem telefone */
export type QuemAnuncia = [string, string, string];

export interface ImovelBruto {
  i: string;            // identificação (portal:código do anúncio)
  t: string;            // título
  tp: string;           // tipo: Apartamento, Casa, Terreno…
  p?: number;           // preço
  a?: number;           // área (m²)
  q?: number;           // quartos
  s?: number;           // suítes
  b?: number;           // banheiros
  v?: number;           // vagas
  ba?: string;          // bairro
  r?: string;           // rua
  im?: string[];        // fotos (endereços nos portais)
  st: Situacao;
  w?: string;           // por que recebeu essa situação
  ad: TipoAnunciante;
  an?: QuemAnuncia[];
  n?: number;           // quantas imobiliárias anunciam
  l?: LinkAnuncio[];
  d?: string;           // atualizado em (aaaa-mm-dd)
  de?: string;          // descrição (telefone e e-mail mascarados)
  sx?: string;          // palavras da descrição (só na versão sem texto)
  em?: string;          // prédio, condomínio ou loteamento
  ei?: number;          // 1 = prédio descoberto pelo endereço
  co?: string;          // construtora
  f?: string[];         // o que o anúncio menciona (códigos de meta.feats)
  dm?: number;          // distância do mar (m)
  k?: string[];         // códigos do anúncio
  cd?: number;          // condomínio (R$)
  ip?: number;          // IPTU (R$)
  pm?: number;          // maior preço entre os anúncios
  o?: number;           // preço anterior
  pu?: string;          // publicado em (aaaa-mm-dd)
  pe?: number;          // 1 = data de publicação estimada
  g?: [number, number]; // latitude, longitude
  mr?: [number, 'e' | 'b', number]; // R$/m² típico: [valor, do prédio (e) ou do bairro (b), amostra]
}

/** O imóvel pronto pra tela: o que veio + o que se calcula uma vez só. */
export interface Imovel extends ImovelBruto {
  _m2: number | null;
  _ft: Record<string, 1>;
  /** imobiliárias, corretores e construtoras que anunciam (sem o particular) */
  _ans: string[];
  _em: string;
  _co: string;
  /** tudo o que a busca por palavra enxerga, sem acento e em minúsculas */
  _txt: string;
  _drop: boolean;
  /** dias desde a primeira publicação, contados até o dia da varredura */
  _days: number | null;
  _new: boolean;
  /** quanto o m² está acima (+) ou abaixo (−) do típico */
  _dif: number | null;
  /** nota de "vale captar primeiro": particular, sem exclusividade, pronto, recente… */
  _cap: number;
  /** qual anúncio abre no botão principal (o do particular, se houver) */
  _best: number;
}

export interface MetaCaptacao {
  scan: string;
  link?: boolean;
  fora: number;
  mortos: number;
  terrenos: number;
  /** empreendimento → [tipo, situação da obra, observação, construtora] */
  emps: Record<string, [string, string, string, string]>;
  /** o que o anúncio pode mencionar → [código, texto, grupo] */
  feats: [string, string, string][];
  cob: { aptos: number; aptosEmp: number; emp: number; end: number; con: number; nEmp: number };
  fontes: [string, string][];
  limites: string[];
}

export interface DadosCaptacao { meta: MetaCaptacao; items: ImovelBruto[] }

/** nome, quantos imóveis, nome sem acento (pra casar com o que se digita) */
export type Sugestao = [string, number, string];
export type ChaveSugestao = 'em' | 'co' | 'ba' | 'an';

export interface BaseCaptacao {
  meta: MetaCaptacao;
  itens: Imovel[];
  porId: Record<string, Imovel>;
  /** texto de cada menção do anúncio */
  FT: Record<string, string>;
  /** tipos e bairros, do mais comum pro menos */
  tipos: string[];
  bairros: string[];
  sug: Record<ChaveSugestao, Sugestao[]>;
}

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------
export const FONTE: Record<string, string> = { OLX: 'OLX', VR: 'VivaReal', ZAP: 'ZAP', IW: 'Imovelweb', CNM: 'Chaves na Mão', ISC: 'Imóveis-SC', DWV: 'DWV', SITE: 'site da imobiliária' };
export const SITUACAO: Record<Situacao, string> = { c: 'Pronto confirmado', p: 'Provável pronto', a: 'A confirmar', t: 'Terreno' };
export const SITUACAO_DICA: Record<Situacao, string> = {
  c: 'O anúncio diz que está pronto, ou o prédio já foi entregue',
  p: 'Descrito sem nenhuma menção a obra ou entrega futura',
  t: 'Lote ou área sem construção',
  a: 'O anúncio não deixa claro se já está pronto',
};
export const ANUNCIANTE: Record<TipoAnunciante, string> = { P: 'Particular', I: 'Imobiliária ou corretor', C: 'Construtora', X: 'Não informado' };
export const TIPO_EMP: Record<string, string> = { predio: 'prédio', residencial: 'residencial', condominio: 'condomínio', loteamento: 'loteamento' };
export const OBRA: Record<string, string> = { pronto: 'entregue', obra: 'em obra', misto: 'parte entregue' };
/** "sem prédio identificado" / "construtora não identificada" */
export const SEM = '∅';
export const SEM_BAIRRO = '(não informado)';
/** menções que aparecem nos detalhes do cartão, nesta ordem */
export const SINAIS_CARTAO = ['fm', 'vm', 'qm', 'mb', 'sm', 'pe', 'ur', 'pd', 'fi', 'al', 'tp', 'av', 'ct', 'nf', 'bc', 'vi', 'cf', 'es', 'ge', 'ed', 'pi', 'el', 'ch', 'sa'];
/** neg = abre negociação (permuta, urgência…) · warn = pede atenção (só contrato, não financia) */
export const SINAL_TOM: Record<string, 'neg' | 'warn'> = { pe: 'neg', ur: 'neg', pd: 'neg', al: 'neg', ct: 'warn', nf: 'warn' };

// ---------------------------------------------------------------------------
// Texto e número
// ---------------------------------------------------------------------------
const ACENTOS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
/** sem acento, em minúsculas */
export const na = (s: unknown): string => String(s || '').normalize('NFD').replace(ACENTOS, '').toLowerCase();
/** idem, e com hífen, sublinhado e barra virando espaço */
export const nz = (s: unknown): string => na(s).replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ');

const NF = new Intl.NumberFormat('pt-BR');
export const num = (n: number): string => NF.format(n);
export const dinheiro = (v?: number | null): string => (v ? 'R$ ' + NF.format(Math.round(v)) : 'Consulte');
export const curto = (v?: number | null): string => {
  if (!v) return '–';
  if (v >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
  return 'R$ ' + Math.round(v / 1e3) + ' mil';
};
export const dma = (s?: string): string => { if (!s) return ''; const p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
export const pct = (x: number): string => Math.round(Math.abs(x) * 100) + '%';
export const tempo = (d: number): string => {
  if (d < 60) return d + (d === 1 ? ' dia' : ' dias');
  if (d < 365) return Math.round(d / 30.4) + ' meses';
  const a = d / 365;
  return a < 1.95 ? '1 ano' : Math.round(a) + ' anos';
};
export function mediana(arr: number[]): number | null {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const tem = (o: object): boolean => { for (const k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) return true; } return false; };
const quantos = (o: object): number => Object.keys(o).length;

/** número inteiro digitado (quartos, metros, dias) */
export function inteiroDe(s: unknown): number | null {
  const d = String(s || '').replace(/[^\d]/g, '');
  return d === '' ? null : Number(d);
}
/** preço digitado do jeito que se fala: "500" = 500 mil, "1,5" = 1,5 milhão, "850 mil", "2 mi", "1.200.000" */
export function precoDe(entrada: unknown): number | null {
  const s = na(entrada).replace(/r\$/g, '').trim();
  if (!s) return null;
  const letras = s.replace(/[^a-z]/g, '');
  const numtxt = s.replace(/[^\d.,]/g, '').replace(/^(\d{4,}|\d{1,3}(?:\.\d{3})+),\d{2}$/, '$1');
  if (!numtxt) return null;
  const unit = /^(mil|k)$/.test(letras) ? 1e3 : /^(mi|m|mm|milhao|milhoes)$/.test(letras) ? 1e6 : 0;
  let v = /^\d{1,3}[.,]\d{1,2}$/.test(numtxt) ? parseFloat(numtxt.replace(',', '.')) : Number(numtxt.replace(/[.,]/g, ''));
  if (!isFinite(v) || v <= 0) return null;
  // sem unidade: número pequeno é milhão, médio é mil
  if (unit) v = v * unit; else if (v < 30) v = v * 1e6; else if (v < 100000) v = v * 1e3;
  return Math.round(v);
}
/** tempo de anúncio em dias; também entende "6 meses", "1 ano", "2 semanas" */
export function diasDe(entrada: unknown): number | null {
  const s = na(entrada).trim();
  if (!s) return null;
  const letras = s.replace(/[^a-z]/g, '');
  const mult = /^(m|mes|meses)$/.test(letras) ? 30 : /^(a|ano|anos)$/.test(letras) ? 365 : /^(s|sem|semana|semanas)$/.test(letras) ? 7 : 1;
  if (mult === 1) return inteiroDe(s);
  const m = /\d+(?:[.,]\d+)?/.exec(s);
  if (!m) return null;
  return Math.round(parseFloat(m[0].replace(',', '.')) * mult);
}

// ---------------------------------------------------------------------------
// Preparo: o que se calcula uma vez, ao abrir
// ---------------------------------------------------------------------------
export function preparar(dados: DadosCaptacao): BaseCaptacao {
  const meta = dados.meta;
  const FT: Record<string, string> = {};
  meta.feats.forEach((f) => { FT[f[0]] = f[1]; });
  const scan = new Date(meta.scan + 'T12:00:00').getTime();
  const dia = 864e5;
  const porId: Record<string, Imovel> = {};

  const itens = dados.items.map((bruto) => {
    const it = bruto as Imovel;
    porId[it.i] = it;
    it._m2 = it.p && it.a ? it.p / it.a : null;
    it._ft = {};
    (it.f || []).forEach((c) => { it._ft[c] = 1; });
    it._ans = (it.an || []).filter((a) => a[0] && a[1] !== 'P').map((a) => a[0]);
    (it.l || []).forEach((l) => { if (l[3] && !l[5] && l[3] !== 'Proprietário' && it._ans.indexOf(l[3]) < 0) it._ans.push(l[3]); });
    it._em = it.em || SEM;
    it._co = it.co || SEM;
    it._txt = nz([
      it.t, it.tp, it.em, it.co, it.ba, it.r, it.de, it.sx, it.w, it._ans.join(' '), (it.k || []).join(' '),
      (it.f || []).map((c) => FT[c]).join(' '), SITUACAO[it.st], it.ad === 'P' ? 'proprietario particular dono direto' : '',
    ].join(' '));
    it._drop = !!(it.o && it.p && it.o > it.p);
    it._days = it.pu ? Math.max(0, Math.round((scan - new Date(it.pu + 'T12:00:00').getTime()) / dia)) : null;
    it._new = it._days != null && it._days <= 15;
    it._dif = it.mr && it._m2 ? it._m2 / it.mr[0] - 1 : null;
    const rec = it.d ? Math.max(0, 20 - (scan - new Date(it.d + 'T12:00:00').getTime()) / dia) : 0;
    const n = it.n || 0;
    it._cap = (it.ad === 'P' ? 1000 : 0) + (n >= 2 ? 100 + n * 5 : 0) + (it.st === 'c' ? 30 : it.st === 'p' || it.st === 't' ? 15 : 0)
      + rec + (it._drop ? 10 : 0) + (it.im && it.im.length ? 3 : 0);
    let b = -1;
    (it.l || []).some((l, i) => { if (l[5]) { b = i; return true; } return false; });
    it._best = b < 0 ? 0 : b;
    return it;
  });

  const t: Record<string, number> = {};
  const bq: Record<string, number> = {};
  const c: Record<ChaveSugestao, Record<string, number>> = { em: {}, co: {}, ba: {}, an: {} };
  itens.forEach((it) => {
    t[it.tp] = (t[it.tp] || 0) + 1;
    const k = it.ba || SEM_BAIRRO;
    bq[k] = (bq[k] || 0) + 1;
    if (it.em) c.em[it.em] = (c.em[it.em] || 0) + 1;
    if (it.co) c.co[it.co] = (c.co[it.co] || 0) + 1;
    if (it.ba) c.ba[it.ba] = (c.ba[it.ba] || 0) + 1;
    it._ans.forEach((a) => { c.an[a] = (c.an[a] || 0) + 1; });
  });
  const sug = { em: [], co: [], ba: [], an: [] } as Record<ChaveSugestao, Sugestao[]>;
  (Object.keys(c) as ChaveSugestao[]).forEach((k) => {
    sug[k] = Object.keys(c[k]).map((n): Sugestao => [n, c[k][n], nz(n)]).sort((x, y) => y[1] - x[1]);
  });

  return {
    meta, itens, porId, FT,
    tipos: Object.keys(t).sort((x, y) => t[y] - t[x]),
    bairros: Object.keys(bq).sort((x, y) => bq[y] - bq[x]),
    sug,
  };
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------
export type CampoNumero = 'pmin' | 'pmax' | 'qmin' | 'qmax' | 'mar' | 'dmin' | 'dmax';
type Marcados = Record<string, 1>;

/** Tudo o que o painel de filtros controla. */
export interface Filtro {
  text: string;
  /** quem anuncia: '' todos · P particular · I imobiliária */
  who: '' | 'P' | 'I';
  pmin: number | null; pmax: number | null;
  qmin: number | null; qmax: number | null;
  /** distância máxima do mar, em metros */
  mar: number | null;
  /** anunciado há (dias) */
  dmin: number | null; dmax: number | null;
  tp: Marcados; ba: Marcados;
  st: Partial<Record<Situacao, 1>>;
  /** prédio, construtora e imobiliária só entram pela busca ou clicando no nome */
  em: Marcados; co: Marcados; an: Marcados;
  /** vendo só os anúncios que a pessoa excluiu */
  hid: boolean;
}
/** "A confirmar" começa desmarcada. */
export const filtroInicial = (): Filtro => ({
  text: '', who: '', pmin: null, pmax: null, qmin: null, qmax: null, mar: null, dmin: null, dmax: null,
  tp: {}, ba: {}, st: { c: 1, p: 1, t: 1 }, em: {}, co: {}, an: {}, hid: false,
});
export const LEITOR: Record<CampoNumero, (s: unknown) => number | null> = {
  pmin: precoDe, pmax: precoDe, qmin: inteiroDe, qmax: inteiroDe, mar: inteiroDe, dmin: diasDe, dmax: diasDe,
};
/** o par de cada campo "de/até" */
export const PAR: Partial<Record<CampoNumero, CampoNumero>> = { pmin: 'pmax', pmax: 'pmin', qmin: 'qmax', qmax: 'qmin', dmin: 'dmax', dmax: 'dmin' };
/** como o valor aparece no campo quando a pessoa sai dele (500 → 500.000) */
export const mostrado = (S: Filtro, id: CampoNumero): string => {
  const v = S[id];
  return v == null ? '' : id === 'pmin' || id === 'pmax' ? NF.format(v) : String(v);
};
/** Ao sair do campo: grava o valor e, se "de" ficou maior que "até", troca os dois. */
export function confirmarCampo(S: Filtro, id: CampoNumero, valor: number | null): Filtro {
  const n: Filtro = { ...S, [id]: valor };
  const par = PAR[id];
  if (par) {
    const lo = /min$/.test(id) ? id : par;
    const hi = lo === id ? par : id;
    const a = n[lo], b = n[hi];
    if (a != null && b != null && a > b) { n[lo] = b; n[hi] = a; }
  }
  return n;
}

type Faixa = [number | null, number | null];
/** "de" maior que "até" vale como se estivessem trocados */
const faixa = (a: number | null, b: number | null): Faixa => (a != null && b != null && a > b ? [b, a] : [a, b]);

/** A busca por palavra: várias palavras = todas; "entre aspas" = junto; -palavra = sem ela. */
export function lerBusca(s: string): { inc: string[]; exc: string[] } {
  const inc: string[] = [], exc: string[] = [];
  const re = /(-?)"([^"]+)"|(-?)([^\s"]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s || ''))) {
    const neg = (m[1] || m[3]) === '-';
    const v = nz(m[2] || m[4] || '').trim();
    if (v) (neg ? exc : inc).push(v);
  }
  return { inc, exc };
}

export interface FiltroPronto { S: Filtro; p: Faixa; q: Faixa; d: Faixa; inc: string[]; exc: string[] }
export function aprontar(S: Filtro): FiltroPronto {
  const b = lerBusca(S.text);
  return { S, p: faixa(S.pmin, S.pmax), q: faixa(S.qmin, S.qmax), d: faixa(S.dmin, S.dmax), inc: b.inc, exc: b.exc };
}

export type Excluidos = Record<string, unknown>;
type Pula = 'st' | 'who' | 'tp' | 'ba';

/**
 * O imóvel passa nos filtros? `pula` deixa um filtro de fora — é assim que
 * cada opção do painel mostra quantos imóveis ela TERIA.
 */
export function passa(it: Imovel, F: FiltroPronto, excluidos: Excluidos, pula?: Pula): boolean {
  const S = F.S;
  // "ver os excluídos" mostra só eles
  if (S.hid) { if (!excluidos[it.i]) return false; } else if (excluidos[it.i]) return false;
  if (pula !== 'st' && !S.st[it.st]) return false;
  if (pula !== 'who' && S.who) {
    if (S.who === 'P') { if (it.ad !== 'P') return false; }
    else if (it.ad === 'P' && !((it.n || 0) >= 1)) return false;
  }
  if (pula !== 'tp' && tem(S.tp) && !S.tp[it.tp]) return false;
  if (pula !== 'ba' && tem(S.ba) && !S.ba[it.ba || SEM_BAIRRO]) return false;
  if (tem(S.em) && !S.em[it._em]) return false;
  if (tem(S.co) && !S.co[it._co]) return false;
  let i: number;
  if (tem(S.an)) {
    let ok = false;
    for (i = 0; i < it._ans.length; i++) { if (S.an[it._ans[i]]) { ok = true; break; } }
    if (!ok) return false;
  }
  if (F.p[0] != null && !(it.p && it.p >= F.p[0])) return false;
  if (F.p[1] != null && !(it.p && it.p <= F.p[1])) return false;
  if (F.q[0] != null && !((it.q || 0) >= F.q[0])) return false;
  if (F.q[1] != null && !(it.q && it.q <= F.q[1])) return false;
  if (S.mar != null && !(it._ft.fm || (it.dm != null && it.dm <= S.mar))) return false;
  if (F.d[0] != null || F.d[1] != null) {
    if (it._days == null) return false;
    if (F.d[0] != null && it._days < F.d[0]) return false;
    if (F.d[1] != null && it._days > F.d[1]) return false;
  }
  for (i = 0; i < F.inc.length; i++) { if (it._txt.indexOf(F.inc[i]) < 0) return false; }
  for (i = 0; i < F.exc.length; i++) { if (it._txt.indexOf(F.exc[i]) >= 0) return false; }
  return true;
}

export type Ordem = 'cap' | 'new' | 'old' | 'pa' | 'pd';
export const ORDENS: Record<Ordem, (a: Imovel, b: Imovel) => number> = {
  cap: (a, b) => b._cap - a._cap || (a.p || 9e15) - (b.p || 9e15),
  new: (a, b) => (b.d || b.pu || '').localeCompare(a.d || a.pu || '') || b._cap - a._cap,
  old: (a, b) => (b._days == null ? -1 : b._days) - (a._days == null ? -1 : a._days) || b._cap - a._cap,
  pa: (a, b) => (a.p || 9e15) - (b.p || 9e15),
  pd: (a, b) => (b.p || 0) - (a.p || 0),
};
export const ORDEM_ROTULO: [Ordem, string][] = [
  ['cap', 'Melhores para captar primeiro'], ['new', 'Mais novos primeiro'], ['old', 'Há mais tempo anunciados'],
  ['pa', 'Menor preço'], ['pd', 'Maior preço'],
];

/** A lista que aparece: o que passa nos filtros, na ordem escolhida. */
export function listar(base: BaseCaptacao, F: FiltroPronto, excluidos: Excluidos, ordem: Ordem): Imovel[] {
  return base.itens.filter((it) => passa(it, F, excluidos)).sort(ORDENS[ordem]);
}

export const situacaoPadrao = (S: Filtro): boolean => !!(S.st.c && S.st.p && S.st.t && !S.st.a);
/** Tem algum filtro ligado? (é o que faz aparecer o "Limpar tudo") */
export const temFiltro = (S: Filtro): boolean => !!(
  S.text || S.who || S.pmin != null || S.pmax != null || S.qmin != null || S.qmax != null || S.mar != null
  || S.dmin != null || S.dmax != null || tem(S.tp) || tem(S.ba) || !situacaoPadrao(S) || tem(S.em) || tem(S.co) || tem(S.an) || S.hid
);

export interface Contagens {
  particular: number; imobiliaria: number;
  st: Record<string, number>; tp: Record<string, number>; ba: Record<string, number>;
}
/** Os números ao lado de cada opção do painel. */
export function contar(base: BaseCaptacao, F: FiltroPronto, excluidos: Excluidos): Contagens {
  const r: Contagens = { particular: 0, imobiliaria: 0, st: {}, tp: {}, ba: {} };
  base.itens.forEach((it) => {
    if (passa(it, F, excluidos, 'who')) {
      if (it.ad === 'P') r.particular++;
      if (it.ad !== 'P' || (it.n || 0) >= 1) r.imobiliaria++;
    }
    if (passa(it, F, excluidos, 'st')) r.st[it.st] = (r.st[it.st] || 0) + 1;
    if (passa(it, F, excluidos, 'tp')) r.tp[it.tp] = (r.tp[it.tp] || 0) + 1;
    if (passa(it, F, excluidos, 'ba')) { const k = it.ba || SEM_BAIRRO; r.ba[k] = (r.ba[k] || 0) + 1; }
  });
  return r;
}

export const SUGESTAO_TITULO: Record<ChaveSugestao, string> = {
  em: 'Prédio, condomínio ou loteamento', co: 'Construtora', ba: 'Bairro', an: 'Imobiliária ou corretor',
};
/** Sugestões enquanto digita: até 5 de cada grupo; com menos de 2 letras, nada. */
export function sugerir(base: BaseCaptacao, texto: string): { chave: ChaveSugestao; itens: Sugestao[] }[] | null {
  const v = nz(texto.trim());
  if (v.length < 2) return null;
  const grupos: { chave: ChaveSugestao; itens: Sugestao[] }[] = [];
  (['em', 'co', 'ba', 'an'] as ChaveSugestao[]).forEach((k) => {
    const m = base.sug[k].filter((x) => x[2].indexOf(v) >= 0).slice(0, 5);
    if (m.length) grupos.push({ chave: k, itens: m });
  });
  return grupos;
}

/** As etiquetas com "×": prédio, construtora ou imobiliária escolhidos, e a lista de excluídos. */
export function etiquetas(S: Filtro): { rotulo: string; tira: ['hid'] | ['em' | 'co' | 'an', string] }[] {
  const a: { rotulo: string; tira: ['hid'] | ['em' | 'co' | 'an', string] }[] = [];
  if (S.hid) a.push({ rotulo: 'Vendo só os anúncios que você excluiu', tira: ['hid'] });
  ([['em', 'Prédio não identificado', 'Prédio: '], ['co', 'Construtora não identificada', 'Construtora: '], ['an', '', 'Imobiliária: ']] as ['em' | 'co' | 'an', string, string][])
    .forEach((x) => { Object.keys(S[x[0]]).forEach((v) => { a.push({ rotulo: v === SEM ? x[1] : x[2] + v, tira: [x[0], v] }); }); });
  return a;
}

// ---------------------------------------------------------------------------
// Cartão
// ---------------------------------------------------------------------------
/** [número, o que é] — "65 m²", "2 quartos (1 suíte)"… */
export function fatos(it: Imovel): [string, string][] {
  const a: [string, string][] = [];
  if (it.a) a.push([NF.format(Math.round(it.a)), 'm²']);
  if (it.q) a.push([String(it.q), (it.q === 1 ? 'quarto' : 'quartos') + (it.s ? ' (' + it.s + ' ' + (it.s === 1 ? 'suíte' : 'suítes') + ')' : '')]);
  if (it.b) a.push([String(it.b), it.b === 1 ? 'banheiro' : 'banheiros']);
  if (it.v) a.push([String(it.v), it.v === 1 ? 'vaga' : 'vagas']);
  return a;
}
export type TomDestaque = '' | 'own' | 'multi' | 'drop' | 'good' | 'old';
/** O que faz o imóvel valer a ligação — no máximo seis linhas. */
export function destaques(it: Imovel, FT: Record<string, string>): [TomDestaque, string][] {
  const h: [TomDestaque, string][] = [];
  const n = it.n || 0;
  if (it.ad === 'P') h.push(['own', 'Anúncio direto de particular']);
  if (n >= 2) h.push(['multi', (it.ad === 'P' ? 'Também em ' : 'Em ') + n + ' imobiliárias, sem exclusividade']);
  if (it._drop && it.p && it.o) h.push(['drop', 'Baixou ' + Math.round((1 - it.p / it.o) * 100) + '% (era ' + curto(it.o) + ')']);
  if (it._days != null) h.push([it._days >= 180 ? 'old' : '', (it._new ? 'Novo: anunciado há ' : 'Anunciado há ') + (it.pe ? 'cerca de ' : '') + tempo(it._days)]);
  if (it._ft.fm) h.push(['', 'Frente mar']); else if (it.dm != null) h.push(['', 'A ' + NF.format(it.dm) + ' m do mar']);
  if (it._dif != null && it._dif <= -0.10 && it.mr) h.push(['good', 'm² ' + pct(it._dif) + ' abaixo do típico ' + (it.mr[1] === 'e' ? 'do prédio' : 'do bairro')]);
  ['ur', 'pe'].forEach((c) => { if (it._ft[c]) h.push(['', FT[c]]); });
  return h.slice(0, 6);
}
export const rotuloAnuncio = (l: LinkAnuncio): string => {
  if (l[5]) return 'Ver anúncio do particular no ' + FONTE[l[0]];
  if (l[0] === 'SITE') return 'Ver no site da imobiliária';
  return 'Ver anúncio no ' + FONTE[l[0]];
};
/** A linha miúda dos detalhes: publicado, atualizado, condomínio, IPTU, m² acima do típico, código. */
export function miudos(it: Imovel): string {
  const x: string[] = [];
  if (it.pu) x.push(it.pe ? 'publicado por volta de ' + it.pu.slice(5, 7) + '/' + it.pu.slice(0, 4) : 'publicado em ' + dma(it.pu));
  if (it.d) x.push('atualizado em ' + dma(it.d));
  if (it.cd) x.push('condomínio R$ ' + NF.format(it.cd));
  if (it.ip) x.push('IPTU R$ ' + NF.format(it.ip));
  if (it._dif != null && it._dif >= 0.10 && it.mr) x.push('m² ' + pct(it._dif) + ' acima do típico ' + (it.mr[1] === 'e' ? 'do prédio' : 'do bairro'));
  if (it.k) x.push('código ' + it.k.slice(0, 3).join(', '));
  return x.join(' · ');
}
/** O link do mapa: pela coordenada, ou pela rua quando não há. */
export function mapaDe(it: Imovel): string | null {
  if (!it.g && !it.r) return null;
  const q = it.g ? it.g[0] + ',' + it.g[1] : (it.r ? it.r + ', ' : '') + (it.ba ? it.ba + ', ' : '') + 'Penha, SC';
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
}

// ---------------------------------------------------------------------------
// Por prédio, construtora, imobiliária
// ---------------------------------------------------------------------------
export type TipoGrupo = 'emp' | 'con' | 'imob';
export type OrdemGrupo = 'n' | 'nome' | 'own' | 'pmed';
export interface LinhaGrupo {
  key: string; none: boolean; n: number; own: number; imob: number;
  pmin: number | null; pmax: number | null; pmed: number | null; m2: number | null;
  sub: string; solo?: number;
}
export const CHAVE_DO_GRUPO: Record<TipoGrupo, 'em' | 'co' | 'an'> = { emp: 'em', con: 'co', imob: 'an' };
export const GRUPO_PLURAL: Record<TipoGrupo, string> = { emp: 'prédios, condomínios e loteamentos', con: 'construtoras', imob: 'imobiliárias e corretores' };
export const GRUPO_SINGULAR: Record<TipoGrupo, string> = { emp: 'prédio, condomínio ou loteamento', con: 'construtora', imob: 'imobiliária ou corretor' };

export function agrupar(tipo: TipoGrupo, lista: Imovel[], meta: MetaCaptacao): LinhaGrupo[] {
  const m: Record<string, Imovel[]> = {};
  const chaves = tipo === 'emp' ? (it: Imovel) => [it._em] : tipo === 'con' ? (it: Imovel) => [it._co] : (it: Imovel) => it._ans;
  lista.forEach((it) => { chaves(it).forEach((k) => { (m[k] = m[k] || []).push(it); }); });
  const topo = (l: Imovel[], f: (it: Imovel) => string | undefined, n?: number): string[] => {
    const c: Record<string, number> = {};
    l.forEach((it) => { const v = f(it); if (v) c[v] = (c[v] || 0) + 1; });
    return Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, n || 1);
  };
  return Object.keys(m).map((key) => {
    const l = m[key];
    const ps = l.map((it) => it.p).filter(Boolean) as number[];
    const ms = l.map((it) => it._m2).filter(Boolean) as number[];
    const im: Record<string, 1> = {};
    l.forEach((it) => { it._ans.forEach((n) => { im[n] = 1; }); });
    const r: LinhaGrupo = {
      key, none: key === SEM, n: l.length, own: l.filter((it) => it.ad === 'P').length, imob: quantos(im),
      pmin: ps.length ? Math.min.apply(null, ps) : null, pmax: ps.length ? Math.max.apply(null, ps) : null,
      pmed: mediana(ps), m2: mediana(ms), sub: '',
    };
    if (tipo === 'emp') {
      const e = meta.emps[key];
      r.sub = r.none ? 'o anúncio não cita o prédio'
        : [e ? TIPO_EMP[e[0]] : '', e && e[1] ? OBRA[e[1]] : '', topo(l, (it) => it.co)[0] || '', topo(l, (it) => it.ba)[0] || ''].filter(Boolean).join(' · ');
    } else if (tipo === 'con') {
      const es = topo(l, (it) => it.em, 99);
      r.sub = r.none ? 'prédio sem construtora conhecida ou não identificado'
        : es.length ? es.length + (es.length === 1 ? ' empreendimento: ' : ' empreendimentos: ') + es.slice(0, 4).join(', ') + (es.length > 4 ? '…' : '')
          : 'citada no texto do anúncio';
    } else {
      r.solo = l.filter((it) => (it.n || 0) <= 1 && it.ad !== 'P').length;
      r.sub = topo(l, (it) => it.ba, 3).join(', ');
    }
    return r;
  });
}
const ORDENS_GRUPO: Record<OrdemGrupo, (a: LinhaGrupo, b: LinhaGrupo) => number> = {
  n: (a, b) => b.n - a.n,
  nome: (a, b) => a.key.localeCompare(b.key),
  own: (a, b) => b.own - a.own || b.n - a.n,
  pmed: (a, b) => (b.pmed || 0) - (a.pmed || 0),
};
/** Filtra pelo que se digitou (já sem acento) e ordena; o "sem prédio identificado" vai sempre pro fim. */
export function ordenarGrupos(linhas: LinhaGrupo[], q: string, ordem: OrdemGrupo): LinhaGrupo[] {
  let rows = linhas;
  if (q) rows = rows.filter((r) => !r.none && nz(r.key + ' ' + (r.sub || '')).indexOf(q) >= 0);
  const srt = ORDENS_GRUPO[ordem] || ORDENS_GRUPO.n;
  return rows.slice().sort((a, b) => { if (a.none !== b.none) return a.none ? 1 : -1; return srt(a, b); });
}
/** Os números das abas: quantos prédios, construtoras e imobiliárias há na lista. */
export function contarAbas(lista: Imovel[]): Record<'im' | TipoGrupo, number> {
  const e: Record<string, 1> = {}, c: Record<string, 1> = {}, a: Record<string, 1> = {};
  lista.forEach((it) => { if (it.em) e[it.em] = 1; if (it.co) c[it.co] = 1; it._ans.forEach((n) => { a[n] = 1; }); });
  return { im: lista.length, emp: quantos(e), con: quantos(c), imob: quantos(a) };
}

// ---------------------------------------------------------------------------
// Planilha
// ---------------------------------------------------------------------------
const CABECALHO = ['Situação', 'Motivo', 'Tipo', 'Preço', 'Preço anterior', 'Área m²', 'R$/m²', 'Quartos', 'Suítes', 'Banheiros', 'Vagas', 'Bairro', 'Rua',
  'Prédio ou loteamento', 'Prédio pelo endereço', 'Construtora', 'O anúncio diz', 'Distância do mar (m)', 'Dias anunciado', 'Condomínio', 'IPTU', 'Quem anuncia',
  'Anunciantes', 'Nº imobiliárias', 'Título', 'Códigos', 'Publicado', 'Atualizado', 'Links', 'Anotação'];
/** A lista que está na tela, pra abrir no Excel (separada por ponto e vírgula, com acento certo). */
export function planilha(lista: Imovel[], notas: Record<string, string>, FT: Record<string, string>): string {
  const cel = (v: unknown): string => { const s = v == null ? '' : String(v); return '"' + s.replace(/"/g, '""') + '"'; };
  const linhas = [CABECALHO.map(cel).join(';')].concat(lista.map((it) => [
    SITUACAO[it.st], it.w, it.tp, it.p || '', it.o || '', it.a ? String(it.a).replace('.', ',') : '', it._m2 ? Math.round(it._m2) : '',
    it.q, it.s, it.b, it.v, it.ba, it.r, it.em, it.ei ? 'sim' : '', it.co, (it.f || []).map((c) => FT[c]).join(' | '), it.dm, it._days, it.cd, it.ip, ANUNCIANTE[it.ad],
    (it.an || []).map((a) => a[0] || 'Particular').join(' | '), it.n, it.t, (it.k || []).join(' | '), dma(it.pu), dma(it.d), (it.l || []).map((l) => l[1]).join(' | '), notas[it.i] || '',
  ].map(cel).join(';')));
  return String.fromCharCode(0xFEFF) + linhas.join('\r\n');
}
