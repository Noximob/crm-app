'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth, googleProvider } from '@/lib/firebase';
import { AlummaLogo } from '@/components/AlummaLogo';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

export default function EntrarPage() {
  const { currentUser, userData, loading, isApproved } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-particles">
        <p className="text-text-primary">Carregando...</p>
      </div>
    );
  }

  if (currentUser && isApproved) {
    router.push('/dashboard');
    return null;
  }

  if (currentUser && !isApproved) {
    return (
      <div className="min-h-screen bg-particles flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card-glow rounded-2xl p-8 relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-r" />
            <div className="mx-auto h-16 w-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
              <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Aguardando Aprovação</h1>
            <p className="text-text-secondary mb-4">
              Olá {userData?.nome}! Seu cadastro está sendo analisado. Você receberá um e-mail quando for aprovado.
            </p>
            <button
              onClick={() => auth.signOut()}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors border border-orange-500/30"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      setIsLoading(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') setError('E-mail ou senha inválidos.');
      else if (error.code === 'auth/too-many-requests') setError('Muitas tentativas. Tente novamente em alguns minutos.');
      else setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/popup-closed-by-user') setError('Login cancelado.');
      else if (error.code === 'auth/popup-blocked') setError('Permita popups para este site.');
      else setError('Erro ao fazer login com Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-particles flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center mb-2">
          <Link href="/" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">← Voltar ao site</Link>
        </div>
        <div className="card-glow rounded-2xl shadow-xl p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <AlummaLogo variant="full" theme="dark" width={160} height={48} />
            </div>
            <h1 className="text-2xl font-bold text-orange-400 mb-2">Alumma</h1>
            <p className="text-text-secondary text-sm">Você já vendeu hoje?</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[var(--surface-hover)] text-text-primary placeholder-text-secondary transition-colors"
                placeholder="Seu email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border-subtle)] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[var(--surface-hover)] text-text-primary placeholder-text-secondary transition-colors"
                placeholder="Sua senha"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-softgray-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary">Manter senha</label>
              </div>
              <Link href="/esqueci-senha" className="text-sm font-medium text-orange-400 hover:text-orange-300">Esqueceu a senha?</Link>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-[var(--bg-card)] disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_14px_rgba(255,140,0,0.25)]">
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <div className="my-4 relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-[var(--bg-card)] text-text-secondary">ou</span></div>
          </div>
          <button type="button" onClick={handleGoogleLogin} disabled={isGoogleLoading} className="w-full bg-white/5 border border-white/10 text-text-primary font-medium py-3 px-4 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
            {isGoogleLoading ? <span className="animate-spin">⟳</span> : null}
            {isGoogleLoading ? 'Entrando...' : 'Entrar com Google'}
          </button>
          <div className="text-center mt-4">
            <p className="text-sm text-text-secondary">Não tem uma conta? <Link href="/cadastro" className="font-medium text-orange-400 hover:text-orange-300">Cadastre-se</Link></p>
          </div>
        </div>
        <p className="text-center text-xs text-text-secondary">© Alumma. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
