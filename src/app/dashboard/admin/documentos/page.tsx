'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import PdfPager from '@/components/PdfPager';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';

type TipoDoc = 'pdf' | 'imagem' | 'video' | 'outro';

interface DocInterno {
  id: string;
  imobiliariaId: string;
  titulo: string;
  categoria: string;
  arquivoNome: string;
  url: string;
  /** Caminho no Storage — usado pra excluir o arquivo junto com o registro */
  storagePath?: string;
  tipo: TipoDoc;
  tamanhoBytes: number;
  criadoEm?: Timestamp;
  criadoPor?: string;
  /** Doc sintético do espelho demo (não existe no Storage) */
  demo?: boolean;
}

const CATEGORIAS = ['Treinamento', 'Contratação', 'Processos', 'Vendas', 'Institucional', 'Outros'];

/** Deriva o tipo do documento a partir da extensão do arquivo (com fallback pro mime). */
function tipoDoArquivo(nome: string, mime?: string): TipoDoc {
  const ext = (nome.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp'].includes(ext) || mime?.startsWith('image/')) return 'imagem';
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(ext) || mime?.startsWith('video/')) return 'video';
  return 'outro';
}

function fmtBytes(n: number): string {
  if (!n || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB`;
  if (n < 1073741824) return `${(n / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  return `${(n / 1073741824).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
}

function fmtData(t?: Timestamp): string {
  if (!t?.toDate) return '—';
  return t.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Imagem de demonstração inline (funciona offline, sem Storage)
const DEMO_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#12101a"/><rect x="40" y="40" width="1200" height="640" rx="24" fill="none" stroke="#FF1E56" stroke-width="3"/><text x="640" y="330" text-anchor="middle" font-family="Arial" font-size="56" font-weight="bold" fill="#ffffff">Documento de demonstração</text><text x="640" y="400" text-anchor="middle" font-family="Arial" font-size="30" fill="#9aa0b4">No modo espelho os arquivos reais não são carregados</text></svg>`
  );

const DEMO_DOCS: DocInterno[] = [
  { id: 'demo-1', imobiliariaId: 'espelho-demo', titulo: 'Manual de Contratação de Corretores', categoria: 'Contratação', arquivoNome: 'manual-contratacao.pdf', url: '', tipo: 'pdf', tamanhoBytes: 2415616, criadoEm: Timestamp.fromDate(new Date('2026-07-01T10:00:00')), demo: true },
  { id: 'demo-2', imobiliariaId: 'espelho-demo', titulo: 'Treinamento — Abordagem no WhatsApp', categoria: 'Treinamento', arquivoNome: 'treinamento-whatsapp.pdf', url: '', tipo: 'pdf', tamanhoBytes: 5872025, criadoEm: Timestamp.fromDate(new Date('2026-06-24T14:30:00')), demo: true },
  { id: 'demo-3', imobiliariaId: 'espelho-demo', titulo: 'Organograma da Imobiliária', categoria: 'Institucional', arquivoNome: 'organograma.png', url: DEMO_IMG, tipo: 'imagem', tamanhoBytes: 348160, criadoEm: Timestamp.fromDate(new Date('2026-06-18T09:15:00')), demo: true },
  { id: 'demo-4', imobiliariaId: 'espelho-demo', titulo: 'Vídeo de Boas-vindas ao Time', categoria: 'Treinamento', arquivoNome: 'boas-vindas.mp4', url: '', tipo: 'video', tamanhoBytes: 48234496, criadoEm: Timestamp.fromDate(new Date('2026-06-10T16:45:00')), demo: true },
  { id: 'demo-5', imobiliariaId: 'espelho-demo', titulo: 'Fluxo de Processos Internos', categoria: 'Processos', arquivoNome: 'processos-internos.pptx', url: '', tipo: 'outro', tamanhoBytes: 8912896, criadoEm: Timestamp.fromDate(new Date('2026-05-28T11:20:00')), demo: true },
  { id: 'demo-6', imobiliariaId: 'espelho-demo', titulo: 'Playbook de Vendas', categoria: 'Vendas', arquivoNome: 'playbook-vendas.pdf', url: '', tipo: 'pdf', tamanhoBytes: 3145728, criadoEm: Timestamp.fromDate(new Date('2026-05-15T08:00:00')), demo: true },
];

const TIPO_META: Record<TipoDoc, { label: string; cor: string; corClara: string }> = {
  pdf: { label: 'PDF', cor: '#FF1E56', corClara: '#FF7A97' },
  imagem: { label: 'Imagem', cor: '#34D399', corClara: '#6EE7B7' },
  video: { label: 'Vídeo', cor: '#9F6BFF', corClara: '#C4A6FF' },
  outro: { label: 'Arquivo', cor: '#7DD3FC', corClara: '#7DD3FC' },
};

function IconeTipo({ tipo, className }: { tipo: TipoDoc; className?: string }) {
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24' };
  if (tipo === 'pdf')
    return (
      <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15h6" /><path d="M9 11h2" /></svg>
    );
  if (tipo === 'imagem')
    return (
      <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
    );
  if (tipo === 'video')
    return (
      <svg {...common}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m10 9 5 3-5 3z" /></svg>
    );
  return (
    <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
  );
}

/** Visualizador em tela cheia (estilo apresentação, igual à experiência dos materiais). */
function Viewer({ docAberto, onClose }: { docAberto: DocInterno; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const meta = TIPO_META[docAberto.tipo];
  const semArquivo = !docAberto.url;

  return (
    <div className="fixed inset-0 z-[90] bg-[#0a0a0e] flex flex-col">
      {/* Barra fina no topo: título + fechar */}
      <div className="shrink-0 flex items-center gap-2.5 px-3 sm:px-4 py-2.5 border-b border-white/10 bg-[#101015]">
        <span className="shrink-0" style={{ color: meta.corClara }}>
          <IconeTipo tipo={docAberto.tipo} className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-white truncate">{docAberto.titulo}</div>
          <div className="text-[10.5px] text-text-secondary truncate">{docAberto.categoria} · {docAberto.arquivoNome}</div>
        </div>
        {docAberto.url && (
          <a
            href={docAberto.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            Abrir em nova aba
          </a>
        )}
        <button
          onClick={onClose}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white hover:bg-white/15 transition-colors"
          title="Fechar (Esc)"
        >
          ✕ <span className="hidden sm:inline">Fechar</span>
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-h-0 relative" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {semArquivo ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center al-card relative overflow-hidden p-8">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <span className="inline-flex mb-3" style={{ color: meta.corClara }}>
                <IconeTipo tipo={docAberto.tipo} className="w-10 h-10" />
              </span>
              <div className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-1.5">Documento de demonstração</div>
              <p className="text-sm text-text-secondary">No modo espelho os arquivos reais não são carregados. Na conta da imobiliária, este {meta.label.toLowerCase()} abre aqui em tela cheia.</p>
            </div>
          </div>
        ) : docAberto.tipo === 'pdf' ? (
          <PdfPager url={docAberto.url} />
        ) : docAberto.tipo === 'imagem' ? (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={docAberto.url} alt={docAberto.titulo} className="max-w-full max-h-full object-contain rounded-lg select-none shadow-[0_8px_40px_rgba(0,0,0,0.6)]" onClick={(e) => e.stopPropagation()} />
          </div>
        ) : docAberto.tipo === 'video' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <video src={docAberto.url} controls autoPlay playsInline className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center al-card relative overflow-hidden p-8">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <span className="inline-flex mb-3 text-[#7DD3FC]">
                <IconeTipo tipo="outro" className="w-10 h-10" />
              </span>
              <div className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-1.5">{docAberto.arquivoNome}</div>
              <p className="text-sm text-text-secondary mb-5">Este formato não abre embutido no navegador. Baixe ou abra em nova aba pra visualizar.</p>
              <a
                href={docAberto.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold text-sm shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
              >
                Baixar / abrir em nova aba
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentosImobiliariaPage() {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
  const [docs, setDocs] = useState<DocInterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCat, setFiltroCat] = useState<string>('');
  const [docAberto, setDocAberto] = useState<DocInterno | null>(null);

  // Formulário de envio
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const fileInputKey = useMemo(() => `${enviando}-${docs.length}`, [enviando, docs.length]);

  // Carregar documentos da imobiliária
  useEffect(() => {
    if (!userData?.imobiliariaId && !isEspelhoDemo) return;
    if (isEspelhoDemo) {
      setDocs(DEMO_DOCS);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const q = query(collection(db, 'documentosInternos'), where('imobiliariaId', '==', userData!.imobiliariaId));
        const snap = await getDocs(q);
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DocInterno);
        lista.sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0));
        setDocs(lista);
      } catch (e) {
        console.error('Erro ao buscar documentos:', e);
        showToast('Não foi possível carregar os documentos.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [userData, isEspelhoDemo]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) { showToast('Informe o título do documento.', 'error'); return; }
    if (!arquivo) { showToast('Escolha um arquivo pra enviar.', 'error'); return; }
    if (isEspelhoDemo) {
      showToast('Modo demonstração: o envio não é salvo.', 'info');
      setTitulo(''); setArquivo(null);
      return;
    }
    if (!userData?.imobiliariaId) { showToast('Conta sem imobiliária vinculada.', 'error'); return; }

    setEnviando(true);
    setProgresso(0);
    const storagePath = `documentosInternos/${userData.imobiliariaId}/${Date.now()}-${arquivo.name}`;
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, arquivo, arquivo.type ? { contentType: arquivo.type } : undefined);

    task.on(
      'state_changed',
      (snap) => setProgresso(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        console.error('Erro no upload:', err);
        showToast('Falha ao enviar o arquivo. Tente novamente.', 'error');
        setEnviando(false);
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          const novo = {
            imobiliariaId: userData.imobiliariaId!,
            titulo: titulo.trim(),
            categoria,
            arquivoNome: arquivo.name,
            url,
            storagePath,
            tipo: tipoDoArquivo(arquivo.name, arquivo.type),
            tamanhoBytes: arquivo.size,
            criadoEm: serverTimestamp(),
            criadoPor: currentUser?.uid || '',
          };
          const refDoc = await addDoc(collection(db, 'documentosInternos'), novo);
          setDocs((prev) => [{ ...novo, id: refDoc.id, criadoEm: Timestamp.now() } as DocInterno, ...prev]);
          setTitulo('');
          setArquivo(null);
          showToast('Documento enviado com sucesso!', 'success');
        } catch (err) {
          console.error('Erro ao salvar documento:', err);
          showToast('Arquivo enviado, mas houve erro ao salvar o registro.', 'error');
        } finally {
          setEnviando(false);
        }
      }
    );
  };

  const handleExcluir = async (d: DocInterno) => {
    const ok = await confirmDialog({
      title: 'Excluir documento',
      message: `Excluir "${d.titulo}"?\nO arquivo será removido do armazenamento e não poderá ser recuperado.`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    if (isEspelhoDemo) {
      setDocs((prev) => prev.filter((x) => x.id !== d.id));
      showToast('Modo demonstração: documento excluído (simulado).', 'success');
      return;
    }
    try {
      // Remove o arquivo do Storage (se já não existir, segue e apaga o registro)
      const alvo = d.storagePath ? ref(storage, d.storagePath) : d.url ? ref(storage, d.url) : null;
      if (alvo) await deleteObject(alvo).catch(() => { /* arquivo já removido: ok */ });
      await deleteDoc(doc(db, 'documentosInternos', d.id));
      setDocs((prev) => prev.filter((x) => x.id !== d.id));
      showToast('Documento excluído.', 'success');
    } catch (err) {
      console.error('Erro ao excluir documento:', err);
      showToast('Não foi possível excluir o documento.', 'error');
    }
  };

  // Contagem por categoria (chips) + agrupamento da listagem
  const contagem = useMemo(() => {
    const map: Record<string, number> = {};
    docs.forEach((d) => { map[d.categoria] = (map[d.categoria] || 0) + 1; });
    return map;
  }, [docs]);

  const grupos = useMemo(() => {
    const visiveis = filtroCat ? docs.filter((d) => d.categoria === filtroCat) : docs;
    const ordem = [...CATEGORIAS, ...Array.from(new Set(visiveis.map((d) => d.categoria))).filter((c) => !CATEGORIAS.includes(c))];
    return ordem
      .map((cat) => ({ cat, itens: visiveis.filter((d) => d.categoria === cat) }))
      .filter((g) => g.itens.length > 0);
  }, [docs, filtroCat]);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div>
        <h1 className="al-display text-2xl font-bold text-white uppercase tracking-[0.08em]">Documentos da Imobiliária</h1>
        <p className="text-sm text-text-secondary mt-1">Treinamentos, materiais de contratação e qualquer documento interno — visível só aqui na área do administrador, com visualização em estilo apresentação.</p>
      </div>

      {/* Card de envio */}
      <div className="al-card relative overflow-hidden p-4 sm:p-5">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-4">Enviar documento</h2>
        <form onSubmit={handleUpload} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr),220px,minmax(0,1fr),auto] lg:items-end">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Título *</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Treinamento de abordagem"
              disabled={enviando}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              disabled={enviando}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 disabled:opacity-50 cursor-pointer"
            >
              {CATEGORIAS.map((c) => <option key={c} value={c} className="bg-[#12101a] text-white">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Arquivo *</label>
            <input
              key={fileInputKey}
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,image/*,video/*"
              disabled={enviando}
              onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              className="w-full text-xs text-text-secondary file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white/[0.08] file:text-white file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-white/[0.14] file:transition-colors cursor-pointer disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-5 py-2 text-sm shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {enviando ? `Enviando… ${progresso}%` : 'Enviar'}
          </button>
        </form>
        {arquivo && !enviando && (
          <p className="text-[11px] text-text-secondary mt-2 truncate">
            Selecionado: <span className="text-white font-semibold">{arquivo.name}</span> · {fmtBytes(arquivo.size)} · tipo <span className="uppercase font-semibold" style={{ color: TIPO_META[tipoDoArquivo(arquivo.name, arquivo.type)].corClara }}>{TIPO_META[tipoDoArquivo(arquivo.name, arquivo.type)].label}</span>
          </p>
        )}
        {enviando && (
          <div className="mt-3">
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FF1E56] to-[#FF3364] transition-all duration-300" style={{ width: `${progresso}%` }} />
            </div>
            <p className="text-[11px] text-text-secondary mt-1.5 tabular-nums">Enviando {arquivo?.name}… {progresso}%</p>
          </div>
        )}
      </div>

      {/* Filtro por categoria */}
      {!loading && docs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltroCat('')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider transition-colors ${!filtroCat ? 'bg-[#FF1E56] text-white shadow-[0_0_14px_rgba(255,30,86,0.35)]' : 'bg-white/[0.06] text-text-secondary hover:text-white'}`}
          >
            Todas ({docs.length})
          </button>
          {CATEGORIAS.filter((c) => contagem[c]).map((c) => (
            <button
              key={c}
              onClick={() => setFiltroCat(filtroCat === c ? '' : c)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider transition-colors ${filtroCat === c ? 'bg-[#FF1E56] text-white shadow-[0_0_14px_rgba(255,30,86,0.35)]' : 'bg-white/[0.06] text-text-secondary hover:text-white'}`}
            >
              {c} ({contagem[c]})
            </button>
          ))}
        </div>
      )}

      {/* Listagem agrupada por categoria */}
      {loading ? (
        <div className="py-16 flex items-center justify-center"><LoadingState label="Carregando documentos…" /></div>
      ) : docs.length === 0 ? (
        <div className="py-16 text-center text-text-secondary text-sm">Nenhum documento enviado ainda. Use o formulário acima pra subir o primeiro.</div>
      ) : grupos.length === 0 ? (
        <div className="py-16 text-center text-text-secondary text-sm">Nenhum documento nesta categoria.</div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.cat}>
              <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.14em] mb-2.5 flex items-center gap-2">
                {g.cat}
                <span className="px-2 rounded-full bg-white/[0.06] text-[11px] text-text-secondary tabular-nums font-normal tracking-normal">{g.itens.length}</span>
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {g.itens.map((d) => {
                  const meta = TIPO_META[d.tipo];
                  return (
                    <div key={d.id} className="al-card relative overflow-hidden p-3.5 hover:border-[#FF1E56]/30 hover:-translate-y-0.5 transition-all duration-200">
                      <div className="absolute inset-x-0 top-0 gx-line" />
                      <div className="flex items-start gap-3">
                        <span
                          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                          style={{ color: meta.corClara, background: `${meta.cor}14`, borderColor: `${meta.cor}40` }}
                          title={meta.label}
                        >
                          <IconeTipo tipo={d.tipo} className="w-5 h-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-extrabold text-white leading-snug break-words">{d.titulo}</div>
                          <div className="text-[11px] text-text-secondary truncate mt-0.5" title={d.arquivoNome}>{d.arquivoNome}</div>
                          <div className="text-[10.5px] text-text-secondary mt-0.5 tabular-nums">{fmtBytes(d.tamanhoBytes)} · {fmtData(d.criadoEm)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => setDocAberto(d)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                          title="Abrir em tela cheia (estilo apresentação)"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                          Abrir
                        </button>
                        <button
                          onClick={() => handleExcluir(d)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors"
                          title="Excluir documento"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visualizador em tela cheia */}
      {docAberto && <Viewer docAberto={docAberto} onClose={() => setDocAberto(null)} />}
    </div>
  );
}
