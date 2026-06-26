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
    id: 'g1',
    dataISO: '2026-06-15T13:00:00',
    fase: 'Fase de grupos',
    casa: BRASIL,
    fora: { nome: 'Sérvia', flag: '🇷🇸' },
    golsCasa: 2,
    golsFora: 0,
  },
  {
    id: 'g2',
    dataISO: '2026-06-20T16:00:00',
    fase: 'Fase de grupos',
    casa: BRASIL,
    fora: { nome: 'Suíça', flag: '🇨🇭' },
    golsCasa: 1,
    golsFora: 1,
  },
  {
    id: 'g3',
    dataISO: '2026-06-29T19:00:00',
    fase: 'Fase de grupos',
    casa: BRASIL,
    fora: { nome: 'Japão', flag: '🇯🇵' },
    golsCasa: null,
    golsFora: null,
  },
  {
    id: 'oitavas',
    dataISO: '2026-07-04T16:00:00',
    fase: 'Oitavas de final',
    casa: BRASIL,
    fora: { nome: 'A definir', flag: '🏳️' },
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
