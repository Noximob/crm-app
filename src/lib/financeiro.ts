/**
 * Motor financeiro da Nox — regras da consultoria de 28/07/2026.
 *
 * A ordem canônica do rateio (01:22:37 da gravação):
 *   comissão bruta (VGV líquido × %)
 *     1) − imposto na fonte (alíquota parametrizada — confirmar com contador)
 *     2) − taxa de lead (retida pela casa, só quando a venda veio de LEAD)
 *     3) = base de rateio
 *     4) → corretor (faixas progressivas MARGINAIS por trimestre — como IR),
 *        gerente, SDR (racha o bloco do gerente quando originou a reunião),
 *        agenciador (10 p.p. que SAEM da fatia do corretor)
 *     5) = o que sobra é da casa
 *
 * Tudo é PARÂMETRO (configFinanceiro) — nenhum percentual é fixo no código.
 * Este módulo é puro (sem Firebase) de propósito: dá pra testar a matemática
 * dos critérios de aceite sem subir nada.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Faixa da progressão do corretor: até `ateVgv` (acumulado no trimestre) paga `pct`%. `ateVgv: null` = daí em diante. */
export interface FaixaComissao { ateVgv: number | null; pct: number }

/** Tabela de comissão com vigência — trocar a tabela NÃO recalcula vendas antigas (usa a da época). */
export interface TabelaVigencia { id: string; inicio: string; faixas: FaixaComissao[] }

export interface CategoriaCusto { nome: string; metaMensal: number }

export interface ConfigFinanceiro {
  /** Simples Nacional — ~9,1%; varia com faturamento acumulado 12m. CONFIRMAR com o contador. */
  aliquotaImpostoPct: number;
  /** Retenção da casa quando a venda veio de lead (custeia a geração de leads). */
  taxaLeadPct: number;
  /** % do gerente sobre a base. Consultoria oscilou 15–22 — CONFIRMAR. */
  gerentePct: number;
  /** % do BLOCO do gerente que vai pro SDR quando ele originou a reunião ("meia-meia"). CONFIRMAR. */
  sdrSplitPct: number;
  /** Pontos percentuais que saem da fatia do corretor vendedor quando o imóvel foi agenciado por outro. */
  agenciadorPontos: number;
  /** Parceria: exclui do VGV, ou conta parcial (percentual por venda). CONFIRMAR. */
  parceriaModo: 'exclui' | 'parcial';
  /** % de comissão padrão por tipo de produto (edição por venda permitida). */
  percLancamento: number;
  percPronto: number;
  percProntoCarteira: number;
  /** Tabelas de faixas do corretor, com vigência (histórico preservado). */
  tabelas: TabelaVigencia[];
  /** Linhas de custo fixo, cada uma com meta mensal ("meta de conta de luz"). */
  custoCategorias: CategoriaCusto[];
  atualizadoEm?: unknown;
  atualizadoPor?: string;
}

/** Defaults propostos pela consultoria — as 4 ambiguidades ficam marcadas pra confirmação. */
export const CONFIG_FINANCEIRO_DEFAULT: ConfigFinanceiro = {
  aliquotaImpostoPct: 9.1,
  taxaLeadPct: 10,
  gerentePct: 15,
  sdrSplitPct: 50,
  agenciadorPontos: 10,
  parceriaModo: 'exclui',
  percLancamento: 5,
  percPronto: 6,
  percProntoCarteira: 5,
  tabelas: [{
    id: 'inicial',
    inicio: '2026-07-01', // teste do trimestre de julho (01:21:25)
    faixas: [
      { ateVgv: 1_200_000, pct: 50 },
      { ateVgv: 1_700_000, pct: 55 },
      { ateVgv: null, pct: 60 },
    ],
  }],
  custoCategorias: [
    { nome: 'Estrutura / aluguel', metaMensal: 0 },
    { nome: 'Tecnologia', metaMensal: 0 },
    { nome: 'Marketing / tráfego', metaMensal: 0 },
    { nome: 'Engajamento do time', metaMensal: 0 },
    { nome: 'Prestadores (social media, jurídico, contador)', metaMensal: 0 },
    { nome: 'Utilidades (luz, água, internet)', metaMensal: 0 },
  ],
};

/** O que ainda precisa de confirmação da Nox (item 1.5 do briefing) — mostrado na tela de config. */
export const PENDENCIAS_CONFIG: { campo: keyof ConfigFinanceiro | string; aviso: string }[] = [
  { campo: 'aliquotaImpostoPct', aviso: 'Confirmar alíquota efetiva do Simples com o contador (varia com o faturamento 12m; a gravação oscilou entre ~9 e 10%).' },
  { campo: 'gerentePct', aviso: 'Teto do gerente ficou ambíguo na consultoria (15–22% vs 15–19%). Confirmar a escala.' },
  { campo: 'sdrSplitPct', aviso: 'Split SDR/gerente ("meia-meia… uns 30%") não fecha com o teto do gerente. Confirmar o bloco.' },
  { campo: 'parceriaModo', aviso: 'Parceria: exclui do VGV ou conta parcial? A fala foi ambígua — hoje o ajuste é manual.' },
  { campo: 'sdrSplitPct', aviso: 'Venda com SDR e SEM gerente: a consultoria não definiu quem paga o SDR — hoje o valor fica com a casa. Confirmar.' },
];

export type PapelRateio = 'corretor' | 'gerente' | 'sdr' | 'agenciador' | 'casa';
export type StatusNota = 'pendente' | 'emitida' | 'dispensada';
export type StatusVenda = 'pre_reserva' | 'pendente_confirmacao' | 'assinada' | 'distratada';
export type TipoProduto = 'lancamento' | 'pronto' | 'pronto_carteira';
export type OrigemVenda = 'lead' | 'carteira' | 'ligacao_ativa' | 'outro';

export interface Beneficiario {
  papel: PapelRateio;
  uid?: string;
  nome?: string;
  /** % efetivo sobre a base de rateio (informativo — corretor é média das faixas). */
  pct?: number;
  valor: number;
  statusNota: StatusNota;
  pago?: boolean;
  pagoEm?: unknown;
}

export interface Recebivel { valorPrevisto: number; dataPrevista: string; recebidoEm?: unknown }

export interface AjusteVenda { em: unknown; por: string; porNome?: string; motivo: string; deltaCorretor: number }

export interface Venda {
  id: string;
  imobiliariaId: string;
  leadId?: string;
  leadNome?: string;
  corretorUid: string;
  corretorNome?: string;
  gerenteUid?: string; gerenteNome?: string;
  sdrUid?: string; sdrNome?: string;
  agenciadorUid?: string; agenciadorNome?: string;
  valorBruto: number;
  valorPermuta: number;
  parceriaPct: number;
  tipoProduto: TipoProduto;
  origem: OrigemVenda;
  construtora?: string;
  empreendimento?: string;
  status: StatusVenda;
  /** Competência: quando a venda foi assinada (YYYY-MM-DD). Caixa fica nos recebíveis. */
  dataVenda: string;
  percComissao: number;
  // ── calculados na oficialização (e recalculados em cascata) ──
  vgvLiquido?: number;
  comissaoBruta?: number;
  imposto?: number;
  retencaoLead?: number;
  baseRateio?: number;
  rateio?: Beneficiario[];
  /** true quando algum pagamento foi efetuado — o rateio congela; diferenças viram ajustes. */
  congelada?: boolean;
  ajustes?: AjusteVenda[];
  recebiveis?: Recebivel[];
  criadoEm?: unknown; criadoPor?: string;
  oficializadaEm?: unknown; oficializadaPor?: string;
  distratadaEm?: unknown; motivoDistrato?: string;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers de data / período
// ---------------------------------------------------------------------------

export const hojeYMD = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 'YYYY-MM' da competência. */
export const mesDe = (ymd: string): string => (ymd || '').slice(0, 7);

/** Trimestre CIVIL da data — o acumulador da progressão zera na virada (01:17:42). */
export const trimestreDe = (ymd: string): string => {
  const [a, m] = (ymd || '').split('-').map(Number);
  if (!a || !m) return '';
  return `${a}-T${Math.ceil(m / 3)}`;
};

export const labelTrimestre = (tri: string): string => {
  const [a, t] = tri.split('-T');
  return `${t}º tri ${a}`;
};

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------------------
// VGV líquido — permuta sai; parceria conforme o modo (item 1.1)
// ---------------------------------------------------------------------------

export function vgvLiquidoDe(valorBruto: number, valorPermuta: number, parceriaPct: number, modo: ConfigFinanceiro['parceriaModo']): number {
  const semPermuta = Math.max(0, (valorBruto || 0) - (valorPermuta || 0));
  if (!parceriaPct) return semPermuta;
  // 'exclui': a parte parceirada sai do VGV; 'parcial': conta o que ficou pra Nox
  // (na prática as duas fórmulas convergem — o campo por venda diz QUANTO é do parceiro)
  const fator = Math.max(0, 1 - Math.min(100, parceriaPct) / 100);
  return round2(semPermuta * (modo === 'exclui' ? fator : fator));
}

/** % de comissão padrão pelo tipo de produto. */
export function percComissaoPadrao(cfg: ConfigFinanceiro, tipo: TipoProduto): number {
  if (tipo === 'lancamento') return cfg.percLancamento;
  if (tipo === 'pronto') return cfg.percPronto;
  return cfg.percProntoCarteira;
}

/**
 * Tabela de faixas vigente NA DATA da venda (vigência mais recente ≤ data).
 * Venda ANTERIOR à 1ª vigência usa a MAIS ANTIGA — nunca a mais nova, senão
 * criar uma vigência futura mudaria retroativamente vendas antigas.
 */
export function tabelaVigente(cfg: ConfigFinanceiro, dataVenda: string): FaixaComissao[] {
  const ordenadas = [...(cfg.tabelas || [])].sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  const candidatas = ordenadas.filter((t) => t.inicio <= dataVenda);
  const t = candidatas[candidatas.length - 1] || ordenadas[0];
  return t?.faixas?.length ? t.faixas : CONFIG_FINANCEIRO_DEFAULT.tabelas[0].faixas;
}

// ---------------------------------------------------------------------------
// Faixas marginais (modelo IR): a progressão incide SÓ sobre o excedente
// ---------------------------------------------------------------------------

export interface ResultadoFaixas {
  /** frações da venda em cada faixa: [{pct da faixa, fração do VGV da venda}] */
  partes: { pct: number; fracao: number }[];
  /** % médio efetivo do corretor nesta venda */
  pctMedio: number;
  /** quanto falta de VGV pro próximo degrau (null = já está na última faixa) */
  proximaFaixa: { falta: number; pct: number } | null;
}

export function faixasMarginais(faixas: FaixaComissao[], acumuladoAntes: number, vgvVenda: number): ResultadoFaixas {
  const partes: { pct: number; fracao: number }[] = [];
  if (vgvVenda <= 0 || !faixas.length) return { partes: [{ pct: faixas[0]?.pct || 0, fracao: 1 }], pctMedio: faixas[0]?.pct || 0, proximaFaixa: null };

  let inicio = acumuladoAntes;
  const fim = acumuladoAntes + vgvVenda;
  let limiteAnterior = 0;
  for (const f of faixas) {
    const limite = f.ateVgv === null ? Infinity : f.ateVgv;
    const de = Math.max(inicio, limiteAnterior);
    const ate = Math.min(fim, limite);
    if (ate > de) partes.push({ pct: f.pct, fracao: (ate - de) / vgvVenda });
    limiteAnterior = limite;
    if (limite >= fim) break;
  }
  // acumulado além da última faixa com limite: cai na última (defensivo)
  const somaFracao = partes.reduce((s, p) => s + p.fracao, 0);
  if (somaFracao < 0.9999) {
    const ultima = faixas[faixas.length - 1];
    partes.push({ pct: ultima.pct, fracao: 1 - somaFracao });
  }
  const pctMedio = partes.reduce((s, p) => s + p.pct * p.fracao, 0);

  // próximo degrau a partir do acumulado FINAL
  let proximaFaixa: ResultadoFaixas['proximaFaixa'] = null;
  for (let i = 0; i < faixas.length; i++) {
    const limite = faixas[i].ateVgv;
    if (limite !== null && fim < limite) {
      proximaFaixa = { falta: round2(limite - fim), pct: faixas[i + 1]?.pct ?? faixas[i].pct };
      break;
    }
  }
  return { partes, pctMedio, proximaFaixa };
}

// ---------------------------------------------------------------------------
// O rateio de UMA venda (a conta inteira, na ordem canônica)
// ---------------------------------------------------------------------------

export interface EntradaRateio {
  cfg: ConfigFinanceiro;
  faixas: FaixaComissao[];
  vgvLiquido: number;
  percComissao: number;
  origemLead: boolean;
  /** VGV líquido já ASSINADO pelo corretor no trimestre ANTES desta venda. */
  acumuladoTrimestreAntes: number;
  temGerente: boolean;
  temSdr: boolean;
  temAgenciador: boolean;
}

export interface ResultadoRateio {
  comissaoBruta: number;
  imposto: number;
  retencaoLead: number;
  baseRateio: number;
  corretorValor: number;
  corretorPctMedio: number;
  gerenteValor: number;
  sdrValor: number;
  agenciadorValor: number;
  casaValor: number;
  margemCasaPct: number;
  proximaFaixa: { falta: number; pct: number } | null;
}

export function calcularRateio(e: EntradaRateio): ResultadoRateio {
  const comissaoBruta = round2(e.vgvLiquido * (e.percComissao / 100));
  // 1) imposto na fonte, sobre a comissão bruta
  const imposto = round2(comissaoBruta * (e.cfg.aliquotaImpostoPct / 100));
  // 2) taxa de lead — só quando a venda veio de lead (retida pela casa p/ custear a geração)
  const retencaoLead = e.origemLead ? round2(comissaoBruta * (e.cfg.taxaLeadPct / 100)) : 0;
  // 3) base de rateio
  const baseRateio = round2(comissaoBruta - imposto - retencaoLead);

  // 4) corretor: faixas marginais sobre o VGV do trimestre, aplicadas proporcionalmente à base
  const fx = faixasMarginais(e.faixas, e.acumuladoTrimestreAntes, e.vgvLiquido);
  const descontoAgenciador = e.temAgenciador ? e.cfg.agenciadorPontos : 0;
  const corretorValor = round2(fx.partes.reduce(
    (s, p) => s + baseRateio * p.fracao * (Math.max(0, p.pct - descontoAgenciador) / 100), 0
  ));
  const agenciadorValor = e.temAgenciador ? round2(baseRateio * (e.cfg.agenciadorPontos / 100)) : 0;

  // gerente (e SDR rachando o bloco do gerente quando originou a reunião).
  // SDR SEM gerente: a consultoria não definiu quem paga — regra literal é
  // "racha o bloco do gerente", e sem gerente não há bloco. O valor fica com
  // a casa até a Nox decidir (pendência registrada na tela de config).
  const blocoGerente = e.temGerente ? round2(baseRateio * (e.cfg.gerentePct / 100)) : 0;
  const sdrValor = e.temGerente && e.temSdr ? round2(blocoGerente * (e.cfg.sdrSplitPct / 100)) : 0;
  const gerenteValor = e.temGerente ? round2(blocoGerente - (e.temSdr ? sdrValor : 0)) : 0;

  // 5) casa = o que sobra da base (a retenção de lead também fica com a casa, mas é linha própria)
  const casaValor = round2(baseRateio - corretorValor - gerenteValor - sdrValor - agenciadorValor);
  const margemCasaPct = comissaoBruta > 0 ? (casaValor / comissaoBruta) * 100 : 0;

  return {
    comissaoBruta, imposto, retencaoLead, baseRateio,
    corretorValor, corretorPctMedio: fx.pctMedio,
    gerenteValor, sdrValor, agenciadorValor, casaValor, margemCasaPct,
    proximaFaixa: fx.proximaFaixa,
  };
}

/** Remove chaves `undefined` (o Firestore rejeita `undefined` em qualquer campo). */
function semUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) if (val !== undefined) out[k] = val;
  return out as T;
}

/** Monta o array `rateio` (beneficiários) de uma venda a partir do resultado. */
export function montarBeneficiarios(v: Venda, r: ResultadoRateio): Beneficiario[] {
  const manter = (papel: PapelRateio): Partial<Beneficiario> => {
    const antigo = (v.rateio || []).find((b) => b.papel === papel);
    return antigo ? semUndefined({ statusNota: antigo.statusNota, pago: antigo.pago, pagoEm: antigo.pagoEm }) : {};
  };
  const lista: Beneficiario[] = [
    semUndefined({ papel: 'corretor' as const, uid: v.corretorUid, nome: v.corretorNome, pct: round2(r.corretorPctMedio), valor: r.corretorValor, statusNota: 'pendente' as const, ...manter('corretor') }),
  ];
  if (r.gerenteValor > 0) lista.push(semUndefined({ papel: 'gerente' as const, uid: v.gerenteUid, nome: v.gerenteNome, valor: r.gerenteValor, statusNota: 'pendente' as const, ...manter('gerente') }));
  if (r.sdrValor > 0) lista.push(semUndefined({ papel: 'sdr' as const, uid: v.sdrUid, nome: v.sdrNome, valor: r.sdrValor, statusNota: 'pendente' as const, ...manter('sdr') }));
  if (r.agenciadorValor > 0) lista.push(semUndefined({ papel: 'agenciador' as const, uid: v.agenciadorUid, nome: v.agenciadorNome, valor: r.agenciadorValor, statusNota: 'pendente' as const, ...manter('agenciador') }));
  lista.push(semUndefined({ papel: 'casa' as const, valor: r.casaValor, statusNota: 'dispensada' as const, ...manter('casa') }));
  return lista;
}

// ---------------------------------------------------------------------------
// Cascata do trimestre: editar/distratar uma venda recalcula as POSTERIORES
// do mesmo corretor; venda com pagamento efetuado congela (delta vira ajuste)
// ---------------------------------------------------------------------------

export interface ResultadoCascata {
  vendaId: string;
  /** campos recalculados pra gravar (vazio quando congelada) */
  patch: Partial<Venda> | null;
  /** ajuste a registrar quando congelada e o valor do corretor mudou */
  ajuste: { deltaCorretor: number } | null;
}

/** Valor efetivo do corretor numa venda = rateio gravado + ajustes já emitidos. */
function corretorEfetivo(v: Venda): number {
  const congelado = (v.rateio || []).find((b) => b.papel === 'corretor')?.valor ?? 0;
  const ajustes = (v.ajustes || []).reduce((s, a) => s + (a.deltaCorretor || 0), 0);
  return round2(congelado + ajustes);
}

/**
 * Recalcula TODAS as vendas assinadas de um corretor num trimestre, em ordem
 * de data (empate: id). Retorna os patches a aplicar. Puro: quem chama decide
 * gravar. Distratadas/pendentes não entram no acumulador.
 *
 * IDEMPOTENTE: os deltas de venda congelada são calculados contra o valor
 * EFETIVO (rateio + ajustes já emitidos) — rodar a cascata de novo não duplica
 * ajuste nenhum. Distrato de venda congelada (já paga) gera o estorno do que
 * foi pago, também idempotente.
 */
export function recalcularTrimestre(vendasDoCorretor: Venda[], cfg: ConfigFinanceiro): ResultadoCascata[] {
  const assinadas = vendasDoCorretor
    .filter((v) => v.status === 'assinada')
    .sort((a, b) => (a.dataVenda === b.dataVenda ? String(a.id).localeCompare(String(b.id)) : a.dataVenda < b.dataVenda ? -1 : 1));

  const out: ResultadoCascata[] = [];
  let acumulado = 0;
  for (const v of assinadas) {
    const liquido = vgvLiquidoDe(v.valorBruto, v.valorPermuta, v.parceriaPct, cfg.parceriaModo);
    const faixas = tabelaVigente(cfg, v.dataVenda);
    const r = calcularRateio({
      cfg, faixas,
      vgvLiquido: liquido,
      percComissao: v.percComissao,
      origemLead: v.origem === 'lead',
      acumuladoTrimestreAntes: acumulado,
      temGerente: !!v.gerenteUid,
      temSdr: !!v.sdrUid,
      temAgenciador: !!v.agenciadorUid,
    });
    if (v.congelada) {
      // pagamento já efetuado: NÃO reescreve o rateio — a diferença vira ajuste
      // explícito, medida contra o efetivo (senão o mesmo delta re-emitiria a
      // cada nova cascata do trimestre).
      const delta = round2(r.corretorValor - corretorEfetivo(v));
      out.push({ vendaId: v.id, patch: null, ajuste: Math.abs(delta) >= 0.01 ? { deltaCorretor: delta } : null });
    } else {
      out.push({
        vendaId: v.id,
        patch: {
          vgvLiquido: liquido,
          comissaoBruta: r.comissaoBruta,
          imposto: r.imposto,
          retencaoLead: r.retencaoLead,
          baseRateio: r.baseRateio,
          rateio: montarBeneficiarios(v, r),
        },
        ajuste: null,
      });
    }
    acumulado += liquido; // congelada TAMBÉM soma no acumulador (o VGV dela aconteceu)
  }

  // Distrato de venda congelada (já paga): o que foi pago vira ESTORNO explícito
  // (alvo pós-distrato = corretor efetivo zero). Idempotente pelo mesmo motivo.
  for (const v of vendasDoCorretor) {
    if (v.status !== 'distratada' || !v.congelada) continue;
    const delta = round2(-corretorEfetivo(v));
    if (Math.abs(delta) >= 0.01) out.push({ vendaId: v.id, patch: null, ajuste: { deltaCorretor: delta } });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------

export const fmtBRL = (n: number): string =>
  (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const fmtBRL2 = (n: number): string =>
  (isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtPctBR = (n: number, dec = 1): string =>
  `${(isFinite(n) ? n : 0).toLocaleString('pt-BR', { maximumFractionDigits: dec })}%`;
