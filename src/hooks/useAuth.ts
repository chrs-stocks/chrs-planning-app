import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebaseClient';
import { firebaseService } from '../firebaseService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingEmailLink, setPendingEmailLink] = useState<{ href: string; email: string | null } | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [linkSignInError, setLinkSignInError] = useState<string | null>(null);

  useEffect(() => {
    const signInHref = window.location.href;
    if (isSignInWithEmailLink(auth, signInHref)) {
      // Nettoyer l'URL tout de suite : sinon, un code déjà utilisé/expiré relance
      // une tentative de connexion (et son erreur) à chaque remontage du composant.
      window.history.replaceState({}, document.title, window.location.pathname);
      // On ne se connecte pas automatiquement ici : certains scanners de sécurité
      // des messageries visitent le lien avant l'utilisateur et exécutent la page,
      // ce qui consommerait le code à usage unique. On attend un clic explicite
      // (voir confirmEmailLinkSignIn) pour n'appeler Firebase que sur une vraie action humaine.
      setPendingEmailLink({ href: signInHref, email: window.localStorage.getItem('emailForSignIn') });
    }

    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser?.email) {
        const profile = await firebaseService.getUserByEmail(firebaseUser.email);
        if (profile) {
          setUser(firebaseUser);
          setRole(profile.role);
          setProfileName(profile.name);
        } else {
          await signOut(auth);
          setUser(null);
          setRole(null);
          setProfileName(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setProfileName(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const confirmEmailLinkSignIn = useCallback(async (emailOverride?: string) => {
    if (!pendingEmailLink) return;
    const email = (emailOverride || pendingEmailLink.email || '').trim();
    if (!email) return;
    setSigningIn(true);
    setLinkSignInError(null);
    try {
      const result = await signInWithEmailLink(auth, email, pendingEmailLink.href);
      window.localStorage.removeItem('emailForSignIn');
      setPendingEmailLink(null);
      const profile = await firebaseService.getUserByEmail(result.user.email!);
      if (!profile) {
        await signOut(auth);
        setLinkSignInError("Cette adresse email n'est pas autorisée. Contactez votre administrateur.");
      }
    } catch (err) {
      console.error('Erreur connexion par lien :', err);
      setLinkSignInError("Ce lien de connexion n'est plus valide (déjà utilisé ou expiré). Redemandez un nouveau lien.");
      setPendingEmailLink(null);
    } finally {
      setSigningIn(false);
    }
  }, [pendingEmailLink]);

  return {
    user,
    role,
    isAdmin: role === 'admin',
    loading,
    profileName,
    pendingEmailLink,
    signingIn,
    linkSignInError,
    confirmEmailLinkSignIn,
  };
};
