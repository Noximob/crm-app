'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CadastroPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui implementaremos a lógica de cadastro
    console.log('Cadastro attempt:', { email, password });
  };

  const handleGoogleCadastro = () => {
    // Aqui implementaremos o cadastro com Google
    console.log('Google cadastro attempt');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-offwhite-50 rounded-2xl shadow-xl p-8 border border-primary-100">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-softgray-800">
              Cadastro
            </h1>
            <p className="text-softgray-600 mt-2 text-sm">
              Crie sua conta e aguarde a aprovação do administrador.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-softgray-700 mb-1">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-softgray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-colors"
                placeholder="Seu melhor email"
              />
            </div>

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
                placeholder="Crie uma senha segura"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Cadastrar
            </button>
          </form>

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

          <button
            onClick={handleGoogleCadastro}
            className="w-full bg-white border border-softgray-300 text-softgray-700 font-medium py-3 px-4 rounded-lg hover:bg-softgray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Cadastrar com Google
          </button>

          <div className="text-center mt-4">
            <p className="text-sm text-softgray-600">
              Já tem conta?{' '}
              <Link href="/" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                Voltar ao login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 