'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import DayAgendaModal from './_components/DayAgendaModal';
import {
  DEMO_AGENDA_ITEMS,
  DEMO_AGENDA_IMOBILIARIA,
  DEMO_NOTES,
  getDemoCrmTasksForAgenda,
} from '@/lib/espelho/demoData';

// Ícones
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/>
    <path d="M12 5v14"/>
  </svg>
);

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    <line x1="10" x2="10" y1="11" y2="17"/>
    <line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

interface AgendaItem {
  id: string;
  titulo: string;
  descricao?: string;
  dataHora: Timestamp;
  tipo: 'agenda' | 'crm' | 'nota' | 'aviso' | 'comunidade' | 'imobiliaria';
  status: 'pendente' | 'concluida' | 'cancelada';
  cor: string;
  leadId?: string;
  leadNome?: string;
  createdAt: Timestamp;
  userId: string;
  source?: 'agenda' | 'notas' | 'crm' | 'aviso' | 'comunidade' | 'imobiliaria';
  originalId?: string; // ID original da nota ou tarefa
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
  type: 'Ligação' | 'WhatsApp' | 'Visita';
  dueDate: Timestamp;
  status: 'pendente' | 'concluída' | 'cancelada';
  leadId: string;
  leadNome?: string;
}

interface EventoComunidade {
  id: string;
  titulo: string;
  texto: string;
  eventoTipo: string;
  eventoLink: string;
  eventoData: Timestamp;
  eventoStatus: string;
  userId: string;
  nome: string;
  handle: string;
  avatar: string;
  imobiliariaId: string;
  createdAt: Timestamp;
  isEvento: boolean;
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
  diaInicio?: string;
  diaFim?: string;
  horaInicio?: string;
  horaFim?: string;
  imobiliariaId: string;
}

const tipoCores = {
  agenda: 'bg-emerald-500/10 border border-emerald-400/35 text-emerald-300',
  crm: 'bg-amber-500/10 border border-amber-400/35 text-amber-300',
  nota: 'bg-yellow-500/10 border border-yellow-400/35 text-yellow-200',
  aviso: 'bg-red-600/10 border border-red-500/40 text-red-300',
  comunidade: 'bg-orange-500/10 border border-orange-400/35 text-orange-300',
  imobiliaria: 'bg-purple-500/10 border border-purple-400/35 text-purple-300'
};

const tipoLabels = {
  agenda: 'Agenda',
  crm: 'CRM',
  nota: 'Nota',
  aviso: 'Aviso Importante',
  comunidade: 'Evento Comunidade',
  imobiliaria: 'Agenda Imobiliária'
};

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

export default function AgendaPage() {
  const { currentUser, userData, isEspelhoDemo } = useAuth();
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [crmTasks, setCrmTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventosComunidade, setEventosComunidade] = useState<EventoComunidade[]>([]);
  const [agendaImobiliaria, setAgendaImobiliaria] = useState<AgendaImobiliaria[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<AgendaItem | null>(null);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'crm' | 'nota' | 'agenda' | 'comunidade' | 'imobiliaria'>('all');

  // Estado para o modal de agenda do dia
  const [showDayAgendaModal, setShowDayAgendaModal] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [selectedDayItems, setSelectedDayItems] = useState<AgendaItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    dataHora: '',
    tipo: 'agenda' as 'agenda',
    cor: '#10B981' // Cor fixa verde para agenda
  });

  useEffect(() => {
    if (isEspelhoDemo && currentUser) {
      setAgendaItems(DEMO_AGENDA_ITEMS as AgendaItem[]);
      setNotes(DEMO_NOTES as Note[]);
      setCrmTasks(getDemoCrmTasksForAgenda());
      setAgendaImobiliaria(DEMO_AGENDA_IMOBILIARIA as AgendaImobiliaria[]);
      setEventosComunidade([]);
      setLoading(false);
      return;
    }
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser, selectedDate, filter, isEspelhoDemo]);

  useEffect(() => {
    if (isEspelhoDemo) return;
    if (userData?.imobiliariaId) {
      fetchAgendaImobiliaria();
    }
  }, [userData, isEspelhoDemo]);

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
      setAgendaImobiliaria([]);
    }
  };

  const fetchAllData = async () => {
    if (!currentUser) return;
    setLoading(true);
    
    try {
      await Promise.all([
        fetchAgendaItems(),
        fetchNotes(),
        fetchCrmTasks(),
        fetchEventosComunidade(),
        fetchAgendaImobiliaria()
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgendaItems = async () => {
    if (!currentUser) return;

    try {
      const agendaRef = collection(db, 'agenda');
      let q = query(
        agendaRef,
        where('userId', '==', currentUser.uid)
        // Removido orderBy temporariamente até o índice estar pronto
      );

      const querySnapshot = await getDocs(q);
      const items: AgendaItem[] = [];
      
      querySnapshot.forEach((doc) => {
        items.push({ 
          id: doc.id, 
          ...doc.data(),
          source: 'agenda'
        } as AgendaItem);
      });

      // Ordenar localmente enquanto o índice não está pronto
      items.sort((a, b) => a.dataHora.toDate().getTime() - b.dataHora.toDate().getTime());

      setAgendaItems(items);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
    }
  };

  const fetchNotes = async () => {
    if (!currentUser) return;

    try {
      const notesRef = collection(db, 'notes');
      const q = query(
        notesRef,
        where('userId', '==', currentUser.uid),
        orderBy('criadoEm', 'desc')
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
    if (!currentUser) return;

    try {
      // Buscar leads do usuário
      const leadsRef = collection(db, 'leads');
      const leadsQuery = query(leadsRef, where('userId', '==', currentUser.uid));
      const leadsSnapshot = await getDocs(leadsQuery);
      
      const allTasks: CrmTask[] = [];
      
      // Para cada lead, buscar suas tarefas
      for (const leadDoc of leadsSnapshot.docs) {
        const leadData = leadDoc.data();
        const tasksCol = collection(db, 'leads', leadDoc.id, 'tarefas');
        const tasksQuery = query(tasksCol, where('status', '==', 'pendente'));
        const tasksSnapshot = await getDocs(tasksQuery);
        
        tasksSnapshot.forEach((taskDoc) => {
          allTasks.push({
            id: taskDoc.id,
            ...taskDoc.data(),
            leadId: leadDoc.id,
            leadNome: leadData.nome
          } as CrmTask);
        });
      }

      setCrmTasks(allTasks);
    } catch (error) {
      console.error('Erro ao buscar tarefas do CRM:', error);
    }
  };

  const fetchEventosComunidade = async () => {
    if (!currentUser || !userData?.imobiliariaId) return;

    try {
      const eventosRef = collection(db, 'comunidadePosts');
      const eventosQuery = query(
        eventosRef,
        where('imobiliariaId', '==', userData.imobiliariaId),
        where('isEvento', '==', true),
        where('eventoStatus', '==', 'agendado')
      );
      
      const eventosSnapshot = await getDocs(eventosQuery);
      const eventosData: EventoComunidade[] = [];
      
      eventosSnapshot.forEach((doc) => {
        const eventoData = { id: doc.id, ...doc.data() } as EventoComunidade;
        eventosData.push(eventoData);
      });

      setEventosComunidade(eventosData);
    } catch (error) {
      console.error('Erro ao buscar eventos da comunidade:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isEspelhoDemo) return;

    try {
      console.log('Salvando compromisso:', formData);
      
      const agendaData = {
        ...formData,
        dataHora: Timestamp.fromDate(new Date(formData.dataHora)),
        status: 'pendente' as const,
        createdAt: Timestamp.now(),
        userId: currentUser.uid,
        source: 'agenda' // Adicionar source para identificar origem
      };

      console.log('Dados para salvar:', agendaData);

      if (editingItem) {
        await updateDoc(doc(db, 'agenda', editingItem.id), agendaData);
        console.log('Compromisso atualizado');
      } else {
        const docRef = await addDoc(collection(db, 'agenda'), agendaData);
        console.log('Compromisso criado com ID:', docRef.id);
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      await fetchAllData(); // Recarregar todos os dados
      console.log('Dados recarregados');
    } catch (error) {
      console.error('Erro ao salvar agenda:', error);
    }
  };

  const handleEdit = (item: AgendaItem) => {
    // Para CRM, Notas, Avisos e Eventos da Comunidade, abrir modal de visualização
    if (item.source === 'crm' || item.source === 'notas' || item.source === 'aviso' || item.source === 'comunidade') {
      setViewingItem(item);
      setShowViewModal(true);
      return;
    }
    
    // Só permitir editar itens criados na agenda (source: 'agenda')
    if (item.source !== 'agenda') {
      console.log('Este item não pode ser editado - apenas visualização');
      return;
    }
    
    setEditingItem(item);
    setFormData({
      titulo: item.titulo,
      descricao: item.descricao || '',
      dataHora: new Date(item.dataHora.toDate()).toISOString().slice(0, 16),
      tipo: item.tipo as 'agenda',
      cor: item.cor
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (isEspelhoDemo) return;
    if (confirm('Tem certeza que deseja excluir este item?')) {
      try {
        await deleteDoc(doc(db, 'agenda', id));
        fetchAgendaItems();
      } catch (error) {
        console.error('Erro ao excluir item:', error);
      }
    }
  };

  const handleStatusChange = async (id: string, status: AgendaItem['status']) => {
    try {
      await updateDoc(doc(db, 'agenda', id), { status });
      fetchAgendaItems();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      dataHora: '',
      tipo: 'agenda',
      cor: '#10B981' // Cor fixa verde para agenda
    });
  };

  const getAllItemsForDate = (date: Date) => {
    const allItems: AgendaItem[] = [];
    
    // Adicionar itens da agenda (compromissos criados na agenda)
    agendaItems.forEach(item => {
      const itemDate = item.dataHora.toDate();
      if (itemDate.toDateString() === date.toDateString()) {
        allItems.push({
          ...item,
          tipo: 'agenda' // Forçar tipo como 'agenda' para itens criados na agenda
        });
      }
    });
    
    // Adicionar notas com data/hora (notas do dashboard)
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
            cor: '#D4A017',
            createdAt: note.criadoEm,
            userId: note.userId,
            source: 'notas',
            originalId: note.id
          });
        }
      }
    });
    
    // Adicionar tarefas do CRM (agenda do CRM)
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
          cor: '#6366F1',
          createdAt: task.dueDate,
          userId: currentUser?.uid || '',
          source: 'crm',
          originalId: task.id,
          leadId: task.leadId,
          leadNome: task.leadNome
        });
      }
    });
    
    // Adicionar eventos da comunidade
    eventosComunidade.forEach(evento => {
      const eventoDate = evento.eventoData.toDate();
      if (eventoDate.toDateString() === date.toDateString()) {
        allItems.push({
          id: `evento_${evento.id}`,
          titulo: evento.titulo,
          descricao: `${evento.texto}\n\nTipo: ${evento.eventoTipo}\nLink: ${evento.eventoLink}\nOrganizador: ${evento.nome}`,
          dataHora: evento.eventoData,
          tipo: 'comunidade',
          status: 'pendente',
          cor: '#F97316', // Cor laranja para eventos da comunidade
          createdAt: evento.createdAt,
          userId: evento.userId,
          source: 'comunidade',
          originalId: evento.id
        });
      }
    });

    // Adicionar agenda imobiliária (inclui plantões, que agora são eventos tipo 'plantao')
    agendaImobiliaria.forEach(agenda => {
      const tituloAgenda = agenda.tipo === 'plantao' && (agenda as any).construtora
        ? `Plantão — ${(agenda as any).construtora}`
        : agenda.titulo;
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
              titulo: tituloAgenda,
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
              titulo: tituloAgenda,
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

  // Função para abrir o modal de agenda do dia
  const openDayAgendaModal = (date: Date) => {
    const items = getAllItemsForDate(date);
    setSelectedDayDate(date);
    setSelectedDayItems(items);
    setShowDayAgendaModal(true);
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
          className={`p-3 border-r border-b border-white/[0.06] min-h-[120px] transition-all duration-200 hover:bg-white/[0.05] cursor-pointer ${
            date.getMonth() === currentMonth ? 'bg-white/[0.02]' : 'bg-black/20'
          } ${date.toDateString() === today.toDateString() ? 'ring-1 ring-inset ring-[#FF1E56]/60 bg-[#FF1E56]/[0.06]' : ''}`}
          onClick={() => openDayAgendaModal(date)}
        >
          <div className={`al-display text-sm font-bold tabular-nums mb-2 flex items-center gap-1.5 ${
            date.toDateString() === today.toDateString()
              ? 'text-[#FF5C7E]'
              : date.getMonth() === currentMonth
                ? 'text-white'
                : 'text-white/30'
          }`}>
            {date.getDate()}
            {items.length > 0 && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: items[0].cor, boxShadow: `0 0 6px ${items[0].cor}` }}
              />
            )}
          </div>
          <div className="space-y-1">
            {items.slice(0, 3).map((item: AgendaItem) => (
              <div
                key={item.id}
                className={`text-xs p-2 rounded-lg ${tipoCores[item.tipo]} truncate cursor-pointer hover:brightness-125 transition-all duration-200 relative group/item`}
                onClick={() => handleEdit(item)}
                title={`${item.dataHora.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${item.titulo}`}
              >
                <div className="al-display font-bold tabular-nums">
                  {item.dataHora.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="truncate text-white/90">{item.titulo}</div>
                
                {/* Botão de exclusão para itens da agenda */}
                {item.source === 'agenda' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 text-xs"
                    title="Excluir compromisso"
                  >
                    ×
                  </button>
                )}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF1E56]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="al-display text-2xl sm:text-3xl font-bold text-white uppercase tracking-[0.12em] mb-2">
              Agenda Completa
            </h1>
            <p className="text-text-secondary">Organize seus compromissos pessoais e profissionais</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
          >
            <PlusIcon className="h-5 w-5" />
            Novo Compromisso
          </button>
        </div>

        {/* Filtros e Controles */}
        <div className="al-card relative overflow-hidden p-6 mb-8">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'crm' | 'nota' | 'agenda' | 'comunidade')}
                className="px-4 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
              >
                <option value="all">Todos os tipos</option>
                <option value="crm">CRM</option>
                <option value="nota">Notas</option>
                <option value="agenda">Agenda</option>
                <option value="comunidade">Eventos Comunidade</option>
              </select>


            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedDate(newDate);
                }}
                className="p-3 hover:bg-white/[0.08] rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-[#FF5C7E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="al-display font-bold text-lg text-white uppercase tracking-[0.08em] min-w-[200px] text-center">
                {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedDate(newDate);
                }}
                className="p-3 hover:bg-white/[0.08] rounded-xl transition-colors"
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
              <div key={day} className="p-4 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary border-b border-white/[0.08]">
                {day}
              </div>
            ))}
          </div>

          {/* Dias do mês */}
          <div className="grid grid-cols-7">
            {renderCalendar()}
          </div>
        </div>

        {/* Lista de Compromissos */}
        <div className="al-card relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="flex items-center gap-3 mb-6">
            <svg className="w-5 h-5 text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">Próximos Compromissos</h2>
              <p className="text-text-secondary text-sm">Seus compromissos futuros</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {(() => {
              const allItems: AgendaItem[] = [];
              
              // Adicionar itens da agenda (compromissos criados na agenda)
              agendaItems.forEach(item => {
                if (item.dataHora.toDate() >= new Date()) {
                  allItems.push({
                    ...item,
                    tipo: 'agenda' // Forçar tipo como 'agenda' para itens criados na agenda
                  });
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
                      cor: '#D4A017',
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
                    cor: '#6366F1',
                    createdAt: task.dueDate,
                    userId: currentUser?.uid || '',
                    source: 'crm',
                    originalId: task.id,
                    leadId: task.leadId,
                    leadNome: task.leadNome
                  });
                }
              });
              
              // Adicionar eventos da comunidade
              eventosComunidade.forEach(evento => {
                if (evento.eventoData.toDate() >= new Date()) {
                  allItems.push({
                    id: `evento_${evento.id}`,
                    titulo: evento.titulo,
                    descricao: `${evento.texto}\n\nTipo: ${evento.eventoTipo}\nLink: ${evento.eventoLink}\nOrganizador: ${evento.nome}`,
                    dataHora: evento.eventoData,
                    tipo: 'comunidade',
                    status: 'pendente',
                    cor: '#F97316', // Cor laranja para eventos da comunidade
                    createdAt: evento.createdAt,
                    userId: evento.userId,
                    source: 'comunidade',
                    originalId: evento.id
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
                .slice(0, 5); // Sempre mostrar apenas 5 próximos compromissos
              
              return sortedItems.map((item) => (
                <div
                  key={item.id}
                  className={`group p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:translate-x-1 transition-all duration-300 ${
                    item.status === 'concluida' ? 'opacity-60' : ''
                  }`}
                  style={{ borderLeftColor: item.cor, borderLeftWidth: '2px' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="al-display text-[15px] font-bold tabular-nums shrink-0 text-white/70">
                        {item.dataHora.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div>
                        <div className="font-semibold text-white group-hover:text-[#FF7A97] transition-colors">
                          {item.titulo}
                        </div>
                        <div className="text-sm text-text-secondary tabular-nums flex items-center gap-2">
                          {item.dataHora.toDate().toLocaleString('pt-BR')}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${tipoCores[item.tipo]}`}>
                            {tipoLabels[item.tipo]}
                          </span>
                        </div>
                        {item.descricao && (
                          <div className="text-sm text-text-secondary mt-1 line-clamp-2">
                            {item.descricao}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botão de exclusão para itens da agenda */}
                      {item.source === 'agenda' && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir compromisso"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}

                      {/* Próximos compromissos: apenas visualização */}
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary px-2 py-1 bg-white/[0.06] rounded-full">
                        Próximos 5 dias
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => {
          setShowModal(false);
          setEditingItem(null);
          resetForm();
        }}>
          <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex items-center gap-3 mb-6">
              <svg className="w-5 h-5 text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">
                  {editingItem ? 'Editar Compromisso' : 'Novo Compromisso'}
                </h2>
                <p className="text-text-secondary text-sm">Gerencie seus compromissos</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2 text-text-secondary">
                  Título
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  placeholder="Digite o título do compromisso"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2 text-text-secondary">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  placeholder="Descrição opcional do compromisso"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2 text-text-secondary">
                  Data e Hora
                </label>
                <input
                  type="datetime-local"
                  value={formData.dataHora}
                  onChange={(e) => setFormData({ ...formData, dataHora: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2 text-text-secondary">
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'agenda' })}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50"
                >
                  <option value="agenda">Agenda</option>
                </select>
              </div>



              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all"
                >
                  {editingItem ? 'Atualizar' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl transition-colors font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {showViewModal && viewingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => {
          setShowViewModal(false);
          setViewingItem(null);
        }}>
          <div className="bg-[#12101a] border border-white/10 rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] relative overflow-hidden p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-x-0 top-0 gx-line" />
            <div className="flex items-center gap-3 mb-6">
              <svg className="w-5 h-5 text-[#FF5C7E] drop-shadow-[0_0_8px_rgba(255,30,86,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div>
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em]">
                  Visualizar {viewingItem.source === 'crm' ? 'Tarefa CRM' : viewingItem.source === 'aviso' ? 'Aviso Importante' : viewingItem.source === 'comunidade' ? 'Evento Comunidade' : 'Nota'}
                </h2>
                <p className="text-text-secondary text-sm tabular-nums">
                  {viewingItem.dataHora.toDate().toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2 text-text-secondary">
                  Título
                </label>
                <div className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white">
                  {viewingItem.titulo}
                </div>
              </div>

              {viewingItem.descricao && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2 text-text-secondary">
                    Descrição
                  </label>
                  <div className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white">
                    {viewingItem.descricao}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2 text-text-secondary">
                  Data e Hora
                </label>
                <div className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white">
                  {viewingItem.dataHora.toDate().toLocaleString('pt-BR')}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2 text-text-secondary">
                  Tipo
                </label>
                <div className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white">
                  {tipoLabels[viewingItem.tipo]}
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingItem(null);
                  }}
                  className="flex-1 px-6 py-3 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl transition-colors font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agenda do Dia */}
      <DayAgendaModal
        isOpen={showDayAgendaModal}
        onClose={() => setShowDayAgendaModal(false)}
        date={selectedDayDate}
        items={selectedDayItems}
      />
    </div>
  );
} 