'use client';

/**
 * PORTAL DO CLIENTE — alumma.com.br/portal
 *
 * Duas portas, uma por funil — e cada uma nasce num momento diferente:
 *
 *   🏠 PROPRIETÁRIO   abre assim que ele ASSINA A ADMINISTRAÇÃO, antes mesmo
 *                     de alugar: mostra o imóvel em divulgação e quanto vai
 *                     cair no repasse. Depois de alugado, vira o extrato.
 *   🔑 INQUILINO      abre na ENTREGA DA CHAVE: cobrança, histórico de
 *                     pagamentos, o contrato e o pedido de manutenção.
 *
 * Não existe vitrine aqui de propósito: quem PROCURA imóvel encontra nos
 * portais (OLX, ZAP, VivaReal) e no site da imobiliária. Duplicar a vitrine
 * criaria mais um lugar pra manter, sem trazer ninguém novo.
 *
 * As duas áreas rodam o cenário de demonstração enquanto não há login —
 * quando ele entrar, a fonte troca e o resto continua igual.
 */
import React, { useState } from 'react';
import { DEMO_PORTAL } from '@/lib/locacao';
import { VisaoDono, VisaoInquilino } from '@/lib/locacaoPortalView';

type Porta = 'entrada' | 'dono' | 'inquilino';

const btnOuro = 'px-4 py-2.5 rounded-xl text-[13px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors';

export default function PortalCliente() {
  const [porta, setPorta] = useState<Porta>('entrada');

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-3">

        <div className="text-center mb-1">
          <span className="gx-tag inline-flex"><span>Nox Imóveis · Locação</span></span>
          <h1 className="al-display text-[24px] font-bold text-white uppercase tracking-[0.12em] mt-2">
            Portal do Cliente
          </h1>
        </div>

        {porta === 'entrada' ? (
          <>
            <p className="text-center text-[13px] text-text-secondary max-w-[46ch] mx-auto mb-3">
              Acompanhe o seu aluguel. Escolha por onde entrar.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={() => setPorta('dono')} className="al-card p-6 text-left hover:bg-white/[0.04] transition-colors">
                <p className="text-[30px] mb-2">🏠</p>
                <p className="text-[15px] font-bold text-white">Sou proprietário</p>
                <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
                  Veja se o aluguel foi pago, quanto cai pra você e quando, e o seu contrato.
                </p>
              </button>
              <button onClick={() => setPorta('inquilino')} className="al-card p-6 text-left hover:bg-white/[0.04] transition-colors">
                <p className="text-[30px] mb-2">🔑</p>
                <p className="text-[15px] font-bold text-white">Sou inquilino</p>
                <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
                  Segunda via do boleto, histórico de pagamentos, seu contrato e pedido de manutenção.
                </p>
              </button>
            </div>
            {/* a regra de acesso é a mesma da casa toda — o cliente lembra
                sozinha e o corretor consegue ditar por telefone */}
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] px-4 py-3 mt-3">
              <p className="text-[11.5px] font-bold text-sky-300">🔓 Como entrar, quando o login abrir</p>
              <p className="text-[11.5px] text-text-secondary mt-1 leading-relaxed">
                <b className="text-white/85">Usuário:</b> seu nome completo, como está no contrato.
                {' '}<b className="text-white/85">Senha:</b> os 4 primeiros dígitos do seu CPF.
                {' '}Se não lembrar, chame a imobiliária no WhatsApp.
              </p>
            </div>
            <p className="text-center text-[11px] text-text-secondary pt-3">
              O login entra em breve — hoje as áreas abrem em modo demonstração.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => setPorta('entrada')} className={btnGhost}>← voltar</button>
              <button onClick={() => setPorta('dono')} className={porta === 'dono' ? btnOuro : btnGhost}>🏠 proprietário</button>
              <button onClick={() => setPorta('inquilino')} className={porta === 'inquilino' ? btnOuro : btnGhost}>🔑 inquilino</button>
            </div>

            <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-4 py-2 text-center">
              <p className="text-[11.5px] text-sky-200">
                <b>Demonstração.</b> Os dados são de exemplo — com login, você verá o seu contrato de verdade.
              </p>
            </div>

            {porta === 'dono' ? <VisaoDono d={DEMO_PORTAL} /> : <VisaoInquilino d={DEMO_PORTAL} />}
          </>
        )}

        <p className="text-[10.5px] text-text-secondary text-center pt-3">
          Nox Imóveis · setor de locação
        </p>
      </div>
    </div>
  );
}
