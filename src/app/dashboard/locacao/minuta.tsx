'use client';

/**
 * FUNIL 2 · A MINUTA — o contrato preenchido, na tela, como sairia da ClickSign.
 *
 * O gestor pediu: "gera contrato fake pra sabermos como seria". Este
 * componente pega os dados da locação (inquilino) e do imóvel (dono) e monta
 * o documento inteiro — papel branco, cláusulas, lacunas preenchidas — pra
 * ele VER o produto final antes de existir jurídico e assinatura digital.
 *
 * Duas verdades gravadas no próprio papel:
 *   · a tarja de MINUTA DE DEMONSTRAÇÃO em cima — este texto não foi
 *     revisado por advogado e não vale juridicamente;
 *   · quando o modelo do jurídico virar template na ClickSign, é ELE que
 *     preenche estas mesmas lacunas — este preview vira espelho do real.
 *
 * As cláusulas refletem as decisões da esteira: condomínio pago pelo
 * locatário DIRETO à administradora, IPTU reembolsado na cobrança,
 * garantia Loft com renovação anual, taxa só sobre o aluguel.
 */
import React from 'react';
import { fimContrato, fmtData, fmtValor, DADOS_IMOBILIARIA, type Locacao, type ImovelLocacao } from '@/lib/locacao';
import { btnOuro, btnGhost } from './ui';

const porExtensoMeses = (m: number | null): string =>
  m ? `${m} (${m === 30 ? 'trinta' : m === 12 ? 'doze' : m === 24 ? 'vinte e quatro' : m === 36 ? 'trinta e seis' : m}) meses` : '____ meses';

function Lacuna({ v, largura = 'min-w-[120px]' }: { v?: string | null; largura?: string }) {
  return v
    ? <b>{v}</b>
    : <span className={`inline-block border-b border-neutral-400 ${largura} align-baseline text-neutral-400 text-center text-[10px]`}>a preencher</span>;
}

export default function MinutaContrato({ l, imovel, onFechar }: {
  l: Locacao;
  imovel?: ImovelLocacao;
  onFechar: () => void;
}) {
  const endereco = imovel
    ? `${[imovel.rua, imovel.numero].filter(Boolean).join(', ')}${imovel.complemento ? `, ${imovel.complemento}` : ''}, ${imovel.bairro}, ${imovel.cidade}${imovel.cep ? `, CEP ${imovel.cep}` : ''}`
    : '';
  const aluguel = l.valorAluguel;
  const iptu = l.valorIptuMensal || 0;
  const seguro = l.valorSeguroIncendio || 0;
  const totalBoleto = (aluguel || 0) + iptu + seguro;

  return (
    <div className="rounded-xl overflow-hidden border border-white/15">
      {/* barra de controle — some na impressão */}
      <div className="flex flex-wrap items-center gap-2 bg-white/[0.04] px-4 py-2.5 no-print">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-300">
          ⚡ Minuta de demonstração — o modelo oficial virá do jurídico, via ClickSign
        </span>
        <span className="ml-auto flex gap-2">
          <button onClick={() => window.print()} className={btnOuro}>🖨 Imprimir / PDF</button>
          <button onClick={onFechar} className={btnGhost}>fechar</button>
        </span>
      </div>

      {/* o papel */}
      <div id="minuta-print" className="bg-white text-neutral-900 px-6 sm:px-10 py-8 text-[12.5px] leading-relaxed font-serif">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden; }
            #minuta-print, #minuta-print * { visibility: visible; }
            #minuta-print { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
            @page { size: A4 portrait; margin: 18mm 20mm; }
          }
        `}} />

        <p className="text-center text-[10px] font-bold tracking-[0.3em] uppercase text-red-600 border border-red-300 rounded py-1 mb-6">
          Minuta de demonstração · sem validade jurídica · aguardando modelo do jurídico
        </p>

        <h1 className="text-center text-[16px] font-bold uppercase tracking-wide mb-6">
          Contrato de Locação Residencial
        </h1>

        <p className="mb-3">
          <b>LOCADOR(A):</b> <Lacuna v={imovel?.donoNome} largura="min-w-[220px]" />,
          {' '}<Lacuna v={imovel?.donoEstadoCivil} largura="min-w-[80px]" />, <Lacuna v={imovel?.donoProfissao} largura="min-w-[100px]" />,
          {' '}portador(a) do CPF nº <Lacuna v={imovel?.donoDoc} /> e RG nº <Lacuna v={imovel?.donoRg} largura="min-w-[90px]" />,
          {' '}residente em <Lacuna v={imovel?.donoEndereco} largura="min-w-[200px]" />.
        </p>
        <p className="mb-3">
          <b>LOCATÁRIO(A):</b> <Lacuna v={l.nome} largura="min-w-[220px]" />,
          {' '}<Lacuna v={l.estadoCivil} largura="min-w-[80px]" />, <Lacuna v={l.profissao} largura="min-w-[100px]" />,
          {' '}portador(a) do CPF nº <Lacuna v={l.doc} /> e RG nº <Lacuna v={l.rg} largura="min-w-[90px]" />,
          {' '}telefone <Lacuna v={l.telefone} largura="min-w-[110px]" />, e-mail <Lacuna v={l.email} largura="min-w-[140px]" />.
        </p>
        <p className="mb-5">
          <b>ADMINISTRADORA:</b> <b>{DADOS_IMOBILIARIA.razao}</b>, CNPJ {DADOS_IMOBILIARIA.cnpj},
          {' '}{DADOS_IMOBILIARIA.creci}, com sede em {DADOS_IMOBILIARIA.endereco}, que administra a
          presente locação por conta e ordem do LOCADOR, nos termos do contrato de administração
          firmado entre as partes.
        </p>

        <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 1ª — Do imóvel</h2>
        <p>
          O LOCADOR dá em locação ao LOCATÁRIO o imóvel {imovel?.tipo ? <b>{imovel.tipo.toLowerCase()}</b> : 'residencial'} situado
          em <Lacuna v={endereco} largura="min-w-[280px]" />{imovel?.codigo ? <> (ref. <b>{imovel.codigo}</b>)</> : null},
          destinado exclusivamente a fins residenciais.
        </p>

        <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 2ª — Do prazo</h2>
        <p>
          A locação vigorará por <b>{porExtensoMeses(l.prazoMeses)}</b>, com início
          em <Lacuna v={l.inicio ? fmtData(l.inicio) : ''} /> e término
          em <Lacuna v={fimContrato(l) ? fmtData(fimContrato(l)) : ''} />, quando o LOCATÁRIO
          se obriga a restituir o imóvel nas condições registradas no laudo de vistoria de entrada,
          que integra este contrato como anexo.
        </p>

        <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 3ª — Do aluguel e encargos</h2>
        <p className="mb-2">
          O aluguel mensal é de <b>{aluguel ? fmtValor(aluguel) : 'R$ ______'}</b>, com vencimento todo
          dia <Lacuna v={l.diaVencimento ? String(l.diaVencimento) : ''} largura="min-w-[36px]" />, pago por
          boleto/PIX emitido pela ADMINISTRADORA, acrescido de:
        </p>
        <p className="mb-1 pl-5">
          <b>a)</b> IPTU, na fração mensal de {iptu ? <b>{fmtValor(iptu)}</b> : 'R$ ______'}, a título de
          reembolso ao LOCADOR, a quem incumbe o recolhimento junto à Prefeitura;
        </p>
        <p className="mb-1 pl-5">
          <b>b)</b> seguro incêndio, na fração mensal de {seguro ? <b>{fmtValor(seguro)}</b> : 'R$ ______'};
        </p>
        <p className="mb-2 pl-5">
          <b>c)</b> totalizando a cobrança mensal de <b>{totalBoleto ? fmtValor(totalBoleto) : 'R$ ______'}</b>.
        </p>
        <p>
          <b>Parágrafo único.</b> A taxa de condomínio{l.valorCondominio ? <> (atualmente {fmtValor(l.valorCondominio)})</> : null} será
          paga pelo LOCATÁRIO <b>diretamente à administradora do condomínio</b>, não integrando a cobrança
          acima, respondendo o LOCATÁRIO pela pontualidade desse pagamento.
        </p>

        <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 4ª — Do reajuste</h2>
        <p>
          O aluguel será reajustado anualmente pela variação do índice <b>{l.indiceReajuste || 'IGP-M'}</b>,
          ou, na sua extinção, pelo índice oficial que o substituir.
        </p>

        <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 5ª — Da garantia</h2>
        <p>
          A presente locação é garantida por <b>{l.garantiaTipo || 'seguro-fiança'}</b>
          {l.garantiaNumero ? <>, apólice nº <b>{l.garantiaNumero}</b></> : null}, com vigência
          atrelada a este contrato e renovação automática junto com ele enquanto durar a locação,
          respondendo a garantidora pelos aluguéis e encargos inadimplidos na forma das condições
          da garantia.
        </p>

        <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 6ª — Da conservação e vistorias</h2>
        <p>
          O LOCATÁRIO recebe o imóvel no estado descrito no <b>laudo de vistoria de entrada</b>, assinado
          pelas partes, e se obriga a restituí-lo no mesmo estado, ressalvado o desgaste natural. A
          vistoria de saída, realizada na desocupação, será confrontada com a de entrada para eventual
          acerto de reparos.
        </p>

        <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 7ª — Da rescisão</h2>
        <p>
          A infração de qualquer cláusula sujeita a parte infratora à multa de 3 (três) aluguéis vigentes,
          proporcional ao período restante do contrato, sem prejuízo das demais cominações legais
          (Lei nº 8.245/91).
        </p>

        <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 8ª — Do foro</h2>
        <p>
          Fica eleito o foro da comarca do imóvel para dirimir quaisquer controvérsias oriundas deste
          contrato.
        </p>

        <p className="mt-8 mb-10">
          E por estarem justos e contratados, firmam o presente em meio eletrônico, por intermédio da
          plataforma de assinatura digital, juntamente com as testemunhas abaixo.
        </p>

        <div className="grid grid-cols-2 gap-x-10 gap-y-10 text-center text-[11px]">
          <div><div className="border-t border-neutral-500 pt-1">{imovel?.donoNome || 'LOCADOR(A)'}</div>Locador(a)</div>
          <div><div className="border-t border-neutral-500 pt-1">{l.nome || 'LOCATÁRIO(A)'}</div>Locatário(a)</div>
          <div><div className="border-t border-neutral-500 pt-1">Nox Imóveis</div>Administradora</div>
          <div><div className="border-t border-neutral-500 pt-1">&nbsp;</div>Testemunha</div>
        </div>

        <p className="text-center text-[9px] text-neutral-400 mt-10">
          Minuta gerada pelo sistema Nox · {new Date().toLocaleDateString('pt-BR')} · na versão final, este
          documento nasce do modelo do jurídico com estas mesmas lacunas e é assinado via ClickSign (WhatsApp)
        </p>
      </div>
    </div>
  );
}
