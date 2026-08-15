'use client';

/**
 * AUDITORIA DE ATENDIMENTO — porta de entrada.
 *
 * O CRM monta um pacote com os números de um corretor e uma amostra de leads;
 * a análise acontece FORA, cruzando isso com as conversas reais de WhatsApp.
 * Aqui ficam as três partes: a régua (diretrizes), a geração do pacote e o
 * histórico das rodadas.
 */
import React from 'react';
import Link from 'next/link';

const CARDS = [
  {
    href: '/dashboard/admin/auditoria/diretrizes/',
    icone: '📐',
    titulo: 'Diretrizes',
    desc: 'A régua: cadência de contatos, prazos, horário útil, critérios de descarte, pesos e os prompts da análise. Cada alteração vira uma versão com data.',
    pronto: true,
  },
  {
    href: '/dashboard/admin/auditoria/gerar/',
    icone: '📦',
    titulo: 'Gerar pacote',
    desc: 'Escolhe o corretor e o período, sorteia a amostra de leads, você ajusta a lista e baixa o arquivo pra levar pra análise.',
    pronto: true,
  },
  {
    href: '/dashboard/admin/auditoria/historico/',
    icone: '🗂️',
    titulo: 'Histórico das rodadas',
    desc: 'O que foi apontado em cada rodada, a instrução dada e se ela foi cumprida — a evolução do corretor ao longo do tempo.',
    pronto: true,
  },
];

export default function AuditoriaPage() {
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      <div>
        <span className="gx-tag"><span>Área do administrador</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-3">Auditoria de atendimento</h1>
        <p className="text-[12px] text-text-secondary mt-1 max-w-2xl leading-relaxed">
          Monta um pacote com os números do corretor e uma amostra dos leads dele. A análise acontece fora do sistema,
          cruzando o que está registrado aqui com as conversas reais de WhatsApp — é o cruzamento que separa
          <b className="text-white"> quem atendeu mal</b> de <b className="text-white">quem atendeu bem e registrou mal</b>.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {CARDS.map((c) => (
          c.pronto ? (
            <Link key={c.href} href={c.href}
              className="al-card relative overflow-hidden p-4 hover:bg-white/[0.04] transition-colors group">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <p className="text-[26px] mb-1">{c.icone}</p>
              <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.1em] group-hover:text-[#FFE9A6] transition-colors">{c.titulo}</h2>
              <p className="text-[11.5px] text-text-secondary mt-1 leading-snug">{c.desc}</p>
            </Link>
          ) : (
            <div key={c.href} className="al-card relative overflow-hidden p-4 opacity-50">
              <p className="text-[26px] mb-1 grayscale">{c.icone}</p>
              <h2 className="al-display text-[14px] font-bold text-white/70 uppercase tracking-[0.1em]">{c.titulo}</h2>
              <p className="text-[11.5px] text-text-secondary mt-1 leading-snug">{c.desc}</p>
              <p className="text-[10px] text-amber-300/80 mt-2 font-bold">próxima etapa da entrega</p>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
