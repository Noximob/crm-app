/**
 * A CONTA DA CENTRAL DE LEADS — um caso por decisão que o número muda.
 * Roda com: node src/lib/__tests__/centralLeads.test.mjs
 *
 * Como o teste do dinheiro da locação, este compila o lib de verdade em vez
 * de copiar a regra: é conta que decide de quem o gestor vai cobrar e pra
 * quem vai a lista que a casa pagou. Cópia envelhece e passa a mentir.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';

const ORIGEM = path.resolve('src/lib/centralLeads.ts');
const js = ts.transpileModule(fs.readFileSync(ORIGEM, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const tmp = path.join(os.tmpdir(), `central-teste-${Date.now()}.mjs`);
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

const AGORA = new Date('2026-08-26T12:00:00').getTime();
const seg = (diasAtras) => Math.floor((AGORA - diasAtras * 864e5) / 1000);

/** Um contato mínimo. Por padrão está na fila e nunca foi chamado. */
const c = (over = {}) => ({
  id: 'c' + Math.random(), nome: 'Fulano', telefone: '(47) 90000-0000',
  status: 'pendente', tentativas: 0, eventos: [], ...over,
});

const lista = (over = {}) => ({
  id: 'l1', nome: 'Feirão', corretorId: 'k1', criadaEm: { seconds: seg(30) },
  contatos: [], ...over,
});

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— O VOCABULÁRIO COMUM DA SOBRA —');
{
  // O FURO QUE ISTO FECHA: os dois lugares que geram sobra nunca combinaram
  // as palavras. "Interesse futuro" (lista fria) e "Adiou a compra" (CRM) são
  // o mesmo cliente pra quem está redistribuindo — e apareciam separados, em
  // telas diferentes, com nomes diferentes. Procurar por tópico era impossível.
  const par = (a, b) => checa(`"${a}" e "${b}" caem no mesmo tópico`,
    L.topicoDoMotivo(a), L.topicoDoMotivo(b));

  par('Interesse futuro', 'Adiou a compra');
  par('Não atende', 'Não responde');
  par('Não quer', 'Não quer mais');
  par('Sem perfil', 'Fora do perfil');

  checa('e o tópico leva o nome que o gestor usa',
    L.topicoDoMotivo('Adiou a compra'), 'Interesse futuro');
  checa('o que só existe no frio continua existindo',
    L.topicoDoMotivo('Número errado'), 'Número errado');
  checa('o que só existe no CRM também',
    L.topicoDoMotivo('Comprou com outro'), 'Comprou com outro');

  checa('acento e caixa não separam o mesmo motivo',
    L.topicoDoMotivo('NAO ATENDE'), 'Não atende',
    'o texto vem digitado por gente, em duas telas diferentes');
  checa('espaço sobrando também não', L.topicoDoMotivo('  Não quer  '), 'Não quer');

  checa('texto livre do "Outro" vira Outros, não um tópico por frase',
    L.topicoDoMotivo('disse que vai pensar até o ano que vem'), 'Outros',
    'um tópico por frase seria a bagunça de novo');
  checa('sem motivo é seu próprio tópico', L.topicoDoMotivo(''), 'Sem motivo');
  checa('só espaços conta como sem motivo', L.topicoDoMotivo('   '), 'Sem motivo');
  checa('undefined não quebra', L.topicoDoMotivo(undefined), 'Sem motivo');

  // a ordem é a de quem vale mais a pena ligar de novo
  checa('interesse futuro vem antes de número errado',
    L.ordemDoTopico('Interesse futuro') < L.ordemDoTopico('Número errado'), true);
  checa('sem motivo desce pro fim',
    L.ordemDoTopico('Sem motivo'), L.TOPICOS_SOBRA.length - 1);
  checa('tópico desconhecido não some — vai pro fim',
    L.ordemDoTopico('inventado'), L.TOPICOS_SOBRA.length);

  // todo motivo real das duas telas tem que cair em algum tópico conhecido
  const DA_LISTA_FRIA = ['Não atende', 'Não quer', 'Número errado', 'Sem perfil', 'Interesse futuro'];
  const DO_CRM = ['Não responde', 'Não quer mais', 'Comprou com outro', 'Fora do perfil', 'Adiou a compra'];
  checa('nenhum motivo real das duas telas cai em "Outros"',
    [...DA_LISTA_FRIA, ...DO_CRM].filter((m) => L.topicoDoMotivo(m) === 'Outros'), [],
    'se cair, é motivo novo que ninguém mapeou — e some do filtro por tópico');
}


// ───────────────────────────────────────────────────────────────────────────
console.log('\n— O RESUMO DE UMA LISTA —');

{
  const l = lista({ contatos: [
    c({ status: 'crm', tentativas: 1, ultimaTentativaEm: { seconds: seg(5) } }),
    c({ status: 'pendente', tentativas: 2, ultimaTentativaEm: { seconds: seg(2) } }),
    c({ status: 'descartado', tentativas: 3, descartadoMotivo: 'Não atende' }),
    c({ status: 'pendente', tentativas: 0 }),
    c({ status: 'pendente', tentativas: 0 }),
  ] });
  const r = L.resumirLista(l);
  checa('conta o total', r.total, 5);
  checa('INTOCADO é quem está na fila e nunca foi chamado', r.intocados, 2,
    'descartado com 0 tentativas não é intocado — alguém decidiu por ele');
  checa('em andamento é o que está na fila e já foi chamado', r.emAndamento, 1);
  checa('soma as chamadas de todo mundo', r.chamadas, 6);
  checa('aproveitamento é quem virou lead sobre o total', r.aproveitamento, 20);
  checa('a última atividade é a mais recente de qualquer contato', r.ultimaAtividade, seg(2));
}

{
  // FURO REAL possível: 0/0 vira NaN e a tela escreve "NaN%"
  checa('lista vazia não gera NaN', L.resumirLista(lista({ contatos: [] })).aproveitamento, 0);
}

{
  // um descartado que nunca foi chamado NÃO conta como intocado: o intocado é
  // o que ainda dá pra trabalhar. Misturar os dois inflaria a cobrança.
  const r = L.resumirLista(lista({ contatos: [c({ status: 'descartado', tentativas: 0 })] }));
  checa('descartado sem chamada não entra em intocados', r.intocados, 0);
  checa('mas entra em descartados', r.descartados, 1);
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— A SOMA DE VÁRIAS LISTAS —');

{
  // FURO REAL: somar percentuais. 100% de uma lista de 1 com 0% de uma de 99
  // não é 50% — é 1%. Média de médias mente, e essa mentira vira elogio ao
  // corretor errado.
  const a = lista({ id: 'a', contatos: [c({ status: 'crm' })] });                       // 1/1 = 100%
  const b = lista({ id: 'b', contatos: Array.from({ length: 99 }, () => c()) });        // 0/99 = 0%
  const s = L.somarResumos([L.resumirLista(a), L.resumirLista(b)]);
  checa('o aproveitamento do conjunto se recalcula do total', s.aproveitamento, 1,
    'a média das duas daria 50% — e seria mentira');
  checa('a soma dos totais', s.total, 100);
  checa('a última atividade é a maior das listas', L.somarResumos([
    L.resumirLista(lista({ contatos: [c({ tentativas: 1, ultimaTentativaEm: { seconds: seg(9) } })] })),
    L.resumirLista(lista({ contatos: [c({ tentativas: 1, ultimaTentativaEm: { seconds: seg(3) } })] })),
  ]).ultimaAtividade, seg(3));
}

checa('somar lista nenhuma dá zero, não NaN', L.somarResumos([]).aproveitamento, 0);

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— A DIVISÃO POR CORRETOR —');

{
  const equipe = [{ id: 'k1', nome: 'João' }, { id: 'k2', nome: 'Maria' }, { id: 'k3', nome: 'Ana' }];
  const listas = [
    lista({ id: 'l1', corretorId: 'k1', contatos: [c(), c(), c({ status: 'crm', tentativas: 1, ultimaTentativaEm: { seconds: seg(1) } })] }),
    lista({ id: 'l2', corretorId: 'k1', contatos: [c({ status: 'descartado', descartadoMotivo: 'Não quer' })] }),
    lista({ id: 'l3', corretorId: 'k2', contatos: [c({ tentativas: 4, ultimaTentativaEm: { seconds: seg(10) } })] }),
    lista({ id: 'l4', corretorId: 'saiu', contatos: [c(), c()] }),
  ];
  const d = L.dividirPorCorretor(listas, equipe, AGORA);
  const de = (id) => d.find((x) => x.corretorId === id);

  checa('cada corretor com lista aparece', de('k1').listas, 2);
  checa('e a conta dele soma as listas dele', de('k1').resumo.total, 4);
  checa('quem está na equipe SEM lista também aparece', de('k3').listas, 0,
    'não é vazio: significa que alguém da equipe está sem munição');
  checa('quem saiu da equipe mas tem lista aparece como fantasma', de('saiu').fantasma, true);
  checa('e ganha nome que explica o que houve', de('saiu').nome, 'corretor que saiu da equipe');
  checa('corretor da equipe não é fantasma', de('k1').fantasma, false);
  checa('parado há: dias desde a última chamada dele', de('k2').paradoHa, 10);
  checa('quem nunca ligou tem parado null, não zero', de('k3').paradoHa, null,
    'zero diria "ligou hoje" — o contrário da verdade');
  checa('quem tem mais intocado aparece primeiro', d[0].corretorId, 'k1',
    'é onde o gestor precisa agir, então é o que ele vê primeiro');
  checa('o que ele descartou é o que está no bolsão dele', de('k1').noBolsao, 1);
}

{
  // lista importada sem corretor: existe e ninguém vai ligar
  const d = L.dividirPorCorretor([lista({ corretorId: '' , contatos: [c()] })], [], AGORA);
  checa('lista sem dono aparece com nome próprio', d[0].nome, 'sem dono');
  checa('e sem dono NÃO é fantasma', d[0].fantasma, false,
    'fantasma é quem saiu; sem dono nunca teve');
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— O QUE SOBRA PRA REDISTRIBUIR —');

{
  const listas = [
    lista({ id: 'l1', contatos: [
      c({ status: 'descartado', descartadoMotivo: 'Não atende' }),
      c({ status: 'descartado', descartadoMotivo: 'Não atende' }),
      c({ status: 'descartado', descartadoMotivo: 'Interesse futuro' }),
      c({ status: 'pendente' }),
    ] }),
    lista({ id: 'l2', contatos: [c({ status: 'descartado', descartadoMotivo: 'Não atende' })] }),
  ];
  const s = L.oQueSobra(listas, 7);
  checa('a sobra fria atravessa as listas', s.frios, 4,
    'é o ponto: sobrou 3 numa e 1 na outra — juntas são 4');
  checa('a sobra do CRM entra no total', s.total, 11);
  checa('o motivo que mais aparece', s.motivoTop, { motivo: 'Não atende', n: 3 });
  checa('só o descartado conta como sobra', L.oQueSobra([listas[0]], 0).frios, 3);
}

checa('descarte sem motivo vira "Sem motivo", não vazio',
  L.oQueSobra([lista({ contatos: [{ ...c({ status: 'descartado' }), descartadoMotivo: '   ' }] })], 0).motivoTop,
  { motivo: 'Sem motivo', n: 1 });

checa('sem sobra nenhuma, motivo top é null',
  L.oQueSobra([lista({ contatos: [c()] })], 0).motivoTop, null);

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— OS ALERTAS —');

{
  const equipe = [{ id: 'k1', nome: 'João' }];
  const tipos = (ls, sobra = { total: 0, motivoTop: null }) =>
    L.alertasDaCentral(ls, equipe, sobra, AGORA).map((a) => a.tipo);

  checa('lista criada hoje e ainda não trabalhada NÃO alarma',
    tipos([lista({ corretorId: 'k1', criadaEm: { seconds: seg(1) }, contatos: [c(), c()] })]),
    [],
    'dar 1 dia de prazo é o mínimo — senão o alerta nasce junto com a lista');

  checa('lista sem nenhuma chamada há mais de uma semana é grave',
    tipos([lista({ corretorId: 'k1', criadaEm: { seconds: seg(20) }, contatos: [c(), c()] })]),
    ['intocada']);

  checa('lista começada mas parada há muito tempo alarma mais leve',
    tipos([lista({ corretorId: 'k1', criadaEm: { seconds: seg(40) }, contatos: [
      c({ tentativas: 1, ultimaTentativaEm: { seconds: seg(20) } }), c(),
    ] })]),
    ['parada']);

  checa('lista trabalhada ontem não alarma',
    tipos([lista({ corretorId: 'k1', contatos: [
      c({ tentativas: 1, ultimaTentativaEm: { seconds: seg(1) } }), c(),
    ] })]),
    []);

  checa('lista de quem saiu da equipe é grave — ninguém vai ligar',
    L.alertasDaCentral([lista({ corretorId: 'saiu', criadaEm: { seconds: seg(2) }, contatos: [c()] })],
      equipe, { total: 0, motivoTop: null }, AGORA).some((a) => a.tipo === 'fantasma'),
    true);

  checa('corretor sem lista nenhuma vira aviso',
    L.alertasDaCentral([], equipe, { total: 0, motivoTop: null }, AGORA).map((a) => a.tipo),
    ['semLista']);

  checa('sobra esperando redistribuição vira aviso',
    L.alertasDaCentral([lista({ corretorId: 'k1', contatos: [c({ tentativas: 1, ultimaTentativaEm: { seconds: seg(1) } })] })],
      equipe, { total: 5, motivoTop: { motivo: 'Interesse futuro', n: 3 } }, AGORA).map((a) => a.tipo),
    ['sobrando']);

  checa('o grave vem antes do leve',
    L.alertasDaCentral(
      [lista({ id: 'x', corretorId: 'k1', criadaEm: { seconds: seg(20) }, contatos: [c(), c()] })],
      equipe, { total: 3, motivoTop: null }, AGORA,
    )[0].grave, true);

  checa('lista vazia não gera alerta nenhum',
    tipos([lista({ corretorId: 'k1', criadaEm: { seconds: seg(90) }, contatos: [] })]), []);
}

console.log(falhas === 0 ? '\n✓ tudo certo\n' : `\n✗ ${falhas} falha(s)\n`);
process.exit(falhas === 0 ? 0 : 1);
