/** Modelo do funil de "Ligação Ativa" (mapa mental de scripts). Editável no admin. */

export interface FunilOpcao {
  key: string;
  label: string;
}

/** Botão de um nó: leva a outro nó (target = id do nó). */
export interface FunilChoice {
  label: string;
  icon?: string; // emoji
  desc?: string;
  target: string; // id do nó de destino
}

/** Um passo dentro de um nó que agrupa vários trechos numa página só (ex.: sem-resposta). */
export interface FunilPasso {
  titulo?: string; // rótulo do passo (ex.: "2ª tentativa — se não atender, mande:")
  mensagem?: string;
  mensagensPorProduto?: Record<string, string>;
  audio?: boolean;
}

export interface FunilNode {
  id: string;
  eyebrow?: string; // "Etapa 01", "Qualificação", etc.
  titulo: string;
  descricao?: string; // orientação ao corretor (guia)
  mensagem?: string; // texto para copiar/enviar (com [variáveis])
  mensagensPorProduto?: Record<string, string>; // mensagem dinâmica por produto (fup3)
  passos?: FunilPasso[]; // vários trechos numa página só (menos clique)
  audio?: boolean; // true = é um roteiro de áudio (gravar e enviar)
  infoNote?: string; // nota destacada
  checklist?: string[]; // itens para marcar
  pergunta?: string; // pergunta acima dos botões (ex.: "O que aconteceu?")
  choices?: FunilChoice[]; // botões (decisão ou avançar)
}

export interface FunilConfig {
  produtos: FunilOpcao[];
  objetivos: FunilOpcao[];
  startNode: string;
  nodes: FunilNode[];
}
