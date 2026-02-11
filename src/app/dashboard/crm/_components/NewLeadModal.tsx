'use client';

import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';

const ORIGEM_OPCOES = ['Networking', 'Ligação', 'Ação de rua', 'Disparo de msg', 'Outros'] as const;
type OrigemLead = typeof ORIGEM_OPCOES[number];

interface NewLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

export default function NewLeadModal({ isOpen, onClose }: NewLeadModalProps) {
    const { currentUser, userData } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [situation, setSituation] = useState(PIPELINE_STAGES[0]);
    const [origem, setOrigem] = useState<OrigemLead>('Networking');
    const [origemOutros, setOrigemOutros] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Limpa o formulário sempre que o modal abre
    useEffect(() => {
        if (isOpen) {
            setName('');
            setPhone('');
            setEmail('');
            setSituation(PIPELINE_STAGES[0]);
            setOrigem('Networking');
            setOrigemOutros('');
            setError('');
        }
    }, [isOpen]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 1. Limpa tudo que não for dígito
        const rawValue = e.target.value.replace(/\D/g, '');

        // 2. Limita a 11 dígitos (DDD + 9 dígitos)
        const limitedValue = rawValue.slice(0, 11);
        
        let formattedValue = limitedValue;

        // 3. Aplica a máscara dinamicamente
        if (limitedValue.length > 2) {
            formattedValue = `(${limitedValue.slice(0, 2)}) ${limitedValue.slice(2)}`;
        }
        if (limitedValue.length > 6) {
            const hasNinthDigit = limitedValue.length > 10;
            const splitIndex = hasNinthDigit ? 7 : 6;
            
            const part1 = limitedValue.slice(0, 2);
            const part2 = limitedValue.slice(2, splitIndex);
            const part3 = limitedValue.slice(splitIndex);

            formattedValue = `(${part1}) ${part2}-${part3}`;
        }
        
        setPhone(formattedValue);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone) {
            setError('Nome e Telefone são obrigatórios.');
            return;
        }
        if (origem === 'Outros' && !origemOutros.trim()) {
            setError('Informe a origem em "Outros".');
            return;
        }
        if (!currentUser) {
            setError('Você precisa estar logado para criar um lead.');
            return;
        }

        setIsLoading(true);
        setError('');

        const origemFinal = origem === 'Outros' ? origemOutros.trim() : origem;

        try {
            // Salva na coleção principal 'leads'
            const leadsCollectionRef = collection(db, 'leads');
            await addDoc(leadsCollectionRef, {
                userId: currentUser.uid, // Adiciona o ID do usuário ao lead
                imobiliariaId: userData?.imobiliariaId || '', // Adiciona o ID da imobiliária
                nome: name,
                telefone: phone,
                whatsapp: phone.replace(/\D/g, ''),
                email,
                etapa: situation,
                origem: origemFinal,
                origemTipo: origem, // guarda a opção escolhida (ex: 'Outros') para relatórios
                ...(origem === 'Outros' && { origemOutros: origemOutros.trim() }),
                createdAt: serverTimestamp(),
                // Adiciona o novo campo de automação com valores padrão
                automacao: {
                    status: 'inativa',
                    nomeTratamento: null,
                    dataInicio: null,
                    dataCancelamento: null,
                },
                // Remove campos antigos se não forem mais necessários
                // status: 'Sem tarefa',
                // primeiroContato: serverTimestamp(),
                // followUps: 0,
                // sequenciaAtiva: false,
            });
            onClose(); // Fecha o modal após o sucesso
        } catch (err) {
            console.error(err);
            setError('Falha ao criar o lead. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center">
            <div className="bg-white rounded-2xl shadow-soft border border-[#E8E9F1] p-6 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-[#6B6F76] hover:text-[#D4A017] transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-[#2E2F38] mb-6">Cadastrar Novo Lead</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-[#2E2F38]">Nome *</label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-[#E8C547] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017] text-[#2E2F38]" required />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-[#2E2F38]">Telefone *</label>
                        <input type="tel" id="phone" value={phone} onChange={handlePhoneChange} className="mt-1 block w-full px-3 py-2 bg-white border border-[#E8C547] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017] text-[#2E2F38]" required maxLength={15} />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-[#2E2F38]">E-mail</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-[#E8C547] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017] text-[#2E2F38]" />
                    </div>
                    <div>
                        <label htmlFor="situation" className="block text-sm font-semibold text-[#2E2F38]">Situação</label>
                        <select id="situation" value={situation} onChange={(e) => setSituation(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-[#E8C547] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017] text-[#2E2F38]">
                            {PIPELINE_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                    </div>
                    <div>
                        <span className="block text-sm font-semibold text-[#2E2F38] mb-2">Origem do lead</span>
                        <div className="flex flex-wrap gap-2">
                            {ORIGEM_OPCOES.map((op) => (
                                <label key={op} className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="origem"
                                        value={op}
                                        checked={origem === op}
                                        onChange={() => setOrigem(op)}
                                        className="sr-only peer"
                                    />
                                    <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors peer-checked:border-[#D4A017] peer-checked:bg-[#D4A017] peer-checked:text-white border-[#E8C547] bg-white text-[#2E2F38] hover:border-[#D4A017] hover:bg-[#D4A017]/10 ${origem === op ? '!bg-[#D4A017] !text-white border-[#D4A017]' : ''}`}>
                                        {op}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {origem === 'Outros' && (
                            <div className="mt-3 p-3 rounded-lg border border-[#E8C547] bg-[#F5F6FA] dark:bg-[#23283A] dark:border-[#23283A]">
                                <label htmlFor="origem-outros" className="block text-sm font-medium text-[#6B6F76] dark:text-gray-300 mb-1">Especifique a origem</label>
                                <input
                                    id="origem-outros"
                                    type="text"
                                    value={origemOutros}
                                    onChange={(e) => setOrigemOutros(e.target.value)}
                                    placeholder="Ex: Indicação do parceiro, Site..."
                                    className="w-full px-3 py-2 bg-white dark:bg-[#181C23] border border-[#E8C547] dark:border-[#23283A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A017] text-[#2E2F38] dark:text-white"
                                />
                            </div>
                        )}
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-[#6B6F76] bg-[#E8E9F1] hover:bg-[#E8C547]/40 rounded-lg transition-colors disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-white bg-[#D4A017] hover:bg-[#B8860B] rounded-lg shadow-sm disabled:opacity-50 disabled:bg-[#E8C547]">
                            {isLoading ? 'Cadastrando...' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 