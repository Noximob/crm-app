# Configuração de Deploy Automático

## 🚀 Deploy Automático Configurado

Este projeto está configurado para deploy automático no Netlify através do GitHub Actions.

### 📋 Pré-requisitos

1. **Conta no Netlify** - [Criar conta](https://netlify.com)
2. **Repositório no GitHub** - Seu código deve estar em um repositório público ou privado
3. **Token de Autenticação do Netlify**

### 🔧 Configuração Manual

#### 1. Obter Token do Netlify
1. Acesse [Netlify](https://netlify.com) e faça login
2. Vá em **User Settings** > **Applications** > **Personal access tokens**
3. Clique em **New access token**
4. Copie o token gerado

#### 2. Obter Site ID do Netlify
1. No Netlify, vá em **Sites**
2. Clique no seu site (ou crie um novo)
3. Vá em **Site settings** > **General**
4. Copie o **Site ID**

#### 3. Configurar Secrets no GitHub
1. Vá para seu repositório no GitHub
2. Clique em **Settings** > **Secrets and variables** > **Actions**
3. Adicione os seguintes secrets:
   - `NETLIFY_AUTH_TOKEN`: Cole o token do Netlify
   - `NETLIFY_SITE_ID`: Cole o Site ID do Netlify

### 🔄 Como Funciona

O deploy automático será acionado quando:
- ✅ Push para a branch `main` ou `master`
- ✅ Pull Request para a branch `main` ou `master`

### 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build da aplicação
npm run start        # Inicia servidor de produção
npm run lint         # Executa linting

# Deploy
npm run deploy       # Build + cache buster
npm run deploy:netlify # Deploy manual para Netlify
npm run build:static # Build estático
npm run preview      # Preview da build
```

### 🌐 URLs de Deploy

- **Preview**: Automático em Pull Requests
- **Produção**: Automático em push para main/master

### 🔍 Monitoramento

- Os deploys aparecem automaticamente nos comentários do PR
- Status do deploy visível no GitHub Actions
- Logs detalhados disponíveis no Netlify

### 🛠️ Solução de Problemas

#### Erro de Build
1. Verifique os logs no GitHub Actions
2. Teste localmente com `npm run build`
3. Verifique se todas as dependências estão instaladas

#### Erro de Deploy
1. Verifique se os secrets estão configurados corretamente
2. Confirme se o Site ID está correto
3. Verifique se o token do Netlify tem permissões adequadas

#### Cache Issues
1. Use `npm run cache-buster` para limpar cache
2. Verifique configurações de cache no Netlify

### 📞 Suporte

Para problemas específicos:
1. Verifique os logs do GitHub Actions
2. Consulte a documentação do Netlify
3. Verifique as configurações do Next.js 