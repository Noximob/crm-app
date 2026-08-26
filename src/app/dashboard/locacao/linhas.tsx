'use client';

/**
 * O MODO LISTA — uma linha por registro, pros dois funis.
 *
 * O cartão é ótimo pra dez imóveis e péssimo pra oitenta: cada um ocupa
 * meia tela, e achar o "LOC-047" vira rolar o dedo até cansar. A linha
 * carrega o mínimo pra RECONHECER (código/nome, imóvel, valor), o mínimo
 * pra PRIORIZAR (etapa e os alertas contados) e — o que nenhuma lista
 * costuma ter — o BOTÃO DA VEZ, o mesmo do cartão. Dá pra tocar a operação
 * inteira sem abrir nada.
 *
 * Clicar no nome abre o cartão cheio ali mesmo; o ▾ faz o mesmo pra quem
 * procura um botão. A borda dourada à esquerda é o "está na sua mão".
 *
 * Mora fora da página por causa da bancada: /preview-locacao monta estas
 * mesmas linhas com dados de mentira, então o layout se confere com os
 * olhos em vez de ler JSX.
 */
import React from 'react';
import {
  ETAPAS_IMOVEL, ETAPAS_LOCACAO, fmtValor,
  type ImovelLocacao, type Locacao,
} from '@/lib/locacao';
import { btnGhost } from './ui';

/**
 * COLUNAS DE VERDADE, não flex solto.
 *
 * Com flex-wrap cada linha punha a etapa num x diferente, conforme o
 * comprimento do título — e uma lista de colunas tortas é ilegível: o olho
 * tem que reler tudo em vez de descer reto. Grade fixa resolve: nome
 * elástico, etapa sempre no mesmo lugar, alertas numa coluna estreita que
 * existe mesmo vazia, e a ação numa coluna de largura FIXA.
 *
 * A largura fixa da última coluna é o detalhe que faz a lista funcionar: se
 * ela fosse "auto", cada botão de tamanho diferente empurraria as colunas
 * anteriores e nada ficaria no mesmo x — foi o que aconteceu na primeira
 * tentativa. Ação larga demais (a de marcar a entrega das chaves, com data
 * e hora) quebra dentro da própria célula, crescendo só aquela linha.
 *
 * Abaixo de 640px vira empilhado — em celular coluna nenhuma cabe.
 */
const linhaCls = (destacada: boolean) =>
  `al-card px-3 py-2 border-l-2 grid items-center gap-x-3 gap-y-1
   grid-cols-1 sm:grid-cols-[minmax(0,1fr)_116px_52px_216px] ${
    destacada ? 'border-l-[#E8C547]' : 'border-l-transparent'}`;

/** A etapa, no mesmo lugar em toda linha — é por ela que o olho varre. */
function Etapa({ icone, rotulo, ajuda }: { icone?: string; rotulo?: string; ajuda?: string }) {
  return (
    <span className="text-[10.5px] font-bold text-text-secondary truncate" title={ajuda}>
      {icone} {rotulo}
    </span>
  );
}

/** A ação da vez e o ▾, juntos e encostados na direita. */
function Acoes({ acao, onAbrir }: { acao: React.ReactNode; onAbrir: () => void }) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5 min-w-0">
      <span className="scale-[0.92] origin-right min-w-0">{acao}</span>
      <button onClick={onAbrir} className={btnGhost + ' !py-1 !px-2 !text-[11px] shrink-0'} title="abrir o cartão">▾</button>
    </span>
  );
}

export function LinhaImovel({ i, alertas, minhaVez, acao, onAbrir }: {
  i: ImovelLocacao;
  /** os textos dos alertas — contados aqui, lidos no title */
  alertas: { texto: string; grave: boolean }[];
  minhaVez: boolean;
  acao: React.ReactNode;
  onAbrir: () => void;
}) {
  const d = ETAPAS_IMOVEL[i.etapa];
  const grave = alertas.some((a) => a.grave);
  return (
    <div className={linhaCls(minhaVez)}>
      <button onClick={onAbrir} className="min-w-0 text-left group">
        <p className="text-[12.5px] font-bold text-white truncate">
          <span className="text-[#E8C547]/70 mr-1.5">{i.codigo}</span>
          <span className="group-hover:underline">{i.titulo || '(sem título)'}</span>
        </p>
        <p className="text-[10.5px] text-text-secondary truncate">
          {[i.bairro, i.donoNome, i.aluguel ? fmtValor(i.aluguel) : null].filter(Boolean).join(' · ')}
        </p>
      </button>
      <Etapa icone={d?.icone} rotulo={d?.rotulo} ajuda={d?.ajuda} />
      <span className={`text-[10.5px] font-extrabold ${grave ? 'text-rose-300' : 'text-amber-300'}`}
        title={alertas.map((a) => a.texto).join(' · ')}>
        {alertas.length > 0 && <>{grave ? '🚨' : '⚠'} {alertas.length}</>}
      </span>
      <Acoes acao={acao} onAbrir={onAbrir} />
    </div>
  );
}

export function LinhaLocacao({ l, imovel, atrasadas, chamados, alertas, minhaVez, acao, onAbrir }: {
  l: Locacao;
  imovel?: { codigo: string; titulo: string };
  /** quantas competências vencidas — o número que interrompe o dia */
  atrasadas: number;
  chamados: number;
  alertas: { texto: string }[];
  minhaVez: boolean;
  acao: React.ReactNode;
  onAbrir: () => void;
}) {
  const d = ETAPAS_LOCACAO[l.etapa];
  return (
    <div className={linhaCls(minhaVez)}>
      <button onClick={onAbrir} className="min-w-0 text-left group">
        <p className="text-[12.5px] font-bold text-white truncate group-hover:underline">{l.nome}</p>
        <p className="text-[10.5px] text-text-secondary truncate">
          {[imovel ? `${imovel.codigo} · ${imovel.titulo}` : 'imóvel removido',
            l.valorAluguel ? `${fmtValor(l.valorAluguel)}/mês` : null].filter(Boolean).join(' · ')}
        </p>
      </button>
      <Etapa icone={d?.icone} rotulo={d?.rotulo} ajuda={d?.ajuda} />
      {/* dinheiro atrasado vem primeiro: é o que interrompe o dia */}
      <span className="flex flex-wrap gap-x-1.5 text-[10.5px] font-extrabold leading-tight">
        {atrasadas > 0 && <span className="text-rose-300" title={`${atrasadas} competência(s) em atraso`}>🚨 {atrasadas}</span>}
        {chamados > 0 && <span className="text-rose-300" title="manutenção aberta">🔧 {chamados}</span>}
        {alertas.length > 0 && <span className="text-amber-300" title={alertas.map((a) => a.texto).join(' · ')}>⚠ {alertas.length}</span>}
      </span>
      <Acoes acao={acao} onAbrir={onAbrir} />
    </div>
  );
}
