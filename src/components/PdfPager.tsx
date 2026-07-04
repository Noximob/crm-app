'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ---- Cache local de PDFs (IndexedDB): baixou uma vez, abre na hora depois ----
const DB_NAME = 'nox-pdf-cache';
const STORE = 'pdfs';
const MAX_ITENS = 12;

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function cacheGet(url: string): Promise<ArrayBuffer | null> {
  try {
    const db = await abrirDb();
    return await new Promise((res) => {
      const t = db.transaction(STORE, 'readonly').objectStore(STORE).get(url);
      t.onsuccess = () => res(t.result ? (t.result.data as ArrayBuffer) : null);
      t.onerror = () => res(null);
    });
  } catch { return null; }
}
async function cachePut(url: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await abrirDb();
    const st = db.transaction(STORE, 'readwrite').objectStore(STORE);
    st.put({ ts: Date.now(), data }, url);
    // poda os mais antigos além do limite
    const keysReq = st.getAllKeys();
    keysReq.onsuccess = () => {
      const keys = keysReq.result as string[];
      if (keys.length <= MAX_ITENS) return;
      const st2 = db.transaction(STORE, 'readwrite').objectStore(STORE);
      const items: { key: string; ts: number }[] = [];
      const cur = st2.openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (c) { items.push({ key: c.key as string, ts: (c.value?.ts as number) || 0 }); c.continue(); }
        else {
          items.sort((a, b) => a.ts - b.ts).slice(0, items.length - MAX_ITENS)
            .forEach((i) => db.transaction(STORE, 'readwrite').objectStore(STORE).delete(i.key));
        }
      };
    };
  } catch { /* quota cheia etc — segue sem cache */ }
}

const fmtMB = (n: number) => (n / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB';

/**
 * Visualizador de PDF página a página (modo apresentação):
 * cada rolada do mouse, clique ou seta pula UMA página inteira, ajustada à tela.
 * Baixa com barra de progresso e guarda em cache local (reabrir é instantâneo).
 * Se o PDF não puder ser lido (ex.: hospedagem sem CORS), cai pro iframe nativo.
 */
export default function PdfPager({ url, innerRef }: { url: string; innerRef?: React.RefObject<HTMLDivElement> }) {
  const localRef = useRef<HTMLDivElement>(null);
  const wrapRef = innerRef ?? localRef;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [prog, setProg] = useState<{ loaded: number; total: number } | null>(null);
  const lastNav = useRef(0);

  // Carrega o documento
  useEffect(() => {
    let vivo = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let loadTask: any = null;
    setErro(false); setCarregando(true); setPage(1); setNumPages(0); setProg(null);
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        // worker servido de public/ (copiado de node_modules/pdfjs-dist/build — manter em sincronia ao atualizar o pacote)
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const cached = await cacheGet(url);
        if (cached) {
          // já baixado antes: abre na hora
          loadTask = pdfjs.getDocument({ data: new Uint8Array(cached.slice(0)) });
        } else {
          loadTask = pdfjs.getDocument({ url });
          loadTask.onProgress = (p: { loaded: number; total?: number }) => { if (vivo) setProg({ loaded: p.loaded, total: p.total || 0 }); };
        }
        const doc = await loadTask.promise;
        if (!vivo) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
        setCarregando(false);
        if (!cached) {
          // guarda no cache local pra próxima abertura ser instantânea
          doc.getData().then((d: Uint8Array) => { void cachePut(url, d.slice(0).buffer as ArrayBuffer); }).catch(() => { /* sem cache: ok */ });
        }
      } catch {
        if (vivo) { setErro(true); setCarregando(false); }
      }
    })();
    return () => { vivo = false; try { loadTask?.destroy?.(); } catch { /* ok */ } docRef.current = null; };
  }, [url]);

  // Renderiza a página atual inteira, ajustada ao contêiner
  const render = useCallback(async () => {
    const doc = docRef.current, canvas = canvasRef.current, wrap = wrapRef.current;
    if (!doc || !canvas || !wrap) return;
    try {
      const p = await doc.getPage(page);
      const cw = wrap.clientWidth, ch = wrap.clientHeight - 0;
      if (!cw || !ch) return;
      const v1 = p.getViewport({ scale: 1 });
      const scale = Math.min(cw / v1.width, ch / v1.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const vp = p.getViewport({ scale: scale * dpr });
      canvas.width = vp.width; canvas.height = vp.height;
      canvas.style.width = `${vp.width / dpr}px`;
      canvas.style.height = `${vp.height / dpr}px`;
      try { renderTaskRef.current?.cancel?.(); } catch { /* ok */ }
      const task = p.render({ canvasContext: canvas.getContext('2d')!, viewport: vp });
      renderTaskRef.current = task;
      await task.promise.catch(() => { /* cancelado no meio: ok */ });
    } catch { /* doc destruído ou página trocada */ }
  }, [page, wrapRef]);

  useEffect(() => { if (!carregando && !erro) render(); }, [render, carregando, erro, numPages]);

  // Re-renderiza quando o tamanho muda (inclui entrar/sair da tela cheia)
  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [render, wrapRef]);

  const ir = useCallback((delta: number) => {
    const agora = Date.now();
    if (agora - lastNav.current < 250) return; // uma rolada = uma página
    lastNav.current = agora;
    setPage((p) => Math.min(Math.max(1, p + delta), numPages || 1));
  }, [numPages]);

  // Scroll do mouse vira passar de página (listener nativo: precisa de passive:false)
  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    const h = (e: WheelEvent) => { e.preventDefault(); if (e.deltaY > 0) ir(1); else if (e.deltaY < 0) ir(-1); };
    wrap.addEventListener('wheel', h, { passive: false });
    return () => wrap.removeEventListener('wheel', h);
  }, [ir, wrapRef]);

  const onKey = (e: React.KeyboardEvent) => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); ir(1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); ir(-1); }
  };

  if (erro) {
    // Fallback: visualizador nativo (rolagem contínua), melhor do que nada
    return <iframe src={`${url}#zoom=100`} title="PDF" className="w-full h-full bg-white" allow="fullscreen" allowFullScreen />;
  }

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={onKey}
      onClick={(e) => { (e.currentTarget as HTMLDivElement).focus(); ir(1); }}
      className="relative w-full h-full bg-[#0d0d11] flex items-center justify-center outline-none select-none cursor-pointer"
      title="Role o mouse, clique ou use as setas pra passar as páginas"
    >
      {carregando ? (
        <div className="flex flex-col items-center gap-3 px-6 w-full max-w-sm">
          <span className="text-sm text-white/65 tabular-nums">
            {prog && prog.total > 0
              ? `Baixando… ${fmtMB(prog.loaded)} de ${fmtMB(prog.total)} (${Math.min(100, Math.round((prog.loaded / prog.total) * 100))}%)`
              : prog ? `Baixando… ${fmtMB(prog.loaded)}` : 'Carregando PDF…'}
          </span>
          {prog && prog.total > 0 && (
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${Math.min(100, (prog.loaded / prog.total) * 100)}%` }} />
            </div>
          )}
          <span className="text-[11px] text-white/35 text-center">Só na primeira vez — depois este material abre na hora.</span>
        </div>
      ) : (
        <canvas ref={canvasRef} className="max-w-full max-h-full shadow-[0_8px_40px_rgba(0,0,0,0.6)]" />
      )}

      {!carregando && numPages > 0 && (
        <>
          {/* Setas laterais */}
          <button
            onClick={(e) => { e.stopPropagation(); ir(-1); }}
            disabled={page <= 1}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full text-xl text-white bg-black/45 hover:bg-black/70 border border-white/15 flex items-center justify-center disabled:opacity-25 transition-colors"
            title="Página anterior"
          >‹</button>
          <button
            onClick={(e) => { e.stopPropagation(); ir(1); }}
            disabled={page >= numPages}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full text-xl text-white bg-black/45 hover:bg-black/70 border border-white/15 flex items-center justify-center disabled:opacity-25 transition-colors"
            title="Próxima página"
          >›</button>
          {/* Contador */}
          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full text-[11px] font-bold text-white/85 bg-black/55 border border-white/10 tabular-nums pointer-events-none">
            {page} / {numPages}
          </span>
        </>
      )}
    </div>
  );
}
