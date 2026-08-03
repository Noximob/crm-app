'use client';

/**
 * GESTÃO DE CORRETORES — o motor de análise por pessoa.
 *
 * Responde 4 perguntas, nesta ordem:
 *   1. RESULTADO — quanto ele entregou (vendas, VGV, conversão)
 *   2. ESFORÇO   — ele está trabalhando ou empurrando com a barriga?
 *   3. GARGALO   — onde os leads DELE morrem no funil (e quanto tempo travam)
 *   4. QUALIDADE — o que ele deixa registrado (qualificação, anotação, cadência)
 *
 * Tudo é derivado de dado real: `leads` (+ etapasHist, circuito), a subcoleção
 * `interactions`/`tarefas` de cada lead e a coleção `vendas` do Financeiro.
 * Puro — sem Firebase aqui; quem chama já carregou os dados.
 */
import {
  mapEtapaCircuito, etapaIndex, ETAPAS_CIRCUITO,
  ETAPA_FECHADO, ETAPA_DESCARTADO, ETAPA_ENTRADA, ETAPA_EM_CONTATO,
  ehInteresseFuturo,
} from '@/lib/circuito';
import { msOf, type RelLead, type RelCorretor, type AtividadeLead, ehFollowup } from './logic';

const DIA = 24 * 60 * 60 * 1000;
const PARADO_DIAS = 14;      // lead ativo sem mudar de etapa
const SEM_TOQUE_DIAS = 7;    // lead ativo sem nenhuma interação
/** sentinela de "nunca registrou nada" em diasSemAtividade (evita null virar 0 = ótimo) */
export const SEM_ATIVIDADE = 999;
export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Venda (subset do Financeiro que a gestão usa). */
export interface VendaGestao {
  id: string; corretorUid: string; status?: string; dataVenda: string;
  vgvLiquido?: number; valorBruto?: number; comissaoBruta?: number;
  rateio?: { papel: string; valor: number }[];
}

/** Uma transição de etapa gravada no lead. */
interface TransicaoEtapa { de?: string; para?: string; em?: unknown }

// ---------------------------------------------------------------------------
// Tipos de saída
// ---------------------------------------------------------------------------

export interface EtapaFunil {
  etapa: string;
  /** leads que ESTÃO nela agora */
  agora: number;
  /** leads que JÁ PASSARAM por ela (chegaram nela ou além) */
  passaram: number;
  /** dos que chegaram nela, quantos avançaram pra próxima */
  avancaram: number;
  /** avancaram ÷ passaram — a taxa de passagem real */
  passagem: number;
  /** dias médios que os leads ficaram nesta etapa (só quem já saiu) */
  diasMedios: number | null;
  /** leads que morreram aqui (descartados nesta etapa) */
  morreram: number;
}

export interface AlertaGestao {
  chave: string;
  nivel: 'alto' | 'medio';
  titulo: string;
  detalhe: string;
  n: number;
}

export interface CorretorGestao {
  uid: string;
  nome: string;
  tipoConta?: string;
  // ── 1. RESULTADO ──
  leads: number;
  ativos: number;
  fechados: number;
  conversao: number;
  vendas: number;
  vgv: number;
  comissaoGerada: number;
  ticketMedio: number;
  // ── 2. ESFORÇO ──
  diasSemAcessar: number | null;
  diasSemAtividade: number | null;
  interacoes: number;
  interacoesPorLeadAtivo: number | null;
  cadenciaDias: number | null;      // intervalo médio entre toques
  tarefasConcluidas: number;
  tarefasAtrasadas: number;
  tarefasPendentes: number;
  leadsSemToque: number;            // ativo, sem interação há +7d
  leadsParados: number;             // ativo, mesma etapa há +14d
  interesseFuturo: number;          // "guardados pra depois" (agenda > 15d)
  // ── 3. GARGALO ──
  funil: EtapaFunil[];
  gargalo: { etapa: string; passagem: number; presos: number } | null;
  tempoAteContato: number | null;   // dias entre entrada e 1ª conversa
  tentativasMedias: number | null;
  // ── 4. QUALIDADE ──
  qualifPct: number;
  anotPct: number;
  avancouSemQualificar: number;
  descartes: number;
  taxaDescarte: number;
  descartesRapidos: number;         // descartou com ≤1 tentativa
  motivosDescarte: { motivo: string; n: number }[];
  // ── sinais ──
  alertas: AlertaGestao[];
  /** 0-100 — quanto do trabalho esperado ele está fazendo (não é nota de venda) */
  indiceEsforco: number | null;
}

export interface GestaoResumo {
  corretores: CorretorGestao[];
  /** funil do TIME (a média que serve de régua pra comparar cada um) */
  funilTime: EtapaFunil[];
  gargaloTime: { etapa: string; passagem: number } | null;
  medias: {
    conversao: number; qualifPct: number; anotPct: number;
    interacoesPorLeadAtivo: number | null; tempoAteContato: number | null;
  };
  totais: { leads: number; ativos: number; fechados: number; vgv: number; vendas: number };
}

// ---------------------------------------------------------------------------
// Funil real: usa etapasHist quando existe (dado exato de quando entrou/saiu)
// e cai na catraca (etapa atual) pros leads antigos, que não têm histórico.
// ---------------------------------------------------------------------------

function calcularFunil(leads: RelLead[]): EtapaFunil[] {
  const idxMax = ETAPAS_CIRCUITO.length - 1;
  const agora = Date.now();

  const passaram = new Array(ETAPAS_CIRCUITO.length).fill(0);
  const agoraEm = new Array(ETAPAS_CIRCUITO.length).fill(0);
  const morreram = new Array(ETAPAS_CIRCUITO.length).fill(0);
  const somaDias = new Array(ETAPAS_CIRCUITO.length).fill(0);
  const nDias = new Array(ETAPAS_CIRCUITO.length).fill(0);

  for (const l of leads) {
    const etapaAtual = mapEtapaCircuito(l.etapa);
    const idxAtual = etapaIndex(etapaAtual);
    const descartado = etapaAtual === ETAPA_DESCARTADO;

    // por onde passou: com histórico é exato; sem histórico, a catraca garante
    // que ele passou por tudo até a etapa atual
    const hist = (l as { etapasHist?: TransicaoEtapa[] }).etapasHist || [];
    const alcancado = descartado
      ? Math.max(0, ...hist.map((h) => etapaIndex(mapEtapaCircuito(h.para || ''))).filter((i) => i >= 0), 0)
      : (idxAtual >= 0 ? idxAtual : 0);
    for (let i = 0; i <= Math.min(alcancado, idxMax); i++) passaram[i]++;
    if (idxAtual >= 0) agoraEm[idxAtual]++;
    if (descartado) morreram[Math.min(alcancado, idxMax)]++;

    // tempo em cada etapa: pares consecutivos do histórico
    const ordenado = [...hist]
      .map((h) => ({ para: mapEtapaCircuito(h.para || ''), ms: msOf(h.em) }))
      .filter((h) => h.ms > 0)
      .sort((a, b) => a.ms - b.ms);
    for (let i = 0; i < ordenado.length; i++) {
      const idx = etapaIndex(ordenado[i].para);
      if (idx < 0) continue;
      const fim = i + 1 < ordenado.length ? ordenado[i + 1].ms : (descartado ? msOf(l.descartadoEm) : 0);
      if (fim > ordenado[i].ms) { somaDias[idx] += (fim - ordenado[i].ms) / DIA; nDias[idx]++; }
    }
    // etapa atual em aberto: conta o tempo corrido (só se não terminou)
    if (!descartado && idxAtual >= 0 && etapaAtual !== ETAPA_FECHADO) {
      const desde = msOf(l.circuito?.desde) || msOf(l.createdAt);
      if (desde > 0) { somaDias[idxAtual] += (agora - desde) / DIA; nDias[idxAtual]++; }
    }
  }

  return ETAPAS_CIRCUITO.map((etapa, i) => {
    const chegaram = passaram[i];
    const avancaram = i + 1 <= idxMax ? passaram[i + 1] : 0;
    return {
      etapa,
      agora: agoraEm[i],
      passaram: chegaram,
      avancaram,
      passagem: chegaram > 0 && i < idxMax ? avancaram / chegaram : 0,
      diasMedios: nDias[i] > 0 ? round1(somaDias[i] / nDias[i]) : null,
      morreram: morreram[i],
    };
  });
}

/** O gargalo = etapa com mais gente parada e pior taxa de passagem. */
function acharGargalo(funil: EtapaFunil[]): { etapa: string; passagem: number; presos: number } | null {
  // só considera etapas com volume relevante e que não são a última
  const candidatas = funil.slice(0, -1).filter((f) => f.passaram >= 3);
  if (!candidatas.length) return null;
  // pior passagem; empate desempata por quem tem mais gente parada agora
  const pior = candidatas.reduce((a, b) => (b.passagem < a.passagem || (b.passagem === a.passagem && b.agora > a.agora) ? b : a));
  return { etapa: pior.etapa, passagem: pior.passagem, presos: pior.agora };
}

// ---------------------------------------------------------------------------
// Núcleo
// ---------------------------------------------------------------------------

export function computeGestao(
  leads: RelLead[],
  corretores: RelCorretor[],
  vendas: VendaGestao[],
  atividade: Map<string, AtividadeLead> | null,
  selecionados: Set<string>,
  desdeMs = 0,
): GestaoResumo {
  const agora = Date.now();
  const comAtividade = !!atividade && atividade.size > 0;
  const leadsF = leads.filter((l) => !!l.userId && selecionados.has(l.userId));
  const nomeDe = new Map(corretores.map((c) => [c.id, c.nome] as const));
  const tipoDe = new Map(corretores.map((c) => [c.id, c.tipoConta] as const));
  const acessoDe = new Map(corretores.map((c) => [c.id, msOf(c.lastActiveAt ?? c.ultimoAcesso)] as const));

  const porCorretor = new Map<string, RelLead[]>();
  for (const l of leadsF) {
    const arr = porCorretor.get(l.userId as string) || [];
    arr.push(l);
    porCorretor.set(l.userId as string, arr);
  }

  const vendasPor = new Map<string, VendaGestao[]>();
  for (const v of vendas) {
    if (v.status !== 'assinada' || !selecionados.has(v.corretorUid)) continue;
    const arr = vendasPor.get(v.corretorUid) || [];
    arr.push(v);
    vendasPor.set(v.corretorUid, arr);
  }

  const lista: CorretorGestao[] = Array.from(porCorretor.entries()).map(([uid, meus]) => {
    let ativos = 0, fechados = 0, descartes = 0, comQualif = 0, comAnot = 0;
    let semQualifAvancado = 0, descartesRapidos = 0, parados = 0, semToque = 0, futuros = 0;
    let soma1o = 0, n1o = 0, somaTent = 0, nTent = 0;
    let interacoes = 0, tarefasConcluidas = 0, tarefasAtrasadas = 0, tarefasPendentes = 0;
    let somaCad = 0, nCad = 0, ultimaAtiv = 0;
    const motivos = new Map<string, number>();

    for (const l of meus) {
      const et = mapEtapaCircuito(l.etapa);
      const idx = etapaIndex(et);
      const isFech = et === ETAPA_FECHADO;
      const isDesc = et === ETAPA_DESCARTADO;
      const isAtivo = !isFech && !isDesc;
      const qualif = !!l.qualificacao && Object.values(l.qualificacao).some((a) => Array.isArray(a) && a.length > 0);
      const anot = !!(l.anotacoes && String(l.anotacoes).trim());

      if (isAtivo) ativos++;
      if (isFech) fechados++;
      if (qualif) comQualif++;
      if (anot) comAnot++;
      if (isDesc) {
        descartes++;
        if ((l.circuito?.tentativas || 0) <= 1) descartesRapidos++;
        const m = (l.descartadoMotivo as string) || 'sem motivo';
        motivos.set(m, (motivos.get(m) || 0) + 1);
      }
      // avançou de Meet pra frente sem qualificar = trabalhou no escuro
      if (idx >= etapaIndex('Meet Agendado') && !qualif) semQualifAvancado++;
      // parado: ativo e sem mudar de etapa há muito tempo
      const desde = msOf(l.circuito?.desde) || msOf(l.createdAt);
      if (isAtivo && desde > 0 && (agora - desde) / DIA > PARADO_DIAS) parados++;
      if (ehInteresseFuturo(et, (l as { tarefasPendentes?: { dueDate?: unknown }[] }).tarefasPendentes, agora)) futuros++;

      const cMs = msOf(l.createdAt), pMs = msOf(l.circuito?.primeiroContatoEm);
      if (cMs > 0 && pMs >= cMs && (pMs - cMs) <= 30 * DIA) { soma1o += (pMs - cMs) / DIA; n1o++; }
      if (typeof l.circuito?.tentativas === 'number') { somaTent += l.circuito.tentativas; nTent++; }

      const at = atividade?.get(l.id);
      if (at) {
        const evs = desdeMs > 0 ? at.eventos.filter((e) => e.ms >= desdeMs) : at.eventos;
        interacoes += evs.length;
        if (evs.length >= 2) {
          let s = 0;
          for (let k = 1; k < evs.length; k++) s += evs[k].ms - evs[k - 1].ms;
          somaCad += s / (evs.length - 1) / DIA; nCad++;
        }
        const ult = evs.length ? evs[evs.length - 1].ms : 0;
        if (ult > ultimaAtiv) ultimaAtiv = ult;
        if (isAtivo && (ult === 0 || (agora - ult) / DIA > SEM_TOQUE_DIAS)) semToque++;
        for (const t of at.tarefas) {
          if (/conclu/i.test(t.status)) tarefasConcluidas++;
          else if (!/cancel/i.test(t.status)) {
            tarefasPendentes++;
            if (t.dueMs > 0 && t.dueMs < agora) tarefasAtrasadas++;
          }
        }
      }
    }

    const minhasVendas = vendasPor.get(uid) || [];
    const vgv = minhasVendas.reduce((s, v) => s + (v.vgvLiquido ?? v.valorBruto ?? 0), 0);
    const comissao = minhasVendas.reduce((s, v) => s + ((v.rateio || []).find((b) => b.papel === 'corretor')?.valor || 0), 0);

    const funil = calcularFunil(meus);
    const total = meus.length;
    const acesso = acessoDe.get(uid) || 0;

    const c: CorretorGestao = {
      uid, nome: meus[0] ? (nomeDe.get(uid) || uid.slice(0, 6)) : (nomeDe.get(uid) || uid.slice(0, 6)),
      tipoConta: tipoDe.get(uid),
      leads: total, ativos, fechados,
      conversao: total ? fechados / total : 0,
      vendas: minhasVendas.length, vgv, comissaoGerada: comissao,
      ticketMedio: minhasVendas.length ? vgv / minhasVendas.length : 0,
      diasSemAcessar: acesso ? (agora - acesso) / DIA : null,
      diasSemAtividade: comAtividade ? (ultimaAtiv ? (agora - ultimaAtiv) / DIA : SEM_ATIVIDADE) : null,
      interacoes,
      interacoesPorLeadAtivo: ativos ? interacoes / ativos : null,
      cadenciaDias: nCad ? round1(somaCad / nCad) : null,
      tarefasConcluidas, tarefasAtrasadas, tarefasPendentes,
      leadsSemToque: semToque, leadsParados: parados, interesseFuturo: futuros,
      funil,
      gargalo: acharGargalo(funil),
      tempoAteContato: n1o ? round1(soma1o / n1o) : null,
      tentativasMedias: nTent ? round1(somaTent / nTent) : null,
      qualifPct: total ? comQualif / total : 0,
      anotPct: total ? comAnot / total : 0,
      avancouSemQualificar: semQualifAvancado,
      descartes, taxaDescarte: total ? descartes / total : 0, descartesRapidos,
      motivosDescarte: Array.from(motivos.entries()).map(([motivo, n]) => ({ motivo, n })).sort((a, b) => b.n - a.n),
      alertas: [],
      indiceEsforco: null,
    };
    c.alertas = montarAlertas(c, comAtividade);
    c.indiceEsforco = calcularEsforco(c, comAtividade);
    return c;
  }).sort((a, b) => b.vgv - a.vgv || b.fechados - a.fechados || b.leads - a.leads);

  // funil e médias do TIME (a régua de comparação)
  const funilTime = calcularFunil(leadsF);
  const totalLeads = leadsF.length;
  const totalAtivos = lista.reduce((s, c) => s + c.ativos, 0);
  const comInter = lista.filter((c) => c.interacoesPorLeadAtivo !== null);
  const com1o = lista.filter((c) => c.tempoAteContato !== null);

  return {
    corretores: lista,
    funilTime,
    gargaloTime: (() => { const g = acharGargalo(funilTime); return g ? { etapa: g.etapa, passagem: g.passagem } : null; })(),
    medias: {
      conversao: totalLeads ? lista.reduce((s, c) => s + c.fechados, 0) / totalLeads : 0,
      qualifPct: totalLeads ? lista.reduce((s, c) => s + c.qualifPct * c.leads, 0) / totalLeads : 0,
      anotPct: totalLeads ? lista.reduce((s, c) => s + c.anotPct * c.leads, 0) / totalLeads : 0,
      interacoesPorLeadAtivo: comInter.length ? comInter.reduce((s, c) => s + (c.interacoesPorLeadAtivo || 0), 0) / comInter.length : null,
      tempoAteContato: com1o.length ? round1(com1o.reduce((s, c) => s + (c.tempoAteContato || 0), 0) / com1o.length) : null,
    },
    totais: {
      leads: totalLeads, ativos: totalAtivos,
      fechados: lista.reduce((s, c) => s + c.fechados, 0),
      vgv: lista.reduce((s, c) => s + c.vgv, 0),
      vendas: lista.reduce((s, c) => s + c.vendas, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Alertas — os sinais de "está rateando o trabalho"
// ---------------------------------------------------------------------------

function montarAlertas(c: CorretorGestao, comAtividade: boolean): AlertaGestao[] {
  const a: AlertaGestao[] = [];
  const pct = (n: number) => (c.leads ? n / c.leads : 0);

  if (comAtividade && (c.diasSemAtividade ?? 0) > 7) {
    const d = Math.round(c.diasSemAtividade || 0);
    a.push({ chave: 'sumido', nivel: 'alto', n: d, titulo: 'Sumido do CRM',
      // SEM_ATIVIDADE é sentinela: o corretor nunca registrou nada nos leads dele
      detalhe: d >= SEM_ATIVIDADE ? 'nunca registrou nenhum contato nos leads dele' : `sem mexer em nenhum lead há ${d} dias` });
  }
  if ((c.diasSemAcessar ?? 0) > 7) {
    a.push({ chave: 'semAcesso', nivel: 'alto', n: Math.round(c.diasSemAcessar || 0),
      titulo: 'Sem abrir o sistema', detalhe: `último acesso há ${Math.round(c.diasSemAcessar || 0)} dias` });
  }
  if (c.tarefasAtrasadas > 0) {
    a.push({ chave: 'atrasadas', nivel: c.tarefasAtrasadas >= 10 ? 'alto' : 'medio', n: c.tarefasAtrasadas,
      titulo: 'Tarefas atrasadas', detalhe: `${c.tarefasAtrasadas} tarefa(s) venceram e não foram feitas` });
  }
  if (comAtividade && c.leadsSemToque > 0 && pct(c.leadsSemToque) > 0.2) {
    a.push({ chave: 'semToque', nivel: 'alto', n: c.leadsSemToque,
      titulo: 'Leads abandonados', detalhe: `${c.leadsSemToque} lead(s) ativo(s) sem nenhum contato há +7 dias` });
  }
  if (c.leadsParados > 0 && pct(c.leadsParados) > 0.3) {
    a.push({ chave: 'parados', nivel: 'medio', n: c.leadsParados,
      titulo: 'Funil congelado', detalhe: `${c.leadsParados} lead(s) na mesma etapa há +14 dias` });
  }
  if (c.qualifPct < 0.3 && c.leads >= 5) {
    a.push({ chave: 'semQualif', nivel: 'alto', n: Math.round(c.qualifPct * 100),
      titulo: 'Não qualifica', detalhe: `só ${Math.round(c.qualifPct * 100)}% dos leads têm qualificação preenchida` });
  }
  if (c.avancouSemQualificar > 0) {
    a.push({ chave: 'avancouSemQualif', nivel: 'medio', n: c.avancouSemQualificar,
      titulo: 'Avançou no escuro', detalhe: `${c.avancouSemQualificar} lead(s) passaram de Meet sem qualificação` });
  }
  if (c.anotPct < 0.3 && c.leads >= 5) {
    a.push({ chave: 'semAnot', nivel: 'medio', n: Math.round(c.anotPct * 100),
      titulo: 'Não anota nada', detalhe: `só ${Math.round(c.anotPct * 100)}% dos leads têm anotação` });
  }
  if (c.descartesRapidos >= 3) {
    a.push({ chave: 'descarteRapido', nivel: 'alto', n: c.descartesRapidos,
      titulo: 'Descarta cedo demais', detalhe: `${c.descartesRapidos} descarte(s) com 1 tentativa ou menos` });
  }
  if (c.taxaDescarte > 0.4 && c.leads >= 10) {
    a.push({ chave: 'muitoDescarte', nivel: 'medio', n: Math.round(c.taxaDescarte * 100),
      titulo: 'Descarta muito', detalhe: `${Math.round(c.taxaDescarte * 100)}% da carteira dele foi descartada` });
  }
  if ((c.tempoAteContato ?? 0) > 2) {
    a.push({ chave: 'lento', nivel: 'medio', n: Math.round(c.tempoAteContato || 0),
      titulo: 'Demora pra falar', detalhe: `leva ${c.tempoAteContato} dias em média até a 1ª conversa` });
  }
  if (comAtividade && c.ativos >= 5 && (c.interacoesPorLeadAtivo ?? 0) < 1) {
    a.push({ chave: 'poucoToque', nivel: 'alto', n: Math.round((c.interacoesPorLeadAtivo || 0) * 10) / 10,
      titulo: 'Quase não trabalha o lead', detalhe: `menos de 1 interação por lead ativo na carteira` });
  }
  if (c.leads >= 10 && c.fechados === 0) {
    a.push({ chave: 'semVenda', nivel: 'medio', n: c.leads,
      titulo: 'Carteira sem conversão', detalhe: `${c.leads} leads e nenhuma venda fechada` });
  }
  return a.sort((x, y) => (x.nivel === y.nivel ? 0 : x.nivel === 'alto' ? -1 : 1));
}

/**
 * Índice de ESFORÇO (0-100) — mede trabalho, não talento de venda.
 * Deliberadamente separado do resultado: um corretor pode ter esforço alto e
 * conversão baixa (precisa de treino) ou o contrário (sorte/carteira boa).
 */
function calcularEsforco(c: CorretorGestao, comAtividade: boolean): number | null {
  const notas: number[] = [];
  if (comAtividade && c.diasSemAtividade !== null) {
    const d = c.diasSemAtividade;
    notas.push(d <= 1 ? 100 : d <= 3 ? 80 : d <= 7 ? 50 : d <= 14 ? 25 : 0);
  }
  if (c.tarefasPendentes + c.tarefasConcluidas > 0) {
    const emDia = 1 - c.tarefasAtrasadas / Math.max(1, c.tarefasPendentes + c.tarefasConcluidas);
    notas.push(Math.max(0, Math.min(100, emDia * 100)));
  }
  if (comAtividade && c.ativos >= 3 && c.interacoesPorLeadAtivo !== null) {
    const i = c.interacoesPorLeadAtivo;
    notas.push(i >= 4 ? 100 : i >= 2 ? 75 : i >= 1 ? 50 : 20);
  }
  if (c.leads >= 5) notas.push(Math.min(100, c.qualifPct * 100 * 1.4)); // 70% já é nota máxima
  if (comAtividade && c.ativos > 0) {
    const abandonados = c.leadsSemToque / c.ativos;
    notas.push(Math.max(0, 100 - abandonados * 150));
  }
  if (!notas.length) return null;
  return Math.round(notas.reduce((s, n) => s + n, 0) / notas.length);
}

export const corEsforco = (n: number | null): string =>
  n === null ? '#9ca3af' : n >= 70 ? '#3AC17C' : n >= 45 ? '#E8C547' : '#F45B69';

// ---------------------------------------------------------------------------
// Demo (modo Espelho) — perfis sintéticos que mostram a leitura da tela:
// o campeão, o que trabalha e não converte, e o que sumiu. Os DADOS crus são
// exportados (dadosDemo) porque o semanal também roda em cima deles.
// ---------------------------------------------------------------------------

export interface DadosDemo {
  leads: RelLead[];
  corretores: RelCorretor[];
  vendas: (VendaGestao & { leadId?: string })[];
  atividade: Map<string, AtividadeLead>;
  selecionados: Set<string>;
}

export function dadosDemo(): DadosDemo {
  const agora = Date.now();
  const d = (dias: number) => ({ toMillis: () => agora - dias * DIA });
  const ymd = (dias: number) => {
    const dt = new Date(agora - dias * DIA);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const NOMES = ['Marina Souza', 'Pedro Alves', 'Júlia Castro', 'Rafael Nunes', 'Carla Dias', 'Tiago Rocha', 'Beatriz Lima'];
  const mkLead = (uid: string, etapa: string, i: number, extra: Partial<RelLead> = {}): RelLead => ({
    id: `${uid}-${i}`, userId: uid, etapa, nome: NOMES[i % NOMES.length],
    createdAt: d(30 + i), circuito: { desde: d(3 + (i % 20)), tentativas: 2, primeiroContatoEm: d(29 + i) },
    qualificacao: i % 3 === 0 ? {} : { finalidade: ['Moradia'] },
    anotacoes: i % 4 === 0 ? '' : 'conversa registrada',
    ...extra,
  } as RelLead);
  // transição carimbada N dias atrás (cai na semana certa do semanal)
  const trans = (de: string, para: string, dias: number) => ({ de, para, em: d(dias) });

  const perfis: { uid: string; nome: string; etapas: string[]; qualif: number; ativoHa: number; acessoHa: number }[] = [
    { uid: 'demo-1', nome: 'Ana (campeã)', etapas: [ETAPA_FECHADO, ETAPA_FECHADO, 'Negociação', 'Visita Feita', 'Meet Agendado', ETAPA_EM_CONTATO, ETAPA_EM_CONTATO], qualif: 0.9, ativoHa: 0, acessoHa: 0 },
    { uid: 'demo-2', nome: 'Bruno (trabalha, não fecha)', etapas: [ETAPA_EM_CONTATO, ETAPA_EM_CONTATO, ETAPA_EM_CONTATO, ETAPA_EM_CONTATO, 'Meet Agendado', ETAPA_DESCARTADO], qualif: 0.7, ativoHa: 1, acessoHa: 0 },
    { uid: 'demo-3', nome: 'Caio (sumido)', etapas: [ETAPA_ENTRADA, ETAPA_EM_CONTATO, ETAPA_EM_CONTATO, ETAPA_DESCARTADO, ETAPA_DESCARTADO], qualif: 0.1, ativoHa: 21, acessoHa: 18 },
  ];

  const leads: RelLead[] = [];
  const corretores: RelCorretor[] = [];
  const atividade = new Map<string, AtividadeLead>();

  perfis.forEach((p) => {
    corretores.push({ id: p.uid, nome: p.nome, tipoConta: 'corretor-vinculado', aprovado: true, lastActiveAt: d(p.acessoHa) });
    p.etapas.forEach((etapa, i) => {
      // a Ana movimentou o funil NESTA semana; o Bruno um pouco; o Caio nada
      const hist =
        p.uid === 'demo-1' ? (
          etapa === ETAPA_FECHADO && i === 0 ? [trans(ETAPA_EM_CONTATO, 'Meet Agendado', 12), trans('Meet Agendado', 'Meet Feito', 9), trans('Negociação', ETAPA_FECHADO, 2)]
            : etapa === 'Negociação' ? [trans('Meet Agendado', 'Meet Feito', 5), trans('Visita Feita', 'Negociação', 3)]
              : etapa === 'Visita Feita' ? [trans('Visita Agendada', 'Visita Feita', 2)]
                : etapa === 'Meet Agendado' ? [trans(ETAPA_EM_CONTATO, 'Meet Agendado', 1)]
                  : []
        ) : p.uid === 'demo-2' ? (
          etapa === 'Meet Agendado' ? [trans(ETAPA_EM_CONTATO, 'Meet Agendado', 10)] : []
        ) : [];
      const l = mkLead(p.uid, etapa, i, {
        qualificacao: i / p.etapas.length < p.qualif ? { finalidade: ['Moradia'] } : {},
        ...(hist.length ? { etapasHist: hist } : {}),
        // um lead NOVO desta semana ainda sem 1º contato (aparece na lista nominal)
        ...(p.uid === 'demo-2' && i === 3 ? { createdAt: d(2), circuito: { desde: d(2), tentativas: 0 } } : {}),
        ...(etapa === ETAPA_DESCARTADO ? { descartadoMotivo: i % 2 ? 'Sem perfil' : 'Comprou com outro', descartadoEm: d(5), circuito: { desde: d(5), tentativas: 1 } } : {}),
      });
      leads.push(l);
      const toques = Math.max(0, 6 - p.ativoHa);
      atividade.set(l.id, {
        // crescente, como o useAtividade entrega (o cálculo de cadência conta com isso)
        eventos: Array.from({ length: toques }, (_, k) => ({ ms: agora - (p.ativoHa + (toques - 1 - k) * 2) * DIA, tipo: 'Ligação' })),
        tarefas: [{ id: `t-${l.id}`, tipo: 'Ligação', status: i % 3 === 0 ? 'pendente' : 'concluída', dueMs: agora - (i % 3 === 0 ? 4 : 10) * DIA, concluidaMs: i % 3 === 0 ? 0 : agora - (i % 2 ? 2 : 9) * DIA }],
      });
    });
  });

  // uma venda NESTA semana e uma antiga (o semanal mostra o delta)
  const vendas: (VendaGestao & { leadId?: string })[] = [
    { id: 'vd1', corretorUid: 'demo-1', leadId: 'demo-1-1', status: 'assinada', dataVenda: ymd(16), vgvLiquido: 800_000, comissaoBruta: 40_000, rateio: [{ papel: 'corretor', valor: 18_180 }] },
    { id: 'vd2', corretorUid: 'demo-1', leadId: 'demo-1-0', status: 'assinada', dataVenda: ymd(2), vgvLiquido: 650_000, comissaoBruta: 32_500, rateio: [{ papel: 'corretor', valor: 14_771 }] },
  ];

  return { leads, corretores, vendas, atividade, selecionados: new Set(perfis.map((p) => p.uid)) };
}

export function gestaoDemo(): GestaoResumo {
  const d = dadosDemo();
  return computeGestao(d.leads, d.corretores, d.vendas, d.atividade, d.selecionados);
}
