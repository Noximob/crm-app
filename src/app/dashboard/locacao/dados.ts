'use client';

/**
 * OS DADOS DA ÁREA DE LOCAÇÃO — um hook só, usado pelas três páginas
 * (Imóveis, Locações e Mensagens), pra que todas enxerguem o mesmo mundo:
 * as abas de qualquer página mostram os contadores das outras duas.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  IMOVEL_VAZIO, LOCACAO_VAZIA, ETAPAS_IMOVEL, ETAPAS_LOCACAO,
  alertasDaLocacao, hojeYmd,
  type ImovelLocacao, type Locacao, type Movimento, type Chamado, type MensagemCliente,
} from '@/lib/locacao';

export function useDadosLocacao() {
  const { userData, isEspelhoDemo } = useAuth();
  const imobiliariaId = userData?.imobiliariaId;

  const [imoveis, setImoveis] = useState<ImovelLocacao[]>([]);
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [mensagens, setMensagens] = useState<MensagemCliente[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!imobiliariaId || isEspelhoDemo) { setCarregando(false); return; }
    try {
      const q = (col: string) => getDocs(query(collection(db, col), where('imobiliariaId', '==', imobiliariaId)));
      const [si, sl, sm] = await Promise.all([q('locacaoImoveis'), q('locacaoLocacoes'), q('locacaoMovimentos')]);
      setImoveis(si.docs.map((d) => ({ ...IMOVEL_VAZIO, id: d.id, imobiliariaId, ...(d.data() as Partial<ImovelLocacao>) } as ImovelLocacao)));
      setLocacoes(sl.docs.map((d) => ({ ...LOCACAO_VAZIA, id: d.id, imobiliariaId, ...(d.data() as Partial<Locacao>) } as Locacao)));
      setMovimentos(sm.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Movimento, 'id'>) })));
      // coleções mais novas podem ainda não existir — não derrubam as outras
      try {
        const sc = await q('locacaoChamados');
        setChamados(sc.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Chamado, 'id'>) })));
      } catch { /* ok */ }
      try {
        const sg = await q('locacaoMensagens');
        setMensagens(sg.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MensagemCliente, 'id'>) })));
      } catch { /* ok */ }
    } catch (e) { console.error('locacao:', e); }
    setCarregando(false);
  }, [imobiliariaId, isEspelhoDemo]);
  useEffect(() => { recarregar(); }, [recarregar]);

  /**
   * O que está esperando UMA AÇÃO NOSSA em cada aba — os números que as
   * abas mostram. Não é "quantos existem", é "onde a bola está comigo".
   */
  const abas = useMemo(() => {
    const hoje = hojeYmd();
    const emAndamento = locacoes.filter((l) => l.etapa !== 'encerrada' && l.etapa !== 'perdida');
    const chamadosAbertos = chamados.filter((c) => c.status !== 'resolvido');
    const recadosPendentes = mensagens.filter((m) => !m.tratadaEm);
    return {
      imoveis: {
        total: imoveis.length,
        meus: imoveis.filter((i) => ETAPAS_IMOVEL[i.etapa]?.comQuem === 'nós' && i.etapa !== 'pausado').length,
      },
      // o CRM cuida de TODO lead vivo; as Locações só de quem já FECHOU
      crm: {
        total: emAndamento.length,
        meus: emAndamento.filter((l) => (l.crmEtapa || 'entrada') === 'entrada').length,
      },
      locacoes: {
        total: emAndamento.filter((l) => l.etapa !== 'interessado').length,
        meus: emAndamento.filter((l) => {
          if (l.etapa === 'interessado') return false;   // bola do CRM
          if (ETAPAS_LOCACAO[l.etapa]?.comQuem === 'nós') return true;
          if (alertasDaLocacao(l).length) return true;
          return movimentos.some((m) => m.locacaoId === l.id && m.statusCobranca !== 'paga' && m.vencimento < hoje);
        }).length,
      },
      mensagens: {
        total: chamados.length + mensagens.length,
        meus: chamadosAbertos.length + recadosPendentes.length,
      },
      cobranca: {
        // o que há pra acompanhar: as competências do mês + tudo que atrasou
        total: movimentos.filter((m) => m.statusCobranca !== 'paga'
          && (m.competencia === hoje.slice(0, 7) || m.vencimento < hoje)).length,
        // o que espera ação nossa: cobrar atraso e soltar repasse
        meus: movimentos.filter((m) => (m.statusCobranca !== 'paga' && m.vencimento < hoje)
          || m.statusRepasse === 'liberado').length,
      },
    };
  }, [imoveis, locacoes, movimentos, chamados, mensagens]);

  return {
    imobiliariaId, isEspelhoDemo,
    imoveis, locacoes, movimentos, chamados, mensagens,
    carregando, recarregar, abas,
  };
}
