'use client';

import React, { useState, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PIPELINE_STAGES } from '@/lib/constants';

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
    const { currentUser } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [situation, setSituation] = useState(PIPELINE_STAGES[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
        if (!currentUser) {
            setError('Você precisa estar logado para criar um lead.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Salva na coleção principal 'leads'
            const leadsCollectionRef = collection(db, 'leads');
            await addDoc(leadsCollectionRef, {
                userId: currentUser.uid, // Adiciona o ID do usuário ao lead
                nome: name,
                telefone: phone,
                whatsapp: phone.replace(/\\D/g, ''),
                email,
                etapa: situation,
                origem: 'Cadastro Manual via CRM',
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Cadastrar Novo Lead</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome *</label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" required />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone *</label>
                        <input type="tel" id="phone" value={phone} onChange={handlePhoneChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" required maxLength={15} />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label htmlFor="situation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Situação</label>
                        <select id="situation" value={situation} onChange={(e) => setSituation(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                            {PIPELINE_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:bg-primary-400">
                            {isLoading ? 'Cadastrando...' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 