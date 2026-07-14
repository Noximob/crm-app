// Lógica de aceite de leads de anúncio (Meta Ads) — núcleo RACE-SAFE.
// Vários corretores podem clicar "Aceitar" ao mesmo tempo; a transação garante
// que só o primeiro leva o lead. Os demais recebem 'ja-pego' (sem erro na tela).

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

/** Doc da coleção adsLeads/{id} (contrato compartilhado com backend/admin). */
export interface AdsLead {
  id: string;
  nome: string;
  /** Telefone só com dígitos */
  telefone: string;
  origem: 'meta-form' | 'meta-whatsapp' | 'manual';
  campanhaNome?: string;
  anuncioNome?: string;
  formNome?: string;
  metaLeadId?: string;
  status: 'escalado' | 'geral' | 'aceito' | 'nao-atendido';
  corretorEscalado: string | null;
  escaladoEm: Timestamp;
  prazoAte: Timestamp;
  abriuGeralEm?: Timestamp;
  aceitoPor?: string;
  aceitoPorNome?: string;
  aceitoEm?: Timestamp;
  tempoAceiteSeg?: number;
  viaGeral?: boolean;
  leadId?: string;
  criadoEm: Timestamp;
  imobiliariaId: string;
}

export type AceitarAdsLeadResultado =
  | { status: 'ok'; leadId: string }
  | { status: 'ja-pego'; aceitoPorNome?: string };

interface AceitarAdsLeadParams {
  adsLeadId: string;
  uid: string;
  nomeCorretor: string;
  imobiliariaId: string;
  /** Primeira etapa do funil (stages[0] do PipelineStagesContext) */
  etapaInicial: string;
}

/**
 * Aceita um lead de anúncio de forma atômica:
 * - Se o lead já foi aceito (ou não existe mais), retorna 'ja-pego' — NUNCA lança pro usuário.
 * - Senão, NA MESMA transação: cria o doc em `leads` (mesmo shape do NewLeadModal)
 *   e marca o adsLead como 'aceito' apontando pro lead criado.
 */
export async function aceitarAdsLead({
  adsLeadId,
  uid,
  nomeCorretor,
  imobiliariaId,
  etapaInicial,
}: AceitarAdsLeadParams): Promise<AceitarAdsLeadResultado> {
  const adsLeadRef = doc(db, 'adsLeads', adsLeadId);

  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(adsLeadRef);

      if (!snap.exists()) {
        return { status: 'ja-pego' } as AceitarAdsLeadResultado;
      }

      const dados = snap.data() as Omit<AdsLead, 'id'>;

      if (dados.status === 'aceito') {
        return {
          status: 'ja-pego',
          aceitoPorNome: dados.aceitoPorNome,
        } as AceitarAdsLeadResultado;
      }

      const digitos = String(dados.telefone || '').replace(/\D/g, '');

      // Cria o lead no CRM com o MESMO shape que o NewLeadModal grava
      const novoLeadRef = doc(collection(db, 'leads'));
      transaction.set(novoLeadRef, {
        userId: uid,
        imobiliariaId,
        nome: dados.nome || '',
        telefone: digitos,
        whatsapp: digitos,
        email: '',
        etapa: etapaInicial,
        origem: dados.campanhaNome
          ? `Anúncio Meta · ${dados.campanhaNome}`
          : 'Anúncio Meta',
        origemTipo: 'anuncio-meta',
        createdAt: serverTimestamp(),
        tarefasPendentes: [],
        automacao: {
          status: 'inativa',
          nomeTratamento: null,
          dataInicio: null,
          dataCancelamento: null,
        },
      });

      // Tempo (em segundos) entre o escalonamento e o aceite — client-side, aceitável
      const escaladoMs =
        dados.escaladoEm instanceof Timestamp ? dados.escaladoEm.toMillis() : Date.now();
      const tempoAceiteSeg = Math.max(0, Math.round((Date.now() - escaladoMs) / 1000));

      transaction.update(adsLeadRef, {
        status: 'aceito',
        aceitoPor: uid,
        aceitoPorNome: nomeCorretor,
        aceitoEm: serverTimestamp(),
        viaGeral: dados.status === 'geral',
        tempoAceiteSeg,
        leadId: novoLeadRef.id,
      });

      return { status: 'ok', leadId: novoLeadRef.id } as AceitarAdsLeadResultado;
    });
  } catch (err) {
    // Conflito de transação (dois cliques simultâneos) ou permissão: trata como "já pego"
    // pra nunca estourar erro na cara do corretor.
    console.error('[adsLeads] Falha ao aceitar lead:', err);
    return { status: 'ja-pego' };
  }
}
