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
  tipo: 'crm' | 'pessoal' | 'profissional' | 'lembrete';
  status: 'pendente' | 'concluida' | 'cancelada';
  cor: string;
  leadId?: string;
  leadNome?: string;
  createdAt: Timestamp;
  userId: string;
}

const tipoCores = {
  crm: 'bg-blue-500',
  pessoal: 'bg-green-500',
  profissional: 'bg-purple-500',
  lembrete: 'bg-orange-500'
};

const tipoLabels = {
  crm: 'CRM',
  pessoal: 'Pessoal',
  profissional: 'Profissional',
  lembrete: 'Lembrete'
};

export default function AgendaPage() {
  const { currentUser } = useAuth();
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'crm' | 'pessoal' | 'profissional' | 'lembrete'>('all');

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    dataHora: '',
    tipo: 'pessoal' as AgendaItem['tipo'],
    cor: '#3B82F6'
  });

  useEffect(() => {
    if (currentUser) {
      fetchAgendaItems();
    }
  }, [currentUser, selectedDate, filter]);

  const fetchAgendaItems = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const agendaRef = collection(db, 'agenda');
      let q = query(
        agendaRef,
        where('userId', '==', currentUser.uid),
        orderBy('dataHora', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const items: AgendaItem[] = [];
      
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as AgendaItem);
      });

      // Filtrar por tipo se necessário
      const filteredItems = filter === 'all' 
        ? items 
        : items.filter(item => item.tipo === filter);

      setAgendaItems(filteredItems);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const agendaData = {
        ...formData,
        dataHora: Timestamp.fromDate(new Date(formData.dataHora)),
        status: 'pendente' as const,
        createdAt: Timestamp.now(),
        userId: currentUser.uid
      };

      if (editingItem) {
        await updateDoc(doc(db, 'agenda', editingItem.id), agendaData);
      } else {
        await addDoc(collection(db, 'agenda'), agendaData);
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchAgendaItems();
    } catch (error) {
      console.error('Erro ao salvar agenda:', error);
    }
  };

  const handleEdit = (item: AgendaItem) => {
    setEditingItem(item);
    setFormData({
      titulo: item.titulo,
      descricao: item.descricao || '',
      dataHora: new Date(item.dataHora.toDate()).toISOString().slice(0, 16),
      tipo: item.tipo,
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
      tipo: 'pessoal',
      cor: '#3B82F6'
    });
  };

  const getItemsForDate = (date: Date) => {
    return agendaItems.filter(item => {
      const itemDate = item.dataHora.toDate();
      return itemDate.toDateString() === date.toDateString();
    });
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
      const items = getItemsForDate(date);
      
      days.push(
        <div
          key={i}
          className={`p-2 border border-gray-200 min-h-[100px] ${
            date.getMonth() === currentMonth ? 'bg-white' : 'bg-gray-50'
          } ${date.toDateString() === today.toDateString() ? 'bg-blue-50 border-blue-300' : ''}`}
        >
          <div className="text-sm font-medium mb-1">
            {date.getDate()}
          </div>
          <div className="space-y-1">
            {items.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className={`text-xs p-1 rounded ${tipoCores[item.tipo]} text-white truncate cursor-pointer hover:opacity-80`}
                onClick={() => handleEdit(item)}
                title={item.titulo}
              >
                {item.titulo}
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-xs text-gray-500">
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2F38] dark:text-white">Agenda Completa</h1>
          <p className="text-[#6B6F76] dark:text-gray-300">Organize seus compromissos pessoais e profissionais</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Novo Compromisso
        </button>
      </div>

      {/* Filtros e Controles */}
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-[#23283A] rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3478F6] focus:border-transparent"
          >
            <option value="all">Todos os tipos</option>
            <option value="crm">CRM</option>
            <option value="pessoal">Pessoal</option>
            <option value="profissional">Profissional</option>
            <option value="lembrete">Lembretes</option>
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded ${viewMode === 'month' ? 'bg-[#3478F6] text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded ${viewMode === 'week' ? 'bg-[#3478F6] text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded ${viewMode === 'day' ? 'bg-[#3478F6] text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Dia
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedDate(newDate);
            }}
            className="p-2 hover:bg-gray-100 rounded"
          >
            ←
          </button>
          <span className="font-medium">
            {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setSelectedDate(newDate);
            }}
            className="p-2 hover:bg-gray-100 rounded"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-white dark:bg-[#23283A] rounded-lg shadow-sm overflow-hidden">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-[#181C23]">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="p-3 text-center font-medium text-gray-600 dark:text-gray-300">
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
      <div className="mt-6 bg-white dark:bg-[#23283A] rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 text-[#2E2F38] dark:text-white">Próximos Compromissos</h2>
        <div className="space-y-3">
          {agendaItems
            .filter(item => item.dataHora.toDate() >= new Date())
            .slice(0, 10)
            .map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                  item.status === 'concluida' ? 'bg-gray-50 dark:bg-[#181C23] opacity-60' : 'bg-white dark:bg-[#23283A]'
                }`}
                style={{ borderLeftColor: item.cor }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.cor }}
                  ></div>
                  <div>
                    <div className="font-medium text-[#2E2F38] dark:text-white">
                      {item.titulo}
                    </div>
                    <div className="text-sm text-[#6B6F76] dark:text-gray-300">
                      {item.dataHora.toDate().toLocaleString('pt-BR')} • {tipoLabels[item.tipo]}
                    </div>
                    {item.descricao && (
                      <div className="text-sm text-[#6B6F76] dark:text-gray-400 mt-1">
                        {item.descricao}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.status !== 'concluida' && (
                    <button
                      onClick={() => handleStatusChange(item.id, 'concluida')}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="Marcar como concluída"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Editar"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Excluir"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#23283A] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-[#2E2F38] dark:text-white">
              {editingItem ? 'Editar Compromisso' : 'Novo Compromisso'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-[#2E2F38] dark:text-white">
                  Título
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3478F6] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#2E2F38] dark:text-white">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3478F6] focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#2E2F38] dark:text-white">
                  Data e Hora
                </label>
                <input
                  type="datetime-local"
                  value={formData.dataHora}
                  onChange={(e) => setFormData({ ...formData, dataHora: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3478F6] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#2E2F38] dark:text-white">
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as AgendaItem['tipo'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3478F6] focus:border-transparent"
                >
                  <option value="pessoal">Pessoal</option>
                  <option value="profissional">Profissional</option>
                  <option value="crm">CRM</option>
                  <option value="lembrete">Lembrete</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#2E2F38] dark:text-white">
                  Cor
                </label>
                <input
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors"
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
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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