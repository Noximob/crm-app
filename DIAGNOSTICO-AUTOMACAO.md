# 🔍 Diagnóstico da Automação - Guia Completo

## 🚨 Problema Atual
A automação estava funcionando (aparecia no log como "enviada com sucesso") mas não enviava mensagens. Após mudanças nas permissões, parou de funcionar completamente.

## 📋 Checklist de Diagnóstico

### 1. ✅ Verificar Deploy das Funções
```bash
# Execute o script de deploy
./deploy-functions.ps1

# Ou manualmente:
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes  
firebase deploy --only functions
```

### 2. 🔍 Verificar Logs das Funções
```bash
# Ver logs em tempo real
firebase functions:log --only onLeadAutomationStarted

# Ver logs das últimas 24h
firebase functions:log --only onLeadAutomationStarted --limit 50
```

### 3. 📊 Verificar Dados no Firestore

#### 3.1 Estrutura do Lead
Verifique se o lead tem a estrutura correta:
```json
{
  "userId": "ID_DO_USUARIO",
  "telefone": "11999999999",
  "automacao": {
    "status": "inativa",
    "nomeTratamento": null,
    "dataInicio": null
  }
}
```

#### 3.2 Dados do Usuário
Verifique se o usuário tem as credenciais do Z-API:
```json
{
  "zapiInstanceId": "SEU_INSTANCE_ID",
  "zapiInstanceToken": "SEU_TOKEN"
}
```

#### 3.3 Configurações de Mensagens
Verifique se existe o documento `configuracoes/automacaoMensagens`:
```json
{
  "mensagens": [
    {
      "dia": 0,
      "texto": "Olá {{nomeTratamento}}, tudo bem? Aqui é da [SUA_EMPRESA]..."
    }
  ]
}
```

### 4. 🧪 Teste Manual

#### 4.1 Teste via Console do Firebase
1. Vá para o Console do Firebase
2. Navegue até Firestore Database
3. Encontre um lead
4. Edite manualmente o campo `automacao.status` para `"ativa"`
5. Verifique os logs das funções

#### 4.2 Teste via Script
```bash
# Configure o firebaseConfig no test-automation.js
node test-automation.js LEAD_ID_AQUI
```

### 5. 🔧 Possíveis Problemas e Soluções

#### 5.1 Função não está sendo acionada
- **Causa**: Problema com o trigger `onDocumentUpdated`
- **Solução**: Verificar se o documento está sendo atualizado corretamente

#### 5.2 Erro de permissões
- **Causa**: Regras do Firestore muito restritivas
- **Solução**: Verificar se as regras permitem acesso às coleções necessárias

#### 5.3 Credenciais Z-API inválidas
- **Causa**: Instance ID ou Token incorretos
- **Solução**: Verificar credenciais no painel da Z-API

#### 5.4 Telefone mal formatado
- **Causa**: Formato do telefone não aceito pela Z-API
- **Solução**: Verificar se o telefone está no formato correto (55 + DDD + número)

### 6. 📝 Logs Esperados

Quando funcionando, você deve ver nos logs:
```
=== INÍCIO DA FUNÇÃO onLeadAutomationStarted ===
Lead ID: [ID_DO_LEAD]
✅ Automação ativada para o lead [ID]. Procedendo com o envio.
🔍 Buscando dados do usuário: [USER_ID]
✅ Usuário encontrado: {...}
✅ Credenciais Z-API encontradas - Instance ID: [INSTANCE_ID]
🔍 Buscando configurações de mensagens...
✅ Configurações encontradas: {...}
✅ Primeira mensagem encontrada: {...}
📝 Texto final da mensagem: [TEXTO_DA_MENSAGEM]
📱 Telefone com código: 5511999999999
🌐 URL da API: https://api.z-api.io/instances/...
📤 Payload para envio: {...}
✅ Resposta da Z-API: {...}
✅ Mensagem do dia 0 enviada com sucesso para o lead [ID].
=== FIM DA FUNÇÃO onLeadAutomationStarted ===
```

### 7. 🚀 Próximos Passos

1. **Execute o deploy** das funções e regras
2. **Teste manualmente** via console do Firebase
3. **Verifique os logs** para identificar onde está falhando
4. **Reporte os erros** encontrados nos logs

### 8. 📞 Suporte

Se ainda não funcionar, forneça:
- Logs completos das funções
- Estrutura dos dados no Firestore
- Erros específicos encontrados
- Screenshots do console do Firebase 