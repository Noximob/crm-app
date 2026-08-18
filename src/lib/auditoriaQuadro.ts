/**
 * AUDITORIA · O QUADRO — os indicadores montados pelo SISTEMA.
 *
 * Antes eram pedidos à análise: 24 linhas com valor, referência e status,
 * dentro de um prompt que já tinha 22 seções e 63 campos. Ela copiava
 * número do painel enquanto a atenção que devia ir para a leitura das
 * conversas se gastava em transcrição — e ainda assim os números saíam,
 * porque o CRM já os tinha desde o início.
 *
 * Agora o sistema monta o quadro: o que vem do CRM sai do panorama guardado
 * na rodada, e o punhado que só a leitura produz vem do bloco "da_conversa"
 * do relatório. A análise ficou livre para fazer o que só ela faz.
 *
 * Efeito colateral bom: o status deixou de ser opinião. A régua é a mesma
 * toda rodada, aplicada pelo mesmo código, então "melhorou" quer dizer
 * melhorou.
 */
import { DEF_INDICADOR, type Indicador } from './auditoriaAnalise';
import type { DiretrizesAuditoria } from './auditoria';

type Obj = Record<string, unknown>;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const pct = (parte: number | null, total: number | null): number | null =>
  parte === null || !total ? null : Math.round((parte / total) * 100);

/** Referências de mercado — não foram combinadas com ninguém. */
const MERCADO: Record<string, number> = {
  pct_1o_contato_no_prazo: 90,
  aceite_rodizio_mediana_min: 5,
  resposta_na_conversa_mediana_min: 30,
  fidelidade_crm_pct: 80,
  pct_ativos_com_proximo_passo: 90,
  pct_com_qualificacao: 80,
  pct_meet_marcado_para_feito: 75,
  pct_visita_marcada_para_feita: 70,
  retorno_pos_visita_mediana_h: 24,
  pct_com_proximo_passo_proposto: 50,
  pct_personalizacao: 80,
  sinais_de_compra_ignorados: 0,
};

interface Entrada {
  chave: string;
  valor: number | null;
  /** de onde saiu a régua — é ela que autoriza o vermelho */
  origem: 'casa' | 'mercado' | 'nenhuma';
  referencia: number | null;
  /** quantos casos sustentam o número; abaixo de 5 nunca reprova */
  n?: number | null;
}

/**
 * Decide a cor. Vermelho SÓ contra régua da casa: não se reprova ninguém
 * por um padrão de mercado que nunca foi combinado com ele, e amostra de
 * menos de cinco casos descreve sorte, não comportamento.
 */
function statusDe(e: Entrada, bom: 'alto' | 'baixo' | 'neutro'): Indicador['status'] {
  if (e.valor === null) return 'nd';
  if (e.referencia === null || bom === 'neutro') return 'nd';
  if (e.n !== undefined && e.n !== null && e.n < 5) return 'amarelo';

  const dentro = bom === 'alto' ? e.valor >= e.referencia : e.valor <= e.referencia;
  if (dentro) return 'verde';
  // fora: quão fora? perto do limite ainda é atenção
  const folga = bom === 'alto' ? e.valor / (e.referencia || 1) : (e.referencia || 1) / (e.valor || 1);
  const grave = folga < 0.7;
  if (e.origem !== 'casa') return 'amarelo';
  return grave ? 'vermelho' : 'amarelo';
}

/**
 * Monta as 24 linhas. `panorama` é o que o CRM sabe (guardado na rodada) e
 * `daConversa` é o que a leitura produziu.
 */
export function montarQuadro(
  panorama: Obj,
  daConversa: Obj,
  cobertura: Obj,
  d: DiretrizesAuditoria | null,
): Indicador[] {
  const p = panorama || {};
  const c = daConversa || {};
  const lidas = num(cobertura?.conversas_lidas);

  const ativos = (num(p.leads_recebidos) ?? 0) > 0 ? null : null; // não usado; mantido explícito
  void ativos;

  const semToque = num(p.sem_toque_7d);
  const semTarefa = num(p.leads_sem_tarefa_futura);
  const semQualif = num(p.leads_sem_qualificacao);
  const funil = (p.distribuicao_funil || {}) as Record<string, unknown>;
  const totalAtivos = Object.values(funil).reduce<number>((s, v) => s + (num(v) ?? 0), 0) || null;

  const dentroPrazo = num(p.dentro_do_prazo_1o_contato) ?? 0;
  const foraPrazo = num(p.fora_do_prazo_1o_contato) ?? 0;
  const novosMedidos = dentroPrazo + foraPrazo;

  const meetsM = num(p.meets_marcados), meetsF = num(p.meets_feitos);
  const visitasM = num(p.visitas_marcadas), visitasF = num(p.visitas_feitas);

  const comMovimento = num(c.conversas_com_movimento) ?? lidas;
  const comData = num(c.terminaram_com_data_marcada);
  const comPergunta = num(c.com_pergunta_de_descoberta);
  const copiadas = num(c.com_mensagem_copiada);

  const entradas: Entrada[] = [
    { chave: '1o_contato_mediana_min_util', valor: num(p.mediana_primeiro_contato_min_util), origem: 'casa',
      referencia: d?.prazos.primeiroContatoMaximoMin ?? null, n: novosMedidos },
    { chave: 'pct_1o_contato_no_prazo', valor: pct(dentroPrazo, novosMedidos), origem: 'mercado',
      referencia: MERCADO.pct_1o_contato_no_prazo, n: novosMedidos },
    { chave: 'aceite_rodizio_mediana_min', valor: (() => {
        const seg = num((p.rodizio as Obj)?.aceite_mediano_seg);
        return seg === null ? null : Math.round((seg / 60) * 10) / 10;
      })(), origem: 'mercado', referencia: MERCADO.aceite_rodizio_mediana_min,
      n: num((p.rodizio as Obj)?.recebidos) },
    { chave: 'resposta_na_conversa_mediana_min', valor: num(c.tempo_resposta_mediano_min), origem: 'mercado',
      referencia: MERCADO.resposta_na_conversa_mediana_min, n: comMovimento },

    { chave: 'fidelidade_crm_pct', valor: num(c.fidelidade_crm_pct), origem: 'mercado',
      referencia: MERCADO.fidelidade_crm_pct, n: lidas },
    { chave: 'pct_ativos_com_proximo_passo', valor: semTarefa === null || !totalAtivos ? null
        : Math.round(((totalAtivos - semTarefa) / totalAtivos) * 100), origem: 'mercado',
      referencia: MERCADO.pct_ativos_com_proximo_passo, n: totalAtivos },
    { chave: 'tarefas_vencidas_24h', valor: num(p.tarefas_atrasadas_24h), origem: 'casa', referencia: 0 },
    { chave: 'pct_carteira_parada', valor: pct(semToque, totalAtivos), origem: 'casa', referencia: 5, n: totalAtivos },
    { chave: 'pct_com_qualificacao', valor: semQualif === null || !totalAtivos ? null
        : Math.round(((totalAtivos - semQualif) / totalAtivos) * 100), origem: 'casa',
      referencia: MERCADO.pct_com_qualificacao, n: totalAtivos },

    { chave: 'pct_1o_contato_para_meet', valor: pct(meetsM, novosMedidos || null), origem: 'nenhuma', referencia: null },
    { chave: 'pct_meet_marcado_para_feito', valor: pct(meetsF, meetsM), origem: 'mercado',
      referencia: MERCADO.pct_meet_marcado_para_feito, n: meetsM },
    { chave: 'pct_visita_marcada_para_feita', valor: pct(visitasF, visitasM), origem: 'mercado',
      referencia: MERCADO.pct_visita_marcada_para_feita, n: visitasM },
    { chave: 'pct_visita_para_negociacao', valor: null, origem: 'nenhuma', referencia: null },
    { chave: 'retorno_pos_visita_mediana_h', valor: num(c.retorno_pos_visita_mediana_h), origem: 'mercado',
      referencia: MERCADO.retorno_pos_visita_mediana_h, n: visitasF },

    { chave: 'pct_com_proximo_passo_proposto', valor: pct(comData, comMovimento), origem: 'mercado',
      referencia: MERCADO.pct_com_proximo_passo_proposto, n: comMovimento },
    { chave: 'pct_com_pergunta_aberta', valor: pct(comPergunta, comMovimento), origem: 'nenhuma',
      referencia: null, n: comMovimento },
    { chave: 'sinais_de_compra_ignorados', valor: num(c.sinais_de_compra_ignorados), origem: 'casa', referencia: 0 },
    { chave: 'pct_audio_do_corretor', valor: num(c.audios_do_corretor) === null || !comMovimento ? null
        : pct(num(c.audios_do_corretor), comMovimento), origem: 'nenhuma', referencia: null },
    { chave: 'pct_personalizacao', valor: copiadas === null || !comMovimento ? null
        : Math.round(((comMovimento - copiadas) / comMovimento) * 100), origem: 'mercado',
      referencia: MERCADO.pct_personalizacao, n: comMovimento },

    { chave: 'meets_feitos', valor: meetsF, origem: 'casa', referencia: d?.metasMensais.meetsFeitos ?? null },
    { chave: 'visitas_feitas', valor: visitasF, origem: 'casa', referencia: d?.metasMensais.visitasFeitas ?? null },
    { chave: 'vendas', valor: num(p.vendas), origem: 'casa', referencia: d?.metasMensais.vendas ?? null },
    { chave: 'vgv', valor: num(p.vgv), origem: 'casa', referencia: d?.metasMensais.vgv ?? null },
    { chave: 'cobertura_lidos_de_20', valor: lidas, origem: 'mercado',
      referencia: (() => {
        const total = num(cobertura?.leads_na_amostra);
        return total === null ? null : Math.round(total * 0.7);
      })() },
  ];

  return entradas.map((e, i) => {
    const def = DEF_INDICADOR[e.chave];
    const bom = def?.bom ?? 'neutro';
    return {
      n: i + 1,
      chave: e.chave,
      rotulo: def?.rotulo || e.chave.replace(/_/g, ' '),
      unidade: def?.unidade ?? '',
      grupo: def?.grupo || 'Outros',
      oQueMede: def?.oQueMede || '',
      base: def?.base || 'carteira',
      bom,
      valor: e.valor,
      referencia: e.referencia,
      origemReferencia: e.referencia === null ? 'nenhuma' : e.origem,
      status: statusDe(e, bom),
      anterior: null,
      rumo: null,
    };
  });
}

/** Casa o quadro com o da rodada anterior e resolve o rumo de cada linha. */
export function compararComAnterior(atual: Indicador[], anterior: Indicador[] | null): Indicador[] {
  if (!anterior?.length) return atual;
  const antes = new Map(anterior.map((i) => [i.chave, i.valor]));
  return atual.map((i) => {
    const ant = antes.has(i.chave) ? antes.get(i.chave)! : null;
    let rumo: Indicador['rumo'] = null;
    if (i.valor !== null && ant !== null && i.bom !== 'neutro') {
      if (i.valor === ant) rumo = 'igual';
      else rumo = (i.valor > ant) === (i.bom === 'alto') ? 'melhorou' : 'piorou';
    }
    return { ...i, anterior: ant, rumo };
  });
}
