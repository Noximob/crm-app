"use client";

/**
 * FUNIL & CADÊNCIAS — a régua da casa.
 *
 * Quatro coisas moram aqui:
 *   1. O FUNIL de 6 fases: quantos estão em cada fase agora (casa × rede),
 *      quantos CHEGARAM em cada fase e a conversão realizada × esperada.
 *   2. A CONVERSÃO ESPERADA: os percentuais que o gestor trouxe (87 / 8 / 90 /
 *      50 / 35 / 30), editáveis — é a régua contra a qual o time é lido.
 *   3. As CADÊNCIAS: os relógios que cobram o corretor (inalteradas).
 *   4. As ferramentas de arrumação: migrar etapas antigas pro circuito e
 *      carimbar a carteira (casa × rede) nos leads que nasceram sem o campo.
 *
 * O circuito por baixo continua com 8 casas (meet e visita separados, pra os
 * relatórios); as 6 fases são a leitura por cima — src/lib/funilVendas.ts.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';
import { getDemoLeads } from '@/lib/espelho/demoData';
import {
  ETAPA_DESCARTADO,
  ETAPAS_TODAS,
  CADENCIAS_PADRAO,
  MOTIVOS_DESCARTE,
  carregarCadencias,
  mapEtapaCircuito,
  normalizarCadencias,
  salvarCadencias,
  type CadenciasFunil,
} from '@/lib/circuito';
import {
  FASES, CONVERSAO_PADRAO, normalizarConversao, esperadoAcumulado, funilRealizado,
  carteiraDoLead, leadGuardado, CARTEIRA_REDE, CAP_INTERESSE_FUTURO,
  type ConversaoEsperada, type FaseChave,
} from '@/lib/funilVendas';
import { carregarConversaoEsperada, salvarConversaoEsperada } from '@/lib/funilVendasConfig';

const setEtapasValidas = new Set<string>(ETAPAS_TODAS);

// ---------------------------------------------------------------------------
// Cadências — campos, rótulos e limites (limites iguais aos de normalizarCadencias)
// ---------------------------------------------------------------------------
interface CampoCadencia {
  key: keyof CadenciasFunil;
  titulo: string;
  unidade: string;
  ajuda: string;
  min: number;
  max: number;
}

// "Não atendeu" NÃO tem relógio próprio: o corretor agenda a próxima tentativa
// na hora, e se o horário passar a tarefa fica atrasada e cobra sozinha.
const CAMPOS_CADENCIA: CampoCadencia[] = [
  {
    key: 'perguntarMeetHoras',
    titulo: 'Cobrar o resultado do meet',
    unidade: 'horas depois',
    ajuda: 'Passou o horário do meet + X horas → o sistema abre o pop-up perguntando "aconteceu?". Exemplo com 1: meet marcado pras 15h → às 16h o corretor é cobrado pela resposta (aconteceu / não rolou). Com 0, cobra na hora exata.',
    min: 0,
    max: 72,
  },
  {
    key: 'perguntarVisitaHoras',
    titulo: 'Cobrar o resultado da visita',
    unidade: 'horas depois',
    ajuda: 'Igual ao meet, mas pra visita: X horas depois do horário marcado, o pop-up cobra "a visita aconteceu?". Exemplo com 1: visita às 14h → cobrança às 15h.',
    min: 0,
    max: 72,
  },
  {
    key: 'negociacaoAlertaDias',
    titulo: 'Negociação parada — alerta',
    unidade: 'dias',
    ajuda: 'Proposta na mesa sem NENHUM movimento por X dias → o lead aparece como "parado em negociação" (relatórios e cobrança do corretor). Exemplo com 5: proposta apresentada segunda, nada até sábado → alerta aceso.',
    min: 1,
    max: 90,
  },
  {
    key: 'tentativasAteDescarte',
    titulo: 'Insistir quantas vezes antes de sugerir descarte',
    unidade: 'tentativas',
    ajuda: 'É o tamanho do rodízio de insistência: a cada "não atendeu" conta 1 tentativa. Na tentativa X sem resposta, o pop-up passa a sugerir o descarte (o corretor ainda pode insistir; descartou → o lead cai no bolsão do administrador). Exemplo com 5: sugere descarte na 5ª ligação sem resposta.',
    min: 2,
    max: 30,
  },
];

type CadenciasStr = Record<keyof CadenciasFunil, string>;

const cadToStr = (c: CadenciasFunil): CadenciasStr => ({
  naoAtendeuHoras: String(c.naoAtendeuHoras),
  perguntarMeetHoras: String(c.perguntarMeetHoras),
  perguntarVisitaHoras: String(c.perguntarVisitaHoras),
  negociacaoAlertaDias: String(c.negociacaoAlertaDias),
  tentativasAteDescarte: String(c.tentativasAteDescarte),
});

type ConvStr = Record<FaseChave, string>;
const convToStr = (c: ConversaoEsperada): ConvStr => ({
  entrada: String(c.entrada), contato: String(c.contato), agendado: String(c.agendado),
  visita_feita: String(c.visita_feita), negociacao: String(c.negociacao), fechamento: String(c.fechamento),
});
/** O que cada percentual significa — a frase que o gestor lê ao lado do campo. */
const EXPLICA_CONV: Record<FaseChave, string> = {
  entrada: 'dos leads que entram, quantos recebem ao menos uma tentativa de contato',
  contato: 'dos acionados, quantos viram conversa de verdade (atenderam / responderam)',
  agendado: 'das conversas, quantas viram meet ou visita marcados',
  visita_feita: 'dos agendados, quantos de fato visitam o imóvel',
  negociacao: 'das visitas feitas, quantas viram proposta',
  fechamento: 'das propostas, quantas fecham',
};

// ---------------------------------------------------------------------------
// O lead, com o que o funil precisa
// ---------------------------------------------------------------------------
interface LeadFunilAdmin {
  id: string;
  etapa: string;
  etapasHist?: { para?: string }[];
  circuito?: { tentativas?: number; contatosFeitos?: number; primeiroContatoEm?: unknown };
  carteira?: string;
  origemTipo?: string;
  guardado?: boolean;
  /** o campo `carteira` já está gravado no doc? (senão a carteira é deduzida da origem) */
  temCarteira: boolean;
}

// Modo Espelho — leads demo (circuito) + alguns em etapas legadas pra mostrar a migração
const buildDemoLeads = (): LeadFunilAdmin[] => {
  const doCircuito: LeadFunilAdmin[] = getDemoLeads().map((l) => ({
    id: l.id, etapa: l.etapa, circuito: l.circuito,
    carteira: l.carteira, origemTipo: l.origemTipo, guardado: l.guardado, temCarteira: !!l.carteira,
  }));
  const legadas = [
    ...Array(6).fill('Qualificado'),
    ...Array(4).fill('Apresentação do imóvel'),
    ...Array(3).fill('Pré Qualificação'),
    ...Array(2).fill('Pós Venda'),
  ] as string[];
  const legados: LeadFunilAdmin[] = legadas.map((etapa, i) => ({ id: `demo-legado-${i + 1}`, etapa, temCarteira: false }));
  return [...doCircuito, ...legados];
};

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function FunilCadenciasPage() {
  const { userData, loading: authLoading, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  // Leads (uma varredura serve pro funil, pras carteiras e pra migração)
  const [leads, setLeads] = useState<LeadFunilAdmin[]>([]);
  const [leadsCarregados, setLeadsCarregados] = useState(false);

  // Conversão esperada
  const [convStr, setConvStr] = useState<ConvStr>(convToStr(CONVERSAO_PADRAO));
  const [convSalva, setConvSalva] = useState<ConversaoEsperada>(CONVERSAO_PADRAO);
  const [convCarregada, setConvCarregada] = useState(false);
  const [salvandoConv, setSalvandoConv] = useState(false);

  // Cadências
  const [cadStr, setCadStr] = useState<CadenciasStr>(cadToStr(CADENCIAS_PADRAO));
  const [cadSalva, setCadSalva] = useState<CadenciasFunil>(CADENCIAS_PADRAO);
  const [cadCarregada, setCadCarregada] = useState(false);
  const [salvandoCad, setSalvandoCad] = useState(false);

  // Migração / carimbo de carteira
  const [migrando, setMigrando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [carimbando, setCarimbando] = useState(false);

  // ------------------------------------------------------------------
  // Varredura dos leads da imobiliária (agrupamento no cliente)
  // ------------------------------------------------------------------
  const scanLeads = useCallback(async () => {
    if (isEspelhoDemo) {
      setLeads(buildDemoLeads());
      setLeadsCarregados(true);
      return;
    }
    if (!imobiliariaId) return;
    try {
      const snap = await getDocs(query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId)));
      setLeads(snap.docs.map((d) => {
        const x = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          etapa: (x.etapa as string) || '',
          etapasHist: Array.isArray(x.etapasHist) ? (x.etapasHist as { para?: string }[]) : undefined,
          circuito: (x.circuito as LeadFunilAdmin['circuito']) || undefined,
          carteira: typeof x.carteira === 'string' ? x.carteira : undefined,
          origemTipo: typeof x.origemTipo === 'string' ? x.origemTipo : undefined,
          guardado: x.guardado === true,
          temCarteira: typeof x.carteira === 'string',
        };
      }));
    } catch (e) {
      console.error('Erro ao varrer leads do funil:', e);
      showToast('Não foi possível carregar os leads — recarregue a página.', 'error');
    } finally {
      setLeadsCarregados(true);
    }
  }, [imobiliariaId, isEspelhoDemo]);

  useEffect(() => {
    scanLeads();
  }, [scanLeads]);

  // ------------------------------------------------------------------
  // Conversão esperada + cadências: carregar (no Espelho resolve o padrão)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!imobiliariaId && !isEspelhoDemo) return;
    let ativo = true;
    const id = isEspelhoDemo ? 'espelho-demo' : imobiliariaId;
    carregarConversaoEsperada(id).then((c) => {
      if (!ativo) return;
      setConvSalva(c);
      setConvStr(convToStr(c));
      setConvCarregada(true);
    });
    carregarCadencias(id).then((c) => {
      if (!ativo) return;
      setCadSalva(c);
      setCadStr(cadToStr(c));
      setCadCarregada(true);
    });
    return () => { ativo = false; };
  }, [imobiliariaId, isEspelhoDemo]);

  const guardaDemo = (): boolean => {
    if (isEspelhoDemo) {
      showToast('Modo demonstração: as alterações não são salvas.', 'info');
      return true;
    }
    return false;
  };

  // ------------------------------------------------------------------
  // Conversão esperada: salvar / restaurar
  // ------------------------------------------------------------------
  const convSuja = useMemo(
    () => FASES.some((f) => convStr[f.chave].trim() !== String(convSalva[f.chave])),
    [convStr, convSalva],
  );
  const handleSalvarConv = async () => {
    if (guardaDemo()) return;
    if (!imobiliariaId) return;
    const proxima = normalizarConversao({
      entrada: Number(convStr.entrada), contato: Number(convStr.contato), agendado: Number(convStr.agendado),
      visita_feita: Number(convStr.visita_feita), negociacao: Number(convStr.negociacao), fechamento: Number(convStr.fechamento),
    });
    setSalvandoConv(true);
    try {
      await salvarConversaoEsperada(imobiliariaId, proxima);
      setConvSalva(proxima);
      setConvStr(convToStr(proxima));
      showToast('Conversão esperada salva — é a régua nova do funil.', 'success');
    } catch (e) {
      console.error('Erro ao salvar conversão esperada:', e);
      showToast('Não foi possível salvar — tente de novo.', 'error');
    } finally {
      setSalvandoConv(false);
    }
  };

  // ------------------------------------------------------------------
  // Cadências: salvar / restaurar (inalterado)
  // ------------------------------------------------------------------
  const cadenciasSujas = useMemo(
    () => CAMPOS_CADENCIA.some((c) => cadStr[c.key].trim() !== String(cadSalva[c.key])),
    [cadStr, cadSalva]
  );

  const handleSalvarCadencias = async () => {
    if (guardaDemo()) return;
    if (!imobiliariaId) return;
    const proximas = normalizarCadencias({
      naoAtendeuHoras: Number(cadStr.naoAtendeuHoras),
      perguntarMeetHoras: Number(cadStr.perguntarMeetHoras),
      perguntarVisitaHoras: Number(cadStr.perguntarVisitaHoras),
      negociacaoAlertaDias: Number(cadStr.negociacaoAlertaDias),
      tentativasAteDescarte: Number(cadStr.tentativasAteDescarte),
    });
    setSalvandoCad(true);
    try {
      await salvarCadencias(imobiliariaId, proximas);
      setCadSalva(proximas);
      setCadStr(cadToStr(proximas));
      showToast('Cadências salvas — já valem no circuito de todos os corretores.', 'success');
    } catch (e) {
      console.error('Erro ao salvar cadências:', e);
      showToast('Não foi possível salvar — tente de novo.', 'error');
    } finally {
      setSalvandoCad(false);
    }
  };

  const handleRestaurarPadrao = () => {
    setCadStr(cadToStr(CADENCIAS_PADRAO));
  };

  // ------------------------------------------------------------------
  // O funil: agora (por carteira) e realizado × esperado
  // ------------------------------------------------------------------
  const vivos = useMemo(() => leads.filter((l) => mapEtapaCircuito(l.etapa) !== ETAPA_DESCARTADO), [leads]);
  const descartados = leads.length - vivos.length;
  const daCasa = useMemo(() => vivos.filter((l) => carteiraDoLead(l) !== CARTEIRA_REDE && !leadGuardado(l)), [vivos]);
  const daRede = useMemo(() => vivos.filter((l) => carteiraDoLead(l) === CARTEIRA_REDE), [vivos]);
  const guardados = useMemo(() => vivos.filter((l) => leadGuardado(l)).length, [vivos]);

  const realizadoCasa = useMemo(() => funilRealizado(daCasa, mapEtapaCircuito, convSalva), [daCasa, convSalva]);
  const realizadoRede = useMemo(() => funilRealizado(daRede, mapEtapaCircuito, convSalva), [daRede, convSalva]);
  const acumulado = useMemo(() => esperadoAcumulado(convSalva, 100), [convSalva]);

  // ------------------------------------------------------------------
  // Migração: leads em etapas fora do circuito (inalterado)
  // ------------------------------------------------------------------
  const legados = useMemo(() => leads.filter((l) => !setEtapasValidas.has(l.etapa)), [leads]);

  const previewMigracao = useMemo(() => {
    const grupos = new Map<string, { de: string; para: string; total: number }>();
    legados.forEach((l) => {
      const cur = grupos.get(l.etapa) || { de: l.etapa, para: mapEtapaCircuito(l.etapa), total: 0 };
      cur.total += 1;
      grupos.set(l.etapa, cur);
    });
    return Array.from(grupos.values()).sort((a, b) => b.total - a.total);
  }, [legados]);

  const handleMigrar = async () => {
    if (guardaDemo()) return;
    if (!imobiliariaId || legados.length === 0) return;
    const ok = await confirmDialog({
      title: 'Migrar leads para o circuito',
      message: `${legados.length} lead${legados.length !== 1 ? 's' : ''} em etapas antigas serão movidos para as etapas do circuito, conforme a tabela. Essa ação atualiza os leads de todos os corretores e não desfaz sozinha.`,
      confirmLabel: 'Migrar agora',
    });
    if (!ok) return;
    setMigrando(true);
    setProgresso(0);
    try {
      for (let i = 0; i < legados.length; i += 400) {
        const fatia = legados.slice(i, i + 400);
        const batch = writeBatch(db);
        fatia.forEach((l) => {
          batch.update(doc(db, 'leads', l.id), { etapa: mapEtapaCircuito(l.etapa) });
        });
        await batch.commit();
        setProgresso(Math.min(i + fatia.length, legados.length));
      }
      showToast(`${legados.length} lead${legados.length !== 1 ? 's' : ''} migrados para o circuito.`, 'success');
      await scanLeads();
    } catch (e) {
      console.error('Erro ao migrar leads:', e);
      showToast('A migração falhou no meio — recarregue e rode de novo (o que já migrou fica migrado).', 'error');
      await scanLeads();
    } finally {
      setMigrando(false);
      setProgresso(0);
    }
  };

  // ------------------------------------------------------------------
  // Carimbar carteira: leads sem o campo `carteira` ganham o valor que a
  // origem deles já dizia. Nada muda de lugar — só fica explícito no doc.
  // ------------------------------------------------------------------
  const semCarteira = useMemo(() => leads.filter((l) => !l.temCarteira), [leads]);
  const previewCarteira = useMemo(() => ({
    casa: semCarteira.filter((l) => carteiraDoLead(l) !== CARTEIRA_REDE).length,
    rede: semCarteira.filter((l) => carteiraDoLead(l) === CARTEIRA_REDE).length,
  }), [semCarteira]);

  const handleCarimbar = async () => {
    if (guardaDemo()) return;
    if (!imobiliariaId || semCarteira.length === 0) return;
    const ok = await confirmDialog({
      title: 'Separar as carteiras',
      message: `${semCarteira.length} lead${semCarteira.length !== 1 ? 's' : ''} nasceram antes das carteiras. Vão receber o carimbo que a origem deles já diz: ${previewCarteira.casa} da casa, ${previewCarteira.rede} da rede dos corretores. Ninguém muda de CRM — o campo só fica gravado.`,
      confirmLabel: 'Carimbar agora',
    });
    if (!ok) return;
    setCarimbando(true);
    try {
      for (let i = 0; i < semCarteira.length; i += 400) {
        const fatia = semCarteira.slice(i, i + 400);
        const batch = writeBatch(db);
        fatia.forEach((l) => batch.update(doc(db, 'leads', l.id), { carteira: carteiraDoLead(l) }));
        await batch.commit();
      }
      showToast(`${semCarteira.length} lead${semCarteira.length !== 1 ? 's' : ''} carimbados.`, 'success');
      await scanLeads();
    } catch (e) {
      console.error('Erro ao carimbar carteiras:', e);
      showToast('Falhou no meio — recarregue e rode de novo (o que já foi carimbado fica).', 'error');
      await scanLeads();
    } finally {
      setCarimbando(false);
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const carregando = !leadsCarregados || !cadCarregada || !convCarregada;
  const inputCls = 'bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50';
  const chipBase = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border';
  const btnPrimario = 'bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-4 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50';
  const btnGhost = 'px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white font-bold transition-colors';

  if (!authLoading && !imobiliariaId && !isEspelhoDemo) {
    return (
      <div className="max-w-4xl mx-auto mt-6 px-1">
        <p className="text-text-secondary">Acesso restrito à imobiliária.</p>
      </div>
    );
  }

  /** Uma célula "realizado × esperado" com a cor dizendo se bateu a régua. */
  const Conversao = ({ real, esperado }: { real: number | null; esperado: number }) => {
    if (real === null) return <span className="text-[11px] text-white/30">—</span>;
    const bateu = real >= esperado;
    return (
      <span className={`text-[11px] font-bold tabular-nums ${bateu ? 'text-emerald-300' : real >= esperado * 0.7 ? 'text-amber-300' : 'text-rose-300'}`}
        title={`realizado ${real}% · esperado ${esperado}%`}>
        {real}% <span className="text-white/30 font-normal">/ {esperado}%</span>
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto mt-6 space-y-4 pb-10 px-1">
      {/* 1. Header */}
      <div>
        <span className="gx-tag"><span>Área do administrador</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2">Funil &amp; Cadências</h1>
        <p className="text-[12px] text-text-secondary mt-1">
          O funil da casa tem <b className="text-white">6 fases</b>. Aqui você vê onde os leads estão, quanto converteu em cada
          passagem contra a <b className="text-white">conversão esperada</b> (que você define), e ajusta as <b className="text-white">cadências</b> —
          os relógios que cobram o corretor.
        </p>
      </div>

      {carregando ? (
        <div className="al-card p-6">
          <LoadingState label="Carregando funil..." />
        </div>
      ) : (
        <>
          {/* 2. O funil — 6 fases */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">O funil de vendas</h2>
              <span className="ml-auto text-[11px] text-text-secondary tabular-nums">
                {vivos.length} lead{vivos.length !== 1 ? 's' : ''} vivos · {daCasa.length} da casa · {daRede.length} da rede · {guardados} guardados
              </span>
            </div>
            <p className="text-[10.5px] text-text-secondary mb-3">
              Em cada fase: quantos estão nela <b className="text-white">agora</b> e a <b className="text-white">conversão realizada</b> (quantos chegaram até ali, sobre
              quem chegou na fase anterior) contra a esperada. Verde bateu a régua; amarelo ficou perto; vermelho ficou longe.
              A rede dos corretores aparece separada — a régua é a mesma, mas o admin lê os dois lados.
            </p>

            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.04]">
                    <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Fase</th>
                    <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary text-right">Agora · casa</th>
                    <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary text-right">Chegaram</th>
                    <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary text-right">Conversão casa</th>
                    <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary text-right">Agora · rede</th>
                    <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary text-right">Conversão rede</th>
                    <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary text-right" title="de 100 leads, quantos a régua espera ver chegar aqui">de 100</th>
                  </tr>
                </thead>
                <tbody>
                  {FASES.map((f, i) => {
                    const rc = realizadoCasa.fases[i];
                    const rr = realizadoRede.fases[i];
                    return (
                      <tr key={f.chave} className="border-t border-white/[0.06]">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: f.cor, boxShadow: `0 0 6px ${f.cor}99` }} />
                            <div>
                              <p className="al-display text-[12px] font-bold uppercase tracking-wider" style={{ color: f.cor }}>{f.rotulo}</p>
                              <p className="text-[10px] text-text-secondary leading-snug">{f.descricao}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right al-display text-[16px] font-bold tabular-nums text-white">{rc.estao}</td>
                        <td className="px-3 py-2 text-right text-[12px] tabular-nums text-white/70">{rc.chegaram}</td>
                        <td className="px-3 py-2 text-right"><Conversao real={rc.conversao} esperado={rc.esperado} /></td>
                        <td className="px-3 py-2 text-right al-display text-[16px] font-bold tabular-nums text-[#FFE9A6]">{rr.estao}</td>
                        <td className="px-3 py-2 text-right"><Conversao real={rr.conversao} esperado={rr.esperado} /></td>
                        <td className="px-3 py-2 text-right text-[11px] tabular-nums text-white/40">{acumulado[f.chave]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Fora do funil */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`${chipBase} bg-white/[0.05] border-white/15 text-text-secondary`} title={`Motivos de descarte: ${MOTIVOS_DESCARTE.join(', ')}`}>
                {ETAPA_DESCARTADO}
                <span className="tabular-nums">{descartados}</span>
              </span>
              <span className={`${chipBase} bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]`} title={`Guardados na gaveta de Interesse futuro (até ${CAP_INTERESSE_FUTURO} por corretor) — fora da cobrança`}>
                💤 Interesse futuro
                <span className="tabular-nums">{guardados}</span>
              </span>
            </div>
            <p className="text-[10px] text-text-secondary mt-2">
              Motivos de descarte: {MOTIVOS_DESCARTE.join(' · ')}. Os leads guardados em Interesse futuro pelos corretores ficam fora do funil até voltarem.
            </p>
          </div>

          {/* 3. Conversão esperada */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em] mb-1">Conversão esperada — a régua</h2>
            <p className="text-[10.5px] text-text-secondary mb-3">
              O percentual de cada fase é <b className="text-white">quanto se espera que chegue nela, vindo da anterior</b>. Mexeu e salvou → a coluna
              &quot;esperado&quot; do funil e os relatórios passam a comparar com estes números. O número entre parênteses é o padrão que a casa trouxe.
            </p>
            <div className="space-y-2">
              {FASES.map((f) => (
                <div key={f.chave} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 bg-white/[0.03] border border-white/[0.08]">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: f.cor }} />
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-[12.5px] font-bold text-white">{f.rotulo}</p>
                    <p className="text-[10.5px] text-text-secondary leading-snug">{EXPLICA_CONV[f.chave]}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number" min={0} max={100} inputMode="numeric"
                      value={convStr[f.chave]}
                      onChange={(e) => setConvStr((prev) => ({ ...prev, [f.chave]: e.target.value }))}
                      placeholder={String(CONVERSAO_PADRAO[f.chave])}
                      aria-label={`Conversão esperada: ${f.rotulo}`}
                      className={`${inputCls} w-20 text-center al-display tabular-nums`}
                    />
                    <span className="text-[11px] text-text-secondary w-16">% <span className="text-white/30 tabular-nums">({CONVERSAO_PADRAO[f.chave]})</span></span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button type="button" onClick={handleSalvarConv} disabled={salvandoConv || !convSuja} className={btnPrimario}>
                {salvandoConv ? 'Salvando...' : 'Salvar conversão esperada'}
              </button>
              <button type="button" onClick={() => setConvStr(convToStr(CONVERSAO_PADRAO))} className={btnGhost}>
                Restaurar padrão
              </button>
              {convSuja && <span className="text-[11px] font-bold text-[#FFE9A6]">alterações não salvas</span>}
            </div>
          </div>

          {/* 4. Cadências (inalterado) */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em] mb-1">Cadências — os relógios do circuito</h2>
            <p className="text-[10.5px] text-text-secondary mb-3">
              São esses tempos que decidem <b className="text-white">quando o sistema cobra o corretor</b>: o pop-up abre sozinho
              no momento certo, sem ninguém precisar lembrar de nada. Mexeu e salvou → vale pra equipe inteira na hora.
              O número entre parênteses é o padrão sugerido. Valem só pra carteira da casa — na rede do corretor, agendar é opcional.
            </p>
            <div className="space-y-2.5">
              {CAMPOS_CADENCIA.map((campo) => (
                <div key={campo.key} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2.5 bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-[12.5px] font-bold text-white">{campo.titulo}</p>
                    <p className="text-[10.5px] text-text-secondary leading-snug mt-0.5">{campo.ajuda}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={campo.min}
                      max={campo.max}
                      inputMode="numeric"
                      value={cadStr[campo.key]}
                      onChange={(e) => setCadStr((prev) => ({ ...prev, [campo.key]: e.target.value }))}
                      placeholder={String(CADENCIAS_PADRAO[campo.key])}
                      aria-label={campo.titulo}
                      className={`${inputCls} w-24 text-center al-display tabular-nums`}
                    />
                    <span className="text-[11px] text-text-secondary w-24">
                      {campo.unidade} <span className="text-white/30 tabular-nums">({CADENCIAS_PADRAO[campo.key]})</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button type="button" onClick={handleSalvarCadencias} disabled={salvandoCad || !cadenciasSujas} className={btnPrimario}>
                {salvandoCad ? 'Salvando...' : 'Salvar cadências'}
              </button>
              <button type="button" onClick={handleRestaurarPadrao} className={btnGhost}>
                Restaurar padrão
              </button>
              {cadenciasSujas && <span className="text-[11px] font-bold text-[#FFE9A6]">alterações não salvas</span>}
            </div>
          </div>

          {/* 5. As carteiras — carimbar quem nasceu antes */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em] mb-1">As duas carteiras</h2>
            <p className="text-[10.5px] text-text-secondary mb-3">
              Lead da <b className="text-white">casa</b> (propaganda, ligação ativa, distribuição) é cobrado pelo circuito. Lead da <b className="text-white">rede</b> do corretor
              (networking, indicação, ação de rua, plantão) mora no CRM &quot;Minha rede&quot; dele, com agenda opcional e sem contar atraso.
              Leads antigos não têm o campo gravado — o sistema deduz pela origem. Carimbar deixa isso explícito no cadastro (útil pra separar os números depois).
            </p>
            {semCarteira.length === 0 ? (
              <div className="rounded-xl bg-[#34D399]/[0.06] border border-[#34D399]/30 px-4 py-3">
                <p className="text-[12.5px] font-bold text-emerald-300">✓ Todos os leads já têm a carteira gravada</p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[12px] text-white">
                  <b className="tabular-nums">{semCarteira.length}</b> sem carimbo →
                  <span className="text-text-secondary"> {previewCarteira.casa} da casa · {previewCarteira.rede} da rede</span>
                </span>
                <button type="button" onClick={handleCarimbar} disabled={carimbando} className={btnPrimario}>
                  {carimbando ? 'Carimbando...' : 'Separar as carteiras'}
                </button>
              </div>
            )}
          </div>

          {/* 6. Migração (inalterado) */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em] mb-1">Migração para o circuito</h2>
            <p className="text-[10.5px] text-text-secondary mb-3">
              Leads criados no funil antigo podem estar em etapas que não existem mais. Aqui você move todos de uma vez
              pra etapa equivalente do circuito — ferramenta de uma vez só: depois de migrar, ela fica em paz.
            </p>

            {legados.length === 0 ? (
              <div className="rounded-xl bg-[#34D399]/[0.06] border border-[#34D399]/30 px-4 py-3">
                <p className="text-[12.5px] font-bold text-emerald-300">✓ Todos os leads já estão no circuito</p>
                <p className="text-[10.5px] text-text-secondary mt-0.5">Nenhum lead em etapa antiga — nada pra migrar.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/[0.04]">
                        <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Etapa antiga</th>
                        <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Vai para</th>
                        <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary text-right">Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewMigracao.map((g) => (
                        <tr key={g.de || '(vazia)'} className="border-t border-white/[0.06]">
                          <td className="px-3 py-2 text-[12px] text-white">{g.de || <span className="text-text-secondary italic">(sem etapa)</span>}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-white">
                              <span className="text-white/25" aria-hidden>→</span>
                              <span className={`${chipBase} bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6]`}>{g.para}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[12px] text-white text-right tabular-nums">{g.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button type="button" onClick={handleMigrar} disabled={migrando} className={btnPrimario}>
                    {migrando
                      ? `Migrando... ${progresso}/${legados.length}`
                      : `Migrar ${legados.length} lead${legados.length !== 1 ? 's' : ''} para o circuito`}
                  </button>
                  {!migrando && (
                    <span className="text-[11px] text-text-secondary">a migração vale pros leads de todos os corretores</span>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
