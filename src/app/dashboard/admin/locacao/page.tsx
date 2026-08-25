'use client';

/**
 * SETOR DE LOCAÇÃO — a área do administrador, na ordem da esteira.
 *
 * As abas SÃO as fases do documento "Esteira da Locação":
 *
 *   🏠 IMÓVEIS      etapas 1–2 · captação e divulgação
 *   📥 ESTEIRA      etapas 3–5 · leads → visita → garantia (Loft)
 *   📄 CONTRATOS    etapas 6–11 · assinatura → vistoria → ativo → saída
 *   💰 FINANCEIRO   etapas 8–9 · cobrança e repasse, com a trava entre eles
 *   🔌 INTEGRAÇÕES  o quadro de tomadas: o que está pronto e o que falta
 *
 * Nada de conta externa foi contratado ainda, então as peças de terceiros
 * (ClickSign, Loft, Asaas, portais) rodam em SIMULAÇÃO explícita — botões
 * âmbar com raio. O fluxo é o real; a mão que move é que é de mentira.
 *
 * Esta página só carrega os dados e distribui; o trabalho vive nas abas.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  IMOVEL_VAZIO, CONTRATO_VAZIO, LEAD_VAZIO, alertasDoContrato,
  type ImovelLocacao, type ContratoLocacao, type LeadLocacao, type MovimentoLocacao,
} from '@/lib/locacao';
import { pillCls } from './ui';
import AbaImoveis from './imoveis';
import AbaEsteira from './esteira';
import AbaContratos from './contratos';
import AbaFinanceiro from './financeiro';
import AbaIntegracoes from './integracoes';

type Aba = 'imoveis' | 'esteira' | 'contratos' | 'financeiro' | 'integracoes';

export default function LocacaoPage() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  const [aba, setAba] = useState<Aba>('imoveis');
  const [imoveis, setImoveis] = useState<ImovelLocacao[]>([]);
  const [leads, setLeads] = useState<LeadLocacao[]>([]);
  const [contratos, setContratos] = useState<ContratoLocacao[]>([]);
  const [movimentos, setMovimentos] = useState<MovimentoLocacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!imobiliariaId || isEspelhoDemo) { setCarregando(false); return; }
    try {
      const q = (col: string) => getDocs(query(collection(db, col), where('imobiliariaId', '==', imobiliariaId)));
      const [si, sl, sc, sm] = await Promise.all([
        q('locacaoImoveis'), q('locacaoLeads'), q('locacaoContratos'), q('locacaoMovimentos'),
      ]);
      // espalha os VAZIO por baixo: documento antigo sem um campo novo não quebra a tela
      setImoveis(si.docs.map((d) => ({ ...IMOVEL_VAZIO, id: d.id, imobiliariaId, ...(d.data() as Partial<ImovelLocacao>) } as ImovelLocacao)));
      setLeads(sl.docs.map((d) => ({ ...LEAD_VAZIO, id: d.id, imobiliariaId, ...(d.data() as Partial<LeadLocacao>) } as LeadLocacao)));
      setContratos(sc.docs.map((d) => ({ ...CONTRATO_VAZIO, id: d.id, imobiliariaId, ...(d.data() as Partial<ContratoLocacao>) } as ContratoLocacao)));
      setMovimentos(sm.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MovimentoLocacao, 'id'>) })));
    } catch (e) { console.error('locacao carregar:', e); }
    setCarregando(false);
  }, [imobiliariaId, isEspelhoDemo]);
  useEffect(() => { recarregar(); }, [recarregar]);

  /** o contato que assina o feed VRSync — sai do cadastro do usuário admin */
  const contatoFeed = useMemo(() => ({
    nome: 'Nox Imóveis',
    email: String((userData as { email?: string } | null)?.email || 'contato@noximobiliaria.com.br'),
    telefone: '(47) 99999-0000',
  }), [userData]);

  // os números das abas: trabalho esperando gente
  const badges = useMemo(() => {
    const leadsAtivos = leads.filter((l) => !['convertido', 'perdido', 'analise_recusada'].includes(l.etapa)).length;
    const contratosComAcao = contratos.filter((c) => !['ativo', 'encerrado'].includes(c.status)).length
      + contratos.reduce((s, c) => s + alertasDoContrato(c).length, 0);
    const hoje = new Date().toISOString().slice(0, 10);
    const financeiroPendente = movimentos.filter((m) =>
      (m.statusCobranca !== 'paga' && m.vencimento < hoje) || m.statusRepasse === 'liberado').length;
    return { esteira: leadsAtivos, contratos: contratosComAcao, financeiro: financeiroPendente };
  }, [leads, contratos, movimentos]);

  const Badge = ({ n }: { n: number }) => n > 0
    ? <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold bg-[#FF1E56] text-white">{n}</span>
    : null;

  if (carregando) {
    return <div className="min-h-screen py-8 px-4"><div className="max-w-4xl mx-auto al-card p-8 text-center text-sm text-text-secondary">Carregando o setor de locação…</div></div>;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto mb-5">
        <span className="gx-tag mb-2 inline-flex"><span>Setor de Locação</span></span>
        <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em]">Locação</h1>
        <p className="text-text-secondary text-sm mt-1 mb-3 max-w-[70ch]">
          A esteira completa: capta → anuncia → interessado → garantia → contrato → vistoria → chave →
          cobrança → repasse. O que depende de conta externa roda em <b className="text-amber-300">simulação (⚡)</b> até
          as integrações ligarem.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setAba('imoveis')} className={pillCls(aba === 'imoveis')}>🏠 Imóveis</button>
          <button type="button" onClick={() => setAba('esteira')} className={pillCls(aba === 'esteira')}>📥 Esteira<Badge n={badges.esteira} /></button>
          <button type="button" onClick={() => setAba('contratos')} className={pillCls(aba === 'contratos')}>📄 Contratos<Badge n={badges.contratos} /></button>
          <button type="button" onClick={() => setAba('financeiro')} className={pillCls(aba === 'financeiro')}>💰 Financeiro<Badge n={badges.financeiro} /></button>
          <button type="button" onClick={() => setAba('integracoes')} className={pillCls(aba === 'integracoes')}>🔌 Integrações</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {aba === 'imoveis' && (
          <AbaImoveis imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo}
            imoveis={imoveis} contatoFeed={contatoFeed} recarregar={recarregar} />
        )}
        {aba === 'esteira' && (
          <AbaEsteira imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo}
            leads={leads} imoveis={imoveis} recarregar={recarregar}
            aoConverter={() => setAba('contratos')} />
        )}
        {aba === 'contratos' && (
          <AbaContratos imobiliariaId={imobiliariaId} isEspelhoDemo={isEspelhoDemo}
            contratos={contratos} imoveis={imoveis} movimentos={movimentos} recarregar={recarregar} />
        )}
        {aba === 'financeiro' && (
          <AbaFinanceiro isEspelhoDemo={isEspelhoDemo}
            movimentos={movimentos} contratos={contratos} imoveis={imoveis} recarregar={recarregar} />
        )}
        {aba === 'integracoes' && <AbaIntegracoes />}
      </div>
    </div>
  );
}
