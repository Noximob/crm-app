'use client';

/**
 * PORTAL DA LOCAÇÃO · as duas visões (dono e inquilino) como componentes.
 *
 * Quem usa:
 *   · /portal (público) — alimenta com DEMO_PORTAL enquanto não há login;
 *   · a área do admin — alimenta com dadosPortalDoContrato() de um contrato
 *     REAL, pra pré-visualizar exatamente o que cada cliente veria.
 *
 * Mesmos componentes, fontes diferentes. Quando o login chegar, o portal
 * público troca a fonte e nada aqui muda.
 *
 * Decisão do dinheiro refletida aqui: o condomínio NÃO está na cobrança da
 * Nox (o inquilino paga direto à administradora) — as duas telas dizem isso
 * com todas as letras pra ninguém pagar duplicado nem esquecer.
 */
import React, { useState } from 'react';
import { fmtValor, type DadosPortal } from '@/lib/locacao';

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

const STATUS_PGTO = {
  pago: { txt: 'pago em dia', cor: 'text-emerald-300' },
  pago_atraso: { txt: 'pago com atraso', cor: 'text-amber-300' },
  aberta: { txt: 'em aberto', cor: 'text-sky-300' },
  prevista: { txt: 'prevista', cor: 'text-text-secondary' },
} as const;

// ---------------------------------------------------------------------------
// a visão do DONO
// ---------------------------------------------------------------------------

export function VisaoDono({ d }: { d: DadosPortal }) {
  const v = d.valores;
  return (
    <div className="space-y-3">
      <p className="text-center text-[13px] text-text-secondary pt-1">
        Olá, <b className="text-white">{d.dono.nome}</b> — aqui está o retrato do seu imóvel.
      </p>

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
              <span className="text-text-secondary">contrato até <b className="text-white/85">{d.contrato.fim}</b></span>
            </>
          )}
        </div>
      </Cartao>

      <Cartao titulo={d.aguardandoLocacao ? 'Quanto você vai receber' : 'O seu repasse'}>
        <p className="text-[11.5px] text-text-secondary mb-2 max-w-[58ch]">
          {d.aguardandoLocacao
            ? 'Assim que o imóvel for alugado, é isto que cai na sua conta todo mês — em até 2 dias úteis depois do pagamento do inquilino, num PIX só.'
            : `O aluguel vence dia ${d.contrato.diaVencimento ?? '—'}. Confirmado o pagamento, o repasse cai na sua conta em até 2 dias úteis, num PIX só, com o extrato abaixo.`}
        </p>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <LinhaValor rot="Aluguel pago pelo inquilino" val={fmtValor(v.aluguel)} />
          <LinhaValor rot={`Taxa de administração (${v.taxaAdmPct}% — só sobre o aluguel)`} val={`− ${fmtValor(v.taxaAdm)}`} />
          {v.iptuMensal > 0 && <LinhaValor rot="Reembolso do IPTU (o senhor paga a prefeitura)" val={`+ ${fmtValor(v.iptuMensal)}`} />}
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

      {!d.aguardandoLocacao && (
      <Cartao titulo="Histórico de pagamentos">
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
                  <span className="text-[11.5px] text-text-secondary ml-auto tabular-nums">repasse de {fmtValor(d.valores.repasseDono)}</span>
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

      <Cartao titulo="Falar com a imobiliária">
        <p className="text-[12.5px] text-text-secondary leading-relaxed">
          Dúvida sobre repasse, contrato ou o imóvel: chame a Nox no WhatsApp ou pelo telefone da
          imobiliária. Quem cuida da sua locação responde por aqui também.
        </p>
      </Cartao>
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

  return (
    <div className="space-y-3">
      <p className="text-center text-[13px] text-text-secondary pt-1">
        Olá, <b className="text-white">{d.inquilino.nome}</b> — aqui está tudo sobre o seu aluguel.
      </p>

      <Cartao titulo="Próxima cobrança">
        {d.proxima ? (
          <>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[22px] font-extrabold text-[#FFE9A6] tabular-nums">{fmtValor(v.totalInquilino)}</span>
              <span className="text-[12px] text-text-secondary">competência {d.proxima.competencia} · vence em <b className="text-white/85">{d.proxima.vencimento}</b></span>
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
                  <span className="text-[11.5px] text-text-secondary ml-auto tabular-nums">
                    {h.status === 'aberta' || h.status === 'prevista' ? `vence ${h.vencimento}` : `pago em ${h.pagoEm}`}
                  </span>
                </div>
              );
            })}
          </div>
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
      </Cartao>

      <Cartao titulo="Pedir manutenção">
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
    </div>
  );
}
