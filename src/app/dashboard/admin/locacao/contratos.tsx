'use client';

/**
 * LOCAÇÃO · ABA CONTRATOS — etapas 6 a 11: da assinatura à devolução.
 *
 * A vida do contrato é uma escada que só sobe:
 *   rascunho → assinatura_enviada → assinado → vistoria → ATIVO → saída.
 *
 * As travas da esteira moram aqui:
 *   · sem assinatura, não há vistoria;
 *   · sem laudo de vistoria assinado, NÃO HÁ CHAVE (nem ativação);
 *   · a ativação gera os movimentos (cobranças + repasses) de uma vez e
 *     marca o imóvel como alugado;
 *   · o encerramento devolve o imóvel pra "anunciado" — reentra nos feeds.
 *
 * ClickSign é SIMULAÇÃO por enquanto (botões âmbar); os alertas de garantia,
 * reajuste e vigência são reais — é o sistema fazendo o papel de quem nunca
 * esquece.
 */
import React, { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  STATUS_CONTRATO, INDICES_REAJUSTE, GARANTIAS, AMBIENTES_PADRAO, CATEGORIAS_DOC,
  fimContrato, fmtData, fmtValor, hojeYmd, gerarMovimentos, alertasDoContrato,
  dadosPortalDoContrato,
  type ContratoLocacao, type ImovelLocacao, type MovimentoLocacao, type Vistoria, type AmbienteVistoria,
} from '@/lib/locacao';
import { VisaoDono, VisaoInquilino } from '@/lib/locacaoPortalView';
import { inputCls, btnOuro, btnGhost, btnSimula, rotCls, Campo, num, SeloSimulacao } from './ui';

export default function AbaContratos({ imobiliariaId, isEspelhoDemo, contratos, imoveis, movimentos, recarregar }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  contratos: ContratoLocacao[];
  imoveis: ImovelLocacao[];
  movimentos: MovimentoLocacao[];
  recarregar: () => Promise<void>;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<ContratoLocacao | null>(null);
  const [vistoriando, setVistoriando] = useState<string | null>(null);
  const [ambientes, setAmbientes] = useState<AmbienteVistoria[]>([]);
  const [vistoriaTipo, setVistoriaTipo] = useState<'entrada' | 'saida'>('entrada');
  const [subindoFoto, setSubindoFoto] = useState<number | null>(null);
  const [portalDe, setPortalDe] = useState<{ id: string; visao: 'dono' | 'inquilino' } | null>(null);
  const [subindoDoc, setSubindoDoc] = useState(false);
  const [categoriaDoc, setCategoriaDoc] = useState<string>('Contrato assinado');

  const imovelDe = (id: string) => imoveis.find((x) => x.id === id);
  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  const salvarCampos = async (c: ContratoLocacao, campos: Partial<ContratoLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoContratos', c.id), { ...campos, atualizadoEm: serverTimestamp() });
    await recarregar();
  };

  // ——— edição do rascunho ———
  const abrirEdicao = (c: ContratoLocacao) => { setEditandoId(c.id); setForm({ ...c }); };
  const f = <K extends keyof ContratoLocacao>(k: K, v: ContratoLocacao[K]) =>
    setForm((p) => (p ? { ...p, [k]: v } : p));

  const salvarRascunho = async () => {
    if (!form || guarda()) return;
    if (!form.locatarioNome.trim() || !form.inicio || !form.valorAluguel || !form.diaVencimento) {
      showToast('Locatário, início, aluguel e dia de vencimento são obrigatórios.', 'error'); return;
    }
    const { id, imobiliariaId: _i, ...campos } = form;
    await updateDoc(doc(db, 'locacaoContratos', id), { ...campos, atualizadoEm: serverTimestamp() });
    setEditandoId(null); setForm(null);
    showToast('Contrato salvo.', 'success');
    recarregar();
  };

  // ——— assinatura (ClickSign simulada) ———
  const enviarAssinatura = async (c: ContratoLocacao) => {
    if (!c.locatarioNome || !c.valorAluguel || !c.inicio) {
      showToast('Complete o rascunho antes de enviar.', 'error'); return;
    }
    await salvarCampos(c, { status: 'assinatura_enviada', assinaturaEnviadaEm: hojeYmd(), assinaturaSimulada: true });
    showToast('⚡ Simulação: contrato "enviado" pro WhatsApp do dono e do inquilino. Com a ClickSign real, é ela que monta o documento do modelo do Lucas e dispara.', 'info');
  };

  const simularAssinado = async (c: ContratoLocacao) => {
    await salvarCampos(c, { status: 'assinado', assinadoEm: hojeYmd() });
    showToast('⚡ Simulação: todos assinaram. Agora a vistoria de entrada — sem laudo assinado, sem chave.', 'success');
  };

  // ——— vistoria ———
  const abrirVistoria = (c: ContratoLocacao, tipo: 'entrada' | 'saida') => {
    setVistoriando(c.id);
    setVistoriaTipo(tipo);
    const existente = tipo === 'entrada' ? c.vistoriaEntrada : c.vistoriaSaida;
    setAmbientes(existente?.ambientes?.length
      ? existente.ambientes
      : AMBIENTES_PADRAO.map((nome) => ({ nome, estado: 'bom' as const, observacao: '', fotos: [] })));
  };

  const setAmb = (n: number, campos: Partial<AmbienteVistoria>) =>
    setAmbientes((prev) => prev.map((a, i) => (i === n ? { ...a, ...campos } : a)));

  const fotoAmbiente = async (n: number, arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
    setSubindoFoto(n);
    try {
      const urls: string[] = [];
      for (const a of Array.from(arquivos)) {
        const caminho = `locacao/${imobiliariaId}/vistorias/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, caminho), a, a.type ? { contentType: a.type } : undefined);
        await task;
        urls.push(await getDownloadURL(task.snapshot.ref));
      }
      setAmb(n, { fotos: [...ambientes[n].fotos, ...urls] });
    } catch { showToast('Falha ao subir a foto.', 'error'); }
    setSubindoFoto(null);
  };

  const salvarVistoria = async (c: ContratoLocacao) => {
    const v: Vistoria = {
      feitaEm: hojeYmd(), feitaPor: '', ambientes, assinada: false, assinadaSimulada: false,
    };
    if (vistoriaTipo === 'entrada') {
      await salvarCampos(c, { vistoriaEntrada: v, status: 'vistoria_feita' });
    } else {
      await salvarCampos(c, { vistoriaSaida: v });
    }
    setVistoriando(null);
    showToast('Vistoria salva. Falta o inquilino assinar o laudo.', 'success');
  };

  const simularLaudoAssinado = async (c: ContratoLocacao, tipo: 'entrada' | 'saida') => {
    const v = tipo === 'entrada' ? c.vistoriaEntrada : c.vistoriaSaida;
    if (!v) return;
    const atualizada = { ...v, assinada: true, assinadaSimulada: true };
    await salvarCampos(c, tipo === 'entrada' ? { vistoriaEntrada: atualizada } : { vistoriaSaida: atualizada });
    showToast('⚡ Simulação: laudo assinado (via ClickSign quando integrar).', 'success');
  };

  // ——— ativação: nasce o dinheiro ———
  const ativar = async (c: ContratoLocacao) => {
    if (guarda() || !imobiliariaId) return;
    if (!c.vistoriaEntrada?.assinada) { showToast('Sem laudo de vistoria assinado, sem chave — regra da esteira.', 'error'); return; }
    const movs = gerarMovimentos(c);
    if (!movs.length) { showToast('Contrato sem início, aluguel, prazo ou dia de vencimento.', 'error'); return; }
    const batch = writeBatch(db);
    for (const m of movs) {
      batch.set(doc(collection(db, 'locacaoMovimentos')), { ...m, imobiliariaId, criadoEm: serverTimestamp() });
    }
    batch.update(doc(db, 'locacaoContratos', c.id), { status: 'ativo', atualizadoEm: serverTimestamp() });
    if (c.imovelId) batch.update(doc(db, 'locacaoImoveis', c.imovelId), { status: 'alugado', atualizadoEm: serverTimestamp() });
    await batch.commit();
    showToast(`Contrato ativo: ${movs.length} competências geradas no Financeiro e o imóvel saiu do ar.`, 'success');
    recarregar();
  };

  // ——— saída ———
  const iniciarSaida = async (c: ContratoLocacao) => {
    await salvarCampos(c, { status: 'encerrando' });
    showToast('Saída iniciada — faça a vistoria de saída e compare com a de entrada.', 'info');
  };

  const encerrar = async (c: ContratoLocacao) => {
    if (guarda()) return;
    const ok = await confirmDialog({
      title: 'Encerrar o contrato?',
      message: 'O distrato deve estar assinado. O imóvel volta pra "anunciado" e reentra nos feeds sozinho.',
      confirmLabel: 'Encerrar',
    });
    if (!ok) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'locacaoContratos', c.id), { status: 'encerrado', encerradoEm: hojeYmd(), atualizadoEm: serverTimestamp() });
    if (c.imovelId) batch.update(doc(db, 'locacaoImoveis', c.imovelId), { status: 'anunciado', atualizadoEm: serverTimestamp() });
    await batch.commit();
    showToast('Encerrado. O imóvel voltou ao ar — a esteira fecha o círculo.', 'success');
    recarregar();
  };

  const excluir = async (c: ContratoLocacao) => {
    const ok = await confirmDialog({
      title: 'Excluir este contrato?',
      message: `${c.locatarioNome || 'sem locatário'} — só exclua rascunho errado; contrato com história se ENCERRA.`,
      confirmLabel: 'Excluir', danger: true,
    });
    if (!ok || guarda()) return;
    await deleteDoc(doc(db, 'locacaoContratos', c.id));
    showToast('Contrato excluído.', 'info');
    recarregar();
  };

  const anexarDoc = async (c: ContratoLocacao, arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
    setSubindoDoc(true);
    try {
      const novos = [...c.documentos];
      for (const a of Array.from(arquivos)) {
        const storagePath = `locacao/${imobiliariaId}/contratos/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, storagePath), a, a.type ? { contentType: a.type } : undefined);
        await task;
        novos.push({ nome: a.name, url: await getDownloadURL(task.snapshot.ref), storagePath, categoria: categoriaDoc });
      }
      await salvarCampos(c, { documentos: novos });
      showToast('Documento anexado.', 'success');
    } catch { showToast('Falha ao subir.', 'error'); }
    setSubindoDoc(false);
  };

  const ativos = contratos.filter((c) => c.status !== 'encerrado');
  const encerrados = contratos.filter((c) => c.status === 'encerrado');

  if (!contratos.length) {
    return (
      <div className="al-card p-8 text-center">
        <p className="text-[32px] mb-2">📄</p>
        <p className="text-sm text-text-secondary max-w-[52ch] mx-auto">
          Contrato nasce na Esteira: interessado com garantia aprovada → "Gerar contrato". Ele chega aqui
          em rascunho, pré-preenchido com o imóvel, o dono e o inquilino.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {[...ativos, ...encerrados].map((c) => {
        const st = STATUS_CONTRATO[c.status] || STATUS_CONTRATO.rascunho;
        const im = imovelDe(c.imovelId);
        const alertas = alertasDoContrato(c);
        const editando = editandoId === c.id && form;
        const movsDoContrato = movimentos.filter((m) => m.contratoId === c.id);

        return (
          <div key={c.id} className="al-card p-4 space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[14px] font-bold text-white">{c.locatarioNome || '(sem locatário)'}</span>
              <span className="text-[11.5px] text-text-secondary">em <b className="text-white/80">{im ? `${im.codigo} — ${im.titulo}` : 'imóvel removido'}</b></span>
              <span className={`text-[11px] font-bold ${st.cor}`}>{st.rotulo}</span>
              {(c.assinaturaSimulada || c.garantiaSimulada) && <SeloSimulacao />}
              <span className="text-[12px] text-[#FFE9A6] font-bold tabular-nums ml-auto">{fmtValor(c.valorAluguel)}/mês</span>
            </div>
            <p className="text-[11.5px] text-text-secondary">
              {[c.inicio && `de ${fmtData(c.inicio)}`, fimContrato(c) && `até ${fmtData(fimContrato(c))}`,
                c.diaVencimento && `vence dia ${c.diaVencimento}`, c.indiceReajuste,
                c.garantiaNumero && `garantia ${c.garantiaNumero}`,
                `${c.documentos.length} doc${c.documentos.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
            </p>

            {/* os alertas que ninguém pode esquecer */}
            {alertas.map((a, i) => (
              <p key={i} className={`text-[11.5px] font-bold rounded-lg px-3 py-1.5 ${a.grave ? 'text-rose-300 bg-rose-500/10 border border-rose-500/30' : 'text-amber-300 bg-amber-500/10 border border-amber-500/25'}`}>
                {a.grave ? '🚨' : '⚠'} {a.texto}
              </p>
            ))}

            {/* ——— edição do rascunho ——— */}
            {editando && form && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-3">
                {/* o cadastro completo das duas partes — é daqui que o modelo
                    do Lucas puxa cada lacuna do contrato */}
                <div className="rounded-lg border border-white/[0.06] p-3 space-y-3">
                  <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">Inquilino (locatário) — dados pro contrato</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Campo rot="Nome completo" largura="col-span-2"><input className={inputCls} value={form.locatarioNome} onChange={(e) => f('locatarioNome', e.target.value)} /></Campo>
                    <Campo rot="CPF"><input className={inputCls} value={form.locatarioDoc} onChange={(e) => f('locatarioDoc', e.target.value)} /></Campo>
                    <Campo rot="RG"><input className={inputCls} value={form.locatarioRg} onChange={(e) => f('locatarioRg', e.target.value)} /></Campo>
                    <Campo rot="Telefone (WhatsApp)"><input className={inputCls} value={form.locatarioTelefone} onChange={(e) => f('locatarioTelefone', e.target.value)} /></Campo>
                    <Campo rot="E-mail"><input className={inputCls} value={form.locatarioEmail} onChange={(e) => f('locatarioEmail', e.target.value)} /></Campo>
                    <Campo rot="Estado civil"><input className={inputCls} value={form.locatarioEstadoCivil} onChange={(e) => f('locatarioEstadoCivil', e.target.value)} placeholder="casada, solteiro…" /></Campo>
                    <Campo rot="Profissão"><input className={inputCls} value={form.locatarioProfissao} onChange={(e) => f('locatarioProfissao', e.target.value)} /></Campo>
                    <Campo rot="Endereço atual" largura="col-span-2 sm:col-span-4"><input className={inputCls} value={form.locatarioEnderecoAtual} onChange={(e) => f('locatarioEnderecoAtual', e.target.value)} placeholder="onde mora hoje — vai na qualificação do contrato" /></Campo>
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] p-3 space-y-3">
                  <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">Dono (locador) — dados pro contrato</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Campo rot="Nome completo" largura="col-span-2"><input className={inputCls} value={form.locadorNome} onChange={(e) => f('locadorNome', e.target.value)} /></Campo>
                    <Campo rot="CPF/CNPJ"><input className={inputCls} value={form.locadorDoc} onChange={(e) => f('locadorDoc', e.target.value)} /></Campo>
                    <Campo rot="RG"><input className={inputCls} value={form.locadorRg} onChange={(e) => f('locadorRg', e.target.value)} /></Campo>
                    <Campo rot="Telefone (WhatsApp)"><input className={inputCls} value={form.locadorTelefone} onChange={(e) => f('locadorTelefone', e.target.value)} /></Campo>
                    <Campo rot="E-mail"><input className={inputCls} value={form.locadorEmail} onChange={(e) => f('locadorEmail', e.target.value)} /></Campo>
                    <Campo rot="Estado civil"><input className={inputCls} value={form.locadorEstadoCivil} onChange={(e) => f('locadorEstadoCivil', e.target.value)} /></Campo>
                    <Campo rot="Profissão"><input className={inputCls} value={form.locadorProfissao} onChange={(e) => f('locadorProfissao', e.target.value)} /></Campo>
                    <Campo rot="Endereço" largura="col-span-2 sm:col-span-4"><input className={inputCls} value={form.locadorEnderecoAtual} onChange={(e) => f('locadorEnderecoAtual', e.target.value)} /></Campo>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Campo rot="Início"><input type="date" className={inputCls} value={form.inicio} onChange={(e) => f('inicio', e.target.value)} /></Campo>
                  <Campo rot="Prazo (meses)"><input className={inputCls} inputMode="numeric" value={form.prazoMeses ?? ''} onChange={(e) => f('prazoMeses', num(e.target.value))} /></Campo>
                  <Campo rot="Fim (derivado)"><input className={inputCls + ' opacity-60'} value={fmtData(fimContrato(form)) || '—'} readOnly /></Campo>
                  <Campo rot="Dia do vencimento"><input className={inputCls} inputMode="numeric" value={form.diaVencimento ?? ''} onChange={(e) => f('diaVencimento', num(e.target.value))} /></Campo>
                  <Campo rot="Aluguel (R$)"><input className={inputCls} inputMode="decimal" value={form.valorAluguel ?? ''} onChange={(e) => f('valorAluguel', num(e.target.value))} /></Campo>
                  <Campo rot="IPTU mensal (cobra e repassa)"><input className={inputCls} inputMode="decimal" value={form.valorIptuMensal ?? ''} onChange={(e) => f('valorIptuMensal', num(e.target.value))} /></Campo>
                  <Campo rot="Seguro incêndio"><input className={inputCls} inputMode="decimal" value={form.valorSeguroIncendio ?? ''} onChange={(e) => f('valorSeguroIncendio', num(e.target.value))} /></Campo>
                  <Campo rot="Condomínio (inquilino paga direto)"><input className={inputCls} inputMode="decimal" value={form.valorCondominio ?? ''} onChange={(e) => f('valorCondominio', num(e.target.value))} /></Campo>
                  <Campo rot="Taxa adm. % (só do aluguel)"><input className={inputCls} inputMode="decimal" value={form.taxaAdmPct ?? ''} onChange={(e) => f('taxaAdmPct', num(e.target.value))} /></Campo>
                  <Campo rot="Reajuste">
                    <select className={inputCls} value={form.indiceReajuste} onChange={(e) => f('indiceReajuste', e.target.value)}>
                      {INDICES_REAJUSTE.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </Campo>
                  <Campo rot="Garantia">
                    <select className={inputCls} value={form.garantiaTipo} onChange={(e) => f('garantiaTipo', e.target.value)}>
                      {GARANTIAS.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </Campo>
                  <Campo rot="PIX do repasse (dono)" largura="col-span-2"><input className={inputCls} value={form.locadorPix} onChange={(e) => f('locadorPix', e.target.value)} /></Campo>
                </div>
                <Campo rot="Observações"><textarea className={inputCls + ' min-h-[50px]'} value={form.observacoes} onChange={(e) => f('observacoes', e.target.value)} /></Campo>
                <div className="flex gap-2">
                  <button onClick={salvarRascunho} className={btnOuro}>Salvar</button>
                  <button onClick={() => { setEditandoId(null); setForm(null); }} className={btnGhost}>cancelar</button>
                </div>
              </div>
            )}

            {/* ——— vistoria ——— */}
            {vistoriando === c.id && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
                <p className={rotCls}>Vistoria de {vistoriaTipo} — ambiente por ambiente, com fotos (funciona no celular)</p>
                {ambientes.map((a, n) => (
                  <div key={n} className="flex flex-wrap items-center gap-2 border-b border-white/[0.05] pb-2">
                    <input className={inputCls + ' !w-36'} value={a.nome} onChange={(e) => setAmb(n, { nome: e.target.value })} />
                    <select className={inputCls + ' !w-28'} value={a.estado} onChange={(e) => setAmb(n, { estado: e.target.value as AmbienteVistoria['estado'] })}>
                      <option value="otimo">Ótimo</option><option value="bom">Bom</option>
                      <option value="regular">Regular</option><option value="ruim">Ruim</option>
                    </select>
                    <input className={inputCls + ' flex-1 min-w-[140px]'} placeholder="observação (risco na parede, torneira pinga…)" value={a.observacao} onChange={(e) => setAmb(n, { observacao: e.target.value })} />
                    <label className={btnGhost + ' cursor-pointer'}>
                      {subindoFoto === n ? '…' : `📷 ${a.fotos.length}`}
                      <input type="file" accept="image/*" capture="environment" multiple className="hidden"
                        onChange={(e) => { fotoAmbiente(n, e.target.files); e.target.value = ''; }} />
                    </label>
                    <button onClick={() => setAmbientes(ambientes.filter((_, j) => j !== n))} className="text-rose-300 text-[13px]">×</button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setAmbientes([...ambientes, { nome: '', estado: 'bom', observacao: '', fotos: [] }])} className={btnGhost}>+ ambiente</button>
                  <button onClick={() => salvarVistoria(c)} className={btnOuro}>Salvar vistoria</button>
                  <button onClick={() => setVistoriando(null)} className={btnGhost}>cancelar</button>
                </div>
              </div>
            )}

            {/* ——— pré-visualização dos portais ——— */}
            {portalDe?.id === c.id && (
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.04] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-300">
                    O que o {portalDe.visao === 'dono' ? 'DONO' : 'INQUILINO'} vê no portal — dados reais deste contrato
                  </span>
                  <button onClick={() => setPortalDe({ id: c.id, visao: portalDe.visao === 'dono' ? 'inquilino' : 'dono' })} className={btnGhost + ' ml-auto'}>trocar visão</button>
                  <button onClick={() => setPortalDe(null)} className={btnGhost}>fechar</button>
                </div>
                {portalDe.visao === 'dono'
                  ? <VisaoDono d={dadosPortalDoContrato(c, im, movsDoContrato)} />
                  : <VisaoInquilino d={dadosPortalDoContrato(c, im, movsDoContrato)} />}
              </div>
            )}

            {/* ——— as ações de cada status ——— */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {c.status === 'rascunho' && (
                <>
                  {!editando && <button onClick={() => abrirEdicao(c)} className={btnOuro}>✎ Completar o contrato</button>}
                  <button onClick={() => enviarAssinatura(c)} className={btnSimula}>⚡ Enviar pra assinatura (ClickSign)</button>
                </>
              )}
              {c.status === 'assinatura_enviada' && (
                <>
                  <span className="text-[11.5px] text-text-secondary">Enviado em {fmtData(c.assinaturaEnviadaEm)} · aguardando dono e inquilino —</span>
                  <button onClick={() => simularAssinado(c)} className={btnSimula}>⚡ simular: todos assinaram</button>
                </>
              )}
              {c.status === 'assinado' && (
                <button onClick={() => abrirVistoria(c, 'entrada')} className={btnOuro}>📋 Fazer vistoria de entrada</button>
              )}
              {c.status === 'vistoria_feita' && !c.vistoriaEntrada?.assinada && (
                <>
                  <button onClick={() => abrirVistoria(c, 'entrada')} className={btnGhost}>rever vistoria</button>
                  <button onClick={() => simularLaudoAssinado(c, 'entrada')} className={btnSimula}>⚡ simular: laudo assinado</button>
                </>
              )}
              {c.status === 'vistoria_feita' && c.vistoriaEntrada?.assinada && (
                <button onClick={() => ativar(c)} className={btnOuro}>🔑 Entregar chaves e ATIVAR</button>
              )}
              {c.status === 'ativo' && (
                <>
                  <button onClick={() => setPortalDe({ id: c.id, visao: 'dono' })} className={btnGhost}>👁 portal do dono</button>
                  <button onClick={() => setPortalDe({ id: c.id, visao: 'inquilino' })} className={btnGhost}>👁 portal do inquilino</button>
                  {!editando && <button onClick={() => abrirEdicao(c)} className={btnGhost}>editar</button>}
                  <button onClick={() => iniciarSaida(c)} className={btnGhost}>↪ iniciar saída</button>
                </>
              )}
              {c.status === 'encerrando' && (
                <>
                  {!c.vistoriaSaida && <button onClick={() => abrirVistoria(c, 'saida')} className={btnOuro}>📋 Vistoria de saída</button>}
                  {c.vistoriaSaida && !c.vistoriaSaida.assinada && (
                    <button onClick={() => simularLaudoAssinado(c, 'saida')} className={btnSimula}>⚡ simular: laudo de saída assinado</button>
                  )}
                  {c.vistoriaSaida?.assinada && <button onClick={() => encerrar(c)} className={btnOuro}>✓ Encerrar (distrato assinado)</button>}
                </>
              )}

              <span className="inline-flex items-center">
                <select value={categoriaDoc} onChange={(e) => setCategoriaDoc(e.target.value)}
                  className="px-2 py-2 rounded-l-xl border border-white/10 bg-white/[0.04] text-[11px] text-text-secondary focus:outline-none">
                  {CATEGORIAS_DOC.map((cat) => <option key={cat}>{cat}</option>)}
                </select>
                <label className={btnGhost + ' cursor-pointer !rounded-l-none'}>
                  {subindoDoc ? 'Subindo…' : '📎 anexar'}
                  <input type="file" multiple className="hidden" disabled={subindoDoc}
                    onChange={(e) => { anexarDoc(c, e.target.files); e.target.value = ''; }} />
                </label>
              </span>
              {c.documentos.map((d, n) => (
                <a key={n} href={d.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-white bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1">
                  {d.categoria && <b className="text-[#FFE9A6]/80 text-[9.5px] uppercase tracking-wide">{d.categoria}</b>} {d.nome}
                </a>
              ))}
              {c.status === 'rascunho' && <button onClick={() => excluir(c)} className={btnGhost + ' !text-rose-300 ml-auto'}>excluir</button>}
            </div>

            {/* comparação entrada × saída quando as duas existem */}
            {c.vistoriaEntrada && c.vistoriaSaida && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <p className={rotCls}>Entrada × saída — o que decide o acerto de danos</p>
                {c.vistoriaSaida.ambientes.map((s, n) => {
                  const e = c.vistoriaEntrada!.ambientes.find((x) => x.nome === s.nome);
                  const piorou = e && ['otimo', 'bom'].includes(e.estado) && ['regular', 'ruim'].includes(s.estado);
                  return (
                    <p key={n} className={`text-[12px] ${piorou ? 'text-rose-300 font-bold' : 'text-text-secondary'}`}>
                      {s.nome}: {e?.estado || '—'} → {s.estado}{piorou ? ' ← piorou, cobrar no acerto' : ''}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
