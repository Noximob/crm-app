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
 * Baixa o PDF com RETOMADA: se a conexão cair no meio (download longo/lento),
 * continua de onde parou via Range (até 3 tentativas) em vez de recomeçar.
 */
async function baixarComRetomada(url: string, onProg: (loaded: number, total: number) => void): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let recebido = 0, total = 0, tentativas = 0;
  for (;;) {
    try {
      const resp = await fetch(url, recebido > 0 ? { headers: { Range: `bytes=${recebido}-` } } : undefined);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      if (recebido > 0 && resp.status === 200) { chunks.length = 0; recebido = 0; } // servidor ignorou o Range: recomeça
      if (!total) {
        const cr = resp.headers.get('content-range');
        total = cr ? parseInt(cr.split('/')[1] || '0', 10) : parseInt(resp.headers.get('content-length') || '0', 10);
      }
      const reader = resp.body!.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); recebido += value.length; onProg(recebido, total);
      }
      if (total && recebido < total) throw new Error('stream incompleto');
      break;
    } catch (e) {
      if (++tentativas > 3) throw e;
      await new Promise((r) => setTimeout(r, 1500 * tentativas)); // respira e retoma de onde parou
    }
  }
  const out = new Uint8Array(recebido);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

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
  // Zoom (1 = ajustado à tela). Com zoom, a rolagem vira navegação na página (pan) em vez de trocar de página.
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Carrega o documento
  useEffect(() => {
    let vivo = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let loadTask: any = null;
    setErro(false); setCarregando(true); setPage(1); setNumPages(0); setProg(null); setZoom(1);
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
          // baixa com retomada (conexão pode cair num download longo) e só então parseia
          const data = await baixarComRetomada(url, (l, t) => { if (vivo) setProg({ loaded: l, total: t }); });
          if (!vivo) return;
          void cachePut(url, data.slice().buffer as ArrayBuffer); // copia antes: o parser toma posse do buffer
          loadTask = pdfjs.getDocument({ data });
        }
        const doc = await loadTask.promise;
        if (!vivo) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
        setCarregando(false);
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
      const scale = Math.min(cw / v1.width, ch / v1.height) * zoom;
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
  }, [page, wrapRef, zoom]);

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

  // Scroll do mouse vira passar de página (listener nativo: precisa de passive:false).
  // Com zoom aplicado, a rolagem volta a ser rolagem normal (navegar pela página ampliada).
  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    const h = (e: WheelEvent) => {
      if (zoomRef.current > 1) return; // deixa o scroll nativo panear a página ampliada
      e.preventDefault();
      if (e.deltaY > 0) ir(1); else if (e.deltaY < 0) ir(-1);
    };
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
      onClick={(e) => { (e.currentTarget as HTMLDivElement).focus(); if (zoom === 1) ir(1); }}
      className={`relative w-full h-full bg-[#0d0d11] outline-none select-none ${zoom > 1 ? 'cursor-default' : 'cursor-pointer'}`}
      title={zoom > 1 ? 'Role para navegar pela página ampliada; use as setas pra trocar de página' : 'Role o mouse, clique ou use as setas pra passar as páginas'}
    >
      {carregando ? (
        <div className="absolute inset-0 flex items-center justify-center">
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
        </div>
      ) : (
        <div className={`absolute inset-0 flex ${zoom > 1 ? 'overflow-auto scrollbar-thin' : 'items-center justify-center overflow-hidden'}`}>
          <canvas ref={canvasRef} className={`m-auto shadow-[0_8px_40px_rgba(0,0,0,0.6)] ${zoom > 1 ? '' : 'max-w-full max-h-full'}`} />
        </div>
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
          {/* Zoom — ideal pra tabela pequena no modo apresentação */}
          <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-full bg-black/55 border border-white/10 px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} disabled={zoom <= 1} className="w-7 h-7 rounded-full text-white/85 hover:bg-white/15 disabled:opacity-30 text-base leading-none" title="Diminuir zoom">−</button>
            <span className="text-[10px] font-bold text-white/70 tabular-nums w-9 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)))} disabled={zoom >= 4} className="w-7 h-7 rounded-full text-white/85 hover:bg-white/15 disabled:opacity-30 text-base leading-none" title="Aumentar zoom">+</button>
          </div>
        </>
      )}
    </div>
  );
}
