/* eslint-disable no-undef */
// Service worker EXCLUSIVO para push (FCM). NÃO intercepta fetch, NÃO faz cache.
// Config copiada de src/lib/firebase.ts (manter em sincronia se mudar lá).

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCpmq3B74co2vLPqoTyampOrbd2eswsWhk",
  authDomain: "saas-nox.firebaseapp.com",
  projectId: "saas-nox",
  storageBucket: "saas-nox.firebasestorage.app",
  messagingSenderId: "654977639751",
  appId: "1:654977639751:web:338194d21a9305eea11862"
});

const messaging = firebase.messaging();

// O backend envia payload DATA-ONLY (sem bloco `notification`), então o
// navegador não exibe nada sozinho — este handler é o ÚNICO ponto que
// chama showNotification em background (evita notificação duplicada).
messaging.onBackgroundMessage((payload) => {
  const data = (payload && payload.data) || {};
  const title = data.title || 'Nox Imóveis';
  const body = data.body || '';

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // tag: se dois eventos dispararem para o mesmo lead, o SO substitui
    // a notificação em vez de mostrar duas.
    tag: data.adsLeadId || 'nox-lead',
    // Lead é urgente: a notificação FICA na tela até o corretor tocar (não
    // some sozinha), vibra e re-alerta mesmo reusando a tag.
    requireInteraction: true,
    renotify: true,
    vibrate: [200, 100, 200],
    data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = (event.notification && event.notification.data) || {};
  const url = data.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (janela.url.includes('/dashboard') && 'focus' in janela) {
          return janela.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
