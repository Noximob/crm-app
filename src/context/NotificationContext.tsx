'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs, Timestamp, onSnapshot } from 'firebase/firestore';

interface NotificationContextType {
  notifications: {
    comunidade: number;
  };
  checkForNewContent: () => Promise<void>;
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
      const postsSnapshot = await getDocs(postsQuery);
      
      // Filtrar posts que NÃO são do próprio usuário
      const postsFromOthers = postsSnapshot.docs.filter(doc => {
        const postData = doc.data();
        return postData.userId !== user.uid;
      });
      
      setNotifications(prev => ({
        ...prev,
        comunidade: postsFromOthers.length
      }));

      console.log(`Encontradas ${postsFromOthers.length} novidades na comunidade (excluindo posts próprios)`);
    } catch (error) {
      console.error('Erro ao verificar novidades:', error);
    }
  };

  const resetNotification = async (section: 'comunidade') => {
    if (!user) return;

    console.log('Resetando notificação da comunidade...');

    try {
      // Atualizar última visita
      const userVisitsRef = doc(db, 'userVisits', user.uid);
      await setDoc(userVisitsRef, {
        [section]: Timestamp.now()
      }, { merge: true });

      // Resetar notificação local imediatamente
      setNotifications(prev => ({
        ...prev,
        [section]: 0
      }));

      console.log('Notificação resetada com sucesso!');
    } catch (error) {
      console.error('Erro ao resetar notificação:', error);
    }
  };

  // Verificar novidades quando o usuário carrega
  useEffect(() => {
    if (user && userData) {
      checkForNewContent();
    }
  }, [user, userData]);

  // Monitorar novos posts em tempo real (apenas para detectar novos posts)
  useEffect(() => {
    if (!user || !userData) return;

    // Monitorar todos os posts para detectar novos
    const postsQuery = query(collection(db, 'comunidadePosts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
      // Buscar última visita atualizada
      const userVisitsRef = doc(db, 'userVisits', user.uid);
      const userVisitsDoc = await getDoc(userVisitsRef);
      const lastVisits = userVisitsDoc.exists() ? userVisitsDoc.data() : {};
      const comunidadeLastVisit = lastVisits.comunidade?.toDate?.() || new Date(0);
      
      // Filtrar posts mais recentes que a última visita e que não são do próprio usuário
      const newPostsFromOthers = snapshot.docs.filter(doc => {
        const postData = doc.data();
        const postDate = postData.createdAt?.toDate?.() || new Date(0);
        return postDate > comunidadeLastVisit && postData.userId !== user.uid;
      });
      
      setNotifications(prev => ({
        ...prev,
        comunidade: newPostsFromOthers.length
      }));
    });

    return () => unsubscribe();
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