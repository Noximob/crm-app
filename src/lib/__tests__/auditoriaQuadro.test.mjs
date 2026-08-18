/**
 * O QUADRO NÃO PODE SE CONTRADIZER — um caso por incongruência que apareceu
 * num relatório real e fez o gestor desconfiar do documento inteiro.
 * Roda com: node src/lib/__tests__/auditoriaQuadro.test.mjs
 *
 * Todos os casos abaixo saíram do rodada.json do Breno de 18/08/2026, onde a
 * análise escreveu o campo `status` à mão. Nenhum é hipotético.
 *
 * A regra que os resolve: o status é SEMPRE recalculado do valor contra a
 * referência. O que a análise escreveu em `status` é ignorado.
 */
let falhas = 0;

function checa(nome, obtido, esperado, porque) {
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'FALHOU '} ${nome}`);
  if (!ok) console.log(`        esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`);
  if (porque) console.log(`        ${porque}`);
}

/**
 * A conta do status, copiada de auditoriaAnalise.lerIndicadores e de
 * auditoriaQuadro.statusDe — as duas usam a mesma régua de propósito, e este
 * teste existe para que continuem usando.
 */
function statusDe({ valor, referencia, bom, origem }) {
  if (valor === null || referencia === null || bom === 'neutro') return 'nd';
  const dentro = bom === 'alto' ? valor >= referencia : valor <= referencia;
  if (dentro) return 'verde';
  const folga = bom === 'alto' ? valor / (referencia || 1) : (referencia || 1) / (valor || 1);
  return origem === 'casa' && folga < 0.7 ? 'vermelho' : 'amarelo';
}

console.log('\n=== 1. ACIMA DA META NÃO É "ATENÇÃO" ===');
{
  // a análise escreveu "atencao" em 100% de visitas realizadas contra meta
  // de 70%. É o caso que mais rápido queima a confiança: o corretor bateu a
  // meta e o relatório o repreende por isso.
  checa('100% contra meta de 70% (quanto mais alto melhor)',
    statusDe({ valor: 100, referencia: 70, bom: 'alto', origem: 'mercado' }),
    'verde',
    'a análise tinha marcado "atencao" — bater a meta virava repreensão');
}

console.log('\n=== 2. LINHA SEM VALOR NÃO TEM VEREDITO ===');
{
  // retorno_pos_visita_mediana_h veio com valor null e status "atencao".
  // Não houve visita para medir; não há o que julgar.
  checa('valor null com referência de 24h',
    statusDe({ valor: null, referencia: 24, bom: 'baixo', origem: 'mercado' }),
    'nd',
    'a análise tinha marcado "atencao" numa linha que ela mesma deixou vazia');
}

console.log('\n=== 3. ZERO CONTRA META ALTA É VERMELHO, NÃO AMARELO ===');
{
  // pct_com_proximo_passo_proposto veio 0 contra referência 50, marcado
  // "atencao". Zero é o pior valor possível — amarelo esconde o gargalo.
  checa('0% contra régua da casa de 50%',
    statusDe({ valor: 0, referencia: 50, bom: 'alto', origem: 'casa' }),
    'vermelho',
    'folga 0/50 = 0, muito abaixo de 0,7');

  // o mesmo zero contra padrão de mercado NÃO reprova: não foi combinado
  checa('o mesmo 0% contra padrão de mercado',
    statusDe({ valor: 0, referencia: 50, bom: 'alto', origem: 'mercado' }),
    'amarelo',
    'reprovar por acordo que nunca houve é o que faz o corretor descartar o relatório');
}

console.log('\n=== 4. PERTO DO LIMITE É ATENÇÃO, NÃO REPROVAÇÃO ===');
{
  // 80% contra 90% da casa: está fora, mas com folga de 0,89 — cobrar como
  // falha grave um desvio de 10% gasta a autoridade da cor vermelha
  checa('80% contra régua da casa de 90%',
    statusDe({ valor: 80, referencia: 90, bom: 'alto', origem: 'casa' }),
    'amarelo',
    'folga 0,89 — fora da régua, mas não é o gargalo da rodada');

  checa('12% contra régua da casa de 80%',
    statusDe({ valor: 12, referencia: 80, bom: 'alto', origem: 'casa' }),
    'vermelho',
    'folga 0,15 — este sim é gargalo');
}

console.log('\n=== 5. INDICADOR EM QUE MENOS É MELHOR ===');
{
  // 1o contato: 1 minuto contra prazo de 15 é excelente
  checa('1 min contra prazo de 15 min',
    statusDe({ valor: 1, referencia: 15, bom: 'baixo', origem: 'casa' }),
    'verde');

  // 7 tarefas vencidas contra régua de zero
  checa('7 tarefas vencidas contra régua de 0',
    statusDe({ valor: 7, referencia: 0, bom: 'baixo', origem: 'casa' }),
    'vermelho',
    'a casa combinou zero tarefa vencida — aqui o vermelho se sustenta');
}

console.log('\n=== 6. SEM RÉGUA NÃO HÁ COR ===');
{
  // pct_com_pergunta_aberta não tem referência combinada nem de mercado
  checa('valor 20 sem referência',
    statusDe({ valor: 20, referencia: null, bom: 'alto', origem: 'nenhuma' }),
    'nd',
    'número sem régua é informação, não avaliação');
}

console.log(falhas === 0 ? '\n✓ o quadro não se contradiz\n' : `\n✗ ${falhas} falha(s)\n`);
process.exit(falhas === 0 ? 0 : 1);
