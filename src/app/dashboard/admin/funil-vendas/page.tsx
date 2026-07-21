"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/toast';
import LoadingState from '@/components/ui/LoadingState';
import { getDemoLeads } from '@/lib/espelho/demoData';
import {
  ETAPA_BOLSAO,
  ETAPA_DESCARTADO,
  ETAPA_FECHADO,
  ETAPAS_CIRCUITO,
  ETAPAS_TODAS,
  CADENCIAS_PADRAO,
  MOTIVOS_DESCARTE,
  carregarCadencias,
  mapEtapaCircuito,
  normalizarCadencias,
  salvarCadencias,
  type CadenciasFunil,
} from '@/lib/circuito';

// ---------------------------------------------------------------------------
// O circuito (visual) — etapas ativas, cores e descrições
// ---------------------------------------------------------------------------
/** Paleta do funil por posição (Entrada → Negociação). */
const FUNIL_PALETA = ['#FFE9A6', '#E8C547', '#D4A017', '#F59E0B', '#FF7A45', '#34D399'];

/** Etapas ativas do quadro (Bolsão já não faz parte do circuito). */
const ETAPAS_ATIVAS = ETAPAS_CIRCUITO;

const DESCRICAO_ETAPA: Record<string, string> = {
  'Entrada': 'lead novo — ligar agora',
  'Follow-up': 'próximo contato combinado',
  'Meet': 'reunião marcada',
  'Visita': 'visita marcada',
  'Negociação': 'proposta na mesa',
  'Fechamento': 'venda concluída 🏆 — lançar em Comissões',
};

const setEtapasValidas = new Set<string>(ETAPAS_TODAS);

// ---------------------------------------------------------------------------
// Cadências — campos, rótulos e limites (limites iguais aos de normalizarCadencias)
// ---------------------------------------------------------------------------
interface CampoCadencia {
  key: keyof CadenciasFunil;
  titulo: string;
  unidade: string;
  ajuda: string;
  min: number;
  max: number;
}

const CAMPOS_CADENCIA: CampoCadencia[] = [
  {
    key: 'naoAtendeuHoras',
    titulo: 'Cliente não atendeu → quando tentar de novo',
    unidade: 'horas',
    ajuda: 'O corretor ligou e ninguém atendeu? O pop-up já vem com a próxima tentativa sugerida pra daqui a X horas. Exemplo com 24: ligou hoje às 10h sem resposta → o sistema propõe tentar amanhã às 10h (o corretor pode mudar o horário).',
    min: 1,
    max: 240,
  },
  {
    key: 'perguntarMeetHoras',
    titulo: 'Cobrar o resultado do meet',
    unidade: 'horas depois',
    ajuda: 'Passou o horário do meet + X horas → o sistema abre o pop-up perguntando "aconteceu?". Exemplo com 1: meet marcado pras 15h → às 16h o corretor é cobrado pela resposta (aconteceu / não rolou). Com 0, cobra na hora exata.',
    min: 0,
    max: 72,
  },
  {
    key: 'perguntarVisitaHoras',
    titulo: 'Cobrar o resultado da visita',
    unidade: 'horas depois',
    ajuda: 'Igual ao meet, mas pra visita: X horas depois do horário marcado, o pop-up cobra "a visita aconteceu?". Exemplo com 1: visita às 14h → cobrança às 15h.',
    min: 0,
    max: 72,
  },
  {
    key: 'negociacaoAlertaDias',
    titulo: 'Negociação parada — alerta',
    unidade: 'dias',
    ajuda: 'Proposta na mesa sem NENHUM movimento por X dias → o lead aparece como "parado em negociação" (relatórios e cobrança do corretor). Exemplo com 5: proposta apresentada segunda, nada até sábado → alerta aceso.',
    min: 1,
    max: 90,
  },
  {
    key: 'tentativasAteDescarte',
    titulo: 'Insistir quantas vezes antes de sugerir descarte',
    unidade: 'tentativas',
    ajuda: 'É o tamanho do rodízio de insistência: a cada "não atendeu" conta 1 tentativa. Na tentativa X sem resposta, o pop-up passa a sugerir o descarte (o corretor ainda pode insistir; descartou → o lead cai no bolsão do administrador). Exemplo com 5: sugere descarte na 5ª ligação sem resposta.',
    min: 2,
    max: 30,
  },
];

type CadenciasStr = Record<keyof CadenciasFunil, string>;

const cadToStr = (c: CadenciasFunil): CadenciasStr => ({
  naoAtendeuHoras: String(c.naoAtendeuHoras),
  perguntarMeetHoras: String(c.perguntarMeetHoras),
  perguntarVisitaHoras: String(c.perguntarVisitaHoras),
  negociacaoAlertaDias: String(c.negociacaoAlertaDias),
  tentativasAteDescarte: String(c.tentativasAteDescarte),
});

// ---------------------------------------------------------------------------
// Modo Espelho — leads demo (circuito) + alguns em etapas legadas pra mostrar a migração
// ---------------------------------------------------------------------------
interface LeadEtapa {
  id: string;
  etapa: string;
}

const buildDemoLeadsEtapa = (): LeadEtapa[] => {
  const doCircuito: LeadEtapa[] = getDemoLeads().map((l) => ({ id: l.id, etapa: l.etapa }));
  const legadas = [
    ...Array(6).fill('Qualificado'),
    ...Array(4).fill('Apresentação do imóvel'),
    ...Array(3).fill('Pré Qualificação'),
    ...Array(2).fill('Pós Venda'),
  ] as string[];
  const legados: LeadEtapa[] = legadas.map((etapa, i) => ({ id: `demo-legado-${i + 1}`, etapa }));
  return [...doCircuito, ...legados];
};

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function FunilCadenciasPage() {
  const { userData, loading: authLoading, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  // Leads (uma varredura serve pro circuito e pra migração)
  const [leads, setLeads] = useState<LeadEtapa[]>([]);
  const [leadsCarregados, setLeadsCarregados] = useState(false);

  // Cadências
  const [cadStr, setCadStr] = useState<CadenciasStr>(cadToStr(CADENCIAS_PADRAO));
  const [cadSalva, setCadSalva] = useState<CadenciasFunil>(CADENCIAS_PADRAO);
  const [cadCarregada, setCadCarregada] = useState(false);
  const [salvandoCad, setSalvandoCad] = useState(false);

  // Migração
  const [migrando, setMigrando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  // ------------------------------------------------------------------
  // Varredura dos leads da imobiliária (agrupamento no cliente)
  // ------------------------------------------------------------------
  const scanLeads = useCallback(async () => {
    if (isEspelhoDemo) {
      setLeads(buildDemoLeadsEtapa());
      setLeadsCarregados(true);
      return;
    }
    if (!imobiliariaId) return;
    try {
      const snap = await getDocs(query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId)));
      setLeads(snap.docs.map((d) => ({ id: d.id, etapa: (d.data().etapa as string) || '' })));
    } catch (e) {
      console.error('Erro ao varrer leads do funil:', e);
      showToast('Não foi possível carregar os leads — recarregue a página.', 'error');
    } finally {
      setLeadsCarregados(true);
    }
  }, [imobiliariaId, isEspelhoDemo]);

  useEffect(() => {
    scanLeads();
  }, [scanLeads]);

  // ------------------------------------------------------------------
  // Cadências: carregar (no Espelho resolve o padrão)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!imobiliariaId && !isEspelhoDemo) return;
    let ativo = true;
    carregarCadencias(isEspelhoDemo ? 'espelho-demo' : imobiliariaId).then((c) => {
      if (!ativo) return;
      setCadSalva(c);
      setCadStr(cadToStr(c));
      setCadCarregada(true);
    });
    return () => { ativo = false; };
  }, [imobiliariaId, isEspelhoDemo]);

  const guardaDemo = (): boolean => {
    if (isEspelhoDemo) {
      showToast('Modo demonstração: as alterações não são salvas.', 'info');
      return true;
    }
    return false;
  };

  const cadenciasSujas = useMemo(
    () => CAMPOS_CADENCIA.some((c) => cadStr[c.key].trim() !== String(cadSalva[c.key])),
    [cadStr, cadSalva]
  );

  const handleSalvarCadencias = async () => {
    if (guardaDemo()) return;
    if (!imobiliariaId) return;
    const proximas = normalizarCadencias({
      naoAtendeuHoras: Number(cadStr.naoAtendeuHoras),
      perguntarMeetHoras: Number(cadStr.perguntarMeetHoras),
      perguntarVisitaHoras: Number(cadStr.perguntarVisitaHoras),
      negociacaoAlertaDias: Number(cadStr.negociacaoAlertaDias),
      tentativasAteDescarte: Number(cadStr.tentativasAteDescarte),
    });
    setSalvandoCad(true);
    try {
      await salvarCadencias(imobiliariaId, proximas);
      setCadSalva(proximas);
      setCadStr(cadToStr(proximas));
      showToast('Cadências salvas — já valem no circuito de todos os corretores.', 'success');
    } catch (e) {
      console.error('Erro ao salvar cadências:', e);
      showToast('Não foi possível salvar — tente de novo.', 'error');
    } finally {
      setSalvandoCad(false);
    }
  };

  const handleRestaurarPadrao = () => {
    setCadStr(cadToStr(CADENCIAS_PADRAO));
  };

  // ------------------------------------------------------------------
  // Contagens por etapa do circuito (tudo agrupado via mapEtapaCircuito)
  // ------------------------------------------------------------------
  const contagemPorEtapa = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const alvo = mapEtapaCircuito(l.etapa);
      counts[alvo] = (counts[alvo] || 0) + 1;
    });
    return counts;
  }, [leads]);

  // ------------------------------------------------------------------
  // Migração: leads em etapas fora do circuito
  // ------------------------------------------------------------------
  const legados = useMemo(() => leads.filter((l) => !setEtapasValidas.has(l.etapa)), [leads]);

  const previewMigracao = useMemo(() => {
    const grupos = new Map<string, { de: string; para: string; total: number }>();
    legados.forEach((l) => {
      const cur = grupos.get(l.etapa) || { de: l.etapa, para: mapEtapaCircuito(l.etapa), total: 0 };
      cur.total += 1;
      grupos.set(l.etapa, cur);
    });
    return Array.from(grupos.values()).sort((a, b) => b.total - a.total);
  }, [legados]);

  const handleMigrar = async () => {
    if (guardaDemo()) return;
    if (!imobiliariaId || legados.length === 0) return;
    const ok = await confirmDialog({
      title: 'Migrar leads para o circuito',
      message: `${legados.length} lead${legados.length !== 1 ? 's' : ''} em etapas antigas serão movidos para as etapas do circuito, conforme a tabela. Essa ação atualiza os leads de todos os corretores e não desfaz sozinha.`,
      confirmLabel: 'Migrar agora',
    });
    if (!ok) return;
    setMigrando(true);
    setProgresso(0);
    try {
      for (let i = 0; i < legados.length; i += 400) {
        const fatia = legados.slice(i, i + 400);
        const batch = writeBatch(db);
        fatia.forEach((l) => {
          batch.update(doc(db, 'leads', l.id), { etapa: mapEtapaCircuito(l.etapa) });
        });
        await batch.commit();
        setProgresso(Math.min(i + fatia.length, legados.length));
      }
      showToast(`${legados.length} lead${legados.length !== 1 ? 's' : ''} migrados para o circuito.`, 'success');
      await scanLeads();
    } catch (e) {
      console.error('Erro ao migrar leads:', e);
      showToast('A migração falhou no meio — recarregue e rode de novo (o que já migrou fica migrado).', 'error');
      await scanLeads();
    } finally {
      setMigrando(false);
      setProgresso(0);
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const carregando = !leadsCarregados || !cadCarregada;
  const inputCls = 'bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50';
  const chipBase = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border';

  if (!authLoading && !imobiliariaId && !isEspelhoDemo) {
    return (
      <div className="max-w-4xl mx-auto mt-6 px-1">
        <p className="text-text-secondary">Acesso restrito à imobiliária.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-6 space-y-4 pb-10 px-1">
      {/* 1. Header */}
      <div>
        <span className="gx-tag"><span>Área do administrador</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-2">Funil &amp; Cadências</h1>
        <p className="text-[12px] text-text-secondary mt-1">
          O circuito do lead é fixo — todo lead percorre as mesmas etapas, do primeiro contato ao fechamento.
          O que você configura aqui são as <b className="text-white">cadências</b>: os temporizadores que guiam o
          corretor em cada etapa (quando cobrar o próximo contato, quando perguntar do meet e da visita, quando acender o alerta).
        </p>
      </div>

      {carregando ? (
        <div className="al-card p-6">
          <LoadingState label="Carregando funil..." />
        </div>
      ) : (
        <>
          {/* 2. O circuito */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">O circuito do lead</h2>
              <span className="ml-auto text-[11px] text-text-secondary tabular-nums">{leads.length} lead{leads.length !== 1 ? 's' : ''} na imobiliária</span>
            </div>
            <p className="text-[10.5px] text-text-secondary mb-3">
              Etapas fixas, iguais pra toda a equipe — o lead anda pra frente até o Fechamento (venda). Descartados e estacionados caem no bolsão da área do admin, em Importar Leads.
            </p>

            {/* Fluxo das 5 etapas ativas */}
            <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
              {ETAPAS_ATIVAS.map((etapa, i) => {
                const cor = FUNIL_PALETA[i];
                const n = contagemPorEtapa[etapa] || 0;
                return (
                  <React.Fragment key={etapa}>
                    {i > 0 && (
                      <div className="self-center shrink-0 text-white/25 text-[14px] px-0.5" aria-hidden>→</div>
                    )}
                    <div
                      className="flex-1 min-w-[128px] rounded-xl border p-3"
                      style={{ borderColor: `${cor}59`, background: `${cor}0d` }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: cor, boxShadow: `0 0 6px ${cor}99` }} />
                        <span className="al-display text-[12px] font-bold uppercase tracking-wider truncate" style={{ color: cor }}>{etapa}</span>
                      </div>
                      <p className="text-[10px] text-text-secondary mt-1 leading-snug">{DESCRICAO_ETAPA[etapa]}</p>
                      <p className="mt-2 text-white">
                        <span className="al-display text-[18px] font-bold tabular-nums">{n}</span>
                        <span className="text-[10px] text-text-secondary ml-1">lead{n !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Bolsão + terminais */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`${chipBase} bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]`} title="Leads estacionados (Bolsão antigo) — aparecem no bolsão do admin, em Importar Leads, prontos pra redistribuir.">
                📦 {ETAPA_BOLSAO}
                <span className="tabular-nums">{contagemPorEtapa[ETAPA_BOLSAO] || 0}</span>
                <span className="font-medium normal-case tracking-normal text-[#7DD3FC]/80">no bolsão do admin</span>
              </span>
              <span
                className={`${chipBase} bg-white/[0.05] border-white/15 text-text-secondary`}
                title={`Motivos de descarte: ${MOTIVOS_DESCARTE.join(', ')}`}
              >
                {ETAPA_DESCARTADO}
                <span className="tabular-nums">{contagemPorEtapa[ETAPA_DESCARTADO] || 0}</span>
              </span>
            </div>
            <p className="text-[10px] text-text-secondary mt-2">
              Motivos de descarte: {MOTIVOS_DESCARTE.join(' · ')}.
            </p>
          </div>

          {/* 3. Cadências */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em] mb-1">Cadências — os relógios do circuito</h2>
            <p className="text-[10.5px] text-text-secondary mb-3">
              São esses tempos que decidem <b className="text-white">quando o sistema cobra o corretor</b>: o pop-up abre sozinho
              no momento certo, sem ninguém precisar lembrar de nada. Mexeu e salvou → vale pra equipe inteira na hora.
              O número entre parênteses é o padrão sugerido.
            </p>
            <div className="space-y-2.5">
              {CAMPOS_CADENCIA.map((campo) => (
                <div key={campo.key} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2.5 bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-[12.5px] font-bold text-white">{campo.titulo}</p>
                    <p className="text-[10.5px] text-text-secondary leading-snug mt-0.5">{campo.ajuda}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={campo.min}
                      max={campo.max}
                      inputMode="numeric"
                      value={cadStr[campo.key]}
                      onChange={(e) => setCadStr((prev) => ({ ...prev, [campo.key]: e.target.value }))}
                      placeholder={String(CADENCIAS_PADRAO[campo.key])}
                      aria-label={campo.titulo}
                      className={`${inputCls} w-24 text-center al-display tabular-nums`}
                    />
                    <span className="text-[11px] text-text-secondary w-24">
                      {campo.unidade} <span className="text-white/30 tabular-nums">({CADENCIAS_PADRAO[campo.key]})</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleSalvarCadencias}
                disabled={salvandoCad || !cadenciasSujas}
                className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-4 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {salvandoCad ? 'Salvando...' : 'Salvar cadências'}
              </button>
              <button
                type="button"
                onClick={handleRestaurarPadrao}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white font-bold transition-colors"
              >
                Restaurar padrão
              </button>
              {cadenciasSujas && <span className="text-[11px] font-bold text-[#FFE9A6]">alterações não salvas</span>}
            </div>
          </div>

          {/* 4. Migração */}
          <div className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line" />
            <h2 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em] mb-1">Migração para o circuito</h2>
            <p className="text-[10.5px] text-text-secondary mb-3">
              Leads criados no funil antigo podem estar em etapas que não existem mais. Aqui você move todos de uma vez
              pra etapa equivalente do circuito — ferramenta de uma vez só: depois de migrar, ela fica em paz.
            </p>

            {legados.length === 0 ? (
              <div className="rounded-xl bg-[#34D399]/[0.06] border border-[#34D399]/30 px-4 py-3">
                <p className="text-[12.5px] font-bold text-emerald-300">✓ Todos os leads já estão no circuito</p>
                <p className="text-[10.5px] text-text-secondary mt-0.5">Nenhum lead em etapa antiga — nada pra migrar.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/[0.04]">
                        <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Etapa antiga</th>
                        <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Vai para</th>
                        <th className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary text-right">Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewMigracao.map((g) => (
                        <tr key={g.de || '(vazia)'} className="border-t border-white/[0.06]">
                          <td className="px-3 py-2 text-[12px] text-white">{g.de || <span className="text-text-secondary italic">(sem etapa)</span>}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-white">
                              <span className="text-white/25" aria-hidden>→</span>
                              <span className={`${chipBase} bg-[#E8C547]/10 border-[#E8C547]/40 text-[#FFE9A6]`}>{g.para}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[12px] text-white text-right tabular-nums">{g.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleMigrar}
                    disabled={migrando}
                    className="bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl px-4 py-2 shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {migrando
                      ? `Migrando... ${progresso}/${legados.length}`
                      : `Migrar ${legados.length} lead${legados.length !== 1 ? 's' : ''} para o circuito`}
                  </button>
                  {!migrando && (
                    <span className="text-[11px] text-text-secondary">a migração vale pros leads de todos os corretores</span>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
