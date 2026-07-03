/** Conversão de links para CDN e compartilhamento — portado fiel do app de materiais. */

/** GitHub/raw → jsDelivr; Dropbox → conteúdo bruto; Drive → download direto. */
export function toCdn(url?: string): string {
  if (!url) return url ?? '';
  url = url.trim();
  let m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (m) return `https://cdn.jsdelivr.net/gh/${m[1]}/${m[2]}@${m[3]}/${m[4]}`;
  m = url.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);
  if (m) return `https://cdn.jsdelivr.net/gh/${m[1]}/${m[2]}@${m[3]}/${m[4]}`;
  if (/^https?:\/\/(www\.)?dropbox\.com\//i.test(url)) {
    return url.replace(/^https?:\/\/(www\.)?dropbox\.com\//i, 'https://dl.dropboxusercontent.com/');
  }
  m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/i);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  return url;
}

/** Extrai o id de um vídeo do YouTube (ou null). */
export function youtubeId(url?: string): string | null {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function waLink(text: string): string {
  return 'https://wa.me/?text=' + encodeURIComponent(text);
}

function fileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.split('/').pop() || '') || 'arquivo';
  } catch {
    return 'arquivo';
  }
}

/**
 * Encaminhar pelo WhatsApp: no celular tenta enviar o ARQUIVO de verdade;
 * senão (ou no PC) abre o WhatsApp com o LINK.
 */
export async function encaminharWhatsApp(url: string, text: string, asFile: boolean): Promise<void> {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { canShare?: (d?: unknown) => boolean }) : null;
  if (asFile && nav?.canShare) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const b = await r.blob();
        const f = new File([b], fileNameFromUrl(url), { type: b.type || 'application/octet-stream' });
        if (nav.canShare({ files: [f] })) {
          await nav.share({ files: [f], text });
          return;
        }
      }
    } catch {
      /* CORS/erro → cai pro link */
    }
  }
  window.open(waLink(text), '_blank');
}
