'use client';

/**
 * CRONOGRAMA DO PESSOAL — a agenda de ação do pré-lançamento Ayra.
 *
 * O texto é o do PDF aprovado ("Agenda de acao - Ayra (18-09 a 30-10).pdf"),
 * palavra por palavra, só que escrito na tela: lê no celular sem abrir
 * arquivo. As duas páginas do PDF viram as duas partes daqui — por isso o
 * "roteiro na página 2" continua fazendo sentido. O PDF original fica pra
 * baixar, pra quem quiser imprimir.
 *
 * Roteiros da página 2 reescritos em 15/09/2026. O PDF é gerado da fonte
 * (Desktop/Apresentação Santer/fonte/agenda.py): mudou roteiro aqui, muda lá
 * e regera o PDF — senão quem baixa leva o texto velho.
 */
import React from 'react';
import { AYRA_AGENDA_PDF, AYRA_AGENDA_PDF_NOME } from '@/lib/ayra';

/** O negrito do PDF. */
const B = ({ children }: { children: React.ReactNode }) => <b className="font-semibold text-white">{children}</b>;
/** O destaque roxo do PDF (as regras de tentativa). */
const R = ({ children }: { children: React.ReactNode }) => <b className="font-semibold text-[#C4A6FF]">{children}</b>;

interface Linha {
  dia: string;
  mes: string;
  rotulo?: string;
  titulo: string;
  itens: React.ReactNode[];
  /** as datas-marco, destacadas no PDF */
  marco?: boolean;
}

const LINHAS: Linha[] = [
  {
    dia: '18–25', mes: 'set', titulo: 'Ligações', itens: [
      <>Ligar para a <B>lista de pessoas separadas</B>. Quando a lista pessoal acabar, pegar a <B>lista de ligação ativa</B>.</>,
      <R>2 tentativas por contato, em 2 dias.</R>,
      <><R>Dia 1:</R> 1 ligação. Não atendeu → <B>áudio de até 40 segundos</B> (roteiro na página 2).</>,
      <><R>Dia 2:</R> mais 1 ligação para quem não atendeu. Não atendeu de novo → <B>mensagem escrita</B> (roteiro na página 2).</>,
      <><B>Se atender:</B> apresentar o material de aquecimento, <B>marcar e confirmar o meet</B>. Não enviar material.</>,
      <>Nesse período já começam a acontecer os primeiros meets.</>,
    ],
  },
  {
    dia: '26–30', mes: 'set', titulo: 'Ligações + imagens para quem não atendeu', itens: [
      <>Seguem as <B>ligações</B> e os <B>meets</B>.</>,
      <><B>Enviar imagens</B> para as pessoas que não atenderam, para trazer mais uma leva de clientes.</>,
      <>A orientação de <B>quando e quais imagens enviar</B> vem da coordenação.</>,
    ],
  },
  { dia: '01', mes: 'out', titulo: 'Evento de pré-lançamento', itens: [], marco: true },
  {
    dia: '02–14', mes: 'out', titulo: 'Segundo meet com os interessados', itens: [
      <>Marcar o <B>segundo meet</B>, mostrando os materiais e preparando o cliente para o pré-lançamento do dia 15.</>,
      <>Nesse prazo: <B>angariar os documentos</B> e os clientes interessados em pegar a <B>pasta ouro</B>.</>,
      <>Quem não tiver meet nem cliente aquecido continua buscando <B>novos clientes em listas e ações</B>.</>,
    ],
  },
  { dia: '15', mes: 'out', titulo: 'Pré-cadastros', itens: [], marco: true },
  {
    dia: '16', mes: 'out →', rotulo: 'até o lançamento', titulo: 'Manutenção e prospecção', itens: [
      <>Manter aquecidos os clientes que já fizeram a <B>pré-reserva</B>.</>,
      <>Trabalhar os <B>indecisos</B>.</>,
      <>Seguir <B>prospectando novos clientes</B>.</>,
    ],
  },
];

/** Na ligação: a hora de parar e deixar o cliente falar. */
const Pausa = ({ children }: { children: React.ReactNode }) => (
  <span className="block my-2 text-[12px] italic text-text-secondary">{children}</span>
);

const ROTEIROS: { titulo: string; texto: React.ReactNode; nota: string }[] = [
  {
    titulo: '1 · Ligação (quando atende)',
    texto: (
      <>
        &quot;Oi, [nome], tudo bem? É o [seu nome], aqui de Penha, SC.&quot;
        <Pausa>(ele responde)</Pausa>
        &quot;Estou te retornando porque você tinha se cadastrado numa campanha nossa a respeito de imóveis, tá lembrado?&quot;
        <Pausa>(ele responde)</Pausa>
        &quot;Te liguei porque tô com uma <B>baita novidade pra te contar em primeira mão</B>: um projeto que estamos aguardando há 2 anos e, pela parceria que temos com a construtora, estamos recebendo antecipado, para que nossos clientes consigam se planejar da melhor maneira. <B>Tu tem interesse em receber todas as informações que forem saindo em primeira mão?</B>&quot;
        <Pausa>(ele demonstra interesse)</Pausa>
        &quot;É um <B>bairro inteiro planejado entre o Beto Carrero e a praia</B>. Realmente, pensando em investimento, hoje não tenho nem de perto nada melhor. Nossa imobiliária separou um <B>material exclusivo</B> com as principais informações, para que você consiga começar a avaliar desde já. <B>Conseguimos marcar pra te passar esses dados?</B>&quot;
        <Pausa>(ele responde)</Pausa>
        &quot;Perfeito, vamos deixar combinado então. <B>Qual o melhor horário pra eu te passar isso?</B>&quot;
      </>
    ),
    nota: 'Havendo interesse: apresentar o material de aquecimento e marcar o meet.',
  },
  {
    titulo: '2 · Áudio de até 40 segundos (não atendeu no dia 1)',
    texto: (
      <>
        &quot;Oi, [nome], tudo bem? É o [seu nome], aqui de Penha, SC. Estou te retornando porque você tinha se cadastrado numa campanha nossa de imóveis. Tô com uma <B>baita novidade pra te contar em primeira mão</B>: um projeto que estamos aguardando há 2 anos e, pela parceria com a construtora, estamos recebendo antecipado. É um <B>bairro inteiro planejado entre o Beto Carrero e a praia</B>. Pensando em investimento, hoje não tenho nem de perto nada melhor. Separamos um <B>material exclusivo</B>. <B>Me diz o melhor horário pra eu te passar.</B> Abraço!&quot;
      </>
    ),
    nota: 'Cerca de 90 palavras = 39 segundos. Gravar logo depois da ligação.',
  },
  {
    titulo: '3 · Mensagem escrita (não atendeu no dia 2)',
    texto: (
      <>
        Oi, [nome], tudo bem? É o [seu nome], aqui de Penha, SC.
        <br />
        Estou te retornando porque você tinha se cadastrado numa campanha nossa de imóveis.
        <br />
        Tô com uma <B>baita novidade pra te contar em primeira mão</B>: um projeto que estamos aguardando há 2 anos e, pela parceria com a construtora, estamos recebendo antecipado.
        <br />
        É um <B>bairro inteiro planejado entre o Beto Carrero e a praia</B>. Pensando em investimento, hoje não tenho nem de perto nada melhor.
        <br />
        Separamos um <B>material exclusivo</B>. <B>Me diz o melhor horário pra eu te passar.</B> Abraço!
      </>
    ),
    nota: 'O mesmo texto do áudio do dia anterior, por escrito.',
  },
];

/** O cabeçalho de cada página, como no PDF. */
function Cabecalho({ titulo, comDownload = false }: { titulo: string; comDownload?: boolean }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 pb-4 border-b border-white/[0.08]">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-text-secondary">
          <span className="text-[#E8CF8A]">Ayra</span> · Nox Imóveis × Santer · uso interno
        </p>
        <h2 className="al-display text-[22px] font-bold text-white uppercase tracking-[0.1em] mt-1">{titulo}</h2>
      </div>
      {comDownload && (
        <a
          href={AYRA_AGENDA_PDF}
          download={AYRA_AGENDA_PDF_NOME}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold text-text-secondary border border-white/10 bg-white/[0.04] hover:text-white hover:bg-white/[0.08] transition-colors"
          title="O PDF aprovado, pra imprimir"
        >
          ⬇ Baixar PDF
        </a>
      )}
    </header>
  );
}

function Rodape({ pagina }: { pagina: number }) {
  return (
    <footer className="flex justify-between gap-3 px-5 py-2.5 border-t border-white/[0.08] text-[10px] uppercase tracking-[0.1em] text-text-secondary">
      <span><b className="text-[#C4A6FF]">Agenda de pré-lançamento</b> · 18/09 a 30/10/2026</span>
      <span className="tabular-nums">{pagina} / 2</span>
    </footer>
  );
}

export default function Cronograma() {
  return (
    <div className="max-w-4xl space-y-4">
      {/* ── página 1 · agenda de ação ── */}
      <section className="al-card relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 gx-line-gold" />
        <Cabecalho titulo="Agenda de ação" comDownload />
        <ol className="py-1">
          {LINHAS.map((l, k) => (
            <li
              key={k}
              className={l.marco
                ? 'mx-3 my-2 grid grid-cols-[76px_1fr] sm:grid-cols-[92px_1fr] gap-4 items-center rounded-xl border border-[#C9A54A]/45 bg-gradient-to-r from-[#4A137F]/50 via-[#2B0B4E]/30 to-transparent px-4 py-3.5'
                : 'grid grid-cols-[76px_1fr] sm:grid-cols-[92px_1fr] gap-4 px-5 py-4 border-b border-white/[0.06] last:border-b-0'}
            >
              <div>
                <p className="al-display text-[21px] font-bold leading-none text-[#E8CF8A] tabular-nums whitespace-nowrap">{l.dia}</p>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mt-1">{l.mes}</p>
                {l.rotulo && <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-secondary/80 mt-0.5 leading-tight">{l.rotulo}</p>}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-white leading-snug">{l.titulo}</p>
                {l.itens.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {l.itens.map((it, j) => (
                      <li key={j} className="relative pl-4 text-[13px] leading-relaxed text-white/75">
                        <span className="absolute left-0 top-[0.6em] h-1.5 w-1.5 rounded-full bg-[#C9A54A]" />
                        {it}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
        <Rodape pagina={1} />
      </section>

      {/* ── página 2 · roteiros ── */}
      <section className="al-card relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 gx-line-gold" />
        <Cabecalho titulo="Roteiros" />
        <div className="px-5 py-4 space-y-5">
          {ROTEIROS.map((r) => (
            <div key={r.titulo}>
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#C4A6FF] mb-2">{r.titulo}</h3>
              <div className="rounded-r-xl border-l-[3px] border-[#C9A54A] bg-white/[0.04] px-4 py-3.5 text-[13.5px] leading-relaxed text-white/80">
                {r.texto}
                <p className="mt-3 pt-2.5 border-t border-white/[0.08] text-[12px] text-text-secondary">{r.nota}</p>
              </div>
            </div>
          ))}
        </div>
        <Rodape pagina={2} />
      </section>
    </div>
  );
}
