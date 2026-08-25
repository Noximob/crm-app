'use client';

/**
 * LOCAÇÃO · ABA FLUXO — a burocracia do aluguel, cartão por cartão.
 *
 * Corte de escopo definido pelo gestor: interessados, visitas e funil são
 * ATENDIMENTO — isso é dos corretores e vem numa fase própria, depois. Aqui
 * entra o CANDIDATO que já escolheu o imóvel: junta documentos → análise da
 * Loft → contrato → vistoria → chaves → dinheiro. Papel, não conversa.
 *
 * Cada cartão é um aluguel andando: a régua mostra onde está, o "Agora:"
 * diz em uma frase, e o botão dourado é o próximo passo — executado ali.
 * Cada ⚡ âmbar é uma automação futura fazendo papel de gente (ClickSign,
 * Loft, Asaas): quando a integração ligar, aquele clique some.
 */
import React, { useMemo, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import {
  LEAD_VAZIO, CONTRATO_VAZIO, AMBIENTES_PADRAO, CATEGORIAS_DOC_LEAD,
  gerarMovimentos, hojeYmd, fmtValor, pendenciasParaAnunciar,
  type ImovelLocacao, type LeadLocacao, type ContratoLocacao, type MovimentoLocacao,
} from '@/lib/locacao';
import { inputCls, btnOuro, btnGhost, btnSimula, SeloSimulacao } from './ui';
import MinutaContrato from './minuta';

/** As 9 estações da burocracia, na ordem do documento da esteira. */
const ESTACOES = ['Imóvel', 'Administração', 'Anúncio', 'Candidato', 'Análise', 'Contrato', 'Vistoria', 'Chaves', 'Cobrando'] as const;

interface Negocio {
  chave: string;
  imovel?: ImovelLocacao;
  lead?: LeadLocacao;
  contrato?: ContratoLocacao;
  movs: MovimentoLocacao[];
  atual: number;
  feitas: boolean[];
}

export default function AbaFluxo({ imobiliariaId, isEspelhoDemo, imoveis, leads, contratos, movimentos, recarregar, irPara }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  imoveis: ImovelLocacao[];
  leads: LeadLocacao[];
  contratos: ContratoLocacao[];
  movimentos: MovimentoLocacao[];
  recarregar: () => Promise<void>;
  irPara: (aba: 'imoveis' | 'esteira' | 'contratos' | 'financeiro') => void;
}) {
  const [novoDe, setNovoDe] = useState<string | null>(null);
  const [nNome, setNNome] = useState(''); const [nTel, setNTel] = useState('');
  const [minutaDe, setMinutaDe] = useState<string | null>(null);
  const [catDocLead, setCatDocLead] = useState<string>('CNH/RG');
  const [subindoDocDe, setSubindoDocDe] = useState<string | null>(null);

  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  /** Um cartão por aluguel: contrato manda; candidato sem contrato depois;
   *  imóvel sem candidato (inclusive em captação) fecha a lista. */
  const negocios = useMemo<Negocio[]>(() => {
    const out: Negocio[] = [];
    const leadsUsados = new Set<string>();

    for (const c of contratos) {
      if (c.status === 'encerrado') continue;
      if (c.leadId) leadsUsados.add(c.leadId);
      const im = imoveis.find((i) => i.id === c.imovelId);
      const movs = movimentos.filter((m) => m.contratoId === c.id);
      const admOk = !im || im.admStatus === 'assinada' || im.status !== 'rascunho';
      const feitas = [
        true, admOk, true, true, !!c.garantiaNumero,
        ['assinado', 'vistoria_feita', 'ativo', 'encerrando'].includes(c.status),
        !!c.vistoriaEntrada?.assinada,
        ['ativo', 'encerrando'].includes(c.status),
        movs.some((m) => m.statusCobranca === 'paga'),
      ];
      out.push({ chave: `c-${c.id}`, imovel: im, contrato: c, movs, feitas, atual: feitas.indexOf(false) === -1 ? 9 : feitas.indexOf(false) });
    }

    for (const l of leads) {
      if (['convertido', 'perdido', 'analise_recusada'].includes(l.etapa) || leadsUsados.has(l.id)) continue;
      const im = imoveis.find((i) => i.id === l.imovelId);
      const admOk = !im || im.admStatus === 'assinada' || im.status !== 'rascunho';
      const feitas = [
        true, admOk, !!im && im.status !== 'rascunho', true,
        l.etapa === 'analise_aprovada',
        false, false, false, false,
      ];
      out.push({ chave: `l-${l.id}`, imovel: im, lead: l, movs: [], feitas, atual: feitas.indexOf(false) });
    }

    for (const im of imoveis) {
      if (im.status === 'alugado' || im.status === 'pausado') continue;
      if (out.some((n) => n.imovel?.id === im.id)) continue;
      const admOk = im.admStatus === 'assinada';
      const anunciado = im.status === 'anunciado';
      out.push({
        chave: `i-${im.id}`, imovel: im, movs: [],
        feitas: [true, admOk || anunciado, anunciado, false, false, false, false, false, false],
        atual: !admOk && !anunciado ? 1 : anunciado ? 3 : 2,
      });
    }

    return out.sort((a, b) => b.atual - a.atual);
  }, [imoveis, leads, contratos, movimentos]);

  // ═══ ações · etapa 1: administração e anúncio ═══

  const enviarAdm = async (im: ImovelLocacao) => {
    if (guarda()) return;
    if (!im.locadorNome) { showToast('Cadastra o dono no imóvel primeiro (aba Imóveis).', 'error'); return; }
    await updateDoc(doc(db, 'locacaoImoveis', im.id), { admStatus: 'enviada', admSimulada: true, atualizadoEm: serverTimestamp() });
    showToast(`⚡ Contrato de administração "enviado" pro WhatsApp de ${im.locadorNome} (a ClickSign fará de verdade).`, 'info');
    recarregar();
  };
  const admAssinada = async (im: ImovelLocacao) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoImoveis', im.id), { admStatus: 'assinada', admAssinadaEm: hojeYmd(), admSimulada: true, atualizadoEm: serverTimestamp() });
    showToast('⚡ Dono assinou a administração (simulação). Agora pode anunciar.', 'success');
    recarregar();
  };
  const anunciar = async (im: ImovelLocacao) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoImoveis', im.id), { status: 'anunciado', atualizadoEm: serverTimestamp() });
    showToast('📣 No ar! Os feeds levam pros portais sozinhos (após a homologação).', 'success');
    recarregar();
  };

  // ═══ ações · candidato e análise ═══

  const mudarLead = async (l: LeadLocacao, campos: Partial<LeadLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoLeads', l.id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  const criarCandidato = async (im: ImovelLocacao) => {
    if (guarda() || !imobiliariaId) return;
    if (!nNome.trim()) { showToast('Falta o nome.', 'error'); return; }
    await addDoc(collection(db, 'locacaoLeads'), {
      ...LEAD_VAZIO, imobiliariaId, imovelId: im.id, nome: nNome.trim(), telefone: nTel.trim(),
      criadoEm: serverTimestamp(),
    });
    setNovoDe(null); setNNome(''); setNTel('');
    showToast('Candidato registrado — agora os documentos e a análise.', 'success');
    recarregar();
  };

  const anexarDocLead = async (l: LeadLocacao, arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
    setSubindoDocDe(l.id);
    try {
      const novos = [...(l.documentos || [])];
      for (const a of Array.from(arquivos)) {
        const storagePath = `locacao/${imobiliariaId}/candidatos/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, storagePath), a, a.type ? { contentType: a.type } : undefined);
        await task;
        novos.push({ nome: a.name, url: await getDownloadURL(task.snapshot.ref), storagePath, categoria: catDocLead });
      }
      await updateDoc(doc(db, 'locacaoLeads', l.id), { documentos: novos, atualizadoEm: serverTimestamp() });
      showToast('Documento do candidato guardado.', 'success');
      recarregar();
    } catch { showToast('Falha ao subir.', 'error'); }
    setSubindoDocDe(null);
  };

  const simularLoft = async (l: LeadLocacao, ok: boolean) => {
    if (ok) {
      const vig = new Date(); vig.setFullYear(vig.getFullYear() + 1);
      await mudarLead(l, {
        etapa: 'analise_aprovada',
        garantia: { numero: `LOFT-${Math.floor(Math.random() * 90000) + 10000}`, taxaMensalPct: 10, vigenciaFim: vig.toISOString().slice(0, 10), simulada: true },
      });
      showToast('⚡ Loft aprovou (simulação). Próximo: gerar o contrato.', 'success');
    } else {
      await mudarLead(l, { etapa: 'analise_recusada' });
      showToast('⚡ Loft recusou (simulação).', 'info');
    }
  };

  const gerarContrato = async (l: LeadLocacao, im?: ImovelLocacao) => {
    if (guarda() || !imobiliariaId) return;
    const refC = await addDoc(collection(db, 'locacaoContratos'), {
      ...CONTRATO_VAZIO, imobiliariaId, imovelId: l.imovelId, leadId: l.id,
      locadorNome: im?.locadorNome || '', locadorDoc: im?.locadorDoc || '', locadorEmail: im?.locadorEmail || '',
      locadorTelefone: im?.locadorTelefone || '', locadorPix: im?.locadorPix || '',
      locatarioNome: l.nome, locatarioTelefone: l.telefone, locatarioEmail: l.email,
      valorAluguel: im?.aluguel ?? null, valorCondominio: im?.condominio ?? null,
      valorIptuMensal: im?.iptuMensal ?? null, valorSeguroIncendio: im?.seguroIncendio ?? null,
      inicio: hojeYmd(),
      garantiaNumero: l.garantia?.numero || '', garantiaTaxaMensalPct: l.garantia?.taxaMensalPct ?? null,
      garantiaVigenciaFim: l.garantia?.vigenciaFim || '', garantiaSimulada: l.garantia?.simulada ?? false,
      documentos: (l.documentos || []).map((d) => ({ ...d, categoria: d.categoria || 'RG/CPF do inquilino' })),
      criadoEm: serverTimestamp(),
    });
    await mudarLead(l, { etapa: 'convertido', contratoId: refC.id });
    showToast('Contrato criado com os documentos do candidato dentro. Próximo: enviar pra assinatura.', 'success');
  };

  // ═══ ações · contrato, chaves e dinheiro ═══

  const mudarContrato = async (c: ContratoLocacao, campos: Partial<ContratoLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoContratos', c.id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  const vistoriaExpressa = async (c: ContratoLocacao) => {
    await mudarContrato(c, {
      status: 'vistoria_feita',
      vistoriaEntrada: {
        feitaEm: hojeYmd(), feitaPor: 'vistoria expressa (teste)', assinada: true, assinadaSimulada: true,
        ambientes: AMBIENTES_PADRAO.map((nome) => ({ nome, estado: 'bom' as const, observacao: '', fotos: [] })),
      },
    });
    showToast('⚡ Vistoria expressa + laudo assinado (simulação). A de verdade, com fotos, mora na aba Contratos.', 'success');
  };

  const ativar = async (c: ContratoLocacao) => {
    if (guarda() || !imobiliariaId) return;
    const movs = gerarMovimentos(c);
    if (!movs.length) { showToast('Faltam início, aluguel, prazo ou dia de vencimento — edita na aba Contratos.', 'error'); return; }
    const batch = writeBatch(db);
    for (const m of movs) batch.set(doc(collection(db, 'locacaoMovimentos')), { ...m, imobiliariaId, criadoEm: serverTimestamp() });
    batch.update(doc(db, 'locacaoContratos', c.id), { status: 'ativo', atualizadoEm: serverTimestamp() });
    if (c.imovelId) batch.update(doc(db, 'locacaoImoveis', c.imovelId), { status: 'alugado', atualizadoEm: serverTimestamp() });
    await batch.commit();
    showToast(`🔑 Chaves entregues! ${movs.length} meses de cobrança nasceram no Dinheiro.`, 'success');
    recarregar();
  };

  const pagarProxima = async (n: Negocio) => {
    if (guarda()) return;
    const prox = [...n.movs].filter((m) => m.statusCobranca !== 'paga').sort((a, b) => a.competencia.localeCompare(b.competencia))[0];
    if (!prox) { showToast('Todas as competências já estão pagas. 👏', 'info'); return; }
    await updateDoc(doc(db, 'locacaoMovimentos', prox.id), {
      statusCobranca: 'paga', pagoEm: hojeYmd(), statusRepasse: 'liberado', simulado: true,
    });
    showToast(`⚡ ${prox.competencia.split('-').reverse().join('/')} paga (simulação). Repasse de ${fmtValor(prox.repasseDono)} liberado.`, 'success');
    recarregar();
  };

  const repassarLiberados = async (n: Negocio) => {
    if (guarda()) return;
    const lib = n.movs.filter((m) => m.statusRepasse === 'liberado');
    if (!lib.length) { showToast('Nada liberado pra repassar — o inquilino precisa pagar primeiro.', 'info'); return; }
    for (const m of lib) {
      await updateDoc(doc(db, 'locacaoMovimentos', m.id), { statusRepasse: 'repassado', repassadoEm: hojeYmd(), simulado: true });
    }
    const total = lib.reduce((s, m) => s + m.repasseDono, 0);
    showToast(`⚡ ${fmtValor(total)} repassado pro dono num PIX só (simulação) — NF da taxa "emitida".`, 'success');
    recarregar();
  };

  // ═══ o que cada cartão mostra ═══

  const ondeEsta = (n: Negocio): string => {
    const { lead: l, contrato: c } = n;
    if (!l && !c) {
      const im = n.imovel!;
      if (im.status === 'rascunho') {
        if (im.admStatus === 'pendente') return 'Captado — falta o contrato de administração do dono';
        if (im.admStatus === 'enviada') return 'Administração no WhatsApp do dono, esperando assinatura';
        return 'Administração assinada — falta completar e anunciar';
      }
      return 'No ar — quando alguém fechar, registra o candidato aqui';
    }
    if (l && !c) {
      return {
        docs: `Candidato juntando papelada (${(l.documentos || []).length} documento${(l.documentos || []).length === 1 ? '' : 's'})`,
        analise_enviada: 'Na mesa da Loft',
        analise_aprovada: 'Garantia aprovada — pronto pra virar contrato',
      }[l.etapa as string] || `Candidato juntando papelada (${(l.documentos || []).length} documentos)`;
    }
    if (c) {
      return {
        rascunho: 'Contrato montado — confira e envie pra assinatura',
        assinatura_enviada: 'No WhatsApp das partes, esperando assinaturas',
        assinado: 'Assinado — falta a vistoria de entrada',
        vistoria_feita: c.vistoriaEntrada?.assinada ? 'Tudo assinado — pode entregar as chaves' : 'Vistoria feita — falta assinar o laudo',
        ativo: 'Alugado e cobrando todo mês',
        encerrando: 'Inquilino saindo — vistoria de saída e distrato',
      }[c.status as string] || c.status;
    }
    return '';
  };

  const proximoPasso = (n: Negocio): React.ReactNode => {
    const { lead: l, contrato: c, imovel: im } = n;

    // fase do imóvel: administração → anúncio → candidato
    if (!l && !c) {
      if (im!.admStatus === 'pendente' && im!.status === 'rascunho') {
        return <button onClick={() => enviarAdm(im!)} className={btnOuro}>▶ Enviar contrato de administração pro dono</button>;
      }
      if (im!.admStatus === 'enviada' && im!.status === 'rascunho') {
        return <button onClick={() => admAssinada(im!)} className={btnSimula}>⚡ Dono assinou (simular ClickSign)</button>;
      }
      if (im!.status === 'rascunho') {
        const { id: _x, imobiliariaId: _y, ...resto } = im!;
        const pend = pendenciasParaAnunciar(resto).filter((p) => !p.includes('administração'));
        return pend.length ? (
          <span className="flex flex-wrap items-center gap-2">
            <button onClick={() => irPara('imoveis')} className={btnOuro}>▶ Completar o anúncio</button>
            <span className="text-[11px] text-amber-300">falta: {pend.join(' · ')}</span>
          </span>
        ) : (
          <button onClick={() => anunciar(im!)} className={btnOuro}>📣 Anunciar nos portais</button>
        );
      }
      // anunciado: o atendimento acontece lá fora; aqui entra quem fechou
      return novoDe === im!.id ? (
        <span className="flex flex-wrap items-center gap-2">
          <input className={inputCls + ' !w-44'} placeholder="nome do candidato" value={nNome} onChange={(e) => setNNome(e.target.value)} />
          <input className={inputCls + ' !w-40'} placeholder="telefone" value={nTel} onChange={(e) => setNTel(e.target.value)} />
          <button onClick={() => criarCandidato(im!)} className={btnOuro}>salvar</button>
          <button onClick={() => setNovoDe(null)} className={btnGhost}>×</button>
        </span>
      ) : (
        <button onClick={() => { setNovoDe(im!.id); setNNome(''); setNTel(''); }} className={btnOuro}>▶ Fechou com alguém? Registrar o candidato</button>
      );
    }

    // fase do candidato: documentos → análise → contrato
    if (l && !c) {
      if (l.etapa === 'analise_enviada') {
        return (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-text-secondary">A Loft responderia em &lt;1 min:</span>
            <button onClick={() => simularLoft(l, true)} className={btnSimula}>⚡ aprovou</button>
            <button onClick={() => simularLoft(l, false)} className={btnSimula}>⚡ recusou</button>
          </span>
        );
      }
      if (l.etapa === 'analise_aprovada') {
        return <button onClick={() => gerarContrato(l, im)} className={btnOuro}>▶ Gerar o contrato</button>;
      }
      // qualquer outro estado = juntando documentos
      return (
        <span className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center">
            <select value={catDocLead} onChange={(e) => setCatDocLead(e.target.value)}
              className="px-2 py-2 rounded-l-xl border border-white/10 bg-white/[0.04] text-[11px] text-text-secondary focus:outline-none">
              {CATEGORIAS_DOC_LEAD.map((cat) => <option key={cat}>{cat}</option>)}
            </select>
            <label className={btnGhost + ' cursor-pointer !rounded-l-none'}>
              {subindoDocDe === l.id ? 'Subindo…' : '📎 juntar documento'}
              <input type="file" multiple className="hidden" disabled={subindoDocDe === l.id}
                onChange={(e) => { anexarDocLead(l, e.target.files); e.currentTarget.value = ''; }} />
            </label>
          </span>
          <button onClick={() => mudarLead(l, { etapa: 'analise_enviada' })} className={btnOuro}>▶ Enviar pra análise (Loft)</button>
        </span>
      );
    }

    // fase do contrato
    if (c) {
      if (c.status === 'rascunho') {
        return (
          <span className="flex flex-wrap items-center gap-2">
            <button onClick={() => mudarContrato(c, { status: 'assinatura_enviada', assinaturaEnviadaEm: hojeYmd(), assinaturaSimulada: true })}
              className={btnOuro}>▶ Enviar pra assinatura</button>
            <button onClick={() => irPara('contratos')} className={btnGhost}>conferir dados antes</button>
          </span>
        );
      }
      if (c.status === 'assinatura_enviada') {
        return <button onClick={() => mudarContrato(c, { status: 'assinado', assinadoEm: hojeYmd() })} className={btnSimula}>⚡ Todos assinaram (simular ClickSign)</button>;
      }
      if (c.status === 'assinado' || (c.status === 'vistoria_feita' && !c.vistoriaEntrada?.assinada)) {
        return (
          <span className="flex flex-wrap items-center gap-2">
            <button onClick={() => vistoriaExpressa(c)} className={btnSimula}>⚡ Vistoria expressa (teste)</button>
            <button onClick={() => irPara('contratos')} className={btnGhost}>fazer a vistoria de verdade</button>
          </span>
        );
      }
      if (c.status === 'vistoria_feita' && c.vistoriaEntrada?.assinada) {
        return <button onClick={() => ativar(c)} className={btnOuro}>🔑 Entregar as chaves</button>;
      }
      if (c.status === 'ativo') {
        const pagas = n.movs.filter((m) => m.statusCobranca === 'paga').length;
        const liberados = n.movs.filter((m) => m.statusRepasse === 'liberado').length;
        return (
          <span className="flex flex-wrap items-center gap-2">
            <button onClick={() => pagarProxima(n)} className={btnSimula}>⚡ Inquilino pagou o mês</button>
            {liberados > 0 && <button onClick={() => repassarLiberados(n)} className={btnSimula}>⚡ Repassar pro dono ({liberados})</button>}
            <button onClick={() => irPara('financeiro')} className={btnGhost}>extrato ({pagas}/{n.movs.length} pagas)</button>
          </span>
        );
      }
      if (c.status === 'encerrando') {
        return <button onClick={() => irPara('contratos')} className={btnOuro}>▶ Concluir a saída (vistoria + distrato)</button>;
      }
    }
    return null;
  };

  // ═══ render ═══

  if (!negocios.length) {
    return (
      <div className="al-card p-8">
        <p className="text-[32px] mb-2 text-center">🧭</p>
        <p className="text-[14px] font-bold text-white text-center mb-4">Nenhum aluguel andando. O caminho:</p>
        <div className="max-w-md mx-auto space-y-2">
          {[
            ['1', 'Cadastre um imóvel (ou use o botão 🧪 acima pra ver com dados de exemplo)'],
            ['2', 'A burocracia anda por aqui: administração → anúncio → candidato → contrato → chaves → dinheiro'],
            ['3', 'Cada cartão mostra onde está e o botão dourado é o próximo passo'],
          ].map(([num, txt]) => (
            <p key={num} className="text-[12.5px] text-text-secondary"><b className="text-[#E8C547] mr-1.5">{num}.</b>{txt}</p>
          ))}
        </div>
        <div className="text-center mt-5">
          <button onClick={() => irPara('imoveis')} className={btnOuro}>▶ Começar: cadastrar imóvel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] text-text-secondary max-w-[75ch]">
        Aqui é a <b className="text-white/85">burocracia andando</b> — atendimento, visitas e funil são dos
        corretores (fase 2). O <b className="text-[#FFE9A6]">botão dourado</b> é o próximo passo; cada
        <b className="text-amber-300"> ⚡ âmbar</b> é uma automação futura fazendo papel de gente.
      </p>

      {negocios.map((n) => {
        const nome = n.contrato?.locatarioNome || n.lead?.nome;
        return (
          <div key={n.chave} className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line-gold" />

            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[14px] font-bold text-white">
                {n.imovel ? `${n.imovel.codigo} — ${n.imovel.titulo}` : 'Imóvel removido'}
              </span>
              {nome && <span className="text-[12px] text-text-secondary">com <b className="text-white/85">{nome}</b></span>}
              {(n.contrato?.garantiaSimulada || n.contrato?.assinaturaSimulada || n.lead?.garantia?.simulada) && <SeloSimulacao />}
              {(n.contrato?.valorAluguel || n.imovel?.aluguel) ? (
                <span className="text-[12px] text-[#FFE9A6] font-bold tabular-nums ml-auto">
                  {fmtValor(n.contrato?.valorAluguel || n.imovel!.aluguel)}/mês
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 mt-2.5">
              {ESTACOES.map((e, i) => {
                const feita = n.feitas[i];
                const atual = i === n.atual;
                return (
                  <React.Fragment key={e}>
                    {i > 0 && <span className={`w-3 h-px ${feita || atual ? 'bg-[#E8C547]/50' : 'bg-white/10'}`} />}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      atual ? 'bg-[#E8C547]/15 text-[#FFE9A6] border border-[#E8C547]/40'
                        : feita ? 'text-emerald-300/90' : 'text-white/30'}`}>
                      {feita ? '✓' : atual ? '●' : '○'} {e}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>

            <p className="text-[12.5px] text-white/85 mt-2.5 mb-2">
              <b className="text-[#FFE9A6]">Agora:</b> {ondeEsta(n)}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {proximoPasso(n)}
              {n.contrato && (
                <button onClick={() => setMinutaDe(minutaDe === n.contrato!.id ? null : n.contrato!.id)} className={btnGhost}>
                  📄 {minutaDe === n.contrato.id ? 'fechar a minuta' : 'ver o contrato (minuta)'}
                </button>
              )}
            </div>

            {/* os documentos do candidato, sempre à vista na fase dele */}
            {n.lead && !n.contrato && (n.lead.documentos || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(n.lead.documentos || []).map((d, j) => (
                  <a key={j} href={d.url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10.5px] text-text-secondary hover:text-white bg-white/[0.04] border border-white/10 rounded-lg px-2 py-0.5">
                    <b className="text-[#FFE9A6]/80 text-[9px] uppercase">{d.categoria}</b> {d.nome}
                  </a>
                ))}
              </div>
            )}

            {n.contrato && minutaDe === n.contrato.id && (
              <div className="mt-3">
                <MinutaContrato c={n.contrato} imovel={n.imovel} onFechar={() => setMinutaDe(null)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
