/**
 * MATURIDADE DAS MÉTRICAS — o que já dá pra cobrar hoje, e o que ainda não.
 *
 * O time começou a usar o CRM em 15/07 e várias métricas nasceram depois.
 * A tentação é esperar 3 meses de base pra "poder gerir" — mas aí são 3
 * meses sem gestão. A saída é separar as métricas pelo que elas de fato
 * exigem de histórico:
 *
 *   ESTADO    — foto do agora. Não precisa de passado NENHUM. "Você tem 11
 *               tarefas vencidas" é verdade hoje, com um dia de base.
 *               É a dívida acumulada: o que mais dói e o que mais rende
 *               cobrança imediata.
 *   RITMO     — cada lead novo é uma observação, então acumula rápido.
 *               Duas semanas e uma dúzia de casos já dão mediana honesta.
 *   CONVERSÃO — precisa de gente ATRAVESSANDO o funil. Com pouco volume
 *               vira loteria: 1 venda em 3 leads não é "33% de conversão".
 *   TENDÊNCIA — precisa de dois períodos comparáveis. Sem isso, "melhorou"
 *               não existe.
 *
 * A régua que substitui o tempo enquanto ele não passa é a COMPARAÇÃO ENTRE
 * PARES: todo mundo começou junto, então comparar um corretor com a mediana
 * do time hoje é justo desde o primeiro dia — e não depende de passado.
 */

export const DIA = 24 * 60 * 60 * 1000;

export type TipoMetrica = 'estado' | 'ritmo' | 'conversao' | 'tendencia';
export type Maturidade = 'pronta' | 'formando' | 'insuficiente';

export interface RegraMetrica {
  chave: string;
  rotulo: string;
  tipo: TipoMetrica;
  /** dias de base necessários pra métrica valer */
  diasMin: number;
  /** observações necessárias (leads, transições, tarefas… conforme a métrica) */
  amostraMin: number;
  /** o que fazer com ela HOJE */
  usoHoje: string;
}

/** As regras por tipo — o que cada família exige pra ser levada a sério. */
const EXIGENCIA: Record<TipoMetrica, { diasMin: number; amostraMin: number }> = {
  estado: { diasMin: 0, amostraMin: 1 },
  ritmo: { diasMin: 14, amostraMin: 8 },
  conversao: { diasMin: 45, amostraMin: 20 },
  tendencia: { diasMin: 56, amostraMin: 30 },
};

export const METRICAS: RegraMetrica[] = [
  // ── ESTADO: cobrança imediata, valem desde o primeiro dia ──
  { chave: 'sem_primeiro_contato', rotulo: 'Leads sem 1º contato', tipo: 'estado', ...EXIGENCIA.estado, usoHoje: 'Cobre agora, um por um. É lead pago esfriando.' },
  { chave: 'parados', rotulo: 'Leads parados sem toque', tipo: 'estado', ...EXIGENCIA.estado, usoHoje: 'A lista nominal é a pauta da segunda-feira.' },
  { chave: 'tarefas_vencidas', rotulo: 'Tarefas vencidas em aberto', tipo: 'estado', ...EXIGENCIA.estado, usoHoje: 'Disciplina não precisa de histórico: ou está em dia, ou não está.' },
  { chave: 'sem_tarefa_futura', rotulo: 'Leads sem próximo passo agendado', tipo: 'estado', ...EXIGENCIA.estado, usoHoje: 'O melhor preditor de abandono. Exija agenda pra todo lead ativo.' },
  { chave: 'sem_anotacao', rotulo: 'Leads sem anotação', tipo: 'estado', ...EXIGENCIA.estado, usoHoje: 'Mede registro, não venda — mas sem registro nada mais é auditável.' },
  { chave: 'sem_qualificacao', rotulo: 'Leads sem qualificação', tipo: 'estado', ...EXIGENCIA.estado, usoHoje: 'Quem agenda meet sem saber quem é o cliente trabalha no escuro.' },
  { chave: 'funil_atual', rotulo: 'Distribuição do funil hoje', tipo: 'estado', ...EXIGENCIA.estado, usoHoje: 'Mostra onde a carteira está empoçada agora.' },

  // ── A métrica da FASE 1 ──
  // Nas primeiras rodadas o achado dominante será "falou no WhatsApp e não
  // registrou no CRM". Isso não é ruído a ignorar: é o gargalo certo do
  // momento. Enquanto o registro não for fiel, TODAS as outras métricas
  // medem o registro, não o atendimento — cobrar fidelidade primeiro é o que
  // destrava o resto. E é barato: não exige técnica nova, exige disciplina.
  { chave: 'fidelidade_crm', rotulo: 'Fidelidade do CRM (o que aconteceu × o que foi registrado)', tipo: 'estado', ...EXIGENCIA.estado, usoHoje: 'O gargalo esperado da fase inicial. Cobre com o print do WhatsApp ao lado da timeline — sem registro fiel, nenhum outro número vale.' },

  // ── RITMO: cada lead é uma observação, acumula rápido ──
  { chave: 'tempo_1o_contato', rotulo: 'Tempo até o 1º contato', tipo: 'ritmo', ...EXIGENCIA.ritmo, usoHoje: 'Use a MEDIANA, nunca a média. Com poucos casos, olhe também o pior.' },
  { chave: 'aceite_rodizio', rotulo: 'Velocidade de aceite no rodízio', tipo: 'ritmo', ...EXIGENCIA.ritmo, usoHoje: 'Cada lead de anúncio é uma observação — é das que amadurece mais rápido.' },
  { chave: 'toques_por_lead', rotulo: 'Toques por lead ativo', tipo: 'ritmo', ...EXIGENCIA.ritmo, usoHoje: 'Contexto, não mérito: muito toque sem avanço é ruído.' },
  { chave: 'tarefas_no_prazo', rotulo: 'Tarefas concluídas no prazo', tipo: 'ritmo', ...EXIGENCIA.ritmo, usoHoje: 'Comportamento repetido — amadurece em poucas semanas.' },

  // ── CONVERSÃO: precisa de gente atravessando o funil ──
  { chave: 'passagem_etapas', rotulo: 'Conversão entre etapas do funil', tipo: 'conversao', ...EXIGENCIA.conversao, usoHoje: 'Ainda não conclua nada por corretor. Some o TIME — o agregado amadurece antes.' },
  { chave: 'no_show', rotulo: 'Comparecimento em meet/visita', tipo: 'conversao', ...EXIGENCIA.conversao, usoHoje: 'Com 2 ou 3 agendamentos não é taxa. Trate caso a caso, com nome.' },
  { chave: 'conversao_venda', rotulo: 'Conversão lead → venda', tipo: 'conversao', ...EXIGENCIA.conversao, usoHoje: 'O ciclo do imóvel é longo: quem entrou agora ainda nem teve tempo de fechar.' },
  { chave: 'ciclo_venda', rotulo: 'Ciclo médio lead → venda', tipo: 'conversao', ...EXIGENCIA.conversao, usoHoje: 'Só as vendas já fechadas contam, e elas enviesam pra baixo no começo.' },

  // ── TENDÊNCIA: precisa de dois períodos ──
  { chave: 'delta_periodo', rotulo: 'Melhorou/piorou vs período anterior', tipo: 'tendencia', ...EXIGENCIA.tendencia, usoHoje: 'Sem dois períodos cheios, "melhorou" é ruído. Compare com o TIME.' },
  { chave: 'serie_semanal', rotulo: 'Série semanal (tendência)', tipo: 'tendencia', ...EXIGENCIA.tendencia, usoHoje: 'Junte semanas até ter 8. Antes disso, leia como pontos soltos.' },
];

export interface AvaliacaoMetrica extends RegraMetrica {
  maturidade: Maturidade;
  diasDisponiveis: number;
  amostraAtual: number;
  /** frase pronta pro gestor: o que fazer com ela hoje */
  veredito: string;
}

export interface BaseDisponivel {
  /** desde quando existe dado utilizável (o começo real do uso do CRM) */
  desdeMs: number;
  agora?: number;
  /** volumes atuais que servem de amostra por família */
  amostras?: Partial<Record<string, number>>;
}

export function avaliarMetricas(base: BaseDisponivel): AvaliacaoMetrica[] {
  const agora = base.agora ?? Date.now();
  const dias = Math.max(0, Math.floor((agora - base.desdeMs) / DIA));
  return METRICAS.map((m) => {
    const amostra = base.amostras?.[m.chave] ?? 0;
    // ESTADO é sempre pronta: mede o agora, não depende de histórico nem de
    // volume acumulado. "Você tem 11 tarefas vencidas" é verdade com um dia
    // de base — tratá-la como "em formação" tiraria justamente a métrica que
    // mais rende cobrança nesta fase.
    if (m.tipo === 'estado') {
      return { ...m, maturidade: 'pronta' as Maturidade, diasDisponiveis: dias, amostraAtual: amostra, veredito: m.usoHoje };
    }
    const temDias = dias >= m.diasMin;
    const temAmostra = amostra >= m.amostraMin;
    const maturidade: Maturidade = temDias && temAmostra ? 'pronta'
      : (dias >= m.diasMin / 2 || amostra >= m.amostraMin / 2) ? 'formando' : 'insuficiente';
    const falta = m.diasMin - dias;
    const veredito = maturidade === 'pronta'
      ? m.usoHoje
      : maturidade === 'formando'
        ? `Em formação${falta > 0 ? ` (faltam ~${falta} dias)` : ` (${amostra} de ${m.amostraMin} casos)`} — olhe, mas não conclua sozinho. ${m.usoHoje}`
        : `Ainda não use pra cobrar${falta > 0 ? `: faltam ~${falta} dias de base` : `: só ${amostra} de ${m.amostraMin} casos`}. ${m.usoHoje}`;
    return { ...m, maturidade, diasDisponiveis: dias, amostraAtual: amostra, veredito };
  });
}

export const COR_MATURIDADE: Record<Maturidade, string> = {
  pronta: 'text-emerald-300',
  formando: 'text-amber-300',
  insuficiente: 'text-white/40',
};
export const SIMBOLO_MATURIDADE: Record<Maturidade, string> = {
  pronta: '●', formando: '◐', insuficiente: '○',
};
export const ROTULO_TIPO: Record<TipoMetrica, string> = {
  estado: 'Foto de agora — vale desde o 1º dia',
  ritmo: 'Ritmo — acumula rápido, cada lead é um caso',
  conversao: 'Conversão — precisa de volume atravessando o funil',
  tendencia: 'Tendência — precisa de dois períodos comparáveis',
};
