// Forçando deploy no Netlify
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db, googleProvider } from '@/lib/firebase'; // Importando nossa config
import { createUserWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'; // Função de criar usuário
import { setDoc, doc, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'; // Funções do banco de dados

// Função utilitária para timeout de promessas
function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout ao criar imobiliária no Firestore')), ms);
    promise.then(res => {
      clearTimeout(timer);
      resolve(res);
    }).catch(err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [perfil, setPerfil] = useState('');
  const [nomeImobiliaria, setNomeImobiliaria] = useState('');
  const [imobiliarias, setImobiliarias] = useState<{ id: string, nome: string }[]>([]);
  const [imobiliariaSelecionada, setImobiliariaSelecionada] = useState<{ id: string, nome: string } | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showImobiliarias, setShowImobiliarias] = useState(false);

  // Buscar imobiliárias para autocomplete (apenas uma vez)
  useEffect(() => {
    async function fetchImobiliarias() {
      // Buscar todas as imobiliárias para o autocomplete
      const { query, where, collection } = await import('firebase/firestore');
      const imobiliariasRef = collection(db, 'imobiliarias');
      
      try {
        console.log('🔍 Iniciando busca de imobiliárias...');
        
        // Primeiro, buscar todas as imobiliárias para debug
        const allSnapshot = await getDocs(imobiliariasRef);
        const todasImobiliarias = allSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          nome: doc.data().nome,
          tipo: doc.data().tipo,
          aprovado: doc.data().aprovado,
          status: doc.data().status
        }));
        
        console.log('📊 Todas as imobiliárias no banco:', todasImobiliarias);
        
        // Filtrar imobiliárias aprovadas (lógica mais simples e robusta)
        const imobiliariasAprovadas = todasImobiliarias.filter(imob => {
          // Verificar se está aprovada (aceita true, 1, ou qualquer valor truthy)
          const aprovada = Boolean(imob.aprovado);
          
          console.log(`🔍 Verificando ${imob.nome}: aprovada=${aprovada}, aprovado=${imob.aprovado}, tipo=${imob.tipo}, status=${imob.status}`);
          
          return aprovada;
        });
        
        console.log('📊 Imobiliárias aprovadas filtradas:', imobiliariasAprovadas);
        
        if (imobiliariasAprovadas.length > 0) {
          console.log('✅ Usando imobiliárias aprovadas filtradas');
          setImobiliarias(imobiliariasAprovadas.map(imob => ({ id: imob.id, nome: imob.nome })));
        } else {
          console.log('⚠️ Nenhuma imobiliária aprovada encontrada, mostrando todas as imobiliárias');
          setImobiliarias(todasImobiliarias.map(imob => ({ id: imob.id, nome: imob.nome })));
        }
      } catch (error) {
        console.error('❌ Erro ao buscar imobiliárias:', error);
        // Em caso de erro, busca todas as imobiliárias
        console.log('🔄 Tentando buscar todas as imobiliárias sem filtros...');
        const allSnapshot = await getDocs(imobiliariasRef);
        const todasImobiliarias = allSnapshot.docs.map(doc => ({ id: doc.id, nome: doc.data().nome }));
        console.log('📊 Todas as imobiliárias encontradas:', todasImobiliarias);
        setImobiliarias(todasImobiliarias);
      }
    }
    fetchImobiliarias();
  }, []);

  // Validação dinâmica
  const validateStep2 = () => {
    if (perfil === 'imobiliaria' && !nomeImobiliaria) return 'Informe o nome da imobiliária.';
    if (perfil === 'corretor-vinculado' && !imobiliariaSelecionada) return 'Selecione uma imobiliária.';
    return null;
  };

  // Passo 1: Seleção de perfil
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <div className="max-w-md w-full bg-offwhite-50 rounded-2xl shadow-xl p-8 border border-primary-100">
          <h1 className="text-2xl font-bold text-softgray-800 mb-4 text-center">Cadastro</h1>
          <p className="text-softgray-600 mb-6 text-center">Selecione o tipo de conta para continuar:</p>
          <select value={perfil} onChange={e => setPerfil(e.target.value)} className="w-full px-4 py-3 border border-softgray-300 rounded-lg mb-6">
            <option value="">Selecione...</option>
            <option value="imobiliaria">Imobiliária</option>
            <option value="corretor-vinculado">Corretor vinculado</option>
            <option value="corretor-autonomo">Corretor autônomo</option>
          </select>
          <button disabled={!perfil} onClick={() => setStep(2)} className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:bg-primary-300 disabled:cursor-not-allowed">Avançar</button>
        </div>
      </div>
    );
  }

  // Passo 2: Campo obrigatório do perfil
  if (step === 2) {
    if (perfil === 'imobiliaria') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
          <div className="max-w-md w-full bg-offwhite-50 rounded-2xl shadow-xl p-8 border border-primary-100">
            <h1 className="text-xl font-bold text-softgray-800 mb-4 text-center">Cadastro de Imobiliária</h1>
            <div className="mb-4">
              <label className="block text-sm font-medium text-softgray-700 mb-1">Nome da Imobiliária</label>
              <input type="text" value={nomeImobiliaria} onChange={e => setNomeImobiliaria(e.target.value)} className="w-full px-4 py-3 border border-softgray-300 rounded-lg" placeholder="Nome da imobiliária" />
            </div>
            {validateStep2() && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg mb-4">{validateStep2()}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(1)} className="w-1/2 bg-softgray-200 hover:bg-softgray-300 text-softgray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200">Voltar</button>
              <button disabled={!!validateStep2()} onClick={() => setStep(3)} className="w-1/2 bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:bg-primary-300 disabled:cursor-not-allowed">Avançar</button>
            </div>
          </div>
        </div>
      );
    } else if (perfil === 'corretor-vinculado') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
          <div className="max-w-md w-full bg-offwhite-50 rounded-2xl shadow-xl p-8 border border-primary-100">
            <h1 className="text-2xl font-bold text-softgray-800 mb-4 text-center">Cadastro de Corretor Vinculado</h1>
            <p className="text-sm text-softgray-600 mb-4 text-center">
              Selecione uma imobiliária aprovada para se vincular. Apenas imobiliárias aprovadas aparecem na lista.
              {imobiliarias.length === 0 && (
                <span className="block mt-2 text-orange-600 font-medium">
                  ⚠️ Carregando imobiliárias disponíveis...
                </span>
              )}
            </p>
            
            {/* Botão de debug temporário */}
            <button
              type="button"
              onClick={() => {
                console.log('🔍 DEBUG: Imobiliárias carregadas:', imobiliarias);
                alert(`Imobiliárias carregadas: ${imobiliarias.length}\n${imobiliarias.map(i => `${i.nome} (${i.id})`).join('\n')}`);
              }}
              className="mb-4 w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              🔍 Debug: Verificar Imobiliárias
            </button>
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-softgray-700 mb-1">Imobiliária</label>
              <input
                type="text"
                value={imobiliariaSelecionada ? imobiliariaSelecionada.nome : nomeImobiliaria}
                onChange={e => {
                  setNomeImobiliaria(e.target.value);
                  setShowImobiliarias(true);
                  setImobiliariaSelecionada(null);
                }}
                onFocus={() => setShowImobiliarias(true)}
                onBlur={() => setTimeout(() => setShowImobiliarias(false), 150)}
                className="w-full px-4 py-3 border border-softgray-300 rounded-lg"
                placeholder="Digite para buscar..."
                autoComplete="off"
              />
              {showImobiliarias && nomeImobiliaria && (
                <ul className="absolute z-20 bg-white border border-softgray-300 rounded-lg mt-1 w-full max-h-60 overflow-y-auto shadow-lg">
                  {imobiliarias
                    .filter(i => i.nome.toLowerCase().includes(nomeImobiliaria.toLowerCase()))
                    .slice(0, 8)
                    .map(i => (
                      <li
                        key={i.id}
                        className="px-4 py-2 cursor-pointer hover:bg-primary-50"
                        onMouseDown={() => {
                          setImobiliariaSelecionada(i);
                          setNomeImobiliaria(i.nome);
                          setShowImobiliarias(false);
                        }}
                      >
                        {/* Destaca o texto digitado */}
                        {(() => {
                          const idx = i.nome.toLowerCase().indexOf(nomeImobiliaria.toLowerCase());
                          if (idx === -1) return i.nome;
                          return <>{i.nome.slice(0, idx)}<span className="bg-yellow-100 font-semibold">{i.nome.slice(idx, idx + nomeImobiliaria.length)}</span>{i.nome.slice(idx + nomeImobiliaria.length)}</>;
                        })()}
                      </li>
                    ))}
                  {imobiliarias.filter(i => i.nome.toLowerCase().includes(nomeImobiliaria.toLowerCase())).length === 0 && (
                    <li className="px-4 py-2 text-softgray-400">
                      {imobiliarias.length === 0 
                        ? "Nenhuma imobiliária aprovada disponível no momento. Entre em contato com o suporte ou tente novamente mais tarde." 
                        : "Nenhuma imobiliária encontrada com esse nome. Tente digitar parte do nome."}
                    </li>
                  )}
                </ul>
              )}
            </div>
            {validateStep2() && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg mb-4">{validateStep2()}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(1)} className="w-1/2 bg-softgray-200 hover:bg-softgray-300 text-softgray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200">Voltar</button>
              <button disabled={!!validateStep2()} onClick={() => setStep(3)} className="w-1/2 bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:bg-primary-300 disabled:cursor-not-allowed">Avançar</button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  // Passo 3: Escolha do método de cadastro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    if (!nome && !auth.currentUser) { setError('Informe seu nome.'); setIsLoading(false); return; }
    if (!email) { setError('Preencha o e-mail.'); setIsLoading(false); return; }
    if (!password) { setError('Preencha a senha.'); setIsLoading(false); return; }
    try {
      console.log('Iniciando cadastro...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Usuário criado no Auth:', user.uid);
      let imobiliariaId = '';
      if (perfil === 'imobiliaria' || perfil === 'corretor-autonomo') {
        const dadosImobiliaria = {
          nome: nomeImobiliaria || nome,
          tipo: 'imobiliaria', // Força o campo tipo SEMPRE
          criadoEm: new Date(),
          aprovado: false, // Agora exige aprovação manual
          status: 'pendente', // Agora exige aprovação manual
          metodoCadastro: isGoogleLoading ? 'google' : 'email',
        };
        console.log('Dados enviados para imobiliaria:', dadosImobiliaria);
        const imobiliariaDoc = await addDoc(collection(db, 'imobiliarias'), dadosImobiliaria);
        imobiliariaId = imobiliariaDoc.id;
        console.log('Imobiliária/corretor autônomo criado com ID:', imobiliariaId);
      } else if (perfil === 'corretor-vinculado') {
        imobiliariaId = imobiliariaSelecionada!.id;
        }
      console.log('Criando documento do usuário no Firestore...');
      await setDoc(doc(db, 'usuarios', user.uid), {
        nome,
        email,
        tipoConta: perfil,
        imobiliariaId: imobiliariaId || '',
        aprovado: false, // Agora exige aprovação manual para todos
        criadoEm: new Date(),
        metodoCadastro: 'email',
        photoURL: user.photoURL || null,
      });
      console.log('Usuário criado no Firestore!');
      setSuccess('Cadastro realizado com sucesso! Aguarde aprovação.');
      setEmail(''); setPassword(''); setNome('');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      if (error.code === 'auth/email-already-in-use') setError('E-mail já em uso.');
      else if (error.code === 'auth/weak-password') setError('Senha fraca.');
      else setError(error.message || 'Erro ao cadastrar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCadastro = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setSuccess(null);
    let cadastroFinalizado = false;
    try {
      console.log('Iniciando cadastro com Google...');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Usuário autenticado com Google:', user.uid);
      await user.getIdToken(true);
      await new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(firebaseUser => {
          if (firebaseUser && firebaseUser.uid === user.uid) {
            unsubscribe();
            resolve(true);
          }
        });
      });
      await new Promise(r => setTimeout(r, 2000));
      if (!user.email) {
        setError('Não foi possível obter o e-mail do Google. Tente novamente ou use outro método.');
        setIsGoogleLoading(false);
        return;
      }
      let imobiliariaId = '';
      if (perfil === 'imobiliaria' || perfil === 'corretor-autonomo') {
        try {
          const dadosImobiliaria = {
            nome: nomeImobiliaria || user.displayName || 'Imobiliária',
            tipo: 'imobiliaria',
            criadoEm: new Date(),
            aprovado: false,
            status: 'pendente',
            metodoCadastro: 'google',
          };
          console.log('Criando imobiliária:', dadosImobiliaria);
          const imobiliariaDoc = await addDoc(collection(db, 'imobiliarias'), dadosImobiliaria);
        imobiliariaId = imobiliariaDoc.id;
        console.log('Imobiliária criada com ID:', imobiliariaId);
        } catch (err) {
          console.error('Erro ao criar imobiliária:', err);
          setError('Erro ao criar imobiliária. Tente novamente.');
          setIsGoogleLoading(false);
          return;
        }
      } else if (perfil === 'corretor-vinculado') {
        console.log('Perfil corretor-vinculado, verificando imobiliariaSelecionada:', imobiliariaSelecionada);
        if (!imobiliariaSelecionada) {
          setError('Selecione uma imobiliária para se vincular.');
          setIsGoogleLoading(false);
          return;
        }
        imobiliariaId = imobiliariaSelecionada.id;
      }
      // Criação do usuário
      try {
      console.log('Criando documento do usuário no Firestore...');
          await setDoc(doc(db, 'usuarios', user.uid), {
            nome: user.displayName || user.email?.split("@")[0] || 'Usuário',
            email: user.email,
          tipoConta: perfil === 'imobiliaria' ? 'imobiliaria' : perfil,
            imobiliariaId: imobiliariaId || '',
            aprovado: false,
          criadoEm: new Date(),
            metodoCadastro: 'google',
            photoURL: user.photoURL || null,
          });
        console.log('Usuário criado no Firestore!');
      } catch (err) {
        console.error('Erro ao criar documento do usuário no Firestore:', err);
        setError('Erro ao criar usuário no Firestore. Tente novamente.');
        setIsGoogleLoading(false);
        return;
      }
      setSuccess('Cadastro realizado com sucesso! Aguarde aprovação.');
      setEmail(''); setPassword(''); setNome('');
      cadastroFinalizado = true;
      await signOut(auth);
    } catch (error: any) {
      console.error('Erro no cadastro com Google:', error);
      setError(error.message || 'Erro ao cadastrar com Google. Tente novamente.');
        await signOut(auth);
    } finally {
      if (!cadastroFinalizado) setIsGoogleLoading(false);
    }
  };

  if (step === 3) {
  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <div className="max-w-md w-full bg-offwhite-50 rounded-2xl shadow-xl p-8 border border-primary-100">
          <h1 className="text-xl font-bold text-softgray-800 mb-4 text-center">Finalizar Cadastro</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Só pede nome se não for Google */}
            <div>
              <label className="block text-sm font-medium text-softgray-700 mb-1">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full px-4 py-3 border border-softgray-300 rounded-lg" placeholder="Seu nome" />
            </div>
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
          <div className="text-center mt-4">
            <button
              type="button"
              className="text-primary-600 hover:underline mt-4 block mx-auto"
              onClick={() => router.push('/')}
            >
              Voltar ao início
            </button>
        </div>
      </div>
    </div>
  );
  }
} 