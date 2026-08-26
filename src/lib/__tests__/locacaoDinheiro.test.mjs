/**
 * O DINHEIRO E AS DATAS DA LOCAÇÃO — um caso por furo que existia de verdade.
 * Roda com: node src/lib/__tests__/locacaoDinheiro.test.mjs
 *
 * Diferente dos outros testes da casa, este NÃO copia a lógica: ele compila
 * o lib/locacao.ts na hora e testa a função que roda em produção. Cópia de
 * regra de dinheiro envelhece e passa a mentir — e aqui um erro de centavo
 * ou de dia de vencimento sai do bolso de alguém.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';

const ORIGEM = path.resolve('src/lib/locacao.ts');
const js = ts.transpileModule(fs.readFileSync(ORIGEM, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const tmp = path.join(os.tmpdir(), `locacao-teste-${Date.now()}.mjs`);
fs.writeFileSync(tmp, js, 'utf8');
const L = await import('file://' + tmp.replace(/\\/g, '/'));
fs.unlinkSync(tmp);

let falhas = 0;
function checa(nome, obtido, esperado, porque) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'FALHOU'} ${nome}`);
  if (!ok) console.log(`        esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`);
  if (!ok && porque) console.log(`        ${porque}`);
}

/** Uma locação mínima e válida, com os números do exemplo que o gestor usa. */
const base = (extra = {}) => ({
  ...L.LOCACAO_VAZIA, id: 'L1', imobiliariaId: 'I1',
  inicio: '2026-03-01', prazoMeses: 30, diaVencimento: 5,
  valorAluguel: 1850, valorCondominio: 380, valorIptuMensal: 92,
  valorSeguroIncendio: 28, taxaAdmPct: 10, ...extra,
});

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— A DATA DE HOJE —');

// FURO REAL: toISOString() em UTC. Às 22h em Penha (UTC-3) já é o dia
// seguinte em Londres, e o contrato nascia datado de amanhã.
{
  const agora = new Date();
  const esperado = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  checa('hojeYmd usa o dia do relógio de quem está usando', L.hojeYmd(), esperado,
    'depois das 21h no Brasil o UTC já virou — data de assinatura não pode sair no futuro');
}
checa('ymd de 31/12 às 23h continua sendo 31/12', L.ymd(new Date(2026, 11, 31, 23, 30)), '2026-12-31');

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— A CONTA DA MENSALIDADE —');

{
  const m = L.gerarMovimentos(base())[0];
  checa('o inquilino paga aluguel + IPTU + seguro', m.valorTotal, 1970,
    'o condomínio de 380 NÃO entra: quem paga é o inquilino, direto à administradora');
  checa('a casa retém 10% só do aluguel', m.taxaAdm, 185,
    'IPTU e seguro não entram na base da taxa');
  checa('o dono recebe aluguel − taxa + IPTU', m.repasseDono, 1757);
  checa('o que sobra é o seguro incêndio', L.cents(m.valorTotal - m.repasseDono - m.taxaAdm), 28,
    'não é receita da casa: vai pra seguradora — o extrato mostra isso separado');
}

{
  // valores quebrados: float puro devolvia 1970.0000000000002 no extrato
  const m = L.gerarMovimentos(base({ valorAluguel: 1833.33, valorIptuMensal: 91.67, valorSeguroIncendio: 27.9 }))[0];
  checa('mensalidade quebrada não vira dízima', m.valorTotal, 1952.9);
  checa('taxa de valor quebrado fecha em centavos', m.taxaAdm, 183.33);
  checa('repasse de valor quebrado fecha em centavos', m.repasseDono, 1741.67);
}

checa('taxa de 8,5% sai certa', L.gerarMovimentos(base({ taxaAdmPct: 8.5 }))[0].taxaAdm, 157.25);

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— OS VENCIMENTOS —');

checa('gera exatamente o prazo do contrato', L.gerarMovimentos(base()).length, 30);

{
  // FURO REAL: new Date(2027, 1, 31) vira 3 de março.
  const movs = L.gerarMovimentos(base({ inicio: '2027-01-01', diaVencimento: 31, prazoMeses: 3 }));
  checa('vencimento dia 31 em fevereiro cai no último dia de fevereiro',
    movs.map((m) => m.vencimento), ['2027-01-31', '2027-02-28', '2027-03-31'],
    'antes escorregava pro mês seguinte e o boleto vencia fora da competência');
  checa('a competência acompanha o mês certo',
    movs.map((m) => m.competencia), ['2027-01', '2027-02', '2027-03']);
}

{
  // FURO REAL: chave entregue dia 20, vencimento dia 5 → nascia uma cobrança
  // vencida no dia 5 do mesmo mês, e o alerta de inadimplência acendia na
  // hora, no dia da entrega da chave.
  const movs = L.gerarMovimentos(base({ inicio: '2026-08-20', diaVencimento: 5, prazoMeses: 3 }));
  checa('nenhuma cobrança vence antes da entrega da chave',
    movs.every((m) => m.vencimento >= '2026-08-20'), true);
  checa('a primeira competência é o mês seguinte',
    movs.map((m) => m.competencia), ['2026-09', '2026-10', '2026-11']);
  checa('e ainda gera o prazo cheio', movs.length, 3);
}

{
  const movs = L.gerarMovimentos(base({ inicio: '2026-08-01', diaVencimento: 5, prazoMeses: 2 }));
  checa('entrando dia 1º, a primeira competência é o próprio mês',
    movs.map((m) => m.competencia), ['2026-08', '2026-09'],
    'o vencimento dia 5 ainda está à frente — não há por que empurrar');
}

checa('prazo absurdo é limitado, pra não estourar o lote do Firestore',
  L.gerarMovimentos(base({ prazoMeses: 900 })).length, L.MAX_PARCELAS);

checa('sem aluguel não gera cobrança nenhuma', L.gerarMovimentos(base({ valorAluguel: null })).length, 0);
checa('sem dia de vencimento não gera cobrança nenhuma', L.gerarMovimentos(base({ diaVencimento: null })).length, 0);

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— O REAJUSTE —');

checa('reajuste de 4,5% sobre 1850', L.calcularReajuste(1850, 4.5), 1933.25);

{
  const ano = new Date().getFullYear();
  const ontem = L.ymd(new Date(Date.now() - 864e5));

  // FURO REAL: o relógio partia sempre do INÍCIO do contrato. Aplicado o
  // reajuste, o alerta seguia aceso até passar o aniversário — e o botão
  // "aplicar" junto. Dois cliques no mesmo ciclo dobravam o aluguel.
  const semReajuste = { inicio: `${ano - 1}-03-01`, reajustes: [] };
  const comReajusteOntem = {
    inicio: `${ano - 1}-03-01`,
    reajustes: [{ em: ontem, de: 1850, para: 1933.25, indice: 'IGP-M', percentual: 4.5 }],
  };
  const dias = (d) => Math.round((new Date(d + 'T12:00:00') - Date.now()) / 864e5);

  checa('sem reajuste aplicado, a data é o aniversário do contrato',
    L.proximoReajuste(semReajuste).slice(5), '03-01');
  checa('aplicado ontem, o próximo só daqui a um ano',
    dias(L.proximoReajuste(comReajusteOntem)) > 350, true,
    'é isto que apaga o alerta na hora e fecha a porta do reajuste em dobro');
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— O FIM DO CONTRATO —');

checa('31/01 + 1 mês = 28/02, não 03/03', L.fimContrato({ inicio: '2027-01-31', prazoMeses: 1 }), '2027-02-28');
checa('30 meses a partir de 01/03/2026', L.fimContrato({ inicio: '2026-03-01', prazoMeses: 30 }), '2028-09-01');

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— O FEED DOS PORTAIS —');

{
  // FURO REAL: bastava apagar duas fotos de um anúncio já publicado. O
  // arquivo saía fora da regra e o Grupo OLX reprova o feed INTEIRO — todos
  // os imóveis da casa saem do ar por causa de um.
  const imovel = (extra) => ({
    ...L.IMOVEL_VAZIO, id: 'X', imobiliariaId: 'I1', codigo: 'LOC-001',
    etapa: 'publicado', portais: ['grupo_olx'],
    titulo: 'Apartamento 2 quartos com sacada — Centro',
    descricao: 'x'.repeat(60), cep: '88385-000',
    rua: 'Rua A', bairro: 'Centro', cidade: 'Penha/SC', aluguel: 1850,
    donoNome: 'Dono', donoTelefone: '47999999999', donoDoc: '000', donoPix: 'pix',
    docsDono: [{ nome: 'a', url: '', categoria: 'RG/CPF do proprietário' }],
    fotos: ['1', '2', '3', '4', '5'], ...extra,
  });

  checa('anúncio completo entra no feed', L.imoveisNoFeed([imovel({})]).length, 1);
  checa('anúncio com 3 fotos fica de fora', L.imoveisNoFeed([imovel({ fotos: ['1', '2', '3'] })]).length, 0);
  checa('e a tela consegue dizer QUEM ficou de fora e por quê',
    L.imoveisForaDoFeed([imovel({ fotos: ['1', '2', '3'] })])[0].falta[0].startsWith('Pelo menos 5 fotos'), true,
    'a palavra é PELO MENOS: 5 é o piso dos portais, não um teto');

  // as réguas dos portais valem nas duas pontas
  checa('título acima de 100 caracteres também é pendência',
    L.pendenciasImovel(imovel({ titulo: 'x'.repeat(120) })).material.length > 0, true);
  checa('descrição acima de 3.000 caracteres também é pendência',
    L.pendenciasImovel(imovel({ descricao: 'x'.repeat(3200) })).material.length > 0, true);
  checa('anúncio com 12 fotos passa — 5 é piso, não teto',
    L.pendenciasImovel(imovel({ fotos: Array.from({ length: 12 }, (_, i) => String(i)) })).material.length, 0);
  checa('imóvel alugado não entra no feed', L.imoveisNoFeed([imovel({ etapa: 'alugado' })]).length, 0);
  checa('o XML não cita quem ficou de fora',
    L.gerarFeedVrsync([imovel({ fotos: ['1', '2', '3'] })], { nome: 'Nox', email: 'a@b.c', telefone: '' }).includes('LOC-001'), false);
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— A JANELA DA GARANTIA —');
{
  // O furo: seguro-fiança só paga se a seguradora for avisada dentro do
  // prazo. Passou, a cobertura cai e a casa fica devendo ao proprietário o
  // aluguel que garantiu. O relógio conta do vencimento MAIS ANTIGO.
  const hoje = L.hojeYmd();
  const diasAtras = (n) => {
    const d = new Date(hoje + 'T12:00:00');
    d.setDate(d.getDate() - n);
    return L.ymd(d);
  };
  const comFianca = (extra = {}) => base({ garantiaTipo: 'Seguro-fiança (Loft)', ...extra });

  checa('em dia não gera aviso de garantia',
    L.avisoGarantia(comFianca(), diasAtras(-5)).vale, false);
  checa('atraso pequeno avisa em tom de atenção',
    L.avisoGarantia(comFianca(), diasAtras(5)).tom, 'atencao');
  checa('faltando 10 dias ou menos vira alerta',
    L.avisoGarantia(comFianca(), diasAtras(22)).tom, 'alerta',
    '22 dias de atraso = restam 8 do prazo de 30');
  checa('prazo estourado continua alertando (a cobertura já caiu)',
    L.avisoGarantia(comFianca(), diasAtras(45)).diasRestantes, -15);
  checa('caução não aciona seguradora nenhuma',
    L.avisoGarantia(comFianca({ garantiaTipo: 'Caução (3 aluguéis)' }), diasAtras(45)).vale, false);
  checa('fiador também não é seguradora',
    L.avisoGarantia(comFianca({ garantiaTipo: 'Fiador' }), diasAtras(45)).vale, false);
  checa('seguro INCÊNDIO não é garantia locatícia',
    L.garantiaDeSeguradora('Seguro incêndio'), false,
    'os dois têm a palavra seguro — só a fiança cobre aluguel');
  checa('sem vencimento em aberto, sem aviso',
    L.avisoGarantia(comFianca(), '').vale, false);
}


// ───────────────────────────────────────────────────────────────────────────
console.log('\n— O PREENCHIMENTO DE TESTE —');

checa('preencherVazios não sobrescreve o que já foi digitado',
  L.preencherVazios({ nome: 'Fernanda de verdade', doc: '' }, { nome: 'Teste', doc: '111' }),
  { nome: 'Fernanda de verdade', doc: '111' });
checa('lista vazia conta como vazia', L.preencherVazios({ fotos: [] }, { fotos: ['a'] }), { fotos: ['a'] });
checa('zero NÃO é vazio: taxa 0% é uma escolha', L.preencherVazios({ taxaAdmPct: 0 }, { taxaAdmPct: 10 }), { taxaAdmPct: 0 });

console.log(falhas === 0 ? '\n✓ tudo certo\n' : `\n✗ ${falhas} falha(s)\n`);
process.exit(falhas === 0 ? 0 : 1);
