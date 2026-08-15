'use client';

/**
 * AUDITORIA · GERAR PACOTE — escolhe o corretor, sorteia a amostra, você
 * ajusta a lista e baixa o arquivo que vai pra análise junto com o WhatsApp.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit as qLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/ui/toast';
import { mapEtapaCircuito } from '@/lib/circuito';
import { carregarDiretrizes, type DiretrizesAuditoria } from '@/lib/auditoria';
import {
  sortearAmostra, computarPanorama, montarPacote, faixaDoLead, msOf,
  ROTULO_FAIXA, type LeadAud, type AtividadeAud, type VendaAud, type AdsAud, type FaixaSorteio,
} from '@/lib/auditoriaPacote';

const DIA = 24 * 60 * 60 * 1000;
const inputCls = 'w-full px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40 transition';
const btnOuro = 'px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40';

const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const doYmd = (s: string) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, (m || 1) - 1, d || 1).getTime(); };
const fmtData = (ms: number) => ms ? new Date(ms).toLocaleDateString('pt-BR') : '—';

const COR_FAIXA: Record<FaixaSorteio, string> = {
  avancado: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
  parado_15d: 'bg-rose-500/10 border-rose-500/40 text-rose-300',
  entrada_recente: 'bg-sky-500/10 border-sky-500/40 text-sky-300',
  livre: 'bg-white/[0.06] border-white/20 text-white/70',
};

export default function GerarPacotePage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  const [corretores, setCorretores] = useState<{ id: string; nome: string }[]>([]);
  const [uid, setUid] = useState('');
  const [ini, setIni] = useState(() => ymd(Date.now() - 60 * DIA));
  const [fim, setFim] = useState(() => ymd(Date.now()));
  const [tamanho, setTamanho] = useState(20);

  const [diretrizes, setDiretrizes] = useState<DiretrizesAuditoria | null>(null);
  const [leads, setLeads] = useState<LeadAud[]>([]);
  const [ativ, setAtiv] = useState<Map<string, AtividadeAud>>(new Map());
  const [vendas, setVendas] = useState<VendaAud[]>([]);
  const [ads, setAds] = useState<AdsAud[]>([]);
  const [etapasDesde, setEtapasDesde] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const [amostra, setAmostra] = useState<{ lead: LeadAud; faixa: FaixaSorteio }[]>([]);
  const [fora, setFora] = useState<Set<string>>(new Set());
  const [incompletas, setIncompletas] = useState<{ faixa: FaixaSorteio; pedidos: number; obtidos: number }[]>([]);
  const [busca, setBusca] = useState('');
  const [gerando, setGerando] = useState(false);

  useEffect(() => { carregarDiretrizes(imobiliariaId).then(setDiretrizes); }, [imobiliariaId]);

  useEffect(() => {
    if (!imobiliariaId || isEspelhoDemo) return;
    getDocs(query(collection(db, 'usuarios'), where('imobiliariaId', '==', imobiliariaId)))
      .then((s) => setCorretores(s.docs
        .map((d) => ({ id: d.id, nome: String(d.data().nome || d.id.slice(0, 6)), tipo: String(d.data().tipoConta || ''), ok: d.data().aprovado !== false }))
        .filter((c) => c.ok && c.tipo.startsWith('corretor'))
        .sort((a, b) => a.nome.localeCompare(b.nome))))
      .catch(() => showToast('Não foi possível listar os corretores.', 'error'));
  }, [imobiliariaId, isEspelhoDemo]);

  /** Carrega tudo do corretor: leads, timeline de cada um, vendas e leads de anúncio. */
  const carregarDados = async () => {
    if (!uid || !imobiliariaId) return;
    setCarregando(true); setProgresso(0); setAmostra([]); setFora(new Set());
    try {
      const ls = await getDocs(query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId), where('userId', '==', uid)));
      const arr: LeadAud[] = ls.docs.map((d) => ({ id: d.id, ...d.data() } as LeadAud));
      setLeads(arr);

      // data do carimbo de etapa mais antigo — define se a agenda fica parcial
      let desde: number | null = null;
      for (const l of arr) for (const h of (l.etapasHist || [])) {
        const ms = msOf(h.em);
        if (ms > 0 && (desde === null || ms < desde)) desde = ms;
      }
      setEtapasDesde(desde);

      const m = new Map<string, AtividadeAud>();
      const CH = 20;
      for (let i = 0; i < arr.length; i += CH) {
        await Promise.all(arr.slice(i, i + CH).map(async (l) => {
          try {
            const [is, ts] = await Promise.all([
              getDocs(collection(db, 'leads', l.id, 'interactions')),
              getDocs(collection(db, 'leads', l.id, 'tarefas')),
            ]);
            const interacoes = is.docs.map((d) => {
              const x = d.data();
              return { ms: msOf(x.timestamp), tipo: String(x.type || ''), notas: String(x.notes || ''), por: x.por ? String(x.por) : undefined, taskId: x.taskId ? String(x.taskId) : undefined };
            }).filter((e) => e.ms > 0).sort((a, b) => a.ms - b.ms);
            const conclusao = new Map<string, number>();
            for (const e of interacoes) if (e.taskId && /conclu/i.test(e.tipo)) conclusao.set(e.taskId, e.ms);
            const tarefas = ts.docs.map((d) => {
              const x = d.data();
              return { id: d.id, descricao: String(x.description || ''), tipo: String(x.type || ''), status: String(x.status || ''), dueMs: msOf(x.dueDate), concluidaMs: conclusao.get(d.id) || 0 };
            });
            m.set(l.id, { interacoes, tarefas });
          } catch { /* lead com erro fica sem timeline */ }
        }));
        setProgresso(Math.min(1, (i + CH) / Math.max(1, arr.length)));
      }
      setAtiv(m);

      const [vs, as] = await Promise.all([
        getDocs(query(collection(db, 'vendas'), where('imobiliariaId', '==', imobiliariaId))),
        getDocs(query(collection(db, 'adsLeads'), where('imobiliariaId', '==', imobiliariaId))),
      ]);
      setVendas(vs.docs.map((d) => d.data() as VendaAud));
      setAds(as.docs.map((d) => d.data() as AdsAud));
      showToast(`${arr.length} leads carregados.`, 'success');
    } catch (e) {
      console.error('carregarDados auditoria:', e);
      showToast('Não foi possível carregar os dados do corretor.', 'error');
    } finally {
      setCarregando(false); setProgresso(1);
    }
  };

  const ultimoToqueDe = (id: string) => {
    const a = ativ.get(id);
    return a?.interacoes.length ? a.interacoes[a.interacoes.length - 1].ms : 0;
  };

  const sortear = () => {
    if (!leads.length) { showToast('Carregue os dados do corretor primeiro.', 'info'); return; }
    const r = sortearAmostra(leads, ultimoToqueDe, tamanho);
    setAmostra(r.escolhidos);
    setIncompletas(r.incompletas);
    setFora(new Set());
  };

  const substituir = (id: string, faixa: FaixaSorteio) => {
    const usados = new Set(amostra.map((a) => a.lead.id));
    const cands = leads.filter((l) => !usados.has(l.id) && faixaDoLead(l, ultimoToqueDe(l.id), Date.now()) === faixa);
    const pool = cands.length ? cands : leads.filter((l) => !usados.has(l.id) && faixaDoLead(l, ultimoToqueDe(l.id), Date.now()) !== null);
    if (!pool.length) { showToast('Não há outro lead disponível nessa faixa.', 'info'); return; }
    const novo = pool[Math.floor(Math.random() * pool.length)];
    setAmostra(amostra.map((a) => a.lead.id === id ? { lead: novo, faixa } : a));
  };

  const adicionar = (l: LeadAud) => {
    if (amostra.some((a) => a.lead.id === l.id)) { showToast('Esse lead já está na amostra.', 'info'); return; }
    const f = faixaDoLead(l, ultimoToqueDe(l.id), Date.now()) || 'livre';
    setAmostra([...amostra, { lead: l, faixa: f }]);
    setBusca('');
  };

  const selecionados = useMemo(() => amostra.filter((a) => !fora.has(a.lead.id)), [amostra, fora]);
  const iniMs = doYmd(ini), fimMs = doYmd(fim) + DIA;
  const agendaParcial = etapasDesde !== null && etapasDesde > iniMs;

  const resultadosBusca = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (q.length < 2) return [];
    return leads.filter((l) => `${l.nome || ''} ${l.telefone || ''}`.toLowerCase().includes(q)).slice(0, 6);
  }, [busca, leads]);

  const gerar = async () => {
    if (!diretrizes || !selecionados.length) return;
    setGerando(true);
    try {
      const corretor = { id: uid, nome: corretores.find((c) => c.id === uid)?.nome || uid };
      const panorama = computarPanorama(leads, ativ, vendas, ads, diretrizes, uid, iniMs, fimMs);

      // benchmark do time: mesma conta, todos os corretores
      try {
        const todos = await getDocs(query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId)));
        const arrT = todos.docs.map((d) => ({ id: d.id, ...d.data() } as LeadAud));
        const t1: number[] = [];
        let ativos = 0, semToque = 0;
        for (const l of arrT) {
          const n = msOf(l.createdAt), p = msOf(l.circuito?.primeiroContatoEm);
          if (n > 0 && p >= n && p > 0) t1.push(Math.round((p - n) / 60000));
          const et = mapEtapaCircuito(l.etapa);
          if (et !== 'Fechamento' && et !== 'Descartado') {
            ativos++;
            const desde = msOf(l.circuito?.desde) || n;
            if (desde && (Date.now() - desde) / DIA > diretrizes.prazos.leadParadoDias) semToque++;
          }
        }
        const s = [...t1].sort((a, b) => a - b);
        panorama.benchmark_time = {
          mediana_primeiro_contato_min_util: s.length ? s[Math.floor(s.length / 2)] : null,
          sem_toque_7d_percentual: ativos ? Math.round((semToque / ativos) * 100) : null,
        };
      } catch { /* benchmark é bônus; sem ele o pacote sai igual */ }

      // histórico das rodadas anteriores (Tela 2 alimenta isto)
      let historico: unknown = { ultimos_15d: null, ultimo_mes: null, ultimos_3m: null, rodadas_anteriores: 0 };
      try {
        const rs = await getDocs(query(collection(db, 'auditoriaRodadas'),
          where('imobiliariaId', '==', imobiliariaId), where('corretorUid', '==', uid),
          orderBy('geradoEm', 'desc'), qLimit(12)));
        const rodadas = rs.docs.map((d) => d.data());
        historico = {
          rodadas_anteriores: rodadas.length,
          ultimas: rodadas.slice(0, 6).map((r: Record<string, unknown>) => ({
            data: r.geradoEmYmd ?? null, gargalo: r.gargalo ?? null,
            instrucao: r.instrucao ?? null, status_instrucao: r.statusInstrucao ?? null,
            metricas: r.metricas ?? null,
          })),
        };
      } catch { /* sem índice ainda, ou sem rodadas — segue com o bloco vazio */ }

      const pacote = montarPacote({
        corretor, periodo: { iniMs, fimMs }, diretrizes, panorama,
        amostra: selecionados, atividade: ativ, ads, historico,
        historicoEtapasDesdeMs: etapasDesde,
      });

      const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria-${corretor.nome.toLowerCase().replace(/\s+/g, '-')}-${ymd(Date.now())}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);

      if (!isEspelhoDemo) {
        await addDoc(collection(db, 'auditoriaRodadas'), {
          imobiliariaId, corretorUid: uid, corretorNome: corretor.nome,
          geradoEm: serverTimestamp(), geradoEmYmd: ymd(Date.now()), geradoPor: userData?.nome || '',
          periodoInicio: ini, periodoFim: fim,
          versaoDiretrizes: diretrizes.versao,
          leadIds: selecionados.map((s) => s.lead.id),
          tamanhoAmostra: selecionados.length,
          metricas: {
            mediana_1o_contato_min_util: panorama.mediana_primeiro_contato_min_util,
            sem_toque: panorama.sem_toque_7d,
            tarefas_atrasadas: panorama.tarefas_atrasadas_24h,
            meets_feitos: panorama.meets_feitos,
            visitas_feitas: panorama.visitas_feitas,
            vendas: panorama.vendas,
          },
          gargalo: '', instrucao: '', statusInstrucao: 'pendente',
        });
      }
      showToast(`Pacote gerado com ${selecionados.length} leads.`, 'success');
    } catch (e) {
      console.error('gerar pacote:', e);
      showToast('Não foi possível gerar o pacote.', 'error');
    } finally {
      setGerando(false);
    }
  };

  if (isEspelhoDemo) {
    return (
      <div className="max-w-3xl mx-auto mt-10 px-4">
        <span className="gx-tag"><span>Área do administrador</span></span>
        <div className="al-card p-10 mt-3 text-center">
          <p className="text-[40px] mb-2">📦</p>
          <p className="text-sm text-text-secondary">A geração do pacote lê os leads reais da imobiliária — indisponível no modo demonstração.</p>
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
          <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2">Gerar pacote de auditoria</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">
            Régua <b className="text-[#E8C547]">{diretrizes?.versao || '…'}</b> · o arquivo baixa pra você levar pra análise junto com as conversas
          </p>
        </div>
        <Link href="/dashboard/admin/auditoria/" className={btnGhost}>← Auditoria</Link>
      </div>

      {/* 1. seleção */}
      <section className="al-card relative overflow-hidden p-4 sm:p-5">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em] mb-3">1 · Quem e quando</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Corretor</label>
            <select value={uid} onChange={(e) => { setUid(e.target.value); setLeads([]); setAmostra([]); }} className={inputCls}>
              <option value="">selecione…</option>
              {corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">De</label>
            <input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className={inputCls + ' [color-scheme:dark]'} />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Até</label>
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className={inputCls + ' [color-scheme:dark]'} />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1">Amostra</label>
            <input type="number" min={1} max={100} value={tamanho} onChange={(e) => setTamanho(Number(e.target.value) || 20)} className={inputCls + ' tabular-nums'} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button onClick={carregarDados} disabled={!uid || carregando} className={btnGhost}>
            {carregando ? `carregando ${Math.round(progresso * 100)}%…` : '1) Carregar dados do corretor'}
          </button>
          <button onClick={sortear} disabled={!leads.length || carregando} className={btnOuro}>2) Sugerir amostra</button>
          {leads.length > 0 && <span className="text-[11px] text-text-secondary">{leads.length} leads na carteira dele</span>}
        </div>

        {agendaParcial && (
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.07] p-3">
            <p className="text-[12px] text-amber-200">
              ⚠ <b>Meets e visitas ficam parciais neste período.</b> O carimbo de mudança de etapa só existe desde <b>{fmtData(etapasDesde as number)}</b>,
              e você escolheu começar em <b>{fmtData(iniMs)}</b>. O que aconteceu antes disso não foi registrado — número baixo no começo significa
              ausência de histórico, não ausência de trabalho. Esse aviso vai dentro do pacote também.
            </p>
          </div>
        )}
      </section>

      {/* 2. revisão */}
      {amostra.length > 0 && (
        <section className="al-card relative overflow-hidden p-4 sm:p-5">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="al-display text-[13px] font-bold text-white uppercase tracking-[0.1em]">2 · Revise antes de gerar</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">Tire quem não faz sentido, troque por outro da mesma faixa ou adicione um lead específico.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-white tabular-nums">{selecionados.length} de {amostra.length} selecionados</span>
              <button onClick={sortear} className={btnGhost}>↻ re-sortear tudo</button>
            </div>
          </div>

          {incompletas.length > 0 && (
            <p className="text-[11px] text-amber-300 mb-2">
              ⚠ Faixa incompleta: {incompletas.map((i) => `${ROTULO_FAIXA[i.faixa]} (${i.obtidos} de ${i.pedidos})`).join(' · ')} — o que faltou virou aleatório livre.
            </p>
          )}

          <div className="flex items-center gap-2 mb-3 relative">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="buscar um lead pra adicionar…" className={inputCls + ' max-w-sm'} />
            {resultadosBusca.length > 0 && (
              <div className="absolute top-full left-0 mt-1 z-10 w-full max-w-sm rounded-xl border border-white/15 bg-[#12101a] shadow-xl overflow-hidden">
                {resultadosBusca.map((l) => (
                  <button key={l.id} onClick={() => adicionar(l)} className="w-full text-left px-3 py-2 text-[12px] text-white hover:bg-white/[0.08]">
                    {l.nome || 'Sem nome'} <span className="text-text-secondary">· {mapEtapaCircuito(l.etapa)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="text-text-secondary">
                  {['', 'Lead', 'Faixa', 'Etapa', 'Sem toque', 'Entrada', 'Origem', ''].map((h, i) => (
                    <th key={i} className={`px-2 py-1.5 font-bold whitespace-nowrap ${i <= 1 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {amostra.map(({ lead: l, faixa }) => {
                  const excluido = fora.has(l.id);
                  const ult = ultimoToqueDe(l.id);
                  return (
                    <tr key={l.id} className={`border-t border-white/[0.06] ${excluido ? 'opacity-35' : ''}`}>
                      <td className="px-2 py-2">
                        <input type="checkbox" checked={!excluido} className="accent-[#E8C547]"
                          onChange={() => { const n = new Set(fora); if (excluido) n.delete(l.id); else n.add(l.id); setFora(n); }} />
                      </td>
                      <td className="px-2 py-2 text-white font-semibold whitespace-nowrap">
                        {l.nome || 'Sem nome'}
                        <span className="block text-[10px] text-text-secondary font-normal tabular-nums">{l.telefone || '—'}</span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold border ${COR_FAIXA[faixa]}`}>{ROTULO_FAIXA[faixa]}</span>
                      </td>
                      <td className="px-2 py-2 text-right text-white/90 whitespace-nowrap">{mapEtapaCircuito(l.etapa)}</td>
                      <td className={`px-2 py-2 text-right tabular-nums ${ult && (Date.now() - ult) / DIA > 15 ? 'text-rose-300 font-bold' : 'text-white/80'}`}>
                        {ult ? `${Math.floor((Date.now() - ult) / DIA)}d` : '—'}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-white/70">{fmtData(msOf(l.createdAt))}</td>
                      <td className="px-2 py-2 text-right text-white/60 max-w-[180px] truncate" title={l.origem || ''}>{l.origem || '—'}</td>
                      <td className="px-2 py-2 text-right">
                        <button onClick={() => substituir(l.id, faixa)} className="text-[11px] text-text-secondary hover:text-white" title="sortear outro da mesma faixa">↻</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. gerar */}
      {amostra.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-text-secondary">
            O arquivo leva os números do período, a régua {diretrizes?.versao} e a timeline completa dos {selecionados.length} leads selecionados.
          </p>
          <button onClick={gerar} disabled={gerando || !selecionados.length} className={btnOuro}>
            {gerando ? 'Gerando…' : `⬇ Gerar pacote (${selecionados.length} leads)`}
          </button>
        </div>
      )}
    </div>
  );
}
