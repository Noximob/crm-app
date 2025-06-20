'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth, db, googleProvider } from '@/lib/firebase'; // Importando nossa config
import { createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'; // Função de criar usuário
import { setDoc, doc, getDoc } from 'firebase/firestore'; // Funções do banco de dados

export default function CadastroPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Validação simples
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Criar o usuário no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Criar o documento do usuário no Firestore
      await setDoc(doc(db, "usuarios", user.uid), {
        email: user.email,
        aprovado: false, // O ponto-chave da nossa regra de negócio!
        criadoEm: new Date(),
      });
      
      setSuccess("Cadastro realizado com sucesso! Aguarde a aprovação do administrador para fazer o login.");
      setEmail('');
      setPassword('');

    } catch (error: any) {
      // Tratamento de erros comuns do Firebase
      if (error.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está em uso.");
      } else if (error.code === 'auth/weak-password') {
        setError("A senha é muito fraca. Ela deve ter no mínimo 6 caracteres.");
      } else {
        setError("Ocorreu um erro ao realizar o cadastro. Tente novamente.");
        console.error("Erro no cadastro:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCadastro = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      // Verificar se já existe no Firestore
      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setError('Este e-mail já está cadastrado. Aguarde aprovação do administrador.');
        await signOut(auth);
        setIsGoogleLoading(false);
        return;
      }
      // Criar documento no Firestore
      await setDoc(userDocRef, {
        email: user.email,
        nome: user.displayName || 'Usuário Google',
        telefone: user.phoneNumber || '',
        empresa: '',
        cargo: '',
        aprovado: false,
        criadoEm: new Date(),
        metodoCadastro: 'google',
      });
      setSuccess('Cadastro realizado com sucesso! Aguarde a aprovação do administrador para fazer o login.');
      await signOut(auth);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Cadastro cancelado pelo usuário.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup bloqueado pelo navegador. Permita popups para este site.');
      } else {
        setError('Erro ao cadastrar com Google. Tente novamente.');
      }
      console.error('Erro no cadastro com Google:', error);
    } finally {
      setIsGoogleLoading(false);
    }
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

            {/* Mensagens de Erro e Sucesso */}
            {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
            {success && <p className="text-sm text-green-600 bg-green-100 p-3 rounded-lg">{success}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Cadastrando...' : 'Cadastrar'}
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
            disabled={isGoogleLoading}
            className="w-full bg-white border border-softgray-300 text-softgray-700 font-medium py-3 px-4 rounded-lg hover:bg-softgray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center disabled:bg-softgray-100 disabled:text-softgray-400 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#4285F4" strokeWidth="4" fill="none" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {isGoogleLoading ? 'Cadastrando...' : 'Cadastrar com Google'}
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