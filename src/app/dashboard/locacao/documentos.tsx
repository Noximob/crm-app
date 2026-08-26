'use client';

/**
 * LOCAÇÃO · OS DOCUMENTOS QUE O SISTEMA MONTA.
 *
 * A regra que o gestor definiu: o contrato já está dentro do sistema — o
 * que o sistema faz é PREENCHER com os dados e documentos que já tem. Nada
 * de redigitar nome, CPF e valor em Word.
 *
 * São três peças, e as três saem daqui prontas para impressão/PDF:
 *
 *   ADMINISTRAÇÃO   o contrato com o DONO, que autoriza a Nox a administrar
 *                   e reter a taxa. Nasce no FUNIL DO IMÓVEL, logo depois
 *                   dos documentos dele.
 *   VISTORIA        o laudo do imóvel, com as fotos do anúncio como registro
 *                   visual. Vai anexo ao contrato de locação, no mesmo
 *                   envelope de assinatura.
 *   PACOTE DA LOFT  a ficha do candidato com os documentos que ele já subiu
 *                   — o mesmo material que instrui o contrato, reaproveitado
 *                   para a análise da garantia. Digitado uma vez só.
 *
 * O contrato de LOCAÇÃO vive em minuta.tsx (é o maior e tem cláusulas
 * próprias). Quando a ClickSign entrar, estes mesmos dados alimentam os
 * templates dela e a assinatura vira automática.
 */
import React from 'react';
import {
  fmtData, fmtValor, custoTotalMensal, lacunasAdministracao, DADOS_IMOBILIARIA,
  type ImovelLocacao, type Locacao,
} from '@/lib/locacao';
import { btnOuro, btnGhost, ChipsDocumentos } from './ui';

const CSS_PAPEL = `
@media print {
  body * { visibility: hidden; }
  #doc-print, #doc-print * { visibility: visible; }
  #doc-print { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  @page { size: A4 portrait; margin: 18mm 20mm; }
}`;

function Papel({ titulo, aviso, children, onFechar }: {
  titulo: string; aviso: string; children: React.ReactNode; onFechar: () => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/15">
      <div className="flex flex-wrap items-center gap-2 bg-white/[0.04] px-4 py-2.5 no-print">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-300">⚡ {aviso}</span>
        <span className="ml-auto flex gap-2">
          <button onClick={() => window.print()} className={btnOuro}>🖨 Imprimir / PDF</button>
          <button onClick={onFechar} className={btnGhost}>fechar</button>
        </span>
      </div>
      <div id="doc-print" className="bg-white text-neutral-900 px-6 sm:px-10 py-8 text-[12.5px] leading-relaxed font-serif">
        <style dangerouslySetInnerHTML={{ __html: CSS_PAPEL }} />
        <p className="text-center text-[10px] font-bold tracking-[0.3em] uppercase text-red-600 border border-red-300 rounded py-1 mb-6">
          Minuta de demonstração · sem validade jurídica · aguardando modelo do jurídico
        </p>
        <h1 className="text-center text-[16px] font-bold uppercase tracking-wide mb-6">{titulo}</h1>
        {children}
        <p className="text-center text-[9px] text-neutral-400 mt-10">
          Gerado pelo sistema Nox · {new Date().toLocaleDateString('pt-BR')} · os dados vêm do cadastro;
          na versão final este documento nasce do modelo do jurídico e é assinado via ClickSign
        </p>
      </div>
    </div>
  );
}

const Lacuna = ({ v }: { v?: string | null }) => v
  ? <b>{v}</b>
  : <span className="inline-block border-b border-neutral-400 min-w-[120px] align-baseline text-neutral-400 text-center text-[10px]">a preencher</span>;

const enderecoDoImovel = (i?: ImovelLocacao) => i
  ? `${[i.rua, i.numero].filter(Boolean).join(', ')}${i.complemento ? `, ${i.complemento}` : ''}, ${i.bairro}, ${i.cidade}${i.cep ? `, CEP ${i.cep}` : ''}`
  : '';

// ---------------------------------------------------------------------------
// 1 · o contrato de ADMINISTRAÇÃO (funil do imóvel, com o dono)
// ---------------------------------------------------------------------------

export function MinutaAdministracao({ imovel, onFechar }: { imovel: ImovelLocacao; onFechar: () => void }) {
  const pct = imovel.taxaAdmPct ?? 10;
  // "vai conseguir preencher com os dados que já tem?" — a resposta, de fora
  const falta = lacunasAdministracao(imovel);
  return (
    <Papel titulo="Contrato de Administração de Imóvel"
      aviso="Minuta gerada do cadastro — vai pro WhatsApp do dono pela ClickSign" onFechar={onFechar}>
      <div className={`no-print mb-5 rounded-lg border px-3 py-2 ${falta.length
        ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-emerald-500 bg-emerald-50 text-emerald-900'}`}>
        {falta.length ? (
          <p className="text-[11px] leading-relaxed">
            <b>{falta.length} {falta.length === 1 ? 'lacuna' : 'lacunas'} em branco</b> — o resto o sistema
            preencheu do cadastro. Falta: {falta.join(', ')}. As linhas pontilhadas abaixo mostram onde.
          </p>
        ) : (
          <p className="text-[11px]"><b>✓ Contrato completo</b> — todos os dados do cadastro entraram. Pode mandar pra assinatura.</p>
        )}
      </div>
      <p className="mb-3">
        <b>PROPRIETÁRIO:</b> <Lacuna v={imovel.donoNome} />, <Lacuna v={imovel.donoEstadoCivil} />,
        {' '}<Lacuna v={imovel.donoProfissao} />, portador do CPF/CNPJ nº <Lacuna v={imovel.donoDoc} /> e
        {' '}RG nº <Lacuna v={imovel.donoRg} />, residente em <Lacuna v={imovel.donoEndereco} />,
        {' '}telefone <Lacuna v={imovel.donoTelefone} />, e-mail <Lacuna v={imovel.donoEmail} />.
      </p>
      <p className="mb-5">
        <b>ADMINISTRADORA:</b> <b>{DADOS_IMOBILIARIA.razao}</b>, inscrita no CNPJ sob
        nº {DADOS_IMOBILIARIA.cnpj}, {DADOS_IMOBILIARIA.creci}, com sede
        em {DADOS_IMOBILIARIA.endereco}, doravante denominada ADMINISTRADORA.
      </p>

      <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 1ª — Do objeto</h2>
      <p>
        O PROPRIETÁRIO autoriza a ADMINISTRADORA a promover a locação e administrar o imóvel situado
        em <Lacuna v={enderecoDoImovel(imovel)} />{imovel.codigo ? <> (ref. <b>{imovel.codigo}</b>)</> : null}, praticando
        todos os atos necessários: divulgação, seleção de interessados, exigência de garantia, vistorias,
        celebração do contrato de locação, cobrança dos aluguéis e encargos e repasse dos valores.
      </p>

      <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 2ª — Da divulgação</h2>
      <p>
        A ADMINISTRADORA divulgará o imóvel nos portais imobiliários e canais próprios, pelo valor de
        aluguel de <b>{fmtValor(imovel.aluguel)}</b>
        {imovel.condominio ? <>, com condomínio de {fmtValor(imovel.condominio)}</> : null}
        {imovel.iptuMensal ? <> e IPTU mensal de {fmtValor(imovel.iptuMensal)}</> : null},
        totalizando {fmtValor(custoTotalMensal(imovel))} para o locatário.
      </p>

      <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 3ª — Da remuneração</h2>
      <p>
        Pela administração, a ADMINISTRADORA fará jus a <b>{pct}% do valor do aluguel</b>, retidos de cada
        pagamento. A taxa incide exclusivamente sobre o aluguel — condomínio, IPTU e seguro não integram
        a base de cálculo.
      </p>

      <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 4ª — Do repasse</h2>
      <p>
        Confirmado o pagamento pelo locatário, a ADMINISTRADORA repassará ao PROPRIETÁRIO, em até 2 (dois)
        dias úteis, o aluguel deduzido da taxa, acrescido do reembolso do IPTU quando houver, mediante PIX
        para a chave <Lacuna v={imovel.donoPix} />, acompanhado de extrato discriminado.
      </p>

      <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 5ª — Das obrigações do proprietário</h2>
      <p>
        O PROPRIETÁRIO declara ser o legítimo titular do imóvel, obriga-se a mantê-lo em condições de uso,
        a arcar com o IPTU e as despesas extraordinárias de condomínio, e a comunicar à ADMINISTRADORA
        qualquer alteração de titularidade, dados bancários ou intenção de venda.
      </p>

      <h2 className="font-bold text-[13px] mt-5 mb-1">Cláusula 6ª — Do prazo</h2>
      <p>
        Este contrato vigora por prazo indeterminado, podendo ser denunciado por qualquer das partes
        mediante aviso prévio de 30 (trinta) dias, respeitados os contratos de locação em vigor, que
        seguirão administrados até o seu término.
      </p>

      <p className="mt-8 mb-10">
        E por estarem justos e contratados, firmam o presente em meio eletrônico, por intermédio de
        plataforma de assinatura digital.
      </p>
      <div className="grid grid-cols-2 gap-x-10 text-center text-[11px]">
        <div><div className="border-t border-neutral-500 pt-1">{imovel.donoNome || 'PROPRIETÁRIO'}</div>Proprietário</div>
        <div><div className="border-t border-neutral-500 pt-1">Nox Imóveis</div>Administradora</div>
      </div>
    </Papel>
  );
}

// ---------------------------------------------------------------------------
// 2 · o LAUDO DE VISTORIA
// ---------------------------------------------------------------------------

export function LaudoVistoria({ locacao, imovel, tipo, onFechar }: {
  locacao: Locacao; imovel?: ImovelLocacao; tipo: 'entrada' | 'saida'; onFechar: () => void;
}) {
  const v = tipo === 'entrada' ? locacao.vistoriaEntrada : locacao.vistoriaSaida;
  if (!v) return null;
  return (
    <Papel
      titulo={`Laudo de Vistoria de ${tipo === 'entrada' ? 'Entrada' : 'Saída'}`}
      aviso="Anexo do contrato de locação — assinado no mesmo envelope"
      onFechar={onFechar}>
      <p className="mb-1"><b>Imóvel:</b> <Lacuna v={enderecoDoImovel(imovel)} /> {imovel?.codigo ? `(${imovel.codigo})` : ''}</p>
      <p className="mb-1"><b>Locatário:</b> <Lacuna v={locacao.nome} /></p>
      <p className="mb-1"><b>Proprietário:</b> <Lacuna v={imovel?.donoNome} /></p>
      <p className="mb-5"><b>Data da vistoria:</b> {fmtData(v.feitaEm)} {v.feitaPor ? `· realizada por ${v.feitaPor}` : ''}</p>

      <h2 className="font-bold text-[13px] mb-1">1. Itens que ficam no imóvel</h2>
      {(v.itens || []).length ? (
        <ul className="list-disc pl-5 mb-4">
          {(v.itens || []).map((x, i) => <li key={i} className="text-[11.5px]">{x}</li>)}
        </ul>
      ) : <p className="mb-4 text-[11.5px]">Imóvel entregue vazio, sem itens inventariados.</p>}

      <h2 className="font-bold text-[13px] mb-1">2. Ressalvas de estado</h2>
      {(v.ressalvas || []).length ? (
        <table className="w-full border-collapse text-[11.5px] mb-4">
          <thead><tr>
            <th className="text-left border-b-2 border-neutral-800 py-1 pr-2 w-32">Onde</th>
            <th className="text-left border-b-2 border-neutral-800 py-1">O que foi observado</th>
          </tr></thead>
          <tbody>
            {(v.ressalvas || []).map((r, i) => (
              <tr key={i}>
                <td className="border-b border-neutral-300 py-1.5 pr-2 font-bold">{r.onde}</td>
                <td className="border-b border-neutral-300 py-1.5">{r.oque}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mb-4 text-[11.5px]">
          Nenhuma ressalva: o imóvel foi {tipo === 'entrada' ? 'entregue' : 'devolvido'} em perfeito estado
          de conservação, conforme o registro fotográfico abaixo.
        </p>
      )}

      <h2 className="font-bold text-[13px] mb-2">3. Registro fotográfico</h2>
      {(v.fotos || []).length ? (
        <>
          <p className="text-[11px] mb-2">
            As imagens abaixo, feitas na captação com o imóvel desocupado, registram o estado do bem e
            integram este laudo para todos os efeitos.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {(v.fotos || []).map((u, j) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={j} src={u} alt={`Registro ${j + 1}`} className="h-28 rounded border border-neutral-300 object-cover" />
            ))}
          </div>
        </>
      ) : <p className="mb-4 text-[11.5px]">(sem registro fotográfico)</p>}

      <p className="mt-6 mb-8 text-[11.5px]">
        {tipo === 'entrada'
          ? 'O LOCATÁRIO declara receber o imóvel no estado descrito acima e obriga-se a restituí-lo nas mesmas condições, ressalvado o desgaste natural pelo uso regular.'
          : 'Confrontado com o laudo de entrada, o presente registro serve de base para o acerto de eventuais reparos, na forma do contrato de locação.'}
      </p>

      <div className="grid grid-cols-2 gap-x-10 text-center text-[11px]">
        <div><div className="border-t border-neutral-500 pt-1">{locacao.nome || 'LOCATÁRIO'}</div>Locatário</div>
        <div><div className="border-t border-neutral-500 pt-1">Nox Imóveis</div>Administradora</div>
      </div>
    </Papel>
  );
}

// ---------------------------------------------------------------------------
// 3 · o PACOTE DA LOFT (ficha do candidato + documentos)
// ---------------------------------------------------------------------------

export function PacoteLoft({ locacao, imovel, onFechar }: {
  locacao: Locacao; imovel?: ImovelLocacao; onFechar: () => void;
}) {
  const docs = locacao.docsInquilino || [];
  const copiar = async () => {
    const linhas = [
      'FICHA PARA ANÁLISE DE GARANTIA — NOX IMÓVEIS',
      '',
      `Candidato: ${locacao.nome}`,
      `CPF: ${locacao.doc || '—'}   RG: ${locacao.rg || '—'}`,
      `Estado civil: ${locacao.estadoCivil || '—'}   Profissão: ${locacao.profissao || '—'}`,
      `Telefone: ${locacao.telefone}`,
      `E-mail: ${locacao.email || '—'}`,
      `Endereço atual: ${locacao.enderecoAtual || '—'}`,
      '',
      `Imóvel: ${imovel ? `${imovel.codigo} — ${imovel.titulo}` : '—'}`,
      `Endereço: ${enderecoDoImovel(imovel) || '—'}`,
      `Aluguel: ${fmtValor(imovel?.aluguel)}`,
      `Condomínio: ${fmtValor(imovel?.condominio)}`,
      `IPTU mensal: ${fmtValor(imovel?.iptuMensal)}`,
      `Total mensal: ${imovel ? fmtValor(custoTotalMensal(imovel)) : '—'}`,
      '',
      'DOCUMENTOS ANEXADOS:',
      ...(docs.length ? docs.map((d, i) => `${i + 1}. ${d.categoria || 'documento'} — ${d.nome}\n   ${d.url}`) : ['(nenhum documento anexado ainda)']),
    ];
    try {
      await navigator.clipboard.writeText(linhas.join('\n'));
      alert('Ficha copiada — cole no painel da Loft.');
    } catch { /* sem clipboard */ }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary">
          Ficha para a análise da Loft — os mesmos dados e documentos do contrato
        </span>
        <span className="ml-auto flex gap-2">
          <button onClick={copiar} className={btnOuro}>📋 Copiar ficha</button>
          <button onClick={onFechar} className={btnGhost}>fechar</button>
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[12.5px]">
        {([
          ['Candidato', locacao.nome],
          ['CPF', locacao.doc || '—'],
          ['Telefone', locacao.telefone],
          ['E-mail', locacao.email || '—'],
          ['Corretor', locacao.corretorNome || '—'],
          ['Imóvel', imovel ? `${imovel.codigo} — ${imovel.titulo}` : '—'],
          ['Aluguel', fmtValor(imovel?.aluguel)],
          ['Total mensal', imovel ? fmtValor(custoTotalMensal(imovel)) : '—'],
        ] as const).map(([r, v]) => (
          <div key={r} className="flex items-baseline justify-between gap-3 border-b border-white/[0.05] py-1">
            <span className="text-text-secondary">{r}</span>
            <span className="text-white/85 text-right">{v}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-secondary mt-3 mb-1.5">
        Documentos ({docs.length})
      </p>
      {docs.length === 0 ? (
        <p className="text-[12px] text-amber-300">
          Nenhum documento anexado. A Loft precisa de CNH/RG, CPF e comprovante de renda — junte antes de enviar.
        </p>
      ) : (
        <ChipsDocumentos docs={docs} />
      )}
      <p className="text-[10.5px] text-text-secondary mt-3">
        Estes são os MESMOS documentos que instruem o contrato de locação — digitados uma vez, usados nos
        dois lugares. Com a integração da Loft, este envio deixa de ser copiar e colar.
      </p>
    </div>
  );
}
