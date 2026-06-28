import type { CopaJogo, CopaTime } from './copaJogos';

/**
 * Busca os jogos da Copa do Mundo 2026 ao vivo no TheSportsDB (chave grátis).
 * Liga = FIFA World Cup (id 4429). Se falhar/voltar vazio, quem chama usa o fallback estático.
 */
const ENDPOINT = 'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026';

/** Nome do time (inglês, como vem da API) -> nome em PT + código da bandeira (flagcdn). */
const TIMES: Record<string, CopaTime> = {
  Brazil: { nome: 'Brasil', cod: 'br' },
  Argentina: { nome: 'Argentina', cod: 'ar' },
  France: { nome: 'França', cod: 'fr' },
  Germany: { nome: 'Alemanha', cod: 'de' },
  Spain: { nome: 'Espanha', cod: 'es' },
  Portugal: { nome: 'Portugal', cod: 'pt' },
  England: { nome: 'Inglaterra', cod: 'gb-eng' },
  Netherlands: { nome: 'Holanda', cod: 'nl' },
  Italy: { nome: 'Itália', cod: 'it' },
  Belgium: { nome: 'Bélgica', cod: 'be' },
  Croatia: { nome: 'Croácia', cod: 'hr' },
  Uruguay: { nome: 'Uruguai', cod: 'uy' },
  Colombia: { nome: 'Colômbia', cod: 'co' },
  Mexico: { nome: 'México', cod: 'mx' },
  USA: { nome: 'Estados Unidos', cod: 'us' },
  'United States': { nome: 'Estados Unidos', cod: 'us' },
  Canada: { nome: 'Canadá', cod: 'ca' },
  Japan: { nome: 'Japão', cod: 'jp' },
  'South Korea': { nome: 'Coreia do Sul', cod: 'kr' },
  'Korea Republic': { nome: 'Coreia do Sul', cod: 'kr' },
  Morocco: { nome: 'Marrocos', cod: 'ma' },
  Senegal: { nome: 'Senegal', cod: 'sn' },
  Ghana: { nome: 'Gana', cod: 'gh' },
  Cameroon: { nome: 'Camarões', cod: 'cm' },
  Nigeria: { nome: 'Nigéria', cod: 'ng' },
  'South Africa': { nome: 'África do Sul', cod: 'za' },
  Switzerland: { nome: 'Suíça', cod: 'ch' },
  Serbia: { nome: 'Sérvia', cod: 'rs' },
  Poland: { nome: 'Polônia', cod: 'pl' },
  Denmark: { nome: 'Dinamarca', cod: 'dk' },
  Sweden: { nome: 'Suécia', cod: 'se' },
  Norway: { nome: 'Noruega', cod: 'no' },
  Austria: { nome: 'Áustria', cod: 'at' },
  Turkey: { nome: 'Turquia', cod: 'tr' },
  'Czech Republic': { nome: 'República Tcheca', cod: 'cz' },
  'Bosnia-Herzegovina': { nome: 'Bósnia', cod: 'ba' },
  Scotland: { nome: 'Escócia', cod: 'gb-sct' },
  Wales: { nome: 'País de Gales', cod: 'gb-wls' },
  Ecuador: { nome: 'Equador', cod: 'ec' },
  Peru: { nome: 'Peru', cod: 'pe' },
  Chile: { nome: 'Chile', cod: 'cl' },
  Paraguay: { nome: 'Paraguai', cod: 'py' },
  Venezuela: { nome: 'Venezuela', cod: 've' },
  'Costa Rica': { nome: 'Costa Rica', cod: 'cr' },
  Panama: { nome: 'Panamá', cod: 'pa' },
  Australia: { nome: 'Austrália', cod: 'au' },
  Iran: { nome: 'Irã', cod: 'ir' },
  'IR Iran': { nome: 'Irã', cod: 'ir' },
  'Saudi Arabia': { nome: 'Arábia Saudita', cod: 'sa' },
  Qatar: { nome: 'Catar', cod: 'qa' },
  Egypt: { nome: 'Egito', cod: 'eg' },
  Tunisia: { nome: 'Tunísia', cod: 'tn' },
  Algeria: { nome: 'Argélia', cod: 'dz' },
  'Ivory Coast': { nome: 'Costa do Marfim', cod: 'ci' },
  'New Zealand': { nome: 'Nova Zelândia', cod: 'nz' },
};

function resolveTime(nome: string): CopaTime {
  if (!nome) return { nome: 'A definir', cod: '' };
  return TIMES[nome.trim()] ?? { nome, cod: '' };
}

function placar(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface TsdbEvent {
  idEvent?: string;
  dateEvent?: string;
  strTime?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStage?: string;
  strGroup?: string;
}

/** Busca os jogos ao vivo. Lança erro se a resposta não tiver jogos. */
export async function fetchCopaJogos(): Promise<CopaJogo[]> {
  const resp = await fetch(ENDPOINT);
  if (!resp.ok) throw new Error(`API ${resp.status}`);
  const data = (await resp.json()) as { events?: TsdbEvent[] | null };
  const eventos = data.events;
  if (!Array.isArray(eventos) || eventos.length === 0) throw new Error('sem jogos');

  return eventos
    .filter((e) => e.dateEvent)
    .map((e) => {
      const hora = e.strTime && e.strTime.length >= 5 ? e.strTime.slice(0, 8) : '00:00:00';
      // dateEvent + strTime vêm em UTC -> guardamos com 'Z' e formatamos no fuso local depois
      const dataISO = `${e.dateEvent}T${hora}Z`;
      return {
        id: e.idEvent || `${e.dateEvent}-${e.strHomeTeam}`,
        dataISO,
        fase: e.strStage || e.strGroup || '',
        casa: resolveTime(e.strHomeTeam || ''),
        fora: resolveTime(e.strAwayTeam || ''),
        golsCasa: placar(e.intHomeScore),
        golsFora: placar(e.intAwayScore),
      } as CopaJogo;
    })
    .sort((a, b) => new Date(a.dataISO).getTime() - new Date(b.dataISO).getTime());
}
