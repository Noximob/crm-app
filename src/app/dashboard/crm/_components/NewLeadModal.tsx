'use client';

import React, { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { usePipelineStages } from '@/context/PipelineStagesContext';
import { ETAPAS_DO_ADMIN, mapEtapaCircuito } from '@/lib/circuito';

const ORIGEM_OPCOES = ['Networking', 'Ligação', 'Ação de rua', 'Disparo de msg', 'Propaganda', 'Outros'] as const;
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
    const router = useRouter();
    const { currentUser, userData, isEspelhoDemo } = useContext(AuthContext);
    // Etapa não se escolhe: todo lead nasce na primeira etapa do funil e o circuito conduz dali
    const { stages } = usePipelineStages();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
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
        if (isEspelhoDemo) {
            setError('Modo demonstração — lead não é salvo.');
            return;
        }
        if (!name || !phone) {
            setError('Nome e Telefone são obrigatórios.');
            return;
        }
        if (origem === 'Outros' && !origemOutros.trim()) {
            setError('Informe a origem em "Outros".');
            return;
        }
        if (origem === 'Propaganda' && !origemOutros.trim()) {
            setError('Informe de qual propaganda o lead veio.');
            return;
        }
        if (!currentUser) {
            setError('Você precisa estar logado para criar um lead.');
            return;
        }

        setIsLoading(true);
        setError('');

        const origemFinal = origem === 'Outros'
            ? origemOutros.trim()
            : origem === 'Propaganda'
                ? `Propaganda · ${origemOutros.trim()}`
                : origem;

        try {
            const leadsCollectionRef = collection(db, 'leads');

            // ── Trava anti-duplicidade ─────────────────────────────────────
            // O mesmo telefone não pode virar lead duas vezes na imobiliária
            // (dois corretores atendendo o mesmo cliente = briga).
            const digits = phone.replace(/\D/g, '');
            const imobiliariaId = userData?.imobiliariaId || '';
            // Leads vindos de importação podem ter o whatsapp com o 55 na frente
            const candidatosWhatsapp = digits.length >= 10 ? [digits, `55${digits}`] : [digits];

            let dupData: { userId?: string; nome?: string; etapa?: string } | null = null;
            for (const cand of candidatosWhatsapp) {
                const snap = await getDocs(query(
                    leadsCollectionRef,
                    where('imobiliariaId', '==', imobiliariaId),
                    where('whatsapp', '==', cand),
                    limit(1)
                ));
                if (!snap.empty) {
                    dupData = snap.docs[0].data() as { userId?: string; nome?: string; etapa?: string };
                    break;
                }
            }
            if (!dupData) {
                // Leads antigos podem não ter o campo whatsapp — compara o telefone formatado
                const snap = await getDocs(query(
                    leadsCollectionRef,
                    where('imobiliariaId', '==', imobiliariaId),
                    where('telefone', '==', phone),
                    limit(1)
                ));
                if (!snap.empty) {
                    dupData = snap.docs[0].data() as { userId?: string; nome?: string; etapa?: string };
                }
            }
            if (dupData) {
                // Lead no bolsão do admin (descartado/estacionado, inclusive etapa
                // legada) fica INVISÍVEL pro corretor — a mensagem precisa dizer
                // onde ele está, senão vira mistério ("não acho, mas já existe?").
                const noBolsaoDoAdmin = (ETAPAS_DO_ADMIN as readonly string[]).includes(mapEtapaCircuito(dupData.etapa));
                if (noBolsaoDoAdmin) {
                    setError(`${dupData.nome || 'Esse cliente'} foi descartado e está no bolsão do administrador — peça pro admin redistribuir em Importar Leads.`);
                } else if (dupData.userId === currentUser.uid) {
                    setError(`Você já tem esse lead: ${dupData.nome || 'sem nome'}.`);
                } else {
                    let nomeDono = 'outro corretor';
                    if (dupData.userId) {
                        try {
                            const donoSnap = await getDoc(doc(db, 'usuarios', dupData.userId));
                            nomeDono = (donoSnap.data()?.nome as string) || nomeDono;
                        } catch {
                            // mantém o fallback "outro corretor"
                        }
                    }
                    setError(`Esse telefone já é lead de ${nomeDono}.`);
                }
                return; // NÃO cria o lead duplicado
            }

            // Salva na coleção principal 'leads'
            const novoRef = await addDoc(leadsCollectionRef, {
                userId: currentUser.uid, // Adiciona o ID do usuário ao lead
                imobiliariaId: userData?.imobiliariaId || '', // Adiciona o ID da imobiliária
                nome: name,
                telefone: phone,
                whatsapp: phone.replace(/\D/g, ''),
                email,
                etapa: stages[0] ?? '',
                origem: origemFinal,
                origemTipo: origem, // guarda a opção escolhida (ex: 'Outros') para relatórios
                ...(origem === 'Outros' && { origemOutros: origemOutros.trim() }),
                ...(origem === 'Propaganda' && { origemPropaganda: origemOutros.trim() }),
                createdAt: serverTimestamp(),
                // Espelho das tarefas pendentes (lead novo nasce sem tarefa)
                tarefasPendentes: [],
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
            // Lead criado → abre direto o atendimento (os 2 pop-ups do circuito)
            router.push(`/dashboard/crm/${novoRef.id}`);
        } catch (err) {
            console.error(err);
            setError('Falha ao criar o lead. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-[#12101a] rounded-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] border border-white/10 p-6 w-full max-w-md relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 gx-line" />
                <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-[#FF5C7E] transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
                <h2 className="al-display text-[15px] font-bold text-white uppercase tracking-[0.14em] mb-6">Cadastrar Novo Lead</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Nome *</label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 text-white placeholder-white/30" placeholder="Nome do lead" required />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">Telefone *</label>
                        <input type="tel" id="phone" value={phone} onChange={handlePhoneChange} className="mt-1 block w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 text-white placeholder-white/30" placeholder="(00) 00000-0000" required maxLength={15} />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary">E-mail</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 text-white placeholder-white/30" placeholder="email@exemplo.com" />
                    </div>
                    {/* Etapa não se escolhe: todo lead nasce em Entrada e o circuito conduz dali */}
                    <div>
                        <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Origem do lead</span>
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
                                    <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${origem === op ? 'bg-[#FF1E56]/15 text-[#FF9EB5] border-[#FF3364]/60 font-semibold shadow-[0_0_12px_-2px_rgba(255,30,86,0.4)]' : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08] hover:border-white/20'}`}>
                                        {op}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {(origem === 'Outros' || origem === 'Propaganda') && (
                            <div className="mt-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                                <label htmlFor="origem-outros" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">
                                    {origem === 'Propaganda' ? 'De qual propaganda veio?' : 'Especifique a origem'}
                                </label>
                                <input
                                    id="origem-outros"
                                    type="text"
                                    value={origemOutros}
                                    onChange={(e) => setOrigemOutros(e.target.value)}
                                    placeholder={origem === 'Propaganda' ? 'Ex: Campanha Barra Velha — Instagram' : 'Ex: Indicação do parceiro, Site...'}
                                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 text-white placeholder-white/30"
                                />
                            </div>
                        )}
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-semibold text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-xl transition-colors disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50">
                            {isLoading ? 'Cadastrando...' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 