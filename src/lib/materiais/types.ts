/** Tipos do Material de apoio (dados no projeto apoio-nox). Campos curtos = como estão no banco. */

export interface Construtora {
  id: string;
  name: string;
  color: string;
  ordem?: number;
}

export type MaterialCat =
  | 'apresentacao'
  | 'ficha'
  | 'tabela'
  | 'plantas'
  | 'maquete'
  | 'decorado'
  | 'imagens'
  | 'video'
  | 'links'
  | 'localizacao';

export interface Material {
  cat: MaterialCat | string;
  name: string;
  url: string;
  /** link de download opcional (ex.: vídeo do YouTube + MP4) */
  dl?: string;
  /** true = vídeo não é deste empreendimento (material de outro imóvel pronto da construtora) — mostra aviso no player */
  outroImovel?: boolean;
}

export interface Imovel {
  id: string;
  co: string; // construtora (name)
  n: string; // nome
  l?: string; // linha/selo
  cid?: string; // cidade
  end?: string; // endereço
  pr?: string; // preço
  m2?: string; // valor m²
  st?: string; // status (Lançamento, etc.)
  t?: string; // torres
  a?: string; // andares
  ap?: string; // apartamentos
  e?: string; // entrega
  tip?: string | string[][]; // tipologias [área, descrição, aPartirDe?, torre?, finais?]: guardado como JSON string no Firestore (nested array não é suportado)
  dif?: string[]; // diferenciais
  lazer?: string[]; // lazer & convívio
  resumo?: string;
  defesa?: string; // defesa da região (texto livre — vira aba no material de apoio)
  capa?: string; // foto de capa (url)
  materiais?: Material[];
  ordem?: number;
}

export type MaterialKind = 'pdf' | 'link' | 'image' | 'video' | 'linklist';

export interface CategoriaMaterial {
  key: MaterialCat;
  label: string;
  kind: MaterialKind;
  /** true = usa só o primeiro material da categoria */
  single?: boolean;
}

/** Categorias de material (ordem, rótulo e como renderiza) — igual ao app original. */
export const CATEGORIES: CategoriaMaterial[] = [
  { key: 'apresentacao', label: 'Apresentação', kind: 'pdf', single: true },
  { key: 'ficha', label: 'Ficha Técnica', kind: 'pdf', single: true },
  { key: 'tabela', label: 'Tabela', kind: 'link', single: true },
  { key: 'plantas', label: 'Plantas', kind: 'image' },
  { key: 'maquete', label: 'Maquete', kind: 'video', single: true },
  { key: 'decorado', label: 'Decorado', kind: 'video', single: true },
  { key: 'imagens', label: 'Imagens', kind: 'image' },
  { key: 'links', label: 'Links', kind: 'linklist' },
  { key: 'localizacao', label: 'Localização', kind: 'link', single: true },
];

export const catByKey = (k: string) => CATEGORIES.find((c) => c.key === k);

/** Formata valor monetário em padrão BR "5.000.000,00" a partir de texto livre ("895239", "895.239", "895239,50"). */
export function fmtMoneyBR(v?: string): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const clean = s.replace(/[^\d.,]/g, '');
  if (!clean) return s;
  const num = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  if (isNaN(num)) return s;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Linha de tipologia: [área, descrição, aPartirDe, torre, finais, diferenciada ('1' = garden/cobertura → dropdown)]. */
export type TipRow = [string, string, string, string, string, string];

/** Tipologias: no Firestore vêm como JSON string; aceita também array (seed/legado, com 2 a 6 campos). */
export function parseTip(v: unknown): TipRow[] {
  const norm = (arr: any[]): TipRow[] => arr.map((t) => [String(t?.[0] ?? ''), String(t?.[1] ?? ''), String(t?.[2] ?? ''), String(t?.[3] ?? ''), String(t?.[4] ?? ''), String(t?.[5] ?? '')] as TipRow);
  if (Array.isArray(v)) return norm(v);
  if (typeof v === 'string' && v.trim()) {
    try { const a = JSON.parse(v); return Array.isArray(a) ? norm(a) : []; } catch { return []; }
  }
  return [];
}

