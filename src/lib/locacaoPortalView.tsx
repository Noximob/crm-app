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

/**
 * O CABEÇALHO DO CLIENTE — a primeira impressão da empresa.
 *
 * Antes as duas telas abriam com uma linha de texto ("Olá, Fulano"). Agora
 * abrem como um extrato de banco: o nome grande, o papel da pessoa, o
 * imóvel e a marca da casa. É a tela que o cliente mostra pros outros.
 */
function CabecalhoCliente({ nome, papel, imovel, endereco, codigo }: {
  nome: string; papel: string; imovel: string; endereco: string; codigo: string;
}) {
  return (
    <section className="al-card relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 gx-line-gold" />
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid place-items-center h-12 w-12 rounded-full shrink-0 text-[19px] font-extrabold border border-[#E8C547]/40 bg-[#E8C547]/10 text-[#FFE9A6]">
          {(nome || '?').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">{papel}</p>
          <h1 className="al-display text-[19px] font-bold text-white uppercase tracking-[0.06em] leading-tight truncate">{nome}</h1>
        </div>
        <div className="text-right shrink-0">
          <p className="al-display text-[11px] font-bold uppercase tracking-[0.18em] text-[#FFE9A6]">
            {DADOS_IMOBILIARIA.razao.replace(' Ltda.', '')}
          </p>
          <p className="text-[10px] text-text-secondary">{DADOS_IMOBILIARIA.creci.replace(' (preencher)', '')}</p>
        </div>
      </div>
      {imovel && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <p className="text-[13px] font-bold text-white/90">
            {codigo && <span className="text-[#E8C547]/70 mr-1.5">{codigo}</span>}{imovel}
          </p>
          {endereco && <p className="text-[11.5px] text-text-secondary mt-0.5">{endereco}</p>}
        </div>
      )}
    </section>
  );
}

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

/**
 * O DOSSIÊ — o que está assinado e guardado.
 *
 * O telefonema "me manda meu contrato" é o segundo mais comum da locação
 * (o primeiro é o boleto). Aqui o cliente vê que o documento existe, desde
 * quando, e pede a via pelo WhatsApp sem depender de alguém procurar no
 * e-mail. Enquanto o arquivo em si não é servido pelo portal, o que vale é
 * a CERTEZA de que está tudo assinado.
 */
function Dossie({ docs, assunto }: { docs: { rotulo: string; quando: string; ok: boolean }[]; assunto: string }) {
  if (!docs.length) return null;
  const zap = linkWhats(DADOS_IMOBILIARIA.telefone, assunto);
  return (
    <Cartao titulo="Seus documentos">
      <div className="space-y-1.5">
        {docs.map((doc) => (
          <div key={doc.rotulo} className="flex flex-wrap items-baseline gap-x-2.5 py-1 border-b border-white/[0.05] last:border-0">
            <span className={`text-[12px] font-bold ${doc.ok ? 'text-emerald-300' : 'text-text-secondary'}`}>
              {doc.ok ? '✓' : '○'}
            </span>
            <span className={`text-[12.5px] ${doc.ok ? 'text-white/85' : 'text-text-secondary'}`}>{doc.rotulo}</span>
            <span className="text-[11px] text-text-secondary ml-auto tabular-nums">
              {doc.ok ? (doc.quando || 'guardado') : 'pendente'}
            </span>
          </div>
        ))}
      </div>
      {zap && (
        <a href={zap} target="_blank" rel="noreferrer" className={btnGhost + ' inline-block mt-3'}>
          📄 Pedir uma via por WhatsApp
        </a>
      )}
    </Cartao>
  );
}

/** Quem cuida deste contrato — o cliente quer um nome, não um protocolo. */
function QuemCuida({ corretor }: { corretor: string }) {
  if (!corretor) return null;
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <span className="grid place-items-center h-8 w-8 rounded-full shrink-0 text-[13px] font-extrabold border border-white/10 bg-white/[0.05] text-white/80">
        {corretor.charAt(0).toUpperCase()}
      </span>
      <p className="text-[12px] text-text-secondary">
        Quem cuida do seu contrato: <b className="text-white/90">{corretor}</b>
      </p>
    </div>
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
      <CabecalhoCliente nome={d.dono.nome} papel="Proprietário"
        imovel={d.imovel.titulo} endereco={d.imovel.endereco} codigo={d.imovel.codigo} />

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

      <Cartao titulo="Situação do imóvel">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
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

      {/* A CHAVE QUE RECEBE O DINHEIRO.
          Chave PIX errada é o erro mais caro da locação: o repasse sai, não
          chega, e o dono liga achando que a casa não pagou. Ele confere aqui. */}
      <Cartao titulo="Onde o seu dinheiro cai">
        {d.dono.pix ? (
          <>
            <p className="text-[11.5px] text-text-secondary mb-1.5">Todo repasse vai pra esta chave PIX:</p>
            <p className="text-[14.5px] font-bold text-white break-all tabular-nums">{d.dono.pix}</p>
            <p className="text-[11px] text-text-secondary mt-2 max-w-[58ch]">
              Confira: precisa estar no <b className="text-white/85">seu CPF/CNPJ</b>. Se mudou de banco ou
              a chave está errada, avise a gente{d.contrato.diaVencimento
                ? <> <b className="text-white/85">antes do dia {d.contrato.diaVencimento}</b></>
                : <> antes do primeiro repasse</>} — depois do PIX enviado não dá pra desfazer.
            </p>
          </>
        ) : (
          <p className="text-[12.5px] text-amber-300">
            ⚠ Ainda não temos a sua chave PIX cadastrada. Sem ela o repasse não sai — mande pra gente pelo WhatsApp.
          </p>
        )}
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

      <Dossie docs={d.documentos || []}
        assunto={`Olá! Sou ${d.dono.nome}, proprietário do imóvel ${d.imovel.codigo}. Gostaria de uma via dos documentos.`} />

      <QuemCuida corretor={d.atendimento?.corretor || ''} />

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
      <CabecalhoCliente nome={d.inquilino.nome} papel="Inquilino"
        imovel={d.imovel.titulo} endereco={d.imovel.endereco} codigo={d.imovel.codigo} />

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

      <Dossie docs={d.documentos || []}
        assunto={`Olá! Sou ${d.inquilino.nome}, inquilino(a) do imóvel ${d.imovel.codigo}. Gostaria de uma via dos documentos.`} />

      {/* QUANDO EU FOR SAIR — a dúvida que o inquilino não pergunta com
          antecedência e vira briga no fim. Escrito antes de precisar. */}
      <Cartao titulo="Quando você for sair">
        <ol className="space-y-2 text-[12.5px] text-white/85 leading-relaxed">
          {[
            ['Avise com 30 dias', 'É o aviso prévio do contrato. Se sair antes do prazo, a multa é proporcional ao que faltava — quanto mais perto do fim, menor.'],
            ['Marcamos a vistoria de saída', 'Comparamos com a vistoria de entrada. O que estava assim quando você chegou continua sendo assim.'],
            ['Acerte contas e devolva as chaves', 'Aluguel do período, contas de consumo e reparos, se houver. Chave entregue encerra o contrato.'],
          ].map(([t2, sub], i) => (
            <li key={t2} className="flex gap-2.5">
              <span className="grid place-items-center h-5 w-5 rounded-full shrink-0 mt-0.5 text-[10.5px] font-extrabold border border-[#E8C547]/30 bg-[#E8C547]/10 text-[#FFE9A6]">{i + 1}</span>
              <span><b className="text-white">{t2}.</b> <span className="text-text-secondary">{sub}</span></span>
            </li>
          ))}
        </ol>
        <p className="text-[11px] text-text-secondary mt-3 pt-2.5 border-t border-white/[0.06] max-w-[58ch]">
          Não quer sair? Se ninguém avisar nada, o contrato continua valendo nas mesmas condições —
          a gente procura você antes do fim pra combinar a renovação.
        </p>
      </Cartao>

      <QuemCuida corretor={d.atendimento?.corretor || ''} />

      <FalarComAImobiliaria assunto={`Olá! Sou ${d.inquilino.nome}, inquilino(a) do imóvel ${d.imovel.codigo}.`} />
    </div>
  );
}
