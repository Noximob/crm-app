/**
 * Motor de ações do circuito — compartilhado entre a página do lead e o
 * vigia global de atendimento. Uma ação composta (concluir/cancelar/criar
 * tarefa + etapa + interação + campos do circuito) vira UM writeBatch.
 */
import { arrayUnion, collection, doc, getDocs, limit, query, serverTimestamp, Timestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TarefaPendente, fetchPendentesDaSubcolecao } from '@/lib/leadTasks';
import { etapaAposAcao, mapEtapaCircuito } from '@/lib/circuito';
import type { AcaoCircuito } from '@/components/atendimento/AtendimentoOverlay';

export interface LeadParaAcao {
  id: string;
  etapa?: string;
  userId?: string;
  nome?: string;
  circuito?: { tentativas?: number; contatosFeitos?: number; primeiroContatoEm?: any };
}

export type ResultadoAcao = { ok: true; transferiuPara?: string } | { ok: false; erro: unknown };

export async function executarAcaoCircuito(params: {
  lead: LeadParaAcao;
  acao: AcaoCircuito;
  /** Tarefas pendentes atuais (espelho/snapshot); null → busca a subcoleção. */
  pendentesAtuais: TarefaPendente[] | null;
  imobiliariaId: string;
  currentUid: string;
  /** Nome de quem fez a ação — vira autoria na interação (histórico real do cliente). */
  autorNome?: string;
}): Promise<ResultadoAcao> {
  const { lead, acao, imobiliariaId, currentUid, autorNome } = params;
  try {
    const leadRef = doc(db, 'leads', lead.id);
    const tasksCol = collection(db, 'leads', lead.id, 'tarefas');
    const interCol = collection(db, 'leads', lead.id, 'interactions');
    const batch = writeBatch(db);

    const base: TarefaPendente[] = params.pendentesAtuais ?? await fetchPendentesDaSubcolecao(lead.id);
    let pendentes = [...base];
    // Só reescreve o espelho tarefasPendentes quando a ação REALMENTE mexe em
    // tarefa — senão uma base obsoleta (snapshot atrasado) poderia ressuscitar
    // ou derrubar tarefas de outras gravações.
    const mexeuEmTarefa = !!(acao.concluirTaskId || acao.cancelarTaskId || acao.cancelarTodasPendentes || acao.novaTarefa);

    // Carimbo de fechamento da tarefa: sem ele o "tempo pra fazer o follow-up"
    // só dava pra deduzir por um vestígio na timeline (e sumia quando faltava).
    const fechamento = { finalizadaEm: serverTimestamp(), finalizadaPor: currentUid || null, finalizadaPorNome: autorNome || null };
    if (acao.concluirTaskId) {
      batch.update(doc(tasksCol, acao.concluirTaskId), { status: 'concluída', concluidaEm: serverTimestamp(), ...fechamento });
      pendentes = pendentes.filter(t => t.id !== acao.concluirTaskId);
    }
    if (acao.cancelarTaskId) {
      batch.update(doc(tasksCol, acao.cancelarTaskId), { status: 'cancelada', canceladaEm: serverTimestamp(), ...fechamento });
      pendentes = pendentes.filter(t => t.id !== acao.cancelarTaskId);
    }
    if (acao.cancelarTodasPendentes) {
      pendentes.forEach(t => batch.update(doc(tasksCol, t.id), { status: 'cancelada', canceladaEm: serverTimestamp(), ...fechamento }));
      pendentes = [];
    }
    let novaTaskId: string | undefined;
    if (acao.novaTarefa) {
      const ref = doc(tasksCol);
      novaTaskId = ref.id;
      batch.set(ref, {
        description: acao.novaTarefa.description,
        type: acao.novaTarefa.type,
        dueDate: acao.novaTarefa.dueDate,
        status: 'pendente',
      });
      pendentes = [...pendentes, { id: ref.id, description: acao.novaTarefa.description, type: acao.novaTarefa.type, dueDate: acao.novaTarefa.dueDate }];
    }

    const leadUpdate: Record<string, any> = mexeuEmTarefa ? { tarefasPendentes: pendentes } : {};

    /**
     * Carimbo de CADA transição de etapa (antes só existia `circuito.desde`, da
     * etapa atual — o caminho percorrido se perdia). Com isso dá pra medir
     * quanto tempo o cliente ficou em cada casa do funil.
     * Usa Timestamp.now() porque serverTimestamp() não é aceito dentro de array.
     */
    const marcarEtapa = (de: string, para: string) => {
      leadUpdate.etapasHist = arrayUnion({
        de, para,
        em: Timestamp.now(),
        ...(currentUid ? { por: currentUid } : {}),
        ...(autorNome ? { porNome: autorNome } : {}),
      });
    };

    if (acao.forcarEtapa) {
      // "Recomeçar busca": fura a catraca por decisão explícita do corretor
      // (o motivo vai junto na interação da ação).
      if (lead.etapa !== acao.forcarEtapa) {
        leadUpdate.etapa = acao.forcarEtapa;
        leadUpdate['circuito.desde'] = serverTimestamp();
        marcarEtapa(mapEtapaCircuito(lead.etapa), acao.forcarEtapa);
      }
    } else if (acao.novaEtapa) {
      // CATRACA: a etapa é o estágio máximo alcançado — a ação propõe um alvo,
      // mas o cliente nunca anda pra trás (follow-up em Negociação fica Negociação).
      const atualNorm = mapEtapaCircuito(lead.etapa);
      const etapaFinal = etapaAposAcao(atualNorm, acao.novaEtapa);
      if (etapaFinal !== atualNorm) {
        leadUpdate.etapa = etapaFinal;
        leadUpdate['circuito.desde'] = serverTimestamp();
        marcarEtapa(atualNorm, etapaFinal);
      } else if (lead.etapa !== etapaFinal) {
        // etapa legada equivalente → persiste o nome novo sem resetar o "desde"
        leadUpdate.etapa = etapaFinal;
      }
    }
    if (acao.circuitoTentativas === 'inc') leadUpdate['circuito.tentativas'] = (lead.circuito?.tentativas || 0) + 1;
    if (acao.circuitoTentativas === 'zero') leadUpdate['circuito.tentativas'] = 0;
    if (acao.contatoEfetivo) {
      // Conversa de verdade (atendeu / respondeu / falei) — alimenta o rodízio
      // do 1º contato e, no futuro, a régua dos 7 follow-ups.
      leadUpdate['circuito.contatosFeitos'] = (lead.circuito?.contatosFeitos || 0) + 1;
      if (!lead.circuito?.primeiroContatoEm) {
        const tentativaQueDeuCerto = (lead.circuito?.tentativas || 0) + 1;
        leadUpdate['circuito.primeiroContatoEm'] = serverTimestamp();
        leadUpdate['circuito.tentativasAtePrimeiroContato'] = tentativaQueDeuCerto;
        batch.set(doc(interCol), {
          type: 'Contato',
          notes: `🎯 1º contato feito na ${tentativaQueDeuCerto}ª tentativa`,
          timestamp: serverTimestamp(),
          circuito: true,
          ...(autorNome ? { por: autorNome } : {}),
        });
      }
    }
    if (acao.descartadoMotivo) {
      leadUpdate.descartadoMotivo = acao.descartadoMotivo;
      leadUpdate.descartadoEm = serverTimestamp();
      // Quem descartou fica registrado no lead — é assim que o bolsão do admin agrupa
      leadUpdate.descartadoPor = currentUid;
    }
    if (acao.vendaValor) {
      // NÃO espelhar o valor no doc do lead: /leads/{id} tem leitura anônima
      // (TV do saguão) e valor de venda é dado financeiro — mora SÓ em /vendas
      // (que exige login). No lead fica apenas o carimbo de quando fechou.
      leadUpdate.vendaEm = serverTimestamp();
      // Passo 1 do Financeiro: a venda nasce AQUI, no mesmo batch (sem falha
      // parcial). Vai como pendente_confirmacao — o admin completa gerente/SDR/
      // agenciador/permuta e oficializa o rateio na tela Financeiro. Nada conta
      // em DRE/meta antes disso.
      const d = new Date();
      const dataVenda = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      batch.set(doc(collection(db, 'vendas')), {
        imobiliariaId,
        leadId: lead.id,
        leadNome: lead.nome || '',
        corretorUid: lead.userId || currentUid, // dono do lead = quem vendeu
        // nome só quando o OPERADOR é o dono — um admin fechando o pop-up de
        // lead alheio gravaria o nome errado; o Financeiro resolve pelo uid
        corretorNome: (!lead.userId || lead.userId === currentUid) ? (autorNome || '') : '',
        valorBruto: acao.vendaValor,
        valorPermuta: 0,
        parceriaPct: 0,
        tipoProduto: acao.vendaDetalhes?.tipoProduto || 'lancamento',
        origem: acao.vendaDetalhes?.origem || 'outro',
        construtora: acao.vendaDetalhes?.construtora || '',
        empreendimento: acao.vendaDetalhes?.empreendimento || '',
        status: 'pendente_confirmacao',
        dataVenda,
        criadoEm: serverTimestamp(),
        criadoPor: currentUid,
      });
    }

    let transferiuPara: string | undefined;
    if (acao.transferirParaGestor) {
      // "O lead vai pro bolsão do gestor" — descarte transfere pra conta da imobiliária
      try {
        const donoSnap = await getDocs(query(
          collection(db, 'usuarios'),
          where('imobiliariaId', '==', imobiliariaId),
          where('tipoConta', '==', 'imobiliaria'),
          limit(1)
        ));
        const donoUid = donoSnap.docs[0]?.id;
        if (donoUid && donoUid !== lead.userId) {
          leadUpdate.userId = donoUid;
          leadUpdate.descartadoPor = currentUid;
          transferiuPara = donoUid;
        }
      } catch {
        // sem dono localizável, o lead fica com o corretor mesmo (etapa Descartado)
      }
    }
    if (Object.keys(leadUpdate).length > 0) batch.update(leadRef, leadUpdate);

    batch.set(doc(interCol), {
      type: acao.interacao.type,
      notes: acao.interacao.notes,
      timestamp: serverTimestamp(),
      circuito: true,
      ...(autorNome ? { por: autorNome } : {}),
      ...(novaTaskId ? { taskId: novaTaskId } : {}),
    });

    await batch.commit();
    return { ok: true, transferiuPara };
  } catch (erro) {
    console.error('Erro no circuito:', erro);
    return { ok: false, erro };
  }
}
