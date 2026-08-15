'use client';

/**
 * SAÚDE DA BASE — o que já dá pra cobrar hoje e o que ainda está formando.
 *
 * Existe porque a base é nova (o time começou em 15/07) e várias métricas
 * nasceram depois. Sem esta tela, o gestor ou cobra em cima de número que
 * ainda não significa nada, ou trava esperando "3 meses de histórico".
 * Aqui cada métrica diz em que pé está e o que fazer com ela AGORA.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { mapEtapaCircuito } from '@/lib/circuito';
import { dadosConfiaveisDesdeMs, DADOS_CONFIAVEIS_DESDE } from '@/lib/auditoria';
import { msOf } from '@/lib/auditoriaPacote';
import {
  avaliarMetricas, COR_MATURIDADE, SIMBOLO_MATURIDADE, ROTULO_TIPO,
  type AvaliacaoMetrica, type TipoMetrica,
} from '@/lib/maturidade';

const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors';
const DIA = 24 * 60 * 60 * 1000;

export default function SaudeDaBasePage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;
  const [amostras, setAmostras] = useState<Record<string, number>>({});
  const [desdeReal, setDesdeReal] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!imobiliariaId || isEspelhoDemo) {
      // no Espelho mostra a régua com a base de exemplo (1 mês de uso)
      setAmostras({ tempo_1o_contato: 24, aceite_rodizio: 11, toques_por_lead: 30, tarefas_no_prazo: 18, passagem_etapas: 12, no_show: 6, conversao_venda: 2, ciclo_venda: 1, delta_periodo: 8, serie_semanal: 4 });
      setDesdeReal(dadosConfiaveisDesdeMs());
      setCarregando(false);
      return;
    }
    (async () => {
      try {
        const s = await getDocs(query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId)));
        const leads = s.docs.map((d) => d.data() as Record<string, unknown>);
        let t1 = 0, transicoes = 0, agendamentos = 0, vendasFechadas = 0, maisAntigo = 0;
        for (const l of leads) {
          const c = (l.circuito || {}) as { primeiroContatoEm?: unknown };
          if (msOf(c.primeiroContatoEm) > 0) t1++;
          const hist = (l.etapasHist || []) as { para?: string; em?: unknown }[];
          transicoes += hist.length;
          for (const h of hist) {
            const ms = msOf(h.em);
            if (ms > 0 && (maisAntigo === 0 || ms < maisAntigo)) maisAntigo = ms;
            const p = h.para ? mapEtapaCircuito(h.para) : '';
            if (p === 'Meet Agendado' || p === 'Visita Agendada') agendamentos++;
          }
          if (mapEtapaCircuito(l.etapa as string) === 'Fechamento') vendasFechadas++;
        }
        const semanas = Math.floor((Date.now() - dadosConfiaveisDesdeMs()) / (7 * DIA));
        setAmostras({
          tempo_1o_contato: t1, aceite_rodizio: t1, toques_por_lead: leads.length,
          tarefas_no_prazo: leads.length, passagem_etapas: transicoes, no_show: agendamentos,
          conversao_venda: vendasFechadas, ciclo_venda: vendasFechadas,
          delta_periodo: semanas * 4, serie_semanal: semanas,
        });
        setDesdeReal(maisAntigo || dadosConfiaveisDesdeMs());
      } catch (e) {
        console.error('saúde da base:', e);
      } finally { setCarregando(false); }
    })();
  }, [imobiliariaId, isEspelhoDemo]);

  const aval = useMemo(
    () => avaliarMetricas({ desdeMs: dadosConfiaveisDesdeMs(), amostras }),
    [amostras]
  );
  const porTipo = useMemo(() => {
    const m = new Map<TipoMetrica, AvaliacaoMetrica[]>();
    for (const a of aval) { const arr = m.get(a.tipo) || []; arr.push(a); m.set(a.tipo, arr); }
    return m;
  }, [aval]);

  const dias = aval[0]?.diasDisponiveis ?? 0;
  const prontas = aval.filter((a) => a.maturidade === 'pronta').length;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="gx-tag"><span>Área do administrador</span></span>
          <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2">O que dá pra cobrar hoje</h1>
          <p className="text-[12px] text-text-secondary mt-0.5 max-w-2xl">
            A base tem <b className="text-white">{dias} dias</b> de uso (desde {DADOS_CONFIAVEIS_DESDE.split('-').reverse().join('/')}).
            <b className="text-emerald-300"> {prontas} métricas</b> já valem pra cobrança; as outras estão formando.
          </p>
        </div>
        <Link href="/dashboard/admin/auditoria/" className={btnGhost}>← Auditoria</Link>
      </div>

      <div className="al-card p-4 border-l-2 border-l-[#E8C547]">
        <p className="text-[12px] text-white/90 leading-relaxed">
          <b className="text-[#E8C547]">A regra:</b> métrica de <b>foto</b> (quantos parados, quantas tarefas vencidas) vale desde o
          primeiro dia — ela mede o agora, não o passado. Métrica de <b>conversão</b> precisa de gente atravessando o funil, e isso leva
          meses num negócio de imóvel. Enquanto o tempo não passa, a régua justa é <b>comparar o corretor com a mediana do time</b>:
          todo mundo começou junto, então a comparação entre pares já é honesta hoje.
        </p>
      </div>

      {carregando && <div className="al-card p-8 text-center text-text-secondary">Lendo a base…</div>}

      {!carregando && (['estado', 'ritmo', 'conversao', 'tendencia'] as TipoMetrica[]).map((tipo) => (
        <section key={tipo} className="al-card relative overflow-hidden p-4 sm:p-5">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em]">{ROTULO_TIPO[tipo].split('—')[0].trim()}</h2>
          <p className="text-[11px] text-text-secondary mb-3">{ROTULO_TIPO[tipo].split('—')[1]?.trim()}</p>
          <div className="space-y-2">
            {(porTipo.get(tipo) || []).map((m) => (
              <div key={m.chave} className="flex items-start gap-2.5">
                <span className={`text-[13px] leading-tight ${COR_MATURIDADE[m.maturidade]}`} title={m.maturidade}>{SIMBOLO_MATURIDADE[m.maturidade]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-white">
                    {m.rotulo}
                    {m.maturidade !== 'pronta' && (
                      <span className={`ml-2 text-[10px] font-extrabold uppercase tracking-wider ${COR_MATURIDADE[m.maturidade]}`}>
                        {m.maturidade === 'formando' ? 'em formação' : 'aguardando base'}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-text-secondary leading-snug">{m.veredito}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="al-card relative overflow-hidden p-4 sm:p-5">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em] mb-2">Enquanto a base cresce</h2>
        <ol className="text-[12px] text-white/85 space-y-1.5 list-decimal pl-4 leading-snug">
          <li><b>Cobre dívida, não desempenho.</b> Lead sem 1º contato, parado, tarefa vencida e lead sem próximo passo — os quatro valem hoje e são os que mais devolvem resultado rápido.</li>
          <li><b>Compare com o time, não com o passado.</b> A mediana da equipe hoje é uma régua honesta; o &quot;melhorou vs mês passado&quot; ainda não existe.</li>
          <li><b>Some o time antes de julgar o indivíduo.</b> Conversão de etapa por corretor é loteria com pouco volume; o funil do time inteiro amadurece muito antes.</li>
          <li><b>Use caso a caso onde falta volume.</b> Com 3 meets marcados não existe &quot;taxa de comparecimento&quot; — existe o nome dos 3 clientes e o que aconteceu com cada um.</li>
          <li><b>Não apague o passado ruim.</b> Em ~45 dias as métricas de conversão entram; em ~8 semanas a tendência aparece. O que importa é registrar direito a partir de agora.</li>
        </ol>
      </section>
    </div>
  );
}
