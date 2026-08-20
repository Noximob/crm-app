'use client';

/**
 * AS LISTAS — o que aconteceu com o que foi importado.
 *
 * A Central de Leads sabia criar lista, redistribuir descartado e transferir
 * carteira, mas não sabia MOSTRAR. Depois de importar, a lista sumia da vista
 * do gestor: ela existe no Firestore e aparece na tela do corretor, e daí em
 * diante ninguém de fora sabe se foi trabalhada.
 *
 * A pergunta que esta tela responde primeiro é a que dói: quantos contatos
 * NUNCA foram tocados. Lista fria que fica parada é dinheiro que a casa já
 * gastou e não virou nada — e é invisível, porque não gera tarefa atrasada
 * nem lead parado. Não existe no CRM até alguém ligar.
 *
 * Depois vem o resto: de quem é cada lista, quantas vezes cada contato foi
 * chamado, quem virou lead, quem foi descartado e por quê.
 *
 * Lê ligacaoAtivaListas/{id} + a subcoleção contatos de cada uma. É leitura
 * pura: nada aqui grava.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Evento { tipo: string; detalhe?: string; em?: { seconds?: number }; por?: string }

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  status: string;
  tentativas: number;
  ultimaTentativaEm?: { seconds?: number };
  descartadoMotivo?: string;
  anotacoes?: string;
  leadId?: string;
  eventos: Evento[];
}

interface Lista {
  id: string;
  nome: string;
  corretorId: string;
  criadaEm?: { seconds?: number };
  contatos: Contato[];
  /** a lista existe mas os contatos não puderam ser lidos */
  semAcesso?: boolean;
}

const fmtData = (ts?: { seconds?: number }): string => {
  if (!ts?.seconds) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const diasDesde = (ts?: { seconds?: number }): number | null => {
  if (!ts?.seconds) return null;
  return Math.floor((Date.now() - ts.seconds * 1000) / 864e5);
};

const ROTULO_STATUS: Record<string, string> = {
  pendente: 'na fila', crm: 'virou lead', descartado: 'descartado', realocado: 'realocado',
};

const COR_STATUS: Record<string, string> = {
  pendente: 'text-text-secondary', crm: 'text-emerald-300',
  descartado: 'text-rose-300', realocado: 'text-amber-300',
};

/** O que se conta de uma lista — tudo derivado dos contatos, nada guardado. */
function resumir(l: Lista) {
  const c = l.contatos;
  const pendentes = c.filter((x) => x.status === 'pendente');
  return {
    total: c.length,
    pendentes: pendentes.length,
    noCrm: c.filter((x) => x.status === 'crm').length,
    descartados: c.filter((x) => x.status === 'descartado').length,
    // o número que dói: está na fila e ninguém ligou nenhuma vez
    intocados: pendentes.filter((x) => (x.tentativas || 0) === 0).length,
    chamadas: c.reduce((s, x) => s + (x.tentativas || 0), 0),
    ultimaAtividade: c.reduce<number>((mx, x) => Math.max(mx, x.ultimaTentativaEm?.seconds || 0), 0),
  };
}

const DEMO: Lista[] = [
  {
    id: 'demo-lista', nome: 'Feirão Litoral — Stand Barra Velha', corretorId: 'demo-1',
    criadaEm: { seconds: Math.floor(Date.now() / 1000) - 12 * 86400 },
    contatos: [
      { id: 'a', nome: 'Sérgio Prado', telefone: '(47) 96644-5566', status: 'crm', tentativas: 1, leadId: 'x', eventos: [], ultimaTentativaEm: { seconds: Math.floor(Date.now() / 1000) - 5 * 86400 } },
      { id: 'b', nome: 'Camila Duarte', telefone: '(47) 98822-3344', status: 'pendente', tentativas: 2, eventos: [], anotacoes: 'Pediu pra ligar depois das 18h.', ultimaTentativaEm: { seconds: Math.floor(Date.now() / 1000) - 2 * 86400 } },
      { id: 'c', nome: 'Vera Lúcia', telefone: '(47) 95555-6677', status: 'descartado', tentativas: 3, descartadoMotivo: 'Número errado', eventos: [] },
      { id: 'd', nome: 'Tiago Melo', telefone: '(47) 94466-7788', status: 'pendente', tentativas: 0, eventos: [] },
      { id: 'e', nome: 'Patrícia Reis', telefone: '(47) 93377-8899', status: 'pendente', tentativas: 0, eventos: [] },
    ],
  },
];

export default function ListasAtivas({ imobiliariaId, corretores, isEspelhoDemo }: {
  imobiliariaId?: string;
  corretores: { id: string; nome: string }[];
  isEspelhoDemo?: boolean;
}) {
  const [listas, setListas] = useState<Lista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [filtroCorretor, setFiltroCorretor] = useState('todos');
  const [busca, setBusca] = useState('');

  const nomeDe = useCallback(
    (id: string) => corretores.find((c) => c.id === id)?.nome || (id ? 'corretor removido' : 'sem dono'),
    [corretores],
  );

  useEffect(() => {
    if (isEspelhoDemo) { setListas(DEMO); setCarregando(false); return; }
    if (!imobiliariaId) return;
    let vivo = true;
    (async () => {
      setCarregando(true); setErro('');
      try {
        const snap = await getDocs(query(
          collection(db, 'ligacaoAtivaListas'),
          where('imobiliariaId', '==', imobiliariaId),
        ));
        // as subcoleções vão em paralelo: em série, seis listas viravam seis
        // idas ao banco uma atrás da outra
        const carregadas = await Promise.all(snap.docs.map(async (l) => {
          const d = l.data() as Record<string, unknown>;
          const base: Lista = {
            id: l.id,
            nome: String(d.nome || 'Lista sem nome'),
            corretorId: String(d.corretorId || ''),
            criadaEm: d.criadaEm as { seconds?: number } | undefined,
            contatos: [],
          };
          try {
            const cs = await getDocs(collection(l.ref, 'contatos'));
            base.contatos = cs.docs.map((x) => {
              const c = x.data() as Record<string, unknown>;
              return {
                id: x.id,
                nome: String(c.nome || ''),
                telefone: String(c.telefone || ''),
                status: String(c.status || 'pendente'),
                tentativas: Number(c.tentativas || 0),
                ultimaTentativaEm: c.ultimaTentativaEm as { seconds?: number } | undefined,
                descartadoMotivo: c.descartadoMotivo ? String(c.descartadoMotivo) : undefined,
                anotacoes: c.anotacoes ? String(c.anotacoes) : undefined,
                leadId: c.leadId ? String(c.leadId) : undefined,
                eventos: Array.isArray(c.eventos) ? (c.eventos as Evento[]) : [],
              };
            });
          } catch {
            // lista sem permissão de leitura: aparece, mas dizendo que não abriu
            base.semAcesso = true;
          }
          return base;
        }));
        if (!vivo) return;
        carregadas.sort((a, b) => (b.criadaEm?.seconds || 0) - (a.criadaEm?.seconds || 0));
        setListas(carregadas);
      } catch (e) {
        console.error('carregar listas:', e);
        if (vivo) setErro('Não foi possível carregar as listas.');
      } finally { if (vivo) setCarregando(false); }
    })();
    return () => { vivo = false; };
  }, [imobiliariaId, isEspelhoDemo]);

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return listas.filter((l) => {
      if (filtroCorretor !== 'todos' && l.corretorId !== filtroCorretor) return false;
      if (!b) return true;
      return l.nome.toLowerCase().includes(b)
        || nomeDe(l.corretorId).toLowerCase().includes(b)
        || l.contatos.some((c) => c.nome.toLowerCase().includes(b) || c.telefone.includes(b));
    });
  }, [listas, filtroCorretor, busca, nomeDe]);

  /** O agregado de tudo que está visível — a leitura de cima. */
  const geral = useMemo(() => {
    const r = visiveis.map(resumir);
    return {
      listas: visiveis.length,
      total: r.reduce((s, x) => s + x.total, 0),
      intocados: r.reduce((s, x) => s + x.intocados, 0),
      noCrm: r.reduce((s, x) => s + x.noCrm, 0),
      chamadas: r.reduce((s, x) => s + x.chamadas, 0),
    };
  }, [visiveis]);

  const inputCls = 'px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50';

  if (carregando) {
    return <div className="max-w-4xl mx-auto al-card p-8 text-center text-text-secondary text-sm">Carregando as listas…</div>;
  }

  if (erro) {
    return <div className="max-w-4xl mx-auto al-card p-8 text-center text-sm text-rose-300">{erro}</div>;
  }

  if (!listas.length) {
    return (
      <div className="max-w-4xl mx-auto al-card p-8 text-center">
        <p className="text-[32px] mb-2">📋</p>
        <p className="text-sm text-text-secondary">
          Nenhuma lista importada ainda. Use <b className="text-white">Importar lista</b> para criar a primeira.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3">

      {/* o agregado — quatro números, e o primeiro é o que dói */}
      <div className="al-card relative overflow-hidden p-4">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className={`rounded-xl border px-3 py-2.5 ${geral.intocados > 0 ? 'border-rose-500/30 bg-rose-500/[0.05]' : 'border-emerald-500/25 bg-emerald-500/[0.04]'}`}>
            <p className={`text-[22px] font-extrabold tabular-nums leading-none ${geral.intocados > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{geral.intocados}</p>
            <p className="text-[10.5px] text-text-secondary leading-snug mt-1">nunca receberam uma ligação</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[22px] font-extrabold text-white tabular-nums leading-none">{geral.total}</p>
            <p className="text-[10.5px] text-text-secondary leading-snug mt-1">contatos em {geral.listas} lista{geral.listas === 1 ? '' : 's'}</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[22px] font-extrabold text-emerald-300 tabular-nums leading-none">{geral.noCrm}</p>
            <p className="text-[10.5px] text-text-secondary leading-snug mt-1">viraram lead no CRM</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[22px] font-extrabold text-white tabular-nums leading-none">{geral.chamadas}</p>
            <p className="text-[10.5px] text-text-secondary leading-snug mt-1">chamadas feitas ao todo</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <input value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="buscar lista, corretor, nome ou telefone…" className={inputCls + ' flex-1 min-w-[220px]'} />
          <select value={filtroCorretor} onChange={(e) => setFiltroCorretor(e.target.value)} className={inputCls}>
            <option value="todos">Todos os corretores</option>
            {corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>

      {/* uma lista por cartão; clicar abre contato por contato */}
      {visiveis.map((l) => {
        const s = resumir(l);
        const abertaAqui = aberta === l.id;
        const parada = diasDesde({ seconds: s.ultimaAtividade });
        return (
          <div key={l.id} className="al-card overflow-hidden">
            <button onClick={() => setAberta(abertaAqui ? null : l.id)}
              className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[14px] font-bold text-white">{l.nome}</span>
                <span className="text-[11.5px] text-text-secondary">
                  com <b className="text-white/80">{nomeDe(l.corretorId)}</b>
                </span>
                <span className="text-[11px] text-text-secondary ml-auto tabular-nums shrink-0">
                  criada {fmtData(l.criadaEm)}
                  {parada !== null && s.ultimaAtividade > 0 && ` · última chamada há ${parada}d`}
                  {s.chamadas === 0 && ' · nunca trabalhada'}
                  <span className="ml-2 text-[13px]">{abertaAqui ? '▴' : '▾'}</span>
                </span>
              </div>

              {l.semAcesso ? (
                <p className="text-[11.5px] text-amber-300 mt-2">Os contatos desta lista não puderam ser lidos.</p>
              ) : (
                <>
                  {/* a barra: cor nunca sozinha — os números vêm ao lado */}
                  <div className="flex gap-[2px] h-2 mt-2.5 rounded overflow-hidden bg-white/[0.06]">
                    {([
                      ['crm', s.noCrm, '#0ca30c'],
                      ['tocados', s.pendentes - s.intocados, '#fab219'],
                      ['intocados', s.intocados, '#d03b3b'],
                      ['descartados', s.descartados, '#6b7075'],
                    ] as const).filter(([, n]) => n > 0).map(([k, n, cor]) => (
                      <div key={k} title={`${k}: ${n}`} style={{ width: `${(n / (s.total || 1)) * 100}%`, background: cor }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-text-secondary">
                    <span><b className="text-white tabular-nums">{s.total}</b> contatos</span>
                    {s.intocados > 0 && <span className="text-rose-300"><b className="tabular-nums">{s.intocados}</b> sem nenhuma ligação</span>}
                    {s.pendentes - s.intocados > 0 && <span><b className="text-white tabular-nums">{s.pendentes - s.intocados}</b> em andamento</span>}
                    {s.noCrm > 0 && <span className="text-emerald-300"><b className="tabular-nums">{s.noCrm}</b> {s.noCrm === 1 ? 'virou' : 'viraram'} lead</span>}
                    {s.descartados > 0 && <span><b className="text-white tabular-nums">{s.descartados}</b> descartado{s.descartados === 1 ? '' : 's'}</span>}
                    <span className="ml-auto"><b className="text-white tabular-nums">{s.chamadas}</b> chamadas</span>
                  </div>
                </>
              )}
            </button>

            {abertaAqui && !l.semAcesso && (
              <div className="px-4 pb-4">
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-[11.5px] border-collapse min-w-[600px]">
                    <thead>
                      <tr>
                        {['Contato', 'Telefone', 'Chamadas', 'Situação', 'Última', 'Observação'].map((c) => (
                          <th key={c} className="text-left font-extrabold uppercase tracking-[0.08em] text-[9.5px] text-text-secondary border-b border-white/15 px-2 py-1.5 whitespace-nowrap">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* mais chamado primeiro; quem nunca foi chamado desce para
                          o fim, junto — é ali que o gestor vai olhar */}
                      {[...l.contatos]
                        .sort((a, b) => (b.tentativas || 0) - (a.tentativas || 0) || a.nome.localeCompare(b.nome))
                        .map((c) => (
                          <tr key={c.id}>
                            <td className="px-2 py-1.5 border-b border-white/[0.06] align-top text-white font-bold">{c.nome || '—'}</td>
                            <td className="px-2 py-1.5 border-b border-white/[0.06] align-top text-text-secondary tabular-nums whitespace-nowrap">{c.telefone}</td>
                            <td className={`px-2 py-1.5 border-b border-white/[0.06] align-top tabular-nums font-bold ${c.tentativas > 0 ? 'text-white' : 'text-rose-300'}`}>
                              {c.tentativas > 0 ? `${c.tentativas}×` : 'nenhuma'}
                            </td>
                            <td className={`px-2 py-1.5 border-b border-white/[0.06] align-top whitespace-nowrap ${COR_STATUS[c.status] || 'text-text-secondary'}`}>
                              {ROTULO_STATUS[c.status] || c.status}
                            </td>
                            <td className="px-2 py-1.5 border-b border-white/[0.06] align-top text-text-secondary tabular-nums whitespace-nowrap">{fmtData(c.ultimaTentativaEm)}</td>
                            <td className="px-2 py-1.5 border-b border-white/[0.06] align-top text-text-secondary leading-relaxed">
                              {c.descartadoMotivo || c.anotacoes || ''}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!visiveis.length && (
        <div className="al-card p-6 text-center text-sm text-text-secondary">
          Nenhuma lista com esse filtro.
        </div>
      )}
    </div>
  );
}
