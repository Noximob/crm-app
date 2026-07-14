# LIGAR-META — Passo a passo para conectar os Lead Ads do Meta ao CRM

Este guia é para a sessão "burocrática" de ligar o Facebook/Instagram (Meta Lead Ads)
ao rodízio de leads do CRM. O backend já está pronto (`functions/src/distribuicaoAds.ts`);
falta só criar o app no Meta, gerar o token e apontar o webhook.

Vamos precisar de:
- Acesso de **admin** ao Business Manager (business.facebook.com) da imobiliária
- Acesso de **admin** à Página do Facebook que roda os anúncios
- Firebase CLI logado no projeto (`firebase login` / `firebase use`)

---

## 1. Criar o app no Meta for Developers

1. Acesse https://developers.facebook.com/apps e clique em **Criar app**.
2. Tipo de app: **Business** (Empresa).
3. Dê um nome (ex.: `Nox CRM Leads`), e-mail de contato e vincule ao **Business Manager** da imobiliária.
4. Anote o **App ID** e o **App Secret** (Configurações do app → Básico).

## 2. Adicionar os produtos Webhooks e Lead Ads

1. No painel do app, em **Adicionar produtos**, adicione:
   - **Webhooks**
   - **Facebook Login for Business** (necessário para gerar o token com as permissões)
2. Em **Webhooks**, selecione o objeto **Page** (Página) — é nele que fica o campo `leadgen`.
   (Ainda não configure a URL; primeiro vamos fazer o deploy da function no passo 5.)

## 3. Gerar o Page Access Token

O token precisa das permissões:
- `leads_retrieval` (ler os dados dos leads)
- `pages_manage_metadata` (assinar a página no webhook)
- `pages_read_engagement`
- `pages_show_list`

Jeito mais simples (Graph API Explorer):
1. Acesse https://developers.facebook.com/tools/explorer
2. Selecione o **seu app** no canto superior direito.
3. Em "User or Page", clique em **Get Page Access Token** e escolha a Página da imobiliária.
4. Em **Permissions**, adicione: `leads_retrieval`, `pages_manage_metadata`, `pages_read_engagement`, `pages_show_list`.
5. Clique em **Generate Access Token** e autorize.
6. (Recomendado) Troque por um token de longa duração:
   - Cole o token em https://developers.facebook.com/tools/debug/accesstoken e clique em **Extend Access Token**, ou
   - `GET https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={TOKEN_CURTO}`
   - Com o token de usuário longo, pegue o Page Token (que não expira): `GET https://graph.facebook.com/v21.0/me/accounts?access_token={TOKEN_LONGO}` → campo `access_token` da página.

Guarde esse **Page Access Token** — ele vira o secret `META_PAGE_TOKEN`.

## 4. Configurar os secrets no Firebase

Invente um **verify token** (qualquer string aleatória, ex.: `nox-meta-2026-xyz`) e um
**test secret** (para a rota de teste). Depois rode, na raiz do projeto:

```bash
firebase functions:secrets:set META_PAGE_TOKEN
# cole o Page Access Token quando pedir

firebase functions:secrets:set META_VERIFY_TOKEN
# cole o verify token que você inventou

firebase functions:secrets:set TEST_SECRET
# cole o test secret que você inventou
```

## 5. Deploy das functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:metaLeadsWebhook,functions:expirarAdsLeads,functions:redistribuirAdsLead,functions:testeCriarAdsLead
```

Ao final, o terminal mostra a URL do webhook, algo como:

```
https://metaleadswebhook-XXXXXXXX-uc.a.run.app
```

(ou `https://us-central1-{PROJETO}.cloudfunctions.net/metaLeadsWebhook`). Anote-a.

## 6. Configurar o Webhook no app do Meta

1. No painel do app → **Webhooks** → objeto **Page** → **Subscribe to this object**.
2. **Callback URL**: a URL da function `metaLeadsWebhook` (passo 5).
3. **Verify token**: exatamente o mesmo valor do secret `META_VERIFY_TOKEN`.
4. Clique em **Verify and save** — o Meta faz um GET na function e ela responde o challenge.
5. Na lista de campos do objeto Page, clique em **Subscribe** no campo **`leadgen`**.

## 7. Assinar a Página no app

Além do webhook, a Página precisa estar "inscrita" no app para o campo `leadgen`:

```bash
curl -X POST "https://graph.facebook.com/v21.0/{PAGE_ID}/subscribed_apps?subscribed_fields=leadgen&access_token={META_PAGE_TOKEN}"
```

Para conferir: `GET https://graph.facebook.com/v21.0/{PAGE_ID}/subscribed_apps?access_token={META_PAGE_TOKEN}`
(deve listar o app com `leadgen` em `subscribed_fields`).

## 8. Testar

### 8.1 Teste interno (antes mesmo do Meta)

Cria um lead falso passando por todo o rodízio (push, prazos etc.):

```
https://URL-DA-FUNCTION-testeCriarAdsLead?secret={TEST_SECRET}&nome=Teste&telefone=47999998888
```

Confira no Firestore: deve aparecer um doc em `adsLeads` com `status: 'escalado'`
(ou `'geral'` se a distribuição estiver desligada) e o `proximoIndex` do doc
`distribuicaoAds/config` deve ter avançado.

### 8.2 Lead Ads Testing Tool (teste oficial do Meta)

1. Acesse https://developers.facebook.com/tools/lead-ads-testing
2. Selecione a **Página** e o **formulário** (ou crie um de teste).
3. Clique em **Create lead** → **Track status**: deve mostrar o webhook entregue.
4. Confira o novo doc em `adsLeads` no Firestore.
5. Use **Delete lead** na mesma ferramenta para poder repetir o teste.

### 8.3 Se algo falhar

- Logs: `firebase functions:log --only metaLeadsWebhook`
- Eventos que chegaram sem token configurado (ou com erro) ficam salvos na
  collection `adsLeadsErros` no Firestore — nada se perde, dá para reprocessar depois.

## 9. Ir para produção (App Review)

Enquanto o app estiver em **modo de desenvolvimento**, só leads de admins/testers
do app chegam no webhook. Para receber leads reais:

1. No painel do app → **App Review** → **Permissions and features**.
2. Solicite **Advanced Access** para `leads_retrieval` e `pages_manage_metadata`.
3. Preencha o formulário (descreva: "CRM interno que distribui leads de anúncios
   imobiliários para corretores da própria empresa") e envie um screencast simples.
4. Alternativa sem review: se a Página e o app estiverem no **mesmo Business Manager
   verificado**, o acesso padrão (Standard Access) já costuma bastar para as
   próprias páginas do negócio — teste primeiro com a Testing Tool e um lead real.
5. Mude o app para o modo **Live** (chave no topo do painel).

## Resumo dos comandos

```bash
# secrets
firebase functions:secrets:set META_PAGE_TOKEN
firebase functions:secrets:set META_VERIFY_TOKEN
firebase functions:secrets:set TEST_SECRET

# build + deploy
cd functions && npm run build && cd ..
firebase deploy --only functions:metaLeadsWebhook,functions:expirarAdsLeads,functions:redistribuirAdsLead,functions:testeCriarAdsLead

# logs
firebase functions:log --only metaLeadsWebhook
```
