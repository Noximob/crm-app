'use client';

/**
 * LOCAÇÃO · os blocos visuais compartilhados pelas abas.
 *
 * A regra da casa: tudo que é SIMULAÇÃO se veste de simulação (âmbar, raio,
 * palavra escrita). O gestor nunca pode confundir um botão de teste com um
 * botão que move dinheiro de verdade — quando o Asaas/ClickSign/Loft
 * conectarem, os botões âmbar somem e os estados passam a ser movidos pelos
 * webhooks.
 */
import React, { useState } from 'react';
import { ehArquivoTeste, textoDocTeste, type Arquivo } from '@/lib/locacao';

export const inputCls ='w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[13px] placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40';
export const btnOuro = 'px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#181203] bg-gradient-to-r from-[#E8C547] to-[#C89210] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40';
export const btnGhost = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-white/10 bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40';
/** ação de simulação: âmbar e explícita — some quando a integração real ligar */
export const btnSimula = 'px-3 py-2 rounded-xl text-[12px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-40';
export const rotCls = 'text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary block mb-1';

export const pillCls = (ativo: boolean) => `px-4 py-1.5 rounded-full text-[12px] font-extrabold uppercase tracking-wider border transition-colors ${
  ativo ? 'bg-gradient-to-r from-[#E8C547] to-[#C89210] border-[#E8C547]/60 text-[#181203]' : 'border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white'
}`;

export const Campo = ({ rot, children, largura = '' }: { rot: string; children: React.ReactNode; largura?: string }) => (
  <div className={largura}><label className={rotCls}>{rot}</label>{children}</div>
);

/** número de input de texto: vazio = null, vírgula vale como decimal */
export const num = (s: string): number | null => {
  const t = s.replace(/\./g, '').replace(',', '.').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export function Marcaveis({ opcoes, sel, onSel }: { opcoes: readonly string[]; sel: string[]; onSel: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const on = sel.includes(o);
        return (
          <button key={o} type="button"
            onClick={() => onSel(on ? sel.filter((x) => x !== o) : [...sel, o])}
            className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold border transition-colors ${
              on ? 'bg-[#E8C547]/15 border-[#E8C547]/50 text-[#FFE9A6]' : 'border-white/10 bg-white/[0.03] text-text-secondary hover:text-white'
            }`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** O selo que marca toda ação/estado que ainda é de mentira. */
export function SeloSimulacao({ texto = 'simulação' }: { texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider border bg-amber-500/10 border-amber-500/40 text-amber-300">
      ⚡ {texto}
    </span>
  );
}

export function Tabela({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[11.5px] border-collapse min-w-[560px]">
        <thead>
          <tr>{cols.map((c, i) => (
            <th key={i} className="text-left font-extrabold uppercase tracking-[0.08em] text-[9.5px] text-text-secondary border-b border-white/15 px-2 py-1.5 whitespace-nowrap">{c}</th>
          ))}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const td = 'px-2 py-1.5 border-b border-white/[0.06] align-top';

/** Cartão dobrável — o padrão da área: fechado mostra o resumo, aberto o trabalho. */
export function Dobra({ titulo, sub, chips, aberto0 = false, children }: {
  titulo: React.ReactNode; sub?: React.ReactNode; chips?: React.ReactNode;
  aberto0?: boolean; children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(aberto0);
  return (
    <div className="al-card overflow-hidden">
      <button onClick={() => setAberto((v) => !v)} className="w-full text-left p-4 hover:bg-white/[0.03] transition-colors">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-[13.5px] font-bold text-white">{titulo}</span>
          {chips}
          <span className="ml-auto text-[15px] text-text-secondary shrink-0">{aberto ? '▴' : '▾'}</span>
        </div>
        {sub && <div className="text-[11.5px] text-text-secondary mt-0.5">{sub}</div>}
      </button>
      {aberto && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/**
 * A CHAVE DOS DOIS FUNIS — a pergunta "de que lado eu estou?" respondida
 * de três formas ao mesmo tempo, porque uma só não estava bastando:
 *   · o lado ativo é OURO CHEIO com texto escuro (a linguagem do botão
 *     principal da casa); o outro é plano e apagado, com seta de "vá pra lá";
 *   · logo abaixo, uma faixa escrita "Você está em: 🏠 Funil do Imóvel";
 *   · e o subtítulo diz com QUEM se fala de cada lado.
 */
export function ChaveDosFunis({ funil, onTrocar, imoveis, locacoes }: {
  funil: 'imoveis' | 'locacoes';
  onTrocar: (f: 'imoveis' | 'locacoes') => void;
  imoveis: { total: number; meus: number };
  locacoes: { total: number; meus: number };
}) {
  const lados = [
    { k: 'imoveis' as const, ic: '🏠', t: 'Imóveis', sub: 'com o proprietário', ...imoveis },
    { k: 'locacoes' as const, ic: '🔑', t: 'Locações', sub: 'com o inquilino', ...locacoes },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {lados.map(({ k, ic, t, sub, total, meus }) => {
          const on = funil === k;
          return (
            <button key={k} onClick={() => onTrocar(k)}
              className={`relative rounded-2xl px-3.5 py-3 text-left transition-all overflow-hidden ${
                on
                  ? 'bg-gradient-to-br from-[#E8C547] to-[#C89210] shadow-[0_10px_30px_-12px_rgba(232,197,71,0.7)]'
                  : 'border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}>
              <div className="flex items-baseline gap-2">
                <span className="text-[17px] leading-none">{ic}</span>
                <span className={`al-display text-[15px] font-bold uppercase tracking-[0.1em] ${on ? 'text-[#1a1405]' : 'text-white/70'}`}>{t}</span>
                <span className={`ml-auto text-[19px] font-extrabold tabular-nums leading-none ${on ? 'text-[#1a1405]' : 'text-white/50'}`}>{total}</span>
              </div>
              <p className={`text-[11px] mt-0.5 ${on ? 'text-[#3d3005] font-semibold' : 'text-text-secondary'}`}>{sub}</p>
              <p className={`text-[11px] mt-1 font-bold ${
                on ? (meus ? 'text-[#5c2b00]' : 'text-[#3d3005]/70')
                   : (meus ? 'text-amber-300' : 'text-text-secondary')}`}>
                {meus ? `● ${meus} esperando você` : '○ nada esperando você'}
                {!on && ' →'}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[#E8C547]/25 bg-[#E8C547]/[0.06] px-3.5 py-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#FFE9A6]">Você está em</span>
        <span className="al-display text-[13px] font-bold uppercase tracking-[0.08em] text-white">
          {funil === 'imoveis' ? '🏠 Funil do Imóvel' : '🔑 Funil da Locação'}
        </span>
        <span className="text-[11.5px] text-text-secondary">
          {funil === 'imoveis'
            ? '— captar, documentar o dono, assinar a administração e publicar'
            : '— qualificar, aprovar na Loft, assinar o contrato, entregar a chave e cobrar'}
        </span>
      </div>
    </>
  );
}

/**
 * A gaveta de documentos.
 *
 * Documento de verdade (com URL no Storage) abre num link normal. Documento
 * de TESTE — os que o botão 🧪 cria — não tem arquivo nenhum atrás; em vez
 * de um link morto, abre aqui embaixo um papel dizendo o que estaria ali.
 * Assim dá pra andar a operação inteira sem subir arquivo, e continua óbvio
 * o que é de mentira.
 */
export function ChipsDocumentos({ docs, aoRemover }: {
  docs: Arquivo[];
  aoRemover?: (indice: number) => void;
}) {
  const [vendo, setVendo] = useState<number | null>(null);
  const doc = vendo !== null ? docs[vendo] : null;
  const t = doc ? textoDocTeste(doc.categoria) : null;

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {docs.map((d, n) => {
          const teste = ehArquivoTeste(d);
          const corpo = (
            <>
              {d.categoria && <b className="text-[#FFE9A6]/80 text-[9.5px] uppercase">{d.categoria}</b>}
              {' '}{d.nome}
              {teste && <span className="text-amber-300 text-[9.5px] font-extrabold uppercase ml-1">⚡ teste</span>}
            </>
          );
          const cls = `inline-flex items-center gap-1 text-[11px] rounded-lg px-2 py-1 border ${
            teste ? 'border-amber-500/30 bg-amber-500/[0.06] text-amber-200/80 hover:text-amber-100'
              : 'border-white/10 bg-white/[0.04] text-text-secondary hover:text-white'}`;
          return (
            <span key={n} className="inline-flex items-center gap-1">
              {teste
                ? <button type="button" onClick={() => setVendo(vendo === n ? null : n)} className={cls}>{corpo}</button>
                : <a href={d.url} target="_blank" rel="noreferrer" className={cls}>{corpo}</a>}
              {aoRemover && <button type="button" onClick={() => { setVendo(null); aoRemover(n); }} className="text-rose-300 text-[12px] leading-none">×</button>}
            </span>
          );
        })}
      </div>

      {doc && t && (
        <div className="mt-2 rounded-xl overflow-hidden border border-amber-500/30">
          <div className="flex items-center gap-2 bg-amber-500/[0.08] px-3 py-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-300">
              ⚡ Documento de teste — não existe arquivo no servidor
            </span>
            <button onClick={() => setVendo(null)} className="ml-auto text-[11px] font-bold text-text-secondary hover:text-white">fechar</button>
          </div>
          <div className="bg-white text-neutral-900 px-6 py-6 font-serif">
            <p className="text-center text-[9.5px] font-bold tracking-[0.3em] uppercase text-red-600 border border-red-300 rounded py-1 mb-5">
              Conteúdo de demonstração · sem validade
            </p>
            <h3 className="text-center text-[14px] font-bold uppercase tracking-wide mb-4">{t.titulo}</h3>
            <p className="text-[15px] font-bold text-center mb-4">{t.linhas[0]}</p>
            {t.linhas.slice(1).map((l, i) => (
              <p key={i} className="text-[12px] leading-relaxed text-neutral-700 max-w-[64ch] mx-auto text-center">{l}</p>
            ))}
            <p className="text-center text-[9px] text-neutral-400 mt-6">{doc.nome}</p>
          </div>
        </div>
      )}
    </>
  );
}
