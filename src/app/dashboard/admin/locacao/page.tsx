'use client';

/**
 * SETOR DE LOCAÇÃO — a área do administrador.
 *
 * Três abas, na ordem da vida real de um aluguel:
 *
 *   🏠 ANÚNCIOS    o cadastro completo do imóvel e o botão que gera o
 *                  pacote de publicação. O pacote segue o mesmo desenho da
 *                  Auditoria: um documento auto-suficiente que o gestor
 *                  cola no Claude (Cowork), que publica nos portais com as
 *                  contas da imobiliária. Nenhum portal tem API pública de
 *                  publicação — é assim ou integrador pago.
 *
 *   📄 CONTRATOS   locador, locatário, termos, garantia, taxa de
 *                  administração e os documentos (contrato assinado,
 *                  vistoria, RG/CPF) no Storage.
 *
 *   💰 COBRANÇAS   o espelho financeiro. Hoje mostra o cronograma PREVISTO
 *                  derivado de cada contrato, rotulado como previsão; a
 *                  integração Asaas (boleto/PIX, webhook de pagamento,
 *                  repasse ao locador) vai transformar previsão em fato.
 *                  A chave da API do Asaas NÃO entra por esta tela: ela é
 *                  segredo de servidor e vai morar numa function.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import {
  collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  TIPOS_IMOVEL, MOBILIADO, COMODIDADES, PORTAIS, GARANTIAS, STATUS_ANUNCIO,
  INDICES_REAJUSTE, STATUS_CONTRATO,
  IMOVEL_VAZIO, CONTRATO_VAZIO,
  totalMensal, fmtValor, pacotePortais, fimContrato, cronogramaPrevisto,
  type ImovelLocacao, type ContratoLocacao, type StatusAnuncio, type StatusContrato,
} from '@/lib/locacao';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40';
const btnOuro = 'px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40';
const rotCls = 'text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary block mb-1';
const pillCls = (ativo: boolean) => `px-4 py-1.5 rounded-full text-[12px] font-extrabold uppercase tracking-wider border transition-colors ${
  ativo ? 'bg-gradient-to-r from-[#E8C547] to-[#C89210] border-[#E8C547]/60 text-[#181203]' : 'border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white'
}`;

const Campo = ({ rot, children, largura = '' }: { rot: string; children: React.ReactNode; largura?: string }) => (
  <div className={largura}><label className={rotCls}>{rot}</label>{children}</div>
);

/** número de input de texto: vazio = null, vírgula vale como decimal */
const num = (s: string): number | null => {
  const t = s.replace(/\./g, '').replace(',', '.').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

function Marcaveis({ opcoes, sel, onSel }: { opcoes: readonly string[]; sel: string[]; onSel: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const on = sel.includes(o);
        return (
          <button key={o} type="button"
            onClick={() => onSel(on ? sel.filter((x) => x !== o) : [...sel, o])}
            className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold border transition-colors ${
              on ? 'bg-[#E8C547]/15 border-[#E8C547]/50 text-[#FFE9A6]' : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-white'
            }`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function LocacaoPage() {
  const { userData, currentUser, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  const [aba, setAba] = useState<'anuncios' | 'contratos' | 'cobrancas'>('anuncios');
  const [imoveis, setImoveis] = useState<ImovelLocacao[]>([]);
  const [contratos, setContratos] = useState<ContratoLocacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  // --- carga ---
  const carregar = useCallback(async () => {
    if (!imobiliariaId || isEspelhoDemo) { setCarregando(false); return; }
    try {
      const [si, sc] = await Promise.all([
        getDocs(query(collection(db, 'locacaoImoveis'), where('imobiliariaId', '==', imobiliariaId))),
        getDocs(query(collection(db, 'locacaoContratos'), where('imobiliariaId', '==', imobiliariaId))),
      ]);
      setImoveis(si.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ImovelLocacao, 'id'>) })));
      setContratos(sc.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContratoLocacao, 'id'>) })));
    } catch (e) { console.error('locacao carregar:', e); }
    setCarregando(false);
  }, [imobiliariaId, isEspelhoDemo]);
  useEffect(() => { carregar(); }, [carregar]);

  // =========================================================================
  // ABA 1 · ANÚNCIOS
  // =========================================================================
  const [editando, setEditando] = useState<ImovelLocacao | null>(null);
  const [form, setForm] = useState<Omit<ImovelLocacao, 'id' | 'imobiliariaId'>>({ ...IMOVEL_VAZIO });
  const [formAberto, setFormAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [subindoFotos, setSubindoFotos] = useState(false);

  const f = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  const abrirNovo = () => { setEditando(null); setForm({ ...IMOVEL_VAZIO }); setFormAberto(true); };
  const abrirEdicao = (i: ImovelLocacao) => {
    const { id: _id, imobiliariaId: _imo, ...resto } = i;
    setEditando(i); setForm({ ...IMOVEL_VAZIO, ...resto }); setFormAberto(true);
  };

  const salvarImovel = async () => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    if (!imobiliariaId || !currentUser) return;
    if (!form.titulo.trim()) { showToast('O anúncio precisa de um título.', 'error'); return; }
    if (!form.aluguel) { showToast('Informe o valor do aluguel.', 'error'); return; }
    setSalvando(true);
    try {
      if (editando) {
        await updateDoc(doc(db, 'locacaoImoveis', editando.id), { ...form, atualizadoEm: serverTimestamp() });
        showToast('Anúncio atualizado.', 'success');
      } else {
        // código sequencial legível: LOC-001, LOC-002…
        const seq = imoveis.length + 1;
        const codigo = form.codigo.trim() || `LOC-${String(seq).padStart(3, '0')}`;
        await addDoc(collection(db, 'locacaoImoveis'), {
          ...form, codigo, imobiliariaId, criadoEm: serverTimestamp(),
        });
        showToast(`Imóvel ${codigo} cadastrado.`, 'success');
      }
      setFormAberto(false);
      await carregar();
    } catch (e) { console.error(e); showToast('Não foi possível salvar.', 'error'); }
    setSalvando(false);
  };

  const excluirImovel = async (i: ImovelLocacao) => {
    const ok = await confirmDialog({
      title: 'Excluir este imóvel?',
      message: `${i.codigo} — ${i.titulo}. Os contratos ligados a ele NÃO são excluídos.`,
      confirmLabel: 'Excluir', danger: true,
    });
    if (!ok) return;
    await deleteDoc(doc(db, 'locacaoImoveis', i.id));
    showToast('Imóvel excluído.', 'info');
    carregar();
  };

  const subirFotos = async (arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId) return;
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    setSubindoFotos(true);
    try {
      const urls: string[] = [];
      for (const a of Array.from(arquivos)) {
        const caminho = `locacao/${imobiliariaId}/fotos/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, caminho), a, a.type ? { contentType: a.type } : undefined);
        await task;
        urls.push(await getDownloadURL(task.snapshot.ref));
      }
      f('fotos', [...form.fotos, ...urls]);
      showToast(`${urls.length} foto${urls.length > 1 ? 's' : ''} no ar.`, 'success');
    } catch (e) { console.error(e); showToast('Falha ao subir as fotos.', 'error'); }
    setSubindoFotos(false);
  };

  const copiarPacote = async (i: ImovelLocacao) => {
    try {
      await navigator.clipboard.writeText(pacotePortais(i));
      showToast('Pacote copiado — cola no Claude e ele publica nos portais.', 'success');
    } catch { showToast('Não foi possível copiar.', 'error'); }
  };

  const baixarPacote = (i: ImovelLocacao) => {
    const blob = new Blob([pacotePortais(i)], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `anuncio-${(i.codigo || 'imovel').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // =========================================================================
  // ABA 2 · CONTRATOS
  // =========================================================================
  const [cEditando, setCEditando] = useState<ContratoLocacao | null>(null);
  const [cForm, setCForm] = useState<Omit<ContratoLocacao, 'id' | 'imobiliariaId'>>({ ...CONTRATO_VAZIO });
  const [cFormAberto, setCFormAberto] = useState(false);
  const [cSalvando, setCSalvando] = useState(false);
  const [subindoDoc, setSubindoDoc] = useState(false);

  const fc = <K extends keyof typeof cForm>(k: K, v: (typeof cForm)[K]) => setCForm((p) => ({ ...p, [k]: v }));

  const imovelDe = useCallback(
    (id: string) => imoveis.find((x) => x.id === id),
    [imoveis],
  );

  const abrirNovoContrato = () => { setCEditando(null); setCForm({ ...CONTRATO_VAZIO }); setCFormAberto(true); };
  const abrirEdicaoContrato = (c: ContratoLocacao) => {
    const { id: _id, imobiliariaId: _imo, ...resto } = c;
    setCEditando(c); setCForm({ ...CONTRATO_VAZIO, ...resto }); setCFormAberto(true);
  };

  /** Escolher o imóvel puxa o locador do cadastro — digitado uma vez só. */
  const aoEscolherImovel = (id: string) => {
    fc('imovelId', id);
    const i = imovelDe(id);
    if (i && !cForm.locadorNome) {
      setCForm((p) => ({
        ...p, imovelId: id,
        locadorNome: i.locadorNome, locadorDoc: i.locadorDoc,
        locadorEmail: i.locadorEmail, locadorTelefone: i.locadorTelefone,
        valorAluguel: p.valorAluguel ?? i.aluguel,
      }));
    }
  };

  const salvarContrato = async () => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    if (!imobiliariaId) return;
    if (!cForm.imovelId) { showToast('Escolha o imóvel.', 'error'); return; }
    if (!cForm.locatarioNome.trim()) { showToast('Informe o locatário.', 'error'); return; }
    if (!cForm.inicio || !cForm.valorAluguel || !cForm.diaVencimento) {
      showToast('Início, valor do aluguel e dia de vencimento são obrigatórios.', 'error'); return;
    }
    setCSalvando(true);
    try {
      if (cEditando) {
        await updateDoc(doc(db, 'locacaoContratos', cEditando.id), { ...cForm, atualizadoEm: serverTimestamp() });
        showToast('Contrato atualizado.', 'success');
      } else {
        await addDoc(collection(db, 'locacaoContratos'), { ...cForm, imobiliariaId, criadoEm: serverTimestamp() });
        // o imóvel do contrato ativo sai de "anunciado" sozinho
        if (cForm.status === 'ativo') {
          await updateDoc(doc(db, 'locacaoImoveis', cForm.imovelId), { status: 'alugado', atualizadoEm: serverTimestamp() });
        }
        showToast('Contrato criado.', 'success');
      }
      setCFormAberto(false);
      await carregar();
    } catch (e) { console.error(e); showToast('Não foi possível salvar.', 'error'); }
    setCSalvando(false);
  };

  const excluirContrato = async (c: ContratoLocacao) => {
    const ok = await confirmDialog({
      title: 'Excluir este contrato?',
      message: `${c.locatarioNome} — ${imovelDe(c.imovelId)?.titulo || 'imóvel'}. Os documentos anexados também saem.`,
      confirmLabel: 'Excluir', danger: true,
    });
    if (!ok) return;
    await Promise.all(c.documentos.filter((d) => d.storagePath).map((d) =>
      deleteObject(ref(storage, d.storagePath!)).catch(() => { /* já não existia */ })));
    await deleteDoc(doc(db, 'locacaoContratos', c.id));
    showToast('Contrato excluído.', 'info');
    carregar();
  };

  const subirDocumento = async (arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId) return;
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    setSubindoDoc(true);
    try {
      const novos = [...cForm.documentos];
      for (const a of Array.from(arquivos)) {
        const storagePath = `locacao/${imobiliariaId}/contratos/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, storagePath), a, a.type ? { contentType: a.type } : undefined);
        await task;
        novos.push({ nome: a.name, url: await getDownloadURL(task.snapshot.ref), storagePath });
      }
      fc('documentos', novos);
      showToast('Documento anexado.', 'success');
    } catch (e) { console.error(e); showToast('Falha ao subir o documento.', 'error'); }
    setSubindoDoc(false);
  };

  // =========================================================================
  // render
  // =========================================================================
  if (carregando) {
    return <div className="min-h-screen py-8 px-4"><div className="max-w-3xl mx-auto al-card p-8 text-center text-sm text-text-secondary">Carregando o setor de locação…</div></div>;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto mb-5">
        <span className="gx-tag mb-2 inline-flex"><span>Setor de Locação</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Locação</h1>
        <p className="text-text-secondary text-sm mt-1 mb-3">
          Do anúncio ao repasse: cadastre o imóvel, gere o pacote pros portais, registre o contrato e acompanhe as cobranças.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setAba('anuncios')} className={pillCls(aba === 'anuncios')}>🏠 Imóveis & Anúncios</button>
          <button type="button" onClick={() => setAba('contratos')} className={pillCls(aba === 'contratos')}>📄 Contratos</button>
          <button type="button" onClick={() => setAba('cobrancas')} className={pillCls(aba === 'cobrancas')}>💰 Cobranças</button>
        </div>
      </div>

      {/* ═════════════ ANÚNCIOS ═════════════ */}
      {aba === 'anuncios' && (
        <div className="max-w-3xl mx-auto space-y-3">
          {!formAberto && (
            <button onClick={abrirNovo} className={btnOuro}>+ Cadastrar imóvel</button>
          )}

          {formAberto && (
            <div className="al-card relative overflow-hidden p-5 space-y-4">
              <div className="absolute inset-x-0 top-0 gx-line-gold" />
              <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em]">
                {editando ? `Editar ${editando.codigo}` : 'Novo imóvel para locação'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Campo rot="Título do anúncio" largura="sm:col-span-2">
                  <input className={inputCls} value={form.titulo} onChange={(e) => f('titulo', e.target.value)}
                    placeholder="Apartamento 2 quartos com sacada — Centro, Penha" />
                </Campo>
                <Campo rot="Tipo">
                  <select className={inputCls} value={form.tipo} onChange={(e) => f('tipo', e.target.value)}>
                    {TIPOS_IMOVEL.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Campo>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <Campo rot="Rua" largura="col-span-2 sm:col-span-3">
                  <input className={inputCls} value={form.rua} onChange={(e) => f('rua', e.target.value)} />
                </Campo>
                <Campo rot="Número"><input className={inputCls} value={form.numero} onChange={(e) => f('numero', e.target.value)} /></Campo>
                <Campo rot="Compl." largura="col-span-1 sm:col-span-2">
                  <input className={inputCls} value={form.complemento} onChange={(e) => f('complemento', e.target.value)} placeholder="apto 302" />
                </Campo>
                <Campo rot="Bairro" largura="col-span-2"><input className={inputCls} value={form.bairro} onChange={(e) => f('bairro', e.target.value)} /></Campo>
                <Campo rot="Cidade" largura="col-span-2"><input className={inputCls} value={form.cidade} onChange={(e) => f('cidade', e.target.value)} placeholder="Penha/SC" /></Campo>
                <Campo rot="CEP" largura="col-span-2"><input className={inputCls} value={form.cep} onChange={(e) => f('cep', e.target.value)} /></Campo>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <Campo rot="Quartos"><input className={inputCls} inputMode="numeric" value={form.quartos ?? ''} onChange={(e) => f('quartos', num(e.target.value))} /></Campo>
                <Campo rot="Suítes"><input className={inputCls} inputMode="numeric" value={form.suites ?? ''} onChange={(e) => f('suites', num(e.target.value))} /></Campo>
                <Campo rot="Banheiros"><input className={inputCls} inputMode="numeric" value={form.banheiros ?? ''} onChange={(e) => f('banheiros', num(e.target.value))} /></Campo>
                <Campo rot="Vagas"><input className={inputCls} inputMode="numeric" value={form.vagas ?? ''} onChange={(e) => f('vagas', num(e.target.value))} /></Campo>
                <Campo rot="Área priv. m²"><input className={inputCls} inputMode="decimal" value={form.areaPrivativa ?? ''} onChange={(e) => f('areaPrivativa', num(e.target.value))} /></Campo>
                <Campo rot="Área total m²"><input className={inputCls} inputMode="decimal" value={form.areaTotal ?? ''} onChange={(e) => f('areaTotal', num(e.target.value))} /></Campo>
                <Campo rot="Andar"><input className={inputCls} value={form.andar} onChange={(e) => f('andar', e.target.value)} placeholder="3º" /></Campo>
                <Campo rot="Mobília" largura="col-span-2">
                  <select className={inputCls} value={form.mobiliado} onChange={(e) => f('mobiliado', e.target.value)}>
                    {MOBILIADO.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Campo>
              </div>

              <Campo rot="Comodidades">
                <Marcaveis opcoes={COMODIDADES} sel={form.comodidades} onSel={(v) => f('comodidades', v)} />
              </Campo>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Campo rot="Aluguel (R$/mês)"><input className={inputCls} inputMode="decimal" value={form.aluguel ?? ''} onChange={(e) => f('aluguel', num(e.target.value))} /></Campo>
                <Campo rot="Condomínio"><input className={inputCls} inputMode="decimal" value={form.condominio ?? ''} onChange={(e) => f('condominio', num(e.target.value))} /></Campo>
                <Campo rot="IPTU (mensal)"><input className={inputCls} inputMode="decimal" value={form.iptuMensal ?? ''} onChange={(e) => f('iptuMensal', num(e.target.value))} /></Campo>
                <Campo rot="Seguro incêndio"><input className={inputCls} inputMode="decimal" value={form.seguroIncendio ?? ''} onChange={(e) => f('seguroIncendio', num(e.target.value))} /></Campo>
              </div>
              <p className="text-[12px] text-text-secondary -mt-2">
                Total mensal pro locatário: <b className="text-[#FFE9A6] tabular-nums">{fmtValor(totalMensal(form))}</b>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Campo rot="Garantias aceitas" largura="sm:col-span-2">
                  <Marcaveis opcoes={GARANTIAS} sel={form.garantiasAceitas} onSel={(v) => f('garantiasAceitas', v)} />
                </Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo rot="Prazo mín. (meses)"><input className={inputCls} inputMode="numeric" value={form.prazoMinimoMeses ?? ''} onChange={(e) => f('prazoMinimoMeses', num(e.target.value))} /></Campo>
                  <Campo rot="Disponível a partir"><input type="date" className={inputCls} value={form.disponivelAPartir} onChange={(e) => f('disponivelAPartir', e.target.value)} /></Campo>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
                  Proprietário (locador) — não sai no anúncio
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Campo rot="Nome" largura="sm:col-span-2"><input className={inputCls} value={form.locadorNome} onChange={(e) => f('locadorNome', e.target.value)} /></Campo>
                  <Campo rot="Telefone"><input className={inputCls} value={form.locadorTelefone} onChange={(e) => f('locadorTelefone', e.target.value)} /></Campo>
                  <Campo rot="CPF/CNPJ"><input className={inputCls} value={form.locadorDoc} onChange={(e) => f('locadorDoc', e.target.value)} /></Campo>
                  <Campo rot="E-mail" largura="sm:col-span-2"><input className={inputCls} value={form.locadorEmail} onChange={(e) => f('locadorEmail', e.target.value)} /></Campo>
                </div>
              </div>

              <Campo rot="Descrição do anúncio">
                <textarea className={inputCls + ' min-h-[90px]'} value={form.descricao} onChange={(e) => f('descricao', e.target.value)}
                  placeholder="O texto que vai nos portais. Se deixar vazio, o Claude escreve a partir das características e te mostra antes de publicar." />
              </Campo>

              <Campo rot={`Fotos (${form.fotos.length})`}>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={btnGhost + ' cursor-pointer'}>
                    {subindoFotos ? 'Subindo…' : '📷 Subir fotos'}
                    <input type="file" accept="image/*" multiple className="hidden" disabled={subindoFotos}
                      onChange={(e) => { subirFotos(e.target.files); e.target.value = ''; }} />
                  </label>
                  {form.fotos.map((url, n) => (
                    <span key={n} className="inline-flex items-center gap-1 text-[11px] text-text-secondary bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1">
                      <a href={url} target="_blank" rel="noreferrer" className="hover:text-white">foto {n + 1}</a>
                      <button onClick={() => f('fotos', form.fotos.filter((_, j) => j !== n))} className="text-rose-300 hover:brightness-125">×</button>
                    </span>
                  ))}
                </div>
              </Campo>

              <Campo rot="Publicar em quais portais">
                <Marcaveis opcoes={PORTAIS} sel={form.portais} onSel={(v) => f('portais', v)} />
              </Campo>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Campo rot="Situação do anúncio">
                  <select className={inputCls} value={form.status} onChange={(e) => f('status', e.target.value as StatusAnuncio)}>
                    {(Object.keys(STATUS_ANUNCIO) as StatusAnuncio[]).map((s) => <option key={s} value={s}>{STATUS_ANUNCIO[s].rotulo}</option>)}
                  </select>
                </Campo>
                <Campo rot="Código interno">
                  <input className={inputCls} value={form.codigo} onChange={(e) => f('codigo', e.target.value)} placeholder="automático (LOC-001…)" />
                </Campo>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={salvarImovel} disabled={salvando} className={btnOuro}>{salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar imóvel'}</button>
                <button onClick={() => setFormAberto(false)} className={btnGhost}>cancelar</button>
              </div>
            </div>
          )}

          {/* a lista */}
          {imoveis.length === 0 && !formAberto && (
            <div className="al-card p-8 text-center">
              <p className="text-[32px] mb-2">🏠</p>
              <p className="text-sm text-text-secondary">Nenhum imóvel cadastrado ainda. O primeiro cadastro é o que destrava o resto: contrato, cobranças e o portal do cliente.</p>
            </div>
          )}
          {imoveis.map((i) => {
            const st = STATUS_ANUNCIO[i.status] || STATUS_ANUNCIO.rascunho;
            return (
              <div key={i.id} className="al-card p-4">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[11px] font-extrabold text-[#E8C547]/70 tabular-nums">{i.codigo}</span>
                  <span className="text-[14px] font-bold text-white">{i.titulo || '(sem título)'}</span>
                  <span className={`text-[11px] font-bold ${st.cor}`}>{st.rotulo}</span>
                  <span className="text-[12px] text-[#FFE9A6] font-bold tabular-nums ml-auto">{fmtValor(totalMensal(i))}/mês</span>
                </div>
                <p className="text-[11.5px] text-text-secondary mt-0.5">
                  {[i.tipo, i.bairro && `${i.bairro}`, i.cidade, i.quartos !== null && `${i.quartos} quarto${i.quartos === 1 ? '' : 's'}`,
                    i.fotos.length ? `${i.fotos.length} foto${i.fotos.length === 1 ? '' : 's'}` : 'sem fotos',
                    i.portais.length ? `portais: ${i.portais.length}` : 'nenhum portal marcado'].filter(Boolean).join(' · ')}
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <button onClick={() => copiarPacote(i)} className={btnOuro}>📦 Copiar pacote pros portais</button>
                  <button onClick={() => baixarPacote(i)} className={btnGhost}>baixar .txt</button>
                  <button onClick={() => abrirEdicao(i)} className={btnGhost}>editar</button>
                  <button onClick={() => excluirImovel(i)} className={btnGhost + ' !text-rose-300'}>excluir</button>
                </div>
              </div>
            );
          })}

          <div className="al-card p-4 border border-white/[0.06]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Como funciona a publicação</p>
            <p className="text-[12px] text-text-secondary leading-relaxed max-w-[68ch]">
              Os portais (OLX, ZAP, VivaReal…) não têm API pública de publicação. O botão
              <b className="text-white/80"> 📦 Copiar pacote</b> gera um documento completo do anúncio — dados, valores,
              fotos, regras — que você cola no Claude com as contas da imobiliária abertas, e ele publica portal por
              portal e te devolve os links. Se o volume crescer, o caminho é um integrador (Jetimob, Vista…), que cobra
              por imóvel — a estrutura daqui já fica pronta pros dois caminhos.
            </p>
          </div>
        </div>
      )}

      {/* ═════════════ CONTRATOS ═════════════ */}
      {aba === 'contratos' && (
        <div className="max-w-3xl mx-auto space-y-3">
          {!cFormAberto && <button onClick={abrirNovoContrato} className={btnOuro}>+ Novo contrato</button>}

          {cFormAberto && (
            <div className="al-card relative overflow-hidden p-5 space-y-4">
              <div className="absolute inset-x-0 top-0 gx-line-gold" />
              <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em]">
                {cEditando ? 'Editar contrato' : 'Novo contrato de locação'}
              </h2>

              <Campo rot="Imóvel">
                <select className={inputCls} value={cForm.imovelId} onChange={(e) => aoEscolherImovel(e.target.value)}>
                  <option value="">— escolher o imóvel cadastrado —</option>
                  {imoveis.map((i) => <option key={i.id} value={i.id}>{i.codigo} — {i.titulo}</option>)}
                </select>
              </Campo>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">Locador (dono)</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Campo rot="Nome" largura="sm:col-span-2"><input className={inputCls} value={cForm.locadorNome} onChange={(e) => fc('locadorNome', e.target.value)} /></Campo>
                  <Campo rot="CPF/CNPJ"><input className={inputCls} value={cForm.locadorDoc} onChange={(e) => fc('locadorDoc', e.target.value)} /></Campo>
                  <Campo rot="Telefone"><input className={inputCls} value={cForm.locadorTelefone} onChange={(e) => fc('locadorTelefone', e.target.value)} /></Campo>
                  <Campo rot="E-mail" largura="sm:col-span-2"><input className={inputCls} value={cForm.locadorEmail} onChange={(e) => fc('locadorEmail', e.target.value)} /></Campo>
                  <Campo rot="PIX do repasse" largura="sm:col-span-2"><input className={inputCls} value={cForm.locadorPix} onChange={(e) => fc('locadorPix', e.target.value)} placeholder="chave PIX ou banco/agência/conta" /></Campo>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">Locatário (inquilino)</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Campo rot="Nome" largura="sm:col-span-2"><input className={inputCls} value={cForm.locatarioNome} onChange={(e) => fc('locatarioNome', e.target.value)} /></Campo>
                  <Campo rot="CPF"><input className={inputCls} value={cForm.locatarioDoc} onChange={(e) => fc('locatarioDoc', e.target.value)} /></Campo>
                  <Campo rot="Telefone"><input className={inputCls} value={cForm.locatarioTelefone} onChange={(e) => fc('locatarioTelefone', e.target.value)} /></Campo>
                  <Campo rot="E-mail" largura="sm:col-span-2"><input className={inputCls} value={cForm.locatarioEmail} onChange={(e) => fc('locatarioEmail', e.target.value)} /></Campo>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Campo rot="Início"><input type="date" className={inputCls} value={cForm.inicio} onChange={(e) => fc('inicio', e.target.value)} /></Campo>
                <Campo rot="Prazo (meses)"><input className={inputCls} inputMode="numeric" value={cForm.prazoMeses ?? ''} onChange={(e) => fc('prazoMeses', num(e.target.value))} /></Campo>
                <Campo rot="Fim (derivado)"><input className={inputCls + ' opacity-60'} value={fimContrato(cForm) || '—'} readOnly /></Campo>
                <Campo rot="Reajuste">
                  <select className={inputCls} value={cForm.indiceReajuste} onChange={(e) => fc('indiceReajuste', e.target.value)}>
                    {INDICES_REAJUSTE.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Campo>
                <Campo rot="Aluguel (R$)"><input className={inputCls} inputMode="decimal" value={cForm.valorAluguel ?? ''} onChange={(e) => fc('valorAluguel', num(e.target.value))} /></Campo>
                <Campo rot="Dia do vencimento"><input className={inputCls} inputMode="numeric" value={cForm.diaVencimento ?? ''} onChange={(e) => fc('diaVencimento', num(e.target.value))} /></Campo>
                <Campo rot="Taxa adm. (%)"><input className={inputCls} inputMode="decimal" value={cForm.taxaAdmPct ?? ''} onChange={(e) => fc('taxaAdmPct', num(e.target.value))} /></Campo>
                <Campo rot="Situação">
                  <select className={inputCls} value={cForm.status} onChange={(e) => fc('status', e.target.value as StatusContrato)}>
                    {(Object.keys(STATUS_CONTRATO) as StatusContrato[]).map((s) => <option key={s} value={s}>{STATUS_CONTRATO[s].rotulo}</option>)}
                  </select>
                </Campo>
                <Campo rot="Garantia" largura="col-span-2">
                  <select className={inputCls} value={cForm.garantiaTipo} onChange={(e) => fc('garantiaTipo', e.target.value)}>
                    <option value="">— tipo de garantia —</option>
                    {GARANTIAS.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </Campo>
                <Campo rot="Valor da garantia (R$)" largura="col-span-2">
                  <input className={inputCls} inputMode="decimal" value={cForm.garantiaValor ?? ''} onChange={(e) => fc('garantiaValor', num(e.target.value))} />
                </Campo>
              </div>

              {cForm.valorAluguel && cForm.taxaAdmPct ? (
                <p className="text-[12px] text-text-secondary">
                  De cada aluguel: <b className="text-[#FFE9A6] tabular-nums">{fmtValor(Math.round(cForm.valorAluguel * cForm.taxaAdmPct) / 100)}</b> pra
                  imobiliária · <b className="text-emerald-300 tabular-nums">{fmtValor(cForm.valorAluguel - Math.round(cForm.valorAluguel * cForm.taxaAdmPct) / 100)}</b> de
                  repasse pro locador.
                </p>
              ) : null}

              <Campo rot={`Documentos (${cForm.documentos.length}) — contrato assinado, vistoria, RG/CPF…`}>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={btnGhost + ' cursor-pointer'}>
                    {subindoDoc ? 'Subindo…' : '📎 Anexar documento'}
                    <input type="file" multiple className="hidden" disabled={subindoDoc}
                      onChange={(e) => { subirDocumento(e.target.files); e.target.value = ''; }} />
                  </label>
                  {cForm.documentos.map((d, n) => (
                    <span key={n} className="inline-flex items-center gap-1 text-[11px] text-text-secondary bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1">
                      <a href={d.url} target="_blank" rel="noreferrer" className="hover:text-white">{d.nome}</a>
                      <button onClick={() => fc('documentos', cForm.documentos.filter((_, j) => j !== n))} className="text-rose-300 hover:brightness-125">×</button>
                    </span>
                  ))}
                </div>
              </Campo>

              <Campo rot="Observações">
                <textarea className={inputCls + ' min-h-[60px]'} value={cForm.observacoes} onChange={(e) => fc('observacoes', e.target.value)} />
              </Campo>

              <div className="flex gap-2 pt-1">
                <button onClick={salvarContrato} disabled={cSalvando} className={btnOuro}>{cSalvando ? 'Salvando…' : cEditando ? 'Salvar alterações' : 'Criar contrato'}</button>
                <button onClick={() => setCFormAberto(false)} className={btnGhost}>cancelar</button>
              </div>
            </div>
          )}

          {contratos.length === 0 && !cFormAberto && (
            <div className="al-card p-8 text-center">
              <p className="text-[32px] mb-2">📄</p>
              <p className="text-sm text-text-secondary">Nenhum contrato ainda. Cadastre o imóvel primeiro — o contrato puxa o locador de lá.</p>
            </div>
          )}
          {contratos.map((c) => {
            const st = STATUS_CONTRATO[c.status] || STATUS_CONTRATO.ativo;
            const im = imovelDe(c.imovelId);
            return (
              <div key={c.id} className="al-card p-4">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[14px] font-bold text-white">{c.locatarioNome}</span>
                  <span className="text-[11.5px] text-text-secondary">em <b className="text-white/80">{im ? `${im.codigo} — ${im.titulo}` : 'imóvel removido'}</b></span>
                  <span className={`text-[11px] font-bold ${st.cor}`}>{st.rotulo}</span>
                  <span className="text-[12px] text-[#FFE9A6] font-bold tabular-nums ml-auto">{fmtValor(c.valorAluguel)}/mês</span>
                </div>
                <p className="text-[11.5px] text-text-secondary mt-0.5">
                  {[c.inicio && `de ${c.inicio.split('-').reverse().join('/')}`,
                    fimContrato(c) && `até ${fimContrato(c).split('-').reverse().join('/')}`,
                    c.diaVencimento && `vence dia ${c.diaVencimento}`,
                    c.indiceReajuste, c.garantiaTipo,
                    `${c.documentos.length} documento${c.documentos.length === 1 ? '' : 's'}`,
                  ].filter(Boolean).join(' · ')}
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <button onClick={() => abrirEdicaoContrato(c)} className={btnGhost}>editar</button>
                  <button onClick={() => { setAba('cobrancas'); }} className={btnGhost}>ver cobranças</button>
                  <button onClick={() => excluirContrato(c)} className={btnGhost + ' !text-rose-300'}>excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═════════════ COBRANÇAS ═════════════ */}
      {aba === 'cobrancas' && (
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line-gold" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-300 mb-1">Integração Asaas — o que falta pra virar de verdade</p>
            <p className="text-[12px] text-text-secondary leading-relaxed max-w-[70ch]">
              O que você vê abaixo é a <b className="text-white/80">previsão</b> derivada de cada contrato. A integração com o
              Asaas vai: gerar o boleto/PIX de cada competência, receber o aviso de pagamento (webhook), marcar pago de
              verdade, e calcular o repasse do locador descontando a taxa. A chave da API do Asaas é segredo — ela vai
              numa função de servidor, nunca nesta tela. Quando você criar a conta no Asaas, me traga que eu ligo tudo.
            </p>
          </div>

          {contratos.filter((c) => c.status === 'ativo').length === 0 && (
            <div className="al-card p-8 text-center">
              <p className="text-[32px] mb-2">💰</p>
              <p className="text-sm text-text-secondary">Nenhum contrato ativo — as cobranças nascem do contrato.</p>
            </div>
          )}

          {contratos.filter((c) => c.status === 'ativo').map((c) => {
            const im = imovelDe(c.imovelId);
            const crono = cronogramaPrevisto(c, 12);
            const hoje = new Date().toISOString().slice(0, 10);
            return (
              <div key={c.id} className="al-card p-4">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
                  <span className="text-[13.5px] font-bold text-white">{c.locatarioNome}</span>
                  <span className="text-[11.5px] text-text-secondary">{im ? `${im.codigo} — ${im.titulo}` : ''}</span>
                  <span className="text-[11px] text-text-secondary ml-auto">repasse: <b className="text-white/80">{c.locadorNome || '—'}</b>{c.locadorPix ? ` · PIX ${c.locadorPix}` : ''}</span>
                </div>
                {crono.length === 0 ? (
                  <p className="text-[12px] text-amber-300">Contrato sem início, valor ou dia de vencimento — complete o cadastro pra gerar o cronograma.</p>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-[11.5px] border-collapse min-w-[560px]">
                      <thead>
                        <tr>{['Competência', 'Vencimento', 'Valor', 'Taxa adm.', 'Repasse locador', 'Situação'].map((h) => (
                          <th key={h} className="text-left font-extrabold uppercase tracking-[0.08em] text-[9.5px] text-text-secondary border-b border-white/15 px-2 py-1.5 whitespace-nowrap">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {crono.map((l) => (
                          <tr key={l.competencia}>
                            <td className="px-2 py-1.5 border-b border-white/[0.06] text-white font-bold tabular-nums">{l.competencia.split('-').reverse().join('/')}</td>
                            <td className="px-2 py-1.5 border-b border-white/[0.06] text-text-secondary tabular-nums">{l.vencimento.split('-').reverse().join('/')}</td>
                            <td className="px-2 py-1.5 border-b border-white/[0.06] text-white tabular-nums">{fmtValor(l.valor)}</td>
                            <td className="px-2 py-1.5 border-b border-white/[0.06] text-text-secondary tabular-nums">{fmtValor(l.taxaAdm)}</td>
                            <td className="px-2 py-1.5 border-b border-white/[0.06] text-emerald-300 tabular-nums">{fmtValor(l.repasseLocador)}</td>
                            <td className="px-2 py-1.5 border-b border-white/[0.06]">
                              <span className={`text-[10.5px] font-bold ${l.vencimento < hoje ? 'text-text-secondary' : 'text-amber-300'}`}>
                                {l.vencimento < hoje ? 'previsão (passada)' : 'previsão'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
