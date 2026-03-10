'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ESPELHO_DEMO_UID, ESPELHO_STORAGE_KEY } from '@/lib/constants';

interface UserData {
  nome: string;
  email: string;
  tipoConta: 'imobiliaria' | 'corretor-vinculado' | 'corretor-autonomo';
  imobiliariaId?: string;
  aprovado: boolean;
  criadoEm: any;
  metodoCadastro: 'email' | 'google';
  photoURL?: string;
  permissoes?: {
    admin?: boolean;
    developer?: boolean;
  };
}

/** Usuário mínimo para modo Espelho (sem Firebase). */
export type AuthUser = User | { uid: string; email: string | null };

const ESPELHO_USER: AuthUser = {
  uid: ESPELHO_DEMO_UID,
  email: 'espelho@demo.alumma.com',
} as AuthUser;

const ESPELHO_USER_DATA: UserData = {
  nome: 'Espelho',
  email: 'espelho@demo.alumma.com',
  tipoConta: 'imobiliaria',
  imobiliariaId: 'espelho-demo',
  aprovado: true,
  criadoEm: null,
  metodoCadastro: 'email',
  permissoes: { admin: true, developer: false },
};

interface AuthContextType {
  currentUser: AuthUser | null;
  userData: UserData | null;
  loading: boolean;
  isApproved: boolean;
  isEspelhoDemo: boolean;
  logout: () => Promise<void>;
  enterEspelhoDemo: () => void;
}

export const AuthContext = createContext<AuthContextType>({ 
  currentUser: null, 
  userData: null,
  loading: true, 
  isApproved: false,
  isEspelhoDemo: false,
  logout: async () => {},
  enterEspelhoDemo: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const router = useRouter();

  const enterEspelhoDemo = useCallback(() => {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(ESPELHO_STORAGE_KEY, '1');
    setCurrentUser(ESPELHO_USER);
    setUserData(ESPELHO_USER_DATA);
    setIsApproved(true);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    if (currentUser?.uid === ESPELHO_DEMO_UID) {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(ESPELHO_STORAGE_KEY);
      setCurrentUser(null);
      setUserData(null);
      setIsApproved(false);
      router.push('/');
      return;
    }
    try {
      await firebaseSignOut(auth);
      router.push('/');
    } catch (e) {
      console.error('Erro ao fazer logout:', e);
      router.push('/');
    }
  }, [currentUser?.uid, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(ESPELHO_STORAGE_KEY) === '1') {
      enterEspelhoDemo();
      return;
    }

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

  const isEspelhoDemo = currentUser?.uid === ESPELHO_DEMO_UID;

  // Renovar o token ao voltar para a aba e a cada 50 min para evitar logout por inatividade (apenas Firebase)
  useEffect(() => {
    if (isEspelhoDemo) return;
    const user = auth.currentUser;
    if (!user) return;

    const refreshToken = () => {
      user.getIdToken(true).catch(() => {});
    };

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') refreshToken();
    };

    const intervalMs = 50 * 60 * 1000; // 50 minutos
    const intervalId = setInterval(refreshToken, intervalMs);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [currentUser?.uid, isEspelhoDemo]);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, isApproved, isEspelhoDemo, logout, enterEspelhoDemo }}>
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