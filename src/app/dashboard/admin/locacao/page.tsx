'use client';

/**
 * SETOR DE LOCAÇÃO — uma tela só: a fila de trabalho.
 *
 * As versões anteriores tinham 6 abas e o gestor precisava adivinhar em qual
 * morava o próximo passo. Morreram.
 *
 * A tela tem TRÊS DENSIDADES, porque com quarenta contratos rodando uma
 * lista plana de cartões vira treze telas de rolagem:
 *
 *   PRECISA DE VOCÊ    cartão completo, com régua e botão do próximo passo.
 *   ESPERANDO          uma linha por item — não há o que fazer, só saber.
 *   A CARTEIRA         tabela densa dos alugados, com ação em massa.
 *
 * Contrato que corre bem não é tarefa: é linha de tabela. Só sobe pra cartão
 * quando alguém precisa agir.
 *
 * A ordem da papelada (corrigida com o gestor):
 *   captar → administração do dono → anunciar → candidato fecha →
 *   documentos → Loft → VISTORIA no imóvel vazio →
 *   contrato + laudo num envelope só → chaves → cobrança e repasse
 *
 * A vistoria vem ANTES da assinatura de propósito: o imóvel está vazio, não
 * depende do inquilino, e assinar contrato e laudo no mesmo ato fecha a
 * janela em que ele já está preso ao contrato mas ainda discute o laudo.
 *
 * Nada de conta externa está contratado: onde a vida real dependeria da
 * Loft, da ClickSign ou do Asaas, existe um botão ⚡ âmbar que faz o papel
 * deles. Cada ⚡ é uma automação futura — quando ligar, o clique some.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import {
  collection, query, where, getDocs, doc, addDoc, updateDoc, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import {
  IMOVEL_VAZIO, CONTRATO_VAZIO, LEAD_VAZIO, CATEGORIAS_DOC_LEAD, AMBIENTES_PADRAO,
  alertasDoContrato, gerarMovimentos, dadosPortalDoContrato,
  hojeYmd, fmtData, fmtValor, linkWhats,
  type ImovelLocacao, type ContratoLocacao, type LeadLocacao, type MovimentoLocacao,
  type AmbienteVistoria,
} from '@/lib/locacao';
import { VisaoDono, VisaoInquilino } from '@/lib/locacaoPortalView';
import { inputCls, btnOuro, btnGhost, btnSimula, SeloSimulacao } from './ui';
import MinutaContrato from './minuta';
import FichaImovel from './imoveis';
import PainelContrato from './contratos';
import { criarDadosExemplo, apagarDadosExemplo } from './demo';
import Carteira, { type PainelCarteira } from './carteira';

/** As 8 paradas da papelada — o que o gestor lê na barrinha de cada linha. */
const PARADAS = ['Captado', 'Administração', 'Anunciado', 'Candidato', 'Análise', 'Vistoria', 'Assinatura', 'Alugado'] as const;

interface Item {
  chave: string;
  imovel?: ImovelLocacao;
  lead?: LeadLocacao;
  contrato?: ContratoLocacao;
  movs: MovimentoLocacao[];
  /** 0..7 — a parada onde este aluguel está agora */
  parada: number;
  /** o que precisa acontecer, em uma frase */
  titulo: string;
  /** urgência: 0 = precisa de você agora, 1 = esperando terceiro, 2 = rodando */
  peso: number;
  alertas: string[];
}

export default function LocacaoPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  const [imoveis, setImoveis] = useState<ImovelLocacao[]>([]);
  const [leads, setLeads] = useState<LeadLocacao[]>([]);
  const [contratos, setContratos] = useState<ContratoLocacao[]>([]);
  const [movimentos, setMovimentos] = useState<MovimentoLocacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  // o que está aberto embaixo de qual linha
  const [aberto, setAberto] = useState<{ chave: string; painel: 'ficha' | 'contrato' | 'minuta' | 'vistoria' | 'portal' | 'extrato'; visao?: 'dono' | 'inquilino' } | null>(null);
  const [novoImovel, setNovoImovel] = useState(false);
  const [candidatoDe, setCandidatoDe] = useState<string | null>(null);
  const [cNome, setCNome] = useState(''); const [cTel, setCTel] = useState(''); const [cCorretor, setCCorretor] = useState('');
  const [catDoc, setCatDoc] = useState<string>('CNH/RG');
  const [subindo, setSubindo] = useState<string | null>(null);
  const [ambientes, setAmbientes] = useState<AmbienteVistoria[]>([]);
  const [fotoDe, setFotoDe] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [soMeus, setSoMeus] = useState(false);

  const recarregar = useCallback(async () => {
    if (!imobiliariaId || isEspelhoDemo) { setCarregando(false); return; }
    try {
      const q = (col: string) => getDocs(query(collection(db, col), where('imobiliariaId', '==', imobiliariaId)));
      const [si, sl, sc, sm] = await Promise.all([
        q('locacaoImoveis'), q('locacaoLeads'), q('locacaoContratos'), q('locacaoMovimentos'),
      ]);
      setImoveis(si.docs.map((d) => ({ ...IMOVEL_VAZIO, id: d.id, imobiliariaId, ...(d.data() as Partial<ImovelLocacao>) } as ImovelLocacao)));
      setLeads(sl.docs.map((d) => ({ ...LEAD_VAZIO, id: d.id, imobiliariaId, ...(d.data() as Partial<LeadLocacao>) } as LeadLocacao)));
      setContratos(sc.docs.map((d) => ({ ...CONTRATO_VAZIO, id: d.id, imobiliariaId, ...(d.data() as Partial<ContratoLocacao>) } as ContratoLocacao)));
      setMovimentos(sm.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MovimentoLocacao, 'id'>) })));
    } catch (e) { console.error('locacao:', e); }
    setCarregando(false);
  }, [imobiliariaId, isEspelhoDemo]);
  useEffect(() => { recarregar(); }, [recarregar]);

  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };
  const fechar = () => setAberto(null);
  const abrir = (chave: string, painel: 'ficha' | 'contrato' | 'minuta' | 'vistoria' | 'portal' | 'extrato', visao?: 'dono' | 'inquilino') =>
    setAberto((a) => (a?.chave === chave && a.painel === painel && a.visao === visao ? null : { chave, painel, visao }));

  // ═══════════════ a fila ═══════════════

  const fila = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const usados = new Set<string>();

    for (const c of contratos) {
      if (c.status === 'encerrado') continue;
      if (c.leadId) usados.add(c.leadId);
      const im = imoveis.find((i) => i.id === c.imovelId);
      const movs = movimentos.filter((m) => m.contratoId === c.id);
      const alertas = alertasDoContrato(c).map((a) => (a.grave ? '🚨 ' : '⚠ ') + a.texto);
      const hoje = hojeYmd();
      const atrasadas = movs.filter((m) => m.statusCobranca !== 'paga' && m.vencimento < hoje).length;
      const aRepassar = movs.filter((m) => m.statusRepasse === 'liberado').length;
      if (atrasadas) alertas.unshift(`🚨 ${atrasadas} cobrança${atrasadas > 1 ? 's' : ''} atrasada${atrasadas > 1 ? 's' : ''} — acionar a régua e a garantia Loft`);
      if (aRepassar) alertas.unshift(`💸 ${aRepassar} repasse${aRepassar > 1 ? 's' : ''} liberado${aRepassar > 1 ? 's' : ''} pro dono`);

      const mapa: Record<string, { p: number; t: string; peso: number }> = {
        rascunho: { p: 5, t: 'Fazer a vistoria de entrada (imóvel vazio)', peso: 0 },
        vistoria_feita: { p: 6, t: 'Enviar contrato + laudo pra assinatura', peso: 0 },
        assinatura_enviada: { p: 6, t: 'Aguardando dono e inquilino assinarem', peso: 1 },
        assinado: { p: 7, t: 'Entregar as chaves e começar a cobrar', peso: 0 },
        // ativo sem pendência sai da fila e vive na carteira (tabela)
        ativo: { p: 7, t: atrasadas ? 'Cobrança atrasada' : aRepassar ? 'Repasse esperando' : 'Alugado, cobrando todo mês', peso: atrasadas || aRepassar || alertas.length ? 0 : 9 },
        encerrando: { p: 7, t: 'Saída: vistoria de saída + distrato', peso: 0 },
      };
      const m = mapa[c.status] || { p: 5, t: c.status, peso: 0 };
      if (m.peso === 9) continue;   // rodando bem: a carteira cuida dele
      out.push({ chave: `c-${c.id}`, imovel: im, contrato: c, movs, parada: m.p, titulo: m.t, peso: alertas.length ? 0 : m.peso, alertas });
    }

    for (const l of leads) {
      if (['convertido', 'perdido', 'analise_recusada'].includes(l.etapa) || usados.has(l.id)) continue;
      // quem ainda está no balcão (veio do portal e ninguém tocou) não polui a fila
      if (l.origem !== 'manual' && l.etapa === 'docs' && !(l.documentos || []).length && !l.corretorNome) continue;
      const im = imoveis.find((i) => i.id === l.imovelId);
      const mapa: Record<string, { p: number; t: string; peso: number }> = {
        docs: { p: 3, t: `Juntar documentos de ${l.nome} e mandar pra Loft`, peso: 0 },
        analise_enviada: { p: 4, t: 'Aguardando a análise da Loft', peso: 1 },
        analise_aprovada: { p: 4, t: 'Loft aprovou — gerar o contrato', peso: 0 },
      };
      const m = mapa[l.etapa] || { p: 3, t: `Candidato ${l.nome}`, peso: 0 };
      out.push({ chave: `l-${l.id}`, imovel: im, lead: l, movs: [], parada: m.p, titulo: m.t, peso: m.peso, alertas: [] });
    }

    for (const im of imoveis) {
      if (im.status === 'alugado' || im.status === 'pausado') continue;
      if (out.some((x) => x.imovel?.id === im.id)) continue;
      if (im.status === 'anunciado') {
        out.push({ chave: `i-${im.id}`, imovel: im, movs: [], parada: 2, titulo: 'Anunciado — quando alguém fechar, registre o candidato', peso: 2, alertas: [] });
      } else if (im.admStatus === 'pendente') {
        out.push({ chave: `i-${im.id}`, imovel: im, movs: [], parada: 0, titulo: 'Enviar o contrato de administração pro dono assinar', peso: 0, alertas: [] });
      } else if (im.admStatus === 'enviada') {
        out.push({ chave: `i-${im.id}`, imovel: im, movs: [], parada: 1, titulo: 'Aguardando o dono assinar a administração', peso: 1, alertas: [] });
      } else {
        out.push({ chave: `i-${im.id}`, imovel: im, movs: [], parada: 2, titulo: 'Completar a ficha e colocar no ar', peso: 0, alertas: [] });
      }
    }

    return out.sort((a, b) => a.peso - b.peso || a.parada - b.parada);
  }, [imoveis, leads, contratos, movimentos]);

  /**
   * A fila filtrada. Com trinta contratos rodando, achar "o do João" sem
   * busca é rolar a tela procurando — e ninguém opera assim.
   */
  const filaVisivel = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return fila.filter((it) => {
      if (soMeus && it.peso !== 0) return false;
      if (!b) return true;
      const campos = [
        it.imovel?.codigo, it.imovel?.titulo, it.imovel?.bairro, it.imovel?.locadorNome,
        it.contrato?.locatarioNome, it.lead?.nome, it.titulo,
      ].filter(Boolean).join(' ').toLowerCase();
      return campos.includes(b);
    });
  }, [fila, busca, soMeus]);

  const grupoAgir = useMemo(() => filaVisivel.filter((f) => f.peso === 0), [filaVisivel]);
  const grupoEsperando = useMemo(() => filaVisivel.filter((f) => f.peso === 1), [filaVisivel]);
  const grupoOutros = useMemo(() => filaVisivel.filter((f) => f.peso > 1), [filaVisivel]);

  const resumo = useMemo(() => {
    const hoje = hojeYmd();
    return {
      agir: fila.filter((f) => f.peso === 0).length,
      esperando: fila.filter((f) => f.peso === 1).length,
      alugados: contratos.filter((c) => c.status === 'ativo').length,
      aReceber: movimentos.filter((m) => m.statusCobranca !== 'paga' && m.competencia === hoje.slice(0, 7)).reduce((s, m) => s + m.valorTotal, 0),
      aRepassar: movimentos.filter((m) => m.statusRepasse === 'liberado').reduce((s, m) => s + m.repasseDono, 0),
      taxaMes: movimentos.filter((m) => m.statusCobranca === 'paga' && m.competencia === hoje.slice(0, 7)).reduce((s, m) => s + m.taxaAdm, 0),
    };
  }, [fila, contratos, movimentos]);

  // ═══════════════ ações ═══════════════

  const upImovel = async (id: string, campos: Partial<ImovelLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoImoveis', id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };
  const upLead = async (id: string, campos: Partial<LeadLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoLeads', id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };
  const upContrato = async (id: string, campos: Partial<ContratoLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoContratos', id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  const registrarCandidato = async (im: ImovelLocacao) => {
    if (guarda() || !imobiliariaId) return;
    if (!cNome.trim()) { showToast('Falta o nome.', 'error'); return; }
    await addDoc(collection(db, 'locacaoLeads'), {
      ...LEAD_VAZIO, imobiliariaId, imovelId: im.id,
      nome: cNome.trim(), telefone: cTel.trim(), corretorNome: cCorretor.trim(), criadoEm: serverTimestamp(),
    });
    setCandidatoDe(null); setCNome(''); setCTel(''); setCCorretor('');
    showToast('Candidato registrado — agora os documentos.', 'success');
    recarregar();
  };

  const anexarDoc = async (l: LeadLocacao, arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
    setSubindo(l.id);
    try {
      const novos = [...(l.documentos || [])];
      for (const a of Array.from(arquivos)) {
        const storagePath = `locacao/${imobiliariaId}/candidatos/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, storagePath), a, a.type ? { contentType: a.type } : undefined);
        await task;
        novos.push({ nome: a.name, url: await getDownloadURL(task.snapshot.ref), storagePath, categoria: catDoc });
      }
      await upLead(l.id, { documentos: novos });
      showToast('Documento guardado.', 'success');
    } catch { showToast('Falha ao subir.', 'error'); }
    setSubindo(null);
  };

  const respostaLoft = async (l: LeadLocacao, ok: boolean) => {
    if (ok) {
      const v = new Date(); v.setFullYear(v.getFullYear() + 1);
      await upLead(l.id, {
        etapa: 'analise_aprovada',
        garantia: { numero: `LOFT-${Math.floor(Math.random() * 90000) + 10000}`, taxaMensalPct: 10, vigenciaFim: v.toISOString().slice(0, 10), simulada: true },
      });
      showToast('⚡ Loft aprovou. Próximo: gerar o contrato.', 'success');
    } else {
      await upLead(l.id, { etapa: 'analise_recusada' });
      showToast('⚡ Loft recusou.', 'info');
    }
  };

  const gerarContrato = async (l: LeadLocacao, im?: ImovelLocacao) => {
    if (guarda() || !imobiliariaId) return;
    const r = await addDoc(collection(db, 'locacaoContratos'), {
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
    await upLead(l.id, { etapa: 'convertido', contratoId: r.id });
    showToast('Contrato criado com os documentos dentro. Próximo: a vistoria.', 'success');
  };

  const abrirVistoria = (c: ContratoLocacao) => {
    const ex = c.vistoriaEntrada;
    setAmbientes(ex?.ambientes?.length ? ex.ambientes : AMBIENTES_PADRAO.map((nome) => ({ nome, estado: 'bom' as const, observacao: '', fotos: [] })));
    abrir(`c-${c.id}`, 'vistoria');
  };
  const setAmb = (n: number, campos: Partial<AmbienteVistoria>) =>
    setAmbientes((p) => p.map((a, i) => (i === n ? { ...a, ...campos } : a)));
  const fotoAmbiente = async (n: number, arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
    setFotoDe(n);
    try {
      const urls: string[] = [];
      for (const a of Array.from(arquivos)) {
        const caminho = `locacao/${imobiliariaId}/vistorias/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, caminho), a, a.type ? { contentType: a.type } : undefined);
        await task;
        urls.push(await getDownloadURL(task.snapshot.ref));
      }
      setAmb(n, { fotos: [...ambientes[n].fotos, ...urls] });
    } catch { showToast('Falha na foto.', 'error'); }
    setFotoDe(null);
  };
  const salvarVistoria = async (c: ContratoLocacao) => {
    await upContrato(c.id, {
      status: 'vistoria_feita',
      vistoriaEntrada: { feitaEm: hojeYmd(), feitaPor: '', ambientes, assinada: false, assinadaSimulada: false },
    });
    fechar();
    showToast('Vistoria salva. Agora contrato + laudo vão juntos pra assinatura.', 'success');
  };

  const enviarEnvelope = async (c: ContratoLocacao) => {
    if (!c.valorAluguel || !c.inicio || !c.diaVencimento) {
      showToast('Complete o contrato antes (abra "contrato").', 'error'); return;
    }
    await upContrato(c.id, { status: 'assinatura_enviada', assinaturaEnviadaEm: hojeYmd(), assinaturaSimulada: true });
    showToast('⚡ Envelope com CONTRATO + LAUDO no WhatsApp do dono e do inquilino (a ClickSign fará de verdade).', 'info');
  };

  const todosAssinaram = async (c: ContratoLocacao) => {
    const v = c.vistoriaEntrada;
    await upContrato(c.id, {
      status: 'assinado', assinadoEm: hojeYmd(),
      ...(v ? { vistoriaEntrada: { ...v, assinada: true, assinadaSimulada: true } } : {}),
    });
    showToast('⚡ Contrato e laudo assinados no mesmo ato. Pode entregar as chaves.', 'success');
  };

  const entregarChaves = async (c: ContratoLocacao) => {
    if (guarda() || !imobiliariaId) return;
    const movs = gerarMovimentos(c);
    if (!movs.length) { showToast('Faltam início, aluguel, prazo ou vencimento — abra "contrato".', 'error'); return; }
    const b = writeBatch(db);
    for (const m of movs) b.set(doc(collection(db, 'locacaoMovimentos')), { ...m, imobiliariaId, criadoEm: serverTimestamp() });
    b.update(doc(db, 'locacaoContratos', c.id), { status: 'ativo', atualizadoEm: serverTimestamp() });
    if (c.imovelId) b.update(doc(db, 'locacaoImoveis', c.imovelId), { status: 'alugado', atualizadoEm: serverTimestamp() });
    await b.commit();
    showToast(`🔑 Chaves entregues! ${movs.length} meses de cobrança criados.`, 'success');
    recarregar();
  };

  const pagou = async (it: Item) => {
    if (guarda()) return;
    const p = [...it.movs].filter((m) => m.statusCobranca !== 'paga').sort((a, b) => a.competencia.localeCompare(b.competencia))[0];
    if (!p) { showToast('Tudo pago. 👏', 'info'); return; }
    await updateDoc(doc(db, 'locacaoMovimentos', p.id), { statusCobranca: 'paga', pagoEm: hojeYmd(), statusRepasse: 'liberado', simulado: true });
    showToast(`⚡ ${p.competencia.split('-').reverse().join('/')} paga. Repasse de ${fmtValor(p.repasseDono)} liberado.`, 'success');
    recarregar();
  };

  const repassar = async (it: Item) => {
    if (guarda()) return;
    const lib = it.movs.filter((m) => m.statusRepasse === 'liberado');
    if (!lib.length) return;
    for (const m of lib) await updateDoc(doc(db, 'locacaoMovimentos', m.id), { statusRepasse: 'repassado', repassadoEm: hojeYmd(), simulado: true });
    showToast(`⚡ ${fmtValor(lib.reduce((s, m) => s + m.repasseDono, 0))} repassado num PIX só — NF da taxa emitida.`, 'success');
    recarregar();
  };

  /**
   * O BALCÃO: interessados que chegaram dos portais e ainda não viraram
   * candidato. Hoje entram pelo botão ⚡ (fazendo o papel do webhook do
   * Grupo OLX, que já tem endpoint no ar); quando a homologação ligar, eles
   * aparecem sozinhos aqui. Um clique promove a candidato e ele entra na fila.
   */
  const balcao = useMemo(
    () => leads.filter((l) => l.origem !== 'manual' && l.etapa === 'docs' && !(l.documentos || []).length && !l.corretorNome),
    [leads]);

  const chegouDoPortal = async () => {
    if (guarda() || !imobiliariaId) return;
    const anunciados = imoveis.filter((i) => i.status === 'anunciado');
    const alvo = anunciados[Math.floor(Math.random() * anunciados.length)];
    if (!alvo) { showToast('Anuncie um imóvel primeiro — o lead vem de um anúncio.', 'error'); return; }
    const nomes = ['Marcos Vieira', 'Camila Duarte', 'Rafael Nogueira', 'Beatriz Souza', 'Tiago Melo'];
    const nome = nomes[Math.floor(Math.random() * nomes.length)];
    await addDoc(collection(db, 'locacaoLeads'), {
      ...LEAD_VAZIO, imobiliariaId, imovelId: alvo.id, nome,
      telefone: `(47) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      origem: 'grupo_olx', temperatura: (['alta', 'media', 'baixa'] as const)[Math.floor(Math.random() * 3)],
      mensagem: 'Vi o anúncio no ZAP e tenho interesse. Ainda está disponível?',
      criadoEm: serverTimestamp(),
    });
    showToast(`⚡ ${nome} chegou do portal — como o webhook fará sozinho.`, 'success');
    recarregar();
  };

  const temDemo = useMemo(() => [imoveis, leads, contratos].some((xs) => xs.some((x) => (x as { demo?: boolean }).demo)), [imoveis, leads, contratos]);
  const seed = async () => {
    if (!imobiliariaId || isEspelhoDemo) { showToast('Indisponível no modo espelho.', 'info'); return; }
    showToast(await criarDadosExemplo(imobiliariaId), 'success');
    recarregar();
  };
  const limpar = async () => {
    if (!imobiliariaId) return;
    const ok = await confirmDialog({ title: 'Apagar os dados de exemplo?', message: 'Remove só o que tem a marca de exemplo. O que for real fica.', confirmLabel: 'Apagar', danger: true });
    if (!ok) return;
    showToast(`${await apagarDadosExemplo(imobiliariaId)} registros apagados.`, 'info');
    recarregar();
  };

  /**
   * O painel aberto embaixo de qualquer linha — a fila e a carteira usam o
   * MESMO, então nada se perde por um contrato estar na tabela compacta.
   */
  const painelAberto = (it: Item): React.ReactNode => {
    if (!aberto || aberto.chave !== it.chave) return null;
    return (
      <>
            <div className="border-t border-white/[0.08] bg-white/[0.02] p-4">
              {aberto.painel === 'ficha' && it.imovel && (
                <FichaImovel imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo} imoveis={imoveis}
                  imovel={it.imovel} recarregar={recarregar} onFechar={fechar} />
              )}
              {aberto.painel === 'contrato' && it.contrato && (
                <PainelContrato imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo}
                  contrato={it.contrato} imovel={it.imovel} recarregar={recarregar} onFechar={fechar} />
              )}
              {aberto.painel === 'minuta' && it.contrato && (
                <MinutaContrato c={it.contrato} imovel={it.imovel} onFechar={fechar} />
              )}
              {aberto.painel === 'portal' && it.contrato && (
                <>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-300 mb-2">
                    O que o {aberto.visao === 'dono' ? 'DONO' : 'INQUILINO'} vê no portal
                  </p>
                  {aberto.visao === 'dono'
                    ? <VisaoDono d={dadosPortalDoContrato(it.contrato, it.imovel, it.movs)} />
                    : <VisaoInquilino d={dadosPortalDoContrato(it.contrato, it.imovel, it.movs)} />}
                </>
              )}
              {aberto.painel === 'extrato' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11.5px] border-collapse min-w-[520px]">
                    <thead><tr>{['Competência', 'Vence', 'Cobrança', 'Situação', 'Repasse', 'Repassado'].map((h) => (
                      <th key={h} className="text-left font-extrabold uppercase tracking-[0.08em] text-[9.5px] text-text-secondary border-b border-white/15 px-2 py-1.5">{h}</th>
                    ))}</tr></thead>
                    <tbody>
                      {[...it.movs].sort((a, b) => a.competencia.localeCompare(b.competencia)).map((m) => {
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
                    Cobrança = aluguel + IPTU + seguro. O condomínio o inquilino paga direto à administradora.
                    Repasse = aluguel − taxa + IPTU, num PIX só.
                  </p>
                </div>
              )}
              {aberto.painel === 'vistoria' && it.contrato && (
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
                    Vistoria de entrada — imóvel vazio, ambiente por ambiente (funciona no celular).
                    O laudo vai junto do contrato no mesmo envelope de assinatura.
                  </p>
                  {ambientes.map((a, n) => (
                    <div key={n} className="flex flex-wrap items-center gap-2 border-b border-white/[0.05] pb-2">
                      <input className={inputCls + ' !w-36'} value={a.nome} onChange={(e) => setAmb(n, { nome: e.target.value })} />
                      <select className={inputCls + ' !w-28'} value={a.estado} onChange={(e) => setAmb(n, { estado: e.target.value as AmbienteVistoria['estado'] })}>
                        <option value="otimo">Ótimo</option><option value="bom">Bom</option>
                        <option value="regular">Regular</option><option value="ruim">Ruim</option>
                      </select>
                      <input className={inputCls + ' flex-1 min-w-[140px]'} placeholder="observação" value={a.observacao} onChange={(e) => setAmb(n, { observacao: e.target.value })} />
                      <label className={btnGhost + ' cursor-pointer'}>
                        {fotoDe === n ? '…' : `📷 ${a.fotos.length}`}
                        <input type="file" accept="image/*" capture="environment" multiple className="hidden"
                          onChange={(e) => { fotoAmbiente(n, e.target.files); e.currentTarget.value = ''; }} />
                      </label>
                      <button onClick={() => setAmbientes(ambientes.filter((_, j) => j !== n))} className="text-rose-300">×</button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setAmbientes([...ambientes, { nome: '', estado: 'bom', observacao: '', fotos: [] }])} className={btnGhost}>+ ambiente</button>
                    <button onClick={() => salvarVistoria(it.contrato!)} className={btnOuro}>Salvar vistoria</button>
                    <button onClick={fechar} className={btnGhost}>cancelar</button>
                  </div>
                </div>
              )}
            </div>
      </>
    );
  };


  // ═══════════════ o botão de cada linha ═══════════════

  const acao = (it: Item): React.ReactNode => {
    const { imovel: im, lead: l, contrato: c } = it;

    if (c) {
      if (c.status === 'rascunho') return <button onClick={() => abrirVistoria(c)} className={btnOuro}>📋 Fazer a vistoria</button>;
      if (c.status === 'vistoria_feita') return <button onClick={() => enviarEnvelope(c)} className={btnOuro}>✍ Enviar contrato + laudo</button>;
      if (c.status === 'assinatura_enviada') return <button onClick={() => todosAssinaram(c)} className={btnSimula}>⚡ Assinaram</button>;
      if (c.status === 'assinado') return <button onClick={() => entregarChaves(c)} className={btnOuro}>🔑 Entregar chaves</button>;
      if (c.status === 'ativo') {
        const lib = it.movs.filter((m) => m.statusRepasse === 'liberado').length;
        return (
          <span className="flex flex-wrap gap-1.5">
            {lib > 0 && <button onClick={() => repassar(it)} className={btnOuro}>💸 Repassar ao dono</button>}
            <button onClick={() => pagou(it)} className={btnSimula}>⚡ Pagou</button>
          </span>
        );
      }
      if (c.status === 'encerrando') return <button onClick={() => abrir(it.chave, 'contrato')} className={btnOuro}>↪ Concluir saída</button>;
    }

    if (l) {
      if (l.etapa === 'analise_enviada') {
        return (
          <span className="flex flex-wrap gap-1.5">
            <button onClick={() => respostaLoft(l, true)} className={btnSimula}>⚡ Aprovou</button>
            <button onClick={() => respostaLoft(l, false)} className={btnSimula}>⚡ Recusou</button>
          </span>
        );
      }
      if (l.etapa === 'analise_aprovada') return <button onClick={() => gerarContrato(l, im)} className={btnOuro}>📄 Gerar contrato</button>;
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center">
            <select value={catDoc} onChange={(e) => setCatDoc(e.target.value)}
              className="px-2 py-2 rounded-l-xl border border-white/10 bg-white/[0.04] text-[11px] text-text-secondary focus:outline-none">
              {CATEGORIAS_DOC_LEAD.map((x) => <option key={x}>{x}</option>)}
            </select>
            <label className={btnGhost + ' cursor-pointer !rounded-l-none'}>
              {subindo === l.id ? '…' : `📎 ${(l.documentos || []).length}`}
              <input type="file" multiple className="hidden" disabled={subindo === l.id}
                onChange={(e) => { anexarDoc(l, e.target.files); e.currentTarget.value = ''; }} />
            </label>
          </span>
          <button onClick={() => upLead(l.id, { etapa: 'analise_enviada' })} className={btnOuro}>▶ Mandar pra Loft</button>
        </span>
      );
    }

    if (im) {
      if (im.status === 'rascunho' && im.admStatus === 'pendente') {
        return <button onClick={() => { if (!im.locadorNome) { showToast('Preencha o dono na ficha.', 'error'); abrir(it.chave, 'ficha'); return; } upImovel(im.id, { admStatus: 'enviada', admSimulada: true }); }} className={btnOuro}>✍ Enviar administração</button>;
      }
      if (im.status === 'rascunho' && im.admStatus === 'enviada') {
        return <button onClick={() => upImovel(im.id, { admStatus: 'assinada', admAssinadaEm: hojeYmd(), admSimulada: true })} className={btnSimula}>⚡ Dono assinou</button>;
      }
      if (im.status === 'rascunho') {
        return <button onClick={() => abrir(it.chave, 'ficha')} className={btnOuro}>📣 Completar e anunciar</button>;
      }
      // anunciado
      return candidatoDe === im.id ? (
        <span className="flex flex-wrap items-center gap-1.5">
          <input className={inputCls + ' !w-36'} placeholder="nome" value={cNome} onChange={(e) => setCNome(e.target.value)} />
          <input className={inputCls + ' !w-32'} placeholder="telefone" value={cTel} onChange={(e) => setCTel(e.target.value)} />
          <input className={inputCls + ' !w-28'} placeholder="corretor" value={cCorretor} onChange={(e) => setCCorretor(e.target.value)} />
          <button onClick={() => registrarCandidato(im)} className={btnOuro}>salvar</button>
          <button onClick={() => setCandidatoDe(null)} className={btnGhost}>×</button>
        </span>
      ) : (
        <button onClick={() => { setCandidatoDe(im.id); setCNome(''); setCTel(''); setCCorretor(''); }} className={btnOuro}>👤 Fechou! Registrar candidato</button>
      );
    }
    return null;
  };

  // ═══════════════ render ═══════════════

  if (carregando) {
    return <div className="min-h-screen py-8 px-4"><div className="max-w-5xl mx-auto al-card p-8 text-center text-sm text-text-secondary">Carregando…</div></div>;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* cabeçalho + os números do mês */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="gx-tag mb-2 inline-flex"><span>Setor de Locação</span></span>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Locação</h1>
            <p className="text-text-secondary text-[12.5px] mt-1 max-w-[64ch]">
              A papelada de cada aluguel, em ordem de urgência. Atendimento e visitas de venda são dos
              corretores; aqui é o cartório. Os <b className="text-amber-300">⚡</b> fazem o papel de quem
              ainda não está integrado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setNovoImovel((v) => !v)} className={btnOuro}>+ Captar imóvel</button>
            <button onClick={chegouDoPortal} className={btnSimula}>⚡ Chegou lead do portal</button>
            {temDemo
              ? <button onClick={limpar} className={btnGhost + ' !text-rose-300'}>🧪 apagar exemplos</button>
              : <button onClick={seed} className={btnGhost}>🧪 dados de exemplo</button>}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { v: String(resumo.agir), r: 'esperando você', cor: resumo.agir ? 'text-[#FFE9A6]' : 'text-emerald-300' },
            { v: String(resumo.alugados), r: 'alugados rodando', cor: 'text-white' },
            { v: fmtValor(resumo.aReceber), r: 'a receber no mês', cor: 'text-white' },
            { v: fmtValor(resumo.aRepassar), r: 'a repassar aos donos', cor: resumo.aRepassar ? 'text-amber-300' : 'text-text-secondary' },
          ].map((x, i) => (
            <div key={i} className="al-card px-3 py-2.5">
              <p className={`text-[19px] font-extrabold tabular-nums leading-none ${x.cor}`}>{x.v}</p>
              <p className="text-[10.5px] text-text-secondary mt-1">{x.r}</p>
            </div>
          ))}
        </div>

        {novoImovel && (
          <div className="al-card p-4">
            <FichaImovel imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo} imoveis={imoveis}
              imovel={null} recarregar={async () => { await recarregar(); setNovoImovel(false); }}
              onFechar={() => setNovoImovel(false)} />
          </div>
        )}

        {/* achar rápido — com carteira grande, é isto que salva o dia */}
        {fila.length > 3 && (
          <div className="flex flex-wrap items-center gap-2">
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="buscar por imóvel, código, bairro, dono ou inquilino…"
              className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40" />
            <button onClick={() => setSoMeus((v) => !v)} className={soMeus ? btnOuro : btnGhost}>
              {soMeus ? '✓ só o que espera por mim' : 'só o que espera por mim'}
            </button>
            {(busca || soMeus) && (
              <span className="text-[11.5px] text-text-secondary">{filaVisivel.length} de {fila.length}</span>
            )}
          </div>
        )}

        {/* o balcão dos portais */}
        {balcao.length > 0 && (
          <div className="al-card p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-300 mb-2">
              📨 Chegaram dos portais — {balcao.length} pessoa{balcao.length > 1 ? 's' : ''} perguntando
            </p>
            <div className="space-y-2">
              {balcao.map((l) => {
                const im = imoveis.find((i) => i.id === l.imovelId);
                return (
                  <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-white/[0.05] last:border-0 pb-2 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-white">
                        {l.nome}
                        {l.temperatura && <span className={`ml-2 text-[11px] ${l.temperatura === 'alta' ? 'text-rose-300' : l.temperatura === 'media' ? 'text-amber-300' : 'text-sky-300'}`}>
                          {l.temperatura === 'alta' ? '🔥' : l.temperatura === 'media' ? '🌤' : '❄'} {l.temperatura}
                        </span>}
                      </p>
                      <p className="text-[11.5px] text-text-secondary">
                        {[l.telefone, im?.codigo, l.origem !== 'manual' && `via ${l.origem.replace('_', ' ')}`].filter(Boolean).join(' · ')}
                        {l.mensagem && ` — "${l.mensagem}"`}
                      </p>
                    </div>
                    <button onClick={() => upLead(l.id, { corretorNome: 'a definir' })} className={btnOuro + ' !py-1.5 !text-[11.5px]'}>
                      ✓ Fechou — virar candidato
                    </button>
                    <button onClick={() => upLead(l.id, { etapa: 'perdido', perdidoMotivo: 'não fechou' })} className={btnGhost + ' !py-1.5 !text-[11px]'}>
                      descartar
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[10.5px] text-text-secondary mt-2">
              O atendimento (responder, mostrar o imóvel) é dos corretores. Aqui só marca quem FECHOU — aí
              entra na papelada.
            </p>
          </div>
        )}

        {/* a fila */}
        {fila.length === 0 && !novoImovel && balcao.length === 0 && (
          <div className="al-card p-10 text-center">
            <p className="text-[32px] mb-2">🗂️</p>
            <p className="text-[14px] font-bold text-white">Nada na fila.</p>
            <p className="text-[12.5px] text-text-secondary mt-1 max-w-[46ch] mx-auto">
              Capte um imóvel pra começar — ou clique em <b className="text-white/85">dados de exemplo</b> pra
              ver a papelada inteira funcionando.
            </p>
          </div>
        )}

        {/* ——— O QUE PRECISA DE VOCÊ: cartão completo ——— */}
        {grupoAgir.length > 0 && (
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#FFE9A6] pt-1">
            Precisa de você · {grupoAgir.length}
          </h2>
        )}
        {grupoAgir.map((it) => {
          const eu = it.peso === 0;
          const estaAberto = aberto?.chave === it.chave;
          return (
            <div key={it.chave} className={`al-card relative overflow-hidden ${eu ? 'ring-1 ring-[#E8C547]/30' : ''}`}>
              {eu && <div className="absolute inset-x-0 top-0 gx-line-gold" />}
              <div className="p-4">

                {/* linha 1: o que fazer + o botão */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-[14.5px] font-bold ${eu ? 'text-white' : 'text-white/70'}`}>{it.titulo}</p>
                    <p className="text-[11.5px] text-text-secondary mt-0.5">
                      {it.imovel ? `${it.imovel.codigo} · ${it.imovel.titulo}` : 'imóvel removido'}
                      {(it.contrato?.locatarioNome || it.lead?.nome) && ` · ${it.contrato?.locatarioNome || it.lead?.nome}`}
                      {it.imovel?.locadorNome && ` · dono: ${it.imovel.locadorNome}`}
                      {(it.contrato?.valorAluguel || it.imovel?.aluguel) ? ` · ${fmtValor(it.contrato?.valorAluguel || it.imovel?.aluguel)}/mês` : ''}
                    </p>
                  </div>
                  <div className="shrink-0">{acao(it)}</div>
                </div>

                {/* linha 2: onde está */}
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mt-2.5">
                  {PARADAS.map((p, i) => (
                    <React.Fragment key={p}>
                      {i > 0 && <span className={`w-2.5 h-px ${i <= it.parada ? 'bg-[#E8C547]/40' : 'bg-white/10'}`} />}
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                        i === it.parada ? 'bg-[#E8C547]/15 text-[#FFE9A6] border border-[#E8C547]/40'
                          : i < it.parada ? 'text-emerald-300/70' : 'text-white/25'}`}>
                        {i < it.parada ? '✓' : i === it.parada ? '●' : '○'} {p}
                      </span>
                    </React.Fragment>
                  ))}
                  {(it.contrato?.assinaturaSimulada || it.contrato?.garantiaSimulada || it.lead?.garantia?.simulada || it.imovel?.admSimulada) && (
                    <span className="ml-1"><SeloSimulacao /></span>
                  )}
                </div>

                {/* linha 3: alertas */}
                {it.alertas.map((a, i) => (
                  <p key={i} className={`text-[11.5px] font-bold mt-2 rounded-lg px-3 py-1.5 ${
                    a.startsWith('🚨') ? 'text-rose-300 bg-rose-500/10 border border-rose-500/30'
                      : a.startsWith('💸') ? 'text-amber-300 bg-amber-500/10 border border-amber-500/25'
                        : 'text-amber-300 bg-amber-500/[0.07] border border-amber-500/20'}`}>{a}</p>
                ))}

                {/* linha 4: falar com as pessoas + consultar */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {(() => {
                    const alvos: { rot: string; tel: string; msg: string }[] = [];
                    const im = it.imovel;
                    const c = it.contrato;
                    const l = it.lead;
                    if (im?.locadorTelefone) {
                      alvos.push({
                        rot: '💬 dono', tel: im.locadorTelefone,
                        msg: im.admStatus === 'pendente'
                          ? `Olá ${im.locadorNome.split(' ')[0]}! Aqui é da Nox Imóveis. Vou te enviar o contrato de administração do ${im.titulo} pra assinatura.`
                          : `Olá ${im.locadorNome.split(' ')[0]}! Aqui é da Nox Imóveis, sobre o ${im.titulo}.`,
                      });
                    }
                    const telInq = c?.locatarioTelefone || l?.telefone;
                    const nomeInq = c?.locatarioNome || l?.nome;
                    if (telInq && nomeInq) {
                      alvos.push({
                        rot: '💬 inquilino', tel: telInq,
                        msg: l && !c
                          ? `Olá ${nomeInq.split(' ')[0]}! Aqui é da Nox Imóveis. Pra seguir com a locação, preciso da sua CNH/RG, CPF e comprovante de renda.`
                          : `Olá ${nomeInq.split(' ')[0]}! Aqui é da Nox Imóveis, sobre o seu aluguel.`,
                      });
                    }
                    return alvos.map((a) => {
                      const href = linkWhats(a.tel, a.msg);
                      return href ? (
                        <a key={a.rot} href={href} target="_blank" rel="noreferrer"
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300 hover:bg-emerald-500/15 transition-colors">
                          {a.rot}
                        </a>
                      ) : null;
                    });
                  })()}
                  {it.imovel && <button onClick={() => abrir(it.chave, 'ficha')} className={btnGhost + ' !py-1 !text-[11px]'}>🏠 ficha do imóvel</button>}
                  {it.contrato && <button onClick={() => abrir(it.chave, 'contrato')} className={btnGhost + ' !py-1 !text-[11px]'}>📄 dados do contrato</button>}
                  {it.contrato && <button onClick={() => abrir(it.chave, 'minuta')} className={btnGhost + ' !py-1 !text-[11px]'}>📜 ver o contrato</button>}
                  {it.contrato?.status === 'ativo' && (
                    <>
                      <button onClick={() => abrir(it.chave, 'extrato')} className={btnGhost + ' !py-1 !text-[11px]'}>💰 extrato</button>
                      <button onClick={() => abrir(it.chave, 'portal', 'dono')} className={btnGhost + ' !py-1 !text-[11px]'}>👁 portal do dono</button>
                      <button onClick={() => abrir(it.chave, 'portal', 'inquilino')} className={btnGhost + ' !py-1 !text-[11px]'}>👁 portal do inquilino</button>
                    </>
                  )}
                  {it.lead && (it.lead.documentos || []).map((d, j) => (
                    <a key={j} href={d.url} target="_blank" rel="noreferrer" className={btnGhost + ' !py-1 !text-[11px]'}>
                      <b className="text-[#FFE9A6]/80">{d.categoria}</b> {d.nome.slice(0, 18)}
                    </a>
                  ))}
                </div>
              </div>

              {painelAberto(it)}            </div>
          );
        })}

        {/* ——— ESPERANDO TERCEIROS: uma linha, sem botão ——— */}
        {grupoEsperando.length > 0 && (
          <>
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-secondary pt-2">
              Esperando terceiros · {grupoEsperando.length}
            </h2>
            <div className="al-card divide-y divide-white/[0.06]">
              {grupoEsperando.map((it) => {
                const nome = it.contrato?.locatarioNome || it.lead?.nome || it.imovel?.locadorNome;
                const tel = it.contrato?.locatarioTelefone || it.lead?.telefone || it.imovel?.locadorTelefone || '';
                const zap = linkWhats(tel, `Olá${nome ? ' ' + nome.split(' ')[0] : ''}! Aqui é da Nox Imóveis.`);
                return (
                  <div key={it.chave} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                    <span className="text-[12.5px] text-white/85 min-w-0 flex-1">
                      <b className="text-white">{it.imovel?.codigo}</b> {nome ? `· ${nome}` : ''} — {it.titulo.toLowerCase()}
                    </span>
                    {zap && <a href={zap} target="_blank" rel="noreferrer"
                      className="px-2 py-1 rounded-lg text-[10.5px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">💬 cobrar</a>}
                    {it.contrato && <button onClick={() => abrir(it.chave, 'contrato')} className={btnGhost + ' !py-1 !text-[10.5px]'}>abrir</button>}
                    {it.lead && !it.contrato && <button onClick={() => abrir(it.chave, 'ficha')} className={btnGhost + ' !py-1 !text-[10.5px]'}>imóvel</button>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ——— ANUNCIADOS SEM CANDIDATO: linha compacta ——— */}
        {grupoOutros.length > 0 && (
          <>
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-secondary pt-2">
              No ar, sem candidato · {grupoOutros.length}
            </h2>
            <div className="al-card divide-y divide-white/[0.06]">
              {grupoOutros.map((it) => (
                <div key={it.chave} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                  <span className="text-[12.5px] text-white/85 min-w-0 flex-1">
                    <b className="text-white">{it.imovel?.codigo}</b> · {it.imovel?.titulo}
                    <span className="text-text-secondary"> — {fmtValor(it.imovel?.aluguel)}/mês</span>
                  </span>
                  <div className="shrink-0">{acao(it)}</div>
                  <button onClick={() => abrir(it.chave, 'ficha')} className={btnGhost + ' !py-1 !text-[10.5px]'}>ficha</button>
                </div>
              ))}
            </div>
            {grupoOutros.some((it) => aberto?.chave === it.chave) && (
              <div className="al-card p-4">{painelAberto(grupoOutros.find((it) => aberto?.chave === it.chave)!)}</div>
            )}
          </>
        )}

        {/* ——— A CARTEIRA: os alugados, em tabela ——— */}
        <Carteira isEspelhoDemo={isEspelhoDemo} contratos={contratos} imoveis={imoveis}
          movimentos={movimentos} recarregar={recarregar}
          abertoEm={aberto && aberto.chave.startsWith('c-') ? { id: aberto.chave.slice(2), painel: aberto.painel as PainelCarteira } : null}
          onAbrir={(id, painel) => abrir(`c-${id}`, painel === 'portalDono' ? 'portal' : painel === 'portalInquilino' ? 'portal' : painel,
            painel === 'portalDono' ? 'dono' : painel === 'portalInquilino' ? 'inquilino' : undefined)}
          renderPainel={(id) => {
            const c = contratos.find((x) => x.id === id);
            if (!c) return null;
            const it: Item = { chave: `c-${id}`, imovel: imoveis.find((i) => i.id === c.imovelId), contrato: c,
              movs: movimentos.filter((m) => m.contratoId === id), parada: 7, titulo: '', peso: 2, alertas: [] };
            return painelAberto(it);
          }} />

        {fila.length > 0 && filaVisivel.length === 0 && (
          <div className="al-card p-6 text-center text-[13px] text-text-secondary">
            Nada com esse filtro. <button onClick={() => { setBusca(''); setSoMeus(false); }} className="text-[#E8C547] font-bold">limpar</button>
          </div>
        )}

        {/* o rodapé honesto: o que ainda não está ligado */}
        <div className="al-card p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-300 mb-1.5">O que ainda é ⚡ simulação</p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[11.5px] text-text-secondary">
            {[
              ['ClickSign', 'assinar administração, contrato + laudo e distrato pelo WhatsApp'],
              ['Loft', 'aprovar o candidato e devolver o número da garantia'],
              ['Asaas', 'emitir boleto/PIX, avisar o pagamento e repassar ao dono'],
              ['Portais', 'publicar os anúncios pelo feed (a URL já está no ar)'],
            ].map(([n, o]) => (
              <p key={n}><b className="text-white/80">{n}</b> — {o}</p>
            ))}
          </div>
          <p className="text-[11px] text-text-secondary mt-2">
            Cada um desses vira um clique a menos quando a conta for criada. Até lá, os botões ⚡ fazem o papel deles.
          </p>
        </div>
      </div>
    </div>
  );
}
