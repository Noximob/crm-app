'use client';

/**
 * LOCAÇÃO · ABA ESTEIRA — etapas 3 a 5: do interessado à garantia aprovada.
 *
 * A fila anda numa direção só: novo → visita → análise → aprovado → contrato
 * (ou perdido, a qualquer momento, com motivo). Quando os webhooks dos
 * portais ligarem, os leads caem aqui sozinhos com origem e temperatura; até
 * lá, o botão "+ Interessado" alimenta a MESMA fila — o fluxo não muda, só a
 * mão que digita.
 *
 * A análise da Loft é SIMULAÇÃO por enquanto: o botão âmbar finge a resposta
 * que a Loft dará (aprovado, com nº/taxa/vigência — ou recusado). Quando a
 * integração real existir, o botão some e o status vem deles.
 */
import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from '@/components/ui/toast';
import {
  ETAPAS_LEAD, LEAD_VAZIO, CONTRATO_VAZIO, hojeYmd, fmtData,
  type LeadLocacao, type EtapaLead, type ImovelLocacao,
} from '@/lib/locacao';
import { inputCls, btnOuro, btnGhost, btnSimula, Campo, SeloSimulacao } from './ui';

const TEMP = {
  alta: { simb: '🔥', cor: 'text-rose-300' },
  media: { simb: '🌤', cor: 'text-amber-300' },
  baixa: { simb: '❄', cor: 'text-sky-300' },
  '': { simb: '', cor: 'text-text-secondary' },
} as const;

export default function AbaEsteira({ imobiliariaId, isEspelhoDemo, leads, imoveis, recarregar, aoConverter }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  leads: LeadLocacao[];
  imoveis: ImovelLocacao[];
  recarregar: () => Promise<void>;
  /** avisa a página pra trocar pra aba Contratos quando um lead vira contrato */
  aoConverter: () => void;
}) {
  const [novoAberto, setNovoAberto] = useState(false);
  const [nNome, setNNome] = useState(''); const [nTel, setNTel] = useState('');
  const [nEmail, setNEmail] = useState(''); const [nImovel, setNImovel] = useState('');
  const [nMsg, setNMsg] = useState('');
  const [filtro, setFiltro] = useState<'ativos' | 'todos'>('ativos');
  const [visitaDe, setVisitaDe] = useState<string | null>(null);   // lead com o form de visita aberto
  const [vData, setVData] = useState(''); const [vCorretor, setVCorretor] = useState('');
  const [perdendo, setPerdendo] = useState<string | null>(null);
  const [pMotivo, setPMotivo] = useState('');

  const imovelDe = (id: string) => imoveis.find((x) => x.id === id);
  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  const adicionar = async () => {
    if (guarda() || !imobiliariaId) return;
    if (!nNome.trim() || !nImovel) { showToast('Nome e imóvel são obrigatórios.', 'error'); return; }
    await addDoc(collection(db, 'locacaoLeads'), {
      ...LEAD_VAZIO, imobiliariaId, imovelId: nImovel,
      nome: nNome.trim(), telefone: nTel.trim(), email: nEmail.trim(), mensagem: nMsg.trim(),
      criadoEm: serverTimestamp(),
    });
    setNovoAberto(false); setNNome(''); setNTel(''); setNEmail(''); setNImovel(''); setNMsg('');
    showToast('Interessado na esteira.', 'success');
    recarregar();
  };

  const mudar = async (l: LeadLocacao, campos: Partial<LeadLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoLeads', l.id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  const agendarVisita = async (l: LeadLocacao) => {
    if (!vData) { showToast('Escolhe a data da visita.', 'error'); return; }
    await mudar(l, { etapa: 'visita_agendada', visitaEm: vData, corretorNome: vCorretor.trim() || l.corretorNome });
    setVisitaDe(null); setVData(''); setVCorretor('');
    showToast('Visita agendada.', 'success');
  };

  /** ⚡ SIMULAÇÃO da Loft: aprova com número/taxa/vigência de mentira. */
  const simularLoft = async (l: LeadLocacao, aprovado: boolean) => {
    if (aprovado) {
      const vig = new Date(); vig.setFullYear(vig.getFullYear() + 1);
      await mudar(l, {
        etapa: 'analise_aprovada',
        garantia: {
          numero: `LOFT-${String(Math.floor(Math.random() * 90000) + 10000)}`,
          taxaMensalPct: 10,
          vigenciaFim: vig.toISOString().slice(0, 10),
          simulada: true,
        },
      });
      showToast('⚡ Simulação: Loft aprovou. Pode gerar o contrato.', 'success');
    } else {
      await mudar(l, { etapa: 'analise_recusada' });
      showToast('⚡ Simulação: Loft recusou.', 'info');
    }
  };

  /** Garantia aprovada → nasce o contrato em rascunho, pré-preenchido. */
  const gerarContrato = async (l: LeadLocacao) => {
    if (guarda() || !imobiliariaId) return;
    const im = imovelDe(l.imovelId);
    const refC = await addDoc(collection(db, 'locacaoContratos'), {
      ...CONTRATO_VAZIO,
      imobiliariaId,
      imovelId: l.imovelId, leadId: l.id,
      locadorNome: im?.locadorNome || '', locadorDoc: im?.locadorDoc || '',
      locadorEmail: im?.locadorEmail || '', locadorTelefone: im?.locadorTelefone || '',
      locadorPix: im?.locadorPix || '',
      locatarioNome: l.nome, locatarioTelefone: l.telefone, locatarioEmail: l.email,
      valorAluguel: im?.aluguel ?? null,
      valorCondominio: im?.condominio ?? null,
      valorIptuMensal: im?.iptuMensal ?? null,
      valorSeguroIncendio: im?.seguroIncendio ?? null,
      inicio: hojeYmd(),
      garantiaNumero: l.garantia?.numero || '',
      garantiaTaxaMensalPct: l.garantia?.taxaMensalPct ?? null,
      garantiaVigenciaFim: l.garantia?.vigenciaFim || '',
      garantiaSimulada: l.garantia?.simulada ?? false,
      criadoEm: serverTimestamp(),
    });
    await mudar(l, { etapa: 'convertido', contratoId: refC.id });
    showToast('Contrato criado em rascunho — confere os dados na aba Contratos.', 'success');
    aoConverter();
  };

  const visiveis = leads
    .filter((l) => filtro === 'todos' || !['convertido', 'perdido', 'analise_recusada'].includes(l.etapa))
    .sort((a, b) => {
      const peso: Record<string, number> = { alta: 0, media: 1, baixa: 2, '': 3 };
      return (peso[a.temperatura] ?? 3) - (peso[b.temperatura] ?? 3);
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setNovoAberto((v) => !v)} className={btnOuro}>+ Interessado</button>
        <button onClick={() => setFiltro(filtro === 'ativos' ? 'todos' : 'ativos')} className={btnGhost}>
          {filtro === 'ativos' ? 'mostrar encerrados' : 'só os ativos'}
        </button>
        <span className="text-[11px] text-text-secondary ml-auto">
          Quando os portais forem homologados, os interessados caem aqui sozinhos — com a temperatura avaliada por eles.
        </span>
      </div>

      {novoAberto && (
        <div className="al-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Campo rot="Nome" largura="sm:col-span-2"><input className={inputCls} value={nNome} onChange={(e) => setNNome(e.target.value)} /></Campo>
            <Campo rot="Telefone (WhatsApp)"><input className={inputCls} value={nTel} onChange={(e) => setNTel(e.target.value)} /></Campo>
            <Campo rot="E-mail"><input className={inputCls} value={nEmail} onChange={(e) => setNEmail(e.target.value)} /></Campo>
            <Campo rot="Imóvel de interesse" largura="sm:col-span-2">
              <select className={inputCls} value={nImovel} onChange={(e) => setNImovel(e.target.value)}>
                <option value="">— escolher —</option>
                {imoveis.map((i) => <option key={i.id} value={i.id}>{i.codigo} — {i.titulo}</option>)}
              </select>
            </Campo>
            <Campo rot="Observação" largura="sm:col-span-2"><input className={inputCls} value={nMsg} onChange={(e) => setNMsg(e.target.value)} placeholder="ligou do anúncio da OLX…" /></Campo>
          </div>
          <div className="flex gap-2">
            <button onClick={adicionar} className={btnOuro}>Adicionar na esteira</button>
            <button onClick={() => setNovoAberto(false)} className={btnGhost}>cancelar</button>
          </div>
        </div>
      )}

      {visiveis.length === 0 && (
        <div className="al-card p-8 text-center">
          <p className="text-[32px] mb-2">📥</p>
          <p className="text-sm text-text-secondary max-w-[52ch] mx-auto">
            Nenhum interessado na fila. Eles nascem dos anúncios (sozinhos, depois da homologação) ou do
            botão "+ Interessado".
          </p>
        </div>
      )}

      {visiveis.map((l) => {
        const et = ETAPAS_LEAD[l.etapa];
        const im = imovelDe(l.imovelId);
        const t = TEMP[l.temperatura];
        return (
          <div key={l.id} className="al-card p-4">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[14px] font-bold text-white">{l.nome}</span>
              {l.temperatura && <span className={`text-[11px] font-bold ${t.cor}`}>{t.simb} {l.temperatura}</span>}
              <span className="text-[11.5px] text-text-secondary">{im ? `${im.codigo} — ${im.titulo}` : 'imóvel removido'}</span>
              <span className="text-[11px] font-bold text-[#FFE9A6] ml-auto">{et.rotulo}</span>
            </div>
            <p className="text-[11.5px] text-text-secondary mt-0.5">
              {[l.telefone, l.email, l.origem !== 'manual' && `via ${l.origem}`,
                l.visitaEm && `visita ${fmtData(l.visitaEm)}`, l.corretorNome && `corretor: ${l.corretorNome}`,
                l.mensagem].filter(Boolean).join(' · ')}
            </p>
            {l.garantia && (
              <p className="text-[11.5px] mt-1">
                <span className="text-emerald-300 font-bold">Garantia {l.garantia.numero}</span>
                <span className="text-text-secondary"> · taxa {l.garantia.taxaMensalPct}%/mês do inquilino · vigência até {fmtData(l.garantia.vigenciaFim)}</span>
                {l.garantia.simulada && <span className="ml-2"><SeloSimulacao /></span>}
              </p>
            )}

            {/* as ações da etapa — a esteira anda por aqui */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {l.etapa === 'novo' && (visitaDe === l.id ? (
                <>
                  <input type="date" className={inputCls + ' !w-auto'} value={vData} onChange={(e) => setVData(e.target.value)} />
                  <input className={inputCls + ' !w-44'} placeholder="corretor responsável" value={vCorretor} onChange={(e) => setVCorretor(e.target.value)} />
                  <button onClick={() => agendarVisita(l)} className={btnOuro}>confirmar</button>
                  <button onClick={() => setVisitaDe(null)} className={btnGhost}>×</button>
                </>
              ) : (
                <button onClick={() => { setVisitaDe(l.id); setVData(''); setVCorretor(''); }} className={btnOuro}>📅 Agendar visita</button>
              ))}

              {l.etapa === 'visita_agendada' && (
                <>
                  <button onClick={() => mudar(l, { etapa: 'visita_feita' })} className={btnOuro}>✓ Visita aconteceu</button>
                  <button onClick={() => setVisitaDe(l.id)} className={btnGhost}>reagendar</button>
                  {visitaDe === l.id && (
                    <>
                      <input type="date" className={inputCls + ' !w-auto'} value={vData} onChange={(e) => setVData(e.target.value)} />
                      <button onClick={() => agendarVisita(l)} className={btnOuro}>ok</button>
                    </>
                  )}
                </>
              )}

              {l.etapa === 'visita_feita' && (
                <button onClick={() => { mudar(l, { etapa: 'analise_enviada' }); showToast('Ficha enviada pra análise. (Com a Loft integrada, isso vai sozinho.)', 'info'); }}
                  className={btnOuro}>📋 Enviar pra análise (Loft)</button>
              )}

              {l.etapa === 'analise_enviada' && (
                <>
                  <span className="text-[11.5px] text-text-secondary">Aguardando a Loft (resposta real em &lt;1 min quando integrar) —</span>
                  <button onClick={() => simularLoft(l, true)} className={btnSimula}>⚡ simular: aprovou</button>
                  <button onClick={() => simularLoft(l, false)} className={btnSimula}>⚡ simular: recusou</button>
                </>
              )}

              {l.etapa === 'analise_aprovada' && (
                <button onClick={() => gerarContrato(l)} className={btnOuro}>📄 Gerar contrato</button>
              )}

              {!['convertido', 'perdido'].includes(l.etapa) && (perdendo === l.id ? (
                <>
                  <input className={inputCls + ' !w-56'} placeholder="motivo" value={pMotivo} onChange={(e) => setPMotivo(e.target.value)} />
                  <button onClick={() => { mudar(l, { etapa: 'perdido', perdidoMotivo: pMotivo.trim() }); setPerdendo(null); setPMotivo(''); }} className={btnGhost + ' !text-rose-300'}>confirmar perda</button>
                  <button onClick={() => setPerdendo(null)} className={btnGhost}>×</button>
                </>
              ) : (
                <button onClick={() => setPerdendo(l.id)} className={btnGhost + ' ml-auto !text-rose-300/70'}>perdido</button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
