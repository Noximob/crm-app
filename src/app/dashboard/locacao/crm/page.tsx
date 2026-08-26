'use client';

/**
 * 👥 O CRM DA LOCAÇÃO — o relacionamento com o lead do aluguel.
 *
 * O MESMO registro do Setor de Locação, visto pela lente do corretor. O
 * funil burocrático (documentos → Loft → contratos → chave) é processo e
 * anda por regra; ESTE funil é conversa e anda na mão:
 *
 *   Entrada → Em contato → Agendamento → Negociação → Alugado
 *
 * Diferente do CRM de vendas, aqui não tem circuito nem perguntas guiadas —
 * o corretor move o lead livremente entre as etapas, anota o que quiser e
 * preenche uma qualificação curta de aluguel. O que é do sistema:
 *
 *   · lead novo (portal ou à mão) nasce em "Entrada";
 *   · o botão "✓ Fechou" manda o registro pro funil burocrático — o
 *     relacionamento continua aqui enquanto a papelada corre lá;
 *   · quando a chave é entregue, o CRM vira "Alugado" sozinho.
 *
 * O layout respeita o CRM de vendas: card com linha neon, busca, chips de
 * filtro e tabela de cabeçalho fixo — só que o detalhe abre EMBAIXO da
 * linha, como em toda a área de locação.
 */
import React, { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import LoadingState from '@/components/ui/LoadingState';
import {
  CRM_ETAPAS, CRM_ORDEM, ETAPAS_LOCACAO, LOCACAO_VAZIA,
  hojeYmd, fmtData, fmtValor, linkWhats,
  type Locacao, type CrmEtapa, type ImovelLocacao,
} from '@/lib/locacao';
import { useDadosLocacao } from '../dados';
import { inputCls, btnOuro, btnGhost, btnSimula, SeloSimulacao, AbasDaArea, Campo } from '../ui';

const WhatsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#25D366" />
    <path d="M23.5 20.5c-.3-.2-1.7-.8-2-1s-.5-.2-.7.1c-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.2-.4-2.3-1.3-.8-.7-1.3-1.5-1.5-1.8-.2-.3 0-.5.1-.7.1-.1.2-.3.3-.5.1-.2.1-.4 0-.6-.1-.2-.7-1.7-1-2.3-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.2.2-.7.7-.7 1.7 0 1 .7 2 1.1 2.5.4.5 1.5 2 3.6 2.7 2.1.7 2.1.5 2.5.5.4 0 1.2-.5 1.4-1 .2-.5.2-.9.1-1.1z" fill="#fff" />
  </svg>
);

/** A cor de cada coluna do funil — a mesma linguagem de chips da casa. */
const CHIP_ETAPA: Record<CrmEtapa, string> = {
  entrada: 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]',
  contato: 'bg-[#E8C547]/10 border-[#E8C547]/35 text-[#FFE9A6]',
  agendamento: 'bg-[#C4A6FF]/10 border-[#C4A6FF]/35 text-[#C4A6FF]',
  negociacao: 'bg-[#FF7A97]/10 border-[#FF7A97]/35 text-[#FF9EB5]',
  alugado: 'bg-[#34D399]/10 border-[#34D399]/35 text-[#34D399]',
};

function CrmLocacao() {
  const router = useRouter();
  const params = useSearchParams();
  const { userData } = useAuth();
  const {
    imobiliariaId, isEspelhoDemo, imoveis, locacoes, carregando, recarregar, abas,
  } = useDadosLocacao();

  const [busca, setBusca] = useState(params.get('imovel') || '');
  const [etapaSel, setEtapaSel] = useState<CrmEtapa | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [novo, setNovo] = useState<{ imovelId: string } | null>(
    params.get('novo') ? { imovelId: params.get('novo') as string } : null,
  );
  const [nNome, setNNome] = useState('');
  const [nTel, setNTel] = useState('');
  const [nOrigem, setNOrigem] = useState('manual');
  const [notaTexto, setNotaTexto] = useState('');
  const [qRascunho, setQRascunho] = useState<Record<string, string> | null>(null);

  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };
  const imovelDe = (id: string) => imoveis.find((i) => i.id === id);
  const meuNome = userData?.nome || '';

  const up = async (id: string, campos: Partial<Locacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoLocacoes', id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  // ——— o universo do CRM: todo lead vivo (a burocracia não tira ele daqui) ———
  const leads = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const bDig = busca.replace(/\D/g, '');
    return locacoes
      .filter((l) => l.etapa !== 'encerrada' && l.etapa !== 'perdida')
      .filter((l) => {
        if (!b) return true;
        const im = imovelDe(l.imovelId);
        return l.nome.toLowerCase().includes(b)
          || (bDig.length >= 3 && (l.telefone || '').replace(/\D/g, '').includes(bDig))
          || (im ? `${im.codigo} ${im.titulo}`.toLowerCase().includes(b) : false);
      })
      .filter((l) => !etapaSel || (l.crmEtapa || 'entrada') === etapaSel)
      .sort((a, b2) => (CRM_ETAPAS[a.crmEtapa || 'entrada']?.n ?? 9) - (CRM_ETAPAS[b2.crmEtapa || 'entrada']?.n ?? 9));
  }, [locacoes, busca, etapaSel, imoveis]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of locacoes) {
      if (l.etapa === 'encerrada' || l.etapa === 'perdida') continue;
      const k = l.crmEtapa || 'entrada';
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [locacoes]);

  // ——— as ações ———

  const mover = async (l: Locacao, para: CrmEtapa) => {
    if ((l.crmEtapa || 'entrada') === para) return;
    await up(l.id, { crmEtapa: para });
    showToast(`${l.nome} → ${CRM_ETAPAS[para].rotulo}.`, 'success');
  };

  const criarLead = async () => {
    if (guarda() || !imobiliariaId || !novo) return;
    if (!nNome.trim()) { showToast('Falta o nome.', 'error'); return; }
    const im = imoveis.find((x) => x.id === novo.imovelId);
    if (!im) { showToast('Escolha o imóvel do interesse.', 'error'); return; }
    await addDoc(collection(db, 'locacaoLocacoes'), {
      ...LOCACAO_VAZIA, imobiliariaId, imovelId: im.id,
      nome: nNome.trim(), telefone: nTel.trim(), origem: nOrigem,
      corretorNome: meuNome, crmEtapa: 'entrada',
      valorAluguel: im.aluguel, valorCondominio: im.condominio,
      valorIptuMensal: im.iptuMensal, valorSeguroIncendio: im.seguroIncendio,
      taxaAdmPct: im.taxaAdmPct, criadoEm: serverTimestamp(),
    });
    setNovo(null); setNNome(''); setNTel(''); setNOrigem('manual');
    showToast('Lead na Entrada.', 'success');
    recarregar();
  };

  const leadDoPortal = async () => {
    if (guarda() || !imobiliariaId) return;
    const pub = imoveis.filter((i) => i.etapa === 'publicado');
    if (!pub.length) { showToast('Nenhum imóvel no ar — o lead vem de um anúncio.', 'error'); return; }
    const im = pub[Math.floor(Math.random() * pub.length)];
    const nomes = ['Marcos Vieira', 'Camila Duarte', 'Otávio Luz', 'Beatriz Souza', 'Tiago Melo'];
    await addDoc(collection(db, 'locacaoLocacoes'), {
      ...LOCACAO_VAZIA, imobiliariaId, imovelId: im.id,
      nome: nomes[Math.floor(Math.random() * nomes.length)],
      telefone: `(47) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      origem: 'grupo_olx', temperatura: (['alta', 'media', 'baixa'] as const)[Math.floor(Math.random() * 3)],
      mensagem: 'Vi o anúncio no ZAP e tenho interesse. Ainda está disponível?',
      crmEtapa: 'entrada',
      valorAluguel: im.aluguel, valorCondominio: im.condominio,
      valorIptuMensal: im.iptuMensal, valorSeguroIncendio: im.seguroIncendio,
      taxaAdmPct: im.taxaAdmPct, criadoEm: serverTimestamp(),
    });
    showToast(`⚡ Lead novo do portal, interessado no ${im.codigo} — está na Entrada.`, 'success');
    recarregar();
  };

  const anotar = async (l: Locacao) => {
    const texto = notaTexto.trim();
    if (!texto) return;
    await up(l.id, { crmNotas: [...(l.crmNotas || []), { em: hojeYmd(), por: meuNome, texto }] });
    setNotaTexto('');
  };

  const salvarQualificacao = async (l: Locacao) => {
    if (!qRascunho) return;
    await up(l.id, qRascunho as Partial<Locacao>);
    setQRascunho(null);
    showToast('Qualificação salva.', 'success');
  };

  /** A ponte: fechou no CRM → a papelada começa no Setor de Locação. */
  const fechou = async (l: Locacao) => {
    const ok = await confirmDialog({
      title: `Fechou com ${l.nome}?`,
      message: 'O lead entra no funil burocrático do Setor de Locação (documentos → Loft → contratos → chave). O relacionamento continua aqui no CRM.',
      confirmLabel: 'Fechou — começar a papelada',
    });
    if (!ok) return;
    await up(l.id, { etapa: 'docs_inquilino', crmEtapa: 'negociacao', corretorNome: l.corretorNome || meuNome });
    showToast(`📎 ${l.nome} está no funil de Locações, em "Documentos".`, 'success');
  };

  const naoFechou = async (l: Locacao) => {
    const ok = await confirmDialog({
      title: `${l.nome} não fechou?`,
      message: 'O lead sai do CRM. O imóvel continua no ar recebendo outros interessados.',
      confirmLabel: 'Não fechou',
    });
    if (!ok) return;
    await up(l.id, { etapa: 'perdida', motivoPerda: 'não fechou (CRM)' });
    showToast('Marcado como não fechou.', 'info');
  };

  const imoveisNoAr = imoveis.filter((i) => ['publicado', 'material', 'adm_assinada'].includes(i.etapa));

  if (carregando) {
    return <div className="min-h-screen py-8 px-4"><div className="max-w-5xl mx-auto al-card p-8 text-center text-sm text-text-secondary">Carregando…</div></div>;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-4">

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="gx-tag mb-2 inline-flex"><span>Setor de Locação</span></span>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">CRM</h1>
            <p className="text-text-secondary text-[12.5px] mt-1 max-w-[62ch]">
              O relacionamento com o lead do aluguel — mova entre as etapas à vontade e anote o
              que quiser. Fechou, o botão manda pra papelada; entregou a chave, vira Alugado sozinho.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setNovo((v) => (v ? null : { imovelId: '' })); setNNome(''); setNTel(''); }} className={btnOuro}>+ Lead</button>
            <button onClick={leadDoPortal} className={btnSimula}>⚡ Lead do portal</button>
          </div>
        </div>

        <AbasDaArea ativa="crm" crm={abas.crm} imoveis={abas.imoveis} locacoes={abas.locacoes} mensagens={abas.mensagens} cobranca={abas.cobranca} />

        {/* lead novo de fora dos portais */}
        {novo && (
          <div className="al-card p-4 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
              Lead novo — indicação, Instagram, balcão, telefone
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Campo rot="Nome" largura="sm:col-span-2"><input className={inputCls} value={nNome} onChange={(e) => setNNome(e.target.value)} autoFocus /></Campo>
              <Campo rot="WhatsApp"><input className={inputCls} value={nTel} onChange={(e) => setNTel(e.target.value)} /></Campo>
              <Campo rot="Veio de">
                <select className={inputCls} value={nOrigem} onChange={(e) => setNOrigem(e.target.value)}>
                  <option value="manual">indicação</option>
                  <option value="instagram">Instagram</option>
                  <option value="balcao">balcão / telefone</option>
                  <option value="grupo_olx">portal</option>
                </select>
              </Campo>
              <Campo rot="Interessado em qual imóvel" largura="sm:col-span-4">
                <select className={inputCls} value={novo.imovelId} onChange={(e) => setNovo({ imovelId: e.target.value })}>
                  <option value="">— escolha o imóvel —</option>
                  {imoveisNoAr.map((i) => (
                    <option key={i.id} value={i.id}>{i.codigo} · {i.titulo} · {fmtValor(i.aluguel)}</option>
                  ))}
                </select>
              </Campo>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={criarLead} className={btnOuro}>Salvar lead</button>
              <button onClick={() => setNovo(null)} className={btnGhost}>cancelar</button>
            </div>
          </div>
        )}

        {/* o quadro: busca + chips de etapa + tabela — a cara do CRM da casa */}
        <div className="al-card relative overflow-hidden p-3">
          <div className="absolute inset-x-0 top-0 gx-line-gold" />

          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, telefone ou imóvel…"
              className="w-full sm:w-64 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40" />
            <div className="flex flex-wrap gap-1.5">
              {CRM_ORDEM.map((k) => {
                const d = CRM_ETAPAS[k];
                const q = contagem[k] || 0;
                const sel = etapaSel === k;
                return (
                  <button key={k} onClick={() => setEtapaSel(sel ? null : k)} title={d.ajuda}
                    className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold border transition-colors ${
                      sel ? CHIP_ETAPA[k] : q > 0 ? 'border-white/10 bg-white/[0.04] text-text-secondary hover:text-white' : 'border-transparent text-white/25'}`}>
                    {d.icone} {d.rotulo} <span className="tabular-nums">{q}</span>
                  </button>
                );
              })}
            </div>
            <span className="ml-auto text-[11.5px] text-text-secondary tabular-nums">
              {leads.length} lead{leads.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* a lista */}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_130px_44px_1fr_150px] gap-2 px-3 py-2 border-b border-white/10 bg-white/[0.03] text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-secondary">
              <span>Nome</span><span>Telefone</span><span></span><span>Imóvel de interesse</span><span>Etapa</span>
            </div>

            {leads.map((l) => {
              const im = imovelDe(l.imovelId);
              const ce: CrmEtapa = l.crmEtapa || 'entrada';
              const aberto = abertoId === l.id;
              const zap = linkWhats(l.telefone, `Olá ${(l.nome || '').split(' ')[0]}! Aqui é ${meuNome ? meuNome.split(' ')[0] : 'da Nox Imóveis'}, sobre o ${im?.titulo || 'imóvel'} que você se interessou.`);
              const naBurocracia = ETAPAS_LOCACAO[l.etapa].n >= 2 && l.etapa !== 'perdida' && l.etapa !== 'encerrada';
              return (
                <div key={l.id} className="border-b border-white/[0.05] last:border-0">
                  <button onClick={() => { setAbertoId(aberto ? null : l.id); setQRascunho(null); setNotaTexto(''); }}
                    className={`w-full grid grid-cols-1 sm:grid-cols-[1fr_130px_44px_1fr_150px] gap-x-2 gap-y-1 px-3 py-2 text-left transition-colors ${aberto ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'}`}>
                    <span className="text-[13px] font-bold text-white truncate">
                      {l.nome}
                      {ce === 'entrada' && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#7DD3FC] shadow-[0_0_8px_rgba(125,211,252,0.8)] animate-pulse" title="ninguém falou com ele ainda" />}
                      {l.temperatura === 'alta' && <span className="ml-1.5 text-[11px]">🔥</span>}
                    </span>
                    <span className="text-[12px] text-text-secondary truncate self-center">{l.telefone || '—'}</span>
                    <span className="self-center" onClick={(e) => e.stopPropagation()}>
                      {zap && <a href={zap} target="_blank" rel="noreferrer" title="Chamar no WhatsApp"><WhatsIcon className="h-6 w-6" /></a>}
                    </span>
                    <span className="text-[12px] text-text-secondary truncate self-center">
                      {im ? `${im.codigo} · ${im.titulo}` : '—'}
                    </span>
                    <span className="self-center flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${CHIP_ETAPA[ce]}`}>
                        {CRM_ETAPAS[ce].icone} {CRM_ETAPAS[ce].rotulo}
                      </span>
                      {naBurocracia && (
                        <span className="text-[10px] text-text-secondary truncate" title={`No Setor de Locação: ${ETAPAS_LOCACAO[l.etapa].rotulo}`}>
                          📋 {ETAPAS_LOCACAO[l.etapa].rotulo}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* ——— o detalhe do lead, embaixo da linha (padrão da área) ——— */}
                  {aberto && (
                    <div className="border-t border-white/[0.08] bg-white/[0.02] p-4 space-y-4">

                      {/* mover de etapa — o coração do CRM livre */}
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">Mover pra</p>
                        <div className="flex flex-wrap gap-1.5">
                          {CRM_ORDEM.map((k) => (
                            <button key={k} onClick={() => mover(l, k)}
                              className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold border transition-colors ${
                                ce === k ? CHIP_ETAPA[k] : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-white hover:bg-white/[0.07]'}`}>
                              {CRM_ETAPAS[k].icone} {CRM_ETAPAS[k].rotulo}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* quem é e de onde veio */}
                      <p className="text-[12px] text-text-secondary">
                        {[l.origem !== 'manual' ? `veio de ${l.origem.replace('_', ' ')}` : 'cadastrado à mão',
                          l.temperatura && `temperatura ${l.temperatura}`,
                          l.corretorNome && `corretor: ${l.corretorNome}`,
                          im?.aluguel ? `aluguel ${fmtValor(im.aluguel)}` : null].filter(Boolean).join(' · ')}
                        {(l as { demo?: boolean }).demo && <span className="ml-2"><SeloSimulacao texto="exemplo" /></span>}
                      </p>
                      {l.mensagem && <p className="text-[12px] text-white/80 italic">&ldquo;{l.mensagem}&rdquo;</p>}

                      {/* a qualificação do aluguel — curta, sem script */}
                      <div className="rounded-lg border border-white/[0.06] p-3 space-y-3">
                        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
                          Qualificação do aluguel — o que descobrir na conversa
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {([
                            ['qParaQuando', 'Pra quando precisa', 'ex.: em até 30 dias'],
                            ['qPessoas', 'Quem vai morar', 'ex.: casal + 1 filho'],
                            ['qPet', 'Tem pet?', 'ex.: 1 gato'],
                            ['qRenda', 'Renda aproximada', 'ex.: uns R$ 7.000 (casal)'],
                            ['qProcura', 'O que procura', 'ex.: 2 quartos, com vaga', 'sm:col-span-2'],
                          ] as const).map(([campo, rot, ph, larg]) => (
                            <Campo key={campo} rot={rot} largura={larg || ''}>
                              <input className={inputCls} placeholder={ph}
                                value={(qRascunho?.[campo] ?? l[campo]) || ''}
                                onChange={(e) => setQRascunho((p) => ({ ...(p || {}), [campo]: e.target.value }))} />
                            </Campo>
                          ))}
                        </div>
                        {qRascunho && (
                          <div className="flex gap-2">
                            <button onClick={() => salvarQualificacao(l)} className={btnOuro + ' !py-1.5'}>Salvar qualificação</button>
                            <button onClick={() => setQRascunho(null)} className={btnGhost + ' !py-1.5'}>descartar</button>
                          </div>
                        )}
                      </div>

                      {/* as anotações livres */}
                      <div className="rounded-lg border border-white/[0.06] p-3 space-y-2">
                        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
                          Anotações ({(l.crmNotas || []).length})
                        </p>
                        {[...(l.crmNotas || [])].reverse().map((nota, i) => (
                          <p key={i} className="text-[12px] text-white/85 border-b border-white/[0.05] last:border-0 pb-1.5">
                            <span className="text-[10.5px] text-text-secondary tabular-nums mr-2">{fmtData(nota.em)}{nota.por ? ` · ${nota.por.split(' ')[0]}` : ''}</span>
                            {nota.texto}
                          </p>
                        ))}
                        <div className="flex gap-2">
                          <input className={inputCls} placeholder="escreva e Enter — ex.: visitou sábado, gostou mas achou caro"
                            value={notaTexto} onChange={(e) => setNotaTexto(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') anotar(l); }} />
                          <button onClick={() => anotar(l)} disabled={!notaTexto.trim()} className={btnGhost + ' shrink-0'}>anotar</button>
                        </div>
                      </div>

                      {/* a ponte com a burocracia */}
                      <div className="flex flex-wrap gap-2">
                        {!naBurocracia ? (
                          <>
                            <button onClick={() => fechou(l)} className={btnOuro}>✓ Fechou — começar a papelada</button>
                            <button onClick={() => naoFechou(l)} className={btnGhost + ' !text-rose-300/70'}>✕ não fechou</button>
                          </>
                        ) : (
                          <button onClick={() => router.push('/dashboard/locacao/locacoes/?busca=' + encodeURIComponent(l.nome))} className={btnOuro}>
                            📋 Abrir no Setor de Locação — {ETAPAS_LOCACAO[l.etapa].rotulo}
                          </button>
                        )}
                        <button onClick={() => setAbertoId(null)} className={btnGhost + ' ml-auto'}>fechar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {leads.length === 0 && (
              <div className="p-10 text-center">
                <p className="text-[32px] mb-2">👥</p>
                <p className="text-[14px] font-bold text-white">
                  {etapaSel ? `Ninguém em "${CRM_ETAPAS[etapaSel].rotulo}".` : busca ? 'Nada com essa busca.' : 'Nenhum lead ainda.'}
                </p>
                <p className="text-[12.5px] text-text-secondary mt-1 max-w-[46ch] mx-auto">
                  Os leads dos portais caem aqui sozinhos, na Entrada. Ou cadastre um com + Lead.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaginaCrmLocacao() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingState label="Carregando..." /></div>}>
      <CrmLocacao />
    </Suspense>
  );
}
