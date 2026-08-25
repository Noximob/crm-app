'use client';

/**
 * LOCAÇÃO · DADOS DO CONTRATO — o painel que abre embaixo da linha da fila.
 *
 * Aqui vivem os campos que o modelo do jurídico vai preencher (as duas
 * partes por inteiro: nome, CPF, RG, estado civil, profissão, endereço),
 * os termos do aluguel e as gavetas de documento — inclusive a do CONTRATO
 * ASSINADO, onde o PDF final da ClickSign entra.
 *
 * A vistoria NÃO mora aqui: ela acontece antes da assinatura, direto na
 * fila, e o laudo viaja junto do contrato num envelope só.
 */
import React, { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  INDICES_REAJUSTE, GARANTIAS, CATEGORIAS_DOC, AMBIENTES_PADRAO,
  fimContrato, fmtData, fmtValor, hojeYmd,
  type ContratoLocacao, type ImovelLocacao, type AmbienteVistoria,
} from '@/lib/locacao';
import { inputCls, btnOuro, btnGhost, btnSimula, Campo, num } from './ui';

export default function PainelContrato({ imobiliariaId, isEspelhoDemo, contrato, imovel, recarregar, onFechar }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  contrato: ContratoLocacao;
  imovel?: ImovelLocacao;
  recarregar: () => Promise<void>;
  onFechar: () => void;
}) {
  const [form, setForm] = useState<ContratoLocacao>({ ...contrato });
  const [salvando, setSalvando] = useState(false);
  const [categoria, setCategoria] = useState<string>('Contrato assinado');
  const [subindo, setSubindo] = useState(false);
  const [saindo, setSaindo] = useState<AmbienteVistoria[] | null>(null);

  const f = <K extends keyof ContratoLocacao>(k: K, v: ContratoLocacao[K]) => setForm((p) => ({ ...p, [k]: v }));
  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  const salvar = async () => {
    if (guarda()) return;
    setSalvando(true);
    const { id, imobiliariaId: _i, ...campos } = form;
    await updateDoc(doc(db, 'locacaoContratos', id), { ...campos, atualizadoEm: serverTimestamp() });
    showToast('Contrato salvo.', 'success');
    await recarregar();
    setSalvando(false);
  };

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
    setSubindo(true);
    try {
      const novos = [...form.documentos];
      for (const a of Array.from(arquivos)) {
        const storagePath = `locacao/${imobiliariaId}/contratos/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, storagePath), a, a.type ? { contentType: a.type } : undefined);
        await task;
        novos.push({ nome: a.name, url: await getDownloadURL(task.snapshot.ref), storagePath, categoria });
      }
      f('documentos', novos);
      await updateDoc(doc(db, 'locacaoContratos', form.id), { documentos: novos, atualizadoEm: serverTimestamp() });
      showToast('Documento anexado.', 'success');
      await recarregar();
    } catch { showToast('Falha ao subir.', 'error'); }
    setSubindo(false);
  };

  const excluir = async () => {
    const ok = await confirmDialog({
      title: 'Excluir este contrato?',
      message: 'Só exclua rascunho errado — contrato com história se ENCERRA, não se apaga.',
      confirmLabel: 'Excluir', danger: true,
    });
    if (!ok || guarda()) return;
    await deleteDoc(doc(db, 'locacaoContratos', form.id));
    showToast('Contrato excluído.', 'info');
    await recarregar();
    onFechar();
  };

  // ——— a saída: vistoria de saída + distrato, no mesmo envelope ———
  const iniciarSaida = async () => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoContratos', form.id), { status: 'encerrando', atualizadoEm: serverTimestamp() });
    showToast('Saída iniciada — faça a vistoria de saída.', 'info');
    await recarregar();
  };

  const abrirVistoriaSaida = () => {
    const ent = form.vistoriaEntrada?.ambientes;
    setSaindo(ent?.length
      ? ent.map((a) => ({ ...a, fotos: [] }))
      : AMBIENTES_PADRAO.map((nome) => ({ nome, estado: 'bom' as const, observacao: '', fotos: [] })));
  };

  const salvarSaida = async () => {
    if (!saindo || guarda()) return;
    await updateDoc(doc(db, 'locacaoContratos', form.id), {
      vistoriaSaida: { feitaEm: hojeYmd(), feitaPor: '', ambientes: saindo, assinada: true, assinadaSimulada: true },
      atualizadoEm: serverTimestamp(),
    });
    setSaindo(null);
    showToast('⚡ Vistoria de saída salva e "assinada" junto do distrato (envelope único).', 'success');
    await recarregar();
  };

  const encerrar = async () => {
    const ok = await confirmDialog({
      title: 'Encerrar o contrato?',
      message: 'O distrato deve estar assinado. O imóvel volta pra "anunciado" e reentra nos feeds sozinho.',
      confirmLabel: 'Encerrar',
    });
    if (!ok || guarda()) return;
    const b = writeBatch(db);
    b.update(doc(db, 'locacaoContratos', form.id), { status: 'encerrado', encerradoEm: hojeYmd(), atualizadoEm: serverTimestamp() });
    if (form.imovelId) b.update(doc(db, 'locacaoImoveis', form.imovelId), { status: 'anunciado', atualizadoEm: serverTimestamp() });
    await b.commit();
    showToast('Encerrado. O imóvel voltou ao ar — o círculo fechou.', 'success');
    await recarregar();
    onFechar();
  };

  const Pessoa = ({ lado }: { lado: 'locatario' | 'locador' }) => {
    const p = lado === 'locatario'
      ? { t: 'Inquilino (locatário)', nome: 'locatarioNome', doc: 'locatarioDoc', rg: 'locatarioRg', tel: 'locatarioTelefone', mail: 'locatarioEmail', civil: 'locatarioEstadoCivil', prof: 'locatarioProfissao', end: 'locatarioEnderecoAtual' } as const
      : { t: 'Dono (locador)', nome: 'locadorNome', doc: 'locadorDoc', rg: 'locadorRg', tel: 'locadorTelefone', mail: 'locadorEmail', civil: 'locadorEstadoCivil', prof: 'locadorProfissao', end: 'locadorEnderecoAtual' } as const;
    return (
      <div className="rounded-lg border border-white/[0.06] p-3 space-y-3">
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">{p.t} — dados que o contrato preenche</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo rot="Nome completo" largura="col-span-2"><input className={inputCls} value={form[p.nome]} onChange={(e) => f(p.nome, e.target.value)} /></Campo>
          <Campo rot="CPF/CNPJ"><input className={inputCls} value={form[p.doc]} onChange={(e) => f(p.doc, e.target.value)} /></Campo>
          <Campo rot="RG"><input className={inputCls} value={form[p.rg]} onChange={(e) => f(p.rg, e.target.value)} /></Campo>
          <Campo rot="Telefone (WhatsApp)"><input className={inputCls} value={form[p.tel]} onChange={(e) => f(p.tel, e.target.value)} /></Campo>
          <Campo rot="E-mail"><input className={inputCls} value={form[p.mail]} onChange={(e) => f(p.mail, e.target.value)} /></Campo>
          <Campo rot="Estado civil"><input className={inputCls} value={form[p.civil]} onChange={(e) => f(p.civil, e.target.value)} placeholder="casada, solteiro…" /></Campo>
          <Campo rot="Profissão"><input className={inputCls} value={form[p.prof]} onChange={(e) => f(p.prof, e.target.value)} /></Campo>
          <Campo rot="Endereço" largura="col-span-2 sm:col-span-4"><input className={inputCls} value={form[p.end]} onChange={(e) => f(p.end, e.target.value)} /></Campo>
          {lado === 'locador' && (
            <Campo rot="Chave PIX do repasse" largura="col-span-2"><input className={inputCls} value={form.locadorPix} onChange={(e) => f('locadorPix', e.target.value)} /></Campo>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13px] font-bold text-white uppercase tracking-[0.08em]">
          Contrato · {imovel ? imovel.codigo : ''} · {form.locatarioNome || 'sem inquilino'}
        </h3>
        <button onClick={onFechar} className={btnGhost + ' ml-auto !py-1 !text-[11px]'}>fechar</button>
      </div>

      <Pessoa lado="locatario" />
      <Pessoa lado="locador" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Campo rot="Início"><input type="date" className={inputCls} value={form.inicio} onChange={(e) => f('inicio', e.target.value)} /></Campo>
        <Campo rot="Prazo (meses)"><input className={inputCls} inputMode="numeric" value={form.prazoMeses ?? ''} onChange={(e) => f('prazoMeses', num(e.target.value))} /></Campo>
        <Campo rot="Fim (calculado)"><input className={inputCls + ' opacity-60'} value={fmtData(fimContrato(form)) || '—'} readOnly /></Campo>
        <Campo rot="Dia do vencimento"><input className={inputCls} inputMode="numeric" value={form.diaVencimento ?? ''} onChange={(e) => f('diaVencimento', num(e.target.value))} /></Campo>
        <Campo rot="Aluguel (R$)"><input className={inputCls} inputMode="decimal" value={form.valorAluguel ?? ''} onChange={(e) => f('valorAluguel', num(e.target.value))} /></Campo>
        <Campo rot="IPTU mensal"><input className={inputCls} inputMode="decimal" value={form.valorIptuMensal ?? ''} onChange={(e) => f('valorIptuMensal', num(e.target.value))} /></Campo>
        <Campo rot="Seguro incêndio"><input className={inputCls} inputMode="decimal" value={form.valorSeguroIncendio ?? ''} onChange={(e) => f('valorSeguroIncendio', num(e.target.value))} /></Campo>
        <Campo rot="Condomínio (pago direto)"><input className={inputCls} inputMode="decimal" value={form.valorCondominio ?? ''} onChange={(e) => f('valorCondominio', num(e.target.value))} /></Campo>
        <Campo rot="Taxa adm. % (só do aluguel)"><input className={inputCls} inputMode="decimal" value={form.taxaAdmPct ?? ''} onChange={(e) => f('taxaAdmPct', num(e.target.value))} /></Campo>
        <Campo rot="Reajuste">
          <select className={inputCls} value={form.indiceReajuste} onChange={(e) => f('indiceReajuste', e.target.value)}>
            {INDICES_REAJUSTE.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Campo>
        <Campo rot="Garantia" largura="col-span-2">
          <select className={inputCls} value={form.garantiaTipo} onChange={(e) => f('garantiaTipo', e.target.value)}>
            {GARANTIAS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </Campo>
        <Campo rot="Nº da garantia"><input className={inputCls} value={form.garantiaNumero} onChange={(e) => f('garantiaNumero', e.target.value)} /></Campo>
        <Campo rot="Garantia vence em"><input type="date" className={inputCls} value={form.garantiaVigenciaFim} onChange={(e) => f('garantiaVigenciaFim', e.target.value)} /></Campo>
      </div>

      {form.valorAluguel && form.taxaAdmPct ? (
        <p className="text-[12px] text-text-secondary">
          Inquilino paga <b className="text-[#FFE9A6]">{fmtValor((form.valorAluguel || 0) + (form.valorIptuMensal || 0) + (form.valorSeguroIncendio || 0))}</b> ·
          Nox retém <b className="text-[#FFE9A6]">{fmtValor(Math.round(form.valorAluguel * form.taxaAdmPct) / 100)}</b> ·
          dono recebe <b className="text-emerald-300">{fmtValor(form.valorAluguel - Math.round(form.valorAluguel * form.taxaAdmPct) / 100 + (form.valorIptuMensal || 0))}</b>
        </p>
      ) : null}

      <Campo rot="Observações"><textarea className={inputCls + ' min-h-[50px]'} value={form.observacoes} onChange={(e) => f('observacoes', e.target.value)} /></Campo>

      <Campo rot={`Documentos (${form.documentos.length}) — contrato assinado, RG/CPF, laudo, apólice…`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="px-2 py-2 rounded-l-xl border border-white/10 bg-white/[0.04] text-[11px] text-text-secondary focus:outline-none">
              {CATEGORIAS_DOC.map((c) => <option key={c}>{c}</option>)}
            </select>
            <label className={btnGhost + ' cursor-pointer !rounded-l-none'}>
              {subindo ? 'Subindo…' : '📎 anexar'}
              <input type="file" multiple className="hidden" disabled={subindo}
                onChange={(e) => { anexar(e.target.files); e.currentTarget.value = ''; }} />
            </label>
          </span>
          {form.documentos.map((d, n) => (
            <a key={n} href={d.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-white bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1">
              {d.categoria && <b className="text-[#FFE9A6]/80 text-[9.5px] uppercase">{d.categoria}</b>} {d.nome}
            </a>
          ))}
        </div>
      </Campo>

      {/* a vistoria de entrada, só pra consulta */}
      {form.vistoriaEntrada && (
        <div className="rounded-lg border border-white/[0.06] p-3">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">
            Vistoria de entrada · {fmtData(form.vistoriaEntrada.feitaEm)} {form.vistoriaEntrada.assinada ? '· assinada ✓' : '· não assinada'}
          </p>
          {form.vistoriaEntrada.ambientes.map((a, i) => (
            <p key={i} className="text-[11.5px] text-text-secondary">
              <b className="text-white/80">{a.nome}</b>: {a.estado}{a.observacao ? ` — ${a.observacao}` : ''}
              {a.fotos.length ? ` · ${a.fotos.length} foto(s)` : ''}
            </p>
          ))}
        </div>
      )}

      {/* a saída */}
      {form.status === 'ativo' && (
        <button onClick={iniciarSaida} className={btnGhost}>↪ Iniciar a saída do inquilino</button>
      )}
      {form.status === 'encerrando' && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-3 space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-300">Saída em andamento</p>
          {!form.vistoriaSaida && !saindo && (
            <button onClick={abrirVistoriaSaida} className={btnOuro}>📋 Fazer a vistoria de saída</button>
          )}
          {saindo && (
            <div className="space-y-2">
              <p className="text-[11px] text-text-secondary">Compare com a entrada e ajuste o estado de cada ambiente.</p>
              {saindo.map((a, n) => (
                <div key={n} className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-white/85 w-32">{a.nome}</span>
                  <select className={inputCls + ' !w-28'} value={a.estado}
                    onChange={(e) => setSaindo(saindo.map((x, j) => (j === n ? { ...x, estado: e.target.value as AmbienteVistoria['estado'] } : x)))}>
                    <option value="otimo">Ótimo</option><option value="bom">Bom</option>
                    <option value="regular">Regular</option><option value="ruim">Ruim</option>
                  </select>
                  <input className={inputCls + ' flex-1 min-w-[120px]'} placeholder="o que mudou" value={a.observacao}
                    onChange={(e) => setSaindo(saindo.map((x, j) => (j === n ? { ...x, observacao: e.target.value } : x)))} />
                </div>
              ))}
              <button onClick={salvarSaida} className={btnSimula}>⚡ Salvar e assinar (vistoria + distrato juntos)</button>
            </div>
          )}
          {form.vistoriaSaida && (
            <>
              <div className="rounded border border-white/[0.06] p-2">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Entrada × saída</p>
                {form.vistoriaSaida.ambientes.map((s, i) => {
                  const e = form.vistoriaEntrada?.ambientes.find((x) => x.nome === s.nome);
                  const piorou = e && ['otimo', 'bom'].includes(e.estado) && ['regular', 'ruim'].includes(s.estado);
                  return (
                    <p key={i} className={`text-[11.5px] ${piorou ? 'text-rose-300 font-bold' : 'text-text-secondary'}`}>
                      {s.nome}: {e?.estado || '—'} → {s.estado}{piorou ? ' ← cobrar no acerto' : ''}
                    </p>
                  );
                })}
              </div>
              <button onClick={encerrar} className={btnOuro}>✓ Encerrar contrato</button>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={salvar} disabled={salvando} className={btnOuro}>{salvando ? 'Salvando…' : 'Salvar contrato'}</button>
        {form.status === 'rascunho' && <button onClick={excluir} className={btnGhost + ' !text-rose-300 ml-auto'}>excluir contrato</button>}
      </div>
    </div>
  );
}
