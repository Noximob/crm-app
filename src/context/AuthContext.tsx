'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface UserData {
  nome: string;
  email: string;
  tipoConta: 'imobiliaria' | 'corretor-vinculado' | 'corretor-autonomo';
  imobiliariaId?: string;
  aprovado: boolean;
  criadoEm: any;
  metodoCadastro: 'email' | 'google';
  photoURL?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  isApproved: boolean;
}

export const AuthContext = createContext<AuthContextType>({ 
  currentUser: null, 
  userData: null,
  loading: true, 
  isApproved: false 
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Usuário está logado
        const userDocRef = doc(db, 'usuarios', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          
          // Se o usuário tem foto do Google e ela não está salva no Firestore, salvar
          if (firebaseUser.photoURL && !data.photoURL) {
            await updateDoc(userDocRef, {
              photoURL: firebaseUser.photoURL
            });
            data.photoURL = firebaseUser.photoURL;
          }
          
          setCurrentUser(firebaseUser);
          setUserData(data);
          
          if (data.aprovado) {
            setIsApproved(true);
          } else {
            // Usuário logado mas não aprovado
            setIsApproved(false);
            // Não forçar logout automaticamente - deixar o usuário ver a mensagem de aguardando aprovação
          }
        } else {
          // Usuário logado mas sem documento no Firestore
          setIsApproved(false);
          setUserData(null);
          await auth.signOut(); // Força o logout
          setCurrentUser(null);
        }
      } else {
        // Usuário não está logado
        setCurrentUser(null);
        setUserData(null);
        setIsApproved(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, isApproved }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 