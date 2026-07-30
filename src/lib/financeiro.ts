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

/**
 * Faixa da progressão (até `ateVgv` de VGV acumulado no trimestre; null = daí
 * em diante), com a POLÍTICA COMPLETA por papel — espelho da matriz que rodava
 * no app de Comissões:
 *   corretor 50/55/60 (override do gerente 15/17/19) · SDR 40/45/50 (override
 *   20/22/24) · gerente venda própria 60/65/70 · autônomo 60/65/70 sem override.
 */
export interface FaixaComissao {
  ateVgv: number | null;
  /** % do corretor de equipe quando ELE vende */
  corretor: number;
  /** override do gerente sobre a venda do corretor */
  corretorOv: number;
  /** % do SDR quando ELE MESMO vende */
  sdr: number;
  /** override do gerente sobre a venda do SDR */
  sdrOv: number;
  /** % do gerente na venda PRÓPRIA (sem override — ele é o gerente) */
  gerenteProprio: number;
  /** % do corretor SEM equipe (autônomo) — sem gerente, sem override */
  autonomo: number;
}

/** Quem vendeu — define a coluna da matriz que remunera o vendedor. */
export type PapelVendedor = 'corretor' | 'sdr' | 'gerente' | 'autonomo';

/** Tabela de comissão com vigência — trocar a tabela NÃO recalcula vendas antigas (usa a da época). */
export interface TabelaVigencia { id: string; inicio: string; faixas: FaixaComissao[] }

export interface CategoriaCusto { nome: string; metaMensal: number }

export interface ConfigFinanceiro {
  /** Simples Nacional. O app de Comissões rodava 10% — confirmar com o contador. */
  aliquotaImpostoPct: number;
  /** Retenção da casa na venda de lead/propaganda (custeia a geração de leads). */
  taxaLeadPct: number;
  /** Nome da retenção nos relatórios (o app antigo chamava "Propaganda"). */
  taxaLeadLabel: string;
  /** Meta de VGV por pessoa no trimestre — define o teto da 1ª faixa. */
  metaPorPessoa: number;
  /** Tamanho de cada degrau seguinte (R$ de VGV). */
  faixaProgressiva: number;
  /** Trimestre corrente (o da Nox NÃO é civil: 06/07 → 05/10). */
  periodoInicio: string;
  periodoFim: string;
  /** % do BLOCO do gerente que vai pro SDR quando ele ORIGINOU a reunião ("meia-meia"). CONFIRMAR. */
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

/**
 * Defaults = a POLÍTICA REAL que rodava no app de Comissões (lida do doc
 * `nox/state` do projeto comissoes-nox em 28/07/2026), não valores inventados:
 *   imposto 10% · retenção "Propaganda" 10% · meta 1,2mi + degrau 500k
 *   corretor 50/55/60 (override 15/17/19) · SDR 32,5/36/39,5 (override IGUAL —
 *   é o "meia-meia" que a consultoria citou) · gerente e autônomo 60/65/70
 *   trimestre 06/07 → 05/10 (NÃO é civil)
 */
export const CONFIG_FINANCEIRO_DEFAULT: ConfigFinanceiro = {
  aliquotaImpostoPct: 10,
  taxaLeadPct: 10,
  taxaLeadLabel: 'Propaganda',
  metaPorPessoa: 1_200_000,
  faixaProgressiva: 500_000,
  periodoInicio: '2026-07-06',
  periodoFim: '2026-10-05',
  sdrSplitPct: 50,
  agenciadorPontos: 10,
  parceriaModo: 'exclui',
  percLancamento: 5,
  percPronto: 6,
  percProntoCarteira: 5,
  tabelas: [{
    id: 'inicial',
    inicio: '2026-07-06',
    faixas: [
      { ateVgv: 1_200_000, corretor: 50, corretorOv: 15, sdr: 32.5, sdrOv: 32.5, gerenteProprio: 60, autonomo: 60 },
      { ateVgv: 1_700_000, corretor: 55, corretorOv: 17, sdr: 36, sdrOv: 36, gerenteProprio: 65, autonomo: 65 },
      { ateVgv: null, corretor: 60, corretorOv: 19, sdr: 39.5, sdrOv: 39.5, gerenteProprio: 70, autonomo: 70 },
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
  { campo: 'aliquotaImpostoPct', aviso: 'O app de Comissões rodava 10%; a consultoria falou ~9,1% (Simples varia com o faturamento 12m). Confirmar com o contador.' },
  { campo: 'corretorOv', aviso: 'Override do gerente: o sócio falou "15–22%" mas a política em uso é 15/17/19. Confirmar a escala.' },
  { campo: 'sdrSplitPct', aviso: 'SDR que ORIGINOU a reunião racha o bloco do gerente. Sem gerente na venda, o valor fica com a casa — confirmar.' },
  { campo: 'parceriaModo', aviso: 'Parceria: exclui do VGV ou conta parcial? A fala foi ambígua — hoje o ajuste é manual.' },
];

/**
 * Normaliza um doc de configFinanceiro em QUALQUER formato pro atual:
 * - faixas antigas `{ateVgv, pct}` → `pct` vira a coluna do corretor;
 * - `gerentePct` fixo antigo → vira o override do corretor em todas as faixas;
 * - colunas ausentes (sdr/gerenteProprio/autonomo) → defaults da matriz do app.
 */
export function normalizarConfig(parcial: Partial<ConfigFinanceiro> | null | undefined): ConfigFinanceiro {
  const base = CONFIG_FINANCEIRO_DEFAULT;
  const d = (parcial || {}) as Partial<ConfigFinanceiro> & { gerentePct?: number };
  const ovLegado = typeof d.gerentePct === 'number' ? d.gerentePct : undefined;

  const normFaixa = (f: Partial<FaixaComissao> & { pct?: number }, i: number): FaixaComissao => {
    const padrao = base.tabelas[0].faixas[Math.min(i, base.tabelas[0].faixas.length - 1)];
    return {
      ateVgv: f.ateVgv === null ? null : (typeof f.ateVgv === 'number' ? f.ateVgv : padrao.ateVgv),
      corretor: f.corretor ?? f.pct ?? padrao.corretor,
      corretorOv: f.corretorOv ?? ovLegado ?? padrao.corretorOv,
      sdr: f.sdr ?? padrao.sdr,
      sdrOv: f.sdrOv ?? ovLegado ?? padrao.sdrOv,
      gerenteProprio: f.gerenteProprio ?? padrao.gerenteProprio,
      autonomo: f.autonomo ?? padrao.autonomo,
    };
  };

  const tabelas: TabelaVigencia[] = (d.tabelas?.length ? d.tabelas : base.tabelas).map((t, ti) => ({
    id: t.id || `v${ti + 1}`,
    inicio: t.inicio || base.tabelas[0].inicio,
    faixas: (t.faixas?.length ? t.faixas : base.tabelas[0].faixas).map((f, i) => normFaixa(f as Partial<FaixaComissao> & { pct?: number }, i)),
  }));

  return {
    aliquotaImpostoPct: d.aliquotaImpostoPct ?? base.aliquotaImpostoPct,
    taxaLeadPct: d.taxaLeadPct ?? base.taxaLeadPct,
    taxaLeadLabel: d.taxaLeadLabel ?? base.taxaLeadLabel,
    metaPorPessoa: d.metaPorPessoa ?? base.metaPorPessoa,
    faixaProgressiva: d.faixaProgressiva ?? base.faixaProgressiva,
    periodoInicio: d.periodoInicio ?? base.periodoInicio,
    periodoFim: d.periodoFim ?? base.periodoFim,
    sdrSplitPct: d.sdrSplitPct ?? base.sdrSplitPct,
    agenciadorPontos: d.agenciadorPontos ?? base.agenciadorPontos,
    parceriaModo: d.parceriaModo ?? base.parceriaModo,
    percLancamento: d.percLancamento ?? base.percLancamento,
    percPronto: d.percPronto ?? base.percPronto,
    percProntoCarteira: d.percProntoCarteira ?? base.percProntoCarteira,
    tabelas,
    custoCategorias: d.custoCategorias?.length ? d.custoCategorias : base.custoCategorias,
    atualizadoEm: d.atualizadoEm,
    atualizadoPor: d.atualizadoPor,
  };
}

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
  /** Papel de QUEM vendeu — define a coluna da matriz (default: corretor de equipe). */
  papelVendedor?: PapelVendedor;
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

/** Trimestre CIVIL da data — usado quando não há período configurado. */
export const trimestreDe = (ymd: string): string => {
  const [a, m] = (ymd || '').split('-').map(Number);
  if (!a || !m) return '';
  return `${a}-T${Math.ceil(m / 3)}`;
};

const diaMs = (ymd: string) => Date.parse(`${ymd}T00:00:00`);
const somaMeses = (ymd: string, n: number) => {
  const [a, m, d] = ymd.split('-').map(Number);
  const x = new Date(a, (m - 1) + n, d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/**
 * Período de apuração da data — o "trimestre" que zera o acumulador.
 * O trimestre da Nox NÃO é civil (roda 06/07 → 05/10), então quando há
 * `periodoInicio` configurado a régua são janelas de 3 meses ancoradas nele
 * (pra frente e pra trás). Sem config, cai no trimestre civil.
 */
export function periodoDe(ymd: string, cfg?: Pick<ConfigFinanceiro, 'periodoInicio'>): string {
  const ancora = cfg?.periodoInicio;
  if (!ancora || !ymd) return trimestreDe(ymd);
  const alvo = diaMs(ymd);
  if (Number.isNaN(alvo)) return trimestreDe(ymd);
  // caminha de 3 em 3 meses até a janela que contém a data
  let ini = ancora;
  let guarda = 0;
  while (diaMs(ini) > alvo && guarda++ < 200) ini = somaMeses(ini, -3);
  guarda = 0;
  while (diaMs(somaMeses(ini, 3)) <= alvo && guarda++ < 200) ini = somaMeses(ini, 3);
  return ini; // o id do período é a data de início (YYYY-MM-DD)
}

/** Fim do período (dia anterior ao início do próximo). */
export const fimDoPeriodo = (inicioYMD: string): string => {
  const prox = somaMeses(inicioYMD, 3);
  const d = new Date(diaMs(prox) - 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const brDia = (ymd: string) => ymd.split('-').reverse().join('/');

export const labelTrimestre = (tri: string): string => {
  if (/^\d{4}-T\d$/.test(tri)) { const [a, t] = tri.split('-T'); return `${t}º tri ${a}`; }
  if (/^\d{4}-\d{2}-\d{2}$/.test(tri)) return `${brDia(tri)} a ${brDia(fimDoPeriodo(tri))}`;
  return tri;
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

/**
 * Reancora os limites das faixas a partir de "meta por pessoa" + "degrau"
 * (como o app antigo derivava: 1ª faixa até a meta, depois +degrau por faixa).
 * Preserva os percentuais já digitados na matriz.
 */
export function limitesPorMetaEDegrau(faixas: FaixaComissao[], meta: number, degrau: number): FaixaComissao[] {
  return faixas.map((f, i) => ({
    ...f,
    ateVgv: i === faixas.length - 1 ? null : meta + degrau * i,
  }));
}

/** Coluna da matriz que remunera o VENDEDOR, pelo papel dele. */
export const pctVendedorDaFaixa = (f: FaixaComissao, papel: PapelVendedor): number =>
  papel === 'corretor' ? f.corretor : papel === 'sdr' ? f.sdr : papel === 'gerente' ? f.gerenteProprio : f.autonomo;

/** Override do gerente pela faixa — só existe sobre venda de corretor ou de SDR. */
export const pctOverrideDaFaixa = (f: FaixaComissao, papel: PapelVendedor): number =>
  papel === 'corretor' ? f.corretorOv : papel === 'sdr' ? f.sdrOv : 0;

export interface ResultadoFaixas {
  /** frações da venda em cada faixa (a faixa inteira — quem consome escolhe a coluna) */
  partes: { faixa: FaixaComissao; fracao: number }[];
  /** quanto falta de VGV pro próximo degrau (pct = coluna do corretor, pra exibição) */
  proximaFaixa: { falta: number; pct: number } | null;
}

export function faixasMarginais(faixas: FaixaComissao[], acumuladoAntes: number, vgvVenda: number): ResultadoFaixas {
  const partes: { faixa: FaixaComissao; fracao: number }[] = [];
  if (vgvVenda <= 0 || !faixas.length) return { partes: faixas.length ? [{ faixa: faixas[0], fracao: 1 }] : [], proximaFaixa: null };

  const inicio = acumuladoAntes;
  const fim = acumuladoAntes + vgvVenda;
  let limiteAnterior = 0;
  for (const f of faixas) {
    const limite = f.ateVgv === null ? Infinity : f.ateVgv;
    const de = Math.max(inicio, limiteAnterior);
    const ate = Math.min(fim, limite);
    if (ate > de) partes.push({ faixa: f, fracao: (ate - de) / vgvVenda });
    limiteAnterior = limite;
    if (limite >= fim) break;
  }
  // acumulado além da última faixa com limite: cai na última (defensivo)
  const somaFracao = partes.reduce((s, p) => s + p.fracao, 0);
  if (somaFracao < 0.9999) partes.push({ faixa: faixas[faixas.length - 1], fracao: 1 - somaFracao });

  // próximo degrau a partir do acumulado FINAL
  let proximaFaixa: ResultadoFaixas['proximaFaixa'] = null;
  for (let i = 0; i < faixas.length; i++) {
    const limite = faixas[i].ateVgv;
    if (limite !== null && fim < limite) {
      proximaFaixa = { falta: round2(limite - fim), pct: faixas[i + 1]?.corretor ?? faixas[i].corretor };
      break;
    }
  }
  return { partes, proximaFaixa };
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
  /** VGV líquido já ASSINADO pelo vendedor no trimestre ANTES desta venda. */
  acumuladoTrimestreAntes: number;
  /** Papel de quem vendeu — define a coluna da matriz (corretor/sdr/gerente/autônomo). */
  papelVendedor: PapelVendedor;
  temGerente: boolean;
  /** SDR que ORIGINOU a reunião (racha o bloco do gerente) — não confundir com SDR vendedor. */
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
  const papel = e.papelVendedor || 'corretor';
  const comissaoBruta = round2(e.vgvLiquido * (e.percComissao / 100));
  // 1) imposto na fonte, sobre a comissão bruta
  const imposto = round2(comissaoBruta * (e.cfg.aliquotaImpostoPct / 100));
  // 2) taxa de lead — só quando a venda veio de lead (retida pela casa p/ custear a geração)
  const retencaoLead = e.origemLead ? round2(comissaoBruta * (e.cfg.taxaLeadPct / 100)) : 0;
  // 3) base de rateio
  const baseRateio = round2(comissaoBruta - imposto - retencaoLead);

  // 4) VENDEDOR: coluna da matriz do papel dele, marginal sobre o VGV do
  //    trimestre, aplicada proporcionalmente à base
  const fx = faixasMarginais(e.faixas, e.acumuladoTrimestreAntes, e.vgvLiquido);
  const descontoAgenciador = e.temAgenciador ? e.cfg.agenciadorPontos : 0;
  const corretorValor = round2(fx.partes.reduce(
    (s, p) => s + baseRateio * p.fracao * (Math.max(0, pctVendedorDaFaixa(p.faixa, papel) - descontoAgenciador) / 100), 0
  ));
  const corretorPctMedio = fx.partes.reduce((s, p) => s + pctVendedorDaFaixa(p.faixa, papel) * p.fracao, 0);
  const agenciadorValor = e.temAgenciador ? round2(baseRateio * (e.cfg.agenciadorPontos / 100)) : 0;

  // OVERRIDE do gerente: só sobre venda de corretor/SDR de equipe, TAMBÉM pela
  // faixa da venda (15/17/19 corretor · 20/22/24 SDR — a escala do app antigo).
  // Gerente vendendo ou autônomo: sem override. SDR ORIGINADOR racha o bloco.
  const blocoGerente = e.temGerente ? round2(fx.partes.reduce(
    (s, p) => s + baseRateio * p.fracao * (pctOverrideDaFaixa(p.faixa, papel) / 100), 0
  )) : 0;
  const sdrValor = blocoGerente > 0 && e.temSdr ? round2(blocoGerente * (e.cfg.sdrSplitPct / 100)) : 0;
  const gerenteValor = round2(blocoGerente - sdrValor);

  // 5) casa = o que sobra da base (a retenção de lead também fica com a casa, mas é linha própria)
  const casaValor = round2(baseRateio - corretorValor - gerenteValor - sdrValor - agenciadorValor);
  const margemCasaPct = comissaoBruta > 0 ? (casaValor / comissaoBruta) * 100 : 0;

  return {
    comissaoBruta, imposto, retencaoLead, baseRateio,
    corretorValor, corretorPctMedio,
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
  // (quem chama já agrupou por corretor + período — ver periodoDe)
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
      papelVendedor: v.papelVendedor || 'corretor',
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
