/**
 * O FUNIL DE 6 FASES E AS DUAS CARTEIRAS — um caso por regra que muda número.
 * Roda com: node src/lib/__tests__/funilVendas.test.mjs
 *
 * Compila o lib de verdade (sem cópia de regra). Também compila constants.ts
 * pra garantir que as etapas literais do funil batem com o circuito — se
 * alguém renomear uma casa do circuito, este teste quebra antes da tela.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';

async function compila(rel) {
  const js = ts.transpileModule(fs.readFileSync(path.resolve(rel), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const tmp = path.join(os.tmpdir(), `${path.basename(rel, '.ts')}-teste-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmp, js, 'utf8');
  const mod = await import('file://' + tmp.replace(/\\/g, '/'));
  fs.unlinkSync(tmp);
  return mod;
}
const F = await compila('src/lib/funilVendas.ts');
const C = await compila('src/lib/constants.ts');

let falhas = 0;
function checa(nome, obtido, esperado, porque) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'FALHOU'} ${nome}`);
  if (!ok) console.log(`        esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`);
  if (!ok && porque) console.log(`        ${porque}`);
}

// o circuito de verdade — o normalizador mínimo que as telas usam
const CASAS = C.PIPELINE_STAGES;
const normalizar = (e) => (CASAS.includes(e) || e === 'Descartado' ? e : 'Entrada');

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— AS 6 FASES POR CIMA DAS 8 CASAS —');

checa('são exatamente 6 fases, na ordem do gestor',
  F.FASES_ROTULOS,
  ['Entrada', 'Em Contato', 'Meets/visitas agendados', 'Visitas feitas', 'Negociações/propostas', 'Fechamentos']);

checa('TODA casa do circuito cai em alguma fase (nenhuma some do funil)',
  CASAS.filter((c) => !F.faseDaEtapa(c)), [],
  'casa sem fase = lead invisível no funil da casa');

checa('e nenhuma casa cai em duas fases',
  F.FASES.flatMap((f) => f.etapas).length, new Set(F.FASES.flatMap((f) => f.etapas)).size);

checa('as casas literais do funil são as do circuito (constants.ts)',
  [...F.FASES.flatMap((f) => f.etapas)].sort(), [...CASAS].sort(),
  'se renomearem uma casa do circuito, aqui é onde quebra primeiro');

checa('Meet Agendado, Meet Feito e Visita Agendada viram UMA fase',
  ['Meet Agendado', 'Meet Feito', 'Visita Agendada'].map((e) => F.faseDaEtapa(e).chave),
  ['agendado', 'agendado', 'agendado']);

checa('Meet FEITO não conta como visita feita',
  F.faseDaEtapa('Meet Feito').chave !== 'visita_feita', true,
  'o marco do funil da casa é a VISITA acontecer');

checa('Descartado fica fora do funil', F.faseDaEtapa('Descartado'), null);
checa('rótulo de etapa fora do funil devolve a própria etapa', F.rotuloDaFase('Descartado'), 'Descartado');
checa('rótulo de casa do circuito devolve a fase', F.rotuloDaFase('Visita Agendada'), 'Meets/visitas agendados');
checa('a ordem das fases respeita a catraca',
  F.faseIndex('agendado') < F.faseIndex('visita_feita') && F.faseIndex('visita_feita') < F.faseIndex('negociacao'), true);

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— A CONVERSÃO ESPERADA —');

checa('o padrão é o que o gestor trouxe',
  F.CONVERSAO_PADRAO, { entrada: 87, contato: 8, agendado: 90, visita_feita: 50, negociacao: 35, fechamento: 30 });
checa('campo faltando cai no padrão, não em zero',
  F.normalizarConversao({ contato: 12 }).entrada, 87);
checa('lixo cai no padrão', F.normalizarConversao({ contato: 'abc' }).contato, 8);
checa('acima de 100 é travado em 100', F.normalizarConversao({ agendado: 250 }).agendado, 100);
checa('negativo vira zero', F.normalizarConversao({ fechamento: -5 }).fechamento, 0);
checa('undefined inteiro devolve o padrão', F.normalizarConversao(undefined), F.CONVERSAO_PADRAO);

{
  const acc = F.esperadoAcumulado(F.CONVERSAO_PADRAO, 100);
  checa('de 100 leads, a régua espera 87 acionados', acc.entrada, 87);
  checa('e ~7 conversas de verdade', acc.contato, 7);
  checa('e 0,3 venda — é a régua que explica por que 100 leads não fecham 5 vendas', acc.fechamento, 0.3);
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— O FUNIL REALIZADO —');

{
  const leads = [
    { etapa: 'Entrada' },                                                        // nunca acionado
    { etapa: 'Entrada', circuito: { tentativas: 2 } },                           // acionado, sem resposta
    { etapa: 'Em Contato', circuito: { primeiroContatoEm: {} } },                // conversa real
    { etapa: 'Visita Agendada', etapasHist: [{ para: 'Em Contato' }, { para: 'Meet Agendado' }] },
    { etapa: 'Negociação', etapasHist: [{ para: 'Em Contato' }, { para: 'Visita Agendada' }, { para: 'Visita Feita' }] },
    // descartado DEPOIS de visitar: a visita aconteceu e tem que continuar contando
    { etapa: 'Descartado', etapasHist: [{ para: 'Em Contato' }, { para: 'Visita Feita' }, { para: 'Descartado' }] },
  ];
  const r = F.funilRealizado(leads, normalizar);
  const por = Object.fromEntries(r.fases.map((f) => [f.chave, f]));

  checa('conta o total', r.total, 6);
  checa('Entrada: chegaram = acionados (tentou ou já passou dali)', por.entrada.chegaram, 5,
    'só o lead intocado fica de fora');
  checa('quem está na Entrada agora', por.entrada.estao, 2);
  checa('Em Contato: 4 passaram por lá', por.contato.chegaram, 4);
  checa('agendados: quem marcou meet/visita ou passou disso', por.agendado.chegaram, 3);
  checa('visitas feitas: inclusive o que foi descartado DEPOIS de visitar', por.visita_feita.chegaram, 2,
    'descarte zera a etapa atual — sem o histórico a visita sumiria do funil');
  checa('negociação: 1', por.negociacao.chegaram, 1);
  checa('fechamentos: 0', por.fechamento.chegaram, 0);
  checa('conversão da Entrada = acionados sobre o total', por.entrada.conversao, 83);
  checa('conversão do contato = 4 de 5 acionados', por.contato.conversao, 80);
  checa('o esperado viaja junto pra comparar', por.contato.esperado, 8);
  checa('fase sem base não inventa percentual', F.funilRealizado([{ etapa: 'Entrada' }], normalizar).fases[5].conversao, null);
  checa('lista vazia não dá NaN', F.funilRealizado([], normalizar).fases[0].conversao, null);
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— AS DUAS CARTEIRAS —');

checa('campo gravado manda: rede', F.carteiraDoLead({ carteira: 'rede', origemTipo: 'Propaganda' }), 'rede');
checa('campo gravado manda: casa', F.carteiraDoLead({ carteira: 'imobiliaria', origemTipo: 'Networking' }), 'imobiliaria');
checa('sem campo, networking é do corretor', F.carteiraDoLead({ origemTipo: 'Networking' }), 'rede');
checa('sem campo, ação de rua é do corretor', F.carteiraDoLead({ origemTipo: 'Ação de rua' }), 'rede');
checa('sem campo, plantão é do corretor', F.carteiraDoLead({ origemTipo: 'Plantão' }), 'rede');
checa('sem campo, propaganda é da casa', F.carteiraDoLead({ origemTipo: 'Propaganda' }), 'imobiliaria');
checa('sem campo, ligação ativa é da casa', F.carteiraDoLead({ origemTipo: 'Ligação' }), 'imobiliaria');
checa('lead antigo sem origem nenhuma é da casa', F.carteiraDoLead({}), 'imobiliaria',
  'na dúvida, a casa cobra — é o comportamento que sempre existiu');
checa('"Outros" não é da rede — depende do campo', F.carteiraDoLead({ origemTipo: 'Outros' }), 'imobiliaria');
checa('valor de carteira desconhecido não quebra', F.carteiraDoLead({ carteira: 'xyz', origemTipo: 'Plantão' }), 'rede');

checa('o filtro conhece todas as origens sem repetir Outros',
  F.ORIGENS_TODAS.filter((o) => o === 'Outros').length, 1);
checa('"Ligação" mantém o VALOR e ganha rótulo novo',
  [F.ORIGENS_IMOBILIARIA.includes('Ligação'), F.rotuloOrigem('Ligação')], [true, 'Ligação ativa'],
  'a Ligação Ativa grava "Ligação" desde sempre — mudar o valor apagaria o histórico do filtro');

// ───────────────────────────────────────────────────────────────────────────
console.log('\n— A GAVETA DE INTERESSE FUTURO —');

checa('o teto é 50', F.CAP_INTERESSE_FUTURO, 50);
checa('vagas = teto − guardados', F.vagasNaGaveta(38), 12);
checa('gaveta cheia não fica negativa', F.vagasNaGaveta(60), 0);
checa('guardado é só quando true', [F.leadGuardado({ guardado: true }), F.leadGuardado({ guardado: 'sim' }), F.leadGuardado({})], [true, false, false]);

checa('lead da casa, não guardado, conta na disciplina', F.contaNaDisciplina({ origemTipo: 'Propaganda' }), true);
checa('lead da REDE não conta na disciplina', F.contaNaDisciplina({ origemTipo: 'Networking' }), false,
  'ali agendar é opcional — atraso não é dívida com a casa');
checa('lead da casa GUARDADO não conta na disciplina', F.contaNaDisciplina({ origemTipo: 'Propaganda', guardado: true }), false);
checa('lead da casa que saiu da gaveta volta a contar', F.contaNaDisciplina({ origemTipo: 'Propaganda', guardado: false }), true);

console.log(falhas === 0 ? '\n✓ tudo certo\n' : `\n✗ ${falhas} falha(s)\n`);
process.exit(falhas === 0 ? 0 : 1);
