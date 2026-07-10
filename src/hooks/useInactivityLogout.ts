import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebaseClient';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 heure
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

// Déconnecte automatiquement l'utilisateur après une période d'inactivité,
// pour éviter que des sessions restent ouvertes sur des postes partagés.
export const useInactivityLogout = (user: User | null) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        signOut(auth);
      }, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user]);
};
