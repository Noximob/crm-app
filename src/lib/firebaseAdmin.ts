/**
 * FIREBASE ADMIN — o acesso do SERVIDOR ao banco (rotas de API).
 *
 * As rotas públicas da locação (feed dos portais, receptor de leads) rodam
 * no servidor do Netlify e não têm usuário logado — elas entram pelo SDK
 * admin, com uma chave de serviço que mora na variável de ambiente
 * FIREBASE_SERVICE_ACCOUNT_B64 (o JSON da conta de serviço em base64).
 *
 * Sem a variável configurada, quem chamar recebe null e a rota responde 503
 * explicando o que falta — nunca um erro misterioso.
 *
 * Como gerar a chave (uma vez): Firebase Console → Configurações do projeto
 * → Contas de serviço → Gerar nova chave privada → converter pra base64 →
 * colar no Netlify em Site settings → Environment variables.
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | null = null;

export function adminDb(): Firestore | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) return null;
  try {
    if (!app) {
      app = getApps()[0] || initializeApp({
        credential: cert(JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))),
      });
    }
    return getFirestore(app);
  } catch (e) {
    console.error('firebaseAdmin: chave de serviço inválida', e);
    return null;
  }
}
