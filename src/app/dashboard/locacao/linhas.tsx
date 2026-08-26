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

export type OrdemLista = 'urgencia' | 'nome' | 'valor';

/**
 * A BARRA DA LISTA — as três alavancas que fazem a lista caber na cabeça.
 *
 * Fica sempre visível, inclusive com dois registros. A primeira versão só
 * aparecia acima de 6 e o resultado foi previsível: numa carteira pequena
 * ninguém descobria que as alavancas existem, e quando a carteira crescesse
 * elas apareceriam do nada. Ferramenta escondida é ferramenta que não
 * existe — e com dois registros ela não atrapalha nada.
 */
export function BarraDaLista({
  funil, quantosMinhaVez, soMinhaVez, onMinhaVez, ordem, onOrdem, compacto, onCompacto,
}: {
  funil: 'imoveis' | 'locacoes';
  quantosMinhaVez: number;
  soMinhaVez: boolean;
  onMinhaVez: (v: boolean) => void;
  ordem: OrdemLista;
  onOrdem: (o: OrdemLista) => void;
  compacto: boolean;
  onCompacto: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 -mt-1">
      <button onClick={() => onMinhaVez(!soMinhaVez)}
        className={soMinhaVez
          ? 'px-3 py-1.5 rounded-xl text-[11.5px] font-bold border border-[#E8C547]/50 bg-[#E8C547]/15 text-[#FFE9A6]'
          : btnGhost + ' !py-1.5 !text-[11.5px]'}
        title="esconde quem está esperando o dono, a Loft ou os portais">
        🔔 minha vez ({quantosMinhaVez})
      </button>

      <span className="inline-flex items-center gap-1.5">
        <span className="text-[11px] text-text-secondary">ordenar</span>
        <select value={ordem} onChange={(e) => onOrdem(e.target.value as OrdemLista)}
          className="px-2 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-[11.5px] text-white/85 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40">
          <option value="urgencia">pela etapa (urgência)</option>
          <option value="nome">{funil === 'imoveis' ? 'por imóvel (A→Z)' : 'por inquilino (A→Z)'}</option>
          <option value="valor">pelo aluguel (maior→menor)</option>
        </select>
      </span>

      <span className="ml-auto inline-flex rounded-xl border border-white/10 overflow-hidden">
        {([[false, '▦ cartões'], [true, '▤ lista']] as const).map(([v, rot]) => (
          <button key={rot} onClick={() => onCompacto(v)}
            className={`px-2.5 py-1.5 text-[11.5px] font-bold transition-colors ${compacto === v
              ? 'bg-[#E8C547]/15 text-[#FFE9A6]' : 'text-text-secondary hover:text-white hover:bg-white/[0.06]'}`}>
            {rot}
          </button>
        ))}
      </span>
    </div>
  );
}

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
