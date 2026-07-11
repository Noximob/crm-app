'use client';

import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

interface NotificationContextType {
  notifications: {
    comunidade: boolean;
  };
  resetNotification: (section: 'comunidade') => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentUser: user } = useAuth();
  const [notifications, setNotifications] = useState({
    comunidade: false
  });

  const resetNotification = async (section: 'comunidade') => {
    if (!user) return;

    try {
      // Atualizar última visita
      const userVisitsRef = doc(db, 'userVisits', user.uid);
      await setDoc(userVisitsRef, {
        [section]: Timestamp.now()
      }, { merge: true });

      // Resetar notificação local imediatamente
      setNotifications(prev => ({
        ...prev,
        [section]: false
      }));
    } catch (error) {
      console.error('Erro ao resetar notificação:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
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
