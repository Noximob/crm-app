'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth, db, googleProvider } from '@/lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (user) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.aprovado === true) {
          console.log("Login bem-sucedido e aprovado!");
          router.push('/dashboard');
        } else {
          setError("Seu cadastro ainda está pendente de aprovação.");
          await auth.signOut();
        }
      } else {
        setError("Ocorreu um erro com seu cadastro. Por favor, contate o suporte.");
        await auth.signOut();
      }

    } catch (error: any) {
      setError("E-mail ou senha inválidos.");
      console.error("Erro no login:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Verificar se o usuário já existe no Firestore
      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Usuário já existe, verificar se está aprovado
        const userData = userDoc.data();
        if (userData.aprovado === true) {
          console.log("Login com Google bem-sucedido e aprovado!");
          router.push('/dashboard');
        } else {
          setError("Seu cadastro ainda está pendente de aprovação.");
          await auth.signOut();
        }
      } else {
        // Usuário novo, criar documento no Firestore
        const userData = {
          email: user.email,
          nome: user.displayName || 'Usuário Google',
          telefone: user.phoneNumber || '',
          empresa: '',
          cargo: '',
          aprovado: false, // Usuários do Google precisam ser aprovados também
          dataCadastro: new Date(),
          metodoCadastro: 'google'
        };

        await setDoc(userDocRef, userData);
        setError("Seu cadastro foi criado com sucesso, mas precisa ser aprovado por um administrador.");
        await auth.signOut();
      }

    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setError("Login cancelado pelo usuário.");
      } else if (error.code === 'auth/popup-blocked') {
        setError("Popup bloqueado pelo navegador. Permita popups para este site.");
      } else {
        setError("Erro ao fazer login com Google. Tente novamente.");
      }
      console.error("Erro no login com Google:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Card principal */}
        <div className="bg-offwhite-50 rounded-2xl shadow-xl p-6 md:p-8 border border-primary-100">
          {/* Logo e título */}
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 bg-primary-500 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-softgray-800 mb-2">
              Alume
            </h1>
            <p className="text-softgray-600 text-sm">
              Você já vendeu hoje?
            </p>
          </div>

          {/* Formulário de login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-softgray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-softgray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-colors"
                placeholder="Seu email"
              />
            </div>

            {/* Campo Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-softgray-700 mb-1">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-softgray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-colors"
                placeholder="Sua senha"
              />
            </div>

            {/* Manter senha e link de esqueci a senha */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-softgray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-softgray-700">
                  Manter senha
                </label>
              </div>

              <div className="text-sm">
                <Link href="/esqueci-senha" className="font-medium text-primary-600 hover:text-primary-500">
                  Esqueceu a senha?
                </Link>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg text-center">{error}</p>}

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Divisor */}
          <div className="my-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-softgray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-offwhite-50 text-softgray-500">ou</span>
              </div>
            </div>
          </div>

          {/* Botão Login com Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full bg-white border border-softgray-300 text-softgray-700 font-medium py-3 px-4 rounded-lg hover:bg-softgray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center"
          >
            {isGoogleLoading ? (
              <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8.41-2.2-10.96-5.56A16.06 16.06 0 0112 18c4.41 0 8.41-2.2 10.96-5.56A16.06 16.06 0 0112 18z"/>
                <path fill="#34A853" d="M12 5.56C9.93 5.56 8.08 6.22 6.64 7.36A16.06 16.06 0 0112 12c4.04 0 7.64-2.96 9.08-6.96A16.06 16.06 0 0112 5.56z"/>
                <path fill="#FBBC05" d="M12 18c2.08 0 4.03-.76 5.68-2.04A16.06 16.06 0 0112 18z"/>
                <path fill="#EA4335" d="M12 5.56C14.07 5.56 15.92 6.22 17.36 7.36A16.06 16.06 0 0112 12c-4.04 0-7.64-2.96-9.08-6.96A16.06 16.06 0 0112 5.56z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {isGoogleLoading ? 'Entrando...' : 'Entrar com Google'}
          </button>

          {/* Link para Cadastro */}
          <div className="text-center mt-4">
            <p className="text-sm text-softgray-600">
              Não tem uma conta?{' '}
              <Link href="/cadastro" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-softgray-500">
            © 2024 CRM Imobiliário. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
