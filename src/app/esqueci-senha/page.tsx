'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { AlummaLogo } from '@/components/AlummaLogo';

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
      setError("Por favor, insira seu email.");
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setError("Email não encontrado. Verifique se o email está correto.");
      } else if (error.code === 'auth/invalid-email') {
        setError("Email inválido. Por favor, insira um email válido.");
      } else {
        setError("Ocorreu um erro ao enviar o email. Tente novamente.");
      }
      console.error("Erro ao enviar email de reset:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Card principal */}
        <div className="bg-offwhite-50 rounded-2xl shadow-xl p-6 md:p-8 border border-primary-100">
          {/* Logo e título */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <AlummaLogo variant="full" theme="light" width={140} height={40} />
            </div>
            <h1 className="text-2xl font-bold text-softgray-800 mb-2">
              Esqueceu sua senha?
            </h1>
            <p className="text-softgray-600 text-sm">
              Digite seu email e enviaremos um link para redefinir sua senha
            </p>
          </div>

          {!success ? (
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

              {/* Mensagem de Erro */}
              {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg text-center">{error}</p>}

              {/* Botão de Enviar */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-300 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-softgray-800">
                Email enviado!
              </h2>
              <p className="text-softgray-600 text-sm">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
            </div>
          )}

          {/* Link para voltar ao login */}
          <div className="text-center mt-6">
            <Link 
              href="/" 
              className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              ← Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 