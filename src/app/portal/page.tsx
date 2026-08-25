'use client';

/**
 * PORTAL DO CLIENTE — alumma.com.br/portal
 *
 * Três públicos, três portas na mesma entrada:
 *
 *   🔍 QUEM PROCURA   a vitrine dos imóveis anunciados, direto do cadastro.
 *                     É a versão pública do que os portais publicam — e o
 *                     lugar pra onde apontar quem chega pelo Instagram.
 *   🏠 PROPRIETÁRIO   como está o imóvel dele e quanto cai no repasse.
 *   🔑 INQUILINO      a cobrança, o histórico, o contrato e a manutenção.
 *
 * A vitrine é REAL (lê os imóveis anunciados no banco). As duas áreas de
 * cliente rodam o cenário de demonstração enquanto não há login — quando ele
 * entrar, a fonte troca e o resto continua igual.
 */
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { DEMO_PORTAL, IMOVEL_VAZIO, totalMensal, fmtValor, type ImovelLocacao } from '@/lib/locacao';
import { VisaoDono, VisaoInquilino } from '@/lib/locacaoPortalView';

type Porta = 'entrada' | 'vitrine' | 'dono' | 'inquilino';

const btnOuro = 'px-4 py-2.5 rounded-xl text-[13px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all';
const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors';

export default function PortalCliente() {
  const [porta, setPorta] = useState<Porta>('entrada');
  const [imoveis, setImoveis] = useState<ImovelLocacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [detalhe, setDetalhe] = useState<ImovelLocacao | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'locacaoImoveis'), where('status', '==', 'anunciado')));
        setImoveis(snap.docs.map((d) => ({ ...IMOVEL_VAZIO, id: d.id, ...(d.data() as Partial<ImovelLocacao>) } as ImovelLocacao)));
      } catch { /* vitrine vazia é melhor que erro na cara do cliente */ }
      setCarregando(false);
    })();
  }, []);

  const filtrados = imoveis.filter((i) => {
    const b = busca.trim().toLowerCase();
    if (!b) return true;
    return [i.titulo, i.bairro, i.cidade, i.tipo].join(' ').toLowerCase().includes(b);
  });

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-3">

        <div className="text-center mb-1">
          <span className="gx-tag inline-flex"><span>Nox Imóveis · Locação</span></span>
          <h1 className="al-display text-[24px] font-bold text-white uppercase tracking-[0.12em] mt-2">
            {porta === 'vitrine' ? 'Imóveis para alugar' : 'Portal do Cliente'}
          </h1>
        </div>

        {/* ─────────── a entrada: três portas ─────────── */}
        {porta === 'entrada' && (
          <>
            <p className="text-center text-[13px] text-text-secondary max-w-[46ch] mx-auto mb-3">
              Escolha por onde entrar.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { p: 'vitrine' as const, i: '🔍', t: 'Quero alugar', d: 'Veja os imóveis disponíveis, com valores e detalhes.' },
                { p: 'dono' as const, i: '🏠', t: 'Sou proprietário', d: 'Acompanhe seu imóvel, os pagamentos e o seu repasse.' },
                { p: 'inquilino' as const, i: '🔑', t: 'Sou inquilino', d: '2ª via do boleto, histórico, contrato e manutenção.' },
              ].map((x) => (
                <button key={x.p} onClick={() => setPorta(x.p)} className="al-card p-6 text-left hover:bg-white/[0.04] transition-colors">
                  <p className="text-[30px] mb-2">{x.i}</p>
                  <p className="text-[15px] font-bold text-white">{x.t}</p>
                  <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">{x.d}</p>
                </button>
              ))}
            </div>
            <p className="text-center text-[11px] text-text-secondary pt-4">
              Já é cliente? As áreas do proprietário e do inquilino terão login em breve — hoje abrem em
              modo demonstração.
            </p>
          </>
        )}

        {/* ─────────── a vitrine ─────────── */}
        {porta === 'vitrine' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => { setPorta('entrada'); setDetalhe(null); }} className={btnGhost}>← voltar</button>
              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="buscar por bairro, cidade ou tipo…"
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40" />
              <span className="text-[11.5px] text-text-secondary">{filtrados.length} imóve{filtrados.length === 1 ? 'l' : 'is'}</span>
            </div>

            {carregando && <div className="al-card p-8 text-center text-sm text-text-secondary">Carregando os imóveis…</div>}

            {!carregando && filtrados.length === 0 && (
              <div className="al-card p-10 text-center">
                <p className="text-[32px] mb-2">🏘️</p>
                <p className="text-[14px] font-bold text-white">Nenhum imóvel disponível agora.</p>
                <p className="text-[12.5px] text-text-secondary mt-1 max-w-[40ch] mx-auto">
                  Chame a Nox no WhatsApp e conte o que você procura — avisamos assim que entrar algo do seu perfil.
                </p>
              </div>
            )}

            {/* o detalhe de um imóvel */}
            {detalhe && (
              <div className="al-card relative overflow-hidden p-5">
                <div className="absolute inset-x-0 top-0 gx-line-gold" />
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0">
                    <h2 className="text-[16px] font-bold text-white">{detalhe.titulo}</h2>
                    <p className="text-[12px] text-text-secondary">{[detalhe.bairro, detalhe.cidade].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button onClick={() => setDetalhe(null)} className={btnGhost + ' ml-auto'}>fechar</button>
                </div>

                {detalhe.fotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
                    {detalhe.fotos.map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={u} alt={`Foto ${i + 1} de ${detalhe.titulo}`}
                        className="h-40 rounded-xl object-cover shrink-0 border border-white/10" />
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[12.5px] text-white/85">
                  {detalhe.quartos !== null && <span>{detalhe.quartos} quarto{detalhe.quartos === 1 ? '' : 's'}{detalhe.suites ? ` (${detalhe.suites} suíte)` : ''}</span>}
                  {detalhe.banheiros !== null && <span>{detalhe.banheiros} banheiro{detalhe.banheiros === 1 ? '' : 's'}</span>}
                  {detalhe.vagas !== null && <span>{detalhe.vagas} vaga{detalhe.vagas === 1 ? '' : 's'}</span>}
                  {detalhe.areaPrivativa && <span>{detalhe.areaPrivativa} m²</span>}
                  <span>{detalhe.mobiliado}</span>
                </div>

                {detalhe.comodidades.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {detalhe.comodidades.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded-full text-[11px] bg-white/[0.05] border border-white/10 text-text-secondary">{c}</span>
                    ))}
                  </div>
                )}

                {detalhe.descricao && <p className="text-[12.5px] text-white/85 leading-relaxed mt-3 max-w-[62ch]">{detalhe.descricao}</p>}

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 mt-3">
                  {[
                    ['Aluguel', detalhe.aluguel],
                    ['Condomínio (pago direto ao condomínio)', detalhe.condominio],
                    ['IPTU (parcela mensal)', detalhe.iptuMensal],
                    ['Seguro incêndio', detalhe.seguroIncendio],
                  ].filter(([, v]) => v).map(([r, v]) => (
                    <div key={r as string} className="flex items-baseline justify-between gap-3 py-0.5">
                      <span className="text-[12.5px] text-text-secondary">{r}</span>
                      <span className="text-[12.5px] text-white/85 tabular-nums">{fmtValor(v as number)}</span>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between gap-3 border-t border-white/[0.08] mt-1 pt-1">
                    <span className="text-[12.5px] font-bold text-white">Custo mensal total</span>
                    <span className="text-[15px] font-extrabold text-[#FFE9A6] tabular-nums">{fmtValor(totalMensal(detalhe))}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11.5px] text-text-secondary">
                  {detalhe.garantiasAceitas.length > 0 && <span>Garantias: {detalhe.garantiasAceitas.join(', ')}</span>}
                  {detalhe.prazoMinimoMeses && <span>Contrato mínimo: {detalhe.prazoMinimoMeses} meses</span>}
                  <span>Código: {detalhe.codigo}</span>
                </div>

                <button className={btnOuro + ' mt-3'} onClick={() => alert('Chame a Nox Imóveis no WhatsApp informando o código ' + detalhe.codigo + '. Em breve este botão abre a conversa direto.')}>
                  💬 Tenho interesse
                </button>
              </div>
            )}

            {/* a grade */}
            {!detalhe && (
              <div className="grid sm:grid-cols-2 gap-3">
                {filtrados.map((i) => (
                  <button key={i.id} onClick={() => setDetalhe(i)} className="al-card overflow-hidden text-left hover:bg-white/[0.04] transition-colors">
                    {i.fotos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.fotos[0]} alt={i.titulo} className="w-full h-44 object-cover" />
                    ) : (
                      <div className="w-full h-44 bg-white/[0.03] flex items-center justify-center text-[32px]">🏠</div>
                    )}
                    <div className="p-4">
                      <p className="text-[14px] font-bold text-white leading-snug">{i.titulo}</p>
                      <p className="text-[11.5px] text-text-secondary mt-0.5">
                        {[i.bairro, i.cidade].filter(Boolean).join(' · ')}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11.5px] text-text-secondary">
                        {i.quartos !== null && <span>{i.quartos} quarto{i.quartos === 1 ? '' : 's'}</span>}
                        {i.vagas !== null && <span>{i.vagas} vaga{i.vagas === 1 ? '' : 's'}</span>}
                        {i.areaPrivativa && <span>{i.areaPrivativa} m²</span>}
                      </div>
                      <p className="text-[16px] font-extrabold text-[#FFE9A6] tabular-nums mt-2">
                        {fmtValor(i.aluguel)}<span className="text-[11.5px] text-text-secondary font-normal">/mês + encargos</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─────────── as áreas de cliente ─────────── */}
        {(porta === 'dono' || porta === 'inquilino') && (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => setPorta('entrada')} className={btnGhost}>← voltar</button>
              <button onClick={() => setPorta('dono')} className={porta === 'dono' ? btnOuro : btnGhost}>🏠 proprietário</button>
              <button onClick={() => setPorta('inquilino')} className={porta === 'inquilino' ? btnOuro : btnGhost}>🔑 inquilino</button>
            </div>

            <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-4 py-2 text-center">
              <p className="text-[11.5px] text-sky-200">
                <b>Demonstração.</b> Os dados são de exemplo — com login, você verá o seu contrato de verdade.
              </p>
            </div>

            {porta === 'dono' ? <VisaoDono d={DEMO_PORTAL} /> : <VisaoInquilino d={DEMO_PORTAL} />}
          </>
        )}

        <p className="text-[10.5px] text-text-secondary text-center pt-3">
          Nox Imóveis · setor de locação
        </p>
      </div>
    </div>
  );
}
