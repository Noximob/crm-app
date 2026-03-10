/**
 * Dados mock para o modo Espelho (demonstração). Não usa Firestore.
 * Usado quando o usuário entra com login/senha Espelho.
 */

import { Timestamp } from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';
import { ESPELHO_DEMO_UID } from '@/lib/constants';

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const in2Days = new Date(today);
in2Days.setDate(in2Days.getDate() + 2);

function ts(d: Date) {
  return Timestamp.fromDate(d);
}

// --- Nomes e dados realistas para leads ---
const NOMES = [
  'Ana Paula Silva', 'Bruno Mendes', 'Carla Oliveira', 'Diego Ferreira', 'Elena Costa',
  'Fernando Lima', 'Gabriela Santos', 'Henrique Alves', 'Isabela Rocha', 'João Pedro Souza',
  'Karina Martins', 'Leonardo Dias', 'Mariana Pinto', 'Nicolas Barbosa', 'Patricia Gomes',
  'Rafael Teixeira', 'Sandra Ribeiro', 'Thiago Nascimento', 'Vanessa Carvalho', 'William Araújo',
  'Yasmin Correia', 'Zé Carlos Nunes', 'Amanda Castro', 'Bernardo Lopes', 'Camila Moreira',
  'Daniel Pereira', 'Érica Nogueira', 'Fábio Cavalcanti', 'Giovana Freitas', 'Hugo Macedo',
  'Ingrid Soares', 'Julio Cesar Melo', 'Larissa Cardoso', 'Marcos Vinicius Azevedo',
  'Natália Cunha', 'Otávio Rodrigues', 'Paula Andrade', 'Ricardo Batista', 'Simone Campos',
  'Tiago Miranda', 'Ursula Costa', 'Vitor Hugo Reis', 'Wanessa Farias', 'Xavier Monteiro',
  'Yuri Fernandes', 'Zilda Vasconcelos', 'Adriana Tavares', 'Breno Siqueira', 'Cintia Moraes',
];
const TEL_PREFIXES = ['11', '21', '31', '41', '51', '61', '71', '81', '19', '27'];
function tel() {
  const p = TEL_PREFIXES[Math.floor(Math.random() * TEL_PREFIXES.length)];
  return `(${p}) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
}
const QUALIFICACAO_KEYS = ['finalidade', 'estagio', 'quartos', 'localizacao', 'tipo', 'valor'];
const QUAL_VALUES: Record<string, string[]> = {
  finalidade: ['Residencial', 'Investimento', 'Comercial'],
  estagio: ['Pronto', 'Em obras', 'Lançamento'],
  quartos: ['1', '2', '3', '4'],
  localizacao: ['Centro', 'Zona Sul', 'Zona Norte', 'Praia', 'Interior'],
  tipo: ['Apartamento', 'Casa', 'Cobertura', 'Sobrado'],
  valor: ['Até 500k', '500k - 1M', '1M - 2M', 'Acima de 2M'],
};

export interface DemoTask {
  id: string;
  description: string;
  type: 'Ligação' | 'WhatsApp' | 'Visita';
  dueDate: Timestamp;
  status: 'pendente' | 'concluída' | 'cancelada';
}

export interface DemoLead {
  id: string;
  nome: string;
  telefone: string;
  etapa: string;
  userId: string;
  createdAt: Timestamp;
  qualificacao?: Record<string, string | string[]>;
  tasks?: DemoTask[];
}

function buildDemoLeads(): DemoLead[] {
  const leads: DemoLead[] = [];
  const statuses: ('pendente' | 'concluída' | 'cancelada')[] = ['pendente', 'pendente', 'pendente', 'concluída', 'cancelada'];
  for (let i = 0; i < NOMES.length; i++) {
    const etapa = PIPELINE_STAGES[i % PIPELINE_STAGES.length];
    const numTasks = Math.floor(Math.random() * 4);
    const tasks: DemoTask[] = [];
    for (let t = 0; t < numTasks; t++) {
      const dayOffset = t === 0 ? -1 : (t === 1 ? 0 : 1);
      const due = new Date(today);
      due.setDate(due.getDate() + dayOffset);
      due.setHours(10 + t, 0, 0, 0);
      tasks.push({
        id: `task-${i}-${t}`,
        description: ['Ligar para cliente', 'Enviar material no WhatsApp', 'Agendar visita'][t % 3],
        type: ['Ligação', 'WhatsApp', 'Visita'][t % 3],
        dueDate: ts(due),
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
    }
    const qualificacao: Record<string, string | string[]> = {};
    QUALIFICACAO_KEYS.forEach((k, idx) => {
      const opts = QUAL_VALUES[k];
      if (opts && Math.random() > 0.3) qualificacao[k] = opts[idx % opts.length];
    });
    const created = new Date(today);
    created.setDate(created.getDate() - Math.floor(Math.random() * 60));
    leads.push({
      id: `demo-lead-${i + 1}`,
      nome: NOMES[i],
      telefone: tel(),
      etapa,
      userId: ESPELHO_DEMO_UID,
      createdAt: ts(created),
      qualificacao: Object.keys(qualificacao).length ? qualificacao : undefined,
      tasks,
    });
  }
  return leads;
}

const DEMO_LEADS = buildDemoLeads();

/** Retorna leads mock com taskStatus calculado (igual ao CRM). */
export function getDemoLeads(): (DemoLead & { taskStatus: string })[] {
  const getTaskStatusInfo = (tasks: DemoTask[]): string => {
    if (!tasks || tasks.length === 0) return 'Sem tarefa';
    const pendentes = tasks.filter(t => t.status === 'pendente');
    if (pendentes.length === 0) return 'Sem tarefa';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const hasOverdue = pendentes.some(task => {
      const d = task.dueDate.toDate();
      d.setHours(0, 0, 0, 0);
      return d < now;
    });
    if (hasOverdue) return 'Tarefa em Atraso';
    const hasToday = pendentes.some(task => {
      const d = task.dueDate.toDate();
      d.setHours(0, 0, 0, 0);
      return d.getTime() === now.getTime();
    });
    if (hasToday) return 'Tarefa do Dia';
    return 'Tarefa Futura';
  };
  return DEMO_LEADS.map(lead => ({
    ...lead,
    taskStatus: getTaskStatusInfo(lead.tasks || []),
  }));
}

export function getDemoLeadById(id: string): DemoLead | undefined {
  return DEMO_LEADS.find(l => l.id === id);
}

// --- Agenda: eventos do dia (agora / em breve / depois) ---
const TIPOS_AGENDA = ['reuniao', 'evento', 'treinamento', 'ligacao-ativa', 'visita', 'outro'] as const;
const TITULOS_AGENDA = [
  'Reunião com construtora', 'Ligação de follow-up', 'Visita ao apartamento modelo',
  'Treinamento de vendas', 'Call com cliente', 'Apresentação de proposta',
  'Almoço com parceiro', 'Evento de lançamento', 'Revisão de pipeline',
];
function buildAgendaImobiliaria() {
  const items: any[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + (i % 7));
    d.setHours(8 + (i % 10), (i % 2) * 30, 0, 0);
    const fim = new Date(d);
    fim.setHours(fim.getHours() + 1, 0, 0, 0);
    items.push({
      id: `demo-agenda-${i}`,
      titulo: TITULOS_AGENDA[i % TITULOS_AGENDA.length],
      tipo: TIPOS_AGENDA[i % TIPOS_AGENDA.length],
      dataInicio: ts(d),
      dataFim: ts(fim),
      imobiliariaId: 'espelho-demo',
      presentesIds: [ESPELHO_DEMO_UID],
      respostasPresenca: { [ESPELHO_DEMO_UID]: 'confirmado' },
    });
  }
  return items;
}
export const DEMO_AGENDA_IMOBILIARIA = buildAgendaImobiliaria();

// --- Avisos importantes ---
export const DEMO_AVISOS = [
  { id: 'aviso-1', titulo: 'Novo lançamento', mensagem: 'Lançamento Torre Sul disponível para visita a partir de segunda.', imobiliariaId: 'espelho-demo', data: ts(now) },
  { id: 'aviso-2', titulo: 'Treinamento', mensagem: 'Treinamento de precificação na quinta às 14h.', imobiliariaId: 'espelho-demo', data: ts(now) },
  { id: 'aviso-3', titulo: 'Meta do mês', mensagem: 'Meta do mês: 8 fechamentos. Estamos em 5.', imobiliariaId: 'espelho-demo', data: ts(now) },
];

// --- Comunidade: posts com comentários e likes ---
const POST_TEXTS = [
  'Dica de ouro: sempre feche a visita com um próximo passo definido.',
  'Alguém já usou o novo material da construtora X? Está muito bom.',
  'Parabéns ao time que bateu a meta em setembro! 🎉',
  'Evento de lançamento na próxima semana. Quem vai?',
  'Compartilhando resultado do último treinamento de negociação.',
  'Novo vídeo no canal: como lidar com objeção de preço.',
  'Reunião de alinhamento amanhã às 9h. Confirmem presença.',
  'Indicação de imóvel em condomínio fechado — 3 quartos, zona sul.',
  'Workshop de vendas com foco em alto padrão. Inscrições abertas.',
  'Dúvida: qual a melhor forma de seguir com lead que não retorna ligação?',
  'Conteúdo novo no drive: apresentação comercial atualizada.',
  'Plantão no stand no sábado. Quem pode cobrir?',
];
const NOMES_COMUNIDADE = ['Ana Silva', 'Bruno M.', 'Carla O.', 'Diego F.', 'Elena C.', 'Fernando L.', 'Gabriela S.', 'Henrique A.', 'Espelho'];
function buildComunidadePosts() {
  const posts: any[] = [];
  for (let i = 0; i < 30; i++) {
    const authorId = i % 3 === 0 ? ESPELHO_DEMO_UID : `user-${(i % 6) + 1}`;
    const nome = authorId === ESPELHO_DEMO_UID ? 'Espelho' : NOMES_COMUNIDADE[(i % (NOMES_COMUNIDADE.length - 1)) + 1];
    const created = new Date(now);
    created.setDate(created.getDate() - Math.floor(i / 2));
    created.setHours(10 + (i % 8), (i * 17) % 60, 0, 0);
    posts.push({
      id: `post-demo-${i}`,
      texto: POST_TEXTS[i % POST_TEXTS.length],
      userId: authorId,
      nome,
      handle: `@${nome.toLowerCase().replace(/\s+/g, '')}${i}`,
      imobiliariaId: 'espelho-demo',
      createdAt: ts(created),
      likes: Math.floor(Math.random() * 50),
      likesIds: [] as string[],
      isEvento: false,
      comentarios: Math.floor(Math.random() * 15),
    });
  }
  return posts;
}
export const DEMO_COMUNIDADE_POSTS = buildComunidadePosts();

// --- Agenda pessoal (itens da coleção agenda) + notas + tarefas CRM unificadas para a página Agenda ---
function buildAgendaItems() {
  const items: any[] = [];
  for (let i = 0; i < 20; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + (i % 5));
    d.setHours(9 + (i % 6), 0, 0, 0);
    items.push({
      id: `agenda-item-${i}`,
      titulo: ['Reunião interna', 'Ligação cliente', 'Visita imóvel', 'Estudo de caso', 'Follow-up'][i % 5],
      descricao: 'Item de demonstração.',
      dataHora: ts(d),
      tipo: 'agenda' as const,
      status: 'pendente' as const,
      cor: '#10B981',
      userId: ESPELHO_DEMO_UID,
      source: 'agenda' as const,
      createdAt: ts(d),
    });
  }
  return items;
}
export const DEMO_AGENDA_ITEMS = buildAgendaItems();

function buildDemoNotes() {
  const notes: any[] = [];
  for (let i = 0; i < 15; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (i % 10));
    notes.push({
      id: `note-${i}`,
      texto: `Nota de demonstração ${i + 1}: lembrete ou anotação.`,
      prioridade: ['alta', 'media', 'baixa'][i % 3],
      dataHora: d.toISOString().slice(0, 16),
      criadoEm: ts(d),
      userId: ESPELHO_DEMO_UID,
    });
  }
  return notes;
}
export const DEMO_NOTES = buildDemoNotes();

/** Tarefas CRM no formato da página Agenda (por lead). */
export function getDemoCrmTasksForAgenda(): { id: string; description: string; type: 'Ligação' | 'WhatsApp' | 'Visita'; dueDate: Timestamp; status: string; leadId: string; leadNome: string }[] {
  const tasks: any[] = [];
  DEMO_LEADS.slice(0, 25).forEach(lead => {
    (lead.tasks || []).filter((t: DemoTask) => t.status === 'pendente').forEach((t: DemoTask) => {
      tasks.push({
        id: t.id,
        description: t.description,
        type: t.type,
        dueDate: t.dueDate,
        status: t.status,
        leadId: lead.id,
        leadNome: lead.nome,
      });
    });
  });
  return tasks;
}

// --- Interações (para detalhe do lead) ---
export function getDemoInteractions(leadId: string): { id: string; type: string; notes: string; timestamp: Timestamp; taskId?: string }[] {
  const lead = DEMO_LEADS.find(l => l.id === leadId);
  if (!lead) return [];
  const types = ['Ligação', 'WhatsApp', 'Visita', 'Tarefa Concluída'];
  const notes = ['Cliente demonstrou interesse.', 'Retornar em 2 dias.', 'Enviado material solicitado.', 'Visita agendada para próxima semana.'];
  return [
    { id: 'int-1', type: types[0], notes: notes[0], timestamp: ts(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)) },
    { id: 'int-2', type: types[1], notes: notes[1], timestamp: ts(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)) },
    { id: 'int-3', type: types[2], notes: notes[2], timestamp: ts(today) },
  ];
}

// --- Relatórios (admin): corretores e dados resumidos ---
export const DEMO_REPORT_CORRETORES = [
  { uid: ESPELHO_DEMO_UID, nome: 'Espelho', email: 'espelho@demo.alumma.com' },
  { uid: 'demo-u2', nome: 'Ana Silva', email: 'ana@demo.com' },
  { uid: 'demo-u3', nome: 'Bruno Mendes', email: 'bruno@demo.com' },
];

// --- Treinamentos / Academia ---
export const DEMO_TREINAMENTOS = [
  { id: 't1', titulo: 'Vendas de alto padrão', categoria: 'vendas', descricao: 'Técnicas para negociação em imóveis de alto valor.', link: '#', duracao: '45 min' },
  { id: 't2', titulo: 'Funil de vendas', categoria: 'vendas', descricao: 'Organize seu pipeline e feche mais.', link: '#', duracao: '30 min' },
  { id: 't3', titulo: 'Comunicação não violenta', categoria: 'mercado', descricao: 'Melhore a comunicação com clientes.', link: '#', duracao: '1h' },
  { id: 't4', titulo: 'LGPD no dia a dia', categoria: 'institucional', descricao: 'Boas práticas de proteção de dados.', link: '#', duracao: '20 min' },
  { id: 't5', titulo: 'Audiobook: Mindset', categoria: 'audiobooks', descricao: 'Resumo do livro Mindset.', link: '#', duracao: '1h 15min' },
  { id: 't6', titulo: 'Materiais de apoio', categoria: 'materiais', descricao: 'Templates e apresentações.', link: '#', duracao: '-' },
  { id: 't7', titulo: 'Sistema Alumma', categoria: 'sistema', descricao: 'Tour pelo CRM e agenda.', link: '#', duracao: '25 min' },
  { id: 't8', titulo: 'Indicadores econômicos', categoria: 'mercado', descricao: 'CUB, SELIC e impacto no mercado.', link: '#', duracao: '40 min' },
];
