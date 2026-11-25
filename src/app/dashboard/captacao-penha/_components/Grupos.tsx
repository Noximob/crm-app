'use client';

/**
 * A LISTA POR PRÉDIO, CONSTRUTORA OU IMOBILIÁRIA — as três abas ao lado de
 * "Imóveis". Cada linha junta os imóveis que estão no filtro de agora: quantos
 * são, a faixa de preço, o m² do meio e quantos são de particular. Tocar na
 * linha volta pra aba Imóveis mostrando só os daquele nome.
 *
 * As linhas chegam prontas (agrupadas, filtradas e ordenadas pelo Painel);
 * aqui fica só a tela: o campo de procurar, a ordem e a lista.
 */
import React, { useEffect, useRef, useState } from 'react';
import { CHAVE_DO_GRUPO, GRUPO_PLURAL, curto, num, nz, type LinhaGrupo, type OrdemGrupo, type TipoGrupo } from '@/lib/captacaoPenha';
import { campoCls } from './Filtros';
import type { Ir } from './Cartao';

function faixaDePreco(r: LinhaGrupo): string {
  if (r.pmin == null) return '–';
  return r.pmin === r.pmax ? curto(r.pmin) : curto(r.pmin) + ' a ' + curto(r.pmax);
}
const miudo = 'ml-1.5 inline text-[12px] text-text-secondary md:ml-0 md:block';

export default function Grupos({ tipo, linhas, ordem, aoProcurar, aoOrdenar, ir }: {
  tipo: TipoGrupo;
  /** só as que cabem na tela agora (o "Mostrar mais" fica com o Painel) */
  linhas: LinhaGrupo[];
  ordem: OrdemGrupo;
  /** o que se digitou, já sem acento */
  aoProcurar: (q: string) => void;
  aoOrdenar: (o: OrdemGrupo) => void;
  ir: Ir;
}) {
  const [texto, setTexto] = useState('');
  const relogio = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(relogio.current), []);

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap gap-2">
        <input
          type="search"
          value={texto}
          onChange={(e) => { const v = e.target.value; setTexto(v); clearTimeout(relogio.current); relogio.current = setTimeout(() => aoProcurar(nz(v.trim())), 250); }}
          placeholder={`Procurar em ${GRUPO_PLURAL[tipo]}…`}
          aria-label="Procurar"
          className={`${campoCls} flex-1 basis-60`}
        />
        <select value={ordem} onChange={(e) => aoOrdenar(e.target.value as OrdemGrupo)} aria-label="Ordenar" className={`${campoCls} !w-auto flex-none`}>
          <option value="n">Com mais imóveis</option>
          <option value="nome">Por nome</option>
          <option value="own">Com mais anúncios de particular</option>
          <option value="pmed">Maior preço</option>
        </select>
      </div>

      {linhas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-[14px] text-text-secondary">Nada com esse nome nos filtros de agora.</div>
      ) : (
        <div className="al-card flex flex-col overflow-hidden !rounded-2xl">
          {linhas.map((r) => {
            const nome = r.none ? (tipo === 'emp' ? 'Sem prédio identificado' : 'Construtora não identificada') : r.key;
            return (
              <button key={r.key} type="button" onClick={() => ir(CHAVE_DO_GRUPO[tipo], r.key)} title={`Ver os imóveis: ${nome}`}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 border-b border-white/[0.07] px-3.5 py-2.5 text-left text-[13.5px] text-white last:border-b-0 hover:bg-[#FF1E56]/[0.08] md:grid-cols-[minmax(0,2.2fr)_84px_minmax(0,1.3fr)_minmax(0,1.2fr)]">
                <span className="min-w-0">
                  <b className={`break-words ${r.none ? 'font-medium text-text-secondary' : 'font-semibold text-[#FFE9A6]'}`}>{nome}</b>
                  <small className="block break-words text-[12px] text-text-secondary">{r.sub}</small>
                </span>
                <span className="text-right md:text-left">
                  <b className="al-display text-[19px] font-bold leading-none tabular-nums">{num(r.n)}</b>
                  <small className="block text-[12px] text-text-secondary">{r.n === 1 ? 'imóvel' : 'imóveis'}</small>
                </span>
                <span className="col-span-2 min-w-0 md:col-span-1">
                  {faixaDePreco(r)}
                  <small className={miudo}>{r.m2 ? 'R$ ' + num(Math.round(r.m2)) + '/m² no meio' : ''}</small>
                </span>
                <span className="col-span-2 min-w-0 md:col-span-1">
                  {tipo === 'imob' ? (
                    <>{r.solo || 0} só com ela<small className={miudo}>{r.n - (r.solo || 0)} divididos com outras</small></>
                  ) : (
                    <>{r.imob || 0}{r.imob === 1 ? ' imobiliária' : ' imobiliárias'}<small className={miudo}>{r.own ? r.own + (r.own === 1 ? ' de particular' : ' de particulares') : 'nenhum de particular'}</small></>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
