# Relatórios – Visão geral e o que podemos trazer

Este documento faz uma varredura no sistema e lista **o que já temos de dado** e **o que podemos oferecer** na área de relatórios (admin), desde funil de vendas até relatórios diário/semanal/mensal e visão macro.

---

## 1. Dados que já existem no sistema (fontes para relatórios)

### 1.1 Leads (`leads`)
- **userId** – corretor responsável  
- **imobiliariaId** – imobiliária  
- **nome**, **telefone**, **email**  
- **etapa** – etapa do pipeline (uma das 11 etapas)  
- **origem** – texto (ex.: "Networking", "Ligação", "Indicação do parceiro")  
- **origemTipo** – opção escolhida: Networking | Ligação | Ação de rua | Disparo de msg | Outros  
- **origemOutros** – texto quando origem = Outros  
- **createdAt** – data/hora de cadastro (Timestamp)  
- **anotacoes**  
- **automacao** – status, nomeTratamento, dataInicio, dataCancelamento, initialMessageSent  
- Campos de qualificação (finalidade, estagio, quartos, tipo, vagas, valor, etc.)  
- Subcoleções: **tarefas** (dueDate, status), **interactions** (type, notes, timestamp), **function_logs**

### 1.2 Usuários / corretores (`usuarios`)
- **id**, **nome**, **email**, **tipoConta**, **imobiliariaId**, **aprovado**

### 1.3 Financeiro (`financeiro_movimentacoes`)
- **tipo** (entrada/saída), **valor**, **categoria**, **descricao**, **data**, **status**, **formaPagamento**, **imobiliariaId**, **usuarioId**, **criadoEm**

### 1.4 Outros (contexto)
- **imobiliarias** – dados da imobiliária  
- **agenda**, **agendaImobiliaria**, **plantoes**, **avisosImportantes** – por imobiliariaId  
- **ideias**, **votos_ideias** – engajamento  
- **imoveis_captados** – captações por imobiliariaId  
- **treinamentos** – por imobiliariaId  

### 1.5 Pipeline (constante)
- 11 etapas: Pré Qualificação → Qualificação → Apresentação do imóvel → Ligação agendada → Visita agendada → Negociação e Proposta → Contrato e fechamento → Pós Venda e Fidelização → Interesse Futuro → Carteira → Geladeira  

---

## 2. O que podemos trazer nos relatórios (com o que já temos)

Tudo abaixo pode ser filtrado por **imobiliária** (e, onde fizer sentido, por **corretor** e por **período**).

---

### 2.1 Funil de vendas (macro)

- **Leads por etapa**  
  - Contagem por etapa do pipeline (hoje + comparação com período anterior se quiser).  
  - Fonte: `leads` + `etapa`.  
- **Conversão entre etapas**  
  - % de leads que “avançam” de uma etapa para a próxima (exige histórico de mudança de etapa ou uso de `createdAt` + etapa atual como proxy; ver observação no fim).  
- **Funil visual**  
  - Barras ou funil (ex.: Pré Qualificação → … → Geladeira) com quantidades e, se possível, percentuais.  
- **Gargalos**  
  - Etapas com mais leads parados (maior volume ou maior tempo médio, quando tivermos tempo na etapa).  

**Filtros sugeridos:** período (data de criação do lead), corretor, imobiliária (já é escopo admin).

---

### 2.2 Por origem do lead

- **Leads por origem**  
  - Contagem (e %) por **origem** ou **origemTipo**: Networking, Ligação, Ação de rua, Disparo de msg, Outros (+ detalhe de **origemOutros** quando for “Outros”).  
- **Origem x etapa**  
  - Tabela ou gráfico: origem (linha) x etapa (coluna) ou origem x “conversão” até determinada etapa.  
- **Performance por origem**  
  - Qual origem gera mais leads em etapa avançada (ex.: Negociação, Contrato) ou mais fechamentos (quando tivermos essa marcação).  

**Filtros:** período (createdAt), corretor.

---

### 2.3 Relatórios por período (diário / semanal / mensal)

- **Novos leads**  
  - Total de leads criados no dia / na semana / no mês (por `createdAt`).  
- **Leads por etapa no período**  
  - Snapshot: quantos leads estavam em cada etapa no fim do dia/semana/mês (ou média), ou “novos por etapa” se classificarmos por etapa no momento da criação).  
- **Comparativo**  
  - Este mês vs mês anterior, esta semana vs anterior, hoje vs ontem (totais e, se possível, por etapa e por origem).  
- **Tendência**  
  - Gráfico de linha ou barras: novos leads por dia/semana/mês.  

**Filtros:** tipo de período (dia/semana/mês), data inicial/final, corretor.

---

### 2.4 Por corretor (performance)

- **Leads por corretor**  
  - Total de leads (e por etapa) por `userId` (nome do corretor vindo de `usuarios`).  
- **Novos leads por corretor no período**  
  - Quem mais cadastrou no dia/semana/mês.  
- **Distribuição por origem por corretor**  
  - Cada corretor: quantos por Networking, Ligação, etc.  
- **Ranking**  
  - Top corretores por volume de leads, por leads em etapas quentes (ex.: Negociação + Contrato), etc.  

**Filtros:** período, etapa (opcional).

---

### 2.5 Tarefas e atividades (quando quiser aprofundar)

- **Tarefas pendentes por corretor**  
  - Contagem de tarefas com status `pendente` em `leads/{id}/tarefas`.  
- **Tarefas em atraso / do dia**  
  - Já existe lógica no CRM (dueDate vs hoje); pode ser agregada por corretor ou por imobiliária.  
- **Interações por período**  
  - Contagem de registros em `leads/{id}/interactions` por tipo (Ligação, WhatsApp, Visita, Tarefa Agendada/Concluída/Cancelada) e por período (timestamp).  

**Filtros:** período, corretor.

---

### 2.6 Automação (WhatsApp)

- **Leads com automação ativa**  
  - Contagem onde `automacao.status === 'ativa'`.  
- **Leads que receberam mensagem inicial**  
  - `automacao.initialMessageSent === true`.  
- **Automação por corretor**  
  - Quantos leads em automação por userId.  

**Filtros:** período (data de início da automação, se estiver registrada), corretor.

---

### 2.7 Financeiro (resumo na área de relatórios)

- **Entradas x saídas no período**  
  - Soma de `financeiro_movimentacoes` por tipo (entrada/saída), filtrado por data e imobiliariaId.  
- **Por categoria**  
  - Valores por categoria (entrada e saída) no período.  
- **Saldo do período**  
  - Entradas − Saídas.  

**Filtros:** data início/fim (e já escopo por imobiliária).

---

### 2.8 Visão macro (resumo geral)

- **Números em destaque (cards)**  
  - Total de leads (imobiliária).  
  - Novos leads no período (hoje / esta semana / este mês).  
  - Leads por etapa “quente” (ex.: Negociação + Contrato + Pós Venda).  
  - Total de corretores ativos (com pelo menos 1 lead).  
  - Origem mais frequente no período.  
- **Mini funil**  
  - Barras ou funil com totais por etapa.  
- **Últimos 7 ou 30 dias**  
  - Gráfico de novos leads por dia.  

Tudo isso pode ser reutilizado depois em “slides que passam números em tempo real”, desde que a tela de relatórios já consuma os mesmos dados (por período e filtros).

---

## 3. O que exige novo dado ou nova lógica

- **Tempo médio por etapa**  
  - Precisamos registrar **quando** o lead entrou em cada etapa (histórico de etapas ou campo `etapaAtualDesde`).  
- **Taxa de conversão real entre etapas**  
  - Idealmente histórico de mudanças de etapa (eventos “lead X passou para etapa Y em T”).  
- **Fechamentos / vitórias**  
  - Hoje não há campo explícito “fechado” ou “venda realizada”; podemos usar etapa “Contrato e fechamento” ou “Pós Venda” como proxy, ou adicionar um campo `fechadoEm` / `statusVenda`.  
- **Comissões por lead/venda**  
  - Depende de vincular financeiro a lead/venda (ex.: campo leadId ou vendaId em `financeiro_movimentacoes`).  

Nada disso bloqueia começar: podemos lançar funil por etapa atual, por origem, por período e por corretor com os dados atuais.

---

## 4. Sugestão de estrutura da página de relatórios (admin)

1. **Resumo / Macro**  
   - Cards (totais, novos no período, corretores ativos) + mini funil + gráfico “novos leads nos últimos dias”.  
2. **Funil de vendas**  
   - Gráfico/tabela por etapa + opção de comparar com período anterior.  
3. **Por origem**  
   - Gráfico e tabela por origem/origemTipo (+ “Outros” detalhado).  
4. **Por período**  
   - Seletor: Dia / Semana / Mês + data início/fim; métricas e gráficos de novos leads e, se possível, por etapa.  
5. **Por corretor**  
   - Tabela/ranking e gráficos por corretor (leads totais, novos no período, por etapa, por origem).  
6. **Financeiro (resumo)**  
   - Entradas, saídas, saldo e por categoria no período.  
7. **Automação**  
   - Números de leads em automação e com mensagem inicial enviada.  

Filtros globais no topo: **Período** (hoje / esta semana / este mês / customizado) e **Corretor** (todos ou um específico). Tudo sempre escopo **imobiliariaId** do admin logado.

---

## 5. Ordem sugerida para implementar

1. Buscar todos os leads da imobiliária (e, se necessário, usuários) com filtro de período em `createdAt`.  
2. **Macro:** cards + funil por etapa + gráfico de novos leads (dia/semana/mês).  
3. **Origem:** contagem e gráfico por origem/origemTipo.  
4. **Por corretor:** contagem por userId e nome do corretor.  
5. **Período:** seleção dia/semana/mês e comparativos.  
6. **Financeiro:** resumo por período a partir de `financeiro_movimentacoes`.  
7. **Automação:** contagens por automacao.status e initialMessageSent.  

Assim a área de relatórios fica coerente com o que já construímos e preparada para evoluir (tempo por etapa, conversão real, slides em tempo real) quando tivermos mais campos ou histórico.

---

**Resumo:** Com os dados atuais (leads com etapa, origem, createdAt, userId, imobiliariaId; financeiro; usuários) já dá para entregar funil de vendas, relatórios por origem, diário/semanal/mensal e visão macro por corretor e por período. O documento de relatórios no projeto pode ser este arquivo (`RELATORIOS-VISAO-GERAL.md`) e a página em `src/app/dashboard/admin/relatorios/page.tsx` pode evoluir com base nele.
