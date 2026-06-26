/**
 * Jogos da Copa do Mundo (tema festivo do app).
 *
 * COMO ATUALIZAR: edite a lista COPA_JOGOS abaixo.
 * - dataISO: data e hora do jogo no formato 'AAAA-MM-DDTHH:MM:00'
 * - golsCasa / golsFora: deixe `null` enquanto o jogo não aconteceu;
 *   preencha com o placar depois que o jogo terminar.
 * O app calcula sozinho o que já passou e qual é o próximo confronto.
 *
 * ⚠️ Os jogos abaixo são um EXEMPLO (escala/placares ilustrativos).
 * Troque pelos jogos reais do Brasil quando tiver a tabela.
 */

export interface CopaTime {
  nome: string;
  flag: string; // emoji da bandeira
}

export interface CopaJogo {
  id: string;
  dataISO: string;
  fase: string;
  casa: CopaTime;
  fora: CopaTime;
  golsCasa: number | null;
  golsFora: number | null;
}

const BRASIL: CopaTime = { nome: 'Brasil', flag: '🇧🇷' };

export const COPA_JOGOS: CopaJogo[] = [
  {
    id: 'marrocos',
    dataISO: '2026-06-06T16:00:00',
    fase: 'Classificatórias',
    casa: BRASIL,
    fora: { nome: 'Marrocos', flag: '🇲🇦' },
    golsCasa: 1,
    golsFora: 1,
  },
  {
    id: 'haiti',
    dataISO: '2026-06-13T16:00:00',
    fase: 'Classificatórias',
    casa: BRASIL,
    fora: { nome: 'Haiti', flag: '🇭🇹' },
    golsCasa: 3,
    golsFora: 0,
  },
  {
    id: 'escocia',
    dataISO: '2026-06-20T16:00:00',
    fase: 'Classificatórias',
    casa: BRASIL,
    fora: { nome: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    golsCasa: 3,
    golsFora: 0,
  },
  {
    id: 'japao',
    dataISO: '2026-06-29T14:00:00',
    fase: '',
    casa: BRASIL,
    fora: { nome: 'Japão', flag: '🇯🇵' },
    golsCasa: null,
    golsFora: null,
  },
];

/** Jogo passado se já tem placar OU a data/hora já passou. */
export function jogoEncerrado(j: CopaJogo, agora: number): boolean {
  if (j.golsCasa !== null && j.golsFora !== null) return true;
  return new Date(j.dataISO).getTime() < agora;
}

/** Próximo confronto (primeiro ainda não encerrado), ou null. */
export function proximoJogo(agora: number): CopaJogo | null {
  const futuros = COPA_JOGOS
    .filter((j) => !jogoEncerrado(j, agora))
    .sort((a, b) => new Date(a.dataISO).getTime() - new Date(b.dataISO).getTime());
  return futuros[0] ?? null;
}
