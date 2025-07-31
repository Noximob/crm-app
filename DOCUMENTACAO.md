# Documentação Técnica - CRM Imobiliário

## 📋 Visão Geral do Projeto

Este é um sistema CRM (Customer Relationship Management) desenvolvido especificamente para imobiliárias, construído com Next.js 14, TypeScript, Tailwind CSS e Firebase. O sistema permite gerenciar leads, corretores, imóveis e todo o pipeline de vendas imobiliárias.

## 🏗️ Arquitetura e Tecnologias

### Stack Principal
- **Frontend**: Next.js 14 com App Router
- **Linguagem**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Deploy**: Netlify

### Estrutura de Pastas
```
src/
├── app/                    # App Router do Next.js
│   ├── dashboard/         # Área principal do sistema
│   │   ├── admin/        # Funcionalidades administrativas
│   │   ├── crm/          # Gestão de leads e pipeline
│   │   ├── ideias/       # Sistema de ideias e melhorias
│   │   └── ...
├── context/              # Contextos React (Auth, Notifications)
├── lib/                  # Configurações (Firebase, constants)
└── types/               # Definições de tipos TypeScript
```

## 👥 Tipos de Usuários

### 1. Imobiliária (Admin)
- Acesso completo ao sistema
- Gerencia corretores e leads
- Visualiza relatórios e métricas
- Configurações da empresa

### 2. Corretor Vinculado
- Gerencia seus próprios leads
- Acesso ao pipeline de vendas
- Ferramentas de prospecção

### 3. Corretor Autônomo
- Funcionalidades similares ao vinculado
- Gestão independente de leads

## 🎯 Funcionalidades Principais

### 1. Gestão de Leads
- **Pipeline de Vendas**: 10 etapas definidas
  - Pré Qualificação
  - Qualificação
  - Apresentação do imóvel
  - Ligação agendada
  - Visita agendada
  - Negociação e Proposta
  - Contrato e fechamento
  - Pós Venda e Fidelização
  - **Interesse Futuro** (nova etapa)
  - Geladeira

- **Filtros Avançados**: Por etapa, corretor, status de tarefa
- **Qualificação**: Sistema de perguntas para qualificar leads
- **Transferência**: Movimentação de leads entre corretores

### 2. CRM e Pipeline
- **Kanban Board**: Visualização por etapas
- **Drag & Drop**: Movimentação de leads entre etapas
- **Detalhes do Lead**: Informações completas e histórico
- **Tarefas**: Sistema de agendamento e acompanhamento

### 3. Gestão Administrativa
- **Gestão de Corretores**: Cadastro, aprovação, transferência
- **Importação de Leads**: Em massa via Excel/Sheets
- **Relatórios**: Métricas e performance
- **Gestão de Imóveis**: Cadastro e captação

### 4. Recursos Adicionais
- **Sistema de Ideias**: Sugestões de melhorias com votação
- **Treinamentos**: Materiais educativos para corretores
- **Comunidade**: Rede social interna
- **Agenda**: Agendamento de compromissos

## 🗄️ Estrutura do Banco de Dados (Firestore)

### Coleções Principais

#### `leads`
```typescript
{
  id: string;
  nome: string;
  email: string;
  telefone: string;
  etapa: string; // Uma das etapas do PIPELINE_STAGES
  userId: string; // ID do corretor responsável
  imobiliariaId: string;
  anotacoes?: string;
  status?: string; // Status de tarefa
  createdAt: Timestamp;
  [key: string]: any; // Campos dinâmicos de qualificação
}
```

#### `usuarios`
```typescript
{
  id: string;
  nome: string;
  email: string;
  tipoConta: 'imobiliaria' | 'corretor-vinculado' | 'corretor-autonomo';
  imobiliariaId?: string;
  aprovado: boolean;
  telefone?: string;
}
```

#### `ideias`
```typescript
{
  id: string;
  userId: string;
  userNome: string;
  titulo: string;
  descricao: string;
  categoria: 'interface' | 'funcionalidade' | 'performance' | 'outros';
  status: 'pendente' | 'aprovada' | 'implementada' | 'rejeitada';
  votos: number;
  criadoEm: Timestamp;
}
```

#### `votos_ideias`
```typescript
{
  id: string;
  ideiaId: string;
  userId: string;
  criadoEm: Timestamp;
}
```

## 🔧 Configurações e Constantes

### Pipeline de Vendas
```typescript
// src/lib/constants.ts
export const PIPELINE_STAGES = [
    'Pré Qualificação', 'Qualificação', 'Apresentação do imóvel', 'Ligação agendada',
    'Visita agendada', 'Negociação e Proposta', 'Contrato e fechamento',
    'Pós Venda e Fidelização', 'Interesse Futuro', 'Geladeira'
];
```

### Questões de Qualificação
```typescript
const QUALIFICATION_QUESTIONS = [
    { title: 'Finalidade', key: 'finalidade', options: ['Moradia', 'Veraneio', 'Investimento'] },
    { title: 'Estágio do Imóvel', key: 'estagio', options: ['Lançamento', 'Em Construção', 'Pronto para Morar'] },
    { title: 'Quartos', key: 'quartos', options: ['2 quartos', '1 Suíte + 1 Quarto', '3 quartos', '4 quartos'] },
    { title: 'Tipo do Imóvel', key: 'tipo', options: ['Apartamento', 'Casa', 'Terreno'] },
    { title: 'Vagas de Garagem', key: 'vagas', options: ['1', '2', '3+'] },
    { title: 'Valor do Imóvel', key: 'valor', options: ['< 500k', '500k-800k', '800k-1.2M', '1.2M-2M', '> 2M'] },
];
```

## 🎨 Design System

### Cores Principais
- **Primary**: `#3478F6` (Azul)
- **Background**: `#F5F6FA` (Claro) / `#181C23` (Escuro)
- **Surface**: `#FFFFFF` (Claro) / `#23283A` (Escuro)
- **Text**: `#2E2F38` (Claro) / `#FFFFFF` (Escuro)

### Componentes Reutilizáveis
- Modais responsivos
- Cards com hover effects
- Botões com estados de loading
- Formulários com validação
- Filtros com tags selecionáveis

## 🔐 Autenticação e Segurança

### Firebase Authentication
- Login com email/senha
- Contexto de autenticação global
- Proteção de rotas por tipo de usuário
- Sessões persistentes

### Regras de Segurança (Firestore)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📱 Responsividade

O sistema é totalmente responsivo, adaptando-se a:
- **Desktop**: Layout completo com sidebar
- **Tablet**: Layout adaptado
- **Mobile**: Layout otimizado para touch

## 🚀 Deploy e CI/CD

### Netlify
- Deploy automático via GitHub
- Preview deployments para PRs
- Variáveis de ambiente configuradas
- Build otimizado para Next.js

### Variáveis de Ambiente
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
```

## 🔄 Fluxo de Desenvolvimento

### Estrutura de Commits
- `feat:` Novas funcionalidades
- `fix:` Correções de bugs
- `refactor:` Refatorações
- `docs:` Documentação

### Padrões de Código
- TypeScript strict mode
- ESLint configurado
- Prettier para formatação
- Componentes funcionais com hooks
- Context API para estado global

## 📊 Métricas e Analytics

### Funcionalidades de Relatório
- Leads por etapa
- Performance de corretores
- Conversão por etapa
- Tempo médio no pipeline
- Origem dos leads

## 🎯 Próximas Funcionalidades

### Em Desenvolvimento
- Sistema de notificações push
- Integração com WhatsApp Business API
- Relatórios avançados com gráficos
- App mobile nativo

### Backlog
- Integração com portais imobiliários
- Sistema de comissões
- CRM para construtoras
- API pública para integrações

## 🤝 Contribuição

### Para Desenvolvedores
1. Fork do repositório
2. Criação de branch para feature
3. Desenvolvimento seguindo padrões
4. Testes e validação
5. Pull Request com descrição detalhada

### Para Usuários
- Sistema de ideias para sugestões
- Feedback via comunidade interna
- Treinamentos para onboarding

---

**Versão**: 1.0.0  
**Última Atualização**: Dezembro 2024  
**Mantenedor**: Equipe de Desenvolvimento 