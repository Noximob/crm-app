# Relatório Individual do Corretor — Resgate e prompt para Cursor

## O que já está feito (base)

- **Funil invertido**: meta em R$ → VGV → vendas (ticket médio) → etapas (visitas, reuniões, qualificados, topo). Conversões configuráveis, template padrão “média de mercado”.
- **Filtro de período**: dia, semana, mês, trimestre, semestre, ano.
- **Pace**: “esperado até hoje” (meta proporcional ao tempo decorrido no período).
- **Cards**: (1) Necessário (funil invertido), (2) Realizado, (3) GAP por etapa com %.
- **Rotina (resumida)**: tarefas concluídas, horas em eventos, interações, VGV realizado.
- **Foco do período**: até 3 gargalos automáticos com base nos maiores GAPs.
- **Configurabilidade**: tipos em `configTypes.ts`, template padrão em `defaultTemplate.ts`, `getActiveTemplate` lê Firestore `reportConfig/{imobiliariaId}`.

---

## O que resgatar do teu texto (melhorar/implementar)

### 1. Participação em eventos (detalhada por tipo)

**Hoje:** só “Horas em eventos” no bloco Rotina.

**Quero:** no relatório, uma seção **Participação em eventos** (por período) com:

- **Eventos da imobiliária:** Treinamentos, Reuniões, Reunião de marketing.
- **Prospecção / topo de funil:** Corujão, Ligação ativa, Ação de rua, Visitas agendadas, Organização/Revisar CRM, Disparo de mensagens.
- **Plantões.**

Ou seja: mesmo dados que o `reportData` já usa (`eventosParticipados` com `tipo` + plantões), mas exibidos **por tipo** (contagem e/ou horas por tipo), não só total de horas.

**Onde está o dado:** `reportData.ts` → `eventosParticipados` (agenda + plantões) com `tipo` (reuniao, treinamento, 'revisar-crm', 'ligacao-ativa', 'acao-de-rua', 'disparo-de-msg', etc.) e `TIPO_EVENTO_LABEL`. Basta agregar por tipo e mostrar na UI.

---

### 2. Tarefas no CRM (atrasadas, paradas, do dia)

**Hoje:** só “Tarefas concluídas” na Rotina.

**Quero:** métricas de **tarefas no CRM** no período:

- Tarefas **atrasadas** (vencidas).
- Tarefas **paradas** (ex.: sem tarefa pendente / “sem tarefa”).
- Tarefas **do dia** (vencendo hoje).

**Onde está o dado:** `reportData.ts` já calcula `tarefasDoDia`, `tarefasAtrasadas`, `tarefasFuturas`, `semTarefa`. Só falta expor no novo relatório (ex.: subseção “Tarefas” dentro de Rotina ou card próprio).

---

### 3. Inovação / contribuição (material, conteúdo, ideias, tech)

**Quero:** metrificar se o corretor trouxe **inovação**: material novo, criação de conteúdo, tecnologia, nova ideia.

**Onde implementar:** o modelo já prevê categoria `inovacao` e `ManualContributions` (no spec). Falta:

- Definir onde gravar (ex.: subcoleção ou coleção `contribuicoesInovacao` ou uso do módulo de ideias existente).
- No relatório: contagem (e opcionalmente lista resumida) de contribuições de inovação no período.

---

### 4. Captação de imóveis

**Quero:** mostrar quando o corretor **conseguiu imóveis** (captação) no período.

**Onde implementar:** modelo já prevê categoria `captacao` e `CapturedProperties`. Falta:

- Fonte de dados (coleção de captações por corretor/período).
- No relatório: contagem e, se fizer sentido, status (ex.: publicados, em análise).

---

### 5. Tempo de uso do CRM / interações

**Hoje:** “Interações” no bloco Rotina.

**Quero:** manter e, se possível, deixar explícito como “Uso do CRM” (interações no período como proxy de uso). Se no futuro houver tempo real de sessão, incluir.

---

### 6. Diagnóstico em % (meta vs tempo)

**Quero:** deixar claro “quantos % está acima ou abaixo da meta em relação ao tempo” e “quantos % está abaixo nos pontos do funil” (ex.: “topo OK, qualificação baixa”).

**Hoje:** já temos GAP em valor e % (realizado/necessário) e “Foco do período”. Melhorias possíveis:

- No header: exibir **pace da meta** em % (ex.: “Meta esperada até hoje: 45% do ano → você está em X% do necessário”).
- Nos gargalos: reforçar a linguagem em % (ex.: “Qualificação: 60% do necessário”).

---

## Prompt enxuto para o Cursor

Usa o texto abaixo (ou cola no Cursor e pede “implementa o que falta no Relatório Individual”).

```
No Relatório Individual do Corretor (admin), a base já existe: funil invertido configurável, GAP, foco do período, período e meta em R$.

Faz as melhorias abaixo, sem quebrar o que já está feito:

1) Participação em eventos (detalhada)
- Na seção Rotina (ou nova seção "Participação em eventos"), mostrar participação no período POR TIPO de evento:
  - Eventos imobiliária: Treinamentos, Reuniões, Reunião de marketing.
  - Prospecção: Corujão, Ligação ativa, Ação de rua, Visitas agendadas, Revisar CRM, Disparo de mensagens.
  - Plantões.
- Usar os dados que já vêm do reportData (eventosParticipados com tipo; plantões). Agregar por tipo (contagem e/ou horas) e exibir em lista ou mini-cards.

2) Tarefas no CRM
- Expor na UI (no relatório): tarefas atrasadas, tarefas do dia, tarefas futuras, leads sem tarefa.
- Os números já existem em fetchRelatorioIndividual (tarefasDoDia, tarefasAtrasadas, tarefasFuturas, semTarefa). Incluir no payload que aggregateMetrics ou no relatório e mostrar numa subseção "Tarefas" (ex.: dentro de Rotina).

3) Pace e % da meta
- No header do relatório (quando há dados), mostrar de forma clara: "Meta esperada até hoje: X% do período" e, se possível, "Realizado: Y% do necessário no período" (ou equivalente).
- Nos bullets do "Foco do período", quando o gargalo for negativo, incluir o % (ex.: "Qualificação: 60% do necessário").

4) Inovação e Captação (estrutura mínima)
- Inovação: se existir coleção ou módulo de ideias/contribuições por corretor, exibir no relatório a contagem (e opcionalmente resumo) de contribuições no período. Caso não exista fonte de dados, adicionar um placeholder na UI ("Inovação / contribuições: em breve") e um comentário no código indicando onde conectar.
- Captação: se existir fonte de imóveis captados por corretor/período, exibir contagem. Senão, placeholder "Captação de imóveis: em breve" e comentário no código.

Mantém o layout enxuto atual (cards Necessário, Realizado, GAP, Rotina, Foco). Usa o padrão visual do sistema (cores, SectionTitle, etc.).
```

---

## Dificuldade (visão geral)

- **Já feito:** difícil (funil invertido configurável, versionamento, GAP, prioridades). Base sólida.
- **Participação por tipo + tarefas:** fácil — dados já no `reportData`, só agregar e exibir.
- **Pace % e linguagem em % no foco:** fácil — cálculos já existem, só texto e um número no header.
- **Inovação / Captação:** médio — depende de ter (ou criar) fonte de dados; placeholder + comentário é rápido.

Se quiser, na próxima sessão podemos implementar só os itens 1, 2 e 3 do prompt (eventos por tipo, tarefas, pace/%) e deixar 4 para quando as fontes de inovação e captação estiverem definidas.
