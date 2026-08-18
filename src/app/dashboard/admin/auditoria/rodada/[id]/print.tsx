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
  asObj, asArr, asStr, asNum, fmtYmd, fmtDinheiro, fmtNum,
  valorIndicador, referenciaIndicador, VEREDITO, TEMPERATURA, naturezaLegivel,
  TIPO_DESTRAVE, PRAZO_LEGIVEL, PERGUNTA_DO_GRUPO,
  type ChaveVeredito, type Indicador,
} from '@/lib/auditoriaAnalise';
import { lerRelatorio, type Citacao as TCitacao } from '@/lib/auditoriaRelatorio';

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
#aud-print .anot { margin: 5px 0; padding: 6px 10px; background: #f7f8f9;
  border: 1px solid #d8dbdf; border-radius: 4px; }
#aud-print .anot p { font-size: 10px; margin: 0; }
#aud-print .anot .r { font-size: 7px; font-weight: 800; letter-spacing: 1.2px;
  text-transform: uppercase; color: #6b7075; display: block; margin-bottom: 2px; }
#aud-print .anot .src { font-size: 8.5px; font-weight: 700; color: #55595f; display: block; margin-top: 3px; }
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

/**
 * Mesma regra da tela: trecho que não é fala de ninguém não sai entre aspas
 * em itálico. No papel isso importa ainda mais — o corretor leva o PDF para
 * casa e relê sozinho, sem ninguém por perto para explicar.
 */
const PARECE_ANOTACAO = /CRM:|WhatsApp:|whatsapp:|→|\bdias sem\b|\bsem toque\b|^\s*\[/;

function Cit({ c, mostrarLead = true }: { c: TCitacao; mostrarLead?: boolean }) {
  if (!c.trecho) return null;
  const src = [mostrarLead ? c.lead : '', c.data ? fmtYmd(c.data) : ''].filter(Boolean).join(' · ');
  if (PARECE_ANOTACAO.test(c.trecho)) {
    return (
      <div className="anot">
        <span className="r">anotação da análise — não é fala do cliente</span>
        <p>{c.trecho}</p>
        {src && <span className="src">{src}</span>}
      </div>
    );
  }
  return (
    <blockquote>
      <p>“{c.trecho}”</p>
      {src && <span className="src">{src}</span>}
    </blockquote>
  );
}

/** Duas citações provam o padrão; as outras só cansam. */
const duas = (l: TCitacao[]) => l.slice(0, 2);

export default function RodadaPrint({ r, a, indicadores, porGrupo, modo }: Props) {
  const rel = lerRelatorio(a);
  const natureza = naturezaLegivel(rel.natureza);
  const destaques = asObj(rel.legado.destaques);
  const combinado = rel.legado.combinado;
  const metas = asArr(combinado.metas);
  const dinheiroParado = asNum(combinado.dinheiro_parado);
  const paradosPrazo = asArr(combinado.leads_parados_alem_do_prazo);
  const descartesExplicar = asArr(combinado.descartes_a_explicar);
  const fichaIncompleta = asArr(combinado.ficha_incompleta);
  const naoCombinado = asArr(combinado.o_que_nao_foi_combinado).map((x) => String(x));

  const v = rel.veredito;
  const vTotal = v.ok + v.processo + v.naoFez + v.naoVerificavel;
  const foraDaRegua = indicadores.filter((i) => i.status === 'vermelho').length;
  const pctLido = rel.cobertura.lidas !== null && rel.cobertura.naAmostra
    ? Math.round((rel.cobertura.lidas / rel.cobertura.naAmostra) * 100) : null;

  const gestor = modo === 'gestor';
  const temProva = indicadores.length > 0 || rel.leads.length > 0 || paradosPrazo.length > 0
    || descartesExplicar.length > 0 || fichaIncompleta.length > 0 || naoCombinado.length > 0
    || rel.ressalvas.length > 0;

  return (
    <div id="aud-print">

      <div className="cab">
        <div>
          <p className="marca">NOX IMÓVEIS · AUDITORIA DE ATENDIMENTO</p>
          <h1>{r.corretorNome}</h1>
        </div>
        <div className="cab-dir">
          {fmtYmd(r.periodoInicio)} a {fmtYmd(r.periodoFim)}<br />
          {pctLido !== null && <>{fmtNum(rel.cobertura.lidas)} de {fmtNum(rel.cobertura.naAmostra)} conversas lidas<br /></>}
          régua {r.versaoDiretrizes || '—'}
          {natureza.txt !== '—' && <> · natureza {natureza.txt}</>}
        </div>
      </div>

      {/* ——— a conversa em duas frases ——— */}
      {rel.gargalo && (
        <div className="caixa">
          <p className="r">O gargalo</p>
          <p className="v">{rel.gargalo}</p>
        </div>
      )}
      {rel.instrucao && (
        <div className="caixa ouro">
          <p className="r">A instrução{PRAZO_LEGIVEL[rel.prazoInstrucao] ? ` · prazo ${PRAZO_LEGIVEL[rel.prazoInstrucao]}` : ''}</p>
          <p className="v">{rel.instrucao}</p>
        </div>
      )}

      {/* ——— o retrato: todo número num lugar só ——— */}
      {(pctLido !== null || vTotal > 0 || metas.length > 0) && (
        <section>
          <h2>O retrato — os números da rodada</h2>
          <div className="grade">
            {pctLido !== null && (
              <div className="cel">
                <span className="r">conversas lidas</span>
                <span className="v">{fmtNum(rel.cobertura.lidas)} de {fmtNum(rel.cobertura.naAmostra)}</span>
                <span className="expl">{pctLido}% da amostra. O relatório vale para estas.</span>
              </div>
            )}
            {vTotal > 0 && (
              <div className="cel">
                {/* "não fez" é veredito de VERIFICAÇÃO, não de desempenho —
                    sozinho ele imprimia "0" logo abaixo de um gargalo que
                    dizia o contrário. Somado ao "fez e não registrou" vira o
                    número que o gestor procura. */}
                <span className="r">clientes com algo a tratar</span>
                <span className={'v ' + (v.processo + v.naoFez > 0 ? 'vermelho' : 'verde')}>{fmtNum(v.processo + v.naoFez)}</span>
                <span className="expl">{v.ok} estavam em ordem{v.naoVerificavel ? ` · ${v.naoVerificavel} sem conversa para conferir` : ''}</span>
              </div>
            )}
            {indicadores.length > 0 && (
              <div className="cel">
                <span className="r">indicadores fora da régua</span>
                <span className={'v ' + (foraDaRegua > 0 ? 'vermelho' : 'verde')}>{foraDaRegua} de {indicadores.length}</span>
                <span className="expl">fora do que a casa combinou — não do padrão de mercado</span>
              </div>
            )}
            {dinheiroParado !== null && (
              <div className="cel">
                <span className="r">dinheiro da casa parado</span>
                <span className="v vermelho">{fmtDinheiro(dinheiroParado)}</span>
                <span className="expl">o que a casa pagou pelos leads que estão sem toque</span>
              </div>
            )}
          </div>

          {vTotal > 0 && (
            <p className="mini">
              Dos clientes lidos: <b>{v.ok}</b> fez e registrou · <b>{v.processo}</b> fez e não registrou ·
              {' '}<b>{v.naoFez}</b> não fez · <b>{v.naoVerificavel}</b> não verificável.
              {' '}{v.processo > v.naoFez
                ? 'Mais “fez e não registrou” que “não fez”: a conversa é sobre disciplina de registro.'
                : 'Mais “não fez” que “fez e não registrou”: a conversa é sobre o trabalho que não aconteceu.'}
            </p>
          )}

          {metas.length > 0 && (
            <>
              <h3>As metas do período</h3>
              <table>
                <thead>
                  <tr><th>Meta</th><th className="num">Feito</th><th className="num">Meta</th><th>Leitura</th></tr>
                </thead>
                <tbody>
                  {metas.map((m, i) => {
                    const bateu = m.bateu === true;
                    const semMeta = asNum(m.meta) === null || m.avaliavel === false;
                    // VGV é dinheiro: o pró-rata da meta mensal cai em centavos
                    const dinheiro = /vgv|valor/i.test(asStr(m.indicador));
                    const fmt = (x: number | null) => (dinheiro ? fmtDinheiro(x) : fmtNum(x));
                    return (
                      <tr key={i}>
                        <td>{asStr(m.indicador).replace(/_/g, ' ')}</td>
                        <td className={'num ' + (semMeta ? 'nd' : bateu ? 'verde' : 'vermelho')}>{fmt(asNum(m.realizado))}</td>
                        <td className="num">{semMeta ? '—' : fmt(asNum(m.meta))}</td>
                        <td>{asStr(m.faltou)
                          || (asNum(m.meta) === null ? 'a casa não cobra isto'
                            : m.avaliavel === false ? `meta de ${fmtNum(asNum(m.meta_mensal))} no mês — não dá pra cobrar neste período`
                              : bateu ? 'meta batida' : '')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}

      {/* ——— a fila de amanhã ——— */}
      {rel.fila.length > 0 && (
        <section>
          <h2>Fila de ataque — o que fazer amanhã de manhã, nesta ordem</h2>
          {rel.fila.map((f, i) => {
            const t = TEMPERATURA[asStr(f.temperatura).toLowerCase()] || TEMPERATURA.frio;
            const dias = asNum(f.esfria_em_dias);
            const urgente = dias !== null && dias <= 3;
            return (
              <div key={i} className={'fila' + (urgente ? ' urg' : '')}>
                <p className="top">
                  {asNum(f.posicao) ?? i + 1}. {asStr(f.lead) || 'lead'}
                  <span className="meta">
                    {'  '}{t.simb} {asStr(f.temperatura)}
                    {asNum(f.valor_em_jogo) !== null && `  ·  ${fmtDinheiro(asNum(f.valor_em_jogo))}`}
                    {dias !== null && `  ·  esfria em ${dias} dia${dias === 1 ? '' : 's'}`}
                  </span>
                </p>
                {asStr(f.por_que_agora) && <p className="mini">{asStr(f.por_que_agora)}</p>}
                {asStr(f.mensagem_pronta) && (
                  <div className="msg">
                    <span className="r">mensagem pronta</span>
                    <p>{asStr(f.mensagem_pronta)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ——— o que faz bem ——— */}
      {(rel.acertos.length > 0 || asStr(destaques.observacao)) && (
        <section>
          <h2>O que você faz bem — manter e replicar</h2>
          {asStr(destaques.observacao) && <p>{asStr(destaques.observacao)}</p>}
          {rel.acertos.map((ac, i) => (
            <div key={i}>
              <h3>{ac.lead || 'lead'}{ac.valeComoTreino ? ' — vale como treino do time' : ''}</h3>
              <Cit c={ac} mostrarLead={false} />
              {ac.porQue && <p className="mini"><b>Por que funciona:</b> {ac.porQue}</p>}
            </div>
          ))}
        </section>
      )}

      {/* ——— o que muda ——— */}
      {rel.achados.length > 0 && (
        <section>
          <h2>O que muda a partir de agora</h2>
          <p className="mini">Cada ponto é um padrão que se repete, não um caso isolado. Os exemplos são a prova dele.</p>
          {rel.achados.map((ac, i) => {
            const est = VEREDITO[ac.estado as ChaveVeredito];
            return (
              <div key={i}>
                <h3>
                  {ac.titulo || `Ponto ${i + 1}`}
                  {est && <span className="meta"> — {est.simb} {est.txt}</span>}
                  {ac.quantosLeads !== null && <span className="meta"> · em {fmtNum(ac.quantosLeads)} cliente{ac.quantosLeads === 1 ? '' : 's'}</span>}
                </h3>
                {ac.oQueAconteceu && <p><b>O que aconteceu.</b> {ac.oQueAconteceu}</p>}
                {duas(ac.citacoes).map((c, j) => <Cit key={j} c={c} />)}
                {ac.citacoes.length > 2 && (
                  <p className="mini">+ {ac.citacoes.length - 2} exemplo{ac.citacoes.length - 2 === 1 ? '' : 's'} do mesmo erro estão no sistema.</p>
                )}
                {ac.oQueCustou && <p><b>O que custou.</b> {ac.oQueCustou}</p>}
                {ac.oQueFazer && <p><b>O que fazer no lugar.</b> {ac.oQueFazer}</p>}
                {ac.mensagemPronta && (
                  <div className="msg">
                    <span className="r">modelo</span>
                    <p>{ac.mensagemPronta}</p>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ——— o que a casa deve ——— */}
      {rel.naoEDele.length > 0 && (
        <section>
          <h2>Nem tudo é do corretor</h2>
          <p className="mini">O que a casa precisa assumir antes de cobrar dele.</p>
          <ul>
            {rel.naoEDele.map((n, i) => (
              <li key={i}><b>{asStr(n.lead) || asStr(n.tipo).replace(/_/g, ' ')}</b> — {asStr(n.descricao)}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ——— só o gestor ——— */}
      {gestor && (rel.perguntas.length > 0 || rel.risco.length > 0 || rel.destravar.length > 0) && (
        <>
          <p className="sep">Só para o gestor · preparação do 1:1</p>

          {rel.perguntas.length > 0 && (
            <section>
              <h2>Perguntas para a reunião</h2>
              <p className="mini">Perguntas, não acusações — a primeira abre a conversa.</p>
              <ol>{rel.perguntas.map((p, i) => <li key={i}>{p}</li>)}</ol>
            </section>
          )}

          {rel.risco.length > 0 && (
            <section>
              <h2>Risco para a imobiliária</h2>
              <p className="mini">Cada ocorrência traz o trecho literal — sem prova, não se registra.</p>
              {rel.risco.map((o, i) => (
                <div key={i}>
                  <Cit c={o} />
                  {o.porQue && <p className="mini">{o.porQue}</p>}
                </div>
              ))}
            </section>
          )}

          {rel.destravar.length > 0 && (
            <section>
              <h2>O que a casa precisa destravar</h2>
              <table>
                <thead><tr><th>Tipo</th><th>O que travou</th><th>Responsável</th></tr></thead>
                <tbody>
                  {rel.destravar.map((d, i) => (
                    <tr key={i}>
                      <td>{TIPO_DESTRAVE[asStr(d.tipo)] || asStr(d.tipo)}</td>
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

      {/* ——— a prova, em folha própria ——— */}
      {temProva && (
        <>
          <div className="pg" />
          <p className="sep">A prova · de onde saiu cada número</p>

          {indicadores.length > 0 && (
            <section>
              <h2>Os números, linha a linha</h2>
              <p className="mini">
                <span className="fonte">lido</span> saiu dos {fmtNum(rel.cobertura.lidas)} clientes cuja conversa foi lida —
                é amostra sorteada nas faixas mais críticas e não representa a carteira inteira.
                {' '}<span className="fonte">CRM</span> saiu da carteira toda, direto do sistema — cobre todo mundo,
                mas mede o que foi digitado. Vermelho só contra régua que a casa combinou.
              </p>
              <table>
                <thead>
                  <tr><th>#</th><th>Indicador</th><th className="num">Valor</th><th className="num">Referência</th><th className="num">Anterior</th></tr>
                </thead>
                <tbody>
                  {porGrupo.map(([grupo, linhas]) => (
                    <React.Fragment key={grupo}>
                      <tr className="grp"><td colSpan={5}>{grupo}{PERGUNTA_DO_GRUPO[grupo] ? ` — ${PERGUNTA_DO_GRUPO[grupo]}` : ''}</td></tr>
                      {linhas.map((ind) => (
                        <tr key={ind.n}>
                          <td>{ind.n}</td>
                          <td>
                            {ind.rotulo} <span className="fonte">{ind.base === 'amostra' ? 'lido' : 'CRM'}</span>
                            {ind.oQueMede && <span className="expl">{ind.oQueMede}</span>}
                          </td>
                          <td className={'num ' + ind.status}>{valorIndicador(ind)}</td>
                          <td className="num">
                            {referenciaIndicador(ind)}
                            {ind.origemReferencia === 'mercado' && <span className="expl">de mercado, não combinado</span>}
                          </td>
                          <td className="num">
                            {ind.anterior === null ? '—' : valorIndicador({ valor: ind.anterior, unidade: ind.unidade })}
                            {ind.rumo === 'melhorou' ? ' ↑' : ind.rumo === 'piorou' ? ' ↓' : ''}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {rel.leads.length > 0 && (
            <section>
              <h2>Cliente por cliente</h2>
              {rel.leadsSemAchado !== null && (
                <p className="mini">{rel.leads.length} clientes na lista. Outros {rel.leadsSemAchado} foram lidos e estavam em ordem.</p>
              )}
              <table>
                <thead>
                  <tr><th>Cliente</th><th></th><th>Etapa no CRM</th><th>Etapa real</th><th className="num">Sem toque</th><th>O que travou</th></tr>
                </thead>
                <tbody>
                  {rel.leads.map((l, i) => {
                    const vd = VEREDITO[l.veredito as ChaveVeredito];
                    const divergiu = !!l.etapaReal && !!l.etapaCrm && l.etapaReal !== l.etapaCrm;
                    return (
                      <tr key={i}>
                        <td><b>{l.lead}</b></td>
                        <td>{vd ? vd.simb : '—'}</td>
                        <td>{l.etapaCrm || '—'}</td>
                        <td className={divergiu ? 'amarelo' : ''}>{l.etapaReal || '—'}</td>
                        <td className="num">{l.diasSemToqueReal === null ? '—' : `${fmtNum(l.diasSemToqueReal)}d`}</td>
                        <td>{l.porQueParou || l.oQueQueria}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {(paradosPrazo.length > 0 || descartesExplicar.length > 0 || fichaIncompleta.length > 0 || naoCombinado.length > 0) && (
            <section>
              <h2>O combinado — o que a casa acertou antes</h2>

              {paradosPrazo.length > 0 && (
                <>
                  <h3>Passaram do prazo da etapa</h3>
                  <table>
                    <thead><tr><th>Lead</th><th>Etapa</th><th className="num">Está há</th><th className="num">Prazo</th></tr></thead>
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
                  <p className="mini">Motivos que não se parecem com nenhum critério da régua. Pergunta, não acusação.</p>
                  <table>
                    <thead><tr><th>Motivo registrado</th><th className="num">Quantos</th><th>Por que chamou atenção</th></tr></thead>
                    <tbody>
                      {descartesExplicar.map((x, i) => (
                        <tr key={i}>
                          <td>“{asStr(x.motivo)}”</td>
                          <td className="num">{fmtNum(asNum(x.quantidade))}</td>
                          <td>{asStr(x.por_que_chamou_atencao)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {fichaIncompleta.length > 0 && (
                <>
                  <h3>Ficha do cliente incompleta</h3>
                  <p className="mini">
                    {fichaIncompleta.map((f, i) => (
                      <React.Fragment key={i}>{i > 0 ? ' · ' : ''}<b>{asStr(f.campo)}</b>: falta em {fmtNum(asNum(f.leads_sem))}</React.Fragment>
                    ))}
                  </p>
                </>
              )}

              {naoCombinado.length > 0 && (
                <>
                  <h3>Isto ainda não foi combinado — cobrança do gestor, não dele</h3>
                  <ul>{naoCombinado.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </>
              )}
            </section>
          )}

          {rel.ressalvas.length > 0 && (
            <section>
              <h2>Ressalvas — o que não foi possível verificar</h2>
              <ul>{rel.ressalvas.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </section>
          )}
        </>
      )}

      <div className="rodape">
        <span>Nox Imóveis · análise cruzada CRM × WhatsApp · régua {r.versaoDiretrizes || '—'}</span>
        <span>{r.corretorNome} · gerado em {fmtYmd(r.geradoEmYmd)}</span>
      </div>
    </div>
  );
}
