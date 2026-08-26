'use client';

/**
 * FUNIL 2 · O PAINEL DA LOCAÇÃO — abre embaixo da linha do funil.
 *
 * Aqui vivem os campos que o contrato vai preencher sozinho: a qualificação
 * completa do INQUILINO (nome, CPF, RG, estado civil, profissão, endereço),
 * os termos do aluguel, a garantia da Loft e a gaveta de documentos —
 * inclusive a do CONTRATO ASSINADO, onde o PDF final da ClickSign entra.
 *
 * Os dados do DONO não se digitam aqui: eles vêm do imóvel, onde foram
 * preenchidos uma vez na captação. Aparecem só pra conferência.
 *
 * A vistoria de ENTRADA não mora aqui — acontece antes da assinatura, direto
 * no funil, e o laudo viaja junto do contrato num envelope só. A de SAÍDA
 * mora aqui, porque é o fim da linha.
 */
import React, { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  INDICES_REAJUSTE, GARANTIAS, DOCS_INQUILINO, LOCAIS_VISTORIA,
  fimContrato, fmtData, fmtValor, hojeYmd, cents, pendenciasImovel,
  INQUILINO_TESTE, arquivoTeste, preencherVazios,
  type Locacao, type ImovelLocacao, type RessalvaVistoria,
} from '@/lib/locacao';
import { inputCls, btnOuro, btnGhost, btnSimula, Campo, num, ChipsDocumentos } from './ui';

export default function PainelLocacao({ imobiliariaId, isEspelhoDemo, locacao, imovel, movimentosAbertos = 0, recarregar, onFechar }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  locacao: Locacao;
  imovel?: ImovelLocacao;
  /** cobranças ainda não pagas — o encerramento avisa sobre elas */
  movimentosAbertos?: number;
  recarregar: () => Promise<void>;
  onFechar: () => void;
}) {
  const [form, setForm] = useState<Locacao>({ ...locacao });
  const [salvando, setSalvando] = useState(false);
  const [categoria, setCategoria] = useState<string>('Contrato assinado');
  const [subindo, setSubindo] = useState(false);
  /** as ressalvas da SAÍDA: só o que mudou em relação à entrada */
  const [saindo, setSaindo] = useState<RessalvaVistoria[] | null>(null);

  const f = <K extends keyof Locacao>(k: K, v: Locacao[K]) => setForm((p) => ({ ...p, [k]: v }));
  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  /**
   * FURO CORRIGIDO: gravava a locação INTEIRA a partir do rascunho carregado
   * quando o painel abriu — inclusive `etapa`, `docsInquilino` e as datas de
   * assinatura. Mexer aqui depois de a fila ter avançado a etapa jogava o
   * caso pra trás no funil e apagava documento anexado por fora. Agora este
   * painel grava só o que ele mostra.
   */
  const CAMPOS_MEUS = [
    'nome', 'telefone', 'email', 'doc', 'rg', 'estadoCivil', 'profissao',
    'enderecoAtual', 'corretorNome',
    'inicio', 'prazoMeses', 'valorAluguel', 'valorCondominio', 'valorIptuMensal',
    'valorSeguroIncendio', 'diaVencimento', 'indiceReajuste', 'taxaAdmPct',
    'garantiaTipo', 'garantiaNumero', 'garantiaTaxaMensalPct', 'garantiaVigenciaFim',
    'observacoes',
  ] as const;

  const salvar = async () => {
    if (guarda()) return;
    setSalvando(true);
    try {
      const meus: Record<string, unknown> = {};
      for (const k of CAMPOS_MEUS) meus[k] = form[k];
      await updateDoc(doc(db, 'locacaoLocacoes', form.id), { ...meus, atualizadoEm: serverTimestamp() });
      showToast('Salvo.', 'success');
      await recarregar();
    } catch (e) { console.error(e); showToast('Não foi possível salvar.', 'error'); }
    setSalvando(false);
  };

  const anexar = async (arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
    setSubindo(true);
    try {
      const novos = [...form.docsInquilino];
      for (const a of Array.from(arquivos)) {
        const storagePath = `locacao/${imobiliariaId}/locacao/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, storagePath), a, a.type ? { contentType: a.type } : undefined);
        await task;
        novos.push({ nome: a.name, url: await getDownloadURL(task.snapshot.ref), storagePath, categoria });
      }
      f('docsInquilino', novos);
      await updateDoc(doc(db, 'locacaoLocacoes', form.id), { docsInquilino: novos, atualizadoEm: serverTimestamp() });
      showToast('Documento anexado.', 'success');
      await recarregar();
    } catch { showToast('Falha ao subir.', 'error'); }
    setSubindo(false);
  };

  /**
   * Preenche SÓ o que está em branco com dado de teste — inclusive os valores
   * do imóvel, que na vida real vêm do anúncio. Nada do que o operador já
   * escreveu é sobrescrito.
   */
  const preencherTeste = () => {
    setForm((p) => preencherVazios(p, {
      ...INQUILINO_TESTE,
      valorAluguel: imovel?.aluguel ?? 1850,
      valorCondominio: imovel?.condominio ?? null,
      valorIptuMensal: imovel?.iptuMensal ?? 92,
      valorSeguroIncendio: imovel?.seguroIncendio ?? 28,
      inicio: hojeYmd(),
      garantiaNumero: `LOFT-${Math.floor(Math.random() * 90000) + 10000}`,
      garantiaTaxaMensalPct: 10,
    }));
    showToast('Campos vazios preenchidos com dados de teste. Confira e salve.', 'info');
  };

  /** Um documento que não existe no Storage — só pra passar pela etapa. */
  const anexarTeste = () => {
    const novos = [...form.docsInquilino, arquivoTeste(categoria)];
    f('docsInquilino', novos);
    if (!guarda()) updateDoc(doc(db, 'locacaoLocacoes', form.id), { docsInquilino: novos, atualizadoEm: serverTimestamp() }).then(recarregar);
  };

  const removerDoc = (n: number) => {
    const novos = form.docsInquilino.filter((_, j) => j !== n);
    f('docsInquilino', novos);
    if (!guarda()) updateDoc(doc(db, 'locacaoLocacoes', form.id), { docsInquilino: novos, atualizadoEm: serverTimestamp() }).then(recarregar);
  };

  const excluir = async () => {
    const ok = await confirmDialog({
      title: 'Excluir esta locação?',
      message: 'Só exclua registro errado — locação com história se ENCERRA, não se apaga.',
      confirmLabel: 'Excluir', danger: true,
    });
    if (!ok || guarda()) return;
    await deleteDoc(doc(db, 'locacaoLocacoes', form.id));
    showToast('Excluída.', 'info');
    await recarregar();
    onFechar();
  };

  // ——— a saída: vistoria de saída + distrato, no mesmo envelope ———
  /** Na saída se anota só o que MUDOU — o resto está nas fotos da entrada. */
  const salvarSaida = async () => {
    if (!saindo || guarda()) return;
    await updateDoc(doc(db, 'locacaoLocacoes', form.id), {
      vistoriaSaida: {
        feitaEm: hojeYmd(), feitaPor: '',
        fotos: form.vistoriaEntrada?.fotos || [],
        itens: form.vistoriaEntrada?.itens || [],
        ressalvas: saindo, assinada: true, assinadaSimulada: true,
      },
      atualizadoEm: serverTimestamp(),
    });
    setSaindo(null);
    showToast('⚡ Vistoria de saída salva e assinada junto do distrato (envelope único).', 'success');
    await recarregar();
  };

  /**
   * O fim da linha. Duas travas:
   *   · o imóvel pode ter sido excluído — atualizar um documento que não
   *     existe derruba o lote inteiro e a locação ficaria eternamente "em
   *     saída", sem forma de fechar;
   *   · o imóvel só volta pro ar se o anúncio ainda estiver completo. Senão
   *     volta pra "material pronto", pra não entrar quebrado no feed.
   */
  const encerrar = async () => {
    const abertas = movimentosAbertos;
    const ok = await confirmDialog({
      title: 'Encerrar a locação?',
      message: [
        'O distrato deve estar assinado e as chaves devolvidas.',
        abertas > 0 ? `⚠ Ainda existem ${abertas} cobranças em aberto nesta locação. Encerrar não as cancela — acerte no Asaas.` : '',
        imovel ? 'O imóvel volta a ficar disponível e reentra nos feeds.' : 'O imóvel deste contrato não existe mais no sistema.',
      ].filter(Boolean).join('\n\n'),
      confirmLabel: 'Encerrar', danger: abertas > 0,
    });
    if (!ok || guarda()) return;
    try {
      const b = writeBatch(db);
      b.update(doc(db, 'locacaoLocacoes', form.id), { etapa: 'encerrada', encerradaEm: hojeYmd(), atualizadoEm: serverTimestamp() });
      if (imovel) {
        const completo = pendenciasImovel(imovel).material.length === 0;
        b.update(doc(db, 'locacaoImoveis', imovel.id), {
          etapa: completo ? 'publicado' : 'material',
          ...(completo ? { publicadoEm: hojeYmd() } : {}),
          atualizadoEm: serverTimestamp(),
        });
      }
      await b.commit();
      showToast(imovel ? 'Encerrada. O imóvel voltou ao ar — o círculo fechou.' : 'Encerrada.', 'success');
      await recarregar();
      onFechar();
    } catch (e) { console.error(e); showToast('Falha ao encerrar — nada foi alterado.', 'error'); }
  };

  // mesma conta de gerarMovimentos, pra tela e cobrança nunca divergirem
  const aluguel = form.valorAluguel || 0;
  const taxa = cents(aluguel * (form.taxaAdmPct || 0) / 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13px] font-bold text-white uppercase tracking-[0.08em]">
          {form.nome || 'Interessado'} {imovel ? `· ${imovel.codigo}` : ''}
        </h3>
        <button onClick={preencherTeste} className={btnSimula + ' ml-auto !py-1 !text-[11px]'}>🧪 preencher teste</button>
        <button onClick={onFechar} className={btnGhost + ' !py-1 !text-[11px]'}>fechar</button>
      </div>

      {/* ——— o inquilino: o que o contrato precisa saber dele ——— */}
      <div className="rounded-lg border border-white/[0.06] p-3 space-y-3">
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
          Inquilino — a qualificação que o contrato e a Loft usam
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo rot="Nome completo" largura="col-span-2"><input className={inputCls} value={form.nome} onChange={(e) => f('nome', e.target.value)} /></Campo>
          <Campo rot="CPF/CNPJ"><input className={inputCls} value={form.doc} onChange={(e) => f('doc', e.target.value)} /></Campo>
          <Campo rot="RG"><input className={inputCls} value={form.rg} onChange={(e) => f('rg', e.target.value)} /></Campo>
          <Campo rot="Telefone (WhatsApp)"><input className={inputCls} value={form.telefone} onChange={(e) => f('telefone', e.target.value)} /></Campo>
          <Campo rot="E-mail"><input className={inputCls} value={form.email} onChange={(e) => f('email', e.target.value)} /></Campo>
          <Campo rot="Estado civil"><input className={inputCls} value={form.estadoCivil} onChange={(e) => f('estadoCivil', e.target.value)} placeholder="casada, solteiro…" /></Campo>
          <Campo rot="Profissão"><input className={inputCls} value={form.profissao} onChange={(e) => f('profissao', e.target.value)} /></Campo>
          <Campo rot="Endereço atual" largura="col-span-2 sm:col-span-4"><input className={inputCls} value={form.enderecoAtual} onChange={(e) => f('enderecoAtual', e.target.value)} /></Campo>
          <Campo rot="Corretor responsável"><input className={inputCls} value={form.corretorNome} onChange={(e) => f('corretorNome', e.target.value)} /></Campo>
          <Campo rot="Origem"><input className={inputCls + ' opacity-60'} value={form.origem.replace('_', ' ')} readOnly /></Campo>
        </div>
      </div>

      {/* ——— o dono: vem do imóvel, não se digita duas vezes ——— */}
      {imovel && (
        <div className="rounded-lg border border-white/[0.06] p-3">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">
            Proprietário — vem da ficha do imóvel (edite lá, no funil dos imóveis)
          </p>
          <p className="text-[12px] text-white/80">
            {imovel.donoNome || '(sem nome)'} · CPF {imovel.donoDoc || '—'} · RG {imovel.donoRg || '—'} ·
            {' '}{imovel.donoEstadoCivil || '—'} · {imovel.donoProfissao || '—'}
          </p>
          <p className="text-[11.5px] text-text-secondary">
            {imovel.donoTelefone || '—'} · {imovel.donoEmail || '—'} · PIX do repasse: {imovel.donoPix || '—'}
          </p>
        </div>
      )}

      {/* ——— o contrato: datas e valores, cada campo dizendo pra que serve ——— */}
      <div className="rounded-lg border border-white/[0.06] p-3 space-y-3">
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
          O contrato — datas e valores (é daqui que saem as cobranças)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo rot="Começa em (o dia da chave)"><input type="date" className={inputCls} value={form.inicio} onChange={(e) => f('inicio', e.target.value)} /></Campo>
          <Campo rot="Dura quantos meses"><input className={inputCls} inputMode="numeric" placeholder="30" value={form.prazoMeses ?? ''} onChange={(e) => f('prazoMeses', num(e.target.value))} /></Campo>
          <Campo rot="Termina em (calculado sozinho)"><input className={inputCls + ' opacity-60'} value={fmtData(fimContrato(form))} readOnly /></Campo>
          <Campo rot="Boleto vence todo dia"><input className={inputCls} inputMode="numeric" placeholder="5" value={form.diaVencimento ?? ''} onChange={(e) => f('diaVencimento', num(e.target.value))} /></Campo>
          <Campo rot="Aluguel (R$/mês)"><input className={inputCls} inputMode="decimal" placeholder="1.850" value={form.valorAluguel ?? ''} onChange={(e) => f('valorAluguel', num(e.target.value))} /></Campo>
          <Campo rot="IPTU do mês (cobramos e devolvemos ao dono)"><input className={inputCls} inputMode="decimal" placeholder="92" value={form.valorIptuMensal ?? ''} onChange={(e) => f('valorIptuMensal', num(e.target.value))} /></Campo>
          <Campo rot="Seguro incêndio (por mês)"><input className={inputCls} inputMode="decimal" placeholder="28" value={form.valorSeguroIncendio ?? ''} onChange={(e) => f('valorSeguroIncendio', num(e.target.value))} /></Campo>
          <Campo rot="Condomínio (o inquilino paga direto — só registro)"><input className={inputCls} inputMode="decimal" placeholder="380" value={form.valorCondominio ?? ''} onChange={(e) => f('valorCondominio', num(e.target.value))} /></Campo>
          <Campo rot="Taxa da casa (% sobre o aluguel)"><input className={inputCls} inputMode="decimal" placeholder="10" value={form.taxaAdmPct ?? ''} onChange={(e) => f('taxaAdmPct', num(e.target.value))} /></Campo>
          <Campo rot="Índice do reajuste anual">
            <select className={inputCls} value={form.indiceReajuste} onChange={(e) => f('indiceReajuste', e.target.value)}>
              {INDICES_REAJUSTE.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Campo>
        </div>
      </div>

      {/* ——— a garantia: o que a Loft devolve depois de aprovar ——— */}
      <div className="rounded-lg border border-white/[0.06] p-3 space-y-3">
        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
          A garantia — preenchido com o que a Loft devolve na aprovação
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo rot="Tipo de garantia" largura="col-span-2">
            <select className={inputCls} value={form.garantiaTipo} onChange={(e) => f('garantiaTipo', e.target.value)}>
              {GARANTIAS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Campo>
          <Campo rot="Nº da apólice (a Loft informa)"><input className={inputCls} placeholder="LOFT-12345" value={form.garantiaNumero} onChange={(e) => f('garantiaNumero', e.target.value)} /></Campo>
          <Campo rot="Taxa da Loft (% — o inquilino paga a ela)"><input className={inputCls} inputMode="decimal" placeholder="10" value={form.garantiaTaxaMensalPct ?? ''} onChange={(e) => f('garantiaTaxaMensalPct', num(e.target.value))} /></Campo>
          <Campo rot="Fiança vale até (renova todo ano)" largura="col-span-2"><input type="date" className={inputCls} value={form.garantiaVigenciaFim} onChange={(e) => f('garantiaVigenciaFim', e.target.value)} /></Campo>
        </div>
      </div>

      {aluguel > 0 && form.taxaAdmPct ? (
        <p className="text-[12px] text-text-secondary">
          Inquilino paga <b className="text-[#FFE9A6]">{fmtValor(cents(aluguel + (form.valorIptuMensal || 0) + (form.valorSeguroIncendio || 0)))}</b> ·
          {' '}Nox retém <b className="text-[#FFE9A6]">{fmtValor(taxa)}</b> ·
          {' '}dono recebe <b className="text-emerald-300">{fmtValor(cents(aluguel - taxa + (form.valorIptuMensal || 0)))}</b>
          {form.valorCondominio ? <span className="text-white/40"> · condomínio de {fmtValor(form.valorCondominio)} fora da cobrança</span> : null}
        </p>
      ) : null}

      {form.reajustes.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] p-3">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Histórico de reajustes</p>
          {form.reajustes.map((r, i) => (
            <p key={i} className="text-[11.5px] text-white/80">
              {fmtData(r.em)} · {fmtValor(r.de)} → <b className="text-[#FFE9A6]">{fmtValor(r.para)}</b> (+{r.percentual}% por {r.indice})
            </p>
          ))}
        </div>
      )}

      <Campo rot="Observações"><textarea className={inputCls + ' min-h-[50px]'} value={form.observacoes} onChange={(e) => f('observacoes', e.target.value)} /></Campo>

      <Campo rot={`Documentos (${form.docsInquilino.length}) — CNH/RG, renda, contrato assinado, fiança da Loft…`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="px-2 py-2 rounded-l-xl border border-white/10 bg-white/[0.04] text-[11px] text-text-secondary focus:outline-none">
              {DOCS_INQUILINO.map((c) => <option key={c}>{c}</option>)}
            </select>
            <label className={btnGhost + ' cursor-pointer !rounded-l-none'}>
              {subindo ? 'Subindo…' : '📎 anexar'}
              <input type="file" multiple className="hidden" disabled={subindo}
                onChange={(e) => { anexar(e.target.files); e.currentTarget.value = ''; }} />
            </label>
          </span>
          <button type="button" onClick={anexarTeste} className={btnSimula}>🧪 documento teste</button>
        </div>
        <div className="mt-2"><ChipsDocumentos docs={form.docsInquilino} aoRemover={removerDoc} /></div>
      </Campo>

      {/* a vistoria de entrada, só pra consulta */}
      {form.vistoriaEntrada && (
        <div className="rounded-lg border border-white/[0.06] p-3">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">
            Vistoria de entrada · {fmtData(form.vistoriaEntrada.feitaEm)} {form.vistoriaEntrada.assinada ? '· assinada ✓' : '· não assinada'}
          </p>
          <p className="text-[11.5px] text-text-secondary">
            {(form.vistoriaEntrada.fotos || []).length} fotos do anúncio · {(form.vistoriaEntrada.itens || []).length} itens no imóvel
          </p>
          {(form.vistoriaEntrada.itens || []).length > 0 && (
            <p className="text-[11.5px] text-white/70">Ficou no imóvel: {(form.vistoriaEntrada.itens || []).join(', ')}</p>
          )}
          {(form.vistoriaEntrada.ressalvas || []).map((r, i) => (
            <p key={i} className="text-[11.5px] text-amber-300">⚠ {r.onde}: {r.oque}</p>
          ))}
          {!(form.vistoriaEntrada.ressalvas || []).length && (
            <p className="text-[11.5px] text-emerald-300">Sem ressalvas — entregue em perfeito estado.</p>
          )}
        </div>
      )}

      {/* a saída */}
      {form.etapa === 'encerrando' && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-3 space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-300">Saída em andamento</p>
          {!form.vistoriaSaida && !saindo && (
            <button onClick={() => setSaindo([])} className={btnOuro}>📋 Fazer a vistoria de saída</button>
          )}
          {saindo && (
            <div className="space-y-2">
              <p className="text-[11px] text-text-secondary max-w-[62ch]">
                Anote só o que MUDOU em relação à entrada. O que não estiver aqui foi devolvido como
                estava nas fotos — e o que estiver, entra no acerto.
              </p>
              {saindo.map((r, n) => (
                <div key={n} className="flex flex-wrap items-center gap-2">
                  <input list="locais-saida" className={inputCls + ' !w-32'} placeholder="onde" value={r.onde}
                    onChange={(e) => setSaindo(saindo.map((x, j) => (j === n ? { ...x, onde: e.target.value } : x)))} />
                  <input className={inputCls + ' flex-1 min-w-[180px]'} placeholder="o que mudou / danificou" value={r.oque}
                    onChange={(e) => setSaindo(saindo.map((x, j) => (j === n ? { ...x, oque: e.target.value } : x)))} />
                  <button onClick={() => setSaindo(saindo.filter((_, j) => j !== n))} className="text-rose-300">×</button>
                </div>
              ))}
              <datalist id="locais-saida">{LOCAIS_VISTORIA.map((x) => <option key={x} value={x} />)}</datalist>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSaindo([...saindo, { onde: '', oque: '' }])} className={btnGhost}>+ item danificado</button>
                <button onClick={salvarSaida} className={btnSimula}>⚡ Salvar e assinar (vistoria + distrato juntos)</button>
              </div>
              {saindo.length === 0 && (
                <p className="text-[11.5px] text-emerald-300">Nada anotado = imóvel devolvido em ordem, sem acerto de danos.</p>
              )}
            </div>
          )}
          {form.vistoriaSaida && (
            <>
              <div className="rounded border border-white/[0.06] p-2">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">
                  Entrada × saída — o que virou acerto
                </p>
                {(() => {
                  const naEntrada = new Set((form.vistoriaEntrada?.ressalvas || []).map((r) => `${r.onde}|${r.oque}`.toLowerCase()));
                  const novos = (form.vistoriaSaida?.ressalvas || []).filter((r) => !naEntrada.has(`${r.onde}|${r.oque}`.toLowerCase()));
                  if (!novos.length) return <p className="text-[11.5px] text-emerald-300">Nada novo — devolvido como recebeu. Sem acerto.</p>;
                  return novos.map((r, i) => (
                    <p key={i} className="text-[11.5px] text-rose-300 font-bold">🚨 {r.onde}: {r.oque} ← cobrar no acerto</p>
                  ));
                })()}
              </div>
              <button onClick={encerrar} className={btnOuro}>✓ Encerrar a locação</button>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={salvar} disabled={salvando} className={btnOuro}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        {['interessado', 'docs_inquilino', 'perdida'].includes(form.etapa) && (
          <button onClick={excluir} className={btnGhost + ' !text-rose-300 ml-auto'}>excluir</button>
        )}
      </div>
    </div>
  );
}
