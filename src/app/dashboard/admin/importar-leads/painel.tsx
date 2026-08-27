'use client';

/**
 * O PAINEL DA CENTRAL — a tela que responde "quanto eu tenho e como divide".
 *
 * As outras abas mostram lista por lista e bolsão por bolsão. Com uma ou duas
 * listas isso passa; com seis, a soma existe só na cabeça de quem olha, e a
 * sobra de cada uma (2 aqui, 3 ali) nunca aparece junta. O gestor disse com
 * todas as letras: "não consigo ver escala nas listas que hoje se criam, e
 * como se dividem os leads que sobram pra eu redistribuir".
 *
 * Então a tela tem exatamente três andares, nessa ordem:
 *
 *   1. O QUE PRECISA DE VOCÊ    os alertas — lista intocada, lista de quem
 *                               saiu da equipe, corretor sem munição. Cada
 *                               um com o botão que leva ao lugar de resolver.
 *   2. A ESCALA                 quatro números da casa inteira, e o primeiro
 *                               é o que dói: quantos nunca receberam ligação.
 *   3. A DIVISÃO                uma linha por corretor: quanto tem, quanto
 *                               nunca ligou, quanto converteu, há quantos
 *                               dias não toca no telefone.
 *
 * Só lê. Nenhum botão daqui grava nada — os que agem levam pras abas que já
 * faziam isso antes, que continuam iguais.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  resumirLista, somarResumos, dividirPorCorretor, oQueSobra, alertasDaCentral,
  type ListaFria, type Pessoa,
} from '@/lib/centralLeads';

/** Carrega as listas com os contatos — as subcoleções em paralelo. */
export async function carregarListasFrias(imobiliariaId: string): Promise<ListaFria[]> {
  const snap = await getDocs(query(
    collection(db, 'ligacaoAtivaListas'),
    where('imobiliariaId', '==', imobiliariaId),
  ));
  const listas = await Promise.all(snap.docs.map(async (l) => {
    const d = l.data() as Record<string, unknown>;
    const base: ListaFria = {
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
          eventos: Array.isArray(c.eventos) ? (c.eventos as ListaFria['contatos'][number]['eventos']) : [],
        };
      });
    } catch {
      base.semAcesso = true;
    }
    return base;
  }));
  return listas.sort((a, b) => (b.criadaEm?.seconds || 0) - (a.criadaEm?.seconds || 0));
}

const DEMO: ListaFria[] = [
  {
    id: 'd1', nome: 'Feirão Litoral — Stand Barra Velha', corretorId: 'demo-c1',
    criadaEm: { seconds: Math.floor(Date.now() / 1000) - 22 * 86400 },
    contatos: [
      { id: 'a', nome: 'Sérgio Prado', telefone: '', status: 'crm', tentativas: 1, eventos: [], ultimaTentativaEm: { seconds: Math.floor(Date.now() / 1000) - 12 * 86400 } },
      { id: 'b', nome: 'Camila Duarte', telefone: '', status: 'pendente', tentativas: 2, eventos: [], ultimaTentativaEm: { seconds: Math.floor(Date.now() / 1000) - 11 * 86400 } },
      { id: 'c', nome: 'Vera Lúcia', telefone: '', status: 'descartado', tentativas: 3, descartadoMotivo: 'Número errado', eventos: [] },
      { id: 'd', nome: 'Tiago Melo', telefone: '', status: 'pendente', tentativas: 0, eventos: [] },
      { id: 'e', nome: 'Patrícia Reis', telefone: '', status: 'pendente', tentativas: 0, eventos: [] },
    ],
  },
  {
    id: 'd2', nome: 'Networking — Condomínio Vista Mar', corretorId: 'demo-c2',
    criadaEm: { seconds: Math.floor(Date.now() / 1000) - 9 * 86400 },
    contatos: Array.from({ length: 20 }, (_, i) => ({
      id: 'n' + i, nome: 'Contato ' + (i + 1), telefone: '', eventos: [],
      status: i < 2 ? 'descartado' : 'pendente',
      tentativas: 0,
      descartadoMotivo: i === 0 ? 'Interesse futuro' : i === 1 ? 'Não atende' : undefined,
    })),
  },
];

const Numero = ({ n, rot, cor, alerta }: { n: number; rot: string; cor?: string; alerta?: boolean }) => (
  <div className={`rounded-xl border px-3 py-2.5 ${alerta
    ? 'border-rose-500/30 bg-rose-500/[0.06]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
    <p className={`text-[24px] font-extrabold tabular-nums leading-none ${cor || 'text-white'}`}>{n}</p>
    <p className="text-[10.5px] text-text-secondary leading-snug mt-1">{rot}</p>
  </div>
);

export default function PainelCentral({
  imobiliariaId, corretores, isEspelhoDemo, crmDescartados, irPara,
}: {
  imobiliariaId?: string;
  corretores: Pessoa[];
  isEspelhoDemo?: boolean;
  /** quantos leads do CRM estão no bolsão — o pai já carrega isso */
  crmDescartados: number;
  irPara: (aba: 'importar' | 'listas' | 'redistribuir' | 'transferir') => void;
}) {
  const [listas, setListas] = useState<ListaFria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (isEspelhoDemo) { setListas(DEMO); setCarregando(false); return; }
    if (!imobiliariaId) return;
    let vivo = true;
    setCarregando(true); setErro('');
    carregarListasFrias(imobiliariaId)
      .then((ls) => { if (vivo) setListas(ls); })
      .catch((e) => { console.error('painel central:', e); if (vivo) setErro('Não foi possível carregar as listas.'); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [imobiliariaId, isEspelhoDemo]);

  const equipe = isEspelhoDemo && !corretores.length
    ? [{ id: 'demo-c1', nome: 'João Vitor' }, { id: 'demo-c2', nome: 'Maria Clara' }, { id: 'demo-c3', nome: 'Ana Paula' }]
    : corretores;

  const casa = useMemo(() => somarResumos(listas.map(resumirLista)), [listas]);
  const fatias = useMemo(() => dividirPorCorretor(listas, equipe), [listas, equipe]);
  const sobra = useMemo(() => oQueSobra(listas, crmDescartados), [listas, crmDescartados]);
  const alertas = useMemo(() => alertasDaCentral(listas, equipe, sobra), [listas, equipe, sobra]);

  if (carregando) {
    return <div className="max-w-4xl mx-auto al-card p-8 text-center text-text-secondary text-sm">Carregando o painel…</div>;
  }
  if (erro) {
    return <div className="max-w-4xl mx-auto al-card p-8 text-center text-sm text-rose-300">{erro}</div>;
  }
  if (!listas.length) {
    return (
      <div className="max-w-4xl mx-auto al-card p-8 text-center">
        <p className="text-[32px] mb-2">📊</p>
        <p className="text-sm text-white font-bold">Nenhuma lista de ligação ainda.</p>
        <p className="text-[12.5px] text-text-secondary mt-1 max-w-[46ch] mx-auto">
          Assim que a primeira lista entrar, aqui aparece quanto a casa tem, quanto ainda não recebeu
          ligação e como isso se divide entre os corretores.
        </p>
        <button onClick={() => irPara('importar')}
          className="mt-4 px-4 py-2 rounded-xl text-[12.5px] font-bold bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white">
          📥 Importar a primeira lista
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3">

      {/* ═══ 1 · O QUE PRECISA DE VOCÊ ═══ */}
      {alertas.length > 0 && (
        <div className="al-card p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-2.5">
            O que precisa de você
          </p>
          <div className="space-y-1.5">
            {alertas.map((a, i) => (
              <div key={i} className={`flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 border ${a.grave
                ? 'border-rose-500/30 bg-rose-500/[0.08]' : 'border-amber-500/20 bg-amber-500/[0.05]'}`}>
                <p className={`text-[12px] font-bold flex-1 min-w-[220px] ${a.grave ? 'text-rose-200' : 'text-amber-200'}`}>
                  {a.grave ? '🚨' : '⚠'} {a.texto}
                </p>
                <button
                  onClick={() => irPara(a.tipo === 'sobrando' ? 'redistribuir' : a.tipo === 'fantasma' ? 'transferir' : 'listas')}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-white/15 bg-white/[0.05] text-white/85 hover:bg-white/[0.1] transition-colors">
                  {a.tipo === 'sobrando' ? 'redistribuir →' : a.tipo === 'fantasma' ? 'transferir carteira →' : a.tipo === 'semLista' ? 'importar lista →' : 'ver a lista →'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 2 · A ESCALA ═══ */}
      <div className="al-card relative overflow-hidden p-4">
        <div className="absolute inset-x-0 top-0 gx-line" />
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-2.5">
          A casa inteira · {listas.length} lista{listas.length === 1 ? '' : 's'} de ligação
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Numero n={casa.intocados} rot="nunca receberam uma ligação"
            cor={casa.intocados > 0 ? 'text-rose-300' : 'text-emerald-300'} alerta={casa.intocados > 0} />
          <Numero n={casa.emAndamento} rot="em andamento, já chamados" />
          <Numero n={casa.noCrm} rot={`viraram lead (${casa.aproveitamento}% do total)`} cor="text-emerald-300" />
          <Numero n={sobra.total} rot="esperando você redistribuir" cor={sobra.total > 0 ? 'text-[#FFE9A6]' : undefined} />
        </div>
        <p className="text-[11px] text-text-secondary mt-2.5 pt-2.5 border-t border-white/[0.06]">
          <b className="text-white tabular-nums">{casa.total}</b> contatos importados ao todo ·
          {' '}<b className="text-white tabular-nums">{casa.chamadas}</b> chamadas feitas ·
          {' '}dos que sobram, <b className="text-white tabular-nums">{sobra.frios}</b> são de lista fria
          {' '}e <b className="text-white tabular-nums">{sobra.doCrm}</b> {sobra.doCrm === 1 ? 'é lead' : 'são leads'} do CRM.
        </p>
      </div>

      {/* ═══ 3 · A DIVISÃO ═══ */}
      <div className="al-card overflow-hidden">
        <p className="px-4 pt-4 pb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
          Como se divide entre os corretores
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse min-w-[640px]">
            <thead>
              <tr>
                {['Corretor', 'Listas', 'Contatos', 'Sem ligação', 'Viraram lead', 'Sobrando', 'Último toque'].map((h, k) => (
                  <th key={h} className={`text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-text-secondary border-b border-white/15 px-3 py-1.5 whitespace-nowrap ${k === 0 ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fatias.map((f) => {
                const r = f.resumo;
                const semNada = r.total === 0;
                return (
                  <tr key={f.corretorId || 'sem-dono'} className={f.fantasma ? 'bg-rose-500/[0.05]' : undefined}>
                    <td className="px-3 py-2 border-b border-white/[0.06]">
                      <span className={`font-bold ${f.fantasma ? 'text-rose-300' : semNada ? 'text-text-secondary' : 'text-white'}`}>{f.nome}</span>
                      {f.fantasma && <span className="ml-1.5 text-[10px] text-rose-300/70">saiu da equipe</span>}
                    </td>
                    <td className="px-3 py-2 border-b border-white/[0.06] text-right tabular-nums text-text-secondary">{f.listas || '—'}</td>
                    <td className="px-3 py-2 border-b border-white/[0.06] text-right tabular-nums text-white">{r.total || '—'}</td>
                    <td className={`px-3 py-2 border-b border-white/[0.06] text-right tabular-nums font-bold ${r.intocados > 0 ? 'text-rose-300' : 'text-text-secondary'}`}>
                      {r.intocados || '—'}
                    </td>
                    <td className="px-3 py-2 border-b border-white/[0.06] text-right tabular-nums">
                      {r.noCrm > 0
                        ? <span className="text-emerald-300 font-bold">{r.noCrm} <span className="opacity-60 font-normal">· {r.aproveitamento}%</span></span>
                        : <span className="text-text-secondary">—</span>}
                    </td>
                    <td className={`px-3 py-2 border-b border-white/[0.06] text-right tabular-nums ${f.noBolsao > 0 ? 'text-[#FFE9A6]' : 'text-text-secondary'}`}>
                      {f.noBolsao || '—'}
                    </td>
                    <td className="px-3 py-2 border-b border-white/[0.06] text-right tabular-nums whitespace-nowrap">
                      {semNada
                        ? <span className="text-text-secondary">sem lista</span>
                        : f.paradoHa === null
                          ? <span className="text-rose-300 font-bold">nunca ligou</span>
                          : <span className={f.paradoHa >= 7 ? 'text-amber-300' : 'text-text-secondary'}>
                              {f.paradoHa === 0 ? 'hoje' : `há ${f.paradoHa}d`}
                            </span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-white/[0.06]">
          <button onClick={() => irPara('listas')}
            className="px-3 py-1.5 rounded-xl text-[11.5px] font-bold border border-white/12 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors">
            📋 abrir lista por lista
          </button>
          {sobra.total > 0 && (
            <button onClick={() => irPara('redistribuir')}
              className="px-3 py-1.5 rounded-xl text-[11.5px] font-bold border border-[#E8C547]/40 bg-[#E8C547]/10 text-[#FFE9A6] hover:bg-[#E8C547]/20 transition-colors">
              ♻️ redistribuir os {sobra.total} que sobraram
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
