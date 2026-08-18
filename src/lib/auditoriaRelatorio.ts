/**
 * AUDITORIA · O RELATÓRIO NORMALIZADO.
 *
 * O formato do rodada.json mudou quando a análise parou de devolver o que o
 * CRM já sabe: saíram o quadro de indicadores, as metas e o funil; entraram
 * campos mais enxutos e uma regra dura sobre citação literal.
 *
 * Rodadas já importadas continuam no formato antigo e precisam abrir do
 * mesmo jeito — relatório que some porque o schema evoluiu é pior que
 * schema feio. Esta função lê os dois e devolve uma estrutura só, para a
 * tela nunca perguntar qual veio.
 */
import { asObj, asArr, asStr, asStrArr, asNum } from './auditoriaAnalise';

type Obj = Record<string, unknown>;

export interface Citacao { lead: string; data: string; de: string; trecho: string }
export interface Acerto extends Citacao { porQue: string; valeComoTreino: boolean }

export interface Achado {
  titulo: string;
  estado: string;
  quantosLeads: number | null;
  oQueAconteceu: string;
  oQueCustou: string;
  oQueFazer: string;
  mensagemPronta: string;
  citacoes: Citacao[];
}

export interface LeadComAchado {
  lead: string; veredito: string; etapaReal: string;
  diasSemToqueReal: number | null;
  oQueQueria: string; porQueParou: string;
  etapaCrm: string;
}

export interface Risco extends Citacao { porQue: string; gravidade: string }

export interface Relatorio {
  gargalo: string;
  instrucao: string;
  prazoInstrucao: string;
  natureza: string;
  statusAnterior: string;
  cobertura: { naAmostra: number | null; lidas: number | null; naoLocalizadas: number | null; motivos: string[] };
  /** contagem dos quatro estados — derivada quando o relatório não a traz */
  veredito: { ok: number; processo: number; naoFez: number; naoVerificavel: number; etapaDefasada: number | null };
  acertos: Acerto[];
  achados: Achado[];
  fila: Obj[];
  leads: LeadComAchado[];
  leadsSemAchado: number | null;
  daConversa: Obj;
  risco: Risco[];
  perguntas: string[];
  destravar: Obj[];
  naoEDele: Obj[];
  ressalvas: string[];
  /** blocos que só o formato antigo tem — a tela os mostra se existirem */
  legado: {
    quadro: unknown;
    corrente: Obj;
    duasConversas: Obj;
    metasInstrucao: Obj[];
    padroes: string[];
    comparativo: string;
    engajamento: Obj;
    sinaisDeCompra: Obj[];
    oportunidade: Obj;
    funilImovel: Obj;
    temperatura: Obj;
    combinado: Obj;
    destaques: Obj;
  };
}

const cit = (o: Obj): Citacao => ({
  lead: asStr(o.lead),
  data: asStr(o.data),
  // o formato antigo não dizia quem falou; "corretor" é o caso comum
  de: asStr(o.de) || 'corretor',
  trecho: asStr(o.trecho),
});

export function lerRelatorio(bruto: unknown): Relatorio {
  const a = asObj(bruto);
  const cob = asObj(a.cobertura);

  // ---- achados: o formato novo renomeou o modelo de mensagem
  const achados: Achado[] = asArr(a.achados).map((x) => ({
    titulo: asStr(x.titulo),
    estado: asStr(x.estado),
    quantosLeads: asNum(x.quantos_leads),
    oQueAconteceu: asStr(x.o_que_aconteceu),
    oQueCustou: asStr(x.o_que_custou),
    oQueFazer: asStr(x.o_que_fazer),
    mensagemPronta: asStr(x.mensagem_pronta) || asStr(x.modelo_de_mensagem),
    citacoes: asArr(x.citacoes).map(cit),
  }));

  const acertos: Acerto[] = asArr(a.acertos).map((x) => ({
    ...cit(x),
    porQue: asStr(x.por_que) || asStr(x.por_que_funcionou),
    valeComoTreino: x.vale_como_treino === true,
  }));

  // ---- leads: o novo traz só os que têm achado; o antigo trazia todos
  const doNovo = asArr(a.leads_com_achado);
  const doAntigo = asArr(a.leads_auditados);
  const fonte = doNovo.length ? doNovo : doAntigo;
  const leads: LeadComAchado[] = fonte.map((l) => ({
    lead: asStr(l.lead),
    veredito: asStr(l.veredito),
    etapaReal: asStr(l.etapa_real),
    etapaCrm: asStr(l.etapa_crm),
    diasSemToqueReal: asNum(l.dias_sem_toque_real) ?? asNum(l.sem_toque_real),
    oQueQueria: asStr(l.o_que_o_cliente_queria),
    porQueParou: asStr(l.por_que_parou),
  }));

  // no formato antigo, "sem achado" são os que vieram com veredito ✓
  const limpoAntigo = doNovo.length ? null
    : doAntigo.filter((l) => /^✓|fez_e_registrou/i.test(asStr(l.veredito))).length;
  const leadsSemAchado = asNum(a.leads_sem_achado) ?? limpoAntigo;

  // ---- veredito: o antigo trazia pronto; no novo se conta dos leads
  const vAntigo = asObj(a.veredito);
  const temVeredito = asNum(vAntigo.fez_e_registrou) !== null || asNum(vAntigo.nao_fez) !== null;
  const contar = (re: RegExp) => leads.filter((l) => re.test(l.veredito)).length;
  const veredito = temVeredito
    ? {
        ok: asNum(vAntigo.fez_e_registrou) ?? 0,
        processo: asNum(vAntigo.fez_e_nao_registrou) ?? 0,
        naoFez: asNum(vAntigo.nao_fez) ?? 0,
        naoVerificavel: asNum(vAntigo.nao_verificavel) ?? 0,
        etapaDefasada: asNum(vAntigo.leads_com_etapa_defasada),
      }
    : {
        ok: leadsSemAchado ?? 0,
        processo: contar(/fez_e_nao_registrou|⚠/i),
        naoFez: contar(/nao_fez|não_fez|✗/i),
        naoVerificavel: contar(/nao_verificavel|não_verific|\?/i),
        etapaDefasada: leads.filter((l) => l.etapaReal && l.etapaCrm && l.etapaReal !== l.etapaCrm).length || null,
      };

  // ---- risco: virou lista direta; o antigo tinha { ocorrencias, gravidade }
  const riscoBruto = Array.isArray(a.risco) ? asArr(a.risco) : asArr(asObj(a.risco).ocorrencias);
  const gravidadeGeral = asStr(asObj(a.risco).gravidade);
  const risco: Risco[] = riscoBruto.map((x) => ({
    ...cit(x),
    porQue: asStr(x.por_que),
    gravidade: asStr(x.gravidade) || gravidadeGeral || 'media',
  }));

  return {
    gargalo: asStr(a.gargalo),
    instrucao: asStr(a.instrucao),
    prazoInstrucao: asStr(a.prazo_da_instrucao),
    natureza: asStr(a.natureza) || asStr(vAntigo.natureza_do_problema),
    statusAnterior: asStr(a.status_instrucao_anterior),
    cobertura: {
      naAmostra: asNum(cob.leads_na_amostra),
      lidas: asNum(cob.conversas_lidas),
      naoLocalizadas: asNum(cob.sem_conversa_localizada),
      motivos: asStrArr(cob.motivos_nao_localizada),
    },
    veredito,
    acertos,
    achados,
    fila: asArr(a.fila_de_ataque).sort((x, y) => (asNum(x.posicao) ?? 99) - (asNum(y.posicao) ?? 99)),
    leads,
    leadsSemAchado,
    daConversa: Object.keys(asObj(a.da_conversa)).length ? asObj(a.da_conversa) : asObj(a.qualidade_conversa),
    risco,
    perguntas: asStrArr(a.perguntas_para_reuniao),
    destravar: asArr(a.gestor_precisa_destravar),
    naoEDele: asArr(a.nao_e_do_corretor),
    ressalvas: asStrArr(a.ressalvas),
    legado: {
      quadro: a.quadro_indicadores,
      corrente: asObj(a.corrente_causal),
      duasConversas: asObj(a.duas_conversas),
      metasInstrucao: asArr(a.metas_da_instrucao),
      padroes: asStrArr(a.padroes_observados),
      comparativo: asStr(a.comparativo_rodada_anterior),
      engajamento: asObj(a.engajamento),
      sinaisDeCompra: asArr(a.sinais_de_compra),
      oportunidade: asObj(a.oportunidade_perdida),
      funilImovel: asObj(a.funil_imovel),
      temperatura: asObj(a.temperatura_da_carteira),
      combinado: asObj(a.combinado),
      destaques: asObj(a.destaques_do_periodo),
    },
  };
}
