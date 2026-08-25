'use client';

/**
 * LOCAÇÃO · ABA IMÓVEIS — etapas 1 e 2 da esteira (captação e divulgação).
 *
 * O cadastro carrega as regras que os portais impõem: rascunho aceita tudo,
 * mas ANUNCIAR só com a lista limpa (5 fotos, descrição 50+, endereço
 * completo). O botão "XML de teste" gera o feed VRSync do que está anunciado
 * — é o arquivo que valida no validador oficial do Grupo OLX na homologação,
 * e a MESMA função que vai alimentar a URL viva quando a function existir.
 */
import React, { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  TIPOS_IMOVEL, MOBILIADO, COMODIDADES, GARANTIAS, STATUS_IMOVEL, PORTAIS_COWORK,
  IMOVEL_VAZIO, totalMensal, fmtValor, pendenciasParaAnunciar, gerarFeedVrsync, pacoteCowork,
  type ImovelLocacao, type StatusImovel,
} from '@/lib/locacao';
import { inputCls, btnOuro, btnGhost, Campo, num, Marcaveis } from './ui';

export default function AbaImoveis({ imobiliariaId, isEspelhoDemo, imoveis, contatoFeed, recarregar }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  imoveis: ImovelLocacao[];
  /** nome/email/telefone da imobiliária — vai no Header do feed */
  contatoFeed: { nome: string; email: string; telefone: string };
  recarregar: () => Promise<void>;
}) {
  const [editando, setEditando] = useState<ImovelLocacao | null>(null);
  const [form, setForm] = useState<Omit<ImovelLocacao, 'id' | 'imobiliariaId'>>({ ...IMOVEL_VAZIO });
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);

  const f = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  const abrirNovo = () => { setEditando(null); setForm({ ...IMOVEL_VAZIO }); setAberto(true); };
  const abrirEdicao = (i: ImovelLocacao) => {
    const { id: _id, imobiliariaId: _imo, ...resto } = i;
    setEditando(i); setForm({ ...IMOVEL_VAZIO, ...resto }); setAberto(true);
  };

  const salvar = async () => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    if (!imobiliariaId) return;
    if (!form.titulo.trim()) { showToast('O imóvel precisa de um título.', 'error'); return; }
    // anunciar exige a lista limpa; rascunho passa incompleto
    if (form.status === 'anunciado') {
      const pend = pendenciasParaAnunciar(form);
      if (pend.length) { showToast(`Pra anunciar falta: ${pend[0]}`, 'error'); return; }
    }
    setSalvando(true);
    try {
      if (editando) {
        await updateDoc(doc(db, 'locacaoImoveis', editando.id), { ...form, atualizadoEm: serverTimestamp() });
        showToast('Imóvel atualizado.', 'success');
      } else {
        const codigo = form.codigo.trim() || `LOC-${String(imoveis.length + 1).padStart(3, '0')}`;
        await addDoc(collection(db, 'locacaoImoveis'), { ...form, codigo, imobiliariaId, criadoEm: serverTimestamp() });
        showToast(`Imóvel ${codigo} cadastrado.`, 'success');
      }
      setAberto(false);
      await recarregar();
    } catch (e) { console.error(e); showToast('Não foi possível salvar.', 'error'); }
    setSalvando(false);
  };

  const mudarStatus = async (i: ImovelLocacao, status: StatusImovel) => {
    if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return; }
    if (status === 'anunciado') {
      const { id: _id, imobiliariaId: _imo, ...resto } = i;
      const pend = pendenciasParaAnunciar(resto);
      if (pend.length) { showToast(`Pra anunciar falta: ${pend.join(' · ')}`, 'error'); return; }
    }
    await updateDoc(doc(db, 'locacaoImoveis', i.id), { status, atualizadoEm: serverTimestamp() });
    showToast(status === 'anunciado' ? 'No ar: entra nos feeds e os portais publicam sozinhos.' : 'Status atualizado.', 'success');
    recarregar();
  };

  const excluir = async (i: ImovelLocacao) => {
    const ok = await confirmDialog({
      title: 'Excluir este imóvel?',
      message: `${i.codigo} — ${i.titulo}. Contratos ligados a ele NÃO são excluídos.`,
      confirmLabel: 'Excluir', danger: true,
    });
    if (!ok) return;
    await deleteDoc(doc(db, 'locacaoImoveis', i.id));
    showToast('Imóvel excluído.', 'info');
    recarregar();
  };

  const subirFotos = async (arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId) return;
    if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return; }
    setSubindo(true);
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
    setSubindo(false);
  };

  const baixarXml = () => {
    const anunciados = imoveis.filter((i) => i.status === 'anunciado');
    if (!anunciados.length) { showToast('Nenhum imóvel anunciado — o feed sai vazio.', 'info'); return; }
    const blob = new Blob([gerarFeedVrsync(imoveis, contatoFeed)], { type: 'application/xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'feed-vrsync-nox.xml';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('XML gerado — valide no validador oficial do Grupo OLX.', 'success');
  };

  const copiarPacote = async (i: ImovelLocacao) => {
    try {
      await navigator.clipboard.writeText(pacoteCowork(i));
      showToast('Pacote copiado — cola no Claude (Cowork) pra publicar no Facebook/Instagram.', 'success');
    } catch { showToast('Não foi possível copiar.', 'error'); }
  };

  const pend = pendenciasParaAnunciar(form);

  return (
    <div className="space-y-3">
      {!aberto && (
        <div className="flex flex-wrap gap-2">
          <button onClick={abrirNovo} className={btnOuro}>+ Cadastrar imóvel</button>
          <button onClick={baixarXml} className={btnGhost} title="o arquivo que o Grupo OLX vai ler — baixa pra testar no validador deles">
            ⬇ XML de teste (feed VRSync)
          </button>
        </div>
      )}

      {/* ——— o formulário ——— */}
      {aberto && (
        <div className="al-card relative overflow-hidden p-5 space-y-4">
          <div className="absolute inset-x-0 top-0 gx-line-gold" />
          <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em]">
            {editando ? `Editar ${editando.codigo}` : 'Novo imóvel para locação'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo rot="Título do anúncio (10–100 caracteres)" largura="sm:col-span-2">
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
            <Campo rot="Rua" largura="col-span-2 sm:col-span-3"><input className={inputCls} value={form.rua} onChange={(e) => f('rua', e.target.value)} /></Campo>
            <Campo rot="Número"><input className={inputCls} value={form.numero} onChange={(e) => f('numero', e.target.value)} /></Campo>
            <Campo rot="Compl." largura="col-span-1 sm:col-span-2"><input className={inputCls} value={form.complemento} onChange={(e) => f('complemento', e.target.value)} placeholder="apto 302" /></Campo>
            <Campo rot="Bairro" largura="col-span-2"><input className={inputCls} value={form.bairro} onChange={(e) => f('bairro', e.target.value)} /></Campo>
            <Campo rot="Cidade" largura="col-span-2"><input className={inputCls} value={form.cidade} onChange={(e) => f('cidade', e.target.value)} placeholder="Penha/SC" /></Campo>
            <Campo rot="CEP" largura="col-span-2"><input className={inputCls} value={form.cep} onChange={(e) => f('cep', e.target.value)} /></Campo>
            <Campo rot="Latitude" largura="col-span-2"><input className={inputCls} value={form.latitude} onChange={(e) => f('latitude', e.target.value)} placeholder="-26.7754" /></Campo>
            <Campo rot="Longitude" largura="col-span-2"><input className={inputCls} value={form.longitude} onChange={(e) => f('longitude', e.target.value)} placeholder="-48.6461" /></Campo>
            <div className="col-span-2 self-end">
              <p className="text-[10.5px] text-text-secondary">Alguns portais exigem o ponto no mapa — pega no Google Maps (botão direito no endereço).</p>
            </div>
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
            <Campo rot="Condomínio (informativo)"><input className={inputCls} inputMode="decimal" value={form.condominio ?? ''} onChange={(e) => f('condominio', num(e.target.value))} /></Campo>
            <Campo rot="IPTU (mensal)"><input className={inputCls} inputMode="decimal" value={form.iptuMensal ?? ''} onChange={(e) => f('iptuMensal', num(e.target.value))} /></Campo>
            <Campo rot="Seguro incêndio"><input className={inputCls} inputMode="decimal" value={form.seguroIncendio ?? ''} onChange={(e) => f('seguroIncendio', num(e.target.value))} /></Campo>
          </div>
          <p className="text-[11.5px] text-text-secondary -mt-2">
            Custo total pro inquilino: <b className="text-[#FFE9A6] tabular-nums">{fmtValor(totalMensal(form))}/mês</b>
            {form.condominio ? <span className="text-white/50"> — sendo o condomínio pago por ele direto à administradora</span> : null}
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
              Proprietário (dono) — não sai no anúncio; alimenta o contrato de administração e o repasse
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Campo rot="Nome" largura="sm:col-span-2"><input className={inputCls} value={form.locadorNome} onChange={(e) => f('locadorNome', e.target.value)} /></Campo>
              <Campo rot="Telefone (WhatsApp)"><input className={inputCls} value={form.locadorTelefone} onChange={(e) => f('locadorTelefone', e.target.value)} /></Campo>
              <Campo rot="CPF/CNPJ"><input className={inputCls} value={form.locadorDoc} onChange={(e) => f('locadorDoc', e.target.value)} /></Campo>
              <Campo rot="E-mail" largura="sm:col-span-2"><input className={inputCls} value={form.locadorEmail} onChange={(e) => f('locadorEmail', e.target.value)} /></Campo>
              <Campo rot="Chave PIX do repasse" largura="sm:col-span-2"><input className={inputCls} value={form.locadorPix} onChange={(e) => f('locadorPix', e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" /></Campo>
            </div>
          </div>

          <Campo rot={`Descrição do anúncio (mín. 50 caracteres — tem ${form.descricao.trim().length})`}>
            <textarea className={inputCls + ' min-h-[90px]'} value={form.descricao} onChange={(e) => f('descricao', e.target.value)}
              placeholder="O texto que vai nos portais. Sem HTML; entre 50 e 3.000 caracteres." />
          </Campo>

          <Campo rot={`Fotos (${form.fotos.length} de 5 mínimas) — JPG, a 1ª é a capa`}>
            <div className="flex flex-wrap items-center gap-2">
              <label className={btnGhost + ' cursor-pointer'}>
                {subindo ? 'Subindo…' : '📷 Subir fotos'}
                <input type="file" accept="image/*" multiple className="hidden" disabled={subindo}
                  onChange={(e) => { subirFotos(e.target.files); e.target.value = ''; }} />
              </label>
              {form.fotos.map((url, n) => (
                <span key={n} className="inline-flex items-center gap-1 text-[11px] text-text-secondary bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1">
                  <a href={url} target="_blank" rel="noreferrer" className="hover:text-white">{n === 0 ? '★ capa' : `foto ${n + 1}`}</a>
                  <button onClick={() => f('fotos', form.fotos.filter((_, j) => j !== n))} className="text-rose-300 hover:brightness-125">×</button>
                </span>
              ))}
            </div>
          </Campo>

          <Campo rot="Divulgar também via Cowork (onde não tem feed)">
            <Marcaveis opcoes={PORTAIS_COWORK} sel={form.portaisCowork} onSel={(v) => f('portaisCowork', v)} />
          </Campo>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Campo rot="Situação">
              <select className={inputCls} value={form.status} onChange={(e) => f('status', e.target.value as StatusImovel)}>
                {(Object.keys(STATUS_IMOVEL) as StatusImovel[]).map((s) => <option key={s} value={s}>{STATUS_IMOVEL[s].rotulo}</option>)}
              </select>
            </Campo>
            <Campo rot="Código interno">
              <input className={inputCls} value={form.codigo} onChange={(e) => f('codigo', e.target.value)} placeholder="automático (LOC-001…)" />
            </Campo>
          </div>

          {form.status === 'anunciado' && pend.length > 0 && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/[0.06] p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-rose-300 mb-1">Pra anunciar, os portais exigem</p>
              <ul className="space-y-0.5">{pend.map((x, i) => <li key={i} className="text-[12px] text-white/85">• {x}</li>)}</ul>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={salvar} disabled={salvando} className={btnOuro}>{salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar imóvel'}</button>
            <button onClick={() => setAberto(false)} className={btnGhost}>cancelar</button>
          </div>
        </div>
      )}

      {/* ——— a lista ——— */}
      {imoveis.length === 0 && !aberto && (
        <div className="al-card p-8 text-center">
          <p className="text-[32px] mb-2">🏠</p>
          <p className="text-sm text-text-secondary max-w-[52ch] mx-auto">
            Nenhum imóvel ainda. O primeiro cadastro destrava a esteira inteira: anúncio → interessados →
            contrato → cobrança → repasse.
          </p>
        </div>
      )}
      {imoveis.map((i) => {
        const st = STATUS_IMOVEL[i.status] || STATUS_IMOVEL.rascunho;
        const { id: _id, imobiliariaId: _imo, ...resto } = i;
        const pendencias = i.status === 'rascunho' ? pendenciasParaAnunciar(resto) : [];
        return (
          <div key={i.id} className="al-card p-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-[11px] font-extrabold text-[#E8C547]/70 tabular-nums">{i.codigo}</span>
              <span className="text-[14px] font-bold text-white">{i.titulo || '(sem título)'}</span>
              <span className={`text-[11px] font-bold ${st.cor}`}>{st.rotulo}</span>
              <span className="text-[12px] text-[#FFE9A6] font-bold tabular-nums ml-auto">{fmtValor(totalMensal(i))}/mês</span>
            </div>
            <p className="text-[11.5px] text-text-secondary mt-0.5">
              {[i.tipo, i.bairro, i.cidade, i.quartos !== null && `${i.quartos} quarto${i.quartos === 1 ? '' : 's'}`,
                `${i.fotos.length} foto${i.fotos.length === 1 ? '' : 's'}`,
                i.locadorNome && `dono: ${i.locadorNome}`,
                i.admStatus === 'assinada' ? 'administração assinada ✓' : i.admStatus === 'enviada' ? 'administração aguardando assinatura' : 'administração pendente'].filter(Boolean).join(' · ')}
            </p>
            {pendencias.length > 0 && (
              <p className="text-[11px] text-amber-300 mt-1">Pra anunciar falta: {pendencias.join(' · ')}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {i.status === 'rascunho' && <button onClick={() => mudarStatus(i, 'anunciado')} disabled={pendencias.length > 0} className={btnOuro}>📣 Anunciar</button>}
              {i.status === 'anunciado' && <button onClick={() => mudarStatus(i, 'pausado')} className={btnGhost}>⏸ Pausar</button>}
              {i.status === 'pausado' && <button onClick={() => mudarStatus(i, 'anunciado')} className={btnOuro}>▶ Voltar ao ar</button>}
              {i.portaisCowork.length > 0 && <button onClick={() => copiarPacote(i)} className={btnGhost}>📦 Pacote Cowork</button>}
              <button onClick={() => abrirEdicao(i)} className={btnGhost}>editar</button>
              <button onClick={() => excluir(i)} className={btnGhost + ' !text-rose-300'}>excluir</button>
            </div>
          </div>
        );
      })}

      <div className="al-card p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Como a divulgação funciona</p>
        <p className="text-[12px] text-text-secondary leading-relaxed max-w-[70ch]">
          Marcou <b className="text-white/80">Anunciar</b> → o imóvel entra no nosso feed → OLX + ZAP + VivaReal
          (leem 2×/dia), ImovelWeb e Chaves na Mão publicam sozinhos, <b className="text-white/80">depois da
          homologação</b> (aba Integrações). Facebook/Instagram vão pelo pacote do Cowork. Alugou ou pausou →
          some dos feeds → os portais tiram do ar sozinhos.
        </p>
      </div>
    </div>
  );
}
