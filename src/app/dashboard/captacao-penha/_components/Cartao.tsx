'use client';

/**
 * O CARTÃO DE UM IMÓVEL.
 *
 * Em cima, o que decide a ligação: situação, se é de particular, preço, o que
 * tem, onde fica, o prédio e as linhas de destaque (direto com o dono, sem
 * exclusividade, baixou de preço, há quanto tempo está anunciado…).
 * O botão principal abre o anúncio (o do particular, quando existe).
 * Embaixo só duas ações: "Excluir" (com desfazer) e "Detalhes" — onde fica a
 * anotação da pessoa.
 *
 * As fotos vêm direto dos portais; se uma não abre, tenta a seguinte.
 */
import React, { useEffect, useState } from 'react';
import {
  FONTE, SINAIS_CARTAO, SINAL_TOM, SITUACAO, curto, destaques, dinheiro, fatos, mapaDe, miudos, num, rotuloAnuncio,
  type BaseCaptacao, type Imovel, type Situacao, type TomDestaque,
} from '@/lib/captacaoPenha';
import { campoCls } from './Filtros';

/** Clicar num prédio, construtora ou imobiliária mostra todos os imóveis dele. */
export type Ir = (chave: 'em' | 'co' | 'an', valor: string) => void;

const TOM_SITUACAO: Record<Situacao, string> = {
  c: 'bg-emerald-500/15 text-emerald-300',
  p: 'bg-amber-500/15 text-amber-300',
  t: 'bg-sky-500/15 text-sky-300',
  a: 'bg-white/10 text-white/70',
};
const TOM_DESTAQUE: Record<TomDestaque, [string, string]> = {
  '': ['text-white/90', 'bg-[#E8C547]'],
  multi: ['text-white/90', 'bg-[#E8C547]'],
  own: ['text-[#FF7A97]', 'bg-[#FF3364]'],
  drop: ['text-emerald-300', 'bg-emerald-400'],
  good: ['text-emerald-300', 'bg-emerald-400'],
  old: ['text-amber-300', 'bg-amber-400'],
};
const pilula = 'inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-bold leading-normal whitespace-nowrap';
const botaoMenor = 'rounded-lg border border-white/12 px-2.5 py-1.5 text-[12.5px] font-semibold text-white/85 whitespace-nowrap hover:border-[#FF1E56]/50 hover:text-white';

function Foto({ it }: { it: Imovel }) {
  const fotos = it.im || [];
  const [i, setI] = useState(0);
  if (i >= fotos.length) {
    return (
      <div className="absolute inset-0 grid place-items-center p-3 text-center text-[13px] font-semibold text-text-secondary">
        <span>{it.tp}<br />{fotos.length ? 'foto indisponível' : 'sem foto no anúncio'}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img loading="lazy" decoding="async" referrerPolicy="no-referrer" alt="" src={fotos[i]} onError={() => setI((n) => n + 1)}
      className="block h-full w-full object-cover" />
  );
}

function Nome({ chave, valor, simples, ir }: { chave: 'em' | 'co' | 'an'; valor: string; simples?: boolean; ir: Ir }) {
  return (
    <button type="button" onClick={() => ir(chave, valor)} title={`Ver todos: ${valor}`}
      className={`text-left font-semibold text-[#FFE9A6] break-words hover:underline ${simples ? '' : 'rounded-md bg-[#E8C547]/[0.12] px-1.5 py-0.5'}`}>
      {valor}
    </button>
  );
}

function Detalhes({ it, base, nota, anotar }: { it: Imovel; base: BaseCaptacao; nota: string; anotar: (id: string, texto: string) => void }) {
  const [texto, setTexto] = useState(nota);
  useEffect(() => { setTexto(nota); }, [nota]);
  const sinais = SINAIS_CARTAO.filter((c) => it._ft[c]);
  const linha = miudos(it);
  const mapa = mapaDe(it);
  return (
    <div className="flex flex-col gap-2 border-t border-dashed border-white/12 pt-2.5 text-[12.5px] text-text-secondary break-words">
      <div><b className="font-semibold text-white">{SITUACAO[it.st]}</b>{it.w ? ': ' + it.w : ''}</div>
      {sinais.length > 0 && (
        <>
          <div>O anúncio diz:</div>
          <div className="flex flex-wrap gap-1">
            {sinais.map((c) => (
              <span key={c} className={`rounded-full border px-2 py-px text-[11.5px] whitespace-nowrap ${SINAL_TOM[c] === 'neg' ? 'border-[#E8C547]/60 text-[#FFE9A6] font-semibold' : SINAL_TOM[c] === 'warn' ? 'border-rose-400/60 text-rose-300' : 'border-white/12 text-text-secondary'}`}>
                {base.FT[c]}
              </span>
            ))}
          </div>
        </>
      )}
      {linha && <div>{linha}</div>}
      {it._ans.length > 1 && <div>Quem anuncia: {it._ans.join(', ')}</div>}
      {it.de && <div>{it.de}</div>}
      {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className="self-start font-semibold text-[#FFE9A6] hover:underline">Ver no mapa ↗</a>}
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => { if (texto.trim() !== nota) anotar(it.i, texto); }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        placeholder="Anotação sua sobre este imóvel (opcional)"
        aria-label="Anotação"
        className={campoCls}
      />
    </div>
  );
}

function Cartao({ it, base, excluido, nota, ir, excluir, devolver, anotar }: {
  it: Imovel;
  base: BaseCaptacao;
  excluido: boolean;
  nota: string;
  ir: Ir;
  excluir: (id: string) => void;
  devolver: (id: string) => void;
  anotar: (id: string, texto: string) => void;
}) {
  const [anuncios, setAnuncios] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const links = it.l || [];
  const melhor = links[it._best];
  const hl = destaques(it, base.FT);
  const f = fatos(it);
  const onde = [it.tp, it.ba, it.r].filter(Boolean).join(' · ');
  const emp = it.em ? base.meta.emps[it.em] : undefined;
  const particular = it.ad === 'P';
  const nomes = it._ans;
  const telefone = nomes.length ? (it.an || []).filter((a) => a[0] === nomes[0] && a[2]).map((a) => a[2])[0] : undefined;

  return (
    <article className={`al-card flex min-w-0 flex-col overflow-hidden !rounded-2xl ${particular ? '!border-[#FF3364]/60 !shadow-[0_0_28px_-12px_rgba(255,30,86,0.65),0_24px_48px_-24px_rgba(0,0,0,0.65)]' : ''} ${excluido ? 'opacity-60' : ''}`}>
      <div className="relative aspect-[16/10] overflow-hidden bg-white/[0.04]"><Foto it={it} /></div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3.5">
        <div className="flex flex-wrap gap-1.5">
          <span className={`${pilula} ${TOM_SITUACAO[it.st]}`}>{SITUACAO[it.st]}</span>
          {particular && <span className={`${pilula} bg-gradient-to-r from-[#FF1E56] to-[#A50D38] text-white`}>Particular</span>}
          {it._new && <span className={`${pilula} bg-white text-[#0b0c11]`}>Novo</span>}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <b className="al-display text-[23px] font-bold leading-none text-white tabular-nums">{dinheiro(it.p)}</b>
          {it._drop ? <s className="text-[12px] text-text-secondary">{dinheiro(it.o)}</s>
            : it.pm && it.p && it.pm > it.p ? <span className="text-[12px] text-text-secondary">até {curto(it.pm)}</span> : null}
          {it._m2 ? <span className="ml-auto text-[12px] text-text-secondary tabular-nums">R$ {num(Math.round(it._m2))}/m²</span> : null}
        </div>

        <h3 className="m-0 line-clamp-2 break-words text-[14px] font-semibold leading-snug text-white">{it.t}</h3>

        {f.length > 0 && (
          <div className="text-[13px] text-white/80 tabular-nums">
            {f.map((x, i) => <React.Fragment key={x[1]}>{i > 0 && ' · '}<b className="font-bold text-white">{x[0]}</b> {x[1]}</React.Fragment>)}
          </div>
        )}
        <div className="break-words text-[12.5px] text-text-secondary">{onde}</div>

        {(it.em || it.co) && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px]">
            {it.em && <Nome chave="em" valor={it.em} ir={ir} />}
            {it.em && it.ei ? <span className="text-text-secondary" title="O anúncio não cita o prédio; a rua e o número são os dele">pelo endereço</span> : null}
            {emp && emp[1] === 'obra' && <span className={`${pilula} bg-rose-500/15 text-rose-300`}>prédio em obra</span>}
            {it.co && <><span className="text-text-secondary">{it.em ? '·' : 'Construtora:'}</span><Nome chave="co" valor={it.co} simples ir={ir} /></>}
          </div>
        )}

        {hl.length > 0 && (
          <ul className="m-0 mt-0.5 flex list-none flex-col gap-1 p-0">
            {hl.map((x) => (
              <li key={x[1]} className={`relative break-words pl-3.5 text-[12.5px] font-semibold ${TOM_DESTAQUE[x[0]][0]}`}>
                <span className={`absolute left-0 top-[0.5em] h-[7px] w-[7px] rounded-full ${TOM_DESTAQUE[x[0]][1]}`} />
                {x[1]}
              </li>
            ))}
          </ul>
        )}

        {!particular && nomes.length > 0 && (
          <div className="break-words text-[12.5px] text-text-secondary">
            Anunciado por <Nome chave="an" valor={nomes[0]} simples ir={ir} />{telefone ? ' · ' + telefone : ''}{nomes.length > 1 ? ' e mais ' + (nomes.length - 1) : ''}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-1.5">
          {melhor && (
            <a href={melhor[1]} target="_blank" rel="noopener noreferrer"
              className="al-cta inline-flex flex-1 basis-auto items-center justify-center rounded-xl bg-gradient-to-r from-[#FF1E56] to-[#A50D38] px-3 py-2.5 text-center text-[13px] font-bold leading-tight text-white shadow-[0_8px_24px_-10px_rgba(255,30,86,0.6)] hover:brightness-110 active:scale-[0.98]">
              {rotuloAnuncio(melhor)} ↗
            </a>
          )}
          {links.length > 1 && (
            <button type="button" aria-expanded={anuncios} onClick={() => setAnuncios((v) => !v)}
              className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-[13px] font-semibold text-white whitespace-nowrap hover:border-[#FF1E56]/50">
              {anuncios ? 'Fechar a lista' : `Ver os ${links.length} anúncios`}
            </button>
          )}
        </div>
        {links.length > 1 && anuncios && (
          <div className="flex flex-col overflow-hidden rounded-xl border border-white/10">
            {links.map((l, i) => (
              <a key={i} href={l[1]} target="_blank" rel="noopener noreferrer"
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-px border-b border-white/10 px-2.5 py-1.5 text-[12.5px] text-white no-underline last:border-b-0 hover:bg-[#FF1E56]/10">
                <span className={`break-words font-semibold ${l[5] ? 'text-[#FF7A97]' : ''}`}>{l[5] ? 'Anúncio do particular' : l[3] || 'Anunciante não informado'}</span>
                <span className="whitespace-nowrap text-[#FFE9A6]">{l[0] === 'SITE' ? 'site próprio' : 'no ' + FONTE[l[0]]} ↗</span>
                {l[2] ? <span className="col-span-2 text-text-secondary tabular-nums">{dinheiro(l[2])}</span> : null}
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2.5">
          <button type="button" onClick={() => (excluido ? devolver(it.i) : excluir(it.i))} className={botaoMenor}
            title={excluido ? 'Devolver este anúncio à lista' : 'Tirar da lista, por exemplo quando o anúncio não existe mais'}>
            {excluido ? 'Desfazer exclusão' : 'Excluir'}
          </button>
          <button type="button" aria-expanded={detalhes} onClick={() => setDetalhes((v) => !v)} className={`${botaoMenor} ml-auto`}>
            {detalhes ? 'Fechar ▴' : nota ? 'Detalhes e anotação ▾' : 'Detalhes ▾'}
          </button>
        </div>
        {detalhes && <Detalhes it={it} base={base} nota={nota} anotar={anotar} />}
      </div>
    </article>
  );
}

export default React.memo(Cartao);
