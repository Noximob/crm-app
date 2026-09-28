'use client';

/**
 * ORIGEM E CARTEIRA DO LEAD — corrigir depois de cadastrado.
 *
 * A carteira é decidida no cadastro pela origem escolhida (plantão → Minha
 * rede, propaganda → CRM da casa). Às vezes sai errado: marcou "Plantão" num
 * lead que na verdade era da propaganda, ou cadastrou no CRM da casa um
 * cliente que é da rede dele. Aqui o corretor troca a carteira, a origem, ou
 * os dois — e o lead muda de CRM na hora. A linha do tempo registra quem
 * mudou e de onde pra onde.
 *
 * Mesmas opções e mesma regra de gravação do cadastro (NewLeadModal): a
 * origem vai em `origem` (o texto que aparece), `origemTipo` (a opção, pra
 * filtro e relatório) e o detalhe em `origemPropaganda` / `origemOutros`.
 */
import React, { useEffect, useState } from 'react';
import { collection, deleteField, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Lead } from '@/types';
import {
    CARTEIRA_IMOBILIARIA, CARTEIRA_REDE, ORIGENS_IMOBILIARIA, ORIGENS_REDE,
    carteiraDoLead, leadGuardado, rotuloOrigem, type Carteira,
} from '@/lib/funilVendas';
import { showToast } from '@/components/ui/toast';

interface EditarOrigemModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead;
}

const nomeCarteira = (c: Carteira) => (c === CARTEIRA_REDE ? 'Minha rede' : 'CRM da casa');
const opcoesDe = (c: Carteira): readonly string[] => (c === CARTEIRA_REDE ? ORIGENS_REDE : ORIGENS_IMOBILIARIA);

/** O detalhe que o cadastro guardou junto da origem (qual propaganda, qual plantão, quem indicou…). */
function detalheAtual(lead: Lead): string {
    const l = lead as Lead & { origemPropaganda?: string; origemOutros?: string };
    if (l.origemPropaganda) return l.origemPropaganda;
    if (l.origemOutros) return l.origemOutros;
    const origem = String(lead.origem || '');
    const sep = origem.indexOf(' · ');
    if (sep >= 0) return origem.slice(sep + 3).trim();
    // "Outros" grava o detalhe direto em `origem`
    return lead.origemTipo === 'Outros' ? origem : '';
}

export default function EditarOrigemModal({ isOpen, onClose, lead }: EditarOrigemModalProps) {
    const { currentUser, userData, isEspelhoDemo } = useAuth();
    const carteiraAtual = carteiraDoLead(lead);
    const [carteira, setCarteira] = useState<Carteira>(carteiraAtual);
    const [origem, setOrigem] = useState<string>(opcoesDe(carteiraAtual)[0]);
    const [detalhe, setDetalhe] = useState('');
    const [erro, setErro] = useState('');
    const [salvando, setSalvando] = useState(false);

    // Abriu: parte do que o lead tem hoje
    useEffect(() => {
        if (!isOpen) return;
        setCarteira(carteiraAtual);
        const tipo = String(lead.origemTipo || '');
        const lista = opcoesDe(carteiraAtual);
        setOrigem(lista.includes(tipo) ? tipo : lista[0]);
        setDetalhe(detalheAtual(lead));
        setErro('');
    }, [isOpen, lead, carteiraAtual]);

    // Trocou a carteira: a origem tem que ser uma da lista dela
    const trocarCarteira = (c: Carteira) => {
        setCarteira(c);
        if (!opcoesDe(c).includes(origem)) setOrigem(opcoesDe(c)[0]);
        setErro('');
    };

    const pedeDetalhe = origem === 'Outros' || origem === 'Propaganda' || origem === 'Plantão' || origem === 'Indicação';
    const mudouCarteira = carteira !== carteiraAtual;
    const saiDaGaveta = mudouCarteira && carteira === CARTEIRA_IMOBILIARIA && leadGuardado(lead);

    const salvar = async () => {
        if (!currentUser) return;
        if (isEspelhoDemo) { showToast('Modo demonstração — nada é salvo.', 'info'); return; }
        const det = detalhe.trim();
        if (origem === 'Outros' && !det) { setErro('Informe a origem em "Outros".'); return; }
        if (origem === 'Propaganda' && !det) { setErro('Informe de qual propaganda o lead veio.'); return; }

        // Mesma composição do cadastro
        const origemFinal = origem === 'Outros'
            ? det
            : origem === 'Propaganda'
                ? `Propaganda · ${det}`
                : det ? `${origem} · ${det}` : origem;
        const mudouOrigem = origemFinal !== String(lead.origem || '') || origem !== String(lead.origemTipo || '');
        if (!mudouCarteira && !mudouOrigem) { onClose(); return; }

        setSalvando(true);
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'leads', lead.id), {
                carteira,
                origem: origemFinal,
                origemTipo: origem,
                origemPropaganda: origem === 'Propaganda' ? det : deleteField(),
                origemOutros: origem === 'Outros' ? det : deleteField(),
                // A gaveta é coisa da rede: indo pro CRM da casa, ele sai dela e volta pra cobrança
                ...(saiDaGaveta ? { guardado: false, guardadoEm: null } : {}),
            });
            const partes: string[] = [];
            if (mudouCarteira) partes.push(`🔁 Movido de ${nomeCarteira(carteiraAtual)} pra ${nomeCarteira(carteira)}`);
            if (mudouOrigem) partes.push(`✏️ Origem: ${lead.origem || '—'} → ${origemFinal}`);
            if (saiDaGaveta) partes.push('saiu do Interesse futuro');
            batch.set(doc(collection(db, 'leads', lead.id, 'interactions')), {
                type: 'Etapa',
                notes: partes.join(' · '),
                timestamp: serverTimestamp(),
                por: userData?.nome || '',
            });
            await batch.commit();
            showToast(mudouCarteira
                ? `${lead.nome.split(' ')[0]} agora está em ${nomeCarteira(carteira)}.`
                : 'Origem corrigida.', 'success');
            onClose();
        } catch (e) {
            console.error('origem/carteira:', e);
            showToast('Não foi possível salvar — tente de novo.', 'error');
        } finally {
            setSalvando(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div
                className="relative w-full max-w-lg rounded-2xl bg-[#12101a] border border-white/10 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] overflow-hidden"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-origem"
            >
                <div className="absolute inset-x-0 top-0 gx-line" />
                <div className="p-6 space-y-5">
                    <div>
                        <h2 id="titulo-origem" className="al-display text-[17px] font-bold text-white uppercase tracking-[0.12em]">Origem e carteira</h2>
                        <p className="text-[12.5px] text-text-secondary mt-1">
                            {lead.nome} — hoje em <b className="text-white">{nomeCarteira(carteiraAtual)}</b>{lead.origem ? <>, origem <b className="text-white">{lead.origem}</b></> : null}.
                        </p>
                    </div>

                    {/* De quem é o lead */}
                    <div>
                        <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Carteira</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {([
                                { id: CARTEIRA_IMOBILIARIA, titulo: '🏢 CRM da casa', desc: 'Lead que a imobiliária entregou. O circuito cobra o próximo passo e atraso conta na métrica.' },
                                { id: CARTEIRA_REDE, titulo: '🤝 Minha rede', desc: 'Cliente seu: networking, indicação, rua, plantão. Agendar é opcional e atraso não pesa na casa.' },
                            ] as { id: Carteira; titulo: string; desc: string }[]).map(c => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => trocarCarteira(c.id)}
                                    aria-pressed={carteira === c.id}
                                    className={`text-left rounded-xl border p-3 transition-colors ${carteira === c.id
                                        ? 'border-[#FF3364]/60 bg-[#FF1E56]/10 shadow-[0_0_14px_-4px_rgba(255,30,86,0.45)]'
                                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'}`}
                                >
                                    <p className={`text-sm font-bold ${carteira === c.id ? 'text-white' : 'text-white/80'}`}>{c.titulo}</p>
                                    <p className="text-[11.5px] text-text-secondary mt-1 leading-snug">{c.desc}</p>
                                </button>
                            ))}
                        </div>
                        {saiDaGaveta && (
                            <p className="mt-2 text-[12px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                                Ele está guardado em Interesse futuro. Indo pro CRM da casa, sai da gaveta e volta pra cobrança do circuito.
                            </p>
                        )}
                        {mudouCarteira && !saiDaGaveta && (
                            <p className="mt-2 text-[12px] text-text-secondary">
                                {carteira === CARTEIRA_REDE
                                    ? 'Na sua rede o pop-up não abre sozinho e tarefa atrasada não entra na métrica da casa.'
                                    : 'No CRM da casa o circuito passa a cobrar o próximo passo — tarefa atrasada dele conta na sua métrica.'}
                            </p>
                        )}
                    </div>

                    {/* De onde veio — as opções da carteira escolhida, iguais às do cadastro */}
                    <div>
                        <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-2">Origem</span>
                        <div className="flex flex-wrap gap-2">
                            {opcoesDe(carteira).map(op => (
                                <button
                                    key={op}
                                    type="button"
                                    onClick={() => { setOrigem(op); setErro(''); }}
                                    aria-pressed={origem === op}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${origem === op
                                        ? 'bg-[#FF1E56]/15 text-[#FF9EB5] border-[#FF3364]/60 font-semibold shadow-[0_0_12px_-2px_rgba(255,30,86,0.4)]'
                                        : 'bg-white/[0.04] border-white/10 text-text-secondary hover:bg-white/[0.08] hover:border-white/20'}`}
                                >
                                    {rotuloOrigem(op)}
                                </button>
                            ))}
                        </div>
                        {pedeDetalhe && (
                            <div className="mt-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03]">
                                <label htmlFor="origem-detalhe" className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-secondary mb-1">
                                    {origem === 'Propaganda' ? 'De qual propaganda veio?'
                                        : origem === 'Plantão' ? 'Qual plantão? (opcional)'
                                            : origem === 'Indicação' ? 'Quem indicou? (opcional)'
                                                : 'Especifique a origem'}
                                </label>
                                <input
                                    id="origem-detalhe"
                                    type="text"
                                    value={detalhe}
                                    onChange={e => { setDetalhe(e.target.value); setErro(''); }}
                                    placeholder={origem === 'Propaganda' ? 'Ex: Campanha Barra Velha — Instagram'
                                        : origem === 'Plantão' ? 'Ex: Plantão Orla da Barra — sábado'
                                            : origem === 'Indicação' ? 'Ex: indicação da Maria (cliente)'
                                                : 'Ex: parceiro, evento...'}
                                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF1E56]/50 focus:border-[#FF1E56]/50 text-white placeholder-white/30"
                                />
                            </div>
                        )}
                    </div>

                    {erro && <p className="text-sm text-red-400">{erro}</p>}

                    <div className="flex justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={salvando}
                            className="px-4 py-2 text-sm font-semibold text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-xl transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={salvar}
                            disabled={salvando}
                            className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#FF1E56] to-[#A50D38] hover:brightness-110 rounded-xl shadow-[0_8px_24px_-8px_rgba(255,30,86,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {salvando ? 'Salvando…' : mudouCarteira ? `Mover pra ${nomeCarteira(carteira)}` : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
