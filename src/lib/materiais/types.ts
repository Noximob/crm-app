/** Tipos do Material de apoio (dados no projeto apoio-nox). Campos curtos = como estão no banco. */

export interface Construtora {
  id: string;
  name: string;
  color: string;
  ordem?: number;
}

export type MaterialCat =
  | 'apresentacao'
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
  tip?: [string, string][]; // tipologias: [área, descrição]
  dif?: string[]; // diferenciais
  resumo?: string;
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
  { key: 'tabela', label: 'Tabela', kind: 'link', single: true },
  { key: 'plantas', label: 'Plantas', kind: 'image' },
  { key: 'maquete', label: 'Maquete', kind: 'video', single: true },
  { key: 'decorado', label: 'Decorado', kind: 'video', single: true },
  { key: 'imagens', label: 'Imagens', kind: 'image' },
  { key: 'links', label: 'Links', kind: 'linklist' },
  { key: 'localizacao', label: 'Localização', kind: 'link', single: true },
];

export const catByKey = (k: string) => CATEGORIES.find((c) => c.key === k);

