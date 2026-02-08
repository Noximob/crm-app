export interface ImovelSelecaoNox {
  imageUrl: string;
  titulo: string;
  local: string;
  preco: string | number;
}

/** Uma unidad dentro de uma seleção (foto, título, valor, descritivo) */
export interface UnidadeSelecao {
  imageUrl: string;
  titulo: string;
  valor: string | number;
  descritivo: string;
}

/** 3 seleções (uma por imóvel do Seleção Nox), cada uma com 3 unidades */
export interface UnidadesSelecaoData {
  selecoes: {
    unidades: UnidadeSelecao[];
  }[];
}
