/**
 * AUDITORIA DAS MÉTRICAS — um caso por armadilha que já produziu número
 * injusto num relatório real. Roda com: node src/lib/__tests__/auditoriaMetricas.test.mjs
 *
 * Cada teste aqui existe porque a métrica correspondente já acusou o
 * corretor de algo que ele não fez. Não são casos hipotéticos.
 */
const DIA = 864e5;
const HORA = 36e5;
let falhas = 0;

function checa(nome, obtido, esperado, porque) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'FALHOU '} ${nome}`);
  if (!ok) console.log(`        esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`);
  if (porque) console.log(`        ${porque}`);
}

const agora = Date.parse('2026-08-17T15:00:00-03:00');
const fimMs = agora;
const iniMs = agora - 31 * DIA;
const PRAZO_1O = 15;      // min úteis
const PRAZO_PARADO = 7;   // dias
const ATRASO_H = 24;      // horas úteis

console.log('\n=== 1. PARADO x AGENDADO ===');
{
  // cliente pediu para ser chamado em dois meses e a tarefa está marcada
  const leads = [
    { id: 'a', ativo: true, ultimoToque: agora - 30 * DIA, temRetorno: true },
    { id: 'b', ativo: true, ultimoToque: agora - 30 * DIA, temRetorno: false },
    { id: 'c', ativo: true, ultimoToque: agora - 2 * DIA, temRetorno: false },
  ];
  let parados = 0, agendados = 0;
  for (const l of leads) {
    if (!l.ativo) continue;
    if ((agora - l.ultimoToque) / DIA > PRAZO_PARADO) {
      if (l.temRetorno) agendados++; else parados++;
    }
  }
  checa('só quem está sem contato E sem retorno marcado conta como parado',
    { parados, agendados }, { parados: 1, agendados: 1 },
    'numa rodada real, 28 de 34 "parados" tinham retorno agendado');
}

console.log('\n=== 2. LEAD NOVO AINDA NO PRAZO ===');
{
  const leads = [
    { id: 'a', nasceu: agora - 5 * 60000, contato: 0 },   // 5 min atrás
    { id: 'b', nasceu: agora - 3 * DIA, contato: 0 },      // 3 dias, nada
  ];
  let semContato = 0, noPrazo = 0;
  for (const l of leads) {
    if (l.contato) continue;
    const minutos = (agora - l.nasceu) / 60000; // aproximação: tudo em horário útil
    if (minutos > PRAZO_1O) semContato++; else noPrazo++;
  }
  checa('lead que entrou há 5 minutos não conta como "sem 1º contato"',
    { semContato, noPrazo }, { semContato: 1, noPrazo: 1 },
    'o relógio dele ainda está correndo');
}

console.log('\n=== 3. TAREFA DE LEAD MORTO ===');
{
  const leads = [
    { id: 'a', etapa: 'Em Contato', tarefas: [{ due: agora - 3 * DIA, status: 'pendente' }] },
    { id: 'b', etapa: 'Descartado', tarefas: [{ due: agora - 3 * DIA, status: 'pendente' }] },
    { id: 'c', etapa: 'Fechamento', tarefas: [{ due: agora - 3 * DIA, status: 'pendente' }] },
  ];
  let atrasadas = 0;
  for (const l of leads) {
    const ativo = l.etapa !== 'Descartado' && l.etapa !== 'Fechamento';
    for (const t of (ativo ? l.tarefas : [])) {
      if (t.status === 'pendente' && (agora - t.due) / HORA > ATRASO_H) atrasadas++;
    }
  }
  checa('tarefa pendente em lead descartado ou fechado não é atraso',
    atrasadas, 1, 'lead que saiu da mão dele não gera cobrança');
}

console.log('\n=== 4. LEADS NOVOS RELATIVOS AO PERÍODO ===');
{
  // relatório de julho sendo lido em setembro
  const fimJulho = Date.parse('2026-07-31T23:59:59-03:00');
  const hoje = Date.parse('2026-09-20T12:00:00-03:00');
  const leads = [{ nasceu: Date.parse('2026-07-20T10:00:00-03:00') }];
  const errado = leads.filter((l) => (hoje - l.nasceu) / DIA <= 30).length;
  const certo = leads.filter((l) => l.nasceu <= fimJulho && (fimJulho - l.nasceu) / DIA <= 30).length;
  checa('"leads novos" conta do fim do período, não de hoje',
    { errado, certo }, { errado: 0, certo: 1 },
    'senão um relatório antigo diz que ninguém entrou');
}

console.log('\n=== 5. BENCHMARK DO TIME COM A MESMA RÉGUA ===');
{
  const doTime = [
    // dois legados carimbados agora: é o que estourava a mediana do time
    { nasceu: agora - 400 * DIA, contato: agora - 2 * DIA },
    { nasceu: agora - 380 * DIA, contato: agora - 2 * DIA },
    { nasceu: agora - 10 * DIA, contato: agora - 10 * DIA + 12 * 60000 },
    { nasceu: agora - 5 * DIA, contato: agora - 5 * DIA + 8 * 60000 },
    { nasceu: agora - 3 * DIA, contato: agora - 3 * DIA + 20 * 60000 },
  ];
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
  const min = (l) => Math.round((l.contato - l.nasceu) / 60000);
  const semFiltro = med(doTime.map(min));
  const comFiltro = med(doTime.filter((l) => l.nasceu >= iniMs && l.nasceu < fimMs).map(min));
  checa('o time é medido com o mesmo filtro de período do corretor',
    { semFiltro, comFiltro }, { semFiltro: 20, comFiltro: 12 },
    'sem o filtro, o time apareceu com 15.364 min contra 1 min do corretor');
}

console.log('\n=== 6. META AJUSTADA AO PERÍODO ===');
{
  const linha = (metaMes, dias, inteiro = true) => {
    const bruta = metaMes * (dias / 30);
    const meta = inteiro ? Math.floor(bruta) : Math.round(bruta * 10) / 10;
    return { meta, avaliavel: meta >= 1 };
  };
  checa('meta de 1 venda/mês não vira "0,2 venda" numa semana',
    linha(1, 7), { meta: 0, avaliavel: false });
  checa('meta de 6 visitas/mês vira 1 numa semana, e é avaliável',
    linha(6, 7), { meta: 1, avaliavel: true });
  checa('arredonda para BAIXO: meia venda não vira uma',
    linha(1, 15), { meta: 0, avaliavel: false },
    'régua tem que ser defensável na reunião');
}

console.log('\n=== 7. VERMELHO SÓ CONTRA O QUE FOI COMBINADO ===');
{
  const st = (status, origem) => (status === 'vermelho' && origem !== 'casa') ? 'amarelo' : status;
  checa('fora da régua da casa reprova', st('vermelho', 'casa'), 'vermelho');
  checa('fora só do padrão de mercado é atenção', st('vermelho', 'mercado'), 'amarelo',
    'não se reprova por acordo que nunca houve');
  checa('sem origem declarada, o conservador vence', st('vermelho', ''), 'amarelo');
}

console.log('\n=== 8. TEMPO NA ETAPA SEM CARIMBO É ESTIMATIVA ===');
{
  const historicoDesde = Date.parse('2026-07-29T00:00:00-03:00');
  const lead = { nasceu: Date.parse('2025-09-01T00:00:00-03:00'), carimbo: 0 };
  const semPiso = Math.floor((agora - lead.nasceu) / DIA);
  const base = lead.carimbo || Math.max(lead.nasceu, historicoDesde);
  const comPiso = Math.floor((agora - base) / DIA);
  checa('sem carimbo de etapa, o tempo é contado do início do histórico',
    { semPiso, comPiso, estimado: !lead.carimbo }, { semPiso: 350, comPiso: 19, estimado: true },
    'ia acusar 350 dias parado quando o dado só permite dizer "pelo menos 19"');
}

console.log(falhas ? `\n${falhas} FALHA(S)\n` : '\nTodas as métricas passaram.\n');
process.exit(falhas ? 1 : 0);
