import { useState, useEffect, useCallback } from 'react';
import { getToken, deleteToken, onMessage } from 'firebase/messaging';
import { getMessagingIfSupported } from '../firebaseClient';
import { firebaseService } from '../firebaseService';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export type PushPermissionState = NotificationPermission | 'unsupported';

export const usePushNotifications = (userEmail: string | null) => {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof Notification === 'undefined' || !VAPID_KEY) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, []);

  // Notification affichée quand l'app est déjà ouverte au premier plan : le service
  // worker ne gère que les messages reçus app fermée/en arrière-plan.
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const messaging = await getMessagingIfSupported();
      if (!messaging || !active) return;
      unsubscribe = onMessage(messaging, payload => {
        if (Notification.permission !== 'granted') return;
        new Notification(payload.notification?.title ?? 'Planning CHRS', {
          body: payload.notification?.body ?? '',
          icon: '/LOGOMSM01.png',
        });
      });
    })();
    return () => { active = false; unsubscribe?.(); };
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!userEmail || !VAPID_KEY) return;
    setBusy(true);
    try {
      const messaging = await getMessagingIfSupported();
      if (!messaging) { setPermission('unsupported'); return; }
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      if (token) await firebaseService.savePushToken(token, userEmail);
    } catch (err) {
      console.error('Erreur activation notifications :', err);
    } finally {
      setBusy(false);
    }
  }, [userEmail]);

  const disableNotifications = useCallback(async () => {
    if (!VAPID_KEY) return;
    setBusy(true);
    try {
      const messaging = await getMessagingIfSupported();
      if (!messaging) return;
      const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      const token = registration
        ? await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }).catch(() => null)
        : null;
      if (token) {
        await firebaseService.deletePushToken(token);
        await deleteToken(messaging);
      }
      setPermission(Notification.permission);
    } catch (err) {
      console.error('Erreur désactivation notifications :', err);
    } finally {
      setBusy(false);
    }
  }, []);

  return { permission, busy, enableNotifications, disableNotifications };
};
