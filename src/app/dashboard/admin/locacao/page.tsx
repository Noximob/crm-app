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
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
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
  pendenciasImovel, pendenciasLocacao, alertasDaLocacao, gerarMovimentos, calcularReajuste,
  portalDoImovel, portalDaLocacao, gerarFeedVrsync, pacoteCowork, arquivoTeste,
  hojeYmd, fmtData, fmtValor, linkWhats,
  type ImovelLocacao, type Locacao, type Movimento, type Chamado,
  type EtapaImovel, type EtapaLocacao, type Arquivo, type RessalvaVistoria,
} from '@/lib/locacao';
import { VisaoDono, VisaoInquilino } from '@/lib/locacaoPortalView';
import { inputCls, btnOuro, btnGhost, btnSimula, SeloSimulacao, Campo } from './ui';
import FichaImovel, { PainelDono } from './imoveis';
import PainelLocacao from './contratos';
import MinutaContrato from './minuta';
import { MinutaAdministracao, LaudoVistoria, PacoteLoft } from './documentos';
import { criarDadosExemplo, apagarDadosExemplo } from './demo';

type Funil = 'imoveis' | 'locacoes';
type Painel = 'ficha' | 'docsDono' | 'adm' | 'material' | 'portalDono'
  | 'dados' | 'loft' | 'vistoria' | 'minuta' | 'laudo' | 'extrato' | 'portalInq' | 'portalDonoLoc';

const ORDEM_IMOVEL: EtapaImovel[] = ['captado', 'docs_dono', 'adm_enviada', 'adm_assinada', 'material', 'publicado', 'alugado'];
const ORDEM_LOCACAO: EtapaLocacao[] = ['interessado', 'docs_inquilino', 'na_loft', 'loft_aprovou', 'fianca_assinada', 'contrato_enviado', 'contrato_assinado', 'ativa', 'encerrando'];

export default function LocacaoPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  const [funil, setFunil] = useState<Funil>('imoveis');
  const [imoveis, setImoveis] = useState<ImovelLocacao[]>([]);
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [etapaSel, setEtapaSel] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [verArquivadas, setVerArquivadas] = useState(false);
  const [aberto, setAberto] = useState<{ id: string; painel: Painel } | null>(null);
  const [novoImovel, setNovoImovel] = useState(false);

  // formulários que vivem dentro das linhas
  const [subindo, setSubindo] = useState<string | null>(null);
  const [catDocInq, setCatDocInq] = useState<string>('CNH ou RG');
  const [itens, setItens] = useState<string[]>([]);
  const [ressalvas, setRessalvas] = useState<RessalvaVistoria[]>([]);
  const [novoLead, setNovoLead] = useState<{ imovelId: string } | null>(null);
  const [nNome, setNNome] = useState('');
  const [nTel, setNTel] = useState('');
  const [nOrigem, setNOrigem] = useState('manual');
  const [entregando, setEntregando] = useState<string | null>(null);
  const [dataEntrega, setDataEntrega] = useState('');
  const [reajustando, setReajustando] = useState<string | null>(null);
  const [pctReajuste, setPctReajuste] = useState('');

  const recarregar = useCallback(async () => {
    if (!imobiliariaId || isEspelhoDemo) { setCarregando(false); return; }
    try {
      const q = (col: string) => getDocs(query(collection(db, col), where('imobiliariaId', '==', imobiliariaId)));
      const [si, sl, sm] = await Promise.all([q('locacaoImoveis'), q('locacaoLocacoes'), q('locacaoMovimentos')]);
      setImoveis(si.docs.map((d) => ({ ...IMOVEL_VAZIO, id: d.id, imobiliariaId, ...(d.data() as Partial<ImovelLocacao>) } as ImovelLocacao)));
      setLocacoes(sl.docs.map((d) => ({ ...LOCACAO_VAZIA, id: d.id, imobiliariaId, ...(d.data() as Partial<Locacao>) } as Locacao)));
      setMovimentos(sm.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Movimento, 'id'>) })));
      try {
        const sc = await q('locacaoChamados');
        setChamados(sc.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Chamado, 'id'>) })));
      } catch { /* coleção nova pode não existir ainda */ }
    } catch (e) { console.error('locacao:', e); }
    setCarregando(false);
  }, [imobiliariaId, isEspelhoDemo]);
  useEffect(() => { recarregar(); }, [recarregar]);

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

  const guardarDocsDono = async (i: ImovelLocacao) => {
    const p = pendenciasImovel(i);
    if (p.docs.length) { showToast(`Falta: ${p.docs[0]}`, 'error'); return; }
    await upImovel(i.id, { etapa: 'docs_dono' });
    showToast('Papelada completa — pode gerar a administração.', 'success');
  };

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

  const excluirImovel = async (i: ImovelLocacao) => {
    const ok = await confirmDialog({
      title: 'Excluir este imóvel?',
      message: `${i.codigo} — ${i.titulo}. As locações dele NÃO são excluídas.`,
      confirmLabel: 'Excluir', danger: true,
    });
    if (!ok || guarda()) return;
    await deleteDoc(doc(db, 'locacaoImoveis', i.id));
    showToast('Imóvel excluído.', 'info');
    recarregar();
  };

  // ═══════════════ FUNIL 2 · as ações da locação ═══════════════

  const criarLead = async () => {
    if (guarda() || !imobiliariaId || !novoLead) return;
    if (!nNome.trim()) { showToast('Falta o nome.', 'error'); return; }
    const im = imoveis.find((x) => x.id === novoLead.imovelId);
    if (!im) { showToast('Escolha o imóvel do interesse.', 'error'); return; }
    await addDoc(collection(db, 'locacaoLocacoes'), {
      ...LOCACAO_VAZIA, imobiliariaId, imovelId: im.id,
      nome: nNome.trim(), telefone: nTel.trim(), origem: nOrigem,
      valorAluguel: im.aluguel, valorCondominio: im.condominio,
      valorIptuMensal: im.iptuMensal, valorSeguroIncendio: im.seguroIncendio,
      taxaAdmPct: im.taxaAdmPct, criadoEm: serverTimestamp(),
    });
    setNovoLead(null); setNNome(''); setNTel(''); setNOrigem('manual');
    setFunil('locacoes'); setEtapaSel(null);
    showToast('Interessado no funil de locação.', 'success');
    recarregar();
  };

  const leadDoPortal = async () => {
    if (guarda() || !imobiliariaId) return;
    const pub = imoveis.filter((i) => i.etapa === 'publicado');
    if (!pub.length) { showToast('Nenhum imóvel publicado — o lead vem de um anúncio no ar.', 'error'); return; }
    const im = pub[Math.floor(Math.random() * pub.length)];
    const nomes = ['Marcos Vieira', 'Camila Duarte', 'Rafael Nogueira', 'Beatriz Souza', 'Tiago Melo'];
    const nome = nomes[Math.floor(Math.random() * nomes.length)];
    await addDoc(collection(db, 'locacaoLocacoes'), {
      ...LOCACAO_VAZIA, imobiliariaId, imovelId: im.id, nome,
      telefone: `(47) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      origem: 'grupo_olx', temperatura: (['alta', 'media', 'baixa'] as const)[Math.floor(Math.random() * 3)],
      mensagem: 'Vi o anúncio no ZAP e tenho interesse. Ainda está disponível?',
      valorAluguel: im.aluguel, valorCondominio: im.condominio,
      valorIptuMensal: im.iptuMensal, valorSeguroIncendio: im.seguroIncendio,
      taxaAdmPct: im.taxaAdmPct, criadoEm: serverTimestamp(),
    });
    setFunil('locacoes'); setEtapaSel(null);
    showToast(`⚡ ${nome} chegou pelo portal, interessado no ${im.codigo} — está no funil de locações.`, 'success');
    recarregar();
  };

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
      showToast('⚡ Loft aprovou! Agora ela envia a fiança pro inquilino assinar.', 'success');
    } else {
      await upLocacao(l.id, { etapa: 'perdida', motivoPerda: 'Loft recusou a garantia' });
      showToast('⚡ Loft recusou — marcado como não fechou.', 'info');
    }
  };

  const fiancaAssinada = async (l: Locacao) => {
    const v = new Date(); v.setFullYear(v.getFullYear() + 1);
    await upLocacao(l.id, {
      etapa: 'fianca_assinada', garantiaAssinadaEm: hojeYmd(),
      garantiaNumero: l.garantiaNumero || `LOFT-${Math.floor(Math.random() * 90000) + 10000}`,
      garantiaTaxaMensalPct: l.garantiaTaxaMensalPct ?? 10,
      garantiaVigenciaFim: l.garantiaVigenciaFim || v.toISOString().slice(0, 10),
      garantiaSimulada: true,
    });
    showToast('⚡ Fiança assinada com a Loft. Agora a vistoria e o nosso contrato.', 'success');
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
    const p = pendenciasLocacao({ ...l, etapa: 'fianca_assinada' });
    if (p.length) {
      showToast(`Falta: ${p[0]}`, 'error');
      abrir(l.id, p[0].toLowerCase().includes('vistoria') ? 'vistoria' : 'dados');
      return;
    }
    await upLocacao(l.id, { etapa: 'contrato_enviado', contratoEnviadoEm: hojeYmd(), contratoSimulado: true });
    showToast('⚡ Contrato + laudo no WhatsApp do dono e do inquilino (envelope único).', 'info');
  };

  const contratoAssinado = async (l: Locacao) => {
    const v = l.vistoriaEntrada;
    await upLocacao(l.id, {
      etapa: 'contrato_assinado', contratoAssinadoEm: hojeYmd(),
      ...(v ? { vistoriaEntrada: { ...v, assinada: true, assinadaSimulada: true } } : {}),
    });
    showToast('⚡ Todos assinaram. Pode marcar a entrega das chaves.', 'success');
  };

  const entregarChaves = async (l: Locacao, inicio: string) => {
    if (guarda() || !imobiliariaId) return;
    const movs = gerarMovimentos({ ...l, inicio });
    if (!movs.length) { showToast('Faltam aluguel, prazo ou dia de vencimento.', 'error'); abrir(l.id, 'dados'); return; }
    const b = writeBatch(db);
    for (const m of movs) b.set(doc(collection(db, 'locacaoMovimentos')), { ...m, imobiliariaId, criadoEm: serverTimestamp() });
    b.update(doc(db, 'locacaoLocacoes', l.id), { etapa: 'ativa', inicio, chavesEntreguesEm: hojeYmd(), atualizadoEm: serverTimestamp() });
    if (l.imovelId) b.update(doc(db, 'locacaoImoveis', l.imovelId), { etapa: 'alugado', atualizadoEm: serverTimestamp() });
    await b.commit();
    setEntregando(null); setDataEntrega('');
    showToast(`🔑 Chaves entregues! Portal do inquilino criado, o imóvel saiu dos portais e as ${movs.length} cobranças começam em ${fmtData(inicio)}.`, 'success');
    recarregar();
  };

  const perder = async (l: Locacao) => {
    const ok = await confirmDialog({
      title: 'Não fechou com esta pessoa?',
      message: `${l.nome} sai do funil. O imóvel continua publicado, recebendo outros interessados.`,
      confirmLabel: 'Não fechou',
    });
    if (!ok) return;
    await upLocacao(l.id, { etapa: 'perdida', motivoPerda: 'desistiu ou não fechou' });
    showToast('Marcado como não fechou.', 'info');
  };

  // ——— o dinheiro ———

  const pagar = async (movs: Movimento[]) => {
    if (guarda()) return;
    const m = movs.filter((x) => x.statusCobranca !== 'paga').sort((a, b) => a.competencia.localeCompare(b.competencia))[0];
    if (!m) { showToast('Tudo pago. 👏', 'info'); return; }
    await updateDoc(doc(db, 'locacaoMovimentos', m.id), { statusCobranca: 'paga', pagoEm: hojeYmd(), statusRepasse: 'liberado', simulado: true });
    showToast(`⚡ ${m.competencia.split('-').reverse().join('/')} paga. Repasse de ${fmtValor(m.repasseDono)} liberado.`, 'success');
    recarregar();
  };

  const repassar = async (movs: Movimento[]) => {
    if (guarda()) return;
    const lib = movs.filter((m) => m.statusRepasse === 'liberado');
    if (!lib.length) return;
    for (const m of lib) await updateDoc(doc(db, 'locacaoMovimentos', m.id), { statusRepasse: 'repassado', repassadoEm: hojeYmd(), simulado: true });
    showToast(`⚡ ${fmtValor(lib.reduce((s, m) => s + m.repasseDono, 0))} repassado num PIX só — NF emitida.`, 'success');
    recarregar();
  };

  const repassarTudo = async () => {
    if (guarda()) return;
    const lib = movimentos.filter((m) => m.statusRepasse === 'liberado');
    if (!lib.length) { showToast('Nada liberado.', 'info'); return; }
    const total = lib.reduce((s, m) => s + m.repasseDono, 0);
    const ok = await confirmDialog({
      title: `Repassar ${lib.length} pagamento${lib.length > 1 ? 's' : ''}?`,
      message: `${fmtValor(total)} vão pros donos, cada um num PIX com extrato discriminado.`,
      confirmLabel: 'Repassar todos',
    });
    if (!ok) return;
    for (const m of lib) await updateDoc(doc(db, 'locacaoMovimentos', m.id), { statusRepasse: 'repassado', repassadoEm: hojeYmd(), simulado: true });
    showToast(`⚡ ${fmtValor(total)} repassados em ${lib.length} PIX.`, 'success');
    recarregar();
  };

  const aplicarReajuste = async (l: Locacao, movs: Movimento[]) => {
    if (guarda()) return;
    const pct = Number(pctReajuste.replace(',', '.'));
    if (!Number.isFinite(pct) || pct <= 0) { showToast('Informe o percentual (ex.: 4,5).', 'error'); return; }
    const atual = l.valorAluguel || 0;
    const novo = calcularReajuste(atual, pct);
    const ok = await confirmDialog({
      title: 'Aplicar o reajuste?',
      message: `O aluguel passa de ${fmtValor(atual)} para ${fmtValor(novo)} (+${pct}% por ${l.indiceReajuste}). As competências já pagas não mudam; as futuras são corrigidas.`,
      confirmLabel: 'Aplicar',
    });
    if (!ok) return;
    const taxa = Math.round(novo * (l.taxaAdmPct || 0)) / 100;
    const iptu = l.valorIptuMensal || 0;
    const seguro = l.valorSeguroIncendio || 0;
    const b = writeBatch(db);
    b.update(doc(db, 'locacaoLocacoes', l.id), {
      valorAluguel: novo,
      reajustes: [...(l.reajustes || []), { em: hojeYmd(), de: atual, para: novo, indice: l.indiceReajuste, percentual: pct }],
      atualizadoEm: serverTimestamp(),
    });
    for (const m of movs) {
      if (m.statusCobranca === 'paga') continue;   // o passado não se reajusta
      b.update(doc(db, 'locacaoMovimentos', m.id), {
        valorAluguel: novo, valorTotal: novo + iptu + seguro, taxaAdm: taxa,
        repasseDono: Math.round((novo - taxa + iptu) * 100) / 100,
      });
    }
    await b.commit();
    setReajustando(null); setPctReajuste('');
    showToast(`Reajuste aplicado: ${fmtValor(atual)} → ${fmtValor(novo)}. Avise o inquilino.`, 'success');
    recarregar();
  };

  const renovarGarantia = async (l: Locacao) => {
    const base = l.garantiaVigenciaFim ? new Date(l.garantiaVigenciaFim + 'T12:00:00') : new Date();
    if (base.getTime() < Date.now()) base.setTime(Date.now());
    base.setFullYear(base.getFullYear() + 1);
    const nova = base.toISOString().slice(0, 10);
    const ok = await confirmDialog({
      title: 'Renovar a garantia por 1 ano?',
      message: `A vigência passa para ${fmtData(nova)}. Só confirme depois que a Loft renovou de fato — garantia vencida deixa o dono descoberto.`,
      confirmLabel: 'Renovar',
    });
    if (!ok) return;
    await upLocacao(l.id, { garantiaVigenciaFim: nova, garantiaSimulada: true });
    showToast(`⚡ Garantia renovada até ${fmtData(nova)}.`, 'success');
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
    locacoes.filter((l) => l.imovelId === imovelId && l.etapa !== 'encerrada' && l.etapa !== 'perdida'), [locacoes]);

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

  const numeros = useMemo(() => {
    const hoje = hojeYmd();
    return {
      publicados: imoveis.filter((i) => i.etapa === 'publicado').length,
      ativas: locacoes.filter((l) => l.etapa === 'ativa').length,
      aReceber: movimentos.filter((m) => m.statusCobranca !== 'paga' && m.competencia === hoje.slice(0, 7)).reduce((s, m) => s + m.valorTotal, 0),
      aRepassar: movimentos.filter((m) => m.statusRepasse === 'liberado').reduce((s, m) => s + m.repasseDono, 0),
      atrasadas: movimentos.filter((m) => m.statusCobranca !== 'paga' && m.vencimento < hoje).length,
    };
  }, [imoveis, locacoes, movimentos]);

  /**
   * Quantos estão esperando UMA AÇÃO NOSSA em cada funil. É o número que o
   * gestor procura ao abrir a tela: não "quantos imóveis eu tenho", e sim
   * "onde a bola está comigo".
   */
  const minhaVez = useMemo(() => {
    const hoje = hojeYmd();
    const imv = imoveis.filter((i) => ['captado', 'docs_dono', 'adm_assinada', 'material'].includes(i.etapa)).length;
    const loc = locacoes.filter((l) => {
      if (l.etapa === 'encerrada' || l.etapa === 'perdida') return false;
      if (ETAPAS_LOCACAO[l.etapa]?.comQuem === 'nós') return true;
      if (alertasDaLocacao(l).length || chamadosDe(l.id).length) return true;
      return movimentos.some((m) => m.locacaoId === l.id && m.statusCobranca !== 'paga' && m.vencimento < hoje);
    }).length;
    return { imoveis: imv, locacoes: loc };
  }, [imoveis, locacoes, movimentos, chamadosDe]);

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
    const ok = await confirmDialog({ title: 'Apagar os exemplos?', message: 'Remove só o que tem a marca de exemplo.', confirmLabel: 'Apagar', danger: true });
    if (!ok) return;
    showToast(`${await apagarDadosExemplo(imobiliariaId)} registros apagados.`, 'info');
    recarregar();
  };

  const baixarXml = () => {
    const xml = gerarFeedVrsync(imoveis, {
      nome: 'Nox Imóveis',
      email: userData?.email || 'contato@noximobiliaria.com.br',
      telefone: '',
    });
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'feed-vrsync-nox.xml'; a.click();
    URL.revokeObjectURL(a.href);
    showToast('XML gerado — valide no validador do Grupo OLX.', 'success');
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
        return (
          <span className="flex flex-wrap gap-1.5">
            <button onClick={() => abrir(i.id, 'docsDono')} className={btnOuro}>📎 Documentos do dono</button>
            {!pendenciasImovel(i).docs.length && <button onClick={() => guardarDocsDono(i)} className={btnGhost}>✓ já tenho tudo</button>}
          </span>
        );
      case 'docs_dono':
        return (
          <span className="flex flex-wrap gap-1.5">
            <button onClick={() => enviarAdm(i)} className={btnOuro}>✍ Enviar administração</button>
            <button onClick={() => abrir(i.id, 'adm')} className={btnGhost}>ver o contrato</button>
          </span>
        );
      case 'adm_enviada':
        return <button onClick={() => admAssinada(i)} className={btnSimula}>⚡ Dono assinou</button>;
      case 'adm_assinada':
      case 'material':
        return (
          <span className="flex flex-wrap gap-1.5">
            <button onClick={() => abrir(i.id, 'material')} className={btnGhost}>📸 Montar o anúncio</button>
            <button onClick={() => publicar(i)} className={btnOuro}>📣 Publicar</button>
          </span>
        );
      case 'publicado':
        return (
          <span className="flex flex-wrap gap-1.5">
            <button onClick={() => { setNovoLead({ imovelId: i.id }); setNNome(''); setNTel(''); setFunil('locacoes'); setEtapaSel(null); }} className={btnOuro}>
              + Interessado
            </button>
            <button onClick={() => upImovel(i.id, { etapa: 'pausado' })} className={btnGhost}>⏸ tirar do ar</button>
          </span>
        );
      case 'alugado':
        return <span className="text-[11.5px] text-text-secondary">alugado — acompanhe no funil das locações</span>;
      default:
        return <button onClick={() => upImovel(i.id, { etapa: 'publicado' })} className={btnOuro}>▶ Voltar ao ar</button>;
    }
  };

  const acaoLocacao = (l: Locacao): React.ReactNode => {
    const movs = movsDe(l.id);
    switch (l.etapa) {
      case 'interessado':
        return (
          <span className="flex flex-wrap gap-1.5">
            <button onClick={() => upLocacao(l.id, { etapa: 'docs_inquilino' })} className={btnOuro}>✓ Fechou — pedir documentos</button>
            <button onClick={() => perder(l)} className={btnGhost + ' !text-rose-300/70'}>não fechou</button>
          </span>
        );
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
      case 'loft_aprovou':
        return <button onClick={() => fiancaAssinada(l)} className={btnSimula}>⚡ Inquilino assinou a fiança</button>;
      case 'fianca_assinada':
        return (
          <span className="flex flex-wrap gap-1.5">
            {!l.vistoriaEntrada
              ? <button onClick={() => abrirVistoria(l)} className={btnOuro}>📋 Fazer a vistoria</button>
              : <>
                  <button onClick={() => enviarContrato(l)} className={btnOuro}>✍ Enviar contrato + laudo</button>
                  <button onClick={() => abrirVistoria(l)} className={btnGhost}>rever vistoria</button>
                </>}
          </span>
        );
      case 'contrato_enviado':
        return <button onClick={() => contratoAssinado(l)} className={btnSimula}>⚡ Todos assinaram</button>;
      case 'contrato_assinado':
        return entregando === l.id ? (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-text-secondary">contrato começa em</span>
            <input type="date" className={inputCls + ' !w-auto'} value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
            <button onClick={() => entregarChaves(l, dataEntrega || hojeYmd())} className={btnOuro}>confirmar</button>
            <button onClick={() => setEntregando(null)} className={btnGhost}>×</button>
          </span>
        ) : (
          <button onClick={() => { setEntregando(l.id); setDataEntrega(hojeYmd()); }} className={btnOuro}>🔑 Entregar as chaves</button>
        );
      case 'ativa': {
        const lib = movs.filter((m) => m.statusRepasse === 'liberado').length;
        return (
          <span className="flex flex-wrap gap-1.5">
            {lib > 0 && <button onClick={() => repassar(movs)} className={btnOuro}>💸 Repassar ({lib})</button>}
            <button onClick={() => pagar(movs)} className={btnSimula}>⚡ Pagou</button>
            <button onClick={() => upLocacao(l.id, { etapa: 'encerrando' })} className={btnGhost}>↪ saída</button>
          </span>
        );
      }
      case 'encerrando':
        return <button onClick={() => abrir(l.id, 'dados')} className={btnOuro}>↪ Concluir a saída</button>;
      default:
        // arquivada (não fechou / encerrada) — dá pra voltar, erro de clique acontece
        return (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-text-secondary">{l.motivoPerda || 'encerrada'}</span>
            <button onClick={() => upLocacao(l.id, { etapa: 'interessado', motivoPerda: '' })} className={btnGhost + ' !py-1 !text-[11px]'}>
              ↩ reabrir
            </button>
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
        return <PainelLocacao imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo}
          locacao={l} imovel={im} recarregar={recarregar} onFechar={fechar} />;
      }
      if (p === 'loft') return <PacoteLoft locacao={l} imovel={im} onFechar={fechar} />;
      if (p === 'minuta') return <MinutaContrato l={l} imovel={im} onFechar={fechar} />;
      if (p === 'laudo' && l.vistoriaEntrada) return <LaudoVistoria locacao={l} imovel={im} tipo="entrada" onFechar={fechar} />;
      if (p === 'portalDonoLoc') {
        return (
          <>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-300 mb-2">O que o DONO vê no portal dele</p>
            <VisaoDono d={portalDaLocacao(l, im, movs)} />
          </>
        );
      }
      if (p === 'portalInq') {
        return (
          <>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-300 mb-2">O que o INQUILINO vê no portal dele</p>
            <VisaoInquilino d={portalDaLocacao(l, im, movs)} />
          </>
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
            <p className="text-[10.5px] text-text-secondary mt-2">
              Cobrança = aluguel + IPTU + seguro (o condomínio o inquilino paga direto). Repasse = aluguel − taxa + IPTU, num PIX só.
            </p>
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
        <>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-300 mb-2">O que o DONO vê no portal dele</p>
          <VisaoDono d={portalDoImovel(im)} />
        </>
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
  const emAndamento = locacoes.filter((l) => l.etapa !== 'encerrada' && l.etapa !== 'perdida').length;
  const imoveisPublicaveis = imoveis.filter((i) => ['publicado', 'material', 'adm_assinada'].includes(i.etapa));

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* cabeçalho */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="gx-tag mb-2 inline-flex"><span>Setor de Locação</span></span>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Locação</h1>
            <p className="text-text-secondary text-[12.5px] mt-1 max-w-[64ch]">
              Dois caminhos: o <b className="text-white/85">imóvel</b> (com o proprietário) e a
              {' '}<b className="text-white/85">locação</b> (com o inquilino). Os botões
              {' '}<b className="text-amber-300">⚡ âmbar</b> fazem o papel de quem ainda não está integrado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setNovoImovel((v) => !v)} className={btnOuro}>+ Captar imóvel</button>
            <button onClick={leadDoPortal} className={btnSimula}>⚡ Lead do portal</button>
            {temDemo
              ? <button onClick={limpar} className={btnGhost + ' !text-rose-300'}>🧪 apagar exemplos</button>
              : <button onClick={seed} className={btnGhost}>🧪 exemplos</button>}
          </div>
        </div>

        {/* os números do mês */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { v: String(numeros.publicados), r: 'no ar nos portais', cor: 'text-white' },
            { v: String(numeros.ativas), r: 'alugados rodando', cor: 'text-white' },
            { v: fmtValor(numeros.aReceber), r: numeros.atrasadas ? `a receber · ${numeros.atrasadas} atrasada${numeros.atrasadas > 1 ? 's' : ''}` : 'a receber no mês', cor: numeros.atrasadas ? 'text-rose-300' : 'text-white' },
            { v: fmtValor(numeros.aRepassar), r: 'a repassar aos donos', cor: numeros.aRepassar ? 'text-amber-300' : 'text-text-secondary' },
          ].map((x, i) => (
            <div key={i} className="al-card px-3 py-2.5">
              <p className={`text-[19px] font-extrabold tabular-nums leading-none ${x.cor}`}>{x.v}</p>
              <p className="text-[10.5px] text-text-secondary mt-1">{x.r}</p>
            </div>
          ))}
        </div>

        {numeros.aRepassar > 0 && (
          <button onClick={repassarTudo} className={btnOuro + ' w-full !py-2.5'}>
            💸 Repassar {fmtValor(numeros.aRepassar)} aos donos — todos de uma vez
          </button>
        )}

        {/* a chave dos dois funis */}
        <div className="flex gap-2">
          {([
            ['imoveis', '🏠', 'Imóveis', imoveis.length, minhaVez.imoveis],
            ['locacoes', '🔑', 'Locações', emAndamento, minhaVez.locacoes],
          ] as const).map(([k, ic, t, q, meus]) => (
            <button key={k} onClick={() => { setFunil(k); setEtapaSel(null); fechar(); }}
              className={`flex-1 al-card p-3 text-left transition-all ${funil === k ? 'ring-1 ring-[#E8C547]/50' : 'opacity-55 hover:opacity-90'}`}>
              <p className="text-[13.5px] font-bold text-white">{ic} {t} <span className="text-[#FFE9A6] tabular-nums">{q}</span></p>
              <p className={`text-[11px] ${meus ? 'text-amber-300 font-bold' : 'text-text-secondary'}`}>
                {meus ? `${meus} esperando você` : 'nada esperando você'}
              </p>
            </button>
          ))}
        </div>

        {novoImovel && (
          <div className="al-card p-4">
            <FichaImovel imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo} imoveis={imoveis}
              imovel={null} modo="dados" recarregar={async () => { await recarregar(); setNovoImovel(false); }}
              onFechar={() => setNovoImovel(false)} />
          </div>
        )}

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
          {funil === 'imoveis'
            ? <button onClick={baixarXml} className={btnGhost} title="o arquivo que os portais leem — pra testar na homologação">⬇ XML do feed</button>
            : (
              <>
                <button onClick={() => { setNovoLead({ imovelId: '' }); setNNome(''); setNTel(''); }} className={btnOuro}>+ Interessado</button>
                <button onClick={() => setVerArquivadas((v) => !v)} className={btnGhost}>
                  {verArquivadas ? 'esconder encerradas' : 'ver encerradas'}
                </button>
              </>
            )}
        </div>

        {/* cadastrar um interessado que veio de fora dos portais */}
        {novoLead && funil === 'locacoes' && (
          <div className="al-card p-4 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
              Novo interessado — indicação, Instagram, balcão, telefone
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Campo rot="Nome" largura="sm:col-span-2"><input className={inputCls} value={nNome} onChange={(e) => setNNome(e.target.value)} autoFocus /></Campo>
              <Campo rot="WhatsApp"><input className={inputCls} value={nTel} onChange={(e) => setNTel(e.target.value)} /></Campo>
              <Campo rot="Veio de">
                <select className={inputCls} value={nOrigem} onChange={(e) => setNOrigem(e.target.value)}>
                  <option value="manual">indicação</option>
                  <option value="instagram">Instagram</option>
                  <option value="balcao">balcão / telefone</option>
                  <option value="grupo_olx">portal</option>
                </select>
              </Campo>
              <Campo rot="Interessado em qual imóvel" largura="sm:col-span-4">
                <select className={inputCls} value={novoLead.imovelId} onChange={(e) => setNovoLead({ imovelId: e.target.value })}>
                  <option value="">— escolha o imóvel —</option>
                  {imoveisPublicaveis.map((i) => (
                    <option key={i.id} value={i.id}>{i.codigo} · {i.titulo} · {fmtValor(i.aluguel)}</option>
                  ))}
                </select>
              </Campo>
            </div>
            {!imoveisPublicaveis.length && (
              <p className="text-[11.5px] text-amber-300">Nenhum imóvel disponível — capte e publique um antes.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={criarLead} className={btnOuro}>Salvar interessado</button>
              <button onClick={() => setNovoLead(null)} className={btnGhost}>cancelar</button>
            </div>
          </div>
        )}

        {/* ═══════════ FUNIL 1 · IMÓVEIS ═══════════ */}
        {funil === 'imoveis' && imoveisVisiveis.map((i) => {
          const d = ETAPAS_IMOVEL[i.etapa];
          const pend = pendenciasImovel(i);
          const zap = linkWhats(i.donoTelefone, `Olá ${(i.donoNome || '').split(' ')[0]}! Aqui é da Nox Imóveis, sobre o ${i.titulo || 'seu imóvel'}.`);
          const nossaVez = ['captado', 'docs_dono', 'adm_assinada', 'material'].includes(i.etapa);
          const temCowork = i.portais.some((c) => PORTAIS.find((x) => x.chave === c)?.via === 'cowork');
          const naFila = interessadosDe(i.id);
          return (
            <div key={i.id} className={`al-card relative overflow-hidden ${nossaVez ? 'ring-1 ring-[#E8C547]/25' : ''}`}>
              {nossaVez && <div className="absolute inset-x-0 top-0 gx-line-gold" />}
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-white">
                      <span className="text-[#E8C547]/70 mr-1.5">{i.codigo}</span>{i.titulo || '(sem nome)'}
                    </p>
                    <p className="text-[11.5px] text-text-secondary mt-0.5">
                      {[`${d?.icone} ${d?.rotulo}`, i.donoNome && `dono: ${i.donoNome}`, i.bairro,
                        i.aluguel ? `${fmtValor(i.aluguel)}/mês` : null,
                        `${i.fotos.length} fotos`].filter(Boolean).join(' · ')}
                      {i.admSimulada && <span className="ml-2"><SeloSimulacao /></span>}
                    </p>
                    {d?.oQueFalta && <p className="text-[12px] text-[#FFE9A6] mt-1">→ {d.oQueFalta}</p>}
                  </div>
                  <div className="shrink-0">{acaoImovel(i)}</div>
                </div>

                {i.etapa === 'captado' && pend.docs.length > 0 && (
                  <p className="text-[11.5px] text-amber-300 mt-2">Falta: {pend.docs.join(' · ')}</p>
                )}
                {['adm_assinada', 'material'].includes(i.etapa) && pend.material.length > 0 && (
                  <p className="text-[11.5px] text-amber-300 mt-2">Pra publicar, falta: {pend.material.join(' · ')}</p>
                )}
                {i.etapa === 'publicado' && naFila.length === 0 && (
                  <p className="text-[11.5px] text-text-secondary mt-2">
                    No ar desde {fmtData(i.publicadoEm)} · nenhum interessado ainda.
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {naFila.length > 0 && (
                    <button onClick={() => { setFunil('locacoes'); setEtapaSel(null); setBusca(i.codigo); fechar(); }}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#E8C547]/40 bg-[#E8C547]/10 text-[#FFE9A6]">
                      🔑 {naFila.length} {naFila.length > 1 ? 'na fila' : 'na fila'} →
                    </button>
                  )}
                  {zap && <a href={zap} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">💬 dono</a>}
                  <button onClick={() => abrir(i.id, 'ficha')} className={btnGhost + ' !py-1 !text-[11px]'}>🏠 dados</button>
                  <button onClick={() => abrir(i.id, 'docsDono')} className={btnGhost + ' !py-1 !text-[11px]'}>📎 documentos ({i.docsDono.length})</button>
                  <button onClick={() => abrir(i.id, 'adm')} className={btnGhost + ' !py-1 !text-[11px]'}>📜 administração</button>
                  {ETAPAS_IMOVEL[i.etapa].n >= 4 && (
                    <>
                      <button onClick={() => abrir(i.id, 'material')} className={btnGhost + ' !py-1 !text-[11px]'}>📸 anúncio</button>
                      <button onClick={() => abrir(i.id, 'portalDono')} className={btnGhost + ' !py-1 !text-[11px]'}>👁 portal do dono</button>
                    </>
                  )}
                  {temCowork && <button onClick={() => copiarCowork(i)} className={btnGhost + ' !py-1 !text-[11px]'}>📦 pacote Cowork</button>}
                  <button onClick={() => excluirImovel(i)} className={btnGhost + ' !py-1 !text-[11px] !text-rose-300/70 ml-auto'}>excluir</button>
                </div>
              </div>
              {aberto?.id === i.id && (
                <div className="border-t border-white/[0.08] bg-white/[0.02] p-4">{painelDe(i)}</div>
              )}
            </div>
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
                    {l.mensagem && l.etapa === 'interessado' && (
                      <p className="text-[11.5px] text-text-secondary mt-1 italic">&ldquo;{l.mensagem}&rdquo;</p>
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
                    {a.tipo === 'garantia' && <button onClick={() => renovarGarantia(l)} className={btnSimula + ' !py-1 !text-[10.5px] shrink-0'}>⚡ renovar 1 ano</button>}
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
                  {l.vistoriaEntrada && <button onClick={() => abrir(l.id, 'laudo')} className={btnGhost + ' !py-1 !text-[11px]'}>📋 laudo</button>}
                  {ETAPAS_LOCACAO[l.etapa].n >= 5 && <button onClick={() => abrir(l.id, 'minuta')} className={btnGhost + ' !py-1 !text-[11px]'}>📜 contrato</button>}
                  {ETAPAS_LOCACAO[l.etapa].n >= 8 && (
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
        {funil === 'locacoes' && locacoesVisiveis.length === 0 && !novoLead && (
          <div className="al-card p-10 text-center">
            <p className="text-[32px] mb-2">🔑</p>
            <p className="text-[14px] font-bold text-white">{etapaSel ? 'Nenhuma locação nesta etapa.' : 'Nenhuma locação em andamento.'}</p>
            <p className="text-[12.5px] text-text-secondary mt-1 max-w-[48ch] mx-auto">
              {etapaSel ? defEtapa(etapaSel)?.ajuda : 'As locações nascem de um interessado num imóvel publicado — dos portais ou cadastrado à mão aqui.'}
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
