'use client';

/**
 * PORTAL DO CLIENTE DA LOCAÇÃO — alumma.com.br/portal
 *
 * Duas pessoas entram aqui, com interesses opostos sobre o MESMO contrato:
 *
 *   O LOCADOR (dono) quer saber: o inquilino pagou? quanto cai pra mim e
 *   quando? como está meu contrato?
 *
 *   O LOCATÁRIO (inquilino) quer saber: quanto pago, até quando, como pego
 *   a 2ª via? e quer um canal pra pedir manutenção sem ligar.
 *
 * Enquanto não há login, a tela abre num seletor e roda com UM cenário de
 * demonstração coerente dos dois lados — o imóvel que o dono vê alugado é o
 * mesmo que o inquilino vê como "seu aluguel", com os mesmos valores.
 * Quando o login entrar, o seletor sai e o tipo da conta decide a visão.
 *
 * O que está de propósito:
 *   - os botões de dinheiro (2ª via, PIX) existem mas avisam que a emissão
 *     real vem com a integração Asaas — botão de dinheiro que finge funcionar
 *     é o jeito mais rápido de queimar a confiança do cliente;
 *   - nenhum dado real: tudo vem de DEMO_PORTAL, e o topo diz isso.
 */
import React, { useState } from 'react';
import { DEMO_PORTAL as D, fmtValor } from '@/lib/locacao';

type Visao = 'escolha' | 'locador' | 'locatario';

const btnOuro = 'px-4 py-2.5 rounded-xl text-[13px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors';

const totalLocatario = D.valores.aluguel + D.valores.condominio + D.valores.iptuMensal + D.valores.seguroIncendio;
const taxaAdm = Math.round(D.valores.aluguel * D.valores.taxaAdmPct) / 100;
const repasse = D.valores.aluguel - taxaAdm;

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
} as const;

export default function PortalCliente() {
  const [visao, setVisao] = useState<Visao>('escolha');
  const [pedido, setPedido] = useState('');
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-3">

        {/* cabeçalho comum */}
        <div className="text-center mb-2">
          <span className="gx-tag inline-flex"><span>Nox Imóveis · Locação</span></span>
          <h1 className="al-display text-[24px] font-bold text-white uppercase tracking-[0.12em] mt-2">
            Portal do Cliente
          </h1>
        </div>

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-4 py-2.5 text-center">
          <p className="text-[11.5px] text-sky-200">
            <b>Demonstração.</b> Os dados abaixo são de exemplo — o acesso com login e senha, com os seus dados
            de verdade, vem em seguida.
          </p>
        </div>

        {/* seletor / troca de visão */}
        {visao === 'escolha' ? (
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <button onClick={() => setVisao('locador')} className="al-card p-6 text-left hover:bg-white/[0.04] transition-colors">
              <p className="text-[30px] mb-2">🏠</p>
              <p className="text-[15px] font-bold text-white">Sou proprietário</p>
              <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
                Acompanhe o seu imóvel: se o aluguel foi pago, quanto cai pra você e quando, e o seu contrato.
              </p>
            </button>
            <button onClick={() => setVisao('locatario')} className="al-card p-6 text-left hover:bg-white/[0.04] transition-colors">
              <p className="text-[30px] mb-2">🔑</p>
              <p className="text-[15px] font-bold text-white">Sou inquilino</p>
              <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
                Segunda via do boleto, histórico de pagamentos, seu contrato e um canal direto pra manutenção.
              </p>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setVisao('locador')} className={visao === 'locador' ? btnOuro : btnGhost}>🏠 Visão do proprietário</button>
            <button onClick={() => setVisao('locatario')} className={visao === 'locatario' ? btnOuro : btnGhost}>🔑 Visão do inquilino</button>
          </div>
        )}

        {/* ═════════ LOCADOR ═════════ */}
        {visao === 'locador' && (
          <>
            <p className="text-center text-[13px] text-text-secondary pt-1">
              Olá, <b className="text-white">{D.locador.nome}</b> — aqui está o retrato do seu imóvel.
            </p>

            <Cartao titulo="Seu imóvel">
              <p className="text-[14px] font-bold text-white">{D.imovel.titulo}</p>
              <p className="text-[12px] text-text-secondary mt-0.5">{D.imovel.endereco}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px]">
                <span className="text-emerald-300 font-bold">● Alugado</span>
                <span className="text-text-secondary">inquilina: <b className="text-white/85">{D.locatario.nome}</b></span>
                <span className="text-text-secondary">contrato até <b className="text-white/85">{D.contrato.fim}</b></span>
              </div>
            </Cartao>

            <Cartao titulo="O seu repasse">
              <p className="text-[11.5px] text-text-secondary mb-2 max-w-[58ch]">
                O aluguel vence dia {D.contrato.diaVencimento}. Assim que o pagamento é confirmado, o repasse cai na
                sua conta em até 2 dias úteis.
              </p>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <LinhaValor rot="Aluguel pago pela inquilina" val={fmtValor(D.valores.aluguel)} />
                <LinhaValor rot={`Taxa de administração (${D.valores.taxaAdmPct}%)`} val={`− ${fmtValor(taxaAdm)}`} />
                <div className="border-t border-white/[0.08] mt-1 pt-1">
                  <LinhaValor rot="Cai pra você, todo mês" val={fmtValor(repasse)} destaque />
                </div>
              </div>
              <p className="text-[10.5px] text-text-secondary mt-2">
                Condomínio, IPTU e seguro incêndio são pagos pela inquilina direto na cobrança — não passam pelo seu repasse.
              </p>
            </Cartao>

            <Cartao titulo="Histórico de pagamentos">
              <div className="space-y-1.5">
                {D.historico.map((h) => {
                  const st = STATUS_PGTO[h.status];
                  return (
                    <div key={h.competencia} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1 border-b border-white/[0.05] last:border-0">
                      <span className="text-[12.5px] font-bold text-white w-[110px]">{h.competencia}</span>
                      <span className={`text-[11.5px] font-bold ${st.cor}`}>{st.txt}</span>
                      <span className="text-[11.5px] text-text-secondary ml-auto tabular-nums">repasse de {fmtValor(repasse)}</span>
                    </div>
                  );
                })}
              </div>
            </Cartao>

            <Cartao titulo="Seu contrato">
              <div className="grid grid-cols-2 gap-x-6">
                <LinhaValor rot="Início" val={D.contrato.inicio} />
                <LinhaValor rot="Fim" val={D.contrato.fim} />
                <LinhaValor rot="Prazo" val={`${D.contrato.prazoMeses} meses`} />
                <LinhaValor rot="Reajuste" val={`${D.contrato.indiceReajuste} · ${D.contrato.proximoReajuste}`} />
                <LinhaValor rot="Garantia" val={D.contrato.garantia} />
                <LinhaValor rot="Vencimento" val={`todo dia ${D.contrato.diaVencimento}`} />
              </div>
              <button className={btnGhost + ' mt-3'} onClick={() => alert('O contrato em PDF fica disponível aqui quando o acesso com login entrar.')}>
                📄 Baixar contrato (em breve)
              </button>
            </Cartao>

            <Cartao titulo="Falar com a imobiliária">
              <p className="text-[12.5px] text-text-secondary leading-relaxed">
                Qualquer dúvida sobre repasse, contrato ou o imóvel: chame a Nox no WhatsApp ou pelo telefone da
                imobiliária. Quem cuida da sua locação responde por aqui também.
              </p>
            </Cartao>
          </>
        )}

        {/* ═════════ LOCATÁRIO ═════════ */}
        {visao === 'locatario' && (
          <>
            <p className="text-center text-[13px] text-text-secondary pt-1">
              Olá, <b className="text-white">{D.locatario.nome}</b> — aqui está tudo sobre o seu aluguel.
            </p>

            <Cartao titulo="Próxima cobrança">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[22px] font-extrabold text-[#FFE9A6] tabular-nums">{fmtValor(totalLocatario)}</span>
                <span className="text-[12px] text-text-secondary">competência {D.proxima.competencia} · vence em <b className="text-white/85">{D.proxima.vencimento}</b></span>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 mt-2">
                <LinhaValor rot="Aluguel" val={fmtValor(D.valores.aluguel)} />
                <LinhaValor rot="Condomínio" val={fmtValor(D.valores.condominio)} />
                <LinhaValor rot="IPTU (parcela mensal)" val={fmtValor(D.valores.iptuMensal)} />
                <LinhaValor rot="Seguro incêndio" val={fmtValor(D.valores.seguroIncendio)} />
                <div className="border-t border-white/[0.08] mt-1 pt-1">
                  <LinhaValor rot="Total" val={fmtValor(totalLocatario)} destaque />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button className={btnOuro} onClick={() => alert('A 2ª via do boleto e o PIX copia-e-cola ficam disponíveis aqui quando a emissão automática (Asaas) entrar no ar.')}>
                  📄 2ª via do boleto
                </button>
                <button className={btnGhost} onClick={() => alert('O PIX copia-e-cola fica disponível aqui quando a emissão automática (Asaas) entrar no ar.')}>
                  ⚡ Pagar com PIX
                </button>
              </div>
            </Cartao>

            <Cartao titulo="Seus pagamentos">
              <div className="space-y-1.5">
                {D.historico.map((h) => {
                  const st = STATUS_PGTO[h.status];
                  return (
                    <div key={h.competencia} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1 border-b border-white/[0.05] last:border-0">
                      <span className="text-[12.5px] font-bold text-white w-[110px]">{h.competencia}</span>
                      <span className={`text-[11.5px] font-bold ${st.cor}`}>{st.txt}</span>
                      <span className="text-[11.5px] text-text-secondary ml-auto tabular-nums">pago em {h.pagoEm}</span>
                    </div>
                  );
                })}
              </div>
            </Cartao>

            <Cartao titulo="Seu contrato">
              <p className="text-[12.5px] text-white/90 font-bold">{D.imovel.titulo}</p>
              <p className="text-[11.5px] text-text-secondary mb-2">{D.imovel.endereco}</p>
              <div className="grid grid-cols-2 gap-x-6">
                <LinhaValor rot="Início" val={D.contrato.inicio} />
                <LinhaValor rot="Fim" val={D.contrato.fim} />
                <LinhaValor rot="Reajuste" val={`${D.contrato.indiceReajuste} · ${D.contrato.proximoReajuste}`} />
                <LinhaValor rot="Vencimento" val={`todo dia ${D.contrato.diaVencimento}`} />
                <LinhaValor rot="Garantia" val={D.contrato.garantia} />
              </div>
            </Cartao>

            <Cartao titulo="Pedir manutenção">
              <p className="text-[11.5px] text-text-secondary mb-2 max-w-[58ch]">
                Algo quebrou ou precisa de reparo? Descreva aqui — a imobiliária recebe, aciona o responsável
                (dono ou você, conforme o contrato) e te retorna com o encaminhamento.
              </p>
              {pedidoEnviado ? (
                <p className="text-[12.5px] text-emerald-300 font-bold">✓ Pedido registrado (demonstração) — na versão final a imobiliária recebe na hora.</p>
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

            <Cartao titulo="Avisos da imobiliária">
              <div className="space-y-2">
                {D.avisos.map((a, i) => (
                  <div key={i} className="text-[12.5px] text-white/85 leading-relaxed">
                    <span className="text-[10.5px] text-text-secondary font-bold tabular-nums mr-2">{a.data}</span>
                    {a.texto}
                  </div>
                ))}
              </div>
            </Cartao>
          </>
        )}

        <p className="text-[10.5px] text-text-secondary text-center pt-3">
          Nox Imóveis · setor de locação · este portal é a sua via oficial de informação
        </p>
      </div>
    </div>
  );
}
