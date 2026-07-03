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
  | 'links';

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

/** Abas de materiais exibidas no visualizador (ordem + rótulo + ícone Tabler) */
export const MATERIAL_ABAS: { key: MaterialCat; label: string; icon: string }[] = [
  { key: 'apresentacao', label: 'Apresentação', icon: 'ti-presentation' },
  { key: 'tabela', label: 'Tabela', icon: 'ti-table' },
  { key: 'plantas', label: 'Plantas', icon: 'ti-blueprint' },
  { key: 'maquete', label: 'Maquete', icon: 'ti-box' },
  { key: 'decorado', label: 'Decorado', icon: 'ti-sofa' },
  { key: 'imagens', label: 'Imagens', icon: 'ti-photo' },
  { key: 'video', label: 'Vídeos', icon: 'ti-video' },
  { key: 'links', label: 'Links', icon: 'ti-link' },
];
