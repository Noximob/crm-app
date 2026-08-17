'use client';

/**
 * AUDITORIA · O PDF — a mesma análise em folha A4.
 *
 * Duas versões saem daqui. A do CORRETOR é o documento que ele leva para
 * casa: o que fazer amanhã, o que fez bem, os números e as ressalvas. A do
 * GESTOR acrescenta o risco apurado, as perguntas preparadas para o 1:1 e o
 * que a casa precisa destravar — material de preparação, não de entrega.
 *
 * A impressão usa o truque de esconder a tela inteira e mostrar só este
 * bloco, para o PDF sair em fundo branco mesmo com o app em tema escuro.
 */
import React from 'react';
import {
  asObj, asArr, asStrArr, asStr, asNum, fmtYmd, fmtDinheiro, fmtNum,
  valorIndicador, referenciaIndicador, VEREDITO, TEMPERATURA, naturezaLegivel, valorSolto,
  ROTULO_QUALIDADE, ROTULO_OPORTUNIDADE, ROTULO_FUNIL, TIPO_DESTRAVE, PRAZO_LEGIVEL, PERGUNTA_DO_GRUPO,
  type ChaveVeredito, type Indicador,
} from '@/lib/auditoriaAnalise';

export const CSS_PRINT_RODADA = `
#aud-print { display: none; }
@media print {
  body * { visibility: hidden; }
  #aud-print, #aud-print * { visibility: visible; }
  .no-print, .no-print * { display: none !important; }
  #aud-print { display: block; position: absolute; left: 0; top: 0; width: 100%;
    background: #fff; color: #14161a; font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 12mm 13mm; }
}
#aud-print .cab { display: flex; justify-content: space-between; align-items: flex-end;
  border-bottom: 2.5px solid #14161a; padding-bottom: 7px; margin-bottom: 12px; }
#aud-print .marca { font-size: 8.5px; font-weight: 800; letter-spacing: 2px; color: #9a7b12; margin: 0; }
#aud-print h1 { font-size: 21px; margin: 2px 0 0; letter-spacing: -.3px; }
#aud-print .cab-dir { text-align: right; font-size: 9.5px; color: #55595f; line-height: 1.5; }
#aud-print h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px;
  border-bottom: 1px solid #cdd1d6; padding-bottom: 3px; margin: 15px 0 7px; break-after: avoid; }
#aud-print h3 { font-size: 11.5px; margin: 9px 0 3px; break-after: avoid; }
#aud-print p { font-size: 10.5px; line-height: 1.5; margin: 3px 0; }
#aud-print .caixa { border: 2px solid #14161a; border-radius: 5px; padding: 8px 11px; margin: 7px 0; }
#aud-print .caixa .r { font-size: 7.5px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: #6b7075; margin: 0 0 2px; }
#aud-print .caixa .v { font-size: 12.5px; font-weight: 700; margin: 0; line-height: 1.4; }
#aud-print .caixa.ouro { border-color: #9a7b12; background: #fdf9ec; }
#aud-print blockquote { margin: 5px 0; padding: 6px 10px; background: #f4f5f7;
  border-left: 3px solid #9a7b12; border-radius: 0 4px 4px 0; }
#aud-print blockquote p { font-style: italic; font-size: 10px; margin: 0; }
#aud-print blockquote .src { font-style: normal; font-size: 8.5px; font-weight: 700; color: #55595f; display: block; margin-top: 3px; }
#aud-print .msg { border: 1px dashed #9a7b12; background: #fdf9ec; border-radius: 5px;
  padding: 7px 10px; margin: 5px 0 8px; break-inside: avoid; }
#aud-print .msg .r { font-size: 7.5px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase; color: #6b7075; display: block; margin-bottom: 3px; }
#aud-print .msg p { font-size: 10px; margin: 0; }
#aud-print table { width: 100%; border-collapse: collapse; font-size: 9px; margin: 5px 0; }
#aud-print th { text-align: left; font-size: 7.5px; text-transform: uppercase; letter-spacing: .6px;
  color: #55595f; border-bottom: 1.5px solid #14161a; padding: 3px 4px; }
#aud-print td { border-bottom: 1px solid #e6e8eb; padding: 3.5px 4px; vertical-align: top; }
#aud-print td.num, #aud-print th.num { text-align: right; font-variant-numeric: tabular-nums; }
#aud-print .fonte { font-size: 6.5px; font-weight: 800; letter-spacing: .5px;
  text-transform: uppercase; color: #6b7075; border: 1px solid #cdd1d6; border-radius: 2px; padding: 0 2px; }
#aud-print .expl { display: block; font-size: 7.5px; color: #6b7075; line-height: 1.35; font-weight: 400; }
#aud-print tr.grp td { background: #f0f1f3; font-weight: 800; font-size: 7.5px;
  letter-spacing: 1px; text-transform: uppercase; padding: 3px 4px; }
#aud-print .verde { color: #0a7a35; font-weight: 700; }
#aud-print .amarelo { color: #8a6100; font-weight: 700; }
#aud-print .vermelho { color: #bd2b2b; font-weight: 700; }
#aud-print .nd { color: #9aa0a6; }
#aud-print .grade { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin: 5px 0; }
#aud-print .cel { border: 1px solid #e6e8eb; border-radius: 4px; padding: 4px 6px; break-inside: avoid; }
#aud-print .cel .r { display: block; font-size: 7px; text-transform: uppercase; letter-spacing: .5px; color: #6b7075; line-height: 1.3; }
#aud-print .cel .v { display: block; font-size: 13px; font-weight: 800; }
#aud-print .cel .v.nulo { color: #b6bbc0; }
#aud-print ul, #aud-print ol { margin: 3px 0; padding-left: 16px; }
#aud-print li { font-size: 10.5px; line-height: 1.5; margin: 2px 0; }
#aud-print .fila { border: 1px solid #cdd1d6; border-radius: 5px; padding: 7px 10px;
  margin: 5px 0; break-inside: avoid; }
#aud-print .fila.urg { border-color: #bd2b2b; border-width: 1.5px; background: #fdf3f3; }
#aud-print .fila .top { font-size: 11px; font-weight: 800; margin: 0 0 2px; }
#aud-print .fila .meta { font-size: 9px; color: #55595f; font-weight: 700; }
#aud-print .mini { font-size: 8.5px; color: #6b7075; line-height: 1.45; }
#aud-print .rodape { border-top: 1px solid #cdd1d6; margin-top: 14px; padding-top: 5px;
  font-size: 8px; color: #6b7075; display: flex; justify-content: space-between; }
#aud-print .pg { break-after: page; }
#aud-print section { break-inside: avoid-page; }
#aud-print .sep { border-top: 2px solid #14161a; margin: 16px 0 4px; padding-top: 5px;
  font-size: 8px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: #6b7075; }
`;

interface Props {
  r: { corretorNome: string; geradoEmYmd: string; periodoInicio: string; periodoFim: string; versaoDiretrizes?: string };
  a: Record<string, unknown>;
  indicadores: Indicador[];
  porGrupo: [string, Indicador[]][];
  modo: 'corretor' | 'gestor';
}

function Cit({ lead, data, trecho }: { lead?: string; data?: string; trecho?: string }) {
  if (!trecho) return null;
  return (
    <blockquote>
      <p>“{trecho}”</p>
      {(lead || data) && <span className="src">{lead}{lead && data ? ' · ' : ''}{data ? fmtYmd(data) : ''}</span>}
    </blockquote>
  );
}

export default function RodadaPrint({ r, a, indicadores, porGrupo, modo }: Props) {
  const placar = asObj(a.placar_indicadores);
  const veredito = asObj(a.veredito);
  const natureza = naturezaLegivel(asStr(veredito.natureza_do_problema));
  const cobertura = asObj(a.cobertura);
  const fila = asArr(a.fila_de_ataque).sort((x, y) => (asNum(x.posicao) ?? 99) - (asNum(y.posicao) ?? 99));
  const acertos = asArr(a.acertos);
  const destaques = asObj(a.destaques_do_periodo);
  const achados = asArr(a.achados);
  const leadsAud = asArr(a.leads_auditados);
  const crmVsReal = asArr(a.crm_vs_real);
  const corrente = asObj(a.corrente_causal);
  const temperatura = asObj(a.temperatura_da_carteira);
  const padroes = asStrArr(a.padroes_observados);
  const naoEDele = asArr(a.nao_e_do_corretor);
  const ressalvas = asStrArr(a.ressalvas);
  const evidencias = asArr(a.evidencias);
  const risco = asObj(a.risco);
  const riscoOcorr = asArr(risco.ocorrencias);
  const perguntas = asStrArr(a.perguntas_para_reuniao);
  const destravar = asArr(a.gestor_precisa_destravar);
  const soGestor = modo === 'gestor';

  const combinado = asObj(a.combinado);
  const metasComb = asArr(combinado.metas);
  const paradosPrazo = asArr(combinado.leads_parados_alem_do_prazo);
  const descartesExplicar = asArr(combinado.descartes_a_explicar);
  const fichaIncompleta = asArr(combinado.ficha_incompleta);
  const naoCombinado = asStrArr(combinado.o_que_nao_foi_combinado);
  const temCombinado = metasComb.length > 0 || paradosPrazo.length > 0
    || descartesExplicar.length > 0 || fichaIncompleta.length > 0;

  const sinais = asArr(a.sinais_de_compra);
  const metas = asArr(a.metas_da_instrucao);
  const duasConversas = asObj(a.duas_conversas);

  // "observacao" é prosa: sai da grade de números e vira parágrafo
  const blocos = [
    { t: 'Qualidade da conversa', src: asObj(a.qualidade_conversa), rot: ROTULO_QUALIDADE },
    { t: 'Oportunidade perdida', src: asObj(a.oportunidade_perdida), rot: ROTULO_OPORTUNIDADE },
    { t: 'O funil de imóvel', src: asObj(a.funil_imovel), rot: ROTULO_FUNIL },
  ].filter((b) => Object.keys(b.src).length > 0).map((b) => ({
    ...b,
    numeros: Object.entries(b.src).filter(([k]) => k !== 'observacao'),
    observacao: asStr(b.src.observacao),
  }));

  return (
    <div id="aud-print">
      {/* ——— PÁGINA 1: a conversa e o que fazer amanhã ——— */}
      <section className="pg">
        <header className="cab">
          <div>
            <p className="marca">NOX IMÓVEIS · AUDITORIA DE ATENDIMENTO</p>
            <h1>{r.corretorNome}</h1>
          </div>
          <div className="cab-dir">
            <p><b>{fmtYmd(r.periodoInicio)} a {fmtYmd(r.periodoFim)}</b></p>
            {asNum(cobertura.conversas_lidas) !== null && (
              <p>{fmtNum(asNum(cobertura.conversas_lidas))} de {fmtNum(asNum(cobertura.leads_na_amostra))} conversas lidas</p>
            )}
            <p>{natureza.txt !== '—' ? `natureza ${natureza.txt} · ` : ''}{soGestor ? 'versão do gestor' : 'versão do corretor'}</p>
          </div>
        </header>

        {asStr(a.gargalo) && (
          <div className="caixa">
            <p className="r">O gargalo</p>
            <p className="v">{asStr(a.gargalo)}</p>
          </div>
        )}
        {asStr(a.instrucao) && (
          <div className="caixa ouro">
            <p className="r">A instrução{PRAZO_LEGIVEL[asStr(a.prazo_da_instrucao)] ? ` · prazo ${PRAZO_LEGIVEL[asStr(a.prazo_da_instrucao)]}` : ''}</p>
            <p className="v">{asStr(a.instrucao)}</p>
          </div>
        )}

        {Object.keys(veredito).length > 0 && (
          <p className="mini" style={{ marginTop: 6 }}>
            {(Object.keys(VEREDITO) as ChaveVeredito[]).map((k) => {
              const v = asNum(veredito[k]);
              return v === null ? null : <span key={k}>{VEREDITO[k].simb} <b>{v}</b> {VEREDITO[k].txt} &nbsp;·&nbsp; </span>;
            })}
            {asNum(veredito.leads_com_etapa_defasada) !== null && <span><b>{fmtNum(asNum(veredito.leads_com_etapa_defasada))}</b> com etapa defasada</span>}
          </p>
        )}

        {fila.length > 0 && (
          <>
            <h2>Fila de ataque — o que fazer amanhã de manhã, nesta ordem</h2>
            {fila.map((f, i) => {
              const t = TEMPERATURA[asStr(f.temperatura).toLowerCase()];
              const dias = asNum(f.esfria_em_dias);
              return (
                <div key={i} className={`fila${dias !== null && dias <= 3 ? ' urg' : ''}`}>
                  <p className="top">
                    {asNum(f.posicao) ?? i + 1}. {asStr(f.lead)}
                    {t && <span className="meta"> &nbsp;{t.simb} {asStr(f.temperatura)}</span>}
                    {asNum(f.valor_em_jogo) !== null && <span className="meta"> &nbsp;· {fmtDinheiro(asNum(f.valor_em_jogo))}</span>}
                    {dias !== null && <span className="meta"> &nbsp;· esfria em {dias} dia{dias === 1 ? '' : 's'}</span>}
                  </p>
                  {asStr(f.por_que_agora) && <p style={{ fontSize: 9.5 }}>{asStr(f.por_que_agora)}</p>}
                  {asStr(f.mensagem_pronta) && (
                    <div className="msg"><span className="r">mensagem pronta</span><p>{asStr(f.mensagem_pronta)}</p></div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </section>

      {/* ——— o que faz bem + os achados ——— */}
      <section>
        {acertos.length > 0 && (
          <>
            <h2>O que você faz bem — manter e replicar</h2>
            {Object.keys(destaques).length > 0 && (
            <div className="grade">
              {([["avancos_de_etapa","clientes que avancaram"],["leads_recuperados","recuperados de parado"],["atendimento_mais_rapido","atendimento mais rapido"],["tarefas_no_prazo","tarefas no prazo"],["dias_fora_do_expediente","dias fora do expediente"]] as const).map(([k, rot]) => {
                const v = valorSolto(destaques[k]);
                return v.nulo ? null : (
                  <div key={k} className="cel"><span className="r">{rot}</span><span className="v verde">{v.txt}</span></div>
                );
              })}
            </div>
          )}
          {asStr(destaques.observacao) && <p>{asStr(destaques.observacao)}</p>}
          {acertos.map((ac, i) => (
              <div key={i}>
                <h3>{asStr(ac.lead)}{ac.vale_como_treino === true ? ' — vale como treino' : ''}</h3>
                <Cit data={asStr(ac.data)} trecho={asStr(ac.trecho)} />
                {asStr(ac.por_que_funcionou) && <p><b>Por que funciona:</b> {asStr(ac.por_que_funcionou)}</p>}
              </div>
            ))}
          </>
        )}
      </section>

      {achados.length > 0 && (
        <section>
          <h2>O que muda a partir de agora</h2>
          {achados.map((ac, i) => {
            const est = VEREDITO[asStr(ac.estado) as ChaveVeredito];
            return (
              <div key={i}>
                <h3>{i + 1}. {asStr(ac.titulo)}{est ? ` — ${est.simb} ${est.txt.toUpperCase()}` : ''}</h3>
                {asStr(ac.o_que_aconteceu) && <p><b>O que aconteceu.</b> {asStr(ac.o_que_aconteceu)}</p>}
                {asArr(ac.citacoes).map((c, j) => <Cit key={j} lead={asStr(c.lead)} data={asStr(c.data)} trecho={asStr(c.trecho)} />)}
                {asStr(ac.o_que_custou) && <p><b>O que custou.</b> {asStr(ac.o_que_custou)}</p>}
                {asStr(ac.o_que_fazer) && <p><b>O que fazer no lugar.</b> {asStr(ac.o_que_fazer)}</p>}
                {asStr(ac.modelo_de_mensagem) && (
                  <div className="msg"><span className="r">modelo</span><p>{asStr(ac.modelo_de_mensagem)}</p></div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {achados.length === 0 && evidencias.length > 0 && (
        <section>
          <h2>Evidências</h2>
          {evidencias.map((e, i) => <Cit key={i} lead={asStr(e.lead)} data={asStr(e.data)} trecho={asStr(e.trecho)} />)}
        </section>
      )}

      {/* ——— o quadro ——— */}
      {temCombinado && (
        <section>
          <h2>O combinado — o que a casa acertou antes</h2>
          {metasComb.length > 0 && (
            <div className="grade">
              {metasComb.map((m, i) => {
                const semMeta = asNum(m.meta) === null;
                return (
                  <div key={i} className="cel">
                    <span className="r">{asStr(m.indicador).replace(/_/g, ' ')}</span>
                    <span className={`v ${semMeta ? 'nulo' : m.bateu === true ? 'verde' : 'vermelho'}`}>
                      {fmtNum(asNum(m.realizado))}{semMeta ? '' : ` / ${fmtNum(asNum(m.meta))}`}
                    </span>
                    <span className="r">{semMeta ? 'nao e meta' : (asStr(m.faltou) || (m.bateu === true ? 'bateu' : ''))}</span>
                  </div>
                );
              })}
            </div>
          )}
          {asNum(combinado.dinheiro_parado) !== null && (
            <div className="caixa">
              <p className="r">Dinheiro da casa parado na mao dele</p>
              <p className="v">{fmtDinheiro(asNum(combinado.dinheiro_parado))} — o que a casa pagou pelos leads que estao parados na carteira</p>
            </div>
          )}
          {paradosPrazo.length > 0 && (
            <>
              <h3>Passaram do prazo da etapa</h3>
              <table>
                <thead><tr><th>Lead</th><th>Etapa</th><th className="num">Esta ha</th><th className="num">Prazo</th></tr></thead>
                <tbody>
                  {paradosPrazo.map((l, i) => (
                    <tr key={i}>
                      <td><b>{asStr(l.lead)}</b></td>
                      <td>{asStr(l.etapa)}</td>
                      <td className="num vermelho">{fmtNum(asNum(l.dias_na_etapa))} dias</td>
                      <td className="num">{fmtNum(asNum(l.prazo_da_etapa))} dias</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {descartesExplicar.length > 0 && (
            <>
              <h3>Descartes para explicar</h3>
              <table>
                <thead><tr><th>Motivo registrado</th><th className="num">Quantos</th><th>Por que chamou atencao</th></tr></thead>
                <tbody>
                  {descartesExplicar.map((x, i) => (
                    <tr key={i}>
                      <td><b>“{asStr(x.motivo)}”</b></td>
                      <td className="num">{fmtNum(asNum(x.quantidade))}</td>
                      <td>{asStr(x.por_que_chamou_atencao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {fichaIncompleta.length > 0 && (
            <p><b>Ficha incompleta:</b> {fichaIncompleta.map((f) => `${asStr(f.campo)} (falta em ${fmtNum(asNum(f.leads_sem))})`).join(' · ')}</p>
          )}
          {naoCombinado.length > 0 && soGestor && (
            <>
              <h3>Isto ainda nao foi combinado — cobranca sua, nao dele</h3>
              <ul>{naoCombinado.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
        </section>
      )}

      {indicadores.length > 0 && (
        <section>
          <h2>Quadro de indicadores</h2>
          <table>
            <thead><tr>
              <th style={{ width: '4%' }}>#</th><th>Indicador</th>
              <th className="num" style={{ width: '13%' }}>Valor</th>
              <th className="num" style={{ width: '13%' }}>Referência</th>
              <th className="num" style={{ width: '13%' }}>Anterior</th>
            </tr></thead>
            <tbody>
              {porGrupo.map(([grupo, linhas]) => (
                <React.Fragment key={grupo}>
                  <tr className="grp"><td colSpan={5}>{grupo}{PERGUNTA_DO_GRUPO[grupo] ? ` — ${PERGUNTA_DO_GRUPO[grupo]}` : ''}</td></tr>
                  {linhas.map((ind) => (
                    <tr key={ind.n}>
                      <td className="nd">{ind.n}</td>
                      <td>
                        {ind.rotulo} <span className="fonte">{ind.base === "amostra" ? "lido" : "CRM"}</span>
                        {ind.oQueMede && <span className="expl">{ind.oQueMede}</span>}
                      </td>
                      <td className={`num ${ind.status}`}>{valorIndicador(ind)}</td>
                      <td className="num nd">{referenciaIndicador(ind)}</td>
                      <td className="num nd">
                        {ind.anterior === null ? '—' : valorIndicador({ valor: ind.anterior, unidade: ind.unidade })}
                        {ind.rumo === 'melhorou' ? ' ↑' : ind.rumo === 'piorou' ? ' ↓' : ''}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {/* contado da tabela, não copiado do JSON: o status pode ter sido
              rebaixado, e placar que não bate com a tabela acima derruba a
              confiança no documento inteiro */}
          <p className="mini">
            {(['verde', 'amarelo', 'vermelho', 'nd'] as const).map((k) => {
              const v = indicadores.filter((i) => i.status === k).length;
              return v ? <span key={k}>{k}: <b>{v}</b> &nbsp;·&nbsp; </span> : null;
            })}
          </p>
          {asStrArr(placar.tres_piores).length > 0 && <p className="mini"><b>Três piores:</b> {asStrArr(placar.tres_piores).join(' · ')}</p>}
          {asStr(placar.mais_melhorou) && <p className="mini"><b>Mais melhorou:</b> {asStr(placar.mais_melhorou)}</p>}
          {asStr(placar.mais_piorou) && <p className="mini"><b>Mais piorou:</b> {asStr(placar.mais_piorou)}</p>}
        </section>
      )}

      {/* ——— CRM × real ——— */}
      {crmVsReal.length > 0 && (
        <section>
          <h2>O CRM × o que de fato aconteceu</h2>
          <table>
            <thead><tr><th>Métrica</th><th className="num">CRM</th><th className="num">Real</th><th>Veredito</th><th>Leitura</th></tr></thead>
            <tbody>
              {crmVsReal.map((l, i) => {
                const v = VEREDITO[asStr(l.veredito) as ChaveVeredito];
                return (
                  <tr key={i}>
                    <td><b>{asStr(l.metrica).replace(/_/g, ' ')}</b></td>
                    <td className="num">{valorSolto(l.valor_crm).txt}</td>
                    <td className="num"><b>{valorSolto(l.valor_real).txt}</b></td>
                    <td>{v ? `${v.simb} ${v.txt}` : '—'}</td>
                    <td>{asStr(l.observacao)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* ——— os leads ——— */}
      {leadsAud.length > 0 && (
        <section>
          <h2>Os leads auditados</h2>
          <table>
            <thead><tr>
              <th>Lead</th><th>T</th><th>Etapa CRM</th><th>Etapa real</th><th>Ver.</th>
              <th className="num">Sem toque</th><th>Formato</th><th>O que queria</th><th>Por que parou</th>
            </tr></thead>
            <tbody>
              {leadsAud.map((l, i) => {
                const t = TEMPERATURA[asStr(l.temperatura).toLowerCase()];
                const crmD = asNum(l.sem_toque_crm); const realD = asNum(l.sem_toque_real);
                return (
                  <tr key={i}>
                    <td><b>{asStr(l.lead)}</b></td>
                    <td>{t?.simb || ''}</td>
                    <td>{asStr(l.etapa_crm) || '—'}</td>
                    <td>{asStr(l.etapa_real) || '—'}</td>
                    <td>{asStr(l.veredito) || '—'}</td>
                    <td className="num">{crmD === null ? '—' : crmD} → {realD === null ? 'n/d' : realD}</td>
                    <td>{asStr(l.formato) || '—'}</td>
                    <td>{asStr(l.o_que_o_cliente_queria)}</td>
                    <td>{asStr(l.por_que_parou)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* ——— blocos de métricas ——— */}
      {blocos.map((b) => (
        <section key={b.t}>
          <h2>{b.t}</h2>
          <div className="grade">
            {b.numeros.map(([k, v]) => {
              const s = valorSolto(v);
              return (
                <div key={k} className="cel">
                  <span className="r">{b.rot[k] || k.replace(/_/g, ' ')}</span>
                  <span className={`v${s.nulo ? ' nulo' : ''}`}>{s.txt}</span>
                </div>
              );
            })}
          </div>
          {b.observacao && <p>{b.observacao}</p>}
          {b.t === 'Oportunidade perdida' && sinais.length > 0 && (
            <table>
              <thead><tr><th>Lead</th><th>Data</th><th>O que o cliente disse</th><th>O que voce respondeu</th><th>Veredito</th></tr></thead>
              <tbody>
                {sinais.map((s, i) => (
                  <tr key={i}>
                    <td><b>{asStr(s.lead)}</b></td>
                    <td>{fmtYmd(asStr(s.data))}</td>
                    <td><i>{asStr(s.o_que_o_cliente_disse)}</i></td>
                    <td>{asStr(s.o_que_voce_respondeu)}</td>
                    <td><b>{asStr(s.veredito)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      {metas.length > 0 && (
        <section>
          <h2>Como medir a instrucao — o que precisa ter mudado na proxima rodada</h2>
          <table>
            <thead><tr><th>Indicador</th><th className="num">Hoje</th><th className="num">Meta</th></tr></thead>
            <tbody>
              {metas.map((m, i) => (
                <tr key={i}>
                  <td>{asStr(m.indicador)}</td>
                  <td className="num vermelho">{asStr(m.hoje) || valorSolto(m.hoje).txt}</td>
                  <td className="num verde">{asStr(m.meta) || valorSolto(m.meta).txt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {(asStr(asObj(duasConversas.melhor).lead) || asStr(asObj(duasConversas.pior).lead)) && (
        <section>
          <h2>Duas conversas</h2>
          {([['melhor', 'A melhor — material de treinamento'], ['pior', 'A pior — pauta do 1:1']] as const).map(([k, tit]) => {
            const c = asObj(duasConversas[k]);
            if (!asStr(c.lead)) return null;
            return (
              <div key={k}>
                <h3>{tit}: {asStr(c.lead)}{asStr(c.data) ? ` · ${fmtYmd(asStr(c.data))}` : ''}</h3>
                <p>{asStr(c.por_que)}</p>
              </div>
            );
          })}
        </section>
      )}

      {asStr(a.comparativo_rodada_anterior) && (
        <section>
          <h2>Desde a rodada anterior</h2>
          <p>{asStr(a.comparativo_rodada_anterior)}</p>
        </section>
      )}

      {Object.keys(temperatura).length > 0 && (
        <section>
          <h2>Temperatura da carteira</h2>
          <div className="grade">
            {(['quente', 'morno', 'frio', 'perdido'] as const).map((k) => {
              const v = asNum(temperatura[k]);
              return v === null ? null : (
                <div key={k} className="cel">
                  <span className="r">{TEMPERATURA[k].simb} {k}</span>
                  <span className="v">{v}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ——— corrente causal ——— */}
      {(asStrArr(corrente.elos).length > 0 || asNum(corrente.custo_estimado_vgv) !== null) && (
        <section>
          <h2>A corrente causal</h2>
          {asStrArr(corrente.elos).length > 0 && <ol>{asStrArr(corrente.elos).map((e, i) => <li key={i}>{e}</li>)}</ol>}
          {asStr(corrente.primeiro_elo) && <p><b>O primeiro elo:</b> {asStr(corrente.primeiro_elo)}</p>}
          {(asNum(corrente.custo_estimado_vgv) !== null || asNum(corrente.custo_estimado_comissao) !== null) && (
            <div className="caixa ouro">
              <p className="r">Parado e recuperável agora</p>
              <p className="v">
                {fmtDinheiro(asNum(corrente.custo_estimado_vgv))} de VGV
                {asNum(corrente.custo_estimado_comissao) !== null && ` · ~${fmtDinheiro(asNum(corrente.custo_estimado_comissao))} de comissão`}
              </p>
              {asStr(corrente.base_do_calculo) && <p className="mini" style={{ marginTop: 4 }}><b>Estimativa, não valor apurado.</b> {asStr(corrente.base_do_calculo)}</p>}
            </div>
          )}
        </section>
      )}

      {padroes.length > 0 && (
        <section>
          <h2>Padrões recorrentes</h2>
          <ol>{padroes.map((p, i) => <li key={i}>{p}</li>)}</ol>
        </section>
      )}

      {naoEDele.length > 0 && (
        <section>
          <h2>Nem tudo é do corretor</h2>
          <ul>{naoEDele.map((n, i) => (
            <li key={i}><b>{asStr(n.lead) || asStr(n.tipo).replace(/_/g, ' ')}</b> — {asStr(n.descricao)}</li>
          ))}</ul>
        </section>
      )}

      {/* ——— só o gestor ——— */}
      {soGestor && (riscoOcorr.length > 0 || perguntas.length > 0 || destravar.length > 0) && (
        <>
          <p className="sep">Material do gestor — não entregar ao corretor</p>

          {riscoOcorr.length > 0 && (
            <section>
              <h2>Risco para a imobiliária — gravidade {asStr(risco.gravidade) || '—'}</h2>
              {riscoOcorr.map((o, i) => <Cit key={i} lead={asStr(o.lead)} data={asStr(o.data)} trecho={asStr(o.trecho)} />)}
            </section>
          )}

          {perguntas.length > 0 && (
            <section>
              <h2>Perguntas para a reunião</h2>
              <ol>{perguntas.map((p, i) => <li key={i}>{p}</li>)}</ol>
            </section>
          )}

          {destravar.length > 0 && (
            <section>
              <h2>O que você precisa destravar</h2>
              <table>
                <thead><tr><th style={{ width: '12%' }}>Tipo</th><th>O que travou</th><th style={{ width: '18%' }}>Responsável</th></tr></thead>
                <tbody>
                  {destravar.map((d, i) => (
                    <tr key={i}>
                      <td><b>{TIPO_DESTRAVE[asStr(d.tipo)] || asStr(d.tipo)}</b></td>
                      <td>{asStr(d.descricao)}</td>
                      <td>{asStr(d.responsavel_sugerido) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      {ressalvas.length > 0 && (
        <section>
          <h2>Ressalvas</h2>
          <ul>{ressalvas.map((s, i) => <li key={i} className="mini">{s}</li>)}</ul>
        </section>
      )}

      <div className="rodape">
        <span>Nox Imóveis · auditoria cruzada CRM × WhatsApp · régua {r.versaoDiretrizes || '—'}</span>
        <span>{fmtYmd(r.geradoEmYmd)}</span>
      </div>
    </div>
  );
}
