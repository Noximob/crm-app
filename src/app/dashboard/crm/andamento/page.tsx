'use client';

import React, { useState, useEffect } from 'react';
import CrmHeader from '../_components/CrmHeader';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, where } from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import KanbanColumn from './_components/KanbanColumn';
import { Lead } from '@/types';
import LeadCard from './_components/LeadCard';

type LeadsByStage = { [key: string]: Lead[] };

// Componente para título com barra colorida (igual ao usado nas outras páginas)
const SectionTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative ${className}`}>
    <h2 className="text-lg font-bold text-[#2E2F38] dark:text-white relative z-10">{children}</h2>
    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#3478F6] to-[#A3C8F7] rounded-r-full opacity-60"></div>
  </div>
);

export default function AndamentoPage() {
    const { currentUser } = useAuth();
    const [leads, setLeads] = useState<LeadsByStage>({});
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [overId, setOverId] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        const leadsRef = collection(db, 'leads');
        const q = query(leadsRef, where("userId", "==", currentUser.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('onSnapshot triggered, docs count:', snapshot.docs.length);
            const leadsByStage = PIPELINE_STAGES.reduce<LeadsByStage>((acc, stage) => ({ ...acc, [stage]: [] }), {});
            snapshot.forEach((doc) => {
                const lead = { id: doc.id, ...doc.data() } as Lead;
                const stage = lead.etapa || PIPELINE_STAGES[0]; 
                console.log('Lead:', lead.id, 'Stage:', stage);
                if (leadsByStage[stage]) {
                    leadsByStage[stage].push(lead);
                } else {
                    leadsByStage[PIPELINE_STAGES[0]].push(lead);
                }
            });
            console.log('Setting leads:', leadsByStage);
            setLeads(leadsByStage);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const sensors = useSensors(
        useSensor(PointerSensor)
    );
    
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const stage = findContainer(active.id);
        if (stage) {
            const lead = leads[stage].find(l => l.id === active.id);
            setActiveLead(lead || null);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveLead(null);
        setOverId(null);
        const { active, over } = event;

        console.log('DragEnd:', { active: active.id, over: over?.id });

        if (!over) {
            console.log('No drop target detected');
            return;
        }

        let overContainer: string | null = null;
        const overIdStr = over.id.toString();

        if (overIdStr.startsWith('column-')) {
            overContainer = overIdStr.replace('column-', '');
        } else {
            // Se soltou em cima de um card, descobrir a coluna desse card
            overContainer = findContainer(overIdStr);
        }

        if (!overContainer || !PIPELINE_STAGES.includes(overContainer)) {
            console.log('Over is not a valid column:', overContainer);
            return;
        }

        const activeContainer = findContainer(active.id);

        console.log('Containers:', { activeContainer, overContainer });

        if (!activeContainer || activeContainer === overContainer) {
            console.log('Invalid containers or same container, returning');
            return;
        }

        // Atualizar Firestore primeiro
        if (currentUser) {
            const leadRef = doc(db, 'leads', active.id.toString());
            try {
                await updateDoc(leadRef, { etapa: overContainer });
                console.log('Firestore updated successfully');
            } catch (error) {
                console.error("Failed to update lead stage: ", error);
                return;
            }
        }

        // Atualizar estado local
        setLeads((prev) => {
            const newLeads = { ...prev };
            const activeItems = newLeads[activeContainer];
            if (!newLeads[overContainer]) newLeads[overContainer] = [];
            const overItems = newLeads[overContainer];

            const activeIndex = activeItems.findIndex(item => item.id === active.id);
            if (activeIndex === -1) {
                console.log('Lead not found in active container');
                return prev;
            }

            const [movedItem] = activeItems.splice(activeIndex, 1);
            overItems.push({ ...movedItem, etapa: overContainer });

            console.log('State updated:', { activeContainer, overContainer, movedItem: movedItem.id });
            return newLeads;
        });
    };

    const findContainer = (itemId: string | number) => {
        for (const stage of PIPELINE_STAGES) {
            if (leads[stage] && leads[stage].some(lead => lead.id === itemId)) {
                return stage;
            }
        }
        return null;
    };

    return (
        <div className="bg-[#F5F6FA] dark:bg-[#181C23] min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />
            <main className="flex flex-col gap-4 mt-4">
                <div className="bg-white dark:bg-[#23283A] p-4 rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
                    <div className="mb-4">
                        <SectionTitle>Andamento dos Leads</SectionTitle>
                    </div>
                    
                    {loading ? (
                        <div className="text-center py-10">Carregando quadro...</div>
                    ) : (
                        <DndContext 
                            sensors={sensors} 
                            collisionDetection={closestCenter} 
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={event => {
                                const overId = event.over?.id?.toString();
                                if (overId?.startsWith('column-')) {
                                    setOverId(overId.replace('column-', ''));
                                } else {
                                    setOverId(null);
                                }
                            }}
                        >
                            <div className="flex gap-6 overflow-x-auto pb-4">
                                {PIPELINE_STAGES.map(stage => (
                                    <KanbanColumn 
                                        key={stage} 
                                        id={stage} 
                                        title={stage} 
                                        leads={leads[stage] || []} 
                                        isOver={overId === stage}
                                    />
                                ))}
                            </div>
                            <DragOverlay>
                                {activeLead ? <LeadCard lead={activeLead} /> : null}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </main>
        </div>
    );
} 