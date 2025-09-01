'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';

interface AgendaImobiliaria {
  id: string;
  titulo: string;
  descricao?: string;
  data: Timestamp;
  dataInicio?: Timestamp;
  dataFim?: Timestamp;
  tipo: 'reuniao' | 'evento' | 'treinamento' | 'outro';
  local?: string;
  responsavel?: string;
  imobiliariaId: string;
}

export default function AgendaImobiliariaAdminPage() {
  const { currentUser, userData } = useAuth();
  const [agenda, setAgenda] = useState<AgendaImobiliaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaImobiliaria | null>(null);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    dataInicio: '',
    dataFim: '',
    tipo: 'reuniao' as 'reuniao' | 'evento' | 'treinamento' | 'outro',
    local: '',
    responsavel: ''
  });

  // Buscar agenda da imobiliária
  useEffect(() => {
    const fetchAgenda = async () => {
      if (!userData?.imobiliariaId) return;
      
      setLoading(true);
      try {
        const q = query(
          collection(db, 'agendaImobiliaria'),
          where('imobiliariaId', '==', userData.imobiliariaId)
        );
        const snapshot = await getDocs(q);
        const agendaData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AgendaImobiliaria[];
        
        console.log('Agenda encontrada:', agendaData);
        
        // Ordenar localmente por data de início (mais recentes primeiro)
        const sortedAgenda = agendaData.sort((a, b) => {
          const aDate = a.dataInicio?.toDate ? a.dataInicio.toDate() : new Date(0);
          const bDate = b.dataInicio?.toDate ? b.dataInicio.toDate() : new Date(0);
          return bDate.getTime() - aDate.getTime();
        });
        
        console.log('Agenda ordenada:', sortedAgenda);
        setAgenda(sortedAgenda);
      } catch (error) {
        console.error('Erro ao buscar agenda:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgenda();
  }, [userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.imobiliariaId) return;

    try {
      const eventData = {
        ...formData,
        data: Timestamp.now(),
        imobiliariaId: userData.imobiliariaId,
        dataInicio: formData.dataInicio ? Timestamp.fromDate(new Date(formData.dataInicio)) : undefined,
        dataFim: formData.dataFim ? Timestamp.fromDate(new Date(formData.dataFim)) : undefined
      };

      if (editingEvent) {
        // Atualizar evento existente
        await updateDoc(doc(db, 'agendaImobiliaria', editingEvent.id), eventData);
        setAgenda(prev => prev.map(event => 
          event.id === editingEvent.id ? { ...event, ...eventData } : event
        ));
      } else {
        // Criar novo evento
        const docRef = await addDoc(collection(db, 'agendaImobiliaria'), eventData);
        const newEvent = { id: docRef.id, ...eventData };
        setAgenda(prev => [newEvent, ...prev]);
      }

      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
    }
  };

  const handleEdit = (event: AgendaImobiliaria) => {
    setEditingEvent(event);
    setFormData({
      titulo: event.titulo,
      descricao: event.descricao || '',
      dataInicio: event.dataInicio ? event.dataInicio.toDate().toISOString().slice(0, 16) : '',
      dataFim: event.dataFim ? event.dataFim.toDate().toISOString().slice(0, 16) : '',
      tipo: event.tipo,
      local: event.local || '',
      responsavel: event.responsavel || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;

    try {
      await deleteDoc(doc(db, 'agendaImobiliaria', eventId));
      setAgenda(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      dataInicio: '',
      dataFim: '',
      tipo: 'reuniao',
      local: '',
      responsavel: ''
    });
    setEditingEvent(null);
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'reuniao': return '👥';
      case 'evento': return '🎉';
      case 'treinamento': return '📚';
      default: return '📅';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'reuniao': return 'bg-blue-500';
      case 'evento': return 'bg-purple-500';
      case 'treinamento': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'reuniao': return 'Reunião';
      case 'evento': return 'Evento';
      case 'treinamento': return 'Treinamento';
      default: return 'Outro';
    }
  };

  if (!userData?.permissoes?.admin) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-4">
              Acesso Negado
            </h1>
            <p className="text-[#6B6F76] dark:text-gray-300">
              Você não tem permissão para acessar esta página.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">
                Agenda Imobiliária
              </h1>
              <p className="text-[#6B6F76] dark:text-gray-300">
                Gerencie os eventos e compromissos da imobiliária
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Novo Evento
            </button>
          </div>
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white dark:bg-[#23283A] rounded-xl p-6 mb-8 border border-[#E8E9F1] dark:border-[#23283A] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#2E2F38] dark:text-white">
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-[#6B6F76] dark:text-gray-300 hover:text-[#2E2F38] dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titulo}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Título do evento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                    Tipo *
                  </label>
                  <select
                    required
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="reuniao">👥 Reunião</option>
                    <option value="evento">🎉 Evento</option>
                    <option value="treinamento">📚 Treinamento</option>
                    <option value="outro">📅 Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                    Data/Hora de Início
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dataInicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataInicio: e.target.value }))}
                    className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                    Data/Hora de Fim
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dataFim}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataFim: e.target.value }))}
                    className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                    Local
                  </label>
                  <input
                    type="text"
                    value={formData.local}
                    onChange={(e) => setFormData(prev => ({ ...prev, local: e.target.value }))}
                    className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Local do evento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                    Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.responsavel}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                    className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Responsável pelo evento"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Descrição detalhada do evento"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {editingEvent ? 'Atualizar Evento' : 'Criar Evento'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Eventos */}
        <div className="bg-white dark:bg-[#23283A] rounded-xl border border-[#E8E9F1] dark:border-[#23283A] shadow-sm">
          <div className="p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
            <h2 className="text-xl font-semibold text-[#2E2F38] dark:text-white">
              Eventos Agendados ({agenda.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-[#6B6F76] dark:text-gray-300">Carregando eventos...</p>
            </div>
          ) : agenda.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#2E2F38] dark:text-white mb-2">
                Nenhum evento agendado
              </h3>
              <p className="text-[#6B6F76] dark:text-gray-300">
                Comece criando o primeiro evento da imobiliária
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E8E9F1] dark:divide-[#23283A]">
              {agenda.map((event) => (
                <div key={event.id} className="p-6 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-[#2E2F38] dark:text-white">
                          {event.titulo}
                        </h3>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getTipoColor(event.tipo)} text-white`}>
                          {getTipoIcon(event.tipo)} {getTipoLabel(event.tipo)}
                        </span>
                      </div>
                      
                      {event.descricao && (
                        <p className="text-[#6B6F76] dark:text-gray-300 mb-3">
                          {event.descricao}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        {event.dataInicio && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[#6B6F76] dark:text-gray-300">
                              <strong>Início:</strong> {event.dataInicio.toDate().toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                        
                        {event.dataFim && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[#6B6F76] dark:text-gray-300">
                              <strong>Fim:</strong> {event.dataFim.toDate().toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                        
                        {event.local && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-[#6B6F76] dark:text-gray-300">
                              <strong>Local:</strong> {event.local}
                            </span>
                          </div>
                        )}
                        
                        {event.responsavel && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-[#6B6F76] dark:text-gray-300">
                              <strong>Responsável:</strong> {event.responsavel}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(event)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar evento"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir evento"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
