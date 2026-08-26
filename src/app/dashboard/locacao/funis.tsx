'use client';

/**
 * SETOR DE LOCAÇÃO — dois funis, um do lado do outro.
 *
 * A virada que o gestor pediu: em vez de uma esteira só, misturando imóvel e
 * inquilino, são DOIS CAMINHOS que se encontram uma vez.
 *
 *   🏠 IMÓVEIS   o funil do proprietário: captado → documentos dele →
 *                administração assinada (nasce o portal do dono) → material
 *                do anúncio → publicado nos portais.
 *
 *   🔑 LOCAÇÕES  o funil do inquilino: interessado → documentos → Loft →
 *                fiança assinada → nosso contrato + vistoria → chaves
 *                (nasce o portal do inquilino) → cobrando pelo Asaas.
 *
 * O encontro: imóvel PUBLICADO recebe leads; o lead que fecha vira uma
 * locação daquele imóvel. Locação ativa tira o imóvel do ar; locação
 * encerrada devolve ele pra publicação.
 *
 * Cada funil tem sua régua de etapas no topo — clica e vê quem está ali. E
 * em cada linha, UM botão dourado: o próximo passo, executado ali mesmo.
 * Onde a vida real dependeria da ClickSign, da Loft ou do Asaas, o botão é
 * ⚡ âmbar — quando a integração ligar, esse clique some.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDadosLocacao } from './dados';
import { db, storage } from '@/lib/firebase';
import {
  collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ETAPAS_IMOVEL, ETAPAS_LOCACAO, IMOVEL_VAZIO, LOCACAO_VAZIA,
  DOCS_INQUILINO, ITENS_VISTORIA, LOCAIS_VISTORIA, PORTAIS, STATUS_CHAMADO,
  pendenciasImovel, pendenciasLocacao, alertasDaLocacao, alertasDoImovel, totalInquilino,
  gerarMovimentos, calcularReajuste,
  portalDoImovel, portalDaLocacao, gerarFeedVrsync, imoveisNoFeed, imoveisForaDoFeed,
  pacoteCowork, arquivoTeste, cents, diasAte, ymd,
  hojeYmd, fmtData, fmtValor, linkWhats,
  type ImovelLocacao, type Locacao, type Movimento, type Chamado,
  type EtapaImovel, type EtapaLocacao, type Arquivo, type RessalvaVistoria,
} from '@/lib/locacao';
import { VisaoDono, VisaoInquilino } from '@/lib/locacaoPortalView';
import { inputCls, btnOuro, btnGhost, btnSimula, SeloSimulacao, Campo, AbasDaArea, AcessoAoPortal } from './ui';
import FichaImovel, { PainelDono } from './imoveis';
import CartaoImovel from './cartaoImovel';
import PainelLocacao from './contratos';
import MinutaContrato from './minuta';
import { MinutaAdministracao, LaudoVistoria, PacoteLoft } from './documentos';
import { criarDadosExemplo, apagarDadosExemplo } from './demo';

type Funil = 'imoveis' | 'locacoes';
type Painel = 'ficha' | 'docsDono' | 'adm' | 'material' | 'portalDono'
  | 'dados' | 'loft' | 'vistoria' | 'minuta' | 'laudo' | 'extrato' | 'portalInq' | 'portalDonoLoc';

const ORDEM_IMOVEL: EtapaImovel[] = ['captado', 'docs_dono', 'adm_enviada', 'adm_assinada', 'material', 'publicado', 'alugado'];
// sem 'interessado': lead que ainda não fechou vive no CRM, não aqui
const ORDEM_LOCACAO: EtapaLocacao[] = ['docs_inquilino', 'na_loft', 'loft_aprovou', 'contrato_enviado', 'contrato_assinado', 'ativa', 'encerrando'];

export default function SetorLocacao({ funil, buscaInicial = '' }: {
  /** qual página está montada — Imóveis e Locações agora são rotas próprias */
  funil: Funil;
  buscaInicial?: string;
}) {
  const router = useRouter();
  const {
    imobiliariaId, isEspelhoDemo, imoveis, locacoes, movimentos, chamados,
    carregando, recarregar, abas,
  } = useDadosLocacao();
  const { userData } = useAuth();

  const [etapaSel, setEtapaSel] = useState<string | null>(null);
  const [busca, setBusca] = useState(buscaInicial);
  const [verArquivadas, setVerArquivadas] = useState(false);
  const [aberto, setAberto] = useState<{ id: string; painel: Painel } | null>(null);
  const [novoImovel, setNovoImovel] = useState(false);

  // formulários que vivem dentro das linhas
  const [subindo, setSubindo] = useState<string | null>(null);
  const [catDocInq, setCatDocInq] = useState<string>('CNH ou RG');
  const [itens, setItens] = useState<string[]>([]);
  const [ressalvas, setRessalvas] = useState<RessalvaVistoria[]>([]);
  const [entregando, setEntregando] = useState<string | null>(null);
  const [dataEntrega, setDataEntrega] = useState('');
  const [horaEntrega, setHoraEntrega] = useState('10:00');
  const [reajustando, setReajustando] = useState<string | null>(null);
  const [pctReajuste, setPctReajuste] = useState('');


  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };
  const fechar = () => setAberto(null);
  const abrir = (id: string, painel: Painel) =>
    setAberto((a) => (a?.id === id && a.painel === painel ? null : { id, painel }));

  const upImovel = async (id: string, campos: Partial<ImovelLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoImoveis', id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };
  const upLocacao = async (id: string, campos: Partial<Locacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoLocacoes', id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  /** Anexo rápido do inquilino, direto na linha da fila. */
  const anexarInquilino = async (l: Locacao, categoria: string, arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
    setSubindo(l.id);
    try {
      const novos: Arquivo[] = [...l.docsInquilino];
      for (const a of Array.from(arquivos)) {
        const caminho = `locacao/${imobiliariaId}/locacao/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, caminho), a, a.type ? { contentType: a.type } : undefined);
        await task;
        novos.push({ nome: a.name, url: await getDownloadURL(task.snapshot.ref), storagePath: caminho, categoria });
      }
      await upLocacao(l.id, { docsInquilino: novos });
      showToast('Documento guardado.', 'success');
    } catch { showToast('Falha ao subir.', 'error'); }
    setSubindo(null);
  };

  // ═══════════════ FUNIL 1 · as ações do imóvel ═══════════════

  const enviarAdm = async (i: ImovelLocacao) => {
    const p = pendenciasImovel(i);
    if (p.docs.length) { showToast(`Falta: ${p.docs[0]}`, 'error'); abrir(i.id, 'docsDono'); return; }
    if (p.adm.length) { showToast(`Falta: ${p.adm[0]}`, 'error'); abrir(i.id, 'ficha'); return; }
    await upImovel(i.id, { etapa: 'adm_enviada', admEnviadaEm: hojeYmd(), admSimulada: true });
    showToast(`⚡ Contrato de administração no WhatsApp de ${i.donoNome} (a ClickSign fará de verdade).`, 'info');
  };

  const admAssinada = async (i: ImovelLocacao) => {
    await upImovel(i.id, { etapa: 'adm_assinada', admAssinadaEm: hojeYmd(), admSimulada: true });
    showToast('⚡ Dono assinou! Portal do proprietário criado. Agora o material do anúncio.', 'success');
  };

  const publicar = async (i: ImovelLocacao) => {
    const p = pendenciasImovel(i);
    if (p.material.length) { showToast(`Falta: ${p.material[0]}`, 'error'); abrir(i.id, 'material'); return; }
    await upImovel(i.id, { etapa: 'publicado', publicadoEm: hojeYmd() });
    showToast('📣 No ar! Os feeds levam pros portais (depois da homologação).', 'success');
  };

  /**
   * FURO CORRIGIDO: dava pra excluir um imóvel com locação em andamento. Os
   * dados do PROPRIETÁRIO — nome, CPF, chave PIX do repasse — moram só no
   * imóvel. Excluído, o contrato ficava sem LOCADOR e o repasse sem destino,
   * com o inquilino continuando a ser cobrado. Agora só sai o que está livre.
   */
  const excluirImovel = async (i: ImovelLocacao) => {
    const presas = locacoes.filter((l) => l.imovelId === i.id && l.etapa !== 'encerrada' && l.etapa !== 'perdida');
    if (presas.length) {
      showToast(
        `Não dá: ${presas.length} locação${presas.length > 1 ? 'ões' : ''} depende${presas.length > 1 ? 'm' : ''} deste imóvel (${presas.map((l) => l.nome).join(', ')}). Os dados do proprietário estão aqui. Encerre ou descarte antes.`,
        'error',
      );
      return;
    }
    const ok = await confirmDialog({
      title: 'Excluir este imóvel?',
      message: `${i.codigo} — ${i.titulo}. Some junto a papelada do proprietário anexada nele. Se ele já teve locação encerrada, prefira "⏸ tirar do ar" e guardar o histórico.`,
      confirmLabel: 'Excluir', danger: true,
    });
    if (!ok || guarda()) return;
    await deleteDoc(doc(db, 'locacaoImoveis', i.id));
    showToast('Imóvel excluído.', 'info');
    recarregar();
  };

  // ═══════════════ FUNIL 2 · as ações da locação ═══════════════

  const mandarPraLoft = async (l: Locacao) => {
    const p = pendenciasLocacao({ ...l, etapa: 'docs_inquilino' });
    if (p.length) { showToast(`Falta: ${p[0]}`, 'error'); abrir(l.id, 'dados'); return; }
    await upLocacao(l.id, { etapa: 'na_loft' });
    abrir(l.id, 'loft');
    showToast('Ficha pronta pra Loft — copie e cole no painel deles.', 'info');
  };

  const respostaLoft = async (l: Locacao, ok: boolean) => {
    if (ok) {
      await upLocacao(l.id, { etapa: 'loft_aprovou', garantiaEnviadaEm: hojeYmd(), garantiaSimulada: true });
      showToast('⚡ Loft aprovou e JÁ disparou a fiança pro inquilino. Agora: vistoria + nosso contrato, no mesmo momento.', 'success');
    } else {
      await upLocacao(l.id, { etapa: 'perdida', motivoPerda: 'Loft recusou a garantia' });
      showToast('⚡ Loft recusou — marcado como não fechou.', 'info');
    }
  };

  /**
   * OS DOIS CONTRATOS ANDAM EM PARALELO — a ordem que o gestor definiu.
   * Na etapa "Assinando" há dois vistos independentes: a fiança (Loft avisa)
   * e o nosso contrato (ClickSign avisa). Cada um chega quando chega; quando
   * os DOIS estiverem assinados, a locação avança sozinha pra "Tudo assinado".
   */
  const marcarFiancaAssinada = async (l: Locacao) => {
    const contratoOk = !!l.contratoAssinadoEm;
    await upLocacao(l.id, {
      garantiaAssinadaEm: hojeYmd(),
      garantiaNumero: l.garantiaNumero || `LOFT-${Math.floor(Math.random() * 90000) + 10000}`,
      garantiaSimulada: true,
      ...(contratoOk ? { etapa: 'contrato_assinado' as const } : {}),
    });
    showToast(contratoOk
      ? '⚡ Fiança assinada — e o nosso contrato já estava. TUDO assinado: pode marcar as chaves.'
      : '⚡ Fiança assinada com a Loft. Falta o nosso contrato.', 'success');
  };

  const marcarContratoAssinado = async (l: Locacao) => {
    const v = l.vistoriaEntrada;
    const fiancaOk = !!l.garantiaAssinadaEm;
    await upLocacao(l.id, {
      contratoAssinadoEm: hojeYmd(), contratoSimulado: true,
      ...(v ? { vistoriaEntrada: { ...v, assinada: true, assinadaSimulada: true } } : {}),
      ...(fiancaOk ? { etapa: 'contrato_assinado' as const } : {}),
    });
    showToast(fiancaOk
      ? '⚡ Contrato assinado — e a fiança já estava. TUDO assinado: pode marcar as chaves.'
      : '⚡ Nosso contrato assinado. Falta a fiança da Loft.', 'success');
  };

  const abrirVistoria = (l: Locacao) => {
    setItens(l.vistoriaEntrada?.itens || []);
    setRessalvas(l.vistoriaEntrada?.ressalvas || []);
    abrir(l.id, 'vistoria');
  };

  const salvarVistoria = async (l: Locacao, im?: ImovelLocacao) => {
    await upLocacao(l.id, {
      vistoriaEntrada: {
        feitaEm: hojeYmd(), feitaPor: '', fotos: im?.fotos || [],
        itens, ressalvas, assinada: false, assinadaSimulada: false,
      },
    });
    fechar();
    showToast('Vistoria registrada. O laudo vai junto do contrato, no mesmo envelope.', 'success');
  };

  const enviarContrato = async (l: Locacao) => {
    const p = pendenciasLocacao({ ...l, etapa: 'loft_aprovou' });
    if (p.length) {
      showToast(`Falta: ${p[0]}`, 'error');
      abrir(l.id, p[0].toLowerCase().includes('vistoria') ? 'vistoria' : 'dados');
      return;
    }
    await upLocacao(l.id, { etapa: 'contrato_enviado', contratoEnviadoEm: hojeYmd(), contratoSimulado: true });
    showToast('⚡ Nosso contrato + laudo no WhatsApp do dono e do inquilino — junto da fiança que a Loft já mandou. Agora é esperar as duas assinaturas.', 'info');
  };

  /**
   * A entrega das chaves é o ato mais perigoso da tela: cria o contrato
   * ativo e TODAS as cobranças de uma vez. Quatro travas antes de commitar:
   *
   *   1. já ativa ou já com cobranças geradas → não faz de novo (duplo
   *      clique ou rede lenta cobrariam o inquilino duas vezes);
   *   2. imóvel já alugado por outra locação → recusa, senão a casa fica com
   *      dois contratos vigentes no mesmo apartamento;
   *   3. taxa de administração zerada → avisa antes, senão a casa administra
   *      de graça pelos 30 meses e ninguém percebe;
   *   4. os outros interessados no mesmo imóvel são encerrados no MESMO
   *      lote, e o gestor vê quantos são antes de confirmar.
   */
  const entregandoRef = React.useRef(false);

  const entregarChaves = async (l: Locacao, inicio: string, hora: string) => {
    if (guarda() || !imobiliariaId || entregandoRef.current) return;

    if (l.etapa === 'ativa' || movsDe(l.id).length > 0) {
      showToast('Esta locação já está cobrando — as chaves já foram entregues.', 'error');
      setEntregando(null);
      return;
    }
    const outraAtiva = locacoes.find((x) => x.imovelId === l.imovelId && x.id !== l.id && x.etapa === 'ativa');
    if (outraAtiva) {
      showToast(`O imóvel já está alugado para ${outraAtiva.nome}. Encerre aquela locação antes.`, 'error');
      setEntregando(null);
      return;
    }
    const movs = gerarMovimentos({ ...l, inicio });
    if (!movs.length) { showToast('Faltam aluguel, prazo ou dia de vencimento.', 'error'); abrir(l.id, 'dados'); return; }

    const concorrentes = locacoes.filter((x) =>
      x.imovelId === l.imovelId && x.id !== l.id && !['encerrada', 'perdida', 'ativa'].includes(x.etapa));

    const semTaxa = !l.taxaAdmPct;
    const ok = await confirmDialog({
      title: `Entregar as chaves para ${l.nome}?`,
      message: [
        `Entrega marcada pra ${fmtData(inicio)}${hora ? ` às ${hora}` : ''}.`,
        `Vão nascer ${movs.length} cobranças, a primeira vencendo em ${fmtData(movs[0].vencimento)}, de ${fmtValor(movs[0].valorTotal)}.`,
        `A casa retém ${fmtValor(movs[0].taxaAdm)} e o dono recebe ${fmtValor(movs[0].repasseDono)} por mês.`,
        semTaxa ? '⚠ ATENÇÃO: a taxa de administração está ZERADA — o dono receberia o aluguel inteiro e a casa não ganharia nada. Confira antes.' : '',
        concorrentes.length ? `Os outros ${concorrentes.length} interessados neste imóvel serão marcados como "não fechou".` : '',
        'O imóvel sai dos portais.',
      ].filter(Boolean).join('\n\n'),
      confirmLabel: 'Entregar as chaves',
      danger: semTaxa,
    });
    if (!ok) return;

    entregandoRef.current = true;
    try {
      const b = writeBatch(db);
      for (const m of movs) b.set(doc(collection(db, 'locacaoMovimentos')), { ...m, imobiliariaId, criadoEm: serverTimestamp() });
      // vira CLIENTE ATIVO: sai da fila do CRM e passa a viver aqui
      b.update(doc(db, 'locacaoLocacoes', l.id), {
        etapa: 'ativa', inicio, chavesEntreguesEm: inicio, chavesHora: hora,
        atualizadoEm: serverTimestamp(),
      });
      if (l.imovelId && imovelDe(l.imovelId)) {
        b.update(doc(db, 'locacaoImoveis', l.imovelId), { etapa: 'alugado', atualizadoEm: serverTimestamp() });
      }
      for (const c of concorrentes) {
        b.update(doc(db, 'locacaoLocacoes', c.id), { etapa: 'perdida', motivoPerda: 'imóvel alugado para outra pessoa', atualizadoEm: serverTimestamp() });
      }
      await b.commit();
      setEntregando(null); setDataEntrega('');
      showToast(`🔑 Entrega marcada pra ${fmtData(inicio)}${hora ? ` às ${hora}` : ''}. ${l.nome} virou cliente ativo e as ${movs.length} cobranças começam em ${fmtData(movs[0].vencimento)}.`, 'success');
      recarregar();
    } catch (e) {
      console.error(e);
      showToast('Não foi possível concluir a entrega — nada foi gravado. Tente de novo.', 'error');
    }
    entregandoRef.current = false;
  };

  // ——— o dinheiro ———

  const aplicarReajuste = async (l: Locacao, movs: Movimento[]) => {
    if (guarda()) return;
    const feitos = l.reajustes || [];
    const ultimo = feitos.length ? feitos[feitos.length - 1] : null;
    if (ultimo && diasAte(ultimo.em) !== null && -(diasAte(ultimo.em) as number) < 330) {
      showToast(`Já houve reajuste em ${fmtData(ultimo.em)} (${fmtValor(ultimo.de)} → ${fmtValor(ultimo.para)}). O próximo só daqui a um ano.`, 'error');
      setReajustando(null);
      return;
    }
    const pct = Number(pctReajuste.replace(',', '.'));
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) { showToast('Informe o percentual do índice (ex.: 4,5).', 'error'); return; }

    const atual = l.valorAluguel || 0;
    const novo = calcularReajuste(atual, pct);
    const hoje = hojeYmd();
    // só o que ainda vai vencer: o passado é dívida do valor antigo
    const aCorrigir = movs.filter((m) => m.statusCobranca !== 'paga' && m.vencimento >= hoje);
    const atrasados = movs.filter((m) => m.statusCobranca !== 'paga' && m.vencimento < hoje);

    const ok = await confirmDialog({
      title: 'Aplicar o reajuste?',
      message: [
        `O aluguel passa de ${fmtValor(atual)} para ${fmtValor(novo)} (+${pct}% por ${l.indiceReajuste}).`,
        `${aCorrigir.length} competências futuras serão corrigidas.`,
        atrasados.length ? `${atrasados.length} em atraso ficam no valor antigo — dívida não se reajusta.` : '',
        'O inquilino precisa ser comunicado por escrito.',
      ].filter(Boolean).join('\n\n'),
      confirmLabel: 'Aplicar',
    });
    if (!ok) return;

    const taxa = cents(novo * (l.taxaAdmPct || 0) / 100);
    const iptu = l.valorIptuMensal || 0;
    const seguro = l.valorSeguroIncendio || 0;
    try {
      const b = writeBatch(db);
      b.update(doc(db, 'locacaoLocacoes', l.id), {
        valorAluguel: novo,
        reajustes: [...feitos, { em: hoje, de: atual, para: novo, indice: l.indiceReajuste, percentual: pct }],
        atualizadoEm: serverTimestamp(),
      });
      for (const m of aCorrigir) {
        b.update(doc(db, 'locacaoMovimentos', m.id), {
          valorAluguel: novo, valorTotal: cents(novo + iptu + seguro), taxaAdm: taxa,
          repasseDono: cents(novo - taxa + iptu),
        });
      }
      await b.commit();
      setReajustando(null); setPctReajuste('');
      showToast(`Reajuste aplicado: ${fmtValor(atual)} → ${fmtValor(novo)}. Avise o inquilino.`, 'success');
      recarregar();
    } catch (e) {
      console.error(e);
      showToast('Falha ao aplicar — nada foi alterado.', 'error');
    }
  };

  const resolverChamado = async (c: Chamado) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoChamados', c.id), { status: 'resolvido', atualizadoEm: serverTimestamp() });
    showToast('Chamado resolvido.', 'success');
    recarregar();
  };

  // ═══════════════ os dados derivados ═══════════════

  const imovelDe = useCallback((id: string) => imoveis.find((x) => x.id === id), [imoveis]);
  const movsDe = useCallback((id: string) => movimentos.filter((m) => m.locacaoId === id), [movimentos]);
  const chamadosDe = useCallback((id: string) => chamados.filter((c) => c.locacaoId === id && c.status !== 'resolvido'), [chamados]);
  /** Quem está na fila por este imóvel — a ponte entre os dois funis. */
  const interessadosDe = useCallback((imovelId: string) =>
    // só quem ainda VIVE no CRM — senão a ponte levava a uma tela vazia
    locacoes.filter((l) => l.imovelId === imovelId
      && !['ativa', 'encerrando', 'encerrada', 'perdida'].includes(l.etapa)), [locacoes]);

  /** Quem mora no imóvel agora — o cartão do alugado precisa dizer isso. */
  const inquilinoDe = useCallback((imovelId: string) =>
    locacoes.find((l) => l.imovelId === imovelId && (l.etapa === 'ativa' || l.etapa === 'encerrando')), [locacoes]);

  const contarImoveis = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of imoveis) c[i.etapa] = (c[i.etapa] || 0) + 1;
    return c;
  }, [imoveis]);

  const contarLocacoes = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of locacoes) c[l.etapa] = (c[l.etapa] || 0) + 1;
    return c;
  }, [locacoes]);

  const imoveisVisiveis = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return imoveis
      .filter((i) => (!etapaSel || i.etapa === etapaSel))
      .filter((i) => !b || [i.codigo, i.titulo, i.bairro, i.donoNome].filter(Boolean).join(' ').toLowerCase().includes(b))
      .sort((a, b2) => (ETAPAS_IMOVEL[a.etapa]?.n ?? 9) - (ETAPAS_IMOVEL[b2.etapa]?.n ?? 9));
  }, [imoveis, etapaSel, busca]);

  const locacoesVisiveis = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return locacoes
      // quem ainda não fechou é assunto do CRM — esta página é só papelada
      .filter((l) => l.etapa !== 'interessado')
      .filter((l) => (verArquivadas ? true : l.etapa !== 'encerrada' && l.etapa !== 'perdida'))
      .filter((l) => (!etapaSel || l.etapa === etapaSel))
      .filter((l) => {
        if (!b) return true;
        const im = imoveis.find((x) => x.id === l.imovelId);
        return [l.nome, l.telefone, im?.codigo || '', im?.titulo || ''].filter(Boolean).join(' ').toLowerCase().includes(b);
      })
      .sort((a, b2) => {
        const urgente = (l: Locacao) => (chamadosDe(l.id).length || alertasDaLocacao(l).length ? 0 : 1);
        return urgente(a) - urgente(b2) || (ETAPAS_LOCACAO[a.etapa]?.n ?? 99) - (ETAPAS_LOCACAO[b2.etapa]?.n ?? 99);
      });
  }, [locacoes, etapaSel, busca, imoveis, verArquivadas, chamadosDe]);

  const temDemo = useMemo(
    () => imoveis.some((x) => (x as { demo?: boolean }).demo) || locacoes.some((x) => (x as { demo?: boolean }).demo),
    [imoveis, locacoes],
  );

  const seed = async () => {
    if (!imobiliariaId || isEspelhoDemo) { showToast('Indisponível no modo espelho.', 'info'); return; }
    showToast(await criarDadosExemplo(imobiliariaId), 'success');
    recarregar();
  };
  const limpar = async () => {
    if (!imobiliariaId) return;
    // ARMADILHA: quem usa um exemplo como ponto de partida e edita por cima
    // continua com a marca de exemplo — e some aqui junto com os outros.
    const ok = await confirmDialog({
      title: 'Apagar os exemplos?',
      message: 'Remove tudo que foi criado pelo botão 🧪 exemplos.\n\nATENÇÃO: se você editou um exemplo e transformou num imóvel ou locação de verdade, ele ainda carrega a marca e vai ser apagado junto. Nesses casos, capte de novo do zero.',
      confirmLabel: 'Apagar os exemplos', danger: true,
    });
    if (!ok) return;
    showToast(`${await apagarDadosExemplo(imobiliariaId)} registros apagados.`, 'info');
    recarregar();
  };

  const baixarXml = () => {
    const dentro = imoveisNoFeed(imoveis);
    const fora = imoveisForaDoFeed(imoveis);
    const xml = gerarFeedVrsync(imoveis, {
      nome: 'Nox Imóveis',
      email: userData?.email || 'contato@noximobiliaria.com.br',
      telefone: '',
    });
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'feed-vrsync-nox.xml'; a.click();
    URL.revokeObjectURL(a.href);
    showToast(
      fora.length
        ? `${dentro.length} no arquivo. ${fora.length} ficou de fora por anúncio incompleto (${fora[0].imovel.codigo}: ${fora[0].falta[0]}) — anúncio fora da regra reprova o feed inteiro.`
        : `${dentro.length} imóveis no arquivo. Valide no validador do Grupo OLX.`,
      fora.length ? 'error' : 'success',
    );
  };

  const copiarCowork = async (i: ImovelLocacao) => {
    try {
      await navigator.clipboard.writeText(pacoteCowork(i));
      showToast('Pacote copiado — cole no Claude pra publicar no Instagram/Facebook.', 'success');
    } catch { showToast('Não foi possível copiar.', 'error'); }
  };

  // ═══════════════ o botão de cada etapa ═══════════════

  const acaoImovel = (i: ImovelLocacao): React.ReactNode => {
    switch (i.etapa) {
      case 'captado':
        // completou a papelada no painel → avança sozinho pra "Papelada OK"
        return <button onClick={() => abrir(i.id, 'docsDono')} className={btnOuro}>📎 Papelada do dono</button>;
      case 'docs_dono':
        return (
          <span className="flex flex-wrap gap-1.5">
            <button onClick={() => enviarAdm(i)} className={btnOuro}>✍ Enviar administração</button>
            <button onClick={() => abrir(i.id, 'adm')} className={btnGhost}>ver o contrato</button>
          </span>
        );
      case 'adm_enviada':
        return <button onClick={() => admAssinada(i)} className={btnSimula}>⚡ Dono assinou</button>;
      // O OURO É SEMPRE O PRÓXIMO PASSO — e cada coluna tem só um.
      // "Montando anúncio" completa → o salvar avança sozinho pra "Anúncio
      // pronto", onde o único botão dourado é Publicar.
      case 'adm_assinada':
        return <button onClick={() => abrir(i.id, 'material')} className={btnOuro}>📸 Montar o anúncio</button>;
      case 'material':
        return (
          <span className="flex flex-wrap gap-1.5">
            <button onClick={() => publicar(i)} className={btnOuro}>📣 Publicar</button>
            <button onClick={() => abrir(i.id, 'material')} className={btnGhost}>reabrir o anúncio</button>
          </span>
        );
      case 'publicado': {
        // anúncio quebrado tira a casa inteira dos portais: corrigir vem antes
        const quebrado = pendenciasImovel(i).material.length > 0;
        // lead novo nasce no CRM — é lá que se trabalha o relacionamento
        const novo = () => router.push('/dashboard/locacao/crm/?novo=' + i.id);
        return (
          <span className="flex flex-wrap gap-1.5">
            {quebrado && <button onClick={() => abrir(i.id, 'material')} className={btnOuro}>📸 Corrigir o anúncio</button>}
            <button onClick={novo} className={quebrado ? btnGhost : btnOuro}>+ Interessado</button>
            <button onClick={() => upImovel(i.id, { etapa: 'pausado' })} className={btnGhost}>⏸ tirar do ar</button>
          </span>
        );
      }
      case 'alugado':
        return <span className="text-[11.5px] text-text-secondary">alugado — acompanhe no funil das locações</span>;
      default:
        return <button onClick={() => upImovel(i.id, { etapa: 'publicado' })} className={btnOuro}>▶ Voltar ao ar</button>;
    }
  };

  const acaoLocacao = (l: Locacao): React.ReactNode => {
    const movs = movsDe(l.id);
    switch (l.etapa) {
      case 'docs_inquilino':
        return (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center">
              <select value={catDocInq} onChange={(e) => setCatDocInq(e.target.value)}
                className="px-2 py-2 rounded-l-xl border border-white/10 bg-white/[0.04] text-[11px] text-text-secondary focus:outline-none">
                {DOCS_INQUILINO.map((x) => <option key={x}>{x}</option>)}
              </select>
              <label className={btnGhost + ' cursor-pointer !rounded-l-none'}>
                {subindo === l.id ? '…' : `📎 ${l.docsInquilino.length}`}
                <input type="file" multiple className="hidden" disabled={subindo === l.id}
                  onChange={(e) => { anexarInquilino(l, catDocInq, e.target.files); e.currentTarget.value = ''; }} />
              </label>
            </span>
            <button onClick={() => upLocacao(l.id, { docsInquilino: [...l.docsInquilino, arquivoTeste(catDocInq)] })} className={btnSimula}>🧪</button>
            <button onClick={() => mandarPraLoft(l)} className={btnOuro}>🛡 Mandar pra Loft</button>
          </span>
        );
      case 'na_loft':
        return (
          <span className="flex flex-wrap gap-1.5">
            <button onClick={() => respostaLoft(l, true)} className={btnSimula}>⚡ Loft aprovou</button>
            <button onClick={() => respostaLoft(l, false)} className={btnSimula}>⚡ recusou</button>
          </span>
        );
      // aprovou → a fiança JÁ está com o inquilino; a bola é nossa: vistoria
      // e disparar o nosso contrato no mesmo momento
      case 'loft_aprovou':
        return (
          <span className="flex flex-wrap gap-1.5">
            {!l.vistoriaEntrada
              ? <button onClick={() => abrirVistoria(l)} className={btnOuro}>📋 Fazer a vistoria</button>
              : <>
                  <button onClick={() => enviarContrato(l)} className={btnOuro}>✍ Disparar contrato + laudo</button>
                  <button onClick={() => abrirVistoria(l)} className={btnGhost}>rever vistoria</button>
                </>}
          </span>
        );
      // os dois contratos na rua — cada visto chega quando chega
      case 'contrato_enviado':
      case 'fianca_assinada':
        return (
          <span className="flex flex-wrap gap-1.5">
            {!l.garantiaAssinadaEm && <button onClick={() => marcarFiancaAssinada(l)} className={btnSimula}>⚡ Fiança assinada</button>}
            {!l.contratoAssinadoEm && <button onClick={() => marcarContratoAssinado(l)} className={btnSimula}>⚡ Nosso contrato assinado</button>}
          </span>
        );
      case 'contrato_assinado':
        return entregando === l.id ? (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-text-secondary">dia e hora da entrega</span>
            <input type="date" className={inputCls + ' !w-auto'} value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
            <input type="time" className={inputCls + ' !w-auto'} value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} />
            <button onClick={() => entregarChaves(l, dataEntrega || hojeYmd(), horaEntrega)} className={btnOuro}>confirmar</button>
            <button onClick={() => setEntregando(null)} className={btnGhost}>×</button>
          </span>
        ) : (
          <button onClick={() => { setEntregando(l.id); setDataEntrega(hojeYmd()); setHoraEntrega('10:00'); }} className={btnOuro}>🔑 Marcar a entrega das chaves</button>
        );
      case 'ativa': {
        const lib = movs.filter((m) => m.statusRepasse === 'liberado').length;
        const atras = movs.filter((m) => m.statusCobranca !== 'paga' && m.vencimento < hojeYmd()).length;
        return (
          <span className="flex flex-wrap gap-1.5">
            <button onClick={() => router.push('/dashboard/locacao/cobranca/')} className={(lib || atras) ? btnOuro : btnGhost}>
              💰 Cobrança{lib || atras ? ` (${lib + atras})` : ''}
            </button>
            <button onClick={async () => {
              const ok = await confirmDialog({
                title: `${l.nome} está saindo?`,
                message: 'A locação vai pra "Em saída": vistoria de saída e distrato. Use só quando o inquilino avisou de fato.',
                confirmLabel: 'Iniciar a saída',
              });
              if (ok) upLocacao(l.id, { etapa: 'encerrando' });
            }} className={btnGhost}>↪ saída</button>
          </span>
        );
      }
      case 'encerrando':
        return <button onClick={() => abrir(l.id, 'dados')} className={btnOuro}>↪ Concluir a saída</button>;
      default:
        // Só "não fechou" volta atrás: erro de clique acontece. Locação
        // ENCERRADA é história — reabrir devolveria um contrato extinto ao
        // funil, com o imóvel talvez já alugado pra outra pessoa.
        return (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-text-secondary">
              {l.etapa === 'encerrada' ? `encerrada em ${fmtData(l.encerradaEm)}` : l.motivoPerda || 'não fechou'}
            </span>
            {l.etapa === 'perdida' && (
              <button onClick={() => upLocacao(l.id, { etapa: 'interessado', crmEtapa: 'contato', motivoPerda: '' })}
                className={btnGhost + ' !py-1 !text-[11px]'} title="volta a viver no CRM, em Em contato">
                ↩ reabrir no CRM
              </button>
            )}
          </span>
        );
    }
  };

  // ═══════════════ os painéis que abrem embaixo ═══════════════

  const painelDe = (im: ImovelLocacao | undefined, l?: Locacao): React.ReactNode => {
    if (!aberto) return null;
    const p = aberto.painel;
    const movs = l ? movsDe(l.id) : [];

    // ——— painéis da LOCAÇÃO (funil 2) ———
    if (l) {
      if (p === 'dados') {
        return <PainelLocacao key={l.id} imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo}
          locacao={l} imovel={im} movimentosAbertos={movs.filter((m) => m.statusCobranca !== 'paga').length}
          recarregar={recarregar} onFechar={fechar} />;
      }
      if (p === 'loft') return <PacoteLoft locacao={l} imovel={im} onFechar={fechar} />;
      // o ENVELOPE: contrato + laudo empilhados, como vão pra assinatura
      if (p === 'minuta') {
        return (
          <div className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
              O envelope da assinatura — o contrato e o laudo viajam juntos, num envio só da ClickSign
            </p>
            <MinutaContrato l={l} imovel={im} onFechar={fechar} />
            {l.vistoriaEntrada
              ? <LaudoVistoria locacao={l} imovel={im} tipo="entrada" onFechar={fechar} />
              : <p className="text-[11.5px] text-amber-300">O laudo entra aqui assim que a vistoria for feita.</p>}
          </div>
        );
      }
      if (p === 'laudo' && l.vistoriaEntrada) return <LaudoVistoria locacao={l} imovel={im} tipo="entrada" onFechar={fechar} />;
      if (p === 'portalDonoLoc') {
        return (
          <div className="space-y-3">
            {im && (
              <AcessoAoPortal quem="dono" nome={im.donoNome} doc={im.donoDoc}
                telefone={im.donoTelefone} endereco={`${im.codigo} — ${im.titulo}`} />
            )}
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-300">O que o DONO vê no portal dele</p>
            <VisaoDono d={portalDaLocacao(l, im, movs, chamados)} />
          </div>
        );
      }
      if (p === 'portalInq') {
        return (
          <div className="space-y-3">
            <AcessoAoPortal quem="inquilino" nome={l.nome} doc={l.doc}
              telefone={l.telefone} endereco={im ? `${im.codigo} — ${im.titulo}` : ''} />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-300">O que o INQUILINO vê no portal dele</p>
            <VisaoInquilino d={portalDaLocacao(l, im, movs, chamados)} />
          </div>
        );
      }
      if (p === 'extrato') {
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px] border-collapse min-w-[520px]">
              <thead><tr>{['Competência', 'Vence', 'Cobrança', 'Situação', 'Repasse', 'Repassado'].map((h) => (
                <th key={h} className="text-left font-extrabold uppercase tracking-[0.08em] text-[9.5px] text-text-secondary border-b border-white/15 px-2 py-1.5">{h}</th>
              ))}</tr></thead>
              <tbody>
                {[...movs].sort((a, b) => a.competencia.localeCompare(b.competencia)).map((m) => {
                  const atrasada = m.statusCobranca !== 'paga' && m.vencimento < hojeYmd();
                  return (
                    <tr key={m.id}>
                      <td className="px-2 py-1.5 border-b border-white/[0.06] text-white font-bold tabular-nums">{m.competencia.split('-').reverse().join('/')}</td>
                      <td className="px-2 py-1.5 border-b border-white/[0.06] text-text-secondary tabular-nums">{fmtData(m.vencimento)}</td>
                      <td className="px-2 py-1.5 border-b border-white/[0.06] text-white tabular-nums">{fmtValor(m.valorTotal)}</td>
                      <td className={`px-2 py-1.5 border-b border-white/[0.06] font-bold ${m.statusCobranca === 'paga' ? 'text-emerald-300' : atrasada ? 'text-rose-300' : 'text-text-secondary'}`}>
                        {m.statusCobranca === 'paga' ? `paga ${fmtData(m.pagoEm)}` : atrasada ? 'atrasada' : 'prevista'}
                      </td>
                      <td className="px-2 py-1.5 border-b border-white/[0.06] text-emerald-300 tabular-nums">{fmtValor(m.repasseDono)}</td>
                      <td className="px-2 py-1.5 border-b border-white/[0.06] text-text-secondary">{m.repassadoEm ? fmtData(m.repassadoEm) : m.statusRepasse === 'liberado' ? 'liberado' : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {movs[0] && (
              <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">
                  Pra onde vai cada real da mensalidade de {fmtValor(movs[0].valorTotal)}
                </p>
                {([
                  ['Dono do imóvel (aluguel − taxa + reembolso do IPTU)', movs[0].repasseDono, 'text-emerald-300'],
                  [`Nox — taxa de administração (${l.taxaAdmPct || 0}% do aluguel)`, movs[0].taxaAdm, 'text-[#FFE9A6]'],
                  ['Seguradora — seguro incêndio (não é receita da casa)', movs[0].valorSeguro, 'text-sky-300'],
                ] as const).map(([r, v, cor]) => (
                  <div key={r} className="flex items-baseline justify-between gap-3 border-b border-white/[0.05] py-1 last:border-0">
                    <span className="text-[11.5px] text-text-secondary">{r}</span>
                    <span className={`text-[12px] font-bold tabular-nums ${cor}`}>{fmtValor(v)}</span>
                  </div>
                ))}
                <p className="text-[10.5px] text-text-secondary mt-2">
                  O condomínio{l.valorCondominio ? ` (${fmtValor(l.valorCondominio)})` : ''} não entra nesta conta:
                  o inquilino paga direto à administradora do condomínio.
                </p>
              </div>
            )}
            <button onClick={fechar} className={btnGhost + ' mt-2'}>fechar</button>
          </div>
        );
      }
      if (p === 'vistoria') {
        return (
          <div className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
              Vistoria de entrada — o laudo vai junto do contrato, no mesmo envelope
            </p>
            <div>
              <p className="text-[11.5px] text-white/85 mb-1.5">
                Registro visual: <b className="text-[#FFE9A6]">{(im?.fotos || []).length} fotos do anúncio</b>
                <span className="text-text-secondary"> — congeladas no laudo, servem de comparação na saída.</span>
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {(im?.fotos || []).slice(0, 8).map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} alt={`foto ${i + 1}`} className="h-16 rounded-lg object-cover shrink-0 border border-white/10" />
                ))}
                {!(im?.fotos || []).length && <span className="text-[11.5px] text-amber-300">Sem fotos no anúncio — suba na ficha do imóvel.</span>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">O que fica no imóvel ({itens.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {ITENS_VISTORIA.map((x) => {
                  const on = itens.includes(x);
                  return (
                    <button key={x} type="button" onClick={() => setItens(on ? itens.filter((y) => y !== x) : [...itens, x])}
                      className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold border transition-colors ${
                        on ? 'bg-[#E8C547]/15 border-[#E8C547]/50 text-[#FFE9A6]' : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-white'
                      }`}>{x}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">
                Ressalvas — o que NÃO está perfeito ({ressalvas.length})
              </p>
              {ressalvas.map((r, n) => (
                <div key={n} className="flex flex-wrap items-center gap-2 mb-1.5">
                  <input list="locais-v" className={inputCls + ' !w-32'} placeholder="onde" value={r.onde}
                    onChange={(e) => setRessalvas(ressalvas.map((x, j) => (j === n ? { ...x, onde: e.target.value } : x)))} />
                  <input className={inputCls + ' flex-1 min-w-[180px]'} placeholder="o que está com problema" value={r.oque}
                    onChange={(e) => setRessalvas(ressalvas.map((x, j) => (j === n ? { ...x, oque: e.target.value } : x)))} />
                  <button onClick={() => setRessalvas(ressalvas.filter((_, j) => j !== n))} className="text-rose-300">×</button>
                </div>
              ))}
              <datalist id="locais-v">{LOCAIS_VISTORIA.map((x) => <option key={x} value={x} />)}</datalist>
              <button onClick={() => setRessalvas([...ressalvas, { onde: '', oque: '' }])} className={btnGhost}>+ ressalva</button>
              {!ressalvas.length && (
                <p className="text-[11px] text-text-secondary mt-1">
                  Sem ressalvas = entregue em perfeito estado. Na saída, o que estiver diferente das fotos é do inquilino.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => salvarVistoria(l, im)} className={btnOuro}>Salvar vistoria</button>
              <button onClick={fechar} className={btnGhost}>cancelar</button>
            </div>
          </div>
        );
      }
      return null;
    }

    // ——— painéis do IMÓVEL (funil 1) ———
    if (!im) return null;
    if (p === 'ficha' || p === 'material') {
      return <FichaImovel imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo} imoveis={imoveis}
        imovel={im} modo={p === 'material' ? 'anuncio' : 'dados'} recarregar={recarregar} onFechar={fechar} />;
    }
    if (p === 'adm') return <MinutaAdministracao imovel={im} onFechar={fechar} />;
    if (p === 'portalDono') {
      return (
        <div className="space-y-3">
          <AcessoAoPortal quem="dono" nome={im.donoNome} doc={im.donoDoc}
            telefone={im.donoTelefone} endereco={`${im.codigo} — ${im.titulo}`} />
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-300">O que o DONO vê no portal dele</p>
          <VisaoDono d={portalDoImovel(im)} />
        </div>
      );
    }
    if (p === 'docsDono') {
      return <PainelDono key={im.id} imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo}
        imovel={im} recarregar={recarregar} onFechar={fechar} />;
    }
    return null;
  };

  // ═══════════════ render ═══════════════

  if (carregando) {
    return <div className="min-h-screen py-8 px-4"><div className="max-w-5xl mx-auto al-card p-8 text-center text-sm text-text-secondary">Carregando…</div></div>;
  }

  // as etapas de arquivo (pausado, encerrada, não fechou) só entram na régua
  // quando existe alguém nelas — caixinha zerada sem motivo confunde
  const etapas: string[] = funil === 'imoveis'
    ? [...ORDEM_IMOVEL, ...(contarImoveis.pausado ? ['pausado'] : [])]
    : [...ORDEM_LOCACAO, ...(verArquivadas ? ['encerrada', 'perdida'] : [])];
  const contagem = funil === 'imoveis' ? contarImoveis : contarLocacoes;
  const defEtapa = (k: string) => (funil === 'imoveis'
    ? ETAPAS_IMOVEL[k as EtapaImovel]
    : ETAPAS_LOCACAO[k as EtapaLocacao]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* cabeçalho */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="gx-tag mb-2 inline-flex"><span>Setor de Locação</span></span>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">
              {funil === 'imoveis' ? 'Imóveis' : 'Locações'}
            </h1>
            <p className="text-text-secondary text-[12.5px] mt-1 max-w-[64ch]">
              {funil === 'imoveis'
                ? <>O caminho do <b className="text-white/85">proprietário</b>: captar, papelada, administração assinada, anúncio no ar. Completou uma etapa, o imóvel anda sozinho.</>
                : <>A papelada de quem <b className="text-white/85">fechou no CRM</b>: documentos, Loft, os dois contratos, chave.</>}
              {' '}Os botões <b className="text-amber-300">⚡ âmbar</b> fazem o papel de quem ainda não está integrado.
            </p>
          </div>
          {/* aqui em cima ficam só as ações de simulação — as de criar moram
              dentro do funil a que pertencem, junto da busca */}
          <div className="flex flex-wrap gap-2">
            {temDemo
              ? <button onClick={limpar} className={btnGhost + ' !text-rose-300'}>🧪 apagar exemplos</button>
              : <button onClick={seed} className={btnGhost}>🧪 exemplos</button>}
          </div>
        </div>

        <AbasDaArea ativa={funil} crm={abas.crm} imoveis={abas.imoveis} locacoes={abas.locacoes}
          mensagens={abas.mensagens} cobranca={abas.cobranca} />

        {/* a régua de etapas do funil escolhido */}
        <div className="al-card p-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {etapas.map((k, i) => {
              const d = defEtapa(k);
              const q = contagem[k] || 0;
              const sel = etapaSel === k;
              return (
                <React.Fragment key={k}>
                  {i > 0 && <span className="text-white/15 text-[11px] shrink-0">›</span>}
                  <button onClick={() => setEtapaSel(sel ? null : k)} title={d?.ajuda}
                    className={`shrink-0 px-2.5 py-1.5 rounded-xl text-center min-w-[80px] transition-colors ${
                      sel ? 'bg-[#E8C547]/15 border border-[#E8C547]/50'
                        : q > 0 ? 'bg-white/[0.05] border border-white/10 hover:bg-white/[0.09]'
                          : 'border border-transparent opacity-40'}`}>
                    <span className={`block text-[17px] font-extrabold tabular-nums leading-none ${sel ? 'text-[#FFE9A6]' : q > 0 ? 'text-white' : 'text-text-secondary'}`}>{q}</span>
                    <span className="block text-[9.5px] font-bold text-text-secondary leading-tight mt-0.5 whitespace-nowrap">{d?.icone} {d?.rotulo}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
          <p className="text-[11px] text-text-secondary mt-1.5 pt-1.5 border-t border-white/[0.06]">
            {etapaSel && defEtapa(etapaSel) ? (
              <>
                <b className="text-[#FFE9A6]">{defEtapa(etapaSel)!.rotulo}:</b> {defEtapa(etapaSel)!.ajuda}
                {' · '}mostrando <b className="text-white">{funil === 'imoveis' ? imoveisVisiveis.length : locacoesVisiveis.length}</b> desta etapa
                <button onClick={() => setEtapaSel(null)} className="ml-2 text-[#E8C547] font-bold">ver todos</button>
              </>
            ) : (
              <>Clique numa etapa pra filtrar. Mostrando <b className="text-white">{funil === 'imoveis' ? imoveisVisiveis.length : locacoesVisiveis.length}</b> {funil === 'imoveis' ? 'imóveis' : 'locações'}.</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder={funil === 'imoveis' ? 'buscar por código, imóvel, bairro ou dono…' : 'buscar por inquilino, telefone ou imóvel…'}
            className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40" />
          {/* cada funil tem a MESMA forma aqui: criar em ouro, secundário em ghost */}
          {funil === 'imoveis' ? (
            <>
              <button onClick={() => setNovoImovel((v) => !v)} className={btnOuro}>+ Captar imóvel</button>
              <button onClick={baixarXml} className={btnGhost} title="o arquivo que os portais leem — pra testar na homologação">⬇ XML do feed</button>
            </>
          ) : (
            <>
              <button onClick={() => router.push('/dashboard/locacao/crm/')} className={btnGhost}>
                👥 lead novo? é no CRM →
              </button>
              <button onClick={() => setVerArquivadas((v) => !v)} className={btnGhost}>
                {verArquivadas ? 'esconder encerradas' : 'ver encerradas'}
              </button>
            </>
          )}
        </div>

        {/* captar imóvel — nasce no mesmo lugar em que o interessado nasce */}
        {novoImovel && funil === 'imoveis' && (
          <div className="al-card p-4">
            <FichaImovel imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo} imoveis={imoveis}
              imovel={null} modo="dados" recarregar={async () => { await recarregar(); setNovoImovel(false); }}
              onFechar={() => setNovoImovel(false)} />
          </div>
        )}

        {/* ═══════════ FUNIL 1 · IMÓVEIS ═══════════ */}
        {funil === 'imoveis' && imoveisVisiveis.map((i) => {
          const naFila = interessadosDe(i.id);
          const morador = inquilinoDe(i.id);
          return (
            <CartaoImovel
              key={i.id}
              i={i}
              alertas={alertasDoImovel(i, naFila.length)}
              interessados={naFila.length}
              inquilino={morador ? { nome: morador.nome, desde: morador.inicio } : null}
              onVerInquilino={() => router.push('/dashboard/locacao/locacoes/?busca=' + encodeURIComponent(morador?.nome || ''))}
              zap={linkWhats(i.donoTelefone, `Olá ${(i.donoNome || '').split(' ')[0]}! Aqui é da Nox Imóveis, sobre o ${i.titulo || 'seu imóvel'}.`)}
              acao={acaoImovel(i)}
              painel={aberto?.id === i.id ? painelDe(i) : null}
              onAbrir={(p) => abrir(i.id, p)}
              onVerFila={() => router.push('/dashboard/locacao/crm/?imovel=' + encodeURIComponent(i.codigo))}
              onCopiarCowork={() => copiarCowork(i)}
              onExcluir={() => excluirImovel(i)}
            />
          );
        })}

        {/* ═══════════ FUNIL 2 · LOCAÇÕES ═══════════ */}
        {funil === 'locacoes' && locacoesVisiveis.map((l) => {
          const im = imovelDe(l.imovelId);
          const d = ETAPAS_LOCACAO[l.etapa];
          const movs = movsDe(l.id);
          const alertas = alertasDaLocacao(l);
          const chs = chamadosDe(l.id);
          const atrasadas = movs.filter((m) => m.statusCobranca !== 'paga' && m.vencimento < hojeYmd());
          const pendLoc = pendenciasLocacao(l);
          const zap = linkWhats(l.telefone, `Olá ${(l.nome || '').split(' ')[0]}! Aqui é da Nox Imóveis.`);
          const nossaVez = d?.comQuem === 'nós' || alertas.length > 0 || chs.length > 0 || atrasadas.length > 0;
          return (
            <div key={l.id} className={`al-card relative overflow-hidden ${nossaVez ? 'ring-1 ring-[#E8C547]/25' : ''}`}>
              {nossaVez && <div className="absolute inset-x-0 top-0 gx-line-gold" />}
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-white">
                      {l.nome}
                      {l.temperatura && (
                        <span className={`ml-2 text-[11px] ${l.temperatura === 'alta' ? 'text-rose-300' : l.temperatura === 'media' ? 'text-amber-300' : 'text-sky-300'}`}>
                          {l.temperatura === 'alta' ? '🔥' : l.temperatura === 'media' ? '🌤' : '❄'}
                        </span>
                      )}
                    </p>
                    <p className="text-[11.5px] text-text-secondary mt-0.5">
                      {[`${d?.icone} ${d?.rotulo}`, im ? `${im.codigo} · ${im.titulo}` : 'imóvel removido',
                        l.valorAluguel ? `${fmtValor(l.valorAluguel)}/mês` : null,
                        l.origem !== 'manual' ? `via ${l.origem.replace('_', ' ')}` : null].filter(Boolean).join(' · ')}
                      {(l.contratoSimulado || l.garantiaSimulada) && <span className="ml-2"><SeloSimulacao /></span>}
                    </p>
                    {d?.oQueFalta && <p className="text-[12px] text-[#FFE9A6] mt-1">→ {d.oQueFalta}</p>}
                    {l.chavesEntreguesEm && (
                      <p className="text-[11.5px] text-text-secondary mt-1">
                        🔑 Entrega das chaves: {fmtData(l.chavesEntreguesEm)}{l.chavesHora && <> às {l.chavesHora}</>}
                      </p>
                    )}
                    {['contrato_enviado', 'fianca_assinada'].includes(l.etapa) && (
                      <p className="text-[11.5px] mt-1 flex flex-wrap gap-x-3">
                        <span className={l.garantiaAssinadaEm ? 'text-emerald-300 font-bold' : 'text-text-secondary'}>
                          {l.garantiaAssinadaEm ? '✓' : '○'} fiança da Loft{l.garantiaAssinadaEm ? ' assinada' : ' — com o inquilino'}
                        </span>
                        <span className={l.contratoAssinadoEm ? 'text-emerald-300 font-bold' : 'text-text-secondary'}>
                          {l.contratoAssinadoEm ? '✓' : '○'} nosso contrato{l.contratoAssinadoEm ? ' assinado' : ' — com dono e inquilino'}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">{acaoLocacao(l)}</div>
                </div>

                {pendLoc.length > 0 && (
                  <p className="text-[11.5px] text-amber-300 mt-2">Falta: {pendLoc.join(' · ')}</p>
                )}

                {/* os alertas — todos com botão que resolve ali mesmo */}
                {chs.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-2 mt-2 rounded-lg px-3 py-1.5 bg-rose-500/10 border border-rose-500/30">
                    <p className="text-[11.5px] font-bold text-rose-300 flex-1 min-w-[200px]">
                      🔧 Manutenção ({(STATUS_CHAMADO[c.status] || STATUS_CHAMADO.aberto).rotulo.toLowerCase()}): {c.descricao}
                    </p>
                    <button onClick={() => resolverChamado(c)} className={btnOuro + ' !py-1 !text-[10.5px] shrink-0'}>✓ resolvido</button>
                  </div>
                ))}
                {atrasadas.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-2 rounded-lg px-3 py-1.5 bg-rose-500/10 border border-rose-500/30">
                    <p className="text-[11.5px] font-bold text-rose-300 flex-1 min-w-[200px]">
                      🚨 {atrasadas.length} competência{atrasadas.length > 1 ? 's' : ''} em atraso — {fmtValor(atrasadas.reduce((s, m) => s + m.valorTotal, 0))}.
                      {' '}A Loft cobre o aluguel garantido; acione a régua do Asaas.
                    </p>
                    <button onClick={() => abrir(l.id, 'extrato')} className={btnGhost + ' !py-1 !text-[10.5px] shrink-0'}>ver extrato</button>
                  </div>
                )}
                {alertas.map((a, n) => (
                  <div key={n} className={`flex flex-wrap items-center gap-2 mt-2 rounded-lg px-3 py-1.5 ${a.grave ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-amber-500/[0.07] border border-amber-500/20'}`}>
                    <p className={`text-[11.5px] font-bold flex-1 min-w-[200px] ${a.grave ? 'text-rose-300' : 'text-amber-300'}`}>{a.grave ? '🚨' : '⚠'} {a.texto}</p>
                    {a.tipo === 'vigencia' && <button onClick={() => abrir(l.id, 'dados')} className={btnGhost + ' !py-1 !text-[10.5px] shrink-0'}>renovar ou encerrar</button>}
                    {a.tipo === 'reajuste' && (reajustando === l.id ? (
                      <span className="flex items-center gap-1.5 shrink-0">
                        <input className={inputCls + ' !w-20'} placeholder="4,5" value={pctReajuste} onChange={(e) => setPctReajuste(e.target.value)} />
                        <span className="text-[11px] text-text-secondary">%</span>
                        <button onClick={() => aplicarReajuste(l, movs)} className={btnOuro + ' !py-1 !text-[10.5px]'}>aplicar</button>
                        <button onClick={() => setReajustando(null)} className={btnGhost + ' !py-1 !text-[10.5px]'}>×</button>
                      </span>
                    ) : (
                      <button onClick={() => { setReajustando(l.id); setPctReajuste(''); }} className={btnOuro + ' !py-1 !text-[10.5px] shrink-0'}>📈 aplicar</button>
                    ))}
                  </div>
                ))}

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {zap && <a href={zap} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">💬 inquilino</a>}
                  <button onClick={() => abrir(l.id, 'dados')} className={btnGhost + ' !py-1 !text-[11px]'}>📄 dados e contrato</button>
                  <button onClick={() => abrir(l.id, 'loft')} className={btnGhost + ' !py-1 !text-[11px]'}>🛡 ficha da Loft ({l.docsInquilino.length})</button>
                  {ETAPAS_LOCACAO[l.etapa].n >= 4 && ETAPAS_LOCACAO[l.etapa].n <= 8 && (
                    <button onClick={() => abrir(l.id, 'minuta')} className={btnGhost + ' !py-1 !text-[11px]'}>
                      📜 contrato{l.vistoriaEntrada ? ' + laudo' : ''}
                    </button>
                  )}
                  {ETAPAS_LOCACAO[l.etapa].n >= 7 && (
                    <>
                      <button onClick={() => abrir(l.id, 'extrato')} className={btnGhost + ' !py-1 !text-[11px]'}>💰 extrato ({movs.length})</button>
                      <button onClick={() => abrir(l.id, 'portalInq')} className={btnGhost + ' !py-1 !text-[11px]'}>👁 portal do inquilino</button>
                      <button onClick={() => abrir(l.id, 'portalDonoLoc')} className={btnGhost + ' !py-1 !text-[11px]'}>👁 portal do dono</button>
                    </>
                  )}
                </div>
              </div>
              {aberto?.id === l.id && (
                <div className="border-t border-white/[0.08] bg-white/[0.02] p-4">{painelDe(im, l)}</div>
              )}
            </div>
          );
        })}

        {/* vazios */}
        {funil === 'imoveis' && imoveisVisiveis.length === 0 && !novoImovel && (
          <div className="al-card p-10 text-center">
            <p className="text-[32px] mb-2">🏠</p>
            <p className="text-[14px] font-bold text-white">{etapaSel ? 'Nenhum imóvel nesta etapa.' : 'Nenhum imóvel captado.'}</p>
            <p className="text-[12.5px] text-text-secondary mt-1 max-w-[48ch] mx-auto">
              {etapaSel ? defEtapa(etapaSel)?.ajuda : 'Capte o primeiro — ou clique em 🧪 exemplos pra ver os dois funis rodando com dados de mentira.'}
            </p>
          </div>
        )}
        {funil === 'locacoes' && locacoesVisiveis.length === 0 && (
          <div className="al-card p-10 text-center">
            <p className="text-[32px] mb-2">🔑</p>
            <p className="text-[14px] font-bold text-white">{etapaSel ? 'Nenhuma locação nesta etapa.' : 'Nenhuma locação em andamento.'}</p>
            <p className="text-[12.5px] text-text-secondary mt-1 max-w-[48ch] mx-auto">
              {etapaSel ? defEtapa(etapaSel)?.ajuda : 'A papelada nasce quando um lead FECHA no CRM — lá é onde os interessados vivem até isso.'}
            </p>
          </div>
        )}

        {/* o rodapé honesto */}
        <div className="al-card p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-300 mb-1.5">O que ainda é ⚡ simulação</p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[11.5px] text-text-secondary">
            {[
              ['ClickSign', 'assinar administração, contrato + laudo e distrato'],
              ['Loft', 'aprovar o inquilino e enviar a fiança pra ele assinar'],
              ['Asaas', 'emitir boleto/PIX, avisar o pagamento e repassar ao dono'],
              ['Portais', 'publicar pelo feed e devolver os leads'],
            ].map(([n, o]) => <p key={n}><b className="text-white/80">{n}</b> — {o}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}
