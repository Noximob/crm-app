'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

interface NotificationContextType {
  notifications: {
    comunidade: number;
  };
  checkForNewContent: () => Promise<(() => void) | undefined>;
  resetNotification: (section: 'comunidade') => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser: user, userData } = useAuth();
  const [notifications, setNotifications] = useState({
    comunidade: 0
  });

  const checkForNewContent = async () => {
    if (!user || !userData) return;

    try {
      // Buscar última visita do usuário
      const userVisitsRef = doc(db, 'userVisits', user.uid);
      const userVisitsDoc = await getDoc(userVisitsRef);
      const lastVisits = userVisitsDoc.exists() ? userVisitsDoc.data() : {};

      // Verificar novidades na Comunidade (posts mais recentes que a última visita)
      const comunidadeLastVisit = lastVisits.comunidade?.toDate?.() || new Date(0);
      const postsQuery = query(
        collection(db, 'comunidadePosts'),
        where('createdAt', '>', Timestamp.fromDate(comunidadeLastVisit)),
        orderBy('createdAt', 'desc')
      );
      
      // Usar onSnapshot para monitorar em tempo real
      const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        // Filtrar posts que NÃO são do próprio usuário
        const postsFromOthers = snapshot.docs.filter(doc => {
          const postData = doc.data();
          return postData.userId !== user.uid;
        });
        
        setNotifications(prev => ({
          ...prev,
          comunidade: postsFromOthers.length
        }));

        console.log(`🔄 Tempo real: ${postsFromOthers.length} novidades na comunidade (excluindo posts próprios)`);
      }, (error) => {
        console.error('Erro ao monitorar notificações em tempo real:', error);
      });

      // Retornar função de limpeza
      return unsubscribe;
    } catch (error) {
      console.error('Erro ao verificar novidades:', error);
    }
  };

  const resetNotification = async (section: 'comunidade') => {
    if (!user) return;

    console.log('🔄 Resetando notificação da comunidade...');

    try {
      // Atualizar última visita
      const userVisitsRef = doc(db, 'userVisits', user.uid);
      await setDoc(userVisitsRef, {
        [section]: Timestamp.now()
      }, { merge: true });

      // Resetar notificação local imediatamente
      setNotifications(prev => {
        console.log('✅ Notificação resetada localmente:', { ...prev, [section]: 0 });
        return {
          ...prev,
          [section]: 0
        };
      });

      console.log('✅ Notificação resetada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao resetar notificação:', error);
    }
  };

  // Monitorar notificações em tempo real quando o usuário carrega
  useEffect(() => {
    if (user && userData) {
      const unsubscribe = checkForNewContent();
      
      // Limpar subscription quando o componente for desmontado
      return () => {
        if (unsubscribe) {
          unsubscribe.then(unsub => unsub && unsub());
        }
      };
    }
  }, [user, userData]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      checkForNewContent,
      resetNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 