'use client';

/**
 * AUDITORIA · O RETRATO — todo número da rodada, num lugar só.
 *
 * Antes os números estavam espalhados por seis pontos do documento: estes
 * gráficos no topo, o quadro de 24 linhas lá embaixo, as metas dentro de "O
 * combinado", a temperatura numa seção própria, os destaques dentro de "O
 * que você faz bem" e mais três blocos soltos de percentuais. O gestor
 * rolava a tela para trás toda vez que queria comparar dois deles.
 *
 * Agora é uma seção só, em três camadas de leitura: os quatro números que
 * abrem a conversa, as metas do período, e os gráficos que explicam de onde
 * eles vieram. O quadro completo continua existindo — mas como prova, não
 * como abertura.
 *
 * Regras que valem para todos:
 *   - cor nunca carrega sentido sozinha. Todo segmento vem com número e
 *     rótulo ao lado, porque isto vai para PDF impresso e para quem não
 *     distingue as cores.
 *   - percentual sempre com o de-quantos: "35% (24 de 68)".
 *   - nada decorativo. O que cabe numa frase fica em frase.
 */
import React from 'react';
import { asObj, asArr, asNum, asStr, fmtNum, fmtDinheiro, type Indicador } from '@/lib/auditoriaAnalise';
import type { Relatorio } from '@/lib/auditoriaRelatorio';

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
        <span key={f.chave} className="inline-flex items-center gap-1.5 text-[10.5px] text-text-secondary">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: f.cor }} />
          <b className="text-white tabular-nums">{f.n}</b> {f.rotulo}
          <span className="text-white/35 tabular-nums">{Math.round((f.n / total) * 100)}%</span>
        </span>
      ))}
    </div>
  );
}

/** Um número grande com a frase que diz o que ele quer dizer. */
function Numerao({ valor, rot, leitura, tom }: {
  valor: string; rot: string; leitura?: string; tom?: 'bom' | 'ruim' | 'neutro';
}) {
  const cor = tom === 'bom' ? 'text-emerald-300' : tom === 'ruim' ? 'text-rose-300' : 'text-white';
  const borda = tom === 'bom' ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
    : tom === 'ruim' ? 'border-rose-500/25 bg-rose-500/[0.04]'
      : 'border-white/[0.07] bg-white/[0.02]';
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${borda}`}>
      <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-text-secondary leading-tight">{rot}</p>
      <p className={`text-[24px] font-extrabold tabular-nums leading-none mt-1 ${cor}`}>{valor}</p>
      {leitura && <p className="text-[10.5px] text-text-secondary leading-snug mt-1">{leitura}</p>}
    </div>
  );
}

export default function GraficosRodada({ rel, indicadores, porGrupo }: {
  rel: Relatorio;
  indicadores: Indicador[];
  porGrupo: [string, Indicador[]][];
}) {
  const temperatura = asObj(rel.legado.temperatura);
  const metas = asArr(rel.legado.combinado.metas);
  const dinheiroParado = asNum(rel.legado.combinado.dinheiro_parado);

  const fatiasDe = (linhas: Indicador[]): Fatia[] =>
    (['verde', 'amarelo', 'vermelho', 'nd'] as const).map((k) => ({
      chave: k,
      n: linhas.filter((i) => i.status === k).length,
      cor: COR[k],
      rotulo: ROTULO_STATUS[k],
    }));

  const geral = fatiasDe(indicadores);
  const foraDaRegua = geral[2].n;

  const v = rel.veredito;
  const vTotal = v.ok + v.processo + v.naoFez + v.naoVerificavel;
  const fatiasVeredito: Fatia[] = [
    { chave: 'ok', n: v.ok, cor: COR.verde, rotulo: 'fez e registrou' },
    { chave: 'proc', n: v.processo, cor: COR.amarelo, rotulo: 'fez e não registrou' },
    { chave: 'nao', n: v.naoFez, cor: COR.vermelho, rotulo: 'não fez' },
    { chave: 'nv', n: v.naoVerificavel, cor: COR.nd, rotulo: 'não verificável' },
  ];

  const lidas = rel.cobertura.lidas;
  const naAmostra = rel.cobertura.naAmostra;
  const pctLido = lidas !== null && naAmostra ? Math.round((lidas / naAmostra) * 100) : null;

  const fatiasTemp: Fatia[] = [
    { chave: 'q', n: asNum(temperatura.quente) ?? 0, cor: '#d03b3b', rotulo: 'quente' },
    { chave: 'm', n: asNum(temperatura.morno) ?? 0, cor: '#fab219', rotulo: 'morno' },
    { chave: 'f', n: asNum(temperatura.frio) ?? 0, cor: '#3987e5', rotulo: 'frio' },
    { chave: 'p', n: asNum(temperatura.perdido) ?? 0, cor: COR.nd, rotulo: 'perdido' },
  ];
  const temTemp = fatiasTemp.some((f) => f.n > 0);

  if (!indicadores.length && !vTotal && !metas.length) return null;

  return (
    <section id="retrato" className="al-card relative overflow-hidden p-4 sm:p-5 scroll-mt-20">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em] mb-1">O retrato</h2>
      <p className="text-[11px] text-text-secondary mb-4">
        Todo número da rodada está nesta seção. O porquê de cada um vem logo abaixo, em texto.
      </p>

      {/* ——— camada 1: os números que abrem a conversa ——— */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
        {pctLido !== null && (
          <Numerao
            valor={`${fmtNum(lidas)} de ${fmtNum(naAmostra)}`}
            rot="conversas lidas"
            leitura={`${pctLido}% da amostra. O relatório vale para estas.`}
          />
        )}
        {vTotal > 0 && (
          /*
           * "não fez" é veredito de VERIFICAÇÃO — o CRM afirma algo que a
           * conversa desmente — e não de desempenho. Exibi-lo sozinho como
           * "trabalho não feito" produziu um "0" logo acima de um gargalo
           * que dizia que a conversa morre na mão dele: a análise tinha
           * classificado os leads como "fez e não registrou" e os padrões
           * como "não fez". Somar os dois é o número que o gestor procura.
           */
          <Numerao
            valor={fmtNum(v.processo + v.naoFez)}
            rot="clientes com algo a tratar"
            tom={v.processo + v.naoFez > 0 ? 'ruim' : 'bom'}
            leitura={`${v.ok} estavam em ordem${v.naoVerificavel ? ` · ${v.naoVerificavel} sem conversa para conferir` : ''}`}
          />
        )}
        {indicadores.length > 0 && (
          <Numerao
            valor={`${foraDaRegua} de ${indicadores.length}`}
            rot="indicadores fora da régua"
            tom={foraDaRegua > 0 ? 'ruim' : 'bom'}
            leitura="fora do que a casa combinou — não do padrão de mercado"
          />
        )}
        {dinheiroParado !== null && (
          <Numerao
            valor={fmtDinheiro(dinheiroParado)}
            rot="dinheiro da casa parado"
            tom="ruim"
            leitura="o que a casa pagou pelos leads que estão sem toque"
          />
        )}
      </div>

      {/* ——— camada 2: as metas do período ——— */}
      {metas.length > 0 && (
        <div className="mb-5">
          <p className="text-[11.5px] font-bold text-white mb-0.5">As metas do período</p>
          <p className="text-[10.5px] text-text-secondary mb-2">
            Realizado sobre a meta da casa. Cinza é o que não dá para cobrar neste período.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {metas.map((m, i) => {
              const bateu = m.bateu === true;
              // "não avaliável" é cinza, não vermelho: ou o CRM não mede, ou o
              // período é curto demais para a meta mensal fazer sentido nele
              const semMeta = asNum(m.meta) === null || m.avaliavel === false;
              const meta = asNum(m.meta);
              const feito = asNum(m.realizado);
              const pct = semMeta || !meta ? null : Math.min(100, Math.round(((feito ?? 0) / meta) * 100));
              // VGV é dinheiro: o pró-rata da meta mensal cai em centavos e
              // "0 / 758.333,3" ao lado de "faltou R$ 758.333" na mesma célula
              // parece erro de conta
              const dinheiro = /vgv|valor/i.test(asStr(m.indicador));
              const fmt = (n: number | null) => (dinheiro ? fmtDinheiro(n) : fmtNum(n));
              return (
                <div key={i} className={`rounded-xl border px-3 py-2.5 ${
                  semMeta ? 'border-white/[0.07] bg-white/[0.02]'
                    : bateu ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-rose-500/30 bg-rose-500/[0.05]'}`}>
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-text-secondary leading-tight">
                    {asStr(m.indicador).replace(/_/g, ' ')}
                  </p>
                  <p className="mt-1">
                    <span className={`text-[20px] font-extrabold tabular-nums ${semMeta ? 'text-white/60' : bateu ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {fmt(feito)}
                    </span>
                    {!semMeta && <span className="text-[12px] text-text-secondary tabular-nums"> / {fmt(meta)}</span>}
                  </p>
                  {pct !== null && (
                    <div className="h-1.5 rounded bg-white/[0.07] overflow-hidden mt-1.5">
                      <div className="h-full rounded" style={{ width: `${pct}%`, background: bateu ? COR.verde : COR.vermelho }} />
                    </div>
                  )}
                  <p className="text-[10.5px] text-text-secondary leading-snug mt-1">
                    {asStr(m.faltou)
                      || (asNum(m.meta) === null ? 'a casa não cobra isto'
                        : m.avaliavel === false ? `meta de ${fmtNum(asNum(m.meta_mensal))} no mês — não dá pra cobrar neste período`
                          : bateu ? 'meta batida' : '')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ——— camada 3: de onde os números vieram ——— */}
      <div className="grid lg:grid-cols-2 gap-x-8 gap-y-5 pt-4 border-t border-white/[0.07]">

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
                {v.processo > v.naoFez
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
                {rel.cobertura.naoLocalizadas ? ` · ${fmtNum(rel.cobertura.naoLocalizadas)} não localizadas` : ''}
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
