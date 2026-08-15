'use client';

/**
 * AUDITORIA · DIRETRIZES — a régua contra a qual o atendimento é julgado.
 *
 * Tudo daqui entra no pacote gerado, e cada save cria uma versão nova com
 * data. Isso é o que permite, meses depois, saber se a régua mudou no meio
 * da comparação entre rodadas — senão corre-se o risco de rodar prompt novo
 * com régua velha e a evolução do corretor deixa de significar nada.
 *
 * Os campos que a casa ainda vai definir (critérios de descarte, pesos e os
 * prompts) nascem VAZIOS de propósito: inventar conteúdo aqui seria fabricar
 * política de avaliação.
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';
import {
  carregarDiretrizes, salvarDiretrizes, descreverHorarioUtil, horasUteisEntre,
  DIRETRIZES_PADRAO, CADENCIA_PADRAO,
  type DiretrizesAuditoria, type PassoCadencia,
} from '@/lib/auditoria';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40 transition';
const areaCls = inputCls + ' min-h-[110px] leading-relaxed font-mono text-[12px]';
const btnOuro = 'px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors';

function Secao({ titulo, sub, children, acao }: { titulo: string; sub?: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="al-card relative overflow-hidden p-4 sm:p-5">
      <div className="absolute inset-x-0 top-0 gx-line" />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.1em]">{titulo}</h2>
          {sub && <p className="text-[11px] text-text-secondary mt-0.5 max-w-2xl leading-snug">{sub}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Campo({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-text-secondary mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

export default function DiretrizesAuditoriaPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;
  const [d, setD] = useState<DiretrizesAuditoria | null>(null);
  const [original, setOriginal] = useState<string>('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    carregarDiretrizes(imobiliariaId).then((x) => {
      if (!vivo) return;
      setD(x);
      setOriginal(JSON.stringify(x));
    });
    return () => { vivo = false; };
  }, [imobiliariaId]);

  if (!d) return <LoadingState label="Carregando diretrizes..." />;

  const sujo = JSON.stringify(d) !== original;
  const set = (patch: Partial<DiretrizesAuditoria>) => setD({ ...d, ...patch });

  const salvar = async () => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    if (!imobiliariaId) return;
    setSalvando(true);
    try {
      const nova = await salvarDiretrizes(imobiliariaId, d, userData?.nome || 'admin');
      setD(nova);
      setOriginal(JSON.stringify(nova));
      showToast(`Diretrizes salvas como ${nova.versao} — os próximos pacotes já saem com esta régua.`, 'success');
    } catch (e) {
      console.error('salvarDiretrizes falhou:', e);
      showToast('Não foi possível salvar as diretrizes.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  // Exemplo ao vivo — ancorado numa TERÇA de propósito: se caísse no dia de
  // hoje, um sábado faria o exemplo dar zero e parecer defeito da conta.
  const exemplo = (() => {
    const base = new Date();
    base.setDate(base.getDate() + ((2 - base.getDay() + 7) % 7 || 7)); // próxima terça
    base.setHours(22, 0, 0, 0);
    const dep = new Date(base.getTime()); dep.setDate(dep.getDate() + 1); dep.setHours(9, 5, 0, 0);
    return {
      uteis: horasUteisEntre(base.getTime(), dep.getTime(), d.horarioUtil),
      corridas: (dep.getTime() - base.getTime()) / 3_600_000,
    };
  })();
  const fmtDur = (h: number) => h < 1 ? `${Math.round(h * 60)} min` : `${Math.round(h * 10) / 10}h`;

  const setCad = (i: number, patch: Partial<PassoCadencia>) => {
    const cad = [...d.cadencia];
    cad[i] = { ...cad[i], ...patch };
    set({ cadencia: cad });
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      <div className="flex flex-col gap-3">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Diretrizes da auditoria</h1>
            <p className="text-[12px] text-text-secondary mt-0.5 max-w-2xl">
              A régua usada pra julgar o atendimento. Entra inteira no pacote gerado — versão vigente: <b className="text-[#E8C547]">{d.versao}</b>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/admin/auditoria/" className={btnGhost}>← Auditoria</Link>
            <button onClick={salvar} disabled={!sujo || salvando} className={btnOuro}>
              {salvando ? 'Salvando…' : 'Salvar nova versão'}
            </button>
          </div>
        </div>
        {sujo && <p className="text-[11px] text-amber-300 font-bold">Alterações não salvas — ao salvar, vira uma versão nova com a data de hoje.</p>}
      </div>

      {/* ── Cadência ── */}
      <Secao titulo="Cadência de contatos" sub="O que deveria acontecer com cada lead novo, e em qual dia. O CRM não cobra isso sozinho — esta régua vai no pacote pra análise comparar com o que de fato aconteceu."
        acao={<button className={btnGhost} onClick={() => set({ cadencia: CADENCIA_PADRAO })}>restaurar padrão</button>}>
        <div className="space-y-2">
          {d.cadencia.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-14 shrink-0">
                <input type="number" min={0} value={p.dia}
                  onChange={(e) => setCad(i, { dia: Number(e.target.value) || 0 })}
                  className={inputCls + ' tabular-nums text-center px-1'} title="dia útil a partir da entrada" />
                <p className="text-[9px] text-center text-text-secondary mt-0.5">dia</p>
              </div>
              <textarea value={p.acao} onChange={(e) => setCad(i, { acao: e.target.value })}
                className={inputCls + ' min-h-[46px] leading-snug flex-1'} placeholder="o que fazer neste contato" />
              <button onClick={() => set({ cadencia: d.cadencia.filter((_, j) => j !== i) })}
                className="text-text-secondary hover:text-rose-300 mt-2 shrink-0" title="remover passo">✕</button>
            </div>
          ))}
          <button className={btnGhost}
            onClick={() => set({ cadencia: [...d.cadencia, { contato: d.cadencia.length + 1, dia: (d.cadencia[d.cadencia.length - 1]?.dia ?? 0) + 1, acao: '' }] })}>
            + passo de cadência
          </button>
        </div>
      </Secao>

      {/* ── Horário útil ── */}
      <Secao titulo="Horário útil — quando o relógio corre"
        sub="Fora dessa janela o tempo NÃO conta contra o corretor. Sem isso, um lead que entra 22h já nasce atrasado às 9h da manhã seguinte.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo label="Começa às">
            <input type="number" min={0} max={23} value={d.horarioUtil.inicioHora}
              onChange={(e) => set({ horarioUtil: { ...d.horarioUtil, inicioHora: Number(e.target.value) || 0 } })}
              className={inputCls + ' tabular-nums'} />
          </Campo>
          <Campo label="Para às">
            <input type="number" min={1} max={24} value={d.horarioUtil.fimHora}
              onChange={(e) => set({ horarioUtil: { ...d.horarioUtil, fimHora: Number(e.target.value) || 0 } })}
              className={inputCls + ' tabular-nums'} />
          </Campo>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-[12px] text-white/90 cursor-pointer select-none">
              <input type="checkbox" checked={d.horarioUtil.contarSabado}
                onChange={(e) => set({ horarioUtil: { ...d.horarioUtil, contarSabado: e.target.checked } })} className="accent-[#E8C547]" />
              conta sábado
            </label>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-[12px] text-white/90 cursor-pointer select-none">
              <input type="checkbox" checked={d.horarioUtil.contarDomingo}
                onChange={(e) => set({ horarioUtil: { ...d.horarioUtil, contarDomingo: e.target.checked } })} className="accent-[#E8C547]" />
              conta domingo
            </label>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-white/[0.03] border border-white/10 p-3">
          <p className="text-[11px] text-text-secondary">
            Régua atual: <b className="text-white">{descreverHorarioUtil(d.horarioUtil)}</b>
          </p>
          <p className="text-[11px] text-text-secondary mt-1">
            Exemplo (numa terça): lead entrou <b className="text-white">22h</b> e foi atendido <b className="text-white">9h05 da manhã seguinte</b> —
            no relógio deu {fmtDur(exemplo.corridas)}, mas na cobrança conta <b className="text-emerald-300">{fmtDur(exemplo.uteis)}</b>.
          </p>
          <p className="text-[10px] text-text-secondary mt-1">
            Um lead que entra na noite de sábado com o domingo desligado só começa a contar na segunda de manhã.
          </p>
        </div>
      </Secao>

      {/* ── Prazos ── */}
      <Secao titulo="Prazos" sub="Os limites que separam o aceitável do cobrável. Os dois primeiros contam em tempo ÚTIL; o de lead parado conta em dias corridos.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Campo label="1º contato registrado em até (min)"
            hint="Do lead entrar até o corretor registrar a primeira tentativa. Atenção: mede quando ele ANOTOU, não quando falou — o cruzamento com o WhatsApp é que separa os dois.">
            <input type="number" min={1} value={d.prazos.primeiroContatoMaximoMin}
              onChange={(e) => set({ prazos: { ...d.prazos, primeiroContatoMaximoMin: Number(e.target.value) || 0 } })}
              className={inputCls + ' tabular-nums'} />
          </Campo>
          <Campo label="Tarefa vira atrasada após (h)" hint="Horas úteis depois do vencimento.">
            <input type="number" min={1} value={d.prazos.tarefaAtrasadaHoras}
              onChange={(e) => set({ prazos: { ...d.prazos, tarefaAtrasadaHoras: Number(e.target.value) || 0 } })}
              className={inputCls + ' tabular-nums'} />
          </Campo>
          <Campo label="Lead parado após (dias)" hint="Dias corridos sem nenhum toque registrado.">
            <input type="number" min={1} value={d.prazos.leadParadoDias}
              onChange={(e) => set({ prazos: { ...d.prazos, leadParadoDias: Number(e.target.value) || 0 } })}
              className={inputCls + ' tabular-nums'} />
          </Campo>
        </div>
      </Secao>

      {/* ── Descarte válido (vazio de propósito) ── */}
      <Secao titulo="Critérios de descarte válido" sub="O que conta como descarte legítimo. Nasce vazio de propósito — é política da casa, não do sistema.">
        <div className="space-y-1.5">
          {d.criteriosDescarteValido.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={c} onChange={(e) => { const arr = [...d.criteriosDescarteValido]; arr[i] = e.target.value; set({ criteriosDescarteValido: arr }); }}
                className={inputCls + ' flex-1'} placeholder="Ex: cliente disse que já comprou com outra imobiliária" />
              <button onClick={() => set({ criteriosDescarteValido: d.criteriosDescarteValido.filter((_, j) => j !== i) })}
                className="text-text-secondary hover:text-rose-300 shrink-0">✕</button>
            </div>
          ))}
          {d.criteriosDescarteValido.length === 0 && <p className="text-[11px] text-text-secondary py-1">Nenhum critério definido ainda.</p>}
          <button className={btnGhost} onClick={() => set({ criteriosDescarteValido: [...d.criteriosDescarteValido, ''] })}>+ critério</button>
        </div>
      </Secao>

      {/* ── Pesos (vazio de propósito) ── */}
      <Secao titulo="Pesos da avaliação" sub="Quanto cada dimensão vale na nota final. Também nasce vazio — quem define o que importa é a direção.">
        <div className="space-y-1.5">
          {d.pesosAvaliacao.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={p.dimensao} onChange={(e) => { const arr = [...d.pesosAvaliacao]; arr[i] = { ...arr[i], dimensao: e.target.value }; set({ pesosAvaliacao: arr }); }}
                className={inputCls + ' flex-1'} placeholder="Ex: velocidade de atendimento" />
              <div className="w-24">
                <input type="number" min={0} max={100} value={p.peso}
                  onChange={(e) => { const arr = [...d.pesosAvaliacao]; arr[i] = { ...arr[i], peso: Number(e.target.value) || 0 }; set({ pesosAvaliacao: arr }); }}
                  className={inputCls + ' tabular-nums'} />
              </div>
              <button onClick={() => set({ pesosAvaliacao: d.pesosAvaliacao.filter((_, j) => j !== i) })}
                className="text-text-secondary hover:text-rose-300 shrink-0">✕</button>
            </div>
          ))}
          {d.pesosAvaliacao.length === 0 && <p className="text-[11px] text-text-secondary py-1">Nenhum peso definido ainda.</p>}
          <div className="flex items-center gap-3">
            <button className={btnGhost} onClick={() => set({ pesosAvaliacao: [...d.pesosAvaliacao, { dimensao: '', peso: 0 }] })}>+ dimensão</button>
            {d.pesosAvaliacao.length > 0 && (
              <span className={`text-[11px] font-bold ${d.pesosAvaliacao.reduce((s, p) => s + p.peso, 0) === 100 ? 'text-emerald-300' : 'text-amber-300'}`}>
                soma: {d.pesosAvaliacao.reduce((s, p) => s + p.peso, 0)}
              </span>
            )}
          </div>
        </div>
      </Secao>

      {/* ── Tom + prompts ── */}
      <Secao titulo="Tom e prompts da análise" sub="Os textos que guiam a IA na leitura. Ficam aqui — e não soltos — pra régua e prompt andarem na MESMA versão: prompt novo com régua velha invalida a comparação entre rodadas.">
        <div className="space-y-3">
          <Campo label="Tom do relatório">
            <textarea value={d.tomDoRelatorio} onChange={(e) => set({ tomDoRelatorio: e.target.value })} className={inputCls + ' min-h-[56px] leading-snug'} />
          </Campo>
          <Campo label="Prompt principal" hint="O que a IA deve fazer com o pacote + as conversas de WhatsApp.">
            <textarea value={d.prompts.principal} onChange={(e) => set({ prompts: { ...d.prompts, principal: e.target.value } })}
              className={areaCls} placeholder="(a preencher)" />
          </Campo>
          <Campo label="Formato do relatório" hint="Como a resposta deve vir estruturada.">
            <textarea value={d.prompts.formatoRelatorio} onChange={(e) => set({ prompts: { ...d.prompts, formatoRelatorio: e.target.value } })}
              className={areaCls} placeholder="(a preencher)" />
          </Campo>
          <Campo label="Instruções de leitura" hint="Como interpretar os dados — ex.: o que fazer quando o CRM e o WhatsApp divergem.">
            <textarea value={d.prompts.instrucoesLeitura} onChange={(e) => set({ prompts: { ...d.prompts, instrucoesLeitura: e.target.value } })}
              className={areaCls} placeholder="(a preencher)" />
          </Campo>
        </div>
      </Secao>

      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <button className={btnGhost} onClick={() => { setD({ ...DIRETRIZES_PADRAO, versao: d.versao }); }}>restaurar tudo ao padrão</button>
        <button onClick={salvar} disabled={!sujo || salvando} className={btnOuro}>
          {salvando ? 'Salvando…' : 'Salvar nova versão'}
        </button>
      </div>
      {isEspelhoDemo && <p className="text-center text-[11px] text-amber-300 font-bold">Modo demonstração — nada aqui é salvo de verdade.</p>}
    </div>
  );
}
