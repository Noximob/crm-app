'use client';

/**
 * FUNIL 1 · A FICHA DO IMÓVEL — abre embaixo da linha do funil.
 *
 * Dois modos, porque são dois momentos diferentes da vida:
 *
 *   DADOS    o que se sabe na captação: que imóvel é, onde fica, quanto
 *            custa e quem é o dono. Imóvel novo abre no modo rápido — 8
 *            campos e salva; o resto vem depois.
 *
 *   ANÚNCIO  o material que vai pros portais: título, descrição, fotos,
 *            vídeo, tour e em quais portais publicar. Só faz sentido
 *            depois que o dono assinou a administração.
 *
 * As regras dos portais moram na etapa "material" (5 fotos, descrição de
 * 50+ caracteres, CEP) e aparecem em âmbar enquanto faltarem.
 */
import React, { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import {
  TIPOS_IMOVEL, MOBILIADO, COMODIDADES, GARANTIAS, PORTAIS, DOCS_DONO,
  IMOVEL_VAZIO, custoTotalMensal, fmtValor, pendenciasImovel, buscarCep,
  IMOVEL_TESTE, DONO_TESTE, ANUNCIO_TESTE, FOTOS_TESTE, arquivoTeste, preencherVazios,
  type ImovelLocacao,
} from '@/lib/locacao';
import { inputCls, btnOuro, btnGhost, btnSimula, Campo, num, Marcaveis, ChipsDocumentos } from './ui';

/**
 * FUNIL 1 · O PROPRIETÁRIO — os dados dele e a papelada.
 *
 * Vive num painel separado porque é uma etapa própria do funil: sem isto,
 * não há contrato de administração. Trabalha em rascunho local e grava uma
 * vez no botão — digitar num campo não pode disparar escrita no banco.
 */
export function PainelDono({ imobiliariaId, isEspelhoDemo, imovel, recarregar, onFechar }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  imovel: ImovelLocacao;
  recarregar: () => Promise<void>;
  onFechar: () => void;
}) {
  const [form, setForm] = useState({
    donoNome: imovel.donoNome, donoDoc: imovel.donoDoc, donoRg: imovel.donoRg,
    donoTelefone: imovel.donoTelefone, donoEmail: imovel.donoEmail, donoPix: imovel.donoPix,
    donoEstadoCivil: imovel.donoEstadoCivil, donoProfissao: imovel.donoProfissao,
    donoEndereco: imovel.donoEndereco, taxaAdmPct: imovel.taxaAdmPct,
    docsDono: imovel.docsDono,
  });
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [categoria, setCategoria] = useState<string>(DOCS_DONO[0]);

  const f = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));
  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };
  const pend = pendenciasImovel({ ...imovel, ...form }).docs;

  const gravar = async (avancar: boolean) => {
    if (guarda()) return;
    if (avancar && pend.length) { showToast(`Falta: ${pend[0]}`, 'error'); return; }
    setSalvando(true);
    await updateDoc(doc(db, 'locacaoImoveis', imovel.id), {
      ...form,
      ...(avancar && imovel.etapa === 'captado' ? { etapa: 'docs_dono' as const } : {}),
      atualizadoEm: serverTimestamp(),
    });
    showToast(avancar ? 'Papelada completa — pode gerar a administração.' : 'Salvo.', 'success');
    await recarregar();
    setSalvando(false);
    if (avancar) onFechar();
  };

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
    setSubindo(true);
    try {
      const novos = [...form.docsDono];
      for (const a of Array.from(arquivos)) {
        const caminho = `locacao/${imobiliariaId}/imovel/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, caminho), a, a.type ? { contentType: a.type } : undefined);
        await task;
        novos.push({ nome: a.name, url: await getDownloadURL(task.snapshot.ref), storagePath: caminho, categoria });
      }
      f('docsDono', novos);
      showToast('Documento anexado — clique em salvar.', 'success');
    } catch { showToast('Falha ao subir.', 'error'); }
    setSubindo(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
          O proprietário — estes dados preenchem a administração e o contrato de locação
        </p>
        <button onClick={() => { setForm((p) => preencherVazios(p, DONO_TESTE)); showToast('Campos vazios preenchidos com dados de teste.', 'info'); }}
          className={btnSimula + ' ml-auto !py-1 !text-[11px]'}>🧪 preencher teste</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Campo rot="Nome completo" largura="sm:col-span-2"><input className={inputCls} value={form.donoNome} onChange={(e) => f('donoNome', e.target.value)} /></Campo>
        <Campo rot="CPF/CNPJ"><input className={inputCls} value={form.donoDoc} onChange={(e) => f('donoDoc', e.target.value)} /></Campo>
        <Campo rot="RG"><input className={inputCls} value={form.donoRg} onChange={(e) => f('donoRg', e.target.value)} /></Campo>
        <Campo rot="WhatsApp"><input className={inputCls} value={form.donoTelefone} onChange={(e) => f('donoTelefone', e.target.value)} /></Campo>
        <Campo rot="E-mail"><input className={inputCls} value={form.donoEmail} onChange={(e) => f('donoEmail', e.target.value)} /></Campo>
        <Campo rot="Estado civil"><input className={inputCls} value={form.donoEstadoCivil} onChange={(e) => f('donoEstadoCivil', e.target.value)} placeholder="casado, solteira…" /></Campo>
        <Campo rot="Profissão"><input className={inputCls} value={form.donoProfissao} onChange={(e) => f('donoProfissao', e.target.value)} /></Campo>
        <Campo rot="Endereço do dono" largura="sm:col-span-2"><input className={inputCls} value={form.donoEndereco} onChange={(e) => f('donoEndereco', e.target.value)} /></Campo>
        <Campo rot="Chave PIX do repasse"><input className={inputCls} value={form.donoPix} onChange={(e) => f('donoPix', e.target.value)} placeholder="CPF, e-mail, telefone…" /></Campo>
        <Campo rot="Taxa de administração (%)"><input className={inputCls} inputMode="decimal" value={form.taxaAdmPct ?? ''} onChange={(e) => f('taxaAdmPct', num(e.target.value))} /></Campo>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
            className="px-2 py-2 rounded-l-xl border border-white/10 bg-white/[0.04] text-[11px] text-text-secondary focus:outline-none">
            {DOCS_DONO.map((x) => <option key={x}>{x}</option>)}
          </select>
          <label className={btnGhost + ' cursor-pointer !rounded-l-none'}>
            {subindo ? 'Subindo…' : '📎 anexar'}
            <input type="file" multiple className="hidden" disabled={subindo}
              onChange={(e) => { anexar(e.target.files); e.currentTarget.value = ''; }} />
          </label>
        </span>
        <button type="button" onClick={() => f('docsDono', [...form.docsDono, arquivoTeste(categoria)])} className={btnSimula}>
          🧪 documento teste
        </button>
      </div>
      <ChipsDocumentos docs={form.docsDono} aoRemover={(n) => f('docsDono', form.docsDono.filter((_, j) => j !== n))} />

      {pend.length > 0
        ? <p className="text-[11.5px] text-amber-300">Falta: {pend.join(' · ')}</p>
        : <p className="text-[11.5px] text-emerald-300">✓ Papelada completa.</p>}

      <div className="flex flex-wrap gap-2">
        {imovel.etapa === 'captado'
          ? <button onClick={() => gravar(true)} disabled={salvando} className={btnOuro}>{salvando ? 'Salvando…' : '✓ Papelada completa'}</button>
          : <button onClick={() => gravar(false)} disabled={salvando} className={btnOuro}>{salvando ? 'Salvando…' : 'Salvar'}</button>}
        {imovel.etapa === 'captado' && <button onClick={() => gravar(false)} disabled={salvando} className={btnGhost}>só salvar</button>}
        <button onClick={onFechar} className={btnGhost}>fechar</button>
      </div>
    </div>
  );
}

export default function FichaImovel({ imobiliariaId, isEspelhoDemo, imoveis, imovel, modo, recarregar, onFechar }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  imoveis: ImovelLocacao[];
  /** null = captar um novo */
  imovel: ImovelLocacao | null;
  modo: 'dados' | 'anuncio';
  recarregar: () => Promise<void>;
  onFechar: () => void;
}) {
  const base = imovel
    ? (() => { const { id: _a, imobiliariaId: _b, ...resto } = imovel; return { ...IMOVEL_VAZIO, ...resto }; })()
    : { ...IMOVEL_VAZIO };
  const [form, setForm] = useState<Omit<ImovelLocacao, 'id' | 'imobiliariaId'>>(base);
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  /** captação rápida: na rua não se tem CEP nem descrição de 50 caracteres */
  const [completo, setCompleto] = useState(!!imovel);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const f = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));
  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };
  const pend = pendenciasImovel(form);

  /** CEP preenche rua, bairro e cidade — menos digitação, menos erro. */
  const preencherPeloCep = async (cep: string) => {
    f('cep', cep);
    if (cep.replace(/\D/g, '').length !== 8) return;
    setBuscandoCep(true);
    const e = await buscarCep(cep);
    if (e) {
      setForm((p) => ({ ...p, cep, rua: e.rua || p.rua, bairro: e.bairro || p.bairro, cidade: e.cidade || p.cidade }));
      showToast('Endereço preenchido pelo CEP.', 'success');
    }
    setBuscandoCep(false);
  };

  const salvar = async () => {
    if (guarda() || !imobiliariaId) return;
    if (!form.titulo.trim()) { showToast('O imóvel precisa de um nome.', 'error'); return; }
    setSalvando(true);
    try {
      if (imovel) {
        await updateDoc(doc(db, 'locacaoImoveis', imovel.id), { ...form, atualizadoEm: serverTimestamp() });
      } else {
        const codigo = form.codigo.trim() || `LOC-${String(imoveis.length + 1).padStart(3, '0')}`;
        await addDoc(collection(db, 'locacaoImoveis'), { ...form, codigo, imobiliariaId, criadoEm: serverTimestamp() });
      }
      showToast(imovel ? 'Ficha salva.' : 'Imóvel captado — agora os documentos do dono.', 'success');
      await recarregar();
      onFechar();
    } catch (e) { console.error(e); showToast('Não foi possível salvar.', 'error'); }
    setSalvando(false);
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
      const novas = [...form.fotos, ...urls];
      f('fotos', novas);
      if (imovel) await updateDoc(doc(db, 'locacaoImoveis', imovel.id), { fotos: novas, atualizadoEm: serverTimestamp() });
      showToast(`${urls.length} foto${urls.length > 1 ? 's' : ''} no ar.`, 'success');
    } catch { showToast('Falha ao subir.', 'error'); }
    setSubindo(false);
  };

  const trocarPortal = (chave: string) => {
    f('portais', form.portais.includes(chave) ? form.portais.filter((x) => x !== chave) : [...form.portais, chave]);
  };

  /**
   * Preenche SÓ o que está em branco com dado de teste — pra andar a
   * operação inteira sem digitar. O que o operador já escreveu fica.
   */
  const preencherTeste = (modelo: Partial<typeof form>) => {
    setForm((p) => preencherVazios(p, modelo));
    showToast('Campos vazios preenchidos com dados de teste. Confira e salve.', 'info');
  };

  // ═══════════════ modo ANÚNCIO: só o material ═══════════════
  if (modo === 'anuncio' && imovel) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[13px] font-bold text-white uppercase tracking-[0.08em]">
            Material do anúncio · {imovel.codigo}
          </h3>
          <button onClick={() => preencherTeste(ANUNCIO_TESTE)} className={btnSimula + ' ml-auto !py-1 !text-[11px]'}>
            🧪 preencher teste
          </button>
          <button onClick={onFechar} className={btnGhost + ' !py-1 !text-[11px]'}>fechar</button>
        </div>
        <p className="text-[11.5px] text-text-secondary -mt-2 max-w-[68ch]">
          É isto que os portais leem. As regras abaixo são do Grupo OLX (OLX, ZAP e VivaReal) —
          anúncio fora delas é recusado no feed.
        </p>

        <Campo rot="Título do anúncio (10 a 100 caracteres)">
          <input className={inputCls} value={form.titulo} onChange={(e) => f('titulo', e.target.value)}
            placeholder="Apartamento 2 quartos com sacada — Centro, Penha" />
        </Campo>

        <Campo rot={`Descrição (mínimo 50 caracteres — tem ${form.descricao.trim().length})`}>
          <textarea className={inputCls + ' min-h-[96px]'} value={form.descricao} onChange={(e) => f('descricao', e.target.value)}
            placeholder="O texto que vai nos portais. Sem HTML, sem telefone, sem e-mail; entre 50 e 3.000 caracteres." />
        </Campo>

        <Campo rot={`Fotos (${form.fotos.length} de 5 mínimas) — a 1ª é a capa e vale por metade do anúncio`}>
          <div className="flex flex-wrap items-center gap-2">
            <label className={btnGhost + ' cursor-pointer'}>
              {subindo ? 'Subindo…' : '📷 Subir fotos'}
              <input type="file" accept="image/*" multiple className="hidden" disabled={subindo}
                onChange={(e) => { subirFotos(e.target.files); e.currentTarget.value = ''; }} />
            </label>
            {form.fotos.length < 5 && (
              <button type="button" onClick={() => f('fotos', FOTOS_TESTE)} className={btnSimula}>🧪 5 fotos de teste</button>
            )}
          </div>
          {form.fotos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.fotos.map((url, n) => (
                <div key={n} className={`relative rounded-lg overflow-hidden border ${n === 0 ? 'border-[#E8C547]/60' : 'border-white/10'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`foto ${n + 1}`} className="h-20 w-28 object-cover" />
                  <span className="absolute top-0 left-0 px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-black/60 text-white">
                    {n === 0 ? '★ capa' : n + 1}
                  </span>
                  <span className="absolute bottom-0 inset-x-0 flex justify-between bg-black/60">
                    {n > 0
                      ? <button type="button" title="usar como capa" onClick={() => { const r = [...form.fotos]; const t = r[n - 1]; r[n - 1] = r[n]; r[n] = t; f('fotos', r); }}
                          className="px-1.5 text-[11px] text-white/70 hover:text-white">◂</button>
                      : <span />}
                    <button type="button" onClick={() => f('fotos', form.fotos.filter((_, j) => j !== n))}
                      className="px-1.5 text-[11px] text-rose-300 hover:text-rose-200">×</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo rot="Vídeo (link do YouTube) — os portais aceitam">
            <input className={inputCls} value={form.videoUrl} onChange={(e) => f('videoUrl', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." />
          </Campo>
          <Campo rot="Tour virtual 360° (link)">
            <input className={inputCls} value={form.tourVirtualUrl} onChange={(e) => f('tourVirtualUrl', e.target.value)}
              placeholder="https://..." />
          </Campo>
        </div>

        <Campo rot="Comodidades (viram Features no feed)">
          <Marcaveis opcoes={COMODIDADES} sel={form.comodidades} onSel={(v) => f('comodidades', v)} />
        </Campo>

        <Campo rot="Publicar em">
          <div className="flex flex-wrap gap-1.5">
            {PORTAIS.map((p) => {
              const on = form.portais.includes(p.chave);
              return (
                <button key={p.chave} type="button" onClick={() => trocarPortal(p.chave)}
                  className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold border transition-colors ${
                    on ? 'bg-[#E8C547]/15 border-[#E8C547]/50 text-[#FFE9A6]' : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-white'
                  }`}>
                  {p.via === 'feed' ? '📡' : '📦'} {p.nome}
                </button>
              );
            })}
          </div>
          <p className="text-[10.5px] text-text-secondary mt-1.5">
            📡 vai sozinho pelo feed XML · 📦 o Claude publica pelo Cowork com o pacote gerado aqui
          </p>
        </Campo>

        {pend.material.length > 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-300 mb-1">Pra publicar, falta</p>
            <ul className="space-y-0.5">{pend.material.map((x, i) => <li key={i} className="text-[12px] text-white/85">• {x}</li>)}</ul>
          </div>
        ) : (
          <p className="text-[12px] text-emerald-300">✓ Material completo — pode publicar.</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={salvar} disabled={salvando} className={btnOuro}>{salvando ? 'Salvando…' : 'Salvar material'}</button>
          <button onClick={onFechar} className={btnGhost}>cancelar</button>
        </div>
      </div>
    );
  }

  // ═══════════════ modo DADOS ═══════════════
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13px] font-bold text-white uppercase tracking-[0.08em]">
          {imovel ? `Dados do imóvel · ${imovel.codigo}` : 'Captar imóvel'}
        </h3>
        <button onClick={() => preencherTeste({ ...IMOVEL_TESTE, ...DONO_TESTE })} className={btnSimula + ' ml-auto !py-1 !text-[11px]'}>
          🧪 preencher teste
        </button>
        <button onClick={onFechar} className={btnGhost + ' !py-1 !text-[11px]'}>fechar</button>
      </div>

      {/* ——— captação rápida: o que se tem na rua ——— */}
      {!completo && (
        <>
          <p className="text-[11.5px] text-text-secondary -mt-2">
            O essencial pra registrar agora. Fotos, descrição e medidas você completa na hora de anunciar.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo rot="Que imóvel é" largura="col-span-2">
              <input className={inputCls} value={form.titulo} onChange={(e) => f('titulo', e.target.value)}
                placeholder="Apartamento 2 quartos — Centro, Penha" autoFocus />
            </Campo>
            <Campo rot="Tipo">
              <select className={inputCls} value={form.tipo} onChange={(e) => f('tipo', e.target.value)}>
                {TIPOS_IMOVEL.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Campo>
            <Campo rot="Aluguel (R$/mês)">
              <input className={inputCls} inputMode="decimal" value={form.aluguel ?? ''} onChange={(e) => f('aluguel', num(e.target.value))} />
            </Campo>
            <Campo rot={buscandoCep ? 'CEP · buscando…' : 'CEP (preenche o endereço)'}>
              <input className={inputCls} value={form.cep} onChange={(e) => preencherPeloCep(e.target.value)} placeholder="88385-000" />
            </Campo>
            <Campo rot="Rua e número" largura="col-span-2 sm:col-span-3">
              <input className={inputCls} value={[form.rua, form.numero].filter(Boolean).join(', ')}
                onChange={(e) => { const [r, ...x] = e.target.value.split(','); f('rua', r.trim()); f('numero', x.join(',').trim()); }}
                placeholder="Rua Nereu Ramos, 245" />
            </Campo>
            <Campo rot="Bairro" largura="col-span-2"><input className={inputCls} value={form.bairro} onChange={(e) => f('bairro', e.target.value)} /></Campo>
            <Campo rot="Cidade" largura="col-span-2"><input className={inputCls} value={form.cidade} onChange={(e) => f('cidade', e.target.value)} placeholder="Penha/SC" /></Campo>
            <Campo rot="Dono — nome" largura="col-span-2"><input className={inputCls} value={form.donoNome} onChange={(e) => f('donoNome', e.target.value)} /></Campo>
            <Campo rot="Dono — WhatsApp" largura="col-span-2"><input className={inputCls} value={form.donoTelefone} onChange={(e) => f('donoTelefone', e.target.value)} /></Campo>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={salvar} disabled={salvando} className={btnOuro}>
              {salvando ? 'Salvando…' : 'Salvar e captar'}
            </button>
            <button onClick={() => setCompleto(true)} className={btnGhost}>preencher tudo agora →</button>
            <button onClick={onFechar} className={btnGhost}>cancelar</button>
          </div>
        </>
      )}

      {completo && (<>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo rot="Nome do imóvel" largura="sm:col-span-2">
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
        <Campo rot={buscandoCep ? 'CEP · buscando…' : 'CEP (preenche o endereço)'} largura="col-span-2">
          <input className={inputCls} value={form.cep} onChange={(e) => preencherPeloCep(e.target.value)} />
        </Campo>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Campo rot="Aluguel (R$/mês)"><input className={inputCls} inputMode="decimal" value={form.aluguel ?? ''} onChange={(e) => f('aluguel', num(e.target.value))} /></Campo>
        <Campo rot="Condomínio (o inquilino paga direto)"><input className={inputCls} inputMode="decimal" value={form.condominio ?? ''} onChange={(e) => f('condominio', num(e.target.value))} /></Campo>
        <Campo rot="IPTU mensal (cobramos e repassamos)"><input className={inputCls} inputMode="decimal" value={form.iptuMensal ?? ''} onChange={(e) => f('iptuMensal', num(e.target.value))} /></Campo>
        <Campo rot="Seguro incêndio"><input className={inputCls} inputMode="decimal" value={form.seguroIncendio ?? ''} onChange={(e) => f('seguroIncendio', num(e.target.value))} /></Campo>
      </div>
      <p className="text-[11.5px] text-text-secondary -mt-2">
        Custo total do inquilino: <b className="text-[#FFE9A6] tabular-nums">{fmtValor(custoTotalMensal(form))}/mês</b>
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

      {pend.adm.length > 0 && (
        <p className="text-[11.5px] text-amber-300">Pro contrato de administração, falta: {pend.adm.join(' · ')}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={salvar} disabled={salvando} className={btnOuro}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        <button onClick={onFechar} className={btnGhost}>cancelar</button>
      </div>
      </>)}
    </div>
  );
}
