/**
 * AYRA — o espaço do pré-lançamento (Nox Imóveis × Santer).
 *
 * O cronograma da equipe, as mídias de apoio (as artes de WhatsApp), a
 * apresentação oficial (a V2) e o mapa interativo de Penha.
 *
 * ONDE MORAM OS ARQUIVOS: em public/ayra, no próprio repositório — vão pro ar
 * junto com o site a cada push, sem upload manual. Não é o Firebase Storage
 * por dois motivos que não têm contorno:
 *   · a apresentação usa caminhos RELATIVOS (img/, video/, fonts/) e não pode
 *     ser alterada — ela precisa estar numa pasta de verdade, com as imagens
 *     e os vídeos do lado. O Storage entrega cada arquivo num link próprio,
 *     e os caminhos relativos quebrariam;
 *   · o botão "baixar" só baixa direto quando o arquivo é do mesmo site. Com
 *     link do Storage, o navegador abre a imagem numa aba em vez de baixar.
 *
 * QUEM VÊ: a conta da imobiliária, quem tem a área do Desenvolvedor (entra
 * automaticamente, como o gestor pediu) e quem ganhou a tag "Ayra" na tabela
 * de corretores do Desenvolvedor.
 */

export const AYRA_BASE = '/ayra';

/**
 * A apresentação oficial: a pasta "Ayra - Apresentacao v3 (HTML com videos)",
 * intocada. Na tela ela se chama "Apresentação V2" — foi o nome que o gestor
 * pediu no botão, e é por ele que a equipe procura. A primeira apresentação
 * foi apagada em 23/09/2026, a pedido dele (está no histórico do git).
 */
export const AYRA_APRESENTACAO_V2 = `${AYRA_BASE}/apresentacao-v2/index.html`;

/**
 * O Mapa Interativo de Penha: o `dist` do projeto Desktop/mapa-penha (Vite +
 * Cesium), copiado como está. O projeto é buildado com `base: "./"` e acha o
 * Cesium pelo `document.baseURI`, então funciona servido daqui de dentro.
 */
export const AYRA_MAPA = `${AYRA_BASE}/mapa/index.html`;

export const AYRA_AGENDA_PDF = `${AYRA_BASE}/agenda-acao-ayra.pdf`;
/** O nome com que o PDF sai no download — o mesmo do arquivo aprovado. */
export const AYRA_AGENDA_PDF_NOME = 'Agenda de acao - Ayra (18-09 a 30-10).pdf';

interface ComPermissoes {
  tipoConta?: string;
  permissoes?: { developer?: boolean; ayra?: boolean } | null;
}

/** Pode entrar no espaço Ayra? Dono e Desenvolvedor sempre; os demais, com a tag. */
export function podeVerAyra(u: ComPermissoes | null | undefined): boolean {
  if (!u) return false;
  return u.tipoConta === 'imobiliaria' || !!u.permissoes?.developer || !!u.permissoes?.ayra;
}

export interface MidiaAyra {
  arquivo: string;
  titulo: string;
  tipo: 'imagem' | 'video';
}

/**
 * As peças da pasta "Artes WhatsApp - Penha", na ordem dos arquivos.
 * Os títulos são os do "LEGENDAS SUGERIDAS.txt" da mesma pasta.
 */
export const MIDIAS_AYRA: MidiaAyra[] = [
  { arquivo: '01_beto_carrero_2bi.jpg', titulo: 'Beto Carrero R$ 2 bi', tipo: 'imagem' },
  { arquivo: '02_havan_mcdonalds.jpg', titulo: "Havan + McDonald's", tipo: 'imagem' },
  { arquivo: '03_parque_linear.jpg', titulo: 'Parque Linear', tipo: 'imagem' },
  { arquivo: '03_parque_linear_video.mp4', titulo: 'Parque Linear (vídeo)', tipo: 'video' },
  { arquivo: '04_aluguel_temporada.jpg', titulo: 'Aluguel por temporada', tipo: 'imagem' },
  { arquivo: '05_faltam_leitos.jpg', titulo: 'Faltam 13 mil leitos', tipo: 'imagem' },
  { arquivo: '06_viamar.jpg', titulo: 'ViaMar R$ 8 bi', tipo: 'imagem' },
  { arquivo: '07_santa_catarina.jpg', titulo: 'Santa Catarina', tipo: 'imagem' },
  { arquivo: '08_alto_padrao.jpg', titulo: 'Alto padrão', tipo: 'imagem' },
  { arquivo: '09_praias.jpg', titulo: 'Praias', tipo: 'imagem' },
  { arquivo: '10_aeroporto_regiao.jpg', titulo: 'Aeroporto e região', tipo: 'imagem' },
  { arquivo: '11_masterplan.jpg', titulo: 'Masterplan Jaime Lerner', tipo: 'imagem' },
];

export const urlMidia = (m: MidiaAyra) => `${AYRA_BASE}/midias/${m.arquivo}`;
