'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface ImovelCaptado {
  id: string;
  imobiliariaId: string;
  corretorId: string;
  corretorNome: string;
  nome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  localizacao: string;
  tipo: 'casa' | 'apartamento' | 'terreno' | 'comercial';
  valor: number;
  condicoesPagamento?: string;
  descricao: string;
  fotoCapa: string;
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

const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const VideoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect width="15" height="10" x="1" y="5" rx="2" ry="2"/>
  </svg>
);

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  </svg>
);

export default function CaptacoesPage() {
  const { userData, currentUser } = useAuth();
  const [imoveis, setImoveis] = useState<ImovelCaptado[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingImovel, setEditingImovel] = useState<ImovelCaptado | null>(null);
  const [existingFotos, setExistingFotos] = useState<string[]>([]);
  const [existingFotoCapa, setExistingFotoCapa] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [formImovel, setFormImovel] = useState({
    nome: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    localizacao: '',
    tipo: 'casa' as 'casa' | 'apartamento' | 'terreno' | 'comercial',
    valor: '',
    condicoesPagamento: '',
    descricao: '',
    fotoCapa: null as File | null,
    fotos: [] as File[]
  });

  useEffect(() => {
    if (!userData?.imobiliariaId) return;
    fetchImoveis();
  }, [userData]);

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') return '';
    const number = parseInt(numbers);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number / 100);
  };

  const fetchImoveis = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'imoveis_captados'),
        where('imobiliariaId', '==', userData?.imobiliariaId)
      );
      const snap = await getDocs(q);
      const imoveisData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          imobiliariaId: data.imobiliariaId,
          corretorId: data.corretorId,
          corretorNome: data.corretorNome,
          nome: data.nome || '',
          endereco: data.endereco,
          bairro: data.bairro || '',
          cidade: data.cidade || '',
          estado: data.estado || '',
          localizacao: data.localizacao || '',
          tipo: data.tipo,
          valor: data.valor,
          condicoesPagamento: data.condicoesPagamento || '',
          descricao: data.descricao || '',
          fotoCapa: data.fotoCapa || '',
          fotos: data.fotos || [],
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date(data.criadoEm)
        } as ImovelCaptado;
      });
      imoveisData.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      setImoveis(imoveisData);
    } catch (err) {
      setMsg('Erro ao carregar imóveis captados.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormImovel({
      nome: '',
      endereco: '',
      bairro: '',
      cidade: '',
      estado: '',
      localizacao: '',
      tipo: 'casa',
      valor: '',
      condicoesPagamento: '',
      descricao: '',
      fotoCapa: null,
      fotos: []
    });
    setEditingImovel(null);
    setExistingFotos([]);
    setExistingFotoCapa('');
    setSelectedVideo(null);
  };

  const handleAddImovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImovel.nome.trim() || !formImovel.endereco.trim() || !formImovel.valor) {
      setMsg('Por favor, preencha os campos obrigatórios.');
      return;
    }
    
    setUploading(true);
    setMsg(null);
    try {
      // Upload da foto capa
      let fotoCapaUrl = '';
      if (formImovel.fotoCapa) {
        const fotoCapaRef = ref(storage, `imoveis_captados/${userData?.imobiliariaId}/capa_${Date.now()}_${formImovel.fotoCapa.name}`);
        const snapshot = await uploadBytes(fotoCapaRef, formImovel.fotoCapa);
        fotoCapaUrl = await getDownloadURL(snapshot.ref);
      }

      // Upload das demais fotos
      const fotosUrls: string[] = [];
      for (const foto of formImovel.fotos) {
        const fotoRef = ref(storage, `imoveis_captados/${userData?.imobiliariaId}/${Date.now()}_${foto.name}`);
        const snapshot = await uploadBytes(fotoRef, foto);
        const url = await getDownloadURL(snapshot.ref);
        fotosUrls.push(url);
      }

      const valorNumerico = parseFloat(formImovel.valor.replace(/[^\d,]/g, '').replace(',', '.'));

      const imovel = {
        nome: formImovel.nome.trim(),
        endereco: formImovel.endereco.trim(),
        bairro: formImovel.bairro.trim(),
        cidade: formImovel.cidade.trim(),
        estado: formImovel.estado.trim(),
        localizacao: formImovel.localizacao.trim(),
        tipo: formImovel.tipo,
        valor: valorNumerico,
        condicoesPagamento: formImovel.condicoesPagamento.trim(),
        descricao: formImovel.descricao.trim(),
        fotoCapa: fotoCapaUrl,
        fotos: fotosUrls,
        imobiliariaId: userData?.imobiliariaId,
        corretorId: currentUser?.uid,
        corretorNome: userData?.nome || 'Corretor',
        criadoEm: Timestamp.now(),
      };

      await addDoc(collection(db, 'imoveis_captados'), imovel);
      resetForm();
      fetchImoveis();
      setMsg('Imóvel captado adicionado com sucesso!');
    } catch (err) {
      setMsg('Erro ao adicionar imóvel captado.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditImovel = (imovel: ImovelCaptado) => {
    setEditingImovel(imovel);
    setExistingFotos(imovel.fotos);
    setExistingFotoCapa(imovel.fotoCapa);
    setFormImovel({
      nome: imovel.nome,
      endereco: imovel.endereco,
      bairro: imovel.bairro,
      cidade: imovel.cidade,
      estado: imovel.estado,
      localizacao: imovel.localizacao,
      tipo: imovel.tipo,
      valor: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(imovel.valor),
      condicoesPagamento: imovel.condicoesPagamento || '',
      descricao: imovel.descricao,
      fotoCapa: null,
      fotos: []
    });
  };

  const handleDeleteExistingFoto = (index: number) => {
    const newFotos = existingFotos.filter((_, i) => i !== index);
    setExistingFotos(newFotos);
  };

  const handleDeleteExistingFotoCapa = () => {
    setExistingFotoCapa('');
  };

  const handleUpdateImovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingImovel || !formImovel.nome.trim() || !formImovel.endereco.trim() || !formImovel.valor) {
      setMsg('Por favor, preencha os campos obrigatórios.');
      return;
    }
    
    setUploading(true);
    setMsg(null);
    try {
      const valorNumerico = parseFloat(formImovel.valor.replace(/[^\d,]/g, '').replace(',', '.'));

      const updateData: any = {
        nome: formImovel.nome.trim(),
        endereco: formImovel.endereco.trim(),
        bairro: formImovel.bairro.trim(),
        cidade: formImovel.cidade.trim(),
        estado: formImovel.estado.trim(),
        localizacao: formImovel.localizacao.trim(),
        tipo: formImovel.tipo,
        valor: valorNumerico,
        condicoesPagamento: formImovel.condicoesPagamento.trim(),
        descricao: formImovel.descricao.trim(),
      };

      // Upload nova foto capa se selecionada
      if (formImovel.fotoCapa) {
        const fotoCapaRef = ref(storage, `imoveis_captados/${userData?.imobiliariaId}/capa_${Date.now()}_${formImovel.fotoCapa.name}`);
        const snapshot = await uploadBytes(fotoCapaRef, formImovel.fotoCapa);
        updateData.fotoCapa = await getDownloadURL(snapshot.ref);
      } else {
        // Manter foto capa existente se não foi excluída
        updateData.fotoCapa = existingFotoCapa;
      }

      // Upload novas fotos se selecionadas
      let fotosUrls: string[] = [];
      if (formImovel.fotos.length > 0) {
        for (const foto of formImovel.fotos) {
          const fotoRef = ref(storage, `imoveis_captados/${userData?.imobiliariaId}/${Date.now()}_${foto.name}`);
          const snapshot = await uploadBytes(fotoRef, foto);
          const url = await getDownloadURL(snapshot.ref);
          fotosUrls.push(url);
        }
      }
      
      // Combinar fotos existentes (não excluídas) com novas fotos
      updateData.fotos = [...existingFotos, ...fotosUrls];

      await updateDoc(doc(db, 'imoveis_captados', editingImovel.id), updateData);
      resetForm();
      fetchImoveis();
      setMsg('Imóvel atualizado com sucesso!');
    } catch (err) {
      setMsg('Erro ao atualizar imóvel.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImovel = async (id: string, fotos: string[], fotoCapa: string) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;
    
    setLoading(true);
    try {
      // Deletar foto capa do storage
      if (fotoCapa) {
        try {
          const fotoCapaRef = ref(storage, fotoCapa);
          await deleteObject(fotoCapaRef);
        } catch (err) {
          console.error('Erro ao deletar foto capa:', err);
        }
      }

      // Deletar fotos do storage
      for (const fotoUrl of fotos) {
        try {
          const fotoRef = ref(storage, fotoUrl);
          await deleteObject(fotoRef);
        } catch (err) {
          console.error('Erro ao deletar foto:', err);
        }
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

  const formatCurrencyDisplay = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const renderMediaItem = (url: string, index: number, isExisting: boolean = false) => {
    if (isVideo(url)) {
      return (
        <div key={index} className="relative">
          <div 
            className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-[#E8E9F1] dark:border-[#23283A] cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={() => setSelectedVideo(url)}
            title="Clique para visualizar o vídeo"
          >
            <div className="text-center">
              <VideoIcon className="h-6 w-6 text-gray-500 mx-auto mb-1" />
              <span className="text-xs text-gray-500">Clique para ver</span>
            </div>
          </div>
          {isExisting && (
            <button
              type="button"
              onClick={() => handleDeleteExistingFoto(index)}
              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              title="Excluir vídeo"
            >
              ✕
            </button>
          )}
        </div>
      );
    } else {
      return (
        <div key={index} className="relative">
          <img
            src={url}
            alt={`Foto ${index + 1}`}
            className="w-full h-24 object-cover rounded-lg border border-[#E8E9F1] dark:border-[#23283A]"
            onError={(e) => {
              // Se a imagem falhar ao carregar, mostrar placeholder
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `
                <div class="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-[#E8E9F1] dark:border-[#23283A]">
                  <svg class="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                </div>
              `;
            }}
          />
          {isExisting && (
            <button
              type="button"
              onClick={() => handleDeleteExistingFoto(index)}
              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              title="Excluir foto"
            >
              ✕
            </button>
          )}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white mb-2">Captações</h1>
            <p className="text-[#6B6F76] dark:text-gray-300">Gerenciar imóveis captados pelos corretores</p>
          </div>
        </div>

        {msg && (
          <div className={`p-4 rounded-lg mb-6 ${msg.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 shadow-soft border border-[#E8E9F1] dark:border-[#23283A] sticky top-6">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4 flex items-center gap-2">
                <HouseIcon className="h-6 w-6 text-[#F59E0B]" />
                {editingImovel ? 'Editar Imóvel' : 'Incluir Imóvel'}
              </h2>
              
              <form onSubmit={editingImovel ? handleUpdateImovel : handleAddImovel} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Nome do Imóvel *</label>
                  <input
                    type="text"
                    value={formImovel.nome}
                    onChange={e => setFormImovel({ ...formImovel, nome: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                    placeholder="Ex: Casa 3 quartos Jardim Europa"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Endereço *</label>
                  <input
                    type="text"
                    value={formImovel.endereco}
                    onChange={e => setFormImovel({ ...formImovel, endereco: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
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
                      className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                      placeholder="Bairro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Cidade</label>
                    <input
                      type="text"
                      value={formImovel.cidade}
                      onChange={e => setFormImovel({ ...formImovel, cidade: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
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
                      className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                      placeholder="UF"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Tipo</label>
                    <select
                      value={formImovel.tipo}
                      onChange={e => setFormImovel({ ...formImovel, tipo: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                    >
                      <option value="casa">Casa</option>
                      <option value="apartamento">Apartamento</option>
                      <option value="terreno">Terreno</option>
                      <option value="comercial">Comercial</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Valor *</label>
                  <input
                    type="text"
                    value={formImovel.valor}
                    onChange={e => {
                      const formatted = formatCurrency(e.target.value);
                      setFormImovel({ ...formImovel, valor: formatted });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                    placeholder="R$ 0,00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Condições de Pagamento</label>
                  <input
                    type="text"
                    value={formImovel.condicoesPagamento}
                    onChange={e => setFormImovel({ ...formImovel, condicoesPagamento: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                    placeholder="Ex: À vista, 10% de entrada, 12x sem juros"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2 flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4" />
                    Localização (Google Maps)
                  </label>
                  <input
                    type="url"
                    value={formImovel.localizacao}
                    onChange={e => setFormImovel({ ...formImovel, localizacao: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                    placeholder="Link do Google Maps"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Descrição</label>
                  <textarea
                    value={formImovel.descricao}
                    onChange={e => setFormImovel({ ...formImovel, descricao: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white min-h-[100px]"
                    placeholder="Descreva os diferenciais, localização, condições, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Foto Capa {!editingImovel && '*'}
                  </label>
                  
                  {/* Mostrar foto capa existente se estiver editando */}
                  {editingImovel && existingFotoCapa && (
                    <div className="mb-3">
                      <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">Foto capa atual:</p>
                      <div className="relative inline-block">
                        <img
                          src={existingFotoCapa}
                          alt="Foto capa atual"
                          className="w-32 h-32 object-cover rounded-lg border border-[#E8E9F1] dark:border-[#23283A]"
                        />
                        <button
                          type="button"
                          onClick={handleDeleteExistingFotoCapa}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                          title="Excluir foto capa"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setFormImovel({ ...formImovel, fotoCapa: file });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                    required={!editingImovel}
                  />
                  {formImovel.fotoCapa && (
                    <p className="text-sm text-[#6B6F76] dark:text-gray-300 mt-2">
                      Nova foto capa: {formImovel.fotoCapa.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Fotos/Vídeos Adicionais</label>
                  
                  {/* Mostrar fotos existentes se estiver editando */}
                  {editingImovel && existingFotos.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">Fotos/Vídeos atuais ({existingFotos.length}):</p>
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {existingFotos.map((media, index) => renderMediaItem(media, index, true))}
                      </div>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={e => {
                      const newFiles = Array.from(e.target.files || []);
                      setFormImovel({ ...formImovel, fotos: [...formImovel.fotos, ...newFiles] });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
                  />
                  {formImovel.fotos.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                        {formImovel.fotos.length} novo(s) arquivo(s) selecionado(s):
                      </p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {formImovel.fotos.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                            <span className="text-sm text-[#2E2F38] dark:text-white truncate flex-1">
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newFiles = formImovel.fotos.filter((_, i) => i !== index);
                                setFormImovel({ ...formImovel, fotos: newFiles });
                              }}
                              className="ml-2 text-red-500 hover:text-red-700 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Salvando...' : (editingImovel ? 'Atualizar' : 'Adicionar')}
                  </button>
                  {editingImovel && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
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
                        {/* Foto Capa */}
                        {imovel.fotoCapa ? (
                          <div className="flex-shrink-0">
                            {isVideo(imovel.fotoCapa) ? (
                              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                <VideoIcon className="h-6 w-6 text-gray-500" />
                              </div>
                            ) : (
                              <img
                                src={imovel.fotoCapa}
                                alt="Foto capa"
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            )}
                          </div>
                        ) : imovel.fotos.length > 0 ? (
                          <div className="flex gap-2 flex-shrink-0">
                            {imovel.fotos.slice(0, 3).map((media, index) => (
                              <div key={index} className="w-16 h-16">
                                {isVideo(media) ? (
                                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                    <VideoIcon className="h-4 w-4 text-gray-500" />
                                  </div>
                                ) : (
                                  <img
                                    src={media}
                                    alt={`Mídia ${index + 1}`}
                                    className="w-16 h-16 object-cover rounded-lg"
                                  />
                                )}
                              </div>
                            ))}
                            {imovel.fotos.length > 3 && (
                              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs text-gray-500">
                                +{imovel.fotos.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}

                        {/* Informações */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTipoIcon(imovel.tipo)}
                            <h3 className="font-semibold text-[#2E2F38] dark:text-white">
                              {imovel.nome || imovel.endereco}
                            </h3>
                          </div>
                          
                          <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                            {imovel.endereco}
                          </p>
                          
                          <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                            {imovel.bairro}, {imovel.cidade} - {imovel.estado}
                          </p>
                          
                          <p className="text-lg font-bold text-[#F59E0B] mb-2">
                            {formatCurrencyDisplay(imovel.valor)}
                          </p>

                          {imovel.condicoesPagamento && (
                            <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                              {imovel.condicoesPagamento}
                            </p>
                          )}
                          
                          {imovel.descricao && (
                            <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2 line-clamp-2">
                              {imovel.descricao}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-[#6B6F76] dark:text-gray-300">
                              Captado por: {imovel.corretorNome}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditImovel(imovel)}
                                className="px-3 py-1 bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs rounded transition-colors flex items-center gap-1"
                              >
                                <EditIcon className="h-3 w-3" />
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteImovel(imovel.id, imovel.fotos, imovel.fotoCapa)}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                              >
                                Excluir
                              </button>
                            </div>
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

      {/* Modal de Visualização de Vídeo */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#23283A] rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2E2F38] dark:text-white">
                Visualizar Vídeo
              </h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="relative">
              <video
                controls
                className="w-full max-h-[70vh] rounded-lg"
                autoPlay
                muted
              >
                <source src={selectedVideo} type="video/mp4" />
                <source src={selectedVideo} type="video/webm" />
                <source src={selectedVideo} type="video/ogg" />
                Seu navegador não suporta a reprodução de vídeos.
              </video>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 