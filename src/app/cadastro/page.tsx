'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db, googleProvider } from '@/lib/firebase'; // Importando nossa config
import { createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'; // Função de criar usuário
import { setDoc, doc, getDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore'; // Funções do banco de dados

export default function CadastroPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [perfil, setPerfil] = useState('');
  const [nomeImobiliaria, setNomeImobiliaria] = useState('');
  const [imobiliarias, setImobiliarias] = useState<{ id: string, nome: string }[]>([]);
  const [imobiliariaSelecionada, setImobiliariaSelecionada] = useState<{ id: string, nome: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showImobiliarias, setShowImobiliarias] = useState(false);

  // Buscar imobiliárias para autocomplete
  useEffect(() => {
    async function fetchImobiliarias() {
      const snapshot = await getDocs(collection(db, 'imobiliarias'));
      setImobiliarias(snapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome })));
    }
    fetchImobiliarias();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!perfil) {
      setError('Selecione o tipo de conta.');
      setIsLoading(false);
      return;
    }
    if (!nome) {
      setError('Informe seu nome.');
      setIsLoading(false);
      return;
    }
    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      setIsLoading(false);
      return;
    }
    if (perfil === 'imobiliaria' && !nomeImobiliaria) {
      setError('Informe o nome da imobiliária.');
      setIsLoading(false);
      return;
    }
    if (perfil === 'corretor-vinculado' && !imobiliariaSelecionada) {
      setError('Selecione uma imobiliária existente.');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      let imobiliariaId = '';
      if (perfil === 'imobiliaria') {
        const imobiliariaDoc = await addDoc(collection(db, 'imobiliarias'), {
          nome: nomeImobiliaria,
          criadoEm: new Date(),
        });
        imobiliariaId = imobiliariaDoc.id;
      } else if (perfil === 'corretor-vinculado') {
        imobiliariaId = imobiliariaSelecionada!.id;
      }
      await setDoc(doc(db, 'usuarios', user.uid), {
        nome,
        email,
        tipoConta: perfil,
        imobiliariaId: imobiliariaId || '',
        aprovado: false,
        criadoEm: new Date(),
        metodoCadastro: 'email',
      });
      setSuccess('Cadastro realizado com sucesso! Aguarde aprovação.');
      setEmail(''); setPassword(''); setNome(''); setPerfil(''); setNomeImobiliaria(''); setImobiliariaSelecionada(null);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') setError('E-mail já em uso.');
      else if (error.code === 'auth/weak-password') setError('Senha fraca.');
      else setError('Erro ao cadastrar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCadastro = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setSuccess(null);
    if (!perfil) { setError('Selecione o tipo de conta.'); setIsGoogleLoading(false); return; }
    if (!nome) { setError('Informe seu nome.'); setIsGoogleLoading(false); return; }
    if (perfil === 'imobiliaria' && !nomeImobiliaria) { setError('Informe o nome da imobiliária.'); setIsGoogleLoading(false); return; }
    if (perfil === 'corretor-vinculado' && !imobiliariaSelecionada) { setError('Selecione uma imobiliária existente.'); setIsGoogleLoading(false); return; }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      let imobiliariaId = '';
      if (perfil === 'imobiliaria') {
        const imobiliariaDoc = await addDoc(collection(db, 'imobiliarias'), {
          nome: nomeImobiliaria,
          criadoEm: new Date(),
        });
        imobiliariaId = imobiliariaDoc.id;
      } else if (perfil === 'corretor-vinculado') {
        imobiliariaId = imobiliariaSelecionada!.id;
      }
      await setDoc(doc(db, 'usuarios', user.uid), {
        nome,
        email: user.email,
        tipoConta: perfil,
        imobiliariaId: imobiliariaId || '',
        aprovado: false,
        criadoEm: new Date(),
        metodoCadastro: 'google',
      });
      setSuccess('Cadastro realizado com sucesso! Aguarde aprovação.');
      setEmail(''); setPassword(''); setNome(''); setPerfil(''); setNomeImobiliaria(''); setImobiliariaSelecionada(null);
      await signOut(auth);
    } catch (error: any) {
      setError('Erro ao cadastrar com Google. Tente novamente.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-offwhite-50 rounded-2xl shadow-xl p-8 border border-primary-100">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-softgray-800">Cadastro</h1>
            <p className="text-softgray-600 mt-2 text-sm">Selecione o perfil e preencha os dados para criar sua conta.</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-softgray-700 mb-1">Tipo de conta</label>
            <select value={perfil} onChange={e => { setPerfil(e.target.value); setImobiliariaSelecionada(null); }} className="w-full px-4 py-3 border border-softgray-300 rounded-lg">
              <option value="">Selecione...</option>
              <option value="imobiliaria">Imobiliária</option>
              <option value="corretor-vinculado">Corretor vinculado</option>
              <option value="corretor-autonomo">Corretor autônomo</option>
            </select>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-softgray-700 mb-1">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full px-4 py-3 border border-softgray-300 rounded-lg" placeholder="Seu nome" />
            </div>
            {perfil === 'imobiliaria' && (
              <div>
                <label className="block text-sm font-medium text-softgray-700 mb-1">Nome da Imobiliária</label>
                <input type="text" value={nomeImobiliaria} onChange={e => setNomeImobiliaria(e.target.value)} className="w-full px-4 py-3 border border-softgray-300 rounded-lg" placeholder="Nome da imobiliária" />
              </div>
            )}
            {perfil === 'corretor-vinculado' && (
              <div className="relative">
                <label className="block text-sm font-medium text-softgray-700 mb-1">Imobiliária</label>
                <input type="text" value={imobiliariaSelecionada ? imobiliariaSelecionada.nome : nomeImobiliaria} onChange={e => {
                  setNomeImobiliaria(e.target.value);
                  setShowImobiliarias(true);
                  setImobiliariaSelecionada(null);
                }}
                  onFocus={() => setShowImobiliarias(true)}
                  onBlur={() => setTimeout(() => setShowImobiliarias(false), 100)}
                  className="w-full px-4 py-3 border border-softgray-300 rounded-lg" placeholder="Digite para buscar..." />
                {showImobiliarias && nomeImobiliaria && (
                  <ul className="absolute z-20 bg-white border border-softgray-300 rounded-lg mt-1 w-full max-h-40 overflow-y-auto shadow-lg">
                    {imobiliarias.filter(i => i.nome.toLowerCase().includes(nomeImobiliaria.toLowerCase())).map(i => (
                      <li key={i.id} className="px-4 py-2 cursor-pointer hover:bg-primary-50" onClick={() => { setImobiliariaSelecionada(i); setNomeImobiliaria(i.nome); setShowImobiliarias(false); }}>{i.nome}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-softgray-700 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-softgray-300 rounded-lg" placeholder="Seu melhor email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-softgray-700 mb-1">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-softgray-300 rounded-lg" placeholder="Crie uma senha segura" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
            {success && <p className="text-sm text-green-600 bg-green-100 p-3 rounded-lg">{success}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-300 disabled:cursor-not-allowed">{isLoading ? 'Cadastrando...' : 'Cadastrar'}</button>
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
          <button onClick={handleGoogleCadastro} disabled={isGoogleLoading} className="w-full bg-white border border-softgray-300 text-softgray-700 font-medium py-3 px-4 rounded-lg hover:bg-softgray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center disabled:bg-softgray-100 disabled:text-softgray-400 disabled:cursor-not-allowed">{isGoogleLoading ? (<svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#4285F4" strokeWidth="4" fill="none" /></svg>) : (<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>)}Cadastrar com Google</button>
        </div>
      </div>
    </div>
  );
} 