'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';

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
  tipo: 'agenda' | 'crm' | 'nota';
  status: 'pendente' | 'concluida' | 'cancelada';
  cor: string;
  leadId?: string;
  leadNome?: string;
  createdAt: Timestamp;
  userId: string;
  source?: 'agenda' | 'notas' | 'crm';
  originalId?: string;
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

const tipoCores = {
  agenda: 'bg-emerald-500',
  crm: 'bg-blue-500',
  nota: 'bg-yellow-500'
};

const tipoLabels = {
  agenda: 'Agenda',
  crm: 'CRM',
  nota: 'Nota'
};

export default function AgendaUsuariosPage() {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [crmTasks, setCrmTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'crm' | 'nota' | 'agenda'>('all');

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
        fetchCrmTasks()
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
            cor: '#F59E0B',
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
          cor: '#6366F1',
          createdAt: task.dueDate,
          userId: selectedUser,
          source: 'crm',
          originalId: task.id,
          leadId: task.leadId,
          leadNome: task.leadNome
        });
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
          className={`p-3 border-r border-b border-[#E8E9F1] dark:border-[#23283A] min-h-[120px] transition-all duration-200 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] ${
            date.getMonth() === currentMonth ? 'bg-white dark:bg-[#23283A]' : 'bg-gray-50 dark:bg-[#181C23]'
          } ${date.toDateString() === today.toDateString() ? 'bg-gradient-to-br from-[#3478F6]/10 to-[#A3C8F7]/10 border-[#3478F6]/30' : ''}`}
        >
          <div className={`text-sm font-bold mb-2 ${
            date.toDateString() === today.toDateString() 
              ? 'text-[#3478F6]' 
              : date.getMonth() === currentMonth 
                ? 'text-[#2E2F38] dark:text-white' 
                : 'text-[#6B6F76] dark:text-gray-400'
          }`}>
            {date.getDate()}
          </div>
          <div className="space-y-1">
            {items.slice(0, 3).map((item: AgendaItem) => (
              <div
                key={item.id}
                className={`text-xs p-2 rounded-lg ${tipoCores[item.tipo]} text-white truncate cursor-pointer hover:opacity-80 transition-opacity duration-200 shadow-sm`}
                title={`${item.dataHora.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${item.titulo}`}
              >
                <div className="font-bold">
                  {item.dataHora.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="truncate">{item.titulo}</div>
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-xs text-[#6B6F76] dark:text-gray-400 font-medium">
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
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Agenda dos Usuários</h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Visualize a agenda de todos os usuários da imobiliária</p>
          </div>
        </div>

        {/* Seletor de Usuário */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-2 text-[#2E2F38] dark:text-white">
                Selecionar Usuário
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl focus:ring-2 focus:ring-[#3478F6] focus:border-transparent text-[#2E2F38] dark:text-white"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nome} ({user.tipoConta === 'imobiliaria' ? 'Administrador' : 'Corretor'})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2 text-[#2E2F38] dark:text-white">
                Filtrar por Tipo
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'crm' | 'nota' | 'agenda')}
                className="px-4 py-3 bg-white dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl focus:ring-2 focus:ring-[#3478F6] focus:border-transparent text-[#2E2F38] dark:text-white"
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
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setSelectedDate(newDate);
                    }}
                    className="p-3 hover:bg-white/60 dark:hover:bg-[#23283A]/60 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#3478F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="font-bold text-lg text-[#2E2F38] dark:text-white min-w-[200px] text-center">
                    {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} - {selectedUserName}
                  </span>
                  <button
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedDate(newDate);
                    }}
                    className="p-3 hover:bg-white/60 dark:hover:bg-[#23283A]/60 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#3478F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Calendário */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] overflow-hidden mb-8">
              {/* Dias da semana */}
              <div className="grid grid-cols-7 bg-gradient-to-r from-[#3478F6]/10 to-[#A3C8F7]/10">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="p-4 text-center font-bold text-[#2E2F38] dark:text-white border-b border-[#E8E9F1] dark:border-[#23283A]">
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
            <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#3478F6]"></div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-[#3478F6] to-[#A3C8F7] rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Próximos Compromissos - {selectedUserName}</h2>
                  <p className="text-[#6B6F76] dark:text-gray-300">Próximos 5 compromissos do usuário</p>
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
                          cor: '#F59E0B',
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
                        userId: selectedUser,
                        source: 'crm',
                        originalId: task.id,
                        leadId: task.leadId,
                        leadNome: task.leadNome
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
                      className={`group p-4 rounded-xl border border-[#E8E9F1] dark:border-[#23283A] hover:bg-white/60 dark:hover:bg-[#23283A]/60 transition-all duration-300 ${
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
                            <div className="font-semibold text-[#2E2F38] dark:text-white group-hover:text-[#3478F6] transition-colors">
                              {item.titulo}
                            </div>
                            <div className="text-sm text-[#6B6F76] dark:text-gray-300">
                              {item.dataHora.toDate().toLocaleString('pt-BR')} • {tipoLabels[item.tipo]}
                            </div>
                            {item.descricao && (
                              <div className="text-sm text-[#6B6F76] dark:text-gray-400 mt-1 line-clamp-2">
                                {item.descricao}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Apenas visualização */}
                        <div className="text-xs text-[#6B6F76] dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
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
          <div className="text-center py-8">
            <div className="text-[#6B6F76] dark:text-gray-300">Carregando agenda...</div>
          </div>
        )}
      </div>
    </div>
  );
} 