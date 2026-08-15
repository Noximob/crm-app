/**
 * AUDITORIA DE ATENDIMENTO — as diretrizes (a régua) e as contas de tempo.
 *
 * O CRM monta um pacote de dados de um corretor; a análise acontece FORA,
 * cruzando o que está registrado aqui com as conversas reais de WhatsApp.
 * Este módulo guarda a régua contra a qual esse cruzamento é julgado.
 *
 * Duas decisões da casa moram aqui e valem pra todo o resto:
 *
 * 1. HORÁRIO ÚTIL — das 20h às 9h não conta. Não dá pra cobrar cadência de
 *    madrugada: um lead que entra 22h e é atendido 9h05 do dia seguinte
 *    esperou 11 horas no relógio e ~5 minutos úteis. É o número útil que
 *    entra na cobrança.
 * 2. TEMPO DE REGISTRO ≠ TEMPO DE ATENDIMENTO — o CRM só sabe quando o
 *    corretor ANOTOU. Quem ficou 2h em ligação e anotou depois aparece como
 *    lento aqui e rápido no WhatsApp. O pacote leva o aviso junto.
 */
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const HORA = 3_600_000;

/**
 * Quando o time começou a USAR o CRM de verdade. Antes disso a base existe
 * mas está vazia de trabalho — puxar período anterior faz o corretor parecer
 * parado quando na verdade o sistema é que não estava em uso. Toda tela de
 * auditoria ancora o período aqui.
 */
export const DADOS_CONFIAVEIS_DESDE = '2026-07-15';
export const dadosConfiaveisDesdeMs = (): number => {
  const [a, m, d] = DADOS_CONFIAVEIS_DESDE.split('-').map(Number);
  return new Date(a, m - 1, d).getTime();
};

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface PassoCadencia {
  contato: number;
  /** dia ÚTIL de cadência contado a partir da entrada do lead (0 = mesmo dia) */
  dia: number;
  acao: string;
}

export interface HorarioUtil {
  /** hora em que a cobrança começa a contar (0-23) */
  inicioHora: number;
  /** hora em que para de contar (0-23, maior que inicioHora) */
  fimHora: number;
  contarSabado: boolean;
  contarDomingo: boolean;
}

export interface PrazosAuditoria {
  /** minutos ÚTEIS até o 1º contato ser registrado */
  primeiroContatoMaximoMin: number;
  /** horas ÚTEIS de atraso a partir das quais a tarefa "deixou atrasar" */
  tarefaAtrasadaHoras: number;
  /** dias corridos sem nenhum toque pra o lead virar "parado" */
  leadParadoDias: number;
}

export interface PromptsAuditoria {
  principal: string;
  formatoRelatorio: string;
  instrucoesLeitura: string;
}

export interface DiretrizesAuditoria {
  /** rótulo da versão vigente — vai em meta.versao_diretrizes de todo pacote */
  versao: string;
  cadencia: PassoCadencia[];
  prazos: PrazosAuditoria;
  horarioUtil: HorarioUtil;
  /** o que conta como descarte legítimo — a casa preenche, não inventamos */
  criteriosDescarteValido: string[];
  /** quanto vale cada dimensão na nota — a casa preenche */
  pesosAvaliacao: { dimensao: string; peso: number }[];
  tomDoRelatorio: string;
  prompts: PromptsAuditoria;
  atualizadoEm?: unknown;
  atualizadoPor?: string;
}

// ---------------------------------------------------------------------------
// Padrão — a cadência dos 6 contatos que a casa usa hoje
// ---------------------------------------------------------------------------

export const CADENCIA_PADRAO: PassoCadencia[] = [
  { contato: 1, dia: 0, acao: 'Ligação imediata. Se não atender, áudio se identificando, explicando o motivo e perguntando o melhor horário.' },
  { contato: 2, dia: 1, acao: 'Ligar em período oposto ao da 1ª tentativa. Se não atender, mandar o conteúdo do áudio por escrito.' },
  { contato: 3, dia: 3, acao: '5 fotos ou vídeo do decorado + mensagem curta + áudio com pitch de 40 segundos.' },
  { contato: 4, dia: 4, acao: 'Nova ligação.' },
  { contato: 5, dia: 7, acao: 'Mensagem descontraída pedindo horário na agenda, inclusive fora do horário comercial.' },
  { contato: 6, dia: 10, acao: 'Mensagem de encerramento, deixando a porta aberta.' },
];

// ---------------------------------------------------------------------------
// Prompts padrão da análise — escritos em cima do JSON real que esta tela
// gera (por isso citam meta.avisos, campos null e a regra do descartado).
// Editáveis na tela; o botão "restaurar prompts" traz estes de volta.
// ---------------------------------------------------------------------------

export const PROMPT_PRINCIPAL_PADRAO = `Você é o gerente de vendas da Nox Imóveis. Metódico, direto e justo.

Sua função é auditar o atendimento de um corretor cruzando o que está
registrado no CRM com as conversas reais no WhatsApp, e identificar o
GARGALO dele — o erro principal que, corrigido, destrava o resto.

Você recebe um pacote JSON com:
- diretrizes: as regras vigentes da casa (cadência, prazos, horário útil,
  critérios de descarte, pesos, tom). Elas são a régua. Use-as, não
  invente critério próprio.
- meta.avisos: leia PRIMEIRO e respeite. Contêm limitações reais da base
  que mudam a interpretação dos números.
- meta.campos_indisponiveis e metricas_indisponiveis_no_periodo: campos
  null significam "a base não mede", não "o corretor não fez". Nunca
  cobre alguém por um null.
- panorama: números da base completa do corretor no período.
- historico: rodadas anteriores, com o gargalo apontado e a instrução dada.
- amostra: os leads a auditar, com timeline e dados do CRM.

POSTURA
- Fatos e acordos. Nunca traços de personalidade, nunca tipologia.
- Toda afirmação sobre o corretor vem com evidência: lead, data e trecho.
- Sem evidência, você escreve "não verificável". Não preenche com suposição.
- Não suaviza. Se o atendimento foi ruim, diga que foi ruim e mostre onde.
- Não faz lista de defeitos. Fecha em UM gargalo.

ORDEM DE TRABALHO
1. Leia meta.avisos e as diretrizes.
2. Leia o panorama e forme uma hipótese de gargalo antes de abrir qualquer
   conversa.
3. Abra as conversas do WhatsApp e confirme ou derrube essa hipótese.
4. Compare o histórico: a instrução da rodada anterior foi cumprida?
5. Feche em um gargalo, com evidências.

O PANORAMA DIZ O QUÊ. O WHATSAPP DIZ O PORQUÊ.
Não recalcule no WhatsApp o que o panorama já mede. Use a conversa para
explicar o número, não para reproduzi-lo.

O QUE PROCURAR EM CADA CONVERSA
- Pergunta do cliente sem resposta
- Vácuo: última mensagem é do cliente, há quantos dias
- Promessa feita e não cumprida
- Divergência entre a conversa e o que está no CRM
- Defasagem: quanto tempo depois da conversa ele registrou
- Descoberta: levantou finalidade, "por que agora", situação atual,
  capacidade financeira e quem decide junto
- Escuta: o que o cliente falou reapareceu no pitch, ou veio discurso padrão
- Objeção: identificou, tratou, ou desconversou
- Fechamento: propôs meet, visita ou ligação — e como
- Próximo passo definido ao fim da conversa (indicador mais preditivo)
- Cadência: quais dos 6 contatos aconteceram e quando
- Material enviado: fotos, vídeo do decorado, tabela — e em que momento

=========================================================================
QUALIDADE DA CONVERSA — o que SÓ o WhatsApp mostra
=========================================================================
Estas dimensões não existem no CRM. São o motivo de a auditoria cruzar as
duas fontes, e é aqui que se descobre POR QUE um corretor com bom volume
não converte.

Regra que vale para todas: registre COMPORTAMENTO OBSERVADO com trecho e
data. Nunca rótulo de pessoa. "Escreveu 'vc' e 'blz' em 8 das 10 conversas,
inclusive com cliente de imóvel de 1,2M" é achado. "É desleixado" é ofensa
disfarçada de análise — e o corretor derruba em dois minutos de reunião.

1) RITMO E RECIPROCIDADE
- Tempo que ELE leva pra responder dentro da conversa já iniciada (isso é
  diferente do 1º contato: aqui o cliente já está falando com ele).
- Vácuo: quem deixou quem esperando, e quanto tempo. Vácuo do corretor
  depois de o cliente demonstrar interesse é o erro mais caro que existe.
- Proporção da conversa: quem fala mais? Conversa saudável tem troca. Se o
  corretor manda 10 e o cliente responde "ok", não houve conversa.
- Quem encerra: se é sempre o cliente que some, veja o que veio antes.

2) FORMATO — ESCRITA × ÁUDIO
- Proporção de áudio e texto enviados por ele.
- Duração de cada áudio. Acima de 2 minutos é sinal de risco.
- ADEQUAÇÃO AO CLIENTE: cliente que só escreve e recebe áudio longo é
  desalinho de canal — anote. O contrário também (cliente que manda áudio e
  recebe texto seco).
- Rajada: sete mensagens curtas seguidas em vez de uma organizada.
- Áudio para informação que precisa ficar registrada (valores, condições,
  endereço) é erro: o cliente não consegue reler.

3) ESCRITA E CREDIBILIDADE
- Erros de português que comprometem a autoridade de quem vende imóvel de
  alto valor. Não é perfeccionismo: é o que o cliente pensa ao ler.
- Abreviação excessiva (vc, blz, tb, pfv) — pese pelo ticket do imóvel.
- CAPS LOCK, excesso de emoji, pontuação agressiva ("???").
- Mensagem claramente copiada e colada entre leads diferentes: compare as
  conversas entre si. Pitch padrão sem uma linha personalizada é achado.

4) RAPPORT
- Chamou o cliente pelo nome.
- Retomou algo que o cliente falou antes (filho, mudança, prazo, trabalho).
- Adaptou o tom ao do cliente, em vez de despejar o mesmo script.
- Perguntou algo além do imóvel.
- SINAIS DE VOLTA (o mais confiável): o cliente responde rápido, manda
  áudio, usa emoji, agradece, conta algo pessoal. Rapport não se mede pelo
  que o corretor faz, e sim pelo que o cliente devolve.

5) CONDUÇÃO COMERCIAL
- Fez pergunta aberta ou só respondeu o que perguntaram? Corretor que só
  responde é atendente, não vendedor.
- Ancorou valor (localização, obra, potencial) antes de falar preço?
- Diante do silêncio, insistiu com ângulo NOVO ou repetiu a mesma mensagem?
- Ofereceu alternativa quando o imóvel não serviu, ou deixou morrer?

SOBRE ÁUDIO
Você não consegue ouvir. Não tente e não suponha o conteúdo. Registre
quantidade, duração, quem enviou e em que ponto da conversa. Se boa parte
do atendimento for áudio, registre isso como achado estrutural: o CRM nunca
vai refletir o que foi dito, e a auditoria fica cega nessa parte.

O QUE NÃO FAZER
- Não invente o que não conseguiu ler.
- Não cobre demora usando só o CRM: o carimbo mede quando ele REGISTROU,
  não quando falou com o cliente. Confirme no WhatsApp antes.
- Não trate lead descartado da amostra como abandono: ele foi para outro
  corretor.
- Não dê nota geral sem evidência anexada.

FASE DA BASE (leia antes de escolher o gargalo)
O time começou a usar o CRM em julho/2026. Nas primeiras rodadas, o achado
mais comum vai ser "atendeu no WhatsApp e não registrou no CRM". Isso NÃO é
detalhe burocrático: enquanto o registro não for fiel, todo número deste
pacote mede o registro, não o atendimento.

Então:
- Se a divergência aparecer na maioria dos leads, ela É o gargalo. Aponte-a
  mesmo havendo outros problemas — é a que destrava as demais.
- Separe sempre "não fez" de "fez e não registrou". São conversas
  diferentes: a primeira é atitude, a segunda é disciplina de registro.
- Quando o atendimento no WhatsApp foi BOM e só faltou registrar, diga isso
  com todas as letras. O corretor não pode ser cobrado como relapso quando o
  problema é outro.
- Estime a fidelidade: em quantos dos leads auditados o CRM refletia o que
  de fato aconteceu. Esse número vai em metricas_chave.fidelidade_crm_pct.`;

export const PROMPT_LEITURA_PADRAO = `ACESSO ÀS CONVERSAS
Abra cada conversa direto por URL, sem usar a busca do WhatsApp:
https://web.whatsapp.com/send?phone=<telefone>
Se não abrir a conversa existente, tente o telefone_alt.
Se ainda assim não houver conversa, registre "sem conversa localizada"
e siga para o próximo lead.

ESCOPO DE LEITURA
Leia a tela inteira da conversa como ela estiver ao abrir. NÃO role para
cima. Em conversas curtas isso pega tudo; em conversas longas pega o
trecho final, que é o que mostra o estado atual. O começo da história
está na timeline do CRM, dentro do pacote — use as duas fontes juntas.

EXECUÇÃO
- Use o texto da página. Só use captura de tela se a leitura falhar.
- Ao terminar CADA lead, grave a análise dele em arquivo antes de abrir
  o próximo. Não acumule os leads todos na memória.
- Processe em lotes de 10.
- Não releia conversa já analisada.
- Não responda, não encaminhe, não apague nada. Leitura apenas.

QUANDO ALGO NÃO FECHAR
Se a conversa contradiz o CRM, registre os dois lados com data e siga.
Não tente decidir qual está certo — a divergência em si é o achado.`;

export const PROMPT_FORMATO_PADRAO = `Entregue DOIS arquivos ao final.

=== ARQUIVO 1: relatorio.md (para leitura humana) ===

# Auditoria — <corretor> — <período>

## 1. Panorama
Os números do período, cada um com uma linha de leitura. Sempre ao lado
da mediana do time quando houver. Métricas null aparecem como
"não medido no período", nunca como zero.

## 2. Tabela dos leads auditados
Uma linha por lead:
nome | etapa | dias sem toque | cadência (x/6) | vácuo | divergência CRM |
áudio/texto | próximo passo | achado principal

## 3. Qualidade da conversa
Como o time conversa, com contagem e um exemplo de cada:
- Ritmo: tempo mediano de resposta dele dentro da conversa; em quantas
  conversas ele deixou o cliente no vácuo depois de sinal de interesse
- Formato: % de áudio, áudios acima de 2 min, casos de desalinho de canal
- Escrita: erros que comprometem credibilidade, abreviação com ticket alto,
  rajada de mensagens
- Rapport: em quantas chamou pelo nome, retomou algo pessoal, e em quantas
  o CLIENTE devolveu sinal (resposta rápida, áudio, agradecimento)
- Condução: em quantas houve pergunta aberta, tratamento de objeção e
  proposta de próximo passo
- Personalização: quantas mensagens eram claramente copiadas entre leads

## 4. Padrões recorrentes
Os 3 comportamentos que mais se repetiram, com a contagem de leads
afetados por cada um.

## 5. O gargalo
UM só. Com:
- qual é, em uma frase
- em quantos dos leads apareceu
- 3 evidências, cada uma com lead, data e trecho
- a instrução: o que ele deve fazer diferente, em linguagem de ação
- como medir daqui a 30 dias se melhorou

## 6. Rodada anterior
A instrução da vez passada foi cumprida? Feito, parcial ou ignorado —
com o número que comprova.

## 7. Duas conversas
A melhor e a pior da amostra, com trechos. A melhor vira material de
treinamento. A pior vira pauta do 1:1.

## 8. Ressalvas
O que não foi possível verificar e por quê.

=== ARQUIVO 2: rodada.json (para o CRM importar) ===

{
  "corretor_id": "",
  "data_rodada": "",
  "periodo": { "inicio": "", "fim": "" },
  "versao_diretrizes": "",
  "metricas_chave": {
    "fidelidade_crm_pct": null,
    "mediana_1o_contato_min_util": null,
    "sem_toque_7d": null,
    "leads_sem_tarefa_futura": null,
    "tarefas_atrasadas_24h": null,
    "proximo_passo_definido_pct": null,
    "no_show_meets_pct": null,
    "no_show_visitas_pct": null,
    "vendas": null,
    "vgv": null
  },
  "qualidade_conversa": {
    "tempo_resposta_mediano_min": null,
    "conversas_com_vacuo_do_corretor": null,
    "audio_pct_do_corretor": null,
    "audios_acima_2min": null,
    "desalinho_de_canal": null,
    "erros_escrita_relevantes": null,
    "mensagens_copiadas_entre_leads": null,
    "chamou_pelo_nome_pct": null,
    "retomou_algo_pessoal_pct": null,
    "cliente_devolveu_sinal_pct": null,
    "pergunta_aberta_pct": null,
    "objecao_tratada_pct": null
  },
  "gargalo": "",
  "instrucao": "",
  "status_instrucao_anterior": "feito | parcial | ignorado | primeira_rodada",
  "evidencias": [
    { "lead": "", "data": "", "trecho": "", "tipo": "" }
  ],
  "padroes_observados": [""],
  "ressalvas": [""]
}

Regras do arquivo 2:
- gargalo e instrucao: uma frase cada, direta e acionável.
- Métrica que não deu para apurar vai null, não zero.
- Descreva comportamento observado, nunca personalidade.
- Em qualidade_conversa, os "_pct" são sobre as conversas que você
  CONSEGUIU LER — não sobre o total da amostra. Se leu 12 de 20, a base é
  12, e isso vai nas ressalvas.
- Não invente número de áudio: se a conversa não deixa ver duração, vai null.`;

export const DIRETRIZES_PADRAO: DiretrizesAuditoria = {
  versao: 'v1',
  cadencia: CADENCIA_PADRAO,
  prazos: {
    primeiroContatoMaximoMin: 15,
    tarefaAtrasadaHoras: 24,
    leadParadoDias: 7,
  },
  horarioUtil: { inicioHora: 9, fimHora: 20, contarSabado: true, contarDomingo: false },
  criteriosDescarteValido: [],
  pesosAvaliacao: [],
  tomDoRelatorio: 'Direto, em fatos e acordos. Sempre com data e trecho como evidência. Nunca em traços de personalidade.',
  prompts: {
    principal: PROMPT_PRINCIPAL_PADRAO,
    formatoRelatorio: PROMPT_FORMATO_PADRAO,
    instrucoesLeitura: PROMPT_LEITURA_PADRAO,
  },
};

// ---------------------------------------------------------------------------
// Normalização — aceita qualquer doc salvo e devolve o shape completo
// ---------------------------------------------------------------------------

const num = (v: unknown, min: number, max: number, fb: number): number => {
  const n = Number(v);
  if (!isFinite(n)) return fb;
  return Math.min(max, Math.max(min, Math.round(n)));
};
const txt = (v: unknown, fb = ''): string => (typeof v === 'string' ? v : fb);

export function normalizarDiretrizes(raw: unknown): DiretrizesAuditoria {
  const d = (raw || {}) as Record<string, any>;
  const p = (d.prazos || {}) as Record<string, unknown>;
  const h = (d.horarioUtil || {}) as Record<string, unknown>;
  const pr = (d.prompts || {}) as Record<string, unknown>;

  const cadencia: PassoCadencia[] = Array.isArray(d.cadencia) && d.cadencia.length
    ? d.cadencia.map((x: Record<string, unknown>, i: number) => ({
        contato: num(x?.contato, 1, 99, i + 1),
        dia: num(x?.dia, 0, 365, 0),
        acao: txt(x?.acao),
      })).sort((a: PassoCadencia, b: PassoCadencia) => a.dia - b.dia || a.contato - b.contato)
    : CADENCIA_PADRAO;

  const inicioHora = num(h.inicioHora, 0, 23, DIRETRIZES_PADRAO.horarioUtil.inicioHora);
  // fim tem que ser depois do início; se vier inválido, cai no padrão
  const fimBruto = num(h.fimHora, 1, 24, DIRETRIZES_PADRAO.horarioUtil.fimHora);

  return {
    versao: txt(d.versao, DIRETRIZES_PADRAO.versao),
    cadencia,
    prazos: {
      primeiroContatoMaximoMin: num(p.primeiroContatoMaximoMin, 1, 10_080, DIRETRIZES_PADRAO.prazos.primeiroContatoMaximoMin),
      tarefaAtrasadaHoras: num(p.tarefaAtrasadaHoras, 1, 720, DIRETRIZES_PADRAO.prazos.tarefaAtrasadaHoras),
      leadParadoDias: num(p.leadParadoDias, 1, 180, DIRETRIZES_PADRAO.prazos.leadParadoDias),
    },
    horarioUtil: {
      inicioHora,
      fimHora: fimBruto > inicioHora ? fimBruto : DIRETRIZES_PADRAO.horarioUtil.fimHora,
      contarSabado: h.contarSabado !== false,
      contarDomingo: h.contarDomingo === true,
    },
    criteriosDescarteValido: Array.isArray(d.criteriosDescarteValido)
      ? d.criteriosDescarteValido.filter((s: unknown) => typeof s === 'string' && s.trim()) : [],
    pesosAvaliacao: Array.isArray(d.pesosAvaliacao)
      ? d.pesosAvaliacao
          .filter((x: Record<string, unknown>) => x && typeof x.dimensao === 'string' && x.dimensao.trim())
          .map((x: Record<string, unknown>) => ({ dimensao: String(x.dimensao), peso: num(x.peso, 0, 100, 0) }))
      : [],
    tomDoRelatorio: txt(d.tomDoRelatorio, DIRETRIZES_PADRAO.tomDoRelatorio),
    // campo vazio cai no padrão: quem salvou a régua antes dos prompts
    // existirem não fica com o bloco em branco no pacote
    prompts: {
      principal: txt(pr.principal) || PROMPT_PRINCIPAL_PADRAO,
      formatoRelatorio: txt(pr.formatoRelatorio) || PROMPT_FORMATO_PADRAO,
      instrucoesLeitura: txt(pr.instrucoesLeitura) || PROMPT_LEITURA_PADRAO,
    },
    atualizadoEm: d.atualizadoEm,
    atualizadoPor: txt(d.atualizadoPor),
  };
}

// ---------------------------------------------------------------------------
// Persistência — vigente + histórico de versões
// ---------------------------------------------------------------------------

export const refDiretrizes = (imobiliariaId: string) => doc(db, 'configAuditoria', imobiliariaId);

export async function carregarDiretrizes(imobiliariaId: string | undefined): Promise<DiretrizesAuditoria> {
  if (!imobiliariaId || imobiliariaId === 'espelho-demo') return DIRETRIZES_PADRAO;
  try {
    const snap = await getDoc(refDiretrizes(imobiliariaId));
    return normalizarDiretrizes(snap.exists() ? snap.data() : null);
  } catch {
    return DIRETRIZES_PADRAO;
  }
}

/** Rótulo automático da próxima versão: v3 - 2026-08-10 */
export function proximaVersao(atual: string): string {
  const m = /^v(\d+)/i.exec(atual.trim());
  const n = m ? parseInt(m[1], 10) + 1 : 1;
  const hoje = new Date();
  const ymd = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  return `v${n} - ${ymd}`;
}

/**
 * Salva a régua vigente E arquiva a versão. Meses depois é o que permite
 * saber se a régua mudou no meio de uma comparação entre rodadas.
 */
export async function salvarDiretrizes(imobiliariaId: string, d: DiretrizesAuditoria, porNome: string): Promise<DiretrizesAuditoria> {
  const nova = normalizarDiretrizes({ ...d, versao: proximaVersao(d.versao) });
  const payload = { ...nova, atualizadoEm: serverTimestamp(), atualizadoPor: porNome, imobiliariaId };
  await setDoc(refDiretrizes(imobiliariaId), payload, { merge: true });
  // histórico imutável (a vigente é sobrescrita; esta coleção não)
  await addDoc(collection(db, 'configAuditoria', imobiliariaId, 'versoes'), payload);
  return nova;
}

// ---------------------------------------------------------------------------
// Tempo ÚTIL — o coração da justiça da cobrança
// ---------------------------------------------------------------------------

/**
 * Horas ÚTEIS entre dois instantes, descontando fora do expediente e os dias
 * que a casa não conta. Reconstrói a janela dia a dia (em vez de somar
 * offsets) pra não escorregar em virada de horário de verão.
 */
export function horasUteisEntre(iniMs: number, fimMs: number, h: HorarioUtil): number {
  if (!(fimMs > iniMs)) return 0;
  if (!(h.fimHora > h.inicioHora)) return (fimMs - iniMs) / HORA; // janela inválida: cai no corrido
  let total = 0;
  const cursor = new Date(iniMs);
  cursor.setHours(0, 0, 0, 0);
  for (let guarda = 0; guarda < 800 && cursor.getTime() < fimMs; guarda++) {
    const dow = cursor.getDay();
    const conta = dow === 0 ? h.contarDomingo : dow === 6 ? h.contarSabado : true;
    if (conta) {
      const jIni = new Date(cursor); jIni.setHours(h.inicioHora, 0, 0, 0);
      const jFim = new Date(cursor); jFim.setHours(h.fimHora, 0, 0, 0);
      const a = Math.max(iniMs, jIni.getTime());
      const b = Math.min(fimMs, jFim.getTime());
      if (b > a) total += (b - a) / HORA;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.round(total * 100) / 100;
}

export const minutosUteisEntre = (iniMs: number, fimMs: number, h: HorarioUtil): number =>
  Math.round(horasUteisEntre(iniMs, fimMs, h) * 60);

/** Rótulo curto do horário útil, pro JSON e pra tela. */
export const descreverHorarioUtil = (h: HorarioUtil): string => {
  const dias = h.contarDomingo ? 'todos os dias' : h.contarSabado ? 'de segunda a sábado' : 'em dias úteis';
  return `${String(h.inicioHora).padStart(2, '0')}h às ${String(h.fimHora).padStart(2, '0')}h, ${dias}`;
};
