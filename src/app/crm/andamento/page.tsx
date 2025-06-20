'use client';

import React, { useState, useEffect } from 'react';
import CrmHeader from '../_components/CrmHeader';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, DocumentData } from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import KanbanColumn from './_components/KanbanColumn';

interface Lead extends DocumentData {
    id: string;
    etapa: string;
}
  
type LeadsByStage = { [key: string]: Lead[] };

export default function AndamentoPage() {
    const { currentUser } = useAuth();
    const [leads, setLeads] = useState<LeadsByStage>({});
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
    
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
    
        if (over && active.id !== over.id) {
            const activeContainer = findContainer(active.id);
            const overContainer = over.id.toString();

            if (!activeContainer || !overContainer || activeContainer === overContainer) {
                return;
            }

            // Atualiza o estado visualmente de forma otimista
            setLeads((prev) => {
                const newLeads = { ...prev };
                const activeItems = newLeads[activeContainer];
                const overItems = newLeads[overContainer];
        
                const [movedItem] = activeItems.splice(activeItems.findIndex(item => item.id === active.id), 1);
                overItems.push(movedItem);
                
                // Crie uma cópia do item movido antes de modificar
                const updatedMovedItem = { ...movedItem, etapa: overContainer };
                
                // Substitua o item antigo pelo novo no array de destino
                overItems[overItems.length - 1] = updatedMovedItem;
        
                return newLeads;
            });

            // Atualiza no Firebase
            if (currentUser) {
                const leadRef = doc(db, `leads/${currentUser.uid}/leads`, active.id.toString());
                try {
                    await updateDoc(leadRef, { etapa: overContainer });
                } catch (error) {
                    console.error("Failed to update lead stage: ", error);
                    // Reverter a mudança otimista em caso de erro
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
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <div className="flex gap-4 overflow-x-auto pb-4">
                            {PIPELINE_STAGES.map(stage => (
                                <KanbanColumn key={stage} id={stage} title={stage} leads={leads[stage] || []} />
                            ))}
                        </div>
                    </DndContext>
                )}
            </main>
        </div>
    );
} 