'use client';

/**
 * Carregamento dos dados dos relatórios — sem N+1.
 *
 * Base (1x por imobiliária): leads, usuários aprovados, contribuições da meta,
 * períodos de meets, adsLeads e listas de ligação ativa (+ contatos por lista,
 * listas são poucas) — 6 queries + 1 por lista.
 * Por período: collectionGroup('interactions') + collectionGroup('tarefas')
 * numa janela estendida (período anterior incluso) — 2 queries, com cache:
 * se a janela nova cabe na já carregada, não refaz o fetch (o recorte fino
 * acontece no computeReport, no cliente).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, collectionGroup, doc, getDoc, getDocs, query, where, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { showToast } from '@/components/ui/toast';
import { buildDemoReportSource } from './demoReport';
import {
  AdsLeadLite, ContribLite, CorretorLite, InteracaoLite, LeadLite, LigAtivaContatoLite,
  MeetsPeriodoLite, Periodo, ReportSource, TarefaLite, anyToMs, janelaBusca,
} from './reportShared';

interface BaseData {
  leads: LeadLite[];
  corretores: CorretorLite[];
  contribuicoes: ContribLite[];
  meets: MeetsPeriodoLite[];
  adsLeads: AdsLeadLite[];
  ligacaoAtiva: LigAtivaContatoLite[];
}

interface JanelaData {
  inicioMs: number;
  fimMs: number;
  interacoes: InteracaoLite[];
  tarefas: TarefaLite[];
}

export interface RelatoriosData {
  /** true enquanto ainda não há dados suficientes pra renderizar */
  carregando: boolean;
  /** dica sutil do que está sendo carregado agora */
  progresso: string | null;
  source: ReportSource | null;
}

export function useRelatoriosData(
  imobiliariaId: string | undefined,
  isEspelhoDemo: boolean,
  periodo: Periodo
): RelatoriosData {
  const [base, setBase] = useState<BaseData | null>(null);
  const [janela, setJanela] = useState<JanelaData | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const buscandoJanela = useRef(false);

  // Demo: dataset sintético determinístico, zero Firestore
  const demoSource = useMemo(() => (isEspelhoDemo ? buildDemoReportSource() : null), [isEspelhoDemo]);

  // ------------------------------------------------------------------
  // Base — 5 queries, uma vez por imobiliária
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isEspelhoDemo || !imobiliariaId) return;
    let cancelado = false;

    const carregar = async () => {
      setProgresso('Carregando base do CRM...');
      try {
        const [leadsSnap, usuariosSnap, metaSnap, contribSnap, meetsSnap, adsSnap, listasSnap] = await Promise.all([
          getDocs(query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId))),
          getDocs(query(
            collection(db, 'usuarios'),
            where('imobiliariaId', '==', imobiliariaId),
            where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo', 'imobiliaria']),
            where('aprovado', '==', true)
          )),
          getDoc(doc(db, 'metas', imobiliariaId)),
          getDocs(collection(db, 'metas', imobiliariaId, 'contribuicoes')),
          getDocs(query(collection(db, 'meetsVisitas'), where('imobiliariaId', '==', imobiliariaId))),
          getDocs(query(collection(db, 'adsLeads'), where('imobiliariaId', '==', imobiliariaId))),
          getDocs(query(collection(db, 'ligacaoAtivaListas'), where('imobiliariaId', '==', imobiliariaId))),
        ]);
        if (cancelado) return;

        // Contatos das listas de ligação ativa — listas são poucas; um getDocs por lista
        const ligacaoAtiva: LigAtivaContatoLite[] = [];
        await Promise.all(listasSnap.docs.map(async (ld) => {
          const listaData = ld.data() as any;
          const corretorId = String(listaData.corretorId || '');
          const listaCriadaEmMs = anyToMs(listaData.criadaEm);
          try {
            const contSnap = await getDocs(collection(db, 'ligacaoAtivaListas', ld.id, 'contatos'));
            contSnap.forEach((cd) => {
              const cdata = cd.data() as any;
              // primeira tentativa registrada nos eventos do contato (mede a agilidade na lista fria)
              const eventos = Array.isArray(cdata.eventos) ? cdata.eventos : [];
              const tentativasMs = eventos
                .filter((e: any) => e?.tipo === 'tentativa')
                .map((e: any) => anyToMs(e?.em))
                .filter((n: number | null): n is number => n !== null);
              ligacaoAtiva.push({
                corretorId,
                status: String(cdata.status || 'pendente'),
                incluidoEmMs: anyToMs(cdata.incluidoEm),
                descartadoEmMs: anyToMs(cdata.descartadoEm),
                tentativas: Number(cdata.tentativas) || 0,
                primeiraTentativaMs: tentativasMs.length ? Math.min(...tentativasMs) : null,
                listaCriadaEmMs,
              });
            });
          } catch (e) {
            console.error('Erro ao carregar contatos da lista de ligação ativa:', e);
          }
        }));
        if (cancelado) return;
        void metaSnap; // meta em si não entra nos números; as vendas vêm das contribuições

        const leads: LeadLite[] = leadsSnap.docs.map((d) => {
          const data = d.data() as any;
          const pendentes = Array.isArray(data.tarefasPendentes) ? data.tarefasPendentes : [];
          const qual = data.qualificacao && typeof data.qualificacao === 'object' ? data.qualificacao : {};
          const qualGrupos = Object.values(qual).filter((v: any) =>
            Array.isArray(v) ? v.length > 0 : (typeof v === 'string' && v.trim() !== '')
          ).length;
          return {
            id: d.id,
            userId: String(data.userId || ''),
            nome: String(data.nome || ''),
            etapa: String(data.etapa || ''),
            origem: data.origem ? String(data.origem) : undefined,
            origemTipo: data.origemTipo ? String(data.origemTipo) : undefined,
            origemPropaganda: data.origemPropaganda ? String(data.origemPropaganda) : undefined,
            createdAtMs: anyToMs(data.createdAt),
            pendentesMs: pendentes.map((t: any) => anyToMs(t?.dueDate)).filter((n: number | null): n is number => n !== null),
            vendaValor: data.vendaValor ? String(data.vendaValor) : undefined,
            descartadoMotivo: data.descartadoMotivo ? String(data.descartadoMotivo) : undefined,
            descartadoPor: data.descartadoPor ? String(data.descartadoPor) : undefined,
            semPrimeiroContato: !data.circuito?.primeiroContatoEm,
            tentativasAtuais: Number(data.circuito?.tentativas) || 0,
            qualGrupos,
            temAnotacoes: typeof data.anotacoes === 'string' && data.anotacoes.trim().length >= 5,
            primeiroContatoMs: anyToMs(data.circuito?.primeiroContatoEm),
            etapaDesdeMs: anyToMs(data.circuito?.desde),
          };
        });

        const corretores: CorretorLite[] = usuariosSnap.docs
          .map((d) => ({ id: d.id, nome: String((d.data() as any).nome || 'Sem nome') }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

        const contribuicoes: ContribLite[] = contribSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            corretorId: String(data.corretorId || ''),
            corretorNome: String(data.corretorNome || ''),
            valor: Number(data.valor) || 0,
            dataVenda: data.dataVenda ? String(data.dataVenda).split('T')[0] : '',
          };
        });

        const meets: MeetsPeriodoLite[] = meetsSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            inicio: String(data.inicio || ''),
            fim: String(data.fim || ''),
            contadores: (data.contadores && typeof data.contadores === 'object') ? data.contadores : {},
          };
        });

        const adsLeads: AdsLeadLite[] = adsSnap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            nome: String(data.nome || ''),
            campanhaNome: data.campanhaNome ? String(data.campanhaNome) : '',
            status: String(data.status || ''),
            aceitoPor: data.aceitoPor ? String(data.aceitoPor) : undefined,
            aceitoPorNome: data.aceitoPorNome ? String(data.aceitoPorNome) : undefined,
            tempoAceiteSeg: typeof data.tempoAceiteSeg === 'number' ? data.tempoAceiteSeg : undefined,
            viaGeral: !!data.viaGeral,
            criadoEmMs: anyToMs(data.criadoEm),
            aceitoEmMs: anyToMs(data.aceitoEm),
          };
        });

        setBase({ leads, corretores, contribuicoes, meets, adsLeads, ligacaoAtiva });
      } catch (e) {
        console.error('Erro ao carregar base dos relatórios:', e);
        if (!cancelado) showToast('Não foi possível carregar os dados do CRM — recarregue a página.', 'error');
      }
    };

    carregar();
    return () => { cancelado = true; };
  }, [imobiliariaId, isEspelhoDemo]);

  // ------------------------------------------------------------------
  // Janela do período — 2 collectionGroup queries, com cache de superset
  // ------------------------------------------------------------------
  const alvo = useMemo(() => janelaBusca(periodo), [periodo]);
  useEffect(() => {
    if (isEspelhoDemo || !imobiliariaId || !base) return;
    // Se a janela já carregada cobre a nova, não refaz nada
    if (janela && janela.inicioMs <= alvo.inicioMs && janela.fimMs >= alvo.fimMs) return;
    if (buscandoJanela.current) return;
    let cancelado = false;
    buscandoJanela.current = true;

    const carregar = async () => {
      setProgresso('Cruzando interações e tarefas do período...');
      try {
        const tsIni = Timestamp.fromMillis(alvo.inicioMs);
        const tsFim = Timestamp.fromMillis(alvo.fimMs);
        const [intSnap, tarSnap] = await Promise.all([
          getDocs(query(
            collectionGroup(db, 'interactions'),
            where('timestamp', '>=', tsIni),
            where('timestamp', '<=', tsFim)
          )),
          getDocs(query(
            collectionGroup(db, 'tarefas'),
            where('dueDate', '>=', tsIni),
            where('dueDate', '<=', tsFim)
          )),
        ]);
        if (cancelado) return;

        const interacoes: InteracaoLite[] = [];
        intSnap.forEach((d) => {
          const leadId = d.ref.parent.parent?.id;
          const data = d.data() as any;
          const tsMs = anyToMs(data.timestamp);
          if (!leadId || tsMs === null) return;
          interacoes.push({
            leadId,
            type: String(data.type || ''),
            notes: typeof data.notes === 'string' ? data.notes : '',
            circuito: data.circuito === true || undefined,
            tsMs,
          });
        });

        const tarefas: TarefaLite[] = [];
        tarSnap.forEach((d) => {
          const leadId = d.ref.parent.parent?.id;
          const data = d.data() as any;
          const dueMs = anyToMs(data.dueDate);
          if (!leadId || dueMs === null) return;
          tarefas.push({ leadId, type: String(data.type || ''), status: String(data.status || ''), dueMs });
        });

        setJanela({ inicioMs: alvo.inicioMs, fimMs: alvo.fimMs, interacoes, tarefas });
      } catch (e) {
        console.error('Erro ao carregar interações/tarefas do período:', e);
        if (!cancelado) showToast('Não foi possível carregar a atividade do período — tente de novo.', 'error');
      } finally {
        buscandoJanela.current = false;
        if (!cancelado) setProgresso(null);
      }
    };

    carregar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imobiliariaId, isEspelhoDemo, base, alvo.inicioMs, alvo.fimMs, janela]);

  // ------------------------------------------------------------------
  // Composição
  // ------------------------------------------------------------------
  const source: ReportSource | null = useMemo(() => {
    if (isEspelhoDemo) return demoSource;
    if (!base || !janela) return null;
    return {
      leads: base.leads,
      corretores: base.corretores,
      contribuicoes: base.contribuicoes,
      meets: base.meets,
      adsLeads: base.adsLeads,
      ligacaoAtiva: base.ligacaoAtiva,
      interacoes: janela.interacoes,
      tarefas: janela.tarefas,
      janelaInicioMs: janela.inicioMs,
    };
  }, [isEspelhoDemo, demoSource, base, janela]);

  return {
    carregando: !source,
    progresso: source ? progresso : (progresso ?? 'Preparando relatórios...'),
    source,
  };
}
