'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';

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
  tipo: 'agenda' | 'crm' | 'nota';
  status: 'pendente' | 'concluida' | 'cancelada';
  cor: string;
  leadId?: string;
  leadNome?: string;
  createdAt: Timestamp;
  userId: string;
  source?: 'agenda' | 'notas' | 'crm';
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

export default function AgendaPage() {
  const { currentUser } = useAuth();
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [crmTasks, setCrmTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'crm' | 'nota' | 'agenda'>('all');

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    dataHora: '',
    tipo: 'agenda' as 'agenda',
    cor: '#10B981' // Cor fixa verde para agenda
  });

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser, selectedDate, filter]);

  const fetchAllData = async () => {
    if (!currentUser) return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

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
            cor: '#F59E0B',
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
    
    // Aplicar filtro se necessário
    if (filter !== 'all') {
      return allItems.filter(item => item.tipo === filter);
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
                onClick={() => handleEdit(item)}
                title={item.titulo}
              >
                {item.titulo}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3478F6]"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F6FA] dark:bg-[#181C23] min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3478F6] via-[#A3C8F7] to-[#6B6F76] bg-clip-text text-transparent mb-2">
              Agenda Completa
            </h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Organize seus compromissos pessoais e profissionais</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#3478F6] to-[#A3C8F7] text-white rounded-xl hover:from-[#255FD1] hover:to-[#3478F6] transition-all duration-300 transform hover:scale-105 shadow-lg font-semibold"
          >
            <PlusIcon className="h-5 w-5" />
            Novo Compromisso
          </button>
        </div>

        {/* Filtros e Controles */}
        <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-6 mb-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#3478F6]"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'crm' | 'nota' | 'agenda')}
                className="px-4 py-2 bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl focus:ring-2 focus:ring-[#3478F6] focus:border-transparent text-[#2E2F38] dark:text-white font-medium"
              >
                <option value="all">Todos os tipos</option>
                <option value="crm">CRM</option>
                <option value="nota">Notas</option>
                <option value="agenda">Agenda</option>
              </select>


            </div>

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
                {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
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

        {/* Lista de Compromissos */}
        <div className="bg-gradient-to-br from-[#A3C8F7]/30 to-[#3478F6]/10 border-2 border-[#3478F6]/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#3478F6]"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-[#3478F6] to-[#A3C8F7] rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">Próximos Compromissos</h2>
              <p className="text-[#6B6F76] dark:text-gray-300">Seus compromissos futuros</p>
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
                    userId: currentUser?.uid || '',
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
                .slice(0, 5); // Sempre mostrar apenas 5 próximos compromissos
              
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

                    {/* Próximos compromissos: apenas visualização */}
                    <div className="text-xs text-[#6B6F76] dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                      Próximos 5 dias
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => {
          setShowModal(false);
          setEditingItem(null);
          resetForm();
        }}>
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 w-full max-w-md shadow-xl border border-[#E8E9F1] dark:border-[#23283A]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-[#3478F6] to-[#A3C8F7] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white">
                  {editingItem ? 'Editar Compromisso' : 'Novo Compromisso'}
                </h2>
                <p className="text-[#6B6F76] dark:text-gray-300 text-sm">Gerencie seus compromissos</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[#2E2F38] dark:text-white">
                  Título
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl focus:ring-2 focus:ring-[#3478F6] focus:border-transparent text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400"
                  placeholder="Digite o título do compromisso"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-[#2E2F38] dark:text-white">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl focus:ring-2 focus:ring-[#3478F6] focus:border-transparent text-[#2E2F38] dark:text-white placeholder-[#6B6F76] dark:placeholder-gray-400"
                  placeholder="Descrição opcional do compromisso"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-[#2E2F38] dark:text-white">
                  Data e Hora
                </label>
                <input
                  type="datetime-local"
                  value={formData.dataHora}
                  onChange={(e) => setFormData({ ...formData, dataHora: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl focus:ring-2 focus:ring-[#3478F6] focus:border-transparent text-[#2E2F38] dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-[#2E2F38] dark:text-white">
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'agenda' })}
                  className="w-full px-4 py-3 bg-white dark:bg-[#181C23] border border-[#E8E9F1] dark:border-[#23283A] rounded-xl focus:ring-2 focus:ring-[#3478F6] focus:border-transparent text-[#2E2F38] dark:text-white"
                >
                  <option value="agenda">Agenda</option>
                </select>
              </div>



              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#3478F6] to-[#A3C8F7] text-white rounded-xl hover:from-[#255FD1] hover:to-[#3478F6] transition-all duration-300 font-semibold shadow-lg"
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
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-[#181C23] text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-[#23283A] transition-colors font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 