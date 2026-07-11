// Service worker Firebase Cloud Messaging : reçoit les notifications push
// quand l'application n'est pas ouverte (onglet fermé ou en arrière-plan).
// Doit rester à la racine du site pour couvrir toutes les pages (scope par défaut).
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

// Config publique du projet (identifiants client, pas des secrets — voir firebaseClient.ts).
// Un service worker ne peut pas lire les variables d'environnement Vite : dupliquée ici en dur.
firebase.initializeApp({
  apiKey: 'AIzaSyA2KAs3PXf7A8YdL_9KdSFzasRXwNZ2HXI',
  authDomain: 'planning-chrs.firebaseapp.com',
  projectId: 'planning-chrs',
  storageBucket: 'planning-chrs.firebasestorage.app',
  messagingSenderId: '654458438818',
  appId: '1:654458438818:web:c01874c37368ce87b943fb',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title ?? 'Planning CHRS';
  const options = {
    body: payload.notification?.body ?? '',
    icon: '/LOGOMSM01.png',
    badge: '/LOGOMSM01.png',
    data: { url: payload.data?.url ?? '/' },
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(clients.openWindow(url));
});
