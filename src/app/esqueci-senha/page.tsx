'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    if (!email) {
      setError('Por favor, insira seu email.');
      setIsLoading(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/user-not-found') setError('Email não encontrado. Verifique se o email está correto.');
      else if (e.code === 'auth/invalid-email') setError('Email inválido. Por favor, insira um email válido.');
      else setError('Ocorreu um erro ao enviar o email. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-particles flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="al-card p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 gx-line" />
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <span className="relative grid place-items-center w-14 h-14 rounded-full border-2 border-[#FF3364] shadow-[0_0_20px_rgba(255,30,86,0.6),inset_0_0_12px_rgba(255,30,86,0.25)]">
                <span className="al-display text-[24px] font-bold text-[#FF3364] leading-none [text-shadow:0_0_12px_rgba(255,30,86,0.85)]">N</span>
              </span>
            </div>
            <h1 className="al-display text-2xl font-bold text-white mb-2">Esqueceu sua senha?</h1>
            <p className="text-text-secondary text-sm">
              Digite seu email e enviaremos um link para redefinir sua senha
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1.5">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 transition-colors"
                  placeholder="Seu email"
                />
              </div>
              {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:ring-offset-2 focus:ring-offset-[#12101a] disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98]"
              >
                {isLoading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
                <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="al-display text-xl font-semibold text-white">Email enviado!</h2>
              <p className="text-text-secondary text-sm">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
            </div>
          )}

          <div className="text-center mt-6">
            <Link href="/entrar" className="text-sm font-medium text-[#FF7A97] hover:text-[#FF9EB5] transition-colors">
              ← Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
