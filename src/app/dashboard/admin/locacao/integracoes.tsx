'use client';

/**
 * LOCAÇÃO · ABA INTEGRAÇÕES — o quadro de tomadas da esteira.
 *
 * Cada cartão é uma integração externa: o que ela liga, o que JÁ está pronto
 * do nosso lado e o que falta pra ligar de verdade. É a lista de compras do
 * gestor virada em tela — quando uma conta for criada e a chave chegar, o
 * cartão vira verde e os botões ⚡ de simulação daquela peça somem.
 *
 * Regra de segurança gravada aqui: chave de API NUNCA entra por esta tela.
 * Segredo mora em variável de ambiente do servidor (Netlify), configurada
 * fora do app — esta tela só mostra o status.
 */
import React from 'react';
import { INTEGRACOES } from '@/lib/locacao';

export default function AbaIntegracoes() {
  return (
    <div className="space-y-3">
      <div className="al-card p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-300 mb-1">Modo pré-integração</p>
        <p className="text-[12.5px] text-text-secondary leading-relaxed max-w-[72ch]">
          Nenhuma conta externa foi contratada ainda, então <b className="text-white/85">toda a esteira roda em
          simulação</b>: os botões âmbar (⚡) movem os estados de mentira pra você testar o fluxo de ponta a
          ponta. Quando cada conta existir, a integração real assume aquele pedaço e o botão de simulação
          some — a tela é a mesma, troca a mão que aperta. As chaves de API vão em variável de ambiente do
          servidor, nunca nesta tela.
        </p>
      </div>

      {INTEGRACOES.map((it) => (
        <div key={it.chave} className="al-card p-4">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-[14px] font-bold text-white">{it.nome}</span>
            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider border bg-white/[0.05] border-white/15 text-text-secondary">
              etapas {it.etapas}
            </span>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider border bg-amber-500/10 border-amber-500/40 text-amber-300">
              ○ não conectada
            </span>
          </div>
          <p className="text-[12px] text-text-secondary mt-1 max-w-[70ch]">{it.papel}</p>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-emerald-300 mb-1.5">✓ Pronto do nosso lado</p>
              <ul className="space-y-1">
                {it.prontoDoNossoLado.map((x, i) => <li key={i} className="text-[11.5px] text-white/80 leading-relaxed">• {x}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">Falta pra ligar</p>
              <ul className="space-y-1">
                {it.faltaParaLigar.map((x, i) => <li key={i} className="text-[11.5px] text-white/80 leading-relaxed">• {x}</li>)}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
