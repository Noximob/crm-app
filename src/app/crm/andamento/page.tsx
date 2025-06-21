'use client';

import React, { useState, useEffect } from 'react';
import CrmHeader from '../_components/CrmHeader';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import KanbanColumn from './_components/KanbanColumn';
import { Lead } from '@/types';
import LeadCard from './_components/LeadCard';

type LeadsByStage = { [key: string]: Lead[] };

export default function AndamentoPage() {
    const { currentUser } = useAuth();
    const [leads, setLeads] = useState<LeadsByStage>({});
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        const q = query(collection(db, `leads/${currentUser.uid}/leads`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leadsByStage = PIPELINE_STAGES.reduce<LeadsByStage>((acc, stage) => ({ ...acc, [stage]: [] }), {});
            snapshot.forEach((doc) => {
                const lead = { id: doc.id, ...doc.data() } as Lead;
                const stage = lead.etapa || 'Geladeira';
                if (leadsByStage[stage]) {
                    leadsByStage[stage].push(lead);
                }
            });
            setLeads(leadsByStage);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
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
        const { active, over } = event;
    
        if (over && active.id !== over.id) {
            const activeContainer = findContainer(active.id);
            const overContainer = over.id.toString();

            if (!activeContainer || !overContainer || activeContainer === overContainer) {
                return;
            }

            setLeads((prev) => {
                const newLeads = { ...prev };
                const activeItems = newLeads[activeContainer];
                const overItems = newLeads[overContainer];
        
                const activeIndex = activeItems.findIndex(item => item.id === active.id);
                const [movedItem] = activeItems.splice(activeIndex, 1);
                
                overItems.push({ ...movedItem, etapa: overContainer });
        
                return newLeads;
            });

            if (currentUser) {
                const leadRef = doc(db, `leads/${currentUser.uid}/leads`, active.id.toString());
                try {
                    await updateDoc(leadRef, { etapa: overContainer });
                } catch (error) {
                    console.error("Failed to update lead stage: ", error);
                }
            }
        }
    };

    const findContainer = (itemId: string | number) => {
        for (const stage in leads) {
            if (leads[stage].some(lead => lead.id === itemId)) {
                return stage;
            }
        }
        return null;
    };


    return (
        <div className="bg-slate-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
            <CrmHeader />
            <main className="mt-4">
                {loading ? (
                    <div className="text-center py-10">Carregando quadro...</div>
                ) : (
                    <DndContext 
                        sensors={sensors} 
                        collisionDetection={closestCenter} 
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex gap-4 overflow-x-auto pb-4">
                            {PIPELINE_STAGES.map(stage => (
                                <KanbanColumn key={stage} id={stage} title={stage} leads={leads[stage] || []} />
                            ))}
                        </div>
                        <DragOverlay>
                            {activeLead ? <LeadCard lead={activeLead} /> : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </main>
        </div>
    );
} 