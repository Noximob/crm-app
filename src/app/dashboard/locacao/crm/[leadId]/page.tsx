'use client';

/**
 * 👤 O LEAD, POR INTEIRO — a página de detalhe do CRM da locação.
 *
 * Segue o molde do CRM de vendas da casa, que funciona: duas colunas, e
 * cada uma com um papel.
 *
 *   ESQUERDA · O CAMINHO      quem é a pessoa, o que fazer agora, e a
 *                             LINHA DO TEMPO com tudo que já aconteceu.
 *   DIREITA  · SEMPRE À MÃO   anotações (o que mais se usa durante a
 *                             ligação), qualificação e o imóvel.
 *
 * O que este CRM NÃO herda do de vendas, de propósito: o circuito de
 * perguntas e os pop-ups. Aqui o corretor conduz — move a coluna quando
 * quer, anota o que quer.
 *
 * A linha do tempo é DERIVADA das datas que já existem no registro, então
 * ela nasce completa até nos contratos antigos: visita marcada, fiança,
 * contrato, vistoria, chave, reajustes — tudo em ordem, agrupado por dia.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import LoadingState from '@/components/ui/LoadingState';
import {
  CRM_ETAPAS, CRM_ORDEM, crmEtapaDe, STATUS_CONTATO, statusContato, MOTIVOS_PERDA,
  ETAPAS_LOCACAO, linhaDoTempo, agruparPorDia, corEvento,
  hojeYmd, ymd, fmtData, fmtValor, linkWhats, diasAte,
  type Locacao, type CrmEtapa,
} from '@/lib/locacao';
import { useDadosLocacao } from '../../dados';
import { inputCls, btnOuro, btnGhost, Campo } from '../../ui';

const CHIP_ETAPA: Record<CrmEtapa, string> = {
  entrada: 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]',
  contato: 'bg-[#E8C547]/10 border-[#E8C547]/35 text-[#FFE9A6]',
  agendamento: 'bg-[#C4A6FF]/10 border-[#C4A6FF]/35 text-[#C4A6FF]',
  negociacao: 'bg-[#34D399]/10 border-[#34D399]/35 text-[#34D399]',
};
const maisDias = (n: number) => ymd(new Date(Date.now() + n * 864e5));

const Bloco = ({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) => (
  <div className="al-card relative overflow-hidden p-4 sm:p-5">
    <div className="absolute inset-x-0 top-0 gx-line-gold" />
    <div className="flex items-center justify-between gap-3 mb-3">
      <h3 className="al-display text-[14px] font-bold text-white uppercase tracking-[0.14em]">{titulo}</h3>
      {acao}
    </div>
    {children}
  </div>
);

export default function PaginaLead() {
  const router = useRouter();
  const { leadId } = useParams<{ leadId: string }>();
  const { userData } = useAuth();
  const { isEspelhoDemo, imoveis, locacoes, carregando, recarregar } = useDadosLocacao();

  const l = locacoes.find((x) => x.id === leadId);
  const im = l ? imoveis.find((x) => x.id === l.imovelId) : undefined;
  const meuNome = userData?.nome || '';

  const [notas, setNotas] = useState('');
  const [salvandoNota, setSalvandoNota] = useState<'idle' | 'salvando' | 'salvo'>('idle');
  const [qRascunho, setQRascunho] = useState<Record<string, string> | null>(null);
  const [marcandoVisita, setMarcandoVisita] = useState(false);
  const [dataVisita, setDataVisita] = useState('');
  const [perdendo, setPerdendo] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  const up = async (campos: Partial<Locacao>) => {
    if (!l || guarda()) return;
    await updateDoc(doc(db, 'locacaoLocacoes', l.id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  const eventos = useMemo(() => (l ? agruparPorDia(linhaDoTempo(l, im)) : []), [l, im]);

  // limpa o timer do autosave se a página sair antes de disparar
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingState label="Carregando..." /></div>;
  }

  if (!l) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-md mx-auto al-card p-8 text-center">
          <p className="text-[32px] mb-2">🔍</p>
          <p className="text-[14px] font-bold text-white">Lead não encontrado.</p>
          <p className="text-[12.5px] text-text-secondary mt-1">Ele pode ter sido arquivado ou já virou cliente ativo.</p>
          <Link href="/dashboard/locacao/crm" className={btnGhost + ' inline-block mt-4'}>← voltar ao CRM</Link>
        </div>
      </div>
    );
  }

  const ce = crmEtapaDe(l);
  const st = statusContato(l);
  const naBurocracia = ETAPAS_LOCACAO[l.etapa].n >= 2;
  const zap = linkWhats(l.telefone, `Olá ${(l.nome || '').split(' ')[0]}! Aqui é ${meuNome ? meuNome.split(' ')[0] : 'da Nox Imóveis'}${im ? `, sobre o ${im.titulo}` : ''}.`);

  /** Anotação com autosave — durante a ligação ninguém clica em salvar. */
  const anotarComAtraso = (texto: string) => {
    setNotas(texto);
    setSalvandoNota('salvando');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!texto.trim()) { setSalvandoNota('idle'); return; }
      await up({ crmNotas: [...(l.crmNotas || []), { em: hojeYmd(), por: meuNome, texto: texto.trim() }] });
      setNotas('');
      setSalvandoNota('salvo');
      setTimeout(() => setSalvandoNota('idle'), 1800);
    }, 1400);
  };

  const anotarAgora = async () => {
    if (!notas.trim()) return;
    if (timer.current) clearTimeout(timer.current);
    await up({ crmNotas: [...(l.crmNotas || []), { em: hojeYmd(), por: meuNome, texto: notas.trim() }] });
    setNotas('');
    setSalvandoNota('salvo');
    setTimeout(() => setSalvandoNota('idle'), 1800);
  };

  const mover = async (para: CrmEtapa) => {
    if (ce === para) return;
    if (para === 'agendamento') { setMarcandoVisita(true); setDataVisita(l.crmVisitaEm || maisDias(2)); return; }
    await up({ crmEtapa: para });
    showToast(`${l.nome} → ${CRM_ETAPAS[para].rotulo}.`, 'success');
  };

  const fechou = async () => {
    if (!l.imovelId) { showToast('Antes de fechar, escolha por qual imóvel — é dele que sai o contrato.', 'error'); return; }
    const ok = await confirmDialog({
      title: `Fechou com ${l.nome}?`,
      message: 'O lead entra no funil burocrático do Setor de Locação (documentos → Loft → contratos → chave). O relacionamento continua aqui.',
      confirmLabel: 'Fechou — começar a papelada',
    });
    if (!ok) return;
    await up({ etapa: 'docs_inquilino', crmEtapa: 'negociacao', corretorNome: l.corretorNome || meuNome, crmProximoContato: maisDias(2) });
    showToast(`📎 ${l.nome} está no funil de Locações, em "Documentos".`, 'success');
  };

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-6xl mx-auto">

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Link href="/dashboard/locacao/crm" className={btnGhost}>← CRM</Link>
          <span className="gx-tag inline-flex"><span>Setor de Locação</span></span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ═══════ ESQUERDA · O CAMINHO ═══════ */}
          <div className="lg:col-span-7 flex flex-col gap-4">

            {/* quem é */}
            <div className="al-card relative overflow-hidden p-5">
              <div className="absolute inset-x-0 top-0 gx-line-gold" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <span className={`grid place-items-center h-12 w-12 rounded-full shrink-0 text-[18px] font-extrabold border ${CHIP_ETAPA[ce]}`}>
                  {(l.nome || '?').charAt(0).toUpperCase()}
                </span>
                <h2 className="al-display text-[21px] font-bold text-white uppercase tracking-wide leading-none">
                  {l.nome}
                  {l.temperatura === 'alta' && <span className="ml-2 text-[16px]">🔥</span>}
                </h2>
                <div className="flex flex-wrap items-center gap-2 w-full">
                  <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider border ${CHIP_ETAPA[ce]}`}>
                    {CRM_ETAPAS[ce].icone} {CRM_ETAPAS[ce].rotulo}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider border ${STATUS_CONTATO[st.tipo].chip}`}>
                    {st.tipo === 'atrasado' ? `atrasado há ${st.dias}d`
                      : st.tipo === 'hoje' ? 'falar hoje'
                        : st.tipo === 'futuro' ? `volta ${fmtData(l.crmProximoContato)}` : 'sem retorno marcado'}
                  </span>
                  {naBurocracia && (
                    <Link href={`/dashboard/locacao/locacoes/?busca=${encodeURIComponent(l.nome)}`}
                      className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider border border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]">
                      📋 {ETAPAS_LOCACAO[l.etapa].rotulo} →
                    </Link>
                  )}
                  {l.telefone && (
                    <span className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5">
                      <p className="text-[12px] text-white tabular-nums">{l.telefone}</p>
                      {zap && <a href={zap} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300">💬</a>}
                    </span>
                  )}
                  {l.origem !== 'manual' && (
                    <span className="flex items-center gap-2 bg-[#7DD3FC]/10 border border-[#7DD3FC]/35 rounded-xl px-3 py-1.5">
                      <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#7DD3FC]/70">Origem</span>
                      <p className="text-[12px] text-[#7DD3FC] font-medium">{l.origem.replace('_', ' ')}</p>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* o que fazer agora */}
            <Bloco titulo="O próximo passo">
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mr-1">mover</span>
                {CRM_ORDEM.map((k) => (
                  <button key={k} onClick={() => mover(k)} title={CRM_ETAPAS[k].ajuda}
                    className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold border transition-colors ${
                      ce === k ? CHIP_ETAPA[k] : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-white hover:bg-white/[0.07]'}`}>
                    {CRM_ETAPAS[k].icone} {CRM_ETAPAS[k].rotulo}
                  </button>
                ))}
              </div>

              {marcandoVisita && (
                <div className="flex flex-wrap items-center gap-2 mb-3 rounded-lg border border-[#C4A6FF]/30 bg-[#C4A6FF]/[0.07] px-3 py-2">
                  <span className="text-[11.5px] font-bold text-[#C4A6FF]">📅 Quando é a visita?</span>
                  <input type="date" className={inputCls + ' !w-auto'} value={dataVisita} onChange={(e) => setDataVisita(e.target.value)} />
                  <button onClick={async () => {
                    const q = dataVisita || maisDias(2);
                    await up({ crmEtapa: 'agendamento', crmVisitaEm: q, crmProximoContato: q });
                    setMarcandoVisita(false);
                    showToast(`📅 Visita marcada pra ${fmtData(q)}.`, 'success');
                  }} className={btnOuro + ' !py-1.5'}>marcar</button>
                  <button onClick={() => setMarcandoVisita(false)} className={btnGhost + ' !py-1.5'}>×</button>
                </div>
              )}

              <div className="rounded-lg border border-white/[0.06] p-3">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">
                  Falar de novo em
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <input type="date" className={inputCls + ' !w-auto'} value={l.crmProximoContato}
                    onChange={(e) => up({ crmProximoContato: e.target.value })} />
                  {([['hoje', 0], ['amanhã', 1], ['+3 dias', 3], ['+1 semana', 7]] as const).map(([rot, d]) => (
                    <button key={rot} onClick={() => up({ crmProximoContato: maisDias(d) })} className={btnGhost + ' !py-1.5 !text-[11px]'}>{rot}</button>
                  ))}
                </div>
                {l.crmVisitaEm && <p className="text-[11.5px] text-[#C4A6FF] mt-2">📅 Visita marcada pra {fmtData(l.crmVisitaEm)}</p>}
              </div>

              {perdendo ? (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.07] p-3 mt-3 space-y-2">
                  <p className="text-[11.5px] font-bold text-rose-300">Por que {l.nome} não fechou?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MOTIVOS_PERDA.map((m) => (
                      <button key={m} onClick={async () => {
                        await up({ etapa: 'perdida', motivoPerda: m });
                        showToast(`${l.nome} saiu do CRM — ${m.toLowerCase()}.`, 'info');
                        router.push('/dashboard/locacao/crm');
                      }} className={btnGhost + ' !py-1.5 !text-[11px]'}>{m}</button>
                    ))}
                    <button onClick={() => setPerdendo(false)} className={btnGhost + ' !py-1.5 !text-[11px] ml-auto'}>cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                  {!naBurocracia && <button onClick={fechou} className={btnOuro}>✓ Fechou — começar a papelada</button>}
                  {zap && <a href={zap} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-xl text-[12px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">💬 WhatsApp</a>}
                  <button onClick={() => setPerdendo(true)} className={btnGhost + ' !text-rose-300/70 ml-auto'}>✕ não fechou</button>
                </div>
              )}
            </Bloco>

            {/* ═══ A LINHA DO TEMPO — o que o CRM de vendas tem e faltava aqui ═══ */}
            <Bloco titulo="Linha do tempo">
              {eventos.length === 0 ? (
                <p className="text-[12.5px] text-text-secondary py-2">
                  Nada registrado ainda. Anote a primeira conversa ali do lado 👉
                </p>
              ) : (
                <div className="max-h-[52vh] overflow-y-auto pr-2 space-y-3">
                  {eventos.map((g, gi) => (
                    <div key={g.dia}>
                      {gi > 0 && g.gapDias >= 3 && (
                        <div className="flex items-center gap-2 my-3">
                          <span className="flex-1 border-t border-dashed border-white/10" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">
                            {g.gapDias} dias sem nada
                          </span>
                          <span className="flex-1 border-t border-dashed border-white/10" />
                        </div>
                      )}
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">{g.rotulo}</p>
                      <ul className="space-y-2">
                        {g.itens.map((e, i) => {
                          const c = corEvento(e.tipo);
                          return (
                            <li key={i} className={`flex items-start gap-3 bg-white/[0.03] border border-white/[0.08] border-l-2 ${c.borda} rounded-xl px-3 py-2.5`}>
                              <span className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${c.chip}`}>
                                {c.rotulo}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] text-white/85 whitespace-pre-wrap">{e.texto}</p>
                                {e.por && <p className="mt-1 text-[10px] text-white/35">por {e.por.split(' ')[0]}</p>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Bloco>
          </div>

          {/* ═══════ DIREITA · SEMPRE À MÃO ═══════ */}
          <div className="lg:col-span-5 flex flex-col gap-4 lg:sticky lg:top-4">

            {/* anotar é o gesto mais repetido — vem primeiro, e salva sozinho */}
            <Bloco titulo="Anotar"
              acao={
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-opacity ${
                  salvandoNota === 'idle' ? 'opacity-0' : 'opacity-100'
                } ${salvandoNota === 'salvo' ? 'text-emerald-300' : 'text-text-secondary'}`}>
                  {salvandoNota === 'salvando' ? 'salvando…' : 'salvo ✓'}
                </span>
              }>
              <textarea
                className={inputCls + ' min-h-[90px]'}
                value={notas}
                onChange={(e) => anotarComAtraso(e.target.value)}
                placeholder="O que aconteceu na conversa? Ex.: visitou sábado, gostou mas achou caro — pediu pra ver algo até R$ 1.800."
              />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={anotarAgora} disabled={!notas.trim()} className={btnOuro + ' !py-1.5'}>Anotar</button>
                <span className="text-[10.5px] text-text-secondary">salva sozinho — some daqui e aparece na linha do tempo</span>
              </div>
            </Bloco>

            {/* o imóvel */}
            <Bloco titulo="O imóvel">
              {im ? (
                <div className="flex gap-3">
                  {im.fotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={im.fotos[0]} alt={im.titulo} className="h-[68px] w-[100px] rounded-xl object-cover border border-white/10 shrink-0" />
                  ) : (
                    <div className="h-[68px] w-[100px] rounded-xl border border-dashed border-white/15 grid place-items-center shrink-0"><span className="text-[22px] opacity-40">🏠</span></div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{im.codigo} · {im.titulo}</p>
                    <p className="text-[11.5px] text-text-secondary">{im.bairro} · {fmtValor(im.aluguel)}/mês</p>
                    <p className="text-[11.5px] text-text-secondary">
                      {[im.quartos ? `${im.quartos} quartos` : null, im.vagas ? `${im.vagas} vagas` : null, im.areaPrivativa ? `${im.areaPrivativa} m²` : null].filter(Boolean).join(' · ')}
                    </p>
                    {im.etapa !== 'publicado' && <p className="text-[11px] text-amber-300 mt-0.5">⚠ não está no ar</p>}
                  </div>
                </div>
              ) : (
                <p className="text-[12.5px] text-white/60 italic">
                  Ainda não escolheu. Procura: <b className="text-white/85">{l.qProcura || '(a descobrir)'}</b>
                </p>
              )}
              <select className={inputCls + ' mt-3'} value={l.imovelId}
                onChange={async (e) => {
                  const novo = imoveis.find((x) => x.id === e.target.value);
                  if (!e.target.value) { await up({ imovelId: '' }); return; }
                  if (!novo) return;
                  await up({
                    imovelId: novo.id, valorAluguel: novo.aluguel, valorCondominio: novo.condominio,
                    valorIptuMensal: novo.iptuMensal, valorSeguroIncendio: novo.seguroIncendio,
                    taxaAdmPct: novo.taxaAdmPct,
                    crmNotas: [...(l.crmNotas || []), { em: hojeYmd(), por: meuNome, texto: `Passou a se interessar pelo ${novo.codigo} — ${novo.titulo}.` }],
                  });
                  showToast(`Agora interessado no ${novo.codigo}.`, 'success');
                }}>
                <option value="">ainda não definiu</option>
                {imoveis.filter((x) => ['publicado', 'material', 'adm_assinada'].includes(x.etapa) || x.id === l.imovelId).map((x) => (
                  <option key={x.id} value={x.id}>{x.codigo} · {x.titulo} · {fmtValor(x.aluguel)}</option>
                ))}
              </select>
            </Bloco>

            {/* qualificação */}
            <Bloco titulo="Qualificação"
              acao={qRascunho ? (
                <span className="flex gap-1.5">
                  <button onClick={async () => { await up(qRascunho as Partial<Locacao>); setQRascunho(null); showToast('Salvo.', 'success'); }}
                    className={btnOuro + ' !py-1 !text-[11px]'}>salvar</button>
                  <button onClick={() => setQRascunho(null)} className={btnGhost + ' !py-1 !text-[11px]'}>×</button>
                </span>
              ) : undefined}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['qParaQuando', 'Pra quando precisa', 'ex.: em até 30 dias', ''],
                  ['qPessoas', 'Quem vai morar', 'ex.: casal + 1 filho', ''],
                  ['qPet', 'Tem pet?', 'ex.: 1 gato', ''],
                  ['qRenda', 'Renda aproximada', 'ex.: uns R$ 7.000', ''],
                  ['qProcura', 'O que procura', 'ex.: 2 quartos, com vaga', 'sm:col-span-2'],
                ] as const).map(([campo, rot, ph, larg]) => (
                  <Campo key={campo} rot={rot} largura={larg}>
                    <input className={inputCls} placeholder={ph}
                      value={(qRascunho?.[campo] ?? l[campo]) || ''}
                      onChange={(e) => setQRascunho((p) => ({ ...(p || {}), [campo]: e.target.value }))} />
                  </Campo>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Campo rot="Temperatura">
                  <select className={inputCls} value={l.temperatura}
                    onChange={(e) => up({ temperatura: e.target.value as Locacao['temperatura'] })}>
                    <option value="">não avaliada</option>
                    <option value="alta">🔥 quente</option>
                    <option value="media">🌤 morna</option>
                    <option value="baixa">❄ fria</option>
                  </select>
                </Campo>
                <Campo rot="Corretor">
                  <input className={inputCls} value={l.corretorNome}
                    onChange={(e) => up({ corretorNome: e.target.value })} placeholder="quem atende" />
                </Campo>
              </div>
              {l.mensagem && (
                <p className="text-[12px] text-white/70 italic mt-3 pt-3 border-t border-white/[0.06]">
                  Mensagem do portal: &ldquo;{l.mensagem}&rdquo;
                </p>
              )}
            </Bloco>
          </div>
        </div>
      </div>
    </div>
  );
}
