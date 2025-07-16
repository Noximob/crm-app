'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface ImovelCaptado {
  id: string;
  imobiliariaId: string;
  corretorId: string;
  corretorNome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  tipo: 'casa' | 'apartamento' | 'terreno' | 'comercial';
  valor: number;
  descricao: string;
  fotos: string[];
  criadoEm: Date;
}

const HouseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const BuildingIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21h18"/>
    <path d="M5 21V7l8-4v18"/>
    <path d="M19 21V11l-6-4"/>
    <path d="M9 9h.01"/>
    <path d="M9 12h.01"/>
    <path d="M9 15h.01"/>
    <path d="M9 18h.01"/>
  </svg>
);

const MapIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 4m0 13V4m-6 3l6-3"/>
  </svg>
);

const StoreIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

export default function CaptacoesPage() {
  const { userData, currentUser } = useAuth();
  const [imoveis, setImoveis] = useState<ImovelCaptado[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formImovel, setFormImovel] = useState({
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    tipo: 'casa' as 'casa' | 'apartamento' | 'terreno' | 'comercial',
    valor: '',
    descricao: '',
    fotos: [] as File[]
  });

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchImoveis();
  }, [userData]);

  const fetchImoveis = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'imoveis_captados'),
        where('imobiliariaId', '==', userData?.imobiliariaId)
      );
      const snap = await getDocs(q);
      const imoveisData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImovelCaptado));
      imoveisData.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      setImoveis(imoveisData);
    } catch (err) {
      setMsg('Erro ao carregar imóveis captados.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImovel.endereco.trim() || !formImovel.valor) return;
    
    setUploading(true);
    setMsg(null);
    try {
      // Upload das fotos
      const fotosUrls: string[] = [];
      for (const foto of formImovel.fotos) {
        const fotoRef = ref(storage, `imoveis_captados/${userData?.imobiliariaId}/${Date.now()}_${foto.name}`);
        const snapshot = await uploadBytes(fotoRef, foto);
        const url = await getDownloadURL(snapshot.ref);
        fotosUrls.push(url);
      }

      const imovel = {
        endereco: formImovel.endereco.trim(),
        bairro: formImovel.bairro.trim(),
        cidade: formImovel.cidade.trim(),
        estado: formImovel.estado.trim(),
        tipo: formImovel.tipo,
        valor: parseFloat(formImovel.valor.replace(/[^\d,]/g, '').replace(',', '.')),
        descricao: formImovel.descricao.trim(),
        fotos: fotosUrls,
        imobiliariaId: userData?.imobiliariaId,
        corretorId: currentUser?.uid,
        corretorNome: userData?.nome || 'Corretor',
        criadoEm: Timestamp.now(),
      };

      await addDoc(collection(db, 'imoveis_captados'), imovel);
      setFormImovel({
        endereco: '',
        bairro: '',
        cidade: '',
        estado: '',
        tipo: 'casa',
        valor: '',
        descricao: '',
        fotos: []
      });
      fetchImoveis();
      setMsg('Imóvel captado adicionado com sucesso!');
    } catch (err) {
      setMsg('Erro ao adicionar imóvel captado.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImovel = async (id: string, fotos: string[]) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;
    
    setLoading(true);
    try {
      // Deletar fotos do storage
      for (const fotoUrl of fotos) {
        const fotoRef = ref(storage, fotoUrl);
        await deleteObject(fotoRef);
      }
      
      await deleteDoc(doc(db, 'imoveis_captados', id));
      fetchImoveis();
      setMsg('Imóvel excluído com sucesso!');
    } catch (err) {
      setMsg('Erro ao excluir imóvel.');
    } finally {
      setLoading(false);
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'casa':
        return <HouseIcon className="h-5 w-5" />;
      case 'apartamento':
        return <BuildingIcon className="h-5 w-5" />;
      case 'terreno':
        return <MapIcon className="h-5 w-5" />;
      case 'comercial':
        return <StoreIcon className="h-5 w-5" />;
      default:
        return <HouseIcon className="h-5 w-5" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Captações</h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Imóveis captados pelos corretores</p>
          </div>
        </div>

        {msg && (
          <div className={`p-4 rounded-lg mb-6 ${msg.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Incluir Imóvel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] sticky top-6">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                <HouseIcon className="h-6 w-6 text-[#3478F6]" />
                Incluir Imóvel
              </h2>
              
              <form onSubmit={handleAddImovel} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Endereço</label>
                  <input
                    type="text"
                    value={formImovel.endereco}
                    onChange={e => setFormImovel({ ...formImovel, endereco: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Rua, número"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Bairro</label>
                    <input
                      type="text"
                      value={formImovel.bairro}
                      onChange={e => setFormImovel({ ...formImovel, bairro: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2"
                      placeholder="Bairro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Cidade</label>
                    <input
                      type="text"
                      value={formImovel.cidade}
                      onChange={e => setFormImovel({ ...formImovel, cidade: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2"
                      placeholder="Cidade"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Estado</label>
                    <input
                      type="text"
                      value={formImovel.estado}
                      onChange={e => setFormImovel({ ...formImovel, estado: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2"
                      placeholder="UF"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Tipo</label>
                    <select
                      value={formImovel.tipo}
                      onChange={e => setFormImovel({ ...formImovel, tipo: e.target.value as any })}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="casa">Casa</option>
                      <option value="apartamento">Apartamento</option>
                      <option value="terreno">Terreno</option>
                      <option value="comercial">Comercial</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Valor</label>
                  <input
                    type="text"
                    value={formImovel.valor}
                    onChange={e => setFormImovel({ ...formImovel, valor: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="R$ 0,00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Descrição</label>
                  <textarea
                    value={formImovel.descricao}
                    onChange={e => setFormImovel({ ...formImovel, descricao: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    rows={3}
                    placeholder="Descrição do imóvel..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Fotos</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      setFormImovel({ ...formImovel, fotos: files });
                    }}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-[#3478F6] hover:bg-[#255FD1] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Adicionando...' : 'Adicionar Imóvel'}
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Imóveis Captados */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Imóveis Captados</h2>
              
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : imoveis.length === 0 ? (
                <div className="text-center py-8 text-[#6B6F76] dark:text-gray-300">
                  Nenhum imóvel captado ainda
                </div>
              ) : (
                <div className="space-y-4">
                  {imoveis.map((imovel) => (
                    <div
                      key={imovel.id}
                      className="p-4 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] hover:bg-[#F5F6FA] dark:hover:bg-[#181C23] transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Fotos */}
                        {imovel.fotos.length > 0 && (
                          <div className="flex gap-2 flex-shrink-0">
                            {imovel.fotos.slice(0, 3).map((foto, index) => (
                              <img
                                key={index}
                                src={foto}
                                alt={`Foto ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ))}
                            {imovel.fotos.length > 3 && (
                              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs text-gray-500">
                                +{imovel.fotos.length - 3}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Informações */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTipoIcon(imovel.tipo)}
                            <h3 className="font-semibold text-[#2E2F38] dark:text-white">
                              {imovel.endereco}
                            </h3>
                          </div>
                          
                          <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                            {imovel.bairro}, {imovel.cidade} - {imovel.estado}
                          </p>
                          
                          <p className="text-lg font-bold text-[#3478F6] mb-2">
                            {formatCurrency(imovel.valor)}
                          </p>
                          
                          {imovel.descricao && (
                            <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                              {imovel.descricao}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-[#6B6F76] dark:text-gray-300">
                              Captado por: {imovel.corretorNome}
                            </p>
                            <button
                              onClick={() => handleDeleteImovel(imovel.id, imovel.fotos)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 