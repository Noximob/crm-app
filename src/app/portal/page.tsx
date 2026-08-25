'use client';

/**
 * PORTAL DO CLIENTE DA LOCAÇÃO — alumma.com.br/portal
 *
 * Duas pessoas entram aqui, com interesses opostos sobre o MESMO contrato: o
 * dono quer saber se o aluguel foi pago e quanto cai pra ele; o inquilino
 * quer a 2ª via, o histórico e um canal de manutenção.
 *
 * As visões vivem em src/lib/locacaoPortalView (compartilhadas com a
 * pré-visualização do admin, que mostra o portal de um contrato REAL).
 * Enquanto não há login, esta página pública roda o cenário DEMO — e diz
 * isso no topo. Quando o login entrar, o seletor sai e o tipo da conta
 * decide a visão, com os dados de verdade.
 */
import React, { useState } from 'react';
import { DEMO_PORTAL } from '@/lib/locacao';
import { VisaoDono, VisaoInquilino } from '@/lib/locacaoPortalView';

type Visao = 'escolha' | 'dono' | 'inquilino';

const btnOuro = 'px-4 py-2.5 rounded-xl text-[13px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors';

export default function PortalCliente() {
  const [visao, setVisao] = useState<Visao>('escolha');

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-3">

        <div className="text-center mb-2">
          <span className="gx-tag inline-flex"><span>Nox Imóveis · Locação</span></span>
          <h1 className="al-display text-[24px] font-bold text-white uppercase tracking-[0.12em] mt-2">
            Portal do Cliente
          </h1>
        </div>

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-4 py-2.5 text-center">
          <p className="text-[11.5px] text-sky-200">
            <b>Demonstração.</b> Os dados abaixo são de exemplo — o acesso com login e senha, com os seus
            dados de verdade, vem em seguida.
          </p>
        </div>

        {visao === 'escolha' ? (
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <button onClick={() => setVisao('dono')} className="al-card p-6 text-left hover:bg-white/[0.04] transition-colors">
              <p className="text-[30px] mb-2">🏠</p>
              <p className="text-[15px] font-bold text-white">Sou proprietário</p>
              <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
                Acompanhe o seu imóvel: se o aluguel foi pago, quanto cai pra você e quando, e o seu contrato.
              </p>
            </button>
            <button onClick={() => setVisao('inquilino')} className="al-card p-6 text-left hover:bg-white/[0.04] transition-colors">
              <p className="text-[30px] mb-2">🔑</p>
              <p className="text-[15px] font-bold text-white">Sou inquilino</p>
              <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
                Segunda via do boleto, histórico de pagamentos, seu contrato e um canal direto pra manutenção.
              </p>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setVisao('dono')} className={visao === 'dono' ? btnOuro : btnGhost}>🏠 Visão do proprietário</button>
            <button onClick={() => setVisao('inquilino')} className={visao === 'inquilino' ? btnOuro : btnGhost}>🔑 Visão do inquilino</button>
          </div>
        )}

        {visao === 'dono' && <VisaoDono d={DEMO_PORTAL} />}
        {visao === 'inquilino' && <VisaoInquilino d={DEMO_PORTAL} />}

        <p className="text-[10.5px] text-text-secondary text-center pt-3">
          Nox Imóveis · setor de locação · este portal é a sua via oficial de informação
        </p>
      </div>
    </div>
  );
}
