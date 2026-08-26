'use client';

/**
 * FUNIL 1 · O CARTÃO DO IMÓVEL.
 *
 * Mora fora da página por dois motivos. O primeiro é que a página já é
 * grande demais. O segundo é que assim dá pra OLHAR pra ele: existe uma
 * tela de preview que monta este mesmo componente com dados de mentira,
 * sem precisar de login nem de banco — então o layout se confere com os
 * olhos, e não lendo JSX.
 *
 * A régua aqui é a paridade com o cartão da locação: capa, quem é a pessoa,
 * o dinheiro, o estado do trabalho e os alertas com botão que resolve. O
 * lado do proprietário estava com metade disso.
 */
import React from 'react';
import {
  ETAPAS_IMOVEL, PORTAIS, REGRAS_PORTAIS, pendenciasImovel, totalInquilino, cents, fmtValor, fmtData,
  type ImovelLocacao, type AlertaImovel,
} from '@/lib/locacao';
import { btnOuro, btnGhost, SeloSimulacao } from './ui';

export type PainelImovel = 'ficha' | 'docsDono' | 'adm' | 'material' | 'portalDono';

export default function CartaoImovel({
  i, alertas, interessados, inquilino, zap, acao, painel,
  onAbrir, onVerFila, onVerInquilino, onCopiarCowork, onExcluir,
}: {
  i: ImovelLocacao;
  alertas: AlertaImovel[];
  interessados: number;
  /** quem mora aqui agora — só quando o imóvel está alugado */
  inquilino: { nome: string; desde: string } | null;
  /** link de WhatsApp do dono, ou '' quando não há telefone */
  zap: string;
  /** o botão do próximo passo, montado pela página */
  acao: React.ReactNode;
  /** o painel aberto embaixo, ou null */
  painel: React.ReactNode;
  onAbrir: (p: PainelImovel) => void;
  onVerFila: () => void;
  onVerInquilino: () => void;
  onCopiarCowork: () => void;
  onExcluir: () => void;
}) {
  const d = ETAPAS_IMOVEL[i.etapa];
  const pend = pendenciasImovel(i);
  // a bola está com a gente? — vem da definição da etapa, igual na locação
  const nossaVez = d?.comQuem === 'nós' && i.etapa !== 'pausado';
  const urgente = nossaVez || alertas.some((a) => a.grave);
  const temCowork = i.portais.some((c) => PORTAIS.find((x) => x.chave === c)?.via === 'cowork');
  const taxa = cents((i.aluguel || 0) * (i.taxaAdmPct || 0) / 100);
  const noAr = ETAPAS_IMOVEL[i.etapa].n >= 4;   // administração assinada em diante
  const nFotos = i.fotos.length;
  const nDesc = i.descricao.trim().length;
  const R = REGRAS_PORTAIS;
  const seloAnuncio = [
    { ok: nFotos >= R.fotosMin, txt: nFotos >= R.fotosMin ? `${nFotos} fotos` : `faltam ${R.fotosMin - nFotos} fotos (mín. ${R.fotosMin})` },
    { ok: nDesc >= R.descricaoMin && nDesc <= R.descricaoMax, txt: nDesc >= R.descricaoMin ? (nDesc <= R.descricaoMax ? 'descrição' : 'descrição longa demais') : `descrição curta (${nDesc} de ${R.descricaoMin})` },
    { ok: !!i.cep.trim(), txt: i.cep.trim() ? 'endereço com CEP' : 'falta o CEP' },
    { ok: i.portais.length > 0, txt: i.portais.length ? `${i.portais.length} portais` : 'escolher os portais' },
  ];

  return (
    <div className={`al-card relative overflow-hidden ${urgente ? 'ring-1 ring-[#E8C547]/25' : ''}`}>
      {urgente && <div className="absolute inset-x-0 top-0 gx-line-gold" />}
      <div className="p-4">

        {/* capa + identidade + próximo passo */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="relative shrink-0">
            {i.fotos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.fotos[0]} alt={i.titulo} className="h-[74px] w-[108px] rounded-xl object-cover border border-white/10" />
            ) : (
              <div className="h-[74px] w-[108px] rounded-xl border border-dashed border-white/15 bg-white/[0.03] grid place-items-center">
                <span className="text-[24px] opacity-40">🏠</span>
              </div>
            )}
            <span className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold ${
              i.fotos.length >= REGRAS_PORTAIS.fotosMin ? 'bg-black/70 text-white/80' : 'bg-amber-500/90 text-[#231a00]'}`}>
              {i.fotos.length >= REGRAS_PORTAIS.fotosMin ? `${i.fotos.length} 📷` : `${i.fotos.length} 📷 · mín. ${REGRAS_PORTAIS.fotosMin}`}
            </span>
          </div>

          <div className="min-w-0 flex-1 basis-[240px]">
            <p className="text-[14px] font-bold text-white leading-snug">
              <span className="text-[#E8C547]/70 mr-1.5">{i.codigo}</span>{i.titulo || '(sem nome)'}
            </p>
            <p className="text-[11.5px] text-text-secondary mt-0.5">
              {[`${d?.icone} ${d?.rotulo}`, i.tipo, i.bairro,
                [i.quartos ? `${i.quartos} q` : null, i.vagas ? `${i.vagas} vg` : null, i.areaPrivativa ? `${i.areaPrivativa} m²` : null].filter(Boolean).join(' · ') || null,
              ].filter(Boolean).join(' · ')}
              {i.admSimulada && <span className="ml-2"><SeloSimulacao /></span>}
            </p>
            <p className="text-[12px] mt-1">
              <span className="text-text-secondary">Proprietário: </span>
              <b className="text-white/90">{i.donoNome || '(a preencher)'}</b>
              {i.donoTelefone && <span className="text-text-secondary"> · {i.donoTelefone}</span>}
            </p>
            {d?.oQueFalta && <p className="text-[12px] text-[#FFE9A6] mt-1">→ {d.oQueFalta}</p>}
          </div>

          <div className="shrink-0">{acao}</div>
        </div>

        {/* o dinheiro combinado com o dono */}
        {i.aluguel ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-3 pt-2.5 border-t border-white/[0.06] text-[11.5px]">
            <span className="text-text-secondary">
              Inquilino paga <b className="text-white tabular-nums">{fmtValor(totalInquilino(i))}</b>
            </span>
            <span className="text-text-secondary">
              Dono recebe <b className="text-emerald-300 tabular-nums">{fmtValor(cents((i.aluguel || 0) - taxa + (i.iptuMensal || 0)))}</b>
            </span>
            <span className="text-text-secondary">
              Casa fica com <b className="text-[#FFE9A6] tabular-nums">{fmtValor(taxa)}</b>
              <span className="text-white/30"> ({i.taxaAdmPct ?? 0}%)</span>
            </span>
            {i.condominio ? <span className="text-white/35">+ condomínio {fmtValor(i.condominio)} direto à administradora</span> : null}
          </div>
        ) : null}

        {/* prontidão do anúncio, em selos.
            O selo que falha DIZ O QUE FAZER — "faltam 2 fotos", e não "3 de 5
            fotos". Número serve pra conferir; verbo serve pra trabalhar. */}
        {noAr && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {seloAnuncio.map(({ ok, txt }) => (
              <span key={txt} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                ok ? 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-300/90'
                   : 'border-amber-500/30 bg-amber-500/[0.07] text-amber-300'}`}>
                {ok ? '✓' : '○'} {txt}
              </span>
            ))}
            {i.videoUrl && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border border-sky-500/25 bg-sky-500/[0.07] text-sky-300/90">🎬 vídeo</span>
            )}
          </div>
        )}

        {i.etapa === 'captado' && pend.docs.length > 0 && (
          <p className="text-[11.5px] text-amber-300 mt-2.5">Falta a papelada: {pend.docs.join(' · ')}</p>
        )}

        {/* os alertas do lado do dono — todos com ação, igual na locação */}
        {alertas.map((a, n) => (
          <div key={n} className={`flex flex-wrap items-center gap-2 mt-2 rounded-lg px-3 py-1.5 ${
            a.grave ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-amber-500/[0.07] border border-amber-500/20'}`}>
            <p className={`text-[11.5px] font-bold flex-1 min-w-[200px] ${a.grave ? 'text-rose-300' : 'text-amber-300'}`}>
              {a.grave ? '🚨' : '⚠'} {a.texto}
            </p>
            {a.tipo === 'feed' && <button onClick={() => onAbrir('material')} className={btnOuro + ' !py-1 !text-[10.5px] shrink-0'}>📸 corrigir o anúncio</button>}
            {a.tipo === 'parado' && <button onClick={() => onAbrir('material')} className={btnOuro + ' !py-1 !text-[10.5px] shrink-0'}>📸 revisar o anúncio</button>}
            {a.tipo === 'semDono' && <button onClick={() => onAbrir('docsDono')} className={btnOuro + ' !py-1 !text-[10.5px] shrink-0'}>📎 informar o PIX</button>}
            {a.tipo === 'assinatura' && zap && (
              <a href={zap} target="_blank" rel="noreferrer" className={btnOuro + ' !py-1 !text-[10.5px] shrink-0'}>💬 cobrar no WhatsApp</a>
            )}
          </div>
        ))}

        {i.etapa === 'publicado' && !alertas.length && interessados === 0 && (
          <p className="text-[11.5px] text-text-secondary mt-2.5">
            No ar desde {fmtData(i.publicadoEm)} · aguardando os primeiros interessados.
          </p>
        )}

        {/* as gavetas */}
        {inquilino && (
          <p className="text-[11.5px] text-text-secondary mt-2.5">
            🏡 <b className="text-white/85">{inquilino.nome}</b> mora aqui
            {inquilino.desde && <> desde {fmtData(inquilino.desde)}</>}.
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {inquilino && (
            <button onClick={onVerInquilino}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#34D399]/40 bg-[#34D399]/10 text-[#34D399]">
              🏡 ver o contrato →
            </button>
          )}
          {interessados > 0 && (
            <button onClick={onVerFila}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-[#E8C547]/40 bg-[#E8C547]/10 text-[#FFE9A6]">
              🔑 {interessados} no CRM →
            </button>
          )}
          {zap && <a href={zap} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-300">💬 dono</a>}
          <button onClick={() => onAbrir('ficha')} className={btnGhost + ' !py-1 !text-[11px]'}>🏠 dados</button>
          <button onClick={() => onAbrir('docsDono')} className={btnGhost + ' !py-1 !text-[11px]'}>📎 documentos ({i.docsDono.length})</button>
          <button onClick={() => onAbrir('adm')} className={btnGhost + ' !py-1 !text-[11px]'}>📜 administração</button>
          {noAr && (
            <>
              <button onClick={() => onAbrir('material')} className={btnGhost + ' !py-1 !text-[11px]'}>📸 anúncio</button>
              <button onClick={() => onAbrir('portalDono')} className={btnGhost + ' !py-1 !text-[11px]'}>👁 portal do dono</button>
            </>
          )}
          {temCowork && <button onClick={onCopiarCowork} className={btnGhost + ' !py-1 !text-[11px]'}>📦 pacote Cowork</button>}
          <button onClick={onExcluir} className={btnGhost + ' !py-1 !text-[11px] !text-rose-300/70 ml-auto'}>excluir</button>
        </div>
      </div>

      {painel && <div className="border-t border-white/[0.08] bg-white/[0.02] p-4">{painel}</div>}
    </div>
  );
}
