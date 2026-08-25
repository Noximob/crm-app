'use client';

/**
 * LOCAÇÃO · FICHA DO IMÓVEL — o formulário, aberto embaixo da linha da fila.
 *
 * Deixou de ser "aba de imóveis": agora é um painel que abre no item da fila
 * (ou no topo, para captar um novo). Salvou, fecha, e a fila reordena
 * sozinha com o próximo passo daquele imóvel.
 *
 * As regras dos portais moram aqui: rascunho aceita incompleto, mas ANUNCIAR
 * exige 5 fotos, descrição de 50+ caracteres, endereço com CEP e a
 * administração assinada pelo dono.
 */
import React, { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  TIPOS_IMOVEL, MOBILIADO, COMODIDADES, GARANTIAS, PORTAIS_COWORK,
  IMOVEL_VAZIO, totalMensal, fmtValor, pendenciasParaAnunciar, gerarFeedVrsync, pacoteCowork,
  type ImovelLocacao,
} from '@/lib/locacao';
import { inputCls, btnOuro, btnGhost, Campo, num, Marcaveis } from './ui';

export default function FichaImovel({ imobiliariaId, isEspelhoDemo, imoveis, imovel, recarregar, onFechar }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  imoveis: ImovelLocacao[];
  /** null = captar um novo */
  imovel: ImovelLocacao | null;
  recarregar: () => Promise<void>;
  onFechar: () => void;
}) {
  const base = imovel
    ? (() => { const { id: _a, imobiliariaId: _b, ...resto } = imovel; return { ...IMOVEL_VAZIO, ...resto }; })()
    : { ...IMOVEL_VAZIO };
  const [form, setForm] = useState<Omit<ImovelLocacao, 'id' | 'imobiliariaId'>>(base);
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);

  const f = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));
  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };
  const pend = pendenciasParaAnunciar(form);

  const salvar = async (anunciar = false) => {
    if (guarda() || !imobiliariaId) return;
    if (!form.titulo.trim()) { showToast('O imóvel precisa de um título.', 'error'); return; }
    if (anunciar && pend.length) { showToast(`Falta: ${pend[0]}`, 'error'); return; }
    setSalvando(true);
    try {
      const dados = { ...form, ...(anunciar ? { status: 'anunciado' as const } : {}) };
      if (imovel) {
        await updateDoc(doc(db, 'locacaoImoveis', imovel.id), { ...dados, atualizadoEm: serverTimestamp() });
      } else {
        const codigo = form.codigo.trim() || `LOC-${String(imoveis.length + 1).padStart(3, '0')}`;
        await addDoc(collection(db, 'locacaoImoveis'), { ...dados, codigo, imobiliariaId, criadoEm: serverTimestamp() });
      }
      showToast(anunciar ? '📣 No ar! Os feeds levam pros portais.' : 'Ficha salva.', 'success');
      await recarregar();
      onFechar();
    } catch (e) { console.error(e); showToast('Não foi possível salvar.', 'error'); }
    setSalvando(false);
  };

  const excluir = async () => {
    if (!imovel) return;
    const ok = await confirmDialog({
      title: 'Excluir este imóvel?',
      message: `${imovel.codigo} — ${imovel.titulo}. Contratos ligados a ele NÃO são excluídos.`,
      confirmLabel: 'Excluir', danger: true,
    });
    if (!ok || guarda()) return;
    await deleteDoc(doc(db, 'locacaoImoveis', imovel.id));
    showToast('Imóvel excluído.', 'info');
    await recarregar();
    onFechar();
  };

  const subirFotos = async (arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
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
    } catch { showToast('Falha ao subir.', 'error'); }
    setSubindo(false);
  };

  const copiarPacote = async () => {
    if (!imovel) return;
    try {
      await navigator.clipboard.writeText(pacoteCowork(imovel));
      showToast('Pacote copiado — cola no Claude pra publicar no Facebook/Instagram.', 'success');
    } catch { showToast('Não foi possível copiar.', 'error'); }
  };

  const baixarXml = () => {
    const blob = new Blob([gerarFeedVrsync(imoveis, { nome: 'Nox Imóveis', email: 'contato@noximobiliaria.com.br', telefone: '' })], { type: 'application/xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'feed-vrsync-nox.xml'; a.click();
    URL.revokeObjectURL(a.href);
    showToast('XML gerado — valide no validador do Grupo OLX.', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13px] font-bold text-white uppercase tracking-[0.08em]">
          {imovel ? `Ficha · ${imovel.codigo}` : 'Captar imóvel'}
        </h3>
        <button onClick={onFechar} className={btnGhost + ' ml-auto !py-1 !text-[11px]'}>fechar</button>
      </div>

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
        <p className="col-span-2 self-end text-[10.5px] text-text-secondary">Pega no Google Maps (botão direito no endereço).</p>
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

      <Campo rot="Comodidades"><Marcaveis opcoes={COMODIDADES} sel={form.comodidades} onSel={(v) => f('comodidades', v)} /></Campo>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Campo rot="Aluguel (R$/mês)"><input className={inputCls} inputMode="decimal" value={form.aluguel ?? ''} onChange={(e) => f('aluguel', num(e.target.value))} /></Campo>
        <Campo rot="Condomínio (o inquilino paga direto)"><input className={inputCls} inputMode="decimal" value={form.condominio ?? ''} onChange={(e) => f('condominio', num(e.target.value))} /></Campo>
        <Campo rot="IPTU mensal (cobramos e repassamos)"><input className={inputCls} inputMode="decimal" value={form.iptuMensal ?? ''} onChange={(e) => f('iptuMensal', num(e.target.value))} /></Campo>
        <Campo rot="Seguro incêndio"><input className={inputCls} inputMode="decimal" value={form.seguroIncendio ?? ''} onChange={(e) => f('seguroIncendio', num(e.target.value))} /></Campo>
      </div>
      <p className="text-[11.5px] text-text-secondary -mt-2">
        Custo total do inquilino: <b className="text-[#FFE9A6] tabular-nums">{fmtValor(totalMensal(form))}/mês</b>
        {form.condominio ? <span className="text-white/50"> — sendo {fmtValor(form.condominio)} de condomínio pago por ele direto à administradora</span> : null}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo rot="Garantias aceitas" largura="sm:col-span-2">
          <Marcaveis opcoes={GARANTIAS} sel={form.garantiasAceitas} onSel={(v) => f('garantiasAceitas', v)} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rot="Prazo mín. (meses)"><input className={inputCls} inputMode="numeric" value={form.prazoMinimoMeses ?? ''} onChange={(e) => f('prazoMinimoMeses', num(e.target.value))} /></Campo>
          <Campo rot="Livre a partir"><input type="date" className={inputCls} value={form.disponivelAPartir} onChange={(e) => f('disponivelAPartir', e.target.value)} /></Campo>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
          O dono — não sai no anúncio; alimenta a administração, o contrato e o repasse
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Campo rot="Nome" largura="sm:col-span-2"><input className={inputCls} value={form.locadorNome} onChange={(e) => f('locadorNome', e.target.value)} /></Campo>
          <Campo rot="Telefone (WhatsApp)"><input className={inputCls} value={form.locadorTelefone} onChange={(e) => f('locadorTelefone', e.target.value)} /></Campo>
          <Campo rot="CPF/CNPJ"><input className={inputCls} value={form.locadorDoc} onChange={(e) => f('locadorDoc', e.target.value)} /></Campo>
          <Campo rot="E-mail" largura="sm:col-span-2"><input className={inputCls} value={form.locadorEmail} onChange={(e) => f('locadorEmail', e.target.value)} /></Campo>
          <Campo rot="Chave PIX do repasse" largura="sm:col-span-2"><input className={inputCls} value={form.locadorPix} onChange={(e) => f('locadorPix', e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória" /></Campo>
        </div>
      </div>

      <Campo rot={`Descrição do anúncio (mín. 50 caracteres — tem ${form.descricao.trim().length})`}>
        <textarea className={inputCls + ' min-h-[80px]'} value={form.descricao} onChange={(e) => f('descricao', e.target.value)}
          placeholder="O texto que vai nos portais. Sem HTML; entre 50 e 3.000 caracteres." />
      </Campo>

      <Campo rot={`Fotos (${form.fotos.length} de 5 mínimas) — a 1ª é a capa`}>
        <div className="flex flex-wrap items-center gap-2">
          <label className={btnGhost + ' cursor-pointer'}>
            {subindo ? 'Subindo…' : '📷 Subir fotos'}
            <input type="file" accept="image/*" multiple className="hidden" disabled={subindo}
              onChange={(e) => { subirFotos(e.target.files); e.currentTarget.value = ''; }} />
          </label>
          {form.fotos.map((url, n) => (
            <span key={n} className="inline-flex items-center gap-1 text-[11px] text-text-secondary bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1">
              <a href={url} target="_blank" rel="noreferrer" className="hover:text-white">{n === 0 ? '★ capa' : `foto ${n + 1}`}</a>
              <button onClick={() => f('fotos', form.fotos.filter((_, j) => j !== n))} className="text-rose-300">×</button>
            </span>
          ))}
        </div>
      </Campo>

      <Campo rot="Divulgar também no Facebook/Instagram (via Cowork)">
        <Marcaveis opcoes={PORTAIS_COWORK} sel={form.portaisCowork} onSel={(v) => f('portaisCowork', v)} />
      </Campo>

      {pend.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-300 mb-1">Pra anunciar, falta</p>
          <ul className="space-y-0.5">{pend.map((x, i) => <li key={i} className="text-[12px] text-white/85">• {x}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={() => salvar(false)} disabled={salvando} className={btnGhost}>{salvando ? 'Salvando…' : 'Salvar ficha'}</button>
        {form.status !== 'anunciado' && (
          <button onClick={() => salvar(true)} disabled={salvando || pend.length > 0} className={btnOuro}>📣 Salvar e anunciar</button>
        )}
        {imovel?.portaisCowork.length ? <button onClick={copiarPacote} className={btnGhost}>📦 Pacote Cowork</button> : null}
        <button onClick={baixarXml} className={btnGhost} title="o arquivo que os portais leem — pra testar na homologação">⬇ XML do feed</button>
        {imovel && <button onClick={excluir} className={btnGhost + ' !text-rose-300 ml-auto'}>excluir imóvel</button>}
      </div>
    </div>
  );
}
