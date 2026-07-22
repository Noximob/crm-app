'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import LoadingState from '@/components/ui/LoadingState';
import { ensureTarefasPendentes, TarefaPendente } from '@/lib/leadTasks';

interface User {
  id: string;
  nome: string;
  email: string;
  imobiliariaId?: string;
  tipoConta: 'imobiliaria' | 'corretor-vinculado' | 'corretor-autonomo';
  aprovado: boolean;
}

interface AgendaItem {
  id: string;
  titulo: string;
  descricao?: string;
  dataHora: Timestamp;
  tipo: 'agenda' | 'crm' | 'nota' | 'aviso' | 'imobiliaria';
  status: 'pendente' | 'concluida' | 'cancelada';
  cor: string;
  leadId?: string;
  leadNome?: string;
  createdAt: Timestamp;
  userId: string;
  source?: 'agenda' | 'notas' | 'crm' | 'aviso' | 'imobiliaria';
  originalId?: string;
  crmTipo?: string; // tipo da tarefa do CRM (Ligação, WhatsApp, Visita, Meet, Follow-up, Produto...)
}

interface Note {
  id: string;
  texto: string;
  prioridade: string;
  dataHora?: string;
  criadoEm: Timestamp;
  userId: string;
}

interface CrmTask {
  id: string;
  description: string;
  // Qualquer tipo de tarefa do CRM (Ligação, WhatsApp, Visita, Meet, Follow-up, Produto, Outros...)
  type: string;
  dueDate: Timestamp;
  status: 'pendente' | 'concluída' | 'cancelada';
  leadId: string;
  leadNome?: string;
}

interface AgendaImobiliaria {
  id: string;
  titulo: string;
  descricao?: string;
  data: Timestamp;
  dataInicio?: Timestamp;
  dataFim?: Timestamp;
  tipo: 'reuniao' | 'evento' | 'treinamento' | 'outro' | 'revisar-crm' | 'ligacao-ativa' | 'acao-de-rua' | 'disparo-de-msg' | 'plantao';
  local?: string;
  responsavel?: string;
  construtora?: string;
  imobiliariaId: string;
}

const tipoCores = {
  agenda: 'bg-emerald-500/10 border border-emerald-400/35 text-emerald-300',
  crm: 'bg-amber-500/10 border border-amber-400/35 text-amber-300',
  nota: 'bg-yellow-500/10 border border-yellow-400/35 text-yellow-200',
  aviso: 'bg-red-600/10 border border-red-500/40 text-red-300',
  imobiliaria: 'bg-purple-500/10 border border-purple-400/35 text-purple-300'
};

const tipoLabels = {
  agenda: 'Agenda',
  crm: 'CRM',
  nota: 'Nota',
  aviso: 'Aviso Importante',
  imobiliaria: 'Agenda Imobiliária'
};

// Acento por tipo de tarefa do CRM (circuito): cor da bolinha/borda e chip do calendário
const CRM_TIPO_HEX: Record<string, string> = {
  'Ligação': '#7DD3FC',
  'WhatsApp': '#34D399',
  'Visita': '#E8C547',
  'Meet': '#9F6BFF',
  'Follow-up': '#FF7A97',
  'Produto': '#F59E0B',
  'Outros': '#94A3B8',
};
const CRM_TIPO_CHIP: Record<string, string> = {
  'Ligação': 'bg-[#7DD3FC]/10 border border-[#7DD3FC]/35 text-[#7DD3FC]',
  'WhatsApp': 'bg-[#34D399]/10 border border-[#34D399]/35 text-emerald-300',
  'Visita': 'bg-[#E8C547]/10 border border-[#E8C547]/35 text-[#FFE9A6]',
  'Meet': 'bg-[#9F6BFF]/10 border border-[#9F6BFF]/35 text-[#C4A6FF]',
  'Follow-up': 'bg-[#FF7A97]/10 border border-[#FF7A97]/35 text-[#FF9EB5]',
  'Produto': 'bg-[#F59E0B]/10 border border-[#F59E0B]/35 text-amber-300',
  'Outros': 'bg-white/[0.06] border border-white/20 text-slate-300',
};
const crmTipoHex = (tipo?: string) => CRM_TIPO_HEX[tipo ?? ''] ?? CRM_TIPO_HEX['Outros'];
const crmTipoChip = (tipo?: string) => CRM_TIPO_CHIP[tipo ?? ''] ?? CRM_TIPO_CHIP['Outros'];

function getAgendaImobiliariaTipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    reuniao: 'Reunião',
    evento: 'Evento',
    treinamento: 'Treinamento',
    'revisar-crm': 'Revisar CRM',
    'ligacao-ativa': 'Ligação Ativa',
    'acao-de-rua': 'Ação de rua',
    'disparo-de-msg': 'Disparo de Msg',
    plantao: 'Plantão',
    outro: 'Outro'
  };
  return labels[tipo] ?? tipo;
}

export default function AgendaUsuariosPage() {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [crmTasks, setCrmTasks] = useState<CrmTask[]>([]);
  const [agendaImobiliaria, setAgendaImobiliaria] = useState<AgendaImobiliaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'crm' | 'nota' | 'agenda' | 'imobiliaria'>('all');

  // Buscar usuários da imobiliária
  useEffect(() => {
    if (!userData?.imobiliariaId) return;

    const usersRef = collection(db, 'usuarios');
    const q = query(usersRef, where('imobiliariaId', '==', userData.imobiliariaId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      // Filtrar apenas usuários aprovados
      const approvedUsers = usersData.filter(user => user.aprovado);
      setUsers(approvedUsers);
      
      // Selecionar o primeiro usuário por padrão
      if (approvedUsers.length > 0 && !selectedUser) {
        setSelectedUser(approvedUsers[0].id);
      }
    });

    return () => unsubscribe();
  }, [userData, selectedUser]);

  // Buscar dados da agenda quando usuário for selecionado
  useEffect(() => {
    if (selectedUser) {
      fetchAllData();
    }
  }, [selectedUser, selectedDate, filter]);

  const fetchAllData = async () => {
    if (!selectedUser) return;
    setLoading(true);
    
    try {
      await Promise.all([
        fetchAgendaItems(),
        fetchNotes(),
        fetchCrmTasks(),
        fetchAgendaImobiliaria()
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgendaItems = async () => {
    if (!selectedUser) return;

    try {
      const agendaRef = collection(db, 'agenda');
      const q = query(
        agendaRef,
        where('userId', '==', selectedUser)
      );

      const querySnapshot = await getDocs(q);
      const items: AgendaItem[] = [];
      
      querySnapshot.forEach((doc) => {
        items.push({ 
          id: doc.id, 
          ...doc.data(),
          source: 'agenda',
          tipo: 'agenda'
        } as AgendaItem);
      });

      setAgendaItems(items);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
    }
  };

  const fetchNotes = async () => {
    if (!selectedUser) return;

    try {
      const notesRef = collection(db, 'notes');
      const q = query(
        notesRef,
        where('userId', '==', selectedUser)
      );

      const querySnapshot = await getDocs(q);
      const notesData: Note[] = [];
      
      querySnapshot.forEach((doc) => {
        const noteData = { id: doc.id, ...doc.data() } as Note;
        if (noteData.dataHora) {
          notesData.push(noteData);
        }
      });

      setNotes(notesData);
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
    }
  };

  const fetchCrmTasks = async () => {
    if (!selectedUser) return;

    try {
      // Buscar leads do usuário
      const leadsRef = collection(db, 'leads');
      const leadsQuery = query(leadsRef, where('userId', '==', selectedUser));
      const leadsSnapshot = await getDocs(leadsQuery);

      const allLeads = leadsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Array<{ id: string; nome?: string; tarefasPendentes?: TarefaPendente[] }>;
      const tarefasMap = await ensureTarefasPendentes(allLeads);

      const allTasks: CrmTask[] = [];
      allLeads.forEach((lead) => {
        (tarefasMap.get(lead.id) || []).forEach((task) => {
          allTasks.push({
            id: task.id,
            description: task.description,
            type: task.type,
            dueDate: task.dueDate,
            status: 'pendente',
            leadId: lead.id,
            leadNome: lead.nome
          } as CrmTask);
        });
      });

      setCrmTasks(allTasks);
    } catch (error) {
      console.error('Erro ao buscar tarefas do CRM:', error);
    }
  };

  const fetchAgendaImobiliaria = async () => {
    if (!userData?.imobiliariaId) return;
    try {
      const q = query(
        collection(db, 'agendaImobiliaria'),
        where('imobiliariaId', '==', userData.imobiliariaId)
      );
      const snapshot = await getDocs(q);
      const agendaData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any));
      setAgendaImobiliaria(agendaData);
    } catch (err) {
      console.error('Erro ao buscar agenda da imobiliária:', err);
      setAgendaImobiliaria([]);
    }
  };

  const getAllItemsForDate = (date: Date) => {
    const allItems: AgendaItem[] = [];
    
    // Adicionar itens da agenda
    agendaItems.forEach(item => {
      const itemDate = item.dataHora.toDate();
      if (itemDate.toDateString() === date.toDateString()) {
        allItems.push(item);
      }
    });
    
    // Adicionar notas com data/hora
    notes.forEach(note => {
      if (note.dataHora) {
        const noteDate = new Date(note.dataHora);
        if (noteDate.toDateString() === date.toDateString()) {
          allItems.push({
            id: `note_${note.id}`,
            titulo: note.texto,
            descricao: `Prioridade: ${note.prioridade}`,
            dataHora: Timestamp.fromDate(noteDate),
            tipo: 'nota',
            status: 'pendente',
            cor: '#E8C547',
            createdAt: note.criadoEm,
            userId: note.userId,
            source: 'notas',
            originalId: note.id
          });
        }
      }
    });
    
    // Adicionar tarefas do CRM
    crmTasks.forEach(task => {
      const taskDate = task.dueDate.toDate();
      if (taskDate.toDateString() === date.toDateString()) {
        allItems.push({
          id: `task_${task.id}`,
          titulo: task.description,
          descricao: `${task.type} - ${task.leadNome || 'Lead'}`,
          dataHora: task.dueDate,
          tipo: 'crm',
          status: task.status === 'concluída' ? 'concluida' : 'pendente',
          cor: crmTipoHex(task.type),
          createdAt: task.dueDate,
          userId: selectedUser,
          source: 'crm',
          originalId: task.id,
          leadId: task.leadId,
          leadNome: task.leadNome,
          crmTipo: task.type
        });
      }
    });
    
    // Adicionar agenda imobiliária
    agendaImobiliaria.forEach(agenda => {
      // Se a agenda tem dataInicio e dataFim
      if (agenda.dataInicio && agenda.dataFim) {
        const inicioDate = agenda.dataInicio.toDate();
        const fimDate = agenda.dataFim.toDate();
        const currentDate = new Date(date);
        
        // Verificar se é evento de 1 dia ou múltiplos dias
        const inicioDateOnly = new Date(inicioDate.getFullYear(), inicioDate.getMonth(), inicioDate.getDate());
        const fimDateOnly = new Date(fimDate.getFullYear(), fimDate.getMonth(), fimDate.getDate());
        const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        // Se início e fim são no mesmo dia = evento de 1 dia
        if (inicioDateOnly.getTime() === fimDateOnly.getTime()) {
          // Evento de 1 dia - verificar se é o dia correto
          if (currentDateOnly.getTime() === inicioDateOnly.getTime()) {
            allItems.push({
              id: `agenda_${agenda.id}`,
              titulo: agenda.titulo,
              descricao: `${agenda.descricao || ''}\n\nTipo: ${getAgendaImobiliariaTipoLabel(agenda.tipo)}\nLocal: ${agenda.local || 'Não informado'}\nResponsável: ${agenda.responsavel || 'Não informado'}`,
              dataHora: agenda.dataInicio,
              tipo: 'imobiliaria',
              status: 'pendente',
              cor: '#8B5CF6', // Cor roxa para agenda imobiliária
              createdAt: agenda.data,
              userId: '',
              source: 'imobiliaria',
              originalId: agenda.id
            });
          }
        } else {
          // Evento de múltiplos dias - verificar se está no período
          if (currentDateOnly >= inicioDateOnly && currentDateOnly <= fimDateOnly) {
            // Extrair horário diário do início
            const horaInicio = inicioDate.getHours();
            const minutoInicio = inicioDate.getMinutes();
            const horaFim = fimDate.getHours();
            const minutoFim = fimDate.getMinutes();
            
            // Criar data/hora para este dia específico
            const dataHoraDia = new Date(currentDate);
            dataHoraDia.setHours(horaInicio, minutoInicio, 0, 0);
            
            // Criar descrição com informações do período
            let descricao = agenda.descricao || '';
            descricao += '\n\n';
            descricao += `Período: ${inicioDateOnly.toLocaleDateString('pt-BR')} a ${fimDateOnly.toLocaleDateString('pt-BR')}\n`;
            descricao += `Horário diário: ${horaInicio.toString().padStart(2, '0')}:${minutoInicio.toString().padStart(2, '0')} - ${horaFim.toString().padStart(2, '0')}:${minutoFim.toString().padStart(2, '0')}\n`;
            descricao += `Tipo: ${getAgendaImobiliariaTipoLabel(agenda.tipo)}\nLocal: ${agenda.local || 'Não informado'}\nResponsável: ${agenda.responsavel || 'Não informado'}`;
            
            allItems.push({
              id: `agenda_${agenda.id}`,
              titulo: agenda.titulo,
              descricao: descricao,
              dataHora: Timestamp.fromDate(dataHoraDia),
              tipo: 'imobiliaria',
              status: 'pendente',
              cor: '#8B5CF6', // Cor roxa para agenda imobiliária
              createdAt: agenda.data,
              userId: '',
              source: 'imobiliaria',
              originalId: agenda.id
            });
          }
        }
      } else {
        // Fallback para agenda antiga que não tem dataInicio/dataFim
        const agendaDate = agenda.data.toDate();
        if (agendaDate.toDateString() === date.toDateString()) {
          allItems.push({
            id: `agenda_${agenda.id}`,
            titulo: agenda.titulo,
            descricao: `${agenda.descricao || ''}\n\nTipo: ${getAgendaImobiliariaTipoLabel(agenda.tipo)}\nLocal: ${agenda.local || 'Não informado'}\nResponsável: ${agenda.responsavel || 'Não informado'}`,
            dataHora: agenda.data,
            tipo: 'imobiliaria',
            status: 'pendente',
            cor: '#8B5CF6', // Cor roxa para agenda imobiliária
            createdAt: agenda.data,
            userId: '',
            source: 'imobiliaria',
            originalId: agenda.id
          });
        }
      }
    });
    
    // Aplicar filtro se necessário
    if (filter !== 'all') {
      const filteredItems = allItems.filter(item => item.tipo === filter);
      return filteredItems.sort((a, b) => a.dataHora.toDate().getTime() - b.dataHora.toDate().getTime());
    }
    
    return allItems.sort((a, b) => a.dataHora.toDate().getTime() - b.dataHora.toDate().getTime());
  };

  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const items = getAllItemsForDate(date);
      
      days.push(
        <div
          key={i}
          className={`p-3 border-r border-b border-white/[0.06] min-h-[120px] transition-all duration-200 hover:bg-white/[0.04] ${
            date.getMonth() === currentMonth ? 'bg-white/[0.02]' : 'bg-transparent'
          } ${date.toDateString() === today.toDateString() ? 'bg-[#E8C547]/[0.08] border-[#E8C547]/30' : ''}`}
        >
          <div className={`text-sm font-bold mb-2 tabular-nums ${
            date.toDateString() === today.toDateString()
              ? 'text-[#FFE9A6]'
              : date.getMonth() === currentMonth
                ? 'text-white'
                : 'text-white/30'
          }`}>
            {date.getDate()}
          </div>
          <div className="space-y-1">
            {items.slice(0, 3).map((item: AgendaItem) => (
              <div
                key={item.id}
                className={`text-xs p-2 rounded-lg ${item.tipo === 'crm' ? crmTipoChip(item.crmTipo) : tipoCores[item.tipo]} truncate cursor-pointer hover:brightness-125 transition-all duration-200`}
                title={`${item.dataHora.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${item.titulo}`}
              >
                <div className="al-display font-bold tabular-nums">
                  {item.dataHora.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="truncate text-white/90">{item.titulo}</div>
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-xs text-text-secondary font-medium">
                +{items.length - 3} mais
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedUserName = users.find(u => u.id === selectedUser)?.nome || '';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mb-2">Agenda dos Usuários</h1>
            <p className="text-text-secondary text-sm">Visualize a agenda de todos os usuários da imobiliária</p>
          </div>
        </div>

        {/* Seletor de Usuário */}
        <div className="al-card relative overflow-hidden p-6 mb-6">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">
                Selecionar Usuário
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nome} ({user.tipoConta === 'imobiliaria' ? 'Administrador' : 'Corretor'})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">
                Filtrar por Tipo
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'crm' | 'nota' | 'agenda')}
                className="px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
              >
                <option value="all">Todos os tipos</option>
                <option value="crm">CRM</option>
                <option value="nota">Notas</option>
                <option value="agenda">Agenda</option>
              </select>
            </div>
          </div>
        </div>

        {selectedUser && (
          <>
            {/* Navegação do Mês */}
            <div className="al-card relative overflow-hidden p-6 mb-6">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setSelectedDate(newDate);
                    }}
                    className="p-3 hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#FF5C7E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="al-display font-bold text-lg text-white min-w-[200px] text-center">
                    {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} - {selectedUserName}
                  </span>
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedDate(newDate);
                    }}
                    className="p-3 hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#FF5C7E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Calendário */}
            <div className="al-card relative overflow-hidden mb-8">
              <div className="absolute inset-x-0 top-0 gx-line" />
              {/* Dias da semana */}
              <div className="grid grid-cols-7 bg-white/[0.03]">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="p-4 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary border-b border-white/[0.06]">
                    {day}
                  </div>
                ))}
              </div>

              {/* Dias do mês */}
              <div className="grid grid-cols-7">
                {renderCalendar()}
              </div>
            </div>

            {/* Próximos Compromissos */}
            <div className="al-card relative overflow-hidden p-6">
              <div className="absolute inset-x-0 top-0 gx-line" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#FF1E56]/15 border border-[#FF3364]/40 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Próximos Compromissos - {selectedUserName}</h2>
                  <p className="text-text-secondary text-sm">Próximos 5 compromissos do usuário</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {(() => {
                  const allItems: AgendaItem[] = [];
                  
                  // Adicionar itens da agenda
                  agendaItems.forEach(item => {
                    if (item.dataHora.toDate() >= new Date()) {
                      allItems.push(item);
                    }
                  });
                  
                  // Adicionar notas com data/hora
                  notes.forEach(note => {
                    if (note.dataHora) {
                      const noteDate = new Date(note.dataHora);
                      if (noteDate >= new Date()) {
                        allItems.push({
                          id: `note_${note.id}`,
                          titulo: note.texto,
                          descricao: `Prioridade: ${note.prioridade}`,
                          dataHora: Timestamp.fromDate(noteDate),
                          tipo: 'nota',
                          status: 'pendente',
                          cor: '#E8C547',
                          createdAt: note.criadoEm,
                          userId: note.userId,
                          source: 'notas',
                          originalId: note.id
                        });
                      }
                    }
                  });
                  
                  // Adicionar tarefas do CRM
                  crmTasks.forEach(task => {
                    if (task.dueDate.toDate() >= new Date()) {
                      allItems.push({
                        id: `task_${task.id}`,
                        titulo: task.description,
                        descricao: `${task.type} - ${task.leadNome || 'Lead'}`,
                        dataHora: task.dueDate,
                        tipo: 'crm',
                        status: task.status === 'concluída' ? 'concluida' : 'pendente',
                        cor: crmTipoHex(task.type),
                        createdAt: task.dueDate,
                        userId: selectedUser,
                        source: 'crm',
                        originalId: task.id,
                        leadId: task.leadId,
                        leadNome: task.leadNome,
                        crmTipo: task.type
                      });
                    }
                  });
                  
                  // Aplicar filtro e ordenar
                  let filteredItems = allItems;
                  if (filter !== 'all') {
                    filteredItems = allItems.filter(item => item.tipo === filter);
                  }
                  
                  const sortedItems = filteredItems
                    .sort((a, b) => a.dataHora.toDate().getTime() - b.dataHora.toDate().getTime())
                    .slice(0, 5);
                  
                  return sortedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`group p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] transition-all duration-300 ${
                        item.status === 'concluida' ? 'opacity-60' : ''
                      }`}
                      style={{ borderLeftColor: item.cor, borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-4 h-4 rounded-full shadow-md"
                            style={{ backgroundColor: item.cor }}
                          ></div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-[#FF7A97] transition-colors">
                              {item.titulo}
                            </div>
                            <div className="text-sm text-text-secondary">
                              {item.dataHora.toDate().toLocaleString('pt-BR')} • {tipoLabels[item.tipo]}
                            </div>
                            {item.descricao && (
                              <div className="text-sm text-text-secondary mt-1 line-clamp-2">
                                {item.descricao}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Apenas visualização */}
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary px-2 py-1 bg-white/[0.06] border border-white/10 rounded-full">
                          Visualização
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </>
        )}

        {loading && (
          <LoadingState label="Carregando agenda..." className="py-8" />
        )}
      </div>
    </div>
  );
} 