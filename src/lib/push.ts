// Push (FCM) — registro do service worker + token do dispositivo.
// A permissão do navegador SÓ é pedida em ação explícita do usuário
// (botão "Ativar notificações"); o resto é silencioso.

import { app, db } from '@/lib/firebase';
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import { showToast } from '@/components/ui/toast';

const SW_PATH = '/firebase-messaging-sw.js';
const LS_FLAG = 'nox-push-ativado';

export type AtivarNotificacoesResultado = 'ok' | 'negado' | 'sem-suporte';

/** Navegador tem tudo que precisa pra web push? */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    window.isSecureContext !== false
  );
}

/** Já ativou neste dispositivo (permissão dada + flag local)? */
export function pushJaAtivado(): boolean {
  return (
    pushSupported() &&
    Notification.permission === 'granted' &&
    localStorage.getItem(LS_FLAG) === '1'
  );
}

let onMessageAttached = false;

async function registrarEObterToken(uid: string): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
  if (!vapidKey) return false; // chave VAPID ainda não configurada

  const registration = await navigator.serviceWorker.register(SW_PATH);

  const messagingMod = await import('firebase/messaging');
  const suportado = await messagingMod.isSupported().catch(() => false);
  if (!suportado) return false;

  const messaging = messagingMod.getMessaging(app);
  const token = await messagingMod.getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return false;

  // Grava o token no doc do usuário (merge: não sobrescreve nada)
  await setDoc(
    doc(db, 'usuarios', uid),
    { fcmTokens: arrayUnion(token) },
    { merge: true }
  );

  // Mensagens em primeiro plano viram toast (o SW só cobre background)
  if (!onMessageAttached) {
    onMessageAttached = true;
    messagingMod.onMessage(messaging, (payload) => {
      const titulo = payload.notification?.title || payload.data?.title || 'Nova notificação';
      const corpo = payload.notification?.body || payload.data?.body || '';
      showToast(corpo ? `${titulo} — ${corpo}` : titulo, 'info');
    });
  }

  return true;
}

/**
 * Fluxo do botão "Ativar notificações" (ação explícita do usuário):
 * pede permissão, registra o SW, pega o token e salva em usuarios/{uid}.fcmTokens.
 */
export async function ativarNotificacoes(uid: string): Promise<AtivarNotificacoesResultado> {
  if (!pushSupported()) return 'sem-suporte';
  if (!process.env.NEXT_PUBLIC_FCM_VAPID_KEY) return 'sem-suporte'; // VAPID ainda não configurada

  try {
    const permissao = await Notification.requestPermission();
    if (permissao !== 'granted') return 'negado';

    const ok = await registrarEObterToken(uid);
    if (!ok) return 'sem-suporte';

    localStorage.setItem(LS_FLAG, '1');
    return 'ok';
  } catch (err) {
    console.error('[push] Falha ao ativar notificações:', err);
    return 'sem-suporte';
  }
}

/**
 * Chamado no mount do dashboard: se o usuário JÁ deu permissão e já ativou antes
 * neste dispositivo, renova o token silenciosamente. Nunca pede permissão.
 */
export async function initPushSilencioso(uid: string): Promise<void> {
  try {
    if (!pushJaAtivado()) return;
    await registrarEObterToken(uid);
  } catch (err) {
    // Silencioso por definição — só loga.
    console.warn('[push] Renovação silenciosa de token falhou:', err);
  }
}
