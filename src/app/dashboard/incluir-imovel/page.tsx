'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

const VideoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 7l-7 5 7 5V7z"/>
    <polygon points="16 17 8 12 16 7.02V17z"/>
  </svg>
);

export default function IncluirImovelPage() {
  const { userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [formImovel, setFormImovel] = useState({
    nome: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    localizacao: '', // Link do Google Maps
    tipo: 'casa' as 'casa' | 'apartamento' | 'terreno' | 'comercial',
    valor: '',
    condicoesPagamento: '',
    descricao: '',
    fotoCapa: null as File | null,
    fotos: [] as File[]
  });

  const formatCurrency = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Se não há números, retorna vazio
    if (numbers === '') return '';
    
    // Converte para número e formata
    const number = parseInt(numbers);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number / 100);
  };

  const handleAddImovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImovel.nome.trim() || !formImovel.endereco.trim() || !formImovel.valor) {
      setMsg('Por favor, preencha os campos obrigatórios.');
      return;
    }
    
    setLoading(true);
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

      // Converte o valor do formato brasileiro para número
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
      setMsg('Imóvel captado adicionado com sucesso!');
    } catch (err) {
      setMsg('Erro ao adicionar imóvel captado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <HouseIcon className="h-8 w-8 text-[#D4A017]" />
          <h1 className="text-3xl font-bold text-[#2E2F38] dark:text-white">Incluir Imóvel</h1>
        </div>

        {msg && (
          <div className={`p-4 rounded-lg mb-6 ${msg.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {msg}
          </div>
        )}

        <form onSubmit={handleAddImovel} className="bg-white dark:bg-[#23283A] rounded-2xl shadow-soft border border-[#E8E9F1] dark:border-[#23283A] p-8 flex flex-col gap-6">
          {/* Nome do Imóvel */}
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

          {/* Endereço */}
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

          {/* Bairro e Cidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Estado e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Valor */}
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

          {/* Condições de Pagamento */}
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

          {/* Localização Google Maps */}
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

          {/* Descrição */}
          <div>
            <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Descrição</label>
            <textarea
              value={formImovel.descricao}
              onChange={e => setFormImovel({ ...formImovel, descricao: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white min-h-[100px]"
              placeholder="Descreva os diferenciais, localização, condições, etc."
            />
          </div>

          {/* Foto Capa */}
          <div>
            <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Foto Capa *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setFormImovel({ ...formImovel, fotoCapa: file });
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
              required
            />
            {formImovel.fotoCapa && (
              <p className="text-sm text-[#6B6F76] dark:text-gray-300 mt-2">
                Foto capa selecionada: {formImovel.fotoCapa.name}
              </p>
            )}
          </div>

          {/* Upload de Fotos Adicionais */}
          <div>
            <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Fotos Adicionais
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => {
                const newFiles = Array.from(e.target.files || []);
                setFormImovel({ ...formImovel, fotos: [...formImovel.fotos, ...newFiles] });
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
            />
            {formImovel.fotos.filter(f => f.type.startsWith('image/')).length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                  {formImovel.fotos.filter(f => f.type.startsWith('image/')).length} foto(s) selecionada(s):
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {formImovel.fotos.filter(f => f.type.startsWith('image/')).map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <span className="text-sm text-[#2E2F38] dark:text-white truncate flex-1">
                        📷 {file.name}
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

          {/* Upload de Vídeos Adicionais */}
          <div>
            <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2 flex items-center gap-2">
              <VideoIcon className="h-4 w-4" />
              Vídeos Adicionais
            </label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={e => {
                const newFiles = Array.from(e.target.files || []);
                setFormImovel({ ...formImovel, fotos: [...formImovel.fotos, ...newFiles] });
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
            />
            {formImovel.fotos.filter(f => f.type.startsWith('video/')).length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-[#6B6F76] dark:text-gray-300 mb-2">
                  {formImovel.fotos.filter(f => f.type.startsWith('video/')).length} vídeo(s) selecionado(s):
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {formImovel.fotos.filter(f => f.type.startsWith('video/')).map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <span className="text-sm text-[#2E2F38] dark:text-white truncate flex-1">
                        🎥 {file.name}
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

          {/* Botão de salvar */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-[#D4A017] text-white font-bold shadow-soft hover:bg-[#B8860B] transition-colors disabled:opacity-50"
            >
              {loading ? 'Adicionando...' : 'Adicionar Imóvel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 