'use client';

/**
 * DADOS DO MODO ESPELHO — três perfis sintéticos que mostram a LEITURA da
 * análise: a campeã, o que trabalha e não converte, e o sumido. A estrutura
 * é idêntica à real (etapasHist carimbado, tarefas, vendas com leadId), então
 * a análise do corretor roda de verdade na demonstração.
 */
import {
  ETAPA_ENTRADA, ETAPA_EM_CONTATO, ETAPA_FECHADO, ETAPA_DESCARTADO,
} from '@/lib/circuito';
import type { RelLead, RelCorretor, RelVenda, AtividadeLead } from './logic';

const DIA = 24 * 60 * 60 * 1000;

export interface DadosDemo {
  leads: RelLead[];
  corretores: RelCorretor[];
  vendas: RelVenda[];
  atividade: Map<string, AtividadeLead>;
  selecionados: Set<string>;
}

export function dadosDemo(): DadosDemo {
  const agora = Date.now();
  const d = (dias: number) => ({ toMillis: () => agora - dias * DIA });
  const ymd = (dias: number) => {
    const dt = new Date(agora - dias * DIA);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const NOMES = ['Marina Souza', 'Pedro Alves', 'Júlia Castro', 'Rafael Nunes', 'Carla Dias', 'Tiago Rocha', 'Beatriz Lima'];
  const mkLead = (uid: string, etapa: string, i: number, extra: Partial<RelLead> = {}): RelLead => ({
    id: `${uid}-${i}`, userId: uid, etapa, nome: NOMES[i % NOMES.length],
    createdAt: d(30 + i), circuito: { desde: d(3 + (i % 20)), tentativas: 2, primeiroContatoEm: d(29 + i) },
    qualificacao: i % 3 === 0 ? {} : { finalidade: ['Moradia'] },
    anotacoes: i % 4 === 0 ? '' : 'conversa registrada',
    ...extra,
  } as RelLead);
  const trans = (de: string, para: string, dias: number) => ({ de, para, em: d(dias) });

  const perfis: { uid: string; nome: string; etapas: string[]; qualif: number; ativoHa: number; acessoHa: number }[] = [
    { uid: 'demo-1', nome: 'Ana (campeã)', etapas: [ETAPA_FECHADO, ETAPA_FECHADO, 'Negociação', 'Visita Feita', 'Meet Agendado', ETAPA_EM_CONTATO, ETAPA_EM_CONTATO], qualif: 0.9, ativoHa: 0, acessoHa: 0 },
    { uid: 'demo-2', nome: 'Bruno (trabalha, não fecha)', etapas: [ETAPA_EM_CONTATO, ETAPA_EM_CONTATO, ETAPA_EM_CONTATO, ETAPA_EM_CONTATO, 'Meet Agendado', ETAPA_DESCARTADO], qualif: 0.7, ativoHa: 1, acessoHa: 0 },
    { uid: 'demo-3', nome: 'Caio (sumido)', etapas: [ETAPA_ENTRADA, ETAPA_EM_CONTATO, ETAPA_EM_CONTATO, ETAPA_DESCARTADO, ETAPA_DESCARTADO], qualif: 0.1, ativoHa: 21, acessoHa: 18 },
  ];

  const leads: RelLead[] = [];
  const corretores: RelCorretor[] = [];
  const atividade = new Map<string, AtividadeLead>();

  perfis.forEach((p) => {
    corretores.push({ id: p.uid, nome: p.nome, tipoConta: 'corretor-vinculado', aprovado: true, lastActiveAt: d(p.acessoHa) });
    p.etapas.forEach((etapa, i) => {
      // a Ana movimentou o funil na última semana; o Bruno agendou e não fez; o Caio nada
      const hist =
        p.uid === 'demo-1' ? (
          etapa === ETAPA_FECHADO && i === 0 ? [trans(ETAPA_EM_CONTATO, 'Meet Agendado', 12), trans('Meet Agendado', 'Meet Feito', 9), trans('Negociação', ETAPA_FECHADO, 2)]
            : etapa === 'Negociação' ? [trans('Meet Agendado', 'Meet Feito', 5), trans('Visita Feita', 'Negociação', 3)]
              : etapa === 'Visita Feita' ? [trans('Meet Feito', 'Visita Agendada', 4), trans('Visita Agendada', 'Visita Feita', 2)]
                : etapa === 'Meet Agendado' ? [trans(ETAPA_EM_CONTATO, 'Meet Agendado', 1)]
                  : []
        ) : p.uid === 'demo-2' ? (
          // agendou há 10 dias e o meet nunca aconteceu — vira no-show nominal
          etapa === 'Meet Agendado' ? [trans(ETAPA_EM_CONTATO, 'Meet Agendado', 10)] : []
        ) : [];
      const l = mkLead(p.uid, etapa, i, {
        qualificacao: i / p.etapas.length < p.qualif ? { finalidade: ['Moradia'] } : {},
        ...(hist.length ? { etapasHist: hist } : {}),
        // um lead NOVO desta semana ainda sem 1º contato (lista nominal da velocidade)
        ...(p.uid === 'demo-2' && i === 3 ? { createdAt: d(2), circuito: { desde: d(2), tentativas: 0 } } : {}),
        ...(etapa === ETAPA_DESCARTADO ? { descartadoMotivo: i % 2 ? 'Sem perfil' : 'Comprou com outro', descartadoEm: d(5), circuito: { desde: d(5), tentativas: 1 } } : {}),
      });
      leads.push(l);
      const toques = Math.max(0, 6 - p.ativoHa);
      atividade.set(l.id, {
        eventos: Array.from({ length: toques }, (_, k) => ({ ms: agora - (p.ativoHa + (toques - 1 - k) * 2) * DIA, tipo: 'Ligação' })),
        tarefas: [{ id: `t-${l.id}`, tipo: 'Ligação', status: i % 3 === 0 ? 'pendente' : 'concluída', dueMs: agora - (i % 3 === 0 ? 4 : 10) * DIA, concluidaMs: i % 3 === 0 ? 0 : agora - (i % 2 ? 2 : 9) * DIA }],
      });
    });
  });

  const vendas: RelVenda[] = [
    { id: 'vd1', corretorUid: 'demo-1', leadId: 'demo-1-1', status: 'assinada', dataVenda: ymd(16), vgvLiquido: 800_000, comissaoBruta: 40_000, rateio: [{ papel: 'corretor', valor: 18_180 }] },
    { id: 'vd2', corretorUid: 'demo-1', leadId: 'demo-1-0', status: 'assinada', dataVenda: ymd(2), vgvLiquido: 650_000, comissaoBruta: 32_500, rateio: [{ papel: 'corretor', valor: 14_771 }] },
  ];

  return { leads, corretores, vendas, atividade, selecionados: new Set(perfis.map((p) => p.uid)) };
}
