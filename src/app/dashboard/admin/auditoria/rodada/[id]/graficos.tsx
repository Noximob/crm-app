'use client';

/**
 * AUDITORIA · O RETRATO — a leitura de um segundo, antes do texto.
 *
 * O relatório é longo de propósito: ele é a prova. Mas a reunião começa com
 * o gestor e o corretor olhando a mesma tela, e nesse primeiro minuto
 * ninguém lê 22 seções. Estes gráficos respondem as três perguntas que
 * abrem qualquer 1:1 — como ele está, qual a natureza do problema, e quanto
 * do que se afirma aqui foi de fato verificado.
 *
 * Regras que valem para todos:
 *   - cor nunca carrega sentido sozinha. Todo segmento vem com número e
 *     rótulo ao lado, porque isto vai para PDF impresso e para quem não
 *     distingue as cores.
 *   - nada decorativo. O que cabe numa frase fica em frase.
 *   - percentual sempre com o de-quantos: "35% (24 de 68)".
 */
import React from 'react';
import { asObj, asNum, fmtNum, type Indicador } from '@/lib/auditoriaAnalise';

/** Status é reservado e valida ≥3:1 sobre a superfície escura do app. */
const COR = {
  verde: '#0ca30c',
  amarelo: '#fab219',
  vermelho: '#d03b3b',
  nd: '#6b7075',
} as const;

const ROTULO_STATUS: Record<string, string> = {
  verde: 'dentro', amarelo: 'atenção', vermelho: 'fora da régua', nd: 'não medido',
};

interface Fatia { chave: string; n: number; cor: string; rotulo: string }

/**
 * Barra empilhada horizontal. O vão de 2px entre segmentos é o que impede
 * duas cores vizinhas de virarem uma mancha só.
 */
function Barra({ fatias, altura = 10 }: { fatias: Fatia[]; altura?: number }) {
  const total = fatias.reduce((s, f) => s + f.n, 0);
  if (!total) return <div className="rounded bg-white/[0.06]" style={{ height: altura }} />;
  return (
    <div className="flex gap-[2px] w-full" style={{ height: altura }}>
      {fatias.filter((f) => f.n > 0).map((f) => (
        <div
          key={f.chave}
          title={`${f.rotulo}: ${f.n} de ${total} (${Math.round((f.n / total) * 100)}%)`}
          style={{ width: `${(f.n / total) * 100}%`, background: f.cor }}
          className="first:rounded-l last:rounded-r"
        />
      ))}
    </div>
  );
}

function Legenda({ fatias }: { fatias: Fatia[] }) {
  const total = fatias.reduce((s, f) => s + f.n, 0) || 1;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {fatias.filter((f) => f.n > 0).map((f) => (
        <span key={f.chave} className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: f.cor }} />
          <b className="text-white tabular-nums">{f.n}</b>
          <span>{f.rotulo}</span>
          <span className="text-white/35 tabular-nums">{Math.round((f.n / total) * 100)}%</span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function GraficosRodada({ a, indicadores, porGrupo }: {
  a: Record<string, unknown>;
  indicadores: Indicador[];
  porGrupo: [string, Indicador[]][];
}) {
  const veredito = asObj(a.veredito);
  const cobertura = asObj(a.cobertura);
  const temperatura = asObj(a.temperatura_da_carteira);

  const fatiasDe = (linhas: Indicador[]): Fatia[] =>
    (['verde', 'amarelo', 'vermelho', 'nd'] as const).map((k) => ({
      chave: k,
      n: linhas.filter((i) => i.status === k).length,
      cor: COR[k],
      rotulo: ROTULO_STATUS[k],
    }));

  const geral = fatiasDe(indicadores);

  const vTotal = (['fez_e_registrou', 'fez_e_nao_registrou', 'nao_fez', 'nao_verificavel'] as const)
    .reduce((s, k) => s + (asNum(veredito[k]) ?? 0), 0);
  const fatiasVeredito: Fatia[] = [
    { chave: 'ok', n: asNum(veredito.fez_e_registrou) ?? 0, cor: COR.verde, rotulo: 'fez e registrou' },
    { chave: 'proc', n: asNum(veredito.fez_e_nao_registrou) ?? 0, cor: COR.amarelo, rotulo: 'fez e não registrou' },
    { chave: 'nao', n: asNum(veredito.nao_fez) ?? 0, cor: COR.vermelho, rotulo: 'não fez' },
    { chave: 'nv', n: asNum(veredito.nao_verificavel) ?? 0, cor: COR.nd, rotulo: 'não verificável' },
  ];

  const lidas = asNum(cobertura.conversas_lidas);
  const naAmostra = asNum(cobertura.leads_na_amostra);
  const pctLido = lidas !== null && naAmostra ? Math.round((lidas / naAmostra) * 100) : null;

  const fatiasTemp: Fatia[] = [
    { chave: 'q', n: asNum(temperatura.quente) ?? 0, cor: '#d03b3b', rotulo: 'quente' },
    { chave: 'm', n: asNum(temperatura.morno) ?? 0, cor: '#fab219', rotulo: 'morno' },
    { chave: 'f', n: asNum(temperatura.frio) ?? 0, cor: '#3987e5', rotulo: 'frio' },
    { chave: 'p', n: asNum(temperatura.perdido) ?? 0, cor: COR.nd, rotulo: 'perdido' },
  ];
  const temTemp = fatiasTemp.some((f) => f.n > 0);

  if (!indicadores.length && !vTotal) return null;

  return (
    <section className="al-card relative overflow-hidden p-4 sm:p-5">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em] mb-1">O retrato</h2>
      <p className="text-[11px] text-text-secondary mb-4">
        Os números primeiro. O porquê de cada um está nas seções abaixo.
      </p>

      <div className="grid lg:grid-cols-2 gap-x-8 gap-y-5">

        {/* como ele está, por frente de trabalho */}
        {indicadores.length > 0 && (
          <div>
            <p className="text-[11.5px] font-bold text-white mb-0.5">Como ele está, por frente</p>
            <p className="text-[10.5px] text-text-secondary mb-3">
              Cada barra são os indicadores daquele bloco. Vermelho é fora da régua que a casa combinou.
            </p>
            <div className="space-y-2.5">
              {porGrupo.map(([grupo, linhas]) => {
                const f = fatiasDe(linhas);
                const ruins = f[2].n;
                return (
                  <div key={grupo}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-[11px] text-white/85">{grupo}</span>
                      <span className="text-[10.5px] tabular-nums">
                        <span className={ruins ? 'font-bold text-[#d03b3b]' : 'text-text-secondary'}>
                          {ruins ? `${ruins} fora da régua` : 'nada fora da régua'}
                        </span>
                        <span className="text-text-secondary"> · {linhas.length} indicadores</span>
                      </span>
                    </div>
                    <Barra fatias={f} />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.07]">
              <Legenda fatias={geral} />
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* a natureza do problema */}
          {vTotal > 0 && (
            <div>
              <p className="text-[11.5px] font-bold text-white mb-0.5">A natureza do problema</p>
              <p className="text-[10.5px] text-text-secondary mb-2">
                {fatiasVeredito[1].n > fatiasVeredito[2].n
                  ? 'Mais “fez e não registrou” que “não fez”: a conversa é sobre disciplina de registro, não sobre atendimento.'
                  : 'Mais “não fez” que “fez e não registrou”: a conversa é sobre o trabalho que não aconteceu.'}
              </p>
              <Barra fatias={fatiasVeredito} altura={14} />
              <div className="mt-2"><Legenda fatias={fatiasVeredito} /></div>
            </div>
          )}

          {/* quanto disto foi verificado */}
          {pctLido !== null && (
            <div>
              <p className="text-[11.5px] font-bold text-white mb-0.5">Quanto foi verificado no WhatsApp</p>
              <p className="text-[10.5px] text-text-secondary mb-2">
                O resto do relatório vale para o que foi lido. O que não abriu não vira acusação, vira “não verificável”.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 rounded bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${pctLido}%`, background: '#3987e5' }} />
                </div>
                <span className="text-[13px] font-extrabold text-white tabular-nums shrink-0">{pctLido}%</span>
              </div>
              <p className="text-[10.5px] text-text-secondary mt-1 tabular-nums">
                {fmtNum(lidas)} de {fmtNum(naAmostra)} conversas
                {asNum(cobertura.sem_conversa_localizada)
                  ? ` · ${fmtNum(asNum(cobertura.sem_conversa_localizada))} não localizadas`
                  : ''}
              </p>
            </div>
          )}

          {/* a carteira por temperatura */}
          {temTemp && (
            <div>
              <p className="text-[11.5px] font-bold text-white mb-0.5">A carteira por temperatura</p>
              <p className="text-[10.5px] text-text-secondary mb-2">Quem está perto de comprar, e quem só ocupa espaço.</p>
              <Barra fatias={fatiasTemp} altura={14} />
              <div className="mt-2"><Legenda fatias={fatiasTemp} /></div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
