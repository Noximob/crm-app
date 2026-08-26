'use client';

/**
 * 👥 O CRM DA LOCAÇÃO — o relacionamento com o lead do aluguel.
 *
 * O MESMO registro do Setor de Locação, visto pela lente do corretor. O
 * funil burocrático (documentos → Loft → contratos → chave) é processo e
 * anda por regra; ESTE funil é conversa e anda na mão:
 *
 *   Entrada → Em contato → Agendamento → Negociação
 *
 * Quatro colunas, e só. Não existe "Alugado" aqui: quem recebeu a chave
 * deixou de ser lead e virou CLIENTE ATIVO, que vive na aba Locações. O
 * CRM é a fila de quem ainda pode fechar.
 *
 * O que faz disto um CRM, e não uma lista de nomes: o BATIMENTO. Todo lead
 * tem uma data de próximo contato, e a tela ordena por quem está atrasado.
 * Lead sem retorno marcado não é um vazio — é um estado visível, porque é
 * assim que lead esfria.
 *
 * O que o sistema faz sozinho:
 *   · lead novo (portal ou à mão) nasce em "Entrada";
 *   · "✓ Fechou" empurra o registro pro funil burocrático — o
 *     relacionamento continua aqui enquanto a papelada corre lá;
 *   · chave entregue → o lead sai do CRM e vira cliente ativo.
 */
import React, { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import LoadingState from '@/components/ui/LoadingState';
import {
  CRM_ETAPAS, CRM_ORDEM, crmEtapaDe, STATUS_CONTATO, statusContato, MOTIVOS_PERDA,
  ETAPAS_LOCACAO, LOCACAO_VAZIA, hojeYmd, ymd, fmtData, fmtValor, linkWhats, diasAte,
  type Locacao, type CrmEtapa, type StatusContato,
} from '@/lib/locacao';
import { useDadosLocacao } from '../dados';
import { inputCls, btnOuro, btnGhost, btnSimula, SeloSimulacao, AbasDaArea, Campo } from '../ui';

const WhatsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#25D366" />
    <path d="M23.5 20.5c-.3-.2-1.7-.8-2-1s-.5-.2-.7.1c-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.2-.4-2.3-1.3-.8-.7-1.3-1.5-1.5-1.8-.2-.3 0-.5.1-.7.1-.1.2-.3.3-.5.1-.2.1-.4 0-.6-.1-.2-.7-1.7-1-2.3-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.2.2-.7.7-.7 1.7 0 1 .7 2 1.1 2.5.4.5 1.5 2 3.6 2.7 2.1.7 2.1.5 2.5.5.4 0 1.2-.5 1.4-1 .2-.5.2-.9.1-1.1z" fill="#fff" />
  </svg>
);

/** A cor de cada coluna — a mesma linguagem de chips da casa. */
const CHIP_ETAPA: Record<CrmEtapa, string> = {
  entrada: 'bg-[#7DD3FC]/10 border-[#7DD3FC]/35 text-[#7DD3FC]',
  contato: 'bg-[#E8C547]/10 border-[#E8C547]/35 text-[#FFE9A6]',
  agendamento: 'bg-[#C4A6FF]/10 border-[#C4A6FF]/35 text-[#C4A6FF]',
  negociacao: 'bg-[#34D399]/10 border-[#34D399]/35 text-[#34D399]',
};

const maisDias = (n: number) => ymd(new Date(Date.now() + n * 864e5));

function CrmLocacao() {
  const router = useRouter();
  const params = useSearchParams();
  const { userData } = useAuth();
  const { imobiliariaId, isEspelhoDemo, imoveis, locacoes, carregando, recarregar, abas } = useDadosLocacao();

  const [busca, setBusca] = useState(params.get('imovel') || '');
  const [etapaSel, setEtapaSel] = useState<CrmEtapa | null>(null);
  const [statusSel, setStatusSel] = useState<StatusContato | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [novo, setNovo] = useState<{ imovelId: string } | null>(
    params.get('novo') ? { imovelId: params.get('novo') as string } : null,
  );
  const [nNome, setNNome] = useState('');
  const [nTel, setNTel] = useState('');
  const [nOrigem, setNOrigem] = useState('manual');
  const [nProcura, setNProcura] = useState('');
  const [notaTexto, setNotaTexto] = useState('');
  const [qRascunho, setQRascunho] = useState<Record<string, string> | null>(null);
  /** ao mover pra Agendamento a tela pergunta QUANDO é a visita */
  const [marcandoVisita, setMarcandoVisita] = useState<string | null>(null);
  const [dataVisita, setDataVisita] = useState('');
  /** qual lead está com o formulário de "por que não fechou" aberto */
  const [perdendo, setPerdendo] = useState<string | null>(null);

  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };
  const imovelDe = (id: string) => imoveis.find((i) => i.id === id);
  const meuNome = userData?.nome || '';

  const up = async (id: string, campos: Partial<Locacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoLocacoes', id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  // ——— quem vive no CRM: o lead que ainda pode fechar ———
  const vivos = useMemo(
    () => locacoes.filter((l) => !['ativa', 'encerrando', 'encerrada', 'perdida'].includes(l.etapa)),
    [locacoes],
  );

  /** A ordem da fila: quem está esperando resposta primeiro. */
  const urgencia = (l: Locacao) => {
    const st = statusContato(l).tipo;
    if (st === 'atrasado') return 0;
    if (st === 'hoje') return 1;
    if (crmEtapaDe(l) === 'entrada') return 2;   // ninguém tocou ainda
    if (st === 'sem') return 3;
    return 4;
  };

  const leads = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const bDig = busca.replace(/\D/g, '');
    return vivos
      .filter((l) => {
        if (!b) return true;
        const im = imovelDe(l.imovelId);
        return l.nome.toLowerCase().includes(b)
          || (bDig.length >= 3 && (l.telefone || '').replace(/\D/g, '').includes(bDig))
          || (im ? `${im.codigo} ${im.titulo}`.toLowerCase().includes(b) : false);
      })
      .filter((l) => !etapaSel || crmEtapaDe(l) === etapaSel)
      .filter((l) => !statusSel || statusContato(l).tipo === statusSel)
      .sort((a, b2) => urgencia(a) - urgencia(b2)
        || (a.crmProximoContato || '9999').localeCompare(b2.crmProximoContato || '9999'));
  }, [vivos, busca, etapaSel, statusSel, imoveis]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of vivos) { const k = crmEtapaDe(l); c[k] = (c[k] || 0) + 1; }
    return c;
  }, [vivos]);

  /** O placar de atenção — o que responde "por onde eu começo hoje?". */
  const placar = useMemo(() => {
    const emSeteDias = maisDias(7);
    return {
      novos: vivos.filter((l) => crmEtapaDe(l) === 'entrada').length,
      atrasados: vivos.filter((l) => statusContato(l).tipo === 'atrasado').length,
      hoje: vivos.filter((l) => statusContato(l).tipo === 'hoje').length,
      visitas: vivos.filter((l) => l.crmVisitaEm && l.crmVisitaEm >= hojeYmd() && l.crmVisitaEm <= emSeteDias).length,
      semRetorno: vivos.filter((l) => statusContato(l).tipo === 'sem' && crmEtapaDe(l) !== 'entrada').length,
    };
  }, [vivos]);

  // ——— as ações ———

  const mover = async (l: Locacao, para: CrmEtapa) => {
    if (crmEtapaDe(l) === para) return;
    // Agendamento sem data é promessa vazia — a tela pergunta na hora
    if (para === 'agendamento') {
      setMarcandoVisita(l.id);
      setDataVisita(l.crmVisitaEm || maisDias(2));
      return;
    }
    await up(l.id, { crmEtapa: para });
    showToast(`${l.nome} → ${CRM_ETAPAS[para].rotulo}.`, 'success');
  };

  const confirmarVisita = async (l: Locacao) => {
    const quando = dataVisita || maisDias(2);
    await up(l.id, { crmEtapa: 'agendamento', crmVisitaEm: quando, crmProximoContato: quando });
    setMarcandoVisita(null); setDataVisita('');
    showToast(`📅 Visita marcada pra ${fmtData(quando)} — e o retorno cai no mesmo dia.`, 'success');
  };

  const marcarRetorno = async (l: Locacao, quando: string) => {
    await up(l.id, { crmProximoContato: quando });
    showToast(quando ? `Retorno marcado pra ${fmtData(quando)}.` : 'Retorno desmarcado.', 'success');
  };

  const criarLead = async () => {
    if (guarda() || !imobiliariaId || !novo) return;
    if (!nNome.trim()) { showToast('Falta o nome.', 'error'); return; }
    // o imóvel é OPCIONAL: nem todo lead nasce de um anúncio
    const im = imoveis.find((x) => x.id === novo.imovelId);
    await addDoc(collection(db, 'locacaoLocacoes'), {
      ...LOCACAO_VAZIA, imobiliariaId,
      imovelId: im?.id || '',
      nome: nNome.trim(), telefone: nTel.trim(), origem: nOrigem,
      corretorNome: meuNome, crmEtapa: 'entrada', crmProximoContato: hojeYmd(),
      qProcura: nProcura.trim(),
      ...(im ? {
        valorAluguel: im.aluguel, valorCondominio: im.condominio,
        valorIptuMensal: im.iptuMensal, valorSeguroIncendio: im.seguroIncendio,
        taxaAdmPct: im.taxaAdmPct,
      } : {}),
      criadoEm: serverTimestamp(),
    });
    setNovo(null); setNNome(''); setNTel(''); setNOrigem('manual'); setNProcura('');
    showToast(im ? 'Lead na Entrada, pra falar hoje.' : 'Lead na Entrada — o imóvel você define quando ele escolher.', 'success');
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
      crmEtapa: 'entrada', crmProximoContato: hojeYmd(),
      valorAluguel: im.aluguel, valorCondominio: im.condominio,
      valorIptuMensal: im.iptuMensal, valorSeguroIncendio: im.seguroIncendio,
      taxaAdmPct: im.taxaAdmPct, criadoEm: serverTimestamp(),
    });
    showToast(`⚡ Lead novo do portal, interessado no ${im.codigo} — está na Entrada.`, 'success');
    recarregar();
  };

  /** Anotar é o gesto mais repetido do CRM: uma linha, Enter, pronto. */
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

  /** Visitou e não gostou — o lead continua, o imóvel é que muda. */
  const trocarImovel = async (l: Locacao, imovelId: string) => {
    if (!imovelId) { await up(l.id, { imovelId: '' }); return; }
    const im = imoveis.find((x) => x.id === imovelId);
    if (!im) return;
    await up(l.id, {
      imovelId,
      valorAluguel: im.aluguel, valorCondominio: im.condominio,
      valorIptuMensal: im.iptuMensal, valorSeguroIncendio: im.seguroIncendio,
      taxaAdmPct: im.taxaAdmPct,
      crmNotas: [...(l.crmNotas || []), { em: hojeYmd(), por: meuNome, texto: `Passou a se interessar pelo ${im.codigo} — ${im.titulo}.` }],
    });
    showToast(`Agora interessado no ${im.codigo}.`, 'success');
  };

  /** A ponte: fechou no CRM → a papelada começa no Setor de Locação. */
  const fechou = async (l: Locacao) => {
    if (!l.imovelId) {
      showToast('Antes de fechar, escolha por qual imóvel — é dele que sai o contrato.', 'error');
      setAbertoId(l.id);
      return;
    }
    const ok = await confirmDialog({
      title: `Fechou com ${l.nome}?`,
      message: 'O lead entra no funil burocrático do Setor de Locação (documentos → Loft → contratos → chave). O relacionamento continua aqui no CRM, em Negociação.',
      confirmLabel: 'Fechou — começar a papelada',
    });
    if (!ok) return;
    await up(l.id, {
      etapa: 'docs_inquilino', crmEtapa: 'negociacao',
      corretorNome: l.corretorNome || meuNome, crmProximoContato: maisDias(2),
    });
    showToast(`📎 ${l.nome} está no funil de Locações, em "Documentos".`, 'success');
  };

  /** O motivo da perda em dois cliques: é o dado que ajuda a corrigir preço. */
  const confirmarPerda = async (l: Locacao, motivo: string) => {
    await up(l.id, { etapa: 'perdida', motivoPerda: motivo });
    setPerdendo(null);
    showToast(`${l.nome} saiu do CRM — ${motivo.toLowerCase()}.`, 'info');
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
            <p className="text-text-secondary text-[12.5px] mt-1 max-w-[64ch]">
              A fila de quem ainda pode fechar. Mova entre as colunas à vontade, marque quando
              falar de novo e anote o que quiser. Quem recebe a chave sai daqui e vira
              {' '}<b className="text-white/85">cliente ativo</b> em Locações.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setNovo((v) => (v ? null : { imovelId: '' })); setNNome(''); setNTel(''); }} className={btnOuro}>+ Lead</button>
            <button onClick={leadDoPortal} className={btnSimula}>⚡ Lead do portal</button>
          </div>
        </div>

        <AbasDaArea ativa="crm" crm={abas.crm} imoveis={abas.imoveis} locacoes={abas.locacoes} mensagens={abas.mensagens} cobranca={abas.cobranca} />

        {/* o placar: por onde começar hoje — cada número é um filtro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            ['atrasados', placar.atrasados, 'atrasados', 'text-rose-300', () => { setStatusSel(statusSel === 'atrasado' ? null : 'atrasado'); setEtapaSel(null); }],
            ['hoje', placar.hoje, 'pra falar hoje', 'text-[#FFE9A6]', () => { setStatusSel(statusSel === 'hoje' ? null : 'hoje'); setEtapaSel(null); }],
            ['novos', placar.novos, 'novos, sem contato', 'text-[#7DD3FC]', () => { setEtapaSel(etapaSel === 'entrada' ? null : 'entrada'); setStatusSel(null); }],
            ['visitas', placar.visitas, 'visitas em 7 dias', 'text-[#C4A6FF]', () => { setEtapaSel(etapaSel === 'agendamento' ? null : 'agendamento'); setStatusSel(null); }],
          ] as const).map(([k, v, rot, cor, acao]) => (
            <button key={k} onClick={acao} className="al-card px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors">
              <p className={`text-[19px] font-extrabold tabular-nums leading-none ${v ? cor : 'text-text-secondary'}`}>{v}</p>
              <p className="text-[10.5px] text-text-secondary mt-1">{rot}</p>
            </button>
          ))}
        </div>

        {placar.semRetorno > 0 && (
          <button onClick={() => { setStatusSel(statusSel === 'sem' ? null : 'sem'); setEtapaSel(null); }}
            className="w-full rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2 text-left">
            <p className="text-[11.5px] font-bold text-amber-300">
              ⚠ {placar.semRetorno} lead{placar.semRetorno > 1 ? 's' : ''} sem retorno marcado — é assim que lead esfria. Clique pra ver.
            </p>
          </button>
        )}

        {/* lead novo de fora dos portais */}
        {novo && (
          <div className="al-card p-4 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
              Lead novo — indicação, Instagram, balcão, telefone
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Campo rot="Nome" largura="sm:col-span-2"><input className={inputCls} value={nNome} onChange={(e) => setNNome(e.target.value)} autoFocus /></Campo>
              <Campo rot="WhatsApp"><input className={inputCls} value={nTel} onChange={(e) => setNTel(e.target.value)} placeholder="(47) 9…" /></Campo>
              <Campo rot="Veio de">
                <select className={inputCls} value={nOrigem} onChange={(e) => setNOrigem(e.target.value)}>
                  <option value="manual">indicação</option>
                  <option value="instagram">Instagram</option>
                  <option value="balcao">balcão / telefone</option>
                  <option value="grupo_olx">portal</option>
                </select>
              </Campo>
              <Campo rot="Interessado em algum imóvel? (opcional)" largura="sm:col-span-2">
                <select className={inputCls} value={novo.imovelId} onChange={(e) => setNovo({ imovelId: e.target.value })}>
                  <option value="">ainda não sabe / vou descobrir</option>
                  {imoveisNoAr.map((i) => (
                    <option key={i.id} value={i.id}>{i.codigo} · {i.titulo} · {fmtValor(i.aluguel)}</option>
                  ))}
                </select>
              </Campo>
              <Campo rot="O que ele procura" largura="sm:col-span-2">
                <input className={inputCls} placeholder="ex.: 2 quartos no Centro, com vaga, até R$ 2.000"
                  value={nProcura} onChange={(e) => setNProcura(e.target.value)} />
              </Campo>
            </div>
            <p className="text-[11px] text-text-secondary">
              Lead de portal já vem com o imóvel do anúncio. O que você cadastra à mão pode não ter
              nenhum ainda — anote o que ele procura e amarre o imóvel quando ele escolher.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={criarLead} className={btnOuro}>Salvar lead</button>
              <button onClick={() => setNovo(null)} className={btnGhost}>cancelar</button>
            </div>
          </div>
        )}

        {/* o quadro */}
        <div className="al-card relative overflow-hidden p-3">
          <div className="absolute inset-x-0 top-0 gx-line-gold" />

          <div className="flex flex-wrap items-center gap-2">
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, telefone ou imóvel…"
              className="w-full sm:w-56 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40" />
            <div className="flex flex-wrap gap-1.5">
              {CRM_ORDEM.map((k) => {
                const d = CRM_ETAPAS[k];
                const q = contagem[k] || 0;
                const sel = etapaSel === k;
                return (
                  <button key={k} onClick={() => { setEtapaSel(sel ? null : k); setStatusSel(null); }} title={d.ajuda}
                    className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold border transition-colors ${
                      sel ? CHIP_ETAPA[k] : q > 0 ? 'border-white/10 bg-white/[0.04] text-text-secondary hover:text-white' : 'border-transparent text-white/25'}`}>
                    {d.icone} {d.rotulo} <span className="tabular-nums">{q}</span>
                  </button>
                );
              })}
            </div>
            {(etapaSel || statusSel || busca) && (
              <button onClick={() => { setEtapaSel(null); setStatusSel(null); setBusca(''); }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-rose-500/35 bg-rose-500/10 text-rose-300">
                × limpar
              </button>
            )}
            <span className="ml-auto text-[11.5px] text-text-secondary tabular-nums">
              {leads.length} de {vivos.length}
            </span>
          </div>
        </div>

        <div className="space-y-2">
            {leads.map((l) => {
              const im = imovelDe(l.imovelId);
              const ce = crmEtapaDe(l);
              const st = statusContato(l);
              const aberto = abertoId === l.id;
              const zap = linkWhats(l.telefone, `Olá ${(l.nome || '').split(' ')[0]}! Aqui é ${meuNome ? meuNome.split(' ')[0] : 'da Nox Imóveis'}${im ? `, sobre o ${im.titulo}` : ''}.`);
              const naBurocracia = ETAPAS_LOCACAO[l.etapa].n >= 2;
              const ultimaNota = (l.crmNotas || [])[(l.crmNotas || []).length - 1];
              const diasSemToque = ultimaNota ? -(diasAte(ultimaNota.em) ?? 0) : null;
              const urgente = st.tipo === 'atrasado' || st.tipo === 'hoje' || ce === 'entrada';
              return (
                <div key={l.id} className={`al-card relative overflow-hidden ${urgente ? 'ring-1 ring-[#E8C547]/25' : ''}`}>
                  {urgente && <div className="absolute inset-x-0 top-0 gx-line-gold" />}

                  {/* o cabeçalho do cartão: quem é, por qual imóvel, e o que fazer */}
                  <div className="p-3.5">
                    <div className="flex flex-wrap items-start gap-3">
                      {/* a inicial faz as vezes de rosto — dá âncora visual à lista */}
                      <span className={`grid place-items-center h-11 w-11 rounded-full shrink-0 text-[16px] font-extrabold border ${CHIP_ETAPA[ce]}`}>
                        {(l.nome || '?').charAt(0).toUpperCase()}
                      </span>

                      <Link href={`/dashboard/locacao/crm/${l.id}`}
                        className="min-w-0 flex-1 basis-[220px] text-left group">
                        <p className="text-[14px] font-bold text-white leading-snug group-hover:text-[#FFE9A6] transition-colors">
                          {l.nome}
                          {ce === 'entrada' && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[#7DD3FC] shadow-[0_0_8px_rgba(125,211,252,0.8)] animate-pulse" title="ninguém falou com ele ainda" />}
                          {l.temperatura === 'alta' && <span className="ml-1.5 text-[12px]" title="lead quente">🔥</span>}
                        </p>
                        <p className="text-[11.5px] text-text-secondary mt-0.5 truncate">
                          {[l.telefone, l.origem !== 'manual' ? `via ${l.origem.replace('_', ' ')}` : null, l.corretorNome || null]
                            .filter(Boolean).join(' · ')}
                        </p>
                        <p className="text-[12px] mt-1 truncate">
                          {im
                            ? <span className="text-white/80">🏠 {im.codigo} · {im.titulo} <span className="text-text-secondary">· {fmtValor(im.aluguel)}</span></span>
                            : <span className="text-white/40 italic">🔍 {l.qProcura || 'ainda não definiu o imóvel'}</span>}
                        </p>
                      </Link>

                      {/* os chips e as ações, sempre visíveis */}
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${CHIP_ETAPA[ce]}`}>
                            {CRM_ETAPAS[ce].icone} {CRM_ETAPAS[ce].rotulo}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${STATUS_CONTATO[st.tipo].chip}`}>
                            {st.tipo === 'atrasado' ? `atrasado há ${st.dias}d`
                              : st.tipo === 'hoje' ? 'falar hoje'
                              : st.tipo === 'futuro' ? `volta ${fmtData(l.crmProximoContato)}`
                              : 'sem retorno marcado'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {zap && (
                            <a href={zap} target="_blank" rel="noreferrer" title="Chamar no WhatsApp"
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">
                              💬 WhatsApp
                            </a>
                          )}
                          {!naBurocracia && ce === 'negociacao' && (
                            <button onClick={() => fechou(l)} className={btnOuro + ' !py-1.5 !text-[11px] whitespace-nowrap'}>
                              ✓ Fechou — começar a papelada
                            </button>
                          )}
                          {naBurocracia && (
                            <span className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-[#34D399]/35 bg-[#34D399]/10 text-[#34D399]">
                              📋 {ETAPAS_LOCACAO[l.etapa].rotulo}
                            </span>
                          )}
                          <Link href={`/dashboard/locacao/crm/${l.id}`} className={btnGhost + ' !py-1.5 !text-[11px]'}>
                            📄 ficha completa
                          </Link>
                          <button onClick={() => { setAbertoId(aberto ? null : l.id); setQRascunho(null); setNotaTexto(''); setPerdendo(null); }}
                            className={btnGhost + ' !py-1.5 !text-[11px]'}>
                            {aberto ? '▴ fechar' : '▾ rápido'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* mover de coluna direto do cartão — sem precisar abrir */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.06]">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mr-1">mover</span>
                      {CRM_ORDEM.map((k) => (
                        <button key={k} onClick={() => mover(l, k)} title={CRM_ETAPAS[k].ajuda}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            ce === k ? CHIP_ETAPA[k] : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-white hover:bg-white/[0.07]'}`}>
                          {CRM_ETAPAS[k].icone} {CRM_ETAPAS[k].rotulo}
                        </button>
                      ))}
                      {l.crmVisitaEm && (
                        <span className="text-[11px] text-[#C4A6FF] ml-1">📅 visita {fmtData(l.crmVisitaEm)}</span>
                      )}
                      {diasSemToque !== null && diasSemToque >= 7 && (
                        <span className="text-[11px] text-amber-300 ml-auto">⚠ {diasSemToque}d sem anotação</span>
                      )}
                    </div>

                    {marcandoVisita === l.id && (
                      <div className="flex flex-wrap items-center gap-2 mt-2 rounded-lg border border-[#C4A6FF]/30 bg-[#C4A6FF]/[0.07] px-3 py-2">
                        <span className="text-[11.5px] font-bold text-[#C4A6FF]">📅 Quando é a visita?</span>
                        <input type="date" className={inputCls + ' !w-auto'} value={dataVisita} onChange={(e) => setDataVisita(e.target.value)} />
                        <button onClick={() => confirmarVisita(l)} className={btnOuro + ' !py-1.5'}>marcar</button>
                        <button onClick={() => setMarcandoVisita(null)} className={btnGhost + ' !py-1.5'}>×</button>
                      </div>
                    )}
                  </div>

                  {/* ——— o detalhe, embaixo da linha (padrão da área) ——— */}
                  {aberto && (
                    <div className="border-t border-white/[0.08] bg-white/[0.02] p-4 space-y-4">

                      {/* o batimento: quando falo com ele de novo */}
                      <div className="rounded-lg border border-white/[0.06] p-3">
                        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mb-1.5">
                          Próximo contato — {STATUS_CONTATO[st.tipo].rotulo}
                          {st.tipo === 'atrasado' && ` há ${st.dias} dia${st.dias > 1 ? 's' : ''}`}
                          {st.tipo === 'futuro' && ` · em ${st.dias} dia${st.dias > 1 ? 's' : ''}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <input type="date" className={inputCls + ' !w-auto'} value={l.crmProximoContato}
                            onChange={(e) => marcarRetorno(l, e.target.value)} />
                          {([['hoje', 0], ['amanhã', 1], ['+3 dias', 3], ['+1 semana', 7]] as const).map(([rot, d]) => (
                            <button key={rot} onClick={() => marcarRetorno(l, maisDias(d))} className={btnGhost + ' !py-1.5 !text-[11px]'}>{rot}</button>
                          ))}
                          {l.crmProximoContato && (
                            <button onClick={() => marcarRetorno(l, '')} className={btnGhost + ' !py-1.5 !text-[11px] !text-rose-300/70'}>limpar</button>
                          )}
                        </div>
                        {l.crmVisitaEm && (
                          <p className="text-[11.5px] text-[#C4A6FF] mt-2">📅 Visita marcada pra {fmtData(l.crmVisitaEm)}</p>
                        )}
                        {diasSemToque !== null && diasSemToque >= 7 && (
                          <p className="text-[11.5px] text-amber-300 mt-1.5">⚠ Última anotação há {diasSemToque} dias.</p>
                        )}
                      </div>

                      {/* quem é, de onde veio, e por qual imóvel */}
                      <div className="rounded-lg border border-white/[0.06] p-3 space-y-3">
                        <p className="text-[12px] text-text-secondary">
                          {[l.origem !== 'manual' ? `veio de ${l.origem.replace('_', ' ')}` : 'cadastrado à mão',
                            l.corretorNome && `corretor: ${l.corretorNome}`].filter(Boolean).join(' · ')}
                          {(l as { demo?: boolean }).demo && <span className="ml-2"><SeloSimulacao texto="exemplo" /></span>}
                        </p>
                        {l.mensagem && <p className="text-[12px] text-white/80 italic">&ldquo;{l.mensagem}&rdquo;</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Campo rot="Interesse pelo imóvel" largura="sm:col-span-2">
                            <select className={inputCls} value={l.imovelId} onChange={(e) => trocarImovel(l, e.target.value)}>
                              <option value="">ainda não definiu</option>
                              {im && !imoveisNoAr.some((x) => x.id === im.id) && (
                                <option value={im.id}>{im.codigo} · {im.titulo}</option>
                              )}
                              {imoveisNoAr.map((i) => (
                                <option key={i.id} value={i.id}>{i.codigo} · {i.titulo} · {fmtValor(i.aluguel)}</option>
                              ))}
                            </select>
                          </Campo>
                          <Campo rot="Temperatura">
                            <select className={inputCls} value={l.temperatura}
                              onChange={(e) => up(l.id, { temperatura: e.target.value as Locacao['temperatura'] })}>
                              <option value="">não avaliada</option>
                              <option value="alta">🔥 quente</option>
                              <option value="media">🌤 morna</option>
                              <option value="baixa">❄ fria</option>
                            </select>
                          </Campo>
                        </div>
                        {im && (
                          <p className="text-[11.5px] text-text-secondary">
                            {im.bairro} · {fmtValor(im.aluguel)}/mês
                            {im.condominio ? ` + ${fmtValor(im.condominio)} de condomínio` : ''}
                            {im.etapa !== 'publicado' && <span className="text-amber-300"> · ⚠ este imóvel não está no ar</span>}
                          </p>
                        )}
                      </div>

                      {/* a qualificação do aluguel — curta, sem script */}
                      <div className="rounded-lg border border-white/[0.06] p-3 space-y-3">
                        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
                          Qualificação do aluguel — o que descobrir na conversa
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {([
                            ['qParaQuando', 'Pra quando precisa', 'ex.: em até 30 dias', ''],
                            ['qPessoas', 'Quem vai morar', 'ex.: casal + 1 filho', ''],
                            ['qPet', 'Tem pet?', 'ex.: 1 gato', ''],
                            ['qRenda', 'Renda aproximada', 'ex.: uns R$ 7.000 (casal)', ''],
                            ['qProcura', 'O que procura', 'ex.: 2 quartos, com vaga', 'sm:col-span-2'],
                          ] as const).map(([campo, rot, ph, larg]) => (
                            <Campo key={campo} rot={rot} largura={larg}>
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
                      {perdendo === l.id ? (
                        <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.07] p-3 space-y-2">
                          <p className="text-[11.5px] font-bold text-rose-300">Por que {l.nome} não fechou?</p>
                          <div className="flex flex-wrap gap-1.5">
                            {MOTIVOS_PERDA.map((m) => (
                              <button key={m} onClick={() => confirmarPerda(l, m)} className={btnGhost + ' !py-1.5 !text-[11px]'}>{m}</button>
                            ))}
                            <button onClick={() => setPerdendo(null)} className={btnGhost + ' !py-1.5 !text-[11px] ml-auto'}>cancelar</button>
                          </div>
                          <p className="text-[10.5px] text-text-secondary">
                            O motivo fica registrado — é o que mostra se o preço do imóvel está errado.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {!naBurocracia ? (
                            <button onClick={() => fechou(l)} className={btnOuro}>✓ Fechou — começar a papelada</button>
                          ) : (
                            <button onClick={() => router.push('/dashboard/locacao/locacoes/?busca=' + encodeURIComponent(l.nome))} className={btnOuro}>
                              📋 Ver a papelada — {ETAPAS_LOCACAO[l.etapa].rotulo}
                            </button>
                          )}
                          <button onClick={() => setPerdendo(l.id)} className={btnGhost + ' !text-rose-300/70'}>✕ não fechou</button>
                          <button onClick={() => setAbertoId(null)} className={btnGhost + ' ml-auto'}>fechar</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {leads.length === 0 && (
              <div className="al-card p-10 text-center">
                <p className="text-[32px] mb-2">👥</p>
                <p className="text-[14px] font-bold text-white">
                  {etapaSel ? `Ninguém em "${CRM_ETAPAS[etapaSel].rotulo}".`
                    : statusSel ? `Nenhum lead ${STATUS_CONTATO[statusSel].rotulo.toLowerCase()}.`
                      : busca ? 'Nada com essa busca.' : 'Nenhum lead na fila.'}
                </p>
                <p className="text-[12.5px] text-text-secondary mt-1 max-w-[46ch] mx-auto">
                  {vivos.length === 0
                    ? 'Os leads dos portais caem aqui sozinhos, na Entrada. Ou cadastre um com + Lead.'
                    : 'Limpe o filtro pra ver os outros.'}
                </p>
              </div>
            )}
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
