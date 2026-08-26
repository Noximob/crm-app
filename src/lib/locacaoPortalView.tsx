'use client';

/**
 * PORTAL DA LOCAÇÃO · as duas visões (dono e inquilino) como componentes.
 *
 * Quem usa:
 *   · /portal (público) — alimenta com DEMO_PORTAL enquanto não há login;
 *   · o Setor de Locação — alimenta com portalDaLocacao() de um contrato
 *     REAL, pra pré-visualizar exatamente o que cada cliente veria.
 *
 * Mesmos componentes, fontes diferentes. Quando o login chegar, o portal
 * público troca a fonte e nada aqui muda.
 *
 * A régua das duas telas: a PRIMEIRA COISA que a pessoa vê é o estado dela
 * hoje — em dia, vencendo ou atrasado — e não um formulário. Cada tela
 * responde as três perguntas que geram ligação pra imobiliária:
 *
 *   INQUILINO   quanto eu pago, quando vence, e o meu pedido andou?
 *   DONO        o inquilino pagou, quanto cai pra mim e quando?
 *
 * Decisão do dinheiro refletida aqui: o condomínio NÃO está na cobrança da
 * Nox (o inquilino paga direto à administradora) — as duas telas dizem isso
 * com todas as letras pra ninguém pagar duplicado nem esquecer.
 */
import React, { useState } from 'react';
import { fmtValor, linkWhats, DADOS_IMOBILIARIA, type DadosPortal } from '@/lib/locacao';

const btnOuro = 'px-4 py-2.5 rounded-xl text-[13px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors';

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="al-card relative overflow-hidden p-4 sm:p-5">
      <div className="absolute inset-x-0 top-0 gx-line-gold" />
      <h2 className="al-display text-[12.5px] font-bold text-white uppercase tracking-[0.1em] mb-3">{titulo}</h2>
      {children}
    </section>
  );
}

function LinhaValor({ rot, val, destaque = false }: { rot: string; val: string; destaque?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className={`text-[12.5px] ${destaque ? 'font-bold text-white' : 'text-text-secondary'}`}>{rot}</span>
      <span className={`tabular-nums ${destaque ? 'text-[15px] font-extrabold text-[#FFE9A6]' : 'text-[12.5px] text-white/85'}`}>{val}</span>
    </div>
  );
}

/**
 * A FAIXA DE ESTADO — a primeira coisa da tela.
 *
 * Antes o portal abria neutro: o inquilino atrasado via a mesma tela de quem
 * está em dia. Quem está devendo precisa ver que está devendo, e quem está
 * em dia merece ver o verde.
 */
function Faixa({ tom, titulo, sub }: { tom: 'ok' | 'atencao' | 'alerta'; titulo: string; sub?: string }) {
  const cor = {
    ok: 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300',
    atencao: 'border-[#E8C547]/30 bg-[#E8C547]/[0.08] text-[#FFE9A6]',
    alerta: 'border-rose-500/35 bg-rose-500/10 text-rose-300',
  }[tom];
  const icone = { ok: '✓', atencao: '⏳', alerta: '🚨' }[tom];
  return (
    <div className={`rounded-2xl border px-4 py-3 ${cor}`}>
      <p className="text-[14px] font-extrabold">{icone} {titulo}</p>
      {sub && <p className="text-[12px] opacity-80 mt-0.5">{sub}</p>}
    </div>
  );
}

/** Falar com a imobiliária — em toda tela, porque é o que a pessoa procura. */
function FalarComAImobiliaria({ assunto }: { assunto: string }) {
  const zap = linkWhats(DADOS_IMOBILIARIA.telefone, assunto);
  return (
    <Cartao titulo="Falar com a imobiliária">
      <p className="text-[12.5px] text-text-secondary leading-relaxed mb-3">
        Qualquer dúvida sobre boleto, contrato ou o imóvel — é só chamar. Atendemos de segunda a
        sexta, das 8h30 às 18h30, e no sábado pela manhã.
      </p>
      <div className="flex flex-wrap gap-2">
        {zap && (
          <a href={zap} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl text-[13px] font-bold border border-emerald-500/35 bg-emerald-500/[0.1] text-emerald-300 hover:bg-emerald-500/20 transition-colors">
            💬 Chamar no WhatsApp
          </a>
        )}
        <a href={`mailto:${DADOS_IMOBILIARIA.email}`} className={btnGhost}>✉ {DADOS_IMOBILIARIA.email}</a>
      </div>
    </Cartao>
  );
}

const STATUS_PGTO = {
  pago: { txt: 'pago em dia', cor: 'text-emerald-300' },
  pago_atraso: { txt: 'pago com atraso', cor: 'text-amber-300' },
  aberta: { txt: 'em aberto', cor: 'text-rose-300' },
  prevista: { txt: 'prevista', cor: 'text-text-secondary' },
} as const;

// ---------------------------------------------------------------------------
// a visão do DONO
// ---------------------------------------------------------------------------

export function VisaoDono({ d }: { d: DadosPortal }) {
  const v = d.valores;
  const atrasado = (d.proxima?.atrasadaDias || 0) > 0;
  // o repasse cai em até 2 dias úteis depois do pagamento (regra do contrato)
  const ultimoPago = d.historico.find((h) => h.status === 'pago' || h.status === 'pago_atraso');

  return (
    <div className="space-y-3">
      <p className="text-center text-[13px] text-text-secondary pt-1">
        Olá, <b className="text-white">{d.dono.nome}</b> — aqui está o retrato do seu imóvel.
      </p>

      {/* o estado do mês, antes de qualquer outra coisa */}
      {!d.aguardandoLocacao && (
        atrasado ? (
          <Faixa tom="alerta"
            titulo={`O inquilino está com ${d.proxima?.competencia} em atraso`}
            sub={`Venceu há ${d.proxima?.atrasadaDias} dias. A garantia cobre o aluguel — já estamos cobrando e te retornamos.`} />
        ) : ultimoPago ? (
          <Faixa tom="ok"
            titulo={`${ultimoPago.competencia} recebido — ${fmtValor(ultimoPago.repasse)} repassado`}
            sub={`Pago em ${ultimoPago.pagoEm}. O próximo vencimento é ${d.proxima?.vencimento || '—'}.`} />
        ) : (
          <Faixa tom="atencao" titulo="Primeiro aluguel ainda não venceu"
            sub={`Vence em ${d.proxima?.vencimento || '—'} — o repasse cai em até 2 dias úteis depois.`} />
        )
      )}

      <Cartao titulo="Seu imóvel">
        <p className="text-[14px] font-bold text-white">{d.imovel.titulo}</p>
        <p className="text-[12px] text-text-secondary mt-0.5">{d.imovel.endereco}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px]">
          {d.aguardandoLocacao ? (
            <>
              <span className="text-sky-300 font-bold">● Em divulgação</span>
              <span className="text-text-secondary">aluguel anunciado por <b className="text-white/85">{fmtValor(d.valores.aluguel)}</b></span>
            </>
          ) : (
            <>
              <span className="text-emerald-300 font-bold">● Alugado</span>
              <span className="text-text-secondary">inquilino(a): <b className="text-white/85">{d.inquilino.nome}</b></span>
              <span className="text-text-secondary">
                contrato até <b className="text-white/85">{d.contrato.fim}</b>
                {d.contrato.mesesRestantes !== null && d.contrato.mesesRestantes <= 4 && (
                  <span className="text-amber-300"> · faltam {d.contrato.mesesRestantes} meses</span>
                )}
              </span>
            </>
          )}
        </div>
      </Cartao>

      <Cartao titulo={d.aguardandoLocacao ? 'Quanto você vai receber' : 'O seu repasse, todo mês'}>
        <p className="text-[11.5px] text-text-secondary mb-2 max-w-[58ch]">
          {d.aguardandoLocacao
            ? 'Assim que o imóvel for alugado, é isto que cai na sua conta todo mês — em até 2 dias úteis depois do pagamento do inquilino, num PIX só.'
            : `O aluguel vence dia ${d.contrato.diaVencimento ?? '—'}. Confirmado o pagamento, o repasse cai na sua conta em até 2 dias úteis, num PIX só, com o extrato abaixo.`}
        </p>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <LinhaValor rot="Aluguel pago pelo inquilino" val={fmtValor(v.aluguel)} />
          <LinhaValor rot={`Taxa de administração (${v.taxaAdmPct}% — só sobre o aluguel)`} val={`− ${fmtValor(v.taxaAdm)}`} />
          {v.iptuMensal > 0 && <LinhaValor rot="Reembolso do IPTU (você paga a prefeitura)" val={`+ ${fmtValor(v.iptuMensal)}`} />}
          <div className="border-t border-white/[0.08] mt-1 pt-1">
            <LinhaValor rot="Cai pra você, todo mês" val={fmtValor(v.repasseDono)} destaque />
          </div>
        </div>
        <p className="text-[10.5px] text-text-secondary mt-2 max-w-[58ch]">
          {v.condominio > 0 && <>O condomínio ({fmtValor(v.condominio)}) é pago pelo inquilino direto à administradora — não passa por aqui. </>}
          A taxa de administração é dedutível no seu Imposto de Renda, e o reembolso do IPTU não é
          rendimento tributável — o informe anual já vem separado.
        </p>
      </Cartao>

      {/* o fechamento do ano — a pergunta que todo dono faz em abril */}
      {!d.aguardandoLocacao && d.ano.pagas > 0 && (
        <Cartao titulo={`Recebido em ${d.ano.rotulo}`}>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <p className="text-[24px] font-extrabold text-emerald-300 tabular-nums leading-none">{fmtValor(d.ano.totalRepassado)}</p>
              <p className="text-[11px] text-text-secondary mt-1">repassado pra você em {d.ano.pagas} {d.ano.pagas === 1 ? 'mês' : 'meses'}</p>
            </div>
            <div>
              <p className="text-[15px] font-bold text-white/80 tabular-nums leading-none">{fmtValor(d.ano.totalPago)}</p>
              <p className="text-[11px] text-text-secondary mt-1">total cobrado do inquilino</p>
            </div>
          </div>
          <p className="text-[10.5px] text-text-secondary mt-3">
            O informe de rendimentos do ano fica pronto em fevereiro — é só pedir pelo WhatsApp.
          </p>
        </Cartao>
      )}

      {!d.aguardandoLocacao && (
        <Cartao titulo="Histórico de repasses">
          {d.historico.length === 0 ? (
            <p className="text-[12px] text-text-secondary">O primeiro mês do contrato ainda não fechou.</p>
          ) : (
            <div className="space-y-1.5">
              {d.historico.map((h) => {
                const st = STATUS_PGTO[h.status];
                return (
                  <div key={h.competencia} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1 border-b border-white/[0.05] last:border-0">
                    <span className="text-[12.5px] font-bold text-white w-[110px]">{h.competencia}</span>
                    <span className={`text-[11.5px] font-bold ${st.cor}`}>{st.txt}</span>
                    <span className="text-[11.5px] text-emerald-300 ml-auto tabular-nums">
                      {h.status === 'aberta' ? '—' : fmtValor(h.repasse)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Cartao>
      )}

      {!d.aguardandoLocacao && (
        <Cartao titulo="Seu contrato">
          <div className="grid grid-cols-2 gap-x-6">
            <LinhaValor rot="Início" val={d.contrato.inicio} />
            <LinhaValor rot="Fim" val={d.contrato.fim} />
            <LinhaValor rot="Prazo" val={d.contrato.prazoMeses ? `${d.contrato.prazoMeses} meses` : '—'} />
            <LinhaValor rot="Reajuste" val={`${d.contrato.indiceReajuste} · ${d.contrato.proximoReajuste}`} />
            <LinhaValor rot="Garantia" val={d.contrato.garantia} />
            <LinhaValor rot="Vencimento" val={`todo dia ${d.contrato.diaVencimento ?? '—'}`} />
          </div>
          {d.contrato.diasAteReajuste !== null && d.contrato.diasAteReajuste <= 60 && (
            <p className="text-[11.5px] text-amber-300 mt-2">
              ⏳ O reajuste anual pelo {d.contrato.indiceReajuste} entra em {d.contrato.proximoReajuste} — avisamos você e o inquilino antes.
            </p>
          )}
        </Cartao>
      )}

      {d.avisos.length > 0 && (
        <Cartao titulo="Avisos">
          {d.avisos.map((a, i) => (
            <p key={i} className="text-[12.5px] text-white/85 leading-relaxed">
              {a.data && <span className="text-[10.5px] text-text-secondary font-bold tabular-nums mr-2">{a.data}</span>}
              {a.texto}
            </p>
          ))}
        </Cartao>
      )}

      <FalarComAImobiliaria assunto={`Olá! Sou ${d.dono.nome}, proprietário do imóvel ${d.imovel.codigo}.`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// a visão do INQUILINO
// ---------------------------------------------------------------------------

export function VisaoInquilino({ d }: { d: DadosPortal }) {
  const v = d.valores;
  const [pedido, setPedido] = useState('');
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  const atrasoDias = d.proxima?.atrasadaDias || 0;
  const diasAteVencer = d.proxima?.diasAte ?? 0;

  return (
    <div className="space-y-3">
      <p className="text-center text-[13px] text-text-secondary pt-1">
        Olá, <b className="text-white">{d.inquilino.nome}</b> — aqui está tudo sobre o seu aluguel.
      </p>

      {/* o estado hoje, antes de qualquer outra coisa */}
      {!d.proxima ? (
        <Faixa tom="ok" titulo="Tudo em dia" sub="Nenhuma cobrança em aberto. 👏" />
      ) : atrasoDias > 0 ? (
        <Faixa tom="alerta"
          titulo={`${d.proxima.competencia} está em atraso há ${atrasoDias} ${atrasoDias === 1 ? 'dia' : 'dias'}`}
          sub={`Venceu em ${d.proxima.vencimento}. Pegue a 2ª via abaixo — se já pagou, avise a gente pelo WhatsApp.`} />
      ) : diasAteVencer <= 5 ? (
        <Faixa tom="atencao"
          titulo={diasAteVencer === 0 ? `${d.proxima.competencia} vence HOJE` : `${d.proxima.competencia} vence em ${diasAteVencer} ${diasAteVencer === 1 ? 'dia' : 'dias'}`}
          sub={`${fmtValor(v.totalInquilino)} · vencimento ${d.proxima.vencimento}.`} />
      ) : (
        <Faixa tom="ok" titulo="Tudo em dia"
          sub={`A próxima cobrança (${d.proxima.competencia}) vence em ${d.proxima.vencimento}.`} />
      )}

      <Cartao titulo="Próxima cobrança">
        {d.proxima ? (
          <>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[26px] font-extrabold text-[#FFE9A6] tabular-nums leading-none">{fmtValor(v.totalInquilino)}</span>
              <span className="text-[12px] text-text-secondary">
                {d.proxima.competencia} · vence em <b className="text-white/85">{d.proxima.vencimento}</b>
              </span>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 mt-2">
              <LinhaValor rot="Aluguel" val={fmtValor(v.aluguel)} />
              {v.iptuMensal > 0 && <LinhaValor rot="IPTU (parcela mensal)" val={fmtValor(v.iptuMensal)} />}
              {v.seguroIncendio > 0 && <LinhaValor rot="Seguro incêndio" val={fmtValor(v.seguroIncendio)} />}
              <div className="border-t border-white/[0.08] mt-1 pt-1">
                <LinhaValor rot="Total do boleto" val={fmtValor(v.totalInquilino)} destaque />
              </div>
            </div>
            {v.condominio > 0 && (
              <p className="text-[11px] text-amber-200/90 mt-2 max-w-[58ch]">
                ⚠ O condomínio ({fmtValor(v.condominio)}) <b>não está neste boleto</b>: você paga direto à
                administradora do condomínio, como combinado no contrato.
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <button className={btnOuro} onClick={() => alert('A 2ª via do boleto fica disponível aqui quando a emissão automática (Asaas) entrar no ar.')}>
                📄 2ª via do boleto
              </button>
              <button className={btnGhost} onClick={() => alert('O PIX copia-e-cola fica disponível aqui quando a emissão automática (Asaas) entrar no ar.')}>
                ⚡ Pagar com PIX
              </button>
            </div>
          </>
        ) : (
          <p className="text-[12px] text-text-secondary">Nenhuma cobrança em aberto. 👏</p>
        )}
      </Cartao>

      <Cartao titulo="Seus pagamentos">
        {d.historico.length === 0 ? (
          <p className="text-[12px] text-text-secondary">O primeiro pagamento ainda não venceu.</p>
        ) : (
          <div className="space-y-1.5">
            {d.historico.map((h) => {
              const st = STATUS_PGTO[h.status];
              return (
                <div key={h.competencia} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1 border-b border-white/[0.05] last:border-0">
                  <span className="text-[12.5px] font-bold text-white w-[110px]">{h.competencia}</span>
                  <span className={`text-[11.5px] font-bold ${st.cor}`}>{st.txt}</span>
                  <span className="text-[11.5px] text-white/70 tabular-nums">{fmtValor(h.valor)}</span>
                  <span className="text-[11.5px] text-text-secondary ml-auto tabular-nums">
                    {h.status === 'aberta' || h.status === 'prevista' ? `vence ${h.vencimento}` : `pago em ${h.pagoEm}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {d.ano.pagas > 0 && (
          <p className="text-[11px] text-text-secondary mt-2 pt-2 border-t border-white/[0.06]">
            Em {d.ano.rotulo} você já pagou <b className="text-white/85">{fmtValor(d.ano.totalPago)}</b> em {d.ano.pagas} {d.ano.pagas === 1 ? 'mês' : 'meses'}.
          </p>
        )}
      </Cartao>

      <Cartao titulo="Seu contrato">
        <p className="text-[12.5px] text-white/90 font-bold">{d.imovel.titulo}</p>
        <p className="text-[11.5px] text-text-secondary mb-2">{d.imovel.endereco}</p>
        <div className="grid grid-cols-2 gap-x-6">
          <LinhaValor rot="Início" val={d.contrato.inicio} />
          <LinhaValor rot="Fim" val={d.contrato.fim} />
          <LinhaValor rot="Reajuste" val={`${d.contrato.indiceReajuste} · ${d.contrato.proximoReajuste}`} />
          <LinhaValor rot="Vencimento" val={`todo dia ${d.contrato.diaVencimento ?? '—'}`} />
          <LinhaValor rot="Garantia" val={d.contrato.garantia} />
        </div>
        {d.contrato.mesesRestantes !== null && (
          <p className="text-[11.5px] text-text-secondary mt-2 pt-2 border-t border-white/[0.06]">
            {d.contrato.mesesRestantes <= 4
              ? <span className="text-amber-300">⏳ Faltam {d.contrato.mesesRestantes} {d.contrato.mesesRestantes === 1 ? 'mês' : 'meses'} de contrato — vamos conversar sobre a renovação em breve.</span>
              : <>Faltam {d.contrato.mesesRestantes} meses de contrato.</>}
          </p>
        )}
        {d.contrato.diasAteReajuste !== null && d.contrato.diasAteReajuste <= 60 && d.contrato.diasAteReajuste >= 0 && (
          <p className="text-[11.5px] text-amber-300 mt-1.5">
            ⏳ O reajuste anual pelo {d.contrato.indiceReajuste} entra em {d.contrato.proximoReajuste}. Avisamos o valor novo antes.
          </p>
        )}
      </Cartao>

      <Cartao titulo="Manutenção">
        {/* os pedidos anteriores: sem isto o inquilino liga pra perguntar
            "e o meu chamado?", que é o telefonema mais comum da locação */}
        {d.chamados.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {d.chamados.map((c, i) => (
              <div key={i} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                <p className="text-[12px] text-white/85">{c.descricao}</p>
                <p className="text-[11px] font-bold text-[#FFE9A6] mt-0.5">🔧 {c.status}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11.5px] text-text-secondary mb-2 max-w-[58ch]">
          Algo quebrou ou precisa de reparo? Descreva aqui — a imobiliária recebe, aciona o responsável
          (dono ou você, conforme o contrato) e te retorna com o encaminhamento.
        </p>
        {pedidoEnviado ? (
          <p className="text-[12.5px] text-emerald-300 font-bold">✓ Pedido registrado{d.demo ? ' (demonstração)' : ''} — a imobiliária recebe e te retorna.</p>
        ) : (
          <>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40 min-h-[70px]"
              value={pedido} onChange={(e) => setPedido(e.target.value)}
              placeholder="Ex.: a torneira da cozinha está pingando desde ontem…" />
            <button className={btnOuro + ' mt-2'} disabled={!pedido.trim()} onClick={() => setPedidoEnviado(true)}>
              Enviar pedido
            </button>
          </>
        )}
      </Cartao>

      {d.avisos.length > 0 && (
        <Cartao titulo="Avisos da imobiliária">
          <div className="space-y-2">
            {d.avisos.map((a, i) => (
              <div key={i} className="text-[12.5px] text-white/85 leading-relaxed">
                <span className="text-[10.5px] text-text-secondary font-bold tabular-nums mr-2">{a.data}</span>
                {a.texto}
              </div>
            ))}
          </div>
        </Cartao>
      )}

      <FalarComAImobiliaria assunto={`Olá! Sou ${d.inquilino.nome}, inquilino(a) do imóvel ${d.imovel.codigo}.`} />
    </div>
  );
}
