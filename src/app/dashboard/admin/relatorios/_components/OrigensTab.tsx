'use client';

/** Aba ORIGENS & CAMPANHAS — de onde vêm os leads e o que os anúncios entregam. */

import React from 'react';
import type { ReportComputed } from './computeReport';
import { fmtInt, fmtPct, fmtSeg, funilCor } from './reportShared';
import { BarraH, EmptyMsg, SectionCard, chipBase } from './ui';

const CORES_ORIGEM = ['#FF1E56', '#E8C547', '#34D399', '#9F6BFF', '#7DD3FC', '#FF7A45', '#FFE9A6'];

export default function OrigensTab({ report }: { report: ReportComputed }) {
  const { origens, origensTotal, campanhasCrm, adsResumo, campanhasAds, conversaoOrigem } = report;
  const maxOrigem = Math.max(1, ...origens.map((o) => o.count));
  const maxCampCrm = Math.max(1, ...campanhasCrm.map((c) => c.count));
  const maxCampAds = Math.max(1, ...campanhasAds.map((c) => c.total));
  const pctAceite = adsResumo.total > 0 ? (adsResumo.aceitos / adsResumo.total) * 100 : null;

  return (
    <div className="space-y-4">
      {/* Leads por origem no período */}
      <SectionCard
        title="Leads por origem"
        right={<span className="text-[10px] text-text-secondary tabular-nums">{fmtInt(origensTotal)} leads novos no período</span>}
      >
        {origens.length === 0 ? (
          <EmptyMsg>Nenhum lead criado no período.</EmptyMsg>
        ) : (
          <div className="space-y-2">
            {origens.map((o, i) => {
              const cor = CORES_ORIGEM[i % CORES_ORIGEM.length];
              return (
                <div key={o.origem} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[160px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor, boxShadow: `0 0 6px ${cor}88` }} />
                    <span className="text-[12px] font-semibold text-white truncate">{o.origem}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <BarraH pct={(o.count / maxOrigem) * 100} cor={cor} />
                  </div>
                  <div className="flex items-center gap-2 justify-end row-start-1 col-start-2 sm:row-auto sm:col-auto">
                    <span className="al-display text-[14px] font-bold text-white tabular-nums">{fmtInt(o.count)}</span>
                    <span className="text-[10px] text-text-secondary tabular-nums w-9 text-right">{fmtPct(o.pct)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {campanhasCrm.length > 0 && (
          <div className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Propaganda, quebrada por campanha</h3>
            <div className="space-y-1.5">
              {campanhasCrm.map((c, i) => (
                <div key={c.nome} className="flex items-center gap-3">
                  <span className="text-[11.5px] text-white truncate w-40 sm:w-56 shrink-0">{c.nome}</span>
                  <div className="flex-1"><BarraH pct={(c.count / maxCampCrm) * 100} cor={funilCor(i)} /></div>
                  <span className="al-display text-[12.5px] font-bold text-white tabular-nums w-8 text-right">{fmtInt(c.count)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Performance dos anúncios (distribuição) */}
      <SectionCard
        title="Anúncios em números"
        right={<span className="text-[10px] text-text-secondary">leads que entraram pela distribuição de anúncios</span>}
      >
        {adsResumo.total === 0 ? (
          <EmptyMsg>Nenhum lead de anúncio no período.</EmptyMsg>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
                <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary block">Leads</span>
                <span className="al-display text-[22px] font-bold text-white tabular-nums">{fmtInt(adsResumo.total)}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
                <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary block">Aceitos</span>
                <span className="al-display text-[22px] font-bold text-emerald-300 tabular-nums">{fmtInt(adsResumo.aceitos)}</span>
                {pctAceite !== null && <span className="text-[10px] text-text-secondary tabular-nums ml-1.5">{fmtPct(pctAceite)}</span>}
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
                <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary block">Aceite médio</span>
                <span className="al-display text-[22px] font-bold text-[#FFE9A6] tabular-nums">{fmtSeg(adsResumo.tempoMedioSeg)}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
                <span className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-text-secondary block">Via geral</span>
                <span className="al-display text-[22px] font-bold text-[#7DD3FC] tabular-nums">{adsResumo.pctViaGeral !== null ? fmtPct(adsResumo.pctViaGeral) : '—'}</span>
                <span className="text-[9.5px] text-text-secondary block leading-tight mt-0.5">escaparam da exclusividade</span>
              </div>
            </div>

            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Ranking de campanhas</h3>
            <div className="space-y-1.5">
              {campanhasAds.map((c, i) => (
                <div key={c.nome} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 bg-white/[0.03] border border-white/[0.07]">
                  <span className="al-display text-[12px] font-bold text-[#FFE9A6] tabular-nums w-6 shrink-0">{i + 1}º</span>
                  <span className="text-[12px] font-bold text-white truncate max-w-[45%] min-w-0">{c.nome}</span>
                  <div className="hidden sm:block flex-1 min-w-[80px]"><BarraH pct={(c.total / maxCampAds) * 100} cor="#E8C547" /></div>
                  <span className="text-[11px] text-white tabular-nums"><b className="al-display">{fmtInt(c.total)}</b> lead{c.total === 1 ? '' : 's'}</span>
                  <span className={`${chipBase} bg-[#34D399]/10 border-[#34D399]/35 text-emerald-300 tabular-nums`}>{fmtInt(c.aceitos)} aceito{c.aceitos === 1 ? '' : 's'}</span>
                  <span className="text-[10.5px] text-text-secondary tabular-nums">{c.tempoMedioSeg !== null ? fmtSeg(c.tempoMedioSeg) : '—'}</span>
                  {c.pctViaGeral !== null && c.pctViaGeral > 0 && (
                    <span className={`${chipBase} bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC] tabular-nums`}>{fmtPct(c.pctViaGeral)} via geral</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* Conversão por origem — base toda */}
      <SectionCard
        title="Conversão por origem"
        right={<span className="text-[10px] text-text-secondary">base completa de leads, não só o período</span>}
      >
        {conversaoOrigem.length === 0 ? (
          <EmptyMsg>Nenhum lead na base ainda.</EmptyMsg>
        ) : (
          <div className="space-y-2.5">
            {conversaoOrigem.map((c) => (
              <div key={c.origem} className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                  <span className="text-[12px] font-bold text-white">{c.origem}</span>
                  <span className="text-[10.5px] text-text-secondary tabular-nums">{fmtInt(c.total)} leads</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[9px] font-extrabold uppercase tracking-wider text-[#7DD3FC]">Saiu do topo</span>
                    <div className="flex-1"><BarraH pct={c.pctSaiuTopo} cor="#7DD3FC" /></div>
                    <span className="w-10 text-right text-[11.5px] font-bold text-white tabular-nums">{fmtPct(c.pctSaiuTopo)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[9px] font-extrabold uppercase tracking-wider text-[#FF7A97]">Em etapa quente</span>
                    <div className="flex-1"><BarraH pct={c.pctQuente} cor="#FF1E56" /></div>
                    <span className="w-10 text-right text-[11.5px] font-bold text-white tabular-nums">{fmtPct(c.pctQuente)}</span>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-[9.5px] text-white/30">&quot;Saiu do topo&quot; = deixou a Entrada. &quot;Etapa quente&quot; = Negociação. Como conversão demora, esse quadro olha a base inteira.</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
