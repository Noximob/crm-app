'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

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
  descricao: string;
  fotoCapa: string;
  fotos: string[];
  criadoEm: Date;
}

// Ícones
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 19-7-7 7-7"/>
    <path d="M19 12H5"/>
  </svg>
);

const HouseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const MapPinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6"/>
    <line x1="8" x2="8" y1="2" y2="6"/>
    <line x1="3" x2="21" y1="10" y2="10"/>
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    <line x1="10" x2="10" y1="11" y2="17"/>
    <line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" x2="12" y1="15" y2="3"/>
  </svg>
);

export default function DetalhesImovelPage() {
  const params = useParams();
  const router = useRouter();
  const { userData } = useAuth();
  const [imovel, setImovel] = useState<ImovelCaptado | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const imovelId = params.imovelId as string;

  useEffect(() => {
    if (imovelId) {
      fetchImovel();
    }
  }, [imovelId]);

  const fetchImovel = async () => {
    try {
      const docRef = doc(db, 'imoveis_captados', imovelId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setImovel({ id: docSnap.id, ...docSnap.data() } as ImovelCaptado);
      } else {
        router.push('/dashboard/materiais/materiais-construtoras');
      }
    } catch (error) {
      console.error('Erro ao carregar imóvel:', error);
      router.push('/dashboard/materiais/materiais-construtoras');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!imovel || !confirm('Tem certeza que deseja excluir este imóvel?')) return;
    
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'imoveis_captados', imovel.id));
      router.push('/dashboard/materiais/materiais-construtoras');
    } catch (error) {
      console.error('Erro ao excluir imóvel:', error);
      alert('Erro ao excluir imóvel');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTipoLabel = (tipo: string) => {
    const tipos = {
      casa: 'Casa',
      apartamento: 'Apartamento',
      terreno: 'Terreno',
      comercial: 'Comercial'
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3478F6]"></div>
      </div>
    );
  }

  if (!imovel) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#2E2F38] dark:text-white mb-2">Imóvel não encontrado</h2>
          <button
            onClick={() => router.push('/dashboard/materiais/materiais-construtoras')}
            className="px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/materiais/materiais-construtoras')}
              className="p-2 rounded-lg bg-white dark:bg-[#23283A] border border-[#E8E9F1] dark:border-[#23283A] hover:bg-gray-50 dark:hover:bg-[#2A2F42] transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-[#2E2F38] dark:text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white">{imovel.nome}</h1>
              <p className="text-[#6B6F76] dark:text-gray-300">{imovel.endereco}</p>
            </div>
          </div>
          
          {userData?.tipoConta === 'imobiliaria' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Foto Capa */}
            {imovel.fotoCapa && (
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Foto Principal</h2>
                <img
                  src={imovel.fotoCapa}
                  alt="Foto capa"
                  className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage(imovel.fotoCapa)}
                />
              </div>
            )}

            {/* Galeria de Fotos */}
            {imovel.fotos.length > 0 && (
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Galeria de Fotos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imovel.fotos.map((foto, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={foto}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedImage(foto)}
                      />
                      <button
                        onClick={() => handleDownload(foto, `foto_${index + 1}.jpg`)}
                        className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Descrição */}
            {imovel.descricao && (
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Descrição</h2>
                <p className="text-[#6B6F76] dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {imovel.descricao}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informações Principais */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Informações</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <HouseIcon className="h-5 w-5 text-[#3478F6]" />
                  <div>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-300">Tipo</p>
                    <p className="font-semibold text-[#2E2F38] dark:text-white">{getTipoLabel(imovel.tipo)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-5 w-5 text-[#3478F6]" />
                  <div>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-300">Endereço</p>
                    <p className="font-semibold text-[#2E2F38] dark:text-white">{imovel.endereco}</p>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-300">
                      {imovel.bairro}, {imovel.cidade} - {imovel.estado}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-[#3478F6]" />
                  <div>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-300">Corretor</p>
                    <p className="font-semibold text-[#2E2F38] dark:text-white">{imovel.corretorNome}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-[#3478F6]" />
                  <div>
                    <p className="text-sm text-[#6B6F76] dark:text-gray-300">Captado em</p>
                    <p className="font-semibold text-[#2E2F38] dark:text-white">
                      {formatDate(imovel.criadoEm)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Valor */}
            <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
              <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Valor</h2>
              <p className="text-3xl font-bold text-[#3AC17C]">{formatCurrency(imovel.valor)}</p>
            </div>

            {/* Localização */}
            {imovel.localizacao && (
              <div className="bg-white dark:bg-[#23283A] rounded-2xl p-6 border border-[#E8E9F1] dark:border-[#23283A]">
                <h2 className="text-xl font-bold text-[#2E2F38] dark:text-white mb-4">Localização</h2>
                <a
                  href={imovel.localizacao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#3478F6] text-white rounded-lg hover:bg-[#255FD1] transition-colors"
                >
                  <MapPinIcon className="h-4 w-4" />
                  Ver no Google Maps
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Imagem */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage}
              alt="Imagem ampliada"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 