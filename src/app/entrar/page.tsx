'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { ESPELHO_LOGIN, ESPELHO_PASSWORD } from '@/lib/constants';
import LoadingState from '@/components/ui/LoadingState';

export default function EntrarPage() {
  const { currentUser, userData, loading, isApproved, enterEspelhoDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  const shouldRedirect = !loading && !!currentUser && isApproved;

  useEffect(() => {
    if (shouldRedirect) {
      router.push('/dashboard');
    }
  }, [shouldRedirect, router]);

  if (loading || shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-particles">
        <LoadingState label="Carregando..." />
      </div>
    );
  }

  if (currentUser && !isApproved) {
    return (
      <div className="min-h-screen bg-particles flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="al-card p-8 relative overflow-hidden text-center">
            <div className="absolute inset-x-0 top-0 gx-line-gold" />
            <div className="mx-auto h-16 w-16 bg-[#E8C547]/15 rounded-full flex items-center justify-center mb-4 border border-[#E8C547]/30">
              <svg className="h-8 w-8 text-[#FFE9A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="al-display text-xl font-bold text-white uppercase tracking-[0.1em] mb-2">Aguardando Aprovação</h1>
            <p className="text-text-secondary mb-4">
              Olá {userData?.nome}! Seu cadastro está sendo analisado. Você receberá um e-mail quando for aprovado.
            </p>
            <button
              onClick={() => auth.signOut()}
              className="w-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium py-3 px-4 rounded-xl transition-colors"
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
    if (email.trim() === ESPELHO_LOGIN && password === ESPELHO_PASSWORD) {
      enterEspelhoDemo();
      router.push('/dashboard');
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
          <Link href="/" className="text-sm text-[#FF7A97] hover:text-[#FF9EB5] transition-colors">← Voltar ao site</Link>
        </div>
        <div className="al-card p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <span className="relative grid place-items-center w-16 h-16 rounded-full border-2 border-[#FF3364] shadow-[0_0_22px_rgba(255,30,86,0.6),inset_0_0_14px_rgba(255,30,86,0.25)]">
                <span className="al-display text-[28px] font-bold text-[#FF3364] leading-none [text-shadow:0_0_12px_rgba(255,30,86,0.85)]">N</span>
              </span>
            </div>
            <h1 className="al-display text-2xl font-bold text-white uppercase tracking-[0.14em] mb-2">Nox Imóveis</h1>
            <p className="text-text-secondary text-sm">Você já vendeu hoje?</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Email</label>
              <input
                id="email"
                name="email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 transition-colors"
                placeholder="Seu email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 transition-colors"
                placeholder="Sua senha"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded accent-[#FF1E56]" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary">Manter senha</label>
              </div>
              <Link href="/esqueci-senha" className="text-sm font-medium text-[#FF7A97] hover:text-[#FF9EB5]">Esqueceu a senha?</Link>
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:ring-offset-2 focus:ring-offset-[#12101a] disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98]">
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <div className="my-4 relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-[#12101a] rounded text-text-secondary">ou</span></div>
          </div>
          <button type="button" onClick={handleGoogleLogin} disabled={isGoogleLoading} className="w-full bg-white/[0.04] border border-white/10 text-white font-medium py-3 px-4 rounded-xl hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2">
            {isGoogleLoading ? <span className="animate-spin">⟳</span> : null}
            {isGoogleLoading ? 'Entrando...' : 'Entrar com Google'}
          </button>
          <div className="text-center mt-4">
            <p className="text-sm text-text-secondary">Não tem uma conta? <Link href="/cadastro" className="font-medium text-[#FF7A97] hover:text-[#FF9EB5]">Cadastre-se</Link></p>
          </div>
        </div>
        <p className="text-center text-xs text-text-secondary">© Nox Imóveis. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
