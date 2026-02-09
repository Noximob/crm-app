'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, orderBy, Timestamp, doc } from 'firebase/firestore';
// Ícones customizados
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6"/>
    <line x1="8" x2="8" y1="2" y2="6"/>
    <line x1="3" x2="21" y1="10" y2="10"/>
  </svg>
);

const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
    <path d="M9 9h1v6H9z"/>
    <path d="M14 9h1v6h-1z"/>
    <path d="M4 14h16"/>
  </svg>
);

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

interface Corretor {
  id: string;
  nome: string;
  email: string;
}

interface Plantao {
  id: string;
  dataInicio: string;
  dataFim: string;
  construtora: string;
  corretorResponsavel: string;
  horario: string;
  observacoes?: string;
  criadoEm: Timestamp;
  presentesIds?: string[];
}

export default function PlantoesAdminPage() {
  const { userData } = useAuth();
  const [plantoes, setPlantoes] = useState<Plantao[]>([]);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlantao, setEditingPlantao] = useState<Plantao | null>(null);
  const [formData, setFormData] = useState({
    dataInicio: '',
    dataFim: '',
    construtora: '',
    corretorResponsavel: '',
    horario: '',
    observacoes: ''
  });

  // Verificar se o usuário é administrador
  if (!userData?.permissoes?.admin) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚫</span>
            </div>
            <h1 className="text-2xl font-bold text-[#2E2F38] dark:text-white mb-2">Acesso Negado</h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Você não tem permissão para acessar esta área.</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchPlantoes();
  }, []);

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    const q = query(
      collection(db, 'usuarios'),
      where('imobiliariaId', '==', userData.imobiliariaId),
      where('tipoConta', 'in', ['corretor-vinculado', 'corretor-autonomo'])
    );
    getDocs(q).then(snap => {
      setCorretores(snap.docs.map(d => ({ id: d.id, nome: (d.data().nome as string) || '', email: (d.data().email as string) || '' })));
    });
  }, [userData?.imobiliariaId]);

  const fetchPlantoes = async () => {
    try {
      console.log('Buscando plantões para imobiliariaId:', userData.imobiliariaId);
      const q = query(
        collection(db, 'plantoes'),
        where('imobiliariaId', '==', userData.imobiliariaId)
      );
      const snapshot = await getDocs(q);
      console.log('Plantões encontrados:', snapshot.docs.length);
      
      const plantoesData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Plantão encontrado:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data
        };
      }) as Plantao[];
      
      // Ordenar por data de início após buscar
      const plantoesOrdenados = plantoesData.sort((a, b) => {
        const dataA = new Date(a.dataInicio);
        const dataB = new Date(b.dataInicio);
        return dataA.getTime() - dataB.getTime();
      });
      
      console.log('Plantões ordenados:', plantoesOrdenados);
      setPlantoes(plantoesOrdenados);
    } catch (error) {
      console.error('Erro ao buscar plantões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const plantaoData = {
        ...formData,
        imobiliariaId: userData.imobiliariaId,
        criadoEm: Timestamp.now()
      };

      if (editingPlantao) {
        await updateDoc(doc(db, 'plantoes', editingPlantao.id), plantaoData);
      } else {
        await addDoc(collection(db, 'plantoes'), plantaoData);
      }

      setFormData({
        dataInicio: '',
        dataFim: '',
        construtora: '',
        corretorResponsavel: '',
        horario: '',
        observacoes: ''
      });
      setEditingPlantao(null);
      setShowForm(false);
      fetchPlantoes();
    } catch (error) {
      console.error('Erro ao salvar plantão:', error);
    }
  };

  const handleEdit = (plantao: Plantao) => {
    setEditingPlantao(plantao);
    setFormData({
      dataInicio: plantao.dataInicio,
      dataFim: plantao.dataFim,
      construtora: plantao.construtora,
      corretorResponsavel: plantao.corretorResponsavel,
      horario: plantao.horario,
      observacoes: plantao.observacoes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plantão?')) {
      try {
        await deleteDoc(doc(db, 'plantoes', id));
        fetchPlantoes();
      } catch (error) {
        console.error('Erro ao excluir plantão:', error);
      }
    }
  };

  const cancelEdit = () => {
    setEditingPlantao(null);
    setFormData({
      dataInicio: '',
      dataFim: '',
      construtora: '',
      corretorResponsavel: '',
      horario: '',
      observacoes: ''
    });
    setShowForm(false);
  };

  const togglePresentePlantao = async (plantao: Plantao, corretorId: string) => {
    const atuais = plantao.presentesIds || [];
    const novos = atuais.includes(corretorId)
      ? atuais.filter(id => id !== corretorId)
      : [...atuais, corretorId];
    try {
      await updateDoc(doc(db, 'plantoes', plantao.id), { presentesIds: novos });
      setPlantoes(prev => prev.map(p => p.id === plantao.id ? { ...p, presentesIds: novos } : p));
    } catch (e) {
      console.error('Erro ao atualizar presentes:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5CF6] mx-auto"></div>
            <p className="text-[#6B6F76] dark:text-gray-300 mt-4">Carregando plantões...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Gestão de Plantões</h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Gerencie os plantões da imobiliária</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white rounded-xl hover:shadow-lg transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5" />
            Novo Plantão
          </button>
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 mb-8 border border-[#E8E9F1] dark:border-[#23283A] shadow-lg">
            <h2 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-6">
              {editingPlantao ? 'Editar Plantão' : 'Novo Plantão'}
            </h2>
            
                         <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                 <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                   Data de Início *
                 </label>
                 <input
                   type="date"
                   required
                   value={formData.dataInicio}
                   onChange={(e) => setFormData({...formData, dataInicio: e.target.value})}
                   className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                   Data de Fim *
                 </label>
                 <input
                   type="date"
                   required
                   value={formData.dataFim}
                   onChange={(e) => setFormData({...formData, dataFim: e.target.value})}
                   className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                 />
               </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Horário *
                </label>
                <input
                  type="time"
                  required
                  value={formData.horario}
                  onChange={(e) => setFormData({...formData, horario: e.target.value})}
                  className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Construtora *
                </label>
                <input
                  type="text"
                  required
                  value={formData.construtora}
                  onChange={(e) => setFormData({...formData, construtora: e.target.value})}
                  placeholder="Nome da construtora"
                  className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Corretor Responsável *
                </label>
                <input
                  type="text"
                  required
                  value={formData.corretorResponsavel}
                  onChange={(e) => setFormData({...formData, corretorResponsavel: e.target.value})}
                  placeholder="Nome do corretor"
                  className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2E2F38] dark:text-white mb-2">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Observações adicionais sobre o plantão"
                  rows={3}
                  className="w-full px-4 py-3 border border-[#E8E9F1] dark:border-[#23283A] rounded-lg bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white rounded-lg hover:shadow-lg transition-all duration-200"
                >
                  {editingPlantao ? 'Atualizar' : 'Criar'} Plantão
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Plantões */}
        <div className="bg-white dark:bg-[#23283A] rounded-2xl border border-[#E8E9F1] dark:border-[#23283A] shadow-lg overflow-hidden">
          <div className="p-6 border-b border-[#E8E9F1] dark:border-[#23283A]">
            <h3 className="text-lg font-semibold text-[#2E2F38] dark:text-white">Plantões Agendados</h3>
          </div>

          {plantoes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-[#8B5CF6]/10 to-[#A855F7]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-[#8B5CF6]" />
              </div>
              <h3 className="text-lg font-semibold text-[#2E2F38] dark:text-white mb-2">Nenhum plantão agendado</h3>
              <p className="text-[#6B6F76] dark:text-gray-300">Clique em "Novo Plantão" para começar</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E8E9F1] dark:divide-[#23283A]">
              {plantoes.map((plantao) => (
                <div key={plantao.id} className="p-6 hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                                                                     <div className="flex items-center gap-4 mb-3">
                         <div className="flex items-center gap-2 px-3 py-1 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-full">
                           <CalendarIcon className="h-4 w-4" />
                           <span className="text-sm font-medium">
                           {new Date(plantao.dataInicio).toLocaleDateString('pt-BR', {
                             day: '2-digit',
                             month: '2-digit'
                           })} - {new Date(plantao.dataFim).toLocaleDateString('pt-BR', {
                             day: '2-digit',
                             month: '2-digit'
                           })}
                         </span>
                       </div>
                       <div className="flex items-center gap-2 px-3 py-1 bg-[#A855F7]/10 text-[#A855F7] rounded-full">
                         <ClockIcon className="h-4 w-4" />
                         <span className="text-sm font-medium">
                           {plantao.horario && plantao.horario.length >= 5 
                             ? plantao.horario.substring(0, 5) 
                             : plantao.horario}
                         </span>
                       </div>
                     </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <BuildingIcon className="h-4 w-4 text-[#8B5CF6]" />
                          <span className="text-sm text-[#6B6F76] dark:text-gray-300">Construtora:</span>
                          <span className="font-medium text-[#2E2F38] dark:text-white">{plantao.construtora}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-[#8B5CF6]" />
                          <span className="text-sm text-[#6B6F76] dark:text-gray-300">Responsável:</span>
                          <span className="font-medium text-[#2E2F38] dark:text-white">{plantao.corretorResponsavel}</span>
                        </div>
                      </div>
                      
                      {plantao.observacoes && (
                        <div className="mt-3 p-3 bg-[#8B5CF6]/5 rounded-lg border border-[#8B5CF6]/20">
                          <p className="text-sm text-[#2E2F38] dark:text-white">
                            <span className="font-medium text-[#8B5CF6]">Observações:</span> {plantao.observacoes}
                          </p>
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-[#E8E9F1] dark:border-[#23283A]">
                        <p className="text-sm font-medium text-[#2E2F38] dark:text-white mb-2">Corretores presentes (quem participou)</p>
                        {corretores.length === 0 ? (
                          <p className="text-xs text-[#6B6F76] dark:text-gray-400">Nenhum corretor cadastrado na imobiliária.</p>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {corretores.map(c => (
                              <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={plantao.presentesIds?.includes(c.id) ?? false}
                                  onChange={() => togglePresentePlantao(plantao, c.id)}
                                  className="w-4 h-4 rounded border-[#8B5CF6] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                                />
                                <span className="text-sm text-[#2E2F38] dark:text-white">{c.nome || c.email}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-6">
                      <button
                        onClick={() => handleEdit(plantao)}
                        className="p-2 text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-lg transition-colors"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(plantao.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
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
