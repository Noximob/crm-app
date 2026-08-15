'use client';

/**
 * AUDITORIA · HISTÓRICO — as rodadas de cada corretor e a importação do
 * resultado da análise.
 *
 * É esta tela que dá continuidade ao ciclo: a rodada guarda o gargalo
 * apontado e a instrução dada, e a rodada SEGUINTE mostra se aquilo foi
 * cumprido. Sem isso, cada auditoria seria um evento solto e a conversa
 * recomeçaria do zero toda vez.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/ui/toast';

const btnOuro = 'px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40';
const inputCls = 'w-full px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40 transition';

interface Rodada {
  id: string;
  corretorUid: string; corretorNome: string;
  geradoEmYmd: string; periodoInicio: string; periodoFim: string;
  versaoDiretrizes?: string; tamanhoAmostra?: number;
  metricas?: Record<string, number | null>;
  gargalo?: string; instrucao?: string;
  statusInstrucao?: string;            // pendente | feito | parcial | ignorado
  statusInstrucaoAnterior?: string;
  evidencias?: { lead?: string; data?: string; trecho?: string; tipo?: string }[];
  padroes?: string[]; ressalvas?: string[];
  analisadoEmYmd?: string;
}

const STATUS_COR: Record<string, string> = {
  feito: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
  parcial: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
  ignorado: 'bg-rose-500/10 border-rose-500/40 text-rose-300',
  pendente: 'bg-white/[0.05] border-white/20 text-text-secondary',
  primeira_rodada: 'bg-sky-500/10 border-sky-500/40 text-sky-300',
};
const STATUS_TXT: Record<string, string> = {
  feito: '✓ cumpriu', parcial: '~ parcial', ignorado: '✗ ignorou',
  pendente: 'aguardando análise', primeira_rodada: '1ª rodada',
};
const fmt = (s?: string) => s ? s.split('-').reverse().join('/') : '—';

const ROTULO_METRICA: Record<string, string> = {
  mediana_1o_contato_min_util: '1º contato (min úteis)',
  mediana_primeiro_contato_min_util: '1º contato (min úteis)',
  sem_toque: 'leads sem toque',
  sem_toque_7d: 'leads sem toque',
  tarefas_atrasadas: 'tarefas atrasadas',
  tarefas_atrasadas_24h: 'tarefas atrasadas',
  meets_feitos: 'meets feitos',
  visitas_feitas: 'visitas feitas',
  vendas: 'vendas',
  vgv: 'VGV',
  fidelidade_crm_pct: 'fidelidade do CRM (%)',
  proximo_passo_definido_pct: 'próximo passo definido (%)',
  no_show_meets_pct: 'no-show meets (%)',
  no_show_visitas_pct: 'no-show visitas (%)',
  leads_sem_tarefa_futura: 'sem tarefa futura',
};

export default function HistoricoAuditoriaPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [colando, setColando] = useState(false);
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    if (!imobiliariaId || isEspelhoDemo) { setCarregando(false); return; }
    setCarregando(true);
    try {
      // sem orderBy: evita índice composto; a ordenação é feita aqui
      const s = await getDocs(query(collection(db, 'auditoriaRodadas'), where('imobiliariaId', '==', imobiliariaId)));
      setRodadas(s.docs.map((d) => ({ id: d.id, ...d.data() } as Rodada))
        .sort((a, b) => String(b.geradoEmYmd || '').localeCompare(String(a.geradoEmYmd || ''))));
    } catch (e) {
      console.error('carregar rodadas:', e);
      showToast('Não foi possível carregar o histórico.', 'error');
    } finally { setCarregando(false); }
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [imobiliariaId, isEspelhoDemo]);

  const corretores = useMemo(
    () => Array.from(new Map(rodadas.map((r) => [r.corretorUid, r.corretorNome])).entries()),
    [rodadas]
  );
  const visiveis = useMemo(() => filtro ? rodadas.filter((r) => r.corretorUid === filtro) : rodadas, [rodadas, filtro]);

  /** Casa o resultado da análise com a rodada aberta daquele corretor (ou cria uma). */
  const importar = async () => {
    if (!imobiliariaId) return;
    let j: Record<string, unknown>;
    try {
      j = JSON.parse(texto.trim());
    } catch {
      showToast('Isso não é um JSON válido — cole o conteúdo do rodada.json.', 'error');
      return;
    }
    const corretorId = String(j.corretor_id || '');
    const periodo = (j.periodo || {}) as { inicio?: string; fim?: string };
    if (!corretorId) { showToast('O arquivo não traz corretor_id.', 'error'); return; }

    setSalvando(true);
    try {
      const metricas = (j.metricas_chave || {}) as Record<string, number | null>;
      const patch = {
        gargalo: String(j.gargalo || ''),
        instrucao: String(j.instrucao || ''),
        statusInstrucaoAnterior: String(j.status_instrucao_anterior || 'primeira_rodada'),
        statusInstrucao: 'pendente',
        evidencias: Array.isArray(j.evidencias) ? j.evidencias.slice(0, 10) : [],
        padroes: Array.isArray(j.padroes_observados) ? j.padroes_observados : [],
        ressalvas: Array.isArray(j.ressalvas) ? j.ressalvas : [],
        metricasAnalise: metricas,
        analisadoEmYmd: String(j.data_rodada || new Date().toISOString().slice(0, 10)),
        analisadoPor: userData?.nome || '',
        importadoEm: serverTimestamp(),
      };

      // a rodada certa: mesmo corretor, mesmo período, ainda sem gargalo
      const alvo = rodadas.find((r) => r.corretorUid === corretorId
        && (!periodo.inicio || r.periodoInicio === periodo.inicio)
        && !r.gargalo)
        || rodadas.find((r) => r.corretorUid === corretorId && !r.gargalo);

      if (alvo) {
        await updateDoc(doc(db, 'auditoriaRodadas', alvo.id), patch);
        // a instrução ANTERIOR recebe o veredito que veio na análise
        const anterior = rodadas.filter((r) => r.corretorUid === corretorId && r.id !== alvo.id && r.instrucao)
          .sort((a, b) => String(b.geradoEmYmd).localeCompare(String(a.geradoEmYmd)))[0];
        const veredito = String(j.status_instrucao_anterior || '');
        if (anterior && ['feito', 'parcial', 'ignorado'].includes(veredito)) {
          await updateDoc(doc(db, 'auditoriaRodadas', anterior.id), { statusInstrucao: veredito });
        }
        showToast('Resultado importado na rodada.', 'success');
      } else {
        await addDoc(collection(db, 'auditoriaRodadas'), {
          imobiliariaId, corretorUid: corretorId,
          corretorNome: corretores.find(([id]) => id === corretorId)?.[1] || corretorId.slice(0, 6),
          geradoEmYmd: patch.analisadoEmYmd,
          periodoInicio: periodo.inicio || '', periodoFim: periodo.fim || '',
          versaoDiretrizes: String(j.versao_diretrizes || ''),
          geradoEm: serverTimestamp(), ...patch,
        });
        showToast('Rodada criada com o resultado importado.', 'success');
      }
      setTexto(''); setColando(false);
      await carregar();
    } catch (e) {
      console.error('importar rodada:', e);
      showToast('Não foi possível importar.', 'error');
    } finally { setSalvando(false); }
  };

  const marcar = async (r: Rodada, status: string) => {
    if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
    try {
      await updateDoc(doc(db, 'auditoriaRodadas', r.id), { statusInstrucao: status });
      setRodadas(rodadas.map((x) => x.id === r.id ? { ...x, statusInstrucao: status } : x));
    } catch { showToast('Não foi possível atualizar.', 'error'); }
  };

  const arquivo = async (f: File | undefined) => {
    if (!f) return;
    setTexto(await f.text());
    setColando(true);
  };

  if (isEspelhoDemo) {
    return (
      <div className="max-w-3xl mx-auto mt-10 px-4">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="al-card p-10 mt-3 text-center">
          <p className="text-[40px] mb-2">🗂️</p>
          <p className="text-sm text-text-secondary">O histórico guarda as rodadas reais da imobiliária — indisponível no modo demonstração.</p>
          <Link href="/dashboard/admin/auditoria/" className={btnGhost + ' inline-block mt-4'}>← Auditoria</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-16 pt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="gx-tag"><span>Área do administrador</span></span>
          <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2">Histórico das rodadas</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">
            O gargalo de cada rodada e se a instrução foi cumprida na seguinte.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/admin/auditoria/" className={btnGhost}>← Auditoria</Link>
          <button onClick={() => setColando((v) => !v)} className={btnOuro}>⬆ Importar resultado</button>
        </div>
      </div>

      {/* importação */}
      {colando && (
        <section className="al-card relative overflow-hidden p-4 sm:p-5">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em] mb-2">Importar o resultado da análise</h2>
          <p className="text-[11px] text-text-secondary mb-2">
            Cole o conteúdo do <b className="text-white">rodada.json</b> que a análise devolveu, ou escolha o arquivo. Ele casa sozinho com a rodada aberta daquele corretor.
          </p>
          <div className="flex items-center gap-2 mb-2">
            <input type="file" accept="application/json,.json" onChange={(e) => arquivo(e.target.files?.[0])}
              className="text-[11px] text-text-secondary file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-white/[0.08] file:text-white file:text-[11px] file:font-bold" />
          </div>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='{ "corretor_id": "...", "gargalo": "...", ... }'
            className={inputCls + ' min-h-[160px] font-mono text-[11.5px] leading-relaxed'} />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={importar} disabled={!texto.trim() || salvando} className={btnOuro}>{salvando ? 'Importando…' : 'Importar'}</button>
            <button onClick={() => { setColando(false); setTexto(''); }} className={btnGhost}>cancelar</button>
          </div>
        </section>
      )}

      {/* filtro por corretor */}
      {corretores.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setFiltro('')} className={`px-2.5 py-1 rounded-lg text-[11.5px] font-bold ${!filtro ? 'bg-white/[0.12] text-white' : 'bg-white/[0.04] text-text-secondary hover:text-white'}`}>todos</button>
          {corretores.map(([id, nome]) => (
            <button key={id} onClick={() => setFiltro(id)} className={`px-2.5 py-1 rounded-lg text-[11.5px] font-bold ${filtro === id ? 'bg-white/[0.12] text-white' : 'bg-white/[0.04] text-text-secondary hover:text-white'}`}>{nome}</button>
          ))}
        </div>
      )}

      {carregando && <div className="al-card p-8 text-center text-text-secondary">Carregando…</div>}

      {!carregando && visiveis.length === 0 && (
        <div className="al-card p-10 text-center">
          <p className="text-[36px] mb-2">🗂️</p>
          <p className="text-sm text-text-secondary">Nenhuma rodada ainda. Gere um pacote na aba <b className="text-white">Gerar pacote</b> — ele aparece aqui automaticamente.</p>
          <Link href="/dashboard/admin/auditoria/gerar/" className={btnOuro + ' inline-block mt-4'}>Gerar o primeiro pacote</Link>
        </div>
      )}

      {/* linha do tempo */}
      <div className="space-y-3">
        {visiveis.map((r) => {
          const st = r.statusInstrucao || 'pendente';
          return (
            <section key={r.id} className="al-card relative overflow-hidden p-4">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                <span className="al-display text-[13px] font-bold text-white uppercase tracking-[0.08em]">{r.corretorNome}</span>
                <span className="text-[11px] text-text-secondary tabular-nums">
                  rodada de {fmt(r.geradoEmYmd)} · período {fmt(r.periodoInicio)} a {fmt(r.periodoFim)}
                  {r.tamanhoAmostra ? ` · ${r.tamanhoAmostra} leads` : ''}
                  {r.versaoDiretrizes ? ` · régua ${r.versaoDiretrizes}` : ''}
                </span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${STATUS_COR[st] || STATUS_COR.pendente}`}>
                  {STATUS_TXT[st] || st}
                </span>
              </div>

              {r.gargalo ? (
                <>
                  <p className="text-[12.5px] text-white/90"><b className="text-rose-300">Gargalo:</b> {r.gargalo}</p>
                  {r.instrucao && <p className="text-[12.5px] text-white/90 mt-1"><b className="text-[#E8C547]">Instrução:</b> {r.instrucao}</p>}
                  {(r.evidencias || []).length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {(r.evidencias || []).slice(0, 3).map((e, i) => (
                        <p key={i} className="text-[11px] text-text-secondary">
                          • <b className="text-white/80">{e.lead || 'lead'}</b>{e.data ? ` (${fmt(e.data)})` : ''}: {e.trecho || ''}
                        </p>
                      ))}
                    </div>
                  )}
                  {(r.padroes || []).length > 0 && (
                    <p className="text-[11px] text-text-secondary mt-1.5">Padrões: {(r.padroes || []).join(' · ')}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2.5 border-t border-white/[0.06]">
                    <span className="text-[10.5px] text-text-secondary">A instrução foi cumprida?</span>
                    {(['feito', 'parcial', 'ignorado'] as const).map((s) => (
                      <button key={s} onClick={() => marcar(r, s)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-colors ${st === s ? STATUS_COR[s] : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-white'}`}>
                        {STATUS_TXT[s]}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[12px] text-amber-300/90">
                  Pacote gerado, análise ainda não importada. Rode a auditoria e traga o <b>rodada.json</b> de volta aqui.
                </p>
              )}

              {/* métricas da rodada */}
              {r.metricas && Object.keys(r.metricas).length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 pt-2.5 border-t border-white/[0.06]">
                  {Object.entries(r.metricas).map(([k, v]) => (
                    <span key={k} className="text-[11px] text-text-secondary">
                      {ROTULO_METRICA[k] || k}: <b className={v === null ? 'text-white/30' : 'text-white'}>{v === null ? 'não medido' : v}</b>
                    </span>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
