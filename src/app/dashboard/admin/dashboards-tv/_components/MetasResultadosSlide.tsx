'use client';

import React, { useEffect, useState } from 'react';
import type { MetaTrimestral, MetaMensal, CorretorContribuicao } from './useMetasResultadosData';

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function fmtDate(s: string | undefined) {
  if (!s) return '–';
  try {
    return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

// Clima: Open-Meteo (grátis, sem API key). Códigos WMO -> descrição + emoji
const WEATHER_LABELS: Record<number, { label: string; emoji: string; bg: string }> = {
  0: { label: 'Céu limpo', emoji: '☀️', bg: 'from-amber-400/20 to-orange-500/20' },
  1: { label: 'Principalmente limpo', emoji: '🌤️', bg: 'from-sky-400/20 to-amber-400/20' },
  2: { label: 'Parcialmente nublado', emoji: '⛅', bg: 'from-slate-400/20 to-sky-400/20' },
  3: { label: 'Nublado', emoji: '☁️', bg: 'from-slate-500/20 to-slate-400/20' },
  45: { label: 'Neblina', emoji: '🌫️', bg: 'from-slate-400/20 to-slate-300/20' },
  48: { label: 'Neblina', emoji: '🌫️', bg: 'from-slate-400/20 to-slate-300/20' },
  51: { label: 'Garoa', emoji: '🌧️', bg: 'from-blue-400/20 to-sky-500/20' },
  53: { label: 'Garoa', emoji: '🌧️', bg: 'from-blue-400/20 to-sky-500/20' },
  55: { label: 'Garoa forte', emoji: '🌧️', bg: 'from-blue-500/20 to-indigo-500/20' },
  61: { label: 'Chuva leve', emoji: '🌦️', bg: 'from-blue-500/20 to-indigo-500/20' },
  63: { label: 'Chuva', emoji: '🌧️', bg: 'from-indigo-500/20 to-blue-600/20' },
  65: { label: 'Chuva forte', emoji: '⛈️', bg: 'from-indigo-600/20 to-purple-600/20' },
  80: { label: 'Pancadas', emoji: '🌦️', bg: 'from-amber-500/20 to-orange-500/20' },
  95: { label: 'Trovoada', emoji: '⛈️', bg: 'from-purple-600/20 to-indigo-700/20' },
};

function getWeatherStyle(code: number) {
  return WEATHER_LABELS[code] ?? { label: '—', emoji: '🌡️', bg: 'from-slate-500/20 to-slate-400/20' };
}

interface MetasResultadosSlideProps {
  metaTrimestral: MetaTrimestral;
  metaMensal: MetaMensal | null;
  contribuicoesPorCorretor: CorretorContribuicao[];
}

export function MetasResultadosSlide({
  metaTrimestral,
  metaMensal,
  contribuicoesPorCorretor,
}: MetasResultadosSlideProps) {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number; city?: string } | null>(null);

  const faltaTrim = Math.max(0, metaTrimestral.valor - metaTrimestral.alcancado);
  const faltaMensal = metaMensal ? Math.max(0, metaMensal.valor - metaMensal.alcancado) : 0;
  const temMeta = metaTrimestral.valor > 0 || (metaMensal?.valor ?? 0) > 0;

  // Relógio ao vivo
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Clima (Open-Meteo – Gravatá - Penha, SC)
  useEffect(() => {
    let cancelled = false;
    const lat = -26.776;
    const lon = -48.647;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=America%2FSao_Paulo`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.current) return;
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          code: data.current.weather_code ?? 0,
          city: 'Gravatá - Penha, SC',
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const weatherStyle = weather ? getWeatherStyle(weather.code) : null;

  return (
    <div className="h-screen w-full flex flex-col bg-[#0c0f1a] text-white overflow-hidden relative">
      {/* Fundo mais rico: gradiente + grid sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-[#0c0f1a] to-cyan-950/20 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <header className="relative shrink-0 flex flex-wrap items-center justify-between gap-4 py-4 px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3478F6] to-cyan-500 flex items-center justify-center text-xl shadow-lg shadow-[#3478F6]/25">
            🎯
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-transparent">
              Metas & Resultados
            </h1>
            <p className="text-slate-400 text-sm">Trimestral e mensal · ao vivo</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Relógio + data */}
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="text-right">
              <div className="text-2xl md:text-3xl font-mono font-bold tabular-nums text-cyan-300">
                {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-sm text-slate-400">
                {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
          {/* Clima */}
          {weather && weatherStyle && (
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r ${weatherStyle.bg} border border-white/10 backdrop-blur-sm`}>
              <span className="text-3xl">{weatherStyle.emoji}</span>
              <div>
                <div className="text-xl font-bold text-white">{weather.temp}°C</div>
                <div className="text-xs text-slate-300">{weatherStyle.label}{weather.city ? ` · ${weather.city}` : ''}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="relative flex-1 min-h-0 p-4 md:p-6 overflow-hidden">
        {!temMeta ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <p className="text-center">Configure as metas em Admin → Metas.</p>
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
            {/* Card Meta trimestral */}
            <div className="lg:col-span-4 flex flex-col rounded-2xl border border-[#3478F6]/30 bg-gradient-to-b from-[#3478F6]/10 to-transparent backdrop-blur-sm p-5 overflow-hidden shadow-xl shadow-[#3478F6]/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📅</span>
                <h2 className="text-lg font-bold text-slate-300">Meta trimestral</h2>
              </div>
              {(metaTrimestral.inicio || metaTrimestral.fim) && (
                <p className="text-xs text-slate-500 mb-3">{fmtDate(metaTrimestral.inicio)} a {fmtDate(metaTrimestral.fim)}</p>
              )}
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-slate-400">Meta</span>
                <span className="text-xl font-black text-white">{fmt(metaTrimestral.valor)}</span>
              </div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-slate-400">Realizado</span>
                <span className={`text-xl font-bold ${metaTrimestral.percentual >= 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {fmt(metaTrimestral.alcancado)}
                </span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col justify-end">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Progresso</span>
                  <span className={`font-bold tabular-nums ${metaTrimestral.percentual >= 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    {Math.min(metaTrimestral.percentual, 100)}%
                  </span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${metaTrimestral.percentual >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#3478F6] to-cyan-400'}`}
                    style={{ width: `${Math.min(metaTrimestral.percentual, 100)}%` }}
                  />
                </div>
                {metaTrimestral.valor > 0 && faltaTrim > 0 && (
                  <div className="rounded-xl bg-amber-500/20 border border-amber-400/40 px-3 py-2.5">
                    <p className="text-xs text-amber-200/90">Faltam</p>
                    <p className="text-lg font-bold text-amber-300">{fmt(faltaTrim)}</p>
                  </div>
                )}
                {metaTrimestral.percentual >= 100 && (
                  <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-3 py-2.5">
                    <p className="text-sm font-bold text-emerald-400">🎉 Meta batida!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Card Meta mensal */}
            {metaMensal && (
              <div className="lg:col-span-4 flex flex-col rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-500/10 to-transparent backdrop-blur-sm p-5 overflow-hidden shadow-xl shadow-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📆</span>
                  <h2 className="text-lg font-bold text-slate-300">Meta mensal</h2>
                </div>
                <p className="text-xs text-slate-500 mb-3">{fmtDate(metaMensal.inicio)} a {fmtDate(metaMensal.fim)}</p>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm text-slate-400">Meta</span>
                  <span className="text-xl font-black text-white">{fmt(metaMensal.valor)}</span>
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm text-slate-400">Realizado</span>
                  <span className={`text-xl font-bold ${metaMensal.percentual >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {fmt(metaMensal.alcancado)}
                  </span>
                </div>
                <div className="flex-1 min-h-0 flex flex-col justify-end">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Progresso</span>
                    <span className={`font-bold tabular-nums ${metaMensal.percentual >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {Math.min(metaMensal.percentual, 100)}%
                    </span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${metaMensal.percentual >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`}
                      style={{ width: `${Math.min(metaMensal.percentual, 100)}%` }}
                    />
                  </div>
                  {faltaMensal > 0 && (
                    <div className="rounded-xl bg-amber-500/20 border border-amber-400/40 px-3 py-2.5">
                      <p className="text-xs text-amber-200/90">Faltam</p>
                      <p className="text-lg font-bold text-amber-300">{fmt(faltaMensal)}</p>
                    </div>
                  )}
                  {metaMensal.percentual >= 100 && (
                    <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-3 py-2.5">
                      <p className="text-sm font-bold text-emerald-400">🎉 Meta batida!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quem vendeu — ranking com destaque top 3 */}
            <div className={`flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5 overflow-hidden ${metaMensal ? 'lg:col-span-4' : 'lg:col-span-8'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🏆</span>
                <h2 className="text-lg font-bold text-slate-300">Quem vendeu</h2>
              </div>
              <div className="flex-1 min-h-0 overflow-auto space-y-2">
                {contribuicoesPorCorretor.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma contribuição lançada ainda.</p>
                ) : (
                  contribuicoesPorCorretor.slice(0, 12).map((c, i) => {
                    const pos = i + 1;
                    const isTop3 = pos <= 3;
                    const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;
                    return (
                      <div
                        key={c.corretorId || i}
                        className={`flex items-center justify-between py-2.5 px-3 rounded-xl border transition-colors ${
                          isTop3
                            ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-400/20'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-500 font-mono text-sm w-6 shrink-0">{medal ?? `${pos}º`}</span>
                          <span className="font-medium text-white truncate">{c.corretorNome}</span>
                        </div>
                        <span className={`font-bold tabular-nums shrink-0 ${isTop3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {fmt(c.total)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
