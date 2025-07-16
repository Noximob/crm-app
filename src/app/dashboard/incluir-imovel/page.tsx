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
    descricao: '',
    fotos: [] as File[]
  });

  const handleAddImovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImovel.nome.trim() || !formImovel.endereco.trim() || !formImovel.valor) {
      setMsg('Por favor, preencha os campos obrigatórios.');
      return;
    }
    
    setLoading(true);
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
        nome: formImovel.nome.trim(),
        endereco: formImovel.endereco.trim(),
        bairro: formImovel.bairro.trim(),
        cidade: formImovel.cidade.trim(),
        estado: formImovel.estado.trim(),
        localizacao: formImovel.localizacao.trim(),
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
        nome: '',
        endereco: '',
        bairro: '',
        cidade: '',
        estado: '',
        localizacao: '',
        tipo: 'casa',
        valor: '',
        descricao: '',
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
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#181C23] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <HouseIcon className="h-8 w-8 text-[#3478F6]" />
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
              onChange={e => setFormImovel({ ...formImovel, valor: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
              placeholder="R$ 0,00"
              required
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

          {/* Upload de Fotos/Vídeos */}
          <div>
            <label className="block text-sm font-semibold text-[#6B6F76] dark:text-gray-300 mb-2">Fotos/Vídeos</label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={e => {
                const files = Array.from(e.target.files || []);
                setFormImovel({ ...formImovel, fotos: files });
              }}
              className="w-full px-3 py-2 rounded-lg border border-[#E8E9F1] dark:border-[#23283A] bg-white dark:bg-[#181C23] text-[#2E2F38] dark:text-white"
            />
            {formImovel.fotos.length > 0 && (
              <p className="text-sm text-[#6B6F76] dark:text-gray-300 mt-2">
                {formImovel.fotos.length} arquivo(s) selecionado(s)
              </p>
            )}
          </div>

          {/* Botão de salvar */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-[#3478F6] text-white font-bold shadow-soft hover:bg-[#255FD1] transition-colors disabled:opacity-50"
            >
              {loading ? 'Adicionando...' : 'Adicionar Imóvel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 