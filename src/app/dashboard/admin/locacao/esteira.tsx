'use client';

/**
 * LOCAÇÃO · ABA CANDIDATOS — a papelada de quem já escolheu o imóvel.
 *
 * Isto NÃO é funil: atendimento, visitas e leads de portal são dos
 * corretores, numa fase própria (fase 2). Aqui entra o candidato que FECHOU
 * — e a vida dele é curta: junta documentos (CNH, renda…) → análise da
 * Loft → aprovado vira contrato. O Fluxo mostra os mesmos candidatos como
 * cartões de jornada; esta aba é a lista de trabalho.
 */
import React, { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { showToast } from '@/components/ui/toast';
import {
  ETAPAS_LEAD, LEAD_VAZIO, CONTRATO_VAZIO, CATEGORIAS_DOC_LEAD, hojeYmd, fmtData,
  type LeadLocacao, type ImovelLocacao,
} from '@/lib/locacao';
import { inputCls, btnOuro, btnGhost, btnSimula, Campo, SeloSimulacao } from './ui';

export default function AbaCandidatos({ imobiliariaId, isEspelhoDemo, leads, imoveis, recarregar, aoConverter }: {
  imobiliariaId?: string;
  isEspelhoDemo?: boolean;
  leads: LeadLocacao[];
  imoveis: ImovelLocacao[];
  recarregar: () => Promise<void>;
  aoConverter: () => void;
}) {
  const [novoAberto, setNovoAberto] = useState(false);
  const [nNome, setNNome] = useState(''); const [nTel, setNTel] = useState('');
  const [nEmail, setNEmail] = useState(''); const [nImovel, setNImovel] = useState('');
  const [nCorretor, setNCorretor] = useState('');
  const [filtro, setFiltro] = useState<'ativos' | 'todos'>('ativos');
  const [catDoc, setCatDoc] = useState<string>('CNH/RG');
  const [subindoDe, setSubindoDe] = useState<string | null>(null);
  const [perdendo, setPerdendo] = useState<string | null>(null);
  const [pMotivo, setPMotivo] = useState('');

  const imovelDe = (id: string) => imoveis.find((x) => x.id === id);
  const guarda = () => { if (isEspelhoDemo) { showToast('Modo demonstração.', 'info'); return true; } return false; };

  const adicionar = async () => {
    if (guarda() || !imobiliariaId) return;
    if (!nNome.trim() || !nImovel) { showToast('Nome e imóvel são obrigatórios.', 'error'); return; }
    await addDoc(collection(db, 'locacaoLeads'), {
      ...LEAD_VAZIO, imobiliariaId, imovelId: nImovel,
      nome: nNome.trim(), telefone: nTel.trim(), email: nEmail.trim(), corretorNome: nCorretor.trim(),
      criadoEm: serverTimestamp(),
    });
    setNovoAberto(false); setNNome(''); setNTel(''); setNEmail(''); setNImovel(''); setNCorretor('');
    showToast('Candidato registrado — junta os documentos e manda pra análise.', 'success');
    recarregar();
  };

  const mudar = async (l: LeadLocacao, campos: Partial<LeadLocacao>) => {
    if (guarda()) return;
    await updateDoc(doc(db, 'locacaoLeads', l.id), { ...campos, atualizadoEm: serverTimestamp() });
    recarregar();
  };

  const anexarDoc = async (l: LeadLocacao, arquivos: FileList | null) => {
    if (!arquivos?.length || !imobiliariaId || guarda()) return;
    setSubindoDe(l.id);
    try {
      const novos = [...(l.documentos || [])];
      for (const a of Array.from(arquivos)) {
        const storagePath = `locacao/${imobiliariaId}/candidatos/${Date.now()}-${a.name}`;
        const task = uploadBytesResumable(ref(storage, storagePath), a, a.type ? { contentType: a.type } : undefined);
        await task;
        novos.push({ nome: a.name, url: await getDownloadURL(task.snapshot.ref), storagePath, categoria: catDoc });
      }
      await updateDoc(doc(db, 'locacaoLeads', l.id), { documentos: novos, atualizadoEm: serverTimestamp() });
      showToast('Documento guardado.', 'success');
      recarregar();
    } catch { showToast('Falha ao subir.', 'error'); }
    setSubindoDe(null);
  };

  const simularLoft = async (l: LeadLocacao, ok: boolean) => {
    if (ok) {
      const vig = new Date(); vig.setFullYear(vig.getFullYear() + 1);
      await mudar(l, {
        etapa: 'analise_aprovada',
        garantia: { numero: `LOFT-${Math.floor(Math.random() * 90000) + 10000}`, taxaMensalPct: 10, vigenciaFim: vig.toISOString().slice(0, 10), simulada: true },
      });
      showToast('⚡ Loft aprovou (simulação). Pode gerar o contrato.', 'success');
    } else {
      await mudar(l, { etapa: 'analise_recusada' });
      showToast('⚡ Loft recusou (simulação).', 'info');
    }
  };

  const gerarContrato = async (l: LeadLocacao) => {
    if (guarda() || !imobiliariaId) return;
    const im = imovelDe(l.imovelId);
    const refC = await addDoc(collection(db, 'locacaoContratos'), {
      ...CONTRATO_VAZIO, imobiliariaId, imovelId: l.imovelId, leadId: l.id,
      locadorNome: im?.locadorNome || '', locadorDoc: im?.locadorDoc || '', locadorEmail: im?.locadorEmail || '',
      locadorTelefone: im?.locadorTelefone || '', locadorPix: im?.locadorPix || '',
      locatarioNome: l.nome, locatarioTelefone: l.telefone, locatarioEmail: l.email,
      valorAluguel: im?.aluguel ?? null, valorCondominio: im?.condominio ?? null,
      valorIptuMensal: im?.iptuMensal ?? null, valorSeguroIncendio: im?.seguroIncendio ?? null,
      inicio: hojeYmd(),
      garantiaNumero: l.garantia?.numero || '', garantiaTaxaMensalPct: l.garantia?.taxaMensalPct ?? null,
      garantiaVigenciaFim: l.garantia?.vigenciaFim || '', garantiaSimulada: l.garantia?.simulada ?? false,
      documentos: (l.documentos || []).map((d) => ({ ...d, categoria: d.categoria || 'RG/CPF do inquilino' })),
      criadoEm: serverTimestamp(),
    });
    await mudar(l, { etapa: 'convertido', contratoId: refC.id });
    showToast('Contrato criado com os documentos dentro — segue na aba Contratos ou no Fluxo.', 'success');
    aoConverter();
  };

  const visiveis = leads.filter((l) =>
    filtro === 'todos' || !['convertido', 'perdido', 'analise_recusada'].includes(l.etapa));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setNovoAberto((v) => !v)} className={btnOuro}>+ Candidato</button>
        <button onClick={() => setFiltro(filtro === 'ativos' ? 'todos' : 'ativos')} className={btnGhost}>
          {filtro === 'ativos' ? 'mostrar encerrados' : 'só os ativos'}
        </button>
        <span className="text-[11px] text-text-secondary ml-auto max-w-[46ch] text-right">
          Candidato = quem já escolheu o imóvel. Atendimento e visitas são dos corretores (fase 2).
        </span>
      </div>

      {novoAberto && (
        <div className="al-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Campo rot="Nome" largura="sm:col-span-2"><input className={inputCls} value={nNome} onChange={(e) => setNNome(e.target.value)} /></Campo>
            <Campo rot="Telefone (WhatsApp)"><input className={inputCls} value={nTel} onChange={(e) => setNTel(e.target.value)} /></Campo>
            <Campo rot="E-mail"><input className={inputCls} value={nEmail} onChange={(e) => setNEmail(e.target.value)} /></Campo>
            <Campo rot="Imóvel que ele fechou" largura="sm:col-span-2">
              <select className={inputCls} value={nImovel} onChange={(e) => setNImovel(e.target.value)}>
                <option value="">— escolher —</option>
                {imoveis.map((i) => <option key={i.id} value={i.id}>{i.codigo} — {i.titulo}</option>)}
              </select>
            </Campo>
            <Campo rot="Corretor que fechou (os 40%)" largura="sm:col-span-2"><input className={inputCls} value={nCorretor} onChange={(e) => setNCorretor(e.target.value)} /></Campo>
          </div>
          <div className="flex gap-2">
            <button onClick={adicionar} className={btnOuro}>Registrar candidato</button>
            <button onClick={() => setNovoAberto(false)} className={btnGhost}>cancelar</button>
          </div>
        </div>
      )}

      {visiveis.length === 0 && (
        <div className="al-card p-8 text-center">
          <p className="text-[32px] mb-2">👥</p>
          <p className="text-sm text-text-secondary max-w-[52ch] mx-auto">
            Nenhum candidato na papelada. Quando alguém fechar um imóvel, registra aqui (ou pelo Fluxo) e
            a burocracia anda: documentos → Loft → contrato.
          </p>
        </div>
      )}

      {visiveis.map((l) => {
        const et = ETAPAS_LEAD[l.etapa] || ETAPAS_LEAD.docs;
        const im = imovelDe(l.imovelId);
        const docs = l.documentos || [];
        return (
          <div key={l.id} className="al-card p-4">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[14px] font-bold text-white">{l.nome}</span>
              <span className="text-[11.5px] text-text-secondary">{im ? `${im.codigo} — ${im.titulo}` : 'imóvel removido'}</span>
              {l.garantia?.simulada && <SeloSimulacao />}
              <span className="text-[11px] font-bold text-[#FFE9A6] ml-auto">{et.rotulo}</span>
            </div>
            <p className="text-[11.5px] text-text-secondary mt-0.5">
              {[l.telefone, l.email, l.corretorNome && `corretor: ${l.corretorNome}`, l.mensagem].filter(Boolean).join(' · ')}
            </p>
            {l.garantia && (
              <p className="text-[11.5px] mt-1">
                <span className="text-emerald-300 font-bold">Garantia {l.garantia.numero}</span>
                <span className="text-text-secondary"> · taxa {l.garantia.taxaMensalPct}%/mês do inquilino · vigência até {fmtData(l.garantia.vigenciaFim)}</span>
              </p>
            )}
            {docs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {docs.map((d, j) => (
                  <a key={j} href={d.url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10.5px] text-text-secondary hover:text-white bg-white/[0.04] border border-white/10 rounded-lg px-2 py-0.5">
                    <b className="text-[#FFE9A6]/80 text-[9px] uppercase">{d.categoria}</b> {d.nome}
                  </a>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {!['convertido', 'perdido', 'analise_recusada', 'analise_enviada', 'analise_aprovada'].includes(l.etapa) && (
                <>
                  <span className="inline-flex items-center">
                    <select value={catDoc} onChange={(e) => setCatDoc(e.target.value)}
                      className="px-2 py-2 rounded-l-xl border border-white/10 bg-white/[0.04] text-[11px] text-text-secondary focus:outline-none">
                      {CATEGORIAS_DOC_LEAD.map((cat) => <option key={cat}>{cat}</option>)}
                    </select>
                    <label className={btnGhost + ' cursor-pointer !rounded-l-none'}>
                      {subindoDe === l.id ? 'Subindo…' : '📎 juntar documento'}
                      <input type="file" multiple className="hidden" disabled={subindoDe === l.id}
                        onChange={(e) => { anexarDoc(l, e.target.files); e.currentTarget.value = ''; }} />
                    </label>
                  </span>
                  <button onClick={() => mudar(l, { etapa: 'analise_enviada' })} className={btnOuro}>▶ Enviar pra análise (Loft)</button>
                </>
              )}

              {l.etapa === 'analise_enviada' && (
                <>
                  <span className="text-[11.5px] text-text-secondary">A Loft responderia em &lt;1 min:</span>
                  <button onClick={() => simularLoft(l, true)} className={btnSimula}>⚡ aprovou</button>
                  <button onClick={() => simularLoft(l, false)} className={btnSimula}>⚡ recusou</button>
                </>
              )}

              {l.etapa === 'analise_aprovada' && (
                <button onClick={() => gerarContrato(l)} className={btnOuro}>📄 Gerar contrato</button>
              )}

              {!['convertido', 'perdido'].includes(l.etapa) && (perdendo === l.id ? (
                <>
                  <input className={inputCls + ' !w-56'} placeholder="motivo" value={pMotivo} onChange={(e) => setPMotivo(e.target.value)} />
                  <button onClick={() => { mudar(l, { etapa: 'perdido', perdidoMotivo: pMotivo.trim() }); setPerdendo(null); setPMotivo(''); }} className={btnGhost + ' !text-rose-300'}>confirmar</button>
                  <button onClick={() => setPerdendo(null)} className={btnGhost}>×</button>
                </>
              ) : (
                <button onClick={() => setPerdendo(l.id)} className={btnGhost + ' ml-auto !text-rose-300/70'}>desistiu</button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
