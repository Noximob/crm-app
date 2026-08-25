'use client';

/**
 * LOCAÇÃO · ABA FLUXO — a tela que responde "o que eu faço agora?".
 *
 * A primeira versão espalhava a esteira em abas e obrigava o gestor a
 * adivinhar onde morava o próximo passo. Esta aba conserta isso: cada
 * aluguel em andamento vira UM cartão com a régua das etapas (feito ✓,
 * atual ●, futuro ○) e UM botão dourado com o próximo passo — clicou,
 * andou. As outras abas viram detalhe, não caminho.
 *
 * As ações daqui repetem de propósito as das abas (mesmos campos, mesmos
 * estados): quando as integrações reais entrarem, os avanços ⚡ somem dos
 * dois lugares de uma vez, porque o estado passa a vir dos webhooks.
 */
import React, { useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { showToast } from '@/components/ui/toast';
import {
  LEAD_VAZIO, CONTRATO_VAZIO, AMBIENTES_PADRAO, gerarMovimentos, hojeYmd, fmtData, fmtValor,
  type ImovelLocacao, type LeadLocacao, type ContratoLocacao, type MovimentoLocacao,
} from '@/lib/locacao';
import { inputCls, btnOuro, btnGhost, btnSimula, SeloSimulacao } from './ui';
import MinutaContrato from './minuta';

/** As 9 estações da jornada de UM aluguel, na ordem em que acontecem. */
const ESTACOES = ['Imóvel', 'Anúncio', 'Interessado', 'Visita', 'Garantia', 'Contrato', 'Vistoria', 'Chaves', 'Cobrando'] as const;

interface Negocio {
  chave: string;
  imovel?: ImovelLocacao;
  lead?: LeadLocacao;
  contrato?: ContratoLocacao;
  movs: MovimentoLocacao[];
  /** índice da primeira estação NÃO concluída (= onde o negócio está) */
  atual: number;
  feitas: boolean[];
}

export default function AbaFluxo({ imobiliariaId, isEspelhoDemo, imoveis, leads, contratos, movimentos, recarregar, irPara }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  imoveis: ImovelLocacao[];
  leads: LeadLocacao[];
  contratos: ContratoLocacao[];
  movimentos: MovimentoLocacao[];
  recarregar: () => Promise<void>;
  /** navega pra outra aba quando o passo precisa da tela cheia */
  irPara: (aba: 'imoveis' | 'esteira' | 'contratos' | 'financeiro') => void;
}) {
  const [novoDe, setNovoDe] = useState<string | null>(null);   // imóvel com o mini-form de interessado aberto
  const [nNome, setNNome] = useState(''); const [nTel, setNTel] = useState('');
  const [visitaDe, setVisitaDe] = useState<string | null>(null);
  const [vData, setVData] = useState('');
  const [minutaDe, setMinutaDe] = useState<string | null>(null);

  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  /**
   * Monta os negócios: um cartão por aluguel acontecendo. Contrato manda
   * (ele já uniu imóvel + inquilino); lead ativo sem contrato vem depois;
   * imóvel anunciado sem ninguém interessado fecha a lista.
   */
  const negocios = useMemo<Negocio[]>(() => {
    const out: Negocio[] = [];
    const leadsUsados = new Set<string>();

    for (const c of contratos) {
      if (c.status === 'encerrado') continue;
      if (c.leadId) leadsUsados.add(c.leadId);
      const im = imoveis.find((i) => i.id === c.imovelId);
      const movs = movimentos.filter((m) => m.contratoId === c.id);
      const feitas = [
        true,
        !!im && im.status !== 'rascunho',
        true, true, !!c.garantiaNumero,
        ['assinado', 'vistoria_feita', 'ativo', 'encerrando'].includes(c.status),
        !!c.vistoriaEntrada?.assinada,
        ['ativo', 'encerrando'].includes(c.status),
        movs.some((m) => m.statusCobranca === 'paga'),
      ];
      out.push({ chave: `c-${c.id}`, imovel: im, contrato: c, movs, feitas, atual: feitas.indexOf(false) === -1 ? 9 : feitas.indexOf(false) });
    }

    for (const l of leads) {
      if (['convertido', 'perdido', 'analise_recusada'].includes(l.etapa) || leadsUsados.has(l.id)) continue;
      const im = imoveis.find((i) => i.id === l.imovelId);
      const feitas = [
        true,
        !!im && im.status !== 'rascunho',
        true,
        ['visita_feita', 'analise_enviada', 'analise_aprovada'].includes(l.etapa),
        l.etapa === 'analise_aprovada',
        false, false, false, false,
      ];
      out.push({ chave: `l-${l.id}`, imovel: im, lead: l, movs: [], feitas, atual: feitas.indexOf(false) });
    }

    for (const im of imoveis) {
      if (im.status !== 'anunciado') continue;
      const temGente = out.some((n) => n.imovel?.id === im.id);
      if (temGente) continue;
      out.push({
        chave: `i-${im.id}`, imovel: im, movs: [],
        feitas: [true, true, false, false, false, false, false, false, false], atual: 2,
      });
    }

    // o que precisa de gente primeiro: quanto mais adiantado, mais em cima
    return out.sort((a, b) => b.atual - a.atual);
  }, [imoveis, leads, contratos, movimentos]);

  // ——— as ações que andam a régua ———

  const mudarLead = async (l: LeadLocacao, campos: Partial<LeadLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoLeads', l.id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  const criarInteressado = async (im: ImovelLocacao) => {
    if (guarda() || !imobiliariaId) return;
    if (!nNome.trim()) { showToast('Falta o nome.', 'error'); return; }
    await addDoc(collection(db, 'locacaoLeads'), {
      ...LEAD_VAZIO, imobiliariaId, imovelId: im.id, nome: nNome.trim(), telefone: nTel.trim(),
      criadoEm: serverTimestamp(),
    });
    setNovoDe(null); setNNome(''); setNTel('');
    showToast('Interessado no fluxo — próximo passo: agendar a visita.', 'success');
    recarregar();
  };

  const simularLoft = async (l: LeadLocacao, ok: boolean) => {
    if (ok) {
      const vig = new Date(); vig.setFullYear(vig.getFullYear() + 1);
      await mudarLead(l, {
        etapa: 'analise_aprovada',
        garantia: { numero: `LOFT-${Math.floor(Math.random() * 90000) + 10000}`, taxaMensalPct: 10, vigenciaFim: vig.toISOString().slice(0, 10), simulada: true },
      });
      showToast('⚡ Loft aprovou (simulação). Próximo: gerar o contrato.', 'success');
    } else {
      await mudarLead(l, { etapa: 'analise_recusada' });
      showToast('⚡ Loft recusou (simulação).', 'info');
    }
  };

  const gerarContrato = async (l: LeadLocacao, im?: ImovelLocacao) => {
    if (guarda() || !imobiliariaId) return;
    const refC = await addDoc(collection(db, 'locacaoContratos'), {
      ...CONTRATO_VAZIO, imobiliariaId, imovelId: l.imovelId, leadId: l.id,
      locadorNome: im?.locadorNome || '', locadorDoc: im?.locadorDoc || '', locadorEmail: im?.locadorEmail || '',
      locadorTelefone: im?.locadorTelefone || '', locadorPix: im?.locadorPix || '',
      locatarioNome: l.nome, locatarioTelefone: l.telefone, locatarioEmail: l.email,
      valorAluguel: im?.aluguel ?? null, valorCondominio: im?.condominio ?? null,
      valorIptuMensal: im?.iptuMensal ?? null, valorSeguroIncendio: im?.seguroIncendio ?? null,
      inicio: hojeYmd(),
      garantiaNumero: l.garantia?.numero || '', garantiaTaxaMensalPct: l.garantia?.taxaMensalPct ?? null,
      garantiaVigenciaFim: l.garantia?.vigenciaFim || '', garantiaSimulada: l.garantia?.simulada ?? false,
      criadoEm: serverTimestamp(),
    });
    await mudarLead(l, { etapa: 'convertido', contratoId: refC.id });
    showToast('Contrato criado. Próximo: enviar pra assinatura (confira os dados na aba Contratos se quiser).', 'success');
  };

  const mudarContrato = async (c: ContratoLocacao, campos: Partial<ContratoLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoContratos', c.id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  /** ⚡ Vistoria expressa: laudo padrão só pra régua andar no teste. */
  const vistoriaExpressa = async (c: ContratoLocacao) => {
    await mudarContrato(c, {
      status: 'vistoria_feita',
      vistoriaEntrada: {
        feitaEm: hojeYmd(), feitaPor: 'vistoria expressa (teste)', assinada: true, assinadaSimulada: true,
        ambientes: AMBIENTES_PADRAO.map((nome) => ({ nome, estado: 'bom' as const, observacao: '', fotos: [] })),
      },
    });
    showToast('⚡ Vistoria expressa + laudo assinado (simulação). A de verdade, com fotos, mora na aba Contratos.', 'success');
  };

  const ativar = async (c: ContratoLocacao) => {
    if (guarda() || !imobiliariaId) return;
    const movs = gerarMovimentos(c);
    if (!movs.length) { showToast('Faltam início, aluguel, prazo ou dia de vencimento — edita na aba Contratos.', 'error'); return; }
    const batch = writeBatch(db);
    for (const m of movs) batch.set(doc(collection(db, 'locacaoMovimentos')), { ...m, imobiliariaId, criadoEm: serverTimestamp() });
    batch.update(doc(db, 'locacaoContratos', c.id), { status: 'ativo', atualizadoEm: serverTimestamp() });
    if (c.imovelId) batch.update(doc(db, 'locacaoImoveis', c.imovelId), { status: 'alugado', atualizadoEm: serverTimestamp() });
    await batch.commit();
    showToast(`🔑 Chaves entregues! ${movs.length} meses de cobrança nasceram no Financeiro.`, 'success');
    recarregar();
  };

  const pagarProxima = async (n: Negocio) => {
    if (guarda()) return;
    const prox = [...n.movs].filter((m) => m.statusCobranca !== 'paga').sort((a, b) => a.competencia.localeCompare(b.competencia))[0];
    if (!prox) { showToast('Todas as competências já estão pagas. 👏', 'info'); return; }
    await updateDoc(doc(db, 'locacaoMovimentos', prox.id), {
      statusCobranca: 'paga', pagoEm: hojeYmd(), statusRepasse: 'liberado', simulado: true,
    });
    showToast(`⚡ ${prox.competencia.split('-').reverse().join('/')} paga (simulação). Repasse de ${fmtValor(prox.repasseDono)} liberado — confirma no Financeiro.`, 'success');
    recarregar();
  };

  // ——— o que mostrar em cada cartão ———

  const proximoPasso = (n: Negocio): React.ReactNode => {
    const { lead: l, contrato: c, imovel: im } = n;

    // sem ninguém interessado ainda
    if (!l && !c) {
      return novoDe === im!.id ? (
        <span className="flex flex-wrap items-center gap-2">
          <input className={inputCls + ' !w-44'} placeholder="nome do interessado" value={nNome} onChange={(e) => setNNome(e.target.value)} />
          <input className={inputCls + ' !w-40'} placeholder="telefone" value={nTel} onChange={(e) => setNTel(e.target.value)} />
          <button onClick={() => criarInteressado(im!)} className={btnOuro}>salvar</button>
          <button onClick={() => setNovoDe(null)} className={btnGhost}>×</button>
        </span>
      ) : (
        <button onClick={() => { setNovoDe(im!.id); setNNome(''); setNTel(''); }} className={btnOuro}>▶ Apareceu interessado? Registrar</button>
      );
    }

    // fase do interessado
    if (l && !c) {
      if (l.etapa === 'novo') {
        return visitaDe === l.id ? (
          <span className="flex flex-wrap items-center gap-2">
            <input type="date" className={inputCls + ' !w-auto'} value={vData} onChange={(e) => setVData(e.target.value)} />
            <button onClick={() => { if (!vData) { showToast('Escolhe a data.', 'error'); return; } mudarLead(l, { etapa: 'visita_agendada', visitaEm: vData }); setVisitaDe(null); }} className={btnOuro}>confirmar</button>
            <button onClick={() => setVisitaDe(null)} className={btnGhost}>×</button>
          </span>
        ) : (
          <button onClick={() => { setVisitaDe(l.id); setVData(''); }} className={btnOuro}>▶ Agendar a visita</button>
        );
      }
      if (l.etapa === 'visita_agendada') {
        return <button onClick={() => mudarLead(l, { etapa: 'visita_feita' })} className={btnOuro}>▶ A visita aconteceu</button>;
      }
      if (l.etapa === 'visita_feita') {
        return <button onClick={() => mudarLead(l, { etapa: 'analise_enviada' })} className={btnOuro}>▶ Enviar pra análise (Loft)</button>;
      }
      if (l.etapa === 'analise_enviada') {
        return (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-text-secondary">A Loft responderia em &lt;1 min:</span>
            <button onClick={() => simularLoft(l, true)} className={btnSimula}>⚡ aprovou</button>
            <button onClick={() => simularLoft(l, false)} className={btnSimula}>⚡ recusou</button>
          </span>
        );
      }
      if (l.etapa === 'analise_aprovada') {
        return <button onClick={() => gerarContrato(l, im)} className={btnOuro}>▶ Gerar o contrato</button>;
      }
    }

    // fase do contrato
    if (c) {
      if (c.status === 'rascunho') {
        return (
          <span className="flex flex-wrap items-center gap-2">
            <button onClick={() => mudarContrato(c, { status: 'assinatura_enviada', assinaturaEnviadaEm: hojeYmd(), assinaturaSimulada: true })}
              className={btnOuro}>▶ Enviar pra assinatura</button>
            <button onClick={() => irPara('contratos')} className={btnGhost}>conferir dados antes</button>
          </span>
        );
      }
      if (c.status === 'assinatura_enviada') {
        return <button onClick={() => mudarContrato(c, { status: 'assinado', assinadoEm: hojeYmd() })} className={btnSimula}>⚡ Todos assinaram (simular ClickSign)</button>;
      }
      if (c.status === 'assinado' || (c.status === 'vistoria_feita' && !c.vistoriaEntrada?.assinada)) {
        return (
          <span className="flex flex-wrap items-center gap-2">
            <button onClick={() => vistoriaExpressa(c)} className={btnSimula}>⚡ Vistoria expressa (teste)</button>
            <button onClick={() => irPara('contratos')} className={btnGhost}>fazer a vistoria de verdade</button>
          </span>
        );
      }
      if (c.status === 'vistoria_feita' && c.vistoriaEntrada?.assinada) {
        return <button onClick={() => ativar(c)} className={btnOuro}>🔑 Entregar as chaves</button>;
      }
      if (c.status === 'ativo') {
        const pagas = n.movs.filter((m) => m.statusCobranca === 'paga').length;
        return (
          <span className="flex flex-wrap items-center gap-2">
            <button onClick={() => pagarProxima(n)} className={btnSimula}>⚡ Inquilino pagou o mês</button>
            <button onClick={() => irPara('financeiro')} className={btnGhost}>ver o dinheiro ({pagas}/{n.movs.length} pagas)</button>
          </span>
        );
      }
      if (c.status === 'encerrando') {
        return <button onClick={() => irPara('contratos')} className={btnOuro}>▶ Concluir a saída (vistoria + distrato)</button>;
      }
    }
    return null;
  };

  const ondeEsta = (n: Negocio): string => {
    const { lead: l, contrato: c } = n;
    if (!l && !c) return 'No ar, esperando interessados';
    if (l && !c) {
      return {
        novo: 'Interessado novo — falta agendar a visita',
        visita_agendada: `Visita marcada pra ${fmtData(l.visitaEm)}`,
        visita_feita: 'Visitou e gostou — falta a análise da garantia',
        analise_enviada: 'Na mesa da Loft',
        analise_aprovada: 'Garantia aprovada — pronto pra virar contrato',
      }[l.etapa as string] || l.etapa;
    }
    if (c) {
      return {
        rascunho: 'Contrato montado — falta enviar pra assinatura',
        assinatura_enviada: 'No WhatsApp das partes, esperando assinaturas',
        assinado: 'Assinado — falta a vistoria de entrada',
        vistoria_feita: c.vistoriaEntrada?.assinada ? 'Tudo assinado — pode entregar as chaves' : 'Vistoria feita — falta assinar o laudo',
        ativo: 'Alugado e cobrando todo mês',
        encerrando: 'Inquilino saindo — vistoria de saída e distrato',
      }[c.status as string] || c.status;
    }
    return '';
  };

  // ——— render ———

  if (!negocios.length) {
    return (
      <div className="al-card p-8">
        <p className="text-[32px] mb-2 text-center">🧭</p>
        <p className="text-[14px] font-bold text-white text-center mb-4">Nenhum aluguel andando ainda. O caminho é curto:</p>
        <div className="max-w-md mx-auto space-y-2">
          {[
            ['1', 'Cadastre um imóvel (ou crie os dados de exemplo no botão 🧪 acima)'],
            ['2', 'Apareceu gente? Registre o interessado e siga o botão dourado'],
            ['3', 'Cada cartão aqui mostra onde o aluguel está e qual o próximo passo'],
          ].map(([n, t]) => (
            <p key={n} className="text-[12.5px] text-text-secondary"><b className="text-[#E8C547] mr-1.5">{n}.</b>{t}</p>
          ))}
        </div>
        <div className="text-center mt-5">
          <button onClick={() => irPara('imoveis')} className={btnOuro}>▶ Começar: cadastrar imóvel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] text-text-secondary">
        Um cartão por aluguel acontecendo. O <b className="text-[#FFE9A6]">botão dourado</b> é sempre o próximo
        passo; os <b className="text-amber-300">⚡ âmbar</b> fazem o papel de quem ainda não está integrado
        (Loft, ClickSign, Asaas).
      </p>

      {negocios.map((n) => {
        const nome = n.contrato?.locatarioNome || n.lead?.nome;
        return (
          <div key={n.chave} className="al-card relative overflow-hidden p-4">
            <div className="absolute inset-x-0 top-0 gx-line-gold" />

            {/* quem e onde */}
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[14px] font-bold text-white">
                {n.imovel ? `${n.imovel.codigo} — ${n.imovel.titulo}` : 'Imóvel removido'}
              </span>
              {nome && <span className="text-[12px] text-text-secondary">com <b className="text-white/85">{nome}</b></span>}
              {(n.contrato?.garantiaSimulada || n.contrato?.assinaturaSimulada || n.lead?.garantia?.simulada) && <SeloSimulacao />}
              {n.contrato?.valorAluguel ? (
                <span className="text-[12px] text-[#FFE9A6] font-bold tabular-nums ml-auto">{fmtValor(n.contrato.valorAluguel)}/mês</span>
              ) : n.imovel?.aluguel ? (
                <span className="text-[12px] text-[#FFE9A6] font-bold tabular-nums ml-auto">{fmtValor(n.imovel.aluguel)}/mês</span>
              ) : null}
            </div>

            {/* a régua da jornada */}
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 mt-2.5">
              {ESTACOES.map((e, i) => {
                const feita = n.feitas[i];
                const atual = i === n.atual;
                return (
                  <React.Fragment key={e}>
                    {i > 0 && <span className={`w-3 h-px ${feita || atual ? 'bg-[#E8C547]/50' : 'bg-white/10'}`} />}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      atual ? 'bg-[#E8C547]/15 text-[#FFE9A6] border border-[#E8C547]/40'
                        : feita ? 'text-emerald-300/90' : 'text-white/30'}`}>
                      {feita ? '✓' : atual ? '●' : '○'} {e}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>

            {/* onde está, em palavras + o botão do próximo passo */}
            <p className="text-[12.5px] text-white/85 mt-2.5 mb-2">
              <b className="text-[#FFE9A6]">Agora:</b> {ondeEsta(n)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {proximoPasso(n)}
              {n.contrato && (
                <button onClick={() => setMinutaDe(minutaDe === n.contrato!.id ? null : n.contrato!.id)} className={btnGhost}>
                  📄 {minutaDe === n.contrato.id ? 'fechar a minuta' : 'ver o contrato (minuta)'}
                </button>
              )}
            </div>
            {n.contrato && minutaDe === n.contrato.id && (
              <div className="mt-3">
                <MinutaContrato c={n.contrato} imovel={n.imovel} onFechar={() => setMinutaDe(null)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
