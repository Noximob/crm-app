/**
 * Contagem automática do placar Meets & Visitas a partir das tarefas do CRM.
 *
 * Fonte única usada pela Área do administrador (recalcular/modo automático) e
 * pelo auto-refresh silencioso da home: períodos com `automatico: true` se
 * retroalimentam do CRM sem ninguém precisar lançar nada na mão.
 *
 * Abordagem (a mesma validada na tela do admin): busca os leads da imobiliária
 * (where imobiliariaId ==, índice simples) e lê a subcoleção leads/{id}/tarefas
 * com where('type','in',[Visita, Meet]) — nenhum índice composto necessário.
 * O intervalo de datas é filtrado no cliente (dueDate → YYYY-MM-DD local).
 * Tarefas canceladas não contam.
 */
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TIPO_TAREFA_MEET, TIPO_TAREFA_VISITA } from '@/lib/circuito';

export interface PeriodoMeetsLite {
  id: string;
  inicio: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
  automatico?: boolean;
  recalculadoEm?: any;
}

const dateToYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Conta as tarefas de Meet e Visita do CRM dentro do período, por corretor. */
export async function contarMeetsVisitasDoCrm(
  imobiliariaId: string,
  periodo: { inicio: string; fim: string }
): Promise<Record<string, number>> {
  const leadsSnap = await getDocs(
    query(collection(db, 'leads'), where('imobiliariaId', '==', imobiliariaId))
  );
  const leads = leadsSnap.docs
    .map((d) => ({ id: d.id, userId: (d.data() as any).userId as string | undefined }))
    .filter((l): l is { id: string; userId: string } => !!l.userId);

  const contadores: Record<string, number> = {};
  const CHUNK = 25; // lotes paralelos p/ não estourar conexões
  for (let i = 0; i < leads.length; i += CHUNK) {
    const lote = leads.slice(i, i + CHUNK);
    await Promise.all(
      lote.map(async (lead) => {
        const snap = await getDocs(
          query(collection(db, 'leads', lead.id, 'tarefas'), where('type', 'in', [TIPO_TAREFA_VISITA, TIPO_TAREFA_MEET]))
        );
        let n = 0;
        snap.forEach((t) => {
          const d = t.data() as any;
          if (d.status === 'cancelada') return;
          const due = d.dueDate;
          const dt: Date | null = due?.toDate ? due.toDate() : (due?.seconds ? new Date(due.seconds * 1000) : null);
          if (!dt) return;
          const ymd = dateToYmd(dt);
          if (ymd >= periodo.inicio && ymd <= periodo.fim) n++;
        });
        if (n > 0) contadores[lead.userId] = (contadores[lead.userId] || 0) + n;
      })
    );
  }
  return contadores;
}

/** Recalcula e grava os contadores do período (+ recalculadoEm, a trava do auto-refresh). */
export async function recalcularPeriodoMeets(
  imobiliariaId: string,
  periodo: PeriodoMeetsLite
): Promise<Record<string, number>> {
  const contadores = await contarMeetsVisitasDoCrm(imobiliariaId, periodo);
  await setDoc(
    doc(db, 'meetsVisitas', periodo.id),
    { contadores, recalculadoEm: serverTimestamp() },
    { merge: true }
  );
  return contadores;
}

/** Um agendamento que ENTROU na conta do placar — pra auditoria do admin. */
export interface AgendamentoContado {
  leadId: string;
  leadNome: string;
  tipo: string; // 'Meet' | 'Visita'
  dueMs: number;
  status: string; // 'pendente' | 'concluída'
  descricao: string;
}

/**
 * Lista os agendamentos de UM corretor: os que CONTAM no período (mesma regra
 * do contarMeetsVisitasDoCrm) e os FUTUROS fora do período — pra matar a dúvida
 * "cadê o meet do fulano?" (ex.: lead na etapa Meet com data na semana que vem
 * não conta nesta semana).
 */
export async function listarAgendamentosDoCorretor(
  imobiliariaId: string,
  corretorId: string,
  periodo: { inicio: string; fim: string }
): Promise<{ dentro: AgendamentoContado[]; fora: AgendamentoContado[] }> {
  const leadsSnap = await getDocs(query(
    collection(db, 'leads'),
    where('imobiliariaId', '==', imobiliariaId),
    where('userId', '==', corretorId)
  ));
  const dentro: AgendamentoContado[] = [];
  const fora: AgendamentoContado[] = [];
  const CHUNK = 25;
  const docs = leadsSnap.docs;
  for (let i = 0; i < docs.length; i += CHUNK) {
    await Promise.all(docs.slice(i, i + CHUNK).map(async (leadDoc) => {
      const leadNome = String((leadDoc.data() as any).nome || 'Sem nome');
      const snap = await getDocs(
        query(collection(db, 'leads', leadDoc.id, 'tarefas'), where('type', 'in', [TIPO_TAREFA_VISITA, TIPO_TAREFA_MEET]))
      );
      snap.forEach((t) => {
        const d = t.data() as any;
        if (d.status === 'cancelada') return;
        const due = d.dueDate;
        const dt: Date | null = due?.toDate ? due.toDate() : (due?.seconds ? new Date(due.seconds * 1000) : null);
        if (!dt) return;
        const ymd = dateToYmd(dt);
        const item: AgendamentoContado = {
          leadId: leadDoc.id,
          leadNome,
          tipo: String(d.type || ''),
          dueMs: dt.getTime(),
          status: String(d.status || 'pendente'),
          descricao: String(d.description || ''),
        };
        if (ymd >= periodo.inicio && ymd <= periodo.fim) dentro.push(item);
        else if (ymd > periodo.fim) fora.push(item); // futuros — contam na semana deles
      });
    }));
  }
  dentro.sort((a, b) => a.dueMs - b.dueMs);
  fora.sort((a, b) => a.dueMs - b.dueMs);
  return { dentro, fora };
}

const UMA_HORA_MS = 60 * 60 * 1000;

/**
 * Garante que existe um período cobrindo HOJE: se não houver, cria a semana
 * atual (segunda → domingo) já no modo automático e conta na hora.
 * - ID determinístico ({imobiliariaId}_{inicio}) + setDoc merge → dois usuários
 *   abrindo a home ao mesmo tempo não criam duplicata.
 * - Se o admin criou um período custom que sobrepõe a semana, respeita e não cria.
 */
export async function garantirPeriodoSemanaAtual(
  imobiliariaId: string,
  periodos: PeriodoMeetsLite[]
): Promise<void> {
  const hoje = new Date();
  const hojeYmd = dateToYmd(hoje);
  if (periodos.some((p) => p.inicio && p.fim && p.inicio <= hojeYmd && hojeYmd <= p.fim)) return;

  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const dom = new Date(seg);
  dom.setDate(seg.getDate() + 6);
  const inicio = dateToYmd(seg);
  const fim = dateToYmd(dom);
  // Não sobrepor nenhum período existente (intervalos [a1,a2]/[b1,b2] cruzam se a1<=b2 && b1<=a2)
  if (periodos.some((p) => p.inicio && p.fim && inicio <= p.fim && p.inicio <= fim)) return;

  const id = `${imobiliariaId}_${inicio}`;
  try {
    await setDoc(
      doc(db, 'meetsVisitas', id),
      { imobiliariaId, inicio, fim, contadores: {}, automatico: true, autoCriado: true, createdAt: serverTimestamp() },
      { merge: true }
    );
    await recalcularPeriodoMeets(imobiliariaId, { id, inicio, fim, automatico: true });
  } catch (e) {
    console.error('garantirPeriodoSemanaAtual: falha silenciosa', e);
  }
}

/**
 * Auto-refresh silencioso do placar: recalcula períodos AUTOMÁTICOS e ATIVOS
 * cujo último recálculo passou de 1 hora. Qualquer tela pode chamar (a home
 * chama ao carregar); erros são engolidos — o placar só fica um pouco defasado.
 * A trava `recalculadoEm` evita estouro de leitura: no máximo 1 recálculo/hora
 * por período, independente de quantos corretores abrirem a home.
 */
export async function autoRecalcularMeetsVisitas(
  imobiliariaId: string,
  periodos: PeriodoMeetsLite[]
): Promise<void> {
  const hoje = dateToYmd(new Date());
  for (const p of periodos) {
    if (!p?.automatico) continue;
    if (!p.inicio || !p.fim || !(p.inicio <= hoje && hoje <= p.fim)) continue;
    const r = p.recalculadoEm as { toMillis?: () => number; seconds?: number } | undefined;
    const ultMs = r?.toMillis ? r.toMillis() : (typeof r?.seconds === 'number' ? r.seconds * 1000 : 0);
    if (Date.now() - ultMs < UMA_HORA_MS) continue;
    try {
      await recalcularPeriodoMeets(imobiliariaId, p);
    } catch (e) {
      console.error('autoRecalcularMeetsVisitas: falha silenciosa', e);
    }
  }
}
