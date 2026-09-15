'use client';

/**
 * MÍDIAS DE APOIO — as artes de WhatsApp de Penha.
 *
 * As 12 peças da pasta (11 imagens 1080×1350 e 1 vídeo vertical). Clicar
 * abre maior num pop-up que rola — a arte é alta e precisa ser vista
 * inteira. Cada uma baixa com o nome original do arquivo.
 */
import React, { useEffect, useState } from 'react';
import { MIDIAS_AYRA, urlMidia, type MidiaAyra } from '@/lib/ayra';

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

function Baixar({ m, destaque = false }: { m: MidiaAyra; destaque?: boolean }) {
  return (
    <a
      href={urlMidia(m)}
      download={m.arquivo}
      onClick={(e) => e.stopPropagation()}
      title={`Baixar ${m.arquivo}`}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg font-bold transition-colors ${destaque
        ? 'px-3 py-1.5 text-[12px] text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110'
        : 'px-2 py-1 text-[11px] text-text-secondary border border-white/10 bg-white/[0.04] hover:text-white hover:bg-white/[0.08]'}`}
    >
      <DownloadIcon className="h-3.5 w-3.5" />
      Baixar
    </a>
  );
}

export default function Midias() {
  const [aberta, setAberta] = useState<MidiaAyra | null>(null);

  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberta(null); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberta]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {MIDIAS_AYRA.map((m) => (
          <div key={m.arquivo} className="al-card overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={() => setAberta(m)}
              className="group relative block w-full aspect-[4/5] bg-black/40 overflow-hidden"
              title={`Abrir ${m.titulo}`}
            >
              {m.tipo === 'imagem' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urlMidia(m)} alt={m.titulo} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              ) : (
                <>
                  <video src={`${urlMidia(m)}#t=0.1`} preload="metadata" muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid place-items-center h-12 w-12 rounded-full bg-black/55 border border-white/30 text-white text-[16px] pl-0.5">▶</span>
                  </span>
                </>
              )}
            </button>
            <div className="flex items-center gap-2 px-2.5 py-2">
              <p className="flex-1 min-w-0 text-[11.5px] font-semibold leading-tight text-white line-clamp-2" title={m.titulo}>{m.titulo}</p>
              <Baixar m={m} />
            </div>
          </div>
        ))}
      </div>

      {aberta && (
        <div
          className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm overflow-y-auto overscroll-contain"
          onClick={() => setAberta(null)}
          role="dialog"
          aria-modal="true"
          aria-label={aberta.titulo}
        >
          <div className="min-h-full flex items-start justify-center p-3 sm:p-6">
            <div
              className="w-full max-w-[720px] bg-[#12101a] border border-white/10 rounded-2xl overflow-clip shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2.5 bg-[#12101a]/95 backdrop-blur border-b border-white/10">
                <p className="flex-1 min-w-0 text-[13px] font-bold text-white truncate">{aberta.titulo}</p>
                <Baixar m={aberta} destaque />
                <button
                  type="button"
                  onClick={() => setAberta(null)}
                  className="px-2.5 py-1.5 rounded-lg text-[13px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
              {aberta.tipo === 'imagem' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urlMidia(aberta)} alt={aberta.titulo} className="block w-full h-auto" />
              ) : (
                <video src={urlMidia(aberta)} controls autoPlay playsInline className="block w-full h-auto bg-black" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
